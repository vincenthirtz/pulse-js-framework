/**
 * Pulse Security Module
 * @module pulse-js-framework/runtime/security
 *
 * Centralized security utilities and constants for the Pulse framework.
 * Provides protection against:
 * - Prototype pollution
 * - XSS attacks
 * - Injection attacks
 */

import { createLogger } from './logger.js';

const log = createLogger('Security');

// =============================================================================
// DANGEROUS PROPERTIES
// =============================================================================

/**
 * Properties that could be used for prototype pollution attacks.
 * These should never be accepted as user-provided keys.
 * @type {Set<string>}
 */
export const DANGEROUS_KEYS = new Set([
  // Prototype chain manipulation
  '__proto__',
  'constructor',
  'prototype',

  // Property descriptor manipulation
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',

  // Object prototype methods that could be overwritten
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',

  // Dangerous globals
  'eval',
  'Function'
]);

/**
 * Event handler attributes that could execute JavaScript.
 * @type {Set<string>}
 */
export const EVENT_HANDLER_ATTRS = new Set([
  'onabort', 'onanimationcancel', 'onanimationend', 'onanimationiteration',
  'onanimationstart', 'onauxclick', 'onbeforeinput', 'onblur', 'oncancel',
  'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose',
  'oncontextmenu', 'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag',
  'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart',
  'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus',
  'onformdata', 'ongotpointercapture', 'oninput', 'oninvalid', 'onkeydown',
  'onkeypress', 'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata',
  'onloadstart', 'onlostpointercapture', 'onmousedown', 'onmouseenter',
  'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup',
  'onpaste', 'onpause', 'onplay', 'onplaying', 'onpointercancel',
  'onpointerdown', 'onpointerenter', 'onpointerleave', 'onpointermove',
  'onpointerout', 'onpointerover', 'onpointerup', 'onprogress', 'onratechange',
  'onreset', 'onresize', 'onscroll', 'onsecuritypolicyviolation', 'onseeked',
  'onseeking', 'onselect', 'onselectionchange', 'onselectstart', 'onslotchange',
  'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle',
  'ontouchcancel', 'ontouchend', 'ontouchmove', 'ontouchstart',
  'ontransitioncancel', 'ontransitionend', 'ontransitionrun', 'ontransitionstart',
  'onvolumechange', 'onwaiting', 'onwebkitanimationend', 'onwebkitanimationiteration',
  'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel'
]);

/**
 * Dangerous URL protocols that could execute JavaScript.
 * @type {Set<string>}
 */
export const DANGEROUS_PROTOCOLS = new Set([
  'javascript:',
  'vbscript:',
  'data:',  // Can contain JavaScript in some contexts
  'blob:'   // Can contain JavaScript in some contexts
]);

/**
 * Safe URL protocols.
 * @type {Set<string>}
 */
export const SAFE_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'sms:',
  'ftp:',
  'sftp:'
]);

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a key is potentially dangerous (prototype pollution risk).
 *
 * @param {string} key - The key to check
 * @returns {boolean} True if the key is dangerous
 *
 * @example
 * if (isDangerousKey(userProvidedKey)) {
 *   throw new Error('Invalid key');
 * }
 */
export function isDangerousKey(key) {
  return DANGEROUS_KEYS.has(key);
}

/**
 * Validate and filter an object's keys to prevent prototype pollution.
 *
 * @param {Object} obj - Object to validate
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.throwOnDangerous=false] - Throw error instead of filtering
 * @param {boolean} [options.logWarnings=true] - Log warnings for filtered keys
 * @returns {Object} Cleaned object with dangerous keys removed
 *
 * @example
 * const safeData = sanitizeObjectKeys(userInput);
 */
export function sanitizeObjectKeys(obj, options = {}) {
  const { throwOnDangerous = false, logWarnings = true } = options;

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    if (isDangerousKey(key)) {
      if (throwOnDangerous) {
        throw new Error(`Dangerous key blocked: ${key}`);
      }
      if (logWarnings) {
        log.warn(`Dangerous key filtered: ${key}`);
      }
      continue;
    }

    const value = obj[key];
    if (value !== null && typeof value === 'object') {
      result[key] = sanitizeObjectKeys(value, options);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// =============================================================================
// HTML SANITIZATION
// =============================================================================

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
 * Escape HTML special characters to prevent XSS.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML insertion
 *
 * @example
 * const safe = escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

/**
 * Tags allowed by default in sanitized HTML.
 * @type {Set<string>}
 */
export const DEFAULT_ALLOWED_TAGS = new Set([
  // Text formatting
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
  'sub', 'sup', 'small', 'mark', 'abbr', 'cite', 'code', 'pre',
  'blockquote', 'q',

  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',

  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',

  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',

  // Links and media (sanitized)
  'a', 'img',

  // Semantic
  'article', 'section', 'nav', 'aside', 'header', 'footer', 'main',
  'figure', 'figcaption', 'time', 'address'
]);

/**
 * Attributes allowed by default in sanitized HTML.
 * @type {Set<string>}
 */
export const DEFAULT_ALLOWED_ATTRS = new Set([
  // Global attributes
  'id', 'class', 'title', 'lang', 'dir',

  // Links
  'href', 'target', 'rel',

  // Images
  'src', 'alt', 'width', 'height', 'loading',

  // Tables
  'colspan', 'rowspan', 'scope',

  // Accessibility
  'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'aria-hidden', 'aria-expanded', 'aria-selected', 'aria-checked',
  'tabindex'
]);

/**
 * Sanitize HTML string to remove potentially dangerous content.
 *
 * This is a basic sanitizer. For production use with untrusted content,
 * consider using a dedicated library like DOMPurify.
 *
 * @param {string} html - HTML string to sanitize
 * @param {Object} [options={}] - Sanitization options
 * @param {Set<string>} [options.allowedTags] - Tags to allow
 * @param {Set<string>} [options.allowedAttrs] - Attributes to allow
 * @param {boolean} [options.allowDataUrls=false] - Allow data: URLs in src/href
 * @returns {string} Sanitized HTML string
 *
 * @example
 * const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
 * // Returns: '<p>Hello</p>'
 */
export function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') return '';

  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttrs = DEFAULT_ALLOWED_ATTRS,
    allowDataUrls = false
  } = options;

  // Use browser's DOMParser for safe parsing
  if (typeof DOMParser === 'undefined') {
    // Fallback for non-browser environments: strip all tags
    return html.replace(/<[^>]*>/g, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function sanitizeNode(node) {
    if (node.nodeType === 3) { // Text node
      return node.textContent;
    }

    if (node.nodeType !== 1) { // Not an element
      return '';
    }

    const tagName = node.tagName.toLowerCase();

    // Remove disallowed tags entirely
    if (!allowedTags.has(tagName)) {
      // Still process children for some tags
      let childContent = '';
      for (const child of node.childNodes) {
        childContent += sanitizeNode(child);
      }
      return childContent;
    }

    // Build sanitized element
    let result = `<${tagName}`;

    // Sanitize attributes
    for (const attr of node.attributes) {
      const attrName = attr.name.toLowerCase();

      // Skip disallowed attributes
      if (!allowedAttrs.has(attrName)) continue;

      // Skip event handlers
      if (attrName.startsWith('on')) continue;

      let attrValue = attr.value;

      // Sanitize URLs
      if (attrName === 'href' || attrName === 'src') {
        const sanitized = sanitizeUrl(attrValue, { allowData: allowDataUrls });
        if (!sanitized) continue;
        attrValue = sanitized;
      }

      // Sanitize style attribute to prevent CSS injection
      if (attrName === 'style') {
        const parts = attrValue.split(';').filter(Boolean);
        const safeParts = [];
        for (const part of parts) {
          const colonIndex = part.indexOf(':');
          if (colonIndex === -1) continue;
          const cssProp = part.slice(0, colonIndex).trim();
          const cssVal = part.slice(colonIndex + 1).trim();
          if (/url\s*\(/i.test(cssVal) || /expression\s*\(/i.test(cssVal) ||
              /javascript:/i.test(cssVal) || /behavior\s*:/i.test(cssVal) ||
              /-moz-binding/i.test(cssVal)) {
            log.warn(`Blocked dangerous CSS in style attribute: ${cssProp}`);
            continue;
          }
          safeParts.push(`${cssProp}: ${cssVal}`);
        }
        attrValue = safeParts.join('; ');
        if (!attrValue) continue;
      }

      result += ` ${attrName}="${escapeHtml(attrValue)}"`;
    }

    // Self-closing tags
    const selfClosing = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);
    if (selfClosing.has(tagName)) {
      return result + ' />';
    }

    result += '>';

    // Process children
    for (const child of node.childNodes) {
      result += sanitizeNode(child);
    }

    result += `</${tagName}>`;
    return result;
  }

  let output = '';
  for (const child of doc.body.childNodes) {
    output += sanitizeNode(child);
  }

  return output;
}

// =============================================================================
// URL SANITIZATION
// =============================================================================

/**
 * Sanitize a URL to prevent JavaScript execution.
 *
 * @param {string} url - URL to sanitize
 * @param {Object} [options={}] - Options
 * @param {boolean} [options.allowData=false] - Allow data: URLs
 * @param {boolean} [options.allowBlob=false] - Allow blob: URLs
 * @param {boolean} [options.allowRelative=true] - Allow relative URLs
 * @returns {string|null} Sanitized URL or null if dangerous
 *
 * @example
 * const safe = sanitizeUrl('javascript:alert("xss")');
 * // Returns: null
 *
 * const safe2 = sanitizeUrl('https://example.com');
 * // Returns: 'https://example.com'
 */
export function sanitizeUrl(url, options = {}) {
  const { allowData = false, allowBlob = false, allowRelative = true } = options;

  if (url == null || url === '') return null;

  const trimmed = String(url).trim();

  // Decode URL to catch encoded attacks
  let decoded = trimmed;
  try {
    // Decode HTML entities first
    decoded = decoded.replace(/&#x([0-9a-f]+);?/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    decoded = decoded.replace(/&#(\d+);?/g, (_, dec) =>
      String.fromCharCode(parseInt(dec, 10))
    );
    // Then decode URI encoding
    decoded = decodeURIComponent(decoded);
  } catch {
    // Malformed URL - use original
  }

  // Normalize and check protocol
  const normalized = decoded.toLowerCase().replace(/[\s\x00-\x1f]/g, '');

  // Block javascript: protocol
  if (normalized.startsWith('javascript:')) {
    log.warn('Blocked javascript: URL');
    return null;
  }

  // Block vbscript: protocol
  if (normalized.startsWith('vbscript:')) {
    log.warn('Blocked vbscript: URL');
    return null;
  }

  // Check data: URLs
  if (normalized.startsWith('data:')) {
    if (!allowData) {
      log.warn('Blocked data: URL (not allowed)');
      return null;
    }
    // Even when allowed, block data:text/html which can contain scripts
    if (normalized.includes('text/html') || normalized.includes('text/javascript')) {
      log.warn('Blocked dangerous data: URL');
      return null;
    }
  }

  // Check blob: URLs
  if (normalized.startsWith('blob:') && !allowBlob) {
    log.warn('Blocked blob: URL (not allowed)');
    return null;
  }

  // Check for relative URLs
  if (!trimmed.includes(':')) {
    return allowRelative ? trimmed : null;
  }

  return trimmed;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Constants
  DANGEROUS_KEYS,
  EVENT_HANDLER_ATTRS,
  DANGEROUS_PROTOCOLS,
  SAFE_PROTOCOLS,
  DEFAULT_ALLOWED_TAGS,
  DEFAULT_ALLOWED_ATTRS,

  // Validation
  isDangerousKey,
  sanitizeObjectKeys,

  // HTML
  escapeHtml,
  sanitizeHtml,

  // URL
  sanitizeUrl
};
