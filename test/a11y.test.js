/**
 * Pulse A11y Tests
 * Tests for accessibility utilities
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock DOM environment
globalThis.document = {
  body: {
    appendChild: mock.fn(),
    insertBefore: mock.fn(),
    firstChild: null,
    querySelectorAll: () => [],
    querySelector: () => null,
    contains: () => true
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    setAttribute: mock.fn(),
    getAttribute: mock.fn(() => null),
    hasAttribute: mock.fn(() => false),
    removeAttribute: mock.fn(),
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    appendChild: mock.fn(),
    remove: mock.fn(),
    focus: mock.fn(),
    closest: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    contains: () => true,
    style: {},
    id: '',
    className: '',
    textContent: '',
    hidden: false,
    offsetParent: {}
  }),
  activeElement: null,
  getElementById: () => null
};

globalThis.window = {
  matchMedia: (query) => ({
    matches: false,
    addEventListener: mock.fn(),
    removeEventListener: mock.fn()
  }),
  getComputedStyle: () => ({
    display: 'block',
    visibility: 'visible'
  })
};

globalThis.getComputedStyle = globalThis.window.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Import after mocks
const {
  announce,
  announcePolite,
  announceAssertive,
  createLiveAnnouncer,
  getFocusableElements,
  focusFirst,
  focusLast,
  trapFocus,
  saveFocus,
  restoreFocus,
  clearFocusStack,
  createSkipLink,
  installSkipLinks,
  prefersReducedMotion,
  prefersColorScheme,
  prefersHighContrast,
  createPreferences,
  setAriaAttributes,
  createDisclosure,
  createTabs,
  createRovingTabindex,
  validateA11y,
  logA11yIssues,
  highlightA11yIssues,
  generateId,
  isAccessiblyHidden,
  makeInert,
  srOnly
} = await import('../runtime/a11y.js');

describe('Pulse A11y', () => {

  describe('Live Regions', () => {

    it('should export announce function', () => {
      assert.strictEqual(typeof announce, 'function');
    });

    it('should export announcePolite function', () => {
      assert.strictEqual(typeof announcePolite, 'function');
    });

    it('should export announceAssertive function', () => {
      assert.strictEqual(typeof announceAssertive, 'function');
    });

    it('should call announce without errors', () => {
      assert.doesNotThrow(() => {
        announce('Test message');
      });
    });

    it('should call announcePolite without errors', () => {
      assert.doesNotThrow(() => {
        announcePolite('Polite message');
      });
    });

    it('should call announceAssertive without errors', () => {
      assert.doesNotThrow(() => {
        announceAssertive('Assertive message');
      });
    });

    it('should support custom options', () => {
      assert.doesNotThrow(() => {
        announce('Test', { priority: 'assertive', clearAfter: 2000 });
      });
    });

    it('should export createLiveAnnouncer', () => {
      assert.strictEqual(typeof createLiveAnnouncer, 'function');
    });

  });

  describe('Focus Management', () => {

    it('should export getFocusableElements', () => {
      assert.strictEqual(typeof getFocusableElements, 'function');
    });

    it('should return empty array for null container', () => {
      const result = getFocusableElements(null);
      assert.deepStrictEqual(result, []);
    });

    it('should export focusFirst', () => {
      assert.strictEqual(typeof focusFirst, 'function');
    });

    it('should export focusLast', () => {
      assert.strictEqual(typeof focusLast, 'function');
    });

    it('should return null when no focusable elements', () => {
      const container = document.createElement('div');
      const result = focusFirst(container);
      assert.strictEqual(result, null);
    });

    it('should export trapFocus', () => {
      assert.strictEqual(typeof trapFocus, 'function');
    });

    it('should return release function from trapFocus', () => {
      const container = document.createElement('div');
      const release = trapFocus(container);
      assert.strictEqual(typeof release, 'function');
    });

    it('should handle null container in trapFocus', () => {
      const release = trapFocus(null);
      assert.strictEqual(typeof release, 'function');
    });

    it('should export saveFocus and restoreFocus', () => {
      assert.strictEqual(typeof saveFocus, 'function');
      assert.strictEqual(typeof restoreFocus, 'function');
    });

    it('should export clearFocusStack', () => {
      assert.strictEqual(typeof clearFocusStack, 'function');
      assert.doesNotThrow(() => clearFocusStack());
    });

  });

  describe('Skip Links', () => {

    it('should export createSkipLink', () => {
      assert.strictEqual(typeof createSkipLink, 'function');
    });

    it('should create skip link element', () => {
      const link = createSkipLink('main', 'Skip to main');
      assert.strictEqual(link.tagName, 'A');
    });

    it('should use default text', () => {
      const link = createSkipLink('content');
      assert.strictEqual(link.textContent, 'Skip to main content');
    });

    it('should export installSkipLinks', () => {
      assert.strictEqual(typeof installSkipLinks, 'function');
    });

    it('should create skip links container', () => {
      const container = installSkipLinks([
        { target: 'main', text: 'Skip to main' },
        { target: 'nav', text: 'Skip to navigation' }
      ]);
      assert.strictEqual(container.tagName, 'NAV');
    });

  });

  describe('User Preferences', () => {

    it('should export prefersReducedMotion', () => {
      assert.strictEqual(typeof prefersReducedMotion, 'function');
      const result = prefersReducedMotion();
      assert.strictEqual(typeof result, 'boolean');
    });

    it('should export prefersColorScheme', () => {
      assert.strictEqual(typeof prefersColorScheme, 'function');
      const result = prefersColorScheme();
      assert(['light', 'dark', 'no-preference'].includes(result));
    });

    it('should export prefersHighContrast', () => {
      assert.strictEqual(typeof prefersHighContrast, 'function');
      const result = prefersHighContrast();
      assert.strictEqual(typeof result, 'boolean');
    });

    it('should export createPreferences', () => {
      assert.strictEqual(typeof createPreferences, 'function');
    });

    it('should return reactive preferences', () => {
      const prefs = createPreferences();
      assert.ok(prefs.reducedMotion);
      assert.ok(prefs.colorScheme);
      assert.ok(prefs.highContrast);
      assert.strictEqual(typeof prefs.reducedMotion.get, 'function');
    });

  });

  describe('ARIA Helpers', () => {

    it('should export setAriaAttributes', () => {
      assert.strictEqual(typeof setAriaAttributes, 'function');
    });

    it('should set ARIA attributes on element', () => {
      const el = document.createElement('div');
      setAriaAttributes(el, { label: 'Test', hidden: true });
      assert.ok(el.setAttribute.mock.calls.length >= 2);
    });

    it('should remove null attributes', () => {
      const el = document.createElement('div');
      setAriaAttributes(el, { label: null });
      assert.ok(el.removeAttribute.mock.calls.length >= 1);
    });

    it('should export createDisclosure', () => {
      assert.strictEqual(typeof createDisclosure, 'function');
    });

    it('should create disclosure control', () => {
      const trigger = document.createElement('button');
      const content = document.createElement('div');
      const disclosure = createDisclosure(trigger, content);

      assert.ok(disclosure.expanded);
      assert.strictEqual(typeof disclosure.toggle, 'function');
      assert.strictEqual(typeof disclosure.open, 'function');
      assert.strictEqual(typeof disclosure.close, 'function');
    });

    it('should support defaultOpen option', () => {
      const trigger = document.createElement('button');
      const content = document.createElement('div');
      const disclosure = createDisclosure(trigger, content, { defaultOpen: true });

      assert.strictEqual(disclosure.expanded.get(), true);
    });

    it('should export createTabs', () => {
      assert.strictEqual(typeof createTabs, 'function');
    });

    it('should export createRovingTabindex', () => {
      assert.strictEqual(typeof createRovingTabindex, 'function');
    });

    it('should return cleanup function from createRovingTabindex', () => {
      const container = document.createElement('div');
      const cleanup = createRovingTabindex(container);
      assert.strictEqual(typeof cleanup, 'function');
    });

  });

  describe('Validation', () => {

    it('should export validateA11y', () => {
      assert.strictEqual(typeof validateA11y, 'function');
    });

    it('should return array of issues', () => {
      const issues = validateA11y(document.body);
      assert.ok(Array.isArray(issues));
    });

    it('should export logA11yIssues', () => {
      assert.strictEqual(typeof logA11yIssues, 'function');
    });

    it('should handle empty issues array', () => {
      assert.doesNotThrow(() => {
        logA11yIssues([]);
      });
    });

    it('should handle issues with errors and warnings', () => {
      assert.doesNotThrow(() => {
        logA11yIssues([
          { severity: 'error', rule: 'test', message: 'Test error', element: document.createElement('div') },
          { severity: 'warning', rule: 'test', message: 'Test warning', element: document.createElement('div') }
        ]);
      });
    });

    it('should export highlightA11yIssues', () => {
      assert.strictEqual(typeof highlightA11yIssues, 'function');
    });

    it('should return cleanup function from highlightA11yIssues', () => {
      // Mock getBoundingClientRect
      const el = document.createElement('div');
      el.getBoundingClientRect = () => ({ top: 0, left: 0, width: 100, height: 100 });

      const cleanup = highlightA11yIssues([
        { severity: 'error', rule: 'test', message: 'Test', element: el }
      ]);
      assert.strictEqual(typeof cleanup, 'function');
    });

  });

  describe('Utilities', () => {

    it('should export generateId', () => {
      assert.strictEqual(typeof generateId, 'function');
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      assert.notStrictEqual(id1, id2);
    });

    it('should support custom prefix', () => {
      const id = generateId('custom');
      assert.ok(id.startsWith('custom-'));
    });

    it('should export isAccessiblyHidden', () => {
      assert.strictEqual(typeof isAccessiblyHidden, 'function');
    });

    it('should return true for null element', () => {
      assert.strictEqual(isAccessiblyHidden(null), true);
    });

    it('should export makeInert', () => {
      assert.strictEqual(typeof makeInert, 'function');
    });

    it('should return restore function from makeInert', () => {
      const el = document.createElement('div');
      const restore = makeInert(el);
      assert.strictEqual(typeof restore, 'function');
    });

    it('should set inert and aria-hidden attributes', () => {
      const el = document.createElement('div');
      makeInert(el);
      assert.ok(el.setAttribute.mock.calls.some(call => call.arguments[0] === 'inert'));
      assert.ok(el.setAttribute.mock.calls.some(call => call.arguments[0] === 'aria-hidden'));
    });

    it('should export srOnly', () => {
      assert.strictEqual(typeof srOnly, 'function');
    });

    it('should create visually hidden span', () => {
      const span = srOnly('Screen reader text');
      assert.strictEqual(span.tagName, 'SPAN');
      assert.strictEqual(span.textContent, 'Screen reader text');
      assert.strictEqual(span.className, 'sr-only');
    });

  });

  describe('Default Export', () => {

    it('should export default object with all functions', async () => {
      const { default: a11y } = await import('../runtime/a11y.js');

      assert.strictEqual(typeof a11y, 'object');
      assert.strictEqual(typeof a11y.announce, 'function');
      assert.strictEqual(typeof a11y.trapFocus, 'function');
      assert.strictEqual(typeof a11y.createSkipLink, 'function');
      assert.strictEqual(typeof a11y.prefersReducedMotion, 'function');
      assert.strictEqual(typeof a11y.validateA11y, 'function');
      assert.strictEqual(typeof a11y.generateId, 'function');
    });

  });

});

describe('A11y Integration', () => {

  it('should work with pulse reactivity', async () => {
    const { pulse, effect } = await import('../runtime/pulse.js');
    const { createPreferences } = await import('../runtime/a11y.js');

    const prefs = createPreferences();

    // Preferences should be pulses
    assert.strictEqual(typeof prefs.reducedMotion.get, 'function');
    assert.strictEqual(typeof prefs.reducedMotion.set, 'function');

    // Should be able to use in effects
    let effectRan = false;
    effect(() => {
      prefs.reducedMotion.get();
      effectRan = true;
    });

    assert.strictEqual(effectRan, true);
  });

  it('should work with disclosure and pulse', async () => {
    const { createDisclosure } = await import('../runtime/a11y.js');

    const trigger = document.createElement('button');
    const content = document.createElement('div');
    const { expanded, toggle, open, close } = createDisclosure(trigger, content);

    assert.strictEqual(expanded.get(), false);

    open();
    assert.strictEqual(expanded.get(), true);

    close();
    assert.strictEqual(expanded.get(), false);

    toggle();
    assert.strictEqual(expanded.get(), true);
  });

});

console.log('✅ A11y tests completed');
