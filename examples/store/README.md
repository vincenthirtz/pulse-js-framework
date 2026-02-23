# Pulse Example: Store Demo

Notes application demonstrating comprehensive store features with persistence, undo/redo, and plugins.

## Features Demonstrated

- `createStore()` with localStorage persistence
- `createActions()` for state mutations
- `createGetters()` for computed/derived values
- `historyPlugin` for undo/redo (Ctrl+Z / Ctrl+Y)
- `loggerPlugin` for debugging state changes
- `createModuleStore()` for namespaced state
- Note pinning, categories, search, and sorting

## Getting Started

```bash
cd examples/store
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Store setup with plugins and UI (~1,211 lines) |
| `src/App.pulse` | App component layout |

## Framework APIs Used

- `createStore()` - Persistent store (`runtime/store.js`)
- `createActions()` - Bound action creators
- `createGetters()` - Computed store values
- `historyPlugin` / `loggerPlugin` - Store plugins
- `createModuleStore()` - Namespaced modules
- `batch()` - Batched state updates

## Learn More

- [Store API](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
