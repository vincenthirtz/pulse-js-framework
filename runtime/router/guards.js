/**
 * Pulse Router - Guards and Middleware
 *
 * Navigation guards and middleware system for route protection
 *
 * @module pulse-js-framework/runtime/router/guards
 */

import { loggers } from '../logger.js';

const log = loggers.router;

/**
 * Middleware context passed to each middleware function
 * @typedef {Object} MiddlewareContext
 * @property {NavigationTarget} to - Target route
 * @property {NavigationTarget} from - Source route
 * @property {Object} meta - Shared metadata between middlewares
 * @property {function} redirect - Redirect to another path
 * @property {function} abort - Abort navigation
 */

/**
 * Create a middleware runner for the router
 * Middlewares are executed in order, each can modify context or abort navigation
 *
 * @param {Array<function>} middlewares - Array of middleware functions
 * @returns {function} Runner function
 *
 * @example
 * const authMiddleware = async (ctx, next) => {
 *   if (ctx.to.meta.requiresAuth && !isAuthenticated()) {
 *     return ctx.redirect('/login');
 *   }
 *   await next();
 * };
 *
 * const loggerMiddleware = async (ctx, next) => {
 *   console.log('Navigating to:', ctx.to.path);
 *   const start = Date.now();
 *   await next();
 *   console.log('Navigation took:', Date.now() - start, 'ms');
 * };
 *
 * const router = createRouter({
 *   routes,
 *   middleware: [loggerMiddleware, authMiddleware]
 * });
 */
export function createMiddlewareRunner(middlewares) {
  return async function runMiddleware(context) {
    let index = 0;
    let aborted = false;
    let redirectPath = null;

    // Create enhanced context with redirect and abort
    const ctx = {
      ...context,
      meta: {},
      redirect: (path) => {
        redirectPath = path;
      },
      abort: () => {
        aborted = true;
      }
    };

    async function next() {
      if (aborted || redirectPath) return;
      if (index >= middlewares.length) return;

      const middlewareIndex = index;
      const middleware = middlewares[index++];
      try {
        await middleware(ctx, next);
      } catch (error) {
        log.error(`Middleware error at index ${middlewareIndex}:`, error);
        throw error; // Re-throw to halt navigation
      }
    }

    await next();

    return {
      aborted,
      redirectPath,
      meta: ctx.meta
    };
  };
}
