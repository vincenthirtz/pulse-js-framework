/**
 * Pulse Router Tests
 *
 * Tests for runtime/router.js - SPA routing system
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/router
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

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

// =============================================================================
// Route Matching Tests
// =============================================================================

describe('Route Matching Tests', () => {
  beforeEach(resetHistory);

  test('matches simple path', () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/about': () => el('div', 'About')
      }
    });

    const match = router.matchRoute('/', '/');
    assert.ok(match !== null, 'Should match /');
    assert.deepStrictEqual(match, {}, 'Should have empty params');
  });

  test('matches path with single param', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('/users/:id', '/users/123');

    assert.ok(match !== null, 'Should match /users/:id');
    assert.strictEqual(match.id, '123', 'Should extract id param');
  });

  test('matches path with multiple params', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('/users/:userId/posts/:postId', '/users/42/posts/99');

    assert.ok(match !== null, 'Should match path with multiple params');
    assert.strictEqual(match.userId, '42', 'Should extract userId');
    assert.strictEqual(match.postId, '99', 'Should extract postId');
  });

  test('matches wildcard path', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('/files/*path', '/files/docs/readme.md');

    assert.ok(match !== null, 'Should match wildcard path');
    assert.strictEqual(match.path, 'docs/readme.md', 'Should capture wildcard');
  });

  test('matches catch-all route', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('*', '/any/path/here');

    assert.ok(match !== null, 'Should match any path with *');
  });

  test('does not match non-matching path', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('/users/:id', '/posts/123');

    assert.ok(match === null, 'Should not match different path');
  });

  test('decodes URI components in params', () => {
    const router = createRouter({ routes: {} });
    const match = router.matchRoute('/search/:query', '/search/hello%20world');

    assert.ok(match !== null, 'Should match');
    assert.strictEqual(match.query, 'hello world', 'Should decode URI components');
  });
});

// =============================================================================
// Query String Tests
// =============================================================================

describe('Query String Tests', () => {
  beforeEach(resetHistory);

  test('parses simple query string', () => {
    const router = createRouter({ routes: {} });
    const query = router.parseQuery('?name=John&age=30');

    assert.strictEqual(query.name, 'John', 'Should parse name');
    assert.strictEqual(query.age, '30', 'Should parse age');
  });

  test('parses query with multiple values for same key', () => {
    const router = createRouter({ routes: {} });
    const query = router.parseQuery('?tag=js&tag=css&tag=html');

    assert.ok(Array.isArray(query.tag), 'Should be array for multiple values');
    assert.strictEqual(query.tag.length, 3, 'Should have 3 values');
    assert.deepStrictEqual(query.tag, ['js', 'css', 'html'], 'Should have correct values');
  });

  test('parses empty query string', () => {
    const router = createRouter({ routes: {} });
    const query = router.parseQuery('');

    assert.deepStrictEqual(query, {}, 'Should return empty object');
  });
});

// =============================================================================
// Navigation Tests
// =============================================================================

describe('Navigation Tests', () => {
  beforeEach(resetHistory);

  test('navigates to path', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/about': () => el('div', 'About')
      }
    });
    router.start();

    await router.navigate('/about');

    assert.strictEqual(router.path.get(), '/about', 'Should update path');
  });

  test('navigates with query params', async () => {
    const router = createRouter({
      routes: {
        '/search': () => el('div', 'Search')
      }
    });
    router.start();

    await router.navigate('/search', { query: { q: 'test', page: '1' } });

    assert.strictEqual(router.path.get(), '/search', 'Should update path');
    assert.deepStrictEqual(router.query.get(), { q: 'test', page: '1' }, 'Should have query params');
  });

  test('extracts route params', async () => {
    const router = createRouter({
      routes: {
        '/users/:id': () => el('div', 'User')
      }
    });
    router.start();

    await router.navigate('/users/42');

    assert.strictEqual(router.params.get().id, '42', 'Should extract params');
  });

  test('navigate with replace option', async () => {
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

    assert.strictEqual(router.path.get(), '/contact', 'Should be on contact');
    // After replace, going back should go to home, not about
  });
});

// =============================================================================
// Route Meta Tests
// =============================================================================

describe('Route Meta Tests', () => {
  beforeEach(resetHistory);

  test('exposes route meta', async () => {
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

    assert.strictEqual(router.meta.get().requiresAuth, true, 'Should have requiresAuth meta');
    assert.strictEqual(router.meta.get().role, 'admin', 'Should have role meta');
  });
});

// =============================================================================
// Navigation Guards Tests
// =============================================================================

describe('Navigation Guards Tests', () => {
  beforeEach(resetHistory);

  test('beforeEach guard can block navigation', async () => {
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

    assert.strictEqual(result, false, 'Navigate should return false when blocked');
    assert.strictEqual(router.path.get(), '/', 'Should stay on home');
  });

  test('beforeEach guard can redirect', async () => {
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

    assert.strictEqual(router.path.get(), '/login', 'Should redirect to login');
  });

  test('beforeEach receives correct to/from context', async () => {
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

    assert.strictEqual(capturedTo.path, '/users/123', 'to.path should be correct');
    assert.strictEqual(capturedTo.params.id, '123', 'to.params should be correct');
    assert.strictEqual(capturedTo.query.tab, 'posts', 'to.query should be correct');
    assert.strictEqual(capturedTo.meta.title, 'User Page', 'to.meta should be correct');
    assert.strictEqual(capturedFrom.path, '/', 'from.path should be correct');
  });

  test('per-route beforeEnter guard', async () => {
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

    assert.ok(guardCalled, 'beforeEnter should be called');
    assert.strictEqual(router.path.get(), '/', 'Should not navigate');
  });

  test('beforeResolve runs after per-route guards', async () => {
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

    assert.deepStrictEqual(order, ['beforeEach', 'beforeEnter', 'beforeResolve'], 'Guards should run in order');
  });

  test('afterEach runs after navigation completes', async () => {
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

    assert.ok(afterCalled, 'afterEach should be called');
    assert.strictEqual(afterTo.path, '/about', 'afterEach should receive correct path');
  });

  test('guard unsubscribe works', async () => {
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
    assert.strictEqual(callCount, 1, 'Guard called once');

    unsubscribe();

    await router.navigate('/b');
    assert.strictEqual(callCount, 1, 'Guard not called after unsubscribe');
  });
});

// =============================================================================
// Redirect Tests
// =============================================================================

describe('Redirect Tests', () => {
  beforeEach(resetHistory);

  test('handles static redirect', async () => {
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

    assert.strictEqual(router.path.get(), '/new', 'Should redirect to new path');
  });

  test('handles dynamic redirect function', async () => {
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

    assert.strictEqual(router.path.get(), '/profile/42', 'Should redirect with params');
  });
});

// =============================================================================
// Nested Routes Tests
// =============================================================================

describe('Nested Routes Tests', () => {
  beforeEach(resetHistory);

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
    assert.ok(matches.length > 0, 'Should match nested route');
  });
});

// =============================================================================
// isActive Tests
// =============================================================================

describe('isActive Tests', () => {
  beforeEach(resetHistory);

  test('isActive with exact match', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/users': () => el('div', 'Users'),
        '/users/list': () => el('div', 'User List')
      }
    });
    router.start();

    await router.navigate('/users');

    assert.ok(router.isActive('/users', true), 'Should be active with exact match');
    assert.ok(!router.isActive('/users/list', true), 'Should not match different path');
  });

  test('isActive with prefix match', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/users': () => el('div', 'Users'),
        '/users/list': () => el('div', 'User List')
      }
    });
    router.start();

    await router.navigate('/users/list');

    assert.ok(router.isActive('/users'), 'Should match prefix');
    assert.ok(router.isActive('/users/list'), 'Should match exact');
    assert.ok(!router.isActive('/posts'), 'Should not match different prefix');
  });
});

// =============================================================================
// Hash Mode Tests
// =============================================================================

describe('Hash Mode Tests', () => {
  beforeEach(resetHistory);

  test('hash mode navigation', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/about': () => el('div', 'About')
      },
      mode: 'hash'
    });
    router.start();

    await router.navigate('/about');

    assert.strictEqual(router.path.get(), '/about', 'Should update path in hash mode');
  });
});

// =============================================================================
// Async/Lazy Routes Tests
// =============================================================================

describe('Async Routes Tests', () => {
  beforeEach(resetHistory);

  test('handles async route handler', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/lazy': () => Promise.resolve(() => el('div', 'Lazy'))
      }
    });
    router.start();

    assert.strictEqual(router.loading.get(), false, 'Should not be loading initially');

    await router.navigate('/lazy');

    assert.strictEqual(router.path.get(), '/lazy', 'Should navigate to lazy route');
  });
});

// =============================================================================
// Lazy Loading Tests
// =============================================================================

describe('Lazy Loading Tests', () => {
  beforeEach(resetHistory);

  test('lazy loads component on navigation', async () => {
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

    assert.strictEqual(loadCount, 1, 'Should load component once');
    assert.strictEqual(router.path.get(), '/lazy', 'Should be on lazy route');
  });

  test('lazy caches loaded component', async () => {
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
    assert.strictEqual(loadCount, 1, 'Should load on first navigation');

    // Navigate away
    await router.navigate('/');

    // Second navigation - should use cache
    await router.navigate('/cached');
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(loadCount, 1, 'Should not reload cached component');
  });

  test('lazy handles component with render method', async () => {
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

    assert.strictEqual(router.path.get(), '/render', 'Should navigate to render route');
    assert.ok(loaded, 'Should have loaded component');
  });

  test('lazy shows loading component with delay', async () => {
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

    assert.strictEqual(router.path.get(), '/loading', 'Should be on loading route');
  });

  test('lazy shows error component on failure', async () => {
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

    assert.ok(errorHandled, 'Should handle error with error component');
  });

  test('preload loads component without rendering', async () => {
    let loadCount = 0;
    const lazyComponent = lazy(() => {
      loadCount++;
      return Promise.resolve({
        default: () => el('div', 'Preloaded')
      });
    });

    // Preload without navigation
    await preload(lazyComponent);

    assert.strictEqual(loadCount, 1, 'Should load component during preload');

    // Now create router and navigate - should use cached component
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/preloaded': lazyComponent
      }
    });
    router.start();

    await router.navigate('/preloaded');
    assert.strictEqual(loadCount, 1, 'Should not reload after preload');
  });
});

// =============================================================================
// Middleware Tests
// =============================================================================

describe('Middleware Tests', () => {
  beforeEach(resetHistory);

  test('middleware runs on navigation', async () => {
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

    assert.ok(middlewareCalled, 'Middleware should be called');
    assert.strictEqual(router.path.get(), '/page', 'Should navigate to page');
  });

  test('middleware can abort navigation', async () => {
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

    assert.strictEqual(result, false, 'Navigation should be blocked');
    assert.strictEqual(router.path.get(), '/', 'Should stay on home');
  });

  test('middleware can redirect', async () => {
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

    assert.strictEqual(router.path.get(), '/login', 'Should redirect to login');
  });

  test('middleware runs in order', async () => {
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

    assert.deepStrictEqual(order, [
      'first-before',
      'second-before',
      'second-after',
      'first-after'
    ], 'Middleware should run in Koa-style order');
  });

  test('middleware receives correct context', async () => {
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

    assert.strictEqual(capturedCtx.to.path, '/users/42', 'Should have correct path');
    assert.strictEqual(capturedCtx.to.params.id, '42', 'Should have params');
    assert.strictEqual(capturedCtx.to.query.tab, 'profile', 'Should have query');
    assert.strictEqual(capturedCtx.to.meta.title, 'User Page', 'Should have meta');
    assert.ok(typeof capturedCtx.redirect === 'function', 'Should have redirect function');
    assert.ok(typeof capturedCtx.abort === 'function', 'Should have abort function');
  });

  test('middleware can share metadata', async () => {
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

    assert.ok(sharedMeta.startTime !== undefined, 'Should have shared startTime');
    assert.strictEqual(sharedMeta.user, 'testuser', 'Should have shared user');
  });

  test('use() adds middleware dynamically', async () => {
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

    assert.ok(dynamicMiddlewareCalled, 'Dynamic middleware should be called');
  });

  test('use() returns unsubscribe function', async () => {
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
    assert.strictEqual(callCount, 1, 'Should be called once');

    // Unsubscribe
    unsubscribe();

    await router.navigate('/b');
    assert.strictEqual(callCount, 1, 'Should not be called after unsubscribe');
  });

  test('middleware stops chain when not calling next', async () => {
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

    assert.ok(!secondMiddlewareCalled, 'Second middleware should not be called');
  });
});

// =============================================================================
// Router Edge Cases Tests
// =============================================================================

describe('Router Edge Cases Tests', () => {
  beforeEach(resetHistory);

  test('rapid navigation does not cause race conditions', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/a': () => el('div', 'A'),
        '/b': () => el('div', 'B'),
        '/c': () => el('div', 'C'),
        '/d': () => el('div', 'D')
      }
    });
    router.start();

    // Fire multiple navigations rapidly without awaiting
    const navPromises = [
      router.navigate('/a'),
      router.navigate('/b'),
      router.navigate('/c'),
      router.navigate('/d')
    ];

    await Promise.all(navPromises);

    // Should end up on the last requested route
    assert.strictEqual(router.path.get(), '/d', 'Should end on last route');
  });

  test('navigation during guard execution', async () => {
    let guardEnterCount = 0;

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/slow': () => el('div', 'Slow'),
        '/fast': () => el('div', 'Fast')
      }
    });
    router.start();

    router.beforeEach(async (to, from) => {
      guardEnterCount++;
      if (to.path === '/slow') {
        // Simulate slow guard
        await new Promise(r => setTimeout(r, 50));
      }
      return true;
    });

    // Start slow navigation
    const slowNav = router.navigate('/slow');

    // Immediately start fast navigation
    await router.navigate('/fast');

    // Wait for slow nav to complete
    await slowNav;

    // Should handle both navigations
    assert.ok(guardEnterCount >= 2, 'Guard should be called for both navigations');
  });

  test('back navigation after guard redirect', async () => {
    let isAuth = false;

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/login': () => el('div', 'Login'),
        '/protected': () => el('div', 'Protected')
      }
    });
    router.start();

    router.beforeEach((to, from) => {
      if (to.path === '/protected' && !isAuth) {
        return '/login';
      }
      return true;
    });

    // Try to access protected route
    await router.navigate('/protected');
    assert.strictEqual(router.path.get(), '/login', 'Should redirect to login');

    // Now authenticate and try again
    isAuth = true;
    await router.navigate('/protected');
    assert.strictEqual(router.path.get(), '/protected', 'Should access protected after auth');
  });

  test('circular redirect protection', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/a': { redirect: '/b' },
        '/b': { redirect: '/c' },
        '/c': () => el('div', 'C')
      }
    });
    router.start();

    // Should follow redirect chain
    await router.navigate('/a');

    // Should end up at /c (not infinite loop)
    assert.strictEqual(router.path.get(), '/c', 'Should follow redirect chain to /c');
  });

  test('query string edge cases', async () => {
    const router = createRouter({
      routes: {
        '/search': () => el('div', 'Search')
      }
    });
    router.start();

    // Empty query
    await router.navigate('/search', { query: {} });
    assert.deepStrictEqual(router.query.get(), {}, 'Empty query should work');

    // Special characters in query
    await router.navigate('/search', { query: { q: 'hello world', special: 'a&b=c' } });
    assert.strictEqual(router.query.get().q, 'hello world', 'Should handle spaces');

    // Array values
    await router.navigate('/search', { query: { tags: ['a', 'b', 'c'] } });
    // Note: behavior depends on implementation
  });

  test('route params with special characters', async () => {
    const router = createRouter({
      routes: {
        '/users/:id': () => el('div', 'User')
      }
    });
    router.start();

    // Encoded special characters
    await router.navigate('/users/user%40example.com');
    assert.strictEqual(router.params.get().id, 'user@example.com', 'Should decode URI components');
  });

  test('wildcard route captures remaining path', async () => {
    const router = createRouter({
      routes: {
        '/files/*path': () => el('div', 'Files')
      }
    });
    router.start();

    await router.navigate('/files/documents/reports/2024/q1.pdf');
    assert.strictEqual(router.params.get().path, 'documents/reports/2024/q1.pdf', 'Should capture full path');
  });

  test('navigation to same route with different query', async () => {
    let renderCount = 0;

    const router = createRouter({
      routes: {
        '/search': () => {
          renderCount++;
          return el('div', 'Search');
        }
      }
    });
    router.start();

    await router.navigate('/search', { query: { q: 'first' } });
    assert.strictEqual(router.query.get().q, 'first');

    await router.navigate('/search', { query: { q: 'second' } });
    assert.strictEqual(router.query.get().q, 'second');
  });

  test('navigation to same route with different params', async () => {
    const router = createRouter({
      routes: {
        '/users/:id': () => el('div', 'User')
      }
    });
    router.start();

    await router.navigate('/users/1');
    assert.strictEqual(router.params.get().id, '1');

    await router.navigate('/users/2');
    assert.strictEqual(router.params.get().id, '2');
  });
});

// =============================================================================
// Lazy Loading Edge Cases Tests
// =============================================================================

describe('Lazy Loading Edge Cases Tests', () => {
  beforeEach(resetHistory);

  test('lazy loading abort on rapid navigation', async () => {
    let loadStartCount = 0;
    let loadCompleteCount = 0;

    const slowLazy = lazy(() => {
      loadStartCount++;
      return new Promise(resolve => {
        setTimeout(() => {
          loadCompleteCount++;
          resolve({ default: () => el('div', 'Slow') });
        }, 100);
      });
    });

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/slow': slowLazy,
        '/fast': () => el('div', 'Fast')
      }
    });
    router.start();

    const container = document.createElement('div');
    router.outlet(container);

    // Start navigating to slow route
    const slowNav = router.navigate('/slow');

    // Quickly navigate away
    await new Promise(r => setTimeout(r, 10));
    await router.navigate('/fast');

    // Wait for slow to complete
    await slowNav;

    assert.strictEqual(router.path.get(), '/fast', 'Should end on fast route');
    assert.strictEqual(loadStartCount, 1, 'Should have started loading');
  });

  test('lazy loading with timeout', async () => {
    let errorShown = false;

    const timeoutLazy = lazy(
      () => new Promise(resolve => {
        // Never resolves - simulates timeout
        setTimeout(() => resolve({ default: () => el('div', 'Late') }), 5000);
      }),
      {
        timeout: 50,
        error: (err) => {
          errorShown = true;
          return el('div.error', 'Timeout');
        }
      }
    );

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/timeout': timeoutLazy
      }
    });
    router.start();

    const container = document.createElement('div');
    router.outlet(container);

    await router.navigate('/timeout');

    // Wait for timeout
    await new Promise(r => setTimeout(r, 100));

    // Error component should be shown
    assert.ok(errorShown, 'Error should be shown after timeout');
  });

  test('lazy loading retry after error', async () => {
    let attempts = 0;

    const retryLazy = lazy(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Simulated failure'));
      }
      return Promise.resolve({ default: () => el('div', 'Success') });
    }, {
      error: (err) => el('div.error', err.message)
    });

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/retry': retryLazy
      }
    });
    router.start();

    const container = document.createElement('div');
    router.outlet(container);

    // First attempt should fail
    await router.navigate('/retry');
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(attempts, 1, 'First attempt made');
  });

  test('lazy caches component even when navigation is aborted', async () => {
    let loadCount = 0;
    let resolveLoad;
    const loadPromise = new Promise(resolve => { resolveLoad = resolve; });

    const lazyComponent = lazy(() => {
      loadCount++;
      return loadPromise;
    }, {
      loading: () => el('div.loading', 'Loading...')
    });

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/lazy': lazyComponent,
        '/other': () => el('div', 'Other')
      }
    });
    router.start();

    const container = document.createElement('div');
    router.outlet(container);

    // First navigation starts loading
    const navPromise = router.navigate('/lazy');

    // Wait a bit then navigate away BEFORE load completes
    await new Promise(r => setTimeout(r, 10));
    await router.navigate('/other');

    // Now complete the load (after navigation away)
    resolveLoad({ default: () => el('div.lazy-loaded', 'Loaded!') });
    await navPromise;
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(loadCount, 1, 'Should have loaded once');

    // Navigate back to the lazy route - should NOT trigger reload
    await router.navigate('/lazy');
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(loadCount, 1, 'Should use cached component, not reload');
    assert.strictEqual(router.path.get(), '/lazy', 'Should be on lazy route');
  });

  test('multiple lazy routes loading concurrently', async () => {
    let aLoaded = false;
    let bLoaded = false;

    const lazyA = lazy(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          aLoaded = true;
          resolve({ default: () => el('div', 'A') });
        }, 50);
      });
    });

    const lazyB = lazy(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          bLoaded = true;
          resolve({ default: () => el('div', 'B') });
        }, 50);
      });
    });

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/a': lazyA,
        '/b': lazyB
      }
    });
    router.start();

    const container = document.createElement('div');
    router.outlet(container);

    // Navigate to both routes
    await router.navigate('/a');
    await new Promise(r => setTimeout(r, 100));
    assert.ok(aLoaded, 'A should be loaded');

    await router.navigate('/b');
    await new Promise(r => setTimeout(r, 100));
    assert.ok(bLoaded, 'B should be loaded');
  });
});

// =============================================================================
// Navigation Stress Tests
// =============================================================================

describe('Navigation Stress Tests', () => {
  beforeEach(resetHistory);

  test('stress test: 100 sequential navigations', async () => {
    const routes = {};
    for (let i = 0; i < 100; i++) {
      routes[`/page${i}`] = () => el('div', `Page ${i}`);
    }

    const router = createRouter({ routes });
    router.start();

    for (let i = 0; i < 100; i++) {
      await router.navigate(`/page${i}`);
    }

    assert.strictEqual(router.path.get(), '/page99', 'Should end on last page');
  });

  test('stress test: rapid back/forward simulation', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/a': () => el('div', 'A'),
        '/b': () => el('div', 'B'),
        '/c': () => el('div', 'C')
      }
    });
    router.start();

    // Build history
    await router.navigate('/a');
    await router.navigate('/b');
    await router.navigate('/c');

    // Simulate rapid back/forward
    for (let i = 0; i < 10; i++) {
      window.history.back();
      await new Promise(r => setTimeout(r, 5));
      window.history.forward();
      await new Promise(r => setTimeout(r, 5));
    }

    // Should not crash
    assert.ok(true, 'Rapid back/forward should not crash');
  });

  test('navigation with very long paths', async () => {
    const longSegment = 'a'.repeat(100);
    const longPath = `/${longSegment}/${longSegment}/${longSegment}`;

    const router = createRouter({
      routes: {
        [longPath]: () => el('div', 'Long')
      }
    });
    router.start();

    await router.navigate(longPath);
    assert.strictEqual(router.path.get(), longPath, 'Should handle long paths');
  });

  test('navigation with unicode characters', async () => {
    const router = createRouter({
      routes: {
        '/émojis': () => el('div', 'Emojis'),
        '/中文': () => el('div', 'Chinese')
      }
    });
    router.start();

    await router.navigate('/émojis');
    assert.strictEqual(router.path.get(), '/émojis', 'Should handle accented characters');
  });

  test('guard that throws error is handled gracefully', async () => {
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/error': () => el('div', 'Error')
      }
    });
    router.start();

    router.beforeEach((to, from) => {
      if (to.path === '/error') {
        throw new Error('Guard error');
      }
      return true;
    });

    // Should handle error gracefully
    try {
      await router.navigate('/error');
    } catch (e) {
      // Expected
    }

    // Should still be functional
    await router.navigate('/');
    assert.strictEqual(router.path.get(), '/', 'Router should recover from guard error');
  });
});

// =============================================================================
// Scroll Persistence Tests
// =============================================================================

describe('Scroll Persistence Tests', () => {
  // Mock sessionStorage
  const mockSessionStorage = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value; },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; }
    };
  })();

  // Set mock sessionStorage on window and global
  mockWindow.sessionStorage = mockSessionStorage;
  global.sessionStorage = mockSessionStorage;

  beforeEach(resetHistory);

  test('router saves scroll position to sessionStorage when persistScroll is enabled', async () => {
    mockSessionStorage.clear();

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/about': () => el('div', 'About')
      },
      persistScroll: true,
      persistScrollKey: 'test-scroll'
    });
    router.start();

    // Mock scroll position
    mockWindow.scrollX = 100;
    mockWindow.scrollY = 200;

    await router.navigate('/about');

    // Check sessionStorage was updated
    const stored = mockSessionStorage.getItem('test-scroll');
    assert.ok(stored !== null, 'Should save to sessionStorage');

    const parsed = JSON.parse(stored);
    assert.strictEqual(parsed['/'].x, 100, 'Should save scrollX');
    assert.strictEqual(parsed['/'].y, 200, 'Should save scrollY');
  });

  test('router restores scroll positions from sessionStorage on creation', async () => {
    // Pre-populate sessionStorage
    mockSessionStorage.setItem('test-scroll-restore', JSON.stringify({
      '/page1': { x: 50, y: 150 },
      '/page2': { x: 0, y: 500 }
    }));

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/page1': () => el('div', 'Page 1'),
        '/page2': () => el('div', 'Page 2')
      },
      persistScroll: true,
      persistScrollKey: 'test-scroll-restore'
    });
    router.start();

    // Navigate to page1 and back - scroll should be restored
    await router.navigate('/page1');
    await router.navigate('/');
    await router.navigate('/page1');

    // The scroll positions are restored via handleScroll internally
    // We can verify by checking that navigate completes without error
    assert.strictEqual(router.path.get(), '/page1', 'Should navigate correctly');
  });

  test('router handles invalid sessionStorage data gracefully', async () => {
    // Set invalid JSON
    mockSessionStorage.setItem('test-invalid', 'not valid json');

    // Should not throw
    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home')
      },
      persistScroll: true,
      persistScrollKey: 'test-invalid'
    });
    router.start();

    assert.strictEqual(router.path.get(), '/', 'Router should work despite invalid storage');
  });

  test('router handles missing sessionStorage gracefully', async () => {
    // Create router without sessionStorage available
    const originalStorage = mockWindow.sessionStorage;
    delete mockWindow.sessionStorage;

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/about': () => el('div', 'About')
      },
      persistScroll: true
    });
    router.start();

    await router.navigate('/about');

    // Should work without throwing
    assert.strictEqual(router.path.get(), '/about', 'Should navigate without sessionStorage');

    // Restore
    mockWindow.sessionStorage = originalStorage;
  });
});
