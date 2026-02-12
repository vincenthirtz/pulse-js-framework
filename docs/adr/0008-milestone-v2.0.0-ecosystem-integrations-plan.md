# ADR-0008: Milestone v2.0.0 Ecosystem & Integrations — Architecture Plan

## Status

Accepted

## Date

2026-02-12

## Context

Milestone 9 "Ecosystem & Integrations (v2.0.0)" has 6 open GitHub issues (#61, #63, #64, #65, #67, #69).
The goal is to expand the Pulse ecosystem with new runtime modules for SSE, persistence,
animations, i18n, portal completion, and service worker integration.

### Current State Assessment

| Feature | File | Completeness | Key Gap |
|---------|------|-------------|---------|
| SSE (Server-Sent Events) | N/A | 0% | No SSE module; WebSocket exists as pattern reference |
| Persistence Adapters | `store.js` | 30% | Only localStorage in store.js; no IndexedDB/SessionStorage |
| Animation System | `dom-advanced.js` | 20% | CSS class-based transitions only; no Web Animations API |
| i18n Module | N/A | 0% | No internationalization support |
| Portal | `dom-advanced.js` | 85% | Functional but missing: dispose, events, multiple portals |
| Service Worker | N/A | 0% | No SW registration or caching strategy helpers |

### Architecture Principles

All new modules MUST:
1. **Zero dependencies** — use only browser/Node.js built-ins
2. **Pulse-reactive** — expose state as Pulse instances
3. **SSR-compatible** — use `dom-adapter.js` for DOM ops, gracefully degrade on server
4. **Tree-shakeable** — named exports, no side-effect imports
5. **Dual API** — low-level factory + high-level `use*` hook where applicable
6. **Disposable** — return cleanup/dispose functions for subscriptions
7. **Error hierarchy** — use `PulseError` subclasses from `runtime/errors.js`

---

## Architecture Overview

### Dependency Graph

```
                    ┌─────────────┐
                    │  pulse.js   │  (core reactivity)
                    └──────┬──────┘
            ┌──────────────┼──────────────────────┐
            │              │                      │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────────────▼──────────────┐
     │  sse.js     │ │ i18n.js  │ │ persistence.js              │
     │  (#61)      │ │ (#65)    │ │ (#63)                       │
     │             │ │          │ │ └→ store.js (persist option) │
     └─────────────┘ └──────────┘ └─────────────────────────────┘
            │
     ┌──────▼────────────┐     ┌──────────────────┐
     │ dom-advanced.js   │     │  animation.js     │
     │ portal (#67)      │     │  (#64)            │
     │ └→ dom-adapter.js │     │  └→ a11y.js       │
     │ └→ dom-selector.js│     │  └→ dom-adapter.js│
     └───────────────────┘     └──────────────────┘

     ┌──────────────────┐
     │     sw.js        │
     │   (#69)          │
     │   (standalone)   │
     └──────────────────┘
```

### Implementation Order

Based on dependencies and complexity (simplest/most independent first):

| Phase | Module | Issue | Rationale |
|-------|--------|-------|-----------|
| 1 | SSE | #61 | Follows proven WebSocket pattern, standalone |
| 2 | Persistence | #63 | Extends existing store.js, adapter pattern |
| 3 | i18n | #65 | Standalone, pulse-reactive, no DOM dependency |
| 4 | Portal | #67 | Enhancement of existing code, quick |
| 5 | Animation | #64 | Depends on a11y.js + dom-adapter.js |
| 6 | Service Worker | #69 | Browser-only, standalone, most experimental |

---

## Module Specifications

### 1. SSE Module — `runtime/sse.js` (#61)

**Pattern**: Mirrors `runtime/websocket.js` dual-API pattern.

**Public API**:

```javascript
// Low-level
export function createSSE(url, options) → SSEInstance
export class SSEError extends RuntimeError

// High-level hook
export function useSSE(url, options) → {
  data,           // Pulse<any> — last event data
  connected,      // Pulse<boolean>
  error,          // Pulse<SSEError|null>
  reconnecting,   // Pulse<boolean>
  lastEventId,    // Pulse<string|null>
  close,          // () => void
  reconnect,      // () => void
}
```

**Options**:
```javascript
{
  withCredentials: false,      // CORS credentials
  reconnect: true,             // Auto-reconnect (default: true)
  maxRetries: 5,               // Max reconnection attempts
  baseDelay: 1000,             // Base delay for exponential backoff
  maxDelay: 30000,             // Max delay cap
  events: ['message'],         // Event types to listen for
  parseJSON: true,             // Auto-parse JSON data
  immediate: true,             // Connect on creation
  onMessage: null,             // (data, event) => void
  onOpen: null,                // () => void
  onError: null,               // (error) => void
}
```

**SSEInstance API**:
```javascript
{
  state,              // Pulse<'connecting'|'open'|'closed'>
  connected,          // Computed<boolean>
  reconnecting,       // Pulse<boolean>
  reconnectAttempt,   // Pulse<number>
  error,              // Pulse<SSEError|null>
  lastEventId,        // Pulse<string|null>

  connect(),          // Manual connect
  close(),            // Close connection
  addEventListener(event, handler),  // Custom event listener
  removeEventListener(event, handler),
  dispose(),          // Full cleanup

  on(event, handler), // Shorthand event listener
  off(event, handler),
}
```

**SSEError codes**: `CONNECT_FAILED`, `TIMEOUT`, `MAX_RETRIES`, `CLOSED`.

**Key Decisions**:
- Uses native `EventSource` API (no polyfill — browser support is universal)
- Exponential backoff mirrors WebSocket's approach
- `lastEventId` tracked for reconnection (SSE spec feature)
- Unlike WebSocket, SSE is read-only (server→client), so no send/queue logic

---

### 2. Persistence Adapters — `runtime/persistence.js` (#63)

**Pattern**: Strategy pattern — adapter interface with multiple implementations.

**Public API**:

```javascript
// Adapter interface
export function createPersistenceAdapter(type, options) → PersistenceAdapter

// Built-in adapters
export function createLocalStorageAdapter(options)      → PersistenceAdapter
export function createSessionStorageAdapter(options)     → PersistenceAdapter
export function createIndexedDBAdapter(options)          → PersistenceAdapter
export function createMemoryAdapter()                    → PersistenceAdapter

// Store integration
export function withPersistence(store, adapter, options) → { restore, clear, flush }
```

**PersistenceAdapter Interface**:
```javascript
{
  name: string,                               // Adapter name for debugging
  getItem(key) → Promise<any|null>,           // Async read
  setItem(key, value) → Promise<void>,        // Async write
  removeItem(key) → Promise<void>,            // Async delete
  clear() → Promise<void>,                    // Clear all
  keys() → Promise<string[]>,                 // List all keys
}
```

**IndexedDB Adapter Options**:
```javascript
{
  dbName: 'pulse-store',        // Database name
  storeName: 'state',           // Object store name
  version: 1,                   // DB version
}
```

**withPersistence Options**:
```javascript
{
  key: 'pulse-store',            // Storage key prefix
  debounce: 100,                 // Debounce writes (ms)
  include: null,                 // string[] — only persist these keys (whitelist)
  exclude: null,                 // string[] — never persist these keys
  serialize: JSON.stringify,     // Custom serializer
  deserialize: JSON.parse,       // Custom deserializer
  maxDepth: 10,                  // Max nesting depth (security)
  onError: null,                 // (error) => void
}
```

**Key Decisions**:
- All adapters are async (IndexedDB is inherently async)
- Debounced writes prevent performance issues with frequent updates
- Maintains existing store.js security: dangerous key blocking, schema validation, depth limit
- `withPersistence()` is a standalone function, NOT a modification to `createStore()`
  - This preserves backward compatibility: `createStore({ persist: true })` still uses localStorage
  - Advanced users use `withPersistence(store, createIndexedDBAdapter())` for other backends
- `createMemoryAdapter()` provided for testing (no I/O)

---

### 3. i18n Module — `runtime/i18n.js` (#65)

**Pattern**: Context-based provider with reactive locale switching.

**Public API**:

```javascript
export function createI18n(options) → I18nInstance
export function useI18n() → { t, locale, setLocale, availableLocales }
```

**createI18n Options**:
```javascript
{
  locale: 'en',                        // Default locale
  fallbackLocale: 'en',               // Fallback when key missing
  messages: {                          // Translation messages
    en: { hello: 'Hello', welcome: 'Welcome, {name}!' },
    fr: { hello: 'Bonjour', welcome: 'Bienvenue, {name} !' }
  },
  pluralRules: null,                   // Custom plural rule function
  missing: null,                       // (locale, key) => string — missing key handler
  modifiers: null,                     // { upper: (v) => v.toUpperCase() }
}
```

**I18nInstance API**:
```javascript
{
  locale,                // Pulse<string> — current locale (reactive)
  availableLocales,      // string[] — all loaded locales

  t(key, params?),       // Translate key with interpolation
  tc(key, count, params?),  // Translate with pluralization
  te(key, locale?),      // Check if key exists
  tm(key),               // Get raw message object

  setLocale(locale),     // Change locale (triggers reactive updates)
  loadMessages(locale, messages),  // Dynamically load translations

  install(),             // Set as global default for useI18n()

  // Number/Date formatting
  n(value, options?),    // Format number (Intl.NumberFormat)
  d(value, options?),    // Format date (Intl.DateTimeFormat)
}
```

**Translation Function `t()`**:
```javascript
// Simple key
t('hello')                    // → 'Hello'

// Interpolation with named params
t('welcome', { name: 'Alice' })  // → 'Welcome, Alice!'

// Nested keys (dot notation)
t('nav.home')                 // → messages.en.nav.home

// Modifiers (pipe syntax)
t('name | upper', { name: 'alice' })  // → 'ALICE'
```

**Pluralization `tc()`**:
```javascript
// Messages format: 'none | singular | plural'
// en: { items: 'no items | {count} item | {count} items' }
tc('items', 0)   // → 'no items'
tc('items', 1)   // → '1 item'
tc('items', 5)   // → '5 items'

// Custom plural rules for complex languages (Arabic, Russian, etc.)
const i18n = createI18n({
  pluralRules: {
    ru: (count) => {
      if (count % 10 === 1 && count % 100 !== 11) return 0;
      if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 1;
      return 2;
    }
  }
});
```

**Key Decisions**:
- Locale is a Pulse — changing it reactively updates all `t()` calls in effects
- Uses `Intl.NumberFormat` and `Intl.DateTimeFormat` for number/date formatting (no custom implementations)
- Pluralization uses pipe-separated strings (ICU-lite), not full ICU MessageFormat (too heavy for zero-dep)
- `useI18n()` reads from a module-level default set by `install()` (no context provider needed for simple cases)
- Messages can be loaded lazily with `loadMessages()` for code splitting
- SSR-safe: no DOM access, pure string operations

---

### 4. Portal Completion — `runtime/dom-advanced.js` (#67)

**Pattern**: Enhancement of existing implementation.

**Current gaps to address**:
1. No `dispose()` method — portal nodes leak if parent unmounts without cleanup
2. No event forwarding — events on portaled content don't bubble to logical parent
3. No target change — can't move portal to different target
4. Missing SSR support — portal should render inline during SSR

**Enhanced API** (backward-compatible additions):

```javascript
export function portal(children, target, options?) → PortalMarker

// Options (new):
{
  key: null,                 // string — unique key for multiple portals to same target
  prepend: false,            // Insert at beginning of target (default: append)
  onMount: null,             // () => void — called when children mounted
  onUnmount: null,           // () => void — called when children unmounted
}

// PortalMarker (enhanced Comment node):
{
  dispose(),                 // Manual cleanup (removes portaled nodes)
  moveTo(newTarget),         // Move portaled content to new target
  getNodes(),                // Get currently portaled nodes
}
```

**Key Decisions**:
- Keep `portal(children, target)` signature backward-compatible
- Add optional third `options` argument
- `dispose()` ensures cleanup even without parent effect cascade
- `moveTo()` enables dynamic portal targets (e.g., tooltip repositioning)
- During SSR (`MockDOMAdapter`), portal renders children inline (no target resolution)

---

### 5. Animation System — `runtime/animation.js` (#64)

**Pattern**: Wrapper around Web Animations API with Pulse integration.

**Public API**:

```javascript
// Low-level animation
export function animate(element, keyframes, options) → AnimationControl

// Transition hook (enter/leave)
export function useTransition(condition, options) → TransitionResult

// Spring-based animation
export function useSpring(target, options) → SpringResult

// Stagger helper
export function stagger(elements, keyframes, options) → AnimationControl[]

// Configuration
export function configureAnimations(options) → void
```

**animate() API**:
```javascript
const ctrl = animate(element, [
  { opacity: 0, transform: 'translateY(-20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 300,
  easing: 'ease-out',
  fill: 'forwards',
  delay: 0,
});

ctrl.play();
ctrl.pause();
ctrl.reverse();
ctrl.cancel();
ctrl.finish();
ctrl.finished;          // Promise<void>
ctrl.isPlaying;         // Pulse<boolean>
ctrl.progress;          // Pulse<number> 0-1
```

**useTransition() API**:
```javascript
const { nodes, isEntering, isLeaving } = useTransition(
  () => showModal.get(),
  {
    enter: { opacity: [0, 1], transform: ['scale(0.95)', 'scale(1)'] },
    leave: { opacity: [1, 0], transform: ['scale(1)', 'scale(0.95)'] },
    duration: 200,
    easing: 'ease-out',
    // Templates
    onEnter: () => el('.modal', 'Content'),
    onLeave: null,  // Uses last rendered content
  }
);
```

**configureAnimations()**:
```javascript
configureAnimations({
  respectReducedMotion: true,   // Default: true — uses prefersReducedMotion()
  defaultDuration: 300,         // Global default duration
  defaultEasing: 'ease-out',    // Global default easing
  disabled: false,              // Kill switch — all animations become instant
});
```

**Key Decisions**:
- Wraps Web Animations API (WAAPI) — not CSS class toggling (unlike existing `transition()`)
- `prefersReducedMotion()` integration from `a11y.js`: when true, duration→0 (instant)
- `useTransition()` replaces `whenTransition()` for new code but doesn't break existing
- `animate()` returns control object with Pulse-reactive `isPlaying` and `progress`
- SSR-safe: `animate()` is a no-op when `getAdapter()` returns `MockDOMAdapter`
- No spring physics library — `useSpring()` uses a simple damped spring approximation via `requestAnimationFrame`

---

### 6. Service Worker — `runtime/sw.js` (#69)

**Pattern**: Registration helper with reactive state and caching strategy configuration.

**Public API**:

```javascript
export function registerServiceWorker(url, options) → SWRegistration
export function useServiceWorker(url, options) → SWState
export function createCacheStrategy(name, options) → CacheStrategy
```

**registerServiceWorker() API**:
```javascript
const sw = registerServiceWorker('/sw.js', {
  scope: '/',                           // SW scope
  updateInterval: 60 * 60 * 1000,       // Check for updates every hour
  onUpdate: (registration) => {},        // New version available
  onActivate: (registration) => {},      // SW activated
  onError: (error) => {},                // Registration failed
});

sw.update();        // Manual update check
sw.unregister();    // Unregister SW
```

**useServiceWorker() hook**:
```javascript
const {
  supported,        // boolean — SW API available
  registered,       // Pulse<boolean>
  installing,       // Pulse<boolean>
  waiting,          // Pulse<boolean>
  active,           // Pulse<boolean>
  updateAvailable,  // Pulse<boolean>
  error,            // Pulse<Error|null>

  update(),         // Check for updates
  skipWaiting(),    // Force activate waiting SW
  unregister(),     // Unregister
} = useServiceWorker('/sw.js', options);
```

**createCacheStrategy() — for use INSIDE the service worker file**:
```javascript
// These are helpers to use in the user's sw.js file
// They generate fetch event handlers

// Cache-first (offline-friendly)
const staticCache = createCacheStrategy('cache-first', {
  cacheName: 'static-v1',
  match: /\.(js|css|png|woff2)$/,
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  maxEntries: 100,
});

// Network-first (fresh data)
const apiCache = createCacheStrategy('network-first', {
  cacheName: 'api-v1',
  match: /\/api\//,
  timeout: 3000,             // Fallback to cache after 3s
  maxAge: 60 * 60 * 1000,   // 1 hour
});

// Stale-while-revalidate
const pageCache = createCacheStrategy('stale-while-revalidate', {
  cacheName: 'pages-v1',
  match: /\.html$/,
});

// Install in SW
self.addEventListener('fetch', (event) => {
  staticCache.handle(event) ||
  apiCache.handle(event) ||
  pageCache.handle(event);
});
```

**Key Decisions**:
- `registerServiceWorker()` is the main-thread helper (registers + monitors lifecycle)
- `useServiceWorker()` adds Pulse reactivity for UI integration (show update banner, etc.)
- `createCacheStrategy()` runs INSIDE the service worker, not in main thread
  - This means it won't be imported from `pulse-js-framework/runtime/sw` but from a separate entry
  - Export path: `pulse-js-framework/sw` (not under runtime — runs in SW context)
- Graceful degradation: `registerServiceWorker()` is a no-op on HTTP or unsupported browsers
- No offline-first assumptions — caching is opt-in via strategy configuration

---

## File Structure

```
runtime/
├── sse.js               # NEW — Server-Sent Events (#61)
├── persistence.js       # NEW — Persistence adapters (#63)
├── animation.js         # NEW — Animation system (#64)
├── i18n.js              # NEW — Internationalization (#65)
├── dom-advanced.js      # MODIFIED — Portal completion (#67)
├── sw.js                # NEW — Service worker registration (#69)
├── index.js             # MODIFIED — Add new re-exports
└── ...

sw/
├── index.js             # NEW — SW-context helpers (createCacheStrategy)
└── strategies.js        # NEW — Cache strategy implementations

test/
├── sse.test.js          # NEW
├── persistence.test.js  # NEW
├── animation.test.js    # NEW
├── i18n.test.js         # NEW
├── portal.test.js       # NEW (or extend dom-advanced.test.js)
└── sw.test.js           # NEW
```

## Package.json Export Map Additions

```json
{
  "./runtime/sse": { "types": "./types/sse.d.ts", "default": "./runtime/sse.js" },
  "./runtime/persistence": { "types": "./types/persistence.d.ts", "default": "./runtime/persistence.js" },
  "./runtime/animation": { "types": "./types/animation.d.ts", "default": "./runtime/animation.js" },
  "./runtime/i18n": { "types": "./types/i18n.d.ts", "default": "./runtime/i18n.js" },
  "./sw": { "types": "./types/sw.d.ts", "default": "./sw/index.js" }
}
```

## Runtime Index Additions

```javascript
// SSE (Server-Sent Events)
export * from './sse.js';

// Persistence adapters
export * from './persistence.js';

// Animation system
export * from './animation.js';

// Internationalization
export * from './i18n.js';

// Service worker (main thread only)
export * from './sw.js';

// Namespace defaults
export { default as PulseSSE } from './sse.js';
export { default as PulsePersistence } from './persistence.js';
export { default as PulseAnimation } from './animation.js';
export { default as PulseI18n } from './i18n.js';
export { default as PulseSW } from './sw.js';
```

## Integration Points

| New Module | Integrates With | How |
|------------|-----------------|-----|
| SSE | `pulse.js` | Reactive state (Pulse instances) |
| SSE | `errors.js` | `SSEError extends RuntimeError` |
| SSE | `logger.js` | `loggers.sse` namespace |
| Persistence | `store.js` | `withPersistence(store, adapter)` |
| Persistence | `pulse.js` | Effects for auto-save debouncing |
| Persistence | `errors.js` | `PersistenceError extends RuntimeError` |
| Animation | `a11y.js` | `prefersReducedMotion()` check |
| Animation | `dom-adapter.js` | SSR no-op via adapter detection |
| Animation | `pulse.js` | Reactive `isPlaying`, `progress` |
| i18n | `pulse.js` | Reactive locale, computed translations |
| i18n | `logger.js` | `loggers.i18n` namespace |
| Portal | `dom-adapter.js` | SSR inline rendering |
| Portal | `dom-selector.js` | Target resolution |
| SW | `pulse.js` | Reactive registration state |
| SW | `logger.js` | `loggers.sw` namespace |

## Security Considerations

| Module | Risk | Mitigation |
|--------|------|------------|
| Persistence | Prototype pollution via deserialized data | Dangerous key blocking (existing pattern from store.js) |
| Persistence | XSS via stored values | Schema validation, depth limiting |
| i18n | XSS via translation interpolation | `escapeHtml()` option for HTML contexts |
| SSE | URL injection | Validate URL protocol (only http/https) |
| SW | Cache poisoning | Strategy-level cache versioning, max-age enforcement |
| Portal | DOM manipulation outside component tree | Target validation, cleanup guarantees |

## Bundle Size Budget

| Module | Target (minified) | Target (gzipped) |
|--------|-------------------|-------------------|
| SSE | < 4KB | < 1.5KB |
| Persistence | < 5KB | < 2KB |
| Animation | < 6KB | < 2.5KB |
| i18n | < 5KB | < 2KB |
| Portal (delta) | < 1KB | < 0.5KB |
| SW | < 3KB | < 1.5KB |
| **Total** | **< 24KB** | **< 10KB** |

Note: All modules are tree-shakeable — apps only pay for what they import.

## Consequences

### Positive
- Pulse becomes a complete SPA framework (SSE, i18n, animations, offline)
- All modules follow established patterns (zero-dep, Pulse-reactive, SSR-safe)
- Adapter pattern for persistence enables community extensions
- Animation system respects accessibility preferences by default

### Negative
- 6 new modules increase maintenance surface
- IndexedDB adapter adds async complexity to store persistence
- Service worker helpers may become outdated as browser APIs evolve

### Risks
- Animation WAAPI may have edge cases in older browsers (Safari pre-15)
- i18n without ICU MessageFormat limits advanced formatting
- SW caching strategies are complex to test

### Mitigations
- Comprehensive test suite for each module
- Feature detection for WAAPI (fallback to CSS transitions)
- i18n designed to be extensible (custom plural rules, modifiers)
- SW helpers are optional and composable
