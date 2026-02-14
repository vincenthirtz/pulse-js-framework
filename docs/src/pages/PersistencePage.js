/**
 * Pulse Documentation - Persistence Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function PersistencePage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="persistence.title">Persistence</h1>
    <p class="page-intro" data-i18n="persistence.intro">Automatically save and restore Pulse store state across page reloads using pluggable storage adapters. Supports localStorage, sessionStorage, IndexedDB, and an in-memory adapter for testing.</p>

    <section class="doc-section">
      <h2 data-i18n="persistence.quickStart">Quick Start</h2>
      <p data-i18n="persistence.quickStartDesc">Attach persistence to any Pulse store in three lines. State is automatically saved on every change (debounced) and can be restored on app startup.</p>
      <div class="code-block">
        <pre><code>import { createStore } from 'pulse-js-framework/runtime/store';
import {
  createLocalStorageAdapter, withPersistence
} from 'pulse-js-framework/runtime/persistence';

// 1. Create your store
const store = createStore({ theme: 'light', lang: 'en', count: 0 });

// 2. Create a storage adapter
const adapter = createLocalStorageAdapter();

// 3. Attach persistence
const { restore, clear, flush, dispose } = withPersistence(store, adapter, {
  key: 'my-app-settings'
});

// Restore previously saved state on startup
await restore();

// From now on, every store change is auto-saved (debounced).
store.theme.set('dark');   // Saved to localStorage after 100ms
store.count.set(42);       // Batched with the previous write</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.adapters">Storage Adapters</h2>
      <p data-i18n="persistence.adaptersDesc">Pulse ships with four built-in adapters. Each adapter implements the same async interface, so you can swap backends without changing application code.</p>

      <h3>createLocalStorageAdapter()</h3>
      <p data-i18n="persistence.localStorageDesc">The default choice for most applications. Data persists across tabs and browser restarts. Falls back to the memory adapter when localStorage is unavailable (e.g. SSR).</p>
      <div class="code-block">
        <pre><code>import { createLocalStorageAdapter } from 'pulse-js-framework/runtime/persistence';

const adapter = createLocalStorageAdapter();
// adapter.name === 'localStorage'

await adapter.setItem('key', { count: 1 });
const data = await adapter.getItem('key');  // { count: 1 }
await adapter.removeItem('key');
await adapter.clear();
const allKeys = await adapter.keys();</code></pre>
      </div>

      <h3>createSessionStorageAdapter()</h3>
      <p data-i18n="persistence.sessionStorageDesc">Same API as localStorage but data is cleared when the browser tab is closed. Useful for temporary session state like wizard progress or form drafts.</p>
      <div class="code-block">
        <pre><code>import { createSessionStorageAdapter } from 'pulse-js-framework/runtime/persistence';

const adapter = createSessionStorageAdapter();
// adapter.name === 'sessionStorage'

// Data survives page reloads but not tab close
await adapter.setItem('wizard-step', { step: 3, data: formValues });</code></pre>
      </div>

      <h3>createIndexedDBAdapter(options)</h3>
      <p data-i18n="persistence.indexedDBDesc">For large datasets that exceed localStorage limits (~5 MB). IndexedDB supports structured cloning, so complex objects are stored natively without JSON serialization overhead.</p>
      <div class="code-block">
        <pre><code>import { createIndexedDBAdapter } from 'pulse-js-framework/runtime/persistence';

const adapter = createIndexedDBAdapter({
  dbName: 'my-app',       // Database name (default: 'pulse-store')
  storeName: 'state',     // Object store name (default: 'state')
  version: 1              // Schema version (default: 1)
});
// adapter.name === 'IndexedDB'

// Stores large data without hitting localStorage size limits
await adapter.setItem('cache', largeDataset);</code></pre>
      </div>

      <h3>createMemoryAdapter()</h3>
      <p data-i18n="persistence.memoryDesc">In-memory Map-based adapter. Data is lost on page refresh. Ideal for unit tests and SSR environments where no real storage is available.</p>
      <div class="code-block">
        <pre><code>import { createMemoryAdapter } from 'pulse-js-framework/runtime/persistence';

const adapter = createMemoryAdapter();
// adapter.name === 'Memory'

// Perfect for tests - no side effects, no cleanup needed
await adapter.setItem('test-key', { count: 5 });
const data = await adapter.getItem('test-key');  // { count: 5 }</code></pre>
      </div>

      <h3>createPersistenceAdapter(type, options)</h3>
      <p data-i18n="persistence.factoryDesc">Factory function that creates an adapter by type name. Useful when the adapter type comes from configuration or user input.</p>
      <div class="code-block">
        <pre><code>import { createPersistenceAdapter } from 'pulse-js-framework/runtime/persistence';

// Create by name instead of importing individual factories
const adapter = createPersistenceAdapter('localStorage');
const idbAdapter = createPersistenceAdapter('indexedDB', {
  dbName: 'my-app',
  storeName: 'state'
});

// Supported types: 'localStorage', 'sessionStorage', 'indexedDB', 'memory'
// Throws PersistenceError for unknown types</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.withPersistence">withPersistence API</h2>
      <p data-i18n="persistence.withPersistenceDesc">The \`withPersistence()\` function connects a Pulse store to a storage adapter. It sets up an effect that watches all store values and auto-saves changes with configurable debouncing.</p>
      <div class="code-block">
        <pre><code>import { createStore } from 'pulse-js-framework/runtime/store';
import {
  createLocalStorageAdapter, withPersistence
} from 'pulse-js-framework/runtime/persistence';

const store = createStore({
  user: null,
  preferences: { theme: 'light', fontSize: 14 },
  lastVisited: '/'
});

const adapter = createLocalStorageAdapter();

const { restore, clear, flush, dispose } = withPersistence(store, adapter, {
  key: 'app-state',
  debounce: 200
});

// restore() - Load persisted state into the store
// Returns true if state was found and restored, false otherwise
const wasRestored = await restore();

// flush() - Force an immediate save, bypassing the debounce timer
// Useful before page unload or navigation
await flush();

// clear() - Remove persisted data from the adapter
await clear();

// dispose() - Stop auto-saving and clean up the effect
// Call this when the store is no longer needed
dispose();</code></pre>
      </div>

      <div class="info-box">
        <p><strong data-i18n="persistence.autoSaveNote">Auto-save behavior:</strong> <span data-i18n="persistence.autoSaveNoteDesc">Once \`withPersistence()\` is called, an effect tracks every pulse in the store. Any call to \`.set()\` or \`.update()\` schedules a debounced save. Multiple rapid changes are batched into a single write.</span></p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.options">Options Reference</h2>
      <p data-i18n="persistence.optionsDesc">All options for \`withPersistence()\` with their default values.</p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="persistence.option">Option</th>
              <th data-i18n="persistence.type">Type</th>
              <th data-i18n="persistence.default">Default</th>
              <th data-i18n="persistence.description">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>key</code></td>
              <td><code>string</code></td>
              <td><code>'pulse-store'</code></td>
              <td data-i18n="persistence.optKey">Storage key used to read and write the persisted state.</td>
            </tr>
            <tr>
              <td><code>debounce</code></td>
              <td><code>number</code></td>
              <td><code>100</code></td>
              <td data-i18n="persistence.optDebounce">Delay in milliseconds before writing to storage after a change. Multiple changes within this window are batched.</td>
            </tr>
            <tr>
              <td><code>include</code></td>
              <td><code>string[] | null</code></td>
              <td><code>null</code></td>
              <td data-i18n="persistence.optInclude">Whitelist of store keys to persist. When set, only these keys are saved. \`null\` means persist all keys.</td>
            </tr>
            <tr>
              <td><code>exclude</code></td>
              <td><code>string[] | null</code></td>
              <td><code>null</code></td>
              <td data-i18n="persistence.optExclude">Blacklist of store keys to skip. These keys are never persisted. \`null\` means no exclusions.</td>
            </tr>
            <tr>
              <td><code>serialize</code></td>
              <td><code>function</code></td>
              <td><code>JSON.stringify</code></td>
              <td data-i18n="persistence.optSerialize">Custom serializer function. Receives the store snapshot object and must return a string.</td>
            </tr>
            <tr>
              <td><code>deserialize</code></td>
              <td><code>function</code></td>
              <td><code>JSON.parse</code></td>
              <td data-i18n="persistence.optDeserialize">Custom deserializer function. Receives the raw string from storage and must return an object.</td>
            </tr>
            <tr>
              <td><code>maxDepth</code></td>
              <td><code>number</code></td>
              <td><code>10</code></td>
              <td data-i18n="persistence.optMaxDepth">Maximum nesting depth for sanitization. Deeply nested values beyond this depth are replaced with \`null\`.</td>
            </tr>
            <tr>
              <td><code>onError</code></td>
              <td><code>function | null</code></td>
              <td><code>null</code></td>
              <td data-i18n="persistence.optOnError">Callback invoked when a save, restore, or clear operation fails. Receives the error object.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.selective">Selective Persistence</h2>
      <p data-i18n="persistence.selectiveDesc">Use \`include\` and \`exclude\` to control which store keys are persisted. This is useful when your store contains transient UI state that should not survive page reloads.</p>

      <h3 data-i18n="persistence.includeExample">Include (whitelist)</h3>
      <div class="code-block">
        <pre><code>const store = createStore({
  user: null,
  theme: 'light',
  sidebarOpen: false,    // Transient UI state
  modalVisible: false    // Transient UI state
});

// Only persist user and theme - ignore UI state
withPersistence(store, adapter, {
  key: 'app-settings',
  include: ['user', 'theme']
});</code></pre>
      </div>

      <h3 data-i18n="persistence.excludeExample">Exclude (blacklist)</h3>
      <div class="code-block">
        <pre><code>const store = createStore({
  user: null,
  theme: 'light',
  token: 'secret-jwt',   // Sensitive - do not persist
  tempData: {}            // Temporary - do not persist
});

// Persist everything except sensitive and temporary data
withPersistence(store, adapter, {
  key: 'app-state',
  exclude: ['token', 'tempData']
});</code></pre>
      </div>

      <div class="info-box">
        <p><strong data-i18n="persistence.filterNote">Note:</strong> <span data-i18n="persistence.filterNoteDesc">Filtering applies to both save and restore operations. If a key is excluded, it will not be saved and any previously persisted value for that key will be ignored during restore.</span></p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.indexedDB">IndexedDB for Large Data</h2>
      <p data-i18n="persistence.indexedDBSectionDesc">When your store holds large datasets (cached API responses, user-generated content, offline data), IndexedDB is the right choice. It supports megabytes of storage without the ~5 MB localStorage limit.</p>
      <div class="code-block">
        <pre><code>import { createStore } from 'pulse-js-framework/runtime/store';
import {
  createIndexedDBAdapter, withPersistence
} from 'pulse-js-framework/runtime/persistence';

const store = createStore({
  articles: [],
  userDrafts: [],
  offlineQueue: []
});

const adapter = createIndexedDBAdapter({
  dbName: 'my-content-app',
  storeName: 'app-state',
  version: 1
});

const persistence = withPersistence(store, adapter, {
  key: 'content-store',
  debounce: 500  // Larger debounce for heavy writes
});

// Restore on startup
await persistence.restore();

// Flush before the user navigates away
window.addEventListener('beforeunload', () => {
  persistence.flush();
});</code></pre>
      </div>

      <div class="info-box">
        <p><strong data-i18n="persistence.idbFallback">Fallback behavior:</strong> <span data-i18n="persistence.idbFallbackDesc">If IndexedDB is unavailable (e.g. in a server-side rendering environment), \`createIndexedDBAdapter()\` automatically falls back to the memory adapter and logs a warning.</span></p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.errorHandling">Error Handling</h2>
      <p data-i18n="persistence.errorHandlingDesc">Persistence operations can fail due to storage quota limits, browser restrictions, or corrupted data. Pulse provides the \`PersistenceError\` class and the \`onError\` callback for robust error handling.</p>
      <div class="code-block">
        <pre><code>import {
  withPersistence, createLocalStorageAdapter, PersistenceError
} from 'pulse-js-framework/runtime/persistence';

const persistence = withPersistence(store, createLocalStorageAdapter(), {
  key: 'app-state',
  onError: (error) => {
    console.error('Persistence failed:', error.message);

    // Check if it is a PersistenceError
    if (PersistenceError.isPersistenceError(error)) {
      console.log('Adapter:', error.adapterName);  // 'localStorage'
    }
  }
});

// You can also handle errors from individual operations
try {
  const restored = await persistence.restore();
  if (!restored) {
    console.log('No saved state found, using defaults');
  }
} catch (error) {
  if (PersistenceError.isPersistenceError(error)) {
    console.error(\`\${error.adapterName} error: \${error.message}\`);
  }
}</code></pre>
      </div>

      <h3 data-i18n="persistence.errorClass">PersistenceError</h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="persistence.property">Property / Method</th>
              <th data-i18n="persistence.type">Type</th>
              <th data-i18n="persistence.description">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>message</code></td>
              <td><code>string</code></td>
              <td data-i18n="persistence.errMessage">Human-readable error description.</td>
            </tr>
            <tr>
              <td><code>adapterName</code></td>
              <td><code>string | null</code></td>
              <td data-i18n="persistence.errAdapter">Name of the adapter that failed (e.g. \`'localStorage'\`, \`'IndexedDB'\`).</td>
            </tr>
            <tr>
              <td><code>code</code></td>
              <td><code>string</code></td>
              <td data-i18n="persistence.errCode">Always \`'PERSISTENCE_ERROR'\`.</td>
            </tr>
            <tr>
              <td><code>isPersistenceError(err)</code></td>
              <td><code>static method</code></td>
              <td data-i18n="persistence.errCheck">Returns \`true\` if the given error is a \`PersistenceError\` instance.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.testing">Testing with Memory Adapter</h2>
      <p data-i18n="persistence.testingDesc">The memory adapter makes persistence fully testable without touching real storage. No cleanup between tests, no flaky localStorage mocking.</p>
      <div class="code-block">
        <pre><code>import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createStore } from 'pulse-js-framework/runtime/store';
import {
  createMemoryAdapter, withPersistence
} from 'pulse-js-framework/runtime/persistence';

describe('Persistence', () => {
  test('saves and restores store state', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ count: 0, name: 'Alice' });

    // Attach persistence
    const { flush, restore, dispose } = withPersistence(store, adapter, {
      key: 'test-store',
      debounce: 0  // No debounce in tests
    });

    // Change state
    store.count.set(42);
    store.name.set('Bob');
    await flush();  // Force immediate save

    // Verify data was persisted
    const saved = await adapter.getItem('test-store');
    assert.deepStrictEqual(saved, { count: 42, name: 'Bob' });

    // Create a fresh store and restore
    const store2 = createStore({ count: 0, name: '' });
    const p2 = withPersistence(store2, adapter, {
      key: 'test-store',
      debounce: 0
    });

    const wasRestored = await p2.restore();
    assert.strictEqual(wasRestored, true);
    assert.strictEqual(store2.count.get(), 42);
    assert.strictEqual(store2.name.get(), 'Bob');

    dispose();
    p2.dispose();
  });

  test('respects include filter', async () => {
    const adapter = createMemoryAdapter();
    const store = createStore({ theme: 'dark', token: 'secret' });

    const { flush, dispose } = withPersistence(store, adapter, {
      key: 'filtered',
      include: ['theme'],
      debounce: 0
    });

    await flush();
    const saved = await adapter.getItem('filtered');
    assert.strictEqual(saved.theme, 'dark');
    assert.strictEqual(saved.token, undefined);

    dispose();
  });

  test('calls onError when save fails', async () => {
    const errors = [];
    const failAdapter = {
      name: 'FailAdapter',
      async getItem() { return null; },
      async setItem() { throw new Error('Quota exceeded'); },
      async removeItem() {},
      async clear() {},
      async keys() { return []; }
    };

    const store = createStore({ count: 0 });
    const { flush, dispose } = withPersistence(store, failAdapter, {
      key: 'fail-test',
      debounce: 0,
      onError: (err) => errors.push(err)
    });

    store.count.set(1);
    await flush();
    assert.strictEqual(errors.length, 1);

    dispose();
  });
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.fullExample">Full Example</h2>
      <p data-i18n="persistence.fullExampleDesc">A complete application demonstrating persistent user preferences with graceful error handling and page-unload flushing.</p>
      <div class="code-block">
        <pre><code>import { el, mount, effect } from 'pulse-js-framework/runtime';
import { createStore, createActions } from 'pulse-js-framework/runtime/store';
import {
  createLocalStorageAdapter,
  createIndexedDBAdapter,
  createPersistenceAdapter,
  withPersistence,
  PersistenceError
} from 'pulse-js-framework/runtime/persistence';

// --- Store ---

const store = createStore({
  user: null,
  theme: 'light',
  fontSize: 16,
  sidebarOpen: true,
  notifications: []
});

const actions = createActions(store, {
  setTheme: (s, theme) => s.theme.set(theme),
  setFontSize: (s, size) => s.fontSize.set(size),
  login: (s, user) => s.user.set(user),
  logout: (s) => s.user.set(null),
  addNotification: (s, msg) =>
    s.notifications.update(n => [...n, { id: Date.now(), text: msg }])
});

// --- Persistence ---

const adapter = createLocalStorageAdapter();

const persistence = withPersistence(store, adapter, {
  key: 'my-app-v1',
  debounce: 200,
  // Only persist user preferences, not transient UI state
  exclude: ['sidebarOpen', 'notifications'],
  onError: (error) => {
    if (PersistenceError.isPersistenceError(error)) {
      console.warn(\`Storage error (\${error.adapterName}): \${error.message}\`);
    }
  }
});

// Restore state on startup
persistence.restore().then(restored => {
  if (restored) {
    console.log('Preferences restored from localStorage');
  }
});

// Flush before page unload to avoid losing the last debounced write
window.addEventListener('beforeunload', () => {
  persistence.flush();
});

// --- UI ---

function App() {
  return el('.app', [
    el('h1', 'Persistent Settings'),

    el('.controls', [
      el('label', 'Theme: '),
      el('select', {
        value: () => store.theme.get(),
        onchange: (e) => actions.setTheme(e.target.value)
      }, [
        el('option[value=light]', 'Light'),
        el('option[value=dark]', 'Dark'),
        el('option[value=auto]', 'Auto')
      ]),

      el('label', ' Font Size: '),
      el('input[type=range]', {
        min: '12', max: '24', step: '1',
        value: () => String(store.fontSize.get()),
        oninput: (e) => actions.setFontSize(Number(e.target.value))
      }),
      el('span', () => \`\${store.fontSize.get()}px\`)
    ]),

    el('.actions', [
      el('button', {
        onclick: () => persistence.clear()
      }, 'Clear Saved Data'),

      el('button', {
        onclick: () => persistence.flush()
      }, 'Force Save Now')
    ]),

    el('p.info', () =>
      \`Current: theme=\${store.theme.get()}, fontSize=\${store.fontSize.get()}px\`
    )
  ]);
}

mount('#app', App());</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="persistence.adapterInterface">Custom Adapters</h2>
      <p data-i18n="persistence.adapterInterfaceDesc">You can create your own adapter by implementing the five async methods below. This lets you persist to any backend: a remote API, a service worker cache, or a custom database.</p>
      <div class="code-block">
        <pre><code>// Every adapter must implement this interface:
const myAdapter = {
  name: 'MyCustomAdapter',

  async getItem(key) {
    // Return parsed value or null if not found
  },

  async setItem(key, value) {
    // Store the value (already deserialized object)
  },

  async removeItem(key) {
    // Delete the value for this key
  },

  async clear() {
    // Remove all values
  },

  async keys() {
    // Return an array of all stored keys
  }
};

// Use it like any built-in adapter
withPersistence(store, myAdapter, { key: 'my-key' });</code></pre>
      </div>
    </section>
  `;

  // Apply i18n translations
  effect(() => {
    locale.get();
    translations.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
