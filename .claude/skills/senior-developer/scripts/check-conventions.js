#!/usr/bin/env node
/**
 * Pulse Framework Convention Checker
 *
 * Validates source files against project coding conventions:
 * - Naming conventions (createX, useX, enableX)
 * - Import order and layer violations
 * - Export patterns (named only, no default exports)
 * - Error handling (no raw Error throws)
 * - Reactivity rules (cleanup in effects)
 * - Module structure compliance
 *
 * Usage:
 *   node check-conventions.js                    # Check all source files
 *   node check-conventions.js runtime/http.js    # Check specific file
 *   node check-conventions.js --fix              # Show fix suggestions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let targetFile = null;
let showFix = false;

for (const arg of args) {
  if (arg === '--fix') showFix = true;
  else if (!arg.startsWith('--')) targetFile = arg;
}

// Convention rules
const rules = [
  {
    id: 'EXPORT-001',
    name: 'Default export in runtime',
    severity: 'warning',
    pattern: /^export\s+default\s+/gm,
    message: 'Default exports are not tree-shakeable',
    fix: 'Use named exports: export function name() {}',
    layers: ['runtime']
  },
  {
    id: 'EXPORT-002',
    name: 'Namespace re-export',
    severity: 'warning',
    pattern: /^export\s+\*\s+from/gm,
    message: 'Namespace re-exports import everything, defeating tree-shaking',
    fix: 'Use selective re-exports: export { specific } from "./module.js"',
    layers: ['runtime']
  },
  {
    id: 'ERROR-001',
    name: 'Raw Error throw',
    severity: 'error',
    pattern: /throw\s+new\s+Error\s*\(/g,
    message: 'Use PulseError subclasses instead of raw Error',
    fix: 'Use Errors.xxx() or throw new RuntimeError("msg", { code, context, suggestion })',
    layers: ['runtime', 'compiler'],
    exclude: ['errors.js']
  },
  {
    id: 'ERROR-002',
    name: 'String throw',
    severity: 'error',
    pattern: /throw\s+['"`]/g,
    message: 'Never throw string literals',
    fix: 'Use throw new RuntimeError("message", { code: "CODE" })',
    layers: ['runtime', 'compiler', 'cli']
  },
  {
    id: 'IMPORT-001',
    name: 'Node.js built-in in runtime',
    severity: 'error',
    pattern: /import\s+.*\s+from\s+['"](?:node:)?(?:fs|path|os|child_process|http|https|net|crypto|stream|cluster|worker_threads|readline)['"]/g,
    message: 'Runtime modules must not import Node.js built-ins (not browser-safe)',
    fix: 'Move this logic to CLI layer, or use feature detection',
    layers: ['runtime']
  },
  {
    id: 'IMPORT-002',
    name: 'require() in ES module',
    severity: 'warning',
    pattern: /(?<!\/\/.*)\brequire\s*\(\s*['"]/g,
    message: 'Use import instead of require() in ES modules',
    fix: 'Use static import or dynamic import(). Exception: optional dependency detection',
    layers: ['runtime'],
    exclude: ['preprocessor.js']
  },
  {
    id: 'DOM-001',
    name: 'Direct document access at module scope',
    severity: 'error',
    pattern: /^(?!.*\/\/).*\bdocument\.\w+/gm,
    message: 'Direct document access breaks SSR',
    fix: 'Use getAdapter() from dom-adapter.js, or guard with typeof window check',
    layers: ['runtime'],
    exclude: ['dom-adapter.js', 'a11y.js', 'devtools.js']
  },
  {
    id: 'DOM-002',
    name: 'Direct window access at module scope',
    severity: 'warning',
    pattern: /^(?:const|let|var)\s+\w+\s*=\s*window\./gm,
    message: 'Module-level window access runs on import and breaks SSR',
    fix: 'Move inside a function or guard with typeof window !== "undefined"',
    layers: ['runtime']
  },
  {
    id: 'SIDE-001',
    name: 'Module-level side effect',
    severity: 'warning',
    pattern: /^(?:window|document|globalThis)\.\w+\s*=/gm,
    message: 'Module-level side effects prevent tree-shaking',
    fix: 'Move global assignments inside exported functions (e.g., enableDevTools())',
    layers: ['runtime']
  },
  {
    id: 'NAMING-001',
    name: 'Exported function missing convention prefix',
    severity: 'info',
    pattern: /^export\s+function\s+(?!create|use|enable|disable|configure|is|get|set|has|detect|compile|render|hydrate|mount|validate|format|parse|with|on|provide|from|make|announce)\w+\s*\(/gm,
    message: 'Exported functions should follow naming conventions: create*, use*, enable*, etc.',
    fix: 'See code-conventions.md for naming patterns',
    layers: ['runtime']
  },
  {
    id: 'STYLE-001',
    name: 'console.log in production code',
    severity: 'warning',
    pattern: /(?<!\/\/.*)console\.(log|info|debug)\s*\(/g,
    message: 'Use logger module instead of console.log',
    fix: 'import { createLogger } from "./logger.js"; const log = createLogger("module");',
    layers: ['runtime'],
    exclude: ['logger.js', 'devtools.js']
  },
  {
    id: 'REACT-001',
    name: 'let for reactive state',
    severity: 'info',
    pattern: /^(?:export\s+)?let\s+\w+\s*=\s*(?!null|undefined|false|true|0|''|""|``)/gm,
    message: 'Use pulse() for state that drives UI updates',
    fix: 'const x = pulse(initialValue) instead of let x = initialValue',
    layers: ['runtime'],
    exclude: ['pulse.js', 'dom-adapter.js', 'errors.js', 'logger.js', 'utils.js', 'lru-cache.js']
  }
];

const severityLevels = { info: 0, warning: 1, error: 2 };

// Get files to check
function getSourceFiles(target) {
  if (target) {
    const fullPath = path.isAbsolute(target) ? target : path.join(projectRoot, target);
    return [fullPath];
  }

  const dirs = ['runtime', 'compiler', 'cli', 'loader'];
  const files = [];

  for (const dir of dirs) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) continue;

    const entries = fs.readdirSync(dirPath, { recursive: true });
    for (const entry of entries) {
      if (typeof entry === 'string' && entry.endsWith('.js')) {
        files.push(path.join(dirPath, entry));
      }
    }
  }

  return files;
}

// Determine file's layer
function getLayer(filePath) {
  const rel = path.relative(projectRoot, filePath);
  for (const layer of ['runtime', 'compiler', 'cli', 'loader']) {
    if (rel.startsWith(layer + '/') || rel.startsWith(layer + path.sep)) {
      return layer;
    }
  }
  return null;
}

// Run checks
const files = getSourceFiles(targetFile);
const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const rel = path.relative(projectRoot, file);
  const layer = getLayer(file);
  const basename = path.basename(file);

  for (const rule of rules) {
    // Check if rule applies to this layer
    if (rule.layers && layer && !rule.layers.includes(layer)) continue;

    // Check exclusions
    if (rule.exclude?.some(exc => basename === exc || rel.includes(exc))) continue;

    // Reset regex
    rule.pattern.lastIndex = 0;

    let match;
    while ((match = rule.pattern.exec(content)) !== null) {
      const before = content.substring(0, match.index);
      const lineNum = before.split('\n').length;
      const lineContent = lines[lineNum - 1]?.trim() || '';

      // Skip if in comment
      if (lineContent.startsWith('//') || lineContent.startsWith('*') || lineContent.startsWith('/*')) continue;

      findings.push({
        rule: rule.id,
        name: rule.name,
        severity: rule.severity,
        file: rel,
        line: lineNum,
        code: lineContent.substring(0, 100),
        message: rule.message,
        fix: rule.fix
      });
    }
  }
}

// Output
console.log('=== Pulse Framework Convention Check ===\n');
console.log(`Files checked: ${files.length}\n`);

if (findings.length === 0) {
  console.log('\u2713 All conventions followed!\n');
  process.exit(0);
}

// Group by severity
const bySeverity = { error: [], warning: [], info: [] };
for (const f of findings) {
  bySeverity[f.severity].push(f);
}

let exitCode = 0;

for (const severity of ['error', 'warning', 'info']) {
  const items = bySeverity[severity];
  if (items.length === 0) continue;

  const icon = severity === 'error' ? '\u2718' : severity === 'warning' ? '\u26A0' : '\u25CB';
  console.log(`${icon} ${severity.toUpperCase()} (${items.length})\n`);

  for (const f of items) {
    console.log(`  ${f.file}:${f.line} [${f.rule}] ${f.name}`);
    console.log(`    ${f.code}`);
    console.log(`    ${f.message}`);
    if (showFix) {
      console.log(`    Fix: ${f.fix}`);
    }
    console.log('');
  }

  if (severity === 'error') exitCode = 1;
}

// Summary
console.log('--- Summary ---');
console.log(`Errors:   ${bySeverity.error.length}`);
console.log(`Warnings: ${bySeverity.warning.length}`);
console.log(`Info:     ${bySeverity.info.length}`);
console.log(`Total:    ${findings.length}`);

if (!showFix && findings.length > 0) {
  console.log('\nRun with --fix to see fix suggestions');
}

process.exit(exitCode);
