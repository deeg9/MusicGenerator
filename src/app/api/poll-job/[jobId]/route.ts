import { NextRequest, NextResponse } from 'next/server';
import { queryJobStatus } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Finalization — reads R2 keys from RunPod output (handler already uploaded)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the song row with R2 keys from the RunPod handler output.
 *
 * The serverless handler generates WAV, converts to MP3, and uploads both
 * to R2 before returning. We just need to record the keys in the DB.
 *
 * Uses isNull(r2WavKey) as a double-finalization guard.
 */
async function finalizeSong(
  jobId: string,
  r2WavKey: string,
  r2Mp3Key: string,
): Promise<void> {
  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.heartbulaJobId, jobId), isNull(songs.r2WavKey)))
    .limit(1);

  if (!song) return; // Already finalized or no matching row

  await db
    .update(songs)
    .set({
      status: 'completed',
      r2WavKey,
      r2Mp3Key,
      completedAt: new Date(),
    })
    .where(eq(songs.id, song.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/poll-job/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll RunPod Serverless for the status of a generation job.
 *
 * Returns { status, error } without exposing RunPod internals.
 *
 * On COMPLETED: reads R2 keys from RunPod output and updates the song row.
 * On FAILED: marks the song row as failed with failedAt timestamp.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  // Fast path: if the song is already finalized in DB, skip RunPod entirely.
  // This handles cases where RunPod has purged the job from its queue but our
  // DB already has the completed/failed state from a previous poll.
  try {
    const [existingSong] = await db
      .select({ status: songs.status, r2Mp3Key: songs.r2Mp3Key, unlockedAt: songs.unlockedAt, recipientEmailSentAt: songs.recipientEmailSentAt, quizData: songs.quizData })
      .from(songs)
      .where(eq(songs.heartbulaJobId, jobId))
      .limit(1);

    if (existingSong?.status === 'completed' && existingSong.r2Mp3Key) {
      return NextResponse.json({ status: 'COMPLETED', error: null, unlockedAt: existingSong.unlockedAt?.toISOString() ?? null, recipientEmailSentAt: existingSong.recipientEmailSentAt?.toISOString() ?? null, recipientEmail: existingSong.quizData?.recipientEmail ?? null });
    }
    if (existingSong?.status === 'failed') {
      return NextResponse.json({ status: 'FAILED', error: 'Song generation failed.' });
    }
  } catch (dbError) {
    console.error('[poll-job] DB fast-path check failed (non-fatal):', dbError);
  }

  try {
    const result = await queryJobStatus(jobId);

    // COMPLETED: finalize song with R2 keys from handler output
    if (result.status === 'COMPLETED' && result.r2_wav_key && result.r2_mp3_key) {
      try {
        await finalizeSong(jobId, result.r2_wav_key, result.r2_mp3_key);
      } catch (finalizationError) {
        console.error('[poll-job] finalizeSong failed (non-fatal):', finalizationError);
      }

      // Send creator email — non-blocking, failures must never break the poll response
      try {
        const [songForEmail] = await db
          .select({
            id: songs.id,
            userId: songs.userId,
            quizData: songs.quizData,
            creatorEmailSentAt: songs.creatorEmailSentAt,
            recipientEmailSentAt: songs.recipientEmailSentAt,
          })
          .from(songs)
          .where(eq(songs.heartbulaJobId, jobId))
          .limit(1);

        if (songForEmail && !songForEmail.creatorEmailSentAt) {
          // Determine if we should send and build the request body
          let emailBody: Record<string, string> | null = null;

          if (songForEmail.userId) {
            // Authenticated user — look up email via Supabase
            emailBody = { songId: songForEmail.id };
          } else if (songForEmail.quizData?.emailOptIn && songForEmail.quizData?.email) {
            // Anonymous user who opted in — pass email directly
            emailBody = { songId: songForEmail.id, creatorEmail: songForEmail.quizData.email };
          }

          if (emailBody) {
            const emailResponse = await fetch(
              new URL('/api/send-creator-email', request.url),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailBody),
              },
            );

            if (emailResponse.ok) {
              await db
                .update(songs)
                .set({ creatorEmailSentAt: new Date() })
                .where(eq(songs.id, songForEmail.id));
            }
          }
        }
      } catch (emailError) {
        console.error('[poll-job] creator email failed (non-fatal):', emailError);
      }

      // Send recipient email — non-blocking, failures must never break the poll response
      try {
        const [songForRecipientEmail] = await db
          .select({
            id: songs.id,
            quizData: songs.quizData,
            recipientEmailSentAt: songs.recipientEmailSentAt,
          })
          .from(songs)
          .where(eq(songs.heartbulaJobId, jobId))
          .limit(1);

        const recipientEmail = songForRecipientEmail?.quizData?.recipientEmail;
        if (songForRecipientEmail && recipientEmail && !songForRecipientEmail.recipientEmailSentAt) {
          const recipientRes = await fetch(
            new URL('/api/send-recipient-email', request.url),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ songId: songForRecipientEmail.id, recipientEmail }),
            },
          );
          if (recipientRes.ok) {
            await db
              .update(songs)
              .set({ recipientEmailSentAt: new Date() })
              .where(eq(songs.id, songForRecipientEmail.id));
          }
        }
      } catch (recipientEmailError) {
        console.error('[poll-job] recipient email failed (non-fatal):', recipientEmailError);
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

    // Include extra fields for COMPLETED status
    let unlockedAt: string | null = null;
    let recipientEmailSentAt: string | null = null;
    let recipientEmail: string | null = null;
    if (result.status === 'COMPLETED') {
      try {
        const [songRow] = await db
          .select({ unlockedAt: songs.unlockedAt, recipientEmailSentAt: songs.recipientEmailSentAt, quizData: songs.quizData })
          .from(songs)
          .where(eq(songs.heartbulaJobId, jobId))
          .limit(1);
        unlockedAt = songRow?.unlockedAt?.toISOString() ?? null;
        recipientEmailSentAt = songRow?.recipientEmailSentAt?.toISOString() ?? null;
        recipientEmail = songRow?.quizData?.recipientEmail ?? null;
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ status: result.status, error: result.error_msg ?? null, unlockedAt, recipientEmailSentAt, recipientEmail });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[poll-job] queryJobStatus failed:', classified.technicalMessage);

    if (classified.category === 'gpu_unavailable') {
      return NextResponse.json(toErrorResponse(classified), { status: 502 });
    }

    // Transient error — keep polling gracefully
    return NextResponse.json({ status: 'QUEUED', error: null });
  }
}
