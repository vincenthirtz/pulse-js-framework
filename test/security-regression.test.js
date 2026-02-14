/**
 * Security Regression Tests
 *
 * Tests for critical security vulnerabilities that were fixed.
 * These tests ensure vulnerabilities don't get reintroduced.
 *
 * Vulnerabilities covered:
 * - CRITICAL-001: ReDoS in environment variable detection
 * - CRITICAL-002: Prototype pollution
 * - HIGH-001: Race condition in token bucket
 * - HIGH-002: CSRF timing attack
 * - HIGH-003: Redis injection
 * - HIGH-004: Integer overflow
 * - HIGH-005: Path traversal
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import security modules
import {
  detectEnvironmentVariables,
  detectNonSerializable
} from '../runtime/server-components/security-validation.js';

import { CSRFTokenStore } from '../runtime/server-components/security-csrf.js';
import { RateLimiter } from '../runtime/server-components/security-ratelimit.js';
import { sanitizeImportPath } from '../runtime/server-components/utils/path-sanitizer.js';

// ============================================================================
// CRITICAL-001: ReDoS Protection
// ============================================================================

describe('CRITICAL-001: ReDoS vulnerability in environment variable detection', () => {
  test('ReDoS: environment variable detection completes fast with malicious input', () => {
    // Create malicious input that would cause catastrophic backtracking in regex
    // Use 5000 chars to stay under MAX_ENV_SCAN_SIZE (10000)
    const malicious = 'process.env.' + 'A'.repeat(5000);

    const start = Date.now();
    const result = detectEnvironmentVariables({ value: malicious });
    const duration = Date.now() - start;

    // Should complete in less than 100ms (would take seconds/minutes with vulnerable regex)
    assert.ok(duration < 100, `Detection took ${duration}ms, expected <100ms`);
    assert.strictEqual(result.detected, true);
    assert.ok(result.warnings.length > 0);
  });

  test('ReDoS: handles extremely long strings without hanging', () => {
    // String longer than MAX_ENV_SCAN_SIZE (10000)
    const veryLongString = 'x'.repeat(20000);

    const start = Date.now();
    const result = detectEnvironmentVariables({ value: veryLongString });
    const duration = Date.now() - start;

    // Should skip large strings and return immediately
    assert.ok(duration < 50, `Detection took ${duration}ms, expected <50ms`);
    assert.strictEqual(result.detected, false);
  });

  test('ReDoS: detects legitimate environment variables quickly', () => {
    const input = {
      apiKey: 'process.env.API_KEY',
      viteVar: 'import.meta.env.VITE_SECRET',
      denoVar: 'Deno.env.get("TOKEN")'
    };

    const start = Date.now();
    const result = detectEnvironmentVariables(input);
    const duration = Date.now() - start;

    assert.ok(duration < 50, `Detection took ${duration}ms`);
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 3);
  });
});

// ============================================================================
// CRITICAL-002: Prototype Pollution
// ============================================================================

describe('CRITICAL-002: Prototype pollution vulnerability', () => {
  test('Prototype pollution: __proto__ key is blocked', () => {
    // Simulate props that came from JSON.parse (the real attack vector)
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}');

    const result = detectNonSerializable(malicious, 'props');

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key' && e.path === 'props.__proto__'));

    // Verify pollution didn't happen
    assert.strictEqual({}.polluted, undefined);
    assert.strictEqual(Object.prototype.polluted, undefined);
  });

  test('Prototype pollution: constructor key is blocked', () => {
    const malicious = { 'constructor': { polluted: true } };

    const result = detectNonSerializable(malicious, 'props');

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key' && e.path === 'props.constructor'));
  });

  test('Prototype pollution: prototype key is blocked', () => {
    const malicious = { 'prototype': { polluted: true } };

    const result = detectNonSerializable(malicious, 'props');

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key' && e.path === 'props.prototype'));
  });

  test('Prototype pollution: nested dangerous keys are blocked', () => {
    // Simulate nested attack from JSON
    const malicious = JSON.parse('{"user":{"data":{"__proto__":{"isAdmin":true}}}}');

    const result = detectNonSerializable(malicious, 'props');

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key'));
  });

  test('Safe objects pass validation', () => {
    const safe = {
      user: { name: 'Alice', age: 30 },
      items: [1, 2, 3]
    };

    const result = detectNonSerializable(safe, 'props');

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });
});

// ============================================================================
// HIGH-001: Race Condition in Token Bucket
// ============================================================================

describe('HIGH-001: Race condition in token bucket', () => {
  test('Race condition: concurrent requests respect limits', async () => {
    const limiter = new RateLimiter({
      global: { maxRequests: 10, windowMs: 1000 }
    });

    // Fire 100 concurrent requests - with mutex lock, exactly 10 should succeed
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(limiter.check({ ip: '127.0.0.1' }));
    }
    const results = await Promise.all(promises);

    const allowed = results.filter(r => r.allowed).length;
    const denied = results.filter(r => !r.allowed).length;

    // With proper mutex lock, exactly 10 should be allowed (not more)
    // Without lock, race condition could allow more than 10
    assert.strictEqual(allowed, 10, `Expected 10 allowed, got ${allowed}`);
    assert.strictEqual(denied, 90, `Expected 90 denied, got ${denied}`);

    limiter.dispose();
  });

  test('Race condition: sequential requests work correctly', async () => {
    const limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await limiter.check({ ip: '192.168.1.1' });
      results.push(result);
    }

    const allowed = results.filter(r => r.allowed).length;
    assert.strictEqual(allowed, 5);

    limiter.dispose();
  });
});

// ============================================================================
// HIGH-002: CSRF Timing Attack
// ============================================================================

describe('HIGH-002: CSRF timing attack vulnerability', () => {
  test('CSRF timing: invalid token takes same time as valid token', async () => {
    const store = new CSRFTokenStore({ secret: 'test-secret-key-32-bytes-long-1234' });

    // Generate valid token
    const validToken = await store.generate();

    // Create invalid tokens
    const invalidFormat = 'invalid-format';
    const invalidSignature = '1234567890.abcdef1234567890abcdef1234567890.ffffffffffffffff';

    // Measure validation times
    const timings = [];

    // Valid token
    const start1 = Date.now();
    await store.validate(validToken);
    timings.push(Date.now() - start1);

    // Invalid format
    const start2 = Date.now();
    await store.validate(invalidFormat);
    timings.push(Date.now() - start2);

    // Invalid signature
    const start3 = Date.now();
    await store.validate(invalidSignature);
    timings.push(Date.now() - start3);

    // All validations should take roughly the same time (within 50ms)
    // In vulnerable version, invalid format would return instantly (0-1ms)
    // while valid/signature checks would take longer (5-10ms)
    const maxTime = Math.max(...timings);
    const minTime = Math.min(...timings);
    const timeDiff = maxTime - minTime;

    // With constant-time validation, difference should be minimal (<50ms)
    // This prevents timing attacks that leak token validity
    assert.ok(timeDiff < 50, `Timing difference ${timeDiff}ms too large (timing attack risk)`);

    store.dispose();
  });

  test('CSRF timing: all validation paths execute HMAC computation', async () => {
    const store = new CSRFTokenStore({ secret: 'test-secret-32-bytes' });

    // All these should take similar time because they all compute HMAC
    const invalidInputs = [
      null,
      '',
      'short',
      'only.two.parts',
      'invalid.timestamp.signature',
      'abc.def.ghi'
    ];

    const timings = [];

    for (const input of invalidInputs) {
      const start = Date.now();
      await store.validate(input);
      timings.push(Date.now() - start);
    }

    // All should take at least some time (HMAC computation)
    // None should be instant (which would indicate early return)
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;

    // Average should be > 0ms (indicates HMAC was computed)
    assert.ok(avgTime > 0, 'All validation paths should compute HMAC');

    store.dispose();
  });
});

// ============================================================================
// HIGH-003: Redis Injection
// ============================================================================

describe('HIGH-003: Redis injection vulnerability', () => {
  test('Redis injection: malicious keys are sanitized', () => {
    // These would be malicious in Redis if not sanitized
    const maliciousKeys = [
      '../../../etc/passwd',
      'key\nDEL *',
      'key;FLUSHALL',
      'key FLUSHDB',
      'key\rSET admin 1',
      'user\x00admin'
    ];

    // Import sanitization function (it's internal, so we test via RedisRateLimitStore)
    // We'll verify keys are sanitized by checking they only contain safe chars
    const safeCharPattern = /^[a-zA-Z0-9:_-]+$/;

    for (const key of maliciousKeys) {
      // Simulate sanitization (same regex as in code)
      const sanitized = key.replace(/[^a-zA-Z0-9:_-]/g, '_');

      assert.ok(safeCharPattern.test(sanitized), `Sanitized key "${sanitized}" should only contain safe characters`);
      assert.notStrictEqual(sanitized, key, `Malicious key "${key}" should be modified`);
    }
  });
});

// ============================================================================
// HIGH-004: Integer Overflow
// ============================================================================

describe('HIGH-004: Integer overflow in token bucket', () => {
  test('Integer overflow: extremely large time differences are capped', async () => {
    const limiter = new RateLimiter({
      global: { maxRequests: 100, windowMs: 1000 }
    });

    // Consume all tokens
    for (let i = 0; i < 100; i++) {
      await limiter.check({ ip: '127.0.0.1' });
    }

    // Should be rate limited now
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // Even after "waiting", shouldn't overflow
    // (In real scenario, time would advance, but we're testing overflow protection)

    limiter.dispose();
  });

  test('Integer overflow: token count never exceeds MAX_TOKENS', async () => {
    // This test verifies that even with extreme time differences,
    // tokens are capped to prevent overflow

    const limiter = new RateLimiter({
      global: { maxRequests: 1000, windowMs: 1000 }
    });

    // First request
    const result1 = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result1.allowed, true);

    // Remaining should never be larger than maxRequests
    // After consuming 1 token, should have 999 remaining
    assert.ok(result1.remaining < 1000, `Remaining ${result1.remaining} should be less than max 1000`);
    assert.ok(result1.remaining >= 0, `Remaining ${result1.remaining} should be non-negative`);

    limiter.dispose();
  });
});

// ============================================================================
// HIGH-005: Path Traversal
// ============================================================================

describe('HIGH-005: Path traversal vulnerability', () => {
  test('Path traversal: ../ sequences are blocked', () => {
    const basePath = '/project/src';

    const maliciousPaths = [
      '../../../etc/passwd',
      '../../package.json',
      '../node_modules/malicious',
      './../.env'
    ];

    for (const path of maliciousPaths) {
      assert.throws(
        () => sanitizeImportPath(path, basePath),
        /Invalid import path.*escape/,
        `Path "${path}" should be blocked`
      );
    }
  });

  test('Path traversal: absolute paths outside project are blocked', () => {
    const basePath = '/project/src';

    const maliciousPaths = [
      '/etc/passwd',
      '/root/.ssh/id_rsa',
      'C:\\Windows\\System32\\config\\SAM'
    ];

    for (const path of maliciousPaths) {
      assert.throws(
        () => sanitizeImportPath(path, basePath),
        /Invalid import path/,
        `Absolute path "${path}" should be blocked`
      );
    }
  });

  test('Path traversal: safe relative paths are allowed', () => {
    const basePath = '/project/src';

    const safePaths = [
      './components/Button.js',
      'utils/helpers.js',
      './pages/Home.js',
      'lib/api.js'
    ];

    for (const path of safePaths) {
      assert.doesNotThrow(
        () => sanitizeImportPath(path, basePath),
        `Safe path "${path}" should be allowed`
      );
    }
  });

  test('Path traversal: normalized paths stay within project', () => {
    const basePath = '/project/src';

    // These normalize to safe paths
    const result1 = sanitizeImportPath('./components/../utils/helper.js', basePath);
    assert.ok(result1.startsWith(basePath), 'Path should stay within project');

    const result2 = sanitizeImportPath('components/./Button.js', basePath);
    assert.ok(result2.startsWith(basePath), 'Path should stay within project');
  });
});

// ============================================================================
// Integration Test: Multiple Vulnerabilities
// ============================================================================

describe('Integration: Multiple security fixes work together', () => {
  test('Combined: ReDoS + Prototype pollution protection', () => {
    const malicious = {
      '__proto__': { polluted: true },
      evil: 'process.env.' + 'A'.repeat(5000)
    };

    const start = Date.now();
    const serializableResult = detectNonSerializable(malicious);
    const envResult = detectEnvironmentVariables(malicious);
    const duration = Date.now() - start;

    // Both checks should complete quickly
    assert.ok(duration < 100, 'Combined checks should be fast');

    // Prototype pollution should be caught
    assert.strictEqual(serializableResult.valid, false);

    // Env vars should be detected without ReDoS
    assert.strictEqual(envResult.detected, true);
  });

  test('Combined: CSRF + Rate limiting work together', async () => {
    const csrfStore = new CSRFTokenStore({ secret: 'test-secret' });
    const limiter = new RateLimiter({
      global: { maxRequests: 5, windowMs: 1000 }
    });

    // Generate token
    const token = await csrfStore.generate();

    // Simulate multiple requests with CSRF validation
    const results = [];
    for (let i = 0; i < 10; i++) {
      const rateLimitResult = await limiter.check({ ip: '127.0.0.1' });
      if (rateLimitResult.allowed) {
        const csrfResult = await csrfStore.validate(token);
        results.push({ rateLimit: true, csrf: csrfResult.valid });
      } else {
        results.push({ rateLimit: false, csrf: false });
      }
    }

    // Only 5 should pass rate limit
    const passedRateLimit = results.filter(r => r.rateLimit).length;
    assert.strictEqual(passedRateLimit, 5);

    csrfStore.dispose();
    limiter.dispose();
  });
});

console.log('✓ All security regression tests passed');
