/**
 * Tests for Server Components Rate Limiting
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  RateLimiter,
  MemoryRateLimitStore,
  createRateLimitMiddleware,
  PSCRateLimitError
} from '../runtime/server-components/index.js';

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MemoryRateLimitStore Tests
// ============================================================================

describe('MemoryRateLimitStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryRateLimitStore({ cleanupInterval: 100 });
  });

  afterEach(() => {
    if (store) {
      store.dispose();
    }
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

  test('delete removes key', async () => {
    await store.set('key1', { value: 'test' });
    await store.delete('key1');
    const result = await store.get('key1');
    assert.strictEqual(result, null);
  });

  test('TTL expiration', async () => {
    await store.set('key1', { value: 'test' }, 50); // 50ms TTL
    let result = await store.get('key1');
    assert.deepStrictEqual(result, { value: 'test' });

    await sleep(60); // Wait for expiration
    result = await store.get('key1');
    assert.strictEqual(result, null);
  });

  test('clear removes all keys', async () => {
    await store.set('key1', { value: 'test1' });
    await store.set('key2', { value: 'test2' });
    await store.clear();

    const result1 = await store.get('key1');
    const result2 = await store.get('key2');
    assert.strictEqual(result1, null);
    assert.strictEqual(result2, null);
  });

  test('automatic cleanup removes expired entries', async () => {
    await store.set('key1', { value: 'test' }, 50);
    assert.strictEqual(store.size, 1);

    await sleep(150); // Wait for cleanup interval
    assert.strictEqual(store.size, 0);
  });
});

// ============================================================================
// RateLimiter Tests
// ============================================================================

describe('RateLimiter', () => {
  let limiter;

  afterEach(() => {
    if (limiter) {
      limiter.dispose();
    }
  });

  test('allows requests within limit', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    for (let i = 0; i < 5; i++) {
      const result = await limiter.check({ ip: '127.0.0.1' });
      assert.strictEqual(result.allowed, true, `Request ${i + 1} should be allowed`);
    }
  });

  test('blocks requests exceeding limit', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 3, windowMs: 1000 }
    });

    // First 3 should pass
    for (let i = 0; i < 3; i++) {
      const result = await limiter.check({ ip: '127.0.0.1' });
      assert.strictEqual(result.allowed, true);
    }

    // 4th should be blocked
    const result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'User rate limit exceeded');
    assert.ok(result.retryAfter > 0);
  });

  test('per-action limits work correctly', async () => {
    limiter = new RateLimiter({
      perAction: {
        'createUser': { maxRequests: 2, windowMs: 1000 },
        'default': { maxRequests: 10, windowMs: 1000 }
      }
    });

    // createUser limited to 2
    let result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'createUser', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // Other actions use default limit
    result = await limiter.check({ actionId: 'otherAction', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('global limit applies across all actions', async () => {
    limiter = new RateLimiter({
      global: { maxRequests: 3, windowMs: 1000 }
    });

    // Mix of different actions
    let result = await limiter.check({ actionId: 'action1', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'action2', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'action3', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    // 4th request should fail regardless of action
    result = await limiter.check({ actionId: 'action4', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Global rate limit exceeded');
  });

  test('different users have separate limits', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    // User 1
    let result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // User 2 should have their own limit
    result = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('trusted IPs bypass rate limits', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 },
      trustedIPs: ['127.0.0.1']
    });

    // Should allow unlimited requests from trusted IP
    for (let i = 0; i < 10; i++) {
      const result = await limiter.check({ ip: '127.0.0.1' });
      assert.strictEqual(result.allowed, true);
    }

    // Non-trusted IP still limited
    let result = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, false);
  });

  test('custom identify function works', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 },
      identify: (ctx) => ctx.userId || ctx.ip
    });

    // Same userId, different IPs
    let result = await limiter.check({ userId: 'user123', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ userId: 'user123', ip: '192.168.1.1' });
    assert.strictEqual(result.allowed, true);

    // 3rd request with same userId should be blocked
    result = await limiter.check({ userId: 'user123', ip: '10.0.0.1' });
    assert.strictEqual(result.allowed, false);
  });

  test('tokens refill over time', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 200 } // Refill 10 tokens/sec
    });

    // Use up tokens
    let result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // Wait for refill
    await sleep(250);

    // Should have tokens again
    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('reset clears specific key', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    // Use up tokens
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '127.0.0.1' });

    let result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);

    // Reset user limit
    await limiter.reset('user:127.0.0.1');

    // Should work again
    result = await limiter.check({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);
  });

  test('clear removes all limits', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 1, windowMs: 1000 }
    });

    // Use up tokens for multiple users
    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '192.168.1.1' });

    // Both should be blocked
    let result1 = await limiter.check({ ip: '127.0.0.1' });
    let result2 = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result1.allowed, false);
    assert.strictEqual(result2.allowed, false);

    // Clear all
    await limiter.clear();

    // Both should work again
    result1 = await limiter.check({ ip: '127.0.0.1' });
    result2 = await limiter.check({ ip: '192.168.1.1' });
    assert.strictEqual(result1.allowed, true);
    assert.strictEqual(result2.allowed, true);
  });

  test('getStats returns limiter statistics', async () => {
    limiter = new RateLimiter({
      perUser: { maxRequests: 5, windowMs: 1000 }
    });

    await limiter.check({ ip: '127.0.0.1' });
    await limiter.check({ ip: '192.168.1.1' });

    const stats = limiter.getStats();
    assert.strictEqual(stats.activeBuckets, 2);
    assert.ok(stats.storeSize >= 0);
  });
});

// ============================================================================
// createRateLimitMiddleware Tests
// ============================================================================

describe('createRateLimitMiddleware', () => {
  test('creates middleware function', () => {
    const middleware = createRateLimitMiddleware({
      perUser: { maxRequests: 10, windowMs: 1000 }
    });

    assert.strictEqual(typeof middleware, 'function');
  });

  test('middleware enforces rate limits', async () => {
    const middleware = createRateLimitMiddleware({
      perUser: { maxRequests: 2, windowMs: 1000 }
    });

    let result = await middleware({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await middleware({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await middleware({ ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.retryAfter > 0);
  });
});

// ============================================================================
// PSCRateLimitError Tests
// ============================================================================

describe('PSCRateLimitError', () => {
  test('creates error with details', () => {
    const error = new PSCRateLimitError('Rate limit exceeded', {
      actionId: 'createUser',
      reason: 'User rate limit exceeded',
      retryAfter: 1000,
      resetAt: Date.now() + 1000,
      limit: 10
    });

    assert.strictEqual(error.name, 'PSCRateLimitError');
    assert.strictEqual(error.message, 'Rate limit exceeded');
    assert.strictEqual(error.actionId, 'createUser');
    assert.strictEqual(error.reason, 'User rate limit exceeded');
    assert.strictEqual(error.retryAfter, 1000);
    assert.strictEqual(error.limit, 10);
  });

  test('isRateLimitError identifies rate limit errors', () => {
    const error = new PSCRateLimitError('Test');
    assert.strictEqual(PSCRateLimitError.isRateLimitError(error), true);

    const regularError = new Error('Test');
    assert.strictEqual(PSCRateLimitError.isRateLimitError(regularError), false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Rate Limiting Integration', () => {
  test('combined per-action and per-user limits', async () => {
    const limiter = new RateLimiter({
      perAction: {
        'createUser': { maxRequests: 5, windowMs: 1000 }
      },
      perUser: { maxRequests: 10, windowMs: 1000 }
    });

    const context = { actionId: 'createUser', ip: '127.0.0.1' };

    // Should be limited by per-action (5) not per-user (10)
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(context);
      assert.strictEqual(result.allowed, true);
    }

    const result = await limiter.check(context);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Action rate limit exceeded: createUser');

    limiter.dispose();
  });

  test('global limit applies before specific limits', async () => {
    const limiter = new RateLimiter({
      global: { maxRequests: 3, windowMs: 1000 },
      perUser: { maxRequests: 10, windowMs: 1000 }
    });

    // Use global limit with different actions
    let result = await limiter.check({ actionId: 'action1', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'action2', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    result = await limiter.check({ actionId: 'action3', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, true);

    // 4th should hit global limit
    result = await limiter.check({ actionId: 'action4', ip: '127.0.0.1' });
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Global rate limit exceeded');

    limiter.dispose();
  });

  test('rate limit headers are set correctly', async () => {
    const limiter = new RateLimiter({
      perAction: {
        'testAction': { maxRequests: 5, windowMs: 60000 }
      }
    });

    const result = await limiter.check({ actionId: 'testAction', ip: '127.0.0.1' });

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, 5);
    assert.strictEqual(result.remaining, 4);
    assert.ok(result.resetAt > Date.now());

    limiter.dispose();
  });
});
