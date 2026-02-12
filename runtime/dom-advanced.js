/**
 * Pulse DOM Advanced Module
 * Advanced features: portal, error boundary, transitions
 *
 * @module dom-advanced
 */

import { effect, pulse, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { getAdapter } from './dom-adapter.js';
import { resolveSelector } from './dom-selector.js';

const log = loggers.dom;

// =============================================================================
// PORTAL
// =============================================================================

/**
 * Portal - render children into a different DOM location
 *
 * @param {*|Function} children - Children to render (static or reactive)
 * @param {string|HTMLElement} target - Target selector or element
 * @param {Object} [options] - Portal options
 * @param {string} [options.key] - Unique key for multiple portals to same target
 * @param {boolean} [options.prepend=false] - Insert at beginning of target
 * @param {Function} [options.onMount] - Called when children are mounted
 * @param {Function} [options.onUnmount] - Called when children are unmounted
 * @returns {Comment} Marker node with dispose(), moveTo(), getNodes() methods
 */
export function portal(children, target, options = {}) {
  const dom = getAdapter();
  const { key = null, prepend = false, onMount = null, onUnmount = null } = options;

  let currentTarget = null;
  let currentSelector = null;
  let mountedNodes = [];
  let disposed = false;
  let disposeEffect = null;

  // Resolve target
  function _resolveTarget(tgt) {
    const { element: resolvedTarget, selector } = resolveSelector(tgt, 'portal');
    currentTarget = resolvedTarget;
    currentSelector = selector;
    return resolvedTarget;
  }

  const resolvedTarget = _resolveTarget(target);

  if (!resolvedTarget) {
    log.warn(`Portal target not found: "${currentSelector}"`);
    const marker = dom.createComment(key ? `portal:${key}` : 'portal-target-not-found');
    marker.dispose = () => {};
    marker.moveTo = () => {};
    marker.getNodes = () => [];
    return marker;
  }

  const marker = dom.createComment(key ? `portal:${key}` : 'portal');

  function _clearNodes() {
    for (const node of mountedNodes) {
      dom.removeNode(node);
      if (node._pulseUnmount) {
        for (const cb of node._pulseUnmount) cb();
      }
    }
    if (mountedNodes.length > 0) {
      onUnmount?.();
    }
    mountedNodes = [];
  }

  function _mountNodes(nodes, tgt) {
    for (const node of nodes) {
      if (dom.isNode(node)) {
        if (prepend && tgt.firstChild) {
          dom.insertBefore(tgt, node, tgt.firstChild);
        } else {
          dom.appendChild(tgt, node);
        }
        mountedNodes.push(node);
      }
    }
    if (mountedNodes.length > 0) {
      onMount?.();
    }
  }

  function _renderChildren(tgt) {
    if (typeof children === 'function') {
      const result = children();
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        _mountNodes(nodes, tgt);
      }
    } else {
      const nodes = Array.isArray(children) ? children : [children];
      _mountNodes(nodes, tgt);
    }
  }

  // Handle reactive children
  if (typeof children === 'function') {
    disposeEffect = effect(() => {
      if (disposed) return;
      _clearNodes();
      _renderChildren(currentTarget);
    });
  } else {
    _renderChildren(currentTarget);
  }

  /**
   * Manually dispose portal (remove all portaled nodes)
   */
  marker.dispose = function () {
    if (disposed) return;
    disposed = true;
    _clearNodes();
    if (disposeEffect) disposeEffect();
  };

  /**
   * Move portaled content to a new target
   * @param {string|HTMLElement} newTarget - New target selector or element
   */
  marker.moveTo = function (newTarget) {
    if (disposed) return;

    const resolved = _resolveTarget(newTarget);
    if (!resolved) {
      log.warn(`Portal moveTo target not found: "${currentSelector}"`);
      return;
    }

    // Re-mount existing nodes in new target
    const existingNodes = [...mountedNodes];
    // Remove from old target without unmount callbacks
    for (const node of existingNodes) {
      dom.removeNode(node);
    }
    mountedNodes = [];

    // Re-mount in new target
    _mountNodes(existingNodes, resolved);
  };

  /**
   * Get currently portaled nodes
   * @returns {Array} Currently mounted nodes
   */
  marker.getNodes = function () {
    return [...mountedNodes];
  };

  // Attach cleanup for parent effect cascade
  marker._pulseUnmount = [() => marker.dispose()];

  return marker;
}

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

/**
 * Error boundary - catch errors in child components
 *
 * @param {*|Function} children - Children to render (static or reactive)
 * @param {*|Function} fallback - Fallback to render on error (receives error)
 * @returns {DocumentFragment} Container with error-protected content
 */
export function errorBoundary(children, fallback) {
  const dom = getAdapter();
  const container = dom.createDocumentFragment();
  const marker = dom.createComment('error-boundary');
  dom.appendChild(container, marker);

  const error = pulse(null);
  let currentNodes = [];

  const renderContent = () => {
    // Cleanup previous
    for (const node of currentNodes) {
      dom.removeNode(node);
    }
    currentNodes = [];

    const hasError = error.peek();

    try {
      let result;
      if (hasError && fallback) {
        result = typeof fallback === 'function' ? fallback(hasError) : fallback;
      } else {
        result = typeof children === 'function' ? children() : children;
      }

      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = dom.createDocumentFragment();
        for (const node of nodes) {
          if (dom.isNode(node)) {
            dom.appendChild(fragment, node);
            currentNodes.push(node);
          }
        }
        const markerParent = dom.getParentNode(marker);
        if (markerParent) {
          dom.insertBefore(markerParent, fragment, dom.getNextSibling(marker));
        }
      }
    } catch (e) {
      log.error('Error in component:', e);
      error.set(e);
      // Re-render with error
      if (!hasError) {
        dom.queueMicrotask(renderContent);
      }
    }
  };

  effect(renderContent);

  // Expose reset method on marker
  marker.resetError = () => error.set(null);

  return container;
}

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Transition helper - animate element enter/exit
 *
 * MEMORY SAFETY: All timers are tracked and cleared on cleanup
 * to prevent callbacks executing on removed elements.
 *
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Transition options
 * @param {string} [options.enter='fade-in'] - Enter animation class
 * @param {string} [options.exit='fade-out'] - Exit animation class
 * @param {number} [options.duration=300] - Animation duration in ms
 * @param {Function} [options.onEnter] - Callback on enter start
 * @param {Function} [options.onExit] - Callback on exit start
 * @returns {HTMLElement} The element with transition attached
 */
export function transition(element, options = {}) {
  const dom = getAdapter();
  const {
    enter = 'fade-in',
    exit = 'fade-out',
    duration = 300,
    onEnter,
    onExit
  } = options;

  // Track active timers for cleanup
  const activeTimers = new Set();

  const safeTimeout = (fn, delay) => {
    const timerId = dom.setTimeout(() => {
      activeTimers.delete(timerId);
      fn();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearAllTimers = () => {
    for (const timerId of activeTimers) {
      dom.clearTimeout(timerId);
    }
    activeTimers.clear();
  };

  // Apply enter animation
  const applyEnter = () => {
    dom.addClass(element, enter);
    if (onEnter) onEnter(element);
    safeTimeout(() => {
      dom.removeClass(element, enter);
    }, duration);
  };

  // Apply exit animation and return promise
  const applyExit = () => {
    return new Promise(resolve => {
      dom.addClass(element, exit);
      if (onExit) onExit(element);
      safeTimeout(() => {
        dom.removeClass(element, exit);
        resolve();
      }, duration);
    });
  };

  // Apply enter on mount
  dom.queueMicrotask(applyEnter);

  // Attach exit method
  element._pulseTransitionExit = applyExit;

  // Register cleanup for all timers
  onCleanup(clearAllTimers);

  return element;
}

/**
 * Conditional rendering with transitions
 *
 * MEMORY SAFETY: All timers are tracked and cleared on cleanup
 * to prevent callbacks executing on removed elements.
 *
 * @param {Function|Pulse} condition - Condition source (reactive)
 * @param {Function|Node} thenTemplate - Template to render when true
 * @param {Function|Node|null} elseTemplate - Template to render when false
 * @param {Object} options - Transition options
 * @param {number} [options.duration=300] - Animation duration in ms
 * @param {string} [options.enterClass='fade-in'] - Enter animation class
 * @param {string} [options.exitClass='fade-out'] - Exit animation class
 * @returns {DocumentFragment} Container with transitioning content
 */
export function whenTransition(condition, thenTemplate, elseTemplate = null, options = {}) {
  const dom = getAdapter();
  const container = dom.createDocumentFragment();
  const marker = dom.createComment('when-transition');
  dom.appendChild(container, marker);

  const { duration = 300, enterClass = 'fade-in', exitClass = 'fade-out' } = options;

  let currentNodes = [];
  let isTransitioning = false;

  // Track active timers for cleanup
  const activeTimers = new Set();

  const safeTimeout = (fn, delay) => {
    const timerId = dom.setTimeout(() => {
      activeTimers.delete(timerId);
      fn();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearAllTimers = () => {
    for (const timerId of activeTimers) {
      dom.clearTimeout(timerId);
    }
    activeTimers.clear();
  };

  // Register cleanup for all timers
  onCleanup(clearAllTimers);

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition.get();

    if (isTransitioning) return;

    const template = show ? thenTemplate : elseTemplate;

    // Exit animation for current nodes
    if (currentNodes.length > 0) {
      isTransitioning = true;
      const nodesToRemove = [...currentNodes];
      currentNodes = [];

      for (const node of nodesToRemove) {
        dom.addClass(node, exitClass);
      }

      safeTimeout(() => {
        for (const node of nodesToRemove) {
          dom.removeNode(node);
        }
        isTransitioning = false;

        // Render new content
        if (template) {
          const result = typeof template === 'function' ? template() : template;
          if (result) {
            const nodes = Array.isArray(result) ? result : [result];
            const fragment = dom.createDocumentFragment();
            for (const node of nodes) {
              if (dom.isNode(node)) {
                dom.addClass(node, enterClass);
                dom.appendChild(fragment, node);
                currentNodes.push(node);
                safeTimeout(() => dom.removeClass(node, enterClass), duration);
              }
            }
            const markerParent = dom.getParentNode(marker);
            if (markerParent) {
              dom.insertBefore(markerParent, fragment, dom.getNextSibling(marker));
            }
          }
        }
      }, duration);
    } else if (template) {
      // No previous content, just render with enter animation
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = dom.createDocumentFragment();
        for (const node of nodes) {
          if (dom.isNode(node)) {
            dom.addClass(node, enterClass);
            dom.appendChild(fragment, node);
            currentNodes.push(node);
            safeTimeout(() => dom.removeClass(node, enterClass), duration);
          }
        }
        const markerParent = dom.getParentNode(marker);
        if (markerParent) {
          dom.insertBefore(markerParent, fragment, dom.getNextSibling(marker));
        }
      }
    }
  });

  return container;
}

export default {
  portal,
  errorBoundary,
  transition,
  whenTransition
};
