/**
 * Pulse Development Server
 *
 * A simple development server with hot module replacement
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync, watch } from 'fs';
import { join, extname, resolve } from 'path';
import { compile } from '../compiler/index.js';

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

// Connected clients for HMR
const clients = new Set();

/**
 * Start the development server
 */
export async function startDevServer(args) {
  const port = parseInt(args[0]) || 3000;
  const root = process.cwd();

  // Check if vite is available, use it if so
  try {
    const viteConfig = join(root, 'vite.config.js');
    if (existsSync(viteConfig)) {
      console.log('Vite config detected, using Vite...');
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

    // Handle HMR WebSocket upgrade
    if (pathname === '/__pulse_hmr') {
      // This would need WebSocket support
      res.writeHead(200);
      res.end();
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
            runtime: '/runtime/index.js'
          });

          if (result.success) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
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
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(content);
        return;
      }

      // Check if there's a .pulse file that should be compiled to .js
      const pulseFilePath = filePath.replace(/\.(js|mjs)$/, '.pulse');
      if (existsSync(pulseFilePath)) {
        try {
          const source = readFileSync(pulseFilePath, 'utf-8');
          const result = compile(source, {
            runtime: '/runtime/index.js'
          });

          if (result.success) {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
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
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
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
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(content);
          return;
        }
      }
    }

    // Serve static files
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(readFileSync(filePath));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  // Watch for file changes
  watchFiles(root);

  server.listen(port, () => {
    console.log(`
  Pulse Dev Server running at:

    Local:   http://localhost:${port}/

  Press Ctrl+C to stop.
    `);
  });
}

/**
 * Watch files for changes
 */
function watchFiles(root) {
  const srcDir = join(root, 'src');

  if (existsSync(srcDir)) {
    watch(srcDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.pulse')) {
        console.log(`File changed: ${filename}`);
        // Notify HMR clients (simplified)
        notifyClients({ type: 'update', path: `/src/${filename}` });
      }
    });
  }
}

/**
 * Notify connected HMR clients
 */
function notifyClients(message) {
  for (const client of clients) {
    try {
      client.send(JSON.stringify(message));
    } catch (e) {
      clients.delete(client);
    }
  }
}

/**
 * Get HMR client code
 */
function getHMRClient() {
  return `
(function() {
  const ws = new WebSocket('ws://' + location.host + '/__pulse_hmr');

  ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
      console.log('[Pulse HMR] Update:', data.path);
      location.reload();
    }
  };

  ws.onclose = function() {
    console.log('[Pulse HMR] Connection lost, reconnecting...');
    setTimeout(() => location.reload(), 1000);
  };
})();
`;
}

export default { startDevServer };
