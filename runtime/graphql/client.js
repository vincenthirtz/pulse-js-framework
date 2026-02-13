/**
 * Pulse GraphQL - Core Client
 *
 * GraphQL client with error handling, HTTP requests, and interceptors
 *
 * @module pulse-js-framework/runtime/graphql/client
 */

import { pulse, computed, batch } from '../pulse.js';
import { createHttp, HttpError } from '../http.js';
import { ClientError } from '../errors.js';
import { LRUCache } from '../lru-cache.js';
import { InterceptorManager } from '../interceptor-manager.js';
import { onWindowFocus, onWindowOnline } from '../utils.js';
import { generateCacheKey, extractOperationName } from './cache.js';

// ============================================================================
// GraphQL Error Class
// ============================================================================

/**
 * Error class for GraphQL operations.
 * Extends ClientError for consistent error handling patterns.
 */
export class GraphQLError extends ClientError {
  static suggestions = {
    GRAPHQL_ERROR: 'Check the GraphQL errors array for specific field errors.',
    NETWORK_ERROR: 'Verify network connectivity and GraphQL endpoint URL.',
    PARSE_ERROR: 'The response was not valid GraphQL JSON. Check server configuration.',
    TIMEOUT: 'Request timed out. Consider increasing timeout or optimizing query.',
    AUTHENTICATION_ERROR: 'Authentication required. Check your credentials or token.',
    AUTHORIZATION_ERROR: 'Insufficient permissions for this operation.',
    VALIDATION_ERROR: 'Invalid input provided. Check variables match schema types.',
    SUBSCRIPTION_ERROR: 'WebSocket subscription failed. Check connection status.'
  };

  static errorName = 'GraphQLError';
  static defaultCode = 'GRAPHQL_ERROR';
  static markerProperty = 'isGraphQLError';

  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {string} [options.code] - Error code
   * @param {Array} [options.errors] - GraphQL errors array from response
   * @param {*} [options.data] - Partial data from response
   * @param {Object} [options.extensions] - GraphQL extensions
   * @param {Object} [options.response] - Full HTTP response
   * @param {Object} [options.request] - Request configuration
   */
  constructor(message, options = {}) {
    super(message, options);
    this.errors = options.errors || [];
    this.data = options.data ?? null;
    this.extensions = options.extensions || {};
    this.response = options.response || null;
    this.request = options.request || null;
  }

  /**
   * Check if error is a GraphQLError
   * @param {*} error - Error to check
   * @returns {boolean}
   */
  static isGraphQLError(error) {
    return error?.isGraphQLError === true || error instanceof GraphQLError;
  }

  /**
   * Check if response has partial data along with errors
   * @returns {boolean}
   */
  hasPartialData() {
    return this.data !== null && this.data !== undefined;
  }

  /**
   * Check if this is an authentication error
   * @returns {boolean}
   */
  isAuthenticationError() {
    return this.code === 'AUTHENTICATION_ERROR' ||
      this.errors.some(e => e.extensions?.code === 'UNAUTHENTICATED');
  }

  /**
   * Check if this is an authorization error
   * @returns {boolean}
   */
  isAuthorizationError() {
    return this.code === 'AUTHORIZATION_ERROR' ||
      this.errors.some(e => e.extensions?.code === 'FORBIDDEN');
  }

  /**
   * Check if this is a validation error
   * @returns {boolean}
   */
  isValidationError() {
    return this.code === 'VALIDATION_ERROR' ||
      this.errors.some(e => e.extensions?.code === 'BAD_USER_INPUT');
  }

  /**
   * Get the first error message from GraphQL errors
   * @returns {string|null}
   */
  getFirstError() {
    return this.errors[0]?.message || null;
  }

  /**
   * Get all error messages
   * @returns {string[]}
   */
  getAllErrors() {
    return this.errors.map(e => e.message);
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      errors: this.errors,
      data: this.data,
      extensions: this.extensions
    };
  }
}

// ============================================================================
// GraphQL Client
// ============================================================================

/**
 * GraphQL Client class
 */
export class GraphQLClient {
  #http;
  #ws = null;
  #subscriptionManager = null;
  #options;
  #inflightQueries = new Map();
  // LRU cache to prevent unbounded memory growth (default 500 entries)
  #cache;

  /**
   * Request interceptors
   */
  interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };

  /**
   * @param {Object} options - Client options
   */
  constructor(options = {}) {
    if (!options.url) {
      throw new GraphQLError('GraphQL client requires a url option', {
        code: 'GRAPHQL_ERROR'
      });
    }

    this.#options = {
      url: options.url,
      wsUrl: options.wsUrl || this.#deriveWsUrl(options.url),
      headers: options.headers || {},
      timeout: options.timeout ?? 30000,
      credentials: options.credentials || 'same-origin',
      retries: options.retries ?? 0,
      retryDelay: options.retryDelay ?? 1000,
      wsConnectionParams: options.wsConnectionParams,
      wsReconnect: options.wsReconnect ?? true,
      wsMaxRetries: options.wsMaxRetries ?? 5,
      cache: options.cache ?? true,
      cacheTime: options.cacheTime ?? 300000,
      cacheMaxSize: options.cacheMaxSize ?? 500,
      staleTime: options.staleTime ?? 0,
      dedupe: options.dedupe ?? true,
      throwOnError: options.throwOnError ?? true,
      onError: options.onError
    };

    // Initialize LRU cache to prevent unbounded memory growth
    this.#cache = new LRUCache(this.#options.cacheMaxSize);

    // Create HTTP client for queries/mutations
    this.#http = createHttp({
      baseURL: '',
      timeout: this.#options.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.#options.headers
      },
      withCredentials: this.#options.credentials === 'include',
      retries: this.#options.retries,
      retryDelay: this.#options.retryDelay
    });
  }

  /**
   * Derive WebSocket URL from HTTP URL
   * @param {string} url - HTTP URL
   * @returns {string} WebSocket URL
   */
  #deriveWsUrl(url) {
    try {
      const parsed = new URL(url, globalThis.location?.origin || 'http://localhost');
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return parsed.toString();
    } catch {
      return url.replace(/^http/, 'ws');
    }
  }

  /**
   * Initialize WebSocket for subscriptions (lazy)
   */
  #initWebSocket() {
    if (this.#ws) return;

    this.#ws = createWebSocket(this.#options.wsUrl, {
      protocols: ['graphql-transport-ws'],
      reconnect: this.#options.wsReconnect,
      maxRetries: this.#options.wsMaxRetries,
      autoConnect: false,
      autoParseJson: true,
      queueWhileDisconnected: true
    });

    this.#subscriptionManager = new SubscriptionManager(
      this.#ws,
      this.#options.wsConnectionParams
    );
  }

  /**
   * Execute a GraphQL operation
   * @param {string} query - GraphQL query/mutation
   * @param {Object} [variables] - Variables
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Response data
   */
  async #execute(query, variables, options = {}) {
    const operationName = extractOperationName(query);

    let config = {
      query,
      variables,
      operationName,
      ...options
    };

    // Run request interceptors
    for (const interceptor of this.interceptors.request) {
      if (interceptor.fulfilled) {
        try {
          config = await interceptor.fulfilled(config);
        } catch (err) {
          if (interceptor.rejected) {
            config = await interceptor.rejected(err);
          } else {
            throw err;
          }
        }
      }
    }

    try {
      const response = await this.#http.post(this.#options.url, {
        query: config.query,
        variables: config.variables,
        operationName: config.operationName
      });

      let result = response.data;

      // Run response interceptors
      for (const interceptor of this.interceptors.response) {
        if (interceptor.fulfilled) {
          try {
            result = await interceptor.fulfilled(result);
          } catch (err) {
            if (interceptor.rejected) {
              result = await interceptor.rejected(err);
            } else {
              throw err;
            }
          }
        }
      }

      return this.#processResponse(result, config);
    } catch (error) {
      // Convert HTTP errors to GraphQL errors
      if (HttpError.isHttpError(error)) {
        const graphqlError = new GraphQLError(error.message, {
          code: error.isTimeout() ? 'TIMEOUT' : error.isNetworkError() ? 'NETWORK_ERROR' : 'GRAPHQL_ERROR',
          request: config
        });
        this.#options.onError?.(graphqlError);
        throw graphqlError;
      }
      throw error;
    }
  }

  /**
   * Process GraphQL response
   * @param {Object} response - GraphQL response
   * @param {Object} config - Request config
   * @returns {*} Response data
   */
  #processResponse(response, config) {
    const { data, errors, extensions } = response;

    // No errors - return data
    if (!errors || errors.length === 0) {
      return data;
    }

    // Has errors
    const error = new GraphQLError(errors[0].message, {
      code: this.#mapErrorCode(errors[0]),
      errors,
      data,
      extensions,
      request: config
    });

    this.#options.onError?.(error);

    if (this.#options.throwOnError) {
      throw error;
    }

    // Return data even with errors if throwOnError is false
    return data;
  }

  /**
   * Map GraphQL error to error code
   * @param {Object} error - GraphQL error
   * @returns {string} Error code
   */
  #mapErrorCode(error) {
    const code = error.extensions?.code;
    switch (code) {
      case 'UNAUTHENTICATED': return 'AUTHENTICATION_ERROR';
      case 'FORBIDDEN': return 'AUTHORIZATION_ERROR';
      case 'BAD_USER_INPUT': return 'VALIDATION_ERROR';
      case 'INTERNAL_SERVER_ERROR': return 'GRAPHQL_ERROR';
      default: return 'GRAPHQL_ERROR';
    }
  }

  /**
   * Execute a GraphQL query
   * @param {string} query - GraphQL query
   * @param {Object} [variables] - Query variables
   * @param {Object} [options] - Query options
   * @returns {Promise<*>} Query result
   */
  async query(query, variables, options = {}) {
    const cacheKey = options.cacheKey || generateCacheKey(query, variables);

    // Check for in-flight request (deduplication)
    if (this.#options.dedupe && this.#inflightQueries.has(cacheKey)) {
      return this.#inflightQueries.get(cacheKey);
    }

    const promise = this.#execute(query, variables, options)
      .finally(() => {
        this.#inflightQueries.delete(cacheKey);
      });

    if (this.#options.dedupe) {
      this.#inflightQueries.set(cacheKey, promise);
    }

    return promise;
  }

  /**
   * Execute a GraphQL mutation
   * @param {string} mutation - GraphQL mutation
   * @param {Object} [variables] - Mutation variables
   * @param {Object} [options] - Mutation options
   * @returns {Promise<*>} Mutation result
   */
  async mutate(mutation, variables, options = {}) {
    return this.#execute(mutation, variables, options);
  }

  /**
   * Subscribe to a GraphQL subscription
   * @param {string} subscription - GraphQL subscription
   * @param {Object} [variables] - Subscription variables
   * @param {Object} handlers - Event handlers
   * @returns {Function} Unsubscribe function
   */
  subscribe(subscription, variables, handlers) {
    this.#initWebSocket();
    return this.#subscriptionManager.subscribe(subscription, variables, handlers);
  }

  /**
   * Invalidate a cache entry
   * @param {string} cacheKey - Cache key to invalidate
   */
  invalidate(cacheKey) {
    this.#cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll() {
    this.#cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.#cache.size,
      keys: Array.from(this.#cache.keys())
    };
  }

  /**
   * Get active subscriptions count
   * @returns {number}
   */
  getActiveSubscriptions() {
    return this.#subscriptionManager?.activeCount || 0;
  }

  /**
   * Close all subscriptions
   */
  closeAllSubscriptions() {
    this.#subscriptionManager?.closeAll();
  }

  /**
   * Get WebSocket connection state
   * @returns {Pulse<string>}
   */
  get wsState() {
    this.#initWebSocket();
    return this.#ws.state;
  }

  /**
   * Get WebSocket connected state
   * @returns {Pulse<boolean>}
   */
  get wsConnected() {
    this.#initWebSocket();
    return this.#subscriptionManager.connected;
  }

  /**
   * Create a child client with merged configuration
   * @param {Object} options - Override options
   * @returns {GraphQLClient} New client instance
   */
  create(options = {}) {
    return new GraphQLClient({
      ...this.#options,
      headers: { ...this.#options.headers, ...options.headers },
      ...options
    });
  }

  /**
   * Dispose the client
   */
  dispose() {
    this.#subscriptionManager?.dispose();
    this.#inflightQueries.clear();
    this.#cache.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a GraphQL client instance
 * @param {Object} options - Client options
 * @param {string} options.url - GraphQL endpoint URL
 * @param {string} [options.wsUrl] - WebSocket URL for subscriptions
 * @param {Object} [options.headers] - Default headers
 * @param {number} [options.timeout=30000] - Request timeout in ms
 * @param {string} [options.credentials='same-origin'] - Fetch credentials
 * @param {number} [options.retries=0] - Retry attempts
 * @param {number} [options.retryDelay=1000] - Delay between retries
 * @param {Object|Function} [options.wsConnectionParams] - WebSocket connection params
 * @param {boolean} [options.wsReconnect=true] - Auto-reconnect WebSocket
 * @param {number} [options.wsMaxRetries=5] - Max WebSocket reconnection attempts
 * @param {boolean} [options.cache=true] - Enable query caching
 * @param {number} [options.cacheTime=300000] - Cache TTL in ms
 * @param {number} [options.cacheMaxSize=500] - Maximum cache entries (LRU eviction)
 * @param {number} [options.staleTime=0] - Stale threshold in ms
 * @param {boolean} [options.dedupe=true] - Deduplicate identical in-flight queries
 * @param {boolean} [options.throwOnError=true] - Throw on GraphQL errors
 * @param {Function} [options.onError] - Global error handler
 * @returns {GraphQLClient} GraphQL client instance
 */
export function createGraphQLClient(options = {}) {
  return new GraphQLClient(options);
}

// ============================================================================
// Default Client
// ============================================================================

let defaultClient = null;

/**
 * Set the default GraphQL client
 * @param {GraphQLClient} client - Client instance
 */
export function setDefaultClient(client) {
  defaultClient = client;
}

/**
 * Get the default GraphQL client
 * @returns {GraphQLClient|null}
 */
export function getDefaultClient() {
  return defaultClient;
}

/**
 * Get client from options or default
 * @param {Object} options - Options with optional client
 * @returns {GraphQLClient} Client instance
 */
function getClient(options) {
  const client = options.client || defaultClient;
  if (!client) {
    throw new GraphQLError(
      'No GraphQL client provided. Either pass a client option or set a default client with setDefaultClient().',
      { code: 'GRAPHQL_ERROR' }
    );
  }
  return client;
}


