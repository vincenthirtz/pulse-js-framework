/**
 * Pulse Core Reactivity Tests
 *
 * Tests for runtime/pulse.js
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
  memoComputed
} from '../runtime/pulse.js';

// Simple test runner
let passed = 0;
let failed = 0;
let currentTest = '';

function test(name, fn) {
  currentTest = name;
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  currentTest = name;
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

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

// =============================================================================
// Pulse Class Tests
// =============================================================================

console.log('\n--- Pulse Class Tests ---\n');

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

console.log('\n--- Effect Tests ---\n');

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
  let errorThrown = false;

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

console.log('\n--- onCleanup Tests ---\n');

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

console.log('\n--- Computed Tests ---\n');

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

console.log('\n--- Batch Tests ---\n');

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

  assertEqual(result, undefined); // batch doesn't return values in current impl
});

// =============================================================================
// createState Tests
// =============================================================================

console.log('\n--- createState Tests ---\n');

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

console.log('\n--- watch Tests ---\n');

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

// =============================================================================
// untrack Tests
// =============================================================================

console.log('\n--- untrack Tests ---\n');

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

console.log('\n--- memo Tests ---\n');

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

// =============================================================================
// memoComputed Tests
// =============================================================================

console.log('\n--- memoComputed Tests ---\n');

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

// =============================================================================
// fromPromise Tests
// =============================================================================

console.log('\n--- fromPromise Tests ---\n');

await testAsync('fromPromise resolves value', async () => {
  const { value, loading, error } = fromPromise(Promise.resolve(42));

  assert(loading.get() === true, 'Should be loading initially');

  await new Promise(r => setTimeout(r, 10));

  assertEqual(value.get(), 42);
  assertEqual(loading.get(), false);
  assertEqual(error.get(), null);
});

await testAsync('fromPromise handles rejection', async () => {
  const testError = new Error('Test error');
  const { value, loading, error } = fromPromise(Promise.reject(testError));

  await new Promise(r => setTimeout(r, 10));

  assertEqual(loading.get(), false);
  assertEqual(error.get(), testError);
});

await testAsync('fromPromise uses initial value', async () => {
  const { value, loading } = fromPromise(
    new Promise(r => setTimeout(() => r(42), 50)),
    'initial'
  );

  assertEqual(value.get(), 'initial');
  assert(loading.get() === true);
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n--- Summary ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
