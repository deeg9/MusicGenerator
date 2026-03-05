import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock wavesurfer hooks before importing component
const mockPlayPause = vi.fn();
const mockPause = vi.fn();
const mockGetDuration = vi.fn(() => 120);
const mockGetCurrentTime = vi.fn(() => 0);
const mockOn = vi.fn();
const mockUn = vi.fn();
const mockSetOptions = vi.fn();

const mockWavesurfer = {
  playPause: mockPlayPause,
  pause: mockPause,
  getDuration: mockGetDuration,
  getCurrentTime: mockGetCurrentTime,
  on: mockOn,
  un: mockUn,
  setOptions: mockSetOptions,
};

vi.mock('@wavesurfer/react', () => ({
  useWavesurfer: () => ({ wavesurfer: mockWavesurfer }),
}));

vi.mock('wavesurfer.js', () => ({
  default: vi.fn(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark' }),
}));

// Import after mocks
import { WaveformPlayer } from './WaveformPlayer';

describe('WaveformPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate ready event: fire the 'ready' handler when .on('ready', cb) is called
    mockOn.mockImplementation((event: string, cb: () => void) => {
      if (event === 'ready') {
        cb();
      }
    });
  });

  it('renders play button and time display', () => {
    render(
      <WaveformPlayer url="http://example.com/audio.mp3" isActive={false} onPlay={() => {}} />,
    );
    const playBtn = screen.getByRole('button', { name: /play/i });
    expect(playBtn).toBeDefined();
    // Time display: 0:00 / 2:00 (getDuration returns 120)
    expect(screen.getByText(/0:00/)).toBeDefined();
  });

  it('calls onPlay callback when play button is clicked', () => {
    const onPlay = vi.fn();
    render(
      <WaveformPlayer url="http://example.com/audio.mp3" isActive={false} onPlay={onPlay} />,
    );
    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(mockPlayPause).toHaveBeenCalledTimes(1);
  });

  it('play button uses bg-primary and text-primary-foreground (semantic tokens, not violet/white)', () => {
    render(
      <WaveformPlayer url="http://example.com/audio.mp3" isActive={false} onPlay={() => {}} />,
    );
    const playBtn = screen.getByRole('button', { name: /play/i });
    const className = playBtn.className;
    expect(className).toContain('bg-primary');
    expect(className).toContain('text-primary-foreground');
    expect(className).not.toContain('bg-violet');
    expect(className).not.toContain('text-white');
  });

  it('time display uses text-muted-foreground (not text-zinc-500)', () => {
    render(
      <WaveformPlayer url="http://example.com/audio.mp3" isActive={false} onPlay={() => {}} />,
    );
    // Time display container should have text-muted-foreground
    const timeEl = screen.getByText(/0:00/).closest('div');
    expect(timeEl?.className).toContain('text-muted-foreground');
    expect(timeEl?.className).not.toContain('text-zinc-500');
  });

  it('calls wavesurfer.setOptions() on mount for theme sync', () => {
    render(
      <WaveformPlayer url="http://example.com/audio.mp3" isActive={false} onPlay={() => {}} />,
    );
    // setOptions should be called with waveColor and progressColor
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        waveColor: expect.any(String),
        progressColor: expect.any(String),
      }),
    );
  });

  it.todo('pauses when isActive becomes false (auto-pause)');
  it.todo('shows loading state while audio loads');
});
