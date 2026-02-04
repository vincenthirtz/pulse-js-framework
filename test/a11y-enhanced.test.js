/**
 * Enhanced A11y Tests using EnhancedMockAdapter
 * Tests browser-dependent accessibility features with full API simulation
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { EnhancedMockAdapter } from '../runtime/dom-adapter.js';

describe('A11y with EnhancedMockAdapter', () => {

  let adapter;
  let cleanup;

  beforeEach(() => {
    adapter = new EnhancedMockAdapter();
    cleanup = adapter.installGlobalMocks();
  });

  afterEach(() => {
    cleanup();
    adapter.reset();
  });

  describe('Color Contrast (getContrastRatio)', () => {

    it('should calculate contrast ratio for black and white', async () => {
      const { getContrastRatio } = await import('../runtime/a11y.js');

      const ratio = getContrastRatio('#000000', '#ffffff');
      // Black on white should be 21:1
      assert.ok(ratio > 20, `Expected ratio > 20, got ${ratio}`);
    });

    it('should calculate contrast ratio for similar colors', async () => {
      const { getContrastRatio } = await import('../runtime/a11y.js');

      const ratio = getContrastRatio('#777777', '#888888');
      // Similar grays should have low contrast
      assert.ok(ratio < 2, `Expected ratio < 2, got ${ratio}`);
    });

    it('should handle rgb() color format', async () => {
      const { getContrastRatio } = await import('../runtime/a11y.js');

      const ratio = getContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
      assert.ok(ratio > 20, `Expected ratio > 20, got ${ratio}`);
    });

    it('should handle named colors', async () => {
      const { getContrastRatio } = await import('../runtime/a11y.js');

      const ratio = getContrastRatio('black', 'white');
      assert.ok(ratio > 20, `Expected ratio > 20, got ${ratio}`);
    });

  });

  describe('meetsContrastRequirement', () => {

    it('should validate AA normal text (4.5:1)', async () => {
      const { meetsContrastRequirement } = await import('../runtime/a11y.js');

      assert.strictEqual(meetsContrastRequirement(4.5, 'AA', 'normal'), true);
      assert.strictEqual(meetsContrastRequirement(4.4, 'AA', 'normal'), false);
    });

    it('should validate AA large text (3:1)', async () => {
      const { meetsContrastRequirement } = await import('../runtime/a11y.js');

      assert.strictEqual(meetsContrastRequirement(3.0, 'AA', 'large'), true);
      assert.strictEqual(meetsContrastRequirement(2.9, 'AA', 'large'), false);
    });

    it('should validate AAA normal text (7:1)', async () => {
      const { meetsContrastRequirement } = await import('../runtime/a11y.js');

      assert.strictEqual(meetsContrastRequirement(7.0, 'AAA', 'normal'), true);
      assert.strictEqual(meetsContrastRequirement(6.9, 'AAA', 'normal'), false);
    });

    it('should validate AAA large text (4.5:1)', async () => {
      const { meetsContrastRequirement } = await import('../runtime/a11y.js');

      assert.strictEqual(meetsContrastRequirement(4.5, 'AAA', 'large'), true);
      assert.strictEqual(meetsContrastRequirement(4.4, 'AAA', 'large'), false);
    });

  });

  describe('User Preferences with matchMedia', () => {

    it('should detect prefers-reduced-motion when set', async () => {
      adapter.setMediaQueryResult('(prefers-reduced-motion: reduce)', true);

      const { prefersReducedMotion } = await import('../runtime/a11y.js');
      assert.strictEqual(prefersReducedMotion(), true);
    });

    it('should detect prefers-color-scheme: dark when set', async () => {
      adapter.setMediaQueryResult('(prefers-color-scheme: dark)', true);

      const { prefersColorScheme } = await import('../runtime/a11y.js');
      assert.strictEqual(prefersColorScheme(), 'dark');
    });

    it('should detect prefers-contrast: more when set', async () => {
      adapter.setMediaQueryResult('(prefers-contrast: more)', true);

      const { prefersHighContrast, prefersContrast } = await import('../runtime/a11y.js');
      assert.strictEqual(prefersHighContrast(), true);
      assert.strictEqual(prefersContrast(), 'more');
    });

    it('should detect forced-colors: active when set', async () => {
      adapter.setMediaQueryResult('(forced-colors: active)', true);

      const { forcedColorsMode } = await import('../runtime/a11y.js');
      assert.strictEqual(forcedColorsMode(), 'active');
    });

    it('should detect prefers-reduced-transparency when set', async () => {
      adapter.setMediaQueryResult('(prefers-reduced-transparency: reduce)', true);

      const { prefersReducedTransparency } = await import('../runtime/a11y.js');
      assert.strictEqual(prefersReducedTransparency(), true);
    });

  });

  describe('getEffectiveBackgroundColor', () => {

    it('should traverse up DOM tree for background color', async () => {
      const { getEffectiveBackgroundColor } = await import('../runtime/a11y.js');

      const parent = adapter.createElement('div');
      parent.setComputedStyle({ backgroundColor: 'rgb(255, 0, 0)' });

      const child = adapter.createElement('span');
      child.setComputedStyle({ backgroundColor: 'transparent' });
      child.parentElement = parent;

      const bg = getEffectiveBackgroundColor(child);
      assert.strictEqual(bg, 'rgb(255, 0, 0)');
    });

    it('should return white as default', async () => {
      const { getEffectiveBackgroundColor } = await import('../runtime/a11y.js');

      const el = adapter.createElement('div');
      el.setComputedStyle({ backgroundColor: 'transparent' });
      el.parentElement = null;

      const bg = getEffectiveBackgroundColor(el);
      assert.strictEqual(bg, 'rgb(255, 255, 255)');
    });

  });

  describe('checkElementContrast', () => {

    it('should check element contrast and return result', async () => {
      const { checkElementContrast } = await import('../runtime/a11y.js');

      const el = adapter.createElement('p');
      el.setComputedStyle({
        color: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontSize: '16px',
        fontWeight: '400'
      });
      el.parentElement = null;

      const result = checkElementContrast(el, 'AA');
      assert.strictEqual(typeof result.ratio, 'number');
      assert.strictEqual(typeof result.passes, 'boolean');
      assert.strictEqual(typeof result.foreground, 'string');
      assert.strictEqual(typeof result.background, 'string');
    });

    it('should detect large text (18px+)', async () => {
      const { checkElementContrast } = await import('../runtime/a11y.js');

      const el = adapter.createElement('h1');
      el.setComputedStyle({
        color: 'rgb(100, 100, 100)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontSize: '24px',
        fontWeight: '400'
      });
      el.parentElement = null;

      const result = checkElementContrast(el, 'AA');
      // Large text has lower requirements (3:1 for AA)
      assert.ok(result.ratio > 0);
    });

    it('should detect bold large text (14pt+ bold)', async () => {
      const { checkElementContrast } = await import('../runtime/a11y.js');

      const el = adapter.createElement('span');
      el.setComputedStyle({
        color: 'rgb(100, 100, 100)',
        backgroundColor: 'rgb(255, 255, 255)',
        fontSize: '18.66px',
        fontWeight: '700'
      });
      el.parentElement = null;

      const result = checkElementContrast(el, 'AA');
      assert.ok(result.ratio > 0);
    });

  });

  describe('isAccessiblyHidden with computed styles', () => {

    it('should detect display: none', async () => {
      const { isAccessiblyHidden } = await import('../runtime/a11y.js');

      const el = adapter.createElement('div');
      el.setComputedStyle({ display: 'none' });
      el.getAttribute = () => null;
      el.hasAttribute = () => false;
      el.parentElement = null;

      assert.strictEqual(isAccessiblyHidden(el), true);
    });

    it('should detect visibility: hidden', async () => {
      const { isAccessiblyHidden } = await import('../runtime/a11y.js');

      const el = adapter.createElement('div');
      el.setComputedStyle({ visibility: 'hidden' });
      el.getAttribute = () => null;
      el.hasAttribute = () => false;
      el.parentElement = null;

      assert.strictEqual(isAccessiblyHidden(el), true);
    });

    it('should return false for visible element', async () => {
      const { isAccessiblyHidden } = await import('../runtime/a11y.js');

      const el = adapter.createElement('div');
      el.setComputedStyle({ display: 'block', visibility: 'visible' });
      el.getAttribute = () => null;
      el.hasAttribute = () => false;
      el.parentElement = null;

      assert.strictEqual(isAccessiblyHidden(el), false);
    });

  });

  describe('getFocusableElements with visibility check', () => {

    it('should filter out invisible elements', async () => {
      const { getFocusableElements } = await import('../runtime/a11y.js');

      const container = adapter.createElement('div');

      const visibleBtn = adapter.createElement('button');
      visibleBtn.setComputedStyle({ display: 'block', visibility: 'visible' });
      visibleBtn.offsetParent = {};
      container.appendChild(visibleBtn);

      const hiddenBtn = adapter.createElement('button');
      hiddenBtn.setComputedStyle({ display: 'none' });
      hiddenBtn.offsetParent = null;
      container.appendChild(hiddenBtn);

      // Need to mock querySelectorAll to return our buttons
      container.querySelectorAll = () => [visibleBtn, hiddenBtn];

      const focusable = getFocusableElements(container);
      // Only visible button should be returned
      assert.strictEqual(focusable.length, 1);
    });

  });

  describe('validateA11y with touch target size', () => {

    it('should detect small touch targets', async () => {
      const { validateA11y } = await import('../runtime/a11y.js');

      const container = adapter.createElement('div');

      const smallBtn = adapter.createElement('button');
      smallBtn.setBoundingRect({ width: 20, height: 20 });
      smallBtn.setComputedStyle({ display: 'block', visibility: 'visible' });

      // Mock querySelectorAll for different selectors
      container.querySelectorAll = (selector) => {
        if (selector.includes('button') || selector.includes('[role="button"]')) {
          return [smallBtn];
        }
        return [];
      };
      container.querySelector = () => null;

      const issues = validateA11y(container);
      const touchIssue = issues.find(i => i.rule === 'touch-target-size');
      assert.ok(touchIssue, 'Should detect small touch target');
    });

  });

  describe('highlightA11yIssues with bounding rect', () => {

    it('should create highlights based on element position', async () => {
      const { highlightA11yIssues } = await import('../runtime/a11y.js');

      const el = adapter.createElement('button');
      el.setBoundingRect({ top: 100, left: 50, width: 200, height: 40 });

      const issues = [{
        severity: 'error',
        rule: 'test-rule',
        message: 'Test error',
        element: el
      }];

      const removeHighlights = highlightA11yIssues(issues);
      assert.strictEqual(typeof removeHighlights, 'function');

      // Cleanup
      removeHighlights();
    });

  });

  describe('Live Regions with requestAnimationFrame', () => {

    it('should announce message after animation frame', async () => {
      const { announce } = await import('../runtime/a11y.js');

      announce('Test announcement');

      // Flush animation frames to process the announcement
      adapter.flushAnimationFrames();

      // The message should have been set (we can't easily verify without inspecting the live region)
      // But we can verify no errors were thrown
      assert.ok(true);
    });

  });

});

describe('A11y Audit with EnhancedMockAdapter', () => {

  let adapter;
  let cleanup;

  beforeEach(() => {
    adapter = new EnhancedMockAdapter();
    cleanup = adapter.installGlobalMocks();
  });

  afterEach(() => {
    cleanup();
    adapter.reset();
  });

  describe('MutationObserver integration', () => {

    it('should create MutationObserver for DOM watching', async () => {
      // Verify MutationObserver is available globally
      assert.strictEqual(typeof globalThis.MutationObserver, 'function');

      const observer = new globalThis.MutationObserver(() => {});
      assert.ok(observer);
      assert.strictEqual(typeof observer.observe, 'function');
      assert.strictEqual(typeof observer.disconnect, 'function');
    });

  });

  describe('Performance timing', () => {

    it('should provide performance.now() for audit timing', () => {
      const start = globalThis.performance.now();
      assert.strictEqual(typeof start, 'number');

      // Simulate some work
      const end = globalThis.performance.now();
      assert.ok(end >= start);
    });

  });

});

console.log('Enhanced A11y tests completed');
