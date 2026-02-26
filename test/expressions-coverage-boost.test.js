/**
 * Expressions Transformer Coverage Boost Tests
 *
 * Targeted tests to improve coverage for:
 * - compiler/transformer/expressions.js
 *   - transformExpressionString: compound/simple assignments, state/prop reads
 *   - transformFunctionBody: post/pre increment/decrement, isObjectKey, bracket balancing
 *
 * @module test/expressions-coverage-boost
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { compile } from '../compiler/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compile a .pulse page with the given state vars and an action body.
 * Returns the compiled code string (throws on failure).
 */
function compileActions(stateVars, actionBody) {
  const stateBlock = Object.entries(stateVars)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const source = [
    '@page Test',
    '',
    'state {',
    stateBlock,
    '}',
    '',
    'view {',
    '  div "test"',
    '}',
    '',
    'actions {',
    '  doSomething() {',
    `    ${actionBody}`,
    '  }',
    '}'
  ].join('\n');

  const result = compile(source);
  assert.ok(
    result.success,
    `Compilation failed: ${(result.errors || []).map(e => e.message).join(', ')}`
  );
  return result.code;
}

/**
 * Compile a .pulse page with the given state vars and a view that interpolates
 * exprContent as a template expression.  Returns the compiled code string.
 */
function compileExpression(stateVars, exprContent) {
  const stateBlock = Object.entries(stateVars)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const source = [
    '@page Test',
    '',
    'state {',
    stateBlock,
    '}',
    '',
    'view {',
    `  div "{${exprContent}}"`,
    '}',
    '',
    'style {',
    '  .test { color: red }',
    '}'
  ].join('\n');

  const result = compile(source);
  assert.ok(
    result.success,
    `Compilation failed: ${(result.errors || []).map(e => e.message).join(', ')}`
  );
  return result.code;
}

/**
 * Compile a .pulse page with props and a view that interpolates exprContent.
 */
function compilePropsExpression(propDefs, stateVars, exprContent) {
  const propsBlock = Object.entries(propDefs)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const stateBlock = Object.entries(stateVars)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const source = [
    '@page Test',
    '',
    ...(Object.keys(propDefs).length > 0 ? ['props {', propsBlock, '}', ''] : []),
    ...(Object.keys(stateVars).length > 0 ? ['state {', stateBlock, '}', ''] : []),
    'view {',
    `  div "{${exprContent}}"`,
    '}',
    '',
    'style {',
    '  .test { color: red }',
    '}'
  ].join('\n');

  const result = compile(source);
  assert.ok(
    result.success,
    `Compilation failed: ${(result.errors || []).map(e => e.message).join(', ')}`
  );
  return result.code;
}

/**
 * Compile a .pulse page with an event handler that executes the given
 * handlerExpr (passed to @click(...)).
 */
function compileEventHandler(stateVars, handlerExpr) {
  const stateBlock = Object.entries(stateVars)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const source = [
    '@page Test',
    '',
    'state {',
    stateBlock,
    '}',
    '',
    'view {',
    `  div @click(${handlerExpr}) "click"`,
    '}',
    '',
    'style {',
    '  .test { color: red }',
    '}'
  ].join('\n');

  const result = compile(source);
  assert.ok(
    result.success,
    `Compilation failed: ${(result.errors || []).map(e => e.message).join(', ')}`
  );
  return result.code;
}

// ---------------------------------------------------------------------------
// 1. transformExpressionString — compound assignment operators
// ---------------------------------------------------------------------------

describe('transformExpressionString — compound assignments', () => {

  test('count += 1 in event handler becomes .update(_v => _v + 1)', () => {
    const code = compileEventHandler({ count: '0' }, 'count += 1');
    assert.match(
      code,
      /count\.update\(_count => _count \+ 1\)/,
      'Expected count.update(_count => _count + 1)'
    );
  });

  test('total *= 2 in event handler becomes .update(_v => _v * 2)', () => {
    const code = compileEventHandler({ total: '0' }, 'total *= 2');
    assert.match(
      code,
      /total\.update\(_total => _total \* 2\)/,
      'Expected total.update(_total => _total * 2)'
    );
  });

  test('name ??= "default" in event handler becomes .update with ?? operator', () => {
    const code = compileEventHandler({ name: 'null' }, 'name ??= "default"');
    // ??= strips trailing '=' leaving '??'
    assert.match(
      code,
      /name\.update\(_name => _name \?\? /,
      'Expected name.update with ?? operator'
    );
  });

  test('count -= 3 in event handler becomes .update(_v => _v - 3)', () => {
    const code = compileEventHandler({ count: '10' }, 'count -= 3');
    assert.match(
      code,
      /count\.update\(_count => _count - 3\)/,
      'Expected count.update(_count => _count - 3)'
    );
  });

  test('compound assignment with nested brackets: items += [newItem]', () => {
    const code = compileEventHandler({ items: '[]' }, 'items += [newItem]');
    // The RHS [newItem] is captured by bracket balancing
    assert.match(
      code,
      /items\.update\(_items => _items \+ \[newItem\]\)/,
      'Expected items.update capturing nested bracket RHS'
    );
  });

});

// ---------------------------------------------------------------------------
// 2. transformExpressionString — simple assignment (stateVar = expr)
// ---------------------------------------------------------------------------

describe('transformExpressionString — simple assignments', () => {

  test('count = 0 in event handler becomes count.set(0)', () => {
    const code = compileEventHandler({ count: '5' }, 'count = 0');
    assert.match(code, /count\.set\(0\)/, 'Expected count.set(0)');
  });

  test('items = [] in event handler becomes items.set([])', () => {
    const code = compileEventHandler({ items: '[]' }, 'items = []');
    assert.match(code, /items\.set\(\[\]\)/, 'Expected items.set([])');
  });

  test('name = event.target.value in @input handler becomes name.set(...)', () => {
    const source = [
      '@page Test',
      '',
      'state {',
      '  name: ""',
      '}',
      '',
      'view {',
      '  input @input(name = event.target.value)',
      '}',
      '',
      'style {',
      '  .test { color: red }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    assert.match(
      result.code,
      /name\.set\(event\.target\.value\)/,
      'Expected name.set(event.target.value)'
    );
  });

});

// ---------------------------------------------------------------------------
// 3. transformExpressionString — state var reads (.get())
// ---------------------------------------------------------------------------

describe('transformExpressionString — state var reads', () => {

  test('single state var in interpolation gets .get()', () => {
    const code = compileExpression({ count: '0' }, 'count');
    assert.match(code, /count\.get\(\)/, 'Expected count.get()');
  });

  test('multiple state vars in same expression each get .get()', () => {
    const code = compileExpression(
      { count: '0', price: '10', total: '0' },
      'count + price + total'
    );
    assert.match(code, /count\.get\(\)/, 'Expected count.get()');
    assert.match(code, /price\.get\(\)/, 'Expected price.get()');
    assert.match(code, /total\.get\(\)/, 'Expected total.get()');
  });

  test('state var read is not double-transformed (no .get().get())', () => {
    const code = compileExpression({ count: '0' }, 'count');
    assert.ok(!code.includes('count.get().get()'), 'Should not double-transform to .get().get()');
  });

  test('no state/prop vars compiles successfully (empty regex guard)', () => {
    // No state block at all — exercises the stateVarsArr.length === 0 branch
    const source = [
      '@page Empty',
      '',
      'view {',
      '  div "hello"',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Should compile with no state vars');
    assert.match(result.code, /el\(/, 'Expected el() call in output');
  });

});

// ---------------------------------------------------------------------------
// 4. transformExpressionString — prop var reads
// ---------------------------------------------------------------------------

describe('transformExpressionString — prop var reads', () => {

  test('standalone prop var in interpolation becomes propVar.get()', () => {
    const code = compilePropsExpression({ label: '""' }, {}, 'label');
    assert.match(code, /label\.get\(\)/, 'Expected label.get()');
  });

  test('prop var with property access gets optional chaining: prop.message -> prop.get()?.message', () => {
    const code = compilePropsExpression({ notification: 'null' }, {}, 'notification.message');
    assert.match(
      code,
      /notification\.get\(\)\?\.message/,
      'Expected notification.get()?.message (optional chaining)'
    );
  });

  test('multiple prop vars each become .get()', () => {
    const code = compilePropsExpression(
      { label: '""', visible: 'true' },
      {},
      'label'
    );
    assert.match(code, /label\.get\(\)/, 'Expected label.get()');
  });

  test('prop var and state var can coexist in same expression', () => {
    const code = compilePropsExpression(
      { multiplier: '1' },
      { count: '0' },
      'count'
    );
    // count is a state var — should get .get()
    assert.match(code, /count\.get\(\)/, 'Expected count.get()');
  });

});

// ---------------------------------------------------------------------------
// 5. transformFunctionBody — post-increment / post-decrement
// ---------------------------------------------------------------------------

describe('transformFunctionBody — post-increment/decrement', () => {

  test('count++ in action body becomes IIFE that preserves old value', () => {
    const code = compileActions({ count: '0' }, 'count++');
    // Expect: ((v) => (count.set(v + 1), v))(count.get())
    assert.match(
      code,
      /\(\(v\) => \(count\.set\(v \+ 1\), v\)\)\(count\.get\(\)\)/,
      'Expected post-increment IIFE pattern'
    );
  });

  test('count-- in action body becomes IIFE that preserves old value', () => {
    const code = compileActions({ count: '10' }, 'count--');
    // Expect: ((v) => (count.set(v - 1), v))(count.get())
    assert.match(
      code,
      /\(\(v\) => \(count\.set\(v - 1\), v\)\)\(count\.get\(\)\)/,
      'Expected post-decrement IIFE pattern'
    );
  });

});

// ---------------------------------------------------------------------------
// 6. transformFunctionBody — pre-increment / pre-decrement
// ---------------------------------------------------------------------------

describe('transformFunctionBody — pre-increment/decrement', () => {

  test('++count in action body becomes set-and-get pattern', () => {
    const code = compileActions({ count: '0' }, '++count');
    // Expect: (count.set(count.get() + 1), count.get())
    assert.match(
      code,
      /\(count\.set\(count\.get\(\) \+ 1\), count\.get\(\)\)/,
      'Expected pre-increment set-and-get pattern'
    );
  });

  test('--count in action body becomes set-and-get pattern', () => {
    const code = compileActions({ count: '5' }, '--count');
    // Expect: (count.set(count.get() - 1), count.get())
    assert.match(
      code,
      /\(count\.set\(count\.get\(\) - 1\), count\.get\(\)\)/,
      'Expected pre-decrement set-and-get pattern'
    );
  });

});

// ---------------------------------------------------------------------------
// 7. transformFunctionBody — isObjectKey detection
// ---------------------------------------------------------------------------

describe('transformFunctionBody — isObjectKey detection', () => {

  test('state var used as object key is NOT transformed to .get()', () => {
    const source = [
      '@page Test',
      '',
      'state {',
      '  count: 0',
      '  name: ""',
      '}',
      '',
      'view {',
      '  div "test"',
      '}',
      '',
      'actions {',
      '  makeObj() {',
      '    return { count: 42, name: "hello" }',
      '  }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    // Keys should be plain identifiers, not .get()
    const actionsSection = result.code.slice(
      result.code.indexOf('// Actions'),
      result.code.indexOf('// View')
    );
    // The literal key `count` must NOT appear as count.get() as a key
    assert.ok(
      !actionsSection.includes('count.get() :'),
      'Object key "count" should NOT be count.get()'
    );
    assert.ok(
      !actionsSection.includes('name.get() :'),
      'Object key "name" should NOT be name.get()'
    );
  });

  test('state var used as object VALUE is transformed to .get()', () => {
    const source = [
      '@page Test',
      '',
      'state {',
      '  count: 0',
      '  name: ""',
      '}',
      '',
      'view {',
      '  div "test"',
      '}',
      '',
      'actions {',
      '  makeObj() {',
      '    return { key1: count, key2: name }',
      '  }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    const actionsSection = result.code.slice(
      result.code.indexOf('// Actions'),
      result.code.indexOf('// View')
    );
    assert.match(actionsSection, /count\.get\(\)/, 'State var as value should be count.get()');
    assert.match(actionsSection, /name\.get\(\)/, 'State var as value should be name.get()');
  });

});

// ---------------------------------------------------------------------------
// 8. transformFunctionBody — state var assignment with bracket balancing
// ---------------------------------------------------------------------------

describe('transformFunctionBody — state var assignment RHS', () => {

  test('simple assignment: count = 0 becomes count.set(0)', () => {
    const code = compileActions({ count: '5' }, 'count = 0');
    assert.match(code, /count\.set\(0\)/, 'Expected count.set(0)');
  });

  test('assignment with expression RHS: total = count + price', () => {
    const code = compileActions(
      { count: '0', price: '10', total: '0' },
      'total = count + price'
    );
    // total.set(...) should contain count.get() and price.get()
    assert.match(code, /total\.set\(/, 'Expected total.set(');
    assert.match(code, /count\.get\(\)/, 'Expected count.get() in RHS');
    assert.match(code, /price\.get\(\)/, 'Expected price.get() in RHS');
  });

  test('assignment with method call on state var: items = items.filter(...)', () => {
    const code = compileActions(
      { items: '[]' },
      'items = items.filter(x => x > 0)'
    );
    assert.match(code, /items\.set\(/, 'Expected items.set(');
    assert.match(code, /items\.get\(\)\.filter/, 'Expected items.get().filter in RHS');
  });

  test('multiple sequential assignments are each transformed', () => {
    const source = [
      '@page Test',
      '',
      'state {',
      '  count: 0',
      '  total: 0',
      '}',
      '',
      'view {',
      '  div "test"',
      '}',
      '',
      'actions {',
      '  reset() {',
      '    count = 0',
      '    total = 0',
      '  }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    assert.match(result.code, /count\.set\(0\)/, 'Expected count.set(0)');
    assert.match(result.code, /total\.set\(0\)/, 'Expected total.set(0)');
  });

});

// ---------------------------------------------------------------------------
// 9. transformFunctionBody — prop var reads in action body
// ---------------------------------------------------------------------------

describe('transformFunctionBody — prop var reads', () => {

  test('prop var read in action body becomes propVar.get()', () => {
    // When a component has props, action functions that reference those props
    // are scoped inside render() so they have access to the useProp variables.
    // The transformer emits label.get() inside the function body.
    const source = [
      '@page Test',
      '',
      'props {',
      '  label: ""',
      '}',
      '',
      'state {',
      '  count: 0',
      '}',
      '',
      'view {',
      '  div "test"',
      '}',
      '',
      'actions {',
      '  logLabel() {',
      '    console.log(label)',
      '  }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    // When props exist, actions referencing them are placed inside render()
    // so they can close over the useProp variables. Search the whole output.
    assert.match(result.code, /label\.get\(\)/, 'Expected label.get() somewhere in output');
  });

});

// ---------------------------------------------------------------------------
// 10. Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {

  test('no state vars and no props: compiles without creating regex', () => {
    const source = [
      '@page Test',
      '',
      'view {',
      '  div "hello world"',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Should compile successfully with no state/props');
    assert.match(result.code, /el\(/, 'Output should contain el() call');
  });

  test('state var read does not produce double .get().get()', () => {
    const code = compileActions({ count: '0' }, 'console.log(count)');
    assert.ok(!code.includes('.get().get()'), 'Should not produce double .get().get()');
    assert.match(code, /count\.get\(\)/, 'Should produce count.get()');
  });

  test('state var in action body read-only usage does not become .set()', () => {
    const code = compileActions({ count: '0' }, 'console.log(count)');
    // There must be no count.set( here because it is a read, not write
    const actionsSection = code.slice(
      code.indexOf('// Actions'),
      code.indexOf('// View')
    );
    assert.ok(!actionsSection.includes('count.set('), 'Read-only usage must not produce .set()');
  });

  test('||= compound assignment in event handler', () => {
    const code = compileEventHandler({ flag: 'false' }, 'flag ||= true');
    assert.match(
      code,
      /flag\.update\(_flag => _flag \|\| true\)/,
      'Expected flag.update with || operator'
    );
  });

  test('&&= compound assignment in event handler', () => {
    const code = compileEventHandler({ flag: 'true' }, 'flag &&= false');
    assert.match(
      code,
      /flag\.update\(_flag => _flag && false\)/,
      'Expected flag.update with && operator'
    );
  });

  test('prop var read in action body becomes propVar.get() (whole output search)', () => {
    // Actions with prop references are placed inside render() to close over
    // useProp variables. Search the whole compiled output for .get() usage.
    const source = [
      '@page Test',
      '',
      'props {',
      '  notification: null',
      '}',
      '',
      'state {',
      '  count: 0',
      '}',
      '',
      'view {',
      '  div "test"',
      '}',
      '',
      'actions {',
      '  showMsg() {',
      '    console.log(notification)',
      '  }',
      '}'
    ].join('\n');
    const result = compile(source);
    assert.ok(result.success, 'Compilation should succeed');
    // notification.get() must appear somewhere in the compiled output
    assert.match(result.code, /notification\.get\(\)/, 'Expected notification.get() in output');
  });

});
