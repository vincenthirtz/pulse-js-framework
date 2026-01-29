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
export function computed(fn) {
  const p = new Pulse(undefined);
  let initialized = false;

  effect(() => {
    const newValue = fn();
    if (initialized) {
      p._init(newValue); // Use _init to avoid triggering notifications during compute
    } else {
      p._init(newValue);
      initialized = true;
    }
  });

  // Override set to make it read-only
  p.set = () => {
    throw new Error('Cannot set a computed pulse directly');
  };

  return p;
}

/**
 * Create an effect that runs when its dependencies change
 */
export function effect(fn) {
  const effectFn = {
    run: () => {
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
    dependencies: new Set()
  };

  // Run immediately to collect dependencies
  effectFn.run();

  // Return cleanup function
  return () => {
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
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
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
  untrack
};
