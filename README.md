# Pulse Framework

[![CI](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/vincenthirtz/pulse-js-framework/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/vincenthirtz/pulse-js-framework/graph/badge.svg)](https://codecov.io/gh/vincenthirtz/pulse-js-framework)
[![Netlify Status](https://api.netlify.com/api/v1/badges/2597dac2-228a-4d3e-bea8-4e7ef8ac5c53/deploy-status)](https://app.netlify.com/projects/pulse-js/deploys)

A declarative DOM framework with CSS selector-based structure and reactive pulsations.

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
pulse create <name>    # Create new project
pulse dev [port]       # Start dev server (default: 3000)
pulse build            # Build for production
pulse compile <file>   # Compile .pulse file
pulse lint [files]     # Validate .pulse files
pulse format [files]   # Format .pulse files
pulse analyze          # Analyze bundle
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
- [Mobile Apps](docs/mobile.md) - Native Android & iOS

## License

MIT
