/**
 * CSS Preprocessor Support
 *
 * Provides optional SASS/SCSS, LESS, and Stylus support without requiring them as direct dependencies.
 * If the user has `sass`, `less`, or `stylus` installed in their project, they will be automatically detected
 * and used to compile SCSS/LESS/Stylus syntax in style blocks.
 *
 * @module pulse-js-framework/compiler/preprocessor
 */

import { createRequire } from 'module';

// ============================================================================
// Module Loading Factory — eliminates duplication across SASS/LESS/Stylus
// ============================================================================

/**
 * Create a cached module loader (sync + async) for an optional dependency
 * @param {string} packageName - npm package name to load
 * @returns {{ loadSync, loadAsync, isAvailable, isAvailableAsync, reset }}
 */
function createModuleLoader(packageName) {
  let syncCache = null;
  let asyncCache = null;

  /** @param {Error} err */
  function isModuleNotFound(err) {
    return err && (err.code === 'MODULE_NOT_FOUND' || err.code === 'ERR_MODULE_NOT_FOUND');
  }

  function loadSync() {
    if (syncCache !== null) return syncCache;
    try {
      const require = createRequire(import.meta.url);
      syncCache = require(packageName);
      return syncCache;
    } catch (err) {
      if (isModuleNotFound(err)) {
        syncCache = false;
        return false;
      }
      // Corrupted install, syntax error, etc. — surface the real error
      console.warn(`[pulse] Failed to load '${packageName}': ${err.message}`);
      syncCache = false;
      return false;
    }
  }

  async function loadAsync() {
    if (asyncCache !== null) return asyncCache;
    if (syncCache !== null && syncCache !== false) return syncCache;
    try {
      const mod = await import(packageName);
      syncCache = mod;
      asyncCache = mod;
      return mod;
    } catch (err) {
      if (isModuleNotFound(err)) {
        const syncResult = loadSync();
        asyncCache = syncResult || false;
        return syncResult;
      }
      console.warn(`[pulse] Failed to load '${packageName}': ${err.message}`);
      asyncCache = false;
      return false;
    }
  }

  function isAvailable() { return loadSync() !== false; }
  async function isAvailableAsync() { return (await loadAsync()) !== false; }
  function reset() { syncCache = null; asyncCache = null; }

  return { loadSync, loadAsync, isAvailable, isAvailableAsync, reset };
}

// Create loaders for each preprocessor
const sassLoader = createModuleLoader('sass');
const lessLoader = createModuleLoader('less');
const stylusLoader = createModuleLoader('stylus');

/**
 * Patterns that indicate SASS/SCSS syntax
 */
const SASS_PATTERNS = [
  /\$[\w-]+\s*:/,           // Variables: $primary-color:
  /@mixin\s+[\w-]+/,        // Mixins: @mixin button-styles
  /@include\s+[\w-]+/,      // Include: @include button-styles
  /@extend\s+[.%][\w-]+/,   // Extend: @extend .class or @extend %placeholder
  /@function\s+[\w-]+/,     // Functions: @function calculate
  /@use\s+['"][^'"]+['"]/,  // Use: @use 'module'
  /@forward\s+['"][^'"]+['"]/, // Forward: @forward 'module'
  /%[\w-]+\s*\{/,           // Placeholder selectors: %button { }
  /#\{.*\}/,                // Interpolation: #{$variable}
  /@if\s+/,                 // Control: @if
  /@else\s*/,               // Control: @else
  /@for\s+\$/,              // Loop: @for $i
  /@each\s+\$/,             // Loop: @each $item
  /@while\s+/,              // Loop: @while
  /@debug\s+/,              // Debug: @debug
  /@warn\s+/,               // Warn: @warn
  /@error\s+/,              // Error: @error
];

/**
 * Patterns that indicate LESS syntax
 */
const LESS_PATTERNS = [
  /@[\w-]+\s*:/,            // Variables: @primary-color:
  /(?<!\()\.[\w-]+\s*\([^)]*\)\s*\{/, // Mixins: .button-styles() { } (not inside :not(.x) etc.)
  /(?<!\()\.[\w-]+\s*>\s*\([^)]*\)\s*\{/, // Parametric mixins: .button-styles > () { }
  /(?<!\()\.[\w-]+\([^)]*\);/,     // Mixin calls: .button-styles(); (not inside pseudo-class parens)
  /&:extend\(/,             // Extend: &:extend(.class)
  /@\{[\w-]+\}/,            // Interpolation: @{variable}
  /when\s*\(/,              // Guards: when (@a > 0)
  /(?<!\()\.[\w-]+\(\)\s*when/,    // Guarded mixins
  /@import\s+\(.*\)\s+['"]/, // Import options: @import (less) "file"
  /@plugin\s+['"][^'"]+['"]/, // Plugin: @plugin "plugin-name"
];

/**
 * Patterns that indicate Stylus syntax
 */
const STYLUS_PATTERNS = [
  /^[\w-]+\s*=\s+/m,        // Variables without $ or @: primary-color = #333 (require space after =)
  /^\s*[\w-]+\([^)]*\)$/m,  // Mixins without braces: button-style()
  /\{\s*\$[\w-]+\s*\}/,     // Interpolation: {$variable}
  /^\s*if\s+/m,             // Conditionals: if condition
  /^\s*unless\s+/m,         // Unless: unless condition
  /^\s*for\s+[\w-]+\s+in\s+/m, // Loops: for item in items
  /^\s*@css\s+\{/m,         // Literal CSS blocks: @css { }
  /^\s*@extends?\s+/m,      // Extend: @extend or @extends
  /^\s*\+[\w-]+/m,          // Mixin calls with +: +button-style
  /\barguments\b/,           // Stylus arguments variable (word boundary)
  /^[\w-]+\s*\?=/m,         // Conditional assignment: var ?= value
];

/**
 * Check if CSS contains exclusively SASS/SCSS-specific syntax
 * (excludes shared patterns that could be LESS or Stylus)
 * @param {string} css - CSS string to check
 * @returns {boolean} True if SASS syntax is detected
 */
function hasSassSpecificSyntax(css) {
  return SASS_PATTERNS.some(pattern => pattern.test(css));
}

/**
 * Check if CSS contains exclusively LESS-specific syntax
 * (excludes shared patterns that could be SASS or Stylus)
 * @param {string} css - CSS string to check
 * @returns {boolean} True if LESS syntax is detected
 */
function hasLessSpecificSyntax(css) {
  return LESS_PATTERNS.some(pattern => pattern.test(css));
}

/**
 * Check if CSS contains exclusively Stylus-specific syntax
 * @param {string} css - CSS string to check
 * @returns {boolean} True if Stylus syntax is detected
 */
function hasStylusSpecificSyntax(css) {
  return STYLUS_PATTERNS.some(pattern => pattern.test(css));
}

/**
 * Check if CSS contains SASS/SCSS-specific syntax
 * @param {string} css - CSS string to check
 * @returns {boolean} True if SASS syntax is detected
 */
export function hasSassSyntax(css) {
  return hasSassSpecificSyntax(css);
}

/**
 * Check if CSS contains LESS-specific syntax
 * @param {string} css - CSS string to check
 * @returns {boolean} True if LESS syntax is detected
 */
export function hasLessSyntax(css) {
  return hasLessSpecificSyntax(css);
}

/**
 * Check if CSS contains Stylus-specific syntax
 * @param {string} css - CSS string to check
 * @returns {boolean} True if Stylus syntax is detected
 */
export function hasStylusSyntax(css) {
  return hasStylusSpecificSyntax(css);
}

/**
 * Detect which preprocessor the CSS is using
 * @param {string} css - CSS string to check
 * @returns {'sass'|'less'|'stylus'|'none'} Detected preprocessor
 */
export function detectPreprocessor(css) {
  const hasSass = hasSassSpecificSyntax(css);
  const hasLess = hasLessSpecificSyntax(css);
  const hasStylus = hasStylusSpecificSyntax(css);

  // Priority order: SASS > LESS > Stylus (based on popularity)
  if (hasSass) return 'sass';
  if (hasLess) return 'less';
  if (hasStylus) return 'stylus';

  return 'none';
}

/** @returns {object|false} The sass module or false */
export function tryLoadSassSync() { return sassLoader.loadSync(); }
/** @returns {Promise<object|false>} The sass module or false */
export async function tryLoadSass() { return sassLoader.loadAsync(); }

/**
 * Compile SASS/SCSS to CSS (sync version)
 * @param {string} scss - SCSS source code
 * @param {object} options - Compilation options
 * @param {string} [options.filename] - Source filename for error messages
 * @param {string[]} [options.loadPaths] - Paths to search for @use/@import
 * @param {boolean} [options.sourceMap] - Generate source map
 * @param {boolean} [options.compressed] - Compress output
 * @returns {{css: string, sourceMap?: object}|null} Compiled CSS or null if sass unavailable
 */
export function compileSassSync(scss, options = {}) {
  const sass = tryLoadSassSync();

  if (!sass) {
    return null;
  }

  try {
    const result = sass.compileString(scss, {
      syntax: 'scss',
      loadPaths: options.loadPaths || [],
      sourceMap: options.sourceMap || false,
      sourceMapIncludeSources: true,
      style: options.compressed ? 'compressed' : 'expanded',
      // Silence deprecation warnings for @import
      silenceDeprecations: ['import'],
    });

    return {
      css: result.css,
      sourceMap: result.sourceMap || null
    };
  } catch (error) {
    // Re-throw with better context
    const sassError = new Error(`SASS compilation error: ${error.message}`);
    sassError.line = error.span?.start?.line;
    sassError.column = error.span?.start?.column;
    sassError.file = options.filename;
    sassError.cause = error;
    throw sassError;
  }
}

/**
 * Compile SASS/SCSS to CSS (async version)
 * @param {string} scss - SCSS source code
 * @param {object} options - Compilation options
 * @returns {Promise<{css: string, sourceMap?: object}|null>} Compiled CSS or null if sass unavailable
 */
export async function compileSass(scss, options = {}) {
  const sass = await tryLoadSass();

  if (!sass) {
    return null;
  }

  try {
    // Use compileStringAsync if available (dart-sass)
    const compileFunc = sass.compileStringAsync || sass.compileString;
    const result = await Promise.resolve(compileFunc.call(sass, scss, {
      syntax: 'scss',
      loadPaths: options.loadPaths || [],
      sourceMap: options.sourceMap || false,
      sourceMapIncludeSources: true,
      style: options.compressed ? 'compressed' : 'expanded',
      silenceDeprecations: ['import'],
    }));

    return {
      css: result.css,
      sourceMap: result.sourceMap || null
    };
  } catch (error) {
    const sassError = new Error(`SASS compilation error: ${error.message}`);
    sassError.line = error.span?.start?.line;
    sassError.column = error.span?.start?.column;
    sassError.file = options.filename;
    sassError.cause = error;
    throw sassError;
  }
}

// Note: preprocessStylesSync and preprocessStyles are defined later in the file
// with support for both SASS and LESS auto-detection

/**
 * Generate utility functions for a preprocessor module loader.
 * Eliminates boilerplate duplication across SASS/LESS/Stylus.
 * @param {object} loader - Module loader from createModuleLoader()
 * @param {function} versionExtractor - (mod) => string|null — extracts version from loaded module
 * @returns {{ isAvailable, isAvailableAsync, getVersion, reset }}
 */
function createPreprocessorUtils(loader, versionExtractor) {
  return {
    tryLoadSync: () => loader.loadSync(),
    tryLoadAsync: () => loader.loadAsync(),
    isAvailable: () => loader.isAvailable(),
    isAvailableAsync: () => loader.isAvailableAsync(),
    getVersion: () => {
      const mod = loader.loadSync();
      return mod ? versionExtractor(mod) : null;
    },
    reset: () => loader.reset(),
  };
}

const sassUtils = createPreprocessorUtils(sassLoader, mod => {
  if (mod && mod.info) {
    const match = mod.info.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }
  return null;
});

export function isSassAvailable() { return sassUtils.isAvailable(); }
export async function isSassAvailableAsync() { return sassUtils.isAvailableAsync(); }
export function getSassVersion() { return sassUtils.getVersion(); }
export function resetSassCache() { sassUtils.reset(); }

// ===== LESS SUPPORT =====

/** @returns {object|false} The less module or false */
export function tryLoadLessSync() { return lessLoader.loadSync(); }
/** @returns {Promise<object|false>} The less module or false */
export async function tryLoadLess() { return lessLoader.loadAsync(); }

/**
 * Compile LESS to CSS (async - LESS is async-only)
 * @param {string} less - LESS source code
 * @param {object} options - Compilation options
 * @param {string} [options.filename] - Source filename for error messages
 * @param {string[]} [options.loadPaths] - Paths to search for @import
 * @param {boolean} [options.sourceMap] - Generate source map
 * @param {boolean} [options.compressed] - Compress output
 * @returns {Promise<{css: string, sourceMap?: object}|null>} Compiled CSS or null if less unavailable
 */
export async function compileLess(less, options = {}) {
  const lessModule = await tryLoadLess();

  if (!lessModule) {
    return null;
  }

  try {
    const result = await lessModule.render(less, {
      filename: options.filename || 'input.less',
      paths: options.loadPaths || [],
      sourceMap: options.sourceMap ? {} : undefined,
      compress: options.compressed || false,
      strictMath: false, // Allow math without parentheses
      strictUnits: false,
    });

    return {
      css: result.css,
      sourceMap: result.map ? JSON.parse(result.map) : null
    };
  } catch (error) {
    // Re-throw with better context
    const lessError = new Error(`LESS compilation error: ${error.message}`);
    lessError.line = error.line;
    lessError.column = error.column;
    lessError.file = options.filename || error.filename;
    lessError.cause = error;
    throw lessError;
  }
}

/**
 * Compile LESS to CSS (sync version - NOT RECOMMENDED)
 * Note: LESS is fundamentally async. This function returns null in sync contexts.
 * Use compileLess() (async) instead for proper LESS compilation.
 * @param {string} _less - LESS source code (unused in sync context)
 * @param {object} _options - Compilation options (unused in sync context)
 * @returns {{css: string, sourceMap?: object}|null} Compiled CSS or null (LESS requires async)
 */
export function compileLessSync(_less, _options = {}) {
  const lessModule = tryLoadLessSync();

  if (!lessModule) {
    return null;
  }

  // LESS is fundamentally async and has no true sync API
  // Return null to indicate compilation not possible in sync context
  // The preprocessStylesSync will fall back to returning original CSS
  console.warn('[Pulse] LESS compilation requires async context. Use preprocessStyles() instead of preprocessStylesSync()');
  return null;
}

const lessUtils = createPreprocessorUtils(lessLoader, mod => {
  if (mod && mod.version) {
    return Array.isArray(mod.version) ? mod.version.join('.') : mod.version;
  }
  return null;
});

export function isLessAvailable() { return lessUtils.isAvailable(); }
export async function isLessAvailableAsync() { return lessUtils.isAvailableAsync(); }
export function getLessVersion() { return lessUtils.getVersion(); }
export function resetLessCache() { lessUtils.reset(); }

// ===== STYLUS SUPPORT =====

/** @returns {object|false} The stylus module or false */
export function tryLoadStylusSync() { return stylusLoader.loadSync(); }
/** @returns {Promise<object|false>} The stylus module or false */
export async function tryLoadStylus() { return stylusLoader.loadAsync(); }

/**
 * Compile Stylus to CSS (async)
 * @param {string} stylus - Stylus source code
 * @param {object} options - Compilation options
 * @param {string} [options.filename] - Source filename for error messages
 * @param {string[]} [options.loadPaths] - Paths to search for @import/@require
 * @param {boolean} [options.sourceMap] - Generate source map
 * @param {boolean} [options.compressed] - Compress output
 * @returns {Promise<{css: string, sourceMap?: object}|null>} Compiled CSS or null if stylus unavailable
 */
export async function compileStylus(stylus, options = {}) {
  const stylusModule = await tryLoadStylus();

  if (!stylusModule) {
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const renderer = stylusModule(stylus)
        .set('filename', options.filename || 'input.styl')
        .set('compress', options.compressed || false);

      // Add load paths
      if (options.loadPaths && options.loadPaths.length > 0) {
        options.loadPaths.forEach(path => renderer.include(path));
      }

      // Enable source maps if requested
      if (options.sourceMap) {
        renderer.set('sourcemap', {});
      }

      renderer.render((err, css) => {
        if (err) {
          const stylusError = new Error(`Stylus compilation error: ${err.message}`);
          stylusError.line = err.line;
          stylusError.column = err.column;
          stylusError.file = options.filename || err.filename;
          stylusError.cause = err;
          reject(stylusError);
        } else {
          resolve({
            css,
            sourceMap: renderer.sourcemap || null
          });
        }
      });
    } catch (error) {
      const stylusError = new Error(`Stylus compilation error: ${error.message}`);
      stylusError.file = options.filename;
      stylusError.cause = error;
      reject(stylusError);
    }
  });
}

/**
 * Compile Stylus to CSS (sync version)
 * @param {string} stylus - Stylus source code
 * @param {object} options - Compilation options
 * @param {string} [options.filename] - Source filename for error messages
 * @param {string[]} [options.loadPaths] - Paths to search for @import/@require
 * @param {boolean} [options.sourceMap] - Generate source map
 * @param {boolean} [options.compressed] - Compress output
 * @returns {{css: string, sourceMap?: object}|null} Compiled CSS or null if stylus unavailable
 */
export function compileStylusSync(stylus, options = {}) {
  const stylusModule = tryLoadStylusSync();

  if (!stylusModule) {
    return null;
  }

  try {
    const renderer = stylusModule(stylus)
      .set('filename', options.filename || 'input.styl')
      .set('compress', options.compressed || false);

    // Add load paths
    if (options.loadPaths && options.loadPaths.length > 0) {
      options.loadPaths.forEach(path => renderer.include(path));
    }

    // Enable source maps if requested
    if (options.sourceMap) {
      renderer.set('sourcemap', {});
    }

    const css = renderer.render();

    return {
      css,
      sourceMap: renderer.sourcemap || null
    };
  } catch (error) {
    // Re-throw with better context
    const stylusError = new Error(`Stylus compilation error: ${error.message}`);
    stylusError.line = error.line;
    stylusError.column = error.column;
    stylusError.file = options.filename || error.filename;
    stylusError.cause = error;
    throw stylusError;
  }
}

const stylusUtils = createPreprocessorUtils(stylusLoader, mod => {
  return (mod && mod.version) ? mod.version : null;
});

export function isStylusAvailable() { return stylusUtils.isAvailable(); }
export async function isStylusAvailableAsync() { return stylusUtils.isAvailableAsync(); }
export function getStylusVersion() { return stylusUtils.getVersion(); }
export function resetStylusCache() { stylusUtils.reset(); }

/**
 * Preprocess CSS - auto-detect and compile SASS, LESS, or Stylus if detected (sync)
 * Falls back to returning original CSS if preprocessor is not available
 * @param {string} css - CSS, SCSS, LESS, or Stylus source
 * @param {object} options - Options
 * @param {string} [options.filename] - Source filename
 * @param {string[]} [options.loadPaths] - Paths for @use/@import/@require
 * @param {boolean} [options.forceCompile] - Compile even if no syntax detected
 * @param {'auto'|'sass'|'less'|'stylus'} [options.preprocessor] - Force specific preprocessor
 * @returns {{css: string, preprocessor: 'sass'|'less'|'stylus'|'none', sourceMap?: object}}
 */
export function preprocessStylesSync(css, options = {}) {
  // Determine which preprocessor to use
  let preprocessor = options.preprocessor || 'auto';

  if (preprocessor === 'auto') {
    preprocessor = detectPreprocessor(css);
  }

  // Try SASS compilation
  if (preprocessor === 'sass') {
    const result = compileSassSync(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'sass',
        sourceMap: result.sourceMap
      };
    }
  }

  // Try LESS compilation
  if (preprocessor === 'less') {
    const result = compileLessSync(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'less',
        sourceMap: result.sourceMap
      };
    }
  }

  // Try Stylus compilation
  if (preprocessor === 'stylus') {
    const result = compileStylusSync(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'stylus',
        sourceMap: result.sourceMap
      };
    }
  }

  // No preprocessor detected or available
  return { css, preprocessor: 'none' };
}

/**
 * Preprocess CSS - auto-detect and compile SASS, LESS, or Stylus if detected (async)
 * @param {string} css - CSS, SCSS, LESS, or Stylus source
 * @param {object} options - Options
 * @returns {Promise<{css: string, preprocessor: 'sass'|'less'|'stylus'|'none', sourceMap?: object}>}
 */
export async function preprocessStyles(css, options = {}) {
  // Determine which preprocessor to use
  let preprocessor = options.preprocessor || 'auto';

  if (preprocessor === 'auto') {
    preprocessor = detectPreprocessor(css);
  }

  // Try SASS compilation
  if (preprocessor === 'sass') {
    const result = await compileSass(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'sass',
        sourceMap: result.sourceMap
      };
    }
  }

  // Try LESS compilation
  if (preprocessor === 'less') {
    const result = await compileLess(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'less',
        sourceMap: result.sourceMap
      };
    }
  }

  // Try Stylus compilation
  if (preprocessor === 'stylus') {
    const result = await compileStylus(css, options);
    if (result) {
      return {
        css: result.css,
        preprocessor: 'stylus',
        sourceMap: result.sourceMap
      };
    }
  }

  // No preprocessor detected or available
  return { css, preprocessor: 'none' };
}

/**
 * Reset all preprocessor caches (for testing)
 */
export function resetPreprocessorCaches() {
  resetSassCache();
  resetLessCache();
  resetStylusCache();
}

export default {
  // SASS
  hasSassSyntax,
  tryLoadSass,
  tryLoadSassSync,
  compileSass,
  compileSassSync,
  isSassAvailable,
  isSassAvailableAsync,
  getSassVersion,
  resetSassCache,

  // LESS
  hasLessSyntax,
  tryLoadLess,
  tryLoadLessSync,
  compileLess,
  compileLessSync,
  isLessAvailable,
  isLessAvailableAsync,
  getLessVersion,
  resetLessCache,

  // Stylus
  hasStylusSyntax,
  tryLoadStylus,
  tryLoadStylusSync,
  compileStylus,
  compileStylusSync,
  isStylusAvailable,
  isStylusAvailableAsync,
  getStylusVersion,
  resetStylusCache,

  // Auto-detect
  detectPreprocessor,
  preprocessStyles,
  preprocessStylesSync,
  resetPreprocessorCaches
};
