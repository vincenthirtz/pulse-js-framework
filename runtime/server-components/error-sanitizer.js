/**
 * Pulse Server Components - Error Sanitizer
 *
 * Sanitizes error objects before sending to client to prevent sensitive data leakage.
 *
 * Security Protections:
 * 1. Stack Trace Filtering - Removes internal file paths, function names
 * 2. Message Redaction - Strips secrets, connection strings, env vars
 * 3. Production Mode - Returns minimal safe errors in production
 * 4. Context Filtering - Removes sensitive error context properties
 *
 * @module pulse-js-framework/runtime/server-components/error-sanitizer
 */

import { loggers } from '../logger.js';

const log = loggers.dom;

// ============================================================================
// Constants - Sensitive Patterns
// ============================================================================

/**
 * Patterns to redact from error messages.
 * Covers secrets, connection strings, file paths, env vars.
 */
const SENSITIVE_MESSAGE_PATTERNS = [
  // Connection strings
  /postgres:\/\/[^@]+@[^/]+/gi,          // PostgreSQL
  /mongodb(\+srv)?:\/\/[^@]+@[^/]+/gi,   // MongoDB
  /mysql:\/\/[^@]+@[^/]+/gi,             // MySQL
  /redis:\/\/[^@]+@[^/]+/gi,             // Redis

  // API keys and tokens (common formats)
  /[a-zA-Z0-9_-]{20,}/g,                 // Generic long tokens

  // Environment variable values (KEY=value patterns)
  /\b[A-Z_]+=[^\s]+/g,

  // File paths (Unix and Windows)
  /\/[a-zA-Z0-9_\-./]+\.(js|ts|json|env|config)/gi,
  /[A-Z]:\\[^"\s]+\.(js|ts|json|env|config)/gi,

  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
];

/**
 * Stack trace line patterns to remove entirely.
 * Removes internal framework paths, node_modules, and system paths.
 */
const STACK_TRACE_FILTER_PATTERNS = [
  /node_modules/,                        // Dependencies
  /node:internal/,                       // Node.js internals
  /runtime\/server-components/,          // Internal framework paths (keep only public error location)
  /\/Users\/[^/]+/,                      // User home directories (macOS/Linux)
  /C:\\Users\\[^\\]+/,                   // User home directories (Windows)
  /<anonymous>/                          // Anonymous functions (often internal)
];

/**
 * Error properties to remove before serialization.
 * These often contain sensitive context or internal state.
 */
const SENSITIVE_ERROR_PROPERTIES = [
  'request',           // HTTP request object
  'response',          // HTTP response object
  'config',            // Config objects (may contain secrets)
  'data',              // Request/response data
  'headers',           // HTTP headers (may contain auth tokens)
  'cookies',           // Cookies
  'session',           // Session data
  'locals',            // Express locals
  'params',            // Request params
  'query',             // Query strings
  'body',              // Request body
  'connection',        // Database connections
  'socket',            // Network sockets
  'client',            // Client objects
  '_originalError'     // Original error chains
];

// ============================================================================
// Mode Detection
// ============================================================================

/**
 * Check if running in production mode.
 *
 * @returns {boolean} True if production
 */
export function isProductionMode() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode.
 *
 * @returns {boolean} True if development
 */
export function isDevelopmentMode() {
  return process.env.NODE_ENV === 'development';
}

// ============================================================================
// Stack Trace Sanitization
// ============================================================================

/**
 * Sanitize a stack trace by removing internal paths and sensitive info.
 *
 * Filters out:
 * - node_modules paths
 * - User home directories
 * - Internal framework paths
 * - Anonymous function traces
 *
 * Preserves:
 * - User application code paths (relative)
 * - Line numbers
 * - Function names (if not anonymous)
 *
 * @param {string} stack - Raw stack trace
 * @returns {string} Sanitized stack trace
 *
 * @example
 * const raw = `Error: Test
 *   at /Users/alice/project/app.js:10:5
 *   at /Users/alice/project/node_modules/express/lib/router.js:42:12`;
 * const sanitized = sanitizeStackTrace(raw);
 * // Returns: "Error: Test\n  at app.js:10:5"
 */
export function sanitizeStackTrace(stack) {
  if (!stack || typeof stack !== 'string') {
    return '';
  }

  const lines = stack.split('\n');
  const sanitized = [];

  for (const line of lines) {
    // Keep error message line (first line)
    if (!line.trim().startsWith('at ')) {
      sanitized.push(line);
      continue;
    }

    // First, strip absolute paths to relative paths
    let sanitizedLine = line;

    // Replace absolute paths with relative (Unix)
    sanitizedLine = sanitizedLine.replace(/\/[a-zA-Z0-9_\-./]+\/([a-zA-Z0-9_\-./]+\.(js|ts))/g, '$1');

    // Replace absolute paths with relative (Windows)
    sanitizedLine = sanitizedLine.replace(/[A-Z]:\\[^"]+\\([a-zA-Z0-9_\-./\\]+\.(js|ts))/g, '$1');

    // NOW filter out internal/sensitive paths (after path conversion)
    let shouldFilter = false;
    for (const pattern of STACK_TRACE_FILTER_PATTERNS) {
      if (pattern.test(sanitizedLine)) {
        shouldFilter = true;
        break;
      }
    }

    if (shouldFilter) {
      continue; // Skip this line
    }

    sanitized.push(sanitizedLine);
  }

  return sanitized.join('\n');
}

/**
 * Limit stack trace to a maximum number of lines.
 *
 * @param {string} stack - Stack trace
 * @param {number} maxLines - Maximum lines to keep (default: 5)
 * @returns {string} Truncated stack trace
 */
export function truncateStackTrace(stack, maxLines = 5) {
  if (!stack) {
    return '';
  }

  const lines = stack.split('\n');
  if (lines.length <= maxLines) {
    return stack;
  }

  const truncated = lines.slice(0, maxLines);
  truncated.push(`  ... (${lines.length - maxLines} more lines)`);
  return truncated.join('\n');
}

// ============================================================================
// Message Sanitization
// ============================================================================

/**
 * Sanitize an error message by redacting sensitive patterns.
 *
 * Redacts:
 * - Connection strings (postgres://, mongodb://, etc.)
 * - API keys and tokens
 * - File paths
 * - Email addresses
 * - IP addresses
 * - Environment variables
 *
 * @param {string} message - Raw error message
 * @returns {string} Sanitized message
 *
 * @example
 * const raw = 'Connection failed: postgres://user:pass@localhost/db';
 * const sanitized = sanitizeErrorMessage(raw);
 * // Returns: 'Connection failed: [REDACTED]'
 */
export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = message;

  // Replace each sensitive pattern with [REDACTED]
  for (const pattern of SENSITIVE_MESSAGE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

// ============================================================================
// Error Object Sanitization
// ============================================================================

/**
 * Sanitization options.
 *
 * @typedef {Object} SanitizationOptions
 * @property {'production'|'development'|'test'} [mode] - Override mode detection
 * @property {boolean} [includeStack=true] - Include stack trace (sanitized)
 * @property {number} [maxStackLines=5] - Max stack trace lines
 * @property {boolean} [redactMessages=true] - Redact sensitive patterns in messages
 * @property {string[]} [allowedProperties] - Whitelist of error properties to keep
 */

/**
 * Sanitize an error object for safe transmission to client.
 *
 * Removes:
 * - Sensitive error properties (request, config, headers, etc.)
 * - Internal stack traces
 * - Secrets from error messages
 *
 * Preserves:
 * - Error type/name
 * - Sanitized message
 * - Sanitized stack (if enabled)
 * - Error code (if present)
 * - Allowed custom properties
 *
 * @param {Error} error - Error object to sanitize
 * @param {SanitizationOptions} [options] - Sanitization options
 * @returns {Object} Sanitized error object (plain object, not Error instance)
 *
 * @example
 * try {
 *   await db.connect('postgres://user:secret@localhost/db');
 * } catch (error) {
 *   const safe = sanitizeError(error);
 *   res.json({ error: safe });
 * }
 * // Client receives: { name: 'Error', message: 'Connection failed: [REDACTED]' }
 */
export function sanitizeError(error, options = {}) {
  const {
    mode = isProductionMode() ? 'production' : 'development',
    includeStack = mode === 'development',
    maxStackLines = 5,
    redactMessages = true,
    allowedProperties = []
  } = options;

  // Base safe error
  const safe = {
    name: error.name || 'Error',
    message: redactMessages ? sanitizeErrorMessage(error.message) : error.message
  };

  // Add error code if present (usually safe)
  if (error.code) {
    safe.code = error.code;
  }

  // Add stack trace (development only, sanitized)
  if (includeStack && error.stack) {
    let stack = sanitizeStackTrace(error.stack);
    if (maxStackLines > 0) {
      stack = truncateStackTrace(stack, maxStackLines);
    }
    safe.stack = stack;
  }

  // Add allowed custom properties (whitelist only)
  for (const prop of allowedProperties) {
    if (error[prop] !== undefined && !SENSITIVE_ERROR_PROPERTIES.includes(prop)) {
      safe[prop] = error[prop];
    }
  }

  // Special handling for Pulse errors (preserve suggestion, context if safe)
  if (error.suggestion && typeof error.suggestion === 'string') {
    safe.suggestion = error.suggestion;
  }

  if (error.context && typeof error.context === 'string') {
    safe.context = redactMessages ? sanitizeErrorMessage(error.context) : error.context;
  }

  return safe;
}

/**
 * Create a production-safe error with minimal information.
 *
 * Returns a generic error message without any potentially sensitive details.
 * Use this for critical errors where you want to hide all implementation details.
 *
 * @param {Error} error - Original error
 * @param {string} [genericMessage='An error occurred'] - Generic message
 * @returns {Object} Minimal safe error object
 *
 * @example
 * try {
 *   await processPayment(secretKey, card);
 * } catch (error) {
 *   const safe = createProductionSafeError(error, 'Payment processing failed');
 *   res.status(500).json({ error: safe });
 * }
 * // Client receives: { name: 'Error', message: 'Payment processing failed' }
 */
export function createProductionSafeError(error, genericMessage = 'An error occurred') {
  // Log original error server-side (for debugging)
  log.error('Production error (details hidden from client):', error);

  return {
    name: 'Error',
    message: genericMessage
  };
}

/**
 * Sanitize an array of errors (for aggregate errors, validation errors, etc.).
 *
 * @param {Error[]} errors - Array of errors
 * @param {SanitizationOptions} [options] - Sanitization options
 * @returns {Object[]} Array of sanitized errors
 *
 * @example
 * const validationErrors = [
 *   new Error('Invalid email'),
 *   new Error('Password too short')
 * ];
 * const safe = sanitizeErrors(validationErrors);
 */
export function sanitizeErrors(errors, options = {}) {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.map(error => sanitizeError(error, options));
}

// ============================================================================
// Validation Error Sanitization
// ============================================================================

/**
 * Basic HTML escaping for user-generated validation error messages.
 *
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize validation errors specifically.
 * Validation errors are usually safe, but may contain user input that needs XSS sanitization.
 *
 * @param {Object} validationErrors - Validation errors object (key: fieldName, value: error)
 * @returns {Object} Sanitized validation errors
 *
 * @example
 * const errors = {
 *   email: 'Invalid email: <script>alert(1)</script>',
 *   password: 'Too short'
 * };
 * const safe = sanitizeValidationErrors(errors);
 * // { email: 'Invalid email: &lt;script&gt;alert(1)&lt;/script&gt;', password: 'Too short' }
 */
export function sanitizeValidationErrors(validationErrors) {
  if (!validationErrors || typeof validationErrors !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [field, error] of Object.entries(validationErrors)) {
    if (typeof error === 'string') {
      // Escape HTML/XSS first, then redact sensitive patterns
      sanitized[field] = sanitizeErrorMessage(escapeHtml(error));
    } else if (error instanceof Error) {
      sanitized[field] = sanitizeError(error, { includeStack: false }).message;
    } else {
      sanitized[field] = String(error);
    }
  }

  return sanitized;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  sanitizeError,
  sanitizeErrors,
  sanitizeStackTrace,
  truncateStackTrace,
  sanitizeErrorMessage,
  sanitizeValidationErrors,
  createProductionSafeError,
  isProductionMode,
  isDevelopmentMode
};
