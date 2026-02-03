/**
 * Pulse CLI - Doctor Command
 * Project diagnostics and health checks
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { execSync } from 'child_process';
import { log } from './logger.js';
import { findPulseFiles, parseArgs, formatBytes } from './utils/file-utils.js';
import { createTimer, formatDuration } from './utils/cli-ui.js';

/**
 * Diagnostic check result
 * @typedef {Object} CheckResult
 * @property {string} name - Check name
 * @property {'pass'|'warn'|'fail'|'info'} status - Check status
 * @property {string} message - Result message
 * @property {string} [suggestion] - Fix suggestion
 */

/**
 * Run all diagnostic checks
 * @param {Object} options - Check options
 * @returns {Promise<CheckResult[]>}
 */
export async function runDiagnostics(options = {}) {
  const { verbose = false, fix = false } = options;
  const results = [];

  // Environment checks
  results.push(await checkNodeVersion());
  results.push(await checkNpmVersion());

  // Project structure checks
  results.push(await checkPackageJson());
  results.push(await checkDependencies());
  results.push(await checkPulseFramework());
  results.push(await checkViteConfig());
  results.push(await checkProjectStructure());

  // Code quality checks
  results.push(await checkPulseFiles());
  results.push(await checkGitStatus());

  // Performance checks
  if (verbose) {
    results.push(await checkNodeModulesSize());
    results.push(await checkBuildArtifacts());
  }

  return results;
}

/**
 * Check Node.js version
 */
async function checkNodeVersion() {
  const name = 'Node.js Version';
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major < 18) {
      return {
        name,
        status: 'fail',
        message: `Node.js ${version} detected`,
        suggestion: 'Pulse requires Node.js 18+. Please upgrade: https://nodejs.org'
      };
    } else if (major < 20) {
      return {
        name,
        status: 'warn',
        message: `Node.js ${version} (recommended: 20+)`,
        suggestion: 'Consider upgrading to Node.js 20+ for better test coverage support'
      };
    }

    return {
      name,
      status: 'pass',
      message: `Node.js ${version}`
    };
  } catch (e) {
    return {
      name,
      status: 'fail',
      message: 'Could not detect Node.js version',
      suggestion: 'Ensure Node.js is properly installed'
    };
  }
}

/**
 * Check npm version
 */
async function checkNpmVersion() {
  const name = 'npm Version';
  try {
    const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
    const major = parseInt(version.split('.')[0], 10);

    if (major < 8) {
      return {
        name,
        status: 'warn',
        message: `npm ${version} (recommended: 8+)`,
        suggestion: 'Consider upgrading npm: npm install -g npm@latest'
      };
    }

    return {
      name,
      status: 'pass',
      message: `npm ${version}`
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not detect npm version'
    };
  }
}

/**
 * Check package.json exists and is valid
 */
async function checkPackageJson() {
  const name = 'package.json';
  const pkgPath = join(process.cwd(), 'package.json');

  if (!existsSync(pkgPath)) {
    return {
      name,
      status: 'fail',
      message: 'package.json not found',
      suggestion: 'Run "npm init" or "pulse create <name>" to create a project'
    };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    const issues = [];

    // Check for type: module
    if (pkg.type !== 'module') {
      issues.push('Missing "type": "module"');
    }

    // Check for required scripts
    if (!pkg.scripts?.dev) {
      issues.push('Missing "dev" script');
    }
    if (!pkg.scripts?.build) {
      issues.push('Missing "build" script');
    }

    // Check for name
    if (!pkg.name) {
      issues.push('Missing "name" field');
    }

    if (issues.length > 0) {
      return {
        name,
        status: 'warn',
        message: `Issues found: ${issues.join(', ')}`,
        suggestion: 'Update package.json to fix these issues'
      };
    }

    return {
      name,
      status: 'pass',
      message: `${pkg.name}@${pkg.version || '0.0.0'}`
    };
  } catch (e) {
    return {
      name,
      status: 'fail',
      message: 'Invalid package.json: ' + e.message,
      suggestion: 'Fix the JSON syntax error in package.json'
    };
  }
}

/**
 * Check dependencies are installed
 */
async function checkDependencies() {
  const name = 'Dependencies';
  const nodeModulesPath = join(process.cwd(), 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    return {
      name,
      status: 'fail',
      message: 'node_modules not found',
      suggestion: 'Run "npm install" to install dependencies'
    };
  }

  // Check for common issues
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) {
    return {
      name,
      status: 'warn',
      message: 'Cannot verify dependencies without package.json'
    };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };

    const missing = [];
    for (const dep of Object.keys(allDeps)) {
      if (!existsSync(join(nodeModulesPath, dep))) {
        missing.push(dep);
      }
    }

    if (missing.length > 0) {
      return {
        name,
        status: 'warn',
        message: `Missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3} more)` : ''}`,
        suggestion: 'Run "npm install" to install missing dependencies'
      };
    }

    const depCount = Object.keys(allDeps).length;
    return {
      name,
      status: 'pass',
      message: `${depCount} dependencies installed`
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not verify dependencies'
    };
  }
}

/**
 * Check Pulse framework is installed
 */
async function checkPulseFramework() {
  const name = 'Pulse Framework';
  const pkgPath = join(process.cwd(), 'package.json');

  if (!existsSync(pkgPath)) {
    return {
      name,
      status: 'info',
      message: 'Not a Node.js project'
    };
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (allDeps['pulse-js-framework']) {
      const version = allDeps['pulse-js-framework'];
      return {
        name,
        status: 'pass',
        message: `pulse-js-framework ${version}`
      };
    }

    // Check if this IS the framework
    if (pkg.name === 'pulse-js-framework') {
      return {
        name,
        status: 'pass',
        message: `Framework source (${pkg.version})`
      };
    }

    return {
      name,
      status: 'warn',
      message: 'Pulse framework not found in dependencies',
      suggestion: 'Run "npm install pulse-js-framework"'
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not check framework'
    };
  }
}

/**
 * Check Vite configuration
 */
async function checkViteConfig() {
  const name = 'Vite Config';
  const configFiles = [
    'vite.config.js',
    'vite.config.ts',
    'vite.config.mjs'
  ];

  let configPath = null;
  for (const file of configFiles) {
    const path = join(process.cwd(), file);
    if (existsSync(path)) {
      configPath = path;
      break;
    }
  }

  if (!configPath) {
    return {
      name,
      status: 'info',
      message: 'No Vite config found',
      suggestion: 'Create vite.config.js for Vite integration'
    };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');

    // Check for Pulse plugin
    if (!content.includes('pulse')) {
      return {
        name,
        status: 'warn',
        message: 'Vite config missing Pulse plugin',
        suggestion: 'Add: import pulse from "pulse-js-framework/vite"'
      };
    }

    return {
      name,
      status: 'pass',
      message: relative(process.cwd(), configPath)
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not read Vite config'
    };
  }
}

/**
 * Check project structure
 */
async function checkProjectStructure() {
  const name = 'Project Structure';
  const issues = [];

  // Check for src directory
  if (!existsSync(join(process.cwd(), 'src'))) {
    issues.push('No src/ directory');
  }

  // Check for index.html
  if (!existsSync(join(process.cwd(), 'index.html'))) {
    issues.push('No index.html');
  }

  // Check for main entry file
  const mainFiles = ['src/main.js', 'src/main.ts', 'src/index.js', 'src/index.ts'];
  const hasMain = mainFiles.some(f => existsSync(join(process.cwd(), f)));
  if (!hasMain) {
    issues.push('No main entry file in src/');
  }

  if (issues.length > 0) {
    return {
      name,
      status: 'warn',
      message: issues.join(', '),
      suggestion: 'Run "pulse create <name>" to create a proper project structure'
    };
  }

  return {
    name,
    status: 'pass',
    message: 'Standard structure detected'
  };
}

/**
 * Check .pulse files for issues
 */
async function checkPulseFiles() {
  const name = 'Pulse Files';

  try {
    const files = findPulseFiles(['.']);

    if (files.length === 0) {
      return {
        name,
        status: 'info',
        message: 'No .pulse files found'
      };
    }

    // Quick syntax check
    const { parse } = await import('../compiler/index.js');
    let errors = 0;
    const errorFiles = [];

    for (const file of files) {
      try {
        const source = readFileSync(file, 'utf-8');
        parse(source);
      } catch (e) {
        errors++;
        errorFiles.push(relative(process.cwd(), file));
      }
    }

    if (errors > 0) {
      return {
        name,
        status: 'fail',
        message: `${errors} file(s) with syntax errors`,
        suggestion: `Run "pulse lint" to see details. Files: ${errorFiles.slice(0, 2).join(', ')}${errorFiles.length > 2 ? '...' : ''}`
      };
    }

    return {
      name,
      status: 'pass',
      message: `${files.length} file(s) OK`
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not check .pulse files: ' + e.message
    };
  }
}

/**
 * Check git status
 */
async function checkGitStatus() {
  const name = 'Git Repository';

  if (!existsSync(join(process.cwd(), '.git'))) {
    return {
      name,
      status: 'info',
      message: 'Not a git repository',
      suggestion: 'Run "git init" to initialize version control'
    };
  }

  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const changes = status.trim().split('\n').filter(l => l.trim()).length;

    if (changes > 0) {
      return {
        name,
        status: 'info',
        message: `${changes} uncommitted change(s)`
      };
    }

    // Get current branch
    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    return {
      name,
      status: 'pass',
      message: `On branch: ${branch}`
    };
  } catch (e) {
    return {
      name,
      status: 'warn',
      message: 'Could not check git status'
    };
  }
}

/**
 * Check node_modules size
 */
async function checkNodeModulesSize() {
  const name = 'node_modules Size';
  const nodeModulesPath = join(process.cwd(), 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    return {
      name,
      status: 'info',
      message: 'node_modules not found'
    };
  }

  try {
    const size = getDirSize(nodeModulesPath);

    if (size > 500 * 1024 * 1024) { // 500MB
      return {
        name,
        status: 'warn',
        message: `${formatBytes(size)} (large)`,
        suggestion: 'Consider cleaning with: npm prune && npm dedupe'
      };
    }

    return {
      name,
      status: 'pass',
      message: formatBytes(size)
    };
  } catch (e) {
    return {
      name,
      status: 'info',
      message: 'Could not calculate size'
    };
  }
}

/**
 * Check build artifacts
 */
async function checkBuildArtifacts() {
  const name = 'Build Artifacts';
  const distPath = join(process.cwd(), 'dist');

  if (!existsSync(distPath)) {
    return {
      name,
      status: 'info',
      message: 'No dist/ directory',
      suggestion: 'Run "pulse build" to create a production build'
    };
  }

  try {
    const size = getDirSize(distPath);
    const files = countFiles(distPath);

    return {
      name,
      status: 'pass',
      message: `${files} file(s), ${formatBytes(size)}`
    };
  } catch (e) {
    return {
      name,
      status: 'info',
      message: 'Could not check build'
    };
  }
}

/**
 * Get directory size recursively
 */
function getDirSize(dir) {
  let size = 0;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const path = join(dir, entry);
      try {
        const stat = statSync(path);
        if (stat.isDirectory()) {
          size += getDirSize(path);
        } else {
          size += stat.size;
        }
      } catch (e) {
        // Skip inaccessible files
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }

  return size;
}

/**
 * Count files in directory
 */
function countFiles(dir) {
  let count = 0;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const path = join(dir, entry);
      try {
        const stat = statSync(path);
        if (stat.isDirectory()) {
          count += countFiles(path);
        } else {
          count++;
        }
      } catch (e) {
        // Skip
      }
    }
  } catch (e) {
    // Skip
  }

  return count;
}

/**
 * Format check result for display
 */
function formatCheckResult(result) {
  const icons = {
    pass: '\x1b[32m✓\x1b[0m',  // Green checkmark
    warn: '\x1b[33m!\x1b[0m',  // Yellow exclamation
    fail: '\x1b[31m✗\x1b[0m',  // Red X
    info: '\x1b[34mi\x1b[0m'   // Blue i
  };

  const icon = icons[result.status] || '?';
  const name = result.name.padEnd(20);
  const message = result.message;

  return `  ${icon} ${name} ${message}`;
}

/**
 * Main doctor command handler
 */
export async function runDoctor(args) {
  const { options } = parseArgs(args);
  const verbose = options.verbose || options.v || false;
  const json = options.json || false;

  const timer = createTimer();

  log.info('Pulse Doctor - Project Diagnostics\n');
  log.info('Running checks...\n');

  const results = await runDiagnostics({ verbose });

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Display results
  for (const result of results) {
    log.info(formatCheckResult(result));
    if (result.suggestion && (result.status === 'warn' || result.status === 'fail')) {
      log.info(`     \x1b[90m${result.suggestion}\x1b[0m`);
    }
  }

  // Summary
  const elapsed = formatDuration(timer.elapsed());
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failures = results.filter(r => r.status === 'fail').length;

  log.info('\n' + '─'.repeat(50));

  if (failures > 0) {
    log.error(`${failures} issue(s) require attention`);
  }
  if (warnings > 0) {
    log.warn(`${warnings} warning(s)`);
  }
  if (failures === 0 && warnings === 0) {
    log.success(`All ${passed} checks passed`);
  }

  log.info(`\nCompleted in ${elapsed}`);

  if (failures > 0) {
    process.exit(1);
  }
}
