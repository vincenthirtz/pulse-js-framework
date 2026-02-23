/**
 * Accessibility Testing Utilities
 *
 * Helpers for WCAG 2.1 AA compliance testing using axe-core.
 */

import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run axe accessibility scan on page
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} options - Axe options
 * @returns {Promise<object>} Axe results
 */
export async function runAxeScan(page, options = {}) {
  const {
    rules = {},
    tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    exclude = []
  } = options;

  let builder = new AxeBuilder({ page })
    .withTags(tags);

  // Apply custom rules if provided
  if (Object.keys(rules).length > 0) {
    builder = builder.options({ rules });
  }

  // Exclude selectors if provided
  for (const selector of exclude) {
    builder = builder.exclude(selector);
  }

  return await builder.analyze();
}

/**
 * Assert no critical accessibility violations
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} context - Context for error message (e.g., route name)
 * @param {object} options - Axe options
 */
export async function assertNoA11yViolations(page, context = '', options = {}) {
  const results = await runAxeScan(page, options);

  // Categorize violations by impact
  const critical = results.violations.filter(v => v.impact === 'critical');
  const serious = results.violations.filter(v => v.impact === 'serious');
  const moderate = results.violations.filter(v => v.impact === 'moderate');
  const minor = results.violations.filter(v => v.impact === 'minor');

  if (results.violations.length > 0) {
    console.error(`\n❌ A11y violations${context ? ` on ${context}` : ''}:`);
    console.error(`  Critical: ${critical.length}`);
    console.error(`  Serious: ${serious.length}`);
    console.error(`  Moderate: ${moderate.length}`);
    console.error(`  Minor: ${minor.length}`);

    // Log details of critical and serious violations
    [...critical, ...serious].forEach(violation => {
      console.error(`\n  ${violation.impact.toUpperCase()}: ${violation.id}`);
      console.error(`  ${violation.description}`);
      console.error(`  Help: ${violation.helpUrl}`);
      console.error(`  Affected elements: ${violation.nodes.length}`);
      violation.nodes.slice(0, 3).forEach(node => {
        console.error(`    - ${node.html.substring(0, 100)}...`);
      });
    });
  }

  // Fail on critical violations
  expect(critical, `Critical a11y violations found${context ? ` on ${context}` : ''}`).toHaveLength(0);
}

/**
 * Get keyboard focusable elements
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array>}
 */
export async function getFocusableElements(page) {
  return await page.evaluate(() => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');

    return Array.from(document.querySelectorAll(selector))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        class: el.className,
        tabindex: el.getAttribute('tabindex'),
        ariaLabel: el.getAttribute('aria-label'),
        textContent: el.textContent?.trim().substring(0, 50)
      }));
  });
}

/**
 * Test tab order (keyboard navigation)
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} expectedCount - Expected number of focusable elements
 */
export async function testTabOrder(page, expectedCount = null) {
  const focusableElements = await getFocusableElements(page);

  if (expectedCount !== null) {
    expect(focusableElements.length).toBeGreaterThanOrEqual(expectedCount);
  }

  // Tab through elements
  for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100); // Small delay for focus to settle
  }

  // Should be able to tab backwards
  await page.keyboard.press('Shift+Tab');
}

/**
 * Test skip links
 *
 * @param {import('@playwright/test').Page} page
 */
export async function testSkipLinks(page) {
  // Tab to first element (should be skip link)
  await page.keyboard.press('Tab');

  // Check if focused element is a skip link
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName.toLowerCase(),
      href: el?.getAttribute('href'),
      textContent: el?.textContent?.trim()
    };
  });

  // Skip link should be an anchor with hash href
  if (focusedElement.tag === 'a' && focusedElement.href?.startsWith('#')) {
    // Press Enter to activate skip link
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify it scrolled to target
    const targetId = focusedElement.href.substring(1);
    const targetInView = await page.evaluate((id) => {
      const target = document.getElementById(id);
      if (!target) return false;
      const rect = target.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    }, targetId);

    expect(targetInView, 'Skip link should scroll to target').toBe(true);
  }
}

/**
 * Test escape key handler (for modals, dropdowns)
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} triggerSelector - Selector to open modal/dropdown
 * @param {string} contentSelector - Selector for modal/dropdown content
 */
export async function testEscapeKey(page, triggerSelector, contentSelector) {
  // Open modal/dropdown
  await page.click(triggerSelector);
  await page.waitForSelector(contentSelector, { state: 'visible', timeout: 5000 });

  // Press Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Should be closed
  const isVisible = await page.locator(contentSelector).isVisible().catch(() => false);
  expect(isVisible, 'Escape key should close modal/dropdown').toBe(false);
}

/**
 * Test ARIA attributes
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {object} expectedAttrs - Expected ARIA attributes
 */
export async function assertAriaAttributes(page, selector, expectedAttrs) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'attached', timeout: 5000 });

  for (const [attr, expectedValue] of Object.entries(expectedAttrs)) {
    const actualValue = await element.getAttribute(attr);
    expect(actualValue, `${attr} on ${selector}`).toBe(String(expectedValue));
  }
}

/**
 * Check color contrast ratio
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @returns {Promise<{ratio: number, passes: boolean, foreground: string, background: string}>}
 */
export async function checkColorContrast(page, selector) {
  return await page.locator(selector).evaluate(element => {
    const style = window.getComputedStyle(element);
    const fg = style.color;
    const bg = style.backgroundColor;

    // Simple RGB to luminance calculation
    function getLuminance(rgb) {
      const [r, g, b] = rgb.match(/\d+/g).map(Number);
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const fontSize = parseFloat(style.fontSize);
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && style.fontWeight >= 700);
    const requiredRatio = isLargeText ? 3 : 4.5;

    return {
      ratio: Math.round(ratio * 100) / 100,
      passes: ratio >= requiredRatio,
      foreground: fg,
      background: bg,
      fontSize: style.fontSize,
      isLargeText,
      requiredRatio
    };
  });
}

/**
 * Test heading hierarchy
 *
 * @param {import('@playwright/test').Page} page
 */
export async function testHeadingHierarchy(page) {
  const headings = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
      level: parseInt(h.tagName[1]),
      text: h.textContent?.trim()
    }));
  });

  // Should have exactly one h1
  const h1Count = headings.filter(h => h.level === 1).length;
  expect(h1Count, 'Should have exactly one h1').toBe(1);

  // Check for skipped levels
  for (let i = 1; i < headings.length; i++) {
    const prevLevel = headings[i - 1].level;
    const currentLevel = headings[i].level;
    const diff = currentLevel - prevLevel;

    // Should not skip levels when going deeper
    if (diff > 1) {
      console.warn(`⚠️  Heading level skipped: h${prevLevel} → h${currentLevel}`);
      console.warn(`   "${headings[i - 1].text}" → "${headings[i].text}"`);
    }
  }
}

/**
 * Test focus visible indicators
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function testFocusVisible(page, selector) {
  const element = page.locator(selector);

  // Tab to element
  await element.focus();
  await page.waitForTimeout(100);

  // Check for focus indicator (outline or box-shadow)
  const hasFocusIndicator = await element.evaluate(el => {
    const style = window.getComputedStyle(el);
    const outline = style.outline;
    const boxShadow = style.boxShadow;

    // Should have outline or box-shadow
    return (outline && outline !== 'none' && outline !== '0px') ||
           (boxShadow && boxShadow !== 'none');
  });

  expect(hasFocusIndicator, `${selector} should have focus indicator`).toBe(true);
}

/**
 * Test live regions (for screen reader announcements)
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} expectedRole - 'status', 'alert', or 'log'
 */
export async function testLiveRegion(page, selector, expectedRole = 'status') {
  await assertAriaAttributes(page, selector, {
    'aria-live': expectedRole === 'alert' ? 'assertive' : 'polite',
    'aria-atomic': 'true'
  });
}

/**
 * Get accessibility tree
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<object>}
 */
export async function getAccessibilityTree(page) {
  const snapshot = await page.accessibility.snapshot();
  return snapshot;
}
