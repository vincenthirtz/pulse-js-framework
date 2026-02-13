/**
 * Pulse Router - History and Scroll Management
 *
 * Browser history integration, scroll position restoration, and persistence
 *
 * @module pulse-js-framework/runtime/router/history
 */

import { LRUCache } from '../lru-cache.js';
import { loggers } from '../logger.js';

const log = loggers.router;

/**
 * Create scroll position manager with persistence
 * @param {Object} options - Configuration
 * @param {boolean} options.persist - Enable sessionStorage persistence
 * @param {string} options.persistKey - Storage key name
 * @returns {Object} Scroll position manager
 */
export function createScrollManager(options = {}) {
  const { persist = false, persistKey = 'pulse-router-scroll' } = options;

  // Scroll positions for history (LRU cache to prevent memory leaks)
  // Keeps last 100 scroll positions - enough for typical navigation patterns
  const scrollPositions = new LRUCache(100);

  // Restore scroll positions from sessionStorage if persistence is enabled
  if (persist && typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(persistKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore up to 100 most recent positions
        const entries = Object.entries(parsed).slice(-100);
        for (const [path, pos] of entries) {
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            scrollPositions.set(path, pos);
          }
        }
        log.debug(`Restored ${entries.length} scroll positions from sessionStorage`);
      }
    } catch (err) {
      log.warn('Failed to restore scroll positions from sessionStorage:', err.message);
    }
  }

  /**
   * Persist scroll positions to sessionStorage
   */
  function persistScrollPositions() {
    if (!persist || typeof sessionStorage === 'undefined') return;

    try {
      const data = {};
      for (const [path, pos] of scrollPositions.entries()) {
        data[path] = pos;
      }
      sessionStorage.setItem(persistKey, JSON.stringify(data));
    } catch (err) {
      // SessionStorage may be full or disabled
      log.warn('Failed to persist scroll positions:', err.message);
    }
  }

  /**
   * Save current scroll position for a path
   */
  function saveScrollPosition(path) {
    if (!path) return;
    scrollPositions.set(path, {
      x: window.scrollX,
      y: window.scrollY
    });
    persistScrollPositions();
  }

  /**
   * Get saved scroll position for a path
   */
  function getScrollPosition(path) {
    return scrollPositions.get(path);
  }

  return {
    saveScrollPosition,
    getScrollPosition,
    persistScrollPositions
  };
}

/**
 * Handle scroll behavior after navigation
 */
export function handleScroll(to, from, savedPosition, scrollBehavior = null) {
  if (scrollBehavior) {
    let position;
    try {
      position = scrollBehavior(to, from, savedPosition);
    } catch (err) {
      log.warn(`scrollBehavior threw an error: ${err.message}`);
      // Fall back to default behavior
      window.scrollTo(0, 0);
      return;
    }

    // Validate position is a valid object
    if (position && typeof position === 'object') {
      if (typeof position.selector === 'string' && position.selector) {
        // Scroll to element
        try {
          const el = document.querySelector(position.selector);
          if (el) {
            const behavior = position.behavior === 'smooth' || position.behavior === 'auto'
              ? position.behavior
              : 'auto';
            el.scrollIntoView({ behavior });
          }
        } catch (err) {
          log.warn(`Invalid selector in scrollBehavior: ${position.selector}`);
        }
      } else if (typeof position.x === 'number' || typeof position.y === 'number') {
        const x = typeof position.x === 'number' && isFinite(position.x) ? position.x : 0;
        const y = typeof position.y === 'number' && isFinite(position.y) ? position.y : 0;
        const behavior = position.behavior === 'smooth' || position.behavior === 'auto'
          ? position.behavior
          : 'auto';
        window.scrollTo({ left: x, top: y, behavior });
      }
      // If position is object but no valid selector/x/y, do nothing (intentional no-scroll)
    }
    // If position is falsy (null/undefined/false), do nothing (intentional no-scroll)
  } else if (savedPosition) {
    // Default: restore saved position
    const x = typeof savedPosition.x === 'number' && isFinite(savedPosition.x) ? savedPosition.x : 0;
    const y = typeof savedPosition.y === 'number' && isFinite(savedPosition.y) ? savedPosition.y : 0;
    window.scrollTo(x, y);
  } else {
    // Default: scroll to top
    window.scrollTo(0, 0);
  }
}

/**
 * Save current scroll and wait for popstate to fire
 * Used by back(), forward(), and go() to integrate with scroll restoration
 * @returns {Promise} Resolves after popstate fires or timeout
 */
export function saveScrollAndWaitForPopState() {
  // Return a Promise that resolves on the next popstate (with 100ms fallback)
  return new Promise(resolve => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener('popstate', listener);
      resolve();
    };
    const listener = () => done();
    window.addEventListener('popstate', listener);
    setTimeout(done, 100);
  });
}

/**
 * Navigate back in browser history
 * Saves scroll position before navigating
 * @returns {Promise} Resolves after navigation completes
 * @example
 * await router.back(); // Go to previous page
 */
export function back() {
  const promise = saveScrollAndWaitForPopState();
  window.history.back();
  return promise;
}

/**
 * Navigate forward in browser history
 * Saves scroll position before navigating
 * @returns {Promise} Resolves after navigation completes
 * @example
 * await router.forward(); // Go to next page (if available)
 */
export function forward() {
  const promise = saveScrollAndWaitForPopState();
  window.history.forward();
  return promise;
}

/**
 * Navigate to a specific position in browser history
 * Saves scroll position before navigating
 * @param {number} delta - Number of entries to move (negative = back, positive = forward)
 * @returns {Promise} Resolves after navigation completes
 * @example
 * await router.go(-2); // Go back 2 pages
 * await router.go(1);  // Go forward 1 page
 */
export function go(delta) {
  const promise = saveScrollAndWaitForPopState();
  window.history.go(delta);
  return promise;
}
