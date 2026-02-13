/**
 * Pulse Router - Main Entry Point
 *
 * Barrel export for all router modules
 *
 * @module pulse-js-framework/runtime/router
 */

// Export all from sub-modules
export * from './core.js';
export * from './lazy.js';
export * from './guards.js';
export * from './history.js';
export * from './utils.js';

// Default export for backward compatibility
import {
  createRouter,
  simpleRouter,
  onBeforeLeave,
  onAfterEnter
} from './core.js';
import { lazy, preload } from './lazy.js';
import { matchRoute, parseQuery, buildQueryString } from './utils.js';

export default {
  createRouter,
  simpleRouter,
  lazy,
  preload,
  matchRoute,
  parseQuery,
  buildQueryString,
  onBeforeLeave,
  onAfterEnter
};
