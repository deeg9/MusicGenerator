import { describe, it, expect, afterEach, vi } from 'vitest';
import { classifyError, toErrorResponse } from './errors';

// ─────────────────────────────────────────────────────────────────────────────
// toErrorResponse — production stripping
// ─────────────────────────────────────────────────────────────────────────────

describe('toErrorResponse', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns full technicalMessage in development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const error = {
      category: 'unknown' as const,
      retryable: true,
      userMessage: 'Something went wrong.',
      technicalMessage: 'Internal stack trace details',
    };

    const response = toErrorResponse(error);

    expect(response.debug.technicalMessage).toBe('Internal stack trace details');
    expect(response.error.category).toBe('unknown');
    expect(response.error.retryable).toBe(true);
    expect(response.error.userMessage).toBe('Something went wrong.');
  });

  it('returns [redacted] for technicalMessage when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const error = {
      category: 'model_error' as const,
      retryable: true,
      userMessage: 'The AI model encountered an error.',
      technicalMessage: 'CUDA out of memory at layer 42',
    };

    const response = toErrorResponse(error);

    expect(response.debug.technicalMessage).toBe('[redacted]');
    // user-facing fields still present
    expect(response.error.category).toBe('model_error');
    expect(response.error.retryable).toBe(true);
    expect(response.error.userMessage).toBe('The AI model encountered an error.');
  });

  it('returns full technicalMessage when NODE_ENV is test', () => {
    vi.stubEnv('NODE_ENV', 'test');

    const error = {
      category: 'timeout' as const,
      retryable: true,
      userMessage: 'Timed out.',
      technicalMessage: 'AbortError: signal timed out',
    };

    const response = toErrorResponse(error);

    expect(response.debug.technicalMessage).toBe('AbortError: signal timed out');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// classifyError — category classification
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyError', () => {
  it('classifies AbortError as timeout', () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';

    const result = classifyError(error);

    expect(result.category).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('classifies timeout keyword error as timeout', () => {
    const error = new Error('Request timed out after 30000ms');

    const result = classifyError(error);

    expect(result.category).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('classifies ECONNREFUSED error as gpu_unavailable', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:8080');

    const result = classifyError(error);

    expect(result.category).toBe('gpu_unavailable');
    expect(result.retryable).toBe(true);
  });

  it('classifies fetch failed error as gpu_unavailable', () => {
    const error = new Error('fetch failed');

    const result = classifyError(error);

    expect(result.category).toBe('gpu_unavailable');
    expect(result.retryable).toBe(true);
  });

  it('classifies heartmula error as model_error', () => {
    const error = new Error('HeartMuLa generation failed: status=2');

    const result = classifyError(error);

    expect(result.category).toBe('model_error');
    expect(result.retryable).toBe(true);
  });

  it('classifies rate limit error as rate_limited', () => {
    const error = new Error('429 Too Many Requests — rate limit exceeded');

    const result = classifyError(error);

    expect(result.category).toBe('rate_limited');
    expect(result.retryable).toBe(true);
  });

  it('classifies unknown error as unknown', () => {
    const error = new Error('Something unexpected happened');

    const result = classifyError(error);

    expect(result.category).toBe('unknown');
    expect(result.retryable).toBe(true);
  });

  it('sets retryable: false only for invalid_input', () => {
    const error = new Error('invalid input: validation failed');

    const result = classifyError(error);

    expect(result.category).toBe('invalid_input');
    expect(result.retryable).toBe(false);
  });

  it('all non-invalid_input categories are retryable', () => {
    const errors = [
      new Error('AbortError: aborted'),
      new Error('fetch failed: ECONNREFUSED'),
      new Error('HeartMuLa model error'),
      new Error('rate limit 429'),
      new Error('completely unknown'),
    ];

    for (const error of errors) {
      const result = classifyError(error);
      expect(result.retryable).toBe(true);
    }
  });

  it('handles non-Error values gracefully', () => {
    const result = classifyError('a plain string error');

    expect(result.category).toBe('unknown');
    expect(result.technicalMessage).toBe('a plain string error');
  });

  it('preserves technicalMessage from original error', () => {
    const error = new Error('specific error details here');

    const result = classifyError(error);

    expect(result.technicalMessage).toBe('specific error details here');
  });
});
