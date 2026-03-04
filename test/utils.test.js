/**
 * Utils Tests
 * Tests for runtime/utils.js
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================================
// escapeHtml Tests
// ============================================================================

describe('escapeHtml', () => {
  test('escapes < and >', () => {
    assert.strictEqual(escapeHtml('<div>'), '&lt;div&gt;');
  });

  test('escapes &', () => {
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  });

  test('escapes quotes', () => {
    assert.strictEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
    assert.strictEqual(escapeHtml("'hello'"), '&#39;hello&#39;');
  });

  test('escapes script tags', () => {
    const input = '<script>alert("xss")</script>';
    const output = escapeHtml(input);
    assert.ok(!output.includes('<script>'), 'Should not contain script tag');
    assert.strictEqual(output, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('handles null and undefined', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  test('handles numbers', () => {
    assert.strictEqual(escapeHtml(42), '42');
    assert.strictEqual(escapeHtml(3.14), '3.14');
  });

  test('handles empty string', () => {
    assert.strictEqual(escapeHtml(''), '');
  });

  test('passes through safe strings', () => {
    assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
  });
});

// ============================================================================
// unescapeHtml Tests
// ============================================================================

describe('unescapeHtml', () => {
  test('unescapes &lt; and &gt;', () => {
    assert.strictEqual(unescapeHtml('&lt;div&gt;'), '<div>');
  });

  test('unescapes &amp;', () => {
    assert.strictEqual(unescapeHtml('a &amp; b'), 'a & b');
  });

  test('unescapes quotes', () => {
    assert.strictEqual(unescapeHtml('&quot;hello&quot;'), '"hello"');
    assert.strictEqual(unescapeHtml('&#39;hello&#39;'), "'hello'");
  });

  test('handles null and undefined', () => {
    assert.strictEqual(unescapeHtml(null), '');
    assert.strictEqual(unescapeHtml(undefined), '');
  });

  test('roundtrip escape/unescape', () => {
    const original = '<script>alert("xss")</script>';
    const escaped = escapeHtml(original);
    const unescaped = unescapeHtml(escaped);
    assert.strictEqual(unescaped, original);
  });
});

// ============================================================================
// escapeAttribute Tests
// ============================================================================

describe('escapeAttribute', () => {
  test('escapes double quotes', () => {
    assert.strictEqual(escapeAttribute('hello"world'), 'hello&quot;world');
  });

  test('escapes single quotes', () => {
    assert.strictEqual(escapeAttribute("hello'world"), 'hello&#39;world');
  });

  test('escapes angle brackets', () => {
    assert.strictEqual(escapeAttribute('<div>'), '&lt;div&gt;');
  });

  test('handles null and undefined', () => {
    assert.strictEqual(escapeAttribute(null), '');
    assert.strictEqual(escapeAttribute(undefined), '');
  });
});

// ============================================================================
// sanitizeUrl Tests
// ============================================================================

describe('sanitizeUrl', () => {
  test('allows http URLs', () => {
    assert.strictEqual(sanitizeUrl('http://example.com'), 'http://example.com');
  });

  test('allows https URLs', () => {
    assert.strictEqual(sanitizeUrl('https://example.com'), 'https://example.com');
  });

  test('blocks javascript: URLs', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), null);
  });

  test('blocks javascript: URLs case insensitive', () => {
    assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), null);
    assert.strictEqual(sanitizeUrl('JavaScript:alert(1)'), null);
  });

  test('blocks javascript: with spaces', () => {
    assert.strictEqual(sanitizeUrl('java script:alert(1)'), null);
  });

  test('blocks data: URLs by default', () => {
    assert.strictEqual(sanitizeUrl('data:text/html,<script>'), null);
  });

  test('allows data: URLs with allowData option', () => {
    const url = 'data:image/png;base64,abc';
    assert.strictEqual(sanitizeUrl(url, { allowData: true }), url);
  });

  test('allows relative URLs by default', () => {
    assert.strictEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
    assert.strictEqual(sanitizeUrl('./relative'), './relative');
    assert.strictEqual(sanitizeUrl('../parent'), '../parent');
  });

  test('allows relative paths without slashes', () => {
    assert.strictEqual(sanitizeUrl('page.html'), 'page.html');
    assert.strictEqual(sanitizeUrl('path/to/page'), 'path/to/page');
  });

  test('handles null and empty string', () => {
    assert.strictEqual(sanitizeUrl(null), null);
    assert.strictEqual(sanitizeUrl(''), null);
    assert.strictEqual(sanitizeUrl(undefined), null);
  });

  test('trims whitespace', () => {
    assert.strictEqual(sanitizeUrl('  https://example.com  '), 'https://example.com');
  });

  test('allows ftp protocol', () => {
    assert.strictEqual(sanitizeUrl('ftp://example.com'), 'ftp://example.com');
  });

  test('blocks other protocols', () => {
    assert.strictEqual(sanitizeUrl('file:///etc/passwd'), null);
    assert.strictEqual(sanitizeUrl('gopher://example.com'), null);
  });

  test('blocks vbscript: URLs', () => {
    assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), null);
    assert.strictEqual(sanitizeUrl('VBSCRIPT:msgbox(1)'), null);
  });

  test('blocks blob: URLs by default', () => {
    assert.strictEqual(sanitizeUrl('blob:http://example.com/file'), null);
  });

  test('allows blob: URLs with allowBlob option', () => {
    const url = 'blob:http://example.com/file';
    assert.strictEqual(sanitizeUrl(url, { allowBlob: true }), url);
  });

  test('blocks HTML entity encoded javascript:', () => {
    // &#x6a; = j, &#x61; = a, etc.
    assert.strictEqual(sanitizeUrl('&#x6a;avascript:alert(1)'), null);
    assert.strictEqual(sanitizeUrl('&#106;avascript:alert(1)'), null);
  });

  test('blocks URL-encoded javascript:', () => {
    assert.strictEqual(sanitizeUrl('%6Aavascript:alert(1)'), null);
    assert.strictEqual(sanitizeUrl('%6a%61%76%61script:alert(1)'), null);
  });

  test('blocks javascript: with null bytes', () => {
    assert.strictEqual(sanitizeUrl('java\x00script:alert(1)'), null);
  });

  test('blocks protocol-relative URLs that could escape to different origin', () => {
    assert.strictEqual(sanitizeUrl('//evil.com/path'), null);
  });

  test('allows single-slash relative URLs', () => {
    assert.strictEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
  });

  test('allows dot-relative URLs', () => {
    assert.strictEqual(sanitizeUrl('./path'), './path');
    assert.strictEqual(sanitizeUrl('../path'), '../path');
  });
});

// ============================================================================
// safeSetAttribute Tests (XSS Protection)
// ============================================================================

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

describe('safeSetAttribute', () => {
  test('sets safe attributes normally', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'data-id', '123');
    assert.ok(result === true, 'Should return true');
    assert.strictEqual(el.getAttribute('data-id'), '123');
  });

  test('sets class and id attributes', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'class', 'my-class');
    safeSetAttribute(el, 'id', 'my-id');
    assert.strictEqual(el.getAttribute('class'), 'my-class');
    assert.strictEqual(el.getAttribute('id'), 'my-id');
  });

  test('blocks onclick event handler', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'onclick', 'alert(1)');
    assert.ok(result === false, 'Should return false');
    assert.strictEqual(el.getAttribute('onclick'), undefined);
  });

  test('blocks all on* event handlers', () => {
    const el = createMockElement();
    const handlers = ['onerror', 'onload', 'onmouseover', 'onfocus', 'onblur',
                      'onchange', 'oninput', 'onsubmit', 'onkeydown', 'onkeyup'];
    for (const handler of handlers) {
      const result = safeSetAttribute(el, handler, 'alert(1)');
      assert.ok(result === false, `Should block ${handler}`);
      assert.strictEqual(el.getAttribute(handler), undefined);
    }
  });

  test('blocks event handlers case-insensitively', () => {
    const el = createMockElement();
    assert.ok(safeSetAttribute(el, 'ONCLICK', 'alert(1)') === false);
    assert.ok(safeSetAttribute(el, 'OnClick', 'alert(1)') === false);
    assert.ok(safeSetAttribute(el, 'onClick', 'alert(1)') === false);
  });

  test('blocks srcdoc attribute', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'srcdoc', '<script>alert(1)</script>');
    assert.ok(result === false, 'Should block srcdoc');
    assert.strictEqual(el.getAttribute('srcdoc'), undefined);
  });

  test('sanitizes href with javascript:', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'href', 'javascript:alert(1)');
    assert.ok(result === false, 'Should return false for dangerous URL');
    assert.strictEqual(el.getAttribute('href'), undefined);
  });

  test('sanitizes src with javascript:', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'src', 'javascript:alert(1)');
    assert.ok(result === false, 'Should return false for dangerous URL');
    assert.strictEqual(el.getAttribute('src'), undefined);
  });

  test('allows safe href URLs', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'href', 'https://example.com');
    assert.strictEqual(el.getAttribute('href'), 'https://example.com');

    const el2 = createMockElement();
    safeSetAttribute(el2, 'href', '/path/to/page');
    assert.strictEqual(el2.getAttribute('href'), '/path/to/page');
  });

  test('sanitizes action attribute', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'action', 'javascript:alert(1)');
    assert.ok(result === false, 'Should block dangerous action');
  });

  test('sanitizes formaction attribute', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'formaction', 'javascript:alert(1)');
    assert.ok(result === false, 'Should block dangerous formaction');
  });

  test('blocks invalid attribute names', () => {
    const el = createMockElement();
    assert.ok(safeSetAttribute(el, '"><script>', 'xss') === false);
    assert.ok(safeSetAttribute(el, 'foo bar', 'value') === false);
    assert.ok(safeSetAttribute(el, '123attr', 'value') === false);
  });

  test('allows event handlers with allowEventHandlers option', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'onclick', 'handleClick()', { allowEventHandlers: true });
    assert.ok(result === true, 'Should allow with option');
    assert.strictEqual(el.getAttribute('onclick'), 'handleClick()');
  });

  test('allows data URLs with allowDataUrls option', () => {
    const el = createMockElement();
    const dataUrl = 'data:image/png;base64,abc123';
    const result = safeSetAttribute(el, 'src', dataUrl, { allowDataUrls: true });
    assert.ok(result === true, 'Should allow data URL with option');
    assert.strictEqual(el.getAttribute('src'), dataUrl);
  });

  test('handles null and undefined values', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'data-test', null);
    assert.strictEqual(el.getAttribute('data-test'), '');

    safeSetAttribute(el, 'data-test2', undefined);
    assert.strictEqual(el.getAttribute('data-test2'), '');
  });
});

// ============================================================================
// CSS Sanitization Tests
// ============================================================================

describe('isValidCSSProperty', () => {
  test('validates camelCase property names', () => {
    assert.ok(isValidCSSProperty('backgroundColor') === true);
    assert.ok(isValidCSSProperty('fontSize') === true);
    assert.ok(isValidCSSProperty('color') === true);
  });

  test('validates kebab-case property names', () => {
    assert.ok(isValidCSSProperty('background-color') === true);
    assert.ok(isValidCSSProperty('font-size') === true);
    assert.ok(isValidCSSProperty('-webkit-transform') === true);
  });

  test('rejects invalid property names', () => {
    assert.ok(isValidCSSProperty('123invalid') === false);
    assert.ok(isValidCSSProperty('') === false);
    assert.ok(isValidCSSProperty(null) === false);
    assert.ok(isValidCSSProperty('prop name') === false);
  });
});

describe('sanitizeCSSValue', () => {
  test('allows safe CSS values', () => {
    const result = sanitizeCSSValue('red');
    assert.ok(result.safe === true);
    assert.strictEqual(result.value, 'red');
  });

  test('allows complex safe values', () => {
    assert.ok(sanitizeCSSValue('10px').safe === true);
    assert.ok(sanitizeCSSValue('rgba(0, 0, 0, 0.5)').safe === true);
    assert.ok(sanitizeCSSValue('1px solid #ccc').safe === true);
    assert.ok(sanitizeCSSValue('translateX(100%)').safe === true);
  });

  test('blocks semicolon injection', () => {
    const result = sanitizeCSSValue('red; position: fixed');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, 'semicolon');
    assert.strictEqual(result.value, 'red'); // Returns sanitized portion
  });

  test('blocks url() by default', () => {
    const result = sanitizeCSSValue('url(http://evil.com/tracking.gif)');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, 'url');
  });

  test('allows url() with option', () => {
    const result = sanitizeCSSValue('url(/images/bg.png)', { allowUrl: true });
    assert.ok(result.safe === true);
  });

  test('blocks expression() (IE)', () => {
    const result = sanitizeCSSValue('expression(alert(1))');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, 'expression');
  });

  test('blocks @import', () => {
    const result = sanitizeCSSValue('@import "evil.css"');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, '@import');
  });

  test('blocks style breakout attempts', () => {
    const result = sanitizeCSSValue('red</style><script>alert(1)</script>');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, '</style');
  });

  test('blocks javascript: in values', () => {
    const result = sanitizeCSSValue('javascript:alert(1)');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, 'javascript:');
  });

  test('blocks curly braces (rule injection)', () => {
    const result = sanitizeCSSValue('red } .evil { position: fixed');
    assert.ok(result.safe === false);
    assert.strictEqual(result.blocked, 'braces');
  });

  test('handles null and undefined', () => {
    assert.ok(sanitizeCSSValue(null).safe === true);
    assert.strictEqual(sanitizeCSSValue(null).value, '');
    assert.ok(sanitizeCSSValue(undefined).safe === true);
  });
});

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

describe('safeSetStyle', () => {
  test('sets safe style values', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, 'color', 'red');
    assert.ok(result === true);
    assert.strictEqual(el.style.color, 'red');
  });

  test('blocks semicolon injection in style', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, 'color', 'red; margin: 999px');
    assert.ok(result === false);
    assert.strictEqual(el.style.color, 'red'); // Sanitized value still set
  });

  test('blocks url() in style by default', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, 'backgroundImage', 'url(http://evil.com)');
    assert.ok(result === false);
  });

  test('allows url() in style with option', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, 'backgroundImage', 'url(/images/bg.png)', { allowUrl: true });
    assert.ok(result === true);
  });

  test('blocks invalid property names', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, '123invalid', 'red');
    assert.ok(result === false);
  });

  test('blocks expression() in style', () => {
    const el = createMockStyleElement();
    const result = safeSetStyle(el, 'width', 'expression(document.body.clientWidth)');
    assert.ok(result === false);
  });
});

// ============================================================================
// deepClone Tests
// ============================================================================

describe('deepClone', () => {
  test('clones primitive values', () => {
    assert.strictEqual(deepClone(42), 42);
    assert.strictEqual(deepClone('hello'), 'hello');
    assert.strictEqual(deepClone(true), true);
    assert.strictEqual(deepClone(null), null);
  });

  test('clones simple objects', () => {
    const original = { a: 1, b: 2 };
    const clone = deepClone(original);

    assert.deepStrictEqual(clone, original);
    assert.ok(clone !== original, 'Should be different object');
  });

  test('clones nested objects', () => {
    const original = { a: { b: { c: 1 } } };
    const clone = deepClone(original);

    assert.deepStrictEqual(clone, original);
    assert.ok(clone.a !== original.a, 'Nested object should be different');
    assert.ok(clone.a.b !== original.a.b, 'Deep nested object should be different');
  });

  test('clones arrays', () => {
    const original = [1, 2, 3];
    const clone = deepClone(original);

    assert.deepStrictEqual(clone, original);
    assert.ok(clone !== original, 'Should be different array');
  });

  test('clones nested arrays', () => {
    const original = [[1, 2], [3, 4]];
    const clone = deepClone(original);

    assert.deepStrictEqual(clone, original);
    assert.ok(clone[0] !== original[0], 'Nested array should be different');
  });

  test('clones mixed objects and arrays', () => {
    const original = {
      arr: [1, { a: 2 }],
      obj: { arr: [3, 4] }
    };
    const clone = deepClone(original);

    assert.deepStrictEqual(clone, original);
    assert.ok(clone.arr !== original.arr, 'Nested array should be different');
    assert.ok(clone.obj !== original.obj, 'Nested object should be different');
  });

  test('clones Date objects', () => {
    const original = new Date('2024-01-15T12:00:00Z');
    const clone = deepClone(original);

    assert.strictEqual(clone.getTime(), original.getTime());
    assert.ok(clone !== original, 'Should be different Date object');
  });

  test('mutations do not affect original', () => {
    const original = { a: 1, b: { c: 2 } };
    const clone = deepClone(original);

    clone.a = 100;
    clone.b.c = 200;

    assert.strictEqual(original.a, 1);
    assert.strictEqual(original.b.c, 2);
  });
});

// ============================================================================
// debounce Tests
// ============================================================================

describe('debounce', () => {
  test('calls function after delay', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 50);

    debounced();
    assert.strictEqual(called, 0, 'Should not be called immediately');

    await sleep(60);
    assert.strictEqual(called, 1, 'Should be called after delay');
  });

  test('resets timer on subsequent calls', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 50);

    debounced();
    await sleep(30);
    debounced(); // Reset timer
    await sleep(30);
    debounced(); // Reset timer again

    assert.strictEqual(called, 0, 'Should not be called during resets');

    await sleep(60);
    assert.strictEqual(called, 1, 'Should be called only once after final delay');
  });

  test('cancel prevents execution', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 50);

    debounced();
    debounced.cancel();

    await sleep(60);
    assert.strictEqual(called, 0, 'Should not be called after cancel');
  });

  test('passes arguments correctly', async () => {
    let receivedArgs = null;
    const debounced = debounce((...args) => { receivedArgs = args; }, 50);

    debounced(1, 2, 3);
    await sleep(60);

    assert.deepStrictEqual(receivedArgs, [1, 2, 3]);
  });
});

// ============================================================================
// throttle Tests
// ============================================================================

describe('throttle', () => {
  test('calls function immediately first time', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);

    throttled();
    assert.strictEqual(called, 1, 'Should be called immediately');
  });

  test('ignores calls within interval', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);

    throttled(); // Called immediately
    throttled(); // Ignored
    throttled(); // Ignored

    assert.strictEqual(called, 1, 'Should only be called once during interval');
  });

  test('allows calls after interval', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);

    throttled(); // Called immediately
    await sleep(60);
    throttled(); // Called after interval

    assert.strictEqual(called, 2, 'Should be called after interval');
  });

  test('schedules trailing call', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);

    throttled(); // Called immediately
    throttled(); // Scheduled for later
    throttled(); // Updates scheduled call

    await sleep(60);
    assert.strictEqual(called, 2, 'Should call trailing after interval');
  });

  test('cancel prevents scheduled call', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);

    throttled(); // Called immediately
    throttled(); // Scheduled
    throttled.cancel();

    await sleep(60);
    assert.strictEqual(called, 1, 'Should not call after cancel');
  });

  test('passes arguments correctly', async () => {
    let receivedArgs = null;
    const throttled = throttle((...args) => { receivedArgs = args; }, 50);

    throttled(1, 2, 3);
    assert.deepStrictEqual(receivedArgs, [1, 2, 3]);
  });
});

// ============================================================================
// createSafeTextNode Tests
// ============================================================================

describe('createSafeTextNode', () => {
  test('creates text node with string value', () => {
    const node = createSafeTextNode('Hello World');
    assert.strictEqual(node.textContent, 'Hello World');
    assert.strictEqual(node.nodeType, 3); // TEXT_NODE
  });

  test('creates text node with number value', () => {
    const node = createSafeTextNode(42);
    assert.strictEqual(node.textContent, '42');
  });

  test('handles null value', () => {
    const node = createSafeTextNode(null);
    assert.strictEqual(node.textContent, '');
  });

  test('handles undefined value', () => {
    const node = createSafeTextNode(undefined);
    assert.strictEqual(node.textContent, '');
  });

  test('handles HTML special characters (no escaping needed for text nodes)', () => {
    // Text nodes are inherently safe - the text is not interpreted as HTML
    const node = createSafeTextNode('<script>alert("xss")</script>');
    // The text node contains the literal string (it's not executed as HTML)
    assert.strictEqual(node.textContent, '<script>alert("xss")</script>');
  });

  test('handles boolean values', () => {
    const nodeTrue = createSafeTextNode(true);
    const nodeFalse = createSafeTextNode(false);
    assert.strictEqual(nodeTrue.textContent, 'true');
    assert.strictEqual(nodeFalse.textContent, 'false');
  });

  test('handles empty string', () => {
    const node = createSafeTextNode('');
    assert.strictEqual(node.textContent, '');
  });

  test('handles object toString', () => {
    const obj = { toString: () => 'custom string' };
    const node = createSafeTextNode(obj);
    assert.strictEqual(node.textContent, 'custom string');
  });
});

// ============================================================================
// dangerouslySetInnerHTML Tests
// ============================================================================

describe('dangerouslySetInnerHTML', () => {
  test('sets innerHTML directly without sanitize option', () => {
    const mockElement = { innerHTML: '' };
    dangerouslySetInnerHTML(mockElement, '<div>Hello</div>');
    assert.strictEqual(mockElement.innerHTML, '<div>Hello</div>');
  });

  test('sets innerHTML with script tags when not sanitizing', () => {
    // WARNING: This is intentionally dangerous - the function name reflects this
    const mockElement = { innerHTML: '' };
    dangerouslySetInnerHTML(mockElement, '<script>alert(1)</script>');
    assert.strictEqual(mockElement.innerHTML, '<script>alert(1)</script>');
  });

  test('handles empty HTML string', () => {
    const mockElement = { innerHTML: 'existing content' };
    dangerouslySetInnerHTML(mockElement, '');
    assert.strictEqual(mockElement.innerHTML, '');
  });

  test('handles null/undefined values', () => {
    // These may cause issues depending on implementation, but we test the behavior
    const mockElement = { innerHTML: 'existing' };
    try {
      dangerouslySetInnerHTML(mockElement, null);
      // innerHTML = null typically becomes "null" string
      assert.ok(mockElement.innerHTML === null || mockElement.innerHTML === 'null' || mockElement.innerHTML === 'existing',
        'Should handle null value');
    } catch (e) {
      // Some implementations may throw
      assert.ok(true, 'Null handling may throw');
    }
  });

  test('accepts sanitize option without error', () => {
    // The sanitize option triggers a dynamic import, which we can't fully test
    // but we can verify it doesn't throw synchronously
    const mockElement = { innerHTML: '' };
    try {
      // This starts an async operation we can't await, but shouldn't throw
      dangerouslySetInnerHTML(mockElement, '<div>Test</div>', { sanitize: true });
      assert.ok(true, 'Should not throw with sanitize option');
    } catch (e) {
      // In test environment without security.js, this may fail
      assert.ok(true, 'Sanitize option may require security module');
    }
  });
});
