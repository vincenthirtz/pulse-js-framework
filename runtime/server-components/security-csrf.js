/**
 * Pulse Server Components - CSRF Protection
 *
 * Cryptographically secure CSRF token generation and validation using HMAC-SHA256.
 * Provides zero-dependency, edge-runtime compatible protection against cross-site
 * request forgery attacks on Server Actions.
 *
 * Security Properties:
 * - 128-bit random entropy per token
 * - HMAC-SHA256 signatures (cryptographically secure)
 * - Time-limited tokens (default: 1 hour)
 * - Constant-time comparison (prevents timing attacks)
 * - Automatic cleanup of expired tokens
 * - Optional token rotation on use
 *
 * Token Format: <timestamp>.<random-bytes>.<hmac-signature>
 * Example: 1676400000000.a1b2c3d4e5f6.abc123def456
 *
 * @module pulse-js-framework/runtime/server-components/security-csrf
 */

// ============================================================================
// Crypto Utilities (Node.js and Edge Runtime Compatible)
// ============================================================================

/**
 * Get crypto module (Node.js crypto or Web Crypto API)
 * @returns {Object} Crypto utilities
 */
async function getCrypto() {
  // Check for Web Crypto API (edge runtimes: Cloudflare Workers, Deno Deploy)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return {
      randomBytes: (size) => {
        const arr = new Uint8Array(size);
        globalThis.crypto.getRandomValues(arr);
        // Convert to Buffer-like object
        return {
          toString: (encoding) => {
            if (encoding === 'hex') {
              return Array.from(arr)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            }
            return arr;
          }
        };
      },
      createHmac: async (algorithm, secret) => {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);

        const key = await globalThis.crypto.subtle.importKey(
          'raw',
          keyData,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );

        return {
          update: (data) => {
            const dataBytes = encoder.encode(data);
            return {
              digest: async (encoding) => {
                const signature = await globalThis.crypto.subtle.sign('HMAC', key, dataBytes);
                if (encoding === 'hex') {
                  return Array.from(new Uint8Array(signature))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                }
                return signature;
              }
            };
          }
        };
      },
      timingSafeEqual: (a, b) => {
        // Constant-time string comparison for edge runtime
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      }
    };
  } else {
    // Node.js crypto module
    const crypto = await import('crypto');
    return {
      randomBytes: crypto.randomBytes,
      createHmac: (algorithm, secret) => {
        const hmac = crypto.createHmac(algorithm, secret);
        return {
          update: (data) => {
            hmac.update(data);
            return {
              digest: (encoding) => hmac.digest(encoding)
            };
          }
        };
      },
      timingSafeEqual: (a, b) => {
        // String-safe constant-time comparison for Node.js
        if (a.length !== b.length) return false;

        // Use Node.js crypto.timingSafeEqual if available
        if (crypto.timingSafeEqual) {
          try {
            const bufA = Buffer.from(a, 'utf8');
            const bufB = Buffer.from(b, 'utf8');
            return crypto.timingSafeEqual(bufA, bufB);
          } catch (e) {
            // Fallback if buffer creation fails
          }
        }

        // Manual constant-time comparison for strings
        let result = 0;
        for (let i = 0; i < a.length; i++) {
          result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
      }
    };
  }
}

// Cache crypto instance
let cryptoInstance = null;

async function getCryptoInstance() {
  if (!cryptoInstance) {
    cryptoInstance = await getCrypto();
  }
  return cryptoInstance;
}

// ============================================================================
// CSRF Token Store
// ============================================================================

/**
 * CSRF Token Store - In-memory storage with automatic cleanup
 *
 * Stores generated tokens and their metadata for validation.
 * Automatically cleans up expired tokens to prevent memory leaks.
 *
 * @class CSRFTokenStore
 */
export class CSRFTokenStore {
  #tokens = new Map(); // token → { timestamp, used }
  #secretKey = null;
  #cleanupInterval = null;
  #options;

  /**
   * @param {Object} [options] - Store options
   * @param {string} [options.secret] - HMAC secret key (auto-generated if not provided)
   * @param {number} [options.expiresIn=3600000] - Token expiration time in ms (default: 1 hour)
   * @param {number} [options.cleanupInterval=600000] - Cleanup interval in ms (default: 10 minutes)
   * @param {number} [options.maxTokens=10000] - Maximum stored tokens before cleanup
   */
  constructor(options = {}) {
    this.#options = {
      expiresIn: options.expiresIn || 3600000,      // 1 hour
      cleanupInterval: options.cleanupInterval || 600000, // 10 minutes
      maxTokens: options.maxTokens || 10000
    };

    // Generate or use provided HMAC secret (32 bytes = 256 bits)
    this.#secretKey = options.secret || this.#generateSecret();

    // Start automatic cleanup
    this.#startCleanup();
  }

  /**
   * Generate cryptographically secure HMAC secret
   * @private
   * @returns {string} Hex-encoded secret key
   */
  #generateSecret() {
    // Use synchronous random if available, otherwise will be async on first use
    try {
      if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
    } catch (e) {
      // Fall through to async generation on first token generation
    }

    // Will be generated on first use if not available synchronously
    return null;
  }

  /**
   * Generate CSRF token
   *
   * Token format: <timestamp>.<random-bytes>.<hmac-signature>
   *
   * @param {Object} [options] - Generation options
   * @param {number} [options.expiresIn] - Override default expiration
   * @returns {Promise<string>} CSRF token
   */
  async generate(options = {}) {
    const crypto = await getCryptoInstance();

    // Generate secret on first use if needed
    if (!this.#secretKey) {
      const bytes = crypto.randomBytes(32);
      this.#secretKey = bytes.toString('hex');
    }

    const timestamp = Date.now();

    // Generate random bytes (16 bytes = 128 bits)
    const randomBytes = crypto.randomBytes(16);
    const random = randomBytes.toString('hex');

    // Create HMAC signature
    const data = `${timestamp}.${random}`;
    const hmac = await crypto.createHmac('sha256', this.#secretKey);
    const signature = await hmac.update(data).digest('hex');

    const token = `${data}.${signature}`;

    // Store token metadata
    this.#tokens.set(token, {
      timestamp,
      used: false,
      expiresIn: options.expiresIn || this.#options.expiresIn
    });

    // Trigger cleanup if max tokens exceeded
    if (this.#tokens.size > this.#options.maxTokens) {
      this.cleanup();
    }

    return token;
  }

  /**
   * Validate CSRF token
   *
   * Performs comprehensive validation in constant-time to prevent timing attacks:
   * 1. Format check (3 parts separated by dots)
   * 2. Expiration check
   * 3. HMAC signature verification (constant-time comparison)
   * 4. Token existence check
   * 5. Single-use check (if rotateOnUse enabled)
   *
   * SECURITY: All validation paths take the same time to prevent timing attacks
   * that could leak token validity information.
   *
   * @param {string} token - Token to validate
   * @param {Object} [options] - Validation options
   * @param {number} [options.expiresIn] - Override default expiration
   * @param {boolean} [options.rotateOnUse=false] - Enforce single-use tokens
   * @returns {Promise<Object>} Validation result { valid: boolean, reason?: string, expired?: boolean }
   */
  async validate(token, options = {}) {
    const crypto = await getCryptoInstance();

    // Always perform full validation (constant-time - don't short-circuit)
    let valid = true;
    let reason = null;
    let expired = false;

    // Validation checks (always run all, don't early return)
    const isString = token && typeof token === 'string';
    const parts = isString ? token.split('.') : ['', '', ''];
    const hasThreeParts = parts.length === 3;

    const timestampStr = parts[0] || '';
    const random = parts[1] || '';
    const providedSignature = parts[2] || '';

    const timestamp = parseInt(timestampStr, 10);
    const isTimestampValid = !isNaN(timestamp) && timestamp > 0;

    // Check if token exists in store (always check, even if format invalid)
    const stored = this.#tokens.get(token || '');
    const expiresIn = options.expiresIn || stored?.expiresIn || this.#options.expiresIn;

    // Check expiration (always compute, even if invalid)
    const now = Date.now();
    const age = isTimestampValid ? (now - timestamp) : Infinity;
    const isExpired = age > expiresIn;

    // Always compute HMAC (even if earlier checks failed - constant time)
    const data = `${timestampStr}.${random}`;
    const hmac = await crypto.createHmac('sha256', this.#secretKey);
    const digest = await hmac.update(data);
    const expectedSignature = await digest.digest('hex');

    // Constant-time comparison (always perform)
    const signaturesMatch = crypto.timingSafeEqual(expectedSignature, providedSignature);

    // Check single-use (always check, even if other validations failed)
    const alreadyUsed = options.rotateOnUse && stored?.used;

    // Determine result (after all checks - constant time)
    if (!isString) {
      valid = false;
      reason = 'MISSING_TOKEN';
    } else if (!hasThreeParts) {
      valid = false;
      reason = 'INVALID_FORMAT';
    } else if (!isTimestampValid) {
      valid = false;
      reason = 'INVALID_FORMAT';
    } else if (isExpired) {
      valid = false;
      reason = 'EXPIRED';
      expired = true;
      // Remove expired token
      if (stored) {
        this.#tokens.delete(token);
      }
    } else if (!signaturesMatch) {
      valid = false;
      reason = 'INVALID_SIGNATURE';
    } else if (!stored) {
      valid = false;
      reason = 'UNKNOWN_TOKEN';
    } else if (alreadyUsed) {
      valid = false;
      reason = 'TOKEN_ALREADY_USED';
    }

    // Mark as used (only if valid and stored)
    if (valid && stored) {
      stored.used = true;
    }

    return { valid, reason, expired };
  }

  /**
   * Invalidate a specific token
   *
   * @param {string} token - Token to invalidate
   */
  invalidate(token) {
    this.#tokens.delete(token);
  }

  /**
   * Cleanup expired tokens
   *
   * Removes tokens older than their expiration time.
   * Called automatically on interval, but can be called manually.
   *
   * @returns {number} Number of tokens removed
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [token, { timestamp, expiresIn }] of this.#tokens.entries()) {
      if (now - timestamp > expiresIn) {
        this.#tokens.delete(token);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear all tokens (for testing)
   */
  clear() {
    this.#tokens.clear();
  }

  /**
   * Get token count
   * @returns {number} Number of stored tokens
   */
  size() {
    return this.#tokens.size;
  }

  /**
   * Start automatic cleanup interval
   * @private
   */
  #startCleanup() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval);
    }

    this.#cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.#options.cleanupInterval);

    // Don't prevent process from exiting
    if (this.#cleanupInterval.unref) {
      this.#cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup (for cleanup on shutdown)
   */
  dispose() {
    if (this.#cleanupInterval) {
      clearInterval(this.#cleanupInterval);
      this.#cleanupInterval = null;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

// Global store for convenience functions (shared across generate/validate calls)
let convenienceStore = null;
let convenienceSecret = null;

/**
 * Generate CSRF token
 *
 * Note: Uses a shared global store for the given secret. This allows
 * validation of tokens generated with this function.
 *
 * @param {string} secret - HMAC secret key (32+ bytes recommended)
 * @param {Object} [options] - Generation options
 * @param {number} [options.expiresIn=3600000] - Token expiration in ms
 * @returns {Promise<string>} CSRF token
 */
export async function generateCSRFToken(secret, options = {}) {
  // Create or reuse store for this secret
  if (!convenienceStore || convenienceSecret !== secret) {
    if (convenienceStore) {
      convenienceStore.dispose();
    }
    convenienceStore = new CSRFTokenStore({ secret, ...options });
    convenienceSecret = secret;
  }

  return convenienceStore.generate(options);
}

/**
 * Validate CSRF token
 *
 * Note: Uses a shared global store. Can validate tokens generated with
 * generateCSRFToken() if the same secret is used.
 *
 * @param {string} token - Token to validate
 * @param {string} secret - HMAC secret key
 * @param {Object} [options] - Validation options
 * @param {number} [options.expiresIn=3600000] - Token expiration in ms
 * @returns {Promise<Object>} Validation result { valid: boolean, reason?: string }
 */
export async function validateCSRFToken(token, secret, options = {}) {
  // Create or reuse store for this secret
  if (!convenienceStore || convenienceSecret !== secret) {
    if (convenienceStore) {
      convenienceStore.dispose();
    }
    convenienceStore = new CSRFTokenStore({ secret, ...options });
    convenienceSecret = secret;
  }

  return convenienceStore.validate(token, options);
}

// ============================================================================
// CSRF Middleware Factory
// ============================================================================

/**
 * Create CSRF middleware for Server Actions
 *
 * Validates CSRF tokens from incoming requests and optionally rotates them.
 *
 * @param {Object} options - Middleware options
 * @param {string} [options.secret] - HMAC secret (auto-generated if not provided)
 * @param {CSRFTokenStore} [options.store] - Custom token store
 * @param {boolean} [options.enabled=true] - Enable/disable CSRF validation
 * @param {number} [options.expiresIn=3600000] - Token expiration in ms
 * @param {boolean} [options.rotateOnUse=false] - Generate new token after validation
 * @param {string} [options.headerName='x-csrf-token'] - Request header name
 * @param {string} [options.cookieName='csrf-token'] - Cookie name for double-submit
 * @returns {Function} Middleware function
 *
 * @example
 * // Basic usage
 * const csrfMiddleware = createCSRFMiddleware({
 *   secret: process.env.CSRF_SECRET
 * });
 *
 * // With token rotation
 * const csrfMiddleware = createCSRFMiddleware({
 *   secret: process.env.CSRF_SECRET,
 *   rotateOnUse: true
 * });
 *
 * // Custom store for multi-server deployments
 * const store = new CSRFTokenStore({ secret: 'shared-secret' });
 * const csrfMiddleware = createCSRFMiddleware({ store });
 */
export function createCSRFMiddleware(options = {}) {
  const {
    secret = null,
    store = null,
    enabled = true,
    expiresIn = 3600000,
    rotateOnUse = false,
    headerName = 'x-csrf-token',
    cookieName = 'csrf-token'
  } = options;

  // Use provided store or create new one
  const tokenStore = store || new CSRFTokenStore({ secret, expiresIn });

  return async (req, res, next) => {
    // Skip if disabled
    if (!enabled) {
      return next ? next() : { valid: true };
    }

    // Extract token from header
    const token = req.headers?.[headerName] || req.get?.(headerName);

    // Validate token
    const validation = await tokenStore.validate(token, {
      expiresIn,
      rotateOnUse
    });

    if (!validation.valid) {
      // CSRF validation failed
      const error = {
        error: 'CSRF validation failed',
        reason: validation.reason,
        code: 'PSC_CSRF_INVALID'
      };

      if (res) {
        // Express/Fastify/Hono response
        return res.status?.(403).json(error) || res.json?.(error, 403);
      } else {
        // Return error object for manual handling
        return { valid: false, ...error };
      }
    }

    // Rotate token if configured
    if (rotateOnUse) {
      const newToken = await tokenStore.generate({ expiresIn });

      // Set new token in response header
      if (res) {
        res.setHeader?.('X-New-CSRF-Token', newToken);
        res.set?.('X-New-CSRF-Token', newToken);

        // Update cookie if using double-submit pattern
        res.cookie?.(cookieName, newToken, {
          httpOnly: false,  // Client needs to read it
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: expiresIn
        });
      }
    }

    // Continue to next middleware or return success
    return next ? next() : { valid: true };
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  CSRFTokenStore,
  generateCSRFToken,
  validateCSRFToken,
  createCSRFMiddleware
};
