import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/landing';

test.describe('Landing — mobile responsiveness', () => {

  test('no horizontal overflow', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    // Wait for page to fully render
    await expect(landing.heroHeading).toBeVisible();
    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('hero CTA is visible and meets 44px touch target', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.heroCtaButton).toBeVisible();
    const box = await landing.heroCtaButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('hero heading renders', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.heroHeading).toBeVisible();
  });

});
