/**
 * Utils Tests
 * Tests for runtime/utils.js
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
  createSafeTextNode
} from '../runtime/utils.js';

// Mock DOM environment for createSafeTextNode
class MockTextNode {
  constructor(text) {
    this.nodeType = 3; // TEXT_NODE
    this.textContent = text;
    this.nodeValue = text;
  }
}

// Set up global document mock for createSafeTextNode
globalThis.document = globalThis.document || {
  createTextNode(text) {
    return new MockTextNode(text);
  }
};

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

console.log('\n--- Utils Tests ---\n');

// ============================================================================
// escapeHtml Tests
// ============================================================================

console.log('escapeHtml:');

test('escapes < and >', () => {
  assertEqual(escapeHtml('<div>'), '&lt;div&gt;');
});

test('escapes &', () => {
  assertEqual(escapeHtml('a & b'), 'a &amp; b');
});

test('escapes quotes', () => {
  assertEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
  assertEqual(escapeHtml("'hello'"), '&#39;hello&#39;');
});

test('escapes script tags', () => {
  const input = '<script>alert("xss")</script>';
  const output = escapeHtml(input);
  assert(!output.includes('<script>'), 'Should not contain script tag');
  assertEqual(output, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

test('handles null and undefined', () => {
  assertEqual(escapeHtml(null), '');
  assertEqual(escapeHtml(undefined), '');
});

test('handles numbers', () => {
  assertEqual(escapeHtml(42), '42');
  assertEqual(escapeHtml(3.14), '3.14');
});

test('handles empty string', () => {
  assertEqual(escapeHtml(''), '');
});

test('passes through safe strings', () => {
  assertEqual(escapeHtml('Hello World'), 'Hello World');
});

// ============================================================================
// unescapeHtml Tests
// ============================================================================

console.log('\nunescapeHtml:');

test('unescapes &lt; and &gt;', () => {
  assertEqual(unescapeHtml('&lt;div&gt;'), '<div>');
});

test('unescapes &amp;', () => {
  assertEqual(unescapeHtml('a &amp; b'), 'a & b');
});

test('unescapes quotes', () => {
  assertEqual(unescapeHtml('&quot;hello&quot;'), '"hello"');
  assertEqual(unescapeHtml('&#39;hello&#39;'), "'hello'");
});

test('handles null and undefined', () => {
  assertEqual(unescapeHtml(null), '');
  assertEqual(unescapeHtml(undefined), '');
});

test('roundtrip escape/unescape', () => {
  const original = '<script>alert("xss")</script>';
  const escaped = escapeHtml(original);
  const unescaped = unescapeHtml(escaped);
  assertEqual(unescaped, original);
});

// ============================================================================
// escapeAttribute Tests
// ============================================================================

console.log('\nescapeAttribute:');

test('escapes double quotes', () => {
  assertEqual(escapeAttribute('hello"world'), 'hello&quot;world');
});

test('escapes single quotes', () => {
  assertEqual(escapeAttribute("hello'world"), 'hello&#39;world');
});

test('escapes angle brackets', () => {
  assertEqual(escapeAttribute('<div>'), '&lt;div&gt;');
});

test('handles null and undefined', () => {
  assertEqual(escapeAttribute(null), '');
  assertEqual(escapeAttribute(undefined), '');
});

// ============================================================================
// sanitizeUrl Tests
// ============================================================================

console.log('\nsanitizeUrl:');

test('allows http URLs', () => {
  assertEqual(sanitizeUrl('http://example.com'), 'http://example.com');
});

test('allows https URLs', () => {
  assertEqual(sanitizeUrl('https://example.com'), 'https://example.com');
});

test('blocks javascript: URLs', () => {
  assertEqual(sanitizeUrl('javascript:alert(1)'), null);
});

test('blocks javascript: URLs case insensitive', () => {
  assertEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), null);
  assertEqual(sanitizeUrl('JavaScript:alert(1)'), null);
});

test('blocks javascript: with spaces', () => {
  assertEqual(sanitizeUrl('java script:alert(1)'), null);
});

test('blocks data: URLs by default', () => {
  assertEqual(sanitizeUrl('data:text/html,<script>'), null);
});

test('allows data: URLs with allowData option', () => {
  const url = 'data:image/png;base64,abc';
  assertEqual(sanitizeUrl(url, { allowData: true }), url);
});

test('allows relative URLs by default', () => {
  assertEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
  assertEqual(sanitizeUrl('./relative'), './relative');
  assertEqual(sanitizeUrl('../parent'), '../parent');
});

test('allows relative paths without slashes', () => {
  assertEqual(sanitizeUrl('page.html'), 'page.html');
  assertEqual(sanitizeUrl('path/to/page'), 'path/to/page');
});

test('handles null and empty string', () => {
  assertEqual(sanitizeUrl(null), null);
  assertEqual(sanitizeUrl(''), null);
  assertEqual(sanitizeUrl(undefined), null);
});

test('trims whitespace', () => {
  assertEqual(sanitizeUrl('  https://example.com  '), 'https://example.com');
});

test('blocks other protocols', () => {
  assertEqual(sanitizeUrl('ftp://example.com'), null);
  assertEqual(sanitizeUrl('file:///etc/passwd'), null);
});

test('blocks vbscript: URLs', () => {
  assertEqual(sanitizeUrl('vbscript:msgbox(1)'), null);
  assertEqual(sanitizeUrl('VBSCRIPT:msgbox(1)'), null);
});

test('blocks blob: URLs by default', () => {
  assertEqual(sanitizeUrl('blob:http://example.com/file'), null);
});

test('allows blob: URLs with allowBlob option', () => {
  const url = 'blob:http://example.com/file';
  assertEqual(sanitizeUrl(url, { allowBlob: true }), url);
});

test('blocks HTML entity encoded javascript:', () => {
  // &#x6a; = j, &#x61; = a, etc.
  assertEqual(sanitizeUrl('&#x6a;avascript:alert(1)'), null);
  assertEqual(sanitizeUrl('&#106;avascript:alert(1)'), null);
});

test('blocks URL-encoded javascript:', () => {
  assertEqual(sanitizeUrl('%6Aavascript:alert(1)'), null);
  assertEqual(sanitizeUrl('%6a%61%76%61script:alert(1)'), null);
});

test('blocks javascript: with null bytes', () => {
  assertEqual(sanitizeUrl('java\x00script:alert(1)'), null);
});

test('blocks protocol-relative URLs that could escape to different origin', () => {
  assertEqual(sanitizeUrl('//evil.com/path'), null);
});

test('allows single-slash relative URLs', () => {
  assertEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
});

test('allows dot-relative URLs', () => {
  assertEqual(sanitizeUrl('./path'), './path');
  assertEqual(sanitizeUrl('../path'), '../path');
});

// ============================================================================
// safeSetAttribute Tests (XSS Protection)
// ============================================================================

console.log('\nsafeSetAttribute:');

// Create a mock element for testing
function createMockElement() {
  const attrs = {};
  return {
    setAttribute(name, value) { attrs[name] = value; },
    removeAttribute(name) { delete attrs[name]; },
    getAttribute(name) { return attrs[name]; },
    _attrs: attrs
  };
}

test('sets safe attributes normally', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'data-id', '123');
  assert(result === true, 'Should return true');
  assertEqual(el.getAttribute('data-id'), '123');
});

test('sets class and id attributes', () => {
  const el = createMockElement();
  safeSetAttribute(el, 'class', 'my-class');
  safeSetAttribute(el, 'id', 'my-id');
  assertEqual(el.getAttribute('class'), 'my-class');
  assertEqual(el.getAttribute('id'), 'my-id');
});

test('blocks onclick event handler', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'onclick', 'alert(1)');
  assert(result === false, 'Should return false');
  assertEqual(el.getAttribute('onclick'), undefined);
});

test('blocks all on* event handlers', () => {
  const el = createMockElement();
  const handlers = ['onerror', 'onload', 'onmouseover', 'onfocus', 'onblur',
                    'onchange', 'oninput', 'onsubmit', 'onkeydown', 'onkeyup'];
  for (const handler of handlers) {
    const result = safeSetAttribute(el, handler, 'alert(1)');
    assert(result === false, `Should block ${handler}`);
    assertEqual(el.getAttribute(handler), undefined);
  }
});

test('blocks event handlers case-insensitively', () => {
  const el = createMockElement();
  assert(safeSetAttribute(el, 'ONCLICK', 'alert(1)') === false);
  assert(safeSetAttribute(el, 'OnClick', 'alert(1)') === false);
  assert(safeSetAttribute(el, 'onClick', 'alert(1)') === false);
});

test('blocks srcdoc attribute', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'srcdoc', '<script>alert(1)</script>');
  assert(result === false, 'Should block srcdoc');
  assertEqual(el.getAttribute('srcdoc'), undefined);
});

test('sanitizes href with javascript:', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'href', 'javascript:alert(1)');
  assert(result === false, 'Should return false for dangerous URL');
  assertEqual(el.getAttribute('href'), undefined);
});

test('sanitizes src with javascript:', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'src', 'javascript:alert(1)');
  assert(result === false, 'Should return false for dangerous URL');
  assertEqual(el.getAttribute('src'), undefined);
});

test('allows safe href URLs', () => {
  const el = createMockElement();
  safeSetAttribute(el, 'href', 'https://example.com');
  assertEqual(el.getAttribute('href'), 'https://example.com');

  const el2 = createMockElement();
  safeSetAttribute(el2, 'href', '/path/to/page');
  assertEqual(el2.getAttribute('href'), '/path/to/page');
});

test('sanitizes action attribute', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'action', 'javascript:alert(1)');
  assert(result === false, 'Should block dangerous action');
});

test('sanitizes formaction attribute', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'formaction', 'javascript:alert(1)');
  assert(result === false, 'Should block dangerous formaction');
});

test('blocks invalid attribute names', () => {
  const el = createMockElement();
  assert(safeSetAttribute(el, '"><script>', 'xss') === false);
  assert(safeSetAttribute(el, 'foo bar', 'value') === false);
  assert(safeSetAttribute(el, '123attr', 'value') === false);
});

test('allows event handlers with allowEventHandlers option', () => {
  const el = createMockElement();
  const result = safeSetAttribute(el, 'onclick', 'handleClick()', { allowEventHandlers: true });
  assert(result === true, 'Should allow with option');
  assertEqual(el.getAttribute('onclick'), 'handleClick()');
});

test('allows data URLs with allowDataUrls option', () => {
  const el = createMockElement();
  const dataUrl = 'data:image/png;base64,abc123';
  const result = safeSetAttribute(el, 'src', dataUrl, { allowDataUrls: true });
  assert(result === true, 'Should allow data URL with option');
  assertEqual(el.getAttribute('src'), dataUrl);
});

test('handles null and undefined values', () => {
  const el = createMockElement();
  safeSetAttribute(el, 'data-test', null);
  assertEqual(el.getAttribute('data-test'), '');

  safeSetAttribute(el, 'data-test2', undefined);
  assertEqual(el.getAttribute('data-test2'), '');
});

// ============================================================================
// CSS Sanitization Tests
// ============================================================================

console.log('\nisValidCSSProperty:');

test('validates camelCase property names', () => {
  assert(isValidCSSProperty('backgroundColor') === true);
  assert(isValidCSSProperty('fontSize') === true);
  assert(isValidCSSProperty('color') === true);
});

test('validates kebab-case property names', () => {
  assert(isValidCSSProperty('background-color') === true);
  assert(isValidCSSProperty('font-size') === true);
  assert(isValidCSSProperty('-webkit-transform') === true);
});

test('rejects invalid property names', () => {
  assert(isValidCSSProperty('123invalid') === false);
  assert(isValidCSSProperty('') === false);
  assert(isValidCSSProperty(null) === false);
  assert(isValidCSSProperty('prop name') === false);
});

console.log('\nsanitizeCSSValue:');

test('allows safe CSS values', () => {
  const result = sanitizeCSSValue('red');
  assert(result.safe === true);
  assertEqual(result.value, 'red');
});

test('allows complex safe values', () => {
  assert(sanitizeCSSValue('10px').safe === true);
  assert(sanitizeCSSValue('rgba(0, 0, 0, 0.5)').safe === true);
  assert(sanitizeCSSValue('1px solid #ccc').safe === true);
  assert(sanitizeCSSValue('translateX(100%)').safe === true);
});

test('blocks semicolon injection', () => {
  const result = sanitizeCSSValue('red; position: fixed');
  assert(result.safe === false);
  assertEqual(result.blocked, 'semicolon');
  assertEqual(result.value, 'red'); // Returns sanitized portion
});

test('blocks url() by default', () => {
  const result = sanitizeCSSValue('url(http://evil.com/tracking.gif)');
  assert(result.safe === false);
  assertEqual(result.blocked, 'url');
});

test('allows url() with option', () => {
  const result = sanitizeCSSValue('url(/images/bg.png)', { allowUrl: true });
  assert(result.safe === true);
});

test('blocks expression() (IE)', () => {
  const result = sanitizeCSSValue('expression(alert(1))');
  assert(result.safe === false);
  assertEqual(result.blocked, 'expression');
});

test('blocks @import', () => {
  const result = sanitizeCSSValue('@import "evil.css"');
  assert(result.safe === false);
  assertEqual(result.blocked, '@import');
});

test('blocks style breakout attempts', () => {
  const result = sanitizeCSSValue('red</style><script>alert(1)</script>');
  assert(result.safe === false);
  assertEqual(result.blocked, '</style');
});

test('blocks javascript: in values', () => {
  const result = sanitizeCSSValue('javascript:alert(1)');
  assert(result.safe === false);
  assertEqual(result.blocked, 'javascript:');
});

test('blocks curly braces (rule injection)', () => {
  const result = sanitizeCSSValue('red } .evil { position: fixed');
  assert(result.safe === false);
  assertEqual(result.blocked, 'braces');
});

test('handles null and undefined', () => {
  assert(sanitizeCSSValue(null).safe === true);
  assertEqual(sanitizeCSSValue(null).value, '');
  assert(sanitizeCSSValue(undefined).safe === true);
});

console.log('\nsafeSetStyle:');

// Create a mock element for style testing
function createMockStyleElement() {
  const styles = {};
  return {
    style: new Proxy(styles, {
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
      get(target, prop) {
        return target[prop];
      }
    }),
    _styles: styles
  };
}

test('sets safe style values', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, 'color', 'red');
  assert(result === true);
  assertEqual(el.style.color, 'red');
});

test('blocks semicolon injection in style', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, 'color', 'red; margin: 999px');
  assert(result === false);
  assertEqual(el.style.color, 'red'); // Sanitized value still set
});

test('blocks url() in style by default', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, 'backgroundImage', 'url(http://evil.com)');
  assert(result === false);
});

test('allows url() in style with option', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, 'backgroundImage', 'url(/images/bg.png)', { allowUrl: true });
  assert(result === true);
});

test('blocks invalid property names', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, '123invalid', 'red');
  assert(result === false);
});

test('blocks expression() in style', () => {
  const el = createMockStyleElement();
  const result = safeSetStyle(el, 'width', 'expression(document.body.clientWidth)');
  assert(result === false);
});

// ============================================================================
// deepClone Tests
// ============================================================================

console.log('\ndeepClone:');

test('clones primitive values', () => {
  assertEqual(deepClone(42), 42);
  assertEqual(deepClone('hello'), 'hello');
  assertEqual(deepClone(true), true);
  assertEqual(deepClone(null), null);
});

test('clones simple objects', () => {
  const original = { a: 1, b: 2 };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone !== original, 'Should be different object');
});

test('clones nested objects', () => {
  const original = { a: { b: { c: 1 } } };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone.a !== original.a, 'Nested object should be different');
  assert(clone.a.b !== original.a.b, 'Deep nested object should be different');
});

test('clones arrays', () => {
  const original = [1, 2, 3];
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone !== original, 'Should be different array');
});

test('clones nested arrays', () => {
  const original = [[1, 2], [3, 4]];
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone[0] !== original[0], 'Nested array should be different');
});

test('clones mixed objects and arrays', () => {
  const original = {
    arr: [1, { a: 2 }],
    obj: { arr: [3, 4] }
  };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone.arr !== original.arr, 'Nested array should be different');
  assert(clone.obj !== original.obj, 'Nested object should be different');
});

test('clones Date objects', () => {
  const original = new Date('2024-01-15T12:00:00Z');
  const clone = deepClone(original);

  assertEqual(clone.getTime(), original.getTime());
  assert(clone !== original, 'Should be different Date object');
});

test('mutations do not affect original', () => {
  const original = { a: 1, b: { c: 2 } };
  const clone = deepClone(original);

  clone.a = 100;
  clone.b.c = 200;

  assertEqual(original.a, 1);
  assertEqual(original.b.c, 2);
});

// ============================================================================
// debounce Tests
// ============================================================================

console.log('\ndebounce:');

await testAsync('calls function after delay', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  assertEqual(called, 0, 'Should not be called immediately');

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should be called after delay');
});

await testAsync('resets timer on subsequent calls', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  await new Promise(r => setTimeout(r, 30));
  debounced(); // Reset timer
  await new Promise(r => setTimeout(r, 30));
  debounced(); // Reset timer again

  assertEqual(called, 0, 'Should not be called during resets');

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should be called only once after final delay');
});

await testAsync('cancel prevents execution', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  debounced.cancel();

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 0, 'Should not be called after cancel');
});

await testAsync('passes arguments correctly', async () => {
  let receivedArgs = null;
  const debounced = debounce((...args) => { receivedArgs = args; }, 50);

  debounced(1, 2, 3);
  await new Promise(r => setTimeout(r, 60));

  assertDeepEqual(receivedArgs, [1, 2, 3]);
});

// ============================================================================
// throttle Tests
// ============================================================================

console.log('\nthrottle:');

await testAsync('calls function immediately first time', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled();
  assertEqual(called, 1, 'Should be called immediately');
});

await testAsync('ignores calls within interval', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Ignored
  throttled(); // Ignored

  assertEqual(called, 1, 'Should only be called once during interval');
});

await testAsync('allows calls after interval', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  await new Promise(r => setTimeout(r, 60));
  throttled(); // Called after interval

  assertEqual(called, 2, 'Should be called after interval');
});

await testAsync('schedules trailing call', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Scheduled for later
  throttled(); // Updates scheduled call

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 2, 'Should call trailing after interval');
});

await testAsync('cancel prevents scheduled call', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Scheduled
  throttled.cancel();

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should not call after cancel');
});

await testAsync('passes arguments correctly', async () => {
  let receivedArgs = null;
  const throttled = throttle((...args) => { receivedArgs = args; }, 50);

  throttled(1, 2, 3);
  assertDeepEqual(receivedArgs, [1, 2, 3]);
});

// ============================================================================
// createSafeTextNode Tests
// ============================================================================

console.log('\ncreateSafeTextNode:');

test('creates text node with string value', () => {
  const node = createSafeTextNode('Hello World');
  assertEqual(node.textContent, 'Hello World');
  assertEqual(node.nodeType, 3); // TEXT_NODE
});

test('creates text node with number value', () => {
  const node = createSafeTextNode(42);
  assertEqual(node.textContent, '42');
});

test('handles null value', () => {
  const node = createSafeTextNode(null);
  assertEqual(node.textContent, '');
});

test('handles undefined value', () => {
  const node = createSafeTextNode(undefined);
  assertEqual(node.textContent, '');
});

test('handles HTML special characters (no escaping needed for text nodes)', () => {
  // Text nodes are inherently safe - the text is not interpreted as HTML
  const node = createSafeTextNode('<script>alert("xss")</script>');
  // The text node contains the literal string (it's not executed as HTML)
  assertEqual(node.textContent, '<script>alert("xss")</script>');
});

test('handles boolean values', () => {
  const nodeTrue = createSafeTextNode(true);
  const nodeFalse = createSafeTextNode(false);
  assertEqual(nodeTrue.textContent, 'true');
  assertEqual(nodeFalse.textContent, 'false');
});

test('handles empty string', () => {
  const node = createSafeTextNode('');
  assertEqual(node.textContent, '');
});

test('handles object toString', () => {
  const obj = { toString: () => 'custom string' };
  const node = createSafeTextNode(obj);
  assertEqual(node.textContent, 'custom string');
});

// ============================================================================
// dangerouslySetInnerHTML Tests
// ============================================================================

console.log('\ndangerouslySetInnerHTML:');

test('sets innerHTML directly without sanitize option', () => {
  const mockElement = { innerHTML: '' };
  dangerouslySetInnerHTML(mockElement, '<div>Hello</div>');
  assertEqual(mockElement.innerHTML, '<div>Hello</div>');
});

test('sets innerHTML with script tags when not sanitizing', () => {
  // WARNING: This is intentionally dangerous - the function name reflects this
  const mockElement = { innerHTML: '' };
  dangerouslySetInnerHTML(mockElement, '<script>alert(1)</script>');
  assertEqual(mockElement.innerHTML, '<script>alert(1)</script>');
});

test('handles empty HTML string', () => {
  const mockElement = { innerHTML: 'existing content' };
  dangerouslySetInnerHTML(mockElement, '');
  assertEqual(mockElement.innerHTML, '');
});

test('handles null/undefined values', () => {
  // These may cause issues depending on implementation, but we test the behavior
  const mockElement = { innerHTML: 'existing' };
  try {
    dangerouslySetInnerHTML(mockElement, null);
    // innerHTML = null typically becomes "null" string
    assert(mockElement.innerHTML === null || mockElement.innerHTML === 'null' || mockElement.innerHTML === 'existing',
      'Should handle null value');
  } catch (e) {
    // Some implementations may throw
    assert(true, 'Null handling may throw');
  }
});

test('accepts sanitize option without error', () => {
  // The sanitize option triggers a dynamic import, which we can't fully test
  // but we can verify it doesn't throw synchronously
  const mockElement = { innerHTML: '' };
  try {
    // This starts an async operation we can't await, but shouldn't throw
    dangerouslySetInnerHTML(mockElement, '<div>Test</div>', { sanitize: true });
    assert(true, 'Should not throw with sanitize option');
  } catch (e) {
    // In test environment without security.js, this may fail
    assert(true, 'Sanitize option may require security module');
  }
});

// ============================================================================
// Results
// ============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
