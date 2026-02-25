# ADRs & Milestones - Architecture Decision Records and milestone plans.

## Architecture Decision Records

| ID | Title | Status | Key Decision | Files Affected |
|----|-------|--------|-------------|----------------|
| 0001 | Generation Counter for Dependency Tracking | Accepted | Add generation counter to skip redundant `Set.add()` in `Pulse.get()`. 40-60% tracking overhead reduction. | `runtime/pulse.js` |
| 0002 | Event Delegation for List Rendering | Accepted | Single listener on parent container via `delegate()` and `delegatedList()`. 10x fewer listeners. | `runtime/dom-event-delegate.js` (new) |
| 0003 | Virtual Scrolling for Large Lists | Accepted | `virtualList()` renders only visible items + overscan buffer. Requires fixed item height. Throttled via rAF. | `runtime/dom-virtual-list.js` (new) |
| 0004 | Element Recycling Pool | Accepted | Pool elements by tag name via `createElementPool()`. Reuse in `list()` with `recycle: true`. 3-5x faster list updates. | `runtime/dom-recycle.js` (new) |
| 0005 | v1.8.1 Runtime Performance Plan | Accepted | 7-task plan: batch/subscribe, list recycling, event delegation, virtual scrolling, benchmarks, TypeScript defs, integration tests. | `runtime/pulse.js`, `runtime/dom.js`, new modules |
| 0006 | v1.9.0 Form System V2 Plan | Accepted | 5 features: submit error state, conditional validation (`when`/`unless`), cross-field validation, file upload (`useFileField`), draft persistence. | `runtime/form.js` |
| 0007 | v1.9.1 SSR Streaming Plan | Accepted | 6 tasks: streaming SSR (`renderToStream`), @client/@server directives, hydration mismatch detection, preload hints, SSG (`pulse build --ssg`), framework adapters. | `runtime/ssr-stream.js`, `compiler/`, `cli/` |
| 0008 | v2.0.0 Ecosystem Integrations Plan | Accepted | 6 new modules: SSE, persistence adapters, animation system, i18n, portal completion, service worker. All zero-dep, reactive, SSR-compatible. | New runtime modules |
| 0009 | Signal-Based Reactivity | Accepted | Fine-grained signals ("pulsations"). Values in `pulse()`, auto-tracked in `effect()`/`computed()`. O(1) targeted updates, no VDOM. | Core architecture |
| 0010 | Zero Dependencies | Accepted | Entire framework (runtime, compiler, CLI, plugins) built in-house. CSS preprocessors are optional peer deps. Zero supply chain risk. | All modules |
| 0011 | CSS Selector DOM Creation | Accepted | `el('div.container#main[data-x=1]')` parses selector into DOM elements. LRU cache (500 entries). ~2KB overhead. | `runtime/dom.js` |
| 0012 | Optional CSS Preprocessors | Accepted | Auto-detect SASS/LESS/Stylus in style blocks. Priority: SASS > LESS > Stylus. Falls back to plain CSS. | `compiler/preprocessor.js` |
| 0013 | Custom Error Hierarchy | Accepted | `CompileError` (Lexer/Parser/Transform), `RuntimeError` (Reactivity/DOM/Store/Router), `CLIError` (Config). All have code, suggestion, location. | `runtime/errors.js` |

## Milestone Plans

| Version | Focus | Key Features |
|---------|-------|-------------|
| v1.8.1 (Milestone 4) | Runtime Performance | Generation counter, element recycling, event delegation, virtual scrolling, benchmark suite |
| v1.8.2 | Router Enhancements | `back()`/`forward()`, query param handling, route aliases, loading state, route groups, transitions |
| v1.9.0 (Milestone 6) | Form System V2 | Submit error state, conditional validators, cross-field validation, file uploads, draft persistence |
| v1.9.1 (Milestone 7) | SSR Streaming | Streaming SSR, @client/@server directives, hydration mismatch, preload hints, SSG, framework adapters |
| v2.0.0 (Milestone 9) | Ecosystem | SSE, persistence adapters, animations, i18n, portal enhancements, service worker |

## Foundational Principles

These ADRs (0009-0013) define the core architecture that all code must follow:

1. **Signal-based reactivity** (0009): All reactive state via `pulse()`, dependency tracking in `effect()`/`computed()`, no virtual DOM
2. **Zero dependencies** (0010): No production dependencies. CSS preprocessors (sass, less, stylus) are optional peer deps only
3. **CSS selector syntax** (0011): `el('tag#id.class[attr=val]')` for declarative DOM creation with LRU caching
4. **Optional preprocessors** (0012): Auto-detect and compile SASS/LESS/Stylus if installed, transparent fallback to CSS
5. **Structured errors** (0013): Three error branches (Compile/Runtime/CLI) with error codes, suggestions, and source locations

## Milestone 4 Implementation Details

Issue-level breakdown for runtime performance:
- **#58**: Generation counter (~10 lines in pulse.js)
- **#62**: Benchmark suite (~400 lines new directory)
- **#60**: Element recycling pool (~120 lines new module)
- **#56**: Event delegation (~150 lines new module)
- **#59**: Virtual scrolling (~180 lines new module)

All features opt-in, no breaking changes.

## v1.8.2 Router Tasks

6 enhancements ordered by dependency:
1. **#73**: `back()`/`forward()` with scroll restoration
2. **#70**: Query parameter handling (array params, typed parsing)
3. **#68**: Route aliases and redirects
4. **#72**: Loading state (`router.loading` pulse)
5. **#71**: Route groups with shared layouts
6. **#66**: Route transitions and lifecycle hooks
