import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for VaultSpend E2E tests.
 * Runs against `npm run preview` (built PWA on localhost:4173).
 *
 * Usage:
 *   npx playwright test              — run all E2E specs
 *   npx playwright test --ui         — open interactive UI mode
 *   npx playwright show-report       — view HTML report
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome (Pixel 5)',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run `npm run preview` before tests start
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
