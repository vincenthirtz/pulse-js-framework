/**
 * Pulse Error Classes - Structured error handling for the framework
 * @module pulse-js-framework/core/errors
 */

/**
 * Base error class for all Pulse framework errors.
 * Provides source location tracking and code snippet formatting.
 */
export class PulseError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {number} [options.line] - Line number where error occurred
   * @param {number} [options.column] - Column number where error occurred
   * @param {string} [options.file] - Source file path
   * @param {string} [options.code] - Error code for documentation lookup
   * @param {string} [options.source] - Original source code
   * @param {string} [options.suggestion] - Helpful suggestion to fix the error
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'PulseError';
    this.line = options.line ?? null;
    this.column = options.column ?? null;
    this.file = options.file ?? null;
    this.code = options.code ?? 'PULSE_ERROR';
    this.source = options.source ?? null;
    this.suggestion = options.suggestion ?? null;
  }

  /**
   * Format the error with a code snippet showing context
   * @param {string} [source] - Source code to use (overrides this.source)
   * @param {number} [contextLines=2] - Number of lines to show before/after error
   * @returns {string} Formatted error with code snippet
   */
  formatWithSnippet(source = this.source, contextLines = 2) {
    if (!this.line || !source) {
      return this.toString();
    }

    const lines = source.split('\n');
    const start = Math.max(0, this.line - 1 - contextLines);
    const end = Math.min(lines.length, this.line + contextLines);
    const gutterWidth = String(end).length;

    let output = `\n${this.name}: ${this.message}\n`;
    output += `  at ${this.file || '<anonymous>'}:${this.line}:${this.column || 1}\n\n`;

    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const isErrorLine = lineNum === this.line;
      const prefix = isErrorLine ? '>' : ' ';
      const gutter = String(lineNum).padStart(gutterWidth);
      output += `${prefix} ${gutter} | ${lines[i]}\n`;

      if (isErrorLine && this.column) {
        const padding = ' '.repeat(gutterWidth + 3 + Math.max(0, this.column - 1));
        output += `  ${padding}^\n`;
      }
    }

    if (this.suggestion) {
      output += `\n  Suggestion: ${this.suggestion}\n`;
    }

    if (this.code && this.code !== 'PULSE_ERROR') {
      output += `\n  Error code: ${this.code}\n`;
    }

    return output;
  }

  /**
   * Convert to plain object for JSON serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      line: this.line,
      column: this.column,
      file: this.file,
      code: this.code,
      suggestion: this.suggestion
    };
  }
}

// ============================================================================
// Compiler Errors
// ============================================================================

/**
 * Base class for all compilation errors
 */
export class CompileError extends PulseError {
  constructor(message, options = {}) {
    super(message, { code: 'COMPILE_ERROR', ...options });
    this.name = 'CompileError';
  }
}

/**
 * Error during lexical analysis (tokenization)
 */
export class LexerError extends CompileError {
  constructor(message, options = {}) {
    super(message, { code: 'LEXER_ERROR', ...options });
    this.name = 'LexerError';
  }
}

/**
 * Error during parsing (AST construction)
 */
export class ParserError extends CompileError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {Object} [options.token] - The problematic token
   */
  constructor(message, options = {}) {
    super(message, { code: 'PARSER_ERROR', ...options });
    this.name = 'ParserError';
    this.token = options.token ?? null;
  }
}

/**
 * Error during code transformation/generation
 */
export class TransformError extends CompileError {
  constructor(message, options = {}) {
    super(message, { code: 'TRANSFORM_ERROR', ...options });
    this.name = 'TransformError';
  }
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Base class for all runtime errors
 */
export class RuntimeError extends PulseError {
  constructor(message, options = {}) {
    super(message, { code: 'RUNTIME_ERROR', ...options });
    this.name = 'RuntimeError';
  }
}

/**
 * Error in the reactivity system (effects, computed values)
 */
export class ReactivityError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'REACTIVITY_ERROR', ...options });
    this.name = 'ReactivityError';
  }
}

/**
 * Error in DOM operations
 */
export class DOMError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'DOM_ERROR', ...options });
    this.name = 'DOMError';
  }
}

/**
 * Error in store operations
 */
export class StoreError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'STORE_ERROR', ...options });
    this.name = 'StoreError';
  }
}

/**
 * Error in router operations
 */
export class RouterError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'ROUTER_ERROR', ...options });
    this.name = 'RouterError';
  }
}

// ============================================================================
// CLI Errors
// ============================================================================

/**
 * Base class for CLI errors
 */
export class CLIError extends PulseError {
  constructor(message, options = {}) {
    super(message, { code: 'CLI_ERROR', ...options });
    this.name = 'CLIError';
  }
}

/**
 * Configuration file error
 */
export class ConfigError extends CLIError {
  constructor(message, options = {}) {
    super(message, { code: 'CONFIG_ERROR', ...options });
    this.name = 'ConfigError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Common error suggestions based on error patterns
 */
export const SUGGESTIONS = {
  'undefined-variable': (name) =>
    `Did you forget to declare '${name}' in the state block or import it?`,
  'duplicate-declaration': (name) =>
    `Remove the duplicate declaration of '${name}'`,
  'unexpected-token': (expected, got) =>
    `Expected ${expected} but got '${got}'. Check for missing braces, quotes, or semicolons.`,
  'missing-closing-brace': () =>
    `Add the missing closing brace '}'`,
  'missing-closing-paren': () =>
    `Add the missing closing parenthesis ')'`,
  'invalid-directive': (name) =>
    `'${name}' is not a valid directive. Valid directives: @if, @each, @click, @link, @outlet`,
  'empty-block': (blockName) =>
    `The ${blockName} block is empty. Add content or remove the block.`
};

/**
 * Format an error with source code context
 * @param {Error} error - The error to format
 * @param {string} [source] - Source code for context
 * @returns {string} Formatted error string
 */
export function formatError(error, source) {
  if (error instanceof PulseError) {
    return error.formatWithSnippet(source);
  }

  // Handle plain Error objects with line/column properties
  if (error.line && source) {
    const pulseError = new PulseError(error.message, {
      line: error.line,
      column: error.column,
      file: error.file
    });
    return pulseError.formatWithSnippet(source);
  }

  return error.stack || error.message;
}

/**
 * Create a parser error from a token
 * @param {string} message - Error message
 * @param {Object} token - Token object with line/column info
 * @param {Object} [options={}] - Additional options
 * @returns {ParserError} The created error
 */
export function createParserError(message, token, options = {}) {
  return new ParserError(message, {
    line: token?.line || 1,
    column: token?.column || 1,
    token,
    ...options
  });
}

export default {
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
  formatError,
  createParserError
};
