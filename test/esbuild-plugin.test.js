/**
 * Tests for ESBuild Plugin
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create a minimal mock of ESBuild's plugin API
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
    }
  };
}

describe('ESBuild Plugin', () => {
  const testDir = resolve(__dirname, 'fixtures', 'esbuild-test');
  const distDir = resolve(testDir, 'dist');

  // Setup test directory
  mkdirSync(testDir, { recursive: true });
  mkdirSync(distDir, { recursive: true });

  // Cleanup after tests
  function cleanup() {
    if (existsSync(distDir)) {
      rmSync(distDir, { recursive: true, force: true });
    }
  }

  it('should load the plugin', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');
    assert.strictEqual(typeof pulsePlugin, 'function', 'Plugin should be a function');
  });

  it('should compile .pulse file to JavaScript', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');

    const plugin = pulsePlugin({ sourceMap: false, extractCss: null });
    const buildContext = createMockBuildContext();
    plugin.setup(buildContext);

    const testSource = `@page TestComponent

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

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    const testFile = resolve(testDir, 'test.pulse');
    writeFileSync(testFile, testSource);

    const result = await buildContext.build({
      path: testFile
    });

    assert.ok(result, 'Should return a result');
    assert.ok(result.contents, 'Should have compiled code');
    assert.ok(result.contents.includes('pulse'), 'Should import pulse runtime');
    assert.ok(result.contents.includes('el('), 'Should use el() function');

    cleanup();
  });

  it('should extract CSS when extractCss option is provided', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');

    const cssPath = resolve(distDir, 'test.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

    const buildContext = createMockBuildContext();
    plugin.setup(buildContext);

    const testSource = `@page TestComponent

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
  }
}

style {
  .counter {
    padding: 20px;
    background: #fff;
  }
}`;

    // Ensure directories exist
    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const testFile = resolve(testDir, 'test-extract.pulse');
    writeFileSync(testFile, testSource);

    // Simulate build
    await buildContext.build({ path: testFile });

    // Trigger onEnd to emit CSS
    await buildContext.triggerEnd({ errors: [] });

    // Check if CSS file was created
    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.counter'), 'CSS should contain counter class');
    assert.ok(cssContent.includes('padding: 20px'), 'CSS should contain styles');

    cleanup();
  });

  it('should keep inline CSS when extractCss is null', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');

    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: null  // Keep inline
    });

    const buildContext = createMockBuildContext();
    plugin.setup(buildContext);

    const testSource = `@page TestComponent

view {
  div.test "Content"
}

style {
  .test { color: red; }
}`;

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    const testFile = resolve(testDir, 'test-inline.pulse');
    writeFileSync(testFile, testSource);

    const result = await buildContext.build({ path: testFile });

    assert.ok(result.contents.includes('const styles ='), 'Should have inline styles variable');
    assert.ok(result.contents.includes('createElement("style")'), 'Should inject styles into DOM');

    cleanup();
  });

  it('should handle compilation errors gracefully', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');

    const plugin = pulsePlugin({ sourceMap: false });
    const buildContext = createMockBuildContext();
    plugin.setup(buildContext);

    const invalidSource = `@page Invalid

state {
  count: // Invalid syntax
}`;

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    const testFile = resolve(testDir, 'test-invalid.pulse');
    writeFileSync(testFile, invalidSource);

    const result = await buildContext.build({ path: testFile });

    assert.ok(result.errors, 'Should return errors array');
    assert.ok(result.errors.length > 0, 'Should have at least one error');
    assert.ok(result.errors[0].text.includes('Pulse compilation failed'), 'Error should mention compilation failure');

    cleanup();
  });

  it('should compile SASS if sass is available', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');
    const { isSassAvailable } = await import('../compiler/preprocessor.js');

    if (!isSassAvailable()) {
      console.log('  ⊘ SASS not installed, skipping SASS test');
      return;
    }

    const cssPath = resolve(distDir, 'test-sass.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const testFile = resolve(testDir, 'test-sass.pulse');
    writeFileSync(testFile, testSource);

    await buildContext.build({ path: testFile });
    await buildContext.triggerEnd({ errors: [] });

    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.sass-test'), 'Should contain class');
    assert.ok(cssContent.includes('#646cff'), 'Should compile SASS variable');
    assert.ok(!cssContent.includes('$primary'), 'Should not contain SASS syntax');

    cleanup();
  });

  it('should compile LESS if less is available', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');
    const { isLessAvailable } = await import('../compiler/preprocessor.js');

    if (!isLessAvailable()) {
      console.log('  ⊘ LESS not installed, skipping LESS test');
      return;
    }

    const cssPath = resolve(distDir, 'test-less.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const testFile = resolve(testDir, 'test-less.pulse');
    writeFileSync(testFile, testSource);

    await buildContext.build({ path: testFile });
    await buildContext.triggerEnd({ errors: [] });

    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.less-test'), 'Should contain class');
    assert.ok(cssContent.includes('#646cff'), 'Should compile LESS variable');
    assert.ok(!cssContent.includes('@primary'), 'Should not contain LESS syntax');

    cleanup();
  });

  it('should compile Stylus if stylus is available', async () => {
    const { default: pulsePlugin } = await import('../loader/esbuild-plugin.js');
    const { isStylusAvailable } = await import('../compiler/preprocessor.js');

    if (!isStylusAvailable()) {
      console.log('  ⊘ Stylus not installed, skipping Stylus test');
      return;
    }

    const cssPath = resolve(distDir, 'test-stylus.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    // Ensure directory exists
    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    const testFile = resolve(testDir, 'test-stylus.pulse');
    writeFileSync(testFile, testSource);

    await buildContext.build({ path: testFile });
    await buildContext.triggerEnd({ errors: [] });

    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.stylus-test'), 'Should contain class');
    assert.ok(cssContent.includes('#646cff'), 'Should compile Stylus variable');

    cleanup();
  });

  // Final cleanup
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});
