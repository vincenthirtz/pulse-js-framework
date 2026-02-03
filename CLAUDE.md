# CLAUDE.md - Pulse Framework

## Project Overview

Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications (SPAs). It features:

- **Declarative DOM creation** using CSS selector syntax (`el('.container#main')`)
- **Signal-based reactivity** (pulsations) for automatic UI updates
- **Custom DSL** (.pulse files) that compile to JavaScript
- **Zero dependencies** - completely self-contained
- **Accessibility-first** - built-in a11y helpers, auto-ARIA, and audit tools

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
│   ├── store.js         # Global state management
│   ├── form.js          # Form validation and management
│   ├── async.js         # Async primitives (useAsync, useResource, usePolling)
│   ├── http.js          # HTTP client (fetch wrapper, interceptors)
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
  // A11y Audit
  runA11yAudit, enableA11yAudit, disableA11yAudit,
  getA11yIssues, getA11yStats, exportA11yReport,
  toggleA11yHighlights
} from 'pulse-js-framework/runtime/devtools';

// Enable dev tools (exposes window.__PULSE_DEVTOOLS__)
enableDevTools({ logUpdates: true, warnOnSlowEffects: true });

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

### A11y (runtime/a11y.js)

```javascript
import {
  // Announcements (screen readers)
  announce, announcePolite, announceAssertive, createLiveAnnouncer,
  // Focus management
  trapFocus, focusFirst, focusLast, saveFocus, restoreFocus, getFocusableElements,
  // Skip links
  createSkipLink, installSkipLinks,
  // User preferences
  prefersReducedMotion, prefersColorScheme, prefersHighContrast, createPreferences,
  // ARIA helpers
  setAriaAttributes, createDisclosure, createTabs, createRovingTabindex,
  // Validation
  validateA11y, logA11yIssues, highlightA11yIssues,
  // Utilities
  generateId, isAccessiblyHidden, makeInert, srOnly
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

// Skip links for keyboard navigation
installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'navigation', text: 'Skip to navigation' }
]);

// User preferences (reactive)
if (prefersReducedMotion()) {
  // Disable animations
}
const scheme = prefersColorScheme();  // 'light' | 'dark' | 'no-preference'
const prefs = createPreferences();    // Reactive pulses
effect(() => {
  if (prefs.reducedMotion.get()) disableAnimations();
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

// Accessibility validation
const issues = validateA11y(document.body);
logA11yIssues(issues);              // Log to console
const cleanup = highlightA11yIssues(issues);  // Visual overlay

// Utilities
const id = generateId('modal');     // 'modal-1234567890-abc123'
isAccessiblyHidden(element);        // Check if hidden from a11y tree
const restore = makeInert(element); // Set inert + aria-hidden
const span = srOnly('Screen reader only text');  // Visually hidden
setAriaAttributes(element, { label: 'Close', expanded: true });
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
}
```

**Compiler features:**
- `import` statements (default, named, namespace)
- `slot` / `slot "name"` for content projection
- CSS scoping with unique class prefixes
- Error messages include line:column
- Source map generation for debugging
- Accessibility directives (`@a11y`, `@live`, `@focusTrap`, `@srOnly`)

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
| `runtime/form.js` | Form handling (useForm, useField, useFieldArray, validators) |
| `runtime/async.js` | Async primitives (useAsync, useResource, usePolling, createVersionedAsync) |
| `runtime/http.js` | HTTP client (createHttp, HttpError, useHttp, useHttpResource, interceptors) |
| `runtime/a11y.js` | Accessibility (announce, trapFocus, validateA11y, ARIA helpers) |
| `runtime/devtools.js` | Dev tools (trackedPulse, time-travel, dependency graph, profiling, a11y audit) |
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

// DOM helpers (includes auto-ARIA)
import { el, mount, on, text, bind, model, list, when, configureA11y } from 'pulse-js-framework/runtime';

// Router
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

// Store
import { createStore, createActions } from 'pulse-js-framework/runtime/store';

// Form
import { useForm, useField, useFieldArray, validators } from 'pulse-js-framework/runtime/form';

// Async
import { useAsync, useResource, usePolling, createVersionedAsync } from 'pulse-js-framework/runtime/async';

// HTTP
import { createHttp, http, HttpError, useHttp, useHttpResource } from 'pulse-js-framework/runtime/http';

// Accessibility
import { announce, trapFocus, createPreferences, validateA11y } from 'pulse-js-framework/runtime/a11y';

// Native (mobile)
import { createNativeStorage, createDeviceInfo, NativeUI, NativeClipboard } from 'pulse-js-framework/runtime/native';

// HMR
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

// DevTools (development only)
import { enableDevTools, trackedPulse, trackedEffect, getDependencyGraph } from 'pulse-js-framework/runtime/devtools';

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
- **Accessibility is automatic**: `el()` applies ARIA attributes based on semantics
- Use `configureA11y({ enabled: false })` to disable auto-ARIA if needed
- Run `pulse lint` to catch a11y issues at build time (10 rules)
- Use DevTools `enableA11yAudit()` for runtime a11y checking

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
