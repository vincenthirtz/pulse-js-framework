/**
 * Pulse DOM Virtual Scrolling
 *
 * Renders only visible items plus an overscan buffer for large lists.
 * Keeps DOM size constant regardless of data size.
 *
 * Related: ADR-0003, element recycling (ADR-0004), event delegation (ADR-0002)
 *
 * @module runtime/dom-virtual-list
 */

import { pulse, effect, computed, batch } from './pulse.js';
import { getAdapter } from './dom-adapter.js';
import { list } from './dom-list.js';
import { delegate } from './dom-event-delegate.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS = {
  overscan: 5,
  containerHeight: 400,
  recycle: false,
  on: null
};

// ============================================================================
// Virtual List
// ============================================================================

/**
 * Create a virtual scrolling list that renders only visible items.
 *
 * @param {Function|Pulse} getItems - Reactive data source returning array
 * @param {Function} template - (item, index) => Node
 * @param {Function} keyFn - (item) => unique key
 * @param {Object} options - Configuration
 * @param {number} options.itemHeight - Fixed row height in pixels (required)
 * @param {number} [options.overscan=5] - Extra items above/below viewport
 * @param {number|string} [options.containerHeight=400] - Viewport height in px or 'auto'
 * @param {boolean} [options.recycle=false] - Enable element recycling for removed items
 * @param {Object} [options.on] - Delegated event handlers: { eventType: (event, item, index) => void }
 * @returns {Element} Scroll container element with scrollToIndex(index) and _dispose() methods
 *
 * @example
 * const vlist = virtualList(
 *   () => items.get(),
 *   (item) => el('li', item.name),
 *   (item) => item.id,
 *   { itemHeight: 40, overscan: 5, containerHeight: 400 }
 * );
 * mount('#app', vlist);
 */
export function virtualList(getItems, template, keyFn, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { itemHeight, overscan, containerHeight, recycle, on: eventHandlers } = config;

  if (!itemHeight || itemHeight <= 0) {
    throw new Error('[Pulse] virtualList requires a positive itemHeight');
  }

  const dom = getAdapter();

  // ---- Reactive state ----
  const scrollTop = pulse(0);

  // ---- DOM structure ----

  // Outer container: fixed height, scrollable
  const container = dom.createElement('div');
  container.scrollTop = 0; // Initialize for mock/SSR compatibility
  dom.setAttribute(container, 'role', 'list');
  dom.setAttribute(container, 'aria-label', 'Virtual scrolling list');
  setStyles(dom, container, {
    'overflow-y': 'auto',
    'position': 'relative'
  });
  if (typeof containerHeight === 'number') {
    dom.setStyle(container, 'height', `${containerHeight}px`);
  }

  // Inner spacer: full height of all items (creates scrollbar)
  const spacer = dom.createElement('div');
  dom.setStyle(spacer, 'position', 'relative');
  dom.appendChild(container, spacer);

  // Viewport: positioned absolutely, holds rendered items
  const viewport = dom.createElement('div');
  setStyles(dom, viewport, {
    'position': 'absolute',
    'left': '0',
    'right': '0',
    'top': '0'
  });
  dom.appendChild(spacer, viewport);

  // ---- Scroll handling (rAF-throttled) ----
  let rafId = null;

  const onScroll = () => {
    if (rafId !== null) return;
    rafId = (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(() => {
      rafId = null;
      const top = container.scrollTop !== undefined ? container.scrollTop : 0;
      scrollTop.set(top);
    });
  };

  dom.addEventListener(container, 'scroll', onScroll, { passive: true });

  // ---- Compute visible items slice ----
  const visibleSlice = pulse([]);
  const currentStartIndex = pulse(0);
  let allItems = [];

  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    allItems = Array.isArray(items) ? items : [];
    const totalItems = allItems.length;
    const top = scrollTop.get();

    // Update spacer height
    dom.setStyle(spacer, 'height', `${totalItems * itemHeight}px`);

    // Calculate visible range
    const height = typeof containerHeight === 'number'
      ? containerHeight
      : (container.clientHeight || 400);

    let startIdx = Math.floor(top / itemHeight) - overscan;
    let endIdx = Math.ceil((top + height) / itemHeight) + overscan;
    startIdx = Math.max(0, startIdx);
    endIdx = Math.min(totalItems, endIdx);

    // Position viewport at start offset
    dom.setStyle(viewport, 'top', `${startIdx * itemHeight}px`);

    // ARIA: announce total count
    dom.setAttribute(container, 'aria-rowcount', String(totalItems));

    batch(() => {
      currentStartIndex.set(startIdx);
      visibleSlice.set(allItems.slice(startIdx, endIdx));
    });
  });

  // ---- Render visible items using list() ----
  const listOptions = {};
  if (recycle) {
    listOptions.recycle = true;
  }

  // Item map for event delegation
  const itemMap = new Map();
  const KEY_ATTR = 'data-pulse-key';

  const rendered = list(
    () => visibleSlice.get(),
    (item, relativeIndex) => {
      const absIndex = currentStartIndex.peek() + relativeIndex;
      const node = template(item, absIndex);
      const root = Array.isArray(node) ? node[0] : node;
      if (root && dom.isElement(root)) {
        dom.setAttribute(root, 'role', 'listitem');
        // ARIA: set 1-based row index for screen readers
        dom.setAttribute(root, 'aria-rowindex', String(absIndex + 1));
        // Mark for event delegation
        if (eventHandlers) {
          const rawKey = keyFn(item, absIndex);
          // Security: ensure key is a primitive to prevent collisions
          const key = (typeof rawKey === 'string' || typeof rawKey === 'number')
            ? String(rawKey)
            : String(absIndex);
          dom.setAttribute(root, KEY_ATTR, key);
          itemMap.set(key, { item, index: absIndex });
        }
      }
      return node;
    },
    keyFn,
    listOptions
  );

  dom.appendChild(viewport, rendered);

  // ---- Event delegation on viewport ----
  const delegateCleanups = [];

  if (eventHandlers && typeof eventHandlers === 'object') {
    // Set up delegation after microtask (viewport needs to be in DOM)
    const setupDelegation = () => {
      for (const [eventType, handler] of Object.entries(eventHandlers)) {
        const cleanup = delegate(viewport, eventType, `[${KEY_ATTR}]`, (event, matchedEl) => {
          const key = dom.getAttribute(matchedEl, KEY_ATTR);
          const entry = itemMap.get(key);
          if (entry) {
            handler(event, entry.item, entry.index);
          }
        });
        delegateCleanups.push(cleanup);
      }
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(setupDelegation);
    } else {
      setupDelegation();
    }
  }

  // ---- Programmatic scroll API ----

  /**
   * Scroll to bring a specific item index into view.
   * @param {number} index - Zero-based item index
   * @param {Object} [scrollOptions] - Options
   * @param {'start'|'center'|'end'} [scrollOptions.align='start'] - Alignment in viewport
   */
  container.scrollToIndex = (index, scrollOptions = {}) => {
    const { align = 'start' } = scrollOptions;
    const totalItems = allItems.length;
    const clampedIndex = Math.max(0, Math.min(index, totalItems - 1));

    const height = typeof containerHeight === 'number'
      ? containerHeight
      : (container.clientHeight || 400);

    let targetTop;
    if (align === 'center') {
      targetTop = clampedIndex * itemHeight - (height / 2) + (itemHeight / 2);
    } else if (align === 'end') {
      targetTop = (clampedIndex + 1) * itemHeight - height;
    } else {
      targetTop = clampedIndex * itemHeight;
    }

    targetTop = Math.max(0, targetTop);

    if (container.scrollTop !== undefined) {
      container.scrollTop = targetTop;
    }
    scrollTop.set(targetTop);
  };

  // ---- Cleanup method ----
  container._dispose = () => {
    dom.removeEventListener(container, 'scroll', onScroll);
    if (rafId !== null) {
      (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout)(rafId);
      rafId = null;
    }
    for (const cleanup of delegateCleanups) cleanup();
    delegateCleanups.length = 0;
    itemMap.clear();
  };

  return container;
}

/**
 * Set multiple styles on an element.
 * @param {DOMAdapter} dom
 * @param {Element} element
 * @param {Object} styles
 * @private
 */
function setStyles(dom, element, styles) {
  for (const [prop, value] of Object.entries(styles)) {
    dom.setStyle(element, prop, value);
  }
}

export default {
  virtualList
};
