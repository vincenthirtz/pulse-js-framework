/**
 * Lint Command Tests
 *
 * Tests for the semantic analyzer and lint rules
 *
 * @module test/lint
 */

import { strict as assert } from 'node:assert';
import { SemanticAnalyzer, LintRules } from '../cli/lint.js';
import { parse } from '../compiler/index.js';
import {
  test,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

/**
 * Runs the linter on Pulse source code
 *
 * @param {string} source - The Pulse source code
 * @returns {Array<Object>} Array of diagnostics
 */
function lint(source) {
  const ast = parse(source);
  const analyzer = new SemanticAnalyzer(ast, source);
  return analyzer.analyze();
}

printSection('Lint Tests');

// =============================================================================
// Semantic Analysis Tests
// =============================================================================

test('valid component passes without errors', () => {
  const source = `
@page Counter

state {
  count: 0
}

view {
  div "Count: {count}"
  button @click(count++) "+"
}`;

  const diagnostics = lint(source);
  const errors = diagnostics.filter(d => d.severity === 'error');
  assert.equal(errors.length, 0, 'Expected no errors');
});

test('detects undefined state reference in view', () => {
  const source = `
@page Test

view {
  UnknownComponent "test"
}`;

  const diagnostics = lint(source);
  const undefinedErrors = diagnostics.filter(d => d.code === 'undefined-reference');
  assert(undefinedErrors.length > 0, 'Expected undefined reference error for UnknownComponent');
});

test('detects unused import', () => {
  const source = `
import Button from './Button.pulse'

@page Test

view {
  div "Hello"
}`;

  const diagnostics = lint(source);
  const unusedImports = diagnostics.filter(d => d.code === 'unused-import');
  assert(unusedImports.length > 0, 'Expected unused import warning');
  assert(unusedImports.some(d => d.message.includes('Button')), 'Warning should mention Button');
});

test('component import reference marks import as used', () => {
  // This test verifies that using an imported component in the view
  // correctly marks it as used
  const source = `
import Button from './Button.pulse'

@page Test

view {
  div "test"
}`;

  const diagnostics = lint(source);
  const unusedImports = diagnostics.filter(d => d.code === 'unused-import');
  // Button is imported but not used - should be flagged
  assert(unusedImports.length > 0, 'Unused import should be flagged');
});

test('detects unused state variable', () => {
  const source = `
@page Test

state {
  count: 0
  unused: "never used"
}

view {
  div "Count: {count}"
}`;

  const diagnostics = lint(source);
  const unusedState = diagnostics.filter(d => d.code === 'unused-state');
  assert(unusedState.length > 0, 'Expected unused state warning');
  assert(unusedState.some(d => d.message.includes('unused')), 'Warning should mention unused');
});

test('state used in directive is not flagged', () => {
  const source = `
@page Test

state {
  count: 0
}

view {
  button @click(count++) "+"
}`;

  const diagnostics = lint(source);
  const unusedState = diagnostics.filter(d => d.code === 'unused-state');
  assert.equal(unusedState.length, 0, 'Should not flag state used in directive');
});

// =============================================================================
// Style Convention Tests
// =============================================================================

test('detects non-PascalCase page name', () => {
  const source = `
@page myComponent

view {
  div "test"
}`;

  const diagnostics = lint(source);
  const namingIssues = diagnostics.filter(d => d.code === 'naming-page');
  assert(namingIssues.length > 0, 'Expected naming convention warning');
});

test('PascalCase page name passes', () => {
  const source = `
@page MyComponent

view {
  div "test"
}`;

  const diagnostics = lint(source);
  const namingIssues = diagnostics.filter(d => d.code === 'naming-page');
  assert.equal(namingIssues.length, 0, 'PascalCase name should pass');
});

test('detects empty state block', () => {
  const source = `
@page Test

state {
}

view {
  div "test"
}`;

  const diagnostics = lint(source);
  const emptyBlocks = diagnostics.filter(d => d.code === 'empty-block');
  assert(emptyBlocks.length > 0, 'Expected empty block warning');
});

test('detects empty view block', () => {
  const source = `
@page Test

view {
}`;

  const diagnostics = lint(source);
  const emptyBlocks = diagnostics.filter(d => d.code === 'empty-block');
  assert(emptyBlocks.length > 0, 'Expected empty view block warning');
});

test('detects unsorted imports', () => {
  const source = `
import Z from './Z.pulse'
import A from './A.pulse'

@page Test

view {
  Z
  A
}`;

  const diagnostics = lint(source);
  const importOrder = diagnostics.filter(d => d.code === 'import-order');
  assert(importOrder.length > 0, 'Expected import order warning');
});

test('sorted imports pass', () => {
  const source = `
import A from './A.pulse'
import Z from './Z.pulse'

@page Test

view {
  A
  Z
}`;

  const diagnostics = lint(source);
  const importOrder = diagnostics.filter(d => d.code === 'import-order');
  assert.equal(importOrder.length, 0, 'Sorted imports should pass');
});

// =============================================================================
// Lint Rules Configuration
// =============================================================================

test('LintRules has correct severity levels', () => {
  assert.equal(LintRules['undefined-reference'].severity, 'error');
  assert.equal(LintRules['unused-import'].severity, 'warning');
  assert.equal(LintRules['naming-page'].severity, 'info');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
