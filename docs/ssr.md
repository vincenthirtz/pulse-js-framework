# Server-Side Rendering (SSR)

Pulse provides built-in support for server-side rendering with hydration, enabling faster initial page loads, better SEO, and improved user experience.

## Overview

SSR in Pulse works by:
1. Rendering components to HTML on the server
2. Sending the HTML to the client
3. Hydrating the HTML on the client (attaching event listeners without re-rendering)

## Installation

SSR is included in the main package:

```bash
npm install pulse-js-framework
```

## Quick Start

### Server (Node.js)

```javascript
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

const app = express();

app.get('*', async (req, res) => {
  // Render component to HTML
  const { html, state } = await renderToString(() => App(), {
    waitForAsync: true,   // Wait for data fetching
    timeout: 5000         // Timeout for async operations
  });

  // Send complete HTML page
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My Pulse App</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <div id="app">${html}</div>
        <script>window.__PULSE_STATE__ = ${serializeState(state)};</script>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000);
```

### Client

```javascript
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

// Hydrate server-rendered HTML
hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__  // Restore server state
});
```

## API Reference

### `renderToString(componentFactory, options?)`

Renders a component tree to an HTML string.

```javascript
const { html, state } = await renderToString(() => App(), {
  waitForAsync: true,     // Wait for useAsync operations (default: true)
  timeout: 5000,          // Async timeout in ms (default: 5000)
  serializeState: true    // Include state in result (default: true)
});
```

**Returns:**
- `html` - The rendered HTML string
- `state` - Serialized state from async operations

### `renderToStringSync(componentFactory)`

Renders synchronously without waiting for async operations.

```javascript
const html = renderToStringSync(() => StaticPage());
```

### `hydrate(target, componentFactory, options?)`

Attaches event listeners and reactivity to server-rendered HTML.

```javascript
const dispose = hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__,   // Server state to restore
  onMismatch: (expected, actual) => {
    console.warn('Hydration mismatch:', expected, actual);
  }
});

// Later, to clean up:
dispose();
```

### `serializeState(state)`

Safely serializes state for embedding in HTML.

```javascript
const json = serializeState({
  user: { name: 'John', createdAt: new Date() },
  settings: { theme: 'dark' }
});
// Handles Date, undefined, escapes </script> for XSS prevention
```

### `deserializeState(json)`

Restores serialized state.

```javascript
const state = deserializeState(window.__PULSE_STATE__);
// Restores Date objects and other special types
```

### `isSSR()`

Check if currently running in SSR mode.

```javascript
import { isSSR } from 'pulse-js-framework/runtime/ssr';

effect(() => {
  if (isSSR()) return;  // Skip browser-only code

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});
```

### `isHydratingMode()`

Check if currently hydrating.

```javascript
import { isHydratingMode } from 'pulse-js-framework/runtime/ssr';

if (isHydratingMode()) {
  // Special hydration logic
}
```

## Async Data Fetching

`useAsync` automatically integrates with SSR:

```javascript
function UserProfile({ userId }) {
  const { data, loading, error } = useAsync(
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { immediate: true }
  );

  if (loading.get()) return el('.spinner', 'Loading...');
  if (error.get()) return el('.error', error.get().message);

  return el('.profile', [
    el('h1', data.get().name),
    el('p', data.get().email)
  ]);
}
```

**How it works:**

1. **First render pass**: Registers async operations
2. **Wait phase**: All async operations resolve (or timeout)
3. **Second render pass**: Uses cached data from first pass
4. **Client hydration**: Data is already available from state transfer

## SSR-Safe Code Patterns

### Browser API Access

```javascript
// Bad - will crash on server
effect(() => {
  window.scrollTo(0, 0);
});

// Good - check for SSR
effect(() => {
  if (isSSR()) return;
  window.scrollTo(0, 0);
});

// Better - use onMount (only runs on client)
onMount(() => {
  window.scrollTo(0, 0);
});
```

### localStorage/sessionStorage

```javascript
function usePersistedState(key, initial) {
  const state = pulse(initial);

  // Only access storage on client
  if (!isSSR()) {
    const saved = localStorage.getItem(key);
    if (saved) state.set(JSON.parse(saved));

    effect(() => {
      localStorage.setItem(key, JSON.stringify(state.get()));
    });
  }

  return state;
}
```

### Third-Party Libraries

```javascript
function Chart({ data }) {
  let chartInstance = null;

  onMount(() => {
    // Chart library only runs on client
    import('chart.js').then(({ Chart }) => {
      chartInstance = new Chart(canvas, { data });
    });
  });

  onUnmount(() => {
    chartInstance?.destroy();
  });

  return el('canvas#chart');
}
```

## Framework Integration

### Express

```javascript
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';

const app = express();
app.use(express.static('dist'));

app.get('*', async (req, res) => {
  const { html, state } = await renderToString(() => App({ url: req.url }));
  res.send(template(html, state));
});
```

### Fastify

```javascript
import Fastify from 'fastify';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';

const fastify = Fastify();

fastify.get('*', async (request, reply) => {
  const { html, state } = await renderToString(() => App({ url: request.url }));
  reply.type('text/html').send(template(html, state));
});
```

### Hono (Edge/Cloudflare Workers)

```javascript
import { Hono } from 'hono';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';

const app = new Hono();

app.get('*', async (c) => {
  const { html, state } = await renderToString(() => App({ url: c.req.url }));
  return c.html(template(html, state));
});

export default app;
```

## Error Handling

### Async Timeout

```javascript
const { html, state } = await renderToString(() => App(), {
  waitForAsync: true,
  timeout: 3000  // 3 second timeout
});
// If async operations take longer, renders with loading state
```

### Render Errors

```javascript
try {
  const { html } = await renderToString(() => App());
  res.send(html);
} catch (error) {
  console.error('SSR Error:', error);
  // Fallback to client-side rendering
  res.send(`
    <div id="app"></div>
    <script type="module" src="/client.js"></script>
  `);
}
```

### Hydration Mismatch

```javascript
hydrate('#app', () => App(), {
  onMismatch: (expected, actual) => {
    console.warn('Hydration mismatch:', { expected, actual });
    // Could trigger full re-render in development
  }
});
```

## Performance Tips

### 1. Stream Large Pages

For very large pages, consider streaming:

```javascript
// Future: Streaming support
import { renderToStream } from 'pulse-js-framework/runtime/ssr';

app.get('*', async (req, res) => {
  const stream = await renderToStream(() => App());
  stream.pipe(res);
});
```

### 2. Cache Rendered HTML

```javascript
const cache = new Map();

app.get('/static/:page', async (req, res) => {
  const key = req.params.page;

  if (cache.has(key)) {
    return res.send(cache.get(key));
  }

  const { html } = await renderToString(() => StaticPage({ page: key }));
  cache.set(key, html);
  res.send(html);
});
```

### 3. Partial Hydration (Islands)

Only hydrate interactive parts:

```javascript
// Static header (no hydration needed)
const Header = () => el('header', [
  el('h1', 'My Site'),
  el('nav', links.map(l => el('a', { href: l.url }, l.text)))
]);

// Interactive component (needs hydration)
const SearchWidget = () => {
  const query = pulse('');
  return el('.search', [
    el('input', {
      value: () => query.get(),
      oninput: (e) => query.set(e.target.value)
    })
  ]);
};

// Only hydrate the search widget
hydrate('#search-widget', () => SearchWidget());
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Server                               │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Component   │ -> │ MockDOM      │ -> │ HTML String   │  │
│  │ Factory     │    │ Adapter      │    │ + State       │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ↓                                       ↓           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Async Data Collection                   │   │
│  │  useAsync() -> SSRAsyncContext -> waitAll()         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         HTTP Response
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │ Existing DOM  │ <- │ hydrate()    │ <- │ State       │  │
│  │ + Listeners   │    │              │    │ Restore     │  │
│  └───────────────┘    └──────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Module Reference

| Module | Description |
|--------|-------------|
| `runtime/ssr.js` | Main entry point (renderToString, hydrate) |
| `runtime/ssr-serializer.js` | HTML serialization for MockNode trees |
| `runtime/ssr-hydrator.js` | Client-side hydration utilities |
| `runtime/ssr-async.js` | Async data collection during SSR |

## See Also

- [API Reference](api.md)
- [Async Primitives](api.md#async)
- [Router](api.md#router) - SSR-compatible routing
- [Store](api.md#store) - State management with SSR
