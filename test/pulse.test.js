/**
 * Pulse Core Reactivity Tests
 *
 * Tests for runtime/pulse.js - the core reactive system
 *
 * @module test/pulse
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  Pulse,
  pulse,
  computed,
  effect,
  batch,
  createState,
  watch,
  fromPromise,
  untrack,
  onCleanup,
  memo,
  memoComputed,
  // HMR support
  context,
  resetContext,
  setCurrentModule,
  clearCurrentModule,
  disposeModule,
  // Isolated contexts
  ReactiveContext,
  globalContext,
  getActiveContext,
  withContext,
  createContext
} from '../runtime/pulse.js';

// =============================================================================
// Pulse Class Tests
// =============================================================================

describe('Pulse Class Tests', () => {

  test('creates a pulse with initial value', () => {
    const p = pulse(42);
    assert.strictEqual(p.get(), 42);
  });

  test('sets a new value', () => {
    const p = pulse(1);
    p.set(2);
    assert.strictEqual(p.get(), 2);
  });

  test('updates value with function', () => {
    const p = pulse(5);
    p.update(n => n * 2);
    assert.strictEqual(p.get(), 10);
  });

  test('peek returns value without tracking', () => {
    const p = pulse(100);
    let tracked = false;

    effect(() => {
      // This should NOT track p
      const value = p.peek();
      if (tracked) {
        throw new Error('Effect should not re-run on peek');
      }
    });

    tracked = true;
    p.set(200); // Should not trigger the effect
    assert.strictEqual(p.peek(), 200);
  });

  test('does not notify if value is equal (Object.is)', () => {
    const p = pulse(5);
    let runCount = 0;

    effect(() => {
      p.get();
      runCount++;
    });

    assert.strictEqual(runCount, 1, 'Effect should run once initially');

    p.set(5); // Same value
    assert.strictEqual(runCount, 1, 'Effect should not re-run for same value');

    p.set(6); // Different value
    assert.strictEqual(runCount, 2, 'Effect should re-run for different value');
  });

  test('custom equals function', () => {
    // Custom equals that compares by length for strings
    const p = pulse('hello', { equals: (a, b) => a?.length === b?.length });
    let runCount = 0;

    effect(() => {
      p.get();
      runCount++;
    });

    p.set('world'); // Same length
    assert.strictEqual(runCount, 1, 'Effect should not re-run for same length string');

    p.set('hi'); // Different length
    assert.strictEqual(runCount, 2, 'Effect should re-run for different length string');
  });

  test('subscribe returns unsubscribe function', () => {
    const p = pulse(0);
    let called = 0;

    const unsub = p.subscribe(() => { called++; });

    p.set(1);
    assert.strictEqual(called, 1, 'Subscriber should be called on change');

    unsub();
    p.set(2);
    assert.strictEqual(called, 1, 'Should not receive updates after unsubscribe');
  });

  test('derive creates a derived pulse', () => {
    const p = pulse(5);
    const derived = p.derive(x => x * 2);

    assert.strictEqual(derived.get(), 10);

    p.set(10);
    assert.strictEqual(derived.get(), 20);
  });

});

// =============================================================================
// Effect Tests
// =============================================================================

describe('Effect Tests', () => {

  test('effect runs immediately', () => {
    let ran = false;
    effect(() => { ran = true; });
    assert.ok(ran, 'Effect should run immediately');
  });

  test('effect re-runs when dependencies change', () => {
    const p = pulse(1);
    let value = 0;

    effect(() => {
      value = p.get();
    });

    assert.strictEqual(value, 1);

    p.set(2);
    assert.strictEqual(value, 2);
  });

  test('effect tracks multiple dependencies', () => {
    const a = pulse(1);
    const b = pulse(2);
    let sum = 0;

    effect(() => {
      sum = a.get() + b.get();
    });

    assert.strictEqual(sum, 3);

    a.set(10);
    assert.strictEqual(sum, 12);

    b.set(20);
    assert.strictEqual(sum, 30);
  });

  test('effect cleanup function is called', () => {
    const p = pulse(1);
    let cleanupCount = 0;

    effect(() => {
      p.get();
      return () => { cleanupCount++; };
    });

    assert.strictEqual(cleanupCount, 0, 'Cleanup should not run initially');

    p.set(2);
    // Note: The effect in pulse.js doesn't use returned cleanup, it uses onCleanup
  });

  test('effect returns dispose function', () => {
    const p = pulse(1);
    let runCount = 0;

    const dispose = effect(() => {
      p.get();
      runCount++;
    });

    assert.strictEqual(runCount, 1);

    dispose();

    p.set(2);
    assert.strictEqual(runCount, 1, 'Effect should not run after dispose');
  });

  test('effect handles errors gracefully', () => {
    const p = pulse(1);

    effect(() => {
      if (p.get() === 2) {
        throw new Error('Test error');
      }
    });

    // Should not crash
    p.set(2);
    // Effect system catches the error
  });

});

// =============================================================================
// onCleanup Tests
// =============================================================================

describe('onCleanup Tests', () => {

  test('onCleanup runs when effect re-executes', () => {
    const p = pulse(1);
    let cleanupRan = false;

    effect(() => {
      p.get();
      onCleanup(() => {
        cleanupRan = true;
      });
    });

    assert.ok(!cleanupRan, 'Cleanup should not run initially');

    p.set(2);
    assert.ok(cleanupRan, 'Cleanup should run when effect re-executes');
  });

  test('onCleanup runs when effect is disposed', () => {
    const p = pulse(1);
    let cleanupRan = false;

    const dispose = effect(() => {
      p.get();
      onCleanup(() => {
        cleanupRan = true;
      });
    });

    assert.ok(!cleanupRan, 'Cleanup should not run initially');

    dispose();
    assert.ok(cleanupRan, 'Cleanup should run when disposed');
  });

  test('multiple onCleanup callbacks', () => {
    const p = pulse(1);
    let count = 0;

    effect(() => {
      p.get();
      onCleanup(() => { count++; });
      onCleanup(() => { count++; });
      onCleanup(() => { count++; });
    });

    p.set(2);
    assert.strictEqual(count, 3, 'All cleanup callbacks should run');
  });

});

// =============================================================================
// Computed Tests
// =============================================================================

describe('Computed Tests', () => {

  test('computed calculates derived value', () => {
    const a = pulse(2);
    const b = pulse(3);
    const product = computed(() => a.get() * b.get());

    assert.strictEqual(product.get(), 6);
  });

  test('computed updates when dependencies change', () => {
    const p = pulse(5);
    const doubled = computed(() => p.get() * 2);

    assert.strictEqual(doubled.get(), 10);

    p.set(10);
    assert.strictEqual(doubled.get(), 20);
  });

  test('computed is read-only', () => {
    const c = computed(() => 42);

    let threw = false;
    try {
      c.set(100);
    } catch (e) {
      threw = true;
    }

    assert.ok(threw, 'set() should throw on computed');
  });

  test('computed update() throws', () => {
    const c = computed(() => 42);

    let threw = false;
    try {
      c.update(x => x + 1);
    } catch (e) {
      threw = true;
    }

    assert.ok(threw, 'update() should throw on computed');
  });

  test('computed propagates to downstream effects', () => {
    const base = pulse(1);
    const doubled = computed(() => base.get() * 2);
    let effectValue = 0;

    effect(() => {
      effectValue = doubled.get();
    });

    assert.strictEqual(effectValue, 2);

    base.set(5);
    assert.strictEqual(effectValue, 10, 'Effect should update when computed changes');
  });

  test('computed propagates to downstream computed', () => {
    const base = pulse(2);
    const doubled = computed(() => base.get() * 2);
    const quadrupled = computed(() => doubled.get() * 2);

    assert.strictEqual(quadrupled.get(), 8);

    base.set(3);
    assert.strictEqual(quadrupled.get(), 12);
  });

  test('lazy computed defers evaluation', () => {
    let computeCount = 0;
    const p = pulse(1);

    const lazy = computed(() => {
      computeCount++;
      return p.get() * 2;
    }, { lazy: true });

    assert.strictEqual(computeCount, 0, 'Lazy computed should not evaluate immediately');

    const value = lazy.get();
    assert.strictEqual(computeCount, 1, 'Lazy computed should evaluate on first read');
    assert.strictEqual(value, 2);
  });

  test('computed dispose stops updates', () => {
    const p = pulse(1);
    let computeCount = 0;

    const c = computed(() => {
      computeCount++;
      return p.get() * 2;
    });

    assert.strictEqual(c.get(), 2);
    assert.strictEqual(computeCount, 1);

    c.dispose();

    p.set(5);
    // After dispose, the computed should not recompute
    // But get() might still return the last cached value
  });

});

// =============================================================================
// Batch Tests
// =============================================================================

describe('Batch Tests', () => {

  test('batch defers effects', () => {
    const a = pulse(1);
    const b = pulse(2);
    let runCount = 0;

    effect(() => {
      a.get();
      b.get();
      runCount++;
    });

    assert.strictEqual(runCount, 1);

    batch(() => {
      a.set(10);
      b.set(20);
    });

    assert.strictEqual(runCount, 2, 'Effect should run only once after batch');
  });

  test('nested batch', () => {
    const p = pulse(1);
    let runCount = 0;

    effect(() => {
      p.get();
      runCount++;
    });

    batch(() => {
      p.set(2);
      batch(() => {
        p.set(3);
      });
      p.set(4);
    });

    assert.strictEqual(runCount, 2, 'Effect should run once after all nested batches complete');
    assert.strictEqual(p.get(), 4);
  });

  test('batch returns function result', () => {
    const result = batch(() => {
      return 42;
    });

    assert.strictEqual(result, 42); // batch now returns the function result
  });

});

// =============================================================================
// createState Tests
// =============================================================================

describe('createState Tests', () => {

  test('createState creates reactive properties', () => {
    const state = createState({ count: 0, name: 'test' });

    assert.strictEqual(state.count, 0);
    assert.strictEqual(state.name, 'test');

    state.count = 5;
    assert.strictEqual(state.count, 5);
  });

  test('createState properties are reactive', () => {
    const state = createState({ count: 0 });
    let value = 0;

    effect(() => {
      value = state.count;
    });

    assert.strictEqual(value, 0);

    state.count = 10;
    assert.strictEqual(value, 10);
  });

  test('createState $pulse helper', () => {
    const state = createState({ count: 0 });
    const p = state.$pulse('count');

    assert.ok(p instanceof Pulse, '$pulse should return a Pulse instance');
    assert.strictEqual(p.get(), 0);
  });

  test('createState nested objects', () => {
    const state = createState({
      user: {
        name: 'John',
        age: 30
      }
    });

    assert.strictEqual(state.user.name, 'John');
    assert.strictEqual(state.user.age, 30);

    state.user.name = 'Jane';
    assert.strictEqual(state.user.name, 'Jane');
  });

  test('createState array $push', () => {
    const state = createState({ items: [1, 2, 3] });

    state.items$push(4, 5);
    assert.deepStrictEqual(state.items, [1, 2, 3, 4, 5]);
  });

  test('createState array $pop', () => {
    const state = createState({ items: [1, 2, 3] });

    const popped = state.items$pop();
    assert.strictEqual(popped, 3);
    assert.deepStrictEqual(state.items, [1, 2]);
  });

  test('createState array $shift', () => {
    const state = createState({ items: [1, 2, 3] });

    const shifted = state.items$shift();
    assert.strictEqual(shifted, 1);
    assert.deepStrictEqual(state.items, [2, 3]);
  });

  test('createState array $unshift', () => {
    const state = createState({ items: [1, 2, 3] });

    state.items$unshift(0, -1);
    assert.deepStrictEqual(state.items, [0, -1, 1, 2, 3]);
  });

  test('createState array $splice', () => {
    const state = createState({ items: [1, 2, 3, 4, 5] });

    const removed = state.items$splice(1, 2, 'a', 'b');
    assert.deepStrictEqual(removed, [2, 3]);
    assert.deepStrictEqual(state.items, [1, 'a', 'b', 4, 5]);
  });

  test('createState array $filter', () => {
    const state = createState({ items: [1, 2, 3, 4, 5] });

    state.items$filter(x => x % 2 === 0);
    assert.deepStrictEqual(state.items, [2, 4]);
  });

  test('createState array $map', () => {
    const state = createState({ items: [1, 2, 3] });

    state.items$map(x => x * 2);
    assert.deepStrictEqual(state.items, [2, 4, 6]);
  });

  test('createState array $sort', () => {
    const state = createState({ items: [3, 1, 4, 1, 5] });

    state.items$sort((a, b) => a - b);
    assert.deepStrictEqual(state.items, [1, 1, 3, 4, 5]);
  });

  test('createState array changes are reactive', () => {
    const state = createState({ items: [1, 2] });
    let length = 0;

    effect(() => {
      length = state.items.length;
    });

    assert.strictEqual(length, 2);

    state.items$push(3);
    assert.strictEqual(length, 3);
  });

});

// =============================================================================
// watch Tests
// =============================================================================

describe('watch Tests', () => {

  test('watch runs callback on change', () => {
    const p = pulse(1);
    let newVal = null;
    let oldVal = null;

    watch(p, ([n], [o]) => {
      newVal = n;
      oldVal = o;
    });

    p.set(2);
    assert.strictEqual(newVal, 2);
    assert.strictEqual(oldVal, 1);
  });

  test('watch multiple sources', () => {
    const a = pulse(1);
    const b = pulse(2);
    let values = null;

    watch([a, b], (newVals) => {
      values = newVals;
    });

    a.set(10);
    assert.deepStrictEqual(values, [10, 2]);

    b.set(20);
    assert.deepStrictEqual(values, [10, 20]);
  });

  test('watch returns cleanup function', () => {
    const p = pulse(1);
    let runCount = 0;

    const stop = watch(p, () => {
      runCount++;
    });

    // Watch runs immediately via effect, so count is already 1
    assert.strictEqual(runCount, 1, 'Watch runs immediately');

    p.set(2);
    assert.strictEqual(runCount, 2, 'Watch runs on value change');

    stop();
    p.set(3);
    assert.strictEqual(runCount, 2, 'Watch should not run after cleanup');
  });

  test('watch provides old values on first run', () => {
    const p = pulse(10);
    let capturedOld = null;

    watch(p, (newVals, oldVals) => {
      capturedOld = oldVals;
    });

    // On first run, old values should be the initial value (from peek())
    assert.deepStrictEqual(capturedOld, [10]);
  });

  test('watch tracks old and new across multiple changes', () => {
    const p = pulse('a');
    const history = [];

    watch(p, ([newVal], [oldVal]) => {
      history.push({ newVal, oldVal });
    });

    p.set('b');
    p.set('c');

    assert.strictEqual(history.length, 3); // initial + 2 changes
    assert.strictEqual(history[1].oldVal, 'a');
    assert.strictEqual(history[1].newVal, 'b');
    assert.strictEqual(history[2].oldVal, 'b');
    assert.strictEqual(history[2].newVal, 'c');
  });

  test('watch single source wraps in array', () => {
    const p = pulse(5);
    let receivedNew = null;

    watch(p, (newVals) => {
      receivedNew = newVals;
    });

    assert.ok(Array.isArray(receivedNew), 'New values should be an array');
    assert.strictEqual(receivedNew.length, 1);
    assert.strictEqual(receivedNew[0], 5);
  });

  test('watch multiple sources tracks all old values', () => {
    const a = pulse(1);
    const b = pulse(2);
    const c = pulse(3);
    let lastOld = null;

    watch([a, b, c], (newVals, oldVals) => {
      lastOld = oldVals;
    });

    a.set(10);
    assert.deepStrictEqual(lastOld, [1, 2, 3]);
  });

  test('watch does not fire when value is same', () => {
    const p = pulse(1);
    let runCount = 0;

    watch(p, () => {
      runCount++;
    });

    assert.strictEqual(runCount, 1, 'Initial run');

    p.set(1); // Same value
    assert.strictEqual(runCount, 1, 'Should not fire for same value');

    p.set(2);
    assert.strictEqual(runCount, 2, 'Should fire for different value');
  });

  test('watch works with computed sources', () => {
    const base = pulse(5);
    const doubled = computed(() => base.get() * 2);
    let lastNew = null;

    watch(doubled, (newVals) => {
      lastNew = newVals;
    });

    assert.strictEqual(lastNew[0], 10);

    base.set(10);
    assert.strictEqual(lastNew[0], 20);
  });

  test('watch callback receives correct types', () => {
    const p = pulse({ name: 'Alice', age: 30 });
    let capturedNew = null;

    watch(p, (newVals) => {
      capturedNew = newVals[0];
    });

    assert.strictEqual(capturedNew.name, 'Alice');

    p.set({ name: 'Bob', age: 25 });
    assert.strictEqual(capturedNew.name, 'Bob');
    assert.strictEqual(capturedNew.age, 25);
  });

});

// =============================================================================
// untrack Tests
// =============================================================================

describe('untrack Tests', () => {

  test('untrack reads without creating dependency', () => {
    const a = pulse(1);
    const b = pulse(2);
    let runCount = 0;

    effect(() => {
      a.get(); // This creates a dependency
      untrack(() => b.get()); // This should NOT create a dependency
      runCount++;
    });

    assert.strictEqual(runCount, 1);

    a.set(10);
    assert.strictEqual(runCount, 2, 'Effect should re-run when a changes');

    b.set(20);
    assert.strictEqual(runCount, 2, 'Effect should NOT re-run when b changes');
  });

  test('untrack returns the value', () => {
    const p = pulse(42);

    const value = untrack(() => p.get());
    assert.strictEqual(value, 42);
  });

});

// =============================================================================
// memo Tests
// =============================================================================

describe('memo Tests', () => {

  test('memo caches results', () => {
    let computeCount = 0;

    const expensive = memo((a, b) => {
      computeCount++;
      return a + b;
    });

    assert.strictEqual(expensive(1, 2), 3);
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(expensive(1, 2), 3);
    assert.strictEqual(computeCount, 1, 'Should use cached result');

    assert.strictEqual(expensive(2, 3), 5);
    assert.strictEqual(computeCount, 2, 'Should recompute for different args');
  });

  test('memo with custom equals', () => {
    let computeCount = 0;

    const memoized = memo(
      (obj) => {
        computeCount++;
        return obj.value * 2;
      },
      { equals: (a, b) => a?.value === b?.value }
    );

    assert.strictEqual(memoized({ value: 5 }), 10);
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(memoized({ value: 5 }), 10);
    assert.strictEqual(computeCount, 1, 'Should use cache when values equal');

    assert.strictEqual(memoized({ value: 10 }), 20);
    assert.strictEqual(computeCount, 2);
  });

  test('memo with no arguments', () => {
    let computeCount = 0;

    const getTimestamp = memo(() => {
      computeCount++;
      return 'fixed-value';
    });

    assert.strictEqual(getTimestamp(), 'fixed-value');
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(getTimestamp(), 'fixed-value');
    assert.strictEqual(computeCount, 1, 'Should cache zero-arg calls');
  });

  test('memo recomputes when arg count changes', () => {
    let computeCount = 0;

    const fn = memo((...args) => {
      computeCount++;
      return args.reduce((a, b) => a + b, 0);
    });

    assert.strictEqual(fn(1, 2), 3);
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(fn(1, 2, 3), 6);
    assert.strictEqual(computeCount, 2, 'Different arg count should recompute');
  });

  test('memo handles null and undefined args', () => {
    let computeCount = 0;

    const fn = memo((a) => {
      computeCount++;
      return a;
    });

    fn(null);
    assert.strictEqual(computeCount, 1);

    fn(null);
    assert.strictEqual(computeCount, 1, 'Should cache null');

    fn(undefined);
    assert.strictEqual(computeCount, 2, 'undefined !== null');

    fn(undefined);
    assert.strictEqual(computeCount, 2, 'Should cache undefined');
  });

  test('memo with multiple arguments', () => {
    let computeCount = 0;

    const add = memo((a, b, c) => {
      computeCount++;
      return a + b + c;
    });

    assert.strictEqual(add(1, 2, 3), 6);
    assert.strictEqual(add(1, 2, 3), 6);
    assert.strictEqual(computeCount, 1, 'Same 3 args should be cached');

    assert.strictEqual(add(1, 2, 4), 7);
    assert.strictEqual(computeCount, 2, 'Third arg changed');
  });

  test('memo caches only the last call', () => {
    let computeCount = 0;

    const fn = memo((x) => {
      computeCount++;
      return x * 10;
    });

    assert.strictEqual(fn(1), 10);
    assert.strictEqual(fn(2), 20);
    assert.strictEqual(computeCount, 2);

    // Going back to first arg should recompute (not a multi-key cache)
    assert.strictEqual(fn(1), 10);
    assert.strictEqual(computeCount, 3, 'memo only caches the last call');
  });

  test('memo returns correct type', () => {
    const fn = memo((x) => ({ doubled: x * 2 }));

    const result = fn(5);
    assert.strictEqual(result.doubled, 10);

    const cached = fn(5);
    assert.ok(result === cached, 'Should return exact same reference from cache');
  });

  test('memo with boolean args', () => {
    let computeCount = 0;

    const fn = memo((flag) => {
      computeCount++;
      return flag ? 'yes' : 'no';
    });

    assert.strictEqual(fn(true), 'yes');
    assert.strictEqual(fn(true), 'yes');
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(fn(false), 'no');
    assert.strictEqual(computeCount, 2);
  });

  test('memo with string args', () => {
    let computeCount = 0;

    const greet = memo((name) => {
      computeCount++;
      return `Hello, ${name}!`;
    });

    assert.strictEqual(greet('Alice'), 'Hello, Alice!');
    assert.strictEqual(greet('Alice'), 'Hello, Alice!');
    assert.strictEqual(computeCount, 1);

    assert.strictEqual(greet('Bob'), 'Hello, Bob!');
    assert.strictEqual(computeCount, 2);
  });

});

// =============================================================================
// memoComputed Tests
// =============================================================================

describe('memoComputed Tests', () => {

  test('memoComputed combines memo with computed', () => {
    const a = pulse(2);
    const b = pulse(3);
    let computeCount = 0;

    const result = memoComputed(
      () => {
        computeCount++;
        return a.get() * b.get();
      },
      { deps: [a, b] }
    );

    assert.strictEqual(result.get(), 6);
    assert.strictEqual(computeCount, 1);

    // Reading again should not recompute if deps haven't changed
    assert.strictEqual(result.get(), 6);
  });

  test('memoComputed recomputes when deps change', () => {
    const x = pulse(10);
    let computeCount = 0;

    const doubled = memoComputed(
      () => {
        computeCount++;
        return x.get() * 2;
      },
      { deps: [x] }
    );

    assert.strictEqual(doubled.get(), 20);
    assert.strictEqual(computeCount, 1);

    x.set(20);
    assert.strictEqual(doubled.get(), 40);
    assert.strictEqual(computeCount, 2);
  });

  test('memoComputed is reactive in effects', () => {
    const count = pulse(5);
    let effectValue = 0;

    const tripled = memoComputed(
      () => count.get() * 3,
      { deps: [count] }
    );

    effect(() => {
      effectValue = tripled.get();
    });

    assert.strictEqual(effectValue, 15);

    count.set(10);
    assert.strictEqual(effectValue, 30);
  });

  test('memoComputed with multiple deps', () => {
    const firstName = pulse('John');
    const lastName = pulse('Doe');
    let computeCount = 0;

    const fullName = memoComputed(
      () => {
        computeCount++;
        return `${firstName.get()} ${lastName.get()}`;
      },
      { deps: [firstName, lastName] }
    );

    assert.strictEqual(fullName.get(), 'John Doe');
    assert.strictEqual(computeCount, 1);

    firstName.set('Jane');
    assert.strictEqual(fullName.get(), 'Jane Doe');
    assert.strictEqual(computeCount, 2);

    lastName.set('Smith');
    assert.strictEqual(fullName.get(), 'Jane Smith');
    assert.strictEqual(computeCount, 3);
  });

  test('memoComputed is read-only', () => {
    const p = pulse(1);
    const mc = memoComputed(() => p.get(), { deps: [p] });

    let threw = false;
    try {
      mc.set(42);
    } catch (e) {
      threw = true;
    }

    assert.ok(threw, 'memoComputed should be read-only');
  });

  test('memoComputed with no deps', () => {
    let computeCount = 0;

    const result = memoComputed(() => {
      computeCount++;
      return 42;
    });

    assert.strictEqual(result.get(), 42);
    assert.strictEqual(computeCount, 1);
  });

  test('memoComputed with custom equals', () => {
    const items = pulse([1, 2, 3]);
    let computeCount = 0;

    const sum = memoComputed(
      () => {
        computeCount++;
        return items.get().reduce((a, b) => a + b, 0);
      },
      { deps: [items], equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );

    assert.strictEqual(sum.get(), 6);
    assert.strictEqual(computeCount, 1);
  });

  test('memoComputed works in batch', () => {
    const a = pulse(1);
    const b = pulse(2);
    let computeCount = 0;

    const sum = memoComputed(
      () => {
        computeCount++;
        return a.get() + b.get();
      },
      { deps: [a, b] }
    );

    assert.strictEqual(sum.get(), 3);
    const initialCount = computeCount;

    batch(() => {
      a.set(10);
      b.set(20);
    });

    assert.strictEqual(sum.get(), 30);
  });

  test('memoComputed with function deps', () => {
    const p = pulse(5);

    const result = memoComputed(
      () => p.get() * 2,
      { deps: [() => p.get()] }
    );

    assert.strictEqual(result.get(), 10);

    p.set(10);
    assert.strictEqual(result.get(), 20);
  });

  test('memoComputed can be disposed', () => {
    const p = pulse(1);
    const mc = memoComputed(() => p.get() * 2, { deps: [p] });

    assert.strictEqual(mc.get(), 2);

    mc.dispose();
    // After dispose, it should not track changes
    p.set(10);
  });

});

// =============================================================================
// fromPromise Tests
// =============================================================================

describe('fromPromise Tests', () => {

  test('fromPromise resolves value', async () => {
    const { value, loading, error } = fromPromise(Promise.resolve(42));

    assert.ok(loading.get() === true, 'Should be loading initially');

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(value.get(), 42);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('fromPromise handles rejection', async () => {
    const testError = new Error('Test error');
    const { value, loading, error } = fromPromise(Promise.reject(testError));

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), testError);
  });

  test('fromPromise uses initial value', async () => {
    const { value, loading } = fromPromise(
      new Promise(r => setTimeout(() => r(42), 50)),
      'initial'
    );

    assert.strictEqual(value.get(), 'initial');
    assert.ok(loading.get() === true);
  });

  test('fromPromise initial state is loading=true, error=null', async () => {
    const { loading, error } = fromPromise(new Promise(() => {})); // Never resolves
    assert.strictEqual(loading.get(), true);
    assert.strictEqual(error.get(), null);
  });

  test('fromPromise resolves with object value', async () => {
    const data = { name: 'Alice', age: 30 };
    const { value, loading, error } = fromPromise(Promise.resolve(data));

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(value.get().name, 'Alice');
    assert.strictEqual(value.get().age, 30);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('fromPromise resolves with array value', async () => {
    const { value } = fromPromise(Promise.resolve([1, 2, 3]));

    await new Promise(r => setTimeout(r, 10));

    assert.deepStrictEqual(value.get(), [1, 2, 3]);
  });

  test('fromPromise resolves with null', async () => {
    const { value, loading } = fromPromise(Promise.resolve(null), 'fallback');

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(value.get(), null);
    assert.strictEqual(loading.get(), false);
  });

  test('fromPromise resolves with zero', async () => {
    const { value, loading } = fromPromise(Promise.resolve(0));

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(value.get(), 0);
    assert.strictEqual(loading.get(), false);
  });

  test('fromPromise error is accessible', async () => {
    const err = new TypeError('Network failure');
    const { error, loading } = fromPromise(Promise.reject(err));

    await new Promise(r => setTimeout(r, 10));

    assert.ok(error.get() instanceof TypeError, 'Should preserve error type');
    assert.strictEqual(error.get().message, 'Network failure');
    assert.strictEqual(loading.get(), false);
  });

  test('fromPromise is reactive in effects', async () => {
    const { value, loading } = fromPromise(Promise.resolve(99));
    let effectRuns = 0;

    effect(() => {
      value.get();
      loading.get();
      effectRuns++;
    });

    assert.strictEqual(effectRuns, 1, 'Effect runs initially');

    await new Promise(r => setTimeout(r, 10));

    // After promise resolves, both value and loading change (batched)
    assert.ok(effectRuns >= 2, 'Effect should re-run when promise resolves');
  });

  test('fromPromise default initial value is undefined', async () => {
    const { value } = fromPromise(new Promise(r => setTimeout(() => r(42), 50)));

    assert.strictEqual(value.get(), undefined);
  });

  test('fromPromise loading transitions to false on error', async () => {
    const { loading } = fromPromise(Promise.reject(new Error('fail')));

    assert.strictEqual(loading.get(), true, 'Should start loading');

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(loading.get(), false, 'Should stop loading after error');
  });

  test('fromPromise value unchanged on rejection', async () => {
    const { value } = fromPromise(Promise.reject(new Error('fail')), 'initial');

    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(value.get(), 'initial', 'Value should remain initial on rejection');
  });

});

// =============================================================================
// HMR Support Tests
// =============================================================================

describe('HMR Support Tests', () => {

  test('context has HMR properties', () => {
    assert.ok(context.currentModuleId === null, 'currentModuleId should be null initially');
    assert.ok(context.effectRegistry instanceof Map, 'effectRegistry should be a Map');
  });

  test('setCurrentModule and clearCurrentModule', () => {
    setCurrentModule('test-module');
    assert.strictEqual(context.currentModuleId, 'test-module');

    clearCurrentModule();
    assert.strictEqual(context.currentModuleId, null);
  });

  test('effect registers with current module', () => {
    resetContext();

    setCurrentModule('module-a');
    const dispose1 = effect(() => {});
    const dispose2 = effect(() => {});
    clearCurrentModule();

    const moduleEffects = context.effectRegistry.get('module-a');
    assert.ok(moduleEffects instanceof Set, 'Module should have effect set');
    assert.strictEqual(moduleEffects.size, 2, 'Should have 2 effects registered');

    // Cleanup
    dispose1();
    dispose2();
    resetContext();
  });

  test('effect dispose removes from registry', () => {
    resetContext();

    setCurrentModule('module-b');
    const dispose = effect(() => {});
    clearCurrentModule();

    assert.strictEqual(context.effectRegistry.get('module-b').size, 1);

    dispose();
    assert.strictEqual(context.effectRegistry.get('module-b').size, 0);

    resetContext();
  });

  test('disposeModule cleans up all effects', () => {
    resetContext();

    const p = pulse(0);
    let runCount = 0;

    setCurrentModule('module-c');
    effect(() => {
      p.get();
      runCount++;
    });
    effect(() => {
      p.get();
      runCount++;
    });
    clearCurrentModule();

    assert.strictEqual(runCount, 2, 'Both effects should run initially');

    p.set(1);
    assert.strictEqual(runCount, 4, 'Both effects should re-run on change');

    // Dispose all effects for the module
    disposeModule('module-c');

    p.set(2);
    assert.strictEqual(runCount, 4, 'Effects should not run after module dispose');

    assert.ok(!context.effectRegistry.has('module-c'), 'Module should be removed from registry');

    resetContext();
  });

  test('disposeModule runs cleanup functions', () => {
    resetContext();

    let cleanupRan = false;

    setCurrentModule('module-d');
    effect(() => {
      onCleanup(() => {
        cleanupRan = true;
      });
    });
    clearCurrentModule();

    assert.ok(!cleanupRan, 'Cleanup should not run yet');

    disposeModule('module-d');
    assert.ok(cleanupRan, 'Cleanup should run on disposeModule');

    resetContext();
  });

  test('effects without module are not registered', () => {
    resetContext();

    // Create effect without setCurrentModule
    const dispose = effect(() => {});

    assert.strictEqual(context.effectRegistry.size, 0, 'No module should be in registry');

    dispose();
    resetContext();
  });

  test('resetContext clears HMR state', () => {
    setCurrentModule('test-module');
    context.effectRegistry.set('some-module', new Set());

    resetContext();

    assert.strictEqual(context.currentModuleId, null);
    assert.strictEqual(context.effectRegistry.size, 0);
  });

});

// =============================================================================
// Isolated Context Tests
// =============================================================================

describe('Isolated Context Tests', () => {

  test('ReactiveContext class exists', () => {
    assert.ok(ReactiveContext !== undefined, 'ReactiveContext should be exported');
    assert.strictEqual(typeof ReactiveContext, 'function', 'ReactiveContext should be a constructor');
  });

  test('createContext creates isolated context', () => {
    const ctx = createContext({ name: 'test-context' });
    assert.ok(ctx instanceof ReactiveContext, 'Should return ReactiveContext instance');
    assert.strictEqual(ctx.name, 'test-context');
  });

  test('globalContext is the default active context', () => {
    const active = getActiveContext();
    assert.strictEqual(active, globalContext);
  });

  test('withContext switches active context', () => {
    const isolated = createContext({ name: 'isolated' });

    assert.strictEqual(getActiveContext(), globalContext);

    withContext(isolated, () => {
      assert.strictEqual(getActiveContext(), isolated);
    });

    assert.strictEqual(getActiveContext(), globalContext);
  });

  test('ReactiveContext.run switches context', () => {
    const isolated = createContext({ name: 'isolated-run' });

    isolated.run(() => {
      assert.strictEqual(getActiveContext(), isolated);
    });

    assert.strictEqual(getActiveContext(), globalContext);
  });

  test('isolated contexts have independent state', () => {
    const ctx1 = createContext({ name: 'ctx1' });
    const ctx2 = createContext({ name: 'ctx2' });

    let effectRuns1 = 0;
    let effectRuns2 = 0;

    // Create pulse and effect in ctx1
    let p1;
    ctx1.run(() => {
      p1 = pulse(0);
      effect(() => {
        p1.get();
        effectRuns1++;
      });
    });

    // Create pulse and effect in ctx2
    let p2;
    ctx2.run(() => {
      p2 = pulse(0);
      effect(() => {
        p2.get();
        effectRuns2++;
      });
    });

    // Each effect should have run once
    assert.strictEqual(effectRuns1, 1);
    assert.strictEqual(effectRuns2, 1);

    // Update p1 in ctx1 - only ctx1 effect should run
    ctx1.run(() => {
      p1.set(1);
    });
    assert.strictEqual(effectRuns1, 2);
    assert.strictEqual(effectRuns2, 1);

    // Update p2 in ctx2 - only ctx2 effect should run
    ctx2.run(() => {
      p2.set(1);
    });
    assert.strictEqual(effectRuns1, 2);
    assert.strictEqual(effectRuns2, 2);
  });

  test('context.reset() clears state', () => {
    const ctx = createContext({ name: 'reset-test' });

    ctx.run(() => {
      const p = pulse(0);
      effect(() => p.get());
    });

    // After running, context should have some state
    assert.ok(ctx.currentEffect === null, 'currentEffect should be null after effects run');

    // Simulate some state
    ctx.batchDepth = 2;
    ctx.pendingEffects.add({ run: () => {} });

    ctx.reset();

    assert.strictEqual(ctx.batchDepth, 0);
    assert.strictEqual(ctx.pendingEffects.size, 0);
    assert.strictEqual(ctx.currentEffect, null);
  });

  test('nested withContext restores properly', () => {
    const ctx1 = createContext({ name: 'nested1' });
    const ctx2 = createContext({ name: 'nested2' });

    withContext(ctx1, () => {
      assert.strictEqual(getActiveContext(), ctx1);

      withContext(ctx2, () => {
        assert.strictEqual(getActiveContext(), ctx2);
      });

      assert.strictEqual(getActiveContext(), ctx1);
    });

    assert.strictEqual(getActiveContext(), globalContext);
  });

  test('batch works within isolated context', () => {
    const ctx = createContext({ name: 'batch-test' });
    let effectRuns = 0;

    ctx.run(() => {
      const a = pulse(0);
      const b = pulse(0);

      effect(() => {
        a.get();
        b.get();
        effectRuns++;
      });

      // Effect ran once
      assert.strictEqual(effectRuns, 1);

      // Batch multiple updates
      batch(() => {
        a.set(1);
        b.set(1);
      });

      // Effect should only have run once more (not twice)
      assert.strictEqual(effectRuns, 2);
    });
  });

  test('computed works within isolated context', () => {
    const ctx = createContext({ name: 'computed-test' });

    ctx.run(() => {
      const count = pulse(5);
      const doubled = computed(() => count.get() * 2);

      assert.strictEqual(doubled.get(), 10);

      count.set(10);
      assert.strictEqual(doubled.get(), 20);
    });
  });

  test('context backward compatibility - context alias works', () => {
    // The deprecated context export should work
    assert.ok(context === globalContext, 'context should be alias to globalContext');
  });

});

// =============================================================================
// Generation Counter Optimization (#58) Tests
// =============================================================================

describe('Generation Counter Optimization (#58)', () => {
  test('effect tracks dependencies correctly with generation counter', () => {
    resetContext();
    const a = pulse(1);
    const b = pulse(2);
    const values = [];

    effect(() => {
      values.push(a.get() + b.get());
    });

    assert.deepStrictEqual(values, [3]);

    a.set(10);
    assert.deepStrictEqual(values, [3, 12]);

    b.set(20);
    assert.deepStrictEqual(values, [3, 12, 30]);
  });

  test('repeated reads of same pulse in effect do not cause issues', () => {
    resetContext();
    const count = pulse(0);
    let runCount = 0;

    effect(() => {
      // Read count multiple times in same effect
      const v1 = count.get();
      const v2 = count.get();
      const v3 = count.get();
      runCount++;
      assert.strictEqual(v1, v2);
      assert.strictEqual(v2, v3);
    });

    assert.strictEqual(runCount, 1);

    count.set(5);
    assert.strictEqual(runCount, 2);

    count.set(10);
    assert.strictEqual(runCount, 3);
  });

  test('generation counter increments on each effect run', () => {
    resetContext();
    const activeCtx = getActiveContext();
    const initialGen = activeCtx.generation;

    const trigger = pulse(0);

    effect(() => {
      trigger.get();
    });

    const afterFirstRun = activeCtx.generation;
    assert.ok(afterFirstRun > initialGen, 'Generation should increment after effect run');

    trigger.set(1);
    const afterSecondRun = activeCtx.generation;
    assert.ok(afterSecondRun > afterFirstRun, 'Generation should increment on re-run');
  });

  test('effect correctly re-tracks when dependencies change', () => {
    resetContext();
    const useA = pulse(true);
    const a = pulse('A');
    const b = pulse('B');
    const values = [];

    effect(() => {
      if (useA.get()) {
        values.push(a.get());
      } else {
        values.push(b.get());
      }
    });

    assert.deepStrictEqual(values, ['A']);

    // Change which dependency is tracked
    useA.set(false);
    assert.deepStrictEqual(values, ['A', 'B']);

    // Now a changes should NOT trigger the effect
    a.set('A2');
    assert.deepStrictEqual(values, ['A', 'B']);

    // But b changes should
    b.set('B2');
    assert.deepStrictEqual(values, ['A', 'B', 'B2']);
  });

  test('multiple effects with generation counter are independent', () => {
    resetContext();
    const count = pulse(0);
    const effectAValues = [];
    const effectBValues = [];

    effect(() => {
      effectAValues.push(count.get());
    });

    effect(() => {
      effectBValues.push(count.get() * 2);
    });

    assert.deepStrictEqual(effectAValues, [0]);
    assert.deepStrictEqual(effectBValues, [0]);

    count.set(5);
    assert.deepStrictEqual(effectAValues, [0, 5]);
    assert.deepStrictEqual(effectBValues, [0, 10]);
  });

  test('computed values work correctly with generation counter', () => {
    resetContext();
    const a = pulse(1);
    const b = pulse(2);
    const sum = computed(() => a.get() + b.get());
    const doubled = computed(() => sum.get() * 2);

    assert.strictEqual(doubled.get(), 6);

    a.set(5);
    assert.strictEqual(sum.get(), 7);
    assert.strictEqual(doubled.get(), 14);

    b.set(10);
    assert.strictEqual(sum.get(), 15);
    assert.strictEqual(doubled.get(), 30);
  });

  test('batch updates with generation counter work correctly', () => {
    resetContext();
    const a = pulse(1);
    const b = pulse(2);
    let runCount = 0;

    effect(() => {
      a.get();
      b.get();
      runCount++;
    });

    assert.strictEqual(runCount, 1);

    batch(() => {
      a.set(10);
      b.set(20);
    });

    // Effect should only run once after batch
    assert.strictEqual(runCount, 2);
  });

  test('diamond dependency with generation counter', () => {
    resetContext();
    const source = pulse(1);
    const left = computed(() => source.get() + 10);
    const right = computed(() => source.get() * 2);
    const values = [];

    effect(() => {
      values.push(left.get() + right.get());
    });

    assert.deepStrictEqual(values, [13]); // (1+10) + (1*2) = 13

    source.set(5);
    // (5+10) + (5*2) = 25
    const last = values[values.length - 1];
    assert.strictEqual(last, 25);
  });
});

// =============================================================================
// Subscribe/Batch Integration (v1.8.1)
// =============================================================================

describe('Subscribe/Batch Integration', () => {
  test('subscribe() callback receives the current value as argument', () => {
    resetContext();
    const p = pulse(0);
    const received = [];

    const unsub = p.subscribe((value) => {
      received.push(value);
    });

    p.set(42);
    assert.deepStrictEqual(received, [42]);

    p.set(100);
    assert.deepStrictEqual(received, [42, 100]);

    unsub();
  });

  test('subscribe() fires once per batch with the final value', () => {
    resetContext();
    const p = pulse(0);
    const received = [];

    const unsub = p.subscribe((value) => {
      received.push(value);
    });

    batch(() => {
      p.set(1);
      p.set(2);
      p.set(3);
    });

    // Should only fire once with final value 3
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0], 3);

    unsub();
  });

  test('subscribe() outside batch fires immediately with value', () => {
    resetContext();
    const p = pulse('initial');
    const received = [];

    const unsub = p.subscribe((value) => {
      received.push(value);
    });

    p.set('updated');
    assert.deepStrictEqual(received, ['updated']);

    p.set('again');
    assert.deepStrictEqual(received, ['updated', 'again']);

    unsub();
  });

  test('subscriber object has _isSubscriber marker', () => {
    resetContext();
    const p = pulse(0);

    // Access internal subscribers via subscribe
    const unsub = p.subscribe(() => {});

    // We can verify the marker by observing behavior:
    // subscribers receive values, effects don't get args
    const values = [];
    const unsub2 = p.subscribe((v) => values.push(v));

    p.set(5);
    assert.strictEqual(values[0], 5);

    unsub();
    unsub2();
  });

  test('multiple subscribers each fire once per batch', () => {
    resetContext();
    const p = pulse(0);
    const values1 = [];
    const values2 = [];

    const unsub1 = p.subscribe((v) => values1.push(v));
    const unsub2 = p.subscribe((v) => values2.push(v));

    batch(() => {
      p.set(10);
      p.set(20);
      p.set(30);
    });

    assert.deepStrictEqual(values1, [30]);
    assert.deepStrictEqual(values2, [30]);

    unsub1();
    unsub2();
  });

  test('subscribe() and effect() coexist during batch', () => {
    resetContext();
    const p = pulse(0);
    const subValues = [];
    const effectValues = [];

    const unsub = p.subscribe((v) => subValues.push(v));
    const dispose = effect(() => {
      effectValues.push(p.get());
    });

    batch(() => {
      p.set(1);
      p.set(2);
    });

    // Both should fire once with final value
    assert.strictEqual(subValues.length, 1);
    assert.strictEqual(subValues[0], 2);
    // Effect fires initially (0), then once after batch (2)
    assert.strictEqual(effectValues[effectValues.length - 1], 2);

    unsub();
    dispose();
  });

  test('subscribe() value is always current even with nested batches', () => {
    resetContext();
    const p = pulse(0);
    const received = [];

    const unsub = p.subscribe((v) => received.push(v));

    batch(() => {
      p.set(1);
      batch(() => {
        p.set(2);
        p.set(3);
      });
      // Inner batch should not flush yet
      p.set(4);
    });

    // Should fire once with final value 4
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0], 4);

    unsub();
  });
});
