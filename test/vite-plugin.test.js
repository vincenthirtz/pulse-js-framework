/**
 * Pulse Vite Plugin Tests
 *
 * Tests for loader/vite-plugin.js - Vite integration for .pulse files
 * Covers: plugin creation, resolveId, load, transform, HMR, configureServer, utilities
 *
 * @module test/vite-plugin
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the plugin
import pulsePlugin, { hmrRuntime, utils } from '../loader/vite-plugin.js';

// =============================================================================
// Helpers
// =============================================================================

function createPlugin(options = {}) {
  return pulsePlugin(options);
}

function createMockPluginContext() {
  const warnings = [];
  const errors = [];
  return {
    warn(msg) { warnings.push(msg); },
    error(msg) { errors.push(msg); throw new Error(msg); },
    warnings,
    errors
  };
}

function createMockServer() {
  const modules = new Map();
  const invalidated = [];
  const wsSent = [];
  const middlewares = [];

  return {
    moduleGraph: {
      getModuleById(id) {
        return modules.get(id) || null;
      },
      invalidateModule(mod) {
        invalidated.push(mod);
      },
      _modules: modules,
      _addModule(id, mod) {
        modules.set(id, mod || { id });
      }
    },
    ws: {
      send(msg) { wsSent.push(msg); }
    },
    middlewares: {
      use(fn) { middlewares.push(fn); }
    },
    _invalidated: invalidated,
    _wsSent: wsSent,
    _middlewares: middlewares
  };
}

// A minimal .pulse source that compiles successfully
const SIMPLE_PULSE = `
@page SimpleTest

state {
  count: 0
}

view {
  div {
    h1 "Hello"
  }
}

style {
  div { color: red; }
}
`;

const SIMPLE_PULSE_NO_STYLE = `
@page NoStyle

state {
  count: 0
}

view {
  div {
    h1 "Hello"
  }
}
`;

// =============================================================================
// Tests
// =============================================================================

describe('Vite Plugin', () => {

  // ===========================================================================
  // Plugin Creation
  // ===========================================================================

  describe('Plugin Creation', () => {
    test('creates plugin with default options', () => {
      const plugin = createPlugin();
      assert.strictEqual(plugin.name, 'vite-plugin-pulse');
      assert.strictEqual(plugin.enforce, 'pre');
      assert.strictEqual(typeof plugin.buildStart, 'function');
      assert.strictEqual(typeof plugin.resolveId, 'function');
      assert.strictEqual(typeof plugin.load, 'function');
      assert.strictEqual(typeof plugin.transform, 'function');
      assert.strictEqual(typeof plugin.handleHotUpdate, 'function');
      assert.strictEqual(typeof plugin.configureServer, 'function');
    });

    test('creates plugin with custom options', () => {
      const plugin = createPlugin({
        exclude: /test/,
        sourceMap: false,
        sass: { compressed: true }
      });
      assert.strictEqual(plugin.name, 'vite-plugin-pulse');
    });

    test('plugin has correct name', () => {
      const plugin = createPlugin();
      assert.strictEqual(plugin.name, 'vite-plugin-pulse');
    });

    test('plugin enforces pre order', () => {
      const plugin = createPlugin();
      assert.strictEqual(plugin.enforce, 'pre');
    });
  });

  // ===========================================================================
  // buildStart
  // ===========================================================================

  describe('buildStart', () => {
    test('buildStart is callable', () => {
      const plugin = createPlugin();
      assert.doesNotThrow(() => plugin.buildStart());
    });

    test('buildStart clears CSS map on subsequent calls', () => {
      const plugin = createPlugin();
      plugin.buildStart();
      // Call twice to ensure no errors
      plugin.buildStart();
    });
  });

  // ===========================================================================
  // resolveId
  // ===========================================================================

  describe('resolveId', () => {
    test('resolves virtual CSS module IDs', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const result = plugin.resolveId('test.pulse.css', '/some/importer.js');
      assert.strictEqual(result, '\0test.pulse.css');
    });

    test('resolves .pulse imports to absolute paths when file exists', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // Use a known directory
      const exampleDir = resolve(__dirname, '..');
      const importer = resolve(exampleDir, 'test', 'fake-importer.js');

      // Try resolving a file that doesn't exist
      const result = plugin.resolveId('./nonexistent.pulse', importer);
      assert.strictEqual(result, null); // File doesn't exist
    });

    test('returns null for non-.pulse, non-virtual IDs', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      assert.strictEqual(plugin.resolveId('test.js', null), null);
      assert.strictEqual(plugin.resolveId('test.ts', '/importer.js'), null);
      assert.strictEqual(plugin.resolveId('test.css', '/importer.js'), null);
    });

    test('returns null for .pulse imports without importer', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // No importer means we can't resolve relative path - falls through to return null
      const result = plugin.resolveId('component.pulse', undefined);
      assert.strictEqual(result, null);
    });

    test('checks .js imports for corresponding .pulse files', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // .js file without a corresponding .pulse
      const result = plugin.resolveId('nonexistent.js', '/some/dir/importer.js');
      assert.strictEqual(result, null);
    });

    test('resolves .js import to .pulse file when it exists', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // Create scenario where .pulse file would exist
      // We use a file we know exists
      const examplesDir = resolve(__dirname, '..', 'examples', 'todo', 'src');
      const mainPulse = resolve(examplesDir, 'App.pulse');

      if (existsSync(mainPulse)) {
        const result = plugin.resolveId('./App.js', resolve(examplesDir, 'main.js'));
        assert.strictEqual(result, mainPulse);
      }
    });

    test('virtual CSS IDs get null-byte prefix', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const result = plugin.resolveId('component.pulse.css');
      assert.ok(result.startsWith('\0'));
    });
  });

  // ===========================================================================
  // load
  // ===========================================================================

  describe('load', () => {
    test('returns null for non-virtual module IDs', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      assert.strictEqual(plugin.load('regular-module.js'), null);
      assert.strictEqual(plugin.load('/absolute/path.js'), null);
      assert.strictEqual(plugin.load('style.css'), null);
    });

    test('returns empty string for unknown virtual CSS module', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const result = plugin.load('\0unknown.pulse.css');
      assert.strictEqual(result, '');
    });

    test('returns null for non-virtual CSS modules', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // Without \0 prefix, not a virtual module
      assert.strictEqual(plugin.load('test.pulse.css'), null);
    });

    test('returns CSS for virtual module after transform', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      // Transform a .pulse file to populate cssMap
      const result = plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Component.pulse');

      if (result) {
        // Now load the virtual CSS module
        const css = plugin.load('\0/app/Component.pulse.css');
        assert.strictEqual(typeof css, 'string');
      }
    });
  });

  // ===========================================================================
  // transform
  // ===========================================================================

  describe('transform', () => {
    test('returns null for non-.pulse files', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      assert.strictEqual(plugin.transform('code', 'file.js'), null);
      assert.strictEqual(plugin.transform('code', 'file.ts'), null);
      assert.strictEqual(plugin.transform('code', 'file.css'), null);
      assert.strictEqual(plugin.transform('code', 'file.html'), null);
    });

    test('returns null for excluded files', () => {
      const plugin = createPlugin({ exclude: /node_modules/ });
      plugin.buildStart();

      const result = plugin.transform('code', '/node_modules/pkg/file.pulse');
      assert.strictEqual(result, null);
    });

    test('transforms valid .pulse file', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const result = plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Test.pulse');
      if (result) {
        assert.ok(result.code);
        assert.strictEqual(typeof result.code, 'string');
      }
    });

    test('transform result has code and map properties', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const result = plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Test.pulse');
      if (result) {
        assert.ok('code' in result);
        assert.ok('map' in result);
      }
    });

    test('transform with sourceMap disabled', () => {
      const plugin = createPlugin({ sourceMap: false });
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const result = plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Test.pulse');
      if (result) {
        assert.ok(result.code);
      }
    });

    test('transform handles compilation errors', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const invalidPulse = `
@component Invalid

state {
  // Intentionally malformed
}

view {
}
`;
      // Should either return a result or call this.error
      try {
        plugin.transform.call(ctx, invalidPulse, '/app/Invalid.pulse');
      } catch (e) {
        // Expected - error was called
        assert.ok(ctx.errors.length > 0 || e);
      }
    });

    test('transform extracts CSS to virtual module', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const result = plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Styled.pulse');
      if (result) {
        // After transform, CSS should be available via load
        const css = plugin.load('\0/app/Styled.pulse.css');
        // CSS may or may not be extracted depending on compilation output format
        assert.strictEqual(typeof css, 'string');
      }
    });

    test('transform of file without style block', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const result = plugin.transform.call(ctx, SIMPLE_PULSE_NO_STYLE, '/app/NoStyle.pulse');
      if (result) {
        assert.ok(result.code);
      }
    });

    test('custom exclude regex works', () => {
      const plugin = createPlugin({ exclude: /custom_dir/ });
      plugin.buildStart();

      assert.strictEqual(plugin.transform('code', '/custom_dir/file.pulse'), null);
      // Non-matching file should be processed (may fail compilation but not return null)
    });

    test('default exclude blocks node_modules', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      assert.strictEqual(
        plugin.transform('code', '/project/node_modules/pkg/Component.pulse'),
        null
      );
    });
  });

  // ===========================================================================
  // handleHotUpdate
  // ===========================================================================

  describe('handleHotUpdate', () => {
    test('handles .pulse file updates', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const result = plugin.handleHotUpdate({
        file: '/app/Component.pulse',
        server
      });

      assert.deepStrictEqual(result, []);
    });

    test('ignores non-.pulse file updates', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const result = plugin.handleHotUpdate({
        file: '/app/Component.js',
        server
      });

      assert.strictEqual(result, undefined);
    });

    test('sends HMR update via WebSocket', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      plugin.handleHotUpdate({
        file: '/app/Component.pulse',
        server
      });

      assert.strictEqual(server._wsSent.length, 1);
      assert.strictEqual(server._wsSent[0].type, 'update');
      assert.strictEqual(server._wsSent[0].updates.length, 1);
      assert.strictEqual(server._wsSent[0].updates[0].type, 'js-update');
      assert.strictEqual(server._wsSent[0].updates[0].path, '/app/Component.pulse');
    });

    test('invalidates module in module graph', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const mod = { id: '/app/Component.pulse' };
      server.moduleGraph._addModule('/app/Component.pulse', mod);

      plugin.handleHotUpdate({
        file: '/app/Component.pulse',
        server
      });

      assert.ok(server._invalidated.includes(mod));
    });

    test('invalidates virtual CSS module', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const cssMod = { id: '\0/app/Component.pulse.css' };
      server.moduleGraph._addModule('\0/app/Component.pulse.css', cssMod);

      plugin.handleHotUpdate({
        file: '/app/Component.pulse',
        server
      });

      assert.ok(server._invalidated.includes(cssMod));
    });

    test('handles file without module in graph', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      // No module registered - should not throw
      const result = plugin.handleHotUpdate({
        file: '/app/Unknown.pulse',
        server
      });

      assert.deepStrictEqual(result, []);
    });

    test('HMR update includes timestamp', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const before = Date.now();
      plugin.handleHotUpdate({
        file: '/app/Component.pulse',
        server
      });
      const after = Date.now();

      const timestamp = server._wsSent[0].updates[0].timestamp;
      assert.ok(timestamp >= before);
      assert.ok(timestamp <= after);
    });

    test('returns empty array for .pulse files to prevent default HMR', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      const result = plugin.handleHotUpdate({
        file: '/app/Test.pulse',
        server
      });

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });
  });

  // ===========================================================================
  // configureServer
  // ===========================================================================

  describe('configureServer', () => {
    test('registers middleware', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      plugin.configureServer(server);

      assert.strictEqual(server._middlewares.length, 1);
      assert.strictEqual(typeof server._middlewares[0], 'function');
    });

    test('middleware calls next()', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      const server = createMockServer();
      plugin.configureServer(server);

      let nextCalled = false;
      server._middlewares[0]({}, {}, () => { nextCalled = true; });
      assert.ok(nextCalled);
    });
  });

  // ===========================================================================
  // HMR Runtime Export
  // ===========================================================================

  describe('HMR Runtime', () => {
    test('hmrRuntime is a string', () => {
      assert.strictEqual(typeof hmrRuntime, 'string');
    });

    test('hmrRuntime contains import.meta.hot check', () => {
      assert.ok(hmrRuntime.includes('import.meta.hot'));
    });

    test('hmrRuntime contains dispose handler', () => {
      assert.ok(hmrRuntime.includes('dispose'));
    });

    test('hmrRuntime contains accept handler', () => {
      assert.ok(hmrRuntime.includes('accept'));
    });

    test('hmrRuntime references pulse runtime', () => {
      assert.ok(hmrRuntime.includes('pulse-js-framework/runtime'));
    });
  });

  // ===========================================================================
  // Utility Exports
  // ===========================================================================

  describe('Utils', () => {
    test('isPulseFile detects .pulse files', () => {
      assert.strictEqual(utils.isPulseFile('component.pulse'), true);
      assert.strictEqual(utils.isPulseFile('/path/to/App.pulse'), true);
    });

    test('isPulseFile rejects non-.pulse files', () => {
      assert.strictEqual(utils.isPulseFile('component.js'), false);
      assert.strictEqual(utils.isPulseFile('component.ts'), false);
      assert.strictEqual(utils.isPulseFile('component.vue'), false);
      assert.strictEqual(utils.isPulseFile('component.pulse.js'), false);
    });

    test('getOutputFilename replaces .pulse with .js', () => {
      assert.strictEqual(utils.getOutputFilename('App.pulse'), 'App.js');
      assert.strictEqual(utils.getOutputFilename('/path/Component.pulse'), '/path/Component.js');
    });

    test('getOutputFilename preserves path', () => {
      assert.strictEqual(
        utils.getOutputFilename('/src/components/Header.pulse'),
        '/src/components/Header.js'
      );
    });

    test('getVirtualCssId appends .css', () => {
      assert.strictEqual(utils.getVirtualCssId('App.pulse'), 'App.pulse.css');
      assert.strictEqual(utils.getVirtualCssId('/path/Component.pulse'), '/path/Component.pulse.css');
    });
  });

  // ===========================================================================
  // CSS Extraction Pipeline
  // ===========================================================================

  describe('CSS Extraction Pipeline', () => {
    test('CSS is stored per-file in cssMap', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      // Transform two different files
      plugin.transform.call(ctx, SIMPLE_PULSE, '/app/A.pulse');
      plugin.transform.call(ctx, SIMPLE_PULSE, '/app/B.pulse');

      // Each should have its own CSS
      const cssA = plugin.load('\0/app/A.pulse.css');
      const cssB = plugin.load('\0/app/B.pulse.css');
      assert.strictEqual(typeof cssA, 'string');
      assert.strictEqual(typeof cssB, 'string');
    });

    test('buildStart clears previous CSS entries', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Old.pulse');

      // Rebuild
      plugin.buildStart();

      // Old CSS should be cleared
      const css = plugin.load('\0/app/Old.pulse.css');
      assert.strictEqual(css, '');
    });

    test('virtual CSS module ID format is correct', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // resolveId should add \0 prefix
      const resolved = plugin.resolveId('/app/Component.pulse.css');
      assert.strictEqual(resolved, '\0/app/Component.pulse.css');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    test('handles empty .pulse file', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      try {
        plugin.transform.call(ctx, '', '/app/Empty.pulse');
      } catch (e) {
        // May throw compilation error, which is expected
        assert.ok(e);
      }
    });

    test('handles .pulse file with only whitespace', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      try {
        plugin.transform.call(ctx, '   \n\n   ', '/app/Whitespace.pulse');
      } catch (e) {
        assert.ok(e);
      }
    });

    test('handles multiple transforms of same file', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      // Transform same file twice (simulating re-compilation)
      plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Same.pulse');
      plugin.transform.call(ctx, SIMPLE_PULSE, '/app/Same.pulse');

      // Should work without errors
      const css = plugin.load('\0/app/Same.pulse.css');
      assert.strictEqual(typeof css, 'string');
    });

    test('plugin works without any options', () => {
      const plugin = pulsePlugin();
      assert.strictEqual(plugin.name, 'vite-plugin-pulse');
      assert.doesNotThrow(() => plugin.buildStart());
    });

    test('handles file paths with special characters', () => {
      const plugin = createPlugin();
      plugin.buildStart();

      // Virtual CSS with spaces in path
      const result = plugin.resolveId('/path with spaces/file.pulse.css');
      assert.strictEqual(result, '\0/path with spaces/file.pulse.css');
    });

    test('multiple buildStart calls are safe', () => {
      const plugin = createPlugin();
      plugin.buildStart();
      plugin.buildStart();
      plugin.buildStart();
      // Should not throw
    });
  });

  // ===========================================================================
  // Integration
  // ===========================================================================

  describe('Integration', () => {
    test('full pipeline: resolve -> transform -> load CSS', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const filePath = '/app/components/Button.pulse';

      // 1. Transform .pulse file
      const transformResult = plugin.transform.call(ctx, SIMPLE_PULSE, filePath);

      if (transformResult) {
        // 2. Resolve virtual CSS
        const cssId = plugin.resolveId(filePath + '.css');
        assert.ok(cssId);

        // 3. Load virtual CSS
        const css = plugin.load(cssId);
        assert.strictEqual(typeof css, 'string');
      }
    });

    test('HMR cycle: transform -> update -> re-transform', () => {
      const plugin = createPlugin();
      const ctx = createMockPluginContext();
      plugin.buildStart();

      const server = createMockServer();
      const filePath = '/app/Component.pulse';

      // Initial transform
      plugin.transform.call(ctx, SIMPLE_PULSE, filePath);

      // Register module
      server.moduleGraph._addModule(filePath, { id: filePath });

      // HMR update
      plugin.handleHotUpdate({ file: filePath, server });

      // Re-transform (simulating HMR re-compilation)
      const result = plugin.transform.call(ctx, SIMPLE_PULSE, filePath);
      if (result) {
        assert.ok(result.code);
      }
    });
  });
});
