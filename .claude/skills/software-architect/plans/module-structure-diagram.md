# Module Structure Diagrams - Milestone 1.11.0

## Current State (Before Refactoring)

```
pulse-js-framework/
├── compiler/
│   └── parser.js ⚠️ 2,376 LOC (TOO LARGE)
└── runtime/
    ├── a11y.js ⚠️ 1,844 LOC (TOO LARGE)
    ├── graphql.js ⚠️ 1,326 LOC (TOO LARGE)
    └── router.js ⚠️ 1,605 LOC (TOO LARGE)
```

## Target State (After Refactoring)

```
pulse-js-framework/
├── compiler/
│   └── parser/ ✅
│       ├── index.js (barrel export + parse() entry)
│       ├── core.js (~300 LOC) - Parser class, utilities
│       ├── imports.js (~150 LOC) - import/page/route
│       ├── state.js (~300 LOC) - props/state blocks
│       ├── view.js (~800 LOC) - view block (largest)
│       ├── style.js (~550 LOC) - style block
│       ├── expressions.js (~400 LOC) - expression parsing
│       └── blocks.js (~300 LOC) - actions/router/store
│
└── runtime/
    ├── a11y/ ✅
    │   ├── index.js (barrel export)
    │   ├── announcements.js (~200 LOC)
    │   ├── focus.js (~350 LOC)
    │   ├── preferences.js (~120 LOC)
    │   ├── widgets.js (~450 LOC)
    │   ├── validation.js (~300 LOC)
    │   ├── contrast.js (~150 LOC)
    │   └── utils.js (~250 LOC)
    │
    ├── graphql/ ✅
    │   ├── index.js (barrel export)
    │   ├── client.js (~450 LOC)
    │   ├── cache.js (~100 LOC)
    │   ├── subscriptions.js (~250 LOC)
    │   └── hooks.js (~450 LOC)
    │
    └── router/ ✅
        ├── index.js (barrel export)
        ├── core.js (~400 LOC) - RouteTrie, createRouter
        ├── lazy.js (~150 LOC)
        ├── history.js (~250 LOC)
        ├── guards.js (~200 LOC)
        └── utils.js (~150 LOC)
```

## Module Dependencies

### runtime/a11y/ Dependencies

```
announcements.js
  └─ ../pulse.js (pulse, effect)

focus.js
  ├─ ../pulse.js (pulse, effect)
  └─ ./utils.js (generateId)

preferences.js
  └─ ../pulse.js (pulse)

widgets.js
  ├─ ../pulse.js (pulse, effect)
  ├─ ./focus.js (trapFocus, onEscapeKey)
  └─ ./utils.js (generateId, setAriaAttributes)

validation.js
  ├─ ../pulse.js (pulse)
  ├─ ./utils.js (isAccessiblyHidden, getAccessibleName)
  └─ ./contrast.js (checkElementContrast)

contrast.js
  └─ (no dependencies, pure functions)

utils.js
  └─ ../pulse.js (pulse)
```

### runtime/graphql/ Dependencies

```
client.js
  ├─ ../pulse.js (pulse, computed, batch)
  ├─ ../http.js (createHttp)
  ├─ ../websocket.js (createWebSocket)
  ├─ ../errors.js (ClientError)
  ├─ ../lru-cache.js (LRUCache)
  └─ ../interceptor-manager.js (InterceptorManager)

cache.js
  ├─ ../pulse.js (pulse)
  └─ ../lru-cache.js (LRUCache)

subscriptions.js
  ├─ ../pulse.js (pulse, effect, onCleanup)
  ├─ ../websocket.js (createWebSocket, WebSocketError)
  └─ ../errors.js (ClientError)

hooks.js
  ├─ ../pulse.js (pulse, computed, effect, onCleanup)
  ├─ ../async.js (createVersionedAsync)
  ├─ ./client.js (GraphQLClient, getDefaultClient)
  └─ ./cache.js (getCacheKey)
```

### runtime/router/ Dependencies

```
core.js
  ├─ ../pulse.js (pulse, effect, batch)
  ├─ ../dom.js (el)
  ├─ ../logger.js (loggers)
  └─ ../lru-cache.js (LRUCache)

lazy.js
  ├─ ../pulse.js (effect)
  ├─ ../dom.js (el)
  └─ ../async.js (createVersionedAsync)

history.js
  └─ ../pulse.js (pulse, effect)

guards.js
  ├─ ../pulse.js (pulse)
  └─ ./core.js (router internals)

utils.js
  └─ ./core.js (createRouter)
```

### compiler/parser/ Dependencies

```
core.js
  ├─ ../lexer.js (TokenType, tokenize)
  └─ ../../runtime/errors.js (ParserError, SUGGESTIONS)

imports.js
  └─ ./core.js (Parser, ASTNode, NodeType)

state.js
  └─ ./core.js (Parser, ASTNode, NodeType)

view.js
  ├─ ./core.js (Parser, ASTNode, NodeType)
  └─ ./expressions.js (parseExpression)

style.js
  ├─ ./core.js (Parser, ASTNode, NodeType)
  └─ ./expressions.js (parseExpression for interpolations)

expressions.js
  └─ ./core.js (Parser, ASTNode, NodeType)

blocks.js
  ├─ ./core.js (Parser, ASTNode, NodeType)
  └─ ./expressions.js (parseExpression for function bodies)
```

## Import Path Compatibility

### Before Refactoring
```javascript
import { announce, trapFocus } from 'pulse-js-framework/runtime/a11y';
import { createRouter, lazy } from 'pulse-js-framework/runtime/router';
import { useQuery, useMutation } from 'pulse-js-framework/runtime/graphql';
import { parse } from 'pulse-js-framework/compiler';
```

### After Refactoring (Both Work!)
```javascript
// Old imports still work (barrel re-exports)
import { announce, trapFocus } from 'pulse-js-framework/runtime/a11y';

// New granular imports also work
import { announce } from 'pulse-js-framework/runtime/a11y/announcements';
import { trapFocus } from 'pulse-js-framework/runtime/a11y/focus';

// Mix and match
import { createRouter } from 'pulse-js-framework/runtime/router';
import { lazy } from 'pulse-js-framework/runtime/router/lazy';

// Parser still works the same
import { parse } from 'pulse-js-framework/compiler';
```

## File Size Reduction Summary

| Module | Before | After (Largest File) | Reduction |
|--------|--------|---------------------|-----------|
| compiler/parser.js | 2,376 LOC | ~800 LOC (view.js) | -66% |
| runtime/a11y.js | 1,844 LOC | ~450 LOC (widgets.js) | -76% |
| runtime/router.js | 1,605 LOC | ~400 LOC (core.js) | -75% |
| runtime/graphql.js | 1,326 LOC | ~450 LOC (client.js/hooks.js) | -66% |

**Total LOC affected:** 7,151 lines
**Average file size reduction:** ~70%
**Maintainability improvement:** 📈 Significant

## Backward Compatibility Matrix

| Import Style | Before | After | Status |
|--------------|--------|-------|--------|
| Named import from main | ✅ Works | ✅ Works | 100% Compatible |
| Default import | N/A | N/A | Not used |
| Deep import | ❌ Not available | ✅ Available | New capability |
| Wildcard import | ✅ Works | ✅ Works | 100% Compatible |

## Bundle Size Impact

**Expected:** NEUTRAL (±0%)

- **Tree-shaking:** ES modules eliminate unused code
- **Code splitting:** Potentially better granularity
- **Runtime overhead:** NONE (static imports only)
- **Production bundles:** Same size or slightly smaller

## Testing Coverage

| Module | Test Files | Coverage |
|--------|-----------|----------|
| compiler/parser | test/compiler.test.js | ~95% |
| runtime/a11y | test/a11y.test.js | ~90% |
| runtime/router | test/router.test.js | ~92% |
| runtime/graphql | test/graphql.test.js | ~88% |

**Post-refactor:** Same test files, same coverage (no new tests needed)

---

**Visual Summary:** Large monolithic files → Focused sub-modules with barrel exports
**Impact:** Better maintainability, zero breaking changes, neutral bundle size
