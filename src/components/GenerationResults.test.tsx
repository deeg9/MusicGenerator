import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock the useGenerationStatus hook
const mockUseGenerationStatus = vi.fn();
vi.mock('@/hooks/useGenerationStatus', () => ({
  useGenerationStatus: (...args: unknown[]) => mockUseGenerationStatus(...args),
}));

// Mock WaveformPlayer to avoid wavesurfer.js complexity in integration tests
vi.mock('./WaveformPlayer', () => ({
  WaveformPlayer: ({ url }: { url: string }) => <div data-testid="waveform-player" data-url={url} />,
}));

// Mock AudioPlayerContext
vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: () => ({
    currentTrack: null,
    isPlaying: false,
    play: () => {},
    pause: () => {},
    resume: () => {},
    stop: () => {},
  }),
}));

// Mock EnhancedCaptionDisplay
vi.mock('./EnhancedCaptionDisplay', () => ({
  EnhancedCaptionDisplay: ({ caption }: { caption: string }) => (
    <div data-testid="enhanced-caption">{caption}</div>
  ),
}));

import { GenerationResults } from './GenerationResults';

const makeOutput = (index: number) => ({
  id: `output-${index}`,
  variantIndex: index,
  r2Key: `key-${index}`,
  url: `https://r2.example.com/wav-${index}.wav`,
  mp3Url: `https://r2.example.com/mp3-${index}.mp3`,
  mp3FileSizeBytes: 5_000_000,
  promptText: 'happy birthday jazz',
  duration: 30,
  createdAt: new Date().toISOString(),
});

describe('GenerationResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders variant cards for each output when completed', () => {
    mockUseGenerationStatus.mockReturnValue({
      data: {
        jobId: 'job-123',
        status: 'completed',
        outputs: [makeOutput(0), makeOutput(1)],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        failedAt: null,
        error: null,
      },
      isPolling: false,
      elapsedSeconds: 0,
      error: null,
    });

    render(<GenerationResults jobId="job-123" enhancedCaption={null} />);

    // Should render two waveform players (one per variant card)
    const players = screen.getAllByTestId('waveform-player');
    expect(players).toHaveLength(2);

    // Should show variant labels
    expect(screen.getByText('Variant 1')).toBeDefined();
    expect(screen.getByText('Variant 2')).toBeDefined();
  });

  it('renders nothing when jobId is null', () => {
    mockUseGenerationStatus.mockReturnValue({
      data: null,
      isPolling: false,
      elapsedSeconds: 0,
      error: null,
    });

    const { container } = render(<GenerationResults jobId={null} enhancedCaption={null} />);
    expect(container.firstChild).toBeNull();
  });

  it.todo('only one variant is active at a time (auto-pause)');
  it.todo('resets active variant when jobId changes');
});
