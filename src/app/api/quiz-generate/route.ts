import { NextRequest, NextResponse } from 'next/server';
import { submitGenerationJob } from '@/lib/heartmula';
import { quizToPrompt } from '@/lib/quiz-prompt';
import { classifyError, toErrorResponse } from '@/lib/errors';
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
 * - No DB insert — Phase 16 validates UX only; persistence comes later
 * - No enhancePrompt call — personal content safety per research findings
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

  // 3. Convert quiz answers to HeartMuLa params
  const params = quizToPrompt(validation.data);

  // 4. Submit single generation job (batch_size=1)
  try {
    const result = await submitGenerationJob(params);
    return NextResponse.json({ jobId: result.job_id }, { status: 201 });
  } catch (rawError) {
    const classified = classifyError(rawError);
    const errorResponse = toErrorResponse(classified);
    console.error('[quiz-generate] submitGenerationJob failed:', classified.technicalMessage);
    return NextResponse.json(errorResponse, { status: 502 });
  }
}
