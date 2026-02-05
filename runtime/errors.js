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
      return this.format();
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
      output += `\n  → ${this.suggestion}\n`;
    }

    if (this.code && this.code !== 'PULSE_ERROR') {
      output += `\n  See: ${getDocsUrl(this.code)}\n`;
    }

    return output;
  }

  /**
   * Format error without source code context
   * @returns {string} Formatted error message
   */
  format() {
    let output = `${this.name}: ${this.message}`;

    if (this.file || this.line) {
      output += `\n  at ${this.file || '<anonymous>'}`;
      if (this.line) output += `:${this.line}`;
      if (this.column) output += `:${this.column}`;
    }

    if (this.suggestion) {
      output += `\n\n  → ${this.suggestion}`;
    }

    if (this.code && this.code !== 'PULSE_ERROR') {
      output += `\n  See: ${getDocsUrl(this.code)}`;
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
// Client Errors (HTTP, WebSocket, GraphQL)
// ============================================================================

/**
 * Base class for client errors (HTTP, WebSocket, GraphQL).
 * Provides common patterns for error creation with suggestions.
 *
 * @example
 * class HttpError extends ClientError {
 *   static suggestions = { TIMEOUT: 'Increase timeout...' };
 *   static errorName = 'HttpError';
 *   static defaultCode = 'HTTP_ERROR';
 *   static markerProperty = 'isHttpError';
 * }
 */
export class ClientError extends RuntimeError {
  /** @type {Object<string, string>} Error code to suggestion mapping */
  static suggestions = {};

  /** @type {string} The error class name */
  static errorName = 'ClientError';

  /** @type {string} Default error code when none provided */
  static defaultCode = 'CLIENT_ERROR';

  /** @type {string} Property name for instance type checking (e.g., 'isHttpError') */
  static markerProperty = 'isClientError';

  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {string} [options.code] - Error code
   * @param {string} [options.context] - Error context
   * @param {string} [options.suggestion] - Custom suggestion (overrides default)
   */
  constructor(message, options = {}) {
    const code = options.code || new.target.defaultCode;
    const suggestion = options.suggestion || new.target.suggestions[code];

    const formattedMessage = createErrorMessage({
      code,
      message,
      context: options.context,
      suggestion
    });

    super(formattedMessage, { code });

    this.name = new.target.errorName;
    this.code = code;
    this[new.target.markerProperty] = true;
  }

  /**
   * Check if an error is an instance of this error type
   * @param {any} error - The error to check
   * @returns {boolean}
   */
  static isError(error) {
    return error?.[this.markerProperty] === true;
  }

  /**
   * Check if this is a timeout error
   * @returns {boolean}
   */
  isTimeout() {
    return this.code === 'TIMEOUT';
  }

  /**
   * Check if this is a network error
   * @returns {boolean}
   */
  isNetworkError() {
    return this.code === 'NETWORK' || this.code === 'NETWORK_ERROR';
  }
}

/**
 * Factory to create a client error class with specific suggestions and properties.
 *
 * @param {Object} config - Error class configuration
 * @param {string} config.name - Error class name (e.g., 'HttpError')
 * @param {string} config.defaultCode - Default error code
 * @param {string} config.markerProperty - Instance marker property (e.g., 'isHttpError')
 * @param {Object<string, string>} config.suggestions - Error code to suggestion mapping
 * @param {string[]} [config.codeMethods] - Error codes to create isXxx() methods for
 * @param {string[]} [config.additionalProperties] - Extra properties to copy from options
 * @returns {typeof ClientError} The created error class
 *
 * @example
 * const HttpError = createClientErrorClass({
 *   name: 'HttpError',
 *   defaultCode: 'HTTP_ERROR',
 *   markerProperty: 'isHttpError',
 *   suggestions: {
 *     TIMEOUT: 'Consider increasing the timeout.',
 *     NETWORK: 'Check internet connectivity.'
 *   },
 *   codeMethods: ['TIMEOUT', 'NETWORK', 'ABORT'],
 *   additionalProperties: ['config', 'request', 'response', 'status']
 * });
 */
export function createClientErrorClass(config) {
  const {
    name,
    defaultCode,
    markerProperty,
    suggestions = {},
    codeMethods = [],
    additionalProperties = []
  } = config;

  class CustomClientError extends ClientError {
    static suggestions = suggestions;
    static errorName = name;
    static defaultCode = defaultCode;
    static markerProperty = markerProperty;

    constructor(message, options = {}) {
      super(message, options);

      // Copy additional properties from options
      for (const prop of additionalProperties) {
        this[prop] = options[prop] ?? null;
      }
    }

    /**
     * Static type check method (e.g., HttpError.isHttpError(err))
     */
    static [`is${name}`](error) {
      return error?.[markerProperty] === true;
    }
  }

  // Add isXxx() methods for each code
  for (const code of codeMethods) {
    const methodName = 'is' + code.split('_').map(
      (part, i) => i === 0
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');

    CustomClientError.prototype[methodName] = function () {
      return this.code === code;
    };
  }

  // Set the class name for better debugging
  Object.defineProperty(CustomClientError, 'name', { value: name });

  return CustomClientError;
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
// Documentation & URLs
// ============================================================================

const DOCS_BASE_URL = 'https://pulse-js.fr';

/**
 * Generate documentation URL for an error code
 * @param {string} code - Error code
 * @returns {string} Documentation URL
 */
export function getDocsUrl(code) {
  const paths = {
    // Reactivity
    'COMPUTED_SET': 'reactivity/computed#read-only',
    'CIRCULAR_DEPENDENCY': 'reactivity/effects#circular-dependencies',
    'EFFECT_ERROR': 'reactivity/effects#error-handling',
    // DOM
    'MOUNT_ERROR': 'dom/mounting#troubleshooting',
    'SELECTOR_INVALID': 'dom/elements#selectors',
    'LIST_NO_KEY': 'dom/lists#key-function',
    // Router
    'ROUTE_NOT_FOUND': 'router/routes#catch-all',
    'LAZY_TIMEOUT': 'router/lazy-loading#timeout',
    'GUARD_ERROR': 'router/guards#error-handling',
    // Store
    'PERSIST_ERROR': 'store/persistence#troubleshooting',
    'STORE_TYPE_ERROR': 'store/state#valid-types',
    // Compiler
    'PARSER_ERROR': 'compiler/syntax',
    'DUPLICATE_BLOCK': 'compiler/structure#blocks',
    'INVALID_DIRECTIVE': 'compiler/directives',
    'LEXER_ERROR': 'compiler/syntax#tokens'
  };
  return `${DOCS_BASE_URL}/${paths[code] || 'errors#' + code.toLowerCase()}`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Common error suggestions based on error patterns
 */
export const SUGGESTIONS = {
  // Compiler
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
    `'${name}' is not a valid directive. Valid directives: @if, @for, @click, @link, @outlet`,
  'empty-block': (blockName) =>
    `The ${blockName} block is empty. Add content or remove the block.`,

  // Reactivity
  'computed-set': (name) =>
    `Use a regular pulse() if you need to set values directly, or modify the source pulse(s) that '${name || 'this computed'}' depends on.`,
  'circular-dependency': () =>
    `Check for effects that modify their own dependencies. Consider using batch() to group updates.`,
  'effect-cleanup': () =>
    `Return a cleanup function from your effect: effect(() => { ... return () => cleanup(); })`,

  // DOM
  'mount-not-found': (selector) =>
    `Ensure "${selector}" exists in the DOM. Use DOMContentLoaded or place script at end of <body>.`,
  'invalid-selector': (selector) =>
    `"${selector}" is not a valid CSS selector. Use tag.class#id[attr] format.`,
  'list-needs-key': () =>
    `Add a key function as third argument: list(items, render, item => item.id)`,

  // Router
  'route-not-found': (path) =>
    `Add a route for "${path}" or use a catch-all route: '/*path': NotFoundPage`,
  'lazy-timeout': (ms) =>
    `The component took longer than ${ms}ms to load. Check your network or increase timeout.`,

  // Store
  'persist-quota': () =>
    `localStorage is full. Consider clearing old data or reducing state size.`,
  'invalid-store-value': (type) =>
    `Store values must be serializable. ${type} cannot be persisted.`
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

/**
 * Create a user-friendly error message with context and suggestions
 * @param {Object} options - Error options
 * @param {string} options.code - Error code (e.g., 'COMPUTED_SET')
 * @param {string} options.message - Main error message
 * @param {string} [options.context] - What the user was trying to do
 * @param {string} [options.suggestion] - How to fix it
 * @param {Object} [options.details] - Additional details
 * @returns {string} Formatted error message
 */
export function createErrorMessage({ code, message, context, suggestion, details }) {
  let output = `[Pulse] ${message}`;

  if (context) {
    output += `\n\n  Context: ${context}`;
  }

  if (details) {
    for (const [key, value] of Object.entries(details)) {
      output += `\n  ${key}: ${value}`;
    }
  }

  if (suggestion) {
    output += `\n\n  → ${suggestion}`;
  }

  if (code) {
    output += `\n  See: ${getDocsUrl(code)}`;
  }

  return output;
}

// ============================================================================
// Pre-built Error Creators
// ============================================================================

/**
 * Error creators for common scenarios with good DX
 */
export const Errors = {
  /**
   * Cannot set computed value
   */
  computedSet(name) {
    return new ReactivityError(
      createErrorMessage({
        code: 'COMPUTED_SET',
        message: `Cannot set computed value${name ? ` '${name}'` : ''}.`,
        context: 'Computed values are derived from other pulses and update automatically.',
        suggestion: SUGGESTIONS['computed-set'](name)
      }),
      { code: 'COMPUTED_SET' }
    );
  },

  /**
   * Circular dependency in effects
   */
  circularDependency(effectIds, pending) {
    return new ReactivityError(
      createErrorMessage({
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Infinite loop detected in reactive effects.',
        context: 'An effect is repeatedly triggering itself or other effects.',
        details: {
          'Most active effects': effectIds.slice(0, 5).join(', '),
          'Still pending': pending.slice(0, 5).join(', ') || 'none'
        },
        suggestion: SUGGESTIONS['circular-dependency']()
      }),
      { code: 'CIRCULAR_DEPENDENCY' }
    );
  },

  /**
   * Mount target not found
   */
  mountNotFound(selector) {
    return new DOMError(
      createErrorMessage({
        code: 'MOUNT_ERROR',
        message: `Mount target not found: "${selector}"`,
        context: 'The element must exist in the DOM before mounting.',
        suggestion: SUGGESTIONS['mount-not-found'](selector)
      }),
      { code: 'MOUNT_ERROR' }
    );
  },

  /**
   * List missing key function
   */
  listNoKey() {
    return new DOMError(
      createErrorMessage({
        code: 'LIST_NO_KEY',
        message: 'List rendering without key function may cause performance issues.',
        context: 'Keys help Pulse efficiently update only changed items.',
        suggestion: SUGGESTIONS['list-needs-key']()
      }),
      { code: 'LIST_NO_KEY' }
    );
  },

  /**
   * Route not found
   */
  routeNotFound(path) {
    return new RouterError(
      createErrorMessage({
        code: 'ROUTE_NOT_FOUND',
        message: `No route matched: "${path}"`,
        context: 'Navigation attempted to an undefined route.',
        suggestion: SUGGESTIONS['route-not-found'](path)
      }),
      { code: 'ROUTE_NOT_FOUND' }
    );
  },

  /**
   * Lazy load timeout
   */
  lazyTimeout(timeout) {
    return new RouterError(
      createErrorMessage({
        code: 'LAZY_TIMEOUT',
        message: `Lazy component load timed out after ${timeout}ms.`,
        context: 'The dynamic import took too long to resolve.',
        suggestion: SUGGESTIONS['lazy-timeout'](timeout)
      }),
      { code: 'LAZY_TIMEOUT' }
    );
  },

  /**
   * Store persistence error
   */
  persistError(operation, cause) {
    return new StoreError(
      createErrorMessage({
        code: 'PERSIST_ERROR',
        message: `Failed to ${operation} persisted state.`,
        context: cause?.message || 'localStorage operation failed.',
        suggestion: SUGGESTIONS['persist-quota']()
      }),
      { code: 'PERSIST_ERROR' }
    );
  },

  /**
   * Invalid store value type
   */
  invalidStoreValue(type) {
    return new StoreError(
      createErrorMessage({
        code: 'STORE_TYPE_ERROR',
        message: `Invalid value type in store: ${type}`,
        context: 'Store values must be JSON-serializable.',
        suggestion: SUGGESTIONS['invalid-store-value'](type)
      }),
      { code: 'STORE_TYPE_ERROR' }
    );
  },

  /**
   * Native API not available
   */
  nativeNotAvailable(api) {
    return new RuntimeError(
      createErrorMessage({
        code: 'NATIVE_ERROR',
        message: `Native API '${api}' is not available.`,
        context: 'This API only works in Pulse native mobile apps.',
        suggestion: `Use isNativeAvailable() to check before calling native APIs, or use getPlatform() to detect the environment.`
      }),
      { code: 'NATIVE_ERROR' }
    );
  }
};

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
};
