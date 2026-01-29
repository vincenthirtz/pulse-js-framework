/**
 * Pulse - Reactive Primitives
 *
 * The core reactivity system based on "pulsations" -
 * reactive values that propagate changes through the system.
 */

// Current tracking context for automatic dependency collection
let currentEffect = null;
let batchDepth = 0;
let pendingEffects = new Set();
let isRunningEffects = false;
let cleanupQueue = [];

/**
 * Register a cleanup function for the current effect
 * Called when the effect re-runs or is disposed
 */
export function onCleanup(fn) {
  if (currentEffect) {
    currentEffect.cleanups.push(fn);
  }
}

/**
 * Pulse - A reactive value container
 * When the value changes, it "pulses" to all its dependents
 */
export class Pulse {
  #value;
  #subscribers = new Set();
  #equals;

  constructor(value, options = {}) {
    this.#value = value;
    this.#equals = options.equals ?? Object.is;
  }

  /**
   * Get the current value and track dependency if in an effect context
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
   */
  set(newValue) {
    if (this.#equals(this.#value, newValue)) return;
    this.#value = newValue;
    this.#notify();
  }

  /**
   * Update value using a function
   */
  update(fn) {
    this.set(fn(this.#value));
  }

  /**
   * Subscribe to changes
   */
  subscribe(fn) {
    const subscriber = { run: fn, dependencies: new Set() };
    this.#subscribers.add(subscriber);
    return () => this.#subscribers.delete(subscriber);
  }

  /**
   * Create a derived pulse that recomputes when this changes
   */
  derive(fn) {
    return computed(() => fn(this.get()));
  }

  /**
   * Notify all subscribers of a change
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
   * Unsubscribe a specific subscriber
   */
  _unsubscribe(subscriber) {
    this.#subscribers.delete(subscriber);
  }

  /**
   * Get value without tracking (for debugging/inspection)
   */
  peek() {
    return this.#value;
  }

  /**
   * Initialize value without triggering notifications (internal use)
   */
  _init(value) {
    this.#value = value;
  }

  /**
   * Set from computed - propagates to subscribers (internal use)
   */
  _setFromComputed(newValue) {
    if (this.#equals(this.#value, newValue)) return;
    this.#value = newValue;
    this.#notify();
  }

  /**
   * Add a subscriber directly (internal use)
   */
  _addSubscriber(subscriber) {
    this.#subscribers.add(subscriber);
  }

  /**
   * Trigger notification to all subscribers (internal use)
   */
  _triggerNotify() {
    this.#notify();
  }
}

/**
 * Run a single effect safely
 */
function runEffect(effectFn) {
  if (!effectFn || !effectFn.run) return;

  try {
    effectFn.run();
  } catch (error) {
    console.error('Effect error:', error);
  }
}

/**
 * Flush all pending effects
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
      console.warn('Pulse: Maximum effect iterations reached. Possible infinite loop.');
      pendingEffects.clear();
    }
  } finally {
    isRunningEffects = false;
  }
}

/**
 * Create a simple pulse with an initial value
 */
export function pulse(value, options) {
  return new Pulse(value, options);
}

/**
 * Create a computed pulse that automatically updates
 * when its dependencies change
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
 */
export function effect(fn) {
  const effectFn = {
    run: () => {
      // Run cleanup functions from previous run
      for (const cleanup of effectFn.cleanups) {
        try {
          cleanup();
        } catch (e) {
          console.error('Cleanup error:', e);
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
        console.error('Effect execution error:', error);
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
 * Batch multiple updates into one
 * Effects only run after all updates complete
 */
export function batch(fn) {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}

/**
 * Create a reactive state object from a plain object
 * Each property becomes a pulse
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
 * Memoize a function based on reactive dependencies
 * Only recomputes when dependencies change
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
 * Create a memoized computed value
 * Combines memo with computed for expensive derivations
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
 * Watch specific pulses and run a callback when they change
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
 * Create a pulse from a promise
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
 * Untrack - read pulses without creating dependencies
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
