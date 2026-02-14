/**
 * Pulse Compiler - Directive Detection
 *
 * Detects and handles file-level directives for Server Components:
 * - 'use client' - Marks component as Client Component (runs on client only)
 * - 'use server' - Marks component as Server Component (runs on server only)
 *
 * These are different from element-level @client/@server directives:
 * - File-level: Affects entire component, used for bundle splitting
 * - Element-level: Affects individual elements, used for SSR (ClientOnly/ServerOnly)
 *
 * @module pulse-js-framework/compiler/directives
 */

import { TokenType } from './lexer.js';

// ============================================================================
// Directive Constants
// ============================================================================

/**
 * Supported file-level directives
 */
export const Directive = {
  USE_CLIENT: 'use client',
  USE_SERVER: 'use server'
};

/**
 * Check if a string value is a valid directive
 * @param {string} value - String literal value
 * @returns {string|null} Directive type or null
 */
export function isDirective(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === Directive.USE_CLIENT) return Directive.USE_CLIENT;
  if (normalized === Directive.USE_SERVER) return Directive.USE_SERVER;
  return null;
}

/**
 * Check if a token is a directive string literal
 * @param {Object} token - Token to check
 * @returns {string|null} Directive type or null
 */
export function isDirectiveToken(token) {
  if (!token || token.type !== TokenType.STRING) return null;
  return isDirective(token.value);
}

// ============================================================================
// Directive Parsing
// ============================================================================

/**
 * Parse file-level directives at the beginning of a .pulse file
 * Directives must appear before any other statements (imports, blocks, etc.)
 *
 * @param {Parser} parser - Parser instance
 * @returns {string|null} Directive type ('use client' | 'use server' | null)
 *
 * @example
 * // .pulse file with directive:
 * // 'use client';
 * // import Button from './Button.pulse'
 * // ...
 *
 * // Parsed as:
 * // { directive: 'use client', imports: [...], ... }
 */
export function parseDirective(parser) {
  // Check if first token is a string literal
  const token = parser.current();
  if (token?.type !== TokenType.STRING) {
    return null;
  }

  // Check if it's a valid directive
  const directive = isDirective(token.value);
  if (!directive) {
    return null;
  }

  // Consume the directive token
  parser.advance();

  // Optional semicolon after directive
  if (parser.is(TokenType.SEMICOLON)) {
    parser.advance();
  }

  return directive;
}

/**
 * Validate directive usage rules
 * @param {string} directive - Directive type
 * @param {Object} program - Program AST node
 * @throws {Error} If directive usage is invalid
 */
export function validateDirective(directive, program) {
  if (!directive) return;

  // Rule 1: Cannot have both 'use client' and 'use server'
  if (directive === Directive.USE_CLIENT && program.serverDirective) {
    throw new Error("Cannot use both 'use client' and 'use server' in the same file");
  }
  if (directive === Directive.USE_SERVER && program.clientDirective) {
    throw new Error("Cannot use both 'use client' and 'use server' in the same file");
  }

  // Rule 2: Server Components cannot have interactive features
  // (This will be enforced in transformer/linter)
}

// ============================================================================
// Component Type Detection
// ============================================================================

/**
 * Determine component type from directive
 * @param {string|null} directive - File-level directive
 * @returns {'client'|'server'|'shared'} Component type
 */
export function getComponentType(directive) {
  if (directive === Directive.USE_CLIENT) return 'client';
  if (directive === Directive.USE_SERVER) return 'server';
  return 'shared'; // Default: can run on both server and client
}

/**
 * Check if component is a Client Component
 * @param {string|null} directive - File-level directive
 * @returns {boolean} True if Client Component
 */
export function isClientComponent(directive) {
  return directive === Directive.USE_CLIENT;
}

/**
 * Check if component is a Server Component
 * @param {string|null} directive - File-level directive
 * @returns {boolean} True if Server Component
 */
export function isServerComponent(directive) {
  return directive === Directive.USE_SERVER;
}

/**
 * Check if component is a Shared Component (runs on both)
 * @param {string|null} directive - File-level directive
 * @returns {boolean} True if Shared Component
 */
export function isSharedComponent(directive) {
  return !directive || (directive !== Directive.USE_CLIENT && directive !== Directive.USE_SERVER);
}

// ============================================================================
// JavaScript/TypeScript Source Code Parsing
// ============================================================================

/**
 * Parse directives from raw JavaScript/TypeScript source code
 * Used by build tools to detect 'use client' and 'use server' in .js/.ts files
 *
 * @param {string} source - Source code
 * @returns {{ useClient: boolean, useServer: boolean, line?: number }}
 *
 * @example
 * parseDirectivesFromSource("'use client';\nimport foo from 'bar';")
 * // { useClient: true, useServer: false, line: 1 }
 */
export function parseDirectivesFromSource(source) {
  const result = {
    useClient: false,
    useServer: false,
    line: undefined
  };

  if (!source || typeof source !== 'string') {
    return result;
  }

  // Split into lines for analysis
  const lines = source.split('\n');
  let seenCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === '') {
      continue;
    }

    // Skip comments
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }

    // Check for 'use client' directive
    if (/^['"]use client['"];?$/.test(line)) {
      if (seenCode) {
        return result; // Directive after code - invalid
      }
      result.useClient = true;
      result.line = i + 1;
      return result;
    }

    // Check for 'use server' directive
    if (/^['"]use server['"];?$/.test(line)) {
      if (seenCode) {
        return result; // Directive after code - invalid
      }
      result.useServer = true;
      result.line = i + 1;
      return result;
    }

    // Any other non-empty, non-comment line is "code"
    seenCode = true;
  }

  return result;
}

/**
 * Check if source code is a Client Component (has 'use client' directive)
 *
 * @param {string} source - Source code
 * @returns {boolean}
 *
 * @example
 * isClientComponentSource("'use client';\nexport function Button() {}")  // true
 */
export function isClientComponentSource(source) {
  const directives = parseDirectivesFromSource(source);
  return directives.useClient;
}

/**
 * Check if source code is a Server Component (has 'use server' directive)
 *
 * @param {string} source - Source code
 * @returns {boolean}
 *
 * @example
 * isServerComponentSource("'use server';\nexport async function createUser() {}")  // true
 */
export function isServerComponentSource(source) {
  const directives = parseDirectivesFromSource(source);
  return directives.useServer;
}

/**
 * Check if a file path matches *.server.js pattern
 *
 * @param {string} filePath - File path
 * @returns {boolean}
 *
 * @example
 * isServerFile('src/api/users.server.js')  // true
 * isServerFile('src/api/users.js')         // false
 */
export function isServerFile(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  return /\.server\.(js|ts|jsx|tsx)$/.test(filePath);
}

/**
 * Check if a file should be treated as a Server Component
 * (either has 'use server' directive OR matches *.server.js pattern)
 *
 * @param {string} source - Source code
 * @param {string} filePath - File path
 * @returns {boolean}
 */
export function isServerModule(source, filePath) {
  return isServerComponentSource(source) || isServerFile(filePath);
}

/**
 * Check if a file should be treated as a Client Component
 *
 * @param {string} source - Source code
 * @returns {boolean}
 */
export function isClientModule(source) {
  return isClientComponentSource(source);
}

/**
 * Get component type from source and file path
 *
 * @param {string} source - Source code
 * @param {string} filePath - File path
 * @returns {'client' | 'server' | 'shared'}
 *
 * @example
 * getComponentTypeFromSource("'use client';", 'Button.js')  // 'client'
 * getComponentTypeFromSource("'use server';", 'api.js')     // 'server'
 * getComponentTypeFromSource("export const utils = {}", 'utils.js')  // 'shared'
 */
export function getComponentTypeFromSource(source, filePath) {
  if (isClientModule(source)) return 'client';
  if (isServerModule(source, filePath)) return 'server';
  return 'shared';
}

/**
 * Validate that source doesn't have both directives
 *
 * @param {string} source - Source code
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDirectivesInSource(source) {
  const directives = parseDirectivesFromSource(source);

  if (directives.useClient && directives.useServer) {
    return {
      valid: false,
      error: "Cannot have both 'use client' and 'use server' directives in the same file"
    };
  }

  return { valid: true };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  Directive,
  isDirective,
  isDirectiveToken,
  parseDirective,
  validateDirective,
  getComponentType,
  isClientComponent,
  isServerComponent,
  isSharedComponent,
  // Source code parsing
  parseDirectivesFromSource,
  isClientComponentSource,
  isServerComponentSource,
  isServerFile,
  isServerModule,
  isClientModule,
  getComponentTypeFromSource,
  validateDirectivesInSource
};
