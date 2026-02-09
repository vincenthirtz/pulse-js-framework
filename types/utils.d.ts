/**
 * Pulse Framework - Utility Functions Type Definitions
 * @module pulse-js-framework/runtime/utils
 */

// =============================================================================
// XSS Prevention
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this when inserting untrusted content into HTML.
 *
 * Escapes: & < > " '
 *
 * @param str - Value to escape (will be converted to string)
 * @returns Escaped string safe for HTML insertion
 *
 * @example
 * ```typescript
 * const safe = escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
 * ```
 */
export declare function escapeHtml(str: unknown): string;

/**
 * Unescape HTML entities back to their original characters.
 *
 * @param str - HTML-escaped string
 * @returns Unescaped string
 *
 * @example
 * ```typescript
 * const original = unescapeHtml('&lt;div&gt;');
 * // Returns: '<div>'
 * ```
 */
export declare function unescapeHtml(str: string | null | undefined): string;

/**
 * Explicitly set innerHTML with a warning.
 * This function is intentionally named to make it obvious that
 * it bypasses XSS protection.
 *
 * @security Only use this with trusted, sanitized HTML.
 * Never use with user-provided content without proper sanitization.
 *
 * @param element - Target element
 * @param html - HTML string to insert (must be trusted)
 *
 * @example
 * ```typescript
 * // Only use with trusted HTML!
 * dangerouslySetInnerHTML(container, sanitizedHtml);
 * ```
 */
export declare function dangerouslySetInnerHTML(element: HTMLElement, html: string): void;

/**
 * Create a text node from a value, safely escaping it.
 * This is the recommended way to insert dynamic text content.
 *
 * Note: DOM textContent is already safe from XSS, but this function
 * provides a consistent API and handles null/undefined values.
 *
 * @param value - Value to convert to text node
 * @returns Safe text node
 *
 * @example
 * ```typescript
 * const node = createSafeTextNode(userInput);
 * container.appendChild(node);
 * ```
 */
export declare function createSafeTextNode(value: unknown): Text;

// =============================================================================
// Attribute Handling
// =============================================================================

/**
 * Escape a value for use in an HTML attribute.
 * Escapes quotes and special characters.
 *
 * @param value - Value to escape
 * @returns Escaped string safe for attribute values
 *
 * @example
 * ```typescript
 * const safe = escapeAttribute(userInput);
 * element.setAttribute('data-value', safe);
 * ```
 */
export declare function escapeAttribute(value: unknown): string;

/**
 * Safely set an attribute on an element.
 * Validates attribute names to prevent attribute injection.
 * Blocks dangerous event handler attributes (onclick, onerror, etc.).
 *
 * @param element - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 * @returns true if attribute was set, false if blocked
 *
 * @example
 * ```typescript
 * if (!safeSetAttribute(element, attrName, attrValue)) {
 *   console.warn('Attribute was blocked');
 * }
 * ```
 */
export declare function safeSetAttribute(
  element: HTMLElement,
  name: string,
  value: unknown
): boolean;

// =============================================================================
// URL Validation
// =============================================================================

/** Options for URL sanitization */
export interface SanitizeUrlOptions {
  /** Allow data: URLs (default: false) */
  allowData?: boolean;
  /** Allow relative URLs (default: true) */
  allowRelative?: boolean;
}

/**
 * Validate and sanitize a URL to prevent javascript: and data: XSS.
 * Only allows http:, https:, and optionally relative URLs.
 *
 * @param url - URL to validate
 * @param options - Validation options
 * @returns Sanitized URL or null if invalid/dangerous
 *
 * @example
 * ```typescript
 * const safeUrl = sanitizeUrl(userProvidedUrl);
 * if (safeUrl) {
 *   link.href = safeUrl;
 * } else {
 *   console.warn('Invalid or dangerous URL');
 * }
 *
 * // Allow data: URLs for images
 * const imageUrl = sanitizeUrl(dataUrl, { allowData: true });
 * ```
 */
export declare function sanitizeUrl(
  url: string | null | undefined,
  options?: SanitizeUrlOptions
): string | null;

// =============================================================================
// Deep Clone
// =============================================================================

/**
 * Deep clone an object or array.
 * Handles nested objects, arrays, dates, and primitive values.
 *
 * Note: Does not clone functions, symbols, or circular references.
 *
 * @template T - Type of the value to clone
 * @param obj - Object to clone
 * @returns Deep clone of the object
 *
 * @example
 * ```typescript
 * const clone = deepClone({ a: { b: [1, 2, 3] } });
 * clone.a.b.push(4); // Doesn't affect original
 * ```
 */
export declare function deepClone<T>(obj: T): T;

// =============================================================================
// Debounce / Throttle
// =============================================================================

/** Function with cancel method */
export interface CancellableFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  /** Cancel any pending execution */
  cancel(): void;
}

/**
 * Create a debounced version of a function.
 * The function will only be called after the specified delay
 * has passed without any new calls.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel method
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 *
 * // Cancel pending call if needed
 * debouncedSearch.cancel();
 * ```
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): CancellableFunction<T>;

/**
 * Create a throttled version of a function.
 * The function will be called at most once per specified interval.
 *
 * @param fn - Function to throttle
 * @param interval - Minimum interval between calls in milliseconds
 * @returns Throttled function with cancel method
 *
 * @example
 * ```typescript
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 *
 * // Cancel pending call if needed
 * throttledScroll.cancel();
 * ```
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): CancellableFunction<T>;

// =============================================================================
// CSS Sanitization
// =============================================================================

/**
 * Check if a string is a valid CSS property name
 */
export declare function isValidCSSProperty(prop: string): boolean;

/** Result of CSS value sanitization */
export interface SanitizeCSSResult {
  safe: boolean;
  value: string;
  blocked?: string;
}

/**
 * Sanitize a CSS value to prevent CSS injection
 */
export declare function sanitizeCSSValue(
  value: string,
  options?: { allowUrl?: boolean }
): SanitizeCSSResult;

/**
 * Safely set an inline style on an element
 */
export declare function safeSetStyle(
  element: HTMLElement,
  prop: string,
  value: string,
  options?: { allowUrl?: boolean }
): boolean;

// =============================================================================
// Environment Utilities
// =============================================================================

/**
 * Check if running in a browser environment
 */
export declare function isBrowser(): boolean;

/**
 * Listen to a window event with cleanup support
 */
export declare function onWindowEvent(
  event: string,
  handler: (e: Event) => void,
  onCleanup?: (cleanup: () => void) => void,
  options?: AddEventListenerOptions
): () => void;

/**
 * Listen to window focus events
 */
export declare function onWindowFocus(
  handler: () => void,
  onCleanup?: (cleanup: () => void) => void
): () => void;

/**
 * Listen to online events
 */
export declare function onWindowOnline(
  handler: () => void,
  onCleanup?: (cleanup: () => void) => void
): () => void;

/**
 * Listen to offline events
 */
export declare function onWindowOffline(
  handler: () => void,
  onCleanup?: (cleanup: () => void) => void
): () => void;

/**
 * Listen to network change events
 */
export declare function onNetworkChange(
  handlers: { online?: () => void; offline?: () => void },
  onCleanup?: (cleanup: () => void) => void
): () => void;

// =============================================================================
// Default Export
// =============================================================================

declare const utils: {
  escapeHtml: typeof escapeHtml;
  unescapeHtml: typeof unescapeHtml;
  dangerouslySetInnerHTML: typeof dangerouslySetInnerHTML;
  createSafeTextNode: typeof createSafeTextNode;
  escapeAttribute: typeof escapeAttribute;
  safeSetAttribute: typeof safeSetAttribute;
  sanitizeUrl: typeof sanitizeUrl;
  deepClone: typeof deepClone;
  debounce: typeof debounce;
  throttle: typeof throttle;
};

export default utils;
