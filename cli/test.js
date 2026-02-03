/**
 * Pulse CLI - Test Command
 * Integrated test runner with coverage support
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { log } from './logger.js';
import { findPulseFiles, parseArgs } from './utils/file-utils.js';
import { createTimer, formatDuration } from './utils/cli-ui.js';

/**
 * Default test file patterns
 */
const DEFAULT_TEST_PATTERNS = [
  '**/*.test.js',
  '**/*.spec.js',
  '**/*.test.pulse',
  '**/*.spec.pulse',
  'test/**/*.js',
  'tests/**/*.js',
  '__tests__/**/*.js'
];

/**
 * Find test files in the project
 * @param {string[]} patterns - Glob patterns
 * @param {Object} options - Options
 * @returns {string[]} Array of test file paths
 */
export function findTestFiles(patterns = [], options = {}) {
  const { extensions = ['.js', '.mjs', '.ts'] } = options;
  const files = new Set();
  const root = process.cwd();

  // Use provided patterns or defaults
  const testPatterns = patterns.length > 0 ? patterns : DEFAULT_TEST_PATTERNS;

  for (const pattern of testPatterns) {
    // Skip options
    if (pattern.startsWith('-')) continue;

    if (pattern.includes('*')) {
      // Glob pattern - simple implementation
      const matches = globMatchTest(root, pattern, extensions);
      for (const match of matches) {
        files.add(match);
      }
    } else {
      const fullPath = resolve(root, pattern);
      if (existsSync(fullPath)) {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walkDirTest(fullPath, files, extensions);
        } else if (isTestFile(fullPath)) {
          files.add(fullPath);
        }
      }
    }
  }

  return Array.from(files).sort();
}

/**
 * Check if a file is a test file
 */
function isTestFile(filePath) {
  return /\.(test|spec)\.(js|mjs|ts|pulse)$/.test(filePath) ||
         /[\\/](test|tests|__tests__)[\\/]/.test(filePath);
}

/**
 * Simple glob matching for test files
 */
function globMatchTest(base, pattern, extensions) {
  const results = [];

  function walk(dir) {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        // Skip node_modules and hidden directories
        if (entry === 'node_modules' || entry.startsWith('.')) continue;

        const full = join(dir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) {
            walk(full);
          } else if (isTestFile(full)) {
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

  walk(base);
  return results;
}

/**
 * Walk directory for test files
 */
function walkDirTest(dir, results, extensions) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;

      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walkDirTest(full, results, extensions);
        } else if (isTestFile(full)) {
          results.add(full);
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
 * Run tests using Node.js built-in test runner
 * @param {string[]} files - Test files to run
 * @param {Object} options - Test options
 * @returns {Promise<{passed: number, failed: number, skipped: number, duration: number}>}
 */
export async function runTests(files, options = {}) {
  const {
    coverage = false,
    watch = false,
    filter = null,
    timeout = 30000,
    concurrency = true,
    reporter = 'spec',
    bail = false,
    verbose = false
  } = options;

  const timer = createTimer();

  // Build Node.js test runner arguments
  const nodeArgs = ['--test'];

  // Coverage support (Node.js 20+)
  if (coverage) {
    nodeArgs.push('--experimental-test-coverage');
  }

  // Watch mode
  if (watch) {
    nodeArgs.push('--watch');
  }

  // Filter tests by name
  if (filter) {
    nodeArgs.push(`--test-name-pattern=${filter}`);
  }

  // Test timeout
  nodeArgs.push(`--test-timeout=${timeout}`);

  // Concurrency
  if (!concurrency) {
    nodeArgs.push('--test-concurrency=1');
  }

  // Reporter
  if (reporter === 'tap') {
    nodeArgs.push('--test-reporter=tap');
  } else if (reporter === 'dot') {
    nodeArgs.push('--test-reporter=dot');
  } else if (reporter === 'json') {
    nodeArgs.push('--test-reporter=json');
  }

  // Bail on first failure
  if (bail) {
    nodeArgs.push('--test-only');
  }

  // Add test files
  nodeArgs.push(...files);

  return new Promise((resolve, reject) => {
    if (verbose) {
      log.debug(`Running: node ${nodeArgs.join(' ')}`);
    }

    const child = spawn('node', nodeArgs, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '1'
      }
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        log.error('Node.js not found. Please ensure Node.js is installed.');
      } else {
        log.error(`Test runner error: ${error.message}`);
      }
      reject(error);
    });

    child.on('close', (code) => {
      const duration = timer.elapsed();

      if (code === 0) {
        resolve({ passed: true, code: 0, duration });
      } else {
        resolve({ passed: false, code, duration });
      }
    });
  });
}

/**
 * Generate coverage report
 * @param {Object} options - Report options
 */
export async function generateCoverageReport(options = {}) {
  const { format = 'text', outputDir = 'coverage' } = options;

  // Node.js coverage generates v8 coverage files
  // We can use c8 or similar tools if available

  // Check if c8 is available
  try {
    const { execSync } = await import('child_process');
    execSync('npx c8 --version', { stdio: 'ignore' });

    log.info('\nGenerating coverage report...');

    const reportCmd = `npx c8 report --reporter=${format}`;
    if (format !== 'text') {
      // Create output directory
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
    }

    execSync(reportCmd, { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    log.info('\nTo generate detailed coverage reports, install c8:');
    log.info('  npm install -D c8');
    log.info('\nThen run: npx c8 npm test');
  }
}

/**
 * Create a test file template
 * @param {string} name - Test name
 * @param {string} type - Test type (unit, integration, e2e)
 * @returns {string} Test file content
 */
export function createTestTemplate(name, type = 'unit') {
  const pascalName = name.replace(/[-_]./g, m => m[1].toUpperCase())
    .replace(/^./, m => m.toUpperCase());

  if (type === 'e2e') {
    return `/**
 * E2E Test: ${pascalName}
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

describe('${pascalName} E2E', () => {
  before(async () => {
    // Setup: Start server, initialize browser, etc.
  });

  after(async () => {
    // Cleanup: Stop server, close browser, etc.
  });

  test('should load the page', async () => {
    // Your e2e test logic here
    assert.ok(true);
  });

  test('should handle user interaction', async () => {
    // Your e2e test logic here
    assert.ok(true);
  });
});
`;
  }

  if (type === 'integration') {
    return `/**
 * Integration Test: ${pascalName}
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('${pascalName} Integration', () => {
  let context;

  beforeEach(() => {
    // Setup test context
    context = {};
  });

  afterEach(() => {
    // Cleanup
    context = null;
  });

  test('should integrate components correctly', async () => {
    // Your integration test logic here
    assert.ok(true);
  });

  test('should handle data flow', async () => {
    // Your integration test logic here
    assert.ok(true);
  });
});
`;
  }

  // Default: unit test
  return `/**
 * Unit Test: ${pascalName}
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import the module to test
// import { ${name} } from '../src/${name}.js';

describe('${pascalName}', () => {
  test('should exist', () => {
    // Replace with actual test
    assert.ok(true);
  });

  test('should handle basic case', () => {
    // Your test logic here
    assert.ok(true);
  });

  test('should handle edge cases', () => {
    // Your test logic here
    assert.ok(true);
  });
});
`;
}

/**
 * Main test command handler
 */
export async function runTestCommand(args) {
  const { options, patterns } = parseArgs(args);

  const coverage = options.coverage || options.c || false;
  const watch = options.watch || options.w || false;
  const filter = options.filter || options.f || null;
  const timeout = parseInt(options.timeout || options.t || '30000', 10);
  const reporter = options.reporter || options.r || 'spec';
  const bail = options.bail || options.b || false;
  const verbose = options.verbose || options.v || false;
  const create = options.create || null;

  // Handle --create flag to generate test file
  if (create) {
    const testType = options.type || 'unit';
    const testContent = createTestTemplate(create, testType);
    const testDir = options.dir || 'test';
    const testPath = join(process.cwd(), testDir, `${create}.test.js`);

    // Create test directory if needed
    const dir = dirname(testPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(testPath, testContent);
    log.success(`Created test file: ${relative(process.cwd(), testPath)}`);
    return;
  }

  // Find test files
  const files = findTestFiles(patterns);

  if (files.length === 0) {
    log.warn('No test files found.');
    log.info('\nLooking for files matching:');
    for (const pattern of DEFAULT_TEST_PATTERNS) {
      log.info(`  - ${pattern}`);
    }
    log.info('\nTo create a test file:');
    log.info('  pulse test --create <name>');
    log.info('  pulse test --create <name> --type integration');
    return;
  }

  log.info(`Found ${files.length} test file(s)\n`);

  if (verbose) {
    for (const file of files) {
      log.debug(`  ${relative(process.cwd(), file)}`);
    }
    log.debug('');
  }

  // Run tests
  const result = await runTests(files, {
    coverage,
    watch,
    filter,
    timeout,
    reporter,
    bail,
    verbose
  });

  // Generate coverage report if requested
  if (coverage && !watch && result.passed) {
    await generateCoverageReport({ format: options.format || 'text' });
  }

  // Print summary
  const durationStr = formatDuration(result.duration);
  log.info('');

  if (result.passed) {
    log.success(`Tests passed (${durationStr})`);
  } else {
    log.error(`Tests failed with code ${result.code} (${durationStr})`);
    process.exit(result.code);
  }
}
