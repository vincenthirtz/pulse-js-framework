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
    'test:compiler-deep-coverage',
    'test:css-parsing',
    'test:lexer-coverage-boost',
    'test:parser-coverage',
    'test:preprocessor',
    'test:preprocessor-coverage-boost',
    'test:sourcemap',
    'test:sourcemap-coverage-boost',
  ],
  reactivity: [
    'test:pulse',
  ],
  dom: [
    'test:dom',
    'test:dom-adapter',
    'test:dom-adapter-coverage-boost',
    'test:dom-advanced',
    'test:dom-binding',
    'test:dom-conditional',
    'test:dom-element',
    'test:dom-element-coverage-boost',
    'test:dom-element-deep-coverage',
    'test:dom-event-delegate',
    'test:dom-lifecycle',
    'test:dom-list',
    'test:dom-recycle',
    'test:dom-selector',
    'test:dom-virtual-list',
    'test:enhanced-mock-adapter',
  ],
  routing: [
    'test:router',
    'test:router-psc',
    'test:router-psc-integration',
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
    'test:graphql',
    'test:graphql-coverage',
    'test:graphql-subscriptions',
    'test:graphql-subscriptions-coverage-boost',
    'test:http',
    'test:http-edge-cases',
    'test:interceptor-manager-coverage-boost',
    'test:websocket',
    'test:websocket-coverage-boost',
    'test:websocket-stress',
  ],
  infra: [
    'test:devtools',
    'test:error-sanitizer',
    'test:errors',
    'test:errors-coverage-boost',
    'test:hmr',
    'test:hmr-coverage-boost',
    'test:interceptor-manager',
    'test:logger',
    'test:logger-coverage-boost',
    'test:logger-deep-coverage',
    'test:logger-prod',
    'test:lru-cache',
    'test:memory-cleanup',
    'test:mutex',
    'test:native',
    'test:native-coverage-boost',
    'test:path-sanitizer',
    'test:security',
    'test:security-coverage-boost',
    'test:security-deep-coverage',
    'test:security-regression',
    'test:utils',
    'test:utils-coverage',
    'test:utils-deep-coverage',
  ],
  cli: [
    'test:analyze',
    'test:build',
    'test:build-coverage-boost',
    'test:build-extended',
    'test:cli',
    'test:cli-create',
    'test:cli-help',
    'test:cli-logger',
    'test:cli-mobile',
    'test:cli-release',
    'test:cli-release-coverage',
    'test:cli-ui',
    'test:docs',
    'test:docs-nav',
    'test:docs-navigation',
    'test:doctor',
    'test:format',
    'test:lint',
    'test:scaffold',
    'test:test-runner',
  ],
  ssr: [
    'test:server-actions',
    'test:server-actions-client',
    'test:server-actions-server-extended',
    'test:server-adapters',
    'test:server-components-build-tools',
    'test:server-components-client',
    'test:server-components-compiler',
    'test:server-components-core',
    'test:server-components-csrf',
    'test:server-components-ratelimit',
    'test:server-components-ratelimit-extended',
    'test:server-components-security',
    'test:server-components-security-comprehensive',
    'test:server-components-serializer',
    'test:server-components-validation',
    'test:server-utils',
    'test:ssg',
    'test:ssg-coverage-boost',
    'test:ssr',
    'test:ssr-coverage-boost',
    'test:ssr-directives',
    'test:ssr-hydrator',
    'test:ssr-mismatch',
    'test:ssr-preload',
    'test:ssr-stream',
  ],
  loaders: [
    'test:dev-server',
    'test:dev-server-coverage',
    'test:esbuild-plugin',
    'test:parcel-plugin',
    'test:rollup-plugin',
    'test:swc-plugin',
    'test:vite-plugin',
    'test:webpack-loader',
  ],
  ecosystem: [
    'test:sse',
    'test:persistence',
    'test:persistence-coverage-boost',
    'test:i18n',
    'test:portal',
    'test:animation',
    'test:sw',
  ],
  integration: [
    'test:a11y',
    'test:a11y-enhanced',
    'test:a11y-focus-coverage-boost',
    'test:a11y-graphql-coverage-boost',
    'test:a11y-widgets-coverage-boost',
    'test:benchmarks',
    'test:directives',
    'test:expressions-coverage-boost',
    'test:imports-coverage-boost',
    'test:integration',
    'test:integration-advanced',
    'test:lite',
    'test:loader-shared',
    'test:release-deep-coverage',
    'test:small-gaps-coverage-boost',
    'test:style-coverage-boost',
    'test:testing',
    'test:view-coverage-boost',
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
  const timeout = TIMEOUT_MS;
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
          duration: timeout,
          error: `Timed out after ${timeout / 1000}s`,
          output: '',
        });
      }
    }, timeout);

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
