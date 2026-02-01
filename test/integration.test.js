/**
 * Pulse Framework Integration Tests
 *
 * Tests for cross-module integration, security fixes, and enhanced error handling.
 * Validates the high-priority improvements made to the framework.
 *
 * @module test/integration
 */

import { createMockLocalStorage } from './utils.js';
import { createDOM, createMockWindow } from './mock-dom.js';

// Setup mocks before importing modules
const { storage: localStorage, clear: clearStorage } = createMockLocalStorage();
global.localStorage = localStorage;

const { document: mockDocument, Node } = createDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { window: mockWindow } = createMockWindow(mockDocument);
global.window = mockWindow;
global.document = mockDocument;
global.Node = Node;

// Import framework modules
import { createStore, createActions } from '../runtime/store.js';
import {
  pulse,
  effect,
  batch,
  resetContext,
  EffectError,
  onEffectError,
  onCleanup
} from '../runtime/pulse.js';

import {
  test,
  testAsync,
  runAsyncTests,
  beforeEach,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// Reset state before each test
beforeEach(() => {
  clearStorage();
  resetContext();
  onEffectError(null); // Clear any global error handler
});

// =============================================================================
// Store Security Tests (safeDeserialize)
// =============================================================================

printSection('Store Security Tests');

test('blocks __proto__ injection in persisted state', () => {
  // Simulate malicious localStorage data
  localStorage.setItem('security-test', JSON.stringify({
    count: 42,
    __proto__: { isAdmin: true }
  }));

  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'security-test' }
  );

  // Should load the safe count value
  assertEqual(store.count.get(), 42, 'Should load count');

  // Should NOT have __proto__ pollution - check Object.prototype wasn't modified
  assertEqual(Object.prototype.isAdmin, undefined, 'Prototype should not be polluted');

  // The __proto__ key should not be registered as an own property in $pulses
  assertEqual(Object.hasOwn(store.$pulses, '__proto__'), false, '__proto__ should not be an own property');
});

test('blocks constructor injection in persisted state', () => {
  localStorage.setItem('constructor-test', JSON.stringify({
    count: 10,
    constructor: { prototype: { hacked: true } }
  }));

  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'constructor-test' }
  );

  assertEqual(store.count.get(), 10, 'Should load safe values');
  assertEqual(Object.prototype.hacked, undefined, 'Should not pollute prototype');
});

test('blocks prototype key injection', () => {
  localStorage.setItem('prototype-test', JSON.stringify({
    value: 'safe',
    prototype: { evil: true }
  }));

  const store = createStore(
    { value: '' },
    { persist: true, storageKey: 'prototype-test' }
  );

  assertEqual(store.value.get(), 'safe', 'Should load safe value');
});

test('ignores unknown keys in persisted state', () => {
  localStorage.setItem('unknown-keys-test', JSON.stringify({
    count: 5,
    unknownKey: 'should be ignored',
    anotherUnknown: { nested: true }
  }));

  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'unknown-keys-test' }
  );

  assertEqual(store.count.get(), 5, 'Should load known key');
  assertEqual(store.unknownKey, undefined, 'Unknown key should not exist');
});

test('validates nested objects recursively', () => {
  localStorage.setItem('nested-security-test', JSON.stringify({
    user: {
      name: 'John',
      __proto__: { admin: true },
      unknownField: 'ignored'
    }
  }));

  const store = createStore(
    { user: { name: '', age: 0 } },
    { persist: true, storageKey: 'nested-security-test' }
  );

  assertEqual(store.user.name.get(), 'John', 'Should load nested name');
  // unknownField should be ignored, __proto__ should be blocked
});

test('handles malformed JSON gracefully', () => {
  localStorage.setItem('malformed-test', 'not valid json{');

  // Should not throw, should use initial state
  const store = createStore(
    { count: 100 },
    { persist: true, storageKey: 'malformed-test' }
  );

  assertEqual(store.count.get(), 100, 'Should use initial state on parse error');
});

// =============================================================================
// Effect Error Handling Tests
// =============================================================================

printSection('Effect Error Handling Tests');

test('EffectError class contains context information', () => {
  const err = new EffectError('Test error', {
    effectId: 'test-effect-1',
    phase: 'execution',
    dependencyCount: 3,
    cause: new Error('Original error')
  });

  assertEqual(err.name, 'EffectError', 'Should have correct name');
  assertEqual(err.effectId, 'test-effect-1', 'Should have effect ID');
  assertEqual(err.phase, 'execution', 'Should have phase');
  assertEqual(err.dependencyCount, 3, 'Should have dependency count');
  assert(err.cause instanceof Error, 'Should have cause');
  assertEqual(err.cause.message, 'Original error', 'Cause should have message');
});

test('effect accepts custom id option', () => {
  const p = pulse(0);
  let capturedError = null;

  onEffectError((err) => {
    capturedError = err;
  });

  effect(() => {
    p.get();
    if (p.peek() === 1) {
      throw new Error('Intentional error');
    }
  }, { id: 'my-custom-effect' });

  p.set(1);

  assert(capturedError !== null, 'Error should be captured');
  assertEqual(capturedError.effectId, 'my-custom-effect', 'Should use custom ID');
  assertEqual(capturedError.phase, 'execution', 'Should identify execution phase');
});

test('effect onError handler is called on error', () => {
  const p = pulse(0);
  let handlerCalled = false;
  let receivedError = null;

  effect(() => {
    p.get();
    if (p.peek() === 1) {
      throw new Error('Effect failed');
    }
  }, {
    id: 'error-handler-test',
    onError: (err) => {
      handlerCalled = true;
      receivedError = err;
    }
  });

  p.set(1);

  assert(handlerCalled, 'onError handler should be called');
  assert(receivedError instanceof EffectError, 'Should receive EffectError');
  assertEqual(receivedError.effectId, 'error-handler-test');
});

test('global onEffectError handler catches errors', () => {
  const errors = [];
  const prevHandler = onEffectError((err) => {
    errors.push(err);
  });

  const p = pulse(0);

  effect(() => {
    if (p.get() === 1) {
      throw new Error('Error 1');
    }
  });

  effect(() => {
    if (p.get() === 1) {
      throw new Error('Error 2');
    }
  });

  p.set(1);

  assertEqual(errors.length, 2, 'Should capture both errors');
  assert(errors[0] instanceof EffectError, 'First error should be EffectError');
  assert(errors[1] instanceof EffectError, 'Second error should be EffectError');

  // Restore previous handler
  onEffectError(prevHandler);
});

test('effect-specific handler takes precedence over global', () => {
  let globalCalled = false;
  let localCalled = false;

  onEffectError(() => {
    globalCalled = true;
  });

  const p = pulse(0);

  effect(() => {
    if (p.get() === 1) {
      throw new Error('Test');
    }
  }, {
    onError: () => {
      localCalled = true;
    }
  });

  p.set(1);

  assert(localCalled, 'Local handler should be called');
  assert(!globalCalled, 'Global handler should NOT be called when local handles it');
});

test('cleanup errors are caught with phase context', () => {
  let capturedError = null;

  onEffectError((err) => {
    capturedError = err;
  });

  const p = pulse(0);

  effect(() => {
    p.get();
    // Use onCleanup to register a cleanup that throws
    onCleanup(() => {
      throw new Error('Cleanup failed');
    });
  }, { id: 'cleanup-test' });

  // Trigger cleanup by changing value (re-runs effect)
  p.set(1);

  assert(capturedError !== null, 'Cleanup error should be captured');
  assertEqual(capturedError.phase, 'cleanup', 'Should identify cleanup phase');
  assertEqual(capturedError.effectId, 'cleanup-test');
});

test('effect errors include dependency count', () => {
  let capturedError = null;

  onEffectError((err) => {
    capturedError = err;
  });

  const a = pulse(1);
  const b = pulse(2);
  const c = pulse(3);

  effect(() => {
    // Read all three to create dependencies
    a.get();
    b.get();
    c.get();
    throw new Error('After reading deps');
  });

  assert(capturedError !== null, 'Error should be captured');
  assertEqual(capturedError.dependencyCount, 3, 'Should have 3 dependencies');
});

test('onEffectError returns previous handler', () => {
  const handler1 = () => {};
  const handler2 = () => {};

  const prev1 = onEffectError(handler1);
  assertEqual(prev1, null, 'First handler should return null');

  const prev2 = onEffectError(handler2);
  assertEqual(prev2, handler1, 'Should return previous handler');

  const prev3 = onEffectError(null);
  assertEqual(prev3, handler2, 'Should return handler2 when clearing');
});

// =============================================================================
// Store Nested Objects Tests
// =============================================================================

printSection('Store Nested Objects Tests');

test('nested objects work correctly after persistence load', () => {
  // First, create a store and persist nested data using $setState
  // (which properly updates both parent and nested pulses)
  const store1 = createStore(
    { user: { name: 'John', age: 30 } },
    { persist: true, storageKey: 'nested-persist-test' }
  );

  // Use $setState to update nested object (this updates parent pulse too)
  store1.$setState({ user: { name: 'Jane', age: 25 } });

  // Create a new store with same key - should load persisted nested data
  const store2 = createStore(
    { user: { name: '', age: 0 } },
    { persist: true, storageKey: 'nested-persist-test' }
  );

  assertEqual(store2.user.name.get(), 'Jane', 'Should load nested name');
  assertEqual(store2.user.age.get(), 25, 'Should load nested age');
});

test('deeply nested objects respect depth limit', () => {
  // Create an object nested deeper than MAX_NESTING_DEPTH (10)
  let deepObject = { value: 'bottom' };
  for (let i = 0; i < 15; i++) {
    deepObject = { nested: deepObject };
  }

  // Should not throw, should handle gracefully
  const store = createStore({ deep: deepObject });

  // Store should be created successfully
  assert(store.deep !== undefined, 'Store should handle deep nesting');
});

test('$setState updates nested pulses correctly', () => {
  const store = createStore({
    user: { name: 'John', email: 'john@example.com' }
  });

  let effectCount = 0;
  effect(() => {
    store.user.name.get();
    effectCount++;
  });

  assertEqual(effectCount, 1, 'Effect should run once initially');

  store.$setState({
    user: { name: 'Jane', email: 'jane@example.com' }
  });

  assertEqual(store.user.name.get(), 'Jane', 'Nested name should update');
  assertEqual(store.user.email.get(), 'jane@example.com', 'Nested email should update');
  assertEqual(effectCount, 2, 'Effect should run after setState');
});

// =============================================================================
// Router + Store Integration Tests
// =============================================================================

printSection('Router + Store Integration Tests');

test('store state persists independently of other operations', () => {
  const store = createStore({ theme: 'light', count: 0 });

  store.theme.set('dark');
  store.count.set(42);

  assertEqual(store.theme.get(), 'dark');
  assertEqual(store.count.get(), 42);
});

test('batch updates work correctly with store', () => {
  const store = createStore({ a: 0, b: 0, c: 0 });
  let effectRuns = 0;

  effect(() => {
    store.a.get();
    store.b.get();
    store.c.get();
    effectRuns++;
  });

  assertEqual(effectRuns, 1, 'Effect should run once initially');

  batch(() => {
    store.a.set(1);
    store.b.set(2);
    store.c.set(3);
  });

  assertEqual(effectRuns, 2, 'Effect should run once for batched updates');
  assertEqual(store.a.get(), 1);
  assertEqual(store.b.get(), 2);
  assertEqual(store.c.get(), 3);
});

test('store actions work with error handling', () => {
  const store = createStore({ value: 0 });

  const actions = createActions(store, {
    increment: (s) => s.value.update(v => v + 1),
    failingAction: () => {
      throw new Error('Action failed');
    }
  });

  actions.increment();
  assertEqual(store.value.get(), 1);

  let caught = false;
  try {
    actions.failingAction();
  } catch (e) {
    caught = true;
    assertEqual(e.message, 'Action failed');
  }

  assert(caught, 'Error should propagate from action');
});

// =============================================================================
// Async Integration Tests
// =============================================================================

printSection('Async Integration Tests');

testAsync('rapid store updates persist correctly', async () => {
  const store = createStore(
    { count: 0 },
    { persist: true, storageKey: 'rapid-updates-test' }
  );

  // Rapid updates
  for (let i = 0; i < 50; i++) {
    store.count.set(i);
  }

  assertEqual(store.count.get(), 49, 'Final value should be correct');

  // Wait for persistence effect
  await new Promise(resolve => setTimeout(resolve, 10));

  const persisted = JSON.parse(localStorage.getItem('rapid-updates-test'));
  assertEqual(persisted.count, 49, 'Persisted value should match');
});

testAsync('effect cleanup runs correctly on dispose', async () => {
  let cleanupCount = 0;

  const p = pulse(0);

  const dispose = effect(() => {
    p.get();
    // Use onCleanup to register cleanup function
    onCleanup(() => {
      cleanupCount++;
    });
  });

  p.set(1); // Triggers cleanup + re-run
  assertEqual(cleanupCount, 1, 'Cleanup should run on re-trigger');

  dispose(); // Triggers final cleanup
  assertEqual(cleanupCount, 2, 'Cleanup should run on dispose');
});

// =============================================================================
// CLI Utility Tests
// =============================================================================

printSection('CLI Utility Tests');

// Import CLI utilities
import { parseArgs, formatBytes, relativePath } from '../cli/utils/file-utils.js';

test('parseArgs extracts options and patterns correctly', () => {
  const result = parseArgs(['src/', '--fix', 'lib/', '-v', '**/*.pulse']);

  assertDeepEqual(result.patterns, ['src/', 'lib/', '**/*.pulse'], 'Should extract patterns');
  assertEqual(result.options.fix, true, 'Should extract --fix option');
  assertEqual(result.options.v, true, 'Should extract -v option');
});

test('parseArgs handles empty args', () => {
  const result = parseArgs([]);

  assertDeepEqual(result.patterns, [], 'Should have empty patterns');
  assertDeepEqual(result.options, {}, 'Should have empty options');
});

test('parseArgs handles only options', () => {
  const result = parseArgs(['--check', '--verbose', '-f']);

  assertDeepEqual(result.patterns, [], 'Should have empty patterns');
  assertEqual(result.options.check, true);
  assertEqual(result.options.verbose, true);
  assertEqual(result.options.f, true);
});

test('parseArgs handles only patterns', () => {
  const result = parseArgs(['src/', 'lib/', 'test/']);

  assertDeepEqual(result.patterns, ['src/', 'lib/', 'test/']);
  assertDeepEqual(result.options, {});
});

test('formatBytes formats zero correctly', () => {
  assertEqual(formatBytes(0), '0 B', 'Should format zero');
});

test('formatBytes formats bytes correctly', () => {
  assertEqual(formatBytes(500), '500 B', 'Should format bytes');
});

test('formatBytes formats kilobytes correctly', () => {
  const result = formatBytes(1024);
  assert(result.includes('KB'), 'Should format as KB');
});

test('formatBytes formats megabytes correctly', () => {
  const result = formatBytes(1024 * 1024);
  assert(result.includes('MB'), 'Should format as MB');
});

test('formatBytes formats gigabytes correctly', () => {
  const result = formatBytes(1024 * 1024 * 1024);
  assert(result.includes('GB'), 'Should format as GB');
});

test('relativePath handles absolute paths', () => {
  const cwd = process.cwd();
  const absPath = cwd + '/src/App.pulse';
  const result = relativePath(absPath);

  assertEqual(result, 'src/App.pulse', 'Should return relative path');
});

test('relativePath handles paths outside cwd', () => {
  const result = relativePath('/some/other/path/file.js');

  assertEqual(result, '/some/other/path/file.js', 'Should return original path');
});

// =============================================================================
// CLI Error Handling Tests
// =============================================================================

printSection('CLI Error Handling Tests');

// Import compiler for error testing
import { parse } from '../compiler/index.js';

test('compiler throws on invalid syntax', () => {
  const invalidSource = `
@page Test

state {
  count: // missing value
}

view {
  div "Hello"
}`;

  let caught = false;
  try {
    parse(invalidSource);
  } catch (e) {
    caught = true;
    assert(e.message.length > 0, 'Error should have message');
  }

  assert(caught, 'Should throw on invalid syntax');
});

test('compiler throws on unclosed brace', () => {
  const invalidSource = `
@page Test

state {
  count: 0

view {
  div "Hello"
}`;

  let caught = false;
  try {
    parse(invalidSource);
  } catch (e) {
    caught = true;
  }

  assert(caught, 'Should throw on unclosed brace');
});

test('compiler handles empty source', () => {
  const emptySource = '';
  const ast = parse(emptySource);

  assertEqual(ast.type, 'Program', 'Should return Program node');
  assertEqual(ast.page, null, 'Should have null page');
  assertEqual(ast.imports.length, 0, 'Should have no imports');
});

test('compiler handles whitespace-only source', () => {
  const whitespaceSource = '   \n\t\n   ';
  const ast = parse(whitespaceSource);

  assertEqual(ast.type, 'Program', 'Should return Program node');
});

test('compiler handles incomplete import statement', () => {
  // import with missing source should throw
  const invalidImport = `
import Button

@page Test
view { div "Hello" }`;

  let caught = false;
  try {
    parse(invalidImport);
  } catch (e) {
    caught = true;
  }

  assert(caught, 'Should throw on incomplete import');
});

test('compiler handles duplicate blocks', () => {
  const duplicateBlocks = `
@page Test

state { a: 1 }
state { b: 2 }

view { div "Hello" }`;

  let caught = false;
  try {
    parse(duplicateBlocks);
  } catch (e) {
    caught = true;
    assert(e.message.includes('Duplicate'), 'Error should mention duplicate');
  }

  assert(caught, 'Should throw on duplicate state block');
});

// =============================================================================
// Lint Error Path Tests
// =============================================================================

printSection('Lint Error Path Tests');

import { SemanticAnalyzer, LintRules } from '../cli/lint.js';

test('SemanticAnalyzer handles minimal AST', () => {
  const minimalAst = {
    type: 'Program',
    imports: [],
    page: null,
    state: null,
    view: null,
    actions: null
  };

  const analyzer = new SemanticAnalyzer(minimalAst, '');
  const diagnostics = analyzer.analyze();

  assert(Array.isArray(diagnostics), 'Should return array of diagnostics');
});

test('SemanticAnalyzer handles empty view children', () => {
  const ast = {
    type: 'Program',
    imports: [],
    page: { name: 'Test' },
    state: null,
    view: {
      type: 'ViewBlock',
      children: []
    },
    actions: null
  };

  const analyzer = new SemanticAnalyzer(ast, '');
  const diagnostics = analyzer.analyze();

  // Should produce empty-block warning
  assert(diagnostics.some(d => d.code === 'empty-block'), 'Should warn about empty view');
});

test('SemanticAnalyzer handles partial AST nodes', () => {
  // AST with minimal/partial state properties (missing value, missing line info)
  const partialAst = {
    type: 'Program',
    imports: [],
    page: { name: 'Test' },
    state: {
      properties: [
        { name: 'count' }, // Missing value, line, column - partial node
        { name: 'status', line: 5, column: 3 } // Missing value but has location
      ]
    },
    view: {
      children: [
        { type: 'Element', selector: 'div', directives: [], textContent: [], children: [] }
      ]
    },
    actions: null
  };

  // Should not throw
  const analyzer = new SemanticAnalyzer(partialAst, '');
  const diagnostics = analyzer.analyze();

  assert(Array.isArray(diagnostics), 'Should handle partial AST gracefully');
  // Both state vars are unused - should have warnings
  const unusedState = diagnostics.filter(d => d.code === 'unused-state');
  assertEqual(unusedState.length, 2, 'Should detect unused state variables');
});

test('LintRules has expected structure', () => {
  const ruleNames = Object.keys(LintRules);

  assert(ruleNames.length >= 10, 'Should have at least 10 rules');

  for (const name of ruleNames) {
    const rule = LintRules[name];
    assert('severity' in rule, `Rule ${name} should have severity`);
    assert('fixable' in rule, `Rule ${name} should have fixable`);
    assert(['error', 'warning', 'info'].includes(rule.severity),
      `Rule ${name} should have valid severity`);
  }
});

// =============================================================================
// Run Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
