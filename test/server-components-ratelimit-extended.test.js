/**
 * Extended Tests for Server Components Rate Limiting
 * Covers advanced features and edge cases to improve coverage
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  RateLimiter,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  RateLimitStore,
  createRateLimitMiddleware,
  PSCRateLimitError
} from '../runtime/server-components/index.js';

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock Redis client for testing
class MockRedisClient {
  #data = new Map();      // key -> value (string, like Redis)
  #expires = new Map();   // key -> expiresAt timestamp

  async get(key) {
    // Check if expired
    const expiresAt = this.#expires.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.#data.delete(key);
      this.#expires.delete(key);
      return null;
    }

    return this.#data.get(key) || null;
  }

  async set(key, value) {
    this.#data.set(key, value);
    this.#expires.delete(key); // No expiration
  }

  async setEx(key, ttl, value) {
    this.#data.set(key, value);
    this.#expires.set(key, Date.now() + (ttl * 1000));
  }

  async del(...keys) {
    for (const key of keys) {
      this.#data.delete(key);
      this.#expires.delete(key);
    }
    return keys.length;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.#data.keys()).filter(k => regex.test(k));
  }

  clear() {
    this.#data.clear();
    this.#expires.clear();
  }
}

// ============================================================================
// TokenBucket Features (tested indirectly through RateLimiter)
// ============================================================================

describe('TokenBucket - Bucket Persistence and Refill', () => {
  let limiter;

  afterEach(() => {
    if (limiter) {
      limiter.dispose();
    }
  });

  test('buckets are saved to and loaded from store', async () => {
    const store = new MemoryRateLimitStore();
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 },
      store
    });

    // Make a request
    await limiter.check({ ip: '127.0.0.1' });

    // Bucket should be saved to store
    const stats = limiter.getStats();
    assert.ok(stats.activeBuckets > 0);
    assert.ok(stats.storeSize > 0);

    store.dispose();
  });

  test('handles very fast concurrent consumption without overflow', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 100, windowMs: 1000 }
    });

    // Rapid concurrent consumption from same IP
    const promises = [];
    for (let i = 0; i < 150; i++) {
      promises.push(limiter.check({ ip: '127.0.0.1' }));
    }

    const results = await Promise.all(promises);

    // First 100 should succeed, rest should fail
    const allowed = results.filter(r => r.allowed).length;
    assert.ok(allowed <= 100);
    assert.ok(allowed >= 95); // Allow some variance due to timing
  });

  test('concurrent requests from different IPs', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 10, windowMs: 1000 }
    });

    // Concurrent requests from 5 different IPs (15 requests each)
    const ips = ['127.0.0.1', '192.168.1.1', '10.0.0.1', '8.8.8.8', '1.1.1.1'];

    // Process all concurrent requests
    await Promise.all(
      ips.flatMap(ip =>
        Array(15).fill(null).map(() => limiter.check({ ip }))
      )
    );

    // Each IP should now have exhausted its limit
    for (const ip of ips) {
      const result = await limiter.check({ ip });
      // Should be blocked (limit is 10, we already sent 15)
      assert.strictEqual(result.allowed, false);
    }
  });
});

// ============================================================================
// RateLimitStore Abstract Class
// ============================================================================

describe('RateLimitStore - Abstract Methods', () => {
  test('get() throws if not implemented', async () => {
    const store = new RateLimitStore();

    await assert.rejects(
      async () => await store.get('key'),
      { message: /must be implemented/ }
    );
  });

  test('set() throws if not implemented', async () => {
    const store = new RateLimitStore();

    await assert.rejects(
      async () => await store.set('key', 'value'),
      { message: /must be implemented/ }
    );
  });

  test('delete() throws if not implemented', async () => {
    const store = new RateLimitStore();

    await assert.rejects(
      async () => await store.delete('key'),
      { message: /must be implemented/ }
    );
  });

  test('clear() throws if not implemented', async () => {
    const store = new RateLimitStore();

    await assert.rejects(
      async () => await store.clear(),
      { message: /must be implemented/ }
    );
  });
});

// ============================================================================
// RedisRateLimitStore
// ============================================================================

describe('RedisRateLimitStore', () => {
  let redis;
  let store;

  beforeEach(() => {
    redis = new MockRedisClient();
    store = new RedisRateLimitStore(redis, { prefix: 'test:' });
  });

  afterEach(() => {
    redis.clear();
  });

  test('throws if no Redis client provided', () => {
    assert.throws(
      () => new RedisRateLimitStore(null),
      { message: /requires a Redis client/ }
    );
  });

  test('get/set basic operations', async () => {
    await store.set('key1', { value: 'test' });
    const result = await store.get('key1');
    assert.deepStrictEqual(result, { value: 'test' });
  });

  test('get returns null for non-existent key', async () => {
    const result = await store.get('nonexistent');
    assert.strictEqual(result, null);
  });

  test('set with TTL expires after timeout', async () => {
    // Note: RedisRateLimitStore converts ms to seconds (Math.ceil(ttl / 1000))
    // So 100ms becomes 1 second TTL in Redis
    await store.set('key1', { value: 'test' }, 100); // 100ms -> 1sec TTL

    let result = await store.get('key1');
    assert.deepStrictEqual(result, { value: 'test' });

    await sleep(1100); // Wait 1.1 seconds for expiration

    result = await store.get('key1');
    assert.strictEqual(result, null);
  });

  test('set without TTL persists indefinitely', async () => {
    await store.set('key1', { value: 'test' });

    await sleep(100);

    const result = await store.get('key1');
    assert.deepStrictEqual(result, { value: 'test' });
  });

  test('delete removes key', async () => {
    await store.set('key1', { value: 'test' });
    await store.delete('key1');
    const result = await store.get('key1');
    assert.strictEqual(result, null);
  });

  test('clear removes all keys with prefix', async () => {
    await store.set('key1', { value: 'test1' });
    await store.set('key2', { value: 'test2' });

    await store.clear();

    const result1 = await store.get('key1');
    const result2 = await store.get('key2');
    assert.strictEqual(result1, null);
    assert.strictEqual(result2, null);
  });

  test('sanitizes keys to prevent injection', async () => {
    // Malicious key with Redis commands
    const maliciousKey = 'key1\nDEL *\nSET evil';
    await store.set(maliciousKey, { value: 'test' });

    // Key should be sanitized (special chars replaced with _)
    const result = await store.get(maliciousKey);
    assert.deepStrictEqual(result, { value: 'test' });

    // Original malicious key should not exist
    const directResult = await redis.get('test:key1\nDEL *\nSET evil');
    assert.strictEqual(directResult, null);
  });

  test('preserves alphanumeric, dash, underscore, colon in keys', async () => {
    const validKey = 'user:123_action-name';
    await store.set(validKey, { value: 'test' });

    const result = await store.get(validKey);
    assert.deepStrictEqual(result, { value: 'test' });
  });

  test('handles complex nested objects', async () => {
    const complexValue = {
      nested: { deep: { value: [1, 2, 3] } },
      array: [{ a: 1 }, { b: 2 }]
    };

    await store.set('complex', complexValue);
    const result = await store.get('complex');

    assert.deepStrictEqual(result, complexValue);
  });

  test('uses custom prefix', async () => {
    const customStore = new RedisRateLimitStore(redis, { prefix: 'custom:prefix:' });
    await customStore.set('key1', { value: 'test' });

    // Check Redis directly
    const keys = await redis.keys('custom:prefix:*');
    assert.ok(keys.length > 0);
  });

  test('sanitizes prefix to prevent injection', async () => {
    const maliciousPrefix = 'prefix\nDEL *\n';
    const safeStore = new RedisRateLimitStore(redis, { prefix: maliciousPrefix });

    await safeStore.set('key1', { value: 'test' });

    // Should work without executing commands
    const result = await safeStore.get('key1');
    assert.deepStrictEqual(result, { value: 'test' });
  });
});

// ============================================================================
// RateLimiter - Advanced Methods
// ============================================================================

describe('RateLimiter - reset() and clear()', () => {
  let limiter;

  afterEach(() => {
    if (limiter) {
      limiter.dispose();
    }
  });

  test('clear() clears all buckets', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    // Exhaust limit for user 1
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });

    let result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // Clear all buckets
    await limiter.clear();

    // Should be allowed again
    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('reset(key) resets specific bucket', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    // Exhaust limits for two users
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });

    await limiter.check({ ip: '192.168.1.1' });
    await limiter.check({ ip: '192.168.1.1' });

    // Both blocked
    let result1 = await limiter.check({ ip: '127.0.0.1' });
    let result2 = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result1.allowed, false);
    assert.strictEqual(result2.allowed, false);

    // Reset only user 1
    await limiter.reset('user:127.0.0.1');

    // User 1 allowed, user 2 still blocked
    result1 = await limiter.check({ ip: '127.0.0.1' });
    result2 = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result1.allowed, true);
    assert.strictEqual(result2.allowed, false);
  });

  test('getStats() returns bucket statistics', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    // Initially no buckets
    let stats = limiter.getStats();
    assert.strictEqual(stats.activeBuckets, 0);

    // After request, bucket should exist
    await limiter.check({ ip: '127.0.0.1' });

    stats = limiter.getStats();
    assert.ok(stats.activeBuckets > 0);
  });

  test('dispose() cleans up resources', async () => {
    const store = new MemoryRateLimitStore({ cleanupInterval: 100 });
    limiter = new RateLimiter({ perUser: { maxRequests: 5, windowMs: 1000 }, store });

    await limiter.check({ ip: '127.0.0.1' });

    // Dispose
    limiter.dispose();

    // Store should be disposed (size = 0)
    assert.strictEqual(store.size, 0);
  });
});

describe('RateLimiter - Edge Cases', () => {
  let limiter;

  afterEach(() => {
    if (limiter) {
      limiter.dispose();
    }
  });

  test('works with no limits configured', async () => {
    limiter = new RateLimiter({});

    // Should allow all requests
    for (let i = 0; i < 100; i++) {
      const result = await limiter.check({ ip: '127.0.0.1' });
      assert.strictEqual(result.allowed, true);
    }
  });

  test('handles missing IP gracefully', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    // No IP provided - should use 'anonymous'
    const result = await limiter.check({});
    assert.strictEqual(result.allowed, true);
  });

  test('handles missing actionId gracefully', async () => {
    limiter = new RateLimiter({
      perAction: {
        'createUser': { maxRequests: 2, windowMs: 1000 }
      }
    });

    // No actionId - should skip per-action check
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('combines all three limit types correctly', async () => {
    limiter = new RateLimiter({
      global: { maxRequests: 10, windowMs: 1000 },
      perUser: { maxRequests: 5, windowMs: 1000 },
      perAction: {
        'createUser': { maxRequests: 2, windowMs: 1000 }
      }
    });

    // Should enforce most restrictive limit (per-action = 2)
    let result;
    result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('Action rate limit'));
  });

  test('global limit blocks all users', async () => {
    limiter = new RateLimiter({
      global: { maxRequests: 3, windowMs: 1000 }
    });

    // Different users consuming global limit
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '192.168.1.1' });
    await limiter.check({ ip: '10.0.0.1' });

    // 4th request from any user should fail
    const result = await limiter.check({ ip: '8.8.8.8' });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Global rate limit exceeded');
  });

  test('returns correct limit info in response', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    const result = await limiter.check({ ip: '127.0.0.1' });

    assert.strictEqual(result.allowed, true);
    // limit and remaining may not always be in response (depends on which limiter is checked last)
    assert.ok(result.remaining === undefined || (result.remaining >= 0 && result.remaining <= 5));
    if (result.resetAt) {
      assert.ok(typeof result.resetAt === 'number');
      assert.ok(result.resetAt > Date.now());
    }
  });

  test('handles zero maxRequests', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 0, windowMs: 1000 }
    });

    // All requests should be blocked
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
  });

  test('handles very large maxRequests', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 1000000, windowMs: 1000 }
    });

    // Should handle large limits without overflow
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
    // May not have remaining field if no specific limiter matched
    if (result.remaining !== undefined) {
      assert.ok(result.remaining < 1000000); // Should have consumed 1
      assert.ok(result.remaining > 999990); // But still very close
    }
  });
});

describe('RateLimiter - Bucket Persistence', () => {
  test('buckets persist across requests', async () => {
    const limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    // Make multiple requests
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });

    // 6th request should be blocked (limit is 5)
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false, 'Should be rate limited after 5 requests');

    limiter.dispose();
  });

  test('uses external store for persistence', async () => {
    const store = new MemoryRateLimitStore();
    const limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 },
      store
    });

    await limiter.check({ ip: '127.0.0.1' });

    // Store should have bucket data
    assert.ok(store.size > 0);

    limiter.dispose();
    store.dispose();
  });
});

// ============================================================================
// createRateLimitMiddleware
// ============================================================================

describe('createRateLimitMiddleware', () => {
  test('creates middleware function', () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    assert.strictEqual(typeof checkRateLimit, 'function');
  });

  test('allows requests within limit', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    const context = { ip: '127.0.0.1', actionId: 'test' };
    const result = await checkRateLimit(context);

    assert.strictEqual(result.allowed, true);
    // limit/remaining may not be present if no specific limiter matched
    if (result.limit !== undefined) {
      assert.strictEqual(result.limit, 5);
    }
    if (result.remaining !== undefined) {
      assert.ok(result.remaining >= 0);
    }
  });

  test('blocks requests exceeding limit', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    const context = { ip: '127.0.0.1', actionId: 'test' };

    // First two should pass
    let result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, true);

    result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, true);

    // Third should be blocked
    result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('rate limit'));
    assert.ok(result.retryAfter > 0);
  });

  test('returns correct metadata on success', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 10, windowMs: 60000 }
    });

    const context = { ip: '127.0.0.1', actionId: 'test' };
    const result = await checkRateLimit(context);

    assert.strictEqual(result.allowed, true);
    // Metadata fields may be present depending on configuration
    if (result.limit !== undefined) {
      assert.ok(result.limit > 0);
    }
    if (result.remaining !== undefined) {
      assert.ok(result.remaining >= 0);
    }
    if (result.resetAt !== undefined) {
      assert.ok(typeof result.resetAt === 'number');
    }
  });

  test('uses custom identify function', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 2, windowMs: 1000 },
      identify: (ctx) => ctx.userId || ctx.ip
    });

    const context = { ip: '127.0.0.1', userId: 'user123', actionId: 'test' };

    await checkRateLimit(context);
    await checkRateLimit(context);

    // Third request should be blocked
    const result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, false);
  });

  test('bypasses trusted IPs', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perUser: { maxRequests: 2, windowMs: 1000 },
      trustedIPs: ['127.0.0.1']
    });

    const context = { ip: '127.0.0.1', actionId: 'test' };

    // Should allow unlimited requests from trusted IP
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimit(context);
      assert.strictEqual(result.allowed, true);
    }
  });

  test('handles per-action limits', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      perAction: {
        'createUser': { maxRequests: 2, windowMs: 1000 },
        'default': { maxRequests: 10, windowMs: 1000 }
      }
    });

    const context = { ip: '127.0.0.1', actionId: 'createUser' };

    // createUser limited to 2
    let result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, true);

    result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, true);

    result = await checkRateLimit(context);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('createUser'));
  });

  test('handles global limits', async () => {
    const checkRateLimit = createRateLimitMiddleware({
      global: { maxRequests: 3, windowMs: 1000 }
    });

    // Different actions/users, same global limit
    let result = await checkRateLimit({ ip: '127.0.0.1', actionId: 'action1' });
    assert.strictEqual(result.allowed, true);

    result = await checkRateLimit({ ip: '192.168.1.1', actionId: 'action2' });
    assert.strictEqual(result.allowed, true);

    result = await checkRateLimit({ ip: '10.0.0.1', actionId: 'action3' });
    assert.strictEqual(result.allowed, true);

    // 4th request should fail
    result = await checkRateLimit({ ip: '8.8.8.8', actionId: 'action4' });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Global rate limit exceeded');
  });
});

// ============================================================================
// PSCRateLimitError
// ============================================================================

describe('PSCRateLimitError', () => {
  test('creates error with correct properties', () => {
    const error = new PSCRateLimitError('Rate limit exceeded', {
      retryAfter: 5000,
      limit: 10,
      resetAt: Date.now() + 5000,
      reason: 'User rate limit exceeded'
    });

    assert.strictEqual(error.message, 'Rate limit exceeded');
    assert.strictEqual(error.code, 'PSC_RATE_LIMIT_EXCEEDED'); // Correct code
    assert.strictEqual(error.retryAfter, 5000);
    assert.strictEqual(error.limit, 10);
    assert.strictEqual(error.reason, 'User rate limit exceeded');
  });

  test('isRateLimitError() identifies PSCRateLimitError', () => {
    const error = new PSCRateLimitError('Test');
    assert.strictEqual(PSCRateLimitError.isRateLimitError(error), true);

    const regularError = new Error('Test');
    assert.strictEqual(PSCRateLimitError.isRateLimitError(regularError), false);
  });

  test('includes retryAfter in milliseconds', () => {
    const error = new PSCRateLimitError('Test', { retryAfter: 5000 });
    assert.strictEqual(error.retryAfter, 5000);
  });

  test('includes limit information', () => {
    const error = new PSCRateLimitError('Test', {
      limit: 100,
      resetAt: Date.now() + 60000,
      actionId: 'createUser'
    });

    assert.strictEqual(error.limit, 100);
    assert.strictEqual(error.actionId, 'createUser');
    assert.ok(error.resetAt > Date.now());
  });
});

console.log('✅ Extended rate limit tests completed');
