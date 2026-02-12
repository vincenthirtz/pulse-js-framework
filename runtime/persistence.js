/**
 * Pulse Persistence Adapters
 * Strategy pattern for storage backends: localStorage, sessionStorage, IndexedDB, memory.
 *
 * @module pulse-js-framework/runtime/persistence
 */

import { pulse, effect } from './pulse.js';
import { loggers } from './logger.js';
import { RuntimeError } from './errors.js';
import { DANGEROUS_KEYS } from './security.js';

const log = loggers.store;

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_NESTING_DEPTH = 10;

const DEFAULT_PERSISTENCE_OPTIONS = {
  key: 'pulse-store',
  debounce: 100,
  include: null,
  exclude: null,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
  maxDepth: MAX_NESTING_DEPTH,
  onError: null,
};

// =============================================================================
// PERSISTENCE ERROR
// =============================================================================

export class PersistenceError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'PERSISTENCE_ERROR', ...options });
    this.name = 'PersistenceError';
    this.adapterName = options.adapterName ?? null;
  }

  static isPersistenceError(error) {
    return error instanceof PersistenceError;
  }
}

// =============================================================================
// INTERNAL: SECURITY HELPERS
// =============================================================================

function _sanitizeValue(value, depth = 0, maxDepth = MAX_NESTING_DEPTH) {
  if (depth > maxDepth) {
    log.warn('Maximum nesting depth exceeded in persisted data');
    return null;
  }

  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(item => _sanitizeValue(item, depth + 1, maxDepth));
  }

  const sanitized = {};
  for (const [key, val] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      log.warn(`Blocked dangerous key in persisted data: "${key}"`);
      continue;
    }
    sanitized[key] = _sanitizeValue(val, depth + 1, maxDepth);
  }
  return sanitized;
}

function _filterKeys(data, include, exclude) {
  if (!include && !exclude) return data;

  const filtered = {};
  for (const [key, value] of Object.entries(data)) {
    if (include && !include.includes(key)) continue;
    if (exclude && exclude.includes(key)) continue;
    filtered[key] = value;
  }
  return filtered;
}

// =============================================================================
// WEB STORAGE ADAPTER (localStorage / sessionStorage)
// =============================================================================

function _createWebStorageAdapter(storage, name) {
  return {
    name,

    async getItem(key) {
      try {
        const raw = storage.getItem(key);
        return raw !== null ? JSON.parse(raw) : null;
      } catch (e) {
        log.warn(`${name}: Failed to read key "${key}":`, e.message);
        return null;
      }
    },

    async setItem(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch (e) {
        throw new PersistenceError(`${name}: Failed to write key "${key}": ${e.message}`, {
          adapterName: name,
          suggestion: name === 'localStorage'
            ? 'Storage may be full. Try clearing old data or using IndexedDB for large datasets.'
            : 'SessionStorage may be full or disabled.',
        });
      }
    },

    async removeItem(key) {
      storage.removeItem(key);
    },

    async clear() {
      storage.clear();
    },

    async keys() {
      const result = [];
      for (let i = 0; i < storage.length; i++) {
        result.push(storage.key(i));
      }
      return result;
    },
  };
}

/**
 * Create a localStorage persistence adapter
 * @returns {Object} PersistenceAdapter
 */
export function createLocalStorageAdapter() {
  if (typeof localStorage === 'undefined') {
    log.warn('localStorage not available, falling back to memory adapter');
    return createMemoryAdapter();
  }
  return _createWebStorageAdapter(localStorage, 'localStorage');
}

/**
 * Create a sessionStorage persistence adapter
 * @returns {Object} PersistenceAdapter
 */
export function createSessionStorageAdapter() {
  if (typeof sessionStorage === 'undefined') {
    log.warn('sessionStorage not available, falling back to memory adapter');
    return createMemoryAdapter();
  }
  return _createWebStorageAdapter(sessionStorage, 'sessionStorage');
}

// =============================================================================
// INDEXEDDB ADAPTER
// =============================================================================

/**
 * Create an IndexedDB persistence adapter for large datasets
 *
 * @param {Object} [options]
 * @param {string} [options.dbName='pulse-store'] - Database name
 * @param {string} [options.storeName='state'] - Object store name
 * @param {number} [options.version=1] - Database version
 * @returns {Object} PersistenceAdapter
 */
export function createIndexedDBAdapter(options = {}) {
  const {
    dbName = 'pulse-store',
    storeName = 'state',
    version = 1,
  } = options;

  if (typeof indexedDB === 'undefined') {
    log.warn('IndexedDB not available, falling back to memory adapter');
    return createMemoryAdapter();
  }

  let dbPromise = null;

  function _openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(new PersistenceError(
          `IndexedDB: Failed to open database "${dbName}": ${request.error?.message}`,
          { adapterName: 'IndexedDB' }
        ));
      };
    });

    return dbPromise;
  }

  function _transaction(mode) {
    return _openDB().then(db => {
      const tx = db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    });
  }

  function _request(store, method, ...args) {
    return new Promise((resolve, reject) => {
      const request = store[method](...args);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new PersistenceError(
        `IndexedDB: ${method} failed: ${request.error?.message}`,
        { adapterName: 'IndexedDB' }
      ));
    });
  }

  return {
    name: 'IndexedDB',

    async getItem(key) {
      const store = await _transaction('readonly');
      const result = await _request(store, 'get', key);
      return result !== undefined ? result : null;
    },

    async setItem(key, value) {
      const store = await _transaction('readwrite');
      await _request(store, 'put', value, key);
    },

    async removeItem(key) {
      const store = await _transaction('readwrite');
      await _request(store, 'delete', key);
    },

    async clear() {
      const store = await _transaction('readwrite');
      await _request(store, 'clear');
    },

    async keys() {
      const store = await _transaction('readonly');
      return _request(store, 'getAllKeys');
    },
  };
}

// =============================================================================
// MEMORY ADAPTER (for testing)
// =============================================================================

/**
 * Create an in-memory persistence adapter (for testing or SSR)
 * @returns {Object} PersistenceAdapter
 */
export function createMemoryAdapter() {
  const store = new Map();

  return {
    name: 'Memory',

    async getItem(key) {
      const value = store.get(key);
      return value !== undefined ? value : null;
    },

    async setItem(key, value) {
      store.set(key, value);
    },

    async removeItem(key) {
      store.delete(key);
    },

    async clear() {
      store.clear();
    },

    async keys() {
      return Array.from(store.keys());
    },
  };
}

// =============================================================================
// FACTORY: createPersistenceAdapter
// =============================================================================

/**
 * Create a persistence adapter by type name
 *
 * @param {string} type - 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory'
 * @param {Object} [options] - Adapter-specific options
 * @returns {Object} PersistenceAdapter
 */
export function createPersistenceAdapter(type, options = {}) {
  switch (type) {
    case 'localStorage':
      return createLocalStorageAdapter();
    case 'sessionStorage':
      return createSessionStorageAdapter();
    case 'indexedDB':
      return createIndexedDBAdapter(options);
    case 'memory':
      return createMemoryAdapter();
    default:
      throw new PersistenceError(
        `Unknown persistence adapter type: "${type}"`,
        { suggestion: 'Use one of: localStorage, sessionStorage, indexedDB, memory' }
      );
  }
}

// =============================================================================
// STORE INTEGRATION: withPersistence
// =============================================================================

/**
 * Attach persistence to an existing Pulse store.
 * Auto-saves store changes to the adapter with debouncing.
 *
 * @param {Object} store - A Pulse store created by createStore()
 * @param {Object} adapter - A PersistenceAdapter instance
 * @param {Object} [options] - Persistence options
 * @returns {Object} { restore, clear, flush, dispose }
 */
export function withPersistence(store, adapter, options = {}) {
  const config = { ...DEFAULT_PERSISTENCE_OPTIONS, ...options };

  let debounceTimer = null;
  let disposed = false;
  let pendingWrite = null;

  function _getStoreSnapshot() {
    if (typeof store.$getState === 'function') {
      return _filterKeys(store.$getState(), config.include, config.exclude);
    }

    // Fallback: iterate store pulses
    const snapshot = {};
    const pulses = store.$pulses || store;
    for (const [key, p] of Object.entries(pulses)) {
      if (key.startsWith('$')) continue;
      if (config.include && !config.include.includes(key)) continue;
      if (config.exclude && config.exclude.includes(key)) continue;
      snapshot[key] = typeof p.get === 'function' ? p.get() : p;
    }
    return snapshot;
  }

  function _scheduleSave() {
    if (disposed) return;

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      _save();
    }, config.debounce);
  }

  async function _save() {
    if (disposed) return;

    try {
      const snapshot = _getStoreSnapshot();
      const serialized = config.serialize(snapshot);
      pendingWrite = adapter.setItem(config.key, config.deserialize(serialized));
      await pendingWrite;
      pendingWrite = null;
    } catch (e) {
      log.warn('Persistence save failed:', e.message);
      config.onError?.(e);
    }
  }

  // Set up auto-save effect
  const disposeEffect = effect(() => {
    // Read all store values to track dependencies
    _getStoreSnapshot();
    // Schedule debounced save
    _scheduleSave();
  });

  /**
   * Restore persisted state into the store
   * @returns {Promise<boolean>} True if state was restored
   */
  async function restore() {
    try {
      const raw = await adapter.getItem(config.key);
      if (raw === null) return false;

      const data = typeof raw === 'string' ? config.deserialize(raw) : raw;
      const sanitized = _sanitizeValue(data, 0, config.maxDepth);

      if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
        const filtered = _filterKeys(sanitized, config.include, config.exclude);

        if (typeof store.$setState === 'function') {
          store.$setState(filtered);
        } else {
          const pulses = store.$pulses || store;
          for (const [key, value] of Object.entries(filtered)) {
            if (pulses[key] && typeof pulses[key].set === 'function') {
              pulses[key].set(value);
            }
          }
        }

        log.info(`Persistence restored from ${adapter.name}`);
        return true;
      }
      return false;
    } catch (e) {
      log.warn('Persistence restore failed:', e.message);
      config.onError?.(e);
      return false;
    }
  }

  /**
   * Clear persisted data
   * @returns {Promise<void>}
   */
  async function clear() {
    try {
      await adapter.removeItem(config.key);
      log.info(`Persistence cleared from ${adapter.name}`);
    } catch (e) {
      log.warn('Persistence clear failed:', e.message);
      config.onError?.(e);
    }
  }

  /**
   * Force an immediate save (bypassing debounce)
   * @returns {Promise<void>}
   */
  async function flush() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await _save();
  }

  /**
   * Dispose of persistence (stop auto-saving)
   */
  function dispose() {
    disposed = true;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    disposeEffect();
  }

  return { restore, clear, flush, dispose };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  createPersistenceAdapter,
  createLocalStorageAdapter,
  createSessionStorageAdapter,
  createIndexedDBAdapter,
  createMemoryAdapter,
  withPersistence,
  PersistenceError,
};
