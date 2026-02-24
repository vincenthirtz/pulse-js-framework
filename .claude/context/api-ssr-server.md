# API Reference: SSR & Server Components

> Load this context file when working on server-side rendering, streaming SSR, server components, server actions, or SSR security.

### SSR (runtime/ssr.js)

Server-Side Rendering and hydration for Pulse applications.

```javascript
import {
  renderToString, renderToStringSync, hydrate,
  serializeState, deserializeState, restoreState, getSSRState,
  isSSR, isHydratingMode
} from 'pulse-js-framework/runtime/ssr';

// === Server-Side Rendering ===

// Render component to HTML string (async, waits for data)
const { html, state } = await renderToString(() => App(), {
  waitForAsync: true,   // Wait for useAsync/useResource to resolve
  timeout: 5000,        // Timeout for async operations (ms)
  serializeState: true  // Include state in result
});

// Render synchronously (no async waiting)
const html = renderToStringSync(() => StaticPage());

// === Complete SSR Server Example ===

// server.js (Node.js/Express)
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

const app = express();

app.get('*', async (req, res) => {
  const { html, state } = await renderToString(() => App(), {
    waitForAsync: true
  });

  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>My Pulse App</title></head>
      <body>
        <div id="app">${html}</div>
        <script>window.__PULSE_STATE__ = ${serializeState(state)};</script>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `);
});

// === Client-Side Hydration ===

// client.js
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

// Hydrate server-rendered HTML (attaches event listeners)
const dispose = hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__  // Restore server state
});

// Later, if needed:
dispose();  // Clean up hydration

// === State Serialization ===

// Serialize state (handles Date, undefined, escapes XSS)
const json = serializeState({
  user: { name: 'John', createdAt: new Date() },
  settings: { theme: 'dark' }
});

// Deserialize state (restores Date objects)
const state = deserializeState(json);

// Restore state into global (for component access)
restoreState(window.__PULSE_STATE__);

// Get SSR state in components
const userData = getSSRState('user');

// === SSR Mode Detection ===

// Check if running in SSR mode
if (isSSR()) {
  // Skip browser-only code
}

// Check if currently hydrating
if (isHydratingMode()) {
  // Hydration-specific logic
}

// === SSR-Safe Effects ===

// Effects automatically run once without subscriptions in SSR mode
effect(() => {
  if (isSSR()) return;  // Skip browser APIs on server

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});

// === Async Data with SSR ===

// useAsync automatically integrates with SSR
function UserProfile({ userId }) {
  const { data, loading } = useAsync(
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { immediate: true }
  );

  // During SSR:
  // 1. First render: registers async operation, returns loading state
  // 2. Async operations complete
  // 3. Second render: uses cached data

  return el('div',
    loading.get()
      ? el('.spinner', 'Loading...')
      : el('.user', data.get()?.name)
  );
}
```

**SSR Architecture:**

| Module | Purpose |
|--------|---------|
| `ssr.js` | Main entry point (renderToString, hydrate, ClientOnly, ServerOnly) |
| `ssr-stream.js` | Streaming SSR (renderToStream, renderToReadableStream) |
| `ssr-serializer.js` | HTML serialization for MockNode trees |
| `ssr-hydrator.js` | Client-side hydration utilities |
| `ssr-async.js` | Async data collection during SSR |
| `ssr-mismatch.js` | Hydration mismatch detection (dev-mode) |
| `ssr-preload.js` | Preload hint generation from build manifest |

**How SSR Works:**

1. **Server Render**: `renderToString()` creates isolated context, uses `MockDOMAdapter`
2. **Async Collection**: First render collects `useAsync` operations
3. **Data Fetching**: Waits for all async operations (with timeout)
4. **Re-render**: Second render with resolved data
5. **Serialization**: MockNode tree → HTML string
6. **State Transfer**: Serialize state for client
7. **Hydration**: Client attaches listeners to existing DOM

#### Streaming SSR (runtime/ssr-stream.js)

```javascript
import { renderToStream, renderToReadableStream } from 'pulse-js-framework/runtime/ssr';

// Render to a ReadableStream (Web Streams API)
const stream = renderToStream(() => App(), {
  shellStart: '<!DOCTYPE html><html><head></head><body><div id="app">',
  shellEnd: '</div></body></html>',
  timeout: 10000,
  bootstrapModules: ['/assets/main.js'],
  onShellError: (err) => console.error('Shell failed:', err),
  onBoundaryError: (id, err) => console.error(`Boundary ${id}:`, err)
});

// Use with Web Streams (Hono, Deno, Bun)
return new Response(stream, { headers: { 'Content-Type': 'text/html' } });

// Use with Node.js pipe
import { Readable } from 'stream';
Readable.fromWeb(stream).pipe(res);

// With abort control
const { stream, abort } = renderToReadableStream(() => App(), options);
abort(); // Cancel streaming
```

#### Selective Rendering: ClientOnly / ServerOnly

```javascript
import { ClientOnly, ServerOnly } from 'pulse-js-framework/runtime/ssr';

// Client-only content (skipped during SSR, rendered on client)
const chart = ClientOnly(
  () => el('canvas.chart', { onmount: initChart }),
  () => el('.placeholder', 'Chart loading...')  // SSR fallback
);

// Server-only content (rendered during SSR, skipped on client)
const seoData = ServerOnly(
  () => el('script[type=application/ld+json]', JSON.stringify(schema))
);
```

In .pulse files, use `@client` and `@server` directives:

```pulse
view {
  // Client-only (browser APIs, animations, etc.)
  .chart @client { canvas "Loading chart..." }

  // Server-only (SEO, structured data, etc.)
  .seo @server { script[type=application/ld+json] "{seoJson}" }
}
```

#### Hydration Mismatch Detection (runtime/ssr-mismatch.js)

```javascript
import { diffNodes, logMismatches, getSuggestion, MismatchType } from 'pulse-js-framework/runtime/ssr';

// Compare server and client DOM (dev-mode only)
const reports = diffNodes(serverNode, clientNode);
logMismatches(reports);
// Output:
//   [Pulse Hydration] 2 mismatches detected:
//   1. [TEXT] at div.container > p
//      Server: "Hello John"
//      Client: "Hello Guest"
//      -> Text content differs. If using browser-only values, wrap in ClientOnly().

// Mismatch types: TAG, TEXT, ATTRIBUTE, CHILDREN, EXTRA_NODE, MISSING_NODE
```

#### Preload Hint Generation (runtime/ssr-preload.js)

```javascript
import {
  generatePreloadHints, getRoutePreloads, parseBuildManifest,
  createPreloadMiddleware, hintsToHTML
} from 'pulse-js-framework/runtime/ssr';

// Generate <link> preload tags from a build manifest
const manifest = parseBuildManifest(require('./dist/.pulse-manifest.json'));
const hints = generatePreloadHints(manifest, '/dashboard');
// '<link rel="modulepreload" href="/assets/dashboard.js">\n...'

// Create middleware for automatic preload injection
const getPreloads = createPreloadMiddleware(manifest);
const preloadHtml = getPreloads('/dashboard');
// Inject into <head> of SSR response
```

#### Static Site Generation (CLI)

```bash
# Pre-render all routes to static HTML
pulse build --ssg

# Pre-render specific routes
pulse ssg --routes /,/about,/contact

# With options
pulse ssg --routes /,/about --concurrent 8 --timeout 15000 --no-trailing-slash
```

```javascript
// Programmatic SSG
import { generateStaticSite, generateBuildManifest } from 'pulse-js-framework/cli/ssg';

const result = await generateStaticSite({
  routes: ['/', '/about', '/blog'],
  outDir: 'dist',
  concurrent: 4,
  timeout: 10000,
  onPageGenerated: ({ route, filePath }) => console.log(`Generated: ${route}`)
});
console.log(`${result.successCount}/${result.totalRoutes} pages generated`);
```

#### Server Framework Adapters

```javascript
// Express
import express from 'express';
import { createExpressMiddleware } from 'pulse-js-framework/server/express';

const app = express();
app.use(createExpressMiddleware({
  app: ({ route, query }) => App({ route, query }),
  templatePath: './dist/index.html',
  distDir: './dist',
  streaming: false
}));

// Hono
import { Hono } from 'hono';
import { createHonoMiddleware } from 'pulse-js-framework/server/hono';

const app = new Hono();
app.use('*', createHonoMiddleware({
  app: ({ route }) => App({ route }),
  streaming: true  // Hono supports streaming natively
}));

// Fastify
import Fastify from 'fastify';
import { createFastifyPlugin } from 'pulse-js-framework/server/fastify';

const app = Fastify();
app.register(createFastifyPlugin({
  app: ({ route }) => App({ route }),
  templatePath: './dist/index.html'
}));
```

### Server Components (runtime/server-components/)

React Server Components-style architecture for Pulse. Enables component-level code splitting with 'use client' and 'use server' directives.

```javascript
import {
  // PSC Wire Format
  serializeToPSC, reconstructPSCTree, PSCNodeType,
  // Server Rendering
  renderServerComponent, renderServerComponentToHTML,
  // Client Component Loading
  loadClientComponent, preloadClientComponent, hydrateClientComponents,
  // Server Actions
  registerAction, createActionInvoker, useServerAction, bindFormAction,
  registerServerAction, executeServerAction, createServerActionMiddleware
} from 'pulse-js-framework/runtime/server-components';

// === Component Types ===

// Server Component (runs only on server, zero client bundle)
export function UserList() {
  'use server';

  // Can access database, filesystem, secrets
  const users = await db.users.findAll();

  return el('ul.users', users.map(user =>
    el('li', [
      el('span', user.name),
      // Embed Client Component for interactivity
      UserActions({ userId: user.id })
    ])
  ));
}

// Client Component (runs on client, interactive)
export function UserActions({ userId }) {
  'use client';

  const deleted = pulse(false);

  const handleDelete = async () => {
    await deleteUser(userId);  // Server Action
    deleted.set(true);
  };

  return when(
    () => !deleted.get(),
    () => el('button', { onclick: handleDelete }, 'Delete')
  );
}

// Shared Component (no directive, runs on both server and client)
export function Avatar({ url, name }) {
  return el('img.avatar', {
    src: url,
    alt: name,
    width: 48,
    height: 48
  });
}

// === PSC Wire Format ===

// Server: Serialize component tree to JSON
const payload = serializeToPSC(serverComponentTree, {
  clientManifest: {
    UserActions: { chunk: '/client-UserActions.js', exports: ['default'] }
  }
});

// Client: Reconstruct DOM from PSC payload
const domTree = await reconstructPSCTree(payload);
mount('#app', domTree);

// === Server-Side Rendering with Server Components ===

import express from 'express';
import { renderServerComponent, serializeToPSC } from 'pulse-js-framework/runtime/server-components';

const app = express();

app.get('/dashboard', async (req, res) => {
  // Render Server Component (runs async components, DB queries, etc.)
  const tree = await renderServerComponent(Dashboard, { userId: req.user.id });

  // Serialize to PSC wire format
  const payload = serializeToPSC(tree, { clientManifest });

  res.json(payload);
});

// === Client Component Loading ===

// Preload Client Component chunk (on hover, etc.)
await preloadClientComponent('UserActions');

// Load and instantiate Client Component
const component = await loadClientComponent('UserActions', { userId: 123 });

// Hydrate all Client Components in server-rendered tree
hydrateClientComponents(document.body);

// === Build Tool Integration ===

// Vite (automatically detects 'use client' directives)
import pulsePlugin from 'pulse-js-framework/vite';
import pulseServerComponents from 'pulse-js-framework/vite/server-components';

export default {
  plugins: [
    pulsePlugin(),
    pulseServerComponents({
      manifestPath: 'dist/.pulse-manifest.json'
    })
  ]
};

// Webpack
import { addServerComponentsSupport } from 'pulse-js-framework/webpack/server-components';

module.exports = {
  plugins: [
    addServerComponentsSupport({
      manifestPath: 'dist/.pulse-manifest.json',
      base: '/assets'
    })
  ]
};

// Rollup
import pulseServerComponents from 'pulse-js-framework/rollup/server-components';

export default {
  plugins: [
    pulseServerComponents({
      manifestPath: 'dist/.pulse-manifest.json'
    })
  ]
};
```

### Server Actions (runtime/server-components/actions.js)

Secure RPC mechanism for invoking server-side functions from Client Components. Server Actions are async functions marked with 'use server' that execute on the server but can be called from the client.

```javascript
import {
  // Client-side
  registerAction, createActionInvoker, useServerAction, bindFormAction,
  // Server-side
  registerServerAction, executeServerAction,
  // Middleware
  createServerActionMiddleware, createFastifyActionPlugin, createHonoActionMiddleware
} from 'pulse-js-framework/runtime/server-components';

// === Server-Side: Define Server Actions ===

// In .pulse file or .js module with 'use server'
async function createUser(data) {
  'use server';

  // Validate input
  const validated = validateUserInput(data);

  // Database access (only on server)
  const user = await db.users.create(validated);

  // Return serializable data
  return { id: user.id, name: user.name, email: user.email };
}

async function deleteUser(id) {
  'use server';

  await db.users.delete(id);
  return { success: true };
}

// Register actions (build tool does this automatically)
registerServerAction('UserForm$createUser', createUser);
registerServerAction('UserActions$deleteUser', deleteUser);

// === Client-Side: Invoke Server Actions ===

// Option 1: Direct invocation
const createUser = createActionInvoker('UserForm$createUser');
const user = await createUser({ name: 'John', email: 'john@example.com' });

// Option 2: Reactive hook (recommended)
const { invoke, data, loading, error, reset } = useServerAction('UserForm$createUser');

// Use in effects
effect(() => {
  if (loading.get()) console.log('Submitting...');
  if (error.get()) console.log('Error:', error.get().message);
  if (data.get()) console.log('Success:', data.get());
});

// Call the action
await invoke({ name: 'John', email: 'john@example.com' });

// Reset state
reset();

// Option 3: Progressive enhancement for forms
const form = document.querySelector('#user-form');

bindFormAction(form, 'UserForm$createUser', {
  resetOnSuccess: true,
  onSuccess: (result) => {
    console.log('User created:', result);
    showNotification('User created successfully!');
  },
  onError: (error) => {
    console.error('Failed:', error);
    showError(error.message);
  }
});

// === Server-Side: Setup Middleware ===

// Express
import express from 'express';
import { createServerActionMiddleware } from 'pulse-js-framework/runtime/server-components';

const app = express();
app.use(express.json());

app.use(createServerActionMiddleware({
  csrfValidation: true,          // Enable CSRF protection (default: true)
  endpoint: '/_actions',          // Actions endpoint (default: '/_actions')
  onError: (error, req, res) => {
    logger.error('Action failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// Fastify
import Fastify from 'fastify';
import { createFastifyActionPlugin } from 'pulse-js-framework/runtime/server-components';

const fastify = Fastify();
fastify.register(createFastifyActionPlugin, {
  csrfValidation: true
});

// Hono
import { Hono } from 'hono';
import { createHonoActionMiddleware } from 'pulse-js-framework/runtime/server-components';

const app = new Hono();
app.use('/_actions', createHonoActionMiddleware({
  csrfValidation: true
}));

// === Security Features ===

// 1. CSRF Protection (automatic)
// Server Actions require valid CSRF token from meta tag or cookie
<meta name="csrf-token" content="${csrfToken}">

// 2. JSON Serialization Validation
// Arguments and return values must be JSON-serializable (no functions, symbols, etc.)
await invoke({ name: 'John' });          // ✓ Valid
await invoke({ callback: () => {} });    // ✗ Throws error

// 3. Timeout Protection (default: 30s)
registerServerAction('slowAction', async (data, context) => {
  // Override timeout for this action
  context.timeout = 60000;  // 60 seconds

  const result = await longRunningOperation(data);
  return result;
});

// 4. Error Handling
try {
  const result = await invoke({ data });
} catch (error) {
  // Errors from server are properly serialized
  console.error('Action failed:', error.message);
}

// 5. Rate Limiting (Token Bucket Algorithm)
// Flexible rate limiting with O(1) complexity
app.use(createServerActionMiddleware({
  csrfValidation: true,

  // Per-action rate limits (different limits per action)
  rateLimitPerAction: {
    'createUser': { maxRequests: 5, windowMs: 60000 },    // 5/min
    'sendEmail': { maxRequests: 10, windowMs: 60000 },    // 10/min
    'default': { maxRequests: 20, windowMs: 60000 }       // 20/min default
  },

  // Per-user rate limits (by IP or user ID)
  rateLimitPerUser: {
    maxRequests: 100,
    windowMs: 60000  // 100/min per user
  },

  // Global rate limits (across all actions)
  rateLimitGlobal: {
    maxRequests: 10000,
    windowMs: 60000  // 10k/min total
  },

  // Custom user identification
  rateLimitIdentify: (context) => {
    return context.userId || context.ip || 'anonymous';
  },

  // Bypass for trusted IPs
  rateLimitTrustedIPs: ['127.0.0.1', '::1']
}));

// Distributed rate limiting (Redis for multi-server)
import { createClient } from 'redis';
import { RedisRateLimitStore } from 'pulse-js-framework/runtime/server-components';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

app.use(createServerActionMiddleware({
  rateLimitPerUser: { maxRequests: 100, windowMs: 60000 },
  rateLimitStore: new RedisRateLimitStore(redisClient, { prefix: 'myapp:ratelimit:' })
}));

// Client-side automatic retry on rate limit
const createUser = createActionInvoker('createUser', {
  maxRetries: 3,      // Retry up to 3 times
  autoRetry: true     // Automatically retry on 429
});

try {
  const user = await createUser({ name: 'John' });
} catch (error) {
  if (PSCRateLimitError.isRateLimitError(error)) {
    console.error(`Rate limited. Retry after ${Math.ceil(error.retryAfter / 1000)}s`);
  }
}

// Rate limit response headers
// X-RateLimit-Limit: 100          # Max requests allowed
// X-RateLimit-Remaining: 95       # Remaining requests
// X-RateLimit-Reset: 2026-02-14T10:30:00Z  # When limit resets
// Retry-After: 30                 # Seconds to wait (on 429)

// === Complete Example: User Management Form ===

// UserForm.pulse (Server Component with Server Actions)
@page UserForm

'use server';

actions {
  async createUser(data) {
    'use server';

    // Validate
    const errors = validateUser(data);
    if (errors) {
      throw new Error(JSON.stringify(errors));
    }

    // Create user in database
    const user = await db.users.create({
      name: data.name,
      email: data.email,
      role: data.role
    });

    // Send welcome email (server-side only)
    await sendWelcomeEmail(user.email);

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  async deleteUser(id) {
    'use server';

    await db.users.delete(id);
    return { success: true };
  }
}

view {
  .user-form {
    h1 "Create User"

    form#user-form {
      input[name=name][placeholder="Name"][required]
      input[name=email][type=email][placeholder="Email"][required]
      select[name=role] {
        option[value=user] "User"
        option[value=admin] "Admin"
      }
      button[type=submit] "Create User"
    }

    // Client Component for interactivity
    UserFormHandler
  }
}

// UserFormHandler.pulse (Client Component)
'use client';

state {
  submitting: false
  result: null
  error: null
}

actions {
  async handleSubmit(event) {
    event.preventDefault();

    submitting = true;
    error = null;

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
      result = await createUser(data);  // Server Action
      event.target.reset();
    } catch (err) {
      error = err.message;
    } finally {
      submitting = false;
    }
  }
}

view {
  .form-handler {
    @if(submitting) {
      .spinner "Submitting..."
    }

    @if(error) {
      .error "Error: {error}"
    }

    @if(result) {
      .success "User created: {result.name}"
    }
  }
}

// === Server Actions with Context ===

// Access request context in Server Actions
registerServerAction('createPost', async (data, context) => {
  // Context includes: req, res, session, user
  const userId = context.user?.id;

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const post = await db.posts.create({
    ...data,
    authorId: userId
  });

  return post;
});
```

### Server Components Security

The Server Components module includes comprehensive security features to protect against data leaks, XSS attacks, and DoS vulnerabilities. Security validation is **automatically applied** to all Client Component props and Server Action responses.

#### Security Layers

| Layer | Protection | Auto-Applied |
|-------|------------|--------------|
| **Secret Detection** | Detects API keys, tokens, passwords in prop keys/values | ✅ Yes (warns) |
| **XSS Sanitization** | Blocks `<script>`, event handlers, `javascript:` URLs | ✅ Yes |
| **Size Validation** | Prevents DoS via oversized props (1MB limit) | ✅ Yes (throws) |
| **Error Sanitization** | Removes sensitive data from error stack traces | ✅ Yes |

#### Prop Security Validation

```javascript
import { validatePropSecurity } from 'pulse-js-framework/runtime/server-components';

// Automatic validation in serializer (already integrated)
markClientBoundary(element, 'MyComponent', props);
// ✅ Automatically runs validatePropSecurity()

// Manual validation (if needed)
const result = validatePropSecurity(props, 'MyComponent', {
  detectSecrets: true,       // Warn on detected secrets (default: true)
  sanitizeXSS: true,          // Sanitize XSS patterns (default: true)
  validateSizes: true,        // Enforce size limits (default: true)
  throwOnSecrets: false       // Warn only, don't block (default: false)
});

if (!result.valid) {
  console.error('Security errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Security warnings:', result.warnings);
}

// Use sanitized props
const sanitizedProps = result.sanitized;
```

**Secret Detection Patterns (60+ patterns):**
- Generic patterns: `apiKey`, `secret`, `token`, `password`, `privateKey`
- Service-specific: Stripe keys, GitHub tokens, PEM keys
- High-entropy values: Base64 40+ chars, hex SHA-256/512
- Connection strings: `postgres://`, `mongodb://`, `redis://`

**XSS Sanitization:**
- Script tags: `<script>` → `&lt;script`
- Event handlers: `onclick=` → `data-blocked-event=`
- JavaScript URLs: `javascript:alert(1)` → `blocked:alert(1)`
- VBScript URLs: `vbscript:` → `blocked:`
- Data HTML: `data:text/html` → `data:text/plain`

**Size Limits (DoS Protection):**
```javascript
import { PROP_SIZE_LIMITS } from 'pulse-js-framework/runtime/server-components';

PROP_SIZE_LIMITS.MAX_DEPTH;         // 20 levels
PROP_SIZE_LIMITS.MAX_STRING_LENGTH; // 100KB per string
PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH;  // 10K items
PROP_SIZE_LIMITS.MAX_OBJECT_KEYS;   // 1K keys per object
PROP_SIZE_LIMITS.MAX_TOTAL_SIZE;    // 1MB total JSON size
```

#### Error Sanitization

Server Actions automatically sanitize errors before sending to clients:

```javascript
import {
  sanitizeError,
  sanitizeStackTrace,
  sanitizeErrorMessage,
  createProductionSafeError
} from 'pulse-js-framework/runtime/server-components';

// Automatic in Server Actions middleware (already integrated)
// All errors from Server Actions are sanitized

// Manual error sanitization (if needed)
try {
  await riskyOperation();
} catch (error) {
  const safe = sanitizeError(error, {
    mode: 'production',         // or 'development', auto-detected from NODE_ENV
    includeStack: false,         // Include stack trace (default: true in dev)
    maxStackLines: 5,            // Truncate stack trace
    redactMessages: true,        // Redact sensitive patterns
    allowedProperties: ['code']  // Whitelist custom properties
  });

  res.status(500).json(safe);
  // Client receives: { name: 'Error', message: 'sanitized message', code: 'ERR_CODE' }
}

// Production-safe error (minimal info)
const safe = createProductionSafeError(error, 'Payment processing failed');
// Client receives: { name: 'Error', message: 'Payment processing failed' }
```

**Error Sanitization Features:**

1. **Stack Trace Filtering:**
   - Removes `node_modules`, `node:internal`, user home directories
   - Converts absolute paths to relative (`/Users/alice/app.js` → `app.js`)
   - Filters anonymous function traces
   - Truncates to configurable max lines (default: 5)

2. **Message Redaction:**
   - Connection strings: `postgres://user:pass@localhost/db` → `[REDACTED]`
   - API keys and tokens: `sk_live_abc123` → `[REDACTED]`
   - File paths: `/etc/secrets/api.json` → `[REDACTED]`
   - Email addresses: `user@example.com` → `[REDACTED]`
   - IP addresses: `192.168.1.100` → `[REDACTED]`
   - Environment variables: `API_KEY=secret` → `[REDACTED]`

3. **Property Filtering:**
   - Removes: `request`, `response`, `headers`, `cookies`, `session`, `config`
   - Preserves: `name`, `message`, `code`, `suggestion` (Pulse errors)

#### Security Best Practices

**DO:**
- ✅ Pass only serializable data to Client Components (plain objects, arrays, primitives)
- ✅ Use Server Actions for sensitive operations (database access, API calls)
- ✅ Validate user input on the server (never trust client data)
- ✅ Keep secrets in environment variables, not props
- ✅ Use generic error messages in production (`createProductionSafeError()`)
- ✅ Sanitize user-generated content before display (auto-handled by XSS sanitization)

**DON'T:**
- ❌ Pass secrets as props to Client Components (detected and warned)
- ❌ Pass functions, symbols, or class instances as props (throws error)
- ❌ Send unfiltered error objects to client (auto-sanitized)
- ❌ Disable security features unless absolutely necessary
- ❌ Trust data from Client Components without validation

**Example: Secure Server Component**

```javascript
// ✅ GOOD: Secrets stay on server
export function UserProfile({ userId }) {
  'use server';

  // Server-side only - secrets never sent to client
  const apiKey = process.env.GITHUB_API_KEY;
  const user = await fetch(`https://api.github.com/users/${userId}`, {
    headers: { Authorization: `token ${apiKey}` }
  }).then(r => r.json());

  // Only send safe, public data to Client Component
  return UserCard({
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio
  });
}

// ❌ BAD: Secret exposed to client
export function UserProfile({ userId }) {
  'use server';

  const apiKey = process.env.GITHUB_API_KEY;

  // DON'T: Passing secret to Client Component
  return UserCard({
    userId,
    apiKey  // ⚠️ Security warning: detected secret in props
  });
}
```

**Example: Secure Server Action**

```javascript
// ✅ GOOD: Validation + error sanitization
async function createPost(data) {
  'use server';

  // 1. Validate input (never trust client)
  const errors = validatePostInput(data);
  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  try {
    // 2. Server-only operations
    const post = await db.posts.create({
      ...data,
      authorId: context.user?.id
    });

    // 3. Return safe data (no secrets)
    return {
      id: post.id,
      title: post.title,
      slug: post.slug
    };
  } catch (error) {
    // 4. Error auto-sanitized by middleware
    // Production: { name: 'Error', message: 'Database error' }
    // Development: { name: 'Error', message: 'Connection failed...', stack: 'sanitized...' }
    throw error;
  }
}
```

**Security Configuration**

```javascript
// Customize security settings (if needed)
const result = validatePropSecurity(props, 'MyComponent', {
  detectSecrets: true,       // Enable secret detection
  sanitizeXSS: true,          // Enable XSS sanitization
  validateSizes: true,        // Enable size limits
  throwOnSecrets: false       // Warn instead of throw
});

// Error sanitization options
const safe = sanitizeError(error, {
  mode: 'production',         // Force production mode
  includeStack: false,         // Never include stack
  maxStackLines: 3,            // Shorter stack traces
  redactMessages: true,        // Always redact
  allowedProperties: []        // No custom properties
});
```

**Environment Modes:**

| Mode | Stack Traces | Error Details | Secret Detection |
|------|--------------|---------------|------------------|
| **Development** | ✅ Sanitized | Full (redacted) | Warns |
| **Production** | ❌ None | Minimal | Warns |
| **Test** | ✅ Sanitized | Full | Warns |

Auto-detected via `process.env.NODE_ENV`.

