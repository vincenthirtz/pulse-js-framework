/**
 * Pulse Service Worker Utilities Type Definitions
 * @module pulse-js-framework/sw
 */

// ============================================================================
// Cache Strategy Types
// ============================================================================

/** Supported cache strategy names */
export type CacheStrategyName =
  | 'cache-first'
  | 'network-first'
  | 'stale-while-revalidate'
  | 'network-only'
  | 'cache-only';

/** URL matcher: regex pattern or predicate function */
export type URLMatcher = RegExp | ((url: string) => boolean);

/** Options for createCacheStrategy */
export interface CacheStrategyOptions {
  /** Cache storage name (required) */
  cacheName: string;

  /** URL matching pattern or function (default: matches all) */
  match?: URLMatcher | null;

  /** Maximum cache age in ms (default: 0 = no expiry) */
  maxAge?: number;

  /** Maximum number of cached entries (default: 0 = unlimited) */
  maxEntries?: number;

  /** Network timeout in ms for network-first strategy (default: 5000) */
  timeout?: number;
}

/** Cache strategy instance returned by createCacheStrategy */
export interface CacheStrategy {
  /** Strategy name */
  readonly name: CacheStrategyName;

  /** Cache storage name */
  readonly cacheName: string;

  /**
   * Handle a fetch event with this strategy.
   * Calls event.respondWith() if the request matches.
   *
   * @param event The service worker FetchEvent
   * @returns True if this strategy handled the event, false if the request did not match
   */
  handle(event: FetchEvent): boolean;

  /**
   * Fetch a request using this strategy (without FetchEvent).
   *
   * @param request The request URL string or Request object
   * @returns Response promise
   */
  fetch(request: Request | string): Promise<Response>;

  /**
   * Precache a list of URLs into this strategy's cache.
   *
   * @param urls Array of URLs to precache
   */
  precache(urls: string[]): Promise<void>;

  /**
   * Delete this strategy's entire cache.
   *
   * @returns True if the cache was successfully deleted
   */
  clearCache(): Promise<boolean>;
}

/**
 * Create a cache strategy for handling service worker fetch events.
 *
 * @param name Strategy type
 * @param options Strategy configuration
 * @returns Cache strategy instance with handle(), fetch(), precache(), and clearCache() methods
 * @throws Error if cacheName is not provided or strategy name is unknown
 *
 * @example
 * // In your sw.js:
 * import { createCacheStrategy } from 'pulse-js-framework/sw';
 *
 * const staticCache = createCacheStrategy('cache-first', {
 *   cacheName: 'static-v1',
 *   match: /\.(js|css|png|woff2)$/,
 *   maxEntries: 100,
 * });
 *
 * const apiCache = createCacheStrategy('network-first', {
 *   cacheName: 'api-v1',
 *   match: /\/api\//,
 *   timeout: 3000,
 *   maxAge: 5 * 60 * 1000, // 5 minutes
 * });
 *
 * const swrCache = createCacheStrategy('stale-while-revalidate', {
 *   cacheName: 'swr-v1',
 *   match: /\/assets\//,
 * });
 *
 * self.addEventListener('fetch', (event) => {
 *   if (staticCache.handle(event)) return;
 *   if (apiCache.handle(event)) return;
 *   if (swrCache.handle(event)) return;
 * });
 */
export declare function createCacheStrategy(
  name: CacheStrategyName,
  options: CacheStrategyOptions
): CacheStrategy;

// ============================================================================
// Skip Waiting
// ============================================================================

/**
 * Install a message listener for SKIP_WAITING messages.
 * Call this in your service worker to enable skipWaiting from the main thread.
 *
 * When the main thread sends `{ type: 'SKIP_WAITING' }` via postMessage,
 * the service worker will call self.skipWaiting() to activate immediately.
 *
 * @example
 * // In your sw.js:
 * import { enableSkipWaiting } from 'pulse-js-framework/sw';
 * enableSkipWaiting();
 *
 * // In your main thread:
 * navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
 */
export declare function enableSkipWaiting(): void;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createCacheStrategy: typeof createCacheStrategy;
  enableSkipWaiting: typeof enableSkipWaiting;
};

export default _default;
