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
  let locked = false;
  const queue = [];

  return {
    /**
     * Execute function with exclusive lock
     *
     * @param {Function} fn - Function to execute (can be async)
     * @returns {Promise<any>} Result of the function
     */
    async lock(fn) {
      // Wait for lock to become available
      while (locked) {
        await new Promise(resolve => queue.push(resolve));
      }

      // Acquire lock
      locked = true;

      try {
        // Execute critical section
        return await fn();
      } finally {
        // Release lock
        locked = false;

        // Wake up next waiter
        const next = queue.shift();
        if (next) {
          next();
        }
      }
    }
  };
}

export default { createMutex };
