/**
 * Pulse Rollup Plugin
 *
 * Enables .pulse file support in Rollup projects
 * Extracts CSS and compiles to JavaScript with source maps
 *
 * CSS Preprocessor Support:
 * - If `sass`, `less`, or `stylus` is installed in the user's project,
 *   preprocessor syntax in style blocks is automatically compiled
 * - No configuration needed - just install the preprocessor package
 *
 * Usage in rollup.config.js:
 * ```js
 * import pulsePlugin from 'pulse-js-framework/rollup';
 *
 * export default {
 *   input: 'src/main.js',
 *   output: { file: 'dist/bundle.js', format: 'es' },
 *   plugins: [
 *     pulsePlugin({
 *       sourceMap: true,
 *       extractCss: 'dist/bundle.css',
 *       sass: { loadPaths: ['src/styles'] }
 *     })
 *   ]
 * };
 * ```
 */

import { compile } from '../compiler/index.js';
import {
  logPreprocessorAvailability,
  extractCssFromOutput,
  removeInlineStyles,
  processStyles,
  getPreprocessorOptions
} from './shared.js';

/**
 * Create Pulse Rollup plugin
 */
export default function pulsePlugin(options = {}) {
  const {
    include = /\.pulse$/,
    exclude = /node_modules/,
    sourceMap = true,
    extractCss = null, // Path to output CSS file, or null for inline
    quiet = false,
    sass: sassOptions = {},
    less: lessOptions = {},
    stylus: stylusOptions = {}
  } = options;

  const filter = createFilter(include, exclude);

  // Accumulated CSS from all .pulse files
  let accumulatedCss = '';
  let cssEmitted = false;

  return {
    name: 'pulse',

    /**
     * Log preprocessor availability on build start
     */
    buildStart() {
      // Reset accumulated CSS
      accumulatedCss = '';
      cssEmitted = false;

      // Log preprocessor availability
      if (!quiet) {
        logPreprocessorAvailability('Pulse Rollup');
      }
    },

    /**
     * Resolve .pulse files
     */
    resolveId(id, importer) {
      // Handle .pulse imports
      if (id.endsWith('.pulse')) {
        return null; // Let Rollup handle it
      }

      // Check if a .js import has a corresponding .pulse file
      if (id.endsWith('.js') && importer) {
        const pulseId = id.replace(/\.js$/, '.pulse');
        // Let Rollup's resolution handle this
        return null;
      }

      return null;
    },

    /**
     * Transform .pulse files to JavaScript
     */
    transform(source, id) {
      if (!filter(id)) return null;
      if (!id.endsWith('.pulse')) return null;

      try {
        // Compile .pulse to JavaScript
        const result = compile(source, {
          runtime: 'pulse-js-framework/runtime',
          sourceMap,
          filename: id
        });

        if (!result.success) {
          const errors = result.errors.map(e =>
            `${e.message}${e.line ? ` at line ${e.line}` : ''}`
          ).join('\n');

          this.error(`Pulse compilation failed:\n${errors}`);
          return null;
        }

        let outputCode = result.code;
        let outputMap = result.map;

        // Extract CSS from compiled output
        const { css: extractedCss, found: cssFound } = extractCssFromOutput(outputCode);

        if (cssFound) {
          let css = extractedCss;

          // Preprocess if preprocessor detected and available
          const styleResult = processStyles(css, id, { sassOptions, lessOptions, stylusOptions });
          css = styleResult.css;

          if (styleResult.warning) {
            this.warn(styleResult.warning);
          }

          // Log preprocessor usage in verbose mode
          if (styleResult.preprocessor !== 'none') {
            const preprocessorOptions = getPreprocessorOptions(styleResult.preprocessor, { sassOptions, lessOptions, stylusOptions });
            if (preprocessorOptions?.verbose) {
              console.log(`[Pulse] Compiled ${styleResult.preprocessor.toUpperCase()} in ${id}`);
            }
          }

          if (extractCss) {
            // Accumulate CSS for later emission
            accumulatedCss += `/* ${id} */\n${css}\n\n`;

            // Remove inline CSS injection from output
            outputCode = removeInlineStyles(outputCode, '// Styles extracted to CSS file');
          }
          // else: keep inline CSS injection
        }

        return {
          code: outputCode,
          map: sourceMap ? outputMap : null
        };
      } catch (error) {
        this.error(`Pulse plugin error: ${error.message}`);
        return null;
      }
    },

    /**
     * Emit accumulated CSS as asset
     */
    generateBundle() {
      if (extractCss && accumulatedCss && !cssEmitted) {
        this.emitFile({
          type: 'asset',
          fileName: extractCss,
          source: accumulatedCss
        });
        cssEmitted = true;
        if (!quiet) {
          console.log(`[Pulse] Emitted CSS to ${extractCss}`);
        }
      }
    }
  };
}

/**
 * Create filter function for include/exclude patterns
 * Simple implementation to avoid dependency on @rollup/pluginutils
 */
function createFilter(include, exclude) {
  return (id) => {
    // Check exclude first
    if (exclude) {
      if (exclude instanceof RegExp && exclude.test(id)) return false;
      if (Array.isArray(exclude) && exclude.some(pattern =>
        pattern instanceof RegExp ? pattern.test(id) : id.includes(pattern)
      )) return false;
    }

    // Check include
    if (include) {
      if (include instanceof RegExp) return include.test(id);
      if (Array.isArray(include)) return include.some(pattern =>
        pattern instanceof RegExp ? pattern.test(id) : id.includes(pattern)
      );
    }

    return true;
  };
}
