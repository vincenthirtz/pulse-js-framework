#!/usr/bin/env node

/**
 * Pulse Benchmark Runner
 *
 * Executes all benchmark suites and outputs results.
 *
 * Usage:
 *   node benchmarks/index.js           # Human-readable table output
 *   node benchmarks/index.js --json    # JSON output (for CI/tracking)
 *
 * @module benchmarks/index
 */

import { formatResults } from './utils.js';
import { runReactivityBenchmarks } from './reactivity.bench.js';
import { runDOMCreationBenchmarks } from './dom-creation.bench.js';
import { runListReconciliationBenchmarks } from './list-reconciliation.bench.js';
import { runSSRBenchmarks } from './ssr.bench.js';

const isJson = process.argv.includes('--json');

async function main() {
  const suites = [];

  console.log('Pulse Framework Benchmarks');
  console.log('='.repeat(40));
  console.log('');

  // Run all suites
  const reactivity = await runReactivityBenchmarks();
  suites.push(reactivity);
  if (!isJson) console.log(formatResults(reactivity));

  const domCreation = await runDOMCreationBenchmarks();
  suites.push(domCreation);
  if (!isJson) console.log(formatResults(domCreation));

  const listReconciliation = await runListReconciliationBenchmarks();
  suites.push(listReconciliation);
  if (!isJson) console.log(formatResults(listReconciliation));

  const ssr = await runSSRBenchmarks();
  if (!ssr.skipped) {
    suites.push(ssr);
    if (!isJson) console.log(formatResults(ssr));
  } else if (!isJson) {
    console.log('\n  SSR (skipped - module not available)\n');
  }

  if (isJson) {
    const output = {
      framework: 'pulse-js-framework',
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      suites
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('\nDone.');
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
