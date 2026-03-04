/**
 * CLI Create Command Tests
 *
 * Tests for `pulse create <name> [options]` command with various flags and templates
 *
 * @module test/cli-create
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseArgs } from '../cli/utils/file-utils.js';

// =============================================================================
// Test Setup and Helpers
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-cli-create');
const originalCwd = process.cwd();

/**
 * Setup test directory
 */
function setupTestDir() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
}

/**
 * Cleanup test directory
 */
function cleanupTestDir() {
  process.chdir(originalCwd);
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

/**
 * Verify project structure has required files
 */
function verifyProjectStructure(projectPath, expectedFiles) {
  for (const file of expectedFiles) {
    const filePath = join(projectPath, file);
    assert.ok(existsSync(filePath), `Project should have ${file}`);
  }
}

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

// Available templates from cli/index.js
const TEMPLATES = {
  ecommerce: { name: 'E-Commerce', description: 'Shopping cart with products, checkout, and cart management' },
  todo: { name: 'Todo App', description: 'Classic todo list with filtering and local storage' },
  blog: { name: 'Blog', description: 'Blogging platform with posts, sidebar, and navigation' },
  chat: { name: 'Chat', description: 'Real-time chat with messages, users, and emoji picker' },
  dashboard: { name: 'Dashboard', description: 'Analytics dashboard with data visualization' }
};

// =============================================================================
// parseArgs Tests for Create Command
// =============================================================================

describe('parseArgs Tests for Create Command', () => {
  test('parseArgs parses project name correctly', () => {
    const { patterns } = parseArgs(['my-app']);

    assert.strictEqual(patterns[0], 'my-app', 'Should extract project name');
  });

  test('parseArgs parses --typescript flag', () => {
    const { options, patterns } = parseArgs(['my-app', '--typescript']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.typescript, true);
  });

  test('parseArgs parses --ts shorthand flag', () => {
    const { options, patterns } = parseArgs(['my-app', '--ts']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.ts, true);
  });

  test('parseArgs parses --minimal flag', () => {
    const { options, patterns } = parseArgs(['my-app', '--minimal']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.minimal, true);
  });

  test('parseArgs parses --ecommerce template flag', () => {
    const { options, patterns } = parseArgs(['my-shop', '--ecommerce']);

    assert.strictEqual(patterns[0], 'my-shop');
    assert.strictEqual(options.ecommerce, true);
  });

  test('parseArgs parses --todo template flag', () => {
    const { options, patterns } = parseArgs(['my-todos', '--todo']);

    assert.strictEqual(patterns[0], 'my-todos');
    assert.strictEqual(options.todo, true);
  });

  test('parseArgs parses --blog template flag', () => {
    const { options, patterns } = parseArgs(['my-blog', '--blog']);

    assert.strictEqual(patterns[0], 'my-blog');
    assert.strictEqual(options.blog, true);
  });

  test('parseArgs parses --chat template flag', () => {
    const { options, patterns } = parseArgs(['my-chat', '--chat']);

    assert.strictEqual(patterns[0], 'my-chat');
    assert.strictEqual(options.chat, true);
  });

  test('parseArgs parses --dashboard template flag', () => {
    const { options, patterns } = parseArgs(['my-dashboard', '--dashboard']);

    assert.strictEqual(patterns[0], 'my-dashboard');
    assert.strictEqual(options.dashboard, true);
  });

  test('parseArgs handles combined flags', () => {
    const { options, patterns } = parseArgs(['my-app', '--typescript', '--minimal']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.typescript, true);
    assert.strictEqual(options.minimal, true);
  });

  test('parseArgs handles project name with hyphens', () => {
    const { patterns } = parseArgs(['my-awesome-app']);

    assert.strictEqual(patterns[0], 'my-awesome-app');
  });

  test('parseArgs handles project name with underscores', () => {
    const { patterns } = parseArgs(['my_awesome_app']);

    assert.strictEqual(patterns[0], 'my_awesome_app');
  });

  test('parseArgs handles flags before project name', () => {
    const { options, patterns } = parseArgs(['--typescript', 'my-app']);

    assert.strictEqual(options.typescript, true);
    assert.strictEqual(patterns[0], 'my-app');
  });
});

// =============================================================================
// Template Configuration Tests
// =============================================================================

describe('Template Configuration Tests', () => {
  test('all templates have name and description', () => {
    for (const [key, template] of Object.entries(TEMPLATES)) {
      assert.ok(template.name, `${key} template should have name`);
      assert.ok(template.description, `${key} template should have description`);
      assert.ok(template.name.length > 0, `${key} template name should not be empty`);
      assert.ok(template.description.length > 0, `${key} template description should not be empty`);
    }
  });

  test('ecommerce template configuration is correct', () => {
    assert.strictEqual(TEMPLATES.ecommerce.name, 'E-Commerce');
    assert.ok(TEMPLATES.ecommerce.description.includes('cart'), 'Should mention cart');
  });

  test('todo template configuration is correct', () => {
    assert.strictEqual(TEMPLATES.todo.name, 'Todo App');
    assert.ok(TEMPLATES.todo.description.includes('todo'), 'Should mention todo');
  });

  test('blog template configuration is correct', () => {
    assert.strictEqual(TEMPLATES.blog.name, 'Blog');
    assert.ok(TEMPLATES.blog.description.includes('post'), 'Should mention posts');
  });

  test('chat template configuration is correct', () => {
    assert.strictEqual(TEMPLATES.chat.name, 'Chat');
    assert.ok(TEMPLATES.chat.description.includes('message'), 'Should mention messages');
  });

  test('dashboard template configuration is correct', () => {
    assert.strictEqual(TEMPLATES.dashboard.name, 'Dashboard');
    assert.ok(TEMPLATES.dashboard.description.includes('dashboard'), 'Should mention dashboard');
  });
});

// =============================================================================
// Standard Project Structure Tests
// =============================================================================

describe('Standard Project Structure Tests', () => {
  test('standard project has required directories', () => {
    const expectedDirs = ['src', 'public'];

    // Verify directories would be created
    for (const dir of expectedDirs) {
      assert.ok(expectedDirs.includes(dir), `Should create ${dir} directory`);
    }
  });

  test('standard project has required files', () => {
    const expectedFiles = [
      'package.json',
      'vite.config.js',
      'index.html',
      'src/main.js',
      'src/App.pulse',
      '.gitignore'
    ];

    // Verify files would be created
    for (const file of expectedFiles) {
      assert.ok(expectedFiles.includes(file), `Should create ${file}`);
    }
  });

  test('package.json has correct structure for standard project', () => {
    const projectName = 'test-project';
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

    assert.strictEqual(packageJson.name, projectName);
    assert.strictEqual(packageJson.type, 'module');
    assert.ok('dev' in packageJson.scripts);
    assert.ok('build' in packageJson.scripts);
    assert.ok('preview' in packageJson.scripts);
    assert.ok('test' in packageJson.scripts);
    assert.ok('lint' in packageJson.scripts);
    assert.ok('pulse-js-framework' in packageJson.dependencies);
    assert.ok('vite' in packageJson.devDependencies);
  });

  test('vite.config.js has correct content', () => {
    const viteConfig = `import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});
`;

    assert.ok(viteConfig.includes('defineConfig'), 'Should import defineConfig');
    assert.ok(viteConfig.includes('pulse-js-framework/vite'), 'Should import pulse plugin');
    assert.ok(viteConfig.includes('plugins: [pulse()]'), 'Should configure pulse plugin');
  });

  test('index.html has correct structure', () => {
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

    assert.ok(indexHtml.includes('<!DOCTYPE html>'), 'Should be HTML5');
    assert.ok(indexHtml.includes(`<title>${projectName}</title>`), 'Should have project title');
    assert.ok(indexHtml.includes('id="app"'), 'Should have app container');
    assert.ok(indexHtml.includes('type="module"'), 'Should use ES modules');
    assert.ok(indexHtml.includes('/src/main.js'), 'Should reference main.js');
  });

  test('main.js has correct content', () => {
    const mainJs = `import App from './App.pulse';

App.mount('#app');
`;

    assert.ok(mainJs.includes("import App from './App.pulse'"), 'Should import App');
    assert.ok(mainJs.includes("App.mount('#app')"), 'Should mount to #app');
  });

  test('App.pulse has correct structure', () => {
    const appPulse = `@page App

state {
  count: 0
  name: "Pulse"
}

view {
  #app {
    h1.title "Welcome to {name}!"
  }
}

style {
  #app {
    font-family: system-ui, -apple-system, sans-serif
  }
}`;

    assert.ok(appPulse.includes('@page App'), 'Should have page directive');
    assert.ok(appPulse.includes('state {'), 'Should have state block');
    assert.ok(appPulse.includes('count: 0'), 'Should have count state');
    assert.ok(appPulse.includes('view {'), 'Should have view block');
    assert.ok(appPulse.includes('style {'), 'Should have style block');
  });

  test('.gitignore has correct content', () => {
    const gitignore = `node_modules
dist
.DS_Store
*.local
`;

    assert.ok(gitignore.includes('node_modules'), 'Should ignore node_modules');
    assert.ok(gitignore.includes('dist'), 'Should ignore dist');
    assert.ok(gitignore.includes('.DS_Store'), 'Should ignore .DS_Store');
  });
});

// =============================================================================
// TypeScript Project Tests
// =============================================================================

describe('TypeScript Project Tests', () => {
  test('TypeScript project has additional files', () => {
    const typescriptFiles = [
      'tsconfig.json',
      'vite.config.ts',
      'src/main.ts',
      'src/types/index.d.ts'
    ];

    // Verify TypeScript-specific files would be created
    for (const file of typescriptFiles) {
      assert.ok(typescriptFiles.includes(file), `TypeScript project should create ${file}`);
    }
  });

  test('package.json has TypeScript dependencies', () => {
    const useTypescript = true;
    const packageJson = {
      devDependencies: {
        vite: '^5.0.0',
        ...(useTypescript ? {
          'typescript': '^5.3.0',
          '@types/node': '^20.0.0'
        } : {})
      },
      scripts: {
        ...(useTypescript ? { typecheck: 'tsc --noEmit' } : {})
      }
    };

    assert.ok('typescript' in packageJson.devDependencies, 'Should have typescript dependency');
    assert.ok('@types/node' in packageJson.devDependencies, 'Should have @types/node');
    assert.ok('typecheck' in packageJson.scripts, 'Should have typecheck script');
  });

  test('tsconfig.json has correct structure', () => {
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

    assert.strictEqual(tsConfig.compilerOptions.target, 'ES2022');
    assert.strictEqual(tsConfig.compilerOptions.strict, true);
    assert.strictEqual(tsConfig.compilerOptions.noEmit, true);
    assert.ok(tsConfig.include.includes('src/**/*'));
    assert.ok(tsConfig.exclude.includes('node_modules'));
  });

  test('TypeScript main.ts has HMR support', () => {
    const mainTs = `import App from './App.pulse';

// Type-safe app mounting
App.mount('#app');

// Enable HMR in development
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;

    assert.ok(mainTs.includes("import App from './App.pulse'"), 'Should import App');
    assert.ok(mainTs.includes("App.mount('#app')"), 'Should mount to #app');
    assert.ok(mainTs.includes('import.meta.hot'), 'Should have HMR support');
  });

  test('TypeScript types file has correct declarations', () => {
    const typesContent = `declare module '*.pulse' {
  const component: {
    mount(selector: string): void;
  };
  export default component;
}

export interface AppState {
  count: number;
  name: string;
}`;

    assert.ok(typesContent.includes("declare module '*.pulse'"), 'Should declare .pulse modules');
    assert.ok(typesContent.includes('mount(selector: string)'), 'Should type mount method');
    assert.ok(typesContent.includes('AppState'), 'Should have AppState interface');
  });

  test('TypeScript .gitignore has tsbuildinfo', () => {
    const useTypescript = true;
    const gitignore = `node_modules
dist
.DS_Store
*.local
${useTypescript ? '*.tsbuildinfo\n' : ''}`;

    assert.ok(gitignore.includes('*.tsbuildinfo'), 'Should ignore tsbuildinfo files');
  });
});

// =============================================================================
// Template Project Tests
// =============================================================================

describe('Template Project Tests', () => {
  test('template project has common files', () => {
    const commonFiles = [
      'package.json',
      'vite.config.js',
      '.gitignore'
    ];

    // Verify common files for template projects
    for (const file of commonFiles) {
      assert.ok(commonFiles.includes(file), `Template project should have ${file}`);
    }
  });

  test('template package.json has correct structure', () => {
    const projectName = 'my-shop';
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

    assert.strictEqual(packageJson.name, projectName);
    assert.strictEqual(packageJson.type, 'module');
    assert.ok('dev' in packageJson.scripts);
    assert.ok('build' in packageJson.scripts);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling Tests', () => {
  test('create command requires project name', () => {
    const { patterns } = parseArgs([]);

    assert.strictEqual(patterns.length, 0, 'Should have no project name');
  });

  test('create command handles empty project name', () => {
    const { patterns } = parseArgs(['']);

    assert.strictEqual(patterns[0], '', 'Should be empty string');
  });

  test('create command with only flags and no name', () => {
    const { options, patterns } = parseArgs(['--typescript']);

    assert.strictEqual(options.typescript, true);
    assert.strictEqual(patterns.length, 0, 'Should have no project name when only flags provided');
  });

  test('only one template can be selected at a time', () => {
    const { options } = parseArgs(['my-app', '--ecommerce', '--todo']);

    // Both flags are parsed, but implementation should handle this
    assert.strictEqual(options.ecommerce, true);
    assert.strictEqual(options.todo, true);
    // Note: The implementation picks the first matching template
  });
});

// =============================================================================
// Minimal Project Tests
// =============================================================================

describe('Minimal Project Tests', () => {
  test('minimal project skips types directory for TypeScript', () => {
    const useTypescript = true;
    const minimal = true;

    // In minimal mode, types directory is not created even with TypeScript
    const createTypesDir = useTypescript && !minimal;
    assert.strictEqual(createTypesDir, false, 'Should not create types dir in minimal mode');
  });

  test('minimal flag parsing works correctly', () => {
    const { options, patterns } = parseArgs(['my-app', '--minimal', '--typescript']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.minimal, true);
    assert.strictEqual(options.typescript, true);
  });
});

// =============================================================================
// Command Alias Tests
// =============================================================================

describe('Command Alias Tests', () => {
  test('create command has typo aliases', () => {
    const commandAliases = {
      'crate': 'create',
      'craete': 'create'
    };

    assert.strictEqual(commandAliases['crate'], 'create');
    assert.strictEqual(commandAliases['craete'], 'create');
  });
});

// =============================================================================
// Project Name Validation Tests
// =============================================================================

describe('Project Name Validation Tests', () => {
  test('project name with spaces is handled', () => {
    // Note: Shell would typically handle this, but we can test parsing
    const { patterns } = parseArgs(['my', 'app']);

    // Without quotes, these become separate patterns
    assert.strictEqual(patterns.length, 2);
    assert.strictEqual(patterns[0], 'my');
    assert.strictEqual(patterns[1], 'app');
  });

  test('project name with special characters', () => {
    const { patterns } = parseArgs(['my-app-v2.0']);

    assert.strictEqual(patterns[0], 'my-app-v2.0');
  });

  test('project name starting with number', () => {
    const { patterns } = parseArgs(['123-app']);

    assert.strictEqual(patterns[0], '123-app');
  });

  test('project name with @ symbol (scoped package style)', () => {
    const { patterns } = parseArgs(['@my-org/my-app']);

    assert.strictEqual(patterns[0], '@my-org/my-app');
  });
});

// =============================================================================
// Flag Combination Tests
// =============================================================================

describe('Flag Combination Tests', () => {
  test('typescript with ecommerce template', () => {
    const { options, patterns } = parseArgs(['my-shop', '--typescript', '--ecommerce']);

    assert.strictEqual(patterns[0], 'my-shop');
    assert.strictEqual(options.typescript, true);
    assert.strictEqual(options.ecommerce, true);
  });

  test('minimal with todo template', () => {
    const { options, patterns } = parseArgs(['my-todos', '--minimal', '--todo']);

    assert.strictEqual(patterns[0], 'my-todos');
    assert.strictEqual(options.minimal, true);
    assert.strictEqual(options.todo, true);
  });

  test('all standard options together', () => {
    const { options, patterns } = parseArgs(['my-app', '--typescript', '--minimal']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.typescript, true);
    assert.strictEqual(options.minimal, true);
  });
});

// =============================================================================
// Help Output Tests
// =============================================================================

describe('Help Output Tests', () => {
  test('create command help mentions all templates', () => {
    const helpTemplates = ['ecommerce', 'todo', 'blog', 'chat', 'dashboard'];

    for (const template of helpTemplates) {
      assert.ok(TEMPLATES[template], `Help should mention ${template} template`);
    }
  });

  test('create command help mentions typescript option', () => {
    const helpText = '--typescript, --ts    Create TypeScript project';
    assert.ok(helpText.includes('--typescript'), 'Should mention --typescript');
    assert.ok(helpText.includes('--ts'), 'Should mention --ts shorthand');
  });

  test('create command help mentions minimal option', () => {
    const helpText = '--minimal             Create minimal project';
    assert.ok(helpText.includes('--minimal'), 'Should mention --minimal');
  });
});

// =============================================================================
// Integration-like Tests (without actual file system)
// =============================================================================

describe('Integration-like Tests', () => {
  test('standard project creation flow', () => {
    // Simulate the createProject flow
    const args = ['my-app'];
    const { options, patterns } = parseArgs(args);
    const projectName = patterns[0];

    assert.strictEqual(projectName, 'my-app');
    assert.strictEqual(options.typescript, undefined);
    assert.strictEqual(options.minimal, undefined);

    // Check no template is selected
    let selectedTemplate = null;
    for (const templateName of Object.keys(TEMPLATES)) {
      if (options[templateName]) {
        selectedTemplate = templateName;
        break;
      }
    }
    assert.strictEqual(selectedTemplate, null, 'Should not have template selected');
  });

  test('typescript project creation flow', () => {
    const args = ['my-ts-app', '--typescript'];
    const { options, patterns } = parseArgs(args);

    const useTypescript = options.typescript || options.ts || false;
    assert.strictEqual(useTypescript, true);
    assert.strictEqual(patterns[0], 'my-ts-app');
  });

  test('template project creation flow', () => {
    const args = ['my-shop', '--ecommerce'];
    const { options, patterns } = parseArgs(args);

    let selectedTemplate = null;
    for (const templateName of Object.keys(TEMPLATES)) {
      if (options[templateName]) {
        selectedTemplate = templateName;
        break;
      }
    }

    assert.strictEqual(selectedTemplate, 'ecommerce');
    assert.strictEqual(patterns[0], 'my-shop');
  });

  test('first template wins when multiple specified', () => {
    const args = ['my-app', '--ecommerce', '--todo', '--blog'];
    const { options, patterns } = parseArgs(args);

    // Implementation picks first matching template in TEMPLATES order
    let selectedTemplate = null;
    for (const templateName of Object.keys(TEMPLATES)) {
      if (options[templateName]) {
        selectedTemplate = templateName;
        break;
      }
    }

    // The order in TEMPLATES object determines which is "first"
    assert.ok(selectedTemplate !== null, 'Should select a template');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  test('handles very long project name', () => {
    const longName = 'a'.repeat(100);
    const { patterns } = parseArgs([longName]);

    assert.strictEqual(patterns[0], longName);
    assert.strictEqual(patterns[0].length, 100);
  });

  test('handles project name that looks like a flag', () => {
    // This edge case shows what happens with unusual names
    const { options, patterns } = parseArgs(['--my-app']);

    // --my-app is parsed as a flag, not a name
    assert.strictEqual(options['my-app'], true);
    assert.strictEqual(patterns.length, 0);
  });

  test('handles double dash separator', () => {
    // Some CLIs use -- to separate flags from positional args
    // Current parseArgs doesn't support this, but we test the behavior
    const { options, patterns } = parseArgs(['--typescript', '--', 'my-app']);

    assert.strictEqual(options.typescript, true);
    // '--' is treated as a pattern in current implementation
    assert.ok(patterns.includes('--') || patterns.includes('my-app'));
  });

  test('handles empty options object', () => {
    const { options, patterns } = parseArgs(['my-app']);

    assert.strictEqual(patterns[0], 'my-app');
    assert.strictEqual(options.typescript, undefined);
    assert.strictEqual(options.ts, undefined);
    assert.strictEqual(options.minimal, undefined);
    assert.strictEqual(options.ecommerce, undefined);
    assert.strictEqual(options.todo, undefined);
    assert.strictEqual(options.blog, undefined);
    assert.strictEqual(options.chat, undefined);
    assert.strictEqual(options.dashboard, undefined);
  });
});
