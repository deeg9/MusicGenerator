import { NextRequest, NextResponse } from 'next/server';
import { submitGenerationJob } from '@/lib/heartmula';
import { quizToPrompt } from '@/lib/quiz-prompt';
import { classifyError, toErrorResponse } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { QuizData } from '@/lib/quiz-types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates minimum required fields for quiz-based generation.
 * recipientName and genre are required; all other fields are optional.
 */
function validateQuizData(
  body: unknown,
): { valid: true; data: QuizData } | { valid: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'Incomplete quiz data: request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.recipientName !== 'string' || obj.recipientName.trim().length === 0) {
    return { valid: false, message: 'Incomplete quiz data: recipientName is required.' };
  }

  if (typeof obj.genre !== 'string' || obj.genre.trim().length === 0) {
    return { valid: false, message: 'Incomplete quiz data: genre is required.' };
  }

  // Cast to QuizData — extra fields are safe to pass through to quizToPrompt
  return {
    valid: true,
    data: {
      relationshipType: (obj.relationshipType as QuizData['relationshipType']) ?? '',
      recipientName: (obj.recipientName as string).trim(),
      genre: (obj.genre as string).trim(),
      voicePreference: (obj.voicePreference as QuizData['voicePreference']) ?? 'No Preference',
      qualities: typeof obj.qualities === 'string' ? obj.qualities : '',
      memories: typeof obj.memories === 'string' ? obj.memories : '',
      message: typeof obj.message === 'string' ? obj.message : '',
      language: typeof obj.language === 'string' ? obj.language : 'English',
      email: typeof obj.email === 'string' ? obj.email : '',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/quiz-generate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert completed quiz answers into a HeartMuLa generation job.
 *
 * Design notes:
 * - Single submitGenerationJob call (batch_size=1 — no dual variants)
 * - Inserts a song row before calling HeartBula so every generation is tracked
 * - Anonymous users receive a session cookie (notevra_session) for later claim
 * - Authenticated users have user_id set directly on the song row
 * - Returns { jobId } for the polling phase (Plan 16-03)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      toErrorResponse({
        category: 'invalid_input',
        retryable: false,
        userMessage: 'Invalid JSON in request body.',
        technicalMessage: 'JSON parse error',
      }),
      { status: 400 },
    );
  }

  // 2. Validate required quiz fields
  const validation = validateQuizData(body);
  if (!validation.valid) {
    return NextResponse.json(
      toErrorResponse({
        category: 'invalid_input',
        retryable: false,
        userMessage: validation.message,
        technicalMessage: validation.message,
      }),
      { status: 400 },
    );
  }

  // 3. Determine identity (authenticated vs anonymous)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  let sessionToken: string | null = null;
  if (!userId) {
    // Read existing session cookie or generate a new one
    const cookieStore = await cookies();
    const existingSession = cookieStore.get('notevra_session');
    sessionToken = existingSession?.value ?? crypto.randomUUID();
  }

  // 4. Insert song row (placeholder heartbulaJobId — back-filled after HeartBula responds)
  let songId: string;
  try {
    const [song] = await db.insert(songs).values({
      userId,
      sessionToken,
      status: 'generating',
      heartbulaJobId: '',
      recipientName: validation.data.recipientName,
      relationship: validation.data.relationshipType ?? '',
      genre: validation.data.genre,
      quizData: {
        qualities: validation.data.qualities,
        memories: validation.data.memories,
        message: validation.data.message,
        voiceGender: validation.data.voicePreference,
        language: validation.data.language,
      },
    }).returning({ id: songs.id });
    songId = song.id;
  } catch (rawError) {
    console.error('[quiz-generate] db.insert(songs) failed:', rawError);
    return NextResponse.json(
      { error: { category: 'internal', retryable: false, userMessage: 'Failed to create song record.' } },
      { status: 500 },
    );
  }

  // 5. Convert quiz answers to HeartMuLa params
  const params = quizToPrompt(validation.data);

  // 6. Submit single generation job (batch_size=1)
  let jobId: string;
  try {
    const result = await submitGenerationJob(params);
    jobId = result.job_id;
  } catch (rawError) {
    // HeartBula failed — mark the song row as failed
    try {
      await db.update(songs).set({ status: 'failed', failedAt: new Date() }).where(eq(songs.id, songId));
    } catch (updateError) {
      console.error('[quiz-generate] Failed to mark song as failed:', updateError);
    }

    const classified = classifyError(rawError);
    const errorResponse = toErrorResponse(classified);
    console.error('[quiz-generate] submitGenerationJob failed:', classified.technicalMessage);
    return NextResponse.json(errorResponse, { status: 502 });
  }

  // 7. Back-fill heartbulaJobId on the song row
  try {
    await db.update(songs).set({ heartbulaJobId: jobId }).where(eq(songs.id, songId));
  } catch (updateError) {
    console.error('[quiz-generate] Failed to back-fill heartbulaJobId:', updateError);
    // Non-fatal — job is running, don't fail the response
  }

  // 8. Build response
  const response = NextResponse.json({ jobId }, { status: 201 });

  // Set session cookie for anonymous users
  if (sessionToken) {
    response.cookies.set('notevra_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}
