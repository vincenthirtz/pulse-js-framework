/**
 * Pulse Store - Global state management
 *
 * A simple but powerful store that integrates with Pulse reactivity
 */

import { pulse, computed, effect, batch } from './pulse.js';

/**
 * Create a global store
 */
export function createStore(initialState = {}, options = {}) {
  const { persist = false, storageKey = 'pulse-store' } = options;

  // Load persisted state if enabled
  let state = initialState;
  if (persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        state = { ...initialState, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load persisted state:', e);
    }
  }

  // Create pulses for each state property
  const pulses = {};
  const store = {};

  function createPulse(key, value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested object - create nested store
      const nested = {};
      for (const [k, v] of Object.entries(value)) {
        nested[k] = createPulse(`${key}.${k}`, v);
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
        console.warn('Failed to persist state:', e);
      }
    });
  }

  /**
   * Get a snapshot of the current state
   */
  function getState() {
    const snapshot = {};
    for (const [key, p] of Object.entries(pulses)) {
      snapshot[key] = p.peek();
    }
    return snapshot;
  }

  /**
   * Set multiple values at once
   */
  function setState(updates) {
    batch(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (pulses[key]) {
          pulses[key].set(value);
        }
      }
    });
  }

  /**
   * Reset state to initial values
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
 * Create actions that can modify the store
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
 * Create getters (computed values) for the store
 */
export function createGetters(store, getters) {
  const boundGetters = {};

  for (const [name, getter] of Object.entries(getters)) {
    boundGetters[name] = computed(() => getter(store));
  }

  return boundGetters;
}

/**
 * Combine multiple stores
 */
export function combineStores(stores) {
  const combined = {};

  for (const [namespace, store] of Object.entries(stores)) {
    combined[namespace] = store;
  }

  return combined;
}

/**
 * Create a module-based store (like Vuex modules)
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

  // Root methods
  rootStore.$getState = () => {
    const state = {};
    for (const [name, store] of Object.entries(stores)) {
      state[name] = store.$getState();
    }
    return state;
  };

  rootStore.$reset = () => {
    for (const store of Object.values(stores)) {
      store.$reset();
    }
  };

  return rootStore;
}

/**
 * Plugin system for store
 */
export function usePlugin(store, plugin) {
  return plugin(store);
}

/**
 * Logger plugin - logs all state changes
 */
export function loggerPlugin(store) {
  const originalSetState = store.$setState;

  store.$setState = (updates) => {
    console.group('Store Update');
    console.log('Previous:', store.$getState());
    console.log('Updates:', updates);
    originalSetState(updates);
    console.log('Next:', store.$getState());
    console.groupEnd();
  };

  return store;
}

/**
 * History plugin - enables undo/redo
 */
export function historyPlugin(store, maxHistory = 50) {
  const history = [store.$getState()];
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

  store.$canUndo = () => currentIndex > 0;
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
