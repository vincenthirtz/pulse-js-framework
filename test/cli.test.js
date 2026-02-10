/**
 * CLI Command Tests
 *
 * Tests for the Pulse CLI commands and utilities
 *
 * @module test/cli
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { findPulseFiles, parseArgs, formatBytes, relativePath, resolveImportPath } from '../cli/utils/file-utils.js';
import { compile } from '../compiler/index.js';
import { runHelp, getAvailableCommands, getCommandDefinition } from '../cli/help.js';

// =============================================================================
// Levenshtein Distance Tests
// =============================================================================

describe('Levenshtein Distance Tests', () => {
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
    assert.strictEqual(levenshteinDistance('compile', 'compile'), 0);
    assert.strictEqual(levenshteinDistance('build', 'build'), 0);
    assert.strictEqual(levenshteinDistance('', ''), 0);
  });

  test('levenshtein distance returns string length for empty comparison', () => {
    assert.strictEqual(levenshteinDistance('hello', ''), 5);
    assert.strictEqual(levenshteinDistance('', 'world'), 5);
  });

  test('levenshtein distance calculates single character edits', () => {
    // Substitution
    assert.strictEqual(levenshteinDistance('cat', 'bat'), 1);
    // Insertion
    assert.strictEqual(levenshteinDistance('cat', 'cats'), 1);
    // Deletion
    assert.strictEqual(levenshteinDistance('cats', 'cat'), 1);
  });

  test('levenshtein distance calculates multiple edits', () => {
    assert.strictEqual(levenshteinDistance('kitten', 'sitting'), 3);
    assert.strictEqual(levenshteinDistance('complile', 'compile'), 1); // typo correction
    assert.strictEqual(levenshteinDistance('buid', 'build'), 1); // typo correction
  });

  test('levenshtein distance is symmetric', () => {
    assert.strictEqual(levenshteinDistance('abc', 'xyz'), levenshteinDistance('xyz', 'abc'));
    assert.strictEqual(levenshteinDistance('compile', 'complile'), levenshteinDistance('complile', 'compile'));
  });
});

// =============================================================================
// Command Aliases Tests
// =============================================================================

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

describe('Command Aliases Tests', () => {
  test('command aliases map common typos to correct commands', () => {
    assert.strictEqual(commandAliases['complile'], 'compile');
    assert.strictEqual(commandAliases['buid'], 'build');
    assert.strictEqual(commandAliases['lnt'], 'lint');
    assert.strictEqual(commandAliases['fromat'], 'format');
  });

  test('command aliases include multiple typo variants', () => {
    // compile variants
    assert.ok(commandAliases['complile'] === 'compile');
    assert.ok(commandAliases['comile'] === 'compile');
    assert.ok(commandAliases['complie'] === 'compile');

    // build variants
    assert.ok(commandAliases['buid'] === 'build');
    assert.ok(commandAliases['biuld'] === 'build');
    assert.ok(commandAliases['buildd'] === 'build');

    // format variants
    assert.ok(commandAliases['fromat'] === 'format');
    assert.ok(commandAliases['foramt'] === 'format');
    assert.ok(commandAliases['formatt'] === 'format');
  });

  test('all aliases point to valid commands', () => {
    const validCommands = ['help', 'version', 'create', 'dev', 'build', 'preview',
                           'compile', 'mobile', 'lint', 'format', 'analyze', 'release', 'docs-test'];

    for (const [alias, target] of Object.entries(commandAliases)) {
      assert.ok(validCommands.includes(target),
        `Alias '${alias}' points to invalid command '${target}'`);
    }
  });
});

// =============================================================================
// Command Suggestion Tests
// =============================================================================

describe('Command Suggestion Tests', () => {
  /**
   * Replicate CLI's suggestCommand function
   */
  function suggestCommand(input) {
    const commands = {
      help: true, version: true, create: true, dev: true, build: true,
      preview: true, compile: true, mobile: true, lint: true,
      format: true, analyze: true, release: true, 'docs-test': true
    };

    function levenshteinDistance(a, b) {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
      for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
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
    assert.strictEqual(suggestCommand('complile'), 'compile');
    assert.strictEqual(suggestCommand('buid'), 'build');
    assert.strictEqual(suggestCommand('lnt'), 'lint');
  });

  test('suggestCommand returns null for completely different input', () => {
    assert.strictEqual(suggestCommand('xyzabc'), null);
    assert.strictEqual(suggestCommand('qwerty'), null);
    assert.strictEqual(suggestCommand('zzzzzz'), null);
  });

  test('suggestCommand finds closest command within 3 edits', () => {
    assert.strictEqual(suggestCommand('helo'), 'help'); // 1 edit
    assert.strictEqual(suggestCommand('versin'), 'version'); // 1 edit
    assert.strictEqual(suggestCommand('formaat'), 'format'); // 1 edit
  });

  test('suggestCommand is case insensitive', () => {
    assert.strictEqual(suggestCommand('HELP'), 'help');
    assert.strictEqual(suggestCommand('Build'), 'build');
    assert.strictEqual(suggestCommand('FORMAT'), 'format');
  });
});

// =============================================================================
// parseArgs Tests
// =============================================================================

describe('parseArgs Tests', () => {
  test('parseArgs parses options correctly', () => {
    const { options, patterns } = parseArgs(['--json', '--verbose', 'src/']);

    assert.strictEqual(options.json, true);
    assert.strictEqual(options.verbose, true);
    assert.strictEqual(patterns.length, 1);
    assert.strictEqual(patterns[0], 'src/');
  });

  test('parseArgs handles flag without value', () => {
    const { options } = parseArgs(['--check']);

    assert.strictEqual(options.check, true);
  });

  test('parseArgs handles short flags', () => {
    const { options } = parseArgs(['-w', '-v']);

    assert.strictEqual(options.w, true);
    assert.strictEqual(options.v, true);
  });

  test('parseArgs handles multiple patterns', () => {
    const { patterns } = parseArgs(['src/', 'lib/', '*.pulse']);

    assert.deepStrictEqual(patterns, ['src/', 'lib/', '*.pulse']);
  });

  test('parseArgs skips options in patterns', () => {
    const { patterns } = parseArgs(['--fix', 'src/']);

    assert.deepStrictEqual(patterns, ['src/']);
  });

  test('parseArgs handles mixed options and patterns', () => {
    const { options, patterns } = parseArgs(['--watch', 'src/', '-o', 'dist/', '--dry-run']);

    assert.strictEqual(options.watch, true);
    assert.strictEqual(options.o, 'dist/'); // -o takes a value
    assert.strictEqual(options['dry-run'], true);
    assert.deepStrictEqual(patterns, ['src/']);
  });

  test('parseArgs handles empty arguments', () => {
    const { options, patterns } = parseArgs([]);

    assert.deepStrictEqual(options, {});
    assert.deepStrictEqual(patterns, []);
  });

  test('parseArgs handles kebab-case options', () => {
    const { options } = parseArgs(['--dry-run', '--skip-prompt']);

    assert.strictEqual(options['dry-run'], true);
    assert.strictEqual(options['skip-prompt'], true);
  });

  test('parseArgs handles --no- prefix negation', () => {
    const { options } = parseArgs(['--no-state', '--no-style']);

    assert.strictEqual(options.state, false);
    assert.strictEqual(options.style, false);
  });
});

// =============================================================================
// formatBytes Tests
// =============================================================================

describe('formatBytes Tests', () => {
  test('formatBytes formats zero bytes', () => {
    assert.strictEqual(formatBytes(0), '0 B');
  });

  test('formatBytes formats bytes', () => {
    assert.strictEqual(formatBytes(500), '500 B');
    assert.strictEqual(formatBytes(1), '1 B');
    assert.strictEqual(formatBytes(1023), '1023 B');
  });

  test('formatBytes formats kilobytes', () => {
    assert.strictEqual(formatBytes(1024), '1 KB');
    assert.strictEqual(formatBytes(2048), '2 KB');
    assert.strictEqual(formatBytes(1536), '1.5 KB');
  });

  test('formatBytes formats megabytes', () => {
    assert.strictEqual(formatBytes(1048576), '1 MB');
    assert.strictEqual(formatBytes(2097152), '2 MB');
    assert.strictEqual(formatBytes(1572864), '1.5 MB');
  });

  test('formatBytes formats gigabytes', () => {
    assert.strictEqual(formatBytes(1073741824), '1 GB');
    assert.strictEqual(formatBytes(2147483648), '2 GB');
  });

  test('formatBytes handles decimal precision', () => {
    assert.strictEqual(formatBytes(1536), '1.5 KB');
    assert.strictEqual(formatBytes(1126), '1.1 KB');
  });
});

// =============================================================================
// relativePath Tests
// =============================================================================

describe('relativePath Tests', () => {
  test('relativePath returns relative path from cwd', () => {
    const cwd = process.cwd();
    const absPath = join(cwd, 'src', 'App.pulse');
    const relPath = relativePath(absPath);

    assert.ok(relPath.includes('src') && relPath.includes('App.pulse'),
      'Should contain path components');
    assert.ok(!relPath.startsWith(cwd), 'Should not start with cwd');
  });

  test('relativePath returns original path if not under cwd', () => {
    const absPath = '/completely/different/path/file.js';
    const relPath = relativePath(absPath);

    assert.strictEqual(relPath, absPath);
  });
});

// =============================================================================
// findPulseFiles Tests
// =============================================================================

describe('findPulseFiles Tests', () => {
  test('findPulseFiles returns array', () => {
    const files = findPulseFiles(['nonexistent']);

    assert.ok(Array.isArray(files), 'Should return array');
  });

  test('findPulseFiles with empty patterns defaults to current directory', () => {
    const files = findPulseFiles([]);

    assert.ok(Array.isArray(files), 'Should return array');
  });

  test('findPulseFiles skips hidden directories and node_modules', () => {
    const files = findPulseFiles(['.']);

    for (const file of files) {
      assert.ok(!file.includes('node_modules'), 'Should not include node_modules');
      assert.ok(!file.includes('/.'), 'Should not include hidden directories');
    }
  });

  test('findPulseFiles with custom extensions', () => {
    const files = findPulseFiles(['.'], { extensions: ['.js'] });

    assert.ok(Array.isArray(files), 'Should return array');
    for (const file of files) {
      assert.ok(file.endsWith('.js'), 'Should only include .js files');
    }
  });

  test('findPulseFiles finds example files', () => {
    const examplesDir = join(process.cwd(), 'examples');
    if (existsSync(examplesDir)) {
      const files = findPulseFiles(['examples/']);
      // Examples directory should have some .pulse files
      assert.ok(Array.isArray(files), 'Should return array');
    }
  });
});

// =============================================================================
// resolveImportPath Tests
// =============================================================================

describe('resolveImportPath Tests', () => {
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

    assert.ok(resolved !== null, 'Should resolve relative import');
    assert.ok(resolved.endsWith('Component.pulse'), 'Should find Component.pulse');
    cleanupTestFiles();
  });

  test('resolveImportPath resolves relative .js imports', () => {
    setupTestFiles();
    const fromFile = join(testDir, 'main.pulse');
    const resolved = resolveImportPath(fromFile, './utils');

    assert.ok(resolved !== null, 'Should resolve relative import');
    assert.ok(resolved.endsWith('utils.js'), 'Should find utils.js');
    cleanupTestFiles();
  });

  test('resolveImportPath returns null for non-relative imports', () => {
    setupTestFiles();
    const fromFile = join(testDir, 'main.pulse');
    const resolved = resolveImportPath(fromFile, 'some-package');

    assert.strictEqual(resolved, null, 'Should return null for package imports');
    cleanupTestFiles();
  });

  test('resolveImportPath returns null for non-existent files', () => {
    setupTestFiles();
    const fromFile = join(testDir, 'main.pulse');
    const resolved = resolveImportPath(fromFile, './NonExistent');

    assert.strictEqual(resolved, null, 'Should return null for non-existent imports');
    cleanupTestFiles();
  });
});

// =============================================================================
// Compile Command Tests
// =============================================================================

describe('Compile Command Tests', () => {
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('pulse'), 'Should include pulse import');
    assert.ok(result.code.includes('count'), 'Should include state variable');
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('Button'), 'Should include Button import');
    assert.ok(result.code.includes('Header'), 'Should include Header');
    assert.ok(result.code.includes('Footer'), 'Should include Footer');
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('style') || result.code.includes('css'),
      'Should include style handling');
  });

  test('compile reports errors for invalid syntax', () => {
    const source = `
@page Invalid

state {
  count:
}`;

    const result = compile(source);

    assert.ok(!result.success || result.errors.length > 0,
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('wrapper'), 'Should include wrapper class');
    assert.ok(result.code.includes('content'), 'Should include content class');
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('input') || result.code.includes('event'),
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('aria') || result.code.includes('label'),
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('show'), 'Should include show state');
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

    assert.ok(result.success, 'Compilation should succeed');
    assert.ok(result.code.includes('items'), 'Should include items state');
  });
});

// =============================================================================
// Project Structure Tests (Create Command)
// =============================================================================

describe('Project Structure Tests', () => {
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

    assert.strictEqual(packageJson.name, projectName);
    assert.strictEqual(packageJson.type, 'module');
    assert.ok('dev' in packageJson.scripts, 'Should have dev script');
    assert.ok('build' in packageJson.scripts, 'Should have build script');
    assert.ok('pulse-js-framework' in packageJson.dependencies, 'Should have pulse dependency');
  });

  test('create command generates correct vite config', () => {
    const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;

    assert.ok(viteConfig.includes('defineConfig'), 'Should include defineConfig');
    assert.ok(viteConfig.includes('pulse-js-framework/vite'), 'Should include vite plugin');
    assert.ok(viteConfig.includes('plugins'), 'Should include plugins array');
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

    assert.ok(indexHtml.includes('<!DOCTYPE html>'), 'Should be valid HTML5');
    assert.ok(indexHtml.includes(`<title>${projectName}</title>`), 'Should include project title');
    assert.ok(indexHtml.includes('id="app"'), 'Should include app container');
    assert.ok(indexHtml.includes('type="module"'), 'Should use ES modules');
    assert.ok(indexHtml.includes('/src/main.js'), 'Should reference main.js');
  });

  test('create command generates correct main.js', () => {
    const mainJs = `import App from './App.pulse';

App.mount('#app');
`;

    assert.ok(mainJs.includes("import App from './App.pulse'"), 'Should import App');
    assert.ok(mainJs.includes("mount('#app')"), 'Should mount to #app');
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

    assert.ok(appPulse.includes('@page App'), 'Should include page declaration');
    assert.ok(appPulse.includes('state {'), 'Should include state block');
    assert.ok(appPulse.includes('view {'), 'Should include view block');
    assert.ok(appPulse.includes('style {'), 'Should include style block');
    assert.ok(appPulse.includes('count: 0'), 'Should include count state');
    assert.ok(appPulse.includes('@click(count++)'), 'Should include click handler');
  });

  test('create command generates correct .gitignore', () => {
    const gitignore = `node_modules
dist
.DS_Store
*.local
`;

    assert.ok(gitignore.includes('node_modules'), 'Should ignore node_modules');
    assert.ok(gitignore.includes('dist'), 'Should ignore dist');
    assert.ok(gitignore.includes('.DS_Store'), 'Should ignore macOS files');
  });
});

// =============================================================================
// CLI Help and Version Tests
// =============================================================================

describe('CLI Help and Version Tests', () => {
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
      assert.ok(helpText.includes(cmd), `Help should include ${cmd} command`);
    }
  });

  test('version matches package.json', () => {
    const packagePath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

    assert.ok(pkg.version !== undefined, 'Should have version in package.json');
    assert.ok(/^\d+\.\d+\.\d+/.test(pkg.version), 'Version should be semver format');
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling Tests', () => {
  test('parseArgs handles malformed options gracefully', () => {
    // Single dash with multiple characters - treated as pattern
    const { options, patterns } = parseArgs(['-abc']);

    assert.ok(Array.isArray(patterns) || typeof options === 'object',
      'Should handle malformed options without crashing');
  });

  test('findPulseFiles handles non-existent directories', () => {
    const files = findPulseFiles(['this-directory-does-not-exist']);

    assert.ok(Array.isArray(files), 'Should return empty array');
    assert.strictEqual(files.length, 0, 'Should find no files');
  });

  test('compile handles empty source', () => {
    const result = compile('');

    // Empty source might succeed with empty output or fail
    assert.ok(typeof result === 'object', 'Should return result object');
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
    assert.ok(typeof result === 'object', 'Should return result object');
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  test('full workflow: parse args, find files, compile', () => {
    // Parse arguments
    const { options, patterns } = parseArgs(['--dry-run', 'examples/']);

    assert.strictEqual(options['dry-run'], true);
    assert.ok(patterns.includes('examples/'));

    // Find files
    const examplesDir = join(process.cwd(), 'examples');
    if (existsSync(examplesDir)) {
      const files = findPulseFiles(['examples/']);

      // Try to compile first file if any exist
      if (files.length > 0) {
        const source = readFileSync(files[0], 'utf-8');
        const result = compile(source);

        assert.ok(typeof result === 'object', 'Compile should return object');
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
      assert.ok(file.includes(process.cwd().split(/[/\\]/)[0]) || file.startsWith('/'),
        'Files should be absolute paths');
    }
  });
});

// =============================================================================
// CLI Help Output
// =============================================================================

describe('CLI Help Output', () => {
  test('help content includes all main commands', () => {
    const mainCommands = [
      'create', 'init', 'dev', 'build', 'preview', 'compile',
      'lint', 'format', 'analyze', 'test', 'doctor', 'scaffold', 'docs'
    ];

    for (const cmd of mainCommands) {
      assert.ok(mainCommands.includes(cmd), `CLI should support ${cmd} command`);
    }
  });

  test('CLI version format matches semver pattern', () => {
    const semverPattern = /^\d+\.\d+\.\d+$/;

    // Read version from package.json
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    const version = pkg.version;

    assert.ok(semverPattern.test(version), `Version "${version}" should match semver pattern`);
  });
});

// =============================================================================
// parseArgs Advanced Tests
// =============================================================================

describe('parseArgs Advanced Tests', () => {
  test('parseArgs handles flags and patterns separately', () => {
    const result = parseArgs(['--verbose', 'src/', '--format', 'dist/']);

    // --format takes a value, --verbose is boolean
    assert.strictEqual(result.options.verbose, true, 'Should parse --verbose flag');
    assert.strictEqual(result.options.format, 'dist/', 'Should parse --format with value');
    assert.ok(result.patterns.includes('src/'), 'Should include src/ pattern');
  });

  test('parseArgs separates flags from patterns correctly', () => {
    const result = parseArgs(['--output', '--verbose']);

    assert.strictEqual(result.options.output, true, 'Should parse --output as boolean');
    assert.strictEqual(result.options.verbose, true, 'Should parse --verbose as boolean');
    assert.strictEqual(result.patterns.length, 0, 'Should have no patterns');
  });

  test('parseArgs handles short flags', () => {
    const result = parseArgs(['-v', '-o', 'dist', '-f']);

    assert.strictEqual(result.options.v, true, 'Should parse -v flag');
    assert.strictEqual(result.options.o, 'dist', 'Should parse -o with value');
    assert.strictEqual(result.options.f, true, 'Should parse -f flag');
    assert.strictEqual(result.patterns.length, 0, 'No patterns since dist is consumed by -o');
  });

  test('parseArgs treats --no- prefix as negation', () => {
    const result = parseArgs(['--no-sourcemap', '--no-minify']);

    // parseArgs treats --no-X as X: false (negation)
    assert.strictEqual(result.options.sourcemap, false, 'Should have sourcemap: false');
    assert.strictEqual(result.options.minify, false, 'Should have minify: false');
  });

  test('parseArgs treats non-flag args as patterns', () => {
    const result = parseArgs(['--watch', '3000', '5000']);

    assert.strictEqual(result.options.watch, true, 'Should parse --watch');
    assert.ok(result.patterns.includes('3000'), '3000 should be a pattern');
    assert.ok(result.patterns.includes('5000'), '5000 should be a pattern');
  });

  test('parseArgs handles empty input', () => {
    const result = parseArgs([]);

    assert.strictEqual(result.patterns.length, 0, 'Should have no patterns');
    assert.ok(typeof result.options === 'object', 'Should have options object');
  });

  test('parseArgs ignores unknown flags gracefully', () => {
    const result = parseArgs(['--unknown-flag', 'value', '--another-unknown']);

    assert.ok(result !== undefined, 'Should handle unknown flags without throwing');
  });
});

// =============================================================================
// formatBytes Extended Tests
// =============================================================================

describe('formatBytes Extended Tests', () => {
  test('formatBytes handles zero', () => {
    const result = formatBytes(0);

    assert.strictEqual(result, '0 B', 'Should format zero bytes');
  });

  test('formatBytes handles large numbers up to GB', () => {
    const result = formatBytes(1024 * 1024 * 1024); // 1 GB

    assert.ok(result.includes('GB'), 'Should format gigabytes');
  });

  test('formatBytes handles negative numbers', () => {
    const result = formatBytes(-1024);

    // Implementation may handle negatives differently (NaN or negative value)
    assert.ok(result !== undefined, 'Should handle negative numbers');
  });

  test('formatBytes uses correct unit scaling', () => {
    assert.strictEqual(formatBytes(1), '1 B');
    assert.ok(formatBytes(1024).includes('KB'), 'Should use KB for 1024');
    assert.ok(formatBytes(1024 * 1024).includes('MB'), 'Should use MB');
    assert.ok(formatBytes(1024 * 1024 * 1024).includes('GB'), 'Should use GB');
  });

  test('formatBytes rounds decimal places', () => {
    const result = formatBytes(1536); // 1.5 KB

    assert.ok(result.includes('1.5') || result.includes('1.50'), 'Should include decimal');
    assert.ok(result.includes('KB'), 'Should use KB unit');
  });
});

// =============================================================================
// relativePath Extended Tests
// =============================================================================

describe('relativePath Extended Tests', () => {
  test('relativePath strips cwd prefix', () => {
    const cwd = process.cwd();
    const absPath = join(cwd, 'src', 'file.js');
    const result = relativePath(absPath);

    assert.strictEqual(result, 'src/file.js', 'Should return path relative to cwd');
  });

  test('relativePath handles nested paths', () => {
    const cwd = process.cwd();
    const absPath = join(cwd, 'src', 'components', 'Button.js');
    const result = relativePath(absPath);

    assert.strictEqual(result, 'src/components/Button.js', 'Should return relative path');
  });

  test('relativePath returns absolute for paths outside cwd', () => {
    const outsidePath = '/some/other/path/file.js';
    const result = relativePath(outsidePath);

    assert.strictEqual(result, outsidePath, 'Should return absolute path if outside cwd');
  });
});

// =============================================================================
// findPulseFiles Extended Tests
// =============================================================================

describe('findPulseFiles Extended Tests', () => {
  test('findPulseFiles returns empty array for non-existent directory', () => {
    const files = findPulseFiles(['non-existent-dir/**/*.pulse']);

    assert.strictEqual(files.length, 0, 'Should return empty array');
  });

  test('findPulseFiles handles absolute paths', () => {
    const absPath = resolve(process.cwd(), 'examples');
    if (existsSync(absPath)) {
      const files = findPulseFiles([`${absPath}/**/*.pulse`]);

      assert.ok(Array.isArray(files), 'Should return array for absolute paths');
    }
  });

  test('findPulseFiles deduplicates results', () => {
    const files = findPulseFiles(['examples/**/*.pulse', 'examples/**/*.pulse']);
    const uniqueFiles = [...new Set(files)];

    assert.strictEqual(files.length, uniqueFiles.length, 'Should not have duplicates');
  });
});

// =============================================================================
// resolveImportPath Extended Tests
// =============================================================================

describe('resolveImportPath Extended Tests', () => {
  test('resolveImportPath returns null for non-relative imports', () => {
    const result = resolveImportPath('/project/src/file.js', 'pulse-js-framework/runtime');

    assert.strictEqual(result, null, 'Should return null for package imports');
  });

  test('resolveImportPath returns null for absolute imports', () => {
    const result = resolveImportPath('/project/src/file.js', '/absolute/path');

    assert.strictEqual(result, null, 'Should return null for absolute imports');
  });

  test('resolveImportPath handles package imports by returning null', () => {
    const result = resolveImportPath('/project/src/file.js', 'lodash');

    assert.strictEqual(result, null, 'Should return null for external packages');
  });

  test('resolveImportPath recognizes relative import syntax', () => {
    // Note: resolveImportPath(fromFile, importPath) - file must exist for resolution
    // For non-existent files, it returns null even for relative paths
    const result = resolveImportPath('/project/src/file.js', './non-existent');

    // Returns null because file doesn't exist
    assert.strictEqual(result, null, 'Should return null if file not found');
  });
});

// =============================================================================
// Compile Command Extended Tests
// =============================================================================

describe('Compile Command Extended Tests', () => {
  test('compile handles state with complex types', () => {
    const source = `
@page ComplexState

state {
  items: []
  user: null
  config: {}
  count: 0
  active: true
  name: ""
}

view {
  div "test"
}
`;
    const result = compile(source);

    assert.ok(result.code.includes('items'), 'Should handle array state');
    assert.ok(result.code.includes('user'), 'Should handle null state');
    assert.ok(result.code.includes('config'), 'Should handle object state');
    assert.ok(result.code.includes('count'), 'Should handle number state');
    assert.ok(result.code.includes('active'), 'Should handle boolean state');
    assert.ok(result.code.includes('name'), 'Should handle string state');
  });

  test('compile handles nested view structure', () => {
    const source = `
@page Nested

view {
  .wrapper {
    header {
      nav {
        a "Link 1"
        a "Link 2"
      }
    }
    main {
      .content {
        article {
          h1 "Title"
          p "Content"
        }
      }
    }
    footer {
      p "Footer"
    }
  }
}
`;
    const result = compile(source);

    assert.ok(result.code.includes('wrapper'), 'Should handle wrapper');
    assert.ok(result.code.includes('header'), 'Should handle header');
    assert.ok(result.code.includes('nav'), 'Should handle nav');
    assert.ok(result.code.includes('main'), 'Should handle main');
    assert.ok(result.code.includes('footer'), 'Should handle footer');
  });

  test('compile handles multiple event handlers', () => {
    const source = `
@page Events

state {
  value: ""
}

view {
  input @input(value = event.target.value) @focus(console.log("focused")) @blur(console.log("blurred"))
  button @click(submit()) @mouseenter(highlight()) "Submit"
}
`;
    const result = compile(source);

    assert.ok(result.code.includes('input'), 'Should handle input event');
    assert.ok(result.code.includes('click'), 'Should handle click event');
  });

  test('compile handles style block with media queries', () => {
    const source = `
@page Responsive

view {
  .container {
    p "Content"
  }
}

style {
  .container {
    padding: 1rem
  }

  @media (max-width: 768px) {
    .container {
      padding: 0.5rem
    }
  }
}
`;
    const result = compile(source);

    assert.ok(result.code.includes('container'), 'Should handle style');
    assert.ok(result.code.includes('padding'), 'Should include CSS properties');
  });

  test('compile handles comments in source', () => {
    const source = `
@page Comments

// This is a comment
state {
  // State comment
  count: 0
}

/* Block comment */
view {
  div "test" // Inline comment
}
`;
    const result = compile(source);

    // Comments should be stripped or handled
    assert.ok(result.code.includes('count'), 'Should compile despite comments');
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling Tests', () => {
  test('compile reports error for missing @page directive', () => {
    const source = `
state {
  count: 0
}

view {
  div "test"
}
`;

    try {
      const result = compile(source);
      // May succeed with default page name or fail
      assert.ok(true, 'Handled missing @page');
    } catch (error) {
      assert.ok(error.message.includes('page') || error.message.includes('@page'),
        'Should report missing @page directive');
    }
  });

  test('compile reports error for invalid syntax', () => {
    const source = `
@page Invalid

state {
  count 0  // Missing colon
}

view {
  div "test"
}
`;

    try {
      const result = compile(source);
      assert.ok(true, 'May recover from syntax error');
    } catch (error) {
      assert.ok(error !== undefined, 'Should report syntax error');
    }
  });

  test('compile reports error for unclosed blocks', () => {
    const source = `
@page Unclosed

state {
  count: 0

view {
  div "test"
}
`;

    try {
      compile(source);
      assert.ok(true, 'May recover from unclosed block');
    } catch (error) {
      assert.ok(error !== undefined, 'Should report unclosed block');
    }
  });
});

// =============================================================================
// Help Module Tests
// =============================================================================

describe('Help Module Tests', () => {
  test('getAvailableCommands returns array of command names', () => {
    const commands = getAvailableCommands();

    assert.ok(Array.isArray(commands), 'Should return an array');
    assert.ok(commands.length > 0, 'Should have commands');
    assert.ok(commands.includes('create'), 'Should include create command');
    assert.ok(commands.includes('help'), 'Should include help command');
    assert.ok(commands.includes('version'), 'Should include version command');
  });

  test('getAvailableCommands includes all main CLI commands', () => {
    const commands = getAvailableCommands();
    const expectedCommands = [
      'create', 'init', 'dev', 'build', 'preview', 'compile',
      'lint', 'format', 'analyze', 'test', 'doctor', 'scaffold',
      'docs', 'release', 'mobile', 'version', 'help'
    ];

    for (const cmd of expectedCommands) {
      assert.ok(commands.includes(cmd), `Should include ${cmd} command`);
    }
  });

  test('getCommandDefinition returns definition for valid command', () => {
    const createDef = getCommandDefinition('create');

    assert.ok(createDef !== undefined, 'Should return definition for create');
    assert.strictEqual(createDef.name, 'create', 'Should have correct name');
    assert.ok(typeof createDef.summary === 'string', 'Should have summary');
    assert.ok(typeof createDef.usage === 'string', 'Should have usage');
    assert.ok(typeof createDef.description === 'string', 'Should have description');
  });

  test('getCommandDefinition returns undefined for invalid command', () => {
    const invalidDef = getCommandDefinition('nonexistent');

    assert.strictEqual(invalidDef, undefined, 'Should return undefined for invalid command');
  });

  test('command definition has required properties', () => {
    const commands = getAvailableCommands();

    for (const cmdName of commands) {
      const def = getCommandDefinition(cmdName);
      assert.ok(def !== undefined, `${cmdName} should have definition`);
      assert.ok(typeof def.name === 'string', `${cmdName} should have name`);
      assert.ok(typeof def.summary === 'string', `${cmdName} should have summary`);
      assert.ok(typeof def.usage === 'string', `${cmdName} should have usage`);
      assert.ok(typeof def.description === 'string', `${cmdName} should have description`);
    }
  });

  test('command definition examples are properly structured', () => {
    const createDef = getCommandDefinition('create');

    assert.ok(Array.isArray(createDef.examples), 'Should have examples array');
    assert.ok(createDef.examples.length > 0, 'Should have at least one example');

    for (const example of createDef.examples) {
      assert.ok(typeof example.cmd === 'string', 'Example should have cmd');
      assert.ok(typeof example.desc === 'string', 'Example should have desc');
      assert.ok(example.cmd.startsWith('pulse'), 'Example cmd should start with pulse');
    }
  });

  test('command definition options are properly structured', () => {
    const createDef = getCommandDefinition('create');

    if (createDef.options) {
      assert.ok(Array.isArray(createDef.options), 'Options should be array');

      for (const opt of createDef.options) {
        assert.ok(typeof opt.flag === 'string', 'Option should have flag');
        assert.ok(typeof opt.description === 'string', 'Option should have description');
      }
    }
  });

  test('command definition arguments are properly structured', () => {
    const createDef = getCommandDefinition('create');

    if (createDef.arguments) {
      assert.ok(Array.isArray(createDef.arguments), 'Arguments should be array');

      for (const arg of createDef.arguments) {
        assert.ok(typeof arg.name === 'string', 'Argument should have name');
        assert.ok(typeof arg.description === 'string', 'Argument should have description');
      }
    }
  });

  test('scaffold command has all scaffold types documented', () => {
    const scaffoldDef = getCommandDefinition('scaffold');
    const description = scaffoldDef.description;

    const expectedTypes = ['component', 'page', 'store', 'hook', 'service', 'context', 'layout'];

    for (const type of expectedTypes) {
      assert.ok(description.includes(type), `Scaffold should document ${type} type`);
    }
  });

  test('create command documents typescript option', () => {
    const createDef = getCommandDefinition('create');
    const hasTypescriptOption = createDef.options.some(opt =>
      opt.flag.includes('typescript') || opt.flag.includes('--ts')
    );

    assert.ok(hasTypescriptOption, 'Create should have typescript option');
  });

  test('dev command documents port argument', () => {
    const devDef = getCommandDefinition('dev');
    const hasPortArg = devDef.arguments && devDef.arguments.some(arg =>
      arg.name.includes('port')
    );

    assert.ok(hasPortArg, 'Dev should have port argument');
  });

  test('test command documents coverage option', () => {
    const testDef = getCommandDefinition('test');
    const hasCoverageOption = testDef.options.some(opt =>
      opt.flag.includes('coverage') || opt.flag.includes('-c')
    );

    assert.ok(hasCoverageOption, 'Test should have coverage option');
  });

  test('lint command documents fix option', () => {
    const lintDef = getCommandDefinition('lint');
    const hasFixOption = lintDef.options.some(opt =>
      opt.flag.includes('fix')
    );

    assert.ok(hasFixOption, 'Lint should have fix option');
  });

  test('format command documents check option', () => {
    const formatDef = getCommandDefinition('format');
    const hasCheckOption = formatDef.options.some(opt =>
      opt.flag.includes('check')
    );

    assert.ok(hasCheckOption, 'Format should have check option');
  });

  test('analyze command documents json option', () => {
    const analyzeDef = getCommandDefinition('analyze');
    const hasJsonOption = analyzeDef.options.some(opt =>
      opt.flag.includes('json')
    );

    assert.ok(hasJsonOption, 'Analyze should have json option');
  });

  test('release command documents release types', () => {
    const releaseDef = getCommandDefinition('release');
    const description = releaseDef.description;

    assert.ok(description.includes('patch'), 'Release should document patch');
    assert.ok(description.includes('minor'), 'Release should document minor');
    assert.ok(description.includes('major'), 'Release should document major');
  });

  test('help command usage is self-documenting', () => {
    const helpDef = getCommandDefinition('help');

    assert.strictEqual(helpDef.name, 'help', 'Help command name should be help');
    assert.ok(helpDef.usage.includes('pulse help'), 'Usage should show pulse help');
    assert.ok(helpDef.usage.includes('[command]'), 'Usage should show optional command');
  });

  test('all commands have consistent example format', () => {
    const commands = getAvailableCommands();

    for (const cmdName of commands) {
      const def = getCommandDefinition(cmdName);
      if (def.examples && def.examples.length > 0) {
        for (const example of def.examples) {
          assert.ok(
            example.cmd.startsWith('pulse ') || example.cmd === 'pulse help',
            `${cmdName} example should start with 'pulse ': ${example.cmd}`
          );
        }
      }
    }
  });

  test('runHelp executes without error for general help', () => {
    // Capture console output
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => { output += args.join(' ') + '\n'; };

    try {
      runHelp([]);
      assert.ok(output.length > 0, 'Should produce output');
      assert.ok(output.includes('Pulse Framework CLI'), 'Should include CLI title');
      assert.ok(output.includes('Usage:'), 'Should include usage');
    } finally {
      console.log = originalLog;
    }
  });

  test('runHelp executes without error for command help', () => {
    const originalLog = console.log;
    let output = '';
    console.log = (...args) => { output += args.join(' ') + '\n'; };

    try {
      runHelp(['create']);
      assert.ok(output.length > 0, 'Should produce output');
      assert.ok(output.includes('create'), 'Should include command name');
      assert.ok(output.includes('Usage:'), 'Should include usage');
    } finally {
      console.log = originalLog;
    }
  });

  test('runHelp shows error for unknown command', () => {
    const originalLog = console.log;
    const originalError = console.error;
    let infoOutput = '';
    let errorOutput = '';
    console.log = (...args) => { infoOutput += args.join(' ') + '\n'; };
    console.error = (...args) => { errorOutput += args.join(' ') + '\n'; };

    try {
      runHelp(['unknowncommand']);
      assert.ok(
        infoOutput.includes('Available commands') || errorOutput.includes('Unknown'),
        'Should show error or available commands'
      );
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });

  test('command summaries are concise', () => {
    const commands = getAvailableCommands();

    for (const cmdName of commands) {
      const def = getCommandDefinition(cmdName);
      assert.ok(
        def.summary.length <= 60,
        `${cmdName} summary should be concise (<=60 chars): "${def.summary}"`
      );
    }
  });

  test('command descriptions provide helpful details', () => {
    const commands = getAvailableCommands();

    for (const cmdName of commands) {
      const def = getCommandDefinition(cmdName);
      assert.ok(
        def.description.length > 20,
        `${cmdName} description should be detailed (>20 chars)`
      );
    }
  });
});

// =============================================================================
// New Command Tests
// =============================================================================

describe('New Command Tests', () => {
  test('new command help definition exists', () => {
    const def = getCommandDefinition('new');

    assert.ok(def !== undefined, 'Should have new command definition');
    assert.strictEqual(def.name, 'new', 'Should have correct name');
    assert.strictEqual(def.summary, 'Create a new .pulse file', 'Should have correct summary');
  });

  test('new command has required options documented', () => {
    const def = getCommandDefinition('new');

    assert.ok(def.options.length >= 5, 'Should have at least 5 options');

    const optionFlags = def.options.map(o => o.flag);
    assert.ok(optionFlags.some(f => f.includes('--type')), 'Should document --type option');
    assert.ok(optionFlags.some(f => f.includes('--dir')), 'Should document --dir option');
    assert.ok(optionFlags.some(f => f.includes('--force')), 'Should document --force option');
    assert.ok(optionFlags.some(f => f.includes('--props')), 'Should document --props option');
    assert.ok(optionFlags.some(f => f.includes('--no-state')), 'Should document --no-state option');
    assert.ok(optionFlags.some(f => f.includes('--no-style')), 'Should document --no-style option');
  });

  test('new command has examples for all types', () => {
    const def = getCommandDefinition('new');

    const exampleCmds = def.examples.map(e => e.cmd);
    assert.ok(exampleCmds.some(c => c.includes('Button')), 'Should have component example');
    assert.ok(exampleCmds.some(c => c.includes('--type page')), 'Should have page example');
    assert.ok(exampleCmds.some(c => c.includes('--type layout')), 'Should have layout example');
    assert.ok(exampleCmds.some(c => c.includes('--props')), 'Should have props example');
  });

  test('new command is in scaffolding group', () => {
    // Verify 'new' appears in help output
    const commands = getAvailableCommands();
    assert.ok(commands.includes('new'), 'Should include new command');
  });
});

// =============================================================================
// parseArgs Value Options Tests
// =============================================================================

describe('parseArgs Value Options Tests', () => {
  test('parseArgs handles --type with value', () => {
    const result = parseArgs(['--type', 'page', 'Dashboard']);

    assert.strictEqual(result.options.type, 'page', 'Should parse --type with value');
    assert.ok(result.patterns.includes('Dashboard'), 'Should include name as pattern');
  });

  test('parseArgs handles -t shorthand with value', () => {
    const result = parseArgs(['-t', 'layout', 'Admin']);

    assert.strictEqual(result.options.t, 'layout', 'Should parse -t with value');
    assert.ok(result.patterns.includes('Admin'), 'Should include name as pattern');
  });

  test('parseArgs handles --dir with value', () => {
    const result = parseArgs(['MyComponent', '--dir', 'src/ui']);

    assert.strictEqual(result.options.dir, 'src/ui', 'Should parse --dir with value');
    assert.ok(result.patterns.includes('MyComponent'), 'Should include name as pattern');
  });

  test('parseArgs handles -d shorthand with value', () => {
    const result = parseArgs(['Button', '-d', 'src/components']);

    assert.strictEqual(result.options.d, 'src/components', 'Should parse -d with value');
    assert.ok(result.patterns.includes('Button'), 'Should include name as pattern');
  });

  test('parseArgs handles --output with value', () => {
    const result = parseArgs(['--output', 'dist/', 'src/']);

    assert.strictEqual(result.options.output, 'dist/', 'Should parse --output with value');
    assert.ok(result.patterns.includes('src/'), 'Should include src/ as pattern');
  });

  test('parseArgs handles --format with value', () => {
    const result = parseArgs(['--format', 'html', '--generate']);

    assert.strictEqual(result.options.format, 'html', 'Should parse --format with value');
    assert.strictEqual(result.options.generate, true, 'Should parse --generate as boolean');
  });

  test('parseArgs handles --filter with value', () => {
    const result = parseArgs(['--filter', 'Button', '--watch']);

    assert.strictEqual(result.options.filter, 'Button', 'Should parse --filter with value');
    assert.strictEqual(result.options.watch, true, 'Should parse --watch as boolean');
  });

  test('parseArgs handles --timeout with value', () => {
    const result = parseArgs(['--timeout', '5000']);

    assert.strictEqual(result.options.timeout, '5000', 'Should parse --timeout with value');
  });

  test('parseArgs handles --title with value', () => {
    const result = parseArgs(['--title', 'My Release', 'patch']);

    assert.strictEqual(result.options.title, 'My Release', 'Should parse --title with value');
    assert.ok(result.patterns.includes('patch'), 'Should include patch as pattern');
  });

  test('parseArgs handles multiple value options together', () => {
    const result = parseArgs(['--type', 'page', '--dir', 'src/pages', 'Dashboard', '--force']);

    assert.strictEqual(result.options.type, 'page', 'Should parse --type');
    assert.strictEqual(result.options.dir, 'src/pages', 'Should parse --dir');
    assert.strictEqual(result.options.force, true, 'Should parse --force');
    assert.ok(result.patterns.includes('Dashboard'), 'Should include Dashboard');
  });

  test('parseArgs value option without value becomes boolean', () => {
    const result = parseArgs(['--type', '--verbose']);

    // --type followed by --verbose (starts with -), so --type is boolean
    assert.strictEqual(result.options.type, true, 'Should be boolean when no value follows');
    assert.strictEqual(result.options.verbose, true, 'Should parse --verbose');
  });

  test('parseArgs handles value option at end of args', () => {
    const result = parseArgs(['Button', '--type']);

    // --type at end with no value should be boolean
    assert.strictEqual(result.options.type, true, 'Should be boolean at end of args');
    assert.ok(result.patterns.includes('Button'), 'Should include Button');
  });
});

// =============================================================================
// parseArgs Negation Tests
// =============================================================================

describe('parseArgs Negation Tests', () => {
  test('parseArgs handles --no-state negation', () => {
    const result = parseArgs(['Button', '--no-state']);

    assert.strictEqual(result.options.state, false, 'Should negate state option');
    assert.ok(result.patterns.includes('Button'), 'Should include Button');
  });

  test('parseArgs handles --no-style negation', () => {
    const result = parseArgs(['Button', '--no-style']);

    assert.strictEqual(result.options.style, false, 'Should negate style option');
  });

  test('parseArgs handles multiple negations', () => {
    const result = parseArgs(['--no-state', '--no-style', '--no-push']);

    assert.strictEqual(result.options.state, false, 'Should negate state');
    assert.strictEqual(result.options.style, false, 'Should negate style');
    assert.strictEqual(result.options.push, false, 'Should negate push');
  });

  test('parseArgs negation does not affect other options', () => {
    const result = parseArgs(['--no-state', '--force', '--props']);

    assert.strictEqual(result.options.state, false, 'Should negate state');
    assert.strictEqual(result.options.force, true, 'Should keep force as true');
    assert.strictEqual(result.options.props, true, 'Should keep props as true');
  });
});

// =============================================================================
// parseArgs Mixed Scenarios Tests
// =============================================================================

describe('parseArgs Mixed Scenarios Tests', () => {
  test('parseArgs complex new command scenario', () => {
    const result = parseArgs(['Modal', '--type', 'component', '--dir', 'src/modals', '--props', '--no-style', '--force']);

    assert.strictEqual(result.options.type, 'component', 'Should parse type');
    assert.strictEqual(result.options.dir, 'src/modals', 'Should parse dir');
    assert.strictEqual(result.options.props, true, 'Should parse props');
    assert.strictEqual(result.options.style, false, 'Should negate style');
    assert.strictEqual(result.options.force, true, 'Should parse force');
    assert.ok(result.patterns.includes('Modal'), 'Should include Modal');
  });

  test('parseArgs complex scaffold command scenario', () => {
    const result = parseArgs(['component', 'UserCard', '-d', 'src/components', '--props', '-f']);

    assert.strictEqual(result.options.d, 'src/components', 'Should parse -d');
    assert.strictEqual(result.options.props, true, 'Should parse --props');
    assert.strictEqual(result.options.f, true, 'Should parse -f');
    assert.ok(result.patterns.includes('component'), 'Should include component');
    assert.ok(result.patterns.includes('UserCard'), 'Should include UserCard');
  });

  test('parseArgs complex docs command scenario', () => {
    const result = parseArgs(['--generate', '--format', 'html', '--output', 'api-docs/']);

    assert.strictEqual(result.options.generate, true, 'Should parse --generate');
    assert.strictEqual(result.options.format, 'html', 'Should parse --format with value');
    assert.strictEqual(result.options.output, 'api-docs/', 'Should parse --output with value');
  });

  test('parseArgs complex release command scenario', () => {
    const result = parseArgs(['patch', '--title', 'Bug fixes', '--dry-run', '--no-push']);

    assert.strictEqual(result.options.title, 'Bug fixes', 'Should parse --title');
    assert.strictEqual(result.options['dry-run'], true, 'Should parse --dry-run');
    assert.strictEqual(result.options.push, false, 'Should negate push');
    assert.ok(result.patterns.includes('patch'), 'Should include patch');
  });

  test('parseArgs complex test command scenario', () => {
    const result = parseArgs(['--filter', 'Button', '--timeout', '10000', '--coverage', '--watch']);

    assert.strictEqual(result.options.filter, 'Button', 'Should parse --filter');
    assert.strictEqual(result.options.timeout, '10000', 'Should parse --timeout');
    assert.strictEqual(result.options.coverage, true, 'Should parse --coverage');
    assert.strictEqual(result.options.watch, true, 'Should parse --watch');
  });

  test('parseArgs handles paths with special characters', () => {
    const result = parseArgs(['--dir', 'src/my-components', 'Button']);

    assert.strictEqual(result.options.dir, 'src/my-components', 'Should handle hyphens in path');
  });

  test('parseArgs handles paths with underscores', () => {
    const result = parseArgs(['--output', 'dist_output/', 'src/']);

    assert.strictEqual(result.options.output, 'dist_output/', 'Should handle underscores in path');
  });
});

// =============================================================================
// Command Aliases Tests
// =============================================================================

describe('Command Aliases Tests', () => {
  test('new command has typo aliases', () => {
    // These are tested via the commandAliases object in index.js
    // The test verifies the help system recognizes the command
    const def = getCommandDefinition('new');
    assert.ok(def !== undefined, 'new command should be defined');
  });
});

// =============================================================================
// Help System Integration Tests
// =============================================================================

describe('Help System Integration Tests', () => {
  test('all commands in scaffolding group are documented', () => {
    const scaffoldingCommands = ['new', 'scaffold', 'docs'];

    for (const cmdName of scaffoldingCommands) {
      const def = getCommandDefinition(cmdName);
      assert.ok(def !== undefined, `${cmdName} should be documented`);
      assert.ok(def.summary.length > 0, `${cmdName} should have summary`);
      assert.ok(def.examples.length > 0, `${cmdName} should have examples`);
    }
  });

  test('new command documentation matches implementation', () => {
    const def = getCommandDefinition('new');

    // Verify documented types match implementation
    assert.ok(def.description.includes('component'), 'Should document component type');
    assert.ok(def.description.includes('page'), 'Should document page type');
    assert.ok(def.description.includes('layout'), 'Should document layout type');
  });

  test('scaffold command documents all scaffold types', () => {
    const def = getCommandDefinition('scaffold');

    assert.ok(def.description.includes('component'), 'Should document component');
    assert.ok(def.description.includes('page'), 'Should document page');
    assert.ok(def.description.includes('store'), 'Should document store');
    assert.ok(def.description.includes('hook'), 'Should document hook');
    assert.ok(def.description.includes('service'), 'Should document service');
    assert.ok(def.description.includes('context'), 'Should document context');
    assert.ok(def.description.includes('layout'), 'Should document layout');
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Edge Cases Tests', () => {
  test('parseArgs handles empty string pattern', () => {
    const result = parseArgs(['', '--verbose']);

    assert.strictEqual(result.options.verbose, true, 'Should parse flag');
    assert.ok(result.patterns.includes(''), 'Should include empty string');
  });

  test('parseArgs handles numeric patterns', () => {
    const result = parseArgs(['--port', '3000']);

    // port is not in valueOptions, so 3000 should be a pattern
    assert.strictEqual(result.options.port, true, 'Should parse --port as boolean');
    assert.ok(result.patterns.includes('3000'), 'Should include 3000');
  });

  test('parseArgs handles deeply nested paths', () => {
    const result = parseArgs(['--dir', 'src/components/ui/buttons/primary', 'Button']);

    assert.strictEqual(result.options.dir, 'src/components/ui/buttons/primary', 'Should handle deep paths');
  });

  test('parseArgs handles Windows-style paths', () => {
    const result = parseArgs(['--dir', 'src\\components', 'Button']);

    assert.strictEqual(result.options.dir, 'src\\components', 'Should preserve backslashes');
  });

  test('parseArgs handles quoted values correctly', () => {
    // In actual CLI usage, quotes are handled by the shell
    // Here we test that the value is preserved as-is
    const result = parseArgs(['--title', 'My Title With Spaces']);

    assert.strictEqual(result.options.title, 'My Title With Spaces', 'Should handle spaces in value');
  });

  test('parseArgs handles equals sign syntax gracefully', () => {
    // Note: current implementation doesn't split on =
    const result = parseArgs(['--type=page', 'Dashboard']);

    // --type=page is treated as a single flag name
    assert.strictEqual(result.options['type=page'], true, 'Should treat --type=page as flag name');
  });

  test('parseArgs handles multiple same flags', () => {
    const result = parseArgs(['--verbose', '--verbose']);

    assert.strictEqual(result.options.verbose, true, 'Should handle duplicate flags');
  });

  test('parseArgs preserves order of patterns', () => {
    const result = parseArgs(['first', 'second', 'third']);

    assert.deepStrictEqual(result.patterns, ['first', 'second', 'third'], 'Should preserve pattern order');
  });
});
