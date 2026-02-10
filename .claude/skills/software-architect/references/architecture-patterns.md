# Architecture Patterns - Pulse JS Framework

## Overview

This document catalogs the design patterns used across the Pulse framework, grouped by module. Each pattern includes its intent, implementation location, and how it integrates with the broader architecture.

## Reactive Core Patterns

### Signal/Observer Pattern (pulse.js)

The foundation of Pulse. Every reactive value (`Pulse`) maintains a set of subscribers (effects/computeds) that are automatically notified on change.

```
Pulse (Subject)
  ├── subscribers: Set<Effect>
  ├── get() → tracks caller as dependency
  ├── set(value) → notifies all subscribers
  └── update(fn) → set(fn(currentValue))

Effect (Observer)
  ├── dependencies: Set<Pulse>
  ├── execute() → runs fn, auto-tracks deps via get()
  └── dispose() → removes self from all dep subscriber lists
```

**Key design choice**: Automatic dependency tracking via `get()` rather than explicit declaration. This makes the API simpler but requires careful implementation of the tracking context stack.

### Computed as Lazy Pull

Computed values use lazy evaluation by default:

```
computed(() => a.get() + b.get())

Read path:  computed.get() → check dirty flag → recompute if dirty → return cached
Write path: a.set(5) → mark computed as dirty → don't recompute yet
```

This avoids unnecessary computation when a computed value changes but nobody reads it.

### Batch Queue Pattern

`batch()` defers all effect execution until the batch completes:

```
batch(() => {
  a.set(1);  // → queues effects but doesn't run
  b.set(2);  // → queues effects but doesn't run
});            // → flushes queue, runs each effect once
```

**Implementation**: A global `batchDepth` counter. Effects check `batchDepth > 0` before running and queue themselves instead.

## DOM Layer Patterns

### Factory Pattern (dom.js - el())

`el()` is a factory that creates DOM elements from a CSS selector DSL:

```javascript
el('div.container#main')
// Equivalent to:
// const div = document.createElement('div');
// div.className = 'container';
// div.id = 'main';
```

**Why factory over class**: Elements are plain DOM nodes, not wrapper objects. This means zero overhead and full compatibility with browser APIs.

### Selector Cache (LRU)

Parsed selectors are cached using an LRU eviction policy:

```
parseSelector('div.btn') → { tag: 'div', classes: ['btn'], ... }
                            ↓ cached
parseSelector('div.btn') → cache hit (O(1))
```

**Capacity**: 500 entries by default. Configurable via `configureDom()`.

### Adapter Pattern (dom-adapter.js)

Abstracts all DOM operations behind an interface:

```
DOMAdapter interface:
  createElement(tag) → Element
  createTextNode(text) → TextNode
  setAttribute(el, name, value)
  appendChild(parent, child)
  removeChild(parent, child)
  ...

Implementations:
  BrowserDOMAdapter → real DOM (default in browser)
  MockDOMAdapter → mock nodes (testing, SSR)
```

**Purpose**: Enables SSR (`renderToString`) and testing without a browser (jsdom not required).

### Reconciliation with LIS (dom-list.js)

List rendering uses Longest Increasing Subsequence for minimal DOM moves:

```
Old: [A, B, C, D, E]
New: [B, D, A, E, C]

1. Map new items to old positions: [1, 3, 0, 4, 2]
2. Find LIS: [1, 3, 4] → B, D, E stay in place
3. Move only A and C (2 moves instead of 5)
```

**Complexity**: O(n log n) for LIS computation, O(k) DOM operations where k = n - LIS length.

## Routing Patterns

### Middleware Pipeline (router.js)

Router uses Koa-style middleware with `async (ctx, next)`:

```
Request → middleware[0] → middleware[1] → ... → route handler
                ↓               ↓
          (can redirect)  (can modify ctx)
```

**Composition**: Middleware wraps `next()` call, enabling before/after logic:

```javascript
async (ctx, next) => {
  console.log('before');
  await next();
  console.log('after');
}
```

### Lazy Loading with Preload

Routes support lazy loading via dynamic `import()`:

```javascript
lazy(() => import('./Dashboard.js'))
```

**Preload strategy**: `preload(lazyComponent)` triggers the import early (on hover, viewport entry, etc.) without rendering.

## State Management Patterns

### Command Pattern (store.js - actions)

Actions encapsulate state mutations:

```javascript
const actions = createActions(store, {
  login: (store, user) => store.user.set(user),
  logout: (store) => store.user.set(null)
});
```

**Benefits**: Centralized mutation logic, easy logging/debugging, undo/redo support.

### Plugin System (store.js)

Stores accept plugins that can observe and modify behavior:

```javascript
usePlugin(store, loggerPlugin);
usePlugin(store, (s) => historyPlugin(s, 100));
```

**Plugin interface**: A function that receives the store and can subscribe to changes, add methods, or wrap existing behavior.

### Module Composition (combineStores)

Multiple stores can be composed into a tree:

```javascript
const root = combineStores({
  user: createStore({ name: '' }),
  settings: createStore({ theme: 'dark' })
});
root.user.name.get();  // Namespaced access
```

## Compiler Patterns

### Pipeline Pattern (lexer → parser → transformer)

The compiler follows a classic three-stage pipeline:

```
Source (.pulse) → Lexer → Tokens → Parser → AST → Transformer → JavaScript
                                                      ↓
                                               Source Map (optional)
```

Each stage is a pure function with clear input/output types.

### Visitor Pattern (cli/lint.js)

The linter traverses the AST using a visitor that dispatches on node type:

```javascript
class SemanticAnalyzer {
  visitStateBlock(node) { /* check state declarations */ }
  visitViewBlock(node) { /* check view expressions */ }
  visitStyleBlock(node) { /* check style rules */ }
}
```

### Strategy Pattern (preprocessor.js)

CSS preprocessing uses strategy selection based on syntax detection:

```
Input CSS → detectPreprocessor() → 'sass' | 'less' | 'stylus' | 'none'
                                       ↓
                                   compileSass() | compileLess() | compileStylus() | passthrough
```

**Priority**: SASS > LESS > Stylus (when syntax is ambiguous).

## Infrastructure Patterns

### Interceptor Chain (http.js, websocket.js, graphql.js)

Request/response interceptors form a chain:

```
Request → interceptor[0].request → interceptor[1].request → actual request
                                                                ↓
Response ← interceptor[1].response ← interceptor[0].response ← actual response
```

**Use cases**: Auth tokens, logging, error transformation, caching.

### Stale-While-Revalidate (async.js, http.js, graphql.js)

Resources use SWR caching strategy:

```
1. Return cached data immediately (stale)
2. Fetch fresh data in background
3. Update UI when fresh data arrives
4. Track freshness via staleTime
```

### Auto-Reconnect with Exponential Backoff (websocket.js)

WebSocket connections auto-reconnect with backoff:

```
Attempt 1: wait 1s
Attempt 2: wait 2s
Attempt 3: wait 4s
Attempt 4: wait 8s
...
Max delay: 30s (capped)
```

### Race Condition Prevention (async.js)

`createVersionedAsync()` uses version tokens to prevent stale updates:

```javascript
const ctx = controller.begin();  // version = 42
const data = await fetch(...);
ctx.ifCurrent(() => setData(data));  // Only runs if version still 42
```

## Cross-Cutting Patterns

### Error Hierarchy

All errors extend `PulseError` with structured metadata:

```
PulseError
├── CompileError (LexerError, ParserError, TransformError)
├── RuntimeError (ReactivityError, DOMError, StoreError, RouterError)
└── CLIError (ConfigError)
```

Each error includes: code, message, context, suggestion, docs URL.

### Structured Logging (logger.js)

Namespaced loggers with level filtering:

```javascript
const log = createLogger('Router');
log.info('Navigating to /home');  // [Router] Navigating to /home
```

Production mode makes all logging noop (zero overhead).

### Security Boundary (utils.js)

All user input passes through sanitization at the boundary:

```
User Input → sanitizeUrl() / escapeHtml() / sanitizeCSSValue() → Safe Output
                    ↓                                ↓
              Blocks javascript:              Blocks expression()
              Blocks data:text                Blocks url()
```

**Design principle**: Secure by default, opt-in for dangerous operations (`dangerouslySetInnerHTML`).
