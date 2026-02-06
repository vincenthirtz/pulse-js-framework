/**
 * Pulse ESBuild Plugin
 *
 * Enables .pulse file support in ESBuild projects
 * Extracts CSS and compiles to JavaScript with source maps
 *
 * CSS Preprocessor Support:
 * - If `sass`, `less`, or `stylus` is installed in the user's project,
 *   preprocessor syntax in style blocks is automatically compiled
 * - No configuration needed - just install the preprocessor package
 *
 * Usage in build script:
 * ```js
 * import * as esbuild from 'esbuild';
 * import pulsePlugin from 'pulse-js-framework/esbuild';
 *
 * await esbuild.build({
 *   entryPoints: ['src/main.js'],
 *   bundle: true,
 *   outfile: 'dist/bundle.js',
 *   plugins: [
 *     pulsePlugin({
 *       sourceMap: true,
 *       extractCss: 'dist/bundle.css',
 *       sass: {
 *         loadPaths: ['src/styles']
 *       }
 *     })
 *   ]
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
import { dirname } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

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
 * Create Pulse ESBuild plugin
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

    setup(build) {
      // Log preprocessor availability on first setup
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
          console.log(`[Pulse ESBuild] Preprocessor support: ${preprocessors.join(', ')}`);
        }

        buildStarted = true;
      }

      // Reset accumulated CSS on each build
      build.onStart(() => {
        accumulatedCss = '';
      });

      // Transform .pulse files
      build.onLoad({ filter: /\.pulse$/ }, async (args) => {
        try {
          // Read source file
          const source = readFileSync(args.path, 'utf8');

          // Compile .pulse to JavaScript
          const result = compile(source, {
            runtime: 'pulse-js-framework/runtime',
            sourceMap,
            filename: args.path
          });

          if (!result.success) {
            const errors = result.errors.map(e =>
              `${e.message}${e.line ? ` at line ${e.line}` : ''}`
            ).join('\n');

            return {
              errors: [{
                text: `Pulse compilation failed:\n${errors}`,
                location: { file: args.path }
              }]
            };
          }

          let outputCode = result.code;

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
                  filename: args.path,
                  loadPaths: [dirname(args.path), ...(preprocessorOptions.loadPaths || [])],
                  compressed: preprocessorOptions.compressed || false,
                  preprocessor // Force detected preprocessor
                });

                css = preprocessed.css;

                // Log preprocessor usage in verbose mode
                if (preprocessorOptions.verbose) {
                  console.log(`[Pulse] Compiled ${preprocessor.toUpperCase()} in ${args.path}`);
                }
              } catch (preprocessorError) {
                // Emit warning but continue with original CSS
                return {
                  warnings: [{
                    text: `${preprocessor.toUpperCase()} compilation warning: ${preprocessorError.message}`,
                    location: { file: args.path }
                  }],
                  contents: outputCode,
                  loader: 'js'
                };
              }
            }

            if (extractCss) {
              // Accumulate CSS for later emission
              accumulatedCss += `/* ${args.path} */\n${css}\n\n`;

              // Remove inline CSS injection from output
              outputCode = outputCode.replace(
                /\/\/ Styles\nconst styles = `[\s\S]*?`;\n\/\/ Inject styles\nconst styleEl = document\.createElement\("style"\);\nstyleEl\.textContent = styles;\ndocument\.head\.appendChild\(styleEl\);/,
                '// Styles extracted to CSS file'
              );
            }
            // else: keep inline CSS injection
          }

          return {
            contents: outputCode,
            loader: 'js',
            watchFiles: [args.path]
          };
        } catch (error) {
          return {
            errors: [{
              text: `Pulse plugin error: ${error.message}`,
              location: { file: args.path }
            }]
          };
        }
      });

      // Emit accumulated CSS as separate file
      build.onEnd((result) => {
        if (extractCss && accumulatedCss && result.errors.length === 0) {
          try {
            // Resolve output path
            const cssPath = resolve(extractCss);

            // Create directory if it doesn't exist
            const cssDir = dirname(cssPath);
            mkdirSync(cssDir, { recursive: true });

            // Write CSS file
            writeFileSync(cssPath, accumulatedCss, 'utf8');
            console.log(`[Pulse] Emitted CSS to ${extractCss}`);
          } catch (writeError) {
            console.error(`[Pulse] Failed to write CSS file: ${writeError.message}`);
          }
        }
      });

      // Resolve .pulse imports as .js if needed
      build.onResolve({ filter: /\.js$/ }, (args) => {
        // Check if there's a corresponding .pulse file
        const pulsePath = args.path.replace(/\.js$/, '.pulse');
        const resolvedPulsePath = resolve(args.resolveDir, pulsePath);

        try {
          readFileSync(resolvedPulsePath);
          return { path: resolvedPulsePath };
        } catch {
          // No .pulse file, continue with normal resolution
          return null;
        }
      });
    }
  };
}
