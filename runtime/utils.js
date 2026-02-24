/**
 * Pulse Runtime Utilities
 * @module pulse-js-framework/runtime/utils
 *
 * Common utility functions for the Pulse framework runtime.
 */

import { createLogger } from './logger.js';
import { sanitizeHtml, DANGEROUS_KEYS, escapeHtml, sanitizeUrl } from './security.js';

const log = createLogger('Security');

// ============================================================================
// XSS Prevention
// ============================================================================

// escapeHtml and sanitizeUrl are imported from security.js (single source of truth)
// and re-exported below for backward compatibility.
export { escapeHtml, sanitizeUrl };

/**
 * Unescape HTML entities back to their original characters.
 *
 * @param {string} str - HTML-escaped string
 * @returns {string} Unescaped string
 *
 * @example
 * unescapeHtml('&lt;div&gt;')
 * // Returns: '<div>'
 */
export function unescapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Explicitly set innerHTML with optional sanitization.
 * This function is intentionally named to make it obvious that
 * it's potentially dangerous and bypasses XSS protection.
 *
 * SECURITY WARNING: Only use this with trusted, sanitized HTML.
 * Never use with user-provided content without enabling sanitization.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML string to insert
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.sanitize=false] - Enable HTML sanitization
 * @param {Set<string>} [options.allowedTags] - Custom allowed tags (requires sanitize=true)
 * @param {Set<string>} [options.allowedAttrs] - Custom allowed attributes (requires sanitize=true)
 * @param {boolean} [options.allowDataUrls=false] - Allow data: URLs (requires sanitize=true)
 *
 * @example
 * // Trusted HTML (no sanitization)
 * dangerouslySetInnerHTML(container, trustedHtml);
 *
 * // Untrusted HTML (with sanitization)
 * dangerouslySetInnerHTML(container, userHtml, { sanitize: true });
 */
export function dangerouslySetInnerHTML(element, html, options = {}) {
  const { sanitize = false, ...sanitizeOptions } = options;

  if (sanitize) {
    element.innerHTML = sanitizeHtml(html, sanitizeOptions);
  } else {
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production') {
      log.warn(
        'dangerouslySetInnerHTML() called without sanitization. ' +
        'Pass { sanitize: true } to enable HTML sanitization and prevent XSS.'
      );
    }
    element.innerHTML = html;
  }
}

/**
 * Create a text node from a value, safely escaping it.
 * This is the recommended way to insert dynamic text content.
 *
 * Note: DOM textContent is already safe from XSS, but this function
 * provides a consistent API and handles null/undefined values.
 *
 * @param {*} value - Value to convert to text node
 * @returns {Text} Safe text node
 *
 * @example
 * const node = createSafeTextNode(userInput);
 * container.appendChild(node);
 */
export function createSafeTextNode(value) {
  return document.createTextNode(value == null ? '' : String(value));
}

// ============================================================================
// Attribute Handling
// ============================================================================

/**
 * Escape a value for use in an HTML attribute.
 * Escapes quotes and special characters.
 *
 * @param {*} value - Value to escape
 * @returns {string} Escaped string safe for attribute values
 *
 * @example
 * const safe = escapeAttribute(userInput);
 * element.setAttribute('data-value', safe);
 */
export function escapeAttribute(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Pattern to detect event handler attributes (onclick, onerror, etc.)
 * Matches any attribute starting with "on" followed by lowercase letters
 * @private
 */
const EVENT_HANDLER_PATTERN = /^on[a-z]+$/i;

/**
 * Attributes that accept URLs and need sanitization
 * @private
 */
const URL_ATTRIBUTES = new Set([
  'href', 'src', 'action', 'formaction', 'data', 'poster',
  'cite', 'codebase', 'background', 'profile', 'usemap', 'longdesc',
  'dynsrc', 'lowsrc', 'srcset', 'imagesrcset'
]);

/**
 * Attributes that can contain raw HTML/JS content
 * @private
 */
const HTML_CONTENT_ATTRIBUTES = new Set(['srcdoc']);

/**
 * Safely set an attribute on an element.
 * Validates the attribute name, blocks dangerous attributes, and sanitizes URLs.
 *
 * Security protections:
 * - Blocks ALL event handler attributes (onclick, onerror, onmouseover, etc.)
 * - Sanitizes URL attributes (href, src, action, etc.) to prevent javascript: XSS
 * - Blocks HTML injection attributes (srcdoc)
 *
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @param {*} value - Attribute value
 * @param {Object} [options] - Options
 * @param {boolean} [options.allowEventHandlers=false] - Allow event handlers (dangerous!)
 * @param {boolean} [options.allowDataUrls=false] - Allow data: URLs
 * @param {boolean} [options.allowUnsafeHtml=false] - Allow srcdoc attribute (dangerous!)
 * @param {Object} [domAdapter] - Optional DOM adapter (uses element.setAttribute if not provided)
 * @returns {boolean} True if attribute was set successfully
 *
 * @example
 * safeSetAttribute(element, 'data-id', userId);
 * safeSetAttribute(element, 'href', userUrl); // Sanitizes URL automatically
 */
export function safeSetAttribute(element, name, value, options = {}, domAdapter = null) {
  const {
    allowEventHandlers = false,
    allowDataUrls = false,
    allowUnsafeHtml = false
  } = options;

  // Validate attribute name (prevent injection attacks)
  if (!/^[a-zA-Z][a-zA-Z0-9\-_:.]*$/.test(name)) {
    log.warn(`Invalid attribute name blocked: ${name}`);
    return false;
  }

  const lowerName = name.toLowerCase();

  // Block ALL event handler attributes (onclick, onerror, onmouseover, etc.)
  if (!allowEventHandlers && EVENT_HANDLER_PATTERN.test(lowerName)) {
    log.warn(
      `Event handler attribute blocked: ${name}. ` +
      `Use on(element, '${lowerName.slice(2)}', handler) instead.`
    );
    return false;
  }

  // Block HTML content attributes that could inject scripts
  if (!allowUnsafeHtml && HTML_CONTENT_ATTRIBUTES.has(lowerName)) {
    log.warn(
      `HTML content attribute blocked: ${name}. ` +
      `This attribute can execute arbitrary JavaScript.`
    );
    return false;
  }

  // Sanitize URL attributes to prevent javascript: XSS
  if (URL_ATTRIBUTES.has(lowerName) && value != null && value !== '') {
    const sanitized = sanitizeUrl(String(value), { allowData: allowDataUrls });
    if (sanitized === null) {
      log.warn(
        `Dangerous URL blocked for ${name}: "${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`
      );
      return false;
    }
    value = sanitized;
  }

  // Use adapter if provided, otherwise direct call
  const attrValue = value == null ? '' : String(value);
  if (domAdapter) {
    domAdapter.setAttribute(element, name, attrValue);
  } else {
    element.setAttribute(name, attrValue);
  }
  return true;
}

// sanitizeUrl is imported from security.js and re-exported at the top of this file.

// ============================================================================
// CSS Sanitization
// ============================================================================

/**
 * Pattern to validate CSS property names (camelCase or kebab-case)
 * @private
 */
const CSS_PROPERTY_PATTERN = /^-?[a-zA-Z][a-zA-Z0-9-]*$/;

/**
 * Dangerous patterns in CSS values that could be used for injection
 * @private
 */
const CSS_DANGEROUS_PATTERNS = [
  /url\s*\(/i,           // url() can make external requests
  /expression\s*\(/i,    // IE expression() executes JS
  /@import/i,            // @import can load external stylesheets
  /<\/style/i,           // Attempt to break out of style context
  /javascript:/i,        // javascript: in url()
  /behavior\s*:/i,       // IE behavior property
  /-moz-binding/i,       // Firefox XBL binding (deprecated but dangerous)
];

/**
 * Validate a CSS property name.
 *
 * @param {string} prop - CSS property name (camelCase or kebab-case)
 * @returns {boolean} True if valid property name
 *
 * @example
 * isValidCSSProperty('backgroundColor') // true
 * isValidCSSProperty('font-size')       // true
 * isValidCSSProperty('123invalid')      // false
 */
export function isValidCSSProperty(prop) {
  if (typeof prop !== 'string' || prop === '') return false;
  return CSS_PROPERTY_PATTERN.test(prop);
}

/**
 * Sanitize a CSS value to prevent injection attacks.
 *
 * Security protections:
 * - Blocks url() which can make external requests (data exfiltration)
 * - Blocks expression() (IE JavaScript execution)
 * - Blocks @import (external stylesheet loading)
 * - Blocks attempts to break out of style context
 * - Removes semicolons to prevent property injection
 *
 * @param {*} value - CSS value to sanitize
 * @param {Object} [options] - Options
 * @param {boolean} [options.allowUrl=false] - Allow url() values
 * @param {boolean} [options.allowMultiple=false] - Allow semicolons (multiple properties)
 * @returns {{safe: boolean, value: string, blocked?: string}} Sanitization result
 *
 * @example
 * sanitizeCSSValue('red')                    // { safe: true, value: 'red' }
 * sanitizeCSSValue('red; margin: 999px')     // { safe: false, value: 'red', blocked: 'semicolon' }
 * sanitizeCSSValue('url(http://evil.com)')   // { safe: false, value: '', blocked: 'url()' }
 */
export function sanitizeCSSValue(value, options = {}) {
  const { allowUrl = false, allowMultiple = false } = options;

  if (value == null) {
    return { safe: true, value: '' };
  }

  let strValue = String(value);

  // Check for dangerous patterns
  for (const pattern of CSS_DANGEROUS_PATTERNS) {
    if (pattern.test(strValue)) {
      // url() can be allowed with option
      if (pattern.source.includes('url') && allowUrl) {
        continue;
      }
      const patternName = pattern.source.replace(/\\s\*|\\|\/i|\(|\)/g, '');
      return { safe: false, value: '', blocked: patternName };
    }
  }

  // Check for semicolons (property injection)
  if (!allowMultiple && strValue.includes(';')) {
    // Remove everything after the semicolon
    const sanitized = strValue.split(';')[0].trim();
    return { safe: false, value: sanitized, blocked: 'semicolon' };
  }

  // Check for curly braces (rule injection)
  if (strValue.includes('{') || strValue.includes('}')) {
    return { safe: false, value: '', blocked: 'braces' };
  }

  return { safe: true, value: strValue };
}

/**
 * Safely set a CSS style property on an element.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} prop - CSS property name
 * @param {*} value - CSS value
 * @param {Object} [options] - Options passed to sanitizeCSSValue
 * @param {Object} [domAdapter] - Optional DOM adapter (uses element.style if not provided)
 * @returns {boolean} True if style was set successfully
 *
 * @example
 * safeSetStyle(element, 'color', 'red');           // true
 * safeSetStyle(element, 'color', 'red; margin: 0'); // false (blocked)
 */
export function safeSetStyle(element, prop, value, options = {}, domAdapter = null) {
  // Validate property name
  if (!isValidCSSProperty(prop)) {
    log.warn(`Invalid CSS property name: ${prop}`);
    return false;
  }

  // Sanitize value
  const result = sanitizeCSSValue(value, options);

  // Helper to set style
  const setStyle = (p, v) => {
    if (domAdapter) {
      domAdapter.setStyle(element, p, v);
    } else {
      element.style[p] = v;
    }
  };

  if (!result.safe) {
    log.warn(
      `CSS injection blocked for ${prop}: ${result.blocked}. ` +
      `Original value: "${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`
    );
    // Still set the sanitized portion if available
    if (result.value) {
      setStyle(prop, result.value);
    }
    return false;
  }

  setStyle(prop, result.value);
  return true;
}

// ============================================================================
// Deep Clone
// ============================================================================

/**
 * Deep clone an object or array.
 * Handles nested objects, arrays, dates, and primitive values.
 *
 * @template T
 * @param {T} obj - Object to clone
 * @returns {T} Deep clone of the object
 *
 * @example
 * const clone = deepClone(originalObject);
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !DANGEROUS_KEYS.has(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}

// ============================================================================
// Debounce / Throttle
// ============================================================================

/**
 * Create a debounced version of a function.
 * The function will only be called after the specified delay
 * has passed without any new calls.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  const debounced = function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Create a throttled version of a function.
 * The function will be called at most once per specified interval.
 *
 * @param {Function} fn - Function to throttle
 * @param {number} interval - Minimum interval between calls in milliseconds
 * @returns {Function} Throttled function
 *
 * @example
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(fn, interval) {
  let lastCall = 0;
  let timeoutId = null;

  const throttled = function(...args) {
    const now = Date.now();
    const remaining = interval - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}

// ============================================================================
// Window Event Helpers
// ============================================================================

/**
 * Check if running in a browser environment with window object
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Add a window event listener with automatic cleanup via onCleanup.
 * Safe to call in SSR - does nothing if window is not available.
 *
 * @param {string} event - Event name ('focus', 'online', 'offline', etc.)
 * @param {Function} handler - Event handler function
 * @param {Function} onCleanup - Cleanup registration function from pulse.js
 * @param {Object} [options] - addEventListener options
 * @returns {Function|null} Cleanup function, or null if not in browser
 *
 * @example
 * // In an effect or hook
 * import { onCleanup } from './pulse.js';
 * import { onWindowEvent } from './utils.js';
 *
 * effect(() => {
 *   onWindowEvent('focus', () => refetch(), onCleanup);
 *   onWindowEvent('online', () => reconnect(), onCleanup);
 * });
 */
export function onWindowEvent(event, handler, onCleanup, options) {
  if (!isBrowser()) return null;

  window.addEventListener(event, handler, options);
  const cleanup = () => window.removeEventListener(event, handler, options);

  if (typeof onCleanup === 'function') {
    onCleanup(cleanup);
  }

  return cleanup;
}

/**
 * Add focus event listener for refetch-on-focus patterns.
 * Common pattern in data fetching hooks.
 *
 * @param {Function} handler - Handler to call on window focus
 * @param {Function} onCleanup - Cleanup registration function
 * @returns {Function|null} Cleanup function
 */
export function onWindowFocus(handler, onCleanup) {
  return onWindowEvent('focus', handler, onCleanup);
}

/**
 * Add online event listener for refetch-on-reconnect patterns.
 * Common pattern in data fetching hooks.
 *
 * @param {Function} handler - Handler to call when going online
 * @param {Function} onCleanup - Cleanup registration function
 * @returns {Function|null} Cleanup function
 */
export function onWindowOnline(handler, onCleanup) {
  return onWindowEvent('online', handler, onCleanup);
}

/**
 * Add offline event listener.
 *
 * @param {Function} handler - Handler to call when going offline
 * @param {Function} onCleanup - Cleanup registration function
 * @returns {Function|null} Cleanup function
 */
export function onWindowOffline(handler, onCleanup) {
  return onWindowEvent('offline', handler, onCleanup);
}

/**
 * Setup both online and offline listeners at once.
 * Useful for connection-aware features.
 *
 * @param {Object} handlers - Event handlers
 * @param {Function} [handlers.onOnline] - Called when going online
 * @param {Function} [handlers.onOffline] - Called when going offline
 * @param {Function} onCleanup - Cleanup registration function
 * @returns {Function|null} Combined cleanup function
 */
export function onNetworkChange(handlers, onCleanup) {
  if (!isBrowser()) return null;

  const cleanups = [];

  if (handlers.onOnline) {
    cleanups.push(onWindowEvent('online', handlers.onOnline, null));
  }
  if (handlers.onOffline) {
    cleanups.push(onWindowEvent('offline', handlers.onOffline, null));
  }

  const cleanup = () => cleanups.forEach(fn => fn?.());

  if (typeof onCleanup === 'function') {
    onCleanup(cleanup);
  }

  return cleanup;
}

export default {
  // XSS Prevention
  escapeHtml,
  unescapeHtml,
  dangerouslySetInnerHTML,
  createSafeTextNode,
  escapeAttribute,
  safeSetAttribute,
  sanitizeUrl,
  // CSS Sanitization
  isValidCSSProperty,
  sanitizeCSSValue,
  safeSetStyle,
  // Utilities
  deepClone,
  debounce,
  throttle,
  // Window Event Helpers
  isBrowser,
  onWindowEvent,
  onWindowFocus,
  onWindowOnline,
  onWindowOffline,
  onNetworkChange
};
