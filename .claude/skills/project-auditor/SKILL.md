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

## Context Loading

Load `.claude/context/` files relevant to the audit domain. E.g., `api-core.md` for reactivity audit, `api-ssr-server.md` for SSR audit.

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

```bash
# Full audit (all domains)
node .claude/skills/project-auditor/scripts/run-audit.js

# Single domain
node .claude/skills/project-auditor/scripts/run-audit.js --domain security
node .claude/skills/project-auditor/scripts/run-audit.js --domain performance
node .claude/skills/project-auditor/scripts/run-audit.js --domain a11y
node .claude/skills/project-auditor/scripts/run-audit.js --domain architecture
node .claude/skills/project-auditor/scripts/run-audit.js --domain quality
node .claude/skills/project-auditor/scripts/run-audit.js --domain testing
node .claude/skills/project-auditor/scripts/run-audit.js --domain docs

# Specific file or directory
node .claude/skills/project-auditor/scripts/run-audit.js runtime/dom.js
node .claude/skills/project-auditor/scripts/run-audit.js runtime/

# Output formats
node .claude/skills/project-auditor/scripts/run-audit.js --format markdown  # Default
node .claude/skills/project-auditor/scripts/run-audit.js --format json      # Machine-readable
node .claude/skills/project-auditor/scripts/run-audit.js --format summary   # Quick overview
```

## Health Score Calculation

Per-domain score: `100 - (critical * 20) - (high * 10) - (medium * 3) - (low * 1)` (min 0).

**Overall health** = weighted average across domains:

| Domain | Weight | Domain | Weight |
|--------|--------|--------|--------|
| Security | 25% | Testing | 15% |
| Architecture | 20% | Performance | 10% |
| Code Quality | 15% | Accessibility | 10% |
| | | Documentation | 5% |

**Rating:** 90-100 Excellent | 75-89 Good | 50-74 Fair | 25-49 Poor | 0-24 Critical

## Report Structure

Reports include: executive summary (overall score, issue counts), domain score table, findings listed by severity (each with file/line, description, impact, and fix), an improvement roadmap (immediate/short-term/long-term), and an appendix (files audited, lines scanned, time elapsed).

## Integration with Other Skills

| Finding Domain | Delegate To | Action |
|----------------|-------------|--------|
| Security critical | security-reviewer | Deep security audit |
| Architecture violation | software-architect | ADR review and fix |
| Low test coverage | qa-testing | Write missing tests |
| Code quality issues | senior-developer | Refactor and fix |
| Documentation gaps | docs-manager | Update documentation |

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

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Audit script fails | Missing Node.js >= 20 | Update Node.js |
| False positive on XSS | Internal use of innerHTML with trusted content | Add `// audit-ignore: xss-trusted` comment |
| Score too low | Many low-severity items | Focus on critical/high first |
| Audit too slow | Scanning node_modules | Ensure script excludes node_modules |
| Missing domain | Domain name typo | Use: security, performance, a11y, architecture, quality, testing, docs |
