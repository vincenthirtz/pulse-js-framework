#!/usr/bin/env node
/**
 * Accessibility Checker Script
 *
 * Scans .pulse files for common accessibility issues.
 *
 * Usage:
 *   node check-a11y.js [--dir path] [--fix] [--json]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let projectDir = process.cwd();
let autoFix = false;
let outputJson = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    projectDir = args[++i];
  } else if (args[i] === '--fix') {
    autoFix = true;
  } else if (args[i] === '--json') {
    outputJson = true;
  }
}

// A11y rules
const rules = [
  {
    id: 'img-alt',
    name: 'Images must have alt attributes',
    severity: 'error',
    pattern: /img(?![^\]]*\[alt[=\]])/g,
    message: 'Image missing alt attribute',
    fix: (match) => match.replace('img', 'img[alt=""]')
  },
  {
    id: 'button-text',
    name: 'Buttons must have accessible names',
    severity: 'error',
    pattern: /button\s*\{\s*\}/g,
    message: 'Empty button - add text content or aria-label'
  },
  {
    id: 'input-label',
    name: 'Form inputs should have labels',
    severity: 'warning',
    pattern: /input\[type=(?:text|email|password|number|tel|url|search)\](?![^\n]*(?:aria-label|id))/g,
    message: 'Input should have aria-label or associated label'
  },
  {
    id: 'positive-tabindex',
    name: 'Avoid positive tabindex',
    severity: 'warning',
    pattern: /tabindex=["']?[1-9]/g,
    message: 'Avoid positive tabindex - use 0 or -1'
  },
  {
    id: 'autofocus',
    name: 'Avoid autofocus',
    severity: 'warning',
    pattern: /\[autofocus\]/g,
    message: 'Autofocus can disorient screen reader users'
  },
  {
    id: 'click-on-div',
    name: 'Click handlers on non-interactive elements',
    severity: 'warning',
    pattern: /(?:div|span)(?:\.[^\s{]+)*\s*@click/g,
    message: 'Click on div/span - add role="button" and keyboard handler, or use <button>'
  },
  {
    id: 'missing-lang',
    name: 'HTML should have lang attribute',
    severity: 'error',
    pattern: /html(?![^\n]*\[lang)/g,
    message: 'HTML element should have lang attribute'
  },
  {
    id: 'empty-link',
    name: 'Links must have content',
    severity: 'error',
    pattern: /a\[href[^\]]*\]\s*\{\s*\}/g,
    message: 'Empty link - add text content or aria-label'
  },
  {
    id: 'heading-order',
    name: 'Heading levels should not skip',
    severity: 'warning',
    check: (content) => {
      const headings = [];
      const headingPattern = /\bh([1-6])\b/g;
      let match;
      let lineNum = 1;
      let lastIndex = 0;

      while ((match = headingPattern.exec(content)) !== null) {
        // Count newlines to get line number
        const beforeMatch = content.slice(lastIndex, match.index);
        lineNum += (beforeMatch.match(/\n/g) || []).length;
        lastIndex = match.index;

        headings.push({ level: parseInt(match[1]), line: lineNum });
      }

      const issues = [];
      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1].level;
        const curr = headings[i].level;
        if (curr > prev + 1) {
          issues.push({
            line: headings[i].line,
            message: `Heading level skipped from h${prev} to h${curr}`
          });
        }
      }
      return issues;
    }
  },
  {
    id: 'focus-visible',
    name: 'Focus styles should not be removed',
    severity: 'warning',
    pattern: /:focus\s*\{\s*outline:\s*(?:none|0)/g,
    message: 'Removing focus outline harms keyboard navigation'
  }
];

// Find .pulse files
function findPulseFiles(dir) {
  const files = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.pulse')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Check file for issues
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const rule of rules) {
    if (rule.check) {
      // Custom check function
      const ruleIssues = rule.check(content);
      for (const issue of ruleIssues) {
        issues.push({
          rule: rule.id,
          severity: rule.severity,
          line: issue.line,
          message: issue.message || rule.message
        });
      }
    } else if (rule.pattern) {
      // Regex pattern
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        rule.pattern.lastIndex = 0; // Reset regex
        if (rule.pattern.test(line)) {
          issues.push({
            rule: rule.id,
            severity: rule.severity,
            line: i + 1,
            column: line.search(rule.pattern) + 1,
            message: rule.message,
            canFix: !!rule.fix
          });
        }
      }
    }
  }

  return issues;
}

// Run checks
const srcDir = path.join(projectDir, 'src');
const files = findPulseFiles(fs.existsSync(srcDir) ? srcDir : projectDir);

const results = {
  totalFiles: files.length,
  totalIssues: 0,
  errors: 0,
  warnings: 0,
  files: []
};

for (const file of files) {
  const issues = checkFile(file);
  const relativePath = path.relative(projectDir, file);

  if (issues.length > 0) {
    results.files.push({
      file: relativePath,
      issues
    });

    results.totalIssues += issues.length;
    results.errors += issues.filter(i => i.severity === 'error').length;
    results.warnings += issues.filter(i => i.severity === 'warning').length;
  }
}

// Output
if (outputJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log('\n♿ Accessibility Check Results\n');
  console.log(`Files scanned: ${results.totalFiles}`);
  console.log(`Issues found: ${results.totalIssues} (${results.errors} errors, ${results.warnings} warnings)`);

  if (results.files.length > 0) {
    console.log('\n');

    for (const fileResult of results.files) {
      console.log(`📄 ${fileResult.file}`);

      for (const issue of fileResult.issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        const location = issue.line ? `:${issue.line}${issue.column ? ':' + issue.column : ''}` : '';
        console.log(`   ${icon} ${issue.message} [${issue.rule}]${location}`);
      }

      console.log('');
    }
  } else {
    console.log('\n✅ No accessibility issues found!\n');
  }

  // Summary
  if (results.errors > 0) {
    console.log('Run with --fix to auto-fix some issues');
    process.exit(1);
  }
}
