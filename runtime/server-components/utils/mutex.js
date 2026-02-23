/**
 * Simple Mutex (Mutual Exclusion) Lock
 *
 * Provides exclusive access to critical sections to prevent race conditions.
 * Uses a queue-based approach with promises for async/await compatibility.
 *
 * @module pulse-js-framework/runtime/server-components/utils/mutex
 */

/**
 * Create a mutex lock for protecting critical sections
 *
 * @returns {Object} Mutex instance with lock() method
 *
 * @example
 * const mutex = createMutex();
 *
 * await mutex.lock(async () => {
 *   // Critical section - only one caller at a time
 *   await someAsyncOperation();
 * });
 */
export function createMutex() {
  // Promise-chain pattern: the ONLY correct way to implement mutex in JavaScript
  // Each lock() captures the current chain, updates it to their own promise,
  // then waits for the previous chain before executing
  let chain = Promise.resolve();

  return {
    /**
     * Execute function with exclusive lock
     *
     * @param {Function} fn - Function to execute (can be async)
     * @returns {Promise<any>} Result of the function
     */
    lock(fn) {
      // Create completion promise
      let unlock;
      const ready = new Promise(resolve => {
        unlock = resolve;
      });

      // CRITICAL: These two lines MUST be synchronous (no await between them)
      // to prevent race conditions
      const prevChain = chain;  // Capture current chain
      chain = ready;             // Update chain to our promise

      // Return a promise that waits for previous, executes, then unlocks
      return prevChain.then(async () => {
        try {
          return await fn();
        } finally {
          unlock();  // Release next waiter
        }
      });
    }
  };
}

export default { createMutex };
