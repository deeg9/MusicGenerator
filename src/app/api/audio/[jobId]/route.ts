import { NextRequest, NextResponse } from 'next/server';
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
 * Redirects to a presigned R2 URL. The browser's <audio> element follows
 * the redirect and streams directly from R2 (CORS is configured on the bucket).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  try {
    const [song] = await db
      .select({ r2Mp3Key: songs.r2Mp3Key })
      .from(songs)
      .where(eq(songs.heartbulaJobId, jobId))
      .limit(1);

    if (!song?.r2Mp3Key) {
      return NextResponse.json(
        { error: 'Audio not yet available. Song may still be generating.' },
        { status: 404 },
      );
    }

    const presignedUrl = await getAudioPresignedUrl(song.r2Mp3Key, 3600);

    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error('[audio] Failed to serve audio:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audio.' },
      { status: 500 },
    );
  }
}
