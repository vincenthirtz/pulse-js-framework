---
name: senior-developer
description: Senior developer agent for the Pulse JS framework. Use this skill to implement features, fix bugs, write production code, and refactor modules. Strictly follows the software architect's decisions (ADRs, design principles, API conventions). Handles runtime modules, compiler code, CLI commands, and build tool integrations with emphasis on code quality, performance, and framework consistency.
---

# Senior Developer for Pulse Framework

## When to Use This Skill

- Implementing a new feature or module designed by the architect
- Fixing bugs in runtime, compiler, CLI, or loader code
- Refactoring existing code while preserving API contracts
- Adding or modifying public API functions
- Implementing reactive state, DOM helpers, or hooks
- Writing compiler transformations (lexer/parser/transformer)
- Adding CLI commands or subcommands
- Creating build tool integrations (Vite, Webpack, Rollup, etc.)
- Performance optimization of existing modules
- Resolving merge conflicts or integration issues

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | Coding standards rules, component/module templates |
| **scripts/** | Convention checker, module scaffolder |
| **references/** | Implementation patterns, code conventions, debugging guide |

## Architect Compliance: Mandatory Rules

**Every line of code MUST respect the architect's decisions.** Before implementing, verify:

### Layer Boundaries (NEVER violate)

```
✓ runtime/ → imports only from runtime/
✓ compiler/ → imports from compiler/ and runtime/errors.js only
✓ cli/ → imports from compiler/, cli/, and Node.js built-ins
✓ loader/ → imports from compiler/ and build tool APIs

✗ runtime/ → NEVER import from cli/, compiler/, loader/
✗ runtime/ → NEVER import Node.js built-ins (fs, path, os, etc.)
```

### API Naming (ALWAYS follow)

```javascript
// Factories: create + Thing
export function createRouter(options) { }
export function createStore(initialState) { }

// Hooks: use + Capability
export function useAsync(fetcher, options) { }
export function useForm(values, schema, handlers) { }

// Toggles: enable/disable + Feature
export function enableDevTools(options) { }
export function disableAutoTimeline() { }

// Config: configure + Module
export function configureA11y(options) { }
export function configureDom(options) { }
```

### Return Patterns (ALWAYS follow)

```javascript
// Hooks → return reactive object with Pulse instances
function useAsync(fn) {
  return {
    data: pulse(null),       // Pulse<T>
    loading: pulse(false),   // Pulse<boolean>
    error: pulse(null),      // Pulse<Error|null>
    execute: () => { },      // Function
    abort: () => { },        // Function
    reset: () => { }         // Function
  };
}

// Subscriptions → return disposer/cleanup function
function effect(fn) {
  // ...
  return dispose;  // () => void
}

// Factories → return instance with methods + reactive state
function createRouter(config) {
  return {
    path: pulse('/'),        // Reactive state
    params: pulse({}),       // Reactive state
    navigate(path) { },      // Method
    beforeEach(guard) { }    // Registration
  };
}

// Components → return DOM node(s)
function Counter() {
  return el('.counter', [
    el('h1', () => `Count: ${count.get()}`),
    el('button', { onclick: increment }, 'Add')
  ]);
}
```

### Error Handling (ALWAYS follow)

```javascript
// NEVER throw raw Error
throw new Error('something broke');  // ✗ WRONG

// ALWAYS use structured Pulse errors
import { Errors, RuntimeError } from 'pulse-js-framework/runtime/errors';

throw Errors.mountNotFound('#app');           // ✓ Pre-built
throw Errors.routeNotFound('/unknown');       // ✓ Pre-built
throw new RuntimeError('Custom issue', {      // ✓ Structured
  code: 'CUSTOM_ERROR',
  context: 'While processing X',
  suggestion: 'Try doing Y instead'
});
```

### Module Structure (ALWAYS follow)

```javascript
/**
 * ModuleName - Pulse Framework
 *
 * Brief description.
 *
 * @module runtime/module-name
 */

import { pulse, effect, computed, batch } from './pulse.js';

// ============================================================
// Constants & Configuration
// ============================================================

const DEFAULT_OPTIONS = { /* sensible defaults */ };

// ============================================================
// Internal Helpers (not exported)
// ============================================================

function _internalHelper() { /* ... */ }

// ============================================================
// Core Implementation
// ============================================================

export function createThing(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  // ...
}

export function useThing(config = {}) {
  // ...
}
```

## Quick Reference: Writing Code by Module Type

### Runtime Module (browser-safe)

```javascript
// ✓ DO: Use dom-adapter abstraction
import { getAdapter } from './dom-adapter.js';
const adapter = getAdapter();
const div = adapter.createElement('div');

// ✗ DON'T: Use document directly at module scope
const div = document.createElement('div');  // Breaks SSR

// ✓ DO: Feature-detect browser APIs
if (typeof window !== 'undefined' && window.IntersectionObserver) {
  // browser-only code
}

// ✓ DO: Use Pulse for reactive state
const state = pulse(initialValue);

// ✗ DON'T: Use plain variables for reactive state
let state = initialValue;  // Not reactive, UI won't update
```

### Compiler Code (build-time)

```javascript
// ✓ DO: Pure functions, clear input → output
export function transform(ast) {
  // AST in → JavaScript string out
  return { code, sourceMap };
}

// ✓ DO: Use structured errors with source location
throw new ParserError('Unexpected token', {
  line: token.line,
  column: token.column,
  file: options.filename,
  suggestion: 'Did you forget a closing brace?'
});

// ✗ DON'T: Import runtime modules (except errors.js)
import { pulse } from '../runtime/pulse.js';  // WRONG
```

### CLI Code (Node.js)

```javascript
// ✓ DO: Use Node.js built-ins
import fs from 'fs';
import path from 'path';

// ✓ DO: Exit with proper codes
process.exit(0);  // Success
process.exit(1);  // Error

// ✓ DO: Show clear user-facing output
console.log('\u2713 Build complete');
console.log('\u2718 Compilation failed: reason');

// ✗ DON'T: Import runtime modules for CLI logic
```

## Implementation Workflow

### Step 1: Read the ADR / Architect Decision

Before writing code, check if an Architecture Decision Record exists:

```bash
ls docs/adr/
# Read the relevant ADR for context on WHY the decision was made
```

### Step 2: Check Existing Patterns

Look at how similar features are implemented:

```bash
# Check conventions compliance
node .claude/skills/senior-developer/scripts/check-conventions.js runtime/new-module.js

# See how a similar module is structured
# Example: http.js for a new network module, form.js for a new input module
```

### Step 3: Implement Following the Template

```bash
# Scaffold a new runtime module from architect's template
node .claude/skills/senior-developer/scripts/scaffold-module.js runtime/my-module.js

# Or use the component template for UI components
node .claude/skills/senior-developer/scripts/scaffold-module.js MyComponent --type component
```

### Step 4: Verify Compliance

```bash
# Check conventions (naming, imports, exports, patterns)
node .claude/skills/senior-developer/scripts/check-conventions.js runtime/my-module.js

# Check architecture (layer violations, coupling)
node .claude/skills/software-architect/scripts/analyze-architecture.js runtime/my-module.js

# Run related tests
node --test test/my-module.test.js
```

## Available Scripts

```bash
# Check code against project conventions
node .claude/skills/senior-developer/scripts/check-conventions.js
node .claude/skills/senior-developer/scripts/check-conventions.js runtime/http.js
node .claude/skills/senior-developer/scripts/check-conventions.js --fix  # Show fix suggestions

# Scaffold a new module from template
node .claude/skills/senior-developer/scripts/scaffold-module.js runtime/my-feature.js
node .claude/skills/senior-developer/scripts/scaffold-module.js MyComponent --type component
```

## Code Patterns Cookbook

### Reactive Hook (most common pattern)

```javascript
export function useFeature(config = {}) {
  const options = { ...DEFAULTS, ...config };

  // Reactive state
  const data = pulse(options.initialData ?? null);
  const loading = pulse(false);
  const error = pulse(null);

  // Core logic
  async function execute(...args) {
    loading.set(true);
    error.set(null);
    try {
      const result = await options.fetcher(...args);
      data.set(result);
    } catch (err) {
      error.set(err);
      options.onError?.(err);
    } finally {
      loading.set(false);
    }
  }

  // Auto-execute if configured
  if (options.immediate) execute();

  // Cleanup
  function dispose() {
    // Cancel pending operations, unsubscribe, etc.
  }

  return { data, loading, error, execute, dispose };
}
```

### DOM Element with Reactive Bindings

```javascript
export function createWidget(options = {}) {
  const adapter = getAdapter();
  const isActive = pulse(false);

  const root = el('div.widget', {
    class: () => isActive.get() ? 'widget active' : 'widget',
    'aria-expanded': () => String(isActive.get())
  }, [
    el('button', {
      onclick: () => isActive.update(v => !v),
      'aria-label': options.label || 'Toggle'
    }, 'Toggle'),
    when(
      () => isActive.get(),
      () => el('.widget-content', options.content)
    )
  ]);

  return { element: root, isActive, dispose: () => { /* cleanup */ } };
}
```

### Effect with Proper Cleanup

```javascript
effect(() => {
  const handler = (e) => handleEvent(e);
  window.addEventListener('resize', handler);

  // Return cleanup function - runs before re-execution or on dispose
  return () => window.removeEventListener('resize', handler);
});
```

### Batch Multiple Updates

```javascript
function processApiResponse(response) {
  batch(() => {
    user.set(response.user);
    settings.set(response.settings);
    notifications.set(response.notifications);
  }); // Effects fire once, not three times
}
```

### Error with Source Context

```javascript
function parseExpression(token, source) {
  if (token.type !== 'IDENTIFIER') {
    throw new ParserError(`Expected identifier, got ${token.type}`, {
      line: token.line,
      column: token.column,
      file: source.filename,
      source: source.code,
      suggestion: `Replace '${token.value}' with a valid identifier name`
    });
  }
}
```

### Optional Feature Detection

```javascript
// For optional dependencies (sass, less, stylus)
function getSass() {
  try {
    return require('sass');  // eslint-disable-line
  } catch {
    return null;
  }
}

export function compileSassSync(scss, options = {}) {
  const sass = getSass();
  if (!sass) {
    console.warn('sass not installed. Run: npm install -D sass');
    return null;
  }
  return sass.compileString(scss, options);
}
```

## Code Quality Checklist

Before submitting code, verify:

- [ ] **Follows architect's decisions** - Checked ADR, used prescribed patterns
- [ ] **Named correctly** - `create*`, `use*`, `enable*`, `configure*`
- [ ] **Options as last param** - `fn(required, { optional })` with defaults
- [ ] **Returns disposer** - Effects, subscriptions, event listeners return cleanup
- [ ] **Reactive state uses Pulse** - Not plain variables for state that drives UI
- [ ] **No raw Error throws** - Uses `PulseError` subclasses with context + suggestion
- [ ] **No Node.js APIs in runtime** - No `fs`, `path`, `process` in runtime/
- [ ] **Uses dom-adapter** - No direct `document`/`window` at module scope
- [ ] **Tree-shakeable** - Named exports only, no module-level side effects
- [ ] **Private fields with #** - Internal state uses `#privateField` syntax
- [ ] **ES Modules** - `import`/`export`, not `require`/`module.exports`
- [ ] **Secure by default** - User input sanitized, `dangerous*` prefix for unsafe APIs
- [ ] **Accessible** - ARIA attributes, keyboard handling, screen reader support
- [ ] **Tested** - At minimum happy path + error path + edge case
- [ ] **No over-engineering** - Simplest solution that works, no speculative abstractions

## Performance Guidelines

### Signal Updates

```javascript
// ✗ SLOW: Multiple individual sets (N effect runs)
items.forEach(item => {
  item.status.set('processed');
});

// ✓ FAST: Batch into single update (1 effect run)
batch(() => {
  items.forEach(item => {
    item.status.set('processed');
  });
});
```

### Computed Values

```javascript
// ✗ SLOW: Expensive calculation in effect (runs on every change)
effect(() => {
  const sorted = items.get().sort((a, b) => a.name.localeCompare(b.name));
  renderList(sorted);
});

// ✓ FAST: Use computed to cache (only recalculates when items change)
const sorted = computed(() =>
  items.get().sort((a, b) => a.name.localeCompare(b.name))
);
effect(() => renderList(sorted.get()));
```

### List Rendering

```javascript
// ✗ SLOW: No key function (entire list re-renders)
list(() => items.get(), (item) => el('li', item.name));

// ✓ FAST: Key function enables LIS-based minimal DOM moves
list(() => items.get(), (item) => el('li', item.name), (item) => item.id);
```

### Avoid Tracking Unnecessary Dependencies

```javascript
effect(() => {
  const count = counter.get();              // Tracked (creates dependency)
  const config = untrack(() => cfg.get());  // Not tracked (no dependency)
  render(count, config);
});
```

## Reference Documentation

- **[implementation-patterns.md](references/implementation-patterns.md)** - Module-by-module implementation patterns
- **[code-conventions.md](references/code-conventions.md)** - Naming, formatting, file structure rules
- **[debugging-guide.md](references/debugging-guide.md)** - Common bugs, debugging tools, troubleshooting

## Key Files to Study

| Pattern | Study This File | For |
|---------|----------------|-----|
| Reactive hook | `runtime/async.js` | `useAsync`, `useResource`, `usePolling` |
| Factory + instance | `runtime/http.js` | `createHttp`, interceptors, child instances |
| DOM helper | `runtime/dom.js` | `el()`, `list()`, `when()`, reactive bindings |
| Compiler stage | `compiler/lexer.js` | Token types, scanning, error reporting |
| CLI command | `cli/index.js` | Argument parsing, command dispatch |
| Build integration | `loader/vite-plugin.js` | HMR, CSS extraction, transform hook |
| State management | `runtime/store.js` | `createStore`, plugins, persistence |
| Error handling | `runtime/errors.js` | Error classes, `formatWithSnippet()` |
| Security boundary | `runtime/utils.js` | Sanitization functions, XSS prevention |

## Quick Troubleshooting

| Problem | Cause | Solution |
|---------|-------|---------|
| Effect runs too many times | Missing `batch()` for multiple updates | Wrap related `set()` calls in `batch(() => { })` |
| UI doesn't update | State not wrapped in `pulse()` | Replace `let x = val` with `const x = pulse(val)` |
| Memory leak | Missing cleanup in effect | Return cleanup function from `effect(() => { return () => cleanup(); })` |
| SSR crashes | Direct `document` access | Use `getAdapter()` or `typeof window !== 'undefined'` check |
| Import error in browser | Node.js API in runtime | Move to CLI layer or use dynamic import with feature detection |
| `Cannot set computed` | Calling `.set()` on computed | Use `pulse()` for writable state, `computed()` is read-only |
| Circular dependency | Modules import each other | Extract shared code into a third module |
| Tests pollute each other | Shared reactive state | Use `createContext()` + `ctx.reset()` per test |
| Effect cleanup not running | Not returning function from effect | `effect(() => { ...; return () => cleanup(); })` |
| List re-renders entirely | Missing key function in `list()` | Add `(item) => item.id` as third arg to `list()` |
