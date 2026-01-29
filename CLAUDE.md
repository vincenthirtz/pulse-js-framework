# CLAUDE.md - Pulse Framework

## Project Overview

Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications (SPAs). It features:

- **Declarative DOM creation** using CSS selector syntax (`el('.container#main')`)
- **Signal-based reactivity** (pulsations) for automatic UI updates
- **Custom DSL** (.pulse files) that compile to JavaScript
- **Zero dependencies** - completely self-contained

**Version:** 1.0.0 | **License:** MIT | **Node.js:** >= 18.0.0

## Quick Commands

```bash
# Run tests (compiler tests)
npm test

# CLI commands (via pulse binary)
pulse create <name>     # Create new Pulse project
pulse dev [port]        # Start dev server (default: 3000)
pulse build             # Build for production (minified)
pulse preview [port]    # Preview production build (default: 4173)
pulse compile <file>    # Compile .pulse file to .js
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
│   └── transformer.js   # Code generator
├── cli/                 # Command-line interface
│   ├── index.js         # Main CLI, command handlers
│   ├── dev.js           # Dev server
│   └── build.js         # Production build
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
const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/files/*path': FilePage
  },
  mode: 'history'
});

router.navigate('/users/123');
router.params.get();  // { id: '123' }
router.outlet('#app');
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

### .pulse DSL Format

```pulse
@page Counter

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "+"
  }
}

style {
  .counter { padding: 20px }
}
```

## Key Files

| File | Purpose |
|------|---------|
| `runtime/pulse.js` | Core reactivity (Pulse class, effect, computed, batch) |
| `runtime/dom.js` | DOM helpers (el, text, bind, on, model, list, when) |
| `runtime/router.js` | Router (createRouter, navigate, guards) |
| `runtime/store.js` | Store (createStore, createActions, plugins) |
| `compiler/lexer.js` | Tokenizer with 50+ token types |
| `compiler/parser.js` | AST builder for .pulse syntax |
| `compiler/transformer.js` | JavaScript code generator |
| `cli/index.js` | CLI commands implementation |
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
import { pulse, effect, computed } from 'pulse-framework/runtime';
import { el, mount, on } from 'pulse-framework/runtime';
import { createRouter } from 'pulse-framework/runtime/router';
import { createStore } from 'pulse-framework/runtime/store';
import { compile } from 'pulse-framework/compiler';
import pulsePlugin from 'pulse-framework/vite';
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
