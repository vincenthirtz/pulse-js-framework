/**
 * Pulse Framework - Core Reactivity Type Definitions
 * @module pulse-js-framework/runtime
 */

/** Equality function for comparing values */
export type EqualsFn<T> = (a: T, b: T) => boolean;

/** Pulse options */
export interface PulseOptions<T> {
  equals?: EqualsFn<T>;
}

/** Computed options */
export interface ComputedOptions {
  lazy?: boolean;
}

/** Memo options */
export interface MemoOptions<T> {
  equals?: EqualsFn<T>;
}

/** MemoComputed options */
export interface MemoComputedOptions<T> {
  deps?: unknown[];
  equals?: EqualsFn<T>;
}

/**
 * Reactive value container (signal)
 */
export declare class Pulse<T = unknown> {
  constructor(value: T, options?: PulseOptions<T>);

  /** Read value and track dependency */
  get(): T;

  /** Read value without tracking dependency */
  peek(): T;

  /** Set new value and notify subscribers */
  set(newValue: T): void;

  /** Update value using function */
  update(fn: (value: T) => T): void;

  /** Subscribe to changes, returns unsubscribe function */
  subscribe(fn: (value: T) => void): () => void;

  /** Create derived pulse */
  derive<U>(fn: (value: T) => U): Pulse<U>;

  /** Cleanup (for computed pulses) */
  dispose(): void;
}

/**
 * Create a reactive value
 */
export declare function pulse<T>(value: T, options?: PulseOptions<T>): Pulse<T>;

/**
 * Create a computed (derived) reactive value
 */
export declare function computed<T>(fn: () => T, options?: ComputedOptions): Pulse<T>;

/**
 * Create a side effect that runs when dependencies change
 * @returns Cleanup function
 */
export declare function effect(fn: () => void | (() => void)): () => void;

/**
 * Batch multiple updates into a single effect run
 */
export declare function batch(fn: () => void): void;

/**
 * Watch specific pulses and run callback on change
 * @returns Cleanup function
 */
export declare function watch<T>(
  source: Pulse<T>,
  callback: (newValue: T, oldValue: T) => void
): () => void;
export declare function watch<T extends readonly Pulse<unknown>[]>(
  sources: T,
  callback: (
    newValues: { [K in keyof T]: T[K] extends Pulse<infer U> ? U : never },
    oldValues: { [K in keyof T]: T[K] extends Pulse<infer U> ? U : never }
  ) => void
): () => void;

/** State object with reactive properties */
export interface ReactiveState<T extends Record<string, unknown>> {
  /** Access raw pulses */
  $pulses: { [K in keyof T]: Pulse<T[K]> };
  /** Get pulse by key */
  $pulse<K extends keyof T>(key: K): Pulse<T[K]>;
}

/**
 * Create reactive state object from plain object
 */
export declare function createState<T extends Record<string, unknown>>(
  obj: T
): T & ReactiveState<T>;

/**
 * Memoize a function based on arguments
 */
export declare function memo<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: MemoOptions<ReturnType<T>>
): T;

/**
 * Create memoized computed value
 */
export declare function memoComputed<T>(
  fn: () => T,
  options?: MemoComputedOptions<T>
): Pulse<T>;

/** Promise result state */
export interface PromiseState<T> {
  value: Pulse<T | undefined>;
  loading: Pulse<boolean>;
  error: Pulse<Error | null>;
}

/**
 * Create reactive values from a promise
 */
export declare function fromPromise<T>(
  promise: Promise<T>,
  initialValue?: T
): PromiseState<T>;

/**
 * Read pulses without creating dependencies
 */
export declare function untrack<T>(fn: () => T): T;

/**
 * Register cleanup function for current effect
 */
export declare function onCleanup(fn: () => void): void;
