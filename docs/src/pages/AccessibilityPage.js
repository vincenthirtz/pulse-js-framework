/**
 * Pulse Documentation - Accessibility Guide
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

export function AccessibilityPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('accessibility.title')}</h1>
    <p class="intro">${t('accessibility.intro')}</p>

    <section class="doc-section">
      <h2>Overview</h2>
      <p>Pulse is designed with accessibility as a core feature. The framework provides multiple layers of a11y support:</p>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>Feature</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Runtime</strong></td>
            <td>Auto-ARIA</td>
            <td><code>el()</code> automatically applies correct ARIA attributes</td>
          </tr>
          <tr>
            <td><strong>Runtime</strong></td>
            <td>a11y.js</td>
            <td>Focus management, announcements, preferences, validation</td>
          </tr>
          <tr>
            <td><strong>Compiler</strong></td>
            <td>Directives</td>
            <td><code>@a11y</code>, <code>@live</code>, <code>@focusTrap</code>, <code>@srOnly</code></td>
          </tr>
          <tr>
            <td><strong>DevTools</strong></td>
            <td>Audit Mode</td>
            <td>Real-time a11y validation with visual highlighting</td>
          </tr>
          <tr>
            <td><strong>CLI</strong></td>
            <td>Lint Rules</td>
            <td>10 a11y rules catch issues at build time</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2>Auto-ARIA</h2>
      <p>The <code>el()</code> function automatically applies ARIA attributes based on element semantics:</p>

      <div class="code-block">
        <pre><code>import { el, configureA11y } from 'pulse-js-framework/runtime';

// Dialogs get modal indication
el('dialog')              // role="dialog" aria-modal="true"

// Buttons get explicit type
el('button')              // type="button"

// Links without href become accessible buttons
el('a')                   // role="button" tabindex="0"

// Interactive roles get required states
el('div[role=checkbox]')  // aria-checked="false"
el('div[role=slider]')    // aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
el('div[role=combobox]')  // aria-expanded="false"</code></pre>
      </div>

      <h3>Configuration</h3>
      <div class="code-block">
        <pre><code>configureA11y({
  enabled: true,           // Enable/disable all auto-ARIA
  autoAria: true,          // Auto-apply ARIA to semantic elements
  warnMissingAlt: true,    // Warn when &lt;img&gt; missing alt
  warnMissingLabel: true   // Warn for form controls missing labels
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Screen Reader Announcements</h2>
      <p>Announce dynamic content changes to screen readers:</p>

      <div class="code-block">
        <pre><code>import { announce, announcePolite, announceAssertive, createLiveAnnouncer } from 'pulse-js-framework/runtime/a11y';

// Basic announcements
announce('Item saved');                    // Polite (default)
announcePolite('Loading complete');        // Waits for user pause
announceAssertive('Error: Connection lost'); // Interrupts immediately

// Reactive announcer (announces on pulse change)
const cleanup = createLiveAnnouncer(
  () => \`\${items.get().length} items in cart\`,
  { priority: 'polite', clearAfter: 1000 }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Focus Management</h2>
      <p>Manage keyboard focus for modals, dialogs, and complex widgets:</p>

      <div class="code-block">
        <pre><code>import { trapFocus, focusFirst, focusLast, saveFocus, restoreFocus } from 'pulse-js-framework/runtime/a11y';

// Trap focus inside modal/dialog
const release = trapFocus(modalElement, {
  autoFocus: true,           // Focus first element on trap
  returnFocus: true,         // Return focus when released
  initialFocus: closeButton  // Custom initial focus target
});
// Call release() to remove trap

// Focus utilities
focusFirst(container);       // Focus first focusable element
focusLast(container);        // Focus last focusable element
saveFocus();                 // Push current focus to stack
restoreFocus();              // Pop and restore focus</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Skip Links</h2>
      <p>Help keyboard users skip repetitive navigation:</p>

      <div class="code-block">
        <pre><code>import { installSkipLinks } from 'pulse-js-framework/runtime/a11y';

installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'navigation', text: 'Skip to navigation' },
  { target: 'search', text: 'Skip to search' }
]);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>User Preferences</h2>
      <p>Respect user accessibility preferences:</p>

      <div class="code-block">
        <pre><code>import { prefersReducedMotion, prefersColorScheme, createPreferences } from 'pulse-js-framework/runtime/a11y';

// Check preferences (non-reactive)
if (prefersReducedMotion()) {
  disableAnimations();
}
const scheme = prefersColorScheme(); // 'light' | 'dark' | 'no-preference'

// Reactive preferences (pulses)
const prefs = createPreferences();
effect(() => {
  if (prefs.reducedMotion.get()) disableAnimations();
  applyTheme(prefs.colorScheme.get());
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>.pulse Directives</h2>
      <p>Built-in accessibility directives in the .pulse DSL:</p>

      <h3>@a11y - ARIA Attributes</h3>
      <div class="code-block">
        <pre><code>view {
  // Set role and aria-label
  div @a11y(role=dialog, label="Settings", modal=true) {
    h2 "Settings"
  }

  // Short form
  button @a11y(label="Close menu") "×"
}</code></pre>
      </div>

      <h3>@live - Live Regions</h3>
      <div class="code-block">
        <pre><code>view {
  // Polite - waits for user pause
  .status @live(polite) { "Status: {status}" }

  // Assertive - interrupts immediately
  .error @live(assertive) { "Error: {errorMessage}" }
}</code></pre>
      </div>

      <h3>@focusTrap - Focus Trapping</h3>
      <div class="code-block">
        <pre><code>view {
  .modal @focusTrap(autoFocus=true, returnFocus=true) {
    h2 "Confirm"
    button "Yes"
    button "No"
  }
}</code></pre>
      </div>

      <h3>@srOnly - Screen Reader Only</h3>
      <div class="code-block">
        <pre><code>view {
  a[href="/home"] {
    span.icon "🏠"
    span @srOnly "Go to homepage"
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>DevTools Audit</h2>
      <p>Enable real-time accessibility auditing in development:</p>

      <div class="code-block">
        <pre><code>import { enableDevTools, enableA11yAudit, runA11yAudit, exportA11yReport } from 'pulse-js-framework/runtime/devtools';

enableDevTools();

// One-time audit
const result = runA11yAudit();
console.log(\`Found \${result.errorCount} errors, \${result.warningCount} warnings\`);

// Continuous audit mode
enableA11yAudit({
  autoAudit: true,           // Periodic automatic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  watchMutations: true       // Re-audit on DOM changes
});

// Export reports
const htmlReport = exportA11yReport('html');
const jsonReport = exportA11yReport('json');</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Lint Rules</h2>
      <p>The CLI checks for accessibility issues at build time:</p>

      <div class="code-block">
        <pre><code>pulse lint src/</code></pre>
      </div>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Rule</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>a11y-img-alt</code></td><td>Images must have alt attribute</td></tr>
          <tr><td><code>a11y-button-text</code></td><td>Buttons must have accessible name</td></tr>
          <tr><td><code>a11y-link-text</code></td><td>Links must have accessible name</td></tr>
          <tr><td><code>a11y-input-label</code></td><td>Form inputs must have labels</td></tr>
          <tr><td><code>a11y-click-key</code></td><td>Click handlers need keyboard support</td></tr>
          <tr><td><code>a11y-no-autofocus</code></td><td>Avoid autofocus</td></tr>
          <tr><td><code>a11y-no-positive-tabindex</code></td><td>Avoid positive tabindex</td></tr>
          <tr><td><code>a11y-heading-order</code></td><td>Headings should follow hierarchy</td></tr>
          <tr><td><code>a11y-aria-props</code></td><td>ARIA attributes must be valid</td></tr>
          <tr><td><code>a11y-role-props</code></td><td>Roles must have required attributes</td></tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2>Best Practices</h2>

      <h3>1. Use Semantic HTML</h3>
      <div class="code-block">
        <pre><code>// Good
button @click(submit()) "Submit"
nav { ... }
main { ... }

// Bad - requires role, tabindex, keyboard handler
div @click(submit()) "Submit"</code></pre>
      </div>

      <h3>2. Always Provide Text Alternatives</h3>
      <div class="code-block">
        <pre><code>// Good
img[src="logo.png"][alt="Company Logo"]
img[src="decoration.png"][alt=""]  // Empty for decorative

// Bad
img[src="logo.png"]  // Missing alt</code></pre>
      </div>

      <h3>3. Manage Focus in Modals</h3>
      <div class="code-block">
        <pre><code>// Good - focus trap keeps focus inside
.modal @focusTrap(autoFocus=true, returnFocus=true) {
  button "Close"
}</code></pre>
      </div>

      <h3>4. Announce Dynamic Content</h3>
      <div class="code-block">
        <pre><code>// Good - screen readers are notified
.notification @live(polite) { "{message}" }
.error @live(assertive) { "{error}" }</code></pre>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/security')">
        ${t('accessibility.nextSecurity')}
      </button>
    </div>
  `;

  return page;
}
