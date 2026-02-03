/**
 * Pulse Documentation - DevTools Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function DevToolsPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="devtools.title"></h1>
    <p class="page-intro" data-i18n="devtools.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="devtools.enabling"></h2>
      <p data-i18n="devtools.enablingDesc"></p>
      <div class="code-block">
        <pre><code>import { enableDevTools, disableDevTools } from 'pulse-js-framework/runtime/devtools';

enableDevTools({
  logUpdates: true,           // Log pulse updates
  logEffects: true,           // Log effect executions
  warnOnSlowEffects: true,    // Warn for slow effects
  slowEffectThreshold: 16     // Threshold in ms
});

// Exposes window.__PULSE_DEVTOOLS__ for browser console access</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.trackedPulses"></h2>
      <p data-i18n="devtools.trackedPulsesDesc"></p>
      <div class="code-block">
        <pre><code>import { trackedPulse, trackedEffect } from 'pulse-js-framework/runtime/devtools';

// Tracked pulse (auto-snapshot on change)
const count = trackedPulse(0, 'count');
const user = trackedPulse(null, 'user');

// Tracked effect (performance monitoring)
trackedEffect(() => {
  console.log('Count:', count.get());
}, 'log-count');</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.diagnostics"></h2>

      <h3>getDiagnostics()</h3>
      <p data-i18n="devtools.getDiagnosticsDesc"></p>
      <div class="code-block">
        <pre><code>import { getDiagnostics } from 'pulse-js-framework/runtime/devtools';

const stats = getDiagnostics();
// {
//   pulseCount: 15,
//   effectCount: 8,
//   avgEffectTime: 2.3,
//   pendingEffects: 0,
//   ...
// }</code></pre>
      </div>

      <h3>getEffectStats()</h3>
      <p data-i18n="devtools.getEffectStatsDesc"></p>
      <div class="code-block">
        <pre><code>import { getEffectStats } from 'pulse-js-framework/runtime/devtools';

const effects = getEffectStats();
// [
//   { id: 'effect-1', name: 'log-count', runCount: 42, avgTime: 1.2 },
//   { id: 'effect-2', name: 'render-ui', runCount: 15, avgTime: 8.5 }
// ]</code></pre>
      </div>

      <h3>getPulseList()</h3>
      <p data-i18n="devtools.getPulseListDesc"></p>
      <div class="code-block">
        <pre><code>import { getPulseList } from 'pulse-js-framework/runtime/devtools';

const pulses = getPulseList();
// [
//   { id: 'pulse-1', name: 'count', value: 5, subscriberCount: 2 },
//   { id: 'pulse-2', name: 'user', value: { name: 'John' }, subscriberCount: 1 }
// ]</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.dependencyGraph"></h2>
      <p data-i18n="devtools.dependencyGraphDesc"></p>
      <div class="code-block">
        <pre><code>import { getDependencyGraph, exportGraphAsDot } from 'pulse-js-framework/runtime/devtools';

// Get graph data
const { nodes, edges } = getDependencyGraph();

// nodes: [{ id, type, name, value }, ...]
// edges: [{ from, to, type }, ...]

// Export as Graphviz DOT format
const dot = exportGraphAsDot();
// digraph G { ... }</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.timeTravel"></h2>
      <p data-i18n="devtools.timeTravelDesc"></p>
      <div class="code-block">
        <pre><code>import { takeSnapshot, getHistory, travelTo, back, forward } from 'pulse-js-framework/runtime/devtools';

// Save current state
takeSnapshot('before-update');
takeSnapshot('after-login');

// Get all snapshots
const history = getHistory();
// [{ name: 'before-update', state: {...}, timestamp }, ...]

// Navigate to specific snapshot
travelTo(0);  // Go to first snapshot
travelTo(1);  // Go to second snapshot

// Step navigation
back();       // Go back one step
forward();    // Go forward one step</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.profiling"></h2>

      <h3>profile()</h3>
      <p data-i18n="devtools.profileDesc"></p>
      <div class="code-block">
        <pre><code>import { profile } from 'pulse-js-framework/runtime/devtools';

profile('data-processing', () => {
  processLargeDataset();
});
// Logs: [Profile] data-processing: 123.45ms</code></pre>
      </div>

      <h3>mark()</h3>
      <p data-i18n="devtools.markDesc"></p>
      <div class="code-block">
        <pre><code>import { mark } from 'pulse-js-framework/runtime/devtools';

const m = mark('fetch-users');
await fetch('/api/users');
m.end();
// Logs: [Mark] fetch-users: 456.78ms</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.a11yAudit"></h2>
      <p data-i18n="devtools.a11yAuditDesc"></p>

      <h3 data-i18n="devtools.oneTimeAudit"></h3>
      <div class="code-block">
        <pre><code>import { runA11yAudit } from 'pulse-js-framework/runtime/devtools';

const result = runA11yAudit();
console.log(\`Found \${result.errorCount} errors, \${result.warningCount} warnings\`);

// result.issues: [{ type, message, element, severity }, ...]</code></pre>
      </div>

      <h3 data-i18n="devtools.continuousAuditing"></h3>
      <div class="code-block">
        <pre><code>import { enableA11yAudit, disableA11yAudit } from 'pulse-js-framework/runtime/devtools';

enableA11yAudit({
  autoAudit: true,           // Periodic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  breakOnError: false,       // Debugger breakpoint on errors
  watchMutations: true       // Re-audit on DOM changes
});

// Later...
disableA11yAudit();</code></pre>
      </div>

      <h3 data-i18n="devtools.a11yStats"></h3>
      <div class="code-block">
        <pre><code>import { getA11yIssues, getA11yStats } from 'pulse-js-framework/runtime/devtools';

const issues = getA11yIssues();
// [{ type: 'missing-alt', element: &lt;img&gt;, severity: 'error' }, ...]

const stats = getA11yStats();
// {
//   totalIssues: 5,
//   errorCount: 2,
//   warningCount: 3,
//   byType: { 'missing-alt': 1, 'missing-label': 1, ... }
// }</code></pre>
      </div>

      <h3 data-i18n="devtools.visualHighlighting"></h3>
      <div class="code-block">
        <pre><code>import { toggleA11yHighlights } from 'pulse-js-framework/runtime/devtools';

toggleA11yHighlights(true);   // Show highlights
toggleA11yHighlights(false);  // Hide highlights
toggleA11yHighlights();       // Toggle</code></pre>
      </div>

      <h3 data-i18n="devtools.exportReports"></h3>
      <div class="code-block">
        <pre><code>import { exportA11yReport } from 'pulse-js-framework/runtime/devtools';

const json = exportA11yReport('json');  // JSON format
const csv = exportA11yReport('csv');    // CSV format
const html = exportA11yReport('html');  // Standalone HTML report</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.browserConsole"></h2>
      <p data-i18n="devtools.browserConsoleDesc"></p>
      <div class="code-block">
        <pre><code>// In browser console
__PULSE_DEVTOOLS__.getDiagnostics()
__PULSE_DEVTOOLS__.getPulseList()
__PULSE_DEVTOOLS__.getDependencyGraph()
__PULSE_DEVTOOLS__.takeSnapshot('manual')
__PULSE_DEVTOOLS__.travelTo(0)
__PULSE_DEVTOOLS__.runA11yAudit()</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="devtools.bestPractices"></h2>

      <h3 data-i18n="devtools.developmentOnly"></h3>
      <div class="code-block">
        <pre><code>if (import.meta.env.DEV) {
  enableDevTools({ logUpdates: true });
}</code></pre>
      </div>

      <h3 data-i18n="devtools.namingConventions"></h3>
      <div class="code-block">
        <pre><code>// Use descriptive names for debugging
const userProfile = trackedPulse(null, 'user-profile');
const cartItems = trackedPulse([], 'cart-items');

trackedEffect(() => {
  renderHeader();
}, 'render-header');</code></pre>
      </div>

      <h3 data-i18n="devtools.performanceMonitoring"></h3>
      <div class="code-block">
        <pre><code>// Monitor slow effects
enableDevTools({
  warnOnSlowEffects: true,
  slowEffectThreshold: 16  // 1 frame at 60fps
});

// Profile critical paths
profile('initial-render', () => {
  mount('#app', App());
});</code></pre>
      </div>

      <h3 data-i18n="devtools.a11yInDevelopment"></h3>
      <div class="code-block">
        <pre><code>// Enable during development
if (import.meta.env.DEV) {
  enableA11yAudit({
    highlightIssues: true,
    logToConsole: true
  });
}</code></pre>
      </div>
    </section>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  return page;
}
