#!/usr/bin/env node

/**
 * Pulse CLI - Command line interface
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve, relative } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, watch, cpSync, statSync } from 'fs';
import { log } from './logger.js';
import { findPulseFiles, parseArgs } from './utils/file-utils.js';
import { runHelp } from './help.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version - read dynamically from package.json
let VERSION = '0.0.0';
try {
  const pkgContent = readFileSync(join(__dirname, '..', 'package.json'), 'utf-8');
  const pkg = JSON.parse(pkgContent);
  VERSION = pkg.version || VERSION;
} catch (err) {
  log.warn(`Could not read package.json: ${err.message}`);
}

// Available example templates
const TEMPLATES = {
  ecommerce: { name: 'E-Commerce', description: 'Shopping cart with products, checkout, and cart management' },
  todo: { name: 'Todo App', description: 'Classic todo list with filtering and local storage' },
  blog: { name: 'Blog', description: 'Blogging platform with posts, sidebar, and navigation' },
  chat: { name: 'Chat', description: 'Real-time chat with messages, users, and emoji picker' },
  dashboard: { name: 'Dashboard', description: 'Analytics dashboard with data visualization' }
};

// Command handlers
const commands = {
  help: showHelp,
  version: showVersion,
  create: createProject,
  init: initProject,
  new: newPulseFile,
  dev: runDev,
  build: runBuild,
  preview: runPreview,
  compile: compileFiles,
  mobile: runMobile,
  lint: runLint,
  format: runFormat,
  analyze: runAnalyze,
  test: runTest,
  doctor: runDoctorCmd,
  scaffold: runScaffoldCmd,
  docs: runDocsCmd,
  release: runReleaseCmd,
  'docs-test': runDocsTestCmd,
  ssg: runSSGCmd
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
  'realease': 'release',
  'tset': 'test',
  'testt': 'test',
  'doctr': 'doctor',
  'docter': 'doctor',
  'scafold': 'scaffold',
  'scaffod': 'scaffold',
  'scafflod': 'scaffold',
  'doc': 'docs',
  'dcos': 'docs',
  'nwe': 'new',
  'enw': 'new'
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
  let command = args[0] || 'help';

  // Handle global --help and -h flags
  if (command === '--help' || command === '-h') {
    command = 'help';
  }

  // Handle --version and -v flags
  if (command === '--version' || command === '-v') {
    command = 'version';
  }

  // Handle command-specific help: pulse <cmd> --help or pulse <cmd> -h
  const cmdArgs = args.slice(1);
  if (cmdArgs.includes('--help') || cmdArgs.includes('-h')) {
    // Show help for the specific command
    await commands.help([command]);
    return;
  }

  if (command in commands) {
    await commands[command](cmdArgs);
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
 * Supports: pulse help, pulse help <command>
 */
function showHelp(args = []) {
  runHelp(args);
}

/**
 * Show version
 */
function showVersion() {
  log.info(`Pulse Framework v${VERSION}`);
}

/**
 * Copy example template to project directory
 * Transforms imports from /runtime/index.js to pulse-js-framework/runtime
 * @param {string} templateName - Name of the template (ecommerce, todo, blog, chat, dashboard)
 * @param {string} projectPath - Destination project path
 * @param {string} projectName - Name of the project
 */
function copyExampleTemplate(templateName, projectPath, projectName) {
  const examplesDir = join(__dirname, '..', 'examples');
  const templateDir = join(examplesDir, templateName);

  if (!existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" not found at ${templateDir}`);
  }

  /**
   * Recursively copy directory, transforming JS files
   */
  function copyDir(src, dest) {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    const entries = readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      // Skip node_modules and dist directories
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        // Read file content
        let content = readFileSync(srcPath, 'utf-8');

        // Transform imports in JS files
        if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
          // Transform /runtime/index.js imports to pulse-js-framework/runtime
          content = content.replace(
            /from\s+['"]\/runtime\/index\.js['"]/g,
            "from 'pulse-js-framework/runtime'"
          );
          content = content.replace(
            /from\s+['"]\/runtime['"]/g,
            "from 'pulse-js-framework/runtime'"
          );
          // Transform other runtime submodule imports
          content = content.replace(
            /from\s+['"]\/runtime\/([^'"]+)['"]/g,
            "from 'pulse-js-framework/runtime/$1'"
          );
        }

        writeFileSync(destPath, content);
      }
    }
  }

  // Copy src directory
  const srcDir = join(templateDir, 'src');
  if (existsSync(srcDir)) {
    copyDir(srcDir, join(projectPath, 'src'));
  }

  // Copy index.html if exists
  const indexHtml = join(templateDir, 'index.html');
  if (existsSync(indexHtml)) {
    let content = readFileSync(indexHtml, 'utf-8');
    // Update title to project name
    content = content.replace(/<title>[^<]*<\/title>/, `<title>${projectName}</title>`);
    writeFileSync(join(projectPath, 'index.html'), content);
  }

  return true;
}

/**
 * Create a new project
 */
async function createProject(args) {
  const { options, patterns } = parseArgs(args);
  const projectName = patterns[0];

  if (!projectName) {
    log.error('Please provide a project name.');
    log.info('Usage: pulse create <project-name> [options]');
    log.info('');
    log.info('Options:');
    log.info('  --typescript, --ts    Create TypeScript project');
    log.info('  --minimal             Create minimal project');
    log.info('');
    log.info('Templates (use existing example apps):');
    for (const [key, info] of Object.entries(TEMPLATES)) {
      log.info(`  --${key.padEnd(12)} ${info.description}`);
    }
    process.exit(1);
  }

  const projectPath = resolve(process.cwd(), projectName);

  if (existsSync(projectPath)) {
    log.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  const useTypescript = options.typescript || options.ts || false;
  const minimal = options.minimal || false;

  // Check for template options
  let selectedTemplate = null;
  for (const templateName of Object.keys(TEMPLATES)) {
    if (options[templateName]) {
      selectedTemplate = templateName;
      break;
    }
  }

  // If a template is selected, use the template-based creation
  if (selectedTemplate) {
    const templateInfo = TEMPLATES[selectedTemplate];
    log.info(`Creating new Pulse project: ${projectName} (${templateInfo.name} template)`);

    // Create project directory
    mkdirSync(projectPath);
    mkdirSync(join(projectPath, 'public'));

    // Copy template files
    try {
      copyExampleTemplate(selectedTemplate, projectPath, projectName);
      log.info(`  ✓ Copied ${templateInfo.name} template files`);
    } catch (err) {
      log.error(`Failed to copy template: ${err.message}`);
      process.exit(1);
    }

    // Create package.json for template project
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'pulse dev',
        build: 'pulse build',
        preview: 'vite preview',
        test: 'pulse test',
        lint: 'pulse lint'
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

Template: ${templateInfo.name}
  ${templateInfo.description}

Happy coding with Pulse!
    `);
    return;
  }

  // Standard project creation (no template)
  log.info(`Creating new Pulse project: ${projectName}${useTypescript ? ' (TypeScript)' : ''}`);

  // Create project structure
  mkdirSync(projectPath);
  mkdirSync(join(projectPath, 'src'));
  mkdirSync(join(projectPath, 'public'));

  // TypeScript-specific directories
  if (useTypescript && !minimal) {
    mkdirSync(join(projectPath, 'src', 'types'));
  }

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'pulse dev',
      build: 'pulse build',
      preview: 'vite preview',
      test: 'pulse test',
      lint: 'pulse lint',
      ...(useTypescript ? { typecheck: 'tsc --noEmit' } : {})
    },
    dependencies: {
      'pulse-js-framework': '^1.0.0'
    },
    devDependencies: {
      vite: '^5.0.0',
      ...(useTypescript ? {
        'typescript': '^5.3.0',
        '@types/node': '^20.0.0'
      } : {})
    }
  };

  writeFileSync(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create vite.config
  const viteConfigExt = useTypescript ? 'ts' : 'js';
  const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;

  writeFileSync(join(projectPath, `vite.config.${viteConfigExt}`), viteConfig);

  // Create TypeScript config if needed
  if (useTypescript) {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        module: 'ESNext',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        types: ['node']
      },
      include: ['src/**/*', 'vite.config.ts'],
      exclude: ['node_modules', 'dist']
    };

    writeFileSync(
      join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2)
    );

    // Create types file
    if (!minimal) {
      const typesContent = `/**
 * Type declarations for ${projectName}
 */

// Pulse framework module declarations
declare module '*.pulse' {
  const component: {
    mount(selector: string): void;
  };
  export default component;
}

// Add your custom types here
export interface AppState {
  count: number;
  name: string;
}
`;
      writeFileSync(join(projectPath, 'src', 'types', 'index.d.ts'), typesContent);
    }
  }

  // Create index.html
  const mainExt = useTypescript ? 'ts' : 'js';
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.${mainExt}"></script>
</body>
</html>
`;

  writeFileSync(join(projectPath, 'index.html'), indexHtml);

  // Create main file
  const mainContent = useTypescript
    ? `import App from './App.pulse';

// Type-safe app mounting
App.mount('#app');

// Enable HMR in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
`
    : `import App from './App.pulse';

App.mount('#app');
`;

  writeFileSync(join(projectPath, 'src', `main.${mainExt}`), mainContent);

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
${useTypescript ? '*.tsbuildinfo\n' : ''}`;

  writeFileSync(join(projectPath, '.gitignore'), gitignore);

  log.info(`
Project created successfully!

Next steps:
  cd ${projectName}
  npm install
  npm run dev
${useTypescript ? '\nTypeScript enabled. Run "npm run typecheck" to check types.\n' : ''}
Happy coding with Pulse!
  `);
}

/**
 * Initialize project in current directory
 */
async function initProject(args) {
  const { options } = parseArgs(args);
  const cwd = process.cwd();
  const projectName = cwd.split(/[\\/]/).pop();

  const useTypescript = options.typescript || options.ts || false;

  // Check if directory is empty or has only hidden files
  const entries = readdirSync(cwd).filter(e => !e.startsWith('.'));
  if (entries.length > 0 && !options.force) {
    log.warn('Directory is not empty. Use --force to initialize anyway.');
    log.info('Existing files: ' + entries.slice(0, 5).join(', ') + (entries.length > 5 ? '...' : ''));
    return;
  }

  log.info(`Initializing Pulse project in current directory${useTypescript ? ' (TypeScript)' : ''}...`);

  // Create src directory if it doesn't exist
  if (!existsSync(join(cwd, 'src'))) {
    mkdirSync(join(cwd, 'src'));
  }

  // Create public directory if it doesn't exist
  if (!existsSync(join(cwd, 'public'))) {
    mkdirSync(join(cwd, 'public'));
  }

  // Check for existing package.json
  const pkgPath = join(cwd, 'package.json');
  let pkg = {};

  if (existsSync(pkgPath)) {
    try {
      const pkgContent = readFileSync(pkgPath, 'utf-8');
      if (!pkgContent.trim()) {
        log.warn('Existing package.json is empty, creating new one.');
      } else {
        pkg = JSON.parse(pkgContent);
        log.info('Found existing package.json, merging...');
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        log.warn(`Invalid JSON in package.json: ${e.message}. Creating new one.`);
      } else {
        log.warn(`Could not read package.json: ${e.message}. Creating new one.`);
      }
    }
  }

  // Merge with Pulse requirements
  pkg = {
    ...pkg,
    name: pkg.name || projectName,
    version: pkg.version || '0.1.0',
    type: 'module',
    scripts: {
      ...(pkg.scripts || {}),
      dev: 'pulse dev',
      build: 'pulse build',
      preview: 'vite preview',
      test: 'pulse test',
      lint: 'pulse lint',
      ...(useTypescript ? { typecheck: 'tsc --noEmit' } : {})
    },
    dependencies: {
      ...(pkg.dependencies || {}),
      'pulse-js-framework': '^1.0.0'
    },
    devDependencies: {
      ...(pkg.devDependencies || {}),
      vite: '^5.0.0',
      ...(useTypescript ? {
        'typescript': '^5.3.0',
        '@types/node': '^20.0.0'
      } : {})
    }
  };

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  log.success('Updated package.json');

  // Create vite.config if it doesn't exist
  const viteConfigExt = useTypescript ? 'ts' : 'js';
  const viteConfigPath = join(cwd, `vite.config.${viteConfigExt}`);

  if (!existsSync(viteConfigPath) && !existsSync(join(cwd, 'vite.config.js')) && !existsSync(join(cwd, 'vite.config.ts'))) {
    const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;
    writeFileSync(viteConfigPath, viteConfig);
    log.success(`Created vite.config.${viteConfigExt}`);
  }

  // Create tsconfig if TypeScript
  if (useTypescript && !existsSync(join(cwd, 'tsconfig.json'))) {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        module: 'ESNext',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src/**/*', 'vite.config.ts'],
      exclude: ['node_modules', 'dist']
    };

    writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
    log.success('Created tsconfig.json');
  }

  // Create index.html if it doesn't exist
  const indexHtmlPath = join(cwd, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    const mainExt = useTypescript ? 'ts' : 'js';
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.${mainExt}"></script>
</body>
</html>
`;
    writeFileSync(indexHtmlPath, indexHtml);
    log.success('Created index.html');
  }

  // Create main entry file if it doesn't exist
  const mainExt = useTypescript ? 'ts' : 'js';
  const mainPath = join(cwd, 'src', `main.${mainExt}`);
  if (!existsSync(mainPath)) {
    const mainContent = useTypescript
      ? `import App from './App.pulse';

// Type-safe app mounting
App.mount('#app');

// Enable HMR in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
`
      : `import App from './App.pulse';

App.mount('#app');
`;
    writeFileSync(mainPath, mainContent);
    log.success(`Created src/main.${mainExt}`);
  }

  // Create App.pulse if it doesn't exist
  const appPulsePath = join(cwd, 'src', 'App.pulse');
  if (!existsSync(appPulsePath)) {
    const appPulse = `@page App

// Welcome to Pulse Framework!
// Documentation: https://pulse-js.fr
//
// Quick links:
// - Getting Started: https://pulse-js.fr/getting-started
// - Reactivity (pulse, effect, computed): https://pulse-js.fr/reactivity
// - DOM Creation (el, mount, list): https://pulse-js.fr/dom
// - Router: https://pulse-js.fr/router
// - Store: https://pulse-js.fr/store
// - Forms: https://pulse-js.fr/forms
// - CLI Commands: https://pulse-js.fr/cli

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

    .docs {
      h2 "Resources"
      ul {
        li {
          a[href=https://pulse-js.fr/getting-started] "Getting Started"
        }
        li {
          a[href=https://pulse-js.fr/reactivity] "Reactivity System"
        }
        li {
          a[href=https://pulse-js.fr/cli] "CLI Commands"
        }
        li {
          a[href=https://github.com/vincenthirtz/pulse-js-framework] "GitHub Repository"
        }
      }
    }
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
    margin-bottom: 30px
  }

  .docs {
    text-align: left
    background: #fafafa
    padding: 20px 30px
    border-radius: 12px

    h2 {
      color: #333
      font-size: 1.2em
      margin-bottom: 15px
    }

    ul {
      list-style: none
      padding: 0
      margin: 0
    }

    li {
      margin-bottom: 10px
    }

    a {
      color: #646cff
      text-decoration: none
      font-size: 0.95em
    }

    a:hover {
      text-decoration: underline
    }
  }
}
`;
    writeFileSync(appPulsePath, appPulse);
    log.success('Created src/App.pulse');
  }

  // Create .gitignore if it doesn't exist
  const gitignorePath = join(cwd, '.gitignore');
  if (!existsSync(gitignorePath)) {
    const gitignore = `node_modules
dist
.DS_Store
*.local
${useTypescript ? '*.tsbuildinfo\n' : ''}`;
    writeFileSync(gitignorePath, gitignore);
    log.success('Created .gitignore');
  }

  log.info(`
Initialization complete!

Next steps:
  npm install
  npm run dev

Documentation: https://pulse-js.fr
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
 * Run static site generation
 */
async function runSSGCmd(args) {
  log.info('Running static site generation...');

  const { runSSG } = await import('./ssg.js');
  await runSSG(args);
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
 * Run test command
 */
async function runTest(args) {
  const { runTestCommand } = await import('./test.js');
  await runTestCommand(args);
}

/**
 * Run doctor command
 */
async function runDoctorCmd(args) {
  const { runDoctor } = await import('./doctor.js');
  await runDoctor(args);
}

/**
 * Run scaffold command
 */
async function runScaffoldCmd(args) {
  const { runScaffold } = await import('./scaffold.js');
  await runScaffold(args);
}

/**
 * Create a new .pulse file
 * Usage: pulse new <name> [options]
 * Options:
 *   --type, -t <type>  Type: component, page, layout (default: component)
 *   --dir, -d <path>   Output directory (default: src/components or based on type)
 *   --force, -f        Overwrite existing files
 *   --props            Include props section
 *   --no-state         Skip state section
 *   --no-style         Skip style section
 */
async function newPulseFile(args) {
  const { options, patterns } = parseArgs(args);
  const name = patterns[0];

  if (!name) {
    log.error('Please provide a name for the .pulse file.');
    log.info(`
Usage: pulse new <name> [options]

Options:
  --type, -t <type>  Type: component, page, layout (default: component)
  --dir, -d <path>   Output directory
  --force, -f        Overwrite existing files
  --props            Include props section
  --no-state         Skip state section
  --no-style         Skip style section

Examples:
  pulse new Button                   Create src/components/Button.pulse
  pulse new Dashboard --type page    Create src/pages/Dashboard.pulse
  pulse new Admin --type layout      Create src/layouts/Admin.pulse
  pulse new Modal --props            Create component with props section
  pulse new Card -d src/ui           Create in custom directory
`);
    process.exit(1);
  }

  // Determine type
  const type = options.type || options.t || 'component';
  const validTypes = ['component', 'page', 'layout'];

  if (!validTypes.includes(type)) {
    log.error(`Invalid type: ${type}`);
    log.info(`Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  // Map type to scaffold type and delegate
  const { runScaffold } = await import('./scaffold.js');

  // Build args for scaffold command
  const scaffoldArgs = [type, name];

  // Pass through options
  if (options.dir || options.d) {
    scaffoldArgs.push('--dir', options.dir || options.d);
  }
  if (options.force || options.f) {
    scaffoldArgs.push('--force');
  }
  if (options.props) {
    scaffoldArgs.push('--props');
  }
  if (options.state === false) {
    scaffoldArgs.push('--no-state');
  }
  if (options.style === false) {
    scaffoldArgs.push('--no-style');
  }

  await runScaffold(scaffoldArgs);
}

/**
 * Run docs command
 */
async function runDocsCmd(args) {
  const { runDocs } = await import('./docs.js');
  await runDocs(args);
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
