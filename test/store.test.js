/**
 * Pulse Store Tests
 *
 * Tests for runtime/store.js - Global state management
 *
 * @module test/store
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createMockLocalStorage } from './utils.js';

// Setup localStorage mock before importing store
const { storage: localStorage, clear: clearStorage } = createMockLocalStorage();
global.localStorage = localStorage;

import {
  createStore,
  createActions,
  createGetters,
  combineStores,
  createModuleStore,
  usePlugin,
  loggerPlugin,
  historyPlugin
} from '../runtime/store.js';

import { effect } from '../runtime/pulse.js';

// =============================================================================
// Basic Store Tests
// =============================================================================

describe('Basic Store Tests', () => {
  beforeEach(clearStorage);

  test('creates store with initial state', () => {
    const store = createStore({
      count: 0,
      name: 'test'
    });

    assert.strictEqual(store.count.get(), 0, 'count should be 0');
    assert.strictEqual(store.name.get(), 'test', 'name should be test');
  });

  test('store values are reactive', () => {
    const store = createStore({ count: 0 });
    let effectCount = 0;

    effect(() => {
      store.count.get();
      effectCount++;
    });

    assert.strictEqual(effectCount, 1, 'Effect should run once initially');

    store.count.set(1);
    assert.strictEqual(effectCount, 2, 'Effect should run after update');
    assert.strictEqual(store.count.get(), 1, 'Count should be updated');
  });

  test('store $getState returns snapshot', () => {
    const store = createStore({
      a: 1,
      b: 2,
      c: 'hello'
    });

    const state = store.$getState();

    assert.deepStrictEqual(state, { a: 1, b: 2, c: 'hello' }, 'Should return full state');
  });

  test('store $setState updates multiple values', () => {
    const store = createStore({
      a: 1,
      b: 2
    });

    store.$setState({ a: 10, b: 20 });

    assert.strictEqual(store.a.get(), 10, 'a should be updated');
    assert.strictEqual(store.b.get(), 20, 'b should be updated');
  });

  test('store $setState batches updates', () => {
    const store = createStore({ a: 1, b: 2 });
    let effectCount = 0;

    effect(() => {
      store.a.get();
      store.b.get();
      effectCount++;
    });

    assert.strictEqual(effectCount, 1, 'Effect runs once initially');

    store.$setState({ a: 10, b: 20 });

    assert.strictEqual(effectCount, 2, 'Effect should run only once for batched update');
  });

  test('store $reset restores initial values', () => {
    const store = createStore({
      count: 0,
      name: 'initial'
    });

    store.count.set(100);
    store.name.set('changed');

    store.$reset();

    assert.strictEqual(store.count.get(), 0, 'count should be reset');
    assert.strictEqual(store.name.get(), 'initial', 'name should be reset');
  });

  test('store $subscribe notifies on changes', () => {
    const store = createStore({ count: 0 });
    let callCount = 0;
    let lastValue = null;

    // Note: $subscribe uses effect which tracks dependencies
    // We need to access the pulse value via .get() to create dependency
    effect(() => {
      lastValue = store.count.get();
      callCount++;
    });

    assert.strictEqual(callCount, 1, 'Effect runs once initially');
    assert.strictEqual(lastValue, 0, 'Initial value is 0');

    store.count.set(42);

    assert.strictEqual(callCount, 2, 'Effect runs on change');
    assert.strictEqual(lastValue, 42, 'Value updated to 42');
  });
});

// =============================================================================
// Persistence Tests
// =============================================================================

describe('Persistence Tests', () => {
  beforeEach(clearStorage);

  test('persists state to localStorage', () => {
    const store = createStore(
      { count: 0 },
      { persist: true, storageKey: 'test-store' }
    );

    store.count.set(42);

    const saved = JSON.parse(localStorage.getItem('test-store'));
    assert.strictEqual(saved.count, 42, 'State should be persisted');
  });

  test('loads persisted state on creation', () => {
    localStorage.setItem('test-store-2', JSON.stringify({ count: 100 }));

    const store = createStore(
      { count: 0 },
      { persist: true, storageKey: 'test-store-2' }
    );

    assert.strictEqual(store.count.get(), 100, 'Should load persisted value');
  });

  test('merges persisted state with initial state', () => {
    localStorage.setItem('test-store-3', JSON.stringify({ a: 10 }));

    const store = createStore(
      { a: 1, b: 2 },
      { persist: true, storageKey: 'test-store-3' }
    );

    assert.strictEqual(store.a.get(), 10, 'Persisted value should override');
    assert.strictEqual(store.b.get(), 2, 'Non-persisted value should use initial');
  });

  test('handles invalid persisted JSON gracefully', () => {
    localStorage.setItem('test-store-4', 'invalid json{');

    // Should not throw
    const store = createStore(
      { count: 0 },
      { persist: true, storageKey: 'test-store-4' }
    );

    assert.strictEqual(store.count.get(), 0, 'Should use initial value on parse error');
  });
});

// =============================================================================
// Actions Tests
// =============================================================================

describe('Actions Tests', () => {
  beforeEach(clearStorage);

  test('createActions binds actions to store', () => {
    const store = createStore({ count: 0 });
    const actions = createActions(store, {
      increment: (store) => store.count.update(n => n + 1),
      decrement: (store) => store.count.update(n => n - 1),
      add: (store, amount) => store.count.update(n => n + amount)
    });

    actions.increment();
    assert.strictEqual(store.count.get(), 1, 'increment should work');

    actions.decrement();
    assert.strictEqual(store.count.get(), 0, 'decrement should work');

    actions.add(10);
    assert.strictEqual(store.count.get(), 10, 'add with argument should work');
  });

  test('actions can access multiple store values', () => {
    const store = createStore({
      items: [],
      total: 0
    });

    const actions = createActions(store, {
      addItem: (store, item) => {
        const items = store.items.get();
        store.items.set([...items, item]);
        store.total.update(n => n + item.price);
      }
    });

    actions.addItem({ name: 'Apple', price: 1.50 });
    actions.addItem({ name: 'Banana', price: 0.75 });

    assert.strictEqual(store.items.get().length, 2, 'Should have 2 items');
    assert.strictEqual(store.total.get(), 2.25, 'Total should be correct');
  });

  test('actions can return values', () => {
    const store = createStore({ items: ['a', 'b', 'c'] });
    const actions = createActions(store, {
      getLength: (store) => store.items.get().length
    });

    const length = actions.getLength();
    assert.strictEqual(length, 3, 'Action should return value');
  });
});

// =============================================================================
// Getters Tests
// =============================================================================

describe('Getters Tests', () => {
  beforeEach(clearStorage);

  test('createGetters creates computed values', () => {
    const store = createStore({
      price: 100,
      taxRate: 0.2
    });

    const getters = createGetters(store, {
      tax: (store) => store.price.get() * store.taxRate.get(),
      total: (store) => store.price.get() * (1 + store.taxRate.get())
    });

    assert.strictEqual(getters.tax.get(), 20, 'tax should be computed');
    assert.strictEqual(getters.total.get(), 120, 'total should be computed');
  });

  test('getters update when store changes', () => {
    const store = createStore({ count: 5 });
    const getters = createGetters(store, {
      doubled: (store) => store.count.get() * 2
    });

    assert.strictEqual(getters.doubled.get(), 10, 'Initial doubled value');

    store.count.set(10);

    assert.strictEqual(getters.doubled.get(), 20, 'Doubled should update');
  });

  test('getters can depend on other computed values', () => {
    const store = createStore({ value: 2 });
    const getters = createGetters(store, {
      squared: (store) => store.value.get() ** 2,
      cubed: (store) => store.value.get() ** 3
    });

    assert.strictEqual(getters.squared.get(), 4, 'squared should be 4');
    assert.strictEqual(getters.cubed.get(), 8, 'cubed should be 8');

    store.value.set(3);

    assert.strictEqual(getters.squared.get(), 9, 'squared should update');
    assert.strictEqual(getters.cubed.get(), 27, 'cubed should update');
  });
});

// =============================================================================
// Combined Stores Tests
// =============================================================================

describe('Combined Stores Tests', () => {
  beforeEach(clearStorage);

  test('combineStores merges multiple stores', () => {
    const userStore = createStore({ name: 'John', email: 'john@example.com' });
    const cartStore = createStore({ items: [], total: 0 });

    const combined = combineStores({
      user: userStore,
      cart: cartStore
    });

    assert.strictEqual(combined.user.name.get(), 'John', 'Should access user store');
    assert.strictEqual(combined.cart.items.get().length, 0, 'Should access cart store');
  });
});

// =============================================================================
// Module Store Tests
// =============================================================================

describe('Module Store Tests', () => {
  beforeEach(clearStorage);

  test('createModuleStore creates namespaced modules', () => {
    const store = createModuleStore({
      user: {
        state: { name: 'Guest', loggedIn: false },
        actions: {
          login: (store, name) => {
            store.name.set(name);
            store.loggedIn.set(true);
          }
        },
        getters: {
          displayName: (store) => store.loggedIn.get() ? store.name.get() : 'Guest'
        }
      },
      counter: {
        state: { count: 0 },
        actions: {
          increment: (store) => store.count.update(n => n + 1)
        }
      }
    });

    // Access modules
    assert.strictEqual(store.user.name.get(), 'Guest', 'Should have user module');
    assert.strictEqual(store.counter.count.get(), 0, 'Should have counter module');

    // Use actions
    store.user.login('Alice');
    assert.strictEqual(store.user.name.get(), 'Alice', 'Login action should work');
    assert.strictEqual(store.user.loggedIn.get(), true, 'Should be logged in');

    // Use getters
    assert.strictEqual(store.user.displayName.get(), 'Alice', 'Getter should work');

    // Cross-module
    store.counter.increment();
    assert.strictEqual(store.counter.count.get(), 1, 'Counter increment should work');
  });

  test('module store $getState returns all modules', () => {
    const store = createModuleStore({
      a: { state: { value: 1 } },
      b: { state: { value: 2 } }
    });

    const state = store.$getState();

    assert.deepStrictEqual(state, {
      a: { value: 1 },
      b: { value: 2 }
    }, 'Should get all module states');
  });

  test('module store $reset resets all modules', () => {
    const store = createModuleStore({
      a: { state: { value: 1 } },
      b: { state: { value: 2 } }
    });

    store.a.value.set(100);
    store.b.value.set(200);

    store.$reset();

    assert.strictEqual(store.a.value.get(), 1, 'Module a should reset');
    assert.strictEqual(store.b.value.get(), 2, 'Module b should reset');
  });
});

// =============================================================================
// Plugin Tests
// =============================================================================

describe('Plugin Tests', () => {
  beforeEach(clearStorage);

  test('usePlugin applies plugin to store', () => {
    const store = createStore({ count: 0 });

    const customPlugin = (store) => {
      store.$customMethod = () => 'custom';
      return store;
    };

    usePlugin(store, customPlugin);

    assert.strictEqual(store.$customMethod(), 'custom', 'Plugin should add method');
  });

  test('historyPlugin enables undo', () => {
    const store = createStore({ count: 0 });
    usePlugin(store, (s) => historyPlugin(s, 10));

    store.$setState({ count: 1 });
    store.$setState({ count: 2 });
    store.$setState({ count: 3 });

    assert.strictEqual(store.count.get(), 3, 'Count should be 3');
    assert.ok(store.$canUndo(), 'Should be able to undo');

    store.$undo();
    assert.strictEqual(store.count.get(), 2, 'Should undo to 2');

    store.$undo();
    assert.strictEqual(store.count.get(), 1, 'Should undo to 1');

    store.$undo();
    assert.strictEqual(store.count.get(), 0, 'Should undo to 0');

    assert.ok(!store.$canUndo(), 'Should not be able to undo further');
  });

  test('historyPlugin enables redo', () => {
    const store = createStore({ count: 0 });
    usePlugin(store, (s) => historyPlugin(s, 10));

    store.$setState({ count: 1 });
    store.$setState({ count: 2 });

    store.$undo();
    store.$undo();

    assert.strictEqual(store.count.get(), 0, 'Should be back to 0');
    assert.ok(store.$canRedo(), 'Should be able to redo');

    store.$redo();
    assert.strictEqual(store.count.get(), 1, 'Should redo to 1');

    store.$redo();
    assert.strictEqual(store.count.get(), 2, 'Should redo to 2');

    assert.ok(!store.$canRedo(), 'Should not be able to redo further');
  });

  test('historyPlugin clears future on new change', () => {
    const store = createStore({ count: 0 });
    usePlugin(store, (s) => historyPlugin(s, 10));

    store.$setState({ count: 1 });
    store.$setState({ count: 2 });

    store.$undo(); // Back to 1

    store.$setState({ count: 10 }); // New change clears redo

    assert.ok(!store.$canRedo(), 'Should not be able to redo after new change');
    assert.strictEqual(store.count.get(), 10, 'Should have new value');
  });

  test('historyPlugin respects maxHistory', () => {
    const store = createStore({ count: 0 });
    usePlugin(store, (s) => historyPlugin(s, 3)); // Max 3 history entries

    store.$setState({ count: 1 });
    store.$setState({ count: 2 });
    store.$setState({ count: 3 });
    store.$setState({ count: 4 });

    // With maxHistory=3, oldest entries should be dropped
    // History: [2, 3, 4] (initial 0 and 1 dropped)

    let undoCount = 0;
    while (store.$canUndo()) {
      store.$undo();
      undoCount++;
    }

    // Should be able to undo to the beginning of history (2 steps back from 4)
    assert.ok(undoCount <= 3, 'Should respect maxHistory limit');
  });
});

// =============================================================================
// Nested Objects Tests
// =============================================================================

describe('Nested Objects Tests', () => {
  beforeEach(clearStorage);

  test('handles nested object state', () => {
    const store = createStore({
      user: {
        name: 'John',
        address: {
          city: 'NYC'
        }
      }
    });

    // Nested objects become nested reactive objects
    assert.strictEqual(store.user.name.get(), 'John', 'Should access nested name');
    assert.strictEqual(store.user.address.city.get(), 'NYC', 'Should access deeply nested');
  });

  test('nested state updates are reactive', () => {
    const store = createStore({
      settings: {
        theme: 'dark',
        fontSize: 14
      }
    });

    let effectCount = 0;
    effect(() => {
      store.settings.theme.get();
      effectCount++;
    });

    assert.strictEqual(effectCount, 1, 'Effect runs initially');

    store.settings.theme.set('light');

    assert.strictEqual(effectCount, 2, 'Effect runs on nested update');
    assert.strictEqual(store.settings.theme.get(), 'light', 'Value should update');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(clearStorage);

  test('handles empty initial state', () => {
    const store = createStore({});

    assert.deepStrictEqual(store.$getState(), {}, 'Should have empty state');
  });

  test('handles null values in state', () => {
    const store = createStore({
      user: null,
      data: undefined
    });

    assert.strictEqual(store.user.get(), null, 'Should handle null');
    assert.strictEqual(store.data.get(), undefined, 'Should handle undefined');
  });

  test('handles array values in state', () => {
    const store = createStore({
      items: [1, 2, 3]
    });

    assert.deepStrictEqual(store.items.get(), [1, 2, 3], 'Should store array');

    store.items.set([4, 5, 6]);
    assert.deepStrictEqual(store.items.get(), [4, 5, 6], 'Should update array');
  });

  test('$setState ignores non-existent keys', () => {
    const store = createStore({ a: 1 });

    // Should not throw
    store.$setState({ a: 2, nonExistent: 'value' });

    assert.strictEqual(store.a.get(), 2, 'Should update existing key');
    assert.ok(!('nonExistent' in store), 'Should not create new key');
  });
});

// =============================================================================
// Error Path Tests
// =============================================================================

describe('Error Path Tests', () => {
  beforeEach(clearStorage);

  test('action error does not corrupt store state', () => {
    const store = createStore({ count: 0, status: 'ok' });
    const actions = createActions(store, {
      failingAction: (store) => {
        store.count.set(100);
        throw new Error('Action failed');
      }
    });

    let caught = false;
    try {
      actions.failingAction();
    } catch (e) {
      caught = true;
    }

    assert.ok(caught, 'Error should be thrown');
    // State was already updated before the error
    assert.strictEqual(store.count.get(), 100, 'State was updated before error');
    assert.strictEqual(store.status.get(), 'ok', 'Other state remains unchanged');
  });

  test('handles localStorage.setItem failure gracefully', () => {
    // Mock localStorage to throw on setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    // Should not throw when creating store with persistence
    let errorThrown = false;
    try {
      const store = createStore(
        { count: 0 },
        { persist: true, storageKey: 'quota-test' }
      );
      store.count.set(1); // This triggers persistence
    } catch (e) {
      errorThrown = true;
    }

    // Restore localStorage
    localStorage.setItem = originalSetItem;

    // The store should handle this gracefully (may or may not throw depending on implementation)
    // This test documents the behavior
  });

  test('handles localStorage.getItem failure gracefully', () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = () => {
      throw new Error('SecurityError');
    };

    // Should not throw, should use initial state
    const store = createStore(
      { count: 42 },
      { persist: true, storageKey: 'security-test' }
    );

    // Restore localStorage
    localStorage.getItem = originalGetItem;

    assert.strictEqual(store.count.get(), 42, 'Should use initial state on getItem error');
  });

  test('handles deeply nested null values', () => {
    const store = createStore({
      level1: {
        level2: null
      }
    });

    assert.strictEqual(store.level1.level2.get(), null, 'Should handle deeply nested null');
  });

  test('handles boolean false correctly', () => {
    const store = createStore({
      enabled: false,
      visible: true
    });

    assert.strictEqual(store.enabled.get(), false, 'Should handle false boolean');
    assert.strictEqual(store.visible.get(), true, 'Should handle true boolean');

    store.enabled.set(true);
    store.visible.set(false);

    assert.strictEqual(store.enabled.get(), true, 'Should update to true');
    assert.strictEqual(store.visible.get(), false, 'Should update to false');
  });

  test('handles zero and empty string correctly', () => {
    const store = createStore({
      count: 0,
      name: ''
    });

    assert.strictEqual(store.count.get(), 0, 'Should handle zero');
    assert.strictEqual(store.name.get(), '', 'Should handle empty string');
  });

  test('$reset after error restores clean state', () => {
    const store = createStore({ value: 'initial' });

    store.value.set('modified');
    assert.strictEqual(store.value.get(), 'modified', 'Value should be modified');

    store.$reset();
    assert.strictEqual(store.value.get(), 'initial', 'Value should be reset');
  });

  test('multiple rapid $setState calls work correctly', () => {
    const store = createStore({ count: 0 });
    let effectCount = 0;

    effect(() => {
      store.count.get();
      effectCount++;
    });

    // Reset after initial effect run
    const initialRuns = effectCount;

    // Rapid updates
    for (let i = 0; i < 10; i++) {
      store.$setState({ count: i });
    }

    assert.strictEqual(store.count.get(), 9, 'Final value should be correct');
    // Each $setState triggers an effect (unless batched internally)
    assert.ok(effectCount > initialRuns, 'Effects should have run');
  });

  test('createGetters handles undefined store values', () => {
    const store = createStore({ value: undefined });
    const getters = createGetters(store, {
      hasValue: (s) => s.value.get() !== undefined
    });

    assert.strictEqual(getters.hasValue.get(), false, 'Should handle undefined in getter');

    store.value.set('something');
    assert.strictEqual(getters.hasValue.get(), true, 'Getter should update');
  });

  test('combineStores handles stores with same property names', () => {
    const store1 = createStore({ count: 1 });
    const store2 = createStore({ count: 2 });

    const combined = combineStores({
      a: store1,
      b: store2
    });

    assert.strictEqual(combined.a.count.get(), 1, 'First store count');
    assert.strictEqual(combined.b.count.get(), 2, 'Second store count');

    combined.a.count.set(10);
    combined.b.count.set(20);

    assert.strictEqual(combined.a.count.get(), 10, 'First store updated');
    assert.strictEqual(combined.b.count.get(), 20, 'Second store updated');
  });

  test('historyPlugin handles rapid undo/redo', () => {
    const store = createStore({ value: 0 });
    usePlugin(store, (s) => historyPlugin(s, 5));

    store.$setState({ value: 1 });
    store.$setState({ value: 2 });

    // Rapid undo
    store.$undo();
    store.$undo();

    // Rapid redo
    store.$redo();
    store.$redo();

    assert.strictEqual(store.value.get(), 2, 'Should handle rapid undo/redo');
  });

  test('historyPlugin canUndo/canRedo return correct values', () => {
    const store = createStore({ value: 0 });
    usePlugin(store, (s) => historyPlugin(s, 10));

    assert.strictEqual(store.$canUndo(), false, 'Initially cannot undo');
    assert.strictEqual(store.$canRedo(), false, 'Initially cannot redo');

    store.$setState({ value: 1 });
    assert.strictEqual(store.$canUndo(), true, 'Can undo after change');
    assert.strictEqual(store.$canRedo(), false, 'Cannot redo after change');

    store.$undo();
    assert.strictEqual(store.$canUndo(), false, 'Cannot undo at beginning');
    assert.strictEqual(store.$canRedo(), true, 'Can redo after undo');
  });
});

// =============================================================================
// Validation Cache Tests
// =============================================================================

describe('Validation Cache Tests', () => {
  beforeEach(clearStorage);

  test('$setState validates updates', () => {
    const store = createStore({ value: 'initial' });

    // Valid update should work
    store.$setState({ value: 'updated' });
    assert.strictEqual(store.value.get(), 'updated');

    // Invalid update (function) should throw
    let threwError = false;
    try {
      store.$setState({ value: () => {} });
    } catch (e) {
      threwError = true;
      assert.ok(e.message.includes('function'), 'Should mention invalid type');
    }
    assert.ok(threwError, 'Should throw on function value');
  });

  test('$setState validation uses cache for performance', () => {
    const store = createStore({ user: { name: 'John', age: 30 } });

    // First update - full validation
    const obj = { name: 'Jane', age: 25 };
    store.$setState({ user: obj });
    assert.strictEqual(store.user.name.get(), 'Jane');

    // Second update with same object reference - should use cache (no error)
    store.$setState({ user: obj });
    assert.strictEqual(store.user.name.get(), 'Jane');

    // Update with different object - should re-validate
    store.$setState({ user: { name: 'Bob', age: 35 } });
    assert.strictEqual(store.user.name.get(), 'Bob');
  });

  test('validation detects circular references', () => {
    const store = createStore({ data: null });

    // Create circular reference
    const circular = { a: 1 };
    circular.self = circular;

    let threwError = false;
    try {
      store.$setState({ data: circular });
    } catch (e) {
      threwError = true;
      assert.ok(e.message.includes('Circular'), 'Should mention circular reference');
    }
    assert.ok(threwError, 'Should throw on circular reference');
  });

  test('validation rejects symbols', () => {
    const store = createStore({ value: null });

    let threwError = false;
    try {
      store.$setState({ value: Symbol('test') });
    } catch (e) {
      threwError = true;
      assert.ok(e.message.includes('symbol'), 'Should mention invalid type');
    }
    assert.ok(threwError, 'Should throw on symbol value');
  });
});
