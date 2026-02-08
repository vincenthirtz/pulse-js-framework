/**
 * Pulse Framework - Error Classes Type Definitions
 *
 * Structured error handling for the framework with source location tracking,
 * code snippet formatting, and helpful suggestions.
 *
 * @module pulse-js-framework/core/errors
 */

// ============================================================================
// Error Options
// ============================================================================

/**
 * Options for constructing a PulseError
 */
export interface PulseErrorOptions {
  /** Line number where error occurred */
  line?: number;
  /** Column number where error occurred */
  column?: number;
  /** Source file path */
  file?: string;
  /** Error code for documentation lookup */
  code?: string;
  /** Original source code */
  source?: string;
  /** Helpful suggestion to fix the error */
  suggestion?: string;
}

/**
 * Options for constructing a ParserError
 */
export interface ParserErrorOptions extends PulseErrorOptions {
  /** The problematic token */
  token?: unknown;
}

/**
 * Options for constructing a ClientError
 */
export interface ClientErrorOptions {
  /** Error code */
  code?: string;
  /** Error context description */
  context?: string;
  /** Custom suggestion (overrides default from suggestions map) */
  suggestion?: string;
}

/**
 * Options for the createErrorMessage utility
 */
export interface ErrorMessageOptions {
  /** Error code (e.g., 'COMPUTED_SET') */
  code: string;
  /** Main error message */
  message: string;
  /** What the user was trying to do */
  context?: string;
  /** How to fix the error */
  suggestion?: string;
  /** Additional key-value details */
  details?: Record<string, unknown>;
}

/**
 * Configuration for createClientErrorClass factory
 */
export interface ClientErrorClassConfig {
  /** Error class name (e.g., 'HttpError') */
  name: string;
  /** Default error code when none provided */
  defaultCode: string;
  /** Instance marker property name (e.g., 'isHttpError') */
  markerProperty: string;
  /** Error code to suggestion string mapping */
  suggestions?: Record<string, string>;
  /** Error codes to create isXxx() instance methods for */
  codeMethods?: string[];
  /** Extra properties to copy from constructor options */
  additionalProperties?: string[];
}

/**
 * JSON representation of a PulseError
 */
export interface PulseErrorJSON {
  name: string;
  message: string;
  line: number | null;
  column: number | null;
  file: string | null;
  code: string;
  suggestion: string | null;
}

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all Pulse framework errors.
 * Provides source location tracking and code snippet formatting.
 *
 * @example
 * ```typescript
 * const error = new PulseError('Something went wrong', {
 *   line: 10,
 *   column: 5,
 *   file: 'App.pulse',
 *   code: 'CUSTOM_ERROR',
 *   suggestion: 'Check your syntax'
 * });
 * console.error(error.formatWithSnippet(sourceCode));
 * ```
 */
export declare class PulseError extends Error {
  readonly name: string;

  /** Line number where the error occurred */
  readonly line: number | null;

  /** Column number where the error occurred */
  readonly column: number | null;

  /** Source file path */
  readonly file: string | null;

  /** Error code for documentation lookup */
  readonly code: string;

  /** Original source code */
  readonly source: string | null;

  /** Helpful suggestion to fix the error */
  readonly suggestion: string | null;

  /**
   * @param message - Error message
   * @param options - Error options with source location and context
   */
  constructor(message: string, options?: PulseErrorOptions);

  /**
   * Format the error with a code snippet showing surrounding context lines.
   *
   * @param source - Source code to use (overrides this.source)
   * @param contextLines - Number of lines to show before/after error (default: 2)
   * @returns Formatted error string with code snippet, location, and suggestion
   */
  formatWithSnippet(source?: string | null, contextLines?: number): string;

  /**
   * Format error without source code context.
   * Includes file location, suggestion, and documentation URL.
   *
   * @returns Formatted error message
   */
  format(): string;

  /**
   * Convert to plain object for JSON serialization.
   *
   * @returns Plain object representation
   */
  toJSON(): PulseErrorJSON;
}

// ============================================================================
// Compiler Errors
// ============================================================================

/**
 * Base class for all compilation errors.
 * Default code: 'COMPILE_ERROR'
 */
export declare class CompileError extends PulseError {
  readonly name: 'CompileError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error during lexical analysis (tokenization).
 * Default code: 'LEXER_ERROR'
 */
export declare class LexerError extends CompileError {
  readonly name: 'LexerError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error during parsing (AST construction).
 * Default code: 'PARSER_ERROR'
 */
export declare class ParserError extends CompileError {
  readonly name: 'ParserError';

  /** The problematic token that caused the parse error */
  readonly token: unknown;

  /**
   * @param message - Error message
   * @param options - Error options, may include the problematic token
   */
  constructor(message: string, options?: ParserErrorOptions);
}

/**
 * Error during code transformation/generation.
 * Default code: 'TRANSFORM_ERROR'
 */
export declare class TransformError extends CompileError {
  readonly name: 'TransformError';

  constructor(message: string, options?: PulseErrorOptions);
}

// ============================================================================
// Runtime Errors
// ============================================================================

/**
 * Base class for all runtime errors.
 * Default code: 'RUNTIME_ERROR'
 */
export declare class RuntimeError extends PulseError {
  readonly name: 'RuntimeError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error in the reactivity system (effects, computed values).
 * Default code: 'REACTIVITY_ERROR'
 */
export declare class ReactivityError extends RuntimeError {
  readonly name: 'ReactivityError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error in DOM operations.
 * Default code: 'DOM_ERROR'
 */
export declare class DOMError extends RuntimeError {
  readonly name: 'DOMError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error in store operations.
 * Default code: 'STORE_ERROR'
 */
export declare class StoreError extends RuntimeError {
  readonly name: 'StoreError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Error in router operations.
 * Default code: 'ROUTER_ERROR'
 */
export declare class RouterError extends RuntimeError {
  readonly name: 'RouterError';

  constructor(message: string, options?: PulseErrorOptions);
}

// ============================================================================
// Client Errors (HTTP, WebSocket, GraphQL)
// ============================================================================

/**
 * Base class for client errors (HTTP, WebSocket, GraphQL).
 * Provides common patterns for error creation with suggestions.
 *
 * Subclasses should define static properties:
 * - `suggestions` - Error code to suggestion mapping
 * - `errorName` - The error class name
 * - `defaultCode` - Default error code when none provided
 * - `markerProperty` - Property name for instance type checking
 *
 * @example
 * ```typescript
 * class HttpError extends ClientError {
 *   static suggestions = { TIMEOUT: 'Increase timeout...' };
 *   static errorName = 'HttpError';
 *   static defaultCode = 'HTTP_ERROR';
 *   static markerProperty = 'isHttpError';
 * }
 * ```
 */
export declare class ClientError extends RuntimeError {
  /** Error code to suggestion mapping */
  static suggestions: Record<string, string>;

  /** The error class name */
  static errorName: string;

  /** Default error code when none provided */
  static defaultCode: string;

  /** Property name for instance type checking (e.g., 'isHttpError') */
  static markerProperty: string;

  /**
   * @param message - Error message
   * @param options - Error options with code, context, and suggestion
   */
  constructor(message: string, options?: ClientErrorOptions);

  /**
   * Check if an error is an instance of this error type
   * by checking for the marker property.
   *
   * @param error - The error to check
   * @returns true if error has the marker property set to true
   */
  static isError(error: unknown): boolean;

  /**
   * Check if this is a timeout error (code === 'TIMEOUT').
   */
  isTimeout(): boolean;

  /**
   * Check if this is a network error (code === 'NETWORK' or 'NETWORK_ERROR').
   */
  isNetworkError(): boolean;
}

/**
 * Factory to create a client error class with specific suggestions, marker
 * properties, and convenience check methods.
 *
 * The returned class extends ClientError with:
 * - Static `suggestions`, `errorName`, `defaultCode`, `markerProperty`
 * - A static `is<Name>(error)` method for type checking
 * - Instance `is<Code>()` methods for each entry in `codeMethods`
 * - Auto-copy of `additionalProperties` from constructor options
 *
 * @param config - Error class configuration
 * @returns A new error class extending ClientError
 *
 * @example
 * ```typescript
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
 * ```
 */
export declare function createClientErrorClass(config: ClientErrorClassConfig): typeof ClientError;

// ============================================================================
// CLI Errors
// ============================================================================

/**
 * Base class for CLI errors.
 * Default code: 'CLI_ERROR'
 */
export declare class CLIError extends PulseError {
  readonly name: 'CLIError';

  constructor(message: string, options?: PulseErrorOptions);
}

/**
 * Configuration file error.
 * Default code: 'CONFIG_ERROR'
 */
export declare class ConfigError extends CLIError {
  readonly name: 'ConfigError';

  constructor(message: string, options?: PulseErrorOptions);
}

// ============================================================================
// Documentation & URLs
// ============================================================================

/**
 * Generate documentation URL for an error code.
 * Maps known codes to specific documentation pages on pulse-js.fr.
 *
 * @param code - Error code (e.g., 'COMPUTED_SET', 'CIRCULAR_DEPENDENCY')
 * @returns Full documentation URL
 *
 * @example
 * ```typescript
 * getDocsUrl('COMPUTED_SET');
 * // 'https://pulse-js.fr/reactivity/computed#read-only'
 *
 * getDocsUrl('UNKNOWN_CODE');
 * // 'https://pulse-js.fr/errors#unknown_code'
 * ```
 */
export declare function getDocsUrl(code: string): string;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Common error suggestions based on error patterns.
 * Each key maps to a function that returns a context-specific suggestion string.
 */
export declare const SUGGESTIONS: {
  /** Suggestion for undefined variable in .pulse file */
  'undefined-variable': (name: string) => string;
  /** Suggestion for duplicate declaration */
  'duplicate-declaration': (name: string) => string;
  /** Suggestion for unexpected token */
  'unexpected-token': (expected: string, got: string) => string;
  /** Suggestion for missing closing brace */
  'missing-closing-brace': () => string;
  /** Suggestion for missing closing parenthesis */
  'missing-closing-paren': () => string;
  /** Suggestion for invalid directive */
  'invalid-directive': (name: string) => string;
  /** Suggestion for empty block */
  'empty-block': (blockName: string) => string;
  /** Suggestion for attempting to set a computed value */
  'computed-set': (name?: string) => string;
  /** Suggestion for circular dependency */
  'circular-dependency': () => string;
  /** Suggestion for effect cleanup */
  'effect-cleanup': () => string;
  /** Suggestion for mount target not found */
  'mount-not-found': (selector: string) => string;
  /** Suggestion for invalid CSS selector */
  'invalid-selector': (selector: string) => string;
  /** Suggestion for list without key function */
  'list-needs-key': () => string;
  /** Suggestion for route not found */
  'route-not-found': (path: string) => string;
  /** Suggestion for lazy load timeout */
  'lazy-timeout': (ms: number) => string;
  /** Suggestion for localStorage quota exceeded */
  'persist-quota': () => string;
  /** Suggestion for invalid store value type */
  'invalid-store-value': (type: string) => string;
};

/**
 * Format an error with source code context.
 * If the error is a PulseError, uses formatWithSnippet().
 * Otherwise, attempts to create a PulseError from line/column properties.
 * Falls back to error.stack or error.message.
 *
 * @param error - The error to format
 * @param source - Source code for context
 * @returns Formatted error string
 */
export declare function formatError(error: Error, source?: string): string;

/**
 * Create a parser error from a token object.
 * Extracts line/column from the token for source location tracking.
 *
 * @param message - Error message
 * @param token - Token object with line/column info
 * @param options - Additional error options
 * @returns A new ParserError with location from the token
 */
export declare function createParserError(
  message: string,
  token: unknown,
  options?: PulseErrorOptions
): ParserError;

/**
 * Create a user-friendly error message with context and suggestions.
 * Produces a formatted string with [Pulse] prefix, context, details,
 * suggestion arrow, and documentation URL.
 *
 * @param options - Error message options
 * @returns Formatted error message string
 *
 * @example
 * ```typescript
 * const message = createErrorMessage({
 *   code: 'CUSTOM_ERROR',
 *   message: 'Something went wrong',
 *   context: 'While processing user input',
 *   suggestion: 'Check the input format',
 *   details: { input: 'invalid', expected: 'string' }
 * });
 * ```
 */
export declare function createErrorMessage(options: ErrorMessageOptions): string;

// ============================================================================
// Pre-built Error Creators
// ============================================================================

/**
 * Error creators for common scenarios with good developer experience.
 * Each method returns a properly typed error instance with contextual
 * messages, suggestions, and documentation links.
 */
export declare const Errors: {
  /**
   * Cannot set computed value.
   * Returns a ReactivityError with code 'COMPUTED_SET'.
   *
   * @param name - Optional name of the computed value
   */
  computedSet(name?: string): ReactivityError;

  /**
   * Circular dependency detected in reactive effects.
   * Returns a ReactivityError with code 'CIRCULAR_DEPENDENCY'.
   *
   * @param effectIds - Array of the most active effect IDs
   * @param pending - Array of still-pending effect IDs
   */
  circularDependency(effectIds: string[], pending: string[]): ReactivityError;

  /**
   * Mount target element not found in the DOM.
   * Returns a DOMError with code 'MOUNT_ERROR'.
   *
   * @param selector - The CSS selector that was not found
   */
  mountNotFound(selector: string): DOMError;

  /**
   * List rendering without a key function.
   * Returns a DOMError with code 'LIST_NO_KEY'.
   */
  listNoKey(): DOMError;

  /**
   * No route matched the given path.
   * Returns a RouterError with code 'ROUTE_NOT_FOUND'.
   *
   * @param path - The path that had no matching route
   */
  routeNotFound(path: string): RouterError;

  /**
   * Lazy component load timed out.
   * Returns a RouterError with code 'LAZY_TIMEOUT'.
   *
   * @param timeout - The timeout duration in milliseconds
   */
  lazyTimeout(timeout: number): RouterError;

  /**
   * Store persistence operation failed.
   * Returns a StoreError with code 'PERSIST_ERROR'.
   *
   * @param operation - The operation that failed (e.g., 'save', 'load')
   * @param cause - Optional underlying error
   */
  persistError(operation: string, cause?: Error): StoreError;

  /**
   * Invalid value type used in store.
   * Returns a StoreError with code 'STORE_TYPE_ERROR'.
   *
   * @param type - The invalid type name (e.g., 'Function', 'Symbol')
   */
  invalidStoreValue(type: string): StoreError;

  /**
   * Native API not available in current environment.
   * Returns a RuntimeError with code 'NATIVE_ERROR'.
   *
   * @param api - The native API name that is unavailable
   */
  nativeNotAvailable(api: string): RuntimeError;
};

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  PulseError: typeof PulseError;
  CompileError: typeof CompileError;
  LexerError: typeof LexerError;
  ParserError: typeof ParserError;
  TransformError: typeof TransformError;
  RuntimeError: typeof RuntimeError;
  ReactivityError: typeof ReactivityError;
  DOMError: typeof DOMError;
  StoreError: typeof StoreError;
  RouterError: typeof RouterError;
  ClientError: typeof ClientError;
  createClientErrorClass: typeof createClientErrorClass;
  CLIError: typeof CLIError;
  ConfigError: typeof ConfigError;
  SUGGESTIONS: typeof SUGGESTIONS;
  Errors: typeof Errors;
  formatError: typeof formatError;
  createParserError: typeof createParserError;
  createErrorMessage: typeof createErrorMessage;
  getDocsUrl: typeof getDocsUrl;
};

export default _default;
