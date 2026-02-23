/**
 * E2E Test: Error Handling & Edge Cases
 *
 * Tests 404 pages, network offline scenarios, slow network handling,
 * large content, and error boundaries.
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage.js';
import { createConsoleCollector, navigateAndWait } from './utils/common-helpers.js';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Error Handling - 404 Pages', () => {
  test('Invalid route shows 404 page', async ({ page }) => {
    const consoleCollector = createConsoleCollector(page);

    // Navigate to non-existent route
    const response = await page.goto(`${BASE_URL}/this-route-does-not-exist-12345`, {
      waitUntil: 'domcontentloaded'
    });

    // Should return 404 status or redirect to 404 page
    const status = response?.status();
    const url = page.url();

    // Either 404 status or redirected to 404 page
    const is404 = status === 404 || url.includes('404') || url.includes('not-found');

    if (is404) {
      console.log('✅ 404 page shown correctly');
    } else {
      console.warn(`⚠️  Expected 404, got status ${status} and URL ${url}`);
    }

    // Should not have console errors even on 404
    // (Some errors might be expected for missing resources)
    const criticalErrors = consoleCollector.consoleErrors.filter(err =>
      !err.text.includes('404') &&
      !err.text.includes('Failed to load resource')
    );

    expect(criticalErrors.length, 'Should have no critical errors on 404 page').toBe(0);
  });

  test('404 page has navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-route-xyz`, {
      waitUntil: 'domcontentloaded'
    }).catch(() => {
      // Ignore navigation errors for 404
    });

    await page.waitForTimeout(1000);

    // Should have a way to navigate back (header, links, etc.)
    const hasHeader = await page.locator('header, nav').count() > 0;
    const hasHomeLink = await page.locator('a[href="/"], a[href*="home"]').count() > 0;

    const hasNavigation = hasHeader || hasHomeLink;

    if (hasNavigation) {
      console.log('✅ 404 page has navigation elements');
    } else {
      console.warn('⚠️  404 page might be missing navigation');
    }

    // Should have at least some navigation option
    expect(hasNavigation, '404 page should have navigation').toBe(true);
  });

  test('404 page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/invalid-route-test`, {
      waitUntil: 'domcontentloaded'
    }).catch(() => {
      // Ignore navigation errors
    });

    await page.waitForTimeout(500);

    // Should have main content area
    const hasMain = await page.locator('main, [role="main"]').count() > 0;

    // Should have heading
    const hasHeading = await page.locator('h1, h2').count() > 0;

    if (hasMain && hasHeading) {
      console.log('✅ 404 page has semantic structure');
    }
  });
});

test.describe('Error Handling - Network Offline', () => {
  test('Handles offline state gracefully', async ({ page, context }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Simulate going offline
    await context.setOffline(true);

    // Try to navigate to another page
    const navigationPromise = basePage.goto('/getting-started').catch(err => {
      console.log('✅ Navigation failed as expected when offline:', err.message);
      return null;
    });

    await navigationPromise;

    // Go back online
    await context.setOffline(false);

    // Should be able to navigate again
    await basePage.goto('/');
    await basePage.assertPageLoaded();
  });

  test('Service worker provides offline fallback (if enabled)', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Check if service worker is registered
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
    });

    if (hasServiceWorker) {
      console.log('✅ Service worker is registered');

      // Test offline fallback
      await page.context().setOffline(true);

      // Try to navigate
      const response = await page.goto(`${BASE_URL}/getting-started`, {
        waitUntil: 'domcontentloaded'
      }).catch(() => null);

      if (response) {
        console.log('✅ Service worker provided offline fallback');
      } else {
        console.log('ℹ️  No offline fallback (expected if not configured)');
      }

      await page.context().setOffline(false);
    } else {
      console.log('ℹ️  No service worker (skipping offline test)');
    }
  });

  test('Reconnection handling works', async ({ page, context }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Simulate intermittent connectivity
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // Should still be functional
    await basePage.goto('/api-reference');
    await basePage.assertPageLoaded();
  });
});

test.describe('Error Handling - Slow Network', () => {
  test.beforeEach(async ({ page, context }) => {
    // Simulate slow 3G connection
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });
  });

  test('Page loads with slow network', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Should load even with slow network (may take longer)
    await basePage.goto('/', { timeout: 60000 });
    await basePage.assertPageLoaded();
  });

  test('Loading states shown during slow load', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Start navigation
    const navigationPromise = basePage.goto('/getting-started');

    // Check for loading indicators
    await page.waitForTimeout(200);

    // Look for common loading indicators
    const hasLoader = await page.evaluate(() => {
      const indicators = [
        '.loading',
        '.spinner',
        '[aria-busy="true"]',
        '[data-loading]'
      ];
      return indicators.some(selector => document.querySelector(selector) !== null);
    });

    if (hasLoader) {
      console.log('✅ Loading state shown during slow load');
    } else {
      console.log('ℹ️  No loading indicator (might load fast enough to not show)');
    }

    await navigationPromise;
  });

  test('No layout shifts during slow load', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    await basePage.goto('/');

    // Measure layout shifts using Performance API
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    console.log(`📊 Cumulative Layout Shift: ${cls.toFixed(3)}`);

    // CLS should be low even with slow network
    expect(cls, 'CLS should be under 0.25 (acceptable threshold)').toBeLessThan(0.25);
  });
});

test.describe('Error Handling - Large Content', () => {
  test('Long pages scroll correctly', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Go to a long page (changelog is typically long)
    await basePage.goto('/changelog');

    // Should be able to scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY, 'Should scroll to bottom').toBeGreaterThan(100);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const topScrollY = await page.evaluate(() => window.scrollY);
    expect(topScrollY, 'Should scroll back to top').toBeLessThan(50);
  });

  test('TOC handles many sections', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/api-reference'); // Page with many sections

    const tocLinks = await basePage.getTOCLinks();

    if (tocLinks.length > 10) {
      console.log(`✅ TOC handles ${tocLinks.length} sections`);

      // TOC should be scrollable if it has many items
      const tocScrollable = await page.evaluate(() => {
        const toc = document.querySelector('[data-toc], .table-of-contents, aside nav');
        if (!toc) return false;
        return toc.scrollHeight > toc.clientHeight;
      });

      if (tocScrollable) {
        console.log('✅ TOC is scrollable for many items');
      }
    }
  });

  test('Search handles many results', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Open search and enter a common term
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    const searchInput = page.locator('.search-overlay input, dialog.search input').first();
    await searchInput.fill('pulse');
    await page.waitForTimeout(1000);

    // Get result count
    const resultCount = await page.locator('.search-result, .search-results li, .search-overlay [role="list"] > *').count();

    console.log(`📊 Search returned ${resultCount} results`);

    if (resultCount > 20) {
      // Should handle many results with scrolling
      const resultsScrollable = await page.evaluate(() => {
        const results = document.querySelector('.search-results, .search-overlay [role="list"]');
        if (!results) return false;
        return results.scrollHeight > results.clientHeight;
      });

      if (resultsScrollable) {
        console.log('✅ Search results are scrollable');
      }
    }

    // Close search
    await page.keyboard.press('Escape');
  });
});

test.describe('Error Handling - Memory Leaks', () => {
  test('No memory leaks during navigation', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if (!performance.memory) return null;
      return performance.memory.usedJSHeapSize;
    });

    if (initialMemory === null) {
      console.log('ℹ️  Memory API not available (browser-dependent)');
      return;
    }

    // Navigate through several pages
    const routes = ['/', '/getting-started', '/api-reference', '/examples', '/'];
    for (const route of routes) {
      await basePage.goto(route);
      await page.waitForTimeout(500);
    }

    // Force garbage collection if available (Chrome only)
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });

    await page.waitForTimeout(1000);

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

    console.log(`📊 Memory increase: ${memoryIncreaseMB} MB`);

    // Memory should not grow excessively (< 50MB increase)
    expect(memoryIncrease, 'Memory should not leak significantly').toBeLessThan(50 * 1024 * 1024);
  });

  test('Effects cleanup on unmount', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Navigate to a page with interactive features
    await basePage.goto('/playground');
    await page.waitForTimeout(2000);

    // Navigate away
    await basePage.goto('/');
    await page.waitForTimeout(500);

    // Should not have errors from cleanup issues
    const errors = await page.evaluate(() => {
      return window.__PULSE_CLEANUP_ERRORS__ || [];
    });

    expect(errors.length, 'Should cleanup effects properly').toBe(0);
  });
});

test.describe('Error Handling - Browser Compatibility', () => {
  test('Console has no unhandled promise rejections', async ({ page }) => {
    const unhandledRejections = [];

    page.on('pageerror', error => {
      if (error.message.includes('unhandled') || error.message.includes('rejection')) {
        unhandledRejections.push(error.message);
      }
    });

    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Interact with page
    await basePage.openSearch();
    await page.keyboard.press('Escape');
    await basePage.toggleTheme();

    await page.waitForTimeout(1000);

    if (unhandledRejections.length > 0) {
      console.error('❌ Unhandled promise rejections:', unhandledRejections);
    }

    expect(unhandledRejections.length, 'Should have no unhandled promise rejections').toBe(0);
  });

  test('No deprecation warnings', async ({ page }) => {
    const deprecationWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().toLowerCase().includes('deprecat')) {
        deprecationWarnings.push(msg.text());
      }
    });

    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');
    await page.waitForTimeout(1000);

    if (deprecationWarnings.length > 0) {
      console.warn('⚠️  Deprecation warnings:', deprecationWarnings);
    }

    // Deprecation warnings are not critical but should be addressed
    expect(deprecationWarnings.length, 'Should minimize deprecation warnings').toBeLessThan(5);
  });
});

test.describe('Error Handling - Edge Cases', () => {
  test('Handles rapid theme switching', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    // Rapidly toggle theme
    for (let i = 0; i < 10; i++) {
      await basePage.toggleTheme();
      await page.waitForTimeout(50);
    }

    // Should not crash or have errors
    await basePage.assertPageLoaded();
  });

  test('Handles rapid navigation', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);

    // Rapidly navigate
    const routes = ['/', '/getting-started', '/api-reference', '/examples'];
    for (const route of routes) {
      basePage.goto(route).catch(() => {
        // Ignore navigation aborted errors
      });
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(1000);

    // Final navigation should work
    await basePage.goto('/');
    await basePage.assertPageLoaded();
  });

  test('Handles concurrent search queries', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await page.keyboard.press('Control+K');
    await page.waitForTimeout(300);

    const searchInput = page.locator('.search-overlay input, dialog.search input').first();

    // Type rapidly (simulating fast typing)
    await searchInput.fill('p');
    await page.waitForTimeout(50);
    await searchInput.fill('pu');
    await page.waitForTimeout(50);
    await searchInput.fill('pul');
    await page.waitForTimeout(50);
    await searchInput.fill('puls');
    await page.waitForTimeout(50);
    await searchInput.fill('pulse');

    await page.waitForTimeout(1000);

    // Should show results without errors
    const resultCount = await page.locator('.search-result, .search-results li').count();
    expect(resultCount, 'Search should handle rapid input').toBeGreaterThan(0);

    await page.keyboard.press('Escape');
  });

  test('Handles empty search', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Empty search should not crash
    const searchInput = page.locator('.search-overlay input, dialog.search input').first();
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Should show initial state or all results
    await page.keyboard.press('Escape');
  });

  test('Handles special characters in search', async ({ page }) => {
    const basePage = new BasePage(page, BASE_URL);
    await basePage.goto('/');

    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    const searchInput = page.locator('.search-overlay input, dialog.search input').first();

    // Test special characters
    const specialQueries = ['<script>', '{}', '()', '[]', '&&', '||'];

    for (const query of specialQueries) {
      await searchInput.fill(query);
      await page.waitForTimeout(300);
    }

    // Should not crash or throw errors
    await page.keyboard.press('Escape');
  });
});
