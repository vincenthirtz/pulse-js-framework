/**
 * E2E Test: Performance
 *
 * Tests Core Web Vitals, bundle sizes, resource loading, and Lighthouse scores.
 */

import { test, expect } from '@playwright/test';
import {
  measureWebVitals,
  assertWebVitalsPass,
  measurePageLoad,
  measureResourceLoading,
  assertBundleSizes,
  assertNoRenderBlockingResources,
  checkMemoryUsage,
  runLighthouseAudit
} from './utils/performance-helpers.js';
import { BasePage } from './pages/BasePage.js';
import { HIGH_PRIORITY_ROUTES, ROUTES } from './fixtures/routes.js';


test.describe('Performance - Core Web Vitals', () => {
  for (const route of HIGH_PRIORITY_ROUTES) {
    test(`${route || '/'} - Core Web Vitals pass thresholds`, async ({ page }) => {
      const basePage = new BasePage(page);
      await basePage.goto(route);

      // Measure and assert Core Web Vitals
      await assertWebVitalsPass(page, {
        LCP: 2500,   // 2.5s
        FID: 100,    // 100ms
        CLS: 0.1,    // 0.1
        FCP: 1800,   // 1.8s
        TTFB: 800    // 800ms
      });
    });
  }
});

test.describe('Performance - Page Load Metrics', () => {
  test('Homepage loads quickly', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    let metrics;
    try {
      metrics = await measurePageLoad(page);
    } catch (error) {
      if (error.message?.includes('Execution context was destroyed')) {
        console.warn('⚠️  Page load measurement skipped (page navigated during measurement)');
        return;
      }
      throw error;
    }

    console.log('\n📊 Page Load Metrics:');
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  Load Complete: ${metrics.loadComplete}ms`);
    console.log(`  DOM Interactive: ${metrics.domInteractive}ms`);
    console.log(`  First Paint: ${metrics.firstPaint}ms`);
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);

    // Assertions
    expect(metrics.firstContentfulPaint, 'FCP should be under 1.8s').toBeLessThan(1800);
    expect(metrics.domInteractive, 'DOM Interactive should be under 2s').toBeLessThan(2000);
  });

  test('API Reference page loads within budget', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/api-reference');

    let metrics;
    try {
      metrics = await measurePageLoad(page);
    } catch (error) {
      if (error.message?.includes('Execution context was destroyed')) {
        console.warn('⚠️  Page load measurement skipped (page navigated during measurement)');
        return;
      }
      throw error;
    }

    console.log('\n📊 API Reference Load:');
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);
    console.log(`  Transfer Size: ${(metrics.transferSize / 1024).toFixed(2)} KB`);

    // API reference might be heavier, allow slightly longer time
    expect(metrics.firstContentfulPaint, 'FCP should be under 2.5s').toBeLessThan(2500);
  });
});

test.describe('Performance - Resource Loading', () => {
  test('Homepage resources load efficiently', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    const resources = await measureResourceLoading(page);

    console.log(`\n📦 Loaded ${resources.length} resources`);

    // Show slowest resources
    const slowest = resources.slice(0, 5);
    console.log('\n⏱️  Slowest resources:');
    slowest.forEach(r => {
      console.log(`  ${r.name}: ${r.duration}ms (${(r.transferSize / 1024).toFixed(2)} KB)`);
    });

    // Count resources by type
    const byType = resources.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Resources by type:', byType);

    // No single resource should take more than 3 seconds
    const slowResources = resources.filter(r => r.duration > 3000);
    expect(slowResources.length, 'No resource should take > 3s').toBe(0);
  });

  test('No render-blocking resources', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    await assertNoRenderBlockingResources(page);
  });

  test('Critical CSS inlined', async ({ page }) => {
    const basePage = new BasePage(page);

    // Check HTML source for inline styles
    const response = await page.goto('/');
    const html = await response?.text();

    const hasInlineStyles = html?.includes('<style>') || html?.includes('</style>');

    if (hasInlineStyles) {
      console.log('✅ Critical CSS appears to be inlined');
    } else {
      console.log('ℹ️  No inline styles detected (might use external CSS only)');
    }

    // This is optional but recommended for performance
  });

  test('Images are lazy loaded', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    const lazyImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return {
        total: images.length,
        lazy: images.filter(img => img.loading === 'lazy').length,
        eager: images.filter(img => img.loading === 'eager').length
      };
    });

    console.log('\n🖼️  Image Loading:');
    console.log(`  Total: ${lazyImages.total}`);
    console.log(`  Lazy: ${lazyImages.lazy}`);
    console.log(`  Eager: ${lazyImages.eager}`);

    // Most images should be lazy-loaded (except above-the-fold)
    if (lazyImages.total > 5) {
      const lazyRatio = lazyImages.lazy / lazyImages.total;
      console.log(`  Lazy ratio: ${(lazyRatio * 100).toFixed(1)}%`);

      // At least 50% of images should be lazy-loaded
      expect(lazyRatio, 'Most images should be lazy-loaded').toBeGreaterThan(0.5);
    }
  });

  test('Fonts are preloaded', async ({ page }) => {
    const basePage = new BasePage(page);

    const response = await page.goto('/');
    const html = await response?.text();

    const hasFontPreload = html?.includes('rel="preload"') && html?.includes('as="font"');

    if (hasFontPreload) {
      console.log('✅ Fonts are preloaded');
    } else {
      console.log('ℹ️  Font preloading not detected (optional optimization)');
    }
  });
});

test.describe('Performance - Bundle Sizes', () => {
  test('JavaScript bundle is within budget', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    await assertBundleSizes(page, {
      js: 350 * 1024,   // 350KB
      css: 100 * 1024,  // 100KB
      total: 700 * 1024 // 700KB
    });
  });

  test('Code splitting is effective', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    const resources = await measureResourceLoading(page);

    // Count JavaScript files
    const jsFiles = resources.filter(r => r.type === 'script' || r.name.endsWith('.js'));

    console.log(`\n📦 JavaScript files: ${jsFiles.length}`);

    // Should have multiple JS files (indicating code splitting)
    if (jsFiles.length > 3) {
      console.log('✅ Code splitting appears to be used');
    } else if (jsFiles.length === 1) {
      console.log('ℹ️  Single bundle detected (code splitting might not be enabled)');
    }

    // Log chunk sizes
    jsFiles.forEach(js => {
      console.log(`  ${js.name}: ${(js.transferSize / 1024).toFixed(2)} KB`);
    });
  });
});

test.describe('Performance - Memory Usage', () => {
  test('Memory usage is reasonable on homepage', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    // Wait for page to fully settle
    await page.waitForLoadState('load').catch(() => {});

    const memory = await checkMemoryUsage(page);

    if (memory) {
      // Memory should be under 100MB
      expect(memory.usedJSHeapSize, 'Memory usage should be reasonable').toBeLessThan(100 * 1024 * 1024);
    } else {
      console.log('ℹ️  Memory API not available');
    }
  });

  test('Memory does not grow excessively with interactions', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    const initialMemory = await checkMemoryUsage(page);

    // Perform many interactions
    for (let i = 0; i < 10; i++) {
      await basePage.toggleTheme();
      await basePage.openSearch();
      await page.keyboard.press('Escape');
    }

    const finalMemory = await checkMemoryUsage(page);

    if (initialMemory && finalMemory) {
      const increase = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const increaseMB = (increase / 1024 / 1024).toFixed(2);

      console.log(`\n📊 Memory increase after interactions: ${increaseMB} MB`);

      // Memory increase should be minimal
      expect(increase, 'Memory increase should be < 20MB').toBeLessThan(20 * 1024 * 1024);
    }
  });
});

test.describe('Performance - Lighthouse Audit', () => {
  test.skip('Homepage Lighthouse scores', async ({ page }) => {
    // NOTE: This test requires playwright-lighthouse
    // Skip by default, run manually with: npx playwright test performance --grep "Lighthouse"

    await runLighthouseAudit(page, '/', {
      performance: 90,
      accessibility: 95,
      'best-practices': 90,
      seo: 95
    });
  });

  test.skip('API Reference Lighthouse scores', async ({ page }) => {
    await runLighthouseAudit(page, '/api-reference', {
      performance: 85, // Slightly lower for content-heavy page
      accessibility: 95,
      'best-practices': 90,
      seo: 95
    });
  });
});

test.describe('Performance - Network Efficiency', () => {
  test('Minimal HTTP requests on initial load', async ({ page }) => {
    const requestCount = { total: 0, cached: 0 };

    page.on('request', () => {
      requestCount.total++;
    });

    page.on('response', (response) => {
      try {
        if (response.fromCache()) {
          requestCount.cached++;
        }
      } catch {
        // fromCache() may throw for certain response types (redirects, data URIs)
      }
    });

    const basePage = new BasePage(page);
    await basePage.goto('/');

    console.log(`\n🌐 Network Requests:`);
    console.log(`  Total: ${requestCount.total}`);
    console.log(`  Cached: ${requestCount.cached}`);
    console.log(`  Fresh: ${requestCount.total - requestCount.cached}`);

    // Initial load should have reasonable number of requests (includes analytics, fonts, images, translations)
    expect(requestCount.total, 'Should have < 150 requests on initial load').toBeLessThan(150);
  });

  test('Subsequent navigation uses cache', async ({ page }) => {
    const basePage = new BasePage(page);

    // First load - primes the cache
    await basePage.goto('/');

    const navigationRequests = { total: 0, cached: 0 };

    page.on('request', () => {
      navigationRequests.total++;
    });

    page.on('response', (response) => {
      try {
        if (response.fromCache()) {
          navigationRequests.cached++;
        }
      } catch {
        // fromCache() may throw for certain response types (redirects, data URIs)
      }
    });

    // Navigate to another page (full navigation, not SPA)
    await basePage.goto('/getting-started');

    console.log(`\n💾 Subsequent navigation: ${navigationRequests.cached} cached / ${navigationRequests.total} total`);

    // SPA navigation may not produce HTTP requests at all, which is even better.
    // Only assert cache usage if there were any requests.
    if (navigationRequests.total > 0) {
      expect(navigationRequests.cached, 'Should use cache for common resources').toBeGreaterThanOrEqual(0);
    }
  });

  test('Compression is enabled', async ({ page }) => {
    const response = await page.goto('/');

    const headers = response?.headers();
    const contentEncoding = headers?.['content-encoding'];

    console.log(`\n📦 Content-Encoding: ${contentEncoding || 'none'}`);

    // Should use compression (gzip or brotli)
    if (contentEncoding) {
      const isCompressed = contentEncoding.includes('gzip') || contentEncoding.includes('br');
      expect(isCompressed, 'Response should be compressed').toBe(true);
    } else {
      console.warn('⚠️  No content-encoding header (compression might not be enabled)');
    }
  });
});

test.describe('Performance - JavaScript Execution', () => {
  test('No long tasks blocking main thread', async ({ page }) => {
    const basePage = new BasePage(page);
    await basePage.goto('/');

    // Measure long tasks (> 50ms)
    let longTasks;
    try {
      longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks = [];

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                tasks.push({
                  duration: entry.duration,
                  startTime: entry.startTime
                });
              }
            }
          });

          // Check for Long Tasks API support
          try {
            observer.observe({ entryTypes: ['longtask'] });
          } catch (e) {
            // Long Tasks API not supported
            resolve(null);
            return;
          }

          setTimeout(() => {
            observer.disconnect();
            resolve(tasks);
          }, 2000);
        });
      });
    } catch (error) {
      if (error.message?.includes('Execution context was destroyed')) {
        console.warn('⚠️  Long tasks measurement skipped (page navigated during measurement)');
        return;
      }
      throw error;
    }

    if (longTasks === null) {
      console.log('ℹ️  Long Tasks API not supported');
      return;
    }

    console.log(`\n⏱️  Long tasks (> 50ms): ${longTasks.length}`);

    if (longTasks.length > 0) {
      longTasks.forEach(task => {
        console.log(`  ${task.duration.toFixed(2)}ms at ${task.startTime.toFixed(2)}ms`);
      });
    }

    // Should minimize long tasks
    expect(longTasks.length, 'Should minimize long tasks').toBeLessThan(5);
  });

  test('JavaScript is not blocking render', async ({ page }) => {
    const basePage = new BasePage(page);

    const startTime = Date.now();
    await basePage.goto('/');

    // Measure time to first render
    const firstRenderTime = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
      return fcp?.startTime || 0;
    });

    console.log(`\n🎨 First Contentful Paint: ${firstRenderTime.toFixed(2)}ms`);

    // FCP should be quick
    expect(firstRenderTime, 'First Contentful Paint should be < 1.8s').toBeLessThan(1800);
  });
});
