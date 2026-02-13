/**
 * Pulse GraphQL - Query Caching
 *
 * Utilities for creating cache keys and managing query cache
 *
 * @module pulse-js-framework/runtime/graphql/cache
 */

import { LRUCache } from '../lru-cache.js';

// ============================================================================
// Cache Key Utilities
// ============================================================================

/**
 * Extract operation name from GraphQL query string
 * @param {string} query - GraphQL query string
 * @returns {string|null} Operation name or null
 */
export function extractOperationName(query) {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
  return match ? match[1] : null;
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function hashString(str) {
  if (!str) return '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Stable JSON stringify with sorted keys
 * @param {*} obj - Object to stringify
 * @returns {string} Stable JSON string
 */
function stableStringify(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${stableStringify(obj[k])}`).join(',') + '}';
}

/**
 * Generate a deterministic cache key for a GraphQL operation
 * @param {string} query - GraphQL query string
 * @param {Object} [variables] - Query variables
 * @returns {string} Cache key
 */
export function generateCacheKey(query, variables) {
  const operationName = extractOperationName(query);
  const variablesHash = variables ? hashString(stableStringify(variables)) : '';
  const queryHash = operationName || hashString(query.replace(/\s+/g, ' ').trim());
  return `gql:${queryHash}${variablesHash ? ':' + variablesHash : ''}`;
}


