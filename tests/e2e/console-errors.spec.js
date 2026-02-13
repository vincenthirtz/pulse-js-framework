/**
 * E2E Test: Console Error Detection
 *
 * Tests all documentation pages for console errors, warnings, and failed network requests.
 * Runs automatically in PR preview deployments.
 */

import { test, expect } from '@playwright/test';

// All documentation routes (sync with docs/src/state.js navStructure)
const ROUTES = [
  '/',
  '/getting-started',
  '/core-concepts',
  '/api-reference',
  '/benchmarks',
  '/examples',
  '/changelog',
  '/playground',
  '/websocket',
  '/graphql',
  '/context',
  '/devtools',
  '/mobile',
  '/ssr',
  '/http',
  '/sse',
  '/persistence',
  '/portal',
  '/animation',
  '/i18n',
  '/service-worker',
  '/accessibility',
  '/debugging',
  '/error-handling',
  '/performance',
  '/security',
  '/testing',
  '/internals',
  '/migration-react',
  '/migration-vue',
  '/migration-angular',
];

// Locales to test (if multi-language support)
const LOCALES = ['', '/fr', '/es', '/de', '/pt', '/ja'];

// Base URL from environment (set by GitHub Actions)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Console Error Detection', () => {
  let consoleErrors = [];
  let consoleWarnings = [];
  let networkErrors = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Skip 403 resource errors from Netlify preview edge functions
        if (text.includes('the server responded with a status of 403')) return;

        consoleErrors.push({
          text,
          location: msg.location(),
        });
      } else if (msg.type() === 'warning') {
        consoleWarnings.push({
          text: msg.text(),
          location: msg.location(),
        });
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', error => {
      consoleErrors.push({
        text: error.message,
        stack: error.stack,
      });
    });

    // Listen for failed network requests (exclude document-level 403s from
    // Netlify edge functions that may not be deployed in PR previews)
    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        const url = response.url();
        const isDocumentNav = response.request().resourceType() === 'document';
        const is403 = response.status() === 403;

        // Skip 403 on document navigation (Netlify preview edge function issue)
        if (isDocumentNav && is403) return;

        networkErrors.push({
          url,
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });
  });

  // Test each route
  for (const route of ROUTES) {
    test(`${route || '/'} - No console errors`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for any dynamic content to load
      await page.waitForTimeout(1000);

      // Report errors if any
      if (consoleErrors.length > 0) {
        console.error(`❌ Console errors on ${route}:`, consoleErrors);
      }
      if (consoleWarnings.length > 0) {
        console.warn(`⚠️  Console warnings on ${route}:`, consoleWarnings);
      }
      if (networkErrors.length > 0) {
        console.error(`🌐 Network errors on ${route}:`, networkErrors);
      }

      // Assert no errors (fail test if errors found)
      expect(consoleErrors, `Console errors found on ${route}`).toHaveLength(0);

      // Optionally fail on network errors (you can make this a warning instead)
      expect(networkErrors, `Network errors found on ${route}`).toHaveLength(0);
    });
  }
});

test.describe('Localized Pages', () => {
  let consoleErrors = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Skip 403 resource errors from Netlify preview edge functions
        if (text.includes('the server responded with a status of 403')) return;
        consoleErrors.push(text);
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  // Test a sample of localized routes (not all to save time)
  const SAMPLE_ROUTES = ['/', '/getting-started', '/api-reference'];

  for (const locale of LOCALES.slice(1)) { // Skip default locale (already tested)
    for (const route of SAMPLE_ROUTES) {
      test(`${locale}${route} - No console errors`, async ({ page }) => {
        await page.goto(`${BASE_URL}${locale}${route}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        await page.waitForTimeout(500);

        if (consoleErrors.length > 0) {
          console.error(`❌ Console errors on ${locale}${route}:`, consoleErrors);
        }

        expect(consoleErrors, `Console errors found on ${locale}${route}`).toHaveLength(0);
      });
    }
  }
});

test.describe('Interactive Features', () => {
  test('Search modal - No errors', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('the server responded with a status of 403')) return;
        consoleErrors.push(text);
      }
    });

    // Open search (Ctrl+K works on both Linux CI and macOS)
    await page.keyboard.press('Control+K');

    // Wait for modal to become visible (it exists in DOM but has display:none)
    await page.waitForSelector('[role="dialog"][style*="flex"], [role="dialog"]:not([style*="display: none"])', {
      state: 'visible',
      timeout: 5000,
    });

    // Type search query
    await page.keyboard.type('pulse');
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');

    expect(consoleErrors).toHaveLength(0);
  });

  test('Mobile navigation - No errors', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('Code playground - No errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/playground`, { waitUntil: 'networkidle' });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Wait for playground to load
    await page.waitForTimeout(2000);

    // Try interacting with code editor if present
    const codeEditor = page.locator('textarea, [contenteditable="true"]').first();
    if (await codeEditor.isVisible()) {
      await codeEditor.click();
      await page.keyboard.type('// test');
      await page.waitForTimeout(500);
    }

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Accessibility Checks', () => {
  test('All pages - Basic a11y violations', async ({ page }) => {
    const violations = [];

    for (const route of ROUTES.slice(0, 5)) { // Test first 5 routes for a11y
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });

      // Check for basic a11y issues
      const missingAltImages = await page.locator('img:not([alt])').count();
      const missingAriaLabels = await page.locator('button:not([aria-label]):not(:has(> *))').count();

      if (missingAltImages > 0) {
        violations.push(`${route}: ${missingAltImages} images missing alt text`);
      }
      if (missingAriaLabels > 0) {
        violations.push(`${route}: ${missingAriaLabels} buttons missing accessible names`);
      }
    }

    if (violations.length > 0) {
      console.warn('⚠️  A11y violations:', violations);
    }

    // Optional: fail test on a11y violations
    // expect(violations).toHaveLength(0);
  });
});
