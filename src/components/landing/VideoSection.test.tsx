import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoSection } from './VideoSection';

describe('VideoSection', () => {
  it('renders section with id="examples"', () => {
    render(<VideoSection />);
    expect(document.querySelector('#examples')).not.toBeNull();
  });

  it('renders heading "See the magic happen"', () => {
    render(<VideoSection />);
    expect(screen.getByText('See the magic happen')).not.toBeNull();
  });

  it('renders play button initially (not iframe)', () => {
    render(<VideoSection />);
    expect(screen.getByRole('button', { name: 'Play video' })).not.toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('renders iframe with youtube-nocookie.com src after clicking play button', () => {
    render(<VideoSection />);
    const playButton = screen.getByRole('button', { name: 'Play video' });
    fireEvent.click(playButton);
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com');
  });
});
