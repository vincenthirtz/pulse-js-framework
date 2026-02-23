/**
 * Pulse Server Components - Security Validation
 *
 * Comprehensive security validation for props passed from Server to Client Components.
 * Prevents secret leakage, XSS attacks, and DoS via oversized props.
 *
 * Security Layers:
 * 1. Secret Detection - Detects API keys, tokens, passwords in keys/values
 * 2. XSS Sanitization - Blocks script tags, event handlers, javascript: URLs
 * 3. Size Validation - Enforces limits to prevent DoS attacks
 *
 * @module pulse-js-framework/runtime/server-components/security
 */

import { RuntimeError } from '../errors.js';
import { loggers } from '../logger.js';
import { detectEnvironmentVariables } from './security-validation.js';

const log = loggers.dom;

// ============================================================================
// Constants - Secret Detection Patterns
// ============================================================================

/**
 * Regex patterns for detecting secrets in prop keys and values.
 * Covers common secret naming patterns and high-entropy tokens.
 */
const SECRET_PATTERNS = [
  // Generic key name patterns
  /^(api[_-]?key|apikey|api[_-]?secret|apisecret)$/i,
  /^(secret|secret[_-]?key|secretkey)$/i,
  /^(token|auth[_-]?token|authtoken|access[_-]?token|accesstoken|refresh[_-]?token|refreshtoken)$/i,
  /^(password|passwd|pwd)$/i,
  /^(private[_-]?key|privatekey|priv[_-]?key|privkey)$/i,
  /^(client[_-]?secret|clientsecret)$/i,
  /^(session[_-]?secret|sessionsecret)$/i,
  /^(encryption[_-]?key|encryptionkey)$/i,
  /^(db[_-]?password|database[_-]?password|dbpassword|databasepassword)$/i,
  /^(jwt[_-]?secret|jwtsecret)$/i,
  /^(bearer[_-]?token|bearertoken)$/i,

  // Service-specific value patterns
  /^sk_live_[A-Za-z0-9]{24,}$/,           // Stripe secret key (live)
  /^sk_test_[A-Za-z0-9]{24,}$/,           // Stripe secret key (test)
  /^rk_live_[A-Za-z0-9]{24,}$/,           // Stripe restricted key (live)
  /^rk_test_[A-Za-z0-9]{24,}$/,           // Stripe restricted key (test)
  /^ghp_[A-Za-z0-9]{36}$/,                // GitHub Personal Access Token
  /^gho_[A-Za-z0-9]{36}$/,                // GitHub OAuth Token
  /^ghs_[A-Za-z0-9]{36}$/,                // GitHub Server Token
  /^github_pat_[A-Za-z0-9_]{82}$/,        // GitHub Fine-grained PAT

  // Generic high-entropy patterns (likely secrets)
  /^[A-Za-z0-9+/]{40,}={0,2}$/,           // Base64 40+ chars (likely token)
  /^[A-Z0-9]{32,}$/,                      // All-caps alphanumeric 32+ chars
  /^[a-f0-9]{64}$/,                       // 64-char hex (SHA-256, could be secret)
  /^[a-f0-9]{128}$/,                      // 128-char hex (SHA-512)

  // PEM-encoded private keys
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /-----BEGIN ENCRYPTED PRIVATE KEY-----/
];

/**
 * XSS detection patterns for string prop values.
 */
const XSS_PATTERNS = {
  scriptTag: /<script[\s>]/i,
  eventHandler: /<[^>]+on\w+\s*=/i,
  javascriptProtocol: /javascript:/i,
  vbscriptProtocol: /vbscript:/i,
  dataHtmlProtocol: /data:text\/html/i
};

// ============================================================================
// Constants - Size Limits
// ============================================================================

/**
 * Size limits to prevent DoS attacks via oversized props.
 * These limits are generous for normal use but prevent abuse.
 */
export const PROP_SIZE_LIMITS = {
  MAX_DEPTH: 20,              // Max object nesting depth
  MAX_STRING_LENGTH: 100_000, // 100KB per string value
  MAX_ARRAY_LENGTH: 10_000,   // 10K items per array
  MAX_OBJECT_KEYS: 1_000,     // 1K keys per object
  MAX_TOTAL_SIZE: 1_000_000   // 1MB total JSON serialized size
};

// ============================================================================
// Secret Detection
// ============================================================================

/**
 * Detected secret information.
 *
 * @typedef {Object} DetectedSecret
 * @property {string} path - Path to the secret (e.g., 'props.user.apiKey')
 * @property {string} value - Truncated value preview (first 20 chars)
 * @property {string} pattern - Regex pattern that matched
 * @property {'key'|'value'} type - Whether secret was in key name or value
 */

/**
 * Scan object for potential secrets (API keys, tokens, passwords).
 *
 * Detects secrets in both property keys and values using pattern matching.
 * Returns a list of detected secrets for logging/warning purposes.
 *
 * @param {any} obj - Object to scan for secrets
 * @param {string} [path='props'] - Current path for error messages
 * @returns {DetectedSecret[]} Array of detected secrets
 *
 * @example
 * const secrets = detectSecrets({ apiKey: 'sk_live_abc123...' });
 * // [{ path: 'props.apiKey', value: 'sk_live_abc123...', pattern: '/^sk_live_/', type: 'value' }]
 */
export function detectSecrets(obj, path = 'props') {
  const detected = [];
  const seen = new WeakSet();

  function scan(value, currentPath) {
    if (value === null || value === undefined) {
      return;
    }

    const type = typeof value;

    // Check string values against value patterns
    if (type === 'string') {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(value)) {
          detected.push({
            path: currentPath,
            value: value.length > 20 ? value.substring(0, 20) + '...' : value,
            pattern: pattern.toString(),
            type: 'value'
          });
          break; // One match per value is enough
        }
      }
    }

    // Check objects and arrays recursively
    if (type === 'object') {
      // Circular reference check
      if (seen.has(value)) {
        return;
      }
      seen.add(value);

      if (Array.isArray(value)) {
        value.forEach((item, i) => scan(item, `${currentPath}[${i}]`));
      } else {
        // Check each key and value
        for (const [key, val] of Object.entries(value)) {
          // Check KEY names against patterns
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(key)) {
              detected.push({
                path: `${currentPath}.${key}`,
                value: typeof val === 'string'
                  ? (val.length > 20 ? val.substring(0, 20) + '...' : val)
                  : String(val),
                pattern: pattern.toString(),
                type: 'key'
              });
              break;
            }
          }

          // Scan value recursively
          scan(val, `${currentPath}.${key}`);
        }
      }
    }
  }

  scan(obj, path);
  return detected;
}

// ============================================================================
// XSS Sanitization
// ============================================================================

/**
 * Sanitize props for XSS attacks before serialization.
 *
 * Detects and neutralizes:
 * - Script tags (<script>)
 * - Event handlers (onclick=, onerror=, etc.)
 * - javascript: and vbscript: protocols
 * - data:text/html URLs
 *
 * Logs warnings for each detected pattern. Mutates the props object in place
 * for performance (avoids deep cloning).
 *
 * @param {any} props - Props object to sanitize
 * @param {string} componentId - Component ID for logging
 * @returns {any} Sanitized props (mutated in place)
 *
 * @example
 * const props = { html: '<script>alert("xss")</script>' };
 * sanitizePropsForXSS(props, 'MyComponent');
 * // props.html is now: '&lt;script>alert("xss")&lt;/script>'
 */
export function sanitizePropsForXSS(props, componentId) {
  const seen = new WeakSet();

  function sanitize(value, path) {
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;

    // Sanitize strings
    if (type === 'string') {
      let sanitized = value;
      let modified = false;

      // Check for script tags
      if (XSS_PATTERNS.scriptTag.test(sanitized)) {
        log.warn(`PSC: Script tag detected in prop '${path}' for '${componentId}'`);
        sanitized = sanitized.replace(/<script[\s>]/gi, '&lt;script');
        modified = true;
      }

      // Check for event handlers in HTML-like content
      if (XSS_PATTERNS.eventHandler.test(sanitized)) {
        log.warn(`PSC: Event handler detected in prop '${path}' for '${componentId}'`);
        sanitized = sanitized.replace(/on\w+\s*=/gi, 'data-blocked-event=');
        modified = true;
      }

      // Check for javascript: protocol
      if (XSS_PATTERNS.javascriptProtocol.test(sanitized)) {
        log.warn(`PSC: javascript: protocol detected in prop '${path}' for '${componentId}'`);
        sanitized = sanitized.replace(/javascript:/gi, 'blocked:');
        modified = true;
      }

      // Check for vbscript: protocol
      if (XSS_PATTERNS.vbscriptProtocol.test(sanitized)) {
        log.warn(`PSC: vbscript: protocol detected in prop '${path}' for '${componentId}'`);
        sanitized = sanitized.replace(/vbscript:/gi, 'blocked:');
        modified = true;
      }

      // Check for data:text/html (can execute scripts)
      if (XSS_PATTERNS.dataHtmlProtocol.test(sanitized)) {
        log.warn(`PSC: data:text/html protocol detected in prop '${path}' for '${componentId}'`);
        sanitized = sanitized.replace(/data:text\/html/gi, 'data:text/plain');
        modified = true;
      }

      return sanitized;
    }

    // Recursively sanitize objects and arrays
    if (type === 'object') {
      if (seen.has(value)) {
        return value; // Already processed (circular ref)
      }
      seen.add(value);

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          value[i] = sanitize(value[i], `${path}[${i}]`);
        }
      } else {
        for (const [key, val] of Object.entries(value)) {
          value[key] = sanitize(val, `${path}.${key}`);
        }
      }

      return value;
    }

    return value;
  }

  return sanitize(props, 'props');
}

// ============================================================================
// Size Validation
// ============================================================================

/**
 * Validate prop size limits to prevent DoS attacks.
 *
 * Enforces limits on:
 * - Nesting depth (max 20 levels)
 * - String length (max 100KB per string)
 * - Array length (max 10K items)
 * - Object keys (max 1K keys per object)
 * - Total JSON size (max 1MB)
 *
 * Throws RuntimeError if any limit is exceeded.
 *
 * @param {any} props - Props to validate
 * @param {string} componentId - Component ID for error messages
 * @throws {RuntimeError} If size limits exceeded
 *
 * @example
 * validatePropSizeLimits({ data: 'x'.repeat(200000) }, 'MyComponent');
 * // Throws: RuntimeError('String prop too large...')
 */
export function validatePropSizeLimits(props, componentId) {
  let totalSize = 0;
  const seen = new WeakSet();

  function check(value, path, depth) {
    // Check nesting depth
    if (depth > PROP_SIZE_LIMITS.MAX_DEPTH) {
      throw new RuntimeError(
        `PSC: Prop nesting depth exceeded ${PROP_SIZE_LIMITS.MAX_DEPTH} at '${path}'`,
        {
          code: 'PSC_PROP_DEPTH_EXCEEDED',
          context: `Component: ${componentId}`,
          suggestion: 'Flatten your data structure or split into smaller props'
        }
      );
    }

    if (value === null || value === undefined) {
      return;
    }

    const type = typeof value;

    // Check string length
    if (type === 'string') {
      totalSize += value.length;
      if (value.length > PROP_SIZE_LIMITS.MAX_STRING_LENGTH) {
        throw new RuntimeError(
          `PSC: String prop too large at '${path}' (${value.length} > ${PROP_SIZE_LIMITS.MAX_STRING_LENGTH})`,
          {
            code: 'PSC_STRING_TOO_LARGE',
            context: `Component: ${componentId}`,
            suggestion: 'Split large strings into chunks or store externally'
          }
        );
      }
    }

    // Check numbers (count toward size)
    if (type === 'number') {
      totalSize += 8; // Approximate size
    }

    // Check boolean (count toward size)
    if (type === 'boolean') {
      totalSize += 4;
    }

    // Check objects and arrays
    if (type === 'object' && value !== null) {
      if (seen.has(value)) {
        return; // Already counted (circular ref)
      }
      seen.add(value);

      if (Array.isArray(value)) {
        // Check array length
        if (value.length > PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH) {
          throw new RuntimeError(
            `PSC: Array too large at '${path}' (${value.length} > ${PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH})`,
            {
              code: 'PSC_ARRAY_TOO_LARGE',
              context: `Component: ${componentId}`,
              suggestion: 'Use pagination or split into smaller arrays'
            }
          );
        }

        // Check each item recursively
        value.forEach((item, i) => check(item, `${path}[${i}]`, depth + 1));
      } else {
        // Check object key count
        const keys = Object.keys(value);
        if (keys.length > PROP_SIZE_LIMITS.MAX_OBJECT_KEYS) {
          throw new RuntimeError(
            `PSC: Object has too many keys at '${path}' (${keys.length} > ${PROP_SIZE_LIMITS.MAX_OBJECT_KEYS})`,
            {
              code: 'PSC_OBJECT_TOO_LARGE',
              context: `Component: ${componentId}`,
              suggestion: 'Split into smaller objects or use a Map/Set'
            }
          );
        }

        // Check each property recursively
        for (const [key, val] of Object.entries(value)) {
          totalSize += key.length; // Count key names too
          check(val, `${path}.${key}`, depth + 1);
        }
      }
    }
  }

  // Check total depth and size
  check(props, 'props', 0);

  // Check total JSON size (approximate via stringification)
  // Note: Circular references are already caught by check() via WeakSet,
  // but JSON.stringify() can still throw if circular refs exist.
  // If we reach here, props should be serializable.
  try {
    const jsonSize = JSON.stringify(props).length;
    if (jsonSize > PROP_SIZE_LIMITS.MAX_TOTAL_SIZE) {
      throw new RuntimeError(
        `PSC: Total prop size too large (${jsonSize} bytes > ${PROP_SIZE_LIMITS.MAX_TOTAL_SIZE} bytes)`,
        {
          code: 'PSC_PROPS_TOO_LARGE',
          context: `Component: ${componentId}`,
          suggestion: 'Reduce prop size or fetch data on the client'
        }
      );
    }
  } catch (err) {
    // If JSON.stringify throws (e.g., circular reference), throw specific error
    if (err.message && err.message.includes('circular')) {
      throw new RuntimeError(
        `PSC: Props contain circular reference at '${componentId}'`,
        {
          code: 'PSC_CIRCULAR_PROP',
          context: 'Props must not contain circular references',
          suggestion: 'Check for circular object references in your props'
        }
      );
    }
    // Re-throw if it's our own RuntimeError (size limit exceeded)
    if (err.code && err.code.startsWith('PSC_')) {
      throw err;
    }
    // Unknown error during stringification
    throw new RuntimeError(
      `PSC: Failed to serialize props for '${componentId}'`,
      {
        code: 'PSC_SERIALIZATION_FAILED',
        context: err.message
      }
    );
  }
}

// ============================================================================
// Main Security Validator
// ============================================================================

/**
 * Security validation result.
 *
 * @typedef {Object} SecurityValidationResult
 * @property {boolean} valid - True if no blocking errors found
 * @property {DetectedSecret[]} warnings - Detected secrets (warnings, not blocking)
 * @property {Error[]} errors - Validation errors (blocking)
 * @property {any} sanitized - Sanitized props (XSS patterns removed)
 */

/**
 * Validate prop security comprehensively.
 *
 * Orchestrates all security validations:
 * 1. Secret detection (warns but doesn't block)
 * 2. XSS sanitization (sanitizes and warns)
 * 3. Size validation (throws on violation)
 * 4. Environment variable detection (warns but doesn't block) - NEW
 *
 * @param {any} props - Props to validate
 * @param {string} componentId - Component ID for logging
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.detectSecrets=true] - Enable secret detection
 * @param {boolean} [options.sanitizeXSS=true] - Enable XSS sanitization
 * @param {boolean} [options.validateSizes=true] - Enable size validation
 * @param {boolean} [options.detectEnvVars=true] - Enable environment variable detection
 * @param {boolean} [options.throwOnSecrets=false] - Throw error if secrets detected (default: warn only)
 * @returns {SecurityValidationResult} Validation result
 *
 * @example
 * const result = validatePropSecurity(props, 'MyComponent');
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Detected secrets:', result.warnings);
 * }
 * return result.sanitized;
 */
export function validatePropSecurity(props, componentId, options = {}) {
  const {
    detectSecrets: enableSecretDetection = true,
    sanitizeXSS: enableXSSSanitization = true,
    validateSizes: enableSizeValidation = true,
    detectEnvVars = true,
    throwOnSecrets = false
  } = options;

  const warnings = [];
  const errors = [];
  let sanitized = props;

  // 1. Detect secrets (warns only, doesn't modify props)
  if (enableSecretDetection) {
    try {
      const secrets = detectSecrets(props);
      if (secrets.length > 0) {
        warnings.push(...secrets);
        log.warn(
          `PSC: Detected ${secrets.length} potential secret(s) in props for '${componentId}'`,
          secrets
        );

        if (throwOnSecrets) {
          throw new RuntimeError(
            `PSC: Secrets detected in props for '${componentId}'`,
            {
              code: 'PSC_SECRETS_IN_PROPS',
              context: `Detected ${secrets.length} secret pattern(s)`,
              suggestion: 'Remove sensitive data from props or use Server Actions',
              details: secrets
            }
          );
        }
      }
    } catch (err) {
      errors.push(err);
    }
  }

  // 2. Sanitize XSS (modifies props in place)
  if (enableXSSSanitization) {
    try {
      sanitized = sanitizePropsForXSS(sanitized, componentId);
    } catch (err) {
      errors.push(err);
    }
  }

  // 3. Validate sizes (throws on violation)
  if (enableSizeValidation) {
    try {
      validatePropSizeLimits(sanitized, componentId);
    } catch (err) {
      errors.push(err);
    }
  }

  // 4. Detect environment variables (warns only, doesn't modify props) - NEW
  if (detectEnvVars) {
    try {
      const envVarResult = detectEnvironmentVariables(sanitized, 'props');

      if (envVarResult.detected) {
        // Add env var detections to warnings with a specific type
        const envVarWarnings = envVarResult.warnings.map(w => ({
          ...w,
          type: 'env-var',  // Mark as env-var warning (different from secret warning)
          severity: 'warning'
        }));
        warnings.push(...envVarWarnings);

        log.warn(
          `PSC: Environment variable(s) detected in props for '${componentId}':`,
          envVarResult.warnings.map(w => `${w.path}: ${w.pattern} (${w.platform})`)
        );
      }
    } catch (err) {
      // Don't block on env var detection errors (validation is optional)
      log.warn(`PSC: Environment variable detection failed for '${componentId}':`, err.message);
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    sanitized
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  detectSecrets,
  sanitizePropsForXSS,
  validatePropSizeLimits,
  validatePropSecurity,
  PROP_SIZE_LIMITS,
  SECRET_PATTERNS,
  XSS_PATTERNS
};
