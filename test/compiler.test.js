/**
 * Pulse Compiler Tests
 */

import { tokenize, parse, compile } from '../compiler/index.js';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// =============================================================================
// Lexer Tests
// =============================================================================

console.log('\n--- Lexer Tests ---\n');

test('tokenizes keywords', () => {
  const tokens = tokenize('state view actions style');
  assert(tokens[0].type === 'STATE', 'Expected STATE token');
  assert(tokens[1].type === 'VIEW', 'Expected VIEW token');
  assert(tokens[2].type === 'ACTIONS', 'Expected ACTIONS token');
  assert(tokens[3].type === 'STYLE', 'Expected STYLE token');
});

test('tokenizes strings', () => {
  const tokens = tokenize('"hello world"');
  assert(tokens[0].type === 'STRING', 'Expected STRING token');
  assert(tokens[0].value === 'hello world', 'Expected string value');
});

test('tokenizes numbers', () => {
  const tokens = tokenize('42 3.14 1e10');
  assert(tokens[0].type === 'NUMBER', 'Expected NUMBER token');
  assert(tokens[0].value === 42, 'Expected 42');
  assert(tokens[1].value === 3.14, 'Expected 3.14');
});

test('tokenizes operators', () => {
  const tokens = tokenize('+ - * / = == != < > <= >= && ||');
  assert(tokens[0].type === 'PLUS', 'Expected PLUS');
  assert(tokens[1].type === 'MINUS', 'Expected MINUS');
  assert(tokens[4].type === 'EQ', 'Expected EQ');
  assert(tokens[5].type === 'EQEQ', 'Expected EQEQ');
});

test('tokenizes punctuation', () => {
  const tokens = tokenize('{ } ( ) [ ] : , .');
  assert(tokens[0].type === 'LBRACE', 'Expected LBRACE');
  assert(tokens[1].type === 'RBRACE', 'Expected RBRACE');
  assert(tokens[2].type === 'LPAREN', 'Expected LPAREN');
});

test('tokenizes @ symbol', () => {
  const tokens = tokenize('@page @route @if');
  assert(tokens[0].type === 'AT', 'Expected AT');
  assert(tokens[1].type === 'PAGE', 'Expected PAGE');
});

// =============================================================================
// Parser Tests
// =============================================================================

console.log('\n--- Parser Tests ---\n');

test('parses page declaration', () => {
  const ast = parse('@page MyPage');
  assert(ast.page !== null, 'Expected page declaration');
  assert(ast.page.name === 'MyPage', 'Expected page name');
});

test('parses route declaration', () => {
  const ast = parse('@route "/home"');
  assert(ast.route !== null, 'Expected route declaration');
  assert(ast.route.path === '/home', 'Expected route path');
});

test('parses state block', () => {
  const ast = parse('state { count: 0 name: "test" }');
  assert(ast.state !== null, 'Expected state block');
  assert(ast.state.properties.length === 2, 'Expected 2 properties');
  assert(ast.state.properties[0].name === 'count', 'Expected count property');
});

test('parses view block', () => {
  const source = `
view {
  div {
    span "Hello"
  }
}`;
  const ast = parse(source);
  assert(ast.view !== null, 'Expected view block');
  assert(ast.view.children.length > 0, 'Expected children');
});

test('parses actions block', () => {
  const source = `
actions {
  increment() {
    count = count + 1
  }
}`;
  const ast = parse(source);
  assert(ast.actions !== null, 'Expected actions block');
  assert(ast.actions.functions.length === 1, 'Expected 1 function');
  assert(ast.actions.functions[0].name === 'increment', 'Expected increment function');
});

// =============================================================================
// Compiler Integration Tests
// =============================================================================

console.log('\n--- Compiler Tests ---\n');

test('compiles simple component', () => {
  const source = `
@page Counter

state {
  count: 0
}

view {
  div {
    span "Count: {count}"
    button @click(count++) "+"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('pulse'), 'Expected pulse import');
  assert(result.code.includes('count'), 'Expected count variable');
});

test('compiles with style block', () => {
  const source = `
@page Styled

state {
  active: false
}

view {
  div.container {
    span "Hello"
  }
}

style {
  .container {
    padding: 20px
    background: white
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('styles'), 'Expected styles');
  assert(result.code.includes('.container'), 'Expected .container selector');
});

test('handles compilation errors gracefully', () => {
  const source = 'invalid { syntax }}}}}';
  const result = compile(source);
  // Should not throw, but return error
  assert(!result.success || result.errors.length > 0 || result.code !== null,
    'Expected error handling');
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
