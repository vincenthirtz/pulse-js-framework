/**
 * LRU Cache Tests
 * Tests for runtime/lru-cache.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LRUCache } from '../runtime/lru-cache.js';

// ============================================================================
// Constructor Tests
// ============================================================================

describe('Constructor', () => {
  test('constructor creates cache with given capacity', () => {
    const cache = new LRUCache(5);
    assert.strictEqual(cache.capacity, 5);
    assert.strictEqual(cache.size, 0);
  });

  test('constructor throws for zero capacity', () => {
    let threw = false;
    try {
      new LRUCache(0);
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, 'Should throw for zero capacity');
  });

  test('constructor throws for negative capacity', () => {
    let threw = false;
    try {
      new LRUCache(-1);
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, 'Should throw for negative capacity');
  });
});

// ============================================================================
// Basic Operations
// ============================================================================

describe('Basic Operations', () => {
  test('set and get basic values', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), 2);
    assert.strictEqual(cache.get('c'), 3);
    assert.strictEqual(cache.size, 3);
  });

  test('get returns undefined for missing keys', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);

    assert.strictEqual(cache.get('b'), undefined);
    assert.strictEqual(cache.get('nonexistent'), undefined);
  });

  test('set overwrites existing values', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('a', 10);

    assert.strictEqual(cache.get('a'), 10);
    assert.strictEqual(cache.size, 1);
  });

  test('has returns true for existing keys', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);

    assert.ok(cache.has('a'), 'Should have key a');
    assert.ok(!cache.has('b'), 'Should not have key b');
  });

  test('delete removes items', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);

    assert.ok(cache.delete('a'), 'Should return true when deleting');
    assert.ok(!cache.has('a'), 'Key a should be deleted');
    assert.strictEqual(cache.size, 1);
  });

  test('delete returns false for missing keys', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);

    assert.ok(!cache.delete('b'), 'Should return false for missing key');
  });

  test('clear removes all items', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.clear();

    assert.strictEqual(cache.size, 0);
    assert.ok(!cache.has('a'), 'Key a should be cleared');
    assert.ok(!cache.has('b'), 'Key b should be cleared');
    assert.ok(!cache.has('c'), 'Key c should be cleared');
  });
});

// ============================================================================
// LRU Eviction
// ============================================================================

describe('LRU Eviction', () => {
  test('evicts oldest item when capacity exceeded', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Should evict 'a'

    assert.strictEqual(cache.size, 3);
    assert.ok(!cache.has('a'), 'Oldest item a should be evicted');
    assert.ok(cache.has('b'), 'b should exist');
    assert.ok(cache.has('c'), 'c should exist');
    assert.ok(cache.has('d'), 'd should exist');
  });

  test('get updates item to most recently used', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.get('a'); // 'a' is now most recently used
    cache.set('d', 4); // Should evict 'b' (oldest)

    assert.ok(cache.has('a'), 'a should exist (was accessed)');
    assert.ok(!cache.has('b'), 'b should be evicted');
    assert.ok(cache.has('c'), 'c should exist');
    assert.ok(cache.has('d'), 'd should exist');
  });

  test('set updates item to most recently used', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.set('a', 10); // 'a' is now most recently used
    cache.set('d', 4); // Should evict 'b' (oldest)

    assert.ok(cache.has('a'), 'a should exist (was updated)');
    assert.strictEqual(cache.get('a'), 10, 'a should have updated value');
    assert.ok(!cache.has('b'), 'b should be evicted');
  });

  test('has does not update item position', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.has('a'); // Should NOT update position
    cache.set('d', 4); // Should evict 'a' (still oldest)

    assert.ok(!cache.has('a'), 'a should be evicted (has does not update position)');
    assert.ok(cache.has('b'), 'b should exist');
  });
});

// ============================================================================
// Iteration
// ============================================================================

describe('Iteration', () => {
  test('keys returns all keys in order', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    const keys = Array.from(cache.keys());
    assert.deepStrictEqual(keys, ['a', 'b', 'c']);
  });

  test('values returns all values in order', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    const values = Array.from(cache.values());
    assert.deepStrictEqual(values, [1, 2, 3]);
  });

  test('entries returns all entries in order', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);

    const entries = Array.from(cache.entries());
    assert.deepStrictEqual(entries, [['a', 1], ['b', 2]]);
  });

  test('forEach iterates over all entries', () => {
    const cache = new LRUCache(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    const collected = [];
    cache.forEach((value, key) => {
      collected.push([key, value]);
    });

    assert.deepStrictEqual(collected, [['a', 1], ['b', 2], ['c', 3]]);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('works with capacity of 1', () => {
    const cache = new LRUCache(1);
    cache.set('a', 1);
    assert.strictEqual(cache.get('a'), 1);

    cache.set('b', 2);
    assert.strictEqual(cache.size, 1);
    assert.ok(!cache.has('a'), 'a should be evicted');
    assert.strictEqual(cache.get('b'), 2);
  });

  test('handles various value types', () => {
    const cache = new LRUCache(10);

    cache.set('string', 'hello');
    cache.set('number', 42);
    cache.set('boolean', true);
    cache.set('null', null);
    cache.set('undefined', undefined);
    cache.set('object', { a: 1 });
    cache.set('array', [1, 2, 3]);

    assert.strictEqual(cache.get('string'), 'hello');
    assert.strictEqual(cache.get('number'), 42);
    assert.strictEqual(cache.get('boolean'), true);
    assert.strictEqual(cache.get('null'), null);
    assert.strictEqual(cache.get('undefined'), undefined);
    assert.deepStrictEqual(cache.get('object'), { a: 1 });
    assert.deepStrictEqual(cache.get('array'), [1, 2, 3]);
  });

  test('handles numeric keys', () => {
    const cache = new LRUCache(3);
    cache.set(1, 'one');
    cache.set(2, 'two');

    assert.strictEqual(cache.get(1), 'one');
    assert.strictEqual(cache.get(2), 'two');
  });

  test('handles object keys', () => {
    const cache = new LRUCache(3);
    const key1 = { id: 1 };
    const key2 = { id: 2 };

    cache.set(key1, 'one');
    cache.set(key2, 'two');

    assert.strictEqual(cache.get(key1), 'one');
    assert.strictEqual(cache.get(key2), 'two');
  });

  test('set returns this for chaining', () => {
    const cache = new LRUCache(3);
    const result = cache.set('a', 1).set('b', 2).set('c', 3);

    assert.strictEqual(result, cache);
    assert.strictEqual(cache.size, 3);
  });
});
