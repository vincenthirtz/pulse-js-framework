# CLAUDE.md - Pulse Framework

## Project Overview

Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications (SPAs). It features:

- **Declarative DOM creation** using CSS selector syntax (`el('.container#main')`)
- **Signal-based reactivity** (pulsations) for automatic UI updates
- **Custom DSL** (.pulse files) that compile to JavaScript
- **Zero dependencies** - completely self-contained

**Version:** See package.json | **License:** MIT | **Node.js:** >= 18.0.0

## Quick Commands

```bash
# Run tests
npm test                # Run all tests (compiler, lint, format, analyze)

# CLI commands (via pulse binary)
pulse create <name>     # Create new Pulse project
pulse dev [port]        # Start dev server (default: 3000)
pulse build             # Build for production (minified)
pulse preview [port]    # Preview production build (default: 4173)
pulse compile <file>    # Compile .pulse file to .js

# Code Quality
pulse lint [files]      # Validate .pulse files for errors and style
pulse lint --fix        # Auto-fix fixable issues
pulse format [files]    # Format .pulse files consistently
pulse format --check    # Check formatting without writing (CI mode)
pulse analyze           # Analyze bundle size and dependencies
pulse analyze --json    # Output analysis as JSON
pulse analyze --verbose # Show detailed metrics
```

## Development Workflow

```bash
# Development
pulse dev               # Local server at http://localhost:3000

# Production
pulse build             # Generate minified dist/ folder
pulse preview           # Serve dist/ at http://localhost:4173
```

## Architecture

```
pulse/
├── runtime/              # Core framework
│   ├── pulse.js         # Reactivity system (signals, effects, computed)
│   ├── dom.js           # DOM creation and reactive bindings
│   ├── router.js        # SPA routing
│   └── store.js         # Global state management
├── compiler/            # .pulse file compiler
│   ├── lexer.js         # Tokenizer
│   ├── parser.js        # AST builder
│   ├── transformer.js   # Code generator
│   └── sourcemap.js     # V3 source map generation
├── cli/                 # Command-line interface
│   ├── index.js         # Main CLI, command handlers
│   ├── dev.js           # Dev server
│   ├── build.js         # Production build
│   ├── lint.js          # Semantic analyzer (lint command)
│   ├── format.js        # Code formatter (format command)
│   ├── analyze.js       # Bundle analyzer (analyze command)
│   └── utils/
│       └── file-utils.js  # Shared utilities (glob, parseArgs)
├── loader/
│   └── vite-plugin.js   # Vite integration
├── examples/            # Example apps (todo, chat, ecommerce, meteo)
├── test/                # Test suite
└── docs/                # Documentation site
```

## Core Patterns

### Reactivity (runtime/pulse.js)

```javascript
// Create reactive values
const count = pulse(0);
count.get();              // Read (tracks dependency)
count.peek();             // Read without tracking
count.set(5);             // Direct set
count.update(n => n + 1); // Functional update

// Effects auto-run when dependencies change
effect(() => console.log(count.get()));

// Computed values (derived state)
const doubled = computed(() => count.get() * 2);

// Batch updates (defer effects until complete)
batch(() => {
  count.set(1);
  count.set(2);
}); // Effects run once
```

### DOM Creation (runtime/dom.js)

```javascript
// CSS selector syntax
el('div.container#main')  // <div class="container" id="main">
el('input[type=text]')    // <input type="text">

// Reactive bindings
text(() => `Count: ${count.get()}`)
bind(el, 'class', () => isActive.get() ? 'active' : '')
on(el, 'click', handler)
model(input, pulseValue)  // Two-way binding

// Conditional & list rendering
when(() => loading.get(), () => el('.spinner'), () => el('.content'))
list(() => items.get(), (item) => el('li', item.name), item => item.id)
```

### Router (runtime/router.js)

```javascript
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/files/*path': FilePage,
    // Lazy loading with options
    '/dashboard': lazy(() => import('./Dashboard.js')),
    '/settings': lazy(() => import('./Settings.js'), {
      loading: () => el('.spinner'),
      error: (err) => el('.error', err.message),
      timeout: 5000
    }),
    '/admin': {
      handler: AdminPage,
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      },
      children: {
        '/users': AdminUsersPage,
        '/settings': SettingsPage
      }
    }
  },
  mode: 'history',
  scrollBehavior: (to, from, saved) => saved || { x: 0, y: 0 },
  // Middleware (Koa-style)
  middleware: [
    async (ctx, next) => {
      if (ctx.to.meta.requiresAuth && !isAuth()) {
        return ctx.redirect('/login');
      }
      await next();
    }
  ]
});

// Guards
router.beforeEach((to, from) => { /* global guard */ });
router.beforeResolve((to, from) => { /* after per-route guards */ });
router.afterEach((to) => { /* after navigation */ });

// Dynamic middleware
const unsubscribe = router.use(async (ctx, next) => { await next(); });

// Navigation
router.navigate('/users/123');
router.params.get();  // { id: '123' }
router.meta.get();    // { requiresAuth: true }
router.isActive('/admin'); // true/false
router.outlet('#app');

// Preload components
preload(lazy(() => import('./Dashboard.js')));
```

### Store (runtime/store.js)

```javascript
const store = createStore({ user: null, theme: 'light' }, { persist: true });
store.user.get();
store.user.set({ name: 'John' });

const actions = createActions(store, {
  toggleTheme: (store) => store.theme.update(t => t === 'light' ? 'dark' : 'light')
});
```

### Form (runtime/form.js)

```javascript
import { useForm, useField, useFieldArray, validators } from 'pulse-js-framework/runtime/form';

// Create a form with validation
const { fields, handleSubmit, isValid, errors, reset } = useForm(
  { email: '', password: '', confirmPassword: '' },
  {
    email: [validators.required(), validators.email()],
    password: [validators.required(), validators.minLength(8)],
    confirmPassword: [validators.required(), validators.matches('password', 'Passwords must match')]
  },
  {
    onSubmit: (values) => console.log('Submit:', values),
    onError: (errors) => console.log('Errors:', errors)
  }
);

// Bind to inputs
el('input', { value: fields.email.value.get(), onInput: fields.email.onChange, onBlur: fields.email.onBlur });
el('span.error', fields.email.error.get());

// Form state
isValid.get();        // true if all fields pass validation
errors.get();         // { email: 'Invalid email', ... }
fields.email.dirty.get();    // true if value changed from initial
fields.email.touched.get();  // true if field was blurred

// Built-in validators (sync)
validators.required(message?)
validators.minLength(length, message?)
validators.maxLength(length, message?)
validators.email(message?)
validators.url(message?)
validators.pattern(regex, message?)
validators.min(value, message?)
validators.max(value, message?)
validators.matches(fieldName, message?)
validators.custom((value, allValues) => true | 'error message')

// Async validators (for server-side checks)
validators.asyncCustom(async (value) => true | 'error', { debounce: 300 })
validators.asyncEmail(async (email) => isAvailable, message?, { debounce: 300 })
validators.asyncUnique(async (value) => isUnique, message?, { debounce: 300 })
validators.asyncServer(async (value) => null | 'error', { debounce: 300 })

// Field with async validation
const username = useField('', [
  validators.required(),
  validators.asyncUnique(async (value) => {
    const res = await fetch(`/api/check-username?q=${value}`);
    return (await res.json()).available;
  }, 'Username is taken')
]);
username.validating.get();  // true while async validation runs

// Form with async validation
const { isValidating } = useForm(initialValues, schema, options);
isValidating.get();  // true if any field is validating

// Single field outside form
const email = useField('', [validators.required(), validators.email()]);

// Dynamic field arrays
const tags = useFieldArray(['tag1'], [validators.required()]);
tags.append('tag2');
tags.remove(0);
tags.move(0, 1);
tags.fields.get().forEach(field => field.value.get());
```

### Async (runtime/async.js)

```javascript
import { useAsync, useResource, usePolling, createVersionedAsync } from 'pulse-js-framework/runtime/async';

// Basic async operation
const { data, loading, error, execute, reset, abort } = useAsync(
  () => fetch('/api/users').then(r => r.json()),
  {
    immediate: true,     // Execute on creation (default: true)
    initialData: null,   // Initial data value
    retries: 3,          // Retry on failure
    retryDelay: 1000,    // Delay between retries (ms)
    onSuccess: (data) => console.log('Got:', data),
    onError: (err) => console.error('Failed:', err)
  }
);

// Resource with caching (SWR pattern)
const users = useResource(
  'users',                                    // Cache key
  () => fetch('/api/users').then(r => r.json()),
  {
    refreshInterval: 30000,    // Auto-refresh every 30s
    refreshOnFocus: true,      // Refresh when window gains focus
    refreshOnReconnect: true,  // Refresh when network reconnects
    staleTime: 5000,           // Data considered fresh for 5s
    cacheTime: 300000          // Keep in cache for 5 min
  }
);

// Dynamic cache key (re-fetches when userId changes)
const userId = pulse(1);
const user = useResource(
  () => `user-${userId.get()}`,
  () => fetch(`/api/users/${userId.get()}`).then(r => r.json())
);

// Polling for live data
const { data, start, stop, isPolling } = usePolling(
  () => fetch('/api/status').then(r => r.json()),
  {
    interval: 5000,
    pauseOnHidden: true,   // Pause when tab hidden
    pauseOnOffline: true,  // Pause when offline
    maxErrors: 3           // Stop after 3 consecutive errors
  }
);
start();  // Begin polling
stop();   // Stop polling

// Race condition handling (low-level)
const controller = createVersionedAsync();
async function search(query) {
  const ctx = controller.begin();  // Invalidates previous operations
  const results = await searchApi(query);
  ctx.ifCurrent(() => setResults(results));  // Only runs if still current
}
```

### Native (runtime/native.js)

```javascript
import {
  isNativeAvailable, getPlatform, isNative,
  createNativeStorage, createDeviceInfo,
  NativeUI, NativeClipboard,
  onAppPause, onAppResume, onBackButton, onNativeReady,
  exitApp, minimizeApp
} from 'pulse-js-framework/runtime/native';

// Platform detection
isNativeAvailable();  // true if PulseMobile bridge exists
getPlatform();        // 'ios' | 'android' | 'web'
isNative();           // true if running in native app

// Reactive storage (auto-persists, works on web and native)
const storage = createNativeStorage('app_');
const theme = storage.get('theme', 'light');  // Returns a pulse
theme.set('dark');  // Auto-saves to storage
storage.remove('theme');
storage.clear();

// Device info
const device = createDeviceInfo();
device.info.get();      // { platform, userAgent, language, ... }
device.network.get();   // { connected: true, type: 'wifi' }
device.isOnline;        // true/false
device.platform;        // 'ios' | 'android' | 'web'

// Native UI
NativeUI.toast('Message saved!', isLong?);
NativeUI.vibrate(duration?);

// Clipboard
await NativeClipboard.copy('text');
const text = await NativeClipboard.read();

// App lifecycle
onAppPause(() => saveState());
onAppResume(() => refreshData());
onBackButton(() => handleBack());  // Android only
onNativeReady(({ platform }) => init());

// App control (native only)
exitApp();      // Android only
minimizeApp();
```

### HMR (runtime/hmr.js)

```javascript
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

const hmr = createHMRContext(import.meta.url);

// Preserve state across hot reloads
const count = hmr.preservePulse('count', 0);
const todos = hmr.preservePulse('todos', []);

// Setup effects with automatic cleanup
hmr.setup(() => {
  effect(() => {
    document.title = `${todos.get().length} todos`;
  });
});

// Accept HMR updates
hmr.accept();

// Custom dispose logic
hmr.dispose(() => {
  // Cleanup before module replacement
});
```

### .pulse DSL Format

```pulse
@page Counter

// Import components
import Button from './Button.pulse'
import { Icon } from './icons.pulse'

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    Button @click(count++) {
      Icon "plus"
      "Increment"
    }
    // Slot for component composition
    slot "actions"
    slot { "Default content" }
  }
}

style {
  // Styles are automatically scoped
  .counter { padding: 20px }
}
```

**Compiler features:**
- `import` statements (default, named, namespace)
- `slot` / `slot "name"` for content projection
- CSS scoping with unique class prefixes
- Error messages include line:column
- Source map generation for debugging

## Key Files

| File | Purpose |
|------|---------|
| `runtime/pulse.js` | Core reactivity (Pulse class, effect, computed, batch) |
| `runtime/dom.js` | DOM helpers (el, text, bind, on, model, list, when) |
| `runtime/router.js` | Router (createRouter, lazy, preload, middleware) |
| `runtime/store.js` | Store (createStore, createActions, plugins) |
| `runtime/form.js` | Form handling (useForm, useField, useFieldArray, validators) |
| `runtime/async.js` | Async primitives (useAsync, useResource, usePolling) |
| `runtime/native.js` | Native mobile bridge (storage, device, UI, lifecycle) |
| `runtime/hmr.js` | Hot module replacement (createHMRContext) |
| `compiler/lexer.js` | Tokenizer with 50+ token types |
| `compiler/parser.js` | AST builder for .pulse syntax |
| `compiler/transformer.js` | JavaScript code generator |
| `compiler/sourcemap.js` | V3 source map generation (VLQ encoding) |
| `cli/index.js` | CLI commands implementation |
| `cli/lint.js` | SemanticAnalyzer, LintRules for code validation |
| `cli/format.js` | PulseFormatter for consistent code style |
| `cli/analyze.js` | Bundle analysis, import graph, complexity metrics |
| `cli/utils/file-utils.js` | findPulseFiles, parseArgs, formatBytes |
| `examples/todo/src/main.js` | Best reference implementation |

## Code Conventions

- **ES Modules** throughout (`import`/`export`)
- **Private fields** using `#fieldName` syntax
- **Named exports** for all public APIs
- **camelCase** for functions, **PascalCase** for classes
- **No external dependencies** - everything is built-in
- Tests use Node.js built-in test runner (`node --test`)

## Export Map

```javascript
// Core reactivity
import { pulse, effect, computed, batch } from 'pulse-js-framework/runtime';

// DOM helpers
import { el, mount, on, text, bind, model, list, when } from 'pulse-js-framework/runtime';

// Router
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

// Store
import { createStore, createActions } from 'pulse-js-framework/runtime/store';

// Form
import { useForm, useField, useFieldArray, validators } from 'pulse-js-framework/runtime/form';

// Async
import { useAsync, useResource, usePolling, createVersionedAsync } from 'pulse-js-framework/runtime/async';

// Native (mobile)
import { createNativeStorage, createDeviceInfo, NativeUI, NativeClipboard } from 'pulse-js-framework/runtime/native';

// HMR
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

// Compiler
import { compile } from 'pulse-js-framework/compiler';

// Vite plugin
import pulsePlugin from 'pulse-js-framework/vite';
```

## Testing

Tests are in `test/` directory and cover the compiler (lexer, parser, transformer). Run with:

```bash
npm test
# or
node --test test/*.js
```

## Development Notes

- Vite integration is optional but recommended for projects
- The framework works directly in browsers without build step
- Circular dependency protection limits to 100 iterations
- Effects use try-catch to prevent one error from breaking others
- List rendering uses key functions for efficient DOM updates

## Error Codes

### Compiler Errors

| Code | Message | Cause |
|------|---------|-------|
| `PARSE_ERROR` | Unexpected token | Syntax error in .pulse file |
| `DUPLICATE_BLOCK` | Duplicate {block} block | Multiple state/view/style blocks |
| `INVALID_IMPORT` | Invalid import statement | Malformed import syntax |
| `UNCLOSED_BLOCK` | Unclosed {block} | Missing closing brace |
| `INVALID_DIRECTIVE` | Unknown directive @{name} | Unrecognized @ directive |

### Runtime Errors

| Code | Message | Cause |
|------|---------|-------|
| `CIRCULAR_DEPENDENCY` | Circular dependency detected | Effect triggers itself (max 100 iterations) |
| `INVALID_PULSE` | Expected Pulse instance | Passing non-pulse to reactive API |
| `MOUNT_ERROR` | Mount target not found | Invalid selector for mount() |
| `ROUTER_NO_MATCH` | No route matched | Navigation to undefined route |

### Lint Errors

| Rule | Message | Fix |
|------|---------|-----|
| `no-unused-state` | State '{name}' is never used | Remove or use the state variable |
| `no-missing-key` | List missing key function | Add key function: `list(items, render, item => item.id)` |
| `no-direct-mutation` | Direct state mutation | Use `.set()` or `.update()` instead of assignment |
| `prefer-computed` | Derivable value in effect | Use `computed()` for derived values |
| `no-async-effect` | Async effect without cleanup | Return cleanup function or use `useAsync` |

### Form Validation Errors

| Validator | Default Message |
|-----------|-----------------|
| `required` | This field is required |
| `minLength(n)` | Must be at least {n} characters |
| `maxLength(n)` | Must be at most {n} characters |
| `email` | Invalid email address |
| `url` | Invalid URL |
| `min(n)` | Must be at least {n} |
| `max(n)` | Must be at most {n} |
| `matches(field)` | Must match {field} |
| `asyncEmail` | Email is already taken |
| `asyncUnique` | This value is already taken |

## Performance Guide

### When to Use batch()

```javascript
// BAD: Multiple effects fire for each set
count.set(1);    // Effect runs
name.set('A');   // Effect runs again
items.set([]);   // Effect runs again

// GOOD: Effects fire once after all updates
batch(() => {
  count.set(1);
  name.set('A');
  items.set([]);
}); // Effects run once

// Use batch when:
// - Updating multiple related pulses
// - Resetting form state
// - Processing API responses into multiple stores
```

### Computed: Lazy vs Eager

```javascript
// LAZY (default) - computed only when accessed
const total = computed(() => items.get().reduce((a, b) => a + b, 0));
// Computation runs when total.get() is called
// Use for: expensive calculations, infrequently accessed values

// EAGER - computed immediately when dependencies change
const total = computed(() => items.get().reduce((a, b) => a + b, 0), { lazy: false });
// Computation runs immediately on any items change
// Use for: values that must always be current, validation state
```

### Effect Best Practices

```javascript
// BAD: Effect does too much
effect(() => {
  const data = items.get();
  const filtered = data.filter(x => x.active);  // Filtering on every run
  render(filtered);
});

// GOOD: Use computed for derived values
const activeItems = computed(() => items.get().filter(x => x.active));
effect(() => render(activeItems.get()));

// Cleanup pattern for subscriptions
effect(() => {
  const id = setInterval(() => tick.update(n => n + 1), 1000);
  return () => clearInterval(id);  // Cleanup on re-run or dispose
});
```

### List Rendering Performance

```javascript
// BAD: No key function - entire list re-renders
list(() => items.get(), item => el('li', item.name));

// GOOD: Key function enables efficient diffing
list(() => items.get(), item => el('li', item.name), item => item.id);

// Key function must return unique, stable identifier
// - Use database IDs when available
// - Avoid using array index (breaks on reorder)
```

### Avoiding Unnecessary Re-renders

```javascript
// BAD: Creates new object every time, always triggers effects
config.set({ theme: 'dark', lang: 'en' });

// GOOD: Custom equality for objects
const config = pulse({ theme: 'dark', lang: 'en' }, {
  equals: (a, b) => a.theme === b.theme && a.lang === b.lang
});

// Or use peek() to read without tracking
effect(() => {
  const theme = config.get().theme;  // Tracks config
  const lang = config.peek().lang;   // Does NOT track
});
```

### Async Best Practices

```javascript
// BAD: No race condition handling
async function search(query) {
  const results = await api.search(query);
  setResults(results);  // May set stale results!
}

// GOOD: Use useAsync or createVersionedAsync
const { data, execute } = useAsync((query) => api.search(query), { immediate: false });
// Automatically handles race conditions

// Or manual version control
const controller = createVersionedAsync();
async function search(query) {
  const ctx = controller.begin();
  const results = await api.search(query);
  ctx.ifCurrent(() => setResults(results));
}
```
