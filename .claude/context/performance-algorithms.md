# Performance Guide & Internal Algorithms

> Load this context file when optimizing performance or understanding internal algorithms (LIS, LRU, effect cleanup).

## Performance Guide

### When to Use batch()

```javascript
// BAD: Multiple effects fire for each set
count.set(1);    // Effect runs
name.set('A');   // Effect runs again
items.set([]);   // Effect runs again

// GOOD: Effects fire once after all updates
batch(() => {
  count.set(1);
  name.set('A');
  items.set([]);
}); // Effects run once

// Use batch when:
// - Updating multiple related pulses
// - Resetting form state
// - Processing API responses into multiple stores
```

### Computed: Lazy vs Eager

```javascript
// LAZY (default) - computed only when accessed
const total = computed(() => items.get().reduce((a, b) => a + b, 0));
// Computation runs when total.get() is called
// Use for: expensive calculations, infrequently accessed values

// EAGER - computed immediately when dependencies change
const total = computed(() => items.get().reduce((a, b) => a + b, 0), { lazy: false });
// Computation runs immediately on any items change
// Use for: values that must always be current, validation state
```

### Effect Best Practices

```javascript
// BAD: Effect does too much
effect(() => {
  const data = items.get();
  const filtered = data.filter(x => x.active);  // Filtering on every run
  render(filtered);
});

// GOOD: Use computed for derived values
const activeItems = computed(() => items.get().filter(x => x.active));
effect(() => render(activeItems.get()));

// Cleanup pattern for subscriptions
effect(() => {
  const id = setInterval(() => tick.update(n => n + 1), 1000);
  return () => clearInterval(id);  // Cleanup on re-run or dispose
});
```

### List Rendering Performance

```javascript
// BAD: No key function - entire list re-renders
list(() => items.get(), item => el('li', item.name));

// GOOD: Key function enables efficient diffing
list(() => items.get(), item => el('li', item.name), item => item.id);

// Key function must return unique, stable identifier
// - Use database IDs when available
// - Avoid using array index (breaks on reorder)
```

### Avoiding Unnecessary Re-renders

```javascript
// BAD: Creates new object every time, always triggers effects
config.set({ theme: 'dark', lang: 'en' });

// GOOD: Custom equality for objects
const config = pulse({ theme: 'dark', lang: 'en' }, {
  equals: (a, b) => a.theme === b.theme && a.lang === b.lang
});

// Or use peek() to read without tracking
effect(() => {
  const theme = config.get().theme;  // Tracks config
  const lang = config.peek().lang;   // Does NOT track
});
```

### Async Best Practices

```javascript
// BAD: No race condition handling
async function search(query) {
  const results = await api.search(query);
  setResults(results);  // May set stale results!
}

// GOOD: Use useAsync or createVersionedAsync
const { data, execute } = useAsync((query) => api.search(query), { immediate: false });
// Automatically handles race conditions

// Or manual version control
const controller = createVersionedAsync();
async function search(query) {
  const ctx = controller.begin();
  const results = await api.search(query);
  ctx.ifCurrent(() => setResults(results));
}
```

## Internal Algorithms

### LIS Algorithm (dom-list.js)

The `list()` function uses the **Longest Increasing Subsequence (LIS)** algorithm to minimize DOM operations during list reconciliation.

**Why LIS?**

When a list is reordered, naively moving every element is O(n) DOM operations. LIS identifies which elements are already in correct relative order, so only the others need to move.

**Algorithm (O(n log n)):**

```
Input: [3, 1, 4, 1, 5, 9, 2, 6] (old positions of items in new order)
Output: Indices of items that DON'T need to move

1. Binary search to build increasing subsequence
2. Track parent pointers for reconstruction
3. Result: Items in LIS stay put, others move
```

**Implementation in `computeLIS(arr)`:**

```javascript
// dp[i] = smallest tail of LIS of length i+1
// parent[i] = previous element index in LIS ending at i
// indices[i] = original array index of dp[i]

for each element:
  1. Binary search for insertion position in dp
  2. Update dp and indices at that position
  3. Set parent pointer to previous LIS element

// Reconstruct by following parent pointers backward
```

**Example:**

```
Old order: [A, B, C, D, E]
New order: [B, D, A, E, C]

Old positions in new order: [2, 0, 4, 1, 3]
                             A  B  C  D  E

LIS of [2, 0, 4, 1, 3] = [0, 1, 3] → indices [1, 3, 4] → B, D, E stay
Only A and C need DOM moves (2 moves instead of 5)
```

**Complexity:**

| Case | DOM Operations |
|------|----------------|
| Append only | O(1) - single DocumentFragment insert |
| Reverse | O(n) - all items move |
| Shuffle | O(n - LIS length) - typically much less than n |
| Single move | O(1) - LIS covers n-1 items |

---

### Selector Cache LRU (dom-selector.js)

The `parseSelector()` function caches parsed results using an **LRU (Least Recently Used)** cache.

**Why LRU instead of unbounded Map?**

- Apps reuse the same selectors (`div.container`, `button.primary`)
- Without eviction, memory grows unbounded in long-running SPAs
- LRU keeps hot selectors cached, evicts rarely-used ones

**Configuration:**

```javascript
import { configureDom, getCacheMetrics } from 'pulse-js-framework/runtime';

// Default: 500 selectors (covers most apps with 50-200 unique selectors)
configureDom({ selectorCacheCapacity: 1000 });  // Increase for large apps
configureDom({ selectorCacheCapacity: 0 });     // Disable caching

// Monitor performance
const stats = getCacheMetrics();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Size: ${stats.size}/${stats.capacity}`);
```

**Cache behavior:**

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `get(selector)` | O(1) | Returns shallow copy (prevents mutation) |
| `set(selector, config)` | O(1) | Auto-evicts LRU if at capacity |
| Cache miss | O(n) | Parses selector, then caches |

**Shallow copy on hit:**

```javascript
// Cache stores: { tag: 'div', classes: ['a', 'b'], attrs: { x: '1' } }
// Returns copy:  { tag: 'div', classes: [...], attrs: {...} }
// Prevents: cached.classes.push('c') from corrupting cache
```

---

### Effect Cleanup in Conditionals (dom-conditional.js)

The `when()` and `match()` functions manage effect cleanup to prevent memory leaks and stale subscriptions.

**Cleanup guarantees:**

1. **DOM nodes removed** - Previous branch's nodes are removed from DOM
2. **Cleanup functions called** - Any cleanup returned by the previous render
3. **State reset** - `currentNodes = []` and `currentCleanup = null`

**Lifecycle in `when(condition, thenBranch, elseBranch)`:**

```
Initial render (condition = true):
  1. effect() runs
  2. thenBranch() called, nodes inserted
  3. currentNodes = [rendered nodes]

Condition changes to false:
  1. effect() re-runs (tracked condition changed)
  2. Previous nodes removed: dom.removeNode(node) for each
  3. currentCleanup?.() called (if branch returned cleanup)
  4. Reset: currentNodes = [], currentCleanup = null
  5. elseBranch() called, new nodes inserted

Component unmount:
  1. Parent effect disposal cascades
  2. when's effect disposed
  3. Final cleanup runs
```

**Important:** Effects inside conditional branches remain subscribed to their dependencies even after the branch is removed. This is handled by:

- The compiler adding optional chaining for nullable props
- Branch templates being functions (lazy evaluation)
- Cleanup running before new branch renders

**Memory safety pattern:**

```javascript
when(
  () => showModal.get(),
  () => {
    // This effect is created fresh each time condition becomes true
    const modal = el('dialog', ...);
    const cleanup = trapFocus(modal);

    // Cleanup stored for when condition becomes false
    return { nodes: [modal], cleanup };
  }
);
```

**Difference between `when()` and `show()`:**

| Feature | `when()` | `show()` |
|---------|----------|----------|
| DOM presence | Adds/removes nodes | Always in DOM |
| Effects | Created/disposed per branch | Always active |
| Memory | Lower when hidden | Constant |
| Transition | Harder (node recreation) | Easier (CSS) |
| Use case | Complex conditional UI | Simple visibility toggle |
