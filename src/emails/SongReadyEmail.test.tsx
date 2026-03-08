import { render } from '@react-email/components';
import { describe, it, expect } from 'vitest';
import { SongReadyEmail } from './SongReadyEmail';

const validProps = {
  recipientName: 'Sarah',
  listenUrl: 'https://r2.example.com/listen/song.mp3',
  downloadUrl: 'https://r2.example.com/download/song.mp3',
  genre: 'Jazz',
};

describe('SongReadyEmail', () => {
  it('renders without throwing when given valid props', () => {
    expect(() => render(SongReadyEmail(validProps))).not.toThrow();
  });

  it('rendered HTML contains the recipient name', () => {
    const html = render(SongReadyEmail(validProps));
    expect(html).toContain('Sarah');
  });

  it('rendered HTML contains the listen URL in a link/button', () => {
    const html = render(SongReadyEmail(validProps));
    expect(html).toContain('https://r2.example.com/listen/song.mp3');
  });

  it('rendered HTML contains Download text with download URL', () => {
    const html = render(SongReadyEmail(validProps));
    expect(html).toContain('Download');
    expect(html).toContain('https://r2.example.com/download/song.mp3');
  });

  it('rendered HTML contains brand color #6ba3c9', () => {
    const html = render(SongReadyEmail(validProps));
    expect(html).toContain('#6ba3c9');
  });
});
