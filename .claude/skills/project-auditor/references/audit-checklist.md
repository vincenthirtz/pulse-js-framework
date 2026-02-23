# Pulse Framework Audit Checklist

Complete checklist for manual and automated audits across all 7 domains.

---

## 1. Security Checklist

### XSS Prevention
- [ ] No raw `innerHTML` assignments outside of `dangerouslySetInnerHTML()`
- [ ] All user text content uses `textContent` or `escapeHtml()`
- [ ] `sanitizeHtml()` used for rich text rendering with allowlist
- [ ] No `document.write()` usage

### URL Safety
- [ ] All user-provided URLs pass through `sanitizeUrl()`
- [ ] `javascript:`, `vbscript:`, `data:text/html` protocols blocked
- [ ] Encoded protocol bypasses handled (HTML entities, URL encoding)
- [ ] `href`, `src`, `action`, `formaction` attributes validated

### Attribute Security
- [ ] `safeSetAttribute()` used for dynamic attributes
- [ ] 85+ event handler attributes blocked (`onclick`, `onerror`, etc.)
- [ ] No direct `setAttribute('on*', ...)` calls

### CSS Injection
- [ ] `sanitizeCSSValue()` validates all user CSS values
- [ ] Semicolons, `url()`, `expression()`, `@import` blocked
- [ ] `safeSetStyle()` used for inline styles

### Object Security
- [ ] `sanitizeObjectKeys()` used on user JSON input
- [ ] `__proto__`, `constructor`, `prototype` access blocked
- [ ] No `Object.assign()` with raw user objects

### Code Execution
- [ ] No `eval()` with dynamic input
- [ ] No `new Function()` with user data
- [ ] No `setTimeout(string)` or `setInterval(string)`

### Dependencies
- [ ] `npm audit` shows no critical/high vulnerabilities
- [ ] All dependencies pinned to exact versions or ranges
- [ ] No unnecessary dependencies in runtime (zero-dep policy)

### Server Components Security
- [ ] CSRF tokens validated for Server Actions
- [ ] Rate limiting configured for action endpoints
- [ ] Error messages sanitized before sending to client
- [ ] Props validated for secrets, XSS, and size limits
- [ ] No secrets passed as Client Component props

---

## 2. Performance Checklist

### Reactivity
- [ ] Multiple sequential `.set()` calls wrapped in `batch()`
- [ ] `computed()` used for derived values (not recalculated in effects)
- [ ] `lazy: true` option on expensive computed values
- [ ] `untrack()` used for reads that shouldn't create dependencies
- [ ] `peek()` used for one-off reads without subscription

### Memory Management
- [ ] All effects return cleanup functions for subscriptions
- [ ] `dispose()` called on computed values when no longer needed
- [ ] Event listeners removed on component unmount
- [ ] `onCleanup()` used for multiple cleanup registrations
- [ ] Intervals and timeouts cleared in cleanup

### DOM Operations
- [ ] `list()` uses key function for efficient diffing (LIS algorithm)
- [ ] No read-write-read DOM thrashing patterns
- [ ] Batch DOM insertions with `DocumentFragment` where possible
- [ ] Selector cache configured appropriately (`configureDom()`)

### Bundle Size
- [ ] Runtime modules < 20KB each (unminified)
- [ ] `lite.js` bundle only includes core features
- [ ] Lazy loading used for heavy route components
- [ ] Tree-shakeable named exports (no default exports)

### Algorithms
- [ ] No O(n^2) or worse in hot paths
- [ ] LRU cache used for repeated lookups
- [ ] Map/Set used instead of nested array iteration
- [ ] Binary search in sorted data (not linear scan)

---

## 3. Architecture Checklist

### Layer Boundaries
- [ ] Runtime never imports from CLI or compiler
- [ ] CLI can import compiler but not runtime internals
- [ ] Loader layer bridges build tools to compiler
- [ ] No circular dependencies between modules

### Zero Dependencies
- [ ] Runtime has zero npm dependencies
- [ ] Preprocessors (sass, less, stylus) are optional peer deps
- [ ] No `require()` of external packages in runtime

### SSR Compatibility
- [ ] All DOM access goes through `dom-adapter.js` abstraction
- [ ] No direct `document.*`, `window.*` in runtime (except dom.js)
- [ ] `MockDOMAdapter` tested for SSR rendering
- [ ] `isSSR()` check guards browser-only code

### API Consistency
- [ ] Factory functions: `create*(options)`
- [ ] Hook functions: `use*(deps, options)`
- [ ] Toggle functions: `enable*/disable*(options)`
- [ ] Config functions: `configure*(options)`
- [ ] Options object as last parameter
- [ ] Returns disposer/cleanup for subscriptions

### Error Handling
- [ ] All errors extend `PulseError` hierarchy
- [ ] Structured error codes (not just messages)
- [ ] Error suggestions provided for common mistakes
- [ ] Source location tracking in compiler errors

### Export Map
- [ ] `package.json` exports match actual files
- [ ] All public APIs use named exports
- [ ] No side-effect imports in modules
- [ ] Subpath exports for each major module

---

## 4. Code Quality Checklist

### Conventions
- [ ] ES Modules (`import`/`export`) throughout
- [ ] Private fields using `#fieldName` syntax
- [ ] camelCase for functions, PascalCase for classes
- [ ] Named exports for all public APIs
- [ ] No CommonJS (`require()`, `module.exports`)

### Code Cleanliness
- [ ] No `console.log` in production code (use logger)
- [ ] No TODO/FIXME/HACK comments without issue link
- [ ] No dead code or commented-out blocks
- [ ] No magic numbers (use named constants)
- [ ] Functions < 50 lines (extract helpers for longer ones)
- [ ] Nesting < 4 levels (use early returns)

### Error Handling
- [ ] All async functions have error handling
- [ ] Promises not silently swallowed (no empty `.catch()`)
- [ ] Error boundaries for component rendering
- [ ] Meaningful error messages with context

### Code Organization
- [ ] One module per file (single responsibility)
- [ ] Related functions grouped together
- [ ] Imports sorted (node: first, then relative)
- [ ] Consistent file structure across similar modules

---

## 5. Accessibility Checklist

### Auto-ARIA
- [ ] `el()` applies correct ARIA attributes by element type
- [ ] `configureA11y()` export available and documented
- [ ] Dialog elements get `role="dialog" aria-modal="true"`
- [ ] Interactive roles get required states (checkbox, slider, etc.)

### Focus Management
- [ ] `trapFocus()` used for modal dialogs
- [ ] Focus restored when modals close (`returnFocus: true`)
- [ ] Skip links available for main content navigation
- [ ] Focus-visible tracking for keyboard users

### Screen Readers
- [ ] `announce()` / live regions for dynamic content changes
- [ ] `srOnly()` for screen-reader-only text
- [ ] Images have `alt` attributes
- [ ] Form inputs have associated labels

### Keyboard Navigation
- [ ] All interactive elements keyboard-accessible
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys navigate within widgets (roving tabindex)
- [ ] Tab order follows visual layout

### Lint Rules
- [ ] `a11y-img-alt` rule active
- [ ] `a11y-button-text` rule active
- [ ] `a11y-link-text` rule active
- [ ] `a11y-input-label` rule active
- [ ] `a11y-click-key` rule active
- [ ] `a11y-no-autofocus` rule active
- [ ] `a11y-heading-order` rule active

### Color & Contrast
- [ ] Color contrast ratios meet WCAG AA (4.5:1 normal, 3:1 large)
- [ ] `getContrastRatio()` utility available
- [ ] `prefersReducedMotion()` detected and respected
- [ ] `prefersHighContrast()` support available

---

## 6. Testing Checklist

### Framework
- [ ] All tests use `node:test` (not Jest/Mocha/Vitest)
- [ ] Assertions use `node:assert` (not `expect()`)
- [ ] Test runner: `node --test test/*.js`

### Coverage
- [ ] Runtime modules: >= 90% line coverage
- [ ] Compiler modules: >= 85% line coverage
- [ ] CLI modules: >= 80% line coverage
- [ ] Every runtime module has a corresponding test file

### Quality
- [ ] Descriptive test names explain behavior
- [ ] Tests isolated (no shared mutable state)
- [ ] Reactive contexts created/reset per test
- [ ] Mock DOM setup in `beforeEach`, cleanup in `afterEach`
- [ ] Specific assertions (`strictEqual` over `ok`)

### Edge Cases
- [ ] Null, undefined, empty string inputs tested
- [ ] Empty arrays and objects tested
- [ ] Boundary values tested (0, -1, MAX_SAFE_INTEGER)
- [ ] Error paths tested (invalid input, network errors)
- [ ] Concurrent/race condition scenarios tested

### Async Tests
- [ ] All async tests properly `await` promises
- [ ] Cleanup provided via `t.after()`
- [ ] No hardcoded `setTimeout` delays
- [ ] `mock.timers` used for timer-dependent tests
- [ ] `AbortSignal.timeout()` for test timeouts

### Regression
- [ ] Every bug fix has a corresponding regression test
- [ ] Edge case discoveries become permanent tests
- [ ] Test suite run in CI on multiple Node.js versions

---

## 7. Documentation Checklist

### CLAUDE.md
- [ ] Project overview accurate
- [ ] API reference matches actual exports
- [ ] Code examples compile and run
- [ ] Export map section matches `package.json`
- [ ] All runtime modules documented

### Examples
- [ ] Every major feature has example code
- [ ] Examples follow best practices (no anti-patterns)
- [ ] Examples include accessibility patterns
- [ ] Examples are runnable (not pseudocode)

### Inline Documentation
- [ ] Public APIs have JSDoc comments
- [ ] Complex algorithms documented with comments
- [ ] Non-obvious design decisions explained

### Consistency
- [ ] Naming consistent across docs and code
- [ ] Import paths match actual module structure
- [ ] Version numbers up to date
- [ ] No broken internal links

---

## Running the Audit

```bash
# Full automated audit
node .claude/skills/project-auditor/scripts/run-audit.js

# Check specific domain
node .claude/skills/project-auditor/scripts/run-audit.js --domain security

# Quick summary
node .claude/skills/project-auditor/scripts/run-audit.js --format summary

# Machine-readable output
node .claude/skills/project-auditor/scripts/run-audit.js --format json

# Audit specific file or directory
node .claude/skills/project-auditor/scripts/run-audit.js runtime/dom.js
node .claude/skills/project-auditor/scripts/run-audit.js runtime/
```
