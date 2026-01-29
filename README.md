# Pulse Framework

A declarative DOM framework with CSS selector-based structure and reactive pulsations.

## Features

- **CSS Selector Syntax** - Create DOM elements using familiar CSS selectors
- **Reactive Pulsations** - Automatic UI updates when state changes
- **Custom DSL** - Optional `.pulse` file format for cleaner code
- **No Build Required** - Works directly in the browser
- **Lightweight** - Minimal footprint, maximum performance
- **Router & Store** - Built-in SPA routing and state management

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
```

## License

MIT
