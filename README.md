# Pulse Framework

[![CI](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2597dac2-228a-4d3e-bea8-4e7ef8ac5c53/deploy-status)](https://app.netlify.com/projects/pulse-js/deploys)

A declarative DOM framework with CSS selector-based structure and reactive pulsations.

## Features

- **CSS Selector Syntax** - Create DOM elements using familiar CSS selectors
- **Reactive Pulsations** - Automatic UI updates when state changes
- **Custom DSL** - Optional `.pulse` file format for cleaner code
- **No Build Required** - Works directly in the browser
- **Lightweight** - Minimal footprint, maximum performance
- **Router & Store** - Built-in SPA routing and state management
- **Hot Module Replacement** - Full HMR with state preservation
- **Mobile Apps** - Build native Android & iOS apps (zero dependencies)
- **TypeScript Support** - Full type definitions for IDE autocomplete

## Installation

```bash
npm install pulse-js-framework
```

## Quick Start

### Create a new project

```bash
npx pulse-js-framework create my-app
cd my-app
npm install
npm run dev
```

### Or use directly

```javascript
import { pulse, effect, el, mount } from 'pulse-js-framework';

// Create reactive state
const count = pulse(0);

// Build UI with CSS selector syntax
function Counter() {
  const div = el('.counter');

  const display = el('h1');
  effect(() => {
    display.textContent = `Count: ${count.get()}`;
  });

  const increment = el('button.btn', '+');
  increment.onclick = () => count.update(n => n + 1);

  const decrement = el('button.btn', '-');
  decrement.onclick = () => count.update(n => n - 1);

  div.append(display, increment, decrement);
  return div;
}

mount('#app', Counter());
```

## CSS Selector Syntax

Create DOM elements using familiar CSS syntax:

```javascript
el('div')                    // <div></div>
el('.container')             // <div class="container"></div>
el('#app')                   // <div id="app"></div>
el('button.btn.primary')     // <button class="btn primary"></button>
el('input[type=text]')       // <input type="text">
el('h1', 'Hello World')      // <h1>Hello World</h1>
```

## Reactivity

```javascript
import { pulse, effect, computed } from 'pulse-js-framework';

// Create reactive values
const firstName = pulse('John');
const lastName = pulse('Doe');

// Computed values
const fullName = computed(() =>
  `${firstName.get()} ${lastName.get()}`
);

// Effects auto-run when dependencies change
effect(() => {
  console.log(`Hello, ${fullName.get()}!`);
});

firstName.set('Jane'); // Logs: "Hello, Jane Doe!"
```

## .pulse File Format

```pulse
@page Counter

// Import other components
import Button from './Button.pulse'
import { Header, Footer } from './components.pulse'

state {
  count: 0
}

view {
  .counter {
    Header
    h1 "Count: {count}"
    Button @click(count++) "+"
    Button @click(count--) "-"
    Footer
  }
}

style {
  .counter {
    text-align: center
    padding: 20px
  }
}
```

**Compiler Features:**
- Import statements for component composition
- Slots for content projection (`slot`, `slot "name"`)
- CSS scoping (styles are automatically scoped to component)
- Native `router {}` and `store {}` blocks
- Detailed error messages with line/column info

### Router & Store DSL (v1.4.0)

Define routing and state management directly in your `.pulse` files:

```pulse
@page App

router {
  mode: "hash"
  base: "/app"
  routes {
    "/": HomePage
    "/users": UsersPage
    "/users/:id": UserDetailPage
  }
  beforeEach(to, from) {
    if (!store.isAuthenticated) return "/login"
  }
}

store {
  state {
    user: null
    theme: "dark"
  }
  getters {
    isAuthenticated() { return this.user !== null }
  }
  actions {
    login(userData) { this.user = userData }
    logout() { this.user = null }
    toggleTheme() { this.theme = this.theme === "dark" ? "light" : "dark" }
  }
  persist: true
  storageKey: "my-app"
}

view {
  .app {
    nav {
      @link("/") "Home"
      @link("/users") "Users"
    }
    main {
      @outlet
    }
  }
}
```

**Router DSL Features:**
- Route definitions with path parameters (`:id`) and wildcards (`*path`)
- Navigation guards (`beforeEach`, `afterEach`)
- `@link("/path")` directive for navigation links
- `@outlet` directive for route content
- `@navigate`, `@back`, `@forward` directives

**Store DSL Features:**
- Reactive state with automatic signal creation
- Getters with `this.x` → `store.x.get()` transformation
- Actions with `this.x = y` → `store.x.set(y)` transformation
- Built-in persistence via `persist: true`
- Custom storage key

## API Reference

### Reactivity

- `pulse(value)` - Create a reactive value
- `pulse.get()` - Read value (tracks dependency)
- `pulse.set(value)` - Set new value
- `pulse.update(fn)` - Update with function
- `pulse.peek()` - Read without tracking
- `effect(fn)` - Create reactive side effect
- `computed(fn)` - Create derived value
- `batch(fn)` - Batch multiple updates

### DOM

- `el(selector, ...children)` - Create element
- `mount(target, element)` - Mount to DOM
- `text(fn)` - Reactive text node
- `list(items, template)` - Reactive list
- `when(condition, then, else)` - Conditional render

### Router

```javascript
import { createRouter } from 'pulse-js-framework/runtime/router.js';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/about': AboutPage,
    '/users/:id': UserPage,
    '/admin': {
      handler: AdminPage,
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuthenticated()) return '/login';
      },
      children: {
        '/users': AdminUsersPage,
        '/settings': AdminSettingsPage
      }
    }
  },
  scrollBehavior: (to, from, savedPosition) => {
    return savedPosition || { x: 0, y: 0 };
  }
});

// Navigation guards
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return '/login';
  }
});

router.start();
```

**Router Features:**
- Route params (`:id`) and wildcards (`*path`)
- Nested routes with `children`
- Route meta fields
- Per-route guards (`beforeEnter`)
- Global guards (`beforeEach`, `beforeResolve`, `afterEach`)
- Scroll restoration
- Lazy-loaded routes (async handlers)

### Store

```javascript
import { createStore } from 'pulse-js-framework/runtime/store.js';

const store = createStore({
  user: null,
  theme: 'light'
}, { persist: true });

store.user.set({ name: 'John' });
```

### HMR (Hot Module Replacement)

Pulse supports full HMR with state preservation during development:

```javascript
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

const hmr = createHMRContext(import.meta.url);

// State preserved across HMR updates
const count = hmr.preservePulse('count', 0);
const items = hmr.preservePulse('items', []);

// Effects tracked for automatic cleanup
hmr.setup(() => {
  effect(() => {
    document.title = `Count: ${count.get()}`;
  });
});

// Accept HMR updates
hmr.accept();
```

**HMR Features:**
- `preservePulse(key, value)` - Create pulses that survive module replacement
- `setup(callback)` - Execute with effect tracking for cleanup
- Automatic event listener cleanup (no accumulation)
- Works with Vite dev server

### Logger

```javascript
import { createLogger, setLogLevel, LogLevel } from 'pulse-js-framework/runtime/logger';

// Create a namespaced logger
const log = createLogger('MyComponent');

log.info('Component initialized');    // [MyComponent] Component initialized
log.warn('Deprecated method used');
log.error('Failed to load', error);
log.debug('Detailed info');           // Only shown at DEBUG level

// Set global log level
setLogLevel(LogLevel.DEBUG);  // SILENT, ERROR, WARN, INFO, DEBUG

// Child loggers for sub-namespaces
const childLog = log.child('Validation');
childLog.info('Validating'); // [MyComponent:Validation] Validating
```

## CLI Commands

```bash
# Project Commands
pulse create <name>    # Create new project
pulse dev [port]       # Start dev server (default: 3000)
pulse build            # Build for production
pulse preview [port]   # Preview production build (default: 4173)
pulse compile <file>   # Compile .pulse file to JavaScript

# Code Quality
pulse lint [files]     # Validate .pulse files for errors and style
pulse lint --fix       # Auto-fix fixable issues
pulse format [files]   # Format .pulse files consistently
pulse format --check   # Check formatting without writing
pulse analyze          # Analyze bundle size and dependencies
pulse analyze --json   # Output analysis as JSON

# Mobile
pulse mobile init      # Initialize mobile platforms
pulse mobile build android|ios  # Build native app
pulse mobile run android|ios    # Run on device/emulator
```

### Lint Command

Validates `.pulse` files for errors and style issues:

```bash
pulse lint src/              # Lint all files in src/
pulse lint "**/*.pulse"      # Lint all .pulse files
pulse lint --fix             # Auto-fix fixable issues
```

**Checks performed:**
- Undefined references (state variables, components)
- Unused imports and state variables
- Naming conventions (PascalCase for pages, camelCase for state)
- Empty blocks
- Import order

### Format Command

Formats `.pulse` files with consistent style:

```bash
pulse format                  # Format all .pulse files
pulse format src/App.pulse    # Format specific file
pulse format --check          # Check without writing (CI mode)
```

**Formatting rules:**
- 2-space indentation
- Sorted imports (alphabetically)
- Consistent brace placement
- Proper spacing around operators

### Analyze Command

Analyzes your Pulse project for bundle insights:

```bash
pulse analyze                 # Console report
pulse analyze --json          # JSON output
pulse analyze --verbose       # Detailed metrics
```

**Analysis includes:**
- File count and total size
- Component complexity scores
- Import dependency graph
- Dead code detection (unreachable files)

## Mobile Apps

Build native Android and iOS apps from your Pulse project with zero external dependencies:

```bash
# Initialize mobile platforms
pulse mobile init

# Build your web app first
pulse build

# Build for Android (requires Android SDK)
pulse mobile build android

# Build for iOS (requires macOS + Xcode)
pulse mobile build ios

# Run on device/emulator
pulse mobile run android
```

### Native APIs

Access native features in your Pulse app:

```javascript
import { createNativeStorage, NativeUI, onNativeReady } from 'pulse-js-framework/runtime/native';

onNativeReady(({ platform }) => {
  console.log(`Running on ${platform}`); // 'android', 'ios', or 'web'

  // Persistent native storage with Pulse reactivity
  const storage = createNativeStorage();
  const count = storage.get('count', 0);
  count.set(42); // Auto-persisted to native storage

  // Native toast notification
  NativeUI.toast('Hello from Pulse!');

  // Haptic feedback
  NativeUI.vibrate(100);
});
```

**Available APIs:** Storage, Device Info, Network Status, Toast, Vibration, Clipboard, App Lifecycle

## VSCode Extension

Pulse includes a VSCode extension for `.pulse` files with syntax highlighting and snippets.

### Installation

```bash
# Windows (PowerShell)
cd vscode-extension
powershell -ExecutionPolicy Bypass -File install.ps1

# macOS/Linux
cd vscode-extension
bash install.sh
```

Then restart VSCode. You'll get:
- Syntax highlighting for `.pulse` files
- Code snippets (`page`, `state`, `view`, `@click`, etc.)
- Bracket matching and auto-closing
- Comment toggling (Ctrl+/)

## TypeScript Support

Pulse includes full TypeScript definitions for IDE autocomplete and type checking:

```typescript
import { pulse, effect, computed, Pulse } from 'pulse-js-framework/runtime';
import { el, list, when } from 'pulse-js-framework/runtime';
import { createRouter, Router } from 'pulse-js-framework/runtime/router';
import { createStore, Store } from 'pulse-js-framework/runtime/store';

// Full autocomplete for all APIs
const count: Pulse<number> = pulse(0);
const doubled = computed(() => count.get() * 2);

effect(() => {
  console.log(count.get()); // Type-safe access
});
```

Types are automatically detected by IDEs (VS Code, WebStorm) without additional configuration.

## Examples

- [HMR Demo](examples/hmr) - Hot Module Replacement with state preservation
- [Blog](examples/blog) - Full blog app with CRUD, categories, search, dark mode
- [Todo App](examples/todo) - Task management with filters and persistence
- [Chat App](examples/chat) - Real-time messaging interface
- [E-commerce](examples/ecommerce) - Shopping cart with product catalog
- [Weather App](examples/meteo) - Weather dashboard with forecasts
- [Router Demo](examples/router) - SPA routing with guards
- [Store Demo](examples/store) - State management with undo/redo
- [Admin Dashboard](examples/dashboard) - Complete admin UI with all features

## License

MIT
