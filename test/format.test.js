/**
 * Format Command Tests
 */

import { strict as assert } from 'node:assert';
import { PulseFormatter, FormatOptions } from '../cli/format.js';
import { parse } from '../compiler/index.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

// Helper function
function format(source, options = {}) {
  const ast = parse(source);
  const formatter = new PulseFormatter(ast, options);
  return formatter.format();
}

console.log('\n--- Format Tests ---\n');

// =============================================================================
// Basic Formatting Tests
// =============================================================================

test('formats page declaration', () => {
  const source = `@page Test\nview { div "hello" }`;
  const formatted = format(source);

  assert(formatted.includes('@page Test'), 'Should include page declaration');
  assert(formatted.includes('view {'), 'Should include view block');
});

test('formats with consistent indentation', () => {
  const source = `@page Test
state{count:0}
view{div{span"Hello"}}`;

  const formatted = format(source);

  assert(formatted.includes('state {'), 'State block should have space before brace');
  assert(formatted.includes('  count: 0'), 'State properties should be indented');
  assert(formatted.includes('view {'), 'View block should have space before brace');
  assert(formatted.includes('  div {'), 'Elements should be indented');
});

test('formats nested elements', () => {
  const source = `@page Test
view { div { span { p "text" } } }`;

  const formatted = format(source);
  const lines = formatted.split('\n');

  // Check indentation levels
  const divLine = lines.find(l => l.includes('div {'));
  const spanLine = lines.find(l => l.includes('span {'));

  assert(divLine, 'Should have div element');
  assert(spanLine, 'Should have span element');
});

// =============================================================================
// Import Formatting Tests
// =============================================================================

test('sorts imports alphabetically', () => {
  const source = `
import Z from './Z.pulse'
import A from './A.pulse'
import M from './M.pulse'

@page Test

view { div "test" }`;

  const formatted = format(source, { sortImports: true });

  const aIndex = formatted.indexOf("import A");
  const mIndex = formatted.indexOf("import M");
  const zIndex = formatted.indexOf("import Z");

  assert(aIndex < mIndex, 'A should come before M');
  assert(mIndex < zIndex, 'M should come before Z');
});

test('formats named imports', () => {
  const source = `import { Header, Footer } from './components.pulse'
@page Test
view { div "test" }`;

  const formatted = format(source);

  assert(formatted.includes('import { Header, Footer }'), 'Should format named imports');
  assert(formatted.includes("from './components.pulse'"), 'Should include source');
});

test('formats aliased imports', () => {
  const source = `import { Button as Btn } from './ui.pulse'
@page Test
view { div "test" }`;

  const formatted = format(source);

  assert(formatted.includes('Button as Btn'), 'Should format aliased import');
});

test('formats namespace imports', () => {
  const source = `import * as Icons from './icons.pulse'
@page Test
view { div "test" }`;

  const formatted = format(source);

  assert(formatted.includes('* as Icons'), 'Should format namespace import');
});

// =============================================================================
// State Block Formatting Tests
// =============================================================================

test('formats state block with values', () => {
  const source = `@page Test
state { count: 0 name: "test" active: true }
view { div "test" }`;

  const formatted = format(source);

  assert(formatted.includes('state {'), 'Should have state block');
  assert(formatted.includes('  count: 0'), 'Should format number');
  assert(formatted.includes('name: "test"'), 'Should format string');
  assert(formatted.includes('active: true'), 'Should format boolean');
});

// =============================================================================
// View Block Formatting Tests
// =============================================================================

test('formats element with selector', () => {
  const source = `@page Test

view {
  div.container "Hello"
}`;

  const formatted = format(source);

  assert(formatted.includes('div'), 'Should format element');
});

test('formats element with directives', () => {
  const source = `@page Test

state {
  count: 0
}

view {
  button @click(count++) "Click"
}`;

  const formatted = format(source);

  assert(formatted.includes('button'), 'Should format button element');
});

test('formats nested elements', () => {
  const source = `@page Test

view {
  div.outer {
    div.inner "text"
  }
}`;

  const formatted = format(source);

  assert(formatted.includes('div'), 'Should format nested elements');
});

test('formats multiple elements', () => {
  const source = `@page Test

view {
  div {
    p "First"
    p "Second"
  }
}`;

  const formatted = format(source);

  assert(formatted.includes('p'), 'Should format p elements');
});

test('formats slot element', () => {
  const source = `@page Test
view { slot }`;

  const formatted = format(source);

  assert(formatted.includes('slot'), 'Should format default slot');
});

test('formats named slot', () => {
  const source = `@page Test
view { slot "header" }`;

  const formatted = format(source);

  assert(formatted.includes('slot "header"'), 'Should format named slot');
});

// =============================================================================
// Style Block Formatting Tests
// =============================================================================

test('formats style block', () => {
  const source = `@page Test

view {
  div "test"
}

style {
  .container {
    padding: 20px
  }
}`;

  const formatted = format(source);

  assert(formatted.includes('style {'), 'Should have style block');
  assert(formatted.includes('.container'), 'Should have selector');
  assert(formatted.includes('padding'), 'Should have property');
});

// =============================================================================
// Roundtrip Tests
// =============================================================================

test('preserves semantic meaning after formatting', () => {
  const source = `@page Counter

state {
  count: 0
}

view {
  div "test"
}`;

  const formatted = format(source);
  const reparsed = parse(formatted);

  assert.equal(reparsed.page.name, 'Counter', 'Should preserve page name');
  assert.equal(reparsed.state.properties[0].name, 'count', 'Should preserve state');
});

// =============================================================================
// FormatOptions Tests
// =============================================================================

test('FormatOptions has correct defaults', () => {
  assert.equal(FormatOptions.indentSize, 2);
  assert.equal(FormatOptions.sortImports, true);
  assert.equal(FormatOptions.insertFinalNewline, true);
});

// =============================================================================
// Results
// =============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
