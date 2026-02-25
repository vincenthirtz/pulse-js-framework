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
  logPreprocessorAvailability,
  extractCssFromOutput,
  removeInlineStyles,
  processStyles,
  getPreprocessorOptions
} from './shared.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Create Pulse ESBuild plugin
 */
export default function pulsePlugin(options = {}) {
  const {
    sourceMap = true,
    extractCss = null, // Path to output CSS file, or null for inline
    quiet = false,
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
        if (!quiet) {
          logPreprocessorAvailability('Pulse ESBuild');
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
          const { css: extractedCss, found } = extractCssFromOutput(outputCode);

          if (found) {
            const styleResult = processStyles(extractedCss, args.path, { sassOptions, lessOptions, stylusOptions });

            // Log preprocessor usage in verbose mode
            if (styleResult.preprocessor && styleResult.preprocessor !== 'none') {
              const opts = getPreprocessorOptions(styleResult.preprocessor, { sassOptions, lessOptions, stylusOptions });
              if (opts && opts.verbose) {
                console.log(`[Pulse] Compiled ${styleResult.preprocessor.toUpperCase()} in ${args.path}`);
              }
            }

            if (extractCss) {
              // Accumulate CSS for later emission
              accumulatedCss += `/* ${args.path} */\n${styleResult.css}\n\n`;

              // Remove inline CSS injection from output
              outputCode = removeInlineStyles(outputCode, '// Styles extracted to CSS file');
            }
            // else: keep inline CSS injection

            if (styleResult.warning) {
              return {
                warnings: [{
                  text: styleResult.warning,
                  location: { file: args.path }
                }],
                contents: outputCode,
                loader: 'js'
              };
            }
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
            if (!quiet) {
              console.log(`[Pulse] Emitted CSS to ${extractCss}`);
            }
          } catch (writeError) {
            console.error(`[Pulse] Failed to write CSS file: ${writeError.message}`);
          }
        }
      });

      /**
       * Resolve `.js` imports to `.pulse` files when a corresponding `.pulse`
       * file exists on disk. Allows importing components as `.js` while the
       * source is a `.pulse` file.
       */
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
