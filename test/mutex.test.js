/**
 * Tests for Mutex (Mutual Exclusion) Lock
 * @module test/mutex
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createMutex } from '../runtime/server-components/utils/mutex.js';

describe('Mutex', () => {
  test('createMutex returns object with lock method', () => {
    const mutex = createMutex();
    assert.strictEqual(typeof mutex.lock, 'function');
  });

  test('lock executes function and returns result', async () => {
    const mutex = createMutex();
    const result = await mutex.lock(() => 42);
    assert.strictEqual(result, 42);
  });

  test('lock executes async function and returns result', async () => {
    const mutex = createMutex();
    const result = await mutex.lock(async () => {
      await new Promise(r => setTimeout(r, 10));
      return 'async-result';
    });
    assert.strictEqual(result, 'async-result');
  });

  test('lock ensures serial execution (no concurrent access)', async () => {
    const mutex = createMutex();
    const log = [];

    // Launch 3 concurrent lock operations
    const p1 = mutex.lock(async () => {
      log.push('start-1');
      await new Promise(r => setTimeout(r, 30));
      log.push('end-1');
      return 1;
    });

    const p2 = mutex.lock(async () => {
      log.push('start-2');
      await new Promise(r => setTimeout(r, 10));
      log.push('end-2');
      return 2;
    });

    const p3 = mutex.lock(async () => {
      log.push('start-3');
      log.push('end-3');
      return 3;
    });

    const results = await Promise.all([p1, p2, p3]);

    // Verify serial execution: each starts only after previous ends
    assert.deepStrictEqual(results, [1, 2, 3]);
    assert.strictEqual(log[0], 'start-1');
    assert.strictEqual(log[1], 'end-1');
    assert.strictEqual(log[2], 'start-2');
    assert.strictEqual(log[3], 'end-2');
    assert.strictEqual(log[4], 'start-3');
    assert.strictEqual(log[5], 'end-3');
  });

  test('lock releases on exception (does not deadlock)', async () => {
    const mutex = createMutex();

    // First lock throws
    const p1 = mutex.lock(() => {
      throw new Error('boom');
    }).catch(e => e.message);

    // Second lock should still execute after first fails
    const p2 = mutex.lock(() => 'recovered');

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.strictEqual(r1, 'boom');
    assert.strictEqual(r2, 'recovered');
  });

  test('lock releases on async exception', async () => {
    const mutex = createMutex();

    const p1 = mutex.lock(async () => {
      await new Promise(r => setTimeout(r, 5));
      throw new Error('async-boom');
    }).catch(e => e.message);

    const p2 = mutex.lock(() => 'ok');

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.strictEqual(r1, 'async-boom');
    assert.strictEqual(r2, 'ok');
  });

  test('independent mutexes do not block each other', async () => {
    const mutexA = createMutex();
    const mutexB = createMutex();
    const log = [];

    const pA = mutexA.lock(async () => {
      log.push('A-start');
      await new Promise(r => setTimeout(r, 30));
      log.push('A-end');
    });

    const pB = mutexB.lock(async () => {
      log.push('B-start');
      await new Promise(r => setTimeout(r, 10));
      log.push('B-end');
    });

    await Promise.all([pA, pB]);

    // B should finish before A since they run concurrently
    const aEnd = log.indexOf('A-end');
    const bEnd = log.indexOf('B-end');
    assert.ok(bEnd < aEnd, 'Independent mutexes should run concurrently');
  });

  test('lock handles synchronous functions', async () => {
    const mutex = createMutex();
    const result = await mutex.lock(() => 'sync');
    assert.strictEqual(result, 'sync');
  });

  test('lock handles undefined return', async () => {
    const mutex = createMutex();
    const result = await mutex.lock(() => {});
    assert.strictEqual(result, undefined);
  });

  test('many concurrent locks execute in order', async () => {
    const mutex = createMutex();
    const order = [];

    const promises = Array.from({ length: 20 }, (_, i) =>
      mutex.lock(async () => {
        order.push(i);
        await new Promise(r => setTimeout(r, 1));
        return i;
      })
    );

    const results = await Promise.all(promises);
    assert.deepStrictEqual(results, Array.from({ length: 20 }, (_, i) => i));
    assert.deepStrictEqual(order, Array.from({ length: 20 }, (_, i) => i));
  });
});
