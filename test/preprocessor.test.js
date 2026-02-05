/**
 * Tests for SASS/SCSS preprocessor support
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  hasSassSyntax,
  preprocessStylesSync,
  isSassAvailable,
  getSassVersion,
  resetSassCache
} from '../compiler/preprocessor.js';

describe('SASS Preprocessor', () => {
  // Reset cache before each test
  test.beforeEach(() => {
    resetSassCache();
  });

  describe('hasSassSyntax', () => {
    test('detects SASS variables', () => {
      assert.strictEqual(hasSassSyntax('$primary: #333;'), true);
      assert.strictEqual(hasSassSyntax('$font-size: 16px;'), true);
    });

    test('detects @mixin', () => {
      assert.strictEqual(hasSassSyntax('@mixin button-style { }'), true);
      assert.strictEqual(hasSassSyntax('@mixin flex-center { display: flex; }'), true);
    });

    test('detects @include', () => {
      assert.strictEqual(hasSassSyntax('@include button-style;'), true);
      assert.strictEqual(hasSassSyntax('.btn { @include flex-center; }'), true);
    });

    test('detects @extend', () => {
      assert.strictEqual(hasSassSyntax('@extend .base-class;'), true);
      assert.strictEqual(hasSassSyntax('@extend %placeholder;'), true);
    });

    test('detects @function', () => {
      assert.strictEqual(hasSassSyntax('@function calculate($n) { @return $n * 2; }'), true);
    });

    test('detects @use and @forward', () => {
      assert.strictEqual(hasSassSyntax("@use 'colors';"), true);
      assert.strictEqual(hasSassSyntax("@forward 'mixins';"), true);
    });

    test('detects placeholder selectors', () => {
      assert.strictEqual(hasSassSyntax('%button { padding: 10px; }'), true);
    });

    test('detects interpolation', () => {
      assert.strictEqual(hasSassSyntax('.icon-#{$name} { }'), true);
    });

    test('detects control directives', () => {
      assert.strictEqual(hasSassSyntax('@if $dark { }'), true);
      assert.strictEqual(hasSassSyntax('@else { }'), true);
      assert.strictEqual(hasSassSyntax('@for $i from 1 through 3 { }'), true);
      assert.strictEqual(hasSassSyntax('@each $color in $colors { }'), true);
      assert.strictEqual(hasSassSyntax('@while $i > 0 { }'), true);
    });

    test('detects debug/warn/error', () => {
      assert.strictEqual(hasSassSyntax('@debug $value;'), true);
      assert.strictEqual(hasSassSyntax('@warn "message";'), true);
      assert.strictEqual(hasSassSyntax('@error "error";'), true);
    });

    test('returns false for plain CSS', () => {
      assert.strictEqual(hasSassSyntax('.button { color: red; }'), false);
      assert.strictEqual(hasSassSyntax('@media (max-width: 768px) { }'), false);
      assert.strictEqual(hasSassSyntax('@keyframes fade { }'), false);
      assert.strictEqual(hasSassSyntax(':root { --primary: blue; }'), false);
    });

    test('returns false for CSS nesting (supported natively)', () => {
      assert.strictEqual(hasSassSyntax('.parent { .child { color: red; } }'), false);
      assert.strictEqual(hasSassSyntax('.btn { &:hover { opacity: 0.8; } }'), false);
    });
  });

  describe('preprocessStylesSync', () => {
    test('returns unchanged CSS when no SASS syntax detected', () => {
      const css = '.button { color: red; }';
      const result = preprocessStylesSync(css);

      assert.strictEqual(result.css, css);
      assert.strictEqual(result.wasSass, false);
    });

    test('returns unchanged CSS when SASS detected but sass not available', () => {
      // This test may pass or compile depending on whether sass is installed
      const scss = '$color: red; .button { color: $color; }';
      const result = preprocessStylesSync(scss);

      // Either sass compiled it or returned original
      assert.ok(result.css);
      if (result.wasSass) {
        // SASS was compiled - check output is valid CSS
        assert.ok(result.css.includes('color:'));
        assert.ok(!result.css.includes('$color'));
      } else {
        // SASS not available - original returned
        assert.strictEqual(result.css, scss);
      }
    });

    test('respects forceCompile option', () => {
      const css = '.button { color: red; }';
      const result = preprocessStylesSync(css, { forceCompile: true });

      // If sass is available, it will compile (and return same CSS since no SASS syntax)
      // If not, wasSass will be false
      assert.ok(result.css);
    });
  });

  describe('isSassAvailable', () => {
    test('returns boolean', () => {
      const available = isSassAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });
  });

  describe('getSassVersion', () => {
    test('returns string or null', () => {
      const version = getSassVersion();
      assert.ok(version === null || typeof version === 'string');

      if (version) {
        // Version should match semver pattern
        assert.ok(/^\d+\.\d+\.\d+/.test(version), `Version "${version}" should be semver`);
      }
    });
  });
});

describe('SASS Integration', () => {
  test('compiles SASS variables when sass is available', () => {
    const scss = `
      $primary-color: #646cff;
      $padding: 20px;

      .button {
        background: $primary-color;
        padding: $padding;
      }
    `;

    const result = preprocessStylesSync(scss);

    if (result.wasSass) {
      // SASS compiled successfully
      assert.ok(result.css.includes('#646cff') || result.css.includes('646cff'));
      assert.ok(result.css.includes('20px'));
      assert.ok(!result.css.includes('$primary-color'));
      assert.ok(!result.css.includes('$padding'));
    }
  });

  test('compiles SASS nesting when sass is available', () => {
    const scss = `
      .card {
        padding: 20px;

        .title {
          font-size: 24px;
        }

        &:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      }
    `;

    const result = preprocessStylesSync(scss);

    if (result.wasSass) {
      // Check that nesting was flattened
      assert.ok(result.css.includes('.card'));
      assert.ok(result.css.includes('.card .title') || result.css.includes('.card  .title'));
      assert.ok(result.css.includes('.card:hover'));
    }
  });

  test('compiles mixins when sass is available', () => {
    const scss = `
      @mixin flex-center {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .container {
        @include flex-center;
        height: 100vh;
      }
    `;

    const result = preprocessStylesSync(scss);

    if (result.wasSass) {
      assert.ok(result.css.includes('display: flex') || result.css.includes('display:flex'));
      assert.ok(result.css.includes('align-items: center') || result.css.includes('align-items:center'));
      assert.ok(!result.css.includes('@mixin'));
      assert.ok(!result.css.includes('@include'));
    }
  });

  test('handles SASS errors gracefully', () => {
    const invalidScss = `
      $color: red
      .button { color: $undefined-var; }
    `;

    // Should not throw, but may return original or throw SASS error
    try {
      const result = preprocessStylesSync(invalidScss);
      // If no error, sass might not be available
      assert.ok(result.css);
    } catch (error) {
      // SASS error is expected for invalid syntax
      assert.ok(error.message.includes('SASS') || error.message.includes('sass'));
    }
  });
});
