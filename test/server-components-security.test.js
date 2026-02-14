/**
 * Tests for Server Components Security Integration
 *
 * Coverage:
 * - Serializer security validation integration
 * - Secret detection in props
 * - XSS sanitization in props
 * - Size limit enforcement
 * - Server Actions error sanitization
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import {
  serializeToPSC,
  markClientBoundary,
  validatePropSecurity,
  detectSecrets,
  sanitizePropsForXSS,
  validatePropSizeLimits,
  PROP_SIZE_LIMITS
} from '../runtime/server-components/index.js';

describe('Server Components Security Integration', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = new MockDOMAdapter();
    setAdapter(mockAdapter);
  });

  afterEach(() => {
    resetAdapter();
  });

  // ========== Security in Serializer ==========

  describe('serializeToPSC() with security validation', () => {
    test('detects secrets in client component props', () => {
      const element = mockAdapter.createElement('div');
      markClientBoundary(element, 'SecretComponent', {
        apiKey: 'sk_test_FAKE1234567890abcdefghijklmnopqrstuvwxyz' // Fake test key
      });

      // Should log warning but not throw (throwOnSecrets: false by default)
      const payload = serializeToPSC(element);
      assert.ok(payload);
      assert.strictEqual(payload.root.type, 'client');
    });

    test('sanitizes XSS in client component props', () => {
      const element = mockAdapter.createElement('div');
      markClientBoundary(element, 'XSSComponent', {
        html: '<script>alert("xss")</script><div>Safe content</div>'
      });

      const payload = serializeToPSC(element);
      const props = payload.root.props;

      // Script tags should be sanitized
      assert.ok(!props.html.includes('<script>'));
      assert.ok(props.html.includes('&lt;script'));
      assert.ok(props.html.includes('Safe content'));
    });

    test('sanitizes event handlers in props', () => {
      const element = mockAdapter.createElement('div');
      markClientBoundary(element, 'EventComponent', {
        content: '<div onclick="alert(1)">Click me</div>'
      });

      const payload = serializeToPSC(element);
      const props = payload.root.props;

      // Event handlers should be blocked
      assert.ok(!props.content.includes('onclick='));
      assert.ok(props.content.includes('data-blocked-event='));
    });

    test('sanitizes javascript: URLs', () => {
      const element = mockAdapter.createElement('div');
      markClientBoundary(element, 'LinkComponent', {
        url: 'javascript:alert(1)',
        safeUrl: 'https://example.com'
      });

      const payload = serializeToPSC(element);
      const props = payload.root.props;

      assert.ok(!props.url.includes('javascript:'));
      assert.ok(props.url.includes('blocked:'));
      assert.strictEqual(props.safeUrl, 'https://example.com');
    });

    test('throws on oversized props', () => {
      const element = mockAdapter.createElement('div');
      const hugeString = 'x'.repeat(PROP_SIZE_LIMITS.MAX_STRING_LENGTH + 1);

      assert.throws(() => {
        markClientBoundary(element, 'HugeComponent', {
          data: hugeString
        });
      }, /String prop too large/);
    });

    test('throws on deeply nested props', () => {
      const element = mockAdapter.createElement('div');

      // Create deeply nested object exceeding MAX_DEPTH
      let nested = { value: 'deep' };
      for (let i = 0; i < PROP_SIZE_LIMITS.MAX_DEPTH + 1; i++) {
        nested = { child: nested };
      }

      assert.throws(() => {
        markClientBoundary(element, 'DeepComponent', nested);
      }, /nesting depth exceeded/);
    });

    test('throws on oversized arrays', () => {
      const element = mockAdapter.createElement('div');
      const hugeArray = new Array(PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH + 1).fill(1);

      assert.throws(() => {
        markClientBoundary(element, 'ArrayComponent', {
          items: hugeArray
        });
      }, /Array too large/);
    });

    test('throws on objects with too many keys', () => {
      const element = mockAdapter.createElement('div');
      const hugeObject = {};
      for (let i = 0; i < PROP_SIZE_LIMITS.MAX_OBJECT_KEYS + 1; i++) {
        hugeObject[`key${i}`] = i;
      }

      assert.throws(() => {
        markClientBoundary(element, 'ObjectComponent', hugeObject);
      }, /too many keys/);
    });
  });

  // ========== validatePropSecurity() ==========

  describe('validatePropSecurity()', () => {
    test('returns valid result for safe props', () => {
      const props = {
        name: 'John',
        age: 30,
        items: ['apple', 'banana']
      };

      const result = validatePropSecurity(props, 'TestComponent');

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.warnings.length, 0);
      assert.strictEqual(result.errors.length, 0);
      assert.deepStrictEqual(result.sanitized, props);
    });

    test('detects secrets in prop keys', () => {
      const props = {
        apiKey: 'sk_live_abc123',
        userName: 'John'
      };

      const result = validatePropSecurity(props, 'TestComponent', {
        throwOnSecrets: false
      });

      assert.strictEqual(result.valid, true); // Valid (warnings don't block)
      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings.some(w => w.path.includes('apiKey')));
    });

    test('throws on secrets when throwOnSecrets is true', () => {
      const props = {
        secret: 'my-secret-key'
      };

      const result = validatePropSecurity(props, 'TestComponent', {
        throwOnSecrets: true
      });

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    test('sanitizes XSS patterns in nested objects', () => {
      const props = {
        user: {
          bio: '<script>alert("xss")</script>',
          name: 'John'
        }
      };

      const result = validatePropSecurity(props, 'TestComponent');

      assert.strictEqual(result.valid, true);
      assert.ok(!result.sanitized.user.bio.includes('<script>'));
      assert.strictEqual(result.sanitized.user.name, 'John');
    });

    test('sanitizes XSS in arrays', () => {
      const props = {
        items: [
          '<script>alert(1)</script>',
          'Safe item',
          'javascript:void(0)'
        ]
      };

      const result = validatePropSecurity(props, 'TestComponent');

      assert.ok(!result.sanitized.items[0].includes('<script>'));
      assert.strictEqual(result.sanitized.items[1], 'Safe item');
      assert.ok(!result.sanitized.items[2].includes('javascript:'));
    });

    test('respects option flags', () => {
      const props = {
        apiKey: 'sk_live_abc123',
        html: '<script>alert(1)</script>',
        huge: 'x'.repeat(PROP_SIZE_LIMITS.MAX_STRING_LENGTH + 1)
      };

      // Disable all validations
      const result = validatePropSecurity(props, 'TestComponent', {
        detectSecrets: false,
        sanitizeXSS: false,
        validateSizes: false
      });

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.warnings.length, 0);
    });
  });

  // ========== detectSecrets() ==========

  describe('detectSecrets()', () => {
    test('detects Stripe live keys', () => {
      const props = {
        stripeKey: 'sk_test_FAKE1234567890abcdefghijklmnop' // Fake test key (min 24 chars after prefix)
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
      assert.ok(secrets.some(s => s.path.includes('stripeKey')));
    });

    test('detects GitHub tokens', () => {
      const props = {
        githubToken: 'ghp_' + 'x'.repeat(36)
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
    });

    test('detects generic secrets by key name', () => {
      const props = {
        apiKey: 'some-key',
        password: 'some-pass',
        token: 'some-token',
        secret: 'some-secret'
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length >= 4);
    });

    test('detects high-entropy values', () => {
      const props = {
        value: 'a'.repeat(40) // 40+ char alphanumeric (likely token)
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
    });

    test('detects PEM-encoded private keys', () => {
      const props = {
        key: '-----BEGIN PRIVATE KEY-----\nMIIE...'
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
    });

    test('handles nested objects', () => {
      const props = {
        config: {
          database: {
            password: 'secret123'
          }
        }
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
      assert.ok(secrets.some(s => s.path.includes('password')));
    });

    test('handles arrays', () => {
      const props = {
        tokens: ['token1', 'ghp_' + 'x'.repeat(36)]
      };

      const secrets = detectSecrets(props);
      assert.ok(secrets.length > 0);
    });

    test('avoids false positives on safe values', () => {
      const props = {
        name: 'John Doe',
        email: 'john@example.com',
        count: 42,
        active: true,
        tags: ['javascript', 'react', 'node']
      };

      const secrets = detectSecrets(props);
      assert.strictEqual(secrets.length, 0);
    });
  });

  // ========== sanitizePropsForXSS() ==========

  describe('sanitizePropsForXSS()', () => {
    test('sanitizes script tags', () => {
      const props = {
        html: '<script>alert("xss")</script><div>Safe</div>'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.html.includes('<script>'));
      assert.ok(props.html.includes('&lt;script'));
      assert.ok(props.html.includes('<div>Safe</div>'));
    });

    test('sanitizes event handlers', () => {
      const props = {
        content: '<div onclick="alert(1)" onload="alert(2)">Content</div>'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.content.includes('onclick='));
      assert.ok(!props.content.includes('onload='));
      assert.ok(props.content.includes('data-blocked-event='));
    });

    test('sanitizes javascript: protocol', () => {
      const props = {
        url: 'javascript:alert(1)'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.url.includes('javascript:'));
      assert.ok(props.url.includes('blocked:'));
    });

    test('sanitizes vbscript: protocol', () => {
      const props = {
        url: 'vbscript:msgbox(1)'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.url.includes('vbscript:'));
      assert.ok(props.url.includes('blocked:'));
    });

    test('sanitizes data:text/html', () => {
      const props = {
        url: 'data:text/html,<script>alert(1)</script>'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.url.includes('data:text/html'));
      assert.ok(props.url.includes('data:text/plain'));
    });

    test('preserves safe HTML', () => {
      const props = {
        html: '<div class="container"><p>Hello <strong>World</strong></p></div>'
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.strictEqual(
        props.html,
        '<div class="container"><p>Hello <strong>World</strong></p></div>'
      );
    });

    test('handles nested objects and arrays', () => {
      const props = {
        nested: {
          items: [
            '<script>alert(1)</script>',
            'Safe text'
          ]
        }
      };

      sanitizePropsForXSS(props, 'TestComponent');

      assert.ok(!props.nested.items[0].includes('<script>'));
      assert.strictEqual(props.nested.items[1], 'Safe text');
    });

    test('mutates props in place', () => {
      const props = {
        html: '<script>alert(1)</script>'
      };

      const result = sanitizePropsForXSS(props, 'TestComponent');

      assert.strictEqual(result, props); // Same reference
      assert.ok(!props.html.includes('<script>'));
    });
  });

  // ========== validatePropSizeLimits() ==========

  describe('validatePropSizeLimits()', () => {
    test('allows props within limits', () => {
      const props = {
        name: 'John',
        items: [1, 2, 3],
        nested: { a: 1, b: 2 }
      };

      // Should not throw
      validatePropSizeLimits(props, 'TestComponent');
    });

    test('throws on string exceeding MAX_STRING_LENGTH', () => {
      const props = {
        huge: 'x'.repeat(PROP_SIZE_LIMITS.MAX_STRING_LENGTH + 1)
      };

      assert.throws(() => {
        validatePropSizeLimits(props, 'TestComponent');
      }, /String prop too large/);
    });

    test('throws on array exceeding MAX_ARRAY_LENGTH', () => {
      const props = {
        items: new Array(PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH + 1).fill(1)
      };

      assert.throws(() => {
        validatePropSizeLimits(props, 'TestComponent');
      }, /Array too large/);
    });

    test('throws on object exceeding MAX_OBJECT_KEYS', () => {
      const props = {};
      for (let i = 0; i < PROP_SIZE_LIMITS.MAX_OBJECT_KEYS + 1; i++) {
        props[`key${i}`] = i;
      }

      assert.throws(() => {
        validatePropSizeLimits({ data: props }, 'TestComponent');
      }, /too many keys/);
    });

    test('throws on nesting exceeding MAX_DEPTH', () => {
      let nested = { value: 1 };
      for (let i = 0; i < PROP_SIZE_LIMITS.MAX_DEPTH + 1; i++) {
        nested = { child: nested };
      }

      assert.throws(() => {
        validatePropSizeLimits(nested, 'TestComponent');
      }, /nesting depth exceeded/);
    });

    test('throws on total size exceeding MAX_TOTAL_SIZE', () => {
      // Create object that exceeds 1MB when JSON.stringify'ed
      // Use strings under individual limit (100KB) but totaling >1MB
      const mediumString = 'x'.repeat(90_000); // Under 100KB limit
      const props = {};

      // Create 12 fields * 90KB each = ~1.08MB total (exceeds 1MB limit)
      for (let i = 0; i < 12; i++) {
        props[`field${i}`] = mediumString;
      }

      assert.throws(() => {
        validatePropSizeLimits(props, 'TestComponent');
      }, /Total prop size too large/);
    });

    test('throws on circular references', () => {
      const props = { value: 1 };
      props.circular = props;

      // Should throw specific error for circular references
      assert.throws(() => {
        validatePropSizeLimits(props, 'TestComponent');
      }, /circular reference/i);
    });
  });
});
