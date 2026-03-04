# Pulse Framework — Lead Developer Memory

This file is read by the lead-developer skill at the start of every session to
provide fast context without re-scanning the full codebase.

## Identity

- **Package:** `pulse-js-framework` v1.11.4
- **Node:** >= 20.0.0 (currently v22.22.0)
- **License:** MIT | **Branch workflow:** develop → main
- **Zero external dependencies** — everything is built in

## Architecture at a Glance

```
runtime/   ← Core framework (59 files, ~21 K LOC)
compiler/  ← .pulse DSL → JS (lexer, parser, transformer)
cli/       ← 17 commands (dev, build, lint, format, test, scaffold…)
loader/    ← Vite / Webpack / Rollup / ESBuild / Parcel / SWC plugins
test/      ← 140+ test files, node:test (NOT Jest)
.claude/   ← Context files, skills, this memory system
```

## Key Conventions

- ES Modules throughout (`import`/`export`)
- Private fields via `#name` syntax
- Named exports for all public APIs; camelCase functions, PascalCase classes
- Tests use `node:test` + `node:assert` — never Jest/Mocha
- macOS target (use `sed -i ''`, not `sed -i`)
- Always run `npm test` after changes; target ≥ 90 % coverage

## Module Map (quick lookup)

| Module | File | Notes |
|--------|------|-------|
| Reactivity | `runtime/pulse.js` | Pulse class, effect, computed, batch |
| DOM | `runtime/dom.js` + `dom-*.js` | el, mount, list, when, virtual-list |
| Router | `runtime/router/` | RouteTrie, lazy, guards, history |
| Store | `runtime/store.js` | createStore, createActions, plugins |
| Context | `runtime/context.js` | createContext, Provider |
| Form | `runtime/form.js` | useForm, validators, useFieldArray |
| Async | `runtime/async.js` | useAsync, useResource, usePolling, useAbortable |
| HTTP | `runtime/http.js` | createHttp, HttpError, interceptors |
| WebSocket | `runtime/websocket.js` | createWebSocket, auto-reconnect, queue |
| GraphQL | `runtime/graphql/` | createGraphQLClient, useQuery, useMutation |
| A11y | `runtime/a11y/` | announce, trapFocus, validateA11y |
| SSR | `runtime/ssr.js` + ssr-*.js | renderToString, hydrate |
| Animation | `runtime/animation.js` | animate, useSpring, useTransition, stagger |
| Persistence | `runtime/persistence.js` | withPersistence, adapters |
| SSE | `runtime/sse.js` | createSSE, useSSE |
| i18n | `runtime/i18n.js` | createI18n, reactive locale switching |
| Security | `runtime/security.js` + utils.js | escapeHtml, sanitizeUrl |
| DevTools | `runtime/devtools/` | trackedPulse, time-travel |
| Compiler | `compiler/` | lexer → parser → transformer |

## Recent Changes (last 5 commits)

- `eef9810` feat: add missing tests, fix ssr-serializer, add animation/persistence/sse docs
- `413ca77` Merge PR #125 — release/v1.11.4
- `7607d34` chore(release): bump version to 1.11.4
- `da2449e` Merge PR #124 from develop
- `ebb5ff4` fix(security): unify URL scheme checks

## Known Patterns & Pitfalls

- `dom-adapter.js` must be used for all DOM ops in tests (MockDOMAdapter)
- SSR tests import from `ssr-serializer.js` and `ssr-async.js` directly
- `createVersionedAsync` is in `async.js` — use it for any race-prone async
- CSS preprocessors (SASS/LESS/Stylus) are optional peer deps, not bundled
- `pulse lint` catches a11y issues at build time (10 rules)
- CI uses GitHub Actions; GITHUB_TOKEN cannot trigger downstream workflows (use PAT)
- Circular dependency protection caps at 100 iterations

## Refresh

Run `.claude/scripts/refresh-cache.sh` to regenerate the cache files below.
