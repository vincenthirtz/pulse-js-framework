#!/usr/bin/env node

/**
 * Test runner script that executes all test suites and reports results
 * Designed to be robust for CI environments like GitHub Actions
 */

import { execSync } from 'child_process';

// All test scripts in order of execution
const testScripts = [
  'test:compiler',
  'test:sourcemap',
  'test:css-parsing',
  'test:preprocessor',
  'test:pulse',
  'test:dom',
  'test:dom-element',
  'test:dom-list',
  'test:dom-conditional',
  'test:dom-lifecycle',
  'test:dom-selector',
  'test:dom-adapter',
  'test:dom-advanced',
  'test:enhanced-mock-adapter',
  'test:router',
  'test:store',
  'test:context',
  'test:hmr',
  'test:lint',
  'test:format',
  'test:analyze',
  'test:cli',
  'test:cli-ui',
  'test:cli-create',
  'test:lru-cache',
  'test:utils',
  'test:utils-coverage',
  'test:docs',
  'test:docs-nav',
  'test:async',
  'test:async-coverage',
  'test:form',
  'test:http',
  'test:devtools',
  'test:native',
  'test:a11y',
  'test:a11y-enhanced',
  'test:logger',
  'test:logger-prod',
  'test:errors',
  'test:security',
  'test:websocket',
  'test:graphql',
  'test:graphql-coverage',
  'test:doctor',
  'test:scaffold',
  'test:test-runner',
  'test:build',
  'test:integration',
  'test:context-stress',
  'test:form-edge-cases',
  'test:graphql-subscriptions',
  'test:http-edge-cases',
  'test:integration-advanced',
  'test:websocket-stress',
  'test:ssr',
  'test:ssr-hydrator',
  'test:webpack-loader',
  'test:rollup-plugin',
  'test:esbuild-plugin',
  'test:parcel-plugin'
];

const results = {
  passed: [],
  failed: []
};

/**
 * Main test runner
 */
function runAllTests() {
  console.log(`\n🧪 Running ${testScripts.length} test suites...\n`);

  const startTime = Date.now();

  for (const script of testScripts) {
    process.stdout.write(`Running ${script}... `);

    try {
      // Run test synchronously, suppress output unless it fails
      execSync(`npm run ${script}`, {
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8'
      });

      console.log('✓');
      results.passed.push(script);
    } catch (error) {
      console.log('✗');

      // Extract useful error information
      const output = error.stdout || error.stderr || '';
      const errorMatch = output.match(/Error: (.+)/) || output.match(/Failed: (\d+)/);
      const errorMsg = errorMatch ? errorMatch[1] : error.message;

      results.failed.push({
        script,
        error: errorMsg,
        output: output.slice(-500) // Last 500 chars of output
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Passed: ${results.passed.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`Total: ${testScripts.length}`);
  console.log(`Duration: ${duration}s`);
  console.log('='.repeat(60) + '\n');

  // Print failed tests details
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    results.failed.forEach(({ script, error, output }) => {
      console.log(`  • ${script}`);
      console.log(`    Error: ${error}`);
      if (output && output.trim()) {
        console.log(`    Last output:\n${output.trim().split('\n').map(l => `      ${l}`).join('\n')}`);
      }
      console.log('');
    });

    // Exit with error code
    process.exit(1);
  }

  console.log('✅ All tests passed!\n');
  process.exit(0);
}

// Run tests
try {
  runAllTests();
} catch (error) {
  console.error('\n❌ Fatal error running tests:', error.message);
  process.exit(1);
}
