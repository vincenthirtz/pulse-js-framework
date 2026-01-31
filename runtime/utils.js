/**
 * Pulse Runtime Utilities
 * @module pulse-js-framework/runtime/utils
 *
 * Common utility functions for the Pulse framework runtime.
 */

// ============================================================================
// XSS Prevention
// ============================================================================

/**
 * HTML entity escape map
 * @private
 */
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Regex for HTML special characters
 * @private
 */
const HTML_ESCAPE_REGEX = /[&<>"']/g;

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this when inserting untrusted content into HTML.
 *
 * @param {*} str - Value to escape (will be converted to string)
 * @returns {string} Escaped string safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * @example
 * // Safe to insert into HTML
 * element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(HTML_ESCAPE_REGEX, char => HTML_ESCAPES[char]);
}

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
 * Explicitly set innerHTML with a warning.
 * This function is intentionally named to make it obvious that
 * it's potentially dangerous and bypasses XSS protection.
 *
 * SECURITY WARNING: Only use this with trusted, sanitized HTML.
 * Never use with user-provided content without proper sanitization.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML string to insert
 *
 * @example
 * // Only use with trusted HTML!
 * dangerouslySetInnerHTML(container, sanitizedHtml);
 */
export function dangerouslySetInnerHTML(element, html) {
  element.innerHTML = html;
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
 * Safely set an attribute on an element.
 * Validates attribute names to prevent attribute injection.
 *
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @param {*} value - Attribute value
 * @returns {boolean} True if attribute was set
 *
 * @example
 * safeSetAttribute(element, 'data-id', userId);
 */
export function safeSetAttribute(element, name, value) {
  // Validate attribute name (prevent injection attacks)
  if (!/^[a-zA-Z][a-zA-Z0-9\-_:.]*$/.test(name)) {
    console.warn(`Invalid attribute name: ${name}`);
    return false;
  }

  // Prevent dangerous attributes
  const dangerousAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'];
  if (dangerousAttrs.includes(name.toLowerCase())) {
    console.warn(`Potentially dangerous attribute blocked: ${name}`);
    return false;
  }

  element.setAttribute(name, value == null ? '' : String(value));
  return true;
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and sanitize a URL to prevent javascript: and data: XSS.
 *
 * @param {string} url - URL to validate
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.allowData=false] - Allow data: URLs
 * @param {boolean} [options.allowRelative=true] - Allow relative URLs
 * @returns {string|null} Sanitized URL or null if invalid
 *
 * @example
 * const safeUrl = sanitizeUrl(userProvidedUrl);
 * if (safeUrl) {
 *   link.href = safeUrl;
 * }
 */
export function sanitizeUrl(url, options = {}) {
  const { allowData = false, allowRelative = true } = options;

  if (url == null || url === '') return null;

  const trimmed = String(url).trim();

  // Check for javascript: protocol (case insensitive, handles encoding)
  const lowerUrl = trimmed.toLowerCase().replace(/\s/g, '');
  if (lowerUrl.startsWith('javascript:')) {
    return null;
  }

  // Check for data: protocol unless explicitly allowed
  if (!allowData && lowerUrl.startsWith('data:')) {
    return null;
  }

  // Allow relative URLs
  if (allowRelative && (trimmed.startsWith('/') || trimmed.startsWith('.') || !trimmed.includes(':'))) {
    return trimmed;
  }

  // Only allow http: and https: protocols
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
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
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
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

export default {
  // XSS Prevention
  escapeHtml,
  unescapeHtml,
  dangerouslySetInnerHTML,
  createSafeTextNode,
  escapeAttribute,
  safeSetAttribute,
  sanitizeUrl,
  // Utilities
  deepClone,
  debounce,
  throttle
};
