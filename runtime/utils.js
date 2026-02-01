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
 * Regex for HTML special characters (auto-generated from HTML_ESCAPES keys)
 * @private
 */
const HTML_ESCAPE_REGEX = new RegExp(`[${Object.keys(HTML_ESCAPES).join('')}]`, 'g');

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
    console.warn(`[Pulse Security] Invalid attribute name blocked: ${name}`);
    return false;
  }

  const lowerName = name.toLowerCase();

  // Block ALL event handler attributes (onclick, onerror, onmouseover, etc.)
  if (!allowEventHandlers && EVENT_HANDLER_PATTERN.test(lowerName)) {
    console.warn(
      `[Pulse Security] Event handler attribute blocked: ${name}. ` +
      `Use on(element, '${lowerName.slice(2)}', handler) instead.`
    );
    return false;
  }

  // Block HTML content attributes that could inject scripts
  if (!allowUnsafeHtml && HTML_CONTENT_ATTRIBUTES.has(lowerName)) {
    console.warn(
      `[Pulse Security] HTML content attribute blocked: ${name}. ` +
      `This attribute can execute arbitrary JavaScript.`
    );
    return false;
  }

  // Sanitize URL attributes to prevent javascript: XSS
  if (URL_ATTRIBUTES.has(lowerName) && value != null && value !== '') {
    const sanitized = sanitizeUrl(String(value), { allowData: allowDataUrls });
    if (sanitized === null) {
      console.warn(
        `[Pulse Security] Dangerous URL blocked for ${name}: "${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`
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

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and sanitize a URL to prevent javascript: and data: XSS.
 *
 * Security protections:
 * - Blocks javascript: URLs (including encoded variants)
 * - Blocks data: URLs by default (can be enabled)
 * - Blocks blob: URLs by default (can be enabled)
 * - Blocks vbscript: URLs
 * - Decodes URL before checking to prevent encoding bypass
 *
 * @param {string} url - URL to validate
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.allowData=false] - Allow data: URLs
 * @param {boolean} [options.allowBlob=false] - Allow blob: URLs
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
  const { allowData = false, allowBlob = false, allowRelative = true } = options;

  if (url == null || url === '') return null;

  const trimmed = String(url).trim();

  // Decode URL to catch encoded attacks like &#x6a;avascript:
  // Also handles %6A%61%76%61%73%63%72%69%70%74 encoding
  let decoded = trimmed;
  try {
    // Decode HTML entities first (&#x6a; -> j)
    decoded = decoded.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    decoded = decoded.replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    // Then decode URI encoding (%6A -> j)
    decoded = decodeURIComponent(decoded);
  } catch {
    // If decoding fails, use original (malformed URLs will be blocked anyway)
  }

  // Normalize: lowercase and remove whitespace for protocol check
  const normalized = decoded.toLowerCase().replace(/[\s\x00-\x1f]/g, '');

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (normalized.startsWith(protocol)) {
      return null;
    }
  }

  // Check for data: protocol
  if (normalized.startsWith('data:')) {
    return allowData ? trimmed : null;
  }

  // Check for blob: protocol
  if (normalized.startsWith('blob:')) {
    return allowBlob ? trimmed : null;
  }

  // Allow relative URLs (must start with / or . to prevent //evil.com attacks)
  if (allowRelative) {
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
      return trimmed;
    }
    // URLs without protocol that don't start with // are relative
    if (!trimmed.includes(':') && !trimmed.startsWith('//')) {
      return trimmed;
    }
  }

  // Only allow http: and https: protocols
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

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
    console.warn(`[Pulse Security] Invalid CSS property name: ${prop}`);
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
    console.warn(
      `[Pulse Security] CSS injection blocked for ${prop}: ${result.blocked}. ` +
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
  // CSS Sanitization
  isValidCSSProperty,
  sanitizeCSSValue,
  safeSetStyle,
  // Utilities
  deepClone,
  debounce,
  throttle
};
