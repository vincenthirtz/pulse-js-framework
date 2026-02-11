# ADR-0002: Event delegation for list rendering

## Status

Accepted

## Date

2026-02-10

## Context

Currently, `list()` renders each item via a `template` function. Event handlers are attached per-item via `el('li', { onclick: handler })`. For a list of 1000 items with 3 handlers each, that's 3000 `addEventListener` calls.

Event delegation places a single listener on the parent that intercepts events bubbling from children. This reduces memory, speeds up rendering, and handles dynamic content automatically.

**Issue:** #56

## Decision

Create `runtime/dom-event-delegate.js` with two exports:

### 1. `delegate(parent, eventType, selector, handler)` - Low-level composable

```javascript
const cleanup = delegate(listContainer, 'click', '[data-key]', (event, matchedEl) => {
  handleItemClick(matchedEl.dataset.key);
});
```

### 2. `delegatedList(getItems, template, keyFn, options)` - High-level integration

```javascript
const fragment = delegatedList(
  () => items.get(),
  (item, index) => el('li', item.name),
  (item) => item.id,
  {
    on: {
      click: (event, item, index) => selectItem(item),
      dblclick: (event, item, index) => editItem(item)
    }
  }
);
```

**Mechanism:** One listener per event type on the container. On dispatch, walks `event.target` up via `closest('[data-pulse-key]')`, looks up item in internal `Map<key, { item, index }>`, calls handler with `(event, item, index)`.

Non-bubbling events (`focus`, `blur`, etc.) use `capture: true` on the parent.

## Consequences

### Positive

- 10x fewer event listeners for large lists
- Faster initial render and teardown
- New items automatically handled

### Negative

- Slight lookup overhead per event dispatch (`closest()` + Map lookup)
- Non-bubbling events require capture mode

### Neutral

- Existing `list()` unchanged - `delegatedList` is a new function

## Alternatives Considered

### Alternative 1: Modify `list()` to auto-delegate

Rejected: breaking change for non-bubbling events and edge cases.

### Alternative 2: Proxy-based interception in DOM adapter

Rejected: too magical, harder to debug.

## Implementation Notes

| File | Change |
|------|--------|
| `runtime/dom-event-delegate.js` | New module: `delegate()`, `delegatedList()` |
| `runtime/dom.js` | Re-export `delegate`, `delegatedList` |

## Principles Applied

- P1: Performance-first (fewer listeners)
- P2: Opt-in complexity (existing `list()` unchanged)
- P5: Composable primitives (`delegate()` is standalone)

## Related

- GitHub Issue: #56
- ADR-0003: Virtual scrolling (uses delegation internally)
- ADR-0004: Element recycling (compatible with delegation)
