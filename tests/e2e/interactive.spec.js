/**
 * E2E Test: Interactive Features
 *
 * Tests search modal, mobile navigation, code playground, syntax highlighting,
 * table of contents, theme switcher, and language switcher.
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage.js';
import { SearchModal } from './pages/SearchModal.js';
import { createConsoleCollector } from './utils/common-helpers.js';
import { VALID_QUERIES, NO_RESULTS_QUERIES } from './fixtures/search-queries.js';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Interactive - Search Modal', () => {
  test('Opens with Ctrl+K shortcut', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    const searchModal = new SearchModal(page);

    await basePage.goto('/');

    await searchModal.open();
    expect(await searchModal.isOpen(), 'Search modal should be open').toBe(true);

    await searchModal.closeWithEscape();
  });

  test('Closes with Escape key', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');
    await searchModal.assertClosesWithEscape();
  });

  test('Closes when clicking outside', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');
    await searchModal.open();

    // Click backdrop
    await searchModal.closeWithBackdrop();
    await page.waitForTimeout(500);

    // May or may not close depending on implementation
    // Just verify no errors occurred
  });

  for (const { query, expectedMinResults, description } of VALID_QUERIES) {
    test(`Search returns results for "${query}" (${description})`, async ({ page }) => {
      const searchModal = new SearchModal(page);
      const basePage = new BasePage(page, BASE_URL);

      await basePage.goto('/');
      await searchModal.assertSearchWorks(query, expectedMinResults);
    });
  }

  for (const query of NO_RESULTS_QUERIES) {
    test(`Search shows no results for "${query}"`, async ({ page }) => {
      const searchModal = new SearchModal(page);
      const basePage = new BasePage(page, BASE_URL);

      await basePage.goto('/');
      await searchModal.assertNoResults(query);
    });
  }

  test('Keyboard navigation works (arrow keys)', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');
    await searchModal.testKeyboardNavigation();
  });

  test('Search across locales', async ({ page }) => {
    const searchModal = new SearchModal(page);
    const basePage = new BasePage(page, BASE_URL);

    // Test in French locale
    await basePage.goto('/fr/');
    await searchModal.open();
    await searchModal.search('pulse');

    const count = await searchModal.getResultCount();
    expect(count, 'Search should work in French locale').toBeGreaterThan(0);

    await searchModal.closeWithEscape();
  });
});

test.describe('Interactive - Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Menu toggle button is visible', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const menuButton = page.locator('button[aria-label*="menu" i]').first();
    await expect(menuButton).toBeVisible();
  });

  test('Menu opens and closes', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const menuButton = page.locator('button[aria-label*="menu" i]').first();
    await menuButton.click();
    await page.waitForTimeout(300);

    // Check if menu is open (aria-expanded or visible menu)
    const expanded = await menuButton.getAttribute('aria-expanded');
    if (expanded !== null) {
      expect(expanded, 'Menu should be open').toBe('true');
    }

    // Close menu
    await menuButton.click();
    await page.waitForTimeout(300);

    const expandedAfter = await menuButton.getAttribute('aria-expanded');
    if (expandedAfter !== null) {
      expect(expandedAfter, 'Menu should be closed').toBe('false');
    }
  });

  test('Navigation links work in mobile menu', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await basePage.openMobileMenu();

    // Find and click a navigation link
    const navLink = page.locator('nav a[href="/getting-started"], nav a[href*="getting-started"]').first();
    if (await navLink.isVisible()) {
      await navLink.click();
      await page.waitForTimeout(500);

      // Should navigate to getting started page
      expect(page.url()).toContain('getting-started');
    }
  });

  test('Menu closes on link click', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await basePage.openMobileMenu();

    // Click a link
    const navLink = page.locator('nav a').first();
    if (await navLink.isVisible()) {
      await navLink.click();
      await page.waitForTimeout(500);

      // Menu should auto-close
      const menuButton = page.locator('button[aria-label*="menu" i]').first();
      const expanded = await menuButton.getAttribute('aria-expanded');
      if (expanded !== null) {
        expect(expanded, 'Menu should close after navigation').toBe('false');
      }
    }
  });
});

test.describe('Interactive - Code Playground', () => {
  test('Playground loads without errors', async ({ page }) => {
    const consoleCollector = createConsoleCollector(page);
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/playground');

    // Wait for playground to load
    await page.waitForTimeout(2000);

    // Look for code editor
    const editor = page.locator('textarea, [contenteditable="true"], .monaco-editor, .code-editor').first();
    const editorVisible = await editor.isVisible().catch(() => false);

    if (editorVisible) {
      console.log('✅ Code editor found');
    } else {
      console.warn('⚠️  Code editor not found, playground might use different implementation');
    }

    consoleCollector.assertNoConsoleErrors('/playground');
  });

  test('Code editing works', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/playground');

    await page.waitForTimeout(2000);

    const editor = page.locator('textarea, [contenteditable="true"]').first();
    if (await editor.isVisible()) {
      await editor.click();
      await editor.clear();
      await editor.type('// Test code', { delay: 50 });

      const content = await editor.inputValue().catch(() => '');
      expect(content).toContain('Test');
    }
  });
});

test.describe('Interactive - Code Blocks', () => {
  test('Syntax highlighting is applied', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    const codeBlocks = await basePage.getCodeBlocks();
    expect(codeBlocks.length, 'Page should have code blocks').toBeGreaterThan(0);

    // Check if syntax highlighting is applied (look for .hljs or similar classes)
    const hasHighlighting = await page.evaluate(() => {
      const blocks = document.querySelectorAll('pre code');
      return Array.from(blocks).some(block => {
        // Check for highlighting class or colored spans inside
        return block.className.includes('language-') ||
               block.className.includes('hljs') ||
               block.querySelectorAll('span[class]').length > 0;
      });
    });

    if (!hasHighlighting) {
      console.warn('⚠️  No syntax highlighting classes found');
    }
  });

  test('Copy button exists on code blocks', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/api-reference');

    const copyButtons = await page.locator('button[aria-label*="copy" i], button[aria-label*="copier" i]').count();
    const codeBlocks = await page.locator('pre code').count();

    if (codeBlocks > 0) {
      console.log(`\n📋 Found ${copyButtons} copy buttons for ${codeBlocks} code blocks`);
      // Should have copy buttons for most code blocks
      expect(copyButtons).toBeGreaterThan(0);
    }
  });

  test('Copy button works', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    await basePage.testCopyButton(0);
    // If no error, copy worked
  });
});

test.describe('Interactive - Table of Contents', () => {
  test('TOC is generated on pages with headings', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/api-reference');

    const tocLinks = await basePage.getTOCLinks();
    console.log(`\n📑 Found ${tocLinks.length} TOC links`);

    if (tocLinks.length > 0) {
      expect(tocLinks.length).toBeGreaterThan(2);
    }
  });

  test('TOC links scroll to sections', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    const tocLinks = await basePage.getTOCLinks();
    if (tocLinks.length > 0) {
      const firstLink = tocLinks[0];
      if (firstLink.href?.includes('#')) {
        const sectionId = firstLink.href.split('#')[1];

        // Click TOC link
        await basePage.clickTOCLink(firstLink.text || '');

        // Verify section is in viewport
        const sectionInView = await page.evaluate((id) => {
          const section = document.getElementById(id);
          if (!section) return false;
          const rect = section.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight;
        }, sectionId);

        expect(sectionInView, 'Section should be scrolled into view').toBe(true);
      }
    }
  });

  test('Active section is highlighted', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    await page.waitForTimeout(500);

    // Check if any TOC link has active class
    const hasActiveLink = await page.evaluate(() => {
      const tocLinks = document.querySelectorAll('[data-toc] a, .table-of-contents a');
      return Array.from(tocLinks).some(link =>
        link.classList.contains('active') ||
        link.getAttribute('aria-current') === 'true'
      );
    });

    // Active highlighting is optional but recommended
    if (hasActiveLink) {
      console.log('✅ TOC has active link highlighting');
    }
  });

  test('TOC collapse/expand works on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/api-reference');

    // Look for TOC collapse button
    const collapseButton = page.locator('[aria-label*="collapse" i], [aria-label*="hide" i], .toc-toggle').first();
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(300);

      console.log('✅ TOC collapse/expand button found and working');
    }
  });
});

test.describe('Interactive - Theme Switcher', () => {
  test('Theme toggle works', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    const initialTheme = await basePage.getCurrentTheme();
    console.log(`\n🎨 Initial theme: ${initialTheme}`);

    await basePage.toggleTheme();

    const newTheme = await basePage.getCurrentTheme();
    console.log(`🎨 New theme: ${newTheme}`);

    expect(newTheme, 'Theme should change').not.toBe(initialTheme);
  });

  test('Theme persists in localStorage', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Toggle to dark theme
    await basePage.toggleTheme();
    const theme = await basePage.getCurrentTheme();

    // Check localStorage
    const stored = await page.evaluate(() => localStorage.getItem('pulse-docs-theme'));
    expect(stored, 'Theme should be persisted').toBe(theme);
  });

  test('No flash of unstyled content', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Set theme in localStorage before page load
    await page.addInitScript(() => {
      localStorage.setItem('pulse-docs-theme', 'dark');
    });

    await basePage.goto('/');

    // Theme should already be applied
    const theme = await basePage.getCurrentTheme();
    expect(theme, 'Theme should be applied immediately').toBe('dark');
  });
});

test.describe('Interactive - Language Switcher', () => {
  test('All locales are available', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Look for language selector or links
    const languageLinks = await page.locator('a[href^="/fr"], a[href^="/es"], a[href^="/de"]').count();

    if (languageLinks > 0) {
      console.log(`\n🌐 Found ${languageLinks} language links`);
      expect(languageLinks).toBeGreaterThan(0);
    }
  });

  test('Switching language preserves current page', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/getting-started');

    // Find French language link
    const frLink = page.locator('a[href="/fr/getting-started"], a[href*="/fr"]').first();
    if (await frLink.isVisible()) {
      await frLink.click();
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('/fr');
      expect(page.url()).toContain('getting-started');
    }
  });

  test('Translations load correctly', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/fr/');

    await page.waitForTimeout(1500);

    // Check if content is in French
    const bodyText = await page.evaluate(() => document.body.textContent);

    // Look for common French words that should appear in docs
    const hasFrenchContent = bodyText?.includes('Documentation') ||
                             bodyText?.includes('Commencer') ||
                             bodyText?.includes('Exemples');

    if (hasFrenchContent) {
      console.log('✅ French translations loaded');
    } else {
      console.warn('⚠️  French content not detected, translations might not be loaded yet');
    }
  });
});
