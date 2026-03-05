import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { generations } from '@/db/schema';
import { submitGenerationJob, callFormatInput } from '@/lib/runpod';
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

  // Call format_input to get LLM-enhanced caption with BPM/key/time signature
  let enhancedCaption = prompt;
  let bpm: number | undefined;
  let keyScale: string | undefined;
  let timeSignature: string | undefined;
  let enhancedLyrics = resolvedLyrics;

  try {
    const formatted = await callFormatInput({
      prompt: genreTags ? `${prompt}, ${genreTags}` : prompt,
      lyrics: resolvedLyrics,
    });
    enhancedCaption = formatted.caption;
    bpm = typeof formatted.bpm === 'number' ? formatted.bpm : parseInt(String(formatted.bpm), 10) || undefined;
    keyScale = formatted.keyscale || undefined;
    timeSignature = formatted.timesignature || undefined;
    enhancedLyrics = formatted.lyrics || resolvedLyrics;
  } catch (rawError) {
    // Fallback: continue with raw prompt if format_input fails (graceful degradation)
    const classified = classifyError(rawError);
    console.warn('[generate] format_input failed, falling back to raw prompt:', classified.technicalMessage);
  }

  // Submit the job to ACE-Step (non-blocking — returns immediately with task_id)
  let runpodTaskId: string;
  try {
    const submitResponse = await submitGenerationJob({
      prompt: enhancedCaption,
      lyrics: enhancedLyrics,
      audioDuration: duration,
      batchSize: 2, // Always generate 2 variants
      bpm,
      keyScale,
      timeSignature,
    });
    runpodTaskId = submitResponse.task_id;
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
        runpodJobId: runpodTaskId,
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
    // DB insert failed — job is running on RunPod but we lost the reference.
    // Log and return a 500 rather than leaving caller with no jobId.
    const classified = classifyError(rawError);
    console.error('[generate] DB insert failed after job submitted:', classified.technicalMessage, {
      runpodTaskId,
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
