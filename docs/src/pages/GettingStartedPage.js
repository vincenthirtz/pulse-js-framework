/**
 * Pulse Documentation - Getting Started Page
 */

import { el } from '/runtime/index.js';

export function GettingStartedPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>🚀 Getting Started</h1>

    <section class="doc-section">
      <h2>Installation</h2>
      <p>Create a new Pulse project with a single command:</p>
      <div class="code-block">
        <pre><code>npx pulse-js-framework create my-app
cd my-app
npm install
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Manual Setup</h2>
      <p>Or set up manually in any project:</p>
      <div class="code-block">
        <pre><code>npm install pulse-js-framework</code></pre>
      </div>
      <p>Then import in your JavaScript:</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-js-framework';</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Your First Component</h2>
      <p>Create a simple reactive counter:</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-js-framework';

// Create reactive state
const count = pulse(0);

// Build UI
function App() {
  const container = el('.app');

  // Reactive text
  const display = el('h1');
  effect(() => {
    display.textContent = \`Count: \${count.get()}\`;
  });

  // Buttons
  const increment = el('button', '+');
  increment.onclick = () => count.update(n => n + 1);

  const decrement = el('button', '-');
  decrement.onclick = () => count.update(n => n - 1);

  container.append(display, increment, decrement);
  return container;
}

// Mount to DOM
mount('#app', App());</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Using .pulse Files</h2>
      <p>For a cleaner syntax, use <code>.pulse</code> files with the Vite plugin:</p>
      <div class="code-block">
        <div class="code-header">vite.config.js</div>
        <pre><code>import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});</code></pre>
      </div>
      <div class="code-block">
        <div class="code-header">App.pulse</div>
        <pre><code>@page App

state {
  count: 0
}

view {
  .app {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Project Structure</h2>
      <div class="code-block">
        <pre><code>my-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.pulse
    └── components/
        └── Header.pulse</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>CLI Commands</h2>
      <p>Pulse provides a complete CLI for development workflow:</p>

      <h3>Development</h3>
      <div class="code-block">
        <pre><code>pulse create &lt;name&gt;   # Create new project
pulse dev [port]      # Start dev server (default: 3000)
pulse build           # Build for production
pulse preview [port]  # Preview production build</code></pre>
      </div>

      <h3>Code Quality</h3>
      <div class="code-block">
        <pre><code>pulse lint [files]    # Validate .pulse files
pulse lint --fix      # Auto-fix issues
pulse format [files]  # Format code consistently
pulse format --check  # Check without writing (CI)
pulse analyze         # Analyze bundle size
pulse analyze --json  # JSON output</code></pre>
      </div>

      <p><strong>Lint checks:</strong> undefined references, unused imports/state, naming conventions, empty blocks, import order.</p>
      <p><strong>Format rules:</strong> 2-space indent, sorted imports, consistent braces, proper spacing.</p>
      <p><strong>Analyze output:</strong> file count, component complexity, import graph, dead code detection.</p>
    </section>

    <section class="doc-section faq-section">
      <h2>FAQ</h2>

      <div class="faq-item">
        <h3>Do I need a build step?</h3>
        <p>No! Pulse works directly in the browser. However, for <code>.pulse</code> files and production optimization, we recommend using Vite with the Pulse plugin.</p>
      </div>

      <div class="faq-item">
        <h3>How does Pulse compare to React/Vue?</h3>
        <p>Pulse is much lighter (~4kb core, ~12kb full vs 35-45kb) and uses signals instead of virtual DOM. It has zero dependencies and an optional build step. The CSS selector syntax is unique to Pulse.</p>
      </div>

      <div class="faq-item">
        <h3>Can I use TypeScript?</h3>
        <p>Yes! Pulse includes full TypeScript definitions. Just import types from <code>pulse-js-framework/runtime</code> and your IDE will provide autocomplete.</p>
      </div>

      <div class="faq-item">
        <h3>How do I handle forms?</h3>
        <p>Use the <code>model()</code> helper for two-way binding:</p>
        <div class="code-block">
          <pre><code>const name = pulse('');
const input = el('input[type=text]');
model(input, name);  // Two-way binding</code></pre>
        </div>
      </div>

      <div class="faq-item">
        <h3>Can I use Pulse with existing projects?</h3>
        <p>Yes! Pulse can be mounted to any DOM element. Use <code>mount('#my-widget', MyComponent())</code> to embed Pulse components anywhere.</p>
      </div>

      <div class="faq-item">
        <h3>How do I fetch data?</h3>
        <p>Use standard <code>fetch()</code> with effects:</p>
        <div class="code-block">
          <pre><code>const users = pulse([]);
const loading = pulse(true);

effect(() => {
  fetch('/api/users')
    .then(r => r.json())
    .then(data => {
      users.set(data);
      loading.set(false);
    });
});</code></pre>
        </div>
      </div>

      <div class="faq-item">
        <h3>Does Pulse support SSR?</h3>
        <p>Not yet, but it's on the roadmap. Currently Pulse is optimized for client-side SPAs and mobile apps.</p>
      </div>

      <div class="faq-item">
        <h3>How do I debug my app?</h3>
        <p>Pulse v1.4.9+ supports source maps for <code>.pulse</code> files. Use the Logger API for structured output. See the <a href="#" onclick="window.docs.navigate('/debugging'); return false;">Debugging Guide</a> for more.</p>
      </div>

      <div class="faq-item">
        <h3>Can I build mobile apps?</h3>
        <p>Yes! Use <code>pulse mobile init</code> to set up Android/iOS projects. Pulse includes native APIs for storage, device info, and more. See the <a href="#" onclick="window.docs.navigate('/mobile'); return false;">Mobile Guide</a>.</p>
      </div>

      <div class="faq-item">
        <h3>Where can I get help?</h3>
        <p>Open an issue on <a href="https://github.com/vincenthirtz/pulse-js-framework/issues" target="_blank">GitHub</a> or check the <a href="#" onclick="window.docs.navigate('/examples'); return false;">Examples</a> for reference implementations.</p>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/core-concepts')">
        Next: Core Concepts →
      </button>
    </div>
  `;

  return page;
}
