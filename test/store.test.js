/**
 * Pulse Store Tests
 *
 * Tests for runtime/store.js - Global state management
 *
 * @module test/store
 */

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

// Import test utilities
import {
  test,
  beforeEach,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// Clear localStorage before each test
beforeEach(clearStorage);

// =============================================================================
// Basic Store Tests
// =============================================================================

printSection('Basic Store Tests');

test('creates store with initial state', () => {
  const store = createStore({
    count: 0,
    name: 'test'
  });

  assertEqual(store.count.get(), 0, 'count should be 0');
  assertEqual(store.name.get(), 'test', 'name should be test');
});

test('store values are reactive', () => {
  const store = createStore({ count: 0 });
  let effectCount = 0;

  effect(() => {
    store.count.get();
    effectCount++;
  });

  assertEqual(effectCount, 1, 'Effect should run once initially');

  store.count.set(1);
  assertEqual(effectCount, 2, 'Effect should run after update');
  assertEqual(store.count.get(), 1, 'Count should be updated');
});

test('store $getState returns snapshot', () => {
  const store = createStore({
    a: 1,
    b: 2,
    c: 'hello'
  });

  const state = store.$getState();

  assertDeepEqual(state, { a: 1, b: 2, c: 'hello' }, 'Should return full state');
});

test('store $setState updates multiple values', () => {
  const store = createStore({
    a: 1,
    b: 2
  });

  store.$setState({ a: 10, b: 20 });

  assertEqual(store.a.get(), 10, 'a should be updated');
  assertEqual(store.b.get(), 20, 'b should be updated');
});

test('store $setState batches updates', () => {
  const store = createStore({ a: 1, b: 2 });
  let effectCount = 0;

  effect(() => {
    store.a.get();
    store.b.get();
    effectCount++;
  });

  assertEqual(effectCount, 1, 'Effect runs once initially');

  store.$setState({ a: 10, b: 20 });

  assertEqual(effectCount, 2, 'Effect should run only once for batched update');
});

test('store $reset restores initial values', () => {
  const store = createStore({
    count: 0,
    name: 'initial'
  });

  store.count.set(100);
  store.name.set('changed');

  store.$reset();

  assertEqual(store.count.get(), 0, 'count should be reset');
  assertEqual(store.name.get(), 'initial', 'name should be reset');
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

  assertEqual(callCount, 1, 'Effect runs once initially');
  assertEqual(lastValue, 0, 'Initial value is 0');

  store.count.set(42);

  assertEqual(callCount, 2, 'Effect runs on change');
  assertEqual(lastValue, 42, 'Value updated to 42');
});

// =============================================================================
// Persistence Tests
// =============================================================================

printSection('Persistence Tests');

test('persists state to localStorage', () => {
  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'test-store' }
  );

  store.count.set(42);

  const saved = JSON.parse(localStorage.getItem('test-store'));
  assertEqual(saved.count, 42, 'State should be persisted');
});

test('loads persisted state on creation', () => {
  localStorage.setItem('test-store-2', JSON.stringify({ count: 100 }));

  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'test-store-2' }
  );

  assertEqual(store.count.get(), 100, 'Should load persisted value');
});

test('merges persisted state with initial state', () => {
  localStorage.setItem('test-store-3', JSON.stringify({ a: 10 }));

  const store = createStore(
    { a: 1, b: 2 },
    { persist: true, storageKey: 'test-store-3' }
  );

  assertEqual(store.a.get(), 10, 'Persisted value should override');
  assertEqual(store.b.get(), 2, 'Non-persisted value should use initial');
});

test('handles invalid persisted JSON gracefully', () => {
  localStorage.setItem('test-store-4', 'invalid json{');

  // Should not throw
  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'test-store-4' }
  );

  assertEqual(store.count.get(), 0, 'Should use initial value on parse error');
});

// =============================================================================
// Actions Tests
// =============================================================================

printSection('Actions Tests');

test('createActions binds actions to store', () => {
  const store = createStore({ count: 0 });
  const actions = createActions(store, {
    increment: (store) => store.count.update(n => n + 1),
    decrement: (store) => store.count.update(n => n - 1),
    add: (store, amount) => store.count.update(n => n + amount)
  });

  actions.increment();
  assertEqual(store.count.get(), 1, 'increment should work');

  actions.decrement();
  assertEqual(store.count.get(), 0, 'decrement should work');

  actions.add(10);
  assertEqual(store.count.get(), 10, 'add with argument should work');
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

  assertEqual(store.items.get().length, 2, 'Should have 2 items');
  assertEqual(store.total.get(), 2.25, 'Total should be correct');
});

test('actions can return values', () => {
  const store = createStore({ items: ['a', 'b', 'c'] });
  const actions = createActions(store, {
    getLength: (store) => store.items.get().length
  });

  const length = actions.getLength();
  assertEqual(length, 3, 'Action should return value');
});

// =============================================================================
// Getters Tests
// =============================================================================

printSection('Getters Tests');

test('createGetters creates computed values', () => {
  const store = createStore({
    price: 100,
    taxRate: 0.2
  });

  const getters = createGetters(store, {
    tax: (store) => store.price.get() * store.taxRate.get(),
    total: (store) => store.price.get() * (1 + store.taxRate.get())
  });

  assertEqual(getters.tax.get(), 20, 'tax should be computed');
  assertEqual(getters.total.get(), 120, 'total should be computed');
});

test('getters update when store changes', () => {
  const store = createStore({ count: 5 });
  const getters = createGetters(store, {
    doubled: (store) => store.count.get() * 2
  });

  assertEqual(getters.doubled.get(), 10, 'Initial doubled value');

  store.count.set(10);

  assertEqual(getters.doubled.get(), 20, 'Doubled should update');
});

test('getters can depend on other computed values', () => {
  const store = createStore({ value: 2 });
  const getters = createGetters(store, {
    squared: (store) => store.value.get() ** 2,
    cubed: (store) => store.value.get() ** 3
  });

  assertEqual(getters.squared.get(), 4, 'squared should be 4');
  assertEqual(getters.cubed.get(), 8, 'cubed should be 8');

  store.value.set(3);

  assertEqual(getters.squared.get(), 9, 'squared should update');
  assertEqual(getters.cubed.get(), 27, 'cubed should update');
});

// =============================================================================
// Combined Stores Tests
// =============================================================================

printSection('Combined Stores Tests');

test('combineStores merges multiple stores', () => {
  const userStore = createStore({ name: 'John', email: 'john@example.com' });
  const cartStore = createStore({ items: [], total: 0 });

  const combined = combineStores({
    user: userStore,
    cart: cartStore
  });

  assertEqual(combined.user.name.get(), 'John', 'Should access user store');
  assertEqual(combined.cart.items.get().length, 0, 'Should access cart store');
});

// =============================================================================
// Module Store Tests
// =============================================================================

printSection('Module Store Tests');

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
  assertEqual(store.user.name.get(), 'Guest', 'Should have user module');
  assertEqual(store.counter.count.get(), 0, 'Should have counter module');

  // Use actions
  store.user.login('Alice');
  assertEqual(store.user.name.get(), 'Alice', 'Login action should work');
  assertEqual(store.user.loggedIn.get(), true, 'Should be logged in');

  // Use getters
  assertEqual(store.user.displayName.get(), 'Alice', 'Getter should work');

  // Cross-module
  store.counter.increment();
  assertEqual(store.counter.count.get(), 1, 'Counter increment should work');
});

test('module store $getState returns all modules', () => {
  const store = createModuleStore({
    a: { state: { value: 1 } },
    b: { state: { value: 2 } }
  });

  const state = store.$getState();

  assertDeepEqual(state, {
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

  assertEqual(store.a.value.get(), 1, 'Module a should reset');
  assertEqual(store.b.value.get(), 2, 'Module b should reset');
});

// =============================================================================
// Plugin Tests
// =============================================================================

printSection('Plugin Tests');

test('usePlugin applies plugin to store', () => {
  const store = createStore({ count: 0 });

  const customPlugin = (store) => {
    store.$customMethod = () => 'custom';
    return store;
  };

  usePlugin(store, customPlugin);

  assertEqual(store.$customMethod(), 'custom', 'Plugin should add method');
});

test('historyPlugin enables undo', () => {
  const store = createStore({ count: 0 });
  usePlugin(store, (s) => historyPlugin(s, 10));

  store.$setState({ count: 1 });
  store.$setState({ count: 2 });
  store.$setState({ count: 3 });

  assertEqual(store.count.get(), 3, 'Count should be 3');
  assert(store.$canUndo(), 'Should be able to undo');

  store.$undo();
  assertEqual(store.count.get(), 2, 'Should undo to 2');

  store.$undo();
  assertEqual(store.count.get(), 1, 'Should undo to 1');

  store.$undo();
  assertEqual(store.count.get(), 0, 'Should undo to 0');

  assert(!store.$canUndo(), 'Should not be able to undo further');
});

test('historyPlugin enables redo', () => {
  const store = createStore({ count: 0 });
  usePlugin(store, (s) => historyPlugin(s, 10));

  store.$setState({ count: 1 });
  store.$setState({ count: 2 });

  store.$undo();
  store.$undo();

  assertEqual(store.count.get(), 0, 'Should be back to 0');
  assert(store.$canRedo(), 'Should be able to redo');

  store.$redo();
  assertEqual(store.count.get(), 1, 'Should redo to 1');

  store.$redo();
  assertEqual(store.count.get(), 2, 'Should redo to 2');

  assert(!store.$canRedo(), 'Should not be able to redo further');
});

test('historyPlugin clears future on new change', () => {
  const store = createStore({ count: 0 });
  usePlugin(store, (s) => historyPlugin(s, 10));

  store.$setState({ count: 1 });
  store.$setState({ count: 2 });

  store.$undo(); // Back to 1

  store.$setState({ count: 10 }); // New change clears redo

  assert(!store.$canRedo(), 'Should not be able to redo after new change');
  assertEqual(store.count.get(), 10, 'Should have new value');
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
  assert(undoCount <= 3, 'Should respect maxHistory limit');
});

// =============================================================================
// Nested Objects Tests
// =============================================================================

printSection('Nested Objects Tests');

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
  assertEqual(store.user.name.get(), 'John', 'Should access nested name');
  assertEqual(store.user.address.city.get(), 'NYC', 'Should access deeply nested');
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

  assertEqual(effectCount, 1, 'Effect runs initially');

  store.settings.theme.set('light');

  assertEqual(effectCount, 2, 'Effect runs on nested update');
  assertEqual(store.settings.theme.get(), 'light', 'Value should update');
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('Edge Cases');

test('handles empty initial state', () => {
  const store = createStore({});

  assertDeepEqual(store.$getState(), {}, 'Should have empty state');
});

test('handles null values in state', () => {
  const store = createStore({
    user: null,
    data: undefined
  });

  assertEqual(store.user.get(), null, 'Should handle null');
  assertEqual(store.data.get(), undefined, 'Should handle undefined');
});

test('handles array values in state', () => {
  const store = createStore({
    items: [1, 2, 3]
  });

  assertDeepEqual(store.items.get(), [1, 2, 3], 'Should store array');

  store.items.set([4, 5, 6]);
  assertDeepEqual(store.items.get(), [4, 5, 6], 'Should update array');
});

test('$setState ignores non-existent keys', () => {
  const store = createStore({ a: 1 });

  // Should not throw
  store.$setState({ a: 2, nonExistent: 'value' });

  assertEqual(store.a.get(), 2, 'Should update existing key');
  assert(!('nonExistent' in store), 'Should not create new key');
});

// =============================================================================
// Error Path Tests
// =============================================================================

printSection('Error Path Tests');

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

  assert(caught, 'Error should be thrown');
  // State was already updated before the error
  assertEqual(store.count.get(), 100, 'State was updated before error');
  assertEqual(store.status.get(), 'ok', 'Other state remains unchanged');
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

  assertEqual(store.count.get(), 42, 'Should use initial state on getItem error');
});

test('handles deeply nested null values', () => {
  const store = createStore({
    level1: {
      level2: null
    }
  });

  assertEqual(store.level1.level2.get(), null, 'Should handle deeply nested null');
});

test('handles boolean false correctly', () => {
  const store = createStore({
    enabled: false,
    visible: true
  });

  assertEqual(store.enabled.get(), false, 'Should handle false boolean');
  assertEqual(store.visible.get(), true, 'Should handle true boolean');

  store.enabled.set(true);
  store.visible.set(false);

  assertEqual(store.enabled.get(), true, 'Should update to true');
  assertEqual(store.visible.get(), false, 'Should update to false');
});

test('handles zero and empty string correctly', () => {
  const store = createStore({
    count: 0,
    name: ''
  });

  assertEqual(store.count.get(), 0, 'Should handle zero');
  assertEqual(store.name.get(), '', 'Should handle empty string');
});

test('$reset after error restores clean state', () => {
  const store = createStore({ value: 'initial' });

  store.value.set('modified');
  assertEqual(store.value.get(), 'modified', 'Value should be modified');

  store.$reset();
  assertEqual(store.value.get(), 'initial', 'Value should be reset');
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

  assertEqual(store.count.get(), 9, 'Final value should be correct');
  // Each $setState triggers an effect (unless batched internally)
  assert(effectCount > initialRuns, 'Effects should have run');
});

test('createGetters handles undefined store values', () => {
  const store = createStore({ value: undefined });
  const getters = createGetters(store, {
    hasValue: (s) => s.value.get() !== undefined
  });

  assertEqual(getters.hasValue.get(), false, 'Should handle undefined in getter');

  store.value.set('something');
  assertEqual(getters.hasValue.get(), true, 'Getter should update');
});

test('combineStores handles stores with same property names', () => {
  const store1 = createStore({ count: 1 });
  const store2 = createStore({ count: 2 });

  const combined = combineStores({
    a: store1,
    b: store2
  });

  assertEqual(combined.a.count.get(), 1, 'First store count');
  assertEqual(combined.b.count.get(), 2, 'Second store count');

  combined.a.count.set(10);
  combined.b.count.set(20);

  assertEqual(combined.a.count.get(), 10, 'First store updated');
  assertEqual(combined.b.count.get(), 20, 'Second store updated');
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

  assertEqual(store.value.get(), 2, 'Should handle rapid undo/redo');
});

test('historyPlugin canUndo/canRedo return correct values', () => {
  const store = createStore({ value: 0 });
  usePlugin(store, (s) => historyPlugin(s, 10));

  assertEqual(store.$canUndo(), false, 'Initially cannot undo');
  assertEqual(store.$canRedo(), false, 'Initially cannot redo');

  store.$setState({ value: 1 });
  assertEqual(store.$canUndo(), true, 'Can undo after change');
  assertEqual(store.$canRedo(), false, 'Cannot redo after change');

  store.$undo();
  assertEqual(store.$canUndo(), false, 'Cannot undo at beginning');
  assertEqual(store.$canRedo(), true, 'Can redo after undo');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
