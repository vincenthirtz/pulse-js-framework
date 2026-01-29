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
- **Mobile Apps** - Build native Android & iOS apps (zero dependencies)

## Installation

```bash
npm install pulse-js-framework
```

## Quick Start

### Create a new project

```bash
npx pulse create my-app
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
  .counter {
    text-align: center
    padding: 20px
  }
}
```

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
    '/users/:id': UserPage
  }
});

router.start();
```

### Store

```javascript
import { createStore } from 'pulse-js-framework/runtime/store.js';

const store = createStore({
  user: null,
  theme: 'light'
}, { persist: true });

store.user.set({ name: 'John' });
```

## CLI Commands

```bash
pulse create <name>    # Create new project
pulse dev [port]       # Start dev server
pulse build            # Build for production
pulse compile <file>   # Compile .pulse file
pulse mobile init      # Initialize mobile platforms
pulse mobile build android|ios  # Build native app
pulse mobile run android|ios    # Run on device/emulator
```

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

## Examples

- [Todo App](examples/todo) - Task management with filters and persistence
- [Chat App](examples/chat) - Real-time messaging interface
- [E-commerce](examples/ecommerce) - Shopping cart with product catalog
- [Weather App](examples/meteo) - Weather dashboard with forecasts
- [Router Demo](examples/router) - SPA routing with guards
- [Store Demo](examples/store) - State management with undo/redo
- [Admin Dashboard](examples/dashboard) - Complete admin UI with all features

## License

MIT
