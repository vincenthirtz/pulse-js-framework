/**
 * Pulse Server Utilities
 *
 * Shared utilities for server framework adapters.
 * Provides HTML injection, asset serving helpers, and request context.
 *
 * @module pulse-js-framework/server/utils
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { extname, resolve, sep } from 'path';

// ============================================================================
// MIME Types
// ============================================================================

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

/**
 * Get MIME type for a file extension.
 * @param {string} filePath - File path or extension
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ============================================================================
// HTML Template Injection
// ============================================================================

/**
 * Inject rendered HTML and state into an HTML template.
 *
 * @param {string} template - HTML template string
 * @param {Object} options - Injection options
 * @param {string} [options.html] - Rendered app HTML
 * @param {string} [options.state] - Serialized state script tag
 * @param {string} [options.head] - Extra head content (preload hints, meta)
 * @param {string} [options.bodyAttrs] - Extra body attributes
 * @returns {string} Complete HTML page
 */
export function injectIntoTemplate(template, options = {}) {
  const { html = '', state = '', head = '', bodyAttrs = '' } = options;

  let result = template;

  // Inject app HTML
  result = result.replace('<!--app-html-->', html);

  // Inject state
  result = result.replace('<!--app-state-->', state);

  // Inject head content (preload hints, meta tags)
  if (head) {
    result = result.replace('</head>', `${head}\n</head>`);
  }

  // Inject body attributes
  if (bodyAttrs) {
    result = result.replace('<body', `<body ${bodyAttrs}`);
  }

  return result;
}

/**
 * Read an HTML template from disk with caching.
 * @param {string} templatePath - Path to HTML template
 * @returns {string} Template content
 */
const templateCache = new Map();

export function readTemplate(templatePath) {
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }

  if (!existsSync(templatePath)) {
    throw new Error(`[Pulse Server] Template not found: ${templatePath}`);
  }

  const content = readFileSync(templatePath, 'utf-8');
  templateCache.set(templatePath, content);
  return content;
}

/**
 * Clear template cache (useful in development).
 */
export function clearTemplateCache() {
  templateCache.clear();
}

// ============================================================================
// Static Asset Serving
// ============================================================================

/**
 * @typedef {Object} StaticAssetResult
 * @property {Buffer|null} content - File content
 * @property {string} mimeType - MIME type
 * @property {number} [status] - HTTP status code
 * @property {Object} [headers] - Response headers
 */

/**
 * Resolve a static asset from the dist directory.
 *
 * @param {string} pathname - Request pathname
 * @param {string} distDir - Distribution directory
 * @param {Object} [options] - Options
 * @param {number} [options.maxAge=31536000] - Cache max-age for assets
 * @param {boolean} [options.immutable=true] - Set immutable cache for hashed assets
 * @returns {StaticAssetResult|null} Asset result or null if not found
 */
export function resolveStaticAsset(pathname, distDir, options = {}) {
  const { maxAge = 31536000, immutable = true } = options;

  // Security: prevent directory traversal
  const normalized = pathname.replace(/\.\./g, '').replace(/\/+/g, '/');
  const resolvedDist = resolve(distDir) + sep;
  const filePath = resolve(distDir, normalized);

  // Must be within distDir (trailing sep prevents prefix attacks like dist-evil/)
  if (!filePath.startsWith(resolvedDist) && filePath !== resolve(distDir)) {
    return null;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return null;
  }

  const content = readFileSync(filePath);
  const mimeType = getMimeType(filePath);

  // Hashed assets get long cache
  const isHashed = /\.[a-f0-9]{8,}\.\w+$/.test(pathname);
  const cacheControl = isHashed && immutable
    ? `public, max-age=${maxAge}, immutable`
    : `public, max-age=${Math.min(maxAge, 3600)}`;

  return {
    content,
    mimeType,
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(content.length),
      'Cache-Control': cacheControl
    }
  };
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * @typedef {Object} PulseRequestContext
 * @property {string} url - Full URL
 * @property {string} pathname - URL pathname
 * @property {Object} query - Query parameters
 * @property {string} method - HTTP method
 * @property {Object} headers - Request headers
 */

/**
 * Create a Pulse request context from various framework request objects.
 *
 * @param {Object} req - Framework-specific request object
 * @param {string} [type='generic'] - Framework type
 * @returns {PulseRequestContext}
 */
export function createRequestContext(req, type = 'generic') {
  switch (type) {
    case 'express':
      return {
        url: req.originalUrl || req.url,
        pathname: req.path || new URL(req.url, 'http://localhost').pathname,
        query: req.query || {},
        method: req.method,
        headers: req.headers || {}
      };

    case 'hono':
      return {
        url: req.url || '',
        pathname: new URL(req.url, 'http://localhost').pathname,
        query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
        method: req.method,
        headers: Object.fromEntries(req.headers || [])
      };

    case 'fastify':
      return {
        url: req.url,
        pathname: req.routeOptions?.url || new URL(req.url, 'http://localhost').pathname,
        query: req.query || {},
        method: req.method,
        headers: req.headers || {}
      };

    default:
      return {
        url: typeof req.url === 'string' ? req.url : '',
        pathname: new URL(typeof req.url === 'string' ? req.url : '/', 'http://localhost').pathname,
        query: {},
        method: req.method || 'GET',
        headers: req.headers || {}
      };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getMimeType,
  injectIntoTemplate,
  readTemplate,
  clearTemplateCache,
  resolveStaticAsset,
  createRequestContext
};
