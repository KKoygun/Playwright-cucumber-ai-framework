import { defineConfig } from '@playwright/test';

/**
 * Unit tests only (npm run test:unit). The BDD suite runs through Cucumber (cucumber.js).
 * Providers are tested against a fake fetch, so nothing here needs a network or an API key.
 */
export default defineConfig({
  testDir: './tests/unit',
  reporter: 'list',
  use: { headless: true },
});
