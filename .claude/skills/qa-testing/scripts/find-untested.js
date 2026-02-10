#!/usr/bin/env node
/**
 * Find Untested Modules
 *
 * Scans runtime/, compiler/, cli/, and loader/ directories for source files
 * that don't have corresponding test files.
 *
 * Usage:
 *   node find-untested.js [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

const verbose = process.argv.includes('--verbose');

// Source directories to scan
const sourceDirs = ['runtime', 'compiler', 'cli', 'loader'];

// Get all test files
const testDir = path.join(projectRoot, 'test');
const testFiles = fs.existsSync(testDir)
  ? fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'))
  : [];

const testBasenames = new Set(
  testFiles.map(f => f.replace(/(-edge-cases|-stress|-coverage|-advanced|-enhanced)?\.test\.js$/, ''))
);

// Scan source files
const results = { tested: [], untested: [], skipped: [] };

for (const dir of sourceDirs) {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const basename = file.replace('.js', '');
    const fullPath = `${dir}/${file}`;

    // Skip index files and internal utilities
    if (basename === 'index' || basename.startsWith('_')) {
      results.skipped.push(fullPath);
      continue;
    }

    // Check for test coverage (fuzzy match)
    const hasTest = testBasenames.has(basename)
      || testBasenames.has(basename.replace(/-/g, ''))
      || testFiles.some(t => t.toLowerCase().includes(basename.toLowerCase()));

    if (hasTest) {
      results.tested.push(fullPath);
    } else {
      results.untested.push(fullPath);
    }
  }
}

// Output
console.log('=== Pulse Framework - Test Coverage Report ===\n');

if (results.untested.length > 0) {
  console.log(`\u2717 UNTESTED (${results.untested.length} files):`);
  for (const f of results.untested.sort()) {
    console.log(`  - ${f}`);
  }
  console.log('');
}

console.log(`\u2713 TESTED (${results.tested.length} files)`);
if (verbose) {
  for (const f of results.tested.sort()) {
    console.log(`  - ${f}`);
  }
}
console.log('');

if (results.skipped.length > 0 && verbose) {
  console.log(`\u25CB SKIPPED (${results.skipped.length} files)`);
  for (const f of results.skipped.sort()) {
    console.log(`  - ${f}`);
  }
  console.log('');
}

// Summary
const total = results.tested.length + results.untested.length;
const coverage = total > 0 ? ((results.tested.length / total) * 100).toFixed(1) : 0;
console.log(`--- Summary ---`);
console.log(`Total source files: ${total}`);
console.log(`Tested: ${results.tested.length} (${coverage}%)`);
console.log(`Untested: ${results.untested.length}`);
console.log(`Skipped: ${results.skipped.length}`);

if (results.untested.length > 0) {
  console.log(`\nTo generate a test file:`);
  console.log(`  node .claude/skills/qa-testing/scripts/generate-test.js ${results.untested[0]}`);
}
