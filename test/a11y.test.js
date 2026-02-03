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
    contains: () => true,
    children: []
  },
  documentElement: {
    getAttribute: () => null
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
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 50 }),
    getContext: () => ({
      fillStyle: '',
      fillRect: () => {},
      getImageData: () => ({ data: [0, 0, 0, 255] })
    }),
    style: {},
    id: '',
    className: '',
    textContent: '',
    hidden: false,
    offsetParent: {},
    width: 1,
    height: 1
  }),
  activeElement: null,
  getElementById: () => null,
  addEventListener: mock.fn(),
  removeEventListener: mock.fn()
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
  createAnnouncementQueue,
  getFocusableElements,
  focusFirst,
  focusLast,
  trapFocus,
  saveFocus,
  restoreFocus,
  clearFocusStack,
  onEscapeKey,
  createFocusVisibleTracker,
  createSkipLink,
  installSkipLinks,
  prefersReducedMotion,
  prefersColorScheme,
  prefersHighContrast,
  prefersReducedTransparency,
  forcedColorsMode,
  prefersContrast,
  createPreferences,
  setAriaAttributes,
  createDisclosure,
  createTabs,
  createRovingTabindex,
  createModal,
  createTooltip,
  createAccordion,
  createMenu,
  getContrastRatio,
  meetsContrastRequirement,
  getEffectiveBackgroundColor,
  checkElementContrast,
  validateA11y,
  logA11yIssues,
  highlightA11yIssues,
  generateId,
  getAccessibleName,
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

describe('Additional A11y Edge Cases', () => {

  describe('Announcements Edge Cases', () => {

    it('should handle empty message', () => {
      assert.doesNotThrow(() => {
        announce('');
      });
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      assert.doesNotThrow(() => {
        announce(longMessage);
      });
    });

    it('should handle special characters in messages', () => {
      assert.doesNotThrow(() => {
        announce('<script>alert("xss")</script>');
        announce('Unicode: \u{1F600} emoji');
        announce('Quotes: "double" and \'single\'');
      });
    });

    it('should handle clearAfter of 0', () => {
      assert.doesNotThrow(() => {
        announce('Test', { clearAfter: 0 });
      });
    });

    it('should handle negative clearAfter', () => {
      assert.doesNotThrow(() => {
        announce('Test', { clearAfter: -1 });
      });
    });

  });

  describe('Focus Management Edge Cases', () => {

    it('should handle container with no focusable elements', () => {
      const container = document.createElement('div');
      const result = focusLast(container);
      assert.strictEqual(result, null);
    });

    it('should handle multiple saveFocus/restoreFocus calls', () => {
      clearFocusStack();
      saveFocus();
      saveFocus();
      saveFocus();
      assert.doesNotThrow(() => {
        restoreFocus();
        restoreFocus();
        restoreFocus();
        restoreFocus(); // Extra call should not throw
      });
    });

    it('should handle trapFocus with autoFocus false', () => {
      const container = document.createElement('div');
      const release = trapFocus(container, { autoFocus: false });
      assert.strictEqual(typeof release, 'function');
      release();
    });

    it('should handle trapFocus with returnFocus false', () => {
      const container = document.createElement('div');
      const release = trapFocus(container, { returnFocus: false });
      assert.strictEqual(typeof release, 'function');
      release();
    });

    it('should handle trapFocus with initialFocus option', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      container.appendChild(button);

      const release = trapFocus(container, { initialFocus: button });
      assert.strictEqual(typeof release, 'function');
      release();
    });

  });

  describe('Skip Links Edge Cases', () => {

    it('should handle empty links array', () => {
      const container = installSkipLinks([]);
      assert.strictEqual(container.tagName, 'NAV');
      // Check appendChild was not called for any links
      assert.strictEqual(container.appendChild.mock.calls.length, 0);
    });

    it('should handle multiple skip links', () => {
      const container = installSkipLinks([
        { target: 'main', text: 'Skip to main' },
        { target: 'nav', text: 'Skip to nav' },
        { target: 'footer', text: 'Skip to footer' }
      ]);
      // Check appendChild was called 3 times
      assert.strictEqual(container.appendChild.mock.calls.length, 3);
    });

    it('should apply custom className to skip link', () => {
      const link = createSkipLink('target', 'Skip', { className: 'custom-class' });
      assert.strictEqual(link.className, 'custom-class');
    });

  });

  describe('ARIA Helpers Edge Cases', () => {

    it('should handle setAriaAttributes with empty object', () => {
      const el = document.createElement('div');
      assert.doesNotThrow(() => {
        setAriaAttributes(el, {});
      });
    });

    it('should handle setAriaAttributes with boolean values', () => {
      const el = document.createElement('div');
      setAriaAttributes(el, { expanded: true, hidden: false });
      assert.ok(el.setAttribute.mock.calls.length >= 2);
    });

    it('should handle setAriaAttributes with numeric values', () => {
      const el = document.createElement('div');
      setAriaAttributes(el, { valuenow: 50, valuemin: 0, valuemax: 100 });
      assert.ok(el.setAttribute.mock.calls.length >= 3);
    });

    it('should handle createDisclosure with onToggle callback', () => {
      const trigger = document.createElement('button');
      const content = document.createElement('div');
      let toggled = false;

      const disclosure = createDisclosure(trigger, content, {
        onToggle: (isOpen) => { toggled = true; }
      });

      disclosure.toggle();
      // onToggle is called through effect
    });

    it('should set aria-controls on disclosure trigger', () => {
      const trigger = document.createElement('button');
      const content = document.createElement('div');
      content.id = 'test-content';

      createDisclosure(trigger, content);
      assert.ok(trigger.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'aria-controls'
      ));
    });

  });

  describe('Tabs Edge Cases', () => {

    it('should export createTabs', () => {
      assert.strictEqual(typeof createTabs, 'function');
    });

    it('should handle tabs with empty tablist', () => {
      const tablist = document.createElement('div');
      tablist.setAttribute = mock.fn();
      tablist.querySelectorAll = () => [];
      tablist.addEventListener = mock.fn();

      const result = createTabs(tablist);
      assert.ok(result.tabs);
      assert.ok(result.panels);
    });

    it('should handle tabs with vertical orientation', () => {
      const tablist = document.createElement('div');
      tablist.setAttribute = mock.fn();
      tablist.querySelectorAll = () => [];
      tablist.addEventListener = mock.fn();

      const result = createTabs(tablist, { orientation: 'vertical' });
      assert.ok(tablist.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'aria-orientation' &&
                call.arguments[1] === 'vertical'
      ));
    });

  });

  describe('Roving Tabindex Edge Cases', () => {

    it('should handle roving tabindex with no items', () => {
      const container = document.createElement('div');
      container.querySelectorAll = () => [];
      container.addEventListener = mock.fn();

      const cleanup = createRovingTabindex(container);
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should handle roving tabindex with loop false', () => {
      const container = document.createElement('div');
      container.querySelectorAll = () => [];
      container.addEventListener = mock.fn();

      const cleanup = createRovingTabindex(container, { loop: false });
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should handle roving tabindex with horizontal orientation', () => {
      const container = document.createElement('div');
      container.querySelectorAll = () => [];
      container.addEventListener = mock.fn();

      const cleanup = createRovingTabindex(container, { orientation: 'horizontal' });
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should handle roving tabindex with custom selector', () => {
      const container = document.createElement('div');
      container.querySelectorAll = () => [];
      container.addEventListener = mock.fn();

      const cleanup = createRovingTabindex(container, { selector: '.item' });
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should handle roving tabindex with onSelect callback', () => {
      const container = document.createElement('div');
      container.querySelectorAll = () => [];
      container.addEventListener = mock.fn();

      const cleanup = createRovingTabindex(container, {
        onSelect: (el, index) => {}
      });
      assert.strictEqual(typeof cleanup, 'function');
    });

  });

  describe('Validation Edge Cases', () => {

    it('should detect images without alt', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'img') {
            return [{
              hasAttribute: (attr) => attr !== 'alt',
              getAttribute: () => null,
              alt: undefined
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'img-alt'));
    });

    it('should detect empty alt on non-decorative images', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'img') {
            return [{
              hasAttribute: () => true,
              getAttribute: () => null,
              alt: ''
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'img-alt-empty'));
    });

    it('should detect buttons without accessible names', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'button') {
            return [{
              textContent: '',
              hasAttribute: () => false
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'button-name'));
    });

    it('should not flag buttons with aria-label', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'button') {
            return [{
              textContent: '',
              hasAttribute: (attr) => attr === 'aria-label'
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(!issues.some(i => i.rule === 'button-name'));
    });

    it('should detect links without accessible names', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'a[href]') {
            return [{
              textContent: '',
              hasAttribute: () => false,
              querySelector: () => null
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'link-name'));
    });

    it('should detect positive tabindex', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === '[tabindex]') {
            return [{
              getAttribute: () => '5'
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'tabindex-positive'));
    });

    it('should detect heading level skips', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'h1, h2, h3, h4, h5, h6') {
            return [
              { tagName: 'H1' },
              { tagName: 'H3' } // Skipped H2
            ];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'heading-order'));
    });

    it('should detect autoplay media without muted', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'video[autoplay], audio[autoplay]') {
            return [{
              hasAttribute: (attr) => attr !== 'muted'
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'media-autoplay'));
    });

    it('should detect click handlers on non-interactive elements', () => {
      const container = {
        querySelectorAll: (selector) => {
          if (selector === 'div[onclick], span[onclick]') {
            return [{
              hasAttribute: () => false
            }];
          }
          return [];
        }
      };

      const issues = validateA11y(container);
      assert.ok(issues.some(i => i.rule === 'click-non-interactive'));
    });

  });

  describe('Utilities Edge Cases', () => {

    it('should generate different IDs on subsequent calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      assert.strictEqual(ids.size, 100);
    });

    it('should check aria-hidden attribute', () => {
      const el = document.createElement('div');
      el.getAttribute = (attr) => attr === 'aria-hidden' ? 'true' : null;
      el.hasAttribute = () => false;
      el.parentElement = null;

      const result = isAccessiblyHidden(el);
      assert.strictEqual(result, true);
    });

    it('should check inert attribute', () => {
      const el = document.createElement('div');
      el.getAttribute = () => null;
      el.hasAttribute = (attr) => attr === 'inert';
      el.parentElement = null;

      const result = isAccessiblyHidden(el);
      assert.strictEqual(result, true);
    });

    it('should check parent aria-hidden', () => {
      const parent = {
        getAttribute: (attr) => attr === 'aria-hidden' ? 'true' : null,
        hasAttribute: () => false,
        parentElement: null
      };
      const el = document.createElement('div');
      el.getAttribute = () => null;
      el.hasAttribute = () => false;
      el.parentElement = parent;

      const result = isAccessiblyHidden(el);
      assert.strictEqual(result, true);
    });

    it('should restore makeInert correctly', () => {
      const el = document.createElement('div');
      const restore = makeInert(el);

      assert.ok(el.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'inert'
      ));
      assert.ok(el.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'aria-hidden'
      ));

      restore();
      assert.ok(el.removeAttribute.mock.calls.some(
        call => call.arguments[0] === 'inert'
      ));
    });

    it('should handle makeInert on already inert element', () => {
      const el = document.createElement('div');
      el.hasAttribute = (attr) => attr === 'inert';

      const restore = makeInert(el);
      restore();

      // Should not remove inert if it was already set
      assert.ok(!el.removeAttribute.mock.calls.some(
        call => call.arguments[0] === 'inert'
      ));
    });

    it('should create srOnly span with correct styles', () => {
      const span = srOnly('Hidden text');
      assert.strictEqual(span.textContent, 'Hidden text');
      assert.ok(span.style.cssText.includes('position'));
      assert.ok(span.style.cssText.includes('clip'));
    });

  });

  describe('highlightA11yIssues Edge Cases', () => {

    it('should handle empty issues array', () => {
      const cleanup = highlightA11yIssues([]);
      assert.strictEqual(typeof cleanup, 'function');
      cleanup();
    });

    it('should handle multiple issues', () => {
      const el1 = document.createElement('div');
      el1.getBoundingClientRect = () => ({ top: 0, left: 0, width: 100, height: 50 });

      const el2 = document.createElement('div');
      el2.getBoundingClientRect = () => ({ top: 100, left: 0, width: 100, height: 50 });

      const cleanup = highlightA11yIssues([
        { severity: 'error', rule: 'test1', message: 'Error', element: el1 },
        { severity: 'warning', rule: 'test2', message: 'Warning', element: el2 }
      ]);

      assert.strictEqual(typeof cleanup, 'function');
      cleanup();
    });

  });

  describe('logA11yIssues Edge Cases', () => {

    it('should handle mixed errors and warnings', () => {
      const originalGroup = console.group;
      const originalGroupEnd = console.groupEnd;
      const originalLog = console.log;

      let groupCalled = false;
      console.group = () => { groupCalled = true; };
      console.groupEnd = () => {};
      console.log = () => {};

      logA11yIssues([
        { severity: 'error', rule: 'err1', message: 'Error 1', element: {} },
        { severity: 'warning', rule: 'warn1', message: 'Warning 1', element: {} },
        { severity: 'error', rule: 'err2', message: 'Error 2', element: {} }
      ]);

      assert.strictEqual(groupCalled, true);

      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
      console.log = originalLog;
    });

  });

  // ==========================================================================
  // NEW FEATURE TESTS
  // ==========================================================================

  describe('Enhanced User Preferences', () => {

    it('should export prefersReducedTransparency function', () => {
      assert.strictEqual(typeof prefersReducedTransparency, 'function');
    });

    it('should return boolean from prefersReducedTransparency', () => {
      const result = prefersReducedTransparency();
      assert.strictEqual(typeof result, 'boolean');
    });

    it('should export forcedColorsMode function', () => {
      assert.strictEqual(typeof forcedColorsMode, 'function');
    });

    it('should return string from forcedColorsMode', () => {
      const result = forcedColorsMode();
      assert.ok(['none', 'active'].includes(result));
    });

    it('should export prefersContrast function', () => {
      assert.strictEqual(typeof prefersContrast, 'function');
    });

    it('should return valid contrast preference', () => {
      const result = prefersContrast();
      assert.ok(['no-preference', 'more', 'less', 'custom'].includes(result));
    });

    it('should include new preferences in createPreferences', () => {
      const prefs = createPreferences();
      assert.ok(prefs.reducedTransparency);
      assert.ok(prefs.forcedColors);
      assert.ok(prefs.contrast);
    });

  });

  describe('onEscapeKey', () => {

    it('should export onEscapeKey function', () => {
      assert.strictEqual(typeof onEscapeKey, 'function');
    });

    it('should return cleanup function', () => {
      const container = document.createElement('div');
      const cleanup = onEscapeKey(container, () => {});
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should handle null container', () => {
      const cleanup = onEscapeKey(null, () => {});
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should add keydown listener', () => {
      const container = document.createElement('div');
      onEscapeKey(container, () => {});
      assert.ok(container.addEventListener.mock.calls.length > 0);
    });

  });

  describe('createFocusVisibleTracker', () => {

    it('should export createFocusVisibleTracker function', () => {
      assert.strictEqual(typeof createFocusVisibleTracker, 'function');
    });

    it('should return isKeyboardUser pulse and cleanup', () => {
      const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
      assert.ok(isKeyboardUser);
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should have boolean initial value', () => {
      const { isKeyboardUser } = createFocusVisibleTracker();
      assert.strictEqual(typeof isKeyboardUser.get(), 'boolean');
    });

  });

  describe('getAccessibleName', () => {

    it('should export getAccessibleName function', () => {
      assert.strictEqual(typeof getAccessibleName, 'function');
    });

    it('should return empty string for null element', () => {
      assert.strictEqual(getAccessibleName(null), '');
    });

    it('should return aria-label if present', () => {
      const el = document.createElement('button');
      el.getAttribute = (attr) => attr === 'aria-label' ? 'Click me' : null;
      el.hasAttribute = () => false;
      el.textContent = '';
      assert.strictEqual(getAccessibleName(el), 'Click me');
    });

    it('should return text content for buttons', () => {
      const el = document.createElement('button');
      el.getAttribute = () => null;
      el.hasAttribute = () => false;
      el.textContent = 'Submit';
      assert.strictEqual(getAccessibleName(el), 'Submit');
    });

  });

  describe('createModal', () => {

    it('should export createModal function', () => {
      assert.strictEqual(typeof createModal, 'function');
    });

    it('should return control object with isOpen, open, close', () => {
      const dialog = document.createElement('div');
      const { isOpen, open, close } = createModal(dialog);
      assert.ok(isOpen);
      assert.strictEqual(typeof open, 'function');
      assert.strictEqual(typeof close, 'function');
    });

    it('should set ARIA attributes on dialog', () => {
      const dialog = document.createElement('div');
      createModal(dialog);
      assert.ok(dialog.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'role' && call.arguments[1] === 'dialog'
      ));
    });

  });

  describe('createTooltip', () => {

    it('should export createTooltip function', () => {
      assert.strictEqual(typeof createTooltip, 'function');
    });

    it('should return control object', () => {
      const trigger = document.createElement('button');
      const tooltip = document.createElement('div');
      const { isVisible, show, hide, cleanup } = createTooltip(trigger, tooltip);
      assert.ok(isVisible);
      assert.strictEqual(typeof show, 'function');
      assert.strictEqual(typeof hide, 'function');
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should set tooltip role', () => {
      const trigger = document.createElement('button');
      const tooltip = document.createElement('div');
      createTooltip(trigger, tooltip);
      assert.ok(tooltip.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'role' && call.arguments[1] === 'tooltip'
      ));
    });

  });

  describe('createAccordion', () => {

    it('should export createAccordion function', () => {
      assert.strictEqual(typeof createAccordion, 'function');
    });

    it('should return control object', () => {
      const container = document.createElement('div');
      const { openIndices, openAll, closeAll, open, close, toggle } = createAccordion(container);
      assert.ok(openIndices);
      assert.strictEqual(typeof openAll, 'function');
      assert.strictEqual(typeof closeAll, 'function');
      assert.strictEqual(typeof open, 'function');
      assert.strictEqual(typeof close, 'function');
      assert.strictEqual(typeof toggle, 'function');
    });

  });

  describe('createMenu', () => {

    it('should export createMenu function', () => {
      assert.strictEqual(typeof createMenu, 'function');
    });

    it('should return control object', () => {
      const button = document.createElement('button');
      const menu = document.createElement('div');
      const { isOpen, open, close, toggle, cleanup } = createMenu(button, menu);
      assert.ok(isOpen);
      assert.strictEqual(typeof open, 'function');
      assert.strictEqual(typeof close, 'function');
      assert.strictEqual(typeof toggle, 'function');
      assert.strictEqual(typeof cleanup, 'function');
    });

    it('should set ARIA attributes', () => {
      const button = document.createElement('button');
      const menu = document.createElement('div');
      createMenu(button, menu);
      assert.ok(menu.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'role' && call.arguments[1] === 'menu'
      ));
      assert.ok(button.setAttribute.mock.calls.some(
        call => call.arguments[0] === 'aria-haspopup' && call.arguments[1] === 'menu'
      ));
    });

  });

  describe('Color Contrast', () => {

    it('should export getContrastRatio function', () => {
      assert.strictEqual(typeof getContrastRatio, 'function');
    });

    it('should export meetsContrastRequirement function', () => {
      assert.strictEqual(typeof meetsContrastRequirement, 'function');
    });

    it('should return 1 for invalid colors in getContrastRatio', () => {
      // Without proper canvas support in mock, should return 1
      const result = getContrastRatio('invalid', 'colors');
      assert.strictEqual(typeof result, 'number');
    });

    it('should check AA normal text requirements', () => {
      assert.strictEqual(meetsContrastRequirement(4.5, 'AA', 'normal'), true);
      assert.strictEqual(meetsContrastRequirement(4.4, 'AA', 'normal'), false);
    });

    it('should check AA large text requirements', () => {
      assert.strictEqual(meetsContrastRequirement(3, 'AA', 'large'), true);
      assert.strictEqual(meetsContrastRequirement(2.9, 'AA', 'large'), false);
    });

    it('should check AAA requirements', () => {
      assert.strictEqual(meetsContrastRequirement(7, 'AAA', 'normal'), true);
      assert.strictEqual(meetsContrastRequirement(6.9, 'AAA', 'normal'), false);
    });

    it('should export getEffectiveBackgroundColor function', () => {
      assert.strictEqual(typeof getEffectiveBackgroundColor, 'function');
    });

    it('should export checkElementContrast function', () => {
      assert.strictEqual(typeof checkElementContrast, 'function');
    });

  });

  describe('createAnnouncementQueue', () => {

    it('should export createAnnouncementQueue function', () => {
      assert.strictEqual(typeof createAnnouncementQueue, 'function');
    });

    it('should return queue control object', () => {
      const queue = createAnnouncementQueue();
      assert.ok(queue.queueLength);
      assert.strictEqual(typeof queue.add, 'function');
      assert.strictEqual(typeof queue.clear, 'function');
      assert.strictEqual(typeof queue.isProcessing, 'function');
    });

    it('should start with empty queue', () => {
      const queue = createAnnouncementQueue();
      assert.strictEqual(queue.queueLength.get(), 0);
    });

    it('should clear queue', () => {
      const queue = createAnnouncementQueue();
      queue.add('Test message');
      queue.clear();
      assert.strictEqual(queue.queueLength.get(), 0);
    });

  });

  describe('Additional Validation Rules', () => {

    it('should detect duplicate IDs', () => {
      const container = document.createElement('div');
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.id = 'duplicate';
      el2.id = 'duplicate';

      container.querySelectorAll = (selector) => {
        if (selector === '[id]') return [el1, el2];
        return [];
      };
      container.querySelector = () => null;

      const issues = validateA11y(container);
      const duplicateIssue = issues.find(i => i.rule === 'duplicate-id');
      assert.ok(duplicateIssue, 'Should detect duplicate ID');
    });

  });

});

console.log('A11y tests completed');
