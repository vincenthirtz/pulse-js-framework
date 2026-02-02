/**
 * Pulse DOM Element Module
 * Core element creation and text node utilities
 *
 * @module dom-element
 */

import { effect } from './pulse.js';
import { loggers } from './logger.js';
import { safeSetAttribute } from './utils.js';
import { getAdapter } from './dom-adapter.js';
import { parseSelector } from './dom-selector.js';

const log = loggers.dom;

// =============================================================================
// ELEMENT CREATION
// =============================================================================

/**
 * Create a DOM element from a CSS selector-like string
 *
 * @param {string} selector - CSS selector-like string (e.g., 'div.container#main')
 * @param {...*} children - Child elements, text, or reactive functions
 * @returns {HTMLElement} Created DOM element
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
 *
 * @private
 * @param {HTMLElement} parent - Parent element
 * @param {*} child - Child to append (string, number, Node, array, or function)
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
 *
 * @param {*|Function} getValue - Text value or function returning text
 * @returns {Text} Text node
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

export default {
  el,
  text
};
