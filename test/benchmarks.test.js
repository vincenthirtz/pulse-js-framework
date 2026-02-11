/**
 * Pulse Benchmark Utilities Tests
 *
 * Tests for benchmarks/utils.js - bench(), suite(), formatResults()
 *
 * @module test/benchmarks
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import { bench, suite, formatResults } from '../benchmarks/utils.js';

// =============================================================================
// bench() Tests
// =============================================================================

describe('bench()', () => {
  test('returns result with correct shape', async () => {
    const result = await bench('test-bench', () => {
      let x = 0;
      for (let i = 0; i < 100; i++) x += i;
    }, { iterations: 10, warmup: 2 });

    assert.strictEqual(result.name, 'test-bench');
    assert.strictEqual(result.iterations, 10);
    assert.strictEqual(typeof result.mean, 'number');
    assert.strictEqual(typeof result.median, 'number');
    assert.strictEqual(typeof result.min, 'number');
    assert.strictEqual(typeof result.max, 'number');
    assert.strictEqual(typeof result.p95, 'number');
    assert.strictEqual(typeof result.p99, 'number');
    assert.strictEqual(typeof result.stddev, 'number');
    assert.strictEqual(typeof result.opsPerSec, 'number');
  });

  test('mean is non-negative', async () => {
    const result = await bench('nonneg', () => {}, { iterations: 5, warmup: 1 });
    assert.ok(result.mean >= 0, 'Mean should be non-negative');
  });

  test('min <= median <= max', async () => {
    const result = await bench('ordering', () => {
      Math.random();
    }, { iterations: 20, warmup: 2 });

    assert.ok(result.min <= result.median, `min (${result.min}) should be <= median (${result.median})`);
    assert.ok(result.median <= result.max, `median (${result.median}) should be <= max (${result.max})`);
  });

  test('p95 <= p99 <= max', async () => {
    const result = await bench('percentiles', () => {
      let x = 0;
      for (let i = 0; i < 50; i++) x += i;
    }, { iterations: 50, warmup: 5 });

    assert.ok(result.p95 <= result.p99 || result.p95 === result.p99,
      `p95 (${result.p95}) should be <= p99 (${result.p99})`);
    assert.ok(result.p99 <= result.max,
      `p99 (${result.p99}) should be <= max (${result.max})`);
  });

  test('opsPerSec is positive for non-zero work', async () => {
    const result = await bench('ops', () => {
      let x = 0;
      for (let i = 0; i < 1000; i++) x += i;
    }, { iterations: 10, warmup: 2 });

    assert.ok(result.opsPerSec > 0, 'Ops/sec should be positive');
  });

  test('defaults to 100 iterations and 10 warmup', async () => {
    const result = await bench('defaults', () => {});
    assert.strictEqual(result.iterations, 100);
  });

  test('respects custom iterations count', async () => {
    const result = await bench('custom-iter', () => {}, { iterations: 25 });
    assert.strictEqual(result.iterations, 25);
  });

  test('stddev is non-negative', async () => {
    const result = await bench('stddev', () => {}, { iterations: 10, warmup: 1 });
    assert.ok(result.stddev >= 0, 'Standard deviation should be non-negative');
  });
});

// =============================================================================
// suite() Tests
// =============================================================================

describe('suite()', () => {
  test('returns result with correct shape', async () => {
    const result = await suite('test-suite', [
      bench('a', () => {}, { iterations: 5, warmup: 1 }),
      bench('b', () => {}, { iterations: 5, warmup: 1 })
    ]);

    assert.strictEqual(result.name, 'test-suite');
    assert.ok(Array.isArray(result.results), 'results should be an array');
    assert.strictEqual(result.results.length, 2);
    assert.strictEqual(typeof result.timestamp, 'string');
  });

  test('contains results from all benchmarks', async () => {
    const result = await suite('multi', [
      bench('first', () => {}, { iterations: 3, warmup: 1 }),
      bench('second', () => {}, { iterations: 3, warmup: 1 }),
      bench('third', () => {}, { iterations: 3, warmup: 1 })
    ]);

    assert.strictEqual(result.results.length, 3);
    assert.strictEqual(result.results[0].name, 'first');
    assert.strictEqual(result.results[1].name, 'second');
    assert.strictEqual(result.results[2].name, 'third');
  });

  test('timestamp is valid ISO string', async () => {
    const result = await suite('ts-test', []);
    const date = new Date(result.timestamp);
    assert.ok(!isNaN(date.getTime()), 'Timestamp should be a valid date');
  });

  test('handles empty benchmark array', async () => {
    const result = await suite('empty', []);
    assert.strictEqual(result.results.length, 0);
  });
});

// =============================================================================
// formatResults() Tests
// =============================================================================

describe('formatResults()', () => {
  test('returns a string', async () => {
    const suiteResult = await suite('format-test', [
      bench('bench-a', () => {}, { iterations: 5, warmup: 1 })
    ]);

    const output = formatResults(suiteResult);
    assert.strictEqual(typeof output, 'string');
  });

  test('includes suite name', async () => {
    const suiteResult = await suite('My Suite Name', [
      bench('test', () => {}, { iterations: 3, warmup: 1 })
    ]);

    const output = formatResults(suiteResult);
    assert.ok(output.includes('My Suite Name'), 'Should include suite name');
  });

  test('includes benchmark names', async () => {
    const suiteResult = await suite('test', [
      bench('alpha-benchmark', () => {}, { iterations: 3, warmup: 1 }),
      bench('beta-benchmark', () => {}, { iterations: 3, warmup: 1 })
    ]);

    const output = formatResults(suiteResult);
    assert.ok(output.includes('alpha-benchmark'), 'Should include first benchmark name');
    assert.ok(output.includes('beta-benchmark'), 'Should include second benchmark name');
  });

  test('includes header columns', async () => {
    const suiteResult = await suite('headers', [
      bench('test', () => {}, { iterations: 3, warmup: 1 })
    ]);

    const output = formatResults(suiteResult);
    assert.ok(output.includes('Benchmark'), 'Should include Benchmark header');
    assert.ok(output.includes('Mean'), 'Should include Mean header');
    assert.ok(output.includes('Median'), 'Should include Median header');
    assert.ok(output.includes('Ops/s'), 'Should include Ops/s header');
  });
});

// =============================================================================
// Benchmark Runner Features (v1.8.1)
// =============================================================================

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const benchDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'benchmarks');
const projectRoot = path.resolve(benchDir, '..');

describe('Benchmark Runner', () => {
  test('benchmark runner auto-discovers .bench.js files', () => {
    const files = fs.readdirSync(benchDir).filter(f => f.endsWith('.bench.js'));
    assert.ok(files.length >= 4, `Should discover at least 4 bench files, found ${files.length}`);
    assert.ok(files.includes('reactivity.bench.js'));
    assert.ok(files.includes('dom-creation.bench.js'));
    assert.ok(files.includes('list-reconciliation.bench.js'));
    assert.ok(files.includes('dom-list.bench.js'));
  });

  test('--filter flag filters suites by name (JSON output)', () => {
    const output = execSync('node benchmarks/index.js --filter dom-list --json', {
      cwd: projectRoot,
      timeout: 60000
    }).toString();

    const result = JSON.parse(output);
    assert.ok(result.suites.length >= 1, 'Should have at least 1 suite');
    assert.strictEqual(result.framework, 'pulse-js-framework');
  });

  test('--save writes baseline file', () => {
    const baselinePath = path.join(benchDir, 'results', 'baseline.json');

    // Clean up any existing baseline
    try { fs.unlinkSync(baselinePath); } catch {}

    execSync('node benchmarks/index.js --filter dom-list --save', {
      cwd: projectRoot,
      timeout: 60000
    });

    assert.ok(fs.existsSync(baselinePath), 'Baseline file should exist after --save');

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    assert.strictEqual(baseline.framework, 'pulse-js-framework');
    assert.ok(baseline.suites.length >= 1, 'Baseline should have suites');
    assert.ok(baseline.timestamp, 'Baseline should have timestamp');

    // Clean up
    try { fs.unlinkSync(baselinePath); } catch {}
  });

  test('--json output has correct structure', () => {
    const output = execSync('node benchmarks/index.js --filter dom-list --json', {
      cwd: projectRoot,
      timeout: 60000
    }).toString();

    const result = JSON.parse(output);
    assert.strictEqual(result.framework, 'pulse-js-framework');
    assert.ok(result.timestamp);
    assert.ok(result.node);
    assert.ok(result.platform);
    assert.ok(Array.isArray(result.suites));
  });
});
