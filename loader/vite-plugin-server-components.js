/**
 * Pulse Server Components - Vite Plugin
 *
 * Enables automatic code splitting for Client Components marked with 'use client'
 * and generates a client manifest for Server Components architecture.
 *
 * Features:
 * - Detects Client Components via __directive metadata
 * - Creates separate chunks for Client Components
 * - Generates client manifest (component ID → chunk URL mapping)
 * - Injects manifest into SSR builds
 *
 * Usage:
 * ```javascript
 * import pulse from 'pulse-js-framework/vite';
 * import pulseServerComponents from 'pulse-js-framework/vite/server-components';
 *
 * export default {
 *   plugins: [
 *     pulse(),
 *     pulseServerComponents()
 *   ]
 * };
 * ```
 *
 * @module pulse-js-framework/loader/vite-plugin-server-components
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, relative, posix } from 'path';
import { getComponentTypeFromSource } from '../compiler/directives.js';
import { sanitizeImportPath } from '../runtime/server-components/utils/path-sanitizer.js';

/**
 * Default options for Server Components plugin
 */
const DEFAULT_OPTIONS = {
  // Output directory for client manifest
  manifestPath: 'dist/.pulse-manifest.json',

  // Public base path for chunk URLs (empty for relative paths)
  base: '',

  // Whether to inject manifest into SSR HTML
  injectManifest: true,

  // Custom manifest filename (for different environments)
  manifestFilename: '.pulse-manifest.json'
};

/**
 * Create Pulse Server Components Vite plugin
 *
 * @param {Object} options - Plugin options
 * @param {string} [options.manifestPath] - Path to output client manifest
 * @param {string} [options.base] - Base URL for chunk paths
 * @param {boolean} [options.injectManifest] - Inject manifest into SSR builds
 * @param {string} [options.manifestFilename] - Manifest filename
 * @returns {Object} Vite plugin
 */
export default function pulseServerComponentsPlugin(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Store detected Client Components during build
  const clientComponents = new Map(); // componentId → { file, chunk }

  // Track component types: filePath → 'client' | 'server' | 'shared'
  const componentTypes = new Map();

  // Track imports: filePath → Set<resolvedImportPath>
  const importGraph = new Map();

  // Vite config (available after configResolved)
  let viteConfig = null;

  // Track if we're in SSR build mode
  let isSsrBuild = false;

  return {
    name: 'vite-plugin-pulse-server-components',

    // Run after the main pulse plugin
    enforce: 'post',

    /**
     * Store Vite config for later use
     */
    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
      isSsrBuild = !!resolvedConfig.build?.ssr;
    },

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
      const directiveMatch = code.match(/__directive:\s*["']use client["']/);

      if (directiveMatch) {
        // Extract component ID from export
        // Look for: export const ComponentName = {
        const exportMatch = code.match(/export const (\w+) = \{/);
        const componentIdMatch = code.match(/__componentId:\s*["'](\w+)["']/);

        const componentId = componentIdMatch ? componentIdMatch[1] : (exportMatch ? exportMatch[1] : null);

        if (componentId) {
          // Store this as a Client Component
          clientComponents.set(componentId, {
            file: id,
            chunk: null // Will be filled in during generateBundle
          });

          console.log(`[Pulse Server Components] Detected Client Component: ${componentId} (${relative(process.cwd(), id)})`);
        }
      }

      return null; // Don't modify the code
    },

    /**
     * Validate imports after all modules are transformed
     */
    buildEnd() {
      // Get project root for path validation
      const projectRoot = viteConfig?.root || process.cwd();

      // Validate Client → Server import violations
      for (const [filePath, componentType] of componentTypes.entries()) {
        if (componentType === 'client') {
          const imports = importGraph.get(filePath) || new Set();

          for (const importPath of imports) {
            // SECURITY: Validate import path to prevent directory traversal
            try {
              sanitizeImportPath(importPath, projectRoot);
            } catch (error) {
              this.warn({
                message: `[Security] Invalid import path detected: ${importPath}\n${error.message}`,
                id: filePath
              });
              continue;
            }

            // Resolve import to absolute path
            const resolvedPath = this.resolve(importPath, filePath, { skipSelf: true });
            if (!resolvedPath || resolvedPath.external) continue;

            const resolvedId = resolvedPath.id;
            const importedType = componentTypes.get(resolvedId);

            // Check for Client → Server violation
            if (importedType === 'server') {
              this.error({
                message: createImportViolationError(filePath, resolvedId, importPath),
                id: filePath
              });
            }
          }
        }
      }
    },

    /**
     * Configure Rollup output to create separate chunks for Client Components
     */
    config(config, { command }) {
      // Only apply in build mode (not dev server)
      if (command !== 'build') {
        return null;
      }

      return {
        build: {
          rollupOptions: {
            output: {
              // Manual chunks for Client Components
              manualChunks(id) {
                // Check if this file is a Client Component
                for (const [componentId, info] of clientComponents.entries()) {
                  if (id === info.file) {
                    // Create a separate chunk for this Client Component
                    return `client-${componentId}`;
                  }
                }

                // Default chunking for everything else
                return undefined;
              }
            }
          }
        }
      };
    },

    /**
     * Generate client manifest after bundle is created
     */
    generateBundle(outputOptions, bundle) {
      // Skip in SSR builds (manifest is only for client bundles)
      if (isSsrBuild) {
        return;
      }

      // Map chunk names to their final filenames
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          // Check if this chunk corresponds to a Client Component
          for (const [componentId, info] of clientComponents.entries()) {
            // Match by chunk name or by checking if the component file is in the chunk
            if (chunk.name === `client-${componentId}` ||
                (chunk.facadeModuleId && chunk.facadeModuleId === info.file)) {

              // Store the chunk filename
              info.chunk = fileName;

              console.log(`[Pulse Server Components] Mapped ${componentId} → ${fileName}`);
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
          const base = config.base || '';
          const chunkUrl = posix.join(base, info.chunk);

          manifest.components[componentId] = {
            id: componentId,
            chunk: chunkUrl,
            exports: ['default', componentId] // Pulse components export both
          };
        }
      }

      // Write manifest as JSON asset
      const manifestJson = JSON.stringify(manifest, null, 2);

      this.emitFile({
        type: 'asset',
        fileName: config.manifestFilename,
        source: manifestJson
      });

      console.log(`[Pulse Server Components] Generated client manifest with ${clientComponents.size} components`);
    },

    /**
     * Write manifest to file system after build completes
     */
    closeBundle() {
      // Only in client builds
      if (isSsrBuild || clientComponents.size === 0) {
        return;
      }

      // Build manifest object
      const manifest = {
        version: '1.0',
        components: {}
      };

      for (const [componentId, info] of clientComponents.entries()) {
        if (info.chunk) {
          const base = config.base || '';
          const chunkUrl = posix.join(base, info.chunk);

          manifest.components[componentId] = {
            id: componentId,
            chunk: chunkUrl,
            exports: ['default', componentId]
          };
        }
      }

      // Write to file system (in addition to emitted asset)
      if (config.manifestPath) {
        try {
          const manifestDir = dirname(config.manifestPath);
          mkdirSync(manifestDir, { recursive: true });
          writeFileSync(config.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
          console.log(`[Pulse Server Components] Manifest written to ${config.manifestPath}`);
        } catch (error) {
          console.warn(`[Pulse Server Components] Failed to write manifest: ${error.message}`);
        }
      }
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract import statements from source code
 * @param {string} code - Source code
 * @returns {Array<string>} Import sources
 */
function extractImports(code) {
  const imports = [];

  // Match ES6 import statements
  const importRegex = /import\s+(?:{[^}]*}|[\w$]+|\*\s+as\s+[\w$]+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // Match dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

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
 * Helper function to load client manifest (for SSR)
 *
 * @param {string} manifestPath - Path to manifest file
 * @returns {Object} Client manifest
 *
 * @example
 * import { loadClientManifest } from 'pulse-js-framework/vite/server-components';
 *
 * const manifest = loadClientManifest('./dist/.pulse-manifest.json');
 * // Use manifest for SSR: renderServerComponent(Component, props, { clientManifest: manifest.components })
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
