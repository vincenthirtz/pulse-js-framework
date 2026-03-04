# Recent Work — pulse-js-framework

_Last updated: 2026-03-04_

## Last 10 Commits

```
eef9810 feat: add missing tests, fix ssr-serializer, add animation/persistence/sse docs
413ca77 Merge pull request #125 from vincenthirtz/release/v1.11.4
7607d34 chore(release): bump version to 1.11.4
da2449e Merge pull request #124 from vincenthirtz/develop
ebb5ff4 fix(security): unify URL scheme checks (javascript/vbscript/data) in single block
e8597d7 fix(security): consolidate data: URI check to strict allowlist
0313658 fix(security): resolve remaining CodeQL alerts, add config for compiler exclusion
b919f33 ci: upgrade CodeQL Action from v3 to v4
4ba794e fix(security): resolve all 93 open CodeQL alerts
cfb506f fix(compiler): resolve O(n²) perf issues, edge cases, dead code, and boost coverage
```

## Work Done in 2026-03-04 Session

### Bug Fixes
- `runtime/ssr-serializer.js`: Skip `on*` event handler attributes in SSR output
- `runtime/ssr-serializer.js`: Use HTML entities for comment sanitization
  (replaces backslash-unicode escape sequences with `&#x2D;` and `&#x3E;`)

### New Tests
- `test/index.test.js` — 20 tests for main entry point (VERSION, re-exports)
- `test/ssr-async-coverage-boost.test.js` — 28 tests for SSR async context
- `test/ssr-serializer-coverage-boost.test.js` — 41 tests for HTML serializer

### New Documentation
- `.claude/context/api-animation-persistence-sse.md` — Full API reference for
  animation, persistence, and SSE modules (previously undocumented)

### New Features
- `runtime/websocket.js`: Added `queueEvictionStrategy` option (`'fifo'` default,
  `'drop-new'`, `'drop-all'`) to `MessageQueue` and `createWebSocket`
- `runtime/async.js`: Added `useAbortable()` public hook — high-level
  race-condition-safe wrapper around `createVersionedAsync`

### Infrastructure
- `memory/MEMORY.md` — Project overview for lead-developer skill
- `memory/cache/project-snapshot.md` — Stats and versions
- `memory/cache/test-status.md` — Test coverage and patterns
- `memory/cache/recent-work.md` — This file

## Active Branch

`main` (commits pending push to develop via PR)

## Open Issues / Backlog

- [ ] Form module split (`form.js` 47 KB → sub-modules for tree-shaking)
- [ ] DOM adapter split (`dom-adapter.js` 42 KB → browser / mock / node adapters)
- [ ] Stress test suite (10 000+ item lists, 1000+ pulse updates/sec, deep nesting)
- [ ] i18n lazy message loading (async translation bundles)
- [ ] `getCacheMetrics()` from `dom-selector.js` exposed publicly for DevTools

## Versions in Progress

Next planned: v1.12.0 — feature release with:
- `useAbortable()` (done ✅)
- WebSocket queue eviction strategies (done ✅)
- Form module split (backlog)
