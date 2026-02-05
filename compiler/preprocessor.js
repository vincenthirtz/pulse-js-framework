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

// Cache for the sass module (null = not checked, false = not available, object = sass module)
let sassModule = null;

// Cache for the less module (null = not checked, false = not available, object = less module)
let lessModule = null;

// Cache for the stylus module (null = not checked, false = not available, object = stylus module)
let stylusModule = null;

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
  /\.[\w-]+\s*\([^)]*\)\s*\{/, // Mixins: .button-styles() { }
  /\.[\w-]+\s*>\s*\([^)]*\)\s*\{/, // Parametric mixins: .button-styles > () { }
  /\.[\w-]+\([^)]*\);/,     // Mixin calls: .button-styles();
  /&:extend\(/,             // Extend: &:extend(.class)
  /@\{[\w-]+\}/,            // Interpolation: @{variable}
  /when\s*\(/,              // Guards: when (@a > 0)
  /\.[\w-]+\(\)\s*when/,    // Guarded mixins
  /@import\s+\(.*\)\s+['"]/, // Import options: @import (less) "file"
  /@plugin\s+['"][^'"]+['"]/, // Plugin: @plugin "plugin-name"
];

/**
 * Patterns that indicate Stylus syntax
 */
const STYLUS_PATTERNS = [
  /^[\w-]+\s*=/m,           // Variables without $ or @: primary-color = #333
  /^\s*[\w-]+\([^)]*\)$/m,  // Mixins without braces: button-style()
  /^\s*[\w-]+$/m,           // Mixin calls without parens or semicolon
  /\{\s*\$[\w-]+\s*\}/,     // Interpolation: {$variable}
  /^\s*if\s+/m,             // Conditionals: if condition
  /^\s*unless\s+/m,         // Unless: unless condition
  /^\s*for\s+[\w-]+\s+in\s+/m, // Loops: for item in items
  /^\s*@css\s+\{/m,         // Literal CSS blocks: @css { }
  /^\s*@extends?\s+/m,      // Extend: @extend or @extends
  /^\s*\+[\w-]+/m,          // Mixin calls with +: +button-style
  /arguments/,              // Stylus arguments variable
  /^[\w-]+\s*\?=/m,         // Conditional assignment: var ?= value
];

/**
 * Patterns that indicate EITHER SASS or LESS syntax
 * These are shared between both preprocessors
 */
const SHARED_PATTERNS = [
  /&\s*\{/,                 // Parent selector nesting
  /&:[\w-]+/,               // Parent pseudo-class: &:hover
  /&\.[\w-]+/,              // Parent class: &.active
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

// Note: preprocessStylesSync and preprocessStyles are defined later in the file
// with support for both SASS and LESS auto-detection

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

// ===== LESS SUPPORT =====

/**
 * Try to load the less module from the user's project (sync version)
 * @returns {object|false} The less module or false if not available
 */
export function tryLoadLessSync() {
  // Return cached result if already checked
  if (lessModule !== null) {
    return lessModule;
  }

  try {
    const require = createRequire(import.meta.url);
    lessModule = require('less');
    return lessModule;
  } catch {
    // less not installed in user's project
    lessModule = false;
    return false;
  }
}

/**
 * Try to load the less module from the user's project (async version)
 * @returns {Promise<object|false>} The less module or false if not available
 */
export async function tryLoadLess() {
  // Return cached result if already checked
  if (lessModule !== null) {
    return lessModule;
  }

  try {
    lessModule = await import('less');
    return lessModule;
  } catch {
    // Fall back to sync require
    return tryLoadLessSync();
  }
}

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

/**
 * Check if less package is available in user's project
 * @returns {boolean}
 */
export function isLessAvailable() {
  const less = tryLoadLessSync();
  return less !== false;
}

/**
 * Check if less package is available (async)
 * @returns {Promise<boolean>}
 */
export async function isLessAvailableAsync() {
  const less = await tryLoadLess();
  return less !== false;
}

/**
 * Get less version if available
 * @returns {string|null}
 */
export function getLessVersion() {
  const less = tryLoadLessSync();
  if (less && less.version) {
    return Array.isArray(less.version) ? less.version.join('.') : less.version;
  }
  return null;
}

/**
 * Reset the cached less module (for testing)
 */
export function resetLessCache() {
  lessModule = null;
}

// ===== STYLUS SUPPORT =====

/**
 * Try to load the stylus module from the user's project (sync version)
 * @returns {object|false} The stylus module or false if not available
 */
export function tryLoadStylusSync() {
  // Return cached result if already checked
  if (stylusModule !== null) {
    return stylusModule;
  }

  try {
    const require = createRequire(import.meta.url);
    stylusModule = require('stylus');
    return stylusModule;
  } catch {
    // stylus not installed in user's project
    stylusModule = false;
    return false;
  }
}

/**
 * Try to load the stylus module from the user's project (async version)
 * @returns {Promise<object|false>} The stylus module or false if not available
 */
export async function tryLoadStylus() {
  // Return cached result if already checked
  if (stylusModule !== null) {
    return stylusModule;
  }

  try {
    stylusModule = await import('stylus');
    return stylusModule;
  } catch {
    // Fall back to sync require
    return tryLoadStylusSync();
  }
}

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

/**
 * Check if stylus package is available in user's project
 * @returns {boolean}
 */
export function isStylusAvailable() {
  const stylus = tryLoadStylusSync();
  return stylus !== false;
}

/**
 * Check if stylus package is available (async)
 * @returns {Promise<boolean>}
 */
export async function isStylusAvailableAsync() {
  const stylus = await tryLoadStylus();
  return stylus !== false;
}

/**
 * Get stylus version if available
 * @returns {string|null}
 */
export function getStylusVersion() {
  const stylus = tryLoadStylusSync();
  if (stylus && stylus.version) {
    return stylus.version;
  }
  return null;
}

/**
 * Reset the cached stylus module (for testing)
 */
export function resetStylusCache() {
  stylusModule = null;
}

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
