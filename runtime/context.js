/**
 * Pulse Context API - Dependency Injection and Prop Drilling Prevention
 * @module pulse-js-framework/runtime/context
 *
 * Provides a React-like Context API for passing data through the component tree
 * without explicit prop passing at every level.
 *
 * @example
 * import { createContext, useContext, Provider } from './context.js';
 * import { pulse } from './pulse.js';
 *
 * // Create a context with default value
 * const ThemeContext = createContext('light');
 *
 * // Provide a value to the subtree
 * const App = () => {
 *   const theme = pulse('dark');
 *   return Provider(ThemeContext, theme, () => [
 *     Header(),
 *     Content()
 *   ]);
 * };
 *
 * // Consume the context anywhere in the subtree
 * const Button = () => {
 *   const theme = useContext(ThemeContext);
 *   return el(`button.btn-${theme.get()}`);
 * };
 */

import { pulse, effect, computed, Pulse } from './pulse.js';

/**
 * Check if a value is a Pulse instance
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a Pulse
 */
function isPulse(value) {
  return value instanceof Pulse;
}
import { loggers } from './logger.js';
import { PulseError } from './errors.js';

const log = loggers.pulse;

// =============================================================================
// CONTEXT REGISTRY
// =============================================================================

/**
 * Unique ID counter for contexts
 * @type {number}
 */
let contextIdCounter = 0;

/**
 * Context stack for provider nesting
 * Each context has its own stack of provided values
 * @type {Map<symbol, Array<any>>}
 */
const contextStacks = new Map();

/**
 * Map of context IDs to their default values
 * @type {Map<symbol, any>}
 */
const contextDefaults = new Map();

/**
 * Map of context IDs to their display names (for debugging)
 * @type {Map<symbol, string>}
 */
const contextNames = new Map();

// =============================================================================
// CONTEXT CREATION
// =============================================================================

/**
 * @typedef {Object} Context
 * @property {symbol} _id - Unique identifier for this context
 * @property {string} displayName - Human-readable name for debugging
 * @property {any} defaultValue - Default value when no provider is found
 */

/**
 * Create a new context with a default value
 *
 * @template T
 * @param {T} defaultValue - Value used when no Provider is found in the tree
 * @param {Object} [options={}] - Context options
 * @param {string} [options.displayName] - Name for debugging purposes
 * @returns {Context<T>} Context object to pass to Provider and useContext
 *
 * @example
 * // Create a theme context
 * const ThemeContext = createContext('light');
 *
 * // Create a user context with object default
 * const UserContext = createContext({ name: 'Guest', role: 'anonymous' });
 *
 * // Create with display name for debugging
 * const AuthContext = createContext(null, { displayName: 'AuthContext' });
 */
export function createContext(defaultValue, options = {}) {
  const id = Symbol(`pulse.context.${++contextIdCounter}`);
  const displayName = options.displayName || `Context${contextIdCounter}`;

  // Initialize the context stack
  contextStacks.set(id, []);
  contextDefaults.set(id, defaultValue);
  contextNames.set(id, displayName);

  const context = {
    _id: id,
    displayName,
    defaultValue,

    // Provider shorthand method
    Provider: (value, children) => Provider(context, value, children),

    // Consumer shorthand method
    Consumer: (render) => Consumer(context, render)
  };

  Object.freeze(context);
  return context;
}

// =============================================================================
// CONTEXT PROVIDER
// =============================================================================

/**
 * Provide a value to a context for all descendants
 *
 * @template T
 * @param {Context<T>} context - Context object from createContext
 * @param {T|Pulse<T>} value - Value to provide (can be reactive pulse)
 * @param {Function|Array} children - Child elements or render function
 * @returns {Node|Array<Node>} The rendered children
 *
 * @example
 * // Provide a static value
 * Provider(ThemeContext, 'dark', () => [
 *   Header(),
 *   Content()
 * ]);
 *
 * // Provide a reactive value
 * const theme = pulse('dark');
 * Provider(ThemeContext, theme, () => [
 *   Header(),
 *   Content()
 * ]);
 *
 * // Using context.Provider shorthand
 * ThemeContext.Provider('dark', () => App());
 */
export function Provider(context, value, children) {
  if (!context || !context._id) {
    throw new PulseError('Provider requires a valid context created with createContext()', {
      code: 'INVALID_CONTEXT'
    });
  }

  const stack = contextStacks.get(context._id);
  if (!stack) {
    throw new PulseError(`Context "${context.displayName}" has been disposed`, {
      code: 'CONTEXT_DISPOSED'
    });
  }

  // Wrap non-pulse values in a pulse for consistent reactive API
  const reactiveValue = isPulse(value) ? value : pulse(value);

  // Push value onto context stack
  stack.push(reactiveValue);
  log.debug(`Provider: pushed value to ${context.displayName}, depth=${stack.length}`);

  let result;
  try {
    // Render children with the new context value available
    result = typeof children === 'function' ? children() : children;
  } finally {
    // Pop value from stack when provider scope ends
    stack.pop();
    log.debug(`Provider: popped value from ${context.displayName}, depth=${stack.length}`);
  }

  return result;
}

// =============================================================================
// CONTEXT CONSUMER
// =============================================================================

/**
 * Get the current value from a context
 *
 * Returns a reactive pulse that updates when the provided value changes.
 * If no Provider is found, returns the context's default value.
 *
 * @template T
 * @param {Context<T>} context - Context object from createContext
 * @returns {Pulse<T>} Reactive pulse containing the context value
 *
 * @example
 * const theme = useContext(ThemeContext);
 * console.log(theme.get()); // 'dark' (or default if no provider)
 *
 * // Reactive usage in effects
 * effect(() => {
 *   document.body.className = theme.get();
 * });
 */
export function useContext(context) {
  if (!context || !context._id) {
    throw new PulseError('useContext requires a valid context created with createContext()', {
      code: 'INVALID_CONTEXT'
    });
  }

  const stack = contextStacks.get(context._id);
  if (!stack) {
    throw new PulseError(`Context "${context.displayName}" has been disposed`, {
      code: 'CONTEXT_DISPOSED'
    });
  }

  // Get the current provider value (top of stack) or default
  if (stack.length > 0) {
    const value = stack[stack.length - 1];
    log.debug(`useContext: got value from ${context.displayName}, depth=${stack.length}`);
    return value;
  }

  // No provider found, return default as reactive pulse
  log.debug(`useContext: using default for ${context.displayName}`);
  const defaultVal = contextDefaults.get(context._id);

  // Wrap default in pulse for consistent API
  return isPulse(defaultVal) ? defaultVal : pulse(defaultVal);
}

/**
 * Consumer component pattern for context consumption
 *
 * @template T
 * @param {Context<T>} context - Context object from createContext
 * @param {Function} render - Render function receiving the context value
 * @returns {any} Result of the render function
 *
 * @example
 * Consumer(ThemeContext, (theme) => {
 *   return el(`button.btn-${theme.get()}`, 'Click me');
 * });
 *
 * // Using shorthand
 * ThemeContext.Consumer((theme) => el('span', theme.get()));
 */
export function Consumer(context, render) {
  const value = useContext(context);
  return render(value);
}

// =============================================================================
// CONTEXT UTILITIES
// =============================================================================

/**
 * Check if a value is a valid context object
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a valid context
 */
export function isContext(value) {
  return value !== null &&
    typeof value === 'object' &&
    typeof value._id === 'symbol' &&
    contextStacks.has(value._id);
}

/**
 * Get the current provider depth for a context (useful for debugging)
 *
 * @param {Context} context - Context to check
 * @returns {number} Current nesting depth of providers
 */
export function getContextDepth(context) {
  if (!context || !context._id) return 0;
  const stack = contextStacks.get(context._id);
  return stack ? stack.length : 0;
}

/**
 * Dispose a context and clean up its resources
 * Should be called when a context is no longer needed (e.g., in tests)
 *
 * @param {Context} context - Context to dispose
 */
export function disposeContext(context) {
  if (!context || !context._id) return;

  contextStacks.delete(context._id);
  contextDefaults.delete(context._id);
  contextNames.delete(context._id);

  log.debug(`Context disposed: ${context.displayName}`);
}

/**
 * Create a derived context value from one or more contexts
 *
 * @template T
 * @param {Function} selector - Function that receives context values and returns derived value
 * @param {...Context} contexts - Contexts to derive from
 * @returns {Pulse<T>} Computed pulse with derived value
 *
 * @example
 * const theme = useContextSelector(
 *   (settings, user) => settings.get().theme || user.get().preferredTheme,
 *   SettingsContext,
 *   UserContext
 * );
 */
export function useContextSelector(selector, ...contexts) {
  const values = contexts.map(ctx => useContext(ctx));

  return computed(() => {
    return selector(...values);
  });
}

/**
 * Provide multiple contexts at once
 *
 * @param {Array<[Context, any]>} providers - Array of [context, value] pairs
 * @param {Function} children - Render function for children
 * @returns {any} Rendered children
 *
 * @example
 * provideMany([
 *   [ThemeContext, 'dark'],
 *   [UserContext, currentUser],
 *   [LocaleContext, 'fr']
 * ], () => App());
 */
export function provideMany(providers, children) {
  if (providers.length === 0) {
    return typeof children === 'function' ? children() : children;
  }

  const [first, ...rest] = providers;
  const [context, value] = first;

  return Provider(context, value, () => provideMany(rest, children));
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

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
