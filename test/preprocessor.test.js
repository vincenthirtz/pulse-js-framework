/**
 * Tests for CSS preprocessor support (SASS/SCSS and LESS)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  // SASS
  hasSassSyntax,
  isSassAvailable,
  getSassVersion,
  resetSassCache,
  // LESS
  hasLessSyntax,
  isLessAvailable,
  getLessVersion,
  resetLessCache,
  // Stylus
  hasStylusSyntax,
  isStylusAvailable,
  getStylusVersion,
  resetStylusCache,
  // Auto-detect
  detectPreprocessor,
  preprocessStylesSync,
  preprocessStyles,
  resetPreprocessorCaches
} from '../compiler/preprocessor.js';

describe('CSS Preprocessor - SASS', () => {
  // Reset cache before each test
  test.beforeEach(() => {
    resetPreprocessorCaches();
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

  describe('preprocessStylesSync (SASS)', () => {
    test('returns unchanged CSS when no SASS syntax detected', () => {
      const css = '.button { color: red; }';
      const result = preprocessStylesSync(css);

      assert.strictEqual(result.css, css);
      assert.strictEqual(result.preprocessor, 'none');
    });

    test('auto-detects and compiles SASS when detected', () => {
      const scss = '$color: red; .button { color: $color; }';
      const result = preprocessStylesSync(scss);

      // Either sass compiled it or returned original
      assert.ok(result.css);
      if (result.preprocessor === 'sass') {
        // SASS was compiled - check output is valid CSS
        assert.ok(result.css.includes('color:'));
        assert.ok(!result.css.includes('$color'));
      } else {
        // SASS not available - original returned
        assert.strictEqual(result.css, scss);
      }
    });

    test('respects preprocessor option for forced SASS compilation', () => {
      const css = '.button { color: red; }';
      const result = preprocessStylesSync(css, { preprocessor: 'sass' });

      // If sass is available, it will compile
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

// ===== LESS CSS TESTS =====

describe('CSS Preprocessor - LESS', () => {
  test.beforeEach(() => {
    resetPreprocessorCaches();
  });

  describe('hasLessSyntax', () => {
    test('detects LESS variables', () => {
      assert.strictEqual(hasLessSyntax('@primary: #333;'), true);
      assert.strictEqual(hasLessSyntax('@font-size: 16px;'), true);
    });

    test('detects LESS mixins', () => {
      assert.strictEqual(hasLessSyntax('.button-style() { }'), true);
      assert.strictEqual(hasLessSyntax('.flex-center() { display: flex; }'), true);
    });

    test('detects parametric mixins', () => {
      assert.strictEqual(hasLessSyntax('.border(@width: 1px) { }'), true);
      assert.strictEqual(hasLessSyntax('.button-style > () { }'), true);
    });

    test('detects mixin calls', () => {
      assert.strictEqual(hasLessSyntax('.button-style();'), true);
      assert.strictEqual(hasLessSyntax('.btn { .flex-center(); }'), true);
    });

    test('detects &:extend', () => {
      assert.strictEqual(hasLessSyntax('&:extend(.base-class)'), true);
      assert.strictEqual(hasLessSyntax('.btn { &:extend(.button); }'), true);
    });

    test('detects interpolation', () => {
      assert.strictEqual(hasLessSyntax('.icon-@{name} { }'), true);
      assert.strictEqual(hasLessSyntax('@{property}: value;'), true);
    });

    test('detects guards', () => {
      assert.strictEqual(hasLessSyntax('.mixin() when (@a > 0) { }'), true);
      assert.strictEqual(hasLessSyntax('& when (@dark = true) { }'), true);
    });

    test('detects import options', () => {
      assert.strictEqual(hasLessSyntax('@import (less) "file.css";'), true);
      assert.strictEqual(hasLessSyntax('@import (reference) "base";'), true);
    });

    test('detects plugins', () => {
      assert.strictEqual(hasLessSyntax('@plugin "my-plugin";'), true);
    });

    test('returns false for plain CSS', () => {
      assert.strictEqual(hasLessSyntax('.button { color: red; }'), false);
      assert.strictEqual(hasLessSyntax('@media (max-width: 768px) { }'), false);
      assert.strictEqual(hasLessSyntax('@keyframes fade { }'), false);
    });

    test('returns false for CSS nesting (supported natively)', () => {
      assert.strictEqual(hasLessSyntax('.parent { .child { color: red; } }'), false);
      assert.strictEqual(hasLessSyntax('.btn { &:hover { opacity: 0.8; } }'), false);
    });
  });

  describe('preprocessStylesSync (LESS)', () => {
    test('auto-detects and compiles LESS when detected', () => {
      const less = '@color: red; .button { color: @color; }';
      const result = preprocessStylesSync(less);

      assert.ok(result.css);
      if (result.preprocessor === 'less') {
        // LESS was compiled - check output is valid CSS
        assert.ok(result.css.includes('color:'));
        assert.ok(!result.css.includes('@color'));
      } else {
        // LESS not available - original returned
        assert.strictEqual(result.css, less);
      }
    });

    test('respects preprocessor option for forced LESS compilation', () => {
      const css = '.button { color: red; }';
      const result = preprocessStylesSync(css, { preprocessor: 'less' });

      // If less is available, it will compile
      assert.ok(result.css);
    });
  });

  describe('isLessAvailable', () => {
    test('returns boolean', () => {
      const available = isLessAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });
  });

  describe('getLessVersion', () => {
    test('returns string or null', () => {
      const version = getLessVersion();
      assert.ok(version === null || typeof version === 'string');

      if (version) {
        // Version should be valid
        assert.ok(version.length > 0, `Version "${version}" should not be empty`);
      }
    });
  });
});

describe('LESS Integration', () => {
  test('compiles LESS variables when less is available', async () => {
    const less = `
      @primary-color: #646cff;
      @padding: 20px;

      .button {
        background: @primary-color;
        padding: @padding;
      }
    `;

    const result = await preprocessStyles(less);

    if (result.preprocessor === 'less') {
      // LESS compiled successfully
      assert.ok(result.css.includes('#646cff') || result.css.includes('646cff'));
      assert.ok(result.css.includes('20px'));
      assert.ok(!result.css.includes('@primary-color'));
      assert.ok(!result.css.includes('@padding'));
    }
  });

  test('compiles LESS nesting when less is available', async () => {
    const less = `
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

    const result = await preprocessStyles(less);

    if (result.preprocessor === 'less') {
      // Check that nesting was flattened
      assert.ok(result.css.includes('.card'));
      assert.ok(result.css.includes('.card .title') || result.css.includes('.card  .title'));
      assert.ok(result.css.includes('.card:hover'));
    }
  });

  test('compiles LESS mixins when less is available', async () => {
    const less = `
      .flex-center() {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .container {
        .flex-center();
        height: 100vh;
      }
    `;

    const result = await preprocessStyles(less);

    if (result.preprocessor === 'less') {
      assert.ok(result.css.includes('display') || result.css.includes('flex'));
      assert.ok(result.css.includes('align-items') || result.css.includes('center'));
      assert.ok(!result.css.includes('.flex-center()'));
    }
  });

  test('handles LESS errors gracefully', async () => {
    const invalidLess = `
      @color: red
      .button { color: @undefined-var; }
    `;

    // Should not throw, but may return original or throw LESS error
    try {
      const result = await preprocessStyles(invalidLess);
      // If no error, less might not be available
      assert.ok(result.css);
    } catch (error) {
      // LESS error is expected for invalid syntax
      assert.ok(error.message.includes('LESS') || error.message.includes('less'));
    }
  });
});

// ===== AUTO-DETECTION TESTS =====

describe('Preprocessor Auto-Detection', () => {
  test.beforeEach(() => {
    resetPreprocessorCaches();
  });

  describe('detectPreprocessor', () => {
    test('detects SASS syntax', () => {
      assert.strictEqual(detectPreprocessor('$color: red;'), 'sass');
      assert.strictEqual(detectPreprocessor('@mixin test { }'), 'sass');
      assert.strictEqual(detectPreprocessor('@include mixin;'), 'sass');
    });

    test('detects LESS syntax', () => {
      assert.strictEqual(detectPreprocessor('@color: red;'), 'less');
      assert.strictEqual(detectPreprocessor('.mixin() { }'), 'less');
      assert.strictEqual(detectPreprocessor('&:extend(.class);'), 'less');
    });

    test('prefers SASS when both syntaxes detected', () => {
      const mixed = '$sass: red; @less: blue;';
      assert.strictEqual(detectPreprocessor(mixed), 'sass');
    });

    test('returns none for plain CSS', () => {
      assert.strictEqual(detectPreprocessor('.btn { color: red; }'), 'none');
      assert.strictEqual(detectPreprocessor('@media (max-width: 768px) { }'), 'none');
    });

    test('returns none for CSS nesting', () => {
      assert.strictEqual(detectPreprocessor('.parent { .child { } }'), 'none');
      assert.strictEqual(detectPreprocessor('.btn { &:hover { } }'), 'none');
    });
  });

  describe('preprocessStyles (async)', () => {
    test('auto-compiles detected preprocessor', async () => {
      const scss = '$color: blue; .btn { color: $color; }';
      const result = await preprocessStyles(scss);

      assert.ok(result.css);
      assert.ok(['sass', 'none'].includes(result.preprocessor));
    });

    test('returns original CSS for none detected', async () => {
      const css = '.button { color: red; }';
      const result = await preprocessStyles(css);

      assert.strictEqual(result.css, css);
      assert.strictEqual(result.preprocessor, 'none');
    });
  });

  describe('preprocessStylesSync (auto-detect)', () => {
    test('auto-compiles SASS when detected', () => {
      const scss = '$primary: #333; .card { color: $primary; }';
      const result = preprocessStylesSync(scss);

      assert.ok(result.css);
      if (result.preprocessor === 'sass') {
        assert.ok(!result.css.includes('$primary'));
      }
    });

    test('auto-compiles LESS when detected', () => {
      const less = '@primary: #333; .card { color: @primary; }';
      const result = preprocessStylesSync(less);

      assert.ok(result.css);
      if (result.preprocessor === 'less') {
        assert.ok(!result.css.includes('@primary'));
      }
    });

    test('handles mixed nesting (common to both)', () => {
      const nested = `
        .card {
          &:hover { opacity: 0.8; }
        }
      `;
      const result = preprocessStylesSync(nested);

      // Should return as-is (native CSS nesting)
      assert.strictEqual(result.preprocessor, 'none');
    });
  });
});

// ===== STYLUS CSS TESTS =====

describe('CSS Preprocessor - Stylus', () => {
  test.beforeEach(() => {
    resetPreprocessorCaches();
  });

  describe('hasStylusSyntax', () => {
    test('detects Stylus variables (without $ or @)', () => {
      assert.strictEqual(hasStylusSyntax('primary-color = #333'), true);
      assert.strictEqual(hasStylusSyntax('font-size = 16px'), true);
    });

    test('detects Stylus mixins (no braces)', () => {
      assert.strictEqual(hasStylusSyntax('button-style()\n  padding 10px'), true);
    });

    test('detects Stylus mixin calls with +', () => {
      assert.strictEqual(hasStylusSyntax('+button-style'), true);
      assert.strictEqual(hasStylusSyntax('.btn\n  +flex-center'), true);
    });

    test('detects Stylus interpolation', () => {
      assert.strictEqual(hasStylusSyntax('.icon-{$name}'), true);
      assert.strictEqual(hasStylusSyntax('{$property}: value'), true);
    });

    test('detects Stylus conditionals', () => {
      assert.strictEqual(hasStylusSyntax('if dark-mode'), true);
      assert.strictEqual(hasStylusSyntax('unless mobile'), true);
    });

    test('detects Stylus loops', () => {
      assert.strictEqual(hasStylusSyntax('for item in items'), true);
      assert.strictEqual(hasStylusSyntax('for num in 1..10'), true);
    });

    test('detects Stylus @extends', () => {
      assert.strictEqual(hasStylusSyntax('@extend .base-class'), true);
      assert.strictEqual(hasStylusSyntax('@extends %placeholder'), true);
    });

    test('detects Stylus literal CSS blocks', () => {
      assert.strictEqual(hasStylusSyntax('@css { .literal { } }'), true);
      assert.strictEqual(hasStylusSyntax('@media { }'), false); // @media alone is CSS
    });

    test('detects Stylus arguments variable', () => {
      assert.strictEqual(hasStylusSyntax('for arg in arguments'), true);
    });

    test('detects conditional assignment', () => {
      assert.strictEqual(hasStylusSyntax('color ?= red'), true);
    });

    test('returns false for plain CSS', () => {
      assert.strictEqual(hasStylusSyntax('.button { color: red; }'), false);
      assert.strictEqual(hasStylusSyntax('@media (max-width: 768px) { }'), false);
      assert.strictEqual(hasStylusSyntax('@keyframes fade { }'), false);
    });

    test('returns false for CSS nesting', () => {
      assert.strictEqual(hasStylusSyntax('.parent { .child { color: red; } }'), false);
    });
  });

  describe('preprocessStylesSync (Stylus)', () => {
    test('auto-detects and compiles Stylus when detected', () => {
      const stylus = 'primary = red\n.button\n  color primary';
      const result = preprocessStylesSync(stylus);

      assert.ok(result.css);
      if (result.preprocessor === 'stylus') {
        // Stylus was compiled - check output is valid CSS
        assert.ok(result.css.includes('color'));
        assert.ok(!result.css.includes('primary ='));
      } else {
        // Stylus not available - original returned
        assert.strictEqual(result.css, stylus);
      }
    });

    test('respects preprocessor option for forced Stylus compilation', () => {
      const css = '.button\n  color red';
      const result = preprocessStylesSync(css, { preprocessor: 'stylus' });

      // If stylus is available, it will compile
      assert.ok(result.css);
    });
  });

  describe('isStylusAvailable', () => {
    test('returns boolean', () => {
      const available = isStylusAvailable();
      assert.strictEqual(typeof available, 'boolean');
    });
  });

  describe('getStylusVersion', () => {
    test('returns string or null', () => {
      const version = getStylusVersion();
      assert.ok(version === null || typeof version === 'string');

      if (version) {
        // Version should be valid
        assert.ok(version.length > 0, `Version "${version}" should not be empty`);
      }
    });
  });
});

describe('Stylus Integration', () => {
  test('compiles Stylus variables when stylus is available', async () => {
    const stylus = `
primary-color = #646cff
padding-size = 20px

.button
  background primary-color
  padding padding-size
    `;

    const result = await preprocessStyles(stylus);

    if (result.preprocessor === 'stylus') {
      // Stylus compiled successfully
      assert.ok(result.css.includes('#646cff') || result.css.includes('646cff'));
      assert.ok(result.css.includes('20px'));
      assert.ok(!result.css.includes('primary-color ='));
      assert.ok(!result.css.includes('padding-size ='));
    }
  });

  test('compiles Stylus nesting when stylus is available', async () => {
    const stylus = `
.card
  padding 20px

  .title
    font-size 24px

  &:hover
    box-shadow 0 2px 8px rgba(0,0,0,0.1)
    `;

    const result = await preprocessStyles(stylus);

    if (result.preprocessor === 'stylus') {
      // Check that nesting was flattened
      assert.ok(result.css.includes('.card'));
      assert.ok(result.css.includes('.card .title') || result.css.includes('.card  .title'));
      assert.ok(result.css.includes('.card:hover'));
    }
  });

  test('compiles Stylus mixins when stylus is available', async () => {
    const stylus = `
flex-center()
  display flex
  align-items center
  justify-content center

.container
  flex-center()
  height 100vh
    `;

    const result = await preprocessStyles(stylus);

    if (result.preprocessor === 'stylus') {
      assert.ok(result.css.includes('display') || result.css.includes('flex'));
      assert.ok(result.css.includes('align-items') || result.css.includes('center'));
      assert.ok(!result.css.includes('flex-center()'));
    }
  });

  test('handles Stylus errors gracefully', async () => {
    const invalidStylus = `
color = red
.button
  color undefined-var
    `;

    // Should not throw, but may return original or throw Stylus error
    try {
      const result = await preprocessStyles(invalidStylus);
      // If no error, stylus might not be available
      assert.ok(result.css);
    } catch (error) {
      // Stylus error is expected for invalid syntax
      assert.ok(error.message.includes('Stylus') || error.message.includes('stylus'));
    }
  });
});

// ===== EXTENDED AUTO-DETECTION TESTS =====

describe('Preprocessor Auto-Detection (Extended)', () => {
  test.beforeEach(() => {
    resetPreprocessorCaches();
  });

  describe('detectPreprocessor (with Stylus)', () => {
    test('detects Stylus syntax', () => {
      assert.strictEqual(detectPreprocessor('color = red'), 'stylus');
      assert.strictEqual(detectPreprocessor('if condition'), 'stylus');
      assert.strictEqual(detectPreprocessor('+mixin-name'), 'stylus');
    });

    test('prefers SASS over LESS and Stylus', () => {
      const mixed = '$sass: red; @less: blue; stylus-var = green';
      assert.strictEqual(detectPreprocessor(mixed), 'sass');
    });

    test('prefers LESS over Stylus', () => {
      const mixed = '@less: blue; stylus-var = green';
      assert.strictEqual(detectPreprocessor(mixed), 'less');
    });
  });
});
