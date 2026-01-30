/**
 * Pulse CLI - File Utilities
 * Shared utilities for file discovery and glob pattern matching
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname, extname } from 'path';

/**
 * Find .pulse files matching the given patterns
 * @param {string[]} patterns - Glob patterns or file paths
 * @param {object} options - Options
 * @param {string[]} options.extensions - File extensions to match (default: ['.pulse'])
 * @returns {string[]} Array of absolute file paths
 */
export function findPulseFiles(patterns, options = {}) {
  const { extensions = ['.pulse'] } = options;
  const files = new Set();
  const root = process.cwd();

  // Default to current directory if no patterns
  if (patterns.length === 0) {
    patterns = ['.'];
  }

  for (const pattern of patterns) {
    // Skip options (starting with -)
    if (pattern.startsWith('-')) continue;

    if (pattern.includes('*')) {
      // Glob pattern
      const matches = globMatch(root, pattern, extensions);
      for (const match of matches) {
        files.add(match);
      }
    } else {
      const fullPath = resolve(root, pattern);
      if (existsSync(fullPath)) {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // Directory - find all matching files
          walkDir(fullPath, files, extensions);
        } else if (extensions.some(ext => fullPath.endsWith(ext))) {
          files.add(fullPath);
        }
      }
    }
  }

  return Array.from(files).sort();
}

/**
 * Simple glob matching implementation
 * Supports: **, *, ?
 */
function globMatch(base, pattern, extensions) {
  const results = [];
  const parts = pattern.split('/').filter(p => p !== '');

  function match(dir, partIndex) {
    if (!existsSync(dir)) return;
    if (partIndex >= parts.length) return;

    const part = parts[partIndex];
    const isLast = partIndex === parts.length - 1;

    if (part === '**') {
      // Match any depth
      if (isLast) {
        // **/*.pulse at the end
        const nextPart = parts[partIndex + 1];
        if (nextPart) {
          matchFilesInDirRecursive(dir, nextPart, extensions, results);
        } else {
          walkDir(dir, results, extensions);
        }
      } else {
        // Continue matching at this level and deeper
        match(dir, partIndex + 1);
        try {
          for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            try {
              if (statSync(full).isDirectory()) {
                match(full, partIndex);
              }
            } catch (e) {
              // Skip inaccessible directories
            }
          }
        } catch (e) {
          // Skip inaccessible directories
        }
      }
    } else if (part.includes('*') || part.includes('?')) {
      // Wildcard in filename
      const regex = globToRegex(part);
      try {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          if (regex.test(entry)) {
            try {
              const stat = statSync(full);
              if (isLast) {
                if (stat.isFile() && extensions.some(ext => full.endsWith(ext))) {
                  results.push(full);
                }
              } else if (stat.isDirectory()) {
                match(full, partIndex + 1);
              }
            } catch (e) {
              // Skip inaccessible files
            }
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    } else {
      // Exact match
      const full = join(dir, part);
      if (existsSync(full)) {
        try {
          const stat = statSync(full);
          if (isLast) {
            if (stat.isFile()) {
              results.push(full);
            } else if (stat.isDirectory()) {
              // If last part is a directory, walk it
              walkDir(full, results, extensions);
            }
          } else if (stat.isDirectory()) {
            match(full, partIndex + 1);
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    }
  }

  match(base, 0);
  return results;
}

/**
 * Match files recursively with a glob pattern
 */
function matchFilesInDirRecursive(dir, pattern, extensions, results) {
  const regex = globToRegex(pattern);

  function walk(currentDir) {
    try {
      for (const entry of readdirSync(currentDir)) {
        const full = join(currentDir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) {
            walk(full);
          } else if (regex.test(entry) && extensions.some(ext => full.endsWith(ext))) {
            results.push(full);
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir);
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$');
}

/**
 * Walk directory recursively and collect files
 */
function walkDir(dir, results, extensions) {
  try {
    for (const entry of readdirSync(dir)) {
      // Skip hidden files and node_modules
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walkDir(full, results, extensions);
        } else if (extensions.some(ext => full.endsWith(ext))) {
          if (results instanceof Set) {
            results.add(full);
          } else {
            results.push(full);
          }
        }
      } catch (e) {
        // Skip inaccessible files
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
}

/**
 * Resolve import path relative to importing file
 * @param {string} fromFile - The file containing the import
 * @param {string} importPath - The import path
 * @returns {string|null} Resolved absolute path or null if not found
 */
export function resolveImportPath(fromFile, importPath) {
  if (!importPath.startsWith('.')) {
    return null; // External or node_modules import
  }

  const dir = dirname(fromFile);
  let resolved = resolve(dir, importPath);

  // Try with extensions
  const extensions = ['.pulse', '.js', '/index.pulse', '/index.js'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (existsSync(withExt)) {
      return withExt;
    }
  }

  // Try exact path
  if (existsSync(resolved)) {
    return resolved;
  }

  return null;
}

/**
 * Parse CLI arguments into options and file patterns
 * @param {string[]} args - Command line arguments
 * @returns {{ options: object, patterns: string[] }}
 */
export function parseArgs(args) {
  const options = {};
  const patterns = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // Boolean flags - don't consume next argument
      options[key] = true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      options[key] = true;
    } else {
      patterns.push(arg);
    }
  }

  return { options, patterns };
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get relative path from current working directory
 * @param {string} absolutePath - Absolute file path
 * @returns {string} Relative path
 */
export function relativePath(absolutePath) {
  const cwd = process.cwd();
  if (absolutePath.startsWith(cwd)) {
    return absolutePath.slice(cwd.length + 1);
  }
  return absolutePath;
}
