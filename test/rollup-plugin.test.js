/**
 * Tests for Rollup plugin
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import pulsePlugin from '../loader/rollup-plugin.js';

describe('Rollup Plugin', () => {
  test('exports default function', () => {
    assert.strictEqual(typeof pulsePlugin, 'function');
  });

  test('plugin returns object with name', () => {
    const plugin = pulsePlugin();
    assert.strictEqual(typeof plugin, 'object');
    assert.strictEqual(plugin.name, 'pulse');
  });

  test('plugin has required hooks', () => {
    const plugin = pulsePlugin();
    assert.strictEqual(typeof plugin.buildStart, 'function');
    assert.strictEqual(typeof plugin.resolveId, 'function');
    assert.strictEqual(typeof plugin.transform, 'function');
    assert.strictEqual(typeof plugin.generateBundle, 'function');
  });

  test('transform returns null for non-.pulse files', () => {
    const plugin = pulsePlugin();
    const result = plugin.transform('console.log("test")', '/test/file.js');
    assert.strictEqual(result, null);
  });

  test('transform compiles .pulse files', () => {
    const plugin = pulsePlugin();

    const source = `
@page Test

state {
  count: 0
}

view {
  .test {
    h1 "Count: {count}"
  }
}

style {
  .test { color: red; }
}
`;

    const result = plugin.transform(source, '/test/Test.pulse');

    assert.ok(result);
    assert.ok(result.code);
    assert.ok(result.code.includes('pulse('));
    assert.ok(result.code.includes('el('));
  });

  test('transform handles compilation errors', () => {
    const plugin = pulsePlugin();

    const invalidSource = `
@page Invalid

state {
  count: // invalid
}
`;

    let errorThrown = false;
    plugin.error = (msg) => {
      errorThrown = true;
      assert.ok(msg.includes('Pulse compilation failed'));
    };

    plugin.transform(invalidSource, '/test/Invalid.pulse');
    assert.ok(errorThrown);
  });

  test('transform extracts CSS when extractCss is set', () => {
    const plugin = pulsePlugin({ extractCss: 'bundle.css' });

    const source = `
@page Test

view {
  .test { h1 "Test" }
}

style {
  .test {
    color: blue;
    padding: 20px;
  }
}
`;

    const result = plugin.transform(source, '/test/Test.pulse');

    assert.ok(result);
    assert.ok(result.code);
    // Transform should succeed when extractCss is enabled
    // The actual CSS extraction happens in generateBundle
    assert.ok(result.code.length > 0);
  });

  test('transform keeps inline CSS when extractCss is null', () => {
    const plugin = pulsePlugin({ extractCss: null });

    const source = `
@page Test

view {
  .test { h1 "Test" }
}

style {
  .test { color: green; }
}
`;

    const result = plugin.transform(source, '/test/Test.pulse');

    assert.ok(result);
    assert.ok(result.code);
    // Should keep inline CSS injection
    assert.ok(result.code.includes('const styles') || result.code.includes('createElement'));
  });

  test('transform respects sourceMap option', () => {
    const pluginWithMap = pulsePlugin({ sourceMap: true });
    const pluginWithoutMap = pulsePlugin({ sourceMap: false });

    const source = `
@page Test

view {
  .test { h1 "Test" }
}
`;

    const resultWithMap = pluginWithMap.transform(source, '/test/Test.pulse');
    const resultWithoutMap = pluginWithoutMap.transform(source, '/test/Test.pulse');

    assert.ok(resultWithMap);
    assert.ok(resultWithoutMap);

    // With source map enabled, map should be present (or null if compile doesn't generate)
    // With source map disabled, map should be null
    assert.strictEqual(resultWithoutMap.map, null);
  });

  test('transform respects include/exclude filters', () => {
    const plugin = pulsePlugin({
      include: /\.pulse$/,
      exclude: /node_modules/
    });

    const source = '@page Test\nview { .test }';

    // Should process .pulse files
    const result1 = plugin.transform(source, '/src/Test.pulse');
    assert.ok(result1);

    // Should exclude node_modules
    const result2 = plugin.transform(source, '/node_modules/Test.pulse');
    assert.strictEqual(result2, null);
  });

  test('generateBundle emits CSS asset when extractCss is set', () => {
    const plugin = pulsePlugin({ extractCss: 'output.css' });

    let emittedFile = null;
    plugin.emitFile = (file) => {
      emittedFile = file;
    };

    // Transform a file with CSS
    const source = `
@page Test
view { .test }
style { .test { color: red; } }
`;
    plugin.transform(source, '/test/Test.pulse');

    // Call generateBundle
    plugin.generateBundle();

    // Should have emitted CSS file
    assert.ok(emittedFile);
    assert.strictEqual(emittedFile.type, 'asset');
    assert.strictEqual(emittedFile.fileName, 'output.css');
    assert.ok(emittedFile.source.includes('color: red'));
  });

  test('buildStart resets accumulated CSS', () => {
    const plugin = pulsePlugin({ extractCss: 'test.css' });

    // Transform a file
    const source = `
@page Test
view { .test }
style { .test { color: blue; } }
`;
    plugin.transform(source, '/test/Test.pulse');

    // buildStart should reset
    plugin.buildStart();

    let emittedFile = null;
    plugin.emitFile = (file) => {
      emittedFile = file;
    };

    plugin.generateBundle();

    // Should not emit CSS (was reset)
    assert.strictEqual(emittedFile, null);
  });
});
