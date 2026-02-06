# CLAUDE.md - Pulse Framework

## Project Overview

Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications (SPAs). It features:

- **Declarative DOM creation** using CSS selector syntax (`el('.container#main')`)
- **Signal-based reactivity** (pulsations) for automatic UI updates
- **Custom DSL** (.pulse files) that compile to JavaScript
- **Zero dependencies** - completely self-contained
- **Accessibility-first** - built-in a11y helpers, auto-ARIA, and audit tools
- **Optional SASS support** - automatic SCSS compilation if `sass` is installed

**Version:** See package.json | **License:** MIT | **Node.js:** >= 18.0.0

## Quick Commands

```bash
# Run tests
npm test                # Run all tests (compiler, lint, format, analyze)

# CLI commands (via pulse binary)
pulse create <name>     # Create new Pulse project
pulse create <name> --typescript  # Create TypeScript project
pulse create <name> --ecommerce   # Create from E-Commerce template
pulse create <name> --todo        # Create from Todo App template
pulse create <name> --blog        # Create from Blog template
pulse create <name> --chat        # Create from Chat template
pulse create <name> --dashboard   # Create from Dashboard template
pulse init              # Initialize in current directory
pulse init --typescript # Initialize TypeScript project
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

# Testing
pulse test              # Run tests with Node.js test runner
pulse test --coverage   # Run tests with coverage
pulse test --watch      # Watch mode
pulse test --create <name>  # Generate test file

# Project Tools
pulse doctor            # Run project diagnostics
pulse doctor --verbose  # Detailed diagnostics

# Creating .pulse Files (Quick)
pulse new <name>                 # Create component (src/components/<Name>.pulse)
pulse new <name> --type page     # Create page (src/pages/<Name>.pulse)
pulse new <name> --type layout   # Create layout (src/layouts/<Name>.pulse)
pulse new <name> --props         # Include props section
pulse new <name> -d src/ui       # Custom output directory

# Scaffolding (Full)
pulse scaffold component <name>  # Generate component
pulse scaffold page <name>       # Generate page
pulse scaffold store <name>      # Generate store module
pulse scaffold hook <name>       # Generate custom hook
pulse scaffold service <name>    # Generate API service
pulse scaffold context <name>    # Generate context provider
pulse scaffold layout <name>     # Generate layout component

# Documentation
pulse docs --generate           # Generate API docs (Markdown)
pulse docs --generate --format html   # Generate HTML docs
pulse docs --generate --format json   # Generate JSON docs
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
│   ├── store.js         # Global state management
│   ├── context.js       # Context API (dependency injection, prop drilling prevention)
│   ├── form.js          # Form validation and management
│   ├── async.js         # Async primitives (useAsync, useResource, usePolling)
│   ├── http.js          # HTTP client (fetch wrapper, interceptors)
│   ├── websocket.js     # WebSocket client (auto-reconnect, heartbeat, queuing)
│   ├── graphql.js       # GraphQL client (queries, mutations, subscriptions)
│   ├── a11y.js          # Accessibility (focus, announcements, ARIA)
│   ├── devtools.js      # Debugging tools (time-travel, dependency graph)
│   ├── native.js        # Mobile bridge for iOS/Android
│   └── hmr.js           # Hot module replacement
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
│   ├── test.js          # Test runner with coverage
│   ├── doctor.js        # Project diagnostics
│   ├── scaffold.js      # Component/page/store generation
│   ├── docs.js          # API documentation generator
│   └── utils/
│       └── file-utils.js  # Shared utilities (glob, parseArgs)
├── loader/
│   └── vite-plugin.js   # Vite integration
├── examples/            # Example apps (todo, chat, ecommerce, electron)
├── test/                # Test suite
└── docs/                # Documentation site
```

## Getting Started

### Quick Start (5 minutes)

```javascript
// 1. Create a reactive value
import { pulse, effect, el, mount } from 'pulse-js-framework/runtime';

const count = pulse(0);

// 2. Create reactive UI
const Counter = () => el('.counter', [
  el('h1', () => `Count: ${count.get()}`),
  el('button', 'Increment', { onclick: () => count.update(n => n + 1) }),
  el('button', 'Reset', { onclick: () => count.set(0) })
]);

// 3. Mount to DOM
mount('#app', Counter());

// That's it! The UI updates automatically when count changes.
```

### Your First App

```javascript
import { pulse, computed, effect, el, mount, list } from 'pulse-js-framework/runtime';

// State
const todos = pulse([]);
const newTodo = pulse('');
const filter = pulse('all'); // 'all' | 'active' | 'completed'

// Derived state (computed)
const filteredTodos = computed(() => {
  const items = todos.get();
  switch (filter.get()) {
    case 'active': return items.filter(t => !t.done);
    case 'completed': return items.filter(t => t.done);
    default: return items;
  }
});

const remaining = computed(() => todos.get().filter(t => !t.done).length);

// Actions
const addTodo = () => {
  const text = newTodo.get().trim();
  if (!text) return;
  todos.update(t => [...t, { id: Date.now(), text, done: false }]);
  newTodo.set('');
};

const toggleTodo = (id) => {
  todos.update(t => t.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  ));
};

// UI
const App = () => el('.todo-app', [
  el('h1', 'Todos'),
  el('.input-row', [
    el('input[placeholder=What needs to be done?]', {
      value: () => newTodo.get(),
      oninput: (e) => newTodo.set(e.target.value),
      onkeydown: (e) => e.key === 'Enter' && addTodo()
    }),
    el('button', 'Add', { onclick: addTodo })
  ]),
  list(
    () => filteredTodos.get(),
    (todo) => el('li', { class: () => todo.done ? 'done' : '' }, [
      el('input[type=checkbox]', {
        checked: () => todo.done,
        onchange: () => toggleTodo(todo.id)
      }),
      el('span', todo.text)
    ]),
    (todo) => todo.id  // Key function for efficient updates
  ),
  el('.footer', () => `${remaining.get()} items left`)
]);

mount('#app', App());
```

### Testing Your App

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pulse, computed, effect, createContext, withContext } from 'pulse-js-framework/runtime/pulse';

describe('Todo App', () => {
  test('adds a todo', () => {
    // Create isolated context for testing (no global state pollution)
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const todos = pulse([]);
      todos.update(t => [...t, { id: 1, text: 'Test', done: false }]);
      assert.strictEqual(todos.get().length, 1);
      assert.strictEqual(todos.get()[0].text, 'Test');
    });
  });

  test('computed updates automatically', () => {
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const count = pulse(0);
      const doubled = computed(() => count.get() * 2);

      assert.strictEqual(doubled.get(), 0);
      count.set(5);
      assert.strictEqual(doubled.get(), 10);
    });
  });
});
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
count.subscribe(v => console.log(v)); // Manual subscription, returns unsubscribe fn
count.derive(n => n * 2); // Create derived pulse (shorthand for computed)

// pulse() options
const user = pulse({ name: 'Alice' }, {
  equals: (a, b) => a.id === b.id  // Custom equality (default: Object.is)
});

// Effects auto-run when dependencies change
const dispose = effect(() => console.log(count.get()));
dispose(); // Stop the effect

// effect() options
effect(() => {
  // Effect logic that might fail
  riskyOperation();
}, {
  id: 'data-sync',                            // Custom ID for debugging
  onError: (err) => {
    console.error('Effect failed:', err.effectId, err.phase, err.cause);
  }
});

// Global effect error handler
import { onEffectError, EffectError } from 'pulse-js-framework/runtime/pulse';
onEffectError((err) => {
  reportError({ id: err.effectId, phase: err.phase, cause: err.cause });
});

// Effect cleanup (runs before re-run or dispose)
effect(() => {
  const timer = setInterval(() => tick(), 1000);
  return () => clearInterval(timer);  // Cleanup function
});

// Alternative: onCleanup() for multiple cleanups
import { onCleanup } from 'pulse-js-framework/runtime/pulse';
effect(() => {
  const sub1 = eventBus.on('event1', handler1);
  const sub2 = eventBus.on('event2', handler2);
  onCleanup(() => sub1.unsubscribe());
  onCleanup(() => sub2.unsubscribe());
});

// Computed values (derived state)
const doubled = computed(() => count.get() * 2);

// computed() options
const expensive = computed(() => heavyCalculation(data.get()), {
  lazy: true  // Only compute when read (default: false = eager)
});
expensive.dispose(); // Clean up computed when no longer needed

// Batch updates (defer effects until complete)
batch(() => {
  count.set(1);
  count.set(2);
}); // Effects run once with final value

// Untrack reads (read without creating dependency)
import { untrack } from 'pulse-js-framework/runtime/pulse';
effect(() => {
  const tracked = count.get();        // Creates dependency
  const untracked = untrack(() => other.get());  // No dependency
});

// Isolated reactive contexts (for testing/SSR)
import { createContext, withContext, resetContext } from 'pulse-js-framework/runtime/pulse';

// Testing with isolated context
const testCtx = createContext({ name: 'test' });
withContext(testCtx, () => {
  const count = pulse(0);  // Only exists in testCtx
  effect(() => console.log(count.get()));
});
testCtx.reset();  // Clean up after test
resetContext();   // Reset global context
```

### DOM Creation (runtime/dom.js)

```javascript
// CSS selector syntax
el('div.container#main')  // <div class="container" id="main">
el('input[type=text]')    // <input type="text">
el('button.btn.primary')  // <button class="btn primary">
el('a[href=/home]')       // <a href="/home">

// ===== el() Full API =====
// el(selector, ...children) or el(selector, attributes, ...children)

// Children can be: strings, numbers, Nodes, arrays, or functions (reactive)
el('div', 'Hello')                       // Text child
el('div', 42)                            // Number becomes text
el('div', childElement)                  // DOM node child
el('div', [child1, child2, child3])      // Array of children
el('div', child1, child2, child3)        // Multiple children as args
el('div', () => `Count: ${count.get()}`) // Reactive child (re-renders on change)

// Nested elements
el('ul', [
  el('li', 'Item 1'),
  el('li', 'Item 2'),
  el('li', 'Item 3')
])

// Attributes object (when first child is plain object)
el('input', { type: 'email', placeholder: 'Enter email' })
el('button', { disabled: true, onclick: handleClick }, 'Submit')

// Reactive/dynamic attributes (functions)
el('button', {
  class: () => isActive.get() ? 'active' : '',      // Reactive class
  disabled: () => isLoading.get(),                   // Reactive attribute
  style: () => `color: ${color.get()}`,              // Reactive style
  onclick: (e) => handleClick(e)                     // Event handler
})

// Dynamic attribute values in selector (for form bindings)
el('input[type=text]', {
  value: () => name.get(),           // One-way binding (display)
  oninput: (e) => name.set(e.target.value)  // Update on input
})

// Combined: selector + attributes + children
el('article.post', { id: 'post-123' },
  el('h2', post.title),
  el('p', post.content)
)

// Falsy children are ignored
el('div',
  showHeader && el('header', 'Header'),  // Renders if showHeader is truthy
  null,                                   // Ignored
  undefined,                              // Ignored
  false                                   // Ignored
)

// Automatic ARIA attributes (enabled by default)
el('dialog')              // Auto: role="dialog" aria-modal="true"
el('button')              // Auto: type="button"
el('a')                   // Auto: role="button" tabindex="0" (if no href)
el('div[role=checkbox]')  // Auto: aria-checked="false"
el('div[role=slider]')    // Auto: aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"

// Configure auto-ARIA behavior
import { configureA11y } from 'pulse-js-framework/runtime';
configureA11y({
  enabled: true,           // Enable/disable all auto-ARIA (default: true)
  autoAria: true,          // Auto-apply ARIA to semantic elements (default: true)
  warnMissingAlt: true,    // Warn when <img> missing alt (default: true)
  warnMissingLabel: true   // Warn when form controls missing labels (default: true)
});

// ===== Reactive Bindings =====
import { text, bind, on, model, prop, cls, style, show } from 'pulse-js-framework/runtime';

// text() - Reactive text node
const greeting = text(() => `Hello, ${name.get()}!`);

// bind() - Reactive attribute binding
bind(element, 'class', () => isActive.get() ? 'active' : '');
bind(element, 'aria-expanded', () => String(isOpen.get()));

// prop() - Reactive property binding (not attribute)
prop(input, 'value', () => text.get());

// cls() - Reactive class toggle
cls(element, 'active', () => isActive.get());
cls(element, 'loading', isLoading);  // Also accepts Pulse directly

// style() - Reactive inline style
style(element, 'color', () => theme.get().textColor);
style(element, 'display', () => visible.get() ? 'block' : 'none');

// show() - Conditional visibility (display: none)
show(element, () => isVisible.get());

// on() - Event listener
on(element, 'click', (e) => handleClick(e));
on(element, 'input', (e) => value.set(e.target.value));

// model() - Two-way binding (like v-model)
model(input, valuePulse);  // Syncs input.value <-> valuePulse

// ===== Conditional & List Rendering =====
import { when, match, list } from 'pulse-js-framework/runtime';

// when() - Conditional rendering
when(
  () => loading.get(),
  () => el('.spinner', 'Loading...'),      // If true
  () => el('.content', data.get())          // If false (optional)
)

// match() - Multi-condition rendering (switch-like)
match(
  [() => status.get() === 'loading', () => el('.spinner')],
  [() => status.get() === 'error', () => el('.error', error.get())],
  [() => status.get() === 'success', () => el('.data', data.get())],
  [() => true, () => el('.empty', 'No data')]  // Default case
)

// list() - Reactive list rendering
list(
  () => items.get(),                        // Data source (reactive)
  (item, index) => el('li', item.name),     // Render function
  (item) => item.id                          // Key function (important for performance)
)

// Mounting to DOM
import { mount } from 'pulse-js-framework/runtime';
const app = el('.app', [Header(), Content(), Footer()]);
const unmount = mount('#root', app);  // Appends to #root, returns unmount function
unmount();  // Removes app from DOM

// Lifecycle hooks
import { onMount, onUnmount, component } from 'pulse-js-framework/runtime';
onMount(() => console.log('Mounted!'));
onUnmount(() => console.log('Unmounted, cleanup here'));

// Component factory with lifecycle
const MyComponent = component((ctx) => {
  const count = ctx.state('count', 0);
  ctx.onMount(() => console.log('Component mounted'));
  ctx.onUnmount(() => console.log('Component unmounted'));
  return ctx.el('div', `Count: ${count.get()}`);
});
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
  mode: 'history',  // 'history' (default) or 'hash' for #/path URLs
  base: '',         // Base path prefix for all routes
  scrollBehavior: (to, from, saved) => saved || { x: 0, y: 0 },
  // Scroll persistence (persist positions across sessions)
  persistScroll: true,              // Save scroll positions to sessionStorage
  persistScrollKey: 'my-app-scroll', // Custom storage key (default: 'pulse-router-scroll')
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

// Hash mode (for static hosting without server config)
const hashRouter = createRouter({
  routes: { '/': HomePage, '/about': AboutPage },
  mode: 'hash'  // URLs become /#/, /#/about
});

// Guards
router.beforeEach((to, from) => { /* global guard */ });
router.beforeResolve((to, from) => { /* after per-route guards */ });
router.afterEach((to) => { /* after navigation */ });

// Dynamic middleware
const unsubscribe = router.use(async (ctx, next) => { await next(); });

// ===== Navigation =====

// Basic navigation
router.navigate('/users/123');

// navigate() options
await router.navigate('/search', {
  replace: true,                    // Replace history instead of push (default: false)
  query: { q: 'test', page: 1 },    // Query parameters -> /search?q=test&page=1
  state: { scrollY: 100 }           // History state (accessible via history.state)
});

// Query parameters
router.navigate('/products', { query: { category: 'books', sort: 'price' } });
// URL: /products?category=books&sort=price

// Accessing route state (all reactive Pulses)
router.path.get();    // '/users/123'
router.params.get();  // { id: '123' }
router.query.get();   // { q: 'test', page: '1' } - values are strings
router.meta.get();    // { requiresAuth: true }

// Check if route is active
router.isActive('/admin');           // true if current path starts with /admin
router.isActive('/admin', true);     // true only if exact match

// Route context in handlers
const UserPage = (ctx) => {
  const { params, query, path, navigate, router } = ctx;
  console.log(params.id);       // Route param
  console.log(query.tab);       // Query param
  return el('div', `User ${params.id}`);
};

// ===== Programmatic navigation patterns =====

// Navigate with confirmation
async function navigateWithConfirm(path) {
  if (hasUnsavedChanges && !confirm('Discard changes?')) return;
  await router.navigate(path);
}

// Navigate and scroll to element
await router.navigate('/docs#installation');  // Hash in path

// Custom scroll behavior
const router = createRouter({
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;     // Back/forward: restore position
    if (to.path.includes('#')) {                 // Hash: scroll to element
      return { selector: to.path.split('#')[1], behavior: 'smooth' };
    }
    return { x: 0, y: 0 };                       // Default: top
  }
});

// Router outlet - renders current route
router.outlet('#app');

// Route error handling
const router = createRouter({
  routes,
  onRouteError: (error, ctx) => {
    console.error('Route error:', error);
    return el('.error-page', error.message);  // Return error UI
  }
});

// Preload components (prefetch on hover, etc.)
const DashboardLazy = lazy(() => import('./Dashboard.js'));
linkElement.addEventListener('mouseenter', () => preload(DashboardLazy));

// Router links (auto-handle navigation)
const nav = el('nav', [
  router.link('/', 'Home'),
  router.link('/about', 'About'),
  router.link('/users', 'Users', { activeClass: 'nav-active' })
]);
```

### Store (runtime/store.js)

```javascript
import {
  createStore, createActions, createGetters,
  combineStores, createModuleStore,
  usePlugin, loggerPlugin, historyPlugin
} from 'pulse-js-framework/runtime/store';

// Basic store
const store = createStore({ user: null, theme: 'light' });
store.user.get();
store.user.set({ name: 'John' });
store.theme.update(t => t === 'light' ? 'dark' : 'light');

// Store with persistence (localStorage)
const store = createStore(
  { user: null, theme: 'light' },
  {
    persist: true,              // Enable localStorage persistence
    storageKey: 'my-app-store'  // Custom key (default: 'pulse-store')
  }
);

// Store methods
store.$getState();              // Get snapshot of all values (without tracking)
store.$setState({ theme: 'dark', user: { name: 'John' } });  // Batch update
store.$reset();                 // Reset to initial state
store.$subscribe(state => console.log('State changed:', state));
store.$pulses;                  // Access underlying pulse objects

// Actions (bound to store)
const actions = createActions(store, {
  toggleTheme: (store) => store.theme.update(t => t === 'light' ? 'dark' : 'light'),
  login: (store, user) => store.user.set(user),
  logout: (store) => store.user.set(null)
});
actions.toggleTheme();
actions.login({ name: 'John', email: 'john@example.com' });

// Getters (computed values from store)
const getters = createGetters(store, {
  isLoggedIn: (store) => store.user.get() !== null,
  userName: (store) => store.user.get()?.name || 'Guest'
});
getters.isLoggedIn.get();  // true/false (reactive)

// Combine multiple stores
const rootStore = combineStores({
  user: createStore({ name: '', email: '' }),
  settings: createStore({ theme: 'dark', lang: 'en' })
});
rootStore.user.name.get();
rootStore.settings.theme.set('light');

// Module-based store (Vuex-like)
const store = createModuleStore({
  user: {
    state: { name: '', loggedIn: false },
    actions: {
      login: (store, name) => {
        store.name.set(name);
        store.loggedIn.set(true);
      }
    },
    getters: {
      displayName: (store) => store.loggedIn.get() ? store.name.get() : 'Guest'
    }
  },
  cart: {
    state: { items: [] },
    actions: {
      addItem: (store, item) => store.items.update(arr => [...arr, item])
    }
  }
});
store.user.login('John');
store.cart.addItem({ id: 1, name: 'Product' });

// Plugins
usePlugin(store, loggerPlugin);  // Log all state changes to console
usePlugin(store, (s) => historyPlugin(s, 100));  // Undo/redo with 100 history states

// History plugin adds methods
store.$undo();     // Undo last change
store.$redo();     // Redo undone change
store.$canUndo();  // true if undo available
store.$canRedo();  // true if redo available
```

### Context API (runtime/context.js)

```javascript
import {
  createContext, useContext, Provider, Consumer, provideMany,
  useContextSelector, disposeContext, isContext, getContextDepth
} from 'pulse-js-framework/runtime/context';

// Create a context with default value
const ThemeContext = createContext('light');
const UserContext = createContext(null, { displayName: 'UserContext' });

// Provide values to children
Provider(ThemeContext, 'dark', () => {
  const theme = useContext(ThemeContext);
  console.log(theme.get()); // 'dark'
  return MyComponent();
});

// Provide reactive values (pulses)
const themePulse = pulse('dark');
Provider(ThemeContext, themePulse, () => {
  const theme = useContext(ThemeContext);
  // theme updates when themePulse changes
});

// Shorthand syntax
ThemeContext.Provider('dark', () => App());
ThemeContext.Consumer((theme) => el(`div.${theme.get()}`));

// Nested providers (inner overrides outer)
Provider(ThemeContext, 'dark', () => {
  Provider(ThemeContext, 'blue', () => {
    useContext(ThemeContext).get(); // 'blue'
  });
  useContext(ThemeContext).get(); // 'dark'
});

// Provide multiple contexts at once
provideMany([
  [ThemeContext, 'dark'],
  [UserContext, { name: 'John' }],
  [LocaleContext, 'fr']
], () => App());

// Derive from multiple contexts
const effectiveTheme = useContextSelector(
  (theme, user) => user.get()?.preferredTheme || theme.get(),
  ThemeContext,
  UserContext
);

// Cleanup context in tests
disposeContext(ThemeContext);
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

### HTTP (runtime/http.js)

```javascript
import { createHttp, http, HttpError, useHttp, useHttpResource } from 'pulse-js-framework/runtime/http';

// Create HTTP client instance
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,                    // Request timeout (ms)
  headers: { 'Authorization': 'Bearer token' },
  retries: 3,                       // Retry on failure
  retryDelay: 1000,                 // Delay between retries (ms)
  withCredentials: false,           // Include cookies
  responseType: 'json'              // json | text | blob | arrayBuffer
});

// HTTP methods
const users = await api.get('/users');
const user = await api.get('/users/1', { params: { include: 'posts' } });
const created = await api.post('/users', { name: 'John' });
await api.put('/users/1', { name: 'Jane' });
await api.patch('/users/1', { active: true });
await api.delete('/users/1');

// Response structure
response.data;       // Parsed response body
response.status;     // HTTP status code
response.statusText; // Status text
response.headers;    // Response headers
response.config;     // Request config

// Request interceptors
api.interceptors.request.use(
  config => {
    config.headers['X-Request-Time'] = Date.now();
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      router.navigate('/login');
    }
    throw error;
  }
);

// Remove interceptor
const id = api.interceptors.request.use(fn);
api.interceptors.request.eject(id);
api.interceptors.request.clear();  // Remove all

// Child instance (inherits config)
const adminApi = api.create({
  baseURL: 'https://api.example.com/admin',
  headers: { 'X-Admin': 'true' }
});

// Request cancellation
const controller = new AbortController();
api.get('/users', { signal: controller.signal });
controller.abort();  // Cancel request
api.isCancel(error); // Check if error is cancellation

// Error handling
try {
  await api.get('/users');
} catch (error) {
  if (HttpError.isHttpError(error)) {
    error.code;      // 'TIMEOUT' | 'NETWORK' | 'ABORT' | 'HTTP_ERROR' | 'PARSE_ERROR'
    error.status;    // HTTP status code (if available)
    error.config;    // Request config
    error.response;  // Response object (if available)
    error.isTimeout();      // true if timeout
    error.isNetworkError(); // true if network failure
    error.isAborted();      // true if cancelled
  }
}

// Custom retry condition
const api = createHttp({
  retries: 3,
  retryCondition: (error) => {
    // Only retry on network errors, not 4xx
    return error.code === 'NETWORK' || error.status >= 500;
  }
});

// Reactive integration with useHttp
const { data, loading, error, execute, abort, reset } = useHttp(
  () => api.get('/users'),
  {
    immediate: true,     // Execute immediately
    retries: 3,          // Retry attempts
    onSuccess: (response) => console.log('Got:', response.data),
    onError: (error) => console.error('Failed:', error)
  }
);

// Use in effects
effect(() => {
  if (loading.get()) console.log('Loading...');
  if (data.get()) console.log('Users:', data.get());
});

// Resource with caching (SWR pattern)
const users = useHttpResource(
  'users',
  () => api.get('/users'),
  {
    refreshInterval: 30000,    // Auto-refresh every 30s
    refreshOnFocus: true,      // Refresh when window gains focus
    staleTime: 5000            // Data fresh for 5s
  }
);

// Default instance (pre-configured)
import { http } from 'pulse-js-framework/runtime/http';
const response = await http.get('https://api.example.com/users');
```

### WebSocket (runtime/websocket.js)

```javascript
import { createWebSocket, useWebSocket, WebSocketError } from 'pulse-js-framework/runtime/websocket';

// Low-level WebSocket with all features
const ws = createWebSocket('wss://api.example.com/ws', {
  // Reconnection
  reconnect: true,              // Enable auto-reconnect (default: true)
  maxRetries: 5,                // Max reconnection attempts (default: 5)
  baseDelay: 1000,              // Base delay for backoff (ms)
  maxDelay: 30000,              // Max delay between retries (ms)

  // Heartbeat
  heartbeat: true,              // Enable ping/pong (default: false)
  heartbeatInterval: 30000,     // Ping interval (ms)
  heartbeatTimeout: 10000,      // Pong timeout (ms)

  // Message handling
  queueWhileDisconnected: true, // Queue messages when offline (default: true)
  maxQueueSize: 100,            // Max queued messages (default: 100)
  autoParseJson: true           // Auto-parse JSON messages (default: true)
});

// Reactive state (all are Pulses)
ws.state.get();           // 'connecting' | 'open' | 'closing' | 'closed'
ws.connected.get();       // true when open
ws.reconnecting.get();    // true during reconnection
ws.reconnectAttempt.get(); // Current attempt number
ws.error.get();           // Last WebSocketError or null
ws.queuedCount.get();     // Number of queued messages

// Send messages (auto-serializes objects to JSON)
ws.send({ type: 'subscribe', channel: 'updates' });
ws.sendJson({ action: 'ping' });           // Explicit JSON
ws.sendBinary(new Uint8Array([1, 2, 3]));  // Binary data

// Listen for events
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data));
ws.on('close', (event) => console.log('Closed:', event.code));
ws.on('error', (error) => console.error('Error:', error));

// Message interceptors
ws.interceptors.incoming.use(
  (data) => ({ ...data, timestamp: Date.now() }),
  (err) => console.error('Parse error:', err)
);

ws.interceptors.outgoing.use(
  (data) => JSON.stringify({ ...JSON.parse(data), token: 'abc' })
);

// Control
ws.connect();                    // Manual connect
ws.disconnect(1000, 'Goodbye');  // Close with code/reason
ws.dispose();                    // Clean up permanently

// === Reactive Hook (recommended) ===
const {
  connected,       // Pulse<boolean>
  lastMessage,     // Pulse<any>
  messages,        // Pulse<any[]> (if messageHistorySize > 0)
  error,           // Pulse<WebSocketError | null>
  reconnecting,    // Pulse<boolean>
  send,
  disconnect
} = useWebSocket('wss://api.example.com/ws', {
  immediate: true,           // Connect on creation (default: true)
  messageHistorySize: 100,   // Keep last 100 messages
  onMessage: (data) => console.log('Message:', data),
  onOpen: () => console.log('Connected'),
  onClose: (event) => console.log('Closed'),
  onError: (error) => console.error('Error:', error)
});

// Use with effects
effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channel: 'updates' });
  }
});

effect(() => {
  const msg = lastMessage.get();
  if (msg) {
    console.log('Latest message:', msg);
  }
});

// Error handling
try {
  ws.send({ type: 'test' });
} catch (error) {
  if (WebSocketError.isWebSocketError(error)) {
    error.code;        // 'CONNECT_FAILED' | 'CLOSE' | 'TIMEOUT' | 'SEND_FAILED' | ...
    error.closeCode;   // WebSocket close code (1000, 1006, etc.)
    error.closeReason; // Close reason string
    error.isTimeout();       // true if connection timeout
    error.isConnectFailed(); // true if connection failed
    error.isSendFailed();    // true if send failed
  }
}
```

### GraphQL (runtime/graphql.js)

```javascript
import {
  createGraphQLClient, useQuery, useMutation, useSubscription, GraphQLError
} from 'pulse-js-framework/runtime/graphql';

// Create GraphQL client
const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000,                          // Request timeout (ms)
  cache: true,                             // Enable query caching (default: true)
  staleTime: 5000,                         // Data fresh for 5s
  dedupe: true                             // Deduplicate in-flight queries
});

// Set as default for hooks
import { setDefaultClient } from 'pulse-js-framework/runtime/graphql';
setDefaultClient(client);

// === Query with caching (SWR pattern) ===
const { data, loading, error, refetch, isStale } = useQuery(
  `query GetUsers($limit: Int) {
    users(limit: $limit) { id name email }
  }`,
  { limit: 10 },
  {
    staleTime: 30000,           // Data fresh for 30s
    refetchOnFocus: true,       // Refetch when tab gains focus
    refetchInterval: 60000,     // Poll every 60s
    onSuccess: (data) => console.log('Loaded:', data)
  }
);

// Use in effects
effect(() => {
  if (loading.get()) return el('.spinner');
  if (error.get()) return el('.error', error.get().message);
  return el('ul', data.get()?.users.map(u => el('li', u.name)));
});

// === Mutation with optimistic updates ===
const { mutate, loading: saving } = useMutation(
  `mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }`,
  {
    onMutate: (variables) => {
      // Optimistic update - return rollback context
      const previous = usersCache.get();
      usersCache.update(users => [...users, { id: 'temp', ...variables.input }]);
      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      usersCache.set(context.previous);
    },
    onSuccess: (data) => console.log('Created:', data),
    invalidateQueries: ['gql:GetUsers']  // Invalidate related queries
  }
);

// Execute mutation
await mutate({ input: { name: 'John', email: 'john@example.com' } });

// === Subscription (graphql-ws protocol) ===
const { data: liveData, status, unsubscribe } = useSubscription(
  `subscription OnNewMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author createdAt }
  }`,
  { channelId: '123' },
  {
    onData: (message) => {
      notifications.update(n => [...n, message]);
    },
    shouldResubscribe: true,  // Auto-resubscribe on error
    // Exponential backoff for reconnection
    retryBaseDelay: 1000,     // Base delay (ms) - default: 1000
    retryMaxDelay: 30000,     // Max delay cap (ms) - default: 30000
    maxRetries: Infinity      // Max retry attempts - default: Infinity
  }
);

// Subscription state includes retry tracking
const { data, status, retryCount, unsubscribe } = useSubscription(...);
status.get();      // 'connecting' | 'connected' | 'reconnecting' | 'error' | 'failed' | 'closed'
retryCount.get();  // Current retry attempt (resets to 0 on success)

// Reactive subscription with dynamic variables
const channelId = pulse('123');
const { data: messages } = useSubscription(
  `subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content }
  }`,
  () => ({ channelId: channelId.get() }),  // Reactive variables
  { enabled: computed(() => !!channelId.get()) }
);

// === Error handling ===
try {
  await client.query('query { user { id } }');
} catch (error) {
  if (GraphQLError.isGraphQLError(error)) {
    error.code;                    // 'GRAPHQL_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | ...
    error.errors;                  // GraphQL errors array
    error.data;                    // Partial data (if any)
    error.hasPartialData();        // true if response has partial data
    error.isAuthenticationError(); // true if UNAUTHENTICATED
    error.isValidationError();     // true if BAD_USER_INPUT
    error.getFirstError();         // First error message
    error.getAllErrors();          // All error messages
  }
}

// === Interceptors ===
client.interceptors.request.use((config) => {
  // Add timestamp to all requests
  return { ...config, timestamp: Date.now() };
});

client.interceptors.response.use((result) => {
  // Transform all responses
  return { ...result, cached: true };
});

// === Cache management ===
client.invalidate('gql:GetUsers');  // Invalidate specific query
client.invalidateAll();              // Clear all cache
client.getCacheStats();              // { size, keys }
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

### DevTools (runtime/devtools.js)

```javascript
import {
  enableDevTools, disableDevTools,
  trackedPulse, trackedEffect,
  getDiagnostics, getEffectStats, getPulseList,
  getDependencyGraph, exportGraphAsDot,
  takeSnapshot, getHistory, travelTo, back, forward,
  profile, mark,
  // Auto-timeline
  enableAutoTimeline, disableAutoTimeline, isAutoTimelineEnabled,
  // A11y Audit
  runA11yAudit, enableA11yAudit, disableA11yAudit,
  getA11yIssues, getA11yStats, exportA11yReport,
  toggleA11yHighlights
} from 'pulse-js-framework/runtime/devtools';

// Enable dev tools (exposes window.__PULSE_DEVTOOLS__)
enableDevTools({ logUpdates: true, warnOnSlowEffects: true });

// Enable auto-timeline (records all pulse changes automatically)
enableDevTools({
  autoTimeline: true,        // Enable automatic timeline recording
  timelineDebounce: 100      // Debounce interval in ms (default: 100)
});

// Or enable/disable auto-timeline separately
enableAutoTimeline({ debounce: 50 });  // Enable with custom debounce
disableAutoTimeline();                  // Disable auto-recording
isAutoTimelineEnabled();                // Check if enabled

// Tracked pulses (auto-snapshot on change)
const count = trackedPulse(0, 'count');
const user = trackedPulse(null, 'user');

// Tracked effects (performance monitoring)
trackedEffect(() => {
  console.log('Count:', count.get());
}, 'log-count');

// Diagnostics
getDiagnostics();      // { pulseCount, effectCount, avgEffectTime, ... }
getEffectStats();      // [{ id, name, runCount, avgTime }]
getPulseList();        // [{ id, name, value, subscriberCount }]

// Dependency graph (for visualization)
const graph = getDependencyGraph();  // { nodes, edges }
const dot = exportGraphAsDot();      // Graphviz DOT format

// Time-travel debugging
takeSnapshot('user-login');          // Save current state
getHistory();                        // Get all snapshots
travelTo(0);                         // Restore to snapshot index
back();                              // Go back one step
forward();                           // Go forward one step

// Performance profiling
profile('data-processing', () => processLargeDataset());
const m = mark('fetch');
await fetch('/api/data');
m.end();  // Logs duration

// === A11y Audit Mode ===

// Run one-time accessibility audit
const result = runA11yAudit();
console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`);

// Enable continuous a11y auditing
enableA11yAudit({
  autoAudit: true,           // Periodic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  breakOnError: false,       // Debugger breakpoint on errors
  watchMutations: true       // Re-audit on DOM changes
});

// Get current issues and statistics
const issues = getA11yIssues();       // Array of a11y issues
const stats = getA11yStats();         // { totalIssues, errorCount, warningCount, ... }

// Toggle visual highlighting
toggleA11yHighlights(true);           // Show highlights
toggleA11yHighlights(false);          // Hide highlights
toggleA11yHighlights();               // Toggle

// Export audit report
const json = exportA11yReport('json'); // JSON format
const csv = exportA11yReport('csv');   // CSV format
const html = exportA11yReport('html'); // Standalone HTML report

// Disable a11y audit mode
disableA11yAudit();
```

### SSR (runtime/ssr.js)

Server-Side Rendering and hydration for Pulse applications.

```javascript
import {
  renderToString, renderToStringSync, hydrate,
  serializeState, deserializeState, restoreState, getSSRState,
  isSSR, isHydratingMode
} from 'pulse-js-framework/runtime/ssr';

// === Server-Side Rendering ===

// Render component to HTML string (async, waits for data)
const { html, state } = await renderToString(() => App(), {
  waitForAsync: true,   // Wait for useAsync/useResource to resolve
  timeout: 5000,        // Timeout for async operations (ms)
  serializeState: true  // Include state in result
});

// Render synchronously (no async waiting)
const html = renderToStringSync(() => StaticPage());

// === Complete SSR Server Example ===

// server.js (Node.js/Express)
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

const app = express();

app.get('*', async (req, res) => {
  const { html, state } = await renderToString(() => App(), {
    waitForAsync: true
  });

  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>My Pulse App</title></head>
      <body>
        <div id="app">${html}</div>
        <script>window.__PULSE_STATE__ = ${serializeState(state)};</script>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `);
});

// === Client-Side Hydration ===

// client.js
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

// Hydrate server-rendered HTML (attaches event listeners)
const dispose = hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__  // Restore server state
});

// Later, if needed:
dispose();  // Clean up hydration

// === State Serialization ===

// Serialize state (handles Date, undefined, escapes XSS)
const json = serializeState({
  user: { name: 'John', createdAt: new Date() },
  settings: { theme: 'dark' }
});

// Deserialize state (restores Date objects)
const state = deserializeState(json);

// Restore state into global (for component access)
restoreState(window.__PULSE_STATE__);

// Get SSR state in components
const userData = getSSRState('user');

// === SSR Mode Detection ===

// Check if running in SSR mode
if (isSSR()) {
  // Skip browser-only code
}

// Check if currently hydrating
if (isHydratingMode()) {
  // Hydration-specific logic
}

// === SSR-Safe Effects ===

// Effects automatically run once without subscriptions in SSR mode
effect(() => {
  if (isSSR()) return;  // Skip browser APIs on server

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});

// === Async Data with SSR ===

// useAsync automatically integrates with SSR
function UserProfile({ userId }) {
  const { data, loading } = useAsync(
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { immediate: true }
  );

  // During SSR:
  // 1. First render: registers async operation, returns loading state
  // 2. Async operations complete
  // 3. Second render: uses cached data

  return el('div',
    loading.get()
      ? el('.spinner', 'Loading...')
      : el('.user', data.get()?.name)
  );
}
```

**SSR Architecture:**

| Module | Purpose |
|--------|---------|
| `ssr.js` | Main entry point (renderToString, hydrate) |
| `ssr-serializer.js` | HTML serialization for MockNode trees |
| `ssr-hydrator.js` | Client-side hydration utilities |
| `ssr-async.js` | Async data collection during SSR |

**How SSR Works:**

1. **Server Render**: `renderToString()` creates isolated context, uses `MockDOMAdapter`
2. **Async Collection**: First render collects `useAsync` operations
3. **Data Fetching**: Waits for all async operations (with timeout)
4. **Re-render**: Second render with resolved data
5. **Serialization**: MockNode tree → HTML string
6. **State Transfer**: Serialize state for client
7. **Hydration**: Client attaches listeners to existing DOM

### A11y (runtime/a11y.js)

```javascript
import {
  // Announcements (screen readers)
  announce, announcePolite, announceAssertive, createLiveAnnouncer, createAnnouncementQueue,
  // Focus management
  trapFocus, focusFirst, focusLast, saveFocus, restoreFocus, getFocusableElements,
  onEscapeKey, createFocusVisibleTracker,
  // Skip links
  createSkipLink, installSkipLinks,
  // User preferences
  prefersReducedMotion, prefersColorScheme, prefersHighContrast,
  prefersReducedTransparency, forcedColorsMode, prefersContrast, createPreferences,
  // ARIA helpers
  setAriaAttributes, createDisclosure, createTabs, createRovingTabindex,
  // ARIA widgets
  createModal, createTooltip, createAccordion, createMenu,
  // Color contrast
  getContrastRatio, meetsContrastRequirement, getEffectiveBackgroundColor, checkElementContrast,
  // Validation
  validateA11y, logA11yIssues, highlightA11yIssues,
  // Utilities
  generateId, getAccessibleName, isAccessiblyHidden, makeInert, srOnly
} from 'pulse-js-framework/runtime/a11y';

// Screen reader announcements
announce('Item saved successfully');                    // Polite (default)
announcePolite('Loading complete');                     // Waits for user
announceAssertive('Error: Connection lost');            // Interrupts immediately

// Reactive announcer (announces on value change)
const cleanup = createLiveAnnouncer(
  () => `${items.get().length} items in cart`,
  { priority: 'polite', clearAfter: 1000 }
);

// Announcement queue (handle multiple announcements)
const queue = createAnnouncementQueue({ minDelay: 500 });
queue.add('First message');
queue.add('Second message', { priority: 'assertive' });
queue.queueLength.get();  // Number of queued messages
queue.clear();            // Clear the queue

// Focus management for modals/dialogs
const release = trapFocus(modalElement, {
  autoFocus: true,           // Focus first element
  returnFocus: true,         // Return focus on release
  initialFocus: closeButton  // Custom initial focus
});
// Later: release() to remove trap

focusFirst(container);       // Focus first focusable element
focusLast(container);        // Focus last focusable element
saveFocus();                 // Push current focus to stack
restoreFocus();              // Pop and restore focus
getFocusableElements(el);    // Get all focusable children

// Escape key handler (for modals/dialogs)
const removeEscape = onEscapeKey(dialog, () => closeDialog());

// Focus-visible detection (keyboard vs mouse)
const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
effect(() => {
  if (isKeyboardUser.get()) document.body.classList.add('keyboard-user');
});

// Skip links for keyboard navigation
installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'navigation', text: 'Skip to navigation' }
]);

// User preferences (reactive)
if (prefersReducedMotion()) { /* Disable animations */ }
if (prefersReducedTransparency()) { /* Use solid backgrounds */ }
if (forcedColorsMode() === 'active') { /* Windows High Contrast Mode */ }
const contrastPref = prefersContrast();  // 'no-preference' | 'more' | 'less' | 'custom'

const prefs = createPreferences();    // Reactive pulses
effect(() => {
  if (prefs.reducedMotion.get()) disableAnimations();
  if (prefs.forcedColors.get() === 'active') useForcedColors();
  applyTheme(prefs.colorScheme.get());
});

// ARIA disclosure widget (accordion, dropdown)
const { expanded, toggle, open, close } = createDisclosure(
  triggerButton,
  contentPanel,
  { defaultOpen: false, onToggle: (isOpen) => console.log(isOpen) }
);

// ARIA tabs
const tabs = createTabs(tablistElement, {
  defaultIndex: 0,
  orientation: 'horizontal',  // or 'vertical'
  onSelect: (index) => console.log('Selected tab:', index)
});
tabs.select(2);  // Programmatic selection

// Roving tabindex (arrow key navigation)
const cleanup = createRovingTabindex(menuElement, {
  selector: '[role="menuitem"]',
  orientation: 'vertical',
  loop: true,
  onSelect: (el, index) => el.click()
});

// === NEW ARIA Widgets ===

// Modal dialog (composes trapFocus, onEscapeKey, makeInert)
const modal = createModal(dialogElement, {
  labelledBy: 'modal-title',
  describedBy: 'modal-description',
  closeOnBackdropClick: true,
  onClose: () => console.log('Modal closed')
});
modal.open();
modal.close();
modal.isOpen.get();  // Reactive state

// Tooltip
const tooltip = createTooltip(trigger, tooltipEl, {
  showDelay: 500,
  hideDelay: 100
});
tooltip.isVisible.get();  // Reactive state
tooltip.cleanup();        // Remove listeners

// Accordion (composes multiple disclosures)
const accordion = createAccordion(container, {
  triggerSelector: '[data-accordion-trigger]',
  panelSelector: '[data-accordion-panel]',
  allowMultiple: false,
  defaultOpen: 0
});
accordion.open(1);
accordion.closeAll();
accordion.openIndices.get();  // [0] - Reactive

// Dropdown menu
const menu = createMenu(menuButton, menuList, {
  itemSelector: '[role="menuitem"]',
  closeOnSelect: true,
  onSelect: (el, index) => console.log('Selected:', el)
});
menu.open();
menu.toggle();
menu.cleanup();

// === Color Contrast ===

// Calculate contrast ratio (WCAG)
const ratio = getContrastRatio('#333', '#fff');  // 12.63
meetsContrastRequirement(ratio, 'AA', 'normal'); // true (>= 4.5)
meetsContrastRequirement(ratio, 'AAA', 'large'); // true (>= 4.5)

// Check element contrast
const { ratio, passes, foreground, background } = checkElementContrast(textElement, 'AA');
const bgColor = getEffectiveBackgroundColor(element);  // Handles transparency

// Accessibility validation
const issues = validateA11y(document.body);
logA11yIssues(issues);              // Log to console
const cleanup = highlightA11yIssues(issues);  // Visual overlay

// New validation rules:
// - duplicate-id: Duplicate ID attributes
// - missing-main: No <main> landmark
// - nested-interactive: Interactive elements inside other interactive elements
// - missing-lang: No lang attribute on <html>
// - touch-target-size: Touch targets smaller than 24x24px (WCAG 2.2)

// Utilities
const id = generateId('modal');     // 'modal-1234567890-abc123'
const name = getAccessibleName(el); // Computes accessible name (aria-label, text, etc.)
isAccessiblyHidden(element);        // Check if hidden from a11y tree
const restore = makeInert(element); // Set inert + aria-hidden
const span = srOnly('Screen reader only text');  // Visually hidden
setAriaAttributes(element, { label: 'Close', expanded: true });
```

### Lite Build (runtime/lite.js)

Minimal bundle (~5KB gzipped) with core reactivity and DOM helpers only. Use for simple apps that don't need router, store, or advanced features.

```javascript
import {
  // Core reactivity
  pulse, effect, computed, batch, onCleanup, untrack,
  // DOM helpers
  el, text, mount, on, bind, list, when, model,
  // Utilities
  show, cls, style, prop
} from 'pulse-js-framework/runtime/lite';

// Same API as full runtime, just smaller bundle
const count = pulse(0);
const app = el('div', [
  el('h1', () => `Count: ${count.get()}`),
  el('button', { onclick: () => count.update(n => n + 1) }, 'Increment')
]);
mount('#app', app);
```

### Logger (runtime/logger.js)

Centralized logging with namespaces and log levels. Automatically becomes noop in production for zero overhead.

```javascript
import {
  logger, createLogger, loggers,
  LogLevel, setLogLevel, getLogLevel,
  setFormatter, configureLogger, isProductionMode
} from 'pulse-js-framework/runtime/logger';

// Default logger
logger.info('Application started');
logger.warn('Deprecation notice');
logger.error('Something went wrong', { code: 500 });
logger.debug('Verbose debug info');

// Namespaced logger
const log = createLogger('MyComponent');
log.info('Initialized');           // [MyComponent] Initialized
log.error('Failed', { id: 123 });  // [MyComponent] Failed { id: 123 }

// Child logger (nested namespace)
const childLog = log.child('SubModule');
childLog.info('Ready');            // [MyComponent:SubModule] Ready

// Pre-configured loggers for Pulse subsystems
loggers.pulse.info('Reactivity update');
loggers.dom.debug('Element created');
loggers.router.info('Navigating to /home');
loggers.store.warn('Persist failed');
loggers.websocket.error('Connection lost');

// Log levels
setLogLevel(LogLevel.DEBUG);   // Show all (DEBUG, INFO, WARN, ERROR)
setLogLevel(LogLevel.WARN);    // Only WARN and ERROR
setLogLevel(LogLevel.SILENT);  // Disable all logging

// Custom formatter
setFormatter((level, namespace, args) => {
  const timestamp = new Date().toISOString();
  const prefix = namespace ? `[${namespace}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${args.join(' ')}`;
});

// Force production mode (noop logging)
configureLogger({ production: true });

// Check mode
if (!isProductionMode()) {
  logger.debug('Development mode');
}

// Log level constants
LogLevel.SILENT  // 0 - No logging
LogLevel.ERROR   // 1 - Only errors
LogLevel.WARN    // 2 - Errors and warnings
LogLevel.INFO    // 3 - Errors, warnings, info (default)
LogLevel.DEBUG   // 4 - All messages
```

### LRU Cache (runtime/lru-cache.js)

Least Recently Used cache with O(1) operations. Used internally by HTTP and GraphQL clients for response caching.

```javascript
import { LRUCache } from 'pulse-js-framework/runtime/lru-cache';

// Create cache with max 100 items
const cache = new LRUCache(100);

// Basic operations
cache.set('key', 'value');
cache.get('key');           // 'value' (moves to most recent)
cache.has('key');           // true (does NOT update position)
cache.delete('key');
cache.clear();

// Properties
cache.size;                 // Current number of items
cache.capacity;             // Maximum capacity (100)

// Iteration (oldest to newest)
for (const key of cache.keys()) { /* ... */ }
for (const value of cache.values()) { /* ... */ }
for (const [key, value] of cache.entries()) { /* ... */ }
cache.forEach((value, key) => { /* ... */ });

// Metrics tracking (for performance monitoring)
const cache = new LRUCache(100, { trackMetrics: true });
cache.get('key');  // miss
cache.set('key', 'value');
cache.get('key');  // hit

const stats = cache.getMetrics();
// { hits: 1, misses: 1, evictions: 0, hitRate: 0.5, size: 1, capacity: 100 }

cache.resetMetrics();                    // Reset counters
cache.setMetricsTracking(false);         // Disable tracking
```

### Utils (runtime/utils.js)

Security utilities for XSS prevention, URL sanitization, and CSS injection protection.

```javascript
import {
  // XSS Prevention
  escapeHtml, unescapeHtml, createSafeTextNode,
  dangerouslySetInnerHTML,
  // Attribute handling
  escapeAttribute, safeSetAttribute,
  // URL validation
  sanitizeUrl,
  // CSS sanitization
  isValidCSSProperty, sanitizeCSSValue, safeSetStyle,
  // Utilities
  deepClone, debounce, throttle
} from 'pulse-js-framework/runtime/utils';

// === XSS Prevention ===

// Escape HTML (prevent XSS when inserting user content)
escapeHtml('<script>alert("xss")</script>');
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

unescapeHtml('&lt;div&gt;');  // '<div>'

// Safe text node (DOM textContent is already safe)
const node = createSafeTextNode(userInput);
container.appendChild(node);

// Explicitly set innerHTML (use with caution!)
dangerouslySetInnerHTML(container, trustedHtml);
dangerouslySetInnerHTML(container, userHtml, { sanitize: true });  // With sanitization

// === Attribute Handling ===

escapeAttribute(userInput);  // Safe for attribute values

// Safely set attributes (blocks event handlers, sanitizes URLs)
safeSetAttribute(element, 'data-id', userId);          // OK
safeSetAttribute(element, 'href', userUrl);            // Sanitizes URL
safeSetAttribute(element, 'onclick', 'alert(1)');      // BLOCKED
safeSetAttribute(element, 'src', 'javascript:void(0)'); // BLOCKED

// Options
safeSetAttribute(element, 'onclick', handler, { allowEventHandlers: true }); // Allow (dangerous!)
safeSetAttribute(element, 'src', dataUrl, { allowDataUrls: true });          // Allow data: URLs

// === URL Validation ===

sanitizeUrl('https://example.com');           // 'https://example.com'
sanitizeUrl('javascript:alert(1)');           // null (blocked)
sanitizeUrl('data:text/html,...');            // null (blocked by default)
sanitizeUrl('/relative/path');                // '/relative/path'
sanitizeUrl('&#x6a;avascript:alert(1)');      // null (decoded then blocked)

// Options
sanitizeUrl('data:image/png;base64,...', { allowData: true });   // Allowed
sanitizeUrl('blob:...', { allowBlob: true });                    // Allowed
sanitizeUrl('relative', { allowRelative: false });               // null

// === CSS Sanitization ===

isValidCSSProperty('backgroundColor');  // true
isValidCSSProperty('123invalid');       // false

sanitizeCSSValue('red');                           // { safe: true, value: 'red' }
sanitizeCSSValue('red; margin: 999px');            // { safe: false, value: 'red', blocked: 'semicolon' }
sanitizeCSSValue('url(http://evil.com)');          // { safe: false, value: '', blocked: 'url' }
sanitizeCSSValue('expression(alert(1))');          // { safe: false, blocked: 'expression' }

// Safely set styles
safeSetStyle(element, 'color', 'red');                    // OK
safeSetStyle(element, 'color', 'red; margin: 0');         // Blocked, sets 'red' only
safeSetStyle(element, 'background', 'url(...)', { allowUrl: true });  // Allow url()

// === Utilities ===

// Deep clone
const clone = deepClone({ nested: { value: [1, 2, 3] } });

// Debounce (wait for pause in calls)
const debouncedSearch = debounce(search, 300);
input.addEventListener('input', debouncedSearch);
debouncedSearch.cancel();  // Cancel pending call

// Throttle (max once per interval)
const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
throttledScroll.cancel();
```

### DOM Adapter (runtime/dom-adapter.js)

Abstraction layer for DOM operations. Enables SSR, testing without browser, and custom rendering targets.

```javascript
import {
  // Adapters
  BrowserDOMAdapter, MockDOMAdapter,
  // Mock nodes for testing
  MockNode, MockElement, MockTextNode, MockCommentNode, MockDocumentFragment,
  // Adapter management
  getAdapter, setAdapter, resetAdapter, withAdapter
} from 'pulse-js-framework/runtime/dom-adapter';

// === Browser (default) ===
// Automatically used in browser environments
const adapter = getAdapter();  // BrowserDOMAdapter

// === Testing without browser ===
import { setAdapter, MockDOMAdapter } from 'pulse-js-framework/runtime/dom-adapter';

beforeEach(() => {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);
});

afterEach(() => {
  resetAdapter();
});

// Mock adapter provides test helpers
const mock = new MockDOMAdapter();
setAdapter(mock);

// Create elements (works without browser)
const div = mock.createElement('div');
mock.setAttribute(div, 'id', 'test');
mock.appendChild(mock.getBody(), div);

// Test helpers
mock.flushMicrotasks();  // Flush pending microtasks synchronously
mock.runAllTimers();     // Run all setTimeout callbacks
mock.reset();            // Clear all state

// === SSR (Server-Side Rendering) ===
// Use MockDOMAdapter or implement custom adapter for your SSR solution
const ssrAdapter = new MockDOMAdapter();
setAdapter(ssrAdapter);
// ... render your app ...
// Serialize ssrAdapter.getBody() to HTML string

// === Temporary adapter (scoped) ===
const result = withAdapter(new MockDOMAdapter(), () => {
  // All DOM operations in this scope use the mock
  return el('div.test', 'Hello');
});
// Original adapter restored after

// === Custom adapter ===
// Implement DOMAdapter interface for custom rendering targets
class CustomAdapter {
  createElement(tagName) { /* ... */ }
  createTextNode(text) { /* ... */ }
  setAttribute(el, name, value) { /* ... */ }
  appendChild(parent, child) { /* ... */ }
  // ... implement all DOMAdapter methods
}
setAdapter(new CustomAdapter());
```

### Errors (runtime/errors.js)

Structured error classes with source location tracking and helpful suggestions.

```javascript
import {
  // Base classes
  PulseError, CompileError, RuntimeError, CLIError,
  // Compiler errors
  LexerError, ParserError, TransformError,
  // Runtime errors
  ReactivityError, DOMError, StoreError, RouterError,
  // CLI errors
  ConfigError,
  // Utilities
  formatError, createParserError, createErrorMessage, getDocsUrl,
  // Pre-built error creators
  Errors, SUGGESTIONS
} from 'pulse-js-framework/runtime/errors';

// === Using pre-built error creators ===
throw Errors.computedSet('doubled');
// [Pulse] Cannot set computed value 'doubled'.
//   Context: Computed values are derived from other pulses and update automatically.
//   → Use a regular pulse() if you need to set values directly...
//   See: https://pulse-js.fr/reactivity/computed#read-only

throw Errors.mountNotFound('#app');
throw Errors.circularDependency(['effect-1', 'effect-2'], ['effect-3']);
throw Errors.routeNotFound('/unknown');
throw Errors.lazyTimeout(5000);

// === Creating custom errors ===
const error = new ParserError('Unexpected token', {
  line: 10,
  column: 5,
  file: 'App.pulse',
  source: sourceCode,
  suggestion: 'Did you forget a closing brace?'
});

// Format with code snippet
console.error(error.formatWithSnippet());
// ParserError: Unexpected token
//   at App.pulse:10:5
//
//    8 | state {
//    9 |   count: 0
// > 10 |   name
//      |     ^
//   11 | }
//
//   → Did you forget a closing brace?
//   See: https://pulse-js.fr/compiler/syntax

// === Error hierarchy ===
// PulseError (base)
// ├── CompileError
// │   ├── LexerError
// │   ├── ParserError
// │   └── TransformError
// ├── RuntimeError
// │   ├── ReactivityError
// │   ├── DOMError
// │   ├── StoreError
// │   └── RouterError
// └── CLIError
//     └── ConfigError

// === Utility functions ===
const url = getDocsUrl('CIRCULAR_DEPENDENCY');
// 'https://pulse-js.fr/reactivity/effects#circular-dependencies'

const message = createErrorMessage({
  code: 'CUSTOM_ERROR',
  message: 'Something went wrong',
  context: 'While processing user input',
  suggestion: 'Check the input format',
  details: { input: 'invalid', expected: 'string' }
});

// Format any error with source context
const formatted = formatError(error, sourceCode);
```

### PulseMobile Bridge (mobile/bridge/pulse-native.js)

Low-level native bridge for iOS/Android. This is the IIFE bundle loaded in WebView. For the module API, use `runtime/native.js` instead.

```javascript
// This script is loaded in mobile WebView via <script> tag
// It exposes window.PulseMobile globally

// Platform detection
PulseMobile.isNative;    // true if running in native app
PulseMobile.isAndroid;   // true on Android
PulseMobile.isIOS;       // true on iOS
PulseMobile.platform;    // 'android' | 'ios' | 'web'

// === Storage (async, falls back to localStorage on web) ===
await PulseMobile.Storage.setItem('key', 'value');
await PulseMobile.Storage.getItem('key');
await PulseMobile.Storage.removeItem('key');
await PulseMobile.Storage.clear();
await PulseMobile.Storage.keys();

// JSON helpers
await PulseMobile.Storage.setObject('user', { name: 'John' });
await PulseMobile.Storage.getObject('user');

// === Device ===
const info = await PulseMobile.Device.getInfo();
// { platform, userAgent, language, online, ... }

const network = await PulseMobile.Device.getNetworkStatus();
// { connected: true, type: 'wifi' }

PulseMobile.Device.onNetworkChange(status => {
  console.log('Network:', status.connected);
});

// === UI ===
await PulseMobile.UI.showToast('Saved!');
await PulseMobile.UI.showToast('Error!', true);  // Long duration
await PulseMobile.UI.vibrate(100);               // ms

// === Clipboard ===
await PulseMobile.Clipboard.copy('Text to copy');
const text = await PulseMobile.Clipboard.read();

// === App Lifecycle ===
await PulseMobile.App.exit();      // Android only
await PulseMobile.App.minimize();

PulseMobile.App.onPause(() => saveState());
PulseMobile.App.onResume(() => refreshData());
PulseMobile.App.onBackButton(() => handleBack());  // Android only

// === Initialization ===
window.addEventListener('pulse:ready', (e) => {
  console.log('Native ready on', e.detail.platform);
});

// Note: For module usage in your app code, prefer runtime/native.js
// which provides a cleaner API with Pulse integration:
// import { createNativeStorage, NativeUI } from 'pulse-js-framework/runtime/native';
```

## Accessibility

Pulse is designed with accessibility as a core feature, not an afterthought. The framework provides multiple layers of a11y support:

### Three Layers of Accessibility

| Layer | Feature | Description |
|-------|---------|-------------|
| **Runtime** | Auto-ARIA | `el()` automatically applies correct ARIA attributes based on element type and role |
| **Runtime** | a11y.js | Full a11y toolkit: focus management, announcements, preferences, validation |
| **Compiler** | Directives | `@a11y`, `@live`, `@focusTrap`, `@srOnly` in .pulse files |
| **DevTools** | Audit Mode | Real-time a11y validation with visual highlighting and reports |
| **CLI** | Lint Rules | 10 a11y lint rules catch issues at build time |

### Auto-ARIA (Automatic)

The `el()` function automatically applies ARIA attributes based on element semantics:

```javascript
// Dialogs get modal indication
el('dialog')              // → role="dialog" aria-modal="true"

// Buttons get explicit type
el('button')              // → type="button"

// Links without href become buttons
el('a')                   // → role="button" tabindex="0"

// Interactive roles get required states
el('div[role=checkbox]')  // → aria-checked="false"
el('div[role=slider]')    // → aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
el('div[role=combobox]')  // → aria-expanded="false"
el('div[role=tab]')       // → aria-selected="false"

// Warnings in console for missing accessibility
el('img')                 // ⚠️ "A11y: <img> missing alt attribute"
el('input')               // ⚠️ "A11y: <input> should have aria-label..."
el('nav')                 // ⚠️ "A11y: <nav> should have aria-label..."
```

### Quick Start: Making Accessible Components

```javascript
import { el, on } from 'pulse-js-framework/runtime';
import { trapFocus, announce, srOnly } from 'pulse-js-framework/runtime/a11y';

// Accessible modal dialog
function Modal({ title, onClose, children }) {
  const dialog = el('dialog[aria-labelledby=modal-title]',
    el('h2#modal-title', title),
    el('.modal-content', children),
    el('button[aria-label=Close modal]', '×', { onclick: onClose })
  );

  // Trap focus inside modal
  const release = trapFocus(dialog, { autoFocus: true, returnFocus: true });

  // Announce to screen readers
  announce(`${title} dialog opened`);

  return { dialog, close: () => { release(); onClose(); } };
}

// Screen reader only content
el('a[href=/dashboard]',
  el('span.icon', '🏠'),
  srOnly('Go to dashboard')  // Visible only to screen readers
);
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

  // SASS/SCSS syntax works if sass is installed
  $primary: #646cff;
  .btn {
    background: $primary;
    &:hover { opacity: 0.8; }
  }
}
```

**Compiler features:**
- `import` statements (default, named, namespace)
- `slot` / `slot "name"` for content projection
- CSS scoping with unique class prefixes
- Error messages include line:column
- Source map generation for debugging
- Accessibility directives (`@a11y`, `@live`, `@focusTrap`, `@srOnly`)
- Dynamic attributes (`[value={expr}]`) for reactive form bindings
- Event handlers have access to `event` object (`@input(value = event.target.value)`)
- **CSS preprocessor support** - SASS/SCSS and LESS automatically compiled if `sass` or `less` packages are installed

### Accessibility Directives

The .pulse compiler supports built-in accessibility directives that compile to runtime a11y calls:

```pulse
view {
  // @a11y - Set ARIA attributes
  div @a11y(role=dialog, label="Modal window", modal=true) {
    h2 "Settings"
    p "Configure your preferences"
  }

  // @live - Create live region for screen reader announcements
  .status @live(polite) {
    "Status: {status}"
  }

  .error @live(assertive) {
    "Error: {errorMessage}"
  }

  // @focusTrap - Trap focus within element (for modals/dialogs)
  .modal @focusTrap(autoFocus=true, returnFocus=true) {
    input
    button "Submit"
    button "Cancel"
  }

  // @srOnly - Visually hidden text (screen readers only)
  span @srOnly "Skip to main content"

  // Combined directives
  .dialog @a11y(role=dialog, label="Confirm delete") @focusTrap {
    p "Are you sure?"
    button @a11y(label="Confirm deletion") "Delete"
    button "Cancel"
  }
}
```

**Directive reference:**

| Directive | Purpose | Compiles to |
|-----------|---------|-------------|
| `@a11y(role=dialog, label="...")` | Set ARIA attributes | `el('div[role=dialog][aria-label=...]')` |
| `@live(polite)` | Live region (polite) | `el('div[aria-live=polite][aria-atomic=true]')` |
| `@live(assertive)` | Live region (urgent) | `el('div[aria-live=assertive][aria-atomic=true]')` |
| `@focusTrap` | Trap keyboard focus | `trapFocus(el('div'), {})` |
| `@focusTrap(autoFocus=true)` | With options | `trapFocus(el('div'), { autoFocus: true })` |
| `@srOnly` | Screen reader only | `srOnly(content)` |

## Key Files

| File | Purpose |
|------|---------|
| `runtime/pulse.js` | Core reactivity (Pulse class, effect, computed, batch) |
| `runtime/dom.js` | DOM helpers (el, text, bind, on, model, list, when, configureA11y + auto-ARIA) |
| `runtime/router.js` | Router (createRouter, lazy, preload, middleware) |
| `runtime/store.js` | Store (createStore, createActions, plugins) |
| `runtime/context.js` | Context API (createContext, useContext, Provider, provideMany) |
| `runtime/form.js` | Form handling (useForm, useField, useFieldArray, validators) |
| `runtime/async.js` | Async primitives (useAsync, useResource, usePolling, createVersionedAsync) |
| `runtime/http.js` | HTTP client (createHttp, HttpError, useHttp, useHttpResource, interceptors) |
| `runtime/websocket.js` | WebSocket client (createWebSocket, useWebSocket, auto-reconnect, heartbeat) |
| `runtime/graphql.js` | GraphQL client (createGraphQLClient, useQuery, useMutation, useSubscription) |
| `runtime/a11y.js` | Accessibility (announce, trapFocus, validateA11y, ARIA helpers) |
| `runtime/devtools.js` | Dev tools (trackedPulse, time-travel, dependency graph, profiling, a11y audit) |
| `runtime/native.js` | Native mobile bridge (storage, device, UI, lifecycle) |
| `runtime/hmr.js` | Hot module replacement (createHMRContext) |
| `runtime/ssr.js` | Server-side rendering (renderToString, hydrate, serializeState) |
| `runtime/ssr-serializer.js` | HTML serialization for MockNode trees |
| `runtime/ssr-hydrator.js` | Client-side hydration utilities |
| `runtime/ssr-async.js` | Async data collection during SSR |
| `runtime/lite.js` | Minimal bundle (~5KB) with core reactivity and DOM only |
| `runtime/logger.js` | Centralized logging with namespaces and levels |
| `runtime/lru-cache.js` | LRU cache for HTTP/GraphQL response caching |
| `runtime/utils.js` | Security utilities (XSS prevention, URL sanitization, CSS injection protection) |
| `runtime/dom-adapter.js` | DOM abstraction layer for SSR and testing |
| `runtime/errors.js` | Structured error classes with source location tracking |
| `mobile/bridge/pulse-native.js` | Low-level IIFE native bridge for WebView |
| `compiler/lexer.js` | Tokenizer with 50+ token types |
| `compiler/parser.js` | AST builder for .pulse syntax |
| `compiler/transformer.js` | JavaScript code generator |
| `compiler/sourcemap.js` | V3 source map generation (VLQ encoding) |
| `cli/index.js` | CLI commands implementation |
| `cli/lint.js` | SemanticAnalyzer, LintRules for code validation |
| `cli/format.js` | PulseFormatter for consistent code style |
| `cli/analyze.js` | Bundle analysis, import graph, complexity metrics |
| `cli/test.js` | Test runner (findTestFiles, runTests, coverage) |
| `cli/doctor.js` | Project diagnostics (runDiagnostics, health checks) |
| `cli/scaffold.js` | Code generation (components, pages, stores, hooks) |
| `cli/docs.js` | API docs generator (JSDoc parsing, Markdown/HTML/JSON output) |
| `cli/utils/file-utils.js` | findPulseFiles, parseArgs, formatBytes |
| `loader/vite-plugin.js` | Vite plugin for .pulse files (HMR, CSS extraction, preprocessors) |
| `loader/webpack-loader.js` | Webpack loader for .pulse files (HMR, CSS extraction, preprocessors) |
| `loader/rollup-plugin.js` | Rollup plugin for .pulse files (tree-shaking, CSS extraction, preprocessors) |
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

// DOM helpers (includes auto-ARIA)
import { el, mount, on, text, bind, model, list, when, show, match, configureA11y, onMount, onUnmount, component } from 'pulse-js-framework/runtime';

// Router
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

// Store
import { createStore, createActions, createGetters, combineStores, createModuleStore, usePlugin, loggerPlugin, historyPlugin } from 'pulse-js-framework/runtime/store';

// Context API
import { createContext, useContext, Provider, Consumer, provideMany, useContextSelector, disposeContext } from 'pulse-js-framework/runtime/context';

// Form
import { useForm, useField, useFieldArray, validators } from 'pulse-js-framework/runtime/form';

// Async
import { useAsync, useResource, usePolling, createVersionedAsync } from 'pulse-js-framework/runtime/async';

// HTTP
import { createHttp, http, HttpError, useHttp, useHttpResource } from 'pulse-js-framework/runtime/http';

// WebSocket
import { createWebSocket, useWebSocket, WebSocketError } from 'pulse-js-framework/runtime/websocket';

// GraphQL
import { createGraphQLClient, useQuery, useMutation, useSubscription, GraphQLError } from 'pulse-js-framework/runtime/graphql';

// Accessibility
import { announce, trapFocus, createPreferences, validateA11y } from 'pulse-js-framework/runtime/a11y';

// Native (mobile)
import { createNativeStorage, createDeviceInfo, NativeUI, NativeClipboard } from 'pulse-js-framework/runtime/native';

// HMR
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

// DevTools (development only)
import { enableDevTools, trackedPulse, trackedEffect, getDependencyGraph } from 'pulse-js-framework/runtime/devtools';

// SSR (Server-Side Rendering)
import { renderToString, renderToStringSync, hydrate, serializeState, deserializeState, isSSR } from 'pulse-js-framework/runtime/ssr';

// Lite build (minimal bundle ~5KB)
import { pulse, effect, computed, el, mount, list, when } from 'pulse-js-framework/runtime/lite';

// Logger
import { logger, createLogger, loggers, LogLevel, setLogLevel } from 'pulse-js-framework/runtime/logger';

// LRU Cache
import { LRUCache } from 'pulse-js-framework/runtime/lru-cache';

// Utils (security)
import { escapeHtml, sanitizeUrl, safeSetAttribute, debounce, throttle } from 'pulse-js-framework/runtime/utils';

// DOM Adapter (SSR/testing)
import { BrowserDOMAdapter, MockDOMAdapter, setAdapter, getAdapter } from 'pulse-js-framework/runtime/dom-adapter';

// Errors
import { PulseError, Errors, formatError, ParserError, RuntimeError } from 'pulse-js-framework/runtime/errors';

// Compiler
import { compile } from 'pulse-js-framework/compiler';

// Build tool integrations
import pulsePlugin from 'pulse-js-framework/vite';        // Vite plugin
import pulseLoader from 'pulse-js-framework/webpack';     // Webpack loader
import rollupPlugin from 'pulse-js-framework/rollup';     // Rollup plugin
```

## Testing

Tests are in `test/` directory and cover the compiler (lexer, parser, transformer). Run with:

```bash
npm test
# or
node --test test/*.js
```

## CSS Preprocessor Support (SASS/SCSS, LESS, and Stylus)

Pulse supports SASS/SCSS, LESS, and Stylus syntax in style blocks **without adding them as dependencies**. If the user has `sass`, `less`, or `stylus` installed in their project, they are automatically detected and used.

### Quick Start

```bash
# Install SASS in your project (optional)
npm install -D sass

# OR install LESS in your project (optional)
npm install -D less

# OR install Stylus in your project (optional)
npm install -D stylus
```

#### SASS/SCSS Example

```pulse
style {
  // SASS variables
  $primary: #646cff;
  $spacing: 20px;

  // Nesting with parent reference
  .button {
    background: $primary;
    padding: $spacing;

    &:hover {
      opacity: 0.8;
    }

    &.disabled {
      opacity: 0.5;
    }
  }

  // Mixins
  @mixin flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    @include flex-center;
    height: 100vh;
  }
}
```

#### LESS Example

```pulse
style {
  // LESS variables
  @primary: #646cff;
  @spacing: 20px;

  // Nesting with parent reference
  .button {
    background: @primary;
    padding: @spacing;

    &:hover {
      opacity: 0.8;
    }

    &.disabled {
      opacity: 0.5;
    }
  }

  // Mixins
  .flex-center() {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    .flex-center();
    height: 100vh;
  }
}
```

#### Stylus Example

```pulse
style {
  // Stylus variables (no $ or @)
  primary = #646cff
  spacing = 20px

  // Nesting with parent reference (flexible syntax)
  .button
    background primary
    padding spacing

    &:hover
      opacity 0.8

    &.disabled
      opacity 0.5

  // Mixins (no braces needed)
  flex-center()
    display flex
    align-items center
    justify-content center

  .container
    flex-center()
    height 100vh
}
```

### How It Works

| Environment | Preprocessor Processing |
|-------------|-------------------------|
| **Vite projects** | Vite plugin auto-detects SASS/LESS/Stylus, compiles before CSS pipeline |
| **CLI dev server** | Compiles on-the-fly when serving .pulse files |
| **CLI build** | Compiles during production build |
| **Without preprocessor** | Falls through - CSS nesting already supported natively |
| **Auto-detection** | Pulse automatically detects which preprocessor to use based on syntax (priority: SASS > LESS > Stylus) |

### Supported Features

**SASS/SCSS:**
- Variables (`$color: red;`)
- Nesting with `&` parent reference
- Mixins (`@mixin`, `@include`)
- Extend (`@extend`)
- Functions (`@function`)
- Control directives (`@if`, `@else`, `@for`, `@each`, `@while`)
- Modules (`@use`, `@forward`)
- Interpolation (`#{$var}`)
- Placeholder selectors (`%placeholder`)

**LESS:**
- Variables (`@color: red;`)
- Nesting with `&` parent reference
- Mixins (`.mixin()`, parametric mixins)
- Extend (`&:extend()`)
- Guards (`when (@a > 0)`)
- Interpolation (`@{var}`)
- Import options (`@import (less) "file"`)
- Plugins (`@plugin "name"`)

**Stylus:**
- Variables (`color = red` - no $ or @)
- Flexible syntax (semicolons and braces optional)
- Nesting with `&` parent reference
- Mixins (no braces needed)
- Conditionals (`if`, `unless`)
- Loops (`for item in items`)
- Extend (`@extend`, `@extends`)
- Interpolation (`{$var}`)
- Built-in functions (`lighten()`, `darken()`, etc.)

### API (Advanced)

```javascript
import {
  // Detection
  hasSassSyntax,         // Check if CSS contains SASS syntax
  hasLessSyntax,         // Check if CSS contains LESS syntax
  hasStylusSyntax,       // Check if CSS contains Stylus syntax
  detectPreprocessor,    // Auto-detect: 'sass' | 'less' | 'stylus' | 'none'

  // SASS
  isSassAvailable,       // Check if sass is installed
  getSassVersion,        // Get sass version string
  compileSass,           // Compile SCSS to CSS (async)
  compileSassSync,       // Compile SCSS to CSS (sync)

  // LESS
  isLessAvailable,       // Check if less is installed
  getLessVersion,        // Get less version string
  compileLess,           // Compile LESS to CSS (async)
  compileLessSync,       // Compile LESS to CSS (sync)

  // Stylus
  isStylusAvailable,     // Check if stylus is installed
  getStylusVersion,      // Get stylus version string
  compileStylus,         // Compile Stylus to CSS (async)
  compileStylusSync,     // Compile Stylus to CSS (sync)

  // Auto-compile (recommended)
  preprocessStyles,      // Auto-detect and compile (async)
  preprocessStylesSync,  // Auto-detect and compile (sync)
} from 'pulse-js-framework/compiler/preprocessor';

// Auto-detect and compile
const result = preprocessStylesSync(css, {
  filename: 'component.pulse',
  loadPaths: ['./src/styles'],
  compressed: false
});
// result: { css: string, preprocessor: 'sass'|'less'|'stylus'|'none', sourceMap?: object }

// Force specific preprocessor
const sassResult = preprocessStylesSync(css, {
  preprocessor: 'sass',  // Force SASS compilation (also: 'less', 'stylus')
  filename: 'component.pulse'
});

// Check which preprocessor was used
const type = detectPreprocessor(css);  // 'sass' | 'less' | 'stylus' | 'none'
```

## Development Notes

- Vite integration is optional but recommended for projects
- The framework works directly in browsers without build step
- Circular dependency protection limits to 100 iterations
- Effects use try-catch to prevent one error from breaking others
- List rendering uses key functions for efficient DOM updates
- **Accessibility is automatic**: `el()` applies ARIA attributes based on semantics
- Use `configureA11y({ enabled: false })` to disable auto-ARIA if needed
- Run `pulse lint` to catch a11y issues at build time (10 rules)
- Use DevTools `enableA11yAudit()` for runtime a11y checking
- **CSS preprocessors are optional**: Install `sass`, `less`, or `stylus` in your project to enable SCSS/LESS/Stylus in style blocks

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

### Accessibility Lint Rules

| Rule | Message | Fix |
|------|---------|-----|
| `a11y-img-alt` | Image missing alt attribute | Add `alt="description"` or `alt=""` for decorative |
| `a11y-button-text` | Button has no accessible name | Add text content, `aria-label`, or `title` |
| `a11y-link-text` | Link has no accessible name | Add text content, `aria-label`, or image with alt |
| `a11y-input-label` | Form input missing label | Add `aria-label`, `id` with `<label>`, or `aria-labelledby` |
| `a11y-click-key` | Click on non-interactive element | Add `role="button"` + keyboard handler, or use `<button>` |
| `a11y-no-autofocus` | Avoid autofocus | Remove `autofocus` - disorients screen readers |
| `a11y-no-positive-tabindex` | Avoid positive tabindex | Use `tabindex="0"` or `"-1"`, rely on DOM order |
| `a11y-heading-order` | Heading level skipped | Use sequential headings (h1, h2, h3...) |
| `a11y-aria-props` | Invalid ARIA attribute | Check attribute name against WAI-ARIA spec |
| `a11y-role-props` | Role requires specific attributes | Add required ARIA attributes for the role |

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

## Internal Algorithms

### LIS Algorithm (dom-list.js)

The `list()` function uses the **Longest Increasing Subsequence (LIS)** algorithm to minimize DOM operations during list reconciliation.

**Why LIS?**

When a list is reordered, naively moving every element is O(n) DOM operations. LIS identifies which elements are already in correct relative order, so only the others need to move.

**Algorithm (O(n log n)):**

```
Input: [3, 1, 4, 1, 5, 9, 2, 6] (old positions of items in new order)
Output: Indices of items that DON'T need to move

1. Binary search to build increasing subsequence
2. Track parent pointers for reconstruction
3. Result: Items in LIS stay put, others move
```

**Implementation in `computeLIS(arr)`:**

```javascript
// dp[i] = smallest tail of LIS of length i+1
// parent[i] = previous element index in LIS ending at i
// indices[i] = original array index of dp[i]

for each element:
  1. Binary search for insertion position in dp
  2. Update dp and indices at that position
  3. Set parent pointer to previous LIS element

// Reconstruct by following parent pointers backward
```

**Example:**

```
Old order: [A, B, C, D, E]
New order: [B, D, A, E, C]

Old positions in new order: [2, 0, 4, 1, 3]
                             A  B  C  D  E

LIS of [2, 0, 4, 1, 3] = [0, 1, 3] → indices [1, 3, 4] → B, D, E stay
Only A and C need DOM moves (2 moves instead of 5)
```

**Complexity:**

| Case | DOM Operations |
|------|----------------|
| Append only | O(1) - single DocumentFragment insert |
| Reverse | O(n) - all items move |
| Shuffle | O(n - LIS length) - typically much less than n |
| Single move | O(1) - LIS covers n-1 items |

---

### Selector Cache LRU (dom-selector.js)

The `parseSelector()` function caches parsed results using an **LRU (Least Recently Used)** cache.

**Why LRU instead of unbounded Map?**

- Apps reuse the same selectors (`div.container`, `button.primary`)
- Without eviction, memory grows unbounded in long-running SPAs
- LRU keeps hot selectors cached, evicts rarely-used ones

**Configuration:**

```javascript
import { configureDom, getCacheMetrics } from 'pulse-js-framework/runtime';

// Default: 500 selectors (covers most apps with 50-200 unique selectors)
configureDom({ selectorCacheCapacity: 1000 });  // Increase for large apps
configureDom({ selectorCacheCapacity: 0 });     // Disable caching

// Monitor performance
const stats = getCacheMetrics();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Size: ${stats.size}/${stats.capacity}`);
```

**Cache behavior:**

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `get(selector)` | O(1) | Returns shallow copy (prevents mutation) |
| `set(selector, config)` | O(1) | Auto-evicts LRU if at capacity |
| Cache miss | O(n) | Parses selector, then caches |

**Shallow copy on hit:**

```javascript
// Cache stores: { tag: 'div', classes: ['a', 'b'], attrs: { x: '1' } }
// Returns copy:  { tag: 'div', classes: [...], attrs: {...} }
// Prevents: cached.classes.push('c') from corrupting cache
```

---

### Effect Cleanup in Conditionals (dom-conditional.js)

The `when()` and `match()` functions manage effect cleanup to prevent memory leaks and stale subscriptions.

**Cleanup guarantees:**

1. **DOM nodes removed** - Previous branch's nodes are removed from DOM
2. **Cleanup functions called** - Any cleanup returned by the previous render
3. **State reset** - `currentNodes = []` and `currentCleanup = null`

**Lifecycle in `when(condition, thenBranch, elseBranch)`:**

```
Initial render (condition = true):
  1. effect() runs
  2. thenBranch() called, nodes inserted
  3. currentNodes = [rendered nodes]

Condition changes to false:
  1. effect() re-runs (tracked condition changed)
  2. Previous nodes removed: dom.removeNode(node) for each
  3. currentCleanup?.() called (if branch returned cleanup)
  4. Reset: currentNodes = [], currentCleanup = null
  5. elseBranch() called, new nodes inserted

Component unmount:
  1. Parent effect disposal cascades
  2. when's effect disposed
  3. Final cleanup runs
```

**Important:** Effects inside conditional branches remain subscribed to their dependencies even after the branch is removed. This is handled by:

- The compiler adding optional chaining for nullable props
- Branch templates being functions (lazy evaluation)
- Cleanup running before new branch renders

**Memory safety pattern:**

```javascript
when(
  () => showModal.get(),
  () => {
    // This effect is created fresh each time condition becomes true
    const modal = el('dialog', ...);
    const cleanup = trapFocus(modal);

    // Cleanup stored for when condition becomes false
    return { nodes: [modal], cleanup };
  }
);
```

**Difference between `when()` and `show()`:**

| Feature | `when()` | `show()` |
|---------|----------|----------|
| DOM presence | Adds/removes nodes | Always in DOM |
| Effects | Created/disposed per branch | Always active |
| Memory | Lower when hidden | Constant |
| Transition | Harder (node recreation) | Easier (CSS) |
| Use case | Complex conditional UI | Simple visibility toggle |
