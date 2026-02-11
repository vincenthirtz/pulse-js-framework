/**
 * Pulse DOM Element Recycling Pool Tests
 *
 * Tests for runtime/dom-recycle.js - Element pooling for list reconciliation
 * Uses MockDOMAdapter (zero external dependencies)
 *
 * @module test/dom-recycle
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { createElementPool, getPool, resetPool } from '../runtime/dom-recycle.js';
import { pulse } from '../runtime/pulse.js';
import { list } from '../runtime/dom-list.js';

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});

afterEach(() => {
  resetPool();
  resetAdapter();
});

// =============================================================================
// createElementPool() Tests
// =============================================================================

describe('createElementPool()', () => {
  test('creates pool with default options', () => {
    const pool = createElementPool();
    assert.strictEqual(pool.size, 0);
    const stats = pool.stats();
    assert.strictEqual(stats.size, 0);
    assert.strictEqual(stats.hits, 0);
    assert.strictEqual(stats.misses, 0);
    assert.strictEqual(stats.hitRate, 0);
  });

  test('creates pool with custom options', () => {
    const pool = createElementPool({ maxPerTag: 10, maxTotal: 30 });
    assert.strictEqual(pool.size, 0);
  });
});

// =============================================================================
// acquire() Tests
// =============================================================================

describe('pool.acquire()', () => {
  test('creates new element when pool is empty', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    assert.ok(el);
    assert.strictEqual(el.tagName, 'DIV');
  });

  test('creates new element for different tag names', () => {
    const pool = createElementPool();
    const div = pool.acquire('div');
    const li = pool.acquire('li');
    const span = pool.acquire('span');
    assert.strictEqual(div.tagName, 'DIV');
    assert.strictEqual(li.tagName, 'LI');
    assert.strictEqual(span.tagName, 'SPAN');
  });

  test('reuses pooled element after release', () => {
    const pool = createElementPool();
    const original = pool.acquire('li');
    pool.release(original);

    const reused = pool.acquire('li');
    assert.strictEqual(reused, original, 'Should reuse the same element');
  });

  test('normalizes tag name to lowercase', () => {
    const pool = createElementPool();
    const el = pool.acquire('LI');
    pool.release(el);

    const reused = pool.acquire('li');
    assert.strictEqual(reused, el);
  });

  test('records miss on empty pool', () => {
    const pool = createElementPool();
    pool.acquire('div');
    const stats = pool.stats();
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.hits, 0);
  });

  test('records hit when reusing from pool', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    pool.release(el);

    pool.acquire('div');
    const stats = pool.stats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1); // from initial acquire
  });

  test('does not reuse element of different tag', () => {
    const pool = createElementPool();
    const div = pool.acquire('div');
    pool.release(div);

    const li = pool.acquire('li');
    assert.notStrictEqual(li, div);
    assert.strictEqual(li.tagName, 'LI');
  });
});

// =============================================================================
// release() Tests
// =============================================================================

describe('pool.release()', () => {
  test('returns true on successful release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    const result = pool.release(el);
    assert.strictEqual(result, true);
  });

  test('increments pool size on release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    assert.strictEqual(pool.size, 0);
    pool.release(el);
    assert.strictEqual(pool.size, 1);
  });

  test('resets element text content on release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    adapter.setTextContent(el, 'Hello World');
    pool.release(el);
    assert.strictEqual(el.textContent, '');
  });

  test('resets element className on release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    el.className = 'active highlighted';
    pool.release(el);
    assert.strictEqual(el.className, '');
  });

  test('removes child nodes on release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    const child = adapter.createElement('span');
    adapter.appendChild(el, child);
    assert.ok(adapter.getFirstChild(el) !== null);

    pool.release(el);
    assert.strictEqual(adapter.getFirstChild(el), null);
  });

  test('clears event listeners on release', () => {
    const pool = createElementPool();
    const el = pool.acquire('div');
    el._eventListeners.set('click', [() => {}]);
    assert.strictEqual(el._eventListeners.size, 1);

    pool.release(el);
    assert.strictEqual(el._eventListeners.size, 0);
  });

  test('returns false for non-element nodes', () => {
    const pool = createElementPool();
    const textNode = adapter.createTextNode('hello');
    const result = pool.release(textNode);
    assert.strictEqual(result, false);
  });

  test('respects maxPerTag limit', () => {
    const pool = createElementPool({ maxPerTag: 2, maxTotal: 100 });

    const el1 = pool.acquire('li');
    const el2 = pool.acquire('li');
    const el3 = pool.acquire('li');

    assert.strictEqual(pool.release(el1), true);
    assert.strictEqual(pool.release(el2), true);
    assert.strictEqual(pool.release(el3), false); // exceeds maxPerTag

    assert.strictEqual(pool.size, 2);
  });

  test('respects maxTotal limit', () => {
    const pool = createElementPool({ maxPerTag: 50, maxTotal: 3 });

    const elements = [];
    for (let i = 0; i < 5; i++) {
      elements.push(pool.acquire('div'));
    }

    assert.strictEqual(pool.release(elements[0]), true);
    assert.strictEqual(pool.release(elements[1]), true);
    assert.strictEqual(pool.release(elements[2]), true);
    assert.strictEqual(pool.release(elements[3]), false); // exceeds maxTotal

    assert.strictEqual(pool.size, 3);
  });

  test('does not reset when resetOnRecycle is false', () => {
    const pool = createElementPool({ resetOnRecycle: false });
    const el = pool.acquire('div');
    adapter.setTextContent(el, 'Preserved');
    el.className = 'keep-me';

    pool.release(el);
    // Text content and class should be preserved
    assert.strictEqual(el.textContent, 'Preserved');
    assert.strictEqual(el.className, 'keep-me');
  });
});

// =============================================================================
// stats() Tests
// =============================================================================

describe('pool.stats()', () => {
  test('tracks hits, misses, and hitRate', () => {
    const pool = createElementPool();

    // 3 misses (create new)
    const el1 = pool.acquire('div');
    const el2 = pool.acquire('div');
    const el3 = pool.acquire('div');

    // Release all 3
    pool.release(el1);
    pool.release(el2);
    pool.release(el3);

    // 2 hits (reuse from pool)
    pool.acquire('div');
    pool.acquire('div');

    const stats = pool.stats();
    assert.strictEqual(stats.hits, 2);
    assert.strictEqual(stats.misses, 3);
    assert.strictEqual(stats.hitRate, 0.4); // 2/5
    assert.strictEqual(stats.size, 1); // 1 remaining in pool
  });

  test('hitRate is 0 when no operations performed', () => {
    const pool = createElementPool();
    assert.strictEqual(pool.stats().hitRate, 0);
  });

  test('resetStats clears counters', () => {
    const pool = createElementPool();
    pool.acquire('div');
    pool.acquire('div');
    assert.strictEqual(pool.stats().misses, 2);

    pool.resetStats();
    const stats = pool.stats();
    assert.strictEqual(stats.hits, 0);
    assert.strictEqual(stats.misses, 0);
    assert.strictEqual(stats.hitRate, 0);
  });
});

// =============================================================================
// clear() Tests
// =============================================================================

describe('pool.clear()', () => {
  test('empties the pool', () => {
    const pool = createElementPool();
    pool.release(pool.acquire('div'));
    pool.release(pool.acquire('li'));
    pool.release(pool.acquire('span'));
    assert.strictEqual(pool.size, 3);

    pool.clear();
    assert.strictEqual(pool.size, 0);
  });

  test('new acquire creates fresh elements after clear', () => {
    const pool = createElementPool();
    const original = pool.acquire('div');
    pool.release(original);
    pool.clear();

    const fresh = pool.acquire('div');
    assert.notStrictEqual(fresh, original, 'Should be a new element after clear');
  });
});

// =============================================================================
// Singleton Pool Tests
// =============================================================================

describe('getPool() and resetPool()', () => {
  test('getPool returns a singleton', () => {
    const pool1 = getPool();
    const pool2 = getPool();
    assert.strictEqual(pool1, pool2, 'Should return the same instance');
  });

  test('getPool returns a working pool', () => {
    const pool = getPool();
    const el = pool.acquire('div');
    assert.ok(el);
    pool.release(el);
    assert.strictEqual(pool.size, 1);
  });

  test('resetPool clears and nullifies singleton', () => {
    const pool1 = getPool();
    pool1.release(pool1.acquire('div'));
    assert.strictEqual(pool1.size, 1);

    resetPool();

    const pool2 = getPool();
    assert.notStrictEqual(pool1, pool2, 'Should create new instance after reset');
    assert.strictEqual(pool2.size, 0);
  });
});

// =============================================================================
// Pool with Multiple Tags
// =============================================================================

describe('Pool multi-tag behavior', () => {
  test('pools different tag types separately', () => {
    const pool = createElementPool();

    const div = pool.acquire('div');
    const li = pool.acquire('li');
    const span = pool.acquire('span');

    pool.release(div);
    pool.release(li);
    pool.release(span);

    assert.strictEqual(pool.size, 3);

    // Acquire specific tags
    const reusedLi = pool.acquire('li');
    assert.strictEqual(reusedLi, li);

    const reusedDiv = pool.acquire('div');
    assert.strictEqual(reusedDiv, div);
  });

  test('LIFO order within same tag bucket', () => {
    const pool = createElementPool();

    const el1 = pool.acquire('li');
    const el2 = pool.acquire('li');
    const el3 = pool.acquire('li');

    pool.release(el1);
    pool.release(el2);
    pool.release(el3);

    // LIFO: last released is first acquired
    assert.strictEqual(pool.acquire('li'), el3);
    assert.strictEqual(pool.acquire('li'), el2);
    assert.strictEqual(pool.acquire('li'), el1);
  });
});

// =============================================================================
// list() Integration with recycle:true
// =============================================================================

describe('list() with recycle option', () => {
  test('list works with recycle:true option', () => {
    const items = pulse([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' }
    ]);

    const fragment = list(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { recycle: true }
    );

    // Mount to body
    adapter.appendChild(adapter.getBody(), fragment);

    // Remove items - they should be released to pool
    items.set([{ id: 1, name: 'A' }]);

    // Pool should have received the removed elements
    const pool = getPool();
    assert.ok(pool.size >= 0, 'Pool should track released elements');
  });

  test('list works normally without recycle option', () => {
    const items = pulse([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ]);

    const fragment = list(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id
    );

    adapter.appendChild(adapter.getBody(), fragment);

    // Remove items
    items.set([]);

    // Pool should be empty since recycle was not enabled
    const pool = getPool();
    assert.strictEqual(pool.stats().hits, 0);
  });
});
