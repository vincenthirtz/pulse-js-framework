/**
 * Pulse Vite Plugin
 *
 * Enables .pulse file support in Vite projects
 */

import { compile } from '../compiler/index.js';

/**
 * Create Pulse Vite plugin
 */
export default function pulsePlugin(options = {}) {
  const {
    include = /\.pulse$/,
    exclude = /node_modules/,
    sourceMap = true
  } = options;

  return {
    name: 'vite-plugin-pulse',

    /**
     * Resolve .pulse files
     */
    resolveId(id) {
      if (id.endsWith('.pulse')) {
        return id;
      }
      return null;
    },

    /**
     * Transform .pulse files to JavaScript
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

        return {
          code: result.code,
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
    handleHotUpdate({ file, server, modules }) {
      if (file.endsWith('.pulse')) {
        console.log(`[Pulse] HMR update: ${file}`);

        // Invalidate the module in Vite's module graph
        const module = server.moduleGraph.getModuleById(file);
        if (module) {
          server.moduleGraph.invalidateModule(module);
        }

        // Send HMR update instead of full reload
        // The module will handle its own state preservation via hmrRuntime
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
     * Configure dev server
     */
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Add any custom middleware here
        next();
      });
    },

    /**
     * Build hooks
     */
    buildStart() {
      console.log('[Pulse] Build started');
    },

    buildEnd() {
      console.log('[Pulse] Build completed');
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
   * Create a virtual module ID
   */
  createVirtualId(id) {
    return `\0${id}`;
  }
};
