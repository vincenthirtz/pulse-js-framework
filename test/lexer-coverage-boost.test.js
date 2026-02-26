/**
 * Coverage boost tests for compiler/lexer.js
 *
 * Targets uncovered paths:
 *  - Unterminated block comment → ERROR token
 *  - Lexer constructor null/undefined guard
 *  - Block comment skipping
 *  - Nested-looking block comments (only one /* ... * / pair counted)
 *  - BigInt literals (decimal and hex)
 *  - Numeric separators (1_000_000)
 *  - Optional chaining (?.)
 *  - Nullish coalescing (??)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { tokenize, Lexer, TokenType } from '../compiler/lexer.js';

// ---------------------------------------------------------------------------
// Constructor guards
// ---------------------------------------------------------------------------

describe('Lexer constructor - input validation', () => {
  test('throws when source is null', () => {
    assert.throws(
      () => new Lexer(null),
      /source must be a string/i,
      'Lexer should throw a descriptive error when source is null'
    );
  });

  test('throws when source is undefined', () => {
    assert.throws(
      () => new Lexer(undefined),
      /source must be a string/i,
      'Lexer should throw a descriptive error when source is undefined'
    );
  });

  test('accepts empty string', () => {
    assert.doesNotThrow(() => new Lexer(''));
  });

  test('accepts non-empty string', () => {
    assert.doesNotThrow(() => new Lexer('state { }'));
  });
});

// ---------------------------------------------------------------------------
// Block comment handling
// ---------------------------------------------------------------------------

describe('Lexer - block comments', () => {
  test('block comment is skipped and next token is returned', () => {
    const tokens = tokenize('/* comment */ view');
    // Should have VIEW token followed by EOF, no comment token
    const nonEof = tokens.filter(t => t.type !== TokenType.EOF);
    assert.strictEqual(nonEof.length, 1,
      'only the VIEW token should remain after the block comment');
    assert.strictEqual(nonEof[0].type, TokenType.VIEW);
  });

  test('nested-looking comment: only the first */ closes the block', () => {
    // /* a /* b */ view  — the first */ ends the comment; "view" is a real token
    const tokens = tokenize('/* a /* b */ view');
    const nonEof = tokens.filter(t => t.type !== TokenType.EOF);
    assert.strictEqual(nonEof.length, 1,
      'only one token (VIEW) should appear after the comment closes');
    assert.strictEqual(nonEof[0].type, TokenType.VIEW);
  });

  test('unterminated block comment produces an ERROR token', () => {
    const tokens = tokenize('/* unclosed comment');
    const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);
    assert.ok(
      errorTokens.length >= 1,
      'an unterminated block comment must produce at least one ERROR token'
    );
    assert.ok(
      errorTokens[0].value.toLowerCase().includes('unterminated') ||
      errorTokens[0].value.toLowerCase().includes('comment'),
      `ERROR token value should describe the problem; got "${errorTokens[0].value}"`
    );
  });

  test('block comment between tokens does not affect surrounding tokens', () => {
    const tokens = tokenize('state /* removed */ view');
    const types = tokens.map(t => t.type).filter(t => t !== TokenType.EOF);
    assert.deepStrictEqual(types, [TokenType.STATE, TokenType.VIEW]);
  });

  test('multi-line block comment is skipped entirely', () => {
    const src = '/*\n * multi-line\n * comment\n */\nstate';
    const tokens = tokenize(src);
    const nonEof = tokens.filter(t => t.type !== TokenType.EOF);
    assert.strictEqual(nonEof.length, 1);
    assert.strictEqual(nonEof[0].type, TokenType.STATE);
  });
});

// ---------------------------------------------------------------------------
// BigInt literals
// ---------------------------------------------------------------------------

describe('Lexer - BigInt literals', () => {
  test('decimal BigInt: 123n produces BIGINT token', () => {
    const tokens = tokenize('123n');
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.ok(bigint, 'Expected BIGINT token for 123n');
    assert.strictEqual(bigint.value, '123n');
  });

  test('large decimal BigInt: 9007199254740991n', () => {
    const tokens = tokenize('9007199254740991n');
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.ok(bigint, 'Expected BIGINT token');
    assert.ok(bigint.value.endsWith('n'), 'BIGINT value must end with n');
  });

  test('hex BigInt: 0xFFn produces BIGINT token', () => {
    const tokens = tokenize('0xFFn');
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.ok(bigint, 'Expected BIGINT token for 0xFFn');
    assert.ok(bigint.value.endsWith('n'), 'Hex BIGINT value must end with n');
  });

  test('hex BigInt: 0xDEADBEEFn', () => {
    const tokens = tokenize('0xDEADBEEFn');
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.ok(bigint, 'Expected BIGINT token for 0xDEADBEEFn');
  });

  test('regular number 123 (no n) is NUMBER, not BIGINT', () => {
    const tokens = tokenize('123');
    const num = tokens.find(t => t.type === TokenType.NUMBER);
    assert.ok(num, 'Expected NUMBER token for 123');
    assert.strictEqual(num.value, 123);
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.strictEqual(bigint, undefined, '123 should not produce a BIGINT token');
  });

  test('zero BigInt: 0n produces BIGINT token', () => {
    const tokens = tokenize('0n');
    const bigint = tokens.find(t => t.type === TokenType.BIGINT);
    assert.ok(bigint, 'Expected BIGINT token for 0n');
    assert.strictEqual(bigint.value, '0n');
  });
});

// ---------------------------------------------------------------------------
// Numeric separators
// ---------------------------------------------------------------------------

describe('Lexer - numeric separators', () => {
  test('1_000_000 produces NUMBER with value 1000000', () => {
    const tokens = tokenize('1_000_000');
    const num = tokens.find(t => t.type === TokenType.NUMBER);
    assert.ok(num, 'Expected NUMBER token for 1_000_000');
    assert.strictEqual(num.value, 1000000,
      'Numeric separators should be stripped; numeric value must be 1000000');
  });

  test('1_500.25 with separator in integer part', () => {
    const tokens = tokenize('1_500.25');
    const num = tokens.find(t => t.type === TokenType.NUMBER);
    assert.ok(num, 'Expected NUMBER token');
    assert.strictEqual(num.value, 1500.25);
  });

  test('0xFF_FF hex with separator', () => {
    const tokens = tokenize('0xFF_FF');
    const num = tokens.find(t => t.type === TokenType.NUMBER);
    assert.ok(num, 'Expected NUMBER token for 0xFF_FF');
    // 0xFFFF = 65535
    assert.strictEqual(num.value, 65535);
  });

  test('simple number 42 without separator is unaffected', () => {
    const tokens = tokenize('42');
    const num = tokens.find(t => t.type === TokenType.NUMBER);
    assert.ok(num, 'Expected NUMBER token');
    assert.strictEqual(num.value, 42);
  });
});

// ---------------------------------------------------------------------------
// Optional chaining
// ---------------------------------------------------------------------------

describe('Lexer - optional chaining (?.)', () => {
  test('a?.b produces OPTIONAL_CHAIN token', () => {
    const tokens = tokenize('a?.b');
    const optChain = tokens.find(t => t.type === TokenType.OPTIONAL_CHAIN);
    assert.ok(optChain, 'Expected OPTIONAL_CHAIN token for ?.');
    assert.strictEqual(optChain.value, '?.');
  });

  test('a?.b?.c contains two OPTIONAL_CHAIN tokens', () => {
    const tokens = tokenize('a?.b?.c');
    const optChains = tokens.filter(t => t.type === TokenType.OPTIONAL_CHAIN);
    assert.strictEqual(optChains.length, 2,
      'Two ?. operators should produce two OPTIONAL_CHAIN tokens');
  });

  test('?.5 does NOT produce OPTIONAL_CHAIN (number case)', () => {
    // ?.5 is `?` followed by `.5` (number) — should not be optional chaining
    const tokens = tokenize('x?.5');
    const optChains = tokens.filter(t => t.type === TokenType.OPTIONAL_CHAIN);
    assert.strictEqual(optChains.length, 0,
      '?. before a digit should not be treated as optional chaining');
    // Should have a QUESTION token instead
    const question = tokens.find(t => t.type === TokenType.QUESTION);
    assert.ok(question, 'Should have a QUESTION token when ?. is followed by a digit');
  });

  test('standalone ? is QUESTION token, not OPTIONAL_CHAIN', () => {
    const tokens = tokenize('a ? b : c');
    const question = tokens.find(t => t.type === TokenType.QUESTION);
    assert.ok(question, 'Expected QUESTION token for standalone ?');
    const optChain = tokens.find(t => t.type === TokenType.OPTIONAL_CHAIN);
    assert.strictEqual(optChain, undefined, 'No OPTIONAL_CHAIN should appear for ?');
  });
});

// ---------------------------------------------------------------------------
// Nullish coalescing (??)
// ---------------------------------------------------------------------------

describe('Lexer - nullish coalescing (??)', () => {
  test('a ?? b produces NULLISH token', () => {
    const tokens = tokenize('a ?? b');
    const nullish = tokens.find(t => t.type === TokenType.NULLISH);
    assert.ok(nullish, 'Expected NULLISH token for ??');
    assert.strictEqual(nullish.value, '??');
  });

  test('??= produces NULLISH_ASSIGN token', () => {
    const tokens = tokenize('x ??= defaultVal');
    const nullishAssign = tokens.find(t => t.type === TokenType.NULLISH_ASSIGN);
    assert.ok(nullishAssign, 'Expected NULLISH_ASSIGN token for ??=');
    assert.strictEqual(nullishAssign.value, '??=');
  });

  test('?? is not confused with ?', () => {
    const tokens = tokenize('a ?? b ? c : d');
    const nullishTokens = tokens.filter(t => t.type === TokenType.NULLISH);
    const questionTokens = tokens.filter(t => t.type === TokenType.QUESTION);
    assert.strictEqual(nullishTokens.length, 1,
      'Exactly one NULLISH token expected');
    assert.strictEqual(questionTokens.length, 1,
      'Exactly one QUESTION token expected for the ternary ?');
  });

  test('??= is not confused with ??', () => {
    const tokens = tokenize('x ??= y ?? z');
    const nullishAssign = tokens.filter(t => t.type === TokenType.NULLISH_ASSIGN);
    const nullish = tokens.filter(t => t.type === TokenType.NULLISH);
    assert.strictEqual(nullishAssign.length, 1, 'One NULLISH_ASSIGN expected');
    assert.strictEqual(nullish.length, 1, 'One NULLISH expected');
  });
});

// ---------------------------------------------------------------------------
// Single-line comment handling (for completeness / context)
// ---------------------------------------------------------------------------

describe('Lexer - single-line comments', () => {
  test('single-line comment is skipped', () => {
    const tokens = tokenize('// this is a comment\nstate');
    const nonEof = tokens.filter(t => t.type !== TokenType.EOF);
    assert.strictEqual(nonEof.length, 1);
    assert.strictEqual(nonEof[0].type, TokenType.STATE);
  });

  test('inline comment does not swallow next line', () => {
    const tokens = tokenize('state // comment\nview');
    const types = tokens.map(t => t.type).filter(t => t !== TokenType.EOF);
    assert.deepStrictEqual(types, [TokenType.STATE, TokenType.VIEW]);
  });
});

// ---------------------------------------------------------------------------
// tokenize() convenience wrapper
// ---------------------------------------------------------------------------

describe('tokenize() convenience function', () => {
  test('returns an array of tokens', () => {
    const tokens = tokenize('state');
    assert.ok(Array.isArray(tokens), 'tokenize() should return an array');
  });

  test('last token is always EOF', () => {
    const tokens = tokenize('state view');
    assert.strictEqual(tokens[tokens.length - 1].type, TokenType.EOF,
      'Last token should always be EOF');
  });

  test('empty string produces only an EOF token', () => {
    const tokens = tokenize('');
    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0].type, TokenType.EOF);
  });
});
