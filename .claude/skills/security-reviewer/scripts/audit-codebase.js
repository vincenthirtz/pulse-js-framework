#!/usr/bin/env node
/**
 * Pulse Framework Security Auditor
 *
 * Scans source files for common security anti-patterns:
 * - Direct innerHTML usage without sanitization
 * - Unvalidated URL assignments
 * - Direct setAttribute for event handlers
 * - Unsanitized CSS values
 * - eval/Function constructor usage
 * - Prototype pollution vectors
 * - document.write usage
 *
 * Usage:
 *   node audit-codebase.js                    # Scan all source files
 *   node audit-codebase.js runtime/dom.js     # Scan specific file
 *   node audit-codebase.js --severity high    # Only high/critical findings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let targetFile = null;
let minSeverity = 'low'; // low, medium, high, critical

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--severity' && args[i + 1]) {
    minSeverity = args[++i];
  } else if (!args[i].startsWith('--')) {
    targetFile = args[i];
  }
}

const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
const minLevel = severityLevels[minSeverity] || 0;

// Security rules
const rules = [
  {
    id: 'XSS-001',
    name: 'Direct innerHTML assignment',
    severity: 'critical',
    pattern: /\.innerHTML\s*=(?!\s*['"`]<)/g,
    message: 'Direct innerHTML assignment without sanitization',
    fix: 'Use el(), textContent, or dangerouslySetInnerHTML({ sanitize: true })',
    exclude: ['test/', 'mock-dom.js', 'dom-adapter.js', 'ssr-serializer.js', 'utils.js']
  },
  {
    id: 'XSS-002',
    name: 'document.write usage',
    severity: 'critical',
    pattern: /document\.write\s*\(/g,
    message: 'document.write can execute arbitrary HTML/scripts',
    fix: 'Use el() and mount() for DOM creation',
    exclude: ['test/', 'cli/lint.js']
  },
  {
    id: 'XSS-003',
    name: 'eval or Function constructor',
    severity: 'critical',
    pattern: /\b(eval\s*\(|new\s+Function\s*\()/g,
    message: 'eval/Function constructor can execute arbitrary code',
    fix: 'Use safe alternatives (JSON.parse, template literals, etc.)',
    exclude: ['test/', 'cli/lint.js']
  },
  {
    id: 'XSS-004',
    name: 'outerHTML assignment',
    severity: 'high',
    pattern: /\.outerHTML\s*=/g,
    message: 'outerHTML assignment can inject unsanitized HTML',
    fix: 'Use el() for element replacement',
    exclude: ['test/']
  },
  {
    id: 'URL-001',
    name: 'Unvalidated href/src assignment',
    severity: 'high',
    pattern: /setAttribute\s*\(\s*['"`](href|src|action|formaction)['"`]\s*,/g,
    message: 'URL attribute set without sanitizeUrl()',
    fix: 'Use safeSetAttribute() or sanitizeUrl() before setAttribute()',
    exclude: ['test/', 'utils.js', 'security.js', 'dom-adapter.js']
  },
  {
    id: 'URL-002',
    name: 'window.location with variable',
    severity: 'high',
    pattern: /window\.location\s*=\s*(?!['"`])/g,
    message: 'Dynamic URL assigned to window.location',
    fix: 'Validate URL with sanitizeUrl() before navigation',
    exclude: ['test/']
  },
  {
    id: 'ATTR-001',
    name: 'setAttribute with event handler',
    severity: 'high',
    pattern: /setAttribute\s*\(\s*['"`]on\w+['"`]/g,
    message: 'Event handler set via setAttribute (injection risk)',
    fix: 'Use on() function or addEventListener()',
    exclude: ['test/', 'utils.js', 'security.js']
  },
  {
    id: 'CSS-001',
    name: 'Direct cssText assignment',
    severity: 'medium',
    pattern: /\.cssText\s*=\s*(?!['"`])/g,
    message: 'Dynamic cssText assignment (CSS injection risk)',
    fix: 'Use safeSetStyle() or sanitizeCSSValue()',
    exclude: ['test/', 'dom-adapter.js']
  },
  {
    id: 'CSS-002',
    name: 'Unsanitized style property',
    severity: 'medium',
    pattern: /\.style\[\s*\w+\s*\]\s*=\s*(?!['"`])/g,
    message: 'Dynamic style property assignment',
    fix: 'Use safeSetStyle() to validate CSS values',
    exclude: ['test/', 'dom-adapter.js', 'utils.js']
  },
  {
    id: 'PROTO-001',
    name: 'JSON.parse without sanitization',
    severity: 'medium',
    pattern: /JSON\.parse\s*\([^)]*\)\s*(?!.*sanitize)/g,
    message: 'JSON.parse without prototype pollution protection',
    fix: 'Use sanitizeObjectKeys(JSON.parse(input)) for untrusted data',
    exclude: ['test/', 'security.js', 'utils.js']
  },
  {
    id: 'PROTO-002',
    name: 'Object spread from user input',
    severity: 'low',
    pattern: /Object\.assign\s*\(\s*\w+\s*,\s*(?!{)/g,
    message: 'Object.assign with potentially untrusted source',
    fix: 'Sanitize source object keys if from user input',
    exclude: ['test/']
  },
  {
    id: 'DOM-001',
    name: 'insertAdjacentHTML usage',
    severity: 'high',
    pattern: /\.insertAdjacentHTML\s*\(/g,
    message: 'insertAdjacentHTML can inject unsanitized HTML',
    fix: 'Use el() and appendChild() for safe DOM insertion',
    exclude: ['test/']
  },
  {
    id: 'MISC-001',
    name: 'setTimeout/setInterval with string',
    severity: 'high',
    pattern: /set(Timeout|Interval)\s*\(\s*['"`]/g,
    message: 'String argument to timer acts like eval()',
    fix: 'Pass a function reference instead of a string',
    exclude: ['test/']
  }
];

// Get files to scan
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
      if (entry.endsWith('.js')) {
        files.push(path.join(dirPath, entry));
      }
    }
  }

  return files;
}

// Run audit
const files = getSourceFiles(targetFile);
const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(projectRoot, file);

  for (const rule of rules) {
    if (severityLevels[rule.severity] < minLevel) continue;

    // Check exclusions
    if (rule.exclude?.some(exc => relativePath.includes(exc))) continue;

    // Reset regex state
    rule.pattern.lastIndex = 0;

    let match;
    while ((match = rule.pattern.exec(content)) !== null) {
      // Find line number
      const before = content.substring(0, match.index);
      const lineNum = before.split('\n').length;
      const lineContent = lines[lineNum - 1]?.trim() || '';

      // Skip if in comment
      if (lineContent.startsWith('//') || lineContent.startsWith('*')) continue;

      findings.push({
        rule: rule.id,
        name: rule.name,
        severity: rule.severity,
        file: relativePath,
        line: lineNum,
        code: lineContent.substring(0, 100),
        message: rule.message,
        fix: rule.fix
      });
    }
  }
}

// Output
console.log('=== Pulse Framework Security Audit ===\n');
console.log(`Files scanned: ${files.length}`);
console.log(`Min severity: ${minSeverity}\n`);

if (findings.length === 0) {
  console.log('\u2713 No security issues found!\n');
  process.exit(0);
}

// Group by severity
const bySeverity = { critical: [], high: [], medium: [], low: [] };
for (const f of findings) {
  bySeverity[f.severity].push(f);
}

let exitCode = 0;

for (const severity of ['critical', 'high', 'medium', 'low']) {
  const items = bySeverity[severity];
  if (items.length === 0) continue;

  const icon = severity === 'critical' ? '\u2718' : severity === 'high' ? '\u26A0' : '\u25CB';
  console.log(`${icon} ${severity.toUpperCase()} (${items.length})`);

  for (const f of items) {
    console.log(`  ${f.file}:${f.line} [${f.rule}] ${f.name}`);
    console.log(`    ${f.code}`);
    console.log(`    Fix: ${f.fix}`);
    console.log('');
  }

  if (severity === 'critical' || severity === 'high') exitCode = 1;
}

// Summary
console.log('--- Summary ---');
console.log(`Critical: ${bySeverity.critical.length}`);
console.log(`High: ${bySeverity.high.length}`);
console.log(`Medium: ${bySeverity.medium.length}`);
console.log(`Low: ${bySeverity.low.length}`);
console.log(`Total: ${findings.length}`);

process.exit(exitCode);
