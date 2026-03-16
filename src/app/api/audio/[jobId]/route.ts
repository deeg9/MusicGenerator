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
 * Proxies the audio from R2 instead of redirecting, to avoid cross-origin
 * issues with the browser's <audio> element (CORS + range request problems
 * when redirecting to a different origin).
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

    // Proxy the audio to avoid cross-origin issues with <audio> element
    const r2Response = await fetch(presignedUrl);
    if (!r2Response.ok) {
      console.error('[audio] R2 fetch failed:', r2Response.status, r2Response.statusText);
      return NextResponse.json(
        { error: 'Failed to retrieve audio from storage.' },
        { status: 502 },
      );
    }

    const audioBuffer = await r2Response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('[audio] Failed to serve audio:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audio.' },
      { status: 500 },
    );
  }
}
