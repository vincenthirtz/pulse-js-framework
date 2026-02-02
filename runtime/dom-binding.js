/**
 * Pulse DOM Binding Module
 * Reactive attribute, property, class, style, and event bindings
 *
 * @module dom-binding
 */

import { effect, onCleanup } from './pulse.js';
import { sanitizeUrl, safeSetStyle } from './utils.js';
import { getAdapter } from './dom-adapter.js';

// =============================================================================
// URL ATTRIBUTES (XSS Protection)
// =============================================================================

/**
 * URL attributes that need sanitization in bind()
 * @private
 */
const BIND_URL_ATTRIBUTES = new Set([
  'href', 'src', 'action', 'formaction', 'data', 'poster',
  'cite', 'codebase', 'background', 'profile', 'usemap', 'longdesc'
]);

// =============================================================================
// REACTIVE BINDINGS
// =============================================================================

/**
 * Bind an attribute reactively with XSS protection
 *
 * Security: URL attributes (href, src, etc.) are sanitized to prevent javascript: XSS
 *
 * @param {HTMLElement} element - Target element
 * @param {string} attr - Attribute name
 * @param {*|Function} getValue - Value or function returning value
 * @returns {HTMLElement} The element for chaining
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
 *
 * @param {HTMLElement} element - Target element
 * @param {string} propName - Property name
 * @param {*|Function} getValue - Value or function returning value
 * @returns {HTMLElement} The element for chaining
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
 *
 * @param {HTMLElement} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean|Function} condition - Condition or function returning condition
 * @returns {HTMLElement} The element for chaining
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
 * Attach an event listener with automatic cleanup
 *
 * @param {HTMLElement} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - addEventListener options
 * @returns {HTMLElement} The element for chaining
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
 * Two-way binding for form inputs
 *
 * MEMORY SAFETY: All event listeners are registered with onCleanup()
 * to prevent memory leaks when the element is removed from the DOM.
 *
 * @param {HTMLElement} element - Form element (input, select, textarea)
 * @param {Pulse} pulseValue - Pulse signal for two-way binding
 * @returns {HTMLElement} The element for chaining
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

export default {
  bind,
  prop,
  cls,
  style,
  on,
  model
};
