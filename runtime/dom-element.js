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
import {
  isHydratingMode,
  getHydrationContext,
  getCurrentNode,
  advanceCursor,
  enterChild,
  exitChild,
  registerListener,
  warnMismatch
} from './ssr-hydrator.js';

const log = loggers.dom;

// =============================================================================
// ELEMENT CREATION
// =============================================================================

// A11y configuration
let a11yConfig = {
  enabled: true,
  autoAria: true,
  warnMissingAlt: true,
  warnMissingLabel: true
};

/**
 * Configure accessibility features
 * @param {object} config - A11y configuration
 */
export function configureA11y(config) {
  a11yConfig = { ...a11yConfig, ...config };
}

/**
 * Apply automatic ARIA attributes based on element type
 * @private
 */
function applyAutoAria(element, tag, attrs, dom) {
  if (!a11yConfig.enabled || !a11yConfig.autoAria) return;

  const hasAttr = (name) => attrs[name] !== undefined || dom.getAttribute?.(element, name);

  switch (tag) {
    case 'dialog':
      // Dialogs should have role and modal indication
      if (!hasAttr('role')) {
        safeSetAttribute(element, 'role', 'dialog', {}, dom);
      }
      if (!hasAttr('aria-modal')) {
        safeSetAttribute(element, 'aria-modal', 'true', {}, dom);
      }
      break;

    case 'nav':
      // Navigation landmarks benefit from labels
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby') && a11yConfig.warnMissingLabel) {
        log.warn('A11y: <nav> element should have aria-label or aria-labelledby for accessibility');
      }
      break;

    case 'main':
    case 'header':
    case 'footer':
    case 'aside':
      // Landmark roles - warn if multiple without labels
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby')) {
        // These are valid as landmarks, just note for multiple instances
      }
      break;

    case 'img':
      // Images must have alt
      if (!hasAttr('alt') && !hasAttr('aria-label') && !hasAttr('aria-hidden') && a11yConfig.warnMissingAlt) {
        log.warn('A11y: <img> element missing alt attribute. Add alt="" for decorative images.');
      }
      break;

    case 'input':
    case 'textarea':
    case 'select':
      // Form controls need labels
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby') && !hasAttr('id') && a11yConfig.warnMissingLabel) {
        const inputType = attrs.type || 'text';
        if (!['hidden', 'submit', 'button', 'reset', 'image'].includes(inputType)) {
          log.warn(`A11y: <${tag}> element should have aria-label, aria-labelledby, or an associated <label>`);
        }
      }
      break;

    case 'button':
      // Buttons are already focusable, ensure type if not specified
      if (!hasAttr('type')) {
        safeSetAttribute(element, 'type', 'button', {}, dom);
      }
      break;

    case 'a':
      // Links without href should have role="button" if interactive
      if (!hasAttr('href') && !hasAttr('role')) {
        safeSetAttribute(element, 'role', 'button', {}, dom);
        if (!hasAttr('tabindex')) {
          safeSetAttribute(element, 'tabindex', '0', {}, dom);
        }
      }
      break;

    case 'ul':
    case 'ol':
      // Lists with role="menu" or "listbox" need special handling
      if (attrs.role === 'menu' || attrs.role === 'listbox') {
        if (!hasAttr('aria-label') && !hasAttr('aria-labelledby')) {
          log.warn(`A11y: <${tag} role="${attrs.role}"> should have aria-label or aria-labelledby`);
        }
      }
      break;

    case 'table':
      // Tables benefit from captions or aria-label
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby')) {
        // Will be checked if no <caption> child is found later
      }
      break;

    case 'progress':
      // Progress should have accessible name
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby')) {
        log.warn('A11y: <progress> element should have aria-label or aria-labelledby');
      }
      break;

    case 'meter':
      // Meter should have accessible name
      if (!hasAttr('aria-label') && !hasAttr('aria-labelledby')) {
        log.warn('A11y: <meter> element should have aria-label or aria-labelledby');
      }
      break;
  }

  // Handle role-specific requirements
  const role = attrs.role;
  if (role) {
    applyRoleRequirements(element, role, attrs, dom);
  }
}

/**
 * Apply ARIA requirements for specific roles
 * @private
 */
function applyRoleRequirements(element, role, attrs, dom) {
  const hasAttr = (name) => attrs[name] !== undefined;

  switch (role) {
    case 'checkbox':
    case 'radio':
    case 'switch':
      if (!hasAttr('aria-checked')) {
        safeSetAttribute(element, 'aria-checked', 'false', {}, dom);
      }
      break;

    case 'slider':
    case 'spinbutton':
    case 'progressbar':
      if (!hasAttr('aria-valuenow')) {
        safeSetAttribute(element, 'aria-valuenow', '0', {}, dom);
      }
      if (!hasAttr('aria-valuemin')) {
        safeSetAttribute(element, 'aria-valuemin', '0', {}, dom);
      }
      if (!hasAttr('aria-valuemax')) {
        safeSetAttribute(element, 'aria-valuemax', '100', {}, dom);
      }
      break;

    case 'combobox':
      if (!hasAttr('aria-expanded')) {
        safeSetAttribute(element, 'aria-expanded', 'false', {}, dom);
      }
      break;

    case 'tablist':
      if (!hasAttr('aria-orientation')) {
        safeSetAttribute(element, 'aria-orientation', 'horizontal', {}, dom);
      }
      break;

    case 'tab':
      if (!hasAttr('aria-selected')) {
        safeSetAttribute(element, 'aria-selected', 'false', {}, dom);
      }
      break;

    case 'button':
    case 'link':
    case 'menuitem':
      // Ensure focusability for interactive roles on non-focusable elements
      if (!hasAttr('tabindex')) {
        safeSetAttribute(element, 'tabindex', '0', {}, dom);
      }
      break;
  }
}

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

  // HYDRATION MODE: Reuse existing DOM element
  if (isHydratingMode()) {
    const ctx = getHydrationContext();
    const existing = getCurrentNode(ctx);

    // Verify element matches
    if (existing && existing.nodeType === 1) {
      const tag = existing.tagName?.toLowerCase();
      if (tag !== config.tag) {
        warnMismatch(ctx, `<${config.tag}>`, existing);
      }

      // Process children to attach event handlers from attributes
      const [attrs, childContent] = separateAttrsAndChildren(children);

      if (attrs) {
        // Attach event handlers to existing element
        for (const [key, value] of Object.entries(attrs)) {
          if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            registerListener(ctx, existing, event, value);
          }
          // Handle reactive attributes
          else if (typeof value === 'function' && !key.startsWith('on')) {
            effect(() => {
              const result = value();
              if (key === 'class' || key === 'className') {
                existing.className = result || '';
              } else if (key === 'style' && typeof result === 'string') {
                existing.style.cssText = result;
              } else if (result != null) {
                existing.setAttribute(key, result);
              } else {
                existing.removeAttribute(key);
              }
            });
          }
        }
      }

      // Enter child scope and process children
      enterChild(ctx, existing);
      for (const child of childContent) {
        hydrateChild(existing, child, ctx);
      }
      exitChild(ctx, existing);

      return existing;
    }

    // No matching element found, warn and fall through to create
    warnMismatch(ctx, `<${config.tag}>`, existing);
  }

  // NORMAL MODE: Create new element
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

  // Apply automatic ARIA attributes based on element type
  applyAutoAria(element, config.tag, config.attrs, dom);

  // Process children
  for (const child of children) {
    appendChild(element, child);
  }

  return element;
}

/**
 * Separate attributes object from children in el() arguments
 * @private
 */
function separateAttrsAndChildren(children) {
  if (children.length === 0) {
    return [null, []];
  }

  const first = children[0];
  if (first && typeof first === 'object' && !Array.isArray(first) &&
      !(first instanceof Node) && !(first.nodeType)) {
    return [first, children.slice(1)];
  }

  return [null, children];
}

/**
 * Hydrate a child element (attach listeners without creating DOM)
 * @private
 */
function hydrateChild(parent, child, ctx) {
  if (child == null || child === false) return;

  if (typeof child === 'string' || typeof child === 'number') {
    // Text content - just advance cursor
    advanceCursor(ctx);
  } else if (typeof child === 'function') {
    // Reactive child - set up effect but skip initial DOM creation
    effect(() => {
      child(); // Execute to track dependencies, but don't modify DOM on first run in hydration
    });
  } else if (Array.isArray(child)) {
    for (const c of child) {
      hydrateChild(parent, c, ctx);
    }
  }
  // Node children are handled by recursive el() calls
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
  text,
  configureA11y
};
