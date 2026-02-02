# Pulse DSL (.pulse Files)

The Pulse DSL provides a clean, declarative syntax for building components.

## Basic Structure

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

## Blocks

### @page / @component

Define the component type:

```pulse
@page HomePage        // Top-level page component
@component Button     // Reusable component
```

### state { }

Define reactive state variables:

```pulse
state {
  count: 0
  name: "John"
  items: []
  user: null
  config: { theme: "dark", lang: "en" }
}
```

### view { }

Define the component's DOM structure:

```pulse
view {
  .container {
    header {
      h1 "Welcome"
    }
    main {
      p "Content here"
    }
  }
}
```

### style { }

Scoped CSS for the component:

```pulse
style {
  .container {
    max-width: 1200px
    margin: 0 auto
  }

  h1 {
    color: var(--primary)
  }
}
```

Styles are automatically scoped to the component to prevent conflicts.

---

## View Syntax

### Elements

```pulse
view {
  div                     // <div></div>
  .container              // <div class="container"></div>
  #main                   // <div id="main"></div>
  button.btn.primary      // <button class="btn primary"></button>
  input[type=text]        // <input type="text">
}
```

### Text Content

```pulse
view {
  h1 "Hello World"              // Static text
  h1 "Count: {count}"           // Interpolation
  p "Hello, {user.name}!"       // Nested access
}
```

### Nesting

```pulse
view {
  .card {
    .card-header {
      h2 "Title"
    }
    .card-body {
      p "Content"
    }
  }
}
```

---

## Directives

### @click

Handle click events:

```pulse
button @click(count++) "Increment"
button @click(handleSubmit()) "Submit"
button @click(user = null) "Logout"
```

### @if / @else

Conditional rendering:

```pulse
@if(loading) {
  .spinner
}

@if(user) {
  .profile { "Welcome, {user.name}" }
} @else {
  .login { "Please log in" }
}
```

### @each

List rendering:

```pulse
ul {
  @each(items as item) {
    li "{item.name}"
  }
}

// With index
@each(items as item, index) {
  li "#{index}: {item.name}"
}
```

### @model

Two-way binding for inputs:

```pulse
input[type=text] @model(username)
textarea @model(message)
select @model(country) {
  option[value=us] "United States"
  option[value=uk] "United Kingdom"
}
```

### @bind

Bind attributes:

```pulse
button @bind(disabled, loading) "Submit"
div @bind(class, isActive ? "active" : "")
```

### @on

Event handlers:

```pulse
input @on(input, handleInput)
form @on(submit, handleSubmit)
div @on(mouseover, showTooltip)
```

---

## Imports

Import other components:

```pulse
// Default import
import Button from './Button.pulse'

// Named imports
import { Header, Footer } from './components.pulse'

// Namespace import
import * as Icons from './icons.pulse'
```

Using imported components:

```pulse
view {
  Header
  main {
    Button @click(doSomething()) "Click me"
    Icons.Search
  }
  Footer
}
```

---

## Slots

### Default Slot

```pulse
// Button.pulse
@component Button

view {
  button.btn {
    slot
  }
}

// Usage
Button { "Click me" }
Button { Icon "save" }
```

### Named Slots

```pulse
// Card.pulse
@component Card

view {
  .card {
    .card-header {
      slot "header"
    }
    .card-body {
      slot
    }
    .card-footer {
      slot "footer"
    }
  }
}

// Usage
Card {
  @slot(header) { h2 "Title" }
  p "Card content here"
  @slot(footer) { button "Action" }
}
```

### Default Slot Content

```pulse
view {
  .container {
    slot { "Default content if nothing provided" }
  }
}
```

---

## Router Block

Define routing in your app:

```pulse
@page App

router {
  mode: "hash"
  base: "/app"

  routes {
    "/": HomePage
    "/users": UsersPage
    "/users/:id": UserDetailPage
    "/admin/*": AdminPage
  }

  beforeEach(to, from) {
    if (!store.isAuthenticated && to.meta.requiresAuth) {
      return "/login"
    }
  }
}

view {
  nav {
    @link("/") "Home"
    @link("/users") "Users"
  }
  main {
    @outlet
  }
}
```

### Router Directives

```pulse
@link("/path") "Link Text"        // Navigation link
@outlet                           // Route content placeholder
@navigate("/path")                // Programmatic navigation
@back                             // Go back
@forward                          // Go forward
```

---

## Store Block

Define state management:

```pulse
@page App

store {
  state {
    user: null
    theme: "dark"
    notifications: []
  }

  getters {
    isAuthenticated() { return this.user !== null }
    unreadCount() { return this.notifications.filter(n => !n.read).length }
  }

  actions {
    login(userData) { this.user = userData }
    logout() { this.user = null }
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark"
    }
    addNotification(notification) {
      this.notifications = [...this.notifications, notification]
    }
  }

  persist: true
  storageKey: "my-app-state"
}
```

**Important:** In getters and actions:
- `this.x` is transformed to `store.x.get()`
- `this.x = y` is transformed to `store.x.set(y)`

---

## Expressions

### Interpolation

```pulse
h1 "Count: {count}"
p "Hello, {user.name}!"
span "{formatDate(date)}"
```

### Operators

```pulse
@if(count > 0)
@if(user && user.isAdmin)
@if(status === "active" || status === "pending")
button @bind(disabled, loading || !isValid)
```

### Ternary

```pulse
span "{count === 1 ? 'item' : 'items'}"
div @bind(class, isActive ? "active" : "inactive")
```

---

## Comments

```pulse
// Single line comment

/*
 * Multi-line
 * comment
 */

view {
  // This is a comment
  div "Content"
}
```

---

## Complete Example

```pulse
@page TodoApp

import TodoItem from './TodoItem.pulse'
import { Button, Input } from './components.pulse'

state {
  todos: []
  newTodo: ""
  filter: "all"
}

store {
  state {
    user: null
  }
  actions {
    login(user) { this.user = user }
  }
}

view {
  .todo-app {
    header {
      h1 "Todo App"
      @if(store.user) {
        span "Welcome, {store.user.name}"
      }
    }

    .input-section {
      Input @model(newTodo) [placeholder="What needs to be done?"]
      Button @click(addTodo()) "Add"
    }

    .filters {
      Button @click(filter = "all") @bind(class, filter === "all" ? "active" : "") "All"
      Button @click(filter = "active") @bind(class, filter === "active" ? "active" : "") "Active"
      Button @click(filter = "completed") @bind(class, filter === "completed" ? "active" : "") "Completed"
    }

    ul.todo-list {
      @each(filteredTodos as todo) {
        TodoItem [todo=todo] @on(toggle, toggleTodo) @on(delete, deleteTodo)
      }
    }

    footer {
      span "{activeTodos.length} items left"
    }
  }
}

style {
  .todo-app {
    max-width: 500px
    margin: 0 auto
    padding: 20px
  }

  .filters button.active {
    background: var(--primary)
    color: white
  }
}
```

---

## Compiler Features

The Pulse compiler provides:

- **Error Messages** - Detailed errors with line and column numbers
- **Source Maps** - Debug original `.pulse` code in browser DevTools
- **CSS Scoping** - Automatic scoping to prevent style conflicts
- **Tree Shaking** - Unused code is removed in production builds
- **Type Checking** - TypeScript-compatible output
