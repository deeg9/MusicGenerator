import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/app/quiz/success/[jobId]/_components/SongPlayer', () => ({
  SongPlayer: ({ src }: { src: string }) => (
    <div data-testid="song-player" data-src={src} />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const defaultProps = {
  songId: 'test-song-123',
  recipientName: 'Emma',
  relationship: 'sister',
  genre: 'pop',
  status: 'completed' as const,
  createdAt: '2026-01-15T12:00:00.000Z',
  audioUrl: 'https://r2.example.com/presigned/audio.mp3',
  downloadUrl: 'https://r2.example.com/presigned/audio.mp3?response-content-disposition=attachment',
  downloadFilename: 'notevra-song-for-emma.mp3',
  isUnlocked: true,
};

import { SongCard } from './SongCard';

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('SongCard', () => {
  // Test 1: Renders recipient name in heading
  it('renders recipient name in heading', () => {
    render(<SongCard {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /a song for emma/i })).toBeInTheDocument();
  });

  // Test 2: Renders relationship, genre, and formatted date in subtitle
  it('renders relationship, genre, and formatted date in subtitle', () => {
    render(<SongCard {...defaultProps} />);
    const subtitle = screen.getByText(/sister/i);
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.textContent).toMatch(/pop/i);
    // Date should be formatted from ISO string
    expect(subtitle.textContent).toMatch(/2026/);
  });

  // Test 3: Renders SongPlayer with correct audioUrl prop
  it('renders SongPlayer with correct audioUrl prop', () => {
    render(<SongCard {...defaultProps} />);
    const player = screen.getByTestId('song-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute('data-src', defaultProps.audioUrl);
  });

  // Test 4: Download anchor has correct href and download attributes
  it('download anchor has href={downloadUrl} and download={downloadFilename} attributes', () => {
    render(<SongCard {...defaultProps} />);
    const anchor = screen.getByRole('link', { name: /download/i });
    expect(anchor).toHaveAttribute('href', defaultProps.downloadUrl);
    expect(anchor).toHaveAttribute('download', defaultProps.downloadFilename);
  });

  // Test 5: Download button displays "Download" text with Download icon
  it('displays "Download" text in the download link', () => {
    render(<SongCard {...defaultProps} />);
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument();
  });
});
