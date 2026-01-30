/**
 * Pulse Framework - Store Type Definitions
 * @module pulse-js-framework/runtime/store
 */

import { Pulse } from './pulse';

/** Store options */
export interface StoreOptions {
  persist?: boolean;
  storageKey?: string;
}

/** Base store type - maps state keys to Pulse values */
export type StoreState<T extends Record<string, unknown>> = {
  [K in keyof T]: Pulse<T[K]>;
};

/** Store methods */
export interface StoreMethods<T extends Record<string, unknown>> {
  /** Get current state snapshot */
  $getState(): T;

  /** Set multiple values at once (batched) */
  $setState(updates: Partial<T>): void;

  /** Reset to initial state */
  $reset(): void;

  /** Subscribe to all changes, returns unsubscribe */
  $subscribe(callback: (state: T) => void): () => void;

  /** Access raw Pulse instances */
  $pulses: StoreState<T>;
}

/** Complete store type */
export type Store<T extends Record<string, unknown>> = StoreState<T> & StoreMethods<T>;

/**
 * Create global store
 */
export declare function createStore<T extends Record<string, unknown>>(
  initialState: T,
  options?: StoreOptions
): Store<T>;

/** Action function signature */
export type ActionFn<T extends Record<string, unknown>, Args extends unknown[] = unknown[], R = void> =
  (store: Store<T>, ...args: Args) => R;

/** Actions definition object */
export type ActionsDef<T extends Record<string, unknown>> = {
  [name: string]: ActionFn<T, unknown[], unknown>;
};

/** Bound actions (without store parameter) */
export type BoundActions<T extends Record<string, unknown>, A extends ActionsDef<T>> = {
  [K in keyof A]: A[K] extends ActionFn<T, infer Args, infer R>
    ? (...args: Args) => R
    : never;
};

/**
 * Create action functions bound to store
 */
export declare function createActions<
  T extends Record<string, unknown>,
  A extends ActionsDef<T>
>(store: Store<T>, actions: A): BoundActions<T, A>;

/** Getter function signature */
export type GetterFn<T extends Record<string, unknown>, R = unknown> = (store: Store<T>) => R;

/** Getters definition object */
export type GettersDef<T extends Record<string, unknown>> = {
  [name: string]: GetterFn<T, unknown>;
};

/** Computed getters (as Pulse values) */
export type ComputedGetters<T extends Record<string, unknown>, G extends GettersDef<T>> = {
  [K in keyof G]: G[K] extends GetterFn<T, infer R> ? Pulse<R> : never;
};

/**
 * Create computed values for store
 */
export declare function createGetters<
  T extends Record<string, unknown>,
  G extends GettersDef<T>
>(store: Store<T>, getters: G): ComputedGetters<T, G>;

/** Combined stores type */
export type CombinedStores<S extends Record<string, Store<Record<string, unknown>>>> = {
  [K in keyof S]: S[K];
};

/**
 * Combine multiple stores under namespaces
 */
export declare function combineStores<S extends Record<string, Store<Record<string, unknown>>>>(
  stores: S
): CombinedStores<S>;

/** Module definition */
export interface ModuleDef<T extends Record<string, unknown>> {
  state: T;
  actions?: ActionsDef<T>;
  getters?: GettersDef<T>;
}

/** Modules configuration */
export type ModulesDef = {
  [namespace: string]: ModuleDef<Record<string, unknown>>;
};

/** Module store type */
export type ModuleStore<M extends ModuleDef<Record<string, unknown>>> =
  Store<M['state']> &
  (M['actions'] extends ActionsDef<M['state']> ? BoundActions<M['state'], M['actions']> : {}) &
  (M['getters'] extends GettersDef<M['state']> ? ComputedGetters<M['state'], M['getters']> : {});

/** Root module store type */
export type RootModuleStore<D extends ModulesDef> = {
  [K in keyof D]: ModuleStore<D[K]>;
} & {
  $getState(): { [K in keyof D]: D[K]['state'] };
  $reset(): void;
};

/**
 * Create module-based store (Vuex-like)
 */
export declare function createModuleStore<D extends ModulesDef>(
  modules: D
): RootModuleStore<D>;

/** Plugin function */
export type StorePlugin<T extends Record<string, unknown>> = (store: Store<T>) => Store<T>;

/**
 * Apply plugin to store
 */
export declare function usePlugin<T extends Record<string, unknown>>(
  store: Store<T>,
  plugin: StorePlugin<T>
): Store<T>;

/** Store with history plugin */
export interface HistoryStore<T extends Record<string, unknown>> extends Store<T> {
  $undo(): void;
  $redo(): void;
  $canUndo(): boolean;
  $canRedo(): boolean;
}

/**
 * Logger plugin - logs state changes to console
 */
export declare function loggerPlugin<T extends Record<string, unknown>>(
  store: Store<T>
): Store<T>;

/**
 * History plugin - enables undo/redo
 */
export declare function historyPlugin<T extends Record<string, unknown>>(
  store: Store<T>,
  maxHistory?: number
): HistoryStore<T>;
