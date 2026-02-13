# Lead Developer Skill - Capabilities Reference

Complete reference of what the lead-developer skill can do.

## Core Capabilities

### 1. Architecture & Design

**What it does:**
- Creates Architecture Decision Records (ADRs)
- Evaluates design patterns and trade-offs
- Plans module structure and dependencies
- Considers backward compatibility
- Reviews API surface design

**When used:**
- New modules
- Major refactors
- API changes
- Design pattern introductions

**Output:**
- ADR documents in standard format
- Design rationale
- Trade-off analysis
- Migration plans (if breaking)

---

### 2. Implementation

**What it does:**
- Writes production-quality code
- Follows Pulse coding conventions
- Implements from architectural designs
- Fixes bugs with root cause analysis
- Refactors existing code

**Code quality standards:**
- ✅ Follows CLAUDE.md conventions
- ✅ ES Modules (import/export)
- ✅ Private fields (#field syntax)
- ✅ Named exports for APIs
- ✅ camelCase/PascalCase
- ✅ Zero external dependencies

**Output:**
- Clean, maintainable code
- Proper error handling
- Performance-optimized where needed

---

### 3. Testing

**What it does:**
- Writes comprehensive test suites
- Achieves ≥90% code coverage
- Tests edge cases and error paths
- Creates integration tests
- Adds regression tests for bug fixes
- Uses Node.js built-in test runner

**Coverage targets:**
- Runtime modules: ≥90%
- Compiler: ≥85%
- CLI tools: ≥80%

**Test types:**
- Unit tests
- Integration tests
- Edge case tests
- Security tests (for sensitive features)
- Performance tests (for optimizations)

**Output:**
- Test files in `test/` directory
- Coverage reports
- Test documentation

---

### 4. Security Review

**What it does:**
- Reviews code for vulnerabilities
- Checks OWASP Top 10 risks
- Validates input sanitization
- Reviews authentication/authorization
- Audits data handling
- Tests for XSS, injection, etc.

**Security checklist:**
- ✅ User input validation
- ✅ XSS prevention
- ✅ SQL/NoSQL injection prevention
- ✅ CSRF protection
- ✅ Secure defaults
- ✅ No hardcoded secrets

**Output:**
- Security audit report
- Vulnerability findings (if any)
- Remediation recommendations
- Security test cases

---

### 5. Documentation

**What it does:**
- Updates CLAUDE.md API reference
- Creates code examples
- Writes usage guides
- Generates migration guides (breaking changes)
- Maintains consistency across docs

**Documentation types:**
- API reference
- Usage examples
- Migration guides
- Architectural decisions (ADRs)
- Inline code comments (where needed)

**Output:**
- Updated CLAUDE.md
- Example code in `examples/`
- README updates
- Migration guides (if needed)

---

## Workflow Phases

### Phase 1: Analysis
```
Input: User request
Process:
  - Parse requirements
  - Identify scope and complexity
  - Determine phases needed
  - Identify quality gates
  - Check for architectural implications
Output: Execution plan
```

### Phase 2: Architecture (if needed)
```
Input: Requirements + existing architecture
Process:
  - Design solution
  - Evaluate trade-offs
  - Plan API surface
  - Consider backward compatibility
  - Create ADR
Output: ADR document + design plan
```

### Phase 3: Implementation
```
Input: Design (ADR) or bug description
Process:
  - Write production code
  - Follow conventions
  - Handle errors
  - Optimize where needed
Output: Working code in appropriate files
```

### Phase 4: Testing
```
Input: Implemented code
Process:
  - Write test suite
  - Cover edge cases
  - Achieve ≥90% coverage
  - Add regression tests (bugs)
  - Performance tests (optimizations)
Output: Test files + coverage report
```

### Phase 5: Security (if applicable)
```
Input: Implemented code
Process:
  - Security audit
  - Vulnerability scan
  - Attack vector testing
  - Remediation (if needed)
Output: Security report + fixes
```

### Phase 6: Documentation
```
Input: Complete implementation
Process:
  - Update API docs
  - Create examples
  - Write migration guides (if needed)
  - Ensure consistency
Output: Updated documentation
```

### Phase 7: Validation
```
Input: All phases complete
Process:
  - Run full test suite
  - Check coverage
  - Verify no regressions
  - Validate integration
  - Final code review
Output: ✅ Task complete or ❌ Issues found
```

---

## Quality Gates

Every task goes through these gates:

| Gate | Criteria | Enforced |
|------|----------|----------|
| **Architecture** | ADR created (if architectural), Design is sound | ✅ Always |
| **Code Quality** | Follows CLAUDE.md conventions, No code smells | ✅ Always |
| **Testing** | Coverage ≥90%, Edge cases covered | ✅ Always |
| **Security** | No vulnerabilities, OWASP compliant | ✅ When applicable |
| **Documentation** | API docs updated, Examples provided | ✅ Always |
| **Integration** | No breaking changes or migration guide provided | ✅ Always |
| **Performance** | No regressions, Benchmarks (if optimization) | ✅ When applicable |
| **Accessibility** | A11y standards maintained | ✅ For UI features |

---

## Task Types Handled

### ✅ New Features
- Complete implementation from design to docs
- All quality gates enforced
- Examples: WebSocket subscriptions, GraphQL client, SSR

### ✅ Bug Fixes
- Root cause analysis
- Fix implementation
- Regression tests
- Examples: Memory leaks, race conditions, error handling

### ✅ Refactoring
- Architecture review
- Incremental refactoring
- Backward compatibility
- Examples: Router RouteTrie, Proxy-based store

### ✅ Performance Optimizations
- Benchmarking
- Implementation
- Performance tests
- Examples: LRU cache, LIS algorithm for lists

### ✅ Security Enhancements
- Security design
- Implementation
- Security audit
- Security tests
- Examples: HTML sanitization, CSRF tokens

### ✅ API Additions
- API design
- Implementation
- Tests
- Documentation
- Examples: New hooks, new directives

### ✅ Documentation Updates
- API reference
- Examples
- Guides
- Consistency fixes

---

## Integration Points

### Reads From
- `CLAUDE.md` - Project conventions and API reference
- `memory/MEMORY.md` - Project history and patterns
- `adr/` - Previous architectural decisions (if exists)
- `test/` - Existing tests for patterns
- `examples/` - Existing examples for consistency

### Writes To
- `runtime/` - Runtime modules
- `compiler/` - Compiler modules
- `cli/` - CLI tools
- `test/` - Test files
- `examples/` - Example apps
- `CLAUDE.md` - Documentation updates
- `adr/` - New ADRs (if directory exists)

---

## Limitations

### What it CANNOT do:
- ❌ Access external APIs directly (without user code)
- ❌ Modify user's project files outside the framework
- ❌ Make irreversible decisions without user approval (breaking changes)
- ❌ Skip quality gates (always enforced)
- ❌ Generate low-quality code to save time

### What it WILL NOT do:
- Won't add external dependencies (Pulse is zero-dependency)
- Won't skip tests to save time
- Won't skip documentation
- Won't introduce security vulnerabilities
- Won't break backward compatibility without migration guide

---

## Success Metrics

A successfully completed task has:

- ✅ **ADR created** (if architectural)
- ✅ **Code written** and follows conventions
- ✅ **Tests passing** with ≥90% coverage
- ✅ **Security validated** (no vulnerabilities)
- ✅ **Documentation updated** (API + examples)
- ✅ **No regressions** (all existing tests pass)
- ✅ **Integration validated** (works with other modules)

---

## Expertise Areas

The lead-developer skill has deep knowledge in:

### Pulse Framework Internals
- Reactivity system (Pulse class, effects, computed)
- DOM manipulation and reactive bindings
- Router architecture (RouteTrie, lazy loading)
- Store patterns (modules, plugins, persistence)
- Form handling (validation, async validators)
- HTTP/WebSocket/GraphQL clients
- Accessibility (a11y helpers, auto-ARIA)
- SSR (rendering, hydration, streaming)

### Development Practices
- Architecture patterns (ADRs, SOLID, DRY)
- Test-driven development
- Security best practices (OWASP Top 10)
- Performance optimization
- API design
- Documentation standards

### Technologies
- Modern JavaScript (ES2023+)
- Node.js built-in modules
- Web APIs (DOM, Fetch, WebSocket)
- CSS preprocessors (SASS, LESS, Stylus)
- Build tools (Vite, Webpack, Rollup)

---

## Configuration

Currently runs in **autonomous mode** (all phases handled internally).

**Future modes:**
- **Delegation mode** - When specialized skills are added, delegate to:
  - software-architect (architecture)
  - senior-developer (implementation)
  - qa-testing (testing)
  - security-reviewer (security)
  - docs-manager (documentation)

**Mode auto-detection:** Checks `skills/` directory for specialized skills.

---

## Performance

**Typical task completion times** (estimates):

| Task Type | Time | Phases |
|-----------|------|--------|
| Simple bug fix | 5-10 min | Analysis → Implementation → Tests |
| New utility function | 10-15 min | Analysis → Implementation → Tests → Docs |
| New module | 30-60 min | Analysis → Architecture → Implementation → Tests → Docs |
| Major refactor | 60-120 min | Analysis → Architecture → Approval → Incremental Implementation → Tests → Migration Guide |
| Security feature | 45-90 min | Analysis → Security Design → Implementation → Security Audit → Tests → Docs |

**Note:** Times are for the skill's work. User review/approval not included.

---

## Best Practices

### For Users

1. **Be specific** - Detailed requests get better results
2. **Mention constraints** - Backward compatibility, performance, etc.
3. **Specify quality needs** - "with security review", "with benchmarks"
4. **Review ADRs** - Approve architectural decisions
5. **Trust the process** - Quality gates ensure completeness

### For the Skill

1. **Always follow quality gates** - No shortcuts
2. **Document decisions** - ADRs for architecture
3. **Test thoroughly** - Edge cases, not just happy path
4. **Maintain consistency** - Follow existing patterns
5. **Communicate clearly** - Progress updates, blockers

---

## Support

For issues or questions:
- Check [README.md](./README.md) for overview
- See [QUICKSTART.md](./QUICKSTART.md) for examples
- Review [examples.md](./examples.md) for detailed scenarios
- Run validation: `node skills/lead-developer/validate.js`

---

**Summary:** The lead-developer skill is a comprehensive solution for building production-quality features with architecture, implementation, testing, security, and documentation—all handled end-to-end with enforced quality gates.
