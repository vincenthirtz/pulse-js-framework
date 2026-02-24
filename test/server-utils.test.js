/**
 * Tests for Server Utilities
 * @module test/server-utils
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  getMimeType,
  injectIntoTemplate,
  readTemplate,
  clearTemplateCache,
  resolveStaticAsset,
  createRequestContext
} from '../server/utils.js';

// Temp directory for file-based tests
const TEMP_DIR = join(import.meta.dirname, '.tmp-server-utils-test');

describe('Server Utilities', () => {
  describe('getMimeType', () => {
    test('returns correct MIME for .html', () => {
      assert.strictEqual(getMimeType('index.html'), 'text/html; charset=utf-8');
    });

    test('returns correct MIME for .js', () => {
      assert.strictEqual(getMimeType('app.js'), 'application/javascript; charset=utf-8');
    });

    test('returns correct MIME for .css', () => {
      assert.strictEqual(getMimeType('style.css'), 'text/css; charset=utf-8');
    });

    test('returns correct MIME for .json', () => {
      assert.strictEqual(getMimeType('data.json'), 'application/json; charset=utf-8');
    });

    test('returns correct MIME for .png', () => {
      assert.strictEqual(getMimeType('image.png'), 'image/png');
    });

    test('returns correct MIME for .svg', () => {
      assert.strictEqual(getMimeType('icon.svg'), 'image/svg+xml');
    });

    test('returns correct MIME for .woff2', () => {
      assert.strictEqual(getMimeType('font.woff2'), 'font/woff2');
    });

    test('returns correct MIME for .wasm', () => {
      assert.strictEqual(getMimeType('module.wasm'), 'application/wasm');
    });

    test('returns octet-stream for unknown extension', () => {
      assert.strictEqual(getMimeType('file.xyz'), 'application/octet-stream');
    });

    test('handles full path', () => {
      assert.strictEqual(getMimeType('/assets/scripts/app.mjs'), 'application/javascript; charset=utf-8');
    });

    test('is case-insensitive on extension', () => {
      assert.strictEqual(getMimeType('file.JSON'), 'application/json; charset=utf-8');
    });
  });

  describe('injectIntoTemplate', () => {
    const template = '<!DOCTYPE html><html><head></head><body><!--app-html--><!--app-state--></body></html>';

    test('injects app HTML', () => {
      const result = injectIntoTemplate(template, { html: '<div>App</div>' });
      assert.ok(result.includes('<div>App</div>'));
      assert.ok(!result.includes('<!--app-html-->'));
    });

    test('injects state', () => {
      const state = '<script>window.__STATE__={}</script>';
      const result = injectIntoTemplate(template, { state });
      assert.ok(result.includes(state));
      assert.ok(!result.includes('<!--app-state-->'));
    });

    test('injects head content', () => {
      const head = '<link rel="preload" href="/app.js" as="script">';
      const result = injectIntoTemplate(template, { head });
      assert.ok(result.includes(head));
      assert.ok(result.includes('</head>'));
    });

    test('injects body attributes', () => {
      const result = injectIntoTemplate(template, { bodyAttrs: 'class="dark"' });
      assert.ok(result.includes('<body class="dark">'));
    });

    test('handles empty options', () => {
      const result = injectIntoTemplate(template);
      assert.strictEqual(typeof result, 'string');
    });

    test('injects all options simultaneously', () => {
      const result = injectIntoTemplate(template, {
        html: '<div>App</div>',
        state: '<script>state</script>',
        head: '<meta name="test">',
        bodyAttrs: 'data-theme="dark"'
      });
      assert.ok(result.includes('<div>App</div>'));
      assert.ok(result.includes('<script>state</script>'));
      assert.ok(result.includes('<meta name="test">'));
      assert.ok(result.includes('data-theme="dark"'));
    });
  });

  describe('readTemplate / clearTemplateCache', () => {
    beforeEach(() => {
      clearTemplateCache();
      mkdirSync(TEMP_DIR, { recursive: true });
    });

    afterEach(() => {
      clearTemplateCache();
      rmSync(TEMP_DIR, { recursive: true, force: true });
    });

    test('reads template file', () => {
      const path = join(TEMP_DIR, 'test.html');
      writeFileSync(path, '<html><!--app-html--></html>');
      const content = readTemplate(path);
      assert.ok(content.includes('<!--app-html-->'));
    });

    test('caches template on second read', () => {
      const path = join(TEMP_DIR, 'cached.html');
      writeFileSync(path, '<html>cached</html>');
      const first = readTemplate(path);
      // Modify file after first read (should get cached version)
      writeFileSync(path, '<html>modified</html>');
      const second = readTemplate(path);
      assert.strictEqual(first, second);
    });

    test('clearTemplateCache clears the cache', () => {
      const path = join(TEMP_DIR, 'clear.html');
      writeFileSync(path, '<html>v1</html>');
      readTemplate(path);
      clearTemplateCache();
      writeFileSync(path, '<html>v2</html>');
      const content = readTemplate(path);
      assert.ok(content.includes('v2'));
    });

    test('throws on non-existent file', () => {
      assert.throws(
        () => readTemplate('/nonexistent/path/template.html'),
        /Template not found/
      );
    });
  });

  describe('resolveStaticAsset', () => {
    beforeEach(() => {
      mkdirSync(join(TEMP_DIR, 'assets'), { recursive: true });
      writeFileSync(join(TEMP_DIR, 'index.html'), '<html></html>');
      writeFileSync(join(TEMP_DIR, 'assets', 'app.js'), 'console.log("app")');
      writeFileSync(join(TEMP_DIR, 'assets', 'app.abc12345.js'), 'console.log("hashed")');
    });

    afterEach(() => {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    });

    test('resolves existing file', () => {
      const result = resolveStaticAsset('index.html', TEMP_DIR);
      assert.ok(result);
      assert.strictEqual(result.status, 200);
      assert.ok(result.mimeType.includes('text/html'));
    });

    test('resolves nested file', () => {
      const result = resolveStaticAsset('assets/app.js', TEMP_DIR);
      assert.ok(result);
      assert.ok(result.mimeType.includes('javascript'));
    });

    test('returns null for non-existent file', () => {
      const result = resolveStaticAsset('nonexistent.js', TEMP_DIR);
      assert.strictEqual(result, null);
    });

    test('prevents directory traversal with ../', () => {
      const result = resolveStaticAsset('../../../etc/passwd', TEMP_DIR);
      assert.strictEqual(result, null);
    });

    test('includes Content-Type header', () => {
      const result = resolveStaticAsset('assets/app.js', TEMP_DIR);
      assert.ok(result.headers['Content-Type'].includes('javascript'));
    });

    test('includes Content-Length header', () => {
      const result = resolveStaticAsset('assets/app.js', TEMP_DIR);
      assert.ok(result.headers['Content-Length']);
      assert.ok(parseInt(result.headers['Content-Length']) > 0);
    });

    test('hashed assets get long cache with immutable', () => {
      const result = resolveStaticAsset('assets/app.abc12345.js', TEMP_DIR);
      assert.ok(result);
      assert.ok(result.headers['Cache-Control'].includes('immutable'));
      assert.ok(result.headers['Cache-Control'].includes('31536000'));
    });

    test('non-hashed assets get shorter cache', () => {
      const result = resolveStaticAsset('assets/app.js', TEMP_DIR);
      assert.ok(result);
      assert.ok(result.headers['Cache-Control'].includes('3600'));
      assert.ok(!result.headers['Cache-Control'].includes('immutable'));
    });
  });

  describe('createRequestContext', () => {
    test('creates context from express request', () => {
      const req = {
        originalUrl: '/api/users?page=1',
        path: '/api/users',
        query: { page: '1' },
        method: 'GET',
        headers: { host: 'localhost:3000' }
      };
      const ctx = createRequestContext(req, 'express');
      assert.strictEqual(ctx.url, '/api/users?page=1');
      assert.strictEqual(ctx.pathname, '/api/users');
      assert.deepStrictEqual(ctx.query, { page: '1' });
      assert.strictEqual(ctx.method, 'GET');
    });

    test('creates context from hono request', () => {
      const req = {
        url: 'http://localhost:3000/api/users?page=2',
        method: 'POST',
        headers: new Map([['content-type', 'application/json']])
      };
      const ctx = createRequestContext(req, 'hono');
      assert.strictEqual(ctx.pathname, '/api/users');
      assert.strictEqual(ctx.query.page, '2');
      assert.strictEqual(ctx.method, 'POST');
    });

    test('creates context from fastify request', () => {
      const req = {
        url: '/api/users?sort=name',
        routeOptions: { url: '/api/users' },
        query: { sort: 'name' },
        method: 'GET',
        headers: { accept: 'application/json' }
      };
      const ctx = createRequestContext(req, 'fastify');
      assert.strictEqual(ctx.pathname, '/api/users');
      assert.deepStrictEqual(ctx.query, { sort: 'name' });
    });

    test('creates generic context as default', () => {
      const req = { url: '/test', method: 'DELETE', headers: {} };
      const ctx = createRequestContext(req);
      assert.strictEqual(ctx.pathname, '/test');
      assert.strictEqual(ctx.method, 'DELETE');
    });

    test('handles missing fields gracefully', () => {
      const ctx = createRequestContext({});
      assert.strictEqual(typeof ctx.url, 'string');
      assert.strictEqual(typeof ctx.pathname, 'string');
      assert.strictEqual(ctx.method, 'GET');
      assert.ok(ctx.headers);
    });
  });
});
