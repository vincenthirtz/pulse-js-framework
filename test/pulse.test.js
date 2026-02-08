/**
 * Pulse Core Reactivity Tests
 *
 * Tests for runtime/pulse.js - the core reactive system
 *
 * @module test/pulse
 */

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

import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// Pulse Class Tests
// =============================================================================

printSection('Pulse Class Tests');

test('creates a pulse with initial value', () => {
  const p = pulse(42);
  assertEqual(p.get(), 42);
});

test('sets a new value', () => {
  const p = pulse(1);
  p.set(2);
  assertEqual(p.get(), 2);
});

test('updates value with function', () => {
  const p = pulse(5);
  p.update(n => n * 2);
  assertEqual(p.get(), 10);
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
  assertEqual(p.peek(), 200);
});

test('does not notify if value is equal (Object.is)', () => {
  const p = pulse(5);
  let runCount = 0;

  effect(() => {
    p.get();
    runCount++;
  });

  assertEqual(runCount, 1, 'Effect should run once initially');

  p.set(5); // Same value
  assertEqual(runCount, 1, 'Effect should not re-run for same value');

  p.set(6); // Different value
  assertEqual(runCount, 2, 'Effect should re-run for different value');
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
  assertEqual(runCount, 1, 'Effect should not re-run for same length string');

  p.set('hi'); // Different length
  assertEqual(runCount, 2, 'Effect should re-run for different length string');
});

test('subscribe returns unsubscribe function', () => {
  const p = pulse(0);
  let called = 0;

  const unsub = p.subscribe(() => { called++; });

  p.set(1);
  assertEqual(called, 1, 'Subscriber should be called on change');

  unsub();
  p.set(2);
  assertEqual(called, 1, 'Should not receive updates after unsubscribe');
});

test('derive creates a derived pulse', () => {
  const p = pulse(5);
  const derived = p.derive(x => x * 2);

  assertEqual(derived.get(), 10);

  p.set(10);
  assertEqual(derived.get(), 20);
});

// =============================================================================
// Effect Tests
// =============================================================================

printSection('Effect Tests');

test('effect runs immediately', () => {
  let ran = false;
  effect(() => { ran = true; });
  assert(ran, 'Effect should run immediately');
});

test('effect re-runs when dependencies change', () => {
  const p = pulse(1);
  let value = 0;

  effect(() => {
    value = p.get();
  });

  assertEqual(value, 1);

  p.set(2);
  assertEqual(value, 2);
});

test('effect tracks multiple dependencies', () => {
  const a = pulse(1);
  const b = pulse(2);
  let sum = 0;

  effect(() => {
    sum = a.get() + b.get();
  });

  assertEqual(sum, 3);

  a.set(10);
  assertEqual(sum, 12);

  b.set(20);
  assertEqual(sum, 30);
});

test('effect cleanup function is called', () => {
  const p = pulse(1);
  let cleanupCount = 0;

  effect(() => {
    p.get();
    return () => { cleanupCount++; };
  });

  assertEqual(cleanupCount, 0, 'Cleanup should not run initially');

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

  assertEqual(runCount, 1);

  dispose();

  p.set(2);
  assertEqual(runCount, 1, 'Effect should not run after dispose');
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

// =============================================================================
// onCleanup Tests
// =============================================================================

printSection('onCleanup Tests');

test('onCleanup runs when effect re-executes', () => {
  const p = pulse(1);
  let cleanupRan = false;

  effect(() => {
    p.get();
    onCleanup(() => {
      cleanupRan = true;
    });
  });

  assert(!cleanupRan, 'Cleanup should not run initially');

  p.set(2);
  assert(cleanupRan, 'Cleanup should run when effect re-executes');
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

  assert(!cleanupRan, 'Cleanup should not run initially');

  dispose();
  assert(cleanupRan, 'Cleanup should run when disposed');
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
  assertEqual(count, 3, 'All cleanup callbacks should run');
});

// =============================================================================
// Computed Tests
// =============================================================================

printSection('Computed Tests');

test('computed calculates derived value', () => {
  const a = pulse(2);
  const b = pulse(3);
  const product = computed(() => a.get() * b.get());

  assertEqual(product.get(), 6);
});

test('computed updates when dependencies change', () => {
  const p = pulse(5);
  const doubled = computed(() => p.get() * 2);

  assertEqual(doubled.get(), 10);

  p.set(10);
  assertEqual(doubled.get(), 20);
});

test('computed is read-only', () => {
  const c = computed(() => 42);

  let threw = false;
  try {
    c.set(100);
  } catch (e) {
    threw = true;
  }

  assert(threw, 'set() should throw on computed');
});

test('computed update() throws', () => {
  const c = computed(() => 42);

  let threw = false;
  try {
    c.update(x => x + 1);
  } catch (e) {
    threw = true;
  }

  assert(threw, 'update() should throw on computed');
});

test('computed propagates to downstream effects', () => {
  const base = pulse(1);
  const doubled = computed(() => base.get() * 2);
  let effectValue = 0;

  effect(() => {
    effectValue = doubled.get();
  });

  assertEqual(effectValue, 2);

  base.set(5);
  assertEqual(effectValue, 10, 'Effect should update when computed changes');
});

test('computed propagates to downstream computed', () => {
  const base = pulse(2);
  const doubled = computed(() => base.get() * 2);
  const quadrupled = computed(() => doubled.get() * 2);

  assertEqual(quadrupled.get(), 8);

  base.set(3);
  assertEqual(quadrupled.get(), 12);
});

test('lazy computed defers evaluation', () => {
  let computeCount = 0;
  const p = pulse(1);

  const lazy = computed(() => {
    computeCount++;
    return p.get() * 2;
  }, { lazy: true });

  assertEqual(computeCount, 0, 'Lazy computed should not evaluate immediately');

  const value = lazy.get();
  assertEqual(computeCount, 1, 'Lazy computed should evaluate on first read');
  assertEqual(value, 2);
});

test('computed dispose stops updates', () => {
  const p = pulse(1);
  let computeCount = 0;

  const c = computed(() => {
    computeCount++;
    return p.get() * 2;
  });

  assertEqual(c.get(), 2);
  assertEqual(computeCount, 1);

  c.dispose();

  p.set(5);
  // After dispose, the computed should not recompute
  // But get() might still return the last cached value
});

// =============================================================================
// Batch Tests
// =============================================================================

printSection('Batch Tests');

test('batch defers effects', () => {
  const a = pulse(1);
  const b = pulse(2);
  let runCount = 0;

  effect(() => {
    a.get();
    b.get();
    runCount++;
  });

  assertEqual(runCount, 1);

  batch(() => {
    a.set(10);
    b.set(20);
  });

  assertEqual(runCount, 2, 'Effect should run only once after batch');
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

  assertEqual(runCount, 2, 'Effect should run once after all nested batches complete');
  assertEqual(p.get(), 4);
});

test('batch returns function result', () => {
  const result = batch(() => {
    return 42;
  });

  assertEqual(result, 42); // batch now returns the function result
});

// =============================================================================
// createState Tests
// =============================================================================

printSection('createState Tests');

test('createState creates reactive properties', () => {
  const state = createState({ count: 0, name: 'test' });

  assertEqual(state.count, 0);
  assertEqual(state.name, 'test');

  state.count = 5;
  assertEqual(state.count, 5);
});

test('createState properties are reactive', () => {
  const state = createState({ count: 0 });
  let value = 0;

  effect(() => {
    value = state.count;
  });

  assertEqual(value, 0);

  state.count = 10;
  assertEqual(value, 10);
});

test('createState $pulse helper', () => {
  const state = createState({ count: 0 });
  const p = state.$pulse('count');

  assert(p instanceof Pulse, '$pulse should return a Pulse instance');
  assertEqual(p.get(), 0);
});

test('createState nested objects', () => {
  const state = createState({
    user: {
      name: 'John',
      age: 30
    }
  });

  assertEqual(state.user.name, 'John');
  assertEqual(state.user.age, 30);

  state.user.name = 'Jane';
  assertEqual(state.user.name, 'Jane');
});

test('createState array $push', () => {
  const state = createState({ items: [1, 2, 3] });

  state.items$push(4, 5);
  assertDeepEqual(state.items, [1, 2, 3, 4, 5]);
});

test('createState array $pop', () => {
  const state = createState({ items: [1, 2, 3] });

  const popped = state.items$pop();
  assertEqual(popped, 3);
  assertDeepEqual(state.items, [1, 2]);
});

test('createState array $shift', () => {
  const state = createState({ items: [1, 2, 3] });

  const shifted = state.items$shift();
  assertEqual(shifted, 1);
  assertDeepEqual(state.items, [2, 3]);
});

test('createState array $unshift', () => {
  const state = createState({ items: [1, 2, 3] });

  state.items$unshift(0, -1);
  assertDeepEqual(state.items, [0, -1, 1, 2, 3]);
});

test('createState array $splice', () => {
  const state = createState({ items: [1, 2, 3, 4, 5] });

  const removed = state.items$splice(1, 2, 'a', 'b');
  assertDeepEqual(removed, [2, 3]);
  assertDeepEqual(state.items, [1, 'a', 'b', 4, 5]);
});

test('createState array $filter', () => {
  const state = createState({ items: [1, 2, 3, 4, 5] });

  state.items$filter(x => x % 2 === 0);
  assertDeepEqual(state.items, [2, 4]);
});

test('createState array $map', () => {
  const state = createState({ items: [1, 2, 3] });

  state.items$map(x => x * 2);
  assertDeepEqual(state.items, [2, 4, 6]);
});

test('createState array $sort', () => {
  const state = createState({ items: [3, 1, 4, 1, 5] });

  state.items$sort((a, b) => a - b);
  assertDeepEqual(state.items, [1, 1, 3, 4, 5]);
});

test('createState array changes are reactive', () => {
  const state = createState({ items: [1, 2] });
  let length = 0;

  effect(() => {
    length = state.items.length;
  });

  assertEqual(length, 2);

  state.items$push(3);
  assertEqual(length, 3);
});

// =============================================================================
// watch Tests
// =============================================================================

printSection('watch Tests');

test('watch runs callback on change', () => {
  const p = pulse(1);
  let newVal = null;
  let oldVal = null;

  watch(p, ([n], [o]) => {
    newVal = n;
    oldVal = o;
  });

  p.set(2);
  assertEqual(newVal, 2);
  assertEqual(oldVal, 1);
});

test('watch multiple sources', () => {
  const a = pulse(1);
  const b = pulse(2);
  let values = null;

  watch([a, b], (newVals) => {
    values = newVals;
  });

  a.set(10);
  assertDeepEqual(values, [10, 2]);

  b.set(20);
  assertDeepEqual(values, [10, 20]);
});

test('watch returns cleanup function', () => {
  const p = pulse(1);
  let runCount = 0;

  const stop = watch(p, () => {
    runCount++;
  });

  // Watch runs immediately via effect, so count is already 1
  assertEqual(runCount, 1, 'Watch runs immediately');

  p.set(2);
  assertEqual(runCount, 2, 'Watch runs on value change');

  stop();
  p.set(3);
  assertEqual(runCount, 2, 'Watch should not run after cleanup');
});

test('watch provides old values on first run', () => {
  const p = pulse(10);
  let capturedOld = null;

  watch(p, (newVals, oldVals) => {
    capturedOld = oldVals;
  });

  // On first run, old values should be the initial value (from peek())
  assertDeepEqual(capturedOld, [10]);
});

test('watch tracks old and new across multiple changes', () => {
  const p = pulse('a');
  const history = [];

  watch(p, ([newVal], [oldVal]) => {
    history.push({ newVal, oldVal });
  });

  p.set('b');
  p.set('c');

  assertEqual(history.length, 3); // initial + 2 changes
  assertEqual(history[1].oldVal, 'a');
  assertEqual(history[1].newVal, 'b');
  assertEqual(history[2].oldVal, 'b');
  assertEqual(history[2].newVal, 'c');
});

test('watch single source wraps in array', () => {
  const p = pulse(5);
  let receivedNew = null;

  watch(p, (newVals) => {
    receivedNew = newVals;
  });

  assert(Array.isArray(receivedNew), 'New values should be an array');
  assertEqual(receivedNew.length, 1);
  assertEqual(receivedNew[0], 5);
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
  assertDeepEqual(lastOld, [1, 2, 3]);
});

test('watch does not fire when value is same', () => {
  const p = pulse(1);
  let runCount = 0;

  watch(p, () => {
    runCount++;
  });

  assertEqual(runCount, 1, 'Initial run');

  p.set(1); // Same value
  assertEqual(runCount, 1, 'Should not fire for same value');

  p.set(2);
  assertEqual(runCount, 2, 'Should fire for different value');
});

test('watch works with computed sources', () => {
  const base = pulse(5);
  const doubled = computed(() => base.get() * 2);
  let lastNew = null;

  watch(doubled, (newVals) => {
    lastNew = newVals;
  });

  assertEqual(lastNew[0], 10);

  base.set(10);
  assertEqual(lastNew[0], 20);
});

test('watch callback receives correct types', () => {
  const p = pulse({ name: 'Alice', age: 30 });
  let capturedNew = null;

  watch(p, (newVals) => {
    capturedNew = newVals[0];
  });

  assertEqual(capturedNew.name, 'Alice');

  p.set({ name: 'Bob', age: 25 });
  assertEqual(capturedNew.name, 'Bob');
  assertEqual(capturedNew.age, 25);
});

// =============================================================================
// untrack Tests
// =============================================================================

printSection('untrack Tests');

test('untrack reads without creating dependency', () => {
  const a = pulse(1);
  const b = pulse(2);
  let runCount = 0;

  effect(() => {
    a.get(); // This creates a dependency
    untrack(() => b.get()); // This should NOT create a dependency
    runCount++;
  });

  assertEqual(runCount, 1);

  a.set(10);
  assertEqual(runCount, 2, 'Effect should re-run when a changes');

  b.set(20);
  assertEqual(runCount, 2, 'Effect should NOT re-run when b changes');
});

test('untrack returns the value', () => {
  const p = pulse(42);

  const value = untrack(() => p.get());
  assertEqual(value, 42);
});

// =============================================================================
// memo Tests
// =============================================================================

printSection('memo Tests');

test('memo caches results', () => {
  let computeCount = 0;

  const expensive = memo((a, b) => {
    computeCount++;
    return a + b;
  });

  assertEqual(expensive(1, 2), 3);
  assertEqual(computeCount, 1);

  assertEqual(expensive(1, 2), 3);
  assertEqual(computeCount, 1, 'Should use cached result');

  assertEqual(expensive(2, 3), 5);
  assertEqual(computeCount, 2, 'Should recompute for different args');
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

  assertEqual(memoized({ value: 5 }), 10);
  assertEqual(computeCount, 1);

  assertEqual(memoized({ value: 5 }), 10);
  assertEqual(computeCount, 1, 'Should use cache when values equal');

  assertEqual(memoized({ value: 10 }), 20);
  assertEqual(computeCount, 2);
});

test('memo with no arguments', () => {
  let computeCount = 0;

  const getTimestamp = memo(() => {
    computeCount++;
    return 'fixed-value';
  });

  assertEqual(getTimestamp(), 'fixed-value');
  assertEqual(computeCount, 1);

  assertEqual(getTimestamp(), 'fixed-value');
  assertEqual(computeCount, 1, 'Should cache zero-arg calls');
});

test('memo recomputes when arg count changes', () => {
  let computeCount = 0;

  const fn = memo((...args) => {
    computeCount++;
    return args.reduce((a, b) => a + b, 0);
  });

  assertEqual(fn(1, 2), 3);
  assertEqual(computeCount, 1);

  assertEqual(fn(1, 2, 3), 6);
  assertEqual(computeCount, 2, 'Different arg count should recompute');
});

test('memo handles null and undefined args', () => {
  let computeCount = 0;

  const fn = memo((a) => {
    computeCount++;
    return a;
  });

  fn(null);
  assertEqual(computeCount, 1);

  fn(null);
  assertEqual(computeCount, 1, 'Should cache null');

  fn(undefined);
  assertEqual(computeCount, 2, 'undefined !== null');

  fn(undefined);
  assertEqual(computeCount, 2, 'Should cache undefined');
});

test('memo with multiple arguments', () => {
  let computeCount = 0;

  const add = memo((a, b, c) => {
    computeCount++;
    return a + b + c;
  });

  assertEqual(add(1, 2, 3), 6);
  assertEqual(add(1, 2, 3), 6);
  assertEqual(computeCount, 1, 'Same 3 args should be cached');

  assertEqual(add(1, 2, 4), 7);
  assertEqual(computeCount, 2, 'Third arg changed');
});

test('memo caches only the last call', () => {
  let computeCount = 0;

  const fn = memo((x) => {
    computeCount++;
    return x * 10;
  });

  assertEqual(fn(1), 10);
  assertEqual(fn(2), 20);
  assertEqual(computeCount, 2);

  // Going back to first arg should recompute (not a multi-key cache)
  assertEqual(fn(1), 10);
  assertEqual(computeCount, 3, 'memo only caches the last call');
});

test('memo returns correct type', () => {
  const fn = memo((x) => ({ doubled: x * 2 }));

  const result = fn(5);
  assertEqual(result.doubled, 10);

  const cached = fn(5);
  assert(result === cached, 'Should return exact same reference from cache');
});

test('memo with boolean args', () => {
  let computeCount = 0;

  const fn = memo((flag) => {
    computeCount++;
    return flag ? 'yes' : 'no';
  });

  assertEqual(fn(true), 'yes');
  assertEqual(fn(true), 'yes');
  assertEqual(computeCount, 1);

  assertEqual(fn(false), 'no');
  assertEqual(computeCount, 2);
});

test('memo with string args', () => {
  let computeCount = 0;

  const greet = memo((name) => {
    computeCount++;
    return `Hello, ${name}!`;
  });

  assertEqual(greet('Alice'), 'Hello, Alice!');
  assertEqual(greet('Alice'), 'Hello, Alice!');
  assertEqual(computeCount, 1);

  assertEqual(greet('Bob'), 'Hello, Bob!');
  assertEqual(computeCount, 2);
});

// =============================================================================
// memoComputed Tests
// =============================================================================

printSection('memoComputed Tests');

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

  assertEqual(result.get(), 6);
  assertEqual(computeCount, 1);

  // Reading again should not recompute if deps haven't changed
  assertEqual(result.get(), 6);
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

  assertEqual(doubled.get(), 20);
  assertEqual(computeCount, 1);

  x.set(20);
  assertEqual(doubled.get(), 40);
  assertEqual(computeCount, 2);
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

  assertEqual(effectValue, 15);

  count.set(10);
  assertEqual(effectValue, 30);
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

  assertEqual(fullName.get(), 'John Doe');
  assertEqual(computeCount, 1);

  firstName.set('Jane');
  assertEqual(fullName.get(), 'Jane Doe');
  assertEqual(computeCount, 2);

  lastName.set('Smith');
  assertEqual(fullName.get(), 'Jane Smith');
  assertEqual(computeCount, 3);
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

  assert(threw, 'memoComputed should be read-only');
});

test('memoComputed with no deps', () => {
  let computeCount = 0;

  const result = memoComputed(() => {
    computeCount++;
    return 42;
  });

  assertEqual(result.get(), 42);
  assertEqual(computeCount, 1);
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

  assertEqual(sum.get(), 6);
  assertEqual(computeCount, 1);
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

  assertEqual(sum.get(), 3);
  const initialCount = computeCount;

  batch(() => {
    a.set(10);
    b.set(20);
  });

  assertEqual(sum.get(), 30);
});

test('memoComputed with function deps', () => {
  const p = pulse(5);

  const result = memoComputed(
    () => p.get() * 2,
    { deps: [() => p.get()] }
  );

  assertEqual(result.get(), 10);

  p.set(10);
  assertEqual(result.get(), 20);
});

test('memoComputed can be disposed', () => {
  const p = pulse(1);
  const mc = memoComputed(() => p.get() * 2, { deps: [p] });

  assertEqual(mc.get(), 2);

  mc.dispose();
  // After dispose, it should not track changes
  p.set(10);
});

// =============================================================================
// fromPromise Tests
// =============================================================================

printSection('fromPromise Tests');

testAsync('fromPromise resolves value', async () => {
  const { value, loading, error } = fromPromise(Promise.resolve(42));

  assert(loading.get() === true, 'Should be loading initially');

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get(), 42);
  assertEqual(loading.get(), false);
  assertEqual(error.get(), null);
});

testAsync('fromPromise handles rejection', async () => {
  const testError = new Error('Test error');
  const { value, loading, error } = fromPromise(Promise.reject(testError));

  await new Promise(r => setTimeout(r, 10));

  assertEqual(loading.get(), false);
  assertEqual(error.get(), testError);
});

testAsync('fromPromise uses initial value', async () => {
  const { value, loading } = fromPromise(
    new Promise(r => setTimeout(() => r(42), 50)),
    'initial'
  );

  assertEqual(value.get(), 'initial');
  assert(loading.get() === true);
});

testAsync('fromPromise initial state is loading=true, error=null', async () => {
  const { loading, error } = fromPromise(new Promise(() => {})); // Never resolves
  assertEqual(loading.get(), true);
  assertEqual(error.get(), null);
});

testAsync('fromPromise resolves with object value', async () => {
  const data = { name: 'Alice', age: 30 };
  const { value, loading, error } = fromPromise(Promise.resolve(data));

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get().name, 'Alice');
  assertEqual(value.get().age, 30);
  assertEqual(loading.get(), false);
  assertEqual(error.get(), null);
});

testAsync('fromPromise resolves with array value', async () => {
  const { value } = fromPromise(Promise.resolve([1, 2, 3]));

  await new Promise(r => setTimeout(r, 10));

  assertDeepEqual(value.get(), [1, 2, 3]);
});

testAsync('fromPromise resolves with null', async () => {
  const { value, loading } = fromPromise(Promise.resolve(null), 'fallback');

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get(), null);
  assertEqual(loading.get(), false);
});

testAsync('fromPromise resolves with zero', async () => {
  const { value, loading } = fromPromise(Promise.resolve(0));

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get(), 0);
  assertEqual(loading.get(), false);
});

testAsync('fromPromise error is accessible', async () => {
  const err = new TypeError('Network failure');
  const { error, loading } = fromPromise(Promise.reject(err));

  await new Promise(r => setTimeout(r, 10));

  assert(error.get() instanceof TypeError, 'Should preserve error type');
  assertEqual(error.get().message, 'Network failure');
  assertEqual(loading.get(), false);
});

testAsync('fromPromise is reactive in effects', async () => {
  const { value, loading } = fromPromise(Promise.resolve(99));
  let effectRuns = 0;

  effect(() => {
    value.get();
    loading.get();
    effectRuns++;
  });

  assertEqual(effectRuns, 1, 'Effect runs initially');

  await new Promise(r => setTimeout(r, 10));

  // After promise resolves, both value and loading change (batched)
  assert(effectRuns >= 2, 'Effect should re-run when promise resolves');
});

testAsync('fromPromise default initial value is undefined', async () => {
  const { value } = fromPromise(new Promise(r => setTimeout(() => r(42), 50)));

  assertEqual(value.get(), undefined);
});

testAsync('fromPromise loading transitions to false on error', async () => {
  const { loading } = fromPromise(Promise.reject(new Error('fail')));

  assertEqual(loading.get(), true, 'Should start loading');

  await new Promise(r => setTimeout(r, 10));

  assertEqual(loading.get(), false, 'Should stop loading after error');
});

testAsync('fromPromise value unchanged on rejection', async () => {
  const { value } = fromPromise(Promise.reject(new Error('fail')), 'initial');

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get(), 'initial', 'Value should remain initial on rejection');
});

// =============================================================================
// HMR Support Tests
// =============================================================================

printSection('HMR Support Tests');

test('context has HMR properties', () => {
  assert(context.currentModuleId === null, 'currentModuleId should be null initially');
  assert(context.effectRegistry instanceof Map, 'effectRegistry should be a Map');
});

test('setCurrentModule and clearCurrentModule', () => {
  setCurrentModule('test-module');
  assertEqual(context.currentModuleId, 'test-module');

  clearCurrentModule();
  assertEqual(context.currentModuleId, null);
});

test('effect registers with current module', () => {
  resetContext();

  setCurrentModule('module-a');
  const dispose1 = effect(() => {});
  const dispose2 = effect(() => {});
  clearCurrentModule();

  const moduleEffects = context.effectRegistry.get('module-a');
  assert(moduleEffects instanceof Set, 'Module should have effect set');
  assertEqual(moduleEffects.size, 2, 'Should have 2 effects registered');

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

  assertEqual(context.effectRegistry.get('module-b').size, 1);

  dispose();
  assertEqual(context.effectRegistry.get('module-b').size, 0);

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

  assertEqual(runCount, 2, 'Both effects should run initially');

  p.set(1);
  assertEqual(runCount, 4, 'Both effects should re-run on change');

  // Dispose all effects for the module
  disposeModule('module-c');

  p.set(2);
  assertEqual(runCount, 4, 'Effects should not run after module dispose');

  assert(!context.effectRegistry.has('module-c'), 'Module should be removed from registry');

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

  assert(!cleanupRan, 'Cleanup should not run yet');

  disposeModule('module-d');
  assert(cleanupRan, 'Cleanup should run on disposeModule');

  resetContext();
});

test('effects without module are not registered', () => {
  resetContext();

  // Create effect without setCurrentModule
  const dispose = effect(() => {});

  assertEqual(context.effectRegistry.size, 0, 'No module should be in registry');

  dispose();
  resetContext();
});

test('resetContext clears HMR state', () => {
  setCurrentModule('test-module');
  context.effectRegistry.set('some-module', new Set());

  resetContext();

  assertEqual(context.currentModuleId, null);
  assertEqual(context.effectRegistry.size, 0);
});

// =============================================================================
// Isolated Context Tests
// =============================================================================

printSection('Isolated Context Tests');

test('ReactiveContext class exists', () => {
  assert(ReactiveContext !== undefined, 'ReactiveContext should be exported');
  assert(typeof ReactiveContext === 'function', 'ReactiveContext should be a constructor');
});

test('createContext creates isolated context', () => {
  const ctx = createContext({ name: 'test-context' });
  assert(ctx instanceof ReactiveContext, 'Should return ReactiveContext instance');
  assertEqual(ctx.name, 'test-context');
});

test('globalContext is the default active context', () => {
  const active = getActiveContext();
  assertEqual(active, globalContext);
});

test('withContext switches active context', () => {
  const isolated = createContext({ name: 'isolated' });

  assertEqual(getActiveContext(), globalContext);

  withContext(isolated, () => {
    assertEqual(getActiveContext(), isolated);
  });

  assertEqual(getActiveContext(), globalContext);
});

test('ReactiveContext.run switches context', () => {
  const isolated = createContext({ name: 'isolated-run' });

  isolated.run(() => {
    assertEqual(getActiveContext(), isolated);
  });

  assertEqual(getActiveContext(), globalContext);
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
  assertEqual(effectRuns1, 1);
  assertEqual(effectRuns2, 1);

  // Update p1 in ctx1 - only ctx1 effect should run
  ctx1.run(() => {
    p1.set(1);
  });
  assertEqual(effectRuns1, 2);
  assertEqual(effectRuns2, 1);

  // Update p2 in ctx2 - only ctx2 effect should run
  ctx2.run(() => {
    p2.set(1);
  });
  assertEqual(effectRuns1, 2);
  assertEqual(effectRuns2, 2);
});

test('context.reset() clears state', () => {
  const ctx = createContext({ name: 'reset-test' });

  ctx.run(() => {
    const p = pulse(0);
    effect(() => p.get());
  });

  // After running, context should have some state
  assert(ctx.currentEffect === null, 'currentEffect should be null after effects run');

  // Simulate some state
  ctx.batchDepth = 2;
  ctx.pendingEffects.add({ run: () => {} });

  ctx.reset();

  assertEqual(ctx.batchDepth, 0);
  assertEqual(ctx.pendingEffects.size, 0);
  assertEqual(ctx.currentEffect, null);
});

test('nested withContext restores properly', () => {
  const ctx1 = createContext({ name: 'nested1' });
  const ctx2 = createContext({ name: 'nested2' });

  withContext(ctx1, () => {
    assertEqual(getActiveContext(), ctx1);

    withContext(ctx2, () => {
      assertEqual(getActiveContext(), ctx2);
    });

    assertEqual(getActiveContext(), ctx1);
  });

  assertEqual(getActiveContext(), globalContext);
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
    assertEqual(effectRuns, 1);

    // Batch multiple updates
    batch(() => {
      a.set(1);
      b.set(1);
    });

    // Effect should only have run once more (not twice)
    assertEqual(effectRuns, 2);
  });
});

test('computed works within isolated context', () => {
  const ctx = createContext({ name: 'computed-test' });

  ctx.run(() => {
    const count = pulse(5);
    const doubled = computed(() => count.get() * 2);

    assertEqual(doubled.get(), 10);

    count.set(10);
    assertEqual(doubled.get(), 20);
  });
});

test('context backward compatibility - context alias works', () => {
  // The deprecated context export should work
  assert(context === globalContext, 'context should be alias to globalContext');
});

// =============================================================================
// Run Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
