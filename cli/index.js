#!/usr/bin/env node

/**
 * Pulse CLI - Command line interface
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve, relative } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, watch } from 'fs';
import { log } from './logger.js';
import { findPulseFiles, parseArgs } from './utils/file-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version - read dynamically from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

// Command handlers
const commands = {
  help: showHelp,
  version: showVersion,
  create: createProject,
  dev: runDev,
  build: runBuild,
  preview: runPreview,
  compile: compileFiles,
  mobile: runMobile,
  lint: runLint,
  format: runFormat,
  analyze: runAnalyze,
  release: runReleaseCmd,
  'docs-test': runDocsTestCmd
};

// Command aliases for common typos
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

/**
 * Calculate Levenshtein distance between two strings
 * Used for "Did you mean...?" suggestions
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

/**
 * Suggest similar commands based on input
 */
function suggestCommand(input) {
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

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (command in commands) {
    await commands[command](args.slice(1));
  } else {
    log.error(`Unknown command: ${command}`);

    // Try to suggest a similar command
    const suggestion = suggestCommand(command);
    if (suggestion) {
      log.info(`Did you mean: pulse ${suggestion}?`);
    }

    log.info('Run "pulse help" for usage information.');
    process.exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  log.info(`
Pulse Framework CLI v${VERSION}

Usage: pulse <command> [options]

Commands:
  create <name>    Create a new Pulse project
  dev [port]       Start development server (default: 3000)
  build            Build for production (minified)
  preview [port]   Preview production build (default: 4173)
  compile <file>   Compile a .pulse file to JavaScript
  mobile <cmd>     Mobile app commands (init, build, run)
  lint [files]     Validate .pulse files for errors and style
  format [files]   Format .pulse files consistently
  analyze          Analyze bundle size and dependencies
  release <type>   Create a new release (patch, minor, major)
  docs-test        Test documentation (syntax, imports, HTTP)
  version          Show version number
  help             Show this help message

Compile Options:
  --watch, -w      Watch files and recompile on changes
  --dry-run        Show what would be compiled without writing
  --output, -o     Output directory (default: same as input)

Lint Options:
  --fix            Auto-fix fixable issues
  --watch, -w      Watch files and re-lint on changes
  --dry-run        Show fixes without applying (use with --fix)

Format Options:
  --check          Check formatting without writing (dry-run)
  --watch, -w      Watch files and re-format on changes
  --write          Write formatted output (default)

Analyze Options:
  --json           Output analysis as JSON
  --verbose        Show detailed metrics

Release Options:
  --dry-run         Show what would be done without making changes
  --no-push         Create commit and tag but don't push
  --title <text>    Release title for changelog
  --skip-prompt     Use empty changelog (for automation)
  --skip-docs-test  Skip documentation tests before release
  --from-commits    Auto-extract changelog from git commits since last tag

Docs-test Options:
  --verbose, -v    Show detailed output
  --no-http        Skip HTTP server tests

Examples:
  pulse create my-app
  pulse dev
  pulse dev 8080
  pulse build
  pulse preview
  pulse mobile init
  pulse mobile build android
  pulse mobile run ios
  pulse compile src/App.pulse
  pulse compile src/ --watch
  pulse compile "**/*.pulse" --dry-run
  pulse lint src/
  pulse lint src/ --fix --dry-run
  pulse lint "**/*.pulse" --fix
  pulse format --check
  pulse format src/App.pulse
  pulse analyze
  pulse analyze --json
  pulse release patch
  pulse release minor --title "New Features"
  pulse release major --dry-run
  pulse release patch --from-commits
  pulse docs-test
  pulse docs-test --verbose

Documentation: https://github.com/vincenthirtz/pulse-js-framework
  `);
}

/**
 * Show version
 */
function showVersion() {
  log.info(`Pulse Framework v${VERSION}`);
}

/**
 * Create a new project
 */
async function createProject(args) {
  const projectName = args[0];

  if (!projectName) {
    log.error('Please provide a project name.');
    log.info('Usage: pulse create <project-name>');
    process.exit(1);
  }

  const projectPath = resolve(process.cwd(), projectName);

  if (existsSync(projectPath)) {
    log.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  log.info(`Creating new Pulse project: ${projectName}`);

  // Create project structure
  mkdirSync(projectPath);
  mkdirSync(join(projectPath, 'src'));
  mkdirSync(join(projectPath, 'public'));

  // Create package.json
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

  writeFileSync(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create vite.config.js
  const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;

  writeFileSync(join(projectPath, 'vite.config.js'), viteConfig);

  // Create index.html
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

  writeFileSync(join(projectPath, 'index.html'), indexHtml);

  // Create main.js
  const mainJs = `import App from './App.pulse';

App.mount('#app');
`;

  writeFileSync(join(projectPath, 'src', 'main.js'), mainJs);

  // Create App.pulse
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

  .title {
    color: #646cff
    font-size: 2.5em
    margin-bottom: 30px
  }

  .counter {
    background: #f5f5f5
    padding: 30px
    border-radius: 12px
    margin-bottom: 20px

    p {
      font-size: 1.5em
      margin-bottom: 20px
    }
  }

  .buttons {
    display: flex
    gap: 10px
    justify-content: center

    button {
      font-size: 1.2em
      padding: 10px 24px
      border: none
      border-radius: 8px
      background: #646cff
      color: white
      cursor: pointer
      transition: background 0.2s
    }

    button:hover {
      background: #535bf2
    }
  }

  .info {
    color: #888
    font-size: 0.9em
  }
}
`;

  writeFileSync(join(projectPath, 'src', 'App.pulse'), appPulse);

  // Create .gitignore
  const gitignore = `node_modules
dist
.DS_Store
*.local
`;

  writeFileSync(join(projectPath, '.gitignore'), gitignore);

  log.info(`
Project created successfully!

Next steps:
  cd ${projectName}
  npm install
  npm run dev

Happy coding with Pulse!
  `);
}

/**
 * Run development server
 */
async function runDev(args) {
  log.info('Starting Pulse development server...');

  // Use dynamic import for the dev server module
  const { startDevServer } = await import('./dev.js');
  await startDevServer(args);
}

/**
 * Build for production
 */
async function runBuild(args) {
  log.info('Building Pulse project for production...');

  const { buildProject } = await import('./build.js');
  await buildProject(args);
}

/**
 * Preview production build
 */
async function runPreview(args) {
  log.info('Starting Pulse preview server...');

  const { previewBuild } = await import('./build.js');
  await previewBuild(args);
}

/**
 * Run mobile commands
 */
async function runMobile(args) {
  const { handleMobileCommand } = await import('./mobile.js');
  await handleMobileCommand(args);
}

/**
 * Run lint command
 */
async function runLint(args) {
  const { runLint } = await import('./lint.js');
  await runLint(args);
}

/**
 * Run format command
 */
async function runFormat(args) {
  const { runFormat } = await import('./format.js');
  await runFormat(args);
}

/**
 * Run analyze command
 */
async function runAnalyze(args) {
  const { runAnalyze } = await import('./analyze.js');
  await runAnalyze(args);
}

/**
 * Run release command
 */
async function runReleaseCmd(args) {
  const { runRelease } = await import('./release.js');
  await runRelease(args);
}

/**
 * Run documentation tests
 */
async function runDocsTestCmd(args) {
  const { runDocsTestCli } = await import('./docs-test.js');
  await runDocsTestCli(args);
}

/**
 * Compile .pulse files to JavaScript
 * Supports multiple files, watch mode, and dry-run
 */
async function compileFiles(args) {
  const { options, patterns } = parseArgs(args);
  const watchMode = options.watch || options.w || false;
  const dryRun = options['dry-run'] || false;
  const outputDir = options.output || options.o || null;

  // Find all .pulse files matching patterns
  const files = findPulseFiles(patterns);

  if (files.length === 0) {
    log.error('No .pulse files found.');
    log.info('Usage: pulse compile <file.pulse> [options]');
    log.info('       pulse compile src/ --watch');
    process.exit(1);
  }

  const { compile } = await import('../compiler/index.js');
  const cwd = process.cwd();

  /**
   * Compile a single file and return result
   */
  function compileOneFile(inputFile) {
    const relPath = relative(cwd, inputFile);
    const source = readFileSync(inputFile, 'utf-8');
    const result = compile(source);

    // Determine output path
    let outputFile;
    if (outputDir) {
      const baseName = inputFile.replace(/\.pulse$/, '.js').split(/[/\\]/).pop();
      outputFile = join(outputDir, baseName);
    } else {
      outputFile = inputFile.replace(/\.pulse$/, '.js');
    }
    const relOutput = relative(cwd, outputFile);

    return { inputFile, outputFile, relPath, relOutput, result, source };
  }

  /**
   * Process compilation results
   */
  function processResults(compilations) {
    let successCount = 0;
    let errorCount = 0;

    for (const { relPath, relOutput, result } of compilations) {
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        log.error(`\n${relPath}:`);
        for (const error of result.errors) {
          const loc = error.line ? `:${error.line}:${error.column || 1}` : '';
          log.error(`  ${relPath}${loc} ${error.message}`);
        }
      }
    }

    return { successCount, errorCount };
  }

  /**
   * Run compilation on all files
   */
  async function runCompilation() {
    const startTime = Date.now();
    const compilations = files.map(compileOneFile);
    const { successCount, errorCount } = processResults(compilations);

    if (dryRun) {
      // Dry run - show what would be done
      log.info('\n[Dry Run] Would compile:');
      for (const { relPath, relOutput, result } of compilations) {
        if (result.success) {
          log.info(`  ${relPath} -> ${relOutput}`);
        }
      }
      log.info(`\n${successCount} file(s) would be compiled, ${errorCount} error(s)`);
    } else {
      // Actually write files
      let writtenCount = 0;
      for (const { outputFile, relPath, relOutput, result } of compilations) {
        if (result.success) {
          // Ensure output directory exists
          const outDir = dirname(outputFile);
          if (!existsSync(outDir)) {
            mkdirSync(outDir, { recursive: true });
          }
          writeFileSync(outputFile, result.code);
          log.info(`Compiled: ${relPath} -> ${relOutput}`);
          writtenCount++;
        }
      }

      const duration = Date.now() - startTime;
      if (files.length > 1) {
        log.info(`\n${writtenCount} file(s) compiled in ${duration}ms`);
        if (errorCount > 0) {
          log.error(`${errorCount} file(s) failed`);
        }
      }
    }

    return errorCount === 0;
  }

  // Initial compilation
  const success = await runCompilation();

  if (!watchMode) {
    if (!success) {
      process.exit(1);
    }
    return;
  }

  // Watch mode
  log.info('\nWatching for changes... (Ctrl+C to stop)\n');

  // Collect directories to watch
  const dirsToWatch = new Set();
  for (const file of files) {
    dirsToWatch.add(dirname(file));
  }

  // Debounce mechanism
  let debounceTimeout = null;
  const changedFiles = new Set();

  function handleChange(eventType, filename) {
    if (!filename || !filename.endsWith('.pulse')) return;

    // Find the full path of the changed file
    for (const dir of dirsToWatch) {
      const fullPath = join(dir, filename);
      if (files.includes(fullPath)) {
        changedFiles.add(fullPath);
        break;
      }
    }

    // Debounce: wait 100ms before processing
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      if (changedFiles.size > 0) {
        log.info(`\nFile changed: ${[...changedFiles].map(f => relative(cwd, f)).join(', ')}`);
        const filesToCompile = [...changedFiles];
        changedFiles.clear();

        // Recompile changed files
        for (const file of filesToCompile) {
          const { relPath, relOutput, outputFile, result } = compileOneFile(file);
          if (result.success) {
            if (!dryRun) {
              writeFileSync(outputFile, result.code);
            }
            log.info(`${dryRun ? '[Dry Run] Would compile' : 'Compiled'}: ${relPath} -> ${relOutput}`);
          } else {
            log.error(`\n${relPath}:`);
            for (const error of result.errors) {
              const loc = error.line ? `:${error.line}:${error.column || 1}` : '';
              log.error(`  ${relPath}${loc} ${error.message}`);
            }
          }
        }
      }
    }, 100);
  }

  // Start watching directories
  const watchers = [];
  for (const dir of dirsToWatch) {
    try {
      const watcher = watch(dir, { recursive: false }, handleChange);
      watchers.push(watcher);
    } catch (e) {
      log.warn(`Could not watch directory: ${dir}`);
    }
  }

  // Keep process running
  process.on('SIGINT', () => {
    log.info('\nStopping watch mode...');
    for (const watcher of watchers) {
      watcher.close();
    }
    process.exit(0);
  });
}

// Run main
main().catch(error => {
  log.error('Error:', error.message);
  process.exit(1);
});
