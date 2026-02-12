#!/usr/bin/env node

/**
 * Parallel test runner that executes all test suites and reports results.
 * Groups tests by domain and runs each group in parallel.
 * Designed to be robust for CI environments like GitHub Actions.
 */

import { spawn } from 'child_process';
import { cpus } from 'os';

// Test suites grouped by domain for organized output.
// All groups run their tests concurrently (up to concurrency limit).
const testGroups = {
  compiler: [
    'test:compiler',
    'test:sourcemap',
    'test:css-parsing',
    'test:preprocessor',
  ],
  reactivity: [
    'test:pulse',
  ],
  dom: [
    'test:dom',
    'test:dom-element',
    'test:dom-list',
    'test:dom-conditional',
    'test:dom-lifecycle',
    'test:dom-selector',
    'test:dom-adapter',
    'test:dom-advanced',
    'test:dom-recycle',
    'test:dom-virtual-list',
    'test:dom-event-delegate',
    'test:dom-binding',
    'test:enhanced-mock-adapter',
  ],
  routing: [
    'test:router',
  ],
  state: [
    'test:store',
    'test:context',
    'test:context-stress',
  ],
  forms: [
    'test:form',
    'test:form-v2',
    'test:form-edge-cases',
    'test:form-coverage',
  ],
  async: [
    'test:async',
    'test:async-coverage',
    'test:http',
    'test:http-edge-cases',
    'test:websocket',
    'test:websocket-stress',
    'test:graphql',
    'test:graphql-coverage',
    'test:graphql-subscriptions',
  ],
  infra: [
    'test:hmr',
    'test:logger',
    'test:logger-prod',
    'test:errors',
    'test:lru-cache',
    'test:utils',
    'test:utils-coverage',
    'test:security',
    'test:interceptor-manager',
    'test:memory-cleanup',
    'test:native',
    'test:devtools',
  ],
  cli: [
    'test:lint',
    'test:format',
    'test:analyze',
    'test:cli',
    'test:cli-ui',
    'test:cli-create',
    'test:docs',
    'test:docs-nav',
    'test:doctor',
    'test:scaffold',
    'test:test-runner',
    'test:build',
  ],
  ssr: [
    'test:ssr',
    'test:ssr-hydrator',
    'test:ssr-stream',
    'test:ssr-mismatch',
    'test:ssr-preload',
    'test:ssr-directives',
    'test:ssg',
    'test:server-adapters',
  ],
  loaders: [
    'test:vite-plugin',
    'test:webpack-loader',
    'test:rollup-plugin',
    'test:esbuild-plugin',
    'test:parcel-plugin',
    'test:swc-plugin',
    'test:dev-server',
  ],
  integration: [
    'test:integration',
    'test:integration-advanced',
    'test:a11y',
    'test:a11y-enhanced',
  ],
};

const TIMEOUT_MS = 60_000;
const MAX_BUFFER = 10 * 1024 * 1024;
const CONCURRENCY = Math.max(4, cpus().length);

/**
 * Run a single test script via `npm run <script>`.
 * Returns a promise that resolves with the result.
 */
function runTest(script) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = spawn('npm', ['run', script], {
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > MAX_BUFFER) stdout = stdout.slice(-MAX_BUFFER);
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > MAX_BUFFER) stderr = stderr.slice(-MAX_BUFFER);
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGKILL');
        resolve({
          script,
          passed: false,
          duration: TIMEOUT_MS,
          error: `Timed out after ${TIMEOUT_MS / 1000}s`,
          output: '',
        });
      }
    }, TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;

      const duration = Date.now() - startTime;
      if (code === 0) {
        resolve({ script, passed: true, duration, error: null, output: '' });
      } else {
        const combined = stdout + stderr;
        const errorMatch = combined.match(/Error: (.+)/) || combined.match(/Failed: (\d+)/);
        resolve({
          script,
          passed: false,
          duration,
          error: errorMatch ? errorMatch[1] : `Exit code ${code}`,
          output: combined.slice(-2000),
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      resolve({
        script,
        passed: false,
        duration: Date.now() - startTime,
        error: err.message,
        output: '',
      });
    });
  });
}

/**
 * Run tests with a concurrency pool.
 */
async function runWithConcurrency(scripts, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < scripts.length) {
      const i = index++;
      results[i] = await runTest(scripts[i]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, scripts.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Format duration for display.
 */
function formatDuration(ms) {
  if (ms >= 10_000) return (ms / 1000).toFixed(1) + 's';
  if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
  return ms + 'ms';
}

/**
 * Main test runner.
 */
async function runAllTests() {
  const allScripts = Object.values(testGroups).flat();
  console.log(`\n  Running ${allScripts.length} test suites (concurrency: ${CONCURRENCY})...\n`);

  const startTime = Date.now();

  // Run all tests in parallel with concurrency limit
  const allResults = await runWithConcurrency(allScripts, CONCURRENCY);

  const totalDuration = Date.now() - startTime;

  // Build results indexed by script name
  const resultMap = new Map(allResults.map((r) => [r.script, r]));

  // Print results grouped by domain
  for (const [group, scripts] of Object.entries(testGroups)) {
    const groupResults = scripts.map((s) => resultMap.get(s));
    const allPassed = groupResults.every((r) => r.passed);
    const groupDuration = groupResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`  ${allPassed ? '\x1b[32m' : '\x1b[31m'}${group}\x1b[0m (${formatDuration(groupDuration)})`);

    for (const r of groupResults) {
      const icon = r.passed ? '\x1b[32m\u2713\x1b[0m' : '\x1b[31m\u2717\x1b[0m';
      const dur = `\x1b[2m${formatDuration(r.duration)}\x1b[0m`;
      console.log(`    ${icon} ${r.script} ${dur}`);
    }
    console.log('');
  }

  // Collect results
  const passed = allResults.filter((r) => r.passed);
  const failed = allResults.filter((r) => !r.passed);

  // Find slowest tests
  const slowest = [...allResults].sort((a, b) => b.duration - a.duration).slice(0, 5);

  // Print summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Passed:      ${passed.length}`);
  console.log(`  Failed:      ${failed.length}`);
  console.log(`  Total:       ${allScripts.length}`);
  console.log(`  Wall time:   ${formatDuration(totalDuration)}`);
  console.log(`  CPU time:    ${formatDuration(allResults.reduce((s, r) => s + r.duration, 0))}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);

  // Slowest tests
  console.log('');
  console.log('  Slowest:');
  for (const r of slowest) {
    console.log(`    ${formatDuration(r.duration).padStart(8)}  ${r.script}`);
  }
  console.log('='.repeat(60) + '\n');

  // Print failed test details
  if (failed.length > 0) {
    console.log('\n  FAILED TESTS:\n');
    for (const { script, error, output } of failed) {
      console.log(`  \x1b[31m\u2717\x1b[0m ${script}`);
      console.log(`    Error: ${error}`);
      if (output && output.trim()) {
        const lines = output.trim().split('\n').slice(-20);
        console.log('    Output (last 20 lines):');
        for (const line of lines) {
          console.log(`      ${line}`);
        }
      }
      console.log('');
    }
    process.exit(1);
  }

  console.log('  All tests passed!\n');
  process.exit(0);
}

// Run
runAllTests().catch((error) => {
  console.error('\n  Fatal error running tests:', error.message);
  process.exit(1);
});
