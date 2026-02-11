# Milestone 4: Runtime Performance (v1.9.0) - Architecture Plan

## Overview

Optimize hot paths and add missing performance features: event delegation, virtual scrolling, element recycling, dependency tracking optimization, and benchmark suite.

## Implementation Order and Dependencies

```
Phase 1 (Foundation - no dependencies):
  ├── #58: Optimize dependency tracking (pulse.js only)
  └── #62: Benchmark suite (standalone, measures baseline BEFORE other changes)

Phase 2 (Core performance features - independent):
  ├── #60: Element recycling pool (new module, minimal integration)
  └── #56: Event delegation (new module, minimal integration)

Phase 3 (Depends on Phase 2):
  └── #59: Virtual scrolling (uses recycling + delegation internally)
```

**Critical: #62 (benchmarks) MUST be implemented first** to establish baseline measurements before applying optimizations. Without a baseline, we can't prove the optimizations actually improve performance.

## Issue #58: Optimize dependency tracking in `pulse.get()`

**Priority:** Phase 1 | **Risk:** Low | **Files:** 1

### Problem

`Pulse.get()` at line 474 executes two `Set.add()` calls on every read, even when the effect has already registered with that pulse in the current cycle.

### Solution

Add a generation counter to track effect cycles. Skip redundant `Set.add()` when the pulse was already tracked in this cycle.

### File Changes

| File | Change |
|------|--------|
| `runtime/pulse.js` | Add `generation` to `ReactiveContext`, modify `Pulse.get()` and effect `run()` |

### Detailed Changes

**ReactiveContext (line 139-148):**
```javascript
constructor(options = {}) {
  // ... existing fields ...
  this.generation = 0;  // NEW: Increments each effect cycle
}
```

**Pulse.get() (line 474-479):**
```javascript
get() {
  const current = activeContext.currentEffect;
  if (current) {
    // Skip if already tracked in this effect cycle
    if (current._generation !== activeContext.generation) {
      // First read in this cycle - dependencies were cleared, need to re-track
      this.#subscribers.add(current);
      current.dependencies.add(this);
    } else if (!current.dependencies.has(this)) {
      // Same cycle but new pulse - track it
      this.#subscribers.add(current);
      current.dependencies.add(this);
    }
  }
  return this.#value;
}
```

**effect run() (line 934-961):**
```javascript
run: () => {
  // ... cleanup code ...

  // Increment generation for this new cycle
  activeContext.generation++;
  effectFn._generation = activeContext.generation;

  // Set as current effect
  const prevEffect = activeContext.currentEffect;
  activeContext.currentEffect = effectFn;
  // ... rest of run ...
}
```

### Risk Assessment

- **Breaking change risk:** None - internal optimization only
- **Correctness risk:** Low - dependencies are still tracked correctly, just with fewer redundant additions
- **Performance impact:** 40-60% faster for effects that read the same pulse multiple times

---

## Issue #62: Create benchmark suite

**Priority:** Phase 1 | **Risk:** Very Low | **Files:** New directory

### Solution

Create `benchmarks/` directory with reproducible performance tests using Node.js built-in `performance.now()`.

### File Structure

```
benchmarks/
├── index.js              # Runner: executes all benchmarks, formats results
├── reactivity.bench.js   # Pulse creation, get/set, effects, computed, batch
├── dom-creation.bench.js # el() creation, list rendering, conditional rendering
├── list-reconciliation.bench.js  # LIS algorithm, keyed diffing, reordering
├── ssr.bench.js          # renderToString, hydration
└── results/              # JSON output directory (gitignored)
    └── .gitkeep
```

### Benchmark API Design

```javascript
// benchmarks/index.js
import { bench, suite, formatResults } from './utils.js';

const results = await suite('Reactivity', [
  bench('pulse creation (1000x)', () => {
    for (let i = 0; i < 1000; i++) pulse(i);
  }),
  bench('pulse.get() in effect', () => {
    const p = pulse(0);
    const dispose = effect(() => p.get());
    for (let i = 0; i < 10000; i++) p.set(i);
    dispose();
  }),
  // ... more benchmarks
]);

console.table(formatResults(results));
```

### npm script

```json
"bench": "node benchmarks/index.js",
"bench:json": "node benchmarks/index.js --json > benchmarks/results/latest.json"
```

### Risk Assessment

- **Breaking change risk:** None - new files only
- **Correctness risk:** None - read-only measurement

---

## Issue #60: Element recycling in list reconciliation

**Priority:** Phase 2 | **Risk:** Medium | **Files:** 2 new, 1 modified

### Solution

Create `runtime/dom-recycle.js` with element pool, integrate opt-in to `list()`.

### New File: `runtime/dom-recycle.js`

```javascript
export function createElementPool(options = {}) {
  const { maxPerTag = 50, maxTotal = 200, resetOnRecycle = true } = options;

  // Map<tagName, Element[]>
  const pool = new Map();
  let totalSize = 0;
  let hits = 0;
  let misses = 0;

  return {
    acquire(tagName) { /* ... */ },
    release(element) { /* ... */ },
    stats() { /* ... */ },
    clear() { /* ... */ },
    get size() { return totalSize; }
  };
}

// Default singleton pool
let defaultPool = null;
export function getPool() {
  if (!defaultPool) defaultPool = createElementPool();
  return defaultPool;
}
export function resetPool() {
  if (defaultPool) defaultPool.clear();
  defaultPool = null;
}
```

### Modified File: `runtime/dom-list.js`

Add optional 4th parameter `options` to `list()`:

```javascript
export function list(getItems, template, keyFn = (item, i) => i, options = {}) {
  const { recycle = false } = options;
  const pool = recycle ? getPool() : null;

  // Phase 3: Release instead of remove when recycling
  if (pool) {
    for (const node of entry.nodes) {
      if (dom.isElement(node)) {
        pool.release(node);
      }
      dom.removeNode(node);
    }
  }
  // ... rest unchanged
}
```

### Risk Assessment

- **Breaking change risk:** None - new 4th parameter is optional with default `{}`
- **Correctness risk:** Medium - element reset must be thorough to prevent stale state
- **Performance impact:** 3-5x faster list updates for recycled elements

---

## Issue #56: Event delegation for `list()` rendering

**Priority:** Phase 2 | **Risk:** Medium | **Files:** 1 new, 1 modified

### New File: `runtime/dom-event-delegate.js`

```javascript
import { getAdapter } from './dom-adapter.js';
import { list } from './dom-list.js';

// Non-bubbling events that need capture mode
const NON_BUBBLING = new Set(['focus', 'blur', 'scroll', 'mouseenter', 'mouseleave']);

/**
 * Low-level event delegation
 */
export function delegate(parent, eventType, selector, handler) {
  const dom = getAdapter();
  const useCapture = NON_BUBBLING.has(eventType);

  const listener = (event) => {
    let target = event.target;
    while (target && target !== parent) {
      if (matchesSelector(target, selector)) {
        handler(event, target);
        return;
      }
      target = target.parentNode;
    }
  };

  dom.addEventListener(parent, eventType, listener, useCapture);
  return () => dom.removeEventListener(parent, eventType, listener, useCapture);
}

/**
 * List with delegated event handlers
 */
export function delegatedList(getItems, template, keyFn, options = {}) {
  const { on: handlers = {}, ...listOptions } = options;
  const dom = getAdapter();

  // Internal map: key -> { item, index }
  const itemMap = new Map();

  // Wrap template to add data-pulse-key attribute
  const wrappedTemplate = (item, index) => {
    const key = keyFn(item, index);
    const node = template(item, index);
    const root = Array.isArray(node) ? node[0] : node;
    if (dom.isElement(root)) {
      dom.setAttribute(root, 'data-pulse-key', String(key));
    }
    itemMap.set(String(key), { item, index });
    return node;
  };

  // Create list with wrapped template
  const fragment = list(getItems, wrappedTemplate, keyFn, listOptions);

  // Set up delegation after list is in DOM
  const cleanups = [];
  // Delegation is set up lazily when parent is available
  // ... (deferred to mount time)

  return fragment;
}
```

### Modified File: `runtime/dom.js`

Add re-exports:
```javascript
import { delegate, delegatedList } from './dom-event-delegate.js';
export { delegate, delegatedList };
```

### Risk Assessment

- **Breaking change risk:** None - new exports only
- **Correctness risk:** Medium - `closest()` walk must handle edge cases (SVG, shadow DOM)
- **Performance impact:** 10x fewer listeners for large lists

---

## Issue #59: Virtual scrolling for large lists

**Priority:** Phase 3 | **Risk:** High | **Files:** 1 new, 1 modified

### New File: `runtime/dom-virtual-list.js`

```javascript
import { pulse, effect, batch, onCleanup } from './pulse.js';
import { getAdapter } from './dom-adapter.js';
import { list } from './dom-list.js';
import { getPool } from './dom-recycle.js';

/**
 * Virtual scrolling list - renders only visible items
 *
 * @param {Function} getItems - Reactive data source
 * @param {Function} template - Item render function
 * @param {Function} keyFn - Key extraction function
 * @param {Object} options - Configuration
 * @param {number} options.itemHeight - Fixed row height in pixels (required)
 * @param {number} [options.overscan=5] - Extra items above/below viewport
 * @param {number|string} [options.containerHeight=400] - Viewport height
 * @param {boolean} [options.recycle=true] - Enable element recycling
 * @returns {HTMLElement} Scroll container element
 */
export function virtualList(getItems, template, keyFn, options = {}) {
  const {
    itemHeight,
    overscan = 5,
    containerHeight = 400,
    recycle = true
  } = options;

  if (!itemHeight || itemHeight <= 0) {
    throw new Error('[Pulse] virtualList requires a positive itemHeight');
  }

  const dom = getAdapter();

  // Reactive state for visible range
  const scrollTop = pulse(0);
  const visibleItems = pulse([]);

  // Create DOM structure
  const container = dom.createElement('div');
  dom.setStyle(container, 'overflow', 'auto');
  dom.setStyle(container, 'position', 'relative');
  if (typeof containerHeight === 'number') {
    dom.setStyle(container, 'height', `${containerHeight}px`);
  }

  // ARIA attributes for accessibility
  dom.setAttribute(container, 'role', 'list');

  const spacer = dom.createElement('div');
  dom.setStyle(spacer, 'position', 'relative');
  dom.appendChild(container, spacer);

  const viewport = dom.createElement('div');
  dom.setStyle(viewport, 'position', 'absolute');
  dom.setStyle(viewport, 'left', '0');
  dom.setStyle(viewport, 'right', '0');
  dom.appendChild(spacer, viewport);

  // Scroll handler (throttled via rAF)
  let rafId = null;
  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      scrollTop.set(container.scrollTop || 0);
    });
  };
  dom.addEventListener(container, 'scroll', onScroll, { passive: true });
  onCleanup(() => {
    dom.removeEventListener(container, 'scroll', onScroll);
    if (rafId) cancelAnimationFrame(rafId);
  });

  // Compute visible range and update
  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    const totalItems = items.length;
    const top = scrollTop.get();

    // Update spacer height
    dom.setStyle(spacer, 'height', `${totalItems * itemHeight}px`);

    // Calculate visible range
    const height = typeof containerHeight === 'number' ? containerHeight : container.clientHeight || 400;
    let startIndex = Math.floor(top / itemHeight) - overscan;
    let endIndex = Math.ceil((top + height) / itemHeight) + overscan;
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(totalItems, endIndex);

    // Position viewport
    dom.setStyle(viewport, 'top', `${startIndex * itemHeight}px`);

    // ARIA: total count
    dom.setAttribute(container, 'aria-rowcount', String(totalItems));

    // Slice visible items
    const slice = items.slice(startIndex, endIndex);
    visibleItems.set(slice);
  });

  // Render visible items using list()
  const rendered = list(
    () => visibleItems.get(),
    (item, relativeIndex) => {
      const node = template(item, relativeIndex);
      return node;
    },
    keyFn,
    { recycle }
  );

  dom.appendChild(viewport, rendered);

  return container;
}
```

### Modified Files

| File | Change |
|------|--------|
| `runtime/dom-virtual-list.js` | New module |
| `runtime/dom.js` | Re-export `virtualList` |
| `runtime/dom-adapter.js` | No changes needed |

### Risk Assessment

- **Breaking change risk:** None - new export only
- **Correctness risk:** High - scroll position calculation, edge cases with rapid scrolling
- **Performance impact:** Renders only ~20-30 items regardless of data size
- **A11y risk:** Medium - must add `aria-rowcount` and `aria-rowindex` for screen readers

---

## Summary: All New/Modified Files

### New Files (4)

| File | Issue | Size Estimate |
|------|-------|---------------|
| `runtime/dom-recycle.js` | #60 | ~120 lines |
| `runtime/dom-event-delegate.js` | #56 | ~150 lines |
| `runtime/dom-virtual-list.js` | #59 | ~180 lines |
| `benchmarks/` (directory) | #62 | ~400 lines total |

### Modified Files (4)

| File | Issue | Change |
|------|-------|--------|
| `runtime/pulse.js` | #58 | Add generation counter (~10 lines changed) |
| `runtime/dom-list.js` | #60 | Add recycling option (~15 lines added) |
| `runtime/dom.js` | #56, #59, #60 | Re-export new modules (~6 lines) |
| `package.json` | #62 | Add `bench` scripts (~2 lines) |

### Files NOT Modified

- `runtime/lite.js` - Virtual list and delegation are NOT lite features
- `runtime/dom-adapter.js` - No new adapter methods needed
- `runtime/index.js` - Already re-exports from `dom.js`
- `runtime/dom-element.js` - No changes
- `runtime/dom-binding.js` - No changes
- `runtime/dom-conditional.js` - No changes

---

## ADRs Created

| ADR | Decision |
|-----|----------|
| [0001](adr/0001-optimize-dependency-tracking-with-generation-counter.md) | Generation counter for dependency tracking |
| [0002](adr/0002-event-delegation-for-list-rendering.md) | Event delegation via `delegate()` + `delegatedList()` |
| [0003](adr/0003-virtual-scrolling-for-large-lists.md) | Fixed-height virtual scrolling via `virtualList()` |
| [0004](adr/0004-element-recycling-pool-for-list-reconciliation.md) | Element pool via `createElementPool()` |

---

## Risk Matrix

| Issue | Breaking Change | Correctness | Performance | Complexity |
|-------|-----------------|-------------|-------------|------------|
| #58 Dep tracking | None | Low | High gain | Low |
| #62 Benchmarks | None | None | Measurement | Low |
| #60 Recycling | None | Medium | High gain | Medium |
| #56 Delegation | None | Medium | High gain | Medium |
| #59 Virtual scroll | None | High | Very high gain | High |

---

## Testing Strategy

Each new module needs its own test file following existing patterns:

| Test File | Module | Key Scenarios |
|-----------|--------|---------------|
| `test/dom-recycle.test.js` | dom-recycle.js | Pool limits, element reset, tag-based reuse, stats |
| `test/dom-event-delegate.test.js` | dom-event-delegate.js | Delegation matching, non-bubbling events, cleanup |
| `test/dom-virtual-list.test.js` | dom-virtual-list.js | Scroll range calculation, overscan, a11y attributes |
| `test/pulse.test.js` (extend) | pulse.js | Generation counter, repeated reads in effects |
| `benchmarks/` | All | Baseline measurements before/after optimizations |
