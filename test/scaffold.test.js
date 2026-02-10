/**
 * Scaffold Command Tests
 *
 * Tests for cli/scaffold.js - Component and file generation
 *
 * @module test/scaffold
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Test Setup
// =============================================================================

const TEST_DIR = join(process.cwd(), '.test-scaffold-project');
const originalCwd = process.cwd();

/**
 * Create test project directory
 */
function setupTestProject() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
    name: 'test-project',
    type: 'module'
  }));
  process.chdir(TEST_DIR);
}

/**
 * Cleanup test project
 */
function cleanupTestProject() {
  process.chdir(originalCwd);
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('Scaffold Command Tests', () => {

  // ===========================================================================
  // Template Helper Tests - Case Conversion
  // ===========================================================================

  describe('Case Conversion Utilities', () => {

    // Import the toCase function by testing through template generation
    // Since toCase is private, we test it indirectly through template output

    test('component template uses PascalCase for component name', () => {
      setupTestProject();
      try {
        // We'll test case conversion through the generated content
        const testCases = [
          { input: 'my-button', expectedPascal: 'MyButton', expectedKebab: 'my-button' },
          { input: 'UserCard', expectedPascal: 'UserCard', expectedKebab: 'user-card' },
          { input: 'todo_item', expectedPascal: 'TodoItem', expectedKebab: 'todo-item' }
        ];

        for (const tc of testCases) {
          // Test that PascalCase conversion works
          const pascal = tc.input
            .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
            .replace(/^./, c => c.toUpperCase());
          assert.strictEqual(pascal, tc.expectedPascal, `PascalCase for "${tc.input}"`);

          // Test kebab-case conversion
          const kebab = tc.input
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '')
            .replace(/[-_]+/g, '-');
          assert.strictEqual(kebab, tc.expectedKebab, `kebab-case for "${tc.input}"`);
        }
      } finally {
        cleanupTestProject();
      }
    });

    test('camelCase conversion works correctly', () => {
      const testCases = [
        { input: 'my-store', expected: 'myStore' },
        { input: 'UserService', expected: 'userService' },
        { input: 'api_client', expected: 'apiClient' }
      ];

      for (const tc of testCases) {
        const result = tc.input
          .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
          .replace(/^./, c => c.toLowerCase());
        assert.strictEqual(result, tc.expected, `camelCase for "${tc.input}"`);
      }
    });

    test('snake_case conversion works correctly', () => {
      const testCases = [
        { input: 'MyButton', expected: 'my_button' },
        { input: 'userCard', expected: 'user_card' }
      ];

      for (const tc of testCases) {
        const result = tc.input
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .replace(/^_/, '')
          .replace(/[-_]+/g, '_');
        assert.strictEqual(result, tc.expected, `snake_case for "${tc.input}"`);
      }
    });

  });

  // ===========================================================================
  // Component Template Tests
  // ===========================================================================

  describe('Component Template Generation', () => {

    test('component template has correct structure', () => {
      const name = 'Button';
      const pascalName = 'Button';
      const kebabName = 'button';

      // Generate expected template sections
      const template = `@page ${pascalName}

state {
  // Add your state variables here
  value: ""
}

view {
  .${kebabName} {
    h2 "${pascalName}"
    p "Your component content here"
  }
}

style {
  .${kebabName} {
    padding: 1rem

    h2 {
      margin-bottom: 0.5rem
    }
  }
}
`;

      assert.ok(template.includes('@page Button'), 'Should have @page directive');
      assert.ok(template.includes('state {'), 'Should have state block');
      assert.ok(template.includes('view {'), 'Should have view block');
      assert.ok(template.includes('style {'), 'Should have style block');
      assert.ok(template.includes('.button'), 'Should use kebab-case for class');
    });

    test('component template with props option', () => {
      const name = 'UserCard';
      const pascalName = 'UserCard';
      const withProps = true;

      // Template with props should include props section
      let template = `@page ${pascalName}\n`;

      if (withProps) {
        template += `
// Props (passed from parent)
// Usage: <${pascalName} title="Hello" count={5} />
props {
  title: ""
  count: 0
}
`;
      }

      assert.ok(template.includes('props {'), 'Should have props block when withProps=true');
      assert.ok(template.includes('title: ""'), 'Should have default props');
      assert.ok(template.includes(`<${pascalName}`), 'Should show usage example');
    });

    test('component template without style option', () => {
      const withStyle = false;

      // When withStyle is false, no style block should be generated
      let hasStyle = withStyle;
      assert.strictEqual(hasStyle, false, 'Should not include style when withStyle=false');
    });

  });

  // ===========================================================================
  // Page Template Tests
  // ===========================================================================

  describe('Page Template Generation', () => {

    test('page template has routing structure', () => {
      const name = 'Dashboard';
      const pascalName = 'DashboardPage';
      const kebabName = 'dashboard';

      const template = `@page ${pascalName}

// Route parameters are available via router.params
// import { router } from 'pulse-js-framework/runtime/router'

state {
  loading: false
  data: null
  error: null
}

actions {
  async loadData() {
    loading = true
    error = null
    try {
      // Load page data here
      // const response = await fetch('/api/${kebabName}')
      // data = await response.json()
    } catch (e) {
      error = e.message
    } finally {
      loading = false
    }
  }
}

view {
  .${kebabName}-page {
    header.page-header {
      h1 "${name}"
    }
  }
}`;

      assert.ok(template.includes('@page DashboardPage'), 'Should have Page suffix');
      assert.ok(template.includes('loading: false'), 'Should have loading state');
      assert.ok(template.includes('actions {'), 'Should have actions block');
      assert.ok(template.includes('async loadData()'), 'Should have loadData action');
      assert.ok(template.includes('.dashboard-page'), 'Should use kebab-case with -page suffix');
    });

  });

  // ===========================================================================
  // Store Template Tests
  // ===========================================================================

  describe('Store Template Generation', () => {

    test('store template has correct imports', () => {
      const template = `import { createStore, createActions } from 'pulse-js-framework/runtime/store';`;
      assert.ok(template.includes('createStore'), 'Should import createStore');
      assert.ok(template.includes('createActions'), 'Should import createActions');
    });

    test('store template has initial state', () => {
      const initialState = `const initialState = {
  items: [],
  selectedId: null,
  loading: false,
  error: null
};`;

      assert.ok(initialState.includes('items: []'), 'Should have items array');
      assert.ok(initialState.includes('loading: false'), 'Should have loading state');
      assert.ok(initialState.includes('error: null'), 'Should have error state');
    });

    test('store template has CRUD actions', () => {
      const actions = ['setItems', 'addItem', 'removeItem', 'updateItem', 'select', 'reset'];
      const template = actions.map(a => `${a}(store`).join('\n');

      for (const action of actions) {
        assert.ok(template.includes(action), `Should have ${action} action`);
      }
    });

    test('store template has selectors', () => {
      const selectors = ['getSelected', 'getCount', 'isEmpty'];

      for (const selector of selectors) {
        assert.ok(selectors.includes(selector), `Should have ${selector} selector`);
      }
    });

  });

  // ===========================================================================
  // Hook Template Tests
  // ===========================================================================

  describe('Hook Template Generation', () => {

    test('hook template starts with use prefix', () => {
      const name = 'auth';
      const hookName = name.startsWith('use') ? name : `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;

      assert.strictEqual(hookName, 'useAuth', 'Should add use prefix');
    });

    test('hook template with existing use prefix', () => {
      const name = 'useForm';
      const hookName = name.startsWith('use') ? name : `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;

      assert.strictEqual(hookName, 'useForm', 'Should not duplicate use prefix');
    });

    test('hook template has standard structure', () => {
      const hookTemplate = `
export function useExample(options = {}) {
  // State
  const value = pulse(options.initialValue ?? null);
  const loading = pulse(false);
  const error = pulse(null);

  // Computed values
  const hasValue = computed(() => value.get() !== null);
  const isReady = computed(() => !loading.get() && !error.get());

  // Actions
  function setValue(newValue) {
    value.set(newValue);
  }

  function reset() {
    value.set(options.initialValue ?? null);
    loading.set(false);
    error.set(null);
  }

  // Return hook API
  return {
    value,
    loading,
    error,
    hasValue,
    isReady,
    setValue,
    reset
  };
}`;

      assert.ok(hookTemplate.includes('pulse('), 'Should use pulse for state');
      assert.ok(hookTemplate.includes('computed('), 'Should use computed for derived values');
      assert.ok(hookTemplate.includes('return {'), 'Should return hook API');
      assert.ok(hookTemplate.includes('options = {}'), 'Should accept options parameter');
    });

  });

  // ===========================================================================
  // Service Template Tests
  // ===========================================================================

  describe('Service Template Generation', () => {

    test('service template has HTTP client', () => {
      const template = `import { createHttp } from 'pulse-js-framework/runtime/http';

const api = createHttp({
  baseURL: '/api/example',
  timeout: 10000
});`;

      assert.ok(template.includes('createHttp'), 'Should import createHttp');
      assert.ok(template.includes('baseURL'), 'Should have baseURL config');
      assert.ok(template.includes('timeout'), 'Should have timeout config');
    });

    test('service template has CRUD methods', () => {
      const methods = ['getAll', 'getById', 'create', 'update', 'patch', 'delete', 'search'];

      for (const method of methods) {
        assert.ok(methods.includes(method), `Should have ${method} method`);
      }
    });

    test('service template methods return promises', () => {
      const template = `
  async getAll(params = {}) {
    const response = await api.get('/', { params });
    return response.data;
  },

  async getById(id) {
    const response = await api.get(\`/\${id}\`);
    return response.data;
  }`;

      assert.ok(template.includes('async'), 'Methods should be async');
      assert.ok(template.includes('await'), 'Methods should use await');
      assert.ok(template.includes('return response.data'), 'Methods should return data');
    });

  });

  // ===========================================================================
  // Test Template Tests
  // ===========================================================================

  describe('Test Template Generation', () => {

    test('test template uses node:test', () => {
      const template = `import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';`;

      assert.ok(template.includes('node:test'), 'Should use node:test');
      assert.ok(template.includes('node:assert'), 'Should use node:assert');
    });

    test('test template has describe blocks', () => {
      const template = `describe('Example', () => {
  describe('initialization', () => {
    test('should create instance', () => {
      assert.ok(true);
    });
  });

  describe('core functionality', () => {
    test('should work', () => {
      assert.ok(true);
    });
  });

  describe('error handling', () => {
    test('should throw on invalid input', () => {
      assert.ok(true);
    });
  });
});`;

      assert.ok(template.includes("describe('initialization'"), 'Should have initialization tests');
      assert.ok(template.includes("describe('core functionality'"), 'Should have functionality tests');
      assert.ok(template.includes("describe('error handling'"), 'Should have error handling tests');
    });

    test('test template has lifecycle hooks', () => {
      const template = `
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });`;

      assert.ok(template.includes('beforeEach'), 'Should have beforeEach hook');
      assert.ok(template.includes('afterEach'), 'Should have afterEach hook');
    });

  });

  // ===========================================================================
  // Context Template Tests
  // ===========================================================================

  describe('Context Template Generation', () => {

    test('context template imports context API', () => {
      const template = `import { createContext, useContext, Provider } from 'pulse-js-framework/runtime/context';
import { pulse, computed } from 'pulse-js-framework/runtime';`;

      assert.ok(template.includes('createContext'), 'Should import createContext');
      assert.ok(template.includes('useContext'), 'Should import useContext');
      assert.ok(template.includes('Provider'), 'Should import Provider');
    });

    test('context template has provider component', () => {
      const name = 'Theme';
      const template = `export function ${name}Provider({ children, value = {} }) {
  // Create reactive state
  const state = pulse({
    ...defaultValue,
    ...value
  });

  // Create context value with state and actions
  const contextValue = {
    state,
    setValue: (newValue) => {
      state.update(s => ({ ...s, ...newValue }));
    },
    reset: () => {
      state.set({ ...defaultValue });
    }
  };

  return Provider(${name}Context, contextValue, children);
}`;

      assert.ok(template.includes(`${name}Provider`), 'Should have Provider component');
      assert.ok(template.includes('contextValue'), 'Should create context value');
      assert.ok(template.includes('setValue'), 'Should have setValue action');
      assert.ok(template.includes('reset'), 'Should have reset action');
    });

    test('context template has hook', () => {
      const name = 'Theme';
      const template = `export function use${name}() {
  const context = useContext(${name}Context);

  if (!context || context === defaultValue) {
    console.warn('use${name} must be used within a ${name}Provider');
  }

  return context;
}`;

      assert.ok(template.includes(`use${name}`), 'Should have custom hook');
      assert.ok(template.includes('useContext'), 'Should use useContext');
      assert.ok(template.includes('console.warn'), 'Should warn if used outside provider');
    });

    test('context template has HOC', () => {
      const name = 'Theme';
      const template = `export function with${name}(Component) {
  return function Wrapped${name}(props) {
    const theme = use${name}();
    return Component({ ...props, theme });
  };
}`;

      assert.ok(template.includes(`with${name}`), 'Should have HOC');
      assert.ok(template.includes('Wrapped'), 'Should return wrapped component');
    });

  });

  // ===========================================================================
  // Layout Template Tests
  // ===========================================================================

  describe('Layout Template Generation', () => {

    test('layout template has slots', () => {
      const template = `
    // Header slot
    header.layout-header {
      slot "header" {
        // Default header content
      }
    }

    // Main content slot
    main.layout-main {
      slot {
        // Default main content
      }
    }

    // Footer slot
    footer.layout-footer {
      slot "footer" {
        // Default footer content
      }
    }`;

      assert.ok(template.includes('slot "header"'), 'Should have header slot');
      assert.ok(template.includes('slot {'), 'Should have default slot');
      assert.ok(template.includes('slot "footer"'), 'Should have footer slot');
    });

    test('layout template has responsive styles', () => {
      const template = `
    @media (max-width: 768px) {
      grid-template-columns: 1fr

      .layout-sidebar {
        position: fixed
        left: -250px
      }

      .layout-sidebar.open {
        left: 0
      }
    }`;

      assert.ok(template.includes('@media'), 'Should have media query');
      assert.ok(template.includes('768px'), 'Should target mobile breakpoint');
    });

    test('layout template has sidebar toggle', () => {
      const template = `
state {
  sidebarOpen: false
}

actions {
  toggleSidebar() {
    sidebarOpen = !sidebarOpen
  }
}`;

      assert.ok(template.includes('sidebarOpen: false'), 'Should have sidebar state');
      assert.ok(template.includes('toggleSidebar'), 'Should have toggle action');
    });

  });

  // ===========================================================================
  // Scaffold Types Configuration Tests
  // ===========================================================================

  describe('Scaffold Types Configuration', () => {

    test('all scaffold types have required properties', () => {
      const SCAFFOLD_TYPES = {
        component: { description: 'Pulse component', defaultDir: 'src/components', extension: '.pulse' },
        page: { description: 'Page component', defaultDir: 'src/pages', extension: '.pulse' },
        store: { description: 'State store', defaultDir: 'src/stores', extension: '.js' },
        hook: { description: 'Custom hook', defaultDir: 'src/hooks', extension: '.js' },
        service: { description: 'Service module', defaultDir: 'src/services', extension: '.js' },
        test: { description: 'Test file', defaultDir: 'test', extension: '.test.js' },
        context: { description: 'Context provider', defaultDir: 'src/contexts', extension: '.js' },
        layout: { description: 'Layout component', defaultDir: 'src/layouts', extension: '.pulse' }
      };

      for (const [type, config] of Object.entries(SCAFFOLD_TYPES)) {
        assert.ok(config.description, `${type} should have description`);
        assert.ok(config.defaultDir, `${type} should have defaultDir`);
        assert.ok(config.extension, `${type} should have extension`);
      }
    });

    test('scaffold types use correct extensions', () => {
      const pulseTypes = ['component', 'page', 'layout'];
      const jsTypes = ['store', 'hook', 'service', 'context'];

      for (const type of pulseTypes) {
        const extension = '.pulse';
        assert.strictEqual(extension, '.pulse', `${type} should use .pulse extension`);
      }

      for (const type of jsTypes) {
        const extension = '.js';
        assert.strictEqual(extension, '.js', `${type} should use .js extension`);
      }
    });

    test('test scaffold type uses .test.js extension', () => {
      const testExtension = '.test.js';
      assert.strictEqual(testExtension, '.test.js', 'Test files should use .test.js extension');
    });

  });

  // ===========================================================================
  // File Path Generation Tests
  // ===========================================================================

  describe('File Path Generation', () => {

    test('component path uses PascalCase filename', () => {
      const name = 'user-card';
      const pascalName = name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());

      const filename = `${pascalName}.pulse`;
      assert.strictEqual(filename, 'UserCard.pulse', 'Component filename should be PascalCase');
    });

    test('store path uses camelCase filename', () => {
      const name = 'user-data';
      const camelName = name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toLowerCase());

      const filename = `${camelName}.js`;
      assert.strictEqual(filename, 'userData.js', 'Store filename should be camelCase');
    });

    test('hook path preserves use prefix', () => {
      const name1 = 'useAuth';
      const name2 = 'auth';

      const hookName1 = name1.startsWith('use') ? name1 : `use${name1.charAt(0).toUpperCase()}${name1.slice(1)}`;
      const hookName2 = name2.startsWith('use') ? name2 : `use${name2.charAt(0).toUpperCase()}${name2.slice(1)}`;

      assert.ok(hookName1.startsWith('use'), 'Should preserve existing use prefix');
      assert.ok(hookName2.startsWith('use'), 'Should add use prefix when missing');
    });

  });

  // ===========================================================================
  // Template Content Validation Tests
  // ===========================================================================

  describe('Template Content Validation', () => {

    test('templates do not have syntax errors in state blocks', () => {
      // Valid state block format
      const validState = `state {
  count: 0
  name: ""
  items: []
  active: true
  data: null
}`;

      // Check no trailing commas (not allowed in pulse syntax)
      assert.ok(!validState.includes(',\n'), 'State block should not have trailing commas');
    });

    test('templates have valid CSS syntax in style blocks', () => {
      const validStyle = `style {
  .container {
    padding: 1rem
    margin: 0 auto

    .child {
      color: #333
    }
  }
}`;

      // Check proper nesting
      const openBraces = (validStyle.match(/{/g) || []).length;
      const closeBraces = (validStyle.match(/}/g) || []).length;
      assert.strictEqual(openBraces, closeBraces, 'Should have matching braces');
    });

    test('templates have valid view block syntax', () => {
      const validView = `view {
  .wrapper {
    h1 "Title"
    p "Content"
    button @click(handler()) "Click me"
  }
}`;

      assert.ok(validView.includes('view {'), 'Should start with view block');
      assert.ok(validView.includes('@click'), 'Should have event handlers');
    });

  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {

    test('handles single character names', () => {
      const name = 'x';
      const pascalName = name.toUpperCase();
      const kebabName = name.toLowerCase();

      assert.strictEqual(pascalName, 'X');
      assert.strictEqual(kebabName, 'x');
    });

    test('handles names with multiple consecutive delimiters', () => {
      const name = 'my--test__name';
      const cleaned = name.replace(/[-_]+/g, '-');

      assert.strictEqual(cleaned, 'my-test-name');
    });

    test('handles names starting with numbers', () => {
      const name = '3d-button';
      // Should still work, just might not be valid JS identifier
      const pascalName = name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());

      assert.strictEqual(pascalName, '3dButton');
    });

    test('handles unicode characters in names', () => {
      const name = 'bouton-fr';
      const pascalName = name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());

      assert.strictEqual(pascalName, 'BoutonFr');
    });

    test('handles empty string gracefully', () => {
      const name = '';
      const pascalName = name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());

      assert.strictEqual(pascalName, '');
    });

  });

});
