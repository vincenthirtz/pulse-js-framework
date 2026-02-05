/**
 * Pulse GraphQL Client - Zero-dependency GraphQL client for Pulse Framework
 * @module pulse-js-framework/runtime/graphql
 */

import { pulse, computed, batch, effect, onCleanup } from './pulse.js';
import { createHttp, HttpError } from './http.js';
import { createWebSocket, WebSocketError } from './websocket.js';
import { createVersionedAsync } from './async.js';
import { RuntimeError, createErrorMessage, getDocsUrl } from './errors.js';
import { LRUCache } from './lru-cache.js';

// ============================================================================
// Constants
// ============================================================================

const GRAPHQL_SUGGESTIONS = {
  GRAPHQL_ERROR: 'Check the GraphQL errors array for specific field errors.',
  NETWORK_ERROR: 'Verify network connectivity and GraphQL endpoint URL.',
  PARSE_ERROR: 'The response was not valid GraphQL JSON. Check server configuration.',
  TIMEOUT: 'Request timed out. Consider increasing timeout or optimizing query.',
  AUTHENTICATION_ERROR: 'Authentication required. Check your credentials or token.',
  AUTHORIZATION_ERROR: 'Insufficient permissions for this operation.',
  VALIDATION_ERROR: 'Invalid input provided. Check variables match schema types.',
  SUBSCRIPTION_ERROR: 'WebSocket subscription failed. Check connection status.'
};

/**
 * graphql-ws protocol message types
 * @see https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 */
const MessageType = {
  // Client -> Server
  ConnectionInit: 'connection_init',
  Subscribe: 'subscribe',
  Complete: 'complete',
  Ping: 'ping',
  Pong: 'pong',

  // Server -> Client
  ConnectionAck: 'connection_ack',
  Next: 'next',
  Error: 'error'
  // Complete is bidirectional
};

// ============================================================================
// GraphQL Error Class
// ============================================================================

/**
 * Error class for GraphQL operations
 * @extends RuntimeError
 */
export class GraphQLError extends RuntimeError {
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
    const suggestion = GRAPHQL_SUGGESTIONS[options.code] || GRAPHQL_SUGGESTIONS.GRAPHQL_ERROR;
    super(
      createErrorMessage({
        code: options.code || 'GRAPHQL_ERROR',
        message,
        suggestion
      }),
      { code: options.code || 'GRAPHQL_ERROR', suggestion }
    );

    this.name = 'GraphQLError';
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
    return error instanceof GraphQLError;
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
   * Check if this is a network error
   * @returns {boolean}
   */
  isNetworkError() {
    return this.code === 'NETWORK_ERROR';
  }

  /**
   * Check if this is a timeout error
   * @returns {boolean}
   */
  isTimeout() {
    return this.code === 'TIMEOUT';
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
// Cache Key Utilities
// ============================================================================

/**
 * Extract operation name from GraphQL query string
 * @param {string} query - GraphQL query string
 * @returns {string|null} Operation name or null
 */
function extractOperationName(query) {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
  return match ? match[1] : null;
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function hashString(str) {
  if (!str) return '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Stable JSON stringify with sorted keys
 * @param {*} obj - Object to stringify
 * @returns {string} Stable JSON string
 */
function stableStringify(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${stableStringify(obj[k])}`).join(',') + '}';
}

/**
 * Generate a deterministic cache key for a GraphQL operation
 * @param {string} query - GraphQL query string
 * @param {Object} [variables] - Query variables
 * @returns {string} Cache key
 */
function generateCacheKey(query, variables) {
  const operationName = extractOperationName(query);
  const variablesHash = variables ? hashString(stableStringify(variables)) : '';
  const queryHash = operationName || hashString(query.replace(/\s+/g, ' ').trim());
  return `gql:${queryHash}${variablesHash ? ':' + variablesHash : ''}`;
}

// ============================================================================
// Interceptor Manager
// ============================================================================

/**
 * Manages request/response interceptors
 */
class InterceptorManager {
  #handlers = new Map();
  #nextId = 0;

  /**
   * Add an interceptor
   * @param {Function} fulfilled - Success handler
   * @param {Function} [rejected] - Error handler
   * @returns {number} Interceptor ID
   */
  use(fulfilled, rejected) {
    const id = this.#nextId++;
    this.#handlers.set(id, { fulfilled, rejected });
    return id;
  }

  /**
   * Remove an interceptor
   * @param {number} id - Interceptor ID
   */
  eject(id) {
    this.#handlers.delete(id);
  }

  /**
   * Clear all interceptors
   */
  clear() {
    this.#handlers.clear();
  }

  /**
   * Get handler count
   * @returns {number}
   */
  get size() {
    return this.#handlers.size;
  }

  /**
   * Iterate over handlers
   */
  [Symbol.iterator]() {
    return this.#handlers.values();
  }
}

// ============================================================================
// Subscription Manager
// ============================================================================

/**
 * Manages GraphQL subscriptions over WebSocket
 */
class SubscriptionManager {
  #ws = null;
  #subscriptions = new Map();
  #nextId = 1;
  #connectionParams;
  #connected = pulse(false);
  #pending = [];

  /**
   * @param {Object} ws - WebSocket instance from createWebSocket
   * @param {Object|Function} [connectionParams] - Connection parameters
   */
  constructor(ws, connectionParams) {
    this.#ws = ws;
    this.#connectionParams = connectionParams;

    // Handle incoming messages
    ws.on('message', (msg) => this.#handleMessage(msg));
    ws.on('open', () => this.#handleOpen());
    ws.on('close', () => this.#handleClose());
    ws.on('error', (err) => this.#handleError(err));
  }

  /**
   * Get connection state
   */
  get connected() {
    return this.#connected;
  }

  /**
   * Handle WebSocket open
   */
  async #handleOpen() {
    // Send connection_init
    const params = typeof this.#connectionParams === 'function'
      ? await this.#connectionParams()
      : this.#connectionParams;

    this.#ws.send({
      type: MessageType.ConnectionInit,
      payload: params || {}
    });
  }

  /**
   * Handle WebSocket close
   */
  #handleClose() {
    this.#connected.set(false);
    // Notify all active subscriptions
    for (const [id, sub] of this.#subscriptions) {
      sub.handlers.onError?.(new GraphQLError('Connection closed', {
        code: 'SUBSCRIPTION_ERROR'
      }));
    }
  }

  /**
   * Handle WebSocket error
   */
  #handleError(error) {
    for (const [id, sub] of this.#subscriptions) {
      sub.handlers.onError?.(new GraphQLError(error.message || 'WebSocket error', {
        code: 'SUBSCRIPTION_ERROR'
      }));
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param {Object} message - Parsed message
   */
  #handleMessage(message) {
    const { id, type, payload } = message;

    switch (type) {
      case MessageType.ConnectionAck:
        this.#connected.set(true);
        // Send any pending subscriptions
        for (const pending of this.#pending) {
          this.#ws.send(pending);
        }
        this.#pending = [];
        break;

      case MessageType.Next: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onData?.(payload.data);
        }
        break;
      }

      case MessageType.Error: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onError?.(new GraphQLError('Subscription error', {
            code: 'SUBSCRIPTION_ERROR',
            errors: Array.isArray(payload) ? payload : [payload]
          }));
        }
        break;
      }

      case MessageType.Complete: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onComplete?.();
          this.#subscriptions.delete(id);
        }
        break;
      }

      case MessageType.Ping:
        this.#ws.send({ type: MessageType.Pong });
        break;
    }
  }

  /**
   * Subscribe to a GraphQL subscription
   * @param {string} query - GraphQL subscription query
   * @param {Object} [variables] - Subscription variables
   * @param {Object} handlers - Event handlers
   * @returns {Function} Unsubscribe function
   */
  subscribe(query, variables, handlers) {
    const id = String(this.#nextId++);

    const message = {
      id,
      type: MessageType.Subscribe,
      payload: {
        query,
        variables,
        operationName: extractOperationName(query)
      }
    };

    // Store subscription
    this.#subscriptions.set(id, {
      query,
      variables,
      handlers
    });

    // Send or queue the subscription message
    if (this.#connected.get()) {
      this.#ws.send(message);
    } else {
      this.#pending.push(message);
      // Ensure WebSocket is connecting
      if (this.#ws.state.get() === 'closed') {
        this.#ws.connect();
      }
    }

    // Return unsubscribe function
    return () => {
      if (this.#subscriptions.has(id)) {
        this.#subscriptions.delete(id);
        if (this.#connected.get()) {
          this.#ws.send({ id, type: MessageType.Complete });
        }
      }
    };
  }

  /**
   * Get active subscription count
   * @returns {number}
   */
  get activeCount() {
    return this.#subscriptions.size;
  }

  /**
   * Close all subscriptions
   */
  closeAll() {
    for (const id of this.#subscriptions.keys()) {
      if (this.#connected.get()) {
        this.#ws.send({ id, type: MessageType.Complete });
      }
    }
    this.#subscriptions.clear();
  }

  /**
   * Dispose the subscription manager
   */
  dispose() {
    this.closeAll();
    this.#ws.dispose();
  }
}

// ============================================================================
// GraphQL Client
// ============================================================================

/**
 * GraphQL Client class
 */
class GraphQLClient {
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

// ============================================================================
// useQuery Hook
// ============================================================================

/**
 * Execute a GraphQL query with caching and reactivity
 * @param {string} query - GraphQL query string
 * @param {Object|Function} [variables] - Variables or function returning variables
 * @param {Object} [options={}] - Query options
 * @param {GraphQLClient} [options.client] - GraphQL client instance
 * @param {boolean|Pulse<boolean>} [options.enabled=true] - Enable/disable query
 * @param {boolean} [options.immediate=true] - Execute immediately
 * @param {string|Function} [options.cacheKey] - Custom cache key
 * @param {number} [options.cacheTime] - Cache TTL override
 * @param {number} [options.staleTime] - Stale threshold override
 * @param {boolean} [options.refetchOnFocus=false] - Refetch when window gains focus
 * @param {boolean} [options.refetchOnReconnect=false] - Refetch when network reconnects
 * @param {number} [options.refetchInterval] - Polling interval in ms
 * @param {number} [options.retry] - Retry attempts
 * @param {number} [options.retryDelay] - Delay between retries
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.select] - Transform/select data
 * @param {*} [options.placeholderData] - Placeholder while loading
 * @param {boolean} [options.keepPreviousData=false] - Keep previous data during refetch
 * @returns {Object} Query result with reactive state
 */
export function useQuery(query, variables, options = {}) {
  const client = getClient(options);

  // Resolve variables (can be function for reactive variables)
  const resolveVariables = () => {
    if (typeof variables === 'function') {
      return variables();
    }
    return variables;
  };

  // Generate cache key
  const getCacheKey = () => {
    if (typeof options.cacheKey === 'function') {
      return options.cacheKey();
    }
    if (options.cacheKey) {
      return options.cacheKey;
    }
    return generateCacheKey(query, resolveVariables());
  };

  // Check if enabled
  const isEnabled = () => {
    if (typeof options.enabled === 'object' && options.enabled?.get) {
      return options.enabled.get();
    }
    return options.enabled !== false;
  };

  // Check if should execute immediately
  const shouldExecuteImmediately = options.immediate !== false && isEnabled();

  // State
  const data = pulse(options.placeholderData ?? null);
  const error = pulse(null);
  const loading = pulse(shouldExecuteImmediately);
  const fetching = pulse(false);
  const isStale = pulse(false);

  const versionController = createVersionedAsync();

  // Execute query
  async function executeQuery() {
    if (!isEnabled()) return null;

    const ctx = versionController.begin();

    batch(() => {
      fetching.set(true);
      if (data.get() === null) {
        loading.set(true);
      }
      error.set(null);
    });

    try {
      const result = await client.query(query, resolveVariables(), {
        cacheKey: getCacheKey()
      });

      const selectedData = options.select ? options.select(result) : result;

      ctx.ifCurrent(() => {
        batch(() => {
          data.set(selectedData);
          loading.set(false);
          fetching.set(false);
          isStale.set(false);
        });
        options.onSuccess?.(selectedData);
      });

      return selectedData;
    } catch (err) {
      const graphqlError = GraphQLError.isGraphQLError(err) ? err : new GraphQLError(err.message, {
        code: 'GRAPHQL_ERROR'
      });

      ctx.ifCurrent(() => {
        batch(() => {
          error.set(graphqlError);
          loading.set(false);
          fetching.set(false);
        });
        options.onError?.(graphqlError);
      });

      return null;
    }
  }

  // Initial fetch if immediate
  if (shouldExecuteImmediately) {
    executeQuery();
  }

  // Setup auto-refresh interval
  if (options.refetchInterval && options.refetchInterval > 0) {
    const intervalId = setInterval(() => {
      if (!loading.get() && !fetching.get() && isEnabled()) {
        executeQuery();
      }
    }, options.refetchInterval);

    onCleanup(() => clearInterval(intervalId));
  }

  // Setup window focus listener
  if (options.refetchOnFocus && typeof window !== 'undefined') {
    const handleFocus = () => {
      if (isEnabled()) executeQuery();
    };
    window.addEventListener('focus', handleFocus);
    onCleanup(() => window.removeEventListener('focus', handleFocus));
  }

  // Setup online listener
  if (options.refetchOnReconnect && typeof window !== 'undefined') {
    const handleOnline = () => {
      if (isEnabled()) executeQuery();
    };
    window.addEventListener('online', handleOnline);
    onCleanup(() => window.removeEventListener('online', handleOnline));
  }

  return {
    data,
    error,
    loading,
    fetching,
    status: computed(() => {
      if (loading.get()) return 'loading';
      if (error.get()) return 'error';
      if (data.get() !== null) return 'success';
      return 'idle';
    }),
    isStale,
    refetch: executeQuery,
    invalidate: () => {
      isStale.set(true);
      client.invalidate(getCacheKey());
    },
    reset: () => {
      batch(() => {
        data.set(null);
        error.set(null);
        loading.set(false);
        fetching.set(false);
        isStale.set(false);
      });
    }
  };
}

// ============================================================================
// useMutation Hook
// ============================================================================

/**
 * Execute GraphQL mutations
 * @param {string} mutation - GraphQL mutation string
 * @param {Object} [options={}] - Mutation options
 * @param {GraphQLClient} [options.client] - GraphQL client instance
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onSettled] - Called after success or error
 * @param {number} [options.retry] - Retry attempts
 * @param {number} [options.retryDelay] - Delay between retries
 * @param {Function} [options.onMutate] - Called before mutation (for optimistic updates)
 * @param {string[]} [options.invalidateQueries] - Cache keys to invalidate on success
 * @returns {Object} Mutation result with execute function
 */
export function useMutation(mutation, options = {}) {
  const client = getClient(options);

  const data = pulse(null);
  const error = pulse(null);
  const loading = pulse(false);
  const status = pulse('idle');

  const versionController = createVersionedAsync();

  /**
   * Execute the mutation
   * @param {Object} [variables] - Mutation variables
   * @returns {Promise<*>} Mutation result
   */
  async function mutate(variables) {
    const ctx = versionController.begin();
    let rollbackContext;

    batch(() => {
      loading.set(true);
      error.set(null);
      status.set('loading');
    });

    try {
      // Call onMutate for optimistic updates
      if (options.onMutate) {
        rollbackContext = await options.onMutate(variables);
      }

      const result = await client.mutate(mutation, variables);

      ctx.ifCurrent(() => {
        batch(() => {
          data.set(result);
          loading.set(false);
          status.set('success');
        });

        options.onSuccess?.(result, variables);
        options.onSettled?.(result, null, variables);

        // Invalidate queries
        if (options.invalidateQueries) {
          for (const key of options.invalidateQueries) {
            client.invalidate(key);
          }
        }
      });

      return result;
    } catch (err) {
      const graphqlError = GraphQLError.isGraphQLError(err) ? err : new GraphQLError(err.message, {
        code: 'GRAPHQL_ERROR'
      });

      ctx.ifCurrent(() => {
        batch(() => {
          error.set(graphqlError);
          loading.set(false);
          status.set('error');
        });

        options.onError?.(graphqlError, variables, rollbackContext);
        options.onSettled?.(null, graphqlError, variables);
      });

      throw graphqlError;
    }
  }

  /**
   * Reset mutation state
   */
  function reset() {
    batch(() => {
      data.set(null);
      error.set(null);
      loading.set(false);
      status.set('idle');
    });
  }

  return {
    data,
    error,
    loading,
    status,
    mutate,
    mutateAsync: mutate,
    reset
  };
}

// ============================================================================
// useSubscription Hook
// ============================================================================

/**
 * Subscribe to GraphQL subscriptions over WebSocket
 * @param {string} subscription - GraphQL subscription string
 * @param {Object|Function} [variables] - Variables or function returning variables
 * @param {Object} [options={}] - Subscription options
 * @param {GraphQLClient} [options.client] - GraphQL client instance
 * @param {boolean|Pulse<boolean>} [options.enabled=true] - Enable/disable subscription
 * @param {Function} [options.onData] - Called on each message
 * @param {Function} [options.onError] - Error callback
 * @param {Function} [options.onComplete] - Called when subscription ends
 * @param {boolean} [options.shouldResubscribe=true] - Resubscribe on error
 * @returns {Object} Subscription result with reactive state
 */
export function useSubscription(subscription, variables, options = {}) {
  const client = getClient(options);

  const data = pulse(null);
  const error = pulse(null);
  const status = pulse('connecting');

  let unsubscribeFn = null;

  // Resolve variables
  const resolveVariables = () => {
    if (typeof variables === 'function') {
      return variables();
    }
    return variables;
  };

  // Check if enabled
  const isEnabled = () => {
    if (typeof options.enabled === 'object' && options.enabled?.get) {
      return options.enabled.get();
    }
    return options.enabled !== false;
  };

  /**
   * Start subscription
   */
  function subscribe() {
    if (!isEnabled() || unsubscribeFn) return;

    status.set('connecting');

    unsubscribeFn = client.subscribe(subscription, resolveVariables(), {
      onData: (payload) => {
        status.set('connected');
        data.set(payload);
        options.onData?.(payload);
      },
      onError: (err) => {
        error.set(err);
        status.set('error');
        options.onError?.(err);

        // Resubscribe on error if enabled
        if (options.shouldResubscribe !== false) {
          unsubscribeFn = null;
          setTimeout(() => subscribe(), 1000);
        }
      },
      onComplete: () => {
        status.set('closed');
        options.onComplete?.();
        unsubscribeFn = null;
      }
    });
  }

  /**
   * Unsubscribe
   */
  function unsubscribe() {
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
      status.set('closed');
    }
  }

  /**
   * Resubscribe (unsubscribe then subscribe)
   */
  function resubscribe() {
    unsubscribe();
    subscribe();
  }

  // Start subscription if enabled
  if (isEnabled()) {
    subscribe();
  }

  // Watch enabled state for reactive enabling/disabling
  if (typeof options.enabled === 'object' && options.enabled?.get) {
    effect(() => {
      if (options.enabled.get()) {
        subscribe();
      } else {
        unsubscribe();
      }
    });
  }

  // Cleanup on dispose
  onCleanup(() => {
    unsubscribe();
  });

  return {
    data,
    error,
    status,
    unsubscribe,
    resubscribe
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  GraphQLClient,
  InterceptorManager,
  SubscriptionManager,
  generateCacheKey,
  extractOperationName
};

export default {
  createGraphQLClient,
  GraphQLClient,
  GraphQLError,
  useQuery,
  useMutation,
  useSubscription,
  setDefaultClient,
  getDefaultClient,
  generateCacheKey,
  extractOperationName
};
