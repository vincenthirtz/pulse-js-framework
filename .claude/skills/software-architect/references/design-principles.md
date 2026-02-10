# Design Principles - Pulse JS Framework

## Overview

These are the architectural principles that guide all decisions in the Pulse framework. When evaluating a new feature, refactor, or API change, check it against these principles.

## P1: Zero Dependencies, Maximum Control

**Principle**: The runtime has zero npm dependencies. Every capability is built in-house.

**Why**: Dependencies are the #1 source of supply chain risk, version conflicts, and unexpected breaking changes. By owning all code, we control quality, performance, and security.

**In practice**:
- Implemented LRU cache instead of `lru-cache` package
- Implemented HTTP client instead of `axios`
- Implemented form validation instead of `yup`/`zod`
- CSS preprocessors are optional peer deps, not bundled

**Exception**: Dev-only tools (sass, less, stylus, c8) are acceptable as optional dependencies since they don't ship to the browser.

## P2: Secure by Default

**Principle**: Safe behavior should be the default. Unsafe behavior requires explicit opt-in.

**Why**: Developers forget to sanitize. If the default is safe, XSS only happens when someone deliberately calls `dangerouslySetInnerHTML`.

**In practice**:
- `el()` uses `textContent` for strings (auto-safe)
- `safeSetAttribute()` blocks event handler attributes
- `sanitizeUrl()` blocks `javascript:` protocol
- `sanitizeCSSValue()` blocks `expression()` and `url()`
- Dangerous APIs have "dangerous" in the name

**Anti-pattern**: Never add a feature where the convenient path is the insecure path.

## P3: Reactivity as Foundation

**Principle**: State management is signal-based. UI updates are automatic and fine-grained.

**Why**: Fine-grained reactivity means O(1) updates - only the specific DOM node that depends on changed state re-renders. No tree diffing, no wasted renders.

**In practice**:
- `Pulse` (signal) is the universal reactive primitive
- `effect()` auto-tracks dependencies via `get()`
- `computed()` lazily derives values
- All hooks return `Pulse` instances for reactive state
- `batch()` defers effects for atomic updates

**Guideline**: If state needs to trigger UI updates, wrap it in `pulse()`. If it's set-once config, use a plain value.

## P4: Layered Architecture with Strict Boundaries

**Principle**: Each layer (runtime, compiler, CLI, loader) has clear responsibilities and dependencies flow downward only.

```
CLI → Compiler → Runtime ← Loader
```

**Why**: Prevents circular dependencies, makes each layer independently testable, and ensures runtime stays browser-safe.

**Rules**:
- Runtime MUST NOT import from compiler, CLI, or loader
- CLI can import compiler (for build/lint/format)
- Loader can import compiler (for build tool integration)
- Compiler can import runtime error types only

**Anti-pattern**: Never add `import fs from 'fs'` in a runtime module.

## P5: Convention over Configuration

**Principle**: Sensible defaults that work for 80% of cases. Configuration for the remaining 20%.

**Why**: Reduces boilerplate and cognitive load. Developers shouldn't need to configure things that have obvious defaults.

**In practice**:
- `createRouter({ routes })` - mode defaults to 'history'
- `useAsync(fn)` - immediate defaults to true
- `createHttp({ baseURL })` - retries, timeout have sane defaults
- Auto-ARIA in `el()` - correct ARIA attributes applied automatically
- CSS preprocessor auto-detection - no config needed

**Guideline**: Every option should have a default. The default should be the most common use case.

## P6: Accessibility First

**Principle**: Accessibility is built-in, not bolted on. Every UI primitive considers a11y.

**Why**: Retrofitting accessibility is 10x harder than building it in. By making `el()` automatically apply ARIA attributes, we make the accessible path the easy path.

**In practice**:
- `el('dialog')` auto-adds `role="dialog"` and `aria-modal="true"`
- `el('button')` auto-adds `type="button"`
- Console warnings for missing `alt` on images
- `.pulse` compiler supports `@a11y`, `@live`, `@focusTrap`, `@srOnly` directives
- 10 a11y lint rules in `pulse lint`
- DevTools a11y audit mode with visual highlighting

## P7: Progressive Complexity

**Principle**: Simple things should be simple. Complex things should be possible.

**Why**: The learning curve should be gradual. A beginner can build a counter in 5 lines. An expert can build a full SPA with SSR, GraphQL, and code splitting.

**Complexity ladder**:
```
Level 1: pulse() + el() + mount()              → Counter, hello world
Level 2: + computed() + effect() + list()       → Todo app
Level 3: + createRouter() + createStore()       → Multi-page SPA
Level 4: + useAsync() + createHttp()            → Data-driven app
Level 5: + useWebSocket() + useSubscription()   → Real-time app
Level 6: + renderToString() + hydrate()         → SSR app
Level 7: + createNativeStorage() + NativeUI     → Hybrid mobile app
```

**Guideline**: New features should not increase complexity at lower levels.

## P8: Explicit over Magic

**Principle**: Code should be understandable by reading it. Avoid implicit behavior that surprises.

**Why**: Magic behavior creates debugging nightmares. When something goes wrong, developers need to trace the cause.

**In practice**:
- `count.get()` explicitly reads (tracks dependency)
- `count.set(5)` explicitly writes (triggers effects)
- `count.peek()` explicitly reads without tracking
- `untrack(() => expr)` explicitly opts out of tracking
- `dangerouslySetInnerHTML` name signals danger

**Exception**: Auto-ARIA is "magic" but it's additive (never removes attributes) and visible in DevTools.

## P9: Composition over Inheritance

**Principle**: Build complex behavior by composing small, focused functions. No deep class hierarchies.

**Why**: Composition is more flexible, testable, and tree-shakeable than inheritance.

**In practice**:
- `el()` is a function, not a class
- Components are functions that return DOM nodes
- `useForm()`, `useAsync()`, `useHttp()` are composable hooks
- Store plugins compose via `usePlugin()` not subclassing
- Context API uses `Provider` function, not class components

**Guideline**: If you're tempted to create a base class, consider a factory function or a composition helper instead.

## P10: Tree-Shakeable by Design

**Principle**: Users only pay for what they use. Unused modules are eliminated at build time.

**Why**: Bundle size directly impacts load time. An app using only `pulse()` and `el()` shouldn't include the router, store, or WebSocket code.

**In practice**:
- Named exports only (no default exports from runtime)
- No module-level side effects
- `runtime/lite.js` provides minimal build (~5KB)
- Each module is a separate import path
- Package.json `exports` map defines precise entry points

**Anti-pattern**: Never add `window.something = ...` or `document.addEventListener(...)` at module scope.

## P11: Testable Without Browser

**Principle**: All runtime code should be testable with `MockDOMAdapter` and no browser/jsdom.

**Why**: Browser testing is slow and flaky. Node.js testing is fast and deterministic. The `DOMAdapter` abstraction makes this possible.

**In practice**:
- `setAdapter(new MockDOMAdapter())` in test setup
- `createContext()` / `withContext()` for isolated reactive state
- Mock DOM in `test/mock-dom.js` for basic browser APIs
- No `window`/`document` access at module scope
- Feature detection for browser-only APIs

## P12: Fail Fast with Helpful Errors

**Principle**: Detect errors as early as possible and provide actionable error messages.

**Why**: A good error message saves hours of debugging. Include what went wrong, why, and how to fix it.

**In practice**:
- `Errors.computedSet('name')` includes suggestion to use `pulse()` instead
- `Errors.mountNotFound('#app')` tells you the selector didn't match
- `ParserError` includes line/column, code snippet, and suggestion
- Circular dependency detection with effect names
- Runtime warnings for missing ARIA attributes

**Error template**:
```
[Pulse] {What happened}
  Context: {Why it matters}
  → {How to fix it}
  See: {Documentation URL}
```

## Applying These Principles

When evaluating a new feature or change:

1. Does it add a dependency? → Violates P1 (find an alternative)
2. Is the default behavior safe? → Must satisfy P2
3. Does it use signals for state? → Must align with P3
4. Which layer does it belong to? → Must respect P4
5. Does it need configuration? → Add sensible defaults (P5)
6. Does it affect UI? → Consider a11y (P6)
7. Does it increase baseline complexity? → Keep simple things simple (P7)
8. Is the behavior surprising? → Make it explicit (P8)
9. Does it use inheritance? → Prefer composition (P9)
10. Is it tree-shakeable? → Named exports, no side effects (P10)
11. Can it be tested without browser? → Use DOMAdapter (P11)
12. Does it fail silently? → Add helpful errors (P12)
