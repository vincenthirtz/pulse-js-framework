# Pulse Framework - Milestones & Roadmap

> Generated from comprehensive codebase audit on 2026-02-08
> Updated: 2026-02-11 | Current version: **v1.8.0** | Branch: `develop`

---

## Project Health Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Runtime modules | 35 | Comprehensive |
| Test suites | 71+ | Good coverage |
| TypeScript definitions | 26 files | Complete |
| Build tool integrations | 6 | Excellent |
| Examples | 23 | Extensive |
| External dependencies | 0 | Zero-dep |
| CI/CD workflows | 14 | Mature |

---

## ~~Milestone 1: Type/Implementation Parity (v1.8.0)~~ COMPLETED

**Status: CLOSED** | Completed in v1.8.0

All TypeScript-declared APIs now have working implementations:

- [x] **Implement `watch()` in pulse.js**
- [x] **Implement `createState()` in pulse.js**
- [x] **Implement `memo()` / `memoComputed()`**
- [x] **Implement `fromPromise()`**
- [x] **Audit all `.d.ts` files** against actual exports

---

## ~~Milestone 2: Memory Safety & Cleanup (v1.8.1)~~ COMPLETED

**Status: CLOSED** | Completed in v1.8.0

- [x] **Fix `createPreferences()` memory leak**
- [x] **Fix `createAnnouncementQueue()` cleanup**
- [x] **Fix `router.link()` cleanup**
- [x] **Audit all `create*` / `use*` functions**
- [x] **Add `Symbol.dispose` support**

---

## ~~Milestone 3: Test Coverage Hardening (v1.8.2)~~ COMPLETED

**Status: CLOSED** | Completed in v1.8.0

71+ test suites now covering all runtime modules:

- [x] **Add Vite plugin tests** - `test/vite-plugin.test.js`
- [x] **Add dev server tests** - `test/dev-server.test.js`
- [x] **Expand router tests**
- [x] **Expand async tests**
- [x] **Add dedicated transformer tests**
- [x] **Add SSR sub-module tests**
- [x] **Expand loader test coverage**
- [x] **Migrate remaining tests to `node:test`**
- [x] **Add memory cleanup tests** - `test/memory-cleanup.test.js`

---

## Milestone 4: Runtime Performance (v1.8.1)

**Priority: MEDIUM-HIGH** | Effort: ~1 week | **In Progress**

Optimize hot paths and add missing performance features.

### Tasks

- [x] **Add event delegation to `list()`** - `runtime/dom-event-delegate.js`
- [ ] **Optimize dependency tracking in `pulse.get()`**
  - Currently adds to `Set` on every `.get()` call within an effect
  - Optimize: Track only fresh dependencies per effect execution cycle
  - Use generation counter to skip redundant additions

- [x] **Add virtual scrolling for `list()`** - `runtime/dom-virtual-list.js`

- [ ] **Add `batch()` integration with `subscribe()`**
  - `subscribe()` callbacks currently fire outside batch boundaries
  - Should respect batch semantics like effects

- [x] **Add element recycling in list reconciliation** - `runtime/dom-recycle.js`

- [x] **Benchmark suite** - `benchmarks/` directory
  - Reactivity, DOM creation, list reconciliation, SSR benchmarks

- [ ] **Optimize remaining hot paths**
  - Integrate event delegation, virtual scrolling, and recycling with core `list()`
  - Performance regression tests

### Definition of Done
- Event delegation working for `list()`
- Virtual scrolling available as opt-in
- Benchmark suite with baseline numbers
- No regressions on existing tests

---

## Milestone 5: Router & Navigation Enhancements (v1.8.2)

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

## Milestone 6: Form System v2 (v1.9.0)

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

## Milestone 7: SSR & Streaming (v1.9.1)

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

## Milestone 8: Developer Experience (v1.9.2)

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

## Milestone 9: Ecosystem & Integrations (v2.0.0)

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

## Milestone 10: Code Architecture Refactoring (v2.1.0)

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
    ✅ M1 Type Parity ──┼──── ✅ M3 Test Coverage
    ✅ M2 Memory Safety  │     🔄 M4 Performance
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
| v1.8.0 | M1: Type/Implementation Parity | Week 1-2 | **DONE** |
| v1.8.0 | M2: Memory Safety & Cleanup | Week 2-3 | **DONE** |
| v1.8.0 | M3: Test Coverage Hardening | Week 3-5 | **DONE** |
| v1.8.1 | M4: Runtime Performance | Feb 28 | In Progress |
| v1.8.2 | M5: Router Enhancements | Mar 14 | Planned |
| v1.9.0 | M6: Form System v2 | Mar 28 | Planned |
| v1.9.1 | M7: SSR & Streaming | Apr 11 | Planned |
| v1.9.2 | M8: Developer Experience | Apr 25 | Planned |
| v2.0.0 | M9: Ecosystem & Integrations | May 9 | Planned |
| v2.1.0 | M10: Code Architecture | May 23 | Planned |

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
| Test suites | 71+ | 90+ |
| Runtime modules | 35 | 40+ |
| TypeScript coverage | ~90% | 100% |
| Bundle size (lite) | ~5KB | <5KB |
| Bundle size (full) | ~45KB | <40KB |
| Lighthouse a11y score | N/A | 100 |
| Build time | N/A | <2s |
