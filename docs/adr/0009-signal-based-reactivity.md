# ADR-0009: Signal-based reactivity system

## Status

Accepted

## Date

2026-02-24

## Context

Pulse needed a reactivity model for automatic UI updates. The choice of reactivity system fundamentally shapes the framework's API, performance profile, and mental model.

## Considered Alternatives

- **Virtual DOM diffing (React-style)**: Tree-level reconciliation. Proven at scale but O(n) diffing cost per update, requires full re-render of subtrees.
- **Dirty checking (Angular-style)**: Polling for changes on digest cycles. Simple but wastes CPU checking unchanged values, poor scaling with component count.
- **Observable streams (RxJS-style)**: Powerful composition but steep learning curve, large bundle size (~30KB), and verbose for simple cases.

## Decision

Fine-grained signal-based reactivity ("pulsations"). Values are wrapped in `pulse()`, dependencies are tracked automatically in `effect()` and `computed()`. Updates propagate directly to subscribers without tree diffing.

Key design choices:
- `pulse.get()` tracks reads, `pulse.set()` / `pulse.update()` triggers effects
- `batch()` defers effect execution until all updates complete
- Circular dependency protection with a 100-iteration limit
- `untrack()` for reading without creating dependency

## Consequences

### Positive
- O(1) targeted updates — only affected subscribers run
- Minimal memory footprint — no virtual DOM tree in memory
- Simple mental model — reactive values and effects

### Negative
- Requires wrapping primitive values in `pulse()` (slightly more verbose than plain variables)
- Debugging reactive chains can be less intuitive than imperative code

### Neutral
- Aligns with the industry trend (Solid, Preact Signals, Vue 3 refs)
