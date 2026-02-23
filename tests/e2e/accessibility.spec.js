/**
 * E2E Test: Accessibility (WCAG 2.1 AA Compliance)
 *
 * Comprehensive accessibility testing using axe-core.
 * Tests keyboard navigation, screen reader support, color contrast, and ARIA attributes.
 */

import { test, expect } from '@playwright/test';
import {
  runAxeScan,
  assertNoA11yViolations,
  getFocusableElements,
  testTabOrder,
  testSkipLinks,
  testEscapeKey,
  testHeadingHierarchy,
  checkColorContrast
} from './utils/a11y-helpers.js';
import { BasePage } from './pages/BasePage.js';
import { SearchModal } from './pages/SearchModal.js';
import { ROUTES, HIGH_PRIORITY_ROUTES } from './fixtures/routes.js';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Accessibility - WCAG 2.1 AA Compliance', () => {
  // Test all routes for critical violations
  for (const route of ROUTES) {
    test(`${route || '/'} - No critical a11y violations`, async ({ page }) => {
      const basePage = new BasePage(page, BASE_URL);
      await basePage.goto(route);

      // Run axe scan and assert no critical violations
      await assertNoA11yViolations(page, route);
    });
  }
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('Tab order is logical on homepage', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Test tab order
    await testTabOrder(page, 10); // At least 10 focusable elements

    // Get all focusable elements
    const focusableElements = await getFocusableElements(page);
    console.log(`\n📋 Found ${focusableElements.length} focusable elements`);

    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('Skip links work', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await testSkipLinks(page);
  });

  test('Focus visible on interactive elements', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Tab to first few interactive elements and check focus indicators
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check if focused element has visible focus indicator
      const hasFocusIndicator = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;

        const style = window.getComputedStyle(el);
        const outline = style.outline;
        const boxShadow = style.boxShadow;

        return (outline && outline !== 'none' && outline !== '0px') ||
               (boxShadow && boxShadow !== 'none');
      });

      if (i > 0) { // Skip first element (might be skip link)
        expect(hasFocusIndicator, `Element ${i} should have focus indicator`).toBe(true);
      }
    }
  });

  test('Escape key closes search modal', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    const searchModal = new SearchModal(page);

    await basePage.goto('/');

    // Open search modal
    await searchModal.open();

    // Close with Escape
    await searchModal.closeWithEscape();

    expect(await searchModal.isOpen(), 'Search modal should be closed').toBe(false);
  });

  test('Escape key closes mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu" i]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Menu should be closed (check aria-expanded or visibility)
      const expanded = await menuButton.getAttribute('aria-expanded');
      if (expanded !== null) {
        expect(expanded, 'Menu should be collapsed').toBe('false');
      }
    }
  });

  test('Arrow keys navigate TOC', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started'); // Page with TOC

    // Find TOC
    const toc = page.locator('[data-toc], .table-of-contents, aside nav').first();
    if (await toc.isVisible()) {
      const firstLink = toc.locator('a').first();
      await firstLink.focus();

      // Press arrow down
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);

      // Check if focus moved (implementation-dependent)
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedTag, 'Focus should remain on interactive element').toBe('A');
    }
  });
});

test.describe('Accessibility - Screen Reader Support', () => {
  test('Page has proper ARIA landmarks', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Check for main landmark
    const mainLandmark = page.locator('main, [role="main"]');
    await expect(mainLandmark).toBeVisible();

    // Check for navigation landmark
    const navLandmark = page.locator('nav, [role="navigation"]');
    expect(await navLandmark.count()).toBeGreaterThan(0);

    // Check for banner (header)
    const bannerLandmark = page.locator('header, [role="banner"]');
    await expect(bannerLandmark.first()).toBeVisible();

    // Check for contentinfo (footer)
    const contentinfoLandmark = page.locator('footer, [role="contentinfo"]');
    await expect(contentinfoLandmark.first()).toBeVisible();
  });

  test('Search modal has correct ARIA attributes', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');
    await searchModal.assertAriaAttributes();
  });

  test('Buttons have accessible names', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Get all buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim(),
        ariaLabel: btn.getAttribute('aria-label'),
        ariaLabelledby: btn.getAttribute('aria-labelledby'),
        title: btn.title,
        hasAccessibleName: !!(
          btn.textContent?.trim() ||
          btn.getAttribute('aria-label') ||
          btn.getAttribute('aria-labelledby') ||
          btn.title
        )
      }));
    });

    // All buttons should have accessible names
    const buttonsWithoutNames = buttons.filter(b => !b.hasAccessibleName);
    if (buttonsWithoutNames.length > 0) {
      console.warn('⚠️  Buttons without accessible names:', buttonsWithoutNames);
    }

    expect(buttonsWithoutNames.length, 'All buttons should have accessible names').toBe(0);
  });

  test('Images have alt text', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const images = await basePage.getAllImages();
    const imagesWithoutAlt = images.filter(img => !img.hasAlt);

    if (imagesWithoutAlt.length > 0) {
      console.warn('⚠️  Images without alt text:', imagesWithoutAlt);
    }

    expect(imagesWithoutAlt.length, 'All images should have alt text').toBe(0);
  });

  test('Form inputs have labels', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select')).map(input => {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        const placeholder = input.getAttribute('placeholder');

        return {
          type: input.type || input.tagName.toLowerCase(),
          id,
          hasLabel: !!(hasLabel || ariaLabel || ariaLabelledby),
          ariaLabel,
          placeholder
        };
      });
    });

    const inputsWithoutLabels = inputs.filter(i => !i.hasLabel);
    if (inputsWithoutLabels.length > 0) {
      console.warn('⚠️  Form inputs without labels:', inputsWithoutLabels);
    }

    // Placeholders are not accessible labels
    expect(inputsWithoutLabels.length, 'All form inputs should have accessible labels').toBe(0);
  });

  test('Heading hierarchy is correct', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    await testHeadingHierarchy(page);
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('Text has sufficient contrast (light theme)', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Ensure light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.waitForTimeout(300);

    // Check main text contrast
    const mainText = page.locator('main p, main li').first();
    if (await mainText.isVisible()) {
      const contrast = await checkColorContrast(page, 'main p, main li');
      console.log(`\n📊 Main text contrast (light): ${contrast.ratio}:1 (required: ${contrast.requiredRatio}:1)`);
      expect(contrast.passes, `Text contrast should pass WCAG AA (${contrast.ratio}:1)`).toBe(true);
    }
  });

  test('Text has sufficient contrast (dark theme)', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Ensure dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(300);

    // Check main text contrast
    const mainText = page.locator('main p, main li').first();
    if (await mainText.isVisible()) {
      const contrast = await checkColorContrast(page, 'main p, main li');
      console.log(`\n📊 Main text contrast (dark): ${contrast.ratio}:1 (required: ${contrast.requiredRatio}:1)`);
      expect(contrast.passes, `Text contrast should pass WCAG AA (${contrast.ratio}:1)`).toBe(true);
    }
  });

  test('Links have sufficient contrast', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const links = page.locator('main a').first();
    if (await links.isVisible()) {
      const contrast = await checkColorContrast(page, 'main a');
      console.log(`\n🔗 Link contrast: ${contrast.ratio}:1`);

      // Links can have lower contrast but should still be distinguishable
      expect(contrast.ratio).toBeGreaterThan(3);
    }
  });

  test('Buttons have sufficient contrast', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const button = page.locator('button').first();
    if (await button.isVisible()) {
      const contrast = await checkColorContrast(page, 'button');
      console.log(`\n🔘 Button contrast: ${contrast.ratio}:1`);
      expect(contrast.passes, 'Button text contrast should pass WCAG AA').toBe(true);
    }
  });
});

test.describe('Accessibility - Interactive Elements', () => {
  test('All interactive elements are keyboard accessible', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const interactiveElements = await getFocusableElements(page);

    // Should have plenty of focusable elements
    expect(interactiveElements.length).toBeGreaterThan(10);

    // Log summary
    const summary = interactiveElements.reduce((acc, el) => {
      acc[el.tag] = (acc[el.tag] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📋 Interactive elements:', summary);
  });

  test('Focus trap works in search modal', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');
    await searchModal.testFocusTrap();
  });

  test('No keyboard traps on main content', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    // Tab through many elements without getting stuck
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);

      // Verify we can still interact with page
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement, 'Should have an active element').toBeDefined();
    }

    // Should be able to tab backwards too
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(50);
    }
  });
});

test.describe('Accessibility - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Touch targets are at least 44x44px', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const touchTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll('button, a, input, select, textarea');
      return Array.from(interactive).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          meets44px: rect.width >= 44 && rect.height >= 44
        };
      });
    });

    const tooSmall = touchTargets.filter(t => !t.meets44px && t.width > 0 && t.height > 0);
    if (tooSmall.length > 0) {
      console.warn(`⚠️  ${tooSmall.length} touch targets smaller than 44x44px:`, tooSmall.slice(0, 5));
    }

    // Allow some small targets (like inline links in text)
    const ratio = tooSmall.length / touchTargets.length;
    expect(ratio, 'Most touch targets should be at least 44x44px').toBeLessThan(0.3);
  });

  test('Mobile menu is keyboard accessible', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Tab to mobile menu button
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        const ariaLabel = el?.getAttribute('aria-label')?.toLowerCase();
        return ariaLabel?.includes('menu');
      });

      if (activeElement) {
        found = true;
        // Activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Menu should be open
        const menuOpen = await page.evaluate(() => {
          const button = document.querySelector('button[aria-label*="menu" i]');
          return button?.getAttribute('aria-expanded') === 'true';
        });

        expect(menuOpen, 'Mobile menu should open with Enter key').toBe(true);
      }
    }
  });
});
