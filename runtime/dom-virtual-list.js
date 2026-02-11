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

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS = {
  overscan: 5,
  containerHeight: 400,
  recycle: false
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
 * @returns {Element} Scroll container element
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
  const { itemHeight, overscan, containerHeight, recycle } = config;

  if (!itemHeight || itemHeight <= 0) {
    throw new Error('[Pulse] virtualList requires a positive itemHeight');
  }

  const dom = getAdapter();

  // ---- Reactive state ----
  const scrollTop = pulse(0);

  // ---- DOM structure ----

  // Outer container: fixed height, scrollable
  const container = dom.createElement('div');
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

  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    const totalItems = Array.isArray(items) ? items.length : 0;
    const top = scrollTop.get();

    // Update spacer height
    dom.setStyle(spacer, 'height', `${totalItems * itemHeight}px`);

    // Calculate visible range
    const height = typeof containerHeight === 'number'
      ? containerHeight
      : (container.clientHeight || 400);

    let startIndex = Math.floor(top / itemHeight) - overscan;
    let endIndex = Math.ceil((top + height) / itemHeight) + overscan;
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(totalItems, endIndex);

    // Position viewport at start offset
    dom.setStyle(viewport, 'top', `${startIndex * itemHeight}px`);

    // ARIA: announce total count
    dom.setAttribute(container, 'aria-rowcount', String(totalItems));

    // Extract visible slice
    const slice = Array.isArray(items) ? items.slice(startIndex, endIndex) : [];
    visibleSlice.set(slice);
  });

  // ---- Render visible items using list() ----
  const listOptions = {};
  if (recycle) {
    listOptions.recycle = true;
  }

  const rendered = list(
    () => visibleSlice.get(),
    (item, relativeIndex) => {
      const node = template(item, relativeIndex);
      // Set ARIA rowindex for accessibility
      const root = Array.isArray(node) ? node[0] : node;
      if (root && dom.isElement(root)) {
        dom.setAttribute(root, 'role', 'listitem');
      }
      return node;
    },
    keyFn,
    listOptions
  );

  dom.appendChild(viewport, rendered);

  // ---- Cleanup method ----
  container._dispose = () => {
    dom.removeEventListener(container, 'scroll', onScroll);
    if (rafId !== null) {
      (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout)(rafId);
      rafId = null;
    }
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
