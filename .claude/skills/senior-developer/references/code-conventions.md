# Code Conventions - Pulse JS Framework

## Overview

These are the mandatory coding conventions for all Pulse framework code. The `check-conventions.js` script validates these rules automatically.

## File Structure

### Module File Order

Every module file follows this order:

```javascript
/**
 * Module Name - Pulse Framework
 * Brief description.
 * @module layer/module-name
 */

// 1. Imports (grouped: framework → local → types)
import { pulse, effect, computed } from './pulse.js';
import { getAdapter } from './dom-adapter.js';

// 2. Constants & Configuration
const MAX_RETRIES = 3;
const DEFAULT_OPTIONS = { timeout: 5000 };

// 3. Internal helpers (prefixed with _ or in closure)
function _parseConfig(input) { /* ... */ }

// 4. Classes (if needed, prefer functions)
class FeatureError extends RuntimeError { /* ... */ }

// 5. Exported functions (public API)
export function createFeature(options) { /* ... */ }
export function useFeature(config) { /* ... */ }
```

### Import Order

```javascript
// 1. Node.js built-ins (CLI/compiler only)
import fs from 'fs';
import path from 'path';

// 2. Framework imports
import { pulse, effect, computed, batch } from './pulse.js';
import { el, mount, when, list } from './dom.js';
import { RuntimeError, Errors } from './errors.js';

// 3. Local module imports
import { _helper } from './internal-utils.js';
```

## Naming Conventions

### Functions

| Pattern | Convention | Example |
|---------|-----------|---------|
| Factory | `create` + Thing | `createRouter`, `createStore`, `createHttp` |
| Hook | `use` + Capability | `useAsync`, `useForm`, `useQuery` |
| Toggle on | `enable` + Feature | `enableDevTools`, `enableAutoTimeline` |
| Toggle off | `disable` + Feature | `disableA11yAudit`, `disableAutoTimeline` |
| Config | `configure` + Module | `configureA11y`, `configureDom` |
| Check | `is` + Condition | `isSSR`, `isNative`, `isContext` |
| Get | `get` + Thing | `getAdapter`, `getCacheMetrics`, `getSSRState` |
| Set | `set` + Thing | `setAdapter`, `setLogLevel`, `setDefaultClient` |
| Compile | `compile` + Source | `compileSass`, `compileLess`, `compileStylus` |
| Detect | `has`/`detect` + Syntax | `hasSassSyntax`, `detectPreprocessor` |

### Variables

```javascript
// Reactive state: noun (camelCase)
const count = pulse(0);
const userName = pulse('');
const isLoading = pulse(false);

// Computed: noun describing derived value
const doubledCount = computed(() => count.get() * 2);
const activeItems = computed(() => items.get().filter(i => i.active));

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 5;
const DEFAULT_TIMEOUT = 5000;
const TOKEN_TYPES = { IDENTIFIER: 'IDENTIFIER' };

// Private fields: # prefix (in classes)
class Router {
  #routes = new Map();
  #middleware = [];
}

// Internal helpers: _ prefix (in modules, not exported)
function _resolveRoute(path) { /* ... */ }
```

### Files

| Type | Convention | Example |
|------|-----------|---------|
| Runtime module | `kebab-case.js` | `dom-adapter.js`, `lru-cache.js` |
| Compiler module | `kebab-case.js` | `source-map.js` |
| CLI command | `kebab-case.js` | `file-utils.js` |
| Test file | `kebab-case.test.js` | `dom-adapter.test.js` |
| Template | `kebab-case.template` | `unit-test.template` |

## Function Signatures

### Options as Last Parameter

```javascript
// ✓ CORRECT: required args first, options object last
export function useAsync(fetcher, options = {}) { }
export function createHttp(options = {}) { }
export function list(source, renderFn, keyFn) { }

// ✗ WRONG: options in the middle
export function useAsync(options, fetcher) { }
```

### Destructured Defaults

```javascript
// ✓ CORRECT: merge with defaults
const DEFAULTS = { timeout: 5000, retries: 0 };

export function createClient(options = {}) {
  const config = { ...DEFAULTS, ...options };
  // use config.timeout, config.retries
}

// ✗ WRONG: destructure with inline defaults (harder to maintain)
export function createClient({ timeout = 5000, retries = 0 } = {}) { }
```

### Return Types

```javascript
// ✓ CORRECT: return plain object (not class instance)
export function useAsync(fn) {
  return { data, loading, error, execute, abort, reset };
}

// ✓ CORRECT: return cleanup/disposer function
export function effect(fn) {
  // ...
  return function dispose() { /* ... */ };
}

// ✗ WRONG: return class instance from hook
export function useAsync(fn) {
  return new AsyncState(fn);  // Don't use classes for hooks
}
```

## Error Handling

### Structured Errors Only

```javascript
// ✓ CORRECT: Structured error with code, context, suggestion
throw new ParserError('Unexpected token in state block', {
  code: 'PARSE_ERROR',
  line: 42,
  column: 10,
  file: 'App.pulse',
  context: 'While parsing state declarations',
  suggestion: 'Check for missing commas between state properties'
});

// ✓ CORRECT: Pre-built error factory
throw Errors.computedSet('totalPrice');
throw Errors.mountNotFound('#app');

// ✗ WRONG: Raw Error
throw new Error('Parse error at line 42');

// ✗ WRONG: String throw
throw 'something went wrong';
```

### Error Boundaries in Effects

```javascript
// Effects MUST use try-catch or onError option
effect(() => {
  try {
    riskyOperation();
  } catch (err) {
    errorState.set(err);
  }
});

// Or use the onError option
effect(() => riskyOperation(), {
  onError: (err) => errorState.set(err)
});
```

## Reactivity Rules

### Always Use .get() for Tracking

```javascript
// ✓ CORRECT: .get() creates dependency
effect(() => {
  console.log(count.get());  // Effect re-runs when count changes
});

// ✗ WRONG: .peek() doesn't create dependency
effect(() => {
  console.log(count.peek());  // Effect NEVER re-runs
});
```

### Batch Related Updates

```javascript
// ✓ CORRECT: Single effect run
batch(() => {
  firstName.set('John');
  lastName.set('Doe');
  age.set(30);
});

// ✗ WRONG: Three effect runs
firstName.set('John');  // effect runs
lastName.set('Doe');    // effect runs again
age.set(30);            // effect runs again
```

### Clean Up Effects

```javascript
// ✓ CORRECT: Return cleanup
effect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);  // Runs before re-execution and on dispose
});

// ✗ WRONG: No cleanup (memory leak)
effect(() => {
  setInterval(tick, 1000);  // Never cleaned up!
});
```

## DOM Rules

### Use Adapter, Not Global

```javascript
// ✓ CORRECT: Adapter abstraction (works in SSR)
import { getAdapter } from './dom-adapter.js';
const adapter = getAdapter();
const div = adapter.createElement('div');

// ✗ WRONG: Direct global (breaks SSR)
const div = document.createElement('div');
```

### Feature Detect Browser APIs

```javascript
// ✓ CORRECT: Guard browser APIs
if (typeof window !== 'undefined') {
  window.addEventListener('resize', handler);
}

// ✓ CORRECT: Feature detect specific APIs
if (typeof IntersectionObserver !== 'undefined') {
  const observer = new IntersectionObserver(callback);
}

// ✗ WRONG: Assume browser context
window.addEventListener('resize', handler);  // Crashes in SSR
```

### Key Functions in Lists

```javascript
// ✓ CORRECT: Unique, stable key
list(() => items.get(), renderItem, (item) => item.id);

// ✗ WRONG: Index as key (breaks on reorder)
list(() => items.get(), renderItem, (item, index) => index);

// ✗ WRONG: No key (full re-render)
list(() => items.get(), renderItem);
```

## Export Rules

### Named Exports Only

```javascript
// ✓ CORRECT: Named exports (tree-shakeable)
export function createRouter() { }
export function useAsync() { }

// ✗ WRONG: Default export (harder to tree-shake)
export default function createRouter() { }

// ✗ WRONG: Namespace re-export (imports everything)
export * from './sub-module.js';

// ✓ OK: Selective re-export
export { createRouter } from './router-core.js';
```

### No Module-Level Side Effects

```javascript
// ✓ CORRECT: Side effects inside functions
export function enableDevTools() {
  window.__PULSE_DEVTOOLS__ = { /* ... */ };
}

// ✗ WRONG: Side effect at module scope (breaks tree-shaking)
window.__PULSE_DEVTOOLS__ = { /* ... */ };  // Runs on import!
```

## Comment Conventions

### When to Comment

```javascript
// ✓ Comment non-obvious WHY, not obvious WHAT
// Use LIS algorithm for O(n log n) list reconciliation instead of
// naive O(n) approach to minimize DOM operations
function computeLIS(arr) { /* ... */ }

// ✗ Don't comment obvious code
// Set count to zero
count.set(0);

// ✓ Comment workarounds and edge cases
// Safari doesn't support AbortSignal.any() yet, fallback to manual tracking
if (!AbortSignal.any) { /* ... */ }
```

### JSDoc for Public API

```javascript
/**
 * Create an HTTP client with interceptors and retry support.
 *
 * @param {Object} options - Client configuration
 * @param {string} options.baseURL - Base URL for all requests
 * @param {number} [options.timeout=5000] - Request timeout in ms
 * @param {number} [options.retries=0] - Number of retry attempts
 * @returns {Object} HTTP client instance
 */
export function createHttp(options = {}) { }
```

## Formatting

- **Indentation**: 2 spaces
- **Semicolons**: Yes (mandatory)
- **Quotes**: Single quotes for strings
- **Trailing commas**: Yes (in multi-line arrays/objects)
- **Max line length**: 100 characters (soft limit)
- **Blank lines**: 1 between functions, 2 between sections
