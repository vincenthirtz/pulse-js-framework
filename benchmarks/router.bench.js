/**
 * Router Benchmarks - Pulse Framework
 *
 * Measures: route matching, query parsing/building, router initialization
 *
 * @module benchmarks/router
 */

import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { matchRoute, parseQuery, buildQueryString } from '../runtime/router/utils.js';
import { bench, suite } from './utils.js';

// Mock browser globals for createRouter
let createRouter;
try {
  // Provide minimal window/history stubs for Node.js
  if (typeof window === 'undefined') {
    globalThis.window = {
      location: { pathname: '/', search: '', hash: '#/', href: 'http://localhost/' },
      history: { pushState() {}, replaceState() {}, state: null },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {}
    };
    globalThis.addEventListener = globalThis.window.addEventListener;
    globalThis.removeEventListener = globalThis.window.removeEventListener;
  }
  const mod = await import('../runtime/router/core.js');
  createRouter = mod.createRouter;
} catch {
  // Router module not available
}

export async function runRouterBenchmarks() {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('Router', [
      // Route matching - static
      bench('matchRoute() static (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          matchRoute('/about', '/about');
          matchRoute('/dashboard/analytics', '/dashboard/analytics');
          matchRoute('/admin/users', '/admin/users');
        }
      }),

      // Route matching - dynamic params
      bench('matchRoute() dynamic params (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          matchRoute('/user/:id', '/user/123');
          matchRoute('/user/:id/posts/:postId', '/user/42/posts/99');
          matchRoute('/shop/:category/:product', '/shop/electronics/laptop');
        }
      }),

      // Route matching - wildcard
      bench('matchRoute() wildcard (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          matchRoute('/files/*', '/files/images/photo.jpg');
          matchRoute('/docs/*', '/docs/api/router/core');
          matchRoute('/assets/*', '/assets/css/main.css');
        }
      }),

      // Route matching - miss (no match)
      bench('matchRoute() miss (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          matchRoute('/user/:id', '/about');
          matchRoute('/blog/:slug', '/dashboard');
          matchRoute('/admin', '/user/123');
        }
      }),

      // Query parsing - simple
      bench('parseQuery() simple (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          parseQuery('a=1&b=2&c=3');
        }
      }),

      // Query parsing - complex
      bench('parseQuery() complex (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          parseQuery('page=1&limit=20&sort=name&order=asc&filter=active&search=hello%20world&lang=en&theme=dark&debug=true&v=2.0');
        }
      }),

      // Query building
      bench('buildQueryString() (1000x)', () => {
        const params = { page: 1, limit: 20, sort: 'name', order: 'asc', filter: 'active', search: 'hello world' };
        for (let i = 0; i < 1000; i++) {
          buildQueryString(params);
        }
      }),

      // Router initialization (requires createRouter)
      ...(createRouter ? [
        bench('createRouter() 30 routes', () => {
          const routes = {};
          const paths = [
            '/', '/about', '/contact', '/pricing', '/features',
            '/blog', '/blog/archive', '/blog/categories',
            '/docs', '/docs/getting-started', '/docs/api',
            '/dashboard', '/dashboard/analytics', '/dashboard/settings',
            '/user/:id', '/user/:id/posts', '/user/:id/posts/:postId',
            '/blog/:slug', '/blog/category/:category',
            '/api/v1/:resource', '/api/v1/:resource/:id',
            '/shop/:category/:product',
            '/admin', '/admin/users', '/admin/roles', '/admin/logs',
            '/files/*', '/docs/*', '/assets/*', '*'
          ];
          for (const path of paths) {
            routes[path] = () => null;
          }
          createRouter({ routes, mode: 'hash' });
        }, { iterations: 50 })
      ] : [])
    ]);
  } finally {
    resetAdapter();
    // Clean up window stub
    if (globalThis.window && globalThis.window.__benchmarkStub) {
      delete globalThis.window;
    }
  }
}
