/**
 * Pulse Vite Plugin
 *
 * Enables .pulse file support in Vite projects
 * Extracts CSS to virtual .css modules so Vite's CSS pipeline handles them
 * (prevents JS minifier from corrupting CSS in template literals)
 *
 * SASS/SCSS Support:
 * - If `sass` is installed in the user's project, SCSS syntax in style blocks
 *   is automatically compiled before being passed to Vite's CSS pipeline
 * - No configuration needed - just install sass: `npm install -D sass`
 */

import { compile } from '../compiler/index.js';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { preprocessStylesSync, isSassAvailable, getSassVersion } from '../compiler/preprocessor.js';

// Virtual module ID for extracted CSS (uses .css extension so Vite treats it as CSS)
const VIRTUAL_CSS_SUFFIX = '.pulse.css';

/**
 * Create Pulse Vite plugin
 */
export default function pulsePlugin(options = {}) {
  const {
    exclude = /node_modules/,
    sourceMap = true,
    // SASS options
    sass: sassOptions = {}
  } = options;

  // Store extracted CSS for each .pulse module
  const cssMap = new Map();

  // Check for sass availability once at startup
  let sassAvailable = false;
  let sassVersion = null;

  return {
    name: 'vite-plugin-pulse',
    enforce: 'pre',

    /**
     * Log sass availability on build start
     */
    buildStart() {
      // Clear CSS map on new build
      cssMap.clear();

      // Check sass availability
      sassAvailable = isSassAvailable();
      if (sassAvailable) {
        sassVersion = getSassVersion();
        console.log(`[Pulse] SASS support enabled (sass ${sassVersion || 'unknown'})`);
      }
    },

    /**
     * Resolve .pulse files and virtual CSS modules
     */
    resolveId(id, importer) {
      // Handle virtual CSS module resolution
      if (id.endsWith(VIRTUAL_CSS_SUFFIX)) {
        return '\0' + id;
      }

      // Direct .pulse imports - resolve to absolute path
      if (id.endsWith('.pulse') && importer) {
        const importerDir = dirname(importer);
        const absolutePath = resolve(importerDir, id);
        if (existsSync(absolutePath)) {
          return absolutePath;
        }
      }

      // Check if a .js import has a corresponding .pulse file
      if (id.endsWith('.js') && importer) {
        const pulseId = id.replace(/\.js$/, '.pulse');
        const importerDir = dirname(importer);
        const absolutePulsePath = resolve(importerDir, pulseId);

        if (existsSync(absolutePulsePath)) {
          return absolutePulsePath;
        }
      }

      return null;
    },

    /**
     * Load virtual CSS modules
     */
    load(id) {
      // Virtual modules start with \0
      if (id.startsWith('\0') && id.endsWith(VIRTUAL_CSS_SUFFIX)) {
        const pulseId = id.slice(1, -VIRTUAL_CSS_SUFFIX.length + '.pulse'.length);
        const css = cssMap.get(pulseId);
        return css || '';
      }
      return null;
    },

    /**
     * Transform .pulse files to JavaScript
     * CSS is extracted to a virtual .css module that Vite processes separately
     */
    transform(code, id) {
      if (!id.endsWith('.pulse')) {
        return null;
      }

      if (exclude && exclude.test(id)) {
        return null;
      }

      try {
        const result = compile(code, {
          runtime: 'pulse-js-framework/runtime',
          sourceMap
        });

        if (!result.success) {
          const errors = result.errors.map(e =>
            `${e.message}${e.line ? ` at line ${e.line}` : ''}`
          ).join('\n');

          this.error(`Pulse compilation failed:\n${errors}`);
          return null;
        }

        let outputCode = result.code;

        // Extract CSS from compiled output and move to virtual CSS module
        const stylesMatch = outputCode.match(/const styles = `([\s\S]*?)`;/);
        if (stylesMatch) {
          let css = stylesMatch[1];
          const virtualCssId = id + '.css';

          // Preprocess SASS/SCSS if detected and sass is available
          if (sassAvailable) {
            try {
              const preprocessed = preprocessStylesSync(css, {
                filename: id,
                loadPaths: [dirname(id), ...(sassOptions.loadPaths || [])],
                compressed: sassOptions.compressed || false
              });

              if (preprocessed.wasSass) {
                css = preprocessed.css;
              }
            } catch (sassError) {
              this.warn(`SASS compilation warning in ${id}: ${sassError.message}`);
              // Continue with original CSS if SASS fails
            }
          }

          // Store CSS for the virtual module loader
          cssMap.set(id, css);

          // Replace inline style injection with CSS import
          // Vite will process this through its CSS pipeline (not JS minifier)
          outputCode = outputCode.replace(
            /\/\/ Styles\nconst styles = `[\s\S]*?`;\n\/\/ Inject styles\nconst styleEl = document\.createElement\("style"\);\nstyleEl\.textContent = styles;\ndocument\.head\.appendChild\(styleEl\);/,
            `// Styles extracted to virtual CSS module\nimport "${virtualCssId}";`
          );
        }

        return {
          code: outputCode,
          map: result.map || null
        };
      } catch (error) {
        this.error(`Pulse compilation error: ${error.message}`);
        return null;
      }
    },

    /**
     * Handle hot module replacement
     */
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.pulse')) {
        console.log(`[Pulse] HMR update: ${file}`);

        // Invalidate the module in Vite's module graph
        const module = server.moduleGraph.getModuleById(file);
        if (module) {
          server.moduleGraph.invalidateModule(module);
        }

        // Also invalidate the associated virtual CSS module
        const virtualCssId = '\0' + file + '.css';
        const cssModule = server.moduleGraph.getModuleById(virtualCssId);
        if (cssModule) {
          server.moduleGraph.invalidateModule(cssModule);
        }

        // Send HMR update instead of full reload
        server.ws.send({
          type: 'update',
          updates: [{
            type: 'js-update',
            path: file,
            acceptedPath: file,
            timestamp: Date.now()
          }]
        });

        // Return empty array to prevent Vite's default HMR handling
        return [];
      }
    },

    /**
     * Configure dev server - log sass status on start
     */
    configureServer(server) {
      // Check sass on server start if not already checked
      if (!sassAvailable) {
        sassAvailable = isSassAvailable();
        if (sassAvailable) {
          sassVersion = getSassVersion();
          console.log(`[Pulse] SASS support enabled (sass ${sassVersion || 'unknown'})`);
        }
      }

      server.middlewares.use((_req, _res, next) => {
        next();
      });
    }
  };
}

/**
 * Pulse HMR runtime
 * Injected into the client for hot module replacement
 */
export const hmrRuntime = `
if (import.meta.hot) {
  // Cleanup effects before module replacement
  import.meta.hot.dispose(() => {
    import('pulse-js-framework/runtime/pulse').then(m => {
      m.disposeModule(import.meta.url);
    });
  });

  // Accept HMR updates
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // Re-render with new module
      if (newModule.default && newModule.default.mount) {
        // Find and replace the current view
        const app = document.querySelector('#app');
        if (app) {
          app.innerHTML = '';
          newModule.default.mount(app);
        }
      }
    }
  });
}
`;

/**
 * Additional utilities for Vite integration
 */
export const utils = {
  /**
   * Check if a file is a Pulse file
   */
  isPulseFile(id) {
    return id.endsWith('.pulse');
  },

  /**
   * Get the output filename for a Pulse file
   */
  getOutputFilename(id) {
    return id.replace(/\.pulse$/, '.js');
  },

  /**
   * Get the virtual CSS module ID for a Pulse file
   */
  getVirtualCssId(id) {
    return id + '.css';
  }
};
