import { defineConfig, devices } from '@playwright/test';

/**
 * Base Playwright config. Run with:
 *   npx playwright test
 *
 * The `webServer` block boots the Vite dev server so smoke tests can hit
 * a real preview. For CI against a staging URL, set PLAYWRIGHT_BASE_URL and
 * remove/override `webServer`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3006',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
