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
        <pre><code>npx pulse create my-app
cd my-app
npm install
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Manual Setup</h2>
      <p>Or set up manually in any project:</p>
      <div class="code-block">
        <pre><code>npm install pulse-framework</code></pre>
      </div>
      <p>Then import in your JavaScript:</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-framework';</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Your First Component</h2>
      <p>Create a simple reactive counter:</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-framework';

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
import pulse from 'pulse-framework/vite';

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

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/core-concepts')">
        Next: Core Concepts →
      </button>
    </div>
  `;

  return page;
}
