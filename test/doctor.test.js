/**
 * Doctor Command Tests
 *
 * Tests for cli/doctor.js - Project diagnostics and health checks
 *
 * @module test/doctor
 */

import { runDiagnostics } from '../cli/doctor.js';
import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection,
  createSpy
} from './utils.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Test Setup - Mock Project Structure
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-doctor-project');
const originalCwd = process.cwd();

/**
 * Create a mock project structure for testing
 */
function setupMockProject(config = {}) {
  const {
    hasPackageJson = true,
    hasSrc = true,
    hasIndexHtml = true,
    hasNodeModules = false,
    hasViteConfig = false,
    hasGit = false,
    packageJsonContent = null,
    pulseFiles = []
  } = config;

  // Clean up any existing test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  if (hasPackageJson) {
    const defaultPkg = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'pulse dev',
        build: 'pulse build'
      }
    };
    const pkg = packageJsonContent || defaultPkg;
    writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify(pkg, null, 2));
  }

  if (hasSrc) {
    mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
    writeFileSync(join(TEST_DIR, 'src', 'main.js'), 'export default function() {}');
  }

  if (hasIndexHtml) {
    writeFileSync(join(TEST_DIR, 'index.html'), '<html><body></body></html>');
  }

  if (hasNodeModules) {
    mkdirSync(join(TEST_DIR, 'node_modules'), { recursive: true });
  }

  if (hasViteConfig) {
    writeFileSync(
      join(TEST_DIR, 'vite.config.js'),
      'import pulse from "pulse-js-framework/vite";\nexport default { plugins: [pulse()] };'
    );
  }

  if (hasGit) {
    mkdirSync(join(TEST_DIR, '.git'), { recursive: true });
  }

  for (const file of pulseFiles) {
    const filePath = join(TEST_DIR, file.path);
    mkdirSync(join(filePath, '..'), { recursive: true });
    writeFileSync(filePath, file.content || '@page Test\nview { div "test" }');
  }

  // Change to test directory
  process.chdir(TEST_DIR);
}

/**
 * Clean up test project
 */
function cleanupMockProject() {
  process.chdir(originalCwd);
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// =============================================================================
// Diagnostic Result Type Tests
// =============================================================================

printSection('Diagnostic Result Types');

test('runDiagnostics returns array of check results', async () => {
  setupMockProject();
  try {
    const results = await runDiagnostics();

    assert(Array.isArray(results), 'Should return an array');
    assert(results.length > 0, 'Should have at least one result');

    for (const result of results) {
      assert(typeof result.name === 'string', 'Result should have name');
      assert(['pass', 'warn', 'fail', 'info'].includes(result.status), 'Result should have valid status');
      assert(typeof result.message === 'string', 'Result should have message');
    }
  } finally {
    cleanupMockProject();
  }
});

test('check result has correct structure', async () => {
  setupMockProject();
  try {
    const results = await runDiagnostics();
    const result = results[0];

    assertEqual(typeof result.name, 'string');
    assertEqual(typeof result.message, 'string');
    assert(['pass', 'warn', 'fail', 'info'].includes(result.status));

    // Suggestion is optional
    if (result.suggestion) {
      assertEqual(typeof result.suggestion, 'string');
    }
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Node.js Version Check Tests
// =============================================================================

printSection('Node.js Version Check');

test('checkNodeVersion passes for Node 18+', async () => {
  setupMockProject();
  try {
    const results = await runDiagnostics();
    const nodeCheck = results.find(r => r.name === 'Node.js Version');

    assert(nodeCheck !== undefined, 'Should have Node.js version check');
    assert(['pass', 'warn'].includes(nodeCheck.status), 'Should pass or warn for valid Node version');
    assert(nodeCheck.message.includes('Node.js'), 'Message should mention Node.js');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// npm Version Check Tests
// =============================================================================

printSection('npm Version Check');

test('checkNpmVersion is included in diagnostics', async () => {
  setupMockProject();
  try {
    const results = await runDiagnostics();
    const npmCheck = results.find(r => r.name === 'npm Version');

    assert(npmCheck !== undefined, 'Should have npm version check');
    assert(['pass', 'warn'].includes(npmCheck.status), 'Should pass or warn');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// package.json Check Tests
// =============================================================================

printSection('package.json Check');

test('checkPackageJson passes with valid package.json', async () => {
  setupMockProject({ hasPackageJson: true });
  try {
    const results = await runDiagnostics();
    const pkgCheck = results.find(r => r.name === 'package.json');

    assert(pkgCheck !== undefined, 'Should have package.json check');
    assertEqual(pkgCheck.status, 'pass', 'Should pass with valid package.json');
  } finally {
    cleanupMockProject();
  }
});

test('checkPackageJson fails without package.json', async () => {
  setupMockProject({ hasPackageJson: false });
  try {
    const results = await runDiagnostics();
    const pkgCheck = results.find(r => r.name === 'package.json');

    assert(pkgCheck !== undefined, 'Should have package.json check');
    assertEqual(pkgCheck.status, 'fail', 'Should fail without package.json');
    assert(pkgCheck.suggestion !== undefined, 'Should have suggestion');
  } finally {
    cleanupMockProject();
  }
});

test('checkPackageJson warns with missing type: module', async () => {
  setupMockProject({
    hasPackageJson: true,
    packageJsonContent: {
      name: 'test',
      version: '1.0.0',
      scripts: { dev: 'pulse dev', build: 'pulse build' }
      // Missing type: module
    }
  });
  try {
    const results = await runDiagnostics();
    const pkgCheck = results.find(r => r.name === 'package.json');

    assertEqual(pkgCheck.status, 'warn', 'Should warn with missing type: module');
    assert(pkgCheck.message.includes('type'), 'Message should mention type field');
  } finally {
    cleanupMockProject();
  }
});

test('checkPackageJson warns with missing scripts', async () => {
  setupMockProject({
    hasPackageJson: true,
    packageJsonContent: {
      name: 'test',
      version: '1.0.0',
      type: 'module'
      // Missing scripts
    }
  });
  try {
    const results = await runDiagnostics();
    const pkgCheck = results.find(r => r.name === 'package.json');

    assertEqual(pkgCheck.status, 'warn', 'Should warn with missing scripts');
    assert(pkgCheck.message.includes('script'), 'Message should mention scripts');
  } finally {
    cleanupMockProject();
  }
});

test('checkPackageJson fails with invalid JSON', async () => {
  setupMockProject({ hasPackageJson: false });
  writeFileSync(join(TEST_DIR, 'package.json'), '{ invalid json }');
  try {
    const results = await runDiagnostics();
    const pkgCheck = results.find(r => r.name === 'package.json');

    assertEqual(pkgCheck.status, 'fail', 'Should fail with invalid JSON');
    assert(pkgCheck.message.includes('Invalid'), 'Message should indicate invalid JSON');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Dependencies Check Tests
// =============================================================================

printSection('Dependencies Check');

test('checkDependencies fails without node_modules', async () => {
  setupMockProject({ hasNodeModules: false });
  try {
    const results = await runDiagnostics();
    const depCheck = results.find(r => r.name === 'Dependencies');

    assert(depCheck !== undefined, 'Should have dependencies check');
    assertEqual(depCheck.status, 'fail', 'Should fail without node_modules');
    assert(depCheck.suggestion.includes('npm install'), 'Should suggest npm install');
  } finally {
    cleanupMockProject();
  }
});

test('checkDependencies passes with node_modules', async () => {
  setupMockProject({ hasNodeModules: true });
  try {
    const results = await runDiagnostics();
    const depCheck = results.find(r => r.name === 'Dependencies');

    assert(depCheck !== undefined, 'Should have dependencies check');
    assert(['pass', 'warn'].includes(depCheck.status), 'Should pass or warn with node_modules');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Project Structure Check Tests
// =============================================================================

printSection('Project Structure Check');

test('checkProjectStructure passes with standard structure', async () => {
  setupMockProject({
    hasSrc: true,
    hasIndexHtml: true
  });
  try {
    const results = await runDiagnostics();
    const structCheck = results.find(r => r.name === 'Project Structure');

    assert(structCheck !== undefined, 'Should have structure check');
    assertEqual(structCheck.status, 'pass', 'Should pass with standard structure');
  } finally {
    cleanupMockProject();
  }
});

test('checkProjectStructure warns without src directory', async () => {
  setupMockProject({
    hasSrc: false,
    hasIndexHtml: true
  });
  try {
    const results = await runDiagnostics();
    const structCheck = results.find(r => r.name === 'Project Structure');

    assertEqual(structCheck.status, 'warn', 'Should warn without src/');
    assert(structCheck.message.includes('src'), 'Message should mention src');
  } finally {
    cleanupMockProject();
  }
});

test('checkProjectStructure warns without index.html', async () => {
  setupMockProject({
    hasSrc: true,
    hasIndexHtml: false
  });
  try {
    const results = await runDiagnostics();
    const structCheck = results.find(r => r.name === 'Project Structure');

    assertEqual(structCheck.status, 'warn', 'Should warn without index.html');
    assert(structCheck.message.includes('index.html'), 'Message should mention index.html');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Vite Config Check Tests
// =============================================================================

printSection('Vite Config Check');

test('checkViteConfig passes with valid config', async () => {
  setupMockProject({ hasViteConfig: true });
  try {
    const results = await runDiagnostics();
    const viteCheck = results.find(r => r.name === 'Vite Config');

    assert(viteCheck !== undefined, 'Should have Vite config check');
    assertEqual(viteCheck.status, 'pass', 'Should pass with pulse plugin');
  } finally {
    cleanupMockProject();
  }
});

test('checkViteConfig info without config file', async () => {
  setupMockProject({ hasViteConfig: false });
  try {
    const results = await runDiagnostics();
    const viteCheck = results.find(r => r.name === 'Vite Config');

    assertEqual(viteCheck.status, 'info', 'Should show info without config');
    assert(viteCheck.message.includes('No Vite config'), 'Message should indicate no config');
  } finally {
    cleanupMockProject();
  }
});

test('checkViteConfig warns without Pulse plugin', async () => {
  setupMockProject({ hasViteConfig: false });
  writeFileSync(
    join(TEST_DIR, 'vite.config.js'),
    'export default { plugins: [] };'
  );
  try {
    const results = await runDiagnostics();
    const viteCheck = results.find(r => r.name === 'Vite Config');

    assertEqual(viteCheck.status, 'warn', 'Should warn without Pulse plugin');
    assert(viteCheck.suggestion.includes('pulse'), 'Should suggest adding pulse plugin');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Git Status Check Tests
// =============================================================================

printSection('Git Status Check');

test('checkGitStatus returns info without .git directory', async () => {
  setupMockProject({ hasGit: false });
  try {
    const results = await runDiagnostics();
    const gitCheck = results.find(r => r.name === 'Git Repository');

    assert(gitCheck !== undefined, 'Should have git check');
    assertEqual(gitCheck.status, 'info', 'Should show info without .git');
    assert(gitCheck.message.includes('Not a git repository'), 'Message should indicate no git');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Pulse Files Check Tests
// =============================================================================

printSection('Pulse Files Check');

test('checkPulseFiles returns info without pulse files', async () => {
  setupMockProject({ pulseFiles: [] });
  try {
    const results = await runDiagnostics();
    const pulseCheck = results.find(r => r.name === 'Pulse Files');

    assert(pulseCheck !== undefined, 'Should have Pulse files check');
    assertEqual(pulseCheck.status, 'info', 'Should show info without pulse files');
    assert(pulseCheck.message.includes('No .pulse files'), 'Message should indicate no files');
  } finally {
    cleanupMockProject();
  }
});

test('checkPulseFiles passes with valid pulse files', async () => {
  setupMockProject({
    pulseFiles: [
      { path: 'src/App.pulse', content: '@page App\nview { div "Hello" }' },
      { path: 'src/Button.pulse', content: '@page Button\nview { button "Click" }' }
    ]
  });
  try {
    const results = await runDiagnostics();
    const pulseCheck = results.find(r => r.name === 'Pulse Files');

    assertEqual(pulseCheck.status, 'pass', 'Should pass with valid files');
    assert(pulseCheck.message.includes('2 file'), 'Message should show file count');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Verbose Mode Tests
// =============================================================================

printSection('Verbose Mode Tests');

test('verbose mode includes additional checks', async () => {
  setupMockProject({ hasNodeModules: true });
  try {
    const regularResults = await runDiagnostics({ verbose: false });
    const verboseResults = await runDiagnostics({ verbose: true });

    assert(
      verboseResults.length >= regularResults.length,
      'Verbose mode should include more or equal checks'
    );

    // Check for verbose-only checks
    const hasNodeModulesSize = verboseResults.some(r => r.name === 'node_modules Size');
    const hasBuildArtifacts = verboseResults.some(r => r.name === 'Build Artifacts');

    assert(hasNodeModulesSize, 'Verbose mode should include node_modules size check');
    assert(hasBuildArtifacts, 'Verbose mode should include build artifacts check');
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('Edge Cases');

test('handles missing package.json gracefully', async () => {
  setupMockProject({ hasPackageJson: false, hasSrc: false, hasIndexHtml: false });
  try {
    // Should not throw
    const results = await runDiagnostics();
    assert(Array.isArray(results), 'Should return array even with minimal project');
  } finally {
    cleanupMockProject();
  }
});

test('handles empty project directory', async () => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);

  try {
    const results = await runDiagnostics();
    assert(Array.isArray(results), 'Should handle empty project');

    // Check that appropriate failures are reported
    const pkgCheck = results.find(r => r.name === 'package.json');
    assertEqual(pkgCheck.status, 'fail');
  } finally {
    cleanupMockProject();
  }
});

test('result statuses are valid enum values', async () => {
  setupMockProject();
  try {
    const results = await runDiagnostics({ verbose: true });
    const validStatuses = new Set(['pass', 'warn', 'fail', 'info']);

    for (const result of results) {
      assert(
        validStatuses.has(result.status),
        `Invalid status "${result.status}" for check "${result.name}"`
      );
    }
  } finally {
    cleanupMockProject();
  }
});

// =============================================================================
// Run Tests
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
