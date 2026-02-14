/**
 * Path Sanitization Utilities
 *
 * Prevents path traversal attacks by validating and normalizing file paths.
 * Ensures paths stay within the project directory.
 *
 * @module pulse-js-framework/runtime/server-components/utils/path-sanitizer
 */

import { resolve, normalize, relative, isAbsolute } from 'path';

/**
 * Sanitize and validate an import path to prevent traversal attacks
 *
 * Security checks:
 * 1. Normalizes path to remove ../ sequences
 * 2. Resolves to absolute path
 * 3. Ensures result is within basePath (no escaping project directory)
 * 4. Blocks absolute paths that bypass basePath
 *
 * @param {string} importPath - Path to sanitize (possibly malicious)
 * @param {string} basePath - Base directory that paths must stay within
 * @returns {string} Sanitized absolute path
 * @throws {Error} If path attempts to escape basePath
 *
 * @example
 * // Safe path
 * sanitizeImportPath('./components/Button.js', '/project')
 * // → '/project/components/Button.js'
 *
 * // Path traversal attempt - THROWS
 * sanitizeImportPath('../../../etc/passwd', '/project')
 * // → Error: Invalid import path
 */
export function sanitizeImportPath(importPath, basePath) {
  if (!importPath || typeof importPath !== 'string') {
    throw new Error('Invalid import path: path must be a non-empty string');
  }

  if (!basePath || typeof basePath !== 'string') {
    throw new Error('Invalid base path: basePath must be a non-empty string');
  }

  // SECURITY: Block Windows absolute paths on Unix systems (e.g., C:\...)
  // These could bypass path checks on cross-platform builds
  if (/^[A-Za-z]:\\/.test(importPath)) {
    throw new Error(
      `Invalid import path: "${importPath}" attempts to use absolute Windows path`
    );
  }

  // Normalize to remove ../ and ./ sequences
  const normalized = normalize(importPath);

  // Resolve to absolute path relative to basePath
  const resolved = resolve(basePath, normalized);

  // Get relative path from basePath to resolved path
  const rel = relative(basePath, resolved);

  // Check if path escapes basePath
  // - If rel starts with '..', it's outside basePath
  // - If rel is absolute, it bypassed basePath
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(
      `Invalid import path: "${importPath}" attempts to escape project directory`
    );
  }

  return resolved;
}

/**
 * Sanitize multiple import paths
 *
 * @param {string[]} paths - Array of paths to sanitize
 * @param {string} basePath - Base directory
 * @returns {string[]} Array of sanitized paths
 * @throws {Error} If any path is invalid
 */
export function sanitizeImportPaths(paths, basePath) {
  if (!Array.isArray(paths)) {
    throw new Error('Invalid paths: must be an array');
  }

  return paths.map(path => sanitizeImportPath(path, basePath));
}

/**
 * Check if a path is safe (within basePath) without throwing
 *
 * @param {string} importPath - Path to check
 * @param {string} basePath - Base directory
 * @returns {boolean} True if path is safe
 */
export function isPathSafe(importPath, basePath) {
  try {
    sanitizeImportPath(importPath, basePath);
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  sanitizeImportPath,
  sanitizeImportPaths,
  isPathSafe
};
