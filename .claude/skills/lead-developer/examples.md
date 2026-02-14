# Lead Developer Skill - Examples

Real-world examples of using the lead-developer skill for various tasks.

## Example 1: New Runtime Module

**User Request:**
> "Add a caching layer for HTTP responses with LRU eviction"

**Lead Developer Response:**

```
✓ Task Analysis:
  - New module: runtime/cache.js
  - Affects: runtime/http.js integration
  - Needs: ADR for cache strategy
  - Tests: Cache eviction, LRU order, thread safety
  - Docs: API docs + usage examples

✓ Execution Plan:
  Phase 1: Architecture (software-architect)
  Phase 2: Implementation (senior-developer)
  Phase 3: Testing (qa-testing)
  Phase 4: Documentation (docs-manager)

[Delegating to software-architect...]

ADR-045: LRU Cache Implementation
- Design: Doubly-linked list + Map
- Size: Configurable max entries
- Eviction: Least recently used
- Thread-safe: Yes (atomic operations)

[Delegating to senior-developer...]

Implemented:
- runtime/lru-cache.js (150 lines)
- Integration in runtime/http.js

[Delegating to qa-testing...]

Tests added:
- test/lru-cache.test.js (95% coverage)
- Edge cases: eviction, capacity, concurrent access

[Delegating to docs-manager...]

Documentation updated:
- CLAUDE.md: API reference + examples
- examples/http-caching/: Demo app

✓ Quality Gates: All Passed
✓ Coverage: 95.2%
✓ Integration: No breaking changes
✓ Performance: O(1) get/set operations

Task complete!
```

---

## Example 2: Security-Sensitive Feature

**User Request:**
> "Add HTML sanitization to prevent XSS in el() function"

**Lead Developer Response:**

```
⚠️  Security-sensitive task detected

✓ Task Analysis:
  - Security implications: High (XSS prevention)
  - Affects: runtime/dom.js (el function)
  - Needs: Security design review + audit
  - Tests: XSS attack vectors
  - Docs: Security guidelines

✓ Execution Plan:
  Phase 1: Security design review (security-reviewer)
  Phase 2: Architecture (software-architect)
  Phase 3: Implementation (senior-developer)
  Phase 4: Security audit (security-reviewer)
  Phase 5: Security testing (qa-testing)
  Phase 6: Documentation (docs-manager)

[Delegating to security-reviewer for design review...]

Security Design Review:
✓ Whitelist approach for HTML tags
✓ DOMPurify-style sanitization
✓ Configurable strict mode
✓ Escape by default

[Delegating to software-architect...]

ADR-046: HTML Sanitization Strategy
- Library: Custom (no deps)
- Whitelist: Safe tags + attributes
- Escape: Special chars by default
- API: sanitizeHtml(html, options)

[Delegating to senior-developer...]

Implemented:
- runtime/sanitizer.js
- Integration in runtime/dom.js (el function)
- Configurable via options

[Delegating to security-reviewer for audit...]

Security Audit:
✓ No XSS vulnerabilities found
✓ Edge cases covered
✓ Configurable strictness
⚠️  Recommendation: Add CSP headers docs

[Delegating to qa-testing...]

Security Tests:
- test/sanitizer.test.js (98% coverage)
- XSS attack vectors tested:
  - Script injection
  - Event handler injection
  - Data URI schemes
  - HTML entity encoding

[Delegating to docs-manager...]

Documentation:
- CLAUDE.md: Security section + API
- Security guide: Best practices
- CSP headers guide (per security-reviewer)

✓ Quality Gates: All Passed
✓ Security Audit: Passed
✓ Coverage: 98.1%
✓ XSS Tests: All passing

Task complete with security validation!
```

---

## Example 3: Major Refactor

**User Request:**
> "Refactor router to use RouteTrie for better performance with many routes"

**Lead Developer Response:**

```
✓ Task Analysis:
  - Major refactor: runtime/router.js
  - Breaking changes: Possible
  - Performance impact: High
  - Needs: Benchmarks, migration guide

✓ Execution Plan:
  Phase 1: Architecture + ADR (software-architect)
  Phase 2: User approval (breaking changes)
  Phase 3: Implementation (senior-developer, incremental)
  Phase 4: Testing (qa-testing, with benchmarks)
  Phase 5: Documentation (docs-manager, migration guide)

[Delegating to software-architect...]

ADR-047: RouteTrie for Route Matching
- Current: Linear scan O(n)
- Proposed: RouteTrie O(k) where k = path segments
- Breaking: Route order no longer matters
- Migration: Sort routes by specificity

⚠️  Breaking Change Detected!

Routes will be matched by specificity, not definition order.
Example:
  Before: ['/users/:id', '/users/me'] → '/users/me' must be first
  After: ['/users/:id', '/users/me'] → Order doesn't matter (specificity)

Continue with this refactor? (y/n)

[User: yes]

[Delegating to senior-developer - Phase 1: RouteTrie...]

Phase 1 Complete:
- runtime/router/trie.js implemented
- Tests passing (97% coverage)

[Delegating to qa-testing - Phase 1...]

Phase 1 Tests:
- test/router-trie.test.js
- Edge cases: wildcards, params, static

[Delegating to senior-developer - Phase 2: Integration...]

Phase 2 Complete:
- runtime/router/core.js refactored
- Backward compatibility layer added
- Deprecation warnings for route order dependency

[Delegating to qa-testing - Phase 2...]

Phase 2 Tests:
- test/router.test.js (all passing)
- Performance benchmarks:
  - 100 routes: 95% faster
  - 1000 routes: 99% faster

[Delegating to docs-manager...]

Documentation:
- CLAUDE.md: Router section updated
- Migration guide: v1.x → v2.x
- Performance section: Benchmarks
- Breaking changes: Documented

✓ Quality Gates: All Passed
✓ Coverage: 96.8%
✓ Performance: 95-99% faster
✓ Backward Compatibility: Yes (with warnings)
✓ Migration Guide: Complete

Task complete! Major performance improvement with smooth migration path.
```

---

## Example 4: Cross-Cutting Feature

**User Request:**
> "Add TypeScript definitions for the entire framework"

**Lead Developer Response:**

```
✓ Task Analysis:
  - Scope: All runtime modules + compiler
  - Files: ~30 .d.ts files needed
  - Complexity: High (generics, overloads)
  - Testing: Type tests with tsd

✓ Execution Plan:
  Phase 1: Architecture (software-architect)
  Phase 2: Runtime types (senior-developer)
  Phase 3: Compiler types (senior-developer)
  Phase 4: Type tests (qa-testing)
  Phase 5: Documentation (docs-manager)

[Delegating to software-architect...]

ADR-048: TypeScript Definitions Strategy
- Approach: Hand-written .d.ts (not generated)
- Generics: Preserve type safety
- Exports: Match runtime exactly
- Location: Alongside .js files

[Delegating to senior-developer - Runtime...]

Runtime types complete:
- runtime/pulse.d.ts
- runtime/dom.d.ts
- runtime/router.d.ts
- runtime/store.d.ts
- runtime/form.d.ts
- runtime/async.d.ts
- runtime/http.d.ts
- runtime/websocket.d.ts
- runtime/graphql.d.ts
- runtime/a11y.d.ts
(+15 more)

[Delegating to senior-developer - Compiler...]

Compiler types complete:
- compiler/index.d.ts
- compiler/lexer.d.ts
- compiler/parser.d.ts
- compiler/transformer.d.ts

[Delegating to qa-testing...]

Type tests:
- test-d/runtime.test-d.ts
- test-d/compiler.test-d.ts
- Using tsd for type assertions
- All passing ✓

[Delegating to docs-manager...]

Documentation:
- CLAUDE.md: TypeScript section
- README: TypeScript quick start
- Examples: TypeScript versions
- IDE setup guide

✓ Quality Gates: All Passed
✓ Type Tests: All passing
✓ IDE Autocomplete: Working
✓ Generic inference: Correct

Task complete! Full TypeScript support with type safety.
```

---

## Example 5: Bug Fix (Complex)

**User Request:**
> "Fix memory leak in effect cleanup when using list() with reactive keys"

**Lead Developer Response:**

```
✓ Task Analysis:
  - Bug: Memory leak in runtime/dom-list.js
  - Severity: High (production impact)
  - Root cause analysis needed
  - Regression tests required

✓ Execution Plan:
  Phase 1: Root cause analysis (senior-developer)
  Phase 2: Architecture review (software-architect)
  Phase 3: Fix implementation (senior-developer)
  Phase 4: Regression tests (qa-testing)

[Delegating to senior-developer for analysis...]

Root Cause:
- list() creates effects for each item
- Effects not disposed when items removed
- Disposal function not called in cleanup phase

Affected:
- runtime/dom-list.js lines 145-167
- All code using list() with dynamic data

[Delegating to software-architect...]

Architecture Review:
- Effect disposal mechanism correct
- Issue: cleanup function not registered
- Fix: Ensure onCleanup() called in reconciliation

[Delegating to senior-developer for fix...]

Fix implemented:
- runtime/dom-list.js: Register cleanup for each item effect
- Test case: Add/remove items 1000x, memory stable

[Delegating to qa-testing...]

Regression tests:
- test/dom-list.test.js: Memory leak test
- Test: Create/destroy 10,000 list items
- Assertion: Memory returns to baseline
- Result: ✓ Passing

✓ Quality Gates: All Passed
✓ Memory leak: Fixed
✓ Regression test: Passing
✓ Coverage: Maintained at 94%

Task complete! Memory leak fixed with regression protection.
```

---

## Example 6: Documentation-Only Task

**User Request:**
> "Update the router documentation with examples of lazy loading"

**Lead Developer Response:**

```
✓ Task Analysis:
  - Scope: Documentation only
  - Files: CLAUDE.md, examples
  - No code changes needed
  - Delegation: docs-manager only

⚠️  Note: This is a docs-only task.
     Consider using /docs-manager directly for faster execution.

Proceeding with lead-developer for completeness...

[Delegating to docs-manager...]

Documentation updated:
- CLAUDE.md: Router section
  - Added lazy() examples
  - Added preload() usage
  - Added loading states
  - Added error handling

Examples added:
- examples/router-lazy/
  - Code splitting demo
  - Loading indicators
  - Error boundaries

✓ Quality Gates: Docs Passed
✓ Examples: Tested and working
✓ Consistency: Verified

Task complete!

💡 Tip: For docs-only tasks, use /docs-manager directly.
```

---

## Common Patterns

### Pattern 1: Feature with Security Review

```
User: "Add authentication middleware for routes"

Lead Developer:
1. Security design review
2. Architecture (ADR)
3. Implementation
4. Security audit
5. Security tests
6. Documentation

Output: Secure, audited, well-tested feature
```

### Pattern 2: Performance Optimization

```
User: "Optimize effect batching for better performance"

Lead Developer:
1. Benchmark current performance
2. Architecture review
3. Implementation with benchmarks
4. Regression tests
5. Performance documentation

Output: Faster code with benchmark validation
```

### Pattern 3: Breaking Change

```
User: "Change store API to use Proxy instead of Pulse"

Lead Developer:
1. Architecture (ADR + breaking change plan)
2. User approval
3. Implementation with deprecation layer
4. Tests (new + backward compat)
5. Migration guide

Output: Breaking change with smooth migration
```

---

## Anti-Patterns (What NOT to Do)

### ❌ Anti-Pattern 1: Using for Trivial Tasks

```
BAD:
User: "Fix typo in comment"
/lead-developer fix typo in runtime/pulse.js

GOOD:
Just fix it directly (no skill needed)
```

### ❌ Anti-Pattern 2: Over-Specifying

```
BAD:
/lead-developer call software-architect then senior-developer then qa-testing...

GOOD:
/lead-developer add feature X
(Let it decide the phases)
```

### ❌ Anti-Pattern 3: Skipping Approval

```
BAD:
User sees ADR with breaking changes, lead-developer proceeds anyway

GOOD:
Lead-developer WAITS for user approval on breaking changes
```

---

## Success Metrics

When lead-developer completes a task:

- ✅ All quality gates passed
- ✅ Test coverage ≥90%
- ✅ No security vulnerabilities
- ✅ Documentation updated
- ✅ ADR created (if architectural)
- ✅ Migration guide (if breaking)
- ✅ No regressions introduced

You get **production-ready** code, not just "working" code.
