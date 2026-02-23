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
