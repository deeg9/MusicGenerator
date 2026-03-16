import { NextRequest, NextResponse } from 'next/server';
import { submitGenerationJob } from '@/lib/heartmula';
import { quizToPrompt, enhanceQuizPrompt } from '@/lib/quiz-prompt';
import { classifyError, toErrorResponse } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { QuizData } from '@/lib/quiz-types';
import { RateLimitError } from '@/lib/gemini';

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
      emailOptIn: obj.emailOptIn === true,
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

  // 3. Require authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'unauthenticated', userMessage: 'You must be signed in to generate a song.' } },
      { status: 401 },
    );
  }

  const userId = user.id;

  // 4. Insert song row (placeholder heartbulaJobId — back-filled after HeartBula responds)
  let songId: string;
  try {
    const [song] = await db.insert(songs).values({
      userId,
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
        email: validation.data.emailOptIn ? validation.data.email : undefined,
        emailOptIn: validation.data.emailOptIn,
      },
    }).returning({ id: songs.id });
    songId = song.id;
  } catch (rawError) {
    console.error('[quiz-generate] db.insert(songs) failed:', rawError);
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    return NextResponse.json(
      { error: { category: 'internal', retryable: false, userMessage: 'Failed to create song record.', detail } },
      { status: 500 },
    );
  }

  // 5. Convert quiz answers to HeartMuLa params (Gemini-enhanced with template fallback)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  const rawParams = quizToPrompt(validation.data);
  let params: typeof rawParams;
  try {
    params = await enhanceQuizPrompt(validation.data, clientIp);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: { code: 'rate_limited', userMessage: 'Too many requests. Please try again later.' } },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    // Other errors are already handled inside enhanceQuizPrompt (fallback)
    params = rawParams;
  }

  // 6. Submit single generation job (batch_size=1)
  let jobId: string;
  try {
    const result = await submitGenerationJob(params, songId);
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

  // 7. Back-fill heartbulaJobId and log raw vs enhanced lyrics
  try {
    await db.update(songs).set({
      heartbulaJobId: jobId,
      rawQuizPrompt: rawParams.lyrics,
      enhancedLyrics: params.lyrics,
    }).where(eq(songs.id, songId));
  } catch (updateError) {
    console.error('[quiz-generate] Failed to back-fill heartbulaJobId:', updateError);
    // Non-fatal — job is running, don't fail the response
  }

  // 8. Build response
  return NextResponse.json({ jobId, songId }, { status: 201 });
}
