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

test('tokenizes import keywords', () => {
  const tokens = tokenize('import from as export slot');
  assert(tokens[0].type === 'IMPORT', 'Expected IMPORT token');
  assert(tokens[1].type === 'FROM', 'Expected FROM token');
  assert(tokens[2].type === 'AS', 'Expected AS token');
  assert(tokens[3].type === 'EXPORT', 'Expected EXPORT token');
  assert(tokens[4].type === 'SLOT', 'Expected SLOT token');
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

test('parses default import', () => {
  const source = `import Button from './Button.pulse'`;
  const ast = parse(source);
  assert(ast.imports.length === 1, 'Expected 1 import');
  assert(ast.imports[0].specifiers[0].type === 'default', 'Expected default import');
  assert(ast.imports[0].specifiers[0].local === 'Button', 'Expected Button');
  assert(ast.imports[0].source === './Button.pulse', 'Expected source');
});

test('parses named imports', () => {
  const source = `import { Header, Footer } from './components.pulse'`;
  const ast = parse(source);
  assert(ast.imports.length === 1, 'Expected 1 import');
  assert(ast.imports[0].specifiers.length === 2, 'Expected 2 specifiers');
  assert(ast.imports[0].specifiers[0].type === 'named', 'Expected named import');
  assert(ast.imports[0].specifiers[0].local === 'Header', 'Expected Header');
  assert(ast.imports[0].specifiers[1].local === 'Footer', 'Expected Footer');
});

test('parses aliased import', () => {
  const source = `import { Button as Btn } from './ui.pulse'`;
  const ast = parse(source);
  assert(ast.imports[0].specifiers[0].imported === 'Button', 'Expected imported name');
  assert(ast.imports[0].specifiers[0].local === 'Btn', 'Expected local alias');
});

test('parses namespace import', () => {
  const source = `import * as Icons from './icons.pulse'`;
  const ast = parse(source);
  assert(ast.imports[0].specifiers[0].type === 'namespace', 'Expected namespace import');
  assert(ast.imports[0].specifiers[0].local === 'Icons', 'Expected Icons');
});

test('parses slot element', () => {
  const source = `
view {
  div {
    slot
    slot "header"
  }
}`;
  const ast = parse(source);
  assert(ast.view !== null, 'Expected view block');
  const div = ast.view.children[0];
  assert(div.children.length === 2, 'Expected 2 children');
  assert(div.children[0].type === 'SlotElement', 'Expected SlotElement');
  assert(div.children[0].name === 'default', 'Expected default slot');
  assert(div.children[1].name === 'header', 'Expected named slot');
});

test('parses slot with fallback', () => {
  const source = `
view {
  slot "footer" {
    span "Default footer"
  }
}`;
  const ast = parse(source);
  const slot = ast.view.children[0];
  assert(slot.type === 'SlotElement', 'Expected SlotElement');
  assert(slot.name === 'footer', 'Expected footer slot');
  assert(slot.fallback.length === 1, 'Expected fallback content');
});

test('parses props block', () => {
  const source = `
props {
  label: "Default"
  disabled: false
  count: 0
}`;
  const ast = parse(source);
  assert(ast.props !== null, 'Expected props block');
  assert(ast.props.properties.length === 3, 'Expected 3 props');
  assert(ast.props.properties[0].name === 'label', 'Expected label prop');
  assert(ast.props.properties[1].name === 'disabled', 'Expected disabled prop');
  assert(ast.props.properties[2].name === 'count', 'Expected count prop');
});

test('parses component with props', () => {
  const source = `
import Button from './Button.pulse'

view {
  Button(label="Click me", disabled=false)
}`;
  const ast = parse(source);
  assert(ast.view !== null, 'Expected view block');
  const button = ast.view.children[0];
  assert(button.props.length === 2, 'Expected 2 props');
  assert(button.props[0].name === 'label', 'Expected label prop');
  assert(button.props[1].name === 'disabled', 'Expected disabled prop');
});

test('parses component props with expressions', () => {
  const source = `
import Button from './Button.pulse'

state {
  myLabel: "Test"
}

view {
  Button(label={myLabel}, count={5 + 3})
}`;
  const ast = parse(source);
  const button = ast.view.children[0];
  assert(button.props.length === 2, 'Expected 2 props');
  assert(button.props[0].value.type === 'Identifier', 'Expected Identifier for label');
  assert(button.props[1].value.type === 'BinaryExpression', 'Expected BinaryExpression for count');
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

test('compiles with imports', () => {
  const source = `
import Button from './Button.pulse'
import { Header } from './components.pulse'

@page MyComponent

view {
  div {
    Header
    Button "Click me"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes("import Button from './Button.js'"), 'Expected Button import');
  assert(result.code.includes("import { Header } from './components.js'"), 'Expected Header import');
});

test('compiles slots', () => {
  const source = `
@page Card

view {
  div.card {
    slot "header"
    slot
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('slots'), 'Expected slots reference');
});

test('compiles with CSS scoping', () => {
  const source = `
@page Scoped

view {
  div.container {
    span "Hello"
  }
}

style {
  .container {
    padding: 20px
  }
  .container span {
    color: red
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  // Check that scope ID is generated
  assert(result.code.includes('SCOPE_ID'), 'Expected SCOPE_ID constant');
  assert(result.code.includes('data-p-scope'), 'Expected scoped style attribute');
});

test('compiles without CSS scoping when disabled', () => {
  const source = `
@page Unscoped

view {
  div.container "Hello"
}

style {
  .container { padding: 10px }
}`;

  const result = compile(source, { scopeStyles: false });
  assert(result.success, 'Expected successful compilation');
  assert(!result.code.includes('SCOPE_ID'), 'Should not have SCOPE_ID');
});

test('error messages include line numbers', () => {
  const source = `
@page Test

state {
  count: 0
}

view {
  invalid syntax here
}`;

  const result = compile(source);
  // Should capture error with line info
  if (!result.success && result.errors.length > 0) {
    assert(result.errors[0].line !== undefined, 'Expected line number in error');
  }
});

test('compiles component with props', () => {
  const source = `
@page Button

props {
  label: "Click"
  disabled: false
}

view {
  button "{label}"
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('props'), 'Expected props parameter');
  assert(result.code.includes('label = "Click"'), 'Expected label default');
  assert(result.code.includes('disabled = false'), 'Expected disabled default');
});

test('compiles component call with props', () => {
  const source = `
import Button from './Button.pulse'

@page App

view {
  Button(label="Submit", disabled=true)
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('Button.render'), 'Expected Button.render call');
  assert(result.code.includes('props:'), 'Expected props in render call');
  assert(result.code.includes('label: "Submit"'), 'Expected label prop');
  assert(result.code.includes('disabled: true'), 'Expected disabled prop');
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
