/**
 * Pulse DevTools - Module Index
 * @module pulse-js-framework/runtime/devtools
 *
 * Re-exports all devtools functionality from sub-modules:
 * - diagnostics: Reactive graph inspection, performance monitoring
 * - time-travel: State snapshots and time-travel debugging
 * - a11y-audit: Accessibility validation and reporting
 */

// Diagnostics
export {
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
} from './diagnostics.js';

// Time-travel
export {
  timeTravelConfig,
  getIsTimeTraveling,
  takeSnapshot,
  getHistory,
  getHistoryIndex,
  getSnapshotCount,
  travelTo,
  back,
  forward,
  clearHistory
} from './time-travel.js';

// A11y Audit
export {
  a11yAuditConfig,
  runA11yAudit,
  getA11yIssues,
  getA11yStats,
  enableA11yAudit,
  disableA11yAudit,
  toggleA11yHighlights,
  exportA11yReport,
  resetA11yAudit
} from './a11y-audit.js';
