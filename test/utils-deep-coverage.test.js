/**
 * Utils Deep Coverage Tests
 *
 * Targets uncovered lines in runtime/utils.js to push coverage from ~70% to 92%+.
 * Uncovered lines: 32-40, 66-79, 96-97, 115-122, 179-181, 187-192, 196-201,
 *   220-221, 292-293, 300-306, 311-314, 318-319, 341-343, 353-354, 358-367,
 *   389-408, 428-448, 463-494, 505-506, 529-539, 550-551, 562-563, 573-574,
 *   587-605
 *
 * @module test/utils-deep-coverage
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

import {
  escapeHtml,
  unescapeHtml,
  dangerouslySetInnerHTML,
  createSafeTextNode,
  escapeAttribute,
  safeSetAttribute,
  sanitizeUrl,
  isValidCSSProperty,
  sanitizeCSSValue,
  safeSetStyle,
  deepClone,
  debounce,
  throttle,
  isBrowser,
  onWindowEvent,
  onWindowFocus,
  onWindowOnline,
  onWindowOffline,
  onNetworkChange
} from '../runtime/utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockElement() {
  const attrs = {};
  return {
    setAttribute: mock.fn((name, value) => { attrs[name] = value; }),
    getAttribute: (name) => attrs[name],
    removeAttribute: (name) => { delete attrs[name]; },
    innerHTML: '',
    style: {},
    tagName: 'DIV',
    _attrs: attrs
  };
}

function createMockWindow() {
  const listeners = {};
  return {
    addEventListener: mock.fn((event, handler, options) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push({ handler, options });
    }),
    removeEventListener: mock.fn((event, handler) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(l => l.handler !== handler);
      }
    }),
    _listeners: listeners,
    _dispatch: (event) => {
      if (listeners[event]) {
        listeners[event].forEach(l => l.handler());
      }
    }
  };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// 1. unescapeHtml — lines 31-40
// ---------------------------------------------------------------------------

describe('unescapeHtml (lines 31-40)', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(unescapeHtml(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(unescapeHtml(undefined), '');
  });

  test('unescapes &lt; to <', () => {
    assert.strictEqual(unescapeHtml('&lt;div&gt;'), '<div>');
  });

  test('unescapes &gt; to >', () => {
    assert.strictEqual(unescapeHtml('a &gt; b'), 'a > b');
  });

  test('unescapes &quot; to "', () => {
    assert.strictEqual(unescapeHtml('&quot;hello&quot;'), '"hello"');
  });

  test('unescapes &#39; to single quote', () => {
    assert.strictEqual(unescapeHtml('&#39;hello&#39;'), "'hello'");
  });

  test('unescapes &amp; to & (last, to avoid double-unescaping)', () => {
    assert.strictEqual(unescapeHtml('a &amp; b'), 'a & b');
  });

  test('unescapes &amp;lt; to &lt; (not to <, preventing double-unescape)', () => {
    // &amp;lt; -> &lt; (NOT <), because &amp; is unescaped last
    assert.strictEqual(unescapeHtml('&amp;lt;'), '&lt;');
  });

  test('converts non-string values with String()', () => {
    assert.strictEqual(unescapeHtml(42), '42');
    assert.strictEqual(unescapeHtml(true), 'true');
  });

  test('full roundtrip: escape then unescape', () => {
    const original = '<script>alert("xss") & \'test\'</script>';
    const escaped = escapeHtml(original);
    const unescaped = unescapeHtml(escaped);
    assert.strictEqual(unescaped, original);
  });

  test('passes through a plain string unchanged', () => {
    assert.strictEqual(unescapeHtml('Hello World'), 'Hello World');
  });
});

// ---------------------------------------------------------------------------
// 2. dangerouslySetInnerHTML — lines 65-79
// ---------------------------------------------------------------------------

describe('dangerouslySetInnerHTML (lines 65-79)', () => {
  test('sets innerHTML directly when sanitize is false (default)', () => {
    const el = createMockElement();
    dangerouslySetInnerHTML(el, '<b>bold</b>');
    assert.strictEqual(el.innerHTML, '<b>bold</b>');
  });

  test('sets innerHTML with dangerous content when not sanitizing', () => {
    const el = createMockElement();
    dangerouslySetInnerHTML(el, '<script>evil()</script>');
    assert.strictEqual(el.innerHTML, '<script>evil()</script>');
  });

  test('issues no error when called without options', () => {
    const el = createMockElement();
    assert.doesNotThrow(() => dangerouslySetInnerHTML(el, '<p>ok</p>'));
  });

  test('issues a console warning in non-production when sanitize is omitted', () => {
    const el = createMockElement();
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      dangerouslySetInnerHTML(el, '<p>test</p>');
      // In dev mode (NODE_ENV !== 'production') a warning should be emitted
      assert.ok(warnings.length > 0, 'Expected a console.warn call');
    } finally {
      console.warn = origWarn;
    }
  });

  test('uses sanitizeHtml when sanitize: true is passed', () => {
    const el = createMockElement();
    // In Node.js (no DOMParser) sanitizeHtml strips all tags, leaving text only
    dangerouslySetInnerHTML(el, '<p>safe text</p>', { sanitize: true });
    // The fallback sanitizer strips tags in non-browser environment
    assert.ok(typeof el.innerHTML === 'string');
    // Dangerous script should be stripped or text extracted
    assert.ok(!el.innerHTML.includes('<script>'));
  });

  test('with sanitize: true and script content, strips the script', () => {
    const el = createMockElement();
    dangerouslySetInnerHTML(el, '<script>alert(1)</script>Hello', { sanitize: true });
    assert.ok(!el.innerHTML.includes('<script>'), 'Script tag should be removed');
  });

  test('passes extra sanitize options through', () => {
    const el = createMockElement();
    // allowedTags and allowedAttrs are passed through — must not throw
    assert.doesNotThrow(() => {
      dangerouslySetInnerHTML(el, '<p class="test">text</p>', {
        sanitize: true,
        allowedTags: new Set(['p']),
        allowedAttrs: new Set(['class'])
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 3. createSafeTextNode — lines 95-97
// ---------------------------------------------------------------------------

describe('createSafeTextNode (lines 95-97)', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
    globalThis.document = {
      createTextNode: mock.fn((text) => ({
        nodeType: 3,
        textContent: text,
        nodeValue: text
      }))
    };
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test('creates a text node with the given string value', () => {
    const node = createSafeTextNode('hello');
    assert.strictEqual(node.textContent, 'hello');
    assert.strictEqual(node.nodeType, 3);
  });

  test('converts null to empty string', () => {
    const node = createSafeTextNode(null);
    assert.strictEqual(node.textContent, '');
  });

  test('converts undefined to empty string', () => {
    const node = createSafeTextNode(undefined);
    assert.strictEqual(node.textContent, '');
  });

  test('converts number to string', () => {
    const node = createSafeTextNode(42);
    assert.strictEqual(node.textContent, '42');
  });

  test('converts boolean to string', () => {
    const node = createSafeTextNode(true);
    assert.strictEqual(node.textContent, 'true');
  });

  test('passes special HTML chars as-is (text nodes are inherently safe)', () => {
    const node = createSafeTextNode('<script>alert(1)</script>');
    assert.strictEqual(node.textContent, '<script>alert(1)</script>');
  });

  test('calls document.createTextNode exactly once', () => {
    createSafeTextNode('test');
    assert.strictEqual(globalThis.document.createTextNode.mock.calls.length, 1);
  });
});

// ---------------------------------------------------------------------------
// 4. escapeAttribute — lines 114-122
// ---------------------------------------------------------------------------

describe('escapeAttribute (lines 114-122)', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(escapeAttribute(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(escapeAttribute(undefined), '');
  });

  test('escapes & to &amp;', () => {
    assert.strictEqual(escapeAttribute('a & b'), 'a &amp; b');
  });

  test('escapes double quote to &quot;', () => {
    assert.strictEqual(escapeAttribute('say "hello"'), 'say &quot;hello&quot;');
  });

  test('escapes single quote to &#39;', () => {
    assert.strictEqual(escapeAttribute("it's"), "it&#39;s");
  });

  test('escapes < to &lt;', () => {
    assert.strictEqual(escapeAttribute('<div>'), '&lt;div&gt;');
  });

  test('escapes > to &gt;', () => {
    assert.strictEqual(escapeAttribute('a > b'), 'a &gt; b');
  });

  test('converts numbers to escaped strings', () => {
    assert.strictEqual(escapeAttribute(42), '42');
  });

  test('escapes a value with all special chars', () => {
    assert.strictEqual(
      escapeAttribute('& " \' < >'),
      '&amp; &quot; &#39; &lt; &gt;'
    );
  });

  test('passes through safe strings unchanged', () => {
    assert.strictEqual(escapeAttribute('hello-world_123'), 'hello-world_123');
  });
});

// ---------------------------------------------------------------------------
// 5. safeSetAttribute — lines 179-181, 187-192, 196-201, 220-221
// ---------------------------------------------------------------------------

describe('safeSetAttribute (lines 179-181, 187-192, 196-201, 220-221)', () => {
  test('blocks invalid attribute name starting with digit (line 179-181)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, '123bad', 'val');
    assert.strictEqual(result, false);
    assert.strictEqual(el.setAttribute.mock.calls.length, 0);
  });

  test('blocks attribute name containing spaces (line 179-181)', () => {
    const el = createMockElement();
    assert.strictEqual(safeSetAttribute(el, 'foo bar', 'val'), false);
  });

  test('blocks attribute name with injection characters (line 179-181)', () => {
    const el = createMockElement();
    assert.strictEqual(safeSetAttribute(el, '"><script>', 'xss'), false);
  });

  test('blocks onclick event handler (line 187-192)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'onclick', 'evil()');
    assert.strictEqual(result, false);
    assert.strictEqual(el.setAttribute.mock.calls.length, 0);
  });

  test('blocks onerror event handler (line 187-192)', () => {
    const el = createMockElement();
    assert.strictEqual(safeSetAttribute(el, 'onerror', 'evil()'), false);
  });

  test('blocks ONCLICK (case-insensitive, line 187-192)', () => {
    const el = createMockElement();
    assert.strictEqual(safeSetAttribute(el, 'ONCLICK', 'evil()'), false);
  });

  test('allows event handlers when allowEventHandlers: true (line 187-192 bypass)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'onclick', 'handler()', { allowEventHandlers: true });
    assert.strictEqual(result, true);
  });

  test('blocks srcdoc attribute by default (line 196-201)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'srcdoc', '<script>evil()</script>');
    assert.strictEqual(result, false);
    assert.strictEqual(el.setAttribute.mock.calls.length, 0);
  });

  test('allows srcdoc when allowUnsafeHtml: true (line 196-201 bypass)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'srcdoc', '<p>safe</p>', { allowUnsafeHtml: true });
    assert.strictEqual(result, true);
  });

  test('uses element.setAttribute directly when no domAdapter (line 220-221)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'data-x', 'hello');
    assert.strictEqual(result, true);
    assert.strictEqual(el.setAttribute.mock.calls.length, 1);
    assert.strictEqual(el.setAttribute.mock.calls[0].arguments[0], 'data-x');
    assert.strictEqual(el.setAttribute.mock.calls[0].arguments[1], 'hello');
  });

  test('uses domAdapter.setAttribute when adapter is provided (line 217-219)', () => {
    const el = createMockElement();
    const adapterCalls = [];
    const adapter = { setAttribute: (elem, name, val) => adapterCalls.push({ name, val }) };
    const result = safeSetAttribute(el, 'data-y', 'world', {}, adapter);
    assert.strictEqual(result, true);
    assert.strictEqual(adapterCalls.length, 1);
    assert.strictEqual(adapterCalls[0].name, 'data-y');
    assert.strictEqual(adapterCalls[0].val, 'world');
    // element.setAttribute should NOT have been called
    assert.strictEqual(el.setAttribute.mock.calls.length, 0);
  });

  test('converts null value to empty string before setting (line 216)', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'data-test', null);
    assert.strictEqual(el.setAttribute.mock.calls[0].arguments[1], '');
  });

  test('converts undefined value to empty string before setting (line 216)', () => {
    const el = createMockElement();
    safeSetAttribute(el, 'data-test', undefined);
    assert.strictEqual(el.setAttribute.mock.calls[0].arguments[1], '');
  });

  test('blocks dangerous href (javascript:) URL and returns false (line 206-211)', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'href', 'javascript:alert(1)');
    assert.strictEqual(result, false);
    assert.strictEqual(el.setAttribute.mock.calls.length, 0);
  });

  test('allows safe https href URL', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'href', 'https://example.com');
    assert.strictEqual(result, true);
  });

  test('allows data: URL for src when allowDataUrls: true', () => {
    const el = createMockElement();
    const result = safeSetAttribute(el, 'src', 'data:image/png;base64,abc', { allowDataUrls: true });
    assert.strictEqual(result, true);
  });

  test('blocks all URL attributes with javascript:', () => {
    const urlAttrs = ['src', 'action', 'formaction', 'data', 'poster',
                      'cite', 'codebase', 'background', 'longdesc',
                      'dynsrc', 'lowsrc', 'srcset', 'imagesrcset'];
    for (const attr of urlAttrs) {
      const el = createMockElement();
      assert.strictEqual(
        safeSetAttribute(el, attr, 'javascript:evil()'),
        false,
        `${attr} should be blocked`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 6. sanitizeCSSValue — lines 292-293, 300-306, 311-314, 318-319
// ---------------------------------------------------------------------------

describe('sanitizeCSSValue (lines 292-293, 300-306, 311-314, 318-319)', () => {
  test('returns { safe: true, value: "" } for null (line 292-293)', () => {
    const result = sanitizeCSSValue(null);
    assert.strictEqual(result.safe, true);
    assert.strictEqual(result.value, '');
  });

  test('returns { safe: true, value: "" } for undefined (line 292-293)', () => {
    const result = sanitizeCSSValue(undefined);
    assert.strictEqual(result.safe, true);
    assert.strictEqual(result.value, '');
  });

  test('blocks url() pattern by default and returns blocked name (line 300-305)', () => {
    const result = sanitizeCSSValue('url(http://evil.com)');
    assert.strictEqual(result.safe, false);
    assert.strictEqual(result.value, '');
    assert.ok(result.blocked.includes('url'), `Expected blocked to contain 'url', got: ${result.blocked}`);
  });

  test('allows url() when allowUrl: true (line 301-303)', () => {
    const result = sanitizeCSSValue('url(/bg.png)', { allowUrl: true });
    assert.strictEqual(result.safe, true);
  });

  test('blocks expression() pattern (line 300-305)', () => {
    const result = sanitizeCSSValue('expression(alert(1))');
    assert.strictEqual(result.safe, false);
    assert.ok(result.blocked.includes('expression'));
  });

  test('blocks @import pattern (line 300-305)', () => {
    const result = sanitizeCSSValue('@import "evil.css"');
    assert.strictEqual(result.safe, false);
    assert.ok(result.blocked.includes('@import'));
  });

  test('blocks </style breakout attempt (line 300-305)', () => {
    const result = sanitizeCSSValue('red</style><script>xss');
    assert.strictEqual(result.safe, false);
    assert.ok(result.blocked.includes('</style'));
  });

  test('blocks javascript: in CSS value (line 300-305)', () => {
    const result = sanitizeCSSValue('javascript:alert(1)');
    assert.strictEqual(result.safe, false);
    assert.ok(result.blocked.includes('javascript:'));
  });

  test('blocks behavior: CSS property (line 300-305)', () => {
    const result = sanitizeCSSValue('behavior: url(evil.htc)');
    assert.strictEqual(result.safe, false);
  });

  test('blocks -moz-binding (line 300-305)', () => {
    const result = sanitizeCSSValue('-moz-binding: url(evil.xml)');
    assert.strictEqual(result.safe, false);
  });

  test('blocks semicolon and returns sanitized portion (line 311-313)', () => {
    const result = sanitizeCSSValue('red; margin: 999px');
    assert.strictEqual(result.safe, false);
    assert.strictEqual(result.blocked, 'semicolon');
    assert.strictEqual(result.value, 'red');
  });

  test('allows semicolons when allowMultiple: true (line 310 bypass)', () => {
    const result = sanitizeCSSValue('color: red; margin: 0', { allowMultiple: true });
    assert.strictEqual(result.safe, true);
  });

  test('blocks opening curly brace (line 317-319)', () => {
    const result = sanitizeCSSValue('red } .evil { color: blue');
    assert.strictEqual(result.safe, false);
    assert.strictEqual(result.blocked, 'braces');
  });

  test('blocks closing curly brace alone (line 317-319)', () => {
    const result = sanitizeCSSValue('}');
    assert.strictEqual(result.safe, false);
    assert.strictEqual(result.blocked, 'braces');
  });

  test('returns safe result for plain safe value', () => {
    const result = sanitizeCSSValue('rgba(0,0,0,0.5)');
    assert.strictEqual(result.safe, true);
    assert.strictEqual(result.value, 'rgba(0,0,0,0.5)');
  });
});

// ---------------------------------------------------------------------------
// 7. safeSetStyle — lines 341-343, 353-354, 358-367
// ---------------------------------------------------------------------------

describe('safeSetStyle (lines 341-343, 353-354, 358-367)', () => {
  test('rejects invalid CSS property name and returns false (line 341-343)', () => {
    const el = { style: {} };
    const result = safeSetStyle(el, '123invalid', 'red');
    assert.strictEqual(result, false);
    assert.strictEqual(Object.keys(el.style).length, 0);
  });

  test('rejects empty string CSS property name (line 341-343)', () => {
    const el = { style: {} };
    assert.strictEqual(safeSetStyle(el, '', 'red'), false);
  });

  test('sets style on element directly when no adapter (line 353-354)', () => {
    const el = { style: {} };
    const result = safeSetStyle(el, 'color', 'blue');
    assert.strictEqual(result, true);
    assert.strictEqual(el.style.color, 'blue');
  });

  test('uses domAdapter.setStyle when adapter provided (line 350-352)', () => {
    const el = { style: {} };
    const adapterCalls = [];
    const adapter = { setStyle: (elem, p, v) => adapterCalls.push({ p, v }) };
    const result = safeSetStyle(el, 'color', 'green', {}, adapter);
    assert.strictEqual(result, true);
    assert.strictEqual(adapterCalls.length, 1);
    assert.strictEqual(adapterCalls[0].p, 'color');
    assert.strictEqual(adapterCalls[0].v, 'green');
    // direct assignment should NOT have happened
    assert.strictEqual(el.style.color, undefined);
  });

  test('when CSS is unsafe, logs warning and returns false (line 358-366)', () => {
    const el = { style: {} };
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
    try {
      const result = safeSetStyle(el, 'color', 'url(http://evil.com)');
      assert.strictEqual(result, false);
      assert.ok(warnings.length > 0, 'Expected a warning');
    } finally {
      console.warn = origWarn;
    }
  });

  test('when blocked value has a sanitized portion, still sets it (line 363-365)', () => {
    const el = { style: {} };
    // semicolon injection: "red; margin: 999px" -> blocked='semicolon', value='red'
    const result = safeSetStyle(el, 'color', 'red; margin: 999px');
    assert.strictEqual(result, false);
    // The sanitized portion 'red' should still be set
    assert.strictEqual(el.style.color, 'red');
  });

  test('when blocked value has a sanitized portion, uses adapter to set it (line 350-352 + 363-365)', () => {
    const el = { style: {} };
    const adapterCalls = [];
    const adapter = { setStyle: (elem, p, v) => adapterCalls.push({ p, v }) };
    const result = safeSetStyle(el, 'color', 'red; margin: 999px', {}, adapter);
    assert.strictEqual(result, false);
    assert.strictEqual(adapterCalls.length, 1);
    assert.strictEqual(adapterCalls[0].v, 'red');
  });

  test('when blocked value is empty string, does NOT set style (line 363)', () => {
    const el = { style: {} };
    // url() returns value: '' when blocked
    const result = safeSetStyle(el, 'backgroundImage', 'url(http://evil.com)');
    assert.strictEqual(result, false);
    // value is '' so setStyle should NOT be called
    assert.strictEqual(el.style.backgroundImage, undefined);
  });

  test('allows url() in style with allowUrl: true', () => {
    const el = { style: {} };
    const result = safeSetStyle(el, 'backgroundImage', 'url(/img.png)', { allowUrl: true });
    assert.strictEqual(result, true);
    assert.strictEqual(el.style.backgroundImage, 'url(/img.png)');
  });
});

// ---------------------------------------------------------------------------
// 8. deepClone — lines 389-408
// ---------------------------------------------------------------------------

describe('deepClone (lines 389-408)', () => {
  test('returns null unchanged (line 389)', () => {
    assert.strictEqual(deepClone(null), null);
  });

  test('returns primitive numbers unchanged (line 389-390)', () => {
    assert.strictEqual(deepClone(42), 42);
    assert.strictEqual(deepClone(0), 0);
  });

  test('returns primitive strings unchanged (line 389-390)', () => {
    assert.strictEqual(deepClone('hello'), 'hello');
  });

  test('returns primitive booleans unchanged (line 389-390)', () => {
    assert.strictEqual(deepClone(true), true);
    assert.strictEqual(deepClone(false), false);
  });

  test('returns undefined unchanged (line 389-390)', () => {
    assert.strictEqual(deepClone(undefined), undefined);
  });

  test('clones Date objects preserving time (line 393-395)', () => {
    const original = new Date('2024-06-15T12:00:00Z');
    const clone = deepClone(original);
    assert.ok(clone instanceof Date, 'Clone should be a Date');
    assert.strictEqual(clone.getTime(), original.getTime());
    assert.notStrictEqual(clone, original, 'Should be a new Date instance');
  });

  test('clones arrays recursively (line 397-399)', () => {
    const original = [1, 2, [3, 4]];
    const clone = deepClone(original);
    assert.deepStrictEqual(clone, original);
    assert.notStrictEqual(clone, original);
    assert.notStrictEqual(clone[2], original[2]);
  });

  test('clones empty array (line 397-399)', () => {
    const clone = deepClone([]);
    assert.deepStrictEqual(clone, []);
  });

  test('clones nested objects recursively (line 401-407)', () => {
    const original = { a: 1, b: { c: 2, d: { e: 3 } } };
    const clone = deepClone(original);
    assert.deepStrictEqual(clone, original);
    assert.notStrictEqual(clone, original);
    assert.notStrictEqual(clone.b, original.b);
    assert.notStrictEqual(clone.b.d, original.b.d);
  });

  test('clones empty object (line 401-407)', () => {
    const clone = deepClone({});
    assert.deepStrictEqual(clone, {});
  });

  test('filters out DANGEROUS_KEYS like __proto__ (line 403)', () => {
    // Construct object with a dangerous key using defineProperty to avoid syntax error
    const obj = {};
    Object.defineProperty(obj, '__proto__', { value: 'polluted', enumerable: true, configurable: true });
    const clone = deepClone(obj);
    // __proto__ should NOT be in the clone
    assert.strictEqual(Object.prototype.hasOwnProperty.call(clone, '__proto__'), false);
  });

  test('filters out "constructor" key (line 403)', () => {
    // Create an object with an OWN "constructor" property to trigger the DANGEROUS_KEYS filter
    const obj = Object.create(null);
    obj.constructor = 'override';
    obj.safe = 'value';
    const clone = deepClone(obj);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(clone, 'constructor'), false);
    assert.strictEqual(clone.safe, 'value');
  });

  test('filters out "prototype" key (line 403)', () => {
    const obj = { prototype: 'polluted', data: 42 };
    const clone = deepClone(obj);
    assert.strictEqual(clone.prototype, undefined);
    assert.strictEqual(clone.data, 42);
  });

  test('skips non-own (inherited) properties (line 402)', () => {
    function Parent() {}
    Parent.prototype.inherited = 'fromParent';
    const obj = new Parent();
    obj.own = 'mine';
    const clone = deepClone(obj);
    assert.strictEqual(clone.own, 'mine');
    assert.strictEqual(clone.inherited, undefined);
  });

  test('mutations to clone do not affect original', () => {
    const original = { a: 1, nested: { b: 2 } };
    const clone = deepClone(original);
    clone.a = 999;
    clone.nested.b = 999;
    assert.strictEqual(original.a, 1);
    assert.strictEqual(original.nested.b, 2);
  });

  test('clones mixed arrays with objects and dates', () => {
    const original = [{ a: 1 }, new Date('2020-01-01'), [2, 3]];
    const clone = deepClone(original);
    assert.deepStrictEqual(clone[0], { a: 1 });
    assert.ok(clone[1] instanceof Date);
    assert.deepStrictEqual(clone[2], [2, 3]);
    assert.notStrictEqual(clone[0], original[0]);
    assert.notStrictEqual(clone[1], original[1]);
  });
});

// ---------------------------------------------------------------------------
// 9. debounce — lines 428-448
// ---------------------------------------------------------------------------

describe('debounce (lines 428-448)', () => {
  test('does not call fn immediately (line 434)', () => {
    let called = 0;
    const debounced = debounce(() => called++, 50);
    debounced();
    assert.strictEqual(called, 0);
  });

  test('calls fn after the delay (line 434-437)', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 30);
    debounced();
    await sleep(50);
    assert.strictEqual(called, 1);
  });

  test('resets the timer when called again within delay (line 431-433)', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 40);
    debounced();
    await sleep(20);
    debounced(); // reset
    await sleep(20);
    // Still within the new delay — should not have fired yet
    assert.strictEqual(called, 0);
    await sleep(30);
    assert.strictEqual(called, 1);
  });

  test('cancel prevents pending execution (line 440-445)', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 40);
    debounced();
    debounced.cancel();
    await sleep(60);
    assert.strictEqual(called, 0);
  });

  test('cancel is safe to call when no pending timer (line 440-445)', () => {
    const debounced = debounce(() => {}, 50);
    // No call made — cancel should be a no-op
    assert.doesNotThrow(() => debounced.cancel());
  });

  test('cancel can be called multiple times without error (line 440-445)', () => {
    const debounced = debounce(() => {}, 50);
    debounced();
    assert.doesNotThrow(() => {
      debounced.cancel();
      debounced.cancel();
      debounced.cancel();
    });
  });

  test('passes arguments to the function (line 435)', async () => {
    let received = null;
    const debounced = debounce((...args) => { received = args; }, 30);
    debounced(1, 'two', { three: 3 });
    await sleep(50);
    assert.deepStrictEqual(received, [1, 'two', { three: 3 }]);
  });

  test('preserves `this` context (line 435)', async () => {
    let capturedThis = null;
    const obj = { value: 99 };
    const debounced = debounce(function() { capturedThis = this; }, 30);
    debounced.call(obj);
    await sleep(50);
    assert.strictEqual(capturedThis, obj);
  });

  test('sets timeoutId to null after execution (line 436)', async () => {
    let called = 0;
    const debounced = debounce(() => called++, 30);
    debounced();
    await sleep(50);
    assert.strictEqual(called, 1);
    // A second call after execution should work normally
    debounced();
    await sleep(50);
    assert.strictEqual(called, 2);
  });
});

// ---------------------------------------------------------------------------
// 10. throttle — lines 463-494
// ---------------------------------------------------------------------------

describe('throttle (lines 463-494)', () => {
  test('calls fn immediately on first invocation (line 470-476)', () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);
    throttled();
    assert.strictEqual(called, 1);
  });

  test('ignores calls within the interval (line 477)', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 60);
    throttled(); // immediate
    throttled(); // within interval — schedules trailing
    throttled(); // within interval — ignored (timeout already pending)
    assert.strictEqual(called, 1);
    await sleep(80);
    // The trailing call should fire
    assert.strictEqual(called, 2);
  });

  test('allows call after interval has passed (line 470-476)', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 30);
    throttled(); // immediate
    await sleep(50);
    throttled(); // after interval — immediate
    assert.strictEqual(called, 2);
  });

  test('schedules a trailing call via setTimeout (line 477-483)', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 40);
    throttled(); // immediate (called=1)
    throttled(); // within interval — schedules trailing
    await sleep(60);
    assert.strictEqual(called, 2, 'Trailing call should execute');
  });

  test('cancel prevents scheduled trailing call (line 486-491)', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 50);
    throttled(); // immediate (called=1)
    throttled(); // schedules trailing
    throttled.cancel();
    await sleep(80);
    assert.strictEqual(called, 1, 'Trailing call should be cancelled');
  });

  test('cancel is safe when no pending timer (line 486-491)', () => {
    const throttled = throttle(() => {}, 50);
    throttled(); // immediate call, no pending timer
    assert.doesNotThrow(() => throttled.cancel());
  });

  test('cancel is safe before any call (line 486-491)', () => {
    const throttled = throttle(() => {}, 50);
    assert.doesNotThrow(() => throttled.cancel());
  });

  test('passes arguments to fn on immediate call (line 476)', () => {
    let received = null;
    const throttled = throttle((...args) => { received = args; }, 50);
    throttled('a', 'b', 'c');
    assert.deepStrictEqual(received, ['a', 'b', 'c']);
  });

  test('passes arguments to fn on trailing call (line 481)', async () => {
    let received = null;
    const throttled = throttle((...args) => { received = args; }, 40);
    throttled('first'); // immediate
    throttled('second'); // schedules trailing
    await sleep(60);
    // fn.apply(this, args) is called with args=['second'], so received=['second']
    assert.deepStrictEqual(received, ['second'], 'Trailing call should use latest args');
  });

  test('preserves `this` context on immediate call (line 476)', () => {
    let capturedThis = null;
    const obj = { value: 77 };
    const throttled = throttle(function() { capturedThis = this; }, 50);
    throttled.call(obj);
    assert.strictEqual(capturedThis, obj);
  });

  test('preserves `this` context on trailing call (line 481)', async () => {
    let capturedThis = null;
    const obj = { value: 88 };
    const throttled = throttle(function() { capturedThis = this; }, 40);
    throttled.call(obj); // immediate
    throttled.call(obj); // trailing
    await sleep(60);
    assert.strictEqual(capturedThis, obj);
  });

  test('updates lastCall after trailing execution (line 479-480)', async () => {
    let called = 0;
    const throttled = throttle(() => called++, 30);
    throttled(); // immediate (called=1, lastCall set)
    throttled(); // trailing scheduled (called will become 2 after ~30ms)
    await sleep(50);
    assert.strictEqual(called, 2, 'Two calls: immediate + trailing');
    // After trailing fires lastCall is updated; wait another full interval then call again
    await sleep(40);
    throttled(); // now the interval has passed — should be immediate (called=3)
    assert.strictEqual(called, 3, 'Call after full interval should be immediate');
  });
});

// ---------------------------------------------------------------------------
// 11. isBrowser — lines 504-506
// ---------------------------------------------------------------------------

describe('isBrowser (lines 504-506)', () => {
  const savedWindow = globalThis.window;

  afterEach(() => {
    // Restore window after each test
    if (savedWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = savedWindow;
    }
  });

  test('returns true when window is defined (line 505)', () => {
    globalThis.window = {};
    assert.strictEqual(isBrowser(), true);
  });

  test('returns false when window is not defined (line 505)', () => {
    delete globalThis.window;
    assert.strictEqual(isBrowser(), false);
  });

  test('returns true when window is a mock object', () => {
    globalThis.window = { addEventListener: () => {} };
    assert.strictEqual(isBrowser(), true);
  });
});

// ---------------------------------------------------------------------------
// 12. onWindowEvent — lines 529-539
// ---------------------------------------------------------------------------

describe('onWindowEvent (lines 529-539)', () => {
  let savedWindow;

  beforeEach(() => {
    savedWindow = globalThis.window;
  });

  afterEach(() => {
    if (savedWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = savedWindow;
    }
  });

  test('returns null when window is not defined (line 529)', () => {
    delete globalThis.window;
    const result = onWindowEvent('focus', () => {}, () => {});
    assert.strictEqual(result, null);
  });

  test('adds event listener to window (line 531)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onWindowEvent('scroll', () => {}, null);
    assert.strictEqual(mockWin.addEventListener.mock.calls.length, 1);
    assert.strictEqual(mockWin.addEventListener.mock.calls[0].arguments[0], 'scroll');
  });

  test('returns a cleanup function (line 532)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onWindowEvent('resize', () => {}, null);
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('cleanup removes the event listener (line 532)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const handler = () => {};
    const cleanup = onWindowEvent('resize', handler, null);
    cleanup();
    assert.strictEqual(mockWin.removeEventListener.mock.calls.length, 1);
    assert.strictEqual(mockWin.removeEventListener.mock.calls[0].arguments[0], 'resize');
  });

  test('calls onCleanup with the cleanup function when onCleanup is a function (line 534-536)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let registeredCleanup = null;
    const onCleanup = (fn) => { registeredCleanup = fn; };
    onWindowEvent('focus', () => {}, onCleanup);
    assert.strictEqual(typeof registeredCleanup, 'function');
  });

  test('does not throw when onCleanup is null (line 534)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    assert.doesNotThrow(() => onWindowEvent('focus', () => {}, null));
  });

  test('does not throw when onCleanup is undefined (line 534)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    assert.doesNotThrow(() => onWindowEvent('focus', () => {}));
  });

  test('passes options to addEventListener (line 531)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const opts = { capture: true, passive: true };
    onWindowEvent('scroll', () => {}, null, opts);
    assert.strictEqual(mockWin.addEventListener.mock.calls[0].arguments[2], opts);
  });

  test('passes same options to removeEventListener on cleanup (line 532)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const opts = { capture: true };
    const cleanup = onWindowEvent('scroll', () => {}, null, opts);
    cleanup();
    assert.strictEqual(mockWin.removeEventListener.mock.calls[0].arguments[2], opts);
  });

  test('handler is actually called when event fires', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let called = false;
    onWindowEvent('click', () => { called = true; }, null);
    mockWin._dispatch('click');
    assert.strictEqual(called, true);
  });
});

// ---------------------------------------------------------------------------
// 13. onWindowFocus — lines 549-551
// ---------------------------------------------------------------------------

describe('onWindowFocus (lines 549-551)', () => {
  let savedWindow;

  beforeEach(() => { savedWindow = globalThis.window; });

  afterEach(() => {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  });

  test('returns null when not in browser (line 529 via delegation)', () => {
    delete globalThis.window;
    assert.strictEqual(onWindowFocus(() => {}, null), null);
  });

  test('registers focus event listener (line 550)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onWindowFocus(() => {}, null);
    assert.strictEqual(mockWin.addEventListener.mock.calls[0].arguments[0], 'focus');
  });

  test('returns cleanup function (line 550)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onWindowFocus(() => {}, null);
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('handler fires on focus event', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let fired = false;
    onWindowFocus(() => { fired = true; }, null);
    mockWin._dispatch('focus');
    assert.strictEqual(fired, true);
  });

  test('registers onCleanup callback', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let cleanupRegistered = false;
    onWindowFocus(() => {}, () => { cleanupRegistered = true; });
    assert.strictEqual(cleanupRegistered, true);
  });
});

// ---------------------------------------------------------------------------
// 14. onWindowOnline — lines 561-563
// ---------------------------------------------------------------------------

describe('onWindowOnline (lines 561-563)', () => {
  let savedWindow;

  beforeEach(() => { savedWindow = globalThis.window; });

  afterEach(() => {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  });

  test('returns null when not in browser (line 562 via delegation)', () => {
    delete globalThis.window;
    assert.strictEqual(onWindowOnline(() => {}, null), null);
  });

  test('registers online event listener (line 562)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onWindowOnline(() => {}, null);
    assert.strictEqual(mockWin.addEventListener.mock.calls[0].arguments[0], 'online');
  });

  test('returns cleanup function (line 562)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onWindowOnline(() => {}, null);
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('handler fires on online event', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let fired = false;
    onWindowOnline(() => { fired = true; }, null);
    mockWin._dispatch('online');
    assert.strictEqual(fired, true);
  });
});

// ---------------------------------------------------------------------------
// 15. onWindowOffline — lines 572-574
// ---------------------------------------------------------------------------

describe('onWindowOffline (lines 572-574)', () => {
  let savedWindow;

  beforeEach(() => { savedWindow = globalThis.window; });

  afterEach(() => {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  });

  test('returns null when not in browser (line 573 via delegation)', () => {
    delete globalThis.window;
    assert.strictEqual(onWindowOffline(() => {}, null), null);
  });

  test('registers offline event listener (line 573)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onWindowOffline(() => {}, null);
    assert.strictEqual(mockWin.addEventListener.mock.calls[0].arguments[0], 'offline');
  });

  test('returns cleanup function (line 573)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onWindowOffline(() => {}, null);
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('handler fires on offline event', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let fired = false;
    onWindowOffline(() => { fired = true; }, null);
    mockWin._dispatch('offline');
    assert.strictEqual(fired, true);
  });
});

// ---------------------------------------------------------------------------
// 16. onNetworkChange — lines 587-605
// ---------------------------------------------------------------------------

describe('onNetworkChange (lines 587-605)', () => {
  let savedWindow;

  beforeEach(() => { savedWindow = globalThis.window; });

  afterEach(() => {
    if (savedWindow === undefined) delete globalThis.window;
    else globalThis.window = savedWindow;
  });

  test('returns null when not in browser (line 587)', () => {
    delete globalThis.window;
    const result = onNetworkChange({ onOnline: () => {}, onOffline: () => {} }, null);
    assert.strictEqual(result, null);
  });

  test('registers both online and offline listeners (line 591-596)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onNetworkChange({ onOnline: () => {}, onOffline: () => {} }, null);
    const events = mockWin.addEventListener.mock.calls.map(c => c.arguments[0]);
    assert.ok(events.includes('online'), 'Should register online listener');
    assert.ok(events.includes('offline'), 'Should register offline listener');
  });

  test('registers only online listener when onOffline is absent (line 591-595)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onNetworkChange({ onOnline: () => {} }, null);
    const events = mockWin.addEventListener.mock.calls.map(c => c.arguments[0]);
    assert.ok(events.includes('online'));
    assert.ok(!events.includes('offline'));
  });

  test('registers only offline listener when onOnline is absent (line 594-596)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    onNetworkChange({ onOffline: () => {} }, null);
    const events = mockWin.addEventListener.mock.calls.map(c => c.arguments[0]);
    assert.ok(events.includes('offline'));
    assert.ok(!events.includes('online'));
  });

  test('returns a combined cleanup function (line 598)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onNetworkChange({ onOnline: () => {}, onOffline: () => {} }, null);
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('cleanup removes both listeners (line 598)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onNetworkChange({ onOnline: () => {}, onOffline: () => {} }, null);
    cleanup();
    assert.strictEqual(mockWin.removeEventListener.mock.calls.length, 2);
  });

  test('onOnline handler fires when online event dispatched (line 592)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let onlineFired = false;
    onNetworkChange({ onOnline: () => { onlineFired = true; } }, null);
    mockWin._dispatch('online');
    assert.strictEqual(onlineFired, true);
  });

  test('onOffline handler fires when offline event dispatched (line 595)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let offlineFired = false;
    onNetworkChange({ onOffline: () => { offlineFired = true; } }, null);
    mockWin._dispatch('offline');
    assert.strictEqual(offlineFired, true);
  });

  test('calls onCleanup with combined cleanup function (line 600-602)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let registeredCleanup = null;
    onNetworkChange(
      { onOnline: () => {}, onOffline: () => {} },
      (fn) => { registeredCleanup = fn; }
    );
    assert.strictEqual(typeof registeredCleanup, 'function');
  });

  test('onCleanup callback can invoke the returned cleanup', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    let registeredCleanup = null;
    onNetworkChange(
      { onOnline: () => {}, onOffline: () => {} },
      (fn) => { registeredCleanup = fn; }
    );
    // Calling the registered cleanup should remove listeners
    registeredCleanup();
    assert.strictEqual(mockWin.removeEventListener.mock.calls.length, 2);
  });

  test('does not throw when handlers object is empty (line 591-596)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    assert.doesNotThrow(() => onNetworkChange({}, null));
  });

  test('cleanup with empty handlers array does not throw (line 598)', () => {
    const mockWin = createMockWindow();
    globalThis.window = mockWin;
    const cleanup = onNetworkChange({}, null);
    assert.doesNotThrow(() => cleanup());
  });
});
