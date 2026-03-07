import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock variables
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockDbSelect,
  mockDbSelectFrom,
  mockDbSelectFromWhere,
  mockDbSelectFromWhereLimit,
  mockGetAudioPresignedUrl,
} = vi.hoisted(() => {
  const mockDbSelectFromWhereLimit = vi.fn();
  const mockDbSelectFromWhere = vi.fn(() => ({ limit: mockDbSelectFromWhereLimit }));
  const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectFromWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));
  const mockGetAudioPresignedUrl = vi.fn();

  return {
    mockDbSelect,
    mockDbSelectFrom,
    mockDbSelectFromWhere,
    mockDbSelectFromWhereLimit,
    mockGetAudioPresignedUrl,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/heartmula', () => ({
  fetchAudioBuffer: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  classifyError: vi.fn((e: unknown) => ({
    category: 'unknown',
    retryable: true,
    userMessage: 'Something went wrong.',
    technicalMessage: String(e),
  })),
  toErrorResponse: vi.fn((err: { category: string; retryable: boolean; userMessage: string; technicalMessage: string }) => ({
    error: {
      category: err.category,
      retryable: err.retryable,
      userMessage: err.userMessage,
    },
  })),
}));

vi.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock('@/db/schema', () => ({
  songs: {},
}));

vi.mock('@/lib/r2', () => ({
  getAudioPresignedUrl: mockGetAudioPresignedUrl,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks
// ─────────────────────────────────────────────────────────────────────────────

import { GET } from './route';
import { fetchAudioBuffer } from '@/lib/heartmula';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(jobId: string): Request {
  return new Request(`http://localhost/api/audio/${jobId}`);
}

function makeParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return { params: Promise.resolve({ jobId }) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild mock chains
  mockDbSelect.mockReturnValue({ from: mockDbSelectFrom });
  mockDbSelectFrom.mockReturnValue({ where: mockDbSelectFromWhere });
  mockDbSelectFromWhere.mockReturnValue({ limit: mockDbSelectFromWhereLimit });

  // Default: no song found (falls through to HeartBula proxy)
  mockDbSelectFromWhereLimit.mockResolvedValue([]);

  // Default: HeartBula fetch returns an audio buffer
  (fetchAudioBuffer as Mock).mockResolvedValue(Buffer.from('fake-audio-data'));

  // Default: presigned URL
  mockGetAudioPresignedUrl.mockResolvedValue('https://r2.example.com/songs/song-id/audio.mp3?signed=abc');
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/audio/[jobId]', () => {
  describe('R2 presigned URL (song finalized)', () => {
    it('redirects to presigned URL when song has r2Mp3Key', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ r2Mp3Key: 'songs/song-uuid/audio.mp3' }]);

      const req = makeRequest('job-finalized');
      const { params } = makeParams('job-finalized');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      // NextResponse.redirect returns 307 (temporary redirect)
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('r2.example.com');
    });

    it('calls getAudioPresignedUrl with the r2Mp3Key when song is finalized', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ r2Mp3Key: 'songs/song-uuid/audio.mp3' }]);

      const req = makeRequest('job-finalized');
      const { params } = makeParams('job-finalized');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockGetAudioPresignedUrl).toHaveBeenCalledWith('songs/song-uuid/audio.mp3', 3600);
    });

    it('does NOT call fetchAudioBuffer when song has r2Mp3Key', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ r2Mp3Key: 'songs/song-uuid/audio.mp3' }]);

      const req = makeRequest('job-finalized');
      const { params } = makeParams('job-finalized');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(fetchAudioBuffer).not.toHaveBeenCalled();
    });
  });

  describe('HeartBula fallback (song not yet finalized)', () => {
    it('calls fetchAudioBuffer when no song found in DB', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([]);

      const req = makeRequest('job-pending');
      const { params } = makeParams('job-pending');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(fetchAudioBuffer).toHaveBeenCalledWith('job-pending');
    });

    it('returns audio/mpeg response from HeartBula when no r2Mp3Key', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
      (fetchAudioBuffer as Mock).mockResolvedValue(Buffer.from('audio-bytes'));

      const req = makeRequest('job-pending');
      const { params } = makeParams('job-pending');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('audio/mpeg');
    });

    it('calls fetchAudioBuffer when song exists but has no r2Mp3Key', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ r2Mp3Key: null }]);

      const req = makeRequest('job-no-mp3');
      const { params } = makeParams('job-no-mp3');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(fetchAudioBuffer).toHaveBeenCalledWith('job-no-mp3');
    });
  });

  describe('error handling', () => {
    it('returns 502 when fetchAudioBuffer throws (HeartBula fallback path)', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
      (fetchAudioBuffer as Mock).mockRejectedValue(new Error('HeartBula audio fetch failed'));

      const req = makeRequest('job-error');
      const { params } = makeParams('job-error');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(502);
    });
  });
});
