import { NextRequest, NextResponse } from 'next/server';
import { fetchAudioBuffer } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAudioPresignedUrl } from '@/lib/r2';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audio/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Serve the generated audio track for a job.
 *
 * Priority:
 * 1. If song has been finalized (r2Mp3Key exists), redirect to R2 presigned URL.
 *    Presigned URLs expire in 1 hour — good for immediate playback after generation.
 * 2. If song is not yet finalized (still generating or r2Mp3Key absent),
 *    fall back to proxying directly from HeartMuLa.
 *
 * The same-origin URL (/api/audio/[jobId]) ensures the browser's `download`
 * attribute on anchor tags works correctly — cross-origin URLs cause browsers
 * to open the file instead of saving it (R2 redirect is allowed here since
 * NextResponse.redirect is transparent to the browser's download behavior).
 *
 * Cache-Control: 1 hour — generated songs don't change after completion.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  // 1. Check if song is finalized (has r2Mp3Key) — serve from R2
  try {
    const [song] = await db
      .select({ r2Mp3Key: songs.r2Mp3Key })
      .from(songs)
      .where(eq(songs.heartbulaJobId, jobId))
      .limit(1);

    if (song?.r2Mp3Key) {
      const presignedUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);
      return NextResponse.redirect(presignedUrl);
    }
  } catch (dbError) {
    // DB lookup failed — log and fall through to HeartBula proxy
    console.error('[audio] DB lookup for r2Mp3Key failed, falling back to HeartBula proxy:', dbError);
  }

  // 2. Fall back to HeartMuLa proxy (song not yet finalized or DB error)
  try {
    const buffer = await fetchAudioBuffer(jobId);
    // Convert Node.js Buffer to Uint8Array for NextResponse BodyInit compatibility
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[audio] fetchAudioBuffer failed:', classified.technicalMessage);
    return NextResponse.json(toErrorResponse(classified), { status: 502 });
  }
}
