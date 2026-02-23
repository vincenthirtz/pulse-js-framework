# Pulse Example: Server-Side Rendering

Interactive demo showing Pulse's SSR capabilities including renderToString, hydration, state serialization, and SSR-safe patterns. Runs in the browser but simulates the full SSR workflow.

## Features Demonstrated

- `renderToStringSync()` for generating HTML on the server (`runtime/ssr.js`)
- `serializeState()` / `deserializeState()` for state transfer
- `isSSR()` environment detection for SSR-safe code
- `ClientOnly()` / `ServerOnly()` conditional rendering
- `hydrate()` for attaching interactivity to server HTML
- Express server setup patterns
- Framework adapters (Express, Hono, Fastify)

## Getting Started

```bash
cd examples/ssr
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | SSR workflow demo with live rendering and code examples |
| `src/styles.css` | Clean documentation-style layout |

## Framework APIs Used

- `renderToStringSync()` - Synchronous server rendering
- `serializeState()` / `deserializeState()` - Safe state transfer
- `isSSR()` - Environment detection
- `ClientOnly()` / `ServerOnly()` - Conditional rendering
- `pulse()`, `computed()`, `when()` - Reactive state and rendering

## Learn More

- [SSR Guide](https://pulse-js.fr/ssr)
- [API Reference](https://pulse-js.fr/api-reference)
