/**
 * Pulse Router - Backward Compatibility Export
 *
 * This file maintains backward compatibility by re-exporting from router/
 * The actual implementation has been split into focused sub-modules:
 *   - router/core.js - RouteTrie, createRouter, simpleRouter
 *   - router/lazy.js - Lazy loading utilities
 *   - router/guards.js - Middleware and navigation guards
 *   - router/history.js - Browser history and scroll management
 *   - router/utils.js - Route parsing and query string utilities
 *
 * @deprecated Import from 'pulse-js-framework/runtime/router/index.js' instead
 * @module pulse-js-framework/runtime/router
 */

export * from './router/index.js';
