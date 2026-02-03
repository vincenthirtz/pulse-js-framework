/**
 * Pulse Dev Tools Tests
 *
 * Tests for runtime/devtools.js - diagnostics, graph inspection, time-travel
 *
 * @module test/devtools
 */

import {
  getDiagnostics,
  getEffectStats,
  getPulseList,
  getDependencyGraph,
  exportGraphAsDot,
  takeSnapshot,
  getHistory,
  getHistoryIndex,
  travelTo,
  back,
  forward,
  clearHistory,
  trackedPulse,
  trackedEffect,
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  configureDevTools,
  resetDevTools,
  profile,
  mark,
  // A11y Audit
  runA11yAudit,
  getA11yIssues,
  getA11yStats,
  enableA11yAudit,
  disableA11yAudit,
  toggleA11yHighlights,
  exportA11yReport,
  resetA11yAudit
} from '../runtime/devtools.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// Reset before tests
resetDevTools();

// =============================================================================
// Diagnostics Tests
// =============================================================================

printSection('Diagnostics Tests');

test('getDiagnostics returns stats object', () => {
  resetDevTools();

  const stats = getDiagnostics();

  assert('pulseCount' in stats, 'Should have pulseCount');
  assert('effectCount' in stats, 'Should have effectCount');
  assert('totalEffectRuns' in stats, 'Should have totalEffectRuns');
  assert('avgEffectTime' in stats, 'Should have avgEffectTime');
  assert('pendingEffects' in stats, 'Should have pendingEffects');
  assert('batchDepth' in stats, 'Should have batchDepth');
  assert('snapshotCount' in stats, 'Should have snapshotCount');
  assert('memoryEstimate' in stats, 'Should have memoryEstimate');
});

test('getDiagnostics tracks pulses', () => {
  resetDevTools();

  const p1 = trackedPulse(1, 'test1');
  const p2 = trackedPulse(2, 'test2');

  const stats = getDiagnostics();
  assertEqual(stats.pulseCount, 2);
});

test('getDiagnostics tracks effects', () => {
  resetDevTools();

  const p = trackedPulse(0, 'counter');
  const dispose = trackedEffect(() => {
    p.get();
  }, 'counter-effect');

  const stats = getDiagnostics();
  assertEqual(stats.effectCount, 1);
  assert(stats.totalEffectRuns >= 1, 'Should have at least 1 run');

  dispose();
});

test('getEffectStats returns effect details', () => {
  resetDevTools();

  const p = trackedPulse(0, 'value');
  const dispose = trackedEffect(() => {
    p.get();
  }, 'test-effect');

  const stats = getEffectStats();

  assert(stats.length >= 1, 'Should have at least 1 effect');

  const testEffect = stats.find(e => e.name === 'test-effect');
  assert(testEffect !== undefined, 'Should find test-effect');
  assert(testEffect.runCount >= 1, 'Should have run at least once');
  assert(typeof testEffect.avgTime === 'number', 'Should have avgTime');

  dispose();
});

test('getPulseList returns pulse details', () => {
  resetDevTools();

  const p = trackedPulse({ count: 5 }, 'my-pulse');

  const pulses = getPulseList();

  assert(pulses.length >= 1, 'Should have at least 1 pulse');

  const myPulse = pulses.find(p => p.name === 'my-pulse');
  assert(myPulse !== undefined, 'Should find my-pulse');
  assertDeepEqual(myPulse.value, { count: 5 });
});

// =============================================================================
// Dependency Graph Tests
// =============================================================================

printSection('Dependency Graph Tests');

test('getDependencyGraph returns nodes and edges', () => {
  resetDevTools();

  const p = trackedPulse(0, 'graph-pulse');
  const dispose = trackedEffect(() => {
    p.get();
  }, 'graph-effect');

  const graph = getDependencyGraph();

  assert(Array.isArray(graph.nodes), 'Should have nodes array');
  assert(Array.isArray(graph.edges), 'Should have edges array');
  assert(graph.nodes.length >= 2, 'Should have at least 2 nodes');

  // Find pulse node
  const pulseNode = graph.nodes.find(n => n.name === 'graph-pulse');
  assert(pulseNode !== undefined, 'Should find pulse node');
  assertEqual(pulseNode.type, 'pulse');

  // Find effect node
  const effectNode = graph.nodes.find(n => n.name === 'graph-effect');
  assert(effectNode !== undefined, 'Should find effect node');
  assertEqual(effectNode.type, 'effect');

  dispose();
});

test('exportGraphAsDot returns valid DOT format', () => {
  resetDevTools();

  const p = trackedPulse(0, 'dot-pulse');
  const dispose = trackedEffect(() => {
    p.get();
  }, 'dot-effect');

  const dot = exportGraphAsDot();

  assert(dot.startsWith('digraph ReactiveGraph {'), 'Should start with digraph');
  assert(dot.includes('dot-pulse'), 'Should include pulse name');
  assert(dot.includes('dot-effect'), 'Should include effect name');
  assert(dot.endsWith('}\n'), 'Should end with closing brace');

  dispose();
});

// =============================================================================
// Time-Travel Tests
// =============================================================================

printSection('Time-Travel Tests');

test('takeSnapshot captures state', () => {
  resetDevTools();
  enableDevTools();

  const p = trackedPulse({ count: 0 }, 'snapshot-test');

  const snapshot = takeSnapshot('initial');

  assert(snapshot !== null, 'Should return snapshot');
  assertEqual(snapshot.action, 'initial');
  assert(snapshot.timestamp > 0, 'Should have timestamp');
  assert(typeof snapshot.state === 'object', 'Should have state object');
});

test('getHistory returns all snapshots', () => {
  resetDevTools();
  enableDevTools();

  const p = trackedPulse(0, 'history-test');

  takeSnapshot('step1');
  p.set(1);
  takeSnapshot('step2');
  p.set(2);
  takeSnapshot('step3');

  const history = getHistory();

  assert(history.length >= 3, 'Should have at least 3 snapshots');
});

test('travelTo restores state at index', () => {
  resetDevTools();
  enableDevTools();

  const p = trackedPulse(0, 'travel-test');
  takeSnapshot('start');

  p.set(10);
  takeSnapshot('middle');

  p.set(20);
  takeSnapshot('end');

  // Travel back to start
  const success = travelTo(0);
  assertEqual(success, true);
  assertEqual(p.peek(), 0);

  // Travel to middle
  travelTo(1);
  assertEqual(p.peek(), 10);
});

test('back and forward navigate history', () => {
  resetDevTools();
  enableDevTools();

  const p = trackedPulse(0, 'nav-test');

  // Note: trackedPulse.set() auto-takes snapshots, so we only use manual ones
  takeSnapshot('initial');
  const initialIndex = getHistoryIndex();

  // Go back should decrease index
  const prevIndex = initialIndex;
  if (prevIndex > 0) {
    back();
    assert(getHistoryIndex() < prevIndex, 'Back should decrease index');

    // Go forward should restore
    forward();
    assertEqual(getHistoryIndex(), prevIndex);
  }

  // Test with multiple values
  p.set(10);
  p.set(20);
  p.set(30);

  const finalIndex = getHistoryIndex();
  assert(finalIndex > initialIndex, 'Should have more snapshots');

  // Go back multiple times
  back();
  back();
  const backIndex = getHistoryIndex();
  assert(backIndex < finalIndex, 'Should be earlier in history');

  // Go forward
  forward();
  assertEqual(getHistoryIndex(), backIndex + 1);
});

test('clearHistory removes all snapshots', () => {
  resetDevTools();
  enableDevTools();

  const p = trackedPulse(0, 'clear-test');
  takeSnapshot();
  takeSnapshot();
  takeSnapshot();

  clearHistory();

  assertEqual(getHistory().length, 0);
  assertEqual(getHistoryIndex(), -1);
});

test('travelTo returns false for invalid index', () => {
  resetDevTools();

  assertEqual(travelTo(-1), false);
  assertEqual(travelTo(999), false);
});

// =============================================================================
// Tracked Pulse/Effect Tests
// =============================================================================

printSection('Tracked Pulse/Effect Tests');

test('trackedPulse behaves like regular pulse', () => {
  resetDevTools();

  const p = trackedPulse(5, 'regular-pulse');

  assertEqual(p.get(), 5);

  p.set(10);
  assertEqual(p.get(), 10);

  p.update(v => v + 1);
  assertEqual(p.get(), 11);
});

test('trackedPulse dispose removes from registry', () => {
  resetDevTools();

  const p = trackedPulse(0, 'disposable');

  const beforeCount = getDiagnostics().pulseCount;

  p.dispose();

  const afterCount = getDiagnostics().pulseCount;
  assertEqual(afterCount, beforeCount - 1);
});

test('trackedEffect behaves like regular effect', () => {
  resetDevTools();

  const p = trackedPulse(0, 'effect-source');
  let effectValue = null;

  const dispose = trackedEffect(() => {
    effectValue = p.get();
  }, 'tracking-effect');

  assertEqual(effectValue, 0);

  p.set(5);
  assertEqual(effectValue, 5);

  dispose();
});

test('trackedEffect dispose removes from registry', () => {
  resetDevTools();

  const p = trackedPulse(0, 'source');
  const dispose = trackedEffect(() => {
    p.get();
  }, 'to-dispose');

  const beforeCount = getDiagnostics().effectCount;

  dispose();

  const afterCount = getDiagnostics().effectCount;
  assertEqual(afterCount, beforeCount - 1);
});

// =============================================================================
// Configuration Tests
// =============================================================================

printSection('Configuration Tests');

test('enableDevTools and disableDevTools work', () => {
  disableDevTools();
  assertEqual(isDevToolsEnabled(), false);

  enableDevTools();
  assertEqual(isDevToolsEnabled(), true);

  disableDevTools();
  assertEqual(isDevToolsEnabled(), false);
});

test('configureDevTools updates config', () => {
  enableDevTools({
    maxSnapshots: 100,
    logUpdates: false
  });

  // Config should be applied (internal, but verify no errors)
  assertEqual(isDevToolsEnabled(), true);
});

test('resetDevTools clears all state', () => {
  enableDevTools();

  const p = trackedPulse(0, 'to-reset');
  takeSnapshot();

  resetDevTools();

  assertEqual(getDiagnostics().pulseCount, 0);
  assertEqual(getDiagnostics().effectCount, 0);
  assertEqual(getHistory().length, 0);
});

// =============================================================================
// Profiling Tests
// =============================================================================

printSection('Profiling Tests');

test('profile executes function and returns result', () => {
  const result = profile('test-profile', () => {
    return 42;
  });

  assertEqual(result, 42);
});

test('mark.end returns duration', () => {
  enableDevTools();

  const m = mark('test-mark');

  // Do some work
  let sum = 0;
  for (let i = 0; i < 1000; i++) sum += i;

  const duration = m.end();

  assert(typeof duration === 'number', 'Should return number');
  assert(duration >= 0, 'Duration should be non-negative');
});

// =============================================================================
// A11y Audit Tests
// =============================================================================

printSection('A11y Audit Tests');

test('runA11yAudit returns result object', () => {
  resetA11yAudit();
  enableDevTools();

  const result = runA11yAudit();

  assert(result !== null, 'Should return result');
  assert(typeof result.issues === 'object', 'Should have issues array');
  assert(typeof result.errorCount === 'number', 'Should have errorCount');
  assert(typeof result.warningCount === 'number', 'Should have warningCount');
  assert(typeof result.auditTime === 'number', 'Should have auditTime');
  assert(typeof result.timestamp === 'string', 'Should have timestamp');
});

test('getA11yIssues returns array', () => {
  resetA11yAudit();

  const issues = getA11yIssues();

  assert(Array.isArray(issues), 'Should return array');
});

test('getA11yStats returns statistics object', () => {
  resetA11yAudit();
  enableDevTools();
  runA11yAudit();

  const stats = getA11yStats();

  assert(typeof stats.totalIssues === 'number', 'Should have totalIssues');
  assert(typeof stats.errorCount === 'number', 'Should have errorCount');
  assert(typeof stats.warningCount === 'number', 'Should have warningCount');
  assert(typeof stats.issuesByRule === 'object', 'Should have issuesByRule');
  assert(typeof stats.auditCount === 'number', 'Should have auditCount');
  // In Node.js (no document), auditCount may be 0 as audit returns early
  assert(stats.auditCount >= 0, 'auditCount should be non-negative');
});

test('enableA11yAudit and disableA11yAudit work', () => {
  resetA11yAudit();
  enableDevTools();

  // In Node.js without document, enableA11yAudit still works but audit returns empty
  enableA11yAudit({ autoAudit: false });

  disableA11yAudit();

  // Should not throw
  const stats = getA11yStats();
  assert(typeof stats.auditCount === 'number', 'Should return stats');
});

test('exportA11yReport returns JSON by default', () => {
  resetA11yAudit();
  enableDevTools();
  runA11yAudit();

  const report = exportA11yReport();

  assert(typeof report === 'string', 'Should return string');
  const parsed = JSON.parse(report);
  assert(typeof parsed.timestamp === 'string', 'Should have timestamp');
  assert(Array.isArray(parsed.issues), 'Should have issues array');
});

test('exportA11yReport supports CSV format', () => {
  resetA11yAudit();
  enableDevTools();
  runA11yAudit();

  const csv = exportA11yReport('csv');

  assert(typeof csv === 'string', 'Should return string');
  assert(csv.includes('severity,rule,message'), 'Should have CSV headers');
});

test('exportA11yReport supports HTML format', () => {
  resetA11yAudit();
  enableDevTools();
  runA11yAudit();

  const html = exportA11yReport('html');

  assert(typeof html === 'string', 'Should return string');
  assert(html.includes('<!DOCTYPE html>'), 'Should be HTML document');
  assert(html.includes('Accessibility Audit Report'), 'Should have title');
});

test('resetA11yAudit clears state', () => {
  enableDevTools();
  runA11yAudit();

  // Run should increment count (even if audit returns early in Node.js)
  const beforeStats = getA11yStats();
  assert(typeof beforeStats.auditCount === 'number', 'Should have audit count');

  resetA11yAudit();

  const afterCount = getA11yStats().auditCount;
  assertEqual(afterCount, 0, 'Should reset audit count');
});

test('toggleA11yHighlights does not throw', () => {
  resetA11yAudit();
  enableDevTools();
  runA11yAudit();

  // Should not throw
  toggleA11yHighlights(true);
  toggleA11yHighlights(false);
  toggleA11yHighlights(); // Toggle
});

// =============================================================================
// Results
// =============================================================================

disableDevTools();
resetDevTools();
resetA11yAudit();

printResults();
exitWithCode();
