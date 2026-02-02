/**
 * Pulse Store - Global state management
 * @module pulse-js-framework/runtime/store
 *
 * A simple but powerful store that integrates with Pulse reactivity.
 *
 * @example
 * import { createStore, createActions, createGetters } from './store.js';
 *
 * const store = createStore({ count: 0, name: 'App' });
 * const actions = createActions(store, {
 *   increment: (store) => store.count.update(n => n + 1)
 * });
 *
 * actions.increment();
 */

import { pulse, computed, effect, batch } from './pulse.js';
import { loggers, createLogger } from './logger.js';
import { Errors, createErrorMessage } from './errors.js';

const log = loggers.store;

/**
 * Maximum nesting depth for nested objects to prevent abuse
 * @type {number}
 */
const MAX_NESTING_DEPTH = 10;

/**
 * @typedef {Object} StoreOptions
 * @property {boolean} [persist=false] - Persist state to localStorage
 * @property {string} [storageKey='pulse-store'] - Key for localStorage persistence
 */

/**
 * @typedef {Object} Store
 * @property {function(): Object} $getState - Get current state snapshot
 * @property {function(Object): void} $setState - Update multiple values at once
 * @property {function(): void} $reset - Reset to initial state
 * @property {function(function): function} $subscribe - Subscribe to state changes
 * @property {Object.<string, Pulse>} $pulses - Access underlying pulse objects
 */

/**
 * @typedef {Object} ModuleDef
 * @property {Object} [state] - Initial module state
 * @property {Object.<string, function>} [actions] - Module actions
 * @property {Object.<string, function>} [getters] - Module getters
 */

/**
 * @typedef {function(Store): Store} StorePlugin
 */

/**
 * Dangerous property names that could cause prototype pollution
 * @type {Set<string>}
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Invalid value types that cannot be stored in state
 * @type {Set<string>}
 */
const INVALID_TYPES = new Set(['function', 'symbol']);

/**
 * Validate state values, rejecting functions, symbols, and circular references
 * @private
 * @param {*} value - Value to validate
 * @param {string} path - Current path for error messages
 * @param {WeakSet} seen - Set of objects already visited (for circular detection)
 * @throws {TypeError} If value contains invalid types or circular references
 */
function validateStateValue(value, path = 'state', seen = new WeakSet()) {
  const valueType = typeof value;

  // Check for invalid types
  if (INVALID_TYPES.has(valueType)) {
    throw Errors.invalidStoreValue(valueType);
  }

  // Check objects for circular references and nested invalid types
  if (value !== null && valueType === 'object') {
    // Check for circular reference
    if (seen.has(value)) {
      const error = new TypeError(
        createErrorMessage({
          code: 'STORE_TYPE_ERROR',
          message: `Circular reference detected at "${path}".`,
          context: 'State must not contain circular references for persistence.',
          suggestion: 'Remove the circular reference or exclude this value from the store.'
        })
      );
      throw error;
    }
    seen.add(value);

    // Validate array elements
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        validateStateValue(value[i], `${path}[${i}]`, seen);
      }
    } else {
      // Validate object properties
      for (const [key, val] of Object.entries(value)) {
        validateStateValue(val, `${path}.${key}`, seen);
      }
    }
  }
}

/**
 * Recursively sanitize a value, removing dangerous keys from nested objects.
 * @private
 * @param {*} value - Value to sanitize
 * @param {number} depth - Current nesting depth
 * @returns {*} Sanitized value
 */
function sanitizeValue(value, depth = 0) {
  // Prevent deep nesting attacks
  if (depth > MAX_NESTING_DEPTH) {
    log.warn('Maximum nesting depth exceeded in persisted state');
    return null;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    // Recursively sanitize array elements
    return value.map(item => sanitizeValue(item, depth + 1));
  }

  // Sanitize object
  const result = {};
  for (const [key, val] of Object.entries(value)) {
    // Block dangerous keys at every nesting level
    if (DANGEROUS_KEYS.has(key)) {
      log.warn(`Blocked dangerous key in persisted state: "${key}"`);
      continue;
    }
    result[key] = sanitizeValue(val, depth + 1);
  }
  return result;
}

/**
 * Safely deserialize persisted state, preventing prototype pollution
 * and property injection attacks.
 *
 * SECURITY: Validates at every nesting level including arrays.
 * - Blocks __proto__, constructor, prototype keys
 * - Enforces maximum nesting depth
 * - Only allows keys defined in schema
 *
 * @private
 * @param {Object} savedState - The parsed JSON state
 * @param {Object} schema - The initial state defining allowed keys
 * @returns {Object} Sanitized state object
 */
function safeDeserialize(savedState, schema) {
  if (typeof savedState !== 'object' || savedState === null || Array.isArray(savedState)) {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(savedState)) {
    // Block dangerous keys that could pollute prototypes
    if (DANGEROUS_KEYS.has(key)) {
      log.warn(`Blocked potentially dangerous key in persisted state: "${key}"`);
      continue;
    }

    // Only allow keys that exist in the schema (initial state)
    if (!(key in schema)) {
      continue;
    }

    // Recursively validate nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (typeof schema[key] === 'object' && schema[key] !== null && !Array.isArray(schema[key])) {
        result[key] = safeDeserialize(value, schema[key]);
      }
      // If schema expects primitive but got object, skip it
    } else if (Array.isArray(value)) {
      // Sanitize arrays to remove dangerous keys from nested objects
      result[key] = sanitizeValue(value, 0);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Create a global store with reactive state properties.
 * @template T
 * @param {T} [initialState={}] - Initial state object
 * @param {StoreOptions} [options={}] - Store configuration
 * @returns {T & Store} Store with reactive properties and helper methods
 * @example
 * // Basic store
 * const store = createStore({ count: 0, user: null });
 * store.count.get(); // 0
 * store.count.set(5);
 *
 * // With persistence
 * const store = createStore(
 *   { theme: 'dark', lang: 'en' },
 *   { persist: true, storageKey: 'app-settings' }
 * );
 *
 * // Batch updates
 * store.$setState({ theme: 'light', lang: 'fr' });
 */
export function createStore(initialState = {}, options = {}) {
  const { persist = false, storageKey = 'pulse-store' } = options;

  // Validate initial state
  validateStateValue(initialState, 'initialState');

  // Load persisted state if enabled
  let state = initialState;
  if (persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = safeDeserialize(parsed, initialState);
        state = { ...initialState, ...sanitized };
      }
    } catch (e) {
      log.warn('Failed to load persisted state:', e);
    }
  }

  // Create pulses for each state property
  /** @type {Object.<string, Pulse>} */
  const pulses = {};
  const store = {};

  /**
   * Create a pulse for a state value, handling nested objects
   * @private
   * @param {string} key - State key
   * @param {*} value - Initial value
   * @param {number} [depth=0] - Current nesting depth
   * @returns {Pulse|Object} Pulse or nested object of pulses
   */
  function createPulse(key, value, depth = 0) {
    // Prevent excessive nesting depth
    if (depth > MAX_NESTING_DEPTH) {
      log.warn(`Max nesting depth (${MAX_NESTING_DEPTH}) exceeded for key: "${key}". Flattening to single pulse.`);
      const p = pulse(value);
      pulses[key] = p;
      return p;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Create a pulse for the nested object itself (for $setState support)
      const objectPulse = pulse(value);
      pulses[key] = objectPulse;

      // Also create nested pulses for individual properties
      const nested = {};
      for (const [k, v] of Object.entries(value)) {
        nested[k] = createPulse(`${key}.${k}`, v, depth + 1);
      }
      return nested;
    }

    const p = pulse(value);
    pulses[key] = p;
    return p;
  }

  // Initialize state
  for (const [key, value] of Object.entries(state)) {
    store[key] = createPulse(key, value);
  }

  // Sync nested pulses for persisted state to ensure consistency
  if (persist && typeof localStorage !== 'undefined') {
    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        updateNestedPulses(key, value);
      }
    }
  }

  // Persist state changes
  if (persist) {
    effect(() => {
      const snapshot = {};
      for (const [key, p] of Object.entries(pulses)) {
        snapshot[key] = p.get();
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch (e) {
        log.warn('Failed to persist state:', e);
      }
    });
  }

  /**
   * Get a snapshot of the current state (without tracking)
   * @returns {Object} Plain object with current values
   */
  function getState() {
    const snapshot = {};
    for (const [key, p] of Object.entries(pulses)) {
      snapshot[key] = p.peek();
    }
    return snapshot;
  }

  /**
   * Update nested pulses recursively when a parent object is updated
   * @private
   * @param {string} prefix - The key prefix (e.g., 'user')
   * @param {Object} obj - The new object value
   */
  function updateNestedPulses(prefix, obj) {
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = `${prefix}.${k}`;
      if (pulses[fullKey]) {
        pulses[fullKey].set(v);
        // Recursively update deeper nested objects
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          updateNestedPulses(fullKey, v);
        }
      }
    }
  }

  /**
   * Set multiple values at once (batched)
   * Supports both top-level and nested object updates
   * @param {Object} updates - Key-value pairs to update
   * @returns {void}
   * @example
   * // Top-level update
   * store.$setState({ count: 5 });
   *
   * // Nested object update
   * store.$setState({ user: { name: 'Jane', age: 25 } });
   */
  function setState(updates) {
    batch(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (pulses[key]) {
          pulses[key].set(value);
          // If the value is an object, also update nested pulses
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            updateNestedPulses(key, value);
          }
        }
      }
    });
  }

  /**
   * Reset state to initial values
   * @returns {void}
   */
  function reset() {
    batch(() => {
      for (const [key, value] of Object.entries(initialState)) {
        if (pulses[key]) {
          pulses[key].set(value);
        }
      }
    });
  }

  /**
   * Subscribe to all state changes
   * @param {function(Object): void} callback - Called with current state on each change
   * @returns {function(): void} Unsubscribe function
   */
  function subscribe(callback) {
    return effect(() => {
      const state = getState();
      callback(state);
    });
  }

  // Attach methods to store
  store.$getState = getState;
  store.$setState = setState;
  store.$reset = reset;
  store.$subscribe = subscribe;
  store.$pulses = pulses;

  return store;
}

/**
 * Create bound actions that can modify the store.
 * Actions receive the store as their first argument.
 * @template T
 * @param {Store} store - The store to bind actions to
 * @param {Object.<string, function(Store, ...any): any>} actions - Action definitions
 * @returns {Object.<string, function(...any): any>} Bound action functions
 * @example
 * const store = createStore({ count: 0 });
 *
 * const actions = createActions(store, {
 *   increment: (store) => store.count.update(n => n + 1),
 *   decrement: (store) => store.count.update(n => n - 1),
 *   add: (store, amount) => store.count.update(n => n + amount)
 * });
 *
 * actions.increment();
 * actions.add(10);
 */
export function createActions(store, actions) {
  const boundActions = {};

  for (const [name, action] of Object.entries(actions)) {
    boundActions[name] = (...args) => {
      return action(store, ...args);
    };
  }

  return boundActions;
}

/**
 * Create computed getters for the store.
 * Getters are memoized and update automatically when dependencies change.
 * @param {Store} store - The store to create getters for
 * @param {Object.<string, function(Store): any>} getters - Getter definitions
 * @returns {Object.<string, Pulse>} Object of computed pulses
 * @example
 * const store = createStore({ items: [], filter: '' });
 *
 * const getters = createGetters(store, {
 *   filteredItems: (store) => {
 *     const items = store.items.get();
 *     const filter = store.filter.get();
 *     return items.filter(i => i.includes(filter));
 *   },
 *   itemCount: (store) => store.items.get().length
 * });
 *
 * getters.filteredItems.get(); // Computed value
 */
export function createGetters(store, getters) {
  const boundGetters = {};

  for (const [name, getter] of Object.entries(getters)) {
    boundGetters[name] = computed(() => getter(store));
  }

  return boundGetters;
}

/**
 * Combine multiple stores into a single object.
 * Each store is namespaced under its key.
 * @param {Object.<string, Store>} stores - Stores to combine
 * @returns {Object.<string, Store>} Combined stores object
 * @example
 * const userStore = createStore({ name: '', email: '' });
 * const settingsStore = createStore({ theme: 'dark' });
 *
 * const rootStore = combineStores({
 *   user: userStore,
 *   settings: settingsStore
 * });
 *
 * rootStore.user.name.get();
 * rootStore.settings.theme.set('light');
 */
export function combineStores(stores) {
  const combined = {};

  for (const [namespace, store] of Object.entries(stores)) {
    combined[namespace] = store;
  }

  return combined;
}

/**
 * Create a module-based store similar to Vuex modules.
 * Each module has its own state, actions, and getters.
 * @param {Object.<string, ModuleDef>} modules - Module definitions
 * @returns {Object} Root store with namespaced modules
 * @example
 * const store = createModuleStore({
 *   user: {
 *     state: { name: '', loggedIn: false },
 *     actions: {
 *       login: (store, name) => {
 *         store.name.set(name);
 *         store.loggedIn.set(true);
 *       }
 *     },
 *     getters: {
 *       displayName: (store) => store.loggedIn.get() ? store.name.get() : 'Guest'
 *     }
 *   },
 *   cart: {
 *     state: { items: [] },
 *     actions: {
 *       addItem: (store, item) => store.items.update(arr => [...arr, item])
 *     }
 *   }
 * });
 *
 * store.user.login('John');
 * store.cart.addItem({ id: 1, name: 'Product' });
 * store.$getState(); // { user: {...}, cart: {...} }
 */
export function createModuleStore(modules) {
  const stores = {};
  const rootStore = {};

  for (const [name, module] of Object.entries(modules)) {
    const { state = {}, actions = {}, getters = {} } = module;

    const store = createStore(state);
    const boundActions = createActions(store, actions);
    const boundGetters = createGetters(store, getters);

    stores[name] = {
      ...store,
      ...boundActions,
      ...boundGetters
    };

    // Also expose at root level
    rootStore[name] = stores[name];
  }

  /**
   * Get combined state from all modules
   * @returns {Object} State from all modules
   */
  rootStore.$getState = () => {
    const state = {};
    for (const [name, store] of Object.entries(stores)) {
      state[name] = store.$getState();
    }
    return state;
  };

  /**
   * Reset all modules to initial state
   * @returns {void}
   */
  rootStore.$reset = () => {
    for (const store of Object.values(stores)) {
      store.$reset();
    }
  };

  return rootStore;
}

/**
 * Apply a plugin to a store.
 * Plugins can extend store functionality.
 * @param {Store} store - The store to enhance
 * @param {StorePlugin} plugin - Plugin function
 * @returns {Store} Enhanced store
 * @example
 * const store = createStore({ count: 0 });
 * usePlugin(store, loggerPlugin);
 * usePlugin(store, historyPlugin);
 */
export function usePlugin(store, plugin) {
  return plugin(store);
}

/**
 * Logger plugin - logs all state changes to console.
 * Useful for debugging store updates.
 * @param {Store} store - The store to add logging to
 * @returns {Store} Store with logging enabled
 * @example
 * const store = createStore({ count: 0 });
 * usePlugin(store, loggerPlugin);
 *
 * store.$setState({ count: 5 });
 * // Console: [Store:Update] State Change
 * //   Previous: { count: 0 }
 * //   Updates: { count: 5 }
 * //   Next: { count: 5 }
 */
export function loggerPlugin(store) {
  const originalSetState = store.$setState;
  const pluginLog = createLogger('Store:Update');

  store.$setState = (updates) => {
    pluginLog.group('State Change');
    pluginLog.debug('Previous:', store.$getState());
    pluginLog.debug('Updates:', updates);
    originalSetState(updates);
    pluginLog.debug('Next:', store.$getState());
    pluginLog.groupEnd();
  };

  return store;
}

/**
 * History plugin - enables undo/redo functionality.
 * Tracks state changes and allows reverting to previous states.
 * @param {Store} store - The store to add history to
 * @param {number} [maxHistory=50] - Maximum number of history states to keep
 * @returns {Store & {$undo: function, $redo: function, $canUndo: function, $canRedo: function}} Store with history methods
 * @example
 * const store = createStore({ count: 0 });
 * usePlugin(store, (s) => historyPlugin(s, 100));
 *
 * store.$setState({ count: 1 });
 * store.$setState({ count: 2 });
 *
 * store.$canUndo(); // true
 * store.$undo();    // count = 1
 * store.$redo();    // count = 2
 */
export function historyPlugin(store, maxHistory = 50) {
  /** @type {Array<Object>} */
  const history = [store.$getState()];
  /** @type {number} */
  let currentIndex = 0;

  const originalSetState = store.$setState;

  store.$setState = (updates) => {
    // Remove any future states if we're not at the end
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    originalSetState(updates);

    // Add new state to history
    history.push(store.$getState());
    if (history.length > maxHistory) {
      history.shift();
    } else {
      currentIndex++;
    }
  };

  /**
   * Undo the last state change
   * @returns {void}
   */
  store.$undo = () => {
    if (currentIndex > 0) {
      currentIndex--;
      const state = history[currentIndex];
      batch(() => {
        for (const [key, value] of Object.entries(state)) {
          if (store.$pulses[key]) {
            store.$pulses[key].set(value);
          }
        }
      });
    }
  };

  /**
   * Redo a previously undone state change
   * @returns {void}
   */
  store.$redo = () => {
    if (currentIndex < history.length - 1) {
      currentIndex++;
      const state = history[currentIndex];
      batch(() => {
        for (const [key, value] of Object.entries(state)) {
          if (store.$pulses[key]) {
            store.$pulses[key].set(value);
          }
        }
      });
    }
  };

  /**
   * Check if undo is available
   * @returns {boolean} True if there are states to undo
   */
  store.$canUndo = () => currentIndex > 0;

  /**
   * Check if redo is available
   * @returns {boolean} True if there are states to redo
   */
  store.$canRedo = () => currentIndex < history.length - 1;

  return store;
}

export default {
  createStore,
  createActions,
  createGetters,
  combineStores,
  createModuleStore,
  usePlugin,
  loggerPlugin,
  historyPlugin
};
