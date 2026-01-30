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
 */

import { pulse, effect, batch } from './pulse.js';
import { el } from './dom.js';

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
    scrollBehavior = null // Function to control scroll restoration
  } = options;

  // Reactive state
  const currentPath = pulse(getPath());
  const currentRoute = pulse(null);
  const currentParams = pulse({});
  const currentQuery = pulse({});
  const currentMeta = pulse({});
  const isLoading = pulse(false);

  // Scroll positions for history
  const scrollPositions = new Map();

  // Compile routes (supports nested routes)
  const compiledRoutes = [];

  function compileRoutes(routeConfig, parentPath = '') {
    for (const [pattern, config] of Object.entries(routeConfig)) {
      const normalized = normalizeRoute(pattern, config);
      const fullPattern = parentPath + pattern;

      compiledRoutes.push({
        ...normalized,
        pattern: fullPattern,
        ...parsePattern(fullPattern)
      });

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
   * Find matching route
   */
  function findRoute(path) {
    for (const route of compiledRoutes) {
      const params = matchRoute(route.pattern, path);
      if (params !== null) {
        return { route, params };
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
        container.innerHTML = '';
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
  matchRoute,
  parseQuery
};
