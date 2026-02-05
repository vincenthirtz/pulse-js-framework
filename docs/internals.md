# Pulse Internals

This document explains the internal algorithms and implementation details of Pulse. It's intended for contributors, advanced users, and those curious about how the framework works under the hood.

## Table of Contents

- [List Diffing (LIS Algorithm)](#list-diffing-lis-algorithm)
- [Selector Cache (LRU)](#selector-cache-lru)
- [Conditional Rendering Lifecycle](#conditional-rendering-lifecycle)
- [Effect Scheduling](#effect-scheduling)

---

## List Diffing (LIS Algorithm)

**File:** `runtime/dom-list.js`

When a reactive list updates, Pulse needs to efficiently reconcile the old DOM with the new data. Naively moving every element would be O(n) DOM operations. Instead, Pulse uses the **Longest Increasing Subsequence (LIS)** algorithm to minimize moves.

### Why LIS?

The key insight is that some elements are already in the correct relative order. If we can identify which elements don't need to move, we only need to reposition the others.

```
Old order: [A, B, C, D, E]
New order: [B, D, A, E, C]

Question: Which elements can stay in place?
Answer: B, D, E are already in increasing order relative to each other.
        Only A and C need to move.

Result: 2 DOM moves instead of 5
```

### Algorithm Overview

The LIS algorithm runs in **O(n log n)** time using binary search:

```javascript
function computeLIS(arr) {
  // arr = old positions of items in new order
  // Example: [2, 0, 4, 1, 3] means:
  //   - Item at new[0] was at old[2]
  //   - Item at new[1] was at old[0]
  //   - etc.

  // dp[i] = smallest tail value of any increasing subsequence of length i+1
  // Using binary search, we find where each element fits

  // Returns: indices of elements that form the LIS
  // These elements don't need to move
}
```

### Step-by-Step Example

```
Input positions: [2, 0, 4, 1, 3]
                  A  B  C  D  E  (items in new order)

Processing:
  i=0: val=2, dp=[], insert at 0 → dp=[2]
  i=1: val=0, dp=[2], 0<2, replace → dp=[0]
  i=2: val=4, dp=[0], 4>0, append → dp=[0,4]
  i=3: val=1, dp=[0,4], 0<1<4, replace → dp=[0,1]
  i=4: val=3, dp=[0,1], 1<3, append → dp=[0,1,3]

LIS length = 3
LIS indices = [1, 3, 4] → items B, D, E stay in place
Items A, C need to move
```

### Reconciliation Phases

The `list()` function performs these phases on each update:

| Phase | Operation | Complexity |
|-------|-----------|------------|
| 1. Key extraction | Map items to unique keys | O(n) |
| 2. Diff | Identify added/removed/moved items | O(n) |
| 3. Remove | Delete DOM nodes for removed items | O(removed) |
| 4. Create | Batch-create new items via DocumentFragment | O(added) |
| 5. LIS | Compute which items don't need to move | O(n log n) |
| 6. Reorder | Move only non-LIS items | O(n - LIS) |

### Performance by Case

| Scenario | DOM Operations | Notes |
|----------|----------------|-------|
| Append items | O(1) | Single DocumentFragment insert |
| Prepend items | O(added) | Existing items in LIS, only insert new |
| Remove items | O(removed) | No moves needed |
| Reverse list | O(n) | LIS length = 1, all items move |
| Random shuffle | O(n - LIS) | Typically 30-50% of items move |
| Move single item | O(1) | LIS covers n-1 items |

### Key Function Best Practices

The key function determines reconciliation efficiency:

```javascript
// GOOD: Stable, unique identifier
list(items, render, item => item.id);
list(items, render, item => item.uuid);
list(items, render, item => `${item.type}-${item.id}`);

// BAD: Index as key (defeats LIS optimization)
list(items, render, (item, index) => index);
// Prepending causes ALL items to "move" because keys shift

// BAD: Unstable key (recreates all DOM nodes)
list(items, render, item => Math.random());
```

---

## Selector Cache (LRU)

**File:** `runtime/dom-selector.js`

The `parseSelector()` function converts CSS-like selectors (`div.container#main[data-id=123]`) into configuration objects. Since apps reuse the same selectors repeatedly, results are cached using an **LRU (Least Recently Used)** cache.

### Why LRU Instead of Map?

| Approach | Memory | Long-running apps |
|----------|--------|-------------------|
| No cache | Minimal | O(n) parse per call |
| Unbounded Map | Grows forever | Memory leak risk |
| **LRU Cache** | **Bounded** | **Hot selectors stay cached** |

### Cache Behavior

```javascript
import { parseSelector, getCacheMetrics } from 'pulse-js-framework/runtime';

// First call: parses and caches
parseSelector('div.container');  // Cache miss, parses

// Subsequent calls: returns cached copy
parseSelector('div.container');  // Cache hit, O(1)
parseSelector('div.container');  // Cache hit, O(1)

// Check performance
const stats = getCacheMetrics();
// { hits: 2, misses: 1, evictions: 0, hitRate: 0.67, size: 1, capacity: 500 }
```

### Configuration

```javascript
import { configureDom } from 'pulse-js-framework/runtime';

// Default: 500 selectors (covers most apps)
// Most apps use 50-200 unique selectors

// Increase for large apps with many dynamic selectors
configureDom({ selectorCacheCapacity: 1000 });

// Disable caching (for debugging)
configureDom({ selectorCacheCapacity: 0 });

// Disable metrics tracking (slight perf gain in production)
configureDom({ trackCacheMetrics: false });
```

### Cache Safety

The cache returns **shallow copies** to prevent mutation:

```javascript
// Cache stores:
{ tag: 'div', classes: ['a', 'b'], attrs: { x: '1' } }

// Returns copy:
{ tag: 'div', classes: [...], attrs: {...} }

// This prevents bugs like:
const config = parseSelector('div.a.b');
config.classes.push('c');  // Doesn't corrupt cache
```

### LRU Eviction

When the cache reaches capacity, the least recently used entry is evicted:

```
Capacity: 3
Operations:
  set('a', 1)  → cache: [a]
  set('b', 2)  → cache: [a, b]
  set('c', 3)  → cache: [a, b, c]
  get('a')     → cache: [b, c, a]  (a moves to end = most recent)
  set('d', 4)  → cache: [c, a, d]  (b evicted = least recent)
```

---

## Conditional Rendering Lifecycle

**File:** `runtime/dom-conditional.js`

The `when()` and `match()` functions handle conditional rendering with proper cleanup to prevent memory leaks.

### Cleanup Guarantees

When a condition changes, Pulse guarantees:

1. **DOM nodes removed** - Previous branch's nodes are removed from DOM
2. **Cleanup functions called** - Any cleanup returned by the previous render
3. **State reset** - Internal tracking arrays cleared

### Lifecycle Diagram

```
when(condition, thenBranch, elseBranch)

┌─────────────────────────────────────────────────────────┐
│ Initial Render (condition = true)                       │
├─────────────────────────────────────────────────────────┤
│ 1. effect() runs                                        │
│ 2. condition() returns true                             │
│ 3. thenBranch() called → nodes created                  │
│ 4. Nodes inserted after marker                          │
│ 5. currentNodes = [nodes], currentCleanup = null        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ condition changes to false
┌─────────────────────────────────────────────────────────┐
│ Re-render (condition = false)                           │
├─────────────────────────────────────────────────────────┤
│ 1. effect() re-runs (tracked dependency changed)        │
│ 2. CLEANUP: Remove all currentNodes from DOM            │
│ 3. CLEANUP: Call currentCleanup() if exists             │
│ 4. RESET: currentNodes = [], currentCleanup = null      │
│ 5. elseBranch() called → new nodes created              │
│ 6. New nodes inserted after marker                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ component unmounts
┌─────────────────────────────────────────────────────────┐
│ Disposal                                                │
├─────────────────────────────────────────────────────────┤
│ 1. Parent effect disposed                               │
│ 2. when's internal effect disposed                      │
│ 3. Final cleanup runs                                   │
└─────────────────────────────────────────────────────────┘
```

### when() vs show()

| Feature | `when()` | `show()` |
|---------|----------|----------|
| DOM presence | Adds/removes nodes | Always in DOM (`display: none`) |
| Effects | Created/disposed per branch | Always active |
| Memory | Lower when hidden | Constant |
| Transitions | Harder (node recreation) | Easier (CSS transitions) |
| Form state | Lost on hide | Preserved |
| Use case | Complex conditional UI | Simple visibility toggle |

### Common Patterns

**Pattern 1: Conditional with cleanup**

```javascript
when(
  () => showModal.get(),
  () => {
    const modal = el('dialog.modal', content);
    const releaseFocus = trapFocus(modal);

    // Return cleanup function
    onCleanup(() => releaseFocus());

    return modal;
  }
);
```

**Pattern 2: Match for multi-state**

```javascript
match(
  () => status.get(),
  {
    loading: () => el('.spinner'),
    error: () => el('.error', error.get()?.message),
    success: () => el('.content', data.get()),
    default: () => el('.empty', 'No data')
  }
);
```

**Pattern 3: Nested conditionals**

```javascript
when(
  () => user.get() !== null,
  () => when(
    () => user.get().isAdmin,
    () => AdminPanel(),
    () => UserDashboard()
  ),
  () => LoginPage()
);
```

---

## Effect Scheduling

**File:** `runtime/pulse.js`

Effects in Pulse are scheduled synchronously but can be batched to avoid redundant executions.

### Execution Model

```
Normal execution:
  count.set(1)  → effect runs immediately
  count.set(2)  → effect runs immediately
  count.set(3)  → effect runs immediately
  Total: 3 effect runs

Batched execution:
  batch(() => {
    count.set(1)  → queued
    count.set(2)  → queued (replaces previous)
    count.set(3)  → queued (replaces previous)
  })
  → effect runs once with value 3
  Total: 1 effect run
```

### Circular Dependency Protection

Effects that trigger themselves are detected and limited:

```javascript
const count = pulse(0);

effect(() => {
  console.log(count.get());
  count.set(count.peek() + 1);  // Triggers self!
});

// Pulse limits to 100 iterations, then throws:
// Error: Circular dependency detected (max 100 iterations)
```

### Effect Cleanup Timing

```
1. Effect runs for first time
   - Dependencies tracked
   - Cleanup function stored (if returned)

2. Dependency changes
   - Previous cleanup runs FIRST
   - Effect body runs
   - New cleanup stored

3. Effect disposed
   - Final cleanup runs
   - Effect removed from dependency graph
```

### Nested Effects

Effects can be nested, creating a hierarchy:

```javascript
effect(() => {
  const user = currentUser.get();

  // Inner effect disposed when outer re-runs
  effect(() => {
    console.log(user.name, preferences.get());
  });
});
```

When the outer effect re-runs (due to `currentUser` change), the inner effect is automatically disposed before the outer effect body executes again.

---

## Further Reading

- [Performance Guide](/docs/performance) - User-facing optimization tips
- [DevTools](/docs/devtools) - Debugging and profiling tools
- [Source Code](https://github.com/anthropics/pulse-js-framework) - Full implementation
