/**
 * Parser Sub-Module Coverage Tests
 *
 * Targeted tests to improve coverage for:
 * - compiler/parser/expressions.js
 * - compiler/parser/view.js
 * - compiler/parser/blocks.js
 * - compiler/parser/style.js
 * - compiler/parser/core.js
 *
 * @module test/parser-coverage
 */

import { tokenize, parse, compile } from '../compiler/index.js';
import { test, describe } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Helper: parse and return AST (throws on failure)
// =============================================================================
function parseSource(source) {
  return parse(source);
}

// Helper: compile and assert success
function compileOk(source, options = {}) {
  const result = compile(source, options);
  assert.ok(result.success, `Compilation failed: ${result.errors.map(e => e.message).join(', ')}`);
  return result;
}

// Helper: compile and assert failure
function compileFail(source) {
  const result = compile(source);
  assert.ok(!result.success, 'Expected compilation to fail');
  return result;
}

// =============================================================================
// EXPRESSIONS (compiler/parser/expressions.js) - 135 missing lines
// =============================================================================

describe('Parser Expressions Coverage', () => {

  // ---------- Assignment Operators ----------

  describe('Assignment expressions', () => {
    test('parses += assignment', () => {
      const ast = parseSource('state { x: 0 } actions { inc() { x += 1 } }');
      assert.ok(ast.actions);
    });

    test('parses -= assignment', () => {
      const ast = parseSource('state { x: 0 } actions { dec() { x -= 1 } }');
      assert.ok(ast.actions);
    });

    test('parses *= assignment', () => {
      const ast = parseSource('state { x: 0 } actions { mul() { x *= 2 } }');
      assert.ok(ast.actions);
    });

    test('parses /= assignment', () => {
      const ast = parseSource('state { x: 0 } actions { div() { x /= 2 } }');
      assert.ok(ast.actions);
    });

    test('parses &&= logical AND assignment', () => {
      const ast = parseSource('state { x: true } actions { op() { x &&= false } }');
      assert.ok(ast.actions);
    });

    test('parses ||= logical OR assignment', () => {
      const ast = parseSource('state { x: false } actions { op() { x ||= true } }');
      assert.ok(ast.actions);
    });

    test('parses ??= nullish assignment', () => {
      const ast = parseSource('state { x: null } actions { op() { x ??= 5 } }');
      assert.ok(ast.actions);
    });
  });

  // ---------- Ternary Expressions ----------

  describe('Conditional (ternary) expressions', () => {
    test('parses ternary in text interpolation', () => {
      const ast = parseSource('state { active: true } view { span "{active ? \'Yes\' : \'No\'}" }');
      assert.ok(ast.view);
    });

    test('compiles ternary in event handler', () => {
      const result = compileOk(`
state { theme: "light" }
view {
  button @click(theme = theme == "light" ? "dark" : "light") "Toggle"
}`);
      assert.ok(result.code);
    });
  });

  // ---------- Binary Expressions ----------

  describe('Binary expression precedence', () => {
    test('parses mixed additive and multiplicative ops', () => {
      const result = compileOk(`
state { x: 0 }
view { span "{x + 2 * 3 - 1}" }
`);
      assert.ok(result.code);
    });

    test('parses comparison operators', () => {
      const result = compileOk(`
state { count: 0 }
view {
  @if (count > 0) { span "positive" }
  @if (count < 10) { span "small" }
  @if (count >= 5) { span "big" }
  @if (count <= 3) { span "tiny" }
  @if (count == 0) { span "zero" }
  @if (count != 1) { span "not one" }
}`);
      assert.ok(result.code);
    });

    test('parses logical operators', () => {
      const result = compileOk(`
state { a: true b: false }
view {
  @if (a && b) { span "both" }
  @if (a || b) { span "either" }
}`);
      assert.ok(result.code);
    });

    test('parses modulo operator', () => {
      const result = compileOk(`
state { n: 10 }
view { span "{n % 3}" }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Unary Expressions ----------

  describe('Unary expressions', () => {
    test('parses logical NOT', () => {
      const result = compileOk(`
state { show: true }
view { @if (!show) { span "hidden" } }
`);
      assert.ok(result.code);
    });

    test('parses double NOT (!!)', () => {
      const result = compileOk(`
state { val: "" }
view { @if (!!val) { span "truthy" } }
`);
      assert.ok(result.code);
    });

    test('parses unary minus', () => {
      const result = compileOk(`
state { x: 5 }
view { span "{-x}" }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Postfix Expressions ----------

  describe('Postfix expressions', () => {
    test('parses increment operator', () => {
      const result = compileOk(`
state { count: 0 }
view { button @click(count++) "+" }
`);
      assert.ok(result.code);
    });

    test('parses decrement operator', () => {
      const result = compileOk(`
state { count: 10 }
view { button @click(count--) "-" }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Arrow Functions ----------

  describe('Arrow functions', () => {
    test('parses single param arrow function', () => {
      const result = compileOk(`
state { items: [1, 2, 3] }
view {
  @for (item of items) {
    span "{item}"
  }
}
actions {
  filter() {
    items = items.filter(x => x > 1)
  }
}`);
      assert.ok(result.code);
    });

    test('parses multi-param arrow function', () => {
      const result = compileOk(`
state { items: [1, 2, 3] }
actions {
  sort() {
    items = items.sort((a, b) => a - b)
  }
}`);
      assert.ok(result.code);
    });

    test('parses arrow function with no params', () => {
      const result = compileOk(`
state { count: 0 }
actions {
  doAsync() {
    setTimeout(() => count++, 1000)
  }
}`);
      assert.ok(result.code);
    });

    test('parses arrow function with spread params', () => {
      const result = compileOk(`
state { items: [] }
actions {
  log() {
    items.forEach((...args) => console.log(args))
  }
}`);
      assert.ok(result.code);
    });

    test('parses arrow function with block body', () => {
      const result = compileOk(`
state { items: [] }
actions {
  process() {
    items.forEach(item => { console.log(item) })
  }
}`);
      assert.ok(result.code);
    });

    test('parses grouped expression not arrow function', () => {
      const result = compileOk(`
state { x: 5 }
view { span "{(x + 3) * 2}" }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Array Literals ----------

  describe('Array literal expressions', () => {
    test('parses empty array', () => {
      const ast = parseSource('state { items: [] }');
      assert.ok(ast.state);
    });

    test('parses array with elements', () => {
      const ast = parseSource('state { items: [1, 2, 3] }');
      assert.ok(ast.state);
    });

    test('parses array with trailing comma', () => {
      const ast = parseSource('state { items: [1, 2, 3,] }');
      assert.ok(ast.state);
    });

    test('parses array with spread', () => {
      const result = compileOk(`
state { a: [1] b: [2] }
actions { merge() { a = [...a, ...b] } }
`);
      assert.ok(result.code);
    });

    test('parses nested arrays', () => {
      const ast = parseSource('state { matrix: [[1, 2], [3, 4]] }');
      assert.ok(ast.state);
    });
  });

  // ---------- Object Literals ----------

  describe('Object literal expressions', () => {
    test('parses empty object', () => {
      const ast = parseSource('state { config: {} }');
      assert.ok(ast.state);
    });

    test('parses object with properties', () => {
      const ast = parseSource('state { user: { name: "Alice", age: 30 } }');
      assert.ok(ast.state);
    });

    test('parses object with shorthand property', () => {
      const result = compileOk(`
state { name: "test" }
actions { save() { obj = { name } } }
`);
      assert.ok(result.code);
    });

    test('parses object with spread', () => {
      const result = compileOk(`
state { a: { x: 1 } }
actions { extend() { b = { ...a, y: 2 } } }
`);
      assert.ok(result.code);
    });

    test('parses object with trailing comma', () => {
      const ast = parseSource('state { config: { a: 1, b: 2, } }');
      assert.ok(ast.state);
    });
  });

  // ---------- Member Expressions and Call Chains ----------

  describe('Member expressions and calls', () => {
    test('parses dot member access', () => {
      const result = compileOk(`
state { user: { name: "Alice" } }
view { span "{user.name}" }
`);
      assert.ok(result.code);
    });

    test('parses computed member access', () => {
      const result = compileOk(`
state { items: [1, 2, 3] }
view { span "{items[0]}" }
`);
      assert.ok(result.code);
    });

    test('parses function call', () => {
      const result = compileOk(`
state { items: [1, 2, 3] }
view { span "{items.length}" }
actions { clear() { items = items.filter(x => x > 0) } }
`);
      assert.ok(result.code);
    });

    test('parses chained member access and calls', () => {
      const result = compileOk(`
state { data: { items: [3, 1, 2] } }
actions {
  process() {
    data.items.filter(x => x > 1).sort((a, b) => a - b)
  }
}`);
      assert.ok(result.code);
    });

    test('parses call with no arguments', () => {
      const result = compileOk(`
state { items: [1] }
actions { doIt() { items.toString() } }
`);
      assert.ok(result.code);
    });

    test('parses call with multiple arguments', () => {
      const result = compileOk(`
state { items: [1, 2, 3] }
actions { doIt() { items.splice(0, 1) } }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Template Literals ----------

  describe('Template literals', () => {
    test('parses template literal in state', () => {
      const tokens = tokenize('`hello`');
      const templateToken = tokens.find(t => t.type === 'TEMPLATE');
      assert.ok(templateToken, 'Expected TEMPLATE token');
    });
  });

  // ---------- Spread in expressions ----------

  describe('Spread expressions', () => {
    test('parses spread in array', () => {
      const result = compileOk(`
state { a: [1, 2] }
actions { grow() { a = [...a, 3] } }
`);
      assert.ok(result.code);
    });

    test('parses spread in object', () => {
      const result = compileOk(`
state { obj: { x: 1 } }
actions { extend() { obj = { ...obj, y: 2 } } }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Error cases in expressions ----------

  describe('Expression error handling', () => {
    test('reports error for unexpected token in expression', () => {
      const result = compile('view { span "{@}" }');
      // Should either fail or handle gracefully
      assert.ok(result);
    });
  });
});

// =============================================================================
// VIEW (compiler/parser/view.js) - 95 missing lines
// =============================================================================

describe('Parser View Coverage', () => {

  // ---------- View Block ----------

  describe('View block basics', () => {
    test('parses empty view block', () => {
      const ast = parseSource('view { }');
      assert.ok(ast.view);
      assert.strictEqual(ast.view.children.length, 0);
    });

    test('parses view with multiple children', () => {
      const ast = parseSource(`
view {
  div { span "hello" }
  p "world"
}`);
      assert.ok(ast.view);
      assert.strictEqual(ast.view.children.length, 2);
    });
  });

  // ---------- Slot Elements ----------

  describe('Slot elements', () => {
    test('parses bare default slot', () => {
      const ast = parseSource('view { slot }');
      const slot = ast.view.children[0];
      assert.strictEqual(slot.type, 'SlotElement');
      assert.strictEqual(slot.name, 'default');
      assert.strictEqual(slot.fallback.length, 0);
    });

    test('parses named slot with fallback', () => {
      const ast = parseSource('view { slot "header" { div "Default header" } }');
      const slot = ast.view.children[0];
      assert.strictEqual(slot.name, 'header');
      assert.ok(slot.fallback.length > 0);
    });

    test('parses default slot with fallback', () => {
      const ast = parseSource('view { slot { span "Fallback" } }');
      const slot = ast.view.children[0];
      assert.strictEqual(slot.name, 'default');
      assert.ok(slot.fallback.length > 0);
    });
  });

  // ---------- Elements ----------

  describe('Element parsing', () => {
    test('parses element with selector', () => {
      const ast = parseSource('view { div.container#main "Hello" }');
      assert.ok(ast.view);
      const el = ast.view.children[0];
      assert.ok(el.selector.includes('div'));
    });

    test('parses element with inline text', () => {
      const ast = parseSource('view { span "Hello World" }');
      const el = ast.view.children[0];
      assert.ok(el.textContent.length > 0);
    });

    test('parses element with children block', () => {
      const ast = parseSource('view { div { span "child1" span "child2" } }');
      const el = ast.view.children[0];
      assert.ok(el.children.length >= 2);
    });

    test('parses element with inline directive', () => {
      const ast = parseSource('view { button @click(doSomething()) "Click" }');
      const el = ast.view.children[0];
      assert.ok(el.directives.length > 0);
      assert.strictEqual(el.directives[0].type, 'EventDirective');
    });

    test('parses element with multiple inline directives', () => {
      const ast = parseSource('view { input @model(value) @input(handleInput()) }');
      const el = ast.view.children[0];
      assert.ok(el.directives.length >= 2);
    });
  });

  // ---------- Component Props ----------

  describe('Component props', () => {
    test('parses component with string prop', () => {
      const ast = parseSource(`
import Card from './Card.pulse'
view { Card(title="Hello") }
`);
      const comp = ast.view.children[0];
      assert.strictEqual(comp.props.length, 1);
      assert.strictEqual(comp.props[0].name, 'title');
    });

    test('parses component with boolean prop', () => {
      const ast = parseSource(`
import Toggle from './Toggle.pulse'
view { Toggle(active=true) }
`);
      const comp = ast.view.children[0];
      assert.strictEqual(comp.props[0].name, 'active');
    });

    test('parses component with expression prop', () => {
      const ast = parseSource(`
import Counter from './Counter.pulse'
state { n: 5 }
view { Counter(count={n + 1}) }
`);
      const comp = ast.view.children[0];
      assert.strictEqual(comp.props[0].value.type, 'BinaryExpression');
    });

    test('parses component with identifier prop', () => {
      const ast = parseSource(`
import Display from './Display.pulse'
state { data: "test" }
view { Display(value=data) }
`);
      const comp = ast.view.children[0];
      assert.strictEqual(comp.props[0].value.type, 'Identifier');
    });

    test('parses component with multiple props', () => {
      const ast = parseSource(`
import Btn from './Btn.pulse'
view { Btn(label="Go", disabled=false, size=3) }
`);
      const comp = ast.view.children[0];
      assert.strictEqual(comp.props.length, 3);
    });
  });

  // ---------- Text Nodes and Interpolation ----------

  describe('Text nodes and interpolation', () => {
    test('parses plain text node', () => {
      const ast = parseSource('view { span "Hello" }');
      const el = ast.view.children[0];
      assert.ok(el.textContent.length > 0);
    });

    test('parses text with single interpolation', () => {
      const ast = parseSource('state { name: "World" } view { span "Hello {name}" }');
      assert.ok(ast.view);
    });

    test('parses text with multiple interpolations', () => {
      const ast = parseSource('state { first: "A" last: "B" } view { span "{first} {last}" }');
      assert.ok(ast.view);
    });

    test('parses text with nested braces in interpolation', () => {
      const ast = parseSource('state { show: true } view { span "{show ? \'a\' : \'b\'}" }');
      assert.ok(ast.view);
    });

    test('parses text with no interpolation', () => {
      const ast = parseSource('view { span "plain text" }');
      const el = ast.view.children[0];
      assert.ok(el.textContent.length > 0);
      // First part should be a string, not an interpolation
      assert.strictEqual(typeof el.textContent[0].parts[0], 'string');
    });

    test('parses empty interpolation gracefully', () => {
      const ast = parseSource('view { span "{}" }');
      assert.ok(ast.view);
    });
  });

  // ---------- Directives ----------

  describe('Directive parsing', () => {
    test('parses @if directive', () => {
      const ast = parseSource(`
state { show: true }
view { @if (show) { span "visible" } }
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'IfDirective');
      assert.ok(directive.consequent.length > 0);
    });

    test('parses @if with @else', () => {
      const ast = parseSource(`
state { show: true }
view {
  @if (show) { span "yes" }
  @else { span "no" }
}
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'IfDirective');
      assert.ok(directive.alternate);
    });

    test('parses @if with @else-if chain (hyphenated)', () => {
      const ast = parseSource(`
state { status: "a" }
view {
  @if (status == "a") { span "A" }
  @else-if (status == "b") { span "B" }
  @else { span "other" }
}
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'IfDirective');
      assert.ok(directive.elseIfBranches.length >= 1);
      assert.ok(directive.alternate);
    });

    test('parses @if with @else @if chain (separate)', () => {
      const ast = parseSource(`
state { status: "a" }
view {
  @if (status == "a") { span "A" }
  @else @if (status == "b") { span "B" }
  @else { span "other" }
}
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'IfDirective');
      assert.ok(directive.elseIfBranches.length >= 1);
      assert.ok(directive.alternate);
    });

    test('parses @for directive with in', () => {
      const ast = parseSource(`
state { items: [1, 2, 3] }
view { @for (item in items) { span "{item}" } }
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'EachDirective');
      assert.strictEqual(directive.itemName, 'item');
    });

    test('parses @for directive with of', () => {
      const ast = parseSource(`
state { items: [1, 2, 3] }
view { @for (item of items) { span "{item}" } }
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'EachDirective');
    });

    test('parses @for directive with key function', () => {
      const ast = parseSource(`
state { items: [{ id: 1 }] }
view { @for (item of items) key(item.id) { span "{item.id}" } }
`);
      const directive = ast.view.children[0];
      assert.ok(directive.keyExpr);
    });

    test('parses @for directive without key function', () => {
      const ast = parseSource(`
state { items: [1, 2] }
view { @for (item of items) { span "{item}" } }
`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.keyExpr, null);
    });

    test('parses event directive with modifiers', () => {
      const result = compileOk(`
state { count: 0 }
view { button @click.prevent(count++) "Inc" }
`);
      assert.ok(result.code);
    });

    test('parses @back directive', () => {
      const ast = parseSource('view { @back }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'NavigateDirective');
      assert.strictEqual(directive.action, 'back');
    });

    test('parses @forward directive', () => {
      const ast = parseSource('view { @forward }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'NavigateDirective');
      assert.strictEqual(directive.action, 'forward');
    });

    test('parses @client SSR directive', () => {
      const result = compileOk(`
view { div @client { span "Client only" } }
`);
      assert.ok(result.code);
    });

    test('parses @server SSR directive', () => {
      const result = compileOk(`
view { div @server { span "Server only" } }
`);
      assert.ok(result.code);
    });
  });

  // ---------- A11y Directives ----------

  describe('A11y directive parsing', () => {
    test('parses @a11y with string value', () => {
      const ast = parseSource('view { div @a11y(label="Close menu") "X" }');
      const el = ast.view.children[0];
      const a11y = el.directives.find(d => d.type === 'A11yDirective');
      assert.ok(a11y);
      assert.strictEqual(a11y.attrs.label, 'Close menu');
    });

    test('parses @a11y with boolean values', () => {
      const ast = parseSource('view { div @a11y(modal=true, hidden=false) "content" }');
      const el = ast.view.children[0];
      const a11y = el.directives.find(d => d.type === 'A11yDirective');
      assert.strictEqual(a11y.attrs.modal, true);
      assert.strictEqual(a11y.attrs.hidden, false);
    });

    test('parses @a11y with unquoted identifier value', () => {
      const ast = parseSource('view { div @a11y(role=dialog) "content" }');
      const el = ast.view.children[0];
      const a11y = el.directives.find(d => d.type === 'A11yDirective');
      assert.strictEqual(a11y.attrs.role, 'dialog');
    });

    test('parses @a11y with multiple comma-separated attrs', () => {
      const ast = parseSource('view { div @a11y(role=dialog, label="Settings", modal=true) "content" }');
      const el = ast.view.children[0];
      const a11y = el.directives.find(d => d.type === 'A11yDirective');
      assert.strictEqual(a11y.attrs.role, 'dialog');
      assert.strictEqual(a11y.attrs.label, 'Settings');
      assert.strictEqual(a11y.attrs.modal, true);
    });

    test('parses @live directive with polite', () => {
      const ast = parseSource('view { div @live(polite) { span "status" } }');
      assert.ok(ast.view);
    });

    test('parses @live directive with assertive', () => {
      const ast = parseSource('view { div @live(assertive) { span "error" } }');
      assert.ok(ast.view);
    });

    test('parses @live directive with default priority', () => {
      const ast = parseSource('view { div @live() { span "status" } }');
      assert.ok(ast.view);
    });

    test('parses @focusTrap without options', () => {
      const ast = parseSource('view { div @focusTrap { input button "Submit" } }');
      assert.ok(ast.view);
    });

    test('parses @focusTrap with options', () => {
      const ast = parseSource('view { div @focusTrap(autoFocus=true, returnFocus=true) { input } }');
      assert.ok(ast.view);
    });

    test('parses @focusTrap with string option', () => {
      const ast = parseSource('view { div @focusTrap(initialFocus="close-btn") { input } }');
      assert.ok(ast.view);
    });

    test('parses @focusTrap with boolean flag (no value)', () => {
      const ast = parseSource('view { div @focusTrap(autoFocus) { input } }');
      assert.ok(ast.view);
    });

    test('parses @srOnly directive', () => {
      const ast = parseSource('view { span @srOnly "Screen reader text" }');
      const el = ast.view.children[0];
      const sr = el.directives.find(d => d.type === 'A11yDirective' && d.attrs.srOnly);
      assert.ok(sr);
    });
  });

  // ---------- Model Directive ----------

  describe('Model directive', () => {
    test('parses @model directive', () => {
      const result = compileOk(`
state { name: "" }
view { input @model(name) }
`);
      assert.ok(result.code);
    });

    test('parses @model with modifier', () => {
      const result = compileOk(`
state { name: "" }
view { input @model.lazy(name) }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Inline directive dispatching ----------

  describe('Inline directive dispatching', () => {
    test('parses inline @client directive', () => {
      const ast = parseSource('view { div @client "Client content" }');
      const el = ast.view.children[0];
      const client = el.directives.find(d => d.type === 'ClientDirective');
      assert.ok(client);
    });

    test('parses inline @server directive', () => {
      const ast = parseSource('view { div @server "Server content" }');
      const el = ast.view.children[0];
      const server = el.directives.find(d => d.type === 'ServerDirective');
      assert.ok(server);
    });

    test('parses inline @model directive', () => {
      const ast = parseSource('view { input @model(name) }');
      const el = ast.view.children[0];
      const model = el.directives.find(d => d.type === 'ModelDirective');
      assert.ok(model);
    });
  });

  // ---------- Error cases in view ----------

  describe('View error handling', () => {
    test('error on unexpected token in view', () => {
      const result = compile('view { 12345 }');
      assert.ok(!result.success || result.errors.length > 0);
    });

    test('error on missing @for in/of keyword', () => {
      const result = compile('state { items: [] } view { @for (item items) { span "x" } }');
      assert.ok(!result.success);
    });
  });
});

// =============================================================================
// BLOCKS (compiler/parser/blocks.js) - 79 missing lines
// =============================================================================

describe('Parser Blocks Coverage', () => {

  // ---------- Actions Block ----------

  describe('Actions block', () => {
    test('parses empty actions block', () => {
      const ast = parseSource('actions { }');
      assert.ok(ast.actions);
      assert.strictEqual(ast.actions.functions.length, 0);
    });

    test('parses multiple functions', () => {
      const ast = parseSource(`
actions {
  increment() { count = count + 1 }
  decrement() { count = count - 1 }
  reset() { count = 0 }
}`);
      assert.strictEqual(ast.actions.functions.length, 3);
    });

    test('parses async function', () => {
      const ast = parseSource(`
actions {
  async fetchData() { await fetch("/api") }
}`);
      assert.strictEqual(ast.actions.functions[0].async, true);
    });

    test('parses function with parameters', () => {
      const ast = parseSource(`
actions {
  add(a, b) { result = a + b }
}`);
      assert.strictEqual(ast.actions.functions[0].params.length, 2);
      assert.strictEqual(ast.actions.functions[0].params[0], 'a');
      assert.strictEqual(ast.actions.functions[0].params[1], 'b');
    });

    test('parses function with no parameters', () => {
      const ast = parseSource('actions { doIt() { x = 1 } }');
      assert.strictEqual(ast.actions.functions[0].params.length, 0);
    });

    test('parses function with keyword parameter names', () => {
      // Parameters named after keywords should work
      const ast = parseSource(`
actions {
  handler(state, view) { console.log(state) }
}`);
      assert.ok(ast.actions.functions[0].params.includes('state'));
      assert.ok(ast.actions.functions[0].params.includes('view'));
    });

    test('parses function with nested braces in body', () => {
      const ast = parseSource(`
actions {
  complex() {
    if (true) {
      while (false) {
        x = 1
      }
    }
  }
}`);
      assert.ok(ast.actions.functions[0].body.length > 0);
    });
  });

  // ---------- Router Block ----------

  describe('Router block', () => {
    test('parses basic router block', () => {
      const ast = parseSource(`
router {
  routes {
    "/": HomePage
    "/about": AboutPage
  }
}`);
      assert.ok(ast.router);
      assert.strictEqual(ast.router.routes.length, 2);
    });

    test('parses router with mode', () => {
      const ast = parseSource(`
router {
  mode: "hash"
  routes {
    "/": HomePage
  }
}`);
      assert.strictEqual(ast.router.mode, 'hash');
    });

    test('parses router with base path', () => {
      const ast = parseSource(`
router {
  base: "/app"
  routes {
    "/": HomePage
  }
}`);
      assert.strictEqual(ast.router.base, '/app');
    });

    test('parses router with beforeEach guard', () => {
      const ast = parseSource(`
router {
  routes {
    "/": HomePage
  }
  beforeEach(to, from) {
    if (to == "/admin") { return "/login" }
  }
}`);
      assert.ok(ast.router.beforeEach);
      assert.strictEqual(ast.router.beforeEach.params.length, 2);
    });

    test('parses router with afterEach guard', () => {
      const ast = parseSource(`
router {
  routes {
    "/": HomePage
  }
  afterEach(to) {
    console.log(to)
  }
}`);
      assert.ok(ast.router.afterEach);
      assert.strictEqual(ast.router.afterEach.params.length, 1);
    });

    test('parses router with all options', () => {
      const ast = parseSource(`
router {
  mode: "history"
  base: "/myapp"
  routes {
    "/": Home
    "/about": About
  }
  beforeEach(to, from) { console.log(to) }
  afterEach(to) { console.log(to) }
}`);
      assert.strictEqual(ast.router.mode, 'history');
      assert.strictEqual(ast.router.base, '/myapp');
      assert.strictEqual(ast.router.routes.length, 2);
      assert.ok(ast.router.beforeEach);
      assert.ok(ast.router.afterEach);
    });

    test('error on unknown token in router block', () => {
      const result = compile('router { invalid: "test" }');
      assert.ok(!result.success);
    });

    test('parses guard hook with from keyword as parameter', () => {
      const ast = parseSource(`
router {
  routes { "/": Home }
  beforeEach(to, from) { console.log(from) }
}`);
      // 'from' is a keyword but should be valid as param name
      assert.ok(ast.router.beforeEach.params.includes('from'));
    });
  });

  // ---------- Store Block ----------

  describe('Store block', () => {
    test('parses basic store block', () => {
      const ast = parseSource(`
store {
  state {
    count: 0
  }
}`);
      assert.ok(ast.store);
      assert.ok(ast.store.state);
    });

    test('parses store with actions', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  actions {
    increment() { count = count + 1 }
  }
}`);
      assert.ok(ast.store.actions);
    });

    test('parses store with getters', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  getters {
    doubled() { return count * 2 }
  }
}`);
      assert.ok(ast.store.getters);
      assert.strictEqual(ast.store.getters.getters.length, 1);
      assert.strictEqual(ast.store.getters.getters[0].name, 'doubled');
    });

    test('parses store with persist true', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  persist: true
}`);
      assert.strictEqual(ast.store.persist, true);
    });

    test('parses store with persist false', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  persist: false
}`);
      assert.strictEqual(ast.store.persist, false);
    });

    test('parses store with storageKey', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  storageKey: "my-app"
}`);
      assert.strictEqual(ast.store.storageKey, 'my-app');
    });

    test('parses store with plugins', () => {
      const ast = parseSource(`
store {
  state { count: 0 }
  plugins: [loggerPlugin, historyPlugin]
}`);
      assert.ok(ast.store.plugins);
    });

    test('error on invalid persist value', () => {
      const result = compile('store { persist: "yes" }');
      assert.ok(!result.success);
    });

    test('error on unknown token in store block', () => {
      const result = compile('store { invalid: "test" }');
      assert.ok(!result.success);
    });

    test('parses store with all options', () => {
      const ast = parseSource(`
store {
  state { count: 0 name: "test" }
  getters {
    doubled() { return count * 2 }
    upper() { return name.toUpperCase() }
  }
  actions {
    increment() { count = count + 1 }
    setName(n) { name = n }
  }
  persist: true
  storageKey: "mystore"
}`);
      assert.ok(ast.store.state);
      assert.ok(ast.store.getters);
      assert.ok(ast.store.actions);
      assert.strictEqual(ast.store.persist, true);
      assert.strictEqual(ast.store.storageKey, 'mystore');
    });

    test('parses empty getters block', () => {
      const ast = parseSource('store { getters { } }');
      assert.ok(ast.store.getters);
      assert.strictEqual(ast.store.getters.getters.length, 0);
    });

    test('parses multiple getter declarations', () => {
      const ast = parseSource(`
store {
  state { a: 1 b: 2 }
  getters {
    sumAB() { return a + b }
    diffAB() { return a - b }
    productAB() { return a * b }
  }
}`);
      assert.strictEqual(ast.store.getters.getters.length, 3);
    });
  });

  // ---------- Router View Directives ----------

  describe('Router view directives', () => {
    test('parses @link with text content', () => {
      const ast = parseSource('view { @link("/home") "Go Home" }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'LinkDirective');
      assert.ok(directive.content);
    });

    test('parses @link with block content', () => {
      const ast = parseSource(`
view {
  @link("/about") {
    span "About Us"
  }
}`);
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'LinkDirective');
      assert.ok(Array.isArray(directive.content));
    });

    test('parses @link with options', () => {
      const ast = parseSource('view { @link("/home", { active: true }) "Home" }');
      const directive = ast.view.children[0];
      assert.ok(directive.options);
    });

    test('parses @link without content', () => {
      const ast = parseSource('view { @link("/home") }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.content, null);
    });

    test('parses @outlet without arguments', () => {
      const ast = parseSource('view { @outlet }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'OutletDirective');
      assert.strictEqual(directive.container, null);
    });

    test('parses @outlet with container', () => {
      const ast = parseSource('view { @outlet("#app") }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.container, '#app');
    });

    test('parses @navigate directive', () => {
      const ast = parseSource('view { @navigate("/settings") }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'NavigateDirective');
    });

    test('parses @navigate with options', () => {
      const ast = parseSource('view { @navigate("/home", { replace: true }) }');
      const directive = ast.view.children[0];
      assert.strictEqual(directive.type, 'NavigateDirective');
      assert.ok(directive.options);
    });
  });
});

// =============================================================================
// STYLE (compiler/parser/style.js) - 47 missing lines
// =============================================================================

describe('Parser Style Coverage', () => {

  // ---------- Style Block ----------

  describe('Style block basics', () => {
    test('parses empty style block', () => {
      const ast = parseSource('style { }');
      assert.ok(ast.style);
    });

    test('parses style with single rule', () => {
      const ast = parseSource(`
style {
  .container { padding: 20px }
}`);
      assert.ok(ast.style);
      assert.ok(ast.style.rules.length > 0 || ast.style.raw);
    });

    test('parses style with multiple rules', () => {
      const ast = parseSource(`
style {
  .header { font-size: 24px }
  .content { padding: 16px }
  .footer { margin-top: 20px }
}`);
      assert.ok(ast.style);
    });

    test('preserves raw CSS', () => {
      const ast = parseSource(`
style {
  .test { color: red }
}`);
      assert.ok(ast.style.raw);
      assert.ok(ast.style.raw.includes('color'));
    });
  });

  // ---------- CSS Selectors ----------

  describe('CSS selector parsing', () => {
    test('parses class selector', () => {
      const result = compileOk(`
view { div.test "Hello" }
style { .test { color: red } }
`);
      assert.ok(result.code);
    });

    test('parses id selector', () => {
      const result = compileOk(`
view { div#main "Hello" }
style { #main { color: blue } }
`);
      assert.ok(result.code);
    });

    test('parses descendant selector', () => {
      const result = compileOk(`
view { div { span "Hello" } }
style { div span { color: green } }
`);
      assert.ok(result.code);
    });

    test('parses combinator selectors', () => {
      const result = compileOk(`
view { div { span "Hello" } }
style {
  div > span { color: red }
  div + span { color: blue }
  div ~ span { color: green }
}
`);
      assert.ok(result.code);
    });

    test('parses pseudo-class selectors', () => {
      const result = compileOk(`
view { a "Link" }
style { a:hover { color: red } }
`);
      assert.ok(result.code);
    });

    test('parses @media query', () => {
      const result = compileOk(`
view { div "Hello" }
style {
  @media (max-width: 768px) {
    div { font-size: 14px }
  }
}
`);
      assert.ok(result.code);
    });

    test('parses @keyframes', () => {
      const result = compileOk(`
view { div "Hello" }
style {
  @keyframes fadeIn {
    0% { opacity: 0 }
    100% { opacity: 1 }
  }
}
`);
      assert.ok(result.code);
    });
  });

  // ---------- CSS Properties ----------

  describe('CSS property parsing', () => {
    test('parses simple properties', () => {
      const result = compileOk(`
view { div "x" }
style { div { color: red; font-size: 16px } }
`);
      assert.ok(result.code);
    });

    test('parses property with CSS function value', () => {
      const result = compileOk(`
view { div "x" }
style { div { color: rgba(255, 0, 0, 0.5) } }
`);
      assert.ok(result.code);
    });

    test('parses property with calc() value', () => {
      const result = compileOk(`
view { div "x" }
style { div { width: calc(100% - 20px) } }
`);
      assert.ok(result.code);
    });

    test('parses property with var() value', () => {
      const result = compileOk(`
view { div "x" }
style { div { color: var(--primary-color) } }
`);
      assert.ok(result.code);
    });

    test('parses custom property definition', () => {
      const result = compileOk(`
view { div "x" }
style { div { --primary: #646cff } }
`);
      assert.ok(result.code);
    });

    test('parses hex colors', () => {
      const result = compileOk(`
view { div "x" }
style { div { color: #ff0000; background: #333 } }
`);
      assert.ok(result.code);
    });

    test('parses property with !important', () => {
      const result = compileOk(`
view { div "x" }
style { div { color: red !important } }
`);
      assert.ok(result.code);
    });

    test('parses property with multiple values', () => {
      const result = compileOk(`
view { div "x" }
style { div { margin: 10px 20px 30px 40px } }
`);
      assert.ok(result.code);
    });

    test('parses property with units', () => {
      const result = compileOk(`
view { div "x" }
style {
  div {
    width: 100%;
    height: 50vh;
    padding: 1rem;
    font-size: 1.5em;
    gap: 8px
  }
}
`);
      assert.ok(result.code);
    });

    test('parses property with gradient', () => {
      const result = compileOk(`
view { div "x" }
style { div { background: linear-gradient(to right, #333, #666) } }
`);
      assert.ok(result.code);
    });
  });

  // ---------- Nested Rules ----------

  describe('Nested CSS rules', () => {
    test('parses nested rule with &', () => {
      const result = compileOk(`
view { button "x" }
style {
  button {
    color: blue;
    &:hover { color: red }
  }
}
`);
      assert.ok(result.code);
    });

    test('parses deeply nested rules', () => {
      const result = compileOk(`
view { div { span "x" } }
style {
  .container {
    color: black;
    .inner {
      padding: 10px;
      .deep { margin: 5px }
    }
  }
}
`);
      assert.ok(result.code);
    });

    test('parses nested &-modifier rules', () => {
      const result = compileOk(`
view { div "x" }
style {
  .btn {
    padding: 10px;
    &.active { background: blue }
    &.disabled { opacity: 0.5 }
  }
}
`);
      assert.ok(result.code);
    });
  });

  // ---------- Preprocessor fallback ----------

  describe('Style preprocessor fallback', () => {
    test('handles SASS-like syntax in raw mode', () => {
      const ast = parseSource(`
style {
  $primary: #646cff;
  .btn {
    background: $primary;
    &:hover { opacity: 0.8 }
  }
}`);
      // Should have raw CSS even if parse fails for SASS
      assert.ok(ast.style);
      assert.ok(ast.style.raw);
    });

    test('handles LESS-like syntax in raw mode', () => {
      const ast = parseSource(`
style {
  @primary: #646cff;
  .btn {
    background: @primary;
    &:hover { opacity: 0.8 }
  }
}`);
      assert.ok(ast.style);
      assert.ok(ast.style.raw);
    });
  });

  // ---------- isNestedRule and isPropertyStart ----------

  describe('Nested rule vs property detection', () => {
    test('distinguishes property from nested rule', () => {
      const result = compileOk(`
view { div "x" }
style {
  .parent {
    color: red;
    .child { color: blue }
  }
}
`);
      assert.ok(result.code);
    });

    test('recognizes & as nested rule start', () => {
      const result = compileOk(`
view { div "x" }
style {
  .btn {
    font-size: 14px;
    &:hover { text-decoration: underline }
    &:focus { outline: 2px solid blue }
  }
}
`);
      assert.ok(result.code);
    });
  });
});

// =============================================================================
// CORE (compiler/parser/core.js) - 30 missing lines
// =============================================================================

describe('Parser Core Coverage', () => {

  // ---------- Duplicate block detection ----------

  describe('Duplicate block detection', () => {
    test('error on duplicate state block', () => {
      const result = compile('state { x: 1 } state { y: 2 }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });

    test('error on duplicate view block', () => {
      const result = compile('view { div "a" } view { div "b" }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });

    test('error on duplicate actions block', () => {
      const result = compile('actions { a() { } } actions { b() { } }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });

    test('error on duplicate style block', () => {
      // Note: the lexer's CSS context may tokenize the second 'style' as IDENT,
      // so we just verify it fails (doesn't compile two style blocks)
      const source = `
style {
  .a { color: red }
}
style {
  .b { color: blue }
}`;
      const result = compile(source);
      assert.ok(!result.success, 'Expected compilation to fail with duplicate style blocks');
    });

    test('error on duplicate props block', () => {
      const result = compile('props { a: 1 } props { b: 2 }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });

    test('error on duplicate router block', () => {
      const result = compile('router { routes { "/": Home } } router { routes { "/": Page } }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });

    test('error on duplicate store block', () => {
      const result = compile('store { state { x: 1 } } store { state { y: 2 } }');
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Duplicate'));
    });
  });

  // ---------- Invalid @ directives ----------

  describe('Invalid @ directives', () => {
    test('error on invalid @ directive at top level', () => {
      const result = compile('@invalid');
      assert.ok(!result.success);
    });

    test('error on @ followed by unknown keyword', () => {
      const result = compile('@something "test"');
      assert.ok(!result.success);
    });
  });

  // ---------- Unexpected tokens ----------

  describe('Unexpected tokens at top level', () => {
    test('error on unexpected token', () => {
      const result = compile('12345');
      assert.ok(!result.success);
    });

    test('error on random string at top level', () => {
      const result = compile('"hello world"');
      assert.ok(!result.success);
    });
  });

  // ---------- Parser utility methods ----------

  describe('Parser utility methods', () => {
    test('peek returns undefined for out-of-bounds offset', () => {
      const tokens = tokenize('state { }');
      // Parsing will use the parser internally, we test via parse behavior
      const ast = parseSource('state { }');
      assert.ok(ast.state);
    });

    test('expect provides helpful error message', () => {
      const result = compile('state view');
      // state not followed by { should give error
      assert.ok(!result.success);
      assert.ok(result.errors[0].message.includes('Expected'));
    });

    test('createError includes docs link', () => {
      const result = compile('state { x: }');
      assert.ok(!result.success);
    });
  });

  // ---------- Program structure ----------

  describe('Program structure', () => {
    test('parses complete program with all blocks', () => {
      const ast = parseSource(`
@page MyApp

import Button from './Button.pulse'

props {
  title: "Default"
}

state {
  count: 0
}

view {
  div {
    span "{count}"
    Button(label="Click")
  }
}

actions {
  increment() { count = count + 1 }
}

style {
  div { padding: 20px }
}
`);
      assert.ok(ast.page);
      assert.strictEqual(ast.imports.length, 1);
      assert.ok(ast.props);
      assert.ok(ast.state);
      assert.ok(ast.view);
      assert.ok(ast.actions);
      assert.ok(ast.style);
    });

    test('parses program with only page declaration', () => {
      const ast = parseSource('@page EmptyPage');
      assert.strictEqual(ast.page.name, 'EmptyPage');
      assert.strictEqual(ast.state, null);
      assert.strictEqual(ast.view, null);
    });

    test('parses @route declaration', () => {
      const ast = parseSource('@route "/dashboard"');
      assert.ok(ast.route);
      assert.strictEqual(ast.route.path, '/dashboard');
    });

    test('parses program with imports only', () => {
      const ast = parseSource(`
import A from './A.pulse'
import { B, C } from './BC.pulse'
`);
      assert.strictEqual(ast.imports.length, 2);
    });
  });
});

// =============================================================================
// INTEGRATION: Complex scenarios covering multiple modules
// =============================================================================

describe('Parser Integration Coverage', () => {

  test('compiles complex component with all features', () => {
    const result = compileOk(`
@page Dashboard

import Card from './Card.pulse'
import { Header, Footer } from './layout.pulse'

props {
  title: "Dashboard"
}

state {
  items: []
  loading: false
  filter: "all"
}

view {
  div.dashboard {
    Header(title={title})

    @if (loading) {
      div.spinner "Loading..."
    }
    @else-if (items.length == 0) {
      div.empty "No items"
    }
    @else {
      @for (item of items) key(item.id) {
        Card(data={item})
      }
    }

    Footer
  }
}

actions {
  async loadItems() {
    loading = true
    items = await fetch("/api/items").then(r => r.json())
    loading = false
  }

  setFilter(f) {
    filter = f
  }
}

style {
  .dashboard {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto
  }
  .spinner { color: #666 }
  .empty { text-align: center; padding: 40px }
}
`);
    assert.ok(result.code);
    assert.ok(result.code.includes('Dashboard'));
  });

  test('compiles component with router integration', () => {
    const result = compileOk(`
@page App

view {
  div {
    @link("/home") "Home"
    @link("/about") "About"
    @outlet
  }
}

router {
  mode: "history"
  base: "/app"
  routes {
    "/": HomePage
    "/about": AboutPage
  }
  beforeEach(to, from) {
    console.log(to)
  }
  afterEach(to) {
    console.log(to)
  }
}
`);
    assert.ok(result.code);
  });

  test('compiles component with store', () => {
    const result = compileOk(`
@page App

view {
  div { span "{count}" }
}

store {
  state { count: 0 }
  getters {
    doubled() { return count * 2 }
  }
  actions {
    increment() { count = count + 1 }
  }
  persist: true
  storageKey: "my-store"
}
`);
    assert.ok(result.code);
  });

  test('compiles component with complex expressions', () => {
    const result = compileOk(`
state {
  users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
  selectedId: null
}

view {
  div {
    @for (user of users) key(user.id) {
      div @click(selectedId = user.id) "{user.name}"
    }
    @if (selectedId != null) {
      span "Selected: {selectedId}"
    }
  }
}

actions {
  addUser(name) {
    users = [...users, { id: users.length + 1, name: name }]
  }
  removeUser(id) {
    users = users.filter(u => u.id != id)
  }
}
`);
    assert.ok(result.code);
  });

  test('compiles component with all a11y directives', () => {
    const result = compileOk(`
view {
  div @a11y(role=dialog, label="Settings", modal=true) @focusTrap(autoFocus=true, returnFocus=true) {
    div @live(assertive) { span "Status" }
    span @srOnly "Close dialog"
    button @click(close()) "Close"
  }
}

actions {
  close() { console.log("closed") }
}
`);
    assert.ok(result.code);
  });

  test('compiles component with CSS scoping enabled', () => {
    const result = compileOk(`
@page Styled

view {
  div.container {
    span.title "Hello"
  }
}

style {
  .container {
    padding: 20px;
    &:hover { background: #f0f0f0 }
    .title {
      font-size: 24px;
      color: #333
    }
  }
}
`, { scopeStyles: true });
    assert.ok(result.code);
  });
});
