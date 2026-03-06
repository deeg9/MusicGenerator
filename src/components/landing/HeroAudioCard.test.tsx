import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroAudioCard } from './HeroAudioCard';

describe('HeroAudioCard', () => {
  it('renders play button with aria-label "Play"', () => {
    render(<HeroAudioCard />);
    const playButton = screen.getByRole('button', { name: 'Play' });
    expect(playButton).not.toBeNull();
  });

  it('renders audio element with correct src', () => {
    render(<HeroAudioCard />);
    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe('/sample-song.mp3');
  });

  it('renders song title "Happy Birthday, Mom"', () => {
    render(<HeroAudioCard />);
    expect(screen.getByText('Happy Birthday, Mom')).not.toBeNull();
  });
});
