/**
 * Pulse Framework - HMR (Hot Module Replacement) Type Definitions
 * @module pulse-js-framework/runtime/hmr
 */

import { Pulse, PulseOptions } from './pulse';

/**
 * HMR Context interface for state preservation and effect cleanup
 */
export interface HMRContext {
  /**
   * Persistent data storage across HMR updates.
   * Values stored here survive module reloads.
   */
  data: Record<string, unknown>;

  /**
   * Create a pulse with state preservation across HMR updates.
   * If a value exists from a previous module load, it's restored.
   *
   * @param key - Unique key for this pulse within the module
   * @param initialValue - Initial value (used on first load only)
   * @param options - Pulse options (equals function, etc.)
   * @returns A pulse instance with preserved state
   *
   * @example
   * const count = hmr.preservePulse('count', 0);
   * const todos = hmr.preservePulse('todos', [], { equals: deepEquals });
   */
  preservePulse<T>(key: string, initialValue: T, options?: PulseOptions<T>): Pulse<T>;

  /**
   * Execute code with module tracking enabled.
   * Effects created within this callback will be registered
   * for automatic cleanup during HMR.
   *
   * @param callback - Code to execute with tracking
   * @returns The return value of the callback
   *
   * @example
   * hmr.setup(() => {
   *   effect(() => {
   *     document.title = `Count: ${count.get()}`;
   *   });
   * });
   */
  setup<T>(callback: () => T): T;

  /**
   * Register a callback to run when the module accepts an HMR update.
   * Call without arguments to auto-accept updates.
   *
   * @param callback - Optional callback for custom handling
   *
   * @example
   * hmr.accept(); // Auto-accept
   * hmr.accept(() => console.log('Module updated!'));
   */
  accept(callback?: () => void): void;

  /**
   * Register a callback to run before the module is replaced.
   * Use this for custom cleanup logic.
   *
   * @param callback - Cleanup callback
   *
   * @example
   * hmr.dispose(() => {
   *   socket.close();
   *   clearInterval(timer);
   * });
   */
  dispose(callback: () => void): void;
}

/**
 * Create an HMR context for a module.
 * Provides utilities for state preservation and effect cleanup during HMR.
 *
 * In production or non-HMR environments, returns a no-op context
 * that works normally but without HMR-specific behavior.
 *
 * @param moduleId - The module identifier (typically import.meta.url)
 * @returns HMR context with preservation utilities
 *
 * @example
 * import { createHMRContext } from 'pulse-js-framework/runtime/hmr';
 *
 * const hmr = createHMRContext(import.meta.url);
 *
 * // Preserve state across HMR
 * const todos = hmr.preservePulse('todos', []);
 * const filter = hmr.preservePulse('filter', 'all');
 *
 * // Setup effects with automatic cleanup
 * hmr.setup(() => {
 *   effect(() => {
 *     document.title = `${todos.get().length} todos`;
 *   });
 * });
 *
 * // Accept HMR updates
 * hmr.accept();
 */
export function createHMRContext(moduleId: string): HMRContext;

declare const hmr: {
  createHMRContext: typeof createHMRContext;
};

export default hmr;
