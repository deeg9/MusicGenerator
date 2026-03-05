import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies so we can import the route module
vi.mock('@/env', () => ({
  env: {
    CLOUDFLARE_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_NAME: 'test-bucket',
    HEARTMULA_URL: 'https://test.runpod.io',
  },
}));

vi.mock('@/db', () => ({
  db: {},
}));

vi.mock('@/lib/heartmula', () => ({
  queryJobStatus: vi.fn(),
  fetchAudioBuffer: vi.fn(),
}));

vi.mock('@/lib/r2', () => ({
  uploadAudioToR2: vi.fn(),
  buildR2Mp3Key: vi.fn((id: string, i: number) => `generations/${id}/output_${i}.mp3`),
  getAudioPresignedUrl: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  classifyError: vi.fn((e: unknown) => ({
    category: 'unknown',
    retryable: false,
    userMessage: 'An error occurred.',
    technicalMessage: String(e),
  })),
}));

describe('GET /api/status/[jobId]', () => {
  it('exports a GET function', async () => {
    const route = await import('./[jobId]/route');
    expect(typeof route.GET).toBe('function');
  });

  it.todo('returns mp3Url and url for completed generation');
  it.todo('returns mp3FileSizeBytes for each output');
  it.todo('handles partial job failure gracefully');
});
