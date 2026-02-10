/**
 * Pulse Compiler Tests
 *
 * Tests for the .pulse file compiler (lexer, parser, transformer)
 *
 * @module test/compiler
 */

import { tokenize, parse, compile } from '../compiler/index.js';
import { test, describe } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Lexer Tests
// =============================================================================

describe('Lexer Tests', () => {

  test('tokenizes keywords', () => {
    const tokens = tokenize('state view actions style');
    assert.strictEqual(tokens[0].type, 'STATE', 'Expected STATE token');
    assert.strictEqual(tokens[1].type, 'VIEW', 'Expected VIEW token');
    assert.strictEqual(tokens[2].type, 'ACTIONS', 'Expected ACTIONS token');
    assert.strictEqual(tokens[3].type, 'STYLE', 'Expected STYLE token');
  });

  test('tokenizes strings', () => {
    const tokens = tokenize('"hello world"');
    assert.strictEqual(tokens[0].type, 'STRING', 'Expected STRING token');
    assert.strictEqual(tokens[0].value, 'hello world', 'Expected string value');
  });

  test('tokenizes numbers', () => {
    const tokens = tokenize('42 3.14 1e10');
    assert.strictEqual(tokens[0].type, 'NUMBER', 'Expected NUMBER token');
    assert.strictEqual(tokens[0].value, 42, 'Expected 42');
    assert.strictEqual(tokens[1].value, 3.14, 'Expected 3.14');
  });

  test('tokenizes operators', () => {
    const tokens = tokenize('+ - * / = == != < > <= >= && ||');
    assert.strictEqual(tokens[0].type, 'PLUS', 'Expected PLUS');
    assert.strictEqual(tokens[1].type, 'MINUS', 'Expected MINUS');
    assert.strictEqual(tokens[4].type, 'EQ', 'Expected EQ');
    assert.strictEqual(tokens[5].type, 'EQEQ', 'Expected EQEQ');
  });

  test('tokenizes punctuation', () => {
    const tokens = tokenize('{ } ( ) [ ] : , .');
    assert.strictEqual(tokens[0].type, 'LBRACE', 'Expected LBRACE');
    assert.strictEqual(tokens[1].type, 'RBRACE', 'Expected RBRACE');
    assert.strictEqual(tokens[2].type, 'LPAREN', 'Expected LPAREN');
  });

  test('tokenizes @ symbol', () => {
    const tokens = tokenize('@page @route @if');
    assert.strictEqual(tokens[0].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[1].type, 'PAGE', 'Expected PAGE');
  });

  test('tokenizes import keywords', () => {
    const tokens = tokenize('import from as export slot');
    assert.strictEqual(tokens[0].type, 'IMPORT', 'Expected IMPORT token');
    assert.strictEqual(tokens[1].type, 'FROM', 'Expected FROM token');
    assert.strictEqual(tokens[2].type, 'AS', 'Expected AS token');
    assert.strictEqual(tokens[3].type, 'EXPORT', 'Expected EXPORT token');
    assert.strictEqual(tokens[4].type, 'SLOT', 'Expected SLOT token');
  });

});

// =============================================================================
// Parser Tests
// =============================================================================

describe('Parser Tests', () => {

  test('parses page declaration', () => {
    const ast = parse('@page MyPage');
    assert.ok(ast.page !== null, 'Expected page declaration');
    assert.strictEqual(ast.page.name, 'MyPage', 'Expected page name');
  });

  test('parses route declaration', () => {
    const ast = parse('@route "/home"');
    assert.ok(ast.route !== null, 'Expected route declaration');
    assert.strictEqual(ast.route.path, '/home', 'Expected route path');
  });

  test('parses state block', () => {
    const ast = parse('state { count: 0 name: "test" }');
    assert.ok(ast.state !== null, 'Expected state block');
    assert.strictEqual(ast.state.properties.length, 2, 'Expected 2 properties');
    assert.strictEqual(ast.state.properties[0].name, 'count', 'Expected count property');
  });

  test('parses view block', () => {
    const source = `
view {
  div {
    span "Hello"
  }
}`;
    const ast = parse(source);
    assert.ok(ast.view !== null, 'Expected view block');
    assert.ok(ast.view.children.length > 0, 'Expected children');
  });

  test('parses actions block', () => {
    const source = `
actions {
  increment() {
    count = count + 1
  }
}`;
    const ast = parse(source);
    assert.ok(ast.actions !== null, 'Expected actions block');
    assert.strictEqual(ast.actions.functions.length, 1, 'Expected 1 function');
    assert.strictEqual(ast.actions.functions[0].name, 'increment', 'Expected increment function');
  });

  test('parses default import', () => {
    const source = `import Button from './Button.pulse'`;
    const ast = parse(source);
    assert.strictEqual(ast.imports.length, 1, 'Expected 1 import');
    assert.strictEqual(ast.imports[0].specifiers[0].type, 'default', 'Expected default import');
    assert.strictEqual(ast.imports[0].specifiers[0].local, 'Button', 'Expected Button');
    assert.strictEqual(ast.imports[0].source, './Button.pulse', 'Expected source');
  });

  test('parses named imports', () => {
    const source = `import { Header, Footer } from './components.pulse'`;
    const ast = parse(source);
    assert.strictEqual(ast.imports.length, 1, 'Expected 1 import');
    assert.strictEqual(ast.imports[0].specifiers.length, 2, 'Expected 2 specifiers');
    assert.strictEqual(ast.imports[0].specifiers[0].type, 'named', 'Expected named import');
    assert.strictEqual(ast.imports[0].specifiers[0].local, 'Header', 'Expected Header');
    assert.strictEqual(ast.imports[0].specifiers[1].local, 'Footer', 'Expected Footer');
  });

  test('parses aliased import', () => {
    const source = `import { Button as Btn } from './ui.pulse'`;
    const ast = parse(source);
    assert.strictEqual(ast.imports[0].specifiers[0].imported, 'Button', 'Expected imported name');
    assert.strictEqual(ast.imports[0].specifiers[0].local, 'Btn', 'Expected local alias');
  });

  test('parses namespace import', () => {
    const source = `import * as Icons from './icons.pulse'`;
    const ast = parse(source);
    assert.strictEqual(ast.imports[0].specifiers[0].type, 'namespace', 'Expected namespace import');
    assert.strictEqual(ast.imports[0].specifiers[0].local, 'Icons', 'Expected Icons');
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
    assert.ok(ast.view !== null, 'Expected view block');
    const div = ast.view.children[0];
    assert.strictEqual(div.children.length, 2, 'Expected 2 children');
    assert.strictEqual(div.children[0].type, 'SlotElement', 'Expected SlotElement');
    assert.strictEqual(div.children[0].name, 'default', 'Expected default slot');
    assert.strictEqual(div.children[1].name, 'header', 'Expected named slot');
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
    assert.strictEqual(slot.type, 'SlotElement', 'Expected SlotElement');
    assert.strictEqual(slot.name, 'footer', 'Expected footer slot');
    assert.strictEqual(slot.fallback.length, 1, 'Expected fallback content');
  });

  test('parses props block', () => {
    const source = `
props {
  label: "Default"
  disabled: false
  count: 0
}`;
    const ast = parse(source);
    assert.ok(ast.props !== null, 'Expected props block');
    assert.strictEqual(ast.props.properties.length, 3, 'Expected 3 props');
    assert.strictEqual(ast.props.properties[0].name, 'label', 'Expected label prop');
    assert.strictEqual(ast.props.properties[1].name, 'disabled', 'Expected disabled prop');
    assert.strictEqual(ast.props.properties[2].name, 'count', 'Expected count prop');
  });

  test('parses component with props', () => {
    const source = `
import Button from './Button.pulse'

view {
  Button(label="Click me", disabled=false)
}`;
    const ast = parse(source);
    assert.ok(ast.view !== null, 'Expected view block');
    const button = ast.view.children[0];
    assert.strictEqual(button.props.length, 2, 'Expected 2 props');
    assert.strictEqual(button.props[0].name, 'label', 'Expected label prop');
    assert.strictEqual(button.props[1].name, 'disabled', 'Expected disabled prop');
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
    assert.strictEqual(button.props.length, 2, 'Expected 2 props');
    assert.strictEqual(button.props[0].value.type, 'Identifier', 'Expected Identifier for label');
    assert.strictEqual(button.props[1].value.type, 'BinaryExpression', 'Expected BinaryExpression for count');
  });

});

// =============================================================================
// Compiler Integration Tests
// =============================================================================

describe('Compiler Tests', () => {

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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('pulse'), 'Expected pulse import');
    assert.ok(result.code.includes('count'), 'Expected count variable');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('styles'), 'Expected styles');
    assert.ok(result.code.includes('.container'), 'Expected .container selector');
  });

  test('handles compilation errors gracefully', () => {
    const source = 'invalid { syntax }}}}}';
    const result = compile(source);
    // Should not throw, but return error
    assert.ok(!result.success || result.errors.length > 0 || result.code !== null,
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("import Button from './Button.js'"), 'Expected Button import');
    assert.ok(result.code.includes("import { Header } from './components.js'"), 'Expected Header import');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('slots'), 'Expected slots reference');
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
    assert.ok(result.success, 'Expected successful compilation');
    // Check that scope ID is generated
    assert.ok(result.code.includes('SCOPE_ID'), 'Expected SCOPE_ID constant');
    assert.ok(result.code.includes('data-p-scope'), 'Expected scoped style attribute');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(!result.code.includes('SCOPE_ID'), 'Should not have SCOPE_ID');
  });

  test('compiles nested CSS with combined selectors', () => {
    const source = `
@page NestedCSS

view {
  div.counter "Test"
}

style {
  .counter {
    padding: 20px

    p {
      margin: 0
    }

    .buttons {
      display: flex

      button {
        padding: 10px
      }
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');

    // Check that nested selectors are combined with parent
    assert.ok(result.code.includes('.counter p'), 'Expected .counter p combined selector');
    assert.ok(result.code.includes('.counter .buttons'), 'Expected .counter .buttons combined selector');
    assert.ok(result.code.includes('.counter .buttons button'), 'Expected .counter .buttons button combined selector');

    // Ensure properties are in correct rules
    assert.ok(result.code.includes('padding: 20px'), 'Expected padding in .counter');
    assert.ok(result.code.includes('margin: 0'), 'Expected margin in .counter p');
    assert.ok(result.code.includes('display: flex'), 'Expected display in .counter .buttons');
  });

  test('compiles nested CSS with & parent selector', () => {
    const source = `
@page ParentSelector

view {
  button.btn "Click"
}

style {
  .btn {
    color: blue

    &:hover {
      color: red
    }

    &.active {
      font-weight: bold
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');

    // Check that & is replaced with parent selector
    assert.ok(result.code.includes('.btn:hover'), 'Expected .btn:hover (& replaced)');
    assert.ok(result.code.includes('.btn.active'), 'Expected .btn.active (& replaced)');
  });

  test('compiles deeply nested CSS', () => {
    const source = `
@page DeepNesting

view {
  div.app "Test"
}

style {
  .app {
    padding: 10px

    .header {
      height: 60px

      .nav {
        display: flex

        .link {
          color: blue
        }
      }
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');

    // Check deeply nested selectors are combined correctly
    assert.ok(result.code.includes('.app .header'), 'Expected .app .header');
    assert.ok(result.code.includes('.app .header .nav'), 'Expected .app .header .nav');
    assert.ok(result.code.includes('.app .header .nav .link'), 'Expected .app .header .nav .link');
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
      assert.ok(result.errors[0].line !== undefined, 'Expected line number in error');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('props'), 'Expected props parameter');
    // Props are now extracted via useProp() for reactive prop support
    assert.ok(result.code.includes('useProp(props, \'label\', "Click")'), 'Expected useProp for label');
    assert.ok(result.code.includes('useProp(props, \'disabled\', false)'), 'Expected useProp for disabled');
  });

  test('compiles component call with props', () => {
    const source = `
import Button from './Button.pulse'

@page App

view {
  Button(label="Submit", disabled=true)
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('Button.render'), 'Expected Button.render call');
    assert.ok(result.code.includes('props:'), 'Expected props in render call');
    assert.ok(result.code.includes('label: "Submit"'), 'Expected label prop');
    assert.ok(result.code.includes('disabled: true'), 'Expected disabled prop');
  });

});

// =============================================================================
// Router Tests
// =============================================================================

describe('Router Tests', () => {

  test('tokenizes router keywords', () => {
    const tokens = tokenize('router routes mode base beforeEach afterEach');
    assert.strictEqual(tokens[0].type, 'ROUTER', 'Expected ROUTER token');
    assert.strictEqual(tokens[1].type, 'ROUTES', 'Expected ROUTES token');
    assert.strictEqual(tokens[2].type, 'MODE', 'Expected MODE token');
    assert.strictEqual(tokens[3].type, 'BASE', 'Expected BASE token');
    assert.strictEqual(tokens[4].type, 'BEFORE_EACH', 'Expected BEFORE_EACH token');
    assert.strictEqual(tokens[5].type, 'AFTER_EACH', 'Expected AFTER_EACH token');
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
    assert.ok(ast.router !== null, 'Expected router block');
    assert.strictEqual(ast.router.mode, 'hash', 'Expected hash mode');
    assert.strictEqual(ast.router.routes.length, 2, 'Expected 2 routes');
    assert.strictEqual(ast.router.routes[0].path, '/', 'Expected / path');
    assert.strictEqual(ast.router.routes[0].handler, 'HomePage', 'Expected HomePage handler');
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
    assert.ok(ast.router.beforeEach !== null, 'Expected beforeEach guard');
    assert.strictEqual(ast.router.beforeEach.params.length, 2, 'Expected 2 params');
    assert.strictEqual(ast.router.beforeEach.params[0], 'to', 'Expected to param');
    assert.strictEqual(ast.router.beforeEach.params[1], 'from', 'Expected from param');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('createRouter'), 'Expected createRouter import');
    assert.ok(result.code.includes("mode: 'hash'"), 'Expected hash mode');
    assert.ok(result.code.includes('router.start()'), 'Expected router start');
  });

});

// =============================================================================
// Store Tests
// =============================================================================

describe('Store Tests', () => {

  test('tokenizes store keywords', () => {
    const tokens = tokenize('store getters persist storageKey plugins');
    assert.strictEqual(tokens[0].type, 'STORE', 'Expected STORE token');
    assert.strictEqual(tokens[1].type, 'GETTERS', 'Expected GETTERS token');
    assert.strictEqual(tokens[2].type, 'PERSIST', 'Expected PERSIST token');
    assert.strictEqual(tokens[3].type, 'STORAGE_KEY', 'Expected STORAGE_KEY token');
    assert.strictEqual(tokens[4].type, 'PLUGINS', 'Expected PLUGINS token');
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
    assert.ok(ast.store !== null, 'Expected store block');
    assert.strictEqual(ast.store.state.properties.length, 2, 'Expected 2 state properties');
    assert.strictEqual(ast.store.persist, true, 'Expected persist true');
    assert.strictEqual(ast.store.storageKey, 'my-store', 'Expected storageKey');
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
    assert.strictEqual(ast.store.getters.getters.length, 1, 'Expected 1 getter');
    assert.strictEqual(ast.store.getters.getters[0].name, 'doubled', 'Expected doubled getter');
    assert.strictEqual(ast.store.actions.functions.length, 1, 'Expected 1 action');
    assert.strictEqual(ast.store.actions.functions[0].name, 'increment', 'Expected increment action');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('createStore'), 'Expected createStore import');
    assert.ok(result.code.includes('createActions'), 'Expected createActions import');
    assert.ok(result.code.includes("persist: true"), 'Expected persist option');
    assert.ok(result.code.includes('$store'), 'Expected $store combined object');
  });

});

// =============================================================================
// Router Directive Tests
// =============================================================================

describe('Router Directive Tests', () => {

  test('tokenizes view directives', () => {
    const tokens = tokenize('@link @outlet @navigate @back @forward');
    assert.strictEqual(tokens[0].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[1].type, 'LINK', 'Expected LINK');
    assert.strictEqual(tokens[2].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[3].type, 'OUTLET', 'Expected OUTLET');
    assert.strictEqual(tokens[4].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[5].type, 'NAVIGATE', 'Expected NAVIGATE');
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
    assert.ok(ast.view !== null, 'Expected view block');
    // Find the outlet directive in the tree
    const div = ast.view.children[0];
    assert.ok(div.children.length > 0, 'Expected children');
    assert.strictEqual(div.children[0].type, 'OutletDirective', 'Expected OutletDirective');
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
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('router.outlet'), 'Expected router.outlet call');
  });

});

// =============================================================================
// A11y Directive Tests
// =============================================================================

describe('A11y Directive Tests', () => {

  test('tokenizes a11y keywords', () => {
    const tokens = tokenize('@a11y @live @focusTrap @srOnly');
    assert.strictEqual(tokens[0].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[1].type, 'IDENT', 'Expected IDENT (a11y)');
    assert.strictEqual(tokens[1].value, 'a11y', 'Expected a11y value');
    assert.strictEqual(tokens[2].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[3].type, 'IDENT', 'Expected IDENT (live)');
    assert.strictEqual(tokens[3].value, 'live', 'Expected live value');
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
    assert.ok(ast.view !== null, 'Expected view block');
    const div = ast.view.children[0];
    const a11yDirective = div.directives.find(d => d.type === 'A11yDirective');
    assert.ok(a11yDirective !== undefined, 'Expected A11yDirective');
    assert.strictEqual(a11yDirective.attrs.role, 'dialog', 'Expected role=dialog');
    assert.strictEqual(a11yDirective.attrs.label, 'Modal window', 'Expected label');
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
    assert.ok(liveDirective !== undefined, 'Expected LiveDirective');
    assert.strictEqual(liveDirective.priority, 'polite', 'Expected polite priority');
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
    assert.strictEqual(liveDirective.priority, 'assertive', 'Expected assertive priority');
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
    assert.ok(focusTrapDirective !== undefined, 'Expected FocusTrapDirective');
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
    assert.ok(focusTrapDirective !== undefined, 'Expected FocusTrapDirective');
    assert.strictEqual(focusTrapDirective.options.autoFocus, true, 'Expected autoFocus=true');
    assert.strictEqual(focusTrapDirective.options.returnFocus, true, 'Expected returnFocus=true');
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
    assert.ok(a11yDirective !== undefined, 'Expected A11yDirective (srOnly)');
    assert.strictEqual(a11yDirective.attrs.srOnly, true, 'Expected srOnly=true');
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
    assert.ok(result.success, 'Expected successful compilation');
    // Should add aria attributes to selector
    assert.ok(
      result.code.includes('[role=dialog]') || result.code.includes("'role': 'dialog'"),
      'Expected role attribute'
    );
    assert.ok(
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
    assert.ok(result.success, 'Expected successful compilation');
    // Should add aria-live attribute in attrs object
    assert.ok(result.code.includes("'aria-live': 'polite'"), 'Expected aria-live=polite');
    assert.ok(result.code.includes("'aria-atomic': 'true'"), 'Expected aria-atomic=true');
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
    assert.ok(result.success, 'Expected successful compilation');
    // Should wrap with trapFocus
    assert.ok(result.code.includes('trapFocus'), 'Expected trapFocus call');
    // Should import trapFocus from a11y
    assert.ok(result.code.includes("from 'pulse-js-framework/runtime/a11y'"), 'Expected a11y import');
  });

  test('compiles @srOnly directive', () => {
    const source = `
@page App

view {
  span @srOnly "Skip to content"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should wrap with srOnly
    assert.ok(result.code.includes('srOnly('), 'Expected srOnly call');
    // Should import srOnly from a11y
    assert.ok(result.code.includes("from 'pulse-js-framework/runtime/a11y'"), 'Expected a11y import');
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
    assert.ok(result.success, 'Expected successful compilation');
    // Attributes now in attrs object, not selector
    assert.ok(result.code.includes("'role': 'dialog'"), 'Expected role=dialog');
    assert.ok(result.code.includes("'aria-modal': 'true'"), 'Expected aria-modal=true');
    assert.ok(result.code.includes('trapFocus'), 'Expected trapFocus');
  });

});

// =============================================================================
// Event Modifier Tests
// =============================================================================

describe('Event Modifier Tests', () => {

  test('tokenizes event modifiers', () => {
    const tokens = tokenize('@click.prevent.stop');
    assert.strictEqual(tokens[0].type, 'AT', 'Expected AT');
    assert.strictEqual(tokens[1].type, 'IDENT', 'Expected IDENT (click)');
    assert.strictEqual(tokens[1].value, 'click', 'Expected click');
    assert.strictEqual(tokens[2].type, 'DIRECTIVE_MOD', 'Expected DIRECTIVE_MOD');
    assert.strictEqual(tokens[2].value, 'prevent', 'Expected prevent');
    assert.strictEqual(tokens[3].type, 'DIRECTIVE_MOD', 'Expected DIRECTIVE_MOD');
    assert.strictEqual(tokens[3].value, 'stop', 'Expected stop');
  });

  test('parses event directive with modifiers', () => {
    const source = `
@page App

view {
  button @click.prevent.stop(handleClick) "Submit"
}`;
    const ast = parse(source);
    const button = ast.view.children[0];
    const clickDirective = button.directives.find(d => d.type === 'EventDirective');
    assert.ok(clickDirective !== undefined, 'Expected EventDirective');
    assert.strictEqual(clickDirective.event, 'click', 'Expected click event');
    assert.strictEqual(clickDirective.modifiers.length, 2, 'Expected 2 modifiers');
    assert.strictEqual(clickDirective.modifiers[0], 'prevent', 'Expected prevent modifier');
    assert.strictEqual(clickDirective.modifiers[1], 'stop', 'Expected stop modifier');
  });

  test('compiles event directive with modifiers', () => {
    const source = `
@page App

view {
  button @click.prevent(handleClick) "Submit"
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('event.preventDefault()'), 'Expected preventDefault call');
  });

  test('compiles keydown with key modifier', () => {
    const source = `
@page App

view {
  input @keydown.enter(submit)
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("event.key !== 'Enter'"), 'Expected Enter key check');
  });

  test('compiles event with system modifier', () => {
    const source = `
@page App

view {
  input @keydown.ctrl.s(save)
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('event.ctrlKey'), 'Expected ctrlKey check');
  });

});

// =============================================================================
// @model Directive Tests
// =============================================================================

describe('@model Directive Tests', () => {

  test('parses @model directive', () => {
    const source = `
@page App

state {
  name: ""
}

view {
  input @model(name)
}`;
    const ast = parse(source);
    const input = ast.view.children[0];
    const modelDirective = input.directives.find(d => d.type === 'ModelDirective');
    assert.ok(modelDirective !== undefined, 'Expected ModelDirective');
  });

  test('parses @model with modifiers', () => {
    const source = `
@page App

state {
  name: ""
}

view {
  input @model.lazy.trim(name)
}`;
    const ast = parse(source);
    const input = ast.view.children[0];
    const modelDirective = input.directives.find(d => d.type === 'ModelDirective');
    assert.ok(modelDirective !== undefined, 'Expected ModelDirective');
    assert.strictEqual(modelDirective.modifiers.length, 2, 'Expected 2 modifiers');
    assert.ok(modelDirective.modifiers.includes('lazy'), 'Expected lazy modifier');
    assert.ok(modelDirective.modifiers.includes('trim'), 'Expected trim modifier');
  });

  test('compiles @model directive', () => {
    const source = `
@page App

state {
  name: ""
}

view {
  input @model(name)
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('model('), 'Expected model call');
  });

  test('compiles @model with options', () => {
    const source = `
@page App

state {
  name: ""
}

view {
  input @model.lazy.trim(name)
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('lazy: true'), 'Expected lazy option');
    assert.ok(result.code.includes('trim: true'), 'Expected trim option');
  });

});

// =============================================================================
// Key Function Tests (@for with key)
// =============================================================================

describe('Key Function Tests', () => {

  test('parses @for with key function', () => {
    const source = `
@page App

state {
  items: []
}

view {
  ul {
    @for (item of items) key(item.id) {
      li "{item.name}"
    }
  }
}`;
    const ast = parse(source);
    const ul = ast.view.children[0];
    const forDirective = ul.children[0];
    assert.strictEqual(forDirective.type, 'EachDirective', 'Expected EachDirective');
    assert.ok(forDirective.keyExpr !== null, 'Expected keyExpr');
  });

  test('compiles @for with key function', () => {
    const source = `
@page App

state {
  items: []
}

view {
  @for (item of items) key(item.id) {
    div "{item.name}"
  }
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('(item) => item.id'), 'Expected key function in list call');
  });

  test('compiles @for without key function', () => {
    const source = `
@page App

state {
  items: []
}

view {
  @for (item of items) {
    div "{item.name}"
  }
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should not have key function
    const listMatch = result.code.match(/list\([^)]+\)/g);
    assert.ok(listMatch, 'Expected list call');
  });

});

// =============================================================================
// @else-if Tests
// =============================================================================

describe('@else-if Tests', () => {

  test('parses @if with @else-if', () => {
    const source = `
@page App

state {
  status: "loading"
}

view {
  @if (status === "loading") {
    div "Loading..."
  } @else-if (status === "error") {
    div "Error"
  } @else {
    div "Done"
  }
}`;
    const ast = parse(source);
    const ifDirective = ast.view.children[0];
    assert.strictEqual(ifDirective.type, 'IfDirective', 'Expected IfDirective');
    assert.ok(ifDirective.elseIfBranches.length === 1, 'Expected 1 else-if branch');
    assert.ok(ifDirective.alternate !== null, 'Expected alternate');
  });

  test('parses multiple @else-if', () => {
    const source = `
@page App

state {
  status: "a"
}

view {
  @if (status === "a") {
    div "A"
  } @else-if (status === "b") {
    div "B"
  } @else-if (status === "c") {
    div "C"
  } @else {
    div "D"
  }
}`;
    const ast = parse(source);
    const ifDirective = ast.view.children[0];
    assert.strictEqual(ifDirective.elseIfBranches.length, 2, 'Expected 2 else-if branches');
  });

  test('compiles @else-if to nested when()', () => {
    const source = `
@page App

state {
  status: "loading"
}

view {
  @if (status === "loading") {
    div "Loading"
  } @else-if (status === "error") {
    div "Error"
  } @else {
    div "Done"
  }
}`;
    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should have nested when() calls
    const whenCount = (result.code.match(/when\(/g) || []).length;
    assert.strictEqual(whenCount, 2, 'Expected 2 when() calls for if + else-if');
  });

  test('parses @else @if syntax', () => {
    const source = `
@page App

state {
  status: "a"
}

view {
  @if (status === "a") {
    div "A"
  } @else @if (status === "b") {
    div "B"
  } @else {
    div "C"
  }
}`;
    const ast = parse(source);
    const ifDirective = ast.view.children[0];
    assert.strictEqual(ifDirective.type, 'IfDirective', 'Expected IfDirective');
    assert.ok(ifDirective.elseIfBranches.length === 1, 'Expected 1 else-if branch');
  });

});

// =============================================================================
// Dynamic Attributes Tests
// =============================================================================

describe('Dynamic Attributes Tests', () => {

  test('compiles simple dynamic attribute', () => {
    const source = `
@page App

state {
  searchQuery: ""
}

view {
  input[value={searchQuery}]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call for dynamic attribute');
    assert.ok(result.code.includes('searchQuery.get()'), 'Expected reactive getter');
  });

  test('compiles dynamic class with ternary expression', () => {
    const source = `
@page App

state {
  darkMode: false
}

view {
  div[class={darkMode ? "cv dark-mode" : "cv"}] "Content"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call for dynamic class');
    assert.ok(result.code.includes('darkMode.get()'), 'Expected reactive getter');
    assert.ok(result.code.includes('cv dark-mode'), 'Expected dark-mode class string');
    assert.ok(result.code.includes('"cv"'), 'Expected cv class string');
  });

  test('compiles dynamic class with complex ternary', () => {
    const source = `
@page App

state {
  selected: "test"
}

view {
  button.category-btn[class={selected === "test" ? "active" : ""}] "Test"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('selected.get()'), 'Expected reactive getter');
    assert.ok(result.code.includes('"active"'), 'Expected active class');
  });

  test('compiles multiple dynamic attributes', () => {
    const source = `
@page App

state {
  inputValue: ""
  isDisabled: false
}

view {
  input[value={inputValue}][disabled={isDisabled}]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should have two bind calls
    const bindCount = (result.code.match(/bind\(/g) || []).length;
    assert.ok(bindCount >= 2, 'Expected at least 2 bind calls');
  });

  test('compiles dynamic attribute with nested object access', () => {
    const source = `
@page App

state {
  user: { name: "John" }
}

view {
  span[data-name={user.name}] "Hello"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
  });

  test('compiles dynamic class with static classes preserved', () => {
    const source = `
@page App

state {
  isActive: true
}

view {
  div.static-class[class={isActive ? "active" : ""}] "Content"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('static-class'), 'Expected static class preserved');
    assert.ok(result.code.includes('bind'), 'Expected bind for dynamic class');
  });

  test('compiles quoted dynamic attribute syntax', () => {
    const source = `
@page App

state {
  title: "Hello"
}

view {
  div[title="{title}"] "Content"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
  });

  test('compiles dynamic attribute with function call', () => {
    const source = `
@page App

state {
  items: [1, 2, 3]
}

view {
  span[data-count={items.length}] "Items"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
  });

});

// =============================================================================
// Static Attributes Tests (href, src, placeholder, etc.)
// =============================================================================

describe('Static Attributes Tests', () => {

  test('compiles href attribute with URL', () => {
    const source = `
@page App

view {
  a[href="https://github.com/vincenthirtz"][target="_blank"] "GitHub"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Attributes should be in attrs object, not selector
    assert.ok(result.code.includes("'href': 'https://github.com/vincenthirtz'"), 'Expected href as attribute');
    assert.ok(result.code.includes("'target': '_blank'"), 'Expected target as attribute');
    // URL should NOT appear in selector
    assert.ok(!result.code.includes("el('a[https"), 'URL should not be in selector');
  });

  test('compiles src and alt attributes on img', () => {
    const source = `
@page App

view {
  img[src="https://example.com/image.png"][alt="Example image"]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'src': 'https://example.com/image.png'"), 'Expected src as attribute');
    assert.ok(result.code.includes("'alt': 'Example image'"), 'Expected alt as attribute');
  });

  test('compiles input with type and placeholder', () => {
    const source = `
@page App

view {
  input[type="text"][placeholder="Enter your name"]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'type': 'text'"), 'Expected type as attribute');
    assert.ok(result.code.includes("'placeholder': 'Enter your name'"), 'Expected placeholder as attribute');
  });

  test('compiles label with for attribute', () => {
    const source = `
@page App

view {
  label[for="email-input"] "Email"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'for': 'email-input'"), 'Expected for as attribute');
  });

  test('compiles boolean attribute without value', () => {
    const source = `
@page App

view {
  input[disabled]
  button[autofocus] "Submit"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'disabled': true"), 'Expected disabled as boolean attribute');
    assert.ok(result.code.includes("'autofocus': true"), 'Expected autofocus as boolean attribute');
  });

  test('compiles mixed static and dynamic attributes', () => {
    const source = `
@page App

state {
  isDisabled: false
}

view {
  input[type="text"][placeholder="Name"][disabled={isDisabled}]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Static attributes in attrs object
    assert.ok(result.code.includes("'type': 'text'"), 'Expected type as static attribute');
    assert.ok(result.code.includes("'placeholder': 'Name'"), 'Expected placeholder as static attribute');
    // Dynamic attribute should use bind
    assert.ok(result.code.includes('bind'), 'Expected bind for dynamic attribute');
    assert.ok(result.code.includes("'disabled'"), 'Expected disabled in bind call');
  });

  test('compiles textarea with placeholder', () => {
    const source = `
@page App

view {
  textarea[placeholder="Enter message here"]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'placeholder': 'Enter message here'"), 'Expected placeholder as attribute');
  });

  test('compiles attributes with special characters in values', () => {
    const source = `
@page App

view {
  a[href="https://example.com/path?query=value&other=123"][title="Click here!"]
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes("'href': 'https://example.com/path?query=value&other=123'"), 'Expected href with query params');
    assert.ok(result.code.includes("'title': 'Click here!'"), 'Expected title as attribute');
  });

});

// =============================================================================
// Complex Dynamic Attributes Tests
// =============================================================================

describe('Complex Dynamic Attributes Tests', () => {

  test('compiles nested ternary expressions', () => {
    const source = `
@page App

state {
  status: "loading"
}

view {
  div[class={status === "loading" ? "spinner" : status === "error" ? "error-box" : "content"}] "Status"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('status.get()'), 'Expected reactive getter');
    assert.ok(result.code.includes('"spinner"'), 'Expected spinner class');
    assert.ok(result.code.includes('"error-box"'), 'Expected error-box class');
    assert.ok(result.code.includes('"content"'), 'Expected content class');
  });

  test('compiles ternary with template literals in strings', () => {
    const source = `
@page App

state {
  count: 5
  max: 10
}

view {
  div[data-info={count > max ? "over-limit" : "within-limit"}] "Info"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('count.get()'), 'Expected count getter');
    assert.ok(result.code.includes('max.get()'), 'Expected max getter');
  });

  test('compiles complex boolean expressions in attributes', () => {
    const source = `
@page App

state {
  isLoggedIn: true
  isAdmin: false
  hasPermission: true
}

view {
  button[disabled={!isLoggedIn || (!isAdmin && !hasPermission)}] "Action"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('isLoggedIn.get()'), 'Expected isLoggedIn getter');
    assert.ok(result.code.includes('isAdmin.get()'), 'Expected isAdmin getter');
  });

  test('compiles dynamic attributes with array methods', () => {
    const source = `
@page App

state {
  items: [{ id: 1, active: true }, { id: 2, active: false }]
}

view {
  div[data-active-count={items.filter(i => i.active).length}] "Active items"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('items.get()'), 'Expected items getter');
  });

  test('compiles multiple dynamic attributes with complex expressions', () => {
    const source = `
@page App

state {
  theme: "light"
  size: "medium"
  variant: "primary"
}

view {
  button[class={theme === "dark" ? "btn-dark" : "btn-light"}][data-size={size}][aria-pressed={variant === "primary" ? "true" : "false"}] "Button"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    const bindCount = (result.code.match(/bind\(/g) || []).length;
    assert.ok(bindCount >= 3, 'Expected at least 3 bind calls for 3 dynamic attributes');
  });

  test('compiles expressions with string concatenation', () => {
    const source = `
@page App

state {
  prefix: "item"
  id: 42
}

view {
  div[data-id={prefix + "-" + id}] "Item"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('prefix.get()'), 'Expected prefix getter');
    assert.ok(result.code.includes('id.get()'), 'Expected id getter');
  });

  test('compiles ternary with object property access', () => {
    const source = `
@page App

state {
  user: { role: "admin", name: "John" }
}

view {
  span[class={user.role === "admin" ? "badge-admin" : "badge-user"}] "{user.name}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind call');
    assert.ok(result.code.includes('"badge-admin"'), 'Expected badge-admin class');
  });

  test('compiles complex dashboard component', () => {
    const source = `
@page Dashboard

state {
  isLoading: false
  hasError: false
  errorMessage: ""
  data: []
  selectedTab: "overview"
  sidebarCollapsed: false
  theme: "light"
  notifications: []
}

view {
  div[class={theme === "dark" ? "dashboard dark-theme" : "dashboard light-theme"}] {
    aside[class={sidebarCollapsed ? "sidebar collapsed" : "sidebar expanded"}] {
      nav {
        button[class={selectedTab === "overview" ? "nav-item active" : "nav-item"}] @click(selectedTab = "overview") "Overview"
        button[class={selectedTab === "analytics" ? "nav-item active" : "nav-item"}] @click(selectedTab = "analytics") "Analytics"
        button[class={selectedTab === "settings" ? "nav-item active" : "nav-item"}] @click(selectedTab = "settings") "Settings"
      }
    }

    main[class={sidebarCollapsed ? "content full-width" : "content"}] {
      header {
        h1 "Dashboard"
        div[class={notifications.length > 0 ? "notifications has-new" : "notifications"}] {
          span[data-count={notifications.length}] "\uD83D\uDD14"
        }
      }

      @if (isLoading) {
        div.spinner "Loading..."
      } @else @if (hasError) {
        div[class={"error-banner"}][data-message={errorMessage}] "Error occurred"
      } @else {
        div.content-area {
          @for (item of data) {
            div[class={item.highlighted ? "card highlighted" : "card"}][data-id={item.id}] {
              span "{item.title}"
            }
          }
        }
      }
    }
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');

    // Verify multiple dynamic attributes are compiled
    const bindCount = (result.code.match(/bind\(/g) || []).length;
    assert.ok(bindCount >= 5, 'Expected multiple bind calls for dynamic attributes');

    // Verify state variables
    assert.ok(result.code.includes('theme.get()'), 'Expected theme getter');
    assert.ok(result.code.includes('sidebarCollapsed.get()'), 'Expected sidebarCollapsed getter');
    assert.ok(result.code.includes('selectedTab.get()'), 'Expected selectedTab getter');
  });

  test('compiles form with dynamic validation classes', () => {
    const source = `
@page Form

state {
  email: ""
  password: ""
  emailTouched: false
  passwordTouched: false
  isSubmitting: false
}

view {
  form {
    div[class={emailTouched && email.length === 0 ? "field error" : emailTouched && email.includes("@") ? "field valid" : "field"}] {
      input[type="email"][value={email}][disabled={isSubmitting}] @input(email = event.target.value) @blur(emailTouched = true)
      span[class={emailTouched && email.length === 0 ? "error-msg visible" : "error-msg"}] "Email is required"
    }

    div[class={passwordTouched && password.length < 8 ? "field error" : passwordTouched ? "field valid" : "field"}] {
      input[type="password"][value={password}][disabled={isSubmitting}] @input(password = event.target.value) @blur(passwordTouched = true)
      span[class={passwordTouched && password.length < 8 ? "error-msg visible" : "error-msg"}] "Password must be 8+ chars"
    }

    button[type="submit"][disabled={isSubmitting || email.length === 0 || password.length < 8}][class={isSubmitting ? "btn loading" : "btn"}] {
      @if (isSubmitting) {
        span "Submitting..."
      } @else {
        span "Submit"
      }
    }
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('emailTouched.get()'), 'Expected emailTouched getter');
    assert.ok(result.code.includes('passwordTouched.get()'), 'Expected passwordTouched getter');
    assert.ok(result.code.includes('"field error"'), 'Expected field error class');
    assert.ok(result.code.includes('"field valid"'), 'Expected field valid class');
  });

  test('compiles expressions with special characters in strings', () => {
    const source = `
@page App

state {
  type: "info"
}

view {
  div[class={type === "warning" ? "alert alert-warning \u26A0\uFE0F" : type === "error" ? "alert alert-error \u274C" : "alert alert-info \u2139\uFE0F"}] "Message"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('type.get()'), 'Expected type getter');
  });

  test('compiles deeply nested object access in ternary', () => {
    const source = `
@page App

state {
  config: {
    ui: {
      theme: {
        variant: "dark",
        accent: "blue"
      }
    }
  }
}

view {
  div[class={config.ui.theme.variant === "dark" ? "container dark" : "container light"}][data-accent={config.ui.theme.accent}] "Content"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('bind'), 'Expected bind calls');
  });

  test('compiles ternary with numeric comparisons', () => {
    const source = `
@page App

state {
  progress: 75
  maxProgress: 100
}

view {
  div[class={progress >= maxProgress ? "progress complete" : progress >= 50 ? "progress halfway" : "progress starting"}][style={"width: " + progress + "%"}] {
    span "{progress}%"
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('progress.get()'), 'Expected progress getter');
    assert.ok(result.code.includes('maxProgress.get()'), 'Expected maxProgress getter');
  });

  test('compiles computed class with logical AND/OR', () => {
    const source = `
@page App

state {
  isVisible: true
  isAnimating: false
  isPaused: false
}

view {
  div[class={(isVisible && !isPaused) ? (isAnimating ? "box visible animating" : "box visible") : "box hidden"}] "Box"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('isVisible.get()'), 'Expected isVisible getter');
    assert.ok(result.code.includes('isAnimating.get()'), 'Expected isAnimating getter');
    assert.ok(result.code.includes('isPaused.get()'), 'Expected isPaused getter');
  });

  test('compiles data table with dynamic row classes', () => {
    const source = `
@page DataTable

state {
  rows: [
    { id: 1, name: "Item 1", status: "active", selected: false },
    { id: 2, name: "Item 2", status: "pending", selected: true },
    { id: 3, name: "Item 3", status: "inactive", selected: false }
  ]
  sortColumn: "name"
  sortDirection: "asc"
  hoveredRow: null
}

view {
  table {
    thead {
      tr {
        th[class={sortColumn === "id" ? (sortDirection === "asc" ? "sortable sorted-asc" : "sortable sorted-desc") : "sortable"}] @click(sortColumn = "id") "ID"
        th[class={sortColumn === "name" ? (sortDirection === "asc" ? "sortable sorted-asc" : "sortable sorted-desc") : "sortable"}] @click(sortColumn = "name") "Name"
        th[class={sortColumn === "status" ? (sortDirection === "asc" ? "sortable sorted-asc" : "sortable sorted-desc") : "sortable"}] @click(sortColumn = "status") "Status"
      }
    }
    tbody {
      @for (row of rows) {
        tr[class={row.selected ? (hoveredRow === row.id ? "row selected hovered" : "row selected") : (hoveredRow === row.id ? "row hovered" : "row")}][data-id={row.id}] {
          td "{row.id}"
          td "{row.name}"
          td[class={row.status === "active" ? "status-active" : row.status === "pending" ? "status-pending" : "status-inactive"}] "{row.status}"
        }
      }
    }
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('sortColumn.get()'), 'Expected sortColumn getter');
    assert.ok(result.code.includes('sortDirection.get()'), 'Expected sortDirection getter');
    assert.ok(result.code.includes('"sortable sorted-asc"'), 'Expected sorted-asc class');
  });

});

// =============================================================================
// Props Tests
// =============================================================================

describe('Props Tests', () => {

  test('compiles component with props definition', () => {
    const source = `
@page Button

props {
  label: "Click"
  disabled: false
  onClick: null
}

view {
  button[disabled={disabled}] "{label}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Props are now extracted via useProp() for reactive prop support
    assert.ok(result.code.includes('useProp(props, \'label\', "Click")'), 'Expected useProp for label');
    assert.ok(result.code.includes('useProp(props, \'disabled\', false)'), 'Expected useProp for disabled');
    assert.ok(result.code.includes('useProp(props, \'onClick\', null)'), 'Expected useProp for onClick');
    // Props may return computed (reactive) or static values
    // useProp returns the value (or computed) that can be used directly
    assert.ok(result.code.includes('useProp'), 'Expected useProp import');
  });

  test('compiles passing props to child component', () => {
    const source = `
import Button from './Button.pulse'

@page App

state {
  buttonLabel: "Submit"
  isDisabled: true
}

view {
  div {
    Button(label={buttonLabel}, disabled={isDisabled})
    Button(label="Static", disabled=false)
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('Button.render'), 'Expected Button.render call');
    assert.ok(result.code.includes('label: buttonLabel.get()'), 'Expected state var getter in props');
    assert.ok(result.code.includes('disabled: isDisabled.get()'), 'Expected state var getter in props');
    assert.ok(result.code.includes('label: "Static"'), 'Expected static prop value');
  });

  test('compiles props with complex expressions', () => {
    const source = `
import Badge from './Badge.pulse'

@page App

state {
  status: "pending"
  count: 5
}

view {
  Badge(type={status === "error" ? "danger" : "info"}, label={count > 0 ? count + " items" : "No items"})
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('Badge.render'), 'Expected Badge.render call');
    assert.ok(result.code.includes('status.get()'), 'Expected status getter in ternary');
    assert.ok(result.code.includes('count.get()'), 'Expected count getter in ternary');
  });

  test('compiles props/state collision correctly (props take precedence)', () => {
    const source = `
@page Component

props {
  count: 0
}

state {
  count: 10
}

view {
  span "Count: {count}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Props are now extracted via useProp()
    assert.ok(result.code.includes('useProp(props, \'count\', 0)'), 'Expected useProp for count');
    // With useProp, count becomes a computed (reactive) value that needs .get()
    // OR it can be a plain value - useProp handles both cases
    // The text interpolation uses the prop directly
    assert.ok(result.code.includes('count'), 'Expected count in text interpolation');
  });

  test('compiles props with object and array values', () => {
    const source = `
import Card from './Card.pulse'

@page App

state {
  user: { name: "John", age: 30 }
  items: [1, 2, 3]
}

view {
  Card(data={user}, items={items})
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('data: user.get()'), 'Expected user getter');
    assert.ok(result.code.includes('items: items.get()'), 'Expected items getter');
  });

  test('compiles action passed as prop callback', () => {
    const source = `
import SearchInput from './SearchInput.pulse'

@page App

state {
  query: ""
}

view {
  SearchInput(value={query}, onSearch={handleSearch})
}

actions {
  handleSearch(q) {
    query = q
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('onSearch: handleSearch'), 'Expected action passed as prop');
  });

  test('compiles nested components with slots and props', () => {
    const source = `
import Header from './Header.pulse'
import SearchInput from './SearchInput.pulse'

@page App

state {
  searchQuery: ""
}

view {
  Header(title="My App") {
    SearchInput(value={searchQuery}, placeholder="Search...")
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('Header.render'), 'Expected Header.render call');
    assert.ok(result.code.includes('props: { title: "My App" }'), 'Expected Header props');
    assert.ok(result.code.includes('slots:'), 'Expected slots in Header call');
    assert.ok(result.code.includes('SearchInput.render'), 'Expected SearchInput in slot');
  });

  test('compiles props with method calls (filter, map, etc.)', () => {
    const source = `
import List from './List.pulse'

@page App

state {
  items: [{ id: 1, active: true }, { id: 2, active: false }]
}

view {
  List(activeItems={items.filter(i => i.active)}, total={items.length})
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('items.get().filter'), 'Expected filter on state getter');
    assert.ok(result.code.includes('items.get().length'), 'Expected length on state getter');
  });

  test('compiles text interpolation correctly (no extra quotes)', () => {
    const source = `
@page Test

state {
  name: "John"
  count: 5
}

view {
  span "Hello {name}, you have {count} items"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should be: text(() => \`Hello ${name.get()}, you have ${count.get()} items\`)
    // NOT: text(() => \`"Hello "${name.get()}", you have "${count.get()}" items"\`)
    assert.ok(result.code.includes('`Hello ${name.get()}, you have ${count.get()} items`'), 'Expected clean text interpolation without extra quotes');
    assert.ok(!result.code.includes('"Hello "'), 'Should not have quoted string parts');
  });

  test('compiles props in child component expressions', () => {
    const source = `
@page ChildComponent

props {
  value: ""
  onChange: null
}

view {
  div {
    input[value={value}]
    span "Current: {value}"
    button @click(onChange && onChange(value)) "Submit"
  }
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Props are now reactive via useProp() and use .get() like state
    assert.ok(result.code.includes('value.get()'), 'Props should use .get() (via useProp computed)');
    assert.ok(result.code.includes('`Current: ${value.get()}`'), 'Expected value.get() prop in text');
    // Callbacks (onChange) are also accessed via .get() but called as functions
    assert.ok(result.code.includes('onChange.get()'), 'Callback props also use .get()');
  });

});

// =============================================================================
// Modern JavaScript Operators Tests
// =============================================================================

describe('Modern JavaScript Operators Tests', () => {

  test('tokenizes nullish coalescing operator (??)', () => {
    const tokens = tokenize('a ?? b');
    assert.strictEqual(tokens[0].type, 'IDENT', 'Expected IDENT for a');
    assert.strictEqual(tokens[1].type, 'NULLISH', 'Expected NULLISH for ??');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT for b');
  });

  test('tokenizes optional chaining operator (?.)', () => {
    const tokens = tokenize('obj?.prop');
    assert.strictEqual(tokens[0].type, 'IDENT', 'Expected IDENT for obj');
    assert.strictEqual(tokens[1].type, 'OPTIONAL_CHAIN', 'Expected OPTIONAL_CHAIN for ?.');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT for prop');
  });

  test('tokenizes nullish assignment operator (??=)', () => {
    const tokens = tokenize('a ??= b');
    assert.strictEqual(tokens[0].type, 'IDENT', 'Expected IDENT for a');
    assert.strictEqual(tokens[1].type, 'NULLISH_ASSIGN', 'Expected NULLISH_ASSIGN for ??=');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT for b');
  });

  test('tokenizes logical OR assignment (||=)', () => {
    const tokens = tokenize('a ||= b');
    assert.strictEqual(tokens[0].type, 'IDENT', 'Expected IDENT for a');
    assert.strictEqual(tokens[1].type, 'OR_ASSIGN', 'Expected OR_ASSIGN for ||=');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT for b');
  });

  test('tokenizes logical AND assignment (&&=)', () => {
    const tokens = tokenize('a &&= b');
    assert.strictEqual(tokens[0].type, 'IDENT', 'Expected IDENT for a');
    assert.strictEqual(tokens[1].type, 'AND_ASSIGN', 'Expected AND_ASSIGN for &&=');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT for b');
  });

  test('tokenizes compound assignment operators (+=, -=, *=, /=)', () => {
    const tokens = tokenize('a += 1 b -= 2 c *= 3 d /= 4');
    assert.strictEqual(tokens[1].type, 'PLUS_ASSIGN', 'Expected PLUS_ASSIGN for +=');
    assert.strictEqual(tokens[4].type, 'MINUS_ASSIGN', 'Expected MINUS_ASSIGN for -=');
    assert.strictEqual(tokens[7].type, 'STAR_ASSIGN', 'Expected STAR_ASSIGN for *=');
    assert.strictEqual(tokens[10].type, 'SLASH_ASSIGN', 'Expected SLASH_ASSIGN for /=');
  });

  test('tokenizes BigInt literals', () => {
    const tokens = tokenize('123n 456n 0n');
    assert.strictEqual(tokens[0].type, 'BIGINT', 'Expected BIGINT for 123n');
    assert.strictEqual(tokens[0].value, '123n', 'Expected value 123n');
    assert.strictEqual(tokens[1].type, 'BIGINT', 'Expected BIGINT for 456n');
    assert.strictEqual(tokens[2].type, 'BIGINT', 'Expected BIGINT for 0n');
  });

  test('tokenizes numeric separators', () => {
    const tokens = tokenize('1_000_000 3.14_159 0xFF_FF');
    assert.strictEqual(tokens[0].type, 'NUMBER', 'Expected NUMBER');
    assert.strictEqual(tokens[0].value, 1000000, 'Expected 1000000 (underscores removed)');
    assert.strictEqual(tokens[1].type, 'NUMBER', 'Expected NUMBER');
    assert.strictEqual(tokens[1].value, 3.14159, 'Expected 3.14159');
    assert.strictEqual(tokens[2].type, 'NUMBER', 'Expected NUMBER');
    assert.strictEqual(tokens[2].value, 0xFFFF, 'Expected 65535 (hex FFFF)');
  });

  test('tokenizes hex, binary, and octal literals', () => {
    const tokens = tokenize('0xFF 0b1010 0o777');
    assert.strictEqual(tokens[0].type, 'NUMBER', 'Expected NUMBER for hex');
    assert.strictEqual(tokens[0].value, 255, 'Expected 255 for 0xFF');
    assert.strictEqual(tokens[1].type, 'NUMBER', 'Expected NUMBER for binary');
    assert.strictEqual(tokens[1].value, 10, 'Expected 10 for 0b1010');
    assert.strictEqual(tokens[2].type, 'NUMBER', 'Expected NUMBER for octal');
    assert.strictEqual(tokens[2].value, 511, 'Expected 511 for 0o777');
  });

  test('tokenizes BigInt with hex/binary/octal', () => {
    const tokens = tokenize('0xFFn 0b1010n 0o777n');
    assert.strictEqual(tokens[0].type, 'BIGINT', 'Expected BIGINT for hex BigInt');
    assert.strictEqual(tokens[1].type, 'BIGINT', 'Expected BIGINT for binary BigInt');
    assert.strictEqual(tokens[2].type, 'BIGINT', 'Expected BIGINT for octal BigInt');
  });

  test('distinguishes ?. from ternary + decimal', () => {
    // ?. should be optional chaining when followed by identifier
    const tokens = tokenize('x?.prop');
    assert.strictEqual(tokens[1].type, 'OPTIONAL_CHAIN', 'Expected OPTIONAL_CHAIN');
    assert.strictEqual(tokens[2].type, 'IDENT', 'Expected IDENT prop');

    // ?.5 should NOT be optional chaining (it's ternary ? followed by . and 5)
    // This tests that we don't incorrectly treat ?.5 as optional chaining
    const tokens2 = tokenize('x?.5:y');
    assert.strictEqual(tokens2[1].type, 'QUESTION', 'Expected QUESTION for ternary');
    // Note: .5 is tokenized as DOT + NUMBER (not as decimal 0.5)
    assert.strictEqual(tokens2[2].type, 'DOT', 'Expected DOT after ?');
    assert.strictEqual(tokens2[3].type, 'NUMBER', 'Expected NUMBER 5');
  });

  test('compiles code with nullish coalescing', () => {
    const source = `
@page App

state {
  name: null
}

view {
  span "{name ?? 'Anonymous'}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('??'), 'Expected ?? operator to be preserved');
  });

  test('compiles code with optional chaining', () => {
    const source = `
@page App

state {
  user: null
}

view {
  span "{user?.name}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('?.'), 'Expected ?. operator to be preserved');
  });

});

// =============================================================================
// Modern CSS Features Tests
// =============================================================================

describe('Modern CSS Features Tests', () => {

  test('compiles @supports feature queries', () => {
    const source = `
@page App

view {
  div.container "Hello"
}

style {
  .container {
    display: flex
  }

  @supports (display: grid) {
    .container {
      display: grid
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // Note: The CSS parser may normalize spacing (e.g., 'display:grid' without space)
    assert.ok(result.code.includes('@supports'), 'Expected @supports rule');
    assert.ok(result.code.includes('display') && result.code.includes('grid'), 'Expected display: grid inside @supports');
  });

  test('compiles @container queries', () => {
    const source = `
@page App

view {
  div.card "Content"
}

style {
  .card {
    container-type: inline-size
  }

  @container (min-width: 400px) {
    .card {
      padding: 2rem
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // Note: The CSS parser may normalize spacing
    assert.ok(result.code.includes('@container'), 'Expected @container rule');
    assert.ok(result.code.includes('padding'), 'Expected padding inside @container');
  });

  test('compiles @layer cascade layers', () => {
    const source = `
@page App

view {
  div.button "Click"
}

style {
  @layer base {
    .button {
      padding: 10px
    }
  }

  @layer components {
    .button {
      background: blue
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('@layer base'), 'Expected @layer base');
    assert.ok(result.code.includes('@layer components'), 'Expected @layer components');
  });

  test('compiles nested @media with @supports', () => {
    const source = `
@page App

view {
  div.responsive "Content"
}

style {
  .responsive {
    width: 100%
  }

  @media (min-width: 768px) {
    .responsive {
      width: 50%
    }
  }

  @supports (display: flex) {
    .responsive {
      display: flex
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('@media'), 'Expected @media rule');
    assert.ok(result.code.includes('@supports'), 'Expected @supports rule');
  });

  test('compiles CSS with > child combinator', () => {
    const source = `
@page App

view {
  div.parent "Parent"
}

style {
  .parent > .child {
    color: red
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // The combinator may have different spacing but should be present
    assert.ok(result.code.includes('>'), 'Expected child combinator preserved');
    assert.ok(result.code.includes('.parent'), 'Expected .parent selector');
    assert.ok(result.code.includes('.child'), 'Expected .child selector');
  });

  test('compiles CSS with + adjacent sibling combinator', () => {
    const source = `
@page App

view {
  h2 "Heading"
}

style {
  h2 + p {
    margin-top: 0
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('h2 + p') || result.code.includes('h2+ p') || result.code.includes('h2 +p'), 'Expected adjacent sibling combinator');
  });

  test('compiles CSS with ~ general sibling combinator', () => {
    const source = `
@page App

view {
  div "Content"
}

style {
  h1 ~ p {
    color: gray
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('~'), 'Expected general sibling combinator');
  });

  test('CSS scoping preserves combinators', () => {
    const source = `
@page App

view {
  div.parent {
    div.child "Child"
  }
}

style {
  .parent > .child {
    padding: 10px
  }
  .item + .item {
    margin-left: 5px
  }
  .active ~ .inactive {
    opacity: 0.5
  }
}`;

    const result = compile(source); // With scoping enabled
    assert.ok(result.success, 'Expected successful compilation');
    // Verify combinators are preserved in scoped output
    assert.ok(result.code.includes('>'), 'Expected > combinator preserved with scoping');
    assert.ok(result.code.includes('+'), 'Expected + combinator preserved with scoping');
    assert.ok(result.code.includes('~'), 'Expected ~ combinator preserved with scoping');
  });

  test('compiles CSS :has() selector', () => {
    const source = `
@page App

view {
  div.card "Card"
}

style {
  .card:has(img) {
    padding: 0
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // Note: parser may add space before parentheses
    assert.ok(result.code.includes(':has'), 'Expected :has selector');
  });

  test('compiles CSS :is() selector', () => {
    const source = `
@page App

view {
  div "Content"
}

style {
  :is(h1, h2, h3) {
    font-weight: bold
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // Note: parser may add space before parentheses
    assert.ok(result.code.includes(':is'), 'Expected :is selector');
  });

  test('compiles CSS :where() selector', () => {
    const source = `
@page App

view {
  div "Content"
}

style {
  :where(article, section) p {
    line-height: 1.6
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    // Note: parser may add space before parentheses
    assert.ok(result.code.includes(':where'), 'Expected :where selector');
  });

  test('compiles modern CSS custom properties', () => {
    const source = `
@page App

view {
  div.themed "Themed"
}

style {
  .themed {
    --primary-color: #007bff
    color: var(--primary-color)
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('--primary-color'), 'Expected custom property');
    assert.ok(result.code.includes('var(--primary-color)'), 'Expected var() function');
  });

  test('compiles clamp(), min(), max() CSS functions', () => {
    const source = `
@page App

view {
  h1 "Title"
}

style {
  h1 {
    font-size: clamp(1rem, 5vw, 3rem)
    width: min(100%, 800px)
    height: max(50vh, 400px)
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('clamp('), 'Expected clamp() function');
    assert.ok(result.code.includes('min('), 'Expected min() function');
    assert.ok(result.code.includes('max('), 'Expected max() function');
  });

});

// =============================================================================
// Edge Cases and Error Recovery Tests
// =============================================================================

describe('Edge Cases Tests', () => {

  test('handles complex nested expressions with modern operators', () => {
    const source = `
@page App

state {
  user: null
  settings: { theme: "light" }
}

view {
  span "{user?.profile?.name ?? settings?.theme ?? 'default'}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('?.'), 'Expected optional chaining');
    assert.ok(result.code.includes('??'), 'Expected nullish coalescing');
  });

  test('handles deeply nested CSS rules', () => {
    const source = `
@page App

view {
  div.app "App"
}

style {
  .app {
    padding: 1rem

    .header {
      height: 60px

      .nav {
        display: flex

        .link {
          color: blue

          &:hover {
            color: red
          }
        }
      }
    }
  }
}`;

    const result = compile(source, { scopeStyles: false });
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(result.code.includes('.app .header'), 'Expected nested selector .app .header');
    assert.ok(result.code.includes('.app .header .nav'), 'Expected nested selector .app .header .nav');
    assert.ok(result.code.includes('.app .header .nav .link'), 'Expected deeply nested selector');
    assert.ok(result.code.includes('.app .header .nav .link:hover'), 'Expected & replaced with parent');
  });

  test('preserves string literals without adding optional chaining', () => {
    const source = `
@page App

view {
  span "User.name is a valid property path"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // The string should NOT have ?. inserted
    assert.ok(result.code.includes('User.name'), 'Expected User.name preserved');
    assert.ok(!result.code.includes('User?.name'), 'Should NOT add ?. inside string literals');
  });

});

// =============================================================================
// Switch Statement Tests (break/case semicolons)
// =============================================================================

describe('Switch Statement Tests', () => {

  test('compiles switch with break statements correctly', () => {
    const source = `
@page TestSwitch

state {
  sortBy: "name"
}

actions {
  getSorted() {
    let items = []
    switch(sortBy) {
      case "price":
        items = [1, 2, 3]
        break
      case "rating":
        items = [4, 5, 6]
        break
      default:
        items = [7, 8, 9]
    }
    return items
  }
}
`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // break should have proper semicolons (either explicit or ASI-valid positioning)
    // The key is that the code is syntactically valid JavaScript
    assert.ok(!result.code.includes('break case'), 'break should be properly separated from case');
    assert.ok(!result.code.includes('break default'), 'break should be properly separated from default');
  });

  test('compiles state var in object key position correctly', () => {
    const source = `
@page TestObjectKey

state {
  category: "all"
}

actions {
  getProducts() {
    return [
      { id: 1, name: "Product", category: "electronics" },
      { id: 2, name: "Other", category: "accessories" }
    ]
  }

  getFiltered() {
    const current = category
    return getProducts().filter(p => p.category === current)
  }
}
`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // 'category' as an object key should NOT be transformed to category.get()
    assert.ok(!result.code.includes('category.get() :'), 'Object key should not be transformed to .get()');
    assert.ok(!result.code.includes('category.get(): '), 'Object key should not be transformed to .get()');
    // But category used elsewhere (reading state) should be transformed
    assert.ok(result.code.includes('category.get()'), 'State var reads should still be transformed');
  });

});

// =============================================================================
// State assignment in text interpolation (transformExpressionString bug fix)
// =============================================================================

describe('State assignment in text interpolation', () => {

  test('compiles state assignment in text interpolation to .set() not .get() =', () => {
    const source = `
@page Test

state {
  show: false
}

view {
  p "{show = !show}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    // Should generate show.set(!show.get()), NOT show.get() = !show.get()
    assert.ok(!result.code.includes('.get() ='), 'Assignment should not produce .get() on left side');
    assert.ok(result.code.includes('show.set('), 'Assignment should use .set()');
  });

  test('compiles compound assignment in text interpolation to .update()', () => {
    const source = `
@page Test

state {
  count: 0
}

view {
  p "Value: {count += 1}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(!result.code.includes('.get() +'), 'Compound assignment should not produce .get() +=');
    assert.ok(result.code.includes('count.update('), 'Compound assignment should use .update()');
  });

  test('does not treat == as assignment in text interpolation', () => {
    const source = `
@page Test

state {
  count: 0
}

view {
  p "{count == 0 ? 'zero' : 'nonzero'}"
}`;

    const result = compile(source);
    assert.ok(result.success, 'Expected successful compilation');
    assert.ok(!result.code.includes('.set('), 'Equality check should not produce .set()');
    assert.ok(result.code.includes('count.get() == 0'), 'Equality check should use .get()');
  });

});
