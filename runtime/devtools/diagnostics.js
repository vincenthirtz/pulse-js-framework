/**
 * Pulse DevTools - Diagnostics Module
 * @module pulse-js-framework/runtime/devtools/diagnostics
 *
 * Reactive dependency graph inspection, performance monitoring,
 * and pulse/effect tracking.
 */

import { pulse, effect, context } from '../pulse.js';
import { createLogger } from '../logger.js';

// Lazy import to avoid circular dependency
let getSnapshotCountFn = null;
export function _setSnapshotCountFn(fn) {
  getSnapshotCountFn = fn;
}

const log = createLogger('DevTools');

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Diagnostics configuration
 */
export const config = {
  enabled: false,
  logUpdates: false,
  logEffects: false,
  warnOnSlowEffects: true,
  slowEffectThreshold: 16 // ms (one frame at 60fps)
};

// =============================================================================
// REGISTRIES
// =============================================================================

/**
 * Registry of all tracked pulses
 * @type {Map<string, {pulse: Pulse, name: string, createdAt: number}>}
 */
export const pulseRegistry = new Map();

/**
 * Registry of all tracked effects
 * @type {Map<string, {effect: Object, name: string, createdAt: number, runCount: number, totalTime: number}>}
 */
export const effectRegistry = new Map();

let pulseIdCounter = 0;
let trackedEffectIdCounter = 0;

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
 * @property {Object} memoryEstimate - Estimated memory usage
 */

/**
 * Get current diagnostics statistics
 * @returns {DiagnosticsStats}
 */
export function getDiagnostics() {
  let totalRuns = 0;
  let totalTime = 0;

  for (const entry of effectRegistry.values()) {
    totalRuns += entry.runCount;
    totalTime += entry.totalTime;
  }

  const snapshotCount = getSnapshotCountFn ? getSnapshotCountFn() : 0;

  return {
    pulseCount: pulseRegistry.size,
    effectCount: effectRegistry.size,
    totalEffectRuns: totalRuns,
    avgEffectTime: totalRuns > 0 ? totalTime / totalRuns : 0,
    pendingEffects: context.pendingEffects.size,
    batchDepth: context.batchDepth,
    snapshotCount,
    memoryEstimate: {
      pulses: pulseRegistry.size * 100,
      effects: effectRegistry.size * 200,
      history: snapshotCount * 500
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
 * Find pulse ID from pulse instance
 * @private
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
 * Build the reactive dependency graph
 * @returns {{nodes: DependencyNode[], edges: Array<{from: string, to: string}>}}
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
// PULSE & EFFECT TRACKING
// =============================================================================

/**
 * Create a tracked pulse (for dev tools)
 * @param {any} initialValue - Initial value
 * @param {string} [name] - Display name for debugging
 * @param {Object} [options] - Additional options
 * @param {function} [options.onSnapshot] - Callback when snapshot should be taken
 * @returns {Pulse} Tracked pulse
 */
export function trackedPulse(initialValue, name, options = {}) {
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
      log.info(`${name || id} updated:`, value);
    }
    if (config.enabled && options.onSnapshot) {
      options.onSnapshot(`${name || id} = ${JSON.stringify(value)}`);
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
      log.info(`${name || id} running...`);
    }

    const result = fn();

    const runTime = performance.now() - runStart;
    entry.runCount++;
    entry.totalTime += runTime;

    if (config.enabled && config.warnOnSlowEffects && runTime > config.slowEffectThreshold) {
      log.warn(`${name || id} took ${runTime.toFixed(2)}ms (slow)`);
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
// PERFORMANCE PROFILING
// =============================================================================

/**
 * Profile a section of code
 * @param {string} name - Profile name
 * @param {function} fn - Function to profile
 * @returns {any} Result of fn
 */
export function profile(name, fn) {
  const start = performance.now();

  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    log.info(`[Profile] ${name}: ${duration.toFixed(2)}ms`);
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
        log.info(`[Mark] ${name}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
  };
}

// =============================================================================
// RESET
// =============================================================================

/**
 * Reset all diagnostics data
 */
export function resetDiagnostics() {
  pulseRegistry.clear();
  effectRegistry.clear();
  pulseIdCounter = 0;
  trackedEffectIdCounter = 0;
}

export default {
  config,
  getDiagnostics,
  getEffectStats,
  getPulseList,
  getDependencyGraph,
  exportGraphAsDot,
  trackedPulse,
  trackedEffect,
  profile,
  mark,
  resetDiagnostics,
  pulseRegistry,
  effectRegistry
};
