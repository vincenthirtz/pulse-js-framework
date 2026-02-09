# Pulse Framework - Milestones & Roadmap

> Generated from comprehensive codebase audit on 2026-02-08
> Current version: **v1.7.33** | Branch: `develop`

---

## Project Health Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Runtime modules | 35 | Comprehensive |
| Test suites | 75 | Good coverage |
| TypeScript definitions | 26 files | Complete |
| Build tool integrations | 6 | Excellent |
| Examples | 23 | Extensive |
| External dependencies | 0 | Zero-dep |
| CI/CD workflows | 14 | Mature |

---

## Milestone 1: Type/Implementation Parity (v1.8.0)

**Priority: CRITICAL** | Effort: ~1 week

Several APIs are declared in TypeScript definitions but missing from the runtime. This creates broken contracts for TypeScript users.

### Tasks

- [ ] **Implement `watch()` in pulse.js**
  - Declared in `types/pulse.d.ts` but not exported from `runtime/pulse.js`
  - Should observe a single pulse and run callback on change (simpler than `effect()`)
  - API: `watch(pulse, callback, options?) => unwatch`

- [ ] **Implement `createState()` in pulse.js**
  - Declared in `types/pulse.d.ts` but missing from runtime
  - Creates a reactive object (proxy-based) from a plain object
  - API: `createState({ count: 0, name: '' }) => ReactiveState`

- [ ] **Implement `memo()` / `memoComputed()`**
  - Declared in types but not implemented
  - Memoize expensive computations with custom cache key
  - API: `memo(fn, deps?) => memoized`

- [ ] **Implement `fromPromise()`**
  - Declared in `types/pulse.d.ts` but missing
  - Wraps a Promise into reactive state `{ data, loading, error }`
  - API: `fromPromise(promise) => { data: Pulse, loading: Pulse, error: Pulse }`

- [ ] **Audit all `.d.ts` files** against actual exports
  - Ensure every declared type has a corresponding implementation
  - Remove types for non-existent APIs or add stub implementations

### Definition of Done
- All TypeScript-declared APIs have working implementations
- Tests for each new API (min 10 tests each)
- CLAUDE.md updated with new API docs

---

## Milestone 2: Memory Safety & Cleanup (v1.8.1)

**Priority: HIGH** | Effort: ~3 days

Fix memory leaks and ensure all "create*" functions return cleanup.

### Tasks

- [ ] **Fix `createPreferences()` memory leak** (`runtime/a11y.js:528-554`)
  - 7+ `addEventListener` calls on `window.matchMedia` with no `removeEventListener`
  - Return a `cleanup()` function that removes all listeners

- [ ] **Fix `createAnnouncementQueue()` cleanup** (`runtime/a11y.js:1575-1592`)
  - Pending `setTimeout` callbacks not cancellable on dispose
  - Track timer IDs and clear on cleanup

- [ ] **Fix `router.link()` cleanup** (`runtime/router.js`)
  - Adds click event listeners but returns no cleanup function
  - Return dispose function for dynamically created links

- [ ] **Audit all `create*` / `use*` functions**
  - Ensure every function that registers listeners returns a cleanup/dispose
  - Modules to audit: `a11y.js`, `router.js`, `websocket.js`, `async.js`, `form.js`

- [ ] **Add `Symbol.dispose` support** (using TC39 Explicit Resource Management)
  - Allow `using cleanup = createPreferences()` pattern
  - Future-proof for upcoming JS standard

### Definition of Done
- Zero event listener leaks in long-running SPA scenario
- All `create*` functions return cleanup
- Tests verify cleanup removes all listeners

---

## Milestone 3: Test Coverage Hardening (v1.8.2)

**Priority: HIGH** | Effort: ~2 weeks

Close critical test coverage gaps. Currently 75 suites, target 85+.

### Tasks

- [ ] **Add Vite plugin tests** (CRITICAL - 0 tests currently)
  - `test/vite-plugin.test.js` - Target: 40+ tests
  - Cover: HMR, CSS extraction, preprocessor integration, source maps
  - This is the primary build tool and has zero dedicated tests

- [ ] **Add dev server tests** (CRITICAL - 0 tests)
  - `test/dev-server.test.js` - Target: 30+ tests
  - Cover: File watching, hot reload, error overlay, port handling

- [ ] **Expand router tests** (11 tests → 40+)
  - Nested routes, query parameter encoding, middleware chaining
  - Guard cancellation, lazy loading race conditions, scroll restoration

- [ ] **Expand async tests** (11 tests → 40+)
  - Race conditions, abort handling, retry logic, cache invalidation
  - `useResource` SWR behavior, `usePolling` pause/resume

- [ ] **Add dedicated transformer tests**
  - `test/transformer-view.test.js` - Template compilation edge cases
  - `test/transformer-state.test.js` - State block compilation
  - `test/transformer-expressions.test.js` - Expression parsing

- [ ] **Add SSR sub-module tests**
  - `test/ssr-async.test.js` - Async data collection
  - `test/ssr-serializer.test.js` - HTML serialization

- [ ] **Expand loader test coverage** (avg 8.5 → 30+ tests each)
  - webpack, rollup, esbuild, parcel, swc plugins

- [ ] **Migrate remaining tests to `node:test`**
  - 8 files still use custom test runner from `test/utils.js`
  - Standardize on native `node:test` for consistency

### Definition of Done
- 85+ test suites
- All runtime modules have dedicated test files
- Vite plugin and dev server fully tested
- CI green on all suites

---

## Milestone 4: Runtime Performance (v1.9.0)

**Priority: MEDIUM-HIGH** | Effort: ~1 week

Optimize hot paths and add missing performance features.

### Tasks

- [ ] **Add event delegation to `list()`**
  - Current: Each list item gets individual event listeners
  - Target: Single delegated listener on parent, dispatch to items
  - Impact: 10x fewer listeners for large lists (100+ items)

- [ ] **Optimize dependency tracking in `pulse.get()`**
  - Currently adds to `Set` on every `.get()` call within an effect
  - Optimize: Track only fresh dependencies per effect execution cycle
  - Use generation counter to skip redundant additions

- [ ] **Add virtual scrolling for `list()`**
  - New export: `virtualList(items, render, key, { height, overscan })`
  - Only render visible items + overscan buffer
  - Critical for lists with 1000+ items

- [ ] **Add `batch()` integration with `subscribe()`**
  - `subscribe()` callbacks currently fire outside batch boundaries
  - Should respect batch semantics like effects

- [ ] **Add element recycling in list reconciliation**
  - Reuse detached DOM elements instead of creating new ones
  - Pool unused elements by tag name

- [ ] **Benchmark suite**
  - Create `benchmarks/` directory with reproducible perf tests
  - Track: reactivity throughput, DOM creation, list reconciliation, SSR speed
  - Compare against Solid, Svelte, Vue 3

### Definition of Done
- Event delegation working for `list()`
- Virtual scrolling available as opt-in
- Benchmark suite with baseline numbers
- No regressions on existing tests

---

## Milestone 5: Router & Navigation Enhancements (v1.9.1)

**Priority: MEDIUM** | Effort: ~1 week

Close feature gaps versus Vue Router / Next.js routing.

### Tasks

- [ ] **Add route transitions API**
  - `onBeforeLeave(callback)` - Confirm navigation away
  - `onAfterEnter(callback)` - Post-navigation hook
  - CSS transition class support: `.route-enter`, `.route-leave`

- [ ] **Add route aliases and redirects**
  - `{ '/old-path': { redirect: '/new-path' } }`
  - `{ '/alias': { alias: '/actual' } }`

- [ ] **Improve query parameter handling**
  - Auto-encode special characters in `router.navigate(path, { query })`
  - Parse typed query params: `router.query.get().page` as number
  - Array query params: `?tags=a&tags=b` → `{ tags: ['a', 'b'] }`

- [ ] **Add route groups for shared layouts**
  - Group routes under a layout without affecting URL
  - `{ group: 'admin', layout: AdminLayout, children: [...] }`

- [ ] **Add navigation progress indicator**
  - `router.loading` pulse (true during lazy load / async guards)
  - NProgress-style bar integration example

- [ ] **Add `router.back()` / `router.forward()` helpers**
  - Convenience wrappers around history API
  - Integrate with scroll restoration

### Definition of Done
- Route transitions working with CSS classes
- Aliases/redirects functional
- Query params properly encoded/decoded
- Navigation loading state reactive

---

## Milestone 6: Form System v2 (v1.9.2)

**Priority: MEDIUM** | Effort: ~1 week

Improve form handling to match Formik/React Hook Form capabilities.

### Tasks

- [ ] **Add form submission state management**
  - `isSubmitting` pulse during async `onSubmit`
  - `submitError` pulse for server-side errors
  - `submitCount` for tracking attempts

- [ ] **Add conditional validation**
  - `validators.when(condition, validators[])` - Validate only when condition met
  - `validators.unless(condition, validators[])` - Inverse

- [ ] **Add cross-field validation**
  - Form-level `validate: (allValues) => errors` function
  - Return `{ fieldName: 'error' }` for specific fields
  - Return `{ _form: 'error' }` for form-level errors

- [ ] **Add field groups**
  - `useFieldGroup('address', { street, city, zip })`
  - Validate/reset groups independently

- [ ] **Add file upload support**
  - `useFileField()` with drag-and-drop, preview, progress
  - Size/type validation

- [ ] **Add form persistence**
  - `persist: true` option to save draft to localStorage
  - Auto-restore on page reload

### Definition of Done
- Submission state reactive and accessible
- Conditional and cross-field validation working
- File upload helper functional
- Form persistence opt-in

---

## Milestone 7: SSR & Streaming (v2.0.0)

**Priority: MEDIUM** | Effort: ~2 weeks

Major SSR improvements for production deployment.

### Tasks

- [ ] **Add streaming SSR**
  - `renderToStream()` returns a ReadableStream
  - Send shell HTML immediately, stream content as resolved
  - Compatible with Node.js `pipe()` and Web Streams

- [ ] **Add selective SSR**
  - `@client` directive: skip component during SSR
  - `@server` directive: render only during SSR
  - `<ClientOnly>` wrapper component

- [ ] **Add preload hint generation**
  - Auto-generate `<link rel="preload">` for lazy routes
  - Auto-generate `<link rel="modulepreload">` for JS chunks
  - Integrate with build output manifest

- [ ] **Add hydration mismatch detection**
  - Dev-mode warning when server HTML differs from client render
  - Show diff of expected vs actual DOM
  - Suppress in production

- [ ] **Add per-component async timeout**
  - Override global timeout for specific components
  - `{ timeout: 3000 }` option in `useAsync()` for SSR context

- [ ] **Add static site generation (SSG)**
  - `pulse build --ssg` to pre-render all routes
  - Output static HTML files for each route
  - Selective: some routes SSG, others SSR

- [ ] **Express/Hono/Fastify adapters**
  - `createPulseMiddleware(app)` for popular Node frameworks
  - Handles routing, SSR, and asset serving

### Definition of Done
- Streaming SSR working with Express adapter
- Hydration mismatch warnings in dev mode
- SSG mode for static routes
- Preload hints auto-generated

---

## Milestone 8: Developer Experience (v2.0.1)

**Priority: MEDIUM** | Effort: ~1 week

Polish DX tooling and error messages.

### Tasks

- [ ] **Extract magic numbers to `runtime/constants.js`**
  - Centralize all timeout/interval/limit values
  - 8+ files have hardcoded values (1000ms, 30000ms, 300000ms, etc.)
  - Make configurable via `configure()` API

- [ ] **Improve error recovery suggestions**
  - Every PulseError should include actionable suggestion
  - Link to relevant docs page
  - Show code example of the fix

- [ ] **Add `pulse doctor --deep` mode**
  - Check for memory leaks (orphaned effects)
  - Check for circular dependencies in store
  - Check for unused state variables
  - Performance audit (slow effects, large lists without keys)

- [ ] **Add component dev overlay**
  - Show component boundaries on hover (like React DevTools)
  - Show reactive dependency count
  - Highlight re-renders

- [ ] **Improve CLI output**
  - Add progress bars for long operations (build, analyze)
  - Add color-coded diff for format changes
  - Interactive mode for scaffold with prompts

- [ ] **Add `createRef()` / `useRef()` system**
  - Imperative access to DOM elements
  - `const ref = createRef(); el('input', { ref }); ref.current.focus()`

### Definition of Done
- Constants centralized and configurable
- Error messages include suggestions and doc links
- Doctor deep mode identifies common issues
- Ref system functional

---

## Milestone 9: Ecosystem & Integrations (v2.1.0)

**Priority: LOW-MEDIUM** | Effort: ~2 weeks

Expand the ecosystem with plugins and integrations.

### Tasks

- [ ] **Add Server-Sent Events (SSE) support**
  - `useEventSource(url, options)` for SSE connections
  - Reactive state: `{ data, connected, error }`
  - Auto-reconnect like WebSocket

- [ ] **Add persistence adapters**
  - IndexedDB adapter for large data
  - SessionStorage adapter for session-scoped state
  - Custom adapter interface

- [ ] **Add animation system**
  - `animate(element, keyframes, options)` wrapper
  - `useTransition(condition)` for enter/leave transitions
  - Respect `prefers-reduced-motion`

- [ ] **Add i18n runtime module**
  - `createI18n({ locale, messages })`
  - `t('key', params)` translation function
  - Reactive locale switching
  - Pluralization support

- [ ] **Add portal implementation**
  - `portal(targetSelector, children)` for rendering outside DOM tree
  - Used for modals, tooltips, dropdowns
  - Already exported from `dom-advanced.js` but needs completion

- [ ] **Add service worker integration**
  - `registerServiceWorker(url, options)` helper
  - Offline-first patterns
  - Cache strategy configuration

### Definition of Done
- SSE client functional with reactive state
- At least 2 persistence adapters working
- Animation system respects reduced motion
- Portal rendering modals outside app root

---

## Milestone 10: Code Architecture Refactoring (v2.2.0)

**Priority: LOW** | Effort: ~2 weeks

Improve maintainability of large modules.

### Tasks

- [ ] **Split `runtime/a11y.js`** (1,828 LOC)
  - `a11y/focus.js` - Focus management (trapFocus, focusFirst, etc.)
  - `a11y/announcements.js` - Screen reader announcements
  - `a11y/widgets.js` - ARIA widgets (modal, tabs, menu, accordion)
  - `a11y/validation.js` - A11y validation and audit
  - `a11y/preferences.js` - User preferences (reduced motion, etc.)
  - `a11y/index.js` - Re-export barrel

- [ ] **Split `runtime/graphql.js`** (1,326 LOC)
  - `graphql/client.js` - Core client
  - `graphql/cache.js` - Query caching
  - `graphql/subscriptions.js` - WebSocket subscriptions
  - `graphql/hooks.js` - useQuery, useMutation, useSubscription

- [ ] **Split `runtime/router.js`** (1,220 LOC)
  - `router/core.js` - Route matching (radix trie)
  - `router/guards.js` - Navigation guards & middleware
  - `router/history.js` - History management & scroll
  - `router/lazy.js` - Lazy loading

- [ ] **Split `compiler/parser.js`** (2,356 LOC)
  - `parser/core.js` - Base parser infrastructure
  - `parser/view.js` - View block parsing
  - `parser/state.js` - State block parsing
  - `parser/style.js` - Style block parsing

- [ ] **Add module dependency graph**
  - Document internal module dependencies
  - Ensure no circular imports
  - Visualize with Graphviz

### Definition of Done
- All files under 600 LOC
- No circular dependencies
- All existing tests pass unchanged
- Import paths unchanged (barrel re-exports)

---

## Priority Matrix

```
                    HIGH IMPACT
                        │
    M1 Type Parity ─────┼──── M3 Test Coverage
    M2 Memory Safety    │     M4 Performance
                        │
  LOW EFFORT ───────────┼─────────── HIGH EFFORT
                        │
    M8 DX Polish        │     M7 SSR Streaming
    M5 Router           │     M9 Ecosystem
    M6 Forms            │     M10 Refactoring
                        │
                   LOW IMPACT
```

---

## Suggested Release Schedule

| Version | Milestone | Target | Status |
|---------|-----------|--------|--------|
| v1.8.0 | M1: Type/Implementation Parity | Week 1-2 | Planned |
| v1.8.1 | M2: Memory Safety & Cleanup | Week 2-3 | Planned |
| v1.8.2 | M3: Test Coverage Hardening | Week 3-5 | Planned |
| v1.9.0 | M4: Runtime Performance | Week 5-6 | Planned |
| v1.9.1 | M5: Router Enhancements | Week 6-7 | Planned |
| v1.9.2 | M6: Form System v2 | Week 7-8 | Planned |
| v2.0.0 | M7: SSR & Streaming | Week 8-10 | Planned |
| v2.0.1 | M8: Developer Experience | Week 10-11 | Planned |
| v2.1.0 | M9: Ecosystem & Integrations | Week 11-13 | Planned |
| v2.2.0 | M10: Code Architecture | Week 13-15 | Planned |

---

## Quick Wins (Can Be Done Anytime)

These improvements are small, low-risk, and can be tackled independently:

1. **Extract constants** - Move hardcoded timeouts/limits to `runtime/constants.js`
2. **Add `router.back()`/`router.forward()`** - Simple history wrappers
3. **Fix bare `catch {}` blocks** - Add at minimum a debug log
4. **Add eviction callback to LRU cache** - `onEvict: (key, value) => {}`
5. **Add per-namespace log levels** - `setLogLevel('router', LogLevel.DEBUG)`
6. **Document portal API** - Already exported, needs examples
7. **Add `form.isSubmitting` pulse** - Simple addition to form.js
8. **Freeze store return values** - `Object.freeze()` in dev mode to prevent mutations

---

## Key Metrics to Track

| Metric | Current | Target (v2.0) |
|--------|---------|---------------|
| Test suites | 75 | 90+ |
| Runtime modules | 35 | 40+ |
| TypeScript coverage | ~90% | 100% |
| Bundle size (lite) | ~5KB | <5KB |
| Bundle size (full) | ~45KB | <40KB |
| Lighthouse a11y score | N/A | 100 |
| Build time | N/A | <2s |
