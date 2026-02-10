/**
 * Pulse Errors Tests
 *
 * Tests for runtime/errors.js - structured error handling
 *
 * @module test/errors
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

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

describe('Errors', () => {
  // =============================================================================
  // PulseError Base Class Tests
  // =============================================================================

  describe('PulseError Base Class Tests', () => {
    test('PulseError creates error with message', () => {
      const error = new PulseError('Test error');
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.name, 'PulseError');
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

      assert.strictEqual(error.line, 10);
      assert.strictEqual(error.column, 5);
      assert.strictEqual(error.file, 'test.pulse');
      assert.strictEqual(error.code, 'TEST_ERROR');
      assert.strictEqual(error.source, 'const x = 1;');
      assert.strictEqual(error.suggestion, 'Fix this');
    });

    test('PulseError.format returns formatted string', () => {
      const error = new PulseError('Test error', {
        line: 10,
        column: 5,
        file: 'test.pulse',
        suggestion: 'Fix this'
      });

      const formatted = error.format();
      assert.ok(formatted.includes('PulseError: Test error'), 'Should include error name and message');
      assert.ok(formatted.includes('test.pulse'), 'Should include file');
      assert.ok(formatted.includes(':10:5'), 'Should include line and column');
      assert.ok(formatted.includes('Fix this'), 'Should include suggestion');
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
      assert.ok(formatted.includes('line 3 with error'), 'Should include error line');
      assert.ok(formatted.includes('>'), 'Should mark error line');
      assert.ok(formatted.includes('^'), 'Should show column indicator');
    });

    test('PulseError.toJSON returns plain object', () => {
      const error = new PulseError('Test error', {
        line: 10,
        column: 5,
        file: 'test.pulse',
        code: 'TEST_ERROR'
      });

      const json = error.toJSON();
      assert.strictEqual(json.name, 'PulseError');
      assert.strictEqual(json.message, 'Test error');
      assert.strictEqual(json.line, 10);
      assert.strictEqual(json.column, 5);
      assert.strictEqual(json.file, 'test.pulse');
      assert.strictEqual(json.code, 'TEST_ERROR');
    });
  });

  // =============================================================================
  // Error Subclass Tests
  // =============================================================================

  describe('Error Subclass Tests', () => {
    test('CompileError extends PulseError', () => {
      const error = new CompileError('Compile error');
      assert.ok(error instanceof PulseError, 'Should be instance of PulseError');
      assert.ok(error instanceof CompileError, 'Should be instance of CompileError');
      assert.strictEqual(error.name, 'CompileError');
      assert.strictEqual(error.code, 'COMPILE_ERROR');
    });

    test('LexerError extends CompileError', () => {
      const error = new LexerError('Lexer error');
      assert.ok(error instanceof CompileError, 'Should be instance of CompileError');
      assert.strictEqual(error.name, 'LexerError');
      assert.strictEqual(error.code, 'LEXER_ERROR');
    });

    test('ParserError extends CompileError', () => {
      const token = { type: 'IDENTIFIER', value: 'x', line: 5, column: 3 };
      const error = new ParserError('Parser error', { token });
      assert.ok(error instanceof CompileError, 'Should be instance of CompileError');
      assert.strictEqual(error.name, 'ParserError');
      assert.strictEqual(error.code, 'PARSER_ERROR');
      assert.strictEqual(error.token, token);
    });

    test('TransformError extends CompileError', () => {
      const error = new TransformError('Transform error');
      assert.ok(error instanceof CompileError, 'Should be instance of CompileError');
      assert.strictEqual(error.name, 'TransformError');
      assert.strictEqual(error.code, 'TRANSFORM_ERROR');
    });

    test('RuntimeError extends PulseError', () => {
      const error = new RuntimeError('Runtime error');
      assert.ok(error instanceof PulseError, 'Should be instance of PulseError');
      assert.strictEqual(error.name, 'RuntimeError');
      assert.strictEqual(error.code, 'RUNTIME_ERROR');
    });

    test('ReactivityError extends RuntimeError', () => {
      const error = new ReactivityError('Reactivity error');
      assert.ok(error instanceof RuntimeError, 'Should be instance of RuntimeError');
      assert.strictEqual(error.name, 'ReactivityError');
      assert.strictEqual(error.code, 'REACTIVITY_ERROR');
    });

    test('DOMError extends RuntimeError', () => {
      const error = new DOMError('DOM error');
      assert.ok(error instanceof RuntimeError, 'Should be instance of RuntimeError');
      assert.strictEqual(error.name, 'DOMError');
      assert.strictEqual(error.code, 'DOM_ERROR');
    });

    test('StoreError extends RuntimeError', () => {
      const error = new StoreError('Store error');
      assert.ok(error instanceof RuntimeError, 'Should be instance of RuntimeError');
      assert.strictEqual(error.name, 'StoreError');
      assert.strictEqual(error.code, 'STORE_ERROR');
    });

    test('RouterError extends RuntimeError', () => {
      const error = new RouterError('Router error');
      assert.ok(error instanceof RuntimeError, 'Should be instance of RuntimeError');
      assert.strictEqual(error.name, 'RouterError');
      assert.strictEqual(error.code, 'ROUTER_ERROR');
    });

    test('CLIError extends PulseError', () => {
      const error = new CLIError('CLI error');
      assert.ok(error instanceof PulseError, 'Should be instance of PulseError');
      assert.strictEqual(error.name, 'CLIError');
      assert.strictEqual(error.code, 'CLI_ERROR');
    });

    test('ConfigError extends CLIError', () => {
      const error = new ConfigError('Config error');
      assert.ok(error instanceof CLIError, 'Should be instance of CLIError');
      assert.strictEqual(error.name, 'ConfigError');
      assert.strictEqual(error.code, 'CONFIG_ERROR');
    });
  });

  // =============================================================================
  // getDocsUrl Tests
  // =============================================================================

  describe('getDocsUrl Tests', () => {
    test('getDocsUrl returns correct URL for known codes', () => {
      const url = getDocsUrl('COMPUTED_SET');
      assert.ok(url.includes('pulse-js.fr'), 'Should include base URL');
      assert.ok(url.includes('reactivity/computed'), 'Should include correct path');
    });

    test('getDocsUrl returns fallback URL for unknown codes', () => {
      const url = getDocsUrl('UNKNOWN_CODE');
      assert.ok(url.includes('pulse-js.fr'), 'Should include base URL');
      assert.ok(url.includes('errors#unknown_code'), 'Should include error section');
    });
  });

  // =============================================================================
  // SUGGESTIONS Tests
  // =============================================================================

  describe('SUGGESTIONS Tests', () => {
    test('SUGGESTIONS has functions for common errors', () => {
      assert.ok(typeof SUGGESTIONS['undefined-variable'] === 'function', 'Should have undefined-variable');
      assert.ok(typeof SUGGESTIONS['duplicate-declaration'] === 'function', 'Should have duplicate-declaration');
      assert.ok(typeof SUGGESTIONS['unexpected-token'] === 'function', 'Should have unexpected-token');
      assert.ok(typeof SUGGESTIONS['computed-set'] === 'function', 'Should have computed-set');
      assert.ok(typeof SUGGESTIONS['circular-dependency'] === 'function', 'Should have circular-dependency');
      assert.ok(typeof SUGGESTIONS['mount-not-found'] === 'function', 'Should have mount-not-found');
    });

    test('SUGGESTIONS functions return strings', () => {
      const suggestion = SUGGESTIONS['undefined-variable']('myVar');
      assert.ok(typeof suggestion === 'string', 'Should return string');
      assert.ok(suggestion.includes('myVar'), 'Should include variable name');
    });
  });

  // =============================================================================
  // createErrorMessage Tests
  // =============================================================================

  describe('createErrorMessage Tests', () => {
    test('createErrorMessage formats message correctly', () => {
      const message = createErrorMessage({
        code: 'TEST_ERROR',
        message: 'Something went wrong',
        context: 'While testing',
        suggestion: 'Try again'
      });

      assert.ok(message.includes('[Pulse]'), 'Should include Pulse prefix');
      assert.ok(message.includes('Something went wrong'), 'Should include message');
      assert.ok(message.includes('While testing'), 'Should include context');
      assert.ok(message.includes('Try again'), 'Should include suggestion');
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

      assert.ok(message.includes('Key1: Value1'), 'Should include detail 1');
      assert.ok(message.includes('Key2: Value2'), 'Should include detail 2');
    });
  });

  // =============================================================================
  // createParserError Tests
  // =============================================================================

  describe('createParserError Tests', () => {
    test('createParserError creates error from token', () => {
      const token = { type: 'IDENTIFIER', value: 'x', line: 10, column: 5 };
      const error = createParserError('Unexpected token', token);

      assert.ok(error instanceof ParserError, 'Should be ParserError');
      assert.strictEqual(error.line, 10);
      assert.strictEqual(error.column, 5);
      assert.strictEqual(error.token, token);
    });

    test('createParserError handles missing token info', () => {
      const error = createParserError('Error', null);
      assert.strictEqual(error.line, 1);
      assert.strictEqual(error.column, 1);
    });
  });

  // =============================================================================
  // formatError Tests
  // =============================================================================

  describe('formatError Tests', () => {
    test('formatError formats PulseError with source', () => {
      const source = 'const x = 1;\nconst y = 2;';
      const error = new PulseError('Test error', { line: 1, source });

      const formatted = formatError(error, source);
      assert.ok(formatted.includes('PulseError'), 'Should include error name');
      assert.ok(formatted.includes('const x = 1'), 'Should include source line');
    });

    test('formatError handles plain Error', () => {
      const error = new Error('Plain error');
      const formatted = formatError(error);
      assert.ok(formatted.includes('Plain error'), 'Should include message');
    });

    test('formatError handles Error with line info', () => {
      const error = new Error('Error with line');
      error.line = 5;
      error.column = 3;
      const source = 'line 1\nline 2\nline 3\nline 4\nline 5 error';

      const formatted = formatError(error, source);
      assert.ok(formatted.includes('line 5 error'), 'Should include error line');
    });
  });

  // =============================================================================
  // Errors Factory Tests
  // =============================================================================

  describe('Errors Factory Tests', () => {
    test('Errors.computedSet creates ReactivityError', () => {
      const error = Errors.computedSet('myComputed');
      assert.ok(error instanceof ReactivityError, 'Should be ReactivityError');
      assert.strictEqual(error.code, 'COMPUTED_SET');
      assert.ok(error.message.includes('myComputed'), 'Should include name');
    });

    test('Errors.circularDependency creates ReactivityError', () => {
      const error = Errors.circularDependency(['effect1', 'effect2'], ['effect3']);
      assert.ok(error instanceof ReactivityError, 'Should be ReactivityError');
      assert.strictEqual(error.code, 'CIRCULAR_DEPENDENCY');
      assert.ok(error.message.includes('effect1'), 'Should include effect IDs');
    });

    test('Errors.mountNotFound creates DOMError', () => {
      const error = Errors.mountNotFound('#app');
      assert.ok(error instanceof DOMError, 'Should be DOMError');
      assert.strictEqual(error.code, 'MOUNT_ERROR');
      assert.ok(error.message.includes('#app'), 'Should include selector');
    });

    test('Errors.listNoKey creates DOMError', () => {
      const error = Errors.listNoKey();
      assert.ok(error instanceof DOMError, 'Should be DOMError');
      assert.strictEqual(error.code, 'LIST_NO_KEY');
    });

    test('Errors.routeNotFound creates RouterError', () => {
      const error = Errors.routeNotFound('/unknown');
      assert.ok(error instanceof RouterError, 'Should be RouterError');
      assert.strictEqual(error.code, 'ROUTE_NOT_FOUND');
      assert.ok(error.message.includes('/unknown'), 'Should include path');
    });

    test('Errors.lazyTimeout creates RouterError', () => {
      const error = Errors.lazyTimeout(5000);
      assert.ok(error instanceof RouterError, 'Should be RouterError');
      assert.strictEqual(error.code, 'LAZY_TIMEOUT');
      assert.ok(error.message.includes('5000'), 'Should include timeout');
    });

    test('Errors.persistError creates StoreError', () => {
      const error = Errors.persistError('save', new Error('Quota exceeded'));
      assert.ok(error instanceof StoreError, 'Should be StoreError');
      assert.strictEqual(error.code, 'PERSIST_ERROR');
      assert.ok(error.message.includes('save'), 'Should include operation');
    });

    test('Errors.invalidStoreValue creates StoreError', () => {
      const error = Errors.invalidStoreValue('function');
      assert.ok(error instanceof StoreError, 'Should be StoreError');
      assert.strictEqual(error.code, 'STORE_TYPE_ERROR');
      assert.ok(error.message.includes('function'), 'Should include type');
    });

    test('Errors.nativeNotAvailable creates RuntimeError', () => {
      const error = Errors.nativeNotAvailable('vibrate');
      assert.ok(error instanceof RuntimeError, 'Should be RuntimeError');
      assert.strictEqual(error.code, 'NATIVE_ERROR');
      assert.ok(error.message.includes('vibrate'), 'Should include API name');
    });
  });
});
