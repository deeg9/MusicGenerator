import { NextRequest, NextResponse } from 'next/server';
import { fetchAudioBuffer } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audio/[jobId]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Proxy the generated audio track from HeartMuLa to the browser.
 *
 * Fetches the MP3 buffer server-side and returns it as audio/mpeg,
 * keeping the internal HeartMuLa URL hidden from the client.
 *
 * The same-origin URL (/api/audio/[jobId]) also ensures the browser's
 * `download` attribute on anchor tags works correctly — cross-origin URLs
 * cause browsers to open the file instead of saving it.
 *
 * Cache-Control: 1 hour — generated songs don't change after completion.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

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
