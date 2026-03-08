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

vi.mock('@/emails/SongReadyEmail', () => ({
  SongReadyEmail: vi.fn(() => null),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — after mocks are declared
// ─────────────────────────────────────────────────────────────────────────────

import { POST } from './route';
import { SongReadyEmail } from '@/emails/SongReadyEmail';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SONG = {
  id: 'song-uuid-1234',
  userId: 'user-uuid-5678',
  sessionToken: null,
  status: 'completed' as const,
  recipientName: 'Sarah',
  relationship: 'Mom',
  genre: 'Jazz',
  r2Mp3Key: 'songs/song-uuid-1234/audio.mp3',
  r2WavKey: 'songs/song-uuid-1234/audio.wav',
  quizData: { message: 'Happy Birthday!' },
};

const MOCK_USER = {
  id: 'user-uuid-5678',
  email: 'creator@example.com',
  user_metadata: { full_name: 'Alice Smith' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/send-creator-email', {
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

  // Default: song found
  mockDbSelectFromWhereLimit.mockResolvedValue([MOCK_SONG]);

  // Default: user found
  mockGetUserById.mockResolvedValue({ data: { user: MOCK_USER } });

  // Default: presigned URLs resolve
  mockGetAudioPresignedUrl.mockResolvedValue('https://r2.example.com/presigned-url');

  // Default: resend succeeds
  mockEmailsSend.mockResolvedValue({ data: { id: 'resend-email-id-abc' }, error: null });

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

describe('POST /api/send-creator-email', () => {
  // Test 1: returns 400 if songId is missing
  it('returns 400 if songId is missing from request body', async () => {
    const req = makeRequest({});
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 2: returns 404 if song does not exist
  it('returns 404 if song does not exist in database', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([]);

    const req = makeRequest({ songId: 'nonexistent-song-id' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 3: returns 400 if song has no userId (anonymous)
  it('returns 400 if song has no userId (anonymous — no email to send to)', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([{ ...MOCK_SONG, userId: null }]);

    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 4: returns 400 if song has no r2Mp3Key (not finalized)
  it('returns 400 if song has no r2Mp3Key (not finalized yet)', async () => {
    mockDbSelectFromWhereLimit.mockResolvedValue([{ ...MOCK_SONG, r2Mp3Key: null }]);

    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Test 5: on success — calls resend.emails.send with correct args
  it('calls resend.emails.send with correct from, to, subject, react props on success', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const callArgs = mockEmailsSend.mock.calls[0][0] as Record<string, unknown>;
    expect(callArgs.from).toBe('Notevra <hello@notevra.com>');
    expect(callArgs.to).toEqual(['creator@example.com']);
    expect(callArgs.subject).toBe(`Your song for ${MOCK_SONG.recipientName} is ready`);
    // react prop is the result of calling SongReadyEmail (mocked to return null in tests)
    expect('react' in callArgs).toBe(true);
  });

  // Test 6: on success — returns 200 with { id } from Resend
  it('returns 200 with { id } from Resend response on success', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toEqual({ id: 'resend-email-id-abc' });
  });

  // Test 7: returns 500 if Resend returns an error
  it('returns 500 if Resend returns an error', async () => {
    mockEmailsSend.mockResolvedValue({ data: null, error: { message: 'Resend API error' } });

    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error');
  });

  // Additional: presigned URL uses 24h expiry for listen URL
  it('generates presigned listenUrl with 86400s (24h) expiry', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockGetAudioPresignedUrl).toHaveBeenCalledWith(
      MOCK_SONG.r2Mp3Key,
      86400,
    );
  });

  // Additional: presigned download URL includes recipient filename
  it('generates presigned downloadUrl with Content-Disposition filename', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockGetAudioPresignedUrl).toHaveBeenCalledWith(
      MOCK_SONG.r2Mp3Key,
      86400,
      `${MOCK_SONG.recipientName}-song.mp3`,
    );
  });

  // Additional: SongReadyEmail called with correct props
  it('calls SongReadyEmail with correct props', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(SongReadyEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientName: MOCK_SONG.recipientName,
        genre: MOCK_SONG.genre,
      }),
    );
  });

  // Additional: uses Supabase admin client (service role) to look up user email
  it('looks up creator email via Supabase admin client', async () => {
    const req = makeRequest({ songId: 'song-uuid-1234' });
    await POST(req as Parameters<typeof POST>[0]);

    expect(mockGetUserById).toHaveBeenCalledWith(MOCK_SONG.userId);
  });

  // Additional: returns 500 if user lookup fails
  it('returns 500 if Supabase admin user lookup fails', async () => {
    mockGetUserById.mockResolvedValue({ data: { user: null } });

    const req = makeRequest({ songId: 'song-uuid-1234' });
    const res = await POST(req as Parameters<typeof POST>[0]);

    expect(res.status).toBe(500);
  });
});
