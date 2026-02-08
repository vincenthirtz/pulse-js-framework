/**
 * Pulse SWC Plugin
 *
 * Enables .pulse file support in SWC-based build pipelines
 * Provides transform functions and a plugin interface for custom build scripts
 *
 * CSS Preprocessor Support:
 * - If `sass`, `less`, or `stylus` is installed in the user's project,
 *   preprocessor syntax in style blocks is automatically compiled
 * - No configuration needed - just install the preprocessor package
 *
 * Usage with direct transform API:
 * ```js
 * import { transformPulseFile } from 'pulse-js-framework/swc';
 *
 * const result = transformPulseFile('src/App.pulse', {
 *   sourceMap: true,
 *   sass: { loadPaths: ['src/styles'] }
 * });
 * console.log(result.code);  // Compiled JavaScript
 * console.log(result.css);   // Extracted CSS (or null)
 * ```
 *
 * Usage with plugin interface:
 * ```js
 * import pulsePlugin from 'pulse-js-framework/swc';
 *
 * const plugin = pulsePlugin({ extractCss: 'dist/bundle.css' });
 * plugin.buildStart();
 * const result = plugin.transform(source, 'src/App.pulse');
 * plugin.buildEnd();  // Writes accumulated CSS
 * ```
 *
 * Batch processing:
 * ```js
 * import { buildPulseFiles } from 'pulse-js-framework/swc';
 *
 * const results = buildPulseFiles(['src/App.pulse', 'src/Home.pulse'], {
 *   extractCss: 'dist/bundle.css'
 * });
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
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

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
 * Create Pulse SWC plugin
 */
export default function pulsePlugin(options = {}) {
  const {
    sourceMap = true,
    extractCss = null, // Path to output CSS file, or null for inline
    sass: sassOptions = {},
    less: lessOptions = {},
    stylus: stylusOptions = {}
  } = options;

  // Accumulated CSS from all .pulse files
  let accumulatedCss = '';
  let buildStarted = false;

  return {
    name: 'pulse',

    /**
     * Reset accumulated CSS and log preprocessor availability
     */
    buildStart() {
      accumulatedCss = '';

      if (!buildStarted) {
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
          console.log(`[Pulse SWC] Preprocessor support: ${preprocessors.join(', ')}`);
        }

        buildStarted = true;
      }
    },

    /**
     * Transform a .pulse file source to JavaScript
     * @param {string} source - The .pulse file source code
     * @param {string} filePath - The file path for error reporting and preprocessor resolution
     * @returns {{ code: string|null, map: object|null, css: string|null, error: string|null }}
     */
    transform(source, filePath) {
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

          return {
            code: null,
            map: null,
            css: null,
            error: `Pulse compilation failed:\n${errors}`
          };
        }

        let outputCode = result.code;
        let extractedCss = null;

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
                filename: filePath,
                loadPaths: [dirname(filePath), ...(preprocessorOptions.loadPaths || [])],
                compressed: preprocessorOptions.compressed || false,
                preprocessor // Force detected preprocessor
              });

              css = preprocessed.css;

              // Log preprocessor usage in verbose mode
              if (preprocessorOptions.verbose) {
                console.log(`[Pulse] Compiled ${preprocessor.toUpperCase()} in ${filePath}`);
              }
            } catch (preprocessorError) {
              // Emit warning but continue with original CSS
              console.warn(`[Pulse SWC] ${preprocessor.toUpperCase()} compilation warning: ${preprocessorError.message}`);
            }
          }

          extractedCss = css;

          if (extractCss) {
            // Accumulate CSS for later emission
            accumulatedCss += `/* ${filePath} */\n${css}\n\n`;

            // Remove inline CSS injection from output
            outputCode = outputCode.replace(
              /\/\/ Styles\nconst styles = `[\s\S]*?`;\n\/\/ Inject styles\nconst styleEl = document\.createElement\("style"\);\nstyleEl\.textContent = styles;\ndocument\.head\.appendChild\(styleEl\);/,
              '// Styles extracted to CSS file'
            );
          }
          // else: keep inline CSS injection
        }

        return {
          code: outputCode,
          map: result.sourceMap || null,
          css: extractedCss,
          error: null
        };
      } catch (error) {
        return {
          code: null,
          map: null,
          css: null,
          error: `Pulse plugin error: ${error.message}`
        };
      }
    },

    /**
     * Write accumulated CSS to disk
     * Call after all transforms are complete
     */
    buildEnd() {
      if (extractCss && accumulatedCss) {
        try {
          const cssPath = resolve(typeof extractCss === 'string' ? extractCss : 'dist/bundle.css');
          const cssDir = dirname(cssPath);
          mkdirSync(cssDir, { recursive: true });
          writeFileSync(cssPath, accumulatedCss, 'utf8');
          console.log(`[Pulse] Emitted CSS to ${extractCss}`);
        } catch (writeError) {
          console.error(`[Pulse] Failed to write CSS file: ${writeError.message}`);
        }
      }
    }
  };
}

/**
 * Transform a .pulse file to JavaScript (standalone function)
 * @param {string} filePath - Path to the .pulse file
 * @param {object} options - Plugin options
 * @returns {{ code: string|null, map: object|null, css: string|null, error: string|null }}
 */
export function transformPulseFile(filePath, options = {}) {
  const resolvedPath = resolve(filePath);
  const source = readFileSync(resolvedPath, 'utf8');
  return transformPulseCode(source, { ...options, filename: resolvedPath });
}

/**
 * Transform .pulse source code to JavaScript (standalone function)
 * @param {string} source - The .pulse source code
 * @param {object} options - Plugin options (plus optional `filename`)
 * @returns {{ code: string|null, map: object|null, css: string|null, error: string|null }}
 */
export function transformPulseCode(source, options = {}) {
  const { filename = 'unknown.pulse', ...pluginOptions } = options;
  const plugin = pulsePlugin({ ...pluginOptions, extractCss: null });
  return plugin.transform(source, filename);
}

/**
 * Batch process multiple .pulse files
 * @param {string[]} files - Array of .pulse file paths
 * @param {object} options - Plugin options
 * @returns {Array<{ file: string, code: string|null, map: object|null, css: string|null, error: string|null }>}
 */
export function buildPulseFiles(files, options = {}) {
  const plugin = pulsePlugin(options);
  plugin.buildStart();

  const results = files.map(filePath => {
    const resolvedPath = resolve(filePath);
    const source = readFileSync(resolvedPath, 'utf8');
    const result = plugin.transform(source, resolvedPath);
    return { file: filePath, ...result };
  });

  plugin.buildEnd();
  return results;
}
