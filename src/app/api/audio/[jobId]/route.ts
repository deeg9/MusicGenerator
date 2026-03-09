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
 * Always serves from R2 presigned URL. The serverless handler uploads
 * both WAV and MP3 to R2 before marking the job as completed, so by the
 * time this route is called the files are guaranteed to exist.
 *
 * Cache-Control: 1 hour — generated songs don't change after completion.
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
