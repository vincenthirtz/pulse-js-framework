/**
 * Coverage boost tests for compiler/preprocessor.js
 *
 * Targets uncovered paths:
 *  - LESS lookbehind guard (false positive prevention)
 *  - Stylus-specific detection patterns
 *  - detectPreprocessor priority ordering
 *  - compileLessSync returning null (LESS is async-only)
 *  - isAvailable() returning false for uninstalled packages
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  hasLessSyntax,
  hasSassSyntax,
  hasStylusSyntax,
  detectPreprocessor,
  compileLessSync,
  isSassAvailable,
  isLessAvailable,
  isStylusAvailable,
  resetPreprocessorCaches
} from '../compiler/preprocessor.js';

// Reset module-level caches before/after each test so tests are isolated
describe('preprocessor - LESS detection', () => {
  test.beforeEach(() => resetPreprocessorCaches());
  test.afterEach(() => resetPreprocessorCaches());

  test(':not(.active) { does NOT trigger LESS mixin detection', () => {
    // The LESS_PATTERNS use a lookbehind (?<!\() to avoid false positives
    // when a class name appears inside a CSS pseudo-class argument.
    const css = '.nav-item:not(.active) { color: red; }';
    assert.strictEqual(hasLessSyntax(css), false,
      ':not(.active) should not be recognised as a LESS mixin');
  });

  test('.mixin() { DOES trigger LESS mixin detection', () => {
    const css = '.button-styles() { padding: 10px; }';
    assert.strictEqual(hasLessSyntax(css), true,
      '.button-styles() { should be recognised as a LESS mixin definition');
  });

  test('LESS variable declaration triggers detection', () => {
    const css = '@primary-color: #333;';
    assert.strictEqual(hasLessSyntax(css), true);
  });

  test('plain CSS without LESS syntax returns false', () => {
    const css = '.foo { color: red; } .bar { font-size: 14px; }';
    assert.strictEqual(hasLessSyntax(css), false);
  });

  test('mixin call .foo(); triggers detection', () => {
    const css = '.container { .button-styles(); }';
    assert.strictEqual(hasLessSyntax(css), true);
  });

  test('&:extend() triggers detection', () => {
    const css = '.bar { &:extend(.base); }';
    assert.strictEqual(hasLessSyntax(css), true);
  });

  test('@{variable} interpolation triggers detection', () => {
    const css = '.@{component}-wrapper { display: block; }';
    assert.strictEqual(hasLessSyntax(css), true);
  });
});

describe('preprocessor - Stylus detection', () => {
  test.beforeEach(() => resetPreprocessorCaches());
  test.afterEach(() => resetPreprocessorCaches());

  test('variable = value pattern triggers Stylus detection', () => {
    // Must have a space after = per the Stylus pattern /^[\w-]+\s*=\s+/m
    const css = 'primary-color = #333\n.foo { color: primary-color }';
    assert.strictEqual(hasStylusSyntax(css), true,
      'bare variable assignment should be detected as Stylus');
  });

  test('if condition triggers Stylus detection', () => {
    const css = 'if dark-mode\n  background: black\n';
    assert.strictEqual(hasStylusSyntax(css), true,
      'bare if keyword should be detected as Stylus');
  });

  test('unless condition triggers Stylus detection', () => {
    const css = 'unless light-mode\n  color: white\n';
    assert.strictEqual(hasStylusSyntax(css), true,
      'unless keyword should be detected as Stylus');
  });

  test('for...in loop triggers Stylus detection', () => {
    const css = 'for item in items\n  .item { }\n';
    assert.strictEqual(hasStylusSyntax(css), true);
  });

  test('mixin call without braces triggers detection', () => {
    const css = 'button-style()\n';
    assert.strictEqual(hasStylusSyntax(css), true);
  });

  test('+ mixin call prefix triggers detection', () => {
    const css = '+button-style\n';
    assert.strictEqual(hasStylusSyntax(css), true);
  });

  test('plain CSS without Stylus syntax returns false', () => {
    const css = '.foo { color: red; margin: 0; }';
    assert.strictEqual(hasStylusSyntax(css), false);
  });

  test('@extends triggers detection', () => {
    const css = '@extends .base\n';
    assert.strictEqual(hasStylusSyntax(css), true);
  });
});

describe('preprocessor - detectPreprocessor priority', () => {
  test.beforeEach(() => resetPreprocessorCaches());
  test.afterEach(() => resetPreprocessorCaches());

  test('SASS wins over LESS when both patterns present', () => {
    // $var: triggers SASS; @var: triggers LESS — SASS should win (higher priority)
    const css = '$primary: #333;\n@secondary: #666;';
    const result = detectPreprocessor(css);
    assert.strictEqual(result, 'sass',
      'SASS should take priority over LESS when both patterns are detected');
  });

  test('LESS wins over Stylus when LESS pattern present but no SASS', () => {
    // @var: is LESS; "var = " style is Stylus — LESS should win over Stylus
    const css = '@myColor: red;\nfont-size = 14px\n';
    const result = detectPreprocessor(css);
    assert.strictEqual(result, 'less',
      'LESS should take priority over Stylus when SASS is absent');
  });

  test('Stylus detected when only Stylus syntax present', () => {
    const css = 'primary = red\n.foo\n  color primary\n';
    const result = detectPreprocessor(css);
    assert.strictEqual(result, 'stylus');
  });

  test('plain CSS returns none', () => {
    const css = '.foo { color: red; font-size: 14px; }';
    const result = detectPreprocessor(css);
    assert.strictEqual(result, 'none',
      'plain CSS with no preprocessor syntax should return none');
  });

  test('empty string returns none', () => {
    assert.strictEqual(detectPreprocessor(''), 'none');
  });

  test('whitespace-only string returns none', () => {
    assert.strictEqual(detectPreprocessor('   \n   \t   '), 'none');
  });

  test('SASS wins over Stylus when SASS pattern present', () => {
    const css = '$color: red;\nprimary = blue\n';
    assert.strictEqual(detectPreprocessor(css), 'sass');
  });
});

describe('preprocessor - compileLessSync returns null', () => {
  test.beforeEach(() => resetPreprocessorCaches());
  test.afterEach(() => resetPreprocessorCaches());

  test('compileLessSync always returns null when LESS unavailable', () => {
    // If the `less` package is not installed, tryLoadLessSync returns false
    // and compileLessSync should return null.
    if (isLessAvailable()) {
      // LESS is installed in this environment — the sync stub still returns null
      // because LESS has no true synchronous compilation API.
      const result = compileLessSync('@color: red; .foo { color: @color; }');
      assert.strictEqual(result, null,
        'compileLessSync must always return null (LESS is async-only)');
    } else {
      // LESS not installed — should also return null
      const result = compileLessSync('@color: red; .foo { color: @color; }');
      assert.strictEqual(result, null,
        'compileLessSync must return null when LESS is not installed');
    }
  });

  test('compileLessSync returns null even with valid LESS code', () => {
    // Regardless of whether less is installed, the sync path is a no-op
    const result = compileLessSync('.mixin() { padding: 10px; } .btn { .mixin(); }');
    assert.strictEqual(result, null);
  });
});

describe('preprocessor - isAvailable() for uninstalled packages', () => {
  test.beforeEach(() => resetPreprocessorCaches());
  test.afterEach(() => resetPreprocessorCaches());

  test('isSassAvailable returns a boolean', () => {
    const result = isSassAvailable();
    assert.strictEqual(typeof result, 'boolean',
      'isSassAvailable must return a boolean');
  });

  test('isLessAvailable returns a boolean', () => {
    const result = isLessAvailable();
    assert.strictEqual(typeof result, 'boolean',
      'isLessAvailable must return a boolean');
  });

  test('isStylusAvailable returns a boolean', () => {
    const result = isStylusAvailable();
    assert.strictEqual(typeof result, 'boolean',
      'isStylusAvailable must return a boolean');
  });

  test('availability check does not throw', () => {
    assert.doesNotThrow(() => {
      isSassAvailable();
      isLessAvailable();
      isStylusAvailable();
    });
  });

  test('isAvailable result is consistent across repeated calls', () => {
    // The loader caches the result — calling twice must give the same answer
    const first = isSassAvailable();
    const second = isSassAvailable();
    assert.strictEqual(first, second,
      'isSassAvailable must return a consistent cached value');
  });
});

describe('preprocessor - hasSassSyntax edge cases', () => {
  test.beforeEach(() => resetPreprocessorCaches());

  test('@if SASS control directive detected', () => {
    assert.strictEqual(hasSassSyntax('@if $dark { color: white; }'), true);
  });

  test('@else SASS directive detected', () => {
    assert.strictEqual(hasSassSyntax('@else { color: black; }'), true);
  });

  test('@for $i SASS loop detected', () => {
    assert.strictEqual(hasSassSyntax('@for $i from 1 through 3 { }'), true);
  });

  test('@each $item SASS loop detected', () => {
    assert.strictEqual(hasSassSyntax('@each $item in (a, b, c) { }'), true);
  });

  test('@while SASS loop detected', () => {
    assert.strictEqual(hasSassSyntax('@while $n > 0 { $n: $n - 1; }'), true);
  });

  test('SASS interpolation #{} detected', () => {
    assert.strictEqual(hasSassSyntax('.icon-#{$name} { }'), true);
  });

  test('plain @media does NOT trigger SASS detection', () => {
    // @media is standard CSS — not a SASS-specific pattern
    assert.strictEqual(hasSassSyntax('@media (max-width: 768px) { .foo { } }'), false);
  });
});
