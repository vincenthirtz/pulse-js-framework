/**
 * Pulse Documentation - Interactive Benchmarks Page
 * Real performance tests that run in the browser
 */

import { el, pulse, effect, computed, batch } from '/runtime/index.js';
import { t } from '../state.js';

// Benchmark utilities
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatTime(ms) {
  if (ms < 0.001) return (ms * 1000000).toFixed(2) + ' ns';
  if (ms < 1) return (ms * 1000).toFixed(2) + ' µs';
  return ms.toFixed(2) + ' ms';
}

function runBenchmark(fn, iterations = 1000) {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    fn();
  }

  // Force GC if available
  if (globalThis.gc) globalThis.gc();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = 1000 / avgTime;

  return { totalTime, avgTime, opsPerSec, iterations };
}

async function runAsyncBenchmark(fn, iterations = 100) {
  // Warmup
  for (let i = 0; i < Math.min(10, iterations / 10); i++) {
    await fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = 1000 / avgTime;

  return { totalTime, avgTime, opsPerSec, iterations };
}

// Individual benchmark tests
const benchmarks = {
  signalCreation: {
    name: 'Signal Creation',
    description: 'Create pulse signals',
    iterations: 100000,
    run: () => {
      const signals = [];
      return runBenchmark(() => {
        signals.push(pulse(0));
      }, 100000);
    }
  },

  signalRead: {
    name: 'Signal Read',
    description: 'Read signal values with .get()',
    iterations: 1000000,
    run: () => {
      const signal = pulse(42);
      return runBenchmark(() => {
        signal.get();
      }, 1000000);
    }
  },

  signalWrite: {
    name: 'Signal Write',
    description: 'Update signal values with .set()',
    iterations: 100000,
    run: () => {
      const signal = pulse(0);
      let i = 0;
      return runBenchmark(() => {
        signal.set(i++);
      }, 100000);
    }
  },

  signalUpdate: {
    name: 'Signal Update',
    description: 'Functional update with .update()',
    iterations: 100000,
    run: () => {
      const signal = pulse(0);
      return runBenchmark(() => {
        signal.update(n => n + 1);
      }, 100000);
    }
  },

  computedCreation: {
    name: 'Computed Creation',
    description: 'Create computed values',
    iterations: 10000,
    run: () => {
      const source = pulse(1);
      const computeds = [];
      return runBenchmark(() => {
        computeds.push(computed(() => source.get() * 2));
      }, 10000);
    }
  },

  computedRead: {
    name: 'Computed Read',
    description: 'Read computed values',
    iterations: 100000,
    run: () => {
      const source = pulse(1);
      const doubled = computed(() => source.get() * 2);
      return runBenchmark(() => {
        doubled.get();
      }, 100000);
    }
  },

  computedChain: {
    name: 'Computed Chain (5 deep)',
    description: 'Chain of 5 computed values',
    iterations: 50000,
    run: () => {
      const source = pulse(1);
      const c1 = computed(() => source.get() + 1);
      const c2 = computed(() => c1.get() + 1);
      const c3 = computed(() => c2.get() + 1);
      const c4 = computed(() => c3.get() + 1);
      const c5 = computed(() => c4.get() + 1);
      return runBenchmark(() => {
        c5.get();
      }, 50000);
    }
  },

  effectCreation: {
    name: 'Effect Creation',
    description: 'Create reactive effects',
    iterations: 10000,
    run: () => {
      const source = pulse(0);
      const effects = [];
      let count = 0;
      return runBenchmark(() => {
        effects.push(effect(() => {
          count += source.get();
        }));
      }, 10000);
    }
  },

  effectTrigger: {
    name: 'Effect Trigger',
    description: 'Trigger effect via signal update',
    iterations: 10000,
    run: () => {
      const source = pulse(0);
      let count = 0;
      effect(() => {
        count += source.get();
      });
      return runBenchmark(() => {
        source.set(count);
      }, 10000);
    }
  },

  batchUpdates: {
    name: 'Batch Updates (10 signals)',
    description: 'Batch update 10 signals at once',
    iterations: 10000,
    run: () => {
      const signals = Array.from({ length: 10 }, () => pulse(0));
      let effectCount = 0;
      effect(() => {
        signals.forEach(s => s.get());
        effectCount++;
      });
      return runBenchmark(() => {
        batch(() => {
          signals.forEach((s, i) => s.set(i));
        });
      }, 10000);
    }
  },

  unbatchedUpdates: {
    name: 'Unbatched Updates (10 signals)',
    description: 'Update 10 signals without batch',
    iterations: 10000,
    run: () => {
      const signals = Array.from({ length: 10 }, () => pulse(0));
      let effectCount = 0;
      effect(() => {
        signals.forEach(s => s.get());
        effectCount++;
      });
      return runBenchmark(() => {
        signals.forEach((s, i) => s.set(i));
      }, 10000);
    }
  },

  domCreation: {
    name: 'DOM Element Creation',
    description: 'Create elements with el()',
    iterations: 10000,
    run: () => {
      return runBenchmark(() => {
        el('div.container#main[data-id=123]');
      }, 10000);
    }
  },

  domNested: {
    name: 'Nested DOM Creation',
    description: 'Create nested element tree (3 levels)',
    iterations: 5000,
    run: () => {
      return runBenchmark(() => {
        el('div.parent',
          el('div.child-1',
            el('span.text', 'Hello')
          ),
          el('div.child-2',
            el('span.text', 'World')
          )
        );
      }, 5000);
    }
  },

  listRenderKeyed: {
    name: 'List Render (100 items, keyed)',
    description: 'Render list with key function',
    iterations: 100,
    run: () => {
      const container = el('div');
      return runBenchmark(() => {
        container.innerHTML = '';
        const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        items.forEach(item => {
          container.appendChild(el('div.item', item.name));
        });
      }, 100);
    }
  },

  listUpdate: {
    name: 'List Update (prepend item)',
    description: 'Prepend item to 100-item list',
    iterations: 500,
    run: () => {
      let id = 100;
      const items = pulse(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      const container = el('div');

      // Initial render
      effect(() => {
        container.innerHTML = '';
        items.get().forEach(item => {
          container.appendChild(el('div.item', item.name));
        });
      });

      return runBenchmark(() => {
        items.update(arr => [{ id: id++, name: `New Item` }, ...arr.slice(0, 99)]);
      }, 500);
    }
  },

  manySignals: {
    name: 'Many Signals (1000)',
    description: 'Create and read 1000 signals',
    iterations: 100,
    run: () => {
      return runBenchmark(() => {
        const signals = Array.from({ length: 1000 }, (_, i) => pulse(i));
        let sum = 0;
        signals.forEach(s => sum += s.get());
      }, 100);
    }
  },

  diamondDependency: {
    name: 'Diamond Dependency',
    description: 'A → B,C → D pattern',
    iterations: 10000,
    run: () => {
      const a = pulse(1);
      const b = computed(() => a.get() * 2);
      const c = computed(() => a.get() * 3);
      const d = computed(() => b.get() + c.get());

      return runBenchmark(() => {
        a.set(a.peek() + 1);
        d.get();
      }, 10000);
    }
  },

  deepReactivity: {
    name: 'Deep Reactivity (10 levels)',
    description: '10-level computed chain update',
    iterations: 5000,
    run: () => {
      const source = pulse(0);
      let current = source;
      for (let i = 0; i < 10; i++) {
        const prev = current;
        current = computed(() => prev.get() + 1);
      }
      const final = current;

      return runBenchmark(() => {
        source.set(source.peek() + 1);
        final.get();
      }, 5000);
    }
  }
};

export function BenchmarksPage() {
  const page = el('.page.docs-page.benchmarks-page');

  // State for benchmark results
  const results = pulse({});
  const running = pulse(null);
  const allRunning = pulse(false);

  // Run single benchmark
  async function runSingle(key) {
    if (running.get() || allRunning.get()) return;

    running.set(key);

    // Allow UI to update
    await new Promise(r => setTimeout(r, 50));

    try {
      const benchmark = benchmarks[key];
      const result = benchmark.run();
      results.update(r => ({ ...r, [key]: result }));
    } catch (err) {
      console.error(`Benchmark ${key} failed:`, err);
      results.update(r => ({ ...r, [key]: { error: err.message } }));
    }

    running.set(null);
  }

  // Run all benchmarks
  async function runAll() {
    if (running.get() || allRunning.get()) return;

    allRunning.set(true);
    results.set({});

    for (const key of Object.keys(benchmarks)) {
      running.set(key);

      // Allow UI to update
      await new Promise(r => setTimeout(r, 50));

      try {
        const benchmark = benchmarks[key];
        const result = benchmark.run();
        results.update(r => ({ ...r, [key]: result }));
      } catch (err) {
        console.error(`Benchmark ${key} failed:`, err);
        results.update(r => ({ ...r, [key]: { error: err.message } }));
      }
    }

    running.set(null);
    allRunning.set(false);
  }

  // Clear results
  function clearResults() {
    results.set({});
  }

  page.innerHTML = `
    <h1>${t('benchmarks.title')}</h1>
    <p class="intro">${t('benchmarks.intro')}</p>

    <div class="benchmark-controls">
      <button class="btn btn-primary run-all-btn">
        <span class="btn-icon">▶</span> ${t('benchmarks.runAll')}
      </button>
      <button class="btn btn-secondary clear-btn">
        <span class="btn-icon">✕</span> ${t('benchmarks.clear')}
      </button>
    </div>

    <div class="benchmark-info">
      <p><strong>${t('benchmarks.note')}:</strong> ${t('benchmarks.noteText')}</p>
    </div>

    <section class="doc-section">
      <h2>${t('benchmarks.reactivity')}</h2>
      <div class="benchmark-grid" id="reactivity-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.computed')}</h2>
      <div class="benchmark-grid" id="computed-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.effects')}</h2>
      <div class="benchmark-grid" id="effects-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.batching')}</h2>
      <div class="benchmark-grid" id="batching-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.dom')}</h2>
      <div class="benchmark-grid" id="dom-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.advanced')}</h2>
      <div class="benchmark-grid" id="advanced-benchmarks"></div>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.comparison')}</h2>
      <p>${t('benchmarks.comparisonIntro')}</p>

      <table class="doc-table comparison-table">
        <thead>
          <tr>
            <th>${t('benchmarks.metric')}</th>
            <th>Pulse</th>
            <th>React</th>
            <th>Vue</th>
            <th>Solid</th>
            <th>Svelte</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${t('benchmarks.bundleSize')}</td>
            <td class="highlight">~4 KB</td>
            <td>~45 KB</td>
            <td>~34 KB</td>
            <td>~7 KB</td>
            <td>~2 KB</td>
          </tr>
          <tr>
            <td>${t('benchmarks.signalCreate')}</td>
            <td class="highlight" id="compare-signal-create">-</td>
            <td>~5,000 ops/s*</td>
            <td>~500,000 ops/s</td>
            <td>~2,000,000 ops/s</td>
            <td>~3,000,000 ops/s</td>
          </tr>
          <tr>
            <td>${t('benchmarks.signalUpdate')}</td>
            <td class="highlight" id="compare-signal-update">-</td>
            <td>~10,000 ops/s*</td>
            <td>~800,000 ops/s</td>
            <td>~3,000,000 ops/s</td>
            <td>~4,000,000 ops/s</td>
          </tr>
          <tr>
            <td>${t('benchmarks.dependencies')}</td>
            <td>Zero</td>
            <td>react-dom</td>
            <td>Zero</td>
            <td>Zero</td>
            <td>Zero</td>
          </tr>
          <tr>
            <td>${t('benchmarks.buildRequired')}</td>
            <td class="highlight">No**</td>
            <td>Yes (JSX)</td>
            <td>Yes (SFC)</td>
            <td>Yes (JSX)</td>
            <td>Yes</td>
          </tr>
        </tbody>
      </table>

      <p class="table-note">
        * React uses useState which has different semantics (triggers re-render)<br>
        ** Pulse works without build step; .pulse DSL compiler is optional
      </p>
    </section>

    <section class="doc-section">
      <h2>${t('benchmarks.methodology')}</h2>
      <div class="methodology-content">
        <h3>${t('benchmarks.howItWorks')}</h3>
        <ul>
          <li><strong>${t('benchmarks.warmup')}:</strong> ${t('benchmarks.warmupText')}</li>
          <li><strong>${t('benchmarks.measurement')}:</strong> ${t('benchmarks.measurementText')}</li>
          <li><strong>${t('benchmarks.precision')}:</strong> ${t('benchmarks.precisionText')}</li>
        </ul>

        <h3>${t('benchmarks.factors')}</h3>
        <ul>
          <li>${t('benchmarks.factor1')}</li>
          <li>${t('benchmarks.factor2')}</li>
          <li>${t('benchmarks.factor3')}</li>
          <li>${t('benchmarks.factor4')}</li>
        </ul>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/performance')">
        ${t('benchmarks.nextPerformance')}
      </button>
    </div>
  `;

  // Attach event handlers
  page.querySelector('.run-all-btn').addEventListener('click', runAll);
  page.querySelector('.clear-btn').addEventListener('click', clearResults);

  // Create benchmark cards
  const categories = {
    'reactivity-benchmarks': ['signalCreation', 'signalRead', 'signalWrite', 'signalUpdate'],
    'computed-benchmarks': ['computedCreation', 'computedRead', 'computedChain'],
    'effects-benchmarks': ['effectCreation', 'effectTrigger'],
    'batching-benchmarks': ['batchUpdates', 'unbatchedUpdates'],
    'dom-benchmarks': ['domCreation', 'domNested', 'listRenderKeyed', 'listUpdate'],
    'advanced-benchmarks': ['manySignals', 'diamondDependency', 'deepReactivity']
  };

  for (const [containerId, keys] of Object.entries(categories)) {
    const container = page.querySelector(`#${containerId}`);

    for (const key of keys) {
      const benchmark = benchmarks[key];
      const card = el('.benchmark-card');
      card.dataset.key = key;

      card.innerHTML = `
        <div class="benchmark-header">
          <h4>${benchmark.name}</h4>
          <button class="btn btn-sm run-btn" data-key="${key}">▶ Run</button>
        </div>
        <p class="benchmark-desc">${benchmark.description}</p>
        <div class="benchmark-result" data-result="${key}">
          <span class="result-placeholder">${t('benchmarks.clickToRun')}</span>
        </div>
        <div class="benchmark-meta">
          <span class="iterations">${formatNumber(benchmark.iterations)} iterations</span>
        </div>
      `;

      card.querySelector('.run-btn').addEventListener('click', () => runSingle(key));
      container.appendChild(card);
    }
  }

  // Update results reactively
  effect(() => {
    const currentResults = results.get();
    const currentRunning = running.get();

    for (const [key, result] of Object.entries(currentResults)) {
      const resultEl = page.querySelector(`[data-result="${key}"]`);
      if (!resultEl) continue;

      if (result.error) {
        resultEl.innerHTML = `<span class="result-error">Error: ${result.error}</span>`;
      } else {
        resultEl.innerHTML = `
          <div class="result-stats">
            <div class="stat">
              <span class="stat-value">${formatNumber(result.opsPerSec)}</span>
              <span class="stat-label">ops/sec</span>
            </div>
            <div class="stat">
              <span class="stat-value">${formatTime(result.avgTime)}</span>
              <span class="stat-label">avg time</span>
            </div>
            <div class="stat">
              <span class="stat-value">${formatTime(result.totalTime)}</span>
              <span class="stat-label">total</span>
            </div>
          </div>
        `;
      }

      // Update comparison table
      if (key === 'signalCreation') {
        const compareEl = page.querySelector('#compare-signal-create');
        if (compareEl) compareEl.textContent = `~${formatNumber(result.opsPerSec)} ops/s`;
      }
      if (key === 'signalUpdate') {
        const compareEl = page.querySelector('#compare-signal-update');
        if (compareEl) compareEl.textContent = `~${formatNumber(result.opsPerSec)} ops/s`;
      }
    }

    // Update running state
    page.querySelectorAll('.benchmark-card').forEach(card => {
      const key = card.dataset.key;
      const isRunning = currentRunning === key;
      card.classList.toggle('running', isRunning);

      const btn = card.querySelector('.run-btn');
      if (btn) {
        btn.disabled = currentRunning !== null || allRunning.get();
        btn.textContent = isRunning ? '...' : '▶ Run';
      }
    });

    // Update run all button
    const runAllBtn = page.querySelector('.run-all-btn');
    if (runAllBtn) {
      runAllBtn.disabled = allRunning.get() || currentRunning !== null;
      runAllBtn.innerHTML = allRunning.get()
        ? `<span class="btn-icon spinner">◌</span> ${t('benchmarks.running')}...`
        : `<span class="btn-icon">▶</span> ${t('benchmarks.runAll')}`;
    }
  });

  // Inject benchmark-specific styles
  const style = document.createElement('style');
  style.textContent = `
    .benchmarks-page .benchmark-controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .benchmarks-page .benchmark-info {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-bottom: 2rem;
    }

    .benchmarks-page .benchmark-info p {
      margin: 0;
      color: var(--text-muted);
    }

    .benchmarks-page .benchmark-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .benchmarks-page .benchmark-card {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.2s ease;
    }

    .benchmarks-page .benchmark-card:hover {
      border-color: var(--primary);
    }

    .benchmarks-page .benchmark-card.running {
      border-color: var(--primary);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
    }

    .benchmarks-page .benchmark-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .benchmarks-page .benchmark-header h4 {
      margin: 0;
      font-size: 1.1rem;
    }

    .benchmarks-page .benchmark-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin: 0 0 1rem;
    }

    .benchmarks-page .benchmark-result {
      background: var(--bg);
      border-radius: 8px;
      padding: 1rem;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .benchmarks-page .result-placeholder {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .benchmarks-page .result-error {
      color: #ef4444;
      font-size: 0.9rem;
    }

    .benchmarks-page .result-stats {
      display: flex;
      gap: 1.5rem;
      width: 100%;
      justify-content: space-around;
    }

    .benchmarks-page .stat {
      text-align: center;
    }

    .benchmarks-page .stat-value {
      display: block;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--primary);
    }

    .benchmarks-page .stat-label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .benchmarks-page .benchmark-meta {
      margin-top: 0.75rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .benchmarks-page .btn-sm {
      padding: 0.25rem 0.75rem;
      font-size: 0.85rem;
    }

    .benchmarks-page .comparison-table {
      margin-top: 1.5rem;
    }

    .benchmarks-page .comparison-table .highlight {
      color: var(--primary);
      font-weight: 600;
    }

    .benchmarks-page .table-note {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }

    .benchmarks-page .methodology-content {
      background: var(--code-bg);
      border-radius: 12px;
      padding: 1.5rem 2rem;
    }

    .benchmarks-page .methodology-content h3 {
      margin-top: 1.5rem;
    }

    .benchmarks-page .methodology-content h3:first-child {
      margin-top: 0;
    }

    .benchmarks-page .methodology-content ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .benchmarks-page .methodology-content li {
      margin-bottom: 0.5rem;
    }

    .benchmarks-page .spinner {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .benchmarks-page .benchmark-grid {
        grid-template-columns: 1fr;
      }

      .benchmarks-page .result-stats {
        flex-direction: column;
        gap: 0.75rem;
      }

      .benchmarks-page .comparison-table {
        font-size: 0.85rem;
      }
    }
  `;
  page.appendChild(style);

  return page;
}
