import { render } from '@react-email/components';
import { describe, it, expect } from 'vitest';
import { GiftDeliveryEmail } from './GiftDeliveryEmail';

const validProps = {
  recipientName: 'Alex',
  creatorFirstName: 'Jordan',
  relationship: 'friend',
  message: 'I wanted to give you something special to celebrate your birthday!',
  genre: 'Pop',
  listenUrl: 'https://r2.example.com/listen/gift-song.mp3',
};

describe('GiftDeliveryEmail', () => {
  it('renders without throwing when given valid props', async () => {
    await expect(render(GiftDeliveryEmail(validProps))).resolves.toBeTruthy();
  });

  it('rendered HTML contains the recipient name', async () => {
    const html = await render(GiftDeliveryEmail(validProps));
    expect(html).toContain('Alex');
  });

  it("rendered HTML contains the creator's personal message", async () => {
    const html = await render(GiftDeliveryEmail(validProps));
    expect(html).toContain(
      'I wanted to give you something special to celebrate your birthday!'
    );
  });

  it('rendered HTML contains the listen URL in a link/button', async () => {
    const html = await render(GiftDeliveryEmail(validProps));
    expect(html).toContain('https://r2.example.com/listen/gift-song.mp3');
  });

  it('rendered HTML contains brand color #6ba3c9', async () => {
    const html = await render(GiftDeliveryEmail(validProps));
    expect(html).toContain('#6ba3c9');
  });

  it('rendered HTML contains "No account required" or privacy note text', async () => {
    const html = await render(GiftDeliveryEmail(validProps));
    expect(html).toContain('No account required');
  });
});
