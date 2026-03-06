// Source: https://playwright.dev/docs/test-configuration + https://playwright.dev/docs/api/class-testoptions
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,           // default for non-generation tests; override per-test with test.setTimeout(120_000)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    contextOptions: {
      reducedMotion: 'reduce',    // disables Framer Motion animations
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport presets — defined now, used in Phase 22
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'mobile-ipad',
      use: { ...devices['iPad'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  globalSetup: require.resolve('./e2e/global-setup'),
});
