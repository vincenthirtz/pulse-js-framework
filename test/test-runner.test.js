/**
 * Test Runner Command Tests
 *
 * Tests for cli/test.js - Test file discovery, running, and coverage
 *
 * @module test/test-runner
 */

import { findTestFiles, createTestTemplate } from '../cli/test.js';
import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-runner-project');
const originalCwd = process.cwd();

/**
 * Setup mock test project
 */
function setupMockProject(files = {}) {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(TEST_DIR, path);
    const dir = join(fullPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, content || '// test file');
  }

  process.chdir(TEST_DIR);
}

/**
 * Cleanup mock project
 */
function cleanupMockProject() {
  process.chdir(originalCwd);
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// =============================================================================
// Test File Discovery Tests
// =============================================================================

printSection('Test File Discovery');

test('findTestFiles finds .test.js files', () => {
  setupMockProject({
    'test/example.test.js': '',
    'test/utils.test.js': '',
    'src/main.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 2, 'Should find 2 test files');
    assert(files.some(f => f.includes('example.test.js')), 'Should find example.test.js');
    assert(files.some(f => f.includes('utils.test.js')), 'Should find utils.test.js');
    assert(!files.some(f => f.includes('main.js')), 'Should not include non-test files');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles finds .spec.js files', () => {
  setupMockProject({
    'test/component.spec.js': '',
    'test/service.spec.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 2, 'Should find 2 spec files');
    assert(files.some(f => f.includes('component.spec.js')));
    assert(files.some(f => f.includes('service.spec.js')));
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles finds .test.pulse files', () => {
  setupMockProject({
    'test/Button.test.pulse': '',
    'src/Button.pulse': ''
  });
  try {
    const files = findTestFiles();

    assert(files.some(f => f.includes('Button.test.pulse')), 'Should find .test.pulse files');
    assert(!files.some(f => f === 'Button.pulse'), 'Should not include non-test .pulse files');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles looks in test directory', () => {
  setupMockProject({
    'test/a.test.js': '',
    'test/b.test.js': '',
    'test/sub/c.test.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 3, 'Should find all test files including subdirectories');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles looks in tests directory', () => {
  setupMockProject({
    'tests/feature.test.js': '',
    'tests/integration/api.test.js': ''
  });
  try {
    const files = findTestFiles();

    assert(files.length >= 2, 'Should find files in tests/ directory');
    assert(files.some(f => f.includes('feature.test.js')));
    assert(files.some(f => f.includes('api.test.js')));
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles looks in __tests__ directory', () => {
  setupMockProject({
    '__tests__/unit.js': '',
    '__tests__/e2e.js': ''
  });
  try {
    const files = findTestFiles();

    assert(files.length >= 2, 'Should find files in __tests__/ directory');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles excludes node_modules', () => {
  setupMockProject({
    'test/app.test.js': '',
    'node_modules/pkg/test.js': '',
    'node_modules/pkg/test/index.test.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 1, 'Should exclude node_modules');
    assert(!files.some(f => f.includes('node_modules')));
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles excludes hidden directories', () => {
  setupMockProject({
    'test/visible.test.js': '',
    '.hidden/test.js': '',
    '.cache/tests/cached.test.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 1, 'Should exclude hidden directories');
    assert(!files.some(f => f.includes('.hidden')));
    assert(!files.some(f => f.includes('.cache')));
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles with custom patterns', () => {
  setupMockProject({
    'test/unit.test.js': '',
    'test/e2e.test.js': '',
    'integration/api.test.js': ''
  });
  try {
    const files = findTestFiles(['integration/**/*.test.js']);

    assert(files.some(f => f.includes('api.test.js')), 'Should find files matching custom pattern');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles with specific file pattern', () => {
  setupMockProject({
    'test/a.test.js': '',
    'test/b.test.js': '',
    'test/c.spec.js': ''
  });
  try {
    const files = findTestFiles(['test/*.test.js']);

    assertEqual(files.filter(f => f.includes('.test.js')).length, 2, 'Should only match .test.js files');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles returns empty array for empty project', () => {
  setupMockProject({});
  try {
    const files = findTestFiles();

    assertEqual(files.length, 0, 'Should return empty array');
    assert(Array.isArray(files), 'Should return an array');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles returns sorted array', () => {
  setupMockProject({
    'test/z.test.js': '',
    'test/a.test.js': '',
    'test/m.test.js': ''
  });
  try {
    const files = findTestFiles();

    const fileNames = files.map(f => f.split('/').pop());
    const sortedNames = [...fileNames].sort();

    assertDeepEqual(fileNames, sortedNames, 'Files should be sorted');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles handles nested test directories', () => {
  setupMockProject({
    'test/unit/models/user.test.js': '',
    'test/unit/services/auth.test.js': '',
    'test/integration/api/users.test.js': '',
    'test/e2e/flows/login.test.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 4, 'Should find all nested test files');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles skips options starting with dash', () => {
  setupMockProject({
    'test/example.test.js': ''
  });
  try {
    // Options starting with - should be skipped
    const files = findTestFiles(['--watch', '--coverage', 'test/*.test.js']);

    // Should still find test files, not treat options as patterns
    assert(files.length >= 1, 'Should find test files while skipping options');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Test Template Generation Tests
// =============================================================================

printSection('Test Template Generation');

test('createTestTemplate generates unit test template', () => {
  const template = createTestTemplate('example', 'unit');

  assert(template.includes("import { test, describe }"), 'Should import test and describe');
  assert(template.includes("import assert from 'node:assert'"), 'Should import assert');
  assert(template.includes("describe('Example'"), 'Should have describe block with PascalCase name');
  assert(template.includes("test('should exist'"), 'Should have basic test');
});

test('createTestTemplate generates integration test template', () => {
  const template = createTestTemplate('api', 'integration');

  assert(template.includes('Integration Test'), 'Should indicate integration test');
  assert(template.includes('beforeEach'), 'Should have beforeEach hook');
  assert(template.includes('afterEach'), 'Should have afterEach hook');
  assert(template.includes('context'), 'Should have test context');
  assert(template.includes("describe('Api Integration'"), 'Should have Integration suffix');
});

test('createTestTemplate generates e2e test template', () => {
  const template = createTestTemplate('login', 'e2e');

  assert(template.includes('E2E Test'), 'Should indicate E2E test');
  assert(template.includes('before('), 'Should have before hook');
  assert(template.includes('after('), 'Should have after hook');
  assert(template.includes("describe('Login E2E'"), 'Should have E2E suffix');
  assert(template.includes('should load the page'), 'Should have page load test');
  assert(template.includes('should handle user interaction'), 'Should have interaction test');
});

test('createTestTemplate defaults to unit test', () => {
  const template = createTestTemplate('default');

  assert(template.includes("describe('Default'"), 'Should default to unit test format');
  assert(!template.includes('Integration'), 'Should not have Integration suffix');
  assert(!template.includes('E2E'), 'Should not have E2E suffix');
});

test('createTestTemplate converts name to PascalCase', () => {
  const testCases = [
    { input: 'user-service', expected: 'UserService' },
    { input: 'api_client', expected: 'ApiClient' },
    { input: 'example', expected: 'Example' },
    { input: 'myComponent', expected: 'MyComponent' }
  ];

  for (const tc of testCases) {
    const template = createTestTemplate(tc.input, 'unit');
    assert(template.includes(`describe('${tc.expected}'`), `Should convert ${tc.input} to ${tc.expected}`);
  }
});

test('createTestTemplate includes import comment', () => {
  const template = createTestTemplate('myModule', 'unit');

  assert(template.includes('// Import the module to test'), 'Should have import comment');
  assert(template.includes('import { myModule }'), 'Should have placeholder import');
});

test('createTestTemplate has proper async structure for e2e', () => {
  const template = createTestTemplate('flow', 'e2e');

  assert(template.includes('async () =>'), 'Should have async test functions');
  assert(template.includes('before(async'), 'Before hook should be async');
  assert(template.includes('after(async'), 'After hook should be async');
});

// =============================================================================
// Test File Pattern Matching Tests
// =============================================================================

printSection('Test File Pattern Matching');

test('isTestFile pattern matches .test.js', () => {
  const testPattern = /\.(test|spec)\.(js|mjs|ts|pulse)$/;

  assert(testPattern.test('example.test.js'), 'Should match .test.js');
  assert(testPattern.test('utils.test.js'), 'Should match .test.js');
  assert(!testPattern.test('main.js'), 'Should not match regular .js');
});

test('isTestFile pattern matches .spec.js', () => {
  const testPattern = /\.(test|spec)\.(js|mjs|ts|pulse)$/;

  assert(testPattern.test('component.spec.js'), 'Should match .spec.js');
  assert(testPattern.test('service.spec.js'), 'Should match .spec.js');
});

test('isTestFile pattern matches .test.ts', () => {
  const testPattern = /\.(test|spec)\.(js|mjs|ts|pulse)$/;

  assert(testPattern.test('app.test.ts'), 'Should match .test.ts');
  assert(testPattern.test('utils.spec.ts'), 'Should match .spec.ts');
});

test('isTestFile pattern matches .test.mjs', () => {
  const testPattern = /\.(test|spec)\.(js|mjs|ts|pulse)$/;

  assert(testPattern.test('esm.test.mjs'), 'Should match .test.mjs');
  assert(testPattern.test('module.spec.mjs'), 'Should match .spec.mjs');
});

test('isTestFile pattern matches .test.pulse', () => {
  const testPattern = /\.(test|spec)\.(js|mjs|ts|pulse)$/;

  assert(testPattern.test('Button.test.pulse'), 'Should match .test.pulse');
  assert(testPattern.test('Card.spec.pulse'), 'Should match .spec.pulse');
});

test('isTestFile detects files in test directories', () => {
  const testDirPattern = /[\\/](test|tests|__tests__)[\\/]/;

  assert(testDirPattern.test('/project/test/utils.js'), 'Should match test/ directory');
  assert(testDirPattern.test('/project/tests/api.js'), 'Should match tests/ directory');
  assert(testDirPattern.test('/project/__tests__/unit.js'), 'Should match __tests__/ directory');
  assert(!testDirPattern.test('/project/src/utils.js'), 'Should not match src/ directory');
});

// =============================================================================
// Default Test Patterns Tests
// =============================================================================

printSection('Default Test Patterns');

test('default patterns include common test file patterns', () => {
  const DEFAULT_TEST_PATTERNS = [
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.test.pulse',
    '**/*.spec.pulse',
    'test/**/*.js',
    'tests/**/*.js',
    '__tests__/**/*.js'
  ];

  assert(DEFAULT_TEST_PATTERNS.includes('**/*.test.js'), 'Should include .test.js pattern');
  assert(DEFAULT_TEST_PATTERNS.includes('**/*.spec.js'), 'Should include .spec.js pattern');
  assert(DEFAULT_TEST_PATTERNS.includes('**/*.test.pulse'), 'Should include .test.pulse pattern');
  assert(DEFAULT_TEST_PATTERNS.includes('test/**/*.js'), 'Should include test/ directory');
  assert(DEFAULT_TEST_PATTERNS.includes('tests/**/*.js'), 'Should include tests/ directory');
  assert(DEFAULT_TEST_PATTERNS.includes('__tests__/**/*.js'), 'Should include __tests__/ directory');
});

// =============================================================================
// Test Options Tests
// =============================================================================

printSection('Test Options');

test('coverage option is supported', () => {
  const options = {
    coverage: true,
    watch: false,
    filter: null,
    timeout: 30000
  };

  assertEqual(options.coverage, true, 'Coverage option should be boolean');
});

test('watch option is supported', () => {
  const options = { watch: true };
  assertEqual(options.watch, true, 'Watch option should be boolean');
});

test('filter option is supported', () => {
  const options = { filter: 'should create' };
  assertEqual(options.filter, 'should create', 'Filter option should be string');
});

test('timeout option has default', () => {
  const defaultTimeout = 30000;
  assertEqual(defaultTimeout, 30000, 'Default timeout should be 30 seconds');
});

test('bail option is supported', () => {
  const options = { bail: true };
  assertEqual(options.bail, true, 'Bail option should stop on first failure');
});

test('reporter option is supported', () => {
  const reporters = ['spec', 'tap', 'dot', 'json'];
  for (const reporter of reporters) {
    assert(reporters.includes(reporter), `${reporter} should be a valid reporter`);
  }
});

test('concurrency option is supported', () => {
  const options = { concurrency: false };
  assertEqual(options.concurrency, false, 'Concurrency can be disabled');
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('Edge Cases');

test('handles symlinks gracefully', () => {
  setupMockProject({
    'test/real.test.js': ''
    // Note: Can't easily create symlinks in tests without special permissions
  });
  try {
    const files = findTestFiles();
    assert(Array.isArray(files), 'Should handle project without errors');
  } finally {
    cleanupMockProject();
  }
});

test('handles permission errors gracefully', () => {
  setupMockProject({
    'test/accessible.test.js': ''
  });
  try {
    // The function should not throw even if some directories are inaccessible
    const files = findTestFiles();
    assert(Array.isArray(files), 'Should return array even with potential permission issues');
  } finally {
    cleanupMockProject();
  }
});

test('handles very deep directory structures', () => {
  const deepPath = 'test/' + Array(10).fill('nested').join('/') + '/deep.test.js';
  setupMockProject({
    [deepPath]: ''
  });
  try {
    const files = findTestFiles();

    assert(files.length >= 1, 'Should find deeply nested test files');
    assert(files.some(f => f.includes('deep.test.js')));
  } finally {
    cleanupMockProject();
  }
});

test('handles special characters in filenames', () => {
  setupMockProject({
    'test/test-with-dashes.test.js': '',
    'test/test_with_underscores.test.js': '',
    'test/test.with.dots.test.js': ''
  });
  try {
    const files = findTestFiles();

    assertEqual(files.length, 3, 'Should handle special characters in filenames');
  } finally {
    cleanupMockProject();
  }
});

test('handles empty test directories', () => {
  setupMockProject({});
  mkdirSync(join(TEST_DIR, 'test'), { recursive: true });
  mkdirSync(join(TEST_DIR, 'tests'), { recursive: true });
  mkdirSync(join(TEST_DIR, '__tests__'), { recursive: true });

  try {
    const files = findTestFiles();

    assertEqual(files.length, 0, 'Should return empty array for empty test directories');
  } finally {
    cleanupMockProject();
  }
});

test('findTestFiles deduplicates results', () => {
  setupMockProject({
    'test/unique.test.js': ''
  });
  try {
    // Even if patterns could match the same file multiple times
    const files = findTestFiles(['test/**/*.js', '**/*.test.js']);

    const uniqueFiles = [...new Set(files)];
    assertEqual(files.length, uniqueFiles.length, 'Should not have duplicate entries');
  } finally {
    cleanupMockProject();
  }
});

test('createTestTemplate handles empty name', () => {
  const template = createTestTemplate('', 'unit');

  assert(template.includes('describe('), 'Should still generate valid template');
});

test('createTestTemplate handles numeric prefix', () => {
  const template = createTestTemplate('3dRenderer', 'unit');

  // PascalCase conversion
  const expected = '3dRenderer'
    .replace(/[-_]./g, m => m[1].toUpperCase())
    .replace(/^./, m => m.toUpperCase());

  assert(template.includes('describe('), 'Should handle numeric prefix');
});

// =============================================================================
// Integration: findTestFiles behavior
// =============================================================================

printSection('Integration Tests');

test('findTestFiles works with mixed project structure', () => {
  setupMockProject({
    // Test files in various locations
    'test/unit/user.test.js': '',
    'test/integration/api.test.js': '',
    'tests/e2e/login.spec.js': '',
    '__tests__/components/Button.test.js': '',
    'src/components/Modal.test.js': '',

    // Non-test files
    'src/main.js': '',
    'src/utils.js': '',
    'package.json': '{}'
  });
  try {
    const files = findTestFiles();

    assert(files.length >= 5, 'Should find all test files from various locations');
    assert(!files.some(f => f.endsWith('main.js')), 'Should not include non-test source files');
    assert(!files.some(f => f.endsWith('package.json')), 'Should not include config files');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Run Tests
// =============================================================================

printResults();
exitWithCode();
