/**
 * Pulse Parcel Plugin (Transformer)
 *
 * Enables .pulse file support in Parcel projects
 * Extracts CSS and compiles to JavaScript with source maps
 *
 * CSS Preprocessor Support:
 * - If `sass`, `less`, or `stylus` is installed in the user's project,
 *   preprocessor syntax in style blocks is automatically compiled
 * - No configuration needed - just install the preprocessor package
 *
 * Installation:
 * 1. Install as dev dependency:
 *    npm install -D pulse-js-framework
 *
 * 2. Configure in .parcelrc:
 *    {
 *      "extends": "@parcel/config-default",
 *      "transformers": {
 *        "*.pulse": ["pulse-js-framework/parcel"]
 *      }
 *    }
 *
 * 3. Use .pulse files in your project:
 *    import MyComponent from './MyComponent.pulse';
 *
 * Features:
 * - ✅ Automatic .pulse file transformation
 * - ✅ CSS extraction to Parcel's CSS pipeline
 * - ✅ Source map generation
 * - ✅ SASS/LESS/Stylus auto-detection and compilation
 * - ✅ Hot Module Replacement (HMR)
 * - ✅ Watch mode support
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
 * Transform function for Parcel
 * This is the core logic that will be wrapped by Parcel's Transformer
 */
export async function transformPulse({ asset, logger }) {
  const source = await asset.getCode();
  const filePath = asset.filePath;

  // Get user options from .pulserc or plugin config
  const config = await asset.getConfig(['.pulserc', '.pulserc.json'], {
    packageKey: 'pulse'
  });

  const {
    sourceMap = true,
    extractCss = true,
    sass: sassOptions = {},
    less: lessOptions = {},
    stylus: stylusOptions = {},
    verbose = false
  } = config || {};

  // Log preprocessor availability once
  if (!checkPreprocessors._logged && verbose) {
    const available = checkPreprocessors();
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
      logger.info({
        message: `[Pulse] Preprocessor support: ${preprocessors.join(', ')}`
      });
    }

    checkPreprocessors._logged = true;
  }

  try {
    // Compile .pulse to JavaScript
    const result = compile(source, {
      runtime: 'pulse-js-framework/runtime',
      sourceMap,
      filename: filePath
    });

    if (!result.success) {
      const errors = result.errors.map(e =>
        `${e.message}${e.line ? ` at line ${e.line}` : ''}`
      ).join('\n');

      throw new Error(`Pulse compilation failed:\n${errors}`);
    }

    let outputCode = result.code;
    const outputMap = result.map;

    // Extract CSS from compiled output
    const stylesMatch = outputCode.match(/const styles = `([\s\S]*?)`;/);

    if (stylesMatch && extractCss) {
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
            filename: filePath,
            loadPaths: [dirname(filePath), ...(preprocessorOptions.loadPaths || [])],
            compressed: preprocessorOptions.compressed || false,
            preprocessor // Force detected preprocessor
          });

          css = preprocessed.css;

          // Log preprocessor usage in verbose mode
          if (preprocessorOptions.verbose || verbose) {
            logger.verbose({
              message: `[Pulse] Compiled ${preprocessor.toUpperCase()} in ${filePath}`
            });
          }
        } catch (preprocessorError) {
          // Emit warning but continue with original CSS
          logger.warn({
            message: `${preprocessor.toUpperCase()} compilation warning: ${preprocessorError.message}`,
            filePath
          });
        }
      }

      // Create a CSS asset for Parcel to process
      // This allows Parcel's CSS pipeline to handle minification, autoprefixing, etc.
      asset.addDependency({
        specifier: filePath + '.pulse.css',
        specifierType: 'url'
      });

      // Emit CSS as a separate asset
      await asset.addAsset({
        type: 'css',
        content: css,
        uniqueKey: filePath + '-styles'
      });

      // Remove inline CSS injection from output
      // Match the entire styles section and replace it
      outputCode = outputCode.replace(
        /\/\/ Styles[\s\S]*?\/\/ Inject styles[\s\S]*?document\.head\.appendChild\(styleEl\);/,
        '// Styles extracted to CSS asset'
      );
    }

    // Set asset type and content
    asset.type = 'js';
    asset.setCode(outputCode);

    // Add source map if enabled
    if (sourceMap && outputMap) {
      asset.setMap(outputMap);
    }

    return [asset];
  } catch (error) {
    throw new Error(`Pulse transformer error: ${error.message}`);
  }
}

/**
 * Default export - will be wrapped by Parcel's Transformer
 * We export the transform function directly for easier testing
 */
export default { transform: transformPulse };
