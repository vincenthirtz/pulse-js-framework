# ADR-0005: Milestone v1.8.1 Runtime Performance — Implementation Plan

## Status

Accepted

## Date

2026-02-11

## Context

Milestone 4 "Runtime Performance (v1.8.1)" has 5 open GitHub issues (#56, #58, #59, #60, #62).
After auditing the existing code, several modules are already implemented but need:
1. Integration between performance modules (delegation + recycling + virtual scrolling)
2. Completion of remaining gaps (batch/subscribe, dependency tracking refinement)
3. TypeScript definitions for new public APIs
4. Benchmark baseline storage and regression detection

### Current State Assessment

| Module | File | Completeness | Key Gap |
|--------|------|-------------|---------|
| Event delegation | `dom-event-delegate.js` | 95% | No recycling integration on removal |
| Virtual scrolling | `dom-virtual-list.js` | 70% | No event delegation, recycling not wired |
| Element recycling | `dom-recycle.js` | 90% | Manual-only; `list()` doesn't auto-acquire |
| Dependency tracking | `pulse.js` | 98% | Generation counter done; subscribe/batch gap |
| Benchmark suite | `benchmarks/` | 75% | No baselines, no auto-discovery, no filtering |
| Core list | `dom-list.js` | 95% | Releases to pool but doesn't acquire from it |
| TypeScript types | `types/dom.d.ts` | 0% | No types for delegate/virtualList/recycle |

All 138 existing tests pass. No regressions detected.

## Decision

### Implementation Plan (7 Tasks, Ordered by Dependencies)

```
Task 1: pulse.js — batch()/subscribe() integration
    │   (no dependencies)
    │
Task 2: dom-list.js — Recycling pool acquire() integration
    │   (depends on: dom-recycle.js existing)
    │
Task 3: dom-event-delegate.js — Recycling pool release() on removal
    │   (depends on: Task 2)
    │
Task 4: dom-virtual-list.js — Event delegation + recycling wiring
    │   (depends on: Task 2, Task 3)
    │
Task 5: benchmarks/ — Baselines, auto-discovery, filtering
    │   (no dependencies; can run in parallel with Tasks 1-4)
    │
Task 6: types/dom.d.ts — TypeScript definitions for new APIs
    │   (depends on: Tasks 2-4 API stabilization)
    │
Task 7: Integration smoke test + MILESTONES.md update + GitHub issues close
    │   (depends on: all above)
```

### Task Details

---

#### Task 1: `batch()` + `subscribe()` Integration
**Issue:** #58 (partial) | **File:** `runtime/pulse.js`
**Problem:** `subscribe()` callbacks are queued like effects during `batch()`, but subscribers
expect synchronous delivery. This breaks the subscription contract.
**Solution:** In `#notify()`, distinguish subscriber objects (have `run` but no `_generation`)
from effect objects. Subscribers should receive the **latest** value when batch flushes, not
be queued as individual notifications.

```javascript
// In #notify(), line 553-564:
// Before running subscriber from pending queue, call it with current value
// subscriber.run(this.#value) instead of just subscriber.run()
```

**Changes:**
- `pulse.js:553-564` — Update `#notify()` to pass current value to subscriber `run()`
- `pulse.js:1038-1048` — Update `flushEffects()` to deduplicate subscriber calls
- Ensure subscribers fire exactly once per batch with the final value

---

#### Task 2: `list()` Recycling Pool Acquire Integration
**Issue:** #60 | **File:** `runtime/dom-list.js`
**Problem:** `list()` releases elements to the pool on removal (line 158) but never
acquires from the pool when creating new elements. Templates call `el()` which always
creates fresh DOM elements.
**Solution:** Add an optional wrapper around the template function that intercepts
the root element creation, checking the pool first.

```javascript
// In dom-list.js, Phase 2 (line 144-151):
// If pool is available and template returns a single element,
// try pool.acquire(tagName) before createElement
```

**Changes:**
- `dom-list.js:144-151` — Wrap template call with pool-aware factory
- `dom-recycle.js` — Add `wrapTemplate(template, pool)` helper that intercepts root node creation
- Keep backward compatible: only activates when `recycle: true` option is passed to `list()`

---

#### Task 3: Event Delegation + Recycling Coordination
**Issue:** #56 | **File:** `runtime/dom-event-delegate.js`
**Problem:** `delegatedList()` removes items from DOM but doesn't release them to
the recycling pool.
**Solution:** When items are removed from the delegated list, release their root
element to the pool if a pool is available.

**Changes:**
- `dom-event-delegate.js` — Accept `recycle` option in `delegatedList()`
- Forward `recycle` option to underlying `list()` call
- Clean up `itemMap` entries for removed items (prevent Map memory leak)

---

#### Task 4: Virtual Scrolling Integration
**Issue:** #59 | **File:** `runtime/dom-virtual-list.js`
**Problem:** `virtualList()` doesn't use event delegation (creates/destroys items
on scroll), and recycling integration is incomplete.
**Solution:** Wire event delegation for virtual list items and ensure recycling
pool is properly used for the constant create/destroy cycle.

**Changes:**
- `dom-virtual-list.js` — Add `delegate` option to use event delegation on visible items
- Wire recycling: when items scroll out of view, release to pool; when scrolling in, acquire
- Add `scrollToIndex(index)` programmatic API
- Add `aria-rowindex` to visible items for accessibility

---

#### Task 5: Benchmark Suite Completion
**Issue:** #62 | **File:** `benchmarks/`
**Problem:** No baseline storage, no regression detection, no suite filtering,
hardcoded suite list.
**Solution:** Enhance benchmark runner with baselines and CI integration.

**Changes:**
- `benchmarks/index.js` — Auto-discover `*.bench.js` files
- `benchmarks/index.js` — Add `--filter <name>` flag for running specific suites
- `benchmarks/index.js` — Add `--save` flag to save baseline to `benchmarks/results/baseline.json`
- `benchmarks/index.js` — Add `--compare` flag to compare against saved baseline
- `benchmarks/index.js` — Add regression detection (warn if >10% slower)
- `benchmarks/reactivity.bench.js` — Add `watch()`, `createState()`, `memo()` benchmarks
- Add `benchmarks/dom-list.bench.js` — Benchmark list with delegation/recycling/virtual

---

#### Task 6: TypeScript Definitions
**Files:** `types/dom.d.ts`, `types/index.d.ts`
**Problem:** No TypeScript types for `delegate`, `delegatedList`, `virtualList`,
`createElementPool`, `getPool`, `resetPool`.
**Solution:** Add complete type definitions matching the implemented APIs.

**New types:**
- `delegate(parent, event, selector, handler)` → cleanup function
- `delegatedList(getItems, template, keyFn, options)` → DocumentFragment
- `virtualList(getItems, template, keyFn, options)` → HTMLElement
- `createElementPool(options)` → ElementPool
- `getPool()` → ElementPool
- `resetPool()` → void

---

#### Task 7: Integration & Closure
**Files:** `MILESTONES.md`, GitHub issues
**Actions:**
- Run full test suite to verify no regressions
- Run benchmarks and save baseline
- Update `MILESTONES.md` to mark all M4 tasks as completed
- Close GitHub issues #56, #58, #59, #60, #62
- Update `package.json` version to 1.8.1

## Consequences

### Positive

- 10x fewer event listeners for large lists (delegation)
- Constant DOM size for 1000+ item lists (virtual scrolling)
- Reduced GC pressure from element creation (recycling)
- Batch/subscribe semantics are correct and predictable
- Benchmark baselines enable performance regression detection in CI
- TypeScript users get full type safety for new APIs

### Negative

- Recycling adds complexity to list reconciliation
- Virtual scrolling requires known item height (fixed-height only for now)
- Event delegation may behave differently for non-bubbling events

### Neutral

- Existing `list()` API unchanged — all new features are opt-in
- No new external dependencies
- Bundle size increase is minimal (~3KB for all three modules)

## Alternatives Considered

### Alternative 1: Unified `smartList()` API
Combine all three list modes into a single factory with progressive options.
**Not chosen:** Would add an abstraction layer too early. The three APIs serve
distinct use cases and forcing them together would make simple cases verbose.
Can be revisited in v2.0 if user feedback requests it.

### Alternative 2: Automatic Delegation for All Lists
Make event delegation the default for `list()`.
**Not chosen:** Could break existing behavior for non-bubbling events (focus,
blur, scroll). Better to keep it opt-in via `delegatedList()`.

## Implementation Notes

| File | Change |
|------|--------|
| `runtime/pulse.js` | Fix subscribe/batch semantics |
| `runtime/dom-list.js` | Add pool.acquire() in template wrapper |
| `runtime/dom-recycle.js` | Add `wrapTemplate()` helper |
| `runtime/dom-event-delegate.js` | Add recycling option, fix Map cleanup |
| `runtime/dom-virtual-list.js` | Add delegation, scrollToIndex, aria-rowindex |
| `benchmarks/index.js` | Auto-discovery, baselines, filtering |
| `benchmarks/reactivity.bench.js` | Add watch/createState/memo benchmarks |
| `benchmarks/dom-list.bench.js` | New: list performance with features |
| `types/dom.d.ts` | Add delegate/virtualList/recycle types |
| `types/index.d.ts` | Re-export new types |
| `MILESTONES.md` | Mark M4 tasks complete |

## Principles Applied

- P1: Zero dependencies — all performance modules use only built-in DOM APIs
- P3: Opt-in complexity — delegation/recycling/virtual are all opt-in, plain `list()` unchanged
- P5: Adapter pattern — all DOM operations go through `dom-adapter.js` for SSR compatibility
- P7: Clean public API — `delegate()`, `delegatedList()`, `virtualList()` follow naming conventions

## Related

- [ADR-0001](0001-optimize-dependency-tracking-with-generation-counter.md) — Generation counter (implemented)
- [ADR-0002](0002-event-delegation-for-list-rendering.md) — Event delegation design
- [ADR-0003](0003-virtual-scrolling-for-large-lists.md) — Virtual scrolling design
- [ADR-0004](0004-element-recycling-pool-for-list-reconciliation.md) — Element recycling design
- GitHub Milestone: https://github.com/vincenthirtz/pulse-js-framework/milestone/4
- Issues: #56, #58, #59, #60, #62
