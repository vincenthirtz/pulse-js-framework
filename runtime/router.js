/**
 * Pulse Router - SPA routing system
 *
 * A simple but powerful router that integrates with Pulse reactivity
 *
 * Features:
 * - Route params and query strings
 * - Nested routes
 * - Route meta fields
 * - Per-route and global guards
 * - Scroll restoration
 * - Lazy-loaded routes
 * - Middleware support
 */

import { pulse, effect, batch } from './pulse.js';
import { el } from './dom.js';
import { loggers } from './logger.js';

const log = loggers.router;

/**
 * Lazy load helper for route components
 * Wraps a dynamic import to provide loading states and error handling
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
    let loadingTimer = null;
    let timeoutTimer = null;

    // Start loading if not already
    if (!loadPromise) {
      loadPromise = importFn();
    }

    // Delay showing loading state to avoid flash
    if (LoadingComponent && delay > 0) {
      loadingTimer = setTimeout(() => {
        if (!cachedComponent) {
          container.replaceChildren(LoadingComponent());
        }
      }, delay);
    } else if (LoadingComponent) {
      container.replaceChildren(LoadingComponent());
    }

    // Set timeout for loading
    const timeoutPromise = timeout > 0
      ? new Promise((_, reject) => {
          timeoutTimer = setTimeout(() => {
            reject(new Error(`Lazy load timeout after ${timeout}ms`));
          }, timeout);
        })
      : null;

    // Race between load and timeout
    const loadWithTimeout = timeoutPromise
      ? Promise.race([loadPromise, timeoutPromise])
      : loadPromise;

    loadWithTimeout
      .then(module => {
        clearTimeout(loadingTimer);
        clearTimeout(timeoutTimer);

        // Cache the component
        cachedComponent = module;

        // Get the component from module
        const Component = module.default || module;
        const result = typeof Component === 'function'
          ? Component(ctx)
          : Component.render
            ? Component.render(ctx)
            : Component;

        // Replace loading with actual component
        if (result instanceof Node) {
          container.replaceChildren(result);
        }
      })
      .catch(err => {
        clearTimeout(loadingTimer);
        clearTimeout(timeoutTimer);
        loadPromise = null; // Allow retry

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
function createMiddlewareRunner(middlewares) {
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

      const middleware = middlewares[index++];
      await middleware(ctx, next);
    }

    await next();

    return {
      aborted,
      redirectPath,
      meta: ctx.meta
    };
  };
}

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

/**
 * Parse a route pattern into a regex and extract param names
 * Supports: /users/:id, /posts/:id/comments, /files/*path, * (catch-all)
 */
function parsePattern(pattern) {
  const paramNames = [];

  // Handle standalone * as catch-all
  if (pattern === '*') {
    return {
      regex: /^.*$/,
      paramNames: []
    };
  }

  let regexStr = pattern
    // Escape special regex chars except : and *
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Handle wildcard params (*name)
    .replace(/\*([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '(.*)';
    })
    // Handle named params (:name)
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

  // Ensure exact match
  regexStr = `^${regexStr}$`;

  return {
    regex: new RegExp(regexStr),
    paramNames
  };
}

/**
 * Normalize route configuration
 * Supports both simple (handler function) and full (object with meta) definitions
 */
function normalizeRoute(pattern, config) {
  // Simple format: pattern -> handler
  if (typeof config === 'function') {
    return {
      pattern,
      handler: config,
      meta: {},
      beforeEnter: null,
      children: null
    };
  }

  // Full format: pattern -> { handler, meta, beforeEnter, children }
  return {
    pattern,
    handler: config.handler || config.component,
    meta: config.meta || {},
    beforeEnter: config.beforeEnter || null,
    children: config.children || null,
    redirect: config.redirect || null
  };
}

/**
 * Match a path against a route pattern
 */
function matchRoute(pattern, path) {
  const { regex, paramNames } = parsePattern(pattern);
  const match = path.match(regex);

  if (!match) return null;

  const params = {};
  paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1]);
  });

  return params;
}

/**
 * Parse query string into object
 */
function parseQuery(search) {
  const params = new URLSearchParams(search);
  const query = {};
  for (const [key, value] of params) {
    if (key in query) {
      // Multiple values for same key
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}

/**
 * Create a router instance
 */
export function createRouter(options = {}) {
  const {
    routes = {},
    mode = 'history', // 'history' or 'hash'
    base = '',
    scrollBehavior = null, // Function to control scroll restoration
    middleware: initialMiddleware = [] // Middleware functions
  } = options;

  // Middleware array (mutable for dynamic registration)
  const middleware = [...initialMiddleware];

  // Reactive state
  const currentPath = pulse(getPath());
  const currentRoute = pulse(null);
  const currentParams = pulse({});
  const currentQuery = pulse({});
  const currentMeta = pulse({});
  const isLoading = pulse(false);

  // Scroll positions for history
  const scrollPositions = new Map();

  // Route trie for O(path length) lookups
  const routeTrie = new RouteTrie();

  // Compile routes (supports nested routes)
  const compiledRoutes = [];

  function compileRoutes(routeConfig, parentPath = '') {
    for (const [pattern, config] of Object.entries(routeConfig)) {
      const normalized = normalizeRoute(pattern, config);
      const fullPattern = parentPath + pattern;

      const route = {
        ...normalized,
        pattern: fullPattern,
        ...parsePattern(fullPattern)
      };

      compiledRoutes.push(route);

      // Insert into trie for fast lookup
      routeTrie.insert(fullPattern, route);

      // Compile children (nested routes)
      if (normalized.children) {
        compileRoutes(normalized.children, fullPattern);
      }
    }
  }

  compileRoutes(routes);

  // Hooks
  const beforeHooks = [];
  const resolveHooks = [];
  const afterHooks = [];

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

    // Find matching route first (needed for beforeEnter guard)
    const match = findRoute(path);

    // Build full path with query
    let fullPath = path;
    const queryString = new URLSearchParams(query).toString();
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

    const to = {
      path,
      params: match?.params || {},
      query: parseQuery(queryString),
      meta: match?.route?.meta || {}
    };

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
    const currentFullPath = currentPath.peek();
    if (currentFullPath) {
      scrollPositions.set(currentFullPath, {
        x: window.scrollX,
        y: window.scrollY
      });
    }

    // Update URL
    const url = mode === 'hash' ? `#${fullPath}` : `${base}${fullPath}`;
    const historyState = { path: fullPath, ...(state || {}) };

    if (replace) {
      window.history.replaceState(historyState, '', url);
    } else {
      window.history.pushState(historyState, '', url);
    }

    // Update reactive state
    await updateRoute(path, parseQuery(queryString), match);

    // Handle scroll behavior
    handleScroll(to, from, scrollPositions.get(path));

    return true;
  }

  /**
   * Handle scroll behavior after navigation
   */
  function handleScroll(to, from, savedPosition) {
    if (scrollBehavior) {
      const position = scrollBehavior(to, from, savedPosition);
      if (position) {
        if (position.selector) {
          // Scroll to element
          const el = document.querySelector(position.selector);
          if (el) {
            el.scrollIntoView({ behavior: position.behavior || 'auto' });
          }
        } else if (typeof position.x === 'number' || typeof position.y === 'number') {
          window.scrollTo({
            left: position.x || 0,
            top: position.y || 0,
            behavior: position.behavior || 'auto'
          });
        }
      }
    } else if (savedPosition) {
      // Default: restore saved position
      window.scrollTo(savedPosition.x, savedPosition.y);
    } else {
      // Default: scroll to top
      window.scrollTo(0, 0);
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

    a.addEventListener('click', (e) => {
      // Allow ctrl/cmd+click for new tab
      if (e.ctrlKey || e.metaKey) return;

      e.preventDefault();
      navigate(path, options);
    });

    // Add active class when route matches
    effect(() => {
      const current = currentPath.get();
      if (current === path || (options.exact === false && current.startsWith(path))) {
        a.classList.add(options.activeClass || 'active');
      } else {
        a.classList.remove(options.activeClass || 'active');
      }
    });

    return a;
  }

  /**
   * Router outlet - renders the current route's component
   */
  function outlet(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    let currentView = null;
    let cleanup = null;

    effect(() => {
      const route = currentRoute.get();
      const params = currentParams.get();
      const query = currentQuery.get();

      // Cleanup previous view
      if (cleanup) cleanup();
      if (currentView) {
        container.replaceChildren();
      }

      if (route && route.handler) {
        // Create context for the route handler
        const ctx = {
          params,
          query,
          path: currentPath.peek(),
          navigate,
          router
        };

        // Call handler and render result
        const result = typeof route.handler === 'function'
          ? route.handler(ctx)
          : route.handler;

        if (result instanceof Node) {
          container.appendChild(result);
          currentView = result;
        } else if (result && typeof result.then === 'function') {
          // Async component
          isLoading.set(true);
          result.then(component => {
            isLoading.set(false);
            const view = typeof component === 'function' ? component(ctx) : component;
            if (view instanceof Node) {
              container.appendChild(view);
              currentView = view;
            }
          });
        }
      }
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
   * Check if a route matches the given path
   */
  function isActive(path, exact = false) {
    const current = currentPath.get();
    if (exact) {
      return current === path;
    }
    return current.startsWith(path);
  }

  /**
   * Get all matched routes (for nested routes)
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
   * Go back in history
   */
  function back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  function forward() {
    window.history.forward();
  }

  /**
   * Go to specific history entry
   */
  function go(delta) {
    window.history.go(delta);
  }

  const router = {
    // Reactive state (read-only)
    path: currentPath,
    route: currentRoute,
    params: currentParams,
    query: currentQuery,
    meta: currentMeta,
    loading: isLoading,

    // Methods
    navigate,
    start,
    link,
    outlet,
    use,
    beforeEach,
    beforeResolve,
    afterEach,
    back,
    forward,
    go,

    // Route inspection
    isActive,
    getMatchedRoutes,

    // Utils
    matchRoute,
    parseQuery
  };

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

export default {
  createRouter,
  simpleRouter,
  lazy,
  preload,
  matchRoute,
  parseQuery
};
