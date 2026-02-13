# Lead Developer Skill

The Lead Developer skill orchestrates complex tasks by coordinating specialized agents (software-architect, senior-developer, qa-testing, security-reviewer, docs-manager) to deliver high-quality, well-tested, and documented code.

## When to Use

Invoke this skill for:

- **Complex features** requiring architecture + implementation + tests + docs
- **End-to-end implementations** that span multiple modules
- **Major refactors** with architectural implications
- **Security-sensitive features** requiring design + audit + secure implementation
- **Cross-cutting changes** affecting multiple subsystems
- **Tasks requiring coordination** between multiple specialized skills

## Usage

```bash
# Via slash command
/lead-developer implement new feature X with full tests and docs

# Via Skill tool
Skill: "lead-developer"
Args: "implement SSR streaming with full test coverage and security review"
```

## What This Skill Does

### 1. Task Analysis
- Breaks down complex requests into logical phases
- Identifies which specialized skills are needed
- Creates execution plan with dependencies

### 2. Coordination
- Delegates to appropriate specialists:
  - **software-architect**: Design decisions, ADRs
  - **senior-developer**: Code implementation
  - **qa-testing**: Test coverage and quality
  - **security-reviewer**: Security audits
  - **docs-manager**: Documentation updates

### 3. Quality Oversight
- Validates each phase before proceeding
- Ensures architecture alignment (ADRs)
- Checks test coverage (≥90%)
- Verifies security compliance
- Reviews documentation completeness

### 4. Integration
- Coordinates changes across modules
- Validates backward compatibility
- Ensures no regressions

## Example Workflows

### New Feature (Medium Complexity)
```
User: "Add WebSocket heartbeat with auto-reconnect"

Lead Developer:
1. Analyzes requirements
2. Delegates to software-architect → Creates ADR
3. Reviews and approves design
4. Delegates to senior-developer → Implements in runtime/websocket.js
5. Delegates to qa-testing → Adds tests (coverage ≥90%)
6. Delegates to docs-manager → Updates CLAUDE.md with API docs
7. Final validation → All quality gates pass
8. Done ✅
```

### Bug Fix + Security Audit
```
User: "Fix XSS vulnerability in el() attribute handling"

Lead Developer:
1. Analyzes security implications
2. Delegates to security-reviewer → Audit current code
3. Delegates to senior-developer → Implement fix with escaping
4. Delegates to security-reviewer → Re-audit fix
5. Delegates to qa-testing → Add security tests
6. Delegates to docs-manager → Add security notes to docs
7. Final validation
8. Done ✅
```

### Major Refactor
```
User: "Refactor router to use RouteTrie for performance"

Lead Developer:
1. Deep analysis of current router
2. Delegates to software-architect → ADR for RouteTrie design
3. User approval of ADR
4. Phase 1: Delegates to senior-developer → Implement RouteTrie
5. Phase 1: Delegates to qa-testing → Test RouteTrie
6. Validate phase 1
7. Phase 2: Delegates to senior-developer → Integrate with router
8. Phase 2: Delegates to qa-testing → Integration tests
9. Delegates to docs-manager → Update docs + migration guide
10. Final validation (no regressions)
11. Done ✅
```

## Quality Gates

Before task completion, all must pass:

- ✅ **Architecture**: ADRs followed, design is sound
- ✅ **Code Quality**: Follows conventions in CLAUDE.md
- ✅ **Testing**: Coverage ≥ 90%, edge cases covered
- ✅ **Security**: No vulnerabilities introduced
- ✅ **Documentation**: API docs updated and consistent
- ✅ **Integration**: No breaking changes (or documented with migration guide)
- ✅ **Performance**: No regressions
- ✅ **Accessibility**: A11y standards maintained

## Advantages

### vs. Invoking Skills Manually
- **Coordinated**: No gaps between phases
- **Efficient**: Parallel delegation when possible
- **Quality-focused**: Enforces all quality gates
- **Complete**: Ensures tests + docs + security

### vs. Single-agent Approach
- **Specialized expertise**: Each agent optimized for its domain
- **Better quality**: Architects design, developers implement, QA tests, security audits
- **Maintainable**: Decisions documented in ADRs
- **Scalable**: Phases can be parallelized

## When NOT to Use

Skip lead-developer for simple tasks:

- **Typo fixes**: Just edit the file directly
- **Documentation-only**: Use docs-manager skill
- **Simple test addition**: Use qa-testing skill
- **Small bug fix** (no architecture change): Use senior-developer skill

## Skill Interaction

```
┌─────────────────┐
│  lead-developer │  ← You invoke this
└────────┬────────┘
         │
         ├─→ software-architect (design, ADRs)
         ├─→ senior-developer (implementation)
         ├─→ qa-testing (tests, coverage)
         ├─→ security-reviewer (audits)
         └─→ docs-manager (documentation)
```

## Tips

1. **Be specific**: The more context you provide, the better the plan
2. **Trust the process**: Let the lead-developer coordinate specialists
3. **Review ADRs**: Architecture decisions will be presented for approval
4. **Expect thoroughness**: Quality gates ensure completeness

## Example Invocations

```bash
# Full feature implementation
/lead-developer implement GraphQL subscriptions with WebSocket transport, full tests, and security review

# Refactor with architecture
/lead-developer refactor store module to use Proxy-based reactivity with ADR

# Security-sensitive feature
/lead-developer add HTML sanitization to el() with security audit and XSS tests

# Cross-cutting change
/lead-developer add TypeScript support across compiler, runtime, and build tools with full migration guide
```

## Success Metrics

A well-executed task via lead-developer will have:

- 📐 **Clear architecture**: ADR documents design decisions
- 💻 **Clean code**: Follows Pulse conventions
- ✅ **High coverage**: ≥90% test coverage
- 🔒 **Secure**: No vulnerabilities introduced
- 📚 **Well-documented**: API docs, examples, migration guides
- 🚀 **Performant**: No regressions
- ♿ **Accessible**: A11y standards maintained

---

**Remember**: The lead-developer skill is your project manager, architect, and quality gatekeeper rolled into one. Use it for any task where you want end-to-end excellence with minimal coordination overhead.
