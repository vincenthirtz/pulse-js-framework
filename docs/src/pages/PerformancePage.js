/**
 * Pulse Documentation - Performance Guide
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function PerformancePage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('performance.title')}</h1>
    <p class="intro">${t('performance.intro')}</p>

    <section class="doc-section">
      <h2>${t('performance.lazyComputed')}</h2>
      <p>By default, computed values evaluate eagerly. Use lazy evaluation for expensive computations that aren't always needed:</p>

      <div class="code-block">
        <pre><code>import { computed } from 'pulse-js-framework';

// EAGER (default): Computes immediately when dependencies change
const expensiveResult = computed(() => {
  return heavyComputation(data.get());
});

// LAZY: Only computes when .get() is called
const lazyResult = computed(() => {
  return heavyComputation(data.get());
}, { lazy: true });

// Use lazy for:
// - Expensive computations not always displayed
// - Values only needed in certain routes
// - Conditional UI elements</code></pre>
      </div>

      <h3>When to Use Lazy</h3>
      <table class="doc-table">
        <caption>When to use lazy evaluation for computed values</caption>
        <thead>
          <tr>
            <th scope="col">Scenario</th>
            <th scope="col">Use Lazy?</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Always-visible UI</td>
            <td>No</td>
            <td>Eager keeps UI responsive</td>
          </tr>
          <tr>
            <td>Modal/dialog content</td>
            <td>Yes</td>
            <td>Only compute when opened</td>
          </tr>
          <tr>
            <td>Search/filter results</td>
            <td>Depends</td>
            <td>Lazy if triggered by button</td>
          </tr>
          <tr>
            <td>Analytics/stats</td>
            <td>Yes</td>
            <td>Often not viewed immediately</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2>${t('performance.listKeying')}</h2>
      <p>Proper keying is critical for list performance. The key function determines how Pulse tracks items across updates.</p>

      <h3>Good vs Bad Keys</h3>
      <div class="code-block">
        <pre><code>import { list } from 'pulse-js-framework';

// BAD: Index as key (O(n) re-renders on reorder)
list(items, (item, index) => el('li', item.name));
// Default keyFn is (item, i) => i

// BAD: Unstable keys (re-creates DOM on every update)
list(items,
  item => el('li', item.name),
  item => Math.random()  // Never do this!
);

// GOOD: Stable unique identifier
list(items,
  item => el('li', item.name),
  item => item.id  // Stable key
);

// GOOD: Composite key for nested data
list(items,
  item => el('li', item.name),
  item => \`\${item.type}-\${item.id}\`
);</code></pre>
      </div>

      <h3>Performance Impact</h3>
      <div class="code-block">
        <pre><code>// With index keys: Prepending an item re-renders ALL items
items: [A, B, C] -> [X, A, B, C]
// DOM: Remove C, update B->C, update A->B, insert X
// Operations: n

// With stable keys: Only inserts new item
items: [A, B, C] -> [X, A, B, C]
// DOM: Insert X before A
// Operations: 1</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.batching')}</h2>
      <p>Batch multiple state changes to avoid intermediate re-renders:</p>

      <div class="code-block">
        <pre><code>import { batch } from 'pulse-js-framework';

// BAD: 3 effect runs, 3 potential re-renders
name.set('John');
age.set(30);
email.set('john@example.com');

// GOOD: 1 effect run, 1 re-render
batch(() => {
  name.set('John');
  age.set(30);
  email.set('john@example.com');
});

// Batches can be nested (effects run at outermost batch end)
batch(() => {
  name.set('John');
  batch(() => {
    age.set(30);
    email.set('john@example.com');
  });
  // Effects haven't run yet
});
// All effects run here</code></pre>
      </div>

      <h3>Automatic Batching</h3>
      <div class="code-block">
        <pre><code>// Event handlers are NOT auto-batched
button.onclick = () => {
  // Wrap in batch for multiple updates
  batch(() => {
    count.set(count.get() + 1);
    lastClicked.set(Date.now());
  });
};

// Async callbacks need explicit batching
async function loadData() {
  const data = await fetch('/api/data').then(r => r.json());
  batch(() => {
    items.set(data.items);
    total.set(data.total);
    loading.set(false);
  });
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.memoization')}</h2>
      <p>Cache expensive computations to avoid redundant work:</p>

      <div class="code-block">
        <pre><code>import { memo, memoComputed } from 'pulse-js-framework';

// memo: Cache function results
const expensiveCalc = memo((input) => {
  // Only runs if input changed
  return heavyComputation(input);
});

// Call multiple times - cached
expensiveCalc(data);  // Computes
expensiveCalc(data);  // Returns cached
expensiveCalc(other); // Computes (different input)

// memoComputed: Memo + reactive tracking
const filteredItems = memoComputed(
  () => [searchTerm.get(), items.get()],
  ([term, items]) => items.filter(i => i.name.includes(term))
);

// Custom equality for complex objects
const result = memo(
  (obj) => processObject(obj),
  { equals: (a, b) => a.id === b.id }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.lazyRoutes')}</h2>
      <p>Split your app into chunks loaded on demand:</p>

      <div class="code-block">
        <pre><code>import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    // Eager: Loaded with main bundle
    '/': HomePage,

    // Lazy: Loaded when route is visited
    '/dashboard': lazy(() => import('./pages/Dashboard.js')),

    // Lazy with loading UI
    '/reports': lazy(
      () => import('./pages/Reports.js'),
      {
        loading: () => el('.spinner', 'Loading...'),
        timeout: 10000,
        error: (err) => el('.error', 'Failed to load')
      }
    ),

    // Lazy with minimum delay (avoid flash)
    '/settings': lazy(
      () => import('./pages/Settings.js'),
      { loadingDelay: 200 }  // Show loading after 200ms
    )
  }
});

// Preload on hover for faster navigation
link.onmouseenter = () => {
  preload(lazy(() => import('./pages/Dashboard.js')));
};</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.avoidReactivity')}</h2>
      <p>Not everything needs to be reactive:</p>

      <div class="code-block">
        <pre><code>// BAD: Static config as pulse (overhead for no benefit)
const config = pulse({
  apiUrl: 'https://api.example.com',
  timeout: 5000
});

// GOOD: Plain object for static data
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};

// BAD: Creating pulses in loops
items.forEach(item => {
  const selected = pulse(false);  // Creates many pulses!
});

// GOOD: Single pulse with selection state
const selectedIds = pulse(new Set());
function isSelected(id) {
  return selectedIds.get().has(id);
}

// Use peek() when you don't need reactivity
effect(() => {
  const items = data.get();  // Tracks
  const config = options.peek();  // Doesn't track
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.effectOptimization')}</h2>
      <p>Keep effects fast and focused:</p>

      <div class="code-block">
        <pre><code>// BAD: Too many dependencies, runs too often
effect(() => {
  const user = userPulse.get();
  const items = itemsPulse.get();
  const settings = settingsPulse.get();

  // Runs when ANY of these change
  updateUI(user, items, settings);
});

// GOOD: Split into focused effects
effect(() => {
  updateUserUI(userPulse.get());
});

effect(() => {
  updateItemsList(itemsPulse.get());
});

// GOOD: Debounce expensive operations
import { debounce } from 'pulse-js-framework/runtime/utils';

const debouncedSearch = debounce((term) => {
  performSearch(term);
}, 300);

effect(() => {
  debouncedSearch(searchTerm.get());
});

// GOOD: Use onCleanup for proper cleanup
effect(() => {
  const timer = setInterval(() => tick(), 1000);

  onCleanup(() => clearInterval(timer));
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.resourceCaching')}</h2>
      <p>Use the async module's caching features:</p>

      <div class="code-block">
        <pre><code>import { useResource, clearResourceCache } from 'pulse-js-framework/runtime/async';

// Automatic caching with stale-while-revalidate
const users = useResource(
  'users-list',  // Cache key
  () => fetch('/api/users').then(r => r.json()),
  {
    staleTime: 60000,     // Fresh for 1 minute
    cacheTime: 300000,    // Keep in cache for 5 minutes
    refreshOnFocus: true  // Refresh when tab regains focus
  }
);

// Dynamic cache keys for parameterized data
const userId = pulse(1);
const user = useResource(
  () => \`user-\${userId.get()}\`,  // Key changes with userId
  () => fetch(\`/api/users/\${userId.get()}\`).then(r => r.json())
);

// Optimistic updates
function updateUserName(newName) {
  user.mutate(
    current => ({ ...current, name: newName }),
    true  // Revalidate after mutation
  );
}

// Clear cache when needed
clearResourceCache();  // Clear all
user.invalidate();     // Invalidate specific resource</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.monitoring')}</h2>
      <p>Use the devtools module to monitor performance:</p>

      <div class="code-block">
        <pre><code>import {
  enableDevTools,
  getDiagnostics,
  getEffectStats,
  profile,
  mark
} from 'pulse-js-framework/runtime/devtools';

// Enable in development
if (import.meta.env.DEV) {
  enableDevTools({ warnOnSlowEffects: true });
}

// Profile expensive operations
const result = profile('data-processing', () => {
  return processLargeDataset(data);
});
// Logs: [Profile] data-processing: 45.23ms

// Mark durations
const m = mark('render');
renderComplexUI();
m.end();  // Logs duration

// Check diagnostics
const stats = getDiagnostics();
console.log('Active pulses:', stats.pulseCount);
console.log('Effect runs:', stats.totalEffectRuns);
console.log('Avg effect time:', stats.avgEffectTime.toFixed(2), 'ms');

// Find slow effects
const effects = getEffectStats();
const slowEffects = effects
  .filter(e => e.avgTime > 16)  // Slower than 1 frame
  .sort((a, b) => b.avgTime - a.avgTime);
console.table(slowEffects);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('performance.checklist')}</h2>
      <table class="doc-table">
        <caption>Performance optimization checklist</caption>
        <thead>
          <tr>
            <th scope="col">Optimization</th>
            <th scope="col">Impact</th>
            <th scope="col">When to Apply</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Stable list keys</td>
            <td>High</td>
            <td>Always for dynamic lists</td>
          </tr>
          <tr>
            <td>Batch updates</td>
            <td>High</td>
            <td>Multiple state changes together</td>
          </tr>
          <tr>
            <td>Lazy routes</td>
            <td>High</td>
            <td>Large apps with many pages</td>
          </tr>
          <tr>
            <td>Lazy computed</td>
            <td>Medium</td>
            <td>Expensive, conditionally-used values</td>
          </tr>
          <tr>
            <td>Memoization</td>
            <td>Medium</td>
            <td>Repeated expensive calculations</td>
          </tr>
          <tr>
            <td>Effect splitting</td>
            <td>Medium</td>
            <td>Effects with many dependencies</td>
          </tr>
          <tr>
            <td>Resource caching</td>
            <td>Medium</td>
            <td>Repeated API calls</td>
          </tr>
          <tr>
            <td>Debouncing</td>
            <td>Medium</td>
            <td>User input, search, resize</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handler programmatically for navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary', t('performance.nextErrorHandling'));
  nextBtn.onclick = () => navigateLocale('/error-handling');
  nextSection.appendChild(nextBtn);

  return page;
}
