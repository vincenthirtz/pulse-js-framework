/**
 * Pulse Documentation - Debugging Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations, navigateLocale } from '../state.js';

export function DebuggingPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="debugging.title"></h1>
    <p class="intro" data-i18n="debugging.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="debugging.sourceMaps"></h2>
      <p>Pulse v1.4.9+ generates V3 source maps for compiled <code>.pulse</code> files, enabling debugging of original source code in browser DevTools.</p>

      <h3>Enabling Source Maps</h3>
      <div class="code-block">
        <pre><code>import { compile } from 'pulse-js-framework/compiler';

// Generate external source map
const result = compile(source, {
  sourceMap: true,
  sourceFileName: 'App.pulse'
});

// Or generate inline source map (embedded in output)
const result = compile(source, {
  sourceMap: true,
  inlineSourceMap: true,
  sourceFileName: 'App.pulse'
});</code></pre>
      </div>

      <h3>Vite Integration</h3>
      <p>The Vite plugin automatically generates source maps in development mode:</p>
      <div class="code-block">
        <pre><code>// vite.config.js
import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()],
  build: {
    sourcemap: true  // Enable for production too
  }
});</code></pre>
      </div>

      <h3>Using Source Maps in DevTools</h3>
      <ul class="feature-list">
        <li>Open Chrome/Firefox DevTools (F12)</li>
        <li>Go to Sources tab</li>
        <li>Find your <code>.pulse</code> files in the file tree</li>
        <li>Set breakpoints on original source lines</li>
        <li>Error stack traces will show original line numbers</li>
      </ul>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.loggerApi"></h2>
      <p>Use the built-in logger for structured debugging output:</p>

      <div class="code-block">
        <pre><code>import { createLogger, setLogLevel, LogLevel } from 'pulse-js-framework/runtime/logger';

// Create a namespaced logger
const log = createLogger('MyComponent');

log.debug('Detailed info');     // Only shown at DEBUG level
log.info('Component initialized');
log.warn('Deprecated method used');
log.error('Failed to load', error);

// Set global log level
setLogLevel(LogLevel.DEBUG);   // SILENT, ERROR, WARN, INFO, DEBUG

// Child loggers for sub-namespaces
const childLog = log.child('Validation');
childLog.info('Validating'); // [MyComponent:Validation] Validating</code></pre>
      </div>

      <h3>Log Levels</h3>
      <table class="doc-table">
        <caption>Logger log levels and their numeric values</caption>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Value</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>SILENT</code></td><td>0</td><td>No output</td></tr>
          <tr><td><code>ERROR</code></td><td>1</td><td>Errors only</td></tr>
          <tr><td><code>WARN</code></td><td>2</td><td>Warnings and errors</td></tr>
          <tr><td><code>INFO</code></td><td>3</td><td>Info, warnings, errors (default)</td></tr>
          <tr><td><code>DEBUG</code></td><td>4</td><td>All output including debug</td></tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.reactivityDebugging"></h2>
      <p>Techniques for debugging reactive state and effects:</p>

      <h3>Tracking Dependencies</h3>
      <div class="code-block">
        <pre><code>import { pulse, effect } from 'pulse-js-framework';

const count = pulse(0);
const name = pulse('John');

// Log when effect runs and what triggered it
effect(() => {
  console.log('Effect running...');
  console.log('count:', count.get());
  console.log('name:', name.get());
});

// Use peek() to read without tracking
effect(() => {
  console.log('Only tracks count:', count.get());
  console.log('Does not track name:', name.peek());
});</code></pre>
      </div>

      <h3>Debugging Computed Values</h3>
      <div class="code-block">
        <pre><code>const total = computed(() => {
  const result = items.get().reduce((sum, item) => sum + item.price, 0);
  console.log('Computed total:', result);
  return result;
});</code></pre>
      </div>

      <h3>Batch Debugging</h3>
      <div class="code-block">
        <pre><code>import { batch } from 'pulse-js-framework';

// Without batch: effect runs twice
count.set(1);  // Effect runs
name.set('Jane');  // Effect runs again

// With batch: effect runs once
batch(() => {
  count.set(1);
  name.set('Jane');
});  // Effect runs once here</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.routerDebugging"></h2>
      <p>Debug navigation and route matching:</p>

      <div class="code-block">
        <pre><code>const router = createRouter({
  routes,
  middleware: [
    // Debug middleware - logs all navigations
    async (ctx, next) => {
      console.group('Navigation');
      console.log('From:', ctx.from.path);
      console.log('To:', ctx.to.path);
      console.log('Params:', ctx.to.params);
      console.log('Query:', ctx.to.query);
      console.log('Meta:', ctx.to.meta);

      const start = Date.now();
      await next();
      console.log('Duration:', Date.now() - start, 'ms');
      console.groupEnd();
    }
  ]
});

// Log route changes reactively
effect(() => {
  console.log('Current path:', router.path.get());
  console.log('Current params:', router.params.get());
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.hmrDebugging"></h2>
      <p>Debug Hot Module Replacement issues:</p>

      <div class="code-block">
        <pre><code>import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

const hmr = createHMRContext(import.meta.url);

// Log preserved state
console.log('HMR data:', hmr.data);

// Track HMR updates
hmr.dispose(() => {
  console.log('Module being replaced...');
});

hmr.accept(() => {
  console.log('HMR update accepted');
});

// Debug preserved pulses
const count = hmr.preservePulse('count', 0);
console.log('Preserved count:', count.get());</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.commonErrors"></h2>

      <div class="error-item">
        <h3><code>Maximum update depth exceeded</code></h3>
        <p><strong>Cause:</strong> An effect is setting a pulse that it also reads, causing infinite loop.</p>
        <div class="code-block">
          <pre><code>// BAD: Infinite loop
effect(() => {
  count.set(count.get() + 1);  // Reads AND writes count
});

// GOOD: Use update()
effect(() => {
  // Only set, don't read in same effect
  someOtherPulse.get();
});
count.update(n => n + 1);  // Outside effect</code></pre>
        </div>
      </div>

      <div class="error-item">
        <h3><code>Cannot read property 'get' of undefined</code></h3>
        <p><strong>Cause:</strong> Pulse was not initialized or is out of scope.</p>
        <div class="code-block">
          <pre><code>// BAD: pulse not initialized
let count;
effect(() => count.get());  // Error!

// GOOD: Initialize first
const count = pulse(0);
effect(() => count.get());</code></pre>
        </div>
      </div>

      <div class="error-item">
        <h3><code>Effect not updating</code></h3>
        <p><strong>Cause:</strong> Using <code>peek()</code> instead of <code>get()</code>, or value is same (no change detected).</p>
        <div class="code-block">
          <pre><code>// BAD: peek() doesn't track
effect(() => {
  console.log(count.peek());  // Won't re-run on change
});

// GOOD: Use get() to track
effect(() => {
  console.log(count.get());  // Re-runs when count changes
});</code></pre>
        </div>
      </div>

      <div class="error-item">
        <h3><code>Route not matching</code></h3>
        <p><strong>Cause:</strong> Route order matters - more specific routes should come first.</p>
        <div class="code-block">
          <pre><code>// BAD: Wildcard catches everything
const routes = {
  '/*path': NotFound,  // Matches everything!
  '/users': UsersPage  // Never reached
};

// GOOD: Specific routes first
const routes = {
  '/users': UsersPage,
  '/users/:id': UserPage,
  '/*path': NotFound  // Fallback last
};</code></pre>
        </div>
      </div>

      <div class="error-item">
        <h3><code>Lazy component not loading</code></h3>
        <p><strong>Cause:</strong> Import path incorrect or module doesn't have default export.</p>
        <div class="code-block">
          <pre><code>// BAD: Wrong path or missing default export
lazy(() => import('./Dashboard'))  // Missing .js
lazy(() => import('./Dashboard.js'))  // But exports { Dashboard }

// GOOD: Correct path and default export
lazy(() => import('./Dashboard.js'))  // export default Dashboard</code></pre>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="debugging.performanceProfiling"></h2>
      <p>Tips for identifying performance bottlenecks:</p>

      <h3>Measure Effect Performance</h3>
      <div class="code-block">
        <pre><code>effect(() => {
  const start = performance.now();

  // Your effect code
  heavyComputation(data.get());

  const duration = performance.now() - start;
  if (duration > 16) {  // Longer than one frame
    console.warn('Slow effect:', duration.toFixed(2), 'ms');
  }
});</code></pre>
      </div>

      <h3>Browser DevTools</h3>
      <ul class="feature-list">
        <li><strong>Performance tab:</strong> Record and analyze rendering</li>
        <li><strong>Memory tab:</strong> Check for memory leaks</li>
        <li><strong>Network tab:</strong> Verify lazy loading works</li>
        <li><strong>Console:</strong> Check for warnings about re-renders</li>
      </ul>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handler programmatically for navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary');
  nextBtn.dataset.i18n = 'debugging.nextApiReference';
  nextBtn.onclick = () => navigateLocale('/api-reference');
  nextSection.appendChild(nextBtn);

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get(); // Track locale changes
    translations.get(); // Track when translations are loaded

    // Update text content
    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  return page;
}
