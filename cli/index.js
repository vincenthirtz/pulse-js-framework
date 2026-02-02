#!/usr/bin/env node

/**
 * Pulse CLI - Command line interface
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'fs';
import { log } from './logger.js';

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
  compile: compileFile,
  mobile: runMobile,
  lint: runLint,
  format: runFormat,
  analyze: runAnalyze,
  release: runReleaseCmd,
  'docs-test': runDocsTestCmd
};

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

Lint Options:
  --fix            Auto-fix fixable issues

Format Options:
  --check          Check formatting without writing
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
  pulse lint src/
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
 * Compile a single .pulse file
 */
async function compileFile(args) {
  const inputFile = args[0];

  if (!inputFile) {
    log.error('Please provide a file to compile.');
    log.info('Usage: pulse compile <file.pulse>');
    process.exit(1);
  }

  if (!existsSync(inputFile)) {
    log.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const { compile } = await import('../compiler/index.js');

  const source = readFileSync(inputFile, 'utf-8');
  const result = compile(source);

  if (result.success) {
    const outputFile = inputFile.replace(/\.pulse$/, '.js');
    writeFileSync(outputFile, result.code);
    log.info(`Compiled: ${inputFile} -> ${outputFile}`);
  } else {
    log.error('Compilation failed:');
    for (const error of result.errors) {
      log.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  log.error('Error:', error.message);
  process.exit(1);
});
