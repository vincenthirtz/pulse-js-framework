/**
 * Pulse SSR Preload Hints - Generate <link> preload tags
 *
 * Auto-generates <link rel="preload"> and <link rel="modulepreload">
 * tags from a build manifest for lazy-loaded routes and JS chunks.
 *
 * @module pulse-js-framework/runtime/ssr-preload
 */

import { escapeHTML } from './ssr-serializer.js';

// ============================================================================
// Build Manifest
// ============================================================================

/**
 * @typedef {Object} RouteManifestEntry
 * @property {string} entry - Entry JS file path
 * @property {string[]} [css] - CSS file paths
 * @property {boolean} [lazy] - Whether the route is lazy-loaded
 * @property {string[]} [imports] - Direct import dependencies
 */

/**
 * @typedef {Object} BuildManifest
 * @property {Object<string, RouteManifestEntry>} routes - Route entries
 * @property {Object<string, string>} [chunks] - Shared chunk mapping
 * @property {string} [base] - Base URL for assets
 */

/**
 * Parse a build manifest from a JSON object or string.
 * @param {string|Object} manifest - Manifest JSON string or object
 * @returns {BuildManifest}
 */
export function parseBuildManifest(manifest) {
  if (typeof manifest === 'string') {
    return JSON.parse(manifest);
  }
  return manifest;
}

// ============================================================================
// Preload Hint Generation
// ============================================================================

/**
 * @typedef {Object} PreloadHint
 * @property {string} href - Resource URL
 * @property {string} rel - Link relation (preload, modulepreload, prefetch)
 * @property {string} [as] - Resource type (script, style, font, image)
 * @property {string} [type] - MIME type
 * @property {boolean} [crossorigin] - Whether crossorigin attribute needed
 */

/**
 * Generate preload hints for a specific route.
 *
 * @param {BuildManifest} manifest - Build manifest
 * @param {string} currentRoute - Current route path
 * @param {Object} [options] - Generation options
 * @param {boolean} [options.prefetchAdjacent=true] - Prefetch likely next routes
 * @param {string[]} [options.adjacentRoutes] - Explicit routes to prefetch
 * @returns {PreloadHint[]}
 */
export function getRoutePreloads(manifest, currentRoute, options = {}) {
  const { prefetchAdjacent = true, adjacentRoutes } = options;
  const hints = [];
  const base = manifest.base || '';

  if (!manifest.routes) return hints;

  // Current route - modulepreload for entry + preload for CSS
  const route = manifest.routes[currentRoute];
  if (route) {
    if (route.entry) {
      hints.push({
        href: base + route.entry,
        rel: 'modulepreload'
      });
    }
    if (route.css) {
      for (const css of route.css) {
        hints.push({
          href: base + css,
          rel: 'preload',
          as: 'style'
        });
      }
    }
    if (route.imports) {
      for (const imp of route.imports) {
        const chunk = manifest.chunks?.[imp] || imp;
        hints.push({
          href: base + chunk,
          rel: 'modulepreload'
        });
      }
    }
  }

  // Shared chunks
  if (manifest.chunks) {
    for (const [, chunkPath] of Object.entries(manifest.chunks)) {
      // Only add if not already included
      if (!hints.some(h => h.href === base + chunkPath)) {
        hints.push({
          href: base + chunkPath,
          rel: 'modulepreload'
        });
      }
    }
  }

  // Adjacent routes - use prefetch (lower priority)
  if (prefetchAdjacent) {
    const routesToPrefetch = adjacentRoutes || findAdjacentRoutes(manifest, currentRoute);
    for (const adjRoute of routesToPrefetch) {
      const adjEntry = manifest.routes[adjRoute];
      if (adjEntry?.entry && adjEntry.lazy) {
        hints.push({
          href: base + adjEntry.entry,
          rel: 'prefetch',
          as: 'script'
        });
      }
    }
  }

  return hints;
}

/**
 * Find adjacent routes that are likely navigation targets.
 * Simple heuristic: routes at the same depth or one level deeper.
 *
 * @param {BuildManifest} manifest - Build manifest
 * @param {string} currentRoute - Current route
 * @returns {string[]}
 */
function findAdjacentRoutes(manifest, currentRoute) {
  if (!manifest.routes) return [];

  const currentDepth = currentRoute.split('/').filter(Boolean).length;
  const adjacent = [];

  for (const route of Object.keys(manifest.routes)) {
    if (route === currentRoute) continue;
    const depth = route.split('/').filter(Boolean).length;
    // Same depth or one deeper (child routes)
    if (depth >= currentDepth && depth <= currentDepth + 1) {
      adjacent.push(route);
    }
  }

  return adjacent.slice(0, 5); // Limit to 5 prefetch hints
}

/**
 * Generate HTML link tags from preload hints.
 *
 * @param {BuildManifest} manifest - Build manifest
 * @param {string} currentRoute - Current route path
 * @param {Object} [options] - Generation options
 * @returns {string} HTML link tags
 *
 * @example
 * const hints = generatePreloadHints(manifest, '/dashboard');
 * // '<link rel="modulepreload" href="/assets/dashboard.js">\n...'
 */
export function generatePreloadHints(manifest, currentRoute, options = {}) {
  const parsed = parseBuildManifest(manifest);
  const hints = getRoutePreloads(parsed, currentRoute, options);
  return hintsToHTML(hints);
}

/**
 * Convert preload hints to HTML link tags.
 * @param {PreloadHint[]} hints
 * @returns {string}
 */
export function hintsToHTML(hints) {
  if (!hints || hints.length === 0) return '';

  return hints.map(hint => {
    const parts = [`rel="${hint.rel}"`, `href="${escapeHTML(hint.href)}"`];
    if (hint.as) parts.push(`as="${hint.as}"`);
    if (hint.type) parts.push(`type="${hint.type}"`);
    if (hint.crossorigin) parts.push('crossorigin');
    return `<link ${parts.join(' ')}>`;
  }).join('\n');
}

// ============================================================================
// Preload Middleware (for server adapters)
// ============================================================================

/**
 * Create a middleware function that generates preload hints for each request.
 *
 * @param {BuildManifest|string} manifest - Build manifest or path to JSON
 * @param {Object} [options] - Options
 * @returns {Function} Middleware: (route) => string
 *
 * @example
 * const getPreloads = createPreloadMiddleware(manifest);
 * const hints = getPreloads('/dashboard');
 * // Inject into <head>
 */
export function createPreloadMiddleware(manifest, options = {}) {
  const parsed = parseBuildManifest(manifest);

  return function getPreloads(route) {
    return generatePreloadHints(parsed, route, options);
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  parseBuildManifest,
  getRoutePreloads,
  generatePreloadHints,
  hintsToHTML,
  createPreloadMiddleware
};
