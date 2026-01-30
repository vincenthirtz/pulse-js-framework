/**
 * Analyze Command Tests
 *
 * Tests for bundle analysis and file utilities
 *
 * @module test/analyze
 */

import { strict as assert } from 'node:assert';
import { buildImportGraph } from '../cli/analyze.js';
import { findPulseFiles, formatBytes, parseArgs } from '../cli/utils/file-utils.js';
import {
  test,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

printSection('Analyze Tests');

// =============================================================================
// File Utils Tests
// =============================================================================

test('formatBytes formats bytes correctly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(500), '500 B');
});

test('parseArgs parses options correctly', () => {
  const { options, patterns } = parseArgs(['--json', '--verbose', 'src/']);

  assert.equal(options.json, true);
  assert.equal(options.verbose, true);
  assert.equal(patterns.length, 1);
  assert.equal(patterns[0], 'src/');
});

test('parseArgs handles flag without value', () => {
  const { options } = parseArgs(['--check']);

  assert.equal(options.check, true);
});

test('parseArgs handles multiple patterns', () => {
  const { patterns } = parseArgs(['src/', 'lib/', '*.pulse']);

  assert.deepEqual(patterns, ['src/', 'lib/', '*.pulse']);
});

test('parseArgs skips options in patterns', () => {
  const { patterns } = parseArgs(['--fix', 'src/']);

  assert.deepEqual(patterns, ['src/']);
});

// =============================================================================
// File Discovery Tests
// =============================================================================

test('findPulseFiles returns array', () => {
  const files = findPulseFiles(['nonexistent']);

  assert(Array.isArray(files), 'Should return array');
});

test('findPulseFiles with custom extensions', () => {
  const files = findPulseFiles(['.'], { extensions: ['.js'] });

  assert(Array.isArray(files), 'Should return array');
  // Should find .js files if any exist
});

// =============================================================================
// Import Graph Tests
// =============================================================================

test('buildImportGraph returns correct structure', async () => {
  const { parse } = await import('../compiler/index.js');

  // Test with empty array
  const graph = await buildImportGraph([], parse);

  assert(Array.isArray(graph.nodes), 'Should have nodes array');
  assert(Array.isArray(graph.edges), 'Should have edges array');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
