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
      <button class="btn btn-primary" onclick="window.docs.navigate('/api-reference')">
        Next: API Reference →
      </button>
    </div>
  `;

  return page;
}
