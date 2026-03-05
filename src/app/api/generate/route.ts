import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { generations } from '@/db/schema';
import { submitGenerationJob, enhancePrompt } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  prompt: string;
  lyrics?: string;
  genreTags?: string;
  duration?: number;
  instrumental?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateRequest(body: unknown): { valid: true; data: GenerateRequest } | { valid: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.prompt !== 'string' || obj.prompt.trim().length === 0) {
    return { valid: false, message: 'prompt is required and must be a non-empty string.' };
  }

  if (obj.duration !== undefined) {
    const duration = Number(obj.duration);
    if (!Number.isInteger(duration) || duration < 30 || duration > 240) {
      return { valid: false, message: 'duration must be an integer between 30 and 240 seconds.' };
    }
  }

  if (obj.lyrics !== undefined && typeof obj.lyrics !== 'string') {
    return { valid: false, message: 'lyrics must be a string if provided.' };
  }

  if (obj.genreTags !== undefined && typeof obj.genreTags !== 'string') {
    return { valid: false, message: 'genreTags must be a string if provided.' };
  }

  return {
    valid: true,
    data: {
      prompt: (obj.prompt as string).trim(),
      lyrics: obj.lyrics as string | undefined,
      genreTags: obj.genreTags as string | undefined,
      duration: obj.duration !== undefined ? Number(obj.duration) : undefined,
      instrumental: obj.instrumental === true,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: 'Invalid JSON in request body.',
          technical: 'JSON.parse failed on request body',
        },
      },
      { status: 400 },
    );
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: validation.message,
          technical: `Validation failed: ${validation.message}`,
        },
      },
      { status: 400 },
    );
  }

  const { prompt, lyrics: rawLyrics, genreTags, duration = 120, instrumental = false } = validation.data;

  // Resolve lyrics: instrumental mode forces [Instrumental] tag
  const resolvedLyrics = instrumental ? '[Instrumental]' : (rawLyrics ?? '');

  // Enhance prompt via HeartMuLa LLM (graceful fallback on failure)
  const enhancedCaption = await enhancePrompt(
    genreTags ? `${prompt}, ${genreTags}` : prompt,
    genreTags,
  );

  // Duration in milliseconds for HeartMuLa
  const durationMs = duration * 1000;

  // Submit 2 jobs in parallel (HeartMuLa does 1 variant per job)
  const seed2 = Math.floor(Math.random() * 2147483647);

  let jobIds: string[];
  try {
    const results = await Promise.allSettled([
      submitGenerationJob({
        prompt: enhancedCaption,
        lyrics: resolvedLyrics,
        duration_ms: durationMs,
        tags: genreTags,
      }),
      submitGenerationJob({
        prompt: enhancedCaption,
        lyrics: resolvedLyrics,
        duration_ms: durationMs,
        tags: genreTags,
        seed: seed2,
      }),
    ]);

    jobIds = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof submitGenerationJob>>> => r.status === 'fulfilled')
      .map((r) => r.value.job_id);

    if (jobIds.length === 0) {
      // Both failed — throw the first error
      const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      throw firstRejected?.reason ?? new Error('All HeartMuLa job submissions failed');
    }

    if (jobIds.length < 2) {
      const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      console.warn('[generate] One HeartMuLa job failed, proceeding with 1 variant:', rejected?.reason);
    }
  } catch (rawError) {
    const classified = classifyError(rawError);
    const errorResponse = toErrorResponse(classified);
    return NextResponse.json(
      {
        error: {
          category: errorResponse.error.category,
          retryable: errorResponse.error.retryable,
          message: errorResponse.error.userMessage,
          technical: errorResponse.debug.technicalMessage,
        },
      },
      { status: 502 },
    );
  }

  // Insert the generation record into the database
  let generationId: string;
  try {
    const [inserted] = await db
      .insert(generations)
      .values({
        backendJobIds: jobIds,
        status: 'pending',
        promptText: prompt,
        lyrics: resolvedLyrics || null,
        genreTags: genreTags ?? null,
        duration,
        instrumental,
        startedAt: new Date(),
      })
      .returning({ id: generations.id });

    generationId = inserted.id;
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[generate] DB insert failed after job submitted:', classified.technicalMessage, {
      jobIds,
    });
    return NextResponse.json(
      {
        error: {
          category: 'unknown',
          retryable: false,
          message: 'Job was submitted but could not be recorded. Please contact support.',
          technical: classified.technicalMessage,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ jobId: generationId, status: 'pending', enhancedCaption }, { status: 201 });
}
