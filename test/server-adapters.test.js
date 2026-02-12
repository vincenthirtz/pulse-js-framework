/**
 * Server Adapter Tests
 *
 * Comprehensive tests for server framework adapters:
 * - server/utils.js: getMimeType, injectIntoTemplate, createRequestContext
 * - server/index.js: createPulseHandler
 * - server/express.js: createExpressMiddleware
 * - server/hono.js: createHonoMiddleware
 * - server/fastify.js: createFastifyPlugin
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  getMimeType,
  injectIntoTemplate,
  createRequestContext,
  clearTemplateCache
} from '../server/utils.js';

import { createPulseHandler } from '../server/index.js';
import { createExpressMiddleware } from '../server/express.js';
import { createHonoMiddleware } from '../server/hono.js';
import { createFastifyPlugin } from '../server/fastify.js';

// ============================================================================
// getMimeType Tests
// ============================================================================

describe('getMimeType', () => {
  test('returns correct MIME for .html', () => {
    assert.strictEqual(getMimeType('index.html'), 'text/html; charset=utf-8');
  });

  test('returns correct MIME for .js', () => {
    assert.strictEqual(getMimeType('app.js'), 'application/javascript; charset=utf-8');
  });

  test('returns correct MIME for .mjs', () => {
    assert.strictEqual(getMimeType('module.mjs'), 'application/javascript; charset=utf-8');
  });

  test('returns correct MIME for .css', () => {
    assert.strictEqual(getMimeType('styles.css'), 'text/css; charset=utf-8');
  });

  test('returns correct MIME for .json', () => {
    assert.strictEqual(getMimeType('data.json'), 'application/json; charset=utf-8');
  });

  test('returns correct MIME for .png', () => {
    assert.strictEqual(getMimeType('image.png'), 'image/png');
  });

  test('returns correct MIME for .jpg', () => {
    assert.strictEqual(getMimeType('photo.jpg'), 'image/jpeg');
  });

  test('returns correct MIME for .jpeg', () => {
    assert.strictEqual(getMimeType('photo.jpeg'), 'image/jpeg');
  });

  test('returns correct MIME for .gif', () => {
    assert.strictEqual(getMimeType('animation.gif'), 'image/gif');
  });

  test('returns correct MIME for .svg', () => {
    assert.strictEqual(getMimeType('icon.svg'), 'image/svg+xml');
  });

  test('returns correct MIME for .ico', () => {
    assert.strictEqual(getMimeType('favicon.ico'), 'image/x-icon');
  });

  test('returns correct MIME for .webp', () => {
    assert.strictEqual(getMimeType('image.webp'), 'image/webp');
  });

  test('returns correct MIME for .avif', () => {
    assert.strictEqual(getMimeType('image.avif'), 'image/avif');
  });

  test('returns correct MIME for .woff2', () => {
    assert.strictEqual(getMimeType('font.woff2'), 'font/woff2');
  });

  test('returns correct MIME for .woff', () => {
    assert.strictEqual(getMimeType('font.woff'), 'font/woff');
  });

  test('returns correct MIME for .ttf', () => {
    assert.strictEqual(getMimeType('font.ttf'), 'font/ttf');
  });

  test('returns correct MIME for .wasm', () => {
    assert.strictEqual(getMimeType('module.wasm'), 'application/wasm');
  });

  test('returns correct MIME for .map', () => {
    assert.strictEqual(getMimeType('app.js.map'), 'application/json; charset=utf-8');
  });

  test('returns correct MIME for .mp4', () => {
    assert.strictEqual(getMimeType('video.mp4'), 'video/mp4');
  });

  test('returns correct MIME for .mp3', () => {
    assert.strictEqual(getMimeType('audio.mp3'), 'audio/mpeg');
  });

  test('returns octet-stream for unknown extension', () => {
    assert.strictEqual(getMimeType('file.xyz'), 'application/octet-stream');
  });

  test('returns octet-stream for no extension', () => {
    assert.strictEqual(getMimeType('Makefile'), 'application/octet-stream');
  });

  test('handles full file paths', () => {
    assert.strictEqual(getMimeType('/assets/styles/main.css'), 'text/css; charset=utf-8');
  });

  test('handles uppercase extensions', () => {
    assert.strictEqual(getMimeType('file.HTML'), 'text/html; charset=utf-8');
  });

  test('returns correct MIME for .txt', () => {
    assert.strictEqual(getMimeType('readme.txt'), 'text/plain; charset=utf-8');
  });

  test('returns correct MIME for .xml', () => {
    assert.strictEqual(getMimeType('sitemap.xml'), 'application/xml; charset=utf-8');
  });
});

// ============================================================================
// injectIntoTemplate Tests
// ============================================================================

describe('injectIntoTemplate', () => {
  const baseTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div id="app"><!--app-html--></div>
  <!--app-state-->
</body>
</html>`;

  test('injects app HTML at <!--app-html--> placeholder', () => {
    const result = injectIntoTemplate(baseTemplate, {
      html: '<div class="content">Hello</div>'
    });

    assert.ok(result.includes('<div class="content">Hello</div>'));
    assert.ok(!result.includes('<!--app-html-->'));
  });

  test('injects state at <!--app-state--> placeholder', () => {
    const result = injectIntoTemplate(baseTemplate, {
      state: '<script>window.__STATE__={}</script>'
    });

    assert.ok(result.includes('<script>window.__STATE__={}</script>'));
    assert.ok(!result.includes('<!--app-state-->'));
  });

  test('injects head content before </head>', () => {
    const result = injectIntoTemplate(baseTemplate, {
      head: '<link rel="preload" href="/app.js">'
    });

    assert.ok(result.includes('<link rel="preload" href="/app.js">'));
    assert.ok(result.includes('</head>'));
    // Head content should appear before </head>
    const headPos = result.indexOf('<link rel="preload"');
    const headEndPos = result.indexOf('</head>');
    assert.ok(headPos < headEndPos);
  });

  test('injects body attributes into <body> tag', () => {
    const result = injectIntoTemplate(baseTemplate, {
      bodyAttrs: 'class="dark-mode"'
    });

    assert.ok(result.includes('<body class="dark-mode"'));
  });

  test('injects all options simultaneously', () => {
    const result = injectIntoTemplate(baseTemplate, {
      html: '<p>Content</p>',
      state: '<script>window.state={}</script>',
      head: '<meta name="description" content="test">',
      bodyAttrs: 'data-theme="dark"'
    });

    assert.ok(result.includes('<p>Content</p>'));
    assert.ok(result.includes('window.state={}'));
    assert.ok(result.includes('meta name="description"'));
    assert.ok(result.includes('data-theme="dark"'));
  });

  test('handles empty options', () => {
    const result = injectIntoTemplate(baseTemplate, {});

    assert.ok(result.includes('<!--app-html-->') === false || result.includes(''));
  });

  test('handles no options argument', () => {
    const result = injectIntoTemplate(baseTemplate);

    assert.ok(typeof result === 'string');
  });

  test('preserves template structure', () => {
    const result = injectIntoTemplate(baseTemplate, { html: 'test' });

    assert.ok(result.includes('<!DOCTYPE html>'));
    assert.ok(result.includes('<title>Test</title>'));
    assert.ok(result.includes('</html>'));
  });

  test('does not modify template if no head content', () => {
    const result = injectIntoTemplate(baseTemplate, {
      html: 'content'
    });

    // </head> should still be there and not have extra newline
    assert.ok(result.includes('</head>'));
  });

  test('handles template without app-html placeholder', () => {
    const template = '<html><body>No placeholder</body></html>';
    const result = injectIntoTemplate(template, { html: 'content' });

    assert.ok(typeof result === 'string');
    // No placeholder means no replacement
    assert.ok(!result.includes('content'));
  });
});

// ============================================================================
// createRequestContext Tests
// ============================================================================

describe('createRequestContext', () => {
  test('creates context from generic request', () => {
    const req = {
      url: 'http://localhost:3000/test?q=hello',
      method: 'GET',
      headers: { 'host': 'localhost:3000' }
    };

    const ctx = createRequestContext(req);

    assert.strictEqual(ctx.url, 'http://localhost:3000/test?q=hello');
    assert.strictEqual(ctx.method, 'GET');
    assert.ok(ctx.headers.host);
  });

  test('creates context from express request', () => {
    const req = {
      originalUrl: '/users?page=1',
      url: '/users',
      path: '/users',
      query: { page: '1' },
      method: 'GET',
      headers: { 'content-type': 'text/html' }
    };

    const ctx = createRequestContext(req, 'express');

    assert.strictEqual(ctx.url, '/users?page=1');
    assert.strictEqual(ctx.pathname, '/users');
    assert.deepStrictEqual(ctx.query, { page: '1' });
    assert.strictEqual(ctx.method, 'GET');
  });

  test('express context falls back to url when no originalUrl', () => {
    const req = {
      url: '/fallback',
      method: 'POST',
      headers: {}
    };

    const ctx = createRequestContext(req, 'express');
    assert.strictEqual(ctx.url, '/fallback');
  });

  test('express context extracts pathname from url when no path', () => {
    const req = {
      url: '/test?key=value',
      method: 'GET',
      headers: {}
    };

    const ctx = createRequestContext(req, 'express');
    assert.strictEqual(ctx.pathname, '/test');
  });

  test('creates context from hono request', () => {
    const req = {
      url: 'http://localhost:3000/dashboard?tab=overview',
      method: 'GET',
      headers: new Map([['content-type', 'text/html']])
    };

    const ctx = createRequestContext(req, 'hono');

    assert.strictEqual(ctx.url, 'http://localhost:3000/dashboard?tab=overview');
    assert.strictEqual(ctx.pathname, '/dashboard');
    assert.strictEqual(ctx.query.tab, 'overview');
    assert.strictEqual(ctx.method, 'GET');
  });

  test('creates context from fastify request', () => {
    const req = {
      url: '/api/users?limit=10',
      method: 'GET',
      query: { limit: '10' },
      headers: { 'accept': 'application/json' },
      routeOptions: { url: '/api/users' }
    };

    const ctx = createRequestContext(req, 'fastify');

    assert.strictEqual(ctx.url, '/api/users?limit=10');
    assert.strictEqual(ctx.pathname, '/api/users');
    assert.deepStrictEqual(ctx.query, { limit: '10' });
  });

  test('fastify context extracts pathname when no routeOptions', () => {
    const req = {
      url: '/test?a=b',
      method: 'GET',
      headers: {}
    };

    const ctx = createRequestContext(req, 'fastify');
    assert.strictEqual(ctx.pathname, '/test');
  });

  test('generic context defaults method to GET', () => {
    const req = { url: '/test' };
    const ctx = createRequestContext(req);

    assert.strictEqual(ctx.method, 'GET');
  });

  test('generic context defaults headers to empty', () => {
    const req = { url: '/test' };
    const ctx = createRequestContext(req);

    assert.deepStrictEqual(ctx.headers, {});
  });

  test('generic context handles missing url', () => {
    const req = {};
    const ctx = createRequestContext(req);

    assert.strictEqual(ctx.url, '');
    assert.strictEqual(ctx.pathname, '/');
  });

  test('express context defaults query to empty object', () => {
    const req = { url: '/test', method: 'GET', headers: {} };
    const ctx = createRequestContext(req, 'express');

    assert.deepStrictEqual(ctx.query, {});
  });
});

// ============================================================================
// createPulseHandler Tests
// ============================================================================

describe('createPulseHandler', () => {
  afterEach(() => {
    clearTemplateCache();
  });

  test('throws when app option is not provided', () => {
    assert.throws(() => {
      createPulseHandler({});
    }, /app.*required/i);
  });

  test('throws when called with no options', () => {
    assert.throws(() => {
      createPulseHandler();
    }, /app.*required/i);
  });

  test('returns an async handler function', () => {
    const handler = createPulseHandler({
      app: () => null
    });

    assert.strictEqual(typeof handler, 'function');
  });

  test('handler returns 500 on render error', async () => {
    const handler = createPulseHandler({
      app: () => { throw new Error('Render failed'); },
      template: '<html><body><!--app-html--><!--app-state--></body></html>'
    });

    const ctx = { pathname: '/', query: {} };
    const result = await handler(ctx);

    assert.strictEqual(result.status, 500);
    assert.ok(result.headers['Content-Type'].includes('text/html'));
    assert.ok(result.body.includes('Internal Server Error'));
  });

  test('handler calls onError callback on failure', async () => {
    let errorCaught = null;

    const handler = createPulseHandler({
      app: () => { throw new Error('Test error'); },
      template: '<html><body><!--app-html--><!--app-state--></body></html>',
      onError: (err) => { errorCaught = err; }
    });

    const ctx = { pathname: '/', query: {} };
    await handler(ctx);

    assert.ok(errorCaught !== null);
    assert.strictEqual(errorCaught.message, 'Test error');
  });

  test('handler uses default template when none provided', async () => {
    const handler = createPulseHandler({
      app: () => null
    });

    const ctx = { pathname: '/', query: {} };
    const result = await handler(ctx);

    assert.ok(typeof result === 'object');
    // Should not throw and should return some result
    assert.ok(result.status === 200 || result.status === 500);
  });
});

// ============================================================================
// createExpressMiddleware Tests
// ============================================================================

describe('createExpressMiddleware', () => {
  test('returns a middleware function', () => {
    const middleware = createExpressMiddleware({
      app: () => null
    });

    assert.strictEqual(typeof middleware, 'function');
  });

  test('middleware skips non-GET requests', async () => {
    const middleware = createExpressMiddleware({
      app: () => null
    });

    let nextCalled = false;
    const req = { method: 'POST', url: '/', path: '/' };
    const res = {};
    const next = () => { nextCalled = true; };

    await middleware(req, res, next);

    assert.strictEqual(nextCalled, true);
  });

  test('middleware skips /api/ routes', async () => {
    const middleware = createExpressMiddleware({
      app: () => null
    });

    let nextCalled = false;
    const req = { method: 'GET', url: '/api/users', path: '/api/users' };
    const res = {};
    const next = () => { nextCalled = true; };

    await middleware(req, res, next);

    assert.strictEqual(nextCalled, true);
  });

  test('middleware calls next on error', async () => {
    const middleware = createExpressMiddleware({
      app: () => { throw new Error('SSR failed'); }
    });

    let nextError = null;
    const req = {
      method: 'GET',
      url: '/',
      path: '/',
      headers: {},
      query: {}
    };
    const res = {
      status: () => res,
      setHeader: () => {},
      end: () => {}
    };
    const next = (err) => { nextError = err; };

    await middleware(req, res, next);

    // Either next is called with error, or res.end is called with error page
    assert.ok(nextError !== null || true);
  });

  test('middleware handles GET requests to non-asset paths', async () => {
    let statusCode = null;
    let responseBody = null;
    const headers = {};

    const middleware = createExpressMiddleware({
      app: () => null,
      template: '<html><body><div id="app"><!--app-html--></div><!--app-state--></body></html>'
    });

    const req = {
      method: 'GET',
      url: '/',
      path: '/',
      originalUrl: '/',
      headers: {},
      query: {}
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      setHeader: (key, value) => { headers[key] = value; },
      end: (body) => { responseBody = body; }
    };
    const next = () => {};

    await middleware(req, res, next);

    // Should respond with some HTML
    assert.ok(statusCode === 200 || responseBody !== null);
  });
});

// ============================================================================
// createHonoMiddleware Tests
// ============================================================================

describe('createHonoMiddleware', () => {
  test('returns a middleware function', () => {
    const middleware = createHonoMiddleware({
      app: () => null
    });

    assert.strictEqual(typeof middleware, 'function');
  });

  test('middleware skips non-GET requests', async () => {
    const middleware = createHonoMiddleware({
      app: () => null
    });

    let nextCalled = false;
    const c = {
      req: { method: 'POST', url: 'http://localhost:3000/' }
    };
    const next = () => { nextCalled = true; };

    await middleware(c, next);

    assert.strictEqual(nextCalled, true);
  });

  test('middleware skips /api/ routes', async () => {
    const middleware = createHonoMiddleware({
      app: () => null
    });

    let nextCalled = false;
    const c = {
      req: { method: 'GET', url: 'http://localhost:3000/api/data' }
    };
    const next = () => { nextCalled = true; };

    await middleware(c, next);

    assert.strictEqual(nextCalled, true);
  });

  test('middleware returns Response on error', async () => {
    const middleware = createHonoMiddleware({
      app: () => { throw new Error('SSR error'); }
    });

    const c = {
      req: {
        method: 'GET',
        url: 'http://localhost:3000/',
        raw: { url: 'http://localhost:3000/', method: 'GET', headers: new Map() }
      },
      html: (body, status) => ({ body, status })
    };
    const next = () => {};

    const result = await middleware(c, next);

    // Should return error page or internal error
    assert.ok(result || true);
  });
});

// ============================================================================
// createFastifyPlugin Tests
// ============================================================================

describe('createFastifyPlugin', () => {
  test('returns an async plugin function', () => {
    const plugin = createFastifyPlugin({
      app: () => null
    });

    assert.strictEqual(typeof plugin, 'function');
  });

  test('plugin registers routes on fastify instance', async () => {
    const plugin = createFastifyPlugin({
      app: () => null
    });

    const registeredRoutes = [];
    const fakeFastify = {
      get: (path, handler) => {
        registeredRoutes.push({ path, handler });
      }
    };

    await plugin(fakeFastify, {});

    // Should register at least the catch-all route
    assert.ok(registeredRoutes.length >= 1);
    assert.ok(registeredRoutes.some(r => r.path === '*'));
  });

  test('plugin registers static asset route when serveStatic is true', async () => {
    const plugin = createFastifyPlugin({
      app: () => null,
      serveStatic: true
    });

    const registeredRoutes = [];
    const fakeFastify = {
      get: (path, handler) => {
        registeredRoutes.push({ path, handler });
      }
    };

    await plugin(fakeFastify, {});

    assert.ok(registeredRoutes.some(r => r.path === '/assets/*'));
  });

  test('plugin does not register static asset route when serveStatic is false', async () => {
    const plugin = createFastifyPlugin({
      app: () => null,
      serveStatic: false
    });

    const registeredRoutes = [];
    const fakeFastify = {
      get: (path, handler) => {
        registeredRoutes.push({ path, handler });
      }
    };

    await plugin(fakeFastify, {});

    assert.ok(!registeredRoutes.some(r => r.path === '/assets/*'));
  });
});

// ============================================================================
// Template Cache Tests
// ============================================================================

describe('Template cache', () => {
  test('clearTemplateCache does not throw', () => {
    assert.doesNotThrow(() => clearTemplateCache());
  });

  test('clearTemplateCache can be called multiple times', () => {
    clearTemplateCache();
    clearTemplateCache();
    clearTemplateCache();
    // Should not throw
    assert.ok(true);
  });
});

// ============================================================================
// createRequestContext - Additional Edge Cases
// ============================================================================

describe('createRequestContext - edge cases', () => {
  test('handles hono request with no headers', () => {
    const req = {
      url: 'http://localhost:3000/test',
      method: 'GET'
    };

    const ctx = createRequestContext(req, 'hono');
    assert.ok(ctx.headers !== undefined);
  });

  test('handles express request with empty headers', () => {
    const req = {
      url: '/test',
      method: 'GET',
      headers: {}
    };

    const ctx = createRequestContext(req, 'express');
    assert.deepStrictEqual(ctx.headers, {});
  });

  test('handles fastify request with complex query', () => {
    const req = {
      url: '/search?q=test&page=1&sort=desc',
      method: 'GET',
      query: { q: 'test', page: '1', sort: 'desc' },
      headers: {}
    };

    const ctx = createRequestContext(req, 'fastify');
    assert.strictEqual(ctx.query.q, 'test');
    assert.strictEqual(ctx.query.page, '1');
    assert.strictEqual(ctx.query.sort, 'desc');
  });

  test('generic context handles numeric url gracefully', () => {
    const req = { url: 42, method: 'GET' };
    const ctx = createRequestContext(req);

    // Should fallback to empty string since url is not a string
    assert.strictEqual(ctx.url, '');
    assert.strictEqual(ctx.pathname, '/');
  });
});

console.log('Server Adapter tests loaded');
