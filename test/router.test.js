/**
 * Pulse Router Tests
 *
 * Tests for runtime/router.js - SPA routing system
 *
 * @module test/router
 */

import { parseHTML } from 'linkedom';
import { createMockWindow } from './utils.js';

// Setup DOM environment first
const { document: linkedomDocument } = parseHTML('<!DOCTYPE html><html><body><div id="app"></div></body></html>');

// Create mock window with history API
const { window: mockWindow, resetHistory } = createMockWindow(linkedomDocument);

// Set globals before importing router
global.window = mockWindow;
global.document = linkedomDocument;
global.Node = mockWindow.Node;

// Import router after mocks are set up
import { createRouter, simpleRouter } from '../runtime/router.js';
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
// Run Async Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
