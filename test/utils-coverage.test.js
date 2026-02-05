/**
 * Utils Coverage Tests
 *
 * Additional tests to improve coverage for runtime/utils.js
 *
 * @module test/utils-coverage
 */

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

// Simple test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

console.log('\n--- Utils Coverage Tests ---\n');

// =============================================================================
// Window Event Helper Coverage Tests
// =============================================================================

console.log('Window Event Helpers:');

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

test('isBrowser returns true when window exists', () => {
  globalThis.window = {};
  assertEqual(isBrowser(), true, 'Should return true');
  globalThis.window = originalWindow;
});

test('isBrowser returns false when window is undefined', () => {
  const saved = globalThis.window;
  delete globalThis.window;
  assertEqual(isBrowser(), false, 'Should return false');
  globalThis.window = saved;
});

test('onWindowEvent adds listener and returns cleanup', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  let called = false;
  const handler = () => { called = true; };
  const cleanup = onWindowEvent('focus', handler, () => {});

  assert(typeof cleanup === 'function', 'Should return cleanup function');
  assertEqual(mockWindow._listeners.focus.length, 1, 'Should add listener');

  // Dispatch event
  mockWindow._dispatch('focus');
  assertEqual(called, true, 'Handler should be called');

  // Cleanup
  cleanup();
  assertEqual(mockWindow._listeners.focus.length, 0, 'Should remove listener');

  globalThis.window = originalWindow;
});

test('onWindowEvent with options parameter', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  const options = { capture: true, passive: true };
  const cleanup = onWindowEvent('scroll', () => {}, () => {}, options);

  assertEqual(mockWindow._listeners.scroll[0].options, options, 'Should pass options');

  cleanup();
  globalThis.window = originalWindow;
});

test('onWindowEvent returns null when not in browser', () => {
  const saved = globalThis.window;
  delete globalThis.window;

  const result = onWindowEvent('focus', () => {}, () => {});
  assertEqual(result, null, 'Should return null');

  globalThis.window = saved;
});

test('onWindowEvent calls onCleanup with cleanup function', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  let registeredCleanup = null;
  const onCleanup = (fn) => { registeredCleanup = fn; };

  onWindowEvent('focus', () => {}, onCleanup);

  assert(typeof registeredCleanup === 'function', 'Should register cleanup');

  // Execute the registered cleanup
  registeredCleanup();
  assertEqual(mockWindow._listeners.focus.length, 0, 'Cleanup should remove listener');

  globalThis.window = originalWindow;
});

test('onWindowFocus is shorthand for focus event', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  let called = false;
  const cleanup = onWindowFocus(() => { called = true; }, () => {});

  mockWindow._dispatch('focus');
  assertEqual(called, true, 'Should respond to focus');

  cleanup();
  globalThis.window = originalWindow;
});

test('onWindowOnline is shorthand for online event', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  let called = false;
  const cleanup = onWindowOnline(() => { called = true; }, () => {});

  mockWindow._dispatch('online');
  assertEqual(called, true, 'Should respond to online');

  cleanup();
  globalThis.window = originalWindow;
});

test('onWindowOffline is shorthand for offline event', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  let called = false;
  const cleanup = onWindowOffline(() => { called = true; }, () => {});

  mockWindow._dispatch('offline');
  assertEqual(called, true, 'Should respond to offline');

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
  assertEqual(onlineCalled, true, 'Should handle online');

  mockWindow._dispatch('offline');
  assertEqual(offlineCalled, true, 'Should handle offline');

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

  assert(typeof cleanup === 'function', 'Should return cleanup');
  assertEqual(mockWindow._listeners.online.length, 1, 'Should add online listener');
  assertEqual(mockWindow._listeners.offline, undefined, 'Should not add offline listener');

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

  assert(typeof cleanup === 'function', 'Should return cleanup');
  assertEqual(mockWindow._listeners.offline.length, 1, 'Should add offline listener');
  assertEqual(mockWindow._listeners.online, undefined, 'Should not add online listener');

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

  assertEqual(result, null, 'Should return null');

  globalThis.window = saved;
});

test('onNetworkChange cleanup calls all registered cleanups', () => {
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  const cleanup = onNetworkChange({
    onOnline: () => {},
    onOffline: () => {}
  }, () => {});

  assertEqual(mockWindow._listeners.online.length, 1, 'Should have online listener');
  assertEqual(mockWindow._listeners.offline.length, 1, 'Should have offline listener');

  cleanup();

  assertEqual(mockWindow._listeners.online.length, 0, 'Should remove online listener');
  assertEqual(mockWindow._listeners.offline.length, 0, 'Should remove offline listener');

  globalThis.window = originalWindow;
});

// =============================================================================
// safeSetAttribute with DOM Adapter Coverage Tests
// =============================================================================

console.log('\nsafeSetAttribute with DOM Adapter:');

test('safeSetAttribute uses provided DOM adapter', () => {
  const setAttributes = [];
  const mockAdapter = {
    setAttribute: (el, name, value) => {
      setAttributes.push({ el, name, value });
    }
  };

  const mockElement = {};

  safeSetAttribute(mockElement, 'data-test', 'value', {}, mockAdapter);

  assertEqual(setAttributes.length, 1, 'Should call adapter');
  assertEqual(setAttributes[0].name, 'data-test', 'Should pass attribute name');
  assertEqual(setAttributes[0].value, 'value', 'Should pass attribute value');
});

test('safeSetAttribute falls back to element.setAttribute when no adapter', () => {
  const attrs = {};
  const mockElement = {
    setAttribute: (name, value) => { attrs[name] = value; }
  };

  safeSetAttribute(mockElement, 'data-test', 'value');

  assertEqual(attrs['data-test'], 'value', 'Should use element.setAttribute');
});

// =============================================================================
// safeSetStyle with DOM Adapter Coverage Tests
// =============================================================================

console.log('\nsafeSetStyle with DOM Adapter:');

test('safeSetStyle uses provided DOM adapter', () => {
  const setStyles = [];
  const mockAdapter = {
    setStyle: (el, prop, value) => {
      setStyles.push({ el, prop, value });
    }
  };

  const mockElement = { style: {} };

  safeSetStyle(mockElement, 'color', 'red', {}, mockAdapter);

  assertEqual(setStyles.length, 1, 'Should call adapter');
  assertEqual(setStyles[0].prop, 'color', 'Should pass property name');
  assertEqual(setStyles[0].value, 'red', 'Should pass property value');
});

test('safeSetStyle falls back to element.style when no adapter', () => {
  const mockElement = { style: {} };

  safeSetStyle(mockElement, 'backgroundColor', 'blue');

  assertEqual(mockElement.style.backgroundColor, 'blue', 'Should use element.style');
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

  assertEqual(result, false, 'Should return false for blocked value');
  // Sanitized value should still be set
  assertEqual(setStyles.length, 1, 'Should set sanitized value');
  assertEqual(setStyles[0].value, 'red', 'Should set sanitized portion');
});

// =============================================================================
// sanitizeCSSValue Additional Coverage Tests
// =============================================================================

console.log('\nsanitizeCSSValue Additional Coverage:');

test('sanitizeCSSValue blocks behavior: property', () => {
  // behavior: with a value that doesn't contain url()
  const result = sanitizeCSSValue('behavior: something');
  assertEqual(result.safe, false, 'Should block behavior');
  assert(result.blocked.includes('behavior'), 'Should detect behavior pattern');
});

test('sanitizeCSSValue blocks -moz-binding', () => {
  // -moz-binding without url() to test that specific pattern
  const result = sanitizeCSSValue('-moz-binding value');
  assertEqual(result.safe, false, 'Should block -moz-binding');
  assert(result.blocked.includes('-moz-binding'), 'Should detect -moz-binding pattern');
});

test('sanitizeCSSValue with allowMultiple option', () => {
  const result = sanitizeCSSValue('color: red; margin: 10px', { allowMultiple: true });
  assertEqual(result.safe, true, 'Should allow multiple with option');
  assertEqual(result.value, 'color: red; margin: 10px');
});

// =============================================================================
// sanitizeUrl Additional Coverage Tests
// =============================================================================

console.log('\nsanitizeUrl Additional Coverage:');

test('sanitizeUrl handles malformed URL encoding gracefully', () => {
  // Malformed percent encoding
  const result = sanitizeUrl('%ZZ%invalid');

  // Should not throw, may return null or the original
  assert(result === null || typeof result === 'string', 'Should handle malformed encoding');
});

test('sanitizeUrl with allowRelative: false blocks relative paths', () => {
  assertEqual(sanitizeUrl('/path', { allowRelative: false }), null);
  assertEqual(sanitizeUrl('./path', { allowRelative: false }), null);
  assertEqual(sanitizeUrl('../path', { allowRelative: false }), null);
  assertEqual(sanitizeUrl('page.html', { allowRelative: false }), null);
});

test('sanitizeUrl blocks protocol-relative URLs', () => {
  assertEqual(sanitizeUrl('//evil.com/page'), null, 'Should block //');
});

test('sanitizeUrl allows https even with special chars after', () => {
  assertEqual(sanitizeUrl('https://example.com/path?query=1&other=2'), 'https://example.com/path?query=1&other=2');
});

// =============================================================================
// safeSetAttribute Additional Coverage Tests
// =============================================================================

console.log('\nsafeSetAttribute Additional Coverage:');

function createMockElement() {
  const attrs = {};
  return {
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
    getAttribute(name) { return attrs[name]; },
    _attrs: attrs
  };
}

test('safeSetAttribute allows allowUnsafeHtml for srcdoc', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'srcdoc', '<p>Hello</p>', { allowUnsafeHtml: true });
  assertEqual(result, true, 'Should allow with option');
  assertEqual(el.getAttribute('srcdoc'), '<p>Hello</p>');
});

test('safeSetAttribute sanitizes all URL attributes', () => {
  const urlAttrs = ['href', 'src', 'action', 'formaction', 'data', 'poster',
                    'cite', 'codebase', 'background', 'profile', 'usemap',
                    'longdesc', 'dynsrc', 'lowsrc', 'srcset', 'imagesrcset'];

  for (const attr of urlAttrs) {
    const el = createMockElement();
    const result = safeSetAttribute(el, attr, 'javascript:alert(1)');
    assertEqual(result, false, `Should block dangerous ${attr}`);
  }
});

test('safeSetAttribute handles numeric values', () => {
  const el = createMockElement();
  safeSetAttribute(el, 'data-count', 42);
  assertEqual(el.getAttribute('data-count'), '42', 'Should convert number to string');
});

test('safeSetAttribute handles boolean values', () => {
  const el = createMockElement();
  safeSetAttribute(el, 'data-enabled', true);
  assertEqual(el.getAttribute('data-enabled'), 'true', 'Should convert boolean to string');
});

// =============================================================================
// deepClone Additional Coverage Tests
// =============================================================================

console.log('\ndeepClone Additional Coverage:');

test('deepClone handles undefined', () => {
  assertEqual(deepClone(undefined), undefined);
});

test('deepClone handles empty array', () => {
  const result = deepClone([]);
  assertDeepEqual(result, []);
  assert(result !== [], 'Should be different array reference');
});

test('deepClone handles empty object', () => {
  const result = deepClone({});
  assertDeepEqual(result, {});
});

test('deepClone does not clone prototype properties', () => {
  function Parent() {}
  Parent.prototype.inherited = 'value';

  const obj = new Parent();
  obj.own = 'property';

  const clone = deepClone(obj);

  assertEqual(clone.own, 'property', 'Should clone own property');
  assertEqual(clone.inherited, undefined, 'Should not clone inherited property');
});

// =============================================================================
// debounce Additional Coverage Tests
// =============================================================================

console.log('\ndebounce Additional Coverage:');

await testAsync('debounce preserves this context', async () => {
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
  await new Promise(r => setTimeout(r, 20));

  assertEqual(result, 42, 'Should preserve this context');
});

await testAsync('debounce cancel can be called multiple times', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  debounced.cancel();
  debounced.cancel(); // Should not throw
  debounced.cancel();

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 0, 'Should remain cancelled');
});

// =============================================================================
// throttle Additional Coverage Tests
// =============================================================================

console.log('\nthrottle Additional Coverage:');

await testAsync('throttle preserves this context', async () => {
  let result;
  const throttled = throttle(function() {
    result = this.value;
  }, 10);

  const obj = { value: 123 };
  throttled.call(obj);

  assertEqual(result, 123, 'Should preserve this context');
});

await testAsync('throttle cancel can be called when no pending call', async () => {
  const throttled = throttle(() => {}, 50);

  // Call once (immediate execution)
  throttled();

  // Cancel when no pending
  throttled.cancel(); // Should not throw

  assert(true, 'Should not throw');
});

await testAsync('throttle schedules trailing call with arguments', async () => {
  let lastArg = null;
  const throttled = throttle((arg) => {
    lastArg = arg;
  }, 50);

  throttled('first'); // Immediate
  assertEqual(lastArg, 'first');

  throttled('second'); // Scheduled for later

  await new Promise(r => setTimeout(r, 60));
  // The throttle implementation uses the args from when the timeout was scheduled
  assertEqual(lastArg, 'second', 'Should execute trailing call');
});

// =============================================================================
// Results
// =============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
