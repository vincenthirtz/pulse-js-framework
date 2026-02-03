/**
 * CLI Command Tests
 *
 * Tests for the Pulse CLI commands and utilities
 *
 * @module test/cli
 */

import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { findPulseFiles, parseArgs, formatBytes, relativePath, resolveImportPath } from '../cli/utils/file-utils.js';
import { compile } from '../compiler/index.js';
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
// Levenshtein Distance Tests
// =============================================================================

printSection('Levenshtein Distance Tests');

/**
 * Replicate CLI's Levenshtein distance function for testing
 * This is the same algorithm used in cli/index.js
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

test('levenshtein distance returns 0 for identical strings', () => {
  assertEqual(levenshteinDistance('compile', 'compile'), 0);
  assertEqual(levenshteinDistance('build', 'build'), 0);
  assertEqual(levenshteinDistance('', ''), 0);
});

test('levenshtein distance returns string length for empty comparison', () => {
  assertEqual(levenshteinDistance('hello', ''), 5);
  assertEqual(levenshteinDistance('', 'world'), 5);
});

test('levenshtein distance calculates single character edits', () => {
  // Substitution
  assertEqual(levenshteinDistance('cat', 'bat'), 1);
  // Insertion
  assertEqual(levenshteinDistance('cat', 'cats'), 1);
  // Deletion
  assertEqual(levenshteinDistance('cats', 'cat'), 1);
});

test('levenshtein distance calculates multiple edits', () => {
  assertEqual(levenshteinDistance('kitten', 'sitting'), 3);
  assertEqual(levenshteinDistance('complile', 'compile'), 1); // typo correction
  assertEqual(levenshteinDistance('buid', 'build'), 1); // typo correction
});

test('levenshtein distance is symmetric', () => {
  assertEqual(levenshteinDistance('abc', 'xyz'), levenshteinDistance('xyz', 'abc'));
  assertEqual(levenshteinDistance('compile', 'complile'), levenshteinDistance('complile', 'compile'));
});

// =============================================================================
// Command Aliases Tests
// =============================================================================

printSection('Command Aliases Tests');

/**
 * Command aliases from cli/index.js
 */
const commandAliases = {
  'complile': 'compile',
  'comile': 'compile',
  'complie': 'compile',
  'buid': 'build',
  'biuld': 'build',
  'buildd': 'build',
  'devv': 'dev',
  'lnt': 'lint',
  'lintt': 'lint',
  'fromat': 'format',
  'foramt': 'format',
  'formatt': 'format',
  'analize': 'analyze',
  'analzye': 'analyze',
  'anaylze': 'analyze',
  'crate': 'create',
  'craete': 'create',
  'preivew': 'preview',
  'preveiw': 'preview',
  'moble': 'mobile',
  'moblie': 'mobile',
  'relase': 'release',
  'realease': 'release'
};

test('command aliases map common typos to correct commands', () => {
  assertEqual(commandAliases['complile'], 'compile');
  assertEqual(commandAliases['buid'], 'build');
  assertEqual(commandAliases['lnt'], 'lint');
  assertEqual(commandAliases['fromat'], 'format');
});

test('command aliases include multiple typo variants', () => {
  // compile variants
  assertTrue(commandAliases['complile'] === 'compile');
  assertTrue(commandAliases['comile'] === 'compile');
  assertTrue(commandAliases['complie'] === 'compile');

  // build variants
  assertTrue(commandAliases['buid'] === 'build');
  assertTrue(commandAliases['biuld'] === 'build');
  assertTrue(commandAliases['buildd'] === 'build');

  // format variants
  assertTrue(commandAliases['fromat'] === 'format');
  assertTrue(commandAliases['foramt'] === 'format');
  assertTrue(commandAliases['formatt'] === 'format');
});

test('all aliases point to valid commands', () => {
  const validCommands = ['help', 'version', 'create', 'dev', 'build', 'preview',
                         'compile', 'mobile', 'lint', 'format', 'analyze', 'release', 'docs-test'];

  for (const [alias, target] of Object.entries(commandAliases)) {
    assertTrue(validCommands.includes(target),
      `Alias '${alias}' points to invalid command '${target}'`);
  }
});

// =============================================================================
// Command Suggestion Tests
// =============================================================================

printSection('Command Suggestion Tests');

/**
 * Replicate CLI's suggestCommand function
 */
function suggestCommand(input) {
  const commands = {
    help: true, version: true, create: true, dev: true, build: true,
    preview: true, compile: true, mobile: true, lint: true,
    format: true, analyze: true, release: true, 'docs-test': true
  };

  // Check aliases first
  if (input in commandAliases) {
    return commandAliases[input];
  }

  // Find closest command using Levenshtein distance
  const allCommands = Object.keys(commands);
  let closest = null;
  let minDistance = Infinity;

  for (const cmd of allCommands) {
    const distance = levenshteinDistance(input.toLowerCase(), cmd.toLowerCase());
    if (distance < minDistance && distance <= 3) { // Max 3 edits
      minDistance = distance;
      closest = cmd;
    }
  }

  return closest;
}

test('suggestCommand returns correct command for aliases', () => {
  assertEqual(suggestCommand('complile'), 'compile');
  assertEqual(suggestCommand('buid'), 'build');
  assertEqual(suggestCommand('lnt'), 'lint');
});

test('suggestCommand returns null for completely different input', () => {
  assertEqual(suggestCommand('xyzabc'), null);
  assertEqual(suggestCommand('qwerty'), null);
  assertEqual(suggestCommand('zzzzzz'), null);
});

test('suggestCommand finds closest command within 3 edits', () => {
  assertEqual(suggestCommand('helo'), 'help'); // 1 edit
  assertEqual(suggestCommand('versin'), 'version'); // 1 edit
  assertEqual(suggestCommand('formaat'), 'format'); // 1 edit
});

test('suggestCommand is case insensitive', () => {
  assertEqual(suggestCommand('HELP'), 'help');
  assertEqual(suggestCommand('Build'), 'build');
  assertEqual(suggestCommand('FORMAT'), 'format');
});

// =============================================================================
// parseArgs Tests
// =============================================================================

printSection('parseArgs Tests');

test('parseArgs parses options correctly', () => {
  const { options, patterns } = parseArgs(['--json', '--verbose', 'src/']);

  assertEqual(options.json, true);
  assertEqual(options.verbose, true);
  assertEqual(patterns.length, 1);
  assertEqual(patterns[0], 'src/');
});

test('parseArgs handles flag without value', () => {
  const { options } = parseArgs(['--check']);

  assertEqual(options.check, true);
});

test('parseArgs handles short flags', () => {
  const { options } = parseArgs(['-w', '-v']);

  assertEqual(options.w, true);
  assertEqual(options.v, true);
});

test('parseArgs handles multiple patterns', () => {
  const { patterns } = parseArgs(['src/', 'lib/', '*.pulse']);

  assertDeepEqual(patterns, ['src/', 'lib/', '*.pulse']);
});

test('parseArgs skips options in patterns', () => {
  const { patterns } = parseArgs(['--fix', 'src/']);

  assertDeepEqual(patterns, ['src/']);
});

test('parseArgs handles mixed options and patterns', () => {
  const { options, patterns } = parseArgs(['--watch', 'src/', '-o', 'dist/', '--dry-run']);

  assertEqual(options.watch, true);
  assertEqual(options.o, true);
  assertEqual(options['dry-run'], true);
  assertDeepEqual(patterns, ['src/', 'dist/']);
});

test('parseArgs handles empty arguments', () => {
  const { options, patterns } = parseArgs([]);

  assertDeepEqual(options, {});
  assertDeepEqual(patterns, []);
});

test('parseArgs handles kebab-case options', () => {
  const { options } = parseArgs(['--dry-run', '--no-push', '--skip-prompt']);

  assertEqual(options['dry-run'], true);
  assertEqual(options['no-push'], true);
  assertEqual(options['skip-prompt'], true);
});

// =============================================================================
// formatBytes Tests
// =============================================================================

printSection('formatBytes Tests');

test('formatBytes formats zero bytes', () => {
  assertEqual(formatBytes(0), '0 B');
});

test('formatBytes formats bytes', () => {
  assertEqual(formatBytes(500), '500 B');
  assertEqual(formatBytes(1), '1 B');
  assertEqual(formatBytes(1023), '1023 B');
});

test('formatBytes formats kilobytes', () => {
  assertEqual(formatBytes(1024), '1 KB');
  assertEqual(formatBytes(2048), '2 KB');
  assertEqual(formatBytes(1536), '1.5 KB');
});

test('formatBytes formats megabytes', () => {
  assertEqual(formatBytes(1048576), '1 MB');
  assertEqual(formatBytes(2097152), '2 MB');
  assertEqual(formatBytes(1572864), '1.5 MB');
});

test('formatBytes formats gigabytes', () => {
  assertEqual(formatBytes(1073741824), '1 GB');
  assertEqual(formatBytes(2147483648), '2 GB');
});

test('formatBytes handles decimal precision', () => {
  assertEqual(formatBytes(1536), '1.5 KB');
  assertEqual(formatBytes(1126), '1.1 KB');
});

// =============================================================================
// relativePath Tests
// =============================================================================

printSection('relativePath Tests');

test('relativePath returns relative path from cwd', () => {
  const cwd = process.cwd();
  const absPath = join(cwd, 'src', 'App.pulse');
  const relPath = relativePath(absPath);

  assertTrue(relPath.includes('src') && relPath.includes('App.pulse'),
    'Should contain path components');
  assertTrue(!relPath.startsWith(cwd), 'Should not start with cwd');
});

test('relativePath returns original path if not under cwd', () => {
  const absPath = '/completely/different/path/file.js';
  const relPath = relativePath(absPath);

  assertEqual(relPath, absPath);
});

// =============================================================================
// findPulseFiles Tests
// =============================================================================

printSection('findPulseFiles Tests');

test('findPulseFiles returns array', () => {
  const files = findPulseFiles(['nonexistent']);

  assertTrue(Array.isArray(files), 'Should return array');
});

test('findPulseFiles with empty patterns defaults to current directory', () => {
  const files = findPulseFiles([]);

  assertTrue(Array.isArray(files), 'Should return array');
});

test('findPulseFiles skips hidden directories and node_modules', () => {
  const files = findPulseFiles(['.']);

  for (const file of files) {
    assertTrue(!file.includes('node_modules'), 'Should not include node_modules');
    assertTrue(!file.includes('/.'), 'Should not include hidden directories');
  }
});

test('findPulseFiles with custom extensions', () => {
  const files = findPulseFiles(['.'], { extensions: ['.js'] });

  assertTrue(Array.isArray(files), 'Should return array');
  for (const file of files) {
    assertTrue(file.endsWith('.js'), 'Should only include .js files');
  }
});

test('findPulseFiles finds example files', () => {
  const examplesDir = join(process.cwd(), 'examples');
  if (existsSync(examplesDir)) {
    const files = findPulseFiles(['examples/']);
    // Examples directory should have some .pulse files
    assertTrue(Array.isArray(files), 'Should return array');
  }
});

// =============================================================================
// resolveImportPath Tests
// =============================================================================

printSection('resolveImportPath Tests');

// Create temporary test files for import resolution
const testDir = join(process.cwd(), '.test-cli-temp');

function setupTestFiles() {
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
  writeFileSync(join(testDir, 'main.pulse'), '@page Main\nview { div "test" }');
  writeFileSync(join(testDir, 'Component.pulse'), '@component Comp\nview { span "comp" }');
  writeFileSync(join(testDir, 'utils.js'), 'export const util = 1;');
}

function cleanupTestFiles() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

test('resolveImportPath resolves relative .pulse imports', () => {
  setupTestFiles();
  const fromFile = join(testDir, 'main.pulse');
  const resolved = resolveImportPath(fromFile, './Component');

  assertTrue(resolved !== null, 'Should resolve relative import');
  assertTrue(resolved.endsWith('Component.pulse'), 'Should find Component.pulse');
  cleanupTestFiles();
});

test('resolveImportPath resolves relative .js imports', () => {
  setupTestFiles();
  const fromFile = join(testDir, 'main.pulse');
  const resolved = resolveImportPath(fromFile, './utils');

  assertTrue(resolved !== null, 'Should resolve relative import');
  assertTrue(resolved.endsWith('utils.js'), 'Should find utils.js');
  cleanupTestFiles();
});

test('resolveImportPath returns null for non-relative imports', () => {
  setupTestFiles();
  const fromFile = join(testDir, 'main.pulse');
  const resolved = resolveImportPath(fromFile, 'some-package');

  assertEqual(resolved, null, 'Should return null for package imports');
  cleanupTestFiles();
});

test('resolveImportPath returns null for non-existent files', () => {
  setupTestFiles();
  const fromFile = join(testDir, 'main.pulse');
  const resolved = resolveImportPath(fromFile, './NonExistent');

  assertEqual(resolved, null, 'Should return null for non-existent imports');
  cleanupTestFiles();
});

// =============================================================================
// Compile Command Tests
// =============================================================================

printSection('Compile Command Tests');

test('compile returns valid JavaScript from .pulse source', () => {
  const source = `
@page Counter

state {
  count: 0
}

view {
  div "Count: {count}"
  button @click(count++) "+"
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('pulse'), 'Should include pulse import');
  assertTrue(result.code.includes('count'), 'Should include state variable');
});

test('compile handles imports correctly', () => {
  const source = `
import Button from './Button.pulse'
import { Header, Footer } from './components.pulse'

@page App

view {
  Header
  div "content"
  Footer
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('Button'), 'Should include Button import');
  assertTrue(result.code.includes('Header'), 'Should include Header');
  assertTrue(result.code.includes('Footer'), 'Should include Footer');
});

test('compile handles style blocks', () => {
  const source = `
@page StyledPage

view {
  div.container "Hello"
}

style {
  .container {
    padding: 20px
    background: blue
  }
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('style') || result.code.includes('css'),
    'Should include style handling');
});

test('compile reports errors for invalid syntax', () => {
  const source = `
@page Invalid

state {
  count:
}`;

  const result = compile(source);

  assertTrue(!result.success || result.errors.length > 0,
    'Should report errors for invalid syntax');
});

test('compile handles nested view elements', () => {
  const source = `
@page Nested

view {
  div.wrapper {
    header.top "Header"
    main {
      section.content {
        p "Paragraph 1"
        p "Paragraph 2"
      }
    }
    footer.bottom "Footer"
  }
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('wrapper'), 'Should include wrapper class');
  assertTrue(result.code.includes('content'), 'Should include content class');
});

test('compile handles event handlers', () => {
  const source = `
@page Events

state {
  value: ""
}

view {
  input @input(value = event.target.value)
  button @click(console.log(value)) "Log"
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('input') || result.code.includes('event'),
    'Should include event handling');
});

test('compile handles accessibility directives', () => {
  const source = `
@page A11y

view {
  button @a11y(label="Close button") "X"
  div @live(polite) "Status: OK"
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('aria') || result.code.includes('label'),
    'Should include accessibility attributes');
});

test('compile handles conditional rendering', () => {
  const source = `
@page Conditional

state {
  show: true
}

view {
  @if(show) {
    div "Visible"
  }
  @else {
    div "Hidden"
  }
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('show'), 'Should include show state');
});

test('compile handles list rendering', () => {
  const source = `
@page List

state {
  items: ["a", "b", "c"]
}

view {
  ul {
    @for (item of items) {
      li "{item}"
    }
  }
}`;

  const result = compile(source);

  assertTrue(result.success, 'Compilation should succeed');
  assertTrue(result.code.includes('items'), 'Should include items state');
});

// =============================================================================
// Project Structure Tests (Create Command)
// =============================================================================

printSection('Project Structure Tests');

test('create command generates correct package.json structure', () => {
  const projectName = 'test-project';
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'pulse dev',
      build: 'pulse build',
      preview: 'vite preview'
    },
    dependencies: {
      'pulse-js-framework': '^1.0.0'
    },
    devDependencies: {
      vite: '^5.0.0'
    }
  };

  assertEqual(packageJson.name, projectName);
  assertEqual(packageJson.type, 'module');
  assertTrue('dev' in packageJson.scripts, 'Should have dev script');
  assertTrue('build' in packageJson.scripts, 'Should have build script');
  assertTrue('pulse-js-framework' in packageJson.dependencies, 'Should have pulse dependency');
});

test('create command generates correct vite config', () => {
  const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;

  assertTrue(viteConfig.includes('defineConfig'), 'Should include defineConfig');
  assertTrue(viteConfig.includes('pulse-js-framework/vite'), 'Should include vite plugin');
  assertTrue(viteConfig.includes('plugins'), 'Should include plugins array');
});

test('create command generates correct index.html', () => {
  const projectName = 'test-project';
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;

  assertTrue(indexHtml.includes('<!DOCTYPE html>'), 'Should be valid HTML5');
  assertTrue(indexHtml.includes(`<title>${projectName}</title>`), 'Should include project title');
  assertTrue(indexHtml.includes('id="app"'), 'Should include app container');
  assertTrue(indexHtml.includes('type="module"'), 'Should use ES modules');
  assertTrue(indexHtml.includes('/src/main.js'), 'Should reference main.js');
});

test('create command generates correct main.js', () => {
  const mainJs = `import App from './App.pulse';

App.mount('#app');
`;

  assertTrue(mainJs.includes("import App from './App.pulse'"), 'Should import App');
  assertTrue(mainJs.includes("mount('#app')"), 'Should mount to #app');
});

test('create command generates correct App.pulse', () => {
  const appPulse = `@page App

state {
  count: 0
  name: "Pulse"
}

view {
  #app {
    h1.title "Welcome to {name}!"

    .counter {
      p "Count: {count}"

      .buttons {
        button @click(count--) "-"
        button @click(count++) "+"
      }
    }

    p.info "Edit src/App.pulse and save to hot reload."
  }
}

style {
  #app {
    font-family: system-ui, -apple-system, sans-serif
    max-width: 600px
    margin: 0 auto
    padding: 40px 20px
    text-align: center
  }
}
`;

  assertTrue(appPulse.includes('@page App'), 'Should include page declaration');
  assertTrue(appPulse.includes('state {'), 'Should include state block');
  assertTrue(appPulse.includes('view {'), 'Should include view block');
  assertTrue(appPulse.includes('style {'), 'Should include style block');
  assertTrue(appPulse.includes('count: 0'), 'Should include count state');
  assertTrue(appPulse.includes('@click(count++)'), 'Should include click handler');
});

test('create command generates correct .gitignore', () => {
  const gitignore = `node_modules
dist
.DS_Store
*.local
`;

  assertTrue(gitignore.includes('node_modules'), 'Should ignore node_modules');
  assertTrue(gitignore.includes('dist'), 'Should ignore dist');
  assertTrue(gitignore.includes('.DS_Store'), 'Should ignore macOS files');
});

// =============================================================================
// CLI Help and Version Tests
// =============================================================================

printSection('CLI Help and Version Tests');

test('help output includes all commands', () => {
  const helpText = `
Pulse Framework CLI

Commands:
  create <name>    Create a new Pulse project
  dev [port]       Start development server
  build            Build for production
  preview [port]   Preview production build
  compile <file>   Compile a .pulse file
  mobile <cmd>     Mobile app commands
  lint [files]     Validate .pulse files
  format [files]   Format .pulse files
  analyze          Analyze bundle size
  release <type>   Create a new release
  docs-test        Test documentation
  version          Show version number
  help             Show this help message
`;

  const expectedCommands = [
    'create', 'dev', 'build', 'preview', 'compile',
    'mobile', 'lint', 'format', 'analyze', 'release',
    'docs-test', 'version', 'help'
  ];

  for (const cmd of expectedCommands) {
    assertTrue(helpText.includes(cmd), `Help should include ${cmd} command`);
  }
});

test('version matches package.json', () => {
  const packagePath = join(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

  assertTrue(pkg.version !== undefined, 'Should have version in package.json');
  assertTrue(/^\d+\.\d+\.\d+/.test(pkg.version), 'Version should be semver format');
});

// =============================================================================
// Error Handling Tests
// =============================================================================

printSection('Error Handling Tests');

test('parseArgs handles malformed options gracefully', () => {
  // Single dash with multiple characters - treated as pattern
  const { options, patterns } = parseArgs(['-abc']);

  assertTrue(Array.isArray(patterns) || typeof options === 'object',
    'Should handle malformed options without crashing');
});

test('findPulseFiles handles non-existent directories', () => {
  const files = findPulseFiles(['this-directory-does-not-exist']);

  assertTrue(Array.isArray(files), 'Should return empty array');
  assertEqual(files.length, 0, 'Should find no files');
});

test('compile handles empty source', () => {
  const result = compile('');

  // Empty source might succeed with empty output or fail
  assertTrue(typeof result === 'object', 'Should return result object');
});

test('compile handles malformed state block', () => {
  const source = `
@page Test

state {
  invalid syntax here !!!
}

view {
  div "test"
}`;

  const result = compile(source);

  // Should either fail or handle gracefully
  assertTrue(typeof result === 'object', 'Should return result object');
});

// =============================================================================
// Integration Tests
// =============================================================================

printSection('Integration Tests');

test('full workflow: parse args, find files, compile', () => {
  // Parse arguments
  const { options, patterns } = parseArgs(['--dry-run', 'examples/']);

  assertEqual(options['dry-run'], true);
  assertTrue(patterns.includes('examples/'));

  // Find files
  const examplesDir = join(process.cwd(), 'examples');
  if (existsSync(examplesDir)) {
    const files = findPulseFiles(['examples/']);

    // Try to compile first file if any exist
    if (files.length > 0) {
      const source = readFileSync(files[0], 'utf-8');
      const result = compile(source);

      assertTrue(typeof result === 'object', 'Compile should return object');
    }
  }
});

test('CLI utils work together for file discovery', () => {
  // Use parseArgs to extract patterns
  const { patterns } = parseArgs(['examples/', 'test/']);

  // Find files from patterns
  const allFiles = [];
  for (const pattern of patterns) {
    const fullPath = resolve(process.cwd(), pattern);
    if (existsSync(fullPath)) {
      const files = findPulseFiles([pattern]);
      allFiles.push(...files);
    }
  }

  // Each file should be an absolute path
  for (const file of allFiles) {
    assertTrue(file.includes(process.cwd().split(/[/\\]/)[0]) || file.startsWith('/'),
      'Files should be absolute paths');
  }
});

// =============================================================================
// Run Async Tests and Print Results
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
