# Architecture Decision Record: Module Refactoring for v1.11.0

**Status:** Proposed
**Date:** 2026-02-13
**Milestone:** 1.11.0 - Code Architecture Refactoring
**Issues:** #74, #75, #76, #77

## Context

Four large modules in the Pulse framework have grown beyond maintainability thresholds (>1200 LOC):

| Module | Current LOC | Issue |
|--------|-------------|-------|
| `compiler/parser.js` | 2,376 | #77 |
| `runtime/a11y.js` | 1,844 | #74 |
| `runtime/router.js` | 1,605 | #76 |
| `runtime/graphql.js` | 1,326 | #75 |

These monolithic files violate the Single Responsibility Principle and make code navigation, testing, and maintenance difficult.

## Decision

Split each large module into focused sub-modules organized by feature domain, maintaining backward compatibility through barrel exports.

## Architecture Plan

### 1. `runtime/a11y.js` → `runtime/a11y/` (Issue #74)

**Current Structure (1,844 LOC):**
- LIVE REGIONS - Screen Reader Announcements (lines 15-133)
- FOCUS MANAGEMENT (lines 135-376)
- SKIP LINKS (lines 378-448)
- USER PREFERENCES (lines 450-560)
- ARIA HELPERS (lines 562-710)
- KEYBOARD NAVIGATION (lines 712-799)
- ARIA WIDGETS (lines 801-1184)
- VALIDATION & AUDITING (lines 1186-1433)
- COLOR CONTRAST (lines 1435-1551)
- ANNOUNCEMENT QUEUE (lines 1553-1635)
- UTILITIES (lines 1637-1844)

**Proposed Modular Structure:**

```
runtime/a11y/
├── index.js              # Barrel export (all public APIs)
├── announcements.js      # ~200 LOC - LIVE REGIONS + ANNOUNCEMENT QUEUE
│   ├── announce()
│   ├── announcePolite()
│   ├── announceAssertive()
│   ├── createLiveAnnouncer()
│   └── createAnnouncementQueue()
├── focus.js             # ~350 LOC - FOCUS MANAGEMENT + SKIP LINKS + KEYBOARD NAV
│   ├── getFocusableElements()
│   ├── focusFirst(), focusLast()
│   ├── trapFocus()
│   ├── saveFocus(), restoreFocus(), clearFocusStack()
│   ├── onEscapeKey()
│   ├── createFocusVisibleTracker()
│   ├── createSkipLink()
│   ├── installSkipLinks()
│   └── createRovingTabindex()
├── preferences.js       # ~120 LOC - USER PREFERENCES
│   ├── prefersReducedMotion()
│   ├── prefersColorScheme()
│   ├── prefersHighContrast()
│   ├── prefersReducedTransparency()
│   ├── forcedColorsMode()
│   ├── prefersContrast()
│   └── createPreferences()
├── widgets.js           # ~450 LOC - ARIA WIDGETS + ARIA HELPERS
│   ├── setAriaAttributes()
│   ├── createDisclosure()
│   ├── createTabs()
│   ├── createModal()
│   ├── createTooltip()
│   ├── createAccordion()
│   └── createMenu()
├── validation.js        # ~300 LOC - VALIDATION & AUDITING
│   ├── validateA11y()
│   ├── logA11yIssues()
│   └── highlightA11yIssues()
├── contrast.js          # ~150 LOC - COLOR CONTRAST
│   ├── getContrastRatio()
│   ├── meetsContrastRequirement()
│   ├── getEffectiveBackgroundColor()
│   └── checkElementContrast()
└── utils.js             # ~250 LOC - UTILITIES
    ├── generateId()
    ├── getAccessibleName()
    ├── isAccessiblyHidden()
    ├── makeInert()
    └── srOnly()
```

**Dependencies:**
- All sub-modules import from `../pulse.js` (for reactive primitives)
- `focus.js` imports utilities from `utils.js`
- `widgets.js` imports from `focus.js` and `utils.js`
- `validation.js` imports from `utils.js` and `contrast.js`

### 2. `runtime/graphql.js` → `runtime/graphql/` (Issue #75)

**Current Structure (1,326 LOC):**
- Constants (MessageType for graphql-ws protocol)
- GraphQLError class
- Cache key utilities
- SubscriptionManager class (lines 222-417)
- GraphQLClient class (lines 427-777)
- Factory function (createGraphQLClient)
- Default client management
- useQuery hook (lines 850-1019)
- useMutation hook (lines 1024-1132)
- useSubscription hook (lines 1137-1301)

**Proposed Modular Structure:**

```
runtime/graphql/
├── index.js              # Barrel export
├── client.js            # ~450 LOC - Core client + error handling
│   ├── GraphQLError (class)
│   ├── GraphQLClient (class)
│   ├── createGraphQLClient()
│   ├── setDefaultClient()
│   └── getDefaultClient()
├── cache.js             # ~100 LOC - Query caching
│   ├── createCacheKey()
│   ├── getCacheKey()
│   └── Cache manager internals
├── subscriptions.js     # ~250 LOC - WebSocket subscriptions
│   ├── MessageType (constants)
│   ├── SubscriptionManager (class)
│   └── Subscription lifecycle
└── hooks.js             # ~450 LOC - React-style hooks
    ├── useQuery()
    ├── useMutation()
    └── useSubscription()
```

**Dependencies:**
- `client.js`: imports from `../pulse.js`, `../http.js`, `../errors.js`, `../lru-cache.js`, `../interceptor-manager.js`
- `cache.js`: imports from `../pulse.js`, `../lru-cache.js`
- `subscriptions.js`: imports from `../pulse.js`, `../websocket.js`, `../errors.js`
- `hooks.js`: imports from `./client.js`, `./cache.js`, `../pulse.js`, `../async.js`

### 3. `runtime/router.js` → `runtime/router/` (Issue #76)

**Current Structure (1,605 LOC):**
- lazy() function (lines 55-180)
- preload() function (lines 182-189)
- RouteTrie class for route matching (lines 279-373)
- Scroll restoration utilities (lines 375-500)
- Navigation guards/middleware (lines 502-590)
- Main createRouter() function (lines 592-1556)
- simpleRouter() helper
- Lifecycle hooks (onBeforeLeave, onAfterEnter)

**Proposed Modular Structure:**

```
runtime/router/
├── index.js             # Barrel export
├── core.js              # ~400 LOC - Route matching + createRouter
│   ├── RouteTrie (class)
│   ├── createRouter() (main factory)
│   ├── Route matching logic
│   └── Navigation orchestration
├── lazy.js              # ~150 LOC - Code splitting
│   ├── lazy()
│   └── preload()
├── history.js           # ~250 LOC - Browser history & scroll
│   ├── Scroll persistence
│   ├── Scroll restoration
│   ├── History state management
│   └── popstate handling
├── guards.js            # ~200 LOC - Navigation guards
│   ├── Middleware execution
│   ├── beforeEach() logic
│   ├── beforeResolve() logic
│   ├── afterEach() logic
│   └── Route guard execution
└── utils.js             # ~150 LOC - Helpers & lifecycle
    ├── simpleRouter()
    ├── onBeforeLeave()
    ├── onAfterEnter()
    └── URL parsing utilities
```

**Dependencies:**
- `core.js`: imports from `../pulse.js`, `../dom.js`, `../logger.js`, `../lru-cache.js`
- `lazy.js`: imports from `../pulse.js`, `../dom.js`, `../async.js`
- `history.js`: imports from `../pulse.js`
- `guards.js`: imports from `../pulse.js`, `./core.js`
- `utils.js`: imports from `./core.js`

### 4. `compiler/parser.js` → `compiler/parser/` (Issue #77)

**Current Structure (2,376 LOC):**
- NodeType constants and ASTNode class (lines 11-85)
- Parser class with ~50 methods (lines 90-2363)
  - Core utilities (current, peek, expect, etc.)
  - Import/Page/Route parsing (lines 300-388)
  - Props/State block parsing (lines 389-475)
  - View block parsing (lines 518-1137) - **LARGEST SECTION**
  - Actions block parsing (lines 1505-1582)
  - Style block parsing (lines 1584-2061) - **SECOND LARGEST**
  - Router/Store block parsing (lines 2063-2362)

**Proposed Modular Structure:**

```
compiler/parser/
├── index.js             # Barrel export + parse() entry
├── core.js              # ~300 LOC - Base Parser class + utilities
│   ├── NodeType (constants)
│   ├── ASTNode (class)
│   ├── Parser (class) - base methods
│   ├── current(), peek(), is(), isAny()
│   ├── advance(), expect()
│   ├── createError()
│   └── parse() orchestrator
├── imports.js           # ~150 LOC - Import declarations
│   ├── parseImportDeclaration()
│   ├── parsePageDeclaration()
│   └── parseRouteDeclaration()
├── state.js             # ~300 LOC - Props + State blocks
│   ├── parsePropsBlock()
│   ├── parsePropsProperty()
│   ├── parseStateBlock()
│   ├── parseStateProperty()
│   ├── parseValue()
│   ├── parseObjectLiteral()
│   └── parseArrayLiteral()
├── view.js              # ~800 LOC - View block (largest section)
│   ├── parseViewBlock()
│   ├── parseViewChild()
│   ├── parseSlotElement()
│   ├── parseElement()
│   ├── parseComponentProp()
│   ├── parseTextNode()
│   ├── parseInterpolatedString()
│   ├── parseDirective()
│   ├── parseInlineDirective()
│   ├── parseIfDirective()
│   ├── parseEachDirective()
│   ├── parseEventDirective()
│   ├── parseModelDirective()
│   ├── parseA11yDirective()
│   ├── parseLiveDirective()
│   ├── parseFocusTrapDirective()
│   └── parseSrOnlyDirective()
├── style.js             # ~550 LOC - Style block (second largest)
│   ├── parseStyleBlock()
│   ├── parseStyleRule()
│   └── parseStyleProperty()
├── expressions.js       # ~400 LOC - Expression parsing
│   ├── parseExpression()
│   ├── parseAssignmentExpression()
│   ├── parseConditionalExpression()
│   ├── parseBinaryExpr()
│   ├── parseOrExpression()
│   ├── parseUnaryExpression()
│   ├── parsePostfixExpression()
│   ├── parsePrimaryExpression()
│   ├── parseArrowFunction()
│   ├── parseArrayLiteralExpr()
│   ├── parseObjectLiteralExpr()
│   └── parseIdentifierOrExpression()
└── blocks.js            # ~300 LOC - Actions, Router, Store blocks
    ├── parseActionsBlock()
    ├── parseFunctionDeclaration()
    ├── parseFunctionBody()
    ├── parseRouterBlock()
    ├── parseRoutesBlock()
    ├── parseGuardHook()
    ├── parseStoreBlock()
    ├── parseGettersBlock()
    ├── parseGetterDeclaration()
    ├── parseLinkDirective()
    ├── parseOutletDirective()
    └── parseNavigateDirective()
```

**Dependencies:**
- `core.js`: imports from `./lexer.js`, `../../runtime/errors.js`
- All other parser modules: extend or compose with `Parser` from `core.js`
- `view.js`: imports `expressions.js` for attribute value parsing
- `style.js`: imports `expressions.js` for interpolated CSS values
- `blocks.js`: imports `expressions.js` for function bodies

## Implementation Strategy

### Phase 1: Create Sub-module Structure (Low Risk)

For each module being split:

1. **Create directory structure** without breaking existing code
2. **Extract code into sub-modules** with proper imports/exports
3. **Create barrel `index.js`** re-exporting all public APIs
4. **Preserve exact same API** - no breaking changes

### Phase 2: Update Internal Imports (Medium Risk)

1. **Update package.json exports map** to support both old and new paths
2. **Add deprecation warnings** (console.warn) for direct sub-module imports
3. **Update build tool loaders** (Vite, Webpack, etc.) if needed

### Phase 3: Update Documentation (Low Risk)

1. **Update CLAUDE.md** with new import paths (optional, backward compatible)
2. **Update JSDoc** comments to reference correct files
3. **Add migration guide** to CHANGELOG.md

### Phase 4: Testing & Validation (Critical)

1. **Run full test suite** after each module split
2. **Verify bundle size** hasn't changed (tree-shaking should work)
3. **Test all example apps** (todo, chat, e-commerce, etc.)
4. **Manual testing** of accessibility, routing, GraphQL, etc.

## Backward Compatibility Strategy

All changes MUST be 100% backward compatible:

```javascript
// Old import (still works)
import { announce, trapFocus } from 'pulse-js-framework/runtime/a11y';

// New import (also works, same behavior)
import { announce } from 'pulse-js-framework/runtime/a11y/announcements';
import { trapFocus } from 'pulse-js-framework/runtime/a11y/focus';
```

**Barrel exports ensure compatibility:**

```javascript
// runtime/a11y/index.js
export * from './announcements.js';
export * from './focus.js';
export * from './preferences.js';
export * from './widgets.js';
export * from './validation.js';
export * from './contrast.js';
export * from './utils.js';
```

## File Organization Rules

### Naming Conventions

- **Directory names:** lowercase with hyphens (N/A for single-word names)
- **File names:** lowercase, descriptive noun (e.g., `focus.js`, `validation.js`)
- **Index files:** Always `index.js`, never `mod.js` or `main.js`

### Module Boundaries

- **No circular imports** between sub-modules within same parent
- **Shared utilities** go in `utils.js` or `core.js`
- **Public API** exported through `index.js` only
- **Internal helpers** can be non-exported in sub-modules

### Import Ordering

Within each sub-module:

1. Node.js built-ins (N/A for runtime)
2. Pulse core (`../pulse.js`, `../dom.js`)
3. Pulse utilities (`../utils.js`, `../errors.js`)
4. Sibling sub-modules (`./utils.js`, `./core.js`)
5. Types/constants (if any)

## Bundle Size Impact

**Expected impact:** NONE (neutral or slight improvement)

- ES modules with tree-shaking preserve bundle size
- Vite/Rollup/Webpack will eliminate unused exports
- Smaller modules may improve code splitting granularity
- No new dependencies added

**Validation:**

```bash
# Before refactor
pulse analyze --json > before.json

# After refactor
pulse analyze --json > after.json

# Compare (should be ±0% or slight improvement)
node scripts/compare-bundle-size.js before.json after.json
```

## Testing Strategy

### Unit Tests

- **Existing tests:** Should pass without modification
- **New tests:** Not required (no new functionality)
- **Coverage:** Maintain 100% coverage for refactored modules

### Integration Tests

- **Router tests:** Verify lazy loading, guards, history still work
- **A11y tests:** Verify focus management, announcements, widgets
- **GraphQL tests:** Verify queries, mutations, subscriptions
- **Parser tests:** Verify all .pulse file syntax still parses correctly

### Manual Testing

Test all examples:

```bash
cd examples/todo && npm install && npm run dev
cd examples/chat && npm install && npm run dev
cd examples/e-commerce && npm install && npm run dev
cd examples/blog && npm install && npm run dev
```

## Rollback Plan

If critical bugs are discovered:

1. **Revert commits** for the problematic module
2. **Keep other refactorings** if they're working
3. **Fix issue** in isolation, re-apply refactoring
4. **Document in ADR** what went wrong and solution

## Success Criteria

- ✅ All 4 modules split into logical sub-modules
- ✅ 100% backward compatibility (all existing imports work)
- ✅ No bundle size increase (±0% acceptable)
- ✅ All tests pass (zero regression)
- ✅ Documentation updated (CLAUDE.md, inline JSDoc)
- ✅ All example apps functional
- ✅ No new ESLint/type errors
- ✅ Build times unchanged or improved

## Trade-offs

### Advantages

- ✅ **Better code organization** - Single Responsibility Principle
- ✅ **Easier navigation** - Smaller files, clearer structure
- ✅ **Better code splitting** - Import only what you need
- ✅ **Easier testing** - Test sub-modules in isolation
- ✅ **Better git diffs** - Changes localized to small files
- ✅ **Easier onboarding** - New contributors find code faster

### Disadvantages

- ❌ **More files** - Directory clutter (manageable with good naming)
- ❌ **Import complexity** - Need to know which sub-module (mitigated by barrel exports)
- ❌ **Initial effort** - Time to split and test (one-time cost)

### Neutral

- ⚖️ **Bundle size** - Should be unchanged (tree-shaking handles it)
- ⚖️ **Runtime performance** - Zero impact (ES modules)

## Dependencies

### Before Starting

- ✅ Ensure all tests pass on `develop` branch
- ✅ Ensure clean git status (no uncommitted changes)
- ✅ Review CLAUDE.md for any module-specific documentation

### During Implementation

- Update `package.json` exports map if adding new deep import paths
- Update `.eslintrc.js` if new import rules needed
- Update Vite/Webpack loaders if they reference hardcoded paths

## Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Split `compiler/parser.js` (largest) | 4-6 hours |
| 2 | Split `runtime/a11y.js` | 3-4 hours |
| 3 | Split `runtime/router.js` | 3-4 hours |
| 4 | Split `runtime/graphql.js` | 2-3 hours |
| 5 | Update documentation | 2 hours |
| 6 | Testing & validation | 3-4 hours |
| **Total** | | **17-23 hours** |

## References

- Issue #74: [Split runtime/a11y.js](https://github.com/vincenthirtz/pulse-js-framework/issues/74)
- Issue #75: [Split runtime/graphql.js](https://github.com/vincenthirtz/pulse-js-framework/issues/75)
- Issue #76: [Split runtime/router.js](https://github.com/vincenthirtz/pulse-js-framework/issues/76)
- Issue #77: [Split compiler/parser.js](https://github.com/vincenthirtz/pulse-js-framework/issues/77)
- Milestone: [Code Architecture Refactoring (v1.11.0)](https://github.com/vincenthirtz/pulse-js-framework/milestone/10)

## Implementation Order (Recommended)

Execute in this order to minimize risk:

1. **compiler/parser.js** (Issue #77) - Isolated from runtime, easiest to test
2. **runtime/graphql.js** (Issue #75) - Clear separation, well-structured
3. **runtime/a11y.js** (Issue #74) - Many exports, but clear sections
4. **runtime/router.js** (Issue #76) - Most critical, do last with extra care

## Next Steps

1. **Review this ADR** with team/maintainer
2. **Create feature branch** `refactor/split-modules-v1.11.0`
3. **Implement Phase 1** for first module (parser.js)
4. **Open draft PR** for early feedback
5. **Iterate** through remaining modules
6. **Final review** and merge to develop

---

**Author:** Claude (Software Architect Agent)
**Reviewers:** (To be assigned)
**Approval Status:** Pending Review
