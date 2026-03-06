import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

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
