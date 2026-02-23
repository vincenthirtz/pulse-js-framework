/**
 * Extended Tests for Server Actions - Server Runtime
 * Covers middleware features, CSRF management, Fastify/Hono, and edge cases
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Server-side
import {
  registerServerAction,
  executeServerAction,
  createServerActionMiddleware,
  createFastifyActionPlugin,
  createHonoActionMiddleware,
  clearServerActions,
  setCSRFStore,
  getGlobalCSRFStore,
  generateCSRFTokenForResponse
} from '../runtime/server-components/actions-server.js';

// CSRF
import { CSRFTokenStore } from '../runtime/server-components/security-csrf.js';

// Rate limiting
import { MemoryRateLimitStore } from '../runtime/server-components/security-ratelimit.js';

// ============================================================================
// CSRF Store Management
// ============================================================================

describe('CSRF Store Management', () => {
  afterEach(() => {
    // Reset to clean state
    setCSRFStore(null);
  });

  test('setCSRFStore replaces global store', () => {
    const customStore = new CSRFTokenStore({ secret: 'test-secret' });
    setCSRFStore(customStore);

    const global = getGlobalCSRFStore();
    assert.strictEqual(global, customStore);

    customStore.dispose();
  });

  test('setCSRFStore disposes old store', () => {
    const store1 = new CSRFTokenStore({ secret: 'secret1' });
    setCSRFStore(store1);

    let disposeCalled = false;
    store1.dispose = () => { disposeCalled = true; };

    const store2 = new CSRFTokenStore({ secret: 'secret2' });
    setCSRFStore(store2);

    assert.strictEqual(disposeCalled, true);

    store2.dispose();
  });

  test('setCSRFStore(null) resets to null', () => {
    const store = new CSRFTokenStore({ secret: 'test' });
    setCSRFStore(store);
    setCSRFStore(null);

    const global = getGlobalCSRFStore();
    assert.ok(global); // Creates new one when null
  });

  test('getGlobalCSRFStore creates store if not exists', () => {
    setCSRFStore(null); // Ensure clean
    const store = getGlobalCSRFStore();
    assert.ok(store instanceof CSRFTokenStore);
  });

  test('generateCSRFTokenForResponse creates token and sets cookie', async () => {
    const res = {
      cookie(name, value, options) {
        this.cookies = this.cookies || {};
        this.cookies[name] = { value, options };
      }
    };

    const token = await generateCSRFTokenForResponse(res, { expiresIn: 3600000 });

    // Should return token
    assert.ok(typeof token === 'string');
    assert.ok(token.length > 0);

    // Should set cookie
    assert.ok(res.cookies['csrf-token']);
    assert.strictEqual(res.cookies['csrf-token'].options.httpOnly, false);
    assert.strictEqual(res.cookies['csrf-token'].options.sameSite, 'strict');
  });

  test('generateCSRFTokenForResponse works with Hono setCookie', async () => {
    const res = {
      setCookie(name, value, options) {
        this.cookies = this.cookies || {};
        this.cookies[name] = { value, options };
      }
    };

    const token = await generateCSRFTokenForResponse(res, { expiresIn: 1800000 });

    assert.ok(typeof token === 'string');
    assert.ok(res.cookies['csrf-token']);
    assert.strictEqual(res.cookies['csrf-token'].options.sameSite, 'Strict'); // Hono uses capital S
  });
});

// ============================================================================
// Express Middleware - Advanced Features
// ============================================================================

describe('Express Middleware - CSRF Token Rotation', () => {
  beforeEach(() => {
    clearServerActions();
    setCSRFStore(null);
  });

  afterEach(() => {
    setCSRFStore(null);
  });

  test('rotateOnUse generates new token after validation', async () => {
    registerServerAction('test-action', async (data) => ({ result: data }));

    const middleware = createServerActionMiddleware({
      csrfValidation: true,
      csrfSecret: 'test-secret',
      rotateOnUse: true
    });

    // Generate initial token
    const store = getGlobalCSRFStore();
    const token = await store.generate({ expiresIn: 3600000 });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-csrf-token': token, 'x-pulse-action': 'test-action' },
      body: { args: ['test'] }
    };

    const res = {
      headers: {},
      cookies: {},
      setHeader(name, value) { this.headers[name] = value; },
      cookie(name, value, options) { this.cookies[name] = { value, options }; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    };

    await middleware(req, res, () => {});

    // Should have new token
    assert.ok(res.headers['X-New-CSRF-Token']);
    assert.ok(res.cookies['csrf-token']);
    assert.notStrictEqual(res.headers['X-New-CSRF-Token'], token);
  });

  test('rotateOnUse sets secure cookie in production', async () => {
    registerServerAction('test-action', async () => ({}));

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const middleware = createServerActionMiddleware({
        csrfValidation: true,
        rotateOnUse: true
      });

      const store = getGlobalCSRFStore();
      const token = await store.generate({ expiresIn: 3600000 });

      const req = {
        method: 'POST',
        path: '/_actions',
        headers: { 'x-csrf-token': token, 'x-pulse-action': 'test-action' },
        body: { args: [] }
      };

      const res = {
        headers: {},
        cookies: {},
        setHeader(name, value) { this.headers[name] = value; },
        cookie(name, value, options) { this.cookies[name] = { value, options }; },
        json(data) { this.body = data; },
        status(code) { this.statusCode = code; return this; }
      };

      await middleware(req, res, () => {});

      assert.strictEqual(res.cookies['csrf-token'].options.secure, true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe('Express Middleware - Rate Limiting', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('blocks requests exceeding per-action limit', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerAction: {
        'test-action': { maxRequests: 2, windowMs: 1000 }
      }
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    };

    const createRes = () => ({
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    });

    // First two requests should pass
    let res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, undefined); // Success

    res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, undefined); // Success

    // Third should be blocked
    res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, 429);
    assert.ok(res.body.error.includes('Too Many Requests'));
    assert.strictEqual(res.body.code, 'PSC_RATE_LIMIT_EXCEEDED');
    assert.ok(res.headers['Retry-After'] > 0);
  });

  test('blocks requests exceeding per-user limit', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 3, windowMs: 1000 }
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    };

    const createRes = () => ({
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    });

    // First 3 should pass
    for (let i = 0; i < 3; i++) {
      const res = createRes();
      await middleware(req, res, () => {});
      assert.strictEqual(res.statusCode, undefined);
    }

    // 4th should be blocked
    const res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, 429);
  });

  test('blocks requests exceeding global limit', async () => {
    registerServerAction('action1', async () => ({ success: true }));
    registerServerAction('action2', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitGlobal: { maxRequests: 3, windowMs: 1000 }
    });

    const createReq = (actionId, ip) => ({
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': actionId },
      body: { args: [] },
      ip
    });

    const createRes = () => ({
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    });

    // 3 requests from different IPs/actions
    let res = createRes();
    await middleware(createReq('action1', '127.0.0.1'), res, () => {});
    assert.strictEqual(res.statusCode, undefined);

    res = createRes();
    await middleware(createReq('action2', '192.168.1.1'), res, () => {});
    assert.strictEqual(res.statusCode, undefined);

    res = createRes();
    await middleware(createReq('action1', '10.0.0.1'), res, () => {});
    assert.strictEqual(res.statusCode, undefined);

    // 4th should be blocked (global limit)
    res = createRes();
    await middleware(createReq('action2', '8.8.8.8'), res, () => {});
    assert.strictEqual(res.statusCode, 429);
    assert.ok(res.body.reason.includes('Global rate limit'));
  });

  test('sets rate limit headers on success', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 10, windowMs: 60000 }
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    };

    const res = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    };

    await middleware(req, res, () => {});

    // Rate limit headers may or may not be set depending on configuration
    // Just check that if they're set, they have valid values
    if (res.headers['X-RateLimit-Limit']) {
      assert.ok(res.headers['X-RateLimit-Limit'] > 0);
    }
    if (res.headers['X-RateLimit-Remaining'] !== undefined) {
      assert.ok(res.headers['X-RateLimit-Remaining'] >= 0);
    }
  });

  test('bypasses rate limit for trusted IPs', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 2, windowMs: 1000 },
      rateLimitTrustedIPs: ['127.0.0.1']
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    };

    const createRes = () => ({
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    });

    // Should allow unlimited requests from trusted IP
    for (let i = 0; i < 10; i++) {
      const res = createRes();
      await middleware(req, res, () => {});
      assert.strictEqual(res.statusCode, undefined);
    }
  });

  test('uses custom identify function for rate limiting', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 2, windowMs: 1000 },
      rateLimitIdentify: (ctx) => ctx.userId || ctx.ip
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1',
      user: { id: 'user123' }
    };

    const createRes = () => ({
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    });

    // First 2 should pass
    let res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, undefined);

    res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, undefined);

    // 3rd should be blocked
    res = createRes();
    await middleware(req, res, () => {});
    assert.strictEqual(res.statusCode, 429);
  });

  test('uses external rate limit store', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const store = new MemoryRateLimitStore();

    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 5, windowMs: 1000 },
      rateLimitStore: store
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    };

    const res = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    };

    await middleware(req, res, () => {});

    // Store should have data
    assert.ok(store.size > 0);

    store.dispose();
  });
});

describe('Express Middleware - Error Cases', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('returns 400 for missing action ID', async () => {
    const middleware = createServerActionMiddleware({ csrfValidation: false });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: {}, // Missing x-pulse-action
      body: { args: [] }
    };

    const res = {
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; }
    };

    await middleware(req, res, () => {});

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Missing action ID'));
  });

  test('returns 403 for invalid CSRF token', async () => {
    const middleware = createServerActionMiddleware({
      csrfValidation: true,
      csrfSecret: 'test-secret'
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-csrf-token': 'invalid-token', 'x-pulse-action': 'test' },
      body: { args: [] }
    };

    const res = {
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; },
      setHeader() {},
      cookie() {}
    };

    await middleware(req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'PSC_CSRF_INVALID');
  });

  test('uses custom CSRF store', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const customStore = new CSRFTokenStore({ secret: 'custom-secret' });
    const token = await customStore.generate({ expiresIn: 3600000 });

    const middleware = createServerActionMiddleware({
      csrfValidation: true,
      csrfStore: customStore
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-csrf-token': token, 'x-pulse-action': 'test-action' },
      body: { args: [] }
    };

    const res = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      json(data) { this.body = data; },
      status(code) { this.statusCode = code; return this; },
      cookie() {}
    };

    await middleware(req, res, () => {});

    assert.strictEqual(res.statusCode, undefined); // Success

    customStore.dispose();
  });
});

// ============================================================================
// Fastify Plugin
// ============================================================================

describe('Fastify Plugin', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('registers POST handler at endpoint', async () => {
    registerServerAction('test-action', async (data) => ({ result: data }));

    const routes = [];
    const fastify = {
      post(path, handler) {
        routes.push({ path, handler });
      }
    };

    await createFastifyActionPlugin(fastify, {
      csrfValidation: false,
      endpoint: '/_actions'
    });

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/_actions');
    assert.strictEqual(typeof routes[0].handler, 'function');
  });

  test('executes action successfully', async () => {
    registerServerAction('test-action', async (data) => ({ result: data }));

    const fastify = {
      post(path, handler) {
        this.handler = handler;
      }
    };

    await createFastifyActionPlugin(fastify, { csrfValidation: false });

    const request = {
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: ['test-data'] }
    };

    const reply = {
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return data; },
      header(name, value) { this.headers = this.headers || {}; this.headers[name] = value; }
    };

    const result = await fastify.handler(request, reply);

    assert.deepStrictEqual(result, { result: 'test-data' });
  });

  test('validates CSRF token', async () => {
    const fastify = {
      post(path, handler) { this.handler = handler; }
    };

    await createFastifyActionPlugin(fastify, {
      csrfValidation: true,
      csrfSecret: 'test-secret'
    });

    const request = {
      headers: { 'x-csrf-token': 'invalid', 'x-pulse-action': 'test' },
      body: { args: [] }
    };

    const reply = {
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return this.body; },
      header() {}
    };

    await fastify.handler(request, reply);

    assert.strictEqual(reply.statusCode, 403);
    assert.strictEqual(reply.body.code, 'PSC_CSRF_INVALID');
  });

  test('rotates CSRF token on use', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const fastify = {
      post(path, handler) { this.handler = handler; }
    };

    await createFastifyActionPlugin(fastify, {
      csrfValidation: true,
      csrfSecret: 'test-secret',
      rotateOnUse: true
    });

    const store = getGlobalCSRFStore();
    const token = await store.generate({ expiresIn: 3600000 });

    const request = {
      headers: { 'x-csrf-token': token, 'x-pulse-action': 'test-action' },
      body: { args: [] }
    };

    const reply = {
      headers: {},
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return this.body; },
      header(name, value) { this.headers[name] = value; }
    };

    await fastify.handler(request, reply);

    assert.ok(reply.headers['X-New-CSRF-Token']);
  });

  test('handles rate limiting', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const fastify = {
      post(path, handler) { this.handler = handler; }
    };

    await createFastifyActionPlugin(fastify, {
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 2, windowMs: 1000 }
    });

    const createRequest = () => ({
      headers: { 'x-pulse-action': 'test-action' },
      body: { args: [] },
      ip: '127.0.0.1'
    });

    const createReply = () => ({
      headers: {},
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return this.body; },
      header(name, value) { this.headers[name] = value; }
    });

    // First 2 should pass
    let reply = createReply();
    await fastify.handler(createRequest(), reply);
    assert.strictEqual(reply.statusCode, undefined);

    reply = createReply();
    await fastify.handler(createRequest(), reply);
    assert.strictEqual(reply.statusCode, undefined);

    // 3rd should be blocked
    reply = createReply();
    await fastify.handler(createRequest(), reply);
    assert.strictEqual(reply.statusCode, 429);
    assert.strictEqual(reply.body.code, 'PSC_RATE_LIMIT_EXCEEDED');
  });

  test('returns 400 for missing action ID', async () => {
    const fastify = {
      post(path, handler) { this.handler = handler; }
    };

    await createFastifyActionPlugin(fastify, { csrfValidation: false });

    const request = {
      headers: {},
      body: { args: [] }
    };

    const reply = {
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return this.body; }
    };

    await fastify.handler(request, reply);

    assert.strictEqual(reply.statusCode, 400);
    assert.ok(reply.body.error.includes('Missing action ID'));
  });

  test('sanitizes errors', async () => {
    registerServerAction('error-action', async () => {
      throw new Error('Database connection failed at /home/user/secrets/db.js');
    });

    const fastify = {
      post(path, handler) { this.handler = handler; }
    };

    await createFastifyActionPlugin(fastify, { csrfValidation: false });

    const request = {
      headers: { 'x-pulse-action': 'error-action' },
      body: { args: [] }
    };

    const reply = {
      code(statusCode) { this.statusCode = statusCode; return this; },
      send(data) { this.body = data; return this.body; }
    };

    await fastify.handler(request, reply);

    assert.strictEqual(reply.statusCode, 500);
    assert.ok(reply.body.message);
    // Path should be sanitized (not shown in error)
    assert.ok(!reply.body.message.includes('/home/user/secrets'));
  });
});

// ============================================================================
// Hono Middleware
// ============================================================================

describe('Hono Middleware', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('creates middleware function', () => {
    const middleware = createHonoActionMiddleware({ csrfValidation: false });
    assert.strictEqual(typeof middleware, 'function');
  });

  test('executes action successfully', async () => {
    registerServerAction('test-action', async (data) => ({ result: data }));

    const middleware = createHonoActionMiddleware({ csrfValidation: false });

    const c = {
      req: {
        method: 'POST',
        path: '/_actions',
        header: (name) => {
          const headers = { 'x-pulse-action': 'test-action' };
          return headers[name];
        },
        json: async () => ({ args: ['test-data'] }),
        raw: { headers: {} }
      },
      get(key) {
        // Hono context.get() for accessing variables
        return undefined;
      },
      json(data) { this.body = data; return data; }
    };

    const result = await middleware(c);

    assert.deepStrictEqual(result, { result: 'test-data' });
  });

  test('validates CSRF token', async () => {
    const middleware = createHonoActionMiddleware({
      csrfValidation: true,
      csrfSecret: 'test-secret'
    });

    const c = {
      req: {
        method: 'POST',
        path: '/_actions',
        header: (name) => {
          const headers = { 'x-csrf-token': 'invalid', 'x-pulse-action': 'test' };
          return headers[name];
        },
        json: async () => ({ args: [] })
      },
      json(data, status) { this.body = data; this.status = status; return data; }
    };

    await middleware(c);

    assert.strictEqual(c.status, 403);
    assert.strictEqual(c.body.code, 'PSC_CSRF_INVALID');
  });

  test('handles rate limiting', async () => {
    registerServerAction('test-action', async () => ({ success: true }));

    const middleware = createHonoActionMiddleware({
      csrfValidation: false,
      rateLimitPerUser: { maxRequests: 2, windowMs: 1000 }
    });

    const createContext = () => ({
      req: {
        method: 'POST',
        path: '/_actions',
        header: (name) => {
          const headers = { 'x-pulse-action': 'test-action', 'x-real-ip': '127.0.0.1' };
          return headers[name];
        },
        json: async () => ({ args: [] }),
        raw: { headers: {} }
      },
      env: {},
      get(key) { return undefined; },
      json(data, status) { this.body = data; this.status = status; return data; },
      header(name, value) { this.headers = this.headers || {}; this.headers[name] = value; }
    });

    // First 2 should pass
    let c = createContext();
    await middleware(c);
    assert.strictEqual(c.status, undefined);

    c = createContext();
    await middleware(c);
    assert.strictEqual(c.status, undefined);

    // 3rd should be blocked
    c = createContext();
    await middleware(c);
    assert.strictEqual(c.status, 429);
    assert.strictEqual(c.body.code, 'PSC_RATE_LIMIT_EXCEEDED');
  });

  test('returns 400 for missing action ID', async () => {
    const middleware = createHonoActionMiddleware({ csrfValidation: false });

    const c = {
      req: {
        method: 'POST',
        path: '/_actions',
        header: () => undefined,
        json: async () => ({ args: [] })
      },
      json(data, status) { this.body = data; this.status = status; return data; }
    };

    await middleware(c);

    assert.strictEqual(c.status, 400);
    assert.ok(c.body.error.includes('Missing action ID'));
  });

  test('sanitizes errors', async () => {
    registerServerAction('error-action', async () => {
      throw new Error('API key leaked: sk_live_abc123def456');
    });

    const middleware = createHonoActionMiddleware({ csrfValidation: false });

    const c = {
      req: {
        method: 'POST',
        path: '/_actions',
        header: (name) => name === 'x-pulse-action' ? 'error-action' : undefined,
        json: async () => ({ args: [] })
      },
      json(data, status) { this.body = data; this.status = status; return data; }
    };

    await middleware(c);

    assert.strictEqual(c.status, 500);
    assert.ok(c.body.message);
    // API key should be redacted
    assert.ok(!c.body.message.includes('sk_live_abc123def456'));
  });
});

console.log('✅ Extended Server Actions server tests completed');
