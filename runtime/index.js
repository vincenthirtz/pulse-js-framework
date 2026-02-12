/**
 * Pulse Runtime - Main exports
 *
 * Core modules are re-exported here for convenience.
 * Development-only modules (devtools, hmr) should be imported directly
 * from their respective paths to enable tree-shaking in production.
 */

// Core reactivity
export * from './pulse.js';

// DOM creation and manipulation
export * from './dom.js';

// Routing
export * from './router.js';

// State management
export * from './store.js';

// Context API
export * from './context.js';

// Async primitives (useAsync, useResource, usePolling)
export * from './async.js';

// Form handling (useForm, useField, validators)
export * from './form.js';

// HTTP client
export * from './http.js';

// WebSocket client
export * from './websocket.js';

// GraphQL client
export * from './graphql.js';

// Server-side rendering
export * from './ssr.js';

// Accessibility utilities
export * from './a11y.js';

// Native mobile bridge
export * from './native.js';

// Logging
export * from './logger.js';

// Security utilities (XSS prevention, URL sanitization)
export * from './utils.js';

// Error classes
export * from './errors.js';

// LRU Cache
export * from './lru-cache.js';

// DOM Adapter (for SSR/testing)
export * from './dom-adapter.js';

// SSE (Server-Sent Events)
export * from './sse.js';

// Persistence adapters (IndexedDB, SessionStorage, Memory)
export * from './persistence.js';

// Animation system (Web Animations API)
export * from './animation.js';

// Internationalization (i18n)
export * from './i18n.js';

// Service worker (main thread registration)
export * from './sw.js';

// Default exports for namespace imports
export { default as PulseCore } from './pulse.js';
export { default as PulseDOM } from './dom.js';
export { default as PulseRouter } from './router.js';
export { default as PulseStore } from './store.js';
export { default as PulseContext } from './context.js';
export { default as PulseAsync } from './async.js';
export { default as PulseForm } from './form.js';
export { default as PulseHttp } from './http.js';
export { default as PulseWebSocket } from './websocket.js';
export { default as PulseGraphQL } from './graphql.js';
export { default as PulseSSR } from './ssr.js';
export { default as PulseA11y } from './a11y.js';
export { default as PulseNative } from './native.js';
export { default as PulseLogger } from './logger.js';
export { default as PulseSSE } from './sse.js';
export { default as PulsePersistence } from './persistence.js';
export { default as PulseAnimation } from './animation.js';
export { default as PulseI18n } from './i18n.js';
export { default as PulseSW } from './sw.js';

// Note: The following modules are intentionally NOT re-exported here
// to enable tree-shaking. Import them directly when needed:
//
// Development tools (adds overhead, use only in dev):
//   import { enableDevTools, trackedPulse } from 'pulse-js-framework/runtime/devtools';
//
// HMR utilities (Vite/webpack integration):
//   import { createHMRContext } from 'pulse-js-framework/runtime/hmr';
//
// Lite build (minimal ~5KB bundle):
//   import { pulse, effect, el, mount } from 'pulse-js-framework/runtime/lite';
