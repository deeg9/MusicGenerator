import { test, expect } from '@playwright/test';
import { SuccessPage } from './pages/success';

// Viewport comes from the --project flag (mobile-iphone = iPhone SE = 375px)
// Do NOT use test.use() or page.setViewportSize() here

const MOCK_JOB_ID = 'mock-mobile-job';
const MOCK_NAME = 'Test';

// Minimal WAV header (44 bytes) — just enough to be a valid WAV file
const MINIMAL_WAV = Buffer.from([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x24, 0x00, 0x00, 0x00, // chunk size (36 bytes)
  0x57, 0x41, 0x56, 0x45, // "WAVE"
  0x66, 0x6d, 0x74, 0x20, // "fmt "
  0x10, 0x00, 0x00, 0x00, // subchunk1 size (16)
  0x01, 0x00,             // PCM format
  0x01, 0x00,             // mono
  0x44, 0xac, 0x00, 0x00, // 44100 Hz
  0x88, 0x58, 0x01, 0x00, // byte rate
  0x02, 0x00,             // block align
  0x10, 0x00,             // bits per sample (16)
  0x64, 0x61, 0x74, 0x61, // "data"
  0x00, 0x00, 0x00, 0x00, // data size (0 bytes — empty audio)
]);

async function setupMocks(page: SuccessPage['page']) {
  // Register mocks BEFORE navigation (per Phase 21 decision)
  // poll-job uses path param: /api/poll-job/[jobId]
  await page.route('/api/poll-job/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'COMPLETED',
        error: null,
      }),
    });
  });

  // Mock the audio route — return minimal WAV to prevent audio element error
  await page.route('/api/audio/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: MINIMAL_WAV,
    });
  });
}

test.describe('Success page — mobile responsiveness (MOB-03)', () => {

  test('audio player is attached at mobile viewport', async ({ page }) => {
    await setupMocks(page);
    const success = new SuccessPage(page);
    await success.goto(MOCK_JOB_ID, MOCK_NAME);
    await expect(success.readyHeading).toBeVisible({ timeout: 10_000 });

    // Native <audio> has no rendered pixels — use toBeAttached() per Phase 21 decision
    await expect(success.audioPlayer).toBeAttached();
  });

  test('play button is visible and meets 44px touch target', async ({ page }) => {
    await setupMocks(page);
    const success = new SuccessPage(page);
    await success.goto(MOCK_JOB_ID, MOCK_NAME);
    await expect(success.readyHeading).toBeVisible({ timeout: 10_000 });

    const playButton = page.getByRole('button', { name: /play/i });
    await expect(playButton).toBeVisible();

    // SongPlayer play button is w-16 h-16 (64px) — well above 44px minimum
    const box = await playButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('no horizontal overflow on success page', async ({ page }) => {
    await setupMocks(page);
    const success = new SuccessPage(page);
    await success.goto(MOCK_JOB_ID, MOCK_NAME);
    await expect(success.readyHeading).toBeVisible({ timeout: 10_000 });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('download button is visible at mobile viewport', async ({ page }) => {
    await setupMocks(page);
    const success = new SuccessPage(page);
    await success.goto(MOCK_JOB_ID, MOCK_NAME);
    await expect(success.readyHeading).toBeVisible({ timeout: 10_000 });

    await expect(success.downloadButton).toBeVisible();
  });

});
