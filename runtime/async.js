/**
 * Pulse Async Primitives
 * @module pulse-js-framework/runtime/async
 *
 * Reactive primitives for handling asynchronous operations like
 * data fetching, polling, and async state management.
 */

import { pulse, effect, batch, onCleanup } from './pulse.js';
import { getSSRAsyncContext, registerAsync, getCachedAsync, hasCachedAsync } from './ssr-async.js';

// ============================================================================
// Versioned Async - Centralized Race Condition Handling
// ============================================================================

/**
 * @typedef {Object} VersionedContext
 * @property {function(): boolean} isCurrent - Check if this operation is still valid
 * @property {function(): boolean} isStale - Check if this operation has been superseded
 * @property {function(function): *} ifCurrent - Run callback only if still current
 * @property {function(function, number): number} setTimeout - Register a timeout that auto-clears on abort
 * @property {function(function, number): number} setInterval - Register an interval that auto-clears on abort
 * @property {function(number): void} clearTimeout - Clear a registered timeout
 * @property {function(number): void} clearInterval - Clear a registered interval
 */

/**
 * @typedef {Object} VersionedAsyncController
 * @property {function(): VersionedContext} begin - Start a new versioned operation
 * @property {function(): void} abort - Abort the current operation
 * @property {function(): number} getVersion - Get current version number
 * @property {function(): void} cleanup - Clean up all timers
 */

/**
 * Create a versioned async controller for race condition handling.
 *
 * This utility provides a centralized way to handle async race conditions
 * by tracking operation versions. When a new operation starts, it invalidates
 * any previous operations, preventing stale callbacks from executing.
 *
 * Use cases:
 * - Preventing stale fetch responses from updating UI after navigation
 * - Handling rapid user input that triggers multiple async operations
 * - Managing lazy-loaded components during route changes
 * - Any scenario where multiple async operations might overlap
 *
 * @param {Object} [options={}] - Configuration options
 * @param {function(): void} [options.onAbort] - Callback invoked when operation is aborted
 * @returns {VersionedAsyncController} Controller for managing versioned async operations
 *
 * @example
 * // Basic usage
 * const controller = createVersionedAsync();
 *
 * async function fetchData() {
 *   const ctx = controller.begin();
 *
 *   const response = await fetch('/api/data');
 *   const data = await response.json();
 *
 *   // Only update state if this operation is still current
 *   ctx.ifCurrent(() => {
 *     setState(data);
 *   });
 * }
 *
 * @example
 * // With timeout handling
 * const controller = createVersionedAsync();
 *
 * function lazyLoad() {
 *   const ctx = controller.begin();
 *
 *   // Timer automatically clears if operation is aborted
 *   ctx.setTimeout(() => {
 *     ctx.ifCurrent(() => showLoading());
 *   }, 200);
 *
 *   loadComponent().then(component => {
 *     ctx.ifCurrent(() => render(component));
 *   });
 * }
 *
 * // Abort on navigation
 * onNavigate(() => controller.abort());
 *
 * @example
 * // Manual staleness check
 * const controller = createVersionedAsync();
 *
 * async function search(query) {
 *   const ctx = controller.begin();
 *
 *   const results = await searchApi(query);
 *
 *   if (ctx.isStale()) {
 *     return null; // Newer search was started
 *   }
 *
 *   return results;
 * }
 */
export function createVersionedAsync(options = {}) {
  const { onAbort } = options;

  let version = 0;
  let aborted = false;
  const timeouts = new Set();
  const intervals = new Set();

  /**
   * Start a new versioned operation.
   * Invalidates any previous operations and returns a context
   * for checking validity and managing timers.
   *
   * @returns {VersionedContext} Context for the new operation
   */
  function begin() {
    aborted = false;
    const currentVersion = ++version;

    // Clear any pending timers from previous operations
    timeouts.forEach(clearTimeout);
    timeouts.clear();
    intervals.forEach(clearInterval);
    intervals.clear();

    return {
      /**
       * Check if this operation is still the current one.
       * Returns false if abort() was called or a new begin() was called.
       * @returns {boolean}
       */
      isCurrent() {
        return !aborted && currentVersion === version;
      },

      /**
       * Check if this operation has been superseded.
       * Inverse of isCurrent() for readability.
       * @returns {boolean}
       */
      isStale() {
        return aborted || currentVersion !== version;
      },

      /**
       * Execute a callback only if this operation is still current.
       * Useful for safely updating state after async operations.
       *
       * @template T
       * @param {function(): T} fn - Function to execute if current
       * @returns {T|undefined} Result of fn or undefined if stale
       */
      ifCurrent(fn) {
        if (!aborted && currentVersion === version) {
          return fn();
        }
        return undefined;
      },

      /**
       * Set a timeout that automatically clears when the operation
       * becomes stale (either by abort or new begin).
       *
       * @param {function(): void} fn - Callback to execute
       * @param {number} ms - Delay in milliseconds
       * @returns {number} Timer ID
       */
      setTimeout(fn, ms) {
        const id = setTimeout(() => {
          timeouts.delete(id);
          if (!aborted && currentVersion === version) {
            fn();
          }
        }, ms);
        timeouts.add(id);
        return id;
      },

      /**
       * Set an interval that automatically clears when the operation
       * becomes stale.
       *
       * @param {function(): void} fn - Callback to execute
       * @param {number} ms - Interval in milliseconds
       * @returns {number} Timer ID
       */
      setInterval(fn, ms) {
        const id = setInterval(() => {
          if (!aborted && currentVersion === version) {
            fn();
          } else {
            clearInterval(id);
            intervals.delete(id);
          }
        }, ms);
        intervals.add(id);
        return id;
      },

      /**
       * Clear a specific timeout registered with this context.
       * @param {number} id - Timer ID to clear
       */
      clearTimeout(id) {
        clearTimeout(id);
        timeouts.delete(id);
      },

      /**
       * Clear a specific interval registered with this context.
       * @param {number} id - Timer ID to clear
       */
      clearInterval(id) {
        clearInterval(id);
        intervals.delete(id);
      }
    };
  }

  /**
   * Abort the current operation.
   * Marks all active operations as stale and clears pending timers.
   */
  function abort() {
    aborted = true;
    version++;

    // Clear all pending timers
    timeouts.forEach(clearTimeout);
    timeouts.clear();
    intervals.forEach(clearInterval);
    intervals.clear();

    if (onAbort) {
      onAbort();
    }
  }

  /**
   * Get the current version number.
   * Useful for advanced use cases or debugging.
   * @returns {number}
   */
  function getVersion() {
    return version;
  }

  /**
   * Clean up all timers without aborting.
   * Call this when disposing of the controller.
   */
  function cleanup() {
    timeouts.forEach(clearTimeout);
    timeouts.clear();
    intervals.forEach(clearInterval);
    intervals.clear();
  }

  return {
    begin,
    abort,
    getVersion,
    cleanup
  };
}

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
 * Uses createVersionedAsync internally for race condition handling.
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

  // SSR MODE: Check for cached data or register async operation
  const ssrCtx = getSSRAsyncContext();
  if (ssrCtx) {
    // Check if we already have cached data (second render pass)
    if (hasCachedAsync(asyncFn)) {
      const cachedData = getCachedAsync(asyncFn);
      return {
        data: pulse(cachedData),
        error: pulse(null),
        loading: pulse(false),
        status: pulse('success'),
        execute: () => Promise.resolve(cachedData),
        reset: () => {},
        abort: () => {}
      };
    }

    // First render pass: register async operation for collection
    if (immediate) {
      const promise = asyncFn().catch(err => {
        // Store error for SSR error handling
        return null;
      });
      registerAsync(asyncFn, promise);
    }

    // Return loading state for first pass
    return {
      data: pulse(initialData),
      error: pulse(null),
      loading: pulse(true),
      status: pulse('loading'),
      execute: () => Promise.resolve(initialData),
      reset: () => {},
      abort: () => {}
    };
  }

  const data = pulse(initialData);
  const error = pulse(null);
  const loading = pulse(false);
  const status = pulse('idle');

  // Use centralized versioned async for race condition handling
  const versionController = createVersionedAsync();

  /**
   * Execute the async function
   * @param {...any} args - Arguments to pass to asyncFn
   * @returns {Promise<T|null>} The resolved data or null on error
   */
  async function execute(...args) {
    const ctx = versionController.begin();
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
        if (ctx.isStale()) {
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
        if (attempt <= retries && ctx.isCurrent()) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // Check if this execution is still current
        if (ctx.isStale()) {
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
    versionController.abort();
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
    versionController.abort();
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

  // Use centralized versioned async for race condition handling
  const versionController = createVersionedAsync();

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
    const ctx = versionController.begin();

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

      // Check if fetch was superseded (key changed or aborted)
      if (ctx.isStale()) {
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
      if (ctx.isStale()) {
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

  // Track current key for change detection
  let lastKey = null;

  // Watch for key changes if key is a function
  if (typeof key === 'function') {
    effect(() => {
      const newKey = key();
      if (newKey !== lastKey) {
        lastKey = newKey;
        fetch();
      }
    });
  } else {
    // Initial fetch
    lastKey = key;
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
  createVersionedAsync,
  useAsync,
  useResource,
  usePolling,
  clearResourceCache,
  getResourceCacheStats
};
