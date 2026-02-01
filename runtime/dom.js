/**
 * Pulse DOM - Declarative DOM manipulation
 *
 * Creates DOM elements using CSS selector-like syntax
 * and provides reactive bindings.
 *
 * DOM Abstraction:
 * This module uses a DOM adapter for all DOM operations, enabling:
 * - Server-Side Rendering (SSR) with virtual DOM implementations
 * - Simplified testing without browser environment
 * - Platform-specific optimizations
 *
 * @see ./dom-adapter.js for adapter configuration
 */

import { effect, pulse, batch, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { LRUCache } from './lru-cache.js';
import { safeSetAttribute, sanitizeUrl, safeSetStyle } from './utils.js';
import { getAdapter } from './dom-adapter.js';
import { Errors } from '../core/errors.js';

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
 * @private
 * @param {string|HTMLElement} target - CSS selector or DOM element
 * @param {string} context - Context name for error messages
 * @returns {{element: HTMLElement|null, selector: string}} Resolved element and original selector
 */
function resolveSelector(target, context = 'target') {
  if (typeof target === 'string') {
    const dom = getAdapter();
    const element = dom.querySelector(target);
    return { element, selector: target };
  }
  return { element: target, selector: '(element)' };
}

// Lifecycle tracking
let mountCallbacks = [];
let unmountCallbacks = [];
let currentMountContext = null;

/**
 * Register a callback to run when component mounts
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
 */
export function onUnmount(fn) {
  if (currentMountContext) {
    currentMountContext.unmountCallbacks.push(fn);
  }
  // Also register with effect cleanup if in an effect
  onCleanup(fn);
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

/**
 * Create a DOM element from a selector
 */
export function el(selector, ...children) {
  const dom = getAdapter();
  const config = parseSelector(selector);
  const element = dom.createElement(config.tag);

  if (config.id) {
    dom.setProperty(element, 'id', config.id);
  }

  if (config.classes.length > 0) {
    dom.setProperty(element, 'className', config.classes.join(' '));
  }

  for (const [key, value] of Object.entries(config.attrs)) {
    // Use safeSetAttribute to prevent XSS via event handlers and javascript: URLs
    safeSetAttribute(element, key, value, {}, dom);
  }

  // Process children
  for (const child of children) {
    appendChild(element, child);
  }

  return element;
}

/**
 * Append a child to an element, handling various types
 */
function appendChild(parent, child) {
  const dom = getAdapter();

  if (child == null || child === false) return;

  if (typeof child === 'string' || typeof child === 'number') {
    dom.appendChild(parent, dom.createTextNode(String(child)));
  } else if (dom.isNode(child)) {
    dom.appendChild(parent, child);
  } else if (Array.isArray(child)) {
    for (const c of child) {
      appendChild(parent, c);
    }
  } else if (typeof child === 'function') {
    // Reactive child - create a placeholder and update it
    const placeholder = dom.createComment('pulse');
    dom.appendChild(parent, placeholder);
    let currentNodes = [];

    effect(() => {
      const result = child();

      // Remove old nodes
      for (const node of currentNodes) {
        dom.removeNode(node);
      }
      currentNodes = [];

      // Add new nodes
      if (result != null && result !== false) {
        const fragment = dom.createDocumentFragment();
        if (typeof result === 'string' || typeof result === 'number') {
          const textNode = dom.createTextNode(String(result));
          dom.appendChild(fragment, textNode);
          currentNodes.push(textNode);
        } else if (dom.isNode(result)) {
          dom.appendChild(fragment, result);
          currentNodes.push(result);
        } else if (Array.isArray(result)) {
          for (const r of result) {
            if (dom.isNode(r)) {
              dom.appendChild(fragment, r);
              currentNodes.push(r);
            } else if (r != null && r !== false) {
              const textNode = dom.createTextNode(String(r));
              dom.appendChild(fragment, textNode);
              currentNodes.push(textNode);
            }
          }
        }
        const placeholderParent = dom.getParentNode(placeholder);
        if (placeholderParent) {
          dom.insertBefore(placeholderParent, fragment, dom.getNextSibling(placeholder));
        } else {
          log.warn('Cannot insert reactive children: placeholder has no parent node');
        }
      }
    });
  }
}

/**
 * Create a reactive text node
 */
export function text(getValue) {
  const dom = getAdapter();
  if (typeof getValue === 'function') {
    const node = dom.createTextNode('');
    effect(() => {
      dom.setTextContent(node, String(getValue()));
    });
    return node;
  }
  return dom.createTextNode(String(getValue));
}

/**
 * URL attributes that need sanitization in bind()
 * @private
 */
const BIND_URL_ATTRIBUTES = new Set([
  'href', 'src', 'action', 'formaction', 'data', 'poster',
  'cite', 'codebase', 'background', 'profile', 'usemap', 'longdesc'
]);

/**
 * Bind an attribute reactively with XSS protection
 *
 * Security: URL attributes (href, src, etc.) are sanitized to prevent javascript: XSS
 */
export function bind(element, attr, getValue) {
  const dom = getAdapter();
  const lowerAttr = attr.toLowerCase();
  const isUrlAttr = BIND_URL_ATTRIBUTES.has(lowerAttr);

  if (typeof getValue === 'function') {
    effect(() => {
      const value = getValue();
      if (value == null || value === false) {
        dom.removeAttribute(element, attr);
      } else if (value === true) {
        dom.setAttribute(element, attr, '');
      } else {
        // Sanitize URL attributes to prevent javascript: XSS
        if (isUrlAttr) {
          const sanitized = sanitizeUrl(String(value));
          if (sanitized === null) {
            console.warn(
              `[Pulse Security] Dangerous URL blocked in bind() for ${attr}: "${String(value).slice(0, 50)}"`
            );
            dom.removeAttribute(element, attr);
            return;
          }
          dom.setAttribute(element, attr, sanitized);
        } else {
          dom.setAttribute(element, attr, String(value));
        }
      }
    });
  } else {
    // Sanitize URL attributes for static values too
    if (isUrlAttr) {
      const sanitized = sanitizeUrl(String(getValue));
      if (sanitized === null) {
        console.warn(
          `[Pulse Security] Dangerous URL blocked in bind() for ${attr}: "${String(getValue).slice(0, 50)}"`
        );
        return element;
      }
      dom.setAttribute(element, attr, sanitized);
    } else {
      dom.setAttribute(element, attr, String(getValue));
    }
  }
  return element;
}

/**
 * Bind a property reactively
 */
export function prop(element, propName, getValue) {
  const dom = getAdapter();
  if (typeof getValue === 'function') {
    effect(() => {
      dom.setProperty(element, propName, getValue());
    });
  } else {
    dom.setProperty(element, propName, getValue);
  }
  return element;
}

/**
 * Bind CSS class reactively
 */
export function cls(element, className, condition) {
  const dom = getAdapter();
  if (typeof condition === 'function') {
    effect(() => {
      if (condition()) {
        dom.addClass(element, className);
      } else {
        dom.removeClass(element, className);
      }
    });
  } else if (condition) {
    dom.addClass(element, className);
  }
  return element;
}

/**
 * Bind style property reactively with CSS injection protection
 *
 * Security: CSS values are sanitized to prevent injection attacks via:
 * - Semicolons (property injection: 'red; position: fixed')
 * - url() (data exfiltration)
 * - expression() (IE script execution)
 *
 * @param {HTMLElement} element - Target element
 * @param {string} prop - CSS property name
 * @param {*} getValue - Value or function returning value
 * @param {Object} [options] - Options passed to safeSetStyle
 * @returns {HTMLElement} The element for chaining
 */
export function style(element, prop, getValue, options = {}) {
  const dom = getAdapter();
  if (typeof getValue === 'function') {
    effect(() => {
      safeSetStyle(element, prop, getValue(), options, dom);
    });
  } else {
    safeSetStyle(element, prop, getValue, options, dom);
  }
  return element;
}

/**
 * Attach an event listener
 */
export function on(element, event, handler, options) {
  const dom = getAdapter();
  dom.addEventListener(element, event, handler, options);

  // Auto-cleanup: remove listener when effect is disposed (HMR support)
  onCleanup(() => {
    dom.removeEventListener(element, event, handler, options);
  });

  return element;
}

/**
 * Compute Longest Increasing Subsequence indices
 * Used to minimize DOM moves during list reconciliation
 * @private
 * @param {number[]} arr - Array of indices
 * @returns {number[]} Indices of elements in the LIS
 */
function computeLIS(arr) {
  const n = arr.length;
  if (n === 0) return [];

  // dp[i] = smallest tail of LIS of length i+1
  const dp = [];
  // parent[i] = index of previous element in LIS ending at i
  const parent = new Array(n).fill(-1);
  // indices[i] = index in original array of dp[i]
  const indices = [];

  for (let i = 0; i < n; i++) {
    const val = arr[i];

    // Binary search for position
    let lo = 0, hi = dp.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dp[mid] < val) lo = mid + 1;
      else hi = mid;
    }

    if (lo === dp.length) {
      dp.push(val);
      indices.push(i);
    } else {
      dp[lo] = val;
      indices[lo] = i;
    }

    parent[i] = lo > 0 ? indices[lo - 1] : -1;
  }

  // Reconstruct LIS indices
  const lis = [];
  let idx = indices[dp.length - 1];
  while (idx !== -1) {
    lis.push(idx);
    idx = parent[idx];
  }

  return lis.reverse();
}

/**
 * Create a reactive list with efficient keyed diffing
 *
 * LIST DIFFING ALGORITHM:
 * -----------------------
 * This uses a keyed reconciliation strategy to minimize DOM operations:
 *
 * 1. KEY EXTRACTION: Each item gets a unique key via keyFn (defaults to index)
 *    Good keys: item.id, item.uuid (stable across re-renders)
 *    Bad keys: array index (causes unnecessary re-renders on reorder)
 *
 * 2. RECONCILIATION PHASES:
 *    a) Build a map of new items by key
 *    b) For existing keys: reuse the DOM nodes (no re-creation)
 *    c) For removed keys: remove DOM nodes and run cleanup
 *    d) For new keys: batch create via DocumentFragment
 *
 * 3. REORDERING: Uses LIS (Longest Increasing Subsequence):
 *    - Computes which nodes are already in correct relative order
 *    - Only moves nodes NOT in the LIS (minimizes DOM operations)
 *    - New items are batched into DocumentFragment before insertion
 *
 * 4. BOUNDARY MARKERS: Uses comment nodes to track list boundaries:
 *    - startMarker: Insertion point for first item
 *    - endMarker: End boundary (not currently used but reserved)
 *
 * COMPLEXITY: O(n log n) for LIS + O(m) DOM moves where m = n - LIS length
 * Best case (append only): O(n) with single DocumentFragment insert
 *
 * @param {Function|Pulse} getItems - Items source (reactive)
 * @param {Function} template - (item, index) => Node | Node[]
 * @param {Function} keyFn - (item, index) => key (default: index)
 * @returns {DocumentFragment} Container fragment with reactive list
 */
export function list(getItems, template, keyFn = (item, i) => i) {
  const dom = getAdapter();
  const container = dom.createDocumentFragment();
  const startMarker = dom.createComment('list-start');
  const endMarker = dom.createComment('list-end');

  dom.appendChild(container, startMarker);
  dom.appendChild(container, endMarker);

  // Map: key -> { nodes: Node[], cleanup: Function, item: any }
  let itemNodes = new Map();
  let keyOrder = []; // Track order of keys for diffing

  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    const itemsArray = Array.isArray(items) ? items : Array.from(items);

    const newKeys = [];
    const newItemNodes = new Map();
    const newItems = []; // Track new items for batched insertion

    // Phase 1: Build map of new items by key
    itemsArray.forEach((item, index) => {
      const key = keyFn(item, index);
      newKeys.push(key);

      if (itemNodes.has(key)) {
        // Reuse existing entry
        newItemNodes.set(key, itemNodes.get(key));
      } else {
        // Mark as new (will batch create later)
        newItems.push({ key, item, index });
      }
    });

    // Phase 2: Batch create new nodes using DocumentFragment
    if (newItems.length > 0) {
      for (const { key, item, index } of newItems) {
        const result = template(item, index);
        const nodes = Array.isArray(result) ? result : [result];
        newItemNodes.set(key, { nodes, cleanup: null, item });
      }
    }

    // Phase 3: Remove items that are no longer present
    for (const [key, entry] of itemNodes) {
      if (!newItemNodes.has(key)) {
        for (const node of entry.nodes) {
          dom.removeNode(node);
        }
        if (entry.cleanup) entry.cleanup();
      }
    }

    // Phase 4: Efficient reordering using LIS algorithm
    // Build old position map for existing keys
    const oldKeyIndex = new Map();
    keyOrder.forEach((key, i) => oldKeyIndex.set(key, i));

    // Get indices of existing items in old order
    const existingIndices = [];
    const existingKeys = [];
    for (let i = 0; i < newKeys.length; i++) {
      const key = newKeys[i];
      if (oldKeyIndex.has(key)) {
        existingIndices.push(oldKeyIndex.get(key));
        existingKeys.push(key);
      }
    }

    // Compute LIS - these nodes don't need to move
    const lisIndices = new Set(computeLIS(existingIndices));
    const stableKeys = new Set();
    existingKeys.forEach((key, i) => {
      if (lisIndices.has(i)) {
        stableKeys.add(key);
      }
    });

    // Phase 5: Position nodes with minimal DOM operations
    const parent = dom.getParentNode(startMarker);
    if (!parent) {
      // Not yet in DOM, use simple append with DocumentFragment batch
      const fragment = dom.createDocumentFragment();
      for (const key of newKeys) {
        const entry = newItemNodes.get(key);
        for (const node of entry.nodes) {
          dom.appendChild(fragment, node);
        }
      }
      dom.insertBefore(container, fragment, endMarker);
    } else {
      // Optimized reordering: batch consecutive inserts using DocumentFragment
      let prevNode = startMarker;

      // Process items in new order
      for (let i = 0; i < newKeys.length; i++) {
        const key = newKeys[i];
        const entry = newItemNodes.get(key);
        const firstNode = entry.nodes[0];
        const isNew = !oldKeyIndex.has(key);
        const isStable = stableKeys.has(key);

        // Check if node is already in correct position
        const inPosition = dom.getNextSibling(prevNode) === firstNode;

        if (inPosition && (isStable || isNew)) {
          // Already in correct position, just advance
          prevNode = entry.nodes[entry.nodes.length - 1];
        } else {
          // Collect consecutive items that need to be inserted at this position
          const fragment = dom.createDocumentFragment();
          let j = i;

          while (j < newKeys.length) {
            const k = newKeys[j];
            const e = newItemNodes.get(k);
            const f = e.nodes[0];
            const n = !oldKeyIndex.has(k);
            const s = stableKeys.has(k);

            // If this item is already in position after prevNode, stop batching
            if (j > i && dom.getNextSibling(prevNode) === f) {
              break;
            }

            // Add to batch if it's new or needs to move
            if (n || !s || dom.getNextSibling(prevNode) !== f) {
              for (const node of e.nodes) {
                dom.appendChild(fragment, node);
              }
              j++;
            } else {
              break;
            }
          }

          // Insert the batch
          if (dom.getFirstChild(fragment)) {
            dom.insertBefore(parent, fragment, dom.getNextSibling(prevNode));
          }

          // Update prevNode to last inserted node
          if (j > i) {
            const lastEntry = newItemNodes.get(newKeys[j - 1]);
            prevNode = lastEntry.nodes[lastEntry.nodes.length - 1];
            i = j - 1; // Continue from where we left off
          }
        }
      }
    }

    itemNodes = newItemNodes;
    keyOrder = newKeys;
  });

  return container;
}

/**
 * Conditional rendering
 */
export function when(condition, thenTemplate, elseTemplate = null) {
  const dom = getAdapter();
  const container = dom.createDocumentFragment();
  const marker = dom.createComment('when');
  dom.appendChild(container, marker);

  let currentNodes = [];
  let currentCleanup = null;

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition.get();

    // Cleanup previous
    for (const node of currentNodes) {
      dom.removeNode(node);
    }
    if (currentCleanup) currentCleanup();
    currentNodes = [];
    currentCleanup = null;

    // Render new
    const template = show ? thenTemplate : elseTemplate;
    if (template) {
      const result = typeof template === 'function' ? template() : template;
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
    }
  });

  return container;
}

/**
 * Switch/case rendering
 */
export function match(getValue, cases) {
  const dom = getAdapter();
  const marker = dom.createComment('match');
  let currentNodes = [];

  effect(() => {
    const value = typeof getValue === 'function' ? getValue() : getValue.get();

    // Remove old nodes
    for (const node of currentNodes) {
      dom.removeNode(node);
    }
    currentNodes = [];

    // Find matching case
    const template = cases[value] ?? cases.default;
    if (template) {
      const result = typeof template === 'function' ? template() : template;
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
    }
  });

  return marker;
}

/**
 * Two-way binding for form inputs
 *
 * MEMORY SAFETY: All event listeners are registered with onCleanup()
 * to prevent memory leaks when the element is removed from the DOM.
 */
export function model(element, pulseValue) {
  const dom = getAdapter();
  const tagName = dom.getTagName(element);
  const type = dom.getInputType(element);

  if (tagName === 'input' && (type === 'checkbox' || type === 'radio')) {
    // Checkbox/Radio
    effect(() => {
      dom.setProperty(element, 'checked', pulseValue.get());
    });
    const handler = () => pulseValue.set(dom.getProperty(element, 'checked'));
    dom.addEventListener(element, 'change', handler);
    onCleanup(() => dom.removeEventListener(element, 'change', handler));
  } else if (tagName === 'select') {
    // Select
    effect(() => {
      dom.setProperty(element, 'value', pulseValue.get());
    });
    const handler = () => pulseValue.set(dom.getProperty(element, 'value'));
    dom.addEventListener(element, 'change', handler);
    onCleanup(() => dom.removeEventListener(element, 'change', handler));
  } else {
    // Text input, textarea, etc.
    effect(() => {
      if (dom.getProperty(element, 'value') !== pulseValue.get()) {
        dom.setProperty(element, 'value', pulseValue.get());
      }
    });
    const handler = () => pulseValue.set(dom.getProperty(element, 'value'));
    dom.addEventListener(element, 'input', handler);
    onCleanup(() => dom.removeEventListener(element, 'input', handler));
  }

  return element;
}

/**
 * Mount an element to a target
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

/**
 * Create a component factory with lifecycle support
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

    const ctx = {
      state,
      methods,
      props,
      pulse,
      el,
      text,
      list,
      when,
      on,
      bind,
      model,
      onMount,
      onUnmount
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

/**
 * Toggle element visibility without removing from DOM
 * Unlike when(), this keeps the element in the DOM but hides it
 */
export function show(condition, element) {
  const dom = getAdapter();
  effect(() => {
    const shouldShow = typeof condition === 'function' ? condition() : condition.get();
    dom.setStyle(element, 'display', shouldShow ? '' : 'none');
  });
  return element;
}

/**
 * Portal - render children into a different DOM location
 */
export function portal(children, target) {
  const dom = getAdapter();
  const { element: resolvedTarget, selector } = resolveSelector(target, 'portal');

  if (!resolvedTarget) {
    log.warn(`Portal target not found: "${selector}"`);
    return dom.createComment('portal-target-not-found');
  }

  const marker = dom.createComment('portal');
  let mountedNodes = [];

  // Handle reactive children
  if (typeof children === 'function') {
    effect(() => {
      // Cleanup previous nodes
      for (const node of mountedNodes) {
        dom.removeNode(node);
        if (node._pulseUnmount) {
          for (const cb of node._pulseUnmount) cb();
        }
      }
      mountedNodes = [];

      const result = children();
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        for (const node of nodes) {
          if (dom.isNode(node)) {
            dom.appendChild(resolvedTarget, node);
            mountedNodes.push(node);
          }
        }
      }
    });
  } else {
    // Static children
    const nodes = Array.isArray(children) ? children : [children];
    for (const node of nodes) {
      if (dom.isNode(node)) {
        dom.appendChild(resolvedTarget, node);
        mountedNodes.push(node);
      }
    }
  }

  // Return marker for position tracking, attach cleanup
  marker._pulseUnmount = [() => {
    for (const node of mountedNodes) {
      dom.removeNode(node);
      if (node._pulseUnmount) {
        for (const cb of node._pulseUnmount) cb();
      }
    }
  }];

  return marker;
}

/**
 * Error boundary - catch errors in child components
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

/**
 * Transition helper - animate element enter/exit
 *
 * MEMORY SAFETY: All timers are tracked and cleared on cleanup
 * to prevent callbacks executing on removed elements.
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
  el,
  text,
  bind,
  prop,
  cls,
  style,
  on,
  list,
  when,
  match,
  model,
  mount,
  component,
  parseSelector,
  // New features
  onMount,
  onUnmount,
  show,
  portal,
  errorBoundary,
  transition,
  whenTransition,
  // Configuration
  configureDom,
  getDomConfig,
  clearSelectorCache,
  // Diagnostics
  getCacheMetrics,
  resetCacheMetrics
};
