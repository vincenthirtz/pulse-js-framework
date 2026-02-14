/**
 * Pulse Server Components - Enhanced Prop Serialization Validation
 *
 * Validates that props passed to Client Components are JSON-serializable and
 * detects environment variable references that could leak secrets.
 *
 * Security Checks:
 * 1. Non-Serializable Types - Functions, Symbols, class instances, Promises, etc.
 * 2. Environment Variables - Detects process.env.*, import.meta.env.*, Deno.env.*
 *
 * @module pulse-js-framework/runtime/server-components/security-validation
 */

import { loggers } from '../logger.js';
import { RuntimeError } from '../errors.js';

const log = loggers.dom;

// ============================================================================
// Constants - Forbidden Types
// ============================================================================

/**
 * Types that cannot be serialized to JSON.
 * These will cause errors if passed as props to Client Components.
 */
const FORBIDDEN_TYPES = new Set(['function', 'symbol']);

/**
 * Class constructors that should not be serialized.
 * These are detected via instanceof checks.
 */
const FORBIDDEN_CLASSES = [
  WeakMap,
  WeakSet,
  Promise,
  Error,
  RegExp,
  Date  // Serializes to string, loses type info - recommend explicit error
];

/**
 * Dangerous object keys that can lead to prototype pollution.
 * These keys must be blocked to prevent security vulnerabilities.
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ============================================================================
// Constants - Environment Variable Patterns
// ============================================================================

/**
 * String patterns for detecting environment variable access.
 * Using simple string matching to prevent ReDoS vulnerabilities.
 * Covers common patterns across Node.js, Vite, and Deno.
 */
const ENV_PATTERNS = [
  {
    prefix: 'process.env.',
    platform: 'Node.js',
    example: 'process.env.API_KEY'
  },
  {
    prefix: 'import.meta.env.',
    platform: 'Vite',
    example: 'import.meta.env.VITE_API_KEY'
  },
  {
    prefix: 'Deno.env.get(',
    platform: 'Deno',
    example: 'Deno.env.get("API_KEY")'
  }
];

/**
 * Maximum safe size for environment variable detection (prevents DoS)
 */
const MAX_ENV_SCAN_SIZE = 10000;

// ============================================================================
// Non-Serializable Type Detection
// ============================================================================

/**
 * Validation error for non-serializable values.
 *
 * @typedef {Object} SerializationError
 * @property {string} path - Property path (e.g., 'props.user.handler')
 * @property {string} type - Type of non-serializable value ('function', 'symbol', 'class-instance', etc.)
 * @property {string} [className] - Class name for class instances
 * @property {string} message - Human-readable error message
 */

/**
 * Detect non-serializable values in props object.
 *
 * Checks for:
 * - Functions (typeof === 'function')
 * - Symbols (typeof === 'symbol')
 * - Class instances (Promise, Error, RegExp, Date, WeakMap, WeakSet, custom classes)
 * - Circular references (tracked via WeakSet)
 *
 * @param {any} value - Value to check for serializability
 * @param {string} [path='props'] - Current property path for error messages
 * @returns {{ valid: boolean, errors: SerializationError[] }} Validation result
 *
 * @example
 * const result = detectNonSerializable({ onClick: () => {} }, 'props');
 * // { valid: false, errors: [{ path: 'props.onClick', type: 'function', message: '...' }] }
 */
export function detectNonSerializable(value, path = 'props') {
  const errors = [];
  const seen = new WeakSet();

  function check(val, currentPath) {
    if (val === null) {
      return; // null is serializable
    }

    if (val === undefined) {
      // undefined is technically omitted by JSON.stringify, but we want explicit error
      // Only error if it's a property value, not the top-level (which might be intentional)
      if (currentPath !== path) {
        errors.push({
          path: currentPath,
          type: 'undefined',
          message: 'Cannot serialize undefined (omitted by JSON.stringify)'
        });
      }
      return;
    }

    const type = typeof val;

    // Check primitive forbidden types
    if (FORBIDDEN_TYPES.has(type)) {
      errors.push({
        path: currentPath,
        type,
        message: `Cannot serialize ${type} (not JSON-compatible)`
      });
      return;
    }

    // Check objects
    if (type === 'object') {
      // Circular reference check
      if (seen.has(val)) {
        errors.push({
          path: currentPath,
          type: 'circular',
          message: 'Circular reference detected'
        });
        return;
      }
      seen.add(val);

      // Check forbidden class instances
      for (const ForbiddenClass of FORBIDDEN_CLASSES) {
        if (val instanceof ForbiddenClass) {
          errors.push({
            path: currentPath,
            type: 'class-instance',
            className: ForbiddenClass.name,
            message: `Cannot serialize ${ForbiddenClass.name} instance`
          });
          return;
        }
      }

      // Check arrays
      if (Array.isArray(val)) {
        val.forEach((item, i) => check(item, `${currentPath}[${i}]`));
        return;
      }

      // CRITICAL: Check for dangerous keys BEFORE processing object
      // Use for..in to catch __proto__, constructor, prototype
      // Object.keys() won't return __proto__ as it's not an own property
      for (const key in val) {
        if (DANGEROUS_KEYS.has(key)) {
          errors.push({
            path: `${currentPath}.${key}`,
            type: 'dangerous-key',
            message: `Dangerous property key "${key}" not allowed (prototype pollution risk)`
          });
        }
      }

      // Check if it's a plain object (Object.prototype or null prototype)
      const proto = Object.getPrototypeOf(val);
      if (proto === Object.prototype || proto === null) {
        // Plain object - check own properties recursively (skip dangerous keys)
        for (const key in val) {
          if (Object.prototype.hasOwnProperty.call(val, key) && !DANGEROUS_KEYS.has(key)) {
            check(val[key], `${currentPath}.${key}`);
          }
        }
      } else {
        // Custom class instance (not plain object)
        const className = val.constructor?.name || 'Unknown';
        errors.push({
          path: currentPath,
          type: 'class-instance',
          className,
          message: `Cannot serialize custom class instance (${className})`
        });
      }
    }
  }

  check(value, path);

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// Environment Variable Detection
// ============================================================================

/**
 * Detected environment variable reference.
 *
 * @typedef {Object} EnvVarDetection
 * @property {string} path - Property path where env var was found
 * @property {string} variable - Environment variable name (e.g., 'API_KEY')
 * @property {string} pattern - Pattern that matched (e.g., 'process.env.API_KEY')
 * @property {string} platform - Platform (Node.js, Vite, Deno)
 * @property {string} valuePreview - Truncated value preview
 */

/**
 * Detect environment variable references in prop values.
 *
 * Scans string values for patterns like:
 * - process.env.API_KEY
 * - import.meta.env.VITE_API_KEY
 * - Deno.env.get('API_KEY')
 *
 * Uses safe string matching (no regex) to prevent ReDoS attacks.
 * Returns warnings (not errors) since strings containing these patterns
 * could be false positives (e.g., documentation, code snippets).
 *
 * @param {any} value - Props object to scan
 * @param {string} [path='props'] - Current property path
 * @returns {{ detected: boolean, warnings: EnvVarDetection[] }} Detection result
 *
 * @example
 * const result = detectEnvironmentVariables({ apiKey: process.env.API_KEY });
 * // { detected: true, warnings: [{ path: 'props.apiKey', variable: 'API_KEY', ... }] }
 */
export function detectEnvironmentVariables(value, path = 'props') {
  const warnings = [];
  const seen = new WeakSet();

  function scan(val, currentPath) {
    if (val === null || val === undefined) {
      return;
    }

    const type = typeof val;

    // Check string values for env var patterns (safe string matching)
    if (type === 'string') {
      // Skip extremely large strings to prevent DoS
      if (val.length > MAX_ENV_SCAN_SIZE) {
        return;
      }

      for (const { prefix, platform } of ENV_PATTERNS) {
        let index = val.indexOf(prefix);

        while (index !== -1) {
          // Extract variable name (alphanumeric, underscore, uppercase preferred)
          let varName = '';
          let i = index + prefix.length;

          // Skip opening quote/paren for Deno.env.get(
          if (prefix === 'Deno.env.get(' && i < val.length) {
            const char = val[i];
            if (char === '"' || char === "'") {
              i++; // Skip quote
            }
          }

          // Extract variable name (max 100 chars to prevent runaway)
          // Accept both uppercase and lowercase for variable names
          let maxLen = Math.min(i + 100, val.length);
          while (i < maxLen) {
            const char = val[i];
            // Accept alphanumeric and underscore
            if (/[A-Za-z0-9_]/.test(char)) {
              varName += char;
              i++;
            } else {
              break;
            }
          }

          if (varName.length > 0) {
            const fullPattern = prefix + varName;
            const snippet = val.substring(index, Math.min(index + 50, val.length));

            warnings.push({
              path: currentPath,
              variable: varName,
              pattern: fullPattern,
              platform,
              valuePreview: snippet.replace(/[\r\n]/g, '') + (snippet.length < val.length - index ? '...' : '')
            });
          }

          // Find next occurrence
          index = val.indexOf(prefix, index + 1);
        }
      }
    }

    // Recursively scan objects and arrays
    if (type === 'object') {
      if (seen.has(val)) {
        return; // Already scanned (circular ref)
      }
      seen.add(val);

      if (Array.isArray(val)) {
        val.forEach((item, i) => scan(item, `${currentPath}[${i}]`));
      } else {
        for (const [key, v] of Object.entries(val)) {
          scan(v, `${currentPath}.${key}`);
        }
      }
    }
  }

  scan(value, path);

  return {
    detected: warnings.length > 0,
    warnings
  };
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Prop serialization validation result.
 *
 * @typedef {Object} PropSerializationResult
 * @property {boolean} valid - True if no blocking errors found
 * @property {SerializationError[]} errors - Non-serializable type errors (blocking)
 * @property {EnvVarDetection[]} warnings - Environment variable detections (non-blocking)
 * @property {any} sanitized - Same as input (no sanitization for serialization, only validation)
 */

/**
 * Validate prop serialization comprehensively.
 *
 * Orchestrates all serialization validations:
 * 1. Non-serializable type detection (errors, blocking)
 * 2. Environment variable detection (warnings, non-blocking)
 *
 * @param {any} props - Props to validate
 * @param {string} componentName - Component name for error messages
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.throwOnError=false] - Throw error on non-serializable types
 * @param {boolean} [options.detectEnvVars=true] - Detect environment variables
 * @returns {PropSerializationResult} Validation result
 *
 * @example
 * const result = validatePropSerialization(props, 'MyComponent');
 * if (!result.valid) {
 *   console.error('Non-serializable props:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Env vars detected:', result.warnings);
 * }
 */
export function validatePropSerialization(props, componentName, options = {}) {
  const {
    throwOnError = false,
    detectEnvVars = true
  } = options;

  const errors = [];
  const warnings = [];

  // 1. Check for non-serializable types
  const serializableCheck = detectNonSerializable(props, 'props');
  if (!serializableCheck.valid) {
    errors.push(...serializableCheck.errors);

    // Log errors
    log.error(
      `PSC: Non-serializable props detected in '${componentName}':`,
      serializableCheck.errors.map(err => `${err.path}: ${err.type} (${err.message})`)
    );

    if (throwOnError) {
      const firstError = serializableCheck.errors[0];

      // Create user-friendly error message
      let errorMessage = `PSC: Non-serializable prop at '${firstError.path}' for Client Component '${componentName}'`;

      // Add specific message based on type
      if (firstError.type === 'function') {
        errorMessage += ': Function props not allowed';
      } else {
        errorMessage += `: ${firstError.message}`;
      }

      throw new RuntimeError(
        errorMessage,
        {
          code: 'PSC_NON_SERIALIZABLE',
          context: `Type: ${firstError.type}`,
          suggestion: firstError.className
            ? `Cannot serialize ${firstError.className} instances. Pass plain objects instead.`
            : `Cannot serialize ${firstError.type}. ${
                firstError.type === 'function'
                  ? 'Use Server Actions instead of inline functions.'
                  : firstError.type === 'circular'
                    ? 'Remove circular references from props.'
                    : 'Ensure all props are JSON-serializable (strings, numbers, booleans, plain objects, arrays).'
              }`,
          details: serializableCheck.errors
        }
      );
    }
  }

  // 2. Check for environment variable references
  if (detectEnvVars) {
    const envVarCheck = detectEnvironmentVariables(props, 'props');
    if (envVarCheck.detected) {
      warnings.push(...envVarCheck.warnings);

      // Log warnings
      log.warn(
        `PSC: Environment variable(s) detected in props for '${componentName}':`,
        envVarCheck.warnings.map(w => `${w.path}: ${w.pattern} (${w.platform})`)
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitized: props  // No sanitization for serialization validation
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  detectNonSerializable,
  detectEnvironmentVariables,
  validatePropSerialization,
  FORBIDDEN_TYPES,
  FORBIDDEN_CLASSES,
  ENV_PATTERNS
};
