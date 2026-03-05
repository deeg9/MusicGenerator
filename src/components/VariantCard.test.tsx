import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock WaveformPlayer to avoid wavesurfer in JSDOM
vi.mock('./WaveformPlayer', () => ({
  WaveformPlayer: () => <div data-testid="mock-waveform" />,
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

// Import after mocks
import { VariantCard } from './VariantCard';

const baseProps = {
  variantIndex: 0,
  playbackUrl: null,
  mp3Url: null,
  wavUrl: null,
  mp3FileSizeBytes: null,
  duration: null,
  promptText: null,
};

describe('VariantCard', () => {
  it('card base has bg-card and shadow-subtle class', () => {
    const { container } = render(
      <VariantCard
        {...baseProps}
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('shadow-subtle');
  });

  it('inactive card has border-border class (not border-zinc-800)', () => {
    const { container } = render(
      <VariantCard
        {...baseProps}
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-border');
    expect(card.className).not.toContain('border-zinc-800');
  });

  it('Download MP3 link has bg-accent and text-accent-foreground class', () => {
    render(
      <VariantCard
        {...baseProps}
        mp3Url="http://example.com/audio.mp3"
        playbackUrl="http://example.com/audio.mp3"
      />,
    );
    const mp3Link = screen.getByText('Download MP3');
    expect(mp3Link.className).toContain('bg-accent');
    expect(mp3Link.className).toContain('text-accent-foreground');
    expect(mp3Link.className).not.toContain('bg-violet');
  });

  it('WAV download has border-border, text-foreground, and hover:bg-secondary', () => {
    render(
      <VariantCard
        {...baseProps}
        wavUrl="http://example.com/audio.wav"
        playbackUrl="http://example.com/audio.wav"
      />,
    );
    const wavLink = screen.getByText('Download');
    expect(wavLink.className).toContain('border-border');
    expect(wavLink.className).toContain('text-foreground');
    expect(wavLink.className).toContain('hover:bg-secondary');
  });

  it('audio unavailable text has text-muted-foreground class', () => {
    render(
      <VariantCard
        {...baseProps}
      />,
    );
    const unavailableText = screen.getByText('Audio unavailable');
    expect(unavailableText.className).toContain('text-muted-foreground');
    expect(unavailableText.className).not.toContain('text-zinc-500');
  });
});
