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
import { Errors } from './errors.js';

const log = loggers.pulse;

// =============================================================================
// SSR MODE FLAG
// =============================================================================

/**
 * SSR mode flag - when true, effects run once without setting up subscriptions.
 * This is set by the SSR module during server-side rendering.
 * @type {boolean}
 */
let ssrModeEnabled = false;

/**
 * Check if SSR mode is enabled.
 * In SSR mode, effects run once but don't subscribe to changes.
 * @returns {boolean}
 */
export function isSSRMode() {
  return ssrModeEnabled;
}

/**
 * Set SSR mode (used internally by ssr.js).
 * @param {boolean} enabled - Whether to enable SSR mode
 * @internal
 */
export function setSSRMode(enabled) {
  ssrModeEnabled = enabled;
}

// =============================================================================
// REACTIVE DEPENDENCY TRACKING ALGORITHM
// =============================================================================
//
// This module implements a push-based reactive system using automatic dependency
// tracking. Here's how it works:
//
// 1. READING (Dependency Collection)
//    - When an effect runs, `context.currentEffect` points to it
//    - When a pulse's get() is called, it checks if there's a currentEffect
//    - If so, it adds the effect to its subscribers and vice versa
//    - This creates a bidirectional link: pulse knows who depends on it,
//      effect knows what it depends on
//
// 2. WRITING (Change Notification)
//    - When a pulse's set() is called with a new value, it notifies subscribers
//    - Each subscriber (effect) is either run immediately or queued for batching
//    - Effects re-run, clearing old dependencies and collecting new ones
//
// 3. BATCHING (Performance Optimization)
//    - batch() increments batchDepth and delays effect execution
//    - Effects are queued in pendingEffects instead of running immediately
//    - When batch completes, flushEffects() runs all queued effects
//    - Nested batches are handled by only flushing at depth 0
//
// 4. COMPUTED VALUES (Derived State)
//    - Computed pulses wrap a function and cache its result
//    - They use the same dependency tracking to know when to recompute
//    - Lazy computed values only recompute when read (pull-based optimization)
//
// 5. CLEANUP (Memory Management)
//    - Effects can return a cleanup function called before re-run or disposal
//    - On re-run, old dependencies are cleared before collecting new ones
//    - This prevents memory leaks and stale subscriptions
//
// =============================================================================

/**
 * @typedef {Object} ReactiveContext
 * @property {EffectFn|null} currentEffect - Currently executing effect for dependency tracking
 * @property {number} batchDepth - Nesting depth of batch() calls
 * @property {Set<EffectFn>} pendingEffects - Effects queued during batch
 * @property {boolean} isRunningEffects - Flag to prevent recursive effect flushing
 * @property {string|null} currentModuleId - Current module ID for HMR effect tracking
 * @property {Map<string, Set<EffectFn>>} effectRegistry - Module ID to effects mapping for HMR
 */

/**
 * Maximum number of effect re-run iterations before aborting.
 * Prevents infinite loops when effects trigger each other cyclically.
 * Set to 100 to allow deep chain reactions while catching most real loops.
 * @type {number}
 */
const MAX_EFFECT_ITERATIONS = 100;

// =============================================================================
// REACTIVE CONTEXT CLASS
// =============================================================================

/**
 * ReactiveContext - Encapsulates all state for an isolated reactive system.
 *
 * This allows multiple independent reactive systems to coexist:
 * - Isolated testing (each test gets its own context)
 * - Server-side rendering (one context per request)
 * - Micro-frontends (each app gets its own context)
 *
 * @example
 * // Create isolated context for testing
 * const testContext = new ReactiveContext();
 * testContext.run(() => {
 *   const count = pulse(0);
 *   effect(() => console.log(count.get()));
 *   count.set(1);
 * });
 *
 * // Global context is unaffected
 */
export class ReactiveContext {
  /**
   * Create a new reactive context
   * @param {Object} [options] - Configuration options
   * @param {string} [options.name] - Name for debugging
   */
  constructor(options = {}) {
    this.name = options.name || `context_${++ReactiveContext._idCounter}`;
    this.currentEffect = null;
    this.batchDepth = 0;
    this.pendingEffects = new Set();
    this.isRunningEffects = false;
    // Generation counter for dependency tracking optimization (#58)
    this.generation = 0;
    // HMR support
    this.currentModuleId = null;
    this.effectRegistry = new Map();
  }

  /**
   * Reset this context to initial state
   */
  reset() {
    this.currentEffect = null;
    this.batchDepth = 0;
    this.pendingEffects.clear();
    this.isRunningEffects = false;
    this.generation = 0;
    this.currentModuleId = null;
    this.effectRegistry.clear();
  }

  /**
   * Run a function within this context
   * @template T
   * @param {function(): T} fn - Function to run
   * @returns {T} Return value of fn
   */
  run(fn) {
    const prevContext = activeContext;
    activeContext = this;
    try {
      return fn();
    } finally {
      activeContext = prevContext;
    }
  }

  /**
   * Check if this context is currently active
   * @returns {boolean}
   */
  isActive() {
    return activeContext === this;
  }

  /** @private */
  static _idCounter = 0;
}

/**
 * The currently active reactive context.
 * @type {ReactiveContext}
 * @private
 */
let activeContext;

/**
 * Global default reactive context - used when no specific context is active.
 * @type {ReactiveContext}
 */
export const globalContext = new ReactiveContext({ name: 'global' });

// Initialize active context to global
activeContext = globalContext;

/**
 * Get the currently active reactive context.
 * @returns {ReactiveContext} The active context
 */
export function getActiveContext() {
  return activeContext;
}

/**
 * Run a function within a specific reactive context.
 * Useful for isolating reactive operations in tests or SSR.
 *
 * @template T
 * @param {ReactiveContext} ctx - The context to use
 * @param {function(): T} fn - Function to run
 * @returns {T} Return value of fn
 *
 * @example
 * const isolated = new ReactiveContext();
 * withContext(isolated, () => {
 *   const x = pulse(0);
 *   effect(() => console.log(x.get()));
 * });
 */
export function withContext(ctx, fn) {
  return ctx.run(fn);
}

/**
 * Create a new isolated reactive context.
 * @param {Object} [options] - Configuration options
 * @param {string} [options.name] - Name for debugging
 * @returns {ReactiveContext} A new isolated context
 *
 * @example
 * // In tests
 * let ctx;
 * beforeEach(() => { ctx = createContext({ name: 'test' }); });
 * afterEach(() => ctx.reset());
 *
 * test('isolated test', () => {
 *   ctx.run(() => {
 *     const count = pulse(0);
 *     // This effect only exists in ctx
 *   });
 * });
 */
export function createContext(options) {
  return new ReactiveContext(options);
}

/**
 * Legacy: Global reactive context object for backward compatibility.
 * Prefer using getActiveContext() for new code.
 * @type {ReactiveContext}
 * @deprecated Use getActiveContext() instead
 */
export const context = globalContext;

/**
 * Reset the active reactive context to initial state.
 * Use this in tests to ensure isolation between test cases.
 * @returns {void}
 * @example
 * // In test setup/teardown
 * import { resetContext } from 'pulse-js-framework/runtime/pulse';
 * beforeEach(() => resetContext());
 */
export function resetContext() {
  activeContext.reset();
}

/**
 * Counter for generating unique effect IDs
 * @type {number}
 */
let effectIdCounter = 0;

/**
 * Global effect error handler
 * @type {Function|null}
 */
let globalEffectErrorHandler = null;

/**
 * Custom error class for effect-related errors with context information.
 * Provides details about which effect failed, in what phase, and its dependencies.
 */
export class EffectError extends Error {
  /**
   * Create an EffectError with context information
   * @param {string} message - Error message
   * @param {Object} options - Error context
   * @param {string} [options.effectId] - Effect identifier
   * @param {string} [options.phase] - Phase when error occurred ('cleanup' | 'execution')
   * @param {number} [options.dependencyCount] - Number of dependencies
   * @param {Error} [options.cause] - Original error that caused this
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'EffectError';
    this.effectId = options.effectId || null;
    this.phase = options.phase || 'unknown';
    this.dependencyCount = options.dependencyCount ?? 0;
    this.cause = options.cause || null;
  }
}

/**
 * Set a global error handler for effect errors.
 * The handler receives an EffectError with full context about the failure.
 * @param {Function|null} handler - Error handler (effectError) => void, or null to clear
 * @returns {Function|null} Previous handler (for restoration)
 * @example
 * // Set up global error tracking
 * const prevHandler = onEffectError((err) => {
 *   console.error(`Effect ${err.effectId} failed during ${err.phase}:`, err.cause);
 *   reportToErrorService(err);
 * });
 *
 * // Later, restore previous handler
 * onEffectError(prevHandler);
 */
export function onEffectError(handler) {
  const prev = globalEffectErrorHandler;
  globalEffectErrorHandler = handler;
  return prev;
}

/**
 * Set the current module ID for HMR effect tracking.
 * Effects created while a module ID is set will be registered for cleanup.
 * @param {string} moduleId - The module identifier (typically import.meta.url)
 * @returns {void}
 */
export function setCurrentModule(moduleId) {
  activeContext.currentModuleId = moduleId;
}

/**
 * Clear the current module ID after module initialization.
 * @returns {void}
 */
export function clearCurrentModule() {
  activeContext.currentModuleId = null;
}

/**
 * Dispose all effects associated with a module.
 * Called during HMR to clean up before re-executing the module.
 * @param {string} moduleId - The module identifier to dispose
 * @returns {void}
 */
export function disposeModule(moduleId) {
  const effects = activeContext.effectRegistry.get(moduleId);
  if (effects) {
    for (const effectFn of effects) {
      // Run cleanup functions
      for (const cleanup of effectFn.cleanups) {
        try {
          cleanup();
        } catch (e) {
          log.error('HMR cleanup error:', e);
        }
      }
      effectFn.cleanups = [];

      // Unsubscribe from all dependencies
      for (const dep of effectFn.dependencies) {
        dep._unsubscribe(effectFn);
      }
      effectFn.dependencies.clear();
    }
    activeContext.effectRegistry.delete(moduleId);
  }
}

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
  if (activeContext.currentEffect) {
    activeContext.currentEffect.cleanups.push(fn);
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
    const current = activeContext.currentEffect;
    if (current) {
      // Optimization (#58): Skip redundant Set.add() if already tracked in this cycle.
      // When an effect re-runs, generation increments and dependencies are cleared,
      // so _generation won't match and we'll re-track. Within the same cycle,
      // dependencies.has() avoids duplicate additions for repeated reads.
      if (current._generation !== activeContext.generation || !current.dependencies.has(this)) {
        this.#subscribers.add(current);
        current.dependencies.add(this);
      }
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
    const self = this;
    const subscriber = {
      run() { fn(self.peek()); },
      dependencies: new Set(),
      _isSubscriber: true
    };
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
      if (activeContext.batchDepth > 0 || activeContext.isRunningEffects) {
        activeContext.pendingEffects.add(subscriber);
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
 * Handle an effect error with full context information.
 * Tries effect-specific handler, then global handler, then logs.
 * @private
 * @param {Error} error - The original error
 * @param {EffectFn} effectFn - The effect that errored
 * @param {string} phase - Phase when error occurred ('cleanup' | 'execution')
 */
function handleEffectError(error, effectFn, phase) {
  const effectError = new EffectError(
    `Effect [${effectFn.id}] error during ${phase}: ${error.message}`,
    {
      effectId: effectFn.id,
      phase,
      dependencyCount: effectFn.dependencies?.size ?? 0,
      cause: error
    }
  );

  // Try effect-specific handler first
  if (effectFn.onError) {
    try {
      effectFn.onError(effectError);
      return;
    } catch (handlerError) {
      log.error('Effect onError handler threw:', handlerError);
    }
  }

  // Try global handler
  if (globalEffectErrorHandler) {
    try {
      globalEffectErrorHandler(effectError);
      return;
    } catch (handlerError) {
      log.error('Global effect error handler threw:', handlerError);
    }
  }

  // Default: log with context
  log.error(`[${effectError.effectId}] ${effectError.message}`, {
    phase: effectError.phase,
    dependencies: effectError.dependencyCount
  });
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
    handleEffectError(error, effectFn, 'execution');
  }
}

/**
 * Flush all pending effects
 * @private
 * @returns {void}
 */
function flushEffects() {
  if (activeContext.isRunningEffects) return;

  activeContext.isRunningEffects = true;
  let iterations = 0;

  // Track effect run counts to identify infinite loop culprits
  const effectRunCounts = new Map();

  try {
    while (activeContext.pendingEffects.size > 0 && iterations < MAX_EFFECT_ITERATIONS) {
      iterations++;
      const effects = [...activeContext.pendingEffects];
      activeContext.pendingEffects.clear();

      for (const eff of effects) {
        // Track how many times each effect runs
        const id = eff.id || 'unknown';
        effectRunCounts.set(id, (effectRunCounts.get(id) || 0) + 1);
        runEffect(eff);
      }
    }

    if (iterations >= MAX_EFFECT_ITERATIONS) {
      // Find effects that ran the most (likely causing the loop)
      const sortedByRuns = [...effectRunCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const culprits = sortedByRuns
        .map(([id, count]) => `${id} (${count} runs)`);

      // Still pending effects
      const stillPending = [...activeContext.pendingEffects]
        .map(e => e.id || 'unknown')
        .slice(0, 5);

      const error = Errors.circularDependency(culprits, stillPending);

      // Always use console.error directly to ensure visibility
      console.error(error.message);

      // Also log through the logger for consistency
      log.error(error.message);

      activeContext.pendingEffects.clear();
    }
  } finally {
    activeContext.isRunningEffects = false;
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
    // Track subscription cleanup functions to prevent memory leaks
    let subscriptionCleanups = [];

    p.get = function() {
      if (dirty) {
        // Run computation
        const prevEffect = activeContext.currentEffect;
        const tempEffect = {
          run: () => {},
          dependencies: new Set(),
          cleanups: []
        };
        activeContext.currentEffect = tempEffect;

        try {
          cachedValue = fn();
          dirty = false;

          // Cleanup old subscriptions
          for (const unsubscribe of subscriptionCleanups) {
            unsubscribe();
          }
          subscriptionCleanups = [];
          trackedDeps.clear();

          // Set up new subscriptions
          trackedDeps = tempEffect.dependencies;
          for (const dep of trackedDeps) {
            const unsubscribe = dep.subscribe(() => {
              dirty = true;
              // Notify our own subscribers
              p._triggerNotify();
            });
            subscriptionCleanups.push(unsubscribe);
          }

          p._init(cachedValue);
        } finally {
          activeContext.currentEffect = prevEffect;
        }
      }

      // Track dependency on this computed
      if (activeContext.currentEffect) {
        p._addSubscriber(activeContext.currentEffect);
        activeContext.currentEffect.dependencies.add(p);
      }

      return cachedValue;
    };

    // Cleanup function for lazy computed
    cleanup = () => {
      for (const unsubscribe of subscriptionCleanups) {
        unsubscribe();
      }
      subscriptionCleanups = [];
      trackedDeps.clear();
    };
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
    throw Errors.computedSet(p._name || null);
  };

  p.update = () => {
    throw Errors.computedSet(p._name || null);
  };

  // Add dispose method
  p.dispose = () => {
    if (cleanup) cleanup();
  };

  return p;
}

/**
 * @typedef {Object} EffectOptions
 * @property {string} [id] - Custom effect identifier for debugging
 * @property {function(EffectError): void} [onError] - Error handler for this effect
 */

/**
 * Create an effect that runs when its dependencies change
 * @param {function(): void|function(): void} fn - Effect function, may return a cleanup function
 * @param {EffectOptions} [options={}] - Effect configuration options
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
 *
 * // With custom ID and error handler
 * effect(() => {
 *   // Effect logic that might fail
 * }, {
 *   id: 'data-sync',
 *   onError: (err) => console.error('Data sync failed:', err.cause)
 * });
 */
export function effect(fn, options = {}) {
  const { id: customId, onError } = options;
  const effectId = customId || `effect_${++effectIdCounter}`;

  // SSR MODE: Run effect once without subscriptions
  if (ssrModeEnabled) {
    try {
      fn();
    } catch (e) {
      log.warn(`SSR effect error (${effectId}):`, e.message);
    }
    // Return noop cleanup function
    return () => {};
  }

  // Capture module ID at creation time for HMR tracking
  const moduleId = activeContext.currentModuleId;

  const effectFn = {
    id: effectId,
    onError,
    run: () => {
      // Run cleanup functions from previous run
      for (const cleanup of effectFn.cleanups) {
        try {
          cleanup();
        } catch (e) {
          handleEffectError(e, effectFn, 'cleanup');
        }
      }
      effectFn.cleanups = [];

      // Clean up old dependencies
      for (const dep of effectFn.dependencies) {
        dep._unsubscribe(effectFn);
      }
      effectFn.dependencies.clear();

      // Stamp generation for dependency tracking optimization (#58)
      activeContext.generation++;
      effectFn._generation = activeContext.generation;

      // Set as current effect for dependency tracking
      const prevEffect = activeContext.currentEffect;
      activeContext.currentEffect = effectFn;

      try {
        fn();
      } catch (error) {
        handleEffectError(error, effectFn, 'execution');
      } finally {
        activeContext.currentEffect = prevEffect;
      }
    },
    dependencies: new Set(),
    cleanups: [],
    _generation: 0
  };

  // HMR: Register effect with current module
  if (moduleId) {
    if (!activeContext.effectRegistry.has(moduleId)) {
      activeContext.effectRegistry.set(moduleId, new Set());
    }
    activeContext.effectRegistry.get(moduleId).add(effectFn);
  }

  // Run immediately to collect dependencies
  effectFn.run();

  // Return cleanup function
  return () => {
    // Run any pending cleanups
    for (const cleanup of effectFn.cleanups) {
      try {
        cleanup();
      } catch (e) {
        handleEffectError(e, effectFn, 'cleanup');
      }
    }
    effectFn.cleanups = [];

    for (const dep of effectFn.dependencies) {
      dep._unsubscribe(effectFn);
    }
    effectFn.dependencies.clear();

    // HMR: Remove from registry
    if (moduleId && activeContext.effectRegistry.has(moduleId)) {
      activeContext.effectRegistry.get(moduleId).delete(effectFn);
    }
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
  activeContext.batchDepth++;
  try {
    return fn();
  } finally {
    activeContext.batchDepth--;
    if (activeContext.batchDepth === 0) {
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
  const prevEffect = activeContext.currentEffect;
  activeContext.currentEffect = null;
  try {
    return fn();
  } finally {
    activeContext.currentEffect = prevEffect;
  }
}

/**
 * Create a reactive prop from component props object.
 * If the prop has a reactive getter (marked with $ suffix), returns a computed.
 * Otherwise returns the static value.
 *
 * @template T
 * @param {Object} props - Component props object
 * @param {string} name - Prop name to extract
 * @param {T} [defaultValue] - Default value if prop is undefined
 * @returns {T|Pulse<T>} The prop value (reactive if getter exists, static otherwise)
 *
 * @example
 * // In compiled component render function:
 * function render({ props = {} } = {}) {
 *   const darkMode = useProp(props, 'darkMode', false);
 *   // darkMode is now reactive - can use in text(() => darkMode.get())
 * }
 */
export function useProp(props, name, defaultValue) {
  const getter = props[`${name}$`];
  if (typeof getter === 'function') {
    // Reactive prop - wrap in computed for automatic dependency tracking
    return computed(() => {
      const value = getter();
      return value !== undefined ? value : defaultValue;
    });
  }
  // Static prop - wrap in computed for uniform interface
  // This allows child components to always use prop.get() consistently
  const value = props[name];
  return computed(() => value !== undefined ? value : defaultValue);
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
  memoComputed,
  context,
  resetContext,
  // Error handling
  EffectError,
  onEffectError,
  // HMR support
  setCurrentModule,
  clearCurrentModule,
  disposeModule,
  // Component props helper
  useProp
};
