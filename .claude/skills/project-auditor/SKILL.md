---
name: project-auditor
description: Project audit agent for the Pulse JS framework. Use this skill to run comprehensive audits covering code quality, security vulnerabilities, performance bottlenecks, accessibility compliance, architecture consistency, dependency health, and best practices. Generates detailed reports with severity levels, actionable fixes, and improvement roadmaps.
---

# Project Auditor for Pulse Framework

## When to Use This Skill

- Running a **full project audit** (code quality + security + performance + a11y + architecture)
- Auditing a specific area: security, performance, accessibility, architecture, or code quality
- Generating an **audit report** with severity-rated findings and actionable fixes
- Checking for **regressions** after major changes or before releases
- Evaluating **dependency health** (outdated, unused, vulnerable)
- Verifying **compliance** with framework conventions (CLAUDE.md)
- Pre-release quality gate validation
- Periodic health checks on the codebase

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | Audit report template, severity definitions |
| **scripts/** | Automated audit runner (multi-domain) |
| **references/** | Audit checklist, common patterns and anti-patterns |

## Audit Domains

The project auditor covers **7 domains**, each with specific checks:

### 1. Code Quality

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Dead code | Unused exports, unreachable code | Medium |
| Code duplication | Copy-pasted logic across modules | Medium |
| Naming conventions | Non-camelCase functions, non-PascalCase classes | Low |
| ES module compliance | CommonJS usage, missing named exports | Medium |
| Error handling | Unhandled promises, missing try-catch, swallowed errors | High |
| Complexity | Functions > 50 lines, deep nesting (> 4 levels) | Medium |
| Console statements | `console.log` left in production code | Low |
| TODO/FIXME/HACK | Unresolved markers in code | Low |
| Private fields | Missing `#` prefix on internal state | Low |
| Magic numbers | Hardcoded values without constants | Low |

**Key files to audit:**
- `runtime/*.js` - All runtime modules
- `compiler/*.js` - Compiler pipeline
- `cli/*.js` - CLI tools

### 2. Security

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| XSS vectors | Raw `innerHTML`, unsanitized user input in DOM | Critical |
| URL injection | Missing `sanitizeUrl()` for user-provided URLs | Critical |
| Prototype pollution | `__proto__`, `constructor` in object operations | High |
| CSS injection | Unsanitized `style` values, missing `sanitizeCSSValue()` | High |
| Event handler injection | `setAttribute('on*', ...)` without `safeSetAttribute()` | High |
| eval/Function | Dynamic code execution from user input | Critical |
| Regex DoS (ReDoS) | Catastrophic backtracking in regex patterns | High |
| Timing attacks | Non-constant-time string comparison for secrets | Medium |
| Information leakage | Stack traces, internal paths exposed to client | Medium |
| Dependency vulnerabilities | Known CVEs in npm dependencies | High |

**Key files to audit:**
- `runtime/utils.js` - Security utilities
- `runtime/security.js` - Sanitization functions
- `runtime/dom.js` - DOM manipulation
- `runtime/http.js` - HTTP client
- `runtime/server-components/` - Server components security

### 3. Performance

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Unnecessary re-renders | Effects without proper dependency tracking | High |
| Missing batch() | Multiple sequential `.set()` calls without batching | Medium |
| Memory leaks | Effects without cleanup, unclosed subscriptions | High |
| Large closures | Captured variables preventing GC | Medium |
| Synchronous blocking | Heavy computation in main thread | High |
| Cache misses | Missing LRU cache for repeated operations | Medium |
| DOM thrashing | Read-write-read patterns in DOM operations | High |
| Bundle size | Modules > 20KB, unnecessary imports in lite.js | Medium |
| Algorithm complexity | O(n^2) or worse in hot paths | High |
| Lazy loading | Missing lazy() for heavy route components | Low |

**Key files to audit:**
- `runtime/pulse.js` - Reactivity performance
- `runtime/dom.js` - DOM operation efficiency
- `runtime/dom-list.js` - List reconciliation (LIS algorithm)
- `runtime/dom-selector.js` - Selector parsing cache
- `runtime/lru-cache.js` - Cache implementation

### 4. Accessibility (A11y)

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Missing ARIA attributes | Interactive elements without proper ARIA | High |
| Keyboard navigation | Non-keyboard-accessible interactive elements | High |
| Focus management | Missing focus trap in modals, no focus restoration | High |
| Screen reader support | Missing live regions, no announcements | Medium |
| Color contrast | Insufficient contrast ratios (< 4.5:1 for AA) | Medium |
| Auto-ARIA consistency | `configureA11y()` options not properly applied | Medium |
| Semantic HTML | `div` with click handlers instead of `button` | Medium |
| Skip links | Missing skip navigation links in layouts | Low |
| Form labels | Inputs without associated labels | High |
| Heading hierarchy | Skipped heading levels (h1 -> h3) | Medium |

**Key files to audit:**
- `runtime/a11y.js` + `runtime/a11y/*.js` - A11y implementation
- `runtime/dom.js` - Auto-ARIA in `el()`
- `cli/lint.js` - A11y lint rules
- `compiler/transformer/` - A11y directive compilation

### 5. Architecture

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Layer violations | Runtime importing from CLI/compiler | Critical |
| Circular dependencies | Module A -> B -> A | High |
| Coupling metrics | Module with > 10 imports | Medium |
| API consistency | Inconsistent naming (create vs make, use vs get) | Medium |
| Export map alignment | package.json exports vs actual files | High |
| Zero-dep compliance | External dependencies in runtime | Critical |
| SSR compatibility | Direct `document`/`window` access without adapter | High |
| Tree-shakability | Default exports, side-effect imports | Medium |
| Error hierarchy | Raw `Error` instead of `PulseError` subclass | Low |
| ADR compliance | Implementation deviating from accepted ADRs | Medium |

**Key files to audit:**
- `package.json` - Export map, dependencies
- `runtime/` - Layer boundaries
- `compiler/` - No runtime imports
- `cli/` - No direct runtime internals

### 6. Testing

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Missing test files | Runtime modules without corresponding test | High |
| Low coverage | Modules below 80% line coverage | Medium |
| Fragile tests | Tests depending on timing, order, or globals | Medium |
| Missing edge cases | No tests for null, empty, boundary values | Medium |
| Async cleanup | Missing `t.after()`, dangling promises | High |
| Mock isolation | Shared mutable state between tests | Medium |
| Assertion quality | `assert.ok()` instead of `assert.strictEqual()` | Low |
| Error path coverage | No tests for error/failure cases | Medium |
| Regression tests | Bug fixes without corresponding test | Medium |
| Test framework | Using Jest/Mocha instead of node:test | High |

**Key files to audit:**
- `test/*.test.js` - All test files
- `scripts/run-all-tests.js` - Test runner config

### 7. Documentation

| Check | What it Detects | Severity |
|-------|-----------------|----------|
| Stale API docs | CLAUDE.md not matching actual exports | High |
| Missing examples | Public APIs without usage examples | Medium |
| Broken links | Dead links in documentation | Low |
| Outdated patterns | Deprecated patterns still documented | Medium |
| Missing JSDoc | Exported functions without JSDoc comments | Low |
| Example accuracy | Example code that doesn't compile/run | High |
| Changelog gaps | Features without changelog entries | Low |

## Severity Levels

| Level | Icon | Meaning | Action Required |
|-------|------|---------|-----------------|
| **Critical** | `[!]` | Security vulnerability or data loss risk | Immediate fix required |
| **High** | `[H]` | Bug, memory leak, or significant issue | Fix before next release |
| **Medium** | `[M]` | Code smell, suboptimal pattern | Fix in next sprint |
| **Low** | `[L]` | Style issue, minor improvement | Fix when convenient |
| **Info** | `[i]` | Suggestion, observation | Consider for future |

## Running Audits

### Full Audit (All Domains)

```bash
node .claude/skills/project-auditor/scripts/run-audit.js
```

### Single Domain

```bash
node .claude/skills/project-auditor/scripts/run-audit.js --domain security
node .claude/skills/project-auditor/scripts/run-audit.js --domain performance
node .claude/skills/project-auditor/scripts/run-audit.js --domain a11y
node .claude/skills/project-auditor/scripts/run-audit.js --domain architecture
node .claude/skills/project-auditor/scripts/run-audit.js --domain quality
node .claude/skills/project-auditor/scripts/run-audit.js --domain testing
node .claude/skills/project-auditor/scripts/run-audit.js --domain docs
```

### Specific File or Directory

```bash
node .claude/skills/project-auditor/scripts/run-audit.js runtime/dom.js
node .claude/skills/project-auditor/scripts/run-audit.js runtime/
```

### Output Formats

```bash
node .claude/skills/project-auditor/scripts/run-audit.js --format markdown  # Default
node .claude/skills/project-auditor/scripts/run-audit.js --format json      # Machine-readable
node .claude/skills/project-auditor/scripts/run-audit.js --format summary   # Quick overview
```

## Audit Workflow

### Phase 1: Discovery

```
1. Scan project structure (runtime/, compiler/, cli/, test/)
2. Identify all source files and their roles
3. Check file sizes, modification dates
4. Map module dependencies
5. Read existing CLAUDE.md and ADRs for context
```

### Phase 2: Static Analysis

```
1. Parse each file for patterns (regex-based scanning)
2. Check naming conventions and code structure
3. Detect anti-patterns and code smells
4. Verify export map and import graph
5. Check for known vulnerability patterns
```

### Phase 3: Dynamic Checks

```
1. Run test suite and capture results
2. Measure coverage per module
3. Run npm audit for dependency vulnerabilities
4. Check bundle sizes (if build available)
5. Validate example code compiles
```

### Phase 4: Report Generation

```
1. Aggregate findings by domain and severity
2. Deduplicate similar issues
3. Generate actionable fix suggestions
4. Calculate health scores per domain (0-100)
5. Create improvement roadmap (prioritized)
6. Output report in requested format
```

## Health Score Calculation

Each domain gets a score from 0-100:

```
Score = 100 - (critical * 20) - (high * 10) - (medium * 3) - (low * 1)
Minimum: 0
```

**Overall project health** = weighted average:

| Domain | Weight |
|--------|--------|
| Security | 25% |
| Architecture | 20% |
| Code Quality | 15% |
| Testing | 15% |
| Performance | 10% |
| Accessibility | 10% |
| Documentation | 5% |

**Rating scale:**

| Score | Rating | Color |
|-------|--------|-------|
| 90-100 | Excellent | Green |
| 75-89 | Good | Blue |
| 50-74 | Fair | Yellow |
| 25-49 | Poor | Orange |
| 0-24 | Critical | Red |

## Report Structure

Every audit report follows this structure:

```markdown
# Pulse Framework Audit Report
Date: YYYY-MM-DD
Auditor: project-auditor skill

## Executive Summary
Overall Health: XX/100 (Rating)
Critical Issues: N | High: N | Medium: N | Low: N

## Domain Scores
| Domain         | Score | Rating    | Critical | High | Medium | Low |
|----------------|-------|-----------|----------|------|--------|-----|
| Security       | XX    | Rating    | N        | N    | N      | N   |
| Architecture   | XX    | Rating    | N        | N    | N      | N   |
| ...            | ...   | ...       | ...      | ...  | ...    | ... |

## Findings

### [!] Critical: Finding title
- **File:** path/to/file.js:line
- **Domain:** Security
- **Description:** What was found
- **Impact:** What could happen
- **Fix:** How to fix it
- **Code example:** Before/after

### [H] High: Finding title
...

## Improvement Roadmap
1. Immediate (this week): Fix critical and high issues
2. Short-term (this month): Address medium issues
3. Long-term (this quarter): Improve low/info items

## Appendix
- Files audited: N
- Lines scanned: N
- Time elapsed: Xs
```

## Integration with Other Skills

The project auditor can delegate specific findings to specialized skills:

| Finding Domain | Delegate To | Action |
|----------------|-------------|--------|
| Security critical | security-reviewer | Deep security audit |
| Architecture violation | software-architect | ADR review and fix |
| Low test coverage | qa-testing | Write missing tests |
| Code quality issues | senior-developer | Refactor and fix |
| Documentation gaps | docs-manager | Update documentation |

### Usage with lead-developer

```bash
# Run audit, then fix all issues via lead-developer
/project-auditor full audit
# Review report
/lead-developer fix all critical and high issues from audit report
```

## Common Findings and Quick Fixes

### Security Quick Fixes

| Finding | Pattern | Fix |
|---------|---------|-----|
| Raw innerHTML | `el.innerHTML = x` | `el.textContent = x` or `escapeHtml(x)` |
| Unvalidated URL | `href = userUrl` | `href = sanitizeUrl(userUrl)` |
| Prototype pollution | `Object.assign(obj, input)` | `sanitizeObjectKeys(input)` first |
| Missing CSRF | Server action without token | Add `csrfValidation: true` |

### Performance Quick Fixes

| Finding | Pattern | Fix |
|---------|---------|-----|
| Unbatched updates | `a.set(); b.set();` | `batch(() => { a.set(); b.set(); })` |
| Missing key function | `list(items, render)` | `list(items, render, item => item.id)` |
| Effect without cleanup | `effect(() => { setInterval(...) })` | Return cleanup: `return () => clearInterval(id)` |
| Eager computed | Large dataset derived | `computed(fn, { lazy: true })` |

### Architecture Quick Fixes

| Finding | Pattern | Fix |
|---------|---------|-----|
| Layer violation | `import x from '../cli/...'` in runtime | Move shared code to runtime/utils |
| Direct DOM access | `document.querySelector()` in runtime | Use `getAdapter().querySelector()` |
| Raw Error | `throw new Error(...)` | `throw Errors.customError(...)` |
| External dependency | `require('lodash')` in runtime | Implement inline or in utils.js |

## Automation

### Pre-commit Hook

```bash
# Add to .husky/pre-commit or githooks
node .claude/skills/project-auditor/scripts/run-audit.js --domain security --format summary
# Fails if any critical issues found
```

### CI Integration

```yaml
# .github/workflows/audit.yml
- name: Run Project Audit
  run: node .claude/skills/project-auditor/scripts/run-audit.js --format json > audit-report.json
- name: Check Critical Issues
  run: |
    CRITICAL=$(jq '.summary.critical' audit-report.json)
    if [ "$CRITICAL" -gt 0 ]; then exit 1; fi
```

### Scheduled Audit

Run weekly to track project health over time:

```bash
# Cron: every Monday at 9am
0 9 * * 1 node .claude/skills/project-auditor/scripts/run-audit.js --format json >> audit-history.jsonl
```

## Key Project Files for Audit

| File | Audit Relevance |
|------|-----------------|
| `runtime/utils.js` | Security utilities (XSS, URL, CSS sanitization) |
| `runtime/security.js` | Prototype pollution, HTML sanitization |
| `runtime/dom.js` | DOM creation, auto-ARIA, event binding |
| `runtime/dom-adapter.js` | SSR compatibility abstraction |
| `runtime/pulse.js` | Reactivity performance, memory management |
| `runtime/dom-list.js` | List reconciliation (LIS algorithm) |
| `runtime/dom-selector.js` | Selector cache (LRU) |
| `runtime/lru-cache.js` | Cache correctness |
| `runtime/a11y.js` | Accessibility implementation |
| `runtime/http.js` | HTTP security, timeout handling |
| `runtime/server-components/security.js` | Server component security |
| `runtime/server-components/error-sanitizer.js` | Error information leakage |
| `compiler/transformer.js` | Code generation security |
| `package.json` | Export map, dependency health |
| `CLAUDE.md` | Documentation accuracy |

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Audit script fails | Missing Node.js >= 20 | Update Node.js |
| False positive on XSS | Internal use of innerHTML with trusted content | Add `// audit-ignore: xss-trusted` comment |
| Score too low | Many low-severity items | Focus on critical/high first |
| Audit too slow | Scanning node_modules | Ensure script excludes node_modules |
| Missing domain | Domain name typo | Use: security, performance, a11y, architecture, quality, testing, docs |
