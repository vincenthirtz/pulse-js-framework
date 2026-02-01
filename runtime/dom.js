/**
 * Pulse DOM - Declarative DOM manipulation
 *
 * Creates DOM elements using CSS selector-like syntax
 * and provides reactive bindings
 */

import { effect, pulse, batch, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { LRUCache } from './lru-cache.js';

const log = loggers.dom;

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
// Capacity: 500 selectors (chosen based on typical SPA component count)
// - Most apps use 50-200 unique selectors
// - 500 provides headroom for dynamic selectors without excessive memory
//
// Cache hit returns a shallow copy to prevent mutation of cached config
// Metrics tracking enabled for performance monitoring
const selectorCache = new LRUCache(500, { trackMetrics: true });

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
 * Safely insert a node before a reference node
 * Returns false if the parent is detached (no parentNode)
 * @private
 * @param {Node} newNode - Node to insert
 * @param {Node} refNode - Reference node (insert before this)
 * @returns {boolean} True if insertion succeeded
 */
function safeInsertBefore(newNode, refNode) {
  if (!refNode.parentNode) {
    log.warn('Cannot insert node: reference node has no parent (may be detached)');
    return false;
  }
  refNode.parentNode.insertBefore(newNode, refNode);
  return true;
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
    const element = document.querySelector(target);
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
    queueMicrotask(fn);
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
  const config = parseSelector(selector);
  const element = document.createElement(config.tag);

  if (config.id) {
    element.id = config.id;
  }

  if (config.classes.length > 0) {
    element.className = config.classes.join(' ');
  }

  for (const [key, value] of Object.entries(config.attrs)) {
    element.setAttribute(key, value);
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
  if (child == null || child === false) return;

  if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(String(child)));
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else if (Array.isArray(child)) {
    for (const c of child) {
      appendChild(parent, c);
    }
  } else if (typeof child === 'function') {
    // Reactive child - create a placeholder and update it
    const placeholder = document.createComment('pulse');
    parent.appendChild(placeholder);
    let currentNodes = [];

    effect(() => {
      const result = child();

      // Remove old nodes
      for (const node of currentNodes) {
        node.remove();
      }
      currentNodes = [];

      // Add new nodes
      if (result != null && result !== false) {
        const fragment = document.createDocumentFragment();
        if (typeof result === 'string' || typeof result === 'number') {
          const textNode = document.createTextNode(String(result));
          fragment.appendChild(textNode);
          currentNodes.push(textNode);
        } else if (result instanceof Node) {
          fragment.appendChild(result);
          currentNodes.push(result);
        } else if (Array.isArray(result)) {
          for (const r of result) {
            if (r instanceof Node) {
              fragment.appendChild(r);
              currentNodes.push(r);
            } else if (r != null && r !== false) {
              const textNode = document.createTextNode(String(r));
              fragment.appendChild(textNode);
              currentNodes.push(textNode);
            }
          }
        }
        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(fragment, placeholder.nextSibling);
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
  if (typeof getValue === 'function') {
    const node = document.createTextNode('');
    effect(() => {
      node.textContent = String(getValue());
    });
    return node;
  }
  return document.createTextNode(String(getValue));
}

/**
 * Bind an attribute reactively
 */
export function bind(element, attr, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      const value = getValue();
      if (value == null || value === false) {
        element.removeAttribute(attr);
      } else if (value === true) {
        element.setAttribute(attr, '');
      } else {
        element.setAttribute(attr, String(value));
      }
    });
  } else {
    element.setAttribute(attr, String(getValue));
  }
  return element;
}

/**
 * Bind a property reactively
 */
export function prop(element, propName, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      element[propName] = getValue();
    });
  } else {
    element[propName] = getValue;
  }
  return element;
}

/**
 * Bind CSS class reactively
 */
export function cls(element, className, condition) {
  if (typeof condition === 'function') {
    effect(() => {
      if (condition()) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    });
  } else if (condition) {
    element.classList.add(className);
  }
  return element;
}

/**
 * Bind style property reactively
 */
export function style(element, prop, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      element.style[prop] = getValue();
    });
  } else {
    element.style[prop] = getValue;
  }
  return element;
}

/**
 * Attach an event listener
 */
export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options);

  // Auto-cleanup: remove listener when effect is disposed (HMR support)
  onCleanup(() => {
    element.removeEventListener(event, handler, options);
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
  const container = document.createDocumentFragment();
  const startMarker = document.createComment('list-start');
  const endMarker = document.createComment('list-end');

  container.appendChild(startMarker);
  container.appendChild(endMarker);

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
          node.remove();
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
    const parent = startMarker.parentNode;
    if (!parent) {
      // Not yet in DOM, use simple append with DocumentFragment batch
      const fragment = document.createDocumentFragment();
      for (const key of newKeys) {
        const entry = newItemNodes.get(key);
        for (const node of entry.nodes) {
          fragment.appendChild(node);
        }
      }
      container.insertBefore(fragment, endMarker);
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
        const inPosition = prevNode.nextSibling === firstNode;

        if (inPosition && (isStable || isNew)) {
          // Already in correct position, just advance
          prevNode = entry.nodes[entry.nodes.length - 1];
        } else {
          // Collect consecutive items that need to be inserted at this position
          const fragment = document.createDocumentFragment();
          let j = i;

          while (j < newKeys.length) {
            const k = newKeys[j];
            const e = newItemNodes.get(k);
            const f = e.nodes[0];
            const n = !oldKeyIndex.has(k);
            const s = stableKeys.has(k);

            // If this item is already in position after prevNode, stop batching
            if (j > i && prevNode.nextSibling === f) {
              break;
            }

            // Add to batch if it's new or needs to move
            if (n || !s || prevNode.nextSibling !== f) {
              for (const node of e.nodes) {
                fragment.appendChild(node);
              }
              j++;
            } else {
              break;
            }
          }

          // Insert the batch
          if (fragment.childNodes.length > 0) {
            parent.insertBefore(fragment, prevNode.nextSibling);
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
  const container = document.createDocumentFragment();
  const marker = document.createComment('when');
  container.appendChild(marker);

  let currentNodes = [];
  let currentCleanup = null;

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition.get();

    // Cleanup previous
    for (const node of currentNodes) {
      node.remove();
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
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    }
  });

  return container;
}

/**
 * Switch/case rendering
 */
export function match(getValue, cases) {
  const marker = document.createComment('match');
  let currentNodes = [];

  effect(() => {
    const value = typeof getValue === 'function' ? getValue() : getValue.get();

    // Remove old nodes
    for (const node of currentNodes) {
      node.remove();
    }
    currentNodes = [];

    // Find matching case
    const template = cases[value] ?? cases.default;
    if (template) {
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
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
  const tagName = element.tagName.toLowerCase();
  const type = element.type?.toLowerCase();

  if (tagName === 'input' && (type === 'checkbox' || type === 'radio')) {
    // Checkbox/Radio
    effect(() => {
      element.checked = pulseValue.get();
    });
    const handler = () => pulseValue.set(element.checked);
    element.addEventListener('change', handler);
    onCleanup(() => element.removeEventListener('change', handler));
  } else if (tagName === 'select') {
    // Select
    effect(() => {
      element.value = pulseValue.get();
    });
    const handler = () => pulseValue.set(element.value);
    element.addEventListener('change', handler);
    onCleanup(() => element.removeEventListener('change', handler));
  } else {
    // Text input, textarea, etc.
    effect(() => {
      if (element.value !== pulseValue.get()) {
        element.value = pulseValue.get();
      }
    });
    const handler = () => pulseValue.set(element.value);
    element.addEventListener('input', handler);
    onCleanup(() => element.removeEventListener('input', handler));
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
  const { element: resolved, selector } = resolveSelector(target, 'mount');
  if (!resolved) {
    throw new Error(
      `[Pulse] Mount target not found: "${selector}". ` +
      `Ensure the element exists in the DOM before mounting. ` +
      `Tip: Use document.addEventListener('DOMContentLoaded', () => mount(...)) ` +
      `or place your script at the end of <body>.`
    );
  }
  resolved.appendChild(element);
  return () => {
    element.remove();
  };
}

/**
 * Create a component factory with lifecycle support
 */
export function component(setup) {
  return (props = {}) => {
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
      queueMicrotask(() => {
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
    if (result instanceof Node && mountContext.unmountCallbacks.length > 0) {
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
  effect(() => {
    const shouldShow = typeof condition === 'function' ? condition() : condition.get();
    element.style.display = shouldShow ? '' : 'none';
  });
  return element;
}

/**
 * Portal - render children into a different DOM location
 */
export function portal(children, target) {
  const { element: resolvedTarget, selector } = resolveSelector(target, 'portal');

  if (!resolvedTarget) {
    log.warn(`Portal target not found: "${selector}"`);
    return document.createComment('portal-target-not-found');
  }

  const marker = document.createComment('portal');
  let mountedNodes = [];

  // Handle reactive children
  if (typeof children === 'function') {
    effect(() => {
      // Cleanup previous nodes
      for (const node of mountedNodes) {
        node.remove();
        if (node._pulseUnmount) {
          for (const cb of node._pulseUnmount) cb();
        }
      }
      mountedNodes = [];

      const result = children();
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        for (const node of nodes) {
          if (node instanceof Node) {
            resolvedTarget.appendChild(node);
            mountedNodes.push(node);
          }
        }
      }
    });
  } else {
    // Static children
    const nodes = Array.isArray(children) ? children : [children];
    for (const node of nodes) {
      if (node instanceof Node) {
        resolvedTarget.appendChild(node);
        mountedNodes.push(node);
      }
    }
  }

  // Return marker for position tracking, attach cleanup
  marker._pulseUnmount = [() => {
    for (const node of mountedNodes) {
      node.remove();
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
  const container = document.createDocumentFragment();
  const marker = document.createComment('error-boundary');
  container.appendChild(marker);

  const error = pulse(null);
  let currentNodes = [];

  const renderContent = () => {
    // Cleanup previous
    for (const node of currentNodes) {
      node.remove();
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
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    } catch (e) {
      log.error('Error in component:', e);
      error.set(e);
      // Re-render with error
      if (!hasError) {
        queueMicrotask(renderContent);
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
    const timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      fn();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearAllTimers = () => {
    for (const timerId of activeTimers) {
      clearTimeout(timerId);
    }
    activeTimers.clear();
  };

  // Apply enter animation
  const applyEnter = () => {
    element.classList.add(enter);
    if (onEnter) onEnter(element);
    safeTimeout(() => {
      element.classList.remove(enter);
    }, duration);
  };

  // Apply exit animation and return promise
  const applyExit = () => {
    return new Promise(resolve => {
      element.classList.add(exit);
      if (onExit) onExit(element);
      safeTimeout(() => {
        element.classList.remove(exit);
        resolve();
      }, duration);
    });
  };

  // Apply enter on mount
  queueMicrotask(applyEnter);

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
  const container = document.createDocumentFragment();
  const marker = document.createComment('when-transition');
  container.appendChild(marker);

  const { duration = 300, enterClass = 'fade-in', exitClass = 'fade-out' } = options;

  let currentNodes = [];
  let isTransitioning = false;

  // Track active timers for cleanup
  const activeTimers = new Set();

  const safeTimeout = (fn, delay) => {
    const timerId = setTimeout(() => {
      activeTimers.delete(timerId);
      fn();
    }, delay);
    activeTimers.add(timerId);
    return timerId;
  };

  const clearAllTimers = () => {
    for (const timerId of activeTimers) {
      clearTimeout(timerId);
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
        node.classList.add(exitClass);
      }

      safeTimeout(() => {
        for (const node of nodesToRemove) {
          node.remove();
        }
        isTransitioning = false;

        // Render new content
        if (template) {
          const result = typeof template === 'function' ? template() : template;
          if (result) {
            const nodes = Array.isArray(result) ? result : [result];
            const fragment = document.createDocumentFragment();
            for (const node of nodes) {
              if (node instanceof Node) {
                node.classList.add(enterClass);
                fragment.appendChild(node);
                currentNodes.push(node);
                safeTimeout(() => node.classList.remove(enterClass), duration);
              }
            }
            marker.parentNode?.insertBefore(fragment, marker.nextSibling);
          }
        }
      }, duration);
    } else if (template) {
      // No previous content, just render with enter animation
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            node.classList.add(enterClass);
            fragment.appendChild(node);
            currentNodes.push(node);
            safeTimeout(() => node.classList.remove(enterClass), duration);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
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
  // Diagnostics
  getCacheMetrics,
  resetCacheMetrics
};
