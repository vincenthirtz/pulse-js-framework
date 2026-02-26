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

import { relative } from 'path';
import { getComponentTypeFromSource } from '../compiler/directives.js';
import {
  createImportViolationError, buildManifest, writeManifestToDisk,
  loadClientManifest, getComponentChunk, getClientComponentIds,
  DIRECTIVE_REGEX, COMPONENT_ID_REGEX, EXPORT_CONST_REGEX, CLIENT_CHUNK_PREFIX,
  DEFAULT_MANIFEST_PATH, DEFAULT_MANIFEST_FILENAME
} from './shared.js';

/**
 * Default options for Server Components Webpack plugin
 */
const DEFAULT_OPTIONS = {
  manifestPath: DEFAULT_MANIFEST_PATH,
  base: '',
  manifestFilename: DEFAULT_MANIFEST_FILENAME,
  quiet: false
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
        const directiveMatch = source.match(DIRECTIVE_REGEX);

        if (directiveMatch) {
          // Extract component ID
          const componentIdMatch = source.match(COMPONENT_ID_REGEX);
          const exportMatch = source.match(EXPORT_CONST_REGEX);

          const componentId = componentIdMatch ? componentIdMatch[1] : (exportMatch ? exportMatch[1] : null);

          if (componentId) {
            // Store this as a Client Component
            clientComponents.set(componentId, {
              file: module.resource,
              chunk: null, // Will be filled later
              moduleId: module.id
            });

            const relativePath = relative(process.cwd(), module.resource);
            if (!this.options.quiet) console.log(`[Pulse Server Components] Detected Client Component: ${componentId} (${relativePath})`);
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
                    if (!this.options.quiet) console.log(`[Pulse Server Components] Mapped ${componentId} → ${jsFile}`);
                  }
                  break;
                }
              }
            }
          }

          const manifest = buildManifest(clientComponents, { base: this.options.base });

          // Emit manifest as asset
          const manifestJson = JSON.stringify(manifest, null, 2);
          const { RawSource } = compilation.compiler.webpack.sources;

          compilation.emitAsset(
            this.options.manifestFilename,
            new RawSource(manifestJson)
          );

          if (!this.options.quiet) console.log(`[Pulse Server Components] Generated client manifest with ${clientComponents.size} components`);
        }
      );

      // Write manifest to filesystem after emit
      compilation.hooks.afterProcessAssets.tap(pluginName, () => {
        if (clientComponents.size === 0) {
          return;
        }

        const manifest = buildManifest(clientComponents, { base: this.options.base });
        writeManifestToDisk(manifest, this.options);
      });
    });
  }
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

// Re-export shared manifest helpers
export { loadClientManifest, getComponentChunk, getClientComponentIds } from './shared.js';

export default PulseServerComponentsPlugin;
