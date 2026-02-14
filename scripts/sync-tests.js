#!/usr/bin/env node

/**
 * Automatic test discovery and synchronization script.
 *
 * Scans test/ directory for all *.test.js files and ensures they are:
 * 1. Registered in package.json scripts section
 * 2. Included in scripts/run-all-tests.js testGroups
 *
 * Usage:
 *   node scripts/sync-tests.js         # Check for missing tests
 *   node scripts/sync-tests.js --fix   # Auto-add missing tests
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEST_DIR = join(ROOT_DIR, 'test');
const PACKAGE_JSON = join(ROOT_DIR, 'package.json');
const RUN_ALL_TESTS = join(ROOT_DIR, 'scripts', 'run-all-tests.js');

// Test group mapping (based on filename patterns)
const TEST_GROUP_PATTERNS = {
  compiler: /^(compiler|lexer|parser|transformer|sourcemap|css-parsing|preprocessor)/,
  reactivity: /^pulse/,
  dom: /^(dom|enhanced-mock-adapter)/,
  routing: /^router/,
  state: /^(store|context)/,
  forms: /^form/,
  async: /^(async|http|websocket|graphql|interceptor-manager)/,
  infra: /^(hmr|logger|errors|error-sanitizer|lru-cache|utils|security|memory-cleanup|native|devtools)/,
  cli: /^(lint|format|analyze|cli|docs|doctor|scaffold|test-runner|build)/,
  ssr: /^(ssr|ssg|server-adapters|server-components|server-actions)/,
  loaders: /^(vite-plugin|webpack-loader|rollup-plugin|esbuild-plugin|parcel-plugin|swc-plugin|dev-server)/,
  ecosystem: /^(sse|persistence|i18n|portal|animation|sw)/,
  integration: /^(integration|a11y)/,
};

/**
 * Find all test files in test/ directory.
 */
function findTestFiles() {
  const files = readdirSync(TEST_DIR)
    .filter(file => file.endsWith('.test.js'))
    .sort();

  return files;
}

/**
 * Determine which test group a test file belongs to.
 */
function getTestGroup(filename) {
  const baseName = basename(filename, '.test.js');

  for (const [group, pattern] of Object.entries(TEST_GROUP_PATTERNS)) {
    if (pattern.test(baseName)) {
      return group;
    }
  }

  console.warn(`⚠️  Could not determine group for ${filename}, defaulting to 'integration'`);
  return 'integration';
}

/**
 * Parse package.json and extract test scripts.
 */
function getPackageJsonTests() {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));
  const testScripts = Object.keys(pkg.scripts)
    .filter(script => script.startsWith('test:'))
    .map(script => script.replace('test:', ''));

  return testScripts;
}

/**
 * Parse run-all-tests.js and extract test groups.
 */
function getRunAllTestsGroups() {
  const content = readFileSync(RUN_ALL_TESTS, 'utf-8');

  // Extract testGroups object
  const testGroupsMatch = content.match(/const testGroups = \{([\s\S]*?)\n\};/);
  if (!testGroupsMatch) {
    throw new Error('Could not find testGroups in run-all-tests.js');
  }

  const testGroupsStr = testGroupsMatch[1];

  // Parse each group
  const groups = {};
  const groupRegex = /(\w+): \[([\s\S]*?)\]/g;
  let match;

  while ((match = groupRegex.exec(testGroupsStr)) !== null) {
    const groupName = match[1];
    const testsStr = match[2];

    // Extract test names (quoted strings)
    const tests = [];
    const testRegex = /'test:([\w-]+)'/g;
    let testMatch;

    while ((testMatch = testRegex.exec(testsStr)) !== null) {
      tests.push(testMatch[1]);
    }

    groups[groupName] = tests;
  }

  return groups;
}

/**
 * Generate test script name from filename.
 */
function getTestScriptName(filename) {
  return basename(filename, '.test.js');
}

/**
 * Check for missing tests and optionally fix them.
 */
function syncTests(fix = false) {
  console.log('🔍 Scanning test/ directory...\n');

  const testFiles = findTestFiles();
  const packageTests = getPackageJsonTests();
  const runAllTestsGroups = getRunAllTestsGroups();

  console.log(`Found ${testFiles.length} test files`);
  console.log(`Found ${packageTests.length} test scripts in package.json`);

  const allGroupTests = Object.values(runAllTestsGroups).flat();
  console.log(`Found ${allGroupTests.length} tests in run-all-tests.js\n`);

  // Find missing tests
  const missingInPackage = [];
  const missingInRunAllTests = [];
  const testsByGroup = {};

  for (const file of testFiles) {
    const scriptName = getTestScriptName(file);
    const group = getTestGroup(file);

    if (!testsByGroup[group]) {
      testsByGroup[group] = [];
    }
    testsByGroup[group].push(scriptName);

    if (!packageTests.includes(scriptName)) {
      missingInPackage.push({ file, scriptName, group });
    }

    if (!allGroupTests.includes(scriptName)) {
      missingInRunAllTests.push({ file, scriptName, group });
    }
  }

  // Report findings
  if (missingInPackage.length > 0) {
    console.log('❌ Missing in package.json scripts:');
    missingInPackage.forEach(({ scriptName, group }) => {
      console.log(`   - test:${scriptName} (group: ${group})`);
    });
    console.log('');
  }

  if (missingInRunAllTests.length > 0) {
    console.log('❌ Missing in run-all-tests.js:');
    missingInRunAllTests.forEach(({ scriptName, group }) => {
      console.log(`   - test:${scriptName} (group: ${group})`);
    });
    console.log('');
  }

  if (missingInPackage.length === 0 && missingInRunAllTests.length === 0) {
    console.log('✅ All tests are registered!\n');
    return true;
  }

  // Fix if requested
  if (fix) {
    console.log('🔧 Fixing missing tests...\n');

    if (missingInPackage.length > 0) {
      addToPackageJson(missingInPackage);
      console.log('✅ Updated package.json\n');
    }

    if (missingInRunAllTests.length > 0) {
      addToRunAllTests(missingInRunAllTests, testsByGroup);
      console.log('✅ Updated run-all-tests.js\n');
    }

    console.log('✅ All tests synchronized!\n');
    return true;
  }

  console.log('💡 Run with --fix to automatically add missing tests\n');
  return false;
}

/**
 * Add missing tests to package.json.
 */
function addToPackageJson(missing) {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));

  for (const { scriptName, file } of missing) {
    // Determine if test uses --test flag (newer tests use node --test)
    const useTestFlag = file.includes('coverage') ||
                        file.includes('server-') ||
                        file.startsWith('ssr-') ||
                        file === 'vite-plugin.test.js';

    const command = useTestFlag
      ? `node --test test/${file}`
      : `node test/${file}`;

    pkg.scripts[`test:${scriptName}`] = command;
  }

  // Sort scripts alphabetically
  const sortedScripts = {};
  Object.keys(pkg.scripts).sort().forEach(key => {
    sortedScripts[key] = pkg.scripts[key];
  });
  pkg.scripts = sortedScripts;

  writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Add missing tests to run-all-tests.js.
 */
function addToRunAllTests(missing, testsByGroup) {
  let content = readFileSync(RUN_ALL_TESTS, 'utf-8');

  // Group missing tests by their target group
  const missingByGroup = {};
  for (const { scriptName, group } of missing) {
    if (!missingByGroup[group]) {
      missingByGroup[group] = [];
    }
    missingByGroup[group].push(scriptName);
  }

  // Add tests to each group
  for (const [group, tests] of Object.entries(missingByGroup)) {
    // Find the group in the file
    const groupRegex = new RegExp(`(${group}: \\[\\n)([\\s\\S]*?)(\\n  \\],?)`, 'g');

    content = content.replace(groupRegex, (match, opening, testsStr, closing) => {
      // Parse existing tests
      const existingTests = [];
      const testRegex = /'test:([\w-]+)'/g;
      let testMatch;

      while ((testMatch = testRegex.exec(testsStr)) !== null) {
        existingTests.push(testMatch[1]);
      }

      // Add missing tests
      const allTests = [...existingTests, ...tests].sort();

      // Format as array
      const formattedTests = allTests.map(test => `    'test:${test}',`).join('\n');

      return `${opening}${formattedTests}${closing}`;
    });
  }

  writeFileSync(RUN_ALL_TESTS, content);
}

// Main
const fix = process.argv.includes('--fix');
const success = syncTests(fix);

process.exit(success ? 0 : 1);
