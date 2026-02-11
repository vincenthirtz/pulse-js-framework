/**
 * Pulse DOM List Module
 * Reactive list rendering with efficient keyed diffing using LIS algorithm
 *
 * @module dom-list
 */

import { effect } from './pulse.js';
import { getAdapter } from './dom-adapter.js';
import { getPool } from './dom-recycle.js';

// =============================================================================
// LIS ALGORITHM
// =============================================================================

/**
 * Compute Longest Increasing Subsequence indices
 * Used to minimize DOM moves during list reconciliation
 *
 * @private
 * @param {number[]} arr - Array of indices
 * @returns {number[]} Indices of elements in the LIS
 */
export function computeLIS(arr) {
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

// =============================================================================
// LIST RENDERING
// =============================================================================

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
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.recycle=false] - Enable element recycling via pool
 * @returns {DocumentFragment} Container fragment with reactive list
 */
export function list(getItems, template, keyFn = (item, i) => i, options = {}) {
  const dom = getAdapter();
  const pool = options.recycle ? getPool() : null;
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
    // When recycling is enabled, try to acquire root elements from the pool
    // before falling back to createElement
    if (newItems.length > 0) {
      for (const { key, item, index } of newItems) {
        const result = template(item, index);
        const nodes = Array.isArray(result) ? result : [result];

        // Pool acquire: if the root node is an element and pool has a matching
        // tag, transfer children/attributes from template result to recycled element
        if (pool && nodes.length === 1 && dom.isElement(nodes[0])) {
          const original = nodes[0];
          const tagName = (original.tagName || original.nodeName || '').toLowerCase();
          if (tagName) {
            const recycled = pool.acquire(tagName);
            // Only use recycled element if it came from the pool (not freshly created)
            // Pool.acquire creates new if empty, so always returns a valid element
            if (recycled !== original) {
              // Transfer attributes (skip event handler attributes for security)
              if (original.attributes) {
                const attrs = original.attributes;
                for (let a = 0; a < attrs.length; a++) {
                  const attrName = attrs[a].name;
                  // Security: skip inline event handlers (onclick, onerror, etc.)
                  if (attrName.length > 2 && attrName.charCodeAt(0) === 111 &&
                      attrName.charCodeAt(1) === 110 && attrName.charCodeAt(2) > 96) {
                    continue;
                  }
                  dom.setAttribute(recycled, attrName, attrs[a].value);
                }
              }
              // Transfer children
              let child = dom.getFirstChild(original);
              while (child) {
                const next = dom.getNextSibling(child);
                dom.appendChild(recycled, child);
                child = next;
              }
              // Transfer event listeners if tracked
              if (original._eventListeners) {
                recycled._eventListeners = original._eventListeners;
              }
              // Transfer inline styles
              if (original.style && original.style.cssText) {
                recycled.style.cssText = original.style.cssText;
              }
              // Transfer className
              if (original.className) {
                recycled.className = original.className;
              }
              nodes[0] = recycled;
            }
          }
        }

        newItemNodes.set(key, { nodes, cleanup: null, item });
      }
    }

    // Phase 3: Remove items that are no longer present
    for (const [key, entry] of itemNodes) {
      if (!newItemNodes.has(key)) {
        for (const node of entry.nodes) {
          // Release to recycling pool before removing (if enabled)
          if (pool && dom.isElement(node)) {
            pool.release(node);
          }
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

export default {
  list,
  computeLIS
};
