import { render } from '@react-email/components';
import { describe, it, expect } from 'vitest';
import { SongReadyEmail } from './SongReadyEmail';

const validProps = {
  recipientName: 'Sarah',
  listenUrl: 'https://r2.example.com/listen/song.mp3',
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

  it('rendered HTML does not contain Download MP3 link', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).not.toContain('Download MP3');
  });

  it('rendered HTML contains brand color #6ba3c9', async () => {
    const html = await render(SongReadyEmail(validProps));
    expect(html).toContain('#6ba3c9');
  });
});
