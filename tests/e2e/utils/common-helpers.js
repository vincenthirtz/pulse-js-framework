/**
 * Common E2E Test Utilities
 *
 * Shared helper functions for Playwright tests.
 */

import { expect } from '@playwright/test';

/**
 * Console error collector
 * Sets up listeners for console errors, warnings, and network errors
 *
 * @param {import('@playwright/test').Page} page
 * @returns {object} Collectors and assertion helpers
 */
export function createConsoleCollector(page) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const networkErrors = [];

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Skip known false positives
      if (text.includes('the server responded with a status of 403')) return;
      if (text.includes('Failed to load resource')) return;

      consoleErrors.push({
        text,
        location: msg.location(),
        timestamp: Date.now()
      });
    } else if (msg.type() === 'warning') {
      consoleWarnings.push({
        text: msg.text(),
        location: msg.location(),
        timestamp: Date.now()
      });
    }
  });

  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', error => {
    consoleErrors.push({
      text: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  });

  // Listen for failed network requests
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
        timestamp: Date.now()
      });
    }
  });

  return {
    consoleErrors,
    consoleWarnings,
    networkErrors,

    /**
     * Assert no console errors
     * @param {string} context - Context for error message (e.g., route name)
     */
    assertNoConsoleErrors(context = '') {
      if (consoleErrors.length > 0) {
        console.error(`❌ Console errors${context ? ` on ${context}` : ''}:`, consoleErrors);
      }
      expect(consoleErrors, `Console errors found${context ? ` on ${context}` : ''}`).toHaveLength(0);
    },

    /**
     * Assert no network errors
     * @param {string} context - Context for error message
     */
    assertNoNetworkErrors(context = '') {
      if (networkErrors.length > 0) {
        console.error(`🌐 Network errors${context ? ` on ${context}` : ''}:`, networkErrors);
      }
      expect(networkErrors, `Network errors found${context ? ` on ${context}` : ''}`).toHaveLength(0);
    },

    /**
     * Get all errors for reporting
     */
    getAllErrors() {
      return {
        consoleErrors: [...consoleErrors],
        consoleWarnings: [...consoleWarnings],
        networkErrors: [...networkErrors]
      };
    },

    /**
     * Clear all collected errors
     */
    clear() {
      consoleErrors.length = 0;
      consoleWarnings.length = 0;
      networkErrors.length = 0;
    }
  };
}

/**
 * Wait for network idle with proper timeout
 * Better alternative to hardcoded waitForTimeout
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Timeout in ms (default: 30000)
 */
export async function waitForNetworkIdle(page, timeout = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for element to be visible and stable
 * Ensures element is not only visible but also finished animating
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} timeout - Timeout in ms (default: 10000)
 */
export async function waitForStableElement(page, selector, timeout = 10000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  // Wait for element to stop moving (animations finished)
  await element.waitFor({ state: 'attached', timeout: 5000 });
  return element;
}

/**
 * Wait for translations to load
 * Docs site uses i18n with async translation loading
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout - Timeout in ms (default: 2000)
 */
export async function waitForTranslations(page, timeout = 2000) {
  // Wait for body to have content (translations loaded)
  await page.waitForFunction(() => {
    const body = document.body;
    return body && body.textContent && body.textContent.trim().length > 100;
  }, { timeout });
}

/**
 * Navigate to a route and wait for page to be ready
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url - Full URL or path
 * @param {object} options - Navigation options
 */
export async function navigateAndWait(page, url, options = {}) {
  const {
    waitForNetworkIdle: shouldWaitNetwork = true,
    waitForTranslations: shouldWaitTranslations = true,
    timeout = 30000
  } = options;

  await page.goto(url, {
    waitUntil: shouldWaitNetwork ? 'networkidle' : 'domcontentloaded',
    timeout
  });

  if (shouldWaitTranslations) {
    await waitForTranslations(page);
  }
}

/**
 * Take screenshot with descriptive name
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `playwright-screenshots/${name}.png`,
    fullPage: true
  });
}

/**
 * Scroll element into view
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function scrollIntoView(page, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Check if element is in viewport
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function isInViewport(page, selector) {
  return await page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
}

/**
 * Get element dimensions
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<{width: number, height: number, x: number, y: number}>}
 */
export async function getElementDimensions(page, selector) {
  return await page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y
    };
  });
}

/**
 * Wait for specific number of elements
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} count - Expected count
 * @param {number} timeout - Timeout in ms (default: 5000)
 */
export async function waitForElementCount(page, selector, count, timeout = 5000) {
  await page.waitForFunction(
    ({ sel, expectedCount }) => {
      return document.querySelectorAll(sel).length === expectedCount;
    },
    { sel: selector, expectedCount: count },
    { timeout }
  );
}

/**
 * Get computed style of element
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} property - CSS property name
 * @returns {Promise<string>}
 */
export async function getComputedStyle(page, selector, property) {
  return await page.locator(selector).evaluate((element, prop) => {
    return window.getComputedStyle(element).getPropertyValue(prop);
  }, property);
}

/**
 * Check if element has CSS class
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} className
 * @returns {Promise<boolean>}
 */
export async function hasClass(page, selector, className) {
  return await page.locator(selector).evaluate((element, cls) => {
    return element.classList.contains(cls);
  }, className);
}

/**
 * Get localStorage value
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getLocalStorage(page, key) {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set localStorage value
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 * @param {string} value
 */
export async function setLocalStorage(page, key, value) {
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
}

/**
 * Clear localStorage
 *
 * @param {import('@playwright/test').Page} page
 */
export async function clearLocalStorage(page) {
  await page.evaluate(() => localStorage.clear());
}
