import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — use vi.hoisted() for variables referenced inside vi.mock() factories
// ─────────────────────────────────────────────────────────────────────────────

const { mockGetUser, mockDbSelect, mockGetAudioPresignedUrl, mockRedirect } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockDbSelect = vi.fn();
  const mockGetAudioPresignedUrl = vi.fn();
  const mockRedirect = vi.fn();
  return { mockGetUser, mockDbSelect, mockGetAudioPresignedUrl, mockRedirect };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock Drizzle query chain: db.select().from().where().orderBy()
const mockOrderBy = vi.fn();
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
mockDbSelect.mockReturnValue({ from: mockFrom });

vi.mock('@/db', () => ({
  db: { select: mockDbSelect },
}));

vi.mock('@/lib/r2', () => ({
  getAudioPresignedUrl: mockGetAudioPresignedUrl,
}));

// Next.js redirect throws in server components — simulate that
vi.mock('next/navigation', () => ({
  redirect: mockRedirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('./_components/SongCard', () => ({
  SongCard: ({ recipientName }: { recipientName: string }) => (
    <div data-testid="song-card">{recipientName}</div>
  ),
}));

import DashboardPage from './page';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mockUser = { id: 'user-uuid-123', email: 'test@notevra.com' };

const mockSong = {
  id: 'song-uuid-abc',
  userId: 'user-uuid-123',
  recipientName: 'Emma',
  relationship: 'sister',
  genre: 'pop',
  createdAt: new Date('2026-01-15T12:00:00.000Z'),
  r2Mp3Key: 'songs/song-uuid-abc/audio.mp3',
  status: 'completed',
  heartbulaJobId: 'job-123',
  sessionToken: null,
  quizData: {},
  r2WavKey: null,
  completedAt: null,
  failedAt: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset db mock chain
  mockOrderBy.mockResolvedValue([]);
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockDbSelect.mockReturnValue({ from: mockFrom });
  mockGetAudioPresignedUrl.mockResolvedValue('https://r2.example.com/presigned/audio.mp3');
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  // Test 1: Redirects unauthenticated users
  it('calls redirect to /login?next=/dashboard when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT:/login?next=/dashboard');
    expect(mockRedirect).toHaveBeenCalledWith('/login?next=/dashboard');
  });

  // Test 2: Renders song cards when user has completed songs
  it('renders song cards when user has completed songs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockOrderBy.mockResolvedValue([mockSong]);

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId('song-card')).toBeInTheDocument();
    expect(screen.getByText('Emma')).toBeInTheDocument();
  });

  // Test 3: Renders empty state when user has no songs
  it('renders empty state with "Create your first song" CTA when user has no songs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockOrderBy.mockResolvedValue([]);

    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByText(/you haven't created any songs yet/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /create your first song/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/quiz');
  });

  // Test 4: Filters out songs with null r2Mp3Key (not yet finalized)
  it('filters out songs with null r2Mp3Key and does not call getAudioPresignedUrl for them', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    const incompleteSong = { ...mockSong, id: 'song-incomplete', r2Mp3Key: null };
    mockOrderBy.mockResolvedValue([incompleteSong]);

    const jsx = await DashboardPage();
    render(jsx);

    // With only null-key songs, no presigned URLs should be fetched
    expect(mockGetAudioPresignedUrl).not.toHaveBeenCalled();
    // Empty state shown since no completed songs
    expect(screen.getByText(/you haven't created any songs yet/i)).toBeInTheDocument();
  });
});
