import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be declared before importing the route module
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/heartmula', () => ({
  submitGenerationJob: vi.fn(),
}));

vi.mock('@/lib/quiz-prompt', () => ({
  quizToPrompt: vi.fn(),
}));

vi.mock('@/lib/errors', () => ({
  classifyError: vi.fn((e: unknown) => ({
    category: 'unknown',
    retryable: true,
    userMessage: 'Something went wrong. Please try again.',
    technicalMessage: String(e),
  })),
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

import { POST } from './route';
import { submitGenerationJob } from '@/lib/heartmula';
import { quizToPrompt } from '@/lib/quiz-prompt';
import type { QuizData } from '@/lib/quiz-types';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const COMPLETE_QUIZ: QuizData = {
  relationshipType: 'Mom',
  recipientName: 'Sarah',
  genre: 'Pop',
  voicePreference: 'Female',
  qualities: 'caring, patient, always there for me',
  memories: 'Sunday morning pancakes',
  message: 'Thank you for everything',
  language: 'English',
  email: 'test@example.com',
};

const MOCK_SUBMIT_PARAMS = {
  prompt: 'A Pop song — warm, nurturing. Written as a personal gift.',
  lyrics: '[Verse]\ncaring, patient\n\n[Chorus]\nThank you\n\n[Outro]\nFor Sarah',
  duration_ms: 90_000,
  tags: 'pop, female vocals',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/quiz-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeMalformedRequest(): Request {
  return new Request('http://localhost/api/quiz-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not valid json {{{{',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  (quizToPrompt as Mock).mockReturnValue(MOCK_SUBMIT_PARAMS);
  (submitGenerationJob as Mock).mockResolvedValue({ job_id: 'job-abc-123', status: 'QUEUED' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/quiz-generate', () => {
  // Happy path
  describe('happy path', () => {
    it('returns 201 with jobId for a complete quiz submission', async () => {
      const req = makeRequest(COMPLETE_QUIZ);
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(201);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('jobId', 'job-abc-123');
    });

    it('calls submitGenerationJob exactly once', async () => {
      const req = makeRequest(COMPLETE_QUIZ);
      await POST(req as Parameters<typeof POST>[0]);

      expect(submitGenerationJob).toHaveBeenCalledTimes(1);
    });

    it('calls quizToPrompt with the submitted quiz data', async () => {
      const req = makeRequest(COMPLETE_QUIZ);
      await POST(req as Parameters<typeof POST>[0]);

      expect(quizToPrompt).toHaveBeenCalledWith(expect.objectContaining({
        recipientName: 'Sarah',
        genre: 'Pop',
      }));
    });

    it('passes quizToPrompt result directly to submitGenerationJob', async () => {
      const req = makeRequest(COMPLETE_QUIZ);
      await POST(req as Parameters<typeof POST>[0]);

      expect(submitGenerationJob).toHaveBeenCalledWith(MOCK_SUBMIT_PARAMS);
    });
  });

  // Validation failures
  describe('validation', () => {
    it('returns 400 when recipientName is missing', async () => {
      const req = makeRequest({ ...COMPLETE_QUIZ, recipientName: '' });
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('error');
    });

    it('returns 400 when recipientName is not provided', async () => {
      const { recipientName: _rn, ...withoutName } = COMPLETE_QUIZ;
      const req = makeRequest(withoutName);
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
    });

    it('returns 400 when genre is missing', async () => {
      const req = makeRequest({ ...COMPLETE_QUIZ, genre: '' });
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('error');
    });

    it('returns 400 when genre is not provided', async () => {
      const { genre: _g, ...withoutGenre } = COMPLETE_QUIZ;
      const req = makeRequest(withoutGenre);
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
    });

    it('includes "Incomplete quiz data" in the 400 error message', async () => {
      const req = makeRequest({ ...COMPLETE_QUIZ, recipientName: '' });
      const res = await POST(req as Parameters<typeof POST>[0]);

      const body = await res.json() as Record<string, unknown>;
      expect((body.error as { userMessage: string }).userMessage).toContain('Incomplete quiz data');
    });
  });

  // Malformed JSON
  describe('malformed JSON', () => {
    it('returns 400 for invalid JSON body', async () => {
      const req = makeMalformedRequest();
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(400);
    });

    it('returns "Invalid JSON" error message for malformed body', async () => {
      const req = makeMalformedRequest();
      const res = await POST(req as Parameters<typeof POST>[0]);

      const body = await res.json() as Record<string, unknown>;
      expect((body.error as { userMessage: string }).userMessage).toContain('Invalid JSON');
    });
  });

  // Error handling
  describe('error handling', () => {
    it('returns 502 when submitGenerationJob throws', async () => {
      (submitGenerationJob as Mock).mockRejectedValue(
        new Error('HeartMuLa submit failed: HTTP 500 Internal Server Error'),
      );

      const req = makeRequest(COMPLETE_QUIZ);
      const res = await POST(req as Parameters<typeof POST>[0]);

      expect(res.status).toBe(502);
    });

    it('includes classified error in 502 response', async () => {
      (submitGenerationJob as Mock).mockRejectedValue(
        new Error('HeartMuLa submit failed'),
      );

      const req = makeRequest(COMPLETE_QUIZ);
      const res = await POST(req as Parameters<typeof POST>[0]);

      const body = await res.json() as Record<string, unknown>;
      expect(body).toHaveProperty('error');
    });

    it('does NOT call submitGenerationJob when validation fails', async () => {
      const req = makeRequest({ ...COMPLETE_QUIZ, recipientName: '' });
      await POST(req as Parameters<typeof POST>[0]);

      expect(submitGenerationJob).not.toHaveBeenCalled();
    });
  });
});
