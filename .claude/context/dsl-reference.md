# DSL Reference - Complete syntax reference for .pulse files.

## Structure

```pulse
@page PageName          // or @component ComponentName
import Button from './Button.pulse'

state { count: 0 }
view { ... }
style { ... }
```

## Blocks

| Block | Purpose |
|-------|---------|
| `@page Name` | Top-level page component |
| `@component Name` | Reusable component |
| `state { }` | Reactive state variables |
| `view { }` | DOM structure |
| `style { }` | Scoped CSS (auto-scoped, supports SASS/LESS/Stylus) |

## View Syntax

### Elements

```pulse
div                          // <div>
.container                   // <div class="container">
#main                        // <div id="main">
button.btn.primary           // <button class="btn primary">
input[type=text]             // <input type="text">
```

### Dynamic Attributes

```pulse
input[type=text][value={username}] @input(username = event.target.value)
div[class={isActive ? "active" : "inactive"}]
button[disabled={loading}] "Submit"
```

### Text Content

```pulse
h1 "Hello World"             // Static
h1 "Count: {count}"          // Interpolation
p "Hello, {user.name}!"      // Nested access
span "{formatDate(date)}"    // Function call
```

## Directives

### Events

```pulse
button @click(count++) "+"
button @click(handleSubmit()) "Submit"
input @input(query = event.target.value)
form @submit(event.preventDefault(); handleSubmit())
button @click(event.stopPropagation(); doSomething())
```

The `event` object is always available in handlers.

### Conditionals

```pulse
@if(loading) { .spinner }
@if(user) { "Welcome, {user.name}" } @else { "Please log in" }
```

### Lists

```pulse
@each(items as item) { li "{item.name}" }
@each(items as item, index) { li "#{index}: {item.name}" }
```

### Data Binding

```pulse
input[type=text] @model(username)     // Two-way binding
button @bind(disabled, loading)       // Attribute binding
div @bind(class, isActive ? "active" : "")
```

### Generic Events

```pulse
input @on(input, handleInput)
form @on(submit, handleSubmit)
```

## Accessibility Directives

| Directive | Purpose | Compiles to |
|-----------|---------|-------------|
| `@a11y(role=dialog, label="...", modal=true)` | Set ARIA attributes | `el('div[role=dialog][aria-label=...][aria-modal=true]')` |
| `@live(polite)` | Live region (waits) | `el('div[aria-live=polite][aria-atomic=true]')` |
| `@live(assertive)` | Live region (interrupts) | `el('div[aria-live=assertive][aria-atomic=true]')` |
| `@focusTrap` | Trap keyboard focus | `trapFocus(el, {})` |
| `@focusTrap(autoFocus=true, returnFocus=true)` | Trap with options | `trapFocus(el, { autoFocus: true, returnFocus: true })` |
| `@srOnly` | Screen reader only | `srOnly(content)` |

```pulse
.modal @a11y(role=dialog, label="Confirm") @focusTrap(returnFocus=true) {
  span @srOnly "Dialog content"
  .status @live(polite) { "Status: {status}" }
}
```

## Imports

```pulse
import Button from './Button.pulse'           // Default
import { Header, Footer } from './layout.pulse' // Named
import * as Icons from './icons.pulse'          // Namespace
```

## Slots

```pulse
// Definition
@component Card
view {
  .card {
    slot "header"           // Named slot
    slot                    // Default slot
    slot { "Fallback" }     // Default with fallback content
  }
}

// Usage
Card {
  @slot(header) { h2 "Title" }
  p "Default slot content"
}
```

## Router Block

```pulse
router {
  mode: "hash"              // "hash" or "history"
  base: "/app"

  routes {
    "/": HomePage
    "/users": UsersPage
    "/users/:id": UserDetailPage
    "/admin/*": AdminPage
  }

  beforeEach(to, from) {
    if (!store.isAuthenticated && to.meta.requiresAuth) { return "/login" }
  }
}
```

### Router Directives

```pulse
@link("/path") "Link Text"    // Navigation link
@outlet                        // Route content placeholder
@navigate("/path")             // Programmatic navigation
@back                          // Go back
@forward                       // Go forward
```

## Store Block

```pulse
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
    toggleTheme() { this.theme = this.theme === "dark" ? "light" : "dark" }
  }
  persist: true
  storageKey: "my-app-state"
}
```

**Note:** In getters/actions: `this.x` → `store.x.get()`, `this.x = y` → `store.x.set(y)`.

## Expressions

```pulse
"Count: {count}"                              // Interpolation
@if(count > 0 && user.isAdmin)                // Operators
"{count === 1 ? 'item' : 'items'}"            // Ternary
```

## Comments

```pulse
// Single line comment
/* Multi-line comment */
```

## Compiler Features

- Error messages with line:column
- Source maps for debugging
- CSS scoping (unique class prefixes)
- Tree shaking (unused code removed)
- TypeScript-compatible output
- CSS preprocessor auto-detection (SASS/LESS/Stylus)
