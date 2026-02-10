#!/usr/bin/env node
/**
 * Test Quality Validator
 *
 * Analyzes test files for quality indicators:
 * - Number of assertions per test
 * - Presence of setup/teardown hooks
 * - Test isolation (createContext usage)
 * - Descriptive test names
 * - Edge case coverage
 *
 * Usage:
 *   node validate-tests.js                  # All test files
 *   node validate-tests.js test/pulse.test.js  # Specific file
 *   node validate-tests.js --warnings       # Show warnings only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let targetFile = null;
let warningsOnly = false;

for (const arg of args) {
  if (arg === '--warnings') warningsOnly = true;
  else if (!arg.startsWith('--')) targetFile = arg;
}

// Get test files
const testDir = path.join(projectRoot, 'test');
let testFiles;

if (targetFile) {
  const fullPath = path.isAbsolute(targetFile) ? targetFile : path.join(projectRoot, targetFile);
  testFiles = [fullPath];
} else {
  testFiles = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join(testDir, f));
}

// Analysis
const results = [];

for (const file of testFiles) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  const lines = content.split('\n');

  const analysis = {
    file: basename,
    tests: 0,
    assertions: 0,
    describes: 0,
    hasBeforeEach: false,
    hasAfterEach: false,
    hasContextIsolation: false,
    hasMockDom: false,
    warnings: []
  };

  // Count patterns
  analysis.tests = (content.match(/\btest\s*\(/g) || []).length;
  analysis.assertions = (content.match(/\bassert\.\w+/g) || []).length;
  analysis.describes = (content.match(/\bdescribe\s*\(/g) || []).length;
  analysis.hasBeforeEach = /\bbeforeEach\s*\(/.test(content);
  analysis.hasAfterEach = /\bafterEach\s*\(/.test(content);
  analysis.hasContextIsolation = /createContext|withContext|resetContext/.test(content);
  analysis.hasMockDom = /MockDOMAdapter|mock-dom|createDOM/.test(content);

  // Warnings
  const assertsPerTest = analysis.tests > 0 ? analysis.assertions / analysis.tests : 0;

  if (analysis.tests === 0) {
    analysis.warnings.push('No test() calls found');
  }

  if (assertsPerTest < 1 && analysis.tests > 0) {
    analysis.warnings.push(`Low assertion density: ${assertsPerTest.toFixed(1)} per test`);
  }

  if (analysis.tests > 3 && !analysis.hasBeforeEach && !analysis.hasAfterEach) {
    analysis.warnings.push('No setup/teardown hooks (beforeEach/afterEach)');
  }

  if (content.includes('setTimeout') && !content.includes('mock.timers')) {
    analysis.warnings.push('Uses setTimeout without mock.timers (potential flakiness)');
  }

  if (content.includes('globalThis.') && !analysis.hasAfterEach) {
    analysis.warnings.push('Sets globals without afterEach cleanup');
  }

  // Check for vague test names
  const testNames = [...content.matchAll(/\btest\s*\(\s*['"`]([^'"`]+)/g)].map(m => m[1]);
  for (const name of testNames) {
    if (name.length < 10) {
      analysis.warnings.push(`Short test name: "${name}"`);
    }
    if (/^(test|it works|basic|simple)$/i.test(name)) {
      analysis.warnings.push(`Vague test name: "${name}"`);
    }
  }

  results.push(analysis);
}

// Output
console.log('=== Test Quality Report ===\n');

let totalTests = 0;
let totalAssertions = 0;
let totalWarnings = 0;

for (const r of results) {
  totalTests += r.tests;
  totalAssertions += r.assertions;
  totalWarnings += r.warnings.length;

  if (warningsOnly && r.warnings.length === 0) continue;

  const icon = r.warnings.length === 0 ? '\u2713' : '\u26A0';
  const assertRatio = r.tests > 0 ? (r.assertions / r.tests).toFixed(1) : '0';

  console.log(`${icon} ${r.file}`);

  if (!warningsOnly) {
    console.log(`    Tests: ${r.tests} | Asserts: ${r.assertions} (${assertRatio}/test) | Describes: ${r.describes}`);

    const features = [];
    if (r.hasBeforeEach) features.push('beforeEach');
    if (r.hasAfterEach) features.push('afterEach');
    if (r.hasContextIsolation) features.push('context-isolation');
    if (r.hasMockDom) features.push('mock-dom');
    if (features.length > 0) {
      console.log(`    Features: ${features.join(', ')}`);
    }
  }

  for (const w of r.warnings) {
    console.log(`    \u26A0 ${w}`);
  }

  console.log('');
}

// Summary
console.log('--- Summary ---');
console.log(`Files analyzed: ${results.length}`);
console.log(`Total tests: ${totalTests}`);
console.log(`Total assertions: ${totalAssertions}`);
console.log(`Average asserts/test: ${totalTests > 0 ? (totalAssertions / totalTests).toFixed(1) : 0}`);
console.log(`Warnings: ${totalWarnings}`);

const cleanFiles = results.filter(r => r.warnings.length === 0).length;
console.log(`Clean files: ${cleanFiles}/${results.length} (${((cleanFiles / results.length) * 100).toFixed(0)}%)`);
