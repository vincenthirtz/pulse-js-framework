/**
 * Pulse Framework - Async Primitives Type Definitions
 * @module pulse-js-framework/runtime/async
 */

import { Pulse } from './pulse';

// ============================================================================
// Versioned Async - Race Condition Handling
// ============================================================================

/** Context returned by begin() for tracking async operation validity */
export interface VersionedContext {
  /** Check if this operation is still valid */
  isCurrent(): boolean;

  /** Check if this operation has been superseded */
  isStale(): boolean;

  /** Execute callback only if this operation is still current */
  ifCurrent<T>(fn: () => T): T | undefined;

  /** Set a timeout that auto-clears when operation becomes stale */
  setTimeout(fn: () => void, ms: number): number;

  /** Set an interval that auto-clears when operation becomes stale */
  setInterval(fn: () => void, ms: number): number;

  /** Clear a registered timeout */
  clearTimeout(id: number): void;

  /** Clear a registered interval */
  clearInterval(id: number): void;
}

/** Controller for managing versioned async operations */
export interface VersionedAsyncController {
  /** Start a new versioned operation, invalidating previous ones */
  begin(): VersionedContext;

  /** Abort the current operation */
  abort(): void;

  /** Get current version number */
  getVersion(): number;

  /** Clean up all timers without aborting */
  cleanup(): void;
}

/** Options for createVersionedAsync */
export interface VersionedAsyncOptions {
  /** Callback invoked when operation is aborted */
  onAbort?: () => void;
}

/**
 * Create a versioned async controller for race condition handling.
 *
 * @example
 * const controller = createVersionedAsync();
 *
 * async function fetchData() {
 *   const ctx = controller.begin();
 *   const data = await fetch('/api/data').then(r => r.json());
 *   ctx.ifCurrent(() => setState(data));
 * }
 */
export declare function createVersionedAsync(
  options?: VersionedAsyncOptions
): VersionedAsyncController;

// ============================================================================
// useAsync - Reactive Async Operation Handler
// ============================================================================

/** Status of an async operation */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** Options for useAsync */
export interface UseAsyncOptions<T> {
  /** Execute immediately on creation (default: true) */
  immediate?: boolean;

  /** Initial data value (default: null) */
  initialData?: T | null;

  /** Callback invoked on error */
  onError?: (error: Error) => void;

  /** Callback invoked on success */
  onSuccess?: (data: T) => void;

  /** Number of retry attempts on failure (default: 0) */
  retries?: number;

  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

/** Return type of useAsync */
export interface UseAsyncReturn<T> {
  /** Reactive data value */
  data: Pulse<T | null>;

  /** Reactive error state */
  error: Pulse<Error | null>;

  /** Reactive loading state */
  loading: Pulse<boolean>;

  /** Reactive status ('idle' | 'loading' | 'success' | 'error') */
  status: Pulse<AsyncStatus>;

  /** Execute the async function */
  execute(...args: unknown[]): Promise<T | null>;

  /** Reset state to initial values */
  reset(): void;

  /** Abort current execution */
  abort(): void;
}

/**
 * Create a reactive async operation handler.
 *
 * @example
 * const { data, loading, error, execute } = useAsync(
 *   () => fetch('/api/users').then(r => r.json()),
 *   { retries: 3, onSuccess: (data) => console.log('Got:', data) }
 * );
 */
export declare function useAsync<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  options?: UseAsyncOptions<T>
): UseAsyncReturn<T>;

// ============================================================================
// useResource - SWR-style Resource Fetching
// ============================================================================

/** Options for useResource */
export interface ResourceOptions<T> {
  /** Auto-refresh interval in ms */
  refreshInterval?: number;

  /** Refresh when window regains focus (default: false) */
  refreshOnFocus?: boolean;

  /** Refresh when network reconnects (default: false) */
  refreshOnReconnect?: boolean;

  /** Initial data value (default: null) */
  initialData?: T | null;

  /** Callback invoked on error */
  onError?: (error: Error) => void;

  /** Time in ms before data is considered stale (default: 0) */
  staleTime?: number;

  /** Time in ms to keep data in cache (default: 300000 = 5 min) */
  cacheTime?: number;
}

/** Return type of useResource */
export interface UseResourceReturn<T> {
  /** Reactive data value */
  data: Pulse<T | null>;

  /** Reactive error state */
  error: Pulse<Error | null>;

  /** Reactive loading state (initial fetch) */
  loading: Pulse<boolean>;

  /** Reactive stale state */
  isStale: Pulse<boolean>;

  /** Reactive validating state (background refresh) */
  isValidating: Pulse<boolean>;

  /** Last fetch timestamp */
  lastFetchTime: Pulse<number>;

  /** Fetch data (uses cache if available and fresh) */
  fetch(): Promise<T | null>;

  /** Force refresh, ignoring cache */
  refresh(): Promise<T | null>;

  /** Mutate data optimistically */
  mutate(newData: T | ((current: T | null) => T), shouldRevalidate?: boolean): void;

  /** Clear cache for this resource */
  invalidate(): void;
}

/**
 * Create a reactive resource with caching and stale-while-revalidate.
 *
 * @example
 * // Static key
 * const users = useResource('users', () => fetch('/api/users').then(r => r.json()));
 *
 * // Dynamic key (re-fetches when userId changes)
 * const userId = pulse(1);
 * const user = useResource(
 *   () => `user-${userId.get()}`,
 *   () => fetch(`/api/users/${userId.get()}`).then(r => r.json())
 * );
 */
export declare function useResource<T>(
  key: string | (() => string),
  fetcher: () => Promise<T>,
  options?: ResourceOptions<T>
): UseResourceReturn<T>;

// ============================================================================
// usePolling - Repeated Async Operations
// ============================================================================

/** Options for usePolling */
export interface PollingOptions {
  /** Polling interval in ms (required) */
  interval: number;

  /** Execute immediately on start (default: true) */
  immediate?: boolean;

  /** Pause when page is hidden (default: true) */
  pauseOnHidden?: boolean;

  /** Pause when offline (default: true) */
  pauseOnOffline?: boolean;

  /** Max consecutive errors before stopping (default: 3) */
  maxErrors?: number;

  /** Callback invoked on error */
  onError?: (error: Error) => void;
}

/** Return type of usePolling */
export interface UsePollingReturn<T> {
  /** Reactive data value */
  data: Pulse<T | null>;

  /** Reactive error state */
  error: Pulse<Error | null>;

  /** Reactive polling state */
  isPolling: Pulse<boolean>;

  /** Consecutive error count */
  errorCount: Pulse<number>;

  /** Start polling */
  start(): void;

  /** Stop polling */
  stop(): void;

  /** Pause polling (without resetting state) */
  pause(): void;

  /** Resume polling */
  resume(): void;
}

/**
 * Create a polling mechanism for repeated async operations.
 *
 * @example
 * const { data, start, stop, isPolling } = usePolling(
 *   () => fetch('/api/status').then(r => r.json()),
 *   { interval: 5000, pauseOnHidden: true }
 * );
 *
 * start(); // Begin polling
 * stop();  // Stop when done
 */
export declare function usePolling<T>(
  asyncFn: () => Promise<T>,
  options: PollingOptions
): UsePollingReturn<T>;

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Clear the entire resource cache
 */
export declare function clearResourceCache(): void;

/** Cache statistics */
export interface ResourceCacheStats {
  /** Number of cached entries */
  size: number;

  /** List of cached keys */
  keys: string[];
}

/**
 * Get resource cache statistics
 */
export declare function getResourceCacheStats(): ResourceCacheStats;
