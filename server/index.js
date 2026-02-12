/**
 * Pulse Server Framework Adapters
 *
 * Provides middleware factories for popular Node.js server frameworks.
 * Handles SSR, static asset serving, and state serialization.
 *
 * @module pulse-js-framework/server
 *
 * @example
 * // Express
 * import express from 'express';
 * import { createExpressMiddleware } from 'pulse-js-framework/server/express';
 *
 * const app = express();
 * app.use(createExpressMiddleware({ app: () => App() }));
 *
 * @example
 * // Hono
 * import { Hono } from 'hono';
 * import { createHonoMiddleware } from 'pulse-js-framework/server/hono';
 *
 * const app = new Hono();
 * app.use('*', createHonoMiddleware({ app: () => App() }));
 *
 * @example
 * // Fastify
 * import Fastify from 'fastify';
 * import { createFastifyPlugin } from 'pulse-js-framework/server/fastify';
 *
 * const app = Fastify();
 * app.register(createFastifyPlugin({ app: () => App() }));
 */

import {
  injectIntoTemplate,
  readTemplate,
  clearTemplateCache,
  resolveStaticAsset,
  createRequestContext,
  getMimeType
} from './utils.js';

// ============================================================================
// Common Middleware Factory
// ============================================================================

/**
 * @typedef {Object} PulseMiddlewareOptions
 * @property {Function} app - Component factory: (ctx) => App()
 * @property {string} [template] - HTML template string
 * @property {string} [templatePath] - Path to HTML template file
 * @property {string} [distDir='dist'] - Distribution directory for static assets
 * @property {boolean} [streaming=false] - Enable streaming SSR
 * @property {number} [timeout=5000] - SSR timeout (ms)
 * @property {Function} [onError] - Error handler: (error, ctx) => void
 * @property {Function} [getPreloadHints] - Preload hint generator
 * @property {boolean} [serveStatic=true] - Serve static assets from distDir
 */

/**
 * Create a generic Pulse SSR handler.
 * This is the core logic shared by all framework adapters.
 *
 * @param {PulseMiddlewareOptions} options - Middleware options
 * @returns {Function} Handler: (requestContext) => Promise<{status, headers, body}>
 */
export function createPulseHandler(options = {}) {
  const {
    app: appFactory,
    template: templateStr,
    templatePath,
    distDir = 'dist',
    streaming = false,
    timeout = 5000,
    onError,
    getPreloadHints
  } = options;

  if (!appFactory) {
    throw new Error('[Pulse Server] "app" option is required: provide a component factory function.');
  }

  return async function handleRequest(requestContext) {
    try {
      // Get template
      const template = templateStr || (templatePath ? readTemplate(templatePath) : getDefaultTemplate());

      // Generate preload hints if available
      const head = getPreloadHints ? getPreloadHints(requestContext.pathname) : '';

      if (streaming) {
        return await handleStreamingSSR(appFactory, template, requestContext, { timeout, head });
      }

      return await handleStringSSR(appFactory, template, requestContext, { timeout, head });
    } catch (error) {
      if (onError) {
        onError(error, requestContext);
      }

      return {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: '<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>'
      };
    }
  };
}

/**
 * Handle string-based SSR (full page render).
 * @private
 */
async function handleStringSSR(appFactory, template, ctx, options = {}) {
  const { renderToString, serializeState } = await import('../runtime/ssr.js');

  const { html, state } = await renderToString(
    () => appFactory({ route: ctx.pathname, query: ctx.query }),
    { waitForAsync: true, timeout: options.timeout, serializeState: true }
  );

  const stateScript = state
    ? `<script>window.__PULSE_STATE__=${serializeState(state)};</script>`
    : '';

  const page = injectIntoTemplate(template, {
    html,
    state: stateScript,
    head: options.head || ''
  });

  return {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: page
  };
}

/**
 * Handle streaming SSR.
 * @private
 */
async function handleStreamingSSR(appFactory, template, ctx, options = {}) {
  const { renderToStream } = await import('../runtime/ssr-stream.js');

  // Split template at app placeholder
  const [shellStart, shellEnd] = template.split('<!--app-html-->');

  const headContent = options.head || '';
  const shellStartWithHead = headContent
    ? shellStart.replace('</head>', `${headContent}\n</head>`)
    : shellStart;

  const stream = renderToStream(
    () => appFactory({ route: ctx.pathname, query: ctx.query }),
    {
      shellStart: shellStartWithHead,
      shellEnd: shellEnd || '',
      timeout: options.timeout
    }
  );

  return {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    stream
  };
}

/**
 * Get default HTML template.
 * @returns {string}
 */
function getDefaultTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse App</title>
</head>
<body>
  <div id="app"><!--app-html--></div>
  <!--app-state-->
  <script type="module" src="/assets/main.js"></script>
</body>
</html>`;
}

// ============================================================================
// Re-exports
// ============================================================================

export { injectIntoTemplate, readTemplate, clearTemplateCache, resolveStaticAsset, createRequestContext, getMimeType };

// ============================================================================
// Default Export
// ============================================================================

export default {
  createPulseHandler,
  injectIntoTemplate,
  readTemplate,
  clearTemplateCache,
  resolveStaticAsset,
  createRequestContext,
  getMimeType
};
