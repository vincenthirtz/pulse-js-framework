/**
 * Pulse Framework - Interceptor Manager
 *
 * Shared interceptor management for HTTP, WebSocket, and GraphQL clients.
 * Provides a generic pattern for request/response/message interception.
 *
 * @module runtime/interceptor-manager
 */

// ============================================================================
// Interceptor Manager
// ============================================================================

/**
 * Generic interceptor manager for request/response pipelines.
 * Used by HTTP client, WebSocket client, and GraphQL client.
 *
 * @example
 * // HTTP-style interceptors (fulfilled/rejected)
 * const requestInterceptors = new InterceptorManager();
 * const id = requestInterceptors.use(
 *   (config) => ({ ...config, timestamp: Date.now() }),
 *   (error) => Promise.reject(error)
 * );
 *
 * // Process through interceptor chain
 * for (const { fulfilled, rejected } of requestInterceptors) {
 *   config = await fulfilled(config);
 * }
 *
 * @example
 * // WebSocket-style interceptors (onMessage/onError)
 * const messageInterceptors = new InterceptorManager({
 *   handlerKeys: ['onMessage', 'onError']
 * });
 * messageInterceptors.use(
 *   (data) => ({ ...data, received: Date.now() }),
 *   (err) => console.error('Parse error:', err)
 * );
 */
class InterceptorManager {
  #handlers = new Map();
  #idCounter = 0;
  #primaryKey;
  #secondaryKey;

  /**
   * Create an interceptor manager
   * @param {Object} [options] - Configuration options
   * @param {string[]} [options.handlerKeys=['fulfilled', 'rejected']] - Property names for handlers
   */
  constructor(options = {}) {
    const keys = options.handlerKeys || ['fulfilled', 'rejected'];
    this.#primaryKey = keys[0];
    this.#secondaryKey = keys[1] || null;
  }

  /**
   * Add an interceptor to the chain
   * @param {Function} primary - Primary handler (success/transform function)
   * @param {Function} [secondary] - Secondary handler (error/fallback function)
   * @returns {number} Interceptor ID for later removal
   */
  use(primary, secondary) {
    const id = this.#idCounter++;
    const handler = { [this.#primaryKey]: primary };
    if (this.#secondaryKey) {
      handler[this.#secondaryKey] = secondary;
    }
    this.#handlers.set(id, handler);
    return id;
  }

  /**
   * Remove an interceptor by ID
   * @param {number} id - The interceptor ID returned from use()
   * @returns {boolean} True if the interceptor was removed
   */
  eject(id) {
    return this.#handlers.delete(id);
  }

  /**
   * Remove all interceptors
   */
  clear() {
    this.#handlers.clear();
  }

  /**
   * Get the number of registered interceptors
   * @returns {number}
   */
  get size() {
    return this.#handlers.size;
  }

  /**
   * Check if manager has any interceptors
   * @returns {boolean}
   */
  get isEmpty() {
    return this.#handlers.size === 0;
  }

  /**
   * Get all handler IDs
   * @returns {number[]}
   */
  get ids() {
    return [...this.#handlers.keys()];
  }

  /**
   * Iterate through all handlers
   * @yields {Object} Handler object with primary and secondary functions
   */
  *[Symbol.iterator]() {
    for (const handler of this.#handlers.values()) {
      yield handler;
    }
  }

  /**
   * Get handlers as array (for pipeline processing)
   * @returns {Object[]}
   */
  toArray() {
    return [...this.#handlers.values()];
  }

  /**
   * Run a value through all interceptors (async pipeline)
   * Executes each interceptor's primary handler in sequence.
   * If any handler throws, the secondary handler is called if available.
   *
   * @param {*} value - Initial value to process
   * @returns {Promise<*>} Processed value after all interceptors
   */
  async run(value) {
    let result = value;
    for (const handler of this.#handlers.values()) {
      try {
        const fn = handler[this.#primaryKey];
        if (typeof fn === 'function') {
          result = await fn(result);
        }
      } catch (error) {
        const errorFn = handler[this.#secondaryKey];
        if (typeof errorFn === 'function') {
          result = await errorFn(error);
        } else {
          throw error;
        }
      }
    }
    return result;
  }

  /**
   * Run a value through all interceptors (sync pipeline)
   * @param {*} value - Initial value to process
   * @returns {*} Processed value after all interceptors
   */
  runSync(value) {
    let result = value;
    for (const handler of this.#handlers.values()) {
      try {
        const fn = handler[this.#primaryKey];
        if (typeof fn === 'function') {
          result = fn(result);
        }
      } catch (error) {
        const errorFn = handler[this.#secondaryKey];
        if (typeof errorFn === 'function') {
          result = errorFn(error);
        } else {
          throw error;
        }
      }
    }
    return result;
  }
}

// ============================================================================
// Specialized Interceptor Managers
// ============================================================================

/**
 * Message interceptor manager pre-configured for WebSocket-style interception.
 * Uses 'onMessage' and 'onError' as handler property names.
 *
 * @example
 * const manager = new MessageInterceptorManager();
 * manager.use(
 *   (data) => ({ ...data, timestamp: Date.now() }),
 *   (err) => console.error('Error:', err)
 * );
 *
 * for (const { onMessage, onError } of manager) {
 *   data = onMessage(data);
 * }
 */
class MessageInterceptorManager extends InterceptorManager {
  constructor() {
    super({ handlerKeys: ['onMessage', 'onError'] });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an interceptor manager for HTTP-style request/response interception
 * @returns {InterceptorManager}
 */
function createRequestInterceptors() {
  return new InterceptorManager({ handlerKeys: ['fulfilled', 'rejected'] });
}

/**
 * Create an interceptor manager for WebSocket-style message interception
 * @returns {InterceptorManager}
 */
function createMessageInterceptors() {
  return new InterceptorManager({ handlerKeys: ['onMessage', 'onError'] });
}

// ============================================================================
// Exports
// ============================================================================

export {
  InterceptorManager,
  MessageInterceptorManager,
  createRequestInterceptors,
  createMessageInterceptors
};

export default InterceptorManager;
