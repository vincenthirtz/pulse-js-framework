/**
 * Tests for Interceptor Manager
 *
 * Covers InterceptorManager, MessageInterceptorManager, and factory functions.
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
// InterceptorManager - Constructor
// ============================================================================

describe('InterceptorManager - Constructor', () => {
  test('uses default handler keys (fulfilled, rejected)', () => {
    const manager = new InterceptorManager();
    manager.use(
      (val) => val + 1,
      (err) => err
    );

    const handlers = manager.toArray();
    assert.strictEqual(handlers.length, 1);
    assert.strictEqual(typeof handlers[0].fulfilled, 'function');
    assert.strictEqual(typeof handlers[0].rejected, 'function');
  });

  test('accepts custom handler keys', () => {
    const manager = new InterceptorManager({
      handlerKeys: ['transform', 'fallback']
    });
    manager.use(
      (val) => val.toUpperCase(),
      (err) => 'default'
    );

    const handlers = manager.toArray();
    assert.strictEqual(handlers.length, 1);
    assert.strictEqual(typeof handlers[0].transform, 'function');
    assert.strictEqual(typeof handlers[0].fallback, 'function');
    // Default keys should not be present
    assert.strictEqual(handlers[0].fulfilled, undefined);
    assert.strictEqual(handlers[0].rejected, undefined);
  });
});

// ============================================================================
// InterceptorManager - use()
// ============================================================================

describe('InterceptorManager - use()', () => {
  test('registers an interceptor and returns a numeric id', () => {
    const manager = new InterceptorManager();
    const id = manager.use((val) => val);

    assert.strictEqual(typeof id, 'number');
    assert.strictEqual(manager.size, 1);
  });

  test('returns unique ids for multiple interceptors', () => {
    const manager = new InterceptorManager();
    const id1 = manager.use((val) => val);
    const id2 = manager.use((val) => val);
    const id3 = manager.use((val) => val);

    assert.notStrictEqual(id1, id2);
    assert.notStrictEqual(id2, id3);
    assert.notStrictEqual(id1, id3);
    assert.strictEqual(manager.size, 3);
  });

  test('stores primary handler under the primary key', () => {
    const manager = new InterceptorManager();
    const primary = (val) => val * 2;
    manager.use(primary);

    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].fulfilled, primary);
  });

  test('stores secondary handler under the secondary key', () => {
    const manager = new InterceptorManager();
    const primary = (val) => val;
    const secondary = (err) => err.message;
    manager.use(primary, secondary);

    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].fulfilled, primary);
    assert.strictEqual(handlers[0].rejected, secondary);
  });

  test('secondary handler is undefined when not provided', () => {
    const manager = new InterceptorManager();
    manager.use((val) => val);

    const handlers = manager.toArray();
    assert.strictEqual(handlers[0].rejected, undefined);
  });
});

// ============================================================================
// InterceptorManager - eject()
// ============================================================================

describe('InterceptorManager - eject()', () => {
  test('removes an existing interceptor and returns true', () => {
    const manager = new InterceptorManager();
    const id = manager.use((val) => val);

    assert.strictEqual(manager.size, 1);
    const result = manager.eject(id);
    assert.strictEqual(result, true);
    assert.strictEqual(manager.size, 0);
  });

  test('returns false for a non-existing id', () => {
    const manager = new InterceptorManager();
    const result = manager.eject(999);
    assert.strictEqual(result, false);
  });

  test('returns false when ejecting the same id twice', () => {
    const manager = new InterceptorManager();
    const id = manager.use((val) => val);

    assert.strictEqual(manager.eject(id), true);
    assert.strictEqual(manager.eject(id), false);
  });
});

// ============================================================================
// InterceptorManager - clear()
// ============================================================================

describe('InterceptorManager - clear()', () => {
  test('removes all interceptors', () => {
    const manager = new InterceptorManager();
    manager.use((val) => val);
    manager.use((val) => val);
    manager.use((val) => val);

    assert.strictEqual(manager.size, 3);
    manager.clear();
    assert.strictEqual(manager.size, 0);
    assert.strictEqual(manager.isEmpty, true);
  });

  test('is safe to call on an empty manager', () => {
    const manager = new InterceptorManager();
    manager.clear();
    assert.strictEqual(manager.size, 0);
  });
});

// ============================================================================
// InterceptorManager - size / isEmpty
// ============================================================================

describe('InterceptorManager - size / isEmpty', () => {
  test('size is 0 for a new manager', () => {
    const manager = new InterceptorManager();
    assert.strictEqual(manager.size, 0);
  });

  test('size increases on use() and decreases on eject()', () => {
    const manager = new InterceptorManager();
    const id1 = manager.use((v) => v);
    assert.strictEqual(manager.size, 1);

    const id2 = manager.use((v) => v);
    assert.strictEqual(manager.size, 2);

    manager.eject(id1);
    assert.strictEqual(manager.size, 1);

    manager.eject(id2);
    assert.strictEqual(manager.size, 0);
  });

  test('isEmpty is true when empty', () => {
    const manager = new InterceptorManager();
    assert.strictEqual(manager.isEmpty, true);
  });

  test('isEmpty is false when populated', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v);
    assert.strictEqual(manager.isEmpty, false);
  });
});

// ============================================================================
// InterceptorManager - ids getter
// ============================================================================

describe('InterceptorManager - ids', () => {
  test('returns an empty array for new manager', () => {
    const manager = new InterceptorManager();
    assert.deepStrictEqual(manager.ids, []);
  });

  test('returns all registered ids in insertion order', () => {
    const manager = new InterceptorManager();
    const id1 = manager.use((v) => v);
    const id2 = manager.use((v) => v);
    const id3 = manager.use((v) => v);

    assert.deepStrictEqual(manager.ids, [id1, id2, id3]);
  });

  test('reflects ejected interceptors', () => {
    const manager = new InterceptorManager();
    const id1 = manager.use((v) => v);
    const id2 = manager.use((v) => v);
    const id3 = manager.use((v) => v);

    manager.eject(id2);
    assert.deepStrictEqual(manager.ids, [id1, id3]);
  });
});

// ============================================================================
// InterceptorManager - Iterator / toArray
// ============================================================================

describe('InterceptorManager - Iterator / toArray', () => {
  test('iterates through handlers in insertion order', () => {
    const manager = new InterceptorManager();
    const fn1 = (v) => v + 1;
    const fn2 = (v) => v + 2;
    const fn3 = (v) => v + 3;

    manager.use(fn1);
    manager.use(fn2);
    manager.use(fn3);

    const collected = [];
    for (const handler of manager) {
      collected.push(handler.fulfilled);
    }

    assert.strictEqual(collected.length, 3);
    assert.strictEqual(collected[0], fn1);
    assert.strictEqual(collected[1], fn2);
    assert.strictEqual(collected[2], fn3);
  });

  test('toArray returns an array of handler objects', () => {
    const manager = new InterceptorManager();
    const fn1 = (v) => v;
    const errFn = (e) => e;

    manager.use(fn1, errFn);

    const arr = manager.toArray();
    assert.ok(Array.isArray(arr));
    assert.strictEqual(arr.length, 1);
    assert.strictEqual(arr[0].fulfilled, fn1);
    assert.strictEqual(arr[0].rejected, errFn);
  });

  test('spread operator works with Symbol.iterator', () => {
    const manager = new InterceptorManager();
    manager.use((v) => v + 'a');
    manager.use((v) => v + 'b');

    const handlers = [...manager];
    assert.strictEqual(handlers.length, 2);
    assert.strictEqual(typeof handlers[0].fulfilled, 'function');
    assert.strictEqual(typeof handlers[1].fulfilled, 'function');
  });
});

// ============================================================================
// InterceptorManager - run() async pipeline
// ============================================================================

describe('InterceptorManager - run() async pipeline', () => {
  test('processes value through a single interceptor', async () => {
    const manager = new InterceptorManager();
    manager.use((val) => val * 2);

    const result = await manager.run(5);
    assert.strictEqual(result, 10);
  });

  test('chains multiple interceptors in order', async () => {
    const manager = new InterceptorManager();
    manager.use((val) => val + 1);   // 5 -> 6
    manager.use((val) => val * 3);   // 6 -> 18
    manager.use((val) => val - 2);   // 18 -> 16

    const result = await manager.run(5);
    assert.strictEqual(result, 16);
  });

  test('returns original value when no interceptors registered', async () => {
    const manager = new InterceptorManager();
    const result = await manager.run('unchanged');
    assert.strictEqual(result, 'unchanged');
  });

  test('calls secondary handler on error from primary', async () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('primary failed'); },
      (err) => `recovered: ${err.message}`
    );

    const result = await manager.run('input');
    assert.strictEqual(result, 'recovered: primary failed');
  });

  test('re-throws error if no secondary handler exists', async () => {
    const manager = new InterceptorManager();
    manager.use(() => { throw new Error('unhandled'); });

    await assert.rejects(
      () => manager.run('input'),
      { message: 'unhandled' }
    );
  });

  test('handles async primary handlers', async () => {
    const manager = new InterceptorManager();
    manager.use(async (val) => {
      return new Promise((resolve) => setTimeout(() => resolve(val + 10), 10));
    });

    const result = await manager.run(5);
    assert.strictEqual(result, 15);
  });

  test('handles async secondary handler on error', async () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('async fail'); },
      async (err) => {
        return new Promise((resolve) =>
          setTimeout(() => resolve(`async recovered: ${err.message}`), 10)
        );
      }
    );

    const result = await manager.run('input');
    assert.strictEqual(result, 'async recovered: async fail');
  });

  test('skips interceptor if primary is not a function', async () => {
    const manager = new InterceptorManager();
    // Directly add a handler with a null primary via use(null)
    manager.use(null);
    manager.use((val) => val + '!');

    const result = await manager.run('hello');
    assert.strictEqual(result, 'hello!');
  });
});

// ============================================================================
// InterceptorManager - runSync() sync pipeline
// ============================================================================

describe('InterceptorManager - runSync() sync pipeline', () => {
  test('processes value synchronously through interceptors', () => {
    const manager = new InterceptorManager();
    manager.use((val) => val.toUpperCase());

    const result = manager.runSync('hello');
    assert.strictEqual(result, 'HELLO');
  });

  test('chains multiple sync interceptors', () => {
    const manager = new InterceptorManager();
    manager.use((val) => val + ' world');
    manager.use((val) => val + '!');

    const result = manager.runSync('hello');
    assert.strictEqual(result, 'hello world!');
  });

  test('calls secondary handler on sync error', () => {
    const manager = new InterceptorManager();
    manager.use(
      () => { throw new Error('sync fail'); },
      (err) => `caught: ${err.message}`
    );

    const result = manager.runSync('input');
    assert.strictEqual(result, 'caught: sync fail');
  });

  test('re-throws error without secondary handler in sync mode', () => {
    const manager = new InterceptorManager();
    manager.use(() => { throw new Error('no handler'); });

    assert.throws(
      () => manager.runSync('input'),
      { message: 'no handler' }
    );
  });

  test('returns original value with no interceptors', () => {
    const manager = new InterceptorManager();
    const result = manager.runSync(42);
    assert.strictEqual(result, 42);
  });
});

// ============================================================================
// MessageInterceptorManager
// ============================================================================

describe('MessageInterceptorManager', () => {
  test('uses onMessage and onError as handler keys', () => {
    const manager = new MessageInterceptorManager();
    const onMsg = (data) => ({ ...data, processed: true });
    const onErr = (err) => console.error(err);

    manager.use(onMsg, onErr);

    const handlers = manager.toArray();
    assert.strictEqual(handlers.length, 1);
    assert.strictEqual(handlers[0].onMessage, onMsg);
    assert.strictEqual(handlers[0].onError, onErr);
    // Default keys should not be present
    assert.strictEqual(handlers[0].fulfilled, undefined);
    assert.strictEqual(handlers[0].rejected, undefined);
  });

  test('iterates with onMessage/onError handler structure', () => {
    const manager = new MessageInterceptorManager();
    manager.use((data) => data, (err) => err);
    manager.use((data) => data);

    const handlers = [...manager];
    assert.strictEqual(handlers.length, 2);
    assert.strictEqual(typeof handlers[0].onMessage, 'function');
    assert.strictEqual(typeof handlers[0].onError, 'function');
    assert.strictEqual(typeof handlers[1].onMessage, 'function');
    assert.strictEqual(handlers[1].onError, undefined);
  });

  test('run() works with WebSocket-style handler keys', async () => {
    const manager = new MessageInterceptorManager();
    manager.use((data) => ({ ...data, timestamp: 123 }));
    manager.use((data) => ({ ...data, version: 2 }));

    const result = await manager.run({ type: 'chat', body: 'hello' });
    assert.deepStrictEqual(result, {
      type: 'chat',
      body: 'hello',
      timestamp: 123,
      version: 2
    });
  });

  test('is an instance of InterceptorManager', () => {
    const manager = new MessageInterceptorManager();
    assert.ok(manager instanceof InterceptorManager);
  });
});

// ============================================================================
// Factory Functions
// ============================================================================

describe('Factory Functions', () => {
  test('createRequestInterceptors returns InterceptorManager with fulfilled/rejected keys', () => {
    const manager = createRequestInterceptors();
    assert.ok(manager instanceof InterceptorManager);

    manager.use((config) => ({ ...config, auth: true }));
    const handlers = manager.toArray();
    assert.strictEqual(typeof handlers[0].fulfilled, 'function');
  });

  test('createMessageInterceptors returns InterceptorManager with onMessage/onError keys', () => {
    const manager = createMessageInterceptors();
    assert.ok(manager instanceof InterceptorManager);

    manager.use(
      (data) => data,
      (err) => err
    );
    const handlers = manager.toArray();
    assert.strictEqual(typeof handlers[0].onMessage, 'function');
    assert.strictEqual(typeof handlers[0].onError, 'function');
  });
});
