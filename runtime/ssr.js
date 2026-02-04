/**
 * Pulse SSR - Server-Side Rendering Module
 *
 * Provides server-side rendering and client-side hydration for Pulse applications.
 *
 * @module pulse-js-framework/runtime/ssr
 *
 * @example
 * // Server-side rendering
 * import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
 *
 * const { html, state } = await renderToString(() => App(), {
 *   waitForAsync: true
 * });
 *
 * res.send(`
 *   <div id="app">${html}</div>
 *   <script>window.__PULSE_STATE__ = ${serializeState(state)};</script>
 * `);
 *
 * @example
 * // Client-side hydration
 * import { hydrate } from 'pulse-js-framework/runtime/ssr';
 *
 * hydrate('#app', () => App(), {
 *   state: window.__PULSE_STATE__
 * });
 */

import { createContext, batch, setSSRMode as setPulseSSRMode, isSSRMode } from './pulse.js';
import { MockDOMAdapter, withAdapter, getAdapter } from './dom-adapter.js';
import { serializeToHTML, serializeChildren } from './ssr-serializer.js';
import { SSRAsyncContext, setSSRAsyncContext, getSSRAsyncContext } from './ssr-async.js';
import {
  setHydrationMode,
  createHydrationContext,
  disposeHydration,
  isHydratingMode,
  getHydrationContext
} from './ssr-hydrator.js';
import { loggers } from './logger.js';

const log = loggers.dom;

// ============================================================================
// SSR Mode State
// ============================================================================

/**
 * Check if currently in SSR mode.
 * Use this to conditionally skip browser-only code.
 * @returns {boolean}
 *
 * @example
 * import { isSSR } from 'pulse-js-framework/runtime/ssr';
 *
 * effect(() => {
 *   if (isSSR()) return; // Skip on server
 *   window.addEventListener('resize', handleResize);
 *   return () => window.removeEventListener('resize', handleResize);
 * });
 */
export function isSSR() {
  return isSSRMode();
}

/**
 * Set SSR mode (internal use).
 * @param {boolean} enabled
 * @internal
 */
export function setSSRMode(enabled) {
  setPulseSSRMode(enabled);
}

// ============================================================================
// Server-Side Rendering
// ============================================================================

/**
 * @typedef {Object} RenderToStringOptions
 * @property {boolean} [waitForAsync=true] - Wait for async operations before rendering
 * @property {number} [timeout=5000] - Timeout for async operations (ms)
 * @property {boolean} [serializeState=true] - Include state in result
 */

/**
 * @typedef {Object} RenderResult
 * @property {string} html - Rendered HTML string
 * @property {Object|null} state - Serialized state (if serializeState is true)
 */

/**
 * Render a component tree to an HTML string.
 *
 * Creates an isolated reactive context and renders the component using
 * MockDOMAdapter, then serializes the result to HTML.
 *
 * @param {Function} componentFactory - Function that returns the root component
 * @param {RenderToStringOptions} [options] - Rendering options
 * @returns {Promise<RenderResult>} Rendered HTML and optional state
 *
 * @example
 * // Basic rendering
 * const { html } = await renderToString(() => App());
 *
 * @example
 * // With async data fetching
 * const { html, state } = await renderToString(() => App(), {
 *   waitForAsync: true,
 *   timeout: 10000,
 *   serializeState: true
 * });
 */
export async function renderToString(componentFactory, options = {}) {
  const {
    waitForAsync = true,
    timeout = 5000,
    serializeState: includeState = true
  } = options;

  // Enable SSR mode
  setSSRMode(true);

  // Create isolated reactive context
  const ctx = createContext({ name: 'ssr' });

  // Create async context for data collection
  const asyncCtx = new SSRAsyncContext();

  // Create mock DOM adapter
  const adapter = new MockDOMAdapter();

  let html = '';
  let state = null;

  try {
    // Run in isolated context
    await ctx.run(async () => {
      withAdapter(adapter, () => {
        setSSRAsyncContext(asyncCtx);

        // First render pass - collects async operations
        const result = componentFactory();

        if (result) {
          adapter.appendChild(adapter.getBody(), result);
        }
      });

      // Wait for async operations if requested
      if (waitForAsync && asyncCtx.pendingCount > 0) {
        try {
          await asyncCtx.waitAll(timeout);
        } catch (e) {
          log.warn('SSR async timeout:', e.message);
        }

        // Second render pass with resolved data
        withAdapter(adapter, () => {
          adapter.reset();
          const result = componentFactory();
          if (result) {
            adapter.appendChild(adapter.getBody(), result);
          }
        });
      }

      // Serialize to HTML
      withAdapter(adapter, () => {
        html = serializeChildren(adapter.getBody());

        // Collect state if requested
        if (includeState) {
          state = asyncCtx.getAllResolved();
        }

        setSSRAsyncContext(null);
      });
    });
  } finally {
    // Clean up
    setSSRMode(false);
    ctx.reset();
  }

  return { html, state };
}

/**
 * Render to string synchronously (no async data waiting).
 * Use this when you don't need to wait for async operations.
 *
 * @param {Function} componentFactory - Function that returns the root component
 * @returns {string} Rendered HTML string
 *
 * @example
 * const html = renderToStringSync(() => StaticPage());
 */
export function renderToStringSync(componentFactory) {
  setSSRMode(true);
  const ctx = createContext({ name: 'ssr-sync' });
  const adapter = new MockDOMAdapter();

  let html = '';

  try {
    ctx.run(() => {
      withAdapter(adapter, () => {
        const result = componentFactory();
        if (result) {
          adapter.appendChild(adapter.getBody(), result);
        }
        html = serializeChildren(adapter.getBody());
      });
    });
  } finally {
    setSSRMode(false);
    ctx.reset();
  }

  return html;
}

// ============================================================================
// Client-Side Hydration
// ============================================================================

/**
 * @typedef {Object} HydrateOptions
 * @property {Object} [state] - Server state to restore
 * @property {Function} [onMismatch] - Callback when hydration mismatch detected
 */

/**
 * Hydrate server-rendered HTML by attaching event listeners and
 * connecting to the reactive system.
 *
 * @param {string|Element} target - CSS selector or DOM element
 * @param {Function} componentFactory - Function that returns the root component
 * @param {HydrateOptions} [options] - Hydration options
 * @returns {Function} Cleanup function to dispose hydration
 *
 * @example
 * // Basic hydration
 * const dispose = hydrate('#app', () => App());
 *
 * // Later, if needed:
 * dispose();
 *
 * @example
 * // With state restoration
 * hydrate('#app', () => App(), {
 *   state: window.__PULSE_STATE__,
 *   onMismatch: (expected, actual) => {
 *     console.warn('Hydration mismatch:', expected, actual);
 *   }
 * });
 */
export function hydrate(target, componentFactory, options = {}) {
  const { state, onMismatch } = options;

  // Get container element
  const container = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!container) {
    throw new Error(`[Pulse SSR] Hydration target not found: ${target}`);
  }

  // Restore state if provided
  if (state) {
    restoreState(state);
  }

  // Create hydration context
  const ctx = createHydrationContext(container);

  if (onMismatch) {
    ctx.onMismatch = onMismatch;
  }

  // Enable hydration mode
  setHydrationMode(true, ctx);

  try {
    // Run component factory - this will attach listeners to existing DOM
    componentFactory();
  } finally {
    // Disable hydration mode
    setHydrationMode(false, null);
  }

  // Return cleanup function
  return () => {
    disposeHydration(ctx);
  };
}

// ============================================================================
// State Serialization
// ============================================================================

/**
 * Recursively preprocess a value for serialization.
 * Converts Date and undefined to our special format.
 * @private
 */
function preprocessForSerialization(value, seen = new WeakSet()) {
  // Handle null
  if (value === null) return null;

  // Handle undefined
  if (value === undefined) return { __t: 'U' };

  // Handle Date
  if (value instanceof Date) {
    return { __t: 'D', v: value.toISOString() };
  }

  // Handle functions - skip
  if (typeof value === 'function') return undefined;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => preprocessForSerialization(item, seen));
  }

  // Handle objects
  if (typeof value === 'object') {
    // Circular reference check
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);

    const result = {};
    for (const [key, val] of Object.entries(value)) {
      const processed = preprocessForSerialization(val, seen);
      if (processed !== undefined) {
        result[key] = processed;
      }
    }
    return result;
  }

  // Primitives pass through
  return value;
}

/**
 * Serialize state for safe transfer from server to client.
 * Handles special types like Date and undefined.
 *
 * @param {*} state - State to serialize
 * @returns {string} JSON string safe for embedding in HTML
 *
 * @example
 * const json = serializeState({ date: new Date(), name: 'Test' });
 * // Can be safely embedded in <script> tag
 */
export function serializeState(state) {
  // Pre-process to handle Date and undefined before JSON.stringify
  const preprocessed = preprocessForSerialization(state);

  return JSON.stringify(preprocessed)
    // Escape </script> to prevent XSS
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
}

/**
 * Deserialize state received from server.
 * Restores special types like Date.
 *
 * @param {string|Object} data - Serialized state (string or already parsed object)
 * @returns {Object} Deserialized state
 *
 * @example
 * const state = deserializeState(window.__PULSE_STATE__);
 */
export function deserializeState(data) {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;

  return JSON.parse(JSON.stringify(parsed), (key, value) => {
    if (value && typeof value === 'object') {
      // Restore Date objects
      if (value.__t === 'D') {
        return new Date(value.v);
      }
      // Restore undefined
      if (value.__t === 'U') {
        return undefined;
      }
    }
    return value;
  });
}

/**
 * Restore serialized state into the application.
 * Override this function for custom state restoration logic.
 *
 * @param {Object} state - Deserialized state object
 *
 * @example
 * // Default implementation just stores in global
 * restoreState(window.__PULSE_STATE__);
 */
export function restoreState(state) {
  const deserialized = typeof state === 'string'
    ? deserializeState(state)
    : state;

  // Store in global for access by components
  if (typeof globalThis !== 'undefined') {
    globalThis.__PULSE_SSR_STATE__ = deserialized;
  }
}

/**
 * Get restored SSR state.
 * Use this in components to access server-fetched data.
 *
 * @param {string} [key] - Optional key to get specific value
 * @returns {*} Full state or specific value
 *
 * @example
 * const userData = getSSRState('user');
 */
export function getSSRState(key) {
  const state = globalThis?.__PULSE_SSR_STATE__ || {};
  return key ? state[key] : state;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { isHydratingMode, getHydrationContext } from './ssr-hydrator.js';
export { getSSRAsyncContext } from './ssr-async.js';

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Core functions
  renderToString,
  renderToStringSync,
  hydrate,

  // State management
  serializeState,
  deserializeState,
  restoreState,
  getSSRState,

  // Mode checks
  isSSR,
  isHydratingMode
};
