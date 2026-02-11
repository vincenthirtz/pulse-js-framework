/**
 * Pulse DOM Element Recycling Pool
 *
 * Pools detached DOM elements by tag name for reuse, avoiding expensive
 * createElement() calls during list reconciliation.
 *
 * Used by: list() when `recycle: true` option is set
 * Related: ADR-0004, virtual scrolling (ADR-0003)
 *
 * @module runtime/dom-recycle
 */

import { getAdapter } from './dom-adapter.js';

// ============================================================================
// Constants & Configuration
// ============================================================================

const DEFAULT_OPTIONS = {
  maxPerTag: 50,
  maxTotal: 200,
  resetOnRecycle: true
};

// ============================================================================
// Element Reset
// ============================================================================

/**
 * Reset an element to a clean state before pooling.
 * Removes attributes, children, styles, and event listener references.
 *
 * @param {Element} element - Element to reset
 * @param {DOMAdapter} dom - DOM adapter
 * @private
 */
function resetElement(element, dom) {
  // 1. Clear event listener tracking (if any)
  if (element._eventListeners) {
    element._eventListeners.clear();
  }

  // 2. Remove all attributes
  if (element.attributes) {
    const attrs = element.attributes;
    while (attrs.length > 0) {
      dom.removeAttribute(element, attrs[0].name);
    }
  } else if (typeof element.getAttributeNames === 'function') {
    for (const name of element.getAttributeNames()) {
      dom.removeAttribute(element, name);
    }
  }

  // 3. Clear content and styles
  dom.setTextContent(element, '');
  if (element.className !== undefined) {
    element.className = '';
  }
  if (element.style && typeof element.style === 'object') {
    element.style.cssText = '';
  }

  // 4. Remove child nodes
  let child = dom.getFirstChild(element);
  while (child) {
    dom.removeNode(child);
    child = dom.getFirstChild(element);
  }
}

// ============================================================================
// Element Pool
// ============================================================================

/**
 * Create an element recycling pool.
 *
 * @param {Object} [options] - Pool configuration
 * @param {number} [options.maxPerTag=50] - Max recycled elements per tag name
 * @param {number} [options.maxTotal=200] - Max total recycled elements
 * @param {boolean} [options.resetOnRecycle=true] - Reset attributes/styles on release
 * @returns {ElementPool} Pool instance
 *
 * @example
 * const pool = createElementPool({ maxPerTag: 50, maxTotal: 200 });
 * const li = pool.acquire('li');  // Reuses from pool or creates new
 * pool.release(li);               // Returns to pool for reuse
 */
export function createElementPool(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const dom = getAdapter();

  /** @type {Map<string, Element[]>} */
  const pool = new Map();
  let totalSize = 0;
  let hits = 0;
  let misses = 0;

  return {
    /**
     * Acquire an element from the pool or create a new one.
     *
     * @param {string} tagName - Tag name (e.g., 'li', 'div')
     * @returns {Element} A clean element ready for use
     */
    acquire(tagName) {
      const tag = tagName.toLowerCase();
      const bucket = pool.get(tag);

      if (bucket && bucket.length > 0) {
        hits++;
        totalSize--;
        return bucket.pop();
      }

      misses++;
      return dom.createElement(tag);
    },

    /**
     * Release an element back to the pool for reuse.
     * The element is reset (attributes, children, styles cleared) before pooling.
     *
     * @param {Element} element - Element to release
     * @returns {boolean} true if element was pooled, false if pool is full
     */
    release(element) {
      if (!dom.isElement(element)) return false;

      const tag = (element.tagName || element.nodeName || '').toLowerCase();
      if (!tag) return false;

      // Check pool limits
      if (totalSize >= config.maxTotal) return false;

      let bucket = pool.get(tag);
      if (!bucket) {
        bucket = [];
        pool.set(tag, bucket);
      }

      if (bucket.length >= config.maxPerTag) return false;

      // Reset element before pooling
      if (config.resetOnRecycle) {
        resetElement(element, dom);
      }

      bucket.push(element);
      totalSize++;
      return true;
    },

    /**
     * Get pool statistics.
     *
     * @returns {Object} Pool stats
     */
    stats() {
      const total = hits + misses;
      return {
        size: totalSize,
        hits,
        misses,
        hitRate: total > 0 ? Math.round((hits / total) * 1000) / 1000 : 0
      };
    },

    /**
     * Clear all pooled elements.
     */
    clear() {
      pool.clear();
      totalSize = 0;
    },

    /**
     * Reset statistics counters.
     */
    resetStats() {
      hits = 0;
      misses = 0;
    },

    /**
     * Current number of pooled elements.
     * @type {number}
     */
    get size() {
      return totalSize;
    }
  };
}

// ============================================================================
// Default Singleton Pool
// ============================================================================

/** @type {ReturnType<typeof createElementPool>|null} */
let defaultPool = null;

/**
 * Get the default global element pool (lazy singleton).
 *
 * @returns {ReturnType<typeof createElementPool>} Default pool
 */
export function getPool() {
  if (!defaultPool) {
    defaultPool = createElementPool();
  }
  return defaultPool;
}

/**
 * Reset and clear the default pool.
 * Useful for testing or SSR cleanup.
 */
export function resetPool() {
  if (defaultPool) {
    defaultPool.clear();
  }
  defaultPool = null;
}

export default {
  createElementPool,
  getPool,
  resetPool
};
