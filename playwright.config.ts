import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — used for CI reference and multi-browser configuration.
 * The primary test runner is Cucumber (cucumber.js). This config documents
 * the browser/device targets and is consumed by the GitHub Actions pipeline.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'https://demo.playwright.dev/todomvc',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: process.env.HEADLESS !== 'false',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
