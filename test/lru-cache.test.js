/**
 * LRU Cache Tests
 * Tests for runtime/lru-cache.js
 */

import { LRUCache } from '../runtime/lru-cache.js';

// Simple test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

console.log('\n--- LRU Cache Tests ---\n');

// ============================================================================
// Constructor Tests
// ============================================================================

test('constructor creates cache with given capacity', () => {
  const cache = new LRUCache(5);
  assertEqual(cache.capacity, 5);
  assertEqual(cache.size, 0);
});

test('constructor throws for zero capacity', () => {
  let threw = false;
  try {
    new LRUCache(0);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for zero capacity');
});

test('constructor throws for negative capacity', () => {
  let threw = false;
  try {
    new LRUCache(-1);
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for negative capacity');
});

// ============================================================================
// Basic Operations
// ============================================================================

test('set and get basic values', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  assertEqual(cache.get('a'), 1);
  assertEqual(cache.get('b'), 2);
  assertEqual(cache.get('c'), 3);
  assertEqual(cache.size, 3);
});

test('get returns undefined for missing keys', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);

  assertEqual(cache.get('b'), undefined);
  assertEqual(cache.get('nonexistent'), undefined);
});

test('set overwrites existing values', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('a', 10);

  assertEqual(cache.get('a'), 10);
  assertEqual(cache.size, 1);
});

test('has returns true for existing keys', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);

  assert(cache.has('a'), 'Should have key a');
  assert(!cache.has('b'), 'Should not have key b');
});

test('delete removes items', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);

  assert(cache.delete('a'), 'Should return true when deleting');
  assert(!cache.has('a'), 'Key a should be deleted');
  assertEqual(cache.size, 1);
});

test('delete returns false for missing keys', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);

  assert(!cache.delete('b'), 'Should return false for missing key');
});

test('clear removes all items', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.clear();

  assertEqual(cache.size, 0);
  assert(!cache.has('a'), 'Key a should be cleared');
  assert(!cache.has('b'), 'Key b should be cleared');
  assert(!cache.has('c'), 'Key c should be cleared');
});

// ============================================================================
// LRU Eviction
// ============================================================================

test('evicts oldest item when capacity exceeded', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.set('d', 4); // Should evict 'a'

  assertEqual(cache.size, 3);
  assert(!cache.has('a'), 'Oldest item a should be evicted');
  assert(cache.has('b'), 'b should exist');
  assert(cache.has('c'), 'c should exist');
  assert(cache.has('d'), 'd should exist');
});

test('get updates item to most recently used', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.get('a'); // 'a' is now most recently used
  cache.set('d', 4); // Should evict 'b' (oldest)

  assert(cache.has('a'), 'a should exist (was accessed)');
  assert(!cache.has('b'), 'b should be evicted');
  assert(cache.has('c'), 'c should exist');
  assert(cache.has('d'), 'd should exist');
});

test('set updates item to most recently used', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.set('a', 10); // 'a' is now most recently used
  cache.set('d', 4); // Should evict 'b' (oldest)

  assert(cache.has('a'), 'a should exist (was updated)');
  assertEqual(cache.get('a'), 10, 'a should have updated value');
  assert(!cache.has('b'), 'b should be evicted');
});

test('has does not update item position', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  cache.has('a'); // Should NOT update position
  cache.set('d', 4); // Should evict 'a' (still oldest)

  assert(!cache.has('a'), 'a should be evicted (has does not update position)');
  assert(cache.has('b'), 'b should exist');
});

// ============================================================================
// Iteration
// ============================================================================

test('keys returns all keys in order', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  const keys = Array.from(cache.keys());
  assertDeepEqual(keys, ['a', 'b', 'c']);
});

test('values returns all values in order', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  const values = Array.from(cache.values());
  assertDeepEqual(values, [1, 2, 3]);
});

test('entries returns all entries in order', () => {
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);

  const entries = Array.from(cache.entries());
  assertDeepEqual(entries, [['a', 1], ['b', 2]]);
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

  assertDeepEqual(collected, [['a', 1], ['b', 2], ['c', 3]]);
});

// ============================================================================
// Edge Cases
// ============================================================================

test('works with capacity of 1', () => {
  const cache = new LRUCache(1);
  cache.set('a', 1);
  assertEqual(cache.get('a'), 1);

  cache.set('b', 2);
  assertEqual(cache.size, 1);
  assert(!cache.has('a'), 'a should be evicted');
  assertEqual(cache.get('b'), 2);
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

  assertEqual(cache.get('string'), 'hello');
  assertEqual(cache.get('number'), 42);
  assertEqual(cache.get('boolean'), true);
  assertEqual(cache.get('null'), null);
  assertEqual(cache.get('undefined'), undefined);
  assertDeepEqual(cache.get('object'), { a: 1 });
  assertDeepEqual(cache.get('array'), [1, 2, 3]);
});

test('handles numeric keys', () => {
  const cache = new LRUCache(3);
  cache.set(1, 'one');
  cache.set(2, 'two');

  assertEqual(cache.get(1), 'one');
  assertEqual(cache.get(2), 'two');
});

test('handles object keys', () => {
  const cache = new LRUCache(3);
  const key1 = { id: 1 };
  const key2 = { id: 2 };

  cache.set(key1, 'one');
  cache.set(key2, 'two');

  assertEqual(cache.get(key1), 'one');
  assertEqual(cache.get(key2), 'two');
});

test('set returns this for chaining', () => {
  const cache = new LRUCache(3);
  const result = cache.set('a', 1).set('b', 2).set('c', 3);

  assertEqual(result, cache);
  assertEqual(cache.size, 3);
});

// ============================================================================
// Results
// ============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
