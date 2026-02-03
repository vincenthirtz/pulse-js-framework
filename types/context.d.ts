/**
 * Pulse Framework - Context API Type Definitions
 * @module pulse-js-framework/runtime/context
 */

import { Pulse } from './pulse';

/** Context options */
export interface ContextOptions {
  /** Display name for debugging */
  displayName?: string;
}

/**
 * Context object created by createContext
 */
export interface Context<T> {
  /** Unique identifier (internal) */
  readonly _id: symbol;
  /** Display name for debugging */
  readonly displayName: string;
  /** Default value when no Provider is found */
  readonly defaultValue: T;
  /** Provider shorthand method */
  Provider: (value: T | Pulse<T>, children: (() => any) | any) => any;
  /** Consumer shorthand method */
  Consumer: (render: (value: Pulse<T>) => any) => any;
}

/**
 * Create a new context with a default value
 *
 * @template T The type of the context value
 * @param defaultValue Value used when no Provider is found in the tree
 * @param options Context options
 * @returns Context object to pass to Provider and useContext
 *
 * @example
 * const ThemeContext = createContext<'light' | 'dark'>('light');
 * const UserContext = createContext<User | null>(null, { displayName: 'UserContext' });
 */
export declare function createContext<T>(
  defaultValue: T,
  options?: ContextOptions
): Context<T>;

/**
 * Provide a value to a context for all descendants
 *
 * @template T The type of the context value
 * @param context Context object from createContext
 * @param value Value to provide (can be reactive pulse)
 * @param children Child elements or render function
 * @returns The rendered children
 *
 * @example
 * Provider(ThemeContext, 'dark', () => [Header(), Content()]);
 * Provider(ThemeContext, themePulse, () => App());
 */
export declare function Provider<T>(
  context: Context<T>,
  value: T | Pulse<T>,
  children: (() => any) | any
): any;

/**
 * Get the current value from a context
 *
 * Returns a reactive pulse that updates when the provided value changes.
 * If no Provider is found, returns the context's default value.
 *
 * @template T The type of the context value
 * @param context Context object from createContext
 * @returns Reactive pulse containing the context value
 *
 * @example
 * const theme = useContext(ThemeContext);
 * console.log(theme.get()); // 'dark'
 */
export declare function useContext<T>(context: Context<T>): Pulse<T>;

/**
 * Consumer component pattern for context consumption
 *
 * @template T The type of the context value
 * @param context Context object from createContext
 * @param render Render function receiving the context value
 * @returns Result of the render function
 *
 * @example
 * Consumer(ThemeContext, (theme) => el(`button.btn-${theme.get()}`));
 */
export declare function Consumer<T>(
  context: Context<T>,
  render: (value: Pulse<T>) => any
): any;

/**
 * Check if a value is a valid context object
 *
 * @param value Value to check
 * @returns True if value is a valid context
 */
export declare function isContext(value: unknown): value is Context<unknown>;

/**
 * Get the current provider depth for a context (useful for debugging)
 *
 * @param context Context to check
 * @returns Current nesting depth of providers
 */
export declare function getContextDepth(context: Context<unknown>): number;

/**
 * Dispose a context and clean up its resources
 * Should be called when a context is no longer needed (e.g., in tests)
 *
 * @param context Context to dispose
 */
export declare function disposeContext(context: Context<unknown>): void;

/**
 * Create a derived context value from one or more contexts
 *
 * @template T The type of the derived value
 * @param selector Function that receives context values and returns derived value
 * @param contexts Contexts to derive from
 * @returns Computed pulse with derived value
 *
 * @example
 * const effectiveTheme = useContextSelector(
 *   (settings, user) => settings.get().theme || user.get().preferredTheme,
 *   SettingsContext,
 *   UserContext
 * );
 */
export declare function useContextSelector<T, Contexts extends Context<any>[]>(
  selector: (...values: { [K in keyof Contexts]: Contexts[K] extends Context<infer U> ? Pulse<U> : never }) => T,
  ...contexts: Contexts
): Pulse<T>;

/**
 * Provide multiple contexts at once
 *
 * @param providers Array of [context, value] pairs
 * @param children Render function for children
 * @returns Rendered children
 *
 * @example
 * provideMany([
 *   [ThemeContext, 'dark'],
 *   [UserContext, currentUser],
 *   [LocaleContext, 'fr']
 * ], () => App());
 */
export declare function provideMany<T extends [Context<any>, any][]>(
  providers: T,
  children: (() => any) | any
): any;

export default {
  createContext,
  useContext,
  Provider,
  Consumer,
  isContext,
  getContextDepth,
  disposeContext,
  useContextSelector,
  provideMany
};
