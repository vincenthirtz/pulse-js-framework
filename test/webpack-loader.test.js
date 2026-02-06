/**
 * Tests for Webpack loader
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import pulseLoader from '../loader/webpack-loader.js';

describe('Webpack Loader', () => {
  test('exports default function', () => {
    assert.strictEqual(typeof pulseLoader, 'function');
  });

  test('has pitch function', async () => {
    const { pitch } = await import('../loader/webpack-loader.js');
    assert.strictEqual(typeof pitch, 'function');
  });

  test('loader transforms .pulse source', (t, done) => {
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

    // Mock loader context
    const context = {
      async: () => (error, code, map) => {
        if (error) {
          done(error);
          return;
        }

        try {
          // Should transform to JavaScript
          assert.ok(code.includes('pulse('));
          assert.ok(code.includes('el('));

          // CSS should be extracted (default behavior)
          assert.ok(code.includes('import "./') || code.includes('const styles'));

          done();
        } catch (err) {
          done(err);
        }
      },
      resourcePath: '/test/Test.pulse',
      cacheable: () => {},
      getOptions: () => ({
        sourceMap: true,
        extractCss: true
      })
    };

    pulseLoader.call(context, source);
  });

  test('loader handles compilation errors', (t, done) => {
    const invalidSource = `
@page Invalid

state {
  count: // invalid
}
`;

    const context = {
      async: () => (error) => {
        try {
          assert.ok(error);
          assert.ok(error.message.includes('Pulse compilation failed'));
          done();
        } catch (err) {
          done(err);
        }
      },
      resourcePath: '/test/Invalid.pulse',
      cacheable: () => {},
      getOptions: () => ({})
    };

    pulseLoader.call(context, invalidSource);
  });

  test('loader supports inline CSS when extractCss is false', (t, done) => {
    const source = `
@page Test

view {
  .test { h1 "Test" }
}

style {
  .test { color: blue; }
}
`;

    const context = {
      async: () => (error, code) => {
        if (error) {
          done(error);
          return;
        }

        try {
          // Should keep inline CSS injection
          assert.ok(code.includes('const styles'));
          assert.ok(code.includes('createElement("style")') || code.includes('createElement(\'style\')'));
          done();
        } catch (err) {
          done(err);
        }
      },
      resourcePath: '/test/Test.pulse',
      cacheable: () => {},
      getOptions: () => ({
        extractCss: false // Keep CSS inline
      })
    };

    pulseLoader.call(context, source);
  });

  test('loader adds HMR code when hot is true', (t, done) => {
    const source = `
@page Test

view {
  .test { h1 "Test" }
}
`;

    const context = {
      async: () => (error, code) => {
        if (error) {
          done(error);
          return;
        }

        try {
          // Should include HMR code
          assert.ok(code.includes('module.hot'));
          done();
        } catch (err) {
          done(err);
        }
      },
      resourcePath: '/test/Test.pulse',
      cacheable: () => {},
      getOptions: () => ({ hmr: true }),
      hot: true
    };

    pulseLoader.call(context, source);
  });

  test('loader passes code successfully', (_t, done) => {
    const source = `
@page Test

view {
  .test { h1 "Test" }
}
`;

    const context = {
      async: () => (error, code) => {
        if (error) {
          done(error);
          return;
        }

        try {
          // Should return transformed code
          assert.ok(code);
          assert.ok(code.length > 0);
          // Map can be null/undefined if compile doesn't generate one
          done();
        } catch (err) {
          done(err);
        }
      },
      resourcePath: '/test/Test.pulse',
      cacheable: () => {},
      getOptions: () => ({ sourceMap: true })
    };

    pulseLoader.call(context, source);
  });
});
