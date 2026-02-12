/**
 * Pulse Hono Adapter
 *
 * Middleware for Hono framework that handles SSR, static asset serving,
 * and state serialization for Pulse applications.
 *
 * @module pulse-js-framework/server/hono
 *
 * @example
 * import { Hono } from 'hono';
 * import { createHonoMiddleware } from 'pulse-js-framework/server/hono';
 * import App from './src/App.js';
 *
 * const app = new Hono();
 *
 * app.use('*', createHonoMiddleware({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   distDir: './dist'
 * }));
 *
 * export default app;
 */

import { join } from 'path';
import { createPulseHandler, resolveStaticAsset } from './index.js';
import { createRequestContext } from './utils.js';

// ============================================================================
// Hono Middleware
// ============================================================================

/**
 * @typedef {import('./index.js').PulseMiddlewareOptions} PulseMiddlewareOptions
 */

/**
 * Create Hono middleware for Pulse SSR.
 *
 * @param {PulseMiddlewareOptions} options - Middleware options
 * @returns {Function} Hono middleware (c, next)
 *
 * @example
 * app.use('*', createHonoMiddleware({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   streaming: true  // Hono supports streaming natively
 * }));
 */
export function createHonoMiddleware(options = {}) {
  const { distDir = 'dist', serveStatic = true } = options;
  const handler = createPulseHandler(options);
  const resolvedDistDir = join(process.cwd(), distDir);

  return async function pulseMiddleware(c, next) {
    // Skip non-GET requests
    if (c.req.method !== 'GET') {
      return next();
    }

    const url = new URL(c.req.url);
    const pathname = url.pathname;

    // Serve static assets first
    if (serveStatic && pathname.startsWith('/assets/')) {
      const asset = resolveStaticAsset(pathname, resolvedDistDir);
      if (asset) {
        return new Response(asset.content, {
          status: asset.status,
          headers: asset.headers
        });
      }
    }

    // Skip API routes
    if (pathname.startsWith('/api/')) {
      return next();
    }

    try {
      const ctx = createRequestContext(c.req.raw, 'hono');
      const result = await handler(ctx);

      // Handle streaming response (Hono supports Web Streams natively)
      if (result.stream) {
        return new Response(result.stream, {
          status: result.status,
          headers: result.headers
        });
      }

      return c.html(result.body, result.status);
    } catch (error) {
      console.error('[Pulse/Hono] SSR Error:', error.message);
      return c.html(
        '<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>',
        500
      );
    }
  };
}

// ============================================================================
// Exports
// ============================================================================

export default { createHonoMiddleware };
