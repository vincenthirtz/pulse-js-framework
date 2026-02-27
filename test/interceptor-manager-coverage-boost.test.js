/**
 * Interceptor Manager Coverage Boost Tests
 *
 * Targets uncovered lines 103-104, 111-112, 129-130, 141-158, 166-183,
 * 207-208, 219-221, 227-229 to push coverage from 79% to 92%+.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  InterceptorManager,
  MessageInterceptorManager,
  createRequestInterceptors,
  createMessageInterceptors
} from '../runtime/interceptor-manager.js';

// ============================================================================
// isEmpty getter (lines 102-104)
// ============================================================================

describe('isEmpty getter - both branches', () => {
  test('isEmpty returns true on a freshly constructed manager', () => {
    const manager = new InterceptorManager();
    // Branch: handlers.size === 0 → true
    assert.strictEqual(manager.isEmpty, true);
  });

  test('isEmpty returns false after use() registers a handler', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    // Branch: handlers.size !== 0 → false
    assert.strictEqual(manager.isEmpty, false);
  });

  test('isEmpty returns true again after clear()', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    manager.use((v) => v);
    assert.strictEqual(manager.isEmpty, false);
    manager.clear();
    // Back to the true branch
    assert.strictEqual(manager.isEmpty, true);
  });

  test('isEmpty returns true after ejecting the only handler', () => {
    const manager = new InterceptorManager();
    const id = manager.use((v) => v);
    assert.strictEqual(manager.isEmpty, false);
    manager.eject(id);
    assert.strictEqual(manager.isEmpty, true);
  });

  test('isEmpty works on custom-key manager', () => {
    const manager = new InterceptorManager({ handlerKeys: ['transform', 'fallback'] });
    assert.strictEqual(manager.isEmpty, true);
    manager.use((v) => v.toUpperCase());
    assert.strictEqual(manager.isEmpty, false);
  });
});

// ============================================================================
// ids getter (lines 110-112)
// ============================================================================

describe('ids getter - spread of handler keys', () => {
  test('ids returns an empty array when no handlers are registered', () => {
    const manager = new InterceptorManager();
    // Executes [...this.#handlers.keys()] with empty map
    const ids = manager.ids;
    assert.ok(Array.isArray(ids));
    assert.strictEqual(ids.length, 0);
  });

  test('ids returns a single-element array after one use()', () => {
    const manager = new InterceptorManager();
    const id = manager.use((v) => v);
    const ids = manager.ids;
    assert.ok(Array.isArray(ids));
    assert.strictEqual(ids.length, 1);
    assert.strictEqual(ids[0], id);
  });

  test('ids returns all ids in insertion order', () => {
    const manager = new InterceptorManager();
    const id0 = manager.use((v) => v + 'a');
    const id1 = manager.use((v) => v + 'b');
    const id2 = manager.use((v) => v + 'c');
    const ids = manager.ids;
    assert.deepStrictEqual(ids, [id0, id1, id2]);
  });

  test('ids excludes ejected handler ids', () => {
    const manager = new InterceptorManager();
    const id0 = manager.use((v) => v);
    const id1 = manager.use((v) => v);
    const id2 = manager.use((v) => v);
    manager.eject(id1);
    // id1 should no longer appear
    assert.deepStrictEqual(manager.ids, [id0, id2]);
  });

  test('ids returns empty array after clear()', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    manager.use((v) => v);
    manager.clear();
    assert.deepStrictEqual(manager.ids, []);
  });

  test('ids reflects monotonically increasing counter values', () => {
    const manager = new InterceptorManager();
    const id0 = manager.use((v) => v);
    const id1 = manager.use((v) => v);
    assert.ok(id1 > id0, 'ids should increase monotonically');
    assert.deepStrictEqual(manager.ids, [id0, id1]);
  });
});

// ============================================================================
// toArray() (lines 128-130)
// ============================================================================

describe('toArray() - spread of handler values', () => {
  test('returns an empty array when no handlers registered', () => {
    const manager = new InterceptorManager();
    // Executes [...this.#handlers.values()] on empty map
    const arr = manager.toArray();
    assert.ok(Array.isArray(arr));
    assert.strictEqual(arr.length, 0);
  });

  test('returns one element array for a single handler', () => {
    const manager = new InterceptorManager();
    const fn = (v) => v * 2;
    manager.use(fn);
    const arr = manager.toArray();
    assert.strictEqual(arr.length, 1);
    assert.strictEqual(arr[0].fulfilled, fn);
  });

  test('returns all handler objects in insertion order', () => {
    const manager = new InterceptorManager();
    const fn1 = (v) => v + 1;
    const fn2 = (v) => v + 2;
    const errFn = (e) => 'err';
    manager.use(fn1, errFn);
    manager.use(fn2);
    const arr = manager.toArray();
    assert.strictEqual(arr.length, 2);
    assert.strictEqual(arr[0].fulfilled, fn1);
    assert.strictEqual(arr[0].rejected, errFn);
    assert.strictEqual(arr[1].fulfilled, fn2);
  });

  test('toArray result is a fresh array (mutations do not affect manager)', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    const arr = manager.toArray();
    arr.push({ fulfilled: 'intruder' });
    // Manager should still report 1 handler
    assert.strictEqual(manager.size, 1);
    assert.strictEqual(manager.toArray().length, 1);
  });

  test('toArray works with custom handler keys', () => {
    const manager = new InterceptorManager({ handlerKeys: ['onMessage', 'onError'] });
    const msg = (d) => d;
    const err = (e) => null;
    manager.use(msg, err);
    const arr = manager.toArray();
    assert.strictEqual(arr[0].onMessage, msg);
    assert.strictEqual(arr[0].onError, err);
    assert.strictEqual(arr[0].fulfilled, undefined);
  });
});

// ============================================================================
// run() async pipeline (lines 140-158)
// ============================================================================

describe('run() async pipeline - full branch coverage', () => {
  test('returns initial value unchanged when no interceptors registered', async () => {
    const manager = new InterceptorManager();
    // Loop body never entered; result stays as value
    const result = await manager.run('initial');
    assert.strictEqual(result, 'initial');
  });

  test('passes value through a single synchronous primary handler', async () => {
    const manager = new InterceptorManager();
    manager.use((v) => v * 10);
    const result = await manager.run(3);
    assert.strictEqual(result, 30);
  });

  test('chains multiple synchronous primary handlers in registration order', async () => {
    const manager = new InterceptorManager();
    manager.use((v) => v + 1);  // 0 → 1
    manager.use((v) => v * 4);  // 1 → 4
    manager.use((v) => v - 1);  // 4 → 3
    const result = await manager.run(0);
    assert.strictEqual(result, 3);
  });

  test('awaits async primary handlers', async () => {
    const manager = new InterceptorManager();
    manager.use((v) => Promise.resolve(v + ' async'));
    const result = await manager.run('hello');
    assert.strictEqual(result, 'hello async');
  });

  test('chains async and sync primary handlers together', async () => {
    const manager = new InterceptorManager();
    manager.use(async (v) => v + 1);  // async
    manager.use((v) => v * 2);        // sync
    const result = await manager.run(4);
    assert.strictEqual(result, 10);   // (4+1)*2
  });

  // Branch: primary throws AND secondary IS a function (line 150-151)
  test('calls secondary handler when primary throws and secondary is a function', async () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('oops'); },
      (err) => `recovered: ${err.message}`
    );
    const result = await manager.run('start');
    assert.strictEqual(result, 'recovered: oops');
  });

  // Branch: secondary is async function (still line 151, await errorFn(error))
  test('awaits async secondary handler when primary throws', async () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('async oops'); },
      async (err) => Promise.resolve(`async-recovered: ${err.message}`)
    );
    const result = await manager.run('start');
    assert.strictEqual(result, 'async-recovered: async oops');
  });

  // Branch: primary throws AND secondary is NOT a function (line 153 - throw error)
  test('re-throws error when primary throws and no secondary handler provided', async () => {
    const manager = new InterceptorManager();
    // use() with only a primary; rejected will be undefined
    manager.use(() => { throw new Error('no recovery'); });
    await assert.rejects(
      () => manager.run('start'),
      (err) => {
        assert.strictEqual(err.message, 'no recovery');
        return true;
      }
    );
  });

  // Branch: secondary is null/undefined explicitly (line 153)
  test('re-throws when secondary handler is explicitly null', async () => {
    const manager = new InterceptorManager();
    manager.use(() => { throw new Error('null secondary'); }, null);
    await assert.rejects(
      () => manager.run('x'),
      { message: 'null secondary' }
    );
  });

  // Branch: primary is not a function - skip handler (lines 145-147)
  test('skips handler when primary is not a function (null)', async () => {
    const manager = new InterceptorManager();
    manager.use(null);           // non-function primary - skipped
    manager.use((v) => v + '!');
    const result = await manager.run('hi');
    assert.strictEqual(result, 'hi!');
  });

  test('skips handler when primary is undefined', async () => {
    const manager = new InterceptorManager();
    manager.use(undefined);
    manager.use((v) => v * 3);
    const result = await manager.run(2);
    assert.strictEqual(result, 6);
  });

  test('skips handler when primary is a string instead of function', async () => {
    const manager = new InterceptorManager();
    manager.use('not-a-function');
    manager.use((v) => v + 100);
    const result = await manager.run(5);
    assert.strictEqual(result, 105);
  });

  test('pipeline with mix of valid and skipped handlers processes correctly', async () => {
    const manager = new InterceptorManager();
    manager.use((v) => v + 1);  // runs: 0 → 1
    manager.use(null);           // skipped
    manager.use((v) => v + 1);  // runs: 1 → 2
    manager.use(42);             // skipped (not a function)
    manager.use((v) => v + 1);  // runs: 2 → 3
    const result = await manager.run(0);
    assert.strictEqual(result, 3);
  });

  test('recovery result feeds into the next interceptor', async () => {
    const manager = new InterceptorManager();
    // First interceptor fails and recovers to 'fallback'
    manager.use(
      () => { throw new Error('fail'); },
      () => 'fallback'
    );
    // Second interceptor appends to the recovered value
    manager.use((v) => v + '-processed');
    const result = await manager.run('original');
    assert.strictEqual(result, 'fallback-processed');
  });

  test('handles object values flowing through the async pipeline', async () => {
    const manager = new InterceptorManager();
    manager.use((obj) => ({ ...obj, step1: true }));
    manager.use((obj) => ({ ...obj, step2: true }));
    const result = await manager.run({ id: 1 });
    assert.deepStrictEqual(result, { id: 1, step1: true, step2: true });
  });
});

// ============================================================================
// runSync() sync pipeline (lines 165-183)
// ============================================================================

describe('runSync() sync pipeline - full branch coverage', () => {
  test('returns initial value unchanged when no interceptors registered', () => {
    const manager = new InterceptorManager();
    // Loop body never entered; result stays as value
    const result = manager.runSync(99);
    assert.strictEqual(result, 99);
  });

  test('passes value through a single primary handler synchronously', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v.toUpperCase());
    const result = manager.runSync('hello');
    assert.strictEqual(result, 'HELLO');
  });

  test('chains multiple sync primary handlers in registration order', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v + ' world');
    manager.use((v) => v + '!');
    manager.use((v) => v.trim());
    const result = manager.runSync('hello');
    assert.strictEqual(result, 'hello world!');
  });

  // Branch: primary throws AND secondary IS a function (line 175-176)
  test('calls secondary handler when primary throws and secondary is a function', () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('sync oops'); },
      (err) => `caught: ${err.message}`
    );
    const result = manager.runSync('start');
    assert.strictEqual(result, 'caught: sync oops');
  });

  // Branch: primary throws AND secondary is NOT a function (line 178 - throw error)
  test('re-throws error when primary throws and no secondary handler provided', () => {
    const manager = new InterceptorManager();
    manager.use(() => { throw new Error('sync no recovery'); });
    assert.throws(
      () => manager.runSync('start'),
      (err) => {
        assert.strictEqual(err.message, 'sync no recovery');
        return true;
      }
    );
  });

  // Branch: secondary is null (line 178 - throw error because typeof null !== 'function')
  test('re-throws when secondary handler is explicitly null in sync mode', () => {
    const manager = new InterceptorManager();
    manager.use(() => { throw new Error('null sec sync'); }, null);
    assert.throws(
      () => manager.runSync('x'),
      { message: 'null sec sync' }
    );
  });

  // Branch: primary is not a function - skip handler (lines 169-171)
  test('skips handler when primary is not a function (null) in sync mode', () => {
    const manager = new InterceptorManager();
    manager.use(null);
    manager.use((v) => v + ' done');
    const result = manager.runSync('test');
    assert.strictEqual(result, 'test done');
  });

  test('skips handler when primary is undefined in sync mode', () => {
    const manager = new InterceptorManager();
    manager.use(undefined);
    manager.use((v) => v * 5);
    const result = manager.runSync(3);
    assert.strictEqual(result, 15);
  });

  test('skips handler when primary is a number instead of function', () => {
    const manager = new InterceptorManager();
    manager.use(123);
    manager.use((v) => v - 1);
    const result = manager.runSync(10);
    assert.strictEqual(result, 9);
  });

  test('pipeline with mix of valid and skipped sync handlers processes correctly', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v + 10);  // runs: 0 → 10
    manager.use(null);            // skipped
    manager.use((v) => v + 10);  // runs: 10 → 20
    manager.use('string');        // skipped
    manager.use((v) => v + 10);  // runs: 20 → 30
    const result = manager.runSync(0);
    assert.strictEqual(result, 30);
  });

  test('sync recovery result feeds into the next interceptor', () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('sync fail'); },
      () => 'sync-fallback'
    );
    manager.use((v) => v + '-ok');
    const result = manager.runSync('ignored');
    assert.strictEqual(result, 'sync-fallback-ok');
  });

  test('handles object values flowing through the sync pipeline', () => {
    const manager = new InterceptorManager();
    manager.use((obj) => ({ ...obj, a: 1 }));
    manager.use((obj) => ({ ...obj, b: 2 }));
    const result = manager.runSync({});
    assert.deepStrictEqual(result, { a: 1, b: 2 });
  });

  test('sync re-throw preserves the original error instance', () => {
    const manager = new InterceptorManager();
    const original = new TypeError('type error');
    manager.use(() => { throw original; });
    try {
      manager.runSync('x');
      assert.fail('expected throw');
    } catch (err) {
      assert.strictEqual(err, original);
    }
  });

  test('async re-throw preserves the original error instance', async () => {
    const manager = new InterceptorManager();
    const original = new RangeError('range error');
    manager.use(() => { throw original; });
    try {
      await manager.run('x');
      assert.fail('expected rejection');
    } catch (err) {
      assert.strictEqual(err, original);
    }
  });
});

// ============================================================================
// MessageInterceptorManager constructor (lines 206-208)
// ============================================================================

describe('MessageInterceptorManager - constructor and super call', () => {
  test('can be instantiated without arguments', () => {
    // Exercises lines 206-208: constructor() { super({ handlerKeys: [...] }) }
    const manager = new MessageInterceptorManager();
    assert.ok(manager instanceof MessageInterceptorManager);
    assert.ok(manager instanceof InterceptorManager);
  });

  test('uses onMessage as primary key and onError as secondary key', () => {
    const manager = new MessageInterceptorManager();
    const onMsg = (data) => ({ ...data, received: true });
    const onErr = (err) => null;
    manager.use(onMsg, onErr);
    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].onMessage, onMsg);
    assert.strictEqual(handlers[0].onError, onErr);
  });

  test('primary key is onMessage (not fulfilled)', () => {
    const manager = new MessageInterceptorManager();
    manager.use((d) => d);
    const handler = manager.toArray()[0];
    assert.ok('onMessage' in handler, 'onMessage key should exist');
    assert.strictEqual(handler.fulfilled, undefined);
  });

  test('secondary key is onError (not rejected)', () => {
    const manager = new MessageInterceptorManager();
    manager.use((d) => d, (e) => e);
    const handler = manager.toArray()[0];
    assert.ok('onError' in handler, 'onError key should exist');
    assert.strictEqual(handler.rejected, undefined);
  });

  test('run() pipeline uses onMessage key for primary handler', async () => {
    const manager = new MessageInterceptorManager();
    manager.use((data) => ({ ...data, processed: true }));
    const result = await manager.run({ type: 'msg' });
    assert.deepStrictEqual(result, { type: 'msg', processed: true });
  });

  test('run() pipeline uses onError key for secondary handler on failure', async () => {
    const manager = new MessageInterceptorManager();
    manager.use(
      () => { throw new Error('ws error'); },
      (err) => ({ error: err.message, recovered: true })
    );
    const result = await manager.run({ type: 'msg' });
    assert.deepStrictEqual(result, { error: 'ws error', recovered: true });
  });

  test('runSync() pipeline uses onMessage/onError keys', () => {
    const manager = new MessageInterceptorManager();
    manager.use(
      (data) => ({ ...data, sync: true }),
      (err) => ({ error: true })
    );
    const result = manager.runSync({ id: 1 });
    assert.deepStrictEqual(result, { id: 1, sync: true });
  });

  test('isEmpty, ids, and size work correctly on MessageInterceptorManager', () => {
    const manager = new MessageInterceptorManager();
    assert.strictEqual(manager.isEmpty, true);
    assert.deepStrictEqual(manager.ids, []);
    assert.strictEqual(manager.size, 0);

    const id = manager.use((d) => d);
    assert.strictEqual(manager.isEmpty, false);
    assert.strictEqual(manager.ids.length, 1);
    assert.strictEqual(manager.size, 1);

    manager.eject(id);
    assert.strictEqual(manager.isEmpty, true);
  });
});

// ============================================================================
// createRequestInterceptors() factory (lines 219-221)
// ============================================================================

describe('createRequestInterceptors() factory function', () => {
  test('returns a new InterceptorManager instance each call', () => {
    // Exercises lines 219-221
    const mgr1 = createRequestInterceptors();
    const mgr2 = createRequestInterceptors();
    assert.ok(mgr1 instanceof InterceptorManager);
    assert.ok(mgr2 instanceof InterceptorManager);
    assert.notStrictEqual(mgr1, mgr2);
  });

  test('returned manager uses fulfilled as primary key', () => {
    const manager = createRequestInterceptors();
    manager.use((config) => ({ ...config, auth: 'bearer' }));
    const handlers = manager.toArray();
    assert.strictEqual(typeof handlers[0].fulfilled, 'function');
  });

  test('returned manager uses rejected as secondary key', () => {
    const manager = createRequestInterceptors();
    const onFulfilled = (c) => c;
    const onRejected = (e) => e;
    manager.use(onFulfilled, onRejected);
    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].rejected, onRejected);
  });

  test('returned manager is empty on creation', () => {
    const manager = createRequestInterceptors();
    assert.strictEqual(manager.size, 0);
    assert.strictEqual(manager.isEmpty, true);
    assert.deepStrictEqual(manager.ids, []);
  });

  test('returned manager run() pipeline works end-to-end', async () => {
    const manager = createRequestInterceptors();
    manager.use((config) => ({ ...config, headers: { Authorization: 'Bearer token' } }));
    manager.use((config) => ({ ...config, timeout: 5000 }));
    const result = await manager.run({ url: '/api/data' });
    assert.deepStrictEqual(result, {
      url: '/api/data',
      headers: { Authorization: 'Bearer token' },
      timeout: 5000
    });
  });

  test('returned manager runSync() pipeline works end-to-end', () => {
    const manager = createRequestInterceptors();
    manager.use((config) => ({ ...config, method: 'GET' }));
    const result = manager.runSync({ url: '/api' });
    assert.deepStrictEqual(result, { url: '/api', method: 'GET' });
  });

  test('returned manager does NOT use onMessage/onError keys', () => {
    const manager = createRequestInterceptors();
    manager.use((v) => v, (e) => e);
    const handler = manager.toArray()[0];
    assert.strictEqual(handler.onMessage, undefined);
    assert.strictEqual(handler.onError, undefined);
  });
});

// ============================================================================
// createMessageInterceptors() factory (lines 227-229)
// ============================================================================

describe('createMessageInterceptors() factory function', () => {
  test('returns a new InterceptorManager instance each call', () => {
    // Exercises lines 227-229
    const mgr1 = createMessageInterceptors();
    const mgr2 = createMessageInterceptors();
    assert.ok(mgr1 instanceof InterceptorManager);
    assert.ok(mgr2 instanceof InterceptorManager);
    assert.notStrictEqual(mgr1, mgr2);
  });

  test('returned manager uses onMessage as primary key', () => {
    const manager = createMessageInterceptors();
    const onMsg = (data) => data;
    manager.use(onMsg);
    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].onMessage, onMsg);
  });

  test('returned manager uses onError as secondary key', () => {
    const manager = createMessageInterceptors();
    const onMsg = (d) => d;
    const onErr = (e) => null;
    manager.use(onMsg, onErr);
    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].onError, onErr);
  });

  test('returned manager is empty on creation', () => {
    const manager = createMessageInterceptors();
    assert.strictEqual(manager.size, 0);
    assert.strictEqual(manager.isEmpty, true);
    assert.deepStrictEqual(manager.ids, []);
  });

  test('returned manager run() pipeline works with onMessage key', async () => {
    const manager = createMessageInterceptors();
    manager.use((msg) => ({ ...msg, timestamped: true }));
    manager.use((msg) => ({ ...msg, validated: true }));
    const result = await manager.run({ type: 'chat', body: 'hi' });
    assert.deepStrictEqual(result, {
      type: 'chat',
      body: 'hi',
      timestamped: true,
      validated: true
    });
  });

  test('returned manager runSync() pipeline works with onMessage key', () => {
    const manager = createMessageInterceptors();
    manager.use((msg) => ({ ...msg, processed: true }));
    const result = manager.runSync({ type: 'ping' });
    assert.deepStrictEqual(result, { type: 'ping', processed: true });
  });

  test('returned manager does NOT use fulfilled/rejected keys', () => {
    const manager = createMessageInterceptors();
    manager.use((v) => v, (e) => e);
    const handler = manager.toArray()[0];
    assert.strictEqual(handler.fulfilled, undefined);
    assert.strictEqual(handler.rejected, undefined);
  });

  test('createMessageInterceptors and MessageInterceptorManager use identical keys', () => {
    const fromFactory = createMessageInterceptors();
    const fromClass = new MessageInterceptorManager();

    const fn = (d) => d;
    const errFn = (e) => e;
    fromFactory.use(fn, errFn);
    fromClass.use(fn, errFn);

    const factoryHandler = fromFactory.toArray()[0];
    const classHandler = fromClass.toArray()[0];

    // Both should expose onMessage and onError
    assert.strictEqual(typeof factoryHandler.onMessage, 'function');
    assert.strictEqual(typeof classHandler.onMessage, 'function');
    assert.strictEqual(typeof factoryHandler.onError, 'function');
    assert.strictEqual(typeof classHandler.onError, 'function');
  });
});

// ============================================================================
// Cross-cutting edge cases
// ============================================================================

describe('Edge cases and integration paths', () => {
  test('manager with no secondary key configured does not store secondary', () => {
    // handlerKeys with only one element: secondaryKey becomes null
    const manager = new InterceptorManager({ handlerKeys: ['transform'] });
    manager.use((v) => v, (e) => e);
    const handler = manager.toArray()[0];
    assert.ok('transform' in handler);
    // When secondaryKey is null the branch in use() is skipped
    // so there should be no secondary property at all
    assert.strictEqual(Object.keys(handler).length, 1);
  });

  test('run() with no-secondaryKey manager re-throws on primary error', async () => {
    const manager = new InterceptorManager({ handlerKeys: ['transform'] });
    manager.use(() => { throw new Error('transform fail'); });
    await assert.rejects(
      () => manager.run('x'),
      { message: 'transform fail' }
    );
  });

  test('runSync() with no-secondaryKey manager re-throws on primary error', () => {
    const manager = new InterceptorManager({ handlerKeys: ['transform'] });
    manager.use(() => { throw new Error('sync transform fail'); });
    assert.throws(
      () => manager.runSync('x'),
      { message: 'sync transform fail' }
    );
  });

  test('ids getter returns a new array on each call (not the same reference)', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    const ids1 = manager.ids;
    const ids2 = manager.ids;
    assert.notStrictEqual(ids1, ids2);
    assert.deepStrictEqual(ids1, ids2);
  });

  test('toArray() returns a new array on each call (not the same reference)', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    const arr1 = manager.toArray();
    const arr2 = manager.toArray();
    assert.notStrictEqual(arr1, arr2);
  });

  test('multiple handlers - only failing one invokes secondary; rest continue', async () => {
    const log = [];
    const manager = new InterceptorManager();
    manager.use(
      (v) => { log.push('p1'); return v + 1; }
    );
    manager.use(
      () => { log.push('p2-throw'); throw new Error('mid-fail'); },
      (err) => { log.push('s2-catch'); return 100; }
    );
    manager.use(
      (v) => { log.push('p3'); return v + 1; }
    );
    const result = await manager.run(0);
    assert.deepStrictEqual(log, ['p1', 'p2-throw', 's2-catch', 'p3']);
    assert.strictEqual(result, 101);  // 0→1 (p1), throws→100 (s2), 100→101 (p3)
  });

  test('multiple handlers sync - only failing one invokes secondary; rest continue', () => {
    const log = [];
    const manager = new InterceptorManager();
    manager.use(
      (v) => { log.push('p1'); return v + 1; }
    );
    manager.use(
      () => { log.push('p2-throw'); throw new Error('mid-fail'); },
      (err) => { log.push('s2-catch'); return 100; }
    );
    manager.use(
      (v) => { log.push('p3'); return v + 1; }
    );
    const result = manager.runSync(0);
    assert.deepStrictEqual(log, ['p1', 'p2-throw', 's2-catch', 'p3']);
    assert.strictEqual(result, 101);
  });
});
