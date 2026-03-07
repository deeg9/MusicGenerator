import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock variables — all variables referenced in vi.mock factories
// must be created via vi.hoisted() to avoid initialization errors.
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockDbSelect,
  mockDbSelectFrom,
  mockDbSelectFromWhere,
  mockDbSelectFromWhereLimit,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateSetWhere,
  mockFetchAudioBuffer,
  mockConvertToMp3,
  mockUploadAudioToR2,
  mockBuildSongR2WavKey,
  mockBuildSongR2Mp3Key,
} = vi.hoisted(() => {
  const mockDbSelectFromWhereLimit = vi.fn();
  const mockDbSelectFromWhere = vi.fn(() => ({ limit: mockDbSelectFromWhereLimit }));
  const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectFromWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));

  const mockDbUpdateSetWhere = vi.fn();
  const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateSetWhere }));
  const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }));

  const mockFetchAudioBuffer = vi.fn();
  const mockConvertToMp3 = vi.fn();
  const mockUploadAudioToR2 = vi.fn();
  const mockBuildSongR2WavKey = vi.fn((id: string) => `songs/${id}/audio.wav`);
  const mockBuildSongR2Mp3Key = vi.fn((id: string) => `songs/${id}/audio.mp3`);

  return {
    mockDbSelect,
    mockDbSelectFrom,
    mockDbSelectFromWhere,
    mockDbSelectFromWhereLimit,
    mockDbUpdate,
    mockDbUpdateSet,
    mockDbUpdateSetWhere,
    mockFetchAudioBuffer,
    mockConvertToMp3,
    mockUploadAudioToR2,
    mockBuildSongR2WavKey,
    mockBuildSongR2Mp3Key,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be declared before importing the route module
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/heartmula', () => ({
  queryJobStatus: vi.fn(),
  fetchAudioBuffer: mockFetchAudioBuffer,
}));

vi.mock('@/lib/errors', () => ({
  classifyError: vi.fn((rawError: unknown) => {
    const msg = rawError instanceof Error ? rawError.message : String(rawError);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('network')) {
      return {
        category: 'gpu_unavailable',
        retryable: true,
        userMessage: 'The generation server is temporarily unavailable.',
        technicalMessage: msg,
      };
    }
    return {
      category: 'unknown',
      retryable: true,
      userMessage: 'Something went wrong.',
      technicalMessage: msg,
    };
  }),
  toErrorResponse: vi.fn((err: { category: string; retryable: boolean; userMessage: string; technicalMessage: string }) => ({
    error: {
      category: err.category,
      retryable: err.retryable,
      userMessage: err.userMessage,
    },
    debug: {
      technicalMessage: err.technicalMessage,
    },
  })),
}));

vi.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
  },
}));

vi.mock('@/db/schema', () => ({
  songs: {},
}));

vi.mock('@/lib/audio', () => ({
  convertToMp3: mockConvertToMp3,
}));

vi.mock('@/lib/r2', () => ({
  uploadAudioToR2: mockUploadAudioToR2,
  buildSongR2WavKey: mockBuildSongR2WavKey,
  buildSongR2Mp3Key: mockBuildSongR2Mp3Key,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks are declared
// ─────────────────────────────────────────────────────────────────────────────

import { GET } from './route';
import { queryJobStatus } from '@/lib/heartmula';
import { classifyError, toErrorResponse } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(jobId: string): Request {
  return new Request(`http://localhost/api/poll-job/${jobId}`);
}

function makeParams(jobId: string): { params: Promise<{ jobId: string }> } {
  return { params: Promise.resolve({ jobId }) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild mock chains after clearAllMocks
  mockDbSelect.mockReturnValue({ from: mockDbSelectFrom });
  mockDbSelectFrom.mockReturnValue({ where: mockDbSelectFromWhere });
  mockDbSelectFromWhere.mockReturnValue({ limit: mockDbSelectFromWhereLimit });
  mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet });
  mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateSetWhere });

  // Default: no song found for finalization (already finalized or not found)
  mockDbSelectFromWhereLimit.mockResolvedValue([]);
  // Default: update operations succeed
  mockDbUpdateSetWhere.mockResolvedValue([]);

  // Default: audio buffer and conversion succeed
  mockFetchAudioBuffer.mockResolvedValue(Buffer.from('fake-wav-data'));
  mockConvertToMp3.mockResolvedValue(Buffer.from('fake-mp3-data'));
  mockUploadAudioToR2.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/poll-job/[jobId]', () => {
  describe('happy path', () => {
    it('returns 200 with status and null error for QUEUED job', async () => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'QUEUED', error_msg: undefined });

      const req = makeRequest('job-123');
      const { params } = makeParams('job-123');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'QUEUED', error: null });
    });

    it('returns 200 with COMPLETED status', async () => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'COMPLETED', error_msg: undefined });

      const req = makeRequest('job-456');
      const { params } = makeParams('job-456');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'COMPLETED', error: null });
    });

    it('returns 200 with FAILED status and error message', async () => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'FAILED', error_msg: 'OOM error on GPU' });

      const req = makeRequest('job-789');
      const { params } = makeParams('job-789');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'FAILED', error: 'OOM error on GPU' });
    });
  });

  describe('finalization pipeline (COMPLETED)', () => {
    beforeEach(() => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'COMPLETED', error_msg: undefined });
    });

    it('looks up song by heartbulaJobId where r2WavKey IS NULL on COMPLETED', async () => {
      // Song found (not yet finalized)
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);

      const req = makeRequest('job-completed-1');
      const { params } = makeParams('job-completed-1');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockDbSelect).toHaveBeenCalled();
    });

    it('calls fetchAudioBuffer when unfinalized song found on COMPLETED', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);

      const req = makeRequest('job-completed-2');
      const { params } = makeParams('job-completed-2');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockFetchAudioBuffer).toHaveBeenCalledWith('job-completed-2');
    });

    it('calls convertToMp3 with WAV buffer on COMPLETED', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);
      const wavBuffer = Buffer.from('wav-data');
      mockFetchAudioBuffer.mockResolvedValue(wavBuffer);

      const req = makeRequest('job-completed-3');
      const { params } = makeParams('job-completed-3');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockConvertToMp3).toHaveBeenCalledWith(wavBuffer);
    });

    it('calls uploadAudioToR2 twice (WAV and MP3) on COMPLETED', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);

      const req = makeRequest('job-completed-4');
      const { params } = makeParams('job-completed-4');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockUploadAudioToR2).toHaveBeenCalledTimes(2);
    });

    it('updates song row with R2 keys + status=completed after finalization', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);

      const req = makeRequest('job-completed-5');
      const { params } = makeParams('job-completed-5');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        r2WavKey: 'songs/song-uuid-abc/audio.wav',
        r2Mp3Key: 'songs/song-uuid-abc/audio.mp3',
      }));
    });

    it('skips finalization when song already has r2WavKey (double-finalization guard)', async () => {
      // No song returned = already finalized (query uses isNull(r2WavKey))
      mockDbSelectFromWhereLimit.mockResolvedValue([]);

      const req = makeRequest('job-completed-6');
      const { params } = makeParams('job-completed-6');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockFetchAudioBuffer).not.toHaveBeenCalled();
      expect(mockConvertToMp3).not.toHaveBeenCalled();
    });

    it('still returns COMPLETED even when finalization fails', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ id: 'song-uuid-abc', r2WavKey: null }]);
      mockFetchAudioBuffer.mockRejectedValue(new Error('Audio download failed'));

      const req = makeRequest('job-completed-7');
      const { params } = makeParams('job-completed-7');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'COMPLETED', error: null });
    });
  });

  describe('FAILED status song row update', () => {
    it('updates song row to failed with failedAt when job status is FAILED', async () => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'FAILED', error_msg: 'OOM' });

      const req = makeRequest('job-failed-1');
      const { params } = makeParams('job-failed-1');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        failedAt: expect.any(Date),
      }));
    });

    it('still returns FAILED response even if DB update throws', async () => {
      (queryJobStatus as Mock).mockResolvedValue({ status: 'FAILED', error_msg: 'OOM' });
      mockDbUpdateSetWhere.mockRejectedValue(new Error('DB update failed'));

      const req = makeRequest('job-failed-2');
      const { params } = makeParams('job-failed-2');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.status).toBe('FAILED');
    });
  });

  describe('network error (pod unreachable)', () => {
    it('returns 502 with structured error when ECONNREFUSED', async () => {
      (queryJobStatus as Mock).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:8080'),
      );

      const req = makeRequest('job-abc');
      const { params } = makeParams('job-abc');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(502);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('error');
      const error = body.error as Record<string, unknown>;
      expect(error.category).toBe('gpu_unavailable');
    });

    it('calls classifyError when queryJobStatus throws', async () => {
      (queryJobStatus as Mock).mockRejectedValue(
        new Error('connect ECONNREFUSED 192.168.1.1:7860'),
      );

      const req = makeRequest('job-abc');
      const { params } = makeParams('job-abc');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(classifyError).toHaveBeenCalledTimes(1);
      expect(toErrorResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('transient error (blip fallback)', () => {
    it('returns QUEUED fallback for unknown/transient errors', async () => {
      (queryJobStatus as Mock).mockRejectedValue(
        new Error('An unexpected transient blip occurred'),
      );

      const req = makeRequest('job-blip');
      const { params } = makeParams('job-blip');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'QUEUED', error: null });
    });

    it('does NOT return 502 for unknown transient errors', async () => {
      (queryJobStatus as Mock).mockRejectedValue(
        new Error('Generic unknown error'),
      );

      const req = makeRequest('job-blip2');
      const { params } = makeParams('job-blip2');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).not.toBe(502);
    });
  });
});
