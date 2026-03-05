import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock WaveformPlayer since it depends on wavesurfer
vi.mock('./WaveformPlayer', () => ({
  WaveformPlayer: ({ url }: { url: string }) => <div data-testid="waveform-player" data-url={url} />,
}));

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
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

import { ExampleCard } from './ExampleCard';

describe('ExampleCard', () => {
  it('renders title and genre', () => {
    render(
      <ExampleCard
        title="Birthday Jazz"
        genre="Jazz, Warm"
        audioUrl="/api/examples/jazz-birthday"
      />,
    );
    expect(screen.getByText('Birthday Jazz')).toBeDefined();
    expect(screen.getByText('Jazz, Warm')).toBeDefined();
  });

  it('passes audioUrl to WaveformPlayer', () => {
    render(
      <ExampleCard
        title="Love Ballad"
        genre="Pop"
        audioUrl="/api/examples/love-ballad"
      />,
    );
    const player = screen.getByTestId('waveform-player');
    expect(player.getAttribute('data-url')).toBe('/api/examples/love-ballad');
  });

  it.todo('renders in compact card layout');
});
