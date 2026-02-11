#!/usr/bin/env node

/**
 * Pulse Benchmark Runner
 *
 * Executes benchmark suites and outputs results.
 *
 * Usage:
 *   node benchmarks/index.js                # Human-readable table output
 *   node benchmarks/index.js --json         # JSON output (for CI/tracking)
 *   node benchmarks/index.js --filter react # Run only suites matching "react"
 *   node benchmarks/index.js --save         # Save results as baseline
 *   node benchmarks/index.js --compare      # Compare against saved baseline
 *
 * @module benchmarks/index
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { formatResults } from './utils.js';

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const shouldSave = args.includes('--save');
const shouldCompare = args.includes('--compare');
const filterIdx = args.indexOf('--filter');
const filterTerm = filterIdx !== -1 ? args[filterIdx + 1]?.toLowerCase() : null;

const BASELINE_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), 'results', 'baseline.json');
const REGRESSION_THRESHOLD = 0.10; // 10% slower = regression warning

async function discoverSuites() {
  const benchDir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs.readdirSync(benchDir)
    .filter(f => f.endsWith('.bench.js'))
    .sort();

  const suites = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(benchDir, file)).href);
    // Find the exported run* function
    const runFn = Object.values(mod).find(
      v => typeof v === 'function' && v.name.startsWith('run')
    );
    if (runFn) {
      suites.push({ file, name: file.replace('.bench.js', ''), runFn });
    }
  }
  return suites;
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveBaseline(data) {
  const dir = path.dirname(BASELINE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2));
}

function compareWithBaseline(current, baseline) {
  if (!baseline || !baseline.suites) return [];

  const regressions = [];
  const baselineLookup = new Map();

  for (const suite of baseline.suites) {
    for (const result of (suite.results || [])) {
      baselineLookup.set(`${suite.name}::${result.name}`, result);
    }
  }

  for (const suite of current) {
    for (const result of (suite.results || [])) {
      const key = `${suite.name}::${result.name}`;
      const base = baselineLookup.get(key);
      if (!base) continue;

      const change = (result.mean - base.mean) / base.mean;
      if (change > REGRESSION_THRESHOLD) {
        regressions.push({
          suite: suite.name,
          benchmark: result.name,
          baseline: base.mean,
          current: result.mean,
          changePercent: Math.round(change * 100)
        });
      }
    }
  }

  return regressions;
}

async function main() {
  const discovered = await discoverSuites();
  const suites = [];

  if (!isJson) {
    console.log('Pulse Framework Benchmarks');
    console.log('='.repeat(40));
    if (filterTerm) console.log(`Filter: "${filterTerm}"`);
    console.log('');
  }

  for (const { file, name, runFn } of discovered) {
    // Apply filter
    if (filterTerm && !name.toLowerCase().includes(filterTerm)) {
      continue;
    }

    try {
      const result = await runFn();
      if (result && !result.skipped) {
        suites.push(result);
        if (!isJson) console.log(formatResults(result));
      } else if (!isJson && result?.skipped) {
        console.log(`\n  ${result.name || name} (skipped)\n`);
      }
    } catch (err) {
      if (!isJson) {
        console.log(`\n  ${name} (error: ${err.message})\n`);
      }
    }
  }

  // Compare with baseline
  let regressions = [];
  if (shouldCompare) {
    const baseline = loadBaseline();
    if (baseline) {
      regressions = compareWithBaseline(suites, baseline);

      if (!isJson) {
        if (regressions.length === 0) {
          console.log('\n  No performance regressions detected.\n');
        } else {
          console.log(`\n  WARNING: ${regressions.length} performance regression(s) detected:`);
          for (const r of regressions) {
            console.log(`    - ${r.suite} / ${r.benchmark}: +${r.changePercent}% slower (${r.baseline.toFixed(3)}ms -> ${r.current.toFixed(3)}ms)`);
          }
          console.log('');
        }
      }
    } else if (!isJson) {
      console.log('\n  No baseline found. Run with --save first.\n');
    }
  }

  // Save baseline
  if (shouldSave) {
    const data = {
      framework: 'pulse-js-framework',
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      suites
    };
    saveBaseline(data);
    if (!isJson) {
      console.log(`\n  Baseline saved to ${BASELINE_PATH}\n`);
    }
  }

  if (isJson) {
    const output = {
      framework: 'pulse-js-framework',
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      suites,
      regressions: shouldCompare ? regressions : undefined
    };
    console.log(JSON.stringify(output, null, 2));
  } else if (!shouldSave && !shouldCompare) {
    console.log('\nDone.');
  }

  // Exit with error code if regressions found
  if (shouldCompare && regressions.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
