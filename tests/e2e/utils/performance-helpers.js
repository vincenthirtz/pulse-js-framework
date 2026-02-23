/**
 * Performance Testing Utilities
 *
 * Helpers for Core Web Vitals and Lighthouse testing.
 */

import { expect } from '@playwright/test';

/**
 * Measure Core Web Vitals
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>} Web Vitals metrics
 */
export async function measureWebVitals(page) {
  // Inject web-vitals library
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
  });

  // Collect metrics
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const results = {};
      let metricsCollected = 0;
      const totalMetrics = 5;

      function onMetric(metric) {
        results[metric.name] = {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta
        };
        metricsCollected++;

        if (metricsCollected === totalMetrics) {
          resolve(results);
        }
      }

      // Collect all Core Web Vitals
      webVitals.onCLS(onMetric);
      webVitals.onFID(onMetric);
      webVitals.onLCP(onMetric);
      webVitals.onFCP(onMetric);
      webVitals.onTTFB(onMetric);

      // Timeout after 10 seconds
      setTimeout(() => resolve(results), 10000);
    });
  });

  return {
    LCP: metrics.LCP || { value: null, rating: 'unknown' },
    FID: metrics.FID || { value: null, rating: 'unknown' },
    CLS: metrics.CLS || { value: null, rating: 'unknown' },
    FCP: metrics.FCP || { value: null, rating: 'unknown' },
    TTFB: metrics.TTFB || { value: null, rating: 'unknown' }
  };
}

/**
 * Assert Core Web Vitals pass thresholds
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} thresholds - Custom thresholds (optional)
 */
export async function assertWebVitalsPass(page, thresholds = {}) {
  const metrics = await measureWebVitals(page);

  const defaults = {
    LCP: 2500,   // 2.5s
    FID: 100,    // 100ms
    CLS: 0.1,    // 0.1
    FCP: 1800,   // 1.8s
    TTFB: 800    // 800ms
  };

  const limits = { ...defaults, ...thresholds };

  console.log('\n📊 Core Web Vitals:');
  console.log(`  LCP: ${metrics.LCP.value ? `${Math.round(metrics.LCP.value)}ms` : 'N/A'} (threshold: ${limits.LCP}ms)`);
  console.log(`  FID: ${metrics.FID.value ? `${Math.round(metrics.FID.value)}ms` : 'N/A'} (threshold: ${limits.FID}ms)`);
  console.log(`  CLS: ${metrics.CLS.value !== null ? metrics.CLS.value.toFixed(3) : 'N/A'} (threshold: ${limits.CLS})`);
  console.log(`  FCP: ${metrics.FCP.value ? `${Math.round(metrics.FCP.value)}ms` : 'N/A'} (threshold: ${limits.FCP}ms)`);
  console.log(`  TTFB: ${metrics.TTFB.value ? `${Math.round(metrics.TTFB.value)}ms` : 'N/A'} (threshold: ${limits.TTFB}ms)`);

  // Assert metrics pass thresholds
  if (metrics.LCP.value !== null) {
    expect(metrics.LCP.value, 'LCP should be under threshold').toBeLessThanOrEqual(limits.LCP);
  }
  if (metrics.CLS.value !== null) {
    expect(metrics.CLS.value, 'CLS should be under threshold').toBeLessThanOrEqual(limits.CLS);
  }
  if (metrics.FCP.value !== null) {
    expect(metrics.FCP.value, 'FCP should be under threshold').toBeLessThanOrEqual(limits.FCP);
  }
}

/**
 * Measure page load performance
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>} Performance metrics
 */
export async function measurePageLoad(page) {
  return await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    const paintData = performance.getEntriesByType('paint');

    return {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      domInteractive: perfData.domInteractive,
      firstPaint: paintData.find(p => p.name === 'first-paint')?.startTime || null,
      firstContentfulPaint: paintData.find(p => p.name === 'first-contentful-paint')?.startTime || null,
      transferSize: perfData.transferSize,
      encodedBodySize: perfData.encodedBodySize,
      decodedBodySize: perfData.decodedBodySize
    };
  });
}

/**
 * Measure resource loading performance
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>} Resource timings
 */
export async function measureResourceLoading(page) {
  return await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    return resources.map(r => ({
      name: r.name.split('/').pop(),
      type: r.initiatorType,
      duration: Math.round(r.duration),
      transferSize: r.transferSize,
      startTime: Math.round(r.startTime)
    })).sort((a, b) => b.duration - a.duration);
  });
}

/**
 * Check bundle sizes
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} limits - Size limits in bytes
 */
export async function assertBundleSizes(page, limits = {}) {
  const resources = await measureResourceLoading(page);

  const defaults = {
    js: 200 * 1024,   // 200KB
    css: 50 * 1024,   // 50KB
    total: 500 * 1024 // 500KB
  };

  const thresholds = { ...defaults, ...limits };

  // Calculate totals by type
  const jsTotalSize = resources
    .filter(r => r.type === 'script')
    .reduce((sum, r) => sum + r.transferSize, 0);

  const cssTotalSize = resources
    .filter(r => r.type === 'link' || r.name.endsWith('.css'))
    .reduce((sum, r) => sum + r.transferSize, 0);

  const totalSize = resources.reduce((sum, r) => sum + r.transferSize, 0);

  console.log('\n📦 Bundle Sizes:');
  console.log(`  JS: ${formatBytes(jsTotalSize)} (limit: ${formatBytes(thresholds.js)})`);
  console.log(`  CSS: ${formatBytes(cssTotalSize)} (limit: ${formatBytes(thresholds.css)})`);
  console.log(`  Total: ${formatBytes(totalSize)} (limit: ${formatBytes(thresholds.total)})`);

  // Assertions
  expect(jsTotalSize, 'JS bundle size should be under limit').toBeLessThanOrEqual(thresholds.js);
  expect(cssTotalSize, 'CSS bundle size should be under limit').toBeLessThanOrEqual(thresholds.css);
  expect(totalSize, 'Total bundle size should be under limit').toBeLessThanOrEqual(thresholds.total);
}

/**
 * Check for render-blocking resources
 *
 * @param {import('@playwright/test').Page} page
 */
export async function assertNoRenderBlockingResources(page) {
  const renderBlockers = await page.evaluate(() => {
    const blockers = [];

    // Check for render-blocking stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (!link.hasAttribute('media') || link.getAttribute('media') === 'all') {
        if (!link.hasAttribute('as') || link.getAttribute('as') !== 'style') {
          blockers.push({
            type: 'stylesheet',
            href: link.href
          });
        }
      }
    });

    // Check for render-blocking scripts
    document.querySelectorAll('script[src]').forEach(script => {
      if (!script.hasAttribute('async') && !script.hasAttribute('defer')) {
        blockers.push({
          type: 'script',
          src: script.src
        });
      }
    });

    return blockers;
  });

  if (renderBlockers.length > 0) {
    console.warn('⚠️  Render-blocking resources found:');
    renderBlockers.forEach(blocker => {
      console.warn(`  ${blocker.type}: ${blocker.href || blocker.src}`);
    });
  }

  // Optional: fail if critical resources are render-blocking
  // expect(renderBlockers.length, 'Should have no render-blocking resources').toBe(0);
}

/**
 * Measure JavaScript execution time
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>} Total JS execution time in ms
 */
export async function measureJSExecutionTime(page) {
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      scripting: perfData.domInteractive - perfData.domLoading,
      rendering: perfData.domComplete - perfData.domInteractive
    };
  });

  return metrics.scripting;
}

/**
 * Check for memory leaks (simple check)
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>} Memory info
 */
export async function checkMemoryUsage(page) {
  if (!page.context().browser()) return null;

  const metrics = await page.evaluate(() => {
    if (!performance.memory) return null;

    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    };
  });

  if (metrics) {
    console.log('\n💾 Memory Usage:');
    console.log(`  Used: ${formatBytes(metrics.usedJSHeapSize)}`);
    console.log(`  Total: ${formatBytes(metrics.totalJSHeapSize)}`);
    console.log(`  Limit: ${formatBytes(metrics.jsHeapSizeLimit)}`);
    console.log(`  Usage: ${metrics.usedPercentage.toFixed(1)}%`);
  }

  return metrics;
}

/**
 * Format bytes to human-readable string
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Run Lighthouse audit
 * NOTE: Requires playwright-lighthouse package
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {object} thresholds - Score thresholds (0-100)
 */
export async function runLighthouseAudit(page, url, thresholds = {}) {
  try {
    // Dynamic import to avoid hard dependency
    const { playAudit } = await import('playwright-lighthouse');

    const defaults = {
      performance: 90,
      accessibility: 95,
      'best-practices': 90,
      seo: 95
    };

    const limits = { ...defaults, ...thresholds };

    await playAudit({
      page,
      url,
      thresholds: limits,
      reports: {
        formats: {
          html: true
        },
        directory: 'lighthouse-reports'
      }
    });

    console.log('\n🚦 Lighthouse audit passed!');
  } catch (error) {
    if (error.message?.includes('Cannot find module')) {
      console.warn('⚠️  playwright-lighthouse not installed, skipping Lighthouse audit');
      console.warn('   Install with: npm install -D playwright-lighthouse');
    } else {
      throw error;
    }
  }
}
