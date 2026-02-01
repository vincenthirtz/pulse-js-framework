/**
 * Pulse Development Server
 *
 * A simple development server with hot module replacement
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync, watch } from 'fs';
import { join, extname, resolve } from 'path';
import { compile } from '../compiler/index.js';
import { log } from './logger.js';

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

// Connected clients for LiveReload (Server-Sent Events)
const clients = new Set();

// LiveReload client script injected into HTML
const LIVERELOAD_SCRIPT = `
<script>
(function() {
  var es = new EventSource('/__pulse_livereload');
  es.onmessage = function(e) {
    if (e.data === 'reload') {
      console.log('[Pulse] Reloading...');
      location.reload();
    }
  };
  es.onerror = function() {
    console.log('[Pulse] Connection lost, reconnecting...');
    es.close();
    setTimeout(function() { location.reload(); }, 2000);
  };
})();
</script>
</body>`;

/**
 * Start the development server
 */
export async function startDevServer(args) {
  // Parse args: can be [port], [dir], or [dir, port]
  let port = 3000;
  let root = process.cwd();

  if (args.length >= 1) {
    if (/^\d+$/.test(args[0])) {
      // First arg is a port number
      port = parseInt(args[0]);
    } else {
      // First arg is a directory
      root = resolve(process.cwd(), args[0]);
      if (args[1] && /^\d+$/.test(args[1])) {
        port = parseInt(args[1]);
      }
    }
  }

  // Check if vite is available, use it if so
  try {
    const viteConfig = join(root, 'vite.config.js');
    if (existsSync(viteConfig)) {
      log.info('Vite config detected, using Vite...');
      const { createServer: createViteServer } = await import('vite');
      const server = await createViteServer({
        root,
        server: { port }
      });
      await server.listen();
      server.printUrls();
      return;
    }
  } catch (e) {
    // Vite not available, use built-in server
  }

  // Built-in development server
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname = url.pathname;

    // Handle LiveReload SSE endpoint
    if (pathname === '/__pulse_livereload') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('data: connected\n\n');

      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Serve index.html for root
    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Try to serve the file
    let filePath = join(root, pathname);

    // Check for .pulse files and compile them
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
            res.writeHead(200, {
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(result.code);
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Compilation error: ${result.errors.map(e => e.message).join('\n')}`);
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error: ${error.message}`);
        }
        return;
      }
    }

    // Serve JS files
    if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
        return;
      }

      // Check if there's a .pulse file that should be compiled to .js
      const pulseFilePath = filePath.replace(/\.(js|mjs)$/, '.pulse');
      if (existsSync(pulseFilePath)) {
        try {
          const source = readFileSync(pulseFilePath, 'utf-8');
          const result = compile(source, {
            runtime: '/runtime/index.js',
            sourceMap: true,
            inlineSourceMap: true,
            sourceFileName: pulseFilePath.replace(root, '')
          });

          if (result.success) {
            res.writeHead(200, {
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(result.code);
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Compilation error: ${result.errors.map(e => e.message).join('\n')}`);
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error: ${error.message}`);
        }
        return;
      }
    }

    // Handle node_modules
    if (pathname.startsWith('/node_modules/pulse-js-framework/')) {
      const modulePath = join(root, '..', 'pulse', pathname.replace('/node_modules/pulse-js-framework/', ''));
      if (existsSync(modulePath)) {
        const content = readFileSync(modulePath, 'utf-8');
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
        return;
      }
    }

    // Handle runtime path (for examples)
    if (pathname.includes('/runtime/')) {
      const runtimeFile = pathname.split('/runtime/')[1] || 'index.js';

      // Try multiple possible locations
      const possiblePaths = [
        join(root, '..', 'runtime', runtimeFile),      // pulse/example/ -> pulse/runtime/
        join(root, '..', '..', 'runtime', runtimeFile), // pulse/examples/*/ -> pulse/runtime/
        join(root, 'runtime', runtimeFile),             // pulse/docs/ -> pulse/docs/runtime/ (fallback)
      ];

      for (const runtimePath of possiblePaths) {
        if (existsSync(runtimePath)) {
          const content = readFileSync(runtimePath, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          res.end(content);
          return;
        }
      }
    }

    // Serve static files
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      let content = readFileSync(filePath);

      // Inject LiveReload script into HTML files
      if (ext === '.html') {
        content = content.toString().replace('</body>', LIVERELOAD_SCRIPT);
      }

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  // Watch for file changes
  watchFiles(root);

  server.listen(port, () => {
    log.success(`
  Pulse Dev Server running at:

    Local:   http://localhost:${port}/

  Press Ctrl+C to stop.
    `);
  });
}

/**
 * Watch files for changes and trigger LiveReload
 */
function watchFiles(root) {
  const srcDir = join(root, 'src');
  let debounceTimer = null;

  if (existsSync(srcDir)) {
    watch(srcDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.pulse') || filename.endsWith('.js') || filename.endsWith('.css'))) {
        // Debounce to avoid multiple reloads
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          log.info(`File changed: ${filename}`);
          notifyClients('reload');
        }, 100);
      }
    });
    log.debug('Watching src/ for changes...');
  }
}

/**
 * Notify connected LiveReload clients
 */
function notifyClients(type = 'reload') {
  log.info(`[LiveReload] Notifying ${clients.size} client(s)...`);
  for (const client of clients) {
    try {
      client.write(`data: ${type}\n\n`);
    } catch (e) {
      clients.delete(client);
    }
  }
}

export default { startDevServer };
