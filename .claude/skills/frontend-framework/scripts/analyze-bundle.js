#!/usr/bin/env node
/**
 * Bundle Analyzer Script
 *
 * Analyzes Pulse project bundle size and provides optimization recommendations.
 *
 * Usage:
 *   node analyze-bundle.js [--dir path] [--json]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let projectDir = process.cwd();
let outputJson = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) {
    projectDir = args[++i];
  } else if (args[i] === '--json') {
    outputJson = true;
  }
}

// Runtime module sizes (approximate, in bytes)
const MODULE_SIZES = {
  'pulse': 4500,
  'dom': 8200,
  'router': 6800,
  'store': 3200,
  'context': 2100,
  'form': 5400,
  'async': 3800,
  'http': 4200,
  'websocket': 3600,
  'graphql': 5800,
  'a11y': 7200,
  'devtools': 9500,
  'native': 2800,
  'hmr': 1200,
  'ssr': 4800,
  'lite': 5000,
  'logger': 1800,
  'lru-cache': 900,
  'utils': 2400,
  'dom-adapter': 3200,
  'errors': 2600
};

// Find all .pulse and .js files
function findFiles(dir, extensions = ['.pulse', '.js']) {
  const files = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', '.claude'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Extract imports from file
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = new Set();

  // ES module imports
  const importRegex = /import\s+.*?from\s+['"]pulse-js-framework\/runtime(?:\/([^'"]+))?['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const module = match[1] || 'index';
    imports.add(module === 'index' ? 'pulse' : module);
  }

  // Also check for runtime/ imports
  const runtimeRegex = /from\s+['"].*?runtime\/([^'"]+)['"]/g;
  while ((match = runtimeRegex.exec(content)) !== null) {
    imports.add(match[1].replace('.js', ''));
  }

  return imports;
}

// Analyze project
function analyzeProject(dir) {
  const srcDir = path.join(dir, 'src');
  const files = findFiles(fs.existsSync(srcDir) ? srcDir : dir);

  const usedModules = new Set();
  const fileAnalysis = [];

  for (const file of files) {
    const imports = extractImports(file);
    const relativePath = path.relative(dir, file);

    fileAnalysis.push({
      file: relativePath,
      imports: Array.from(imports)
    });

    imports.forEach(m => usedModules.add(m));
  }

  // Calculate sizes
  let totalSize = 0;
  const moduleBreakdown = [];

  for (const module of usedModules) {
    const size = MODULE_SIZES[module] || 2000; // Default estimate
    totalSize += size;
    moduleBreakdown.push({ module, size });
  }

  // Sort by size descending
  moduleBreakdown.sort((a, b) => b.size - a.size);

  // Generate recommendations
  const recommendations = [];

  // Check if using full runtime instead of lite
  if (usedModules.has('pulse') && usedModules.has('dom') &&
      !usedModules.has('router') && !usedModules.has('store') &&
      !usedModules.has('form') && !usedModules.has('async')) {
    recommendations.push({
      type: 'optimization',
      message: 'Consider using pulse-js-framework/runtime/lite for smaller bundle (~5KB)',
      savings: totalSize - 5000
    });
  }

  // Check devtools in production
  if (usedModules.has('devtools')) {
    recommendations.push({
      type: 'warning',
      message: 'DevTools module included - ensure it\'s excluded in production builds',
      savings: MODULE_SIZES['devtools']
    });
  }

  // Check for unused heavy modules
  const heavyModules = ['graphql', 'websocket', 'ssr', 'a11y'];
  for (const module of heavyModules) {
    if (usedModules.has(module)) {
      recommendations.push({
        type: 'info',
        message: `Using ${module} module (${formatBytes(MODULE_SIZES[module])}) - ensure it's needed`
      });
    }
  }

  return {
    totalFiles: files.length,
    totalSize,
    totalSizeGzipped: Math.round(totalSize * 0.3), // Rough gzip estimate
    usedModules: Array.from(usedModules),
    moduleBreakdown,
    fileAnalysis,
    recommendations
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Run analysis
const analysis = analyzeProject(projectDir);

if (outputJson) {
  console.log(JSON.stringify(analysis, null, 2));
} else {
  console.log('\n📦 Pulse Bundle Analysis\n');
  console.log(`Files analyzed: ${analysis.totalFiles}`);
  console.log(`Estimated bundle size: ${formatBytes(analysis.totalSize)}`);
  console.log(`Estimated gzipped: ${formatBytes(analysis.totalSizeGzipped)}`);

  console.log('\n📊 Module Breakdown:\n');
  for (const { module, size } of analysis.moduleBreakdown) {
    const bar = '█'.repeat(Math.ceil(size / 1000));
    console.log(`  ${module.padEnd(15)} ${formatBytes(size).padStart(8)}  ${bar}`);
  }

  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations:\n');
    for (const rec of analysis.recommendations) {
      const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'optimization' ? '🚀' : 'ℹ️';
      console.log(`  ${icon} ${rec.message}`);
      if (rec.savings) {
        console.log(`     Potential savings: ${formatBytes(rec.savings)}`);
      }
    }
  }

  console.log('');
}
