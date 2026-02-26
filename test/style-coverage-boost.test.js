/**
 * Style Coverage Boost Tests
 * Tests for uncovered code paths in compiler/transformer/style.js
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parse } from '../compiler/parser.js';
import { transform } from '../compiler/transformer.js';
import { flattenStyleRule, scopeStyleSelector } from '../compiler/transformer/style.js';

/**
 * Helper to compile a .pulse style block and extract the generated CSS.
 * Mirrors the pattern from test/css-parsing.test.js.
 * @param {string} styleContent
 * @param {{ scope?: boolean }} options
 * @returns {string}
 */
function compileStyle(styleContent, options = {}) {
  const pulseCode = `@page Test\n\nstate {\n  x: 0\n}\n\nview {\n  div "test"\n}\n\nstyle {\n${styleContent}\n}`;
  const ast = parse(pulseCode);
  const output = transform(ast, { scopeStyles: options.scope || false });
  const match = output.match(/const styles = `([\s\S]*?)`;/);
  return match ? match[1].trim() : '';
}

/**
 * Compile with CSS scoping enabled (generates random scope ID).
 */
function compileScopedStyle(styleContent) {
  return compileStyle(styleContent, { scope: true });
}

/**
 * Scope pattern regex: a generated scope class looks like .p<10 alphanumeric chars>
 */
const SCOPE_CLASS_RE = /\.p[a-z0-9]{8,}/;

// =============================================================================
// @layer Rules
// =============================================================================

describe('@layer rules', () => {
  // The Pulse CSS parser requires a LBRACE after every selector.
  // An @layer rule with empty braces and no properties/nested rules
  // triggers the "layer statement" path in the transformer:
  //   if (rule.nestedRules.length === 0 && rule.properties.length === 0) => @layer name;
  test('@layer with empty block is emitted as statement form (no braces)', () => {
    // @layer base { } → parsed as rule with selector '@layer base', no properties, no nested
    const css = compileStyle(`
  @layer base {
  }
`);
    assert.ok(css.includes('@layer base'), 'Should output @layer statement');
    assert.ok(css.includes('@layer base;'), '@layer statement should end with semicolon');
    assert.ok(!css.includes('@layer base {'), 'Statement form should not open a block');
  });

  test('@layer block form with nested rules is emitted with braces', () => {
    const css = compileStyle(`
  @layer utilities {
    .btn {
      padding: 8px 16px
    }
  }
`);
    assert.ok(css.includes('@layer utilities'), 'Should output @layer block name');
    assert.ok(css.includes('{'), 'Block form should have braces');
    assert.ok(css.includes('.btn'), 'Should contain nested selector');
    assert.ok(css.includes('padding: 8px 16px;'), 'Should contain nested property');
  });

  test('@layer block with multiple nested selectors outputs all selectors', () => {
    const css = compileStyle(`
  @layer components {
    .card {
      border-radius: 8px
    }
    .badge {
      font-size: 12px
    }
  }
`);
    assert.ok(css.includes('.card'), 'Should contain first nested selector');
    assert.ok(css.includes('.badge'), 'Should contain second nested selector');
    assert.ok(css.includes('border-radius: 8px;'), 'First property present');
    assert.ok(css.includes('font-size: 12px;'), 'Second property present');
  });

  test('@layer inside @media emits @layer nested inside @media block', () => {
    const css = compileStyle(`
  @media (max-width: 600px) {
    @layer utilities {
      .hidden {
        display: none
      }
    }
  }
`);
    assert.ok(css.includes('@media'), 'Should contain @media wrapper');
    assert.ok(css.includes('@layer utilities'), 'Should contain @layer inside @media');
    assert.ok(css.includes('display: none;'), 'Should contain nested property');
  });

  test('multiple empty @layer blocks produce multiple statement-form entries', () => {
    const css = compileStyle(`
  @layer base {
  }
  @layer components {
  }
  @layer utilities {
  }
`);
    assert.ok(css.includes('@layer base'), 'First layer statement present');
    assert.ok(css.includes('@layer components'), 'Second layer statement present');
    assert.ok(css.includes('@layer utilities'), 'Third layer statement present');
    assert.ok(
      css.indexOf('@layer base') < css.indexOf('@layer components'),
      'Layer order should be preserved'
    );
  });

  test('@layer block — nested content appears inside the layer wrapper', () => {
    const css = compileStyle(`
  @layer base {
    .reset {
      margin: 0
      padding: 0
    }
  }
`);
    const layerIndex = css.indexOf('@layer base');
    const resetIndex = css.indexOf('.reset');
    assert.ok(layerIndex !== -1, '@layer base must be present');
    assert.ok(resetIndex > layerIndex, '.reset must appear after @layer base');
  });
});

// =============================================================================
// @supports Rules
// =============================================================================

describe('@supports rules', () => {
  // Note: the Pulse CSS parser collapses spaces inside parenthesised @-rule
  // condition values, so (display: grid) becomes (display:grid) in the output.

  test('basic @supports feature query wraps nested rule', () => {
    const css = compileStyle(`
  @supports (display: grid) {
    .layout {
      display: grid
    }
  }
`);
    assert.ok(css.includes('@supports'), 'Should output @supports at-rule');
    assert.ok(css.includes('display:grid'), 'Should output feature query condition');
    assert.ok(css.includes('.layout'), 'Should contain nested selector');
    assert.ok(css.includes('display: grid;'), 'Should contain nested property');
  });

  test('@supports with not() condition', () => {
    const css = compileStyle(`
  @supports not (display: grid) {
    .layout {
      display: flex
    }
  }
`);
    assert.ok(css.includes('@supports'), 'Should output @supports at-rule');
    assert.ok(css.includes('not'), 'Should preserve not() negation');
    assert.ok(css.includes('display: flex;'), 'Should contain nested property');
  });

  test('@supports with and condition', () => {
    const css = compileStyle(`
  @supports (display: grid) and (gap: 1px) {
    .modern {
      display: grid
      gap: 20px
    }
  }
`);
    assert.ok(css.includes('@supports'), 'Should output @supports at-rule');
    assert.ok(css.includes('display: grid;'), 'Should contain display property');
    assert.ok(css.includes('gap: 20px;'), 'Should contain gap property');
  });

  test('@supports wrapping a rule with multiple properties', () => {
    const css = compileStyle(`
  @supports (display: flex) {
    .flex-container {
      display: flex
      align-items: center
      justify-content: space-between
    }
  }
`);
    assert.ok(css.includes('@supports'), '@supports present');
    assert.ok(css.includes('.flex-container'), 'Nested selector present');
    assert.ok(css.includes('align-items: center;'), 'align-items present');
    assert.ok(css.includes('justify-content: space-between;'), 'justify-content present');
  });
});

// =============================================================================
// @container Queries
// =============================================================================

describe('@container queries', () => {
  // Like @supports, the CSS parser collapses spaces inside the condition parens:
  // (min-width: 400px) becomes (min-width:400px) in the output.

  test('basic @container query wraps nested rule', () => {
    const css = compileStyle(`
  @container (min-width: 400px) {
    .card {
      font-size: 18px
    }
  }
`);
    assert.ok(css.includes('@container'), 'Should output @container at-rule');
    assert.ok(css.includes('min-width'), 'Should output container condition');
    assert.ok(css.includes('.card'), 'Should contain nested selector');
    assert.ok(css.includes('font-size: 18px;'), 'Should contain nested property');
  });

  test('@container with named container', () => {
    const css = compileStyle(`
  @container sidebar (min-width: 300px) {
    .widget {
      columns: 2
    }
  }
`);
    assert.ok(css.includes('@container'), 'Should output @container at-rule');
    assert.ok(css.includes('sidebar'), 'Should output named container');
    assert.ok(css.includes('.widget'), 'Should contain nested selector');
    assert.ok(css.includes('columns: 2;'), 'Should contain nested property');
  });

  test('@container wrapping a rule with multiple properties', () => {
    const css = compileStyle(`
  @container (min-width: 600px) {
    .responsive-grid {
      display: grid
      grid-template-columns: 1fr 1fr
      gap: 16px
    }
  }
`);
    assert.ok(css.includes('@container'), '@container present');
    assert.ok(css.includes('.responsive-grid'), 'Nested selector present');
    assert.ok(css.includes('gap: 16px;'), 'gap property present');
  });
});

// =============================================================================
// Deeply Nested Rule Flattening
// =============================================================================

describe('Deeply nested rule flattening', () => {
  test('3 levels of nesting produce correctly combined selectors', () => {
    const css = compileStyle(`
  .a {
    color: blue
    .b {
      color: green
      .c {
        color: red
      }
    }
  }
`);
    assert.ok(css.includes('.a {'), 'Root selector present');
    assert.ok(css.includes('.a .b {'), '2-level combined selector present');
    assert.ok(css.includes('.a .b .c {'), '3-level combined selector present');
    assert.ok(css.includes('color: red;'), 'Deepest nested property present');
  });

  test('4 levels of nesting produce correctly combined selectors', () => {
    const css = compileStyle(`
  .level1 {
    color: black
    .level2 {
      color: gray
      .level3 {
        color: silver
        .level4 {
          font-weight: bold
        }
      }
    }
  }
`);
    assert.ok(css.includes('.level1 .level2 .level3 .level4 {'), '4-level combined selector present');
    assert.ok(css.includes('font-weight: bold;'), 'Deeply nested property present');
  });

  test('& combinator expanded at multiple nesting depths', () => {
    const css = compileStyle(`
  .btn {
    color: blue
    &:hover {
      color: red
      &:focus {
        outline: 2px solid red
      }
    }
  }
`);
    assert.ok(css.includes('.btn:hover {'), 'First-level & expansion present');
    assert.ok(css.includes('.btn:hover:focus {'), 'Second-level & expansion present');
    assert.ok(css.includes('outline: 2px solid red;'), 'Deeply nested property present');
  });

  test('sibling rules inside parent both produce combined selectors', () => {
    const css = compileStyle(`
  .form {
    margin: 0
    .label {
      font-weight: bold
    }
    .input {
      border: 1px solid gray
    }
  }
`);
    assert.ok(css.includes('.form .label {'), 'First nested selector present');
    assert.ok(css.includes('.form .input {'), 'Second nested selector present');
    assert.ok(css.includes('font-weight: bold;'), 'First nested property present');
    assert.ok(css.includes('border: 1px solid gray;'), 'Second nested property present');
  });
});

// =============================================================================
// Keyframe Steps — Decimal Percentages and from/to
// =============================================================================

describe('Keyframe steps', () => {
  test('decimal percentage keyframe stops (33.33%, 66.67%)', () => {
    const css = compileStyle(`
  @keyframes spin {
    0% {
      transform: rotate(0deg)
    }
    33.33% {
      transform: rotate(120deg)
    }
    66.67% {
      transform: rotate(240deg)
    }
    100% {
      transform: rotate(360deg)
    }
  }
`);
    assert.ok(css.includes('@keyframes spin'), 'Keyframe name present');
    assert.ok(css.includes('33.33%'), 'First decimal percentage stop present');
    assert.ok(css.includes('66.67%'), 'Second decimal percentage stop present');
    assert.ok(css.includes('transform: rotate(120deg);'), 'Property at decimal stop present');
  });

  test('from and to keyframe steps output correctly', () => {
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
    assert.ok(css.includes('@keyframes fadeIn'), 'Keyframe name present');
    assert.ok(css.includes('from {'), 'from step block present');
    assert.ok(css.includes('to {'), 'to step block present');
    assert.ok(css.includes('opacity: 0;'), 'from property present');
    assert.ok(css.includes('opacity: 1;'), 'to property present');
  });

  test('multiple percentage stops in single keyframe', () => {
    const css = compileStyle(`
  @keyframes bounce {
    0% {
      transform: translateY(0)
    }
    50% {
      transform: translateY(-20px)
    }
    100% {
      transform: translateY(0)
    }
  }
`);
    assert.ok(css.includes('@keyframes bounce'), 'Keyframe name present');
    assert.ok(css.includes('0% {'), '0% stop present');
    assert.ok(css.includes('50% {'), '50% stop present');
    assert.ok(css.includes('100% {'), '100% stop present');
    assert.ok(css.includes('transform: translateY(-20px);'), 'Property at 50% present');
  });
});

// =============================================================================
// isKeyframeStep — Verified via Scoping Behavior
// =============================================================================
//
// isKeyframeStep is tested indirectly: when scoping is enabled, keyframe step
// selectors (from, to, 0%, 100%, 33.33%) must NOT receive a scope class,
// whereas regular class selectors MUST.
//
// We use flattenStyleRule directly so we can control the exact rule shape
// without relying on the parser (which cannot parse @layer statements, etc.).

describe('isKeyframeStep identification via flattenStyleRule', () => {
  const fakeTransformer = { scopeId: 'p-kf-test' };

  function runFlatten(rule) {
    const output = [];
    flattenStyleRule(fakeTransformer, rule, '', output, '', true); // inKeyframes=true
    return output.join('\n');
  }

  test('0% inside keyframes is not scoped', () => {
    const rule = {
      selector: '0%',
      properties: [{ name: 'opacity', value: '0' }],
      nestedRules: []
    };
    const out = [];
    flattenStyleRule(fakeTransformer, rule, '', out, '', true);
    const css = out.join('\n');
    assert.ok(!css.includes('0%.p-kf-test'), '0% must not receive scope class');
    assert.ok(css.includes('0%'), '0% selector present');
  });

  test('100% inside keyframes is not scoped', () => {
    const rule = {
      selector: '100%',
      properties: [{ name: 'opacity', value: '1' }],
      nestedRules: []
    };
    const out = [];
    flattenStyleRule(fakeTransformer, rule, '', out, '', true);
    const css = out.join('\n');
    assert.ok(!css.includes('100%.p-kf-test'), '100% must not receive scope class');
  });

  test('50.5% (decimal) inside keyframes is not scoped', () => {
    const rule = {
      selector: '50.5%',
      properties: [{ name: 'transform', value: 'scale(1.1)' }],
      nestedRules: []
    };
    const out = [];
    flattenStyleRule(fakeTransformer, rule, '', out, '', true);
    const css = out.join('\n');
    assert.ok(!css.includes('50.5%.p-kf-test'), 'Decimal % must not receive scope class');
    assert.ok(css.includes('50.5%'), 'Decimal % selector present');
  });

  test('from inside keyframes is not scoped', () => {
    const rule = {
      selector: 'from',
      properties: [{ name: 'opacity', value: '0' }],
      nestedRules: []
    };
    const out = [];
    flattenStyleRule(fakeTransformer, rule, '', out, '', true);
    const css = out.join('\n');
    assert.ok(!css.includes('from.p-kf-test'), 'from must not receive scope class');
  });

  test('to inside keyframes is not scoped', () => {
    const rule = {
      selector: 'to',
      properties: [{ name: 'opacity', value: '1' }],
      nestedRules: []
    };
    const out = [];
    flattenStyleRule(fakeTransformer, rule, '', out, '', true);
    const css = out.join('\n');
    assert.ok(!css.includes('to.p-kf-test'), 'to must not receive scope class');
  });

  test('regular class selector IS scoped (not a keyframe step)', () => {
    const rule = {
      selector: '.btn',
      properties: [{ name: 'color', value: 'red' }],
      nestedRules: []
    };
    const out = [];
    // inKeyframes = false for a normal rule
    flattenStyleRule(fakeTransformer, rule, '', out, '', false);
    const css = out.join('\n');
    assert.ok(css.includes('.btn.p-kf-test'), 'Normal class selector must be scoped');
  });
});

// =============================================================================
// Scope Selector with Pseudo-classes — via scopeStyleSelector directly
// =============================================================================

describe('scopeStyleSelector with pseudo-classes', () => {
  const transformer = { scopeId: 'p-test' };

  test(':hover pseudo-class preserved after scope class insertion', () => {
    const result = scopeStyleSelector(transformer, '.btn:hover');
    assert.ok(result.includes('.btn.p-test:hover'), 'Scope inserted before :hover');
  });

  test(':not() content receives scope class', () => {
    const result = scopeStyleSelector(transformer, '.item:not(.active)');
    // The outer .item gets scoped; :not() inner content also goes through scoping
    assert.ok(result.includes(':not('), ':not() pseudo-class preserved');
    assert.ok(result.includes('.p-test'), 'Scope class applied somewhere');
  });

  test(':is() content is scoped', () => {
    const result = scopeStyleSelector(transformer, '.item:is(.a, .b)');
    assert.ok(result.includes(':is('), ':is() pseudo-class preserved');
    assert.ok(result.includes('.p-test'), 'Scope class applied');
  });

  test(':where() content is scoped', () => {
    const result = scopeStyleSelector(transformer, '.item:where(.x)');
    assert.ok(result.includes(':where('), ':where() pseudo-class preserved');
    assert.ok(result.includes('.p-test'), 'Scope class applied');
  });

  test(':has() content is scoped', () => {
    const result = scopeStyleSelector(transformer, '.parent:has(.child)');
    assert.ok(result.includes(':has('), ':has() pseudo-class preserved');
    assert.ok(result.includes('.p-test'), 'Scope class applied');
  });

  test('plain :hover without base class gets scope on element', () => {
    // div:hover → div.p-test:hover
    const result = scopeStyleSelector(transformer, 'div:hover');
    assert.ok(result.includes('.p-test'), 'Element with pseudo-class is scoped');
    assert.ok(result.includes(':hover'), ':hover preserved');
  });
});

// =============================================================================
// Scope Selector with CSS Combinators — via scopeStyleSelector directly
// =============================================================================

describe('scopeStyleSelector with combinators', () => {
  const transformer = { scopeId: 'p-test' };

  test('> child combinator preserved; both parts scoped', () => {
    const result = scopeStyleSelector(transformer, '.parent > .child');
    assert.ok(result.includes('>'), 'Child combinator > preserved');
    assert.ok(result.includes('.parent.p-test'), 'Parent part scoped');
    assert.ok(result.includes('.child.p-test'), 'Child part scoped');
  });

  test('+ adjacent sibling combinator preserved; both parts scoped', () => {
    const result = scopeStyleSelector(transformer, '.prev + .next');
    assert.ok(result.includes('+'), 'Adjacent sibling combinator + preserved');
    assert.ok(result.includes('.prev.p-test'), 'Prev part scoped');
    assert.ok(result.includes('.next.p-test'), 'Next part scoped');
  });

  test('~ general sibling combinator preserved; both parts scoped', () => {
    const result = scopeStyleSelector(transformer, '.before ~ .after');
    assert.ok(result.includes('~'), 'General sibling combinator ~ preserved');
    assert.ok(result.includes('.before.p-test'), 'Before part scoped');
    assert.ok(result.includes('.after.p-test'), 'After part scoped');
  });

  test('scoped combinator selector verified via full compile pipeline', () => {
    // Also test via the full compilation path to confirm integration
    const css = compileScopedStyle(`
  .parent > .child {
    color: red
  }
`);
    assert.ok(css.includes('>'), 'Child combinator > preserved in compiled output');
    assert.ok(SCOPE_CLASS_RE.test(css), 'A generated scope class is present');
  });
});

// =============================================================================
// @-rule Wrapping @keyframes
// =============================================================================

describe('@-rule wrapping @keyframes', () => {
  test('@media wrapping @keyframes outputs both at-rules in output', () => {
    // The CSS parser treats @media as the outer rule; @keyframes is the nested rule.
    // Since @keyframes is inside a conditional group (@media), the transformer
    // uses the @media rule as the atRuleWrapper when emitting @keyframes.
    const css = compileStyle(`
  @media print {
    @keyframes printFade {
      from {
        opacity: 1
      }
      to {
        opacity: 0
      }
    }
  }
`);
    assert.ok(css.includes('@media'), '@media at-rule present');
    assert.ok(css.includes('@keyframes printFade'), '@keyframes present inside @media');
    assert.ok(css.includes('from {'), 'from keyframe step present');
    assert.ok(css.includes('to {'), 'to keyframe step present');
    assert.ok(css.includes('opacity: 1;'), 'from property present');
    assert.ok(css.includes('opacity: 0;'), 'to property present');
  });
});

// =============================================================================
// Empty Rules
// =============================================================================

describe('Empty rule (no properties)', () => {
  test('selector with no properties is not emitted as a rule block', () => {
    const css = compileStyle(`
  .empty {
  }
  .nonempty {
    color: red
  }
`);
    assert.ok(!css.includes('.empty {'), 'Empty rule should not be output');
    assert.ok(css.includes('.nonempty {'), 'Non-empty rule should be output');
    assert.ok(css.includes('color: red;'), 'Non-empty property should be output');
  });

  test('rule with only nested children and no own properties is not output as standalone block', () => {
    const css = compileStyle(`
  .wrapper {
    .inner {
      margin: 0
    }
  }
`);
    // .wrapper has no own properties — only a flattened child rule should appear
    assert.ok(!css.match(/\.wrapper \{\s*\}/), 'Wrapper with no props should not generate empty block');
    assert.ok(css.includes('.wrapper .inner {'), 'Nested child rule should be present');
    assert.ok(css.includes('margin: 0;'), 'Nested property should be present');
  });

  test('flattenStyleRule skips rule with no properties (direct call)', () => {
    const fakeTransformer = { scopeId: null };
    const emptyRule = {
      selector: '.ghost',
      properties: [],
      nestedRules: []
    };
    const output = [];
    flattenStyleRule(fakeTransformer, emptyRule, '', output);
    // No CSS rule should be emitted for a rule with no properties and no nested rules
    assert.strictEqual(output.length, 0, 'Nothing should be emitted for an empty rule');
  });
});

// =============================================================================
// @layer with Nested Rules — Multiple Selectors
// =============================================================================

describe('@layer with nested rules — multiple selectors', () => {
  test('@layer block containing two selectors outputs both selectors', () => {
    const css = compileStyle(`
  @layer base {
    h1 {
      font-size: 2rem
    }
    p {
      line-height: 1.6
    }
  }
`);
    assert.ok(css.includes('@layer base'), '@layer name present');
    assert.ok(css.includes('h1'), 'First selector in layer present');
    assert.ok(css.includes('font-size: 2rem;'), 'First property present');
    assert.ok(css.includes('line-height: 1.6;'), 'Second property present');
  });

  test('@layer nested content appears after the @layer opening', () => {
    const css = compileStyle(`
  @layer base {
    .reset {
      margin: 0
      padding: 0
    }
  }
`);
    const layerIndex = css.indexOf('@layer base');
    const resetIndex = css.indexOf('.reset');
    assert.ok(layerIndex !== -1, '@layer base must be present');
    assert.ok(resetIndex > layerIndex, '.reset must appear after @layer base opening');
  });

  test('@layer block with three nested selectors outputs all three', () => {
    const css = compileStyle(`
  @layer typography {
    h1 {
      font-size: 2rem
    }
    h2 {
      font-size: 1.5rem
    }
    h3 {
      font-size: 1.25rem
    }
  }
`);
    assert.ok(css.includes('@layer typography'), '@layer name present');
    assert.ok(css.includes('font-size: 2rem;'), 'h1 font-size present');
    assert.ok(css.includes('font-size: 1.5rem;'), 'h2 font-size present');
    assert.ok(css.includes('font-size: 1.25rem;'), 'h3 font-size present');
  });
});

// =============================================================================
// Conditional Group Nesting — Single Level (what the parser actually supports)
// =============================================================================
//
// The Pulse CSS parser does not currently preserve nested @-rules as AST nodes
// when one conditional group is inside another — the inner @-rule's selector is
// lost and the inner plain selector is promoted directly. We therefore test what
// the compiler actually produces rather than what we wish it would.

describe('Conditional group at-rules (@media, @supports, @container)', () => {
  test('@media rule output has balanced braces', () => {
    const css = compileStyle(`
  @media print {
    .page {
      margin: 0
    }
  }
`);
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'Opening and closing braces must balance');
  });

  test('@supports rule output has balanced braces', () => {
    const css = compileStyle(`
  @supports (display: flex) {
    .flex {
      display: flex
    }
  }
`);
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'Opening and closing braces must balance');
  });

  test('@container rule output has balanced braces', () => {
    const css = compileStyle(`
  @container (min-width: 500px) {
    .item {
      font-size: 16px
    }
  }
`);
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'Opening and closing braces must balance');
  });

  test('@media wrapping multiple rules emits all nested selectors', () => {
    const css = compileStyle(`
  @media (max-width: 768px) {
    .header {
      padding: 8px
    }
    .footer {
      padding: 8px
    }
  }
`);
    assert.ok(css.includes('@media'), '@media present');
    assert.ok(css.includes('.header'), 'First nested selector present');
    assert.ok(css.includes('.footer'), 'Second nested selector present');
    assert.ok(css.includes('padding: 8px;'), 'Nested property present');
  });

  test('flattenStyleRule handles wrappers array for @media with nested rule', () => {
    // Test the wrappers-as-array path in flattenStyleRule directly
    const fakeTransformer = { scopeId: null };
    const innerRule = {
      selector: '.box',
      properties: [{ name: 'color', value: 'blue' }],
      nestedRules: []
    };
    const output = [];
    // Pass wrappers as an array (simulating nested conditional groups)
    flattenStyleRule(fakeTransformer, innerRule, '', output, ['@media (max-width: 768px)', '@supports (display: grid)'], false);
    const css = output.join('\n');

    assert.ok(css.includes('@media (max-width: 768px)'), 'First wrapper present');
    assert.ok(css.includes('@supports (display: grid)'), 'Second wrapper present');
    assert.ok(css.includes('.box'), 'Nested selector present');
    assert.ok(css.includes('color: blue;'), 'Nested property present');

    // Braces must balance
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'Braces must balance with array wrappers');
  });
});
