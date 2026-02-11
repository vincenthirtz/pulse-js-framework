# ADR-0003: Virtual scrolling for large lists

## Status

Accepted

## Date

2026-02-10

## Context

The current `list()` function renders all items to the DOM. For lists with 1000+ items, this causes:
- High initial render time (creating 1000+ DOM nodes)
- High memory usage (1000+ live DOM nodes + reactive subscriptions)
- Slow scroll performance (browser must composite large DOM trees)

Virtual scrolling renders only visible items plus an overscan buffer, keeping the DOM size constant regardless of data size.

**Issue:** #59

## Decision

Create a new `runtime/dom-virtual-list.js` module with a single export:

### API Design

```javascript
import { virtualList } from 'pulse-js-framework/runtime';

const vlist = virtualList(
  () => items.get(),           // Data source (reactive)
  (item, index) => el('li', item.name),  // Render function
  (item) => item.id,            // Key function
  {
    itemHeight: 40,              // Fixed row height in px (required)
    overscan: 5,                 // Extra items above/below viewport (default: 5)
    containerHeight: 400,        // Viewport height in px (or 'auto' to detect)
  }
);

// Returns a container element with:
// - Outer scroll container (fixed height, overflow-y: auto)
// - Inner spacer div (height = totalItems * itemHeight)
// - Rendered items positioned absolutely within visible range
// - Scroll listener that recalculates visible range

mount('#app', vlist);
```

### Architecture

```
┌─── Outer container (overflow-y: auto, height: containerHeight) ───┐
│                                                                    │
│  ┌─── Inner spacer (height: totalItems * itemHeight) ─────────┐   │
│  │                                                             │   │
│  │  [padding-top: startIndex * itemHeight]                     │   │
│  │                                                             │   │
│  │  ┌── Rendered Item (startIndex) ──┐                         │   │
│  │  └────────────────────────────────┘                         │   │
│  │  ┌── Rendered Item (startIndex+1) ──┐                       │   │
│  │  └──────────────────────────────────┘                       │   │
│  │  ... (only visible + overscan items rendered)               │   │
│  │  ┌── Rendered Item (endIndex) ──┐                           │   │
│  │  └──────────────────────────────┘                           │   │
│  │                                                             │   │
│  │  [remaining height fills naturally]                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Scroll handling:

1. On scroll event (throttled via `requestAnimationFrame`), calculate:
   - `startIndex = Math.floor(scrollTop / itemHeight) - overscan`
   - `endIndex = startIndex + Math.ceil(containerHeight / itemHeight) + 2 * overscan`
2. Clamp to `[0, items.length)`
3. Diff visible range against current rendered range
4. Only create/remove items at edges (not full re-render)
5. Use element recycling (ADR-0004) for removed items when available

### Integration with existing modules:

- Uses `list()` internally for the visible window (benefits from LIS diffing)
- Compatible with `delegate()` for event handling
- Works with DOM adapter for SSR (renders first visible page)

## Consequences

### Positive

- Constant DOM size regardless of data size (render ~20-30 items max)
- Smooth scrolling for 10,000+ item lists
- Low memory footprint (only visible items have DOM nodes)

### Negative

- Requires fixed item height (variable height is significantly more complex)
- Scroll position jumps can cause brief empty areas
- Search/find-in-page won't find off-screen items
- Accessibility: screen readers can't access off-screen items (mitigated by `aria-rowcount`/`aria-rowindex`)

### Neutral

- New module, doesn't affect existing `list()` behavior
- Uses `requestAnimationFrame` for scroll throttling (standard pattern)

## Alternatives Considered

### Alternative 1: Variable height virtual scrolling

Support items of different heights. Rejected for v1: adds significant complexity (need to measure items, maintain cumulative height map, handle resize). Can be added in v2 via `itemHeight: (index) => height` function.

### Alternative 2: CSS `content-visibility: auto`

Use native browser virtual scrolling via `content-visibility`. Rejected: still experimental, not all browsers support it, and it doesn't give us fine control over rendered count.

### Alternative 3: Intersection Observer-based approach

Use IntersectionObserver to detect visible items. Rejected: higher overhead than scroll-position calculation, and IO is async which can cause visible flickering.

## Implementation Notes

| File | Change |
|------|--------|
| `runtime/dom-virtual-list.js` | New module: `virtualList()` |
| `runtime/dom.js` | Re-export `virtualList` |
| `runtime/dom-adapter.js` | May need `getScrollTop()`, `setScrollTop()` helpers |

## Principles Applied

- P1: Performance-first (constant DOM size)
- P2: Opt-in complexity (new function, `list()` unchanged)
- P5: Composable (works with delegation and recycling)
- P11: DOM adapter compatible

## Related

- GitHub Issue: #59
- ADR-0002: Event delegation (used internally)
- ADR-0004: Element recycling (used for removed items)
