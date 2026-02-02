/**
 * Pulse DOM Lifecycle Module
 * Component lifecycle hooks and mounting utilities
 *
 * @module dom-lifecycle
 */

import { pulse, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { getAdapter } from './dom-adapter.js';
import { Errors } from './errors.js';
import { resolveSelector } from './dom-selector.js';

const log = loggers.dom;

// Context utilities are injected by dom.js to avoid circular dependencies
let _contextUtils = null;

/**
 * Set context utilities for component factory (called by dom.js)
 * @private
 */
export function _setContextUtils(utils) {
  _contextUtils = utils;
}

// =============================================================================
// LIFECYCLE TRACKING
// =============================================================================

let currentMountContext = null;

/**
 * Register a callback to run when component mounts
 *
 * @param {Function} fn - Callback to run on mount
 */
export function onMount(fn) {
  if (currentMountContext) {
    currentMountContext.mountCallbacks.push(fn);
  } else {
    // Defer to next microtask if no context
    const dom = getAdapter();
    dom.queueMicrotask(fn);
  }
}

/**
 * Register a callback to run when component unmounts
 *
 * @param {Function} fn - Callback to run on unmount
 */
export function onUnmount(fn) {
  if (currentMountContext) {
    currentMountContext.unmountCallbacks.push(fn);
  }
  // Also register with effect cleanup if in an effect
  onCleanup(fn);
}

/**
 * Get current mount context (for internal use)
 * @returns {Object|null} Current mount context
 */
export function getMountContext() {
  return currentMountContext;
}

/**
 * Set current mount context (for internal use)
 * @param {Object|null} context - Mount context to set
 * @returns {Object|null} Previous mount context
 */
export function setMountContext(context) {
  const prev = currentMountContext;
  currentMountContext = context;
  return prev;
}

// =============================================================================
// MOUNTING
// =============================================================================

/**
 * Mount an element to a target
 *
 * @param {string|HTMLElement} target - CSS selector or DOM element
 * @param {Node} element - Element to mount
 * @returns {Function} Unmount function
 * @throws {Error} If target element is not found
 */
export function mount(target, element) {
  const dom = getAdapter();
  const { element: resolved, selector } = resolveSelector(target, 'mount');
  if (!resolved) {
    throw Errors.mountNotFound(selector);
  }
  dom.appendChild(resolved, element);
  return () => {
    dom.removeNode(element);
  };
}

// =============================================================================
// COMPONENT FACTORY
// =============================================================================

/**
 * Create a component factory with lifecycle support
 *
 * @param {Function} setup - Setup function that receives context
 * @returns {Function} Component factory function
 */
export function component(setup) {
  return (props = {}) => {
    const dom = getAdapter();
    const state = {};
    const methods = {};

    // Create mount context for lifecycle hooks
    const mountContext = {
      mountCallbacks: [],
      unmountCallbacks: []
    };

    const prevContext = currentMountContext;
    currentMountContext = mountContext;

    // Build context with injected utilities
    const ctx = {
      state,
      methods,
      props,
      pulse,
      onMount,
      onUnmount,
      // Spread utilities injected from dom.js
      ...(_contextUtils || {})
    };

    let result;
    try {
      result = setup(ctx);
    } finally {
      currentMountContext = prevContext;
    }

    // Schedule mount callbacks after DOM insertion
    if (mountContext.mountCallbacks.length > 0) {
      dom.queueMicrotask(() => {
        for (const cb of mountContext.mountCallbacks) {
          try {
            cb();
          } catch (e) {
            log.error('Mount callback error:', e);
          }
        }
      });
    }

    // Store unmount callbacks on the element for later cleanup
    if (dom.isNode(result) && mountContext.unmountCallbacks.length > 0) {
      result._pulseUnmount = mountContext.unmountCallbacks;
    }

    return result;
  };
}

export default {
  onMount,
  onUnmount,
  mount,
  component,
  getMountContext,
  setMountContext,
  _setContextUtils
};
