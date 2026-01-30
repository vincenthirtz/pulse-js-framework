/**
 * Pulse Documentation - API Reference Page
 */

import { el } from '/runtime/index.js';

export function ApiReferencePage() {
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

      <div class="api-item">
        <h3><code>onCleanup(fn)</code></h3>
        <p>Registers a cleanup function within an effect. Runs when the effect re-executes or is disposed.</p>
        <div class="code-block">
          <pre><code>effect(() => {
  const interval = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(interval));
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>memo(fn, options?)</code></h3>
        <p>Memoizes a function - caches results based on arguments.</p>
        <div class="code-block">
          <pre><code>const expensive = memo((a, b) => {
  // Only computed when args change
  return heavyCalculation(a, b);
});

expensive(1, 2); // Computes
expensive(1, 2); // Returns cached</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>createState(obj)</code></h3>
        <p>Creates a reactive state object. Arrays get special helper methods.</p>
        <div class="code-block">
          <pre><code>const state = createState({
  count: 0,
  items: ['a', 'b', 'c']
});

state.count++;          // Reactive
state.items$push('d');  // ['a', 'b', 'c', 'd']
state.items$pop();      // Returns 'd'
state.items$filter(x => x !== 'b');</code></pre>
        </div>
        <p><strong>Array helpers:</strong> <code>$push</code>, <code>$pop</code>, <code>$shift</code>, <code>$unshift</code>, <code>$splice</code>, <code>$filter</code>, <code>$map</code>, <code>$sort</code></p>
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

      <div class="api-item">
        <h3><code>show(condition, element)</code></h3>
        <p>Toggle element visibility without removing from DOM (preserves state).</p>
        <div class="code-block">
          <pre><code>const panel = el('.panel', 'Content');
show(() => isVisible.get(), panel);</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>portal(children, target)</code></h3>
        <p>Renders children into a different DOM location (useful for modals).</p>
        <div class="code-block">
          <pre><code>// Render modal at document body
portal(
  () => el('.modal', 'Modal content'),
  document.body
);</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>errorBoundary(children, fallback)</code></h3>
        <p>Catches errors in child components and displays fallback.</p>
        <div class="code-block">
          <pre><code>errorBoundary(
  () => RiskyComponent(),
  (error) => el('.error', \`Error: \${error.message}\`)
);</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>onMount(fn)</code> / <code>onUnmount(fn)</code></h3>
        <p>Lifecycle hooks for component setup and cleanup.</p>
        <div class="code-block">
          <pre><code>const MyComponent = component(({ onMount, onUnmount }) => {
  onMount(() => console.log('Mounted!'));
  onUnmount(() => console.log('Unmounted!'));
  return el('.my-component');
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>transition(element, options)</code></h3>
        <p>Apply enter/exit animations to elements.</p>
        <div class="code-block">
          <pre><code>transition(el('.card'), {
  enter: 'fade-in',
  exit: 'fade-out',
  duration: 300
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>whenTransition(condition, then, else, options)</code></h3>
        <p>Conditional rendering with animations.</p>
        <div class="code-block">
          <pre><code>whenTransition(
  () => showModal.get(),
  () => el('.modal', 'Content'),
  null,
  { duration: 200, enterClass: 'slide-in', exitClass: 'slide-out' }
);</code></pre>
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
      <button class="btn btn-primary" onclick="window.docs.navigate('/mobile')">
        Next: Mobile Apps →
      </button>
    </div>
  `;

  return page;
}
