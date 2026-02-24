/**
 * Playwright Configuration for Pulse Framework E2E Tests
 * CI-only configuration - Playwright is not installed locally
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

const serveDir = process.env.PLAYWRIGHT_SERVE_DIR;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || (serveDir ? 'http://localhost:4173' : 'http://localhost:3000');

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',

  // Maximum time one test can run
  timeout: 45 * 1000,

  // Parallel execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Use all available CPU cores in CI
  workers: process.env.CI ? '100%' : 2,

  // Reporter for CI
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
    ['github'],
    ['list']
  ],

  use: {
    baseURL,

    // Collect trace on failure
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // No video (saves space in CI)
    video: 'off',

    // Timeout for actions
    actionTimeout: 5 * 1000,
    navigationTimeout: 15 * 1000,
  },

  // Serve the built site locally when PLAYWRIGHT_SERVE_DIR is set
  ...(serveDir ? {
    webServer: {
      command: `npx serve ${serveDir} -l 4173 -s`,
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
  } : {}),

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
