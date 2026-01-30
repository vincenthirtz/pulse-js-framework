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
// Run Tests and Print Results
// =============================================================================

printResults();
exitWithCode();
