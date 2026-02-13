/**
 * Pulse Router - Core
 *
 * Core router implementation with RouteTrie, createRouter, and main router logic
 *
 * @module pulse-js-framework/runtime/router/core
 */

import { pulse, effect, batch } from '../pulse.js';
import { el } from '../dom.js';
import { loggers } from '../logger.js';
import { Errors } from '../errors.js';
import { parsePattern, normalizeRoute, matchRoute, parseQuery, buildQueryString } from './utils.js';
import { createMiddlewareRunner } from './guards.js';
import { createScrollManager, handleScroll, back, forward, go } from './history.js';

const log = loggers.router;

/**
 * Radix Trie for efficient route matching
 * Provides O(path length) lookup instead of O(routes count)
 */
class RouteTrie {
  constructor() {
    this.root = { children: new Map(), route: null, paramName: null, isWildcard: false };
  }

  /**
   * Insert a route into the trie
   */
  insert(pattern, route) {
    const segments = pattern === '/' ? [''] : pattern.split('/').filter(Boolean);
    let node = this.root;

    for (const segment of segments) {
      let key;
      let paramName = null;
      let isWildcard = false;

      if (segment.startsWith(':')) {
        // Dynamic segment - :param
        key = ':';
        paramName = segment.slice(1);
      } else if (segment.startsWith('*')) {
        // Wildcard segment - *path
        key = '*';
        paramName = segment.slice(1) || 'wildcard';
        isWildcard = true;
      } else {
        // Static segment
        key = segment;
      }

      if (!node.children.has(key)) {
        node.children.set(key, {
          children: new Map(),
          route: null,
          paramName,
          isWildcard
        });
      }
      node = node.children.get(key);
    }

    node.route = route;
  }

  /**
   * Find a matching route for a path
   */
  find(path) {
    const segments = path === '/' ? [''] : path.split('/').filter(Boolean);
    return this._findRecursive(this.root, segments, 0, {});
  }

  _findRecursive(node, segments, index, params) {
    // End of path
    if (index === segments.length) {
      if (node.route) {
        return { route: node.route, params };
      }
      return null;
    }

    const segment = segments[index];

    // Try static match first (most specific)
    if (node.children.has(segment)) {
      const result = this._findRecursive(node.children.get(segment), segments, index + 1, params);
      if (result) return result;
    }

    // Try dynamic param match
    if (node.children.has(':')) {
      const paramNode = node.children.get(':');
      const newParams = { ...params, [paramNode.paramName]: decodeURIComponent(segment) };
      const result = this._findRecursive(paramNode, segments, index + 1, newParams);
      if (result) return result;
    }

    // Try wildcard match (catches all remaining segments)
    if (node.children.has('*')) {
      const wildcardNode = node.children.get('*');
      const remaining = segments.slice(index).map(decodeURIComponent).join('/');
      return {
        route: wildcardNode.route,
        params: { ...params, [wildcardNode.paramName]: remaining }
      };
    }

    return null;
  }
}

// Issue #66: Active router instance for standalone lifecycle exports
let _activeRouter = null;

/**
 * Create a router instance
 */
export function createRouter(options = {}) {
  const {
    routes = {},
    mode = 'history', // 'history' or 'hash'
    base = '',
    scrollBehavior = null, // Function to control scroll restoration
    middleware: initialMiddleware = [], // Middleware functions
    persistScroll = false, // Persist scroll positions to sessionStorage
    persistScrollKey = 'pulse-router-scroll', // Storage key for scroll persistence
    parseQueryTypes = false, // Parse typed query params (numbers, booleans)
    transition = null // CSS transition config { enterClass, enterActiveClass, leaveClass, leaveActiveClass, duration }
  } = options;

  // Validate transition duration to prevent DoS (max 10s)
  const transitionConfig = transition ? {
    enterClass: transition.enterClass || 'route-enter',
    enterActiveClass: transition.enterActiveClass || 'route-enter-active',
    leaveClass: transition.leaveClass || 'route-leave',
    leaveActiveClass: transition.leaveActiveClass || 'route-leave-active',
    duration: Math.min(Math.max(transition.duration || 300, 0), 10000)
  } : null;

  // Middleware array (mutable for dynamic registration)
  const middleware = [...initialMiddleware];

  // Reactive state
  const currentPath = pulse(getPath());
  const currentRoute = pulse(null);
  const currentParams = pulse({});
  const currentQuery = pulse({});
  const currentMeta = pulse({});
  const isLoading = pulse(false);
  const routeError = pulse(null);

  // Route error handler (configurable)
  let onRouteError = options.onRouteError || null;

  // Scroll manager
  const scrollManager = createScrollManager({ persist: persistScroll, persistKey: persistScrollKey });

  // Route trie for O(path length) lookups
  const routeTrie = new RouteTrie();

  // Compile routes (supports nested routes)
  const compiledRoutes = [];

  function compileRoutes(routeConfig, parentPath = '', parentLayout = null) {
    for (const [pattern, config] of Object.entries(routeConfig)) {
      const normalized = normalizeRoute(pattern, config);

      // Issue #71: Route groups — key starting with _ and group: true
      // Group children get NO URL prefix from the group key
      if (normalized.group && normalized.children) {
        const groupLayout = normalized.layout || parentLayout;
        compileRoutes(normalized.children, parentPath, groupLayout);
        continue;
      }

      const fullPattern = parentPath + pattern;

      // Inherit layout from parent group if not specified
      const routeLayout = normalized.layout || parentLayout;

      const route = {
        ...normalized,
        pattern: fullPattern,
        layout: routeLayout,
        ...parsePattern(fullPattern)
      };

      compiledRoutes.push(route);

      // Insert into trie for fast lookup
      routeTrie.insert(fullPattern, route);

      // Issue #68: Route aliases — the alias route is already in the trie at its own path
      // (e.g., '/fake' with alias: '/real'). The navigate() function resolves
      // aliases by following the alias chain to find the target handler.

      // Compile children (nested routes)
      if (normalized.children) {
        compileRoutes(normalized.children, fullPattern, routeLayout);
      }
    }
  }

  compileRoutes(routes);

  // Hooks
  const beforeHooks = [];
  const resolveHooks = [];
  const afterHooks = [];

  // Issue #66: Route lifecycle hooks (per-route, registered by components)
  const beforeLeaveHooks = new Map(); // path → [callbacks]
  const afterEnterHooks = new Map();  // path → [callbacks]

  // Issue #72: Loading change listeners
  const loadingListeners = [];

  /**
   * Get current path based on mode
   */
  function getPath() {
    if (mode === 'hash') {
      return window.location.hash.slice(1) || '/';
    }
    let path = window.location.pathname;
    if (base && path.startsWith(base)) {
      path = path.slice(base.length) || '/';
    }
    return path;
  }

  /**
   * Find matching route using trie for O(path length) lookup
   */
  function findRoute(path) {
    // Use trie for efficient lookup
    const result = routeTrie.find(path);
    if (result) {
      return result;
    }

    // Fallback to catch-all route if exists
    for (const route of compiledRoutes) {
      if (route.pattern === '*') {
        return { route, params: {} };
      }
    }

    return null;
  }

  /**
   * Navigate to a path
   */
  async function navigate(path, options = {}) {
    const { replace = false, query = {}, state = null } = options;

    // Issue #72: Set loading state at start of navigation
    const hasAsyncWork = middleware.length > 0 || beforeHooks.length > 0 || resolveHooks.length > 0;
    if (hasAsyncWork) {
      isLoading.set(true);
    }

    try {
      // Find matching route first (needed for beforeEnter guard)
      let match = findRoute(path);

      // Issue #68: Resolve alias — follow alias chain (with loop protection)
      const visited = new Set();
      while (match?.route?.alias && !visited.has(match.route.pattern)) {
        visited.add(match.route.pattern);
        const aliasTarget = match.route.alias;
        const aliasMatch = findRoute(aliasTarget);
        if (aliasMatch) {
          match = aliasMatch;
        } else {
          break;
        }
      }

      // Issue #70: Build full path with query using buildQueryString (array + null support)
      let fullPath = path;
      const queryString = buildQueryString(query);
      if (queryString) {
        fullPath += '?' + queryString;
      }

      // Handle redirect
      if (match?.route?.redirect) {
        const redirectPath = typeof match.route.redirect === 'function'
          ? match.route.redirect({ params: match.params, query })
          : match.route.redirect;
        return navigate(redirectPath, { replace: true });
      }

      // Create navigation context for guards
      const from = {
        path: currentPath.peek(),
        params: currentParams.peek(),
        query: currentQuery.peek(),
        meta: currentMeta.peek()
      };

      // Issue #70: Parse query with typed option
      const parsedQuery = parseQuery(queryString, { typed: parseQueryTypes });

      const to = {
        path,
        params: match?.params || {},
        query: parsedQuery,
        meta: match?.route?.meta || {}
      };

      // Issue #66: Run beforeLeave hooks for the current route
      const leavePath = currentPath.peek();
      const leaveCallbacks = beforeLeaveHooks.get(leavePath);
      if (leaveCallbacks && leaveCallbacks.length > 0) {
        for (const cb of [...leaveCallbacks]) {
          const result = await cb(to, from);
          if (result === false) return false;
        }
      }

      // Run middleware if configured
      if (middleware.length > 0) {
        const runMiddleware = createMiddlewareRunner(middleware);
        const middlewareResult = await runMiddleware({ to, from });
        if (middlewareResult.aborted) {
          return false;
        }
        if (middlewareResult.redirectPath) {
          return navigate(middlewareResult.redirectPath, { replace: true });
        }
        // Merge middleware meta into route meta
        Object.assign(to.meta, middlewareResult.meta);
      }

      // Run global beforeEach hooks
      for (const hook of beforeHooks) {
        const result = await hook(to, from);
        if (result === false) return false;
        if (typeof result === 'string') {
          return navigate(result, options);
        }
      }

      // Run per-route beforeEnter guard
      if (match?.route?.beforeEnter) {
        const result = await match.route.beforeEnter(to, from);
        if (result === false) return false;
        if (typeof result === 'string') {
          return navigate(result, options);
        }
      }

      // Run beforeResolve hooks (after per-route guards)
      for (const hook of resolveHooks) {
        const result = await hook(to, from);
        if (result === false) return false;
        if (typeof result === 'string') {
          return navigate(result, options);
        }
      }

      // Save scroll position before leaving
      scrollManager.saveScrollPosition(currentPath.peek());

      // Update URL
      const url = mode === 'hash' ? `#${fullPath}` : `${base}${fullPath}`;
      const historyState = { path: fullPath, ...(state || {}) };

      if (replace) {
        window.history.replaceState(historyState, '', url);
      } else {
        window.history.pushState(historyState, '', url);
      }

      // Update reactive state
      await updateRoute(path, parsedQuery, match);

      // Handle scroll behavior
      handleScroll(to, from, scrollManager.getScrollPosition(path), scrollBehavior);

      // Issue #66: Run afterEnter hooks for the new route
      const enterCallbacks = afterEnterHooks.get(path);
      if (enterCallbacks && enterCallbacks.length > 0) {
        for (const cb of [...enterCallbacks]) {
          cb(to);
        }
      }

      return true;
    } finally {
      // Issue #72: Always reset loading state
      isLoading.set(false);
    }
  }

  /**
   * Update the current route state
   */
  async function updateRoute(path, query = {}, match = null) {
    if (!match) {
      match = findRoute(path);
    }

    batch(() => {
      currentPath.set(path);
      currentQuery.set(query);

      if (match) {
        currentRoute.set(match.route);
        currentParams.set(match.params);
        currentMeta.set(match.route.meta || {});
      } else {
        currentRoute.set(null);
        currentParams.set({});
        currentMeta.set({});
      }
    });

    // Run after hooks with full context
    const to = {
      path,
      params: match?.params || {},
      query,
      meta: match?.route?.meta || {}
    };

    for (const hook of afterHooks) {
      await hook(to);
    }
  }

  /**
   * Handle browser navigation (back/forward)
   */
  function handlePopState() {
    const path = getPath();
    const query = parseQuery(window.location.search);
    updateRoute(path, query);
  }

  /**
   * Start listening to navigation events
   */
  function start() {
    window.addEventListener('popstate', handlePopState);

    // Initial route
    const query = parseQuery(window.location.search);
    updateRoute(getPath(), query);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }

  /**
   * Create a link element that uses the router
   */
  function link(path, content, options = {}) {
    const href = mode === 'hash' ? `#${path}` : `${base}${path}`;
    const a = el('a', content);
    a.href = href;

    const handleClick = (e) => {
      // Allow ctrl/cmd+click for new tab
      if (e.ctrlKey || e.metaKey) return;

      e.preventDefault();
      navigate(path, options);
    };

    a.addEventListener('click', handleClick);

    // Add active class when route matches
    const disposeEffect = effect(() => {
      const current = currentPath.get();
      if (current === path || (options.exact === false && current.startsWith(path))) {
        a.classList.add(options.activeClass || 'active');
      } else {
        a.classList.remove(options.activeClass || 'active');
      }
    });

    a.cleanup = () => {
      a.removeEventListener('click', handleClick);
      disposeEffect();
    };

    return a;
  }

  /**
   * Router outlet - renders the current route's component
   *
   * MEMORY SAFETY: Aborts any pending lazy loads when navigating away
   * to prevent stale callbacks from updating the DOM.
   *
   * Supports:
   * - Route groups with shared layouts (#71)
   * - CSS route transitions (#66)
   */
  function outlet(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    let currentView = null;
    let cleanup = null;

    /**
     * Remove old view, optionally with CSS transition
     */
    function removeOldView(oldView, onDone) {
      if (!oldView) {
        onDone();
        return;
      }

      // Abort any pending lazy loads before removing the view
      if (oldView._pulseAbortLazyLoad) {
        oldView._pulseAbortLazyLoad();
      }

      // Issue #66: CSS transition on leave
      if (transitionConfig && oldView.classList) {
        oldView.classList.add(transitionConfig.leaveClass);
        requestAnimationFrame(() => {
          oldView.classList.add(transitionConfig.leaveActiveClass);
        });
        setTimeout(() => {
          oldView.classList.remove(transitionConfig.leaveClass, transitionConfig.leaveActiveClass);
          container.replaceChildren();
          onDone();
        }, transitionConfig.duration);
      } else {
        container.replaceChildren();
        onDone();
      }
    }

    /**
     * Add new view, optionally with CSS transition
     */
    function addNewView(view) {
      container.appendChild(view);
      currentView = view;

      // Issue #66: CSS transition on enter
      if (transitionConfig && view.classList) {
        view.classList.add(transitionConfig.enterClass);
        requestAnimationFrame(() => {
          view.classList.add(transitionConfig.enterActiveClass);
          setTimeout(() => {
            view.classList.remove(transitionConfig.enterClass, transitionConfig.enterActiveClass);
          }, transitionConfig.duration);
        });
      }
    }

    effect(() => {
      const route = currentRoute.get();
      const params = currentParams.get();
      const query = currentQuery.get();

      // Cleanup previous view
      if (cleanup) cleanup();

      const oldView = currentView;
      currentView = null;

      function renderRoute() {
        if (route && route.handler) {
          // Create context for the route handler
          const ctx = {
            params,
            query,
            path: currentPath.peek(),
            navigate,
            router
          };

          // Helper to handle errors
          const handleError = (error) => {
            routeError.set(error);
            log.error('Route component error:', error);

            if (onRouteError) {
              try {
                const errorView = onRouteError(error, ctx);
                if (errorView instanceof Node) {
                  addNewView(errorView);
                  return true;
                }
              } catch (handlerError) {
                log.error('Route error handler threw:', handlerError);
              }
            }

            const errorEl = el('div.route-error', [
              el('h2', 'Route Error'),
              el('p', error.message || 'Failed to load route component')
            ]);
            addNewView(errorEl);
            return true;
          };

          // Call handler and render result (with error handling)
          let result;
          try {
            result = typeof route.handler === 'function'
              ? route.handler(ctx)
              : route.handler;
          } catch (error) {
            handleError(error);
            return;
          }

          if (result instanceof Node) {
            // Issue #71: Wrap with layout if route has one
            let view = result;
            if (route.layout && typeof route.layout === 'function') {
              try {
                const layoutResult = route.layout(() => result, ctx);
                if (layoutResult instanceof Node) {
                  view = layoutResult;
                }
              } catch (error) {
                log.error('Layout error:', error);
              }
            }

            addNewView(view);
            routeError.set(null);
          } else if (result && typeof result.then === 'function') {
            // Async component
            isLoading.set(true);
            routeError.set(null);
            result
              .then(component => {
                isLoading.set(false);
                let view = typeof component === 'function' ? component(ctx) : component;
                if (view instanceof Node) {
                  // Issue #71: Wrap with layout
                  if (route.layout && typeof route.layout === 'function') {
                    try {
                      const layoutResult = route.layout(() => view, ctx);
                      if (layoutResult instanceof Node) {
                        view = layoutResult;
                      }
                    } catch (error) {
                      log.error('Layout error:', error);
                    }
                  }

                  addNewView(view);
                }
              })
              .catch(error => {
                isLoading.set(false);
                handleError(error);
              });
          }
        }
      }

      // Remove old view (with optional transition), then render new route
      removeOldView(oldView, renderRoute);
    });

    return container;
  }

  /**
   * Add middleware dynamically
   * @param {function} middlewareFn - Middleware function (ctx, next) => {}
   * @returns {function} Unregister function
   */
  function use(middlewareFn) {
    middleware.push(middlewareFn);
    return () => {
      const index = middleware.indexOf(middlewareFn);
      if (index > -1) middleware.splice(index, 1);
    };
  }

  /**
   * Add navigation guard
   */
  function beforeEach(hook) {
    beforeHooks.push(hook);
    return () => {
      const index = beforeHooks.indexOf(hook);
      if (index > -1) beforeHooks.splice(index, 1);
    };
  }

  /**
   * Add before resolve hook (runs after per-route guards)
   */
  function beforeResolve(hook) {
    resolveHooks.push(hook);
    return () => {
      const index = resolveHooks.indexOf(hook);
      if (index > -1) resolveHooks.splice(index, 1);
    };
  }

  /**
   * Add after navigation hook
   */
  function afterEach(hook) {
    afterHooks.push(hook);
    return () => {
      const index = afterHooks.indexOf(hook);
      if (index > -1) afterHooks.splice(index, 1);
    };
  }

  /**
   * Check if a path matches the current route
   * @param {string} path - Path to check
   * @param {boolean} [exact=false] - If true, requires exact match; if false, matches prefixes
   * @returns {boolean} True if path is active
   * @example
   * // Current path: /users/123
   * router.isActive('/users');      // true (prefix match)
   * router.isActive('/users', true); // false (not exact)
   * router.isActive('/users/123', true); // true (exact match)
   */
  function isActive(path, exact = false) {
    const current = currentPath.get();
    if (exact) {
      return current === path;
    }
    return current.startsWith(path);
  }

  /**
   * Get all routes that match a given path (useful for nested routes)
   * @param {string} path - Path to match against routes
   * @returns {Array<{route: Object, params: Object}>} Array of matched routes with extracted params
   * @example
   * const matches = router.getMatchedRoutes('/admin/users/123');
   * // Returns: [{route: adminRoute, params: {}}, {route: userRoute, params: {id: '123'}}]
   */
  function getMatchedRoutes(path) {
    const matches = [];
    for (const route of compiledRoutes) {
      const params = matchRoute(route.pattern, path);
      if (params !== null) {
        matches.push({ route, params });
      }
    }
    return matches;
  }

  /**
   * Set route error handler
   * @param {function} handler - Error handler (error, ctx) => Node
   * @returns {function} Previous handler
   */
  function setErrorHandler(handler) {
    const prev = onRouteError;
    onRouteError = handler;
    return prev;
  }

  /**
   * Issue #72: Subscribe to loading state changes
   * @param {function} callback - Called with (loading: boolean) when loading state changes
   * @returns {function} Unsubscribe function
   */
  function onLoadingChange(callback) {
    const dispose = effect(() => {
      callback(isLoading.get());
    });
    loadingListeners.push(dispose);
    return () => {
      dispose();
      const idx = loadingListeners.indexOf(dispose);
      if (idx > -1) loadingListeners.splice(idx, 1);
    };
  }

  /**
   * Issue #66: Register a callback to run before leaving the current route
   * If callback returns false, navigation is blocked
   * @param {function} callback - (to, from) => boolean|void
   * @returns {function} Unsubscribe function
   */
  function registerBeforeLeave(callback) {
    const path = currentPath.peek();
    if (!beforeLeaveHooks.has(path)) {
      beforeLeaveHooks.set(path, []);
    }
    beforeLeaveHooks.get(path).push(callback);

    return () => {
      const hooks = beforeLeaveHooks.get(path);
      if (hooks) {
        const idx = hooks.indexOf(callback);
        if (idx > -1) hooks.splice(idx, 1);
        if (hooks.length === 0) beforeLeaveHooks.delete(path);
      }
    };
  }

  /**
   * Issue #66: Register a callback to run after entering the current route
   * @param {function} callback - (to) => void
   * @returns {function} Unsubscribe function
   */
  function registerAfterEnter(callback) {
    const path = currentPath.peek();
    if (!afterEnterHooks.has(path)) {
      afterEnterHooks.set(path, []);
    }
    afterEnterHooks.get(path).push(callback);

    return () => {
      const hooks = afterEnterHooks.get(path);
      if (hooks) {
        const idx = hooks.indexOf(callback);
        if (idx > -1) hooks.splice(idx, 1);
        if (hooks.length === 0) afterEnterHooks.delete(path);
      }
    };
  }

  /**
   * Router instance with reactive state and navigation methods.
   *
   * Reactive properties (use .get() to read value, auto-updates in effects):
   * - path: Current URL path as string
   * - route: Current matched route object or null
   * - params: Route params object, e.g., {id: '123'}
   * - query: Query params object, e.g., {page: '1'}
   * - meta: Route meta data object
   * - loading: Boolean indicating async route loading
   * - error: Current route error or null
   *
   * @example
   * // Read reactive state
   * router.path.get();   // '/users/123'
   * router.params.get(); // {id: '123'}
   *
   * // Subscribe to changes
   * effect(() => {
   *   console.log('Path changed:', router.path.get());
   * });
   *
   * // Navigate
   * router.navigate('/users/456');
   * router.back();
   */
  const router = {
    // Reactive state (read-only) - use .get() to read, subscribe with effects
    path: currentPath,
    route: currentRoute,
    params: currentParams,
    query: currentQuery,
    meta: currentMeta,
    loading: isLoading,
    error: routeError,

    // Navigation methods
    navigate,
    start,
    link,
    outlet,
    back: () => {
      scrollManager.saveScrollPosition(currentPath.peek());
      return back();
    },
    forward: () => {
      scrollManager.saveScrollPosition(currentPath.peek());
      return forward();
    },
    go: (delta) => {
      scrollManager.saveScrollPosition(currentPath.peek());
      return go(delta);
    },

    // Guards and middleware
    use,
    beforeEach,
    beforeResolve,
    afterEach,
    setErrorHandler,

    // Issue #66: Route lifecycle hooks
    onBeforeLeave: registerBeforeLeave,
    onAfterEnter: registerAfterEnter,

    // Issue #72: Loading state listener
    onLoadingChange,

    // Route inspection
    isActive,
    getMatchedRoutes,

    // Utility functions
    matchRoute,
    parseQuery,
    buildQueryString
  };

  // Set as active router for standalone exports (onBeforeLeave, onAfterEnter)
  _activeRouter = router;

  return router;
}

/**
 * Create a simple router for quick setup
 */
export function simpleRouter(routes, target = '#app') {
  const router = createRouter({ routes });
  router.start();
  router.outlet(target);
  return router;
}

/**
 * Register a callback to run before leaving the current route
 * Must be called within a route handler context
 * @param {function} callback - (to, from) => boolean|void — return false to block
 * @returns {function} Unsubscribe function
 */
export function onBeforeLeave(callback) {
  if (!_activeRouter) {
    log.warn('onBeforeLeave() called outside of a router context');
    return () => {};
  }
  return _activeRouter.onBeforeLeave(callback);
}

/**
 * Register a callback to run after entering the current route
 * Must be called within a route handler context
 * @param {function} callback - (to) => void
 * @returns {function} Unsubscribe function
 */
export function onAfterEnter(callback) {
  if (!_activeRouter) {
    log.warn('onAfterEnter() called outside of a router context');
    return () => {};
  }
  return _activeRouter.onAfterEnter(callback);
}
