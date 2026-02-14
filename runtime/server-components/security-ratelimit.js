/**
 * Token Bucket Rate Limiter for Server Actions
 *
 * Provides flexible rate limiting with multiple strategies:
 * - Per-action rate limiting (max calls per action)
 * - Per-user rate limiting (max calls per user/IP)
 * - Global rate limiting (max calls across all actions)
 *
 * Uses token bucket algorithm for smooth rate limiting with O(1) complexity.
 * Supports distributed systems via pluggable storage backends (Memory, Redis).
 *
 * @module pulse-js-framework/runtime/server-components/security-ratelimit
 */

import { createMutex } from './utils/mutex.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum time difference to prevent overflow (30 days in seconds)
 */
const MAX_TIME_DIFF = 86400 * 30;

/**
 * Maximum token count to prevent overflow
 */
const MAX_TOKENS = 1000000;

// ============================================================================
// Token Bucket Implementation
// ============================================================================

/**
 * Token bucket for rate limiting with constant refill rate.
 *
 * The token bucket algorithm:
 * 1. Bucket starts with max tokens
 * 2. Each request consumes tokens
 * 3. Tokens refill at constant rate over time
 * 4. Request allowed if enough tokens available
 *
 * SECURITY: Uses mutex lock to prevent race conditions in concurrent environments.
 * Includes overflow protection for time calculations and token counts.
 *
 * Time complexity: O(1) for all operations
 * Space complexity: O(1) per bucket
 */
class TokenBucket {
  #tokens;
  #maxTokens;
  #refillRate;
  #lastRefill;
  #mutex;

  /**
   * Create a token bucket
   * @param {number} maxRequests - Maximum tokens in bucket
   * @param {number} windowMs - Time window in milliseconds
   * @param {number} [refillRate] - Tokens to refill per second (default: maxRequests / (windowMs / 1000))
   */
  constructor(maxRequests, windowMs, refillRate = null) {
    this.#maxTokens = maxRequests;
    this.#tokens = maxRequests; // Start with full bucket
    this.#refillRate = refillRate || (maxRequests / (windowMs / 1000));
    this.#lastRefill = Date.now();
    this.#mutex = createMutex();
  }

  /**
   * Try to consume tokens from the bucket (async, thread-safe)
   * @param {number} count - Number of tokens to consume
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async consume(count = 1) {
    return await this.#mutex.lock(() => {
      const now = Date.now();
      this.#refill(now);

      if (this.#tokens >= count) {
        this.#tokens -= count;
        return {
          allowed: true,
          remaining: Math.floor(this.#tokens),
          resetAt: now + ((this.#maxTokens - this.#tokens) / this.#refillRate) * 1000
        };
      }

      // Rate limited - calculate when enough tokens will be available
      const tokensNeeded = count - this.#tokens;
      const retryAfter = Math.ceil((tokensNeeded / this.#refillRate) * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: now + retryAfter
      };
    });
  }

  /**
   * Refill tokens based on time elapsed with overflow protection
   * @param {number} now - Current timestamp
   * @private
   */
  #refill(now) {
    const timePassed = (now - this.#lastRefill) / 1000;

    // SECURITY: Prevent overflow in time calculations (max 30 days)
    const safeTimePassed = Math.min(timePassed, MAX_TIME_DIFF);

    // Calculate tokens to add with overflow protection
    const tokensToAdd = safeTimePassed * this.#refillRate;
    const safeTokensToAdd = Math.min(tokensToAdd, MAX_TOKENS);

    this.#tokens = Math.min(this.#maxTokens, this.#tokens + safeTokensToAdd);
    this.#lastRefill = now;
  }

  /**
   * Reset the bucket to full capacity
   */
  reset() {
    this.#tokens = this.#maxTokens;
    this.#lastRefill = Date.now();
  }

  /**
   * Serialize bucket state for storage
   * @returns {Object}
   */
  toJSON() {
    return {
      tokens: this.#tokens,
      maxTokens: this.#maxTokens,
      refillRate: this.#refillRate,
      lastRefill: this.#lastRefill
    };
  }

  /**
   * Restore bucket from serialized state
   * @param {Object} state - Serialized bucket state
   * @returns {TokenBucket}
   */
  static fromJSON(state) {
    const bucket = new TokenBucket(state.maxTokens, 1000, state.refillRate);
    bucket.#tokens = state.tokens;
    bucket.#lastRefill = state.lastRefill;
    bucket.#maxTokens = state.maxTokens;
    bucket.#refillRate = state.refillRate;
    return bucket;
  }
}

// ============================================================================
// Rate Limit Store Interface
// ============================================================================

/**
 * Abstract rate limit storage interface.
 * Implementations must provide get/set/delete/clear methods.
 */
export class RateLimitStore {
  /**
   * Get value for key
   * @param {string} key - Storage key
   * @returns {Promise<any>} Value or null
   */
  async get(key) {
    throw new Error('RateLimitStore.get() must be implemented');
  }

  /**
   * Set value for key with optional TTL
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    throw new Error('RateLimitStore.set() must be implemented');
  }

  /**
   * Delete key
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('RateLimitStore.delete() must be implemented');
  }

  /**
   * Clear all keys
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('RateLimitStore.clear() must be implemented');
  }
}

// ============================================================================
// In-Memory Store
// ============================================================================

/**
 * In-memory rate limit store with automatic TTL cleanup.
 * Suitable for single-server deployments.
 *
 * Features:
 * - Automatic expiration cleanup
 * - Memory efficient (periodic cleanup)
 * - O(1) get/set operations
 */
export class MemoryRateLimitStore extends RateLimitStore {
  #store;
  #cleanupInterval;
  #cleanupTimer;

  /**
   * Create in-memory store
   * @param {Object} [options] - Store options
   * @param {number} [options.cleanupInterval=60000] - Cleanup interval in ms (default: 1 minute)
   */
  constructor(options = {}) {
    super();
    this.#store = new Map(); // key → { value, expiresAt }
    this.#cleanupInterval = options.cleanupInterval || 60000;
    this.#startCleanup();
  }

  /**
   * Get value for key
   * @param {string} key - Storage key
   * @returns {Promise<any>} Value or null
   */
  async get(key) {
    const entry = this.#store.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value for key with optional TTL
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    const entry = {
      value,
      expiresAt: ttl ? Date.now() + ttl : null
    };

    this.#store.set(key, entry);
  }

  /**
   * Delete key
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    this.#store.delete(key);
  }

  /**
   * Clear all keys
   * @returns {Promise<void>}
   */
  async clear() {
    this.#store.clear();
  }

  /**
   * Start automatic cleanup timer
   * @private
   */
  #startCleanup() {
    this.#cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.#store.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.#store.delete(key);
        }
      }
    }, this.#cleanupInterval);

    // Don't keep process alive
    if (this.#cleanupTimer.unref) {
      this.#cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer and clear all data
   */
  dispose() {
    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
      this.#cleanupTimer = null;
    }
    this.#store.clear();
  }

  /**
   * Get current store size
   * @returns {number}
   */
  get size() {
    return this.#store.size;
  }
}

// ============================================================================
// Redis Store
// ============================================================================

/**
 * Sanitize Redis key to prevent injection attacks
 *
 * Only allows alphanumeric characters, dash, underscore, and colon.
 * This prevents Redis command injection via malicious keys.
 *
 * @param {string} key - Unsanitized key
 * @returns {string} Sanitized key safe for Redis
 * @private
 */
function sanitizeRedisKey(key) {
  // Only allow alphanumeric, dash, underscore, colon
  return String(key).replace(/[^a-zA-Z0-9:_-]/g, '_');
}

/**
 * Redis-backed rate limit store for distributed systems.
 * Supports multi-server deployments with shared rate limits.
 *
 * Requires a Redis client instance (ioredis, node-redis, etc.)
 *
 * Features:
 * - Distributed rate limiting
 * - Automatic TTL expiration
 * - O(1) operations (Redis)
 * - Redis injection protection (key sanitization)
 *
 * @example
 * import { createClient } from 'redis';
 * const redisClient = createClient({ url: 'redis://localhost:6379' });
 * await redisClient.connect();
 *
 * const store = new RedisRateLimitStore(redisClient, {
 *   prefix: 'myapp:ratelimit:'
 * });
 */
export class RedisRateLimitStore extends RateLimitStore {
  #client;
  #prefix;

  /**
   * Create Redis store
   * @param {Object} redisClient - Redis client instance
   * @param {Object} [options] - Store options
   * @param {string} [options.prefix='pulse:ratelimit:'] - Key prefix
   */
  constructor(redisClient, options = {}) {
    super();

    if (!redisClient) {
      throw new Error('RedisRateLimitStore requires a Redis client instance');
    }

    this.#client = redisClient;
    this.#prefix = sanitizeRedisKey(options.prefix || 'pulse:ratelimit:');
  }

  /**
   * Get value for key
   * @param {string} key - Storage key
   * @returns {Promise<any>} Value or null
   */
  async get(key) {
    const safeKey = sanitizeRedisKey(key);
    const data = await this.#client.get(`${this.#prefix}${safeKey}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set value for key with optional TTL
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {number} [ttl] - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl) {
    const safeKey = sanitizeRedisKey(key);
    const serialized = JSON.stringify(value);
    const redisKey = `${this.#prefix}${safeKey}`;

    if (ttl) {
      // Redis expects TTL in seconds
      await this.#client.setEx(redisKey, Math.ceil(ttl / 1000), serialized);
    } else {
      await this.#client.set(redisKey, serialized);
    }
  }

  /**
   * Delete key
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async delete(key) {
    const safeKey = sanitizeRedisKey(key);
    await this.#client.del(`${this.#prefix}${safeKey}`);
  }

  /**
   * Clear all keys with prefix
   * @returns {Promise<void>}
   */
  async clear() {
    const keys = await this.#client.keys(`${this.#prefix}*`);
    if (keys.length > 0) {
      await this.#client.del(...keys);
    }
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Multi-strategy rate limiter for Server Actions.
 *
 * Supports:
 * - Per-action limits (different limits per action)
 * - Per-user limits (by IP, user ID, or custom identifier)
 * - Global limits (across all actions)
 * - Trusted IP bypass
 *
 * @example
 * const limiter = new RateLimiter({
 *   perAction: {
 *     'createUser': { maxRequests: 5, windowMs: 60000 },
 *     'default': { maxRequests: 20, windowMs: 60000 }
 *   },
 *   perUser: {
 *     maxRequests: 100,
 *     windowMs: 60000
 *   },
 *   global: {
 *     maxRequests: 10000,
 *     windowMs: 60000
 *   },
 *   trustedIPs: ['127.0.0.1', '::1']
 * });
 */
export class RateLimiter {
  #store;
  #perActionLimits;
  #perUserLimit;
  #globalLimit;
  #identify;
  #trustedIPs;
  #buckets; // In-memory bucket cache
  #bucketLocks; // Mutex locks per bucket key

  /**
   * Create rate limiter
   * @param {Object} [options] - Limiter options
   * @param {Object} [options.perAction] - Per-action limits
   * @param {Object} [options.perUser] - Per-user limits
   * @param {Object} [options.global] - Global limits
   * @param {RateLimitStore} [options.store] - Storage backend
   * @param {Function} [options.identify] - User identifier function
   * @param {string[]} [options.trustedIPs] - Bypass rate limits for these IPs
   */
  constructor(options = {}) {
    this.#store = options.store || new MemoryRateLimitStore();
    this.#perActionLimits = options.perAction || {};
    this.#perUserLimit = options.perUser || null;
    this.#globalLimit = options.global || null;
    this.#identify = options.identify || ((ctx) => ctx.ip || 'anonymous');
    this.#trustedIPs = new Set(options.trustedIPs || []);
    this.#buckets = new Map(); // key → TokenBucket
    this.#bucketLocks = new Map(); // key → Mutex
  }

  /**
   * Check if request is allowed
   * @param {Object} context - Request context
   * @param {string} [context.actionId] - Server Action ID
   * @param {string} [context.ip] - Client IP address
   * @param {string} [context.userId] - User ID
   * @param {Object} [context.headers] - Request headers
   * @returns {Promise<{allowed: boolean, reason?: string, retryAfter?: number, remaining?: number, resetAt?: number, limit?: number}>}
   */
  async check(context) {
    const { actionId, ip } = context;

    // Bypass for trusted IPs
    if (ip && this.#trustedIPs.has(ip)) {
      return { allowed: true };
    }

    // Check global limit first (broadest scope)
    let globalResult = null;
    if (this.#globalLimit) {
      globalResult = await this.#checkBucket('global', this.#globalLimit);
      if (!globalResult.allowed) {
        return {
          allowed: false,
          reason: 'Global rate limit exceeded',
          retryAfter: globalResult.retryAfter,
          remaining: 0,
          resetAt: globalResult.resetAt,
          limit: this.#globalLimit.maxRequests
        };
      }
    }

    // Check per-user limit
    if (this.#perUserLimit) {
      const userId = this.#identify(context);
      const userResult = await this.#checkBucket(`user:${userId}`, this.#perUserLimit);
      if (!userResult.allowed) {
        return {
          allowed: false,
          reason: 'User rate limit exceeded',
          retryAfter: userResult.retryAfter,
          remaining: 0,
          resetAt: userResult.resetAt,
          limit: this.#perUserLimit.maxRequests
        };
      }
    }

    // Check per-action limit
    if (actionId && this.#perActionLimits) {
      const actionLimit = this.#perActionLimits[actionId] || this.#perActionLimits.default;
      if (actionLimit) {
        const userId = this.#identify(context);
        const actionResult = await this.#checkBucket(`action:${actionId}:${userId}`, actionLimit);
        if (!actionResult.allowed) {
          return {
            allowed: false,
            reason: `Action rate limit exceeded: ${actionId}`,
            retryAfter: actionResult.retryAfter,
            remaining: 0,
            resetAt: actionResult.resetAt,
            limit: actionLimit.maxRequests
          };
        }

        // Return success with remaining tokens for most specific limit
        return {
          allowed: true,
          remaining: actionResult.remaining,
          resetAt: actionResult.resetAt,
          limit: actionLimit.maxRequests
        };
      }
    }

    // All checks passed - return info from most specific limit that was checked
    if (globalResult) {
      return {
        allowed: true,
        remaining: globalResult.remaining,
        resetAt: globalResult.resetAt,
        limit: this.#globalLimit.maxRequests
      };
    }

    return { allowed: true };
  }

  /**
   * Check a specific bucket (thread-safe with per-bucket mutex)
   * @param {string} key - Bucket key
   * @param {Object} config - Limit configuration
   * @returns {Promise<{allowed: boolean, remaining?: number, resetAt?: number, retryAfter?: number}>}
   * @private
   */
  async #checkBucket(key, config) {
    // Get or create mutex for this bucket key (double-checked locking pattern)
    // This ensures we never create multiple mutexes for the same key
    let lock = this.#bucketLocks.get(key);
    if (!lock) {
      lock = createMutex();
      this.#bucketLocks.set(key, lock);
    }

    // CRITICAL: Lock this bucket for the entire check-consume-save cycle
    // This prevents race conditions where multiple concurrent requests
    // read the same bucket state before any writes complete
    return await lock.lock(async () => {
      // Try to get bucket from memory cache
      let bucket = this.#buckets.get(key);

      if (!bucket) {
        // Try to restore from storage
        const stored = await this.#store.get(key);
        if (stored) {
          bucket = TokenBucket.fromJSON(stored);
        } else {
          // Create new bucket
          bucket = new TokenBucket(config.maxRequests, config.windowMs, config.refillRate);
        }
        this.#buckets.set(key, bucket);
      }

      // Try to consume token (bucket has its own mutex, but we already have outer lock)
      const result = await bucket.consume(1);

      // Save updated bucket to storage
      await this.#store.set(key, bucket.toJSON(), config.windowMs * 2);

      if (result.allowed) {
        return {
          allowed: true,
          remaining: result.remaining,
          resetAt: result.resetAt
        };
      } else {
        return {
          allowed: false,
          retryAfter: result.resetAt - Date.now(),
          resetAt: result.resetAt
        };
      }
    });
  }

  /**
   * Reset limits for a specific key
   * @param {string} key - Bucket key (e.g., 'user:192.168.1.1', 'action:createUser:user123')
   * @returns {Promise<void>}
   */
  async reset(key) {
    this.#buckets.delete(key);
    await this.#store.delete(key);
  }

  /**
   * Clear all limits
   * @returns {Promise<void>}
   */
  async clear() {
    this.#buckets.clear();
    await this.#store.clear();
  }

  /**
   * Get statistics about current rate limits
   * @returns {{activeBuckets: number, storeSize: number}}
   */
  getStats() {
    return {
      activeBuckets: this.#buckets.size,
      storeSize: this.#store.size || 0
    };
  }

  /**
   * Dispose limiter and cleanup resources
   */
  dispose() {
    this.#buckets.clear();
    if (this.#store.dispose) {
      this.#store.dispose();
    }
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create rate limiting middleware for Server Actions
 *
 * @param {Object} [options] - Rate limiter options (see RateLimiter constructor)
 * @returns {Function} Middleware function
 *
 * @example
 * // Express/Connect style
 * const rateLimitMiddleware = createRateLimitMiddleware({
 *   perAction: {
 *     'createUser': { maxRequests: 5, windowMs: 60000 }
 *   },
 *   perUser: { maxRequests: 100, windowMs: 60000 }
 * });
 *
 * // Returns function that accepts context and returns result
 * const result = rateLimitMiddleware({ actionId: 'createUser', ip: '192.168.1.1' });
 * if (!result.allowed) {
 *   // Handle rate limit
 * }
 */
export function createRateLimitMiddleware(options = {}) {
  const limiter = new RateLimiter(options);

  return async (context) => {
    return await limiter.check(context);
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  RateLimiter,
  RateLimitStore,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  createRateLimitMiddleware
};
