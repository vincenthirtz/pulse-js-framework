/**
 * SSR Preload Hints Tests
 *
 * Comprehensive tests for preload hint generation:
 * parseBuildManifest, getRoutePreloads, generatePreloadHints,
 * hintsToHTML, createPreloadMiddleware, and adjacent route discovery.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  parseBuildManifest,
  getRoutePreloads,
  generatePreloadHints,
  hintsToHTML,
  createPreloadMiddleware
} from '../runtime/ssr-preload.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestManifest() {
  return {
    base: '/static',
    routes: {
      '/': {
        entry: '/assets/main.js',
        css: ['/assets/main.css'],
        imports: ['shared']
      },
      '/about': {
        entry: '/assets/about.js',
        css: ['/assets/about.css'],
        lazy: true
      },
      '/dashboard': {
        entry: '/assets/dashboard.js',
        css: ['/assets/dashboard.css', '/assets/dashboard-widgets.css'],
        lazy: true,
        imports: ['chart-lib']
      },
      '/settings': {
        entry: '/assets/settings.js',
        lazy: true
      },
      '/dashboard/analytics': {
        entry: '/assets/analytics.js',
        lazy: true
      }
    },
    chunks: {
      shared: '/assets/shared-abc123.js',
      'chart-lib': '/assets/chart-lib-def456.js'
    }
  };
}

// ============================================================================
// parseBuildManifest Tests
// ============================================================================

describe('parseBuildManifest', () => {
  test('parses a JSON string into an object', () => {
    const json = '{"routes":{"/":{"entry":"main.js"}},"base":"/"}';
    const result = parseBuildManifest(json);

    assert.deepStrictEqual(result.routes['/'], { entry: 'main.js' });
    assert.strictEqual(result.base, '/');
  });

  test('returns object as-is when already parsed', () => {
    const manifest = { routes: { '/': { entry: 'main.js' } } };
    const result = parseBuildManifest(manifest);

    assert.strictEqual(result, manifest);
  });

  test('handles complex JSON string', () => {
    const manifest = createTestManifest();
    const json = JSON.stringify(manifest);
    const result = parseBuildManifest(json);

    assert.deepStrictEqual(result.routes['/'], manifest.routes['/']);
    assert.strictEqual(result.base, '/static');
  });

  test('throws on invalid JSON string', () => {
    assert.throws(() => parseBuildManifest('not valid json'));
  });

  test('handles empty object', () => {
    const result = parseBuildManifest({});
    assert.deepStrictEqual(result, {});
  });

  test('handles manifest with only base', () => {
    const result = parseBuildManifest({ base: '/cdn' });
    assert.strictEqual(result.base, '/cdn');
  });
});

// ============================================================================
// getRoutePreloads Tests
// ============================================================================

describe('getRoutePreloads', () => {
  test('returns empty array when manifest has no routes', () => {
    const hints = getRoutePreloads({}, '/');
    assert.deepStrictEqual(hints, []);
  });

  test('returns empty array for unknown route', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/nonexistent', { prefetchAdjacent: false });

    // Should still include shared chunks
    const entryHints = hints.filter(h => h.rel === 'modulepreload' && !h.href.includes('shared') && !h.href.includes('chart-lib'));
    assert.strictEqual(entryHints.length, 0);
  });

  test('generates modulepreload for route entry JS', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    assert.ok(hints.some(h =>
      h.rel === 'modulepreload' &&
      h.href === '/static/assets/main.js'
    ));
  });

  test('generates preload for route CSS files', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    assert.ok(hints.some(h =>
      h.rel === 'preload' &&
      h.as === 'style' &&
      h.href === '/static/assets/main.css'
    ));
  });

  test('generates modulepreload for route imports', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    // 'shared' import should resolve to chunk path
    assert.ok(hints.some(h =>
      h.rel === 'modulepreload' &&
      h.href === '/static/assets/shared-abc123.js'
    ));
  });

  test('generates multiple CSS hints when route has multiple CSS files', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/dashboard', { prefetchAdjacent: false });

    const cssHints = hints.filter(h => h.rel === 'preload' && h.as === 'style');
    assert.ok(cssHints.length >= 2);
    assert.ok(cssHints.some(h => h.href.includes('dashboard.css')));
    assert.ok(cssHints.some(h => h.href.includes('dashboard-widgets.css')));
  });

  test('includes shared chunks', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/about', { prefetchAdjacent: false });

    // Should include shared chunks
    assert.ok(hints.some(h => h.href.includes('shared-abc123.js')));
  });

  test('does not duplicate shared chunk hints', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    // shared chunk appears in route imports AND in chunks
    // should only appear once
    const sharedHints = hints.filter(h => h.href.includes('shared-abc123.js'));
    assert.strictEqual(sharedHints.length, 1);
  });

  test('applies base URL to all hints', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    for (const hint of hints) {
      assert.ok(hint.href.startsWith('/static'), `Expected href to start with /static: ${hint.href}`);
    }
  });

  test('uses empty base when not specified', () => {
    const manifest = {
      routes: {
        '/': { entry: '/assets/main.js' }
      }
    };
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    assert.ok(hints.some(h => h.href === '/assets/main.js'));
  });

  test('prefetches adjacent lazy routes by default', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/');

    // /about and /dashboard and /settings are at depth 1 (adjacent to /)
    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    assert.ok(prefetchHints.length > 0);
    assert.ok(prefetchHints.every(h => h.as === 'script'));
  });

  test('does not prefetch adjacent routes when disabled', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', { prefetchAdjacent: false });

    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    assert.strictEqual(prefetchHints.length, 0);
  });

  test('uses explicit adjacentRoutes when provided', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/', {
      adjacentRoutes: ['/about']
    });

    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    assert.ok(prefetchHints.some(h => h.href.includes('about')));
  });

  test('only prefetches lazy routes', () => {
    const manifest = createTestManifest();
    // Root route is NOT lazy, so it should not appear in prefetch
    const hints = getRoutePreloads(manifest, '/about', {
      adjacentRoutes: ['/']
    });

    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    // '/' is not lazy, so should not be prefetched
    assert.ok(!prefetchHints.some(h => h.href.includes('main.js')));
  });

  test('handles route with no CSS', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/settings', { prefetchAdjacent: false });

    const cssHints = hints.filter(h => h.rel === 'preload' && h.as === 'style');
    // /settings has no CSS in the fixture
    assert.ok(!cssHints.some(h => h.href.includes('settings')));
  });

  test('handles route with no imports', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/about', { prefetchAdjacent: false });

    // /about has no imports; should still include entry and CSS
    assert.ok(hints.some(h => h.href.includes('about.js')));
  });
});

// ============================================================================
// generatePreloadHints Tests
// ============================================================================

describe('generatePreloadHints', () => {
  test('returns HTML string with link tags', () => {
    const manifest = createTestManifest();
    const html = generatePreloadHints(manifest, '/', { prefetchAdjacent: false });

    assert.ok(typeof html === 'string');
    assert.ok(html.includes('<link'));
    assert.ok(html.includes('rel="modulepreload"'));
  });

  test('accepts JSON string manifest', () => {
    const manifest = createTestManifest();
    const json = JSON.stringify(manifest);
    const html = generatePreloadHints(json, '/', { prefetchAdjacent: false });

    assert.ok(html.includes('<link'));
    assert.ok(html.includes('main.js'));
  });

  test('returns empty string for empty manifest', () => {
    const html = generatePreloadHints({}, '/');
    assert.strictEqual(html, '');
  });

  test('includes CSS preload hints as style type', () => {
    const manifest = createTestManifest();
    const html = generatePreloadHints(manifest, '/', { prefetchAdjacent: false });

    assert.ok(html.includes('rel="preload"'));
    assert.ok(html.includes('as="style"'));
    assert.ok(html.includes('main.css'));
  });

  test('includes prefetch hints for adjacent routes', () => {
    const manifest = createTestManifest();
    const html = generatePreloadHints(manifest, '/');

    assert.ok(html.includes('rel="prefetch"'));
    assert.ok(html.includes('as="script"'));
  });
});

// ============================================================================
// hintsToHTML Tests
// ============================================================================

describe('hintsToHTML', () => {
  test('returns empty string for empty array', () => {
    assert.strictEqual(hintsToHTML([]), '');
  });

  test('returns empty string for null', () => {
    assert.strictEqual(hintsToHTML(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(hintsToHTML(undefined), '');
  });

  test('generates link tag with rel and href', () => {
    const html = hintsToHTML([{
      href: '/assets/main.js',
      rel: 'modulepreload'
    }]);

    assert.ok(html.includes('<link'));
    assert.ok(html.includes('rel="modulepreload"'));
    assert.ok(html.includes('href="/assets/main.js"'));
  });

  test('includes as attribute when present', () => {
    const html = hintsToHTML([{
      href: '/assets/style.css',
      rel: 'preload',
      as: 'style'
    }]);

    assert.ok(html.includes('as="style"'));
  });

  test('includes type attribute when present', () => {
    const html = hintsToHTML([{
      href: '/fonts/font.woff2',
      rel: 'preload',
      as: 'font',
      type: 'font/woff2'
    }]);

    assert.ok(html.includes('type="font/woff2"'));
  });

  test('includes crossorigin attribute when true', () => {
    const html = hintsToHTML([{
      href: '/fonts/font.woff2',
      rel: 'preload',
      as: 'font',
      crossorigin: true
    }]);

    assert.ok(html.includes('crossorigin'));
  });

  test('does not include crossorigin when false', () => {
    const html = hintsToHTML([{
      href: '/assets/main.js',
      rel: 'modulepreload',
      crossorigin: false
    }]);

    assert.ok(!html.includes('crossorigin'));
  });

  test('joins multiple hints with newlines', () => {
    const html = hintsToHTML([
      { href: '/a.js', rel: 'modulepreload' },
      { href: '/b.js', rel: 'modulepreload' }
    ]);

    const lines = html.split('\n');
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('/a.js'));
    assert.ok(lines[1].includes('/b.js'));
  });

  test('escapes HTML in href values', () => {
    const html = hintsToHTML([{
      href: '/assets/file<script>.js',
      rel: 'modulepreload'
    }]);

    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  test('does not include as attribute when not present', () => {
    const html = hintsToHTML([{
      href: '/assets/main.js',
      rel: 'modulepreload'
    }]);

    assert.ok(!html.includes('as='));
  });
});

// ============================================================================
// createPreloadMiddleware Tests
// ============================================================================

describe('createPreloadMiddleware', () => {
  test('returns a function', () => {
    const middleware = createPreloadMiddleware({});
    assert.strictEqual(typeof middleware, 'function');
  });

  test('returned function accepts a route and returns HTML string', () => {
    const manifest = createTestManifest();
    const getPreloads = createPreloadMiddleware(manifest);

    const html = getPreloads('/');
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('<link'));
  });

  test('returns different hints for different routes', () => {
    const manifest = createTestManifest();
    const getPreloads = createPreloadMiddleware(manifest, { prefetchAdjacent: false });

    const homeHints = getPreloads('/');
    const aboutHints = getPreloads('/about');

    assert.ok(homeHints.includes('main.js'));
    assert.ok(aboutHints.includes('about.js'));
  });

  test('accepts JSON string manifest', () => {
    const manifest = createTestManifest();
    const json = JSON.stringify(manifest);
    const getPreloads = createPreloadMiddleware(json);

    const html = getPreloads('/');
    assert.ok(html.includes('<link'));
  });

  test('passes options through to generatePreloadHints', () => {
    const manifest = createTestManifest();
    const getPreloads = createPreloadMiddleware(manifest, { prefetchAdjacent: false });

    const html = getPreloads('/');
    assert.ok(!html.includes('rel="prefetch"'));
  });

  test('returns empty string for routes not in manifest', () => {
    const manifest = { routes: {} };
    const getPreloads = createPreloadMiddleware(manifest);

    const html = getPreloads('/nonexistent');
    assert.strictEqual(html, '');
  });
});

// ============================================================================
// Adjacent Route Discovery Tests
// ============================================================================

describe('Adjacent route discovery (via getRoutePreloads)', () => {
  test('discovers routes at the same depth', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/about');

    // /settings and /dashboard are at same depth as /about
    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    assert.ok(prefetchHints.length > 0);
  });

  test('discovers routes one level deeper', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/dashboard');

    // /dashboard/analytics is one level deeper
    const prefetchHrefs = hints.filter(h => h.rel === 'prefetch').map(h => h.href);
    assert.ok(prefetchHrefs.some(h => h.includes('analytics')));
  });

  test('limits prefetch hints to 5 max', () => {
    // Create manifest with many routes
    const manifest = {
      base: '',
      routes: {}
    };
    for (let i = 0; i < 20; i++) {
      manifest.routes[`/page${i}`] = {
        entry: `/assets/page${i}.js`,
        lazy: true
      };
    }

    const hints = getRoutePreloads(manifest, '/page0');
    const prefetchHints = hints.filter(h => h.rel === 'prefetch');
    assert.ok(prefetchHints.length <= 5);
  });

  test('does not include the current route in prefetch', () => {
    const manifest = createTestManifest();
    const hints = getRoutePreloads(manifest, '/about');

    const prefetchHrefs = hints.filter(h => h.rel === 'prefetch').map(h => h.href);
    assert.ok(!prefetchHrefs.some(h => h.includes('about')));
  });
});

console.log('SSR Preload Hints tests loaded');
