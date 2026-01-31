/**
 * Pulse Compiler - Main entry point
 */

export * from './lexer.js';
export * from './parser.js';
export * from './transformer.js';
export * from './sourcemap.js';

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { transform, Transformer } from './transformer.js';

/**
 * Compile Pulse source code to JavaScript
 *
 * @param {string} source - Pulse source code
 * @param {Object} options - Compiler options
 * @param {string} options.runtime - Runtime import path
 * @param {boolean} options.minify - Minify output
 * @param {boolean} options.scopeStyles - Scope CSS with unique prefixes
 * @param {boolean} options.sourceMap - Generate source map
 * @param {string} options.sourceFileName - Original file name (for source maps)
 * @param {boolean} options.inlineSourceMap - Include source map as inline comment
 * @returns {Object} Compilation result
 */
export function compile(source, options = {}) {
  try {
    // Parse source to AST
    const ast = parse(source);

    // Prepare transformer options
    const transformerOptions = {
      ...options,
      sourceContent: options.sourceMap ? source : null
    };

    // Transform AST to JavaScript
    const transformer = new Transformer(ast, transformerOptions);
    const result = transformer.transformWithSourceMap();

    // Add inline source map if requested
    let code = result.code;
    if (options.sourceMap && options.inlineSourceMap && result.sourceMapComment) {
      code = code + '\n' + result.sourceMapComment;
    }

    return {
      success: true,
      code,
      ast,
      sourceMap: result.sourceMap,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      code: null,
      ast: null,
      sourceMap: null,
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

import { SourceMapGenerator, SourceMapConsumer } from './sourcemap.js';

export default {
  compile,
  parseOnly,
  tokenizeOnly,
  tokenize,
  parse,
  transform,
  SourceMapGenerator,
  SourceMapConsumer
};
