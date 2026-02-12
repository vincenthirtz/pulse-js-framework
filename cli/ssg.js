/**
 * Pulse Static Site Generation (SSG)
 *
 * Pre-renders routes to static HTML files at build time.
 * Supports selective SSG (some routes static, others dynamic),
 * incremental regeneration, and build manifest generation.
 *
 * @module pulse-js-framework/cli/ssg
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, sep } from 'path';
import { log } from './logger.js';
import { createTimer, createProgressBar, formatDuration, createSpinner } from './utils/cli-ui.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SSG_OPTIONS = {
  routes: [],
  outDir: 'dist',
  template: null,
  concurrent: 4,
  timeout: 10000,
  trailingSlash: true,
  fallback: '404.html'
};

// ============================================================================
// Route Discovery
// ============================================================================

/**
 * Discover routes from a Pulse router configuration or explicit list.
 *
 * @param {Object} options - Discovery options
 * @param {string[]} [options.routes] - Explicit route list
 * @param {string} [options.routerFile] - Path to router config file
 * @param {string} [options.srcDir] - Source directory for page discovery
 * @returns {string[]} Array of route paths to pre-render
 */
export function discoverRoutes(options = {}) {
  const { routes = [], srcDir } = options;

  // If explicit routes provided, use them
  if (routes.length > 0) {
    return routes;
  }

  // Try to discover from pages directory (convention-based)
  if (srcDir) {
    const pagesDir = join(srcDir, 'pages');
    if (existsSync(pagesDir)) {
      return discoverPagesRoutes(pagesDir);
    }
  }

  // Default: just the root route
  return ['/'];
}

/**
 * Discover routes from a pages directory (file-based routing).
 * @param {string} pagesDir - Pages directory path
 * @param {string} [prefix=''] - Route prefix
 * @returns {string[]}
 */
function discoverPagesRoutes(pagesDir, prefix = '') {
  const routes = [];

  try {
    const entries = readdirSync(pagesDir);
    for (const entry of entries) {
      const fullPath = join(pagesDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        routes.push(...discoverPagesRoutes(fullPath, `${prefix}/${entry}`));
      } else if (entry.endsWith('.pulse') || entry.endsWith('.js')) {
        const name = entry.replace(/\.(pulse|js)$/, '');
        if (name === 'index') {
          routes.push(prefix || '/');
        } else if (!name.startsWith('_') && !name.startsWith('[')) {
          routes.push(`${prefix}/${name}`);
        }
      }
    }
  } catch {
    // Directory might not exist
  }

  return routes;
}

// ============================================================================
// Static Site Generation
// ============================================================================

/**
 * @typedef {Object} SSGOptions
 * @property {string[]} [routes] - Routes to pre-render
 * @property {string} [outDir='dist'] - Output directory
 * @property {string} [template] - HTML template string or path
 * @property {number} [concurrent=4] - Max concurrent renders
 * @property {number} [timeout=10000] - Render timeout per route (ms)
 * @property {boolean} [trailingSlash=true] - Add trailing slash to dirs
 * @property {string} [fallback='404.html'] - Fallback page filename
 * @property {Function} [getStaticPaths] - Dynamic route path generator
 * @property {Function} [onPageGenerated] - Callback per page
 */

/**
 * @typedef {Object} SSGResult
 * @property {number} totalRoutes - Number of routes rendered
 * @property {number} successCount - Successful renders
 * @property {number} errorCount - Failed renders
 * @property {string[]} generatedFiles - List of generated file paths
 * @property {Object[]} errors - Error details
 * @property {number} duration - Total duration in ms
 */

/**
 * Generate static HTML files for all routes.
 *
 * @param {SSGOptions} options - SSG options
 * @returns {Promise<SSGResult>}
 */
export async function generateStaticSite(options = {}) {
  const config = { ...DEFAULT_SSG_OPTIONS, ...options };
  const timer = createTimer();
  const result = {
    totalRoutes: 0,
    successCount: 0,
    errorCount: 0,
    generatedFiles: [],
    errors: [],
    duration: 0
  };

  const root = process.cwd();
  const outDir = join(root, config.outDir);

  // Discover routes
  let routes = config.routes.length > 0
    ? config.routes
    : discoverRoutes({ srcDir: join(root, 'src') });

  // Handle dynamic paths
  if (config.getStaticPaths) {
    const dynamicPaths = await config.getStaticPaths();
    routes = [...new Set([...routes, ...dynamicPaths])];
  }

  result.totalRoutes = routes.length;

  if (routes.length === 0) {
    log.warn('No routes found for SSG. Add routes to pulse.config.js or use --routes flag.');
    result.duration = timer.elapsed();
    return result;
  }

  log.info(`\n  Pre-rendering ${routes.length} route${routes.length > 1 ? 's' : ''}...\n`);

  const progress = createProgressBar({
    total: routes.length,
    label: 'SSG',
    width: 25
  });

  // Get HTML template
  const template = config.template || getDefaultTemplate(root);

  // Render routes with concurrency limit
  const chunks = chunkArray(routes, config.concurrent);

  for (const chunk of chunks) {
    const promises = chunk.map(async (route) => {
      try {
        const html = await renderRoute(route, template, config);
        const filePath = routeToFilePath(route, outDir, config.trailingSlash);

        // Ensure directory exists
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        writeFileSync(filePath, html, 'utf-8');
        result.generatedFiles.push(filePath);
        result.successCount++;

        if (config.onPageGenerated) {
          config.onPageGenerated({ route, filePath, html });
        }
      } catch (err) {
        result.errors.push({ route, error: err.message });
        result.errorCount++;
        log.warn(`  Failed to render ${route}: ${err.message}`);
      }
      progress.tick();
    });

    await Promise.all(promises);
  }

  progress.done();
  result.duration = timer.elapsed();
  return result;
}

/**
 * Render a single route to HTML.
 *
 * @param {string} route - Route path
 * @param {string} template - HTML template
 * @param {Object} config - SSG config
 * @returns {Promise<string>} Rendered HTML
 */
async function renderRoute(route, template, config) {
  // Dynamic import to avoid circular dependencies
  const { renderToString, serializeState } = await import('../runtime/ssr.js');
  const { setSSRMode } = await import('../runtime/ssr.js');

  // Try to load the app module
  let appFactory;
  try {
    const appModule = await import(join(process.cwd(), 'dist', 'assets', 'main.js'));
    appFactory = appModule.default || appModule.App || appModule.createApp;
  } catch {
    // Fallback: render empty page
    return template
      .replace('<!--app-html-->', `<div data-ssg-route="${escapeRoute(route)}"></div>`)
      .replace('<!--app-state-->', '');
  }

  if (!appFactory || typeof appFactory !== 'function') {
    return template
      .replace('<!--app-html-->', `<div data-ssg-route="${escapeRoute(route)}"></div>`)
      .replace('<!--app-state-->', '');
  }

  const { html, state } = await renderToString(
    () => appFactory({ route }),
    { waitForAsync: true, timeout: config.timeout, serializeState: true }
  );

  // Inject into template
  let page = template
    .replace('<!--app-html-->', html)
    .replace('<!--app-state-->',
      state ? `<script>window.__PULSE_STATE__=${serializeState(state)};</script>` : ''
    );

  return page;
}

/**
 * Get default HTML template from the project.
 * @param {string} root - Project root
 * @returns {string}
 */
function getDefaultTemplate(root) {
  const indexPath = join(root, 'dist', 'index.html');
  if (existsSync(indexPath)) {
    return readFileSync(indexPath, 'utf-8');
  }

  // Fallback template
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
</body>
</html>`;
}

/**
 * Escape a route string for safe embedding in HTML attributes.
 * @param {string} route - Route path
 * @returns {string} Escaped route
 */
function escapeRoute(route) {
  return String(route)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert a route path to a file path.
 * @param {string} route - Route path (e.g., '/about')
 * @param {string} outDir - Output directory
 * @param {boolean} trailingSlash - Whether to create index.html in directories
 * @returns {string} File path
 */
function routeToFilePath(route, outDir, trailingSlash) {
  // Sanitize route: strip directory traversal sequences
  const sanitized = route.replace(/\.\./g, '');
  const normalized = sanitized === '/' ? '/index' : sanitized;

  const resolvedOut = resolve(outDir);
  const filePath = trailingSlash
    ? resolve(outDir, normalized, 'index.html')
    : resolve(outDir, `${normalized}.html`);

  // Security: ensure output stays within outDir
  if (!filePath.startsWith(resolvedOut + sep)) {
    throw new Error(`Route "${route}" resolves outside output directory`);
  }

  return filePath;
}

/**
 * Split array into chunks for concurrency control.
 * @param {Array} arr - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array[]}
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// Build Manifest Generation
// ============================================================================

/**
 * @typedef {Object} ManifestEntry
 * @property {string} entry - Entry file path
 * @property {string[]} [css] - CSS file paths
 * @property {boolean} [lazy] - Whether the route is lazy-loaded
 * @property {string[]} [imports] - Import dependencies
 */

/**
 * Generate a build manifest from compiled output.
 *
 * @param {string} outDir - Build output directory
 * @param {Object} [options] - Generation options
 * @returns {Object} Build manifest
 */
export function generateBuildManifest(outDir, options = {}) {
  const { base = '/' } = options;
  const manifest = {
    base,
    routes: {},
    chunks: {},
    generated: new Date().toISOString()
  };

  const assetsDir = join(outDir, 'assets');
  if (!existsSync(assetsDir)) {
    return manifest;
  }

  // Scan for JS and CSS files
  try {
    const files = readdirSync(assetsDir);

    for (const file of files) {
      if (file.endsWith('.js')) {
        // Detect route-based chunks
        const name = file.replace('.js', '');
        if (name === 'main' || name === 'index') {
          manifest.routes['/'] = {
            entry: `/assets/${file}`,
            css: findMatchingCSS(assetsDir, name, files)
          };
        } else {
          manifest.routes[`/${name}`] = {
            entry: `/assets/${file}`,
            css: findMatchingCSS(assetsDir, name, files),
            lazy: true
          };
        }
      }
    }
  } catch {
    // Output directory might not exist yet
  }

  return manifest;
}

/**
 * Find matching CSS files for a JS chunk.
 * @param {string} dir - Assets directory
 * @param {string} name - Chunk name
 * @param {string[]} files - All files in directory
 * @returns {string[]}
 */
function findMatchingCSS(dir, name, files) {
  return files
    .filter(f => f.endsWith('.css') && f.startsWith(name))
    .map(f => `/assets/${f}`);
}

// ============================================================================
// CLI Integration
// ============================================================================

/**
 * Run SSG from CLI arguments.
 *
 * @param {string[]} args - CLI arguments
 * @returns {Promise<void>}
 */
export async function runSSG(args) {
  const timer = createTimer();
  const spinner = createSpinner('Starting static site generation...');

  // Parse CLI args
  const options = parseSSGArgs(args);

  try {
    const result = await generateStaticSite(options);

    spinner.success(`SSG complete in ${formatDuration(result.duration)}`);

    log.success(`
  Static Site Generation Complete
  ─────────────────────────────────
  Routes:     ${result.totalRoutes}
  Generated:  ${result.successCount}
  Errors:     ${result.errorCount}
  Duration:   ${formatDuration(result.duration)}
    `);

    if (result.errors.length > 0) {
      log.warn('  Failed routes:');
      for (const { route, error } of result.errors) {
        log.warn(`    ${route}: ${error}`);
      }
    }
  } catch (err) {
    spinner.error(`SSG failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Parse SSG CLI arguments.
 * @param {string[]} args - CLI arguments
 * @returns {SSGOptions}
 */
function parseSSGArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--routes' && args[i + 1]) {
      options.routes = args[++i].split(',').map(r => r.trim());
    } else if (arg === '--out-dir' && args[i + 1]) {
      options.outDir = args[++i];
    } else if (arg === '--concurrent' && args[i + 1]) {
      options.concurrent = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--no-trailing-slash') {
      options.trailingSlash = false;
    }
  }

  return options;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  discoverRoutes,
  generateStaticSite,
  generateBuildManifest,
  runSSG
};
