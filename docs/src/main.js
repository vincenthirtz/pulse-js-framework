/**
 * Pulse Documentation Site
 * Built with Pulse Framework
 */

import { pulse, effect, el, mount } from '/runtime/index.js';

// =============================================================================
// State
// =============================================================================

const currentSection = pulse('home');
const mobileMenuOpen = pulse(false);

// =============================================================================
// Content Data
// =============================================================================

const sections = {
  home: {
    title: 'Pulse Framework',
    subtitle: 'A declarative DOM framework with CSS selector-based structure'
  },
  'getting-started': {
    title: 'Getting Started',
    subtitle: 'Quick start guide for Pulse'
  },
  'core-concepts': {
    title: 'Core Concepts',
    subtitle: 'Understanding Pulsations and reactivity'
  },
  'api-reference': {
    title: 'API Reference',
    subtitle: 'Complete API documentation'
  },
  examples: {
    title: 'Examples',
    subtitle: 'Live demos and example projects'
  }
};

const navigation = [
  { id: 'home', label: '🏠 Home' },
  { id: 'getting-started', label: '🚀 Getting Started' },
  { id: 'core-concepts', label: '💡 Core Concepts' },
  { id: 'api-reference', label: '📖 API Reference' },
  { id: 'examples', label: '✨ Examples' }
];

// =============================================================================
// Navigation
// =============================================================================

function navigate(section) {
  currentSection.set(section);
  mobileMenuOpen.set(false);
  window.scrollTo(0, 0);
}

// =============================================================================
// Components
// =============================================================================

function Header() {
  const header = el('header.header');

  const logo = el('.logo');
  logo.innerHTML = '⚡ <span>Pulse</span>';
  logo.addEventListener('click', () => navigate('home'));
  header.appendChild(logo);

  const nav = el('nav.nav');
  for (const item of navigation) {
    const link = el('a.nav-link', item.label);
    link.addEventListener('click', () => navigate(item.id));
    effect(() => {
      link.className = `nav-link ${currentSection.get() === item.id ? 'active' : ''}`;
    });
    nav.appendChild(link);
  }
  header.appendChild(nav);

  // Mobile menu button
  const menuBtn = el('button.menu-btn', '☰');
  menuBtn.addEventListener('click', () => mobileMenuOpen.update(v => !v));
  header.appendChild(menuBtn);

  // Mobile nav
  const mobileNav = el('nav.mobile-nav');
  effect(() => {
    mobileNav.className = `mobile-nav ${mobileMenuOpen.get() ? 'open' : ''}`;
  });
  for (const item of navigation) {
    const link = el('a.nav-link', item.label);
    link.addEventListener('click', () => navigate(item.id));
    mobileNav.appendChild(link);
  }
  header.appendChild(mobileNav);

  return header;
}

function HomePage() {
  const page = el('.page.home-page');

  // Hero
  const hero = el('.hero');
  hero.innerHTML = `
    <h1>⚡ Pulse Framework</h1>
    <p class="tagline">A declarative DOM framework with CSS selector-based structure</p>
    <div class="hero-features">
      <span class="feature">🎯 Unique Syntax</span>
      <span class="feature">⚡ Reactive</span>
      <span class="feature">📦 Lightweight</span>
      <span class="feature">🔧 No Build Required</span>
    </div>
    <div class="hero-buttons">
      <button class="btn btn-primary" onclick="window.docs.navigate('getting-started')">Get Started →</button>
      <button class="btn btn-secondary" onclick="window.docs.navigate('examples')">View Examples</button>
    </div>
  `;
  page.appendChild(hero);

  // What makes Pulse unique
  const unique = el('.section');
  unique.innerHTML = `
    <h2>What Makes Pulse Unique?</h2>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>React</th>
            <th>Vue</th>
            <th>Svelte</th>
            <th><strong>Pulse</strong></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>UI Structure</td>
            <td>JSX</td>
            <td>Templates</td>
            <td>HTML+</td>
            <td><strong>CSS Selectors</strong></td>
          </tr>
          <tr>
            <td>Reactivity</td>
            <td>Hooks</td>
            <td>Proxy</td>
            <td>Compiler</td>
            <td><strong>Pulsations</strong></td>
          </tr>
          <tr>
            <td>Build Step</td>
            <td>Required</td>
            <td>Required</td>
            <td>Required</td>
            <td><strong>Optional</strong></td>
          </tr>
          <tr>
            <td>File Extension</td>
            <td>.jsx/.tsx</td>
            <td>.vue</td>
            <td>.svelte</td>
            <td><strong>.pulse</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  page.appendChild(unique);

  // Quick example
  const example = el('.section');
  example.innerHTML = `
    <h2>Quick Example</h2>
    <div class="code-example">
      <div class="code-block">
        <div class="code-header">.pulse syntax</div>
        <pre><code>@page Counter

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}

style {
  .counter {
    text-align: center
    padding: 20px
  }
}</code></pre>
      </div>
      <div class="code-block">
        <div class="code-header">JavaScript equivalent</div>
        <pre><code>import { pulse, el, mount, effect } from 'pulse';

const count = pulse(0);

function Counter() {
  const div = el('.counter');

  const h1 = el('h1');
  effect(() => {
    h1.textContent = \`Count: \${count.get()}\`;
  });

  const inc = el('button', '+');
  inc.onclick = () => count.update(n => n + 1);

  const dec = el('button', '-');
  dec.onclick = () => count.update(n => n - 1);

  div.append(h1, inc, dec);
  return div;
}

mount('#app', Counter());</code></pre>
      </div>
    </div>
  `;
  page.appendChild(example);

  return page;
}

function GettingStartedPage() {
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
      <button class="btn btn-primary" onclick="window.docs.navigate('core-concepts')">
        Next: Core Concepts →
      </button>
    </div>
  `;

  return page;
}

function CoreConceptsPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>💡 Core Concepts</h1>

    <section class="doc-section">
      <h2>Pulsations (Reactive State)</h2>
      <p>A <strong>Pulse</strong> is a reactive value container. When its value changes, it automatically notifies all dependents.</p>
      <div class="code-block">
        <pre><code>import { pulse, effect } from 'pulse-framework';

// Create a pulse
const count = pulse(0);

// Read value
console.log(count.get()); // 0

// Update value
count.set(5);
count.update(n => n + 1); // 6

// Read without tracking (for side effects)
console.log(count.peek()); // 6</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Effects (Reactive Side Effects)</h2>
      <p>Effects automatically re-run when their dependencies change:</p>
      <div class="code-block">
        <pre><code>const name = pulse('World');

// This effect re-runs whenever 'name' changes
effect(() => {
  console.log(\`Hello, \${name.get()}!\`);
});

name.set('Pulse'); // Logs: "Hello, Pulse!"</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>CSS Selector Syntax</h2>
      <p>Create DOM elements using familiar CSS selector syntax:</p>
      <div class="code-block">
        <pre><code>import { el } from 'pulse-framework';

// Tag name
el('div')              // &lt;div&gt;&lt;/div&gt;

// With class
el('.container')       // &lt;div class="container"&gt;&lt;/div&gt;

// With ID
el('#app')             // &lt;div id="app"&gt;&lt;/div&gt;

// Combined
el('button.btn.primary')  // &lt;button class="btn primary"&gt;

// With attributes
el('input[type=text][placeholder=Name]')

// With content
el('h1', 'Hello World')   // &lt;h1&gt;Hello World&lt;/h1&gt;

// With children
el('.card',
  el('h2', 'Title'),
  el('p', 'Content')
)</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>.pulse File Syntax</h2>
      <p>The <code>.pulse</code> DSL provides a clean, declarative way to write components:</p>

      <h3>Blocks</h3>
      <ul class="feature-list">
        <li><code>@page Name</code> - Component name declaration</li>
        <li><code>@route "/path"</code> - Route path for routing</li>
        <li><code>state { }</code> - Reactive state definitions</li>
        <li><code>view { }</code> - UI structure using selectors</li>
        <li><code>actions { }</code> - Functions/methods</li>
        <li><code>style { }</code> - Scoped CSS styles</li>
      </ul>

      <h3>Directives</h3>
      <ul class="feature-list">
        <li><code>@click(action)</code> - Event handlers</li>
        <li><code>@if(condition) { }</code> - Conditional rendering</li>
        <li><code>@each(item in items) { }</code> - List rendering</li>
        <li><code>{variable}</code> - Text interpolation</li>
      </ul>

      <div class="code-block">
        <pre><code>@page TodoList
@route "/todos"

state {
  items: []
  newItem: ""
}

view {
  .todo-app {
    h1 "My Todos"

    .input-group {
      input[type=text] @input(updateInput)
      button @click(addItem) "Add"
    }

    ul.todo-list {
      @each(item in items) {
        li.todo-item "{item.text}" @click(toggle(item))
      }
    }

    @if(items.length == 0) {
      p.empty "No todos yet!"
    }
  }
}

actions {
  updateInput(e) {
    newItem = e.target.value
  }

  addItem() {
    items = [...items, { text: newItem, done: false }]
    newItem = ""
  }

  toggle(item) {
    item.done = !item.done
  }
}

style {
  .todo-app {
    max-width: 500px
    margin: 0 auto
  }

  .todo-item {
    padding: 10px
    cursor: pointer
  }
}</code></pre>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('api-reference')">
        Next: API Reference →
      </button>
    </div>
  `;

  return page;
}

function ApiReferencePage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>📖 API Reference</h1>

    <section class="doc-section">
      <h2>Reactivity</h2>

      <div class="api-item">
        <h3><code>pulse(initialValue, options?)</code></h3>
        <p>Creates a reactive value container.</p>
        <div class="code-block">
          <pre><code>const count = pulse(0);
const user = pulse({ name: 'John' });

// Options
const value = pulse(0, {
  equals: (a, b) => a === b  // Custom equality check
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>pulse.get()</code></h3>
        <p>Returns the current value and tracks the dependency.</p>
      </div>

      <div class="api-item">
        <h3><code>pulse.set(newValue)</code></h3>
        <p>Sets a new value and notifies subscribers.</p>
      </div>

      <div class="api-item">
        <h3><code>pulse.update(fn)</code></h3>
        <p>Updates value using a function: <code>pulse.update(n => n + 1)</code></p>
      </div>

      <div class="api-item">
        <h3><code>pulse.peek()</code></h3>
        <p>Returns value without tracking (useful in side effects).</p>
      </div>

      <div class="api-item">
        <h3><code>effect(fn)</code></h3>
        <p>Creates a reactive effect that re-runs when dependencies change.</p>
        <div class="code-block">
          <pre><code>const cleanup = effect(() => {
  console.log(count.get());
});

// Later: stop the effect
cleanup();</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>computed(fn)</code></h3>
        <p>Creates a read-only pulse derived from other pulses.</p>
        <div class="code-block">
          <pre><code>const firstName = pulse('John');
const lastName = pulse('Doe');
const fullName = computed(() =>
  \`\${firstName.get()} \${lastName.get()}\`
);</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>batch(fn)</code></h3>
        <p>Batches multiple updates - effects run once at the end.</p>
        <div class="code-block">
          <pre><code>batch(() => {
  count.set(1);
  name.set('Jane');
  // Effects run once here, not twice
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>untrack(fn)</code></h3>
        <p>Reads pulses without creating dependencies.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2>DOM</h2>

      <div class="api-item">
        <h3><code>el(selector, ...children)</code></h3>
        <p>Creates a DOM element from a CSS selector.</p>
        <div class="code-block">
          <pre><code>el('div.container#main[data-id=1]',
  el('h1', 'Title'),
  el('p', 'Content')
)</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>mount(target, element)</code></h3>
        <p>Mounts an element to a target (selector or element).</p>
        <div class="code-block">
          <pre><code>mount('#app', App());
mount(document.body, App());</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>text(getValue)</code></h3>
        <p>Creates a reactive text node.</p>
        <div class="code-block">
          <pre><code>el('p', text(() => \`Count: \${count.get()}\`))</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>list(getItems, template, keyFn?)</code></h3>
        <p>Renders a reactive list.</p>
        <div class="code-block">
          <pre><code>list(
  () => todos.get(),
  (todo, index) => el('li', todo.text),
  (todo) => todo.id  // key function
)</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>when(condition, thenTpl, elseTpl?)</code></h3>
        <p>Conditional rendering.</p>
        <div class="code-block">
          <pre><code>when(
  () => isLoggedIn.get(),
  () => el('.dashboard', 'Welcome!'),
  () => el('.login', 'Please log in')
)</code></pre>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Router</h2>

      <div class="api-item">
        <h3><code>createRouter(options)</code></h3>
        <p>Creates a SPA router.</p>
        <div class="code-block">
          <pre><code>const router = createRouter({
  routes: {
    '/': HomePage,
    '/about': AboutPage,
    '/users/:id': UserPage
  },
  mode: 'history' // or 'hash'
});

router.start();
router.navigate('/about');
router.outlet('#app');</code></pre>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Store</h2>

      <div class="api-item">
        <h3><code>createStore(initialState, options?)</code></h3>
        <p>Creates a global state store.</p>
        <div class="code-block">
          <pre><code>const store = createStore({
  user: null,
  theme: 'light'
}, {
  persist: true,  // Save to localStorage
  storageKey: 'my-app'
});

store.user.get();
store.user.set({ name: 'John' });
store.$reset();</code></pre>
        </div>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('examples')">
        Next: Examples →
      </button>
    </div>
  `;

  return page;
}

function ExamplesPage() {
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
        <a href="http://localhost:3001" target="_blank" class="btn btn-primary">
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
        <a href="http://localhost:3002" target="_blank" class="btn btn-primary">
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
        <a href="http://localhost:3003" target="_blank" class="btn btn-primary">
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
        <a href="http://localhost:3004" target="_blank" class="btn btn-primary">
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

function Footer() {
  const footer = el('footer.footer');
  footer.innerHTML = `
    <div class="footer-content">
      <p>Built with ⚡ Pulse Framework</p>
      <p class="footer-links">
        <a href="https://github.com/pulse-framework" target="_blank">GitHub</a>
        <span>•</span>
        <a href="#" onclick="window.docs.navigate('getting-started')">Documentation</a>
        <span>•</span>
        <a href="#" onclick="window.docs.navigate('examples')">Examples</a>
      </p>
    </div>
  `;
  return footer;
}

function App() {
  const app = el('.app');

  app.appendChild(Header());

  const main = el('main.main');
  effect(() => {
    main.innerHTML = '';
    const section = currentSection.get();

    switch (section) {
      case 'home':
        main.appendChild(HomePage());
        break;
      case 'getting-started':
        main.appendChild(GettingStartedPage());
        break;
      case 'core-concepts':
        main.appendChild(CoreConceptsPage());
        break;
      case 'api-reference':
        main.appendChild(ApiReferencePage());
        break;
      case 'examples':
        main.appendChild(ExamplesPage());
        break;
      default:
        main.appendChild(HomePage());
    }
  });
  app.appendChild(main);

  app.appendChild(Footer());

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --card: #1e293b;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
  --code-bg: #0d1117;
  --success: #10b981;
  --radius: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.5em;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo span {
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg);
}

.nav-link.active {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.menu-btn {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.5em;
  cursor: pointer;
}

.mobile-nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  padding: 16px;
  flex-direction: column;
}

.mobile-nav.open {
  display: flex;
}

@media (max-width: 768px) {
  .nav { display: none; }
  .menu-btn { display: block; }
}

/* Main */
.main {
  flex: 1;
  padding: 48px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Page */
.page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero */
.hero {
  text-align: center;
  padding: 80px 20px;
}

.hero h1 {
  font-size: 3.5em;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff, var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tagline {
  font-size: 1.3em;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.hero-features {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.feature {
  padding: 8px 16px;
  background: var(--bg-light);
  border-radius: 100px;
  font-size: 0.9em;
}

.hero-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  font-size: 1em;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--bg-light);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--bg);
}

.btn-disabled {
  background: var(--bg-light);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Sections */
.section {
  margin-top: 80px;
}

.section h2 {
  font-size: 2em;
  margin-bottom: 24px;
  text-align: center;
}

/* Code blocks */
.code-block {
  background: var(--code-bg);
  border-radius: var(--radius);
  overflow: hidden;
  margin: 16px 0;
}

.code-header {
  padding: 8px 16px;
  background: var(--bg-light);
  font-size: 0.85em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.code-block pre {
  padding: 16px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.9em;
  line-height: 1.5;
}

.code-block code {
  color: #e2e8f0;
}

.code-example {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* Comparison table */
.comparison-table {
  overflow-x: auto;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border: 1px solid var(--border);
}

.comparison-table th {
  background: var(--bg-light);
}

.comparison-table td strong {
  color: var(--primary);
}

/* Docs page */
.docs-page h1 {
  font-size: 2.5em;
  margin-bottom: 32px;
}

.doc-section {
  margin-bottom: 48px;
}

.doc-section h2 {
  font-size: 1.5em;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.doc-section h3 {
  font-size: 1.2em;
  margin: 24px 0 12px;
}

.doc-section p {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.doc-section ul {
  margin-left: 24px;
  margin-bottom: 16px;
}

.doc-section li {
  margin-bottom: 8px;
}

.doc-section code {
  background: var(--code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

.api-item {
  background: var(--bg-light);
  padding: 24px;
  border-radius: var(--radius);
  margin-bottom: 16px;
}

.api-item h3 {
  margin-top: 0;
}

.feature-list {
  list-style: none;
  margin-left: 0;
}

.feature-list li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.feature-list code {
  color: var(--primary);
}

.next-section {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  text-align: center;
}

/* Examples page */
.examples-page .intro {
  font-size: 1.2em;
  color: var(--text-muted);
  margin-bottom: 32px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.example-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
  transition: transform 0.2s, border-color 0.2s;
}

.example-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}

.example-card.coming-soon {
  opacity: 0.6;
}

.example-card.coming-soon:hover {
  transform: none;
  border-color: var(--border);
}

.example-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.example-card h3 {
  font-size: 1.3em;
  margin-bottom: 8px;
}

.example-card > p {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.example-features {
  list-style: none;
  margin-bottom: 24px;
}

.example-features li {
  padding: 4px 0;
  font-size: 0.9em;
  color: var(--text-muted);
}

/* Footer */
.footer {
  background: var(--bg-light);
  padding: 32px 24px;
  text-align: center;
  border-top: 1px solid var(--border);
}

.footer-content p {
  margin-bottom: 8px;
}

.footer-links {
  color: var(--text-muted);
}

.footer-links a {
  color: var(--primary);
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

/* Mobile */
@media (max-width: 768px) {
  .hero h1 { font-size: 2.5em; }
  .hero-features { gap: 12px; }
  .feature { font-size: 0.8em; padding: 6px 12px; }
  .main { padding: 24px 16px; }
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Global API for onclick handlers
// =============================================================================

window.docs = { navigate };

// =============================================================================
// Mount
// =============================================================================

mount('#app', App());

console.log('📖 Pulse Documentation loaded!');
