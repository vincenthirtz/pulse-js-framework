# Accessibility in Pulse

Pulse is designed with accessibility as a core feature. This guide covers all accessibility features across the framework.

## Table of Contents

- [Overview](#overview)
- [Auto-ARIA (Automatic)](#auto-aria-automatic)
- [Runtime A11y API](#runtime-a11y-api)
- [DSL Directives](#dsl-directives)
- [DevTools Audit](#devtools-audit)
- [Lint Rules](#lint-rules)
- [Best Practices](#best-practices)

---

## Overview

Pulse provides accessibility support at multiple levels:

| Layer | Feature | Description |
|-------|---------|-------------|
| **Runtime** | Auto-ARIA | `el()` automatically applies correct ARIA attributes |
| **Runtime** | a11y.js | Focus management, announcements, preferences, validation |
| **Compiler** | Directives | `@a11y`, `@live`, `@focusTrap`, `@srOnly` in .pulse files |
| **DevTools** | Audit Mode | Real-time a11y validation with visual highlighting |
| **CLI** | Lint Rules | 10 a11y rules catch issues at build time |

---

## Auto-ARIA (Automatic)

The `el()` function automatically applies ARIA attributes based on element semantics. This is enabled by default.

```javascript
import { el, configureA11y } from 'pulse-js-framework/runtime';

// Dialogs get modal indication
el('dialog')              // → role="dialog" aria-modal="true"

// Buttons get explicit type
el('button')              // → type="button"

// Links without href become accessible buttons
el('a')                   // → role="button" tabindex="0"

// Interactive roles get required states
el('div[role=checkbox]')  // → aria-checked="false"
el('div[role=slider]')    // → aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
el('div[role=combobox]')  // → aria-expanded="false"
el('div[role=tab]')       // → aria-selected="false"
el('div[role=tablist]')   // → aria-orientation="horizontal"
```

### Console Warnings

Auto-ARIA warns about common accessibility issues:

```javascript
el('img')     // ⚠️ "A11y: <img> missing alt attribute"
el('input')   // ⚠️ "A11y: <input> should have aria-label..."
el('nav')     // ⚠️ "A11y: <nav> should have aria-label..."
el('progress') // ⚠️ "A11y: <progress> should have aria-label..."
```

### Configuration

```javascript
import { configureA11y } from 'pulse-js-framework/runtime';

configureA11y({
  enabled: true,           // Enable/disable all auto-ARIA (default: true)
  autoAria: true,          // Auto-apply ARIA to semantic elements (default: true)
  warnMissingAlt: true,    // Warn when <img> missing alt (default: true)
  warnMissingLabel: true   // Warn when form controls missing labels (default: true)
});

// Disable all auto-ARIA
configureA11y({ enabled: false });
```

---

## Runtime A11y API

```javascript
import {
  // Announcements
  announce, announcePolite, announceAssertive, createLiveAnnouncer,
  // Focus management
  trapFocus, focusFirst, focusLast, saveFocus, restoreFocus, getFocusableElements,
  // Skip links
  createSkipLink, installSkipLinks,
  // User preferences
  prefersReducedMotion, prefersColorScheme, prefersHighContrast, createPreferences,
  // ARIA helpers
  setAriaAttributes, createDisclosure, createTabs, createRovingTabindex,
  // Validation
  validateA11y, logA11yIssues, highlightA11yIssues,
  // Utilities
  generateId, isAccessiblyHidden, makeInert, srOnly
} from 'pulse-js-framework/runtime/a11y';
```

### Screen Reader Announcements

```javascript
// Basic announcements
announce('Item saved successfully');           // Polite (default)
announcePolite('Loading complete');            // Waits for user pause
announceAssertive('Error: Connection lost');   // Interrupts immediately

// Reactive announcer (announces on pulse change)
const cleanup = createLiveAnnouncer(
  () => `${items.get().length} items in cart`,
  { priority: 'polite', clearAfter: 1000 }
);
// Call cleanup() to stop
```

### Focus Management

```javascript
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
restoreFocus();              // Pop and restore focus

// Get all focusable elements
const focusable = getFocusableElements(container);
```

### Skip Links

```javascript
// Install skip links for keyboard navigation
installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'navigation', text: 'Skip to navigation' },
  { target: 'search', text: 'Skip to search' }
]);

// Create individual skip link
const link = createSkipLink('main', 'Skip to main content');
document.body.prepend(link);
```

### User Preferences

```javascript
// Check preferences (non-reactive)
if (prefersReducedMotion()) {
  disableAnimations();
}

const scheme = prefersColorScheme();  // 'light' | 'dark' | 'no-preference'
const contrast = prefersHighContrast(); // boolean

// Reactive preferences (pulses)
const prefs = createPreferences();
effect(() => {
  if (prefs.reducedMotion.get()) {
    disableAnimations();
  }
  applyTheme(prefs.colorScheme.get());
});
```

### ARIA Widgets

```javascript
// Disclosure (accordion, dropdown)
const { expanded, toggle, open, close } = createDisclosure(
  triggerButton,
  contentPanel,
  {
    defaultOpen: false,
    onToggle: (isOpen) => console.log('Toggled:', isOpen)
  }
);

// Tabs
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
```

### Validation

```javascript
// Validate DOM tree
const issues = validateA11y(document.body);

// Log issues to console
logA11yIssues(issues);

// Visual highlighting
const cleanup = highlightA11yIssues(issues);
// Call cleanup() to remove highlights
```

### Utilities

```javascript
// Generate unique IDs
const id = generateId('modal');  // 'modal-1234567890-abc123'

// Check if hidden from a11y tree
if (isAccessiblyHidden(element)) {
  // Element is hidden from screen readers
}

// Make element inert (for modal backgrounds)
const restore = makeInert(backgroundElement);
// Call restore() to remove inert

// Screen reader only content
const span = srOnly('Screen reader only text');

// Set multiple ARIA attributes
setAriaAttributes(element, {
  label: 'Close dialog',
  expanded: true,
  controls: 'panel-1'
});
```

---

## DSL Directives

The .pulse compiler supports built-in accessibility directives.

### @a11y - ARIA Attributes

```pulse
view {
  // Set ARIA attributes on any element
  div @a11y(role=dialog, label="Settings", modal=true) {
    h2 "Settings"
    p "Configure your preferences"
  }

  // Short form - label becomes aria-label
  button @a11y(label="Close menu") "×"

  // Multiple attributes
  .slider @a11y(
    role=slider,
    valuenow=50,
    valuemin=0,
    valuemax=100,
    label="Volume"
  )
}
```

**Compiled output:**
```javascript
el('div[role=dialog][aria-label=Settings][aria-modal=true]', ...)
```

### @live - Live Regions

```pulse
view {
  // Polite announcement (waits for user pause)
  .status @live(polite) {
    "Status: {status}"
  }

  // Assertive announcement (interrupts immediately)
  .error @live(assertive) {
    "Error: {errorMessage}"
  }
}
```

**Compiled output:**
```javascript
el('.status[aria-live=polite][aria-atomic=true]', ...)
```

### @focusTrap - Focus Trapping

```pulse
view {
  // Basic focus trap
  .modal @focusTrap {
    input
    button "Submit"
    button "Cancel"
  }

  // With options
  .dialog @focusTrap(autoFocus=true, returnFocus=true) {
    h2 "Confirm"
    p "Are you sure?"
    button "Yes"
    button "No"
  }
}
```

**Compiled output:**
```javascript
trapFocus(el('.modal', ...), {})
trapFocus(el('.dialog', ...), { autoFocus: true, returnFocus: true })
```

### @srOnly - Screen Reader Only

```pulse
view {
  // Visually hidden, accessible to screen readers
  span @srOnly "Skip to main content"

  // Icon with accessible label
  a[href="/"] {
    span.icon "🏠"
    span @srOnly "Go to homepage"
  }
}
```

**Compiled output:**
```javascript
srOnly('Skip to main content')
```

### Combined Directives

```pulse
view {
  // Multiple directives on one element
  .dialog @a11y(role=dialog, label="Confirm delete") @focusTrap {
    p "Are you sure you want to delete this item?"
    button @a11y(label="Confirm deletion") "Delete"
    button "Cancel"
  }
}
```

---

## DevTools Audit

The Pulse DevTools include a comprehensive accessibility audit mode.

```javascript
import {
  enableDevTools,
  runA11yAudit,
  enableA11yAudit,
  disableA11yAudit,
  getA11yIssues,
  getA11yStats,
  toggleA11yHighlights,
  exportA11yReport
} from 'pulse-js-framework/runtime/devtools';

// Enable dev tools first
enableDevTools();
```

### One-Time Audit

```javascript
const result = runA11yAudit();
console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`);
console.log('Audit time:', result.auditTime, 'ms');

// Audit specific element
runA11yAudit(document.getElementById('my-component'));
```

### Continuous Audit Mode

```javascript
enableA11yAudit({
  autoAudit: true,           // Periodic automatic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  breakOnError: false,       // Debugger breakpoint on errors
  watchMutations: true       // Re-audit on DOM changes
});

// Disable when done
disableA11yAudit();
```

### Issue Management

```javascript
// Get current issues
const issues = getA11yIssues();
issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.rule}: ${issue.message}`);
});

// Get statistics
const stats = getA11yStats();
// {
//   totalIssues: 5,
//   errorCount: 2,
//   warningCount: 3,
//   issuesByRule: { 'img-alt': 2, 'button-text': 3 },
//   auditCount: 10,
//   lastAuditTime: 1699999999999,
//   isWatching: true,
//   isAutoAuditing: true
// }

// Toggle visual highlighting
toggleA11yHighlights(true);   // Show
toggleA11yHighlights(false);  // Hide
toggleA11yHighlights();       // Toggle
```

### Export Reports

```javascript
// JSON format
const jsonReport = exportA11yReport('json');

// CSV format
const csvReport = exportA11yReport('csv');

// Standalone HTML report
const htmlReport = exportA11yReport('html');

// Save HTML report
const blob = new Blob([htmlReport], { type: 'text/html' });
const url = URL.createObjectURL(blob);
window.open(url);
```

---

## Lint Rules

The `pulse lint` command checks for accessibility issues at build time.

```bash
pulse lint src/
pulse lint --fix  # Auto-fix where possible
```

### Available Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `a11y-img-alt` | warning | Images must have alt attribute |
| `a11y-button-text` | warning | Buttons must have accessible name |
| `a11y-link-text` | warning | Links must have accessible name |
| `a11y-input-label` | warning | Form inputs must have labels |
| `a11y-click-key` | warning | Click on non-interactive element needs keyboard support |
| `a11y-no-autofocus` | warning | Avoid autofocus |
| `a11y-no-positive-tabindex` | warning | Avoid positive tabindex |
| `a11y-heading-order` | warning | Headings should follow hierarchy |
| `a11y-aria-props` | warning | ARIA attributes must be valid |
| `a11y-role-props` | warning | Roles must have required attributes |

### Example Output

```
src/components/Card.pulse
  12:5  warning  Image missing alt attribute  a11y-img-alt
  18:3  warning  Button has no accessible name  a11y-button-text
  25:7  warning  Heading level skipped: <h2> to <h4>  a11y-heading-order

✖ 3 warning(s) in 1 file(s)
```

---

## Best Practices

### 1. Always Provide Text Alternatives

```pulse
// Good
img[src="logo.png"][alt="Company Logo"]
img[src="decoration.png"][alt=""]  // Empty alt for decorative

// Bad
img[src="logo.png"]  // Missing alt
```

### 2. Use Semantic HTML

```pulse
// Good
button @click(submit()) "Submit"
nav { ... }
main { ... }

// Bad
div @click(submit()) "Submit"  // Needs role, tabindex, keyboard
.nav { ... }
.main { ... }
```

### 3. Ensure Keyboard Accessibility

```pulse
// Good - using button element
button @click(open()) "Open Menu"

// If you must use div, add all required attributes
div[role=button][tabindex=0] @click(open()) @on(keydown, handleKey) "Open Menu"
```

### 4. Manage Focus in Modals

```pulse
// Good - focus trap keeps focus inside
.modal @focusTrap(autoFocus=true, returnFocus=true) {
  h2 "Dialog Title"
  p "Content"
  button "Close"
}
```

### 5. Announce Dynamic Content

```pulse
// Good - screen readers are notified
.notification @live(polite) {
  "{message}"
}

.error-message @live(assertive) {
  "{error}"
}
```

### 6. Use Proper Heading Hierarchy

```pulse
// Good
h1 "Page Title"
  h2 "Section"
    h3 "Subsection"

// Bad - skipped levels
h1 "Page Title"
  h4 "Section"  // Skipped h2 and h3
```

### 7. Label Form Controls

```pulse
// Good - using aria-label
input[type=text][aria-label="Search"]

// Good - using label element
label[for=email] "Email"
input#email[type=email]

// Bad - no label
input[type=text][placeholder="Search"]  // Placeholder is not a label
```

### 8. Test with Screen Readers

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS
- **Chrome**: ChromeVox extension

### 9. Use DevTools Audit Regularly

```javascript
// In development, enable continuous auditing
if (import.meta.env.DEV) {
  enableA11yAudit({
    autoAudit: true,
    watchMutations: true,
    highlightIssues: true
  });
}
```

---

## Resources

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [The A11Y Project](https://www.a11yproject.com/)
