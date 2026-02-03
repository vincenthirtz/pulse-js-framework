# DevTools

Pulse DevTools provide debugging, profiling, and accessibility auditing capabilities for development.

## Installation

```javascript
import {
  enableDevTools, disableDevTools,
  trackedPulse, trackedEffect,
  getDiagnostics, getEffectStats, getPulseList,
  getDependencyGraph, exportGraphAsDot,
  takeSnapshot, getHistory, travelTo, back, forward,
  profile, mark,
  // A11y Audit
  runA11yAudit, enableA11yAudit, disableA11yAudit,
  getA11yIssues, getA11yStats, exportA11yReport,
  toggleA11yHighlights
} from 'pulse-js-framework/runtime/devtools';
```

## Enabling DevTools

```javascript
enableDevTools({
  logUpdates: true,           // Log pulse updates
  logEffects: true,           // Log effect executions
  warnOnSlowEffects: true,    // Warn for slow effects
  slowEffectThreshold: 16     // Threshold in ms
});

// Exposes window.__PULSE_DEVTOOLS__ for browser console access
```

## Tracked Pulses & Effects

Track pulses and effects for debugging:

```javascript
// Tracked pulse (auto-snapshot on change)
const count = trackedPulse(0, 'count');
const user = trackedPulse(null, 'user');

// Tracked effect (performance monitoring)
trackedEffect(() => {
  console.log('Count:', count.get());
}, 'log-count');
```

## Diagnostics

### getDiagnostics()

Get runtime statistics:

```javascript
const stats = getDiagnostics();
// {
//   pulseCount: 15,
//   effectCount: 8,
//   avgEffectTime: 2.3,
//   pendingEffects: 0,
//   ...
// }
```

### getEffectStats()

Get per-effect statistics:

```javascript
const effects = getEffectStats();
// [
//   { id: 'effect-1', name: 'log-count', runCount: 42, avgTime: 1.2 },
//   { id: 'effect-2', name: 'render-ui', runCount: 15, avgTime: 8.5 }
// ]
```

### getPulseList()

Get all tracked pulses:

```javascript
const pulses = getPulseList();
// [
//   { id: 'pulse-1', name: 'count', value: 5, subscriberCount: 2 },
//   { id: 'pulse-2', name: 'user', value: { name: 'John' }, subscriberCount: 1 }
// ]
```

## Dependency Graph

Visualize reactive dependencies:

```javascript
// Get graph data
const { nodes, edges } = getDependencyGraph();

// nodes: [{ id, type, name, value }, ...]
// edges: [{ from, to, type }, ...]

// Export as Graphviz DOT format
const dot = exportGraphAsDot();
// digraph G { ... }
```

## Time-Travel Debugging

Navigate through state history:

```javascript
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
forward();    // Go forward one step
```

## Performance Profiling

### profile()

Profile a code block:

```javascript
profile('data-processing', () => {
  processLargeDataset();
});
// Logs: [Profile] data-processing: 123.45ms
```

### mark()

Mark timing points:

```javascript
const m = mark('fetch-users');
await fetch('/api/users');
m.end();
// Logs: [Mark] fetch-users: 456.78ms
```

## Accessibility Audit

### One-Time Audit

```javascript
const result = runA11yAudit();
console.log(`Found ${result.errorCount} errors, ${result.warningCount} warnings`);

// result.issues: [{ type, message, element, severity }, ...]
```

### Continuous Auditing

```javascript
enableA11yAudit({
  autoAudit: true,           // Periodic audits
  auditInterval: 5000,       // Every 5 seconds
  highlightIssues: true,     // Visual overlay on issues
  logToConsole: true,        // Log to browser console
  breakOnError: false,       // Debugger breakpoint on errors
  watchMutations: true       // Re-audit on DOM changes
});
```

### A11y Statistics

```javascript
const issues = getA11yIssues();
// [{ type: 'missing-alt', element: <img>, severity: 'error' }, ...]

const stats = getA11yStats();
// {
//   totalIssues: 5,
//   errorCount: 2,
//   warningCount: 3,
//   byType: { 'missing-alt': 1, 'missing-label': 1, ... }
// }
```

### Visual Highlighting

```javascript
toggleA11yHighlights(true);   // Show highlights
toggleA11yHighlights(false);  // Hide highlights
toggleA11yHighlights();       // Toggle
```

### Export Reports

```javascript
const json = exportA11yReport('json');  // JSON format
const csv = exportA11yReport('csv');    // CSV format
const html = exportA11yReport('html');  // Standalone HTML report
```

### Disable Audit

```javascript
disableA11yAudit();
```

## Browser Console

When enabled, DevTools expose `window.__PULSE_DEVTOOLS__`:

```javascript
// In browser console
__PULSE_DEVTOOLS__.getDiagnostics()
__PULSE_DEVTOOLS__.getPulseList()
__PULSE_DEVTOOLS__.getDependencyGraph()
__PULSE_DEVTOOLS__.takeSnapshot('manual')
__PULSE_DEVTOOLS__.travelTo(0)
__PULSE_DEVTOOLS__.runA11yAudit()
```

## Best Practices

### Development Only

```javascript
if (import.meta.env.DEV) {
  enableDevTools({ logUpdates: true });
}
```

### Naming Conventions

```javascript
// Use descriptive names for debugging
const userProfile = trackedPulse(null, 'user-profile');
const cartItems = trackedPulse([], 'cart-items');

trackedEffect(() => {
  renderHeader();
}, 'render-header');
```

### Performance Monitoring

```javascript
// Monitor slow effects
enableDevTools({
  warnOnSlowEffects: true,
  slowEffectThreshold: 16  // 1 frame at 60fps
});

// Profile critical paths
profile('initial-render', () => {
  mount('#app', App());
});
```

### A11y in Development

```javascript
// Enable during development
if (import.meta.env.DEV) {
  enableA11yAudit({
    highlightIssues: true,
    logToConsole: true
  });
}
```
