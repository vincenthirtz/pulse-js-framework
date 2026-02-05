/**
 * CSS Preprocessor Support
 *
 * Provides optional SASS/SCSS support without requiring it as a direct dependency.
 * If the user has `sass` installed in their project, it will be automatically detected
 * and used to compile SCSS syntax in style blocks.
 *
 * @module pulse-js-framework/compiler/preprocessor
 */

import { createRequire } from 'module';

// Cache for the sass module (null = not checked, false = not available, object = sass module)
let sassModule = null;

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
 * Check if CSS contains SASS/SCSS-specific syntax
 * @param {string} css - CSS string to check
 * @returns {boolean} True if SASS syntax is detected
 */
export function hasSassSyntax(css) {
  return SASS_PATTERNS.some(pattern => pattern.test(css));
}

/**
 * Try to load the sass module from the user's project (sync version)
 * Uses require() for compatibility with sync contexts
 * @returns {object|false} The sass module or false if not available
 */
export function tryLoadSassSync() {
  // Return cached result if already checked
  if (sassModule !== null) {
    return sassModule;
  }

  try {
    // Use createRequire to load sass synchronously from the user's project
    const require = createRequire(import.meta.url);
    sassModule = require('sass');
    return sassModule;
  } catch {
    // sass not installed in user's project
    sassModule = false;
    return false;
  }
}

/**
 * Try to load the sass module from the user's project (async version)
 * @returns {Promise<object|false>} The sass module or false if not available
 */
export async function tryLoadSass() {
  // Return cached result if already checked
  if (sassModule !== null) {
    return sassModule;
  }

  try {
    // Try to import sass from the user's project
    sassModule = await import('sass');
    return sassModule;
  } catch {
    // Fall back to sync require
    return tryLoadSassSync();
  }
}

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

/**
 * Preprocess CSS - compile SASS if detected and sass is available (sync)
 * Falls back to returning original CSS if sass is not available
 * @param {string} css - CSS or SCSS source
 * @param {object} options - Options
 * @param {string} [options.filename] - Source filename
 * @param {string[]} [options.loadPaths] - Paths for @use/@import
 * @param {boolean} [options.forceCompile] - Compile even if no SASS syntax detected
 * @returns {{css: string, wasSass: boolean, sourceMap?: object}}
 */
export function preprocessStylesSync(css, options = {}) {
  // Check if SASS syntax is present (or force compile)
  const isSass = options.forceCompile || hasSassSyntax(css);

  if (!isSass) {
    return { css, wasSass: false };
  }

  // Try to compile with sass
  const result = compileSassSync(css, options);

  if (result) {
    return {
      css: result.css,
      wasSass: true,
      sourceMap: result.sourceMap
    };
  }

  // sass not available - return original CSS
  // The CSS nesting syntax is already supported by the parser
  return { css, wasSass: false };
}

/**
 * Preprocess CSS - compile SASS if detected and sass is available (async)
 * @param {string} css - CSS or SCSS source
 * @param {object} options - Options
 * @returns {Promise<{css: string, wasSass: boolean, sourceMap?: object}>}
 */
export async function preprocessStyles(css, options = {}) {
  const isSass = options.forceCompile || hasSassSyntax(css);

  if (!isSass) {
    return { css, wasSass: false };
  }

  const result = await compileSass(css, options);

  if (result) {
    return {
      css: result.css,
      wasSass: true,
      sourceMap: result.sourceMap
    };
  }

  return { css, wasSass: false };
}

/**
 * Check if sass package is available in user's project
 * @returns {boolean}
 */
export function isSassAvailable() {
  const sass = tryLoadSassSync();
  return sass !== false;
}

/**
 * Check if sass package is available (async)
 * @returns {Promise<boolean>}
 */
export async function isSassAvailableAsync() {
  const sass = await tryLoadSass();
  return sass !== false;
}

/**
 * Get sass version if available
 * @returns {string|null}
 */
export function getSassVersion() {
  const sass = tryLoadSassSync();
  if (sass && sass.info) {
    // sass.info is a string like "dart-sass\t1.77.0"
    const match = sass.info.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }
  return null;
}

/**
 * Reset the cached sass module (for testing)
 */
export function resetSassCache() {
  sassModule = null;
}

export default {
  hasSassSyntax,
  tryLoadSass,
  tryLoadSassSync,
  compileSass,
  compileSassSync,
  preprocessStyles,
  preprocessStylesSync,
  isSassAvailable,
  isSassAvailableAsync,
  getSassVersion,
  resetSassCache
};
