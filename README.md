# Pulse Framework

[![CI](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/vincenthirtz/pulse-js-framework/graph/badge.svg)](https://codecov.io/gh/vincenthirtz/pulse-js-framework)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2597dac2-228a-4d3e-bea8-4e7ef8ac5c53/deploy-status)](https://app.netlify.com/projects/pulse-js/deploys)

No build. No dependencies. Just JavaScript.

## Features

- **CSS Selector Syntax** - Create DOM elements using familiar CSS selectors
- **Reactive Pulsations** - Automatic UI updates when state changes
- **Custom DSL** - Optional `.pulse` file format for cleaner code
- **No Build Required** - Works directly in the browser
- **Lightweight** - Minimal footprint, maximum performance
- **Router & Store** - Built-in SPA routing and state management
- **Form Handling** - Validation, async validators, field arrays
- **Async Primitives** - useAsync, useResource, usePolling with SWR caching
- **Hot Module Replacement** - Full HMR with state preservation
- **Mobile Apps** - Build native Android & iOS apps (zero dependencies)
- **TypeScript Support** - Full type definitions for IDE autocomplete
- **DevTools** - Time-travel debugging, dependency graph visualization

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

### Or with TypeScript

```bash
npx pulse-js-framework create my-app --typescript
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

  div.append(display, increment);
  return div;
}

mount('#app', Counter());
```

## CSS Selector Syntax

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
import { pulse, effect, computed, batch } from 'pulse-js-framework';

const firstName = pulse('John');
const lastName = pulse('Doe');

// Computed values
const fullName = computed(() => `${firstName.get()} ${lastName.get()}`);

// Effects auto-run when dependencies change
effect(() => console.log(`Hello, ${fullName.get()}!`));

firstName.set('Jane'); // Logs: "Hello, Jane Doe!"

// Batch updates (effects run once)
batch(() => {
  firstName.set('John');
  lastName.set('Smith');
});
```

## .pulse File Format

```pulse
@page Counter

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}

style {
  .counter { text-align: center; padding: 20px }
}
```

See [Pulse DSL documentation](docs/pulse-dsl.md) for full syntax reference.

## CLI Commands

```bash
# Project Creation
pulse create <name>              # Create new project
pulse create <name> --typescript # Create TypeScript project
pulse init --typescript          # Initialize in current directory

# Development
pulse dev [port]                 # Start dev server (default: 3000)
pulse build                      # Build for production
pulse preview [port]             # Preview production build
pulse compile <file>             # Compile .pulse file

# Code Quality
pulse lint [files]               # Validate .pulse files
pulse lint --fix                 # Auto-fix fixable issues
pulse format [files]             # Format .pulse files
pulse analyze                    # Analyze bundle

# Testing
pulse test                       # Run tests with Node.js test runner
pulse test --coverage            # Run tests with coverage
pulse test --watch               # Watch mode
pulse test --create <name>       # Generate test file

# Project Tools
pulse doctor                     # Run project diagnostics
pulse doctor --verbose           # Detailed diagnostics

# Scaffolding
pulse scaffold component <name>  # Generate component
pulse scaffold page <name>       # Generate page
pulse scaffold store <name>      # Generate store module
pulse scaffold hook <name>       # Generate custom hook
pulse scaffold service <name>    # Generate API service
pulse scaffold context <name>    # Generate context provider
pulse scaffold layout <name>     # Generate layout component

# Documentation
pulse docs --generate            # Generate API docs (Markdown)
pulse docs --generate -f html    # Generate HTML docs
pulse docs --generate -f json    # Generate JSON docs
```

See [CLI documentation](docs/cli.md) for full command reference.

## Core Modules

### Router

```javascript
import { createRouter, lazy } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/dashboard': lazy(() => import('./Dashboard.js'))
  }
});
```

### Store

```javascript
import { createStore, createActions } from 'pulse-js-framework/runtime/store';

const store = createStore({ user: null, theme: 'light' }, { persist: true });
const actions = createActions(store, {
  login: (store, user) => store.user.set(user)
});
```

### Form

```javascript
import { useForm, validators } from 'pulse-js-framework/runtime/form';

const { fields, handleSubmit, isValid } = useForm(
  { email: '', password: '' },
  {
    email: [validators.required(), validators.email()],
    password: [validators.required(), validators.minLength(8)]
  }
);
```

### Async

```javascript
import { useAsync, useResource } from 'pulse-js-framework/runtime/async';

const { data, loading } = useAsync(() => fetch('/api/users').then(r => r.json()));

const users = useResource('users', fetchUsers, { refreshInterval: 30000 });
```

### Accessibility

```javascript
import {
  // Announcements
  announce, createAnnouncementQueue,
  // Focus management
  trapFocus, onEscapeKey, createFocusVisibleTracker,
  // User preferences
  prefersReducedMotion, prefersReducedTransparency, forcedColorsMode,
  // ARIA widgets
  createModal, createTooltip, createAccordion, createMenu,
  // Color contrast
  getContrastRatio, meetsContrastRequirement,
  // Validation
  validateA11y
} from 'pulse-js-framework/runtime/a11y';

// Screen reader announcements
announce('Item saved successfully');

// Accessible modal dialog
const modal = createModal(dialog, { labelledBy: 'title', closeOnBackdropClick: true });
modal.open();

// Check color contrast (WCAG)
const ratio = getContrastRatio('#333', '#fff'); // 12.63
meetsContrastRequirement(ratio, 'AA'); // true
```

See [Accessibility documentation](docs/accessibility.md) for full guide.

See [API documentation](docs/api.md) for full reference.

## Mobile Apps

Build native Android and iOS apps:

```bash
pulse mobile init
pulse build
pulse mobile build android
pulse mobile run android
```

```javascript
import { createNativeStorage, NativeUI } from 'pulse-js-framework/runtime/native';

const storage = createNativeStorage();
const theme = storage.get('theme', 'light');
NativeUI.toast('Hello from native!');
```

See [Mobile documentation](docs/mobile.md) for full guide.

## IDE Extensions

### VS Code

```bash
cd vscode-extension && bash install.sh
```

### IntelliJ IDEA / WebStorm

```bash
cd intellij-plugin && ./gradlew buildPlugin
```

Features: Syntax highlighting, code snippets, bracket matching.

## TypeScript Support

Full type definitions included:

```typescript
import { pulse, Pulse } from 'pulse-js-framework/runtime';
import { createRouter, Router } from 'pulse-js-framework/runtime/router';

const count: Pulse<number> = pulse(0);
```

## Examples

| Example | Description |
|---------|-------------|
| [Todo App](examples/todo) | Task management with filters |
| [Blog](examples/blog) | CRUD, categories, search |
| [Chat App](examples/chat) | Real-time messaging |
| [E-commerce](examples/ecommerce) | Shopping cart |
| [Dashboard](examples/dashboard) | Admin UI |
| [HMR Demo](examples/hmr) | Hot module replacement |
| [Router Demo](examples/router) | SPA routing |
| [Store Demo](examples/store) | State with undo/redo |
| [Electron App](examples/electron) | Desktop notes app |

## Documentation

- [API Reference](docs/api.md) - Complete API documentation
- [CLI Commands](docs/cli.md) - Command line interface
- [Pulse DSL](docs/pulse-dsl.md) - .pulse file syntax
- [Accessibility](docs/accessibility.md) - A11y guide and ARIA helpers
- [HTTP Client](docs/http.md) - Fetch wrapper with interceptors
- [WebSocket](docs/websocket.md) - Real-time with auto-reconnect
- [GraphQL](docs/graphql.md) - Queries, mutations, subscriptions
- [Context API](docs/context.md) - Dependency injection
- [DevTools](docs/devtools.md) - Debugging and profiling
- [Mobile Apps](docs/mobile.md) - Native Android & iOS

## License

MIT
