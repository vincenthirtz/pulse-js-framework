/**
 * Tests for Parcel plugin (Transformer)
 *
 * These tests use mocks to simulate Parcel's asset API without requiring
 * @parcel/plugin as a dependency. Tests are designed to be robust across
 * different environments (with/without preprocessors installed).
 *
 * Test Design Principles:
 * 1. Mock Parcel Asset API - createMockAsset() provides consistent mock
 * 2. Environment Aware - Skip tests when optional deps (SASS/LESS/Stylus) unavailable
 * 3. Clear Assertions - Each test has descriptive assertion messages
 * 4. No False Failures - Optional features (source maps) don't cause failures
 * 5. Reusable Helpers - DRY principle with createMockAsset function
 *
 * Coverage:
 * - ✅ Plugin exports and API surface
 * - ✅ Basic .pulse file compilation
 * - ✅ Compilation error handling
 * - ✅ CSS extraction (enabled/disabled)
 * - ✅ SASS/LESS/Stylus preprocessing (when available)
 * - ✅ Preprocessor error resilience
 * - ✅ Source map configuration
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

/**
 * Create a mock Parcel asset for testing
 */
function createMockAsset({ source, config = {} }) {
  let transformedCode = null;
  let transformedMap = null;
  const addedAssets = [];
  const dependencies = [];

  return {
    asset: {
      filePath: config.filePath || '/test/Test.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          sourceMap: true,
          extractCss: true,
          ...config
        };
      },
      setCode(code) {
        transformedCode = code;
      },
      setMap(map) {
        transformedMap = map;
      },
      addDependency(dep) {
        dependencies.push(dep);
      },
      async addAsset(assetConfig) {
        addedAssets.push(assetConfig);
      }
    },
    logger: {
      info() {},
      verbose() {},
      warn() {}
    },
    getTransformedCode: () => transformedCode,
    getTransformedMap: () => transformedMap,
    getAddedAssets: () => addedAssets,
    getDependencies: () => dependencies
  };
}

describe('Parcel Plugin', () => {
  test('exports default object with transform function', async () => {
    const plugin = await import('../loader/parcel-plugin.js');
    assert.ok(plugin.default);
    assert.strictEqual(typeof plugin.default.transform, 'function');
  });

  test('exports transformPulse function', async () => {
    const { transformPulse } = await import('../loader/parcel-plugin.js');
    assert.ok(transformPulse);
    assert.strictEqual(typeof transformPulse, 'function');
  });

  test('transformer compiles .pulse source', async () => {
    const plugin = await import('../loader/parcel-plugin.js');
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

    const mock = createMockAsset({ source });
    const result = await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // Should return array with asset
    assert.ok(Array.isArray(result), 'Should return array');
    assert.strictEqual(result.length, 1, 'Should return single asset');

    // Should transform to JavaScript
    const transformedCode = mock.getTransformedCode();
    assert.ok(transformedCode, 'Code should be transformed');
    assert.ok(transformedCode.includes('pulse('), 'Should import pulse');
    assert.ok(transformedCode.includes('el('), 'Should import el');

    // CSS should be extracted
    const addedAssets = mock.getAddedAssets();
    assert.ok(
      transformedCode.includes('Styles extracted') ||
      transformedCode.includes('CSS asset'),
      'CSS should be extracted from code'
    );
    assert.strictEqual(addedAssets.length, 1, 'Should add one CSS asset');
    assert.strictEqual(addedAssets[0].type, 'css', 'Asset should be CSS type');
    assert.ok(addedAssets[0].content.includes('color: red'), 'CSS should contain styles');
  });

  test('transformer handles compilation errors', async () => {
    const plugin = await import('../loader/parcel-plugin.js');
    const invalidSource = `
@page Invalid

state {
  count: // invalid syntax
}
`;

    const mock = createMockAsset({
      source: invalidSource,
      config: { filePath: '/test/Invalid.pulse' }
    });

    try {
      await plugin.default.transform({
        asset: mock.asset,
        logger: mock.logger
      });
      assert.fail('Should throw compilation error');
    } catch (error) {
      assert.ok(error.message.includes('Pulse compilation failed'),
        'Error should mention Pulse compilation failure');
    }
  });

  test('transformer supports inline CSS when extractCss is false', async () => {
    const plugin = await import('../loader/parcel-plugin.js');
    const source = `
@page Test

style {
  .test { color: blue; }
}

view {
  .test { h1 "Test" }
}
`;

    const mock = createMockAsset({
      source,
      config: { extractCss: false }
    });

    await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // CSS should remain inline (not extracted)
    const transformedCode = mock.getTransformedCode();
    const addedAssets = mock.getAddedAssets();

    assert.ok(transformedCode.includes('const styles'), 'Should have styles constant');
    assert.ok(transformedCode.includes('createElement("style")'), 'Should create style element');
    assert.strictEqual(addedAssets.length, 0, 'Should not add CSS asset when extractCss is false');
  });

  test('transformer supports SASS preprocessing', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const { isSassAvailable } = await import('../compiler/preprocessor.js');

    if (!isSassAvailable()) {
      t.skip('SASS not available, skipping test');
      return;
    }

    const source = `
@page SassTest

style {
  $primary: #646cff;
  .button {
    background: $primary;
    &:hover {
      opacity: 0.8;
    }
  }
}

view {
  .button { button "Click me" }
}
`;

    const mock = createMockAsset({
      source,
      config: {
        filePath: '/test/SassTest.pulse',
        extractCss: true,
        sass: { loadPaths: [] }
      }
    });

    await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // SASS should be compiled
    const addedAssets = mock.getAddedAssets();
    assert.strictEqual(addedAssets.length, 1, 'Should add CSS asset');

    const cssContent = addedAssets[0].content;
    assert.ok(cssContent, 'CSS content should exist');
    assert.ok(cssContent.includes('.button'), 'Should include button class');
    assert.ok(
      cssContent.includes('#646cff') || cssContent.includes('opacity'),
      'Should include compiled CSS values'
    );
    assert.ok(!cssContent.includes('$primary'), 'Should not contain SASS variable syntax');
  });

  test('transformer supports LESS preprocessing', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const { isLessAvailable } = await import('../compiler/preprocessor.js');

    if (!isLessAvailable()) {
      t.skip('LESS not available, skipping test');
      return;
    }

    const source = `
@page LessTest

style {
  @primary: #646cff;
  .button {
    background: @primary;
    &:hover {
      opacity: 0.8;
    }
  }
}

view {
  .button { button "Click me" }
}
`;

    const mock = createMockAsset({
      source,
      config: {
        filePath: '/test/LessTest.pulse',
        extractCss: true,
        less: { loadPaths: [] }
      }
    });

    await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // LESS should be compiled
    const addedAssets = mock.getAddedAssets();
    assert.strictEqual(addedAssets.length, 1, 'Should add CSS asset');

    const cssContent = addedAssets[0].content;
    assert.ok(cssContent, 'CSS content should exist');
    assert.ok(cssContent.includes('.button'), 'Should include button class');
    assert.ok(
      cssContent.includes('#646cff') || cssContent.includes('opacity'),
      'Should include compiled CSS values'
    );
    assert.ok(!cssContent.includes('@primary:'), 'Should not contain LESS variable syntax');
  });

  test('transformer supports Stylus preprocessing', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const { isStylusAvailable } = await import('../compiler/preprocessor.js');

    if (!isStylusAvailable()) {
      t.skip('Stylus not available, skipping test');
      return;
    }

    const source = `
@page StylusTest

style {
  primary = #646cff
  .button
    background primary
    &:hover
      opacity 0.8
}

view {
  .button { button "Click me" }
}
`;

    const mock = createMockAsset({
      source,
      config: {
        filePath: '/test/StylusTest.pulse',
        extractCss: true,
        stylus: { loadPaths: [] }
      }
    });

    await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // Stylus should be compiled
    const addedAssets = mock.getAddedAssets();
    assert.strictEqual(addedAssets.length, 1, 'Should add CSS asset');

    const cssContent = addedAssets[0].content;
    assert.ok(cssContent, 'CSS content should exist');
    assert.ok(cssContent.includes('.button'), 'Should include button class');
    assert.ok(
      cssContent.includes('#646cff') || cssContent.includes('opacity'),
      'Should include compiled CSS values'
    );
    assert.ok(!cssContent.includes('primary ='), 'Should not contain Stylus variable syntax');
  });

  test('transformer handles preprocessor errors gracefully', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const { isSassAvailable } = await import('../compiler/preprocessor.js');

    if (!isSassAvailable()) {
      t.skip('SASS not available, skipping preprocessor error test');
      return;
    }

    const source = `
@page ErrorTest

style {
  $invalid-sass: ; // Invalid SASS
  .test { color: $undefined; }
}

view {
  .test { h1 "Test" }
}
`;

    const warnings = [];
    const mock = createMockAsset({
      source,
      config: {
        filePath: '/test/ErrorTest.pulse',
        extractCss: true,
        sass: {}
      }
    });

    // Override logger to capture warnings
    const customLogger = {
      ...mock.logger,
      warn(data) {
        warnings.push(data);
      }
    };

    await plugin.default.transform({
      asset: mock.asset,
      logger: customLogger
    });

    // Should emit warning but not throw error
    assert.ok(warnings.length > 0, 'Should emit warnings for invalid SASS');

    // Should still produce code even with preprocessor error
    const transformedCode = mock.getTransformedCode();
    assert.ok(transformedCode, 'Should still transform despite preprocessor error');
  });

  test('transformer processes files with source map config', async () => {
    const plugin = await import('../loader/parcel-plugin.js');
    const source = `
@page MapTest

state {
  value: 0
}

view {
  .test {
    h1 "Count: {value}"
    button @click(value++) "Increment"
  }
}
`;

    const mock = createMockAsset({
      source,
      config: {
        filePath: '/test/MapTest.pulse',
        sourceMap: true,
        extractCss: false
      }
    });

    const result = await plugin.default.transform({
      asset: mock.asset,
      logger: mock.logger
    });

    // Should process successfully
    assert.ok(result, 'Should return result');
    assert.ok(Array.isArray(result), 'Result should be array');

    // Should generate code
    const transformedCode = mock.getTransformedCode();
    assert.ok(transformedCode, 'Should generate transformed code');
    assert.ok(transformedCode.includes('pulse('), 'Should include pulse import');
    assert.ok(transformedCode.includes('value'), 'Should include state variable');

    // Source map is optional - if present, validate structure
    const sourceMap = mock.getTransformedMap();
    if (sourceMap) {
      assert.ok(
        sourceMap.mappings || sourceMap.sources,
        'If source map exists, should have mappings or sources'
      );
    }
  });
});
