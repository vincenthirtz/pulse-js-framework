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
  const queue = [];
  let running = false;

  async function processQueue() {
    // If already running, don't start another processor
    if (running) return;

    // Mark as running
    running = true;

    // Process queue one task at a time
    while (queue.length > 0) {
      const task = queue.shift();
      await task();
    }

    // Mark as not running
    running = false;
  }

  return {
    /**
     * Execute function with exclusive lock
     *
     * @param {Function} fn - Function to execute (can be async)
     * @returns {Promise<any>} Result of the function
     */
    async lock(fn) {
      // Wrap the function call in a promise we control
      return new Promise((resolve, reject) => {
        // Enqueue our task
        queue.push(async () => {
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        // Start processing queue (will skip if already running)
        processQueue();
      });
    }
  };
}

export default { createMutex };
