/**
 * Pulse GraphQL - React-style Hooks
 *
 * Reactive hooks for GraphQL queries, mutations, and subscriptions
 *
 * @module pulse-js-framework/runtime/graphql/hooks
 */

import { pulse, computed, batch, effect, onCleanup } from '../pulse.js';
import { createVersionedAsync } from '../async.js';
import { onWindowFocus, onWindowOnline } from '../utils.js';
import { getDefaultClient, GraphQLError } from './client.js';
import { generateCacheKey } from './cache.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get client from options or use default
 * @param {Object} options - Hook options
 * @returns {GraphQLClient} GraphQL client instance
 */
function getClient(options) {
  const client = options.client || getDefaultClient();
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
// ============================================================

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
  if (options.refetchOnFocus) {
    onWindowFocus(() => { if (isEnabled()) executeQuery(); }, onCleanup);
  }

  // Setup online listener
  if (options.refetchOnReconnect) {
    onWindowOnline(() => { if (isEnabled()) executeQuery(); }, onCleanup);
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
 * @param {number} [options.retryBaseDelay=1000] - Base delay for exponential backoff (ms)
 * @param {number} [options.retryMaxDelay=30000] - Maximum delay between retries (ms)
 * @param {number} [options.maxRetries=Infinity] - Maximum number of retry attempts
 * @returns {Object} Subscription result with reactive state
 */
export function useSubscription(subscription, variables, options = {}) {
  const client = getClient(options);

  const data = pulse(null);
  const error = pulse(null);
  const status = pulse('connecting');
  const retryCount = pulse(0);

  let unsubscribeFn = null;
  let retryTimeoutId = null;

  // Backoff configuration
  const retryBaseDelay = options.retryBaseDelay ?? 1000;
  const retryMaxDelay = options.retryMaxDelay ?? 30000;
  const maxRetries = options.maxRetries ?? Infinity;

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current retry attempt (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  function calculateBackoffDelay(attempt) {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = retryBaseDelay * Math.pow(2, attempt);
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, retryMaxDelay);
    // Add jitter (±25%) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, cappedDelay + jitter);
  }

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
        // Reset retry count on successful data
        retryCount.set(0);
        options.onData?.(payload);
      },
      onError: (err) => {
        error.set(err);
        status.set('error');
        options.onError?.(err);

        // Resubscribe on error if enabled and under max retries
        if (options.shouldResubscribe !== false) {
          const currentRetry = retryCount.peek();
          if (currentRetry < maxRetries) {
            unsubscribeFn = null;
            const delay = calculateBackoffDelay(currentRetry);
            retryCount.set(currentRetry + 1);
            status.set('reconnecting');
            retryTimeoutId = setTimeout(() => {
              retryTimeoutId = null;
              subscribe();
            }, delay);
          } else {
            status.set('failed');
          }
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
    // Cancel pending retry
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
      status.set('closed');
    }
    retryCount.set(0);
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
    retryCount,
    unsubscribe,
    resubscribe
  };
}

// ============================================================================

