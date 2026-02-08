/**
 * Pulse Security Module - Type Definitions
 * @module pulse-js-framework/runtime/security
 *
 * Centralized security utilities and constants for the Pulse framework.
 * Provides protection against:
 * - Prototype pollution
 * - XSS attacks
 * - Injection attacks
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Properties that could be used for prototype pollution attacks.
 * These should never be accepted as user-provided keys.
 *
 * Includes: `__proto__`, `constructor`, `prototype`, `eval`, `Function`,
 * and various property descriptor manipulation methods.
 */
export declare const DANGEROUS_KEYS: Set<string>;

/**
 * Event handler attributes that could execute JavaScript.
 *
 * Includes all standard DOM event handler attributes such as
 * `onclick`, `onerror`, `onload`, `oninput`, etc.
 */
export declare const EVENT_HANDLER_ATTRS: Set<string>;

/**
 * Dangerous URL protocols that could execute JavaScript.
 *
 * Includes: `javascript:`, `vbscript:`, `data:`, `blob:`
 */
export declare const DANGEROUS_PROTOCOLS: Set<string>;

/**
 * Safe URL protocols that are allowed by default.
 *
 * Includes: `http:`, `https:`, `mailto:`, `tel:`, `sms:`, `ftp:`, `sftp:`
 */
export declare const SAFE_PROTOCOLS: Set<string>;

/**
 * Default HTML tags allowed in sanitized HTML output.
 *
 * Includes text formatting (`p`, `strong`, `em`, etc.), headings,
 * lists, tables, links, images, and semantic elements.
 */
export declare const DEFAULT_ALLOWED_TAGS: Set<string>;

/**
 * Default attributes allowed in sanitized HTML output.
 *
 * Includes global attributes (`id`, `class`, `title`), link attributes
 * (`href`, `target`, `rel`), image attributes (`src`, `alt`, `width`, `height`),
 * table attributes (`colspan`, `rowspan`), and accessibility attributes
 * (`role`, `aria-label`, `tabindex`, etc.).
 */
export declare const DEFAULT_ALLOWED_ATTRS: Set<string>;

// =============================================================================
// Options Interfaces
// =============================================================================

/**
 * Options for sanitizing object keys against prototype pollution.
 */
export interface SanitizeObjectKeysOptions {
  /**
   * Throw an error when a dangerous key is encountered instead of
   * silently filtering it out.
   * @default false
   */
  throwOnDangerous?: boolean;

  /**
   * Log warnings to the console when dangerous keys are filtered.
   * @default true
   */
  logWarnings?: boolean;
}

/**
 * Options for HTML sanitization.
 */
export interface SanitizeHtmlOptions {
  /**
   * Set of HTML tags to allow in the output.
   * Tags not in this set will be removed (their children are preserved).
   * @default DEFAULT_ALLOWED_TAGS
   */
  allowedTags?: Set<string>;

  /**
   * Set of attributes to allow on elements.
   * Attributes not in this set will be stripped.
   * @default DEFAULT_ALLOWED_ATTRS
   */
  allowedAttrs?: Set<string>;

  /**
   * Allow `data:` URLs in `src` and `href` attributes.
   * Even when enabled, `data:text/html` and `data:text/javascript` are blocked.
   * @default false
   */
  allowDataUrls?: boolean;
}

/**
 * Options for URL sanitization.
 */
export interface SanitizeUrlOptions {
  /**
   * Allow `data:` URLs.
   * Even when enabled, `data:text/html` and `data:text/javascript` are blocked.
   * @default false
   */
  allowData?: boolean;

  /**
   * Allow `blob:` URLs.
   * @default false
   */
  allowBlob?: boolean;

  /**
   * Allow relative URLs (URLs without a protocol).
   * @default true
   */
  allowRelative?: boolean;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if a key is potentially dangerous (prototype pollution risk).
 *
 * @param key - The key to check
 * @returns `true` if the key is in the {@link DANGEROUS_KEYS} set
 *
 * @example
 * ```typescript
 * if (isDangerousKey(userProvidedKey)) {
 *   throw new Error('Invalid key');
 * }
 * ```
 */
export declare function isDangerousKey(key: string): boolean;

/**
 * Validate and filter an object's keys to prevent prototype pollution.
 * Recursively processes nested objects and arrays, removing any keys
 * found in {@link DANGEROUS_KEYS}.
 *
 * @template T - The type of the object being sanitized
 * @param obj - Object to validate
 * @param options - Sanitization options
 * @returns Cleaned object with dangerous keys removed
 *
 * @example
 * ```typescript
 * const safeData = sanitizeObjectKeys(userInput);
 *
 * // Throw on dangerous keys instead of silently filtering
 * const strict = sanitizeObjectKeys(userInput, { throwOnDangerous: true });
 * ```
 */
export declare function sanitizeObjectKeys<T>(
  obj: T,
  options?: SanitizeObjectKeysOptions
): T;

// =============================================================================
// HTML Sanitization
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 *
 * Escapes the following characters: `&`, `<`, `>`, `"`, `'`
 *
 * @param str - String to escape (null/undefined returns empty string)
 * @returns Escaped string safe for HTML insertion
 *
 * @example
 * ```typescript
 * const safe = escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export declare function escapeHtml(str: string | null | undefined): string;

/**
 * Sanitize an HTML string to remove potentially dangerous content.
 *
 * Uses the browser's DOMParser for safe parsing when available.
 * In non-browser environments, falls back to stripping all tags.
 *
 * This is a basic sanitizer. For production use with untrusted content,
 * consider using a dedicated library like DOMPurify.
 *
 * @param html - HTML string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized HTML string with only allowed tags and attributes
 *
 * @example
 * ```typescript
 * const safe = sanitizeHtml('<script>alert("xss")</script><p>Hello</p>');
 * // Returns: '<p>Hello</p>'
 *
 * // Custom allowed tags
 * const minimal = sanitizeHtml(userHtml, {
 *   allowedTags: new Set(['p', 'br', 'strong', 'em']),
 *   allowedAttrs: new Set(['class'])
 * });
 * ```
 */
export declare function sanitizeHtml(
  html: string | null | undefined,
  options?: SanitizeHtmlOptions
): string;

// =============================================================================
// URL Sanitization
// =============================================================================

/**
 * Sanitize a URL to prevent JavaScript execution.
 *
 * Blocks `javascript:` and `vbscript:` protocols. Optionally allows
 * `data:` and `blob:` URLs. Decodes HTML entities and URI encoding
 * to catch encoded attacks.
 *
 * @param url - URL to sanitize
 * @param options - Sanitization options
 * @returns Sanitized URL string, or `null` if the URL is dangerous
 *
 * @example
 * ```typescript
 * const safe = sanitizeUrl('javascript:alert("xss")');
 * // Returns: null
 *
 * const valid = sanitizeUrl('https://example.com');
 * // Returns: 'https://example.com'
 *
 * // Allow data: URLs for images
 * const dataUrl = sanitizeUrl('data:image/png;base64,...', { allowData: true });
 * ```
 */
export declare function sanitizeUrl(
  url: string | null | undefined,
  options?: SanitizeUrlOptions
): string | null;

// =============================================================================
// Default Export
// =============================================================================

declare const security: {
  // Constants
  DANGEROUS_KEYS: typeof DANGEROUS_KEYS;
  EVENT_HANDLER_ATTRS: typeof EVENT_HANDLER_ATTRS;
  DANGEROUS_PROTOCOLS: typeof DANGEROUS_PROTOCOLS;
  SAFE_PROTOCOLS: typeof SAFE_PROTOCOLS;
  DEFAULT_ALLOWED_TAGS: typeof DEFAULT_ALLOWED_TAGS;
  DEFAULT_ALLOWED_ATTRS: typeof DEFAULT_ALLOWED_ATTRS;

  // Validation
  isDangerousKey: typeof isDangerousKey;
  sanitizeObjectKeys: typeof sanitizeObjectKeys;

  // HTML
  escapeHtml: typeof escapeHtml;
  sanitizeHtml: typeof sanitizeHtml;

  // URL
  sanitizeUrl: typeof sanitizeUrl;
};

export default security;
