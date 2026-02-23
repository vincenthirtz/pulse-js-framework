/**
 * Pulse Async Patterns Demo
 * Demonstrates useAsync, useResource (SWR), usePolling,
 * createVersionedAsync for race conditions, and error/retry patterns.
 */

import { pulse, effect, computed, el, mount, list, when } from '../../../runtime/index.js';
import {
  useAsync, useResource, usePolling, createVersionedAsync
} from '../../../runtime/async.js';

// ── Mock API ──────────────────────────────────────────────────
// Simulates network requests with configurable delay and failure

let requestCount = 0;

function mockFetch(url, { delay = 500, failRate = 0 } = {}) {
  requestCount++;
  const id = requestCount;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new Error(`Request #${id} failed (simulated)`));
        return;
      }

      if (url === '/api/users') {
        resolve([
          { id: 1, name: 'Alice', email: 'alice@example.com', status: 'online' },
          { id: 2, name: 'Bob', email: 'bob@example.com', status: 'away' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', status: 'offline' },
          { id: 4, name: 'Diana', email: 'diana@example.com', status: Math.random() > 0.5 ? 'online' : 'away' }
        ]);
      } else if (url.startsWith('/api/users/')) {
        const userId = parseInt(url.split('/').pop());
        resolve({
          id: userId, name: ['Alice', 'Bob', 'Charlie', 'Diana'][userId - 1],
          email: `user${userId}@example.com`,
          bio: 'A passionate developer who loves building with Pulse.',
          joinedAt: '2025-06-15', posts: Math.floor(Math.random() * 50)
        });
      } else if (url === '/api/search') {
        resolve([
          { id: 1, title: 'Result A', score: 0.95 },
          { id: 2, title: 'Result B', score: 0.87 },
          { id: 3, title: 'Result C', score: 0.72 }
        ]);
      } else if (url === '/api/status') {
        resolve({
          uptime: Math.floor(Math.random() * 86400),
          requests: Math.floor(Math.random() * 10000),
          cpu: (Math.random() * 100).toFixed(1),
          memory: (Math.random() * 100).toFixed(1),
          timestamp: new Date().toISOString()
        });
      } else {
        resolve({ message: 'OK' });
      }
    }, delay);
  });
}

// ── State ─────────────────────────────────────────────────────
const activeSection = pulse('basic');

const sections = [
  { id: 'basic', label: 'useAsync' },
  { id: 'resource', label: 'useResource (SWR)' },
  { id: 'polling', label: 'usePolling' },
  { id: 'race', label: 'Race Conditions' },
  { id: 'retry', label: 'Error & Retry' }
];

// ══════════════════════════════════════════════════════════════
// 1. Basic useAsync
// ══════════════════════════════════════════════════════════════

function BasicAsyncSection() {
  const { data, loading, error, execute, reset, abort } = useAsync(
    () => mockFetch('/api/users', { delay: 800 }),
    { immediate: false, initialData: null }
  );

  return el('section',
    el('h2', 'useAsync - Basic Async Operations'),
    el('p', 'Wraps any async function with reactive loading, error, and data states.'),

    el('div.controls',
      el('button.primary', 'Fetch Users', { onclick: () => execute(), disabled: () => loading.get() }),
      el('button', 'Reset', { onclick: reset }),
      el('button', 'Abort', { onclick: abort, disabled: () => !loading.get() })
    ),

    // Loading state
    when(() => loading.get(), () =>
      el('div.loading', el('div.spinner'), el('span', 'Loading users...'))
    ),

    // Error state
    when(() => error.get(), () =>
      el('div.error', () => `Error: ${error.get()?.message}`)
    ),

    // Data
    when(() => data.get() && !loading.get(), () =>
      el('div.data-table',
        el('table',
          el('thead', el('tr',
            el('th', 'Name'), el('th', 'Email'), el('th', 'Status')
          )),
          el('tbody',
            data.get().map(user =>
              el('tr',
                el('td', user.name),
                el('td', user.email),
                el('td', el('span.status', { class: user.status }, user.status))
              )
            )
          )
        )
      )
    ),

    el('div.code-hint',
      el('h4', 'Code'),
      el('pre', el('code',
`const { data, loading, error, execute, reset, abort } =
  useAsync(
    () => fetch('/api/users').then(r => r.json()),
    { immediate: false, initialData: null }
  );`
      ))
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 2. useResource (SWR Pattern)
// ══════════════════════════════════════════════════════════════

function ResourceSection() {
  const userId = pulse(1);

  // SWR: shows stale data instantly, refreshes in background
  const user = useResource(
    () => `user-${userId.get()}`,
    () => mockFetch(`/api/users/${userId.get()}`, { delay: 600 }),
    {
      staleTime: 3000,
      refreshOnFocus: true,
      cacheTime: 60000
    }
  );

  return el('section',
    el('h2', 'useResource - SWR Pattern'),
    el('p', 'Stale-While-Revalidate: shows cached data instantly while fetching fresh data in the background.'),

    el('div.controls',
      el('span', 'Select User:'),
      [1, 2, 3, 4].map(id =>
        el('button', `User ${id}`, {
          class: () => userId.get() === id ? 'active' : '',
          onclick: () => userId.set(id)
        })
      ),
      el('button', 'Refresh', { onclick: () => user.execute() })
    ),

    when(() => user.loading.get() && !user.data.get(), () =>
      el('div.loading', el('div.spinner'), el('span', 'Loading...'))
    ),

    when(() => user.data.get(), () => {
      const u = user.data.get();
      return el('div.user-card', {
        class: () => user.loading.get() ? 'refreshing' : ''
      },
        when(() => user.loading.get(), () =>
          el('div.refresh-indicator', 'Refreshing...')
        ),
        el('h3', u.name),
        el('p', u.email),
        el('p', u.bio),
        el('div.user-stats',
          el('span', `Joined: ${u.joinedAt}`),
          el('span', `Posts: ${u.posts}`)
        )
      );
    }),

    el('div.code-hint',
      el('h4', 'Code'),
      el('pre', el('code',
`const user = useResource(
  () => \`user-\${userId.get()}\`,  // Dynamic cache key
  () => fetch(\`/api/users/\${userId.get()}\`).then(r => r.json()),
  {
    staleTime: 3000,       // Data fresh for 3s
    refreshOnFocus: true,  // Refresh when tab gains focus
    cacheTime: 60000       // Keep in cache for 60s
  }
);`
      ))
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 3. usePolling - Live Data
// ══════════════════════════════════════════════════════════════

function PollingSection() {
  const { data, start, stop, isPolling } = usePolling(
    () => mockFetch('/api/status', { delay: 200 }),
    {
      interval: 2000,
      pauseOnHidden: true,
      pauseOnOffline: true,
      maxErrors: 3
    }
  );

  return el('section',
    el('h2', 'usePolling - Live Data'),
    el('p', 'Poll an endpoint at regular intervals. Automatically pauses when the tab is hidden or the device goes offline.'),

    el('div.controls',
      el('button.primary', () => isPolling.get() ? 'Stop Polling' : 'Start Polling', {
        onclick: () => isPolling.get() ? stop() : start()
      }),
      el('span.poll-status', () => isPolling.get() ? 'Polling every 2s' : 'Stopped')
    ),

    when(() => data.get(), () => {
      const s = data.get();
      return el('div.status-grid',
        el('div.stat',
          el('div.stat-label', 'Uptime'),
          el('div.stat-value', `${Math.floor(s.uptime / 3600)}h ${Math.floor((s.uptime % 3600) / 60)}m`)
        ),
        el('div.stat',
          el('div.stat-label', 'Requests'),
          el('div.stat-value', s.requests.toLocaleString())
        ),
        el('div.stat',
          el('div.stat-label', 'CPU'),
          el('div.stat-value', { class: () => parseFloat(s.cpu) > 80 ? 'high' : '' }, `${s.cpu}%`)
        ),
        el('div.stat',
          el('div.stat-label', 'Memory'),
          el('div.stat-value', { class: () => parseFloat(s.memory) > 80 ? 'high' : '' }, `${s.memory}%`)
        ),
        el('div.stat.wide',
          el('div.stat-label', 'Last Update'),
          el('div.stat-value.small', s.timestamp)
        )
      );
    }),

    el('div.code-hint',
      el('h4', 'Code'),
      el('pre', el('code',
`const { data, start, stop, isPolling } = usePolling(
  () => fetch('/api/status').then(r => r.json()),
  {
    interval: 2000,         // Poll every 2s
    pauseOnHidden: true,    // Pause when tab hidden
    pauseOnOffline: true,   // Pause when offline
    maxErrors: 3            // Stop after 3 consecutive errors
  }
);`
      ))
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 4. Race Condition Handling
// ══════════════════════════════════════════════════════════════

function RaceConditionSection() {
  const query = pulse('');
  const results = pulse([]);
  const searchLoading = pulse(false);
  const droppedCount = pulse(0);

  const controller = createVersionedAsync();

  async function search(q) {
    if (!q.trim()) { results.set([]); return; }
    searchLoading.set(true);

    const ctx = controller.begin();
    // Simulate variable network delay (300-1000ms)
    const data = await mockFetch('/api/search', { delay: 300 + Math.random() * 700 });

    ctx.ifCurrent(() => {
      results.set(data.map(r => ({ ...r, title: `${r.title} for "${q}"` })));
      searchLoading.set(false);
    });
    // If not current, this was a stale request
    if (!ctx.isCurrent()) {
      droppedCount.update(n => n + 1);
    }
  }

  // Debounced search
  let debounceTimer;
  function handleInput(e) {
    query.set(e.target.value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(e.target.value), 150);
  }

  return el('section',
    el('h2', 'Race Condition Handling'),
    el('p', 'Type quickly to trigger overlapping requests. Only the latest result is used; stale responses are discarded.'),

    el('div.search-box',
      el('input[type=text][placeholder=Type to search...]', {
        value: () => query.get(),
        oninput: handleInput,
        'aria-label': 'Search query'
      }),
      when(() => searchLoading.get(), () => el('span.search-spinner'))
    ),

    el('p.stats', () =>
      `Stale responses dropped: ${droppedCount.get()}`
    ),

    when(() => results.get().length > 0, () =>
      el('div.search-results',
        list(
          () => results.get(),
          (r) => el('div.result-item',
            el('span.result-title', r.title),
            el('span.result-score', `Score: ${r.score}`)
          ),
          (r) => r.id
        )
      )
    ),

    el('div.code-hint',
      el('h4', 'Code'),
      el('pre', el('code',
`const controller = createVersionedAsync();

async function search(query) {
  const ctx = controller.begin(); // Invalidates previous
  const results = await api.search(query);

  ctx.ifCurrent(() => {
    // Only runs if this is still the latest request
    setResults(results);
  });
}`
      ))
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 5. Error & Retry
// ══════════════════════════════════════════════════════════════

function RetrySection() {
  const failRate = pulse(0.5);

  const { data, loading, error, execute, reset } = useAsync(
    () => mockFetch('/api/users', { delay: 500, failRate: failRate.get() }),
    {
      immediate: false,
      retries: 3,
      retryDelay: 500,
      onSuccess: () => console.log('Request succeeded'),
      onError: (err) => console.log('All retries failed:', err.message)
    }
  );

  return el('section',
    el('h2', 'Error Handling & Retry'),
    el('p', 'Configure automatic retries with exponential backoff. Adjust the failure rate to see retry behavior.'),

    el('div.controls',
      el('label', () => `Failure Rate: ${Math.round(failRate.get() * 100)}%`),
      el('input[type=range][min=0][max=100][step=10]', {
        value: () => String(failRate.get() * 100),
        oninput: (e) => failRate.set(parseInt(e.target.value) / 100),
        'aria-label': 'Failure rate percentage'
      }),
      el('button.primary', 'Fetch (3 retries)', { onclick: () => execute(), disabled: () => loading.get() }),
      el('button', 'Reset', { onclick: reset })
    ),

    when(() => loading.get(), () =>
      el('div.loading', el('div.spinner'), el('span', 'Loading (retrying on failure)...'))
    ),

    when(() => error.get(), () =>
      el('div.error',
        el('strong', 'All retries failed: '),
        el('span', () => error.get()?.message),
        el('button.retry-btn', 'Try Again', { onclick: () => execute() })
      )
    ),

    when(() => data.get() && !loading.get(), () =>
      el('div.success', `Loaded ${data.get().length} users successfully!`)
    ),

    el('div.code-hint',
      el('h4', 'Code'),
      el('pre', el('code',
`const { data, loading, error, execute } = useAsync(
  () => fetch('/api/users').then(r => r.json()),
  {
    immediate: false,
    retries: 3,          // Retry up to 3 times
    retryDelay: 1000,    // 1s between retries
    onSuccess: (data) => console.log('Got:', data),
    onError: (err) => console.error('Failed:', err)
  }
);`
      ))
    )
  );
}

// ── Navigation ────────────────────────────────────────────────
function Nav() {
  return el('nav',
    sections.map(s =>
      el('button', s.label, {
        class: () => activeSection.get() === s.id ? 'active' : '',
        onclick: () => activeSection.set(s.id)
      })
    )
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  return el('div.app',
    el('header',
      el('h1', 'Async Patterns'),
      el('p.subtitle', 'useAsync, SWR caching, polling & race conditions')
    ),
    Nav(),
    el('main',
      when(() => activeSection.get() === 'basic', BasicAsyncSection),
      when(() => activeSection.get() === 'resource', ResourceSection),
      when(() => activeSection.get() === 'polling', PollingSection),
      when(() => activeSection.get() === 'race', RaceConditionSection),
      when(() => activeSection.get() === 'retry', RetrySection)
    )
  );
}

mount('#app', App());
console.log('Pulse Async Patterns Demo loaded');
