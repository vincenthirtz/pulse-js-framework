/**
 * CSS Parsing Tests
 * Comprehensive tests for CSS parsing in .pulse files
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parse } from '../compiler/parser.js';
import { transform } from '../compiler/transformer.js';

/**
 * Helper to compile a .pulse style block and extract the CSS
 * @param {string} styleContent - CSS content inside style block
 * @returns {string} - Compiled CSS string
 */
function compileStyle(styleContent) {
  const pulseCode = `@page Test

state {
  x: 0
}

view {
  div "test"
}

style {
${styleContent}
}`;

  const ast = parse(pulseCode);
  const output = transform(ast, { scopeStyles: false }); // No scoping for easier testing

  // Extract styles from compiled output
  const match = output.match(/const styles = `([\s\S]*?)`;/);
  return match ? match[1].trim() : '';
}

/**
 * Helper to get parsed style rules from AST
 */
function parseStyleRules(styleContent) {
  const pulseCode = `@page Test

state {
  x: 0
}

view {
  div "test"
}

style {
${styleContent}
}`;

  const ast = parse(pulseCode);
  return ast.style ? ast.style.rules : [];
}

// =============================================================================
// Hex Color Tests
// =============================================================================

describe('CSS Hex Colors', () => {
  test('parses 3-digit hex colors', () => {
    const css = compileStyle(`
  .test {
    color: #fff
    background: #000
    border-color: #abc
  }
`);
    assert.ok(css.includes('color: #fff;'), 'Should parse 3-digit hex');
    assert.ok(css.includes('background: #000;'), 'Should parse black hex');
    assert.ok(css.includes('border-color: #abc;'), 'Should parse 3-digit alpha');
  });

  test('parses 6-digit hex colors', () => {
    const css = compileStyle(`
  .test {
    color: #ffffff
    background: #667eea
    border-color: #1a1a2e
  }
`);
    assert.ok(css.includes('color: #ffffff;'), 'Should parse 6-digit hex');
    assert.ok(css.includes('background: #667eea;'), 'Should parse mixed hex');
    assert.ok(css.includes('border-color: #1a1a2e;'), 'Should parse dark hex');
  });

  test('parses 8-digit hex colors (with alpha)', () => {
    const css = compileStyle(`
  .test {
    color: #ffffff80
    background: #00000050
  }
`);
    assert.ok(css.includes('color: #ffffff80;'), 'Should parse 8-digit hex');
    assert.ok(css.includes('background: #00000050;'), 'Should parse with alpha');
  });

  test('preserves hex colors in gradients', () => {
    const css = compileStyle(`
  .test {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  }
`);
    assert.ok(css.includes('#667eea'), 'Should preserve first color');
    assert.ok(css.includes('#764ba2'), 'Should preserve second color');
    assert.ok(css.includes('0%'), 'Should preserve first stop');
    assert.ok(css.includes('100%'), 'Should preserve second stop');
  });

  test('hex color after keyword (border: solid #color)', () => {
    const css = compileStyle(`
  .test {
    border: 2px solid #e0e0e0
  }
`);
    assert.ok(css.includes('solid #e0e0e0'), 'Should have space before hex');
  });
});

// =============================================================================
// CSS Units Tests
// =============================================================================

describe('CSS Units', () => {
  test('parses pixel values', () => {
    const css = compileStyle(`
  .test {
    width: 100px
    padding: 20px
    margin: 0px
  }
`);
    assert.ok(css.includes('width: 100px;'));
    assert.ok(css.includes('padding: 20px;'));
    assert.ok(css.includes('margin: 0px;'));
  });

  test('parses em and rem values', () => {
    const css = compileStyle(`
  .test {
    font-size: 1.5em
    line-height: 1.6rem
    margin: 2em
  }
`);
    assert.ok(css.includes('font-size: 1.5em;'));
    assert.ok(css.includes('line-height: 1.6rem;'));
    assert.ok(css.includes('margin: 2em;'));
  });

  test('parses viewport units', () => {
    const css = compileStyle(`
  .test {
    width: 100vw
    height: 100vh
    min-height: 50vmin
    max-width: 80vmax
  }
`);
    assert.ok(css.includes('width: 100vw;'));
    assert.ok(css.includes('height: 100vh;'));
    assert.ok(css.includes('min-height: 50vmin;'));
    assert.ok(css.includes('max-width: 80vmax;'));
  });

  test('parses percentage values', () => {
    const css = compileStyle(`
  .test {
    width: 100%
    opacity: 0.95
    transform: scale(1.02)
  }
`);
    assert.ok(css.includes('width: 100%;'));
    assert.ok(css.includes('opacity: 0.95;'));
  });

  test('parses time units', () => {
    const css = compileStyle(`
  .test {
    transition: all 0.3s ease
    animation-duration: 200ms
  }
`);
    assert.ok(css.includes('0.3s'));
    assert.ok(css.includes('200ms'));
  });

  test('parses angle units', () => {
    const css = compileStyle(`
  .test {
    transform: rotate(45deg)
    background: linear-gradient(135deg, red, blue)
  }
`);
    assert.ok(css.includes('45deg'));
    assert.ok(css.includes('135deg'));
  });
});

// =============================================================================
// Hyphenated Values Tests
// =============================================================================

describe('CSS Hyphenated Values', () => {
  test('parses font-family with hyphenated names', () => {
    const css = compileStyle(`
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif
  }
`);
    assert.ok(css.includes('-apple-system'), 'Should preserve -apple-system');
    assert.ok(css.includes('BlinkMacSystemFont'), 'Should preserve BlinkMacSystemFont');
  });

  test('parses transition timing functions', () => {
    const css = compileStyle(`
  .test {
    transition: all 0.3s ease-in-out
    animation: pulse 2s ease-in-out infinite
  }
`);
    assert.ok(css.includes('ease-in-out'), 'Should preserve ease-in-out');
  });

  test('parses hyphenated class names', () => {
    const rules = parseStyleRules(`
  .btn-primary {
    color: white
  }
  .card-3d {
    perspective: 1000px
  }
`);
    assert.strictEqual(rules[0].selector, '.btn-primary');
    assert.strictEqual(rules[1].selector, '.card-3d');
  });

  test('parses hyphenated property names', () => {
    const css = compileStyle(`
  .test {
    background-color: red
    border-radius: 8px
    box-shadow: 0 4px 8px rgba(0,0,0,0.1)
    -webkit-background-clip: text
  }
`);
    assert.ok(css.includes('background-color:'));
    assert.ok(css.includes('border-radius:'));
    assert.ok(css.includes('box-shadow:'));
    assert.ok(css.includes('-webkit-background-clip:'));
  });
});

// =============================================================================
// CSS Functions Tests
// =============================================================================

describe('CSS Functions', () => {
  test('parses rgba/rgb colors', () => {
    const css = compileStyle(`
  .test {
    color: rgba(255, 255, 255, 0.8)
    background: rgb(100, 100, 100)
  }
`);
    assert.ok(css.includes('rgba(255, 255, 255, 0.8)'));
    assert.ok(css.includes('rgb(100, 100, 100)'));
  });

  test('parses linear-gradient', () => {
    const css = compileStyle(`
  .test {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  }
`);
    assert.ok(css.includes('linear-gradient('));
    assert.ok(css.includes('135deg'));
  });

  test('parses transform functions', () => {
    const css = compileStyle(`
  .test {
    transform: translateY(-20px) scale(1.02) rotate(10deg)
  }
`);
    assert.ok(css.includes('translateY(-20px)'));
    assert.ok(css.includes('scale(1.02)'));
    assert.ok(css.includes('rotate(10deg)'));
  });

  test('parses calc function', () => {
    const css = compileStyle(`
  .test {
    width: calc(100% - 40px)
    height: calc(100vh - 60px)
  }
`);
    assert.ok(css.includes('calc(100% - 40px)'));
    assert.ok(css.includes('calc(100vh - 60px)'));
  });

  test('parses var function', () => {
    const css = compileStyle(`
  .test {
    color: var(--primary-color)
    padding: var(--spacing-md)
  }
`);
    assert.ok(css.includes('var(--primary-color)'));
    assert.ok(css.includes('var(--spacing-md)'));
  });

  test('parses cubic-bezier', () => {
    const css = compileStyle(`
  .test {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
  }
`);
    assert.ok(css.includes('cubic-bezier(0.4, 0, 0.2, 1)'));
  });

  test('parses filter functions', () => {
    const css = compileStyle(`
  .test {
    filter: blur(10px) grayscale(100%)
    backdrop-filter: blur(10px)
  }
`);
    assert.ok(css.includes('blur(10px)'));
    assert.ok(css.includes('grayscale(100%)'));
  });
});

// =============================================================================
// CSS Custom Properties Tests
// =============================================================================

describe('CSS Custom Properties', () => {
  test('parses :root with custom properties', () => {
    const css = compileStyle(`
  :root {
    --primary-color: #667eea
    --spacing-sm: 8px
    --border-radius: 8px
  }
`);
    assert.ok(css.includes('--primary-color: #667eea;'));
    assert.ok(css.includes('--spacing-sm: 8px;'));
    assert.ok(css.includes('--border-radius: 8px;'));
  });

  test('parses var() references', () => {
    const css = compileStyle(`
  .test {
    color: var(--primary-color)
    padding: var(--spacing-md, 16px)
  }
`);
    assert.ok(css.includes('var(--primary-color)'));
    // Accept both with and without space after comma (both are valid CSS)
    assert.ok(css.includes('var(--spacing-md') && css.includes('16px)'), 'Should have var() with fallback');
  });
});

// =============================================================================
// Media Queries Tests
// =============================================================================

describe('CSS Media Queries', () => {
  test('parses @media with max-width', () => {
    const css = compileStyle(`
  @media (max-width: 768px) {
    .container {
      padding: 16px
    }
  }
`);
    assert.ok(css.includes('@media'));
    assert.ok(css.includes('max-width'));
    assert.ok(css.includes('768px'));
    assert.ok(css.includes('.container'));
  });

  test('parses @media with prefers-color-scheme', () => {
    const css = compileStyle(`
  @media (prefers-color-scheme: dark) {
    body {
      background: #1a1a2e
    }
  }
`);
    assert.ok(css.includes('prefers-color-scheme'));
    assert.ok(css.includes('dark'));
  });

  test('media query wraps nested rules properly', () => {
    const css = compileStyle(`
  @media (max-width: 768px) {
    .card {
      padding: 16px
    }
  }
`);
    // Should be wrapped: @media { .card { } }
    assert.ok(css.includes('@media'));
    assert.ok(css.includes('{'));
  });
});

// =============================================================================
// Keyframes Tests
// =============================================================================

describe('CSS Keyframes', () => {
  test('parses @keyframes with from/to', () => {
    const css = compileStyle(`
  @keyframes fadeIn {
    from {
      opacity: 0
    }
    to {
      opacity: 1
    }
  }
`);
    assert.ok(css.includes('@keyframes fadeIn'));
    assert.ok(css.includes('from {'));
    assert.ok(css.includes('to {'));
    assert.ok(css.includes('opacity: 0;'));
    assert.ok(css.includes('opacity: 1;'));
  });

  test('parses @keyframes with percentages', () => {
    const css = compileStyle(`
  @keyframes pulse {
    0% {
      transform: scale(1)
    }
    50% {
      transform: scale(1.05)
    }
    100% {
      transform: scale(1)
    }
  }
`);
    assert.ok(css.includes('@keyframes pulse'));
    assert.ok(css.includes('0% {'));
    assert.ok(css.includes('50% {'));
    assert.ok(css.includes('100% {'));
  });

  test('keyframe steps should not be scoped', () => {
    // When scoping is enabled, from/to/% should not get scope class
    const pulseCode = `@page Test
state { x: 0 }
view { div "test" }
style {
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
}`;
    const ast = parse(pulseCode);
    const output = transform(ast, { scopeId: 'test123' });

    // Should NOT have from.test123 or to.test123
    assert.ok(!output.includes('from.test123'), 'from should not be scoped');
    assert.ok(!output.includes('to.test123'), 'to should not be scoped');
  });
});

// =============================================================================
// CSS Nesting Tests
// =============================================================================

describe('CSS Nesting', () => {
  test('parses nested rules', () => {
    const css = compileStyle(`
  .card {
    padding: 20px

    h1 {
      font-size: 24px
    }

    p {
      color: gray
    }
  }
`);
    assert.ok(css.includes('.card {'));
    assert.ok(css.includes('.card h1 {'));
    assert.ok(css.includes('.card p {'));
  });

  test('parses & parent selector', () => {
    const css = compileStyle(`
  .btn {
    color: blue

    &:hover {
      color: red
    }

    &.active {
      color: green
    }
  }
`);
    assert.ok(css.includes('.btn:hover'));
    assert.ok(css.includes('.btn.active'));
  });
});

// =============================================================================
// Complex Selectors Tests
// =============================================================================

describe('CSS Complex Selectors', () => {
  test('parses descendant selectors', () => {
    const rules = parseStyleRules(`
  .nav ul li a {
    color: blue
  }
`);
    assert.strictEqual(rules[0].selector, '.nav ul li a');
  });

  test('parses attribute selectors', () => {
    const rules = parseStyleRules(`
  input[type="text"] {
    padding: 8px
  }
`);
    assert.ok(rules[0].selector.includes('[type'));
  });

  test('parses pseudo-classes', () => {
    const css = compileStyle(`
  .link:hover {
    color: red
  }
  .link:focus {
    outline: 2px solid blue
  }
  .item:first-child {
    margin-top: 0
  }
`);
    assert.ok(css.includes(':hover'));
    assert.ok(css.includes(':focus'));
    assert.ok(css.includes(':first-child'));
  });

  test('parses pseudo-elements', () => {
    const css = compileStyle(`
  .quote::before {
    content: open-quote
  }
  .quote::after {
    content: close-quote
  }
`);
    assert.ok(css.includes('::before'));
    assert.ok(css.includes('::after'));
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('CSS Edge Cases', () => {
  test('handles multiple values on same line', () => {
    const css = compileStyle(`
  .test {
    margin: 10px 20px 30px 40px
    padding: 0 auto
    border: 1px solid black
  }
`);
    assert.ok(css.includes('margin: 10px 20px 30px 40px;'));
    assert.ok(css.includes('padding: 0 auto;'));
    assert.ok(css.includes('border: 1px solid black;'));
  });

  test('handles negative values', () => {
    const css = compileStyle(`
  .test {
    margin-top: -20px
    transform: translateX(-50%)
    letter-spacing: -2px
  }
`);
    assert.ok(css.includes('-20px'));
    assert.ok(css.includes('-50%'));
    assert.ok(css.includes('-2px'));
  });

  test('handles decimal values', () => {
    const css = compileStyle(`
  .test {
    opacity: 0.5
    line-height: 1.6
    transform: scale(0.98)
  }
`);
    assert.ok(css.includes('opacity: 0.5;'));
    assert.ok(css.includes('line-height: 1.6;'));
    assert.ok(css.includes('scale(0.98)'));
  });

  test('handles zero values', () => {
    const css = compileStyle(`
  .test {
    margin: 0
    padding: 0px
    opacity: 0
  }
`);
    assert.ok(css.includes('margin: 0;'));
    assert.ok(css.includes('padding: 0px;'));
    assert.ok(css.includes('opacity: 0;'));
  });

  test('handles !important', () => {
    const css = compileStyle(`
  .test {
    color: red !important
    display: block !important
  }
`);
    assert.ok(css.includes('!important'));
  });

  test('handles quotes in content property', () => {
    const css = compileStyle(`
  .test::before {
    content: "Hello"
  }
`);
    assert.ok(css.includes('content:'));
  });

  test('handles url() function', () => {
    const css = compileStyle(`
  .test {
    background-image: url(/images/bg.png)
  }
`);
    assert.ok(css.includes('url('));
  });

  test('handles comma-separated values', () => {
    const css = compileStyle(`
  .test {
    font-family: Arial, Helvetica, sans-serif
    box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.2)
  }
`);
    assert.ok(css.includes('Arial, Helvetica, sans-serif'));
  });
});

// =============================================================================
// Global Selectors Tests
// =============================================================================

describe('CSS Global Selectors', () => {
  test('* selector should not be scoped', () => {
    const pulseCode = `@page Test
state { x: 0 }
view { div "test" }
style {
  * {
    box-sizing: border-box
  }
}`;
    const ast = parse(pulseCode);
    const output = transform(ast, { scopeId: 'test123' });

    // * should remain as * (not *.test123)
    assert.ok(output.includes('* {'), '* should not be scoped');
  });

  test('body selector should not be scoped', () => {
    const pulseCode = `@page Test
state { x: 0 }
view { div "test" }
style {
  body {
    margin: 0
  }
}`;
    const ast = parse(pulseCode);
    const output = transform(ast, { scopeId: 'test123' });

    assert.ok(output.includes('body {'), 'body should not be scoped');
    assert.ok(!output.includes('body.test123'), 'body should not have scope');
  });

  test(':root selector should not be scoped', () => {
    const pulseCode = `@page Test
state { x: 0 }
view { div "test" }
style {
  :root {
    --color: blue
  }
}`;
    const ast = parse(pulseCode);
    const output = transform(ast, { scopeId: 'test123' });

    assert.ok(output.includes(':root {'), ':root should not be scoped');
  });
});
