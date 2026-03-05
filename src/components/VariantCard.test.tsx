import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock WaveformPlayer to avoid wavesurfer in JSDOM
vi.mock('./WaveformPlayer', () => ({
  WaveformPlayer: () => <div data-testid="mock-waveform" />,
}));

// Import after mocks
import { VariantCard } from './VariantCard';

const baseProps = {
  variantIndex: 0,
  playbackUrl: null,
  mp3Url: null,
  wavUrl: null,
  isActive: false,
  onPlay: () => {},
  mp3FileSizeBytes: null,
  duration: null,
  promptText: null,
};

describe('VariantCard', () => {
  it('active card has ring-primary/50 and shadow-primary/10 class', () => {
    const { container } = render(
      <VariantCard
        {...baseProps}
        isActive={true}
        mp3Url="http://example.com/audio.mp3"
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('ring-primary/50');
    expect(card.className).toContain('shadow-primary/10');
  });

  it('inactive card has border-border class (not border-zinc-800)', () => {
    const { container } = render(
      <VariantCard
        {...baseProps}
        isActive={false}
      />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-border');
    expect(card.className).not.toContain('border-zinc-800');
  });

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
