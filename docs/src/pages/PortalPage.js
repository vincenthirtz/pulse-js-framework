/**
 * Pulse Documentation - Portal Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function PortalPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="portal.title"></h1>
    <p class="page-intro" data-i18n="portal.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="portal.quickStart"></h2>
      <p data-i18n="portal.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el } from 'pulse-js-framework/runtime';

// Render a tooltip into document.body instead of the parent component
const marker = portal(
  el('.tooltip', 'I appear at the end of body!'),
  'body'
);

// Later, remove the portaled content
marker.dispose();</code></pre>
      </div>
      <div class="info-box">
        <p>Portals let you render children into a DOM node that exists outside
        the parent component's hierarchy. This is useful for modals, tooltips,
        toasts, and dropdown menus that need to escape overflow or z-index
        constraints.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.apiTitle"></h2>
      <p data-i18n="portal.apiDesc"></p>
      <div class="code-block">
        <pre><code>portal(children, target, options?) => Comment (marker node)

// Parameters:
//   children  - Node, Node[], or Function (static or reactive)
//   target    - CSS selector string or HTMLElement
//   options   - Optional configuration object

// Options:
//   key: string          - Unique key for multiple portals to same target
//   prepend: boolean     - Insert at beginning of target (default: false)
//   onMount: Function    - Called when children are mounted to target
//   onUnmount: Function  - Called when children are removed from target

// Returns a Comment marker node with methods:
//   marker.dispose()          - Remove all portaled nodes and stop reactivity
//   marker.moveTo(newTarget)  - Move portaled content to a different target
//   marker.getNodes()         - Get array of currently portaled nodes</code></pre>
      </div>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>children</code></td>
              <td><code>Node | Node[] | Function</code></td>
              <td>Content to render. When a function, it becomes reactive and re-renders when dependencies change.</td>
            </tr>
            <tr>
              <td><code>target</code></td>
              <td><code>string | HTMLElement</code></td>
              <td>Where to mount the content. A CSS selector (e.g. \`'body'\`, \`'#modal-root'\`) or a direct DOM element reference.</td>
            </tr>
            <tr>
              <td><code>options.key</code></td>
              <td><code>string</code></td>
              <td>Unique identifier when rendering multiple portals to the same target. Used in the comment marker text.</td>
            </tr>
            <tr>
              <td><code>options.prepend</code></td>
              <td><code>boolean</code></td>
              <td>If \`true\`, content is inserted at the beginning of the target instead of appended. Default: \`false\`.</td>
            </tr>
            <tr>
              <td><code>options.onMount</code></td>
              <td><code>Function</code></td>
              <td>Callback invoked after children are mounted into the target.</td>
            </tr>
            <tr>
              <td><code>options.onUnmount</code></td>
              <td><code>Function</code></td>
              <td>Callback invoked after children are removed from the target.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.staticContent"></h2>
      <p data-i18n="portal.staticContentDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el } from 'pulse-js-framework/runtime';

// Single element
portal(
  el('.overlay', 'This renders in #overlay-root'),
  '#overlay-root'
);

// Array of elements
portal(
  [
    el('h2', 'Portal Title'),
    el('p', 'Portal content paragraph'),
    el('button', 'Close')
  ],
  '#modal-root'
);

// Prepend to target (insert before existing children)
portal(
  el('.banner', 'Important announcement!'),
  'body',
  { prepend: true }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.reactiveContent"></h2>
      <p data-i18n="portal.reactiveContentDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el, pulse, effect } from 'pulse-js-framework/runtime';

const message = pulse('Hello');
const count = pulse(0);

// Pass a function to make the portal reactive.
// The function re-runs whenever its dependencies change.
const marker = portal(
  () => el('.notification', [
    el('p', \`Message: \${message.get()}\`),
    el('span.badge', \`Count: \${count.get()}\`)
  ]),
  '#toast-container'
);

// Updating the pulse causes the portal to re-render
message.set('Updated!');
count.set(5);

// The portal content in #toast-container automatically updates</code></pre>
      </div>
      <div class="info-box">
        <p>When \`children\` is a function, the portal wraps it in an
        \`effect()\`. Each time a tracked pulse changes, the previous
        nodes are removed (triggering \`onUnmount\` if set) and the
        function is called again to produce new nodes.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.moveTo"></h2>
      <p data-i18n="portal.moveToDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el } from 'pulse-js-framework/runtime';

// Create portal in sidebar
const marker = portal(
  el('.widget', 'Draggable widget'),
  '#sidebar'
);

// Move to main content area
marker.moveTo('#main-content');

// Move to footer
marker.moveTo('#footer');

// moveTo() accepts a CSS selector or HTMLElement
const footerEl = document.getElementById('footer');
marker.moveTo(footerEl);

// Notes:
// - Existing nodes are removed from old target (no unmount callback)
// - Nodes are re-mounted in the new target (mount callback fires)
// - If the new target is not found, a warning is logged
// - Calling moveTo() on a disposed portal does nothing</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.multiplePortals"></h2>
      <p data-i18n="portal.multiplePortalsDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el } from 'pulse-js-framework/runtime';

// Use the key option to identify portals targeting the same container
const successPortal = portal(
  el('.toast.success', 'Saved successfully!'),
  '#toast-root',
  { key: 'success-toast' }
);

const errorPortal = portal(
  el('.toast.error', 'Something went wrong'),
  '#toast-root',
  { key: 'error-toast' }
);

const infoPortal = portal(
  el('.toast.info', 'New update available'),
  '#toast-root',
  { key: 'info-toast' }
);

// Each portal can be disposed independently
successPortal.dispose();

// Inspect nodes from a specific portal
console.log(errorPortal.getNodes()); // [div.toast.error]

// The key appears in the HTML comment marker:
// &lt;!-- portal:success-toast --&gt;
// &lt;!-- portal:error-toast --&gt;
// &lt;!-- portal:info-toast --&gt;</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.modalPattern"></h2>
      <p data-i18n="portal.modalPatternDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el, pulse } from 'pulse-js-framework/runtime';
import { trapFocus, announce } from 'pulse-js-framework/runtime/a11y';

const isOpen = pulse(false);
let modalPortal = null;

function openModal() {
  isOpen.set(true);

  modalPortal = portal(
    () => {
      const backdrop = el('.modal-backdrop', {
        onclick: (e) => {
          if (e.target === backdrop) closeModal();
        }
      }, [
        el('.modal[role=dialog][aria-modal=true][aria-labelledby=modal-title]', [
          el('h2#modal-title', 'Confirm Action'),
          el('p', 'Are you sure you want to proceed?'),
          el('.modal-actions', [
            el('button.btn-primary', 'Confirm', {
              onclick: () => {
                handleConfirm();
                closeModal();
              }
            }),
            el('button.btn-secondary', 'Cancel', {
              onclick: closeModal
            })
          ])
        ])
      ]);

      return backdrop;
    },
    'body',
    {
      key: 'confirm-modal',
      onMount: () => {
        // Trap focus inside the modal for accessibility
        const dialog = document.querySelector('.modal[role=dialog]');
        if (dialog) trapFocus(dialog, { autoFocus: true });
        announce('Confirm action dialog opened');
      },
      onUnmount: () => {
        announce('Dialog closed');
      }
    }
  );
}

function closeModal() {
  isOpen.set(false);
  if (modalPortal) {
    modalPortal.dispose();
    modalPortal = null;
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.toastNotifications"></h2>
      <p data-i18n="portal.toastNotificationsDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el, pulse } from 'pulse-js-framework/runtime';

const toasts = pulse([]);

function addToast(message, type = 'info', duration = 3000) {
  const id = Date.now();
  toasts.update(t => [...t, { id, message, type }]);

  // Auto-dismiss after duration
  setTimeout(() => removeToast(id), duration);
  return id;
}

function removeToast(id) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

// Reactive portal that updates when toasts change
const toastPortal = portal(
  () => el('.toast-container',
    toasts.get().map(toast =>
      el(\`.toast.toast-\${toast.type}\`, { key: toast.id }, [
        el('span', toast.message),
        el('button.toast-close', { onclick: () => removeToast(toast.id) }, 'x')
      ])
    )
  ),
  'body',
  { key: 'toast-system' }
);

// Usage
addToast('File saved successfully', 'success');
addToast('Network error occurred', 'error', 5000);
addToast('New version available', 'info');</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.errorBoundary"></h2>
      <p data-i18n="portal.errorBoundaryDesc"></p>
      <div class="code-block">
        <pre><code>import { errorBoundary } from 'pulse-js-framework/runtime/dom-advanced';
import { el, pulse } from 'pulse-js-framework/runtime';

// errorBoundary(children, fallback) => DocumentFragment
//
// Parameters:
//   children - Node, Node[], or Function (can throw errors)
//   fallback - Node, Function(error), or null
//
// Returns a DocumentFragment with error-protected content.
// The marker node inside exposes marker.resetError() to retry.</code></pre>
      </div>
      <div class="code-block">
        <pre><code>// Basic usage: catch rendering errors gracefully
const content = errorBoundary(
  // Children that might throw
  () => {
    const data = riskyOperation();
    return el('.content', data.toString());
  },
  // Fallback UI shown on error (receives the error object)
  (error) => el('.error-panel', [
    el('h3', 'Something went wrong'),
    el('p', \`Error: \${error.message}\`),
    el('button', 'Retry', {
      onclick: () => {
        // Reset the error boundary to try rendering again
        content.querySelector('').resetError?.();
      }
    })
  ])
);

document.getElementById('app').appendChild(content);</code></pre>
      </div>
      <div class="code-block">
        <pre><code>// Reactive error boundary with pulse-driven content
const userId = pulse(1);

const userProfile = errorBoundary(
  () => {
    const id = userId.get();
    if (id < 0) throw new Error('Invalid user ID');
    return el('.profile', \`User #\${id}\`);
  },
  (error) => el('.fallback', [
    el('p', \`Failed to load profile: \${error.message}\`),
    el('button', 'Reset', { onclick: () => userId.set(1) })
  ])
);

// When userId is set to -1, the fallback renders instead of crashing
userId.set(-1); // Shows: "Failed to load profile: Invalid user ID"</code></pre>
      </div>
      <div class="info-box">
        <p>The \`errorBoundary\` uses an internal \`pulse(null)\` to track
        error state. When children throw during rendering, the error is
        caught and the fallback is rendered. Calling \`resetError()\` on
        the internal marker sets the error back to \`null\`, triggering a
        fresh render attempt.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="portal.cleanup"></h2>
      <p data-i18n="portal.cleanupDesc"></p>
      <div class="code-block">
        <pre><code>import { portal } from 'pulse-js-framework/runtime/dom-advanced';
import { el } from 'pulse-js-framework/runtime';

// 1. Manual disposal
const marker = portal(el('.popup', 'Hello'), '#popup-root');
marker.dispose(); // Removes all nodes, stops reactive effects

// 2. Lifecycle callbacks for resource cleanup
const marker2 = portal(
  el('.live-chart', 'Updating...'),
  '#chart-root',
  {
    onMount: () => {
      console.log('Chart mounted - start polling');
      // Initialize chart library, start data polling, etc.
    },
    onUnmount: () => {
      console.log('Chart unmounted - stop polling');
      // Destroy chart instance, stop polling, free memory
    }
  }
);

// 3. Automatic cleanup via parent effect cascade
// When a parent effect is disposed, the portal's internal
// _pulseUnmount callback triggers dispose() automatically.
import { effect } from 'pulse-js-framework/runtime';

const disposeEffect = effect(() => {
  const show = isVisible.get();
  if (show) {
    // Portal is created inside an effect
    const p = portal(el('.tip', 'Visible!'), 'body');
    // When this effect re-runs or is disposed,
    // the portal's _pulseUnmount handler calls dispose()
    return () => p.dispose();
  }
});

// Disposing the outer effect also disposes the portal
disposeEffect();

// 4. Inspecting current state
const marker3 = portal(
  [el('span', 'A'), el('span', 'B')],
  '#target'
);
console.log(marker3.getNodes()); // [span, span]
console.log(marker3.getNodes().length); // 2

marker3.dispose();
console.log(marker3.getNodes()); // []

// 5. Target not found - safe no-op
const safe = portal(el('div', 'test'), '#nonexistent');
safe.dispose();         // No error
safe.moveTo('#other');  // No error
safe.getNodes();        // []</code></pre>
      </div>
      <div class="info-box">
        <p>Portals are designed to be memory-safe. If the target element
        is not found, the portal returns a no-op marker with empty
        \`dispose()\`, \`moveTo()\`, and \`getNodes()\` methods. Calling
        \`dispose()\` multiple times is also safe and has no effect
        after the first call.</p>
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
