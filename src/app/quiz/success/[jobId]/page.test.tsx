import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SuccessPage from './page';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.ComponentPropsWithoutRef<'span'>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock hooks and child components that have side effects
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

vi.mock('./_components/ConfettiBlast', () => ({
  ConfettiBlast: () => null,
}));

vi.mock('./_components/SongPlayer', () => ({
  SongPlayer: ({ src }: { src: string }) => <audio data-testid="song-player" src={src} />,
}));

vi.mock('./_components/SharePrompt', () => ({
  SharePrompt: () => <div data-testid="share-prompt" />,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeParams(jobId = 'test-job-123', name = '') {
  return {
    params: Promise.resolve({ jobId }),
    searchParams: Promise.resolve({ name }),
  };
}

/**
 * Render the SuccessPage and flush initial React effects.
 * The component uses `use(params)` — React 19 resolves pre-resolved Promises synchronously.
 */
async function renderSuccessPage(
  options: { jobId?: string; name?: string } = {},
) {
  const { jobId = 'test-job-123', name = '' } = options;
  const props = makeParams(jobId, name);

  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<SuccessPage {...props} />);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default fetch mock (keeps polling alive / never resolves to COMPLETED)
// ─────────────────────────────────────────────────────────────────────────────

function mockFetchQueued() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'QUEUED', error: null }),
    }),
  );
}

function mockFetchCompleted() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'COMPLETED', error: null }),
    }),
  );
}

function mockFetchFailed() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'FAILED', error: 'OOM error' }),
    }),
  );
}

function mockFetch502PodDown() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        error: { category: 'gpu_unavailable', retryable: true, userMessage: 'Pod down' },
        debug: { technicalMessage: 'ECONNREFUSED' },
      }),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  mockFetchQueued();
  mockPush.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SuccessPage', () => {
  // Test 1: Loading state shows initial stage message and time estimate
  it('shows initial stage message and "10 minutes" time estimate in loading state', async () => {
    await renderSuccessPage();

    expect(screen.getByText(/composing your melody/i)).toBeInTheDocument();
    expect(screen.getByText(/this usually takes around 10 minutes/i)).toBeInTheDocument();
  });

  // Test 2: Stage messages rotate every 45 seconds
  it('rotates stage messages after 45 seconds', async () => {
    await renderSuccessPage();

    // Initially shows first stage message
    expect(screen.getByText(/composing your melody/i)).toBeInTheDocument();

    // Advance past 45 seconds
    await act(async () => {
      vi.advanceTimersByTime(45_001);
    });

    expect(screen.getByText(/writing the lyrics/i)).toBeInTheDocument();
    expect(screen.queryByText(/composing your melody/i)).not.toBeInTheDocument();
  });

  // Test 3: Timeout state shows both "Check Again" and "Start Over" buttons
  it('shows "Check Again" and "Start Over" buttons when timeout occurs', async () => {
    await renderSuccessPage();

    // Advance past the 15-minute timeout
    await act(async () => {
      vi.advanceTimersByTime(900_001);
    });

    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
  });

  // Test 4: Clicking "Check Again" resets to loading state and re-enters poll loop
  it('resets to loading state when "Check Again" is clicked', async () => {
    await renderSuccessPage();

    // Trigger timeout
    await act(async () => {
      vi.advanceTimersByTime(900_001);
    });

    // Verify in timeout state
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();

    // Click Check Again
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /check again/i }));
    });

    // Should be back in loading state
    expect(screen.getByText(/creating your song/i)).toBeInTheDocument();
  });

  // Test 5: Clicking "Check Again" resets stage messages
  it('resets stage messages when "Check Again" is clicked', async () => {
    await renderSuccessPage();

    // Trigger timeout
    await act(async () => {
      vi.advanceTimersByTime(900_001);
    });

    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();

    // Click Check Again — resets to loading
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /check again/i }));
    });

    // Should show first stage message again
    expect(screen.getByText(/composing your melody/i)).toBeInTheDocument();
  });

  // Test 6: pod-down shows non-retryable message with only "Start Over"
  it('shows "Our servers are temporarily offline" with only "Start Over" when 502 pod-down', async () => {
    mockFetch502PodDown();
    await renderSuccessPage();

    // Let the first fetch execute
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/our servers are temporarily offline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument();
    // No retry button — pod-down is non-retryable
    expect(screen.queryByRole('button', { name: /check again/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  // Test 7: FAILED status shows retryable error UI with "Try Again"
  it('shows retryable error UI with "Try Again" when poll-job returns FAILED', async () => {
    mockFetchFailed();
    await renderSuccessPage();

    // Let the first fetch execute
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/something went wrong creating your song/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  // Test 8: "Start Over" navigates to /quiz
  it('navigates to /quiz when "Start Over" is clicked from timeout state', async () => {
    await renderSuccessPage();

    // Trigger timeout
    await act(async () => {
      vi.advanceTimersByTime(900_001);
    });

    fireEvent.click(screen.getByRole('button', { name: /start over/i }));

    expect(mockPush).toHaveBeenCalledWith('/quiz');
  });

  // Test 9: Copy link button is visible in loading state
  it('shows "Copy link to check back later" button in loading state', async () => {
    await renderSuccessPage();

    expect(screen.getByText(/copy link to check back later/i)).toBeInTheDocument();
  });
});
