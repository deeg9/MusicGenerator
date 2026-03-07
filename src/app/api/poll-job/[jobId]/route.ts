import { NextRequest, NextResponse } from 'next/server';
import { queryJobStatus, fetchAudioBuffer } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { convertToMp3 } from '@/lib/audio';
import { uploadAudioToR2, buildSongR2WavKey, buildSongR2Mp3Key } from '@/lib/r2';

// ─────────────────────────────────────────────────────────────────────────────
// Finalization pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download WAV from HeartBula, convert to MP3, upload both to R2,
 * and update the song row with R2 keys and status='completed'.
 *
 * Uses isNull(r2WavKey) as a double-finalization guard — if the song was
 * already finalized by a previous poll, the SELECT returns empty and we skip.
 * Errors are swallowed so the poll response always returns COMPLETED to the
 * client even if finalization fails.
 */
async function finalizeSong(jobId: string): Promise<void> {
  // Look up song that needs finalization (r2WavKey IS NULL = not yet done)
  const [song] = await db
    .select({ id: songs.id, r2WavKey: songs.r2WavKey })
    .from(songs)
    .where(and(eq(songs.heartbulaJobId, jobId), isNull(songs.r2WavKey)))
    .limit(1);

  if (!song) {
    // Already finalized or no matching row — skip silently
    return;
  }

  // Download WAV from HeartBula
  const wavBuffer = await fetchAudioBuffer(jobId);

  // Convert to MP3
  const mp3Buffer = await convertToMp3(wavBuffer);

  // Build R2 keys
  const wavKey = buildSongR2WavKey(song.id);
  const mp3Key = buildSongR2Mp3Key(song.id);

  // Upload both files to R2 in parallel
  await Promise.all([
    uploadAudioToR2(wavKey, wavBuffer, 'audio/wav'),
    uploadAudioToR2(mp3Key, mp3Buffer, 'audio/mpeg'),
  ]);

  // Update song row with R2 keys and mark completed
  await db
    .update(songs)
    .set({ status: 'completed', r2WavKey: wavKey, r2Mp3Key: mp3Key, completedAt: new Date() })
    .where(eq(songs.id, song.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/poll-job/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll HeartMuLa for the status of a generation job.
 *
 * Returns { status, error } without exposing internal HeartMuLa URL.
 *
 * On COMPLETED: triggers the finalization pipeline (download WAV, convert MP3,
 * upload R2, update song row). Finalization errors are caught and logged but
 * do NOT affect the poll response — the client still receives { status: 'COMPLETED' }.
 *
 * On FAILED: marks the song row as failed with failedAt timestamp.
 *
 * Error handling:
 * - gpu_unavailable (network error / ECONNREFUSED): 502 with structured error
 *   so the success page can distinguish "pod down" from "song still running"
 * - All other transient errors: returns status=QUEUED so the client keeps
 *   polling rather than showing an error for minor blips
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  try {
    const result = await queryJobStatus(jobId);

    // COMPLETED: trigger finalization pipeline (non-blocking for the response)
    if (result.status === 'COMPLETED') {
      try {
        await finalizeSong(jobId);
      } catch (finalizationError) {
        console.error('[poll-job] finalizeSong failed (non-fatal):', finalizationError);
      }
    }

    // FAILED: mark song row as failed
    if (result.status === 'FAILED') {
      try {
        await db
          .update(songs)
          .set({ status: 'failed', failedAt: new Date() })
          .where(eq(songs.heartbulaJobId, jobId));
      } catch (updateError) {
        console.error('[poll-job] Failed to mark song as failed (non-fatal):', updateError);
      }
    }

    return NextResponse.json({ status: result.status, error: result.error_msg ?? null });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[poll-job] queryJobStatus failed:', classified.technicalMessage);

    if (classified.category === 'gpu_unavailable') {
      // Pod is unreachable — caller needs to know this is a hard failure, not a blip
      return NextResponse.json(toErrorResponse(classified), { status: 502 });
    }

    // Truly transient (unknown category) — keep polling gracefully
    return NextResponse.json({ status: 'QUEUED', error: null });
  }
}
