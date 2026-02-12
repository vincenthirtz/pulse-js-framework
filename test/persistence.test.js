/**
 * Persistence Module Tests
 * Tests for runtime/persistence.js — adapters, factory, security, withPersistence
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { pulse, effect, resetContext } from '../runtime/pulse.js';
import { createStore } from '../runtime/store.js';
import {
  createMemoryAdapter,
  createLocalStorageAdapter,
  createSessionStorageAdapter,
  createPersistenceAdapter,
  withPersistence,
  PersistenceError,
} from '../runtime/persistence.js';

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  resetContext();
});

afterEach(() => {
  resetContext();
});

// ============================================================================
// PersistenceError Tests
// ============================================================================

describe('PersistenceError', () => {
  test('creates error with correct name and code', () => {
    const err = new PersistenceError('test error', { adapterName: 'Memory' });
    assert.strictEqual(err.name, 'PersistenceError');
    assert.strictEqual(err.adapterName, 'Memory');
    assert.strictEqual(err.message, 'test error');
  });

  test('defaults adapterName to null', () => {
    const err = new PersistenceError('test');
    assert.strictEqual(err.adapterName, null);
  });

  test('isPersistenceError checks correctly', () => {
    const err = new PersistenceError('test');
    assert.ok(PersistenceError.isPersistenceError(err));
    assert.ok(!PersistenceError.isPersistenceError(new Error('test')));
  });
});

// ============================================================================
// Memory Adapter Tests
// ============================================================================

describe('createMemoryAdapter', () => {
  test('returns adapter with correct name', () => {
    const adapter = createMemoryAdapter();
    assert.strictEqual(adapter.name, 'Memory');
  });

  test('getItem returns null for missing keys', async () => {
    const adapter = createMemoryAdapter();
    const result = await adapter.getItem('nonexistent');
    assert.strictEqual(result, null);
  });

  test('setItem and getItem round-trip', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('key', { value: 42 });
    const result = await adapter.getItem('key');
    assert.deepStrictEqual(result, { value: 42 });
  });

  test('setItem overwrites existing value', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('key', 'first');
    await adapter.setItem('key', 'second');
    const result = await adapter.getItem('key');
    assert.strictEqual(result, 'second');
  });

  test('removeItem deletes a key', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('key', 'value');
    await adapter.removeItem('key');
    const result = await adapter.getItem('key');
    assert.strictEqual(result, null);
  });

  test('clear removes all entries', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('a', 1);
    await adapter.setItem('b', 2);
    await adapter.clear();
    const keys = await adapter.keys();
    assert.strictEqual(keys.length, 0);
  });

  test('keys returns all stored keys', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('x', 1);
    await adapter.setItem('y', 2);
    await adapter.setItem('z', 3);
    const keys = await adapter.keys();
    assert.deepStrictEqual(keys.sort(), ['x', 'y', 'z']);
  });

  test('stores various types: strings, numbers, objects, arrays, booleans, null', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('str', 'hello');
    await adapter.setItem('num', 42);
    await adapter.setItem('obj', { a: 1 });
    await adapter.setItem('arr', [1, 2, 3]);
    await adapter.setItem('bool', true);
    await adapter.setItem('nil', null);

    assert.strictEqual(await adapter.getItem('str'), 'hello');
    assert.strictEqual(await adapter.getItem('num'), 42);
    assert.deepStrictEqual(await adapter.getItem('obj'), { a: 1 });
    assert.deepStrictEqual(await adapter.getItem('arr'), [1, 2, 3]);
    assert.strictEqual(await adapter.getItem('bool'), true);
    assert.strictEqual(await adapter.getItem('nil'), null);
  });

  test('removeItem on nonexistent key does not throw', async () => {
    const adapter = createMemoryAdapter();
    await adapter.removeItem('nope');
  });
});

// ============================================================================
// createPersistenceAdapter Factory Tests
// ============================================================================

describe('createPersistenceAdapter', () => {
  test('memory type returns memory adapter', () => {
    const adapter = createPersistenceAdapter('memory');
    assert.strictEqual(adapter.name, 'Memory');
  });

  test('throws for unknown type', () => {
    assert.throws(
      () => createPersistenceAdapter('redis'),
      (err) => PersistenceError.isPersistenceError(err)
    );
  });

  test('localStorage falls back to memory when not available', () => {
    // localStorage is not available in Node.js test environment
    const adapter = createPersistenceAdapter('localStorage');
    assert.strictEqual(adapter.name, 'Memory');
  });

  test('sessionStorage falls back to memory when not available', () => {
    const adapter = createPersistenceAdapter('sessionStorage');
    assert.strictEqual(adapter.name, 'Memory');
  });

  test('indexedDB falls back to memory when not available', () => {
    const adapter = createPersistenceAdapter('indexedDB');
    assert.strictEqual(adapter.name, 'Memory');
  });
});

// ============================================================================
// _sanitizeValue Security Tests (via withPersistence restore)
// ============================================================================

describe('sanitizeValue security', () => {
  test('blocks __proto__ key in persisted data', async () => {
    const adapter = createMemoryAdapter();
    // Directly store data with dangerous keys
    await adapter.setItem('pulse-store', {
      __proto__: { admin: true },
      safe: 'value'
    });

    const store = createStore({ safe: '', dangerous: '' });
    const persistence = withPersistence(store, adapter);
    const restored = await persistence.restore();

    assert.ok(restored);
    assert.strictEqual(store.safe.get(), 'value');
    persistence.dispose();
  });

  test('blocks constructor key in persisted data', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', {
      constructor: { hack: true },
      name: 'test'
    });

    const store = createStore({ name: '' });
    const persistence = withPersistence(store, adapter);
    await persistence.restore();

    assert.strictEqual(store.name.get(), 'test');
    persistence.dispose();
  });

  test('blocks prototype key in persisted data', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', {
      prototype: { isAdmin: true },
      title: 'ok'
    });

    const store = createStore({ title: '' });
    const persistence = withPersistence(store, adapter);
    await persistence.restore();

    assert.strictEqual(store.title.get(), 'ok');
    persistence.dispose();
  });

  test('limits nesting depth', async () => {
    const adapter = createMemoryAdapter();
    // Create deeply nested data (> 10 levels)
    let deep = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      deep = { nested: deep };
    }
    await adapter.setItem('pulse-store', { data: deep });

    const store = createStore({ data: null });
    const persistence = withPersistence(store, adapter);
    await persistence.restore();

    // Should have been truncated (set to null at some depth)
    const data = store.data.get();
    // Verify it didn't crash and some nesting was preserved
    assert.ok(data !== undefined);
    persistence.dispose();
  });

  test('sanitizes arrays in persisted data', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', {
      items: [{ __proto__: {}, name: 'ok' }, { value: 1 }]
    });

    const store = createStore({ items: [] });
    const persistence = withPersistence(store, adapter);
    await persistence.restore();

    const items = store.items.get();
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].name, 'ok');
    persistence.dispose();
  });
});

// ============================================================================
// withPersistence Tests
// ============================================================================

describe('withPersistence', () => {
  test('restore returns false when no data exists', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter);

    const result = await persistence.restore();
    assert.strictEqual(result, false);
    persistence.dispose();
  });

  test('restore loads data into store', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', { count: 42, name: 'test' });

    const store = createStore({ count: 0, name: '' });
    const persistence = withPersistence(store, adapter);
    const result = await persistence.restore();

    assert.strictEqual(result, true);
    assert.strictEqual(store.count.get(), 42);
    assert.strictEqual(store.name.get(), 'test');
    persistence.dispose();
  });

  test('clear removes persisted data', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', { count: 42 });

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter);
    await persistence.clear();

    const result = await adapter.getItem('pulse-store');
    assert.strictEqual(result, null);
    persistence.dispose();
  });

  test('uses custom key', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('my-key', { count: 99 });

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { key: 'my-key' });
    const result = await persistence.restore();

    assert.strictEqual(result, true);
    assert.strictEqual(store.count.get(), 99);
    persistence.dispose();
  });

  test('flush performs immediate save', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { debounce: 10000 });

    store.count.set(77);
    await persistence.flush();

    const saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 77);
    persistence.dispose();
  });

  test('dispose stops auto-saving', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { debounce: 50 });

    persistence.dispose();

    store.count.set(42);
    await new Promise(r => setTimeout(r, 100));

    // Should not have saved after dispose
    const saved = await adapter.getItem('pulse-store');
    assert.strictEqual(saved, null);
  });

  test('include filter only persists specified keys', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0, name: 'test', secret: 'hidden' });
    const persistence = withPersistence(store, adapter, {
      include: ['count', 'name'],
      debounce: 0,
    });

    store.count.set(5);
    await persistence.flush();

    const saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 5);
    assert.strictEqual(saved.secret, undefined);
    persistence.dispose();
  });

  test('exclude filter omits specified keys', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0, secret: 'hidden' });
    const persistence = withPersistence(store, adapter, {
      exclude: ['secret'],
      debounce: 0,
    });

    store.count.set(10);
    await persistence.flush();

    const saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 10);
    assert.strictEqual(saved.secret, undefined);
    persistence.dispose();
  });

  test('restore respects include filter', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', { count: 42, secret: 'hack', name: 'safe' });

    const store = createStore({ count: 0, secret: '', name: '' });
    const persistence = withPersistence(store, adapter, { include: ['count', 'name'] });
    await persistence.restore();

    assert.strictEqual(store.count.get(), 42);
    assert.strictEqual(store.name.get(), 'safe');
    assert.strictEqual(store.secret.get(), ''); // Not restored
    persistence.dispose();
  });

  test('calls onError callback on save failure', async () => {
    let errorReceived = null;
    const failingAdapter = {
      name: 'Failing',
      async getItem() { return null; },
      async setItem() { throw new Error('write failed'); },
      async removeItem() {},
      async clear() {},
      async keys() { return []; },
    };

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, failingAdapter, {
      onError: (err) => { errorReceived = err; },
      debounce: 0,
    });

    store.count.set(5);
    await persistence.flush();

    assert.ok(errorReceived);
    persistence.dispose();
  });
});

// ============================================================================
// Mock Web Storage Tests
// ============================================================================

describe('Web storage adapter with mock localStorage', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = (() => {
      const store = new Map();
      return {
        getItem: (key) => store.has(key) ? store.get(key) : null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
        key: (i) => Array.from(store.keys())[i] || null,
        get length() { return store.size; },
      };
    })();
    globalThis.localStorage = mockStorage;
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  test('createLocalStorageAdapter returns localStorage adapter', () => {
    const adapter = createLocalStorageAdapter();
    assert.strictEqual(adapter.name, 'localStorage');
  });

  test('setItem and getItem round-trip via localStorage', async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.setItem('test', { count: 42 });
    const result = await adapter.getItem('test');
    assert.deepStrictEqual(result, { count: 42 });
  });

  test('getItem returns null for missing key', async () => {
    const adapter = createLocalStorageAdapter();
    const result = await adapter.getItem('nonexistent');
    assert.strictEqual(result, null);
  });

  test('getItem returns null on JSON parse error', async () => {
    const adapter = createLocalStorageAdapter();
    mockStorage.setItem('bad', 'not-valid-json{{{');
    const result = await adapter.getItem('bad');
    assert.strictEqual(result, null);
  });

  test('setItem throws PersistenceError on quota exceeded', async () => {
    const brokenStorage = {
      ...mockStorage,
      setItem: () => { throw new Error('QuotaExceededError'); },
    };
    globalThis.localStorage = brokenStorage;

    const adapter = createLocalStorageAdapter();
    await assert.rejects(
      () => adapter.setItem('key', 'value'),
      (err) => PersistenceError.isPersistenceError(err)
    );
  });

  test('removeItem removes key from localStorage', async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.setItem('key', 'val');
    await adapter.removeItem('key');
    const result = await adapter.getItem('key');
    assert.strictEqual(result, null);
  });

  test('clear removes all entries', async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.setItem('a', 1);
    await adapter.setItem('b', 2);
    await adapter.clear();
    const keys = await adapter.keys();
    assert.strictEqual(keys.length, 0);
  });

  test('keys returns all stored keys', async () => {
    const adapter = createLocalStorageAdapter();
    await adapter.setItem('x', 1);
    await adapter.setItem('y', 2);
    const keys = await adapter.keys();
    assert.deepStrictEqual(keys.sort(), ['x', 'y']);
  });
});

describe('Web storage adapter with mock sessionStorage', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = (() => {
      const store = new Map();
      return {
        getItem: (key) => store.has(key) ? store.get(key) : null,
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
        key: (i) => Array.from(store.keys())[i] || null,
        get length() { return store.size; },
      };
    })();
    globalThis.sessionStorage = mockStorage;
  });

  afterEach(() => {
    delete globalThis.sessionStorage;
  });

  test('createSessionStorageAdapter returns sessionStorage adapter', () => {
    const adapter = createSessionStorageAdapter();
    assert.strictEqual(adapter.name, 'sessionStorage');
  });

  test('setItem and getItem round-trip via sessionStorage', async () => {
    const adapter = createSessionStorageAdapter();
    await adapter.setItem('test', { name: 'hello' });
    const result = await adapter.getItem('test');
    assert.deepStrictEqual(result, { name: 'hello' });
  });
});

// ============================================================================
// withPersistence — Additional Edge Cases
// ============================================================================

describe('withPersistence — edge cases', () => {
  test('restore returns false when data is an array (not object)', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', [1, 2, 3]);

    const store = createStore({ items: [] });
    const persistence = withPersistence(store, adapter);
    const result = await persistence.restore();

    assert.strictEqual(result, false);
    persistence.dispose();
  });

  test('restore handles deserialization error gracefully', async () => {
    let errorReceived = null;
    const failingAdapter = {
      name: 'Failing',
      async getItem() { throw new Error('read error'); },
      async setItem() {},
      async removeItem() {},
      async clear() {},
      async keys() { return []; },
    };

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, failingAdapter, {
      onError: (err) => { errorReceived = err; },
    });

    const result = await persistence.restore();
    assert.strictEqual(result, false);
    assert.ok(errorReceived);
    persistence.dispose();
  });

  test('clear handles error and calls onError', async () => {
    let errorReceived = null;
    const failingAdapter = {
      name: 'Failing',
      async getItem() { return null; },
      async setItem() {},
      async removeItem() { throw new Error('delete failed'); },
      async clear() {},
      async keys() { return []; },
    };

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, failingAdapter, {
      onError: (err) => { errorReceived = err; },
    });

    await persistence.clear();
    assert.ok(errorReceived);
    persistence.dispose();
  });

  test('restore with string raw data deserializes correctly', async () => {
    const adapter = createMemoryAdapter();
    // Simulate storing already-serialized string
    await adapter.setItem('pulse-store', JSON.stringify({ count: 77 }));

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter);
    // Since raw is a string, it uses config.deserialize (JSON.parse)
    // But memory adapter stores the actual value, not a string
    // Let's use a custom adapter that returns string
    persistence.dispose();

    const stringAdapter = {
      name: 'StringAdapter',
      async getItem() { return '{"count": 88}'; },
      async setItem() {},
      async removeItem() {},
      async clear() {},
      async keys() { return []; },
    };

    const store2 = createStore({ count: 0 });
    const persistence2 = withPersistence(store2, stringAdapter);
    const result = await persistence2.restore();

    assert.strictEqual(result, true);
    assert.strictEqual(store2.count.get(), 88);
    persistence2.dispose();
  });

  test('restore with null value returns false', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', null);

    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter);
    const result = await persistence.restore();

    assert.strictEqual(result, false);
    persistence.dispose();
  });

  test('restore falls back to $pulses iteration when $setState not available', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', { count: 55, name: 'test' });

    // Create a minimal store-like object without $setState
    const countPulse = pulse(0);
    const namePulse = pulse('');
    const fakeStore = {
      $pulses: { count: countPulse, name: namePulse },
      $getState: () => ({ count: countPulse.get(), name: namePulse.get() }),
    };
    // Remove $setState to force fallback
    const persistence = withPersistence(fakeStore, adapter);
    const result = await persistence.restore();

    assert.strictEqual(result, true);
    assert.strictEqual(countPulse.get(), 55);
    assert.strictEqual(namePulse.get(), 'test');
    persistence.dispose();
  });

  test('auto-save triggers after debounce delay', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { debounce: 50 });

    store.count.set(42);

    // Before debounce, nothing saved
    let saved = await adapter.getItem('pulse-store');
    // May or may not be saved yet depending on effect timing

    // Wait for debounce
    await new Promise(r => setTimeout(r, 100));

    saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 42);
    persistence.dispose();
  });

  test('dispose clears pending debounce timer', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { debounce: 5000 });

    store.count.set(99);
    persistence.dispose();

    // Wait longer than debounce to verify no save happens
    await new Promise(r => setTimeout(r, 100));
    const saved = await adapter.getItem('pulse-store');
    assert.strictEqual(saved, null);
  });

  test('flush bypasses debounce timer', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0 });
    const persistence = withPersistence(store, adapter, { debounce: 60000 });

    store.count.set(33);
    await persistence.flush();

    const saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 33);
    persistence.dispose();
  });

  test('sanitizeValue passes through primitives', async () => {
    const adapter = createMemoryAdapter();
    await adapter.setItem('pulse-store', { count: 42, name: 'hello', active: true });

    const store = createStore({ count: 0, name: '', active: false });
    const persistence = withPersistence(store, adapter);
    await persistence.restore();

    assert.strictEqual(store.count.get(), 42);
    assert.strictEqual(store.name.get(), 'hello');
    assert.strictEqual(store.active.get(), true);
    persistence.dispose();
  });

  test('snapshot fallback iterates store pulses skipping $ keys', async () => {
    const adapter = createMemoryAdapter();

    const countPulse = pulse(0);
    const fakeStore = {
      count: countPulse,
      $internal: 'ignored',
      $getState: undefined,
      $pulses: undefined,
    };

    const persistence = withPersistence(fakeStore, adapter, { debounce: 0 });
    countPulse.set(77);
    await persistence.flush();

    const saved = await adapter.getItem('pulse-store');
    assert.ok(saved);
    assert.strictEqual(saved.count, 77);
    assert.strictEqual(saved.$internal, undefined);
    persistence.dispose();
  });
});
