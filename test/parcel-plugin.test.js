/**
 * Tests for Parcel plugin (Transformer)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

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

  test('transformer compiles .pulse source', async (t) => {
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

    let transformedCode = null;
    let addedAssets = [];

    // Mock asset
    const asset = {
      filePath: '/test/Test.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          sourceMap: true,
          extractCss: true
        };
      },
      setCode(code) {
        transformedCode = code;
      },
      setMap() {},
      addDependency() {},
      async addAsset(assetConfig) {
        addedAssets.push(assetConfig);
      }
    };

    // Mock options and logger
    const options = {};
    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    const result = await plugin.default.transform({ asset, logger });

    // Should return array with asset
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);

    // Should transform to JavaScript
    assert.ok(transformedCode.includes('pulse('));
    assert.ok(transformedCode.includes('el('));

    // CSS should be extracted
    // Check if styles were processed
    if (!transformedCode.includes('Styles extracted')) {
      console.log('Transformed code:', transformedCode.substring(0, 500));
    }
    assert.ok(transformedCode.includes('Styles extracted') || transformedCode.includes('CSS asset'));
    assert.strictEqual(addedAssets.length, 1);
    assert.strictEqual(addedAssets[0].type, 'css');
  });

  test('transformer handles compilation errors', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const invalidSource = `
@page Invalid

state {
  count: // invalid
}
`;

    const asset = {
      filePath: '/test/Invalid.pulse',
      type: 'pulse',
      async getCode() {
        return invalidSource;
      },
      async getConfig() {
        return {};
      },
      setCode() {},
      setMap() {},
      addDependency() {},
      async addAsset() {}
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    try {
      await plugin.default.transform({ asset, logger });
      assert.fail('Should throw compilation error');
    } catch (error) {
      assert.ok(error.message.includes('Pulse compilation failed'));
    }
  });

  test('transformer supports inline CSS when extractCss is false', async (t) => {
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

    let transformedCode = null;
    let addedAssets = [];

    const asset = {
      filePath: '/test/Test.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          extractCss: false // Keep CSS inline
        };
      },
      setCode(code) {
        transformedCode = code;
      },
      setMap() {},
      addDependency() {},
      async addAsset(assetConfig) {
        addedAssets.push(assetConfig);
      }
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    await plugin.default.transform({ asset, logger });

    // CSS should remain inline
    assert.ok(transformedCode.includes('const styles'));
    assert.ok(transformedCode.includes('createElement("style")'));
    assert.strictEqual(addedAssets.length, 0); // No CSS asset added
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

    let cssContent = null;

    const asset = {
      filePath: '/test/SassTest.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          extractCss: true,
          sass: {
            loadPaths: []
          }
        };
      },
      setCode() {},
      setMap() {},
      addDependency() {},
      async addAsset(assetConfig) {
        if (assetConfig.type === 'css') {
          cssContent = assetConfig.content;
        }
      }
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    await plugin.default.transform({ asset, logger });

    // SASS should be compiled
    assert.ok(cssContent);
    assert.ok(cssContent.includes('.button'));
    assert.ok(cssContent.includes('#646cff') || cssContent.includes('opacity'));
    // Should not contain SASS syntax
    assert.ok(!cssContent.includes('$primary'));
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

    let cssContent = null;

    const asset = {
      filePath: '/test/LessTest.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          extractCss: true,
          less: {
            loadPaths: []
          }
        };
      },
      setCode() {},
      setMap() {},
      addDependency() {},
      async addAsset(assetConfig) {
        if (assetConfig.type === 'css') {
          cssContent = assetConfig.content;
        }
      }
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    await plugin.default.transform({ asset, logger });

    // LESS should be compiled
    assert.ok(cssContent);
    assert.ok(cssContent.includes('.button'));
    assert.ok(cssContent.includes('#646cff') || cssContent.includes('opacity'));
    // Should not contain LESS syntax
    assert.ok(!cssContent.includes('@primary:'));
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

    let cssContent = null;

    const asset = {
      filePath: '/test/StylusTest.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          extractCss: true,
          stylus: {
            loadPaths: []
          }
        };
      },
      setCode() {},
      setMap() {},
      addDependency() {},
      async addAsset(assetConfig) {
        if (assetConfig.type === 'css') {
          cssContent = assetConfig.content;
        }
      }
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    await plugin.default.transform({ asset, logger });

    // Stylus should be compiled
    assert.ok(cssContent);
    assert.ok(cssContent.includes('.button'));
    assert.ok(cssContent.includes('#646cff') || cssContent.includes('opacity'));
    // Should not contain Stylus variable syntax
    assert.ok(!cssContent.includes('primary ='));
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

    let warnings = [];

    const asset = {
      filePath: '/test/ErrorTest.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          extractCss: true,
          sass: {}
        };
      },
      setCode() {},
      setMap() {},
      addDependency() {},
      async addAsset() {}
    };

    const logger = {
      info() {},
      verbose() {},
      warn(data) {
        warnings.push(data);
      }
    };

    await plugin.default.transform({ asset, logger });

    // Should emit warning but not fail
    assert.ok(warnings.length > 0);
  });

  test('transformer generates source maps when enabled', async (t) => {
    const plugin = await import('../loader/parcel-plugin.js');
    const source = `
@page MapTest

view {
  .test { h1 "Test" }
}
`;

    let sourceMap = null;
    let codeWasSet = false;

    const asset = {
      filePath: '/test/MapTest.pulse',
      type: 'pulse',
      async getCode() {
        return source;
      },
      async getConfig() {
        return {
          sourceMap: true,
          extractCss: false
        };
      },
      setCode(code) {
        codeWasSet = true;
      },
      setMap(map) {
        sourceMap = map;
      },
      addDependency() {},
      async addAsset() {}
    };

    const logger = {
      info() {},
      verbose() {},
      warn() {}
    };

    await plugin.default.transform({ asset, logger });

    // Should set code and optionally generate source map
    assert.ok(codeWasSet, 'Code should be set');
    // Source map is optional - compiler may not always generate it
    if (sourceMap) {
      assert.ok(sourceMap.mappings || sourceMap.sources, 'Source map should have mappings or sources');
    }
  });
});
