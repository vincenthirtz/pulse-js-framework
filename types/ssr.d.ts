/**
 * Pulse Framework - SSR (Server-Side Rendering) Type Definitions
 * @module pulse-js-framework/runtime/ssr
 */

// ============================================================================
// Options and Result Interfaces
// ============================================================================

/**
 * Options for renderToString
 */
export interface RenderToStringOptions {
  /** Wait for async operations before rendering (default: true) */
  waitForAsync?: boolean;

  /** Timeout for async operations in ms (default: 5000) */
  timeout?: number;

  /** Include state in result (default: true) */
  serializeState?: boolean;
}

/**
 * Result returned by renderToString
 */
export interface RenderResult {
  /** Rendered HTML string */
  html: string;

  /** Serialized state (null if serializeState is false) */
  state: Record<string, unknown> | null;
}

/**
 * Options for hydrate
 */
export interface HydrateOptions {
  /** Server state to restore */
  state?: unknown;

  /**
   * Callback when hydration mismatch detected.
   * @param expected - What was expected in the DOM
   * @param actual - What was found in the DOM
   */
  onMismatch?: (expected: string, actual: string) => void;
}

// ============================================================================
// SSR Mode
// ============================================================================

/**
 * Check if currently in SSR mode.
 * Use this to conditionally skip browser-only code.
 *
 * @returns True if running in SSR mode
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
export declare function isSSR(): boolean;

/**
 * Set SSR mode (internal use).
 * @param enabled - Whether to enable SSR mode
 * @internal
 */
export declare function setSSRMode(enabled: boolean): void;

// ============================================================================
// Server-Side Rendering
// ============================================================================

/**
 * Render a component tree to an HTML string.
 *
 * Creates an isolated reactive context and renders the component using
 * MockDOMAdapter, then serializes the result to HTML.
 *
 * @param componentFactory - Function that returns the root component
 * @param options - Rendering options
 * @returns Rendered HTML and optional state
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
export declare function renderToString(
  componentFactory: () => unknown,
  options?: RenderToStringOptions
): Promise<RenderResult>;

/**
 * Render to string synchronously (no async data waiting).
 * Use this when you don't need to wait for async operations.
 *
 * @param componentFactory - Function that returns the root component
 * @returns Rendered HTML string
 *
 * @example
 * const html = renderToStringSync(() => StaticPage());
 */
export declare function renderToStringSync(
  componentFactory: () => unknown
): string;

// ============================================================================
// Client-Side Hydration
// ============================================================================

/**
 * Hydrate server-rendered HTML by attaching event listeners and
 * connecting to the reactive system.
 *
 * @param target - CSS selector or DOM element
 * @param componentFactory - Function that returns the root component
 * @param options - Hydration options
 * @returns Cleanup function to dispose hydration
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
export declare function hydrate(
  target: string | Element,
  componentFactory: () => unknown,
  options?: HydrateOptions
): () => void;

// ============================================================================
// State Serialization
// ============================================================================

/**
 * Serialize state for safe transfer from server to client.
 * Handles special types like Date and undefined.
 * Escapes HTML entities to prevent XSS when embedded in script tags.
 *
 * @param state - State to serialize
 * @returns JSON string safe for embedding in HTML
 *
 * @example
 * const json = serializeState({ date: new Date(), name: 'Test' });
 * // Can be safely embedded in <script> tag
 */
export declare function serializeState(state: unknown): string;

/**
 * Deserialize state received from server.
 * Restores special types like Date.
 *
 * @param data - Serialized state (string or already parsed object)
 * @returns Deserialized state
 *
 * @example
 * const state = deserializeState(window.__PULSE_STATE__);
 */
export declare function deserializeState(data: string | object): unknown;

/**
 * Restore serialized state into the application.
 * Stores the deserialized state in module scope and globalThis for access
 * by components via getSSRState().
 *
 * @param state - Serialized or deserialized state object
 *
 * @example
 * restoreState(window.__PULSE_STATE__);
 */
export declare function restoreState(state: unknown): void;

/**
 * Get restored SSR state.
 * Use this in components to access server-fetched data.
 *
 * @param key - Optional key to get specific value
 * @returns Full state object or specific value if key is provided
 *
 * @example
 * const userData = getSSRState('user');
 * const allState = getSSRState();
 */
export declare function getSSRState(key?: string): unknown;

/**
 * Clear the SSR state.
 * Use in tests or when cleaning up SSR context.
 */
export declare function clearSSRState(): void;

// ============================================================================
// Re-exports from ssr-hydrator.js
// ============================================================================

/**
 * Check if currently in hydration mode.
 * @returns True if hydrating server-rendered HTML
 */
export declare function isHydratingMode(): boolean;

/**
 * Get the current hydration context.
 * @returns Hydration context or null if not hydrating
 */
export declare function getHydrationContext(): unknown;

// ============================================================================
// Re-exports from ssr-async.js
// ============================================================================

/**
 * Get the current SSR async context.
 * Returns null if not in SSR mode.
 * @returns SSR async context or null
 */
export declare function getSSRAsyncContext(): unknown;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  renderToString: typeof renderToString;
  renderToStringSync: typeof renderToStringSync;
  hydrate: typeof hydrate;
  serializeState: typeof serializeState;
  deserializeState: typeof deserializeState;
  restoreState: typeof restoreState;
  getSSRState: typeof getSSRState;
  clearSSRState: typeof clearSSRState;
  isSSR: typeof isSSR;
  isHydratingMode: typeof isHydratingMode;
};

export default _default;
