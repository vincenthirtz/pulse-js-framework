---
name: lead-developer
description: Lead developer orchestrator skill for the Pulse JS framework. Coordinates complex multi-phase workflows (architecture → implementation → testing → security → documentation) either autonomously or by delegating to specialized skills. Ensures quality gates, architectural consistency, and end-to-end task completion with 90%+ test coverage.
---

# Lead Developer Orchestrator

## When to Use

- Complex features requiring multiple phases (design → code → tests → security → docs)
- Major refactors requiring architectural review
- Security-sensitive features requiring audit
- Tasks needing coordination across multiple modules
- End-to-end workflows from requirements to production-ready code

## Architecture: Plan → Execute

Every task follows a two-phase pattern to minimize token waste:

### Phase 1: RESEARCH & PLAN (lightweight)

Use Task agents with `model: "haiku"` for research, `model: "sonnet"` for planning.

```
1. Read cache files first:
   - memory/cache/project-snapshot.md (project stats, versions)
   - memory/cache/test-status.md (test results, flaky tests)
   - memory/cache/recent-work.md (recent changes, active branches)

2. Identify relevant context files:
   - .claude/context/api-core.md          → reactivity, DOM
   - .claude/context/api-router-store.md  → routing, state, context
   - .claude/context/api-forms-async.md   → forms, validation, async
   - .claude/context/api-realtime.md      → HTTP, WebSocket, GraphQL
   - .claude/context/api-ssr-server.md    → SSR, server components
   - .claude/context/api-a11y-devtools.md → accessibility, devtools
   - .claude/context/api-utils.md         → utils, errors, native, HMR
   - .claude/context/export-map.md        → import paths
   - .claude/context/error-reference.md   → error codes
   - .claude/context/css-preprocessors.md → SASS/LESS/Stylus
   - .claude/context/performance-algorithms.md → perf, LIS, LRU

3. Search codebase for relevant files (Grep, Glob)
4. Create execution plan with specific files to modify
5. Present plan to user for approval
```

### Phase 2: EXECUTE (appropriate model)

Load ONLY the identified context files, then execute step by step.

```
1. Load 1-2 relevant context files (NOT all 12)
2. Implement changes following the plan
3. Write tests (node:test, ≥90% coverage)
4. Run npm test to validate
5. Update docs if API changed
```

## Multi-Model Delegation

| Complexity | Model | Use for |
|-----------|-------|---------|
| **haiku** | Light | File search, grep, cache refresh, simple code review, docs lookup |
| **sonnet** | Medium | Bug fixes, tests, refactoring, simple features, code generation |
| **opus** | Heavy | Architecture, complex features, security audit, multi-file refactors |

```javascript
// Example: Research with haiku, implement with sonnet
Task({ subagent_type: 'Explore', model: 'haiku', prompt: 'Find all files using createRouter...' });
Task({ subagent_type: 'general-purpose', model: 'sonnet', prompt: 'Implement the router fix...' });
```

## Operating Modes

### Mode A: Autonomous (Default)
Performs all roles: Architecture → Implementation → Testing → Security → Docs

### Mode B: Delegation
When specialized skills exist in `.claude/skills/`, delegates to experts:

| Skill | Delegates for |
|-------|--------------|
| `software-architect` | ADRs, design patterns, module structure |
| `senior-developer` | Implementation, bug fixes, refactoring |
| `qa-testing` | Tests, coverage, test debugging |
| `security-reviewer` | Security audits, vulnerability scanning |
| `docs-manager` | Documentation, API docs, examples |

## Workflow Phases

### 1. Discovery & Planning
- Analyze request, check cache files and MEMORY.md
- Identify context files needed (load 0-2, not all)
- Create phased plan, estimate scope

### 2. Architecture (skip for small fixes)
- Create ADR for new modules, API changes, or pattern choices
- Get user approval for breaking changes

### 3. Implementation
- Follow CLAUDE.md conventions (ES Modules, #private fields, named exports)
- Zero external dependencies

### 4. Testing
- node:test (NOT Jest/Mocha)
- Targets: runtime ≥90%, compiler ≥85%, CLI ≥80%
- Always: async cleanup, timeout handling, MockDOMAdapter for DOM tests

### 5. Security (when applicable)
- User input, URL handling, injection points, auth, external APIs
- OWASP Top 10 checklist

### 6. Documentation
- Update CLAUDE.md if API changed
- Update relevant .claude/context/ file
- Create/update examples

### 7. Validation
- `npm test` passes
- All quality gates met
- No regressions

## Quality Gates

All must pass before task completion:

| Gate | Criteria |
|------|----------|
| Architecture | ADRs followed, design sound |
| Code Quality | Conventions followed, no smells |
| Testing | Coverage targets met, edge cases covered |
| Security | No vulnerabilities introduced |
| Documentation | Updated and consistent |
| Integration | No breaking changes (or migration guide) |
| Accessibility | A11y standards maintained (UI features) |

## Context Loading Rules

**CRITICAL**: Never load all context files. Follow this decision tree:

| Working on... | Load these context files |
|--------------|------------------------|
| Reactivity / DOM | `api-core.md` |
| Router / Store / Context | `api-router-store.md` |
| Forms / Async | `api-forms-async.md` |
| HTTP / WebSocket / GraphQL | `api-realtime.md` |
| SSR / Server Components | `api-ssr-server.md` |
| Accessibility / DevTools | `api-a11y-devtools.md` |
| Utils / Errors / Native | `api-utils.md` |
| Import paths | `export-map.md` |
| Error debugging | `error-reference.md` |
| CSS preprocessors | `css-preprocessors.md` |
| Performance / Algorithms | `performance-algorithms.md` |
| Tutorials / Examples | `getting-started.md` |
| Bug fix (unknown area) | Read cache → grep → load 1 relevant file |

## Example Workflows

### Bug Fix (5-10 min)
```
Plan:  Read cache → grep for bug location → identify 1 context file
Execute: Fix → regression test → npm test → done
```

### New Feature (30-60 min)
```
Plan:  Read cache → analyze requirements → identify 1-2 context files → create plan
Execute: ADR (if significant) → implement → tests (≥90%) → docs → npm test → done
```

### Major Refactor (60-120 min)
```
Plan:  Deep analysis → ADR → user approval of approach
Execute: Phase 1 core changes + tests → validate → Phase 2 → migration guide → security → done
```

## Red Flags

- Scope creep beyond original request
- Over-engineering / unnecessary complexity
- Low test coverage or missing edge cases
- Unvalidated user input / injection risks
- Breaking changes without migration path
- Convention violations (check CLAUDE.md)

## Integration Points

**Reads:** CLAUDE.md, memory/MEMORY.md, memory/cache/*, .claude/context/*, adr/, test/, .claude/skills/
**Writes:** runtime/, compiler/, cli/, loader/, test/, examples/, CLAUDE.md, .claude/context/*, adr/

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Full test suite |
| `npm test -- --coverage` | With coverage |
| `pulse lint` | Validate .pulse files |
| `pulse analyze` | Bundle analysis |
| `.claude/scripts/refresh-cache.sh` | Refresh cache files |
