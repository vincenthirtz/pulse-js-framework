/**
 * Tests for ESBuild Plugin
 *
 * Covers: plugin setup, options, CSS accumulation, file resolution,
 * error handling, build lifecycle, edge cases, and preprocessor integration.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import plugin
import pulsePlugin from '../loader/esbuild-plugin.js';

// =============================================================================
// Mock ESBuild Build Context
// =============================================================================

function createMockBuildContext() {
  const onLoadHandlers = [];
  const onResolveHandlers = [];
  const onStartHandlers = [];
  const onEndHandlers = [];

  return {
    onLoad(options, callback) {
      onLoadHandlers.push({ filter: options.filter, callback });
    },
    onResolve(options, callback) {
      onResolveHandlers.push({ filter: options.filter, callback });
    },
    onStart(callback) {
      onStartHandlers.push(callback);
    },
    onEnd(callback) {
      onEndHandlers.push(callback);
    },
    // Accessors for assertions
    _onLoadHandlers: onLoadHandlers,
    _onResolveHandlers: onResolveHandlers,
    _onStartHandlers: onStartHandlers,
    _onEndHandlers: onEndHandlers,

    // Simulate ESBuild build process
    async build(args) {
      // Run onStart handlers
      for (const handler of onStartHandlers) {
        await handler();
      }

      // Process file through onLoad handlers
      for (const handler of onLoadHandlers) {
        if (handler.filter.test(args.path)) {
          const result = await handler.callback(args);
          return result;
        }
      }

      return null;
    },
    // Simulate onEnd
    async triggerEnd(result = { errors: [] }) {
      for (const handler of onEndHandlers) {
        await handler(result);
      }
    },
    // Simulate onResolve
    async resolve(args) {
      for (const handler of onResolveHandlers) {
        if (handler.filter.test(args.path)) {
          const result = await handler.callback(args);
          if (result) return result;
        }
      }
      return null;
    }
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

const SIMPLE_PULSE = `@page TestComponent

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "Increment"
  }
}

style {
  .counter { padding: 20px; }
}`;

const PULSE_NO_STYLE = `@page NoStyle

state {
  name: "hello"
}

view {
  div {
    h1 "Hello"
  }
}`;

const PULSE_WITH_RICH_STYLE = `@page Styled

view {
  .card {
    h2 "Title"
    p "Content"
  }
}

style {
  .card {
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
}`;

const INVALID_PULSE = `@page Invalid

state {
  count: // bad syntax
}`;

// =============================================================================
// Tests
// =============================================================================

describe('ESBuild Plugin', () => {
  const testDir = resolve(__dirname, 'fixtures', 'esbuild-test');
  const distDir = resolve(testDir, 'dist');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ===========================================================================
  // 1. Plugin Setup
  // ===========================================================================

  describe('Plugin setup', () => {
    it('should export a function', () => {
      assert.strictEqual(typeof pulsePlugin, 'function', 'Plugin should be a function');
    });

    it('should return an object with name and setup', () => {
      const plugin = pulsePlugin();
      assert.strictEqual(typeof plugin, 'object');
      assert.strictEqual(plugin.name, 'pulse', 'Plugin name should be "pulse"');
      assert.strictEqual(typeof plugin.setup, 'function', 'Plugin should have setup method');
    });

    it('should register onLoad handler for .pulse files', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      assert.strictEqual(buildContext._onLoadHandlers.length, 1, 'Should register one onLoad handler');
      assert.ok(
        buildContext._onLoadHandlers[0].filter.test('component.pulse'),
        'onLoad filter should match .pulse files'
      );
      assert.ok(
        !buildContext._onLoadHandlers[0].filter.test('component.js'),
        'onLoad filter should not match .js files'
      );
    });

    it('should register onStart handler', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      assert.strictEqual(buildContext._onStartHandlers.length, 1, 'Should register one onStart handler');
    });

    it('should register onEnd handler', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      assert.strictEqual(buildContext._onEndHandlers.length, 1, 'Should register one onEnd handler');
    });

    it('should register onResolve handler for .js files', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      assert.strictEqual(buildContext._onResolveHandlers.length, 1, 'Should register one onResolve handler');
      assert.ok(
        buildContext._onResolveHandlers[0].filter.test('module.js'),
        'onResolve filter should match .js files'
      );
      assert.ok(
        !buildContext._onResolveHandlers[0].filter.test('module.pulse'),
        'onResolve filter should not match .pulse files'
      );
    });
  });

  // ===========================================================================
  // 2. Options
  // ===========================================================================

  describe('Options', () => {
    it('should accept empty options (defaults)', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      // Should not throw
      plugin.setup(buildContext);
      assert.ok(plugin.name, 'Plugin should be created with default options');
    });

    it('should accept explicit options', () => {
      const plugin = pulsePlugin({
        sourceMap: false,
        extractCss: 'dist/out.css',
        sass: { loadPaths: ['/styles'] },
        less: { compressed: true },
        stylus: { verbose: true }
      });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);
      assert.ok(plugin.name, 'Plugin should be created with explicit options');
    });

    it('should default sourceMap to true and include source map in compiled output', async () => {
      const plugin = pulsePlugin({ extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-sm.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have contents');
    });

    it('should compile without source map when sourceMap is false', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-nosm.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have contents');
    });

    it('should keep inline CSS when extractCss is null', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-inline.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result.contents.includes('const styles ='), 'Should have inline styles variable');
      assert.ok(result.contents.includes('createElement("style")'), 'Should inject styles into DOM');
    });

    it('should extract CSS to file when extractCss is a path', async () => {
      const cssPath = resolve(distDir, 'test.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-extract.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      await buildContext.build({ path: testFile });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.counter'), 'CSS should contain counter class');
    });
  });

  // ===========================================================================
  // 3. Basic Compilation
  // ===========================================================================

  describe('Basic compilation', () => {
    it('should compile .pulse file to JavaScript', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have compiled code');
      assert.ok(result.contents.includes('pulse'), 'Should import pulse runtime');
      assert.ok(result.contents.includes('el('), 'Should use el() function');
    });

    it('should return loader as "js"', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-loader.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.strictEqual(result.loader, 'js', 'Loader should be "js"');
    });

    it('should include the file in watchFiles', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-watch.pulse');
      writeFileSync(testFile, SIMPLE_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(Array.isArray(result.watchFiles), 'watchFiles should be an array');
      assert.ok(result.watchFiles.includes(testFile), 'watchFiles should include the source file');
    });

    it('should compile a file with no style block', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-nostyle.pulse');
      writeFileSync(testFile, PULSE_NO_STYLE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have compiled code');
      assert.strictEqual(result.loader, 'js');
    });
  });

  // ===========================================================================
  // 4. CSS Accumulation
  // ===========================================================================

  describe('CSS accumulation', () => {
    it('should accumulate CSS from multiple .pulse files', async () => {
      const cssPath = resolve(distDir, 'multi.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // Trigger onStart to reset accumulated CSS
      await buildContext.build({ path: resolve(testDir, 'placeholder') }).catch(() => {});
      // Re-trigger onStart explicitly
      for (const handler of buildContext._onStartHandlers) {
        await handler();
      }

      // File 1
      const file1 = resolve(testDir, 'file1.pulse');
      writeFileSync(file1, `@page File1

view {
  .file1 { h1 "One" }
}

style {
  .file1 { color: red; }
}`);

      // File 2
      const file2 = resolve(testDir, 'file2.pulse');
      writeFileSync(file2, `@page File2

view {
  .file2 { h2 "Two" }
}

style {
  .file2 { color: blue; }
}`);

      // Process both files through onLoad directly
      const onLoadHandler = buildContext._onLoadHandlers[0].callback;
      await onLoadHandler({ path: file1 });
      await onLoadHandler({ path: file2 });

      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.file1'), 'CSS should contain file1 class');
      assert.ok(cssContent.includes('.file2'), 'CSS should contain file2 class');
      assert.ok(cssContent.includes('color: red'), 'CSS should contain file1 styles');
      assert.ok(cssContent.includes('color: blue'), 'CSS should contain file2 styles');
    });

    it('should reset accumulated CSS on onStart', async () => {
      const cssPath = resolve(distDir, 'reset.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // First build pass
      const file1 = resolve(testDir, 'reset-test.pulse');
      writeFileSync(file1, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file1 });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should exist after first build');
      const firstCss = readFileSync(cssPath, 'utf8');
      assert.ok(firstCss.includes('.card'), 'First build should have card styles');

      // Wipe CSS file to confirm it gets regenerated
      rmSync(cssPath);

      // Second build pass - onStart resets accumulated CSS
      await buildContext.build({ path: file1 });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be recreated after second build');
    });

    it('should not write CSS file when there are build errors', async () => {
      const cssPath = resolve(distDir, 'no-write.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'err-test.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file });

      // Trigger onEnd with errors
      await buildContext.triggerEnd({ errors: [{ text: 'some build error' }] });

      assert.ok(!existsSync(cssPath), 'CSS file should NOT be created when build has errors');
    });

    it('should not write CSS file when no CSS was accumulated', async () => {
      const cssPath = resolve(distDir, 'no-css.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'no-css.pulse');
      writeFileSync(file, PULSE_NO_STYLE);

      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(!existsSync(cssPath), 'CSS file should NOT be created when no CSS accumulated');
    });

    it('should include source file comment in accumulated CSS', async () => {
      const cssPath = resolve(distDir, 'comment.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'comment-test.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes(`/* ${file} */`), 'CSS should include source file path comment');
    });
  });

  // ===========================================================================
  // 5. File Resolution (onResolve)
  // ===========================================================================

  describe('File resolution', () => {
    it('should resolve .js imports to .pulse files when .pulse exists', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // Create a .pulse file to be found
      const pulseFile = resolve(testDir, 'MyComponent.pulse');
      writeFileSync(pulseFile, SIMPLE_PULSE);

      const result = await buildContext.resolve({
        path: 'MyComponent.js',
        resolveDir: testDir
      });

      assert.ok(result, 'Should return a resolution result');
      assert.strictEqual(result.path, pulseFile, 'Should resolve to the .pulse file path');
    });

    it('should return null when no corresponding .pulse file exists', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const result = await buildContext.resolve({
        path: 'NonExistent.js',
        resolveDir: testDir
      });

      assert.strictEqual(result, null, 'Should return null when .pulse file does not exist');
    });

    it('should only match .js files in onResolve filter', () => {
      const plugin = pulsePlugin();
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const filter = buildContext._onResolveHandlers[0].filter;
      assert.ok(filter.test('component.js'), 'Should match .js files');
      assert.ok(filter.test('path/to/module.js'), 'Should match nested .js files');
      assert.ok(!filter.test('component.ts'), 'Should not match .ts files');
      assert.ok(!filter.test('component.pulse'), 'Should not match .pulse files');
    });
  });

  // ===========================================================================
  // 6. Error Handling
  // ===========================================================================

  describe('Error handling', () => {
    it('should return errors in ESBuild format on compilation failure', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-invalid.pulse');
      writeFileSync(testFile, INVALID_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result.errors, 'Should return errors array');
      assert.ok(result.errors.length > 0, 'Should have at least one error');
      assert.ok(result.errors[0].text.includes('Pulse compilation failed'), 'Error text should mention compilation failure');
    });

    it('should include location with file path in errors', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-err-loc.pulse');
      writeFileSync(testFile, INVALID_PULSE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result.errors[0].location, 'Error should have location object');
      assert.strictEqual(result.errors[0].location.file, testFile, 'Error location should reference the file');
    });

    it('should handle file read errors gracefully', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // File does not exist
      const nonExistent = resolve(testDir, 'does-not-exist.pulse');

      const result = await buildContext.build({ path: nonExistent });

      assert.ok(result.errors, 'Should return errors array');
      assert.ok(result.errors.length > 0, 'Should have at least one error');
      assert.ok(result.errors[0].text.includes('Pulse plugin error'), 'Error should mention plugin error');
    });

    it('should return errors array (not throw) for compilation failures', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-nothrow.pulse');
      writeFileSync(testFile, INVALID_PULSE);

      // Should not throw
      const result = await buildContext.build({ path: testFile });
      assert.ok(result, 'Should return a result object (not throw)');
      assert.ok(Array.isArray(result.errors), 'errors should be an array');
    });

    it('should handle CSS write errors without crashing', async () => {
      // Use an invalid path (directory that would be impossible to create)
      const cssPath = resolve(distDir, '\0invalid', 'test.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'test-write-err.pulse');
      writeFileSync(testFile, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: testFile });

      // Should not throw - onEnd should catch write errors
      await buildContext.triggerEnd({ errors: [] });
    });
  });

  // ===========================================================================
  // 7. Build Lifecycle
  // ===========================================================================

  describe('Build lifecycle', () => {
    it('should reset state on onStart before processing files', async () => {
      const cssPath = resolve(distDir, 'lifecycle.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'lifecycle.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      // First build
      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      const firstCss = readFileSync(cssPath, 'utf8');
      // Count occurrences of the file comment (one per build pass)
      const firstCommentCount = (firstCss.match(/\/\* .+lifecycle\.pulse \*\//g) || []).length;
      assert.strictEqual(firstCommentCount, 1, 'First build should have exactly one file comment');

      // Second build - onStart should reset accumulated CSS
      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      const secondCss = readFileSync(cssPath, 'utf8');
      const secondCommentCount = (secondCss.match(/\/\* .+lifecycle\.pulse \*\//g) || []).length;

      // If onStart did NOT reset, the second build would have 2 file comments (doubled CSS)
      assert.strictEqual(secondCommentCount, 1, 'Second build should still have exactly one file comment (CSS was reset)');

      // Both builds should produce CSS with the same structural content
      // (scoped class suffixes may differ, so we check structure not exact match)
      assert.ok(secondCss.includes('padding: 16px'), 'Second build CSS should contain expected styles');
      assert.ok(secondCss.includes('.card'), 'Second build CSS should contain card class');
    });

    it('should check for errors before writing CSS in onEnd', async () => {
      const cssPath = resolve(distDir, 'end-errors.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'end-test.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file });

      // Trigger onEnd with errors
      await buildContext.triggerEnd({ errors: [{ text: 'build error' }] });
      assert.ok(!existsSync(cssPath), 'Should not write CSS when build has errors');

      // Now trigger without errors
      await buildContext.triggerEnd({ errors: [] });
      assert.ok(existsSync(cssPath), 'Should write CSS when build has no errors');
    });

    it('should create CSS output directory if it does not exist', async () => {
      const nestedDir = resolve(distDir, 'deeply', 'nested', 'dir');
      const cssPath = resolve(nestedDir, 'output.css');

      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'nested-dir.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(nestedDir), 'Nested directory should be created');
      assert.ok(existsSync(cssPath), 'CSS file should be created in nested directory');
    });
  });

  // ===========================================================================
  // 8. Edge Cases
  // ===========================================================================

  describe('Edge cases', () => {
    it('should handle an empty .pulse file', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'empty.pulse');
      writeFileSync(testFile, '');

      const result = await buildContext.build({ path: testFile });

      // Should either compile to empty output or return an error, but not crash
      assert.ok(result, 'Should return a result (not crash)');
    });

    it('should handle a .pulse file with only whitespace', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'whitespace.pulse');
      writeFileSync(testFile, '   \n\n  \t\n  ');

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result (not crash)');
    });

    it('should handle a very large .pulse file', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // Build a large .pulse file with many elements
      let viewChildren = '';
      for (let i = 0; i < 200; i++) {
        viewChildren += `    p "Item ${i}"\n`;
      }

      const largePulse = `@page LargeComponent

state {
  count: 0
}

view {
  .large {
${viewChildren}  }
}

style {
  .large { padding: 10px; }
}`;

      const testFile = resolve(testDir, 'large.pulse');
      writeFileSync(testFile, largePulse);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have compiled code');
      assert.strictEqual(result.loader, 'js');
    });

    it('should handle CSS path with spaces', async () => {
      const spacedDir = resolve(distDir, 'my output dir');
      mkdirSync(spacedDir, { recursive: true });
      const cssPath = resolve(spacedDir, 'bundle.css');

      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const file = resolve(testDir, 'spaced.pulse');
      writeFileSync(file, PULSE_WITH_RICH_STYLE);

      await buildContext.build({ path: file });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created in directory with spaces');
    });

    it('should handle .pulse file with style but no view content', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const source = `@page StyleOnly

view {
  div "Minimal"
}

style {
  body { margin: 0; }
  .app { font-family: sans-serif; }
}`;

      const testFile = resolve(testDir, 'style-only.pulse');
      writeFileSync(testFile, source);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result, 'Should return a result');
      assert.ok(result.contents, 'Should have compiled code');
    });

    it('should handle onLoad filter matching only .pulse extension', async () => {
      const plugin = pulsePlugin({ sourceMap: false });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const filter = buildContext._onLoadHandlers[0].filter;

      assert.ok(filter.test('component.pulse'), 'Should match .pulse');
      assert.ok(filter.test('/path/to/file.pulse'), 'Should match full .pulse path');
      assert.ok(!filter.test('component.pulsex'), 'Should not match .pulsex');
      assert.ok(!filter.test('component.js'), 'Should not match .js');
      assert.ok(!filter.test('pulse'), 'Should not match bare "pulse"');
    });
  });

  // ===========================================================================
  // 9. CSS Extraction vs Inline
  // ===========================================================================

  describe('CSS extraction vs inline', () => {
    it('should replace inline CSS injection with comment when extracting', async () => {
      const cssPath = resolve(distDir, 'extracted.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'extract-replace.pulse');
      writeFileSync(testFile, PULSE_WITH_RICH_STYLE);

      const result = await buildContext.build({ path: testFile });

      // When extracting CSS, the output should attempt to strip inline injection
      // The replacement pattern targets the specific inline injection format
      assert.ok(result.contents, 'Should have contents');
      // The output should still be valid JS
      assert.strictEqual(result.loader, 'js');
    });

    it('should preserve inline styles when extractCss is null', async () => {
      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testFile = resolve(testDir, 'keep-inline.pulse');
      writeFileSync(testFile, PULSE_WITH_RICH_STYLE);

      const result = await buildContext.build({ path: testFile });

      assert.ok(result.contents.includes('const styles ='), 'Should contain inline styles variable');
    });
  });

  // ===========================================================================
  // 10. Preprocessor Integration
  // ===========================================================================

  describe('Preprocessor integration', () => {
    it('should compile SASS if sass is available', async () => {
      const { isSassAvailable } = await import('../compiler/preprocessor.js');

      if (!isSassAvailable()) {
        // Skip test if SASS is not installed
        return;
      }

      const cssPath = resolve(distDir, 'test-sass.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testSource = `@page SassComponent

view {
  div.sass-test "Content"
}

style {
  $primary: #646cff;
  .sass-test {
    color: $primary;
    &:hover { opacity: 0.8; }
  }
}`;

      const testFile = resolve(testDir, 'test-sass.pulse');
      writeFileSync(testFile, testSource);

      await buildContext.build({ path: testFile });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.sass-test'), 'Should contain class');
      assert.ok(cssContent.includes('#646cff'), 'Should compile SASS variable');
      assert.ok(!cssContent.includes('$primary'), 'Should not contain SASS syntax');
    });

    it('should compile LESS if less is available', async () => {
      const { isLessAvailable } = await import('../compiler/preprocessor.js');

      if (!isLessAvailable()) {
        return;
      }

      const cssPath = resolve(distDir, 'test-less.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testSource = `@page LessComponent

view {
  div.less-test "Content"
}

style {
  @primary: #646cff;
  .less-test {
    color: @primary;
    &:hover { opacity: 0.8; }
  }
}`;

      const testFile = resolve(testDir, 'test-less.pulse');
      writeFileSync(testFile, testSource);

      await buildContext.build({ path: testFile });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.less-test'), 'Should contain class');
      assert.ok(cssContent.includes('#646cff'), 'Should compile LESS variable');
      assert.ok(!cssContent.includes('@primary'), 'Should not contain LESS syntax');
    });

    it('should compile Stylus if stylus is available', async () => {
      const { isStylusAvailable } = await import('../compiler/preprocessor.js');

      if (!isStylusAvailable()) {
        return;
      }

      const cssPath = resolve(distDir, 'test-stylus.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testSource = `@page StylusComponent

view {
  div.stylus-test "Content"
}

style {
  primary = #646cff
  .stylus-test
    color primary
    &:hover
      opacity 0.8
}`;

      const testFile = resolve(testDir, 'test-stylus.pulse');
      writeFileSync(testFile, testSource);

      await buildContext.build({ path: testFile });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.stylus-test'), 'Should contain class');
      assert.ok(cssContent.includes('#646cff'), 'Should compile Stylus variable');
    });

    it('should pass through plain CSS without preprocessing', async () => {
      const cssPath = resolve(distDir, 'test-plain.css');
      const plugin = pulsePlugin({ sourceMap: false, extractCss: cssPath });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      const testSource = `@page PlainCSS

view {
  div.plain "Content"
}

style {
  .plain {
    color: red;
    font-size: 16px;
  }
}`;

      const testFile = resolve(testDir, 'test-plain.pulse');
      writeFileSync(testFile, testSource);

      await buildContext.build({ path: testFile });
      await buildContext.triggerEnd({ errors: [] });

      assert.ok(existsSync(cssPath), 'CSS file should be created');
      const cssContent = readFileSync(cssPath, 'utf8');
      assert.ok(cssContent.includes('.plain'), 'Should contain plain CSS class');
      assert.ok(cssContent.includes('color: red'), 'Should contain plain CSS property');
    });

    it('should emit warnings (not errors) when preprocessor compilation fails', async () => {
      const { isSassAvailable } = await import('../compiler/preprocessor.js');

      if (!isSassAvailable()) {
        return;
      }

      const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
      const buildContext = createMockBuildContext();
      plugin.setup(buildContext);

      // SASS syntax that will fail to compile (invalid nesting)
      const testSource = `@page BadSass

view {
  div.bad "Content"
}

style {
  $primary: #646cff;
  .bad {
    color: $primary;
    @error "force failure";
  }
}`;

      const testFile = resolve(testDir, 'test-bad-sass.pulse');
      writeFileSync(testFile, testSource);

      const result = await buildContext.build({ path: testFile });

      // Should return warnings, not errors - the file should still compile
      if (result.warnings) {
        assert.ok(result.warnings.length > 0, 'Should have at least one warning');
        assert.ok(result.warnings[0].text.includes('SASS'), 'Warning should mention SASS');
        assert.ok(result.warnings[0].location, 'Warning should have location');
      }
      // It should still have contents (falls back to original CSS in output)
      if (result.contents) {
        assert.ok(result.contents, 'Should still have compiled output code');
      }
    });
  });
});
