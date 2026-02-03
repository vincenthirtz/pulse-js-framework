/**
 * Pulse Dev Tools
 * @module pulse-js-framework/runtime/devtools
 *
 * Development tools for debugging reactive applications:
 * - Reactive dependency graph inspection
 * - Time-travel debugging with state snapshots
 * - Performance monitoring
 * - Effect tracking
 */

import { pulse, effect, batch, context } from './pulse.js';
import {
  validateA11y,
  highlightA11yIssues
} from './a11y.js';

// =============================================================================
// DEV TOOLS STATE
// =============================================================================

/**
 * Dev tools configuration
 */
const config = {
  enabled: false,
  maxSnapshots: 50,
  logUpdates: false,
  logEffects: false,
  warnOnSlowEffects: true,
  slowEffectThreshold: 16 // ms (one frame at 60fps)
};

/**
 * Registry of all tracked pulses
 * @type {Map<string, {pulse: Pulse, name: string, createdAt: number}>}
 */
const pulseRegistry = new Map();

/**
 * Registry of all tracked effects
 * @type {Map<string, {effect: Object, name: string, createdAt: number, runCount: number, totalTime: number}>}
 */
const effectRegistry = new Map();

/**
 * Time-travel state history
 * @type {Array<{timestamp: number, state: Object, action: string}>}
 */
const stateHistory = [];

/**
 * Current position in history (for time-travel)
 */
let historyIndex = -1;

/**
 * Flag to prevent recording during time-travel
 */
let isTimeTraveling = false;

// =============================================================================
// DIAGNOSTICS API
// =============================================================================

/**
 * @typedef {Object} DiagnosticsStats
 * @property {number} pulseCount - Total number of active pulses
 * @property {number} effectCount - Total number of active effects
 * @property {number} totalEffectRuns - Total effect executions
 * @property {number} avgEffectTime - Average effect execution time (ms)
 * @property {number} pendingEffects - Effects waiting to run
 * @property {number} batchDepth - Current batch nesting depth
 * @property {number} snapshotCount - Number of stored snapshots
 * @property {Object} memoryEstimate - Estimated memory usage
 */

/**
 * Get current diagnostics statistics
 * @returns {DiagnosticsStats}
 *
 * @example
 * const stats = getDiagnostics();
 * console.log(`Active pulses: ${stats.pulseCount}`);
 * console.log(`Effect runs: ${stats.totalEffectRuns}`);
 */
export function getDiagnostics() {
  let totalRuns = 0;
  let totalTime = 0;

  for (const entry of effectRegistry.values()) {
    totalRuns += entry.runCount;
    totalTime += entry.totalTime;
  }

  return {
    pulseCount: pulseRegistry.size,
    effectCount: effectRegistry.size,
    totalEffectRuns: totalRuns,
    avgEffectTime: totalRuns > 0 ? totalTime / totalRuns : 0,
    pendingEffects: context.pendingEffects.size,
    batchDepth: context.batchDepth,
    snapshotCount: stateHistory.length,
    memoryEstimate: {
      pulses: pulseRegistry.size * 100, // rough estimate in bytes
      effects: effectRegistry.size * 200,
      history: stateHistory.length * 500
    }
  };
}

/**
 * Get detailed effect statistics
 * @returns {Array<{id: string, name: string, runCount: number, avgTime: number, lastRun: number}>}
 */
export function getEffectStats() {
  return [...effectRegistry.entries()].map(([id, entry]) => ({
    id,
    name: entry.name,
    runCount: entry.runCount,
    avgTime: entry.runCount > 0 ? entry.totalTime / entry.runCount : 0,
    totalTime: entry.totalTime,
    createdAt: entry.createdAt
  }));
}

/**
 * Get list of all tracked pulses
 * @returns {Array<{id: string, name: string, value: any, subscriberCount: number}>}
 */
export function getPulseList() {
  return [...pulseRegistry.entries()].map(([id, entry]) => ({
    id,
    name: entry.name,
    value: entry.pulse.peek(),
    subscriberCount: entry.pulse._subscribers?.size || 0,
    createdAt: entry.createdAt
  }));
}

// =============================================================================
// REACTIVE GRAPH INSPECTION
// =============================================================================

/**
 * @typedef {Object} DependencyNode
 * @property {string} id - Node identifier
 * @property {string} type - 'pulse' | 'effect' | 'computed'
 * @property {string} name - Display name
 * @property {any} value - Current value (for pulses)
 * @property {string[]} dependencies - IDs of nodes this depends on
 * @property {string[]} dependents - IDs of nodes that depend on this
 */

/**
 * Build the reactive dependency graph
 * @returns {{nodes: DependencyNode[], edges: Array<{from: string, to: string}>}}
 *
 * @example
 * const graph = getDependencyGraph();
 * console.log('Nodes:', graph.nodes.length);
 * console.log('Edges:', graph.edges.length);
 * // Visualize with D3.js or similar
 */
export function getDependencyGraph() {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  // Add pulse nodes
  for (const [id, entry] of pulseRegistry) {
    const node = {
      id,
      type: 'pulse',
      name: entry.name,
      value: entry.pulse.peek(),
      dependencies: [],
      dependents: []
    };
    nodes.push(node);
    nodeMap.set(id, node);
  }

  // Add effect nodes and build edges
  for (const [id, entry] of effectRegistry) {
    const node = {
      id,
      type: 'effect',
      name: entry.name,
      value: null,
      dependencies: [],
      dependents: []
    };
    nodes.push(node);
    nodeMap.set(id, node);

    // Get effect's dependencies
    if (entry.effect?.dependencies) {
      for (const dep of entry.effect.dependencies) {
        const depId = findPulseId(dep);
        if (depId) {
          node.dependencies.push(depId);
          edges.push({ from: depId, to: id });

          const depNode = nodeMap.get(depId);
          if (depNode) {
            depNode.dependents.push(id);
          }
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Find pulse ID from pulse instance
 */
function findPulseId(pulseInstance) {
  for (const [id, entry] of pulseRegistry) {
    if (entry.pulse === pulseInstance) {
      return id;
    }
  }
  return null;
}

/**
 * Export graph in DOT format for Graphviz visualization
 * @returns {string} DOT format graph
 */
export function exportGraphAsDot() {
  const { nodes, edges } = getDependencyGraph();

  let dot = 'digraph ReactiveGraph {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box];\n\n';

  // Add nodes with styling
  for (const node of nodes) {
    const color = node.type === 'pulse' ? 'lightblue' : 'lightgreen';
    const label = `${node.name}\\n${node.type}`;
    dot += `  "${node.id}" [label="${label}" fillcolor="${color}" style="filled"];\n`;
  }

  dot += '\n';

  // Add edges
  for (const edge of edges) {
    dot += `  "${edge.from}" -> "${edge.to}";\n`;
  }

  dot += '}\n';
  return dot;
}

// =============================================================================
// TIME-TRAVEL DEBUGGING
// =============================================================================

/**
 * @typedef {Object} StateSnapshot
 * @property {number} timestamp - When snapshot was taken
 * @property {Object} state - Serialized state
 * @property {string} action - Description of what caused the snapshot
 * @property {number} index - Position in history
 */

/**
 * Take a snapshot of current state
 * @param {string} [action='manual'] - Description of the action
 * @returns {StateSnapshot}
 */
export function takeSnapshot(action = 'manual') {
  if (isTimeTraveling) return null;

  const state = {};
  for (const [id, entry] of pulseRegistry) {
    try {
      // Deep clone to prevent mutation
      state[id] = JSON.parse(JSON.stringify(entry.pulse.peek()));
    } catch {
      // Non-serializable value
      state[id] = '[Non-serializable]';
    }
  }

  const snapshot = {
    timestamp: Date.now(),
    state,
    action,
    index: stateHistory.length
  };

  // Trim history if too long
  if (stateHistory.length >= config.maxSnapshots) {
    stateHistory.shift();
  }

  stateHistory.push(snapshot);
  historyIndex = stateHistory.length - 1;

  return snapshot;
}

/**
 * Get state history
 * @returns {StateSnapshot[]}
 */
export function getHistory() {
  return [...stateHistory];
}

/**
 * Get current history position
 * @returns {number}
 */
export function getHistoryIndex() {
  return historyIndex;
}

/**
 * Travel to a specific point in history
 * @param {number} index - History index to travel to
 * @returns {boolean} Success
 */
export function travelTo(index) {
  if (index < 0 || index >= stateHistory.length) {
    return false;
  }

  const snapshot = stateHistory[index];
  isTimeTraveling = true;

  batch(() => {
    for (const [id, value] of Object.entries(snapshot.state)) {
      const entry = pulseRegistry.get(id);
      if (entry && value !== '[Non-serializable]') {
        entry.pulse.set(value);
      }
    }
  });

  historyIndex = index;
  isTimeTraveling = false;

  return true;
}

/**
 * Go back one step in history
 * @returns {boolean} Success
 */
export function back() {
  return travelTo(historyIndex - 1);
}

/**
 * Go forward one step in history
 * @returns {boolean} Success
 */
export function forward() {
  return travelTo(historyIndex + 1);
}

/**
 * Clear all history
 */
export function clearHistory() {
  stateHistory.length = 0;
  historyIndex = -1;
}

// =============================================================================
// PULSE & EFFECT TRACKING
// =============================================================================

let pulseIdCounter = 0;
let trackedEffectIdCounter = 0;

/**
 * Create a tracked pulse (for dev tools)
 * @param {any} initialValue - Initial value
 * @param {string} [name] - Display name for debugging
 * @returns {Pulse} Tracked pulse
 */
export function trackedPulse(initialValue, name) {
  const p = pulse(initialValue);
  const id = `pulse_${++pulseIdCounter}`;

  pulseRegistry.set(id, {
    pulse: p,
    name: name || id,
    createdAt: Date.now()
  });

  // Wrap set to record snapshots
  const originalSet = p.set.bind(p);
  p.set = (value) => {
    const result = originalSet(value);
    if (config.enabled && config.logUpdates) {
      console.log(`[Pulse] ${name || id} updated:`, value);
    }
    if (config.enabled && !isTimeTraveling) {
      takeSnapshot(`${name || id} = ${JSON.stringify(value)}`);
    }
    return result;
  };

  // Add dispose method
  p.dispose = () => {
    pulseRegistry.delete(id);
  };

  return p;
}

/**
 * Create a tracked effect (for dev tools)
 * @param {function} fn - Effect function
 * @param {string} [name] - Display name for debugging
 * @returns {function} Dispose function
 */
export function trackedEffect(fn, name) {
  const id = `effect_${++trackedEffectIdCounter}`;
  const startTime = Date.now();

  const entry = {
    effect: null,
    name: name || id,
    createdAt: startTime,
    runCount: 0,
    totalTime: 0
  };

  effectRegistry.set(id, entry);

  const wrappedFn = () => {
    const runStart = performance.now();

    if (config.enabled && config.logEffects) {
      console.log(`[Effect] ${name || id} running...`);
    }

    const result = fn();

    const runTime = performance.now() - runStart;
    entry.runCount++;
    entry.totalTime += runTime;

    if (config.enabled && config.warnOnSlowEffects && runTime > config.slowEffectThreshold) {
      console.warn(`[Effect] ${name || id} took ${runTime.toFixed(2)}ms (slow)`);
    }

    return result;
  };

  const dispose = effect(wrappedFn, { id });

  // Store reference to effect for graph building
  entry.effect = context.currentEffect;

  return () => {
    dispose();
    effectRegistry.delete(id);
  };
}

// =============================================================================
// DEV TOOLS API
// =============================================================================

/**
 * Enable dev tools
 * @param {Object} [options] - Configuration options
 */
export function enableDevTools(options = {}) {
  Object.assign(config, options, { enabled: true });

  if (typeof window !== 'undefined') {
    // Expose to window for browser dev tools
    window.__PULSE_DEVTOOLS__ = {
      getDiagnostics,
      getEffectStats,
      getPulseList,
      getDependencyGraph,
      exportGraphAsDot,
      takeSnapshot,
      getHistory,
      travelTo,
      back,
      forward,
      clearHistory,
      config,
      // A11y Audit
      runA11yAudit,
      getA11yIssues,
      getA11yStats,
      enableA11yAudit,
      disableA11yAudit,
      toggleA11yHighlights,
      exportA11yReport,
      resetA11yAudit
    };

    console.log('[Pulse DevTools] Enabled. Access via window.__PULSE_DEVTOOLS__');
  }
}

/**
 * Disable dev tools
 */
export function disableDevTools() {
  config.enabled = false;

  if (typeof window !== 'undefined') {
    delete window.__PULSE_DEVTOOLS__;
  }
}

/**
 * Check if dev tools are enabled
 * @returns {boolean}
 */
export function isDevToolsEnabled() {
  return config.enabled;
}

/**
 * Update dev tools configuration
 * @param {Object} options - Configuration options
 */
export function configureDevTools(options) {
  Object.assign(config, options);
}

/**
 * Clear all dev tools data
 */
export function resetDevTools() {
  pulseRegistry.clear();
  effectRegistry.clear();
  stateHistory.length = 0;
  historyIndex = -1;
  pulseIdCounter = 0;
  trackedEffectIdCounter = 0;
}

// =============================================================================
// PERFORMANCE PROFILING
// =============================================================================

/**
 * Profile a section of code
 * @param {string} name - Profile name
 * @param {function} fn - Function to profile
 * @returns {any} Result of fn
 *
 * @example
 * const result = profile('data-processing', () => {
 *   return processLargeDataset();
 * });
 */
export function profile(name, fn) {
  const start = performance.now();

  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    console.log(`[Profile] ${name}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Create a performance marker
 * @param {string} name - Marker name
 * @returns {{end: function(): number}} Marker with end method
 */
export function mark(name) {
  const start = performance.now();

  return {
    end() {
      const duration = performance.now() - start;
      if (config.enabled) {
        console.log(`[Mark] ${name}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
}

// =============================================================================
// ACCESSIBILITY AUDIT MODE
// =============================================================================

/**
 * A11y audit configuration
 */
const a11yAuditConfig = {
  enabled: false,
  autoAudit: false,
  auditInterval: 5000,
  highlightIssues: true,
  logToConsole: true,
  breakOnError: false,
  watchMutations: false
};

/**
 * Current a11y audit state
 */
let a11yAuditState = {
  issues: [],
  lastAuditTime: null,
  auditCount: 0,
  highlightCleanup: null,
  mutationObserver: null,
  intervalId: null
};

/**
 * @typedef {Object} A11yAuditResult
 * @property {Array} issues - List of accessibility issues found
 * @property {number} errorCount - Number of errors
 * @property {number} warningCount - Number of warnings
 * @property {number} auditTime - Time taken for audit in ms
 * @property {string} timestamp - ISO timestamp of audit
 */

/**
 * Run an accessibility audit on the document or specific element
 * @param {Element} [root=document.body] - Root element to audit
 * @param {Object} [options] - Audit options
 * @returns {A11yAuditResult} Audit result
 *
 * @example
 * const result = runA11yAudit();
 * console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`);
 */
export function runA11yAudit(root, options = {}) {
  if (typeof document === 'undefined') {
    return { issues: [], errorCount: 0, warningCount: 0, auditTime: 0, timestamp: new Date().toISOString() };
  }

  const startTime = performance.now();
  const targetRoot = root || document.body;

  // Run validation with options
  const issues = validateA11y(targetRoot, options);

  const auditTime = performance.now() - startTime;
  a11yAuditState.lastAuditTime = Date.now();
  a11yAuditState.auditCount++;
  a11yAuditState.issues = issues;

  // Count by severity
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const result = {
    issues,
    errorCount,
    warningCount,
    auditTime,
    timestamp: new Date().toISOString()
  };

  // Log to console if enabled
  if (a11yAuditConfig.logToConsole && config.enabled) {
    logA11yAuditResult(result);
  }

  // Highlight issues if enabled
  if (a11yAuditConfig.highlightIssues && config.enabled) {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
    }
    a11yAuditState.highlightCleanup = highlightA11yIssues(issues);
  }

  // Break on error if configured
  if (a11yAuditConfig.breakOnError && errorCount > 0) {
    console.error('[A11y Audit] Breaking due to accessibility errors');
    // eslint-disable-next-line no-debugger
    debugger;
  }

  return result;
}

/**
 * Log audit result to console with formatting
 * @private
 */
function logA11yAuditResult(result) {
  const { issues, errorCount, warningCount, auditTime } = result;

  console.group(`%c[A11y Audit] ${errorCount} errors, ${warningCount} warnings (${auditTime.toFixed(1)}ms)`,
    errorCount > 0 ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold');

  if (issues.length === 0) {
    console.log('%c✓ No accessibility issues found', 'color: green');
  } else {
    // Group by severity
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      console.group('%cErrors', 'color: red; font-weight: bold');
      for (const issue of errors) {
        console.error(`${issue.rule}: ${issue.message}`, issue.element || '');
      }
      console.groupEnd();
    }

    if (warnings.length > 0) {
      console.group('%cWarnings', 'color: orange');
      for (const issue of warnings) {
        console.warn(`${issue.rule}: ${issue.message}`, issue.element || '');
      }
      console.groupEnd();
    }
  }

  console.groupEnd();
}

/**
 * Get current accessibility issues from last audit
 * @returns {Array} List of a11y issues
 */
export function getA11yIssues() {
  return [...a11yAuditState.issues];
}

/**
 * Get a11y audit statistics
 * @returns {Object} Audit statistics
 */
export function getA11yStats() {
  const issues = a11yAuditState.issues;
  const byRule = {};

  for (const issue of issues) {
    byRule[issue.rule] = (byRule[issue.rule] || 0) + 1;
  }

  return {
    totalIssues: issues.length,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    issuesByRule: byRule,
    auditCount: a11yAuditState.auditCount,
    lastAuditTime: a11yAuditState.lastAuditTime,
    isWatching: a11yAuditState.mutationObserver !== null,
    isAutoAuditing: a11yAuditState.intervalId !== null
  };
}

/**
 * Enable accessibility audit mode
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.autoAudit=false] - Enable automatic periodic auditing
 * @param {number} [options.auditInterval=5000] - Interval between auto-audits (ms)
 * @param {boolean} [options.highlightIssues=true] - Highlight issues visually
 * @param {boolean} [options.logToConsole=true] - Log issues to console
 * @param {boolean} [options.breakOnError=false] - Break in debugger on errors
 * @param {boolean} [options.watchMutations=false] - Re-audit on DOM changes
 *
 * @example
 * enableA11yAudit({
 *   autoAudit: true,
 *   auditInterval: 3000,
 *   highlightIssues: true
 * });
 */
export function enableA11yAudit(options = {}) {
  Object.assign(a11yAuditConfig, options, { enabled: true });

  // Run initial audit
  runA11yAudit();

  // Setup auto-audit if enabled
  if (a11yAuditConfig.autoAudit && typeof window !== 'undefined') {
    a11yAuditState.intervalId = setInterval(() => {
      runA11yAudit();
    }, a11yAuditConfig.auditInterval);
  }

  // Setup mutation observer if enabled
  if (a11yAuditConfig.watchMutations && typeof MutationObserver !== 'undefined') {
    a11yAuditState.mutationObserver = new MutationObserver(() => {
      // Debounce audit on mutations
      clearTimeout(a11yAuditState.mutationTimeout);
      a11yAuditState.mutationTimeout = setTimeout(() => {
        runA11yAudit();
      }, 250);
    });

    a11yAuditState.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-label', 'aria-hidden', 'aria-describedby', 'alt', 'tabindex']
    });
  }

  if (config.enabled) {
    console.log('[A11y Audit] Enabled', a11yAuditConfig);
  }
}

/**
 * Disable accessibility audit mode
 */
export function disableA11yAudit() {
  a11yAuditConfig.enabled = false;

  // Clear auto-audit interval
  if (a11yAuditState.intervalId) {
    clearInterval(a11yAuditState.intervalId);
    a11yAuditState.intervalId = null;
  }

  // Disconnect mutation observer
  if (a11yAuditState.mutationObserver) {
    a11yAuditState.mutationObserver.disconnect();
    a11yAuditState.mutationObserver = null;
  }

  // Clear highlights
  if (a11yAuditState.highlightCleanup) {
    a11yAuditState.highlightCleanup();
    a11yAuditState.highlightCleanup = null;
  }

  if (config.enabled) {
    console.log('[A11y Audit] Disabled');
  }
}

/**
 * Toggle issue highlighting
 * @param {boolean} [show] - Show or hide highlights (toggles if not specified)
 */
export function toggleA11yHighlights(show) {
  const shouldShow = show !== undefined ? show : !a11yAuditState.highlightCleanup;

  if (shouldShow) {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
    }
    a11yAuditState.highlightCleanup = highlightA11yIssues(a11yAuditState.issues);
  } else {
    if (a11yAuditState.highlightCleanup) {
      a11yAuditState.highlightCleanup();
      a11yAuditState.highlightCleanup = null;
    }
  }
}

/**
 * Export a11y audit report
 * @param {string} [format='json'] - Export format ('json', 'csv', 'html')
 * @returns {string} Formatted report
 */
export function exportA11yReport(format = 'json') {
  const stats = getA11yStats();
  const issues = getA11yIssues();

  const report = {
    timestamp: new Date().toISOString(),
    url: typeof location !== 'undefined' ? location.href : 'unknown',
    stats,
    issues: issues.map(i => ({
      rule: i.rule,
      severity: i.severity,
      message: i.message,
      element: i.element?.tagName?.toLowerCase() || 'unknown',
      selector: i.element ? getElementSelector(i.element) : 'unknown'
    }))
  };

  switch (format) {
    case 'csv':
      return exportA11yReportAsCsv(report);
    case 'html':
      return exportA11yReportAsHtml(report);
    default:
      return JSON.stringify(report, null, 2);
  }
}

/**
 * Get a CSS selector for an element
 * @private
 */
function getElementSelector(element) {
  if (!element) return 'unknown';

  const parts = [];
  let el = element;

  while (el && el !== document.body) {
    let selector = el.tagName?.toLowerCase() || '';

    if (el.id) {
      selector += `#${el.id}`;
      parts.unshift(selector);
      break;
    }

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }

    parts.unshift(selector);
    el = el.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Export report as CSV
 * @private
 */
function exportA11yReportAsCsv(report) {
  const headers = ['severity', 'rule', 'message', 'element', 'selector'];
  const rows = report.issues.map(i =>
    [i.severity, i.rule, `"${i.message.replace(/"/g, '""')}"`, i.element, `"${i.selector}"`].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export report as HTML
 * @private
 */
function exportA11yReportAsHtml(report) {
  const errorCount = report.stats.errorCount;
  const warningCount = report.stats.warningCount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Accessibility Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { padding: 15px 25px; border-radius: 8px; }
    .errors { background: #fee; color: #c00; }
    .warnings { background: #ffd; color: #a50; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .error { color: #c00; }
    .warning { color: #a50; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Accessibility Audit Report</h1>
  <p>Generated: ${report.timestamp}</p>
  <p>URL: <code>${report.url}</code></p>

  <div class="summary">
    <div class="stat errors"><strong>${errorCount}</strong> Errors</div>
    <div class="stat warnings"><strong>${warningCount}</strong> Warnings</div>
  </div>

  ${report.issues.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Rule</th>
        <th>Message</th>
        <th>Element</th>
      </tr>
    </thead>
    <tbody>
      ${report.issues.map(i => `
      <tr>
        <td class="${i.severity}">${i.severity}</td>
        <td><code>${i.rule}</code></td>
        <td>${i.message}</td>
        <td><code>${i.selector}</code></td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : '<p style="color: green;">✓ No accessibility issues found!</p>'}
</body>
</html>`;
}

/**
 * Reset a11y audit state
 */
export function resetA11yAudit() {
  disableA11yAudit();
  a11yAuditState = {
    issues: [],
    lastAuditTime: null,
    auditCount: 0,
    highlightCleanup: null,
    mutationObserver: null,
    intervalId: null
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Diagnostics
  getDiagnostics,
  getEffectStats,
  getPulseList,

  // Graph
  getDependencyGraph,
  exportGraphAsDot,

  // Time-travel
  takeSnapshot,
  getHistory,
  getHistoryIndex,
  travelTo,
  back,
  forward,
  clearHistory,

  // Tracking
  trackedPulse,
  trackedEffect,

  // Configuration
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  configureDevTools,
  resetDevTools,

  // Profiling
  profile,
  mark,

  // Accessibility Audit
  runA11yAudit,
  getA11yIssues,
  getA11yStats,
  enableA11yAudit,
  disableA11yAudit,
  toggleA11yHighlights,
  exportA11yReport,
  resetA11yAudit
};
