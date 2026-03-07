import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Hoisted mock variables
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockSignUp,
  mockGetUser,
  mockCreateClient,
  mockCookiesGet,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateSetWhere,
} = vi.hoisted(() => {
  const mockSignUp = vi.fn();
  const mockGetUser = vi.fn();
  const mockCreateClient = vi.fn(() => Promise.resolve({
    auth: {
      signUp: mockSignUp,
      getUser: mockGetUser,
    },
  }));

  const mockCookiesGet = vi.fn(() => undefined);

  const mockDbUpdateSetWhere = vi.fn();
  const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateSetWhere }));
  const mockDbUpdate = vi.fn(() => ({ set: mockDbUpdateSet }));

  return {
    mockSignUp,
    mockGetUser,
    mockCreateClient,
    mockCookiesGet,
    mockDbUpdate,
    mockDbUpdateSet,
    mockDbUpdateSetWhere,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: mockCookiesGet,
  })),
}));

vi.mock('@/db', () => ({
  db: {
    update: mockDbUpdate,
  },
}));

vi.mock('@/db/schema', () => ({
  songs: {},
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Next.js redirect throws a special error internally — mock as vi.fn() that throws
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks
// ─────────────────────────────────────────────────────────────────────────────

import { signup } from './actions';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeFormData(email = 'user@example.com', password = 'password123', next = '/dashboard'): FormData {
  const fd = new FormData();
  fd.set('email', email);
  fd.set('password', password);
  fd.set('next', next);
  return fd;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild mock chains after clearAllMocks
  mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet });
  mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateSetWhere });
  mockDbUpdateSetWhere.mockResolvedValue([]);

  // Default: successful signup
  mockSignUp.mockResolvedValue({ error: null });
  // Default: user returned after sign up
  mockGetUser.mockResolvedValue({ data: { user: { id: 'new-user-id-abc' } } });
  // Default: no session cookie
  mockCookiesGet.mockReturnValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('signup action', () => {
  describe('success path', () => {
    it('redirects after successful signup', async () => {
      const fd = makeFormData();

      await expect(signup(fd)).rejects.toThrow('NEXT_REDIRECT');
    });

    it('redirects to /dashboard by default', async () => {
      const { redirect } = await import('next/navigation');
      const fd = makeFormData('user@example.com', 'password123');
      // Remove 'next' field to test default
      fd.delete('next');

      try {
        await signup(fd);
      } catch {
        // redirect throws
      }

      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('anonymous song claim', () => {
    it('claims songs by session_token after successful signup when cookie exists', async () => {
      mockCookiesGet.mockReturnValue({ value: 'anon-session-token-xyz' });

      try {
        await signup(makeFormData());
      } catch {
        // redirect throws
      }

      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbUpdateSet).toHaveBeenCalledWith({ userId: 'new-user-id-abc', sessionToken: null });
    });

    it('sets userId on claimed songs and clears sessionToken to null', async () => {
      mockCookiesGet.mockReturnValue({ value: 'anon-session-token-xyz' });

      try {
        await signup(makeFormData());
      } catch {
        // redirect throws
      }

      expect(mockDbUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'new-user-id-abc', sessionToken: null }),
      );
    });

    it('does NOT call db.update when no session cookie', async () => {
      mockCookiesGet.mockReturnValue(undefined);

      try {
        await signup(makeFormData());
      } catch {
        // redirect throws
      }

      expect(mockDbUpdate).not.toHaveBeenCalled();
    });

    it('still redirects even if claim DB update throws', async () => {
      mockCookiesGet.mockReturnValue({ value: 'session-token-abc' });
      mockDbUpdateSetWhere.mockRejectedValue(new Error('DB claim failed'));

      await expect(signup(makeFormData())).rejects.toThrow('NEXT_REDIRECT');
    });
  });

  describe('error cases', () => {
    it('returns error when email is already registered', async () => {
      mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } });

      const result = await signup(makeFormData());

      expect(result).toEqual({ error: expect.stringContaining('already taken') });
    });

    it('returns error for other signup errors', async () => {
      mockSignUp.mockResolvedValue({ error: { message: 'Invalid email format' } });

      const result = await signup(makeFormData('bad-email', 'pass'));

      expect(result).toEqual({ error: 'Invalid email format' });
    });

    it('does NOT claim songs when signup fails', async () => {
      mockSignUp.mockResolvedValue({ error: { message: 'User already registered' } });
      mockCookiesGet.mockReturnValue({ value: 'session-token' });

      await signup(makeFormData());

      expect(mockDbUpdate).not.toHaveBeenCalled();
    });
  });
});
