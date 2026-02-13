/**
 * Pulse Router - Lazy Loading
 *
 * Lazy loading utilities for code-split route components
 *
 * @module pulse-js-framework/runtime/router/lazy
 */

import { el } from '../dom.js';
import { loggers } from '../logger.js';
import { createVersionedAsync } from '../async.js';
import { Errors } from '../errors.js';

const log = loggers.router;

/**
 * Lazy load helper for route components
 * Wraps a dynamic import to provide loading states and error handling
 *
 * MEMORY SAFETY: Uses load version tracking to prevent stale promise callbacks
 * from updating containers that are no longer in the DOM (e.g., after navigation).
 *
 * @param {function} importFn - Dynamic import function () => import('./Component.js')
 * @param {Object} options - Lazy loading options
 * @param {function} options.loading - Loading component function
 * @param {function} options.error - Error component function
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @param {number} options.delay - Delay before showing loading (default: 200)
 * @returns {function} Lazy route handler
 *
 * @example
 * const routes = {
 *   '/dashboard': lazy(() => import('./Dashboard.js')),
 *   '/settings': lazy(() => import('./Settings.js'), {
 *     loading: () => el('div.spinner', 'Loading...'),
 *     error: (err) => el('div.error', `Failed to load: ${err.message}`),
 *     timeout: 5000
 *   })
 * };
 */
export function lazy(importFn, options = {}) {
  const {
    loading: LoadingComponent = null,
    error: ErrorComponent = null,
    timeout = 10000,
    delay = 200
  } = options;

  // Cache for loaded component
  let cachedComponent = null;
  let loadPromise = null;

  // Use centralized versioned async for race condition handling
  const versionController = createVersionedAsync();

  return function lazyHandler(ctx) {
    // Return cached component if already loaded
    if (cachedComponent) {
      return typeof cachedComponent === 'function'
        ? cachedComponent(ctx)
        : cachedComponent.default
          ? cachedComponent.default(ctx)
          : cachedComponent.render
            ? cachedComponent.render(ctx)
            : cachedComponent;
    }

    // Create container for async loading
    const container = el('div.lazy-route');

    // Start a new versioned load operation
    const loadCtx = versionController.begin();

    // Attach abort method to container for cleanup on navigation
    container._pulseAbortLazyLoad = () => versionController.abort();

    // Start loading if not already
    if (!loadPromise) {
      loadPromise = importFn();
    }

    // Delay showing loading state to avoid flash (uses versioned timer)
    if (LoadingComponent && delay > 0) {
      loadCtx.setTimeout(() => {
        if (!cachedComponent && loadCtx.isCurrent()) {
          container.replaceChildren(LoadingComponent());
        }
      }, delay);
    } else if (LoadingComponent) {
      container.replaceChildren(LoadingComponent());
    }

    // Set timeout for loading (uses versioned timer)
    let timeoutPromise = null;
    if (timeout > 0) {
      timeoutPromise = new Promise((_, reject) => {
        loadCtx.setTimeout(() => {
          reject(Errors.lazyTimeout(timeout));
        }, timeout);
      });
    }

    // Race between load and timeout
    const loadWithTimeout = timeoutPromise
      ? Promise.race([loadPromise, timeoutPromise])
      : loadPromise;

    loadWithTimeout
      .then(module => {
        // Always cache the component, even if navigation occurred
        // This prevents re-showing loading state on future navigations
        cachedComponent = module;

        // Skip DOM updates if this load attempt is stale (navigation occurred)
        if (loadCtx.isStale()) {
          return;
        }

        // Get the component from module
        const Component = module.default || module;
        const result = typeof Component === 'function'
          ? Component(ctx)
          : Component.render
            ? Component.render(ctx)
            : Component;

        // Replace loading with actual component
        loadCtx.ifCurrent(() => {
          if (result instanceof Node) {
            container.replaceChildren(result);
          }
        });
      })
      .catch(err => {
        loadPromise = null; // Allow retry

        // Ignore if this load attempt is stale
        if (loadCtx.isStale()) {
          return;
        }

        if (ErrorComponent) {
          container.replaceChildren(ErrorComponent(err));
        } else {
          log.error('Lazy load error:', err);
          container.replaceChildren(
            el('div.lazy-error', `Failed to load component: ${err.message}`)
          );
        }
      });

    return container;
  };
}

/**
 * Preload a lazy component without rendering
 * Useful for prefetching on hover or when likely to navigate
 *
 * @param {function} lazyHandler - Lazy handler created with lazy()
 * @returns {Promise} Resolves when component is loaded
 *
 * @example
 * const DashboardLazy = lazy(() => import('./Dashboard.js'));
 * // Preload on link hover
 * link.addEventListener('mouseenter', () => preload(DashboardLazy));
 */
export function preload(lazyHandler) {
  // Trigger the lazy handler with a dummy context to start loading
  // The result is discarded, but the component will be cached
  return new Promise(resolve => {
    const result = lazyHandler({});
    if (result instanceof Promise) {
      result.then(resolve);
    } else {
      // Already loaded
      resolve(result);
    }
  });
}
