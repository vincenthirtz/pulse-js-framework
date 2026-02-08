/**
 * Transformer Constants
 * Shared constants for the Pulse transformer modules
 * @module pulse-js-framework/compiler/transformer/constants
 */

/** Generate a unique scope ID for CSS scoping */
export const generateScopeId = () => 'p' + Math.random().toString(36).substring(2, 12);

/** Token types that should not have space after them */
export const NO_SPACE_AFTER = new Set([
  'DOT', 'LPAREN', 'LBRACKET', 'LBRACE', 'NOT', 'SPREAD',
  '.', '(', '[', '{', '!', '~', '...'
]);

/** Token types that should not have space before them */
export const NO_SPACE_BEFORE = new Set([
  'DOT', 'RPAREN', 'RBRACKET', 'RBRACE', 'SEMICOLON', 'COMMA',
  'INCREMENT', 'DECREMENT', 'LPAREN', 'LBRACKET',
  '.', ')', ']', '}', ';', ',', '++', '--', '(', '['
]);

/** Punctuation that should not have space before */
export const PUNCT_NO_SPACE_BEFORE = [
  'DOT', 'LPAREN', 'RPAREN', 'LBRACKET', 'RBRACKET', 'SEMICOLON', 'COMMA', 'COLON'
];

/** Punctuation that should not have space after */
export const PUNCT_NO_SPACE_AFTER = [
  'DOT', 'LPAREN', 'LBRACKET', 'NOT', 'COLON'
];

/** JavaScript statement keywords */
export const STATEMENT_KEYWORDS = new Set([
  'let', 'const', 'var', 'return', 'if', 'else', 'for', 'while',
  'switch', 'throw', 'try', 'catch', 'finally', 'break', 'continue',
  'case', 'default'
]);

/** Built-in JavaScript functions and objects */
export const BUILTIN_FUNCTIONS = new Set([
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'alert', 'confirm', 'prompt', 'console', 'document', 'window',
  'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number',
  'Boolean', 'Promise', 'fetch'
]);

/** Token types that start statements */
export const STATEMENT_TOKEN_TYPES = new Set(['IF', 'FOR', 'EACH']);

/** Token types that end statements */
export const STATEMENT_END_TYPES = new Set([
  'RBRACE', 'RPAREN', 'RBRACKET', 'SEMICOLON', 'STRING',
  'NUMBER', 'TRUE', 'FALSE', 'NULL', 'IDENT'
]);
