/**
 * Pulse Loader - Shared Utilities
 *
 * Common helpers used across all build tool plugins (Vite, Webpack, Rollup,
 * ESBuild, Parcel, SWC) and Server Components plugins.
 *
 * @module pulse-js-framework/loader/shared
 */

import {
  preprocessStylesSync,
  isSassAvailable,
  isLessAvailable,
  isStylusAvailable,
  getSassVersion,
  getLessVersion,
  getStylusVersion,
  detectPreprocessor
} from '../compiler/preprocessor.js';
import { dirname, relative, posix } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';

// ============================================================================
// Server Components Constants
// ============================================================================

/** Regex to match `__directive: "use client"` in compiled output */
export const DIRECTIVE_REGEX = /__directive:\s*["']use client["']/;

/** Regex to extract component ID from `__componentId: "Name"` */
export const COMPONENT_ID_REGEX = /__componentId:\s*["'](\w+)["']/;

/** Regex to extract component name from `export const Name = {` */
export const EXPORT_CONST_REGEX = /export const (\w+) = \{/;

/** Chunk name prefix for Client Components */
export const CLIENT_CHUNK_PREFIX = 'client-';

/** Default manifest output path */
export const DEFAULT_MANIFEST_PATH = 'dist/.pulse-manifest.json';

/** Default manifest filename */
export const DEFAULT_MANIFEST_FILENAME = '.pulse-manifest.json';

// ============================================================================
// Preprocessor Cache
// ============================================================================

let preprocessorCache = null;

/**
 * Check available preprocessors (cached after first call)
 * @returns {{ sass: boolean, less: boolean, stylus: boolean }}
 */
export function checkPreprocessors() {
  if (preprocessorCache) return preprocessorCache;

  preprocessorCache = {
    sass: isSassAvailable(),
    less: isLessAvailable(),
    stylus: isStylusAvailable()
  };

  return preprocessorCache;
}

/**
 * Reset preprocessor cache (for testing)
 */
export function resetPreprocessorCache() {
  preprocessorCache = null;
}

// ============================================================================
// Preprocessor Logging
// ============================================================================

/**
 * Log available preprocessors on plugin startup.
 * @param {string} pluginLabel - e.g. 'Pulse Rollup'
 * @param {{ sassOnly?: boolean, logFn?: Function }} [options]
 */
export function logPreprocessorAvailability(pluginLabel, options = {}) {
  const { sassOnly = false, logFn = console.log } = options;
  const available = checkPreprocessors();
  const preprocessors = [];

  if (available.sass) {
    preprocessors.push(`SASS ${getSassVersion() || 'unknown'}`);
  }
  if (!sassOnly) {
    if (available.less) {
      preprocessors.push(`LESS ${getLessVersion() || 'unknown'}`);
    }
    if (available.stylus) {
      preprocessors.push(`Stylus ${getStylusVersion() || 'unknown'}`);
    }
  }

  if (preprocessors.length > 0) {
    logFn(`[${pluginLabel}] Preprocessor support: ${preprocessors.join(', ')}`);
  }
}

// ============================================================================
// CSS Regex Constants
// ============================================================================

/** Regex to extract CSS from compiled .pulse output */
export const STYLES_MATCH_REGEX = /const styles = `([^`]*)`;/;

/** Regex to remove inline style injection block (handles optional SCOPE_ID line) */
export const INLINE_STYLES_REMOVAL_REGEX =
  /\/\/ Styles\n(?:const SCOPE_ID = '[^']*';\n)?const styles = `[^`]*`;\n\n\/\/ Inject styles\nconst styleEl = document\.createElement\("style"\);\n(?:styleEl\.setAttribute\([^)]*\);\n)?styleEl\.textContent = styles;\ndocument\.head\.appendChild\(styleEl\);/;

// ============================================================================
// CSS Helpers
// ============================================================================

/**
 * Extract CSS from compiled .pulse output code.
 * @param {string} outputCode
 * @returns {{ css: string|null, found: boolean }}
 */
export function extractCssFromOutput(outputCode) {
  const match = outputCode.match(STYLES_MATCH_REGEX);
  if (!match) return { css: null, found: false };
  return { css: match[1], found: true };
}

/**
 * Remove inline style injection and replace with a custom string.
 * @param {string} outputCode
 * @param {string} replacement
 * @returns {string}
 */
export function removeInlineStyles(outputCode, replacement) {
  return outputCode.replace(INLINE_STYLES_REMOVAL_REGEX, replacement);
}

// ============================================================================
// Preprocessor Execution
// ============================================================================

/**
 * Get preprocessor-specific options.
 * @param {string} preprocessor - 'sass' | 'less' | 'stylus'
 * @param {{ sassOptions?: object, lessOptions?: object, stylusOptions?: object }} allOptions
 * @returns {object}
 */
export function getPreprocessorOptions(preprocessor, { sassOptions = {}, lessOptions = {}, stylusOptions = {} }) {
  return { sass: sassOptions, less: lessOptions, stylus: stylusOptions }[preprocessor] || {};
}

/**
 * Detect preprocessor and run it synchronously if available.
 * Returns the processed CSS and any warning (instead of throwing).
 *
 * @param {string} css - Raw CSS from compiled output
 * @param {string} filePath - Source file path (for loadPaths)
 * @param {{ sassOptions?: object, lessOptions?: object, stylusOptions?: object }} [allOptions]
 * @returns {{ css: string, preprocessor: string, warning: string|null }}
 */
export function processStyles(css, filePath, allOptions = {}) {
  const available = checkPreprocessors();
  const preprocessor = detectPreprocessor(css);

  if (preprocessor === 'none' || !available[preprocessor]) {
    return { css, preprocessor: 'none', warning: null };
  }

  try {
    const opts = getPreprocessorOptions(preprocessor, allOptions);
    const preprocessed = preprocessStylesSync(css, {
      filename: filePath,
      loadPaths: [dirname(filePath), ...(opts.loadPaths || [])],
      compressed: opts.compressed || false,
      preprocessor
    });
    return { css: preprocessed.css, preprocessor, warning: null };
  } catch (err) {
    return {
      css,
      preprocessor,
      warning: `${preprocessor.toUpperCase()} compilation warning: ${err.message}`
    };
  }
}

// ============================================================================
// Server Components Helpers
// ============================================================================

/**
 * Extract import statements from source code.
 * Handles: static imports (single/multi-line), namespace, dynamic imports,
 * side-effect imports, re-exports, and TypeScript type-only imports.
 *
 * @param {string} code
 * @returns {string[]} Deduplicated array of import specifiers
 */
export function extractImports(code) {
  const imports = [];
  let match;

  // 1. All static imports/re-exports: ... from '...'
  //    Covers: import X from, import { A } from, import * as ns from,
  //    export { x } from, export * from, type imports, multi-line imports
  const fromRegex = /\bfrom\s+['"]([^'"]+)['"]/g;
  while ((match = fromRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // 2. Side-effect imports: import '...'
  const sideEffectRegex = /\bimport\s+['"]([^'"]+)['"]/g;
  while ((match = sideEffectRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  // 3. Dynamic imports: import('...')
  const dynamicRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}

/**
 * Create import violation error message for Client → Server imports.
 * @param {string} clientPath
 * @param {string} serverPath
 * @param {string} importSource
 * @returns {string}
 */
export function createImportViolationError(clientPath, serverPath, importSource) {
  const clientRelative = relative(process.cwd(), clientPath);
  const serverRelative = relative(process.cwd(), serverPath);

  return `
[Pulse] Import Violation: Client Component cannot import Server Component
  at ${clientRelative}
  importing ${importSource}
  resolved to ${serverRelative}

  Client Components can only import:
  \u2022 Other Client Components ('use client')
  \u2022 Shared utilities (no directive)
  \u2022 Third-party packages

  \u2192 Move shared logic to a Client Component
  \u2192 Use Server Actions for server-side operations
  \u2192 Create a wrapper Client Component that calls Server Actions

  See: https://pulse-js.fr/server-components#import-rules
  `.trim();
}

/**
 * Build the manifest data object from a client components map.
 * @param {Map<string, { file: string, chunk: string|null }>} clientComponents
 * @param {{ base?: string }} config
 * @returns {{ version: string, components: object }}
 */
export function buildManifest(clientComponents, config = {}) {
  const manifest = { version: '1.0', components: {} };

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

  return manifest;
}

/**
 * Write manifest JSON to disk synchronously (creates directories as needed).
 * @param {object} manifest
 * @param {{ manifestPath?: string, quiet?: boolean }} config
 */
export function writeManifestToDisk(manifest, config = {}) {
  if (!config.manifestPath) return;

  try {
    const manifestDir = dirname(config.manifestPath);
    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(config.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    if (!config.quiet) {
      console.log(`[Pulse Server Components] Manifest written to ${config.manifestPath}`);
    }
  } catch (error) {
    console.warn(`[Pulse Server Components] Failed to write manifest: ${error.message}`);
  }
}

/**
 * Write manifest JSON to disk asynchronously (creates directories as needed).
 * Preferred for Vite/Rollup closeBundle hooks that support async.
 * @param {object} manifest
 * @param {{ manifestPath?: string, quiet?: boolean }} config
 */
export async function writeManifestToDiskAsync(manifest, config = {}) {
  if (!config.manifestPath) return;

  try {
    const manifestDir = dirname(config.manifestPath);
    await mkdir(manifestDir, { recursive: true });
    await writeFile(config.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    if (!config.quiet) {
      console.log(`[Pulse Server Components] Manifest written to ${config.manifestPath}`);
    }
  } catch (error) {
    console.warn(`[Pulse Server Components] Failed to write manifest: ${error.message}`);
  }
}

// ============================================================================
// Client Manifest Helpers (shared across all SC plugins)
// ============================================================================

/**
 * Load client manifest from disk (for SSR).
 * @param {string} manifestPath - Path to manifest file
 * @returns {{ version: string, components: object }}
 */
export function loadClientManifest(manifestPath) {
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load client manifest from ${manifestPath}:`, error.message);
    return { version: '1.0', components: {} };
  }
}

/**
 * Get client component chunk URL from manifest.
 * @param {{ components: object }} manifest
 * @param {string} componentId
 * @returns {string|null}
 */
export function getComponentChunk(manifest, componentId) {
  return manifest.components[componentId]?.chunk || null;
}

/**
 * Get all client component IDs from manifest.
 * @param {{ components: object }} manifest
 * @returns {Set<string>}
 */
export function getClientComponentIds(manifest) {
  return new Set(Object.keys(manifest.components));
}
