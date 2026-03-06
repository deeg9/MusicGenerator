import { test, expect } from '@playwright/test';

test('app loads at root', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveTitle(/error/i);
});
