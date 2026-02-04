/**
 * Pulse SSR Async Context - Async operation collection for SSR
 *
 * Collects and manages async operations during server-side rendering.
 * Enables data prefetching before HTML generation.
 */

// ============================================================================
// SSR Async Context
// ============================================================================

/**
 * Context for collecting async operations during SSR.
 * Tracks pending promises and caches resolved data for re-renders.
 */
export class SSRAsyncContext {
  constructor() {
    /** @type {Array<{key: any, promise: Promise}>} */
    this.pending = [];

    /** @type {Map<any, any>} */
    this.resolved = new Map();

    /** @type {Map<any, Error>} */
    this.errors = new Map();

    /** @type {boolean} */
    this.collecting = true;
  }

  /**
   * Register an async operation for collection.
   * @param {any} key - Unique key for this operation (usually the async function)
   * @param {Promise} promise - The promise to track
   */
  register(key, promise) {
    if (!this.collecting) return;

    // Wrap promise to capture result
    const tracked = promise
      .then(data => {
        this.resolved.set(key, data);
        return data;
      })
      .catch(error => {
        this.errors.set(key, error);
        throw error;
      });

    this.pending.push({ key, promise: tracked });
  }

  /**
   * Check if a result is already cached.
   * @param {any} key - Operation key
   * @returns {boolean} True if result is cached
   */
  has(key) {
    return this.resolved.has(key);
  }

  /**
   * Get cached result for a key.
   * @param {any} key - Operation key
   * @returns {any} Cached result or undefined
   */
  get(key) {
    return this.resolved.get(key);
  }

  /**
   * Get error for a key (if the operation failed).
   * @param {any} key - Operation key
   * @returns {Error|undefined} Error or undefined
   */
  getError(key) {
    return this.errors.get(key);
  }

  /**
   * Wait for all pending async operations to complete.
   * @param {number} [timeout=5000] - Maximum wait time in ms
   * @returns {Promise<void>}
   * @throws {Error} If timeout is exceeded
   */
  async waitAll(timeout = 5000) {
    if (this.pending.length === 0) return;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`[Pulse SSR] Async operations timed out after ${timeout}ms`));
      }, timeout);
    });

    // Wait for all promises, catching individual errors
    const allSettled = Promise.all(
      this.pending.map(p => p.promise.catch(() => null))
    );

    await Promise.race([allSettled, timeoutPromise]);

    // Stop collecting after wait
    this.collecting = false;
  }

  /**
   * Get the number of pending operations.
   * @returns {number}
   */
  get pendingCount() {
    return this.pending.length;
  }

  /**
   * Get the number of resolved operations.
   * @returns {number}
   */
  get resolvedCount() {
    return this.resolved.size;
  }

  /**
   * Get the number of failed operations.
   * @returns {number}
   */
  get errorCount() {
    return this.errors.size;
  }

  /**
   * Get all resolved data as a plain object.
   * @returns {Object} Map of key → value
   */
  getAllResolved() {
    const result = {};
    for (const [key, value] of this.resolved) {
      // Use string key if function, otherwise try to serialize
      const keyStr = typeof key === 'function' ? key.name || 'anonymous' : String(key);
      result[keyStr] = value;
    }
    return result;
  }

  /**
   * Reset the context for a new render pass.
   */
  reset() {
    this.pending = [];
    this.resolved.clear();
    this.errors.clear();
    this.collecting = true;
  }
}

// ============================================================================
// Global SSR Async Context
// ============================================================================

/** @type {SSRAsyncContext|null} */
let ssrAsyncContext = null;

/**
 * Get the current SSR async context.
 * Returns null if not in SSR mode.
 * @returns {SSRAsyncContext|null}
 */
export function getSSRAsyncContext() {
  return ssrAsyncContext;
}

/**
 * Set the SSR async context.
 * @param {SSRAsyncContext|null} ctx - Context to set, or null to clear
 */
export function setSSRAsyncContext(ctx) {
  ssrAsyncContext = ctx;
}

/**
 * Check if currently in SSR async collection mode.
 * @returns {boolean}
 */
export function isCollectingAsync() {
  return ssrAsyncContext !== null && ssrAsyncContext.collecting;
}

/**
 * Register an async operation in the current SSR context.
 * No-op if not in SSR mode.
 * @param {any} key - Unique key for this operation
 * @param {Promise} promise - The promise to track
 */
export function registerAsync(key, promise) {
  if (ssrAsyncContext) {
    ssrAsyncContext.register(key, promise);
  }
}

/**
 * Get cached async result from current SSR context.
 * @param {any} key - Operation key
 * @returns {any} Cached result or undefined
 */
export function getCachedAsync(key) {
  return ssrAsyncContext?.get(key);
}

/**
 * Check if an async result is cached in current SSR context.
 * @param {any} key - Operation key
 * @returns {boolean}
 */
export function hasCachedAsync(key) {
  return ssrAsyncContext?.has(key) ?? false;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  SSRAsyncContext,
  getSSRAsyncContext,
  setSSRAsyncContext,
  isCollectingAsync,
  registerAsync,
  getCachedAsync,
  hasCachedAsync
};
