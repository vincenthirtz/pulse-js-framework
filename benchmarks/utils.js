/**
 * Benchmark Utilities - Pulse Framework
 *
 * Minimal benchmark harness using performance.now() for reproducible measurements.
 *
 * @module benchmarks/utils
 */

/**
 * Run a single benchmark function and measure its execution time.
 *
 * @param {string} name - Benchmark name
 * @param {Function} fn - Function to benchmark
 * @param {Object} [options] - Configuration
 * @param {number} [options.iterations=100] - Number of iterations
 * @param {number} [options.warmup=10] - Warmup iterations (not measured)
 * @returns {Promise<Object>} Benchmark result
 */
export async function bench(name, fn, options = {}) {
  const { iterations = 100, warmup = 10 } = options;

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Force GC if available
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }

  // Measurement phase
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const median = times[Math.floor(times.length / 2)];
  const min = times[0];
  const max = times[times.length - 1];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  // Standard deviation
  const variance = times.reduce((acc, t) => acc + (t - mean) ** 2, 0) / times.length;
  const stddev = Math.sqrt(variance);

  // Ops per second based on mean
  const opsPerSec = mean > 0 ? Math.round(1000 / mean) : Infinity;

  return {
    name,
    iterations,
    mean: round(mean),
    median: round(median),
    min: round(min),
    max: round(max),
    p95: round(p95),
    p99: round(p99),
    stddev: round(stddev),
    opsPerSec
  };
}

/**
 * Run a suite of benchmarks.
 *
 * @param {string} name - Suite name
 * @param {Array<Function>} benchmarks - Array of async benchmark functions
 * @returns {Promise<Object>} Suite results
 */
export async function suite(name, benchmarks) {
  const results = [];

  for (const benchFn of benchmarks) {
    const result = await benchFn;
    results.push(result);
  }

  return { name, results, timestamp: new Date().toISOString() };
}

/**
 * Format benchmark results as a readable table.
 *
 * @param {Object} suiteResult - Result from suite()
 * @returns {string} Formatted table
 */
export function formatResults(suiteResult) {
  const { name, results } = suiteResult;
  const lines = [];

  lines.push(`\n  ${name}`);
  lines.push('  ' + '-'.repeat(90));
  lines.push(
    '  ' +
    pad('Benchmark', 40) +
    pad('Mean', 10) +
    pad('Median', 10) +
    pad('P95', 10) +
    pad('Ops/s', 12) +
    pad('±%', 8)
  );
  lines.push('  ' + '-'.repeat(90));

  for (const r of results) {
    const cv = r.mean > 0 ? round((r.stddev / r.mean) * 100) : 0;
    lines.push(
      '  ' +
      pad(r.name, 40) +
      pad(formatTime(r.mean), 10) +
      pad(formatTime(r.median), 10) +
      pad(formatTime(r.p95), 10) +
      pad(formatNumber(r.opsPerSec), 12) +
      pad(`±${cv}%`, 8)
    );
  }

  lines.push('  ' + '-'.repeat(90));
  return lines.join('\n');
}

/**
 * Format time in appropriate units.
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time
 */
function formatTime(ms) {
  if (ms < 0.001) return `${round(ms * 1_000_000)}ns`;
  if (ms < 1) return `${round(ms * 1000)}µs`;
  if (ms < 1000) return `${round(ms)}ms`;
  return `${round(ms / 1000)}s`;
}

/**
 * Format a number with thousands separators.
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/**
 * Pad a string to a fixed width.
 * @param {string} str
 * @param {number} width
 * @returns {string}
 */
function pad(str, width) {
  return String(str).padEnd(width);
}

/**
 * Round to 3 decimal places.
 * @param {number} n
 * @returns {number}
 */
function round(n) {
  return Math.round(n * 1000) / 1000;
}
