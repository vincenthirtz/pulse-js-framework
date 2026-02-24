# ADR-0011: CSS selector syntax for DOM creation

## Status

Accepted

## Date

2026-02-24

## Context

Needed a concise, expressive API for programmatic DOM creation without requiring a build step (no JSX compilation).

## Considered Alternatives

- **JSX**: Familiar HTML-like syntax, excellent tooling. Requires build step and transpiler, adds complexity for a zero-dependency framework.
- **Tagged template literals**: `html\`<div class="x">\`` — no build step, but awkward for dynamic attributes and poor IDE support.
- **Hyperscript**: `h('div', { class: 'x' }, children)` — simple but verbose for common patterns.

## Decision

CSS selector syntax: `el('div.container#main[data-x=1]')` parses into DOM elements. Supports tag, id, classes, and static attributes in the selector string. Dynamic attributes and children passed as additional arguments.

Parsed selectors are cached in an LRU cache (500 entries default, configurable) with shallow-copy-on-hit to prevent cache corruption.

## Consequences

### Positive
- Very concise code — `el('button.btn.primary')` vs `createElement` + `classList.add`
- Familiar syntax for anyone who knows CSS selectors
- No build step required — works in plain `<script>` tags
- LRU cache ensures O(1) amortized selector lookups

### Negative
- Limited to CSS selector subset (no pseudo-classes, combinators)
- Selector parsing adds ~2KB to the runtime
- Less familiar than JSX for React developers

### Neutral
- The .pulse DSL compiler generates `el()` calls, so users can choose either syntax
