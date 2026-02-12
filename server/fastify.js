/**
 * Pulse Fastify Adapter
 *
 * Plugin for Fastify that handles SSR, static asset serving,
 * and state serialization for Pulse applications.
 *
 * @module pulse-js-framework/server/fastify
 *
 * @example
 * import Fastify from 'fastify';
 * import { createFastifyPlugin } from 'pulse-js-framework/server/fastify';
 * import App from './src/App.js';
 *
 * const app = Fastify();
 *
 * app.register(createFastifyPlugin({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   distDir: './dist'
 * }));
 *
 * app.listen({ port: 3000 });
 */

import { join } from 'path';
import { createPulseHandler, resolveStaticAsset } from './index.js';
import { createRequestContext } from './utils.js';

// ============================================================================
// Fastify Plugin
// ============================================================================

/**
 * @typedef {import('./index.js').PulseMiddlewareOptions} PulseMiddlewareOptions
 */

/**
 * Create a Fastify plugin for Pulse SSR.
 *
 * @param {PulseMiddlewareOptions} options - Plugin options
 * @returns {Function} Fastify plugin (fastify, opts, done)
 *
 * @example
 * app.register(createFastifyPlugin({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   distDir: './dist',
 *   streaming: false
 * }));
 */
export function createFastifyPlugin(options = {}) {
  const { distDir = 'dist', serveStatic = true } = options;
  const handler = createPulseHandler(options);
  const resolvedDistDir = join(process.cwd(), distDir);

  return async function pulsePlugin(fastify, opts) {
    // Serve static assets
    if (serveStatic) {
      fastify.get('/assets/*', async (request, reply) => {
        const pathname = request.url;
        const asset = resolveStaticAsset(pathname, resolvedDistDir);

        if (asset) {
          for (const [key, value] of Object.entries(asset.headers)) {
            reply.header(key, value);
          }
          return reply.status(asset.status).send(asset.content);
        }

        reply.callNotFound();
      });
    }

    // Catch-all route for SSR (skip /api/* routes)
    fastify.get('*', async (request, reply) => {
      const pathname = new URL(request.url, 'http://localhost').pathname;

      // Skip API routes
      if (pathname.startsWith('/api/')) {
        return reply.callNotFound();
      }

      // Skip asset requests that weren't found
      if (pathname.startsWith('/assets/')) {
        return reply.callNotFound();
      }

      try {
        const ctx = createRequestContext(request, 'fastify');
        const result = await handler(ctx);

        reply.status(result.status);
        for (const [key, value] of Object.entries(result.headers)) {
          reply.header(key, value);
        }

        // Handle streaming response
        if (result.stream) {
          const { Readable } = await import('stream');
          const nodeStream = Readable.fromWeb(result.stream);
          return reply.send(nodeStream);
        }

        return reply.send(result.body);
      } catch (error) {
        fastify.log.error(error, '[Pulse/Fastify] SSR Error');
        reply.status(500).send(
          '<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>'
        );
      }
    });
  };
}

// ============================================================================
// Exports
// ============================================================================

export default { createFastifyPlugin };
