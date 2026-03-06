import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/landing';

test.describe('Landing Page', () => {
  let landing: LandingPage;

  test.beforeEach(({ page }) => {
    landing = new LandingPage(page);
  });

  test('hero section loads with heading and CTA', async ({ page }) => {
    await landing.goto();

    await expect(landing.heroHeading).toBeVisible();
    await expect(landing.heroCtaButton).toBeVisible();
    const href = await landing.heroCtaButton.getAttribute('href');
    expect(href).toContain('/quiz');
  });

  test('CTA navigates to quiz page', async ({ page }) => {
    await landing.goto();

    await landing.heroCtaButton.click();

    await expect(page).toHaveURL(/\/quiz/);
    await expect(landing.page.getByRole('heading', { name: 'Who is this song for?' })).toBeVisible();
  });

  test('navigation links are visible', async ({ page }) => {
    await landing.goto();

    await expect(landing.howItWorksLink).toBeVisible();
    await expect(landing.examplesLink).toBeVisible();
    await expect(landing.reviewsLink).toBeVisible();
  });
});
