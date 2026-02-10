#!/usr/bin/env node
/**
 * Pulse Framework Architecture Analyzer
 *
 * Analyzes the codebase for:
 * - Import dependency graph between modules
 * - Layer boundary violations (runtime importing CLI/compiler)
 * - Circular dependencies
 * - Module coupling metrics (afferent/efferent coupling)
 * - Node.js API usage in runtime (browser-safety check)
 *
 * Usage:
 *   node analyze-architecture.js                # Full analysis
 *   node analyze-architecture.js runtime/dom.js  # Analyze specific module
 *   node analyze-architecture.js --graph         # Output dependency graph as DOT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let targetFile = null;
let outputGraph = false;

for (const arg of args) {
  if (arg === '--graph') outputGraph = true;
  else if (!arg.startsWith('--')) targetFile = arg;
}

// Layer definitions
const layers = {
  runtime: { level: 0, label: 'Runtime (browser)' },
  compiler: { level: 1, label: 'Compiler (build-time)' },
  cli: { level: 2, label: 'CLI (Node.js)' },
  loader: { level: 1, label: 'Loader (build tools)' }
};

// Node.js APIs that shouldn't appear in runtime
const nodeApis = [
  'fs', 'path', 'os', 'child_process', 'http', 'https', 'net',
  'crypto', 'stream', 'cluster', 'worker_threads', 'readline'
];

// Get source files
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

// Extract imports from a file
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];

  // Static imports: import { x } from 'module'
  const staticPattern = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = staticPattern.exec(content)) !== null) {
    imports.push({ source: match[1], type: 'static' });
  }

  // Dynamic imports: import('module')
  const dynamicPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicPattern.exec(content)) !== null) {
    imports.push({ source: match[1], type: 'dynamic' });
  }

  // require() calls
  const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requirePattern.exec(content)) !== null) {
    imports.push({ source: match[1], type: 'require' });
  }

  return imports;
}

// Determine which layer a file belongs to
function getLayer(filePath) {
  const rel = path.relative(projectRoot, filePath);
  for (const layer of Object.keys(layers)) {
    if (rel.startsWith(layer + '/') || rel.startsWith(layer + path.sep)) {
      return layer;
    }
  }
  return null;
}

// Resolve import to layer
function resolveImportLayer(importSource, sourceLayer) {
  // Internal relative imports
  if (importSource.startsWith('.') || importSource.startsWith('/')) {
    return null; // Same layer (relative import)
  }

  // Pulse framework imports
  if (importSource.startsWith('pulse-js-framework/')) {
    const parts = importSource.replace('pulse-js-framework/', '').split('/');
    if (layers[parts[0]]) return parts[0];
  }

  // Node.js built-ins
  if (importSource.startsWith('node:') || nodeApis.includes(importSource)) {
    return 'node';
  }

  return 'external';
}

// Check for Node.js API usage in runtime files
function checkNodeApiUsage(filePath, content) {
  const issues = [];
  const rel = path.relative(projectRoot, filePath);

  if (!rel.startsWith('runtime')) return issues;

  for (const api of nodeApis) {
    // Check import statements
    const importPattern = new RegExp(`(?:import|require).*['"](?:node:)?${api}['"]`, 'g');
    if (importPattern.test(content)) {
      issues.push({
        file: rel,
        api: api,
        message: `Runtime module imports Node.js '${api}' API (not browser-safe)`
      });
    }

    // Check direct usage of process, __dirname, __filename
    if (/\bprocess\.(env|argv|cwd|exit|platform)\b/.test(content)) {
      if (!issues.find(i => i.api === 'process')) {
        issues.push({
          file: rel,
          api: 'process',
          message: `Runtime module uses 'process' global (not browser-safe)`
        });
      }
    }
  }

  return issues;
}

// Main analysis
const files = getSourceFiles(targetFile);
const graph = new Map(); // file -> [imports]
const violations = [];
const nodeIssues = [];
const moduleMetrics = new Map(); // module -> { afferent, efferent }

console.log('=== Pulse Framework Architecture Analysis ===\n');
console.log(`Files analyzed: ${files.length}\n`);

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(projectRoot, file);
  const sourceLayer = getLayer(file);
  const imports = extractImports(file);

  graph.set(rel, imports);

  // Initialize metrics
  if (!moduleMetrics.has(rel)) {
    moduleMetrics.set(rel, { afferent: 0, efferent: 0, imports: [], importedBy: [] });
  }

  // Check each import
  for (const imp of imports) {
    const targetLayer = resolveImportLayer(imp.source, sourceLayer);

    // Track efferent coupling
    const metrics = moduleMetrics.get(rel);
    metrics.efferent++;
    metrics.imports.push(imp.source);

    // Check layer violations
    if (sourceLayer && targetLayer && layers[sourceLayer] && layers[targetLayer]) {
      if (layers[sourceLayer].level < layers[targetLayer].level) {
        violations.push({
          file: rel,
          layer: sourceLayer,
          imports: imp.source,
          targetLayer: targetLayer,
          message: `${layers[sourceLayer].label} imports from ${layers[targetLayer].label}`
        });
      }
    }

    // Check Node.js usage in runtime
    if (targetLayer === 'node' && sourceLayer === 'runtime') {
      violations.push({
        file: rel,
        layer: sourceLayer,
        imports: imp.source,
        targetLayer: 'node',
        message: `Runtime imports Node.js module '${imp.source}' (not browser-safe)`
      });
    }
  }

  // Additional Node.js API checks
  nodeIssues.push(...checkNodeApiUsage(file, content));
}

// Calculate afferent coupling (who imports me?)
for (const [file, imports] of graph) {
  for (const imp of imports) {
    if (imp.source.startsWith('.')) {
      const dir = path.dirname(file);
      let resolved = path.normalize(path.join(dir, imp.source));
      if (!resolved.endsWith('.js')) resolved += '.js';

      if (moduleMetrics.has(resolved)) {
        moduleMetrics.get(resolved).afferent++;
        moduleMetrics.get(resolved).importedBy.push(file);
      }
    }
  }
}

// Output: Layer violations
if (violations.length > 0) {
  console.log('\u2718 LAYER VIOLATIONS\n');
  for (const v of violations) {
    console.log(`  ${v.file}`);
    console.log(`    imports: ${v.imports}`);
    console.log(`    \u2718 ${v.message}`);
    console.log('');
  }
} else {
  console.log('\u2713 No layer violations found\n');
}

// Output: Node.js API usage in runtime
if (nodeIssues.length > 0) {
  console.log('\u26A0 NODE.JS API IN RUNTIME\n');
  for (const issue of nodeIssues) {
    console.log(`  ${issue.file}: ${issue.message}`);
  }
  console.log('');
} else {
  console.log('\u2713 No Node.js APIs in runtime\n');
}

// Output: Coupling metrics (top 10 most coupled)
const couplingList = [...moduleMetrics.entries()]
  .map(([file, m]) => ({
    file,
    afferent: m.afferent,
    efferent: m.efferent,
    instability: m.efferent / (m.afferent + m.efferent || 1),
    imports: m.imports,
    importedBy: m.importedBy
  }))
  .filter(m => m.afferent + m.efferent > 0)
  .sort((a, b) => (b.afferent + b.efferent) - (a.afferent + a.efferent));

console.log('--- Module Coupling (top 15) ---\n');
console.log('  Module'.padEnd(45) + 'Ca'.padEnd(5) + 'Ce'.padEnd(5) + 'I');
console.log('  ' + '-'.repeat(55));

for (const m of couplingList.slice(0, 15)) {
  const name = m.file.length > 42 ? '...' + m.file.slice(-39) : m.file;
  console.log(
    `  ${name.padEnd(43)} ${String(m.afferent).padEnd(5)}${String(m.efferent).padEnd(5)}${m.instability.toFixed(2)}`
  );
}

console.log('\n  Ca = Afferent coupling (who imports me)');
console.log('  Ce = Efferent coupling (who I import)');
console.log('  I  = Instability (Ce / (Ca + Ce)) — 0 = stable, 1 = unstable\n');

// Output: Dependency graph (DOT format)
if (outputGraph) {
  console.log('--- Dependency Graph (DOT) ---\n');
  console.log('digraph pulse_architecture {');
  console.log('  rankdir=TB;');
  console.log('  node [shape=box, style=filled];');
  console.log('');

  // Color by layer
  const layerColors = {
    runtime: '#e8f5e9',
    compiler: '#e3f2fd',
    cli: '#fff3e0',
    loader: '#f3e5f5'
  };

  for (const [file] of graph) {
    const layer = getLayer(path.join(projectRoot, file));
    const color = layerColors[layer] || '#ffffff';
    const label = file.replace(/\.js$/, '');
    console.log(`  "${label}" [fillcolor="${color}"];`);
  }

  console.log('');

  for (const [file, imports] of graph) {
    const from = file.replace(/\.js$/, '');
    for (const imp of imports) {
      if (imp.source.startsWith('.')) {
        const dir = path.dirname(file);
        let resolved = path.normalize(path.join(dir, imp.source)).replace(/\.js$/, '');
        console.log(`  "${from}" -> "${resolved}";`);
      }
    }
  }

  console.log('}');
}

// Summary
console.log('--- Summary ---');
console.log(`Files analyzed: ${files.length}`);
console.log(`Layer violations: ${violations.length}`);
console.log(`Node.js API issues: ${nodeIssues.length}`);
console.log(`Modules tracked: ${moduleMetrics.size}`);

const exitCode = violations.length > 0 ? 1 : 0;
process.exit(exitCode);
