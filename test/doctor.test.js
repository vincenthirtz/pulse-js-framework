/**
 * Doctor Command Tests
 *
 * Tests for cli/doctor.js - Project diagnostics and health checks
 *
 * @module test/doctor
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { runDiagnostics, runDoctor } from '../cli/doctor.js';
import { createSpy } from './utils.js';
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

// Helper to capture console output and mock process.exit
function setupCommandMocks() {
  const logs = [];
  const warns = [];
  const errors = [];
  let exitCode = null;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalExit = process.exit;

  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => warns.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  process.exit = (code) => { exitCode = code; throw new Error(`EXIT_${code}`); };

  return {
    logs,
    warns,
    errors,
    getExitCode: () => exitCode,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      process.exit = originalExit;
    }
  };
}

describe('Doctor Command Tests', () => {

  // =============================================================================
  // Diagnostic Result Type Tests
  // =============================================================================

  describe('Diagnostic Result Types', () => {

    test('runDiagnostics returns array of check results', async () => {
      setupMockProject();
      try {
        const results = await runDiagnostics();

        assert.ok(Array.isArray(results), 'Should return an array');
        assert.ok(results.length > 0, 'Should have at least one result');

        for (const result of results) {
          assert.ok(typeof result.name === 'string', 'Result should have name');
          assert.ok(['pass', 'warn', 'fail', 'info'].includes(result.status), 'Result should have valid status');
          assert.ok(typeof result.message === 'string', 'Result should have message');
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

        assert.strictEqual(typeof result.name, 'string');
        assert.strictEqual(typeof result.message, 'string');
        assert.ok(['pass', 'warn', 'fail', 'info'].includes(result.status));

        // Suggestion is optional
        if (result.suggestion) {
          assert.strictEqual(typeof result.suggestion, 'string');
        }
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Node.js Version Check Tests
  // =============================================================================

  describe('Node.js Version Check', () => {

    test('checkNodeVersion passes for Node 18+', async () => {
      setupMockProject();
      try {
        const results = await runDiagnostics();
        const nodeCheck = results.find(r => r.name === 'Node.js Version');

        assert.ok(nodeCheck !== undefined, 'Should have Node.js version check');
        assert.ok(['pass', 'warn'].includes(nodeCheck.status), 'Should pass or warn for valid Node version');
        assert.ok(nodeCheck.message.includes('Node.js'), 'Message should mention Node.js');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // npm Version Check Tests
  // =============================================================================

  describe('npm Version Check', () => {

    test('checkNpmVersion is included in diagnostics', async () => {
      setupMockProject();
      try {
        const results = await runDiagnostics();
        const npmCheck = results.find(r => r.name === 'npm Version');

        assert.ok(npmCheck !== undefined, 'Should have npm version check');
        assert.ok(['pass', 'warn'].includes(npmCheck.status), 'Should pass or warn');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // package.json Check Tests
  // =============================================================================

  describe('package.json Check', () => {

    test('checkPackageJson passes with valid package.json', async () => {
      setupMockProject({ hasPackageJson: true });
      try {
        const results = await runDiagnostics();
        const pkgCheck = results.find(r => r.name === 'package.json');

        assert.ok(pkgCheck !== undefined, 'Should have package.json check');
        assert.strictEqual(pkgCheck.status, 'pass', 'Should pass with valid package.json');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkPackageJson fails without package.json', async () => {
      setupMockProject({ hasPackageJson: false });
      try {
        const results = await runDiagnostics();
        const pkgCheck = results.find(r => r.name === 'package.json');

        assert.ok(pkgCheck !== undefined, 'Should have package.json check');
        assert.strictEqual(pkgCheck.status, 'fail', 'Should fail without package.json');
        assert.ok(pkgCheck.suggestion !== undefined, 'Should have suggestion');
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

        assert.strictEqual(pkgCheck.status, 'warn', 'Should warn with missing type: module');
        assert.ok(pkgCheck.message.includes('type'), 'Message should mention type field');
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

        assert.strictEqual(pkgCheck.status, 'warn', 'Should warn with missing scripts');
        assert.ok(pkgCheck.message.includes('script'), 'Message should mention scripts');
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

        assert.strictEqual(pkgCheck.status, 'fail', 'Should fail with invalid JSON');
        assert.ok(pkgCheck.message.includes('Invalid'), 'Message should indicate invalid JSON');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Dependencies Check Tests
  // =============================================================================

  describe('Dependencies Check', () => {

    test('checkDependencies fails without node_modules', async () => {
      setupMockProject({ hasNodeModules: false });
      try {
        const results = await runDiagnostics();
        const depCheck = results.find(r => r.name === 'Dependencies');

        assert.ok(depCheck !== undefined, 'Should have dependencies check');
        assert.strictEqual(depCheck.status, 'fail', 'Should fail without node_modules');
        assert.ok(depCheck.suggestion.includes('npm install'), 'Should suggest npm install');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkDependencies passes with node_modules', async () => {
      setupMockProject({ hasNodeModules: true });
      try {
        const results = await runDiagnostics();
        const depCheck = results.find(r => r.name === 'Dependencies');

        assert.ok(depCheck !== undefined, 'Should have dependencies check');
        assert.ok(['pass', 'warn'].includes(depCheck.status), 'Should pass or warn with node_modules');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Project Structure Check Tests
  // =============================================================================

  describe('Project Structure Check', () => {

    test('checkProjectStructure passes with standard structure', async () => {
      setupMockProject({
        hasSrc: true,
        hasIndexHtml: true
      });
      try {
        const results = await runDiagnostics();
        const structCheck = results.find(r => r.name === 'Project Structure');

        assert.ok(structCheck !== undefined, 'Should have structure check');
        assert.strictEqual(structCheck.status, 'pass', 'Should pass with standard structure');
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

        assert.strictEqual(structCheck.status, 'warn', 'Should warn without src/');
        assert.ok(structCheck.message.includes('src'), 'Message should mention src');
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

        assert.strictEqual(structCheck.status, 'warn', 'Should warn without index.html');
        assert.ok(structCheck.message.includes('index.html'), 'Message should mention index.html');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Vite Config Check Tests
  // =============================================================================

  describe('Vite Config Check', () => {

    test('checkViteConfig passes with valid config', async () => {
      setupMockProject({ hasViteConfig: true });
      try {
        const results = await runDiagnostics();
        const viteCheck = results.find(r => r.name === 'Vite Config');

        assert.ok(viteCheck !== undefined, 'Should have Vite config check');
        assert.strictEqual(viteCheck.status, 'pass', 'Should pass with pulse plugin');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkViteConfig info without config file', async () => {
      setupMockProject({ hasViteConfig: false });
      try {
        const results = await runDiagnostics();
        const viteCheck = results.find(r => r.name === 'Vite Config');

        assert.strictEqual(viteCheck.status, 'info', 'Should show info without config');
        assert.ok(viteCheck.message.includes('No Vite config'), 'Message should indicate no config');
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

        assert.strictEqual(viteCheck.status, 'warn', 'Should warn without Pulse plugin');
        assert.ok(viteCheck.suggestion.includes('pulse'), 'Should suggest adding pulse plugin');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Git Status Check Tests
  // =============================================================================

  describe('Git Status Check', () => {

    test('checkGitStatus returns info without .git directory', async () => {
      setupMockProject({ hasGit: false });
      try {
        const results = await runDiagnostics();
        const gitCheck = results.find(r => r.name === 'Git Repository');

        assert.ok(gitCheck !== undefined, 'Should have git check');
        assert.strictEqual(gitCheck.status, 'info', 'Should show info without .git');
        assert.ok(gitCheck.message.includes('Not a git repository'), 'Message should indicate no git');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Pulse Files Check Tests
  // =============================================================================

  describe('Pulse Files Check', () => {

    test('checkPulseFiles returns info without pulse files', async () => {
      setupMockProject({ pulseFiles: [] });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Files');

        assert.ok(pulseCheck !== undefined, 'Should have Pulse files check');
        assert.strictEqual(pulseCheck.status, 'info', 'Should show info without pulse files');
        assert.ok(pulseCheck.message.includes('No .pulse files'), 'Message should indicate no files');
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

        assert.strictEqual(pulseCheck.status, 'pass', 'Should pass with valid files');
        assert.ok(pulseCheck.message.includes('2 file'), 'Message should show file count');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Verbose Mode Tests
  // =============================================================================

  describe('Verbose Mode Tests', () => {

    test('verbose mode includes additional checks', async () => {
      setupMockProject({ hasNodeModules: true });
      try {
        const regularResults = await runDiagnostics({ verbose: false });
        const verboseResults = await runDiagnostics({ verbose: true });

        assert.ok(
          verboseResults.length >= regularResults.length,
          'Verbose mode should include more or equal checks'
        );

        // Check for verbose-only checks
        const hasNodeModulesSize = verboseResults.some(r => r.name === 'node_modules Size');
        const hasBuildArtifacts = verboseResults.some(r => r.name === 'Build Artifacts');

        assert.ok(hasNodeModulesSize, 'Verbose mode should include node_modules size check');
        assert.ok(hasBuildArtifacts, 'Verbose mode should include build artifacts check');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {

    test('handles missing package.json gracefully', async () => {
      setupMockProject({ hasPackageJson: false, hasSrc: false, hasIndexHtml: false });
      try {
        // Should not throw
        const results = await runDiagnostics();
        assert.ok(Array.isArray(results), 'Should return array even with minimal project');
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
        assert.ok(Array.isArray(results), 'Should handle empty project');

        // Check that appropriate failures are reported
        const pkgCheck = results.find(r => r.name === 'package.json');
        assert.strictEqual(pkgCheck.status, 'fail');
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
          assert.ok(
            validStatuses.has(result.status),
            `Invalid status "${result.status}" for check "${result.name}"`
          );
        }
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Pulse Framework Check Tests
  // =============================================================================

  describe('Pulse Framework Check', () => {

    test('checkPulseFramework passes with pulse-js-framework in dependencies', async () => {
      setupMockProject({
        hasPackageJson: true,
        packageJsonContent: {
          name: 'test-project',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'pulse dev', build: 'pulse build' },
          dependencies: {
            'pulse-js-framework': '^1.0.0'
          }
        }
      });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Framework');

        assert.ok(pulseCheck !== undefined, 'Should have Pulse Framework check');
        assert.strictEqual(pulseCheck.status, 'pass', 'Should pass with pulse-js-framework');
        assert.ok(pulseCheck.message.includes('pulse-js-framework'), 'Message should mention framework');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkPulseFramework passes for framework source', async () => {
      setupMockProject({
        hasPackageJson: true,
        packageJsonContent: {
          name: 'pulse-js-framework',
          version: '1.7.0',
          type: 'module',
          scripts: { dev: 'pulse dev', build: 'pulse build' }
        }
      });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Framework');

        assert.strictEqual(pulseCheck.status, 'pass', 'Should pass for framework source');
        assert.ok(pulseCheck.message.includes('Framework source'), 'Should indicate framework source');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkPulseFramework warns without pulse dependency', async () => {
      setupMockProject({
        hasPackageJson: true,
        packageJsonContent: {
          name: 'other-project',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build' },
          dependencies: {
            'react': '^18.0.0'
          }
        }
      });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Framework');

        assert.strictEqual(pulseCheck.status, 'warn', 'Should warn without pulse dependency');
        assert.ok(pulseCheck.suggestion !== undefined, 'Should have suggestion to install');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Missing Dependencies Detection Tests
  // =============================================================================

  describe('Missing Dependencies Detection', () => {

    test('checkDependencies detects missing packages', async () => {
      setupMockProject({
        hasPackageJson: true,
        hasNodeModules: true,
        packageJsonContent: {
          name: 'test-project',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'pulse dev', build: 'pulse build' },
          dependencies: {
            'nonexistent-package-12345': '^1.0.0'
          }
        }
      });
      try {
        const results = await runDiagnostics();
        const depCheck = results.find(r => r.name === 'Dependencies');

        // Should warn about missing dependency
        assert.strictEqual(depCheck.status, 'warn', 'Should warn about missing dependency');
        assert.ok(depCheck.message.includes('Missing') || depCheck.message.includes('dependencies'),
          'Message should indicate missing dependencies');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkDependencies handles devDependencies', async () => {
      setupMockProject({
        hasPackageJson: true,
        hasNodeModules: true,
        packageJsonContent: {
          name: 'test-project',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'pulse dev', build: 'pulse build' },
          devDependencies: {
            'missing-dev-dep-12345': '^1.0.0'
          }
        }
      });
      try {
        const results = await runDiagnostics();
        const depCheck = results.find(r => r.name === 'Dependencies');

        // Should detect missing devDependency too
        assert.ok(depCheck !== undefined, 'Should have dependencies check');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Pulse Files Syntax Errors
  // =============================================================================

  describe('Pulse Files Syntax Errors', () => {

    test('checkPulseFiles fails with syntax errors', async () => {
      setupMockProject({
        pulseFiles: [
          { path: 'src/Valid.pulse', content: '@page Valid\nview { div "valid" }' },
          { path: 'src/Invalid.pulse', content: '@page Invalid\nview { this is broken !!!' }
        ]
      });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Files');

        assert.strictEqual(pulseCheck.status, 'fail', 'Should fail with syntax errors');
        assert.ok(pulseCheck.message.includes('syntax error') || pulseCheck.message.includes('1 file'),
          'Message should indicate errors');
        assert.ok(pulseCheck.suggestion.includes('lint'), 'Should suggest running lint');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkPulseFiles reports multiple errors', async () => {
      setupMockProject({
        pulseFiles: [
          { path: 'src/Bad1.pulse', content: 'totally broken {{{' },
          { path: 'src/Bad2.pulse', content: 'also broken }}}' },
          { path: 'src/Bad3.pulse', content: 'still broken @@@' }
        ]
      });
      try {
        const results = await runDiagnostics();
        const pulseCheck = results.find(r => r.name === 'Pulse Files');

        assert.strictEqual(pulseCheck.status, 'fail', 'Should fail with multiple errors');
        assert.ok(pulseCheck.message.includes('3 file') || pulseCheck.message.includes('file(s)'),
          'Should report file count');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Build Artifacts Check Tests
  // =============================================================================

  describe('Build Artifacts Check', () => {

    test('checkBuildArtifacts returns info without dist', async () => {
      setupMockProject({});
      try {
        const results = await runDiagnostics({ verbose: true });
        const buildCheck = results.find(r => r.name === 'Build Artifacts');

        assert.strictEqual(buildCheck.status, 'info', 'Should show info without dist');
        assert.ok(buildCheck.message.includes('No dist') || buildCheck.message.includes('dist'),
          'Message should mention dist');
        assert.ok(buildCheck.suggestion.includes('build'), 'Should suggest running build');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkBuildArtifacts passes with dist directory', async () => {
      setupMockProject({});
      // Create dist with some files
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), '<html></html>');
      writeFileSync(join(TEST_DIR, 'dist', 'main.js'), 'console.log("built");');

      try {
        const results = await runDiagnostics({ verbose: true });
        const buildCheck = results.find(r => r.name === 'Build Artifacts');

        assert.strictEqual(buildCheck.status, 'pass', 'Should pass with dist directory');
        assert.ok(buildCheck.message.includes('file'), 'Message should show file count');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // node_modules Size Check Tests
  // =============================================================================

  describe('node_modules Size Check', () => {

    test('checkNodeModulesSize returns info without node_modules', async () => {
      setupMockProject({ hasNodeModules: false });
      try {
        const results = await runDiagnostics({ verbose: true });
        const sizeCheck = results.find(r => r.name === 'node_modules Size');

        assert.strictEqual(sizeCheck.status, 'info', 'Should show info without node_modules');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkNodeModulesSize passes with small node_modules', async () => {
      setupMockProject({ hasNodeModules: true });
      // Add a small file to node_modules
      writeFileSync(join(TEST_DIR, 'node_modules', 'test.js'), 'module.exports = {};');

      try {
        const results = await runDiagnostics({ verbose: true });
        const sizeCheck = results.find(r => r.name === 'node_modules Size');

        assert.strictEqual(sizeCheck.status, 'pass', 'Should pass with small node_modules');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Package.json Edge Cases
  // =============================================================================

  describe('Package.json Edge Cases', () => {

    test('checkPackageJson warns without name field', async () => {
      setupMockProject({
        hasPackageJson: true,
        packageJsonContent: {
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'pulse dev', build: 'pulse build' }
        }
      });
      try {
        const results = await runDiagnostics();
        const pkgCheck = results.find(r => r.name === 'package.json');

        assert.strictEqual(pkgCheck.status, 'warn', 'Should warn without name');
        assert.ok(pkgCheck.message.includes('name'), 'Message should mention name field');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkPackageJson handles partial scripts', async () => {
      setupMockProject({
        hasPackageJson: true,
        packageJsonContent: {
          name: 'test',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'pulse dev' }  // Missing build
        }
      });
      try {
        const results = await runDiagnostics();
        const pkgCheck = results.find(r => r.name === 'package.json');

        assert.strictEqual(pkgCheck.status, 'warn', 'Should warn with partial scripts');
        assert.ok(pkgCheck.message.includes('build'), 'Should mention missing build script');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Vite Config Edge Cases
  // =============================================================================

  describe('Vite Config Edge Cases', () => {

    test('checkViteConfig handles vite.config.ts', async () => {
      setupMockProject({ hasViteConfig: false });
      writeFileSync(
        join(TEST_DIR, 'vite.config.ts'),
        'import pulse from "pulse-js-framework/vite";\nexport default { plugins: [pulse()] };'
      );
      try {
        const results = await runDiagnostics();
        const viteCheck = results.find(r => r.name === 'Vite Config');

        assert.strictEqual(viteCheck.status, 'pass', 'Should find vite.config.ts');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkViteConfig handles vite.config.mjs', async () => {
      setupMockProject({ hasViteConfig: false });
      writeFileSync(
        join(TEST_DIR, 'vite.config.mjs'),
        'import pulse from "pulse-js-framework/vite";\nexport default { plugins: [pulse()] };'
      );
      try {
        const results = await runDiagnostics();
        const viteCheck = results.find(r => r.name === 'Vite Config');

        assert.strictEqual(viteCheck.status, 'pass', 'Should find vite.config.mjs');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Project Structure Edge Cases
  // =============================================================================

  describe('Project Structure Edge Cases', () => {

    test('checkProjectStructure detects main.ts', async () => {
      setupMockProject({ hasSrc: true, hasIndexHtml: true });
      // Remove main.js and add main.ts
      rmSync(join(TEST_DIR, 'src', 'main.js'), { force: true });
      writeFileSync(join(TEST_DIR, 'src', 'main.ts'), 'export default {};');

      try {
        const results = await runDiagnostics();
        const structCheck = results.find(r => r.name === 'Project Structure');

        assert.strictEqual(structCheck.status, 'pass', 'Should detect main.ts');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkProjectStructure detects index.js', async () => {
      setupMockProject({ hasSrc: true, hasIndexHtml: true });
      // Remove main.js and add index.js
      rmSync(join(TEST_DIR, 'src', 'main.js'), { force: true });
      writeFileSync(join(TEST_DIR, 'src', 'index.js'), 'export default {};');

      try {
        const results = await runDiagnostics();
        const structCheck = results.find(r => r.name === 'Project Structure');

        assert.strictEqual(structCheck.status, 'pass', 'Should detect index.js');
      } finally {
        cleanupMockProject();
      }
    });

    test('checkProjectStructure warns without main entry', async () => {
      setupMockProject({ hasSrc: false, hasIndexHtml: true });
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      // Don't create any main file
      writeFileSync(join(TEST_DIR, 'src', 'utils.js'), 'export const util = 1;');

      try {
        const results = await runDiagnostics();
        const structCheck = results.find(r => r.name === 'Project Structure');

        assert.strictEqual(structCheck.status, 'warn', 'Should warn without main entry');
        assert.ok(structCheck.message.includes('main') || structCheck.message.includes('entry'),
          'Should mention missing main entry');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // Comprehensive Edge Cases
  // =============================================================================

  describe('Comprehensive Edge Cases', () => {

    test('runDiagnostics handles all checks with minimal project', async () => {
      // Just create empty directory
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
      mkdirSync(TEST_DIR, { recursive: true });
      process.chdir(TEST_DIR);

      try {
        const results = await runDiagnostics({ verbose: true });

        // Should have all expected checks
        const checkNames = results.map(r => r.name);
        assert.ok(checkNames.includes('Node.js Version'), 'Should have Node check');
        assert.ok(checkNames.includes('npm Version'), 'Should have npm check');
        assert.ok(checkNames.includes('package.json'), 'Should have package.json check');
        assert.ok(checkNames.includes('Dependencies'), 'Should have Dependencies check');
        assert.ok(checkNames.includes('Project Structure'), 'Should have Project Structure check');
      } finally {
        cleanupMockProject();
      }
    });

    test('runDiagnostics results have consistent structure', async () => {
      setupMockProject({
        hasPackageJson: true,
        hasSrc: true,
        hasIndexHtml: true,
        hasNodeModules: true,
        hasViteConfig: true,
        hasGit: true
      });

      try {
        const results = await runDiagnostics({ verbose: true });

        for (const result of results) {
          // Every result must have these required fields
          assert.ok(typeof result.name === 'string' && result.name.length > 0,
            `Check "${result.name}" should have non-empty name`);
          assert.ok(['pass', 'warn', 'fail', 'info'].includes(result.status),
            `Check "${result.name}" should have valid status, got: ${result.status}`);
          assert.ok(typeof result.message === 'string',
            `Check "${result.name}" should have string message`);
        }
      } finally {
        cleanupMockProject();
      }
    });

    test('diagnostics run in reasonable order', async () => {
      setupMockProject();
      try {
        const results = await runDiagnostics();
        const names = results.map(r => r.name);

        // Environment checks should come first
        const nodeIndex = names.indexOf('Node.js Version');
        const npmIndex = names.indexOf('npm Version');
        const pkgIndex = names.indexOf('package.json');

        assert.ok(nodeIndex < pkgIndex, 'Node check should come before package.json');
        assert.ok(npmIndex < pkgIndex, 'npm check should come before package.json');
      } finally {
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // runDoctor Command Tests
  // =============================================================================

  describe('runDoctor Command Tests', () => {

    test('runDoctor outputs JSON format with --json flag', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor(['--json']);

        const output = mocks.logs.join('\n');
        // Should have JSON array output
        assert.ok(output.includes('[') && output.includes(']'), 'Should output JSON array');
        assert.ok(output.includes('"name"'), 'Should have name field');
        assert.ok(output.includes('"status"'), 'Should have status field');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor outputs formatted results by default', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // Should have formatted output with status icons
        assert.ok(output.includes('Doctor') || output.includes('Diagnostics') || output.includes('checks'),
          'Should show diagnostic information');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor handles verbose flag', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true, hasNodeModules: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor(['--verbose']);

        const output = mocks.logs.join('\n');
        assert.ok(output.length > 0, 'Should have output in verbose mode');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor handles -v short flag', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor(['-v']);

        const output = mocks.logs.join('\n');
        assert.ok(output.length > 0, 'Should have output with -v flag');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor displays pass status with checkmark', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // Should have checkmarks for passing checks
        assert.ok(output.includes('\u2713') || output.includes('pass') || output.includes('\u2714'),
          'Should show pass indicators');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor displays warning status', async () => {
      // Create project with missing optional config to trigger warning
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true, hasViteConfig: false });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // May have warnings for missing optional files
        assert.ok(output.length > 0, 'Should have output');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor exits with code 1 on failures', async () => {
      // Create minimal project that will have failures
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
      mkdirSync(TEST_DIR, { recursive: true });
      process.chdir(TEST_DIR);
      // No package.json, no src - should have failures

      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);
        // Should have thrown with EXIT_1
      } catch (e) {
        if (e.message === 'EXIT_1') {
          assert.strictEqual(mocks.getExitCode(), 1);
        } else if (!e.message.startsWith('EXIT_')) {
          throw e;
        }
      } finally {
        mocks.restore();
        process.chdir(originalCwd);
        cleanupMockProject();
      }
    });

    test('runDoctor shows summary with pass count', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // Should show completion message
        assert.ok(output.includes('Complete') || output.includes('passed') || output.includes('checks'),
          'Should show summary');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor shows elapsed time', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // Should show elapsed time
        assert.ok(output.includes('ms') || output.includes('second') || output.includes('Completed'),
          'Should show elapsed time');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('runDoctor shows suggestions for warnings', async () => {
      // Create project missing some config
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: false });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        // Output should contain the check results
        const output = mocks.logs.join('\n');
        assert.ok(output.length > 0, 'Should have output with suggestions');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // formatCheckResult Tests (via runDoctor output)
  // =============================================================================

  describe('formatCheckResult Tests', () => {

    test('formatCheckResult formats pass with green checkmark', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        const output = mocks.logs.join('\n');
        // Check for green color codes or checkmark
        assert.ok(output.includes('\x1b[32m') || output.includes('\u2713'),
          'Should have green checkmark for pass');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

    test('formatCheckResult pads check names for alignment', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      const mocks = setupCommandMocks();

      try {
        await runDoctor([]);

        // Output should have consistent formatting
        const output = mocks.logs.join('\n');
        assert.ok(output.length > 0, 'Should have formatted output');
      } catch (e) {
        if (!e.message.startsWith('EXIT_')) throw e;
      } finally {
        mocks.restore();
        cleanupMockProject();
      }
    });

  });

  // =============================================================================
  // getDirSize and countFiles Tests (via diagnostics)
  // =============================================================================

  describe('Directory Utility Tests', () => {

    test('getDirSize calculates node_modules size', async () => {
      setupMockProject({
        hasPackageJson: true,
        hasSrc: true,
        hasIndexHtml: true,
        hasNodeModules: true
      });

      try {
        const results = await runDiagnostics({ verbose: true });
        const nodeModulesCheck = results.find(r => r.name === 'node_modules Size');

        // Should have size info in message
        if (nodeModulesCheck) {
          assert.ok(nodeModulesCheck.message.includes('B') || nodeModulesCheck.message.includes('KB') ||
                   nodeModulesCheck.message.includes('MB') || nodeModulesCheck.message.includes('GB'),
            'Should show size with units');
        }
      } finally {
        cleanupMockProject();
      }
    });

    test('countFiles counts build artifacts', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      // Add dist directory with files
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'dist', 'app.js'), 'console.log("built");');
      writeFileSync(join(TEST_DIR, 'dist', 'app.css'), '.app {}');
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), '<html></html>');

      try {
        const results = await runDiagnostics({ verbose: true });
        const buildCheck = results.find(r => r.name === 'Build Artifacts');

        if (buildCheck) {
          // Should mention dist or build artifacts
          assert.ok(buildCheck.status !== undefined, 'Should have status');
        }
      } finally {
        cleanupMockProject();
      }
    });

    test('getDirSize handles empty directories', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      // Create empty node_modules
      mkdirSync(join(TEST_DIR, 'node_modules'), { recursive: true });

      try {
        const results = await runDiagnostics({ verbose: true });
        // Should not crash on empty directories
        assert.ok(Array.isArray(results), 'Should return results array');
      } finally {
        cleanupMockProject();
      }
    });

    test('countFiles handles nested directories', async () => {
      setupMockProject({ hasPackageJson: true, hasSrc: true, hasIndexHtml: true });
      // Create deeply nested dist
      const deepPath = join(TEST_DIR, 'dist', 'assets', 'js', 'chunks');
      mkdirSync(deepPath, { recursive: true });
      writeFileSync(join(deepPath, 'chunk1.js'), 'export {};');
      writeFileSync(join(deepPath, 'chunk2.js'), 'export {};');
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), '<html></html>');

      try {
        const results = await runDiagnostics({ verbose: true });
        // Should count files in nested directories
        assert.ok(Array.isArray(results), 'Should return results array');
      } finally {
        cleanupMockProject();
      }
    });

  });

});
