/**
 * HMR (Hot Module Replacement) utilities for Pulse framework
 * @module pulse-js-framework/runtime/hmr
 *
 * Provides state preservation and effect cleanup during hot module replacement.
 *
 * @example
 * import { createHMRContext } from 'pulse-js-framework/runtime/hmr';
 *
 * const hmr = createHMRContext(import.meta.url);
 *
 * // State preserved across HMR updates
 * const count = hmr.preservePulse('count', 0);
 *
 * // Effects tracked for cleanup
 * hmr.setup(() => {
 *   effect(() => console.log(count.get()));
 * });
 */

import { pulse } from './pulse.js';
import { setCurrentModule, clearCurrentModule, disposeModule } from './pulse.js';

/**
 * @typedef {Object} HMRContext
 * @property {Object} data - Persistent data storage across HMR updates
 * @property {function(string, *, Object=): Pulse} preservePulse - Create a pulse with preserved state
 * @property {function(function): *} setup - Execute code with module tracking
 * @property {function(function): void} accept - Register HMR accept callback
 * @property {function(function): void} dispose - Register HMR dispose callback
 */

/**
 * Create an HMR context for a module.
 * Provides utilities for state preservation and effect cleanup during HMR.
 *
 * @param {string} moduleId - The module identifier (typically import.meta.url)
 * @returns {HMRContext} HMR context with preservation utilities
 *
 * @example
 * const hmr = createHMRContext(import.meta.url);
 *
 * // Preserve state across HMR
 * const todos = hmr.preservePulse('todos', []);
 * const filter = hmr.preservePulse('filter', 'all');
 *
 * // Setup effects with automatic cleanup
 * hmr.setup(() => {
 *   effect(() => {
 *     document.title = `${todos.get().length} todos`;
 *   });
 * });
 *
 * // Accept HMR updates
 * hmr.accept();
 */
export function createHMRContext(moduleId) {
  // Check if HMR is available (Vite dev server)
  if (typeof import.meta === 'undefined' || !import.meta.hot) {
    return createNoopContext();
  }

  const hot = import.meta.hot;

  // Initialize data storage if not present
  if (!hot.data) {
    hot.data = {};
  }

  return {
    /**
     * Persistent data storage across HMR updates.
     * Values stored here survive module reloads.
     */
    data: hot.data,

    /**
     * Create a pulse with state preservation across HMR updates.
     * If a value exists from a previous module load, it's restored.
     *
     * @param {string} key - Unique key for this pulse within the module
     * @param {*} initialValue - Initial value (used on first load only)
     * @param {Object} [options] - Pulse options (equals function, etc.)
     * @returns {Pulse} A pulse instance with preserved state
     */
    preservePulse(key, initialValue, options) {
      const fullKey = `__pulse_${key}`;

      // Check if we have a preserved value from previous load
      if (fullKey in hot.data) {
        const p = pulse(hot.data[fullKey], options);
        // Register to save state on next HMR update
        hot.dispose(() => {
          hot.data[fullKey] = p.peek();
        });
        return p;
      }

      // First load - create new pulse with initial value
      const p = pulse(initialValue, options);
      // Register to save state on HMR update
      hot.dispose(() => {
        hot.data[fullKey] = p.peek();
      });
      return p;
    },

    /**
     * Execute code with module tracking enabled.
     * Effects created within this callback will be registered
     * for automatic cleanup during HMR.
     *
     * @param {function} callback - Code to execute with tracking
     * @returns {*} The return value of the callback
     */
    setup(callback) {
      setCurrentModule(moduleId);
      try {
        return callback();
      } finally {
        clearCurrentModule();
      }
    },

    /**
     * Register a callback to run when the module accepts an HMR update.
     *
     * @param {function} [callback] - Optional callback for custom handling
     */
    accept(callback) {
      if (callback) {
        hot.accept(callback);
      } else {
        hot.accept();
      }
    },

    /**
     * Register a callback to run before the module is replaced.
     * Use this for custom cleanup logic.
     *
     * @param {function} callback - Cleanup callback
     */
    dispose(callback) {
      hot.dispose(callback);
    }
  };
}

/**
 * Create a no-op HMR context for production or non-HMR environments.
 * All methods work normally but without HMR-specific behavior.
 *
 * @returns {HMRContext} A no-op HMR context
 * @private
 */
function createNoopContext() {
  return {
    data: {},
    preservePulse: (key, initialValue, options) => pulse(initialValue, options),
    setup: (callback) => callback(),
    accept: () => {},
    dispose: () => {}
  };
}

export default {
  createHMRContext
};
