import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { generations, outputs } from '@/db/schema';
import { queryJobStatus, fetchAudioBuffer } from '@/lib/heartmula';
import { uploadAudioToR2, buildR2Mp3Key, getAudioPresignedUrl } from '@/lib/r2';
import { buildDownloadFilename } from '@/lib/filename';
import { classifyError } from '@/lib/errors';
import type { InferSelectModel } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Generation = InferSelectModel<typeof generations>;
type Output = InferSelectModel<typeof outputs>;

interface GenerationWithOutputs extends Generation {
  outputs: Output[];
}

interface OutputWithUrl {
  id: string;
  variantIndex: number;
  r2Key: string;
  url: string | null;           // Original audio presigned URL (for download)
  mp3Url: string | null;        // MP3 presigned URL (for download)
  playbackUrl: string | null;   // Presigned URL without Content-Disposition (for streaming)
  mp3FileSizeBytes: number | null;
  createdAt: Date;
  promptText: string | null;
}

interface StatusResponse {
  jobId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
  outputs: OutputWithUrl[];
  error: {
    category: string;
    retryable: boolean;
    message: string;
    technical: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/status/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  // Query generation with its outputs
  let generation: GenerationWithOutputs | undefined;
  try {
    const result = await db.query.generations.findFirst({
      where: eq(generations.id, jobId),
      with: { outputs: true },
    });
    generation = result as GenerationWithOutputs | undefined;
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[status] DB query failed:', classified.technicalMessage, { jobId });
    return NextResponse.json(
      {
        error: {
          category: classified.category,
          retryable: classified.retryable,
          message: 'Failed to look up generation status.',
          technical: classified.technicalMessage,
        },
      },
      { status: 500 },
    );
  }

  if (!generation) {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: 'Generation not found.',
          technical: `No generation with id=${jobId}`,
        },
      },
      { status: 404 },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Terminal states — return from DB cache, no backend call needed
  // ─────────────────────────────────────────────────────────────────────────

  if (generation.status === 'completed' || generation.status === 'failed') {
    const outputsWithUrls: OutputWithUrl[] = await buildOutputsWithUrls(
      generation.outputs ?? [],
      generation.status === 'completed',
      generation.promptText,
    );

    return NextResponse.json(buildStatusResponse(generation, outputsWithUrls));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Active states — poll all HeartMuLa jobs in parallel
  // ─────────────────────────────────────────────────────────────────────────

  const backendJobIds = generation.backendJobIds ?? [];

  let jobStatuses: Awaited<ReturnType<typeof queryJobStatus>>[];
  try {
    jobStatuses = await Promise.all(backendJobIds.map((id) => queryJobStatus(id)));
  } catch (rawError) {
    // Poll failed — return current DB state, do NOT mark failed
    const classified = classifyError(rawError);
    if (classified.category !== 'timeout') {
      console.error('[status] HeartMuLa query failed:', classified.technicalMessage, {
        jobId,
        backendJobIds,
      });
    }
    return NextResponse.json(buildStatusResponse(generation, []));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Aggregate statuses
  // ─────────────────────────────────────────────────────────────────────────

  const completed = jobStatuses.filter((s) => s.status === 'COMPLETED');
  const failed = jobStatuses.filter((s) => s.status === 'FAILED');
  const stillRunning = jobStatuses.filter((s) => s.status === 'QUEUED' || s.status === 'PROCESSING');

  // If any jobs are still running, return processing
  if (stillRunning.length > 0) {
    if (generation.status === 'pending') {
      try {
        await db
          .update(generations)
          .set({ status: 'processing' })
          .where(eq(generations.id, jobId));
      } catch (dbError) {
        console.error('[status] Failed to update generation to processing state:', dbError, { jobId });
      }
    }

    return NextResponse.json({
      jobId,
      status: 'processing',
      startedAt: generation.startedAt,
      completedAt: null,
      failedAt: null,
      outputs: [],
      error: null,
    });
  }

  // All jobs terminal — check if all failed
  if (completed.length === 0 && failed.length > 0) {
    const errorMessage = failed[0].error_msg ?? 'All HeartMuLa generation jobs failed';
    const rawError = new Error(errorMessage);
    const classified = classifyError(rawError);

    try {
      await db
        .update(generations)
        .set({
          status: 'failed',
          failedAt: new Date(),
          errorType: classified.category,
          errorMessage: classified.userMessage,
          retryable: classified.retryable,
        })
        .where(eq(generations.id, jobId));
    } catch (dbError) {
      console.error('[status] Failed to update generation to failed state:', dbError, { jobId });
    }

    return NextResponse.json({
      jobId,
      status: 'failed',
      startedAt: generation.startedAt,
      completedAt: null,
      failedAt: new Date(),
      outputs: [],
      error: {
        category: classified.category,
        retryable: classified.retryable,
        message: classified.userMessage,
        technical: classified.technicalMessage,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // At least 1 completed — download audio, upload to R2
  // ─────────────────────────────────────────────────────────────────────────

  const insertedOutputs: OutputWithUrl[] = [];

  for (let i = 0; i < backendJobIds.length; i++) {
    const status = jobStatuses[i];
    const backendJobId = backendJobIds[i];

    if (status.status !== 'COMPLETED') continue;

    const mp3R2Key = buildR2Mp3Key(jobId, i);

    try {
      const mp3Buffer = await fetchAudioBuffer(backendJobId);
      const mp3FileSizeBytes = mp3Buffer.byteLength;

      await uploadAudioToR2(mp3R2Key, mp3Buffer, 'audio/mpeg');

      const [insertedOutput] = await db
        .insert(outputs)
        .values({
          generationId: jobId,
          variantIndex: i,
          r2Key: mp3R2Key,
          mp3R2Key: mp3R2Key,
          mp3FileSizeBytes,
        })
        .returning();

      // Generate presigned URLs
      const playbackUrl = await getAudioPresignedUrl(mp3R2Key, 86400);

      const mp3Filename = buildDownloadFilename(generation.promptText, i, 'mp3');
      const mp3PresignedUrl = await getAudioPresignedUrl(mp3R2Key, 86400, mp3Filename);

      insertedOutputs.push({
        id: insertedOutput.id,
        variantIndex: insertedOutput.variantIndex,
        r2Key: insertedOutput.r2Key,
        url: mp3PresignedUrl,
        mp3Url: mp3PresignedUrl,
        playbackUrl,
        mp3FileSizeBytes: insertedOutput.mp3FileSizeBytes,
        createdAt: insertedOutput.createdAt,
        promptText: generation.promptText,
      });
    } catch (rawError) {
      const classified = classifyError(rawError);
      console.error('[status] Failed to download/upload audio variant:', classified.technicalMessage, {
        jobId,
        variantIndex: i,
        backendJobId,
      });
    }
  }

  // Update generation to completed
  try {
    await db
      .update(generations)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(generations.id, jobId));
  } catch (dbError) {
    console.error('[status] Failed to update generation to completed state:', dbError, { jobId });
  }

  return NextResponse.json({
    jobId,
    status: 'completed',
    startedAt: generation.startedAt,
    completedAt: new Date(),
    failedAt: null,
    outputs: insertedOutputs,
    error: null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function buildOutputsWithUrls(
  generationOutputs: Output[],
  generateUrls: boolean,
  promptText: string,
): Promise<OutputWithUrl[]> {
  const results: OutputWithUrl[] = [];

  for (const output of generationOutputs) {
    let url: string | null = null;
    let mp3Url: string | null = null;
    let playbackUrl: string | null = null;

    if (generateUrls) {
      // Playback URL — no Content-Disposition, prefer MP3 key
      try {
        playbackUrl = await getAudioPresignedUrl(output.mp3R2Key ?? output.r2Key, 86400);
      } catch (err) {
        console.error('[status] Failed to generate playback presigned URL:', err, { r2Key: output.r2Key });
      }

      if (output.mp3R2Key) {
        try {
          const mp3Filename = buildDownloadFilename(promptText, output.variantIndex, 'mp3');
          mp3Url = await getAudioPresignedUrl(output.mp3R2Key, 86400, mp3Filename);
          url = mp3Url; // Both point to MP3 now
        } catch (err) {
          console.error('[status] Failed to generate MP3 presigned URL:', err, { mp3R2Key: output.mp3R2Key });
        }
      }
    }

    results.push({
      id: output.id,
      variantIndex: output.variantIndex,
      r2Key: output.r2Key,
      url,
      mp3Url,
      playbackUrl,
      mp3FileSizeBytes: output.mp3FileSizeBytes,
      createdAt: output.createdAt,
      promptText,
    });
  }

  return results;
}

function buildStatusResponse(
  generation: Generation,
  outputsWithUrls: OutputWithUrl[],
): StatusResponse {
  return {
    jobId: generation.id,
    status: generation.status,
    startedAt: generation.startedAt,
    completedAt: generation.completedAt,
    failedAt: generation.failedAt,
    outputs: outputsWithUrls,
    error:
      generation.errorType
        ? {
            category: generation.errorType,
            retryable: generation.retryable ?? false,
            message: generation.errorMessage ?? 'An error occurred.',
            technical: generation.errorMessage ?? '',
          }
        : null,
  };
}
