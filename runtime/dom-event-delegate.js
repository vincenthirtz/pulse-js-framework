/**
 * Pulse DOM Event Delegation
 *
 * Provides event delegation for list rendering, placing a single listener
 * on the parent element instead of individual listeners on each item.
 *
 * Related: ADR-0002, list() in dom-list.js
 *
 * @module runtime/dom-event-delegate
 */

import { getAdapter } from './dom-adapter.js';
import { list } from './dom-list.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Events that do not bubble and require capture mode for delegation.
 * @type {Set<string>}
 */
const NON_BUBBLING = new Set([
  'focus', 'blur', 'scroll',
  'mouseenter', 'mouseleave',
  'pointerenter', 'pointerleave',
  'load', 'unload', 'error'
]);

/**
 * Data attribute used to mark list items with their key.
 * @type {string}
 */
const KEY_ATTR = 'data-pulse-key';

// ============================================================================
// Low-level Delegation
// ============================================================================

/**
 * Attach a delegated event listener to a parent element.
 * Events from descendants matching the selector bubble up to the parent.
 *
 * @param {Element} parent - Container element to listen on
 * @param {string} eventType - Event type (e.g., 'click', 'input')
 * @param {string} selector - CSS selector to match against (uses closest())
 * @param {Function} handler - (event, matchedElement) => void
 * @returns {Function} Cleanup function to remove the listener
 *
 * @example
 * const cleanup = delegate(listContainer, 'click', '[data-key]', (event, el) => {
 *   console.log('Clicked:', el.dataset.key);
 * });
 * // Later: cleanup();
 */
export function delegate(parent, eventType, selector, handler) {
  const dom = getAdapter();
  const useCapture = NON_BUBBLING.has(eventType);

  const listener = (event) => {
    let target = event.target;

    // Walk up from target to parent, looking for a match
    while (target && target !== parent) {
      if (matchesSelector(target, selector, dom)) {
        handler(event, target);
        return;
      }
      target = dom.getParentNode(target);
    }
  };

  dom.addEventListener(parent, eventType, listener, useCapture);

  return () => {
    dom.removeEventListener(parent, eventType, listener, useCapture);
  };
}

/**
 * Check if an element matches a CSS selector.
 * Uses closest() for real elements, falls back to attribute check for mocks.
 *
 * @param {Element} element - Element to test
 * @param {string} selector - CSS selector
 * @param {DOMAdapter} dom - DOM adapter
 * @returns {boolean} Whether element matches
 * @private
 */
function matchesSelector(element, selector, dom) {
  // Use native matches if available
  if (typeof element.matches === 'function') {
    return element.matches(selector);
  }

  // Fallback for MockDOMAdapter: simple attribute selector matching
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const inner = selector.slice(1, -1);
    const eqIdx = inner.indexOf('=');
    if (eqIdx === -1) {
      return dom.getAttribute(element, inner) !== null;
    }
    const attrName = inner.slice(0, eqIdx);
    const attrValue = inner.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
    return dom.getAttribute(element, attrName) === attrValue;
  }

  return false;
}

// ============================================================================
// Delegated List
// ============================================================================

/**
 * Create a reactive list with delegated event handlers.
 * Instead of attaching listeners to each item, a single delegated listener
 * is placed on the parent container for each event type.
 *
 * @param {Function|Pulse} getItems - Items source (reactive)
 * @param {Function} template - (item, index) => Node | Node[]
 * @param {Function} keyFn - (item, index) => key
 * @param {Object} [options] - Configuration
 * @param {Object} [options.on] - Event handlers: { eventType: (event, item, index) => void }
 * @param {boolean} [options.recycle] - Enable element recycling
 * @returns {DocumentFragment} Reactive list fragment
 *
 * @example
 * const fragment = delegatedList(
 *   () => items.get(),
 *   (item, index) => el('li', item.name),
 *   (item) => item.id,
 *   {
 *     on: {
 *       click: (event, item, index) => selectItem(item),
 *       dblclick: (event, item, index) => editItem(item)
 *     }
 *   }
 * );
 */
export function delegatedList(getItems, template, keyFn, options = {}) {
  const { on: handlers = {}, ...listOptions } = options;
  const dom = getAdapter();

  // Internal map: key -> { item, index }
  const itemMap = new Map();

  // Wrap template to add data-pulse-key attribute
  const wrappedTemplate = (item, index) => {
    const key = keyFn(item, index);
    const node = template(item, index);
    const root = Array.isArray(node) ? node[0] : node;

    if (root && dom.isElement(root)) {
      dom.setAttribute(root, KEY_ATTR, String(key));
    }

    itemMap.set(String(key), { item, index });
    return node;
  };

  // Create list with wrapped template
  const fragment = list(getItems, wrappedTemplate, keyFn, listOptions);

  // Set up delegation on the fragment's parent when it's mounted
  const cleanups = [];
  let delegationSetUp = false;

  /**
   * Set up delegation on a parent element.
   * Called lazily when the fragment is attached to the DOM.
   * @param {Element} parent - Parent element
   * @private
   */
  function setupDelegation(parent) {
    if (delegationSetUp) return;
    delegationSetUp = true;

    for (const [eventType, handler] of Object.entries(handlers)) {
      const cleanup = delegate(parent, eventType, `[${KEY_ATTR}]`, (event, matchedEl) => {
        const key = dom.getAttribute(matchedEl, KEY_ATTR);
        const entry = itemMap.get(key);
        if (entry) {
          handler(event, entry.item, entry.index);
        }
      });
      cleanups.push(cleanup);
    }
  }

  // Observe when fragment gets a parent by using a MutationObserver-like approach.
  // Since fragments move to a parent on insertion, we check after microtask.
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      // Find the parent by looking at the fragment's first child's parent
      const firstChild = dom.getFirstChild(fragment);
      if (firstChild) {
        const parent = dom.getParentNode(firstChild);
        if (parent) {
          setupDelegation(parent);
        }
      }
    });
  }

  // Attach setup helper for manual use
  fragment._setupDelegation = setupDelegation;
  fragment._cleanupDelegation = () => {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    delegationSetUp = false;
  };

  return fragment;
}

export default {
  delegate,
  delegatedList
};
