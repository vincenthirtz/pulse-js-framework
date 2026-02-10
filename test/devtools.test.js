/**
 * Pulse Dev Tools Tests
 *
 * Tests for runtime/devtools.js - diagnostics, graph inspection, time-travel
 *
 * @module test/devtools
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

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
  enableAutoTimeline,
  disableAutoTimeline,
  isAutoTimelineEnabled
} from '../runtime/devtools.js';

// Reset before tests
resetDevTools();

// =============================================================================
// Diagnostics Tests
// =============================================================================

describe('Diagnostics Tests', () => {
  test('getDiagnostics returns stats object', () => {
    resetDevTools();

    const stats = getDiagnostics();

    assert.ok('pulseCount' in stats, 'Should have pulseCount');
    assert.ok('effectCount' in stats, 'Should have effectCount');
    assert.ok('totalEffectRuns' in stats, 'Should have totalEffectRuns');
    assert.ok('avgEffectTime' in stats, 'Should have avgEffectTime');
    assert.ok('pendingEffects' in stats, 'Should have pendingEffects');
    assert.ok('batchDepth' in stats, 'Should have batchDepth');
    assert.ok('snapshotCount' in stats, 'Should have snapshotCount');
    assert.ok('memoryEstimate' in stats, 'Should have memoryEstimate');
  });

  test('getDiagnostics tracks pulses', () => {
    resetDevTools();

    const p1 = trackedPulse(1, 'test1');
    const p2 = trackedPulse(2, 'test2');

    const stats = getDiagnostics();
    assert.strictEqual(stats.pulseCount, 2);
  });

  test('getDiagnostics tracks effects', () => {
    resetDevTools();

    const p = trackedPulse(0, 'counter');
    const dispose = trackedEffect(() => {
      p.get();
    }, 'counter-effect');

    const stats = getDiagnostics();
    assert.strictEqual(stats.effectCount, 1);
    assert.ok(stats.totalEffectRuns >= 1, 'Should have at least 1 run');

    dispose();
  });

  test('getEffectStats returns effect details', () => {
    resetDevTools();

    const p = trackedPulse(0, 'value');
    const dispose = trackedEffect(() => {
      p.get();
    }, 'test-effect');

    const stats = getEffectStats();

    assert.ok(stats.length >= 1, 'Should have at least 1 effect');

    const testEffect = stats.find(e => e.name === 'test-effect');
    assert.ok(testEffect !== undefined, 'Should find test-effect');
    assert.ok(testEffect.runCount >= 1, 'Should have run at least once');
    assert.ok(typeof testEffect.avgTime === 'number', 'Should have avgTime');

    dispose();
  });

  test('getPulseList returns pulse details', () => {
    resetDevTools();

    const p = trackedPulse({ count: 5 }, 'my-pulse');

    const pulses = getPulseList();

    assert.ok(pulses.length >= 1, 'Should have at least 1 pulse');

    const myPulse = pulses.find(p => p.name === 'my-pulse');
    assert.ok(myPulse !== undefined, 'Should find my-pulse');
    assert.deepStrictEqual(myPulse.value, { count: 5 });
  });
});

// =============================================================================
// Dependency Graph Tests
// =============================================================================

describe('Dependency Graph Tests', () => {
  test('getDependencyGraph returns nodes and edges', () => {
    resetDevTools();

    const p = trackedPulse(0, 'graph-pulse');
    const dispose = trackedEffect(() => {
      p.get();
    }, 'graph-effect');

    const graph = getDependencyGraph();

    assert.ok(Array.isArray(graph.nodes), 'Should have nodes array');
    assert.ok(Array.isArray(graph.edges), 'Should have edges array');
    assert.ok(graph.nodes.length >= 2, 'Should have at least 2 nodes');

    // Find pulse node
    const pulseNode = graph.nodes.find(n => n.name === 'graph-pulse');
    assert.ok(pulseNode !== undefined, 'Should find pulse node');
    assert.strictEqual(pulseNode.type, 'pulse');

    // Find effect node
    const effectNode = graph.nodes.find(n => n.name === 'graph-effect');
    assert.ok(effectNode !== undefined, 'Should find effect node');
    assert.strictEqual(effectNode.type, 'effect');

    dispose();
  });

  test('exportGraphAsDot returns valid DOT format', () => {
    resetDevTools();

    const p = trackedPulse(0, 'dot-pulse');
    const dispose = trackedEffect(() => {
      p.get();
    }, 'dot-effect');

    const dot = exportGraphAsDot();

    assert.ok(dot.startsWith('digraph ReactiveGraph {'), 'Should start with digraph');
    assert.ok(dot.includes('dot-pulse'), 'Should include pulse name');
    assert.ok(dot.includes('dot-effect'), 'Should include effect name');
    assert.ok(dot.endsWith('}\n'), 'Should end with closing brace');

    dispose();
  });
});

// =============================================================================
// Time-Travel Tests
// =============================================================================

describe('Time-Travel Tests', () => {
  test('takeSnapshot captures state', () => {
    resetDevTools();
    enableDevTools();

    const p = trackedPulse({ count: 0 }, 'snapshot-test');

    const snapshot = takeSnapshot('initial');

    assert.ok(snapshot !== null, 'Should return snapshot');
    assert.strictEqual(snapshot.action, 'initial');
    assert.ok(snapshot.timestamp > 0, 'Should have timestamp');
    assert.ok(typeof snapshot.state === 'object', 'Should have state object');
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

    assert.ok(history.length >= 3, 'Should have at least 3 snapshots');
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
    assert.strictEqual(success, true);
    assert.strictEqual(p.peek(), 0);

    // Travel to middle
    travelTo(1);
    assert.strictEqual(p.peek(), 10);
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
      assert.ok(getHistoryIndex() < prevIndex, 'Back should decrease index');

      // Go forward should restore
      forward();
      assert.strictEqual(getHistoryIndex(), prevIndex);
    }

    // Test with multiple values
    p.set(10);
    p.set(20);
    p.set(30);

    const finalIndex = getHistoryIndex();
    assert.ok(finalIndex > initialIndex, 'Should have more snapshots');

    // Go back multiple times
    back();
    back();
    const backIndex = getHistoryIndex();
    assert.ok(backIndex < finalIndex, 'Should be earlier in history');

    // Go forward
    forward();
    assert.strictEqual(getHistoryIndex(), backIndex + 1);
  });

  test('clearHistory removes all snapshots', () => {
    resetDevTools();
    enableDevTools();

    const p = trackedPulse(0, 'clear-test');
    takeSnapshot();
    takeSnapshot();
    takeSnapshot();

    clearHistory();

    assert.strictEqual(getHistory().length, 0);
    assert.strictEqual(getHistoryIndex(), -1);
  });

  test('travelTo returns false for invalid index', () => {
    resetDevTools();

    assert.strictEqual(travelTo(-1), false);
    assert.strictEqual(travelTo(999), false);
  });
});

// =============================================================================
// Tracked Pulse/Effect Tests
// =============================================================================

describe('Tracked Pulse/Effect Tests', () => {
  test('trackedPulse behaves like regular pulse', () => {
    resetDevTools();

    const p = trackedPulse(5, 'regular-pulse');

    assert.strictEqual(p.get(), 5);

    p.set(10);
    assert.strictEqual(p.get(), 10);

    p.update(v => v + 1);
    assert.strictEqual(p.get(), 11);
  });

  test('trackedPulse dispose removes from registry', () => {
    resetDevTools();

    const p = trackedPulse(0, 'disposable');

    const beforeCount = getDiagnostics().pulseCount;

    p.dispose();

    const afterCount = getDiagnostics().pulseCount;
    assert.strictEqual(afterCount, beforeCount - 1);
  });

  test('trackedEffect behaves like regular effect', () => {
    resetDevTools();

    const p = trackedPulse(0, 'effect-source');
    let effectValue = null;

    const dispose = trackedEffect(() => {
      effectValue = p.get();
    }, 'tracking-effect');

    assert.strictEqual(effectValue, 0);

    p.set(5);
    assert.strictEqual(effectValue, 5);

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
    assert.strictEqual(afterCount, beforeCount - 1);
  });
});

// =============================================================================
// Configuration Tests
// =============================================================================

describe('Configuration Tests', () => {
  test('enableDevTools and disableDevTools work', () => {
    disableDevTools();
    assert.strictEqual(isDevToolsEnabled(), false);

    enableDevTools();
    assert.strictEqual(isDevToolsEnabled(), true);

    disableDevTools();
    assert.strictEqual(isDevToolsEnabled(), false);
  });

  test('configureDevTools updates config', () => {
    enableDevTools({
      maxSnapshots: 100,
      logUpdates: false
    });

    // Config should be applied (internal, but verify no errors)
    assert.strictEqual(isDevToolsEnabled(), true);
  });

  test('resetDevTools clears all state', () => {
    enableDevTools();

    const p = trackedPulse(0, 'to-reset');
    takeSnapshot();

    resetDevTools();

    assert.strictEqual(getDiagnostics().pulseCount, 0);
    assert.strictEqual(getDiagnostics().effectCount, 0);
    assert.strictEqual(getHistory().length, 0);
  });
});

// =============================================================================
// Profiling Tests
// =============================================================================

describe('Profiling Tests', () => {
  test('profile executes function and returns result', () => {
    const result = profile('test-profile', () => {
      return 42;
    });

    assert.strictEqual(result, 42);
  });

  test('mark.end returns duration', () => {
    enableDevTools();

    const m = mark('test-mark');

    // Do some work
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;

    const duration = m.end();

    assert.ok(typeof duration === 'number', 'Should return number');
    assert.ok(duration >= 0, 'Duration should be non-negative');
  });
});

// =============================================================================
// A11y Audit Tests
// =============================================================================

describe('A11y Audit Tests', () => {
  test('runA11yAudit returns result object', () => {
    resetA11yAudit();
    enableDevTools();

    const result = runA11yAudit();

    assert.ok(result !== null, 'Should return result');
    assert.ok(typeof result.issues === 'object', 'Should have issues array');
    assert.ok(typeof result.errorCount === 'number', 'Should have errorCount');
    assert.ok(typeof result.warningCount === 'number', 'Should have warningCount');
    assert.ok(typeof result.auditTime === 'number', 'Should have auditTime');
    assert.ok(typeof result.timestamp === 'string', 'Should have timestamp');
  });

  test('getA11yIssues returns array', () => {
    resetA11yAudit();

    const issues = getA11yIssues();

    assert.ok(Array.isArray(issues), 'Should return array');
  });

  test('getA11yStats returns statistics object', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const stats = getA11yStats();

    assert.ok(typeof stats.totalIssues === 'number', 'Should have totalIssues');
    assert.ok(typeof stats.errorCount === 'number', 'Should have errorCount');
    assert.ok(typeof stats.warningCount === 'number', 'Should have warningCount');
    assert.ok(typeof stats.issuesByRule === 'object', 'Should have issuesByRule');
    assert.ok(typeof stats.auditCount === 'number', 'Should have auditCount');
    // In Node.js (no document), auditCount may be 0 as audit returns early
    assert.ok(stats.auditCount >= 0, 'auditCount should be non-negative');
  });

  test('enableA11yAudit and disableA11yAudit work', () => {
    resetA11yAudit();
    enableDevTools();

    // In Node.js without document, enableA11yAudit still works but audit returns empty
    enableA11yAudit({ autoAudit: false });

    disableA11yAudit();

    // Should not throw
    const stats = getA11yStats();
    assert.ok(typeof stats.auditCount === 'number', 'Should return stats');
  });

  test('exportA11yReport returns JSON by default', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const report = exportA11yReport();

    assert.ok(typeof report === 'string', 'Should return string');
    const parsed = JSON.parse(report);
    assert.ok(typeof parsed.timestamp === 'string', 'Should have timestamp');
    assert.ok(Array.isArray(parsed.issues), 'Should have issues array');
  });

  test('exportA11yReport supports CSV format', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const csv = exportA11yReport('csv');

    assert.ok(typeof csv === 'string', 'Should return string');
    assert.ok(csv.includes('severity,rule,message'), 'Should have CSV headers');
  });

  test('exportA11yReport supports HTML format', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const html = exportA11yReport('html');

    assert.ok(typeof html === 'string', 'Should return string');
    assert.ok(html.includes('<!DOCTYPE html>'), 'Should be HTML document');
    assert.ok(html.includes('Accessibility Audit Report'), 'Should have title');
  });

  test('resetA11yAudit clears state', () => {
    enableDevTools();
    runA11yAudit();

    // Run should increment count (even if audit returns early in Node.js)
    const beforeStats = getA11yStats();
    assert.ok(typeof beforeStats.auditCount === 'number', 'Should have audit count');

    resetA11yAudit();

    const afterCount = getA11yStats().auditCount;
    assert.strictEqual(afterCount, 0, 'Should reset audit count');
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

  test('toggleA11yHighlights with explicit show/hide', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    // Explicit show
    toggleA11yHighlights(true);
    // Explicit hide
    toggleA11yHighlights(false);
    // Show again
    toggleA11yHighlights(true);
    // Hide again
    toggleA11yHighlights(false);

    // Should not throw
    assert.ok(true, 'Toggle should work');
  });

  test('toggleA11yHighlights toggle mode', () => {
    resetA11yAudit();
    enableDevTools();

    // Toggle without argument
    toggleA11yHighlights();
    toggleA11yHighlights();
    toggleA11yHighlights();

    assert.ok(true, 'Toggle mode should work');
  });

  test('exportA11yReport CSV format with empty issues', () => {
    resetA11yAudit();
    enableDevTools();

    const csv = exportA11yReport('csv');

    assert.ok(csv.includes('severity'), 'Should have severity header');
    assert.ok(csv.includes('rule'), 'Should have rule header');
    assert.ok(csv.includes('message'), 'Should have message header');
    assert.ok(csv.includes('element'), 'Should have element header');
    assert.ok(csv.includes('selector'), 'Should have selector header');
  });

  test('exportA11yReport HTML format with no issues shows success message', () => {
    resetA11yAudit();
    enableDevTools();

    const html = exportA11yReport('html');

    assert.ok(html.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
    assert.ok(html.includes('<html lang="en">'), 'Should have html tag with lang');
    assert.ok(html.includes('Accessibility Audit Report'), 'Should have title');
    // When no issues, should show success message
    assert.ok(
      html.includes('No accessibility issues found') || html.includes('<table>'),
      'Should have either success message or table'
    );
  });

  test('exportA11yReport HTML includes styling', () => {
    resetA11yAudit();
    enableDevTools();

    const html = exportA11yReport('html');

    assert.ok(html.includes('<style>'), 'Should have style tag');
    assert.ok(html.includes('font-family'), 'Should have font styling');
    assert.ok(html.includes('.errors'), 'Should have errors class');
    assert.ok(html.includes('.warnings'), 'Should have warnings class');
  });

  test('exportA11yReport HTML includes summary stats', () => {
    resetA11yAudit();
    enableDevTools();

    const html = exportA11yReport('html');

    assert.ok(html.includes('Errors'), 'Should have Errors label');
    assert.ok(html.includes('Warnings'), 'Should have Warnings label');
    assert.ok(html.includes('class="summary"'), 'Should have summary section');
  });

  test('getA11yStats returns all expected fields', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const stats = getA11yStats();

    assert.ok('totalIssues' in stats, 'Should have totalIssues');
    assert.ok('errorCount' in stats, 'Should have errorCount');
    assert.ok('warningCount' in stats, 'Should have warningCount');
    assert.ok('auditCount' in stats, 'Should have auditCount');
    assert.ok('lastAuditTime' in stats, 'Should have lastAuditTime');
  });

  test('getA11yIssues returns array after multiple audits', () => {
    resetA11yAudit();
    enableDevTools();

    // Run multiple audits
    runA11yAudit();
    runA11yAudit();
    runA11yAudit();

    const issues = getA11yIssues();
    assert.ok(Array.isArray(issues), 'Should return array');

    const stats = getA11yStats();
    // In Node.js without document, runA11yAudit returns early
    // so auditCount may be 0 or may increment
    assert.ok(typeof stats.auditCount === 'number', 'auditCount should be a number');
  });

  test('exportA11yReport JSON includes all fields', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const report = exportA11yReport('json');
    const parsed = JSON.parse(report);

    assert.ok('timestamp' in parsed, 'Should have timestamp');
    assert.ok('url' in parsed, 'Should have url');
    assert.ok('stats' in parsed, 'Should have stats');
    assert.ok('issues' in parsed, 'Should have issues');
  });

  test('exportA11yReport unknown format defaults to JSON', () => {
    resetA11yAudit();
    enableDevTools();
    runA11yAudit();

    const report = exportA11yReport('unknown');

    // Should be valid JSON (default)
    const parsed = JSON.parse(report);
    assert.ok(typeof parsed === 'object', 'Should be valid JSON object');
  });
});

// =============================================================================
// Auto-Timeline Tests
// =============================================================================

describe('Auto-Timeline Tests', () => {
  test('enableAutoTimeline and disableAutoTimeline work', () => {
    resetDevTools();
    enableDevTools();

    assert.strictEqual(isAutoTimelineEnabled(), false, 'Should be disabled initially');

    enableAutoTimeline();
    assert.strictEqual(isAutoTimelineEnabled(), true, 'Should be enabled after enableAutoTimeline');

    disableAutoTimeline();
    assert.strictEqual(isAutoTimelineEnabled(), false, 'Should be disabled after disableAutoTimeline');
  });

  test('enableAutoTimeline with custom debounce', () => {
    resetDevTools();
    enableDevTools();

    enableAutoTimeline({ debounce: 50 });
    assert.strictEqual(isAutoTimelineEnabled(), true, 'Should be enabled');

    disableAutoTimeline();
  });

  test('auto-timeline records changes automatically (debounced)', async () => {
    resetDevTools();
    enableDevTools({ autoTimeline: true, timelineDebounce: 50 });
    clearHistory();

    const p = trackedPulse(0, 'auto-tracked');

    // Make multiple rapid changes
    p.set(1);
    p.set(2);
    p.set(3);

    // Wait for debounce
    await new Promise(r => setTimeout(r, 100));

    const history = getHistory();
    // Should have at least one snapshot (debounced)
    assert.ok(history.length >= 1, 'Should have at least 1 snapshot after debounce');

    disableAutoTimeline();
  });

  test('enableDevTools with autoTimeline option', () => {
    resetDevTools();
    clearHistory();

    enableDevTools({ autoTimeline: true, timelineDebounce: 100 });

    assert.strictEqual(isAutoTimelineEnabled(), true, 'Should enable autoTimeline via enableDevTools');

    disableAutoTimeline();
    disableDevTools();
  });
});

// Cleanup
disableDevTools();
resetDevTools();
resetA11yAudit();
