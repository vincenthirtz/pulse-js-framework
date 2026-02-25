/**
 * Pulse Server Components - Rollup Plugin
 *
 * Enables automatic code splitting for Client Components marked with 'use client'
 * and generates a client manifest for Server Components architecture.
 *
 * Features:
 * - Detects Client Components via __directive metadata
 * - Creates separate chunks for Client Components
 * - Generates client manifest (component ID → chunk URL mapping)
 *
 * Usage:
 * ```javascript
 * import pulsePlugin from 'pulse-js-framework/rollup';
 * import pulseServerComponents from 'pulse-js-framework/rollup/server-components';
 *
 * export default {
 *   input: 'src/main.js',
 *   output: { dir: 'dist', format: 'es' },
 *   plugins: [
 *     pulsePlugin(),
 *     pulseServerComponents()
 *   ]
 * };
 * ```
 *
 * @module pulse-js-framework/loader/rollup-plugin-server-components
 */

import { relative } from 'path';
import {
  getComponentTypeFromSource
} from '../compiler/directives.js';
import {
  extractImports, createImportViolationError, buildManifest, writeManifestToDiskAsync,
  DIRECTIVE_REGEX, COMPONENT_ID_REGEX, EXPORT_CONST_REGEX, CLIENT_CHUNK_PREFIX,
  DEFAULT_MANIFEST_PATH, DEFAULT_MANIFEST_FILENAME
} from './shared.js';

/**
 * Default options for Server Components plugin
 */
const DEFAULT_OPTIONS = {
  manifestPath: DEFAULT_MANIFEST_PATH,
  base: '',
  manifestFilename: DEFAULT_MANIFEST_FILENAME,
  quiet: false
};

/**
 * Create Pulse Server Components Rollup plugin
 *
 * @param {Object} options - Plugin options
 * @param {string} [options.manifestPath] - Path to output client manifest
 * @param {string} [options.base] - Base URL for chunk paths
 * @param {string} [options.manifestFilename] - Manifest filename
 * @returns {Object} Rollup plugin
 */
export default function pulseServerComponentsPlugin(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Store detected Client Components during build
  const clientComponents = new Map(); // componentId → { file, chunk }

  // Track component types: filePath → 'client' | 'server' | 'shared'
  const componentTypes = new Map();

  // Track imports: filePath → Set<importPath>
  const importGraph = new Map();

  return {
    name: 'rollup-plugin-pulse-server-components',

    /**
     * Analyze transformed modules to detect Client Components and build import graph
     */
    transform(code, id) {
      // Determine component type for all JS/TS files
      if (/\.(js|ts|jsx|tsx|pulse)$/.test(id)) {
        const componentType = getComponentTypeFromSource(code, id);
        componentTypes.set(id, componentType);

        // Extract imports for validation
        const imports = extractImports(code);
        if (!importGraph.has(id)) {
          importGraph.set(id, new Set());
        }
        for (const imp of imports) {
          importGraph.get(id).add(imp);
        }
      }

      // Only process .pulse files (after they've been transformed by pulse plugin)
      if (!id.endsWith('.pulse')) {
        return null;
      }

      // Check if this module exports a Client Component
      // Look for: __directive: "use client"
      const directiveMatch = code.match(DIRECTIVE_REGEX);

      if (directiveMatch) {
        // Extract component ID from export
        const exportMatch = code.match(EXPORT_CONST_REGEX);
        const componentIdMatch = code.match(COMPONENT_ID_REGEX);

        const componentId = componentIdMatch ? componentIdMatch[1] : (exportMatch ? exportMatch[1] : null);

        if (componentId) {
          // Store this as a Client Component
          clientComponents.set(componentId, {
            file: id,
            chunk: null // Will be filled in during generateBundle
          });

          if (!config.quiet) {
            console.log(`[Pulse Server Components] Detected Client Component: ${componentId} (${relative(process.cwd(), id)})`);
          }
        }
      }

      return null; // Don't modify the code
    },

    /**
     * Validate imports after all modules are transformed
     */
    async buildEnd() {
      // Validate Client → Server import violations
      for (const [filePath, componentType] of componentTypes.entries()) {
        if (componentType === 'client') {
          const imports = importGraph.get(filePath) || new Set();

          for (const importPath of imports) {
            // Resolve import to absolute path
            try {
              const resolved = await this.resolve(importPath, filePath, { skipSelf: true });
              if (!resolved || resolved.external) continue;

              const resolvedId = resolved.id;
              const importedType = componentTypes.get(resolvedId);

              // Check for Client → Server violation
              if (importedType === 'server') {
                this.error(createImportViolationError(filePath, resolvedId, importPath));
              }
            } catch (err) {
              // Ignore resolution errors (might be external packages)
              continue;
            }
          }
        }
      }
    },

    /**
     * Configure output to create separate chunks for Client Components
     */
    outputOptions(outputOptions) {
      // Store original manualChunks function (if any)
      const originalManualChunks = outputOptions.manualChunks;

      // Override manualChunks to add Client Component splitting
      outputOptions.manualChunks = (id, api) => {
        // Check if this file is a Client Component
        for (const [componentId, info] of clientComponents.entries()) {
          if (id === info.file) {
            // Create a separate chunk for this Client Component
            return `${CLIENT_CHUNK_PREFIX}${componentId}`;
          }
        }

        // Fall back to original manualChunks if provided
        if (typeof originalManualChunks === 'function') {
          return originalManualChunks(id, api);
        } else if (originalManualChunks && typeof originalManualChunks === 'object') {
          // Handle manualChunks as object
          for (const [chunkName, moduleIds] of Object.entries(originalManualChunks)) {
            if (Array.isArray(moduleIds) && moduleIds.includes(id)) {
              return chunkName;
            }
          }
        }

        return undefined;
      };

      return outputOptions;
    },

    /**
     * Generate client manifest after bundle is created
     */
    generateBundle(outputOptions, bundle) {
      // Skip if no Client Components detected
      if (clientComponents.size === 0) {
        return;
      }

      // Map chunk names to their final filenames
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          // Check if this chunk corresponds to a Client Component
          for (const [componentId, info] of clientComponents.entries()) {
            // Match by chunk name or by checking if the component file is in the chunk
            if (chunk.name === `${CLIENT_CHUNK_PREFIX}${componentId}` ||
                (chunk.facadeModuleId && chunk.facadeModuleId === info.file)) {

              // Store the chunk filename
              info.chunk = fileName;

              if (!config.quiet) {
                console.log(`[Pulse Server Components] Mapped ${componentId} → ${fileName}`);
              }
            }
          }
        }
      }

      const manifest = buildManifest(clientComponents, config);

      // Emit manifest as JSON asset
      const manifestJson = JSON.stringify(manifest, null, 2);

      this.emitFile({
        type: 'asset',
        fileName: config.manifestFilename,
        source: manifestJson
      });

      if (!config.quiet) {
        console.log(`[Pulse Server Components] Generated client manifest with ${clientComponents.size} components`);
      }
    },

    /**
     * Write manifest to file system after build completes (async)
     */
    async closeBundle() {
      // Skip if no Client Components detected
      if (clientComponents.size === 0) {
        return;
      }

      const manifest = buildManifest(clientComponents, config);
      await writeManifestToDiskAsync(manifest, config);
    }
  };
}

// Re-export shared manifest helpers
export { loadClientManifest, getComponentChunk, getClientComponentIds } from './shared.js';
