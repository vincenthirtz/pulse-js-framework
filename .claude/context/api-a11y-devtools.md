# API Reference: Accessibility & DevTools

> Load this context file when working on accessibility features, ARIA helpers, or development tools.

### DevTools (runtime/devtools.js)

```javascript
import {
  enableDevTools, disableDevTools,
  trackedPulse, trackedEffect,
  getDiagnostics, getEffectStats, getPulseList,
  getDependencyGraph, exportGraphAsDot,
  takeSnapshot, getHistory, travelTo, back, forward,
  profile, mark,
  // Auto-timeline
  enableAutoTimeline, disableAutoTimeline, isAutoTimelineEnabled,
  // A11y Audit
  runA11yAudit, enableA11yAudit, disableA11yAudit,
  getA11yIssues, getA11yStats, exportA11yReport,
  toggleA11yHighlights
} from 'pulse-js-framework/runtime/devtools';

// Enable dev tools (exposes window.__PULSE_DEVTOOLS__)
enableDevTools({ logUpdates: true, warnOnSlowEffects: true });

// Enable auto-timeline (records all pulse changes automatically)
enableDevTools({
  autoTimeline: true,        // Enable automatic timeline recording
  timelineDebounce: 100      // Debounce interval in ms (default: 100)
});

// Or enable/disable auto-timeline separately
enableAutoTimeline({ debounce: 50 });  // Enable with custom debounce
disableAutoTimeline();                  // Disable auto-recording
isAutoTimelineEnabled();                // Check if enabled

// Tracked pulses (auto-snapshot on change)
const count = trackedPulse(0, 'count');
const user = trackedPulse(null, 'user');

// Tracked effects (performance monitoring)
trackedEffect(() => {
  console.log('Count:', count.get());
}, 'log-count');

// Diagnostics
getDiagnostics();      // { pulseCount, effectCount, avgEffectTime, ... }
getEffectStats();      // [{ id, name, runCount, avgTime }]
getPulseList();        // [{ id, name, value, subscriberCount }]

// Dependency graph (for visualization)
const graph = getDependencyGraph();  // { nodes, edges }
const dot = exportGraphAsDot();      // Graphviz DOT format

// Time-travel debugging
takeSnapshot('user-login');          // Save current state
getHistory();                        // Get all snapshots
travelTo(0);                         // Restore to snapshot index
back();                              // Go back one step
forward();                           // Go forward one step

// Performance profiling
profile('data-processing', () => processLargeDataset());
const m = mark('fetch');
await fetch('/api/data');
m.end();  // Logs duration

// === A11y Audit Mode ===

// Run one-time accessibility audit
const result = runA11yAudit();
console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`);

// Enable continuous a11y auditing
enableA11yAudit({
  autoAudit: true,           // Periodic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  breakOnError: false,       // Debugger breakpoint on errors
  watchMutations: true       // Re-audit on DOM changes
});

// Get current issues and statistics
const issues = getA11yIssues();       // Array of a11y issues
const stats = getA11yStats();         // { totalIssues, errorCount, warningCount, ... }

// Toggle visual highlighting
toggleA11yHighlights(true);           // Show highlights
toggleA11yHighlights(false);          // Hide highlights
toggleA11yHighlights();               // Toggle

// Export audit report
const json = exportA11yReport('json'); // JSON format
const csv = exportA11yReport('csv');   // CSV format
const html = exportA11yReport('html'); // Standalone HTML report

// Disable a11y audit mode
disableA11yAudit();
```


### A11y (runtime/a11y.js)

```javascript
import {
  // Announcements (screen readers)
  announce, announcePolite, announceAssertive, createLiveAnnouncer, createAnnouncementQueue,
  // Focus management
  trapFocus, focusFirst, focusLast, saveFocus, restoreFocus, getFocusableElements,
  onEscapeKey, createFocusVisibleTracker,
  // Skip links
  createSkipLink, installSkipLinks,
  // User preferences
  prefersReducedMotion, prefersColorScheme, prefersHighContrast,
  prefersReducedTransparency, forcedColorsMode, prefersContrast, createPreferences,
  // ARIA helpers
  setAriaAttributes, createDisclosure, createTabs, createRovingTabindex,
  // ARIA widgets
  createModal, createTooltip, createAccordion, createMenu,
  // Color contrast
  getContrastRatio, meetsContrastRequirement, getEffectiveBackgroundColor, checkElementContrast,
  // Validation
  validateA11y, logA11yIssues, highlightA11yIssues,
  // Utilities
  generateId, getAccessibleName, isAccessiblyHidden, makeInert, srOnly
} from 'pulse-js-framework/runtime/a11y';

// Screen reader announcements
announce('Item saved successfully');                    // Polite (default)
announcePolite('Loading complete');                     // Waits for user
announceAssertive('Error: Connection lost');            // Interrupts immediately

// Reactive announcer (announces on value change)
const cleanup = createLiveAnnouncer(
  () => `${items.get().length} items in cart`,
  { priority: 'polite', clearAfter: 1000 }
);

// Announcement queue (handle multiple announcements)
const queue = createAnnouncementQueue({ minDelay: 500 });
queue.add('First message');
queue.add('Second message', { priority: 'assertive' });
queue.queueLength.get();  // Number of queued messages
queue.clear();            // Clear the queue

// Focus management for modals/dialogs
const release = trapFocus(modalElement, {
  autoFocus: true,           // Focus first element
  returnFocus: true,         // Return focus on release
  initialFocus: closeButton  // Custom initial focus
});
// Later: release() to remove trap

focusFirst(container);       // Focus first focusable element
focusLast(container);        // Focus last focusable element
saveFocus();                 // Push current focus to stack
restoreFocus();              // Pop and restore focus
getFocusableElements(el);    // Get all focusable children

// Escape key handler (for modals/dialogs)
const removeEscape = onEscapeKey(dialog, () => closeDialog());

// Focus-visible detection (keyboard vs mouse)
const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
effect(() => {
  if (isKeyboardUser.get()) document.body.classList.add('keyboard-user');
});

// Skip links for keyboard navigation
installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'navigation', text: 'Skip to navigation' }
]);

// User preferences (reactive)
if (prefersReducedMotion()) { /* Disable animations */ }
if (prefersReducedTransparency()) { /* Use solid backgrounds */ }
if (forcedColorsMode() === 'active') { /* Windows High Contrast Mode */ }
const contrastPref = prefersContrast();  // 'no-preference' | 'more' | 'less' | 'custom'

const prefs = createPreferences();    // Reactive pulses
effect(() => {
  if (prefs.reducedMotion.get()) disableAnimations();
  if (prefs.forcedColors.get() === 'active') useForcedColors();
  applyTheme(prefs.colorScheme.get());
});

// ARIA disclosure widget (accordion, dropdown)
const { expanded, toggle, open, close } = createDisclosure(
  triggerButton,
  contentPanel,
  { defaultOpen: false, onToggle: (isOpen) => console.log(isOpen) }
);

// ARIA tabs
const tabs = createTabs(tablistElement, {
  defaultIndex: 0,
  orientation: 'horizontal',  // or 'vertical'
  onSelect: (index) => console.log('Selected tab:', index)
});
tabs.select(2);  // Programmatic selection

// Roving tabindex (arrow key navigation)
const cleanup = createRovingTabindex(menuElement, {
  selector: '[role="menuitem"]',
  orientation: 'vertical',
  loop: true,
  onSelect: (el, index) => el.click()
});

// === NEW ARIA Widgets ===

// Modal dialog (composes trapFocus, onEscapeKey, makeInert)
const modal = createModal(dialogElement, {
  labelledBy: 'modal-title',
  describedBy: 'modal-description',
  closeOnBackdropClick: true,
  onClose: () => console.log('Modal closed')
});
modal.open();
modal.close();
modal.isOpen.get();  // Reactive state

// Tooltip
const tooltip = createTooltip(trigger, tooltipEl, {
  showDelay: 500,
  hideDelay: 100
});
tooltip.isVisible.get();  // Reactive state
tooltip.cleanup();        // Remove listeners

// Accordion (composes multiple disclosures)
const accordion = createAccordion(container, {
  triggerSelector: '[data-accordion-trigger]',
  panelSelector: '[data-accordion-panel]',
  allowMultiple: false,
  defaultOpen: 0
});
accordion.open(1);
accordion.closeAll();
accordion.openIndices.get();  // [0] - Reactive

// Dropdown menu
const menu = createMenu(menuButton, menuList, {
  itemSelector: '[role="menuitem"]',
  closeOnSelect: true,
  onSelect: (el, index) => console.log('Selected:', el)
});
menu.open();
menu.toggle();
menu.cleanup();

// === Color Contrast ===

// Calculate contrast ratio (WCAG)
const ratio = getContrastRatio('#333', '#fff');  // 12.63
meetsContrastRequirement(ratio, 'AA', 'normal'); // true (>= 4.5)
meetsContrastRequirement(ratio, 'AAA', 'large'); // true (>= 4.5)

// Check element contrast
const { ratio, passes, foreground, background } = checkElementContrast(textElement, 'AA');
const bgColor = getEffectiveBackgroundColor(element);  // Handles transparency

// Accessibility validation
const issues = validateA11y(document.body);
logA11yIssues(issues);              // Log to console
const cleanup = highlightA11yIssues(issues);  // Visual overlay

// New validation rules:
// - duplicate-id: Duplicate ID attributes
// - missing-main: No <main> landmark
// - nested-interactive: Interactive elements inside other interactive elements
// - missing-lang: No lang attribute on <html>
// - touch-target-size: Touch targets smaller than 24x24px (WCAG 2.2)

// Utilities
const id = generateId('modal');     // 'modal-1234567890-abc123'
const name = getAccessibleName(el); // Computes accessible name (aria-label, text, etc.)
isAccessiblyHidden(element);        // Check if hidden from a11y tree
const restore = makeInert(element); // Set inert + aria-hidden
const span = srOnly('Screen reader only text');  // Visually hidden
setAriaAttributes(element, { label: 'Close', expanded: true });
```


## Accessibility

Pulse is designed with accessibility as a core feature, not an afterthought. The framework provides multiple layers of a11y support:

### Three Layers of Accessibility

| Layer | Feature | Description |
|-------|---------|-------------|
| **Runtime** | Auto-ARIA | `el()` automatically applies correct ARIA attributes based on element type and role |
| **Runtime** | a11y.js | Full a11y toolkit: focus management, announcements, preferences, validation |
| **Compiler** | Directives | `@a11y`, `@live`, `@focusTrap`, `@srOnly` in .pulse files |
| **DevTools** | Audit Mode | Real-time a11y validation with visual highlighting and reports |
| **CLI** | Lint Rules | 10 a11y lint rules catch issues at build time |

### Auto-ARIA (Automatic)

The `el()` function automatically applies ARIA attributes based on element semantics:

```javascript
// Dialogs get modal indication
el('dialog')              // → role="dialog" aria-modal="true"

// Buttons get explicit type
el('button')              // → type="button"

// Links without href become buttons
el('a')                   // → role="button" tabindex="0"

// Interactive roles get required states
el('div[role=checkbox]')  // → aria-checked="false"
el('div[role=slider]')    // → aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
el('div[role=combobox]')  // → aria-expanded="false"
el('div[role=tab]')       // → aria-selected="false"

// Warnings in console for missing accessibility
el('img')                 // ⚠️ "A11y: <img> missing alt attribute"
el('input')               // ⚠️ "A11y: <input> should have aria-label..."
el('nav')                 // ⚠️ "A11y: <nav> should have aria-label..."
```

### Quick Start: Making Accessible Components

```javascript
import { el, on } from 'pulse-js-framework/runtime';
import { trapFocus, announce, srOnly } from 'pulse-js-framework/runtime/a11y';

// Accessible modal dialog
function Modal({ title, onClose, children }) {
  const dialog = el('dialog[aria-labelledby=modal-title]',
    el('h2#modal-title', title),
    el('.modal-content', children),
    el('button[aria-label=Close modal]', '×', { onclick: onClose })
  );

  // Trap focus inside modal
  const release = trapFocus(dialog, { autoFocus: true, returnFocus: true });

  // Announce to screen readers
  announce(`${title} dialog opened`);

  return { dialog, close: () => { release(); onClose(); } };
}

// Screen reader only content
el('a[href=/dashboard]',
  el('span.icon', '🏠'),
  srOnly('Go to dashboard')  // Visible only to screen readers
);
```

### .pulse DSL Format

```pulse
@page Counter

// Import components
import Button from './Button.pulse'
import { Icon } from './icons.pulse'

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    Button @click(count++) {
      Icon "plus"
      "Increment"
    }
    // Slot for component composition
    slot "actions"
    slot { "Default content" }
  }
}

style {
  // Styles are automatically scoped
  .counter { padding: 20px }

  // SASS/SCSS syntax works if sass is installed
  $primary: #646cff;
  .btn {
    background: $primary;
    &:hover { opacity: 0.8; }
  }
}
```

**Compiler features:**
- `import` statements (default, named, namespace)
- `slot` / `slot "name"` for content projection
- CSS scoping with unique class prefixes
- Error messages include line:column
- Source map generation for debugging
- Accessibility directives (`@a11y`, `@live`, `@focusTrap`, `@srOnly`)
- Dynamic attributes (`[value={expr}]`) for reactive form bindings
- Event handlers have access to `event` object (`@input(value = event.target.value)`)
- **CSS preprocessor support** - SASS/SCSS and LESS automatically compiled if `sass` or `less` packages are installed

### Accessibility Directives

The .pulse compiler supports built-in accessibility directives that compile to runtime a11y calls:

```pulse
view {
  // @a11y - Set ARIA attributes
  div @a11y(role=dialog, label="Modal window", modal=true) {
    h2 "Settings"
    p "Configure your preferences"
  }

  // @live - Create live region for screen reader announcements
  .status @live(polite) {
    "Status: {status}"
  }

  .error @live(assertive) {
    "Error: {errorMessage}"
  }

  // @focusTrap - Trap focus within element (for modals/dialogs)
  .modal @focusTrap(autoFocus=true, returnFocus=true) {
    input
    button "Submit"
    button "Cancel"
  }

  // @srOnly - Visually hidden text (screen readers only)
  span @srOnly "Skip to main content"

  // Combined directives
  .dialog @a11y(role=dialog, label="Confirm delete") @focusTrap {
    p "Are you sure?"
    button @a11y(label="Confirm deletion") "Delete"
    button "Cancel"
  }
}
```

**Directive reference:**

| Directive | Purpose | Compiles to |
|-----------|---------|-------------|
| `@a11y(role=dialog, label="...")` | Set ARIA attributes | `el('div[role=dialog][aria-label=...]')` |
| `@live(polite)` | Live region (polite) | `el('div[aria-live=polite][aria-atomic=true]')` |
| `@live(assertive)` | Live region (urgent) | `el('div[aria-live=assertive][aria-atomic=true]')` |
| `@focusTrap` | Trap keyboard focus | `trapFocus(el('div'), {})` |
| `@focusTrap(autoFocus=true)` | With options | `trapFocus(el('div'), { autoFocus: true })` |
| `@srOnly` | Screen reader only | `srOnly(content)` |

