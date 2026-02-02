/**
 * Pulse DOM Conditional Module
 * Conditional rendering primitives (when, match, show)
 *
 * @module dom-conditional
 */

import { effect } from './pulse.js';
import { getAdapter } from './dom-adapter.js';

// =============================================================================
// CONDITIONAL RENDERING
// =============================================================================

/**
 * Conditional rendering - renders content based on condition
 *
 * @param {Function|Pulse} condition - Condition source (reactive)
 * @param {Function|Node} thenTemplate - Template to render when true
 * @param {Function|Node|null} elseTemplate - Template to render when false
 * @returns {DocumentFragment} Container fragment with conditional content
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
 * Switch/case rendering - renders content based on matching value
 *
 * @param {Function|Pulse} getValue - Value source (reactive)
 * @param {Object} cases - Map of value -> template, with optional 'default' key
 * @returns {Comment} Marker node for position tracking
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
 * Toggle element visibility without removing from DOM
 * Unlike when(), this keeps the element in the DOM but hides it
 *
 * @param {Function|Pulse} condition - Condition source (reactive)
 * @param {HTMLElement} element - Element to show/hide
 * @returns {HTMLElement} The element for chaining
 */
export function show(condition, element) {
  const dom = getAdapter();
  effect(() => {
    const shouldShow = typeof condition === 'function' ? condition() : condition.get();
    dom.setStyle(element, 'display', shouldShow ? '' : 'none');
  });
  return element;
}

export default {
  when,
  match,
  show
};
