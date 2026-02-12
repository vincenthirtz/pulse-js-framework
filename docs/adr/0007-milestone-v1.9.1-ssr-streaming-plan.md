# ADR-0007: Milestone v1.9.1 SSR & Streaming — Implementation Plan

## Status

Accepted

## Date

2026-02-12

## Context

Milestone 7 "SSR & Streaming (v1.9.1)" has 6 open GitHub issues (#38, #39, #42, #44, #46, #48).
The goal is to bring Pulse's SSR capabilities to production-grade with streaming,
selective rendering, static site generation, and server framework adapters.

### Current State Assessment

| Feature | File | Completeness | Key Gap |
|---------|------|-------------|---------|
| Streaming SSR | `ssr.js` | 0% | Only `renderToString` exists (buffered); no streaming |
| `@client`/`@server` directives | `compiler/` | 0% | No selective SSR directives in parser/transformer |
| Preload hint generation | N/A | 0% | No hint generation; `lazy()` in router has no build manifest integration |
| Hydration mismatch detection | `ssr-hydrator.js` | 20% | `warnMismatch()` exists but is primitive; no DOM diff or suggestions |
| Static site generation | `cli/build.js` | 0% | Build produces JS bundles only; no route pre-rendering |
| Server framework adapters | N/A | 0% | No middleware adapters for Express/Hono/Fastify |

### Existing SSR Architecture

The current SSR stack uses a two-pass rendering model:

```
ssr.js (orchestrator)
├── ssr-async.js (SSRAsyncContext - tracks async operations)
├── ssr-serializer.js (MockNode tree → HTML string)
├── ssr-hydrator.js (client-side: attach listeners to existing DOM)
└── dom-adapter.js (MockDOMAdapter for virtual DOM in Node.js)
```

**Key insight**: `renderToString()` already creates an isolated reactive context,
MockDOMAdapter, and two-pass rendering. Streaming will extend this by serializing
MockNodes incrementally instead of buffering the full tree.

### Backward Compatibility Required

All existing APIs must remain unchanged:
```
renderToString(factory, options) → { html, state }
renderToStringSync(factory) → html
hydrate(target, factory, options) → cleanup
serializeState/deserializeState/restoreState/getSSRState/clearSSRState
isSSR()/isHydratingMode()
```

## Decision

### Implementation Order (Dependencies)

```
Task 1: Streaming SSR (#38)
    │   (foundation - other features build on this)
    │
Task 2: @client/@server directives (#39)
    │   (depends on: SSR mode detection from Task 1)
    │
Task 3: Hydration mismatch detection (#44)
    │   (depends on: Task 1 streaming markers, Task 2 @client placeholders)
    │
Task 4: Preload hint generation (#42)
    │   (independent - build manifest + runtime integration)
    │
Task 5: Static site generation (#46)
    │   (depends on: Task 1 for renderToString, Task 4 for preload hints)
    │
Task 6: Server framework adapters (#48)
    │   (depends on: Task 1 streaming, Task 5 SSG, Task 4 preload hints)
```

### Architecture Decision: Streaming Strategy

**Chosen: Web Streams API with Node.js compatibility wrapper**

Rationale:
- Web Streams (`ReadableStream`) are the standard for modern runtimes (Deno, Bun, Cloudflare Workers)
- Node.js 18+ supports `ReadableStream` natively via `node:stream/web`
- For Node.js `pipe()`, we provide a `.pipeTo()` helper and `toNodeStream()` converter
- Zero dependencies maintained — uses only built-in APIs

**Alternative considered: Node.js Streams only**
Rejected because Web Streams are the cross-runtime standard and all target
Node.js versions (18+) support them.

**Alternative considered: Callback-based chunking**
Rejected because ReadableStream provides better backpressure handling and
composability with existing server frameworks.

### Architecture Decision: Shell + Suspense Model

**Chosen: Shell-first streaming with boundary markers**

```html
<!-- Shell (sent immediately) -->
<!DOCTYPE html>
<html><head>...</head><body>
<div id="app">
  <header>...</header>
  <main>
    <!--$B:0--> <!-- Boundary marker for async content -->
    <div class="loading">Loading...</div>
    <!--/$B:0-->
  </main>
</div>
<!-- Streamed later when async resolves -->
<script>
  $P(0, '<div class="content">Resolved data here</div>');
</script>
</body></html>
```

Rationale:
- Browser renders shell HTML immediately (fast TTFB)
- Async content arrives as `<script>` tags that replace boundary markers
- No client-side JavaScript needed for initial content swap (progressive enhancement)
- Compatible with all browsers (no ReadableStream needed on client)

### Task Details

---

#### Task 1: Streaming SSR with `renderToStream()`
**Issue:** #38 | **Files:** `runtime/ssr.js`, `runtime/ssr-stream.js` (new)

**Problem:** `renderToString()` buffers the entire HTML before sending, causing high
TTFB for pages with async data. Production SSR needs streaming.

**Solution:** Add `renderToStream()` that returns a `ReadableStream`, sending the HTML
shell immediately and streaming async content as it resolves.

**New File: `runtime/ssr-stream.js`**

Core streaming infrastructure:
- `SSRStreamContext` class — manages boundary IDs, pending chunks, flush queue
- `createBoundaryMarker(id)` — generates `<!--$B:id-->` comment pairs
- `createReplacementScript(id, html)` — generates `<script>$P(id, html)</script>`
- `serializeNodeToChunks(node, ctx)` — yields HTML chunks from MockNode tree
- `STREAMING_RUNTIME_SCRIPT` — minimal client-side `$P()` function (~200 bytes)

**API Additions to `runtime/ssr.js`:**

```javascript
import { renderToStream, renderToReadableStream } from 'pulse-js-framework/runtime/ssr';

// Web Streams API (cross-runtime)
const stream = renderToStream(() => App(), {
  // Shell template wrapping the rendered content
  shellStart: '<!DOCTYPE html><html><head></head><body><div id="app">',
  shellEnd: '</div></body></html>',
  // Async behavior
  waitForAsync: false,      // false = stream immediately (default for streaming)
  timeout: 10000,           // Timeout for async boundaries
  // Error handling
  onShellError: (err) => {},    // Error during shell render
  onBoundaryError: (id, err) => {}, // Error in async boundary
  // Progressive loading
  bootstrapScripts: ['/app.js'],     // Scripts to include in <head>
  bootstrapModules: ['/app.mjs'],    // Module scripts to include
  // Preload hints (integrates with Task 4)
  generatePreloadHints: true,
});

// stream is a ReadableStream
// Use with Web Streams:
const response = new Response(stream, {
  headers: { 'Content-Type': 'text/html; charset=utf-8' }
});

// Use with Node.js pipe:
import { Readable } from 'stream';
Readable.fromWeb(stream).pipe(res);

// Convenience: renderToReadableStream (alias with Node.js helpers)
const { stream, abort } = renderToReadableStream(() => App(), options);
```

**Streaming Lifecycle:**

```
1. Enable SSR mode, create isolated context
2. Create MockDOMAdapter + SSRStreamContext
3. Render component tree synchronously
4. For each async boundary (useAsync/useResource):
   a. Insert fallback content + boundary markers
   b. Register promise in SSRStreamContext
5. Serialize shell HTML → enqueue to stream
6. As each promise resolves:
   a. Re-render boundary content
   b. Serialize to HTML chunk
   c. Wrap in <script>$P(id, html)</script>
   d. Enqueue to stream
7. All resolved or timeout → close stream
```

**Integration Points:**
- `useAsync()` / `useResource()` — detect SSR mode, create boundaries
- `ssr-serializer.js` — reuse `serializeToHTML()` for chunks
- `ssr-async.js` — extend `SSRAsyncContext` to support boundary tracking

**Changes to Existing Files:**
- `runtime/ssr.js` — add `renderToStream`, `renderToReadableStream` exports
- `runtime/ssr-async.js` — add boundary ID tracking to `SSRAsyncContext`
- `runtime/index.js` — export new streaming functions
- `package.json` — add export for `./runtime/ssr`

---

#### Task 2: `@client` and `@server` Directives
**Issue:** #39 | **Files:** `compiler/parser.js`, `compiler/transformer/view.js`

**Problem:** No way to control which components render during SSR vs client-side.
Server-only code (e.g., data fetching UI) and client-only code (e.g., browser
APIs, animations) need selective rendering.

**Solution:** Add `@client` and `@server` directives to the .pulse compiler and
a `ClientOnly` runtime wrapper component.

**New NodeTypes in `compiler/parser.js`:**
```javascript
// Add to NodeType:
ClientDirective: 'ClientDirective',
ServerDirective: 'ServerDirective'
```

**Parser Changes:**
- Recognize `@client` and `@server` tokens in directive parsing
- `@client` wraps element — skip during SSR, render on client
- `@server` wraps element — render during SSR only, skip on client

**Transformer Compilation:**

```pulse
view {
  .app {
    // Client-only: interactive widget
    .chart @client {
      canvas "Loading chart..."
    }

    // Server-only: SSR placeholder
    .seo-data @server {
      script[type=application/ld+json] "{seoJson}"
    }
  }
}
```

Compiles to:

```javascript
import { isSSR, ClientOnly, ServerOnly } from 'pulse-js-framework/runtime';

// @client → wraps in ClientOnly()
ClientOnly(
  () => el('.chart', el('canvas', 'Loading chart...')),
  () => el('.chart-placeholder', 'Loading chart...')  // SSR fallback
)

// @server → wraps in ServerOnly()
ServerOnly(
  () => el('.seo-data', el('script[type=application/ld+json]', seoJson))
)
```

**Runtime Components (in `runtime/ssr.js`):**

```javascript
// ClientOnly - renders only on client, shows fallback during SSR
export function ClientOnly(clientFactory, fallbackFactory) {
  if (isSSR()) {
    return fallbackFactory ? fallbackFactory() : createComment('client-only');
  }
  return clientFactory();
}

// ServerOnly - renders only during SSR, removed on client
export function ServerOnly(serverFactory) {
  if (isSSR()) {
    return serverFactory();
  }
  return createComment('server-only');
}
```

**API:**
```javascript
import { ClientOnly, ServerOnly } from 'pulse-js-framework/runtime/ssr';

// Programmatic usage (without compiler)
const chart = ClientOnly(
  () => el('canvas.chart', { onmount: initChart }),
  () => el('.placeholder', 'Chart loading...')
);

const seoData = ServerOnly(
  () => el('script[type=application/ld+json]', JSON.stringify(schema))
);
```

**Changes:**
- `compiler/parser.js` — add `ClientDirective`, `ServerDirective` NodeTypes; parse `@client`, `@server`
- `compiler/transformer/view.js` — add `transformClientDirective`, `transformServerDirective` handlers
- `runtime/ssr.js` — add `ClientOnly`, `ServerOnly` functions
- `runtime/index.js` — export `ClientOnly`, `ServerOnly`

---

#### Task 3: Hydration Mismatch Detection
**Issue:** #44 | **Files:** `runtime/ssr-hydrator.js`, `runtime/ssr-mismatch.js` (new)

**Problem:** When server HTML differs from client render, hydration silently produces
wrong UI. Current `warnMismatch()` is minimal — no diff, no suggestions.

**Solution:** Add comprehensive dev-mode mismatch detection with DOM diffing,
actionable suggestions, and suppression in production.

**New File: `runtime/ssr-mismatch.js`**

```javascript
// Mismatch types
export const MismatchType = {
  TAG: 'tag',            // Different element tag
  TEXT: 'text',          // Different text content
  ATTRIBUTE: 'attribute', // Missing/different attribute
  CHILDREN: 'children',  // Different child count
  EXTRA_NODE: 'extra',   // Extra node in client render
  MISSING_NODE: 'missing' // Node missing in client render
};

// Core diff function
export function diffNodes(serverNode, clientNode) → MismatchReport[]
// Each report: { type, path, expected, actual, suggestion }

// Pretty console output
export function logMismatches(reports) → void

// Suggestion generator
export function getSuggestion(mismatch) → string
```

**Integration with `ssr-hydrator.js`:**

```javascript
// Enhanced matchesElement() with detailed reporting
function matchesElement(serverNode, clientNode, ctx) {
  if (process.env.NODE_ENV !== 'production') {
    const mismatches = diffNodes(serverNode, clientNode);
    if (mismatches.length > 0) {
      logMismatches(mismatches);
      ctx.onMismatch?.(mismatches);
    }
  }
}
```

**Suggestion Examples:**

| Mismatch | Suggestion |
|----------|------------|
| Tag differs: `<div>` vs `<span>` | "Server rendered `<div>` but client expects `<span>`. Ensure consistent component output." |
| Text differs | "Text content differs. If using Date.now() or Math.random(), wrap in `ClientOnly()` or use a stable seed." |
| Attribute missing | "Attribute `class` is `'active'` on server but `''` on client. Check if state depends on browser APIs." |
| Extra children | "Client rendered 2 extra children. This may indicate a `@client` component that should use `ClientOnly()`." |

**Dev-only Guard:**
```javascript
// Zero overhead in production
if (process.env.NODE_ENV !== 'production') {
  // All mismatch detection code
}
```

**Changes:**
- `runtime/ssr-mismatch.js` (new) — diff algorithm, suggestion engine, console output
- `runtime/ssr-hydrator.js` — enhance `matchesElement()`, integrate mismatch detection
- `runtime/ssr.js` — pass mismatch handler through hydrate options

---

#### Task 4: Preload Hint Generation
**Issue:** #42 | **Files:** `runtime/ssr-preload.js` (new), `cli/build.js`

**Problem:** Lazy-loaded routes cause waterfall loading. No `<link rel="preload">`
or `<link rel="modulepreload">` hints generated.

**Solution:** Generate preload hints from build manifest and lazy route definitions.

**New File: `runtime/ssr-preload.js`**

```javascript
// Generate <link> tags for preloading
export function generatePreloadHints(manifest, currentRoute) → string

// Parse build manifest (from build output)
export function parseBuildManifest(manifestPath) → BuildManifest

// Integrate with router lazy() definitions
export function getRoutePreloads(router, path) → PreloadHint[]
```

**Build Manifest Format (generated by `cli/build.js`):**

```json
{
  "routes": {
    "/": { "entry": "/assets/home.js", "css": ["/assets/home.css"] },
    "/dashboard": { "entry": "/assets/dashboard.js", "css": ["/assets/dashboard.css"], "lazy": true },
    "/settings": { "entry": "/assets/settings.js", "lazy": true }
  },
  "chunks": {
    "shared": "/assets/shared-abc123.js"
  }
}
```

**Generated Preload Tags:**

```html
<!-- For current route -->
<link rel="modulepreload" href="/assets/home.js">
<link rel="preload" href="/assets/home.css" as="style">

<!-- For likely next routes (adjacent links) -->
<link rel="prefetch" href="/assets/dashboard.js">
```

**API:**

```javascript
import { generatePreloadHints, createPreloadMiddleware } from 'pulse-js-framework/runtime/ssr';

// In SSR handler:
const hints = generatePreloadHints(manifest, '/dashboard');
// Returns: '<link rel="modulepreload" href="/assets/dashboard.js">\n...'

// Inject into <head>
const html = `<head>${hints}</head>`;

// As middleware (for server adapters, Task 6):
const preloadMiddleware = createPreloadMiddleware(manifest);
```

**Changes to `cli/build.js`:**
- Generate `dist/.pulse-manifest.json` during build
- Track entry points, CSS files, and lazy-loaded chunks per route
- Record chunk hashes for cache-busting

**Changes:**
- `runtime/ssr-preload.js` (new) — preload hint generation, manifest parsing
- `cli/build.js` — generate build manifest during production build
- `runtime/ssr.js` — integrate hints into `renderToStream()` shell

---

#### Task 5: Static Site Generation (SSG)
**Issue:** #46 | **Files:** `cli/ssg.js` (new), `cli/build.js`, `cli/index.js`

**Problem:** No way to pre-render routes to static HTML at build time. SSG enables
deployment to static hosts (Netlify, Vercel, GitHub Pages) without a Node.js server.

**Solution:** Add `pulse build --ssg` command that pre-renders all (or selected)
routes to static HTML files.

**New File: `cli/ssg.js`**

```javascript
// Static Site Generator
export async function generateStaticSite(options) → SSGResult

// Options:
// - routes: string[] | 'auto' — routes to pre-render (auto = discover from router)
// - outDir: string — output directory (default: 'dist')
// - fallback: string — SPA fallback page (default: '404.html')
// - concurrent: number — parallel renders (default: 4)
// - onPage: (route, html) => void — hook for each page
// - ssg: 'full' | 'selective' — full SSG or mixed SSG+SSR
```

**CLI Integration:**

```bash
# Full SSG — pre-render all routes
pulse build --ssg

# SSG with specific routes
pulse build --ssg --routes /,/about,/blog

# Mixed mode — some SSG, others SSR (requires server)
pulse build --ssg --selective
```

**Route Discovery:**

```javascript
// Auto-discover routes from router config
// 1. Import the app's router
// 2. Extract static route paths
// 3. Expand dynamic routes with provided data
// 4. Pre-render each route using renderToString()
```

**SSG Output Structure:**

```
dist/
├── index.html           (/)
├── about/
│   └── index.html       (/about)
├── blog/
│   └── index.html       (/blog)
├── 404.html             (fallback)
├── assets/
│   ├── app.js
│   └── style.css
└── .pulse-manifest.json
```

**Route Configuration in .pulse:**

```pulse
@page Blog

// SSG metadata
ssg {
  // Pre-render with these paths
  paths: ['/blog', '/blog/post-1', '/blog/post-2']
  // Or use dynamic data
  getStaticPaths: async () => {
    const posts = await fetchPosts();
    return posts.map(p => `/blog/${p.slug}`);
  }
  // Revalidate interval (incremental SSG)
  revalidate: 3600 // seconds
}
```

**Changes:**
- `cli/ssg.js` (new) — SSG engine: route discovery, parallel rendering, output
- `cli/build.js` — add `--ssg` flag handling, call SSG after normal build
- `cli/index.js` — register `--ssg` flag for build command

---

#### Task 6: Server Framework Adapters
**Issue:** #48 | **Files:** `server/` (new directory)

**Problem:** No turnkey way to integrate Pulse SSR with popular Node.js frameworks.
Every user must manually wire up SSR, routing, and asset serving.

**Solution:** Provide `createPulseMiddleware()` adapters for Express, Hono, and Fastify
that handle SSR, static assets, and preload hints out of the box.

**New Directory: `server/`**

```
server/
├── index.js              # Common middleware factory
├── express.js            # Express adapter
├── hono.js               # Hono adapter
├── fastify.js            # Fastify adapter (plugin)
└── utils.js              # Shared utilities (manifest loading, HTML template)
```

**Common API (all adapters share the same interface):**

```javascript
import { createPulseMiddleware } from 'pulse-js-framework/server/express';

const middleware = createPulseMiddleware({
  // Required
  app: () => import('./src/App.js'),       // App factory (lazy import)

  // Optional
  mode: 'streaming',                       // 'streaming' | 'string' | 'ssg'
  manifest: './dist/.pulse-manifest.json', // Build manifest for preloads
  staticDir: './dist',                     // Static asset directory
  template: (html, state, head) => `       // HTML template
    <!DOCTYPE html>
    <html><head>${head}</head>
    <body><div id="app">${html}</div>
    <script>window.__PULSE_STATE__ = ${state};</script>
    <script type="module" src="/app.js"></script>
    </body></html>
  `,
  // Hooks
  onRequest: (req) => {},                  // Before SSR
  onError: (err, req) => {},               // SSR error handler
});

// Express
app.use(middleware);

// Hono
app.use('*', middleware);

// Fastify
app.register(middleware);
```

**Adapter Responsibilities:**

| Feature | Implementation |
|---------|---------------|
| Static assets | Serve from `staticDir` with correct MIME types and caching |
| SSR | Call `renderToStream()` or `renderToString()` based on mode |
| Preload hints | Load manifest, call `generatePreloadHints()` per request |
| State serialization | Call `serializeState()` and inject into template |
| Error handling | Catch SSR errors, return 500 or fallback HTML |
| SPA fallback | For unknown routes, serve index.html (CSR mode) |

**Package.json Export Map Additions:**

```json
{
  "./server": "./server/index.js",
  "./server/express": "./server/express.js",
  "./server/hono": "./server/hono.js",
  "./server/fastify": "./server/fastify.js"
}
```

**Changes:**
- `server/` (new directory) — all adapter files
- `package.json` — add server export entries
- `runtime/ssr.js` — ensure streaming API is clean for adapter consumption

---

### File Summary

| File | Change Type | Task |
|------|-------------|------|
| `runtime/ssr.js` | Modified | #38, #39, #44 |
| `runtime/ssr-stream.js` | **New** | #38 |
| `runtime/ssr-async.js` | Modified | #38 |
| `runtime/ssr-serializer.js` | Modified | #38 (chunk serialization) |
| `runtime/ssr-mismatch.js` | **New** | #44 |
| `runtime/ssr-hydrator.js` | Modified | #44 |
| `runtime/ssr-preload.js` | **New** | #42 |
| `runtime/index.js` | Modified | #38, #39 |
| `compiler/parser.js` | Modified | #39 |
| `compiler/transformer/view.js` | Modified | #39 |
| `cli/build.js` | Modified | #42, #46 |
| `cli/ssg.js` | **New** | #46 |
| `cli/index.js` | Modified | #46 |
| `server/index.js` | **New** | #48 |
| `server/express.js` | **New** | #48 |
| `server/hono.js` | **New** | #48 |
| `server/fastify.js` | **New** | #48 |
| `server/utils.js` | **New** | #48 |
| `package.json` | Modified | All (version bump + exports) |
| `CLAUDE.md` | Modified | All (documentation) |

### New Test Files

| Test File | Coverage |
|-----------|----------|
| `test/ssr-stream.test.js` | Streaming SSR, boundary markers, timeout, error handling |
| `test/ssr-directives.test.js` | @client/@server compilation, ClientOnly/ServerOnly runtime |
| `test/ssr-mismatch.test.js` | DOM diff, suggestion generation, production suppression |
| `test/ssr-preload.test.js` | Manifest parsing, hint generation, route matching |
| `test/ssg.test.js` | Route discovery, parallel rendering, output structure |
| `test/server-adapters.test.js` | Express/Hono/Fastify middleware, SSR integration |

## Consequences

### Positive

- Streaming SSR enables sub-100ms TTFB for all pages (#38)
- Selective rendering prevents SSR errors from browser-only code (#39)
- Mismatch detection catches SSR bugs early in development (#44)
- Preload hints eliminate waterfall loading for lazy routes (#42)
- SSG enables static hosting without Node.js server (#46)
- Server adapters provide zero-config SSR for popular frameworks (#48)

### Negative

- Streaming adds complexity to SSR lifecycle (mitigated: clear boundary model)
- `@client`/`@server` adds 2 new directive types to compiler (mitigated: follows existing directive pattern)
- Mismatch detection has dev-mode only overhead (mitigated: stripped in production)
- Build manifest adds a build artifact (mitigated: standard practice, `.pulse-manifest.json`)
- Server adapters reference Express/Hono/Fastify types (mitigated: optional peer deps, zero runtime deps)

### Neutral

- No new external dependencies added to runtime
- Server adapters are Node.js only (expected — SSR is server-side)
- SSG output is standard static HTML (compatible with all hosts)
- Streaming uses Web Streams API (Node.js 18+ required — already our minimum)

## Alternatives Considered

### Alternative 1: React-style Suspense Boundaries
Use explicit `<Suspense>` components instead of automatic boundary detection.
**Not chosen:** Pulse already handles async automatically via `useAsync/useResource`.
Adding explicit Suspense would be a breaking paradigm shift.

### Alternative 2: Worker-based SSR
Run SSR in a Worker thread for isolation.
**Not chosen:** Adds unnecessary complexity for most deployments. Can be added
later as an optional optimization without architecture changes.

### Alternative 3: Incremental Static Regeneration (ISR) in v1.9.1
Full ISR with revalidation and on-demand regeneration.
**Not chosen:** ISR requires a persistent server, which contradicts pure SSG.
Scope reduced to basic `revalidate` metadata for future ISR support.

## Principles Applied

- P1: Zero dependencies — all features use only built-in Node.js/browser APIs
- P2: Signal-based reactivity — streaming integrates with Pulse's effect system
- P3: Opt-in complexity — streaming, SSG, directives all opt-in
- P4: Backward compatibility — existing `renderToString()` and `hydrate()` unchanged
- P5: Cross-runtime — Web Streams API works in Node.js 18+, Deno, Bun, Cloudflare Workers
- P7: Clean public API — `renderToStream()`, `ClientOnly()`, `ServerOnly()` follow naming conventions

## Related

- [ADR-0006](0006-milestone-v1.9.0-form-system-v2-plan.md) — Previous milestone plan (format reference)
- GitHub Milestone: https://github.com/vincenthirtz/pulse-js-framework/milestone/7
- Issues: #38, #39, #42, #44, #46, #48
