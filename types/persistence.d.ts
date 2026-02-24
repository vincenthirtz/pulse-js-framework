/**
 * Pulse Persistence Adapters Type Definitions
 * @module pulse-js-framework/runtime/persistence
 */

// ============================================================================
// Persistence Error
// ============================================================================

/**
 * Persistence-specific error with adapter context
 */
export declare class PersistenceError extends Error {
  readonly name: 'PersistenceError';

  /** Name of the adapter that caused the error (or null) */
  readonly adapterName: string | null;

  constructor(message: string, options?: {
    adapterName?: string;
    suggestion?: string;
  });

  /** Check if an error is a PersistenceError */
  static isPersistenceError(error: unknown): error is PersistenceError;
}

// ============================================================================
// Persistence Adapter Interface
// ============================================================================

/**
 * Persistence adapter interface for storage backends.
 * All methods are async to support both synchronous (localStorage) and
 * asynchronous (IndexedDB) storage backends.
 */
export interface PersistenceAdapter {
  /** Adapter name (e.g., 'localStorage', 'sessionStorage', 'IndexedDB', 'Memory') */
  readonly name: string;

  /**
   * Get an item from storage
   * @param key Storage key
   * @returns The stored value, or null if not found
   */
  getItem(key: string): Promise<unknown | null>;

  /**
   * Set an item in storage
   * @param key Storage key
   * @param value Value to store
   */
  setItem(key: string, value: unknown): Promise<void>;

  /**
   * Remove an item from storage
   * @param key Storage key
   */
  removeItem(key: string): Promise<void>;

  /** Clear all items from storage */
  clear(): Promise<void>;

  /**
   * Get all storage keys
   * @returns Array of key strings
   */
  keys(): Promise<string[]>;
}

// ============================================================================
// Adapter Type
// ============================================================================

/** Supported persistence adapter type names */
export type PersistenceAdapterType = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';

// ============================================================================
// Adapter Factory Functions
// ============================================================================

/**
 * Create a localStorage persistence adapter.
 * Falls back to memory adapter if localStorage is not available.
 *
 * @returns PersistenceAdapter backed by localStorage
 *
 * @example
 * const adapter = createLocalStorageAdapter();
 * await adapter.setItem('theme', 'dark');
 * const theme = await adapter.getItem('theme'); // 'dark'
 */
export declare function createLocalStorageAdapter(): PersistenceAdapter;

/**
 * Create a sessionStorage persistence adapter.
 * Falls back to memory adapter if sessionStorage is not available.
 *
 * @returns PersistenceAdapter backed by sessionStorage
 *
 * @example
 * const adapter = createSessionStorageAdapter();
 * await adapter.setItem('token', 'abc123');
 */
export declare function createSessionStorageAdapter(): PersistenceAdapter;

/** Options for createIndexedDBAdapter */
export interface IndexedDBAdapterOptions {
  /** Database name (default: 'pulse-store') */
  dbName?: string;

  /** Object store name (default: 'state') */
  storeName?: string;

  /** Database version (default: 1) */
  version?: number;
}

/**
 * Create an IndexedDB persistence adapter for large datasets.
 * Falls back to memory adapter if IndexedDB is not available.
 *
 * @param options IndexedDB configuration options
 * @returns PersistenceAdapter backed by IndexedDB
 *
 * @example
 * const adapter = createIndexedDBAdapter({
 *   dbName: 'my-app',
 *   storeName: 'state',
 *   version: 1,
 * });
 * await adapter.setItem('largeData', bigObject);
 */
export declare function createIndexedDBAdapter(options?: IndexedDBAdapterOptions): PersistenceAdapter;

/**
 * Create an in-memory persistence adapter (for testing or SSR).
 * Data is lost when the adapter instance is garbage collected.
 *
 * @returns PersistenceAdapter backed by an in-memory Map
 *
 * @example
 * const adapter = createMemoryAdapter();
 * await adapter.setItem('key', 'value');
 */
export declare function createMemoryAdapter(): PersistenceAdapter;

/**
 * Create a persistence adapter by type name.
 *
 * @param type Adapter type: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory'
 * @param options Adapter-specific options (only used for 'indexedDB')
 * @returns PersistenceAdapter instance
 * @throws PersistenceError if the type is unknown
 *
 * @example
 * const adapter = createPersistenceAdapter('indexedDB', { dbName: 'my-app' });
 */
export declare function createPersistenceAdapter(
  type: PersistenceAdapterType,
  options?: IndexedDBAdapterOptions
): PersistenceAdapter;

// ============================================================================
// Store Persistence Integration
// ============================================================================

/** Options for withPersistence */
export interface PersistenceOptions {
  /** Storage key for persisted data (default: 'pulse-store') */
  key?: string;

  /** Debounce delay for auto-save in ms (default: 100) */
  debounce?: number;

  /** Only persist these keys (default: null = all keys) */
  include?: string[] | null;

  /** Exclude these keys from persistence (default: null = none excluded) */
  exclude?: string[] | null;

  /** Custom serialization function (default: JSON.stringify) */
  serialize?: (value: unknown) => string;

  /** Custom deserialization function (default: JSON.parse) */
  deserialize?: (value: string) => unknown;

  /** Maximum nesting depth for sanitization (default: 10) */
  maxDepth?: number;

  /** Error callback invoked on persistence failures */
  onError?: ((error: Error) => void) | null;
}

/** Return type of withPersistence */
export interface PersistenceHandle {
  /**
   * Restore persisted state into the store
   * @returns True if state was successfully restored
   */
  restore(): Promise<boolean>;

  /**
   * Clear persisted data from storage
   */
  clear(): Promise<void>;

  /**
   * Force an immediate save, bypassing debounce
   */
  flush(): Promise<void>;

  /**
   * Dispose of persistence (stop auto-saving)
   */
  dispose(): void;
}

/**
 * Attach persistence to an existing Pulse store.
 * Auto-saves store changes to the adapter with debouncing.
 *
 * @param store A Pulse store created by createStore()
 * @param adapter A PersistenceAdapter instance
 * @param options Persistence options
 * @returns Handle with restore, clear, flush, and dispose methods
 *
 * @example
 * import { createStore } from 'pulse-js-framework/runtime/store';
 *
 * const store = createStore({ theme: 'light', user: null });
 * const adapter = createLocalStorageAdapter();
 *
 * const persistence = withPersistence(store, adapter, {
 *   key: 'my-app-state',
 *   debounce: 200,
 *   exclude: ['user'],
 * });
 *
 * // Restore previously saved state
 * await persistence.restore();
 *
 * // Later: force save and clean up
 * await persistence.flush();
 * persistence.dispose();
 */
export declare function withPersistence(
  store: Record<string, unknown>,
  adapter: PersistenceAdapter,
  options?: PersistenceOptions
): PersistenceHandle;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createPersistenceAdapter: typeof createPersistenceAdapter;
  createLocalStorageAdapter: typeof createLocalStorageAdapter;
  createSessionStorageAdapter: typeof createSessionStorageAdapter;
  createIndexedDBAdapter: typeof createIndexedDBAdapter;
  createMemoryAdapter: typeof createMemoryAdapter;
  withPersistence: typeof withPersistence;
  PersistenceError: typeof PersistenceError;
};

export default _default;
