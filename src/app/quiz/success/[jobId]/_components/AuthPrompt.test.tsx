import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthPrompt } from './AuthPrompt';

// Use vi.hoisted() per project decision from Phase 29-02 to avoid TDZ errors
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('AuthPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-up and log-in links when user is anonymous (getUser returns null)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<AuthPrompt jobId="test-job-123" />);

    await waitFor(() => {
      expect(screen.getByText('Save your song')).toBeInTheDocument();
    });
    expect(screen.getByText('Sign up free')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('renders nothing when user is authenticated (getUser returns a user object)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'test@example.com' } } });

    const { container } = render(<AuthPrompt jobId="test-job-123" />);

    await waitFor(() => {
      // Give auth check time to resolve
      expect(mockGetUser).toHaveBeenCalled();
    });

    // Component should render nothing when authenticated
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Save your song')).not.toBeInTheDocument();
  });

  it('renders nothing while auth check is pending (initial state)', () => {
    // Return a promise that never resolves during this test
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { container } = render(<AuthPrompt jobId="test-job-123" />);

    // Should render nothing while auth check is pending
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Save your song')).not.toBeInTheDocument();
  });

  it('sign-up link includes return URL with jobId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<AuthPrompt jobId="test-job-abc" />);

    await waitFor(() => {
      expect(screen.getByText('Sign up free')).toBeInTheDocument();
    });

    const signupLink = screen.getByText('Sign up free').closest('a');
    // The returnUrl is URL-encoded in the href (%2F = /)
    expect(signupLink).toHaveAttribute(
      'href',
      expect.stringContaining('test-job-abc'),
    );
  });
});
