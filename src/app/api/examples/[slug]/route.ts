import { NextRequest, NextResponse } from 'next/server';
import { getAudioPresignedUrl } from '@/lib/r2';
import { classifyError } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/examples/[slug]
//
// Returns a presigned R2 URL for a pre-generated example audio file.
// The slug is mapped to a hardcoded R2 key — R2 keys are never exposed to
// the client (slug acts as safe indirection).
// ─────────────────────────────────────────────────────────────────────────────

const EXAMPLE_KEYS: Record<string, string> = {
  'jazz-birthday': 'examples/jazz-birthday.mp3',
  'love-ballad': 'examples/love-ballad.mp3',
  graduation: 'examples/graduation.mp3',
};

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const r2Key = EXAMPLE_KEYS[slug];
  if (!r2Key) {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: 'Example not found.',
        },
      },
      { status: 404 },
    );
  }

  try {
    const url = await getAudioPresignedUrl(r2Key, PRESIGNED_URL_EXPIRY);
    return NextResponse.json({ url, expiresIn: PRESIGNED_URL_EXPIRY });
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.error('[examples] Failed to generate presigned URL:', classified.technicalMessage, {
      slug,
      r2Key,
    });
    return NextResponse.json(
      {
        error: {
          category: classified.category,
          retryable: classified.retryable,
          message: 'Failed to retrieve example audio URL. Please try again.',
          technical: classified.technicalMessage,
        },
      },
      { status: 500 },
    );
  }
}
