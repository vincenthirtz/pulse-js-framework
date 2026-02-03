/**
 * Pulse CLI - Scaffold Command
 * Generate components, pages, stores, and other project files
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, relative, basename } from 'path';
import { log } from './logger.js';
import { parseArgs } from './utils/file-utils.js';

/**
 * Scaffold types and their templates
 */
const SCAFFOLD_TYPES = {
  component: {
    description: 'Pulse component (.pulse file)',
    defaultDir: 'src/components',
    extension: '.pulse',
    template: generateComponentTemplate
  },
  page: {
    description: 'Page component with routing',
    defaultDir: 'src/pages',
    extension: '.pulse',
    template: generatePageTemplate
  },
  store: {
    description: 'State store module',
    defaultDir: 'src/stores',
    extension: '.js',
    template: generateStoreTemplate
  },
  hook: {
    description: 'Custom hook/composable',
    defaultDir: 'src/hooks',
    extension: '.js',
    template: generateHookTemplate
  },
  service: {
    description: 'Service/API module',
    defaultDir: 'src/services',
    extension: '.js',
    template: generateServiceTemplate
  },
  test: {
    description: 'Test file',
    defaultDir: 'test',
    extension: '.test.js',
    template: generateTestTemplate
  },
  context: {
    description: 'Context provider module',
    defaultDir: 'src/contexts',
    extension: '.js',
    template: generateContextTemplate
  },
  layout: {
    description: 'Layout component',
    defaultDir: 'src/layouts',
    extension: '.pulse',
    template: generateLayoutTemplate
  }
};

/**
 * Convert name to different cases
 */
function toCase(name, type) {
  // Remove extension if present
  name = name.replace(/\.(pulse|js|ts)$/, '');

  switch (type) {
    case 'pascal':
      return name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());
    case 'camel':
      return name
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toLowerCase());
    case 'kebab':
      return name
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
        .replace(/[-_]+/g, '-');
    case 'snake':
      return name
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/[-_]+/g, '_');
    default:
      return name;
  }
}

/**
 * Generate component template
 */
function generateComponentTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const kebabName = toCase(name, 'kebab');
  const { withState = true, withStyle = true, withProps = false } = options;

  let template = `@page ${pascalName}\n`;

  // Props section if requested
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

  // State section
  if (withState) {
    template += `
state {
  // Add your state variables here
  value: ""
}
`;
  }

  // View section
  template += `
view {
  .${kebabName} {
    h2 "${pascalName}"
    p "Your component content here"
${withProps ? `
    @if(title) {
      p.title "{title}"
    }` : ''}
  }
}
`;

  // Style section
  if (withStyle) {
    template += `
style {
  .${kebabName} {
    padding: 1rem

    h2 {
      margin-bottom: 0.5rem
    }
  }
}
`;
  }

  return template;
}

/**
 * Generate page template
 */
function generatePageTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const kebabName = toCase(name, 'kebab');

  return `@page ${pascalName}Page

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
      h1 "${pascalName}"
      // Breadcrumb, actions, etc.
    }

    @if(loading) {
      .loading-state {
        p "Loading..."
      }
    }

    @if(error) {
      .error-state {
        p.error "{error}"
        button @click(loadData()) "Retry"
      }
    }

    @if(!loading && !error) {
      main.page-content {
        // Page content here
        p "Welcome to ${pascalName} page"
      }
    }
  }
}

style {
  .${kebabName}-page {
    min-height: 100vh
    padding: 2rem

    .page-header {
      margin-bottom: 2rem

      h1 {
        font-size: 2rem
        margin: 0
      }
    }

    .page-content {
      max-width: 1200px
      margin: 0 auto
    }

    .loading-state,
    .error-state {
      text-align: center
      padding: 2rem
    }

    .error {
      color: #dc3545
    }
  }
}
`;
}

/**
 * Generate store template
 */
function generateStoreTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const camelName = toCase(name, 'camel');

  return `/**
 * ${pascalName} Store
 * State management for ${name}
 */

import { createStore, createActions } from 'pulse-js-framework/runtime/store';

/**
 * Initial state
 */
const initialState = {
  items: [],
  selectedId: null,
  loading: false,
  error: null
};

/**
 * Create the store with persistence (optional)
 */
export const ${camelName}Store = createStore(initialState, {
  persist: false,  // Set to true to persist to localStorage
  name: '${kebabName}'
});

/**
 * Store actions
 */
export const ${camelName}Actions = createActions(${camelName}Store, {
  /**
   * Set items
   * @param {Object} store - Store instance
   * @param {Array} items - Items to set
   */
  setItems(store, items) {
    store.items.set(items);
  },

  /**
   * Add an item
   * @param {Object} store - Store instance
   * @param {Object} item - Item to add
   */
  addItem(store, item) {
    store.items.update(items => [...items, item]);
  },

  /**
   * Remove an item by ID
   * @param {Object} store - Store instance
   * @param {string|number} id - Item ID to remove
   */
  removeItem(store, id) {
    store.items.update(items => items.filter(item => item.id !== id));
  },

  /**
   * Update an item
   * @param {Object} store - Store instance
   * @param {string|number} id - Item ID
   * @param {Object} updates - Fields to update
   */
  updateItem(store, id, updates) {
    store.items.update(items =>
      items.map(item => item.id === id ? { ...item, ...updates } : item)
    );
  },

  /**
   * Select an item
   * @param {Object} store - Store instance
   * @param {string|number|null} id - Item ID to select
   */
  select(store, id) {
    store.selectedId.set(id);
  },

  /**
   * Set loading state
   * @param {Object} store - Store instance
   * @param {boolean} loading - Loading state
   */
  setLoading(store, loading) {
    store.loading.set(loading);
  },

  /**
   * Set error
   * @param {Object} store - Store instance
   * @param {string|null} error - Error message
   */
  setError(store, error) {
    store.error.set(error);
  },

  /**
   * Clear all data
   * @param {Object} store - Store instance
   */
  reset(store) {
    store.items.set([]);
    store.selectedId.set(null);
    store.loading.set(false);
    store.error.set(null);
  }
});

/**
 * Selectors (computed values)
 */
export const ${camelName}Selectors = {
  /**
   * Get selected item
   */
  getSelected() {
    const items = ${camelName}Store.items.get();
    const selectedId = ${camelName}Store.selectedId.get();
    return items.find(item => item.id === selectedId) || null;
  },

  /**
   * Get item count
   */
  getCount() {
    return ${camelName}Store.items.get().length;
  },

  /**
   * Check if empty
   */
  isEmpty() {
    return ${camelName}Store.items.get().length === 0;
  }
};

// Export store parts for convenience
export const { items, selectedId, loading, error } = ${camelName}Store;
`;
}

/**
 * Generate hook template
 */
function generateHookTemplate(name, options = {}) {
  const camelName = toCase(name, 'camel');
  const hookName = camelName.startsWith('use') ? camelName : `use${toCase(name, 'pascal')}`;

  return `/**
 * ${hookName}
 * Custom hook for ${name}
 */

import { pulse, effect, computed } from 'pulse-js-framework/runtime';

/**
 * ${hookName}
 * @param {Object} options - Hook options
 * @returns {Object} Hook return value
 */
export function ${hookName}(options = {}) {
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

  function setLoading(isLoading) {
    loading.set(isLoading);
  }

  function setError(err) {
    error.set(err);
  }

  function reset() {
    value.set(options.initialValue ?? null);
    loading.set(false);
    error.set(null);
  }

  // Optional: Setup effects
  // effect(() => {
  //   const currentValue = value.get();
  //   // React to value changes
  // });

  // Return hook API
  return {
    // State (read-only pulses)
    value,
    loading,
    error,

    // Computed
    hasValue,
    isReady,

    // Actions
    setValue,
    setLoading,
    setError,
    reset
  };
}

export default ${hookName};
`;
}

/**
 * Generate service template
 */
function generateServiceTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const camelName = toCase(name, 'camel');

  return `/**
 * ${pascalName} Service
 * API and business logic for ${name}
 */

import { createHttp } from 'pulse-js-framework/runtime/http';

// Create HTTP client for this service
const api = createHttp({
  baseURL: '/api/${toCase(name, 'kebab')}',
  timeout: 10000
});

/**
 * ${pascalName} Service
 */
export const ${camelName}Service = {
  /**
   * Get all items
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>}
   */
  async getAll(params = {}) {
    const response = await api.get('/', { params });
    return response.data;
  },

  /**
   * Get item by ID
   * @param {string|number} id - Item ID
   * @returns {Promise<Object>}
   */
  async getById(id) {
    const response = await api.get(\`/\${id}\`);
    return response.data;
  },

  /**
   * Create new item
   * @param {Object} data - Item data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const response = await api.post('/', data);
    return response.data;
  },

  /**
   * Update item
   * @param {string|number} id - Item ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const response = await api.put(\`/\${id}\`, data);
    return response.data;
  },

  /**
   * Partial update item
   * @param {string|number} id - Item ID
   * @param {Object} data - Partial update data
   * @returns {Promise<Object>}
   */
  async patch(id, data) {
    const response = await api.patch(\`/\${id}\`, data);
    return response.data;
  },

  /**
   * Delete item
   * @param {string|number} id - Item ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await api.delete(\`/\${id}\`);
  },

  /**
   * Search items
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    const response = await api.get('/search', {
      params: { q: query, ...options }
    });
    return response.data;
  }
};

export default ${camelName}Service;
`;
}

/**
 * Generate test template
 */
function generateTestTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const camelName = toCase(name, 'camel');

  return `/**
 * ${pascalName} Tests
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Import the module to test
// import { ${camelName} } from '../src/${name}.js';

describe('${pascalName}', () => {
  let instance;

  beforeEach(() => {
    // Setup before each test
    instance = null;
  });

  afterEach(() => {
    // Cleanup after each test
    instance = null;
  });

  describe('initialization', () => {
    test('should create instance with default options', () => {
      // const result = ${camelName}();
      // assert.ok(result);
      assert.ok(true, 'placeholder');
    });

    test('should accept custom options', () => {
      // const result = ${camelName}({ custom: true });
      // assert.strictEqual(result.custom, true);
      assert.ok(true, 'placeholder');
    });
  });

  describe('core functionality', () => {
    test('should perform main operation', () => {
      // Add your test here
      assert.ok(true, 'placeholder');
    });

    test('should handle edge cases', () => {
      // Add your test here
      assert.ok(true, 'placeholder');
    });
  });

  describe('error handling', () => {
    test('should throw on invalid input', () => {
      // assert.throws(() => ${camelName}(null), { message: /invalid/i });
      assert.ok(true, 'placeholder');
    });
  });
});
`;
}

/**
 * Generate context template
 */
function generateContextTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const camelName = toCase(name, 'camel');

  return `/**
 * ${pascalName} Context
 * Context provider for ${name}
 */

import { createContext, useContext, Provider } from 'pulse-js-framework/runtime/context';
import { pulse, computed } from 'pulse-js-framework/runtime';

/**
 * Default context value
 */
const defaultValue = {
  // Add default state here
};

/**
 * Create the context
 */
export const ${pascalName}Context = createContext(defaultValue, {
  displayName: '${pascalName}Context'
});

/**
 * ${pascalName} Provider Component
 * @param {Object} props - Provider props
 * @param {Function} props.children - Child render function
 * @param {Object} props.value - Override context value
 */
export function ${pascalName}Provider({ children, value = {} }) {
  // Create reactive state
  const state = pulse({
    ...defaultValue,
    ...value
  });

  // Create context value with state and actions
  const contextValue = {
    state,

    // Actions
    setValue: (newValue) => {
      state.update(s => ({ ...s, ...newValue }));
    },

    reset: () => {
      state.set({ ...defaultValue });
    }
  };

  return Provider(${pascalName}Context, contextValue, children);
}

/**
 * Hook to use ${pascalName} context
 * @returns {Object} Context value
 */
export function use${pascalName}() {
  const context = useContext(${pascalName}Context);

  if (!context || context === defaultValue) {
    console.warn('use${pascalName} must be used within a ${pascalName}Provider');
  }

  return context;
}

/**
 * Higher-order component to inject context
 * @param {Function} Component - Component to wrap
 * @returns {Function} Wrapped component
 */
export function with${pascalName}(Component) {
  return function Wrapped${pascalName}(props) {
    const ${camelName} = use${pascalName}();
    return Component({ ...props, ${camelName} });
  };
}

export default ${pascalName}Context;
`;
}

/**
 * Generate layout template
 */
function generateLayoutTemplate(name, options = {}) {
  const pascalName = toCase(name, 'pascal');
  const kebabName = toCase(name, 'kebab');

  return `@page ${pascalName}Layout

// Layout component with slots for header, main content, and footer

state {
  sidebarOpen: false
}

actions {
  toggleSidebar() {
    sidebarOpen = !sidebarOpen
  }
}

view {
  .${kebabName}-layout {
    // Header slot
    header.layout-header {
      slot "header" {
        // Default header content
        nav {
          a[href="/"] "Home"
        }
      }

      button.menu-toggle @click(toggleSidebar()) {
        span.sr-only "Toggle menu"
        span.icon "☰"
      }
    }

    // Sidebar (optional)
    aside.layout-sidebar[class.open=sidebarOpen] {
      slot "sidebar" {
        // Default sidebar content
        nav {
          ul {
            li { a[href="/"] "Dashboard" }
            li { a[href="/settings"] "Settings" }
          }
        }
      }
    }

    // Main content slot
    main.layout-main {
      slot {
        // Default main content
        p "Content goes here"
      }
    }

    // Footer slot
    footer.layout-footer {
      slot "footer" {
        // Default footer content
        p "© 2024"
      }
    }
  }
}

style {
  .${kebabName}-layout {
    display: grid
    grid-template-rows: auto 1fr auto
    grid-template-columns: auto 1fr
    min-height: 100vh

    .layout-header {
      grid-column: 1 / -1
      display: flex
      justify-content: space-between
      align-items: center
      padding: 1rem 2rem
      background: #f5f5f5
      border-bottom: 1px solid #ddd

      nav a {
        margin-right: 1rem
        text-decoration: none
        color: #333
      }

      .menu-toggle {
        display: none
        background: none
        border: none
        font-size: 1.5rem
        cursor: pointer
      }
    }

    .layout-sidebar {
      width: 250px
      padding: 1rem
      background: #fafafa
      border-right: 1px solid #eee

      nav ul {
        list-style: none
        padding: 0
        margin: 0
      }

      nav li {
        margin-bottom: 0.5rem
      }

      nav a {
        display: block
        padding: 0.5rem
        text-decoration: none
        color: #333
        border-radius: 4px
      }

      nav a:hover {
        background: #eee
      }
    }

    .layout-main {
      padding: 2rem
      overflow-y: auto
    }

    .layout-footer {
      grid-column: 1 / -1
      padding: 1rem 2rem
      background: #f5f5f5
      border-top: 1px solid #ddd
      text-align: center
    }

    .sr-only {
      position: absolute
      width: 1px
      height: 1px
      padding: 0
      margin: -1px
      overflow: hidden
      clip: rect(0, 0, 0, 0)
      border: 0
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr

      .layout-header .menu-toggle {
        display: block
      }

      .layout-sidebar {
        position: fixed
        left: -250px
        top: 0
        height: 100vh
        z-index: 100
        transition: left 0.3s ease
      }

      .layout-sidebar.open {
        left: 0
      }
    }
  }
}
`;
}

/**
 * Main scaffold command handler
 */
export async function runScaffold(args) {
  const { options, patterns } = parseArgs(args);

  // Parse arguments
  const type = patterns[0];
  const name = patterns[1];

  // Show help if no type provided
  if (!type) {
    showScaffoldHelp();
    return;
  }

  // Check if type is valid
  if (!SCAFFOLD_TYPES[type]) {
    log.error(`Unknown scaffold type: ${type}`);
    log.info('\nAvailable types:');
    for (const [key, info] of Object.entries(SCAFFOLD_TYPES)) {
      log.info(`  ${key.padEnd(12)} - ${info.description}`);
    }
    process.exit(1);
  }

  // Check if name is provided
  if (!name) {
    log.error(`Please provide a name for the ${type}.`);
    log.info(`\nUsage: pulse scaffold ${type} <name>`);
    process.exit(1);
  }

  const scaffoldType = SCAFFOLD_TYPES[type];

  // Determine output directory
  const dir = options.dir || options.d || scaffoldType.defaultDir;

  // Determine file name
  const fileName = toCase(name, type === 'component' || type === 'page' || type === 'layout' ? 'pascal' : 'camel');
  const fullPath = join(process.cwd(), dir, fileName + scaffoldType.extension);

  // Check if file already exists
  if (existsSync(fullPath) && !options.force && !options.f) {
    log.error(`File already exists: ${relative(process.cwd(), fullPath)}`);
    log.info('Use --force to overwrite.');
    process.exit(1);
  }

  // Generate content
  const content = scaffoldType.template(name, {
    withState: options.state !== false,
    withStyle: options.style !== false,
    withProps: options.props || false
  });

  // Create directory if needed
  const outputDir = dirname(fullPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  writeFileSync(fullPath, content);

  log.success(`Created ${type}: ${relative(process.cwd(), fullPath)}`);

  // Show next steps
  if (type === 'component' || type === 'page' || type === 'layout') {
    log.info(`\nImport it in your app:`);
    log.info(`  import ${toCase(name, 'pascal')} from './${dir}/${fileName}${scaffoldType.extension}'`);
  }
}

/**
 * Show scaffold help
 */
function showScaffoldHelp() {
  log.info(`
Pulse Scaffold - Generate project files

Usage: pulse scaffold <type> <name> [options]

Types:
`);

  for (const [key, info] of Object.entries(SCAFFOLD_TYPES)) {
    log.info(`  ${key.padEnd(12)} ${info.description}`);
  }

  log.info(`
Options:
  --dir, -d <path>   Output directory (default: based on type)
  --force, -f        Overwrite existing files
  --props            Include props section (components)
  --no-state         Skip state section
  --no-style         Skip style section

Examples:
  pulse scaffold component Button
  pulse scaffold component UserCard --props
  pulse scaffold page Dashboard
  pulse scaffold store user
  pulse scaffold hook useAuth
  pulse scaffold service api
  pulse scaffold context Theme
  pulse scaffold layout Admin --dir src/layouts
  pulse scaffold test Button

Output Directories:
  component  -> src/components/
  page       -> src/pages/
  store      -> src/stores/
  hook       -> src/hooks/
  service    -> src/services/
  context    -> src/contexts/
  layout     -> src/layouts/
  test       -> test/
  `);
}
