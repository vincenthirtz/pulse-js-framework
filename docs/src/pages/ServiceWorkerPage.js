/**
 * Pulse Documentation - Service Worker Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function ServiceWorkerPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="sw.title"></h1>
    <p class="page-intro" data-i18n="sw.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="sw.quickStart"></h2>
      <p data-i18n="sw.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { registerServiceWorker } from 'pulse-js-framework/runtime/sw';

const sw = registerServiceWorker('/sw.js', {
  scope: '/',
  updateInterval: 60000,  // Check for updates every 60s
  onUpdate: (reg) => {
    if (confirm('Update available. Reload?')) {
      window.location.reload();
    }
  },
  onActivate: (reg) => console.log('Service worker activated'),
  onError: (err) => console.error('SW failed:', err)
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.registrationOptions"></h2>
      <p data-i18n="sw.registrationOptionsDesc"></p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="sw.option"></th>
              <th data-i18n="sw.type"></th>
              <th data-i18n="sw.default"></th>
              <th data-i18n="sw.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>scope</code></td>
              <td><code>string</code></td>
              <td><code>'/'</code></td>
              <td data-i18n="sw.optScope"></td>
            </tr>
            <tr>
              <td><code>updateInterval</code></td>
              <td><code>number</code></td>
              <td><code>0</code></td>
              <td data-i18n="sw.optUpdateInterval"></td>
            </tr>
            <tr>
              <td><code>immediate</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td data-i18n="sw.optImmediate"></td>
            </tr>
            <tr>
              <td><code>onUpdate</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sw.optOnUpdate"></td>
            </tr>
            <tr>
              <td><code>onActivate</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sw.optOnActivate"></td>
            </tr>
            <tr>
              <td><code>onError</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sw.optOnError"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="code-block">
        <pre><code>// Return value from registerServiceWorker()
const sw = registerServiceWorker('/sw.js', options);

await sw.update();      // Manually check for updates
await sw.unregister();  // Unregister the service worker
sw.registration;        // Underlying ServiceWorkerRegistration</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.reactiveState"></h2>
      <p data-i18n="sw.reactiveStateDesc"></p>
      <div class="code-block">
        <pre><code>import { useServiceWorker } from 'pulse-js-framework/runtime/sw';
import { effect } from 'pulse-js-framework/runtime';

const {
  supported,        // boolean - true if SW API available
  registered,       // Pulse&lt;boolean&gt; - true when SW is registered
  installing,       // Pulse&lt;boolean&gt; - true during installation
  waiting,          // Pulse&lt;boolean&gt; - true when new SW is waiting
  active,           // Pulse&lt;boolean&gt; - true when SW is active
  updateAvailable,  // Pulse&lt;boolean&gt; - true when update is ready
  error,            // Pulse&lt;Error | null&gt; - last error
  update,           // () =&gt; Promise - check for updates
  skipWaiting,      // () =&gt; Promise - activate waiting SW
  unregister        // () =&gt; Promise&lt;boolean&gt; - unregister SW
} = useServiceWorker('/sw.js');

// React to state changes
effect(() => {
  if (updateAvailable.get()) showUpdateNotification();
});

effect(() => {
  const err = error.get();
  if (err) console.error('SW error:', err.message);
});</code></pre>
      </div>

      <h3 data-i18n="sw.stateFlow"></h3>
      <div class="info-box">
        <ol>
          <li><strong>registered</strong> <span data-i18n="sw.stateRegistered"></span></li>
          <li><strong>installing</strong> <span data-i18n="sw.stateInstalling"></span></li>
          <li><strong>waiting</strong> <span data-i18n="sw.stateWaiting"></span></li>
          <li><strong>active</strong> <span data-i18n="sw.stateActive"></span></li>
        </ol>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.updateHandling"></h2>
      <p data-i18n="sw.updateHandlingDesc"></p>
      <div class="code-block">
        <pre><code>import { useServiceWorker } from 'pulse-js-framework/runtime/sw';
import { el, effect } from 'pulse-js-framework/runtime';

const { updateAvailable, skipWaiting, update } = useServiceWorker('/sw.js', {
  updateInterval: 60000  // Check every minute
});

// Skip waiting and reload when user confirms
async function applyUpdate() {
  await skipWaiting();
  window.location.reload();
}

// Update banner component
function UpdateBanner() {
  return el('.update-banner', {
    style: () => updateAvailable.get() ? 'display: flex' : 'display: none'
  }, [
    el('p', 'A new version is available!'),
    el('button.btn', 'Update Now', { onclick: applyUpdate }),
    el('button.btn.btn-secondary', 'Later', {
      onclick: () => updateAvailable.set(false)
    })
  ]);
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.cacheStrategies"></h2>
      <p data-i18n="sw.cacheStrategiesDesc"></p>

      <h3 data-i18n="sw.cacheFirst"></h3>
      <p data-i18n="sw.cacheFirstDesc"></p>
      <div class="code-block">
        <pre><code>// sw.js - Cache First (good for static assets)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open('pulse-static-v1').then(c => c.put(event.request, clone));
        return response;
      });
    })
  );
});</code></pre>
      </div>

      <h3 data-i18n="sw.networkFirst"></h3>
      <p data-i18n="sw.networkFirstDesc"></p>
      <div class="code-block">
        <pre><code>// sw.js - Network First (good for API calls)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open('pulse-api-v1').then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});</code></pre>
      </div>

      <h3 data-i18n="sw.staleWhileRevalidate"></h3>
      <p data-i18n="sw.staleWhileRevalidateDesc"></p>
      <div class="code-block">
        <pre><code>// sw.js - Stale-While-Revalidate (good for frequently updated content)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('pulse-swr-v1').then(cache =>
      cache.match(event.request).then(cached => {
        const fetched = fetch(event.request).then(response => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetched;  // Return cached immediately, update in background
      })
    )
  );
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.precaching"></h2>
      <p data-i18n="sw.precachingDesc"></p>
      <div class="code-block">
        <pre><code>// sw.js - Precache with versioned cache names
const CACHE_NAME = \`pulse-app-v2\`;
const PRECACHE_URLS = ['/', '/index.html', '/assets/app.js', '/assets/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.offlineSupport"></h2>
      <p data-i18n="sw.offlineSupportDesc"></p>
      <div class="code-block">
        <pre><code>// sw.js - Offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pulse-offline-v1').then(cache =>
      cache.addAll(['/offline.html', '/assets/offline.css'])
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});</code></pre>
      </div>

      <h3 data-i18n="sw.offlineDetection"></h3>
      <p data-i18n="sw.offlineDetectionDesc"></p>
      <div class="code-block">
        <pre><code>import { pulse, effect } from 'pulse-js-framework/runtime';

const isOnline = pulse(navigator.onLine);
window.addEventListener('online', () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));

effect(() => {
  document.querySelector('.offline-banner').style.display =
    isOnline.get() ? 'none' : 'flex';
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.errorHandling"></h2>
      <p data-i18n="sw.errorHandlingDesc"></p>
      <div class="code-block">
        <pre><code>const { error, supported } = useServiceWorker('/sw.js', {
  onError: (err) => reportToSentry(err)
});

if (!supported) console.warn('Service Workers not supported');

effect(() => {
  const err = error.get();
  if (err) console.error('SW error:', err.message);
});

// Graceful degradation
effect(() => {
  if (!supported || error.get()) enableFallbackCaching();
});</code></pre>
      </div>

      <h3 data-i18n="sw.commonErrors"></h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="sw.errorType"></th>
              <th data-i18n="sw.cause"></th>
              <th data-i18n="sw.solution"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>SecurityError</code></td>
              <td data-i18n="sw.errSecurityCause"></td>
              <td data-i18n="sw.errSecurityFix"></td>
            </tr>
            <tr>
              <td><code>TypeError</code></td>
              <td data-i18n="sw.errTypeCause"></td>
              <td data-i18n="sw.errTypeFix"></td>
            </tr>
            <tr>
              <td><code>NetworkError</code></td>
              <td data-i18n="sw.errNetworkCause"></td>
              <td data-i18n="sw.errNetworkFix"></td>
            </tr>
            <tr>
              <td><code>InvalidStateError</code></td>
              <td data-i18n="sw.errStateCause"></td>
              <td data-i18n="sw.errStateFix"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sw.fullExample"></h2>
      <p data-i18n="sw.fullExampleDesc"></p>

      <h3 data-i18n="sw.exampleMainThread"></h3>
      <div class="code-block">
        <pre><code>// main.js - PWA with update notifications
import { pulse, effect, el, mount } from 'pulse-js-framework/runtime';
import { useServiceWorker } from 'pulse-js-framework/runtime/sw';

const {
  supported, active, updateAvailable, error, skipWaiting
} = useServiceWorker('/sw.js', {
  updateInterval: 5 * 60 * 1000,
  onUpdate: () => console.log('Update available'),
  onActivate: () => console.log('SW activated')
});

const isOnline = pulse(navigator.onLine);
window.addEventListener('online', () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));

function UpdateNotification() {
  return el('.update-notification', {
    style: () => updateAvailable.get()
      ? 'transform: translateY(0)' : 'transform: translateY(100%)',
    role: 'alert', 'aria-live': 'polite'
  }, [
    el('p', 'A new version is available.'),
    el('button.btn', 'Update Now', {
      onclick: async () => { await skipWaiting(); window.location.reload(); }
    }),
    el('button.btn.btn-secondary', 'Dismiss', {
      onclick: () => updateAvailable.set(false)
    })
  ]);
}

function OfflineBanner() {
  return el('.offline-banner', {
    style: () => isOnline.get() ? 'display: none' : 'display: flex',
    role: 'status'
  }, [el('span', 'You are offline.')]);
}

function App() {
  return el('.app', [
    OfflineBanner(),
    el('header', el('h1', 'My PWA')),
    el('main#content', el('p', 'Your PWA content here.')),
    UpdateNotification()
  ]);
}

mount('#app', App());</code></pre>
      </div>

      <h3 data-i18n="sw.exampleWorkerFile"></h3>
      <div class="code-block">
        <pre><code>// sw.js - Service Worker file
const CACHE_VERSION = 'v1';
const STATIC_CACHE = \`pulse-static-\${CACHE_VERSION}\`;
const API_CACHE = \`pulse-api-\${CACHE_VERSION}\`;
const PRECACHE = ['/', '/index.html', '/assets/app.js', '/assets/styles.css', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // API: Network First
    event.respondWith(
      fetch(request).then(res => {
        caches.open(API_CACHE).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => caches.match(request))
    );
  } else if (request.mode === 'navigate') {
    // Pages: Network First with offline fallback
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(c => c || caches.match('/offline.html'))
      )
    );
  } else {
    // Assets: Cache First
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        caches.open(STATIC_CACHE).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});</code></pre>
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
