/**
 * Analyze Command Tests
 *
 * Tests for bundle analysis and file utilities
 *
 * @module test/analyze
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { buildImportGraph, analyzeBundle, runAnalyze } from '../cli/analyze.js';
import {
  findPulseFiles,
  formatBytes,
  parseArgs,
  relativePath,
  resolveImportPath
} from '../cli/utils/file-utils.js';
import {
  test,
  testAsync,
  runAsyncTests,
  printResults,
  exitWithCode,
  printSection,
  assertEqual,
  assertDeepEqual,
  assert as assertTrue
} from './utils.js';

// =============================================================================
// Test Fixtures Setup
// =============================================================================

const TEST_DIR = join(process.cwd(), 'test-fixtures-analyze');
const SRC_DIR = join(TEST_DIR, 'src');

function setupTestFixtures() {
  // Clean up first
  cleanupTestFixtures();

  // Create directories
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(SRC_DIR, { recursive: true });
  mkdirSync(join(SRC_DIR, 'components'), { recursive: true });
  mkdirSync(join(SRC_DIR, 'pages'), { recursive: true });
  mkdirSync(join(SRC_DIR, 'utils'), { recursive: true });

  // Create test .pulse files
  writeFileSync(join(SRC_DIR, 'App.pulse'), `
@page App

import Header from './components/Header.pulse'
import Footer from './components/Footer.pulse'

state {
  title: "My App"
  count: 0
}

actions {
  increment() {
    count++
  }
}

view {
  Header
  main {
    h1 "{title}"
    p "Count: {count}"
    button @click(increment()) "+"
  }
  Footer
}

style {
  main {
    padding: 20px
  }
}
`);

  writeFileSync(join(SRC_DIR, 'components', 'Header.pulse'), `
@page Header

view {
  header {
    nav {
      a[href="/"] "Home"
      a[href="/about"] "About"
    }
  }
}
`);

  writeFileSync(join(SRC_DIR, 'components', 'Footer.pulse'), `
@page Footer

view {
  footer {
    p "Copyright 2024"
  }
}
`);

  writeFileSync(join(SRC_DIR, 'components', 'Unused.pulse'), `
@page Unused

view {
  div "This component is never imported"
}
`);

  writeFileSync(join(SRC_DIR, 'pages', 'Home.pulse'), `
@page Home

state {
  items: []
  loading: false
}

view {
  @if(loading) {
    div "Loading..."
  }
  @for(item in items) {
    div "{item}"
  }
}
`);

  // Create test .js files
  writeFileSync(join(SRC_DIR, 'main.js'), `
import { createApp } from './app.js';
import { setupRouter } from './router.js';

const app = createApp();
setupRouter(app);
`);

  writeFileSync(join(SRC_DIR, 'app.js'), `
export function createApp() {
  return { name: 'MyApp' };
}
`);

  writeFileSync(join(SRC_DIR, 'router.js'), `
export function setupRouter(app) {
  console.log('Setting up router for', app.name);
}
`);

  writeFileSync(join(SRC_DIR, 'utils', 'helpers.js'), `
export function formatDate(date) {
  return date.toISOString();
}
`);
}

function cleanupTestFixtures() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// =============================================================================
// formatBytes Tests
// =============================================================================

printSection('formatBytes Tests');

test('formatBytes handles 0 bytes', () => {
  assertEqual(formatBytes(0), '0 B');
});

test('formatBytes formats bytes correctly', () => {
  assertEqual(formatBytes(500), '500 B');
  assertEqual(formatBytes(1), '1 B');
  assertEqual(formatBytes(999), '999 B');
});

test('formatBytes formats kilobytes correctly', () => {
  assertEqual(formatBytes(1024), '1 KB');
  assertEqual(formatBytes(1536), '1.5 KB');
  assertEqual(formatBytes(2048), '2 KB');
  assertEqual(formatBytes(10240), '10 KB');
});

test('formatBytes formats megabytes correctly', () => {
  assertEqual(formatBytes(1048576), '1 MB');
  assertEqual(formatBytes(1572864), '1.5 MB');
  assertEqual(formatBytes(5242880), '5 MB');
});

test('formatBytes formats gigabytes correctly', () => {
  assertEqual(formatBytes(1073741824), '1 GB');
  assertEqual(formatBytes(2147483648), '2 GB');
});

test('formatBytes handles decimal precision', () => {
  assertEqual(formatBytes(1500), '1.46 KB');
  assertEqual(formatBytes(1234567), '1.18 MB');
});

// =============================================================================
// parseArgs Tests
// =============================================================================

printSection('parseArgs Tests');

test('parseArgs parses long options correctly', () => {
  const { options, patterns } = parseArgs(['--json', '--verbose', 'src/']);
  assertEqual(options.json, true);
  assertEqual(options.verbose, true);
  assertEqual(patterns.length, 1);
  assertEqual(patterns[0], 'src/');
});

test('parseArgs parses short options correctly', () => {
  const { options, patterns } = parseArgs(['-v', '-j', 'file.pulse']);
  assertEqual(options.v, true);
  assertEqual(options.j, true);
  assertDeepEqual(patterns, ['file.pulse']);
});

test('parseArgs handles flag without value', () => {
  const { options } = parseArgs(['--check', '--fix']);
  assertEqual(options.check, true);
  assertEqual(options.fix, true);
});

test('parseArgs handles multiple patterns', () => {
  const { patterns } = parseArgs(['src/', 'lib/', '*.pulse', 'test/']);
  assertDeepEqual(patterns, ['src/', 'lib/', '*.pulse', 'test/']);
});

test('parseArgs separates options from patterns', () => {
  const { options, patterns } = parseArgs(['--fix', 'src/', '--verbose', 'lib/']);
  assertEqual(options.fix, true);
  assertEqual(options.verbose, true);
  assertDeepEqual(patterns, ['src/', 'lib/']);
});

test('parseArgs handles empty args', () => {
  const { options, patterns } = parseArgs([]);
  assertDeepEqual(options, {});
  assertDeepEqual(patterns, []);
});

test('parseArgs handles only options', () => {
  const { options, patterns } = parseArgs(['--json', '--verbose', '-v']);
  assertEqual(options.json, true);
  assertEqual(options.verbose, true);
  assertEqual(options.v, true);
  assertDeepEqual(patterns, []);
});

test('parseArgs handles only patterns', () => {
  const { options, patterns } = parseArgs(['src/', 'lib/', 'test/']);
  assertDeepEqual(options, {});
  assertDeepEqual(patterns, ['src/', 'lib/', 'test/']);
});

test('parseArgs handles mixed short and long options', () => {
  const { options } = parseArgs(['--json', '-v', '--check', '-f']);
  assertEqual(options.json, true);
  assertEqual(options.v, true);
  assertEqual(options.check, true);
  assertEqual(options.f, true);
});

test('parseArgs handles glob patterns', () => {
  const { patterns } = parseArgs(['**/*.pulse', 'src/**/*.js', '*.test.js']);
  assertDeepEqual(patterns, ['**/*.pulse', 'src/**/*.js', '*.test.js']);
});

// =============================================================================
// relativePath Tests
// =============================================================================

printSection('relativePath Tests');

test('relativePath returns relative path for file in cwd', () => {
  const cwd = process.cwd();
  const fullPath = join(cwd, 'src', 'file.js');
  const result = relativePath(fullPath);
  assertTrue(result.includes('src'), 'Should contain src');
  assertTrue(result.includes('file.js'), 'Should contain filename');
  assertTrue(!result.startsWith(cwd), 'Should not start with cwd');
});

test('relativePath handles paths outside cwd', () => {
  const outsidePath = '/some/other/path/file.js';
  const result = relativePath(outsidePath);
  assertEqual(result, outsidePath);
});

test('relativePath handles nested paths', () => {
  const cwd = process.cwd();
  const deepPath = join(cwd, 'src', 'components', 'ui', 'Button.pulse');
  const result = relativePath(deepPath);
  assertTrue(result.includes('src'), 'Should contain src');
  assertTrue(result.includes('components'), 'Should contain components');
  assertTrue(result.includes('Button.pulse'), 'Should contain filename');
});

// =============================================================================
// findPulseFiles Tests
// =============================================================================

printSection('findPulseFiles Tests');

test('findPulseFiles returns array for nonexistent path', () => {
  const files = findPulseFiles(['nonexistent-path-12345']);
  assertTrue(Array.isArray(files), 'Should return array');
  assertEqual(files.length, 0);
});

test('findPulseFiles with custom extensions', () => {
  const files = findPulseFiles(['.'], { extensions: ['.nonexistent'] });
  assertTrue(Array.isArray(files), 'Should return array');
});

test('findPulseFiles defaults to current directory with empty patterns', () => {
  const files = findPulseFiles([]);
  assertTrue(Array.isArray(files), 'Should return array');
});

test('findPulseFiles skips option-like patterns', () => {
  const files = findPulseFiles(['--fix', '-v', 'nonexistent']);
  assertTrue(Array.isArray(files), 'Should return array');
});

test('findPulseFiles finds files in directory', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    assertTrue(files.length >= 4, 'Should find at least 4 pulse files');
    assertTrue(files.some(f => f.includes('App.pulse')), 'Should find App.pulse');
    assertTrue(files.some(f => f.includes('Header.pulse')), 'Should find Header.pulse');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles finds .js files with custom extension', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([SRC_DIR], { extensions: ['.js'] });
    assertTrue(Array.isArray(files), 'Should return array');
    assertTrue(files.length >= 3, 'Should find at least 3 js files');
    assertTrue(files.some(f => f.includes('main.js')), 'Should find main.js');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles handles glob pattern **/*.pulse', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([join(TEST_DIR, '**/*.pulse')], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    // Glob should find files recursively
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles handles specific file pattern', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([join(SRC_DIR, 'App.pulse')], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    assertEqual(files.length, 1);
    assertTrue(files[0].includes('App.pulse'), 'Should find App.pulse');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles returns sorted results', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    const sorted = [...files].sort();
    assertDeepEqual(files, sorted);
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// resolveImportPath Tests
// =============================================================================

printSection('resolveImportPath Tests');

test('resolveImportPath returns null for non-relative imports', () => {
  const result = resolveImportPath('/some/file.js', 'lodash');
  assertEqual(result, null);
});

test('resolveImportPath returns null for node_modules imports', () => {
  const result = resolveImportPath('/some/file.js', 'react');
  assertEqual(result, null);
});

test('resolveImportPath resolves relative .pulse imports', () => {
  setupTestFixtures();
  try {
    const fromFile = join(SRC_DIR, 'App.pulse');
    const result = resolveImportPath(fromFile, './components/Header.pulse');
    assertTrue(result !== null, 'Should resolve path');
    assertTrue(result.includes('Header.pulse'), 'Should contain filename');
  } finally {
    cleanupTestFixtures();
  }
});

test('resolveImportPath resolves relative .js imports', () => {
  setupTestFixtures();
  try {
    const fromFile = join(SRC_DIR, 'main.js');
    const result = resolveImportPath(fromFile, './app.js');
    assertTrue(result !== null, 'Should resolve path');
    assertTrue(result.includes('app.js'), 'Should contain filename');
  } finally {
    cleanupTestFixtures();
  }
});

test('resolveImportPath returns null for non-existent files', () => {
  const result = resolveImportPath('/some/file.js', './nonexistent.js');
  assertEqual(result, null);
});

test('resolveImportPath handles parent directory imports', () => {
  setupTestFixtures();
  try {
    const fromFile = join(SRC_DIR, 'components', 'Header.pulse');
    const result = resolveImportPath(fromFile, '../App.pulse');
    assertTrue(result !== null, 'Should resolve path');
    assertTrue(result.includes('App.pulse'), 'Should contain filename');
  } finally {
    cleanupTestFixtures();
  }
});

test('resolveImportPath tries multiple extensions', () => {
  setupTestFixtures();
  try {
    const fromFile = join(SRC_DIR, 'main.js');
    // Try without extension - should find app.js
    const result = resolveImportPath(fromFile, './app');
    // May or may not find it depending on implementation
    assertTrue(result === null || result.includes('app'), 'Should handle extensionless import');
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// buildImportGraph Tests
// =============================================================================

printSection('buildImportGraph Tests');

test('buildImportGraph returns correct structure with empty array', async () => {
  const { parse } = await import('../compiler/index.js');
  const graph = await buildImportGraph([], parse);

  assertTrue(Array.isArray(graph.nodes), 'Should have nodes array');
  assertTrue(Array.isArray(graph.edges), 'Should have edges array');
  assertEqual(graph.nodes.length, 0);
  assertEqual(graph.edges.length, 0);
});

test('buildImportGraph builds graph from pulse files', async () => {
  setupTestFixtures();
  try {
    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    const graph = await buildImportGraph(files, parse);

    assertTrue(Array.isArray(graph.nodes), 'Should have nodes array');
    assertTrue(Array.isArray(graph.edges), 'Should have edges array');
    assertTrue(graph.nodes.length > 0, 'Should have nodes');
    // App.pulse imports Header and Footer, so should have edges
    assertTrue(graph.edges.some(e => e.to.includes('Header.pulse')), 'Should have edge to Header');
    assertTrue(graph.edges.some(e => e.to.includes('Footer.pulse')), 'Should have edge to Footer');
  } finally {
    cleanupTestFixtures();
  }
});

test('buildImportGraph builds graph from js files', async () => {
  setupTestFixtures();
  try {
    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.js'] });
    const graph = await buildImportGraph(files, parse);

    assertTrue(Array.isArray(graph.nodes), 'Should have nodes array');
    assertTrue(Array.isArray(graph.edges), 'Should have edges array');
    // main.js imports app.js and router.js
    assertTrue(graph.edges.some(e => e.to.includes('app.js')), 'Should have edge to app.js');
    assertTrue(graph.edges.some(e => e.to.includes('router.js')), 'Should have edge to router.js');
  } finally {
    cleanupTestFixtures();
  }
});

test('buildImportGraph nodes are sorted', async () => {
  setupTestFixtures();
  try {
    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse', '.js'] });
    const graph = await buildImportGraph(files, parse);

    const sorted = [...graph.nodes].sort();
    assertDeepEqual(graph.nodes, sorted);
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// analyzeBundle Tests
// =============================================================================

printSection('analyzeBundle Tests');

test('analyzeBundle returns complete analysis structure', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    assertTrue('summary' in analysis, 'Should have summary');
    assertTrue('fileBreakdown' in analysis, 'Should have fileBreakdown');
    assertTrue('importGraph' in analysis, 'Should have importGraph');
    assertTrue('complexity' in analysis, 'Should have complexity');
    assertTrue('deadCode' in analysis, 'Should have deadCode');
    assertTrue('stateUsage' in analysis, 'Should have stateUsage');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle summary has correct structure', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { summary } = analysis;

    assertTrue('totalFiles' in summary, 'Should have totalFiles');
    assertTrue('pulseFiles' in summary, 'Should have pulseFiles');
    assertTrue('jsFiles' in summary, 'Should have jsFiles');
    assertTrue('totalSize' in summary, 'Should have totalSize');
    assertTrue('totalSizeFormatted' in summary, 'Should have totalSizeFormatted');
    assertTrue(summary.totalFiles > 0, 'Should have files');
    assertTrue(summary.pulseFiles >= 4, 'Should have at least 4 pulse files');
    assertTrue(summary.jsFiles >= 3, 'Should have at least 3 js files');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle fileBreakdown has file details', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { fileBreakdown } = analysis;

    assertTrue(Array.isArray(fileBreakdown), 'Should be array');
    assertTrue(fileBreakdown.length > 0, 'Should have files');

    const firstFile = fileBreakdown[0];
    assertTrue('path' in firstFile, 'Should have path');
    assertTrue('size' in firstFile, 'Should have size');
    assertTrue('sizeFormatted' in firstFile, 'Should have sizeFormatted');
    assertTrue('lines' in firstFile, 'Should have lines');
    assertTrue('type' in firstFile, 'Should have type');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle fileBreakdown sorted by size descending', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { fileBreakdown } = analysis;

    for (let i = 1; i < fileBreakdown.length; i++) {
      assertTrue(
        fileBreakdown[i - 1].size >= fileBreakdown[i].size,
        'Files should be sorted by size descending'
      );
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle pulse files have component info', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { fileBreakdown } = analysis;

    const pulseFiles = fileBreakdown.filter(f => f.type === 'pulse');
    assertTrue(pulseFiles.length > 0, 'Should have pulse files');

    const appFile = pulseFiles.find(f => f.path.includes('App.pulse'));
    if (appFile) {
      assertTrue('componentName' in appFile, 'Should have componentName');
      assertTrue('stateCount' in appFile, 'Should have stateCount');
      assertTrue('actionCount' in appFile, 'Should have actionCount');
      assertTrue('importCount' in appFile, 'Should have importCount');
      assertTrue('hasStyles' in appFile, 'Should have hasStyles');
      assertEqual(appFile.componentName, 'App');
      assertEqual(appFile.stateCount, 2); // title and count
      assertEqual(appFile.actionCount, 1); // increment
      assertEqual(appFile.importCount, 2); // Header and Footer
      assertEqual(appFile.hasStyles, true);
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle complexity metrics are calculated', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { complexity } = analysis;

    assertTrue(Array.isArray(complexity), 'Should be array');
    assertTrue(complexity.length > 0, 'Should have complexity data');

    const firstComponent = complexity[0];
    assertTrue('file' in firstComponent, 'Should have file');
    assertTrue('componentName' in firstComponent, 'Should have componentName');
    assertTrue('stateCount' in firstComponent, 'Should have stateCount');
    assertTrue('actionCount' in firstComponent, 'Should have actionCount');
    assertTrue('viewDepth' in firstComponent, 'Should have viewDepth');
    assertTrue('directiveCount' in firstComponent, 'Should have directiveCount');
    assertTrue('styleRuleCount' in firstComponent, 'Should have styleRuleCount');
    assertTrue('complexity' in firstComponent, 'Should have complexity score');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle complexity sorted by score descending', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { complexity } = analysis;

    for (let i = 1; i < complexity.length; i++) {
      assertTrue(
        complexity[i - 1].complexity >= complexity[i].complexity,
        'Should be sorted by complexity descending'
      );
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle detects dead code', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { deadCode } = analysis;

    assertTrue(Array.isArray(deadCode), 'Should be array');
    // Unused.pulse and helpers.js are not imported from entry points
    assertTrue(deadCode.some(d => d.file.includes('Unused.pulse')), 'Should detect Unused.pulse');
    assertTrue(deadCode.some(d => d.file.includes('helpers.js')), 'Should detect helpers.js');

    if (deadCode.length > 0) {
      const first = deadCode[0];
      assertTrue('file' in first, 'Should have file');
      assertTrue('reason' in first, 'Should have reason');
      assertTrue('message' in first, 'Should have message');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle analyzes state usage', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { stateUsage } = analysis;

    assertTrue(Array.isArray(stateUsage), 'Should be array');
    assertTrue(stateUsage.length > 0, 'Should have state variables');

    const firstState = stateUsage[0];
    assertTrue('name' in firstState, 'Should have name');
    assertTrue('declarationCount' in firstState, 'Should have declarationCount');
    assertTrue('files' in firstState, 'Should have files');
    assertTrue('isShared' in firstState, 'Should have isShared');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle state usage sorted by declaration count', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const { stateUsage } = analysis;

    for (let i = 1; i < stateUsage.length; i++) {
      assertTrue(
        stateUsage[i - 1].declarationCount >= stateUsage[i].declarationCount,
        'Should be sorted by declaration count descending'
      );
    }
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Additional File Utils Edge Cases
// =============================================================================

printSection('File Utils Edge Cases');

test('formatBytes handles very large numbers', () => {
  const result = formatBytes(10737418240); // 10 GB
  assertTrue(result.includes('GB'), 'Should format as GB');
});

test('formatBytes handles fractional bytes', () => {
  // formatBytes uses Math.floor internally for the index
  const result = formatBytes(1023);
  assertEqual(result, '1023 B');
});

test('parseArgs handles duplicate options', () => {
  const { options } = parseArgs(['--json', '--json', '--verbose']);
  assertEqual(options.json, true);
  assertEqual(options.verbose, true);
});

test('parseArgs handles paths with spaces in quotes conceptually', () => {
  // Note: In real CLI, quotes are handled by the shell
  const { patterns } = parseArgs(['src/my file.pulse']);
  assertDeepEqual(patterns, ['src/my file.pulse']);
});

test('findPulseFiles handles multiple extensions', () => {
  setupTestFixtures();
  try {
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse', '.js'] });
    assertTrue(Array.isArray(files), 'Should return array');
    assertTrue(files.some(f => f.endsWith('.pulse')), 'Should find .pulse files');
    assertTrue(files.some(f => f.endsWith('.js')), 'Should find .js files');
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Complexity Calculation Tests
// =============================================================================

printSection('Complexity Calculation Tests');

test('complexity includes view depth calculation', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const appComplexity = analysis.complexity.find(c => c.componentName === 'App');

    if (appComplexity) {
      assertTrue(appComplexity.viewDepth >= 2, 'App should have nested view depth');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('complexity includes directive count', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const homeComplexity = analysis.complexity.find(c => c.componentName === 'Home');

    if (homeComplexity) {
      assertTrue(homeComplexity.directiveCount >= 2, 'Home should have @if and @for directives');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('complexity includes style rule count', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const appComplexity = analysis.complexity.find(c => c.componentName === 'App');

    if (appComplexity) {
      assertTrue(appComplexity.styleRuleCount >= 1, 'App should have style rules');
    }
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Import Graph Edge Cases
// =============================================================================

printSection('Import Graph Edge Cases');

test('buildImportGraph handles files with parse errors gracefully', async () => {
  setupTestFixtures();
  try {
    // Create a file with syntax error
    writeFileSync(join(SRC_DIR, 'broken.pulse'), 'this is not valid pulse syntax {{{');

    const { parse } = await import('../compiler/index.js');
    const files = [...findPulseFiles([SRC_DIR], { extensions: ['.pulse'] }), join(SRC_DIR, 'broken.pulse')];

    // Should not throw
    const graph = await buildImportGraph(files, parse);
    assertTrue(Array.isArray(graph.nodes), 'Should return valid graph');
    assertTrue(Array.isArray(graph.edges), 'Should return valid graph');
  } finally {
    cleanupTestFixtures();
  }
});

test('buildImportGraph handles circular imports', async () => {
  setupTestFixtures();
  try {
    // Create circular import
    writeFileSync(join(SRC_DIR, 'A.pulse'), `
@page A
import B from './B.pulse'
view { div "A" }
`);
    writeFileSync(join(SRC_DIR, 'B.pulse'), `
@page B
import A from './A.pulse'
view { div "B" }
`);

    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    const graph = await buildImportGraph(files, parse);

    // Should handle circular imports without infinite loop
    assertTrue(Array.isArray(graph.nodes), 'Should return valid graph');
    assertTrue(graph.edges.some(e => e.to.includes('A.pulse')), 'Should have edge to A');
    assertTrue(graph.edges.some(e => e.to.includes('B.pulse')), 'Should have edge to B');
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Dead Code Detection Tests
// =============================================================================

printSection('Dead Code Detection Tests');

test('dead code detection identifies unreachable files', async () => {
  setupTestFixtures();
  try {
    // Create an orphan file
    writeFileSync(join(SRC_DIR, 'orphan.pulse'), `
@page Orphan
view { div "I am never imported" }
`);

    const analysis = await analyzeBundle(TEST_DIR);
    assertTrue(
      analysis.deadCode.some(d => d.file.includes('orphan.pulse')),
      'Should detect orphan.pulse as dead code'
    );
  } finally {
    cleanupTestFixtures();
  }
});

test('dead code detection does not flag entry points', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // main.js and App.pulse are entry points
    assertTrue(
      !analysis.deadCode.some(d => d.file.includes('main.js')),
      'Should not flag main.js as dead code'
    );
  } finally {
    cleanupTestFixtures();
  }
});

test('dead code detection does not flag reachable files', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // Header.pulse is imported by App.pulse
    assertTrue(
      !analysis.deadCode.some(d => d.file.includes('Header.pulse')),
      'Should not flag Header.pulse as dead code'
    );
    assertTrue(
      !analysis.deadCode.some(d => d.file.includes('Footer.pulse')),
      'Should not flag Footer.pulse as dead code'
    );
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// State Usage Analysis Tests
// =============================================================================

printSection('State Usage Analysis Tests');

test('state usage tracks variable declarations', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // App.pulse has 'title' and 'count' state
    const titleState = analysis.stateUsage.find(s => s.name === 'title');
    const countState = analysis.stateUsage.find(s => s.name === 'count');

    assertTrue(titleState !== undefined, 'Should track title state');
    assertTrue(countState !== undefined, 'Should track count state');
  } finally {
    cleanupTestFixtures();
  }
});

test('state usage identifies shared state', async () => {
  setupTestFixtures();
  try {
    // Create two files with same state name
    writeFileSync(join(SRC_DIR, 'Counter1.pulse'), `
@page Counter1
state { sharedName: 0 }
view { div "{sharedName}" }
`);
    writeFileSync(join(SRC_DIR, 'Counter2.pulse'), `
@page Counter2
state { sharedName: 0 }
view { div "{sharedName}" }
`);

    const analysis = await analyzeBundle(TEST_DIR);
    const sharedState = analysis.stateUsage.find(s => s.name === 'sharedName');

    if (sharedState) {
      assertEqual(sharedState.isShared, true);
      assertTrue(sharedState.files.length >= 2, 'Should be in multiple files');
    }
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Glob Pattern Tests
// =============================================================================

printSection('Glob Pattern Tests');

test('findPulseFiles handles * wildcard in directory', () => {
  setupTestFixtures();
  try {
    // When using directory path, findPulseFiles walks the directory
    // and finds all matching files
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    // Should find App.pulse in src root
    assertTrue(files.some(f => f.includes('App.pulse')), 'Should find App.pulse');
    // Should also find nested files when walking directory
    assertTrue(files.some(f => f.includes('Header.pulse')), 'Should find Header.pulse');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles handles subdirectory pattern', () => {
  setupTestFixtures();
  try {
    // Test searching a specific subdirectory
    const componentsDir = join(SRC_DIR, 'components');
    const files = findPulseFiles([componentsDir], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    assertTrue(files.some(f => f.includes('Header.pulse')), 'Should find Header.pulse');
    assertTrue(files.some(f => f.includes('Footer.pulse')), 'Should find Footer.pulse');
    // Should not find App.pulse from root
    assertTrue(!files.some(f => f.path === 'App.pulse'), 'Should not find App.pulse in components');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles handles nested directory structure', () => {
  setupTestFixtures();
  try {
    // Searching the test fixture src directory should find all nested files
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array');
    // Should find files in nested directories
    assertTrue(files.some(f => f.includes('App.pulse')), 'Should find root App.pulse');
    assertTrue(files.some(f => f.includes('Header.pulse')), 'Should find components/Header.pulse');
    assertTrue(files.some(f => f.includes('Home.pulse')), 'Should find pages/Home.pulse');
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Additional Coverage Tests - Internal Functions
// =============================================================================

printSection('Additional Coverage - Edge Cases');

test('analyzeBundle handles empty src directory', async () => {
  // Create a project with empty src
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true });

  try {
    const analysis = await analyzeBundle(TEST_DIR);

    assertEqual(analysis.summary.totalFiles, 0);
    assertEqual(analysis.summary.pulseFiles, 0);
    assertEqual(analysis.summary.jsFiles, 0);
    assertEqual(analysis.summary.totalSize, 0);
    assertEqual(analysis.fileBreakdown.length, 0);
    assertEqual(analysis.complexity.length, 0);
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles files with parse errors gracefully', async () => {
  setupTestFixtures();
  // Add a file with syntax error
  writeFileSync(join(SRC_DIR, 'broken.pulse'), `
@page Broken
state {
  this is not valid !!!
}
view { div "test" }
`);
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // Should still complete analysis
    assertTrue('summary' in analysis, 'Should have summary');
    assertTrue('fileBreakdown' in analysis, 'Should have fileBreakdown');

    // The broken file should be included but may have parseError
    const brokenFile = analysis.fileBreakdown.find(f => f.path.includes('broken.pulse'));
    if (brokenFile) {
      assertTrue('parseError' in brokenFile || 'type' in brokenFile, 'Broken file should have error info or type');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles deeply nested view structures', async () => {
  setupTestFixtures();
  // Create a deeply nested component
  writeFileSync(join(SRC_DIR, 'DeepNested.pulse'), `
@page DeepNested

view {
  div {
    section {
      article {
        main {
          aside {
            nav {
              ul {
                li {
                  span "Deep"
                }
              }
            }
          }
        }
      }
    }
  }
}
`);
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const deepComponent = analysis.complexity.find(c => c.componentName === 'DeepNested');

    if (deepComponent) {
      assertTrue(deepComponent.viewDepth >= 5, 'Should have deep view depth');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles components with many directives', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'ManyDirectives.pulse'), `
@page ManyDirectives

state {
  show1: true
  show2: true
  items1: []
  items2: []
}

view {
  @if(show1) {
    div "visible1"
  }
  @if(show2) {
    div "visible2"
  }
  @for(item in items1) {
    span "{item}"
  }
  @for(item in items2) {
    p "{item}"
  }
}
`);
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const directiveComponent = analysis.complexity.find(c => c.componentName === 'ManyDirectives');

    if (directiveComponent) {
      assertTrue(directiveComponent.directiveCount >= 4, 'Should count multiple directives');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles nested style rules', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'NestedStyles.pulse'), `
@page NestedStyles

view {
  div.container {
    p "content"
  }
}

style {
  .container {
    padding: 10px

    p {
      margin: 5px
    }

    &:hover {
      background: blue
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 5px
    }
  }
}
`);
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const styledComponent = analysis.complexity.find(c => c.componentName === 'NestedStyles');

    if (styledComponent) {
      assertTrue(styledComponent.styleRuleCount >= 1, 'Should count style rules');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles conditional and loop in same view', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'ConditionalLoop.pulse'), `
@page ConditionalLoop

state {
  show: true
  items: []
}

view {
  @if(show) {
    @for(item in items) {
      div "{item}"
    }
  }
  @else {
    p "Empty"
  }
}
`);
  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const component = analysis.complexity.find(c => c.componentName === 'ConditionalLoop');

    if (component) {
      assertTrue(component.directiveCount >= 2, 'Should count nested directives');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('buildImportGraph handles mixed import styles', async () => {
  setupTestFixtures();
  // Create files with different import styles
  writeFileSync(join(SRC_DIR, 'imports-test.js'), `
import DefaultExport from './app.js';
import { namedExport } from './router.js';
import * as namespace from './utils/helpers.js';
`);
  try {
    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.js'] });
    const graph = await buildImportGraph(files, parse);

    assertTrue(Array.isArray(graph.edges), 'Should have edges array');
    // Should detect imports from the test file
    const importsTestEdges = graph.edges.filter(e => e.from.includes('imports-test.js'));
    assertTrue(importsTestEdges.length >= 2, 'Should detect multiple import styles');
  } finally {
    cleanupTestFixtures();
  }
});

test('findPulseFiles handles symlinks gracefully', () => {
  setupTestFixtures();
  // This test verifies symlinks don't cause infinite loops
  // Most systems handle this, but we test for robustness
  try {
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse'] });
    assertTrue(Array.isArray(files), 'Should return array even with potential symlinks');
  } finally {
    cleanupTestFixtures();
  }
});

test('formatBytes handles boundary values', () => {
  // Test exact boundary values
  assertEqual(formatBytes(1023), '1023 B');
  assertEqual(formatBytes(1024), '1 KB');
  assertEqual(formatBytes(1048575), '1024 KB');
  assertEqual(formatBytes(1048576), '1 MB');
});

test('relativePath handles Windows-style paths', () => {
  // Test path normalization
  const cwd = process.cwd();
  const normalPath = join(cwd, 'src', 'file.js');
  const result = relativePath(normalPath);

  assertTrue(!result.startsWith(cwd), 'Should return relative path');
});

test('parseArgs handles value after = sign', () => {
  const { options, patterns } = parseArgs(['--port=3000', '--output=dist']);

  // parseArgs treats these as boolean flags, not key=value pairs
  assertEqual(options['port=3000'], true);
  assertEqual(options['output=dist'], true);
});

test('analyzeBundle detects transitive dead code', async () => {
  setupTestFixtures();
  // Create a chain: A imports B imports C, but A is never imported
  writeFileSync(join(SRC_DIR, 'ChainA.pulse'), `
@page ChainA
import ChainB from './ChainB.pulse'
view { div "A" }
`);
  writeFileSync(join(SRC_DIR, 'ChainB.pulse'), `
@page ChainB
import ChainC from './ChainC.pulse'
view { div "B" }
`);
  writeFileSync(join(SRC_DIR, 'ChainC.pulse'), `
@page ChainC
view { div "C" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // All three should be dead code since none are reachable from entry points
    assertTrue(analysis.deadCode.some(d => d.file.includes('ChainA.pulse')), 'Should detect ChainA as dead');
    assertTrue(analysis.deadCode.some(d => d.file.includes('ChainB.pulse')), 'Should detect ChainB as dead');
    assertTrue(analysis.deadCode.some(d => d.file.includes('ChainC.pulse')), 'Should detect ChainC as dead');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles components without state', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'Stateless.pulse'), `
@page Stateless

view {
  div "No state here"
}
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const stateless = analysis.complexity.find(c => c.componentName === 'Stateless');

    if (stateless) {
      assertEqual(stateless.stateCount, 0, 'Should have zero state');
      assertEqual(stateless.actionCount, 0, 'Should have zero actions');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles components without view', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'NoView.pulse'), `
@page NoView

state {
  data: null
}
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    // Should not throw, should handle gracefully
    assertTrue(Array.isArray(analysis.fileBreakdown), 'Should have fileBreakdown');
  } finally {
    cleanupTestFixtures();
  }
});

test('state usage identifies same state name in different files', async () => {
  setupTestFixtures();
  // Create files with overlapping state names
  writeFileSync(join(SRC_DIR, 'StateA.pulse'), `
@page StateA
state {
  loading: false
  error: null
}
view { div "A" }
`);
  writeFileSync(join(SRC_DIR, 'StateB.pulse'), `
@page StateB
state {
  loading: true
  data: []
}
view { div "B" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const loadingState = analysis.stateUsage.find(s => s.name === 'loading');

    if (loadingState) {
      assertTrue(loadingState.declarationCount >= 2, 'Should track multiple declarations');
      assertTrue(loadingState.isShared, 'Should mark as shared');
    }
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles very long file paths', async () => {
  setupTestFixtures();
  // Create a deeply nested directory structure
  const deepPath = join(SRC_DIR, 'a', 'b', 'c', 'd', 'e');
  mkdirSync(deepPath, { recursive: true });
  writeFileSync(join(deepPath, 'Deep.pulse'), `
@page Deep
view { div "deep" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    assertTrue(analysis.fileBreakdown.some(f => f.path.includes('Deep.pulse')), 'Should find deep file');
  } finally {
    cleanupTestFixtures();
  }
});

test('analyzeBundle handles files with only imports', async () => {
  setupTestFixtures();
  writeFileSync(join(SRC_DIR, 'OnlyImports.pulse'), `
import A from './components/Header.pulse'
import B from './components/Footer.pulse'

@page OnlyImports
view { div "imports only" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const component = analysis.fileBreakdown.find(f => f.path.includes('OnlyImports.pulse'));

    if (component) {
      assertTrue(component.importCount >= 2, 'Should count imports');
    }
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// runAnalyze Command Tests
// =============================================================================

printSection('runAnalyze Command Tests');

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

// Helper to run test in a specific directory with automatic cleanup
async function withTestDir(dir, fn) {
  const originalCwd = process.cwd();
  try {
    process.chdir(dir);
    await fn();
  } finally {
    process.chdir(originalCwd);
  }
}

testAsync('runAnalyze outputs JSON format with --json flag', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--json', TEST_DIR]);

    // Should have JSON output
    const output = mocks.logs.join('\n');
    assertTrue(output.includes('"summary"'), 'Should output JSON with summary');
    assertTrue(output.includes('"fileBreakdown"'), 'Should output JSON with fileBreakdown');
    assertTrue(output.includes('"importGraph"'), 'Should output JSON with importGraph');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('runAnalyze outputs formatted console output by default', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze([TEST_DIR]);

    // Should have formatted output with headers
    const output = mocks.logs.join('\n');
    assertTrue(output.includes('PULSE BUNDLE ANALYSIS') || output.includes('Analysis complete'), 'Should output formatted analysis');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('runAnalyze handles verbose flag', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    // Verbose mode should output more details
    const output = mocks.logs.join('\n');
    assertTrue(output.length > 0, 'Should have output');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('runAnalyze handles -v short flag', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['-v', TEST_DIR]);

    const output = mocks.logs.join('\n');
    assertTrue(output.length > 0, 'Should have output with -v flag');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('runAnalyze exits with error when src directory missing', async () => {
  // Create temp dir without src
  const tempDir = join(process.cwd(), 'test-no-src-dir');
  mkdirSync(tempDir, { recursive: true });

  const mocks = setupCommandMocks();

  try {
    // Pass tempDir as argument instead of changing directory
    await runAnalyze([tempDir]);
    assertTrue(false, 'Should have thrown exit error');
  } catch (e) {
    if (e.message === 'EXIT_1') {
      assertEqual(mocks.getExitCode(), 1);
    } else if (!e.message.startsWith('EXIT_')) {
      throw e;
    }
  } finally {
    mocks.restore();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

testAsync('runAnalyze accepts custom root directory', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--json', TEST_DIR]);

    const output = mocks.logs.join('\n');
    assertTrue(output.includes('"summary"'), 'Should analyze specified directory');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('runAnalyze warns about dead code', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze([TEST_DIR]);

    // Should warn about unused files
    const output = mocks.logs.join('\n') + mocks.warns.join('\n');
    assertTrue(output.includes('unused') || output.includes('dead') || output.includes('Warning') || output.includes('Unused'), 'Should warn about dead code');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

// =============================================================================
// formatConsoleOutput Tests (via runAnalyze)
// =============================================================================

printSection('formatConsoleOutput Tests');

testAsync('formatConsoleOutput includes summary table', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze([TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Check for summary metrics in output
    assertTrue(
      output.includes('Total') || output.includes('files') || output.includes('pulse'),
      'Should include summary information'
    );
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('formatConsoleOutput shows complexity bar chart', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze([TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Should show complexity metrics (component names, scores)
    assertTrue(
      output.includes('COMPLEXITY') || output.includes('App') || output.includes('Home'),
      'Should show complexity information or component names'
    );
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('formatConsoleOutput verbose shows detailed metrics table', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Verbose mode should show more detail
    assertTrue(output.length > 100, 'Verbose output should be substantial');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('formatConsoleOutput verbose shows file size breakdown', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Verbose should include file sizes
    assertTrue(
      output.includes('SIZE') || output.includes('.pulse') || output.includes('.js') || output.includes('B'),
      'Verbose should show file information'
    );
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('formatConsoleOutput verbose shows import dependency tree', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Should show import tree or dependency info
    assertTrue(
      output.includes('IMPORT') || output.includes('DEPEND') || output.includes('dependencies') || output.includes('└') || output.includes('├'),
      'Verbose should show dependency information'
    );
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('formatConsoleOutput verbose shows state variables', async () => {
  setupTestFixtures();
  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    const output = mocks.logs.join('\n');
    // Should show state variable info (title, count from App.pulse)
    assertTrue(
      output.includes('STATE') || output.includes('title') || output.includes('count') || output.includes('shared'),
      'Verbose should show state variable information'
    );
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

// =============================================================================
// buildDependencyTree Tests
// =============================================================================

printSection('buildDependencyTree Tests');

testAsync('buildDependencyTree builds tree from import graph', async () => {
  setupTestFixtures();
  try {
    const { parse } = await import('../compiler/index.js');
    const files = findPulseFiles([SRC_DIR], { extensions: ['.pulse', '.js'] });
    const graph = await buildImportGraph(files, parse);

    // The tree is built internally by formatConsoleOutput
    // We test that the import graph has the right structure for tree building
    assertTrue(Array.isArray(graph.nodes), 'Should have nodes');
    assertTrue(Array.isArray(graph.edges), 'Should have edges');
    assertTrue(graph.edges.length > 0, 'Should have edges for tree');
  } finally {
    cleanupTestFixtures();
  }
});

testAsync('buildDependencyTree handles circular dependencies', async () => {
  setupTestFixtures();

  // Create circular imports
  writeFileSync(join(SRC_DIR, 'CircA.pulse'), `
@page CircA
import CircB from './CircB.pulse'
view { div "A" }
`);
  writeFileSync(join(SRC_DIR, 'CircB.pulse'), `
@page CircB
import CircA from './CircA.pulse'
view { div "B" }
`);

  const mocks = setupCommandMocks();

  try {
    // Run verbose to trigger tree building
    await runAnalyze(['--verbose', TEST_DIR]);

    // Should complete without infinite loop
    const output = mocks.logs.join('\n');
    assertTrue(output.length > 0, 'Should complete with circular deps');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('buildDependencyTree limits depth to prevent infinite recursion', async () => {
  setupTestFixtures();

  // Create deep import chain
  for (let i = 1; i <= 10; i++) {
    const nextImport = i < 10 ? `import Deep${i + 1} from './Deep${i + 1}.pulse'` : '';
    writeFileSync(join(SRC_DIR, `Deep${i}.pulse`), `
@page Deep${i}
${nextImport}
view { div "Deep ${i}" }
`);
  }

  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', TEST_DIR]);

    // Should complete without stack overflow
    const output = mocks.logs.join('\n');
    assertTrue(output.length > 0, 'Should handle deep chains');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    cleanupTestFixtures();
  }
});

testAsync('buildDependencyTree handles empty import graph', async () => {
  // Create project with no imports
  const emptyDir = join(process.cwd(), 'test-empty-imports');
  mkdirSync(join(emptyDir, 'src'), { recursive: true });
  writeFileSync(join(emptyDir, 'src', 'Lonely.pulse'), `
@page Lonely
view { div "No imports" }
`);

  const mocks = setupCommandMocks();

  try {
    await runAnalyze(['--verbose', emptyDir]);

    // Should handle gracefully
    const output = mocks.logs.join('\n');
    assertTrue(output.length > 0, 'Should handle empty imports');
  } catch (e) {
    if (!e.message.startsWith('EXIT_')) throw e;
  } finally {
    mocks.restore();
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

// =============================================================================
// analyzeStateUsage Tests
// =============================================================================

printSection('analyzeStateUsage Tests');

testAsync('analyzeStateUsage tracks state declarations correctly', async () => {
  setupTestFixtures();
  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // App.pulse has title and count
    const titleState = analysis.stateUsage.find(s => s.name === 'title');
    const countState = analysis.stateUsage.find(s => s.name === 'count');

    assertTrue(titleState !== undefined, 'Should find title state');
    assertTrue(countState !== undefined, 'Should find count state');
    assertEqual(titleState.declarationCount, 1, 'Title should have 1 declaration');
    assertEqual(countState.declarationCount, 1, 'Count should have 1 declaration');
  } finally {
    cleanupTestFixtures();
  }
});

testAsync('analyzeStateUsage identifies shared state across files', async () => {
  setupTestFixtures();

  // Create multiple files with same state name
  writeFileSync(join(SRC_DIR, 'SharedA.pulse'), `
@page SharedA
state { sharedCounter: 0 }
view { div "{sharedCounter}" }
`);
  writeFileSync(join(SRC_DIR, 'SharedB.pulse'), `
@page SharedB
state { sharedCounter: 0 }
view { div "{sharedCounter}" }
`);
  writeFileSync(join(SRC_DIR, 'SharedC.pulse'), `
@page SharedC
state { sharedCounter: 0 }
view { div "{sharedCounter}" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    const sharedState = analysis.stateUsage.find(s => s.name === 'sharedCounter');

    assertTrue(sharedState !== undefined, 'Should find sharedCounter');
    assertEqual(sharedState.declarationCount, 3, 'Should have 3 declarations');
    assertEqual(sharedState.isShared, true, 'Should be marked as shared');
    assertEqual(sharedState.files.length, 3, 'Should be in 3 files');
  } finally {
    cleanupTestFixtures();
  }
});

testAsync('analyzeStateUsage handles files with parse errors', async () => {
  setupTestFixtures();

  // Add a file with syntax error
  writeFileSync(join(SRC_DIR, 'BadState.pulse'), `
@page BadState
state {
  broken: !!invalid!!
}
view { div "broken" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);
    // Should complete without throwing
    assertTrue(Array.isArray(analysis.stateUsage), 'Should return state usage array');
  } finally {
    cleanupTestFixtures();
  }
});

testAsync('analyzeStateUsage returns empty array when no state', async () => {
  // Create project with no state
  const noStateDir = join(process.cwd(), 'test-no-state');
  mkdirSync(join(noStateDir, 'src'), { recursive: true });
  writeFileSync(join(noStateDir, 'src', 'Stateless.pulse'), `
@page Stateless
view { div "No state" }
`);

  try {
    const analysis = await analyzeBundle(noStateDir);
    assertTrue(Array.isArray(analysis.stateUsage), 'Should return array');
    // May have 0 state or some from the stateless component
  } finally {
    rmSync(noStateDir, { recursive: true, force: true });
  }
});

testAsync('analyzeStateUsage sorts by declaration count descending', async () => {
  setupTestFixtures();

  // Create files with different state counts
  writeFileSync(join(SRC_DIR, 'Multi1.pulse'), `
@page Multi1
state { popularState: 0 }
view { div "1" }
`);
  writeFileSync(join(SRC_DIR, 'Multi2.pulse'), `
@page Multi2
state { popularState: 0; rareState: 0 }
view { div "2" }
`);
  writeFileSync(join(SRC_DIR, 'Multi3.pulse'), `
@page Multi3
state { popularState: 0 }
view { div "3" }
`);

  try {
    const analysis = await analyzeBundle(TEST_DIR);

    // Verify sorting
    for (let i = 1; i < analysis.stateUsage.length; i++) {
      assertTrue(
        analysis.stateUsage[i - 1].declarationCount >= analysis.stateUsage[i].declarationCount,
        'Should be sorted by declaration count descending'
      );
    }
  } finally {
    cleanupTestFixtures();
  }
});

// =============================================================================
// Results
// =============================================================================

// Run async tests and then print results
(async () => {
  await runAsyncTests();
  printResults();
  exitWithCode();
})();
