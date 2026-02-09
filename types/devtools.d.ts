/**
 * Pulse Framework - DevTools Type Definitions
 * @module pulse-js-framework/runtime/devtools
 */

import { Pulse } from './pulse';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** DevTools configuration options */
export interface DevToolsOptions {
  /** Enable dev tools (default: false) */
  enabled?: boolean;
  /** Enable automatic timeline recording (default: false) */
  autoTimeline?: boolean;
  /** Debounce interval for auto-timeline in ms (default: 100) */
  timelineDebounce?: number;
  /** Maximum number of state snapshots to retain (default: 50) */
  maxSnapshots?: number;
  /** Log pulse updates to console (default: false) */
  logUpdates?: boolean;
  /** Warn when effects take longer than one frame (default: true) */
  warnOnSlowEffects?: boolean;
}

// =============================================================================
// DIAGNOSTICS
// =============================================================================

/** Diagnostics summary of the reactive system */
export interface Diagnostics {
  /** Number of tracked pulses */
  pulseCount: number;
  /** Number of tracked effects */
  effectCount: number;
  /** Average effect execution time in ms */
  avgEffectTime: number;
  /** Number of state snapshots in history */
  snapshotCount: number;
  /** Additional diagnostic properties */
  [key: string]: unknown;
}

/** Performance statistics for a tracked effect */
export interface EffectStat {
  /** Unique identifier of the effect */
  id: string;
  /** Display name of the effect */
  name: string;
  /** Number of times the effect has run */
  runCount: number;
  /** Average execution time in ms */
  avgTime: number;
}

/** Information about a tracked pulse */
export interface PulseInfo {
  /** Unique identifier of the pulse */
  id: string;
  /** Display name of the pulse */
  name: string;
  /** Current value of the pulse */
  value: unknown;
  /** Number of active subscribers */
  subscriberCount: number;
}

/** Reactive dependency graph structure */
export interface DependencyGraph {
  /** Nodes representing pulses and effects */
  nodes: Array<{ id: string; type: string; name?: string }>;
  /** Edges representing dependencies between nodes */
  edges: Array<{ from: string; to: string }>;
}

/**
 * Get diagnostics summary of the reactive system
 */
export declare function getDiagnostics(): Diagnostics;

/**
 * Get performance statistics for all tracked effects
 */
export declare function getEffectStats(): EffectStat[];

/**
 * Get information about all tracked pulses
 */
export declare function getPulseList(): PulseInfo[];

/**
 * Get the reactive dependency graph
 */
export declare function getDependencyGraph(): DependencyGraph;

/**
 * Export the dependency graph as a Graphviz DOT string
 */
export declare function exportGraphAsDot(): string;

/**
 * Create a tracked pulse with automatic snapshot on change.
 * Integrates with time-travel debugging.
 *
 * @param initialValue - Initial value for the pulse
 * @param name - Display name for debugging
 * @returns A tracked pulse instance
 */
export declare function trackedPulse<T>(initialValue: T, name?: string): Pulse<T>;

/**
 * Create a tracked effect with performance monitoring.
 * Execution time and run count are recorded.
 *
 * @param fn - Effect function (may return a cleanup function)
 * @param name - Display name for debugging
 * @returns Dispose function to stop the effect
 */
export declare function trackedEffect(fn: () => void | (() => void), name?: string): () => void;

// =============================================================================
// PROFILING
// =============================================================================

/** Result of a profiled operation */
export interface ProfileResult {
  /** Name of the profiled operation */
  name: string;
  /** Duration in ms */
  duration: number;
  /** Return value of the profiled function */
  result: unknown;
}

/** Handle returned by mark() to end a timing measurement */
export interface MarkResult {
  /** End the mark and return duration in ms */
  end(): number;
}

/**
 * Profile a synchronous function, logging its execution time
 *
 * @param name - Name for the profiling entry
 * @param fn - Function to profile
 * @returns Profile result with duration and return value
 */
export declare function profile<T>(name: string, fn: () => T): ProfileResult;

/**
 * Start a timing mark for manual profiling
 *
 * @param name - Name for the mark
 * @returns A mark handle with an end() method
 */
export declare function mark(name: string): MarkResult;

// =============================================================================
// TIME-TRAVEL
// =============================================================================

/** A state snapshot for time-travel debugging */
export interface Snapshot {
  /** Description of the action that triggered this snapshot */
  label: string;
  /** Unix timestamp in ms when the snapshot was taken */
  timestamp: number;
  /** Serialized state of all tracked pulses */
  state: Record<string, unknown>;
}

/**
 * Take a snapshot of the current state of all tracked pulses
 *
 * @param label - Description of the action (default: 'manual')
 */
export declare function takeSnapshot(label?: string): void;

/**
 * Get all state snapshots in the history
 */
export declare function getHistory(): Snapshot[];

/**
 * Get the current position in history
 */
export declare function getHistoryIndex(): number;

/**
 * Restore state to a specific snapshot index
 *
 * @param index - History index to travel to
 */
export declare function travelTo(index: number): void;

/**
 * Go back one step in history
 */
export declare function back(): void;

/**
 * Go forward one step in history
 */
export declare function forward(): void;

/**
 * Clear all snapshots from history
 */
export declare function clearHistory(): void;

// =============================================================================
// AUTO-TIMELINE
// =============================================================================

/**
 * Enable automatic timeline recording.
 * Records all pulse changes to the timeline with debouncing.
 *
 * @param options - Configuration options
 */
export declare function enableAutoTimeline(options?: { debounce?: number }): void;

/**
 * Disable automatic timeline recording
 */
export declare function disableAutoTimeline(): void;

/**
 * Check if auto-timeline recording is enabled
 */
export declare function isAutoTimelineEnabled(): boolean;

// =============================================================================
// CONFIGURATION API
// =============================================================================

/**
 * Enable dev tools and expose to window.__PULSE_DEVTOOLS__
 *
 * @param options - Configuration options
 */
export declare function enableDevTools(options?: DevToolsOptions): void;

/**
 * Disable dev tools and remove window.__PULSE_DEVTOOLS__
 */
export declare function disableDevTools(): void;

/**
 * Check if dev tools are enabled
 */
export declare function isDevToolsEnabled(): boolean;

/**
 * Update dev tools configuration
 *
 * @param options - Configuration options to merge
 */
export declare function configureDevTools(options: DevToolsOptions): void;

/**
 * Reset all dev tools data (diagnostics, history, and a11y audit)
 */
export declare function resetDevTools(): void;

// =============================================================================
// A11Y AUDIT
// =============================================================================

/** An accessibility issue found during audit */
export interface A11yIssue {
  /** Type/rule of the issue (e.g., 'missing-alt', 'no-label') */
  type: string;
  /** Human-readable description of the issue */
  message: string;
  /** The DOM element with the issue (if available) */
  element?: Element;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
}

/** Summary statistics from an a11y audit */
export interface A11yStats {
  /** Total number of issues found */
  totalIssues: number;
  /** Number of error-level issues */
  errorCount: number;
  /** Number of warning-level issues */
  warningCount: number;
  /** Number of info-level issues */
  infoCount: number;
}

/** Configuration options for continuous a11y auditing */
export interface A11yAuditOptions {
  /** Enable periodic audits (default: false) */
  autoAudit?: boolean;
  /** Interval between audits in ms (default: 5000) */
  auditInterval?: number;
  /** Show visual overlay on elements with issues (default: true) */
  highlightIssues?: boolean;
  /** Log issues to browser console (default: true) */
  logToConsole?: boolean;
  /** Trigger debugger breakpoint on errors (default: false) */
  breakOnError?: boolean;
  /** Re-audit when DOM changes via MutationObserver (default: false) */
  watchMutations?: boolean;
}

/** Result returned by runA11yAudit() */
export interface A11yAuditResult {
  /** List of accessibility issues found */
  issues: A11yIssue[];
  /** Number of error-level issues */
  errorCount: number;
  /** Number of warning-level issues */
  warningCount: number;
}

/**
 * Run an accessibility audit on the document or specific element
 */
export declare function runA11yAudit(): A11yAuditResult;

/**
 * Get all current a11y issues from the last audit
 */
export declare function getA11yIssues(): A11yIssue[];

/**
 * Get summary statistics of a11y issues
 */
export declare function getA11yStats(): A11yStats;

/**
 * Enable continuous a11y auditing with optional configuration
 *
 * @param options - Audit configuration options
 */
export declare function enableA11yAudit(options?: A11yAuditOptions): void;

/**
 * Disable continuous a11y auditing and clean up resources
 */
export declare function disableA11yAudit(): void;

/**
 * Toggle visual highlighting of a11y issues in the DOM
 *
 * @param show - Force show/hide, or toggle if omitted
 */
export declare function toggleA11yHighlights(show?: boolean): void;

/**
 * Export the a11y audit report in the specified format
 *
 * @param format - Output format
 * @returns Formatted report string
 */
export declare function exportA11yReport(format: 'json' | 'csv' | 'html'): string;

/**
 * Reset a11y audit state (clear issues, stop observers)
 */
export declare function resetA11yAudit(): void;

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export interface PulseDevTools {
  // Diagnostics
  getDiagnostics: typeof getDiagnostics;
  getEffectStats: typeof getEffectStats;
  getPulseList: typeof getPulseList;
  getDependencyGraph: typeof getDependencyGraph;
  exportGraphAsDot: typeof exportGraphAsDot;
  trackedPulse: typeof trackedPulse;
  trackedEffect: typeof trackedEffect;
  profile: typeof profile;
  mark: typeof mark;

  // Time-travel
  takeSnapshot: typeof takeSnapshot;
  getHistory: typeof getHistory;
  getHistoryIndex: typeof getHistoryIndex;
  travelTo: typeof travelTo;
  back: typeof back;
  forward: typeof forward;
  clearHistory: typeof clearHistory;

  // Auto-timeline
  enableAutoTimeline: typeof enableAutoTimeline;
  disableAutoTimeline: typeof disableAutoTimeline;
  isAutoTimelineEnabled: typeof isAutoTimelineEnabled;

  // Configuration
  enableDevTools: typeof enableDevTools;
  disableDevTools: typeof disableDevTools;
  isDevToolsEnabled: typeof isDevToolsEnabled;
  configureDevTools: typeof configureDevTools;
  resetDevTools: typeof resetDevTools;

  // Accessibility Audit
  runA11yAudit: typeof runA11yAudit;
  getA11yIssues: typeof getA11yIssues;
  getA11yStats: typeof getA11yStats;
  enableA11yAudit: typeof enableA11yAudit;
  disableA11yAudit: typeof disableA11yAudit;
  toggleA11yHighlights: typeof toggleA11yHighlights;
  exportA11yReport: typeof exportA11yReport;
  resetA11yAudit: typeof resetA11yAudit;
}

declare const _default: PulseDevTools;
export default _default;
