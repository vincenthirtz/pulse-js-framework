# Debugging Guide - Pulse JS Framework

## Overview

This guide covers common bugs, debugging tools, and troubleshooting strategies for Pulse framework development.

## Debugging Reactivity Issues

### Effect Not Firing

**Symptom**: UI doesn't update when state changes.

**Cause 1**: Dependency not tracked (missing `.get()`).

```javascript
// BUG: peek() doesn't track
effect(() => {
  console.log(count.peek());  // ← No dependency created
});

// FIX: Use .get()
effect(() => {
  console.log(count.get());   // ← Dependency tracked
});
```

**Cause 2**: Reading inside `untrack()`.

```javascript
// BUG: untrack prevents tracking
effect(() => {
  const val = untrack(() => count.get());  // ← No dependency
});

// FIX: Move outside untrack
effect(() => {
  const val = count.get();  // ← Tracked
  const config = untrack(() => settings.get());  // Only untrack what you need
});
```

**Cause 3**: Effect was disposed.

```javascript
const dispose = effect(() => { /* ... */ });
dispose();  // Effect is dead
count.set(5);  // Won't trigger anything

// FIX: Don't dispose prematurely, or create a new effect
```

### Effect Runs Too Many Times

**Symptom**: Effect fires N times when you expected once.

**Cause**: Multiple `set()` calls without `batch()`.

```javascript
// BUG: 3 effect runs
firstName.set('John');
lastName.set('Doe');
age.set(30);

// FIX: Batch updates
batch(() => {
  firstName.set('John');
  lastName.set('Doe');
  age.set(30);
});  // 1 effect run
```

### Circular Dependency Error

**Symptom**: `CircularDependency: Maximum update depth exceeded (100)`

**Cause**: Effect writes to a signal it reads.

```javascript
// BUG: Infinite loop
effect(() => {
  count.set(count.get() + 1);  // Reads AND writes count
});

// FIX: Use computed for derived values
const doubled = computed(() => count.get() * 2);

// Or use untrack for write-only
effect(() => {
  const val = externalSource.get();
  untrack(() => count.set(val));  // Write without re-triggering
});
```

### Stale Closure in Effect

**Symptom**: Effect uses old values from its closure.

```javascript
// BUG: Stale reference
let handler = () => console.log('old');
effect(() => {
  element.onclick = handler;  // Always uses initial handler
});
handler = () => console.log('new');  // Effect doesn't re-run

// FIX: Make handler reactive
const handler = pulse(() => console.log('old'));
effect(() => {
  element.onclick = handler.get();  // Re-runs when handler changes
});
handler.set(() => console.log('new'));  // Effect re-runs
```

## Debugging DOM Issues

### Element Not Appearing

**Cause 1**: `when()` condition is false and no else branch.

```javascript
// Only renders when isVisible is true
when(() => isVisible.get(), () => el('.content', 'Hello'));

// FIX: Check condition
console.log('isVisible:', isVisible.get());  // Is it actually true?
```

**Cause 2**: Mount target doesn't exist.

```javascript
mount('#app', App());  // Throws if #app not in DOM

// FIX: Check target exists
const target = document.querySelector('#app');
console.log('Mount target:', target);  // null = doesn't exist
```

**Cause 3**: Using `show()` vs `when()` confusion.

```javascript
// show() keeps element in DOM, just hides it (display: none)
show(element, () => isVisible.get());

// when() removes/adds element from DOM
when(() => isVisible.get(), () => el('.content'));

// Use show() for simple toggle, when() for conditional rendering
```

### List Not Updating

**Cause 1**: Missing key function.

```javascript
// BUG: No key → full re-render, can lose DOM state
list(() => items.get(), (item) => el('li', item.name));

// FIX: Add key function
list(() => items.get(), (item) => el('li', item.name), (item) => item.id);
```

**Cause 2**: Mutating array in place.

```javascript
// BUG: Mutation doesn't trigger reactivity
items.get().push(newItem);  // ← Mutates same array reference

// FIX: Use update() to create new array
items.update(arr => [...arr, newItem]);
```

**Cause 3**: Key function returns non-unique values.

```javascript
// BUG: Duplicate keys confuse reconciliation
list(() => items.get(), renderFn, (item) => item.category);  // Not unique!

// FIX: Use unique identifier
list(() => items.get(), renderFn, (item) => item.id);
```

## Debugging Compiler Issues

### Unexpected Token Error

**Debug with**: Source location in error message.

```
ParserError: Unexpected token '}' at line 12, column 5
  Expected: 'IDENTIFIER' in state block

   10 | state {
   11 |   count: 0
 > 12 | }
        ^
   13 | view {
```

**Common causes**:
- Missing comma between state properties
- Unclosed string literal
- Using reserved word as identifier
- Missing closing brace for nested block

### Compiled Output Looks Wrong

**Debug with**: Compare input/output manually.

```bash
# Compile and inspect output
pulse compile src/App.pulse > output.js
cat output.js
```

**Check transformer logic**:
1. Is the AST correct? Add `console.log(JSON.stringify(ast, null, 2))` in parser
2. Is the visitor dispatching to the right method?
3. Are context variables (state vs props) handled differently?

### Source Map Off by One

**Debug with**: Check VLQ encoding.

```javascript
// In sourcemap.js, add debug logging
console.log('Mapping:', { genLine, genCol, srcLine, srcCol });
```

**Common causes**:
- Off-by-one in line numbers (source maps are 0-indexed)
- Multi-line string not accounted for
- Generated code has extra newlines from template

## Debugging SSR Issues

### Hydration Mismatch

**Symptom**: Console warning about server/client HTML mismatch.

**Cause**: Server renders different HTML than client.

```javascript
// BUG: Date is different on server vs client
el('span', new Date().toLocaleString());

// FIX: Use SSR state transfer
const { html, state } = await renderToString(() => App());
// Transfer state to client, use same data
```

### MockDOMAdapter Missing Method

**Symptom**: `TypeError: adapter.someMethod is not a function`

**Fix**: Add the method to `MockDOMAdapter` in `dom-adapter.js`:

```javascript
class MockDOMAdapter {
  // ... existing methods ...
  someMethod(element) {
    // Implement mock behavior
  }
}
```

## Debugging Performance

### Using DevTools Profiling

```javascript
import { enableDevTools, profile, mark } from 'pulse-js-framework/runtime/devtools';

enableDevTools({ logUpdates: true, warnOnSlowEffects: true });

// Profile a section
profile('data-processing', () => {
  processLargeDataset();
});

// Or use marks for async operations
const m = mark('api-call');
const data = await fetchData();
m.end();  // Logs duration
```

### Finding Slow Effects

```javascript
import { getEffectStats } from 'pulse-js-framework/runtime/devtools';

const stats = getEffectStats();
// Sort by average time to find slow effects
stats.sort((a, b) => b.avgTime - a.avgTime);
console.table(stats.slice(0, 10));
```

### Checking Selector Cache Hit Rate

```javascript
import { getCacheMetrics } from 'pulse-js-framework/runtime';

const metrics = getCacheMetrics();
console.log(`Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
console.log(`Size: ${metrics.size}/${metrics.capacity}`);
// If hit rate < 80%, consider increasing capacity
```

## Debugging Tools

### Console Helpers

```javascript
// Track all changes to a pulse
const count = pulse(0);
count.subscribe(v => console.log('[count]', v));

// Log effect dependencies
import { trackedEffect } from 'pulse-js-framework/runtime/devtools';
trackedEffect(() => {
  console.log(count.get(), name.get());
}, 'my-effect');
// DevTools will show: my-effect depends on [count, name]
```

### Time-Travel Debugging

```javascript
import { enableDevTools, takeSnapshot, travelTo, back, forward }
  from 'pulse-js-framework/runtime/devtools';

enableDevTools();

// Take snapshots at key points
takeSnapshot('before-login');
// ... user logs in ...
takeSnapshot('after-login');

// Travel back
travelTo(0);  // Back to 'before-login' state
forward();    // Forward to 'after-login'
```

### Dependency Graph

```javascript
import { getDependencyGraph, exportGraphAsDot }
  from 'pulse-js-framework/runtime/devtools';

// Get graph data
const { nodes, edges } = getDependencyGraph();
console.log(`${nodes.length} nodes, ${edges.length} edges`);

// Export as Graphviz DOT format
const dot = exportGraphAsDot();
console.log(dot);
// Paste into https://dreampuf.github.io/GraphvizOnline/
```

## Common Error Messages and Fixes

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `Cannot set computed value 'X'` | Calling `.set()` on computed | Use `pulse()` for writable, `computed()` is read-only |
| `Mount target not found: '#app'` | Selector doesn't match any element | Check HTML has `<div id="app">` |
| `Circular dependency detected` | Effect reads and writes same signal | Use `untrack()` for writes or split into separate effects |
| `Maximum update depth exceeded` | Infinite reactive loop | Break the cycle with `untrack()` or restructure logic |
| `No route matched: '/path'` | Route not defined in router config | Add route to `routes` object |
| `Lazy route timed out after Xms` | Dynamic import took too long | Increase `timeout` option or check network |
| `Cannot read properties of null` | Accessing props on nullable value | Use optional chaining: `obj?.property` |
| `Effect error in 'X'` | Unhandled error inside effect | Add try-catch or `onError` option to effect |
| `X is not a function` | Wrong import or module structure | Check export name and import path |
| `Cannot use import statement` | ESM/CJS mismatch | Ensure `"type": "module"` in package.json |

## Test Debugging

### Isolate a Failing Test

```bash
# Run single test file
node --test test/pulse.test.js

# Run with test name filter
node --test --test-name-pattern="computed updates" test/pulse.test.js

# Run with verbose output
node --test --test-reporter=spec test/pulse.test.js
```

### Debug Reactive State in Tests

```javascript
test('debug reactive state', () => {
  const ctx = createContext({ name: 'debug-test' });
  withContext(ctx, () => {
    const count = pulse(0);
    const doubled = computed(() => count.get() * 2);

    // Log all changes
    count.subscribe(v => console.log('count →', v));
    doubled.subscribe(v => console.log('doubled →', v));

    count.set(5);
    // Output:
    // count → 5
    // doubled → 10
  });
  ctx.reset();
});
```
