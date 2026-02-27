/**
 * Errors Coverage Boost Tests
 *
 * Targets uncovered lines in runtime/errors.js to push coverage from ~63% to 92%+.
 * Focuses on: ClientError, createClientErrorClass, formatWithSnippet edge cases,
 * format edge cases, toJSON, SUGGESTIONS (all functions), createErrorMessage details,
 * formatError branches, Errors factory methods in depth.
 *
 * @module test/errors-coverage-boost
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
  ClientError,
  createClientErrorClass,
  CLIError,
  ConfigError,
  SUGGESTIONS,
  Errors,
  formatError,
  createParserError,
  createErrorMessage,
  getDocsUrl
} from '../runtime/errors.js';

// =============================================================================
// PulseError.formatWithSnippet() — lines 38-73
// =============================================================================

describe('PulseError.formatWithSnippet()', () => {
  test('falls back to format() when line is null', () => {
    const error = new PulseError('No line info', { file: 'app.pulse' });
    // line is null → formatWithSnippet delegates to format()
    const result = error.formatWithSnippet('const x = 1;');
    assert.ok(result.includes('PulseError: No line info'), 'Should contain error message');
    assert.ok(result.includes('app.pulse'), 'Should contain file from format()');
  });

  test('falls back to format() when source is null', () => {
    const error = new PulseError('No source', { line: 5 });
    const result = error.formatWithSnippet(null);
    assert.ok(result.includes('PulseError: No source'), 'Should contain error message');
  });

  test('uses this.source when no argument provided', () => {
    const source = 'line1\nline2\nline3 error here\nline4\nline5';
    const error = new PulseError('Embedded source', { line: 3, source });
    const result = error.formatWithSnippet();
    assert.ok(result.includes('line3 error here'), 'Should show error line from this.source');
    assert.ok(result.includes('>'), 'Should mark error line with >');
  });

  test('shows context lines before and after the error line', () => {
    const source = 'a\nb\nc error\nd\ne';
    const error = new PulseError('Context test', { line: 3, column: 1 });
    const result = error.formatWithSnippet(source, 2);
    assert.ok(result.includes('a'), 'Should show line 1 (2 before error)');
    assert.ok(result.includes('b'), 'Should show line 2 (1 before error)');
    assert.ok(result.includes('c error'), 'Should show error line');
    assert.ok(result.includes('d'), 'Should show line 4 (1 after error)');
    assert.ok(result.includes('e'), 'Should show line 5 (2 after error)');
  });

  test('clamps context to start of file', () => {
    // Error on line 1 — no lines before it
    const source = 'first line error\nsecond line\nthird line';
    const error = new PulseError('Start of file', { line: 1, column: 5 });
    const result = error.formatWithSnippet(source, 3);
    assert.ok(result.includes('first line error'), 'Should include error line');
    assert.ok(result.includes('>'), 'Should mark error line');
  });

  test('clamps context to end of file', () => {
    const source = 'line1\nline2\nlast line error';
    const error = new PulseError('End of file', { line: 3, column: 1 });
    const result = error.formatWithSnippet(source, 5);
    assert.ok(result.includes('last line error'), 'Should include error line');
    assert.ok(result.includes('line1'), 'Should include lines before');
  });

  test('shows column caret when column is set', () => {
    const source = 'const x = badValue;';
    const error = new PulseError('Caret test', { line: 1, column: 11 });
    const result = error.formatWithSnippet(source);
    assert.ok(result.includes('^'), 'Should include column caret');
  });

  test('does not show caret when column is null', () => {
    const source = 'some code here';
    const error = new PulseError('No column', { line: 1 });
    const result = error.formatWithSnippet(source);
    // No column means no ^ indicator line
    assert.ok(!result.includes('^'), 'Should not include caret without column');
  });

  test('includes suggestion in output', () => {
    const source = 'bad code';
    const error = new PulseError('With suggestion', {
      line: 1,
      suggestion: 'Use the correct syntax'
    });
    const result = error.formatWithSnippet(source);
    assert.ok(result.includes('Use the correct syntax'), 'Should include suggestion');
    assert.ok(result.includes('→'), 'Should include arrow before suggestion');
  });

  test('does not include suggestion section when suggestion is null', () => {
    const source = 'some code';
    const error = new PulseError('No suggestion', { line: 1 });
    const result = error.formatWithSnippet(source);
    assert.ok(!result.includes('→'), 'Should not include → without suggestion');
  });

  test('includes docs URL for known non-default error code', () => {
    const source = 'const x = computed.set(5);';
    const error = new PulseError('With doc code', {
      line: 1,
      code: 'COMPUTED_SET'
    });
    const result = error.formatWithSnippet(source);
    assert.ok(result.includes('pulse-js.fr'), 'Should include docs base URL');
    assert.ok(result.includes('reactivity/computed'), 'Should include specific doc path');
  });

  test('does not include docs URL for default PULSE_ERROR code', () => {
    const source = 'some code';
    const error = new PulseError('Default code', { line: 1 });
    // code defaults to 'PULSE_ERROR' which is excluded
    const result = error.formatWithSnippet(source);
    assert.ok(!result.includes('See:'), 'Should not show See: for default code');
  });

  test('uses anonymous file placeholder when file is null', () => {
    const source = 'code here';
    const error = new PulseError('No file', { line: 1 });
    const result = error.formatWithSnippet(source);
    assert.ok(result.includes('<anonymous>'), 'Should use <anonymous> as file placeholder');
  });

  test('includes file in at-line when file is set', () => {
    const source = 'code here';
    const error = new PulseError('With file', { line: 1, file: 'src/app.pulse' });
    const result = error.formatWithSnippet(source);
    assert.ok(result.includes('src/app.pulse'), 'Should include file name in header');
  });

  test('customContextLines parameter controls how many lines are shown', () => {
    const source = 'a\nb\nc\nd error\ne\nf\ng';
    const error = new PulseError('Context lines test', { line: 4 });
    // With 1 context line: should see c, d, e only
    const result1 = error.formatWithSnippet(source, 1);
    assert.ok(result1.includes('c'), 'Should include 1 line before');
    assert.ok(!result1.includes(' a\n') && !result1.includes('| a'), 'Should not include line far before');
    // With 0 context lines: only the error line
    const result0 = error.formatWithSnippet(source, 0);
    assert.ok(result0.includes('d error'), 'Should include only error line');
  });
});

// =============================================================================
// PulseError.format() — lines 80-97
// =============================================================================

describe('PulseError.format()', () => {
  test('returns simple name: message when no file or line', () => {
    const error = new PulseError('Simple message');
    const result = error.format();
    assert.strictEqual(result, 'PulseError: Simple message');
  });

  test('includes file when file is set but no line', () => {
    const error = new PulseError('File only', { file: 'myfile.pulse' });
    const result = error.format();
    assert.ok(result.includes('myfile.pulse'), 'Should include file');
    assert.ok(!result.includes(':undefined'), 'Should not include undefined line');
  });

  test('includes line when line is set but no file', () => {
    const error = new PulseError('Line only', { line: 42 });
    const result = error.format();
    assert.ok(result.includes(':42'), 'Should include line number');
    assert.ok(result.includes('<anonymous>'), 'Should use anonymous for missing file');
  });

  test('includes both file and line when both set', () => {
    const error = new PulseError('File and line', { file: 'comp.pulse', line: 10 });
    const result = error.format();
    assert.ok(result.includes('comp.pulse'), 'Should include file');
    assert.ok(result.includes(':10'), 'Should include line');
  });

  test('includes column after line when column is set', () => {
    const error = new PulseError('With column', { file: 'a.pulse', line: 5, column: 8 });
    const result = error.format();
    assert.ok(result.includes(':5:8'), 'Should include line:column');
  });

  test('does not include column section when column is null', () => {
    const error = new PulseError('No column', { file: 'a.pulse', line: 5 });
    const result = error.format();
    // Should have :5 but not :5:null or :5:undefined
    assert.ok(result.includes(':5'), 'Should include line');
    assert.ok(!result.includes(':null'), 'Should not include :null');
    assert.ok(!result.includes(':undefined'), 'Should not include :undefined');
  });

  test('includes suggestion with → arrow', () => {
    const error = new PulseError('Suggest', { suggestion: 'Do this instead' });
    const result = error.format();
    assert.ok(result.includes('→ Do this instead'), 'Should include suggestion with arrow');
  });

  test('does not include suggestion section when suggestion is null', () => {
    const error = new PulseError('No suggest');
    const result = error.format();
    assert.ok(!result.includes('→'), 'Should not include arrow without suggestion');
  });

  test('includes See: docs URL for non-default error code', () => {
    const error = new PulseError('Doc code', { code: 'PARSER_ERROR' });
    const result = error.format();
    assert.ok(result.includes('See:'), 'Should include See: label');
    assert.ok(result.includes('pulse-js.fr'), 'Should include docs URL');
  });

  test('does not include See: for default PULSE_ERROR code', () => {
    const error = new PulseError('Default code');
    // code defaults to 'PULSE_ERROR'
    const result = error.format();
    assert.ok(!result.includes('See:'), 'Should omit docs for default code');
  });

  test('name is preserved in subclasses in format output', () => {
    const error = new LexerError('Lexer issue');
    const result = error.format();
    assert.ok(result.startsWith('LexerError:'), 'Subclass name should appear in format');
  });
});

// =============================================================================
// PulseError.toJSON() — lines 104-113
// =============================================================================

describe('PulseError.toJSON()', () => {
  test('returns all expected keys', () => {
    const error = new PulseError('JSON test', {
      line: 7,
      column: 3,
      file: 'test.pulse',
      code: 'TEST_CODE',
      suggestion: 'Fix it'
    });
    const json = error.toJSON();
    assert.ok('name' in json, 'Should have name');
    assert.ok('message' in json, 'Should have message');
    assert.ok('line' in json, 'Should have line');
    assert.ok('column' in json, 'Should have column');
    assert.ok('file' in json, 'Should have file');
    assert.ok('code' in json, 'Should have code');
    assert.ok('suggestion' in json, 'Should have suggestion');
  });

  test('suggestion is included in toJSON output', () => {
    const error = new PulseError('With suggestion', { suggestion: 'Please fix this' });
    const json = error.toJSON();
    assert.strictEqual(json.suggestion, 'Please fix this');
  });

  test('null fields are preserved as null', () => {
    const error = new PulseError('Nulls');
    const json = error.toJSON();
    assert.strictEqual(json.line, null);
    assert.strictEqual(json.column, null);
    assert.strictEqual(json.file, null);
    assert.strictEqual(json.suggestion, null);
  });

  test('toJSON serializes correctly to JSON string', () => {
    const error = new PulseError('Serialize', {
      line: 1,
      column: 1,
      file: 'app.pulse',
      code: 'MY_CODE'
    });
    const jsonStr = JSON.stringify(error.toJSON());
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.message, 'Serialize');
    assert.strictEqual(parsed.file, 'app.pulse');
    assert.strictEqual(parsed.line, 1);
  });

  test('toJSON on subclass preserves subclass name', () => {
    const error = new CompileError('Subclass JSON');
    const json = error.toJSON();
    assert.strictEqual(json.name, 'CompileError');
    assert.strictEqual(json.code, 'COMPILE_ERROR');
  });

  test('toJSON on ParserError includes correct fields', () => {
    const token = { type: 'IDENT', value: 'foo', line: 9, column: 2 };
    const error = new ParserError('Parser JSON', { token });
    const json = error.toJSON();
    assert.strictEqual(json.name, 'ParserError');
    assert.strictEqual(json.code, 'PARSER_ERROR');
    // token is not part of toJSON output (not in base class)
    assert.ok(!('token' in json), 'toJSON should not include token field');
  });
});

// =============================================================================
// CompileError — lines 123-127
// =============================================================================

describe('CompileError', () => {
  test('creates with default code COMPILE_ERROR', () => {
    const error = new CompileError('Compile failed');
    assert.strictEqual(error.name, 'CompileError');
    assert.strictEqual(error.code, 'COMPILE_ERROR');
    assert.ok(error instanceof PulseError);
    assert.ok(error instanceof CompileError);
  });

  test('allows overriding code in options', () => {
    const error = new CompileError('Override', { code: 'LEXER_ERROR' });
    // options.code comes after default spread, so it overrides
    assert.strictEqual(error.code, 'LEXER_ERROR');
  });

  test('accepts line and file options', () => {
    const error = new CompileError('With location', { line: 15, file: 'main.pulse' });
    assert.strictEqual(error.line, 15);
    assert.strictEqual(error.file, 'main.pulse');
  });
});

// =============================================================================
// LexerError — lines 133-137
// =============================================================================

describe('LexerError', () => {
  test('creates with default code LEXER_ERROR', () => {
    const error = new LexerError('Unexpected char');
    assert.strictEqual(error.name, 'LexerError');
    assert.strictEqual(error.code, 'LEXER_ERROR');
    assert.ok(error instanceof CompileError);
    assert.ok(error instanceof PulseError);
  });

  test('accepts location options', () => {
    const error = new LexerError('Bad token', { line: 3, column: 7 });
    assert.strictEqual(error.line, 3);
    assert.strictEqual(error.column, 7);
  });

  test('format output uses LexerError name', () => {
    const error = new LexerError('Token error');
    assert.ok(error.format().startsWith('LexerError:'));
  });
});

// =============================================================================
// ParserError — lines 149-153
// =============================================================================

describe('ParserError', () => {
  test('stores token property', () => {
    const token = { type: 'LBRACE', value: '{', line: 5, column: 1 };
    const error = new ParserError('Unexpected brace', { token });
    assert.strictEqual(error.token, token);
  });

  test('token defaults to null when not provided', () => {
    const error = new ParserError('No token');
    assert.strictEqual(error.token, null);
  });

  test('inherits line/column from options (not from token)', () => {
    // Line/column must be set explicitly — token is stored separately
    const token = { type: 'IDENT', value: 'x', line: 8, column: 4 };
    const error = new ParserError('Token error', { line: 8, column: 4, token });
    assert.strictEqual(error.line, 8);
    assert.strictEqual(error.column, 4);
  });

  test('default code is PARSER_ERROR', () => {
    const error = new ParserError('Parse fail');
    assert.strictEqual(error.code, 'PARSER_ERROR');
  });
});

// =============================================================================
// TransformError — lines 159-163
// =============================================================================

describe('TransformError', () => {
  test('creates with default code TRANSFORM_ERROR', () => {
    const error = new TransformError('Transform failed');
    assert.strictEqual(error.name, 'TransformError');
    assert.strictEqual(error.code, 'TRANSFORM_ERROR');
    assert.ok(error instanceof CompileError);
  });

  test('accepts additional options', () => {
    const error = new TransformError('AST error', { line: 20, file: 'comp.pulse' });
    assert.strictEqual(error.line, 20);
    assert.strictEqual(error.file, 'comp.pulse');
  });
});

// =============================================================================
// RuntimeError — lines 173-177
// =============================================================================

describe('RuntimeError', () => {
  test('creates with default code RUNTIME_ERROR', () => {
    const error = new RuntimeError('Runtime failed');
    assert.strictEqual(error.name, 'RuntimeError');
    assert.strictEqual(error.code, 'RUNTIME_ERROR');
    assert.ok(error instanceof PulseError);
  });

  test('accepts suggestion option', () => {
    const error = new RuntimeError('Oops', { suggestion: 'Check your code' });
    assert.strictEqual(error.suggestion, 'Check your code');
  });
});

// =============================================================================
// ReactivityError — lines 183-187
// =============================================================================

describe('ReactivityError', () => {
  test('creates with default code REACTIVITY_ERROR', () => {
    const error = new ReactivityError('Bad effect');
    assert.strictEqual(error.name, 'ReactivityError');
    assert.strictEqual(error.code, 'REACTIVITY_ERROR');
    assert.ok(error instanceof RuntimeError);
    assert.ok(error instanceof PulseError);
  });
});

// =============================================================================
// DOMError — lines 193-197
// =============================================================================

describe('DOMError', () => {
  test('creates with default code DOM_ERROR', () => {
    const error = new DOMError('DOM failed');
    assert.strictEqual(error.name, 'DOMError');
    assert.strictEqual(error.code, 'DOM_ERROR');
    assert.ok(error instanceof RuntimeError);
  });
});

// =============================================================================
// StoreError — lines 203-207
// =============================================================================

describe('StoreError', () => {
  test('creates with default code STORE_ERROR', () => {
    const error = new StoreError('Store failed');
    assert.strictEqual(error.name, 'StoreError');
    assert.strictEqual(error.code, 'STORE_ERROR');
    assert.ok(error instanceof RuntimeError);
  });
});

// =============================================================================
// RouterError — lines 213-217
// =============================================================================

describe('RouterError', () => {
  test('creates with default code ROUTER_ERROR', () => {
    const error = new RouterError('Router failed');
    assert.strictEqual(error.name, 'RouterError');
    assert.strictEqual(error.code, 'ROUTER_ERROR');
    assert.ok(error instanceof RuntimeError);
  });
});

// =============================================================================
// CLIError — lines 384-388
// =============================================================================

describe('CLIError', () => {
  test('creates with default code CLI_ERROR', () => {
    const error = new CLIError('CLI failed');
    assert.strictEqual(error.name, 'CLIError');
    assert.strictEqual(error.code, 'CLI_ERROR');
    assert.ok(error instanceof PulseError);
  });

  test('accepts options like suggestion and file', () => {
    const error = new CLIError('Bad command', { suggestion: 'Use pulse --help', file: 'pulse.config.js' });
    assert.strictEqual(error.suggestion, 'Use pulse --help');
    assert.strictEqual(error.file, 'pulse.config.js');
  });
});

// =============================================================================
// ConfigError — lines 394-398
// =============================================================================

describe('ConfigError', () => {
  test('creates with default code CONFIG_ERROR', () => {
    const error = new ConfigError('Bad config');
    assert.strictEqual(error.name, 'ConfigError');
    assert.strictEqual(error.code, 'CONFIG_ERROR');
    assert.ok(error instanceof CLIError);
    assert.ok(error instanceof PulseError);
  });

  test('accepts options', () => {
    const error = new ConfigError('Missing key', { file: 'pulse.config.js' });
    assert.strictEqual(error.file, 'pulse.config.js');
  });
});

// =============================================================================
// ClientError — lines 236-297
// =============================================================================

describe('ClientError', () => {
  test('creates with default code CLIENT_ERROR', () => {
    const error = new ClientError('Request failed');
    assert.strictEqual(error.name, 'ClientError');
    assert.strictEqual(error.code, 'CLIENT_ERROR');
    assert.ok(error instanceof RuntimeError);
    assert.ok(error instanceof PulseError);
  });

  test('sets isClientError marker property to true', () => {
    const error = new ClientError('Marker test');
    assert.strictEqual(error.isClientError, true);
  });

  test('message is formatted via createErrorMessage', () => {
    const error = new ClientError('Something failed');
    // createErrorMessage prepends [Pulse]
    assert.ok(error.message.includes('[Pulse]'), 'Should contain [Pulse] prefix');
    assert.ok(error.message.includes('Something failed'), 'Should contain original message');
  });

  test('accepts custom code option', () => {
    const error = new ClientError('Custom code', { code: 'TIMEOUT' });
    assert.strictEqual(error.code, 'TIMEOUT');
  });

  test('accepts context option and includes it in message', () => {
    const error = new ClientError('Failed', { context: 'While fetching user data' });
    assert.ok(error.message.includes('While fetching user data'), 'Should include context in message');
  });

  test('accepts custom suggestion option', () => {
    const error = new ClientError('Err', { suggestion: 'Try again later' });
    assert.ok(error.message.includes('Try again later'), 'Should include custom suggestion');
  });

  test('uses class-level suggestion for known code', () => {
    // Create subclass with suggestions
    class TestClientError extends ClientError {
      static suggestions = { 'MY_CODE': 'Use a different approach' };
      static errorName = 'TestClientError';
      static defaultCode = 'TEST_CLIENT';
      static markerProperty = 'isTestClientError';
    }
    const error = new TestClientError('Error', { code: 'MY_CODE' });
    assert.ok(error.message.includes('Use a different approach'), 'Should use static suggestion for code');
  });

  describe('ClientError.isError() static method', () => {
    test('returns true for ClientError instances', () => {
      const error = new ClientError('Check');
      assert.strictEqual(ClientError.isError(error), true);
    });

    test('returns false for non-ClientError instances', () => {
      const error = new Error('Plain');
      assert.strictEqual(ClientError.isError(error), false);
    });

    test('returns false for null', () => {
      assert.strictEqual(ClientError.isError(null), false);
    });

    test('returns false for undefined', () => {
      assert.strictEqual(ClientError.isError(undefined), false);
    });

    test('returns false for plain object without marker', () => {
      assert.strictEqual(ClientError.isError({ message: 'err' }), false);
    });

    test('returns true for object with marker manually set', () => {
      const obj = { isClientError: true };
      assert.strictEqual(ClientError.isError(obj), true);
    });
  });

  describe('ClientError.isTimeout() instance method', () => {
    test('returns true when code is TIMEOUT', () => {
      const error = new ClientError('Timed out', { code: 'TIMEOUT' });
      assert.strictEqual(error.isTimeout(), true);
    });

    test('returns false when code is not TIMEOUT', () => {
      const error = new ClientError('Other error');
      assert.strictEqual(error.isTimeout(), false);
    });

    test('returns false for NETWORK code', () => {
      const error = new ClientError('Network fail', { code: 'NETWORK' });
      assert.strictEqual(error.isTimeout(), false);
    });
  });

  describe('ClientError.isNetworkError() instance method', () => {
    test('returns true when code is NETWORK', () => {
      const error = new ClientError('Network', { code: 'NETWORK' });
      assert.strictEqual(error.isNetworkError(), true);
    });

    test('returns true when code is NETWORK_ERROR', () => {
      const error = new ClientError('Network error', { code: 'NETWORK_ERROR' });
      assert.strictEqual(error.isNetworkError(), true);
    });

    test('returns false when code is TIMEOUT', () => {
      const error = new ClientError('Timeout', { code: 'TIMEOUT' });
      assert.strictEqual(error.isNetworkError(), false);
    });

    test('returns false for default CLIENT_ERROR code', () => {
      const error = new ClientError('Default');
      assert.strictEqual(error.isNetworkError(), false);
    });
  });
});

// =============================================================================
// createClientErrorClass() — lines 325-375
// =============================================================================

describe('createClientErrorClass()', () => {
  test('creates a class with the given name', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {}
    });
    assert.strictEqual(HttpError.name, 'HttpError');
  });

  test('created class extends ClientError', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {}
    });
    const error = new HttpError('Network failed');
    assert.ok(error instanceof ClientError, 'Should extend ClientError');
    assert.ok(error instanceof RuntimeError, 'Should extend RuntimeError');
    assert.ok(error instanceof PulseError, 'Should extend PulseError');
  });

  test('sets isXxx marker property from markerProperty config', () => {
    const WsError = createClientErrorClass({
      name: 'WsError',
      defaultCode: 'WS_ERROR',
      markerProperty: 'isWsError',
      suggestions: {}
    });
    const error = new WsError('WebSocket failed');
    assert.strictEqual(error.isWsError, true);
  });

  test('uses defaultCode as error code', () => {
    const GraphQLError = createClientErrorClass({
      name: 'GraphQLError',
      defaultCode: 'GRAPHQL_ERROR',
      markerProperty: 'isGraphQLError',
      suggestions: {}
    });
    const error = new GraphQLError('Query failed');
    assert.strictEqual(error.code, 'GRAPHQL_ERROR');
  });

  test('creates static isXxxName() method for type checking', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {}
    });
    const error = new HttpError('Fail');
    assert.strictEqual(typeof HttpError.isHttpError, 'function', 'Should have static isHttpError method');
    assert.strictEqual(HttpError.isHttpError(error), true);
    assert.strictEqual(HttpError.isHttpError(new Error('other')), false);
    assert.strictEqual(HttpError.isHttpError(null), false);
  });

  test('adds codeMethods as isXxx() instance methods', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {},
      codeMethods: ['TIMEOUT', 'NETWORK', 'ABORT']
    });

    const timeoutErr = new HttpError('Timeout', { code: 'TIMEOUT' });
    const networkErr = new HttpError('Network', { code: 'NETWORK' });
    const abortErr = new HttpError('Abort', { code: 'ABORT' });

    assert.strictEqual(typeof timeoutErr.isTimeout, 'function', 'Should have isTimeout method');
    assert.strictEqual(typeof timeoutErr.isNetwork, 'function', 'Should have isNetwork method');
    assert.strictEqual(typeof timeoutErr.isAbort, 'function', 'Should have isAbort method');

    assert.strictEqual(timeoutErr.isTimeout(), true);
    assert.strictEqual(timeoutErr.isNetwork(), false);
    assert.strictEqual(networkErr.isNetwork(), true);
    assert.strictEqual(abortErr.isAbort(), true);
  });

  test('codeMethods with underscores produce correct method names', () => {
    const MyError = createClientErrorClass({
      name: 'MyError',
      defaultCode: 'MY_ERROR',
      markerProperty: 'isMyError',
      suggestions: {},
      codeMethods: ['RATE_LIMIT', 'SERVER_ERROR']
    });

    const err = new MyError('Rate limited', { code: 'RATE_LIMIT' });
    assert.strictEqual(typeof err.isRateLimit, 'function', 'Should have isRateLimit method');
    assert.strictEqual(typeof err.isServerError, 'function', 'Should have isServerError method');
    assert.strictEqual(err.isRateLimit(), true);
    assert.strictEqual(err.isServerError(), false);
  });

  test('copies additionalProperties from options', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {},
      additionalProperties: ['status', 'response', 'config']
    });

    const error = new HttpError('Bad request', {
      status: 400,
      response: { body: 'Bad Request' },
      config: { url: '/api/users' }
    });

    assert.strictEqual(error.status, 400);
    assert.deepStrictEqual(error.response, { body: 'Bad Request' });
    assert.deepStrictEqual(error.config, { url: '/api/users' });
  });

  test('additional properties default to null when not provided in options', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {},
      additionalProperties: ['status', 'response']
    });

    const error = new HttpError('Error');
    assert.strictEqual(error.status, null);
    assert.strictEqual(error.response, null);
  });

  test('uses static suggestions for codes', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {
        'TIMEOUT': 'Consider increasing the timeout.',
        'NETWORK': 'Check your internet connection.'
      }
    });

    const timeoutErr = new HttpError('Timed out', { code: 'TIMEOUT' });
    assert.ok(timeoutErr.message.includes('Consider increasing the timeout.'), 'Should use TIMEOUT suggestion');

    const networkErr = new HttpError('No connection', { code: 'NETWORK' });
    assert.ok(networkErr.message.includes('Check your internet connection.'), 'Should use NETWORK suggestion');
  });

  test('custom suggestion in options overrides static suggestions', () => {
    const HttpError = createClientErrorClass({
      name: 'HttpError',
      defaultCode: 'HTTP_ERROR',
      markerProperty: 'isHttpError',
      suggestions: {
        'TIMEOUT': 'Default timeout suggestion'
      }
    });

    const error = new HttpError('Timed out', {
      code: 'TIMEOUT',
      suggestion: 'Custom: try a faster endpoint'
    });
    assert.ok(error.message.includes('Custom: try a faster endpoint'), 'Should use custom suggestion');
    assert.ok(!error.message.includes('Default timeout suggestion'), 'Should not use static suggestion');
  });

  test('errorName is correctly set on instances', () => {
    const SocketError = createClientErrorClass({
      name: 'SocketError',
      defaultCode: 'SOCKET_ERROR',
      markerProperty: 'isSocketError',
      suggestions: {}
    });
    const error = new SocketError('Connection closed');
    assert.strictEqual(error.name, 'SocketError');
  });
});

// =============================================================================
// getDocsUrl() — line 412
// =============================================================================

describe('getDocsUrl()', () => {
  const knownCodes = [
    ['COMPUTED_SET', 'reactivity/computed'],
    ['CIRCULAR_DEPENDENCY', 'reactivity/effects'],
    ['EFFECT_ERROR', 'reactivity/effects'],
    ['MOUNT_ERROR', 'dom/mounting'],
    ['SELECTOR_INVALID', 'dom/elements'],
    ['LIST_NO_KEY', 'dom/lists'],
    ['ROUTE_NOT_FOUND', 'router/routes'],
    ['LAZY_TIMEOUT', 'router/lazy-loading'],
    ['GUARD_ERROR', 'router/guards'],
    ['PERSIST_ERROR', 'store/persistence'],
    ['STORE_TYPE_ERROR', 'store/state'],
    ['PARSER_ERROR', 'compiler/syntax'],
    ['DUPLICATE_BLOCK', 'compiler/structure'],
    ['INVALID_DIRECTIVE', 'compiler/directives'],
    ['LEXER_ERROR', 'compiler/syntax']
  ];

  for (const [code, expectedPath] of knownCodes) {
    test(`returns correct URL for ${code}`, () => {
      const url = getDocsUrl(code);
      assert.ok(url.startsWith('https://pulse-js.fr/'), `URL should start with docs base for ${code}`);
      assert.ok(url.includes(expectedPath), `URL should contain ${expectedPath} for ${code}`);
    });
  }

  test('returns fallback URL for unknown error code', () => {
    const url = getDocsUrl('TOTALLY_UNKNOWN_CODE');
    assert.ok(url.startsWith('https://pulse-js.fr/'), 'Should use docs base URL');
    assert.ok(url.includes('errors#totally_unknown_code'), 'Should use lowercase code in fallback path');
  });
});

// =============================================================================
// SUGGESTIONS — lines 445-488
// =============================================================================

describe('SUGGESTIONS', () => {
  describe('compiler suggestions', () => {
    test('undefined-variable(name) returns string with variable name', () => {
      const s = SUGGESTIONS['undefined-variable']('myVar');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('myVar'), 'Should mention variable name');
      assert.ok(s.includes('state block'), 'Should mention state block');
    });

    test('duplicate-declaration(name) returns string with name', () => {
      const s = SUGGESTIONS['duplicate-declaration']('counter');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('counter'), 'Should mention declaration name');
      assert.ok(s.includes('duplicate'), 'Should mention duplicate');
    });

    test('unexpected-token(expected, got) returns formatted message', () => {
      const s = SUGGESTIONS['unexpected-token']('LBRACE', 'IDENTIFIER');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('LBRACE'), 'Should include expected token');
      assert.ok(s.includes('IDENTIFIER'), 'Should include actual token');
    });

    test('missing-closing-brace() returns string', () => {
      const s = SUGGESTIONS['missing-closing-brace']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('}'), 'Should mention closing brace');
    });

    test('missing-closing-paren() returns string', () => {
      const s = SUGGESTIONS['missing-closing-paren']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes(')'), 'Should mention closing parenthesis');
    });

    test('invalid-directive(name) returns string with directive name', () => {
      const s = SUGGESTIONS['invalid-directive']('@badDirective');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('@badDirective'), 'Should include bad directive name');
      assert.ok(s.includes('@if'), 'Should list valid directives');
    });

    test('empty-block(blockName) returns string with block name', () => {
      const s = SUGGESTIONS['empty-block']('state');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('state'), 'Should include block name');
    });
  });

  describe('reactivity suggestions', () => {
    test('computed-set(name) returns string with computed name', () => {
      const s = SUGGESTIONS['computed-set']('myComputed');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('myComputed'), 'Should include computed name');
      assert.ok(s.includes('pulse()'), 'Should mention pulse()');
    });

    test('computed-set(null) uses fallback text', () => {
      const s = SUGGESTIONS['computed-set'](null);
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('this computed'), 'Should use fallback text for null name');
    });

    test('circular-dependency() returns string mentioning batch()', () => {
      const s = SUGGESTIONS['circular-dependency']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('batch()'), 'Should mention batch()');
    });

    test('effect-cleanup() returns string with cleanup example', () => {
      const s = SUGGESTIONS['effect-cleanup']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('cleanup'), 'Should mention cleanup');
    });
  });

  describe('dom suggestions', () => {
    test('mount-not-found(selector) returns string with selector', () => {
      const s = SUGGESTIONS['mount-not-found']('#app');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('#app'), 'Should include selector');
      assert.ok(s.includes('DOMContentLoaded'), 'Should mention DOMContentLoaded');
    });

    test('invalid-selector(selector) returns string with selector', () => {
      const s = SUGGESTIONS['invalid-selector']('bad::selector');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('bad::selector'), 'Should include bad selector');
    });

    test('list-needs-key() returns string mentioning key function', () => {
      const s = SUGGESTIONS['list-needs-key']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('list('), 'Should show list() usage');
      assert.ok(s.includes('item.id'), 'Should show key example');
    });
  });

  describe('router suggestions', () => {
    test('route-not-found(path) returns string with path', () => {
      const s = SUGGESTIONS['route-not-found']('/missing');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('/missing'), 'Should include path');
      assert.ok(s.includes('catch-all'), 'Should mention catch-all');
    });

    test('lazy-timeout(ms) returns string with milliseconds', () => {
      const s = SUGGESTIONS['lazy-timeout'](3000);
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('3000'), 'Should include milliseconds');
    });
  });

  describe('store suggestions', () => {
    test('persist-quota() returns string about localStorage', () => {
      const s = SUGGESTIONS['persist-quota']();
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('localStorage'), 'Should mention localStorage');
    });

    test('invalid-store-value(type) returns string with type', () => {
      const s = SUGGESTIONS['invalid-store-value']('function');
      assert.strictEqual(typeof s, 'string');
      assert.ok(s.includes('function'), 'Should include type name');
      assert.ok(s.includes('serializable'), 'Should mention serializable');
    });
  });
});

// =============================================================================
// formatError() — lines 497-513
// =============================================================================

describe('formatError()', () => {
  test('formats PulseError with snippet when source provided', () => {
    const source = 'const a = 1;\nconst b = 2;\nconst c = error;';
    const error = new PulseError('Test', { line: 3, source });
    const result = formatError(error, source);
    assert.ok(result.includes('PulseError'), 'Should include class name');
    assert.ok(result.includes('const c = error'), 'Should include source line');
  });

  test('formats PulseError without source using format()', () => {
    const error = new PulseError('No source', { file: 'a.pulse', line: 2 });
    const result = formatError(error);
    // Without source, falls back to format()
    assert.ok(result.includes('PulseError: No source'), 'Should include error message');
    assert.ok(result.includes('a.pulse'), 'Should include file');
  });

  test('formats plain Error with line info and source using snippet', () => {
    const source = 'line 1\nline 2\nline 3\nline 4\nline 5 error here';
    const error = new Error('Plain with location');
    error.line = 5;
    error.column = 7;
    const result = formatError(error, source);
    assert.ok(result.includes('line 5 error here'), 'Should show error line from source');
    assert.ok(result.includes('>'), 'Should mark error line');
  });

  test('formats plain Error with line but no source falls through to stack', () => {
    const error = new Error('Has line, no source');
    error.line = 3;
    // No source provided
    const result = formatError(error);
    // line is set but no source, so falls through to stack/message
    assert.ok(result.includes('Has line, no source'), 'Should include message');
  });

  test('falls back to error.stack for plain Error without line info', () => {
    const error = new Error('Plain no line');
    const result = formatError(error);
    // Should return stack (which includes message)
    assert.ok(result.includes('Plain no line'), 'Should include error message via stack');
  });

  test('falls back to error.message when stack is not available', () => {
    const error = { message: 'No stack error' };
    const result = formatError(error);
    assert.strictEqual(result, 'No stack error', 'Should return message when no stack');
  });

  test('works correctly with CompileError subclass', () => {
    const source = 'view {\n  div "hello"\n}';
    const error = new LexerError('Unexpected token', { line: 2, column: 3 });
    const result = formatError(error, source);
    assert.ok(result.includes('LexerError'), 'Should include subclass name');
    assert.ok(result.includes('div "hello"'), 'Should include source line');
  });
});

// =============================================================================
// createParserError() — lines 522-529
// =============================================================================

describe('createParserError()', () => {
  test('creates ParserError from token with line and column', () => {
    const token = { type: 'NUMBER', value: '42', line: 7, column: 12 };
    const error = createParserError('Unexpected number', token);
    assert.ok(error instanceof ParserError);
    assert.strictEqual(error.line, 7);
    assert.strictEqual(error.column, 12);
    assert.strictEqual(error.token, token);
  });

  test('defaults line and column to 1 for null token', () => {
    const error = createParserError('Null token', null);
    assert.strictEqual(error.line, 1);
    assert.strictEqual(error.column, 1);
    assert.strictEqual(error.token, null);
  });

  test('defaults line and column to 1 for token without those fields', () => {
    const token = { type: 'EOF', value: '' };
    const error = createParserError('EOF error', token);
    assert.strictEqual(error.line, 1, 'Should default line to 1');
    assert.strictEqual(error.column, 1, 'Should default column to 1');
  });

  test('merges additional options', () => {
    const token = { type: 'IDENT', value: 'x', line: 3, column: 1 };
    const error = createParserError('Extra opts', token, {
      suggestion: 'Try this instead',
      file: 'my.pulse'
    });
    assert.strictEqual(error.suggestion, 'Try this instead');
    assert.strictEqual(error.file, 'my.pulse');
  });

  test('error code is PARSER_ERROR', () => {
    const token = { type: 'X', line: 1, column: 1 };
    const error = createParserError('Code test', token);
    assert.strictEqual(error.code, 'PARSER_ERROR');
  });
});

// =============================================================================
// createErrorMessage() — lines 541-563
// =============================================================================

describe('createErrorMessage()', () => {
  test('prefixes message with [Pulse]', () => {
    const msg = createErrorMessage({ code: 'X', message: 'Hello' });
    assert.ok(msg.startsWith('[Pulse] Hello'), 'Should start with [Pulse] prefix');
  });

  test('includes context when provided', () => {
    const msg = createErrorMessage({
      code: 'X',
      message: 'Fail',
      context: 'While running effects'
    });
    assert.ok(msg.includes('Context: While running effects'), 'Should include context label');
  });

  test('does not include Context: when context is undefined', () => {
    const msg = createErrorMessage({ code: 'X', message: 'Fail' });
    assert.ok(!msg.includes('Context:'), 'Should omit context when not provided');
  });

  test('includes all detail key/value pairs', () => {
    const msg = createErrorMessage({
      code: 'X',
      message: 'Fail',
      details: {
        'File': 'app.pulse',
        'Line': '42',
        'Column': '7'
      }
    });
    assert.ok(msg.includes('File: app.pulse'), 'Should include File detail');
    assert.ok(msg.includes('Line: 42'), 'Should include Line detail');
    assert.ok(msg.includes('Column: 7'), 'Should include Column detail');
  });

  test('does not include details section when details is undefined', () => {
    const msg = createErrorMessage({ code: 'X', message: 'Fail' });
    // No extra colons from details
    assert.ok(!msg.includes('\n  Most active'), 'Should omit details when not provided');
  });

  test('includes suggestion with → arrow', () => {
    const msg = createErrorMessage({
      code: 'X',
      message: 'Fail',
      suggestion: 'Do this instead'
    });
    assert.ok(msg.includes('→ Do this instead'), 'Should include suggestion with arrow');
  });

  test('does not include suggestion section when suggestion is undefined', () => {
    const msg = createErrorMessage({ code: 'X', message: 'Fail' });
    assert.ok(!msg.includes('→'), 'Should omit arrow when no suggestion');
  });

  test('includes See: docs URL when code is provided', () => {
    const msg = createErrorMessage({ code: 'COMPUTED_SET', message: 'Fail' });
    assert.ok(msg.includes('See:'), 'Should include See: label');
    assert.ok(msg.includes('pulse-js.fr'), 'Should include docs URL');
  });

  test('includes all sections in correct order', () => {
    const msg = createErrorMessage({
      code: 'COMPUTED_SET',
      message: 'Cannot set computed value',
      context: 'User called .set()',
      details: { 'Name': 'myComputed' },
      suggestion: 'Use pulse() instead'
    });

    const contextIdx = msg.indexOf('Context:');
    const nameIdx = msg.indexOf('Name:');
    const arrowIdx = msg.indexOf('→');
    const seeIdx = msg.indexOf('See:');

    assert.ok(contextIdx < nameIdx, 'Context should come before details');
    assert.ok(nameIdx < arrowIdx, 'Details should come before suggestion');
    assert.ok(arrowIdx < seeIdx, 'Suggestion should come before See:');
  });
});

// =============================================================================
// Errors.computedSet() — lines 576-586
// =============================================================================

describe('Errors.computedSet()', () => {
  test('creates ReactivityError with COMPUTED_SET code', () => {
    const error = Errors.computedSet('myComputed');
    assert.ok(error instanceof ReactivityError);
    assert.strictEqual(error.code, 'COMPUTED_SET');
  });

  test('message includes computed name', () => {
    const error = Errors.computedSet('counter');
    assert.ok(error.message.includes('counter'), 'Should include computed name');
  });

  test('works without name argument', () => {
    const error = Errors.computedSet();
    assert.ok(error instanceof ReactivityError);
    assert.ok(error.message.includes('[Pulse]'), 'Should still format as Pulse error');
  });

  test('message includes context about computed values', () => {
    const error = Errors.computedSet('x');
    assert.ok(error.message.includes('derived'), 'Should explain computed values are derived');
  });

  test('message includes suggestion from SUGGESTIONS', () => {
    const error = Errors.computedSet('myVal');
    assert.ok(error.message.includes('pulse()'), 'Should include suggestion about pulse()');
  });
});

// =============================================================================
// Errors.circularDependency() — lines 591-605
// =============================================================================

describe('Errors.circularDependency()', () => {
  test('creates ReactivityError with CIRCULAR_DEPENDENCY code', () => {
    const error = Errors.circularDependency(['e1', 'e2'], ['e3']);
    assert.ok(error instanceof ReactivityError);
    assert.strictEqual(error.code, 'CIRCULAR_DEPENDENCY');
  });

  test('message includes effect IDs', () => {
    const error = Errors.circularDependency(['effect-1', 'effect-2'], []);
    assert.ok(error.message.includes('effect-1'), 'Should include first effect ID');
    assert.ok(error.message.includes('effect-2'), 'Should include second effect ID');
  });

  test('message includes pending effects', () => {
    const error = Errors.circularDependency(['e1'], ['pending-1', 'pending-2']);
    assert.ok(error.message.includes('pending-1'), 'Should include pending effect');
  });

  test('pending shows none when empty array provided', () => {
    const error = Errors.circularDependency(['e1', 'e2'], []);
    assert.ok(error.message.includes('none'), 'Should show none for empty pending');
  });

  test('limits effect IDs to first 5', () => {
    const ids = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'];
    const error = Errors.circularDependency(ids, []);
    // Should only include up to 5
    assert.ok(!error.message.includes('e7'), 'Should truncate at 5 IDs');
    assert.ok(error.message.includes('e5'), 'Should include up to 5th effect');
  });

  test('message includes circular-dependency suggestion', () => {
    const error = Errors.circularDependency(['e1'], []);
    assert.ok(error.message.includes('batch()'), 'Should mention batch() from suggestion');
  });
});

// =============================================================================
// Errors.mountNotFound() — lines 610-620
// =============================================================================

describe('Errors.mountNotFound()', () => {
  test('creates DOMError with MOUNT_ERROR code', () => {
    const error = Errors.mountNotFound('#app');
    assert.ok(error instanceof DOMError);
    assert.strictEqual(error.code, 'MOUNT_ERROR');
  });

  test('message includes selector', () => {
    const error = Errors.mountNotFound('.my-container');
    assert.ok(error.message.includes('.my-container'), 'Should include selector in message');
  });

  test('message includes DOMContentLoaded suggestion', () => {
    const error = Errors.mountNotFound('#root');
    assert.ok(error.message.includes('DOMContentLoaded'), 'Should mention DOMContentLoaded');
  });
});

// =============================================================================
// Errors.listNoKey() — lines 625-635
// =============================================================================

describe('Errors.listNoKey()', () => {
  test('creates DOMError with LIST_NO_KEY code', () => {
    const error = Errors.listNoKey();
    assert.ok(error instanceof DOMError);
    assert.strictEqual(error.code, 'LIST_NO_KEY');
  });

  test('message mentions key function', () => {
    const error = Errors.listNoKey();
    assert.ok(error.message.includes('key') || error.message.includes('list('), 'Should mention keys');
  });

  test('message includes performance context', () => {
    const error = Errors.listNoKey();
    assert.ok(error.message.includes('performance') || error.message.includes('efficiently'), 'Should mention performance');
  });
});

// =============================================================================
// Errors.routeNotFound() — lines 640-650
// =============================================================================

describe('Errors.routeNotFound()', () => {
  test('creates RouterError with ROUTE_NOT_FOUND code', () => {
    const error = Errors.routeNotFound('/about');
    assert.ok(error instanceof RouterError);
    assert.strictEqual(error.code, 'ROUTE_NOT_FOUND');
  });

  test('message includes path', () => {
    const error = Errors.routeNotFound('/contact');
    assert.ok(error.message.includes('/contact'), 'Should include path in message');
  });

  test('message includes catch-all suggestion', () => {
    const error = Errors.routeNotFound('/missing');
    assert.ok(error.message.includes('catch-all'), 'Should mention catch-all route');
  });
});

// =============================================================================
// Errors.lazyTimeout() — lines 655-665
// =============================================================================

describe('Errors.lazyTimeout()', () => {
  test('creates RouterError with LAZY_TIMEOUT code', () => {
    const error = Errors.lazyTimeout(3000);
    assert.ok(error instanceof RouterError);
    assert.strictEqual(error.code, 'LAZY_TIMEOUT');
  });

  test('message includes timeout duration', () => {
    const error = Errors.lazyTimeout(10000);
    assert.ok(error.message.includes('10000'), 'Should include timeout ms');
  });

  test('message mentions dynamic import', () => {
    const error = Errors.lazyTimeout(5000);
    assert.ok(error.message.includes('import') || error.message.includes('load'), 'Should mention loading');
  });
});

// =============================================================================
// Errors.persistError() — lines 670-680
// =============================================================================

describe('Errors.persistError()', () => {
  test('creates StoreError with PERSIST_ERROR code', () => {
    const error = Errors.persistError('load', new Error('quota'));
    assert.ok(error instanceof StoreError);
    assert.strictEqual(error.code, 'PERSIST_ERROR');
  });

  test('message includes operation name', () => {
    const error = Errors.persistError('save', null);
    assert.ok(error.message.includes('save'), 'Should include operation');
  });

  test('message includes cause message when provided', () => {
    const cause = new Error('Storage quota exceeded');
    const error = Errors.persistError('write', cause);
    assert.ok(error.message.includes('Storage quota exceeded'), 'Should include cause message');
  });

  test('uses fallback context when cause is null', () => {
    const error = Errors.persistError('read', null);
    assert.ok(error.message.includes('localStorage'), 'Should use fallback localStorage context');
  });

  test('message includes localStorage quota suggestion', () => {
    const error = Errors.persistError('save', null);
    assert.ok(error.message.includes('localStorage'), 'Should mention localStorage in suggestion');
  });
});

// =============================================================================
// Errors.invalidStoreValue() — lines 685-695
// =============================================================================

describe('Errors.invalidStoreValue()', () => {
  test('creates StoreError with STORE_TYPE_ERROR code', () => {
    const error = Errors.invalidStoreValue('Symbol');
    assert.ok(error instanceof StoreError);
    assert.strictEqual(error.code, 'STORE_TYPE_ERROR');
  });

  test('message includes type name', () => {
    const error = Errors.invalidStoreValue('function');
    assert.ok(error.message.includes('function'), 'Should include type name');
  });

  test('message mentions JSON-serializable requirement', () => {
    const error = Errors.invalidStoreValue('Map');
    assert.ok(error.message.includes('serializable') || error.message.includes('JSON'), 'Should mention serialization');
  });

  test('message includes serializable suggestion', () => {
    const error = Errors.invalidStoreValue('undefined');
    assert.ok(error.message.includes('serializable'), 'Suggestion should mention serializable');
  });
});
