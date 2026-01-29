#!/usr/bin/env node

/**
 * Pulse CLI - Command line interface
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERSION = '1.0.0';

// Command handlers
const commands = {
  help: showHelp,
  version: showVersion,
  create: createProject,
  dev: runDev,
  build: runBuild,
  preview: runPreview,
  compile: compileFile
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
    console.error(`Unknown command: ${command}`);
    console.log('Run "pulse help" for usage information.');
    process.exit(1);
  }
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Pulse Framework CLI v${VERSION}

Usage: pulse <command> [options]

Commands:
  create <name>    Create a new Pulse project
  dev [port]       Start development server (default: 3000)
  build            Build for production (minified)
  preview [port]   Preview production build (default: 4173)
  compile <file>   Compile a .pulse file to JavaScript
  version          Show version number
  help             Show this help message

Examples:
  pulse create my-app
  pulse dev
  pulse dev 8080
  pulse build
  pulse preview
  pulse preview 5000
  pulse compile src/App.pulse

Documentation: https://github.com/vincenthirtz/pulse-framework
  `);
}

/**
 * Show version
 */
function showVersion() {
  console.log(`Pulse Framework v${VERSION}`);
}

/**
 * Create a new project
 */
async function createProject(args) {
  const projectName = args[0];

  if (!projectName) {
    console.error('Please provide a project name.');
    console.log('Usage: pulse create <project-name>');
    process.exit(1);
  }

  const projectPath = resolve(process.cwd(), projectName);

  if (existsSync(projectPath)) {
    console.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`Creating new Pulse project: ${projectName}`);

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

  console.log(`
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
  console.log('Starting Pulse development server...');

  // Use dynamic import for the dev server module
  const { startDevServer } = await import('./dev.js');
  await startDevServer(args);
}

/**
 * Build for production
 */
async function runBuild(args) {
  console.log('Building Pulse project for production...');

  const { buildProject } = await import('./build.js');
  await buildProject(args);
}

/**
 * Preview production build
 */
async function runPreview(args) {
  console.log('Starting Pulse preview server...');

  const { previewBuild } = await import('./build.js');
  await previewBuild(args);
}

/**
 * Compile a single .pulse file
 */
async function compileFile(args) {
  const inputFile = args[0];

  if (!inputFile) {
    console.error('Please provide a file to compile.');
    console.log('Usage: pulse compile <file.pulse>');
    process.exit(1);
  }

  if (!existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const { compile } = await import('../compiler/index.js');

  const source = readFileSync(inputFile, 'utf-8');
  const result = compile(source);

  if (result.success) {
    const outputFile = inputFile.replace(/\.pulse$/, '.js');
    writeFileSync(outputFile, result.code);
    console.log(`Compiled: ${inputFile} -> ${outputFile}`);
  } else {
    console.error('Compilation failed:');
    for (const error of result.errors) {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

// Run main
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
