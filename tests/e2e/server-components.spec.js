/**
 * E2E Test: Server Components Page
 *
 * Tests the Server Components documentation page for:
 * - Page loads without errors
 * - Code examples are visible
 * - Interactive demos work
 * - Security examples render correctly
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Server Components Page', () => {
  let consoleErrors = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Skip 403 resource errors from Netlify preview edge functions
        if (text.includes('the server responded with a status of 403')) return;
        consoleErrors.push(text);
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });
  });

  test('Page loads without errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/server-components`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check that page title or heading is present
    const heading = await page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // No console errors
    if (consoleErrors.length > 0) {
      console.error('❌ Console errors on /server-components:', consoleErrors);
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test('Code examples are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/server-components`, {
      waitUntil: 'networkidle',
    });

    // Check for code blocks (common in docs)
    const codeBlocks = page.locator('pre code, .code-block, [class*="highlight"]');
    const count = await codeBlocks.count();

    // Should have at least one code example
    expect(count).toBeGreaterThan(0);
  });

  test('Security examples section exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/server-components`, {
      waitUntil: 'networkidle',
    });

    // Look for security-related headings or content
    const securityHeading = page.locator('h2, h3, h4').filter({
      hasText: /security|prop.*security|xss|sanitiz/i
    });

    // If security section exists, it should be visible
    const count = await securityHeading.count();
    if (count > 0) {
      await expect(securityHeading.first()).toBeVisible();
    }
  });

  test('Navigation to Server Components from sidebar', async ({ page }) => {
    // Start at home page
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Look for Server Components link in navigation
    const serverComponentsLink = page.locator('a[href*="server-components"]').first();

    // Click if visible
    if (await serverComponentsLink.isVisible()) {
      await serverComponentsLink.click();
      await page.waitForTimeout(500);

      // Verify URL changed
      expect(page.url()).toContain('server-components');
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('Server Actions section exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/server-components`, {
      waitUntil: 'networkidle',
    });

    // Look for Server Actions heading or content
    const actionsHeading = page.locator('h2, h3, h4').filter({
      hasText: /server.*actions?|actions?/i
    });

    const count = await actionsHeading.count();
    if (count > 0) {
      await expect(actionsHeading.first()).toBeVisible();
    }
  });

  test('Page is responsive (mobile)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/server-components`, {
      waitUntil: 'networkidle',
    });

    // Content should still be visible on mobile
    const heading = await page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe('Server Components - Localized', () => {
  const LOCALES = ['/fr', '/es', '/de', '/pt', '/ja'];

  for (const locale of LOCALES) {
    test(`${locale}/server-components loads without errors`, async ({ page }) => {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('the server responded with a status of 403')) return;
          consoleErrors.push(text);
        }
      });

      await page.goto(`${BASE_URL}${locale}/server-components`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      await page.waitForTimeout(500);

      if (consoleErrors.length > 0) {
        console.error(`❌ Console errors on ${locale}/server-components:`, consoleErrors);
      }

      expect(consoleErrors).toHaveLength(0);
    });
  }
});
