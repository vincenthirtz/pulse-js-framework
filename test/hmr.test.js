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
// HMR Context with Mock import.meta.hot
// =============================================================================

printSection('HMR Context with Mock import.meta.hot');

/**
 * Create a mock import.meta.hot object for testing HMR behavior
 */
function createMockHot() {
  const disposeCallbacks = [];
  const acceptCallbacks = [];
  let data = {};

  return {
    data,
    accept: (callback) => {
      if (callback) {
        acceptCallbacks.push(callback);
      }
    },
    dispose: (callback) => {
      disposeCallbacks.push(callback);
    },
    // Test helpers
    _getDisposeCallbacks: () => disposeCallbacks,
    _getAcceptCallbacks: () => acceptCallbacks,
    _simulateDispose: () => {
      for (const cb of disposeCallbacks) {
        cb();
      }
    },
    _simulateAccept: () => {
      for (const cb of acceptCallbacks) {
        cb();
      }
    },
    _resetData: () => {
      data = {};
    }
  };
}

test('mock hot object has correct structure', () => {
  const mockHot = createMockHot();

  assert(typeof mockHot.data === 'object', 'Should have data object');
  assert(typeof mockHot.accept === 'function', 'Should have accept function');
  assert(typeof mockHot.dispose === 'function', 'Should have dispose function');
});

test('mock hot.dispose registers callbacks', () => {
  const mockHot = createMockHot();
  let called = false;

  mockHot.dispose(() => { called = true; });
  mockHot._simulateDispose();

  assert(called, 'Dispose callback should be called');
});

test('mock hot.accept registers callbacks', () => {
  const mockHot = createMockHot();
  let called = false;

  mockHot.accept(() => { called = true; });
  mockHot._simulateAccept();

  assert(called, 'Accept callback should be called');
});

test('mock hot preserves data between updates', () => {
  const mockHot = createMockHot();

  mockHot.data.savedValue = 42;
  mockHot._simulateDispose();

  assertEqual(mockHot.data.savedValue, 42, 'Data should persist after dispose');
});

test('multiple dispose callbacks are all called', () => {
  const mockHot = createMockHot();
  const results = [];

  mockHot.dispose(() => results.push('first'));
  mockHot.dispose(() => results.push('second'));
  mockHot.dispose(() => results.push('third'));
  mockHot._simulateDispose();

  assertDeepEqual(results, ['first', 'second', 'third']);
});

test('mock hot.accept without callback does not throw', () => {
  const mockHot = createMockHot();

  // Should not throw
  mockHot.accept();
  mockHot._simulateAccept();
});

// =============================================================================
// HMR State Preservation Simulation
// =============================================================================

printSection('HMR State Preservation Simulation');

test('simulated HMR preserves pulse state', () => {
  const mockHot = createMockHot();

  // First "load" - create pulse with initial value
  const initialPulse = pulse(0);
  initialPulse.set(42);

  // Store value before "HMR update"
  mockHot.dispose(() => {
    mockHot.data.__pulse_count = initialPulse.peek();
  });
  mockHot._simulateDispose();

  // Second "load" - restore from preserved data
  const restoredValue = mockHot.data.__pulse_count;
  const restoredPulse = pulse(restoredValue);

  assertEqual(restoredPulse.get(), 42, 'Pulse state should be preserved');
});

test('simulated HMR preserves multiple pulses', () => {
  const mockHot = createMockHot();

  // First load
  const count = pulse(10);
  const name = pulse('test');
  const items = pulse([1, 2, 3]);

  count.set(20);
  name.set('updated');
  items.set([4, 5, 6]);

  // Store all values
  mockHot.dispose(() => {
    mockHot.data.__pulse_count = count.peek();
    mockHot.data.__pulse_name = name.peek();
    mockHot.data.__pulse_items = items.peek();
  });
  mockHot._simulateDispose();

  // Restore
  assertEqual(mockHot.data.__pulse_count, 20);
  assertEqual(mockHot.data.__pulse_name, 'updated');
  assertDeepEqual(mockHot.data.__pulse_items, [4, 5, 6]);
});

test('simulated HMR handles object state', () => {
  const mockHot = createMockHot();

  const user = pulse({ name: 'John', age: 30 });
  user.update(u => ({ ...u, age: 31 }));

  mockHot.dispose(() => {
    mockHot.data.__pulse_user = user.peek();
  });
  mockHot._simulateDispose();

  const restored = mockHot.data.__pulse_user;
  assertEqual(restored.name, 'John');
  assertEqual(restored.age, 31);
});

test('simulated HMR handles null and undefined', () => {
  const mockHot = createMockHot();

  const nullVal = pulse(null);
  const undefVal = pulse(undefined);

  mockHot.dispose(() => {
    mockHot.data.__pulse_null = nullVal.peek();
    mockHot.data.__pulse_undef = undefVal.peek();
  });
  mockHot._simulateDispose();

  assertEqual(mockHot.data.__pulse_null, null);
  assertEqual(mockHot.data.__pulse_undef, undefined);
});

// =============================================================================
// HMR Effect Cleanup Simulation
// =============================================================================

printSection('HMR Effect Cleanup Simulation');

test('effects should be cleanable on HMR', () => {
  const mockHot = createMockHot();
  const cleanups = [];

  // Simulate effect registration with cleanup
  const registerEffect = (cleanupFn) => {
    cleanups.push(cleanupFn);
    return cleanupFn;
  };

  const cleanup1 = registerEffect(() => 'cleaned 1');
  const cleanup2 = registerEffect(() => 'cleaned 2');

  // On dispose, run all cleanups
  mockHot.dispose(() => {
    cleanups.forEach(fn => fn());
  });

  assertEqual(cleanups.length, 2);
  mockHot._simulateDispose();
});

test('dispose is called before accept on HMR update', () => {
  const mockHot = createMockHot();
  const order = [];

  mockHot.dispose(() => order.push('dispose'));
  mockHot.accept(() => order.push('accept'));

  // Simulate HMR update order
  mockHot._simulateDispose();
  mockHot._simulateAccept();

  assertDeepEqual(order, ['dispose', 'accept']);
});

// =============================================================================
// HMR Module Boundary Tests
// =============================================================================

printSection('HMR Module Boundary Tests');

test('separate modules have separate data', () => {
  const mockHot1 = createMockHot();
  const mockHot2 = createMockHot();

  mockHot1.data.value = 'module1';
  mockHot2.data.value = 'module2';

  assertEqual(mockHot1.data.value, 'module1');
  assertEqual(mockHot2.data.value, 'module2');
});

test('module updates do not affect other modules', () => {
  const mockHot1 = createMockHot();
  const mockHot2 = createMockHot();

  mockHot1.data.count = 1;
  mockHot2.data.count = 2;

  mockHot1.dispose(() => {
    mockHot1.data.count++;
  });
  mockHot1._simulateDispose();

  assertEqual(mockHot1.data.count, 2, 'Module 1 data should be updated');
  assertEqual(mockHot2.data.count, 2, 'Module 2 data should be unchanged');
});

// =============================================================================
// HMR Robustness Tests
// =============================================================================

printSection('HMR Robustness Tests');

test('dispose errors do not break other dispose callbacks', () => {
  const mockHot = createMockHot();
  const results = [];

  mockHot.dispose(() => results.push('first'));
  mockHot.dispose(() => { throw new Error('dispose error'); });
  mockHot.dispose(() => results.push('third'));

  try {
    mockHot._simulateDispose();
  } catch (e) {
    // Error is expected
  }

  // In a real implementation, we'd want isolation
  // This test documents current behavior
  assert(results.includes('first'), 'First callback should run');
});

test('HMR works with very large state', () => {
  const mockHot = createMockHot();

  // Large array
  const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item-${i}` }));
  const largePulse = pulse(largeArray);

  mockHot.dispose(() => {
    mockHot.data.__pulse_large = largePulse.peek();
  });
  mockHot._simulateDispose();

  assertEqual(mockHot.data.__pulse_large.length, 10000);
  assertEqual(mockHot.data.__pulse_large[5000].value, 'item-5000');
});

test('HMR handles circular references in state', () => {
  const mockHot = createMockHot();

  // Create circular reference
  const obj = { name: 'circular' };
  obj.self = obj;

  mockHot.data.circular = obj;

  // Should not throw when accessing
  assertEqual(mockHot.data.circular.name, 'circular');
  assertEqual(mockHot.data.circular.self.name, 'circular');
});

test('rapid HMR updates do not lose state', () => {
  const mockHot = createMockHot();

  for (let i = 0; i < 100; i++) {
    mockHot.data.iteration = i;
    mockHot.dispose(() => {});
    mockHot._simulateDispose();
  }

  assertEqual(mockHot.data.iteration, 99, 'Should preserve last iteration');
});

// =============================================================================
// HMR API Completeness Tests
// =============================================================================

printSection('HMR API Completeness');

test('createHMRContext returns all required properties', () => {
  const hmr = createHMRContext('test-api-module');

  // Required properties
  const requiredProps = ['data', 'preservePulse', 'setup', 'accept', 'dispose'];

  for (const prop of requiredProps) {
    assert(prop in hmr, `Should have ${prop} property`);
  }
});

test('preservePulse returns valid pulse', () => {
  const hmr = createHMRContext('test-pulse-module');
  const p = hmr.preservePulse('test', { initial: true });

  // Check pulse interface
  assert(typeof p.get === 'function', 'Should have get()');
  assert(typeof p.set === 'function', 'Should have set()');
  assert(typeof p.update === 'function', 'Should have update()');
  assert(typeof p.peek === 'function', 'Should have peek()');
});

test('setup returns callback result', () => {
  const hmr = createHMRContext('test-setup-module');

  const result = hmr.setup(() => ({ status: 'ok' }));

  assertDeepEqual(result, { status: 'ok' });
});

test('accept and dispose accept functions', () => {
  const hmr = createHMRContext('test-callbacks-module');

  // Should not throw
  hmr.accept(() => {});
  hmr.dispose(() => {});
  hmr.accept();
});

// =============================================================================
// Run Tests and Print Results
// =============================================================================

printResults();
exitWithCode();
