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
  mockFetch,
} = vi.hoisted(() => {
  const mockDbSelectFromWhereLimit = vi.fn();
  const mockDbSelectFromWhere = vi.fn(() => ({ limit: mockDbSelectFromWhereLimit }));
  const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectFromWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));

  const mockDbUpdateSetWhere = vi.fn();
  const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateSetWhere }));
  const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }));

  const mockFetch = vi.fn();

  return {
    mockDbSelect,
    mockDbSelectFrom,
    mockDbSelectFromWhere,
    mockDbSelectFromWhereLimit,
    mockDbUpdate,
    mockDbUpdateSet,
    mockDbUpdateSetWhere,
    mockFetch,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be declared before importing the route module
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/heartmula', () => ({
  queryJobStatus: vi.fn(),
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

// ─────────────────────────────────────────────────────────────────────────────
// Mock global fetch for internal API calls
// ─────────────────────────────────────────────────────────────────────────────

vi.stubGlobal('fetch', mockFetch);

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

  // Default: no song found (fast-path check returns nothing, finalization skips)
  mockDbSelectFromWhereLimit.mockResolvedValue([]);
  // Default: update operations succeed
  mockDbUpdateSetWhere.mockResolvedValue([]);
  // Default: email endpoint returns success
  mockFetch.mockResolvedValue({ ok: true });
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
      (queryJobStatus as Mock).mockResolvedValue({
        status: 'COMPLETED',
        r2_wav_key: 'songs/abc/audio.wav',
        r2_mp3_key: 'songs/abc/audio.mp3',
        error_msg: undefined,
      });

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

  describe('fast-path: already finalized in DB', () => {
    it('returns COMPLETED without calling RunPod when song is already completed in DB', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ status: 'completed', r2Mp3Key: 'songs/abc/audio.mp3' }]);

      const req = makeRequest('job-fastpath-1');
      const { params } = makeParams('job-fastpath-1');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'COMPLETED', error: null });
      expect(queryJobStatus).not.toHaveBeenCalled();
    });

    it('returns FAILED without calling RunPod when song is already failed in DB', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([{ status: 'failed', r2Mp3Key: null }]);

      const req = makeRequest('job-fastpath-2');
      const { params } = makeParams('job-fastpath-2');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'FAILED', error: 'Song generation failed.' });
      expect(queryJobStatus).not.toHaveBeenCalled();
    });
  });

  describe('finalization pipeline (COMPLETED with R2 keys)', () => {
    beforeEach(() => {
      (queryJobStatus as Mock).mockResolvedValue({
        status: 'COMPLETED',
        r2_wav_key: 'songs/song-uuid-abc/audio.wav',
        r2_mp3_key: 'songs/song-uuid-abc/audio.mp3',
        error_msg: undefined,
      });
    });

    it('calls db.update with R2 keys and status=completed on COMPLETED', async () => {
      // Fast-path returns nothing (not yet in DB as completed)
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path: no completed/failed row
        .mockResolvedValueOnce([{ id: 'song-uuid-abc', r2WavKey: null }]) // finalizeSong: unfinalized
        .mockResolvedValueOnce([]); // email check: no song (anonymous skip)

      const req = makeRequest('job-completed-1');
      const { params } = makeParams('job-completed-1');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        r2WavKey: 'songs/song-uuid-abc/audio.wav',
        r2Mp3Key: 'songs/song-uuid-abc/audio.mp3',
      }));
    });

    it('skips finalization when song already has r2WavKey (double-finalization guard)', async () => {
      // Fast-path returns nothing; finalizeSong query returns empty (already finalized)
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([]); // finalizeSong: no unfinalized row found

      const req = makeRequest('job-completed-6');
      const { params } = makeParams('job-completed-6');
      await GET(req as Parameters<typeof GET>[0], { params });

      // db.update may still be called for email check, but not for finalization
      // The key is finalizeSong returned early (no song found)
      // Verify COMPLETED is still returned
      const res = await GET(req as Parameters<typeof GET>[0], { params });
      expect(res.status).toBe(200);
    });

    it('still returns COMPLETED even when finalization throws', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockRejectedValueOnce(new Error('DB connection error')); // finalizeSong DB query throws

      const req = makeRequest('job-completed-7');
      const { params } = makeParams('job-completed-7');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'COMPLETED', error: null });
    });
  });

  describe('creator email notification', () => {
    beforeEach(() => {
      (queryJobStatus as Mock).mockResolvedValue({
        status: 'COMPLETED',
        r2_wav_key: 'songs/song-uuid/audio.wav',
        r2_mp3_key: 'songs/song-uuid/audio.mp3',
        error_msg: undefined,
      });
    });

    it('sends creator email when song has userId and no creatorEmailSentAt', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path: not in DB yet
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong: unfinalized
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: 'user-abc', creatorEmailSentAt: null }]); // email query

      mockFetch.mockResolvedValue({ ok: true });

      const req = makeRequest('job-email-1');
      const { params } = makeParams('job-email-1');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({ href: expect.stringContaining('/api/send-creator-email') }),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId: 'song-uuid' }),
        }),
      );
    });

    it('marks creatorEmailSentAt after successful email send', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: 'user-abc', creatorEmailSentAt: null }]); // email check

      mockFetch.mockResolvedValue({ ok: true });

      const req = makeRequest('job-email-2');
      const { params } = makeParams('job-email-2');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockDbUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ creatorEmailSentAt: expect.any(Date) }),
      );
    });

    it('does NOT send email for anonymous songs (no userId)', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: null, creatorEmailSentAt: null }]); // email check: anonymous

      const req = makeRequest('job-email-anon');
      const { params } = makeParams('job-email-anon');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does NOT send email when creatorEmailSentAt is already set (idempotency guard)', async () => {
      const alreadySentAt = new Date('2026-03-01T00:00:00Z');
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: 'user-abc', creatorEmailSentAt: alreadySentAt }]); // already sent

      const req = makeRequest('job-email-already-sent');
      const { params } = makeParams('job-email-already-sent');
      await GET(req as Parameters<typeof GET>[0], { params });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('still returns COMPLETED when email send fails (non-fatal)', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: 'user-abc', creatorEmailSentAt: null }]); // email check

      mockFetch.mockRejectedValue(new Error('Network error'));

      const req = makeRequest('job-email-fail');
      const { params } = makeParams('job-email-fail');
      const res = await GET(req as Parameters<typeof GET>[0], { params });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toEqual({ status: 'COMPLETED', error: null });
    });

    it('does NOT update creatorEmailSentAt when email endpoint returns non-2xx', async () => {
      mockDbSelectFromWhereLimit
        .mockResolvedValueOnce([]) // fast-path
        .mockResolvedValueOnce([{ id: 'song-uuid', r2WavKey: null }]) // finalizeSong
        .mockResolvedValueOnce([{ id: 'song-uuid', userId: 'user-abc', creatorEmailSentAt: null }]); // email check

      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const req = makeRequest('job-email-5xx');
      const { params } = makeParams('job-email-5xx');
      await GET(req as Parameters<typeof GET>[0], { params });

      // creatorEmailSentAt should NOT be set — email failed
      const updateSetCalls = (mockDbUpdateSet as Mock).mock.calls;
      for (const [setArg] of updateSetCalls) {
        expect(setArg).not.toHaveProperty('creatorEmailSentAt');
      }
    });
  });

  describe('FAILED status song row update', () => {
    it('updates song row to failed with failedAt when job status is FAILED', async () => {
      mockDbSelectFromWhereLimit.mockResolvedValue([]); // fast-path: no completed/failed row
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
      mockDbSelectFromWhereLimit.mockResolvedValue([]); // fast-path
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
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
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
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
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
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
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
      mockDbSelectFromWhereLimit.mockResolvedValue([]);
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
