/**
 * Pulse Documentation - Server Components Page
 */

import { el } from '/runtime/index.js';
import { t } from '../i18n/index.js';

export function ServerComponentsPage() {
  const page = el('.page.server-components-page');

  page.innerHTML = `
    <h1>${t('serverComponents.title')}</h1>
    <p class="intro">${t('serverComponents.intro')}</p>

    <!-- Quick Navigation -->
    <nav class="doc-toc">
      <h2>On This Page</h2>
      <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#architecture">Architecture</a></li>
        <li><a href="#quick-start">Quick Start</a></li>
        <li><a href="#server-actions">Server Actions</a></li>
        <li><a href="#security">Security</a>
          <ul>
            <li><a href="#csrf-protection">CSRF Protection</a></li>
            <li><a href="#rate-limiting">Rate Limiting</a></li>
            <li><a href="#prop-validation">Prop Validation</a></li>
          </ul>
        </li>
        <li><a href="#implementation-guide">Implementation Guide</a></li>
        <li><a href="#milestones">Development Roadmap</a></li>
        <li><a href="#security-fixes">Security Fixes</a></li>
      </ul>
    </nav>

    <!-- Overview -->
    <section id="overview" class="doc-section">
      <h2>Overview</h2>
      <p>Pulse Server Components bring React Server Components-style architecture to the Pulse framework, enabling component-level code splitting with 'use client' and 'use server' directives.</p>

      <h3>Key Features</h3>
      <ul>
        <li><strong>Zero Client Bundle for Server Components</strong> - Server Components run only on the server, reducing client bundle size</li>
        <li><strong>Server Actions</strong> - Type-safe RPC functions callable from Client Components</li>
        <li><strong>PSC Wire Format</strong> - Efficient JSON-based serialization format</li>
        <li><strong>Security by Default</strong> - Built-in CSRF protection, rate limiting, and prop validation</li>
        <li><strong>Build Tool Integration</strong> - Vite, Webpack, and Rollup plugins included</li>
      </ul>

      <h3>Component Types</h3>
      <pre><code class="language-javascript">// Server Component (runs only on server, zero client bundle)
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
}</code></pre>
    </section>

    <!-- Architecture -->
    <section id="architecture" class="doc-section">
      <h2>Architecture</h2>
      <p>Server Components follow a hybrid rendering model with 4 implementation phases:</p>

      <h3>Implementation Status</h3>
      <table>
        <thead>
          <tr>
            <th>Phase</th>
            <th>Status</th>
            <th>Coverage</th>
            <th>Tests</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Phase 1: PSC Wire Format</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>47/47 passing</td>
          </tr>
          <tr>
            <td>Phase 2: Server Rendering</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>16/16 passing</td>
          </tr>
          <tr>
            <td>Phase 3: Client Loading</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>21/21 passing</td>
          </tr>
          <tr>
            <td>Phase 4: Server Actions</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>55/55 passing</td>
          </tr>
          <tr>
            <td>Phase 5: Build Tools</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>40/40 passing</td>
          </tr>
          <tr>
            <td>Phase 6: Security Hardening</td>
            <td>✅ Complete</td>
            <td>100%</td>
            <td>All security tests passing</td>
          </tr>
        </tbody>
      </table>

      <h3>PSC Wire Format</h3>
      <p>The Pulse Server Components (PSC) wire format is a JSON-based serialization format optimized for streaming and partial hydration.</p>

      <pre><code class="language-javascript">// PSC Node Types
{
  "type": "element",           // Element node
  "tag": "div",
  "props": { "class": "container" },
  "children": [...]
}

{
  "type": "client-boundary",   // Client Component placeholder
  "id": "UserActions",
  "props": { "userId": 123 },
  "chunk": "/client-UserActions.js"
}

{
  "type": "text",              // Text node
  "content": "Hello, world!"
}</code></pre>

      <h3>Architecture Diagram</h3>
      <pre style="font-family: monospace; background: var(--code-bg); padding: 1rem; border-radius: 4px;">
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
├─────────────────────────────────────────────────────────┤
│  Client Component    Server Action Invoker              │
│  ┌────────────┐      ┌──────────────────┐              │
│  │ 'use client'│      │ createAction()   │              │
│  │  Interactive│ ───> │ POST /_actions   │              │
│  └────────────┘      └──────────────────┘              │
│         │                      │                         │
│         v                      v                         │
│  ┌──────────────────────────────────┐                   │
│  │   reconstructPSCTree()           │                   │
│  │   (Rebuild DOM from PSC JSON)    │                   │
│  └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │ PSC Wire Format (JSON)
                        │
┌─────────────────────────────────────────────────────────┐
│                    Server (Node.js)                      │
├─────────────────────────────────────────────────────────┤
│  Server Component    Server Action Handler              │
│  ┌────────────┐      ┌──────────────────────────┐      │
│  │'use server'│      │ executeServerAction()    │      │
│  │  DB Access │      │ • CSRF Validation        │      │
│  │  Secrets   │      │ • Rate Limiting          │      │
│  └────────────┘      │ • Prop Sanitization      │      │
│         │            └──────────────────────────┘      │
│         v                                                │
│  ┌──────────────────────────────────┐                   │
│  │   serializeToPSC()               │                   │
│  │   (Convert to PSC Wire Format)   │                   │
│  └──────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
</pre>
    </section>

    <!-- Quick Start -->
    <section id="quick-start" class="doc-section">
      <h2>Quick Start</h2>

      <h3>1. Install and Configure</h3>
      <pre><code class="language-bash"># Install Pulse
npm install pulse-js-framework

# Install build tool plugin
npm install -D @vitejs/plugin-pulse-server-components  # For Vite
# OR
npm install -D pulse-webpack-server-components         # For Webpack</code></pre>

      <h3>2. Vite Configuration</h3>
      <pre><code class="language-javascript">// vite.config.js
import pulsePlugin from 'pulse-js-framework/vite';
import pulseServerComponents from 'pulse-js-framework/vite/server-components';

export default {
  plugins: [
    pulsePlugin(),
    pulseServerComponents({
      manifestPath: 'dist/.pulse-manifest.json'
    })
  ]
};</code></pre>

      <h3>3. Server Setup (Express)</h3>
      <pre><code class="language-javascript">import express from 'express';
import { createServerActionMiddleware } from 'pulse-js-framework/runtime/server-components';

const app = express();
app.use(express.json());

// Server Actions endpoint with security
app.use(createServerActionMiddleware({
  csrfValidation: true,          // Enable CSRF protection
  rateLimitPerUser: {
    maxRequests: 100,
    windowMs: 60000               // 100 requests/min per user
  },
  rateLimitPerAction: {
    'createUser': { maxRequests: 5, windowMs: 60000 },
    'default': { maxRequests: 20, windowMs: 60000 }
  }
}));

app.listen(3000);</code></pre>

      <h3>4. Create Your First Server Component</h3>
      <pre><code class="language-javascript">// UserDashboard.js
'use server';

import { el } from 'pulse-js-framework/runtime';
import { UserCard } from './UserCard.js';  // Client Component

export async function UserDashboard() {
  // Server-side only - access secrets, database
  const apiKey = process.env.GITHUB_API_KEY;
  const users = await fetch('https://api.github.com/users', {
    headers: { Authorization: \`token \${apiKey}\` }
  }).then(r => r.json());

  return el('.dashboard',
    el('h1', 'User Dashboard'),
    el('.users', users.map(user =>
      UserCard({ user })  // Client Component for interactivity
    ))
  );
}

// UserCard.js (Client Component)
'use client';

import { pulse, el } from 'pulse-js-framework/runtime';
import { deleteUser } from './actions.js';  // Server Action

export function UserCard({ user }) {
  const expanded = pulse(false);

  const handleDelete = async () => {
    if (confirm('Delete user?')) {
      await deleteUser(user.id);
    }
  };

  return el('.user-card',
    el('h3', user.name, {
      onclick: () => expanded.update(v => !v)
    }),
    expanded.get() && el('.details',
      el('p', user.bio),
      el('button', 'Delete', { onclick: handleDelete })
    )
  );
}</code></pre>
    </section>

    <!-- Server Actions -->
    <section id="server-actions" class="doc-section">
      <h2>Server Actions</h2>
      <p>Server Actions are async functions marked with 'use server' that execute on the server but can be called from Client Components.</p>

      <h3>Defining Server Actions</h3>
      <pre><code class="language-javascript">// actions.js
'use server';

export async function createUser(data) {
  'use server';

  // Validate input
  const validated = validateUserInput(data);

  // Database access (only on server)
  const user = await db.users.create(validated);

  // Return serializable data
  return { id: user.id, name: user.name, email: user.email };
}

export async function deleteUser(id) {
  'use server';

  await db.users.delete(id);
  return { success: true };
}</code></pre>

      <h3>Calling from Client Components</h3>
      <pre><code class="language-javascript">import { useServerAction } from 'pulse-js-framework/runtime/server-components';
import { createUser } from './actions.js';

function UserForm() {
  const { invoke, data, loading, error, reset } = useServerAction('createUser');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await invoke(Object.fromEntries(formData));
  };

  return el('form', { onsubmit: handleSubmit },
    when(() => loading.get(), () => el('.spinner', 'Saving...')),
    when(() => error.get(), () => el('.error', error.get().message)),
    when(() => data.get(), () => el('.success', 'User created!')),

    el('input[name=name][placeholder=Name]'),
    el('input[name=email][type=email][placeholder=Email]'),
    el('button[type=submit]', 'Create User')
  );
}</code></pre>

      <h3>Progressive Enhancement for Forms</h3>
      <pre><code class="language-javascript">import { bindFormAction } from 'pulse-js-framework/runtime/server-components';

const form = document.querySelector('#user-form');

bindFormAction(form, 'createUser', {
  resetOnSuccess: true,
  onSuccess: (result) => {
    showNotification(\`User created: \${result.name}\`);
  },
  onError: (error) => {
    showError(error.message);
  }
});</code></pre>
    </section>

    <!-- Security -->
    <section id="security" class="doc-section">
      <h2>Security</h2>
      <p>Server Components include comprehensive security features to protect against data leaks, XSS attacks, and DoS vulnerabilities.</p>

      <h3>Security Layers</h3>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Protection</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Secret Detection</td>
            <td>Detects API keys, tokens, passwords in props</td>
            <td>✅ Auto-applied (warns)</td>
          </tr>
          <tr>
            <td>XSS Sanitization</td>
            <td>Blocks &lt;script&gt;, event handlers, javascript: URLs</td>
            <td>✅ Auto-applied</td>
          </tr>
          <tr>
            <td>Size Validation</td>
            <td>Prevents DoS via oversized props (1MB limit)</td>
            <td>✅ Auto-applied (throws)</td>
          </tr>
          <tr>
            <td>Error Sanitization</td>
            <td>Removes sensitive data from error stack traces</td>
            <td>✅ Auto-applied</td>
          </tr>
          <tr>
            <td>CSRF Protection</td>
            <td>Cryptographic tokens for Server Actions</td>
            <td>✅ Built-in</td>
          </tr>
          <tr>
            <td>Rate Limiting</td>
            <td>Token bucket algorithm (O(1) complexity)</td>
            <td>✅ Built-in</td>
          </tr>
        </tbody>
      </table>

      <!-- CSRF Protection -->
      <h3 id="csrf-protection">CSRF Protection</h3>
      <p>Cryptographic CSRF protection using HMAC signatures prevents cross-site request forgery attacks on Server Actions.</p>

      <h4>Token Format</h4>
      <pre><code>&lt;timestamp&gt;.&lt;random-bytes&gt;.&lt;hmac-signature&gt;

Example:
1704985200000.7a3f9c2e1b8d4a6f.9e4b2a7f1c8d3e5a6b9c2d4f7a1e3b8c</code></pre>

      <h4>Server Configuration</h4>
      <pre><code class="language-javascript">import { createServerActionMiddleware } from 'pulse-js-framework/runtime/server-components';

app.use(createServerActionMiddleware({
  csrfValidation: true,              // Enable CSRF (default: true)
  csrfSecret: process.env.CSRF_SECRET || 'change-me-in-production',
  csrfTokenExpiry: 3600000,          // 1 hour (default)
  csrfCookieName: '__Host-csrf',     // Secure cookie name
  csrfHeaderName: 'x-csrf-token'     // Header name
}));</code></pre>

      <h4>Token Generation & Validation</h4>
      <pre><code class="language-javascript">import { CSRFTokenStore } from 'pulse-js-framework/runtime/server-components';

// Create store (uses secure HMAC-SHA256)
const store = new CSRFTokenStore({
  secret: process.env.CSRF_SECRET,
  tokenExpiry: 3600000
});

// Generate token
const token = store.generateToken();

// Validate token
const isValid = store.validateToken(token);  // true/false

// Detect replay attacks (same token used twice)
try {
  store.validateToken(token, { consume: true });  // First use: OK
  store.validateToken(token, { consume: true });  // Second use: throws PSCCSRFError
} catch (error) {
  console.error('Token replay detected:', error.code);  // 'PSC_CSRF_TOKEN_REUSED'
}</code></pre>

      <h4>Client Setup</h4>
      <pre><code class="language-html">&lt;!-- In your HTML template --&gt;
&lt;meta name="csrf-token" content="\${csrfToken}"&gt;

&lt;!-- Or set cookie --&gt;
Set-Cookie: __Host-csrf=\${token}; Path=/; Secure; HttpOnly; SameSite=Strict</code></pre>

      <!-- Rate Limiting -->
      <h3 id="rate-limiting">Rate Limiting</h3>
      <p>Flexible rate limiting using the token bucket algorithm with O(1) complexity.</p>

      <h4>Token Bucket Algorithm</h4>
      <pre><code>Each bucket starts with maxRequests tokens
Each request consumes 1 token
Tokens refill at constant rate: maxRequests / (windowMs / 1000) per second
Request allowed if bucket has ≥1 token

Example: 10 requests / 60 seconds = 0.167 tokens/second refill

Time  Action       Tokens
0s    Start        10
1s    Request      9
2s    Request      8
3s    (wait)       8.5  (0.5 refilled)
10s   (wait)       9.67
20s   Request      8.67
60s   (wait)       10   (back to max)</code></pre>

      <h4>Configuration Options</h4>
      <pre><code class="language-javascript">app.use(createServerActionMiddleware({
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
}));</code></pre>

      <h4>Distributed Rate Limiting (Redis)</h4>
      <pre><code class="language-javascript">import { createClient } from 'redis';
import { RedisRateLimitStore } from 'pulse-js-framework/runtime/server-components';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

app.use(createServerActionMiddleware({
  rateLimitPerUser: { maxRequests: 100, windowMs: 60000 },
  rateLimitStore: new RedisRateLimitStore(redisClient, {
    prefix: 'myapp:ratelimit:'
  })
}));</code></pre>

      <h4>Client-Side Automatic Retry</h4>
      <pre><code class="language-javascript">import { createActionInvoker, PSCRateLimitError } from 'pulse-js-framework/runtime/server-components';

const createUser = createActionInvoker('createUser', {
  maxRetries: 3,      // Retry up to 3 times
  autoRetry: true     // Automatically retry on 429
});

try {
  const user = await createUser({ name: 'John' });
} catch (error) {
  if (PSCRateLimitError.isRateLimitError(error)) {
    console.error(\`Rate limited. Retry after \${Math.ceil(error.retryAfter / 1000)}s\`);
  }
}</code></pre>

      <h4>Response Headers</h4>
      <pre><code>X-RateLimit-Limit: 100          # Max requests allowed
X-RateLimit-Remaining: 95       # Remaining requests
X-RateLimit-Reset: 2026-02-14T10:30:00Z  # When limit resets

On rate limit (429):
HTTP/1.1 429 Too Many Requests
Retry-After: 30                 # Seconds to wait</code></pre>

      <!-- Prop Validation -->
      <h3 id="prop-validation">Prop Validation & Sanitization</h3>
      <p>Automatic validation prevents non-serializable types and detects environment variables in props.</p>

      <h4>Non-Serializable Type Detection</h4>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Error Message</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Function</td>
            <td>Cannot serialize function (not JSON-compatible)</td>
          </tr>
          <tr>
            <td>Symbol</td>
            <td>Cannot serialize symbol (not JSON-compatible)</td>
          </tr>
          <tr>
            <td>Undefined</td>
            <td>Cannot serialize undefined (omitted by JSON.stringify)</td>
          </tr>
          <tr>
            <td>Promise</td>
            <td>Cannot serialize Promise instance</td>
          </tr>
          <tr>
            <td>Date</td>
            <td>Cannot serialize Date instance</td>
          </tr>
          <tr>
            <td>Custom Class</td>
            <td>Cannot serialize custom class instance (ClassName)</td>
          </tr>
          <tr>
            <td>Circular Ref</td>
            <td>Circular reference detected</td>
          </tr>
        </tbody>
      </table>

      <h4>Environment Variable Detection</h4>
      <pre><code class="language-javascript">// Detects these patterns (warns but doesn't block):
process.env.API_KEY              // Node.js
import.meta.env.VITE_API_KEY     // Vite
Deno.env.get('API_KEY')          // Deno

// Good: Secrets stay on server
export function UserProfile({ userId }) {
  'use server';

  const apiKey = process.env.GITHUB_API_KEY;
  const user = await fetch(\`https://api.github.com/users/\${userId}\`, {
    headers: { Authorization: \`token \${apiKey}\` }
  }).then(r => r.json());

  // Only send safe, public data to Client Component
  return UserCard({
    name: user.name,
    avatar: user.avatar_url
  });
}

// Bad: Secret exposed to client
export function UserProfile({ userId }) {
  'use server';

  const apiKey = process.env.GITHUB_API_KEY;

  return UserCard({
    userId,
    apiKey  // ⚠️ Security warning: detected secret in props
  });
}</code></pre>

      <h4>Secret Detection Patterns</h4>
      <p>60+ patterns detected including:</p>
      <ul>
        <li>Generic: apiKey, secret, token, password, privateKey</li>
        <li>Service-specific: Stripe keys, GitHub tokens, PEM keys</li>
        <li>High-entropy: Base64 40+ chars, hex SHA-256/512</li>
        <li>Connection strings: postgres://, mongodb://, redis://</li>
      </ul>

      <h4>Size Limits (DoS Protection)</h4>
      <pre><code class="language-javascript">PROP_SIZE_LIMITS.MAX_DEPTH = 20;              // Max nesting depth
PROP_SIZE_LIMITS.MAX_STRING_LENGTH = 102400;   // 100KB per string
PROP_SIZE_LIMITS.MAX_ARRAY_LENGTH = 10000;     // 10K items
PROP_SIZE_LIMITS.MAX_OBJECT_KEYS = 1000;       // 1K keys per object
PROP_SIZE_LIMITS.MAX_TOTAL_SIZE = 1048576;     // 1MB total JSON size</code></pre>
    </section>

    <!-- Implementation Guide -->
    <section id="implementation-guide" class="doc-section">
      <h2>Implementation Guide</h2>

      <h3>File Structure</h3>
      <pre><code>runtime/server-components/
├── index.js                    # Main entry point
├── types.js                    # PSC wire format types
├── serializer.js               # Tree → PSC serialization
├── client.js                   # PSC → DOM reconstruction
├── server.js                   # Server-side rendering
├── actions.js                  # Client-side Server Actions
├── actions-server.js           # Server-side middleware
├── security.js                 # Prop validation
├── security-validation.js      # Serialization validation
├── security-csrf.js            # CSRF protection
├── security-ratelimit.js       # Rate limiting
├── security-errors.js          # Error classes
└── error-sanitizer.js          # Error sanitization</code></pre>

      <h3>Build Tool Integration</h3>

      <h4>Vite Plugin</h4>
      <pre><code class="language-javascript">// vite.config.js
import pulseServerComponents from 'pulse-js-framework/vite/server-components';

export default {
  plugins: [
    pulseServerComponents({
      manifestPath: 'dist/.pulse-manifest.json',
      base: '/assets'
    })
  ]
};</code></pre>

      <h4>Webpack Loader</h4>
      <pre><code class="language-javascript">// webpack.config.js
import { addServerComponentsSupport } from 'pulse-js-framework/webpack/server-components';

module.exports = {
  plugins: [
    addServerComponentsSupport({
      manifestPath: 'dist/.pulse-manifest.json',
      base: '/assets'
    })
  ]
};</code></pre>

      <h4>Rollup Plugin</h4>
      <pre><code class="language-javascript">// rollup.config.js
import pulseServerComponents from 'pulse-js-framework/rollup/server-components';

export default {
  plugins: [
    pulseServerComponents({
      manifestPath: 'dist/.pulse-manifest.json'
    })
  ]
};</code></pre>

      <h3>Server Framework Adapters</h3>

      <h4>Express</h4>
      <pre><code class="language-javascript">import express from 'express';
import { createExpressMiddleware } from 'pulse-js-framework/server/express';

const app = express();
app.use(createExpressMiddleware({
  app: ({ route, query }) => App({ route, query }),
  templatePath: './dist/index.html',
  distDir: './dist',
  streaming: false
}));</code></pre>

      <h4>Hono</h4>
      <pre><code class="language-javascript">import { Hono } from 'hono';
import { createHonoMiddleware } from 'pulse-js-framework/server/hono';

const app = new Hono();
app.use('*', createHonoMiddleware({
  app: ({ route }) => App({ route }),
  streaming: true  // Hono supports streaming natively
}));</code></pre>

      <h4>Fastify</h4>
      <pre><code class="language-javascript">import Fastify from 'fastify';
import { createFastifyPlugin } from 'pulse-js-framework/server/fastify';

const app = Fastify();
app.register(createFastifyPlugin({
  app: ({ route }) => App({ route }),
  templatePath: './dist/index.html'
}));</code></pre>

      <h3>Testing</h3>
      <pre><code class="language-javascript">import { test, describe } from 'node:test';
import assert from 'node:assert';
import { serializeToPSC, reconstructPSCTree } from 'pulse-js-framework/runtime/server-components';

describe('Server Components', () => {
  test('serializes and reconstructs tree', async () => {
    const original = el('div.container',
      el('h1', 'Title'),
      el('p', 'Content')
    );

    const psc = serializeToPSC(original);
    const reconstructed = await reconstructPSCTree(psc);

    assert.strictEqual(reconstructed.tagName, 'DIV');
    assert.strictEqual(reconstructed.children.length, 2);
  });
});</code></pre>

      <h3>Migration Checklist</h3>
      <ul>
        <li>✅ Install build tool plugin (Vite/Webpack/Rollup)</li>
        <li>✅ Configure Server Actions middleware</li>
        <li>✅ Set CSRF_SECRET environment variable</li>
        <li>✅ Add CSRF token to HTML template</li>
        <li>✅ Configure rate limiting (per-action, per-user, global)</li>
        <li>✅ Set up Redis for distributed rate limiting (optional)</li>
        <li>✅ Mark server-only code with 'use server'</li>
        <li>✅ Mark interactive components with 'use client'</li>
        <li>✅ Test Server Actions with CSRF and rate limiting</li>
        <li>✅ Verify prop validation catches secrets</li>
        <li>✅ Check error sanitization in production</li>
      </ul>
    </section>

    <!-- Development Roadmap -->
    <section id="milestones" class="doc-section">
      <h2>Development Roadmap</h2>

      <h3>Completed Milestones</h3>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>M1: Core Framework</td>
            <td>✅ Complete</td>
            <td>Reactivity, DOM, router, store, form handling</td>
          </tr>
          <tr>
            <td>M2: Developer Experience</td>
            <td>✅ Complete</td>
            <td>CLI, build tools, HMR, devtools, testing</td>
          </tr>
          <tr>
            <td>M3: Advanced Features</td>
            <td>✅ Complete</td>
            <td>SSR, GraphQL, WebSocket, i18n, accessibility</td>
          </tr>
          <tr>
            <td>M4: Server Components</td>
            <td>✅ Complete</td>
            <td>PSC format, Server Actions, security (CSRF, rate limiting)</td>
          </tr>
        </tbody>
      </table>

      <h3>Planned Milestones</h3>
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Status</th>
            <th>Timeline</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>M5: Production Hardening</td>
            <td>📋 Planned</td>
            <td>Q2 2026</td>
          </tr>
          <tr>
            <td>M6: Documentation & Examples</td>
            <td>📋 Planned</td>
            <td>Q2 2026</td>
          </tr>
          <tr>
            <td>M7: Community & Ecosystem</td>
            <td>📋 Planned</td>
            <td>Q3 2026</td>
          </tr>
          <tr>
            <td>M8: Performance Optimization</td>
            <td>📋 Planned</td>
            <td>Q3 2026</td>
          </tr>
          <tr>
            <td>M9: Mobile & Desktop</td>
            <td>📋 Planned</td>
            <td>Q4 2026</td>
          </tr>
          <tr>
            <td>M10: v2.0 Release</td>
            <td>📋 Planned</td>
            <td>Q4 2026</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Security Fixes -->
    <section id="security-fixes" class="doc-section">
      <h2>Security Fixes</h2>
      <p>All critical and high severity vulnerabilities have been addressed in the current release.</p>

      <h3>Critical Severity</h3>
      <table>
        <thead>
          <tr>
            <th>Vulnerability</th>
            <th>Impact</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ReDoS in Environment Variable Detection</strong></td>
            <td>Catastrophic backtracking with 100+ character env var names (60+ seconds)</td>
            <td>Replaced regex with iterative parsing. Max 3ms for 1000-char input.</td>
          </tr>
          <tr>
            <td><strong>Prototype Pollution</strong></td>
            <td>Malicious props could modify Object.prototype</td>
            <td>Added Object.create(null) and hasOwnProperty checks. Explicit __proto__ rejection.</td>
          </tr>
        </tbody>
      </table>

      <h3>High Severity</h3>
      <table>
        <thead>
          <tr>
            <th>Vulnerability</th>
            <th>Impact</th>
            <th>Fix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Race Condition in Token Bucket</strong></td>
            <td>Concurrent requests could bypass rate limits</td>
            <td>Added atomic check-and-decrement with mutex lock pattern.</td>
          </tr>
          <tr>
            <td><strong>CSRF Timing Attack</strong></td>
            <td>Constant-time comparison leak</td>
            <td>Replaced === with crypto.timingSafeEqual() for HMAC comparison.</td>
          </tr>
          <tr>
            <td><strong>Redis Injection</strong></td>
            <td>Unsanitized key prefix allowed command injection</td>
            <td>Whitelist validation (alphanumeric + : _ - only) for prefixes and keys.</td>
          </tr>
          <tr>
            <td><strong>Integer Overflow in Rate Limiter</strong></td>
            <td>Large windowMs values could cause negative token counts</td>
            <td>Added MAX_SAFE_INTEGER validation for windowMs and maxRequests.</td>
          </tr>
          <tr>
            <td><strong>Path Traversal in Manifest Loading</strong></td>
            <td>manifestPath could read arbitrary files</td>
            <td>Sanitized path with path.resolve() + whitelist validation. Reject ../ and absolute paths.</td>
          </tr>
        </tbody>
      </table>

      <h3>Verification</h3>
      <p>All fixes include:</p>
      <ul>
        <li>✅ Regression tests (100% coverage of vulnerable code paths)</li>
        <li>✅ Fuzzing tests with malicious inputs</li>
        <li>✅ Performance benchmarks (no degradation)</li>
        <li>✅ Security audit review</li>
      </ul>

      <h3>Best Practices</h3>
      <pre><code class="language-javascript">// ✅ DO: Set strong CSRF secret
process.env.CSRF_SECRET = crypto.randomBytes(32).toString('hex');

// ✅ DO: Use Redis for distributed systems
const store = new RedisRateLimitStore(redisClient);

// ✅ DO: Configure appropriate rate limits
rateLimitPerAction: {
  'resetPassword': { maxRequests: 3, windowMs: 3600000 },  // 3/hour
  'createUser': { maxRequests: 5, windowMs: 60000 }        // 5/min
}

// ❌ DON'T: Pass secrets to Client Components
return ClientComponent({ apiKey: process.env.API_KEY });  // Detected!

// ❌ DON'T: Disable security features
createServerActionMiddleware({ csrfValidation: false });  // Dangerous!</code></pre>
    </section>

    <!-- API Reference -->
    <section class="doc-section">
      <h2>API Reference</h2>
      <p>For complete API documentation, see:</p>
      <ul>
        <li><a href="/api-reference#server-components">Server Components API</a></li>
        <li><a href="/api-reference#server-actions">Server Actions API</a></li>
        <li><a href="/api-reference#security">Security API</a></li>
      </ul>
    </section>

    <!-- Resources -->
    <section class="doc-section">
      <h2>Resources</h2>
      <ul>
        <li><a href="https://github.com/vincenthirtz/pulse-js-framework/tree/main/examples/server-actions-ratelimit" target="_blank" rel="noopener">Example: Server Actions with Rate Limiting</a></li>
        <li><a href="https://github.com/vincenthirtz/pulse-js-framework/blob/main/docs/adr/0009-server-components-architecture.md" target="_blank" rel="noopener">ADR-0009: Server Components Architecture</a></li>
        <li><a href="https://github.com/vincenthirtz/pulse-js-framework/blob/main/docs/adr/0010-server-components-security.md" target="_blank" rel="noopener">ADR-0010: Server Components Security</a></li>
      </ul>
    </section>
  `;

  return page;
}
