# ADR-0004: Element recycling pool for list reconciliation

## Status

Accepted

## Date

2026-02-10

## Context

When `list()` reconciliation removes items (Phase 3 in `dom-list.js`), DOM elements are detached and garbage collected. When new items appear, fresh elements are created via `createElement()`. DOM element creation is one of the most expensive browser operations (~10x more expensive than reusing an existing element).

Element recycling pools detached elements by tag name and reuses them for new items of the same type. This pattern is used by Android's RecyclerView and React Native's FlatList.

**Issue:** #60

## Decision

Create a new `runtime/dom-recycle.js` module with:

### API Design

```javascript
import { createElementPool, getPool } from 'pulse-js-framework/runtime/dom';

// Create a pool with configurable limits
const pool = createElementPool({
  maxPerTag: 50,        // Max recycled elements per tag (default: 50)
  maxTotal: 200,        // Max total recycled elements (default: 200)
  resetOnRecycle: true   // Reset attributes/styles on return (default: true)
});

// Acquire an element (reuses from pool or creates new)
const li = pool.acquire('li');

// Release an element back to the pool
pool.release(li);

// Get pool statistics
pool.stats();  // { size: 10, hits: 50, misses: 5, hitRate: 0.909 }

// Clear the pool
pool.clear();
```

### Integration with `list()`:

The pool is opt-in via a `recycle: true` option on `list()`:

```javascript
list(
  () => items.get(),
  (item, index) => el('li', item.name),
  (item) => item.id,
  { recycle: true }  // Enable element recycling
);
```

When `recycle: true`:
- Phase 3 (removal): Instead of `dom.removeNode()`, elements are `pool.release()`d
- Phase 2 (creation): `template()` result's root element is replaced with `pool.acquire(tagName)` if available

### Element reset on recycle:

When an element is returned to the pool, it must be cleaned to prevent data leaks:

1. Remove all event listeners (clear `_eventListeners`)
2. Remove all attributes except structural ones (tag-specific)
3. Clear `textContent`
4. Reset `className` and `style.cssText`
5. Remove all child nodes

### Pool as singleton:

A default global pool instance is provided for convenience. Custom pools can be created for isolation (testing, SSR).

```javascript
import { getPool } from 'pulse-js-framework/runtime/dom';

const globalPool = getPool();  // Default singleton
```

## Consequences

### Positive

- 3-5x faster list updates for large lists (reuse vs create)
- Reduced GC pressure (fewer allocations)
- Compatible with virtual scrolling (items cycling in/out of view are recycled)

### Negative

- Memory overhead for pooled elements (mitigated by `maxPerTag`/`maxTotal` limits)
- Element reset has cost (but less than `createElement`)
- Risk of stale state if reset is incomplete (mitigated by thorough reset function)

### Neutral

- Opt-in via `recycle: true` on `list()`, no breaking changes
- Pool is tag-name based, not template-based (simpler but less optimal for heterogeneous lists)

## Alternatives Considered

### Alternative 1: Template-based recycling

Pool elements by template function identity, not just tag name. More optimal for heterogeneous lists but adds complexity and requires WeakMap for template identity tracking. Deferred to v2.

### Alternative 2: Virtual DOM with diffing

Full VDOM layer that diffs virtual trees. Rejected: Pulse's design philosophy is direct DOM manipulation, VDOM adds overhead for the common case.

## Implementation Notes

| File | Change |
|------|--------|
| `runtime/dom-recycle.js` | New module: `createElementPool()`, `getPool()` |
| `runtime/dom-list.js` | Use pool in Phase 2 (creation) and Phase 3 (removal) when `recycle: true` |
| `runtime/dom.js` | Re-export `createElementPool`, `getPool` |

### Element reset function (critical for correctness):

```javascript
function resetElement(element, dom) {
  // 1. Remove event listeners
  element._eventListeners?.clear();
  // 2. Clear attributes
  while (element.attributes?.length > 0) {
    element.removeAttribute(element.attributes[0].name);
  }
  // 3. Clear content and styles
  element.textContent = '';
  element.className = '';
  if (element.style) element.style.cssText = '';
  // 4. Remove child nodes
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
```

## Principles Applied

- P1: Performance-first (reuse > create)
- P2: Opt-in complexity (`recycle: true` flag)
- P7: Memory-conscious (bounded pool with limits)
- P11: DOM adapter compatible (uses adapter for element operations)

## Related

- GitHub Issue: #60
- ADR-0003: Virtual scrolling (primary consumer of recycling)
- ADR-0002: Event delegation (complementary optimization)
