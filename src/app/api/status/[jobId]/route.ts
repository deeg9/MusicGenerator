import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { generations, outputs } from '@/db/schema';
import { queryJobStatus, fetchAudioBuffer } from '@/lib/runpod';
import { uploadAudioToR2, buildR2Key, buildR2Mp3Key, getAudioPresignedUrl } from '@/lib/r2';
import { convertToMp3, detectAudioFormat } from '@/lib/audio';
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
  url: string | null;        // WAV presigned URL
  mp3Url: string | null;     // MP3 presigned URL
  mp3FileSizeBytes: number | null;
  createdAt: Date;
  promptText: string | null; // for filename display on client
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
  // Terminal states — return from DB cache, no RunPod call needed
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
  // Active states — make a single RunPod poll
  // ─────────────────────────────────────────────────────────────────────────

  let runpodStatus: Awaited<ReturnType<typeof queryJobStatus>>;
  try {
    runpodStatus = await queryJobStatus(generation.runpodJobId);
  } catch (rawError) {
    // RunPod poll timed out or failed — return current DB state, do NOT mark failed
    const classified = classifyError(rawError);
    const isTimeout = classified.category === 'timeout';
    if (!isTimeout) {
      console.error('[status] RunPod query failed:', classified.technicalMessage, {
        jobId,
        runpodJobId: generation.runpodJobId,
      });
    }
    // Return current DB state unchanged
    return NextResponse.json(buildStatusResponse(generation, []));
  }

  // ACE-Step status codes:
  //   0 = queued or running
  //   1 = succeeded
  //   2 = failed

  if (runpodStatus.status === 2) {
    // Job failed on RunPod — classify and persist
    const errorMessage = runpodStatus.error ?? `ACE-Step returned status=2 for task ${generation.runpodJobId}`;
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

  if (runpodStatus.status === 1) {
    // Job succeeded — download audio, convert to MP3, upload both to R2, insert output records
    const audioUrls = runpodStatus.data?.audio_urls ?? [];

    // If ACE-Step returned audio URLs, download and upload each one
    // Fallback: if no audio_urls (known issue: query_result may return empty data),
    // still mark completed so the client knows to proceed
    const insertedOutputs: OutputWithUrl[] = [];

    if (audioUrls.length > 0) {
      for (let i = 0; i < audioUrls.length; i++) {
        const audioPath = audioUrls[i];
        const wavR2Key = buildR2Key(jobId, i);
        const mp3R2Key = buildR2Mp3Key(jobId, i);

        try {
          const audioBuffer = await fetchAudioBuffer(audioPath);
          const detectedFormat = detectAudioFormat(audioBuffer);

          // Upload original to R2 with correct content type
          const originalContentType = detectedFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
          await uploadAudioToR2(wavR2Key, audioBuffer, originalContentType);

          // Generate MP3 at 320k (re-encode if already MP3, convert if WAV)
          let mp3FileSizeBytes: number | null = null;
          let mp3KeyStored: string | null = null;

          try {
            const mp3Buffer = await convertToMp3(audioBuffer);
            mp3FileSizeBytes = mp3Buffer.byteLength;
            await uploadAudioToR2(mp3R2Key, mp3Buffer, 'audio/mpeg');
            mp3KeyStored = mp3R2Key;
          } catch (mp3Error) {
            const classified = classifyError(mp3Error);
            console.error('[status] MP3 conversion failed (original-only fallback):', classified.technicalMessage, {
              jobId,
              variantIndex: i,
              detectedFormat,
            });
          }

          const [insertedOutput] = await db
            .insert(outputs)
            .values({
              generationId: jobId,
              variantIndex: i,
              r2Key: wavR2Key,
              mp3R2Key: mp3KeyStored,
              mp3FileSizeBytes,
            })
            .returning();

          // Generate presigned URLs with descriptive filenames
          const wavFilename = buildDownloadFilename(generation.promptText, i, 'wav');
          const wavPresignedUrl = await getAudioPresignedUrl(wavR2Key, 86400, wavFilename);

          let mp3PresignedUrl: string | null = null;
          if (mp3KeyStored) {
            const mp3Filename = buildDownloadFilename(generation.promptText, i, 'mp3');
            mp3PresignedUrl = await getAudioPresignedUrl(mp3KeyStored, 86400, mp3Filename);
          }

          insertedOutputs.push({
            id: insertedOutput.id,
            variantIndex: insertedOutput.variantIndex,
            r2Key: insertedOutput.r2Key,
            url: wavPresignedUrl,
            mp3Url: mp3PresignedUrl,
            mp3FileSizeBytes: insertedOutput.mp3FileSizeBytes,
            createdAt: insertedOutput.createdAt,
            promptText: generation.promptText,
          });
        } catch (rawError) {
          const classified = classifyError(rawError);
          console.error('[status] Failed to download/upload audio variant:', classified.technicalMessage, {
            jobId,
            variantIndex: i,
            audioPath,
          });
          // Continue with remaining variants — partial success is still valuable
        }
      }
    } else {
      // query_result returned empty data — known ACE-Step behavior where audio is
      // served via GET /v1/audio?path= but audio_urls is not returned in query_result.
      // Mark as completed so the client knows the job finished. Audio retrieval
      // requires the audio path which is not available here — log for investigation.
      console.warn('[status] ACE-Step returned status=1 but no audio_urls in query_result data.', {
        jobId,
        runpodJobId: generation.runpodJobId,
        responseData: runpodStatus.data,
      });
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

  // Status = 0: still running — update to 'processing' if currently 'pending'
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

    if (generateUrls) {
      try {
        const wavFilename = buildDownloadFilename(promptText, output.variantIndex, 'wav');
        url = await getAudioPresignedUrl(output.r2Key, 86400, wavFilename);
      } catch (err) {
        console.error('[status] Failed to generate WAV presigned URL:', err, { r2Key: output.r2Key });
      }

      if (output.mp3R2Key) {
        try {
          const mp3Filename = buildDownloadFilename(promptText, output.variantIndex, 'mp3');
          mp3Url = await getAudioPresignedUrl(output.mp3R2Key, 86400, mp3Filename);
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
