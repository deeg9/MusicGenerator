// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorCategory =
  | 'model_error'
  | 'timeout'
  | 'gpu_unavailable'
  | 'invalid_input'
  | 'rate_limited'
  | 'unknown';

export interface GenerationError {
  category: ErrorCategory;
  retryable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export interface ErrorResponse {
  error: {
    category: ErrorCategory;
    retryable: boolean;
    userMessage: string;
  };
  debug: {
    technicalMessage: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification helpers
// ─────────────────────────────────────────────────────────────────────────────

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('aborted') ||
      error.message.toLowerCase().includes('timeout')
    );
  }
  return false;
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('fetch failed') ||
      error.message.toLowerCase().includes('econnrefused') ||
      error.message.toLowerCase().includes('enotfound') ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('etimedout') ||
      error.message.toLowerCase().includes('socket')
    );
  }
  return false;
}

function isModelError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('ace-step') ||
      msg.includes('model') ||
      msg.includes('cuda') ||
      msg.includes('out of memory') ||
      msg.includes('status=2') ||
      msg.includes('generation failed')
    );
  }
  return false;
}

function isInvalidInputError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('invalid input') ||
      msg.includes('validation') ||
      msg.includes('invalid prompt') ||
      msg.includes('too long') ||
      msg.includes('exceeds') ||
      msg.includes('unsupported')
    );
  }
  return false;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('429')
    );
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main classification function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a raw error into a typed GenerationError with dual-layer response:
 * - technical layer: for logging and debugging
 * - user-facing layer: for display in the UI
 *
 * Error decision (per CONTEXT.md): NO auto-retry server-side.
 * Errors are returned immediately for the user to decide whether to retry.
 */
export function classifyError(rawError: unknown): GenerationError {
  const technicalMessage = rawError instanceof Error ? rawError.message : String(rawError);

  if (isAbortError(rawError)) {
    return {
      category: 'timeout',
      retryable: true,
      userMessage: 'Generation timed out. The GPU may be busy — please try again.',
      technicalMessage,
    };
  }

  if (isNetworkError(rawError)) {
    return {
      category: 'gpu_unavailable',
      retryable: true,
      userMessage:
        'The generation server is temporarily unavailable. Please try again in a moment.',
      technicalMessage,
    };
  }

  if (isRateLimitError(rawError)) {
    return {
      category: 'rate_limited',
      retryable: true,
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      technicalMessage,
    };
  }

  if (isInvalidInputError(rawError)) {
    return {
      category: 'invalid_input',
      retryable: false,
      userMessage:
        rawError instanceof Error && rawError.message.includes('invalid_input')
          ? rawError.message
          : 'Your request contains invalid input. Please check your prompt and lyrics and try again.',
      technicalMessage,
    };
  }

  if (isModelError(rawError)) {
    return {
      category: 'model_error',
      retryable: true,
      userMessage:
        'The AI model encountered an error generating your song. Please try again.',
      technicalMessage,
    };
  }

  return {
    category: 'unknown',
    retryable: true,
    userMessage: 'Something went wrong. Please try again.',
    technicalMessage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Response formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a GenerationError to a JSON-safe object with dual layers:
 * - error: user-facing data (safe to send to the client)
 * - debug: technical data (log server-side, optionally include in dev mode)
 */
export function toErrorResponse(error: GenerationError): ErrorResponse {
  return {
    error: {
      category: error.category,
      retryable: error.retryable,
      userMessage: error.userMessage,
    },
    debug: {
      technicalMessage: error.technicalMessage,
    },
  };
}
