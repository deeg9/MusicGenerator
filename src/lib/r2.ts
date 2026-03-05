import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';

// ─────────────────────────────────────────────────────────────────────────────
// S3Client singleton (Cloudflare R2 is S3-compatible)
// ─────────────────────────────────────────────────────────────────────────────

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Key naming
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a deterministic R2 object key for a WAV audio variant.
 *
 * Format: generations/{generationId}/output_{variantIndex}.wav
 * Example: generations/d4f2a8b1-3e9c-4a1b-b2c3-d5e6f7a8b9c0/output_0.wav
 */
export function buildR2Key(generationId: string, variantIndex: number): string {
  return `generations/${generationId}/output_${variantIndex}.wav`;
}

/**
 * Build a deterministic R2 object key for an MP3 audio variant.
 *
 * Format: generations/{generationId}/output_{variantIndex}.mp3
 * Example: generations/d4f2a8b1-3e9c-4a1b-b2c3-d5e6f7a8b9c0/output_0.mp3
 */
export function buildR2Mp3Key(generationId: string, variantIndex: number): string {
  return `generations/${generationId}/output_${variantIndex}.mp3`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload an audio buffer to Cloudflare R2.
 *
 * @param key - The R2 object key (use buildR2Key or buildR2Mp3Key to generate)
 * @param buffer - The audio file bytes
 * @param contentType - MIME type (default: 'audio/wav'; use 'audio/mpeg' for MP3)
 */
export async function uploadAudioToR2(
  key: string,
  buffer: Buffer,
  contentType = 'audio/wav',
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Presigned URLs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a time-limited presigned URL for downloading an audio file from R2.
 * Presigned URLs allow browser-direct download without exposing credentials.
 *
 * @param key - The R2 object key
 * @param expiresIn - Expiry in seconds (default: 86400 = 24 hours)
 * @param downloadFilename - Optional filename for Content-Disposition header.
 *   When provided, the browser will prompt to save with this filename.
 * @returns A presigned HTTPS URL valid for the specified duration
 */
export async function getAudioPresignedUrl(
  key: string,
  expiresIn = 86400,
  downloadFilename?: string,
): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ...(downloadFilename
        ? { ResponseContentDisposition: `attachment; filename="${downloadFilename}"` }
        : {}),
    }),
    { expiresIn },
  );
}
