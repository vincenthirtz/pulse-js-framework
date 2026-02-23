# Lead Developer Skill - Quick Start

Get started with the lead-developer skill in 2 minutes.

## What is this?

The **lead-developer skill** is your all-in-one solution for complex tasks in the Pulse framework. It handles:

- ✅ Architecture & design (ADRs)
- ✅ Implementation (production code)
- ✅ Testing (≥90% coverage)
- ✅ Security review
- ✅ Documentation

## Installation

The skill is already installed in `skills/lead-developer/`. No setup needed!

## Basic Usage

### Via Slash Command

```bash
/lead-developer [your task description]
```

### Via Skill Tool

```javascript
Skill: "lead-developer"
Args: "your task description"
```

## Quick Examples

### Example 1: New Feature

```bash
/lead-developer add WebSocket heartbeat with auto-reconnect
```

**What happens:**
1. Analyzes requirements
2. Creates ADR for design
3. Implements in `runtime/websocket.js`
4. Writes comprehensive tests
5. Updates documentation
6. ✅ Done!

---

### Example 2: Bug Fix

```bash
/lead-developer fix memory leak in list() when removing items
```

**What happens:**
1. Analyzes root cause
2. Reviews architecture implications
3. Implements fix
4. Adds regression tests
5. ✅ Done!

---

### Example 3: Security Feature

```bash
/lead-developer add HTML sanitization with XSS protection
```

**What happens:**
1. Security design review
2. Creates secure implementation
3. Audits for vulnerabilities
4. Adds security tests
5. Documents security best practices
6. ✅ Done!

---

## When to Use

### ✅ Use lead-developer for:

- Complete features (architecture + code + tests + docs)
- Security-sensitive changes
- Major refactors
- Performance optimizations
- Tasks affecting multiple modules
- Anything requiring quality gates

### ❌ Don't use for:

- Typo fixes (just edit the file)
- Simple documentation updates
- Trivial one-line changes

## Quality Guarantees

Every task completed by lead-developer includes:

| Guarantee | Description |
|-----------|-------------|
| **Architecture** | Design documented in ADR |
| **Code Quality** | Follows CLAUDE.md conventions |
| **Test Coverage** | ≥90% coverage with edge cases |
| **Security** | No vulnerabilities introduced |
| **Documentation** | API docs + examples updated |
| **Integration** | No regressions |

## Advanced Usage

### With Custom Requirements

```bash
/lead-developer add GraphQL subscriptions with:
- WebSocket transport
- Auto-reconnect with exponential backoff
- Subscription lifecycle hooks
- Full test coverage
- Security review for authentication
```

### With Constraints

```bash
/lead-developer refactor router to use RouteTrie while:
- Maintaining backward compatibility
- Providing migration guide
- Ensuring no performance regression
```

## Workflow

```
User Request
    ↓
Analysis & Planning
    ↓
Architecture Design (ADR)
    ↓
Implementation
    ↓
Testing (≥90% coverage)
    ↓
Security Review (if needed)
    ↓
Documentation
    ↓
Final Validation
    ↓
✅ Done!
```

## Tips for Best Results

### 1. Be Specific

**❌ Bad:**
```
/lead-developer improve the router
```

**✅ Good:**
```
/lead-developer optimize router path matching using RouteTrie for O(k) lookup where k is path segments
```

---

### 2. Mention Constraints

**✅ Good:**
```
/lead-developer add caching while maintaining backward compatibility and thread safety
```

---

### 3. Specify Quality Needs

**✅ Good:**
```
/lead-developer implement feature X with security review and comprehensive edge case tests
```

## Current Mode

The skill is currently running in **autonomous mode**, meaning it performs all phases itself.

**Future:** When specialized skills (software-architect, senior-developer, qa-testing, etc.) are added to `skills/`, the lead-developer will automatically delegate to them for expert-level work in each domain.

## Troubleshooting

### "Task too small"
- For simple changes, just edit the file directly
- Use lead-developer for multi-phase tasks

### "Need more control"
- Be specific in your request
- Mention exact requirements and constraints

### "Breaking changes?"
- Lead-developer will ask for approval before breaking changes
- Migration guides are auto-generated

## Examples Directory

See [examples.md](./examples.md) for detailed real-world scenarios.

## Validation

Verify the skill is working correctly:

```bash
node skills/lead-developer/validate.js
```

Should output: `✓ All checks passed!`

---

## Next Steps

1. Try a simple task: `/lead-developer add a new utility function to runtime/utils.js`
2. Review the output and quality gates
3. Check generated tests and documentation
4. Try a more complex feature!

**Ready to build production-quality code with minimal effort?** Just invoke the skill and let it handle the rest! 🚀
