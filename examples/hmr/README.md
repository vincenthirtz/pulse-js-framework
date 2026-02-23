# Pulse Example: HMR Demo

Hot Module Replacement demo showing state preservation across code edits.

## Features Demonstrated

- `createHMRContext()` for HMR lifecycle management
- `preservePulse()` to survive hot reloads without losing state
- Theme system with dynamic CSS variables
- Multiple preserved states (count, notes, theme, input)
- `hmr.setup()` for effect registration with cleanup
- `hmr.accept()` for module update acceptance

## Getting Started

```bash
cd examples/hmr
npm run dev
```

Open http://localhost:3000, then edit code and watch state persist.

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | HMR context setup and state preservation |
| `src/components/App.pulse` | App component with theme switching |

## Framework APIs Used

- `createHMRContext()` - HMR context (`runtime/hmr.js`)
- `preservePulse()` - State preservation across reloads
- `pulse()` - Reactive state
- `effect()` - Side effects with cleanup
- `el()` - CSS selector DOM creation

## Learn More

- [HMR API](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
