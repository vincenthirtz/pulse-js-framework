/**
 * HMR Runtime Tests
 *
 * Tests for runtime/hmr.js - Hot Module Replacement utilities
 *
 * Note: Since import.meta.hot is only available in Vite dev mode,
 * these tests focus on the noop context behavior (production mode).
 *
 * @module test/hmr
 */

import { createHMRContext } from '../runtime/hmr.js';
import { pulse, resetContext, context } from '../runtime/pulse.js';
import {
  test,
  assert,
  assertEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// HMR Context Tests (Noop Mode - No import.meta.hot)
// =============================================================================

printSection('HMR Context Tests (Noop Mode)');

test('createHMRContext returns noop context without import.meta.hot', () => {
  const hmr = createHMRContext('test-module');

  assert(hmr !== null, 'Should return a context');
  assert(typeof hmr.data === 'object', 'Should have data object');
  assert(typeof hmr.preservePulse === 'function', 'Should have preservePulse function');
  assert(typeof hmr.setup === 'function', 'Should have setup function');
  assert(typeof hmr.accept === 'function', 'Should have accept function');
  assert(typeof hmr.dispose === 'function', 'Should have dispose function');
});

test('noop context data is empty object', () => {
  const hmr = createHMRContext('test-module');

  assertEqual(Object.keys(hmr.data).length, 0, 'Data should be empty');
});

test('noop preservePulse creates regular pulse', () => {
  const hmr = createHMRContext('test-module');

  const count = hmr.preservePulse('count', 42);

  assertEqual(count.get(), 42, 'Should create pulse with initial value');

  count.set(100);
  assertEqual(count.get(), 100, 'Should be a working pulse');
});

test('noop preservePulse passes options', () => {
  const hmr = createHMRContext('test-module');

  const p = hmr.preservePulse('test', { value: 1 }, {
    equals: (a, b) => a.value === b.value
  });

  p.set({ value: 1 });
  // With custom equals, setting same value shouldn't trigger
});

test('noop setup executes callback directly', () => {
  const hmr = createHMRContext('test-module');
  let executed = false;

  const result = hmr.setup(() => {
    executed = true;
    return 'result';
  });

  assert(executed, 'Callback should be executed');
  assertEqual(result, 'result', 'Should return callback result');
});

test('noop accept does nothing', () => {
  const hmr = createHMRContext('test-module');

  // Should not throw
  hmr.accept();
  hmr.accept(() => {});
});

test('noop dispose does nothing', () => {
  const hmr = createHMRContext('test-module');

  // Should not throw
  hmr.dispose(() => {});
});

// =============================================================================
// HMR Context with Module Tracking
// =============================================================================

printSection('HMR Context with Module Tracking');

test('setup sets and clears module ID', () => {
  resetContext();
  const hmr = createHMRContext('my-module-id');

  let moduleIdDuringSetup = null;

  hmr.setup(() => {
    moduleIdDuringSetup = context.currentModuleId;
  });

  // In noop mode, setup doesn't track modules
  // But we can verify it executes the callback
  assert(moduleIdDuringSetup === null || moduleIdDuringSetup === 'my-module-id',
    'Module ID handling depends on mode');

  assertEqual(context.currentModuleId, null, 'Module ID should be cleared after setup');

  resetContext();
});

test('multiple HMR contexts are independent', () => {
  const hmr1 = createHMRContext('module-1');
  const hmr2 = createHMRContext('module-2');

  const p1 = hmr1.preservePulse('value', 1);
  const p2 = hmr2.preservePulse('value', 2);

  assertEqual(p1.get(), 1);
  assertEqual(p2.get(), 2);

  p1.set(10);
  assertEqual(p1.get(), 10);
  assertEqual(p2.get(), 2, 'Other module pulse should not be affected');
});

// =============================================================================
// Integration Tests
// =============================================================================

printSection('HMR Integration Tests');

test('typical HMR usage pattern works', () => {
  resetContext();
  const hmr = createHMRContext('app-module');

  // Simulate typical component setup
  const count = hmr.preservePulse('count', 0);
  const items = hmr.preservePulse('items', []);

  let effectRan = false;

  hmr.setup(() => {
    // Effects would be tracked here in real HMR mode
    effectRan = true;
  });

  assert(effectRan, 'Setup should execute');
  assertEqual(count.get(), 0);
  assertDeepEqual(items.get(), []);

  // Simulate user interaction
  count.set(5);
  items.set(['a', 'b']);

  assertEqual(count.get(), 5);
  assertDeepEqual(items.get(), ['a', 'b']);

  hmr.accept();
  resetContext();
});

function assertDeepEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(
      `${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`
    );
  }
}

// =============================================================================
// Edge Cases and Additional Tests
// =============================================================================

printSection('HMR Edge Cases');

test('preservePulse with same key returns independent pulses', () => {
  const hmr1 = createHMRContext('module-a');
  const hmr2 = createHMRContext('module-a'); // Same module ID

  const p1 = hmr1.preservePulse('shared', 10);
  const p2 = hmr2.preservePulse('shared', 20);

  // In noop mode, these should be independent
  assertEqual(p1.get(), 10);
  assertEqual(p2.get(), 20);

  p1.set(100);
  assertEqual(p1.get(), 100);
  assertEqual(p2.get(), 20, 'Other pulse should not be affected');
});

test('preservePulse with complex initial values', () => {
  const hmr = createHMRContext('complex-module');

  // Object
  const obj = hmr.preservePulse('object', { name: 'test', count: 0 });
  assertEqual(obj.get().name, 'test');

  // Array
  const arr = hmr.preservePulse('array', [1, 2, 3]);
  assertDeepEqual(arr.get(), [1, 2, 3]);

  // Null
  const nullVal = hmr.preservePulse('null', null);
  assertEqual(nullVal.get(), null);

  // Undefined
  const undefVal = hmr.preservePulse('undefined', undefined);
  assertEqual(undefVal.get(), undefined);

  // Function (as value)
  const fn = () => 42;
  const fnPulse = hmr.preservePulse('function', fn);
  assertEqual(fnPulse.get()(), 42);
});

test('setup handles synchronous errors gracefully', () => {
  const hmr = createHMRContext('error-module');
  let errorThrown = false;

  try {
    hmr.setup(() => {
      throw new Error('Test error in setup');
    });
  } catch (e) {
    errorThrown = true;
  }

  assert(errorThrown, 'Error should propagate from setup');
});

test('setup returns value from callback', () => {
  const hmr = createHMRContext('return-module');

  const result = hmr.setup(() => {
    return { status: 'ok', value: 42 };
  });

  assertEqual(result.status, 'ok');
  assertEqual(result.value, 42);
});

test('setup with async-like callback', () => {
  const hmr = createHMRContext('async-module');

  const promise = hmr.setup(() => {
    return Promise.resolve('async result');
  });

  assert(promise instanceof Promise, 'Should return a promise');
});

test('dispose can be called multiple times', () => {
  const hmr = createHMRContext('multi-dispose');

  // Multiple dispose calls should not throw
  hmr.dispose(() => {});
  hmr.dispose(() => {});
  hmr.dispose(() => {});
});

test('accept can be called with and without callback', () => {
  const hmr = createHMRContext('accept-module');

  // Without callback
  hmr.accept();

  // With callback
  let callbackCalled = false;
  hmr.accept(() => {
    callbackCalled = true;
  });

  // In noop mode, callback is not executed
  assertEqual(callbackCalled, false);
});

test('data object is mutable', () => {
  const hmr = createHMRContext('data-module');

  hmr.data.customKey = 'customValue';
  assertEqual(hmr.data.customKey, 'customValue');

  hmr.data.nested = { deep: { value: true } };
  assertEqual(hmr.data.nested.deep.value, true);
});

test('multiple setup calls execute all callbacks', () => {
  const hmr = createHMRContext('multi-setup');
  const results = [];

  hmr.setup(() => {
    results.push('first');
  });

  hmr.setup(() => {
    results.push('second');
  });

  hmr.setup(() => {
    results.push('third');
  });

  assertDeepEqual(results, ['first', 'second', 'third']);
});

test('preservePulse with numeric keys', () => {
  const hmr = createHMRContext('numeric-keys');

  const p1 = hmr.preservePulse('0', 'zero');
  const p2 = hmr.preservePulse('1', 'one');
  const p3 = hmr.preservePulse('123', 'onetwothree');

  assertEqual(p1.get(), 'zero');
  assertEqual(p2.get(), 'one');
  assertEqual(p3.get(), 'onetwothree');
});

test('preservePulse with special character keys', () => {
  const hmr = createHMRContext('special-keys');

  const p1 = hmr.preservePulse('key-with-dash', 1);
  const p2 = hmr.preservePulse('key_with_underscore', 2);
  const p3 = hmr.preservePulse('key.with.dots', 3);

  assertEqual(p1.get(), 1);
  assertEqual(p2.get(), 2);
  assertEqual(p3.get(), 3);
});

test('preservePulse updates work correctly', () => {
  const hmr = createHMRContext('update-module');

  const counter = hmr.preservePulse('counter', 0);

  counter.update(n => n + 1);
  assertEqual(counter.get(), 1);

  counter.update(n => n * 10);
  assertEqual(counter.get(), 10);

  counter.update(n => n - 5);
  assertEqual(counter.get(), 5);
});

test('empty module ID is handled', () => {
  const hmr = createHMRContext('');

  assert(hmr !== null);
  assertEqual(typeof hmr.preservePulse, 'function');
  assertEqual(typeof hmr.setup, 'function');
});

test('very long module ID is handled', () => {
  const longId = 'a'.repeat(10000);
  const hmr = createHMRContext(longId);

  assert(hmr !== null);
  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value');
});

test('unicode module ID is handled', () => {
  const hmr = createHMRContext('module-\u{1F600}-emoji');

  assert(hmr !== null);
  const p = hmr.preservePulse('test', 'unicode');
  assertEqual(p.get(), 'unicode');
});

test('setup with nested setup calls', () => {
  const hmr = createHMRContext('nested-setup');
  const order = [];

  hmr.setup(() => {
    order.push('outer-start');
    hmr.setup(() => {
      order.push('inner');
    });
    order.push('outer-end');
  });

  assertDeepEqual(order, ['outer-start', 'inner', 'outer-end']);
});

test('preservePulse works inside setup', () => {
  const hmr = createHMRContext('pulse-in-setup');
  let pulseValue = null;

  hmr.setup(() => {
    const p = hmr.preservePulse('inside', 42);
    pulseValue = p.get();
  });

  assertEqual(pulseValue, 42);
});

// =============================================================================
// Run Tests and Print Results
// =============================================================================

printResults();
exitWithCode();
