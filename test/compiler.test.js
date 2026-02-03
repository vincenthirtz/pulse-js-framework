/**
 * Pulse Compiler Tests
 *
 * Tests for the .pulse file compiler (lexer, parser, transformer)
 *
 * @module test/compiler
 */

import { tokenize, parse, compile } from '../compiler/index.js';
import {
  test,
  assert,
  assertEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// Lexer Tests
// =============================================================================

printSection('Lexer Tests');

test('tokenizes keywords', () => {
  const tokens = tokenize('state view actions style');
  assertEqual(tokens[0].type, 'STATE', 'Expected STATE token');
  assertEqual(tokens[1].type, 'VIEW', 'Expected VIEW token');
  assertEqual(tokens[2].type, 'ACTIONS', 'Expected ACTIONS token');
  assertEqual(tokens[3].type, 'STYLE', 'Expected STYLE token');
});

test('tokenizes strings', () => {
  const tokens = tokenize('"hello world"');
  assertEqual(tokens[0].type, 'STRING', 'Expected STRING token');
  assertEqual(tokens[0].value, 'hello world', 'Expected string value');
});

test('tokenizes numbers', () => {
  const tokens = tokenize('42 3.14 1e10');
  assertEqual(tokens[0].type, 'NUMBER', 'Expected NUMBER token');
  assertEqual(tokens[0].value, 42, 'Expected 42');
  assertEqual(tokens[1].value, 3.14, 'Expected 3.14');
});

test('tokenizes operators', () => {
  const tokens = tokenize('+ - * / = == != < > <= >= && ||');
  assertEqual(tokens[0].type, 'PLUS', 'Expected PLUS');
  assertEqual(tokens[1].type, 'MINUS', 'Expected MINUS');
  assertEqual(tokens[4].type, 'EQ', 'Expected EQ');
  assertEqual(tokens[5].type, 'EQEQ', 'Expected EQEQ');
});

test('tokenizes punctuation', () => {
  const tokens = tokenize('{ } ( ) [ ] : , .');
  assertEqual(tokens[0].type, 'LBRACE', 'Expected LBRACE');
  assertEqual(tokens[1].type, 'RBRACE', 'Expected RBRACE');
  assertEqual(tokens[2].type, 'LPAREN', 'Expected LPAREN');
});

test('tokenizes @ symbol', () => {
  const tokens = tokenize('@page @route @if');
  assertEqual(tokens[0].type, 'AT', 'Expected AT');
  assertEqual(tokens[1].type, 'PAGE', 'Expected PAGE');
});

test('tokenizes import keywords', () => {
  const tokens = tokenize('import from as export slot');
  assertEqual(tokens[0].type, 'IMPORT', 'Expected IMPORT token');
  assertEqual(tokens[1].type, 'FROM', 'Expected FROM token');
  assertEqual(tokens[2].type, 'AS', 'Expected AS token');
  assertEqual(tokens[3].type, 'EXPORT', 'Expected EXPORT token');
  assertEqual(tokens[4].type, 'SLOT', 'Expected SLOT token');
});

// =============================================================================
// Parser Tests
// =============================================================================

printSection('Parser Tests');

test('parses page declaration', () => {
  const ast = parse('@page MyPage');
  assert(ast.page !== null, 'Expected page declaration');
  assertEqual(ast.page.name, 'MyPage', 'Expected page name');
});

test('parses route declaration', () => {
  const ast = parse('@route "/home"');
  assert(ast.route !== null, 'Expected route declaration');
  assertEqual(ast.route.path, '/home', 'Expected route path');
});

test('parses state block', () => {
  const ast = parse('state { count: 0 name: "test" }');
  assert(ast.state !== null, 'Expected state block');
  assertEqual(ast.state.properties.length, 2, 'Expected 2 properties');
  assertEqual(ast.state.properties[0].name, 'count', 'Expected count property');
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
  assertEqual(ast.actions.functions.length, 1, 'Expected 1 function');
  assertEqual(ast.actions.functions[0].name, 'increment', 'Expected increment function');
});

test('parses default import', () => {
  const source = `import Button from './Button.pulse'`;
  const ast = parse(source);
  assertEqual(ast.imports.length, 1, 'Expected 1 import');
  assertEqual(ast.imports[0].specifiers[0].type, 'default', 'Expected default import');
  assertEqual(ast.imports[0].specifiers[0].local, 'Button', 'Expected Button');
  assertEqual(ast.imports[0].source, './Button.pulse', 'Expected source');
});

test('parses named imports', () => {
  const source = `import { Header, Footer } from './components.pulse'`;
  const ast = parse(source);
  assertEqual(ast.imports.length, 1, 'Expected 1 import');
  assertEqual(ast.imports[0].specifiers.length, 2, 'Expected 2 specifiers');
  assertEqual(ast.imports[0].specifiers[0].type, 'named', 'Expected named import');
  assertEqual(ast.imports[0].specifiers[0].local, 'Header', 'Expected Header');
  assertEqual(ast.imports[0].specifiers[1].local, 'Footer', 'Expected Footer');
});

test('parses aliased import', () => {
  const source = `import { Button as Btn } from './ui.pulse'`;
  const ast = parse(source);
  assertEqual(ast.imports[0].specifiers[0].imported, 'Button', 'Expected imported name');
  assertEqual(ast.imports[0].specifiers[0].local, 'Btn', 'Expected local alias');
});

test('parses namespace import', () => {
  const source = `import * as Icons from './icons.pulse'`;
  const ast = parse(source);
  assertEqual(ast.imports[0].specifiers[0].type, 'namespace', 'Expected namespace import');
  assertEqual(ast.imports[0].specifiers[0].local, 'Icons', 'Expected Icons');
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
  assertEqual(div.children.length, 2, 'Expected 2 children');
  assertEqual(div.children[0].type, 'SlotElement', 'Expected SlotElement');
  assertEqual(div.children[0].name, 'default', 'Expected default slot');
  assertEqual(div.children[1].name, 'header', 'Expected named slot');
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
  assertEqual(slot.type, 'SlotElement', 'Expected SlotElement');
  assertEqual(slot.name, 'footer', 'Expected footer slot');
  assertEqual(slot.fallback.length, 1, 'Expected fallback content');
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
  assertEqual(ast.props.properties.length, 3, 'Expected 3 props');
  assertEqual(ast.props.properties[0].name, 'label', 'Expected label prop');
  assertEqual(ast.props.properties[1].name, 'disabled', 'Expected disabled prop');
  assertEqual(ast.props.properties[2].name, 'count', 'Expected count prop');
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
  assertEqual(button.props.length, 2, 'Expected 2 props');
  assertEqual(button.props[0].name, 'label', 'Expected label prop');
  assertEqual(button.props[1].name, 'disabled', 'Expected disabled prop');
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
  assertEqual(button.props.length, 2, 'Expected 2 props');
  assertEqual(button.props[0].value.type, 'Identifier', 'Expected Identifier for label');
  assertEqual(button.props[1].value.type, 'BinaryExpression', 'Expected BinaryExpression for count');
});

// =============================================================================
// Compiler Integration Tests
// =============================================================================

printSection('Compiler Tests');

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
// Router Tests
// =============================================================================

printSection('Router Tests');

test('tokenizes router keywords', () => {
  const tokens = tokenize('router routes mode base beforeEach afterEach');
  assertEqual(tokens[0].type, 'ROUTER', 'Expected ROUTER token');
  assertEqual(tokens[1].type, 'ROUTES', 'Expected ROUTES token');
  assertEqual(tokens[2].type, 'MODE', 'Expected MODE token');
  assertEqual(tokens[3].type, 'BASE', 'Expected BASE token');
  assertEqual(tokens[4].type, 'BEFORE_EACH', 'Expected BEFORE_EACH token');
  assertEqual(tokens[5].type, 'AFTER_EACH', 'Expected AFTER_EACH token');
});

test('parses router block', () => {
  const source = `
@page App

router {
  mode: "hash"
  routes {
    "/": HomePage
    "/about": AboutPage
  }
}`;
  const ast = parse(source);
  assert(ast.router !== null, 'Expected router block');
  assertEqual(ast.router.mode, 'hash', 'Expected hash mode');
  assertEqual(ast.router.routes.length, 2, 'Expected 2 routes');
  assertEqual(ast.router.routes[0].path, '/', 'Expected / path');
  assertEqual(ast.router.routes[0].handler, 'HomePage', 'Expected HomePage handler');
});

test('parses router with guards', () => {
  const source = `
@page App

router {
  mode: "history"
  routes {
    "/": HomePage
  }
  beforeEach(to, from) {
    console.log(to.path)
  }
}`;
  const ast = parse(source);
  assert(ast.router.beforeEach !== null, 'Expected beforeEach guard');
  assertEqual(ast.router.beforeEach.params.length, 2, 'Expected 2 params');
  assertEqual(ast.router.beforeEach.params[0], 'to', 'Expected to param');
  assertEqual(ast.router.beforeEach.params[1], 'from', 'Expected from param');
});

test('compiles router block', () => {
  const source = `
@page App

router {
  mode: "hash"
  routes {
    "/": HomePage
  }
}

view {
  div "Hello"
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('createRouter'), 'Expected createRouter import');
  assert(result.code.includes("mode: 'hash'"), 'Expected hash mode');
  assert(result.code.includes('router.start()'), 'Expected router start');
});

// =============================================================================
// Store Tests
// =============================================================================

printSection('Store Tests');

test('tokenizes store keywords', () => {
  const tokens = tokenize('store getters persist storageKey plugins');
  assertEqual(tokens[0].type, 'STORE', 'Expected STORE token');
  assertEqual(tokens[1].type, 'GETTERS', 'Expected GETTERS token');
  assertEqual(tokens[2].type, 'PERSIST', 'Expected PERSIST token');
  assertEqual(tokens[3].type, 'STORAGE_KEY', 'Expected STORAGE_KEY token');
  assertEqual(tokens[4].type, 'PLUGINS', 'Expected PLUGINS token');
});

test('parses store block', () => {
  const source = `
@page App

store {
  state {
    count: 0
    user: null
  }
  persist: true
  storageKey: "my-store"
}`;
  const ast = parse(source);
  assert(ast.store !== null, 'Expected store block');
  assertEqual(ast.store.state.properties.length, 2, 'Expected 2 state properties');
  assertEqual(ast.store.persist, true, 'Expected persist true');
  assertEqual(ast.store.storageKey, 'my-store', 'Expected storageKey');
});

test('parses store with getters and actions', () => {
  const source = `
@page App

store {
  state {
    count: 0
  }
  getters {
    doubled() { return this.count * 2 }
  }
  actions {
    increment() { this.count = this.count + 1 }
  }
}`;
  const ast = parse(source);
  assertEqual(ast.store.getters.getters.length, 1, 'Expected 1 getter');
  assertEqual(ast.store.getters.getters[0].name, 'doubled', 'Expected doubled getter');
  assertEqual(ast.store.actions.functions.length, 1, 'Expected 1 action');
  assertEqual(ast.store.actions.functions[0].name, 'increment', 'Expected increment action');
});

test('compiles store block', () => {
  const source = `
@page App

store {
  state {
    count: 0
  }
  actions {
    increment() { this.count = this.count + 1 }
  }
  persist: true
}

view {
  div "Hello"
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('createStore'), 'Expected createStore import');
  assert(result.code.includes('createActions'), 'Expected createActions import');
  assert(result.code.includes("persist: true"), 'Expected persist option');
  assert(result.code.includes('$store'), 'Expected $store combined object');
});

// =============================================================================
// Router Directive Tests
// =============================================================================

printSection('Router Directive Tests');

test('tokenizes view directives', () => {
  const tokens = tokenize('@link @outlet @navigate @back @forward');
  assertEqual(tokens[0].type, 'AT', 'Expected AT');
  assertEqual(tokens[1].type, 'LINK', 'Expected LINK');
  assertEqual(tokens[2].type, 'AT', 'Expected AT');
  assertEqual(tokens[3].type, 'OUTLET', 'Expected OUTLET');
  assertEqual(tokens[4].type, 'AT', 'Expected AT');
  assertEqual(tokens[5].type, 'NAVIGATE', 'Expected NAVIGATE');
});

test('parses @outlet directive', () => {
  const source = `
@page App

view {
  div {
    @outlet
  }
}`;
  const ast = parse(source);
  assert(ast.view !== null, 'Expected view block');
  // Find the outlet directive in the tree
  const div = ast.view.children[0];
  assert(div.children.length > 0, 'Expected children');
  assertEqual(div.children[0].type, 'OutletDirective', 'Expected OutletDirective');
});

test('compiles @outlet directive', () => {
  const source = `
@page App

router {
  mode: "hash"
  routes {
    "/": HomePage
  }
}

view {
  div {
    @outlet
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('router.outlet'), 'Expected router.outlet call');
});

// =============================================================================
// A11y Directive Tests
// =============================================================================

printSection('A11y Directive Tests');

test('tokenizes a11y keywords', () => {
  const tokens = tokenize('@a11y @live @focusTrap @srOnly');
  assertEqual(tokens[0].type, 'AT', 'Expected AT');
  assertEqual(tokens[1].type, 'IDENT', 'Expected IDENT (a11y)');
  assertEqual(tokens[1].value, 'a11y', 'Expected a11y value');
  assertEqual(tokens[2].type, 'AT', 'Expected AT');
  assertEqual(tokens[3].type, 'IDENT', 'Expected IDENT (live)');
  assertEqual(tokens[3].value, 'live', 'Expected live value');
});

test('parses @a11y directive', () => {
  const source = `
@page App

view {
  div @a11y(role=dialog, label="Modal window") {
    span "Content"
  }
}`;
  const ast = parse(source);
  assert(ast.view !== null, 'Expected view block');
  const div = ast.view.children[0];
  const a11yDirective = div.directives.find(d => d.type === 'A11yDirective');
  assert(a11yDirective !== undefined, 'Expected A11yDirective');
  assertEqual(a11yDirective.attrs.role, 'dialog', 'Expected role=dialog');
  assertEqual(a11yDirective.attrs.label, 'Modal window', 'Expected label');
});

test('parses @live directive', () => {
  const source = `
@page App

view {
  div @live(polite) {
    span "Status: OK"
  }
}`;
  const ast = parse(source);
  const div = ast.view.children[0];
  const liveDirective = div.directives.find(d => d.type === 'LiveDirective');
  assert(liveDirective !== undefined, 'Expected LiveDirective');
  assertEqual(liveDirective.priority, 'polite', 'Expected polite priority');
});

test('parses @live assertive', () => {
  const source = `
@page App

view {
  div @live(assertive) {
    span "Error!"
  }
}`;
  const ast = parse(source);
  const div = ast.view.children[0];
  const liveDirective = div.directives.find(d => d.type === 'LiveDirective');
  assertEqual(liveDirective.priority, 'assertive', 'Expected assertive priority');
});

test('parses @focusTrap directive', () => {
  const source = `
@page App

view {
  div @focusTrap {
    input
    button "Submit"
  }
}`;
  const ast = parse(source);
  const div = ast.view.children[0];
  const focusTrapDirective = div.directives.find(d => d.type === 'FocusTrapDirective');
  assert(focusTrapDirective !== undefined, 'Expected FocusTrapDirective');
});

test('parses @focusTrap with options', () => {
  const source = `
@page App

view {
  div @focusTrap(autoFocus=true, returnFocus=true) {
    input
  }
}`;
  const ast = parse(source);
  const div = ast.view.children[0];
  const focusTrapDirective = div.directives.find(d => d.type === 'FocusTrapDirective');
  assert(focusTrapDirective !== undefined, 'Expected FocusTrapDirective');
  assertEqual(focusTrapDirective.options.autoFocus, true, 'Expected autoFocus=true');
  assertEqual(focusTrapDirective.options.returnFocus, true, 'Expected returnFocus=true');
});

test('parses @srOnly directive', () => {
  const source = `
@page App

view {
  span @srOnly "Screen reader only text"
}`;
  const ast = parse(source);
  const span = ast.view.children[0];
  const a11yDirective = span.directives.find(d => d.type === 'A11yDirective');
  assert(a11yDirective !== undefined, 'Expected A11yDirective (srOnly)');
  assertEqual(a11yDirective.attrs.srOnly, true, 'Expected srOnly=true');
});

test('compiles @a11y directive to aria attributes', () => {
  const source = `
@page App

view {
  div @a11y(role=dialog, label="Modal") {
    span "Content"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  // Should add aria attributes to selector
  assert(
    result.code.includes('[role=dialog]') || result.code.includes("'role': 'dialog'"),
    'Expected role attribute'
  );
  assert(
    result.code.includes('[aria-label=Modal]') || result.code.includes("'aria-label': 'Modal'"),
    'Expected aria-label attribute'
  );
});

test('compiles @live directive to aria-live', () => {
  const source = `
@page App

view {
  div @live(polite) {
    span "Status"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  // Should add aria-live attribute
  assert(result.code.includes('[aria-live=polite]'), 'Expected aria-live=polite');
  assert(result.code.includes('[aria-atomic=true]'), 'Expected aria-atomic=true');
});

test('compiles @focusTrap directive', () => {
  const source = `
@page App

view {
  div @focusTrap {
    input
    button "Close"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  // Should wrap with trapFocus
  assert(result.code.includes('trapFocus'), 'Expected trapFocus call');
  // Should import trapFocus from a11y
  assert(result.code.includes("from 'pulse-js-framework/runtime/a11y'"), 'Expected a11y import');
});

test('compiles @srOnly directive', () => {
  const source = `
@page App

view {
  span @srOnly "Skip to content"
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  // Should wrap with srOnly
  assert(result.code.includes('srOnly('), 'Expected srOnly call');
  // Should import srOnly from a11y
  assert(result.code.includes("from 'pulse-js-framework/runtime/a11y'"), 'Expected a11y import');
});

test('compiles combined a11y directives', () => {
  const source = `
@page Modal

view {
  div @a11y(role=dialog, modal=true) @focusTrap(autoFocus=true) {
    h2 "Dialog Title"
    p "Dialog content"
    button @a11y(label="Close dialog") "×"
  }
}`;

  const result = compile(source);
  assert(result.success, 'Expected successful compilation');
  assert(result.code.includes('[role=dialog]'), 'Expected role=dialog');
  assert(result.code.includes('[aria-modal=true]'), 'Expected aria-modal=true');
  assert(result.code.includes('trapFocus'), 'Expected trapFocus');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
