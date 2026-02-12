/**
 * Pulse SSR Streaming - Streaming server-side rendering
 *
 * Provides streaming SSR using Web Streams API (ReadableStream).
 * Sends shell HTML immediately, streams async content as it resolves.
 * Compatible with Node.js pipe() via Readable.fromWeb() and Web Streams.
 *
 * @module pulse-js-framework/runtime/ssr-stream
 */

import { createContext, batch, setSSRMode as setPulseSSRMode } from './pulse.js';
import { MockDOMAdapter, withAdapter } from './dom-adapter.js';
import { serializeToHTML, serializeChildren, escapeAttr } from './ssr-serializer.js';
import { SSRAsyncContext, setSSRAsyncContext } from './ssr-async.js';
import { loggers } from './logger.js';

const log = loggers.dom;

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimal client-side script that replaces streaming boundary markers
 * with resolved content. Injected once into the stream.
 * ~200 bytes minified.
 */
const STREAMING_RUNTIME_SCRIPT = `<script>function $P(i,h){var b=document.querySelectorAll('[data-ssr-boundary="'+i+'"]');if(b.length===2){var r=document.createRange();r.setStartAfter(b[0]);r.setEndBefore(b[1]);r.deleteContents();var t=document.createElement('template');t.innerHTML=h;r.insertNode(t.content);b[0].remove();b[1].remove()}}</script>`;

// ============================================================================
// SSR Stream Context
// ============================================================================

/**
 * Manages streaming SSR state: boundary tracking, chunk queue, flush control.
 */
export class SSRStreamContext {
  constructor(options = {}) {
    /** @type {number} Next boundary ID */
    this._nextId = 0;

    /** @type {Map<number, {promise: Promise, fallback: string}>} */
    this.boundaries = new Map();

    /** @type {boolean} */
    this.shellFlushed = false;

    /** @type {number} */
    this.timeout = options.timeout ?? 10000;

    /** @type {Function|null} */
    this.onShellError = options.onShellError ?? null;

    /** @type {Function|null} */
    this.onBoundaryError = options.onBoundaryError ?? null;
  }

  /**
   * Create a new boundary ID for an async chunk.
   * @returns {number}
   */
  createBoundary() {
    return this._nextId++;
  }

  /**
   * Register an async boundary with its promise and fallback HTML.
   * @param {number} id - Boundary ID
   * @param {Promise} promise - Promise that resolves to content
   * @param {string} fallback - Fallback HTML shown while loading
   */
  registerBoundary(id, promise, fallback) {
    this.boundaries.set(id, { promise, fallback });
  }

  /**
   * Get the number of pending boundaries.
   * @returns {number}
   */
  get pendingCount() {
    return this.boundaries.size;
  }
}

// ============================================================================
// Boundary Markers
// ============================================================================

/**
 * Create opening boundary marker comment.
 * @param {number} id - Boundary ID
 * @returns {string}
 */
export function createBoundaryStart(id) {
  return `<!--$B:${id}-->`;
}

/**
 * Create closing boundary marker comment.
 * @param {number} id - Boundary ID
 * @returns {string}
 */
export function createBoundaryEnd(id) {
  return `<!--/$B:${id}-->`;
}

/**
 * Create boundary marker pair with data attributes for client-side replacement.
 * @param {number} id - Boundary ID
 * @param {string} fallbackHtml - Fallback content HTML
 * @returns {string}
 */
export function createBoundaryMarker(id, fallbackHtml) {
  return (
    `<template data-ssr-boundary="${id}" style="display:none"></template>` +
    fallbackHtml +
    `<template data-ssr-boundary="${id}" style="display:none"></template>`
  );
}

/**
 * Create a replacement script that swaps boundary content on the client.
 * @param {number} id - Boundary ID
 * @param {string} html - Resolved content HTML
 * @returns {string}
 */
export function createReplacementScript(id, html) {
  // Use JSON.stringify for safe JS string embedding, then escape HTML-sensitive sequences
  const escaped = JSON.stringify(html)
    .replace(/<\/script/gi, '<\\u002fscript')
    .replace(/<!--/g, '<\\u0021--');
  return `<script>$P(${Number(id)},${escaped})</script>`;
}

// ============================================================================
// Streaming SSR
// ============================================================================

/**
 * @typedef {Object} RenderToStreamOptions
 * @property {string} [shellStart] - HTML before app content
 * @property {string} [shellEnd] - HTML after app content
 * @property {number} [timeout=10000] - Timeout for async boundaries (ms)
 * @property {Function} [onShellError] - Error callback during shell render
 * @property {Function} [onBoundaryError] - Error callback for async boundary
 * @property {string[]} [bootstrapScripts] - Script URLs to include in shell
 * @property {string[]} [bootstrapModules] - Module script URLs to include
 * @property {boolean} [generatePreloadHints=false] - Generate link preload tags
 */

/**
 * Render a component tree to a ReadableStream.
 *
 * Sends the HTML shell immediately, then streams async content
 * as each boundary resolves. The browser renders progressive content
 * without needing client-side JavaScript for the initial swap.
 *
 * @param {Function} componentFactory - Function that returns the root component
 * @param {RenderToStreamOptions} [options] - Streaming options
 * @returns {ReadableStream} HTML stream
 *
 * @example
 * const stream = renderToStream(() => App(), {
 *   shellStart: '<!DOCTYPE html><html><head></head><body><div id="app">',
 *   shellEnd: '</div></body></html>',
 *   timeout: 5000
 * });
 *
 * // Web Streams
 * return new Response(stream, { headers: { 'Content-Type': 'text/html' } });
 *
 * // Node.js pipe
 * import { Readable } from 'stream';
 * Readable.fromWeb(stream).pipe(res);
 */
export function renderToStream(componentFactory, options = {}) {
  const {
    shellStart = '',
    shellEnd = '',
    timeout = 10000,
    onShellError = null,
    onBoundaryError = null,
    bootstrapScripts = [],
    bootstrapModules = []
  } = options;

  const streamCtx = new SSRStreamContext({ timeout, onShellError, onBoundaryError });

  let streamController;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      const encoder = new TextEncoder();

      // Run SSR in microtask to allow stream to be returned first
      Promise.resolve().then(async () => {
        try {
          // Enable SSR mode
          setPulseSSRMode(true);

          const ctx = createContext({ name: 'ssr-stream' });
          const asyncCtx = new SSRAsyncContext();
          const adapter = new MockDOMAdapter();

          let shellHtml = '';

          try {
            // Render shell synchronously
            ctx.run(() => {
              withAdapter(adapter, () => {
                setSSRAsyncContext(asyncCtx);

                const result = componentFactory();
                if (result) {
                  adapter.appendChild(adapter.getBody(), result);
                }

                shellHtml = serializeChildren(adapter.getBody());
                setSSRAsyncContext(null);
              });
            });
          } catch (shellError) {
            if (onShellError) {
              onShellError(shellError);
            }
            log.error('SSR shell render error:', shellError.message);
            controller.close();
            setPulseSSRMode(false);
            ctx.reset();
            return;
          }

          // Build script tags
          let scriptTags = '';
          for (const src of bootstrapScripts) {
            scriptTags += `<script src="${escapeAttr(src)}"></script>`;
          }
          for (const src of bootstrapModules) {
            scriptTags += `<script type="module" src="${escapeAttr(src)}"></script>`;
          }

          // Enqueue shell HTML
          const shellContent = shellStart + shellHtml + scriptTags;
          controller.enqueue(encoder.encode(shellContent));
          streamCtx.shellFlushed = true;

          // If there are pending async operations, stream them
          if (asyncCtx.pendingCount > 0) {
            // Inject streaming runtime script
            controller.enqueue(encoder.encode(STREAMING_RUNTIME_SCRIPT));

            // Wait for each async operation and stream results
            const boundaryPromises = [];

            for (const { key, promise } of asyncCtx.pending) {
              const boundaryId = streamCtx.createBoundary();

              const boundaryPromise = Promise.resolve(promise)
                .then(async () => {
                  // Re-render with resolved data
                  const boundaryAdapter = new MockDOMAdapter();
                  const boundaryCtx = createContext({ name: `ssr-boundary-${boundaryId}` });

                  try {
                    let boundaryHtml = '';
                    boundaryCtx.run(() => {
                      withAdapter(boundaryAdapter, () => {
                        setSSRAsyncContext(asyncCtx);
                        const result = componentFactory();
                        if (result) {
                          boundaryAdapter.appendChild(boundaryAdapter.getBody(), result);
                        }
                        boundaryHtml = serializeChildren(boundaryAdapter.getBody());
                        setSSRAsyncContext(null);
                      });
                    });

                    const script = createReplacementScript(boundaryId, boundaryHtml);
                    controller.enqueue(encoder.encode(script));
                  } finally {
                    boundaryCtx.reset();
                  }
                })
                .catch(err => {
                  if (onBoundaryError) {
                    onBoundaryError(boundaryId, err);
                  }
                  log.warn(`SSR boundary ${boundaryId} error:`, err.message);
                });

              boundaryPromises.push(boundaryPromise);
            }

            // Wait for all boundaries with timeout
            const timeoutPromise = new Promise(resolve => {
              setTimeout(() => {
                log.warn(`SSR streaming timed out after ${timeout}ms`);
                resolve();
              }, timeout);
            });

            await Promise.race([
              Promise.allSettled(boundaryPromises),
              timeoutPromise
            ]);
          }

          // Enqueue shell end and close
          if (shellEnd) {
            controller.enqueue(encoder.encode(shellEnd));
          }
          controller.close();

          // Clean up
          setPulseSSRMode(false);
          ctx.reset();

        } catch (err) {
          log.error('SSR stream error:', err.message);
          try {
            controller.error(err);
          } catch {
            // Controller may already be closed
          }
          setPulseSSRMode(false);
        }
      });
    },

    cancel() {
      // Stream was cancelled by consumer
      setPulseSSRMode(false);
    }
  });

  return stream;
}

/**
 * Render to a ReadableStream with abort control.
 *
 * @param {Function} componentFactory - Function that returns the root component
 * @param {RenderToStreamOptions} [options] - Streaming options
 * @returns {{ stream: ReadableStream, abort: Function }}
 *
 * @example
 * const { stream, abort } = renderToReadableStream(() => App(), options);
 * // Later: abort() to cancel streaming
 */
export function renderToReadableStream(componentFactory, options = {}) {
  let abortController;

  // Wrap with abort support
  const wrappedOptions = {
    ...options,
    onShellError: (err) => {
      options.onShellError?.(err);
    }
  };

  const stream = renderToStream(componentFactory, wrappedOptions);

  const abort = () => {
    try {
      stream.cancel('Aborted by caller');
    } catch {
      // Stream may already be closed
    }
  };

  return { stream, abort };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  SSRStreamContext,
  createBoundaryStart,
  createBoundaryEnd,
  createBoundaryMarker,
  createReplacementScript,
  renderToStream,
  renderToReadableStream,
  STREAMING_RUNTIME_SCRIPT
};
