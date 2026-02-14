/**
 * Server Actions - Server Runtime
 *
 * Server-side execution and registry for Server Actions.
 * Provides middleware for Express/Fastify/Hono and secure action execution.
 *
 * @module pulse-js-framework/runtime/server-components/actions-server
 */

import { sanitizeError, isProductionMode } from './error-sanitizer.js';
import { CSRFTokenStore } from './security-csrf.js';
import { createRateLimitMiddleware } from './security-ratelimit.js';

// ============================================================
// Server Action Registry
// ============================================================

/**
 * Server Action registry (server-side)
 * @type {Map<string, Function>}
 */
const serverActions = new Map(); // actionId → handler function

// ============================================================
// Global CSRF Token Store
// ============================================================

/**
 * Global CSRF token store (shared across all middleware instances)
 * Can be replaced with custom store for multi-server deployments
 * @type {CSRFTokenStore}
 */
let globalCSRFStore = null;

/**
 * Get or create global CSRF token store
 * @param {Object} [options] - Store options
 * @returns {CSRFTokenStore} CSRF token store
 */
function getCSRFStore(options = {}) {
  if (!globalCSRFStore) {
    globalCSRFStore = new CSRFTokenStore({
      secret: options.csrfSecret || process.env.CSRF_SECRET,
      expiresIn: options.tokenExpiry || 3600000,
      cleanupInterval: 600000 // 10 minutes
    });
  }
  return globalCSRFStore;
}

/**
 * Set custom CSRF token store (for testing or custom implementations)
 * @param {CSRFTokenStore|null} store - Custom store or null to reset
 */
export function setCSRFStore(store) {
  // Dispose old store
  if (globalCSRFStore && globalCSRFStore.dispose) {
    globalCSRFStore.dispose();
  }
  globalCSRFStore = store;
}

/**
 * Register a Server Action handler
 * @param {string} actionId - Unique action identifier
 * @param {Function} handler - Async handler function
 *
 * @example
 * registerServerAction('UserForm$createUser', async (data, context) => {
 *   const user = await db.users.create(data);
 *   return { id: user.id, name: user.name };
 * });
 */
export function registerServerAction(actionId, handler) {
  if (typeof handler !== 'function') {
    throw new Error(`Server Action handler must be a function: ${actionId}`);
  }

  serverActions.set(actionId, handler);
}

/**
 * Get registered action handler
 * @param {string} actionId - Action identifier
 * @returns {Function|null} Handler function or null
 */
export function getServerAction(actionId) {
  return serverActions.get(actionId) || null;
}

/**
 * Get all registered Server Actions
 * @returns {Map<string, Function>} Action registry
 */
export function getServerActions() {
  return new Map(serverActions);
}

/**
 * Clear all Server Actions (for testing)
 */
export function clearServerActions() {
  serverActions.clear();
}

// ============================================================
// Action Execution
// ============================================================

/**
 * Check if value contains non-serializable data (functions, symbols, etc.)
 * @param {any} value - Value to check
 * @returns {boolean} True if contains non-serializable data
 */
function hasNonSerializableData(value) {
  if (typeof value === 'function' || typeof value === 'symbol') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(item => hasNonSerializableData(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(v => hasNonSerializableData(v));
  }

  return false;
}

/**
 * Execute a Server Action
 * @param {string} actionId - Action identifier
 * @param {Array} args - Action arguments
 * @param {Object} context - Execution context (request, session, etc.)
 * @returns {Promise<any>} Action result
 *
 * @example
 * const result = await executeServerAction('createUser', [{ name: 'John' }], {
 *   req, res, session, user
 * });
 */
export async function executeServerAction(actionId, args, context = {}) {
  const handler = serverActions.get(actionId);

  if (!handler) {
    throw new Error(`Server Action not registered: ${actionId}`);
  }

  // Validate args are JSON-serializable (no functions, symbols, etc.)
  if (hasNonSerializableData(args)) {
    throw new Error('Server Action arguments must be JSON-serializable');
  }

  // Execute with timeout
  const timeout = context.timeout || 30000;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Server Action timeout')), timeout);
  });

  const result = await Promise.race([
    handler(...args, context),
    timeoutPromise
  ]);

  // Validate result is JSON-serializable (no functions, symbols, etc.)
  if (hasNonSerializableData(result)) {
    throw new Error('Server Action result must be JSON-serializable');
  }

  return result;
}

// ============================================================
// Express Middleware
// ============================================================

/**
 * Create Server Action middleware for Express
 * @param {Object} options - Middleware options
 * @param {boolean} [options.csrfValidation=true] - Enable CSRF validation
 * @param {string} [options.csrfSecret] - CSRF secret key
 * @param {CSRFTokenStore} [options.csrfStore] - Custom CSRF token store
 * @param {number} [options.tokenExpiry=3600000] - Token expiration in ms (default: 1 hour)
 * @param {boolean} [options.rotateOnUse=false] - Rotate token after validation
 * @param {string} [options.endpoint='/_actions'] - Actions endpoint
 * @param {Function} [options.onError] - Custom error handler
 * @param {Object} [options.rateLimitPerAction] - Per-action rate limits
 * @param {Object} [options.rateLimitPerUser] - Per-user rate limits
 * @param {Object} [options.rateLimitGlobal] - Global rate limits
 * @param {RateLimitStore} [options.rateLimitStore] - Rate limit storage backend
 * @param {Function} [options.rateLimitIdentify] - User identifier function
 * @param {string[]} [options.rateLimitTrustedIPs] - Bypass rate limits for these IPs
 * @returns {Function} Express middleware
 *
 * @example
 * import express from 'express';
 * import { createServerActionMiddleware } from 'pulse-js-framework/runtime/server-components';
 *
 * const app = express();
 * app.use(express.json());
 * app.use(createServerActionMiddleware({
 *   csrfValidation: true,
 *   csrfSecret: process.env.CSRF_SECRET,
 *   rotateOnUse: false,
 *   rateLimitPerAction: {
 *     'createUser': { maxRequests: 5, windowMs: 60000 },
 *     'default': { maxRequests: 20, windowMs: 60000 }
 *   },
 *   rateLimitPerUser: { maxRequests: 100, windowMs: 60000 },
 *   onError: (error, req, res) => {
 *     logger.error('Action failed:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }));
 */
export function createServerActionMiddleware(options = {}) {
  const {
    csrfValidation = true,
    csrfSecret = null,
    csrfStore = null,
    tokenExpiry = 3600000,
    rotateOnUse = false,
    endpoint = '/_actions',
    onError = null,
    rateLimitPerAction = null,
    rateLimitPerUser = null,
    rateLimitGlobal = null,
    rateLimitStore = null,
    rateLimitIdentify = null,
    rateLimitTrustedIPs = null
  } = options;

  // Use provided store or get/create global store
  const store = csrfStore || (csrfValidation ? getCSRFStore({ csrfSecret, tokenExpiry }) : null);

  // Create rate limit middleware if any rate limits configured
  const rateLimitMiddleware = (rateLimitPerAction || rateLimitPerUser || rateLimitGlobal)
    ? createRateLimitMiddleware({
        perAction: rateLimitPerAction,
        perUser: rateLimitPerUser,
        global: rateLimitGlobal,
        store: rateLimitStore,
        identify: rateLimitIdentify,
        trustedIPs: rateLimitTrustedIPs
      })
    : null;

  return async (req, res, next) => {
    // Only handle POST requests to actions endpoint
    if (req.method !== 'POST' || !req.path.startsWith(endpoint)) {
      return next();
    }

    try {
      // Enhanced CSRF validation with cryptographic tokens
      if (csrfValidation && store) {
        const token = req.headers['x-csrf-token'];

        // Validate token using HMAC-based store
        const validation = await store.validate(token, {
          expiresIn: tokenExpiry,
          rotateOnUse
        });

        if (!validation.valid) {
          return res.status(403).json({
            error: 'CSRF validation failed',
            reason: validation.reason,
            code: 'PSC_CSRF_INVALID'
          });
        }

        // Rotate token if configured
        if (rotateOnUse) {
          const newToken = await store.generate({ expiresIn: tokenExpiry });
          res.setHeader('X-New-CSRF-Token', newToken);

          // Update cookie for double-submit pattern
          res.cookie('csrf-token', newToken, {
            httpOnly: false,  // Client needs to read it
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: tokenExpiry
          });
        }
      }

      // Extract action ID and args
      const actionId = req.headers['x-pulse-action'];
      const { args } = req.body;

      if (!actionId) {
        return res.status(400).json({ error: 'Missing action ID' });
      }

      // Rate limiting check
      if (rateLimitMiddleware) {
        const rateLimitResult = await rateLimitMiddleware({
          actionId,
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userId: req.user?.id,
          headers: req.headers
        });

        if (!rateLimitResult.allowed) {
          // Set rate limit headers
          res.setHeader('Retry-After', Math.ceil(rateLimitResult.retryAfter / 1000));
          if (rateLimitResult.limit) {
            res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
          }
          if (rateLimitResult.remaining !== undefined) {
            res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
          }
          if (rateLimitResult.resetAt) {
            res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            reason: rateLimitResult.reason,
            retryAfter: rateLimitResult.retryAfter,
            code: 'PSC_RATE_LIMIT_EXCEEDED'
          });
        }

        // Set rate limit info headers for successful requests
        if (rateLimitResult.limit) {
          res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
        }
        if (rateLimitResult.remaining !== undefined) {
          res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        }
        if (rateLimitResult.resetAt) {
          res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
        }
      }

      // Execute action
      const context = {
        req,
        res,
        session: req.session,
        user: req.user
      };

      const result = await executeServerAction(actionId, args, context);

      // Send result
      res.json(result);
    } catch (error) {
      if (onError) {
        // Custom error handler - still sanitize before passing
        const sanitized = sanitizeError(error, {
          includeStack: !isProductionMode(),
          maxStackLines: 5
        });
        onError(sanitized, req, res);
      } else {
        // Default error handler - return sanitized error with backward-compatible format
        const sanitized = sanitizeError(error, {
          includeStack: !isProductionMode(),
          maxStackLines: 5
        });
        // Include both 'error' (backward compat) and 'message' fields
        res.status(500).json({
          ...sanitized,
          error: sanitized.message  // Backward compatibility
        });
      }
    }
  };
}

// ============================================================
// Fastify Plugin
// ============================================================

/**
 * Create Server Action plugin for Fastify
 * @param {Object} fastify - Fastify instance
 * @param {Object} options - Plugin options
 * @param {boolean} [options.csrfValidation=true] - Enable CSRF validation
 * @param {string} [options.csrfSecret] - CSRF secret key
 * @param {CSRFTokenStore} [options.csrfStore] - Custom CSRF token store
 * @param {number} [options.tokenExpiry=3600000] - Token expiration in ms
 * @param {boolean} [options.rotateOnUse=false] - Rotate token after validation
 * @param {string} [options.endpoint='/_actions'] - Actions endpoint
 * @param {Object} [options.rateLimitPerAction] - Per-action rate limits
 * @param {Object} [options.rateLimitPerUser] - Per-user rate limits
 * @param {Object} [options.rateLimitGlobal] - Global rate limits
 * @param {import('./security-ratelimit.js').RateLimitStore} [options.rateLimitStore] - Rate limit storage backend
 * @param {Function} [options.rateLimitIdentify] - User identifier function
 * @param {string[]} [options.rateLimitTrustedIPs] - Bypass rate limits for these IPs
 *
 * @example
 * import Fastify from 'fastify';
 * import { createFastifyActionPlugin } from 'pulse-js-framework/runtime/server-components';
 *
 * const fastify = Fastify();
 * fastify.register(createFastifyActionPlugin, {
 *   csrfValidation: true,
 *   csrfSecret: process.env.CSRF_SECRET,
 *   rotateOnUse: false,
 *   rateLimitPerAction: {
 *     'createUser': { maxRequests: 5, windowMs: 60000 }
 *   }
 * });
 */
export async function createFastifyActionPlugin(fastify, options = {}) {
  const {
    csrfValidation = true,
    csrfSecret = null,
    csrfStore = null,
    tokenExpiry = 3600000,
    rotateOnUse = false,
    endpoint = '/_actions',
    rateLimitPerAction = null,
    rateLimitPerUser = null,
    rateLimitGlobal = null,
    rateLimitStore = null,
    rateLimitIdentify = null,
    rateLimitTrustedIPs = null
  } = options;

  // Use provided store or get/create global store
  const store = csrfStore || (csrfValidation ? getCSRFStore({ csrfSecret, tokenExpiry }) : null);

  // Create rate limit middleware if any rate limits configured
  const rateLimitMiddleware = (rateLimitPerAction || rateLimitPerUser || rateLimitGlobal)
    ? createRateLimitMiddleware({
        perAction: rateLimitPerAction,
        perUser: rateLimitPerUser,
        global: rateLimitGlobal,
        store: rateLimitStore,
        identify: rateLimitIdentify,
        trustedIPs: rateLimitTrustedIPs
      })
    : null;

  fastify.post(endpoint, async (request, reply) => {
    try {
      // Enhanced CSRF validation
      if (csrfValidation && store) {
        const token = request.headers['x-csrf-token'];

        const validation = await store.validate(token, {
          expiresIn: tokenExpiry,
          rotateOnUse
        });

        if (!validation.valid) {
          return reply.code(403).send({
            error: 'CSRF validation failed',
            reason: validation.reason,
            code: 'PSC_CSRF_INVALID'
          });
        }

        // Rotate token if configured
        if (rotateOnUse) {
          const newToken = await store.generate({ expiresIn: tokenExpiry });
          reply.header('X-New-CSRF-Token', newToken);
        }
      }

      // Extract action ID and args
      const actionId = request.headers['x-pulse-action'];
      const { args } = request.body;

      if (!actionId) {
        return reply.code(400).send({ error: 'Missing action ID' });
      }

      // Rate limiting check
      if (rateLimitMiddleware) {
        const rateLimitResult = await rateLimitMiddleware({
          actionId,
          ip: request.ip,
          userId: request.user?.id,
          headers: request.headers
        });

        if (!rateLimitResult.allowed) {
          // Set rate limit headers
          reply.header('Retry-After', Math.ceil(rateLimitResult.retryAfter / 1000));
          if (rateLimitResult.limit) {
            reply.header('X-RateLimit-Limit', rateLimitResult.limit);
          }
          if (rateLimitResult.remaining !== undefined) {
            reply.header('X-RateLimit-Remaining', rateLimitResult.remaining);
          }
          if (rateLimitResult.resetAt) {
            reply.header('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
          }

          return reply.code(429).send({
            error: 'Too Many Requests',
            reason: rateLimitResult.reason,
            retryAfter: rateLimitResult.retryAfter,
            code: 'PSC_RATE_LIMIT_EXCEEDED'
          });
        }

        // Set rate limit info headers for successful requests
        if (rateLimitResult.limit) {
          reply.header('X-RateLimit-Limit', rateLimitResult.limit);
        }
        if (rateLimitResult.remaining !== undefined) {
          reply.header('X-RateLimit-Remaining', rateLimitResult.remaining);
        }
        if (rateLimitResult.resetAt) {
          reply.header('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
        }
      }

      // Execute action
      const context = {
        request,
        reply,
        session: request.session,
        user: request.user
      };

      const result = await executeServerAction(actionId, args, context);

      return result;
    } catch (error) {
      // Sanitize error before sending to client
      const sanitized = sanitizeError(error, {
        includeStack: !isProductionMode(),
        maxStackLines: 5
      });
      return reply.code(500).send(sanitized);
    }
  });
}

// ============================================================
// Hono Middleware
// ============================================================

/**
 * Create Server Action middleware for Hono
 * @param {Object} options - Middleware options
 * @param {boolean} [options.csrfValidation=true] - Enable CSRF validation
 * @param {string} [options.csrfSecret] - CSRF secret key
 * @param {CSRFTokenStore} [options.csrfStore] - Custom CSRF token store
 * @param {number} [options.tokenExpiry=3600000] - Token expiration in ms
 * @param {boolean} [options.rotateOnUse=false] - Rotate token after validation
 * @param {string} [options.endpoint='/_actions'] - Actions endpoint
 * @param {Object} [options.rateLimitPerAction] - Per-action rate limits
 * @param {Object} [options.rateLimitPerUser] - Per-user rate limits
 * @param {Object} [options.rateLimitGlobal] - Global rate limits
 * @param {import('./security-ratelimit.js').RateLimitStore} [options.rateLimitStore] - Rate limit storage backend
 * @param {Function} [options.rateLimitIdentify] - User identifier function
 * @param {string[]} [options.rateLimitTrustedIPs] - Bypass rate limits for these IPs
 * @returns {Function} Hono middleware
 *
 * @example
 * import { Hono } from 'hono';
 * import { createHonoActionMiddleware } from 'pulse-js-framework/runtime/server-components';
 *
 * const app = new Hono();
 * app.use('/_actions', createHonoActionMiddleware({
 *   csrfValidation: true,
 *   csrfSecret: process.env.CSRF_SECRET,
 *   rateLimitPerUser: { maxRequests: 100, windowMs: 60000 }
 * }));
 */
export function createHonoActionMiddleware(options = {}) {
  const {
    csrfValidation = true,
    csrfSecret = null,
    csrfStore = null,
    tokenExpiry = 3600000,
    rotateOnUse = false,
    endpoint = '/_actions',
    rateLimitPerAction = null,
    rateLimitPerUser = null,
    rateLimitGlobal = null,
    rateLimitStore = null,
    rateLimitIdentify = null,
    rateLimitTrustedIPs = null
  } = options;

  // Use provided store or get/create global store
  const store = csrfStore || (csrfValidation ? getCSRFStore({ csrfSecret, tokenExpiry }) : null);

  // Create rate limit middleware if any rate limits configured
  const rateLimitMiddleware = (rateLimitPerAction || rateLimitPerUser || rateLimitGlobal)
    ? createRateLimitMiddleware({
        perAction: rateLimitPerAction,
        perUser: rateLimitPerUser,
        global: rateLimitGlobal,
        store: rateLimitStore,
        identify: rateLimitIdentify,
        trustedIPs: rateLimitTrustedIPs
      })
    : null;

  return async (c, next) => {
    if (c.req.method !== 'POST' || !c.req.path.startsWith(endpoint)) {
      return next();
    }

    try {
      // Enhanced CSRF validation
      if (csrfValidation && store) {
        const token = c.req.header('x-csrf-token');

        const validation = await store.validate(token, {
          expiresIn: tokenExpiry,
          rotateOnUse
        });

        if (!validation.valid) {
          return c.json({
            error: 'CSRF validation failed',
            reason: validation.reason,
            code: 'PSC_CSRF_INVALID'
          }, 403);
        }

        // Rotate token if configured
        if (rotateOnUse) {
          const newToken = await store.generate({ expiresIn: tokenExpiry });
          c.header('X-New-CSRF-Token', newToken);
        }
      }

      // Extract action ID and args
      const actionId = c.req.header('x-pulse-action');
      const { args } = await c.req.json();

      if (!actionId) {
        return c.json({ error: 'Missing action ID' }, 400);
      }

      // Rate limiting check
      if (rateLimitMiddleware) {
        const rateLimitResult = await rateLimitMiddleware({
          actionId,
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
          userId: c.get('user')?.id,
          headers: c.req.raw.headers
        });

        if (!rateLimitResult.allowed) {
          // Set rate limit headers
          c.header('Retry-After', Math.ceil(rateLimitResult.retryAfter / 1000).toString());
          if (rateLimitResult.limit) {
            c.header('X-RateLimit-Limit', rateLimitResult.limit.toString());
          }
          if (rateLimitResult.remaining !== undefined) {
            c.header('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
          }
          if (rateLimitResult.resetAt) {
            c.header('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
          }

          return c.json({
            error: 'Too Many Requests',
            reason: rateLimitResult.reason,
            retryAfter: rateLimitResult.retryAfter,
            code: 'PSC_RATE_LIMIT_EXCEEDED'
          }, 429);
        }

        // Set rate limit info headers for successful requests
        if (rateLimitResult.limit) {
          c.header('X-RateLimit-Limit', rateLimitResult.limit.toString());
        }
        if (rateLimitResult.remaining !== undefined) {
          c.header('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        }
        if (rateLimitResult.resetAt) {
          c.header('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
        }
      }

      // Execute action
      const context = {
        c,
        session: c.get('session'),
        user: c.get('user')
      };

      const result = await executeServerAction(actionId, args, context);

      return c.json(result);
    } catch (error) {
      // Sanitize error before sending to client
      const sanitized = sanitizeError(error, {
        includeStack: !isProductionMode(),
        maxStackLines: 5
      });
      return c.json(sanitized, 500);
    }
  };
}

// ============================================================
// CSRF Token Helpers for SSR
// ============================================================

/**
 * Generate CSRF token for response (SSR)
 *
 * Generates a new CSRF token and sets it as a cookie and returns it
 * for inclusion in HTML meta tag.
 *
 * @param {Object} res - Response object (Express/Fastify/etc.)
 * @param {Object} [options] - Token options
 * @param {number} [options.expiresIn=3600000] - Token expiration in ms
 * @param {string} [options.cookieName='csrf-token'] - Cookie name
 * @returns {Promise<string>} CSRF token
 *
 * @example
 * app.get('*', async (req, res) => {
 *   const csrfToken = await generateCSRFTokenForResponse(res);
 *
 *   const html = `
 *     <!DOCTYPE html>
 *     <html>
 *       <head>
 *         <meta name="csrf-token" content="${csrfToken}">
 *       </head>
 *       <body>...</body>
 *     </html>
 *   `;
 *   res.send(html);
 * });
 */
export async function generateCSRFTokenForResponse(res, options = {}) {
  const {
    expiresIn = 3600000,
    cookieName = 'csrf-token'
  } = options;

  const store = getCSRFStore({ tokenExpiry: expiresIn });
  const token = await store.generate({ expiresIn });

  // Set cookie (double-submit pattern)
  if (res.cookie) {
    // Express/Fastify
    res.cookie(cookieName, token, {
      httpOnly: false,  // Client needs to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn
    });
  } else if (res.setCookie) {
    // Hono
    res.setCookie(cookieName, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: Math.floor(expiresIn / 1000)
    });
  }

  return token;
}

/**
 * Get CSRF token store (for advanced use cases)
 * @returns {CSRFTokenStore} Global CSRF token store
 */
export function getGlobalCSRFStore() {
  return getCSRFStore();
}

// ============================================================
// Exports
// ============================================================

export default {
  registerServerAction,
  getServerAction,
  getServerActions,
  clearServerActions,
  executeServerAction,
  createServerActionMiddleware,
  createFastifyActionPlugin,
  createHonoActionMiddleware,
  // CSRF helpers
  generateCSRFTokenForResponse,
  getGlobalCSRFStore,
  setCSRFStore
};
