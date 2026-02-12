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
