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
  preprocessStylesSync,
  isSassAvailable,
  isLessAvailable,
  isStylusAvailable,
  getSassVersion,
  getLessVersion,
  getStylusVersion,
  detectPreprocessor
} from '../compiler/preprocessor.js';
import { dirname } from 'path';

// Cache for preprocessor availability checks
let preprocessorCache = null;

/**
 * Check available preprocessors once
 */
function checkPreprocessors() {
  if (preprocessorCache) return preprocessorCache;

  preprocessorCache = {
    sass: isSassAvailable(),
    less: isLessAvailable(),
    stylus: isStylusAvailable()
  };

  return preprocessorCache;
}

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
    const stylesMatch = outputCode.match(/const styles = `([\s\S]*?)`;/);

    if (stylesMatch) {
      let css = stylesMatch[1];

      // Check available preprocessors
      const available = checkPreprocessors();
      const preprocessor = detectPreprocessor(css);

      // Preprocess if preprocessor detected and available
      if (preprocessor !== 'none' && available[preprocessor]) {
        try {
          const preprocessorOptions = {
            sass: sassOptions,
            less: lessOptions,
            stylus: stylusOptions
          }[preprocessor];

          const preprocessed = preprocessStylesSync(css, {
            filename: this.resourcePath,
            loadPaths: [dirname(this.resourcePath), ...(preprocessorOptions.loadPaths || [])],
            compressed: preprocessorOptions.compressed || false,
            preprocessor // Force detected preprocessor
          });

          css = preprocessed.css;

          // Log preprocessor usage in verbose mode
          if (preprocessorOptions.verbose) {
            console.log(`[Pulse] Compiled ${preprocessor.toUpperCase()} in ${this.resourcePath}`);
          }
        } catch (preprocessorError) {
          // Emit warning but continue with original CSS
          this.emitWarning(
            new Error(`${preprocessor.toUpperCase()} compilation warning: ${preprocessorError.message}`)
          );
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
        outputCode = outputCode.replace(
          /\/\/ Styles\nconst styles = `[\s\S]*?`;\n\/\/ Inject styles\nconst styleEl = document\.createElement\("style"\);\nstyleEl\.textContent = styles;\ndocument\.head\.appendChild\(styleEl\);/,
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
  const available = checkPreprocessors();
  const options = this.getOptions() || {};

  // Log preprocessor availability once on first run
  if (!pulseLoader._logged && options.verbose !== false) {
    const preprocessors = [];
    if (available.sass) {
      preprocessors.push(`SASS ${getSassVersion() || 'unknown'}`);
    }
    if (available.less) {
      preprocessors.push(`LESS ${getLessVersion() || 'unknown'}`);
    }
    if (available.stylus) {
      preprocessors.push(`Stylus ${getStylusVersion() || 'unknown'}`);
    }

    if (preprocessors.length > 0) {
      console.log(`[Pulse Webpack] Preprocessor support: ${preprocessors.join(', ')}`);
    }

    pulseLoader._logged = true;
  }
}

// Export for CommonJS compatibility
export const raw = false; // Return code as string, not Buffer
