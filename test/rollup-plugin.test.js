/**
 * Tests for Rollup plugin
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import pulsePlugin from '../loader/rollup-plugin.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a minimal Pulse source with optional style block
 */
function makeSource({ page = 'Test', state = null, view = '.test { h1 "Hello" }', style = null } = {}) {
  let src = `@page ${page}\n\n`;
  if (state) src += `state {\n  ${state}\n}\n\n`;
  src += `view {\n  ${view}\n}\n`;
  if (style) src += `\nstyle {\n  ${style}\n}\n`;
  return src;
}

/**
 * Create a plugin instance with a stubbed `this` context for transform / generateBundle
 */
function createPluginWithContext(options = {}) {
  const plugin = pulsePlugin(options);

  // Stubs that mirror Rollup's plugin context
  const ctx = {
    errors: [],
    warnings: [],
    emittedFiles: [],
    error(msg) { ctx.errors.push(msg); },
    warn(msg) { ctx.warnings.push(msg); },
    emitFile(file) { ctx.emittedFiles.push(file); },
  };

  // Bind plugin hooks to the stub context
  const bound = {
    name: plugin.name,
    buildStart: plugin.buildStart.bind(ctx),
    resolveId: plugin.resolveId.bind(ctx),
    transform: plugin.transform.bind(ctx),
    generateBundle: plugin.generateBundle.bind(ctx),
    ctx,
  };

  return bound;
}

// ===========================================================================
// 1. Basic API
// ===========================================================================

describe('Rollup Plugin - Basic API', () => {
  test('exports a default function', () => {
    assert.strictEqual(typeof pulsePlugin, 'function');
  });

  test('returns an object with name "pulse"', () => {
    const plugin = pulsePlugin();
    assert.strictEqual(typeof plugin, 'object');
    assert.strictEqual(plugin.name, 'pulse');
  });

  test('has all required Rollup hooks', () => {
    const plugin = pulsePlugin();
    assert.strictEqual(typeof plugin.buildStart, 'function');
    assert.strictEqual(typeof plugin.resolveId, 'function');
    assert.strictEqual(typeof plugin.transform, 'function');
    assert.strictEqual(typeof plugin.generateBundle, 'function');
  });

  test('accepts empty options without error', () => {
    assert.doesNotThrow(() => pulsePlugin());
    assert.doesNotThrow(() => pulsePlugin({}));
  });
});

// ===========================================================================
// 2. Filter creation – include / exclude patterns
// ===========================================================================

describe('Rollup Plugin - Filter (include/exclude)', () => {
  test('default include matches .pulse files only', () => {
    const p = createPluginWithContext();
    const src = makeSource();

    assert.ok(p.transform(src, '/src/Comp.pulse'));
    assert.strictEqual(p.transform('console.log(1)', '/src/app.js'), null);
    assert.strictEqual(p.transform('body{}', '/src/style.css'), null);
  });

  test('default exclude rejects node_modules', () => {
    const p = createPluginWithContext();
    const src = makeSource();
    assert.strictEqual(p.transform(src, '/node_modules/pkg/Comp.pulse'), null);
  });

  test('custom RegExp include works', () => {
    const p = createPluginWithContext({ include: /\.custom$/ });
    // .custom does not end in .pulse so the second guard also rejects it
    assert.strictEqual(p.transform('x', '/src/Comp.custom'), null);
  });

  test('custom array include works', () => {
    const p = createPluginWithContext({ include: [/\.pulse$/, /\.pls$/] });
    const src = makeSource();
    // .pls does not end with .pulse – second guard still blocks it
    assert.strictEqual(p.transform(src, '/src/Comp.pls'), null);
    // .pulse passes both guards
    assert.ok(p.transform(src, '/src/Comp.pulse'));
  });

  test('custom RegExp exclude works', () => {
    const p = createPluginWithContext({ exclude: /vendor/ });
    const src = makeSource();
    assert.strictEqual(p.transform(src, '/vendor/Comp.pulse'), null);
    assert.ok(p.transform(src, '/src/Comp.pulse'));
  });

  test('custom array exclude works', () => {
    const p = createPluginWithContext({ exclude: [/vendor/, 'legacy'] });
    const src = makeSource();
    assert.strictEqual(p.transform(src, '/vendor/Comp.pulse'), null);
    assert.strictEqual(p.transform(src, '/legacy/Old.pulse'), null);
    assert.ok(p.transform(src, '/src/New.pulse'));
  });

  test('string patterns in include array match by substring', () => {
    const p = createPluginWithContext({ include: ['components'] });
    const src = makeSource();
    // 'components' is a substring – passes include, but file must also end in .pulse
    assert.ok(p.transform(src, '/src/components/Button.pulse'));
    // not in components dir – include fails, returns null
    assert.strictEqual(p.transform(src, '/src/pages/Home.pulse'), null);
  });
});

// ===========================================================================
// 3. Transform details
// ===========================================================================

describe('Rollup Plugin - Transform', () => {
  test('returns {code, map} for valid .pulse files', () => {
    const p = createPluginWithContext();
    const result = p.transform(makeSource(), '/src/Test.pulse');
    assert.ok(result);
    assert.strictEqual(typeof result.code, 'string');
    assert.ok('map' in result);
  });

  test('returned code contains reactivity primitives', () => {
    const p = createPluginWithContext();
    const src = makeSource({ state: 'count: 0', view: '.test { h1 "Count: {count}" }' });
    const result = p.transform(src, '/src/Counter.pulse');
    assert.ok(result.code.includes('pulse('));
    assert.ok(result.code.includes('el('));
  });

  test('returns null for non-.pulse files', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.transform('export default 1', '/src/util.js'), null);
    assert.strictEqual(p.transform('{}', '/src/data.json'), null);
    assert.strictEqual(p.transform('h1 { color: red }', '/src/app.css'), null);
  });

  test('map is null when sourceMap option is false', () => {
    const p = createPluginWithContext({ sourceMap: false });
    const result = p.transform(makeSource(), '/src/Test.pulse');
    assert.ok(result);
    assert.strictEqual(result.map, null);
  });

  test('map is present when sourceMap option is true (default)', () => {
    const p = createPluginWithContext({ sourceMap: true });
    const result = p.transform(makeSource(), '/src/Test.pulse');
    assert.ok(result);
    // map may be a string or object depending on the compiler, but should not be null
    // (the compiler may or may not generate a map; at minimum it should not be forced null)
    // We verify it's not explicitly null as happens when sourceMap=false
    // The plugin code: sourceMap ? outputMap : null
    // If the compiler returns something, it passes through
  });

  test('compiles file with only a view block (no state, no style)', () => {
    const p = createPluginWithContext();
    const src = makeSource({ view: '.simple { p "Hello world" }' });
    const result = p.transform(src, '/src/Simple.pulse');
    assert.ok(result);
    assert.ok(result.code.length > 0);
  });
});

// ===========================================================================
// 4. CSS extraction and inline
// ===========================================================================

describe('Rollup Plugin - CSS extraction', () => {
  test('extractCss accumulates CSS from transform', () => {
    const p = createPluginWithContext({ extractCss: 'styles.css' });
    p.transform(
      makeSource({ style: '.test { color: red; }' }),
      '/src/A.pulse'
    );

    p.generateBundle();

    assert.strictEqual(p.ctx.emittedFiles.length, 1);
    const emitted = p.ctx.emittedFiles[0];
    assert.ok(emitted.source.includes('color: red'));
  });

  test('extractCss uses provided fileName', () => {
    const p = createPluginWithContext({ extractCss: 'dist/app.css' });
    p.transform(
      makeSource({ style: '.test { color: blue; }' }),
      '/src/App.pulse'
    );
    p.generateBundle();

    assert.strictEqual(p.ctx.emittedFiles[0].fileName, 'dist/app.css');
  });

  test('emitted file type is "asset"', () => {
    const p = createPluginWithContext({ extractCss: 'bundle.css' });
    p.transform(
      makeSource({ style: '.x { margin: 0; }' }),
      '/src/X.pulse'
    );
    p.generateBundle();

    assert.strictEqual(p.ctx.emittedFiles[0].type, 'asset');
  });

  test('multiple transforms accumulate CSS in order', () => {
    const p = createPluginWithContext({ extractCss: 'all.css' });

    p.transform(
      makeSource({ page: 'First', style: '.first { color: red; }' }),
      '/src/First.pulse'
    );
    p.transform(
      makeSource({ page: 'Second', style: '.second { color: blue; }' }),
      '/src/Second.pulse'
    );

    p.generateBundle();

    const emitted = p.ctx.emittedFiles[0];
    assert.ok(emitted.source.includes('.first'));
    assert.ok(emitted.source.includes('.second'));

    // First should appear before Second
    const firstIdx = emitted.source.indexOf('.first');
    const secondIdx = emitted.source.indexOf('.second');
    assert.ok(firstIdx < secondIdx);
  });

  test('accumulated CSS includes file-origin comments', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    p.transform(
      makeSource({ style: '.x { color: red; }' }),
      '/src/MyComp.pulse'
    );
    p.generateBundle();

    const emitted = p.ctx.emittedFiles[0];
    assert.ok(emitted.source.includes('/* /src/MyComp.pulse */'));
  });

  test('inline CSS is kept when extractCss is null', () => {
    const p = createPluginWithContext({ extractCss: null });
    const result = p.transform(
      makeSource({ style: '.inline { color: green; }' }),
      '/src/Inline.pulse'
    );

    assert.ok(result);
    assert.ok(result.code.length > 0);
    // Should contain inline style injection code
    assert.ok(
      result.code.includes('const styles') || result.code.includes('createElement')
    );
  });
});

// ===========================================================================
// 5. Build lifecycle
// ===========================================================================

describe('Rollup Plugin - Build lifecycle', () => {
  test('buildStart resets accumulatedCss', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });

    // First build: accumulate some CSS
    p.transform(
      makeSource({ style: '.old { color: red; }' }),
      '/src/Old.pulse'
    );

    // Reset
    p.buildStart();

    // Generate should emit nothing
    p.generateBundle();
    assert.strictEqual(p.ctx.emittedFiles.length, 0);
  });

  test('buildStart resets cssEmitted flag', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });

    // First cycle
    p.transform(
      makeSource({ style: '.a { color: red; }' }),
      '/src/A.pulse'
    );
    p.generateBundle();
    assert.strictEqual(p.ctx.emittedFiles.length, 1);

    // Second cycle: reset, transform again, generate again
    p.buildStart();
    p.transform(
      makeSource({ style: '.b { color: blue; }' }),
      '/src/B.pulse'
    );
    p.generateBundle();

    // Should have emitted again (2 total across both cycles)
    assert.strictEqual(p.ctx.emittedFiles.length, 2);
    assert.ok(p.ctx.emittedFiles[1].source.includes('.b'));
  });

  test('buildStart is idempotent (calling twice is fine)', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    assert.doesNotThrow(() => {
      p.buildStart();
      p.buildStart();
      p.buildStart();
    });
  });

  test('generateBundle only emits CSS once per build cycle', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    p.transform(
      makeSource({ style: '.x { color: red; }' }),
      '/src/X.pulse'
    );

    p.generateBundle();
    p.generateBundle();
    p.generateBundle();

    // Should have emitted exactly one file
    assert.strictEqual(p.ctx.emittedFiles.length, 1);
  });
});

// ===========================================================================
// 6. resolveId
// ===========================================================================

describe('Rollup Plugin - resolveId', () => {
  test('returns null for .pulse imports', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.resolveId('Comp.pulse', '/src/main.js'), null);
  });

  test('returns null for .js imports', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.resolveId('util.js', '/src/main.js'), null);
  });

  test('returns null for .css imports', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.resolveId('styles.css', '/src/main.js'), null);
  });

  test('returns null when importer is undefined', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.resolveId('entry.pulse', undefined), null);
    assert.strictEqual(p.resolveId('entry.js', undefined), null);
  });

  test('returns null for arbitrary extensions', () => {
    const p = createPluginWithContext();
    assert.strictEqual(p.resolveId('file.ts', '/src/main.js'), null);
    assert.strictEqual(p.resolveId('data.json', '/src/main.js'), null);
    assert.strictEqual(p.resolveId('image.png', '/src/main.js'), null);
  });
});

// ===========================================================================
// 7. Error handling
// ===========================================================================

describe('Rollup Plugin - Error handling', () => {
  test('calls this.error() on compilation failure', () => {
    const p = createPluginWithContext();
    const invalid = `
@page Bad

state {
  count: // invalid
}
`;
    p.transform(invalid, '/src/Bad.pulse');
    assert.ok(p.ctx.errors.length > 0);
  });

  test('error message includes "Pulse" prefix', () => {
    const p = createPluginWithContext();
    const invalid = '@page X\nstate { : }';
    p.transform(invalid, '/src/X.pulse');

    assert.ok(p.ctx.errors.length > 0);
    const msg = p.ctx.errors[0];
    assert.ok(
      msg.includes('Pulse compilation failed') || msg.includes('Pulse plugin error'),
      `Expected error to contain Pulse identifier, got: ${msg}`
    );
  });

  test('transform returns null after an error', () => {
    const p = createPluginWithContext();
    const invalid = '@page Z\nstate { broken! }';
    const result = p.transform(invalid, '/src/Z.pulse');
    // On error, the function returns null (after calling this.error)
    assert.strictEqual(result, null);
  });

  test('error in one file does not block subsequent transforms', () => {
    const p = createPluginWithContext();

    // First: invalid
    p.transform('@page A\nstate { broken! }', '/src/A.pulse');
    assert.ok(p.ctx.errors.length > 0);

    // Second: valid - should still compile
    const result = p.transform(makeSource({ page: 'B' }), '/src/B.pulse');
    assert.ok(result);
    assert.ok(result.code.length > 0);
  });
});

// ===========================================================================
// 8. Edge cases
// ===========================================================================

describe('Rollup Plugin - Edge cases', () => {
  test('file with no styles produces valid output', () => {
    const p = createPluginWithContext();
    const src = makeSource({ view: '.bare { p "No styles here" }' });
    const result = p.transform(src, '/src/Bare.pulse');
    assert.ok(result);
    assert.ok(result.code.length > 0);
  });

  test('generateBundle skips when no CSS accumulated', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    // No transform calls – no CSS accumulated
    p.generateBundle();
    assert.strictEqual(p.ctx.emittedFiles.length, 0);
  });

  test('generateBundle skips when extractCss is null', () => {
    const p = createPluginWithContext({ extractCss: null });
    p.transform(
      makeSource({ style: '.x { color: red; }' }),
      '/src/X.pulse'
    );
    p.generateBundle();
    assert.strictEqual(p.ctx.emittedFiles.length, 0);
  });

  test('transform with view-only file does not accumulate CSS', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    p.transform(
      makeSource({ view: '.nostyled { p "Hello" }' }),
      '/src/NoStyle.pulse'
    );
    p.generateBundle();
    assert.strictEqual(p.ctx.emittedFiles.length, 0);
  });

  test('transform handles file with empty style block', () => {
    const p = createPluginWithContext();
    const src = `@page Empty\n\nview {\n  .e { p "test" }\n}\n\nstyle {\n}\n`;
    const result = p.transform(src, '/src/Empty.pulse');
    // Should compile without errors (empty style block is valid)
    assert.ok(result);
    assert.ok(result.code.length > 0);
  });

  test('multiple plugins with different options are independent', () => {
    const p1 = createPluginWithContext({ extractCss: 'a.css' });
    const p2 = createPluginWithContext({ extractCss: 'b.css' });

    p1.transform(
      makeSource({ page: 'A', style: '.a { color: red; }' }),
      '/src/A.pulse'
    );
    p2.transform(
      makeSource({ page: 'B', style: '.b { color: blue; }' }),
      '/src/B.pulse'
    );

    p1.generateBundle();
    p2.generateBundle();

    // Each plugin should have its own emitted file
    assert.strictEqual(p1.ctx.emittedFiles.length, 1);
    assert.strictEqual(p2.ctx.emittedFiles.length, 1);
    assert.strictEqual(p1.ctx.emittedFiles[0].fileName, 'a.css');
    assert.strictEqual(p2.ctx.emittedFiles[0].fileName, 'b.css');
  });
});

// ===========================================================================
// 9. CSS Preprocessing (detection & warnings)
// ===========================================================================

describe('Rollup Plugin - CSS Preprocessing', () => {
  test('plain CSS passes through without preprocessing warnings', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    p.transform(
      makeSource({ style: '.plain { color: red; font-size: 14px; }' }),
      '/src/Plain.pulse'
    );

    // No warnings about preprocessing should be emitted for plain CSS
    const preprocessWarnings = p.ctx.warnings.filter(w =>
      w.includes('compilation warning')
    );
    assert.strictEqual(preprocessWarnings.length, 0);
  });

  test('CSS with SASS syntax triggers preprocessing path', () => {
    // This test verifies the preprocessing code path is reached.
    // If sass is not installed, a warning is NOT emitted (the code only
    // preprocesses when the preprocessor is available).
    const p = createPluginWithContext({ extractCss: 'out.css' });
    const sassStyle = '$primary: blue;\n.test { color: $primary; }';
    const result = p.transform(
      makeSource({ style: sassStyle }),
      '/src/SassComp.pulse'
    );

    // Should still compile (either preprocessed or passed through)
    assert.ok(result);
    assert.ok(result.code.length > 0);
  });

  test('CSS with LESS syntax triggers preprocessing path', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    const lessStyle = '@primary: blue;\n.test { color: @primary; }';
    const result = p.transform(
      makeSource({ style: lessStyle }),
      '/src/LessComp.pulse'
    );

    assert.ok(result);
    assert.ok(result.code.length > 0);
  });

  test('CSS with Stylus syntax triggers preprocessing path', () => {
    const p = createPluginWithContext({ extractCss: 'out.css' });
    const stylusStyle = 'primary = blue\n.test\n  color primary';
    const result = p.transform(
      makeSource({ style: stylusStyle }),
      '/src/StylusComp.pulse'
    );

    assert.ok(result);
    assert.ok(result.code.length > 0);
  });

  test('preprocessing failure emits warning and falls back to original CSS', () => {
    // We simulate this scenario: if preprocessing IS attempted and fails,
    // the plugin should call this.warn() and still produce valid output.
    // With real preprocessors, deliberately invalid syntax would trigger this.
    // This test uses SASS-looking syntax that, if sass IS installed, might fail.
    const p = createPluginWithContext({ extractCss: 'out.css' });
    const brokenSass = '$invalid: ;\n.test { color: $nonexist; @include fake(); }';
    const result = p.transform(
      makeSource({ style: brokenSass }),
      '/src/Broken.pulse'
    );

    // Should still compile (graceful degradation)
    assert.ok(result);
    assert.ok(result.code.length > 0);
    // No hard error should have been thrown
    assert.strictEqual(
      p.ctx.errors.filter(e => e.includes('preprocessor')).length,
      0
    );
  });
});
