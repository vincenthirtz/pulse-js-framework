#!/usr/bin/env node
/**
 * Module Scaffolder
 *
 * Generates new modules from architect-approved templates, following
 * all project conventions (naming, structure, exports, error handling).
 *
 * Usage:
 *   node scaffold-module.js runtime/my-feature.js
 *   node scaffold-module.js MyComponent --type component
 *   node scaffold-module.js runtime/my-feature.js --pattern hook
 *   node scaffold-module.js runtime/my-feature.js --pattern factory
 *
 * Types:
 *   module (default) - Runtime module with createX/useX functions
 *   component - UI component function returning DOM elements
 *
 * Patterns:
 *   hook (default) - useX() pattern (reactive state + execute)
 *   factory - createX() pattern (instance with methods)
 *   both - Both createX() and useX()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse args
const args = process.argv.slice(2);
let target = null;
let type = 'module';
let pattern = 'hook';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    type = args[++i];
  } else if (args[i] === '--pattern' && args[i + 1]) {
    pattern = args[++i];
  } else if (!args[i].startsWith('--')) {
    target = args[i];
  }
}

if (!target) {
  console.error('Usage: scaffold-module.js <path-or-name> [--type module|component] [--pattern hook|factory|both]');
  console.error('');
  console.error('Examples:');
  console.error('  node scaffold-module.js runtime/my-feature.js');
  console.error('  node scaffold-module.js MyWidget --type component');
  console.error('  node scaffold-module.js runtime/cache.js --pattern factory');
  process.exit(1);
}

// Derive names
let outputPath;
let moduleName;
let kebabName;

if (target.includes('/') || target.includes('.js')) {
  // Path given: runtime/my-feature.js
  outputPath = path.join(projectRoot, target.endsWith('.js') ? target : target + '.js');
  const basename = path.basename(target, '.js');
  kebabName = basename;
  moduleName = basename
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
} else {
  // Name given: MyFeature
  moduleName = target.charAt(0).toUpperCase() + target.slice(1);
  kebabName = target.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  if (type === 'component') {
    outputPath = path.join(projectRoot, 'src', 'components', `${moduleName}.js`);
  } else {
    outputPath = path.join(projectRoot, 'runtime', `${kebabName}.js`);
  }
}

const camelName = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);

// Check existing
if (fs.existsSync(outputPath)) {
  console.error(`\u2718 File already exists: ${path.relative(projectRoot, outputPath)}`);
  console.error('Delete it first or choose a different name.');
  process.exit(1);
}

// Ensure parent directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Generate content based on type and pattern
let content;

if (type === 'component') {
  content = generateComponent(moduleName, camelName, kebabName);
} else if (pattern === 'factory') {
  content = generateFactory(moduleName, camelName, kebabName);
} else if (pattern === 'both') {
  content = generateBoth(moduleName, camelName, kebabName);
} else {
  content = generateHook(moduleName, camelName, kebabName);
}

function generateHook(Name, name, kebab) {
  return `/**
 * ${Name} - Pulse Framework
 *
 * TODO: Brief description of what this module does.
 *
 * @module runtime/${kebab}
 */

import { pulse, effect, computed, batch } from './pulse.js';

// ============================================================
// Constants & Configuration
// ============================================================

const DEFAULT_OPTIONS = {
  immediate: true,
};

// ============================================================
// Internal Helpers
// ============================================================

// ============================================================
// Public API
// ============================================================

/**
 * Reactive hook for ${Name}.
 *
 * @param {Function} handler - The handler function
 * @param {Object} [options] - Configuration options
 * @param {boolean} [options.immediate=true] - Execute immediately
 * @returns {Object} Reactive state and control methods
 *
 * @example
 * const { data, loading, error, execute } = use${Name}(
 *   () => fetchData(),
 *   { immediate: true }
 * );
 */
export function use${Name}(handler, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Reactive state
  const data = pulse(null);
  const loading = pulse(false);
  const error = pulse(null);

  // Internal state
  let disposed = false;

  async function execute(...args) {
    if (disposed) return;
    loading.set(true);
    error.set(null);
    try {
      const result = await handler(...args);
      if (!disposed) data.set(result);
    } catch (err) {
      if (!disposed) error.set(err);
    } finally {
      if (!disposed) loading.set(false);
    }
  }

  function reset() {
    batch(() => {
      data.set(null);
      loading.set(false);
      error.set(null);
    });
  }

  function dispose() {
    disposed = true;
  }

  // Auto-execute
  if (config.immediate) execute();

  return { data, loading, error, execute, reset, dispose };
}
`;
}

function generateFactory(Name, name, kebab) {
  return `/**
 * ${Name} - Pulse Framework
 *
 * TODO: Brief description of what this module does.
 *
 * @module runtime/${kebab}
 */

import { pulse, effect, computed, batch } from './pulse.js';

// ============================================================
// Constants & Configuration
// ============================================================

const DEFAULT_OPTIONS = {
  //
};

// ============================================================
// Internal Helpers
// ============================================================

// ============================================================
// Public API
// ============================================================

/**
 * Create a new ${Name} instance.
 *
 * @param {Object} [options] - Configuration options
 * @returns {Object} ${Name} instance with methods and reactive state
 *
 * @example
 * const instance = create${Name}({
 *   // options
 * });
 */
export function create${Name}(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Reactive state
  const state = pulse(null);

  // Interceptors
  const interceptors = {
    before: [],
    after: [],
  };

  // Core methods
  function execute(input) {
    // Apply before interceptors
    let processed = input;
    for (const fn of interceptors.before) {
      if (fn) processed = fn(processed);
    }

    // TODO: Core logic
    const result = processed;

    // Apply after interceptors
    let output = result;
    for (const fn of interceptors.after) {
      if (fn) output = fn(output);
    }

    state.set(output);
    return output;
  }

  function dispose() {
    interceptors.before.length = 0;
    interceptors.after.length = 0;
  }

  // Public API
  return {
    state,
    execute,
    dispose,
    interceptors: {
      before: {
        use: (fn) => { interceptors.before.push(fn); return interceptors.before.length - 1; },
        eject: (id) => { interceptors.before[id] = null; },
        clear: () => { interceptors.before.length = 0; },
      },
      after: {
        use: (fn) => { interceptors.after.push(fn); return interceptors.after.length - 1; },
        eject: (id) => { interceptors.after[id] = null; },
        clear: () => { interceptors.after.length = 0; },
      },
    },
  };
}
`;
}

function generateBoth(Name, name, kebab) {
  return `/**
 * ${Name} - Pulse Framework
 *
 * TODO: Brief description of what this module does.
 *
 * @module runtime/${kebab}
 */

import { pulse, effect, computed, batch } from './pulse.js';

// ============================================================
// Constants & Configuration
// ============================================================

const DEFAULT_OPTIONS = {
  //
};

// ============================================================
// Internal Helpers
// ============================================================

// ============================================================
// Factory API
// ============================================================

/**
 * Create a new ${Name} instance.
 *
 * @param {Object} [options] - Configuration options
 * @returns {Object} ${Name} instance
 */
export function create${Name}(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // TODO: Implementation

  return {
    // methods and state
    dispose() {},
  };
}

// ============================================================
// Reactive Hook API
// ============================================================

/**
 * Reactive hook for ${Name}.
 *
 * @param {Object} [options] - Configuration options
 * @returns {Object} Reactive state and control methods
 */
export function use${Name}(options = {}) {
  const instance = create${Name}(options);

  const data = pulse(null);
  const loading = pulse(false);
  const error = pulse(null);

  return {
    data,
    loading,
    error,
    ...instance,
  };
}
`;
}

function generateComponent(Name, name, kebab) {
  return `/**
 * ${Name} Component - Pulse Framework
 *
 * TODO: Brief description of this component.
 *
 * @param {Object} [props] - Component properties
 * @returns {Element} DOM element
 *
 * @example
 * const widget = ${Name}({ label: 'My Widget' });
 * mount('#app', widget);
 */

import { pulse, effect, computed } from 'pulse-js-framework/runtime/pulse';
import { el, when, list, cls } from 'pulse-js-framework/runtime/dom';

export function ${Name}(props = {}) {
  // Reactive state
  const isActive = pulse(props.defaultActive ?? false);

  // Derived state
  const label = computed(() =>
    isActive.get() ? 'Active' : 'Inactive'
  );

  // Event handlers
  function handleToggle() {
    isActive.update(v => !v);
  }

  // DOM structure
  return el('.${kebab}', {
    role: 'region',
    'aria-label': props.label || '${Name}',
  }, [
    el('button.${kebab}__toggle', {
      onclick: handleToggle,
      'aria-expanded': () => String(isActive.get()),
    }, () => label.get()),

    when(
      () => isActive.get(),
      () => el('.${kebab}__content', [
        // TODO: Component content
        el('p', 'Content goes here'),
      ])
    ),
  ]);
}
`;
}

// Write file
fs.writeFileSync(outputPath, content);

const relPath = path.relative(projectRoot, outputPath);
console.log('=== Module Scaffolded ===\n');
console.log(`\u2713 Created: ${relPath}`);
console.log(`  Name:    ${moduleName}`);
console.log(`  Type:    ${type}`);
console.log(`  Pattern: ${type === 'component' ? 'component' : pattern}`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit ${relPath} to implement the TODO sections`);
console.log(`  2. Add exports to package.json if public API`);
console.log(`  3. Create test: node .claude/skills/qa-testing/scripts/generate-test.js ${relPath}`);
console.log(`  4. Check conventions: node .claude/skills/senior-developer/scripts/check-conventions.js ${relPath}`);
console.log(`  5. Check architecture: node .claude/skills/software-architect/scripts/analyze-architecture.js ${relPath}`);
