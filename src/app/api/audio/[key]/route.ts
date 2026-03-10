import { NextRequest, NextResponse } from 'next/server';
import { getAudioPresignedUrl } from '@/lib/r2';
import { classifyError } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audio/[key]
//
// Returns a presigned R2 URL for downloading an audio file.
// The `key` param is URL-encoded (e.g. "generations%2Fabc123%2Foutput_0.wav").
// ─────────────────────────────────────────────────────────────────────────────

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  const { key: encodedKey } = await params;

  // Decode the URL-encoded R2 object key
  let r2Key: string;
  try {
    r2Key = decodeURIComponent(encodedKey);
  } catch {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: 'Invalid audio key format.',
          technical: `decodeURIComponent failed for key: ${encodedKey}`,
        },
      },
      { status: 400 },
    );
  }

  if (!r2Key || r2Key.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          category: 'invalid_input',
          retryable: false,
          message: 'Audio key is required.',
          technical: 'Empty key after decode',
        },
      },
      { status: 400 },
    );
  }

  try {
    const url = await getAudioPresignedUrl(r2Key, PRESIGNED_URL_EXPIRY);
    return NextResponse.json({ url, expiresIn: PRESIGNED_URL_EXPIRY });
  } catch (rawError) {
    const classified = classifyError(rawError);

    // Detect "not found" errors from S3/R2
    const technical = classified.technicalMessage.toLowerCase();
    const isNotFound =
      technical.includes('nosuchkey') ||
      technical.includes('not found') ||
      technical.includes('404');

    if (isNotFound) {
      return NextResponse.json(
        {
          error: {
            category: 'invalid_input',
            retryable: false,
            message: 'Audio file not found.',
            technical: classified.technicalMessage,
          },
        },
        { status: 404 },
      );
    }

    console.error('[audio] Failed to generate presigned URL:', classified.technicalMessage, { r2Key });
    return NextResponse.json(
      {
        error: {
          category: classified.category,
          retryable: classified.retryable,
          message: 'Failed to retrieve audio URL. Please try again.',
          technical: classified.technicalMessage,
        },
      },
      { status: 500 },
    );
  }
}
