/**
 * Utils Coverage Tests
 *
 * Additional tests to improve coverage for runtime/utils.js
 *
 * @module test/utils-coverage
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  escapeHtml,
  unescapeHtml,
  escapeAttribute,
  sanitizeUrl,
  safeSetAttribute,
  isValidCSSProperty,
  sanitizeCSSValue,
  safeSetStyle,
  deepClone,
  debounce,
  throttle,
  dangerouslySetInnerHTML,
  createSafeTextNode,
  isBrowser,
  onWindowEvent,
  onWindowFocus,
  onWindowOnline,
  onWindowOffline,
  onNetworkChange
} from '../runtime/utils.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Save original window
const originalWindow = globalThis.window;

// Create mock window for testing
function createMockWindow() {
  const listeners = {};
  return {
    addEventListener: (event, handler, options) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push({ handler, options });
    },
    removeEventListener: (event, handler, options) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(l => l.handler !== handler);
      }
    },
    _listeners: listeners,
    _dispatch: (event) => {
      if (listeners[event]) {
        listeners[event].forEach(l => l.handler());
      }
    }
  };
}

// =============================================================================
// Window Event Helper Coverage Tests
// =============================================================================

describe('Window Event Helpers', () => {
  test('isBrowser returns true when window exists', () => {
    globalThis.window = {};
    assert.strictEqual(isBrowser(), true, 'Should return true');
    globalThis.window = originalWindow;
  });

  test('isBrowser returns false when window is undefined', () => {
    const saved = globalThis.window;
    delete globalThis.window;
    assert.strictEqual(isBrowser(), false, 'Should return false');
    globalThis.window = saved;
  });

  test('onWindowEvent adds listener and returns cleanup', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let called = false;
    const handler = () => { called = true; };
    const cleanup = onWindowEvent('focus', handler, () => {});

    assert.ok(typeof cleanup === 'function', 'Should return cleanup function');
    assert.strictEqual(mockWindow._listeners.focus.length, 1, 'Should add listener');

    // Dispatch event
    mockWindow._dispatch('focus');
    assert.strictEqual(called, true, 'Handler should be called');

    // Cleanup
    cleanup();
    assert.strictEqual(mockWindow._listeners.focus.length, 0, 'Should remove listener');

    globalThis.window = originalWindow;
  });

  test('onWindowEvent with options parameter', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    const options = { capture: true, passive: true };
    const cleanup = onWindowEvent('scroll', () => {}, () => {}, options);

    assert.strictEqual(mockWindow._listeners.scroll[0].options, options, 'Should pass options');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onWindowEvent returns null when not in browser', () => {
    const saved = globalThis.window;
    delete globalThis.window;

    const result = onWindowEvent('focus', () => {}, () => {});
    assert.strictEqual(result, null, 'Should return null');

    globalThis.window = saved;
  });

  test('onWindowEvent calls onCleanup with cleanup function', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let registeredCleanup = null;
    const onCleanup = (fn) => { registeredCleanup = fn; };

    onWindowEvent('focus', () => {}, onCleanup);

    assert.ok(typeof registeredCleanup === 'function', 'Should register cleanup');

    // Execute the registered cleanup
    registeredCleanup();
    assert.strictEqual(mockWindow._listeners.focus.length, 0, 'Cleanup should remove listener');

    globalThis.window = originalWindow;
  });

  test('onWindowFocus is shorthand for focus event', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let called = false;
    const cleanup = onWindowFocus(() => { called = true; }, () => {});

    mockWindow._dispatch('focus');
    assert.strictEqual(called, true, 'Should respond to focus');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onWindowOnline is shorthand for online event', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let called = false;
    const cleanup = onWindowOnline(() => { called = true; }, () => {});

    mockWindow._dispatch('online');
    assert.strictEqual(called, true, 'Should respond to online');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onWindowOffline is shorthand for offline event', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let called = false;
    const cleanup = onWindowOffline(() => { called = true; }, () => {});

    mockWindow._dispatch('offline');
    assert.strictEqual(called, true, 'Should respond to offline');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onNetworkChange handles both online and offline', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let onlineCalled = false;
    let offlineCalled = false;

    const cleanup = onNetworkChange({
      onOnline: () => { onlineCalled = true; },
      onOffline: () => { offlineCalled = true; }
    }, () => {});

    mockWindow._dispatch('online');
    assert.strictEqual(onlineCalled, true, 'Should handle online');

    mockWindow._dispatch('offline');
    assert.strictEqual(offlineCalled, true, 'Should handle offline');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onNetworkChange with only onOnline handler', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let onlineCalled = false;

    const cleanup = onNetworkChange({
      onOnline: () => { onlineCalled = true; }
    }, () => {});

    assert.ok(typeof cleanup === 'function', 'Should return cleanup');
    assert.strictEqual(mockWindow._listeners.online.length, 1, 'Should add online listener');
    assert.strictEqual(mockWindow._listeners.offline, undefined, 'Should not add offline listener');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onNetworkChange with only onOffline handler', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    let offlineCalled = false;

    const cleanup = onNetworkChange({
      onOffline: () => { offlineCalled = true; }
    }, () => {});

    assert.ok(typeof cleanup === 'function', 'Should return cleanup');
    assert.strictEqual(mockWindow._listeners.offline.length, 1, 'Should add offline listener');
    assert.strictEqual(mockWindow._listeners.online, undefined, 'Should not add online listener');

    cleanup();
    globalThis.window = originalWindow;
  });

  test('onNetworkChange returns null when not in browser', () => {
    const saved = globalThis.window;
    delete globalThis.window;

    const result = onNetworkChange({
      onOnline: () => {},
      onOffline: () => {}
    }, () => {});

    assert.strictEqual(result, null, 'Should return null');

    globalThis.window = saved;
  });

  test('onNetworkChange cleanup calls all registered cleanups', () => {
    const mockWindow = createMockWindow();
    globalThis.window = mockWindow;

    const cleanup = onNetworkChange({
      onOnline: () => {},
      onOffline: () => {}
    }, () => {});

    assert.strictEqual(mockWindow._listeners.online.length, 1, 'Should have online listener');
    assert.strictEqual(mockWindow._listeners.offline.length, 1, 'Should have offline listener');

    cleanup();

    assert.strictEqual(mockWindow._listeners.online.length, 0, 'Should remove online listener');
    assert.strictEqual(mockWindow._listeners.offline.length, 0, 'Should remove offline listener');

    globalThis.window = originalWindow;
  });
});

// =============================================================================
// safeSetAttribute with DOM Adapter Coverage Tests
// =============================================================================

describe('safeSetAttribute with DOM Adapter', () => {
  test('safeSetAttribute uses provided DOM adapter', () => {
    const setAttributes = [];
    const mockAdapter = {
      setAttribute: (el, name, value) => {
        setAttributes.push({ el, name, value });
      }
    };

    const mockElement = {};

    safeSetAttribute(mockElement, 'data-test', 'value', {}, mockAdapter);

    assert.strictEqual(setAttributes.length, 1, 'Should call adapter');
    assert.strictEqual(setAttributes[0].name, 'data-test', 'Should pass attribute name');
    assert.strictEqual(setAttributes[0].value, 'value', 'Should pass attribute value');
  });

  test('safeSetAttribute falls back to element.setAttribute when no adapter', () => {
    const attrs = {};
    const mockElement = {
      setAttribute: (name, value) => { attrs[name] = value; }
    };

    safeSetAttribute(mockElement, 'data-test', 'value');

    assert.strictEqual(attrs['data-test'], 'value', 'Should use element.setAttribute');
  });
});

// =============================================================================
// safeSetStyle with DOM Adapter Coverage Tests
// =============================================================================

describe('safeSetStyle with DOM Adapter', () => {
  test('safeSetStyle uses provided DOM adapter', () => {
    const setStyles = [];
    const mockAdapter = {
      setStyle: (el, prop, value) => {
        setStyles.push({ el, prop, value });
      }
    };

    const mockElement = { style: {} };

    safeSetStyle(mockElement, 'color', 'red', {}, mockAdapter);

    assert.strictEqual(setStyles.length, 1, 'Should call adapter');
    assert.strictEqual(setStyles[0].prop, 'color', 'Should pass property name');
    assert.strictEqual(setStyles[0].value, 'red', 'Should pass property value');
  });

  test('safeSetStyle falls back to element.style when no adapter', () => {
    const mockElement = { style: {} };

    safeSetStyle(mockElement, 'backgroundColor', 'blue');

    assert.strictEqual(mockElement.style.backgroundColor, 'blue', 'Should use element.style');
  });

  test('safeSetStyle with adapter handles blocked values', () => {
    const setStyles = [];
    const mockAdapter = {
      setStyle: (el, prop, value) => {
        setStyles.push({ el, prop, value });
      }
    };

    const mockElement = { style: {} };

    // This has a semicolon, so it should be blocked but sanitized portion set
    const result = safeSetStyle(mockElement, 'color', 'red; margin: 0', {}, mockAdapter);

    assert.strictEqual(result, false, 'Should return false for blocked value');
    // Sanitized value should still be set
    assert.strictEqual(setStyles.length, 1, 'Should set sanitized value');
    assert.strictEqual(setStyles[0].value, 'red', 'Should set sanitized portion');
  });
});

// =============================================================================
// sanitizeCSSValue Additional Coverage Tests
// =============================================================================

describe('sanitizeCSSValue Additional Coverage', () => {
  test('sanitizeCSSValue blocks behavior: property', () => {
    // behavior: with a value that doesn't contain url()
    const result = sanitizeCSSValue('behavior: something');
    assert.strictEqual(result.safe, false, 'Should block behavior');
    assert.ok(result.blocked.includes('behavior'), 'Should detect behavior pattern');
  });

  test('sanitizeCSSValue blocks -moz-binding', () => {
    // -moz-binding without url() to test that specific pattern
    const result = sanitizeCSSValue('-moz-binding value');
    assert.strictEqual(result.safe, false, 'Should block -moz-binding');
    assert.ok(result.blocked.includes('-moz-binding'), 'Should detect -moz-binding pattern');
  });

  test('sanitizeCSSValue with allowMultiple option', () => {
    const result = sanitizeCSSValue('color: red; margin: 10px', { allowMultiple: true });
    assert.strictEqual(result.safe, true, 'Should allow multiple with option');
    assert.strictEqual(result.value, 'color: red; margin: 10px');
  });
});

// =============================================================================
// sanitizeUrl Additional Coverage Tests
// =============================================================================

describe('sanitizeUrl Additional Coverage', () => {
  test('sanitizeUrl handles malformed URL encoding gracefully', () => {
    // Malformed percent encoding
    const result = sanitizeUrl('%ZZ%invalid');

    // Should not throw, may return null or the original
    assert.ok(result === null || typeof result === 'string', 'Should handle malformed encoding');
  });

  test('sanitizeUrl with allowRelative: false blocks relative paths', () => {
    assert.strictEqual(sanitizeUrl('/path', { allowRelative: false }), null);
    assert.strictEqual(sanitizeUrl('./path', { allowRelative: false }), null);
    assert.strictEqual(sanitizeUrl('../path', { allowRelative: false }), null);
    assert.strictEqual(sanitizeUrl('page.html', { allowRelative: false }), null);
  });

  test('sanitizeUrl blocks protocol-relative URLs', () => {
    assert.strictEqual(sanitizeUrl('//evil.com/page'), null, 'Should block //');
  });

  test('sanitizeUrl allows https even with special chars after', () => {
    assert.strictEqual(sanitizeUrl('https://example.com/path?query=1&other=2'), 'https://example.com/path?query=1&other=2');
  });
});

// =============================================================================
// safeSetAttribute Additional Coverage Tests
// =============================================================================

function createMockElement() {
  const attrs = {};
  return {
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
    getAttribute(name) { return attrs[name]; },
    _attrs: attrs
  };
}

describe('safeSetAttribute Additional Coverage', () => {
  test('safeSetAttribute allows allowUnsafeHtml for srcdoc', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'srcdoc', '<p>Hello</p>', { allowUnsafeHtml: true });
    assert.strictEqual(result, true, 'Should allow with option');
    assert.strictEqual(el.getAttribute('srcdoc'), '<p>Hello</p>');
  });

  test('safeSetAttribute sanitizes all URL attributes', () => {
    const urlAttrs = ['href', 'src', 'action', 'formaction', 'data', 'poster',
                      'cite', 'codebase', 'background', 'profile', 'usemap',
                      'longdesc', 'dynsrc', 'lowsrc', 'srcset', 'imagesrcset'];

    for (const attr of urlAttrs) {
      const el = createMockElement();
      const result = safeSetAttribute(el, attr, 'javascript:alert(1)');
      assert.strictEqual(result, false, `Should block dangerous ${attr}`);
    }
  });

  test('safeSetAttribute handles numeric values', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'data-count', 42);
    assert.strictEqual(el.getAttribute('data-count'), '42', 'Should convert number to string');
  });

  test('safeSetAttribute handles boolean values', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'data-enabled', true);
    assert.strictEqual(el.getAttribute('data-enabled'), 'true', 'Should convert boolean to string');
  });
});

// =============================================================================
// deepClone Additional Coverage Tests
// =============================================================================

describe('deepClone Additional Coverage', () => {
  test('deepClone handles undefined', () => {
    assert.strictEqual(deepClone(undefined), undefined);
  });

  test('deepClone handles empty array', () => {
    const result = deepClone([]);
    assert.deepStrictEqual(result, []);
    assert.ok(result !== [], 'Should be different array reference');
  });

  test('deepClone handles empty object', () => {
    const result = deepClone({});
    assert.deepStrictEqual(result, {});
  });

  test('deepClone does not clone prototype properties', () => {
    function Parent() {}
    Parent.prototype.inherited = 'value';

    const obj = new Parent();
    obj.own = 'property';

    const clone = deepClone(obj);

    assert.strictEqual(clone.own, 'property', 'Should clone own property');
    assert.strictEqual(clone.inherited, undefined, 'Should not clone inherited property');
  });
});

// =============================================================================
// debounce Additional Coverage Tests
// =============================================================================

describe('debounce Additional Coverage', () => {
  test('debounce preserves this context', async () => {
    const obj = {
      value: 42,
      getValue: debounce(function() {
        return this.value;
      }, 10)
    };

    let result;
    obj.getValue = debounce(function() {
      result = this.value;
    }, 10);

    obj.getValue.call(obj);
    await sleep(20);

    assert.strictEqual(result, 42, 'Should preserve this context');
  });

  test('debounce cancel can be called multiple times', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 50);

    debounced();
    debounced.cancel();
    debounced.cancel(); // Should not throw
    debounced.cancel();

    await sleep(60);
    assert.strictEqual(called, 0, 'Should remain cancelled');
  });
});

// =============================================================================
// throttle Additional Coverage Tests
// =============================================================================

describe('throttle Additional Coverage', () => {
  test('throttle preserves this context', async () => {
    let result;
    const throttled = throttle(function() {
      result = this.value;
    }, 10);

    const obj = { value: 123 };
    throttled.call(obj);

    assert.strictEqual(result, 123, 'Should preserve this context');
  });

  test('throttle cancel can be called when no pending call', async () => {
    const throttled = throttle(() => {}, 50);

    // Call once (immediate execution)
    throttled();

    // Cancel when no pending
    throttled.cancel(); // Should not throw

    assert.ok(true, 'Should not throw');
  });

  test('throttle schedules trailing call with arguments', async () => {
    let lastArg = null;
    const throttled = throttle((arg) => {
      lastArg = arg;
    }, 50);

    throttled('first'); // Immediate
    assert.strictEqual(lastArg, 'first');

    throttled('second'); // Scheduled for later

    await sleep(60);
    // The throttle implementation uses the args from when the timeout was scheduled
    assert.strictEqual(lastArg, 'second', 'Should execute trailing call');
  });
});
