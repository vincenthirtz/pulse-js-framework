---
name: frontend-framework
description: Guide for building reactive UI components and applications with the Pulse JS framework. Use this skill when creating components, implementing reactivity patterns, building forms, routing, state management, or working with .pulse files. Also helpful for general frontend patterns like accessibility, performance optimization, and modern JavaScript/CSS features.
---

# Frontend Framework Development with Pulse

## When to Use This Skill

- Creating or modifying `.pulse` component files
- Implementing reactive state with `pulse()`, `effect()`, `computed()`
- Building forms with validation using `useForm()`, `useField()`
- Setting up routing with `createRouter()`
- Managing global state with `createStore()`
- Adding accessibility features (ARIA, focus management, announcements)
- Optimizing performance (batching, memoization, list rendering)
- Working with async data (`useAsync`, `useResource`, HTTP/WebSocket/GraphQL)
- Debugging reactivity issues or UI not updating
- Setting up tests for components

## Bundled Resources

This skill includes:

| Resource | Description |
|----------|-------------|
| **assets/** | Component templates (page, form, modal, list, store) |
| **scripts/** | Code generators and analyzers |
| **references/** | Detailed patterns, CSS, testing, troubleshooting |

### Available Templates

```bash
# Generate from templates (in scripts/)
node scripts/generate-component.js MyComponent
node scripts/generate-component.js LoginForm --type form
node scripts/generate-component.js Dashboard --type page
node scripts/generate-component.js ConfirmModal --type modal
node scripts/generate-component.js UserList --type list
node scripts/generate-component.js cart --type store
```

### Analysis Scripts

```bash
# Bundle size analysis
node scripts/analyze-bundle.js

# Accessibility check
node scripts/check-a11y.js
node scripts/check-a11y.js --fix
```

## Quick Reference

### Core Reactivity

```javascript
import { pulse, effect, computed, batch } from 'pulse-js-framework/runtime';

// Reactive state
const count = pulse(0);
count.get();              // Read (tracks dependency)
count.set(5);             // Direct set
count.update(n => n + 1); // Functional update

// Derived state
const doubled = computed(() => count.get() * 2);

// Side effects (auto-runs when dependencies change)
effect(() => console.log(count.get()));

// Batch updates (single effect run)
batch(() => {
  count.set(1);
  name.set('Alice');
});
```

### DOM Creation

```javascript
import { el, mount, list, when } from 'pulse-js-framework/runtime';

// CSS selector syntax
el('div.container#main');           // <div class="container" id="main">
el('input[type=text][placeholder=Name]');

// Reactive children and attributes
el('button', {
  class: () => isActive.get() ? 'active' : '',
  disabled: () => isLoading.get(),
  onclick: handleClick
}, 'Click me');

// Conditional rendering
when(
  () => loading.get(),
  () => el('.spinner', 'Loading...'),
  () => el('.content', data.get())
);

// List rendering (always provide key function!)
list(
  () => items.get(),
  (item) => el('li', item.name),
  (item) => item.id  // Key for efficient diffing
);

mount('#app', App());
```

### .pulse File Structure

```pulse
@page ComponentName

import Button from './Button.pulse'

state {
  count: 0
  name: ''
}

view {
  .container {
    h1 "Count: {count}"
    input[type=text][value={name}] @input(name = event.target.value)
    Button @click(count++) { "Increment" }
  }
}

style {
  .container { padding: 20px }
}
```

## Common Patterns

### Form with Validation

```javascript
import { useForm, validators } from 'pulse-js-framework/runtime/form';

const { fields, handleSubmit, isValid } = useForm(
  { email: '', password: '' },
  {
    email: [validators.required(), validators.email()],
    password: [validators.required(), validators.minLength(8)]
  },
  { onSubmit: (values) => login(values) }
);
```

### Router Setup

```javascript
import { createRouter, lazy } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/admin': lazy(() => import('./Admin.js'))
  },
  mode: 'history'
});

router.outlet('#app');
```

### Global Store

```javascript
import { createStore, createActions } from 'pulse-js-framework/runtime/store';

const store = createStore({ user: null, theme: 'light' });
const actions = createActions(store, {
  login: (store, user) => store.user.set(user),
  toggleTheme: (store) => store.theme.update(t => t === 'light' ? 'dark' : 'light')
});
```

### Async Data

```javascript
import { useAsync, useResource } from 'pulse-js-framework/runtime/async';

// One-time fetch
const { data, loading, error } = useAsync(
  () => fetch('/api/users').then(r => r.json())
);

// Cached resource with SWR pattern
const users = useResource(
  'users',
  () => fetch('/api/users').then(r => r.json()),
  { refreshInterval: 30000, refreshOnFocus: true }
);
```

## Accessibility Checklist

1. **Images**: Always include `alt` attribute
2. **Buttons**: Must have text content or `aria-label`
3. **Forms**: Inputs need labels (`aria-label` or `<label>`)
4. **Modals**: Use `trapFocus()` and `announce()` for screen readers
5. **Lists**: Use semantic `<ul>`/`<ol>` with proper roles
6. **Headings**: Maintain sequential order (h1 → h2 → h3)

```javascript
import { trapFocus, announce } from 'pulse-js-framework/runtime/a11y';

// Modal pattern
const modal = el('dialog[aria-labelledby=title]', ...);
const release = trapFocus(modal, { autoFocus: true, returnFocus: true });
announce('Dialog opened');
```

## Performance Tips

1. **Use `computed()` for derived values** instead of recalculating in effects
2. **Always provide key functions** to `list()` for efficient DOM diffing
3. **Use `batch()`** when updating multiple related pulses
4. **Lazy load routes** with `lazy()` for code splitting
5. **Use `peek()`** to read without creating dependency tracking
6. **Custom equality** for object pulses to prevent unnecessary updates

```javascript
// Custom equality to prevent spurious updates
const config = pulse({ theme: 'dark' }, {
  equals: (a, b) => a.theme === b.theme
});
```

## CLI Commands

```bash
pulse create my-app          # New project
pulse dev                    # Dev server
pulse build                  # Production build
pulse new MyComponent        # Create component
pulse lint --fix             # Lint and auto-fix
pulse test --coverage        # Run tests
```

## Key Files Reference

| Module | Purpose |
|--------|---------|
| `runtime/pulse.js` | Core reactivity |
| `runtime/dom.js` | DOM creation, auto-ARIA |
| `runtime/router.js` | SPA routing |
| `runtime/store.js` | Global state |
| `runtime/form.js` | Form validation |
| `runtime/async.js` | Async primitives |
| `runtime/a11y.js` | Accessibility helpers |

See [CLAUDE.md](../../../CLAUDE.md) for complete API documentation.

## Reference Documentation

For detailed guides, see the `references/` folder:

- **[patterns.md](references/patterns.md)** - Advanced patterns (composition, HOCs, error boundaries, optimistic updates, real-time data)
- **[css-patterns.md](references/css-patterns.md)** - CSS variables, dark mode, responsive design, animations, component styles
- **[testing.md](references/testing.md)** - Unit tests, component tests, mocking, integration tests
- **[troubleshooting.md](references/troubleshooting.md)** - Common issues and solutions, debug checklist

## Quick Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| UI not updating | Not using `.get()` in reactive context | Wrap in function: `() => value.get()` |
| Circular dependency | Effect triggers itself | Use `untrack()` or separate pulses |
| List items wrong | Missing key function | Add key: `list(items, render, i => i.id)` |
| Effect runs too often | Reading entire object | Use `computed()` for derived values |
| Memory leak | Missing cleanup | Return cleanup function from `effect()` |
| Route 404 on refresh | Server not configured for SPA | Configure server to serve index.html |

## Component Checklist

When creating a new component:

- [ ] Define props with types in `props {}` block
- [ ] Initialize local state in `state {}` block
- [ ] Use semantic HTML elements
- [ ] Add ARIA attributes for accessibility
- [ ] Include keyboard navigation for interactive elements
- [ ] Scope styles in `style {}` block
- [ ] Add loading/error states for async data
- [ ] Write tests in co-located `.test.js` file
