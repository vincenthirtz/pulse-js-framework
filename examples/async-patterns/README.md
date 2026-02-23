# Pulse Example: Async Patterns

Interactive demo of Pulse's async primitives: useAsync for basic operations, useResource for SWR caching, usePolling for live data, and createVersionedAsync for race condition handling. Uses a mock API (no server needed).

## Features Demonstrated

- `useAsync()` with loading, error, data, execute, reset, abort (`runtime/async.js`)
- `useResource()` SWR caching with dynamic keys and stale-while-revalidate
- `usePolling()` for live data with pause-on-hidden and max-errors
- `createVersionedAsync()` for race condition prevention
- Retry with configurable failure rate
- Debounced search with stale response tracking

## Getting Started

```bash
cd examples/async-patterns
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with 5 async pattern demos and mock API |
| `src/styles.css` | Dashboard-style layout |

## Framework APIs Used

- `useAsync(fn, options)` - Wrap async with reactive state
- `useResource(key, fn, options)` - SWR-cached resource
- `usePolling(fn, options)` - Interval polling with controls
- `createVersionedAsync()` - Race condition prevention
- `pulse()`, `computed()`, `when()`, `list()` - Reactive rendering

## Learn More

- [Async Guide](https://pulse-js.fr/api-reference)
- [HTTP Client](https://pulse-js.fr/http)
