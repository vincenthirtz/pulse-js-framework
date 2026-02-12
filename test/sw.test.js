/**
 * Service Worker Module Tests
 * Tests for runtime/sw.js — registerServiceWorker, useServiceWorker
 * Tests for sw/index.js — createCacheStrategy, enableSkipWaiting
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { pulse, effect, resetContext } from '../runtime/pulse.js';

// ============================================================================
// Mock navigator.serviceWorker (for runtime/sw.js)
// ============================================================================

let mockNavigator;
let mockRegistration;

function setupMockSW() {
  mockRegistration = {
    installing: null,
    waiting: null,
    active: { state: 'activated' },
    scope: '/',
    update: async () => mockRegistration,
    unregister: async () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  mockNavigator = {
    serviceWorker: {
      register: async () => mockRegistration,
      ready: Promise.resolve(mockRegistration),
      controller: null,
    },
  };

  globalThis.navigator = mockNavigator;
}

function teardownMockSW() {
  if (globalThis.navigator === mockNavigator) {
    delete globalThis.navigator;
  }
}

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  resetContext();
});

afterEach(() => {
  teardownMockSW();
  resetContext();
});

// ============================================================================
// registerServiceWorker — Non-browser environment
// ============================================================================

describe('registerServiceWorker — no navigator', () => {
  test('returns no-op object when serviceWorker not supported', async () => {
    // Ensure no navigator.serviceWorker
    delete globalThis.navigator;

    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js');

    assert.strictEqual(typeof result.update, 'function');
    assert.strictEqual(typeof result.unregister, 'function');
    assert.strictEqual(result.registration, null);

    const updateResult = await result.update();
    assert.strictEqual(updateResult, null);

    const unregResult = await result.unregister();
    assert.strictEqual(unregResult, false);
  });
});

// ============================================================================
// registerServiceWorker — With mock navigator
// ============================================================================

describe('registerServiceWorker — with mock', () => {
  test('returns object with update, unregister, registration', async () => {
    setupMockSW();
    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js', { immediate: false });

    assert.strictEqual(typeof result.update, 'function');
    assert.strictEqual(typeof result.unregister, 'function');
  });

  test('update returns null when not registered', async () => {
    setupMockSW();
    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js', { immediate: false });

    const updateResult = await result.update();
    assert.strictEqual(updateResult, null);
  });

  test('unregister returns false when not registered', async () => {
    setupMockSW();
    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js', { immediate: false });

    const unregResult = await result.unregister();
    assert.strictEqual(unregResult, false);
  });
});

// ============================================================================
// useServiceWorker — Non-browser environment
// ============================================================================

describe('useServiceWorker — no navigator', () => {
  test('returns unsupported state', async () => {
    delete globalThis.navigator;

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    assert.strictEqual(result.supported, false);
    assert.ok(result.registered);
    assert.ok(result.installing);
    assert.ok(result.waiting);
    assert.ok(result.active);
    assert.ok(result.updateAvailable);
    assert.ok(result.error);
    assert.strictEqual(typeof result.update, 'function');
    assert.strictEqual(typeof result.skipWaiting, 'function');
    assert.strictEqual(typeof result.unregister, 'function');
  });

  test('reactive states default to false/null', async () => {
    delete globalThis.navigator;

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    assert.strictEqual(result.registered.get(), false);
    assert.strictEqual(result.installing.get(), false);
    assert.strictEqual(result.waiting.get(), false);
    assert.strictEqual(result.active.get(), false);
    assert.strictEqual(result.updateAvailable.get(), false);
    assert.strictEqual(result.error.get(), null);
  });

  test('methods return no-op results', async () => {
    delete globalThis.navigator;

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    const updateResult = await result.update();
    assert.strictEqual(updateResult, null);

    await result.skipWaiting(); // Should not throw

    const unregResult = await result.unregister();
    assert.strictEqual(unregResult, false);
  });
});

// ============================================================================
// createCacheStrategy — Validation
// ============================================================================

describe('createCacheStrategy — validation', () => {
  test('throws when cacheName is missing', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    assert.throws(
      () => createCacheStrategy('cache-first', {}),
      /cacheName is required/
    );
  });

  test('throws for unknown strategy name', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    assert.throws(
      () => createCacheStrategy('unknown-strategy', { cacheName: 'test' }),
      /Unknown cache strategy/
    );
  });

  test('accepts valid strategy names', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategies = ['cache-first', 'network-first', 'stale-while-revalidate', 'network-only', 'cache-only'];

    for (const name of strategies) {
      assert.doesNotThrow(() => {
        createCacheStrategy(name, { cacheName: `test-${name}` });
      });
    }
  });
});

// ============================================================================
// createCacheStrategy — Returns correct structure
// ============================================================================

describe('createCacheStrategy — structure', () => {
  test('returns object with name, cacheName, handle, fetch, precache, clearCache', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', { cacheName: 'static-v1' });

    assert.strictEqual(strategy.name, 'cache-first');
    assert.strictEqual(strategy.cacheName, 'static-v1');
    assert.strictEqual(typeof strategy.handle, 'function');
    assert.strictEqual(typeof strategy.fetch, 'function');
    assert.strictEqual(typeof strategy.precache, 'function');
    assert.strictEqual(typeof strategy.clearCache, 'function');
  });
});

// ============================================================================
// createCacheStrategy — match option
// ============================================================================

describe('createCacheStrategy — match option', () => {
  test('handle returns false when request does not match regex', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', {
      cacheName: 'images',
      match: /\.(png|jpg|gif)$/,
    });

    // Mock fetch event
    const event = {
      request: { url: 'https://example.com/style.css' },
      respondWith: () => {},
    };

    const handled = strategy.handle(event);
    assert.strictEqual(handled, false);
  });

  test('handle returns true when request matches regex', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', {
      cacheName: 'images',
      match: /\.(png|jpg|gif)$/,
    });

    let respondedWith = false;
    const event = {
      request: { url: 'https://example.com/photo.jpg' },
      respondWith: (promise) => {
        respondedWith = true;
        // Catch the promise to prevent unhandled rejection (caches API not available in test)
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      },
    };

    const handled = strategy.handle(event);
    assert.strictEqual(handled, true);
    assert.ok(respondedWith);
  });

  test('handle returns true when match is null (matches all)', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-only', {
      cacheName: 'all',
    });

    let respondedWith = false;
    const event = {
      request: { url: 'https://example.com/anything' },
      respondWith: (promise) => {
        respondedWith = true;
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      },
    };

    const handled = strategy.handle(event);
    assert.strictEqual(handled, true);
  });

  test('handle uses function matcher', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', {
      cacheName: 'api',
      match: (url) => url.includes('/api/'),
    });

    const respondWithCatch = (promise) => {
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    };

    const apiEvent = {
      request: { url: 'https://example.com/api/users' },
      respondWith: respondWithCatch,
    };
    const nonApiEvent = {
      request: { url: 'https://example.com/page' },
      respondWith: respondWithCatch,
    };

    assert.strictEqual(strategy.handle(apiEvent), true);
    assert.strictEqual(strategy.handle(nonApiEvent), false);
  });
});

// ============================================================================
// enableSkipWaiting
// ============================================================================

describe('enableSkipWaiting', () => {
  test('registers message listener on self', async () => {
    const listeners = [];
    globalThis.self = {
      addEventListener: (type, handler) => {
        listeners.push({ type, handler });
      },
      skipWaiting: () => {},
    };

    const { enableSkipWaiting } = await import('../sw/index.js');
    enableSkipWaiting();

    assert.ok(listeners.some(l => l.type === 'message'));

    delete globalThis.self;
  });

  test('calls self.skipWaiting on SKIP_WAITING message', async () => {
    let skipCalled = false;
    const listeners = [];

    globalThis.self = {
      addEventListener: (type, handler) => {
        listeners.push({ type, handler });
      },
      skipWaiting: () => { skipCalled = true; },
    };

    const { enableSkipWaiting } = await import('../sw/index.js');
    enableSkipWaiting();

    // Simulate message
    const messageHandler = listeners.find(l => l.type === 'message');
    assert.ok(messageHandler);
    messageHandler.handler({ data: { type: 'SKIP_WAITING' } });

    assert.ok(skipCalled);

    delete globalThis.self;
  });

  test('ignores non-SKIP_WAITING messages', async () => {
    let skipCalled = false;
    const listeners = [];

    globalThis.self = {
      addEventListener: (type, handler) => {
        listeners.push({ type, handler });
      },
      skipWaiting: () => { skipCalled = true; },
    };

    const { enableSkipWaiting } = await import('../sw/index.js');
    enableSkipWaiting();

    const messageHandler = listeners.find(l => l.type === 'message');
    messageHandler.handler({ data: { type: 'OTHER' } });

    assert.ok(!skipCalled);

    delete globalThis.self;
  });
});

// ============================================================================
// registerServiceWorker — Full lifecycle with mock
// ============================================================================

describe('registerServiceWorker — full lifecycle', () => {
  test('immediate registration calls navigator.serviceWorker.register', async () => {
    let registerCalled = false;
    let registeredUrl = null;
    let registeredScope = null;

    const updateFoundListeners = [];
    const reg = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      scope: '/',
      update: async () => reg,
      unregister: async () => true,
      addEventListener: (type, handler) => {
        if (type === 'updatefound') updateFoundListeners.push(handler);
      },
      removeEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async (url, opts) => {
          registerCalled = true;
          registeredUrl = url;
          registeredScope = opts?.scope;
          return reg;
        },
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js', { scope: '/app/' });

    // Wait for async registration
    await new Promise(r => setTimeout(r, 50));

    assert.ok(registerCalled);
    assert.strictEqual(registeredUrl, '/sw.js');
    assert.strictEqual(registeredScope, '/app/');

    delete globalThis.navigator;
  });

  test('update() calls registration.update when registered', async () => {
    let updateCalled = false;
    const reg = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      update: async () => { updateCalled = true; return reg; },
      unregister: async () => true,
      addEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));
    await result.update();
    assert.ok(updateCalled);

    delete globalThis.navigator;
  });

  test('unregister() calls registration.unregister and clears timer', async () => {
    let unregCalled = false;
    const reg = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => { unregCalled = true; return true; },
      addEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    const result = registerServiceWorker('/sw.js', { updateInterval: 60000 });

    await new Promise(r => setTimeout(r, 50));
    const unregResult = await result.unregister();

    assert.ok(unregCalled);
    assert.strictEqual(unregResult, true);

    delete globalThis.navigator;
  });

  test('calls onError when registration fails', async () => {
    let errorReceived = null;

    globalThis.navigator = {
      serviceWorker: {
        register: async () => { throw new Error('Registration failed'); },
        ready: new Promise(() => {}),
        controller: null,
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    registerServiceWorker('/sw.js', {
      onError: (err) => { errorReceived = err; },
    });

    await new Promise(r => setTimeout(r, 50));
    assert.ok(errorReceived);
    assert.ok(errorReceived.message.includes('Registration failed'));

    delete globalThis.navigator;
  });

  test('updatefound event triggers onUpdate when controller exists', async () => {
    let onUpdateCalled = false;
    const updateFoundListeners = [];
    const stateChangeListeners = [];

    const newWorker = {
      state: 'installing',
      addEventListener: (type, handler) => {
        if (type === 'statechange') stateChangeListeners.push(handler);
      },
    };

    const reg = {
      installing: newWorker,
      waiting: null,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => true,
      addEventListener: (type, handler) => {
        if (type === 'updatefound') updateFoundListeners.push(handler);
      },
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: {}, // Existing controller = update available
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    registerServiceWorker('/sw.js', {
      onUpdate: () => { onUpdateCalled = true; },
    });

    await new Promise(r => setTimeout(r, 50));

    // Simulate updatefound
    for (const l of updateFoundListeners) l();

    // Simulate new worker becoming installed
    newWorker.state = 'installed';
    for (const l of stateChangeListeners) l();

    assert.ok(onUpdateCalled);

    delete globalThis.navigator;
  });

  test('updatefound event triggers onActivate when worker activates', async () => {
    let onActivateCalled = false;
    const updateFoundListeners = [];
    const stateChangeListeners = [];

    const newWorker = {
      state: 'installing',
      addEventListener: (type, handler) => {
        if (type === 'statechange') stateChangeListeners.push(handler);
      },
    };

    const reg = {
      installing: newWorker,
      waiting: null,
      active: null,
      update: async () => reg,
      unregister: async () => true,
      addEventListener: (type, handler) => {
        if (type === 'updatefound') updateFoundListeners.push(handler);
      },
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { registerServiceWorker } = await import('../runtime/sw.js');
    registerServiceWorker('/sw.js', {
      onActivate: () => { onActivateCalled = true; },
    });

    await new Promise(r => setTimeout(r, 50));

    for (const l of updateFoundListeners) l();
    newWorker.state = 'activated';
    for (const l of stateChangeListeners) l();

    assert.ok(onActivateCalled);

    delete globalThis.navigator;
  });
});

// ============================================================================
// useServiceWorker — Full lifecycle
// ============================================================================

describe('useServiceWorker — with mock navigator', () => {
  test('sets registered to true on ready', async () => {
    const reg = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => true,
      addEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(result.supported, true);
    assert.strictEqual(result.registered.get(), true);
    assert.strictEqual(result.active.get(), true);

    delete globalThis.navigator;
  });

  test('unregister resets all reactive state', async () => {
    const reg = {
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => true,
      addEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));
    await result.unregister();

    assert.strictEqual(result.registered.get(), false);
    assert.strictEqual(result.active.get(), false);
    assert.strictEqual(result.installing.get(), false);
    assert.strictEqual(result.waiting.get(), false);
    assert.strictEqual(result.updateAvailable.get(), false);

    delete globalThis.navigator;
  });

  test('skipWaiting sends message to waiting worker', async () => {
    let messageSent = null;
    const waitingWorker = {
      postMessage: (msg) => { messageSent = msg; },
    };
    const reg = {
      installing: null,
      waiting: waitingWorker,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => true,
      addEventListener: () => {},
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: null,
      },
    };

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));
    await result.skipWaiting();

    assert.deepStrictEqual(messageSent, { type: 'SKIP_WAITING' });

    delete globalThis.navigator;
  });

  test('ready rejection sets error', async () => {
    globalThis.navigator = {
      serviceWorker: {
        register: async () => ({
          addEventListener: () => {},
          update: async () => {},
          unregister: async () => true,
        }),
        ready: Promise.reject(new Error('Not supported')),
        controller: null,
      },
    };

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));

    assert.ok(result.error.get());

    delete globalThis.navigator;
  });

  test('onUpdate callback sets updateAvailable', async () => {
    const updateFoundListeners = [];
    const stateChangeListeners = [];

    const newWorker = {
      state: 'installing',
      addEventListener: (type, handler) => {
        if (type === 'statechange') stateChangeListeners.push(handler);
      },
    };

    const reg = {
      installing: newWorker,
      waiting: null,
      active: { state: 'activated' },
      update: async () => reg,
      unregister: async () => true,
      addEventListener: (type, handler) => {
        if (type === 'updatefound') updateFoundListeners.push(handler);
      },
    };

    globalThis.navigator = {
      serviceWorker: {
        register: async () => reg,
        ready: Promise.resolve(reg),
        controller: {}, // existing controller → onUpdate fires
      },
    };

    const { useServiceWorker } = await import('../runtime/sw.js');
    const result = useServiceWorker('/sw.js');

    await new Promise(r => setTimeout(r, 50));

    // Simulate update
    for (const l of updateFoundListeners) l();
    newWorker.state = 'installed';
    for (const l of stateChangeListeners) l();

    assert.strictEqual(result.updateAvailable.get(), true);

    delete globalThis.navigator;
  });
});

// ============================================================================
// createCacheStrategy — Strategy execution with mock caches/fetch
// ============================================================================

describe('createCacheStrategy — strategy execution', () => {
  let mockCaches;
  let originalCaches;
  let originalFetch;

  function createMockCacheStore() {
    const entries = new Map();
    return {
      match: async (req) => {
        const url = typeof req === 'string' ? req : req.url;
        return entries.get(url) || undefined;
      },
      put: async (req, res) => {
        const url = typeof req === 'string' ? req : req.url;
        entries.set(url, res);
      },
      delete: async (req) => {
        const url = typeof req === 'string' ? req : req.url;
        return entries.delete(url);
      },
      keys: async () => Array.from(entries.keys()).map(url => ({ url })),
      addAll: async (urls) => {
        for (const u of urls) entries.set(u, { url: u, ok: true });
      },
    };
  }

  beforeEach(() => {
    const stores = new Map();
    mockCaches = {
      open: async (name) => {
        if (!stores.has(name)) stores.set(name, createMockCacheStore());
        return stores.get(name);
      },
      delete: async (name) => stores.delete(name),
    };
    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;
    globalThis.caches = mockCaches;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
  });

  test('cache-first returns cached response when available', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', { cacheName: 'test-cf' });

    // Pre-populate cache
    const cache = await mockCaches.open('test-cf');
    const cachedResponse = { ok: true, status: 200, body: 'cached' };
    await cache.put('https://example.com/data', cachedResponse);

    const result = await strategy.fetch('https://example.com/data');
    assert.strictEqual(result, cachedResponse);
  });

  test('cache-first fetches from network on cache miss', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', { cacheName: 'test-cf2' });

    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Map(),
      clone: () => ({ body: 'cloned' }),
    };
    // Mock Headers for _cacheResponse
    globalThis.Headers = class MockHeaders extends Map {
      constructor(init) {
        super();
        if (init && typeof init.forEach === 'function') {
          init.forEach((v, k) => this.set(k, v));
        }
      }
    };
    globalThis.Response = class MockResponse {
      constructor(body, opts) {
        this.body = body;
        this.status = opts.status;
        this.statusText = opts.statusText;
        this.headers = opts.headers;
      }
    };

    globalThis.fetch = async () => mockResponse;
    globalThis.Request = class MockRequest {
      constructor(url) { this.url = url; }
    };

    const result = await strategy.fetch(new Request('https://example.com/data'));
    assert.strictEqual(result.ok, true);

    delete globalThis.Headers;
    delete globalThis.Response;
    delete globalThis.Request;
  });

  test('network-only always fetches from network', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-only', { cacheName: 'test-no' });

    const mockResponse = { ok: true, status: 200 };
    globalThis.fetch = async () => mockResponse;

    const result = await strategy.fetch({ url: 'https://example.com/api' });
    assert.strictEqual(result, mockResponse);
  });

  test('cache-only returns cached response', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-only', { cacheName: 'test-co' });

    const cache = await mockCaches.open('test-co');
    const cachedResponse = { ok: true, data: 'cached' };
    await cache.put('https://example.com/page', cachedResponse);

    const result = await strategy.fetch({ url: 'https://example.com/page' });
    assert.strictEqual(result, cachedResponse);
  });

  test('cache-only throws when no cache entry', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-only', { cacheName: 'test-co2' });

    await assert.rejects(
      () => strategy.fetch({ url: 'https://example.com/missing' }),
      /No cache entry/
    );
  });

  test('precache adds URLs to cache', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', { cacheName: 'test-pre' });

    await strategy.precache(['https://example.com/a', 'https://example.com/b']);

    const cache = await mockCaches.open('test-pre');
    const a = await cache.match('https://example.com/a');
    assert.ok(a);
  });

  test('clearCache deletes the cache', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('cache-first', { cacheName: 'test-clear' });

    const cache = await mockCaches.open('test-clear');
    await cache.put('key', 'value');

    await strategy.clearCache();

    // Cache store should be deleted
    // (re-opening creates a new empty one)
  });

  test('network-first falls back to cache on fetch error', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-first', {
      cacheName: 'test-nf',
      timeout: 100,
    });

    // Pre-populate cache
    const cache = await mockCaches.open('test-nf');
    await cache.put('https://example.com/data', { ok: true, cached: true });

    globalThis.fetch = async () => { throw new Error('Network error'); };
    globalThis.AbortController = class MockAbortController {
      constructor() { this.signal = {}; }
      abort() {}
    };

    const result = await strategy.fetch({ url: 'https://example.com/data' });
    assert.strictEqual(result.cached, true);

    delete globalThis.AbortController;
  });

  test('network-first throws when both network and cache fail', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-first', {
      cacheName: 'test-nf2',
      timeout: 100,
    });

    globalThis.fetch = async () => { throw new Error('Network error'); };
    globalThis.AbortController = class MockAbortController {
      constructor() { this.signal = {}; }
      abort() {}
    };

    await assert.rejects(
      () => strategy.fetch({ url: 'https://example.com/missing' }),
      /Network request failed/
    );

    delete globalThis.AbortController;
  });

  test('stale-while-revalidate returns cached and revalidates', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('stale-while-revalidate', { cacheName: 'test-swr' });

    const cache = await mockCaches.open('test-swr');
    const cachedResponse = { ok: true, status: 200, data: 'stale' };
    await cache.put('https://example.com/data', cachedResponse);

    // Mock fetch for background revalidation
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      clone: () => ({ body: 'fresh' }),
    });
    globalThis.Headers = class MockHeaders extends Map {};
    globalThis.Response = class MockResponse {
      constructor(body, opts) { this.body = body; }
    };

    const result = await strategy.fetch({ url: 'https://example.com/data' });
    // Should return stale cached response immediately
    assert.strictEqual(result.data, 'stale');

    delete globalThis.Headers;
    delete globalThis.Response;
  });

  test('handle method uses respondWith for matching request', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-only', { cacheName: 'test-handle' });

    let respondedWith = false;
    globalThis.fetch = async () => ({ ok: true });

    const event = {
      request: { url: 'https://example.com/any' },
      respondWith: (promise) => {
        respondedWith = true;
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      },
    };

    const handled = strategy.handle(event);
    assert.strictEqual(handled, true);
    assert.ok(respondedWith);
  });

  test('fetch method wraps string URL in Request', async () => {
    const { createCacheStrategy } = await import('../sw/index.js');
    const strategy = createCacheStrategy('network-only', { cacheName: 'test-str' });

    globalThis.fetch = async (req) => ({ ok: true, url: typeof req === 'string' ? req : req.url });
    globalThis.Request = class MockRequest {
      constructor(url) { this.url = url; }
    };

    const result = await strategy.fetch('https://example.com/api');
    assert.strictEqual(result.ok, true);

    delete globalThis.Request;
  });
});
