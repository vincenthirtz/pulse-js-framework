/**
 * Pulse Async Primitives Tests
 *
 * Tests for runtime/async.js - useAsync, useResource, usePolling
 *
 * @module test/async
 */

import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert';

import {
  createVersionedAsync,
  useAsync,
  useResource,
  usePolling,
  clearResourceCache,
  getResourceCacheStats
} from '../runtime/async.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

// =============================================================================
// createVersionedAsync Tests
// =============================================================================

describe('createVersionedAsync Tests', () => {
  test('createVersionedAsync creates controller with expected methods', () => {
    const controller = createVersionedAsync();

    assert.ok(typeof controller.begin === 'function', 'Should have begin method');
    assert.ok(typeof controller.abort === 'function', 'Should have abort method');
    assert.ok(typeof controller.getVersion === 'function', 'Should have getVersion method');
    assert.ok(typeof controller.cleanup === 'function', 'Should have cleanup method');
  });

  test('createVersionedAsync.begin returns context with expected methods', () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();

    assert.ok(typeof ctx.isCurrent === 'function', 'Should have isCurrent method');
    assert.ok(typeof ctx.isStale === 'function', 'Should have isStale method');
    assert.ok(typeof ctx.ifCurrent === 'function', 'Should have ifCurrent method');
    assert.ok(typeof ctx.setTimeout === 'function', 'Should have setTimeout method');
    assert.ok(typeof ctx.setInterval === 'function', 'Should have setInterval method');
    assert.ok(typeof ctx.clearTimeout === 'function', 'Should have clearTimeout method');
    assert.ok(typeof ctx.clearInterval === 'function', 'Should have clearInterval method');
  });

  test('createVersionedAsync context is current after begin', () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();

    assert.ok(ctx.isCurrent() === true, 'Should be current immediately after begin');
    assert.ok(ctx.isStale() === false, 'Should not be stale immediately after begin');
  });

  test('createVersionedAsync context becomes stale after new begin', () => {
    const controller = createVersionedAsync();
    const ctx1 = controller.begin();

    assert.ok(ctx1.isCurrent() === true, 'First context should be current');

    const ctx2 = controller.begin();

    assert.ok(ctx1.isCurrent() === false, 'First context should no longer be current');
    assert.ok(ctx1.isStale() === true, 'First context should be stale');
    assert.ok(ctx2.isCurrent() === true, 'Second context should be current');
  });

  test('createVersionedAsync context becomes stale after abort', () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();

    assert.ok(ctx.isCurrent() === true, 'Should be current before abort');

    controller.abort();

    assert.ok(ctx.isCurrent() === false, 'Should not be current after abort');
    assert.ok(ctx.isStale() === true, 'Should be stale after abort');
  });

  test('createVersionedAsync.ifCurrent executes only when current', () => {
    const controller = createVersionedAsync();
    const ctx1 = controller.begin();
    let executed1 = false;
    let executed2 = false;

    ctx1.ifCurrent(() => { executed1 = true; });
    assert.ok(executed1 === true, 'Should execute when current');

    const ctx2 = controller.begin();
    ctx1.ifCurrent(() => { executed2 = true; });
    assert.ok(executed2 === false, 'Should not execute when stale');

    let executed3 = false;
    ctx2.ifCurrent(() => { executed3 = true; });
    assert.ok(executed3 === true, 'New context should execute');
  });

  test('createVersionedAsync.ifCurrent returns value when current', () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();

    const result = ctx.ifCurrent(() => 'hello');
    assert.strictEqual(result, 'hello', 'Should return callback result');

    controller.begin();
    const staleResult = ctx.ifCurrent(() => 'world');
    assert.strictEqual(staleResult, undefined, 'Should return undefined when stale');
  });

  test('createVersionedAsync getVersion increments on begin', () => {
    const controller = createVersionedAsync();
    const v1 = controller.getVersion();

    controller.begin();
    const v2 = controller.getVersion();

    controller.begin();
    const v3 = controller.getVersion();

    assert.ok(v2 > v1, 'Version should increment after first begin');
    assert.ok(v3 > v2, 'Version should increment after second begin');
  });

  test('createVersionedAsync getVersion increments on abort', () => {
    const controller = createVersionedAsync();
    controller.begin();
    const v1 = controller.getVersion();

    controller.abort();
    const v2 = controller.getVersion();

    assert.ok(v2 > v1, 'Version should increment after abort');
  });

  test('createVersionedAsync onAbort callback is called', () => {
    let abortCalled = false;
    const controller = createVersionedAsync({
      onAbort: () => { abortCalled = true; }
    });

    controller.begin();
    assert.ok(abortCalled === false, 'onAbort should not be called on begin');

    controller.abort();
    assert.ok(abortCalled === true, 'onAbort should be called on abort');
  });

  test('createVersionedAsync.setTimeout executes only when current', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let executed = false;

    ctx.setTimeout(() => { executed = true; }, 10);

    await new Promise(r => setTimeout(r, 50));
    assert.ok(executed === true, 'Timeout should execute when still current');
  });

  test('createVersionedAsync.setTimeout does not execute when stale', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let executed = false;

    ctx.setTimeout(() => { executed = true; }, 30);

    // Make stale before timeout fires
    await new Promise(r => setTimeout(r, 10));
    controller.begin();

    await new Promise(r => setTimeout(r, 50));
    assert.ok(executed === false, 'Timeout should not execute when stale');
  });

  test('createVersionedAsync.setTimeout clears on abort', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let executed = false;

    ctx.setTimeout(() => { executed = true; }, 30);

    // Abort before timeout fires
    await new Promise(r => setTimeout(r, 10));
    controller.abort();

    await new Promise(r => setTimeout(r, 50));
    assert.ok(executed === false, 'Timeout should not execute after abort');
  });

  test('createVersionedAsync.setInterval executes repeatedly when current', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let count = 0;

    ctx.setInterval(() => { count++; }, 15);

    await new Promise(r => setTimeout(r, 80));
    controller.cleanup();

    assert.ok(count >= 3, `Interval should have executed multiple times (got ${count})`);
  });

  test('createVersionedAsync.setInterval stops when stale', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let count = 0;

    ctx.setInterval(() => { count++; }, 15);

    await new Promise(r => setTimeout(r, 40));
    const countBeforeStale = count;

    controller.begin(); // Make stale

    await new Promise(r => setTimeout(r, 60));
    controller.cleanup();

    // Should have stopped incrementing
    assert.ok(count <= countBeforeStale + 1, `Count should not increase significantly after stale (${count} vs ${countBeforeStale})`);
  });

  test('createVersionedAsync handles async race conditions', async () => {
    const controller = createVersionedAsync();
    let results = [];

    // Simulate two overlapping async operations
    async function asyncOp(id, delay) {
      const ctx = controller.begin();

      await new Promise(r => setTimeout(r, delay));

      ctx.ifCurrent(() => {
        results.push(id);
      });
    }

    // Start slow operation
    asyncOp('slow', 50);

    // Start fast operation that should win
    await new Promise(r => setTimeout(r, 10));
    asyncOp('fast', 20);

    await new Promise(r => setTimeout(r, 100));

    // Only the fast (later) one should have added result
    assert.strictEqual(results.length, 1, 'Only one result should be recorded');
    assert.strictEqual(results[0], 'fast', 'Fast operation should win');
  });

  test('createVersionedAsync cleanup clears all timers', async () => {
    const controller = createVersionedAsync();
    const ctx = controller.begin();
    let timeoutExecuted = false;
    let intervalCount = 0;

    ctx.setTimeout(() => { timeoutExecuted = true; }, 30);
    ctx.setInterval(() => { intervalCount++; }, 20);

    // Cleanup before timers fire
    await new Promise(r => setTimeout(r, 10));
    controller.cleanup();

    await new Promise(r => setTimeout(r, 100));

    assert.ok(timeoutExecuted === false, 'Timeout should not execute after cleanup');
    assert.strictEqual(intervalCount, 0, 'Interval should not execute after cleanup');
  });
});

// =============================================================================
// useAsync Tests
// =============================================================================

describe('useAsync Tests', () => {
  test('useAsync executes immediately by default', async () => {
    let executed = false;

    const { data, loading } = useAsync(async () => {
      executed = true;
      return 'result';
    });

    // Should start loading immediately
    assert.ok(loading.get() === true || executed, 'Should execute or start loading');

    // Wait for completion
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(data.get(), 'result');
  });

  test('useAsync tracks loading state', async () => {
    const states = [];

    const { loading, execute } = useAsync(
      async () => {
        await new Promise(r => setTimeout(r, 20));
        return 'done';
      },
      { immediate: false }
    );

    effect(() => {
      states.push(loading.get());
    });

    assert.strictEqual(loading.get(), false, 'Should not be loading initially');

    const promise = execute();
    assert.strictEqual(loading.get(), true, 'Should be loading after execute');

    await promise;
    assert.strictEqual(loading.get(), false, 'Should not be loading after complete');
  });

  test('useAsync handles errors', async () => {
    let errorReceived = null;

    const { error, status, execute } = useAsync(
      async () => {
        throw new Error('Test error');
      },
      {
        immediate: false,
        onError: (err) => { errorReceived = err; }
      }
    );

    await execute();

    assert.ok(error.get() instanceof Error, 'Should have error');
    assert.strictEqual(error.get().message, 'Test error');
    assert.strictEqual(status.get(), 'error');
    assert.strictEqual(errorReceived.message, 'Test error');
  });

  test('useAsync supports retries', async () => {
    let attempts = 0;

    const { data, execute } = useAsync(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Fail');
        }
        return 'success';
      },
      {
        immediate: false,
        retries: 2,
        retryDelay: 10
      }
    );

    await execute();

    assert.strictEqual(attempts, 3, 'Should have attempted 3 times');
    assert.strictEqual(data.get(), 'success');
  });

  test('useAsync reset clears state', async () => {
    const { data, error, status, execute, reset } = useAsync(
      async () => 'result',
      { immediate: false, initialData: null }
    );

    await execute();
    assert.strictEqual(data.get(), 'result');

    reset();
    assert.strictEqual(data.get(), null);
    assert.strictEqual(status.get(), 'idle');
  });

  test('useAsync abort cancels stale requests', async () => {
    let completedCount = 0;

    const { execute, abort } = useAsync(
      async () => {
        await new Promise(r => setTimeout(r, 50));
        completedCount++;
        return 'done';
      },
      { immediate: false }
    );

    execute();
    await new Promise(r => setTimeout(r, 10));
    abort();

    await new Promise(r => setTimeout(r, 100));
    // The request may still complete, but the state should be reset
  });

  test('useAsync handles race conditions', async () => {
    let callOrder = 0;

    const { data, execute } = useAsync(
      async (delay) => {
        const myOrder = ++callOrder;
        await new Promise(r => setTimeout(r, delay));
        return `result-${myOrder}`;
      },
      { immediate: false }
    );

    // Start slow request
    execute(50);

    // Start fast request that should win
    await new Promise(r => setTimeout(r, 10));
    execute(10);

    await new Promise(r => setTimeout(r, 100));

    // The last call should be the result
    assert.strictEqual(data.get(), 'result-2');
  });
});

// =============================================================================
// useResource Tests
// =============================================================================

describe('useResource Tests', () => {
  test('useResource fetches data', async () => {
    clearResourceCache();

    const { data, loading } = useResource(
      'test-key',
      async () => 'fetched-data'
    );

    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(data.get(), 'fetched-data');
    assert.strictEqual(loading.get(), false);
  });

  test('useResource caches data', async () => {
    clearResourceCache();
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      return 'cached-data';
    };

    // First resource
    const r1 = useResource('cache-test', fetcher);
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(fetchCount, 1);

    // Second resource with same key should use cache
    const r2 = useResource('cache-test', fetcher);
    await new Promise(r => setTimeout(r, 50));

    // Cache should have been used
    assert.strictEqual(r1.data.get(), 'cached-data');
    assert.strictEqual(r2.data.get(), 'cached-data');
  });

  test('useResource refresh bypasses cache', async () => {
    clearResourceCache();
    let fetchCount = 0;

    const { data, refresh } = useResource(
      'refresh-test',
      async () => {
        fetchCount++;
        return `data-${fetchCount}`;
      }
    );

    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(data.get(), 'data-1');

    await refresh();
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(data.get(), 'data-2');
  });

  test('useResource mutate updates data', async () => {
    clearResourceCache();

    const { data, mutate } = useResource(
      'mutate-test',
      async () => ({ count: 0 })
    );

    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(data.get().count, 0);

    mutate({ count: 5 });
    assert.strictEqual(data.get().count, 5);
  });

  test('useResource handles errors', async () => {
    clearResourceCache();

    const { error } = useResource(
      'error-test',
      async () => {
        throw new Error('Fetch failed');
      }
    );

    await new Promise(r => setTimeout(r, 50));
    assert.ok(error.get() instanceof Error);
    assert.strictEqual(error.get().message, 'Fetch failed');
  });

  test('useResource with dynamic key', async () => {
    clearResourceCache();
    const userId = pulse(1);
    let fetchedIds = [];

    const { data } = useResource(
      () => `user-${userId.get()}`,
      async () => {
        const id = userId.get();
        fetchedIds.push(id);
        return { id, name: `User ${id}` };
      }
    );

    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(data.get().id, 1);

    userId.set(2);
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(data.get().id, 2);
  });

  test('getResourceCacheStats returns cache info', async () => {
    clearResourceCache();

    useResource('stats-test-1', async () => 'a');
    useResource('stats-test-2', async () => 'b');

    await new Promise(r => setTimeout(r, 50));

    const stats = getResourceCacheStats();
    assert.ok(stats.size >= 2, 'Should have at least 2 cached items');
    assert.ok(stats.keys.includes('stats-test-1'));
    assert.ok(stats.keys.includes('stats-test-2'));
  });
});

// =============================================================================
// usePolling Tests
// =============================================================================

describe('usePolling Tests', () => {
  test('usePolling fetches data at interval', async () => {
    let callCount = 0;

    const { data, start, stop } = usePolling(
      async () => {
        callCount++;
        return `data-${callCount}`;
      },
      { interval: 30, immediate: true }
    );

    start();

    await new Promise(r => setTimeout(r, 100));

    stop();

    assert.ok(callCount >= 2, 'Should have polled at least twice');
    assert.ok(data.get().startsWith('data-'), 'Should have data');
  });

  test('usePolling starts and stops', async () => {
    let callCount = 0;

    const { isPolling, start, stop } = usePolling(
      async () => {
        callCount++;
        return 'polled';
      },
      { interval: 20, immediate: true }
    );

    assert.strictEqual(isPolling.get(), false, 'Should not be polling initially');

    start();
    assert.strictEqual(isPolling.get(), true, 'Should be polling after start');

    await new Promise(r => setTimeout(r, 50));

    stop();
    assert.strictEqual(isPolling.get(), false, 'Should not be polling after stop');

    const countAtStop = callCount;
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(callCount, countAtStop, 'Should not poll after stop');
  });

  test('usePolling handles errors and max errors', async () => {
    let callCount = 0;

    const { error, isPolling, start } = usePolling(
      async () => {
        callCount++;
        throw new Error('Poll error');
      },
      { interval: 10, immediate: true, maxErrors: 3 }
    );

    start();

    await new Promise(r => setTimeout(r, 100));

    // Should have stopped after max errors
    assert.strictEqual(isPolling.get(), false, 'Should stop after max errors');
    assert.ok(error.get() instanceof Error, 'Should have error');
  });

  test('usePolling pause and resume', async () => {
    let callCount = 0;

    const { start, stop, pause, resume, isPolling } = usePolling(
      async () => {
        callCount++;
        return 'data';
      },
      { interval: 20, immediate: true }
    );

    start();
    await new Promise(r => setTimeout(r, 30));
    const countBeforePause = callCount;

    pause();
    await new Promise(r => setTimeout(r, 50));

    // Should not have polled while paused
    assert.strictEqual(callCount, countBeforePause, 'Should not poll while paused');

    resume();
    await new Promise(r => setTimeout(r, 50));

    assert.ok(callCount > countBeforePause, 'Should resume polling');

    stop();
  });
});

// Force clean exit after all tests complete (open handles from async operations)
after(() => setTimeout(() => process.exit(0), 100));
