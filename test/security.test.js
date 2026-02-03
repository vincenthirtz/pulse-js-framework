/**
 * Pulse Security Module Tests
 * Tests for runtime/security.js - XSS protection, prototype pollution prevention
 *
 * @module test/security
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock DOMParser for sanitizeHtml tests
class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.childNodes = [];
    this.attributes = [];
    this.textContent = '';
  }
}

class MockTextNode {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body');
  }
}

globalThis.DOMParser = class {
  parseFromString(html) {
    const doc = new MockDocument();
    // Simple parsing for tests
    const textMatch = html.match(/>([^<]*)</);
    if (textMatch) {
      doc.body.childNodes.push(new MockTextNode(textMatch[1]));
    }
    return doc;
  }
};

// Import after mocks
const {
  DANGEROUS_KEYS,
  EVENT_HANDLER_ATTRS,
  DANGEROUS_PROTOCOLS,
  SAFE_PROTOCOLS,
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRS,
  isDangerousKey,
  sanitizeObjectKeys,
  escapeHtml,
  sanitizeHtml,
  sanitizeUrl,
  default: security
} = await import('../runtime/security.js');

describe('Pulse Security Module', () => {

  describe('DANGEROUS_KEYS constant', () => {

    it('should be a Set', () => {
      assert.ok(DANGEROUS_KEYS instanceof Set);
    });

    it('should contain __proto__', () => {
      assert.ok(DANGEROUS_KEYS.has('__proto__'));
    });

    it('should contain constructor', () => {
      assert.ok(DANGEROUS_KEYS.has('constructor'));
    });

    it('should contain prototype', () => {
      assert.ok(DANGEROUS_KEYS.has('prototype'));
    });

    it('should contain property descriptor methods', () => {
      assert.ok(DANGEROUS_KEYS.has('__defineGetter__'));
      assert.ok(DANGEROUS_KEYS.has('__defineSetter__'));
      assert.ok(DANGEROUS_KEYS.has('__lookupGetter__'));
      assert.ok(DANGEROUS_KEYS.has('__lookupSetter__'));
    });

    it('should contain Object prototype methods', () => {
      assert.ok(DANGEROUS_KEYS.has('hasOwnProperty'));
      assert.ok(DANGEROUS_KEYS.has('isPrototypeOf'));
      assert.ok(DANGEROUS_KEYS.has('propertyIsEnumerable'));
      assert.ok(DANGEROUS_KEYS.has('toString'));
      assert.ok(DANGEROUS_KEYS.has('valueOf'));
    });

    it('should contain dangerous globals', () => {
      assert.ok(DANGEROUS_KEYS.has('eval'));
      assert.ok(DANGEROUS_KEYS.has('Function'));
    });

  });

  describe('EVENT_HANDLER_ATTRS constant', () => {

    it('should be a Set', () => {
      assert.ok(EVENT_HANDLER_ATTRS instanceof Set);
    });

    it('should contain common event handlers', () => {
      assert.ok(EVENT_HANDLER_ATTRS.has('onclick'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onload'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onerror'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onmouseover'));
    });

    it('should contain form event handlers', () => {
      assert.ok(EVENT_HANDLER_ATTRS.has('onsubmit'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onfocus'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onblur'));
      assert.ok(EVENT_HANDLER_ATTRS.has('oninput'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onchange'));
    });

    it('should contain keyboard event handlers', () => {
      assert.ok(EVENT_HANDLER_ATTRS.has('onkeydown'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onkeyup'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onkeypress'));
    });

    it('should contain touch event handlers', () => {
      assert.ok(EVENT_HANDLER_ATTRS.has('ontouchstart'));
      assert.ok(EVENT_HANDLER_ATTRS.has('ontouchend'));
      assert.ok(EVENT_HANDLER_ATTRS.has('ontouchmove'));
    });

    it('should contain animation/transition handlers', () => {
      assert.ok(EVENT_HANDLER_ATTRS.has('onanimationstart'));
      assert.ok(EVENT_HANDLER_ATTRS.has('onanimationend'));
      assert.ok(EVENT_HANDLER_ATTRS.has('ontransitionend'));
    });

  });

  describe('DANGEROUS_PROTOCOLS constant', () => {

    it('should be a Set', () => {
      assert.ok(DANGEROUS_PROTOCOLS instanceof Set);
    });

    it('should contain javascript:', () => {
      assert.ok(DANGEROUS_PROTOCOLS.has('javascript:'));
    });

    it('should contain vbscript:', () => {
      assert.ok(DANGEROUS_PROTOCOLS.has('vbscript:'));
    });

    it('should contain data:', () => {
      assert.ok(DANGEROUS_PROTOCOLS.has('data:'));
    });

    it('should contain blob:', () => {
      assert.ok(DANGEROUS_PROTOCOLS.has('blob:'));
    });

  });

  describe('SAFE_PROTOCOLS constant', () => {

    it('should be a Set', () => {
      assert.ok(SAFE_PROTOCOLS instanceof Set);
    });

    it('should contain http:', () => {
      assert.ok(SAFE_PROTOCOLS.has('http:'));
    });

    it('should contain https:', () => {
      assert.ok(SAFE_PROTOCOLS.has('https:'));
    });

    it('should contain mailto:', () => {
      assert.ok(SAFE_PROTOCOLS.has('mailto:'));
    });

    it('should contain tel:', () => {
      assert.ok(SAFE_PROTOCOLS.has('tel:'));
    });

    it('should contain sms:', () => {
      assert.ok(SAFE_PROTOCOLS.has('sms:'));
    });

    it('should contain ftp:', () => {
      assert.ok(SAFE_PROTOCOLS.has('ftp:'));
    });

  });

  describe('isDangerousKey', () => {

    it('should return true for __proto__', () => {
      assert.strictEqual(isDangerousKey('__proto__'), true);
    });

    it('should return true for constructor', () => {
      assert.strictEqual(isDangerousKey('constructor'), true);
    });

    it('should return true for prototype', () => {
      assert.strictEqual(isDangerousKey('prototype'), true);
    });

    it('should return false for normal keys', () => {
      assert.strictEqual(isDangerousKey('name'), false);
      assert.strictEqual(isDangerousKey('value'), false);
      assert.strictEqual(isDangerousKey('data'), false);
      assert.strictEqual(isDangerousKey('items'), false);
    });

    it('should return false for numeric keys', () => {
      assert.strictEqual(isDangerousKey('0'), false);
      assert.strictEqual(isDangerousKey('123'), false);
    });

    it('should return true for eval', () => {
      assert.strictEqual(isDangerousKey('eval'), true);
    });

    it('should return true for Function', () => {
      assert.strictEqual(isDangerousKey('Function'), true);
    });

  });

  describe('sanitizeObjectKeys', () => {

    it('should return non-objects as-is', () => {
      assert.strictEqual(sanitizeObjectKeys(null), null);
      assert.strictEqual(sanitizeObjectKeys('string'), 'string');
      assert.strictEqual(sanitizeObjectKeys(42), 42);
      assert.strictEqual(sanitizeObjectKeys(true), true);
      assert.strictEqual(sanitizeObjectKeys(undefined), undefined);
    });

    it('should filter __proto__ key from iteration', () => {
      // Create object with explicit __proto__ property via defineProperty
      const input = Object.create(null);
      input.name = 'test';
      Object.defineProperty(input, '__proto__', {
        value: { malicious: true },
        enumerable: true,
        configurable: true
      });

      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.name, 'test');
      // The result should only have 'name', not the __proto__ we defined
      assert.strictEqual(Object.keys(result).length, 1);
      assert.ok(Object.keys(result).includes('name'));
    });

    it('should filter constructor key from iteration', () => {
      const input = Object.create(null);
      input.data = 'value';
      input.constructor = function() {};

      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.data, 'value');
      // The custom constructor should not be in the result
      assert.strictEqual(Object.keys(result).length, 1);
    });

    it('should filter prototype key from iteration', () => {
      const input = Object.create(null);
      input.prototype = {};
      input.valid = true;

      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.valid, true);
      assert.ok(!Object.keys(result).includes('prototype'));
    });

    it('should recursively sanitize nested objects', () => {
      const nested = Object.create(null);
      nested.__proto__ = 'malicious';
      nested.data = 'safe';

      const input = {
        level1: {
          level2: nested
        }
      };
      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.level1.level2.data, 'safe');
      // Check that __proto__ was filtered from the keys
      assert.ok(!Object.keys(result.level1.level2).includes('__proto__'));
    });

    it('should handle arrays', () => {
      const item1 = Object.create(null);
      item1.name = 'item1';
      item1.__proto__ = 'bad';

      const input = [
        item1,
        { name: 'item2' }
      ];
      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.ok(Array.isArray(result));
      assert.strictEqual(result[0].name, 'item1');
      assert.ok(!Object.keys(result[0]).includes('__proto__'));
      assert.strictEqual(result[1].name, 'item2');
    });

    it('should throw when throwOnDangerous is true', () => {
      const input = Object.create(null);
      input.__proto__ = 'malicious';

      assert.throws(() => {
        sanitizeObjectKeys(input, { throwOnDangerous: true });
      }, /Dangerous key blocked/);
    });

    it('should preserve safe keys', () => {
      const input = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        nested: { value: 42 }
      };
      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.name, 'John');
      assert.strictEqual(result.age, 30);
      assert.strictEqual(result.email, 'john@example.com');
      assert.strictEqual(result.nested.value, 42);
    });

    it('should remove multiple dangerous keys', () => {
      const input = {
        '__proto__': 'bad1',
        'constructor': 'bad2',
        'prototype': 'bad3',
        'valid': 'good'
      };
      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(Object.keys(result).length, 1);
      assert.strictEqual(result.valid, 'good');
    });

    it('should handle deeply nested dangerous keys', () => {
      const deepObj = Object.create(null);
      deepObj.__proto__ = 'deep malicious';
      deepObj.value = 'safe';

      const input = {
        a: {
          b: {
            c: {
              d: deepObj
            }
          }
        }
      };
      const result = sanitizeObjectKeys(input, { logWarnings: false });
      assert.strictEqual(result.a.b.c.d.value, 'safe');
      assert.ok(!Object.keys(result.a.b.c.d).includes('__proto__'));
    });

  });

  describe('escapeHtml', () => {

    it('should escape < character', () => {
      assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
    });

    it('should escape > character', () => {
      assert.strictEqual(escapeHtml('a > b'), 'a &gt; b');
    });

    it('should escape & character', () => {
      assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
    });

    it('should escape " character', () => {
      assert.strictEqual(escapeHtml('say "hello"'), 'say &quot;hello&quot;');
    });

    it("should escape ' character", () => {
      assert.strictEqual(escapeHtml("it's"), "it&#39;s");
    });

    it('should handle multiple special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
      assert.strictEqual(escapeHtml(input), expected);
    });

    it('should return empty string for null', () => {
      assert.strictEqual(escapeHtml(null), '');
    });

    it('should return empty string for undefined', () => {
      assert.strictEqual(escapeHtml(undefined), '');
    });

    it('should convert numbers to string', () => {
      assert.strictEqual(escapeHtml(42), '42');
    });

    it('should handle strings with no special characters', () => {
      assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
    });

    it('should handle empty string', () => {
      assert.strictEqual(escapeHtml(''), '');
    });

    it('should escape complex HTML injection attempts', () => {
      const input = '"><img src=x onerror=alert(1)>';
      const result = escapeHtml(input);
      assert.ok(!result.includes('<'));
      assert.ok(!result.includes('>'));
      assert.ok(!result.includes('"'));
    });

  });

  describe('DEFAULT_ALLOWED_TAGS constant', () => {

    it('should be a Set', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS instanceof Set);
    });

    it('should allow text formatting tags', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS.has('p'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('span'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('strong'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('em'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('code'));
    });

    it('should allow heading tags', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h1'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h2'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h3'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h4'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h5'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('h6'));
    });

    it('should allow list tags', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS.has('ul'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('ol'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('li'));
    });

    it('should allow table tags', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS.has('table'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('tr'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('td'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('th'));
    });

    it('should allow semantic tags', () => {
      assert.ok(DEFAULT_ALLOWED_TAGS.has('article'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('section'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('nav'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('header'));
      assert.ok(DEFAULT_ALLOWED_TAGS.has('footer'));
    });

    it('should not allow script tag', () => {
      assert.ok(!DEFAULT_ALLOWED_TAGS.has('script'));
    });

    it('should not allow style tag', () => {
      assert.ok(!DEFAULT_ALLOWED_TAGS.has('style'));
    });

    it('should not allow iframe tag', () => {
      assert.ok(!DEFAULT_ALLOWED_TAGS.has('iframe'));
    });

    it('should not allow object tag', () => {
      assert.ok(!DEFAULT_ALLOWED_TAGS.has('object'));
    });

    it('should not allow embed tag', () => {
      assert.ok(!DEFAULT_ALLOWED_TAGS.has('embed'));
    });

  });

  describe('DEFAULT_ALLOWED_ATTRS constant', () => {

    it('should be a Set', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS instanceof Set);
    });

    it('should allow global attributes', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('id'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('class'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('title'));
    });

    it('should allow link attributes', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('href'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('target'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('rel'));
    });

    it('should allow image attributes', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('src'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('alt'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('width'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('height'));
    });

    it('should allow ARIA attributes', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('role'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('aria-label'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('aria-hidden'));
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('aria-expanded'));
    });

    it('should allow tabindex', () => {
      assert.ok(DEFAULT_ALLOWED_ATTRS.has('tabindex'));
    });

    it('should not allow onclick', () => {
      assert.ok(!DEFAULT_ALLOWED_ATTRS.has('onclick'));
    });

    it('should not allow onerror', () => {
      assert.ok(!DEFAULT_ALLOWED_ATTRS.has('onerror'));
    });

    it('should not allow style', () => {
      assert.ok(!DEFAULT_ALLOWED_ATTRS.has('style'));
    });

  });

  describe('sanitizeHtml', () => {

    it('should return empty string for null', () => {
      assert.strictEqual(sanitizeHtml(null), '');
    });

    it('should return empty string for undefined', () => {
      assert.strictEqual(sanitizeHtml(undefined), '');
    });

    it('should return empty string for empty string', () => {
      assert.strictEqual(sanitizeHtml(''), '');
    });

    it('should return empty string for non-string', () => {
      assert.strictEqual(sanitizeHtml(42), '');
      assert.strictEqual(sanitizeHtml({}), '');
    });

    it('should strip all tags in non-browser environment fallback', () => {
      // Temporarily remove DOMParser to test fallback
      const originalDOMParser = globalThis.DOMParser;
      delete globalThis.DOMParser;

      const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
      assert.ok(!result.includes('<'));
      assert.ok(!result.includes('>'));

      globalThis.DOMParser = originalDOMParser;
    });

  });

  describe('sanitizeUrl', () => {

    it('should return null for null input', () => {
      assert.strictEqual(sanitizeUrl(null), null);
    });

    it('should return null for undefined input', () => {
      assert.strictEqual(sanitizeUrl(undefined), null);
    });

    it('should return null for empty string', () => {
      assert.strictEqual(sanitizeUrl(''), null);
    });

    it('should allow https URLs', () => {
      const url = 'https://example.com/page';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should allow http URLs', () => {
      const url = 'http://example.com/page';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should block javascript: URLs', () => {
      assert.strictEqual(sanitizeUrl('javascript:alert(1)'), null);
    });

    it('should block javascript: URLs with spaces', () => {
      assert.strictEqual(sanitizeUrl('  javascript:alert(1)  '), null);
    });

    it('should block javascript: URLs case-insensitively', () => {
      assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), null);
      assert.strictEqual(sanitizeUrl('JavaScript:alert(1)'), null);
      assert.strictEqual(sanitizeUrl('JaVaScRiPt:alert(1)'), null);
    });

    it('should block vbscript: URLs', () => {
      assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), null);
    });

    it('should block vbscript: URLs case-insensitively', () => {
      assert.strictEqual(sanitizeUrl('VBSCRIPT:msgbox(1)'), null);
      assert.strictEqual(sanitizeUrl('VbScript:msgbox(1)'), null);
    });

    it('should block data: URLs by default', () => {
      assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), null);
    });

    it('should allow data: URLs when allowData is true', () => {
      const url = 'data:image/png;base64,abc123';
      assert.strictEqual(sanitizeUrl(url, { allowData: true }), url);
    });

    it('should block data:text/html even when allowData is true', () => {
      assert.strictEqual(
        sanitizeUrl('data:text/html,<script>alert(1)</script>', { allowData: true }),
        null
      );
    });

    it('should block data:text/javascript even when allowData is true', () => {
      assert.strictEqual(
        sanitizeUrl('data:text/javascript,alert(1)', { allowData: true }),
        null
      );
    });

    it('should block blob: URLs by default', () => {
      assert.strictEqual(sanitizeUrl('blob:http://example.com/uuid'), null);
    });

    it('should allow blob: URLs when allowBlob is true', () => {
      const url = 'blob:http://example.com/uuid';
      assert.strictEqual(sanitizeUrl(url, { allowBlob: true }), url);
    });

    it('should allow relative URLs by default', () => {
      assert.strictEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
      assert.strictEqual(sanitizeUrl('./file.html'), './file.html');
      assert.strictEqual(sanitizeUrl('../parent/file'), '../parent/file');
    });

    it('should block relative URLs when allowRelative is false', () => {
      assert.strictEqual(sanitizeUrl('/path/to/page', { allowRelative: false }), null);
    });

    it('should handle URL-encoded javascript:', () => {
      // %6a%61%76%61%73%63%72%69%70%74 = javascript
      assert.strictEqual(sanitizeUrl('%6a%61%76%61%73%63%72%69%70%74:alert(1)'), null);
    });

    it('should handle HTML entity encoded javascript:', () => {
      // &#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116; = javascript
      assert.strictEqual(sanitizeUrl('&#106;avascript:alert(1)'), null);
    });

    it('should handle hex HTML entities', () => {
      // &#x6a; = j
      assert.strictEqual(sanitizeUrl('&#x6a;avascript:alert(1)'), null);
    });

    it('should handle URLs with control characters', () => {
      // Control characters should be stripped
      assert.strictEqual(sanitizeUrl('java\x00script:alert(1)'), null);
      assert.strictEqual(sanitizeUrl('java\x09script:alert(1)'), null);
    });

    it('should allow mailto: URLs', () => {
      const url = 'mailto:user@example.com';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should allow tel: URLs', () => {
      const url = 'tel:+1234567890';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should allow sms: URLs', () => {
      const url = 'sms:+1234567890';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should preserve query strings', () => {
      const url = 'https://example.com/search?q=test&page=1';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should preserve hash fragments', () => {
      const url = 'https://example.com/page#section';
      assert.strictEqual(sanitizeUrl(url), url);
    });

    it('should trim whitespace', () => {
      const url = '  https://example.com  ';
      assert.strictEqual(sanitizeUrl(url), 'https://example.com');
    });

  });

  describe('Default Export', () => {

    it('should export an object with all functions', () => {
      assert.strictEqual(typeof security, 'object');
    });

    it('should include DANGEROUS_KEYS', () => {
      assert.ok(security.DANGEROUS_KEYS instanceof Set);
    });

    it('should include EVENT_HANDLER_ATTRS', () => {
      assert.ok(security.EVENT_HANDLER_ATTRS instanceof Set);
    });

    it('should include DANGEROUS_PROTOCOLS', () => {
      assert.ok(security.DANGEROUS_PROTOCOLS instanceof Set);
    });

    it('should include SAFE_PROTOCOLS', () => {
      assert.ok(security.SAFE_PROTOCOLS instanceof Set);
    });

    it('should include DEFAULT_ALLOWED_TAGS', () => {
      assert.ok(security.DEFAULT_ALLOWED_TAGS instanceof Set);
    });

    it('should include DEFAULT_ALLOWED_ATTRS', () => {
      assert.ok(security.DEFAULT_ALLOWED_ATTRS instanceof Set);
    });

    it('should include isDangerousKey', () => {
      assert.strictEqual(typeof security.isDangerousKey, 'function');
    });

    it('should include sanitizeObjectKeys', () => {
      assert.strictEqual(typeof security.sanitizeObjectKeys, 'function');
    });

    it('should include escapeHtml', () => {
      assert.strictEqual(typeof security.escapeHtml, 'function');
    });

    it('should include sanitizeHtml', () => {
      assert.strictEqual(typeof security.sanitizeHtml, 'function');
    });

    it('should include sanitizeUrl', () => {
      assert.strictEqual(typeof security.sanitizeUrl, 'function');
    });

  });

  describe('Security Attack Vectors', () => {

    describe('Prototype Pollution Prevention', () => {

      it('should filter __proto__ from JSON-parsed objects', () => {
        const malicious = JSON.parse('{"__proto__": {"polluted": true}, "safe": "value"}');
        const clean = sanitizeObjectKeys(malicious, { logWarnings: false });

        // Original prototype should not be polluted
        assert.ok(!('polluted' in {}));
        // The clean object should only have 'safe' key
        assert.strictEqual(clean.safe, 'value');
        // __proto__ should not be in own keys
        assert.ok(!Object.prototype.hasOwnProperty.call(clean, '__proto__') ||
                  Object.keys(clean).filter(k => k === '__proto__').length === 0);
      });

      it('should prevent nested prototype pollution', () => {
        const nestedObj = Object.create(null);
        nestedObj.name = 'John';
        nestedObj.__proto__ = { admin: true };

        const malicious = {
          user: nestedObj
        };
        const clean = sanitizeObjectKeys(malicious, { logWarnings: false });

        assert.ok(!('admin' in {}));
        assert.strictEqual(clean.user.name, 'John');
        assert.ok(!Object.keys(clean.user).includes('__proto__'));
      });

      it('should filter constructor from objects', () => {
        const malicious = Object.create(null);
        malicious.constructor = {
          prototype: { polluted: true }
        };
        malicious.safe = 'value';

        const clean = sanitizeObjectKeys(malicious, { logWarnings: false });

        assert.ok(!Object.keys(clean).includes('constructor'));
        assert.strictEqual(clean.safe, 'value');
      });

    });

    describe('XSS Prevention', () => {

      it('should escape script tags in HTML', () => {
        const result = escapeHtml('<script>alert("XSS")</script>');
        assert.ok(!result.includes('<script>'));
        assert.ok(result.includes('&lt;script&gt;'));
      });

      it('should escape angle brackets in event handler strings', () => {
        const result = escapeHtml('<img src=x onerror="alert(1)">');
        // escapeHtml escapes < and > characters
        assert.ok(!result.includes('<'));
        assert.ok(!result.includes('>'));
        assert.ok(result.includes('&lt;'));
        assert.ok(result.includes('&gt;'));
      });

      it('should block javascript: in URLs', () => {
        const vectors = [
          'javascript:alert(1)',
          'javascript:alert(document.cookie)',
          'javascript:void(0);alert(1)',
          'javascript:/**/alert(1)',
          'javascript:%61lert(1)'
        ];

        for (const vector of vectors) {
          assert.strictEqual(sanitizeUrl(vector), null, `Should block: ${vector}`);
        }
      });

      it('should escape SVG XSS vectors', () => {
        const result = escapeHtml('<svg onload="alert(1)">');
        assert.ok(!result.includes('<'));
        assert.ok(result.includes('&lt;svg'));
      });

      it('should escape img XSS vectors', () => {
        const result = escapeHtml('<img src=x onerror=alert(1)>');
        assert.ok(!result.includes('<'));
        assert.ok(result.includes('&lt;img'));
      });

    });

    describe('Edge Cases', () => {

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(100000);
        assert.doesNotThrow(() => escapeHtml(longString));
        assert.doesNotThrow(() => sanitizeUrl(longString));
      });

      it('should handle unicode characters', () => {
        const unicode = 'Hello \u{1F600} World';
        assert.strictEqual(escapeHtml(unicode), unicode);
      });

      it('should handle mixed content', () => {
        const mixed = '<p>Hello</p><script>bad()</script><div>World</div>';
        const escaped = escapeHtml(mixed);
        assert.ok(!escaped.includes('<script>'));
      });

      it('should handle null bytes in URLs', () => {
        assert.strictEqual(sanitizeUrl('javascript\x00:alert(1)'), null);
      });

      it('should handle newlines in URLs', () => {
        assert.strictEqual(sanitizeUrl('java\nscript:alert(1)'), null);
      });

      it('should handle tabs in URLs', () => {
        assert.strictEqual(sanitizeUrl('java\tscript:alert(1)'), null);
      });

    });

  });

});

console.log('Security tests completed');
