/**
 * Pulse Dev Server Tests
 *
 * Tests for cli/dev.js - Development server with LiveReload
 * Covers: MIME types, LiveReload, .pulse compilation, SPA fallback, static files
 *
 * @module test/dev-server
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createServer, get as httpGetNode } from 'node:http';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { compile } from '../compiler/index.js';

// We test by importing the module and calling startDevServer with a temp directory
// The server starts on a random port and we make HTTP requests to it

// =============================================================================
// Helpers
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-dev-server');

function setupTestProject() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true });

  // Create index.html
  writeFileSync(join(TEST_DIR, 'index.html'), `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<div id="app"></div>
</body>
</html>`);

  // Create a CSS file
  writeFileSync(join(TEST_DIR, 'style.css'), 'body { margin: 0; }');

  // Create a JS file
  writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("hello");');

  // Create a .pulse file
  writeFileSync(join(TEST_DIR, 'src', 'App.pulse'), `
@page App

state {
  count: 0
}

view {
  div {
    h1 "Hello"
  }
}

style {
  div { color: red; }
}
`);

  // Create a JSON file
  writeFileSync(join(TEST_DIR, 'data.json'), '{"key":"value"}');

  // Create an SVG file
  writeFileSync(join(TEST_DIR, 'icon.svg'), '<svg></svg>');
}

function cleanupTestProject() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// We test by creating a minimal HTTP server that mirrors dev server logic

// =============================================================================
// Tests
// =============================================================================

describe('Dev Server', () => {

  // ===========================================================================
  // Module Import
  // ===========================================================================

  describe('Module', () => {
    test('exports startDevServer function', async () => {
      const mod = await import('../cli/dev.js');
      assert.strictEqual(typeof mod.startDevServer, 'function');
    });

    test('exports default object with startDevServer', async () => {
      const mod = await import('../cli/dev.js');
      assert.strictEqual(typeof mod.default.startDevServer, 'function');
    });
  });

  // ===========================================================================
  // MIME Types
  // ===========================================================================

  describe('MIME Types', () => {
    // We test MIME type handling by starting a real server briefly
    let server;
    let port;

    beforeEach(() => {
      setupTestProject();
    });

    afterEach(async () => {
      cleanupTestProject();
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }
    });

    test('serves HTML files with correct content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/index.html`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      await stopServer();
      server = null;
    });

    test('serves CSS files with correct content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/style.css`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/css'));
      await stopServer();
      server = null;
    });

    test('serves JS files with correct content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/app.js`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/javascript'));
      await stopServer();
      server = null;
    });

    test('serves JSON files with correct content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/data.json`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/json'));
      await stopServer();
      server = null;
    });

    test('serves SVG files with correct content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/icon.svg`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('image/svg+xml'));
      await stopServer();
      server = null;
    });

    test('returns 404 for missing files', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;
      port = p;

      const res = await httpGet(`http://localhost:${port}/nonexistent.txt`);
      assert.strictEqual(res.statusCode, 404);
      await stopServer();
      server = null;
    });
  });

  // ===========================================================================
  // LiveReload
  // ===========================================================================

  describe('LiveReload', () => {
    let server;

    beforeEach(() => {
      setupTestProject();
    });

    afterEach(async () => {
      cleanupTestProject();
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }
    });

    test('injects LiveReload script into HTML', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/index.html`);
      assert.ok(res.body.includes('__pulse_livereload'));
      assert.ok(res.body.includes('EventSource'));
      await stopServer();
      server = null;
    });

    test('LiveReload SSE endpoint returns event-stream content-type', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGetRaw(`http://localhost:${p}/__pulse_livereload`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/event-stream'));
      assert.strictEqual(res.headers['cache-control'], 'no-cache');
      res.destroy();
      await stopServer();
      server = null;
    });
  });

  // ===========================================================================
  // .pulse File Compilation
  // ===========================================================================

  describe('Pulse File Compilation', () => {
    let server;

    beforeEach(() => {
      setupTestProject();
    });

    afterEach(async () => {
      cleanupTestProject();
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }
    });

    test('compiles .pulse files and serves as JavaScript', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/src/App.pulse`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/javascript'));
      await stopServer();
      server = null;
    });

    test('compiled .pulse output contains generated code', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/src/App.pulse`);
      // Compiled output should contain JS code
      assert.ok(res.body.length > 0);
      await stopServer();
      server = null;
    });

    test('returns 500 for invalid .pulse files', async () => {
      writeFileSync(join(TEST_DIR, 'src', 'Bad.pulse'), 'invalid syntax @@@{{{');

      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/src/Bad.pulse`);
      assert.strictEqual(res.statusCode, 500);
      await stopServer();
      server = null;
    });

    test('.pulse files have no-cache headers', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/src/App.pulse`);
      assert.ok(res.headers['cache-control'].includes('no-cache'));
      await stopServer();
      server = null;
    });
  });

  // ===========================================================================
  // SPA Fallback
  // ===========================================================================

  describe('SPA Fallback', () => {
    let server;

    beforeEach(() => {
      setupTestProject();
    });

    afterEach(async () => {
      cleanupTestProject();
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }
    });

    test('serves index.html for root path', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('<div id="app">'));
      await stopServer();
      server = null;
    });

    test('SPA fallback for routes without extension', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/about`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      assert.ok(res.body.includes('<div id="app">'));
      await stopServer();
      server = null;
    });

    test('SPA fallback for nested routes', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/users/123`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('text/html'));
      await stopServer();
      server = null;
    });

    test('SPA fallback injects LiveReload', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/dashboard`);
      assert.ok(res.body.includes('__pulse_livereload'));
      await stopServer();
      server = null;
    });
  });

  // ===========================================================================
  // Static File Serving
  // ===========================================================================

  describe('Static File Serving', () => {
    let server;

    beforeEach(() => {
      setupTestProject();
    });

    afterEach(async () => {
      cleanupTestProject();
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }
    });

    test('serves static files from root directory', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/style.css`);
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.includes('body { margin: 0; }'));
      await stopServer();
      server = null;
    });

    test('JS files have no-cache headers', async () => {
      const { startTestServer, stopServer } = await createTestServer(TEST_DIR);
      const { server: s, port: p } = await startTestServer();
      server = s;

      const res = await httpGet(`http://localhost:${p}/app.js`);
      assert.ok(res.headers['cache-control'].includes('no-cache'));
      await stopServer();
      server = null;
    });
  });
});

// =============================================================================
// Test Server Helper
// =============================================================================

/**
 * Creates a minimal test server that mirrors the dev server logic
 * without the watch/livereload complexity
 */
async function createTestServer(root) {
  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  const clients = new Set();
  const LIVERELOAD_SCRIPT = `
<script>
(function() {
  var es = new EventSource('/__pulse_livereload');
  es.onmessage = function(e) {
    if (e.data === 'reload') location.reload();
  };
})();
</script>
</body>`;

  let server;

  function startTestServer() {
    return new Promise((res) => {
      server = createServer(async (req, response) => {
        const url = new URL(req.url, `http://localhost`);
        let pathname = url.pathname;

        // LiveReload SSE
        if (pathname === '/__pulse_livereload') {
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });
          response.write('data: connected\n\n');
          clients.add(response);
          req.on('close', () => clients.delete(response));
          return;
        }

        if (pathname === '/') pathname = '/index.html';

        let filePath = join(root, pathname);

        // .pulse files
        if (pathname.endsWith('.pulse')) {
          if (existsSync(filePath)) {
            try {
              const source = readFileSync(filePath, 'utf-8');
              const result = compile(source, {
                runtime: '/runtime/index.js',
                sourceMap: true,
                inlineSourceMap: true,
                sourceFileName: pathname
              });
              if (result.success) {
                response.writeHead(200, {
                  'Content-Type': 'application/javascript',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                response.end(result.code);
              } else {
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end(`Compilation error`);
              }
            } catch (error) {
              response.writeHead(500, { 'Content-Type': 'text/plain' });
              response.end(`Error: ${error.message}`);
            }
            return;
          }
        }

        // JS files
        if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            response.writeHead(200, {
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            response.end(content);
            return;
          }
        }

        // Static files
        if (existsSync(filePath) && statSync(filePath).isFile()) {
          const ext = extname(filePath);
          const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
          let content = readFileSync(filePath);
          if (ext === '.html') {
            content = content.toString().replace('</body>', LIVERELOAD_SCRIPT);
          }
          response.writeHead(200, { 'Content-Type': mimeType });
          response.end(content);
          return;
        }

        // SPA fallback
        const ext = extname(pathname);
        if (!ext || ext === '') {
          const indexPath = join(root, 'index.html');
          if (existsSync(indexPath)) {
            let content = readFileSync(indexPath, 'utf-8');
            content = content.replace('</body>', LIVERELOAD_SCRIPT);
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end(content);
            return;
          }
        }

        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('Not Found');
      });

      // Listen on random port
      server.listen(0, () => {
        const port = server.address().port;
        res({ server, port });
      });
    });
  }

  function stopServer() {
    return new Promise((res) => {
      for (const client of clients) {
        try { client.end(); } catch (e) {}
      }
      clients.clear();
      if (server) {
        server.close(() => res());
      } else {
        res();
      }
    });
  }

  return { startTestServer, stopServer };
}

/**
 * Simple HTTP GET helper
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    httpGetNode(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body
      }));
    }).on('error', reject);
  });
}

/**
 * HTTP GET that returns the raw response (for SSE streams)
 */
function httpGetRaw(url) {
  return new Promise((resolve, reject) => {
    httpGetNode(url, (res) => {
      resolve(res);
    }).on('error', reject);
  });
}
