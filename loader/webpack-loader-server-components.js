/**
 * Pulse Server Components - Webpack Loader Extension
 *
 * Extends webpack-loader.js with Server Components support:
 * - Detects Client Components via __directive metadata
 * - Generates client manifest (component ID → chunk URL mapping)
 * - Writes manifest to filesystem
 *
 * Usage in webpack.config.js:
 * ```js
 * const { addServerComponentsSupport } = require('pulse-js-framework/loader/webpack-loader-server-components');
 *
 * module.exports = {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.pulse$/,
 *         use: [
 *           'style-loader',
 *           'css-loader',
 *           'pulse-js-framework/loader/webpack-loader'
 *         ]
 *       }
 *     ]
 *   },
 *   plugins: [
 *     addServerComponentsSupport({
 *       manifestPath: 'dist/.pulse-manifest.json'
 *     })
 *   ]
 * };
 * ```
 *
 * @module pulse-js-framework/loader/webpack-loader-server-components
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, posix, relative } from 'path';
import { getComponentTypeFromSource } from '../compiler/directives.js';

/**
 * Default options for Server Components Webpack plugin
 */
const DEFAULT_OPTIONS = {
  // Output directory for client manifest
  manifestPath: 'dist/.pulse-manifest.json',

  // Public base path for chunk URLs (empty for relative paths)
  base: '',

  // Custom manifest filename
  manifestFilename: '.pulse-manifest.json'
};

/**
 * Storage for Client Components per compilation
 * WeakMap<Compilation, Map<componentId, { file, chunk }>>
 */
const compilationClientComponents = new WeakMap();

/**
 * Get or create Client Components map for a compilation
 */
function getClientComponentsMap(compilation) {
  if (!compilationClientComponents.has(compilation)) {
    compilationClientComponents.set(compilation, new Map());
  }
  return compilationClientComponents.get(compilation);
}

/**
 * Webpack plugin for Pulse Server Components support
 */
class PulseServerComponentsPlugin {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  apply(compiler) {
    const pluginName = 'PulseServerComponentsPlugin';

    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      const clientComponents = getClientComponentsMap(compilation);
      const componentTypes = new Map(); // module.resource → 'client' | 'server' | 'shared'

      // Hook into module processing to detect Client Components and track types
      compilation.hooks.succeedModule.tap(pluginName, (module) => {
        if (!module.resource) return;

        // Get the compiled source
        const source = module._source?.source?.();
        if (!source || typeof source !== 'string') {
          return;
        }

        // Determine component type for all JS/TS files
        if (/\.(js|ts|jsx|tsx|pulse)$/.test(module.resource)) {
          const componentType = getComponentTypeFromSource(source, module.resource);
          componentTypes.set(module.resource, componentType);
        }

        // Only process .pulse files for Client Component detection
        if (!module.resource.endsWith('.pulse')) {
          return;
        }

        // Check if this module exports a Client Component
        // Look for: __directive: "use client"
        const directiveMatch = source.match(/__directive:\s*["']use client["']/);

        if (directiveMatch) {
          // Extract component ID
          const componentIdMatch = source.match(/__componentId:\s*["'](\w+)["']/);
          const exportMatch = source.match(/export const (\w+) = \{/);

          const componentId = componentIdMatch ? componentIdMatch[1] : (exportMatch ? exportMatch[1] : null);

          if (componentId) {
            // Store this as a Client Component
            clientComponents.set(componentId, {
              file: module.resource,
              chunk: null, // Will be filled later
              moduleId: module.id
            });

            const relativePath = relative(process.cwd(), module.resource);
            console.log(`[Pulse Server Components] Detected Client Component: ${componentId} (${relativePath})`);
          }
        }
      });

      // Validate imports after module graph is built
      compilation.hooks.finishModules.tap(pluginName, (modules) => {
        for (const module of modules) {
          if (!module.resource) continue;

          const moduleType = componentTypes.get(module.resource);
          if (moduleType !== 'client') continue;

          // Check all dependencies
          for (const dependency of module.dependencies || []) {
            const depModule = compilation.moduleGraph?.getModule?.(dependency);
            if (!depModule || !depModule.resource) continue;

            const depType = componentTypes.get(depModule.resource);

            // Client → Server violation
            if (depType === 'server') {
              const error = new Error(createImportViolationError(
                module.resource,
                depModule.resource,
                dependency.userRequest || depModule.resource
              ));
              compilation.errors.push(error);
            }
          }
        }
      });

      // Generate manifest after all assets are processed
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
        },
        (assets) => {
          // Skip if no Client Components detected
          if (clientComponents.size === 0) {
            return;
          }

          // Map modules to their chunks
          for (const [componentId, info] of clientComponents.entries()) {
            // Find chunk(s) containing this module
            for (const chunk of compilation.chunks) {
              for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
                if (module.resource === info.file) {
                  // Get chunk filename
                  const chunkFiles = Array.from(chunk.files);
                  const jsFile = chunkFiles.find(f => f.endsWith('.js'));

                  if (jsFile) {
                    info.chunk = jsFile;
                    console.log(`[Pulse Server Components] Mapped ${componentId} → ${jsFile}`);
                  }
                  break;
                }
              }
            }
          }

          // Build client manifest
          const manifest = {
            version: '1.0',
            components: {}
          };

          for (const [componentId, info] of clientComponents.entries()) {
            if (info.chunk) {
              const base = this.options.base || '';
              const chunkUrl = posix.join(base, info.chunk);

              manifest.components[componentId] = {
                id: componentId,
                chunk: chunkUrl,
                exports: ['default', componentId]
              };
            }
          }

          // Emit manifest as asset
          const manifestJson = JSON.stringify(manifest, null, 2);
          const { RawSource } = compilation.compiler.webpack.sources;

          compilation.emitAsset(
            this.options.manifestFilename,
            new RawSource(manifestJson)
          );

          console.log(`[Pulse Server Components] Generated client manifest with ${clientComponents.size} components`);
        }
      );

      // Write manifest to filesystem after emit
      compilation.hooks.afterProcessAssets.tap(pluginName, () => {
        if (clientComponents.size === 0) {
          return;
        }

        // Build manifest object
        const manifest = {
          version: '1.0',
          components: {}
        };

        for (const [componentId, info] of clientComponents.entries()) {
          if (info.chunk) {
            const base = this.options.base || '';
            const chunkUrl = posix.join(base, info.chunk);

            manifest.components[componentId] = {
              id: componentId,
              chunk: chunkUrl,
              exports: ['default', componentId]
            };
          }
        }

        // Write to file system
        if (this.options.manifestPath) {
          try {
            const manifestDir = dirname(this.options.manifestPath);
            mkdirSync(manifestDir, { recursive: true });
            writeFileSync(this.options.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            console.log(`[Pulse Server Components] Manifest written to ${this.options.manifestPath}`);
          } catch (error) {
            console.warn(`[Pulse Server Components] Failed to write manifest: ${error.message}`);
          }
        }
      });
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create import violation error message
 * @param {string} clientPath - Client Component path
 * @param {string} serverPath - Server Component path
 * @param {string} importSource - Import statement source
 * @returns {string} Error message
 */
function createImportViolationError(clientPath, serverPath, importSource) {
  const clientRelative = relative(process.cwd(), clientPath);
  const serverRelative = relative(process.cwd(), serverPath);

  return `
[Pulse] Import Violation: Client Component cannot import Server Component
  at ${clientRelative}
  importing ${importSource}
  resolved to ${serverRelative}

  Client Components can only import:
  • Other Client Components ('use client')
  • Shared utilities (no directive)
  • Third-party packages

  → Move shared logic to a Client Component
  → Use Server Actions for server-side operations
  → Create a wrapper Client Component that calls Server Actions

  See: https://pulse-js.fr/server-components#import-rules
  `.trim();
}

/**
 * Helper function to add Server Components support to Webpack config
 *
 * @param {Object} options - Plugin options
 * @returns {PulseServerComponentsPlugin} Webpack plugin instance
 *
 * @example
 * const { addServerComponentsSupport } = require('pulse-js-framework/loader/webpack-loader-server-components');
 *
 * module.exports = {
 *   plugins: [
 *     addServerComponentsSupport({ manifestPath: 'dist/.pulse-manifest.json' })
 *   ]
 * };
 */
export function addServerComponentsSupport(options = {}) {
  return new PulseServerComponentsPlugin(options);
}

/**
 * Helper function to load client manifest (for SSR)
 *
 * @param {string} manifestPath - Path to manifest file
 * @returns {Object} Client manifest
 */
export function loadClientManifest(manifestPath) {
  try {
    const { readFileSync } = require('fs');
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load client manifest from ${manifestPath}:`, error.message);
    return { version: '1.0', components: {} };
  }
}

/**
 * Helper function to get client component chunk URL
 *
 * @param {Object} manifest - Client manifest
 * @param {string} componentId - Component ID
 * @returns {string|null} Chunk URL or null if not found
 */
export function getComponentChunk(manifest, componentId) {
  return manifest.components[componentId]?.chunk || null;
}

/**
 * Helper function to get all client component IDs
 *
 * @param {Object} manifest - Client manifest
 * @returns {Set<string>} Set of component IDs
 */
export function getClientComponentIds(manifest) {
  return new Set(Object.keys(manifest.components));
}

export default PulseServerComponentsPlugin;
