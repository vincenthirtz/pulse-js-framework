/**
 * Pulse Webpack Loader
 *
 * Enables .pulse file support in Webpack projects
 * Extracts CSS and compiles to JavaScript with source maps
 *
 * CSS Preprocessor Support:
 * - If `sass`, `less`, or `stylus` is installed in the user's project,
 *   preprocessor syntax in style blocks is automatically compiled
 * - No configuration needed - just install the preprocessor package
 *
 * Usage in webpack.config.js:
 * ```js
 * module.exports = {
 *   module: {
 *     rules: [
 *       {
 *         test: /\.pulse$/,
 *         use: [
 *           'style-loader',  // or mini-css-extract-plugin
 *           'css-loader',
 *           'pulse-js-framework/loader/webpack-loader'
 *         ]
 *       }
 *     ]
 *   }
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
 * Webpack loader for .pulse files
 * @this {import('webpack').LoaderContext}
 */
export default function pulseLoader(source) {
  const callback = this.async();
  const options = this.getOptions() || {};

  const {
    sourceMap = true,
    sass: sassOptions = {},
    less: lessOptions = {},
    stylus: stylusOptions = {}
  } = options;

  // Mark as cacheable
  this.cacheable?.();

  try {
    // Compile .pulse to JavaScript
    const result = compile(source, {
      runtime: 'pulse-js-framework/runtime',
      sourceMap,
      filename: this.resourcePath
    });

    if (!result.success) {
      const errors = result.errors.map(e =>
        `${e.message}${e.line ? ` at line ${e.line}` : ''}`
      ).join('\n');

      callback(new Error(`Pulse compilation failed:\n${errors}`));
      return;
    }

    let outputCode = result.code;
    let outputMap = result.map;

    // Extract CSS from compiled output
    const { css: extractedCss, found: cssFound } = extractCssFromOutput(outputCode);

    if (cssFound) {
      let css = extractedCss;

      // Preprocess if preprocessor detected and available
      const styleResult = processStyles(css, this.resourcePath, { sassOptions, lessOptions, stylusOptions });
      css = styleResult.css;

      if (styleResult.warning) {
        this.emitWarning(new Error(styleResult.warning));
      }

      // Log preprocessor usage in verbose mode
      if (styleResult.preprocessor !== 'none') {
        const preprocessorOptions = getPreprocessorOptions(styleResult.preprocessor, { sassOptions, lessOptions, stylusOptions });
        if (preprocessorOptions?.verbose) {
          console.log(`[Pulse] Compiled ${styleResult.preprocessor.toUpperCase()} in ${this.resourcePath}`);
        }
      }

      // Emit CSS as separate file or inline
      if (options.extractCss !== false) {
        // Default: emit CSS for css-loader to process
        // This allows Webpack's CSS pipeline to handle it
        this.emitFile?.(
          this.resourcePath.replace(/\.pulse$/, '.pulse.css'),
          css
        );

        // Replace inline CSS injection with import statement
        // css-loader will process the CSS and style-loader will inject it
        outputCode = removeInlineStyles(
          outputCode,
          `// Styles extracted - handled by css-loader\nimport "./${this.resourcePath.split('/').pop().replace(/\.pulse$/, '.pulse.css')}";`
        );
      }
      // else: keep inline CSS injection (useful for development)
    }

    // Add HMR support if Webpack HMR is enabled
    if (this.hot && options.hmr !== false) {
      outputCode += `\n${generateHMRCode(this.resourcePath)}`;
    }

    // Only pass source map if enabled in options
    callback(null, outputCode, sourceMap ? outputMap : null);
  } catch (error) {
    callback(new Error(`Pulse loader error: ${error.message}`));
  }
}

/**
 * Generate HMR (Hot Module Replacement) code for Webpack
 */
function generateHMRCode(resourcePath) {
  return `
// Webpack HMR
if (module.hot) {
  module.hot.accept();

  // Cleanup on module replacement
  module.hot.dispose((data) => {
    // Store state for preservation
    if (typeof __PULSE_HMR_STATE__ !== 'undefined') {
      data.pulseState = __PULSE_HMR_STATE__;
    }
  });

  // Restore state after replacement
  if (module.hot.data && module.hot.data.pulseState) {
    if (typeof __PULSE_HMR_RESTORE__ !== 'undefined') {
      __PULSE_HMR_RESTORE__(module.hot.data.pulseState);
    }
  }
}
`;
}

/**
 * Pitch loader - runs before other loaders
 * Used to log preprocessor availability
 */
export function pitch() {
  const options = this.getOptions() || {};

  // Log preprocessor availability once on first run
  if (!pulseLoader._logged && options.verbose !== false && !options.quiet) {
    logPreprocessorAvailability('Pulse Webpack');
    pulseLoader._logged = true;
  }
}

// Export for CommonJS compatibility
export const raw = false; // Return code as string, not Buffer
