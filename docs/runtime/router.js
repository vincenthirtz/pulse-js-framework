/**
 * Pulse Router - SPA routing system
 *
 * A simple but powerful router that integrates with Pulse reactivity
 */

import { pulse, effect, batch } from './pulse.js';
import { el, mount } from './dom.js';

/**
 * Parse a route pattern into a regex and extract param names
 * Supports: /users/:id, /posts/:id/comments, /files/*path
 */
function parsePattern(pattern) {
  const paramNames = [];
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
    base = ''
  } = options;

  // Reactive state
  const currentPath = pulse(getPath());
  const currentRoute = pulse(null);
  const currentParams = pulse({});
  const currentQuery = pulse({});
  const isLoading = pulse(false);

  // Compiled routes
  const compiledRoutes = [];
  for (const [pattern, handler] of Object.entries(routes)) {
    compiledRoutes.push({
      pattern,
      ...parsePattern(pattern),
      handler
    });
  }

  // Hooks
  const beforeHooks = [];
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
    const { replace = false, query = {} } = options;

    // Build full path with query
    let fullPath = path;
    const queryString = new URLSearchParams(query).toString();
    if (queryString) {
      fullPath += '?' + queryString;
    }

    // Run before hooks
    for (const hook of beforeHooks) {
      const result = await hook(path, currentPath.peek());
      if (result === false) return false;
      if (typeof result === 'string') {
        return navigate(result, options);
      }
    }

    // Update URL
    const url = mode === 'hash' ? `#${fullPath}` : `${base}${fullPath}`;
    if (replace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
    }

    // Update reactive state
    await updateRoute(path, parseQuery(queryString));

    return true;
  }

  /**
   * Update the current route state
   */
  async function updateRoute(path, query = {}) {
    const match = findRoute(path);

    batch(() => {
      currentPath.set(path);
      currentQuery.set(query);

      if (match) {
        currentRoute.set(match.route);
        currentParams.set(match.params);
      } else {
        currentRoute.set(null);
        currentParams.set({});
      }
    });

    // Run after hooks
    for (const hook of afterHooks) {
      await hook(path);
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
    loading: isLoading,

    // Methods
    navigate,
    start,
    link,
    outlet,
    beforeEach,
    afterEach,
    back,
    forward,
    go,

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
