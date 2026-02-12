/**
 * Pulse Express Adapter
 *
 * Middleware for Express.js that handles SSR, static asset serving,
 * and state serialization for Pulse applications.
 *
 * @module pulse-js-framework/server/express
 *
 * @example
 * import express from 'express';
 * import { createExpressMiddleware } from 'pulse-js-framework/server/express';
 * import App from './src/App.js';
 *
 * const app = express();
 *
 * app.use(createExpressMiddleware({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   distDir: './dist'
 * }));
 *
 * app.listen(3000);
 */

import { join } from 'path';
import { createPulseHandler, resolveStaticAsset } from './index.js';
import { createRequestContext } from './utils.js';

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * @typedef {import('./index.js').PulseMiddlewareOptions} PulseMiddlewareOptions
 */

/**
 * Create Express middleware for Pulse SSR.
 *
 * @param {PulseMiddlewareOptions} options - Middleware options
 * @returns {Function} Express middleware (req, res, next)
 *
 * @example
 * app.use(createExpressMiddleware({
 *   app: ({ route }) => App({ route }),
 *   templatePath: './dist/index.html',
 *   distDir: './dist',
 *   streaming: false
 * }));
 */
export function createExpressMiddleware(options = {}) {
  const { distDir = 'dist', serveStatic = true } = options;
  const handler = createPulseHandler(options);
  const resolvedDistDir = join(process.cwd(), distDir);

  return async function pulseMiddleware(req, res, next) {
    // Skip non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const pathname = req.path || req.url;

    // Serve static assets first
    if (serveStatic && pathname.startsWith('/assets/')) {
      const asset = resolveStaticAsset(pathname, resolvedDistDir);
      if (asset) {
        for (const [key, value] of Object.entries(asset.headers)) {
          res.setHeader(key, value);
        }
        return res.status(asset.status).end(asset.content);
      }
    }

    // Skip API routes
    if (pathname.startsWith('/api/')) {
      return next();
    }

    try {
      const ctx = createRequestContext(req, 'express');
      const result = await handler(ctx);

      res.status(result.status);
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value);
      }

      // Handle streaming response
      if (result.stream) {
        const { Readable } = await import('stream');
        const nodeStream = Readable.fromWeb(result.stream);
        nodeStream.pipe(res);
        return;
      }

      res.end(result.body);
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================================
// Exports
// ============================================================================

export default { createExpressMiddleware };
