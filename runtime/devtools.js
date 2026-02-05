/**
 * Pulse Dev Tools
 * @module pulse-js-framework/runtime/devtools
 *
 * Development tools for debugging reactive applications:
 * - Reactive dependency graph inspection
 * - Time-travel debugging with state snapshots
 * - Performance monitoring
 * - Effect tracking
 * - Accessibility auditing
 *
 * Architecture:
 * This module re-exports from specialized sub-modules:
 * - devtools/diagnostics.js: Graph inspection, tracking, profiling
 * - devtools/time-travel.js: State snapshots and history navigation
 * - devtools/a11y-audit.js: Accessibility validation and reporting
 */

import { createLogger } from './logger.js';

// Import from sub-modules
import {
  config,
  getDiagnostics,
  getEffectStats,
  getPulseList,
  getDependencyGraph,
  exportGraphAsDot,
  trackedPulse as basedTrackedPulse,
  trackedEffect,
  profile,
  mark,
  resetDiagnostics,
  _setSnapshotCountFn,
  _setTakeSnapshotFn
} from './devtools/diagnostics.js';

import {
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
} from './devtools/time-travel.js';

// Wire up snapshot count for diagnostics
_setSnapshotCountFn(getSnapshotCount);

// Wire up takeSnapshot for auto-timeline
_setTakeSnapshotFn(takeSnapshot);

import {
  a11yAuditConfig,
  runA11yAudit,
  getA11yIssues,
  getA11yStats,
  enableA11yAudit,
  disableA11yAudit,
  toggleA11yHighlights,
  exportA11yReport,
  resetA11yAudit
} from './devtools/a11y-audit.js';

const log = createLogger('DevTools');

// =============================================================================
// TRACKED PULSE WITH SNAPSHOT INTEGRATION
// =============================================================================

/**
 * Create a tracked pulse with automatic snapshot on change
 * @param {any} initialValue - Initial value
 * @param {string} [name] - Display name for debugging
 * @returns {Pulse} Tracked pulse
 */
export function trackedPulse(initialValue, name) {
  return basedTrackedPulse(initialValue, name, {
    onSnapshot: (action) => {
      if (!getIsTimeTraveling()) {
        takeSnapshot(action);
      }
    }
  });
}

// =============================================================================
// DEV TOOLS API
// =============================================================================

/**
 * Enable automatic timeline recording
 * Records all pulse changes to the timeline automatically (debounced)
 * @param {Object} [options] - Configuration options
 * @param {number} [options.debounce=100] - Debounce interval in ms
 */
export function enableAutoTimeline(options = {}) {
  config.autoTimeline = true;
  if (options.debounce !== undefined) {
    config.timelineDebounce = options.debounce;
  }
  log.info(`Auto-timeline enabled (debounce: ${config.timelineDebounce}ms)`);
}

/**
 * Disable automatic timeline recording
 */
export function disableAutoTimeline() {
  config.autoTimeline = false;
  log.info('Auto-timeline disabled');
}

/**
 * Check if auto-timeline is enabled
 * @returns {boolean}
 */
export function isAutoTimelineEnabled() {
  return config.autoTimeline;
}

/**
 * Enable dev tools
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.autoTimeline] - Enable automatic timeline recording
 * @param {number} [options.timelineDebounce] - Debounce interval for timeline (ms)
 */
export function enableDevTools(options = {}) {
  Object.assign(config, options, { enabled: true });

  if (options.maxSnapshots) {
    timeTravelConfig.maxSnapshots = options.maxSnapshots;
  }

  // Enable auto-timeline if specified
  if (options.autoTimeline) {
    config.autoTimeline = true;
    if (options.timelineDebounce !== undefined) {
      config.timelineDebounce = options.timelineDebounce;
    }
  }

  if (typeof window !== 'undefined') {
    // Expose to window for browser dev tools
    window.__PULSE_DEVTOOLS__ = {
      // Diagnostics
      getDiagnostics,
      getEffectStats,
      getPulseList,
      getDependencyGraph,
      exportGraphAsDot,
      profile,
      mark,

      // Time-travel
      takeSnapshot,
      getHistory,
      travelTo,
      back,
      forward,
      clearHistory,

      // Auto-timeline
      enableAutoTimeline,
      disableAutoTimeline,
      isAutoTimelineEnabled,

      // A11y Audit
      runA11yAudit,
      getA11yIssues,
      getA11yStats,
      enableA11yAudit,
      disableA11yAudit,
      toggleA11yHighlights,
      exportA11yReport,
      resetA11yAudit,

      // Config
      config,
      timeTravelConfig,
      a11yAuditConfig
    };

    log.info('Enabled. Access via window.__PULSE_DEVTOOLS__');
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

  log.info('Disabled');
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

  if (options.maxSnapshots) {
    timeTravelConfig.maxSnapshots = options.maxSnapshots;
  }
}

/**
 * Clear all dev tools data
 */
export function resetDevTools() {
  resetDiagnostics();
  clearHistory();
  resetA11yAudit();
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export {
  // Diagnostics
  getDiagnostics,
  getEffectStats,
  getPulseList,
  getDependencyGraph,
  exportGraphAsDot,
  trackedEffect,
  profile,
  mark,

  // Time-travel
  takeSnapshot,
  getHistory,
  getHistoryIndex,
  travelTo,
  back,
  forward,
  clearHistory,

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

// Note: enableAutoTimeline, disableAutoTimeline, isAutoTimelineEnabled
// are already exported via their function declarations above

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Diagnostics
  getDiagnostics,
  getEffectStats,
  getPulseList,
  getDependencyGraph,
  exportGraphAsDot,
  trackedPulse,
  trackedEffect,
  profile,
  mark,

  // Time-travel
  takeSnapshot,
  getHistory,
  getHistoryIndex,
  travelTo,
  back,
  forward,
  clearHistory,

  // Auto-timeline
  enableAutoTimeline,
  disableAutoTimeline,
  isAutoTimelineEnabled,

  // Configuration
  enableDevTools,
  disableDevTools,
  isDevToolsEnabled,
  configureDevTools,
  resetDevTools,

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
