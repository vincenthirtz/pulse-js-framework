# Pulse Framework Skills

Specialized AI agents for developing the Pulse JS framework. Each skill is optimized for a specific domain of expertise.

## Available Skills

### 🎯 [lead-developer](./lead-developer/) **(ORCHESTRATOR)**

**The coordinator** - Manages complex tasks end-to-end by delegating to specialized skills.

**Use when:**
- Building complete features (architecture + implementation + tests + docs)
- Major refactors with architectural implications
- Security-sensitive features requiring design + audit
- Tasks spanning multiple modules
- You want comprehensive quality gates enforced

**Invocation:**
```bash
/lead-developer implement feature X with full tests and security review
```

**Delegates to:** All skills below as needed

**Quality guarantees:**
- ✅ Architecture (ADRs)
- ✅ Clean code (CLAUDE.md conventions)
- ✅ Tests (≥90% coverage)
- ✅ Security (no vulnerabilities)
- ✅ Documentation (API + examples)
- ✅ No regressions

---

### 🏛️ [software-architect](./software-architect/)

**The designer** - Defines architecture, creates ADRs, evaluates trade-offs.

**Expertise:**
- Architecture Decision Records (ADRs)
- Design patterns and SOLID principles
- Module dependency analysis
- API surface design
- Trade-off evaluation

**Invocation:**
```bash
/software-architect design new GraphQL subscription system
```

---

### 💻 [senior-developer](./senior-developer/)

**The implementer** - Writes production code following architectural decisions.

**Expertise:**
- Production code implementation
- Bug fixes with root cause analysis
- Code refactoring
- Performance optimization
- Framework consistency

**Invocation:**
```bash
/senior-developer implement WebSocket heartbeat from ADR-042
```

---

### ✅ [qa-testing](./qa-testing/)

**The quality guardian** - Writes tests, analyzes coverage, debugs failures.

**Expertise:**
- Unit and integration tests
- Coverage analysis (target: ≥90%)
- Edge case testing
- Test debugging
- Mocking strategies

**Invocation:**
```bash
/qa-testing add comprehensive tests for runtime/websocket.js
```

---

### 🔒 [security-reviewer](./security-reviewer/)

**The security expert** - Audits code for vulnerabilities, reviews security implications.

**Expertise:**
- OWASP Top 10 vulnerabilities
- XSS and injection prevention
- Authentication/authorization review
- Secure coding patterns
- Vulnerability scanning

**Invocation:**
```bash
/security-reviewer audit runtime/utils.js for XSS vulnerabilities
```

---

### 📚 [docs-manager](./docs-manager/)

**The documentarian** - Maintains documentation consistency and quality.

**Expertise:**
- API documentation
- Example code
- Documentation consistency
- Migration guides
- CLAUDE.md updates

**Invocation:**
```bash
/docs-manager update CLAUDE.md with new WebSocket API
```

---

## Quick Decision Guide

| Task Type | Recommended Skill |
|-----------|-------------------|
| **Complete feature** | lead-developer |
| **Architecture decision** | software-architect |
| **Bug fix (simple)** | senior-developer |
| **Bug fix (complex)** | lead-developer |
| **Add tests** | qa-testing |
| **Security audit** | security-reviewer |
| **Refactor (small)** | senior-developer |
| **Refactor (major)** | lead-developer |
| **Update docs** | docs-manager |
| **Performance optimization** | lead-developer |

## Skill Coordination

### Option 1: Use lead-developer (Recommended)

Let the lead-developer orchestrate everything:

```bash
/lead-developer add WebSocket heartbeat with full tests and docs
```

**Benefits:**
- ✅ Automatic delegation to experts
- ✅ All quality gates enforced
- ✅ Comprehensive output
- ✅ Less coordination overhead

---

### Option 2: Manual Delegation

Invoke skills individually for focused control:

```bash
# Step 1: Design
/software-architect design heartbeat mechanism

# Step 2: Implement
/senior-developer implement from ADR-XXX

# Step 3: Test
/qa-testing add tests for heartbeat

# Step 4: Document
/docs-manager update WebSocket docs
```

**Benefits:**
- ✅ More control over each phase
- ✅ Can review between steps
- ✅ Focused expertise

---

## Workflow Examples

### Example 1: New Feature

**Task:** Add WebSocket auto-reconnect

**With lead-developer:**
```bash
/lead-developer add WebSocket auto-reconnect with exponential backoff
```

Auto-delegates to:
1. software-architect → Design + ADR
2. senior-developer → Implementation
3. qa-testing → Tests (≥90%)
4. docs-manager → Documentation

---

### Example 2: Security Feature

**Task:** Add HTML sanitization

**With lead-developer:**
```bash
/lead-developer add HTML sanitization with XSS protection
```

Auto-delegates to:
1. security-reviewer → Design review
2. software-architect → ADR
3. senior-developer → Implementation
4. security-reviewer → Code audit
5. qa-testing → Security tests
6. docs-manager → Security docs

---

### Example 3: Simple Fix

**Task:** Fix typo in error message

**Direct approach:**
```bash
# Just edit the file - no skill needed
```

Or if you want validation:
```bash
/senior-developer fix typo in ReactivityError
```

---

## Quality Standards

All skills enforce:

- ✅ **Code Quality** - CLAUDE.md conventions
- ✅ **Test Coverage** - ≥90% for runtime modules
- ✅ **Documentation** - API docs + examples
- ✅ **Security** - No vulnerabilities
- ✅ **Architecture** - ADRs followed
- ✅ **Accessibility** - A11y standards maintained
- ✅ **Performance** - No regressions

## Tips for Best Results

### 1. Be Specific

**❌ Bad:** "improve the router"
**✅ Good:** "optimize router path matching using RouteTrie for O(k) lookup"

### 2. Mention Constraints

**✅ Good:** "add caching while maintaining backward compatibility"

### 3. Specify Quality Needs

**✅ Good:** "implement X with security review and edge case tests"

### 4. Reference Context

**✅ Good:** "following ADR-042" or "similar to HTTP client pattern"

## Skill Architecture

```
lead-developer (Orchestrator)
    ├── software-architect (Architecture & ADRs)
    ├── senior-developer (Implementation)
    ├── qa-testing (Testing & Quality)
    ├── security-reviewer (Security)
    └── docs-manager (Documentation)
```

## Validation

Each skill has a validation script. For lead-developer:

```bash
node .claude/skills/lead-developer/validate.js
```

Should output: `✓ All checks passed!`

## Adding New Skills

To add a new skill:

1. Create directory: `.claude/skills/your-skill/`
2. Add `skill.json` with metadata
3. Add `instructions.md` with agent instructions
4. Add `README.md` with usage guide
5. Update this file with your skill
6. Update lead-developer's `delegatesTo` array (if applicable)

See existing skills for examples.

## Support

- **lead-developer** - [README](./lead-developer/README.md) | [Examples](./lead-developer/examples.md) | [Capabilities](./lead-developer/CAPABILITIES.md)
- **software-architect** - See `.claude/skills/software-architect/`
- **senior-developer** - See `.claude/skills/senior-developer/`
- **qa-testing** - See `.claude/skills/qa-testing/`
- **security-reviewer** - See `.claude/skills/security-reviewer/`
- **docs-manager** - See `.claude/skills/docs-manager/`

---

**Default recommendation:** Use **lead-developer** for any non-trivial task. It will delegate to specialists and ensure quality gates. For simple, focused tasks, invoke the appropriate specialist directly.
