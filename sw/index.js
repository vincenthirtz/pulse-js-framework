/**
 * Pulse Service Worker Utilities (SW Context)
 * Cache strategy helpers for use INSIDE a service worker file.
 *
 * @module pulse-js-framework/sw
 *
 * @example
 * // In your sw.js:
 * import { createCacheStrategy } from 'pulse-js-framework/sw';
 *
 * const staticCache = createCacheStrategy('cache-first', {
 *   cacheName: 'static-v1',
 *   match: /\.(js|css|png|woff2)$/,
 * });
 *
 * self.addEventListener('fetch', (event) => {
 *   staticCache.handle(event);
 * });
 */

// =============================================================================
// CACHE STRATEGY FACTORY
// =============================================================================

/**
 * Create a cache strategy for handling fetch events
 *
 * @param {'cache-first'|'network-first'|'stale-while-revalidate'|'network-only'|'cache-only'} name - Strategy type
 * @param {Object} options - Strategy options
 * @param {string} options.cacheName - Cache storage name
 * @param {RegExp|Function} [options.match] - URL matching (regex or function)
 * @param {number} [options.maxAge] - Max cache age in ms
 * @param {number} [options.maxEntries] - Max cached entries
 * @param {number} [options.timeout] - Network timeout in ms (for network-first)
 * @returns {Object} Strategy with handle() method
 */
export function createCacheStrategy(name, options = {}) {
  const {
    cacheName,
    match = null,
    maxAge = 0,
    maxEntries = 0,
    timeout = 5000,
  } = options;

  if (!cacheName) {
    throw new Error('createCacheStrategy: cacheName is required');
  }

  function _matches(request) {
    const url = request.url || request;
    if (!match) return true;
    if (match instanceof RegExp) return match.test(url);
    if (typeof match === 'function') return match(url);
    return false;
  }

  async function _cleanupCache(cache) {
    if (!maxEntries && !maxAge) return;

    const keys = await cache.keys();

    if (maxAge > 0) {
      const now = Date.now();
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('sw-cache-time');
          if (dateHeader && (now - parseInt(dateHeader, 10)) > maxAge) {
            await cache.delete(request);
          }
        }
      }
    }

    if (maxEntries > 0) {
      const remaining = await cache.keys();
      if (remaining.length > maxEntries) {
        const toDelete = remaining.slice(0, remaining.length - maxEntries);
        for (const request of toDelete) {
          await cache.delete(request);
        }
      }
    }
  }

  async function _cacheResponse(cache, request, response) {
    // Clone and add cache timestamp header
    const headers = new Headers(response.headers);
    headers.set('sw-cache-time', String(Date.now()));

    const cachedResponse = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    await cache.put(request, cachedResponse);
    _cleanupCache(cache).catch(() => {});
  }

  // Strategy implementations
  const strategies = {
    'cache-first': async (request) => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await _cacheResponse(cache, request, response);
      }
      return response;
    },

    'network-first': async (request) => {
      const cache = await caches.open(cacheName);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          await _cacheResponse(cache, request, response);
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error(`Network request failed and no cache for: ${request.url}`);
      }
    },

    'stale-while-revalidate': async (request) => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);

      // Revalidate in background
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          _cacheResponse(cache, request, response).catch(() => {});
        }
        return response;
      }).catch(() => null);

      // Return cached immediately, or wait for network
      return cached || fetchPromise;
    },

    'network-only': async (request) => {
      return fetch(request);
    },

    'cache-only': async (request) => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
      throw new Error(`No cache entry for: ${request.url}`);
    },
  };

  const strategyFn = strategies[name];
  if (!strategyFn) {
    throw new Error(
      `Unknown cache strategy: "${name}". Use: cache-first, network-first, stale-while-revalidate, network-only, cache-only`
    );
  }

  return {
    name,
    cacheName,

    /**
     * Handle a fetch event with this strategy
     * @param {FetchEvent} event - The fetch event
     * @returns {boolean} True if this strategy handled the event
     */
    handle(event) {
      if (!_matches(event.request)) return false;

      event.respondWith(strategyFn(event.request));
      return true;
    },

    /**
     * Fetch using this strategy (without FetchEvent)
     * @param {Request|string} request - The request
     * @returns {Promise<Response>}
     */
    fetch(request) {
      return strategyFn(typeof request === 'string' ? new Request(request) : request);
    },

    /**
     * Precache a list of URLs
     * @param {string[]} urls - URLs to precache
     * @returns {Promise<void>}
     */
    async precache(urls) {
      const cache = await caches.open(cacheName);
      await cache.addAll(urls);
    },

    /**
     * Clear this strategy's cache
     * @returns {Promise<boolean>}
     */
    async clearCache() {
      return caches.delete(cacheName);
    },
  };
}

// =============================================================================
// SKIP WAITING LISTENER
// =============================================================================

/**
 * Install a message listener for SKIP_WAITING messages.
 * Call this in your service worker to enable skipWaiting from the main thread.
 */
export function enableSkipWaiting() {
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  createCacheStrategy,
  enableSkipWaiting,
};
