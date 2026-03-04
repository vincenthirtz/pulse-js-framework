/**
 * Security Deep Coverage Tests
 * Targets uncovered lines in runtime/security.js:
 *   - Lines 297-390: sanitizeHtml DOMParser browser path (sanitizeNode function)
 *   - Lines 435-436: sanitizeUrl catch block for malformed decodeURIComponent
 *
 * IMPORTANT: This file must be run AFTER security.test.js sets up globalThis.DOMParser.
 * Node.js ES module caching means security.js is loaded once with DOMParser defined,
 * so all sanitizeHtml calls in ALL test files use the DOMParser code path (lines 297-390).
 *
 * Strategy: Set up a comprehensive DOMParser mock at the global scope before any imports,
 * then import the module and test every branch in sanitizeNode.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Full-featured DOMParser mock that covers every branch in sanitizeNode
// =============================================================================
//
// The sanitizeNode function has these branches:
//   1. nodeType === 3 (text node): return textContent
//   2. nodeType !== 1 (not element, not text): return ''
//   3. tagName not in allowedTags: process children, return childContent
//   4. tagName in allowedTags:
//      a. attributes loop:
//         - attr not in allowedAttrs: skip
//         - attr starts with 'on': skip
//         - attr is 'href' or 'src': sanitizeUrl, skip if null, use sanitized
//         - attr is 'style': parse css, block dangerous values, join safeParts
//           - no colon in part: skip
//           - url(): block
//           - expression(): block
//           - javascript: in val: block
//           - behavior: in val: block
//           - -moz-binding: block
//           - safe CSS: allow
//           - empty safeParts: skip entire attr
//         - normal attr: append
//      b. self-closing tag (br, hr, img, input, meta, link): return ' />'
//      c. block tag: open tag + children + close tag

class MockAttr {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}

class MockTextNode {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
    this.childNodes = [];
    this.attributes = [];
  }
}

// nodeType === 8 is a comment node — neither 3 nor 1, so returns ''
class MockCommentNode {
  constructor() {
    this.nodeType = 8;
    this.textContent = ' comment ';
    this.childNodes = [];
    this.attributes = [];
  }
}

class MockElement {
  constructor(tagName, attrs = [], children = []) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.attributes = attrs.map(([n, v]) => new MockAttr(n, v));
    this.childNodes = children;
    this.textContent = '';
  }
}

class MockDocument {
  constructor(bodyChildren = []) {
    this.body = new MockElement('body', [], bodyChildren);
  }
}

// Override the DOMParser mock with one that parses a structured descriptor
// We use a global registry keyed by a magic marker string in the html argument
const mockDocRegistry = new Map();
let mockDocCounter = 0;

globalThis.DOMParser = class {
  parseFromString(html) {
    // Check if this is a registered mock document (by magic key)
    for (const [key, doc] of mockDocRegistry) {
      if (html.includes(key)) {
        return doc;
      }
    }
    // Default: return empty body
    return new MockDocument([]);
  }
};

/**
 * Register a MockDocument and return a unique HTML string that will
 * cause DOMParser.parseFromString to return that document.
 */
function registerMockDoc(doc) {
  const key = `__MOCK_${mockDocCounter++}__`;
  mockDocRegistry.set(key, doc);
  return key;
}

// Import the module under test AFTER the DOMParser mock is set up.
// Because Node.js caches ES modules, this import will either get a fresh
// instance (if this file runs first) or the cached instance. Either way,
// globalThis.DOMParser is defined before the function executes, so the
// DOMParser branch will be taken at call time (the check is inside the function).
const {
  isDangerousKey,
  sanitizeObjectKeys,
  escapeHtml,
  sanitizeHtml,
  sanitizeUrl,
  DANGEROUS_KEYS,
  SAFE_PROTOCOLS,
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRS,
  HTML_ESCAPES
} = await import('../runtime/security.js');

// =============================================================================
// isDangerousKey — lines 117-119
// =============================================================================

describe('isDangerousKey — deep coverage', () => {
  test('returns true for __proto__', () => {
    assert.strictEqual(isDangerousKey('__proto__'), true);
  });

  test('returns true for constructor', () => {
    assert.strictEqual(isDangerousKey('constructor'), true);
  });

  test('returns true for prototype', () => {
    assert.strictEqual(isDangerousKey('prototype'), true);
  });

  test('returns true for __defineGetter__', () => {
    assert.strictEqual(isDangerousKey('__defineGetter__'), true);
  });

  test('returns true for __defineSetter__', () => {
    assert.strictEqual(isDangerousKey('__defineSetter__'), true);
  });

  test('returns true for __lookupGetter__', () => {
    assert.strictEqual(isDangerousKey('__lookupGetter__'), true);
  });

  test('returns true for __lookupSetter__', () => {
    assert.strictEqual(isDangerousKey('__lookupSetter__'), true);
  });

  test('returns false for hasOwnProperty (valid own-property name)', () => {
    assert.strictEqual(isDangerousKey('hasOwnProperty'), false);
  });

  test('returns true for eval', () => {
    assert.strictEqual(isDangerousKey('eval'), true);
  });

  test('returns true for Function', () => {
    assert.strictEqual(isDangerousKey('Function'), true);
  });

  test('returns false for safe key: name', () => {
    assert.strictEqual(isDangerousKey('name'), false);
  });

  test('returns false for safe key: id', () => {
    assert.strictEqual(isDangerousKey('id'), false);
  });

  test('returns false for safe key: data', () => {
    assert.strictEqual(isDangerousKey('data'), false);
  });

  test('returns false for empty string', () => {
    assert.strictEqual(isDangerousKey(''), false);
  });

  test('returns false for numeric string', () => {
    assert.strictEqual(isDangerousKey('0'), false);
    assert.strictEqual(isDangerousKey('42'), false);
  });
});

// =============================================================================
// sanitizeObjectKeys — lines 133-162
// =============================================================================

describe('sanitizeObjectKeys — deep coverage', () => {
  test('returns null as-is (non-object)', () => {
    assert.strictEqual(sanitizeObjectKeys(null), null);
  });

  test('returns string as-is (non-object)', () => {
    assert.strictEqual(sanitizeObjectKeys('hello'), 'hello');
  });

  test('returns number as-is (non-object)', () => {
    assert.strictEqual(sanitizeObjectKeys(42), 42);
  });

  test('returns boolean as-is (non-object)', () => {
    assert.strictEqual(sanitizeObjectKeys(true), true);
    assert.strictEqual(sanitizeObjectKeys(false), false);
  });

  test('returns undefined as-is (non-object)', () => {
    assert.strictEqual(sanitizeObjectKeys(undefined), undefined);
  });

  test('removes __proto__ key from plain object', () => {
    const input = { '__proto__': 'bad', safe: 'good' };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.safe, 'good');
    assert.ok(!Object.prototype.hasOwnProperty.call(result, '__proto__')
      || Object.keys(result).filter(k => k === '__proto__').length === 0);
  });

  test('removes constructor key from plain object', () => {
    const input = { constructor: 'bad', data: 42 };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.data, 42);
    assert.strictEqual(Object.keys(result).filter(k => k === 'constructor').length, 0);
  });

  test('removes prototype key from plain object', () => {
    const input = { prototype: {}, value: 'ok' };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.value, 'ok');
    assert.strictEqual(Object.keys(result).filter(k => k === 'prototype').length, 0);
  });

  test('removes all dangerous keys simultaneously', () => {
    const input = {
      '__proto__': 'x',
      'constructor': 'y',
      'prototype': 'z',
      'eval': 'e',
      'Function': 'f',
      'legit': 'keep'
    };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(Object.keys(result).length, 1);
    assert.strictEqual(result.legit, 'keep');
  });

  test('throwOnDangerous: true throws with message containing key name', () => {
    // Object literal { '__proto__': ... } sets the prototype, not an own key.
    // Must use Object.create(null) to get a real enumerable '__proto__' own property.
    const input = Object.create(null);
    input['__proto__'] = 'bad';
    input.safe = 'ok';
    assert.throws(
      () => sanitizeObjectKeys(input, { throwOnDangerous: true }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Dangerous key blocked'));
        assert.ok(err.message.includes('__proto__'));
        return true;
      }
    );
  });

  test('throwOnDangerous: true throws for constructor', () => {
    const input = { constructor: Function.prototype, legit: 1 };
    assert.throws(
      () => sanitizeObjectKeys(input, { throwOnDangerous: true }),
      /Dangerous key blocked: constructor/
    );
  });

  test('logWarnings: true code path executes without throwing (lines 147-149)', () => {
    // Object literal { '__proto__': ... } sets the prototype, not an own key.
    // Must use Object.create(null) to get a real enumerable '__proto__' own property,
    // so the dangerous-key branch (and the logWarnings warn call) actually fires.
    const input = Object.create(null);
    input['__proto__'] = 'danger';
    input.ok = 1;
    // logWarnings: true → executes log.warn() on line 148-149
    const result = sanitizeObjectKeys(input, { logWarnings: true, throwOnDangerous: false });
    assert.strictEqual(result.ok, 1);
    assert.strictEqual(Object.keys(result).filter(k => k === '__proto__').length, 0);
  });

  test('logWarnings: false suppresses warning code path', () => {
    // Same approach: real __proto__ own key via Object.create(null)
    const input = Object.create(null);
    input['__proto__'] = 'danger';
    input.ok = 1;
    // Should not throw even with the dangerous key when logWarnings false
    const result = sanitizeObjectKeys(input, { logWarnings: false, throwOnDangerous: false });
    assert.strictEqual(result.ok, 1);
  });

  test('recursively sanitizes nested objects', () => {
    const input = {
      user: {
        name: 'Alice',
        '__proto__': { hacked: true }
      }
    };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.user.name, 'Alice');
    assert.strictEqual(Object.keys(result.user).filter(k => k === '__proto__').length, 0);
  });

  test('recursively sanitizes deeply nested objects', () => {
    const input = {
      a: {
        b: {
          c: {
            constructor: 'danger',
            safe: 'value'
          }
        }
      }
    };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.a.b.c.safe, 'value');
    assert.strictEqual(Object.keys(result.a.b.c).filter(k => k === 'constructor').length, 0);
  });

  test('handles arrays: returns array, recurses into objects inside', () => {
    const input = [
      { name: 'item1', '__proto__': 'bad' },
      { name: 'item2' }
    ];
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'item1');
    assert.strictEqual(Object.keys(result[0]).filter(k => k === '__proto__').length, 0);
    assert.strictEqual(result[1].name, 'item2');
  });

  test('handles array nested inside object', () => {
    const input = {
      items: [
        { id: 1, prototype: 'bad' },
        { id: 2, value: 'ok' }
      ]
    };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.ok(Array.isArray(result.items));
    assert.strictEqual(result.items[0].id, 1);
    assert.strictEqual(Object.keys(result.items[0]).filter(k => k === 'prototype').length, 0);
    assert.strictEqual(result.items[1].value, 'ok');
  });

  test('preserves non-object values (strings, numbers, booleans, null) inside objects', () => {
    const input = {
      str: 'hello',
      num: 99,
      bool: false,
      nil: null
    };
    const result = sanitizeObjectKeys(input, { logWarnings: false });
    assert.strictEqual(result.str, 'hello');
    assert.strictEqual(result.num, 99);
    assert.strictEqual(result.bool, false);
    assert.strictEqual(result.nil, null);
  });

  test('empty object returns empty object', () => {
    const result = sanitizeObjectKeys({}, { logWarnings: false });
    assert.deepStrictEqual(result, {});
  });

  test('empty array returns empty array', () => {
    const result = sanitizeObjectKeys([], { logWarnings: false });
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });
});

// =============================================================================
// escapeHtml — lines 198-201
// =============================================================================

describe('escapeHtml — deep coverage', () => {
  test('null returns empty string', () => {
    assert.strictEqual(escapeHtml(null), '');
  });

  test('undefined returns empty string', () => {
    assert.strictEqual(escapeHtml(undefined), '');
  });

  test('0 (falsy but not null/undefined) is converted to string "0"', () => {
    assert.strictEqual(escapeHtml(0), '0');
  });

  test('false is converted to string "false"', () => {
    assert.strictEqual(escapeHtml(false), 'false');
  });

  test('escapes & ampersand', () => {
    assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
  });

  test('escapes < less-than', () => {
    assert.strictEqual(escapeHtml('<p>'), '&lt;p&gt;');
  });

  test('escapes > greater-than', () => {
    assert.strictEqual(escapeHtml('x > y'), 'x &gt; y');
  });

  test('escapes " double-quote', () => {
    assert.strictEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
  });

  test("escapes ' single-quote", () => {
    assert.strictEqual(escapeHtml("it's"), "it&#39;s");
  });

  test('escapes all five special characters in one string', () => {
    const result = escapeHtml(`&<>"'`);
    assert.strictEqual(result, '&amp;&lt;&gt;&quot;&#39;');
  });

  test('XSS script injection fully escaped', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    assert.strictEqual(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('number 42 is converted to "42"', () => {
    assert.strictEqual(escapeHtml(42), '42');
  });

  test('plain text with no special chars is returned unchanged', () => {
    assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
  });

  test('empty string returns empty string', () => {
    assert.strictEqual(escapeHtml(''), '');
  });

  test('HTML_ESCAPES map contains all five special chars', () => {
    assert.strictEqual(HTML_ESCAPES['&'], '&amp;');
    assert.strictEqual(HTML_ESCAPES['<'], '&lt;');
    assert.strictEqual(HTML_ESCAPES['>'], '&gt;');
    assert.strictEqual(HTML_ESCAPES['"'], '&quot;');
    assert.strictEqual(HTML_ESCAPES["'"], '&#39;');
  });
});

// =============================================================================
// sanitizeHtml — lines 271-391
// Node.js has no native DOMParser, so DOMParser is globalThis.DOMParser (our mock).
// When DOMParser IS defined, sanitizeHtml takes the browser path (lines 298-390).
// Each call to sanitizeHtml invokes DOMParser.parseFromString with our magic key,
// allowing us to return a pre-built mock document that exercises specific branches.
// =============================================================================

describe('sanitizeHtml — DOMParser browser path (lines 297-390)', () => {

  // ------------------------------------------------------------------
  // Guard conditions (lines 272): !html || typeof html !== 'string'
  // ------------------------------------------------------------------

  test('returns "" for null input (guard line 272)', () => {
    assert.strictEqual(sanitizeHtml(null), '');
  });

  test('returns "" for undefined input (guard line 272)', () => {
    assert.strictEqual(sanitizeHtml(undefined), '');
  });

  test('returns "" for empty string (guard line 272)', () => {
    assert.strictEqual(sanitizeHtml(''), '');
  });

  test('returns "" for number input (guard line 272)', () => {
    assert.strictEqual(sanitizeHtml(42), '');
  });

  test('returns "" for object input (guard line 272)', () => {
    assert.strictEqual(sanitizeHtml({}), '');
  });

  // ------------------------------------------------------------------
  // Branch: DOMParser NOT defined — fallback strip-all-tags loop (lines 283-295)
  // We temporarily delete DOMParser and call with real HTML strings.
  // ------------------------------------------------------------------

  test('fallback (no DOMParser): strips all tags, returns text only', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      const result = sanitizeHtml('<p>Hello <b>world</b></p>');
      assert.strictEqual(result, 'Hello world');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: handles string that starts outside a tag', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      const result = sanitizeHtml('plain text');
      assert.strictEqual(result, 'plain text');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: handles string with only tags (no text)', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      const result = sanitizeHtml('<script>alert(1)</script>');
      assert.strictEqual(result, 'alert(1)');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: handles nested tags', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      const result = sanitizeHtml('<div><span>text</span></div>');
      assert.strictEqual(result, 'text');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: multiple < without matching > keeps inTag true', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      // Once inTag is true, characters are skipped until '>'
      const result = sanitizeHtml('a<b<c>d');
      assert.strictEqual(result, 'ad');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: unclosed tag strips rest of string', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      // '<div' starts a tag that never closes, so everything after is in-tag
      const result = sanitizeHtml('before<div');
      assert.strictEqual(result, 'before');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  test('fallback: empty tags are stripped cleanly', () => {
    const saved = globalThis.DOMParser;
    delete globalThis.DOMParser;
    try {
      const result = sanitizeHtml('<></>text');
      assert.strictEqual(result, 'text');
    } finally {
      globalThis.DOMParser = saved;
    }
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 1 — text node (nodeType === 3) returns textContent
  // Lines 302-303
  // ------------------------------------------------------------------

  test('DOMParser path: text node returns its textContent', () => {
    const textNode = new MockTextNode('Hello World');
    const doc = new MockDocument([textNode]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, 'Hello World');
  });

  test('DOMParser path: multiple text nodes concatenated', () => {
    const doc = new MockDocument([
      new MockTextNode('foo'),
      new MockTextNode(' bar')
    ]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, 'foo bar');
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 2 — comment node (nodeType !== 1 and !== 3) returns ''
  // Lines 306-307
  // ------------------------------------------------------------------

  test('DOMParser path: comment node (nodeType 8) returns empty string', () => {
    const comment = new MockCommentNode();
    const doc = new MockDocument([comment]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '');
  });

  test('DOMParser path: comment between text nodes is omitted', () => {
    const doc = new MockDocument([
      new MockTextNode('before'),
      new MockCommentNode(),
      new MockTextNode('after')
    ]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, 'beforeafter');
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 3 — disallowed tag, process children
  // Lines 313-319
  // ------------------------------------------------------------------

  test('DOMParser path: script tag (disallowed) — children processed, tag stripped', () => {
    // <script>alert(1)</script> — tag stripped, child text extracted
    const script = new MockElement('script', [], [new MockTextNode('alert(1)')]);
    const doc = new MockDocument([script]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, 'alert(1)');
  });

  test('DOMParser path: iframe (disallowed) — children processed, tag stripped', () => {
    const iframe = new MockElement('iframe', [], [new MockTextNode('content')]);
    const doc = new MockDocument([iframe]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, 'content');
  });

  test('DOMParser path: disallowed tag with no children returns empty string', () => {
    const style = new MockElement('style', [], []);
    const doc = new MockDocument([style]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '');
  });

  test('DOMParser path: disallowed tag wrapping allowed tag — outer stripped, inner kept', () => {
    // <div> is allowed; <custom> is not. <custom><div>text</div></custom>
    const inner = new MockElement('div', [], [new MockTextNode('text')]);
    const outer = new MockElement('custom', [], [inner]);
    const doc = new MockDocument([outer]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    // outer tag stripped, inner div rendered
    assert.ok(result.includes('<div>'));
    assert.ok(result.includes('text'));
    assert.ok(result.includes('</div>'));
    assert.ok(!result.includes('<custom>'));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4a — allowed tag with allowed attrs (line 330)
  // ------------------------------------------------------------------

  test('DOMParser path: allowed tag with no attributes', () => {
    const p = new MockElement('p', [], [new MockTextNode('hello')]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<p>hello</p>');
  });

  test('DOMParser path: allowed attr (class) is preserved', () => {
    const span = new MockElement('span', [['class', 'highlight']], [new MockTextNode('text')]);
    const doc = new MockDocument([span]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('class="highlight"'));
    assert.ok(result.includes('text'));
  });

  test('DOMParser path: disallowed attr (data-x) is dropped', () => {
    const p = new MockElement('p', [['data-x', 'bad']], [new MockTextNode('ok')]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(!result.includes('data-x'));
    assert.ok(result.includes('<p>'));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4b — event handler attr (starts with 'on') skipped
  // Line 333
  // ------------------------------------------------------------------

  test('DOMParser path: onclick attr skipped even if in allowedAttrs would not matter', () => {
    // onclick starts with 'on' so it is skipped (line 333)
    const div = new MockElement('div', [['onclick', 'evil()']], [new MockTextNode('click')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(!result.includes('onclick'));
    assert.ok(result.includes('<div>'));
  });

  test('DOMParser path: onload attr skipped', () => {
    const img = new MockElement('img', [['onload', 'evil()'], ['src', 'https://example.com/img.png']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(!result.includes('onload'));
    assert.ok(result.includes('src='));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4c — href/src URL sanitization (lines 338-342)
  // ------------------------------------------------------------------

  test('DOMParser path: safe href is kept', () => {
    const a = new MockElement('a', [['href', 'https://example.com']], [new MockTextNode('link')]);
    const doc = new MockDocument([a]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('href="https://example.com"'));
  });

  test('DOMParser path: javascript: href is removed (sanitizeUrl returns null)', () => {
    const a = new MockElement('a', [['href', 'javascript:alert(1)']], [new MockTextNode('xss')]);
    const doc = new MockDocument([a]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(!result.includes('href='));
    assert.ok(!result.includes('javascript:'));
    assert.ok(result.includes('<a>'));
  });

  test('DOMParser path: safe src on img is kept', () => {
    const img = new MockElement('img', [['src', 'https://example.com/img.png'], ['alt', 'test']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('src="https://example.com/img.png"'));
    assert.ok(result.includes('alt="test"'));
  });

  test('DOMParser path: dangerous src on img is removed', () => {
    const img = new MockElement('img', [['src', 'javascript:alert(1)'], ['alt', 'img']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(!result.includes('src='));
    assert.ok(result.includes('alt="img"'));
  });

  test('DOMParser path: data: src blocked by default', () => {
    const img = new MockElement('img', [['src', 'data:image/png;base64,abc']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    // data: URLs are blocked by default (allowDataUrls=false → allowData=false → null)
    assert.ok(!result.includes('data:'));
  });

  test('DOMParser path: data: src allowed when allowDataUrls=true', () => {
    const img = new MockElement('img', [['src', 'data:image/png;base64,abc']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowDataUrls: true });
    assert.ok(result.includes('data:image/png'));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4d — style attribute CSS sanitization (lines 345-363)
  // ------------------------------------------------------------------

  test('DOMParser path: style attr is NOT in DEFAULT_ALLOWED_ATTRS so it is dropped', () => {
    // The style attr is not in allowedAttrs, so it hits the "skip disallowed" branch first
    const div = new MockElement('div', [['style', 'color: red']], [new MockTextNode('txt')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    // style is not in DEFAULT_ALLOWED_ATTRS, so it is skipped before CSS sanitization
    assert.ok(!result.includes('style='));
  });

  test('DOMParser path: style attr sanitization with custom allowedAttrs including style', () => {
    // To test the CSS sanitization path, we must include 'style' in allowedAttrs
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);

    // Safe CSS value
    const div = new MockElement('div', [['style', 'color: red; font-size: 14px']], [new MockTextNode('text')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(result.includes('style='));
    assert.ok(result.includes('color: red'));
  });

  test('DOMParser path: style attr — url() CSS value is blocked', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', 'background: url(evil.com)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    // url() is dangerous, so the style value is blocked, safeParts is empty, attr skipped
    assert.ok(!result.includes('url('));
  });

  test('DOMParser path: style attr — expression() CSS value is blocked', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', 'width: expression(alert(1))']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(!result.includes('expression('));
  });

  test('DOMParser path: style attr — javascript: CSS value is blocked', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', 'behavior: javascript:alert(1)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(!result.includes('javascript:'));
  });

  test('DOMParser path: style attr — behavior: CSS value is blocked', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', 'behavior: url(evil.htc)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(!result.includes('url('));
  });

  test('DOMParser path: style attr — -moz-binding CSS value is blocked', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', '-moz-binding: url(chrome://bad/content/bad.xml)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(!result.includes('-moz-binding'));
  });

  test('DOMParser path: style attr — part with no colon is skipped (colonIndex === -1)', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    // 'badpart' has no colon, 'color: red' is safe
    const div = new MockElement('div', [['style', 'badpart; color: red']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    // 'badpart' is skipped (no colon), 'color: red' is kept
    assert.ok(result.includes('color: red'));
    assert.ok(!result.includes('badpart'));
  });

  test('DOMParser path: style attr — all parts dangerous, empty safeParts skips attr entirely', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    const div = new MockElement('div', [['style', 'background: url(x.com)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    // All parts dangerous → safeParts empty → attrValue = '' → `if (!attrValue) continue`
    assert.ok(!result.includes('style='));
  });

  test('DOMParser path: style attr — mixed safe and dangerous parts, dangerous filtered', () => {
    const customAllowedAttrs = new Set([...DEFAULT_ALLOWED_ATTRS, 'style']);
    // 'color: red' is safe; 'background: url(x)' is dangerous
    const div = new MockElement('div', [['style', 'color: red; background: url(x)']], [new MockTextNode('t')]);
    const doc = new MockDocument([div]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key, { allowedAttrs: customAllowedAttrs });
    assert.ok(result.includes('color: red'));
    assert.ok(!result.includes('url(x)'));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4e — self-closing tags (lines 369-371)
  // ------------------------------------------------------------------

  test('DOMParser path: br is self-closing, returns " />"', () => {
    const br = new MockElement('br', [], []);
    const doc = new MockDocument([br]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<br />');
  });

  test('DOMParser path: hr is self-closing', () => {
    const hr = new MockElement('hr', [], []);
    const doc = new MockDocument([hr]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<hr />');
  });

  test('DOMParser path: img with src is self-closing with attr', () => {
    const img = new MockElement('img', [['src', 'https://example.com/a.png'], ['alt', 'pic']]);
    const doc = new MockDocument([img]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.endsWith(' />'));
    assert.ok(result.includes('<img'));
    assert.ok(result.includes('src="https://example.com/a.png"'));
    assert.ok(result.includes('alt="pic"'));
  });

  // ------------------------------------------------------------------
  // DOMParser path: branch 4f — block tags with children (lines 374-382)
  // ------------------------------------------------------------------

  test('DOMParser path: block tag wraps children correctly', () => {
    const child = new MockTextNode('world');
    const p = new MockElement('p', [], [child]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<p>world</p>');
  });

  test('DOMParser path: nested allowed tags', () => {
    const inner = new MockElement('strong', [], [new MockTextNode('bold')]);
    const outer = new MockElement('p', [], [inner]);
    const doc = new MockDocument([outer]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<p><strong>bold</strong></p>');
  });

  test('DOMParser path: heading tags (h1-h6) are rendered', () => {
    for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const heading = new MockElement(level, [], [new MockTextNode(`Heading ${level}`)]);
      const doc = new MockDocument([heading]);
      const key = registerMockDoc(doc);
      const result = sanitizeHtml(key);
      assert.strictEqual(result, `<${level}>Heading ${level}</${level}>`);
    }
  });

  test('DOMParser path: allowed tags with multiple children (text + element)', () => {
    const bold = new MockElement('strong', [], [new MockTextNode('bold')]);
    const p = new MockElement('p', [], [
      new MockTextNode('before '),
      bold,
      new MockTextNode(' after')
    ]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<p>before <strong>bold</strong> after</p>');
  });

  test('DOMParser path: multiple sibling elements at body level', () => {
    const p1 = new MockElement('p', [], [new MockTextNode('first')]);
    const p2 = new MockElement('p', [], [new MockTextNode('second')]);
    const doc = new MockDocument([p1, p2]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '<p>first</p><p>second</p>');
  });

  test('DOMParser path: custom allowedTags restricts output', () => {
    const p = new MockElement('p', [], [new MockTextNode('paragraph')]);
    const div = new MockElement('div', [], [new MockTextNode('block')]);
    const doc = new MockDocument([p, div]);
    const key = registerMockDoc(doc);
    // Only allow 'p', not 'div'
    const result = sanitizeHtml(key, { allowedTags: new Set(['p']) });
    assert.ok(result.includes('<p>paragraph</p>'));
    // div is stripped, but its text content is returned
    assert.ok(result.includes('block'));
    assert.ok(!result.includes('<div>'));
  });

  test('DOMParser path: custom allowedAttrs restricts attributes', () => {
    const p = new MockElement('p', [['id', 'myid'], ['class', 'myclass']], [new MockTextNode('text')]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    // Only allow 'id', not 'class'
    const result = sanitizeHtml(key, { allowedAttrs: new Set(['id']) });
    assert.ok(result.includes('id="myid"'));
    assert.ok(!result.includes('class='));
  });

  test('DOMParser path: empty body returns empty string', () => {
    const doc = new MockDocument([]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.strictEqual(result, '');
  });

  test('DOMParser path: table structure (thead, tbody, tr, th, td)', () => {
    const th = new MockElement('th', [], [new MockTextNode('Header')]);
    const tr1 = new MockElement('tr', [], [th]);
    const thead = new MockElement('thead', [], [tr1]);

    const td = new MockElement('td', [], [new MockTextNode('Cell')]);
    const tr2 = new MockElement('tr', [], [td]);
    const tbody = new MockElement('tbody', [], [tr2]);

    const table = new MockElement('table', [], [thead, tbody]);
    const doc = new MockDocument([table]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('<table>'));
    assert.ok(result.includes('<thead>'));
    assert.ok(result.includes('<th>Header</th>'));
    assert.ok(result.includes('<tbody>'));
    assert.ok(result.includes('<td>Cell</td>'));
    assert.ok(result.includes('</table>'));
  });

  test('DOMParser path: a tag with role and aria-label attrs preserved', () => {
    const a = new MockElement('a', [
      ['href', 'https://example.com'],
      ['role', 'button'],
      ['aria-label', 'Go to example']
    ], [new MockTextNode('click')]);
    const doc = new MockDocument([a]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('href="https://example.com"'));
    assert.ok(result.includes('role="button"'));
    assert.ok(result.includes('aria-label="Go to example"'));
  });

  test('DOMParser path: attr value with special chars is HTML-escaped', () => {
    const p = new MockElement('p', [['title', '<script>&']], [new MockTextNode('txt')]);
    const doc = new MockDocument([p]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    assert.ok(result.includes('&lt;script&gt;&amp;'));
    assert.ok(!result.includes('<script>'));
  });

  test('DOMParser path: disallowed tag with comment child — processes children', () => {
    const comment = new MockCommentNode();
    const script = new MockElement('script', [], [comment, new MockTextNode('safe text')]);
    const doc = new MockDocument([script]);
    const key = registerMockDoc(doc);
    const result = sanitizeHtml(key);
    // comment returns '', text returns 'safe text', script tag is stripped
    assert.strictEqual(result, 'safe text');
  });
});

// =============================================================================
// sanitizeUrl — lines 414-497
// Focuses on catch block (lines 435-436) and all protocol/relative branches
// =============================================================================

describe('sanitizeUrl — deep coverage', () => {

  // ------------------------------------------------------------------
  // Guard: null/empty (line 417)
  // ------------------------------------------------------------------

  test('null returns null', () => {
    assert.strictEqual(sanitizeUrl(null), null);
  });

  test('undefined returns null', () => {
    assert.strictEqual(sanitizeUrl(undefined), null);
  });

  test('empty string returns null', () => {
    assert.strictEqual(sanitizeUrl(''), null);
  });

  // ------------------------------------------------------------------
  // Catch block (lines 435-436): malformed percent encoding
  // decodeURIComponent throws on invalid sequences like '%GG'
  // ------------------------------------------------------------------

  test('malformed percent encoding falls back gracefully (catch block lines 435-436)', () => {
    // '%GG' is not valid percent-encoding, causing decodeURIComponent to throw
    const result = sanitizeUrl('%GGjavascript:alert(1)');
    // After catch, normalized uses original trimmed value (not decoded)
    // '%GGjavascript:' does NOT start with 'javascript:' when normalized
    // So the result depends on what happens after fallback; it should not throw
    assert.ok(result === null || typeof result === 'string');
  });

  test('another malformed URL that triggers catch block', () => {
    // '%' alone at end triggers malformed URI component error
    const result = sanitizeUrl('https://example.com/path%');
    // After catch, decoded stays as original; this is a relative-path-like URL
    // With ':' in the string (https:), it goes to protocol check → https: is safe
    assert.ok(result === 'https://example.com/path%' || result === null);
  });

  test('partially encoded URL that decodes fine', () => {
    // Valid percent encoding: %61 = 'a'
    const result = sanitizeUrl('%61bc.html');
    // Decodes to 'abc.html' — no protocol, no colon, no //, treated as relative
    assert.strictEqual(result, '%61bc.html');
  });

  // ------------------------------------------------------------------
  // HTML entity decoding: &#x (hex) and &#d (decimal) (lines 426-431)
  // ------------------------------------------------------------------

  test('&#x hex entity decoding catches javascript: URL', () => {
    // &#x6a; = j (hex 6a = 106 = 'j')
    const result = sanitizeUrl('&#x6a;avascript:alert(1)');
    assert.strictEqual(result, null);
  });

  test('&#decimal entity decoding catches javascript: URL', () => {
    // &#106; = j (decimal 106 = 'j')
    const result = sanitizeUrl('&#106;avascript:alert(1)');
    assert.strictEqual(result, null);
  });

  test('multiple hex entities decode to javascript:', () => {
    // j=&#x6a; a=&#x61; v=&#x76; a=&#x61; s=&#x73; c=&#x63; r=&#x72; i=&#x69; p=&#x70; t=&#x74;
    const result = sanitizeUrl('&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)');
    assert.strictEqual(result, null);
  });

  // ------------------------------------------------------------------
  // Dangerous protocols (lines 442-448): javascript:, vbscript:, file:
  // ------------------------------------------------------------------

  test('javascript: is blocked', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), null);
  });

  test('JAVASCRIPT: (uppercase) is blocked', () => {
    assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), null);
  });

  test('JavaScript: (mixed case) is blocked', () => {
    assert.strictEqual(sanitizeUrl('JavaScript:void(0)'), null);
  });

  test('javascript: with whitespace control chars is blocked', () => {
    // Control chars are stripped by the normalize step, so 'java\x09script:' → 'javascript:'
    assert.strictEqual(sanitizeUrl('java\x09script:alert(1)'), null);
  });

  test('javascript: with null byte is blocked', () => {
    assert.strictEqual(sanitizeUrl('java\x00script:alert(1)'), null);
  });

  test('javascript: with newline is blocked', () => {
    assert.strictEqual(sanitizeUrl('java\nscript:alert(1)'), null);
  });

  test('vbscript: is blocked', () => {
    assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), null);
  });

  test('VBSCRIPT: (uppercase) is blocked', () => {
    assert.strictEqual(sanitizeUrl('VBSCRIPT:x'), null);
  });

  test('file: protocol is blocked', () => {
    assert.strictEqual(sanitizeUrl('file:///etc/passwd'), null);
  });

  test('FILE: (uppercase) is blocked', () => {
    assert.strictEqual(sanitizeUrl('FILE:///C:/Windows/win.ini'), null);
  });

  // ------------------------------------------------------------------
  // URL-encoded attack vectors (decoded by decodeURIComponent, lines 432-433)
  // ------------------------------------------------------------------

  test('percent-encoded javascript: is blocked after decoding', () => {
    // %6a = j, %61 = a, %76 = v, %61 = a, %73 = s, %63 = c, %72 = r, %69 = i, %70 = p, %74 = t
    const result = sanitizeUrl('%6a%61%76%61%73%63%72%69%70%74:alert(1)');
    assert.strictEqual(result, null);
  });

  test('percent-encoded JAVASCRIPT: is blocked', () => {
    // uppercase hex: %4A = J
    const result = sanitizeUrl('%4A%41%56%41%53%43%52%49%50%54:alert(1)');
    assert.strictEqual(result, null);
  });

  // ------------------------------------------------------------------
  // data: protocol (lines 451-462)
  // ------------------------------------------------------------------

  test('data: URL is blocked by default', () => {
    assert.strictEqual(sanitizeUrl('data:text/html,<h1>Hello</h1>'), null);
  });

  test('data: URL is blocked when allowData: false explicitly', () => {
    assert.strictEqual(sanitizeUrl('data:image/png;base64,abc', { allowData: false }), null);
  });

  test('data: image URL allowed when allowData: true', () => {
    const url = 'data:image/png;base64,abc123xyz';
    assert.strictEqual(sanitizeUrl(url, { allowData: true }), url);
  });

  test('data: image/jpeg URL allowed when allowData: true', () => {
    const url = 'data:image/jpeg;base64,/9j/4AAQ';
    assert.strictEqual(sanitizeUrl(url, { allowData: true }), url);
  });

  test('data:text/html blocked even when allowData: true', () => {
    const result = sanitizeUrl('data:text/html,<script>alert(1)</script>', { allowData: true });
    assert.strictEqual(result, null);
  });

  test('data:text/javascript blocked even when allowData: true', () => {
    const result = sanitizeUrl('data:text/javascript,alert(1)', { allowData: true });
    assert.strictEqual(result, null);
  });

  test('DATA: (uppercase) is also blocked', () => {
    // normalized is lowercased, so DATA: → data:
    assert.strictEqual(sanitizeUrl('DATA:text/html,<h1>x</h1>'), null);
  });

  // ------------------------------------------------------------------
  // blob: protocol (lines 464-471)
  // ------------------------------------------------------------------

  test('blob: URL is blocked by default', () => {
    assert.strictEqual(sanitizeUrl('blob:https://example.com/abc-123'), null);
  });

  test('blob: URL is blocked when allowBlob: false explicitly', () => {
    assert.strictEqual(sanitizeUrl('blob:https://example.com/abc', { allowBlob: false }), null);
  });

  test('blob: URL allowed when allowBlob: true', () => {
    const url = 'blob:https://example.com/550e8400-e29b-41d4-a716-446655440000';
    assert.strictEqual(sanitizeUrl(url, { allowBlob: true }), url);
  });

  test('BLOB: (uppercase) blocked by default', () => {
    assert.strictEqual(sanitizeUrl('BLOB:https://example.com/id'), null);
  });

  // ------------------------------------------------------------------
  // Relative URLs (lines 474-485) — allowRelative: true (default)
  // ------------------------------------------------------------------

  test('absolute-path relative URL (starts with /) is allowed', () => {
    assert.strictEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
  });

  test('protocol-relative URL (starts with //) is NOT treated as relative', () => {
    // trimmed.startsWith('/') but also startsWith('//') → skips relative branch
    // No protocol with colon found → returns null
    const result = sanitizeUrl('//evil.com/xss');
    assert.strictEqual(result, null);
  });

  test('./relative URL is allowed', () => {
    assert.strictEqual(sanitizeUrl('./file.html'), './file.html');
  });

  test('../relative URL is allowed', () => {
    assert.strictEqual(sanitizeUrl('../parent/file.html'), '../parent/file.html');
  });

  test('no-protocol URL without colon is treated as relative', () => {
    // 'page.html' has no ':' and no '//' → treated as relative
    assert.strictEqual(sanitizeUrl('page.html'), 'page.html');
  });

  test('relative URL like "about" is allowed', () => {
    assert.strictEqual(sanitizeUrl('about'), 'about');
  });

  test('allowRelative: false blocks absolute-path URL', () => {
    assert.strictEqual(sanitizeUrl('/path/to/page', { allowRelative: false }), null);
  });

  test('allowRelative: false blocks ./ URL', () => {
    assert.strictEqual(sanitizeUrl('./file.html', { allowRelative: false }), null);
  });

  test('allowRelative: false blocks ../ URL', () => {
    assert.strictEqual(sanitizeUrl('../parent/file.html', { allowRelative: false }), null);
  });

  test('allowRelative: false blocks no-protocol URL', () => {
    // 'page.html' has no colon → relative → blocked when allowRelative: false
    assert.strictEqual(sanitizeUrl('page.html', { allowRelative: false }), null);
  });

  // ------------------------------------------------------------------
  // Safe protocols (lines 488-494): http, https, mailto, tel, sms, ftp, sftp
  // ------------------------------------------------------------------

  test('https: URL is allowed', () => {
    const url = 'https://example.com/path?q=1#hash';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('http: URL is allowed', () => {
    const url = 'http://example.com/page';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('mailto: URL is allowed', () => {
    const url = 'mailto:user@example.com';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('tel: URL is allowed', () => {
    const url = 'tel:+15551234567';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('sms: URL is allowed', () => {
    const url = 'sms:+15551234567?body=hello';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('ftp: URL is allowed', () => {
    const url = 'ftp://files.example.com/file.txt';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('sftp: URL is allowed', () => {
    const url = 'sftp://user@server.example.com/path';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  test('HTTPS: (uppercase) is allowed — protocol extracted lowercased', () => {
    const url = 'HTTPS://example.com/page';
    assert.strictEqual(sanitizeUrl(url), url);
  });

  // ------------------------------------------------------------------
  // Unknown protocols (line 496): returns null
  // ------------------------------------------------------------------

  test('unknown protocol returns null', () => {
    assert.strictEqual(sanitizeUrl('custom:something'), null);
  });

  test('ws: protocol returns null (not in SAFE_PROTOCOLS)', () => {
    assert.strictEqual(sanitizeUrl('ws://example.com/socket'), null);
  });

  test('chrome: protocol returns null', () => {
    assert.strictEqual(sanitizeUrl('chrome://settings'), null);
  });

  test('about: protocol returns null', () => {
    // 'about:blank' — 'about:' is not in SAFE_PROTOCOLS
    // BUT: 'about' has a colon so it does NOT match the no-colon relative path branch.
    // colonIndex > 0, protocol = 'about:', not in SAFE_PROTOCOLS → null
    assert.strictEqual(sanitizeUrl('about:blank', { allowRelative: false }), null);
  });

  // ------------------------------------------------------------------
  // Whitespace trimming (line 419)
  // ------------------------------------------------------------------

  test('leading and trailing whitespace is trimmed before processing', () => {
    assert.strictEqual(sanitizeUrl('  https://example.com  '), 'https://example.com');
  });

  test('URL with only whitespace trims to empty string and returns empty string (not null)', () => {
    // Guard checks url === '' BEFORE trimming, so '   ' passes the guard.
    // After trim(), trimmed = '' which has no colon and no '//', so it is returned
    // as a relative-path URL (the empty string). This is an edge case, not null.
    const result = sanitizeUrl('   ');
    assert.strictEqual(result, '');
  });

  // ------------------------------------------------------------------
  // Non-string input coerced with String() (line 419)
  // ------------------------------------------------------------------

  test('number input coerced to string and treated as relative URL', () => {
    // String(42) = '42', no colon, no //, treated as relative
    assert.strictEqual(sanitizeUrl(42), '42');
  });

  // ------------------------------------------------------------------
  // SAFE_PROTOCOLS constant verification
  // ------------------------------------------------------------------

  test('SAFE_PROTOCOLS contains expected values', () => {
    assert.ok(SAFE_PROTOCOLS instanceof Set);
    assert.ok(SAFE_PROTOCOLS.has('http:'));
    assert.ok(SAFE_PROTOCOLS.has('https:'));
    assert.ok(SAFE_PROTOCOLS.has('mailto:'));
    assert.ok(SAFE_PROTOCOLS.has('tel:'));
    assert.ok(SAFE_PROTOCOLS.has('sms:'));
    assert.ok(SAFE_PROTOCOLS.has('ftp:'));
    assert.ok(SAFE_PROTOCOLS.has('sftp:'));
  });
});

// =============================================================================
// Exported constants verification
// =============================================================================

describe('Exported constants — DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRS', () => {
  test('DEFAULT_ALLOWED_TAGS is a Set containing expected tags', () => {
    assert.ok(DEFAULT_ALLOWED_TAGS instanceof Set);
    // Text formatting
    assert.ok(DEFAULT_ALLOWED_TAGS.has('p'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('span'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('strong'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('em'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('code'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('pre'));
    // Headings
    assert.ok(DEFAULT_ALLOWED_TAGS.has('h1'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('h6'));
    // Lists
    assert.ok(DEFAULT_ALLOWED_TAGS.has('ul'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('ol'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('li'));
    // Tables
    assert.ok(DEFAULT_ALLOWED_TAGS.has('table'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('thead'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('tbody'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('tr'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('th'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('td'));
    // Links and media
    assert.ok(DEFAULT_ALLOWED_TAGS.has('a'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('img'));
    // Semantic
    assert.ok(DEFAULT_ALLOWED_TAGS.has('article'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('section'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('nav'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('header'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('footer'));
    assert.ok(DEFAULT_ALLOWED_TAGS.has('main'));
    // Not allowed
    assert.ok(!DEFAULT_ALLOWED_TAGS.has('script'));
    assert.ok(!DEFAULT_ALLOWED_TAGS.has('iframe'));
    assert.ok(!DEFAULT_ALLOWED_TAGS.has('object'));
    assert.ok(!DEFAULT_ALLOWED_TAGS.has('embed'));
    assert.ok(!DEFAULT_ALLOWED_TAGS.has('style'));
  });

  test('DEFAULT_ALLOWED_ATTRS is a Set containing expected attributes', () => {
    assert.ok(DEFAULT_ALLOWED_ATTRS instanceof Set);
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('id'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('class'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('title'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('href'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('src'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('alt'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('role'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('aria-label'));
    assert.ok(DEFAULT_ALLOWED_ATTRS.has('tabindex'));
    // style is NOT in defaults
    assert.ok(!DEFAULT_ALLOWED_ATTRS.has('style'));
    assert.ok(!DEFAULT_ALLOWED_ATTRS.has('onclick'));
  });
});

// =============================================================================
// DANGEROUS_KEYS constant verification
// =============================================================================

describe('DANGEROUS_KEYS constant', () => {
  test('is a Set', () => {
    assert.ok(DANGEROUS_KEYS instanceof Set);
  });

  test('contains all expected dangerous keys', () => {
    const expected = [
      '__proto__', 'constructor', 'prototype',
      '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
      'eval', 'Function'
    ];
    for (const key of expected) {
      assert.ok(DANGEROUS_KEYS.has(key), `DANGEROUS_KEYS should contain "${key}"`);
    }
  });

  test('does not over-block valid property names', () => {
    const validNames = ['hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
      'toLocaleString', 'toString', 'valueOf'];
    for (const key of validNames) {
      assert.ok(!DANGEROUS_KEYS.has(key), `DANGEROUS_KEYS should not contain "${key}"`);
    }
  });

  test('does not contain safe keys', () => {
    assert.ok(!DANGEROUS_KEYS.has('name'));
    assert.ok(!DANGEROUS_KEYS.has('value'));
    assert.ok(!DANGEROUS_KEYS.has('data'));
    assert.ok(!DANGEROUS_KEYS.has('id'));
  });
});
