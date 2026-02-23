/**
 * Pulse Server Components - Security Error Classes
 *
 * Specialized error classes for Server Components security violations.
 * All extend RuntimeError for consistency with the framework.
 *
 * @module pulse-js-framework/runtime/server-components/security-errors
 */

import { RuntimeError } from '../errors.js';

// ============================================================================
// Base Security Error
// ============================================================================

/**
 * Base class for all Server Components security errors.
 * Extends RuntimeError with security-specific context.
 *
 * @extends RuntimeError
 */
export class PSCSecurityError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, {
      code: 'PSC_SECURITY_ERROR',
      ...options
    });
    this.name = 'PSCSecurityError';
  }
}

// ============================================================================
// Serialization Error
// ============================================================================

/**
 * Error thrown when props contain non-serializable values.
 *
 * Non-serializable types:
 * - Functions
 * - Symbols
 * - Class instances (Promise, Error, custom classes)
 * - Circular references
 *
 * @extends PSCSecurityError
 */
export class PSCSerializationError extends PSCSecurityError {
  /**
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @param {string} [details.path] - Property path where error occurred
   * @param {string} [details.type] - Type of non-serializable value
   * @param {Array} [details.errors] - Array of all serialization errors
   */
  constructor(message, details = {}) {
    super(message, {
      code: 'PSC_NON_SERIALIZABLE',
      context: details.type ? `Type: ${details.type}` : undefined,
      suggestion: details.type === 'function'
        ? 'Use Server Actions instead of inline functions'
        : details.type === 'class-instance'
        ? 'Pass plain objects instead of class instances'
        : 'Ensure all props are JSON-serializable (strings, numbers, booleans, plain objects, arrays)',
      details: details.errors
    });
    this.name = 'PSCSerializationError';
    this.path = details.path;
    this.propType = details.type;
  }
}

// ============================================================================
// Environment Variable Error
// ============================================================================

/**
 * Error thrown when props contain environment variable references.
 *
 * Detects patterns like:
 * - process.env.API_KEY
 * - import.meta.env.VITE_API_KEY
 * - Deno.env.get('API_KEY')
 *
 * Note: This is usually a warning, not a blocking error, since strings
 * could contain these patterns as documentation/examples.
 *
 * @extends PSCSecurityError
 */
export class PSCEnvVarError extends PSCSecurityError {
  /**
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @param {string} [details.path] - Property path where env var was found
   * @param {string} [details.variable] - Environment variable name
   * @param {string} [details.pattern] - Full pattern that matched
   * @param {Array} [details.warnings] - Array of all env var detections
   */
  constructor(message, details = {}) {
    super(message, {
      code: 'PSC_ENV_VAR_IN_PROPS',
      context: details.variable ? `Variable: ${details.variable}` : undefined,
      suggestion: 'Avoid passing environment variables as props. Keep secrets on the server.',
      details: details.warnings
    });
    this.name = 'PSCEnvVarError';
    this.path = details.path;
    this.variable = details.variable;
    this.pattern = details.pattern;
  }
}

// ============================================================================
// CSRF Error
// ============================================================================

/**
 * Error thrown when CSRF token validation fails.
 *
 * Reasons:
 * - MISSING_TOKEN: No CSRF token in request
 * - INVALID_FORMAT: Token format is incorrect
 * - EXPIRED: Token has expired
 * - INVALID_SIGNATURE: HMAC signature doesn't match
 * - UNKNOWN_TOKEN: Token not found in store
 * - TOKEN_ALREADY_USED: Single-use token was already used
 *
 * @extends PSCSecurityError
 */
export class PSCCSRFError extends PSCSecurityError {
  /**
   * @param {string} reason - Failure reason code
   * @param {Object} [details] - Additional error details
   * @param {string} [details.token] - Partial token (first 8 chars)
   * @param {boolean} [details.expired] - Whether token expired
   */
  constructor(reason, details = {}) {
    const messages = {
      MISSING_TOKEN: 'CSRF token missing from request',
      INVALID_FORMAT: 'CSRF token has invalid format',
      EXPIRED: 'CSRF token has expired',
      INVALID_SIGNATURE: 'CSRF token signature is invalid',
      UNKNOWN_TOKEN: 'CSRF token not found in store',
      TOKEN_ALREADY_USED: 'CSRF token has already been used'
    };

    const message = messages[reason] || 'CSRF validation failed';

    super(message, {
      code: 'PSC_CSRF_INVALID',
      context: reason ? `Reason: ${reason}` : undefined,
      suggestion: reason === 'EXPIRED'
        ? 'CSRF token expired. Reload the page to get a new token.'
        : reason === 'MISSING_TOKEN'
        ? 'Include CSRF token in X-CSRF-Token header or ensure meta tag is present.'
        : reason === 'INVALID_SIGNATURE'
        ? 'CSRF token signature invalid. Possible tampering detected.'
        : 'Ensure CSRF token is correctly generated and transmitted.',
      details
    });
    this.name = 'PSCCSRFError';
    this.reason = reason;
    this.expired = details.expired;
  }
}

// ============================================================================
// Rate Limit Error
// ============================================================================

/**
 * Error thrown when rate limit is exceeded.
 *
 * Contains information about:
 * - Which limit was exceeded (action, user, or global)
 * - How long to wait before retrying
 * - When the limit will reset
 *
 * @extends PSCSecurityError
 */
export class PSCRateLimitError extends PSCSecurityError {
  /**
   * @param {string} message - Error message
   * @param {Object} [details] - Additional error details
   * @param {string} [details.reason] - Which limit was exceeded
   * @param {number} [details.retryAfter] - Milliseconds until retry allowed
   * @param {number} [details.resetAt] - Timestamp when limit resets
   * @param {number} [details.limit] - Maximum requests allowed
   * @param {string} [details.actionId] - Action ID that was rate limited
   */
  constructor(message, details = {}) {
    super(message, {
      code: 'PSC_RATE_LIMIT_EXCEEDED',
      context: details.reason ? `Reason: ${details.reason}` : undefined,
      suggestion: details.retryAfter
        ? `Wait ${Math.ceil(details.retryAfter / 1000)}s before retrying`
        : 'Reduce request frequency',
      details
    });
    this.name = 'PSCRateLimitError';
    this.reason = details.reason;
    this.retryAfter = details.retryAfter;
    this.resetAt = details.resetAt;
    this.limit = details.limit;
    this.actionId = details.actionId;
  }

  /**
   * Check if error is a rate limit error
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  static isRateLimitError(error) {
    return error instanceof PSCRateLimitError || error?.name === 'PSCRateLimitError';
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  PSCSecurityError,
  PSCSerializationError,
  PSCEnvVarError,
  PSCCSRFError,
  PSCRateLimitError
};
