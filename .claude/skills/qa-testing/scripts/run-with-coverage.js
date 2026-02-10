#!/usr/bin/env node
/**
 * Run Tests with Coverage Summary
 *
 * Runs a test file or the full suite with c8 coverage,
 * then prints a summary of coverage gaps.
 *
 * Usage:
 *   node run-with-coverage.js                    # Full suite
 *   node run-with-coverage.js test/pulse.test.js # Single file
 *   node run-with-coverage.js --threshold 80     # Custom threshold
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let testTarget = null;
let threshold = 70;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--threshold' && args[i + 1]) {
    threshold = parseInt(args[++i], 10);
  } else if (!args[i].startsWith('--')) {
    testTarget = args[i];
  }
}

// Build command
let cmd;
if (testTarget) {
  const testPath = path.isAbsolute(testTarget) ? testTarget : path.join(projectRoot, testTarget);
  cmd = `npx c8 --reporter=text --reporter=json-summary node --test "${testPath}"`;
} else {
  cmd = `npx c8 --reporter=text --reporter=json-summary npm test`;
}

console.log(`Running: ${cmd}\n`);
console.log('='.repeat(60));

try {
  execSync(cmd, {
    cwd: projectRoot,
    stdio: 'inherit',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 600000 // 10 minutes
  });
} catch (err) {
  if (err.status) {
    console.error(`\nTests exited with code ${err.status}`);
  }
}

// Check coverage summary if available
const summaryPath = path.join(projectRoot, 'coverage', 'coverage-summary.json');
try {
  const { default: summary } = await import(`file://${summaryPath}`, { assert: { type: 'json' } });
  const total = summary.total;

  console.log('\n' + '='.repeat(60));
  console.log('COVERAGE SUMMARY');
  console.log('='.repeat(60));

  const metrics = ['lines', 'statements', 'branches', 'functions'];
  let allPass = true;

  for (const metric of metrics) {
    if (total[metric]) {
      const pct = total[metric].pct;
      const pass = pct >= threshold;
      if (!pass) allPass = false;
      const icon = pass ? '\u2713' : '\u2717';
      console.log(`  ${icon} ${metric.padEnd(12)} ${pct.toFixed(1)}% ${pass ? '' : `(< ${threshold}%)`}`);
    }
  }

  console.log('');
  if (allPass) {
    console.log(`\u2713 All metrics meet ${threshold}% threshold`);
  } else {
    console.log(`\u2717 Some metrics below ${threshold}% threshold`);
    process.exitCode = 1;
  }
} catch {
  // Coverage summary not available, that's ok
}
