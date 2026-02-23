# Pulse Example: Context API

Demonstrates Pulse's Context API for dependency injection and sharing state across the component tree without prop drilling. Shows theme context, auth context, locale context, provideMany, and nested provider overrides.

## Features Demonstrated

- `createContext()` with default values and display names (`runtime/context.js`)
- `Provider()` and `useContext()` for providing/consuming values
- Reactive context values with pulses (auto-updates on change)
- `provideMany()` for providing multiple contexts at once
- Nested providers that override parent values
- Theme, auth, and locale patterns
- `useContextSelector()` for derived context values

## Getting Started

```bash
cd examples/context-api
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with 5 context patterns |
| `src/styles.css` | Theme-reactive styles |

## Framework APIs Used

- `createContext(default, options)` - Create a context
- `Provider(Context, value, renderFn)` - Provide values
- `useContext(Context)` - Consume context values
- `provideMany([[Ctx, val], ...], renderFn)` - Provide multiple
- `useContextSelector(fn, ...contexts)` - Derive from multiple contexts
- `pulse()`, `computed()`, `effect()` - Reactive state

## Learn More

- [Context API Guide](https://pulse-js.fr/context)
- [API Reference](https://pulse-js.fr/api-reference)
