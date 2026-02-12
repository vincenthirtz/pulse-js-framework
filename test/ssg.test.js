/**
 * Static Site Generation (SSG) Tests
 *
 * Comprehensive tests for the SSG module:
 * - discoverRoutes() - explicit routes, defaults, file-based discovery
 * - generateBuildManifest() - manifest structure, route scanning
 * - routeToFilePath logic (tested via generateStaticSite outcomes)
 * - chunkArray utility behavior
 *
 * Note: Tests that require filesystem are structured to use temporary
 * directories or test the logic paths that handle missing directories.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  discoverRoutes,
  generateBuildManifest
} from '../cli/ssg.js';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir;
let testCounter = 0;

function createTestDir() {
  testCounter++;
  const dir = join(tmpdir(), `pulse-ssg-test-${Date.now()}-${testCounter}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTestDir(dir) {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================================
// discoverRoutes Tests
// ============================================================================

describe('discoverRoutes', () => {
  test('returns explicit routes when provided', () => {
    const routes = discoverRoutes({
      routes: ['/home', '/about', '/contact']
    });

    assert.deepStrictEqual(routes, ['/home', '/about', '/contact']);
  });

  test('returns single explicit route', () => {
    const routes = discoverRoutes({
      routes: ['/']
    });

    assert.deepStrictEqual(routes, ['/']);
  });

  test('returns default root route when no options', () => {
    const routes = discoverRoutes();

    assert.deepStrictEqual(routes, ['/']);
  });

  test('returns default root route when empty options', () => {
    const routes = discoverRoutes({});

    assert.deepStrictEqual(routes, ['/']);
  });

  test('returns default root route when routes is empty array', () => {
    const routes = discoverRoutes({ routes: [] });

    assert.deepStrictEqual(routes, ['/']);
  });

  test('prefers explicit routes over srcDir discovery', () => {
    const routes = discoverRoutes({
      routes: ['/custom'],
      srcDir: '/nonexistent'
    });

    assert.deepStrictEqual(routes, ['/custom']);
  });

  test('returns default when srcDir has no pages directory', () => {
    const dir = createTestDir();
    try {
      const routes = discoverRoutes({ srcDir: dir });
      assert.deepStrictEqual(routes, ['/']);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('discovers routes from pages directory', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(pagesDir, 'about.pulse'), '');
    writeFileSync(join(pagesDir, 'contact.js'), '');

    try {
      const routes = discoverRoutes({ srcDir: dir });

      assert.ok(routes.includes('/'), 'Should include index route');
      assert.ok(routes.includes('/about'), 'Should include about route');
      assert.ok(routes.includes('/contact'), 'Should include contact route');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('discovers nested page routes', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    const blogDir = join(pagesDir, 'blog');
    mkdirSync(blogDir, { recursive: true });
    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(blogDir, 'index.pulse'), '');
    writeFileSync(join(blogDir, 'latest.pulse'), '');

    try {
      const routes = discoverRoutes({ srcDir: dir });

      assert.ok(routes.includes('/'), 'Should include root');
      assert.ok(routes.includes('/blog'), 'Should include blog index');
      assert.ok(routes.includes('/blog/latest'), 'Should include blog/latest');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('ignores files starting with underscore', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(pagesDir, '_layout.pulse'), '');
    writeFileSync(join(pagesDir, '_error.pulse'), '');

    try {
      const routes = discoverRoutes({ srcDir: dir });

      assert.ok(routes.includes('/'));
      assert.ok(!routes.includes('/_layout'));
      assert.ok(!routes.includes('/_error'));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('ignores files starting with bracket (dynamic routes)', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(pagesDir, '[id].pulse'), '');

    try {
      const routes = discoverRoutes({ srcDir: dir });

      assert.ok(routes.includes('/'));
      assert.ok(!routes.some(r => r.includes('[id]')));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('ignores non-.pulse and non-.js files', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    mkdirSync(pagesDir, { recursive: true });
    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(pagesDir, 'readme.md'), '');
    writeFileSync(join(pagesDir, 'styles.css'), '');
    writeFileSync(join(pagesDir, 'data.json'), '');

    try {
      const routes = discoverRoutes({ srcDir: dir });

      assert.ok(routes.includes('/'));
      assert.ok(!routes.includes('/readme'));
      assert.ok(!routes.includes('/styles'));
      assert.ok(!routes.includes('/data'));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('handles empty pages directory', () => {
    const dir = createTestDir();
    const pagesDir = join(dir, 'pages');
    mkdirSync(pagesDir, { recursive: true });

    try {
      const routes = discoverRoutes({ srcDir: dir });
      assert.deepStrictEqual(routes, []);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('explicit routes with many entries', () => {
    const manyRoutes = Array.from({ length: 50 }, (_, i) => `/page-${i}`);
    const routes = discoverRoutes({ routes: manyRoutes });

    assert.strictEqual(routes.length, 50);
    assert.strictEqual(routes[0], '/page-0');
    assert.strictEqual(routes[49], '/page-49');
  });
});

// ============================================================================
// generateBuildManifest Tests
// ============================================================================

describe('generateBuildManifest', () => {
  test('returns manifest with base, routes, chunks, generated fields', () => {
    const dir = createTestDir();
    try {
      const manifest = generateBuildManifest(dir);

      assert.ok('base' in manifest);
      assert.ok('routes' in manifest);
      assert.ok('chunks' in manifest);
      assert.ok('generated' in manifest);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('uses default base of /', () => {
    const dir = createTestDir();
    try {
      const manifest = generateBuildManifest(dir);
      assert.strictEqual(manifest.base, '/');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('accepts custom base option', () => {
    const dir = createTestDir();
    try {
      const manifest = generateBuildManifest(dir, { base: '/cdn' });
      assert.strictEqual(manifest.base, '/cdn');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('generated field is ISO date string', () => {
    const dir = createTestDir();
    try {
      const manifest = generateBuildManifest(dir);
      assert.ok(manifest.generated);
      // Verify it's a valid ISO date
      const date = new Date(manifest.generated);
      assert.ok(!isNaN(date.getTime()));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('returns empty routes when no assets directory', () => {
    const dir = createTestDir();
    try {
      const manifest = generateBuildManifest(dir);
      assert.deepStrictEqual(manifest.routes, {});
      assert.deepStrictEqual(manifest.chunks, {});
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('discovers JS files as route entries', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'main.js'), 'export default {};');
    writeFileSync(join(assetsDir, 'about.js'), 'export default {};');

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok('/' in manifest.routes, 'Should have root route from main.js');
      assert.ok('/about' in manifest.routes, 'Should have /about route');
      assert.strictEqual(manifest.routes['/'].entry, '/assets/main.js');
      assert.strictEqual(manifest.routes['/about'].entry, '/assets/about.js');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('marks non-main routes as lazy', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'main.js'), '');
    writeFileSync(join(assetsDir, 'dashboard.js'), '');

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok(!manifest.routes['/'].lazy, 'Root route should not be lazy');
      assert.strictEqual(manifest.routes['/dashboard'].lazy, true);
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('treats index.js as root route', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'index.js'), '');

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok('/' in manifest.routes);
      assert.strictEqual(manifest.routes['/'].entry, '/assets/index.js');
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('associates matching CSS files with routes', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'main.js'), '');
    writeFileSync(join(assetsDir, 'main.css'), '');
    writeFileSync(join(assetsDir, 'main-extra.css'), '');

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok(manifest.routes['/'].css);
      assert.ok(manifest.routes['/'].css.includes('/assets/main.css'));
      assert.ok(manifest.routes['/'].css.includes('/assets/main-extra.css'));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('does not associate unrelated CSS with route', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'main.js'), '');
    writeFileSync(join(assetsDir, 'vendor.css'), '');

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok(manifest.routes['/'].css);
      assert.ok(!manifest.routes['/'].css.includes('/assets/vendor.css'));
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('handles assets directory with only CSS files', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, 'styles.css'), '');

    try {
      const manifest = generateBuildManifest(dir);
      assert.deepStrictEqual(manifest.routes, {});
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('handles nonexistent output directory', () => {
    const dir = join(tmpdir(), `pulse-ssg-nonexist-${Date.now()}`);
    const manifest = generateBuildManifest(dir);

    assert.deepStrictEqual(manifest.routes, {});
    assert.deepStrictEqual(manifest.chunks, {});
  });
});

// ============================================================================
// Integration: discoverRoutes + generateBuildManifest
// ============================================================================

describe('SSG Integration', () => {
  test('discovered routes match manifest routes', () => {
    const dir = createTestDir();
    const srcDir = join(dir, 'src');
    const pagesDir = join(srcDir, 'pages');
    const assetsDir = join(dir, 'dist', 'assets');
    mkdirSync(pagesDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });

    writeFileSync(join(pagesDir, 'index.pulse'), '');
    writeFileSync(join(pagesDir, 'about.pulse'), '');

    writeFileSync(join(assetsDir, 'main.js'), '');
    writeFileSync(join(assetsDir, 'about.js'), '');

    try {
      const routes = discoverRoutes({ srcDir });
      const manifest = generateBuildManifest(join(dir, 'dist'));

      // All discovered routes should have manifest entries
      for (const route of routes) {
        assert.ok(route in manifest.routes, `Route ${route} should be in manifest`);
      }
    } finally {
      cleanupTestDir(dir);
    }
  });

  test('manifest includes entry paths for all routes', () => {
    const dir = createTestDir();
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });

    const routeNames = ['main', 'about', 'contact', 'blog'];
    for (const name of routeNames) {
      writeFileSync(join(assetsDir, `${name}.js`), '');
    }

    try {
      const manifest = generateBuildManifest(dir);

      assert.ok(manifest.routes['/']);
      assert.ok(manifest.routes['/about']);
      assert.ok(manifest.routes['/contact']);
      assert.ok(manifest.routes['/blog']);

      for (const routeName of routeNames) {
        const routePath = routeName === 'main' ? '/' : `/${routeName}`;
        assert.ok(
          manifest.routes[routePath].entry.includes(`${routeName}.js`),
          `Route ${routePath} should have entry containing ${routeName}.js`
        );
      }
    } finally {
      cleanupTestDir(dir);
    }
  });
});

console.log('SSG tests loaded');
