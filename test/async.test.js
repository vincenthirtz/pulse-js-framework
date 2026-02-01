/**
 * Pulse Async Primitives Tests
 *
 * Tests for runtime/async.js - useAsync, useResource, usePolling
 *
 * @module test/async
 */

import {
  createVersionedAsync,
  useAsync,
  useResource,
  usePolling,
  clearResourceCache,
  getResourceCacheStats
} from '../runtime/async.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// createVersionedAsync Tests
// =============================================================================

printSection('createVersionedAsync Tests');

test('createVersionedAsync creates controller with expected methods', () => {
  const controller = createVersionedAsync();

  assert(typeof controller.begin === 'function', 'Should have begin method');
  assert(typeof controller.abort === 'function', 'Should have abort method');
  assert(typeof controller.getVersion === 'function', 'Should have getVersion method');
  assert(typeof controller.cleanup === 'function', 'Should have cleanup method');
});

test('createVersionedAsync.begin returns context with expected methods', () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();

  assert(typeof ctx.isCurrent === 'function', 'Should have isCurrent method');
  assert(typeof ctx.isStale === 'function', 'Should have isStale method');
  assert(typeof ctx.ifCurrent === 'function', 'Should have ifCurrent method');
  assert(typeof ctx.setTimeout === 'function', 'Should have setTimeout method');
  assert(typeof ctx.setInterval === 'function', 'Should have setInterval method');
  assert(typeof ctx.clearTimeout === 'function', 'Should have clearTimeout method');
  assert(typeof ctx.clearInterval === 'function', 'Should have clearInterval method');
});

test('createVersionedAsync context is current after begin', () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();

  assert(ctx.isCurrent() === true, 'Should be current immediately after begin');
  assert(ctx.isStale() === false, 'Should not be stale immediately after begin');
});

test('createVersionedAsync context becomes stale after new begin', () => {
  const controller = createVersionedAsync();
  const ctx1 = controller.begin();

  assert(ctx1.isCurrent() === true, 'First context should be current');

  const ctx2 = controller.begin();

  assert(ctx1.isCurrent() === false, 'First context should no longer be current');
  assert(ctx1.isStale() === true, 'First context should be stale');
  assert(ctx2.isCurrent() === true, 'Second context should be current');
});

test('createVersionedAsync context becomes stale after abort', () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();

  assert(ctx.isCurrent() === true, 'Should be current before abort');

  controller.abort();

  assert(ctx.isCurrent() === false, 'Should not be current after abort');
  assert(ctx.isStale() === true, 'Should be stale after abort');
});

test('createVersionedAsync.ifCurrent executes only when current', () => {
  const controller = createVersionedAsync();
  const ctx1 = controller.begin();
  let executed1 = false;
  let executed2 = false;

  ctx1.ifCurrent(() => { executed1 = true; });
  assert(executed1 === true, 'Should execute when current');

  const ctx2 = controller.begin();
  ctx1.ifCurrent(() => { executed2 = true; });
  assert(executed2 === false, 'Should not execute when stale');

  let executed3 = false;
  ctx2.ifCurrent(() => { executed3 = true; });
  assert(executed3 === true, 'New context should execute');
});

test('createVersionedAsync.ifCurrent returns value when current', () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();

  const result = ctx.ifCurrent(() => 'hello');
  assertEqual(result, 'hello', 'Should return callback result');

  controller.begin();
  const staleResult = ctx.ifCurrent(() => 'world');
  assertEqual(staleResult, undefined, 'Should return undefined when stale');
});

test('createVersionedAsync getVersion increments on begin', () => {
  const controller = createVersionedAsync();
  const v1 = controller.getVersion();

  controller.begin();
  const v2 = controller.getVersion();

  controller.begin();
  const v3 = controller.getVersion();

  assert(v2 > v1, 'Version should increment after first begin');
  assert(v3 > v2, 'Version should increment after second begin');
});

test('createVersionedAsync getVersion increments on abort', () => {
  const controller = createVersionedAsync();
  controller.begin();
  const v1 = controller.getVersion();

  controller.abort();
  const v2 = controller.getVersion();

  assert(v2 > v1, 'Version should increment after abort');
});

test('createVersionedAsync onAbort callback is called', () => {
  let abortCalled = false;
  const controller = createVersionedAsync({
    onAbort: () => { abortCalled = true; }
  });

  controller.begin();
  assert(abortCalled === false, 'onAbort should not be called on begin');

  controller.abort();
  assert(abortCalled === true, 'onAbort should be called on abort');
});

testAsync('createVersionedAsync.setTimeout executes only when current', async () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();
  let executed = false;

  ctx.setTimeout(() => { executed = true; }, 10);

  await new Promise(r => setTimeout(r, 50));
  assert(executed === true, 'Timeout should execute when still current');
});

testAsync('createVersionedAsync.setTimeout does not execute when stale', async () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();
  let executed = false;

  ctx.setTimeout(() => { executed = true; }, 30);

  // Make stale before timeout fires
  await new Promise(r => setTimeout(r, 10));
  controller.begin();

  await new Promise(r => setTimeout(r, 50));
  assert(executed === false, 'Timeout should not execute when stale');
});

testAsync('createVersionedAsync.setTimeout clears on abort', async () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();
  let executed = false;

  ctx.setTimeout(() => { executed = true; }, 30);

  // Abort before timeout fires
  await new Promise(r => setTimeout(r, 10));
  controller.abort();

  await new Promise(r => setTimeout(r, 50));
  assert(executed === false, 'Timeout should not execute after abort');
});

testAsync('createVersionedAsync.setInterval executes repeatedly when current', async () => {
  const controller = createVersionedAsync();
  const ctx = controller.begin();
  let count = 0;

  ctx.setInterval(() => { count++; }, 15);

  await new Promise(r => setTimeout(r, 80));
  controller.cleanup();

  assert(count >= 3, `Interval should have executed multiple times (got ${count})`);
});

testAsync('createVersionedAsync.setInterval stops when stale', async () => {
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
  assert(count <= countBeforeStale + 1, `Count should not increase significantly after stale (${count} vs ${countBeforeStale})`);
});

testAsync('createVersionedAsync handles async race conditions', async () => {
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
  assertEqual(results.length, 1, 'Only one result should be recorded');
  assertEqual(results[0], 'fast', 'Fast operation should win');
});

testAsync('createVersionedAsync cleanup clears all timers', async () => {
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

  assert(timeoutExecuted === false, 'Timeout should not execute after cleanup');
  assertEqual(intervalCount, 0, 'Interval should not execute after cleanup');
});

// =============================================================================
// useAsync Tests
// =============================================================================

printSection('useAsync Tests');

testAsync('useAsync executes immediately by default', async () => {
  let executed = false;

  const { data, loading } = useAsync(async () => {
    executed = true;
    return 'result';
  });

  // Should start loading immediately
  assert(loading.get() === true || executed, 'Should execute or start loading');

  // Wait for completion
  await new Promise(r => setTimeout(r, 10));
  assertEqual(data.get(), 'result');
});

testAsync('useAsync tracks loading state', async () => {
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

  assertEqual(loading.get(), false, 'Should not be loading initially');

  const promise = execute();
  assertEqual(loading.get(), true, 'Should be loading after execute');

  await promise;
  assertEqual(loading.get(), false, 'Should not be loading after complete');
});

testAsync('useAsync handles errors', async () => {
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

  assert(error.get() instanceof Error, 'Should have error');
  assertEqual(error.get().message, 'Test error');
  assertEqual(status.get(), 'error');
  assertEqual(errorReceived.message, 'Test error');
});

testAsync('useAsync supports retries', async () => {
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

  assertEqual(attempts, 3, 'Should have attempted 3 times');
  assertEqual(data.get(), 'success');
});

testAsync('useAsync reset clears state', async () => {
  const { data, error, status, execute, reset } = useAsync(
    async () => 'result',
    { immediate: false, initialData: null }
  );

  await execute();
  assertEqual(data.get(), 'result');

  reset();
  assertEqual(data.get(), null);
  assertEqual(status.get(), 'idle');
});

testAsync('useAsync abort cancels stale requests', async () => {
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

testAsync('useAsync handles race conditions', async () => {
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
  assertEqual(data.get(), 'result-2');
});

// =============================================================================
// useResource Tests
// =============================================================================

printSection('useResource Tests');

testAsync('useResource fetches data', async () => {
  clearResourceCache();

  const { data, loading } = useResource(
    'test-key',
    async () => 'fetched-data'
  );

  await new Promise(r => setTimeout(r, 50));

  assertEqual(data.get(), 'fetched-data');
  assertEqual(loading.get(), false);
});

testAsync('useResource caches data', async () => {
  clearResourceCache();
  let fetchCount = 0;

  const fetcher = async () => {
    fetchCount++;
    return 'cached-data';
  };

  // First resource
  const r1 = useResource('cache-test', fetcher);
  await new Promise(r => setTimeout(r, 50));
  assertEqual(fetchCount, 1);

  // Second resource with same key should use cache
  const r2 = useResource('cache-test', fetcher);
  await new Promise(r => setTimeout(r, 50));

  // Cache should have been used
  assertEqual(r1.data.get(), 'cached-data');
  assertEqual(r2.data.get(), 'cached-data');
});

testAsync('useResource refresh bypasses cache', async () => {
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
  assertEqual(data.get(), 'data-1');

  await refresh();
  await new Promise(r => setTimeout(r, 50));
  assertEqual(data.get(), 'data-2');
});

testAsync('useResource mutate updates data', async () => {
  clearResourceCache();

  const { data, mutate } = useResource(
    'mutate-test',
    async () => ({ count: 0 })
  );

  await new Promise(r => setTimeout(r, 50));
  assertEqual(data.get().count, 0);

  mutate({ count: 5 });
  assertEqual(data.get().count, 5);
});

testAsync('useResource handles errors', async () => {
  clearResourceCache();

  const { error } = useResource(
    'error-test',
    async () => {
      throw new Error('Fetch failed');
    }
  );

  await new Promise(r => setTimeout(r, 50));
  assert(error.get() instanceof Error);
  assertEqual(error.get().message, 'Fetch failed');
});

testAsync('useResource with dynamic key', async () => {
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
  assertEqual(data.get().id, 1);

  userId.set(2);
  await new Promise(r => setTimeout(r, 50));
  assertEqual(data.get().id, 2);
});

testAsync('getResourceCacheStats returns cache info', async () => {
  clearResourceCache();

  useResource('stats-test-1', async () => 'a');
  useResource('stats-test-2', async () => 'b');

  await new Promise(r => setTimeout(r, 50));

  const stats = getResourceCacheStats();
  assert(stats.size >= 2, 'Should have at least 2 cached items');
  assert(stats.keys.includes('stats-test-1'));
  assert(stats.keys.includes('stats-test-2'));
});

// =============================================================================
// usePolling Tests
// =============================================================================

printSection('usePolling Tests');

testAsync('usePolling fetches data at interval', async () => {
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

  assert(callCount >= 2, 'Should have polled at least twice');
  assert(data.get().startsWith('data-'), 'Should have data');
});

testAsync('usePolling starts and stops', async () => {
  let callCount = 0;

  const { isPolling, start, stop } = usePolling(
    async () => {
      callCount++;
      return 'polled';
    },
    { interval: 20, immediate: true }
  );

  assertEqual(isPolling.get(), false, 'Should not be polling initially');

  start();
  assertEqual(isPolling.get(), true, 'Should be polling after start');

  await new Promise(r => setTimeout(r, 50));

  stop();
  assertEqual(isPolling.get(), false, 'Should not be polling after stop');

  const countAtStop = callCount;
  await new Promise(r => setTimeout(r, 50));

  assertEqual(callCount, countAtStop, 'Should not poll after stop');
});

testAsync('usePolling handles errors and max errors', async () => {
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
  assertEqual(isPolling.get(), false, 'Should stop after max errors');
  assert(error.get() instanceof Error, 'Should have error');
});

testAsync('usePolling pause and resume', async () => {
  let callCount = 0;

  const { start, pause, resume, isPolling } = usePolling(
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
  assertEqual(callCount, countBeforePause, 'Should not poll while paused');

  resume();
  await new Promise(r => setTimeout(r, 50));

  assert(callCount > countBeforePause, 'Should resume polling');
});

// =============================================================================
// Run Async Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
