/**
 * Pulse Server Components - ESBuild Plugin
 *
 * Enables Server Components architecture in ESBuild-based builds:
 * - Detects Client Components via __directive metadata
 * - Validates Client → Server import boundaries
 * - Maps Client Components to output chunks (best-effort via metafile)
 * - Generates client manifest (component ID → chunk URL mapping)
 *
 * Usage:
 * ```javascript
 * import * as esbuild from 'esbuild';
 * import pulsePlugin from 'pulse-js-framework/esbuild';
 * import pulseServerComponents from 'pulse-js-framework/esbuild/server-components';
 *
 * await esbuild.build({
 *   entryPoints: ['src/main.js'],
 *   bundle: true,
 *   outdir: 'dist',
 *   format: 'esm',
 *   splitting: true,
 *   metafile: true,
 *   plugins: [
 *     pulsePlugin(),
 *     pulseServerComponents()
 *   ]
 * });
 * ```
 *
 * @module pulse-js-framework/loader/esbuild-plugin-server-components
 */

import { readFileSync } from 'fs';
import { relative, dirname } from 'path';
import { getComponentTypeFromSource } from '../compiler/directives.js';
import {
  extractImports,
  createImportViolationError,
  buildManifest,
  writeManifestToDisk,
  DIRECTIVE_REGEX,
  COMPONENT_ID_REGEX,
  EXPORT_CONST_REGEX,
  CLIENT_CHUNK_PREFIX,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_MANIFEST_FILENAME
} from './shared.js';

/**
 * Default options for Server Components plugin
 */
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
 * Create Pulse Server Components ESBuild plugin
 *
 * @param {Object} options - Plugin options
 * @param {string} [options.manifestPath] - Path to output client manifest
 * @param {string} [options.base] - Base URL for chunk paths
 * @param {string} [options.manifestFilename] - Manifest filename
 * @returns {Object} ESBuild plugin
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
    name: 'pulse-server-components',

    setup(build) {
      // Detect component types and Client Components during load
      build.onLoad({ filter: /\.(js|ts|jsx|tsx|pulse)$/ }, async (args) => {
        let source;
        try {
          source = readFileSync(args.path, 'utf8');
        } catch {
          return undefined;
        }

        // Determine component type
        const componentType = getComponentTypeFromSource(source, args.path);
        componentTypes.set(args.path, componentType);

        // Track imports for boundary validation
        const imports = extractImports(source);
        importGraph.set(args.path, new Set(imports));

        // Detect Client Components in .pulse files
        if (args.path.endsWith('.pulse')) {
          const directiveMatch = source.match(DIRECTIVE_REGEX);

          if (directiveMatch) {
            const componentIdMatch = source.match(COMPONENT_ID_REGEX);
            const exportMatch = source.match(EXPORT_CONST_REGEX);
            const componentId = componentIdMatch?.[1] || exportMatch?.[1];

            if (componentId) {
              clientComponents.set(componentId, {
                file: args.path,
                chunk: null
              });

              if (!config.quiet) {
                console.log(`[Pulse Server Components] Detected Client Component: ${componentId} (${relative(process.cwd(), args.path)})`);
              }
            }
          }
        }

        // Don't modify — let main pulse plugin handle transform
        return undefined;
      });

      // Validate imports + generate manifest after build
      build.onEnd(async (result) => {
        // Skip on build errors
        if (result.errors.length > 0) return;

        // Validate Client → Server import boundaries
        for (const [filePath, type] of componentTypes) {
          if (type !== 'client') continue;

          const imports = importGraph.get(filePath) || new Set();
          for (const imp of imports) {
            // Skip bare specifiers (external packages)
            if (!imp.startsWith('.') && !imp.startsWith('/')) continue;

            try {
              const resolved = await build.resolve(imp, {
                kind: 'import-statement',
                resolveDir: dirname(filePath)
              });
              if (resolved.errors.length > 0) continue;

              const depType = componentTypes.get(resolved.path);

              // Check for Client → Server violation
              if (depType === 'server') {
                console.error(createImportViolationError(filePath, resolved.path, imp));
              }
            } catch {
              // Ignore resolution errors (might be external packages)
              continue;
            }
          }
        }

        // Skip manifest if no Client Components detected
        if (clientComponents.size === 0) return;

        // Map output files to components (best-effort via metafile)
        if (result.metafile) {
          for (const [outputPath, meta] of Object.entries(result.metafile.outputs)) {
            // Check entryPoint match
            if (meta.entryPoint) {
              for (const [componentId, info] of clientComponents) {
                if (meta.entryPoint === info.file) {
                  info.chunk = outputPath;
                  if (!config.quiet) {
                    console.log(`[Pulse Server Components] Mapped ${componentId} → ${outputPath}`);
                  }
                }
              }
            }

            // Check inputs match (for code-split chunks)
            if (meta.inputs) {
              for (const [componentId, info] of clientComponents) {
                if (!info.chunk && meta.inputs[info.file]) {
                  info.chunk = outputPath;
                  if (!config.quiet) {
                    console.log(`[Pulse Server Components] Mapped ${componentId} → ${outputPath}`);
                  }
                }
              }
            }
          }
        }

        // Build and write manifest
        const manifest = buildManifest(clientComponents, config);
        writeManifestToDisk(manifest, config);

        if (!config.quiet) {
          console.log(`[Pulse Server Components] Generated client manifest with ${clientComponents.size} components`);
        }
      });
    }
  };
}

// Re-export shared manifest helpers
export { loadClientManifest, getComponentChunk, getClientComponentIds } from './shared.js';
