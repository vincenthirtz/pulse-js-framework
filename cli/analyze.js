/**
 * Pulse CLI - Analyze Command
 * Analyzes bundle size and dependencies
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { findPulseFiles, parseArgs, formatBytes, relativePath, resolveImportPath } from './utils/file-utils.js';

/**
 * Analyze the bundle/project
 * @param {string} root - Project root directory
 * @returns {object} Analysis results
 */
export async function analyzeBundle(root = '.') {
  const { parse } = await import('../compiler/index.js');

  // Find all source files
  const pulseFiles = findPulseFiles([join(root, 'src')], { extensions: ['.pulse'] });
  const jsFiles = findPulseFiles([join(root, 'src')], { extensions: ['.js'] });
  const allFiles = [...pulseFiles, ...jsFiles];

  // Calculate summary
  const summary = calculateSummary(allFiles, pulseFiles, jsFiles);

  // Analyze each file
  const fileBreakdown = await analyzeFiles(allFiles, parse);

  // Build import graph
  const importGraph = await buildImportGraph(allFiles, parse);

  // Calculate complexity metrics
  const complexity = await calculateComplexity(pulseFiles, parse);

  // Detect dead code
  const deadCode = detectDeadCode(allFiles, importGraph, root);

  // Analyze state usage
  const stateUsage = await analyzeStateUsage(pulseFiles, parse);

  return {
    summary,
    fileBreakdown,
    importGraph,
    complexity,
    deadCode,
    stateUsage
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(allFiles, pulseFiles, jsFiles) {
  let totalSize = 0;

  for (const file of allFiles) {
    try {
      const stats = statSync(file);
      totalSize += stats.size;
    } catch (e) {
      // Skip inaccessible files
    }
  }

  return {
    totalFiles: allFiles.length,
    pulseFiles: pulseFiles.length,
    jsFiles: jsFiles.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize)
  };
}

/**
 * Analyze individual files
 */
async function analyzeFiles(files, parse) {
  const results = [];

  for (const file of files) {
    try {
      const stats = statSync(file);
      const source = readFileSync(file, 'utf-8');

      const info = {
        path: relativePath(file),
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        lines: source.split('\n').length
      };

      // Additional analysis for .pulse files
      if (file.endsWith('.pulse')) {
        try {
          const ast = parse(source);
          info.type = 'pulse';
          info.componentName = ast.page?.name || basename(file, '.pulse');
          info.stateCount = ast.state?.properties?.length || 0;
          info.actionCount = ast.actions?.functions?.length || 0;
          info.importCount = ast.imports?.length || 0;
          info.hasStyles = !!ast.style;
        } catch (e) {
          info.type = 'pulse';
          info.parseError = e.message;
        }
      } else {
        info.type = 'js';
      }

      results.push(info);
    } catch (e) {
      // Skip inaccessible files
    }
  }

  return results.sort((a, b) => b.size - a.size);
}

/**
 * Build import dependency graph
 */
export async function buildImportGraph(files, parse) {
  const nodes = new Set();
  const edges = [];

  for (const file of files) {
    const relPath = relativePath(file);
    nodes.add(relPath);

    try {
      const source = readFileSync(file, 'utf-8');

      if (file.endsWith('.pulse')) {
        const ast = parse(source);
        for (const imp of ast.imports || []) {
          const resolved = resolveImportPath(file, imp.source);
          if (resolved) {
            const resolvedRel = relativePath(resolved);
            nodes.add(resolvedRel);
            edges.push({ from: relPath, to: resolvedRel });
          }
        }
      } else if (file.endsWith('.js')) {
        // Parse JS imports with regex
        const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(source)) !== null) {
          const resolved = resolveImportPath(file, match[1]);
          if (resolved) {
            const resolvedRel = relativePath(resolved);
            nodes.add(resolvedRel);
            edges.push({ from: relPath, to: resolvedRel });
          }
        }
      }
    } catch (e) {
      // Skip files with errors
    }
  }

  return {
    nodes: Array.from(nodes).sort(),
    edges
  };
}

/**
 * Calculate component complexity metrics
 */
async function calculateComplexity(pulseFiles, parse) {
  const results = [];

  for (const file of pulseFiles) {
    try {
      const source = readFileSync(file, 'utf-8');
      const ast = parse(source);

      const metrics = {
        file: relativePath(file),
        componentName: ast.page?.name || basename(file, '.pulse'),
        stateCount: ast.state?.properties?.length || 0,
        actionCount: ast.actions?.functions?.length || 0,
        viewDepth: calculateViewDepth(ast.view),
        directiveCount: countDirectives(ast.view),
        styleRuleCount: countStyleRules(ast.style),
        importCount: ast.imports?.length || 0
      };

      // Calculate weighted complexity score
      metrics.complexity = Math.round(
        metrics.stateCount * 1 +
        metrics.actionCount * 2 +
        metrics.viewDepth * 1.5 +
        metrics.directiveCount * 1 +
        metrics.styleRuleCount * 0.5 +
        metrics.importCount * 0.5
      );

      results.push(metrics);
    } catch (e) {
      // Skip files with parse errors
    }
  }

  return results.sort((a, b) => b.complexity - a.complexity);
}

/**
 * Calculate maximum view depth
 */
function calculateViewDepth(view, depth = 0) {
  if (!view || !view.children) return depth;

  let maxDepth = depth;
  for (const child of view.children) {
    if (child.type === 'Element' && child.children) {
      maxDepth = Math.max(maxDepth, calculateViewDepth(child, depth + 1));
    }
    if (child.type === 'IfDirective') {
      if (child.consequent) {
        maxDepth = Math.max(maxDepth, calculateViewDepth(child.consequent, depth + 1));
      }
      if (child.alternate) {
        maxDepth = Math.max(maxDepth, calculateViewDepth(child.alternate, depth + 1));
      }
    }
    if (child.type === 'EachDirective' && child.body) {
      maxDepth = Math.max(maxDepth, calculateViewDepth(child.body, depth + 1));
    }
  }
  return maxDepth;
}

/**
 * Count directives in view
 */
function countDirectives(view, count = 0) {
  if (!view || !view.children) return count;

  for (const child of view.children) {
    if (child.type === 'IfDirective') count++;
    if (child.type === 'EachDirective') count++;
    if (child.directives) count += child.directives.length;

    if (child.children) {
      count = countDirectives(child, count);
    }
    if (child.consequent) {
      count = countDirectives(child.consequent, count);
    }
    if (child.alternate) {
      count = countDirectives(child.alternate, count);
    }
    if (child.body) {
      count = countDirectives(child.body, count);
    }
  }

  return count;
}

/**
 * Count style rules
 */
function countStyleRules(style) {
  if (!style || !style.rules) return 0;

  let count = 0;
  function countRules(rules) {
    for (const rule of rules) {
      count++;
      if (rule.rules) {
        countRules(rule.rules);
      }
    }
  }
  countRules(style.rules);
  return count;
}

/**
 * Detect dead code (unreachable files)
 */
function detectDeadCode(allFiles, importGraph, root) {
  const deadCode = [];

  // Find entry points (main.js, index.js, App.pulse)
  const entryPoints = new Set();
  for (const file of allFiles) {
    const name = basename(file);
    if (name === 'main.js' || name === 'index.js' || name === 'App.pulse' || name === 'app.js') {
      entryPoints.add(relativePath(file));
    }
  }

  // Build reachability set
  const reachable = new Set();
  const queue = Array.from(entryPoints);

  while (queue.length > 0) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);

    // Find all edges from this node
    for (const edge of importGraph.edges) {
      if (edge.from === current && !reachable.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  // Find unreachable files
  for (const file of allFiles) {
    const relPath = relativePath(file);

    // Skip entry points and non-source files
    if (entryPoints.has(relPath)) continue;

    if (!reachable.has(relPath)) {
      deadCode.push({
        file: relPath,
        reason: 'unreachable',
        message: 'File is not imported from any entry point'
      });
    }
  }

  return deadCode;
}

/**
 * Analyze state variable usage across files
 */
async function analyzeStateUsage(pulseFiles, parse) {
  const stateVars = new Map(); // name -> { declarations: [], references: [] }

  for (const file of pulseFiles) {
    try {
      const source = readFileSync(file, 'utf-8');
      const ast = parse(source);
      const relPath = relativePath(file);

      // Collect state declarations
      if (ast.state && ast.state.properties) {
        for (const prop of ast.state.properties) {
          if (!stateVars.has(prop.name)) {
            stateVars.set(prop.name, { declarations: [], files: new Set() });
          }
          stateVars.get(prop.name).declarations.push({
            file: relPath,
            line: prop.line || 1
          });
          stateVars.get(prop.name).files.add(relPath);
        }
      }
    } catch (e) {
      // Skip files with parse errors
    }
  }

  // Convert to array and add statistics
  return Array.from(stateVars.entries())
    .map(([name, info]) => ({
      name,
      declarationCount: info.declarations.length,
      files: Array.from(info.files),
      isShared: info.files.size > 1
    }))
    .sort((a, b) => b.declarationCount - a.declarationCount);
}

/**
 * Format analysis results for console output
 */
function formatConsoleOutput(analysis, verbose = false) {
  const lines = [];

  // Header
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('  PULSE BUNDLE ANALYSIS');
  lines.push('═'.repeat(60));

  // Summary
  lines.push('');
  lines.push('  SUMMARY');
  lines.push('  ' + '─'.repeat(40));
  lines.push(`  Total files:     ${analysis.summary.totalFiles}`);
  lines.push(`  .pulse files:    ${analysis.summary.pulseFiles}`);
  lines.push(`  .js files:       ${analysis.summary.jsFiles}`);
  lines.push(`  Total size:      ${analysis.summary.totalSizeFormatted}`);

  // Complexity (top 5)
  if (analysis.complexity.length > 0) {
    lines.push('');
    lines.push('  COMPLEXITY (Top 5)');
    lines.push('  ' + '─'.repeat(40));
    const top5 = analysis.complexity.slice(0, 5);
    for (const comp of top5) {
      const bar = '█'.repeat(Math.min(comp.complexity, 20));
      lines.push(`  ${comp.componentName.padEnd(20)} ${String(comp.complexity).padStart(3)} ${bar}`);
    }
  }

  // Dead code
  if (analysis.deadCode.length > 0) {
    lines.push('');
    lines.push('  DEAD CODE');
    lines.push('  ' + '─'.repeat(40));
    for (const dead of analysis.deadCode) {
      lines.push(`  ⚠ ${dead.file}`);
      lines.push(`    ${dead.message}`);
    }
  }

  // File breakdown (verbose)
  if (verbose && analysis.fileBreakdown.length > 0) {
    lines.push('');
    lines.push('  FILE BREAKDOWN');
    lines.push('  ' + '─'.repeat(40));
    for (const file of analysis.fileBreakdown) {
      const size = file.sizeFormatted.padStart(10);
      lines.push(`  ${size}  ${file.path}`);
    }
  }

  // Import graph (verbose)
  if (verbose && analysis.importGraph.edges.length > 0) {
    lines.push('');
    lines.push('  IMPORT GRAPH');
    lines.push('  ' + '─'.repeat(40));
    for (const edge of analysis.importGraph.edges.slice(0, 20)) {
      lines.push(`  ${edge.from} → ${edge.to}`);
    }
    if (analysis.importGraph.edges.length > 20) {
      lines.push(`  ... and ${analysis.importGraph.edges.length - 20} more`);
    }
  }

  // State usage (verbose)
  if (verbose && analysis.stateUsage.length > 0) {
    lines.push('');
    lines.push('  STATE VARIABLES');
    lines.push('  ' + '─'.repeat(40));
    for (const state of analysis.stateUsage.slice(0, 10)) {
      const shared = state.isShared ? ' (shared)' : '';
      lines.push(`  ${state.name}${shared}`);
      for (const file of state.files) {
        lines.push(`    └─ ${file}`);
      }
    }
  }

  lines.push('');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

/**
 * Main analyze command handler
 */
export async function runAnalyze(args) {
  const { options, patterns } = parseArgs(args);
  const json = options.json || false;
  const verbose = options.verbose || options.v || false;

  // Use current directory if no patterns specified
  const root = patterns[0] || '.';

  // Check if src directory exists
  if (!existsSync(join(root, 'src'))) {
    console.error('Error: No src/ directory found.');
    console.log('Run this command from your Pulse project root.');
    process.exit(1);
  }

  console.log('Analyzing bundle...\n');

  try {
    const analysis = await analyzeBundle(root);

    if (json) {
      console.log(JSON.stringify(analysis, null, 2));
    } else {
      console.log(formatConsoleOutput(analysis, verbose));
    }

    // Exit with error if dead code found
    if (analysis.deadCode.length > 0 && !json) {
      console.log(`\nWarning: ${analysis.deadCode.length} potentially unused file(s) found.`);
    }
  } catch (error) {
    console.error('Analysis failed:', error.message);
    process.exit(1);
  }
}
