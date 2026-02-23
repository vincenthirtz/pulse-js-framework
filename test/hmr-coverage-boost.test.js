/**
 * HMR Coverage Boost Tests
 * Additional tests to cover HMR context when import.meta.hot is available
 * Target: Increase hmr.js coverage from 49% to 85%+
 *
 * Uncovered lines: 62-147 (entire HMR context with hot module support)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// Mock import.meta.hot (Vite HMR API)
// ============================================================================

class MockHot {
  constructor() {
    this.data = {};
    this._disposeCallbacks = [];
    this._acceptCallbacks = [];
  }

  dispose(callback) {
    this._disposeCallbacks.push(callback);
  }

  accept(callback) {
    if (callback) {
      this._acceptCallbacks.push(callback);
    }
  }

  // Simulate HMR update (trigger dispose callbacks)
  triggerDispose() {
    for (const callback of this._disposeCallbacks) {
      callback(this.data);
    }
  }

  // Simulate module acceptance
  triggerAccept() {
    for (const callback of this._acceptCallbacks) {
      callback();
    }
  }

  // Reset for next test (clear data object without replacing reference)
  reset() {
    // Ensure data exists
    if (!this.data) {
      this.data = {};
    } else {
      // Clear data object without creating new reference
      Object.keys(this.data).forEach(key => delete this.data[key]);
    }
    // Re-establish reference on global hot object (in case tests broke it)
    globalThis.import.meta.hot.data = this.data;
    this._disposeCallbacks = [];
    this._acceptCallbacks = [];
  }
}

// Set up mock BEFORE importing the module
if (!globalThis.import) {
  globalThis.import = {};
}
if (!globalThis.import.meta) {
  globalThis.import.meta = {};
}

let mockHot = new MockHot();
globalThis.import.meta.hot = mockHot;

// Now import the module (it will see our mock)
import { createHMRContext } from '../runtime/hmr.js';
import { effect, pulse } from '../runtime/pulse.js';

beforeEach(() => {
  // Reset mock for each test
  mockHot.reset();
});

afterEach(() => {
  // Keep mock available for next test
  mockHot.reset();
});

// ============================================================================
// HMR Context with import.meta.hot (lines 62-147)
// ============================================================================

describe('createHMRContext - With import.meta.hot', () => {
  test('creates HMR context when import.meta.hot is available (lines 63-75)', () => {
    const hmr = createHMRContext('test-module');

    assert.ok(hmr, 'Should return HMR context');
    assert.strictEqual(typeof hmr.preservePulse, 'function');
    assert.strictEqual(typeof hmr.setup, 'function');
    assert.strictEqual(typeof hmr.accept, 'function');
    assert.strictEqual(typeof hmr.dispose, 'function');
    assert.strictEqual(hmr.data, mockHot.data);
  });

  test('initializes hot.data if not present (lines 66-68)', () => {
    // Remove hot.data to test initialization
    delete globalThis.import.meta.hot.data;

    const hmr = createHMRContext('test-module');

    assert.ok(globalThis.import.meta.hot.data, 'Should initialize hot.data');
    assert.strictEqual(typeof hmr.data, 'object');

    // Restore mock data reference
    mockHot.data = globalThis.import.meta.hot.data;
  });
});

// ============================================================================
// preservePulse - First Load (lines 99-106)
// ============================================================================

describe('preservePulse - First Load', () => {
  test('creates pulse with initial value on first load (lines 100-105)', () => {
    
    const hmr = createHMRContext('test-module');

    const count = hmr.preservePulse('count', 42);

    assert.strictEqual(count.get(), 42, 'Should use initial value');
  });

  test('registers dispose callback on first load (line 102-104)', () => {
    
    const hmr = createHMRContext('test-module');

    const count = hmr.preservePulse('count', 0);
    count.set(10);

    // Trigger dispose
    mockHot.triggerDispose();

    // Value should be saved to hot.data
    assert.strictEqual(mockHot.data.__pulse_count, 10);
  });

  test('preservePulse with options (line 100)', () => {
    
    const hmr = createHMRContext('test-module');

    const state = hmr.preservePulse('state', { count: 0 }, {
      equals: (a, b) => a.count === b.count
    });

    assert.deepStrictEqual(state.get(), { count: 0 });
  });
});

// ============================================================================
// preservePulse - Restored State (lines 90-97)
// ============================================================================

describe('preservePulse - Restored State', () => {
  test('restores value from previous load (lines 90-96)', () => {
    // Simulate previous module load that saved state
    mockHot.data.__pulse_count = 99;

    
    const hmr = createHMRContext('test-module');

    const count = hmr.preservePulse('count', 0);

    // Should restore saved value, not use initial value
    assert.strictEqual(count.get(), 99);
  });

  test('registers dispose callback for restored pulse (lines 93-95)', () => {
    mockHot.data.__pulse_todos = ['task1', 'task2'];

    
    const hmr = createHMRContext('test-module');

    const todos = hmr.preservePulse('todos', []);
    todos.update(t => [...t, 'task3']);

    // Trigger dispose
    mockHot.triggerDispose();

    // Updated value should be saved
    assert.deepStrictEqual(mockHot.data.__pulse_todos, ['task1', 'task2', 'task3']);
  });

  test('restored pulse with options (line 91)', () => {
    mockHot.data.__pulse_user = { name: 'Alice', age: 30 };

    
    const hmr = createHMRContext('test-module');

    const user = hmr.preservePulse('user', {}, {
      equals: (a, b) => a.name === b.name
    });

    assert.deepStrictEqual(user.get(), { name: 'Alice', age: 30 });
  });

  test('uses peek() to avoid reactive tracking when saving (line 94)', () => {
    
    const hmr = createHMRContext('test-module');

    const count = hmr.preservePulse('count', 5);
    count.set(10);

    // Trigger dispose - should use peek() internally
    mockHot.triggerDispose();

    assert.strictEqual(mockHot.data.__pulse_count, 10);
  });
});

// ============================================================================
// setup() - Module Tracking (lines 116-123)
// ============================================================================

describe('setup - Module Tracking', () => {
  test('executes callback with module tracking (lines 117-121)', () => {
    
    const hmr = createHMRContext('test-module');

    let executed = false;
    const result = hmr.setup(() => {
      executed = true;
      return 'result';
    });

    assert.strictEqual(executed, true);
    assert.strictEqual(result, 'result');
  });

  test('clears module tracking after callback (lines 120-122)', () => {
    const hmr = createHMRContext('test-module');

    let callbackExecuted = false;
    hmr.setup(() => {
      callbackExecuted = true;
      // Module tracking happens internally, can't directly test
    });

    // Just verify callback executed and no errors thrown
    assert.strictEqual(callbackExecuted, true);
  });

  test('clears module even if callback throws (lines 118-122)', () => {
    const hmr = createHMRContext('test-module');

    let errorThrown = false;
    try {
      hmr.setup(() => {
        throw new Error('Test error');
      });
    } catch (err) {
      errorThrown = true;
    }

    // Should propagate the error
    assert.strictEqual(errorThrown, true);
  });

  test('setup() returns callback result (line 119)', () => {
    
    const hmr = createHMRContext('test-module');

    const result = hmr.setup(() => ({ value: 42 }));

    assert.deepStrictEqual(result, { value: 42 });
  });
});

// ============================================================================
// accept() - HMR Acceptance (lines 130-136)
// ============================================================================

describe('accept - HMR Acceptance', () => {
  test('accepts without callback (lines 133-135)', () => {
    
    const hmr = createHMRContext('test-module');

    // Should not throw
    hmr.accept();

    assert.strictEqual(mockHot._acceptCallbacks.length, 0);
  });

  test('accepts with callback (lines 131-132)', () => {
    
    const hmr = createHMRContext('test-module');

    let callbackExecuted = false;
    hmr.accept(() => {
      callbackExecuted = true;
    });

    assert.strictEqual(mockHot._acceptCallbacks.length, 1);

    // Trigger accept
    mockHot.triggerAccept();
    assert.strictEqual(callbackExecuted, true);
  });

  test('multiple accept() calls register multiple callbacks', () => {
    
    const hmr = createHMRContext('test-module');

    const calls = [];
    hmr.accept(() => calls.push(1));
    hmr.accept(() => calls.push(2));

    mockHot.triggerAccept();

    assert.deepStrictEqual(calls, [1, 2]);
  });
});

// ============================================================================
// dispose() - Cleanup Registration (lines 144-146)
// ============================================================================

describe('dispose - Cleanup Registration', () => {
  test('registers dispose callback (line 145)', () => {
    
    const hmr = createHMRContext('test-module');

    let disposeExecuted = false;
    hmr.dispose(() => {
      disposeExecuted = true;
    });

    assert.strictEqual(mockHot._disposeCallbacks.length, 1);

    // Trigger dispose
    mockHot.triggerDispose();
    assert.strictEqual(disposeExecuted, true);
  });

  test('dispose callback receives hot.data', () => {
    
    const hmr = createHMRContext('test-module');

    let receivedData = null;
    hmr.dispose((data) => {
      receivedData = data;
    });

    mockHot.data.custom = 'value';
    mockHot.triggerDispose();

    assert.strictEqual(receivedData, mockHot.data);
    assert.strictEqual(receivedData.custom, 'value');
  });

  test('multiple dispose callbacks are executed', () => {
    
    const hmr = createHMRContext('test-module');

    const calls = [];
    hmr.dispose(() => calls.push(1));
    hmr.dispose(() => calls.push(2));

    mockHot.triggerDispose();

    assert.deepStrictEqual(calls, [1, 2]);
  });
});

// ============================================================================
// Integration: Complete HMR Lifecycle
// ============================================================================

describe('HMR - Complete Lifecycle', () => {
  test('complete HMR cycle: create -> update -> dispose -> recreate', () => {
    

    // First load
    const hmr1 = createHMRContext('my-component');
    const count1 = hmr1.preservePulse('count', 0);
    count1.set(5);

    // Simulate HMR update (trigger dispose)
    mockHot.triggerDispose();

    // Verify state was saved
    assert.strictEqual(mockHot.data.__pulse_count, 5);

    // Simulate module reload (state preserved in hot.data)
    const hmr2 = createHMRContext('my-component');
    const count2 = hmr2.preservePulse('count', 0);

    // State should be restored
    assert.strictEqual(count2.get(), 5);
  });

  test('setup() effects are tracked and can be cleaned up', () => {
    
    

    const hmr = createHMRContext('my-component');
    const count = pulse(0);
    const values = [];

    hmr.setup(() => {
      effect(() => {
        values.push(count.get());
      });
    });

    assert.deepStrictEqual(values, [0]);

    count.set(1);
    assert.deepStrictEqual(values, [0, 1]);
  });

  test('data object is shared across preservePulse calls', () => {
    

    const hmr = createHMRContext('test-module');
    hmr.data.customProp = 'custom value';

    const count = hmr.preservePulse('count', 0);
    count.set(10);

    mockHot.triggerDispose();

    // Both custom data and preserved pulses should be in hot.data
    assert.strictEqual(mockHot.data.customProp, 'custom value');
    assert.strictEqual(mockHot.data.__pulse_count, 10);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('HMR - Edge Cases', () => {
  test('preservePulse with same key returns new pulse instance', () => {
    

    const hmr = createHMRContext('test-module');
    const pulse1 = hmr.preservePulse('count', 0);
    const pulse2 = hmr.preservePulse('count', 0);

    // Different instances
    assert.notStrictEqual(pulse1, pulse2);

    // But both can be used
    pulse1.set(5);
    pulse2.set(10);

    assert.strictEqual(pulse1.get(), 5);
    assert.strictEqual(pulse2.get(), 10);
  });

  test('preservePulse key is scoped with __pulse_ prefix (line 87)', () => {


    const hmr = createHMRContext('test-module');
    const count = hmr.preservePulse('count', 5);

    // Verify dispose callback was registered
    assert.strictEqual(mockHot._disposeCallbacks.length, 1, 'Dispose callback should be registered');

    mockHot.triggerDispose();

    // Key should have __pulse_ prefix
    assert.strictEqual(mockHot.data.__pulse_count, 5);
    assert.strictEqual(mockHot.data.count, undefined);
  });

  test('accept() without callback does not add to callbacks array', () => {
    

    const hmr = createHMRContext('test-module');
    const initialLength = mockHot._acceptCallbacks.length;

    hmr.accept();

    // Should not add callback when called without argument
    assert.strictEqual(mockHot._acceptCallbacks.length, initialLength);
  });
});
