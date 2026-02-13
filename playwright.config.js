/**
 * Playwright Configuration for Pulse Framework E2E Tests
 * CI-only configuration - Playwright is not installed locally
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry twice on failure

  // Use all available CPU cores in CI
  workers: process.env.CI ? '100%' : 2,

  // Reporter for CI
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['github'],
    ['list']
  ],

  use: {
    // Base URL from environment (set by GitHub Actions)
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // No video (saves space in CI)
    video: 'off',

    // Timeout for actions
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Test on Chromium and Firefox only (fastest, most coverage)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
