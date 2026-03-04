/**
 * SSR Async Context - Coverage Boost Tests
 *
 * Targets uncovered branches and edge cases in runtime/ssr-async.js:
 * - getAllResolved() with function keys, named functions, anonymous functions
 * - collecting = false stops register()
 * - resolvedCount getter
 * - isCollectingAsync() global helper
 * - registerAsync() / getCachedAsync() / hasCachedAsync() global helpers
 * - waitAll() when pending is empty
 * - waitAll() stops collecting after completion
 * - reset() restores collecting to true
 *
 * @module test/ssr-async-coverage-boost
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  SSRAsyncContext,
  getSSRAsyncContext,
  setSSRAsyncContext,
  isCollectingAsync,
  registerAsync,
  getCachedAsync,
  hasCachedAsync,
} from '../runtime/ssr-async.js';

// ============================================================================
// SSRAsyncContext - getAllResolved()
// ============================================================================

describe('SSRAsyncContext.getAllResolved()', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
  });

  test('returns empty object when nothing resolved', () => {
    const result = ctx.getAllResolved();
    assert.deepStrictEqual(result, {});
  });

  test('uses function.name as key for named functions', async () => {
    function fetchUser() {}
    ctx.resolved.set(fetchUser, { id: 1 });

    const result = ctx.getAllResolved();
    assert.deepStrictEqual(result, { fetchUser: { id: 1 } });
  });

  test('uses "anonymous" for anonymous functions with no name', async () => {
    const fn = function () {};
    Object.defineProperty(fn, 'name', { value: '', configurable: true });
    ctx.resolved.set(fn, 42);

    const result = ctx.getAllResolved();
    assert.deepStrictEqual(result, { anonymous: 42 });
  });

  test('uses String(key) for non-function keys', async () => {
    ctx.resolved.set('myKey', 'value1');
    ctx.resolved.set(42, 'value2');

    const result = ctx.getAllResolved();
    assert.strictEqual(result['myKey'], 'value1');
    assert.strictEqual(result['42'], 'value2');
  });

  test('returns all resolved entries', async () => {
    ctx.resolved.set('a', 1);
    ctx.resolved.set('b', 2);
    ctx.resolved.set('c', 3);

    const result = ctx.getAllResolved();
    assert.strictEqual(Object.keys(result).length, 3);
    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
    assert.strictEqual(result.c, 3);
  });
});

// ============================================================================
// SSRAsyncContext - collecting flag behavior
// ============================================================================

describe('SSRAsyncContext - collecting flag', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
  });

  test('register() is a no-op when collecting is false', () => {
    ctx.collecting = false;
    ctx.register('key', Promise.resolve(42));

    assert.strictEqual(ctx.pendingCount, 0);
  });

  test('collecting starts as true', () => {
    assert.strictEqual(ctx.collecting, true);
  });

  test('collecting becomes false after waitAll()', async () => {
    ctx.register('key', Promise.resolve(1));
    await ctx.waitAll();
    assert.strictEqual(ctx.collecting, false);
  });

  test('reset() restores collecting to true', async () => {
    ctx.register('key', Promise.resolve(1));
    await ctx.waitAll();
    assert.strictEqual(ctx.collecting, false);

    ctx.reset();
    assert.strictEqual(ctx.collecting, true);
  });
});

// ============================================================================
// SSRAsyncContext - waitAll() edge cases
// ============================================================================

describe('SSRAsyncContext.waitAll() edge cases', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
  });

  test('returns immediately when no pending operations', async () => {
    // Should not throw and should resolve quickly
    await assert.doesNotReject(() => ctx.waitAll());
  });

  test('resolvedCount tracks resolved operations', async () => {
    assert.strictEqual(ctx.resolvedCount, 0);
    ctx.register('k1', Promise.resolve('a'));
    ctx.register('k2', Promise.resolve('b'));
    await ctx.waitAll();
    assert.strictEqual(ctx.resolvedCount, 2);
  });

  test('errorCount tracks failed operations', async () => {
    assert.strictEqual(ctx.errorCount, 0);
    ctx.register('fail', Promise.reject(new Error('oops')));
    await ctx.waitAll(); // waitAll resolves even on errors (catches them)
    assert.strictEqual(ctx.errorCount, 1);
  });

  test('waitAll does not reject on individual operation failures', async () => {
    ctx.register('ok', Promise.resolve(1));
    ctx.register('fail', Promise.reject(new Error('nope')));
    // Should not throw - individual errors are caught
    await assert.doesNotReject(() => ctx.waitAll());
    assert.strictEqual(ctx.resolvedCount, 1);
    assert.strictEqual(ctx.errorCount, 1);
  });
});

// ============================================================================
// SSRAsyncContext - reset()
// ============================================================================

describe('SSRAsyncContext.reset()', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
  });

  test('clears errors', () => {
    ctx.errors.set('k', new Error('test'));
    ctx.reset();
    assert.strictEqual(ctx.errorCount, 0);
  });

  test('clears resolved', async () => {
    ctx.register('k', Promise.resolve(99));
    await ctx.waitAll();
    assert.strictEqual(ctx.resolvedCount, 1);

    ctx.reset();
    assert.strictEqual(ctx.resolvedCount, 0);
  });

  test('clears pending', () => {
    ctx.pending.push({ key: 'x', promise: Promise.resolve() });
    ctx.reset();
    assert.strictEqual(ctx.pendingCount, 0);
  });

  test('allows new operations after reset', async () => {
    ctx.register('first', Promise.resolve(1));
    await ctx.waitAll();

    ctx.reset();
    ctx.register('second', Promise.resolve(2));
    await ctx.waitAll();

    assert.ok(ctx.has('second'));
    assert.strictEqual(ctx.get('second'), 2);
  });
});

// ============================================================================
// Global helpers
// ============================================================================

describe('isCollectingAsync()', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns false when no context is set', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('returns true when context is set and collecting', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(isCollectingAsync(), true);
  });

  test('returns false when context has collecting=false', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.register('k', Promise.resolve(1));
    await ctx.waitAll(); // sets collecting = false
    assert.strictEqual(isCollectingAsync(), false);
  });
});

describe('registerAsync()', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('is a no-op when no context is set', () => {
    setSSRAsyncContext(null);
    // Should not throw
    assert.doesNotThrow(() => registerAsync('k', Promise.resolve(1)));
  });

  test('registers in current context', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);

    registerAsync('test-key', Promise.resolve('hello'));
    assert.strictEqual(ctx.pendingCount, 1);

    await ctx.waitAll();
    assert.strictEqual(ctx.get('test-key'), 'hello');
  });
});

describe('getCachedAsync()', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns undefined when no context is set', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(getCachedAsync('k'), undefined);
  });

  test('returns cached value from current context', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.resolved.set('myKey', { data: 42 });

    assert.deepStrictEqual(getCachedAsync('myKey'), { data: 42 });
  });

  test('returns undefined for uncached key', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(getCachedAsync('nonexistent'), undefined);
  });
});

describe('hasCachedAsync()', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns false when no context is set', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(hasCachedAsync('k'), false);
  });

  test('returns false when key is not cached', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(hasCachedAsync('missing'), false);
  });

  test('returns true when key is cached', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.resolved.set('present', true);

    assert.strictEqual(hasCachedAsync('present'), true);
  });
});
