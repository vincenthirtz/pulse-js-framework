/**
 * PSC Integration for Router - Pulse Framework
 *
 * Handles Server Component navigation, caching, and prefetching.
 * Provides client-side navigation with Server Component updates via PSC Wire Format.
 *
 * @module runtime/router/psc-integration
 */

import { reconstructPSCTree } from '../server-components/index.js';

// ============================================================
// PSC Cache (LRU)
// ============================================================

/**
 * LRU Cache for PSC payloads
 * @class PSCCache
 */
class PSCCache {
  /**
   * @param {number} maxSize - Maximum cache size
   */
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get cached entry (moves to most recent)
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Set cache entry (evicts oldest if at capacity)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    // Delete if exists (will re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Number of cached entries
   */
  get size() {
    return this.cache.size;
  }
}

// ============================================================
// Cache Instance & Prefetch Queue
// ============================================================

/**
 * Global PSC cache instance
 * @type {PSCCache}
 */
export const pscCache = new PSCCache();

/**
 * Prefetch queue (tracks in-flight prefetches)
 * @type {Set<string>}
 */
const prefetchQueue = new Set();

// ============================================================
// PSC Fetch
// ============================================================

/**
 * Fetch PSC payload from server
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} [options.query={}] - Query parameters
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<Object>} PSC payload
 *
 * @example
 * const payload = await fetchPSCPayload('/products/123', {
 *   query: { tab: 'reviews' }
 * });
 */
export async function fetchPSCPayload(url, options = {}) {
  const { query = {}, signal } = options;

  // Build query string
  const queryString = new URLSearchParams(query).toString();
  const fullUrl = `${url}${queryString ? '?' + queryString : ''}`;

  // Fetch from server with PSC headers
  const response = await fetch(fullUrl, {
    headers: {
      'Accept': 'application/x-pulse-psc',
      'X-Pulse-Request': 'navigation'
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`PSC fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================
// PSC Navigation
// ============================================================

/**
 * Navigate to Server Component route
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @param {Object} [options.query={}] - Query parameters
 * @param {string} [options.cacheKey] - Cache key (auto-generated if not provided)
 * @param {number} [options.staleTime=60000] - Cache staleness threshold (ms)
 * @param {AbortSignal} [options.signal] - Abort signal
 * @returns {Promise<Object>} PSC payload
 *
 * @example
 * const payload = await navigatePSC('/products/123', {
 *   query: { tab: 'reviews' },
 *   staleTime: 30000
 * });
 */
export async function navigatePSC(url, options = {}) {
  const { query = {}, cacheKey, signal } = options;
  const staleTime = options.staleTime ?? 60000;

  // Generate cache key if not provided
  const key = cacheKey || (url + JSON.stringify(query));

  // Check cache
  if (pscCache.has(key)) {
    const cached = pscCache.get(key);
    const age = Date.now() - cached.timestamp;

    if (age < staleTime) {
      return cached.payload; // Fresh cache hit
    }
  }

  // Fetch fresh payload
  const payload = await fetchPSCPayload(url, { query, signal });

  // Cache it
  pscCache.set(key, {
    payload,
    timestamp: Date.now()
  });

  return payload;
}

// ============================================================
// PSC Prefetching
// ============================================================

/**
 * Prefetch PSC payload in background
 * @param {string} url - URL to prefetch
 * @param {Object} options - Prefetch options
 * @param {Object} [options.query={}] - Query parameters
 * @param {number} [options.staleTime=60000] - Cache staleness threshold (ms)
 * @returns {Promise<void>} Resolves when prefetch completes
 *
 * @example
 * // Prefetch on link hover
 * linkElement.addEventListener('mouseenter', () => {
 *   prefetchPSC('/products/123');
 * });
 */
export function prefetchPSC(url, options = {}) {
  const { query = {} } = options;
  const cacheKey = url + JSON.stringify(query);

  // Skip if already prefetching or cached
  if (prefetchQueue.has(cacheKey) || pscCache.has(cacheKey)) {
    return Promise.resolve();
  }

  // Add to queue
  prefetchQueue.add(cacheKey);

  // Navigate (which fetches and caches)
  return navigatePSC(url, { ...options, cacheKey })
    .then(() => {
      prefetchQueue.delete(cacheKey);
    })
    .catch((err) => {
      console.warn('PSC prefetch failed:', err);
      prefetchQueue.delete(cacheKey);
    });
}

// ============================================================
// Cache Management
// ============================================================

/**
 * Clear PSC cache
 *
 * @example
 * clearPSCCache(); // Clear all cached PSC payloads
 */
export function clearPSCCache() {
  pscCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 *
 * @example
 * const stats = getPSCCacheStats();
 * console.log(`Cache: ${stats.size}/${stats.maxSize} entries`);
 */
export function getPSCCacheStats() {
  return {
    size: pscCache.size,
    maxSize: pscCache.maxSize,
    prefetching: prefetchQueue.size
  };
}

/**
 * Configure PSC cache
 * @param {Object} options - Configuration options
 * @param {number} [options.maxSize] - Maximum cache size
 *
 * @example
 * configurePSCCache({ maxSize: 100 }); // Increase cache size
 */
export function configurePSCCache(options = {}) {
  if (options.maxSize !== undefined) {
    // Create new cache with new max size
    const newCache = new PSCCache(options.maxSize);

    // Copy existing entries (up to new max size)
    const entries = Array.from(pscCache.cache.entries()).slice(0, options.maxSize);
    entries.forEach(([key, value]) => newCache.set(key, value));

    // Replace global cache
    pscCache.cache = newCache.cache;
    pscCache.maxSize = newCache.maxSize;
  }
}

// ============================================================
// Exports
// ============================================================

export default {
  PSCCache,
  pscCache,
  fetchPSCPayload,
  navigatePSC,
  prefetchPSC,
  clearPSCCache,
  getPSCCacheStats,
  configurePSCCache
};
