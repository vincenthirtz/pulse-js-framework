/**
 * Pulse Router - Utilities
 *
 * Helper functions for route parsing, matching, and query string handling
 *
 * @module pulse-js-framework/runtime/router/utils
 */

import { loggers } from '../logger.js';

const log = loggers.router;

/**
 * Parse a route pattern into a regex and extract param names
 * Supports: /users/:id, /posts/:id/comments, /files/*path, * (catch-all)
 */
export function parsePattern(pattern) {
  const paramNames = [];

  // Handle standalone * as catch-all
  if (pattern === '*') {
    return {
      regex: /^.*$/,
      paramNames: []
    };
  }

  let regexStr = pattern
    // Escape special regex chars except : and *
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    // Handle wildcard params (*name)
    .replace(/\*([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '(.*)';
    })
    // Handle named params (:name)
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

  // Ensure exact match
  regexStr = `^${regexStr}$`;

  return {
    regex: new RegExp(regexStr),
    paramNames
  };
}

/**
 * Normalize route configuration
 * Supports both simple (handler function) and full (object with meta) definitions
 */
export function normalizeRoute(pattern, config) {
  // Simple format: pattern -> handler
  if (typeof config === 'function') {
    return {
      pattern,
      handler: config,
      meta: {},
      beforeEnter: null,
      children: null
    };
  }

  // Full format: pattern -> { handler, meta, beforeEnter, children, alias, layout, group }
  return {
    pattern,
    handler: config.handler || config.component,
    meta: config.meta || {},
    beforeEnter: config.beforeEnter || null,
    children: config.children || null,
    redirect: config.redirect || null,
    alias: config.alias || null,
    layout: config.layout || null,
    group: config.group || false
  };
}

/**
 * Build a query string from an object, supporting arrays and skipping null/undefined
 *
 * @param {Object} query - Query parameters object
 * @returns {string} Encoded query string (without leading ?)
 *
 * @example
 * buildQueryString({ q: 'hello world', tags: ['a', 'b'] })
 * // 'q=hello+world&tags=a&tags=b'
 *
 * buildQueryString({ a: 'x', b: null, c: undefined })
 * // 'a=x'
 */
export function buildQueryString(query) {
  if (!query || typeof query !== 'object') return '';

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    // Skip null and undefined values
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      // Array values: ?tags=a&tags=b
      for (const item of value) {
        if (item !== null && item !== undefined) {
          params.append(key, String(item));
        }
      }
    } else {
      params.append(key, String(value));
    }
  }

  return params.toString();
}

/**
 * Match a path against a route pattern
 */
export function matchRoute(pattern, path) {
  const { regex, paramNames } = parsePattern(pattern);
  const match = path.match(regex);

  if (!match) return null;

  const params = {};
  paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(match[i + 1]);
  });

  return params;
}

// Query string validation limits
const QUERY_LIMITS = {
  maxTotalLength: 2048,     // 2KB max for entire query string
  maxValueLength: 1024,     // 1KB max per individual value
  maxParams: 50             // Maximum number of query parameters
};

/**
 * Parse a single query value into its typed representation
 * Only converts when parseQueryTypes is enabled
 *
 * @param {string} value - Raw string value
 * @returns {string|number|boolean} Typed value
 */
function parseTypedValue(value) {
  // Boolean detection
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number detection (strict: only numeric strings, not hex/octal/empty)
  if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
    const num = Number(value);
    if (isFinite(num)) return num;
  }

  return value;
}

/**
 * Parse query string into object with validation
 *
 * SECURITY: Enforces hard limits BEFORE parsing to prevent DoS attacks.
 * - Max total length: 2KB
 * - Max value length: 1KB
 * - Max parameters: 50
 *
 * @param {string} search - Query string (with or without leading ?)
 * @param {Object} [options] - Parsing options
 * @param {boolean} [options.typed=false] - Parse numbers and booleans from string values
 * @returns {Object} Parsed query parameters
 */
export function parseQuery(search, options = {}) {
  if (!search) return {};

  const { typed = false } = options;

  // Remove leading ? if present
  let queryStr = search.startsWith('?') ? search.slice(1) : search;

  // SECURITY: Enforce hard limit BEFORE parsing to prevent DoS
  if (queryStr.length > QUERY_LIMITS.maxTotalLength) {
    log.warn(`Query string exceeds maximum length (${QUERY_LIMITS.maxTotalLength} chars). Truncating.`);
    queryStr = queryStr.slice(0, QUERY_LIMITS.maxTotalLength);
  }

  const params = new URLSearchParams(queryStr);
  const query = {};
  let paramCount = 0;

  for (const [key, value] of params) {
    // Check parameter count limit
    if (paramCount >= QUERY_LIMITS.maxParams) {
      log.warn(`Query string exceeds maximum parameters (${QUERY_LIMITS.maxParams}). Ignoring excess.`);
      break;
    }

    // Validate and potentially truncate value length
    let safeValue = value;
    if (value.length > QUERY_LIMITS.maxValueLength) {
      log.warn(`Query parameter "${key}" exceeds maximum length. Truncating.`);
      safeValue = value.slice(0, QUERY_LIMITS.maxValueLength);
    }

    // Apply typed parsing if enabled
    if (typed) {
      safeValue = parseTypedValue(safeValue);
    }

    if (key in query) {
      // Multiple values for same key
      if (Array.isArray(query[key])) {
        query[key].push(safeValue);
      } else {
        query[key] = [query[key], safeValue];
      }
    } else {
      query[key] = safeValue;
    }
    paramCount++;
  }
  return query;
}
