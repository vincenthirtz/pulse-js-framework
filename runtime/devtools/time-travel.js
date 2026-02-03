/**
 * Pulse DevTools - Time Travel Module
 * @module pulse-js-framework/runtime/devtools/time-travel
 *
 * Time-travel debugging with state snapshots.
 */

import { batch } from '../pulse.js';
import { createLogger } from '../logger.js';
import { pulseRegistry, config } from './diagnostics.js';

const log = createLogger('DevTools:TimeTravel');

// =============================================================================
// TIME-TRAVEL STATE
// =============================================================================

/**
 * Time-travel configuration
 */
export const timeTravelConfig = {
  maxSnapshots: 50
};

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
// TIME-TRAVEL API
// =============================================================================

/**
 * @typedef {Object} StateSnapshot
 * @property {number} timestamp - When snapshot was taken
 * @property {Object} state - Serialized state
 * @property {string} action - Description of what caused the snapshot
 * @property {number} index - Position in history
 */

/**
 * Check if currently time-traveling
 * @returns {boolean}
 */
export function getIsTimeTraveling() {
  return isTimeTraveling;
}

/**
 * Take a snapshot of current state
 * @param {string} [action='manual'] - Description of the action
 * @returns {StateSnapshot|null}
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
  if (stateHistory.length >= timeTravelConfig.maxSnapshots) {
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
 * Get snapshot count
 * @returns {number}
 */
export function getSnapshotCount() {
  return stateHistory.length;
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

  if (config.enabled) {
    log.info(`Traveled to snapshot ${index}: ${snapshot.action}`);
  }

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

export default {
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
};
