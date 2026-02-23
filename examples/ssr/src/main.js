/**
 * Pulse SSR Demo
 * Demonstrates renderToString, hydrate, state serialization,
 * ClientOnly/ServerOnly, and SSR-safe patterns.
 *
 * This example runs in the browser but simulates the SSR workflow
 * by showing each step of the process with live code and output.
 */

import { pulse, effect, computed, el, mount, list, when } from '../../../runtime/index.js';
import {
  renderToStringSync, serializeState, deserializeState,
  isSSR, ClientOnly, ServerOnly
} from '../../../runtime/ssr.js';

// ── State ─────────────────────────────────────────────────────
const activeTab = pulse('overview');
const ssrOutput = pulse('');
const serializedState = pulse('');
const hydrationStatus = pulse('idle');

// ── Mock Data ─────────────────────────────────────────────────
const mockPosts = [
  { id: 1, title: 'Introduction to SSR', excerpt: 'Server-side rendering improves SEO and initial page load...' },
  { id: 2, title: 'Hydration Explained', excerpt: 'Hydration attaches event listeners to server-rendered HTML...' },
  { id: 3, title: 'SSR vs CSR vs SSG', excerpt: 'Choose the right rendering strategy for your application...' }
];

// ── SSR Simulation ────────────────────────────────────────────

function runSSRDemo() {
  // Step 1: Render a component to HTML string
  const html = renderToStringSync(() =>
    el('div.ssr-content',
      el('h2', 'Server-Rendered Page'),
      el('p', 'This HTML was generated on the server.'),
      el('ul',
        mockPosts.map(post =>
          el('li',
            el('h3', post.title),
            el('p', post.excerpt)
          )
        )
      ),
      el('footer', `Rendered at: ${new Date().toISOString()}`)
    )
  );
  ssrOutput.set(typeof html === 'string' ? html : String(html));

  // Step 2: Serialize state
  const state = {
    posts: mockPosts,
    renderedAt: new Date().toISOString(),
    theme: 'light'
  };
  serializedState.set(serializeState(state));

  // Step 3: Simulate hydration
  hydrationStatus.set('hydrating');
  setTimeout(() => {
    hydrationStatus.set('complete');
  }, 800);
}

// ── Tab Components ────────────────────────────────────────────

function OverviewTab() {
  return el('div.tab-content',
    el('h2', 'SSR Overview'),
    el('p', 'Server-Side Rendering pre-renders your Pulse app on the server, sending fully-formed HTML to the browser. This improves:'),
    el('div.benefits-grid',
      el('div.benefit',
        el('div.benefit-icon', 'SEO'),
        el('h3', 'Search Engine Optimization'),
        el('p', 'Search engines see complete HTML content instead of empty div tags.')
      ),
      el('div.benefit',
        el('div.benefit-icon', 'FCP'),
        el('h3', 'First Contentful Paint'),
        el('p', 'Users see content immediately without waiting for JavaScript to execute.')
      ),
      el('div.benefit',
        el('div.benefit-icon', 'A11y'),
        el('h3', 'Accessibility'),
        el('p', 'Content is available before JavaScript loads, improving screen reader support.')
      ),
      el('div.benefit',
        el('div.benefit-icon', 'Perf'),
        el('h3', 'Performance'),
        el('p', 'Faster time-to-interactive on slow devices and networks.')
      )
    ),

    el('h3', 'How It Works'),
    el('ol.steps',
      el('li', el('strong', 'Server Render: '), 'renderToString() creates HTML using MockDOMAdapter'),
      el('li', el('strong', 'Async Data: '), 'useAsync operations are collected and awaited'),
      el('li', el('strong', 'HTML Output: '), 'MockNode tree is serialized to an HTML string'),
      el('li', el('strong', 'State Transfer: '), 'State is serialized as JSON in a script tag'),
      el('li', el('strong', 'Client Hydration: '), 'hydrate() attaches event listeners to existing DOM'),
      el('li', el('strong', 'Interactive: '), 'App becomes fully interactive with no content flicker')
    )
  );
}

function RenderTab() {
  return el('div.tab-content',
    el('h2', 'Live SSR Demonstration'),
    el('p', 'Click the button to render a component to an HTML string (simulating server-side rendering):'),

    el('button.primary', 'Run SSR Render', { onclick: runSSRDemo }),

    // SSR Output
    when(
      () => ssrOutput.get(),
      () => el('div.output-section',
        el('h3', '1. renderToStringSync() Output'),
        el('p', 'This HTML would be sent from the server:'),
        el('pre.code-block',
          el('code', () => ssrOutput.get())
        )
      )
    ),

    // Serialized State
    when(
      () => serializedState.get(),
      () => el('div.output-section',
        el('h3', '2. serializeState() Output'),
        el('p', 'State is serialized for transfer to the client:'),
        el('pre.code-block',
          el('code', () => {
            try {
              return JSON.stringify(JSON.parse(serializedState.get()), null, 2);
            } catch { return serializedState.get(); }
          })
        )
      )
    ),

    // Hydration Status
    when(
      () => hydrationStatus.get() !== 'idle',
      () => el('div.output-section',
        el('h3', '3. Hydration Status'),
        el('div.hydration-status', {
          class: () => `status-${hydrationStatus.get()}`
        },
          () => {
            const status = hydrationStatus.get();
            if (status === 'hydrating') return 'Hydrating... (attaching event listeners)';
            if (status === 'complete') return 'Hydration complete! App is interactive.';
            return status;
          }
        )
      )
    )
  );
}

function PatternsTab() {
  const showClient = pulse(false);

  return el('div.tab-content',
    el('h2', 'SSR-Safe Patterns'),

    // isSSR() detection
    el('div.pattern',
      el('h3', 'Environment Detection'),
      el('p', 'Use isSSR() to guard browser-only code:'),
      el('pre.code-block', el('code',
`// Guard browser-only APIs
if (!isSSR()) {
  window.addEventListener('resize', handler);
  localStorage.setItem('key', 'value');
}

// In effects
effect(() => {
  if (isSSR()) return; // Skip on server
  document.title = \`\${count.get()} items\`;
});`
      )),
      el('p', () => `Current environment: ${isSSR() ? 'Server (SSR)' : 'Browser (Client)'}`)
    ),

    // ClientOnly / ServerOnly
    el('div.pattern',
      el('h3', 'ClientOnly / ServerOnly'),
      el('p', 'Selectively render content based on environment:'),
      el('pre.code-block', el('code',
`// Client-only: skipped during SSR
ClientOnly(
  () => el('canvas.chart', { onmount: initChart }),
  () => el('.placeholder', 'Chart loading...')
);

// Server-only: skipped on client
ServerOnly(
  () => el('script[type=application/ld+json]',
    JSON.stringify(seoSchema))
);`
      )),

      el('div.demo-box',
        el('p', 'Client-only content (interactive):'),
        el('button', () => showClient.get() ? 'Hide Counter' : 'Show Counter', {
          onclick: () => showClient.set(!showClient.get())
        }),
        when(
          () => showClient.get(),
          () => {
            const count = pulse(0);
            return el('div.client-widget',
              el('span', () => `Count: ${count.get()}`),
              el('button', '+', { onclick: () => count.update(n => n + 1) }),
              el('button', '-', { onclick: () => count.update(n => n - 1) })
            );
          }
        )
      )
    ),

    // State serialization safety
    el('div.pattern',
      el('h3', 'Safe State Serialization'),
      el('p', 'serializeState handles special types and XSS prevention:'),
      el('pre.code-block', el('code',
`// Handles Date objects, undefined, XSS escaping
const state = {
  user: { name: 'John', createdAt: new Date() },
  settings: { theme: 'dark' }
};

// Server: serialize to JSON
const json = serializeState(state);
// <script>window.__PULSE_STATE__ = ...</script>

// Client: deserialize (restores Date objects)
const restored = deserializeState(json);`
      ))
    )
  );
}

function ServerSetupTab() {
  return el('div.tab-content',
    el('h2', 'Server Setup'),
    el('p', 'Example Express server with Pulse SSR:'),

    el('pre.code-block', el('code',
`// server.js
import express from 'express';
import { renderToString, serializeState }
  from 'pulse-js-framework/runtime/ssr';
import { App } from './src/App.js';

const app = express();
app.use(express.static('dist'));

app.get('*', async (req, res) => {
  // 1. Render app to HTML (waits for async data)
  const { html, state } = await renderToString(
    () => App({ url: req.url }),
    { waitForAsync: true, timeout: 5000 }
  );

  // 2. Send complete HTML page
  res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>My Pulse App</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <div id="app">\${html}</div>
      <script>
        window.__PULSE_STATE__ =
          \${serializeState(state)};
      </script>
      <script type="module" src="/client.js">
      </script>
    </body>
    </html>
  \`);
});

app.listen(3000);`
    )),

    el('h3', 'Client Entry'),
    el('pre.code-block', el('code',
`// client.js
import { hydrate } from 'pulse-js-framework/runtime/ssr';
import { App } from './src/App.js';

// Hydrate server-rendered HTML
hydrate('#app', () => App(), {
  state: window.__PULSE_STATE__
});`
    )),

    el('h3', 'Framework Adapters'),
    el('p', 'Pulse includes adapters for popular server frameworks:'),
    el('div.adapters',
      el('div.adapter', el('strong', 'Express'), el('code', 'pulse-js-framework/server/express')),
      el('div.adapter', el('strong', 'Hono'), el('code', 'pulse-js-framework/server/hono')),
      el('div.adapter', el('strong', 'Fastify'), el('code', 'pulse-js-framework/server/fastify'))
    )
  );
}

// ── Navigation ────────────────────────────────────────────────
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'render', label: 'Live Demo' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'server', label: 'Server Setup' }
];

// ── App ───────────────────────────────────────────────────────
function App() {
  return el('div.app',
    el('header',
      el('h1', 'Server-Side Rendering'),
      el('p.subtitle', 'Pre-render Pulse apps for SEO and performance')
    ),
    el('nav.tabs',
      tabs.map(tab =>
        el('button', tab.label, {
          class: () => activeTab.get() === tab.id ? 'active' : '',
          onclick: () => activeTab.set(tab.id),
          'aria-selected': () => String(activeTab.get() === tab.id),
          role: 'tab'
        })
      )
    ),
    el('main',
      when(() => activeTab.get() === 'overview', OverviewTab),
      when(() => activeTab.get() === 'render', RenderTab),
      when(() => activeTab.get() === 'patterns', PatternsTab),
      when(() => activeTab.get() === 'server', ServerSetupTab)
    )
  );
}

mount('#app', App());
console.log('Pulse SSR Demo loaded');
