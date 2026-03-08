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
  it('renders without throwing when given valid props', async () => {
    await expect(render(SongReadyEmail(validProps))).resolves.toBeTruthy();
  });

  it('rendered HTML contains the recipient name', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).toContain('Sarah');
  });

  it('rendered HTML contains the listen URL in a link/button', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).toContain('https://r2.example.com/listen/song.mp3');
  });

  it('rendered HTML contains Download text with download URL', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).toContain('Download');
    expect(html).toContain('https://r2.example.com/download/song.mp3');
  });

  it('rendered HTML contains brand color #6ba3c9', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).toContain('#6ba3c9');
  });
});
