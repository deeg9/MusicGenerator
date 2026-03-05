import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock env module before importing r2 to avoid env validation errors in test environment
vi.mock('@/env', () => ({
  env: {
    CLOUDFLARE_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
    HEARTMULA_URL: 'https://test.runpod.io',
  },
}));

let buildR2Mp3Key: (generationId: string, variantIndex: number) => string;

beforeAll(async () => {
  const r2 = await import('./r2');
  buildR2Mp3Key = r2.buildR2Mp3Key;
});

describe('buildR2Mp3Key', () => {
  it('returns correct key format for MP3 variant 0', () => {
    expect(buildR2Mp3Key('gen123', 0)).toBe('generations/gen123/output_0.mp3');
  });

  it('returns correct key format for MP3 variant 1', () => {
    expect(buildR2Mp3Key('gen123', 1)).toBe('generations/gen123/output_1.mp3');
  });
});

describe('getAudioPresignedUrl', () => {
  it.todo('includes content-disposition header when downloadFilename provided');
});
