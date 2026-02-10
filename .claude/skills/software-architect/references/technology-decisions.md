# Technology Decisions - Pulse JS Framework

## Overview

This document records the key technology choices made in the Pulse framework, the alternatives considered, and the rationale for each decision. Use this as context when evaluating new technology choices.

## TD-001: Zero Runtime Dependencies

**Decision**: Pulse runtime has zero npm dependencies.

**Alternatives considered**:
- Use `preact` for virtual DOM
- Use `rxjs` for reactive streams
- Use `lit-html` for template rendering

**Rationale**:
- Eliminates supply chain risk entirely
- Guarantees bundle size control
- No version conflicts with user's dependencies
- Full control over performance characteristics
- Simpler mental model for contributors

**Trade-offs**:
- More code to maintain (reimplemented LRU cache, HTTP client, etc.)
- No community-maintained utility libraries
- Must implement security utilities ourselves

**Status**: Accepted, foundational decision.

## TD-002: Signals-Based Reactivity (not VDOM)

**Decision**: Use fine-grained signals (Pulse) instead of virtual DOM diffing.

**Alternatives considered**:
- Virtual DOM (React-style reconciliation)
- Dirty checking (Angular-style)
- Streams (RxJS-style observables)

**Rationale**:
- O(1) updates - only affected DOM nodes update (not entire subtree)
- No diffing overhead
- Predictable performance (not dependent on tree size)
- Natural async integration (each signal is independent)
- Simpler mental model than streams

**Trade-offs**:
- More complex initial implementation
- Must manually handle dependency tracking
- List reconciliation still needs diffing (LIS algorithm)
- Memory overhead per reactive value (subscriber sets)

**Status**: Accepted, core architecture.

## TD-003: CSS Selector DSL for DOM Creation

**Decision**: Use `el('div.container#main')` CSS selector syntax instead of JSX or template literals.

**Alternatives considered**:
- JSX (requires transpiler)
- Tagged template literals (htm-style)
- Hyperscript (`h('div', { class: 'container' })`)
- Builder pattern (`div().class('container').id('main')`)

**Rationale**:
- No build step required (works in vanilla JS)
- Familiar syntax (CSS selectors are universal knowledge)
- Concise for common patterns
- Attributes via object literal (type-safe, IDE-friendly)

**Trade-offs**:
- Limited selector syntax (no pseudo-classes, combinators)
- Parsing overhead (mitigated by LRU cache)
- Less readable for complex templates
- No syntax highlighting in IDEs for selector strings

**Status**: Accepted.

## TD-004: Custom DSL (.pulse files)

**Decision**: Create a custom `.pulse` file format with state/view/style blocks.

**Alternatives considered**:
- Vue SFC-style (template/script/style)
- Svelte-style (script at top, HTML, style)
- JSX-only (no custom file format)

**Rationale**:
- Declarative state (no boilerplate for signals)
- CSS scoping built-in
- SASS/LESS/Stylus auto-detection
- Accessibility directives (`@a11y`, `@live`, `@focusTrap`)
- Custom syntax enables better error messages

**Trade-offs**:
- Requires compiler and build tool plugins
- New syntax to learn
- IDE support requires custom extensions
- Maintenance burden for lexer/parser/transformer

**Status**: Accepted.

## TD-005: Node.js Built-in Test Runner

**Decision**: Use `node:test` and `node:assert` instead of Jest, Vitest, or Mocha.

**Alternatives considered**:
- Jest (most popular, snapshot testing)
- Vitest (Vite-native, fast)
- Mocha + Chai (flexible, mature)
- uvu (ultra-lightweight)

**Rationale**:
- Zero test framework dependency
- Ships with Node.js 18+ (our minimum version)
- Built-in mocking (`mock`), timers (`mock.timers`)
- Coverage via `c8` (V8 native coverage)
- Consistent with zero-dependency philosophy

**Trade-offs**:
- Less mature than Jest/Vitest
- No snapshot testing built-in
- Fewer community plugins
- Parallel execution less configurable
- No watch mode as sophisticated as Vitest

**Status**: Accepted.

## TD-006: DOM Adapter Abstraction

**Decision**: Abstract all DOM operations behind `DOMAdapter` interface.

**Alternatives considered**:
- jsdom for SSR/testing
- happy-dom for SSR/testing
- Direct DOM API with feature detection

**Rationale**:
- No jsdom dependency (heavy, slow)
- `MockDOMAdapter` is lightweight (~200 lines)
- Same code path for browser, SSR, and testing
- Easy to add new rendering targets (e.g., native)

**Trade-offs**:
- Indirection layer adds complexity
- `MockDOMAdapter` doesn't implement full DOM spec
- Some DOM features need manual adapter updates

**Status**: Accepted.

## TD-007: Optional CSS Preprocessors

**Decision**: Support SASS, LESS, and Stylus as optional peer dependencies with auto-detection.

**Alternatives considered**:
- Bundle a CSS preprocessor (increases size)
- Support only one preprocessor
- No preprocessor support (plain CSS only)
- PostCSS-based approach

**Rationale**:
- Developers keep using their preferred preprocessor
- Auto-detection means zero config
- No bundle size impact when not used
- Strategy pattern makes adding new preprocessors easy

**Trade-offs**:
- Three code paths to maintain
- Auto-detection can be ambiguous
- Async-only for LESS (no sync API available)
- Version compatibility with preprocessor packages

**Status**: Accepted.

## TD-008: Koa-Style Router Middleware

**Decision**: Use Koa-style `async (ctx, next)` middleware for the router.

**Alternatives considered**:
- Express-style `(req, res, next)` middleware
- Guard functions only (Vue Router style)
- Hook-based (React Router style)

**Rationale**:
- Clean async/await flow
- Before AND after logic in same function
- Composable (middleware wraps middleware)
- Familiar to Node.js developers

**Trade-offs**:
- More complex than simple guard functions
- Potential for middleware ordering bugs
- `ctx` object accumulates properties (type safety)

**Status**: Accepted.

## TD-009: LRU Cache for Selector Parsing

**Decision**: Use bounded LRU cache (500 entries) for parsed selectors.

**Alternatives considered**:
- Unbounded Map (simpler, memory leak risk)
- WeakMap (can't use string keys)
- No caching (parse every time)
- Time-based expiry (TTL cache)

**Rationale**:
- O(1) lookup for repeated selectors
- Bounded memory (500 entries covers most apps)
- LRU eviction keeps hot selectors cached
- Shallow copy on hit prevents cache corruption

**Trade-offs**:
- Extra memory per cached entry
- Shallow copy overhead on cache hit
- 500 default may be too low for very large apps (configurable)

**Status**: Accepted.

## TD-010: Structured Error Hierarchy

**Decision**: Use typed error classes (`PulseError`, `CompileError`, `RuntimeError`) with metadata.

**Alternatives considered**:
- Error codes only (no class hierarchy)
- Result type (Rust-style `Ok/Err`)
- Error events (EventEmitter pattern)

**Rationale**:
- `instanceof` checks for error handling
- Source location tracking (line, column, file)
- Suggestions and docs URLs for developer experience
- `formatWithSnippet()` shows code context

**Trade-offs**:
- More boilerplate for error creation
- Class hierarchy can be over-engineered
- Bundle size for error classes and messages

**Status**: Accepted.

## TD-011: ES Modules Throughout

**Decision**: Use ES Modules (`import`/`export`) exclusively.

**Alternatives considered**:
- CommonJS (`require`/`module.exports`)
- Dual package (both ESM and CJS)
- UMD (Universal Module Definition)

**Rationale**:
- Tree-shaking support (dead code elimination)
- Static analysis possible (bundler optimization)
- Native browser support (no bundler required)
- Modern Node.js standard (18+ fully supports ESM)

**Trade-offs**:
- No CJS compatibility (older tools may struggle)
- `__dirname` not available (use `import.meta.url`)
- Dynamic imports need `await`
- Some test tooling has ESM quirks

**Status**: Accepted.
