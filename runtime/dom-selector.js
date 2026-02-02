/**
 * Pulse DOM Selector Module
 * CSS selector parsing with LRU caching
 *
 * @module dom-selector
 */

import { loggers } from './logger.js';
import { LRUCache } from './lru-cache.js';
import { getAdapter } from './dom-adapter.js';

const log = loggers.dom;

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * @typedef {Object} DomConfig
 * @property {number} [selectorCacheCapacity=500] - Max selectors to cache (0 = disabled)
 * @property {boolean} [trackCacheMetrics=true] - Enable cache hit/miss tracking
 */

/** @type {DomConfig} */
const config = {
  selectorCacheCapacity: 500,
  trackCacheMetrics: true
};

// =============================================================================
// SELECTOR CACHE
// =============================================================================
// LRU (Least Recently Used) cache for parseSelector results.
//
// Why LRU instead of Map?
// - Apps typically reuse the same selectors (e.g., 'div.container', 'button.primary')
// - Without eviction, memory grows unbounded in long-running apps
// - LRU keeps frequently-used selectors hot while evicting rare ones
//
// Default capacity: 500 selectors (configurable via configureDom())
// - Most apps use 50-200 unique selectors
// - 500 provides headroom for dynamic selectors without excessive memory
//
// Cache hit returns a shallow copy to prevent mutation of cached config
// Metrics tracking enabled for performance monitoring
let selectorCache = new LRUCache(config.selectorCacheCapacity, { trackMetrics: config.trackCacheMetrics });

/**
 * Configure DOM module settings.
 *
 * Call this before using any DOM functions if you need non-default settings.
 * Changing configuration clears the selector cache.
 *
 * @param {Partial<DomConfig>} options - Configuration options
 * @returns {DomConfig} Current configuration after applying changes
 *
 * @example
 * // Increase cache for large apps
 * configureDom({ selectorCacheCapacity: 1000 });
 *
 * @example
 * // Disable caching for debugging
 * configureDom({ selectorCacheCapacity: 0 });
 *
 * @example
 * // Disable metrics tracking in production
 * configureDom({ trackCacheMetrics: false });
 */
export function configureDom(options = {}) {
  let cacheChanged = false;

  if (options.selectorCacheCapacity !== undefined) {
    config.selectorCacheCapacity = options.selectorCacheCapacity;
    cacheChanged = true;
  }

  if (options.trackCacheMetrics !== undefined) {
    config.trackCacheMetrics = options.trackCacheMetrics;
    cacheChanged = true;
  }

  // Recreate cache if settings changed
  if (cacheChanged) {
    if (config.selectorCacheCapacity > 0) {
      selectorCache = new LRUCache(config.selectorCacheCapacity, {
        trackMetrics: config.trackCacheMetrics
      });
    } else {
      // Disable caching with a null-like cache
      selectorCache = {
        get: () => undefined,
        set: () => {},
        clear: () => {},
        getMetrics: () => ({ hits: 0, misses: 0, evictions: 0, hitRate: 0, size: 0, capacity: 0 }),
        resetMetrics: () => {}
      };
    }
  }

  return { ...config };
}

/**
 * Get current DOM configuration.
 * @returns {DomConfig} Current configuration (copy)
 */
export function getDomConfig() {
  return { ...config };
}

/**
 * Clear the selector cache.
 * Useful for memory management or after significant DOM structure changes.
 */
export function clearSelectorCache() {
  selectorCache.clear();
}

/**
 * Get selector cache performance metrics.
 * Useful for debugging and performance tuning.
 *
 * @returns {{hits: number, misses: number, evictions: number, hitRate: number, size: number, capacity: number}}
 * @example
 * const stats = getCacheMetrics();
 * console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
 * console.log(`Cache size: ${stats.size}/${stats.capacity}`);
 */
export function getCacheMetrics() {
  return selectorCache.getMetrics();
}

/**
 * Reset cache metrics counters.
 * Useful for measuring performance over specific time periods.
 */
export function resetCacheMetrics() {
  selectorCache.resetMetrics();
}

/**
 * Resolve a selector string or element to a DOM element
 * @param {string|HTMLElement} target - CSS selector or DOM element
 * @param {string} context - Context name for error messages
 * @returns {{element: HTMLElement|null, selector: string}} Resolved element and original selector
 */
export function resolveSelector(target, context = 'target') {
  if (typeof target === 'string') {
    const dom = getAdapter();
    const element = dom.querySelector(target);
    return { element, selector: target };
  }
  return { element: target, selector: '(element)' };
}

/**
 * Parse a CSS selector-like string into element configuration
 * Results are cached for performance using LRU cache.
 *
 * Supported syntax:
 * - Tag: `div`, `span`, `custom-element`
 * - ID: `#app`, `#my-id`, `#_private`
 * - Classes: `.class`, `.my-class`, `.-modifier`
 * - Attributes: `[attr]`, `[attr=value]`, `[attr="quoted value"]`, `[attr='single quoted']`
 *
 * Examples:
 *   "div" -> { tag: "div" }
 *   "#app" -> { tag: "div", id: "app" }
 *   ".container" -> { tag: "div", classes: ["container"] }
 *   "button.primary.large" -> { tag: "button", classes: ["primary", "large"] }
 *   "input[type=text][placeholder=Name]" -> { tag: "input", attrs: { type: "text", placeholder: "Name" } }
 *   "div[data-id=\"complex-123\"]" -> { tag: "div", attrs: { "data-id": "complex-123" } }
 *
 * @param {string} selector - CSS selector-like string
 * @returns {{tag: string, id: string|null, classes: string[], attrs: Object}} Parsed configuration
 */
export function parseSelector(selector) {
  if (!selector || selector === '') {
    return { tag: 'div', id: null, classes: [], attrs: {} };
  }

  // Check cache first
  const cached = selectorCache.get(selector);
  if (cached) {
    // Return a shallow copy to prevent mutation
    return {
      tag: cached.tag,
      id: cached.id,
      classes: [...cached.classes],
      attrs: { ...cached.attrs }
    };
  }

  const config = {
    tag: 'div',
    id: null,
    classes: [],
    attrs: {}
  };

  let remaining = selector;

  // Match tag name at the start
  const tagMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (tagMatch) {
    config.tag = tagMatch[1];
    remaining = remaining.slice(tagMatch[0].length);
  }

  // Match ID (supports starting with letter, underscore, or hyphen followed by valid chars)
  const idMatch = remaining.match(/#([a-zA-Z_-][a-zA-Z0-9-_]*)/);
  if (idMatch) {
    config.id = idMatch[1];
    remaining = remaining.replace(idMatch[0], '');
  }

  // Match classes (supports starting with letter, underscore, or hyphen)
  const classMatches = remaining.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9-_]*)/g);
  for (const match of classMatches) {
    config.classes.push(match[1]);
  }

  // Match attributes - improved regex handles quoted values with special characters
  // Matches: [attr], [attr=value], [attr="quoted value"], [attr='quoted value']
  const attrRegex = /\[([a-zA-Z_][a-zA-Z0-9-_]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g;
  const attrMatches = remaining.matchAll(attrRegex);
  for (const match of attrMatches) {
    const key = match[1];
    // Value can be in match[2] (double-quoted), match[3] (single-quoted), or match[4] (unquoted)
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    config.attrs[key] = value;
  }

  // Validate: check for unparsed content (malformed selector parts)
  // Remove all parsed parts to see if anything remains
  let unparsed = remaining
    .replace(/#[a-zA-Z_-][a-zA-Z0-9-_]*/g, '')  // Remove IDs
    .replace(/\.[a-zA-Z_-][a-zA-Z0-9-_]*/g, '') // Remove classes
    .replace(/\[([a-zA-Z_][a-zA-Z0-9-_]*)(?:=(?:"[^"]*"|'[^']*'|[^\]]*))?\]/g, '') // Remove attrs
    .trim();

  if (unparsed) {
    log.warn(`Selector "${selector}" contains unrecognized parts: "${unparsed}". ` +
      'Supported syntax: tag#id.class[attr=value]');
  }

  // Cache the result (LRU cache handles eviction automatically)
  selectorCache.set(selector, config);

  // Return a copy
  return {
    tag: config.tag,
    id: config.id,
    classes: [...config.classes],
    attrs: { ...config.attrs }
  };
}

export default {
  parseSelector,
  resolveSelector,
  configureDom,
  getDomConfig,
  clearSelectorCache,
  getCacheMetrics,
  resetCacheMetrics
};
