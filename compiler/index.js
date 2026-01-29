/**
 * Pulse Compiler - Main entry point
 */

export * from './lexer.js';
export * from './parser.js';
export * from './transformer.js';

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { transform } from './transformer.js';

/**
 * Compile Pulse source code to JavaScript
 */
export function compile(source, options = {}) {
  try {
    // Parse source to AST
    const ast = parse(source);

    // Transform AST to JavaScript
    const code = transform(ast, options);

    return {
      success: true,
      code,
      ast,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      code: null,
      ast: null,
      errors: [{
        message: error.message,
        line: error.line,
        column: error.column
      }]
    };
  }
}

/**
 * Parse source to AST only
 */
export function parseOnly(source) {
  return parse(source);
}

/**
 * Tokenize source only
 */
export function tokenizeOnly(source) {
  return tokenize(source);
}

export default {
  compile,
  parseOnly,
  tokenizeOnly,
  tokenize,
  parse,
  transform
};
