/**
 * Pulse Documentation - Examples Page
 */

import { el } from '/runtime/index.js';

export function ExamplesPage() {
  const page = el('.page.examples-page');

  page.innerHTML = `
    <h1>✨ Examples</h1>
    <p class="intro">Explore live examples built with Pulse Framework</p>

    <div class="examples-grid">
      <div class="example-card">
        <div class="example-icon">📝</div>
        <h3>Todo App</h3>
        <p>A full-featured todo application with dark mode, filters, and localStorage persistence.</p>
        <ul class="example-features">
          <li>✓ Add, edit, delete todos</li>
          <li>✓ Filter by status</li>
          <li>✓ Dark mode toggle</li>
          <li>✓ LocalStorage persistence</li>
          <li>✓ Progress tracking</li>
        </ul>
        <a href="/examples/todo/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🌤️</div>
        <h3>Weather App</h3>
        <p>Real-time weather application using the Open-Meteo API.</p>
        <ul class="example-features">
          <li>✓ Search any city</li>
          <li>✓ Current conditions</li>
          <li>✓ 7-day forecast</li>
          <li>✓ Favorite cities</li>
          <li>✓ °C/°F toggle</li>
        </ul>
        <a href="/examples/meteo/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🛒</div>
        <h3>E-commerce Shop</h3>
        <p>Full-featured shopping experience with cart and checkout.</p>
        <ul class="example-features">
          <li>✓ Product catalog</li>
          <li>✓ Search & filters</li>
          <li>✓ Shopping cart</li>
          <li>✓ Checkout flow</li>
          <li>✓ LocalStorage persistence</li>
        </ul>
        <a href="/examples/ecommerce/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">💬</div>
        <h3>Chat App</h3>
        <p>Real-time messaging with rooms and simulated users.</p>
        <ul class="example-features">
          <li>✓ Multiple chat rooms</li>
          <li>✓ User presence</li>
          <li>✓ Simulated bot responses</li>
          <li>✓ Emoji picker</li>
          <li>✓ Message persistence</li>
        </ul>
        <a href="/examples/chat/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🧭</div>
        <h3>Router Demo</h3>
        <p>SPA routing with navigation, guards, and dynamic routes.</p>
        <ul class="example-features">
          <li>✓ Route parameters</li>
          <li>✓ Query strings</li>
          <li>✓ Route guards</li>
          <li>✓ Active link styling</li>
          <li>✓ Protected routes</li>
        </ul>
        <a href="/examples/router/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📝</div>
        <h3>Store Demo</h3>
        <p>Global state management with the Pulse Store system.</p>
        <ul class="example-features">
          <li>✓ createStore with persistence</li>
          <li>✓ Actions & getters</li>
          <li>✓ Undo/Redo (historyPlugin)</li>
          <li>✓ Module stores</li>
          <li>✓ Logger plugin</li>
        </ul>
        <a href="/examples/store/" class="btn btn-primary">
          View Demo →
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📊</div>
        <h3>Admin Dashboard</h3>
        <p>Complete admin interface demonstrating ALL Pulse features.</p>
        <ul class="example-features">
          <li>✓ Authentication & guards</li>
          <li>✓ Charts, tables, modals</li>
          <li>✓ CRUD operations</li>
          <li>✓ Themes & settings</li>
          <li>✓ All reactivity features</li>
        </ul>
        <a href="/examples/dashboard/" class="btn btn-primary">
          View Demo →
        </a>
      </div>
    </div>

    <section class="doc-section">
      <h2>Run Examples Locally</h2>
      <p>To run the example projects on your machine:</p>
      <div class="code-block">
        <pre><code># Todo App (port 3001)
cd pulse/examples/todo
npm run dev -- 3001

# Weather App (port 3002)
cd pulse/examples/meteo
npm run dev -- 3002

# E-commerce (port 3003)
cd pulse/examples/ecommerce
npm run dev -- 3003

# Chat App (port 3004)
cd pulse/examples/chat
npm run dev -- 3004

# Router Demo (port 3005)
cd pulse/examples/router
npm run dev -- 3005

# Store Demo (port 3006)
cd pulse/examples/store
npm run dev -- 3006

# Admin Dashboard (port 3007)
cd pulse/examples/dashboard
npm run dev -- 3007

# Documentation (port 3000)
cd pulse/docs
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Create Your Own</h2>
      <p>Start a new Pulse project:</p>
      <div class="code-block">
        <pre><code>npx pulse create my-awesome-app
cd my-awesome-app
npm install
npm run dev</code></pre>
      </div>
    </section>
  `;

  return page;
}
