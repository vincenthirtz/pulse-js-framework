/**
 * Pulse Documentation - Accessibility Guide
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function AccessibilityPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('accessibility.title')}</h1>
    <p class="intro">${t('accessibility.intro')}</p>

    <section class="doc-section">
      <h2>Overview</h2>
      <p>Pulse is designed with accessibility as a core feature. The framework provides multiple layers of a11y support:</p>

      <table class="doc-table" aria-describedby="a11y-layers-desc">
        <caption id="a11y-layers-desc">Pulse Framework accessibility features organized by layer</caption>
        <thead>
          <tr>
            <th scope="col">Layer</th>
            <th scope="col">Feature</th>
            <th scope="col">Description</th>
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
        <pre><code>import {
  prefersReducedMotion, prefersColorScheme, prefersHighContrast,
  prefersReducedTransparency, forcedColorsMode, prefersContrast,
  createPreferences
} from 'pulse-js-framework/runtime/a11y';

// Check preferences (non-reactive)
if (prefersReducedMotion()) disableAnimations();
if (prefersReducedTransparency()) useSolidBackgrounds();
if (forcedColorsMode() === 'active') useSystemColors(); // Windows High Contrast

const scheme = prefersColorScheme();   // 'light' | 'dark' | 'no-preference'
const contrast = prefersContrast();    // 'no-preference' | 'more' | 'less' | 'custom'

// Reactive preferences (pulses - auto-update on system changes)
const prefs = createPreferences();
effect(() => {
  if (prefs.reducedMotion.get()) disableAnimations();
  if (prefs.forcedColors.get() === 'active') useSystemColors();
  applyTheme(prefs.colorScheme.get());
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>ARIA Widgets</h2>
      <p>Pre-built accessible widget patterns:</p>

      <h3>Modal Dialog</h3>
      <div class="code-block">
        <pre><code>import { createModal } from 'pulse-js-framework/runtime/a11y';

const modal = createModal(dialogElement, {
  labelledBy: 'modal-title',       // ID of title element
  describedBy: 'modal-desc',       // ID of description
  closeOnBackdropClick: true,      // Click outside to close
  inertBackground: true,           // Make background inert
  onClose: () => console.log('closed')
});

modal.open();                      // Open dialog
modal.close();                     // Close dialog
modal.isOpen.get();                // Reactive state</code></pre>
      </div>

      <h3>Tooltip</h3>
      <div class="code-block">
        <pre><code>import { createTooltip } from 'pulse-js-framework/runtime/a11y';

const tooltip = createTooltip(triggerButton, tooltipElement, {
  showDelay: 500,    // ms before showing
  hideDelay: 100     // ms before hiding
});

tooltip.show();      // Show immediately
tooltip.hide();      // Hide immediately
tooltip.cleanup();   // Remove event listeners</code></pre>
      </div>

      <h3>Accordion</h3>
      <div class="code-block">
        <pre><code>import { createAccordion } from 'pulse-js-framework/runtime/a11y';

const accordion = createAccordion(container, {
  triggerSelector: '[data-accordion-trigger]',
  panelSelector: '[data-accordion-panel]',
  allowMultiple: false,  // Single panel open
  defaultOpen: 0         // First panel open initially
});

accordion.open(1);       // Open panel by index
accordion.closeAll();    // Close all panels
accordion.openIndices.get(); // Reactive: which panels are open</code></pre>
      </div>

      <h3>Dropdown Menu</h3>
      <div class="code-block">
        <pre><code>import { createMenu } from 'pulse-js-framework/runtime/a11y';

const menu = createMenu(menuButton, menuList, {
  itemSelector: '[role="menuitem"]',
  closeOnSelect: true,
  onSelect: (el, index) => console.log('Selected:', el)
});

menu.open();   // Open menu, focus first item
menu.close();  // Close menu, return focus to button
menu.toggle(); // Toggle open/close</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Color Contrast</h2>
      <p>Check WCAG color contrast requirements:</p>

      <div class="code-block">
        <pre><code>import {
  getContrastRatio, meetsContrastRequirement,
  getEffectiveBackgroundColor, checkElementContrast
} from 'pulse-js-framework/runtime/a11y';

// Calculate contrast ratio (1 to 21)
const ratio = getContrastRatio('#333333', '#ffffff'); // 12.63

// Check WCAG requirements
meetsContrastRequirement(ratio, 'AA', 'normal');  // true (>= 4.5)
meetsContrastRequirement(ratio, 'AA', 'large');   // true (>= 3.0)
meetsContrastRequirement(ratio, 'AAA', 'normal'); // true (>= 7.0)

// Check element's text contrast
const { ratio, passes, foreground, background } = checkElementContrast(textElement, 'AA');

// Get effective background (handles transparency)
const bgColor = getEffectiveBackgroundColor(element);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Announcement Queue</h2>
      <p>Queue multiple announcements for screen readers:</p>

      <div class="code-block">
        <pre><code>import { createAnnouncementQueue } from 'pulse-js-framework/runtime/a11y';

const queue = createAnnouncementQueue({ minDelay: 500 });

// Queue messages (processed in order)
queue.add('File uploaded');
queue.add('Processing complete');
queue.add('Error occurred', { priority: 'assertive' });

queue.queueLength.get(); // Number of queued messages
queue.clear();           // Clear the queue</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Focus Utilities</h2>
      <p>Additional focus management helpers:</p>

      <div class="code-block">
        <pre><code>import { onEscapeKey, createFocusVisibleTracker, getAccessibleName } from 'pulse-js-framework/runtime/a11y';

// Escape key handler for modals
const removeEscape = onEscapeKey(dialog, () => closeDialog());

// Detect keyboard vs mouse navigation
const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
effect(() => {
  if (isKeyboardUser.get()) {
    document.body.classList.add('keyboard-user');
  }
});

// Get element's accessible name
const name = getAccessibleName(button); // aria-label, text content, etc.</code></pre>
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
        <caption>CLI lint rules for accessibility validation</caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Description</th>
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

      <h3>Runtime Validation Rules</h3>
      <p>Additional rules checked by <code>validateA11y()</code>:</p>

      <table class="doc-table">
        <caption>Runtime validation rules checked by validateA11y()</caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">Severity</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>duplicate-id</code></td><td>Error</td><td>Duplicate ID attributes found</td></tr>
          <tr><td><code>missing-main</code></td><td>Warning</td><td>Page missing &lt;main&gt; landmark</td></tr>
          <tr><td><code>nested-interactive</code></td><td>Error</td><td>Interactive elements nested inside each other</td></tr>
          <tr><td><code>missing-lang</code></td><td>Warning</td><td>Missing lang attribute on &lt;html&gt;</td></tr>
          <tr><td><code>touch-target-size</code></td><td>Warning</td><td>Touch target smaller than 24x24px (WCAG 2.2)</td></tr>
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

    <div class="next-section"></div>
  `;

  // Attach click handler programmatically for navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary', t('accessibility.nextSecurity'));
  nextBtn.onclick = () => navigateLocale('/security');
  nextSection.appendChild(nextBtn);

  return page;
}
