#!/usr/bin/env node

/**
 * Pulse Framework Project Auditor
 *
 * Runs comprehensive audits across 7 domains:
 * - Code Quality
 * - Security
 * - Performance
 * - Accessibility
 * - Architecture
 * - Testing
 * - Documentation
 *
 * Usage:
 *   node run-audit.js                          # Full audit
 *   node run-audit.js --domain security        # Single domain
 *   node run-audit.js runtime/dom.js           # Specific file
 *   node run-audit.js --format json            # JSON output
 *   node run-audit.js --format summary         # Quick overview
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname, basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';

// ── Configuration ──────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..');
const DOMAINS = ['security', 'performance', 'a11y', 'architecture', 'quality', 'testing', 'docs'];
const SEVERITY = { critical: 20, high: 10, medium: 3, low: 1 };
const WEIGHTS = {
  security: 0.25,
  architecture: 0.20,
  quality: 0.15,
  testing: 0.15,
  performance: 0.10,
  a11y: 0.10,
  docs: 0.05
};

// ── CLI Argument Parsing ───────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetDomain = null;
let targetPath = null;
let format = 'markdown';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--domain' && args[i + 1]) {
    targetDomain = args[++i];
    if (!DOMAINS.includes(targetDomain)) {
      console.error(`Unknown domain: ${targetDomain}`);
      console.error(`Available: ${DOMAINS.join(', ')}`);
      process.exit(1);
    }
  } else if (args[i] === '--format' && args[i + 1]) {
    format = args[++i];
    if (!['markdown', 'json', 'summary'].includes(format)) {
      console.error(`Unknown format: ${format}. Use: markdown, json, summary`);
      process.exit(1);
    }
  } else if (!args[i].startsWith('--')) {
    targetPath = resolve(ROOT, args[i]);
  }
}

// ── File Scanning ──────────────────────────────────────────────────────────────

function getSourceFiles(dir, extensions = ['.js', '.mjs']) {
  const files = [];
  const IGNORE = ['node_modules', '.git', 'dist', 'coverage', '.claude'];

  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }

    for (const entry of entries) {
      if (IGNORE.includes(entry)) continue;
      const full = join(d, entry);
      let stat;
      try { stat = statSync(full); } catch { continue; }

      if (stat.isDirectory()) {
        walk(full);
      } else if (extensions.includes(extname(entry))) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

function readFileSafe(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

function relPath(path) {
  return relative(ROOT, path);
}

// ── Finding Class ──────────────────────────────────────────────────────────────

class Finding {
  constructor(severity, domain, title, file, line, description, fix) {
    this.severity = severity; // critical, high, medium, low, info
    this.domain = domain;
    this.title = title;
    this.file = file ? relPath(file) : null;
    this.line = line;
    this.description = description;
    this.fix = fix;
  }

  get icon() {
    return { critical: '[!]', high: '[H]', medium: '[M]', low: '[L]', info: '[i]' }[this.severity];
  }
}

const findings = [];

function addFinding(severity, domain, title, file, line, description, fix) {
  findings.push(new Finding(severity, domain, title, file, line, description, fix));
}

// ── Security Audit ─────────────────────────────────────────────────────────────

function auditSecurity(files) {
  for (const file of files) {
    const content = readFileSafe(file);
    const lines = content.split('\n');
    const rel = relPath(file);

    // Skip test files and audit scripts
    if (rel.includes('test/') || rel.includes('.claude/')) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Raw innerHTML assignment
      if (/\.innerHTML\s*=/.test(line) && !/escapeHtml|sanitizeHtml|sanitize.*true/.test(line)) {
        if (!/\/\/.*audit-ignore/.test(line)) {
          addFinding('critical', 'security', 'Potential XSS: raw innerHTML assignment',
            file, lineNum, `Direct innerHTML assignment without sanitization: ${line.trim()}`,
            'Use el() for DOM creation, textContent for text, or escapeHtml() for escaped HTML');
        }
      }

      // eval / Function constructor with variables
      if (/\beval\s*\(/.test(line) || /new\s+Function\s*\((?!['"][^'"]*['"])/.test(line)) {
        if (!/\/\/.*audit-ignore/.test(line)) {
          addFinding('critical', 'security', 'Dynamic code execution (eval/Function)',
            file, lineNum, `Dynamic code execution detected: ${line.trim()}`,
            'Avoid eval() and new Function() with dynamic input. Use safer alternatives.');
        }
      }

      // document.write
      if (/document\.write\s*\(/.test(line)) {
        addFinding('high', 'security', 'document.write usage',
          file, lineNum, 'document.write can cause XSS and performance issues',
          'Use el() and mount() instead');
      }

      // setAttribute with event handlers
      if (/setAttribute\s*\(\s*['"]on\w+/.test(line) && !/safeSetAttribute/.test(line)) {
        addFinding('high', 'security', 'Event handler via setAttribute',
          file, lineNum, 'Setting event handlers via setAttribute allows injection',
          'Use on() function or safeSetAttribute() instead');
      }

      // Unvalidated URL patterns
      if (/(?:href|src|action)\s*=\s*(?!['"](?:https?:|\/|#))/.test(line)) {
        if (/userInput|user|input|param|query|url/i.test(line) && !/sanitizeUrl/.test(line)) {
          addFinding('high', 'security', 'Potentially unvalidated URL',
            file, lineNum, 'User-provided URL used without sanitizeUrl()',
            'Pass user URLs through sanitizeUrl() before setting href/src/action');
        }
      }

      // Regex with catastrophic backtracking potential
      if (/new RegExp\(/.test(line) && /\+\s*['"]/.test(line)) {
        addFinding('medium', 'security', 'Dynamic regex construction',
          file, lineNum, 'Regex built from dynamic values could cause ReDoS',
          'Validate and escape user input before using in regex');
      }

      // __proto__ or constructor access without sanitization
      if (/(?:__proto__|constructor\.prototype)/.test(line) && !/sanitize|block|filter|check/.test(line)) {
        addFinding('high', 'security', 'Prototype chain access',
          file, lineNum, 'Direct prototype chain access can lead to pollution',
          'Use sanitizeObjectKeys() for user input objects');
      }
    }
  }

  // Check npm audit
  try {
    execSync('npm audit --audit-level=moderate --json 2>/dev/null', { cwd: ROOT, timeout: 30000 });
  } catch (e) {
    if (e.stdout) {
      try {
        const audit = JSON.parse(e.stdout.toString());
        const vulns = audit.metadata?.vulnerabilities || {};
        if (vulns.critical > 0) {
          addFinding('critical', 'security', `${vulns.critical} critical npm vulnerability(ies)`,
            null, null, 'npm audit found critical vulnerabilities in dependencies',
            'Run npm audit fix or update vulnerable packages');
        }
        if (vulns.high > 0) {
          addFinding('high', 'security', `${vulns.high} high npm vulnerability(ies)`,
            null, null, 'npm audit found high-severity vulnerabilities',
            'Run npm audit fix or update vulnerable packages');
        }
      } catch { /* parse error, skip */ }
    }
  }
}

// ── Performance Audit ──────────────────────────────────────────────────────────

function auditPerformance(files) {
  for (const file of files) {
    const content = readFileSafe(file);
    const lines = content.split('\n');
    const rel = relPath(file);

    if (rel.includes('test/') || rel.includes('.claude/')) continue;

    let inEffect = false;
    let effectHasCleanup = false;
    let effectStartLine = 0;
    let consecutiveSets = 0;
    let lastSetLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect consecutive .set() calls without batch
      if (/\.set\s*\(/.test(line) && !/batch/.test(content.substring(Math.max(0, content.indexOf(line) - 200), content.indexOf(line)))) {
        if (lineNum - lastSetLine <= 2 && lastSetLine > 0) {
          consecutiveSets++;
          if (consecutiveSets >= 3) {
            addFinding('medium', 'performance', 'Multiple sequential .set() without batch()',
              file, lineNum, `${consecutiveSets + 1} consecutive .set() calls should be wrapped in batch()`,
              'Wrap in batch(() => { ... }) to defer effects until all updates complete');
            consecutiveSets = 0;
          }
        } else {
          consecutiveSets = 1;
        }
        lastSetLine = lineNum;
      }

      // Effect without cleanup (setInterval, addEventListener, subscribe)
      if (/\beffect\s*\(/.test(line)) {
        inEffect = true;
        effectHasCleanup = false;
        effectStartLine = lineNum;
      }

      if (inEffect) {
        if (/setInterval|addEventListener|\.subscribe\s*\(|\.on\s*\(/.test(line)) {
          // Check if there's a cleanup return
          const effectBlock = lines.slice(effectStartLine - 1, Math.min(i + 20, lines.length)).join('\n');
          if (!/return\s*\(\s*\)\s*=>|return\s*\(\)\s*=>|onCleanup/.test(effectBlock)) {
            addFinding('high', 'performance', 'Effect without cleanup (potential memory leak)',
              file, lineNum, `Effect subscribes to ${line.trim().match(/setInterval|addEventListener|subscribe|\.on/)?.[0]} without returning cleanup`,
              'Return a cleanup function: return () => { clearInterval(id) }');
          }
          inEffect = false;
        }
        if (/^\s*\}\s*\)/.test(line)) {
          inEffect = false;
        }
      }

      // list() without key function
      if (/\blist\s*\(\s*[^,]+,\s*[^,]+\s*\)/.test(line)) {
        // Simple check: list with only 2 args (no key function)
        addFinding('medium', 'performance', 'list() without key function',
          file, lineNum, 'list() called without key function - entire list re-renders on change',
          'Add key function as 3rd argument: list(items, render, item => item.id)');
      }

      // O(n^2) pattern: nested loops on same array
      if (/for\s*\(.*\.length/.test(line) || /\.forEach\s*\(/.test(line)) {
        const next10 = lines.slice(i + 1, i + 10).join('\n');
        if (/for\s*\(.*\.length|\.forEach\s*\(|\.filter\s*\(|\.find\s*\(/.test(next10)) {
          addFinding('medium', 'performance', 'Potential O(n^2) nested iteration',
            file, lineNum, 'Nested iteration detected - consider using Map/Set for O(1) lookups',
            'Use a Map or Set for O(1) lookups instead of nested array iteration');
        }
      }

      // Synchronous heavy operation
      if (/JSON\.parse\s*\(.*JSON\.stringify/.test(line)) {
        addFinding('low', 'performance', 'Deep clone via JSON.parse(JSON.stringify())',
          file, lineNum, 'JSON round-trip for cloning is slow for large objects',
          'Use structuredClone() or the framework deepClone() utility');
      }
    }

    // File size check (> 500 lines for runtime)
    if (rel.startsWith('runtime/') && !rel.includes('/')) {
      if (lines.length > 800) {
        addFinding('medium', 'performance', `Large file: ${rel} (${lines.length} lines)`,
          file, null, 'Large files are harder to maintain and may impact bundle size',
          'Consider splitting into sub-modules (like router/ or a11y/ pattern)');
      }
    }
  }
}

// ── Architecture Audit ─────────────────────────────────────────────────────────

function auditArchitecture(files) {
  for (const file of files) {
    const content = readFileSafe(file);
    const rel = relPath(file);

    if (rel.includes('test/') || rel.includes('.claude/') || rel.includes('node_modules')) continue;

    // Layer violation: runtime importing from cli or compiler
    if (rel.startsWith('runtime/')) {
      const cliImports = content.match(/from\s+['"]\.\.\/cli\//g);
      const compilerImports = content.match(/from\s+['"]\.\.\/compiler\//g);

      if (cliImports) {
        addFinding('critical', 'architecture', 'Layer violation: runtime imports from cli/',
          file, null, `Runtime module imports from CLI layer (${cliImports.length} imports)`,
          'Runtime must never import from CLI. Move shared code to runtime/utils.js');
      }
      if (compilerImports) {
        addFinding('critical', 'architecture', 'Layer violation: runtime imports from compiler/',
          file, null, `Runtime module imports from compiler layer (${compilerImports.length} imports)`,
          'Runtime must never import from compiler. Move shared code to a shared module');
      }
    }

    // Direct DOM access without adapter in runtime
    if (rel.startsWith('runtime/') && !rel.includes('dom-adapter') && !rel.includes('lite.js')) {
      const directDOM = content.match(/\bdocument\.(createElement|querySelector|getElementById|body|head)\b/g);
      if (directDOM && !rel.includes('dom.js') && !rel.includes('dom-')) {
        addFinding('high', 'architecture', 'Direct DOM access without adapter',
          file, null, `${directDOM.length} direct document.* calls found`,
          'Use getAdapter() from dom-adapter.js for SSR compatibility');
      }
    }

    // External dependencies in runtime
    if (rel.startsWith('runtime/') && !rel.includes('node_modules')) {
      const importLines = content.split('\n').filter(l =>
        /^\s*(?:import|export)\s/.test(l) && /from\s+['"]/.test(l)
      );
      const externalImports = importLines
        .map(l => l.match(/from\s+['"]([^'"]+)['"]/)?.[1])
        .filter(Boolean)
        .filter(mod => !mod.startsWith('.') && !mod.startsWith('/') && !mod.startsWith('node:'))
        .filter(mod => !mod.startsWith('pulse-js-framework'))
        .filter(mod => !['sass', 'less', 'stylus'].some(p => mod.includes(p)));

      if (externalImports.length > 0) {
        addFinding('critical', 'architecture', 'External dependency in runtime',
          file, null, `Non-optional external imports found: ${externalImports.join(', ')}`,
          'Runtime must be zero-dependency. Implement functionality inline or in utils.js');
      }
    }

    // Raw Error instead of PulseError
    if (rel.startsWith('runtime/') || rel.startsWith('compiler/')) {
      const rawErrors = content.match(/throw\s+new\s+Error\s*\(/g);
      if (rawErrors && rawErrors.length > 0 && !rel.includes('errors.js')) {
        addFinding('low', 'architecture', `Raw Error thrown (${rawErrors.length} instances)`,
          file, null, 'Using raw Error instead of PulseError hierarchy',
          'Use Errors.* creators from runtime/errors.js for structured errors');
      }
    }

    // Default exports (hurts tree-shaking)
    if (/export\s+default\s/.test(content) && rel.startsWith('runtime/')) {
      addFinding('medium', 'architecture', 'Default export in runtime module',
        file, null, 'Default exports hurt tree-shaking; prefer named exports',
        'Use named exports: export { myFunction } instead of export default');
    }
  }

  // Check package.json exports map
  const pkgPath = join(ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSafe(pkgPath));
      const exports = pkg.exports || {};

      for (const [key, value] of Object.entries(exports)) {
        const filePath = typeof value === 'string' ? value : value?.import || value?.default;
        if (filePath && !existsSync(join(ROOT, filePath.replace('./', '')))) {
          addFinding('high', 'architecture', `Export map points to missing file: ${key}`,
            pkgPath, null, `${key} -> ${filePath} does not exist`,
            'Update package.json exports map or create the missing file');
        }
      }
    } catch { /* parse error */ }
  }
}

// ── Code Quality Audit ─────────────────────────────────────────────────────────

function auditQuality(files) {
  for (const file of files) {
    const content = readFileSafe(file);
    const lines = content.split('\n');
    const rel = relPath(file);

    if (rel.includes('test/') || rel.includes('.claude/') || rel.includes('node_modules')) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Console.log left in production code
      if (/console\.(log|debug|info)\s*\(/.test(line) && !rel.includes('logger') && !rel.includes('devtools')) {
        if (!/\/\//.test(line.split('console')[0])) {
          addFinding('low', 'quality', 'console.log in production code',
            file, lineNum, 'console.log should use the logger module or be removed',
            'Use createLogger() from runtime/logger.js instead');
        }
      }

      // TODO/FIXME/HACK comments
      if (/\/\/\s*(TODO|FIXME|HACK|XXX|TEMP)\b/i.test(line)) {
        const marker = line.match(/(TODO|FIXME|HACK|XXX|TEMP)/i)[1];
        addFinding('low', 'quality', `${marker} comment found`,
          file, lineNum, `Unresolved ${marker}: ${line.trim().substring(0, 80)}`,
          `Resolve the ${marker} or create an issue to track it`);
      }

      // Very long function (heuristic: function definition followed by 50+ lines before closing)
      if (/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>)/.test(line)) {
        // Simple heuristic: check indentation depth
        let depth = 0;
        let funcLength = 0;
        for (let j = i; j < lines.length && j < i + 200; j++) {
          depth += (lines[j].match(/\{/g) || []).length;
          depth -= (lines[j].match(/\}/g) || []).length;
          funcLength++;
          if (depth <= 0 && j > i) break;
        }
        if (funcLength > 80) {
          addFinding('medium', 'quality', `Long function (${funcLength} lines)`,
            file, lineNum, `Function starting at line ${lineNum} is ${funcLength} lines long`,
            'Consider extracting helper functions for better readability');
        }
      }

      // Deeply nested code (> 4 levels of indentation)
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent >= 20 && line.trim().length > 0 && !line.trim().startsWith('*') && !line.trim().startsWith('//')) {
        addFinding('low', 'quality', 'Deeply nested code (> 4 levels)',
          file, lineNum, 'Excessive nesting reduces readability',
          'Use early returns, extract helper functions, or flatten conditionals');
      }
    }

    // Check for unhandled promise rejections
    const unhandledAwaits = content.match(/(?<!try\s*\{[^}]*)\bawait\s+(?!.*\.catch)/g);
    if (unhandledAwaits && unhandledAwaits.length > 5) {
      addFinding('medium', 'quality', `Many await calls without try-catch (${unhandledAwaits.length})`,
        file, null, 'Multiple await calls may have unhandled rejections',
        'Wrap critical await calls in try-catch or add .catch() handlers');
    }
  }
}

// ── Accessibility Audit ────────────────────────────────────────────────────────

function auditA11y(files) {
  // Check a11y module completeness
  const a11yDir = join(ROOT, 'runtime', 'a11y');
  const a11yMain = join(ROOT, 'runtime', 'a11y.js');

  if (!existsSync(a11yMain) && !existsSync(a11yDir)) {
    addFinding('high', 'a11y', 'No a11y module found',
      null, null, 'Missing runtime/a11y.js accessibility module',
      'Create a11y module with focus management, announcements, and ARIA helpers');
    return;
  }

  // Check auto-ARIA in dom.js
  const domFile = join(ROOT, 'runtime', 'dom.js');
  if (existsSync(domFile)) {
    const domContent = readFileSafe(domFile);
    if (!/configureA11y|autoAria|auto-aria/i.test(domContent)) {
      addFinding('medium', 'a11y', 'Auto-ARIA not detected in dom.js',
        domFile, null, 'dom.js should include configureA11y() for automatic ARIA attributes',
        'Add configureA11y() export and auto-ARIA logic in el() function');
    }
  }

  // Check lint rules for a11y
  const lintFile = join(ROOT, 'cli', 'lint.js');
  if (existsSync(lintFile)) {
    const lintContent = readFileSafe(lintFile);
    const a11yRules = [
      'a11y-img-alt', 'a11y-button-text', 'a11y-link-text',
      'a11y-input-label', 'a11y-click-key'
    ];

    for (const rule of a11yRules) {
      if (!lintContent.includes(rule)) {
        addFinding('medium', 'a11y', `Missing a11y lint rule: ${rule}`,
          lintFile, null, `Lint rule '${rule}' not found in linter`,
          `Add ${rule} rule to catch accessibility issues at build time`);
      }
    }
  }

  // Check example files for a11y patterns
  for (const file of files) {
    const content = readFileSafe(file);
    const rel = relPath(file);

    if (!rel.includes('example') && !rel.includes('template')) continue;

    // Images without alt
    if (/el\s*\(\s*['"]img/.test(content) && !/alt/.test(content)) {
      addFinding('medium', 'a11y', 'Example has images without alt attribute',
        file, null, 'Example code should demonstrate accessible image usage',
        'Add alt attribute: el("img", { alt: "Description" })');
    }

    // Click handlers on non-interactive elements
    if (/el\s*\(\s*['"]div.*onclick/i.test(content) || /el\s*\(\s*['"]span.*onclick/i.test(content)) {
      addFinding('medium', 'a11y', 'Click handler on non-interactive element in example',
        file, null, 'Using onclick on div/span without role="button" and keyboard support',
        'Use <button> or add role="button" + tabindex="0" + onkeydown handler');
    }
  }
}

// ── Testing Audit ──────────────────────────────────────────────────────────────

function auditTesting(files) {
  const testDir = join(ROOT, 'test');
  const runtimeDir = join(ROOT, 'runtime');

  // Find runtime modules without tests
  if (existsSync(runtimeDir)) {
    const runtimeFiles = readdirSync(runtimeDir).filter(f => f.endsWith('.js') && !f.startsWith('.'));

    for (const runtimeFile of runtimeFiles) {
      const testName = runtimeFile.replace('.js', '.test.js');
      const moduleName = runtimeFile.replace('.js', '');

      if (!existsSync(join(testDir, testName))) {
        // Check alternative test file names
        const alternatives = [
          `${moduleName}.test.js`,
          `${moduleName}-coverage.test.js`,
          `${moduleName}-advanced.test.js`
        ];

        const hasAnyTest = alternatives.some(alt => existsSync(join(testDir, alt)));

        if (!hasAnyTest) {
          addFinding('high', 'testing', `Missing test file for runtime/${runtimeFile}`,
            join(runtimeDir, runtimeFile), null,
            `No test file found for runtime/${runtimeFile}`,
            `Create test/${testName} with comprehensive tests`);
        }
      }
    }
  }

  // Check test files for quality issues
  const testFiles = existsSync(testDir)
    ? readdirSync(testDir).filter(f => f.endsWith('.test.js')).map(f => join(testDir, f))
    : [];

  for (const file of testFiles) {
    const content = readFileSafe(file);
    const rel = relPath(file);

    // Jest/Mocha usage instead of node:test
    if (/require\s*\(\s*['"]jest|require\s*\(\s*['"]mocha|from\s+['"]jest|from\s+['"]mocha/.test(content)) {
      addFinding('high', 'testing', 'Wrong test framework (not node:test)',
        file, null, 'Test uses Jest/Mocha instead of Node.js built-in test runner',
        'Migrate to node:test (import { test, describe } from "node:test")');
    }

    // expect() instead of assert
    if (/\bexpect\s*\(/.test(content) && !/from\s+['"]node:assert/.test(content)) {
      addFinding('medium', 'testing', 'Uses expect() instead of node:assert',
        file, null, 'Test uses expect() pattern instead of node:assert',
        'Use assert.strictEqual(), assert.deepStrictEqual(), etc.');
    }

    // Hardcoded setTimeout in tests
    if (/setTimeout\s*\([^,]+,\s*\d{3,}/.test(content)) {
      addFinding('medium', 'testing', 'Hardcoded setTimeout delay in test',
        file, null, 'Tests with hardcoded delays are slow and flaky',
        'Use mock.timers from node:test instead of real timers');
    }

    // Missing afterEach cleanup
    if (/setAdapter|globalThis\.\w+\s*=/.test(content) && !/afterEach|after\(/.test(content)) {
      addFinding('medium', 'testing', 'Missing cleanup in test (no afterEach)',
        file, null, 'Test sets global state without afterEach cleanup',
        'Add afterEach(() => { resetAdapter(); delete globalThis.X; })');
    }

    // Weak assertions
    const okCount = (content.match(/assert\.ok\s*\(/g) || []).length;
    const strictCount = (content.match(/assert\.(?:strict|deep)/g) || []).length;
    if (okCount > strictCount * 2 && okCount > 5) {
      addFinding('low', 'testing', `Weak assertions: ${okCount} assert.ok() vs ${strictCount} strict`,
        file, null, 'Too many assert.ok() - use assert.strictEqual() for specific checks',
        'Replace assert.ok(x === y) with assert.strictEqual(x, y)');
    }
  }
}

// ── Documentation Audit ────────────────────────────────────────────────────────

function auditDocs() {
  const claudeMd = join(ROOT, 'CLAUDE.md');
  if (!existsSync(claudeMd)) {
    addFinding('high', 'docs', 'Missing CLAUDE.md',
      null, null, 'No CLAUDE.md project documentation found',
      'Create CLAUDE.md with project overview, API reference, and conventions');
    return;
  }

  const claudeContent = readFileSafe(claudeMd);

  // Check export map documentation matches package.json
  const pkgPath = join(ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSafe(pkgPath));
      const exports = pkg.exports || {};

      for (const key of Object.keys(exports)) {
        const importPath = key.replace('./', 'pulse-js-framework/');
        if (!claudeContent.includes(importPath) && !key.endsWith('.css')) {
          addFinding('medium', 'docs', `Undocumented export: ${key}`,
            claudeMd, null, `Export ${key} exists in package.json but not documented in CLAUDE.md`,
            `Add import example for ${importPath} in CLAUDE.md Export Map section`);
        }
      }
    } catch { /* parse error */ }
  }

  // Check that documented runtime modules exist
  const runtimeImports = claudeContent.match(/from\s+['"]pulse-js-framework\/runtime\/([^'"]+)['"]/g) || [];
  for (const imp of runtimeImports) {
    const modulePath = imp.match(/runtime\/([^'"]+)/)?.[1];
    if (modulePath) {
      const filePath = join(ROOT, 'runtime', modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`);
      const dirPath = join(ROOT, 'runtime', modulePath);
      if (!existsSync(filePath) && !existsSync(dirPath) && !existsSync(filePath.replace('.js', '/index.js'))) {
        addFinding('high', 'docs', `CLAUDE.md references non-existent module: runtime/${modulePath}`,
          claudeMd, null, `Documented module runtime/${modulePath} does not exist`,
          'Remove from CLAUDE.md or create the missing module');
      }
    }
  }
}

// ── Score Calculation ──────────────────────────────────────────────────────────

function calculateScores() {
  const scores = {};

  for (const domain of DOMAINS) {
    const domainFindings = findings.filter(f => f.domain === domain);
    let penalty = 0;

    for (const f of domainFindings) {
      penalty += SEVERITY[f.severity] || 0;
    }

    scores[domain] = Math.max(0, 100 - penalty);
  }

  // Overall weighted score
  let overall = 0;
  for (const [domain, weight] of Object.entries(WEIGHTS)) {
    overall += (scores[domain] ?? 100) * weight;
  }
  scores.overall = Math.round(overall);

  return scores;
}

function getRating(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 25) return 'Poor';
  return 'Critical';
}

// ── Report Formatters ──────────────────────────────────────────────────────────

function formatMarkdown(scores) {
  const date = new Date().toISOString().split('T')[0];
  const sorted = [...findings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  const counts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  };

  let report = `# Pulse Framework Audit Report\n`;
  report += `**Date:** ${date}\n`;
  report += `**Auditor:** project-auditor skill\n\n`;

  report += `## Executive Summary\n\n`;
  report += `**Overall Health: ${scores.overall}/100 (${getRating(scores.overall)})**\n\n`;
  report += `| Severity | Count |\n|----------|-------|\n`;
  report += `| Critical | ${counts.critical} |\n`;
  report += `| High | ${counts.high} |\n`;
  report += `| Medium | ${counts.medium} |\n`;
  report += `| Low | ${counts.low} |\n\n`;

  report += `## Domain Scores\n\n`;
  report += `| Domain | Score | Rating |\n|--------|-------|--------|\n`;
  for (const domain of DOMAINS) {
    report += `| ${domain.charAt(0).toUpperCase() + domain.slice(1)} | ${scores[domain]}/100 | ${getRating(scores[domain])} |\n`;
  }

  report += `\n## Findings (${findings.length} total)\n\n`;

  for (const f of sorted) {
    report += `### ${f.icon} ${f.severity.toUpperCase()}: ${f.title}\n`;
    if (f.file) report += `- **File:** ${f.file}${f.line ? `:${f.line}` : ''}\n`;
    report += `- **Domain:** ${f.domain}\n`;
    report += `- **Description:** ${f.description}\n`;
    report += `- **Fix:** ${f.fix}\n\n`;
  }

  if (counts.critical > 0 || counts.high > 0) {
    report += `## Improvement Roadmap\n\n`;
    report += `### Immediate (this week)\n`;
    for (const f of sorted.filter(f => f.severity === 'critical')) {
      report += `- [ ] Fix: ${f.title} (${f.file || 'project-wide'})\n`;
    }
    report += `\n### Short-term (this month)\n`;
    for (const f of sorted.filter(f => f.severity === 'high')) {
      report += `- [ ] Fix: ${f.title} (${f.file || 'project-wide'})\n`;
    }
    report += `\n### Long-term (this quarter)\n`;
    for (const f of sorted.filter(f => f.severity === 'medium').slice(0, 10)) {
      report += `- [ ] Address: ${f.title}\n`;
    }
    report += '\n';
  }

  return report;
}

function formatJSON(scores) {
  return JSON.stringify({
    date: new Date().toISOString(),
    summary: {
      overall: scores.overall,
      rating: getRating(scores.overall),
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
    scores: Object.fromEntries(DOMAINS.map(d => [d, { score: scores[d], rating: getRating(scores[d]) }])),
    findings: findings.map(f => ({
      severity: f.severity,
      domain: f.domain,
      title: f.title,
      file: f.file,
      line: f.line,
      description: f.description,
      fix: f.fix
    }))
  }, null, 2);
}

function formatSummary(scores) {
  const counts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  };

  let summary = `\n  Pulse Framework Audit Summary\n`;
  summary += `  ${'='.repeat(40)}\n`;
  summary += `  Overall Health: ${scores.overall}/100 (${getRating(scores.overall)})\n\n`;

  for (const domain of DOMAINS) {
    const bar = '█'.repeat(Math.round(scores[domain] / 5)) + '░'.repeat(20 - Math.round(scores[domain] / 5));
    summary += `  ${domain.padEnd(15)} ${bar} ${scores[domain]}/100\n`;
  }

  summary += `\n  Issues: ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low\n`;

  if (counts.critical > 0) {
    summary += `\n  CRITICAL ISSUES:\n`;
    for (const f of findings.filter(f => f.severity === 'critical')) {
      summary += `    [!] ${f.title}${f.file ? ` (${f.file})` : ''}\n`;
    }
  }

  return summary;
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  console.error('Pulse Framework Project Auditor');
  console.error('Scanning...\n');

  // Determine files to scan
  let files;
  if (targetPath) {
    try {
      const stat = statSync(targetPath);
      if (stat.isDirectory()) {
        files = getSourceFiles(targetPath);
      } else {
        files = [targetPath];
      }
    } catch {
      console.error(`Path not found: ${targetPath}`);
      process.exit(1);
    }
  } else {
    files = [
      ...getSourceFiles(join(ROOT, 'runtime')),
      ...getSourceFiles(join(ROOT, 'compiler')),
      ...getSourceFiles(join(ROOT, 'cli')),
      ...getSourceFiles(join(ROOT, 'loader')),
      ...getSourceFiles(join(ROOT, 'server')),
    ];
  }

  console.error(`  Files to scan: ${files.length}`);

  // Run audits
  const domainsToRun = targetDomain ? [targetDomain] : DOMAINS;

  for (const domain of domainsToRun) {
    console.error(`  Auditing: ${domain}...`);

    switch (domain) {
      case 'security': auditSecurity(files); break;
      case 'performance': auditPerformance(files); break;
      case 'architecture': auditArchitecture(files); break;
      case 'quality': auditQuality(files); break;
      case 'a11y': auditA11y(files); break;
      case 'testing': auditTesting(files); break;
      case 'docs': auditDocs(); break;
    }
  }

  // Calculate scores
  const scores = calculateScores();

  console.error(`\n  Total findings: ${findings.length}`);
  console.error(`  Overall health: ${scores.overall}/100 (${getRating(scores.overall)})\n`);

  // Output report
  switch (format) {
    case 'json':
      console.log(formatJSON(scores));
      break;
    case 'summary':
      console.log(formatSummary(scores));
      break;
    default:
      console.log(formatMarkdown(scores));
  }

  // Exit code: 1 if critical issues found
  if (findings.some(f => f.severity === 'critical')) {
    process.exit(1);
  }
}

main();
