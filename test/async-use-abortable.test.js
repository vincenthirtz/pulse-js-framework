/**
 * useAbortable() Tests
 *
 * Covers the new high-level race-condition-safe async hook.
 * Tests: basic execution, race-condition cancellation, abort(), error handling,
 * callbacks (onSuccess/onError), reactive signals, and cleanup.
 *
 * @module test/async-use-abortable
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import { useAbortable } from '../runtime/async.js';
import { pulse, effect } from '../runtime/pulse.js';

// ============================================================================
// Helpers
// ============================================================================

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function makeDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// ============================================================================
// Basic execution
// ============================================================================

describe('useAbortable - basic execution', () => {
  test('executes async function and resolves data signal', async () => {
    const hook = useAbortable(async () => 42);
    await hook.execute();
    assert.strictEqual(hook.data.get(), 42);
    assert.strictEqual(hook.isExecuting.get(), false);
    assert.strictEqual(hook.error.get(), null);
  });

  test('passes arguments to the wrapped function', async () => {
    const hook = useAbortable(async (a, b) => a + b);
    const result = await hook.execute(10, 5);
    assert.strictEqual(result, 15);
    assert.strictEqual(hook.data.get(), 15);
  });

  test('initial data is null by default', () => {
    const hook = useAbortable(async () => 'x');
    assert.strictEqual(hook.data.get(), null);
  });

  test('initial data respects options.initial', () => {
    const hook = useAbortable(async () => 'x', { initial: [] });
    assert.deepStrictEqual(hook.data.get(), []);
  });

  test('isExecuting is true while running and false after', async () => {
    const states = [];
    let resolveOuter;
    const waitForIt = new Promise(r => { resolveOuter = r; });

    const hook = useAbortable(async () => {
      await delay(10);
      return 'done';
    });

    const stop = effect(() => states.push(hook.isExecuting.get()));
    const p = hook.execute();
    // Give the effect a tick to see isExecuting=true
    await delay(5);
    await p;
    stop();

    assert.ok(states.includes(true),  'isExecuting should have been true during execution');
    assert.strictEqual(states.at(-1), false, 'isExecuting should end as false');
  });

  test('getVersion returns a number', () => {
    const hook = useAbortable(async () => {});
    assert.strictEqual(typeof hook.getVersion(), 'number');
  });

  test('getVersion increments after each execute()', async () => {
    const hook = useAbortable(async () => {});
    const v0 = hook.getVersion();
    await hook.execute();
    const v1 = hook.getVersion();
    assert.ok(v1 > v0, 'version should increment after execute');
  });
});

// ============================================================================
// Race condition prevention
// ============================================================================

describe('useAbortable - race condition prevention', () => {
  test('second execute cancels first — only latest data wins', async () => {
    const deferred1 = makeDeferred();
    const deferred2 = makeDeferred();
    let call = 0;

    const hook = useAbortable(async () => {
      const id = ++call;
      if (id === 1) {
        await deferred1.promise;
        return 'stale';
      }
      await deferred2.promise;
      return 'fresh';
    });

    const p1 = hook.execute(); // starts call 1
    const p2 = hook.execute(); // starts call 2, cancels call 1

    deferred2.resolve();
    await p2;

    // Resolve call 1 after call 2 is done — its result should be ignored
    deferred1.resolve();
    try { await p1; } catch { /* cancelled */ }

    assert.strictEqual(hook.data.get(), 'fresh');
  });

  test('error from stale execution does not update error signal', async () => {
    const deferred1 = makeDeferred();
    let call = 0;

    const hook = useAbortable(async () => {
      const id = ++call;
      if (id === 1) {
        await deferred1.promise;
        throw new Error('stale error');
      }
      return 'ok';
    });

    const p1 = hook.execute(); // stale call
    await hook.execute();      // fresh call resolves cleanly

    // Reject call 1 after call 2 succeeded — error should not propagate
    deferred1.reject(new Error('stale error'));
    try { await p1; } catch { /* expected */ }

    assert.strictEqual(hook.error.get(), null);
    assert.strictEqual(hook.data.get(), 'ok');
  });

  test('data from stale execution does not overwrite fresh data', async () => {
    const deferred1 = makeDeferred();
    const deferred2 = makeDeferred();
    let call = 0;

    const hook = useAbortable(async () => {
      const id = ++call;
      await (id === 1 ? deferred1.promise : deferred2.promise);
      return `result-${id}`;
    });

    const p1 = hook.execute();
    const p2 = hook.execute();

    // Resolve fresh first, then stale
    deferred2.resolve();
    await p2;

    deferred1.resolve();
    try { await p1; } catch { /* stale */ }

    assert.strictEqual(hook.data.get(), 'result-2');
  });
});

// ============================================================================
// abort()
// ============================================================================

describe('useAbortable - abort()', () => {
  test('abort() clears isExecuting', async () => {
    const deferred = makeDeferred();
    const hook = useAbortable(async () => deferred.promise);

    hook.execute(); // don't await
    await delay(0);
    assert.strictEqual(hook.isExecuting.get(), true);

    hook.abort();
    assert.strictEqual(hook.isExecuting.get(), false);

    deferred.resolve(); // cleanup
  });

  test('abort() increments version', () => {
    const hook = useAbortable(async () => {});
    const v0 = hook.getVersion();
    hook.abort();
    assert.ok(hook.getVersion() > v0);
  });

  test('calling abort() before execute() does not throw', () => {
    const hook = useAbortable(async () => 'x');
    assert.doesNotThrow(() => hook.abort());
  });

  test('execute() after abort() works normally', async () => {
    const hook = useAbortable(async () => 99);
    hook.abort();
    await hook.execute();
    assert.strictEqual(hook.data.get(), 99);
  });
});

// ============================================================================
// Error handling
// ============================================================================

describe('useAbortable - error handling', () => {
  test('sets error signal on rejection', async () => {
    const hook = useAbortable(async () => {
      throw new Error('boom');
    });

    await assert.rejects(() => hook.execute(), /boom/);
    assert.ok(hook.error.get() instanceof Error);
    assert.strictEqual(hook.error.get().message, 'boom');
    assert.strictEqual(hook.isExecuting.get(), false);
  });

  test('clears error signal before each execution', async () => {
    let fail = true;
    const hook = useAbortable(async () => {
      if (fail) throw new Error('fail');
      return 'ok';
    });

    await assert.rejects(() => hook.execute());
    assert.ok(hook.error.get());

    fail = false;
    await hook.execute();
    assert.strictEqual(hook.error.get(), null);
    assert.strictEqual(hook.data.get(), 'ok');
  });

  test('onError callback is called with the error', async () => {
    const errors = [];
    const hook = useAbortable(
      async () => { throw new Error('oops'); },
      { onError: (err) => errors.push(err) }
    );

    await assert.rejects(() => hook.execute());
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].message, 'oops');
  });
});

// ============================================================================
// onSuccess callback
// ============================================================================

describe('useAbortable - onSuccess callback', () => {
  test('onSuccess is called with the result', async () => {
    const results = [];
    const hook = useAbortable(
      async () => ({ id: 1 }),
      { onSuccess: (r) => results.push(r) }
    );

    await hook.execute();
    assert.deepStrictEqual(results, [{ id: 1 }]);
  });

  test('onSuccess is NOT called for stale executions', async () => {
    const successCalls = [];
    const deferred = makeDeferred();
    let call = 0;

    const hook = useAbortable(
      async () => {
        const id = ++call;
        if (id === 1) await deferred.promise;
        return id;
      },
      { onSuccess: (r) => successCalls.push(r) }
    );

    const p1 = hook.execute(); // stale
    await hook.execute();      // fresh → onSuccess called with 2

    deferred.resolve();
    try { await p1; } catch { /* stale */ }

    assert.deepStrictEqual(successCalls, [2]);
  });
});

// ============================================================================
// Reactive signals
// ============================================================================

describe('useAbortable - reactive signals', () => {
  test('data signal notifies subscribers on update', async () => {
    const values = [];
    const hook = useAbortable(async (n) => n * 2);
    const stop = effect(() => values.push(hook.data.get()));

    await hook.execute(3);
    await hook.execute(5);

    stop();
    assert.ok(values.includes(6));
    assert.ok(values.includes(10));
  });

  test('error signal notifies subscribers on error', async () => {
    const errors = [];
    const hook = useAbortable(async () => { throw new Error('err'); });
    const stop = effect(() => errors.push(hook.error.get()));

    await assert.rejects(() => hook.execute());
    stop();

    assert.ok(errors.some(e => e !== null));
  });
});

// ============================================================================
// Exposes expected API shape
// ============================================================================

describe('useAbortable - API shape', () => {
  test('returns the expected properties', () => {
    const hook = useAbortable(async () => {});
    assert.strictEqual(typeof hook.execute, 'function');
    assert.strictEqual(typeof hook.abort, 'function');
    assert.strictEqual(typeof hook.getVersion, 'function');
    assert.ok(hook.isExecuting);
    assert.ok(hook.data);
    assert.ok(hook.error);
  });
});
