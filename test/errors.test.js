/**
 * Pulse Errors Tests
 *
 * Tests for runtime/errors.js - structured error handling
 *
 * @module test/errors
 */

import {
  PulseError,
  CompileError,
  LexerError,
  ParserError,
  TransformError,
  RuntimeError,
  ReactivityError,
  DOMError,
  StoreError,
  RouterError,
  CLIError,
  ConfigError,
  SUGGESTIONS,
  Errors,
  formatError,
  createParserError,
  createErrorMessage,
  getDocsUrl
} from '../runtime/errors.js';

import {
  test,
  assertEqual,
  assert,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// PulseError Base Class Tests
// =============================================================================

printSection('PulseError Base Class Tests');

test('PulseError creates error with message', () => {
  const error = new PulseError('Test error');
  assertEqual(error.message, 'Test error');
  assertEqual(error.name, 'PulseError');
});

test('PulseError accepts options', () => {
  const error = new PulseError('Test error', {
    line: 10,
    column: 5,
    file: 'test.pulse',
    code: 'TEST_ERROR',
    source: 'const x = 1;',
    suggestion: 'Fix this'
  });

  assertEqual(error.line, 10);
  assertEqual(error.column, 5);
  assertEqual(error.file, 'test.pulse');
  assertEqual(error.code, 'TEST_ERROR');
  assertEqual(error.source, 'const x = 1;');
  assertEqual(error.suggestion, 'Fix this');
});

test('PulseError.format returns formatted string', () => {
  const error = new PulseError('Test error', {
    line: 10,
    column: 5,
    file: 'test.pulse',
    suggestion: 'Fix this'
  });

  const formatted = error.format();
  assert(formatted.includes('PulseError: Test error'), 'Should include error name and message');
  assert(formatted.includes('test.pulse'), 'Should include file');
  assert(formatted.includes(':10:5'), 'Should include line and column');
  assert(formatted.includes('Fix this'), 'Should include suggestion');
});

test('PulseError.formatWithSnippet shows code context', () => {
  const source = `line 1
line 2
line 3 with error
line 4
line 5`;

  const error = new PulseError('Test error', {
    line: 3,
    column: 10,
    file: 'test.pulse',
    source
  });

  const formatted = error.formatWithSnippet();
  assert(formatted.includes('line 3 with error'), 'Should include error line');
  assert(formatted.includes('>'), 'Should mark error line');
  assert(formatted.includes('^'), 'Should show column indicator');
});

test('PulseError.toJSON returns plain object', () => {
  const error = new PulseError('Test error', {
    line: 10,
    column: 5,
    file: 'test.pulse',
    code: 'TEST_ERROR'
  });

  const json = error.toJSON();
  assertEqual(json.name, 'PulseError');
  assertEqual(json.message, 'Test error');
  assertEqual(json.line, 10);
  assertEqual(json.column, 5);
  assertEqual(json.file, 'test.pulse');
  assertEqual(json.code, 'TEST_ERROR');
});

// =============================================================================
// Error Subclass Tests
// =============================================================================

printSection('Error Subclass Tests');

test('CompileError extends PulseError', () => {
  const error = new CompileError('Compile error');
  assert(error instanceof PulseError, 'Should be instance of PulseError');
  assert(error instanceof CompileError, 'Should be instance of CompileError');
  assertEqual(error.name, 'CompileError');
  assertEqual(error.code, 'COMPILE_ERROR');
});

test('LexerError extends CompileError', () => {
  const error = new LexerError('Lexer error');
  assert(error instanceof CompileError, 'Should be instance of CompileError');
  assertEqual(error.name, 'LexerError');
  assertEqual(error.code, 'LEXER_ERROR');
});

test('ParserError extends CompileError', () => {
  const token = { type: 'IDENTIFIER', value: 'x', line: 5, column: 3 };
  const error = new ParserError('Parser error', { token });
  assert(error instanceof CompileError, 'Should be instance of CompileError');
  assertEqual(error.name, 'ParserError');
  assertEqual(error.code, 'PARSER_ERROR');
  assertEqual(error.token, token);
});

test('TransformError extends CompileError', () => {
  const error = new TransformError('Transform error');
  assert(error instanceof CompileError, 'Should be instance of CompileError');
  assertEqual(error.name, 'TransformError');
  assertEqual(error.code, 'TRANSFORM_ERROR');
});

test('RuntimeError extends PulseError', () => {
  const error = new RuntimeError('Runtime error');
  assert(error instanceof PulseError, 'Should be instance of PulseError');
  assertEqual(error.name, 'RuntimeError');
  assertEqual(error.code, 'RUNTIME_ERROR');
});

test('ReactivityError extends RuntimeError', () => {
  const error = new ReactivityError('Reactivity error');
  assert(error instanceof RuntimeError, 'Should be instance of RuntimeError');
  assertEqual(error.name, 'ReactivityError');
  assertEqual(error.code, 'REACTIVITY_ERROR');
});

test('DOMError extends RuntimeError', () => {
  const error = new DOMError('DOM error');
  assert(error instanceof RuntimeError, 'Should be instance of RuntimeError');
  assertEqual(error.name, 'DOMError');
  assertEqual(error.code, 'DOM_ERROR');
});

test('StoreError extends RuntimeError', () => {
  const error = new StoreError('Store error');
  assert(error instanceof RuntimeError, 'Should be instance of RuntimeError');
  assertEqual(error.name, 'StoreError');
  assertEqual(error.code, 'STORE_ERROR');
});

test('RouterError extends RuntimeError', () => {
  const error = new RouterError('Router error');
  assert(error instanceof RuntimeError, 'Should be instance of RuntimeError');
  assertEqual(error.name, 'RouterError');
  assertEqual(error.code, 'ROUTER_ERROR');
});

test('CLIError extends PulseError', () => {
  const error = new CLIError('CLI error');
  assert(error instanceof PulseError, 'Should be instance of PulseError');
  assertEqual(error.name, 'CLIError');
  assertEqual(error.code, 'CLI_ERROR');
});

test('ConfigError extends CLIError', () => {
  const error = new ConfigError('Config error');
  assert(error instanceof CLIError, 'Should be instance of CLIError');
  assertEqual(error.name, 'ConfigError');
  assertEqual(error.code, 'CONFIG_ERROR');
});

// =============================================================================
// getDocsUrl Tests
// =============================================================================

printSection('getDocsUrl Tests');

test('getDocsUrl returns correct URL for known codes', () => {
  const url = getDocsUrl('COMPUTED_SET');
  assert(url.includes('pulse-js.fr'), 'Should include base URL');
  assert(url.includes('reactivity/computed'), 'Should include correct path');
});

test('getDocsUrl returns fallback URL for unknown codes', () => {
  const url = getDocsUrl('UNKNOWN_CODE');
  assert(url.includes('pulse-js.fr'), 'Should include base URL');
  assert(url.includes('errors#unknown_code'), 'Should include error section');
});

// =============================================================================
// SUGGESTIONS Tests
// =============================================================================

printSection('SUGGESTIONS Tests');

test('SUGGESTIONS has functions for common errors', () => {
  assert(typeof SUGGESTIONS['undefined-variable'] === 'function', 'Should have undefined-variable');
  assert(typeof SUGGESTIONS['duplicate-declaration'] === 'function', 'Should have duplicate-declaration');
  assert(typeof SUGGESTIONS['unexpected-token'] === 'function', 'Should have unexpected-token');
  assert(typeof SUGGESTIONS['computed-set'] === 'function', 'Should have computed-set');
  assert(typeof SUGGESTIONS['circular-dependency'] === 'function', 'Should have circular-dependency');
  assert(typeof SUGGESTIONS['mount-not-found'] === 'function', 'Should have mount-not-found');
});

test('SUGGESTIONS functions return strings', () => {
  const suggestion = SUGGESTIONS['undefined-variable']('myVar');
  assert(typeof suggestion === 'string', 'Should return string');
  assert(suggestion.includes('myVar'), 'Should include variable name');
});

// =============================================================================
// createErrorMessage Tests
// =============================================================================

printSection('createErrorMessage Tests');

test('createErrorMessage formats message correctly', () => {
  const message = createErrorMessage({
    code: 'TEST_ERROR',
    message: 'Something went wrong',
    context: 'While testing',
    suggestion: 'Try again'
  });

  assert(message.includes('[Pulse]'), 'Should include Pulse prefix');
  assert(message.includes('Something went wrong'), 'Should include message');
  assert(message.includes('While testing'), 'Should include context');
  assert(message.includes('Try again'), 'Should include suggestion');
});

test('createErrorMessage includes details', () => {
  const message = createErrorMessage({
    code: 'TEST_ERROR',
    message: 'Error',
    details: {
      'Key1': 'Value1',
      'Key2': 'Value2'
    }
  });

  assert(message.includes('Key1: Value1'), 'Should include detail 1');
  assert(message.includes('Key2: Value2'), 'Should include detail 2');
});

// =============================================================================
// createParserError Tests
// =============================================================================

printSection('createParserError Tests');

test('createParserError creates error from token', () => {
  const token = { type: 'IDENTIFIER', value: 'x', line: 10, column: 5 };
  const error = createParserError('Unexpected token', token);

  assert(error instanceof ParserError, 'Should be ParserError');
  assertEqual(error.line, 10);
  assertEqual(error.column, 5);
  assertEqual(error.token, token);
});

test('createParserError handles missing token info', () => {
  const error = createParserError('Error', null);
  assertEqual(error.line, 1);
  assertEqual(error.column, 1);
});

// =============================================================================
// formatError Tests
// =============================================================================

printSection('formatError Tests');

test('formatError formats PulseError with source', () => {
  const source = 'const x = 1;\nconst y = 2;';
  const error = new PulseError('Test error', { line: 1, source });

  const formatted = formatError(error, source);
  assert(formatted.includes('PulseError'), 'Should include error name');
  assert(formatted.includes('const x = 1'), 'Should include source line');
});

test('formatError handles plain Error', () => {
  const error = new Error('Plain error');
  const formatted = formatError(error);
  assert(formatted.includes('Plain error'), 'Should include message');
});

test('formatError handles Error with line info', () => {
  const error = new Error('Error with line');
  error.line = 5;
  error.column = 3;
  const source = 'line 1\nline 2\nline 3\nline 4\nline 5 error';

  const formatted = formatError(error, source);
  assert(formatted.includes('line 5 error'), 'Should include error line');
});

// =============================================================================
// Errors Factory Tests
// =============================================================================

printSection('Errors Factory Tests');

test('Errors.computedSet creates ReactivityError', () => {
  const error = Errors.computedSet('myComputed');
  assert(error instanceof ReactivityError, 'Should be ReactivityError');
  assertEqual(error.code, 'COMPUTED_SET');
  assert(error.message.includes('myComputed'), 'Should include name');
});

test('Errors.circularDependency creates ReactivityError', () => {
  const error = Errors.circularDependency(['effect1', 'effect2'], ['effect3']);
  assert(error instanceof ReactivityError, 'Should be ReactivityError');
  assertEqual(error.code, 'CIRCULAR_DEPENDENCY');
  assert(error.message.includes('effect1'), 'Should include effect IDs');
});

test('Errors.mountNotFound creates DOMError', () => {
  const error = Errors.mountNotFound('#app');
  assert(error instanceof DOMError, 'Should be DOMError');
  assertEqual(error.code, 'MOUNT_ERROR');
  assert(error.message.includes('#app'), 'Should include selector');
});

test('Errors.listNoKey creates DOMError', () => {
  const error = Errors.listNoKey();
  assert(error instanceof DOMError, 'Should be DOMError');
  assertEqual(error.code, 'LIST_NO_KEY');
});

test('Errors.routeNotFound creates RouterError', () => {
  const error = Errors.routeNotFound('/unknown');
  assert(error instanceof RouterError, 'Should be RouterError');
  assertEqual(error.code, 'ROUTE_NOT_FOUND');
  assert(error.message.includes('/unknown'), 'Should include path');
});

test('Errors.lazyTimeout creates RouterError', () => {
  const error = Errors.lazyTimeout(5000);
  assert(error instanceof RouterError, 'Should be RouterError');
  assertEqual(error.code, 'LAZY_TIMEOUT');
  assert(error.message.includes('5000'), 'Should include timeout');
});

test('Errors.persistError creates StoreError', () => {
  const error = Errors.persistError('save', new Error('Quota exceeded'));
  assert(error instanceof StoreError, 'Should be StoreError');
  assertEqual(error.code, 'PERSIST_ERROR');
  assert(error.message.includes('save'), 'Should include operation');
});

test('Errors.invalidStoreValue creates StoreError', () => {
  const error = Errors.invalidStoreValue('function');
  assert(error instanceof StoreError, 'Should be StoreError');
  assertEqual(error.code, 'STORE_TYPE_ERROR');
  assert(error.message.includes('function'), 'Should include type');
});

test('Errors.nativeNotAvailable creates RuntimeError', () => {
  const error = Errors.nativeNotAvailable('vibrate');
  assert(error instanceof RuntimeError, 'Should be RuntimeError');
  assertEqual(error.code, 'NATIVE_ERROR');
  assert(error.message.includes('vibrate'), 'Should include API name');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
