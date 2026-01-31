/**
 * Pulse Router Tests
 *
 * Tests for runtime/router.js - SPA routing system
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/router
 */

import { createDOM, createMockWindow } from './mock-dom.js';

// Setup DOM environment first
const { document: mockDocument, Node } = createDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');

// Create mock window with history API
const { window: mockWindow, resetHistory } = createMockWindow(mockDocument);

// Set globals before importing router
global.window = mockWindow;
global.document = mockDocument;
global.Node = Node;

// Import router after mocks are set up
import { createRouter, simpleRouter, lazy, preload } from '../runtime/router.js';
import { el } from '../runtime/dom.js';

// Import test utilities
import {
  test,
  testAsync,
  runAsyncTests,
  beforeEach,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// Reset history before each test
beforeEach(resetHistory);

// =============================================================================
// Route Matching Tests
// =============================================================================

printSection('Route Matching Tests');

test('matches simple path', () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/about': () => el('div', 'About')
    }
  });

  const match = router.matchRoute('/', '/');
  assert(match !== null, 'Should match /');
  assertDeepEqual(match, {}, 'Should have empty params');
});

test('matches path with single param', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('/users/:id', '/users/123');

  assert(match !== null, 'Should match /users/:id');
  assertEqual(match.id, '123', 'Should extract id param');
});

test('matches path with multiple params', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('/users/:userId/posts/:postId', '/users/42/posts/99');

  assert(match !== null, 'Should match path with multiple params');
  assertEqual(match.userId, '42', 'Should extract userId');
  assertEqual(match.postId, '99', 'Should extract postId');
});

test('matches wildcard path', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('/files/*path', '/files/docs/readme.md');

  assert(match !== null, 'Should match wildcard path');
  assertEqual(match.path, 'docs/readme.md', 'Should capture wildcard');
});

test('matches catch-all route', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('*', '/any/path/here');

  assert(match !== null, 'Should match any path with *');
});

test('does not match non-matching path', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('/users/:id', '/posts/123');

  assert(match === null, 'Should not match different path');
});

test('decodes URI components in params', () => {
  const router = createRouter({ routes: {} });
  const match = router.matchRoute('/search/:query', '/search/hello%20world');

  assert(match !== null, 'Should match');
  assertEqual(match.query, 'hello world', 'Should decode URI components');
});

// =============================================================================
// Query String Tests
// =============================================================================

printSection('Query String Tests');

test('parses simple query string', () => {
  const router = createRouter({ routes: {} });
  const query = router.parseQuery('?name=John&age=30');

  assertEqual(query.name, 'John', 'Should parse name');
  assertEqual(query.age, '30', 'Should parse age');
});

test('parses query with multiple values for same key', () => {
  const router = createRouter({ routes: {} });
  const query = router.parseQuery('?tag=js&tag=css&tag=html');

  assert(Array.isArray(query.tag), 'Should be array for multiple values');
  assertEqual(query.tag.length, 3, 'Should have 3 values');
  assertDeepEqual(query.tag, ['js', 'css', 'html'], 'Should have correct values');
});

test('parses empty query string', () => {
  const router = createRouter({ routes: {} });
  const query = router.parseQuery('');

  assertDeepEqual(query, {}, 'Should return empty object');
});

// =============================================================================
// Navigation Tests
// =============================================================================

printSection('Navigation Tests');

testAsync('navigates to path', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/about': () => el('div', 'About')
    }
  });
  router.start();

  await router.navigate('/about');

  assertEqual(router.path.get(), '/about', 'Should update path');
});

testAsync('navigates with query params', async () => {
  const router = createRouter({
    routes: {
      '/search': () => el('div', 'Search')
    }
  });
  router.start();

  await router.navigate('/search', { query: { q: 'test', page: '1' } });

  assertEqual(router.path.get(), '/search', 'Should update path');
  assertDeepEqual(router.query.get(), { q: 'test', page: '1' }, 'Should have query params');
});

testAsync('extracts route params', async () => {
  const router = createRouter({
    routes: {
      '/users/:id': () => el('div', 'User')
    }
  });
  router.start();

  await router.navigate('/users/42');

  assertEqual(router.params.get().id, '42', 'Should extract params');
});

testAsync('navigate with replace option', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/about': () => el('div', 'About'),
      '/contact': () => el('div', 'Contact')
    }
  });
  router.start();

  await router.navigate('/about');
  await router.navigate('/contact', { replace: true });

  assertEqual(router.path.get(), '/contact', 'Should be on contact');
  // After replace, going back should go to home, not about
});

// =============================================================================
// Route Meta Tests
// =============================================================================

printSection('Route Meta Tests');

testAsync('exposes route meta', async () => {
  const router = createRouter({
    routes: {
      '/admin': {
        handler: () => el('div', 'Admin'),
        meta: { requiresAuth: true, role: 'admin' }
      }
    }
  });
  router.start();

  await router.navigate('/admin');

  assertEqual(router.meta.get().requiresAuth, true, 'Should have requiresAuth meta');
  assertEqual(router.meta.get().role, 'admin', 'Should have role meta');
});

// =============================================================================
// Navigation Guards Tests
// =============================================================================

printSection('Navigation Guards Tests');

testAsync('beforeEach guard can block navigation', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/admin': () => el('div', 'Admin')
    }
  });
  router.start();

  router.beforeEach((to, from) => {
    if (to.path === '/admin') return false;
    return true;
  });

  const result = await router.navigate('/admin');

  assertEqual(result, false, 'Navigate should return false when blocked');
  assertEqual(router.path.get(), '/', 'Should stay on home');
});

testAsync('beforeEach guard can redirect', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/login': () => el('div', 'Login'),
      '/dashboard': () => el('div', 'Dashboard')
    }
  });
  router.start();

  let isLoggedIn = false;
  router.beforeEach((to, from) => {
    if (to.path === '/dashboard' && !isLoggedIn) {
      return '/login';
    }
    return true;
  });

  await router.navigate('/dashboard');

  assertEqual(router.path.get(), '/login', 'Should redirect to login');
});

testAsync('beforeEach receives correct to/from context', async () => {
  let capturedTo = null;
  let capturedFrom = null;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/users/:id': {
        handler: () => el('div', 'User'),
        meta: { title: 'User Page' }
      }
    }
  });
  router.start();

  router.beforeEach((to, from) => {
    capturedTo = to;
    capturedFrom = from;
    return true;
  });

  await router.navigate('/users/123', { query: { tab: 'posts' } });

  assertEqual(capturedTo.path, '/users/123', 'to.path should be correct');
  assertEqual(capturedTo.params.id, '123', 'to.params should be correct');
  assertEqual(capturedTo.query.tab, 'posts', 'to.query should be correct');
  assertEqual(capturedTo.meta.title, 'User Page', 'to.meta should be correct');
  assertEqual(capturedFrom.path, '/', 'from.path should be correct');
});

testAsync('per-route beforeEnter guard', async () => {
  let guardCalled = false;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/protected': {
        handler: () => el('div', 'Protected'),
        beforeEnter: (to, from) => {
          guardCalled = true;
          return false;
        }
      }
    }
  });
  router.start();

  await router.navigate('/protected');

  assert(guardCalled, 'beforeEnter should be called');
  assertEqual(router.path.get(), '/', 'Should not navigate');
});

testAsync('beforeResolve runs after per-route guards', async () => {
  const order = [];

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': {
        handler: () => el('div', 'Page'),
        beforeEnter: () => {
          order.push('beforeEnter');
          return true;
        }
      }
    }
  });
  router.start();

  router.beforeEach(() => {
    order.push('beforeEach');
    return true;
  });

  router.beforeResolve(() => {
    order.push('beforeResolve');
    return true;
  });

  await router.navigate('/page');

  assertDeepEqual(order, ['beforeEach', 'beforeEnter', 'beforeResolve'], 'Guards should run in order');
});

testAsync('afterEach runs after navigation completes', async () => {
  let afterCalled = false;
  let afterTo = null;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/about': () => el('div', 'About')
    }
  });
  router.start();

  router.afterEach((to) => {
    afterCalled = true;
    afterTo = to;
  });

  await router.navigate('/about');

  assert(afterCalled, 'afterEach should be called');
  assertEqual(afterTo.path, '/about', 'afterEach should receive correct path');
});

testAsync('guard unsubscribe works', async () => {
  let callCount = 0;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/a': () => el('div', 'A'),
      '/b': () => el('div', 'B')
    }
  });
  router.start();

  const unsubscribe = router.beforeEach(() => {
    callCount++;
    return true;
  });

  await router.navigate('/a');
  assertEqual(callCount, 1, 'Guard called once');

  unsubscribe();

  await router.navigate('/b');
  assertEqual(callCount, 1, 'Guard not called after unsubscribe');
});

// =============================================================================
// Redirect Tests
// =============================================================================

printSection('Redirect Tests');

testAsync('handles static redirect', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/old': {
        redirect: '/new'
      },
      '/new': () => el('div', 'New')
    }
  });
  router.start();

  await router.navigate('/old');

  assertEqual(router.path.get(), '/new', 'Should redirect to new path');
});

testAsync('handles dynamic redirect function', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/user/:id': {
        redirect: ({ params }) => `/profile/${params.id}`
      },
      '/profile/:id': () => el('div', 'Profile')
    }
  });
  router.start();

  await router.navigate('/user/42');

  assertEqual(router.path.get(), '/profile/42', 'Should redirect with params');
});

// =============================================================================
// Nested Routes Tests
// =============================================================================

printSection('Nested Routes Tests');

test('compiles nested routes', () => {
  const router = createRouter({
    routes: {
      '/admin': {
        handler: () => el('div', 'Admin'),
        children: {
          '/users': () => el('div', 'Admin Users'),
          '/settings': () => el('div', 'Admin Settings')
        }
      }
    }
  });

  // Check that nested routes are compiled
  const matches = router.getMatchedRoutes('/admin/users');
  assert(matches.length > 0, 'Should match nested route');
});

// =============================================================================
// isActive Tests
// =============================================================================

printSection('isActive Tests');

testAsync('isActive with exact match', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/users': () => el('div', 'Users'),
      '/users/list': () => el('div', 'User List')
    }
  });
  router.start();

  await router.navigate('/users');

  assert(router.isActive('/users', true), 'Should be active with exact match');
  assert(!router.isActive('/users/list', true), 'Should not match different path');
});

testAsync('isActive with prefix match', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/users': () => el('div', 'Users'),
      '/users/list': () => el('div', 'User List')
    }
  });
  router.start();

  await router.navigate('/users/list');

  assert(router.isActive('/users'), 'Should match prefix');
  assert(router.isActive('/users/list'), 'Should match exact');
  assert(!router.isActive('/posts'), 'Should not match different prefix');
});

// =============================================================================
// Hash Mode Tests
// =============================================================================

printSection('Hash Mode Tests');

testAsync('hash mode navigation', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/about': () => el('div', 'About')
    },
    mode: 'hash'
  });
  router.start();

  await router.navigate('/about');

  assertEqual(router.path.get(), '/about', 'Should update path in hash mode');
});

// =============================================================================
// Async/Lazy Routes Tests
// =============================================================================

printSection('Async Routes Tests');

testAsync('handles async route handler', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/lazy': () => Promise.resolve(() => el('div', 'Lazy'))
    }
  });
  router.start();

  assertEqual(router.loading.get(), false, 'Should not be loading initially');

  await router.navigate('/lazy');

  assertEqual(router.path.get(), '/lazy', 'Should navigate to lazy route');
});

// =============================================================================
// Lazy Loading Tests
// =============================================================================

printSection('Lazy Loading Tests');

testAsync('lazy loads component on navigation', async () => {
  let loadCount = 0;
  let loadResolve;
  const loadPromise = new Promise(resolve => { loadResolve = resolve; });

  const lazyComponent = lazy(() => {
    loadCount++;
    loadResolve();
    return Promise.resolve({
      default: () => el('div.lazy-content', 'Loaded!')
    });
  });

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/lazy': lazyComponent
    }
  });
  router.start();

  // Need to render via outlet for handler to be called
  const container = document.createElement('div');
  router.outlet(container);

  await router.navigate('/lazy');
  await loadPromise;

  assertEqual(loadCount, 1, 'Should load component once');
  assertEqual(router.path.get(), '/lazy', 'Should be on lazy route');
});

testAsync('lazy caches loaded component', async () => {
  let loadCount = 0;

  const lazyComponent = lazy(() => {
    loadCount++;
    return Promise.resolve({
      default: () => el('div', 'Cached')
    });
  });

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/cached': lazyComponent
    }
  });
  router.start();

  // Need to render via outlet for handler to be called
  const container = document.createElement('div');
  router.outlet(container);

  // First navigation
  await router.navigate('/cached');
  // Wait for lazy load to complete
  await new Promise(r => setTimeout(r, 50));
  assertEqual(loadCount, 1, 'Should load on first navigation');

  // Navigate away
  await router.navigate('/');

  // Second navigation - should use cache
  await router.navigate('/cached');
  await new Promise(r => setTimeout(r, 50));
  assertEqual(loadCount, 1, 'Should not reload cached component');
});

testAsync('lazy handles component with render method', async () => {
  let loaded = false;
  const lazyComponent = lazy(() => {
    loaded = true;
    return Promise.resolve({
      default: {
        render: () => el('div.rendered', 'Rendered!')
      }
    });
  });

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/render': lazyComponent
    }
  });
  router.start();

  const container = document.createElement('div');
  router.outlet(container);

  await router.navigate('/render');
  await new Promise(r => setTimeout(r, 50));

  assertEqual(router.path.get(), '/render', 'Should navigate to render route');
  assert(loaded, 'Should have loaded component');
});

testAsync('lazy shows loading component with delay', async () => {
  let resolveLoad;
  const loadPromise = new Promise(resolve => { resolveLoad = resolve; });

  const lazyComponent = lazy(
    () => loadPromise,
    {
      loading: () => el('div.loading', 'Loading...'),
      delay: 0 // No delay for testing
    }
  );

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/loading': lazyComponent
    }
  });
  router.start();

  const container = document.createElement('div');
  router.outlet(container);

  // Start navigation but don't resolve yet
  const navPromise = router.navigate('/loading');

  // Give time for loading component to appear
  await new Promise(r => setTimeout(r, 50));

  // Resolve the load
  resolveLoad({ default: () => el('div.loaded', 'Loaded!') });
  await navPromise;

  assertEqual(router.path.get(), '/loading', 'Should be on loading route');
});

testAsync('lazy shows error component on failure', async () => {
  let errorHandled = false;
  const lazyComponent = lazy(
    () => Promise.reject(new Error('Load failed')),
    {
      error: (err) => {
        errorHandled = true;
        return el('div.error', `Error: ${err.message}`);
      }
    }
  );

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/error': lazyComponent
    }
  });
  router.start();

  // Need to render via outlet for handler to be called
  const container = document.createElement('div');
  router.outlet(container);

  await router.navigate('/error');

  // Give time for error handling
  await new Promise(r => setTimeout(r, 100));

  assert(errorHandled, 'Should handle error with error component');
});

testAsync('preload loads component without rendering', async () => {
  let loadCount = 0;
  const lazyComponent = lazy(() => {
    loadCount++;
    return Promise.resolve({
      default: () => el('div', 'Preloaded')
    });
  });

  // Preload without navigation
  await preload(lazyComponent);

  assertEqual(loadCount, 1, 'Should load component during preload');

  // Now create router and navigate - should use cached component
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/preloaded': lazyComponent
    }
  });
  router.start();

  await router.navigate('/preloaded');
  assertEqual(loadCount, 1, 'Should not reload after preload');
});

// =============================================================================
// Middleware Tests
// =============================================================================

printSection('Middleware Tests');

testAsync('middleware runs on navigation', async () => {
  let middlewareCalled = false;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': () => el('div', 'Page')
    },
    middleware: [
      async (ctx, next) => {
        middlewareCalled = true;
        await next();
      }
    ]
  });
  router.start();

  await router.navigate('/page');

  assert(middlewareCalled, 'Middleware should be called');
  assertEqual(router.path.get(), '/page', 'Should navigate to page');
});

testAsync('middleware can abort navigation', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/blocked': () => el('div', 'Blocked')
    },
    middleware: [
      async (ctx, next) => {
        if (ctx.to.path === '/blocked') {
          ctx.abort();
          return;
        }
        await next();
      }
    ]
  });
  router.start();

  const result = await router.navigate('/blocked');

  assertEqual(result, false, 'Navigation should be blocked');
  assertEqual(router.path.get(), '/', 'Should stay on home');
});

testAsync('middleware can redirect', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/protected': () => el('div', 'Protected'),
      '/login': () => el('div', 'Login')
    },
    middleware: [
      async (ctx, next) => {
        if (ctx.to.path === '/protected') {
          ctx.redirect('/login');
          return;
        }
        await next();
      }
    ]
  });
  router.start();

  await router.navigate('/protected');

  assertEqual(router.path.get(), '/login', 'Should redirect to login');
});

testAsync('middleware runs in order', async () => {
  const order = [];

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': () => el('div', 'Page')
    },
    middleware: [
      async (ctx, next) => {
        order.push('first-before');
        await next();
        order.push('first-after');
      },
      async (ctx, next) => {
        order.push('second-before');
        await next();
        order.push('second-after');
      }
    ]
  });
  router.start();

  await router.navigate('/page');

  assertDeepEqual(order, [
    'first-before',
    'second-before',
    'second-after',
    'first-after'
  ], 'Middleware should run in Koa-style order');
});

testAsync('middleware receives correct context', async () => {
  let capturedCtx = null;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/users/:id': {
        handler: () => el('div', 'User'),
        meta: { title: 'User Page' }
      }
    },
    middleware: [
      async (ctx, next) => {
        capturedCtx = ctx;
        await next();
      }
    ]
  });
  router.start();

  await router.navigate('/users/42', { query: { tab: 'profile' } });

  assertEqual(capturedCtx.to.path, '/users/42', 'Should have correct path');
  assertEqual(capturedCtx.to.params.id, '42', 'Should have params');
  assertEqual(capturedCtx.to.query.tab, 'profile', 'Should have query');
  assertEqual(capturedCtx.to.meta.title, 'User Page', 'Should have meta');
  assert(typeof capturedCtx.redirect === 'function', 'Should have redirect function');
  assert(typeof capturedCtx.abort === 'function', 'Should have abort function');
});

testAsync('middleware can share metadata', async () => {
  let sharedMeta = null;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': () => el('div', 'Page')
    },
    middleware: [
      async (ctx, next) => {
        ctx.meta.startTime = Date.now();
        ctx.meta.user = 'testuser';
        await next();
      },
      async (ctx, next) => {
        sharedMeta = ctx.meta;
        await next();
      }
    ]
  });
  router.start();

  await router.navigate('/page');

  assert(sharedMeta.startTime !== undefined, 'Should have shared startTime');
  assertEqual(sharedMeta.user, 'testuser', 'Should have shared user');
});

testAsync('use() adds middleware dynamically', async () => {
  let dynamicMiddlewareCalled = false;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': () => el('div', 'Page')
    }
  });
  router.start();

  // Add middleware dynamically
  router.use(async (ctx, next) => {
    dynamicMiddlewareCalled = true;
    await next();
  });

  await router.navigate('/page');

  assert(dynamicMiddlewareCalled, 'Dynamic middleware should be called');
});

testAsync('use() returns unsubscribe function', async () => {
  let callCount = 0;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/a': () => el('div', 'A'),
      '/b': () => el('div', 'B')
    }
  });
  router.start();

  const unsubscribe = router.use(async (ctx, next) => {
    callCount++;
    await next();
  });

  await router.navigate('/a');
  assertEqual(callCount, 1, 'Should be called once');

  // Unsubscribe
  unsubscribe();

  await router.navigate('/b');
  assertEqual(callCount, 1, 'Should not be called after unsubscribe');
});

testAsync('middleware stops chain when not calling next', async () => {
  let secondMiddlewareCalled = false;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/page': () => el('div', 'Page')
    },
    middleware: [
      async (ctx, next) => {
        // Don't call next()
        ctx.abort();
      },
      async (ctx, next) => {
        secondMiddlewareCalled = true;
        await next();
      }
    ]
  });
  router.start();

  await router.navigate('/page');

  assert(!secondMiddlewareCalled, 'Second middleware should not be called');
});

// =============================================================================
// Run Async Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
