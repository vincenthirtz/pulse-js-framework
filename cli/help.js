/**
 * Pulse CLI Help System
 * Provides detailed help for all CLI commands
 * @module pulse-cli/help
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

/**
 * Command definitions with detailed help information
 */
const commandDefinitions = {
  create: {
    name: 'create',
    summary: 'Create a new Pulse project',
    usage: 'pulse create <name> [options]',
    description: `
Creates a new Pulse project with a complete starter template including:
- Project structure (src/, public/)
- Vite configuration for development and building
- Sample App.pulse component with counter example
- Package.json with all necessary scripts`,
    arguments: [
      { name: '<name>', description: 'Name of the project directory to create' }
    ],
    options: [
      { flag: '--typescript, --ts', description: 'Create a TypeScript project with tsconfig.json' },
      { flag: '--minimal', description: 'Create minimal project structure without extras' }
    ],
    examples: [
      { cmd: 'pulse create my-app', desc: 'Create a new JavaScript project' },
      { cmd: 'pulse create my-app --typescript', desc: 'Create a new TypeScript project' },
      { cmd: 'pulse create my-app --minimal', desc: 'Create a minimal project' }
    ]
  },

  init: {
    name: 'init',
    summary: 'Initialize Pulse in current directory',
    usage: 'pulse init [options]',
    description: `
Initializes a Pulse project in the current directory. This is useful when:
- Converting an existing project to use Pulse
- Setting up Pulse in a pre-existing directory
- Adding Pulse to a monorepo

Merges with existing package.json if present.`,
    options: [
      { flag: '--typescript, --ts', description: 'Initialize as TypeScript project' },
      { flag: '--force', description: 'Initialize even if directory is not empty' }
    ],
    examples: [
      { cmd: 'pulse init', desc: 'Initialize in current directory' },
      { cmd: 'pulse init --typescript', desc: 'Initialize with TypeScript support' },
      { cmd: 'pulse init --force', desc: 'Force init in non-empty directory' }
    ]
  },

  new: {
    name: 'new',
    summary: 'Create a new .pulse file',
    usage: 'pulse new <name> [options]',
    description: `
Creates a new .pulse file with a component template. This is a shorthand for
"pulse scaffold component/page/layout" that makes it quick to create new
Pulse components from the command line.

File types:
- component: Reusable UI component (default)
- page: Page component with routing support
- layout: Layout component with slots`,
    arguments: [
      { name: '<name>', description: 'Name of the component (PascalCase recommended)' }
    ],
    options: [
      { flag: '--type, -t <type>', description: 'Type: component, page, layout (default: component)' },
      { flag: '--dir, -d <path>', description: 'Output directory (default: based on type)' },
      { flag: '--force, -f', description: 'Overwrite existing files' },
      { flag: '--props', description: 'Include props section' },
      { flag: '--no-state', description: 'Skip state section' },
      { flag: '--no-style', description: 'Skip style section' }
    ],
    examples: [
      { cmd: 'pulse new Button', desc: 'Create src/components/Button.pulse' },
      { cmd: 'pulse new Dashboard --type page', desc: 'Create src/pages/Dashboard.pulse' },
      { cmd: 'pulse new Admin --type layout', desc: 'Create src/layouts/Admin.pulse' },
      { cmd: 'pulse new Modal --props', desc: 'Create component with props section' },
      { cmd: 'pulse new Card -d src/ui', desc: 'Create in custom directory' },
      { cmd: 'pulse new Header --no-style', desc: 'Create without style block' }
    ]
  },

  dev: {
    name: 'dev',
    summary: 'Start development server',
    usage: 'pulse dev [port]',
    description: `
Starts the Vite development server with:
- Hot Module Replacement (HMR) for instant updates
- .pulse file compilation on-the-fly
- Source maps for debugging
- Fast refresh without losing state`,
    arguments: [
      { name: '[port]', description: 'Port number (default: 3000)' }
    ],
    options: [
      { flag: '--host', description: 'Expose server to network' },
      { flag: '--open', description: 'Open browser automatically' }
    ],
    examples: [
      { cmd: 'pulse dev', desc: 'Start on default port 3000' },
      { cmd: 'pulse dev 8080', desc: 'Start on port 8080' },
      { cmd: 'pulse dev --host', desc: 'Expose to network (for mobile testing)' }
    ]
  },

  build: {
    name: 'build',
    summary: 'Build for production',
    usage: 'pulse build [options]',
    description: `
Creates an optimized production build in the dist/ directory:
- Minified JavaScript and CSS
- Tree-shaking to remove unused code
- Asset optimization and hashing
- Source maps (optional)`,
    options: [
      { flag: '--sourcemap', description: 'Generate source maps' },
      { flag: '--minify', description: 'Minify output (default: true)' }
    ],
    examples: [
      { cmd: 'pulse build', desc: 'Create production build' },
      { cmd: 'pulse build --sourcemap', desc: 'Build with source maps' }
    ]
  },

  preview: {
    name: 'preview',
    summary: 'Preview production build',
    usage: 'pulse preview [port]',
    description: `
Serves the production build locally for testing before deployment.
This simulates a production environment to verify the build works correctly.`,
    arguments: [
      { name: '[port]', description: 'Port number (default: 4173)' }
    ],
    examples: [
      { cmd: 'pulse preview', desc: 'Preview on default port' },
      { cmd: 'pulse preview 5000', desc: 'Preview on port 5000' }
    ]
  },

  compile: {
    name: 'compile',
    summary: 'Compile .pulse files to JavaScript',
    usage: 'pulse compile <file|dir> [options]',
    description: `
Compiles .pulse files to JavaScript. Useful for:
- Pre-compiling components for distribution
- Debugging compiled output
- CI/CD pipelines without Vite`,
    arguments: [
      { name: '<file|dir>', description: 'File or directory to compile' }
    ],
    options: [
      { flag: '--watch, -w', description: 'Watch files and recompile on changes' },
      { flag: '--dry-run', description: 'Show what would be compiled without writing' },
      { flag: '--output, -o <dir>', description: 'Output directory (default: same as input)' }
    ],
    examples: [
      { cmd: 'pulse compile src/App.pulse', desc: 'Compile a single file' },
      { cmd: 'pulse compile src/', desc: 'Compile all .pulse files in directory' },
      { cmd: 'pulse compile src/ --watch', desc: 'Watch and recompile on changes' },
      { cmd: 'pulse compile src/ -o dist/', desc: 'Output to dist directory' }
    ]
  },

  lint: {
    name: 'lint',
    summary: 'Validate .pulse files for errors and style',
    usage: 'pulse lint [files] [options]',
    description: `
Analyzes .pulse files for:
- Syntax errors and typos
- Unused state variables
- Missing key functions in lists
- Accessibility issues (10 a11y rules)
- Code style violations`,
    arguments: [
      { name: '[files]', description: 'Files or directories to lint (default: src/)' }
    ],
    options: [
      { flag: '--fix', description: 'Auto-fix fixable issues' },
      { flag: '--watch, -w', description: 'Watch files and re-lint on changes' },
      { flag: '--dry-run', description: 'Show fixes without applying (use with --fix)' }
    ],
    examples: [
      { cmd: 'pulse lint', desc: 'Lint all files in src/' },
      { cmd: 'pulse lint src/components/', desc: 'Lint specific directory' },
      { cmd: 'pulse lint --fix', desc: 'Auto-fix fixable issues' },
      { cmd: 'pulse lint --fix --dry-run', desc: 'Preview fixes without applying' }
    ]
  },

  format: {
    name: 'format',
    summary: 'Format .pulse files consistently',
    usage: 'pulse format [files] [options]',
    description: `
Formats .pulse files with consistent style:
- Indentation (2 spaces)
- Brace placement
- Attribute ordering
- Whitespace normalization`,
    arguments: [
      { name: '[files]', description: 'Files or directories to format (default: src/)' }
    ],
    options: [
      { flag: '--check', description: 'Check formatting without writing (CI mode)' },
      { flag: '--watch, -w', description: 'Watch files and re-format on changes' },
      { flag: '--write', description: 'Write formatted output (default)' }
    ],
    examples: [
      { cmd: 'pulse format', desc: 'Format all files in src/' },
      { cmd: 'pulse format --check', desc: 'Check formatting (for CI)' },
      { cmd: 'pulse format src/App.pulse', desc: 'Format specific file' }
    ]
  },

  analyze: {
    name: 'analyze',
    summary: 'Analyze bundle size and dependencies',
    usage: 'pulse analyze [options]',
    description: `
Analyzes your project to provide insights on:
- Bundle size breakdown
- Import graph and dependencies
- Code complexity metrics
- Potential optimization opportunities`,
    options: [
      { flag: '--json', description: 'Output analysis as JSON' },
      { flag: '--verbose', description: 'Show detailed metrics' }
    ],
    examples: [
      { cmd: 'pulse analyze', desc: 'Show analysis summary' },
      { cmd: 'pulse analyze --json', desc: 'Output as JSON for tooling' },
      { cmd: 'pulse analyze --verbose', desc: 'Show detailed breakdown' }
    ]
  },

  test: {
    name: 'test',
    summary: 'Run tests with coverage support',
    usage: 'pulse test [files] [options]',
    description: `
Runs tests using Node.js built-in test runner:
- Automatic test file discovery
- Code coverage reporting
- Watch mode for TDD
- Test file generation`,
    arguments: [
      { name: '[files]', description: 'Test files to run (default: test/**/*.test.js)' }
    ],
    options: [
      { flag: '--coverage, -c', description: 'Collect code coverage' },
      { flag: '--watch, -w', description: 'Watch files and re-run tests' },
      { flag: '--filter, -f <pattern>', description: 'Filter tests by name pattern' },
      { flag: '--timeout, -t <ms>', description: 'Test timeout in ms (default: 30000)' },
      { flag: '--bail, -b', description: 'Stop on first failure' },
      { flag: '--create <name>', description: 'Generate a new test file' }
    ],
    examples: [
      { cmd: 'pulse test', desc: 'Run all tests' },
      { cmd: 'pulse test --coverage', desc: 'Run with coverage' },
      { cmd: 'pulse test --watch', desc: 'Watch mode for TDD' },
      { cmd: 'pulse test --filter "Button"', desc: 'Run tests matching pattern' },
      { cmd: 'pulse test --create Button', desc: 'Generate Button.test.js' }
    ]
  },

  doctor: {
    name: 'doctor',
    summary: 'Run project diagnostics',
    usage: 'pulse doctor [options]',
    description: `
Checks your project health and reports:
- Missing dependencies
- Configuration issues
- Version compatibility
- Common problems and fixes`,
    options: [
      { flag: '--verbose, -v', description: 'Show detailed diagnostics' },
      { flag: '--json', description: 'Output as JSON' }
    ],
    examples: [
      { cmd: 'pulse doctor', desc: 'Run diagnostics' },
      { cmd: 'pulse doctor --verbose', desc: 'Show detailed output' },
      { cmd: 'pulse doctor --json', desc: 'Output as JSON' }
    ]
  },

  scaffold: {
    name: 'scaffold',
    summary: 'Generate components, pages, stores, and more',
    usage: 'pulse scaffold <type> <name> [options]',
    description: `
Generates boilerplate code for common patterns:
- component: Reusable UI component
- page: Page component with routing
- store: State management module
- hook: Custom reactive hook
- service: API service module
- context: Context provider
- layout: Layout component`,
    arguments: [
      { name: '<type>', description: 'Type: component, page, store, hook, service, context, layout' },
      { name: '<name>', description: 'Name of the item to generate' }
    ],
    options: [
      { flag: '--dir, -d <path>', description: 'Output directory' },
      { flag: '--force, -f', description: 'Overwrite existing files' },
      { flag: '--props', description: 'Include props section (components)' }
    ],
    examples: [
      { cmd: 'pulse scaffold component Button', desc: 'Generate Button component' },
      { cmd: 'pulse scaffold page Dashboard', desc: 'Generate Dashboard page' },
      { cmd: 'pulse scaffold store user', desc: 'Generate user store' },
      { cmd: 'pulse scaffold hook useAuth', desc: 'Generate useAuth hook' },
      { cmd: 'pulse scaffold service api', desc: 'Generate api service' }
    ]
  },

  docs: {
    name: 'docs',
    summary: 'Generate API documentation',
    usage: 'pulse docs [options]',
    description: `
Generates API documentation from JSDoc comments:
- Markdown format (default)
- HTML format with styling
- JSON format for tooling`,
    options: [
      { flag: '--generate, -g', description: 'Generate documentation' },
      { flag: '--format, -f <type>', description: 'Output format: markdown, json, html' },
      { flag: '--output, -o <dir>', description: 'Output directory (default: docs/api)' }
    ],
    examples: [
      { cmd: 'pulse docs --generate', desc: 'Generate Markdown docs' },
      { cmd: 'pulse docs -g --format html', desc: 'Generate HTML docs' },
      { cmd: 'pulse docs -g -o api-docs/', desc: 'Output to custom directory' }
    ]
  },

  release: {
    name: 'release',
    summary: 'Create a new release',
    usage: 'pulse release <type> [options]',
    description: `
Creates a new release with:
- Version bump (patch, minor, major)
- Changelog generation
- Git tag creation
- Optional push to remote`,
    arguments: [
      { name: '<type>', description: 'Release type: patch, minor, or major' }
    ],
    options: [
      { flag: '--dry-run', description: 'Show what would be done without making changes' },
      { flag: '--no-push', description: 'Create commit and tag but do not push' },
      { flag: '--title <text>', description: 'Release title for changelog' },
      { flag: '--skip-prompt', description: 'Use empty changelog (for automation)' },
      { flag: '--from-commits, --fc', description: 'Auto-extract changelog from git commits' }
    ],
    examples: [
      { cmd: 'pulse release patch', desc: 'Create patch release (1.0.0 -> 1.0.1)' },
      { cmd: 'pulse release minor', desc: 'Create minor release (1.0.0 -> 1.1.0)' },
      { cmd: 'pulse release major', desc: 'Create major release (1.0.0 -> 2.0.0)' },
      { cmd: 'pulse release patch --dry-run', desc: 'Preview release without changes' }
    ]
  },

  mobile: {
    name: 'mobile',
    summary: 'Mobile app commands',
    usage: 'pulse mobile <command> [options]',
    description: `
Commands for building mobile apps with Pulse:
- init: Initialize mobile project structure
- build: Build for iOS/Android
- run: Run on device/simulator`,
    arguments: [
      { name: '<command>', description: 'Mobile command: init, build, run' }
    ],
    examples: [
      { cmd: 'pulse mobile init', desc: 'Initialize mobile project' },
      { cmd: 'pulse mobile build ios', desc: 'Build for iOS' },
      { cmd: 'pulse mobile build android', desc: 'Build for Android' },
      { cmd: 'pulse mobile run ios', desc: 'Run on iOS simulator' }
    ]
  },

  version: {
    name: 'version',
    summary: 'Show version number',
    usage: 'pulse version',
    description: 'Displays the current version of Pulse Framework CLI.',
    examples: [
      { cmd: 'pulse version', desc: 'Show version' },
      { cmd: 'pulse --version', desc: 'Alternative syntax' }
    ]
  },

  help: {
    name: 'help',
    summary: 'Show help information',
    usage: 'pulse help [command]',
    description: `
Displays help information for Pulse CLI commands.
Run without arguments for overview, or specify a command for detailed help.`,
    arguments: [
      { name: '[command]', description: 'Command to get help for' }
    ],
    examples: [
      { cmd: 'pulse help', desc: 'Show general help' },
      { cmd: 'pulse help create', desc: 'Show help for create command' },
      { cmd: 'pulse help scaffold', desc: 'Show help for scaffold command' }
    ]
  }
};

/**
 * Format a section header
 */
function formatHeader(text) {
  return `\n${text}\n${'─'.repeat(text.length)}`;
}

/**
 * Format command arguments table
 */
function formatArguments(args) {
  if (!args || args.length === 0) return '';

  let output = formatHeader('Arguments');
  const maxLen = Math.max(...args.map(a => a.name.length));

  for (const arg of args) {
    output += `\n  ${arg.name.padEnd(maxLen + 2)}${arg.description}`;
  }

  return output;
}

/**
 * Format command options table
 */
function formatOptions(options) {
  if (!options || options.length === 0) return '';

  let output = formatHeader('Options');
  const maxLen = Math.max(...options.map(o => o.flag.length));

  for (const opt of options) {
    output += `\n  ${opt.flag.padEnd(maxLen + 2)}${opt.description}`;
  }

  return output;
}

/**
 * Format examples
 */
function formatExamples(examples) {
  if (!examples || examples.length === 0) return '';

  let output = formatHeader('Examples');

  for (const ex of examples) {
    output += `\n  $ ${ex.cmd}`;
    if (ex.desc) {
      output += `\n    ${ex.desc}`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Show detailed help for a specific command
 */
function showCommandHelp(commandName) {
  const cmd = commandDefinitions[commandName];

  if (!cmd) {
    log.error(`Unknown command: ${commandName}\n`);
    log.info('Available commands:');
    const cmdList = Object.keys(commandDefinitions).sort();
    log.info(`  ${cmdList.join(', ')}\n`);
    log.info('Run "pulse help" for usage information.');
    return false;
  }

  let output = `
${cmd.name} - ${cmd.summary}

Usage: ${cmd.usage}
${cmd.description}`;

  output += formatArguments(cmd.arguments);
  output += formatOptions(cmd.options);
  output += formatExamples(cmd.examples);

  output += `
────────────────────────────────────────
Documentation: https://pulse-js.fr/cli/${cmd.name}
`;

  log.info(output);
  return true;
}

/**
 * Show general help overview
 */
function showGeneralHelp() {
  const commandGroups = {
    'Project Setup': ['create', 'init'],
    'Development': ['dev', 'build', 'preview'],
    'Code Quality': ['compile', 'lint', 'format', 'analyze'],
    'Testing': ['test', 'doctor'],
    'Scaffolding': ['new', 'scaffold', 'docs'],
    'Release': ['release'],
    'Mobile': ['mobile'],
    'Information': ['version', 'help']
  };

  let output = `
Pulse Framework CLI v${VERSION}

Usage: pulse <command> [options]

`;

  // Calculate max command length for alignment
  const allCmds = Object.values(commandGroups).flat();
  const maxCmdLen = Math.max(...allCmds.map(c => c.length));

  for (const [group, cmds] of Object.entries(commandGroups)) {
    output += `${group}:\n`;
    for (const cmdName of cmds) {
      const cmd = commandDefinitions[cmdName];
      if (cmd) {
        output += `  ${cmdName.padEnd(maxCmdLen + 2)}${cmd.summary}\n`;
      }
    }
    output += '\n';
  }

  output += `Run "pulse help <command>" for detailed information about a command.

Quick Start:
  $ pulse create my-app      Create a new project
  $ cd my-app && npm install Install dependencies
  $ npm run dev              Start development server

Documentation: https://pulse-js.fr
Repository:    https://github.com/vincenthirtz/pulse-js-framework
`;

  log.info(output);
}

/**
 * Main help command handler
 * @param {string[]} args - Command arguments
 */
export function runHelp(args) {
  const commandName = args[0];

  if (commandName) {
    // Handle aliases
    const normalizedName = commandName.toLowerCase();
    showCommandHelp(normalizedName);
  } else {
    showGeneralHelp();
  }
}

/**
 * Get list of available commands
 * @returns {string[]} Array of command names
 */
export function getAvailableCommands() {
  return Object.keys(commandDefinitions);
}

/**
 * Get command definition
 * @param {string} name - Command name
 * @returns {Object|undefined} Command definition or undefined
 */
export function getCommandDefinition(name) {
  return commandDefinitions[name];
}

export default { runHelp, getAvailableCommands, getCommandDefinition };
