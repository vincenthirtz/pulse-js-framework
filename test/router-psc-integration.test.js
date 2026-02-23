/**
 * Router PSC Integration Tests
 *
 * Tests for PSC cache, navigation, and prefetching
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  pscCache,
  fetchPSCPayload,
  navigatePSC,
  prefetchPSC,
  clearPSCCache,
  getPSCCacheStats,
  configurePSCCache
} from '../runtime/router/psc-integration.js';

// ============================================================
// Mock Fetch
// ============================================================

let originalFetch;
let fetchCallCount = 0;
let lastFetchUrl = null;
let lastFetchOptions = null;

beforeEach(() => {
  // Save original fetch
  originalFetch = global.fetch;
  fetchCallCount = 0;
  lastFetchUrl = null;
  lastFetchOptions = null;

  // Mock fetch
  global.fetch = async (url, options) => {
    fetchCallCount++;
    lastFetchUrl = url;
    lastFetchOptions = options;

    // Handle timeout test
    if (url.includes('/timeout')) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { ok: false, status: 408, statusText: 'Request Timeout' };
    }

    // Handle not-found test
    if (url.includes('/not-found')) {
      return { ok: false, status: 404, statusText: 'Not Found' };
    }

    // Default: return success for all other URLs
    return {
      ok: true,
      status: 200,
      json: async () => ({
        root: { type: 'element', tag: 'div', props: {}, children: [] },
        clientManifest: {},
        state: {}
      })
    };
  };

  // Clear cache before each test
  clearPSCCache();
});

afterEach(() => {
  // Restore original fetch
  global.fetch = originalFetch;
  clearPSCCache();
});

// ============================================================
// PSCCache Tests
// ============================================================

describe('Router PSC Integration - PSCCache', () => {
  test('stores and retrieves entries', () => {
    const cache = new (pscCache.constructor)(3); // Max 3 items

    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    assert.deepStrictEqual(cache.get('key1'), { data: 'value1' });
    assert.deepStrictEqual(cache.get('key2'), { data: 'value2' });
  });

  test('returns null for non-existent key', () => {
    const cache = new (pscCache.constructor)(3);
    assert.strictEqual(cache.get('unknown'), null);
  });

  test('evicts oldest entry on overflow', () => {
    const cache = new (pscCache.constructor)(2); // Max 2 items

    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.set('key3', { data: 'value3' }); // Should evict key1

    assert.strictEqual(cache.get('key1'), null);
    assert.deepStrictEqual(cache.get('key2'), { data: 'value2' });
    assert.deepStrictEqual(cache.get('key3'), { data: 'value3' });
  });

  test('LRU behavior - accessing entry moves it to most recent', () => {
    const cache = new (pscCache.constructor)(2);

    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.get('key1'); // Access key1, making it most recent
    cache.set('key3', { data: 'value3' }); // Should evict key2 (least recent)

    assert.deepStrictEqual(cache.get('key1'), { data: 'value1' });
    assert.strictEqual(cache.get('key2'), null); // Evicted
    assert.deepStrictEqual(cache.get('key3'), { data: 'value3' });
  });

  test('has() checks key existence', () => {
    const cache = new (pscCache.constructor)(3);

    cache.set('key1', { data: 'value1' });

    assert.strictEqual(cache.has('key1'), true);
    assert.strictEqual(cache.has('unknown'), false);
  });

  test('clear() removes all entries', () => {
    const cache = new (pscCache.constructor)(3);

    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });

    cache.clear();

    assert.strictEqual(cache.size, 0);
    assert.strictEqual(cache.get('key1'), null);
    assert.strictEqual(cache.get('key2'), null);
  });

  test('size property returns entry count', () => {
    const cache = new (pscCache.constructor)(5);

    assert.strictEqual(cache.size, 0);

    cache.set('key1', { data: 'value1' });
    assert.strictEqual(cache.size, 1);

    cache.set('key2', { data: 'value2' });
    assert.strictEqual(cache.size, 2);

    cache.clear();
    assert.strictEqual(cache.size, 0);
  });

  test('updating existing key does not increase size', () => {
    const cache = new (pscCache.constructor)(5);

    cache.set('key1', { data: 'value1' });
    assert.strictEqual(cache.size, 1);

    cache.set('key1', { data: 'updated' });
    assert.strictEqual(cache.size, 1);
    assert.deepStrictEqual(cache.get('key1'), { data: 'updated' });
  });
});

// ============================================================
// fetchPSCPayload Tests
// ============================================================

describe('Router PSC Integration - fetchPSCPayload', () => {
  test('sends correct headers', async () => {
    await fetchPSCPayload('/test');

    assert.strictEqual(lastFetchOptions.headers['Accept'], 'application/x-pulse-psc');
    assert.strictEqual(lastFetchOptions.headers['X-Pulse-Request'], 'navigation');
  });

  test('appends query parameters to URL', async () => {
    await fetchPSCPayload('/products', {
      query: { tab: 'reviews', sort: 'newest' }
    });

    assert.ok(lastFetchUrl.includes('tab=reviews'));
    assert.ok(lastFetchUrl.includes('sort=newest'));
  });

  test('returns parsed JSON payload', async () => {
    const payload = await fetchPSCPayload('/products/123');

    assert.ok(payload.root);
    assert.strictEqual(payload.root.type, 'element');
    assert.ok(payload.clientManifest);
    assert.ok(payload.state);
  });

  test('throws on error response', async () => {
    await assert.rejects(
      fetchPSCPayload('/not-found'),
      /PSC fetch failed: 404 Not Found/
    );
  });

  test('supports abort signal', async () => {
    const controller = new AbortController();

    const promise = fetchPSCPayload('/products/123', {
      signal: controller.signal
    });

    // Abort immediately (fetch mock doesn't actually abort, but signal is passed)
    controller.abort();

    // Fetch should still complete in mock, but signal was passed
    await promise;
    assert.ok(lastFetchOptions.signal);
  });

  test('handles empty query object', async () => {
    await fetchPSCPayload('/test', { query: {} });

    assert.strictEqual(lastFetchUrl, '/test');
  });
});

// ============================================================
// navigatePSC Tests
// ============================================================

describe('Router PSC Integration - navigatePSC', () => {
  test('fetches and caches payload', async () => {
    const payload = await navigatePSC('/products/123', {
      cacheKey: 'products-123'
    });

    assert.ok(payload.root);
    assert.ok(pscCache.has('products-123'));
    assert.strictEqual(fetchCallCount, 1);
  });

  test('returns cached payload when fresh', async () => {
    // First fetch
    await navigatePSC('/products/123', {
      cacheKey: 'test-key',
      staleTime: 10000 // 10s
    });

    assert.strictEqual(fetchCallCount, 1);

    // Second fetch should use cache
    const payload = await navigatePSC('/products/123', {
      cacheKey: 'test-key',
      staleTime: 10000
    });

    assert.strictEqual(fetchCallCount, 1, 'Should use cached payload');
    assert.ok(payload.root);
  });

  test('refetches when cache is stale', async (t) => {
    // First fetch
    await navigatePSC('/products/123', {
      cacheKey: 'stale-key',
      staleTime: 10 // 10ms
    });

    assert.strictEqual(fetchCallCount, 1);

    // Wait for cache to become stale
    await new Promise(resolve => setTimeout(resolve, 20));

    // Second fetch should refetch
    await navigatePSC('/products/123', {
      cacheKey: 'stale-key',
      staleTime: 10
    });

    assert.strictEqual(fetchCallCount, 2, 'Should refetch stale cache');
  });

  test('auto-generates cache key from URL and query', async () => {
    await navigatePSC('/products/123', {
      query: { tab: 'reviews' }
    });

    const expectedKey = '/products/123' + JSON.stringify({ tab: 'reviews' });
    assert.ok(pscCache.has(expectedKey));
  });

  test('passes query parameters to fetch', async () => {
    await navigatePSC('/products', {
      query: { category: 'electronics', sort: 'price' }
    });

    assert.ok(lastFetchUrl.includes('category=electronics'));
    assert.ok(lastFetchUrl.includes('sort=price'));
  });

  test('handles fetch errors', async () => {
    await assert.rejects(
      navigatePSC('/not-found'),
      /PSC fetch failed: 404/
    );
  });

  test('default staleTime is 60 seconds', async () => {
    // First fetch
    await navigatePSC('/products/123', {
      cacheKey: 'default-stale'
    });

    const cached = pscCache.get('default-stale');
    assert.ok(cached.timestamp);

    // Immediate second fetch should use cache (default 60s staleTime)
    await navigatePSC('/products/123', {
      cacheKey: 'default-stale'
    });

    assert.strictEqual(fetchCallCount, 1, 'Should use cache with default staleTime');
  });
});

// ============================================================
// prefetchPSC Tests
// ============================================================

describe('Router PSC Integration - prefetchPSC', () => {
  test('fetches and caches payload in background', async () => {
    await prefetchPSC('/products/123');

    const expectedKey = '/products/123{}';
    assert.ok(pscCache.has(expectedKey));
    assert.strictEqual(fetchCallCount, 1);
  });

  test('deduplicates concurrent prefetches', async () => {
    // Start multiple prefetches for same URL
    const p1 = prefetchPSC('/products/123', { query: { tab: 'reviews' } });
    const p2 = prefetchPSC('/products/123', { query: { tab: 'reviews' } });
    const p3 = prefetchPSC('/products/123', { query: { tab: 'reviews' } });

    await Promise.all([p1, p2, p3]);

    // Should only fetch once
    assert.strictEqual(fetchCallCount, 1);
  });

  test('skips prefetch if already cached', async () => {
    // First prefetch
    await prefetchPSC('/products/123');
    assert.strictEqual(fetchCallCount, 1);

    // Second prefetch should skip (already cached)
    await prefetchPSC('/products/123');
    assert.strictEqual(fetchCallCount, 1, 'Should skip prefetch for cached entry');
  });

  test('handles prefetch errors gracefully', async () => {
    // Should not throw
    await prefetchPSC('/not-found');

    // Error logged to console.warn, but promise resolves
    assert.strictEqual(fetchCallCount, 1);
  });

  test('supports query parameters', async () => {
    await prefetchPSC('/products', {
      query: { category: 'books' }
    });

    assert.ok(lastFetchUrl.includes('category=books'));
  });

  test('returns resolved promise', async () => {
    const result = await prefetchPSC('/products/123');
    assert.strictEqual(result, undefined);
  });
});

// ============================================================
// Cache Management Tests
// ============================================================

describe('Router PSC Integration - Cache Management', () => {
  test('clearPSCCache removes all entries', () => {
    pscCache.set('key1', { data: 'value1' });
    pscCache.set('key2', { data: 'value2' });

    assert.strictEqual(pscCache.size, 2);

    clearPSCCache();

    assert.strictEqual(pscCache.size, 0);
    assert.strictEqual(pscCache.get('key1'), null);
    assert.strictEqual(pscCache.get('key2'), null);
  });

  test('getPSCCacheStats returns cache statistics', async () => {
    pscCache.set('key1', { data: 'value1' });
    pscCache.set('key2', { data: 'value2' });

    const stats = getPSCCacheStats();

    assert.strictEqual(stats.size, 2);
    assert.strictEqual(stats.maxSize, 50); // Default max size
    assert.strictEqual(typeof stats.prefetching, 'number');
  });

  test('configurePSCCache updates max size', () => {
    configurePSCCache({ maxSize: 10 });

    const stats = getPSCCacheStats();
    assert.strictEqual(stats.maxSize, 10);
  });

  test('configurePSCCache preserves existing entries up to new max size', () => {
    // Add 5 entries
    pscCache.set('key1', { data: 'value1' });
    pscCache.set('key2', { data: 'value2' });
    pscCache.set('key3', { data: 'value3' });
    pscCache.set('key4', { data: 'value4' });
    pscCache.set('key5', { data: 'value5' });

    // Reduce max size to 3
    configurePSCCache({ maxSize: 3 });

    // Should keep only 3 entries (first 3)
    assert.strictEqual(pscCache.size, 3);
    assert.ok(pscCache.has('key1'));
    assert.ok(pscCache.has('key2'));
    assert.ok(pscCache.has('key3'));
  });
});

// ============================================================
// Integration Tests
// ============================================================

describe('Router PSC Integration - End-to-End', () => {
  test('navigate → cache → navigate again (cache hit)', async () => {
    // First navigation
    const payload1 = await navigatePSC('/products/123', {
      cacheKey: 'products-123',
      staleTime: 10000
    });

    assert.strictEqual(fetchCallCount, 1);
    assert.ok(payload1.root);

    // Second navigation (should use cache)
    const payload2 = await navigatePSC('/products/123', {
      cacheKey: 'products-123',
      staleTime: 10000
    });

    assert.strictEqual(fetchCallCount, 1, 'Should use cache');
    assert.deepStrictEqual(payload2, payload1);
  });

  test('prefetch → navigate (cache hit)', async () => {
    // Prefetch
    await prefetchPSC('/products/123');
    assert.strictEqual(fetchCallCount, 1);

    // Navigate (should use prefetched cache)
    await navigatePSC('/products/123');
    assert.strictEqual(fetchCallCount, 1, 'Should use prefetched cache');
  });

  test('navigate with different query params creates separate cache entries', async () => {
    await navigatePSC('/products', { query: { tab: 'reviews' } });
    await navigatePSC('/products', { query: { tab: 'specs' } });

    assert.strictEqual(fetchCallCount, 2, 'Different queries should fetch separately');

    const key1 = '/products' + JSON.stringify({ tab: 'reviews' });
    const key2 = '/products' + JSON.stringify({ tab: 'specs' });

    assert.ok(pscCache.has(key1));
    assert.ok(pscCache.has(key2));
  });

  test('cache eviction on overflow', async () => {
    // Set small cache size
    configurePSCCache({ maxSize: 2 });

    // Navigate to 3 different URLs
    await navigatePSC('/page1', { cacheKey: 'page1' });
    await navigatePSC('/page2', { cacheKey: 'page2' });
    await navigatePSC('/page3', { cacheKey: 'page3' }); // Should evict page1

    assert.strictEqual(pscCache.size, 2);
    assert.strictEqual(pscCache.has('page1'), false, 'Oldest should be evicted');
    assert.ok(pscCache.has('page2'));
    assert.ok(pscCache.has('page3'));

    // Reset to default
    configurePSCCache({ maxSize: 50 });
  });
});
