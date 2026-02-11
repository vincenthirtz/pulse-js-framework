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
 * - Route aliases and redirects
 * - Typed query parameter parsing
 * - Route groups with shared layouts
 * - Navigation loading state
 * - Route transitions and lifecycle hooks (onBeforeLeave, onAfterEnter)
 */

import { pulse, effect, batch } from './pulse.js';
import { el } from './dom.js';
import { loggers } from './logger.js';
import { createVersionedAsync } from './async.js';
import { Errors } from './errors.js';
import { LRUCache } from './lru-cache.js';

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

  // Full format: pattern -> { handler, meta, beforeEnter, children, alias, layout, group }
  return {
    pattern,
    handler: config.handler || config.component,
    meta: config.meta || {},
    beforeEnter: config.beforeEnter || null,
    children: config.children || null,
    redirect: config.redirect || null,
    alias: config.alias || null,
    layout: config.layout || null,
    group: config.group || false
  };
}

/**
 * Build a query string from an object, supporting arrays and skipping null/undefined
 *
 * @param {Object} query - Query parameters object
 * @returns {string} Encoded query string (without leading ?)
 *
 * @example
 * buildQueryString({ q: 'hello world', tags: ['a', 'b'] })
 * // 'q=hello+world&tags=a&tags=b'
 *
 * buildQueryString({ a: 'x', b: null, c: undefined })
 * // 'a=x'
 */
function buildQueryString(query) {
  if (!query || typeof query !== 'object') return '';

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    // Skip null and undefined values
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      // Array values: ?tags=a&tags=b
      for (const item of value) {
        if (item !== null && item !== undefined) {
          params.append(key, String(item));
        }
      }
    } else {
      params.append(key, String(value));
    }
  }

  return params.toString();
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

// Query string validation limits
const QUERY_LIMITS = {
  maxTotalLength: 2048,     // 2KB max for entire query string
  maxValueLength: 1024,     // 1KB max per individual value
  maxParams: 50             // Maximum number of query parameters
};

/**
 * Parse a single query value into its typed representation
 * Only converts when parseQueryTypes is enabled
 *
 * @param {string} value - Raw string value
 * @returns {string|number|boolean} Typed value
 */
function parseTypedValue(value) {
  // Boolean detection
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number detection (strict: only numeric strings, not hex/octal/empty)
  if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
    const num = Number(value);
    if (isFinite(num)) return num;
  }

  return value;
}

/**
 * Parse query string into object with validation
 *
 * SECURITY: Enforces hard limits BEFORE parsing to prevent DoS attacks.
 * - Max total length: 2KB
 * - Max value length: 1KB
 * - Max parameters: 50
 *
 * @param {string} search - Query string (with or without leading ?)
 * @param {Object} [options] - Parsing options
 * @param {boolean} [options.typed=false] - Parse numbers and booleans from string values
 * @returns {Object} Parsed query parameters
 */
function parseQuery(search, options = {}) {
  if (!search) return {};

  const { typed = false } = options;

  // Remove leading ? if present
  let queryStr = search.startsWith('?') ? search.slice(1) : search;

  // SECURITY: Enforce hard limit BEFORE parsing to prevent DoS
  if (queryStr.length > QUERY_LIMITS.maxTotalLength) {
    log.warn(`Query string exceeds maximum length (${QUERY_LIMITS.maxTotalLength} chars). Truncating.`);
    queryStr = queryStr.slice(0, QUERY_LIMITS.maxTotalLength);
  }

  const params = new URLSearchParams(queryStr);
  const query = {};
  let paramCount = 0;

  for (const [key, value] of params) {
    // Check parameter count limit
    if (paramCount >= QUERY_LIMITS.maxParams) {
      log.warn(`Query string exceeds maximum parameters (${QUERY_LIMITS.maxParams}). Ignoring excess.`);
      break;
    }

    // Validate and potentially truncate value length
    let safeValue = value;
    if (value.length > QUERY_LIMITS.maxValueLength) {
      log.warn(`Query parameter "${key}" exceeds maximum length. Truncating.`);
      safeValue = value.slice(0, QUERY_LIMITS.maxValueLength);
    }

    // Apply typed parsing if enabled
    if (typed) {
      safeValue = parseTypedValue(safeValue);
    }

    if (key in query) {
      // Multiple values for same key
      if (Array.isArray(query[key])) {
        query[key].push(safeValue);
      } else {
        query[key] = [query[key], safeValue];
      }
    } else {
      query[key] = safeValue;
    }
    paramCount++;
  }
  return query;
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

  // Scroll positions for history (LRU cache to prevent memory leaks)
  // Keeps last 100 scroll positions - enough for typical navigation patterns
  const scrollPositions = new LRUCache(100);

  // Restore scroll positions from sessionStorage if persistence is enabled
  if (persistScroll && typeof sessionStorage !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(persistScrollKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore up to 100 most recent positions
        const entries = Object.entries(parsed).slice(-100);
        for (const [path, pos] of entries) {
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            scrollPositions.set(path, pos);
          }
        }
        log.debug(`Restored ${entries.length} scroll positions from sessionStorage`);
      }
    } catch (err) {
      log.warn('Failed to restore scroll positions from sessionStorage:', err.message);
    }
  }

  /**
   * Persist scroll positions to sessionStorage
   */
  function persistScrollPositions() {
    if (!persistScroll || typeof sessionStorage === 'undefined') return;

    try {
      const data = {};
      for (const [path, pos] of scrollPositions.entries()) {
        data[path] = pos;
      }
      sessionStorage.setItem(persistScrollKey, JSON.stringify(data));
    } catch (err) {
      // SessionStorage may be full or disabled
      log.warn('Failed to persist scroll positions:', err.message);
    }
  }

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

      // Issue #68: Route aliases — register alias as separate trie entry
      if (normalized.alias) {
        const aliasTarget = normalized.alias;
        // Create an alias route that resolves to the target's handler
        const aliasRoute = {
          ...route,
          pattern: aliasTarget,
          _isAlias: true,
          _aliasOf: fullPattern,
          ...parsePattern(aliasTarget)
        };
        compiledRoutes.push(aliasRoute);
        routeTrie.insert(aliasTarget, aliasRoute);
      }

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
      const currentFullPath = currentPath.peek();
      if (currentFullPath) {
        scrollPositions.set(currentFullPath, {
          x: window.scrollX,
          y: window.scrollY
        });
        persistScrollPositions();
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
      await updateRoute(path, parsedQuery, match);

      // Handle scroll behavior
      handleScroll(to, from, scrollPositions.get(path));

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
   * Handle scroll behavior after navigation
   */
  function handleScroll(to, from, savedPosition) {
    if (scrollBehavior) {
      let position;
      try {
        position = scrollBehavior(to, from, savedPosition);
      } catch (err) {
        loggers.router.warn(`scrollBehavior threw an error: ${err.message}`);
        // Fall back to default behavior
        window.scrollTo(0, 0);
        return;
      }

      // Validate position is a valid object
      if (position && typeof position === 'object') {
        if (typeof position.selector === 'string' && position.selector) {
          // Scroll to element
          try {
            const el = document.querySelector(position.selector);
            if (el) {
              const behavior = position.behavior === 'smooth' || position.behavior === 'auto'
                ? position.behavior
                : 'auto';
              el.scrollIntoView({ behavior });
            }
          } catch (err) {
            loggers.router.warn(`Invalid selector in scrollBehavior: ${position.selector}`);
          }
        } else if (typeof position.x === 'number' || typeof position.y === 'number') {
          const x = typeof position.x === 'number' && isFinite(position.x) ? position.x : 0;
          const y = typeof position.y === 'number' && isFinite(position.y) ? position.y : 0;
          const behavior = position.behavior === 'smooth' || position.behavior === 'auto'
            ? position.behavior
            : 'auto';
          window.scrollTo({ left: x, top: y, behavior });
        }
        // If position is object but no valid selector/x/y, do nothing (intentional no-scroll)
      }
      // If position is falsy (null/undefined/false), do nothing (intentional no-scroll)
    } else if (savedPosition) {
      // Default: restore saved position
      const x = typeof savedPosition.x === 'number' && isFinite(savedPosition.x) ? savedPosition.x : 0;
      const y = typeof savedPosition.y === 'number' && isFinite(savedPosition.y) ? savedPosition.y : 0;
      window.scrollTo(x, y);
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
   * Check if a route matches the given path
   */
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
   * Save current scroll and wait for popstate to fire
   * Used by back(), forward(), and go() to integrate with scroll restoration
   * @returns {Promise} Resolves after popstate fires or timeout
   */
  function saveScrollAndWaitForPopState() {
    // Save current scroll position
    const currentFullPath = currentPath.peek();
    if (currentFullPath) {
      scrollPositions.set(currentFullPath, {
        x: window.scrollX,
        y: window.scrollY
      });
      persistScrollPositions();
    }

    // Return a Promise that resolves on the next popstate (with 100ms fallback)
    return new Promise(resolve => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        window.removeEventListener('popstate', listener);
        resolve();
      };
      const listener = () => done();
      window.addEventListener('popstate', listener);
      setTimeout(done, 100);
    });
  }

  /**
   * Navigate back in browser history
   * Saves scroll position before navigating
   * @returns {Promise} Resolves after navigation completes
   * @example
   * await router.back(); // Go to previous page
   */
  function back() {
    const promise = saveScrollAndWaitForPopState();
    window.history.back();
    return promise;
  }

  /**
   * Navigate forward in browser history
   * Saves scroll position before navigating
   * @returns {Promise} Resolves after navigation completes
   * @example
   * await router.forward(); // Go to next page (if available)
   */
  function forward() {
    const promise = saveScrollAndWaitForPopState();
    window.history.forward();
    return promise;
  }

  /**
   * Navigate to a specific position in browser history
   * Saves scroll position before navigating
   * @param {number} delta - Number of entries to move (negative = back, positive = forward)
   * @returns {Promise} Resolves after navigation completes
   * @example
   * await router.go(-2); // Go back 2 pages
   * await router.go(1);  // Go forward 1 page
   */
  function go(delta) {
    const promise = saveScrollAndWaitForPopState();
    window.history.go(delta);
    return promise;
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
    back,
    forward,
    go,

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

export { buildQueryString, parseQuery, matchRoute };

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
