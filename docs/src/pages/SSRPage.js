/**
 * Pulse Documentation - Server-Side Rendering Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale } from '../state.js';

export function SSRPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="ssr.title"></h1>
    <p class="page-intro" data-i18n="ssr.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="ssr.quickStart"></h2>
      <p data-i18n="ssr.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import {
  renderToString, renderToStringSync, hydrate,
  serializeState, deserializeState, isSSR
} from 'pulse-js-framework/runtime/ssr';

// Render component to HTML string (async, waits for data)
const { html, state } = await renderToString(() => App(), {
  waitForAsync: true,   // Wait for useAsync/useResource to resolve
  timeout: 5000,        // Timeout for async operations (ms)
  serializeState: true  // Include state in result
});

// Render synchronously (no async waiting)
const html = renderToStringSync(() => StaticPage());</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.serverSetup"></h2>
      <p data-i18n="ssr.serverSetupDesc"></p>
      <div class="code-block">
        <pre><code>// server.js (Node.js/Express)
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

const app = express();

app.get('*', async (req, res) => {
  const { html, state } = await renderToString(() => App(), {
    waitForAsync: true
  });

  res.send(\`
    <!DOCTYPE html>
    <html>
      <head><title>My Pulse App</title></head>
      <body>
        <div id="app">\${html}</div>
        <script>window.__PULSE_STATE__ = \${serializeState(state)};</script>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  \`);
});

app.listen(3000);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.clientHydration"></h2>
      <p data-i18n="ssr.clientHydrationDesc"></p>
      <div class="code-block">
        <pre><code>// client.js
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import App from './App.js';

// Hydrate server-rendered HTML (attaches event listeners)
const dispose = hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__  // Restore server state
});

// Later, if needed:
dispose();  // Clean up hydration</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.stateSerialization"></h2>
      <p data-i18n="ssr.stateSerializationDesc"></p>
      <div class="code-block">
        <pre><code>import {
  serializeState, deserializeState, restoreState, getSSRState
} from 'pulse-js-framework/runtime/ssr';

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
const userData = getSSRState('user');</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.modeDetection"></h2>
      <p data-i18n="ssr.modeDetectionDesc"></p>
      <div class="code-block">
        <pre><code>import { isSSR, isHydratingMode } from 'pulse-js-framework/runtime/ssr';

// Check if running in SSR mode
if (isSSR()) {
  // Skip browser-only code
}

// Check if currently hydrating
if (isHydratingMode()) {
  // Hydration-specific logic
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.ssrSafeEffects"></h2>
      <p data-i18n="ssr.ssrSafeEffectsDesc"></p>
      <div class="code-block">
        <pre><code>import { effect } from 'pulse-js-framework/runtime';
import { isSSR } from 'pulse-js-framework/runtime/ssr';

// Effects automatically run once without subscriptions in SSR mode
effect(() => {
  if (isSSR()) return;  // Skip browser APIs on server

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.asyncData"></h2>
      <p data-i18n="ssr.asyncDataDesc"></p>
      <div class="code-block">
        <pre><code>import { useAsync } from 'pulse-js-framework/runtime/async';
import { el } from 'pulse-js-framework/runtime';

// useAsync automatically integrates with SSR
function UserProfile({ userId }) {
  const { data, loading } = useAsync(
    () => fetch(\`/api/users/\${userId}\`).then(r => r.json()),
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
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.architecture"></h2>
      <p data-i18n="ssr.architectureDesc"></p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="ssr.module"></th>
              <th data-i18n="ssr.purpose"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ssr.js</code></td>
              <td data-i18n="ssr.moduleMain"></td>
            </tr>
            <tr>
              <td><code>ssr-serializer.js</code></td>
              <td data-i18n="ssr.moduleSerializer"></td>
            </tr>
            <tr>
              <td><code>ssr-hydrator.js</code></td>
              <td data-i18n="ssr.moduleHydrator"></td>
            </tr>
            <tr>
              <td><code>ssr-async.js</code></td>
              <td data-i18n="ssr.moduleAsync"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.howItWorks"></h2>
      <p data-i18n="ssr.howItWorksDesc"></p>
      <div class="info-box">
        <ol>
          <li><strong data-i18n="ssr.step1Title"></strong> <span data-i18n="ssr.step1Desc"></span></li>
          <li><strong data-i18n="ssr.step2Title"></strong> <span data-i18n="ssr.step2Desc"></span></li>
          <li><strong data-i18n="ssr.step3Title"></strong> <span data-i18n="ssr.step3Desc"></span></li>
          <li><strong data-i18n="ssr.step4Title"></strong> <span data-i18n="ssr.step4Desc"></span></li>
          <li><strong data-i18n="ssr.step5Title"></strong> <span data-i18n="ssr.step5Desc"></span></li>
          <li><strong data-i18n="ssr.step6Title"></strong> <span data-i18n="ssr.step6Desc"></span></li>
          <li><strong data-i18n="ssr.step7Title"></strong> <span data-i18n="ssr.step7Desc"></span></li>
        </ol>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.apiReference"></h2>

      <h3>renderToString()</h3>
      <p data-i18n="ssr.renderToStringDesc"></p>
      <div class="code-block">
        <pre><code>const { html, state } = await renderToString(
  () => App(),          // Component factory function
  {
    waitForAsync: true, // Wait for useAsync/useResource (default: false)
    timeout: 5000,      // Async timeout in ms (default: 5000)
    serializeState: true // Include state object in result (default: false)
  }
);</code></pre>
      </div>

      <h3>renderToStringSync()</h3>
      <p data-i18n="ssr.renderToStringSyncDesc"></p>
      <div class="code-block">
        <pre><code>const html = renderToStringSync(() => StaticPage());
// No async waiting - renders immediately</code></pre>
      </div>

      <h3>hydrate()</h3>
      <p data-i18n="ssr.hydrateDesc"></p>
      <div class="code-block">
        <pre><code>const dispose = hydrate(
  '#app',               // Selector or DOM element
  () => App(),          // Component factory (must match server)
  {
    state: window.__PULSE_STATE__  // Optional: restore state
  }
);

// Returns cleanup function
dispose();</code></pre>
      </div>

      <h3>serializeState() / deserializeState()</h3>
      <p data-i18n="ssr.serializeDesc"></p>
      <div class="code-block">
        <pre><code>// Serialize for embedding in HTML (XSS-safe)
const json = serializeState({ date: new Date(), value: undefined });

// Deserialize (restores Date objects, undefined values)
const state = deserializeState(json);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.fullExample"></h2>
      <p data-i18n="ssr.fullExampleDesc"></p>

      <h3 data-i18n="ssr.sharedComponent"></h3>
      <div class="code-block">
        <pre><code>// App.js - Shared between server and client
import { el, pulse, effect } from 'pulse-js-framework/runtime';
import { useAsync } from 'pulse-js-framework/runtime/async';
import { isSSR } from 'pulse-js-framework/runtime/ssr';

export function App() {
  const { data: users, loading, error } = useAsync(
    () => fetch('/api/users').then(r => r.json()),
    { immediate: true }
  );

  // Browser-only effect
  effect(() => {
    if (isSSR()) return;
    document.title = \`Users (\${users.get()?.length || 0})\`;
  });

  return el('.app',
    el('h1', 'User Directory'),
    loading.get()
      ? el('.spinner', 'Loading users...')
      : error.get()
        ? el('.error', \`Error: \${error.get().message}\`)
        : el('ul.user-list',
            users.get()?.map(user =>
              el('li.user', \`\${user.name} - \${user.email}\`)
            ) || []
          )
  );
}</code></pre>
      </div>

      <h3 data-i18n="ssr.serverFile"></h3>
      <div class="code-block">
        <pre><code>// server.js
import express from 'express';
import { renderToString, serializeState } from 'pulse-js-framework/runtime/ssr';
import { App } from './App.js';

const app = express();
app.use(express.static('public'));

// API route
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' }
  ]);
});

// SSR route
app.get('*', async (req, res) => {
  try {
    const { html, state } = await renderToString(() => App(), {
      waitForAsync: true,
      timeout: 5000,
      serializeState: true
    });

    res.send(\`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse SSR App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="app">\${html}</div>
  <script>window.__PULSE_STATE__ = \${serializeState(state)};</script>
  <script type="module" src="/client.js"></script>
</body>
</html>
    \`);
  } catch (err) {
    console.error('SSR Error:', err);
    res.status(500).send('Server Error');
  }
});

app.listen(3000, () => {
  console.log('SSR server running on http://localhost:3000');
});</code></pre>
      </div>

      <h3 data-i18n="ssr.clientFile"></h3>
      <div class="code-block">
        <pre><code>// client.js
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import { App } from './App.js';

// Hydrate when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateApp);
} else {
  hydrateApp();
}

function hydrateApp() {
  hydrate('#app', () => App(), {
    state: window.__PULSE_STATE__
  });
  console.log('App hydrated!');
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.bestPractices"></h2>
      <div class="info-box">
        <ul>
          <li><strong data-i18n="ssr.practice1Title"></strong> <span data-i18n="ssr.practice1Desc"></span></li>
          <li><strong data-i18n="ssr.practice2Title"></strong> <span data-i18n="ssr.practice2Desc"></span></li>
          <li><strong data-i18n="ssr.practice3Title"></strong> <span data-i18n="ssr.practice3Desc"></span></li>
          <li><strong data-i18n="ssr.practice4Title"></strong> <span data-i18n="ssr.practice4Desc"></span></li>
          <li><strong data-i18n="ssr.practice5Title"></strong> <span data-i18n="ssr.practice5Desc"></span></li>
        </ul>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="ssr.troubleshooting"></h2>

      <h3 data-i18n="ssr.hydrationMismatch"></h3>
      <p data-i18n="ssr.hydrationMismatchDesc"></p>
      <div class="code-block">
        <pre><code>// WRONG: Different output on server vs client
function TimeDisplay() {
  return el('span', new Date().toLocaleString());  // Time differs!
}

// RIGHT: Use consistent data
function TimeDisplay({ timestamp }) {
  return el('span', new Date(timestamp).toLocaleString());
}</code></pre>
      </div>

      <h3 data-i18n="ssr.browserApis"></h3>
      <p data-i18n="ssr.browserApisDesc"></p>
      <div class="code-block">
        <pre><code>// WRONG: window is undefined on server
function Component() {
  const width = window.innerWidth;  // Error on server!
}

// RIGHT: Check SSR mode
import { isSSR } from 'pulse-js-framework/runtime/ssr';

function Component() {
  const width = isSSR() ? 1024 : window.innerWidth;
}</code></pre>
      </div>

      <h3 data-i18n="ssr.asyncTimeout"></h3>
      <p data-i18n="ssr.asyncTimeoutDesc"></p>
      <div class="code-block">
        <pre><code>// Increase timeout for slow APIs
const { html } = await renderToString(() => App(), {
  waitForAsync: true,
  timeout: 10000  // 10 seconds
});</code></pre>
      </div>
    </section>

    <nav class="page-nav">
      <a href="/http" class="prev" data-i18n="ssr.prevHttp"></a>
      <a href="/graphql" class="next" data-i18n="ssr.nextGraphQL"></a>
    </nav>
  `;

  // Apply i18n translations
  effect(() => {
    locale.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
