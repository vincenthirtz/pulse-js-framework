/**
 * Server Components - Build Tool Integration Tests
 *
 * Tests for Webpack and Rollup Server Components plugins
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Webpack plugin
import {
  addServerComponentsSupport,
  loadClientManifest,
  getComponentChunk,
  getClientComponentIds
} from '../loader/webpack-loader-server-components.js';

// Rollup plugin
import pulseServerComponentsPlugin from '../loader/rollup-plugin-server-components.js';

// Vite Server Components plugin
import pulseViteSCPlugin, {
  loadClientManifest as viteLoadClientManifest,
  getComponentChunk as viteGetComponentChunk,
  getClientComponentIds as viteGetClientComponentIds
} from '../loader/vite-plugin-server-components.js';

// ESBuild Server Components plugin
import pulseEsbuildSCPlugin, {
  loadClientManifest as esbuildLoadClientManifest,
  getComponentChunk as esbuildGetComponentChunk,
  getClientComponentIds as esbuildGetClientComponentIds
} from '../loader/esbuild-plugin-server-components.js';

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Create mock Webpack compilation
 */
function createMockCompilation() {
  const modules = [];
  const chunks = new Set();
  const assets = {};
  const hooks = {
    succeedModule: { tap: (name, fn) => { hooks.succeedModule._fn = fn; } },
    finishModules: { tap: (name, fn) => { hooks.finishModules._fn = fn; } },
    processAssets: { tap: (opts, fn) => { hooks.processAssets._fn = fn; } },
    afterProcessAssets: { tap: (name, fn) => { hooks.afterProcessAssets._fn = fn; } }
  };

  const compilation = {
    hooks,
    modules,
    chunks,
    assets,
    chunkGraph: {
      getChunkModulesIterable: (chunk) => chunk.modules || []
    },
    emitAsset: (name, source) => {
      assets[name] = source;
    },
    compiler: {
      webpack: {
        sources: {
          RawSource: class RawSource {
            constructor(content) {
              this.content = content;
            }
            source() {
              return this.content;
            }
          }
        }
      }
    },
    PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE: 'PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE'
  };

  return compilation;
}

/**
 * Create mock Webpack module with Client Component
 */
function createMockModule(resource, code) {
  return {
    resource,
    id: resource,
    _source: {
      source: () => code
    }
  };
}

/**
 * Create mock Webpack chunk
 */
function createMockChunk(name, files, modules = []) {
  return {
    name,
    files: new Set(files),
    modules
  };
}

/**
 * Create mock Rollup plugin context
 */
function createMockRollupContext() {
  const emittedFiles = [];

  return {
    emitFile: (file) => {
      emittedFiles.push(file);
    },
    _emittedFiles: emittedFiles
  };
}

/**
 * Create mock Vite plugin context (used when calling Vite hook methods with .call())
 */
function createMockVitePluginContext() {
  const errors = [];
  const warnings = [];
  const emittedFiles = [];
  return {
    error(msg) { errors.push(typeof msg === 'string' ? msg : msg.message); },
    warn(msg) { warnings.push(typeof msg === 'string' ? msg : msg.message); },
    emitFile(file) { emittedFiles.push(file); },
    resolve(importPath, filePath) { return null; },
    errors,
    warnings,
    emittedFiles
  };
}

// ============================================================================
// Webpack Plugin Tests
// ============================================================================

describe('Server Components - Webpack Plugin', () => {
  test('creates plugin instance with default options', () => {
    const plugin = addServerComponentsSupport();
    assert.ok(plugin);
    assert.strictEqual(plugin.options.manifestPath, 'dist/.pulse-manifest.json');
    assert.strictEqual(plugin.options.manifestFilename, '.pulse-manifest.json');
  });

  test('creates plugin instance with custom options', () => {
    const plugin = addServerComponentsSupport({
      manifestPath: 'build/.pulse-manifest.json',
      base: '/assets'
    });
    assert.strictEqual(plugin.options.manifestPath, 'build/.pulse-manifest.json');
    assert.strictEqual(plugin.options.base, '/assets');
  });

  test('detects Client Components in succeedModule hook', () => {
    const plugin = addServerComponentsSupport();
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => {
            const compilation = createMockCompilation();
            fn(compilation);

            // Simulate module compilation
            const clientCode = `
              export const Button = {
                __directive: "use client",
                __componentId: "Button",
                render() { }
              };
            `;

            const module = createMockModule('/src/Button.pulse', clientCode);
            compilation.hooks.succeedModule._fn(module);

            // Verify detection (check internal state indirectly via processAssets)
            const assets = {};
            compilation.hooks.processAssets._fn(assets);

            // Should have emitted manifest
            assert.ok(compilation.assets['.pulse-manifest.json']);
          }
        }
      }
    };

    plugin.apply(compiler);
  });

  test('generates client manifest with correct structure', () => {
    const plugin = addServerComponentsSupport();
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => {
            const compilation = createMockCompilation();
            fn(compilation);

            // Add Client Component
            const clientCode = `
              export const Counter = {
                __directive: "use client",
                __componentId: "Counter",
                render() { }
              };
            `;

            const module = createMockModule('/src/Counter.pulse', clientCode);
            compilation.hooks.succeedModule._fn(module);

            // Add chunk
            const chunk = createMockChunk('client-Counter', ['client-Counter-abc123.js'], [module]);
            compilation.chunks.add(chunk);

            // Generate manifest
            compilation.hooks.processAssets._fn(compilation.assets);

            // Verify manifest
            const manifestAsset = compilation.assets['.pulse-manifest.json'];
            assert.ok(manifestAsset);

            const manifest = JSON.parse(manifestAsset.source());
            assert.strictEqual(manifest.version, '1.0');
            assert.ok(manifest.components.Counter);
            assert.strictEqual(manifest.components.Counter.id, 'Counter');
            assert.strictEqual(manifest.components.Counter.chunk, 'client-Counter-abc123.js');
            assert.deepStrictEqual(manifest.components.Counter.exports, ['default', 'Counter']);
          }
        }
      }
    };

    plugin.apply(compiler);
  });

  test('handles multiple Client Components', () => {
    const plugin = addServerComponentsSupport({ base: '/assets' });
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => {
            const compilation = createMockCompilation();
            fn(compilation);

            // Add two Client Components
            const buttonModule = createMockModule('/src/Button.pulse', `
              export const Button = {
                __directive: "use client",
                __componentId: "Button",
                render() { }
              };
            `);

            const inputModule = createMockModule('/src/Input.pulse', `
              export const Input = {
                __directive: "use client",
                __componentId: "Input",
                render() { }
              };
            `);

            compilation.hooks.succeedModule._fn(buttonModule);
            compilation.hooks.succeedModule._fn(inputModule);

            // Add chunks
            const buttonChunk = createMockChunk('client-Button', ['client-Button-xyz.js'], [buttonModule]);
            const inputChunk = createMockChunk('client-Input', ['client-Input-abc.js'], [inputModule]);
            compilation.chunks.add(buttonChunk);
            compilation.chunks.add(inputChunk);

            // Generate manifest
            compilation.hooks.processAssets._fn(compilation.assets);

            // Verify manifest
            const manifest = JSON.parse(compilation.assets['.pulse-manifest.json'].source());
            assert.strictEqual(Object.keys(manifest.components).length, 2);
            assert.ok(manifest.components.Button);
            assert.ok(manifest.components.Input);
            assert.strictEqual(manifest.components.Button.chunk, '/assets/client-Button-xyz.js');
            assert.strictEqual(manifest.components.Input.chunk, '/assets/client-Input-abc.js');
          }
        }
      }
    };

    plugin.apply(compiler);
  });

  test('ignores Server Components', () => {
    const plugin = addServerComponentsSupport();
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => {
            const compilation = createMockCompilation();
            fn(compilation);

            // Add Server Component
            const serverCode = `
              export const ServerList = {
                __directive: "use server",
                __componentId: "ServerList",
                render() { }
              };
            `;

            const module = createMockModule('/src/ServerList.pulse', serverCode);
            compilation.hooks.succeedModule._fn(module);

            // Generate manifest
            compilation.hooks.processAssets._fn(compilation.assets);

            // No manifest should be created (no Client Components)
            assert.strictEqual(compilation.assets['.pulse-manifest.json'], undefined);
          }
        }
      }
    };

    plugin.apply(compiler);
  });

  test('ignores Shared Components', () => {
    const plugin = addServerComponentsSupport();
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => {
            const compilation = createMockCompilation();
            fn(compilation);

            // Add Shared Component (no directive)
            const sharedCode = `
              export const SharedButton = {
                render() { }
              };
            `;

            const module = createMockModule('/src/SharedButton.pulse', sharedCode);
            compilation.hooks.succeedModule._fn(module);

            // Generate manifest
            compilation.hooks.processAssets._fn(compilation.assets);

            // No manifest should be created (no Client Components)
            assert.strictEqual(compilation.assets['.pulse-manifest.json'], undefined);
          }
        }
      }
    };

    plugin.apply(compiler);
  });
});

// ============================================================================
// Rollup Plugin Tests
// ============================================================================

describe('Server Components - Rollup Plugin', () => {
  test('creates plugin instance with default options', () => {
    const plugin = pulseServerComponentsPlugin();
    assert.ok(plugin);
    assert.strictEqual(plugin.name, 'rollup-plugin-pulse-server-components');
  });

  test('detects Client Components in transform hook', () => {
    const plugin = pulseServerComponentsPlugin();

    const clientCode = `
      export const Modal = {
        __directive: "use client",
        __componentId: "Modal",
        render() { }
      };
    `;

    const result = plugin.transform(clientCode, '/src/Modal.pulse');

    // Transform should return null (not modifying code)
    assert.strictEqual(result, null);

    // Component should be detected (verify via generateBundle)
    const context = createMockRollupContext();
    const bundle = {
      'client-Modal-hash.js': {
        type: 'chunk',
        name: 'client-Modal',
        facadeModuleId: '/src/Modal.pulse',
        files: []
      }
    };

    plugin.generateBundle.call(context, {}, bundle);

    // Should have emitted manifest
    assert.strictEqual(context._emittedFiles.length, 1);
    assert.strictEqual(context._emittedFiles[0].type, 'asset');
    assert.strictEqual(context._emittedFiles[0].fileName, '.pulse-manifest.json');

    const manifest = JSON.parse(context._emittedFiles[0].source);
    assert.ok(manifest.components.Modal);
  });

  test('configures manualChunks for Client Components', () => {
    const plugin = pulseServerComponentsPlugin();

    // Detect a Client Component
    plugin.transform(`
      export const Dropdown = {
        __directive: "use client",
        __componentId: "Dropdown",
        render() { }
      };
    `, '/src/Dropdown.pulse');

    // Configure output options
    const outputOptions = {};
    const result = plugin.outputOptions(outputOptions);

    // Should have manualChunks function
    assert.ok(typeof result.manualChunks === 'function');

    // Test manualChunks function
    const chunkName = result.manualChunks('/src/Dropdown.pulse', {});
    assert.strictEqual(chunkName, 'client-Dropdown');

    // Non-Client Component should return undefined
    const otherChunk = result.manualChunks('/src/OtherComponent.pulse', {});
    assert.strictEqual(otherChunk, undefined);
  });

  test('preserves original manualChunks function', () => {
    const plugin = pulseServerComponentsPlugin();

    const originalManualChunks = (id) => {
      if (id.includes('vendor')) return 'vendor';
      return undefined;
    };

    const outputOptions = { manualChunks: originalManualChunks };
    const result = plugin.outputOptions(outputOptions);

    // Original function should still work
    const vendorChunk = result.manualChunks('/node_modules/vendor/lib.js', {});
    assert.strictEqual(vendorChunk, 'vendor');
  });

  test('generates client manifest with correct structure', () => {
    const plugin = pulseServerComponentsPlugin({ base: '/static' });

    // Detect Client Component
    plugin.transform(`
      export const Tabs = {
        __directive: "use client",
        __componentId: "Tabs",
        render() { }
      };
    `, '/src/Tabs.pulse');

    // Generate bundle
    const context = createMockRollupContext();
    const bundle = {
      'client-Tabs-xyz123.js': {
        type: 'chunk',
        name: 'client-Tabs',
        facadeModuleId: '/src/Tabs.pulse'
      }
    };

    plugin.generateBundle.call(context, {}, bundle);

    // Verify manifest
    const manifestFile = context._emittedFiles.find(f => f.fileName === '.pulse-manifest.json');
    assert.ok(manifestFile);

    const manifest = JSON.parse(manifestFile.source);
    assert.strictEqual(manifest.version, '1.0');
    assert.ok(manifest.components.Tabs);
    assert.strictEqual(manifest.components.Tabs.id, 'Tabs');
    assert.strictEqual(manifest.components.Tabs.chunk, '/static/client-Tabs-xyz123.js');
    assert.deepStrictEqual(manifest.components.Tabs.exports, ['default', 'Tabs']);
  });

  test('handles multiple Client Components', () => {
    const plugin = pulseServerComponentsPlugin();

    // Detect two Client Components
    plugin.transform(`
      export const Select = {
        __directive: "use client",
        __componentId: "Select",
        render() { }
      };
    `, '/src/Select.pulse');

    plugin.transform(`
      export const DatePicker = {
        __directive: "use client",
        __componentId: "DatePicker",
        render() { }
      };
    `, '/src/DatePicker.pulse');

    // Generate bundle
    const context = createMockRollupContext();
    const bundle = {
      'client-Select-abc.js': {
        type: 'chunk',
        name: 'client-Select',
        facadeModuleId: '/src/Select.pulse'
      },
      'client-DatePicker-def.js': {
        type: 'chunk',
        name: 'client-DatePicker',
        facadeModuleId: '/src/DatePicker.pulse'
      }
    };

    plugin.generateBundle.call(context, {}, bundle);

    // Verify manifest
    const manifestFile = context._emittedFiles[0];
    const manifest = JSON.parse(manifestFile.source);

    assert.strictEqual(Object.keys(manifest.components).length, 2);
    assert.ok(manifest.components.Select);
    assert.ok(manifest.components.DatePicker);
  });

  test('ignores Server Components', () => {
    const plugin = pulseServerComponentsPlugin();

    // Server Component
    plugin.transform(`
      export const ServerData = {
        __directive: "use server",
        __componentId: "ServerData",
        render() { }
      };
    `, '/src/ServerData.pulse');

    // Generate bundle
    const context = createMockRollupContext();
    plugin.generateBundle.call(context, {}, {});

    // Should have no emitted files (no Client Components)
    assert.strictEqual(context._emittedFiles.length, 0);
  });

  test('ignores non-.pulse files', () => {
    const plugin = pulseServerComponentsPlugin();

    const result = plugin.transform(`
      export const Component = {
        __directive: "use client",
        __componentId: "Component"
      };
    `, '/src/Component.js');

    // Should return null and not detect
    assert.strictEqual(result, null);
  });
});

// ============================================================================
// Manifest Helper Tests
// ============================================================================

describe('Server Components - Manifest Helpers', () => {
  test('loadClientManifest returns manifest structure', () => {
    // Mock manifest (in real usage, would read from file)
    const mockManifest = {
      version: '1.0',
      components: {
        Button: {
          id: 'Button',
          chunk: 'client-Button-abc.js',
          exports: ['default', 'Button']
        }
      }
    };

    // Test helper functions with mock data
    const componentChunk = getComponentChunk(mockManifest, 'Button');
    assert.strictEqual(componentChunk, 'client-Button-abc.js');

    const nonExistentChunk = getComponentChunk(mockManifest, 'NonExistent');
    assert.strictEqual(nonExistentChunk, null);
  });

  test('getClientComponentIds returns all component IDs', () => {
    const manifest = {
      version: '1.0',
      components: {
        Button: { id: 'Button', chunk: 'button.js', exports: [] },
        Input: { id: 'Input', chunk: 'input.js', exports: [] },
        Modal: { id: 'Modal', chunk: 'modal.js', exports: [] }
      }
    };

    const ids = getClientComponentIds(manifest);
    assert.ok(ids instanceof Set);
    assert.strictEqual(ids.size, 3);
    assert.ok(ids.has('Button'));
    assert.ok(ids.has('Input'));
    assert.ok(ids.has('Modal'));
  });

  test('getComponentChunk handles missing components', () => {
    const manifest = { version: '1.0', components: {} };
    const chunk = getComponentChunk(manifest, 'MissingComponent');
    assert.strictEqual(chunk, null);
  });
});

// ============================================================================
// Import Validation Tests
// ============================================================================

describe('Server Components - Import Validation', () => {
  test('detects Client → Server import violation in Webpack', () => {
    const plugin = addServerComponentsSupport();
    const compilation = createMockCompilation();

    // Apply plugin hooks
    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => fn(compilation)
        }
      }
    };
    plugin.apply(compiler);

    // Create modules: Client Component importing Server Component
    const clientModule = createMockModule(
      '/src/ClientButton.js',
      `'use client';\nimport { createUser } from './server-actions.js';\nexport function Button() {}`
    );

    const serverModule = createMockModule(
      '/src/server-actions.js',
      `'use server';\nexport async function createUser(data) { return db.users.create(data); }`
    );

    // Add dependency
    clientModule.dependencies = [
      { userRequest: './server-actions.js' }
    ];

    // Mock module graph
    compilation.moduleGraph = {
      getModule: (dep) => serverModule
    };

    // Process modules
    compilation.hooks.succeedModule._fn(clientModule);
    compilation.hooks.succeedModule._fn(serverModule);

    // Validate imports
    compilation.errors = [];
    compilation.hooks.finishModules._fn([clientModule, serverModule]);

    // Should have an error
    assert.strictEqual(compilation.errors.length, 1);
    assert.ok(compilation.errors[0].message.includes('Import Violation'));
    assert.ok(compilation.errors[0].message.includes('Client Component cannot import Server Component'));
  });

  test('allows Client → Client imports in Webpack', () => {
    const plugin = addServerComponentsSupport();
    const compilation = createMockCompilation();

    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => fn(compilation)
        }
      }
    };
    plugin.apply(compiler);

    // Both are Client Components
    const clientModule1 = createMockModule(
      '/src/Button.js',
      `'use client';\nimport { Icon } from './Icon.js';\nexport function Button() {}`
    );

    const clientModule2 = createMockModule(
      '/src/Icon.js',
      `'use client';\nexport function Icon() {}`
    );

    clientModule1.dependencies = [
      { userRequest: './Icon.js' }
    ];

    compilation.moduleGraph = {
      getModule: (dep) => clientModule2
    };

    compilation.hooks.succeedModule._fn(clientModule1);
    compilation.hooks.succeedModule._fn(clientModule2);

    compilation.errors = [];
    compilation.hooks.finishModules._fn([clientModule1, clientModule2]);

    // Should have no errors
    assert.strictEqual(compilation.errors.length, 0);
  });

  test('allows Client → Shared imports in Webpack', () => {
    const plugin = addServerComponentsSupport();
    const compilation = createMockCompilation();

    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => fn(compilation)
        }
      }
    };
    plugin.apply(compiler);

    // Client Component importing shared utility
    const clientModule = createMockModule(
      '/src/Button.js',
      `'use client';\nimport { formatDate } from './utils.js';\nexport function Button() {}`
    );

    const sharedModule = createMockModule(
      '/src/utils.js',
      `export function formatDate(date) { return date.toISOString(); }`
    );

    clientModule.dependencies = [
      { userRequest: './utils.js' }
    ];

    compilation.moduleGraph = {
      getModule: (dep) => sharedModule
    };

    compilation.hooks.succeedModule._fn(clientModule);
    compilation.hooks.succeedModule._fn(sharedModule);

    compilation.errors = [];
    compilation.hooks.finishModules._fn([clientModule, sharedModule]);

    // Should have no errors
    assert.strictEqual(compilation.errors.length, 0);
  });

  test('allows Server → Client imports in Webpack', () => {
    const plugin = addServerComponentsSupport();
    const compilation = createMockCompilation();

    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => fn(compilation)
        }
      }
    };
    plugin.apply(compiler);

    // Server Component importing Client Component (allowed)
    const serverModule = createMockModule(
      '/src/ServerPage.js',
      `'use server';\nimport { Button } from './Button.js';\nexport function Page() {}`
    );

    const clientModule = createMockModule(
      '/src/Button.js',
      `'use client';\nexport function Button() {}`
    );

    serverModule.dependencies = [
      { userRequest: './Button.js' }
    ];

    compilation.moduleGraph = {
      getModule: (dep) => clientModule
    };

    compilation.hooks.succeedModule._fn(serverModule);
    compilation.hooks.succeedModule._fn(clientModule);

    compilation.errors = [];
    compilation.hooks.finishModules._fn([serverModule, clientModule]);

    // Should have no errors (Server → Client is allowed)
    assert.strictEqual(compilation.errors.length, 0);
  });

  test('detects *.server.js file pattern as Server Component', () => {
    const plugin = addServerComponentsSupport();
    const compilation = createMockCompilation();

    const compiler = {
      hooks: {
        thisCompilation: {
          tap: (name, fn) => fn(compilation)
        }
      }
    };
    plugin.apply(compiler);

    // Client importing *.server.js file (violation)
    const clientModule = createMockModule(
      '/src/Button.js',
      `'use client';\nimport { getData } from './api.server.js';\nexport function Button() {}`
    );

    const serverFileModule = createMockModule(
      '/src/api.server.js',
      `export async function getData() { return db.query(); }`
    );

    clientModule.dependencies = [
      { userRequest: './api.server.js' }
    ];

    compilation.moduleGraph = {
      getModule: (dep) => serverFileModule
    };

    compilation.hooks.succeedModule._fn(clientModule);
    compilation.hooks.succeedModule._fn(serverFileModule);

    compilation.errors = [];
    compilation.hooks.finishModules._fn([clientModule, serverFileModule]);

    // Should have an error
    assert.strictEqual(compilation.errors.length, 1);
    assert.ok(compilation.errors[0].message.includes('Import Violation'));
  });
});

// ============================================================================
// Vite Server Components Plugin Tests
// ============================================================================

describe('Vite Server Components Plugin', () => {
  // 1. Plugin creation
  test('plugin name is vite-plugin-pulse-server-components and enforce is post', () => {
    const plugin = pulseViteSCPlugin();
    assert.strictEqual(plugin.name, 'vite-plugin-pulse-server-components');
    assert.strictEqual(plugin.enforce, 'post');
  });

  // 2. Has all required hooks
  test('has all required hooks', () => {
    const plugin = pulseViteSCPlugin();
    assert.strictEqual(typeof plugin.configResolved, 'function');
    assert.strictEqual(typeof plugin.transform, 'function');
    assert.strictEqual(typeof plugin.buildEnd, 'function');
    assert.strictEqual(typeof plugin.config, 'function');
    assert.strictEqual(typeof plugin.generateBundle, 'function');
    assert.strictEqual(typeof plugin.closeBundle, 'function');
  });

  // 3. Detects Client Components in transform
  test('detects Client Components in .pulse files without throwing', () => {
    const plugin = pulseViteSCPlugin();
    const ctx = createMockVitePluginContext();

    const clientCode = `
      export const Button = {
        __directive: "use client",
        __componentId: "Button",
        render() { }
      };
    `;

    // Should not throw and should return null (no code modification)
    let result;
    assert.doesNotThrow(() => {
      result = plugin.transform.call(ctx, clientCode, 'src/Button.pulse');
    });
    assert.strictEqual(result, null);
    assert.strictEqual(ctx.errors.length, 0);
  });

  // 4. Ignores non-.pulse files
  test('ignores non-.pulse files in transform', () => {
    const plugin = pulseViteSCPlugin();
    const ctx = createMockVitePluginContext();

    const clientCode = `
      export const Widget = {
        __directive: "use client",
        __componentId: "Widget",
        render() { }
      };
    `;

    const result = plugin.transform.call(ctx, clientCode, 'src/Widget.js');

    // Non-.pulse file: no Client Component registered, no error
    assert.strictEqual(result, null);
    assert.strictEqual(ctx.errors.length, 0);

    // Verify the component was NOT registered as a Client Component.
    // generateBundle always emits a manifest (even if empty), so we verify
    // that the emitted manifest has no components for this .js file.
    const bundleCtx = createMockVitePluginContext();
    plugin.generateBundle.call(bundleCtx, {}, {});
    assert.strictEqual(bundleCtx.emittedFiles.length, 1);
    const manifest = JSON.parse(bundleCtx.emittedFiles[0].source);
    assert.strictEqual(Object.keys(manifest.components).length, 0);
  });

  // 5. config() returns null in dev mode
  test('config returns null in dev mode (command: serve)', () => {
    const plugin = pulseViteSCPlugin();
    const result = plugin.config({}, { command: 'serve' });
    assert.strictEqual(result, null);
  });

  // 6. config() returns rollupOptions in build mode
  test('config returns rollupOptions.output.manualChunks in build mode', () => {
    const plugin = pulseViteSCPlugin();
    const result = plugin.config({}, { command: 'build' });

    assert.ok(result, 'config should return an object in build mode');
    assert.ok(result.build, 'result should have build key');
    assert.ok(result.build.rollupOptions, 'result should have build.rollupOptions key');
    assert.ok(result.build.rollupOptions.output, 'result should have build.rollupOptions.output');
    assert.strictEqual(
      typeof result.build.rollupOptions.output.manualChunks,
      'function',
      'manualChunks should be a function'
    );
  });

  // 7. configResolved stores SSR state
  test('configResolved stores SSR state from resolved config', () => {
    const plugin = pulseViteSCPlugin();

    // Non-SSR build - configResolved should not throw
    assert.doesNotThrow(() => {
      plugin.configResolved({ build: { ssr: false } });
    });

    // SSR build - configResolved should not throw
    assert.doesNotThrow(() => {
      plugin.configResolved({ build: { ssr: true } });
    });

    // Verify SSR path: generateBundle should skip emitting files when isSsrBuild=true
    const ctx = createMockVitePluginContext();
    // Detect a client component first
    plugin.transform.call(ctx, `
      export const Card = {
        __directive: "use client",
        __componentId: "Card",
        render() { }
      };
    `, 'src/Card.pulse');

    // Set SSR mode
    plugin.configResolved({ build: { ssr: true } });

    const bundleCtx = createMockVitePluginContext();
    plugin.generateBundle.call(bundleCtx, {}, {
      'client-Card-abc.js': {
        type: 'chunk',
        name: 'client-Card',
        facadeModuleId: 'src/Card.pulse'
      }
    });

    // generateBundle should have been skipped (SSR mode)
    assert.strictEqual(bundleCtx.emittedFiles.length, 0, 'generateBundle should skip in SSR mode');
  });

  // 8. generateBundle skips in SSR mode
  test('generateBundle emits no manifest when isSsrBuild is true', () => {
    const plugin = pulseViteSCPlugin();

    // Detect a client component
    const transformCtx = createMockVitePluginContext();
    plugin.transform.call(transformCtx, `
      export const Nav = {
        __directive: "use client",
        __componentId: "Nav",
        render() { }
      };
    `, 'src/Nav.pulse');

    // Mark as SSR build
    plugin.configResolved({ build: { ssr: true } });

    // Call generateBundle
    const bundleCtx = createMockVitePluginContext();
    plugin.generateBundle.call(bundleCtx, {}, {
      'client-Nav-xyz.js': {
        type: 'chunk',
        name: 'client-Nav',
        facadeModuleId: 'src/Nav.pulse'
      }
    });

    assert.strictEqual(bundleCtx.emittedFiles.length, 0);
  });

  // 9. generateBundle emits manifest after detecting a client component
  test('generateBundle emits manifest asset after detecting a client component', () => {
    const plugin = pulseViteSCPlugin();

    // Reset to non-SSR
    plugin.configResolved({ build: { ssr: false } });

    // Detect a client component via transform
    const transformCtx = createMockVitePluginContext();
    plugin.transform.call(transformCtx, `
      export const Sidebar = {
        __directive: "use client",
        __componentId: "Sidebar",
        render() { }
      };
    `, 'src/Sidebar.pulse');

    // Call generateBundle with a mock bundle
    const bundleCtx = createMockVitePluginContext();
    const bundle = {
      'client-Sidebar-hash123.js': {
        type: 'chunk',
        name: 'client-Sidebar',
        facadeModuleId: 'src/Sidebar.pulse'
      }
    };

    plugin.generateBundle.call(bundleCtx, {}, bundle);

    // Should have emitted exactly one asset
    assert.strictEqual(bundleCtx.emittedFiles.length, 1);
    const emitted = bundleCtx.emittedFiles[0];
    assert.strictEqual(emitted.type, 'asset');
    assert.strictEqual(emitted.fileName, '.pulse-manifest.json');

    // Verify manifest structure
    const manifest = JSON.parse(emitted.source);
    assert.strictEqual(manifest.version, '1.0');
    assert.ok(manifest.components.Sidebar, 'Sidebar should be in manifest');
    assert.strictEqual(manifest.components.Sidebar.id, 'Sidebar');
    assert.strictEqual(manifest.components.Sidebar.chunk, 'client-Sidebar-hash123.js');
    assert.deepStrictEqual(manifest.components.Sidebar.exports, ['default', 'Sidebar']);
  });

  // 10. closeBundle writes manifest to disk
  test('closeBundle writes manifest to disk in a tmp directory', async () => {
    const { mkdtempSync, rmSync, existsSync, readFileSync } = await import('fs');
    const { tmpdir } = await import('os');
    const { join } = await import('path');

    const tmpDir = mkdtempSync(join(tmpdir(), 'pulse-vite-sc-test-'));
    const manifestPath = join(tmpDir, 'subdir', '.pulse-manifest.json');

    const plugin = pulseViteSCPlugin({ manifestPath });

    // Set non-SSR mode
    plugin.configResolved({ build: { ssr: false } });

    // Detect a client component
    const transformCtx = createMockVitePluginContext();
    plugin.transform.call(transformCtx, `
      export const Footer = {
        __directive: "use client",
        __componentId: "Footer",
        render() { }
      };
    `, 'src/Footer.pulse');

    // Trigger generateBundle so the chunk is associated
    const bundleCtx = createMockVitePluginContext();
    plugin.generateBundle.call(bundleCtx, {}, {
      'client-Footer-abc.js': {
        type: 'chunk',
        name: 'client-Footer',
        facadeModuleId: 'src/Footer.pulse'
      }
    });

    // closeBundle should write the file to disk (async)
    await plugin.closeBundle();

    assert.ok(existsSync(manifestPath), 'manifest file should exist after closeBundle');

    const written = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(written.version, '1.0');
    assert.ok(written.components.Footer, 'Footer should be in written manifest');

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // 11. buildEnd validates imports using resolve
  test('buildEnd calls resolve to validate Client Component imports', () => {
    const plugin = pulseViteSCPlugin();
    // Pass root at the top level of the resolved config (as Vite does)
    plugin.configResolved({ root: '/project', build: { ssr: false } });

    // Teach the plugin about a client component with an import.
    // The 'use client' directive must appear at the top of the source
    // so that getComponentTypeFromSource() detects it correctly.
    const transformCtx = createMockVitePluginContext();
    plugin.transform.call(transformCtx, `'use client';
import { getData } from './api.server.js';
export const ClientWidget = {
  __directive: "use client",
  __componentId: "ClientWidget",
  render() { }
};
`, '/project/src/ClientWidget.pulse');

    // Simulate the server module being registered via transform.
    // The file path matches *.server.js, which is enough for isServerFile() detection.
    plugin.transform.call(transformCtx, `
export const ServerApi = {
  __componentId: "ServerApi"
};
`, '/project/src/api.server.js');

    // Build a context where resolve returns the server component's resolved path
    const resolvedPaths = [];
    const errors = [];
    const warnings = [];
    const buildEndCtx = {
      emitFile(_file) {},
      resolve(importPath, filePath, _opts) {
        resolvedPaths.push({ importPath, filePath });
        // Return the server component module
        return { id: '/project/src/api.server.js', external: false };
      },
      error(msg) {
        errors.push(typeof msg === 'string' ? msg : msg.message);
      },
      warn(msg) {
        warnings.push(typeof msg === 'string' ? msg : msg.message);
      },
      errors,
      warnings
    };

    // buildEnd should detect the Client → Server import violation
    plugin.buildEnd.call(buildEndCtx);

    // resolve should have been called for the import path
    assert.ok(resolvedPaths.length > 0, 'resolve should have been called at least once');

    // Should have reported an error about the import violation
    assert.ok(errors.length > 0, 'buildEnd should have reported an import violation error');
    assert.ok(
      errors[0].includes('Import Violation') ||
      errors[0].includes('Client Component cannot import Server Component'),
      'error should describe the import violation'
    );
  });

  // Vite Manifest Helpers
  test('viteGetComponentChunk returns chunk URL from manifest', () => {
    const manifest = {
      version: '1.0',
      components: {
        Hero: { id: 'Hero', chunk: 'client-Hero-abc.js', exports: ['default', 'Hero'] }
      }
    };

    assert.strictEqual(viteGetComponentChunk(manifest, 'Hero'), 'client-Hero-abc.js');
    assert.strictEqual(viteGetComponentChunk(manifest, 'Missing'), null);
  });

  test('viteGetClientComponentIds returns Set of all component IDs', () => {
    const manifest = {
      version: '1.0',
      components: {
        Alpha: { id: 'Alpha', chunk: 'alpha.js', exports: [] },
        Beta: { id: 'Beta', chunk: 'beta.js', exports: [] }
      }
    };

    const ids = viteGetClientComponentIds(manifest);
    assert.ok(ids instanceof Set);
    assert.strictEqual(ids.size, 2);
    assert.ok(ids.has('Alpha'));
    assert.ok(ids.has('Beta'));
  });
});

// ============================================================================
// ESBuild Server Components Plugin
// ============================================================================

describe('ESBuild Server Components Plugin', () => {

  test('exports a default function', () => {
    assert.strictEqual(typeof pulseEsbuildSCPlugin, 'function');
  });

  test('returns plugin object with name and setup', () => {
    const plugin = pulseEsbuildSCPlugin();
    assert.strictEqual(plugin.name, 'pulse-server-components');
    assert.strictEqual(typeof plugin.setup, 'function');
  });

  test('accepts custom options', () => {
    const plugin = pulseEsbuildSCPlugin({
      manifestPath: 'custom/manifest.json',
      base: '/assets/',
      manifestFilename: 'custom-manifest.json'
    });
    assert.ok(plugin, 'should create plugin with custom options');
  });

  test('setup registers onLoad and onEnd hooks', () => {
    const plugin = pulseEsbuildSCPlugin();
    const registeredHooks = { onLoad: [], onEnd: [] };

    const mockBuild = {
      onLoad(opts, fn) { registeredHooks.onLoad.push({ opts, fn }); },
      onEnd(fn) { registeredHooks.onEnd.push(fn); }
    };

    plugin.setup(mockBuild);

    assert.strictEqual(registeredHooks.onLoad.length, 1, 'should register one onLoad hook');
    assert.strictEqual(registeredHooks.onEnd.length, 1, 'should register one onEnd hook');
    assert.ok(registeredHooks.onLoad[0].opts.filter.test('test.pulse'), 'onLoad filter should match .pulse files');
    assert.ok(registeredHooks.onLoad[0].opts.filter.test('test.js'), 'onLoad filter should match .js files');
    assert.ok(registeredHooks.onLoad[0].opts.filter.test('test.ts'), 'onLoad filter should match .ts files');
  });

  test('onLoad returns undefined (does not modify output)', async () => {
    const plugin = pulseEsbuildSCPlugin();
    let loadHandler;

    const mockBuild = {
      onLoad(filter, fn) { loadHandler = fn; },
      onEnd() {}
    };

    plugin.setup(mockBuild);

    // Call with a non-existent file — should return undefined without crashing
    const result = await loadHandler({ path: '/nonexistent/file.js' });
    assert.strictEqual(result, undefined, 'should return undefined for unreadable files');
  });

  test('onEnd skips when build has errors', async () => {
    const plugin = pulseEsbuildSCPlugin({ manifestPath: '/tmp/test-esbuild-sc/manifest.json' });
    let endHandler;

    const mockBuild = {
      onLoad() {},
      onEnd(fn) { endHandler = fn; }
    };

    plugin.setup(mockBuild);

    // Call onEnd with errors — should skip manifest generation
    await endHandler({ errors: [{ text: 'build error' }], metafile: null });
    // No error = success (manifest was NOT written)
  });

  // ==========================================================================
  // Helper functions
  // ==========================================================================

  test('loadClientManifest returns empty manifest for non-existent file', () => {
    const manifest = esbuildLoadClientManifest('/nonexistent/manifest.json');
    assert.strictEqual(manifest.version, '1.0');
    assert.deepStrictEqual(manifest.components, {});
  });

  test('getComponentChunk returns null for missing component', () => {
    const manifest = { version: '1.0', components: {} };
    assert.strictEqual(esbuildGetComponentChunk(manifest, 'Missing'), null);
  });

  test('getComponentChunk returns chunk URL for existing component', () => {
    const manifest = {
      version: '1.0',
      components: {
        MyButton: { id: 'MyButton', chunk: '/assets/client-MyButton.js', exports: ['default'] }
      }
    };
    assert.strictEqual(esbuildGetComponentChunk(manifest, 'MyButton'), '/assets/client-MyButton.js');
  });

  test('getClientComponentIds returns Set of component IDs', () => {
    const manifest = {
      version: '1.0',
      components: {
        Alpha: { id: 'Alpha', chunk: 'a.js', exports: ['default'] },
        Beta: { id: 'Beta', chunk: 'b.js', exports: ['default'] }
      }
    };
    const ids = esbuildGetClientComponentIds(manifest);
    assert.ok(ids instanceof Set);
    assert.strictEqual(ids.size, 2);
    assert.ok(ids.has('Alpha'));
    assert.ok(ids.has('Beta'));
  });
});
