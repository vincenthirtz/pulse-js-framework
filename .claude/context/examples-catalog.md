# Examples Catalog - All Pulse framework example projects with features and APIs demonstrated.

## Apps

| Name | Path | Features | Key APIs |
|------|------|----------|----------|
| Todo | `examples/todo` | Reactive list, filtering, localStorage | `pulse()`, `effect()`, `@if`/`@each` |
| Blog | `examples/blog` | CRUD, category filtering, search | `pulse()`, `computed()`, component composition |
| Chat | `examples/chat` | Rooms, reactions, emoji picker, presence | `pulse()`, `effect()`, nested state |
| E-Commerce | `examples/ecommerce` | Product catalog, cart, checkout modal | `pulse()`, `computed()`, localStorage |
| Dashboard | `examples/dashboard` | Auth flow, multi-page nav, themes | `pulse()`, `effect()`, `@if` |
| Weather | `examples/meteo` | External API (Open-Meteo), async states | `pulse()`, `effect()`, `fetch` |
| Sports News | `examples/sports` | HTTP interceptors, debounced search | `createHttp()`, `pulse()`, `effect()` |
| Electron Notes | `examples/electron` | Desktop app, IPC, native storage | `.pulse` DSL, Electron, Vite plugin |

## Feature Demos

| Name | Path | Features | Key APIs |
|------|------|----------|----------|
| Router | `examples/router` | SPA routing, params, guards, 404 | `createRouter()`, `router.outlet()`, guards |
| Store | `examples/store` | Persistence, undo/redo, plugins | `createStore()`, `createActions()`, `historyPlugin` |
| HMR | `examples/hmr` | State preservation, effect cleanup | `createHMRContext()`, `preservePulse()` |
| Form Validation | `examples/form-validation` | Schema validation, file upload, drafts | `useForm()`, `validators.*`, `useFileField()` |
| A11y Showcase | `examples/a11y-showcase` | ARIA widgets, focus trap, announcements | `createModal()`, `trapFocus()`, `announce()` |
| GraphQL | `examples/graphql` | Queries, mutations, optimistic updates | `createGraphQLClient()`, `useQuery()`, `useMutation()` |
| Context API | `examples/context-api` | Theme/auth/locale contexts, nesting | `createContext()`, `Provider()`, `useContext()` |
| SSR | `examples/ssr` | Server rendering, hydration, state serialization | `renderToStringSync()`, `hydrate()`, `ClientOnly()` |
| Async Patterns | `examples/async-patterns` | SWR caching, polling, race prevention | `useAsync()`, `useResource()`, `usePolling()` |
| Server Actions | `examples/server-actions-ratelimit` | Token bucket rate limiting | `createServerActionMiddleware()` |

## Build Tools

| Name | Path | Features | Key APIs |
|------|------|----------|----------|
| Webpack | `examples/webpack-example` | Webpack 5, HMR, CSS extraction, SASS | `pulse-js-framework/webpack` |
| Rollup | `examples/rollup-example` | CSS extraction, Terser, tree shaking | `pulse-js-framework/rollup` |
| ESBuild | `examples/esbuild-example` | Fast builds, watch mode, CSS extraction | `pulse-js-framework/esbuild` |
| Parcel | `examples/parcel-example` | Zero-config, HMR, code splitting | `pulse-js-framework/parcel` |

## Mobile

| Name | Path | Features | Key APIs |
|------|------|----------|----------|
| Android Pulse | `examples/android-pulse` | .pulse DSL for Android, hot-reload | `.pulse` DSL, WebView bridge |
| Android WebView | `examples/android-webview` | WebView wrapper, debug/release | `MainActivity.java`, Chrome DevTools |
| iOS Pulse | `examples/ios-pulse` | .pulse DSL for iOS, hot-reload | `.pulse` DSL, WKWebView |
| iOS WebView | `examples/ios-webview` | WKWebView wrapper, SwiftUI | `ContentView.swift`, Safari Inspector |

## CSS Preprocessors

| Name | Path | Features | Key APIs |
|------|------|----------|----------|
| SASS | `examples/sass-example` | Variables, mixins, nesting, extend | `$variables`, `@mixin`/`@include` |
| LESS | `examples/less-example` | Variables, parametric mixins, guards | `@variables`, `.mixin()` |
| Stylus | `examples/stylus-example` | Flexible syntax, conditionals, loops | `variable =`, no-brace syntax |
