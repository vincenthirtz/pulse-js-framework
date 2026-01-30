/**
 * Pulse - Reactive Primitives
 * @module pulse-js-framework/runtime/pulse
 *
 * The core reactivity system based on "pulsations" -
 * reactive values that propagate changes through the system.
 *
 * @example
 * import { pulse, effect, computed } from './pulse.js';
 *
 * const count = pulse(0);
 * const doubled = computed(() => count.get() * 2);
 *
 * effect(() => {
 *   console.log('Count:', count.get(), 'Doubled:', doubled.get());
 * });
 *
 * count.set(5); // Logs: Count: 5 Doubled: 10
 */

import { loggers } from './logger.js';

const log = loggers.pulse;

// Current tracking context for automatic dependency collection
/** @type {EffectFn|null} */
let currentEffect = null;
/** @type {number} */
let batchDepth = 0;
/** @type {Set<EffectFn>} */
let pendingEffects = new Set();
/** @type {boolean} */
let isRunningEffects = false;
/** @type {Array<Function>} */
let cleanupQueue = [];

/**
 * @typedef {Object} EffectFn
 * @property {Function} run - The effect function to execute
 * @property {Set<Pulse>} dependencies - Set of pulse dependencies
 * @property {Array<Function>} cleanups - Cleanup functions to run
 */

/**
 * @typedef {Object} PulseOptions
 * @property {function(*, *): boolean} [equals] - Custom equality function (default: Object.is)
 */

/**
 * @typedef {Object} ComputedOptions
 * @property {boolean} [lazy=false] - If true, only compute when value is read
 */

/**
 * @typedef {Object} MemoOptions
 * @property {function(*, *): boolean} [equals] - Custom equality function for args comparison
 */

/**
 * @typedef {Object} MemoComputedOptions
 * @property {Array<Pulse|Function>} [deps] - Dependencies to watch for changes
 * @property {function(*, *): boolean} [equals] - Custom equality function
 */

/**
 * @typedef {Object} ReactiveState
 * @property {Object.<string, Pulse>} $pulses - Access to underlying pulse objects
 * @property {function(string): Pulse} $pulse - Get pulse by key
 */

/**
 * @typedef {Object} PromiseState
 * @property {Pulse<T>} value - The resolved value
 * @property {Pulse<boolean>} loading - Loading state
 * @property {Pulse<Error|null>} error - Error state
 * @template T
 */

/**
 * Register a cleanup function for the current effect.
 * Called when the effect re-runs or is disposed.
 * @param {Function} fn - Cleanup function to register
 * @returns {void}
 * @example
 * effect(() => {
 *   const timer = setInterval(() => console.log('tick'), 1000);
 *   onCleanup(() => clearInterval(timer));
 * });
 */
export function onCleanup(fn) {
  if (currentEffect) {
    currentEffect.cleanups.push(fn);
  }
}

/**
 * Pulse - A reactive value container.
 * When the value changes, it "pulses" to all its dependents.
 * @template T
 */
export class Pulse {
  /** @type {T} */
  #value;
  /** @type {Set<EffectFn>} */
  #subscribers = new Set();
  /** @type {function(T, T): boolean} */
  #equals;

  /**
   * Create a new Pulse with an initial value
   * @param {T} value - The initial value
   * @param {PulseOptions} [options={}] - Configuration options
   */
  constructor(value, options = {}) {
    this.#value = value;
    this.#equals = options.equals ?? Object.is;
  }

  /**
   * Get the current value and track dependency if in an effect context
   * @returns {T} The current value
   * @example
   * const name = pulse('Alice');
   * effect(() => {
   *   console.log(name.get()); // Tracks dependency automatically
   * });
   */
  get() {
    if (currentEffect) {
      this.#subscribers.add(currentEffect);
      currentEffect.dependencies.add(this);
    }
    return this.#value;
  }

  /**
   * Set a new value and notify all subscribers
   * @param {T} newValue - The new value to set
   * @returns {void}
   * @example
   * const count = pulse(0);
   * count.set(5);
   */
  set(newValue) {
    if (this.#equals(this.#value, newValue)) return;
    this.#value = newValue;
    this.#notify();
  }

  /**
   * Update value using a function
   * @param {function(T): T} fn - Update function receiving current value
   * @returns {void}
   * @example
   * const count = pulse(0);
   * count.update(n => n + 1); // Increment
   */
  update(fn) {
    this.set(fn(this.#value));
  }

  /**
   * Subscribe to value changes
   * @param {function(T): void} fn - Callback invoked on each change
   * @returns {function(): void} Unsubscribe function
   * @example
   * const count = pulse(0);
   * const unsub = count.subscribe(value => console.log(value));
   * count.set(1); // Logs: 1
   * unsub(); // Stop listening
   */
  subscribe(fn) {
    const subscriber = { run: fn, dependencies: new Set() };
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  /**
   * Create a derived pulse that recomputes when this changes
   * @template U
   * @param {function(T): U} fn - Derivation function
   * @returns {Pulse<U>} A new computed pulse
   * @example
   * const count = pulse(5);
   * const doubled = count.derive(n => n * 2);
   * doubled.get(); // 10
   */
  derive(fn) {
    return computed(() => fn(this.get()));
  }

  /**
   * Notify all subscribers of a change
   * @private
   * @returns {void}
   */
  #notify() {
    // Copy subscribers to avoid mutation during iteration
    const subs = [...this.#subscribers];

    for (const subscriber of subs) {
      if (batchDepth > 0 || isRunningEffects) {
        pendingEffects.add(subscriber);
      } else {
        runEffect(subscriber);
      }
    }
  }

  /**
   * Unsubscribe a specific subscriber (internal use)
   * @param {EffectFn} subscriber - The subscriber to remove
   * @returns {void}
   * @internal
   */
  _unsubscribe(subscriber) {
    this.#subscribers.delete(subscriber);
  }

  /**
   * Get value without tracking (for debugging/inspection)
   * @returns {T} The current value without tracking dependency
   * @example
   * const count = pulse(5);
   * count.peek(); // 5, no dependency tracked
   */
  peek() {
    return this.#value;
  }

  /**
   * Initialize value without triggering notifications (internal use)
   * @param {T} value - The value to set
   * @returns {void}
   * @internal
   */
  _init(value) {
    this.#value = value;
  }

  /**
   * Set from computed - propagates to subscribers (internal use)
   * @param {T} newValue - The new value
   * @returns {void}
   * @internal
   */
  _setFromComputed(newValue) {
    if (this.#equals(this.#value, newValue)) return;
    this.#value = newValue;
    this.#notify();
  }

  /**
   * Add a subscriber directly (internal use)
   * @param {EffectFn} subscriber - The subscriber to add
   * @returns {void}
   * @internal
   */
  _addSubscriber(subscriber) {
    this.#subscribers.add(subscriber);
  }

  /**
   * Trigger notification to all subscribers (internal use)
   * @returns {void}
   * @internal
   */
  _triggerNotify() {
    this.#notify();
  }
}

/**
 * Run a single effect safely
 * @private
 * @param {EffectFn} effectFn - The effect to run
 * @returns {void}
 */
function runEffect(effectFn) {
  if (!effectFn || !effectFn.run) return;

  try {
    effectFn.run();
  } catch (error) {
    log.error('Effect error:', error);
  }
}

/**
 * Flush all pending effects
 * @private
 * @returns {void}
 */
function flushEffects() {
  if (isRunningEffects) return;

  isRunningEffects = true;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  try {
    while (pendingEffects.size > 0 && iterations < maxIterations) {
      iterations++;
      const effects = [...pendingEffects];
      pendingEffects.clear();

      for (const effect of effects) {
        runEffect(effect);
      }
    }

    if (iterations >= maxIterations) {
      log.warn('Maximum effect iterations reached. Possible infinite loop.');
      pendingEffects.clear();
    }
  } finally {
    isRunningEffects = false;
  }
}

/**
 * Create a reactive pulse with an initial value
 * @template T
 * @param {T} value - The initial value
 * @param {PulseOptions} [options] - Configuration options
 * @returns {Pulse<T>} A new Pulse instance
 * @example
 * const count = pulse(0);
 * const user = pulse({ name: 'Alice' });
 *
 * // With custom equality
 * const data = pulse(obj, { equals: (a, b) => a.id === b.id });
 */
export function pulse(value, options) {
  return new Pulse(value, options);
}

/**
 * Create a computed pulse that automatically updates when its dependencies change
 * @template T
 * @param {function(): T} fn - Computation function
 * @param {ComputedOptions} [options={}] - Configuration options
 * @returns {Pulse<T>} A read-only Pulse that updates automatically
 * @example
 * const firstName = pulse('John');
 * const lastName = pulse('Doe');
 * const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);
 *
 * fullName.get(); // 'John Doe'
 * firstName.set('Jane');
 * fullName.get(); // 'Jane Doe'
 *
 * // Lazy computation (only runs when read)
 * const expensive = computed(() => heavyCalculation(), { lazy: true });
 */
export function computed(fn, options = {}) {
  const { lazy = false } = options;
  const p = new Pulse(undefined);
  let initialized = false;
  let dirty = true;
  let cachedValue;
  let cleanup = null;

  if (lazy) {
    // Lazy computed - only evaluates when read
    const originalGet = p.get.bind(p);

    // Track which pulses this depends on
    let trackedDeps = new Set();

    p.get = function() {
      if (dirty) {
        // Run computation
        const prevEffect = currentEffect;
        const tempEffect = {
          run: () => {},
          dependencies: new Set(),
          cleanups: []
        };
        currentEffect = tempEffect;

        try {
          cachedValue = fn();
          dirty = false;

          // Cleanup old subscriptions
          for (const dep of trackedDeps) {
            dep._unsubscribe(markDirty);
          }

          // Set up new subscriptions
          trackedDeps = tempEffect.dependencies;
          for (const dep of trackedDeps) {
            dep.subscribe(() => {
              dirty = true;
              // Notify our own subscribers
              p._triggerNotify();
            });
          }

          p._init(cachedValue);
        } finally {
          currentEffect = prevEffect;
        }
      }

      // Track dependency on this computed
      if (currentEffect) {
        p._addSubscriber(currentEffect);
        currentEffect.dependencies.add(p);
      }

      return cachedValue;
    };

    const markDirty = { run: () => { dirty = true; }, dependencies: new Set(), cleanups: [] };
  } else {
    // Eager computed - updates immediately when dependencies change
    cleanup = effect(() => {
      const newValue = fn();
      if (!initialized) {
        p._init(newValue);
        initialized = true;
      } else {
        // Use set() to properly propagate to downstream subscribers
        p._setFromComputed(newValue);
      }
    });
  }

  // Override set to make it read-only
  p.set = () => {
    throw new Error('Cannot set a computed pulse directly');
  };

  p.update = () => {
    throw new Error('Cannot update a computed pulse directly');
  };

  // Add dispose method
  p.dispose = () => {
    if (cleanup) cleanup();
  };

  return p;
}

/**
 * Create an effect that runs when its dependencies change
 * @param {function(): void|function(): void} fn - Effect function, may return a cleanup function
 * @returns {function(): void} Dispose function to stop the effect
 * @example
 * const count = pulse(0);
 *
 * // Basic effect
 * const dispose = effect(() => {
 *   console.log('Count is:', count.get());
 * });
 *
 * count.set(1); // Logs: Count is: 1
 * dispose(); // Stop listening
 *
 * // With cleanup
 * effect(() => {
 *   const timer = setInterval(() => tick(), 1000);
 *   return () => clearInterval(timer); // Cleanup on re-run or dispose
 * });
 */
export function effect(fn) {
  const effectFn = {
    run: () => {
      // Run cleanup functions from previous run
      for (const cleanup of effectFn.cleanups) {
        try {
          cleanup();
        } catch (e) {
          log.error('Cleanup error:', e);
        }
      }
      effectFn.cleanups = [];

      // Clean up old dependencies
      for (const dep of effectFn.dependencies) {
        dep._unsubscribe(effectFn);
      }
      effectFn.dependencies.clear();

      // Set as current effect for dependency tracking
      const prevEffect = currentEffect;
      currentEffect = effectFn;

      try {
        fn();
      } catch (error) {
        log.error('Effect execution error:', error);
      } finally {
        currentEffect = prevEffect;
      }
    },
    dependencies: new Set(),
    cleanups: []
  };

  // Run immediately to collect dependencies
  effectFn.run();

  // Return cleanup function
  return () => {
    // Run any pending cleanups
    for (const cleanup of effectFn.cleanups) {
      try {
        cleanup();
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    effectFn.cleanups = [];

    for (const dep of effectFn.dependencies) {
      dep._unsubscribe(effectFn);
    }
    effectFn.dependencies.clear();
  };
}

/**
 * Batch multiple updates into one. Effects only run after all updates complete.
 * @template T
 * @param {function(): T} fn - Function containing multiple updates
 * @returns {T} The return value of fn
 * @example
 * const x = pulse(0);
 * const y = pulse(0);
 *
 * effect(() => console.log(x.get(), y.get()));
 *
 * // Without batch: logs twice
 * x.set(1);
 * y.set(1);
 *
 * // With batch: logs once
 * batch(() => {
 *   x.set(2);
 *   y.set(2);
 * });
 */
export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}

/**
 * Create a reactive state object from a plain object.
 * Each property becomes a pulse with getters/setters.
 * @template T
 * @param {T} obj - Plain object with initial values
 * @returns {T & ReactiveState} Reactive state object
 * @example
 * const state = createState({
 *   count: 0,
 *   items: ['a', 'b']
 * });
 *
 * // Use as regular properties
 * state.count = 5;
 * console.log(state.count); // 5
 *
 * // Array helpers
 * state.items$push('c');
 * state.items$filter(item => item !== 'a');
 *
 * // Access underlying pulses
 * state.$pulse('count').subscribe(v => console.log(v));
 */
export function createState(obj) {
  const state = {};
  const pulses = {};

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // Arrays get special handling with reactive methods
      pulses[key] = new Pulse(value);

      Object.defineProperty(state, key, {
        get() {
          return pulses[key].get();
        },
        set(newValue) {
          pulses[key].set(newValue);
        },
        enumerable: true
      });

      // Add array helper methods
      state[`${key}$push`] = (...items) => {
        pulses[key].update(arr => [...arr, ...items]);
      };
      state[`${key}$pop`] = () => {
        let popped;
        pulses[key].update(arr => {
          popped = arr[arr.length - 1];
          return arr.slice(0, -1);
        });
        return popped;
      };
      state[`${key}$shift`] = () => {
        let shifted;
        pulses[key].update(arr => {
          shifted = arr[0];
          return arr.slice(1);
        });
        return shifted;
      };
      state[`${key}$unshift`] = (...items) => {
        pulses[key].update(arr => [...items, ...arr]);
      };
      state[`${key}$splice`] = (start, deleteCount, ...items) => {
        let removed;
        pulses[key].update(arr => {
          const copy = [...arr];
          removed = copy.splice(start, deleteCount, ...items);
          return copy;
        });
        return removed;
      };
      state[`${key}$filter`] = (fn) => {
        pulses[key].update(arr => arr.filter(fn));
      };
      state[`${key}$map`] = (fn) => {
        pulses[key].update(arr => arr.map(fn));
      };
      state[`${key}$sort`] = (fn) => {
        pulses[key].update(arr => [...arr].sort(fn));
      };
    } else if (typeof value === 'object' && value !== null) {
      // Recursively create state for nested objects
      state[key] = createState(value);
    } else {
      pulses[key] = new Pulse(value);

      Object.defineProperty(state, key, {
        get() {
          return pulses[key].get();
        },
        set(newValue) {
          pulses[key].set(newValue);
        },
        enumerable: true
      });
    }
  }

  // Expose the raw pulses for advanced use
  state.$pulses = pulses;

  // Helper to get a pulse by key
  state.$pulse = (key) => pulses[key];

  return state;
}

/**
 * Memoize a function based on its arguments.
 * Only recomputes when arguments change.
 * @template {function} T
 * @param {T} fn - Function to memoize
 * @param {MemoOptions} [options={}] - Configuration options
 * @returns {T} Memoized function
 * @example
 * const expensiveCalc = memo((x, y) => {
 *   console.log('Computing...');
 *   return x * y;
 * });
 *
 * expensiveCalc(2, 3); // Logs: Computing... Returns: 6
 * expensiveCalc(2, 3); // Returns: 6 (cached, no log)
 * expensiveCalc(3, 4); // Logs: Computing... Returns: 12
 */
export function memo(fn, options = {}) {
  const { equals = Object.is } = options;
  let cachedResult;
  let cachedDeps = null;
  let initialized = false;

  return (...args) => {
    // Check if args have changed
    const depsChanged = !cachedDeps ||
      args.length !== cachedDeps.length ||
      args.some((arg, i) => !equals(arg, cachedDeps[i]));

    if (!initialized || depsChanged) {
      cachedResult = fn(...args);
      cachedDeps = args;
      initialized = true;
    }

    return cachedResult;
  };
}

/**
 * Create a memoized computed value.
 * Combines memo with computed for expensive derivations.
 * @template T
 * @param {function(): T} fn - Computation function
 * @param {MemoComputedOptions} [options={}] - Configuration options
 * @returns {Pulse<T>} A computed pulse that only recalculates when deps change
 * @example
 * const items = pulse([1, 2, 3, 4, 5]);
 * const filter = pulse('');
 *
 * const filtered = memoComputed(
 *   () => items.get().filter(i => String(i).includes(filter.get())),
 *   { deps: [items, filter] }
 * );
 */
export function memoComputed(fn, options = {}) {
  const { deps = [], equals = Object.is } = options;
  let lastDeps = null;
  let lastResult;

  return computed(() => {
    const currentDeps = deps.map(d => typeof d === 'function' ? d() : d.get());

    const depsChanged = !lastDeps ||
      currentDeps.length !== lastDeps.length ||
      currentDeps.some((d, i) => !equals(d, lastDeps[i]));

    if (depsChanged) {
      lastResult = fn();
      lastDeps = currentDeps;
    }

    return lastResult;
  });
}

/**
 * Watch specific pulses and run a callback when they change.
 * Unlike effect, provides both new and old values.
 * @template T
 * @param {Pulse<T>|Array<Pulse<T>>} sources - Pulse(s) to watch
 * @param {function(Array<T>, Array<T>): void} callback - Called with (newValues, oldValues)
 * @returns {function(): void} Dispose function to stop watching
 * @example
 * const count = pulse(0);
 *
 * const stop = watch(count, ([newVal], [oldVal]) => {
 *   console.log(`Changed from ${oldVal} to ${newVal}`);
 * });
 *
 * count.set(1); // Logs: Changed from 0 to 1
 * stop();
 *
 * // Watch multiple
 * watch([a, b], ([newA, newB], [oldA, oldB]) => {
 *   console.log('Values changed');
 * });
 */
export function watch(sources, callback) {
  const sourcesArray = Array.isArray(sources) ? sources : [sources];

  let oldValues = sourcesArray.map(s => s.peek());

  return effect(() => {
    const newValues = sourcesArray.map(s => s.get());
    callback(newValues, oldValues);
    oldValues = newValues;
  });
}

/**
 * Create pulses from a promise, tracking loading and error states.
 * @template T
 * @param {Promise<T>} promise - The promise to track
 * @param {T} [initialValue=undefined] - Initial value while loading
 * @returns {PromiseState<T>} Object with value, loading, and error pulses
 * @example
 * const { value, loading, error } = fromPromise(
 *   fetch('/api/data').then(r => r.json()),
 *   [] // Initial value
 * );
 *
 * effect(() => {
 *   if (loading.get()) return console.log('Loading...');
 *   if (error.get()) return console.log('Error:', error.get());
 *   console.log('Data:', value.get());
 * });
 */
export function fromPromise(promise, initialValue = undefined) {
  const p = pulse(initialValue);
  const loading = pulse(true);
  const error = pulse(null);

  promise
    .then(value => {
      batch(() => {
        p.set(value);
        loading.set(false);
      });
    })
    .catch(err => {
      batch(() => {
        error.set(err);
        loading.set(false);
      });
    });

  return { value: p, loading, error };
}

/**
 * Execute a function without tracking any pulse dependencies.
 * Useful for reading values without creating subscriptions.
 * @template T
 * @param {function(): T} fn - Function to execute untracked
 * @returns {T} The return value of fn
 * @example
 * effect(() => {
 *   const a = aSignal.get(); // Tracked
 *   const b = untrack(() => bSignal.get()); // Not tracked
 *   console.log(a, b);
 * });
 * // Effect only re-runs when aSignal changes, not bSignal
 */
export function untrack(fn) {
  const prevEffect = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
  }
}

export default {
  Pulse,
  pulse,
  computed,
  effect,
  batch,
  createState,
  watch,
  fromPromise,
  untrack,
  onCleanup,
  memo,
  memoComputed
};
