/**
 * Pulse Async Primitives
 * @module pulse-js-framework/runtime/async
 *
 * Reactive primitives for handling asynchronous operations like
 * data fetching, polling, and async state management.
 */

import { pulse, effect, batch, onCleanup } from './pulse.js';

/**
 * @typedef {Object} AsyncState
 * @property {T|null} data - The resolved data
 * @property {Error|null} error - The error if rejected
 * @property {boolean} loading - Whether the async operation is in progress
 * @property {'idle'|'loading'|'success'|'error'} status - Current status
 */

/**
 * @typedef {Object} UseAsyncOptions
 * @property {boolean} [immediate=true] - Execute immediately on creation
 * @property {T} [initialData=null] - Initial data value
 * @property {function(Error): void} [onError] - Error callback
 * @property {function(T): void} [onSuccess] - Success callback
 * @property {number} [retries=0] - Number of retry attempts on failure
 * @property {number} [retryDelay=1000] - Delay between retries in ms
 */

/**
 * Create a reactive async operation handler.
 * Manages loading, error, and success states automatically.
 *
 * @template T
 * @param {function(): Promise<T>} asyncFn - Async function to execute
 * @param {UseAsyncOptions<T>} [options={}] - Configuration options
 * @returns {Object} Reactive async state and controls
 *
 * @example
 * // Basic usage
 * const { data, loading, error, execute } = useAsync(
 *   () => fetch('/api/users').then(r => r.json())
 * );
 *
 * effect(() => {
 *   if (loading.get()) console.log('Loading...');
 *   if (data.get()) console.log('Users:', data.get());
 *   if (error.get()) console.log('Error:', error.get().message);
 * });
 *
 * // With options
 * const { data } = useAsync(
 *   () => fetchData(),
 *   {
 *     immediate: false,
 *     retries: 3,
 *     onSuccess: (data) => console.log('Got data:', data),
 *     onError: (err) => console.error('Failed:', err)
 *   }
 * );
 */
export function useAsync(asyncFn, options = {}) {
  const {
    immediate = true,
    initialData = null,
    onError,
    onSuccess,
    retries = 0,
    retryDelay = 1000
  } = options;

  const data = pulse(initialData);
  const error = pulse(null);
  const loading = pulse(false);
  const status = pulse('idle');

  // Track current execution version to handle race conditions
  let executionVersion = 0;

  /**
   * Execute the async function
   * @param {...any} args - Arguments to pass to asyncFn
   * @returns {Promise<T|null>} The resolved data or null on error
   */
  async function execute(...args) {
    const currentVersion = ++executionVersion;
    let attempt = 0;

    batch(() => {
      loading.set(true);
      error.set(null);
      status.set('loading');
    });

    while (attempt <= retries) {
      try {
        const result = await asyncFn(...args);

        // Check if this execution is still current (not stale)
        if (currentVersion !== executionVersion) {
          return null;
        }

        batch(() => {
          data.set(result);
          loading.set(false);
          status.set('success');
        });

        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        attempt++;

        // Only retry if we haven't exceeded retries and execution is still current
        if (attempt <= retries && currentVersion === executionVersion) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // Check if this execution is still current
        if (currentVersion !== executionVersion) {
          return null;
        }

        batch(() => {
          error.set(err);
          loading.set(false);
          status.set('error');
        });

        if (onError) onError(err);
        return null;
      }
    }

    return null;
  }

  /**
   * Reset state to initial values
   */
  function reset() {
    executionVersion++;
    batch(() => {
      data.set(initialData);
      error.set(null);
      loading.set(false);
      status.set('idle');
    });
  }

  /**
   * Abort current execution (marks it as stale)
   */
  function abort() {
    executionVersion++;
    if (loading.get()) {
      batch(() => {
        loading.set(false);
        status.set('idle');
      });
    }
  }

  // Execute immediately if requested
  if (immediate) {
    execute();
  }

  return {
    data,
    error,
    loading,
    status,
    execute,
    reset,
    abort
  };
}

/**
 * @typedef {Object} ResourceOptions
 * @property {number} [refreshInterval] - Auto-refresh interval in ms
 * @property {boolean} [refreshOnFocus=false] - Refresh when window regains focus
 * @property {boolean} [refreshOnReconnect=false] - Refresh when network reconnects
 * @property {T} [initialData=null] - Initial data value
 * @property {function(Error): void} [onError] - Error callback
 * @property {number} [staleTime=0] - Time in ms before data is considered stale
 * @property {number} [cacheTime=300000] - Time in ms to keep data in cache (5 min default)
 */

// Global resource cache
const resourceCache = new Map();

/**
 * Create a reactive resource with caching, auto-refresh, and stale-while-revalidate.
 * Similar to React Query or SWR patterns.
 *
 * @template T
 * @param {string|function(): string} key - Cache key or function returning key
 * @param {function(): Promise<T>} fetcher - Async function to fetch data
 * @param {ResourceOptions<T>} [options={}] - Configuration options
 * @returns {Object} Reactive resource state and controls
 *
 * @example
 * // Basic usage with caching
 * const users = useResource('users', () => fetch('/api/users').then(r => r.json()));
 *
 * // With auto-refresh
 * const liveData = useResource(
 *   'live-data',
 *   () => fetchLiveData(),
 *   { refreshInterval: 5000 }
 * );
 *
 * // Dynamic key based on reactive value
 * const userId = pulse(1);
 * const user = useResource(
 *   () => `user-${userId.get()}`,
 *   () => fetch(`/api/users/${userId.get()}`).then(r => r.json())
 * );
 */
export function useResource(key, fetcher, options = {}) {
  const {
    refreshInterval,
    refreshOnFocus = false,
    refreshOnReconnect = false,
    initialData = null,
    onError,
    staleTime = 0,
    cacheTime = 300000
  } = options;

  const data = pulse(initialData);
  const error = pulse(null);
  const loading = pulse(false);
  const isStale = pulse(false);
  const isValidating = pulse(false);
  const lastFetchTime = pulse(0);

  let intervalId = null;
  let currentKey = null;

  /**
   * Get the current cache key
   */
  function getCacheKey() {
    return typeof key === 'function' ? key() : key;
  }

  /**
   * Get cached data if available and not expired
   */
  function getCachedData() {
    const cacheKey = getCacheKey();
    const cached = resourceCache.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cacheTime) {
        return {
          data: cached.data,
          isStale: age > staleTime
        };
      }
      // Expired, remove from cache
      resourceCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Update cache with new data
   */
  function updateCache(newData) {
    const cacheKey = getCacheKey();
    resourceCache.set(cacheKey, {
      data: newData,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch fresh data
   */
  async function fetch() {
    const cacheKey = getCacheKey();
    currentKey = cacheKey;

    // Check cache first
    const cached = getCachedData();
    if (cached && !cached.isStale) {
      batch(() => {
        data.set(cached.data);
        isStale.set(false);
        lastFetchTime.set(resourceCache.get(cacheKey)?.timestamp || 0);
      });
      return cached.data;
    }

    // Show cached data immediately if stale (stale-while-revalidate)
    if (cached && cached.isStale) {
      batch(() => {
        data.set(cached.data);
        isStale.set(true);
        isValidating.set(true);
      });
    } else {
      loading.set(true);
    }

    try {
      const result = await fetcher();

      // Check if key changed during fetch
      if (cacheKey !== currentKey) {
        return null;
      }

      updateCache(result);

      batch(() => {
        data.set(result);
        error.set(null);
        loading.set(false);
        isStale.set(false);
        isValidating.set(false);
        lastFetchTime.set(Date.now());
      });

      return result;
    } catch (err) {
      if (cacheKey !== currentKey) {
        return null;
      }

      batch(() => {
        error.set(err);
        loading.set(false);
        isValidating.set(false);
      });

      if (onError) onError(err);
      return null;
    }
  }

  /**
   * Force refresh, ignoring cache
   */
  async function refresh() {
    const cacheKey = getCacheKey();
    resourceCache.delete(cacheKey);
    return fetch();
  }

  /**
   * Mutate data optimistically
   */
  function mutate(newData, shouldRevalidate = false) {
    const cacheKey = getCacheKey();
    const resolvedData = typeof newData === 'function' ? newData(data.get()) : newData;

    updateCache(resolvedData);
    data.set(resolvedData);

    if (shouldRevalidate) {
      isStale.set(true);
      fetch();
    }
  }

  /**
   * Clear cache for this resource
   */
  function invalidate() {
    const cacheKey = getCacheKey();
    resourceCache.delete(cacheKey);
    isStale.set(true);
  }

  // Setup auto-refresh interval
  if (refreshInterval && refreshInterval > 0) {
    intervalId = setInterval(() => {
      if (!loading.get() && !isValidating.get()) {
        fetch();
      }
    }, refreshInterval);

    onCleanup(() => {
      if (intervalId) clearInterval(intervalId);
    });
  }

  // Setup window focus listener
  if (refreshOnFocus && typeof window !== 'undefined') {
    const handleFocus = () => {
      const cached = getCachedData();
      if (!cached || cached.isStale) {
        fetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    onCleanup(() => window.removeEventListener('focus', handleFocus));
  }

  // Setup online listener
  if (refreshOnReconnect && typeof window !== 'undefined') {
    const handleOnline = () => {
      fetch();
    };

    window.addEventListener('online', handleOnline);
    onCleanup(() => window.removeEventListener('online', handleOnline));
  }

  // Watch for key changes if key is a function
  if (typeof key === 'function') {
    effect(() => {
      const newKey = key();
      if (newKey !== currentKey) {
        fetch();
      }
    });
  } else {
    // Initial fetch
    fetch();
  }

  return {
    data,
    error,
    loading,
    isStale,
    isValidating,
    lastFetchTime,
    fetch,
    refresh,
    mutate,
    invalidate
  };
}

/**
 * @typedef {Object} PollingOptions
 * @property {number} interval - Polling interval in ms
 * @property {boolean} [immediate=true] - Execute immediately on start
 * @property {boolean} [pauseOnHidden=true] - Pause when page is hidden
 * @property {boolean} [pauseOnOffline=true] - Pause when offline
 * @property {number} [maxErrors=3] - Max consecutive errors before stopping
 * @property {function(Error): void} [onError] - Error callback
 */

/**
 * Create a polling mechanism for repeated async operations.
 *
 * @template T
 * @param {function(): Promise<T>} asyncFn - Async function to poll
 * @param {PollingOptions} options - Polling configuration
 * @returns {Object} Polling controls and state
 *
 * @example
 * const { data, start, stop, isPolling } = usePolling(
 *   () => fetch('/api/status').then(r => r.json()),
 *   { interval: 5000, pauseOnHidden: true }
 * );
 *
 * // Start polling
 * start();
 *
 * // Stop when done
 * stop();
 */
export function usePolling(asyncFn, options) {
  const {
    interval,
    immediate = true,
    pauseOnHidden = true,
    pauseOnOffline = true,
    maxErrors = 3,
    onError
  } = options;

  const data = pulse(null);
  const error = pulse(null);
  const isPolling = pulse(false);
  const errorCount = pulse(0);

  let intervalId = null;
  let isPaused = false;

  async function poll() {
    if (isPaused || !isPolling.get()) return;

    try {
      const result = await asyncFn();
      batch(() => {
        data.set(result);
        error.set(null);
        errorCount.set(0);
      });
    } catch (err) {
      const newCount = errorCount.get() + 1;
      batch(() => {
        error.set(err);
        errorCount.set(newCount);
      });

      if (onError) onError(err);

      // Stop polling after max consecutive errors
      if (newCount >= maxErrors) {
        stop();
      }
    }
  }

  function start() {
    if (intervalId) return;

    isPolling.set(true);
    errorCount.set(0);

    if (immediate) {
      poll();
    }

    intervalId = setInterval(poll, interval);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isPolling.set(false);
  }

  function pause() {
    isPaused = true;
  }

  function resume() {
    isPaused = false;
  }

  // Page visibility handling
  if (pauseOnHidden && typeof document !== 'undefined') {
    const handleVisibility = () => {
      if (document.hidden) {
        pause();
      } else {
        resume();
        // Immediately poll when becoming visible
        if (isPolling.get()) poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    onCleanup(() => document.removeEventListener('visibilitychange', handleVisibility));
  }

  // Online/offline handling
  if (pauseOnOffline && typeof window !== 'undefined') {
    const handleOffline = () => pause();
    const handleOnline = () => {
      resume();
      if (isPolling.get()) poll();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    onCleanup(() => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    });
  }

  // Cleanup on unmount
  onCleanup(stop);

  return {
    data,
    error,
    isPolling,
    errorCount,
    start,
    stop,
    pause,
    resume
  };
}

/**
 * Clear the entire resource cache
 */
export function clearResourceCache() {
  resourceCache.clear();
}

/**
 * Get resource cache statistics
 * @returns {{size: number, keys: string[]}}
 */
export function getResourceCacheStats() {
  return {
    size: resourceCache.size,
    keys: [...resourceCache.keys()]
  };
}

export default {
  useAsync,
  useResource,
  usePolling,
  clearResourceCache,
  getResourceCacheStats
};
