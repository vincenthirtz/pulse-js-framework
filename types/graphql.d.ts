/**
 * Pulse GraphQL Client TypeScript Definitions
 * @module pulse-js-framework/runtime/graphql
 */

import { Pulse } from './pulse';

// ============================================================================
// Error Types
// ============================================================================

/**
 * GraphQL error codes
 */
export type GraphQLErrorCode =
  | 'GRAPHQL_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'SUBSCRIPTION_ERROR';

/**
 * GraphQL Error with operation context
 */
export declare class GraphQLError extends Error {
  readonly name: 'GraphQLError';
  readonly code: GraphQLErrorCode;
  readonly errors: GraphQLResponseError[];
  readonly data: unknown;
  readonly extensions: Record<string, unknown>;
  readonly response: unknown;
  readonly request: unknown;

  constructor(message: string, options?: {
    code?: GraphQLErrorCode;
    errors?: GraphQLResponseError[];
    data?: unknown;
    extensions?: Record<string, unknown>;
    response?: unknown;
    request?: unknown;
  });

  static isGraphQLError(error: unknown): error is GraphQLError;

  hasPartialData(): boolean;
  isAuthenticationError(): boolean;
  isAuthorizationError(): boolean;
  isValidationError(): boolean;
  isNetworkError(): boolean;
  isTimeout(): boolean;
  getFirstError(): string | null;
  getAllErrors(): string[];
  toJSON(): Record<string, unknown>;
}

/**
 * GraphQL response error structure
 */
export interface GraphQLResponseError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

// ============================================================================
// Interceptor Types
// ============================================================================

/**
 * Interceptor handler
 */
export interface InterceptorHandler<T = unknown> {
  fulfilled?: (value: T) => T | Promise<T>;
  rejected?: (error: Error) => T | Promise<T>;
}

/**
 * Interceptor manager
 */
export declare class InterceptorManager<T = unknown> {
  use(fulfilled?: (value: T) => T | Promise<T>, rejected?: (error: Error) => T | Promise<T>): number;
  eject(id: number): void;
  clear(): void;
  readonly size: number;
  [Symbol.iterator](): IterableIterator<InterceptorHandler<T>>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * GraphQL client configuration options
 */
export interface GraphQLClientOptions {
  /** GraphQL endpoint URL (required) */
  url: string;
  /** WebSocket URL for subscriptions (default: derived from url) */
  wsUrl?: string;
  /** Default request headers */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Fetch credentials mode (default: 'same-origin') */
  credentials?: 'include' | 'omit' | 'same-origin';
  /** Retry attempts on failure (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** WebSocket connection parameters */
  wsConnectionParams?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  /** Enable WebSocket auto-reconnect (default: true) */
  wsReconnect?: boolean;
  /** Max WebSocket reconnection attempts (default: 5) */
  wsMaxRetries?: number;
  /** Enable query caching (default: true) */
  cache?: boolean;
  /** Cache TTL in ms (default: 300000) */
  cacheTime?: number;
  /** Time before data is considered stale in ms (default: 0) */
  staleTime?: number;
  /** Deduplicate identical in-flight queries (default: true) */
  dedupe?: boolean;
  /** Throw on GraphQL errors (default: true) */
  throwOnError?: boolean;
  /** Global error handler */
  onError?: (error: GraphQLError) => void;
}

/**
 * Query/Mutation request options
 */
export interface GraphQLRequestOptions {
  /** Custom cache key */
  cacheKey?: string;
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * GraphQL client instance
 */
export interface GraphQLClient {
  /** Execute a GraphQL query */
  query<T = unknown>(query: string, variables?: Record<string, unknown>, options?: GraphQLRequestOptions): Promise<T>;
  /** Execute a GraphQL mutation */
  mutate<T = unknown>(mutation: string, variables?: Record<string, unknown>, options?: GraphQLRequestOptions): Promise<T>;
  /** Subscribe to a GraphQL subscription */
  subscribe(subscription: string, variables?: Record<string, unknown>, handlers: SubscriptionHandlers): () => void;
  /** Invalidate a cache entry */
  invalidate(cacheKey: string): void;
  /** Invalidate all cache entries */
  invalidateAll(): void;
  /** Get cache statistics */
  getCacheStats(): { size: number; keys: string[] };
  /** Get active subscriptions count */
  getActiveSubscriptions(): number;
  /** Close all subscriptions */
  closeAllSubscriptions(): void;
  /** WebSocket connection state */
  readonly wsState: Pulse<'connecting' | 'open' | 'closing' | 'closed'>;
  /** WebSocket connected state */
  readonly wsConnected: Pulse<boolean>;
  /** Request interceptors */
  readonly interceptors: {
    request: InterceptorManager<GraphQLRequestConfig>;
    response: InterceptorManager<unknown>;
  };
  /** Create a child client with merged config */
  create(options?: Partial<GraphQLClientOptions>): GraphQLClient;
  /** Dispose the client */
  dispose(): void;
}

/**
 * GraphQL request configuration (for interceptors)
 */
export interface GraphQLRequestConfig {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string | null;
  [key: string]: unknown;
}

/**
 * Subscription event handlers
 */
export interface SubscriptionHandlers {
  onData?: (data: unknown) => void;
  onError?: (error: GraphQLError) => void;
  onComplete?: () => void;
}

// ============================================================================
// useQuery Types
// ============================================================================

/**
 * Query status
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * useQuery hook options
 */
export interface UseQueryOptions<TData = unknown, TSelect = TData> {
  /** GraphQL client instance */
  client?: GraphQLClient;
  /** Enable/disable query (default: true) */
  enabled?: boolean | Pulse<boolean>;
  /** Execute immediately (default: true) */
  immediate?: boolean;
  /** Custom cache key */
  cacheKey?: string | (() => string);
  /** Cache TTL in ms */
  cacheTime?: number;
  /** Stale time in ms */
  staleTime?: number;
  /** Refetch when window gains focus */
  refetchOnFocus?: boolean;
  /** Refetch when network reconnects */
  refetchOnReconnect?: boolean;
  /** Polling interval in ms */
  refetchInterval?: number;
  /** Retry attempts */
  retry?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Success callback */
  onSuccess?: (data: TSelect) => void;
  /** Error callback */
  onError?: (error: GraphQLError) => void;
  /** Transform/select data */
  select?: (data: TData) => TSelect;
  /** Placeholder data while loading */
  placeholderData?: TSelect;
  /** Keep previous data during refetch */
  keepPreviousData?: boolean;
}

/**
 * useQuery hook return type
 */
export interface UseQueryReturn<TData = unknown> {
  /** Query result data */
  data: Pulse<TData | null>;
  /** Query error */
  error: Pulse<GraphQLError | null>;
  /** True during initial load */
  loading: Pulse<boolean>;
  /** True during any fetch (including refetch) */
  fetching: Pulse<boolean>;
  /** Query status */
  status: Pulse<QueryStatus>;
  /** True if data is stale */
  isStale: Pulse<boolean>;
  /** Force refetch */
  refetch: () => Promise<TData>;
  /** Invalidate cache */
  invalidate: () => void;
  /** Reset to initial state */
  reset: () => void;
}

// ============================================================================
// useMutation Types
// ============================================================================

/**
 * Mutation status
 */
export type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * useMutation hook options
 */
export interface UseMutationOptions<TData = unknown, TVariables = Record<string, unknown>, TContext = unknown> {
  /** GraphQL client instance */
  client?: GraphQLClient;
  /** Success callback */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Error callback */
  onError?: (error: GraphQLError, variables: TVariables, context?: TContext) => void;
  /** Called after success or error */
  onSettled?: (data: TData | null, error: GraphQLError | null, variables: TVariables) => void;
  /** Retry attempts */
  retry?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Called before mutation (for optimistic updates), return value passed to onError/onSettled */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  /** Cache keys to invalidate on success */
  invalidateQueries?: string[];
}

/**
 * useMutation hook return type
 */
export interface UseMutationReturn<TData = unknown, TVariables = Record<string, unknown>> {
  /** Mutation result data */
  data: Pulse<TData | null>;
  /** Mutation error */
  error: Pulse<GraphQLError | null>;
  /** True while mutation is in progress */
  loading: Pulse<boolean>;
  /** Mutation status */
  status: Pulse<MutationStatus>;
  /** Execute mutation */
  mutate: (variables?: TVariables) => Promise<TData>;
  /** Execute mutation (alias for mutate) */
  mutateAsync: (variables?: TVariables) => Promise<TData>;
  /** Reset to initial state */
  reset: () => void;
}

// ============================================================================
// useSubscription Types
// ============================================================================

/**
 * Subscription status
 */
export type SubscriptionStatus = 'connecting' | 'connected' | 'error' | 'closed';

/**
 * useSubscription hook options
 */
export interface UseSubscriptionOptions<TData = unknown> {
  /** GraphQL client instance */
  client?: GraphQLClient;
  /** Enable/disable subscription (default: true) */
  enabled?: boolean | Pulse<boolean>;
  /** Called on each message */
  onData?: (data: TData) => void;
  /** Error callback */
  onError?: (error: GraphQLError) => void;
  /** Called when subscription ends */
  onComplete?: () => void;
  /** Resubscribe on error (default: true) */
  shouldResubscribe?: boolean | (() => boolean);
}

/**
 * useSubscription hook return type
 */
export interface UseSubscriptionReturn<TData = unknown> {
  /** Latest subscription data */
  data: Pulse<TData | null>;
  /** Subscription error */
  error: Pulse<GraphQLError | null>;
  /** Subscription status */
  status: Pulse<SubscriptionStatus>;
  /** Manually unsubscribe */
  unsubscribe: () => void;
  /** Restart subscription */
  resubscribe: () => void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a GraphQL client instance.
 *
 * @param options Client configuration options
 * @returns GraphQL client instance
 *
 * @example
 * const client = createGraphQLClient({
 *   url: '/graphql',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * const users = await client.query(`
 *   query GetUsers { users { id name } }
 * `);
 */
export declare function createGraphQLClient(options: GraphQLClientOptions): GraphQLClient;

/**
 * Set the default GraphQL client for hooks.
 */
export declare function setDefaultClient(client: GraphQLClient | null): void;

/**
 * Get the default GraphQL client.
 */
export declare function getDefaultClient(): GraphQLClient | null;

/**
 * Execute a GraphQL query with caching and reactivity.
 *
 * @param query GraphQL query string
 * @param variables Query variables (can be a function for reactive variables)
 * @param options Query options
 * @returns Reactive query state and controls
 *
 * @example
 * const { data, loading, error, refetch } = useQuery(
 *   `query GetUser($id: ID!) { user(id: $id) { id name } }`,
 *   { id: '123' },
 *   { staleTime: 30000 }
 * );
 */
export declare function useQuery<TData = unknown, TSelect = TData>(
  query: string,
  variables?: Record<string, unknown> | (() => Record<string, unknown>),
  options?: UseQueryOptions<TData, TSelect>
): UseQueryReturn<TSelect>;

/**
 * Execute GraphQL mutations.
 *
 * @param mutation GraphQL mutation string
 * @param options Mutation options
 * @returns Mutation state and execute function
 *
 * @example
 * const { mutate, loading } = useMutation(
 *   `mutation CreateUser($input: CreateUserInput!) {
 *     createUser(input: $input) { id name }
 *   }`,
 *   { onSuccess: (data) => console.log('Created:', data) }
 * );
 *
 * await mutate({ input: { name: 'John' } });
 */
export declare function useMutation<TData = unknown, TVariables = Record<string, unknown>>(
  mutation: string,
  options?: UseMutationOptions<TData, TVariables>
): UseMutationReturn<TData, TVariables>;

/**
 * Subscribe to GraphQL subscriptions over WebSocket.
 *
 * @param subscription GraphQL subscription string
 * @param variables Subscription variables (can be a function for reactive variables)
 * @param options Subscription options
 * @returns Reactive subscription state
 *
 * @example
 * const { data, status } = useSubscription(
 *   `subscription OnMessage($channelId: ID!) {
 *     messageAdded(channelId: $channelId) { id content }
 *   }`,
 *   { channelId: '123' },
 *   { onData: (msg) => console.log('New message:', msg) }
 * );
 */
export declare function useSubscription<TData = unknown>(
  subscription: string,
  variables?: Record<string, unknown> | (() => Record<string, unknown>),
  options?: UseSubscriptionOptions<TData>
): UseSubscriptionReturn<TData>;

/**
 * Generate a cache key for a GraphQL operation.
 */
export declare function generateCacheKey(query: string, variables?: Record<string, unknown>): string;

/**
 * Extract operation name from a GraphQL query string.
 */
export declare function extractOperationName(query: string): string | null;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createGraphQLClient: typeof createGraphQLClient;
  GraphQLClient: GraphQLClient;
  GraphQLError: typeof GraphQLError;
  useQuery: typeof useQuery;
  useMutation: typeof useMutation;
  useSubscription: typeof useSubscription;
  setDefaultClient: typeof setDefaultClient;
  getDefaultClient: typeof getDefaultClient;
  generateCacheKey: typeof generateCacheKey;
  extractOperationName: typeof extractOperationName;
};

export default _default;
