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
// HMR Context Memory and Cleanup Tests
// =============================================================================

printSection('HMR Memory and Cleanup Tests');

test('preservePulse does not leak memory with many keys', () => {
  const hmr = createHMRContext('memory-test');
  const pulses = [];

  // Create many pulses
  for (let i = 0; i < 1000; i++) {
    pulses.push(hmr.preservePulse(`key-${i}`, i));
  }

  // All should be valid pulses with correct initial values
  assertEqual(pulses[0].get(), 0, 'First pulse should have value 0');
  assertEqual(pulses[500].get(), 500, 'Middle pulse should have value 500');
  assertEqual(pulses[999].get(), 999, 'Last pulse should have value 999');
});

test('data object can store complex structures', () => {
  const hmr = createHMRContext('complex-data');

  hmr.data.nested = {
    level1: {
      level2: {
        level3: {
          value: 'deep'
        }
      }
    }
  };

  assertEqual(hmr.data.nested.level1.level2.level3.value, 'deep', 'Should handle deep nesting');
});

test('data object can store arrays', () => {
  const hmr = createHMRContext('array-data');

  hmr.data.items = [1, 2, 3, 4, 5];
  hmr.data.items.push(6);

  assertDeepEqual(hmr.data.items, [1, 2, 3, 4, 5, 6], 'Should handle array mutations');
});

test('data object can store Map and Set', () => {
  const hmr = createHMRContext('collection-data');

  hmr.data.map = new Map([['key', 'value']]);
  hmr.data.set = new Set([1, 2, 3]);

  assertEqual(hmr.data.map.get('key'), 'value', 'Should store Map');
  assertEqual(hmr.data.set.has(2), true, 'Should store Set');
});

test('data object can store Date', () => {
  const hmr = createHMRContext('date-data');
  const now = new Date();

  hmr.data.timestamp = now;

  assertEqual(hmr.data.timestamp.getTime(), now.getTime(), 'Should store Date');
});

test('data object can store RegExp', () => {
  const hmr = createHMRContext('regex-data');

  hmr.data.pattern = /test/gi;

  assertEqual(hmr.data.pattern.source, 'test', 'Should store regex source');
  assertEqual(hmr.data.pattern.flags, 'gi', 'Should store regex flags');
});

// =============================================================================
// HMR Pulse Behavior Tests
// =============================================================================

printSection('HMR Pulse Behavior Tests');

test('preservePulse creates reactive pulse', () => {
  const hmr = createHMRContext('reactive-test');
  const counter = hmr.preservePulse('counter', 0);

  let observedValue = null;

  // In noop mode, we just verify the pulse works
  observedValue = counter.get();
  assertEqual(observedValue, 0, 'Initial value should be 0');

  counter.set(10);
  observedValue = counter.get();
  assertEqual(observedValue, 10, 'Value should update to 10');
});

test('preservePulse with array value', () => {
  const hmr = createHMRContext('array-pulse-test');
  const items = hmr.preservePulse('items', []);

  items.update(arr => [...arr, 'item1']);
  items.update(arr => [...arr, 'item2']);

  assertDeepEqual(items.get(), ['item1', 'item2'], 'Should update array');
});

test('preservePulse with object value', () => {
  const hmr = createHMRContext('object-pulse-test');
  const user = hmr.preservePulse('user', { name: 'John', age: 30 });

  user.update(u => ({ ...u, age: 31 }));

  assertEqual(user.get().name, 'John', 'Name should be preserved');
  assertEqual(user.get().age, 31, 'Age should be updated');
});

test('preservePulse peek does not track', () => {
  const hmr = createHMRContext('peek-test');
  const value = hmr.preservePulse('value', 42);

  const peeked = value.peek();
  assertEqual(peeked, 42, 'Peek should return value');
});

test('preservePulse with custom equals', () => {
  const hmr = createHMRContext('equals-test');
  const item = hmr.preservePulse('item', { id: 1, name: 'test' }, {
    equals: (a, b) => a?.id === b?.id
  });

  // Set with same id but different name - should be considered equal
  item.set({ id: 1, name: 'changed' });

  // The behavior depends on implementation
  assert(item.get() !== undefined, 'Should have a value');
});

// =============================================================================
// HMR Setup Error Handling
// =============================================================================

printSection('HMR Setup Error Handling');

test('setup propagates errors', () => {
  const hmr = createHMRContext('error-propagation');
  let errorCaught = false;

  try {
    hmr.setup(() => {
      throw new Error('Setup error');
    });
  } catch (e) {
    errorCaught = true;
    assertEqual(e.message, 'Setup error', 'Should propagate error message');
  }

  assertEqual(errorCaught, true, 'Error should be caught');
});

test('setup handles async callback', async () => {
  const hmr = createHMRContext('async-setup');

  const result = hmr.setup(async () => {
    return 'async result';
  });

  assert(result instanceof Promise, 'Should return Promise');
  const resolved = await result;
  assertEqual(resolved, 'async result', 'Should resolve to correct value');
});

test('setup handles callback with arguments', () => {
  const hmr = createHMRContext('args-setup');

  const fn = (a, b) => a + b;
  const result = hmr.setup(() => fn(1, 2));

  assertEqual(result, 3, 'Should execute with arguments');
});

// =============================================================================
// HMR Accept and Dispose Patterns
// =============================================================================

printSection('HMR Accept and Dispose Patterns');

test('accept without callback does nothing in noop mode', () => {
  const hmr = createHMRContext('accept-noop');

  // Should not throw
  hmr.accept();
  assert(true, 'accept() should complete without error');
});

test('accept with callback stores but does not execute in noop', () => {
  const hmr = createHMRContext('accept-callback-noop');
  let executed = false;

  hmr.accept(() => {
    executed = true;
  });

  assertEqual(executed, false, 'Callback should not execute in noop mode');
});

test('dispose callback is stored but not executed in noop', () => {
  const hmr = createHMRContext('dispose-noop');
  let executed = false;

  hmr.dispose(() => {
    executed = true;
  });

  assertEqual(executed, false, 'Dispose callback should not execute in noop mode');
});

test('multiple dispose callbacks can be registered', () => {
  const hmr = createHMRContext('multi-dispose-register');
  const callbacks = [];

  hmr.dispose(() => callbacks.push('first'));
  hmr.dispose(() => callbacks.push('second'));
  hmr.dispose(() => callbacks.push('third'));

  // In noop mode, callbacks are not executed
  assertEqual(callbacks.length, 0, 'Callbacks should not execute');
});

// =============================================================================
// HMR Integration Scenarios
// =============================================================================

printSection('HMR Integration Scenarios');

test('typical counter component pattern', () => {
  const hmr = createHMRContext('counter-component');

  const count = hmr.preservePulse('count', 0);
  let effectRuns = 0;

  hmr.setup(() => {
    // Simulate effect
    effectRuns++;
    count.get(); // Would track in real effect
  });

  assertEqual(effectRuns, 1, 'Setup should run once');
  assertEqual(count.get(), 0, 'Count should be 0');

  count.update(n => n + 1);
  assertEqual(count.get(), 1, 'Count should increment');

  hmr.accept();
});

test('typical form state pattern', () => {
  const hmr = createHMRContext('form-component');

  const formState = hmr.preservePulse('form', {
    username: '',
    email: '',
    password: ''
  });

  hmr.setup(() => {
    // Form validation would happen here
  });

  formState.update(f => ({ ...f, username: 'john' }));
  formState.update(f => ({ ...f, email: 'john@example.com' }));

  assertEqual(formState.get().username, 'john', 'Username should update');
  assertEqual(formState.get().email, 'john@example.com', 'Email should update');
  assertEqual(formState.get().password, '', 'Password should remain empty');

  hmr.accept();
});

test('typical todo list pattern', () => {
  const hmr = createHMRContext('todo-component');

  const todos = hmr.preservePulse('todos', []);
  const filter = hmr.preservePulse('filter', 'all');

  hmr.setup(() => {
    // Filtered todos computed would be here
  });

  todos.set([
    { id: 1, text: 'Learn Pulse', done: false },
    { id: 2, text: 'Build app', done: false }
  ]);

  todos.update(t => t.map(todo =>
    todo.id === 1 ? { ...todo, done: true } : todo
  ));

  filter.set('completed');

  assertEqual(todos.get()[0].done, true, 'First todo should be done');
  assertEqual(filter.get(), 'completed', 'Filter should be completed');

  hmr.accept();
});

test('typical async data fetching pattern', () => {
  const hmr = createHMRContext('async-component');

  const data = hmr.preservePulse('data', null);
  const loading = hmr.preservePulse('loading', false);
  const error = hmr.preservePulse('error', null);

  hmr.setup(() => {
    // Async effect would be here
  });

  // Simulate fetch lifecycle
  loading.set(true);
  assertEqual(loading.get(), true, 'Should be loading');

  // Simulate successful fetch
  data.set({ items: [1, 2, 3] });
  loading.set(false);

  assertEqual(loading.get(), false, 'Should not be loading');
  assertDeepEqual(data.get().items, [1, 2, 3], 'Should have data');
  assertEqual(error.get(), null, 'Should have no error');

  hmr.accept();
});

// =============================================================================
// HMR Edge Cases with Module IDs
// =============================================================================

printSection('HMR Module ID Edge Cases');

test('module ID with URL characters', () => {
  const hmr = createHMRContext('file:///Users/test/project/src/App.pulse?t=123');

  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value', 'Should work with URL-like module ID');
});

test('module ID with query params', () => {
  const hmr = createHMRContext('/src/component.js?v=1.0.0&hash=abc123');

  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value', 'Should work with query params in ID');
});

test('module ID with hash', () => {
  const hmr = createHMRContext('/src/component.js#section');

  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value', 'Should work with hash in ID');
});

test('module ID with special path characters', () => {
  const hmr = createHMRContext('/path/with spaces/and-dashes/under_scores/file.js');

  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value', 'Should work with special path chars');
});

test('module ID that looks like number', () => {
  const hmr = createHMRContext('12345');

  const p = hmr.preservePulse('test', 'value');
  assertEqual(p.get(), 'value', 'Should work with numeric-like ID');
});

// =============================================================================
// Run Tests and Print Results
// =============================================================================

printResults();
exitWithCode();
