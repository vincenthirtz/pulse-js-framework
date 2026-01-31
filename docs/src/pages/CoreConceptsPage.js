/**
 * Pulse Documentation - Core Concepts Page
 */

import { el } from '/runtime/index.js';

export function CoreConceptsPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>💡 Core Concepts</h1>

    <section class="doc-section">
      <h2>Pulsations (Reactive State)</h2>
      <p>A <strong>Pulse</strong> is a reactive value container. When its value changes, it automatically notifies all dependents.</p>
      <div class="code-block">
        <pre><code>import { pulse, effect } from 'pulse-js-framework';

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
        <pre><code>import { el } from 'pulse-js-framework';

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
        <li><code>import</code> - Import components from other files</li>
        <li><code>@page Name</code> - Component name declaration</li>
        <li><code>@route "/path"</code> - Route path for routing</li>
        <li><code>state { }</code> - Reactive state definitions</li>
        <li><code>view { }</code> - UI structure using selectors</li>
        <li><code>actions { }</code> - Functions/methods</li>
        <li><code>style { }</code> - Scoped CSS styles (automatically scoped)</li>
      </ul>

      <h3>Imports</h3>
      <div class="code-block">
        <pre><code>// Default import
import Button from './Button.pulse'

// Named imports
import { Header, Footer } from './components.pulse'

// Namespace import
import * as Icons from './icons.pulse'

// Aliased import
import { Card as MyCard } from './ui.pulse'</code></pre>
      </div>

      <h3>Directives</h3>
      <ul class="feature-list">
        <li><code>@click(action)</code> - Event handlers</li>
        <li><code>@if(condition) { }</code> - Conditional rendering</li>
        <li><code>@each(item in items) { }</code> - List rendering</li>
        <li><code>{variable}</code> - Text interpolation</li>
      </ul>

      <h3>Slots (Content Projection)</h3>
      <p>Use slots to compose components with dynamic content:</p>
      <div class="code-block">
        <pre><code>// Card.pulse - Component with slots
@page Card

view {
  .card {
    .card-header {
      slot "header"   // Named slot
    }
    .card-body {
      slot           // Default slot
    }
    .card-footer {
      slot "footer" {
        // Fallback content if no footer provided
        p "Default footer"
      }
    }
  }
}

// Usage in another component
import Card from './Card.pulse'

view {
  Card {
    // Default slot content
    p "Card body content"
  }
}</code></pre>
      </div>

      <h3>CSS Scoping</h3>
      <p>Styles in <code>.pulse</code> files are automatically scoped to the component, preventing style leaks:</p>
      <div class="code-block">
        <pre><code>style {
  // These styles only affect this component
  .button { background: blue }
  .title { font-size: 24px }
}

// Compiled output adds unique scope class:
// .button.p8x3k2 { background: blue }
// .title.p8x3k2 { font-size: 24px }</code></pre>
      </div>

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

    <section class="doc-section">
      <h2>Advanced Routing</h2>
      <p>Pulse router supports lazy loading, middleware, and code splitting for optimal performance.</p>

      <h3>Lazy Loading</h3>
      <p>Load route components on demand to reduce initial bundle size:</p>
      <div class="code-block">
        <pre><code>import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

const routes = {
  '/': HomePage,
  // Lazy load heavy components
  '/dashboard': lazy(() => import('./Dashboard.js')),
  '/settings': lazy(() => import('./Settings.js'), {
    loading: () => el('div.spinner', 'Loading...'),
    error: (err) => el('div.error', \`Error: \${err.message}\`),
    timeout: 5000
  })
};

// Preload on hover for instant navigation
link.addEventListener('mouseenter', () => preload(routes['/dashboard']));</code></pre>
      </div>

      <h3>Middleware</h3>
      <p>Koa-style middleware for flexible navigation control:</p>
      <div class="code-block">
        <pre><code>const router = createRouter({
  routes,
  middleware: [
    // Authentication check
    async (ctx, next) => {
      if (ctx.to.meta.requiresAuth && !isLoggedIn()) {
        return ctx.redirect('/login');
      }
      await next();
    },
    // Analytics logging
    async (ctx, next) => {
      const start = Date.now();
      await next();
      analytics.track('navigation', {
        path: ctx.to.path,
        duration: Date.now() - start
      });
    }
  ]
});

// Add/remove middleware dynamically
const unsubscribe = router.use(async (ctx, next) => {
  ctx.meta.timestamp = Date.now();
  await next();
});</code></pre>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/api-reference')">
        Next: API Reference →
      </button>
    </div>
  `;

  return page;
}
