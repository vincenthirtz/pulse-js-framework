/**
 * Tests for SWC Plugin
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('SWC Plugin', () => {
  const testDir = resolve(__dirname, 'fixtures', 'swc-test');
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
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');
    assert.strictEqual(typeof pulsePlugin, 'function', 'Plugin should be a function');
  });

  it('should export transformPulseFile function', async () => {
    const { transformPulseFile } = await import('../loader/swc-plugin.js');
    assert.strictEqual(typeof transformPulseFile, 'function', 'transformPulseFile should be a function');
  });

  it('should export transformPulseCode function', async () => {
    const { transformPulseCode } = await import('../loader/swc-plugin.js');
    assert.strictEqual(typeof transformPulseCode, 'function', 'transformPulseCode should be a function');
  });

  it('should export buildPulseFiles function', async () => {
    const { buildPulseFiles } = await import('../loader/swc-plugin.js');
    assert.strictEqual(typeof buildPulseFiles, 'function', 'buildPulseFiles should be a function');
  });

  it('should compile .pulse file to JavaScript', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');

    const plugin = pulsePlugin({ sourceMap: false, extractCss: null });

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

    const result = plugin.transform(testSource, resolve(testDir, 'test.pulse'));

    assert.ok(result, 'Should return a result');
    assert.strictEqual(result.error, null, 'Should have no error');
    assert.ok(result.code, 'Should have compiled code');
    assert.ok(result.code.includes('pulse'), 'Should import pulse runtime');
    assert.ok(result.code.includes('el('), 'Should use el() function');
  });

  it('should compile .pulse file via transformPulseCode', async () => {
    const { transformPulseCode } = await import('../loader/swc-plugin.js');

    const testSource = `@page CodeTest

state {
  name: "world"
}

view {
  div "Hello {name}"
}`;

    const result = transformPulseCode(testSource, {
      sourceMap: false,
      filename: resolve(testDir, 'code-test.pulse')
    });

    assert.ok(result, 'Should return a result');
    assert.strictEqual(result.error, null, 'Should have no error');
    assert.ok(result.code, 'Should have compiled code');
    assert.ok(result.code.includes('el('), 'Should use el() function');
  });

  it('should compile .pulse file via transformPulseFile', async () => {
    const { transformPulseFile } = await import('../loader/swc-plugin.js');

    const testSource = `@page FileTest

view {
  div.hello "Hello World"
}

style {
  .hello { color: blue; }
}`;

    mkdirSync(testDir, { recursive: true });
    const testFile = resolve(testDir, 'file-test.pulse');
    writeFileSync(testFile, testSource);

    const result = transformPulseFile(testFile, { sourceMap: false });

    assert.ok(result, 'Should return a result');
    assert.strictEqual(result.error, null, 'Should have no error');
    assert.ok(result.code, 'Should have compiled code');
    assert.ok(result.css, 'Should have extracted CSS');
    assert.ok(result.css.includes('.hello'), 'CSS should contain hello class');
  });

  it('should extract CSS when extractCss option is provided', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');

    mkdirSync(distDir, { recursive: true });
    const cssPath = resolve(distDir, 'test.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    plugin.buildStart();
    const result = plugin.transform(testSource, resolve(testDir, 'test-extract.pulse'));
    plugin.buildEnd();

    assert.strictEqual(result.error, null, 'Should have no error');
    assert.ok(result.code, 'Should have compiled code');

    // Check if CSS file was created
    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.counter'), 'CSS should contain counter class');
    assert.ok(cssContent.includes('padding: 20px'), 'CSS should contain styles');

    cleanup();
  });

  it('should keep inline CSS when extractCss is null', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');

    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: null
    });

    const testSource = `@page TestComponent

view {
  div.test "Content"
}

style {
  .test { color: red; }
}`;

    const result = plugin.transform(testSource, resolve(testDir, 'test-inline.pulse'));

    assert.strictEqual(result.error, null, 'Should have no error');
    assert.ok(result.code.includes('const styles ='), 'Should have inline styles variable');
    assert.ok(result.code.includes('createElement("style")'), 'Should inject styles into DOM');
  });

  it('should handle compilation errors gracefully', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');

    const plugin = pulsePlugin({ sourceMap: false });

    const invalidSource = `@page Invalid

state {
  count: // Invalid syntax
}`;

    const result = plugin.transform(invalidSource, resolve(testDir, 'test-invalid.pulse'));

    assert.ok(result.error, 'Should return an error');
    assert.ok(result.error.includes('Pulse compilation failed'), 'Error should mention compilation failure');
    assert.strictEqual(result.code, null, 'Should have no code');
  });

  it('should batch process files with buildPulseFiles', async () => {
    const { buildPulseFiles } = await import('../loader/swc-plugin.js');

    mkdirSync(testDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });

    const file1 = resolve(testDir, 'batch1.pulse');
    const file2 = resolve(testDir, 'batch2.pulse');

    writeFileSync(file1, `@page Batch1\nview { div "Hello" }\nstyle { div { color: red; } }`);
    writeFileSync(file2, `@page Batch2\nview { span "World" }\nstyle { span { color: blue; } }`);

    const cssPath = resolve(distDir, 'batch.css');
    const results = buildPulseFiles([file1, file2], {
      sourceMap: false,
      extractCss: cssPath
    });

    assert.strictEqual(results.length, 2, 'Should return 2 results');
    assert.strictEqual(results[0].error, null, 'First file should have no error');
    assert.strictEqual(results[1].error, null, 'Second file should have no error');
    assert.ok(results[0].code, 'First file should have code');
    assert.ok(results[1].code, 'Second file should have code');

    // Check if CSS file was created with both files' styles
    assert.ok(existsSync(cssPath), 'CSS file should be created');
    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('color: red'), 'CSS should contain first file styles');
    assert.ok(cssContent.includes('color: blue'), 'CSS should contain second file styles');

    cleanup();
  });

  it('should compile SASS if sass is available', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');
    const { isSassAvailable } = await import('../compiler/preprocessor.js');

    if (!isSassAvailable()) {
      console.log('  ⊘ SASS not installed, skipping SASS test');
      return;
    }

    mkdirSync(distDir, { recursive: true });
    const cssPath = resolve(distDir, 'test-sass.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    plugin.buildStart();
    plugin.transform(testSource, resolve(testDir, 'test-sass.pulse'));
    plugin.buildEnd();

    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.sass-test'), 'Should contain class');
    assert.ok(cssContent.includes('#646cff'), 'Should compile SASS variable');
    assert.ok(!cssContent.includes('$primary'), 'Should not contain SASS syntax');

    cleanup();
  });

  it('should compile LESS if less is available', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');
    const { isLessAvailable } = await import('../compiler/preprocessor.js');

    if (!isLessAvailable()) {
      console.log('  ⊘ LESS not installed, skipping LESS test');
      return;
    }

    mkdirSync(distDir, { recursive: true });
    const cssPath = resolve(distDir, 'test-less.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    plugin.buildStart();
    plugin.transform(testSource, resolve(testDir, 'test-less.pulse'));
    plugin.buildEnd();

    assert.ok(existsSync(cssPath), 'CSS file should be created');

    const cssContent = readFileSync(cssPath, 'utf8');
    assert.ok(cssContent.includes('.less-test'), 'Should contain class');
    assert.ok(cssContent.includes('#646cff'), 'Should compile LESS variable');
    assert.ok(!cssContent.includes('@primary'), 'Should not contain LESS syntax');

    cleanup();
  });

  it('should compile Stylus if stylus is available', async () => {
    const { default: pulsePlugin } = await import('../loader/swc-plugin.js');
    const { isStylusAvailable } = await import('../compiler/preprocessor.js');

    if (!isStylusAvailable()) {
      console.log('  ⊘ Stylus not installed, skipping Stylus test');
      return;
    }

    mkdirSync(distDir, { recursive: true });
    const cssPath = resolve(distDir, 'test-stylus.css');
    const plugin = pulsePlugin({
      sourceMap: false,
      extractCss: cssPath
    });

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

    plugin.buildStart();
    plugin.transform(testSource, resolve(testDir, 'test-stylus.pulse'));
    plugin.buildEnd();

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
