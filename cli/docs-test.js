/**
 * Pulse CLI - Documentation Test
 *
 * Tests documentation without external dependencies:
 * - JavaScript syntax validation (via vm.Script)
 * - Import resolution verification
 * - HTTP response testing via dev server
 * - .pulse file compilation check
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import vm from 'vm';
import { compile } from '../compiler/index.js';
import { log } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'docs');

// Directories to skip during file collection
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'coverage'];

/**
 * Collect all JS files recursively
 */
function collectJsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    // Skip common non-source directories
    if (SKIP_DIRS.includes(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectJsFiles(fullPath, files);
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Collect all .pulse files recursively
 */
function collectPulseFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    // Skip common non-source directories
    if (SKIP_DIRS.includes(entry)) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectPulseFiles(fullPath, files);
    } else if (entry.endsWith('.pulse')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Validate JavaScript syntax
 * Uses vm.Script but ignores ESM-specific errors (import/export)
 * since vm.Script doesn't support ESM natively
 */
function validateJsSyntax(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const errors = [];

  try {
    // Transform ESM to CommonJS-like for syntax checking only
    // This allows us to catch real syntax errors while ignoring ESM syntax
    const transformedContent = content
      // Remove import statements
      .replace(/^import\s+.*$/gm, '// import removed')
      // Replace "export default {" with "const _ = {"
      .replace(/^export\s+default\s+\{/gm, 'const __default__ = {')
      // Replace "export default function" with "function"
      .replace(/^export\s+default\s+function/gm, 'function')
      // Replace "export default class" with "class"
      .replace(/^export\s+default\s+class/gm, 'class')
      // Replace "export default expression" (covers other cases)
      .replace(/^export\s+default\s+/gm, 'const __default__ = ')
      // Replace "export const/let/var" with just "const/let/var"
      .replace(/^export\s+(const|let|var)\s+/gm, '$1 ')
      // Replace "export function" with "function"
      .replace(/^export\s+function\s+/gm, 'function ')
      // Replace "export class" with "class"
      .replace(/^export\s+class\s+/gm, 'class ')
      // Replace "export async function" with "async function"
      .replace(/^export\s+async\s+function\s+/gm, 'async function ')
      // Remove named export statements "export { ... }"
      .replace(/^export\s*\{[^}]*\}.*$/gm, '// export removed');

    new vm.Script(transformedContent, { filename: filePath });
  } catch (error) {
    // Ignore ESM-specific errors that slip through
    const esmErrors = [
      'Cannot use import statement',
      "Unexpected token 'export'",
      'Cannot use import.meta',
      "Unexpected token 'import'"
    ];

    const isEsmError = esmErrors.some(msg => error.message.includes(msg));

    if (!isEsmError) {
      errors.push({
        file: filePath,
        line: error.lineNumber || null,
        column: error.columnNumber || null,
        message: error.message
      });
    }
  }

  return errors;
}

/**
 * Extract real import paths from JavaScript file
 * Filters out imports inside template strings, comments, and code examples
 */
function extractImports(content, filePath) {
  const imports = [];

  // Check if this is a documentation page file (contains code examples)
  const isDocsPage = filePath.includes('pages') && filePath.includes('Page.js');

  // Remove template strings and their contents to avoid false positives
  // Template strings often contain code examples with fake imports
  let cleanContent = content;

  if (isDocsPage) {
    // For docs pages, only extract imports at the top of the file (real imports)
    // Stop when we hit the first function declaration or export
    const lines = content.split('\n');
    const importLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Stop at first non-import statement (excluding comments and empty lines)
      if (trimmed && !trimmed.startsWith('import') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        break;
      }
      if (trimmed.startsWith('import')) {
        importLines.push(line);
      }
    }

    cleanContent = importLines.join('\n');
  }

  // Static imports: import x from './path'
  const staticImportRegex = /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = staticImportRegex.exec(cleanContent)) !== null) {
    imports.push(match[1]);
  }

  // Only check dynamic imports for non-docs pages to avoid code examples
  if (!isDocsPage) {
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(cleanContent)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
}

/**
 * Resolve import path relative to file
 */
function resolveImport(importPath, fromFile) {
  // Skip external modules (no ./ or ../)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null; // External module, skip
  }

  const fromDir = dirname(fromFile);
  let resolved = join(fromDir, importPath);

  // Add .js extension if missing
  if (!resolved.endsWith('.js') && !resolved.endsWith('.pulse')) {
    if (existsSync(resolved + '.js')) {
      resolved += '.js';
    } else if (existsSync(resolved + '/index.js')) {
      resolved = join(resolved, 'index.js');
    }
  }

  return resolved;
}

/**
 * Validate imports in a JavaScript file
 */
function validateImports(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const imports = extractImports(content, filePath);
  const errors = [];

  for (const importPath of imports) {
    const resolved = resolveImport(importPath, filePath);

    // Skip external modules
    if (resolved === null) continue;

    // Skip runtime imports (resolved at runtime)
    if (importPath.includes('/runtime/')) continue;

    // Skip pulse-js-framework imports
    if (importPath.includes('pulse-js-framework')) continue;

    if (!existsSync(resolved)) {
      errors.push({
        file: filePath,
        importPath,
        resolved,
        message: `Import not found: ${importPath}`
      });
    }
  }

  return errors;
}

/**
 * Compile and validate .pulse files
 */
function validatePulseFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const errors = [];

  try {
    const result = compile(content, {
      sourceMap: false,
      sourceFileName: filePath
    });

    if (!result.success) {
      for (const error of result.errors) {
        errors.push({
          file: filePath,
          line: error.line || null,
          column: error.column || null,
          message: error.message
        });
      }
    }
  } catch (error) {
    errors.push({
      file: filePath,
      message: error.message
    });
  }

  return errors;
}

/**
 * Make HTTP request (native, no dependencies)
 */
function httpGet(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const http = urlObj.protocol === 'https:'
      ? require('https')
      : require('http');

    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Start a minimal test server for docs
 */
function startTestServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Disable keep-alive for test server
      res.setHeader('Connection', 'close');

      const url = new URL(req.url, `http://localhost:${port}`);
      let pathname = url.pathname;

      if (pathname === '/') pathname = '/index.html';

      const filePath = join(docsDir, pathname);

      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const content = readFileSync(filePath);
        const ext = pathname.split('.').pop();
        const mimeTypes = {
          'html': 'text/html',
          'js': 'application/javascript',
          'css': 'text/css',
          'json': 'application/json'
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Disable keep-alive timeout
    server.keepAliveTimeout = 0;

    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });

    server.on('error', reject);
  });
}

/**
 * Test HTTP responses for documentation pages
 */
async function testHttpResponses(port, routes) {
  const errors = [];
  const http = await import('http');

  for (const route of routes) {
    const url = `http://127.0.0.1:${port}${route}`;

    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      if (result.status !== 200) {
        errors.push({
          route,
          status: result.status,
          message: `HTTP ${result.status} for ${route}`
        });
      }
    } catch (error) {
      errors.push({
        route,
        message: `Failed to fetch ${route}: ${error.message}`
      });
    }
  }

  return errors;
}

/**
 * Run all documentation tests
 * @param {Object} options
 * @param {boolean} options.verbose - Show detailed output
 * @param {boolean} options.httpTest - Run HTTP tests (starts server)
 * @returns {Promise<{success: boolean, errors: Array}>}
 */
export async function runDocsTest(options = {}) {
  const { verbose = false, httpTest = true } = options;
  const allErrors = [];
  let passed = 0;
  let failed = 0;

  log.info('');
  log.info('Documentation Tests');
  log.info('='.repeat(50));

  // 1. Validate JavaScript syntax
  log.info('');
  log.info('Validating JavaScript syntax...');

  const jsFiles = collectJsFiles(join(docsDir, 'src'));

  for (const file of jsFiles) {
    const relPath = relative(docsDir, file);
    const errors = validateJsSyntax(file);

    if (errors.length > 0) {
      failed++;
      log.error(`  ✗ ${relPath}`);
      for (const err of errors) {
        log.error(`    ${err.message}`);
        allErrors.push({ type: 'syntax', ...err });
      }
    } else {
      passed++;
      if (verbose) log.info(`  ✓ ${relPath}`);
    }
  }

  log.info(`  Syntax: ${passed} passed, ${failed} failed`);

  // 2. Validate imports
  log.info('');
  log.info('Validating imports...');

  let importPassed = 0;
  let importFailed = 0;

  for (const file of jsFiles) {
    const relPath = relative(docsDir, file);
    const errors = validateImports(file);

    if (errors.length > 0) {
      importFailed++;
      log.error(`  ✗ ${relPath}`);
      for (const err of errors) {
        log.error(`    ${err.message}`);
        allErrors.push({ type: 'import', ...err });
      }
    } else {
      importPassed++;
      if (verbose) log.info(`  ✓ ${relPath}`);
    }
  }

  log.info(`  Imports: ${importPassed} passed, ${importFailed} failed`);

  // 3. Validate .pulse files (if any in docs)
  const pulseFiles = collectPulseFiles(docsDir);

  if (pulseFiles.length > 0) {
    log.info('');
    log.info('Validating .pulse files...');

    let pulsePassed = 0;
    let pulseFailed = 0;

    for (const file of pulseFiles) {
      const relPath = relative(docsDir, file);
      const errors = validatePulseFile(file);

      if (errors.length > 0) {
        pulseFailed++;
        log.error(`  ✗ ${relPath}`);
        for (const err of errors) {
          log.error(`    ${err.message}`);
          allErrors.push({ type: 'pulse', ...err });
        }
      } else {
        pulsePassed++;
        if (verbose) log.info(`  ✓ ${relPath}`);
      }
    }

    log.info(`  Pulse: ${pulsePassed} passed, ${pulseFailed} failed`);
  }

  // 4. HTTP response tests
  if (httpTest) {
    log.info('');
    log.info('Testing HTTP responses...');

    let serverInfo = null;

    try {
      serverInfo = await startTestServer();
      const port = serverInfo.port;

      // Test essential routes
      const routes = [
        '/index.html',
        '/src/main.js',
        '/src/state.js',
        '/src/styles.js'
      ];

      const httpErrors = await testHttpResponses(port, routes);

      if (httpErrors.length > 0) {
        for (const err of httpErrors) {
          log.error(`  ✗ ${err.route}: ${err.message}`);
          allErrors.push({ type: 'http', ...err });
        }
        log.info(`  HTTP: ${routes.length - httpErrors.length} passed, ${httpErrors.length} failed`);
      } else {
        log.info(`  HTTP: ${routes.length} passed, 0 failed`);
      }
    } catch (error) {
      log.warn(`  HTTP tests skipped: ${error.message}`);
    } finally {
      if (serverInfo?.server) {
        // Force close all connections and server
        await new Promise((resolve) => {
          serverInfo.server.close(() => resolve());
          // Force close after 1 second if not closed
          setTimeout(resolve, 1000);
        });
      }
    }
  }

  // 5. Compile examples .pulse files
  const examplesDir = join(root, 'examples');
  const examplePulseFiles = collectPulseFiles(examplesDir);

  if (examplePulseFiles.length > 0) {
    log.info('');
    log.info('Validating example .pulse files...');

    let examplePassed = 0;
    let exampleFailed = 0;

    for (const file of examplePulseFiles) {
      const relPath = relative(root, file);
      const errors = validatePulseFile(file);

      if (errors.length > 0) {
        exampleFailed++;
        log.error(`  ✗ ${relPath}`);
        for (const err of errors) {
          log.error(`    ${err.message}`);
          allErrors.push({ type: 'example', ...err });
        }
      } else {
        examplePassed++;
        if (verbose) log.info(`  ✓ ${relPath}`);
      }
    }

    log.info(`  Examples: ${examplePassed} passed, ${exampleFailed} failed`);
  }

  // Summary
  log.info('');
  log.info('-'.repeat(50));

  const success = allErrors.length === 0;

  if (success) {
    log.success('All documentation tests passed!');
  } else {
    log.error(`Documentation tests failed: ${allErrors.length} error(s)`);
  }

  log.info('');

  return { success, errors: allErrors };
}

/**
 * CLI entry point
 */
export async function runDocsTestCli(args) {
  const verbose = args.includes('--verbose') || args.includes('-v');
  const noHttp = args.includes('--no-http');

  const result = await runDocsTest({
    verbose,
    httpTest: !noHttp
  });

  if (!result.success) {
    process.exit(1);
  }
}
