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
  mockEmailsSend,
  mockGetAudioPresignedUrl,
  mockGetUserById,
  mockCreateClient,
} = vi.hoisted(() => {
  const mockDbSelectFromWhereLimit = vi.fn();
  const mockDbSelectFromWhere = vi.fn(() => ({ limit: mockDbSelectFromWhereLimit }));
  const mockDbSelectFrom = vi.fn(() => ({ where: mockDbSelectFromWhere }));
  const mockDbSelect = vi.fn(() => ({ from: mockDbSelectFrom }));

  const mockEmailsSend = vi.fn();

  const mockGetAudioPresignedUrl = vi.fn();

  const mockGetUserById = vi.fn();
  const mockCreateClient = vi.fn(() => ({
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  }));

  return {
    mockDbSelect,
    mockDbSelectFrom,
    mockDbSelectFromWhere,
    mockDbSelectFromWhereLimit,
    mockEmailsSend,
    mockGetAudioPresignedUrl,
    mockGetUserById,
    mockCreateClient,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — must be declared before importing the route module
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock('@/db/schema', () => ({
  songs: {},
}));

vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: mockEmailsSend,
    },
  },
}));

vi.mock('@/lib/r2', () => ({
  getAudioPresignedUrl: mockGetAudioPresignedUrl,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/emails/GiftDeliveryEmail', () => ({
  GiftDeliveryEmail: vi.fn(() => null),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks are declared
// ─────────────────────────────────────────────────────────────────────────────

import { POST } from './route';
import { GiftDeliveryEmail } from '@/emails/GiftDeliveryEmail';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SONG_AUTHENTICATED = {
  id: 'song-uuid-1234',
  userId: 'user-uuid-5678',
  sessionToken: null,
  status: 'completed' as const,
  recipientName: 'Alex',
  relationship: 'friend',
  genre: 'Pop',
  r2Mp3Key: 'songs/song-uuid-1234/audio.mp3',
  r2WavKey: 'songs/song-uuid-1234/audio.wav',
  quizData: { message: 'Happy birthday! I hope this makes you smile.' },
};

const MOCK_SONG_ANONYMOUS = {
  ...MOCK_SONG_AUTHENTICATED,
  userId: null,
  sessionToken: 'anon-session-token-abc',
};

const MOCK_USER = {
  id: 'user-uuid-5678',
  email: 'creator@example.com',
  user_metadata: { full_name: 'Jordan Smith' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/send-recipient-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Rebuild DB select chain
  mockDbSelect.mockReturnValue({ from: mockDbSelectFrom });
  mockDbSelectFrom.mockReturnValue({ where: mockDbSelectFromWhere });
  mockDbSelectFromWhere.mockReturnValue({ limit: mockDbSelectFromWhereLimit });

  // Default: authenticated song found
  mockDbSelectFromWhereLimit.mockResolvedValue([MOCK_SONG_AUTHENTICATED]);

  // Default: user found
  mockGetUserById.mockResolvedValue({ data: { user: MOCK_USER } });

  // Default: presigned URL resolves
  mockGetAudioPresignedUrl.mockResolvedValue('https://r2.example.com/presigned-url');

  // Default: resend succeeds
  mockEmailsSend.mockResolvedValue({ data: { id: 'resend-email-id-xyz' }, error: null });

  // Rebuild createClient mock
  mockCreateClient.mockReturnValue({
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/send-recipient-email', () => {
  // Test 1: returns 400 if songId or recipientEmail is missing
  it('returns 400 if songId is missing from request body', async () => {
    const req = makeRequest({ recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  it('returns 400 if recipientEmail is missing from request body', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  it('returns 400 if both songId and recipientEmail are missing', async () => {
    const req = makeRequest({});
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
  });

  // Test 2: returns 404 if song does not exist
  it('returns 404 if song does not exist in database', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([]);

    const req = makeRequest({ songId: 'nonexistent-song-id', recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 3: returns 400 if song has no r2Mp3Key (not finalized)
  it('returns 400 if song has no r2Mp3Key (not finalized yet)', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([{ ...MOCK_SONG_AUTHENTICATED, r2Mp3Key: null }]);

    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 4: on success — calls resend.emails.send with correct args including message and relationship
  it('calls resend.emails.send with correct from, to, subject, react props on success', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.from).toBe('Notevra <hello@notevra.com>');
    expect(callArgs.to).toEqual(['recipient@example.com']);
    expect(typeof callArgs.subject).toBe('string');
    expect('react' in callArgs).toBe(true);
  });

  it('calls GiftDeliveryEmail with message and relationship from song', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(GiftDeliveryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientName: MOCK_SONG_AUTHENTICATED.recipientName,
        relationship: MOCK_SONG_AUTHENTICATED.relationship,
        message: (MOCK_SONG_AUTHENTICATED.quizData as { message?: string }).message,
        genre: MOCK_SONG_AUTHENTICATED.genre,
      }),
    );
  });

  // Test 5: on success — presigned URL uses 604800 second expiry (7-day max)
  it('presigned URL uses 604800 second expiry (7-day maximum)', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockGetAudioPresignedUrl).toHaveBeenCalledWith(
      MOCK_SONG_AUTHENTICATED.r2Mp3Key,
      604800,
    );
  });

  // Test 6: on success — returns 200 with { id } from Resend
  it('returns 200 with { id } from Resend response on success', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ id: 'resend-email-id-xyz' });
  });

  // Test 7: returns 500 if Resend returns an error
  it('returns 500 if Resend returns an error', async () => {
    mockEmailsSend.mockResolvedValue({ data: null, error: { message: 'Resend API error' } });

    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 8: handles missing quizData.message gracefully (empty string fallback)
  it('handles missing quizData.message gracefully with empty string fallback', async () => {
    const songWithoutMessage = { ...MOCK_SONG_AUTHENTICATED, quizData: { occasion: 'Birthday' } };
    mockDbSelectFromWhereLimit.mockResolvedValue([songWithoutMessage]);

    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    // Should succeed — no crash on missing message
    expect(res.status).toBe(200);

    expect(GiftDeliveryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '',
      }),
    );
  });

  // Anonymous song: uses "Someone" as creatorFirstName
  it('uses "Someone" as creatorFirstName for anonymous songs', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([MOCK_SONG_ANONYMOUS]);

    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(GiftDeliveryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorFirstName: 'Someone',
      }),
    );
  });

  // Authenticated song: extracts first name from user_metadata.full_name
  it('extracts creatorFirstName from user_metadata.full_name for authenticated songs', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(GiftDeliveryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorFirstName: 'Jordan',
      }),
    );
  });

  // Subject line includes creator first name
  it('sets email subject to "{creatorFirstName} made something just for you"', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234', recipientEmail: 'recipient@example.com' });
    await POST(req as Parameters<typeof POST>[0]);

    const callArgs = mockEmailsSend.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.subject).toBe('Jordan made something just for you');
  });
});
