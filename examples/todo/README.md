# Pulse Example: Todo App

Classic todo list with task management, filtering, and localStorage persistence.

## Features Demonstrated

- Reactive state management with `.pulse` state blocks
- Component composition (Header, TodoList, TodoItem, Footer)
- localStorage persistence with error handling
- Keyboard shortcuts (Enter to add, Escape to cancel, `n` to focus)
- Dark mode toggle with preference persistence

## Getting Started

```bash
cd examples/todo
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main application layout |
| `src/components/Header.pulse` | Input and controls |
| `src/components/TodoList.pulse` | Filtered todo list |
| `src/components/TodoItem.pulse` | Individual todo with editing |
| `src/components/Footer.pulse` | Filter tabs and stats |

## Framework APIs Used

- `pulse()` - Reactive state (todos, filter, dark mode)
- `effect()` - localStorage sync, DOM updates
- `el()` - CSS selector-based DOM creation
- Component props and event handling
- `@if` / `@each` directives

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
