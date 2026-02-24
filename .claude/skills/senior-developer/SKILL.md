---
name: senior-developer
description: Senior developer agent for the Pulse JS framework. Use this skill to implement features, fix bugs, write production code, and refactor modules. Strictly follows the software architect's decisions (ADRs, design principles, API conventions). Handles runtime modules, compiler code, CLI commands, and build tool integrations with emphasis on code quality, performance, and framework consistency.
---

# Senior Developer for Pulse Framework

## When to Use This Skill

- Implementing a new feature or module designed by the architect
- Fixing bugs in runtime, compiler, CLI, or loader code
- Refactoring existing code while preserving API contracts
- Adding or modifying public API functions
- Implementing reactive state, DOM helpers, or hooks
- Writing compiler transformations (lexer/parser/transformer)
- Adding CLI commands or subcommands
- Creating build tool integrations (Vite, Webpack, Rollup, etc.)
- Performance optimization of existing modules
- Resolving merge conflicts or integration issues

## Context Loading

Before implementing, load the relevant context file from `.claude/context/`. See CLAUDE.md 'Context Files' table for the mapping.

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | Coding standards rules, component/module templates |
| **scripts/** | Convention checker, module scaffolder |
| **references/** | Implementation patterns, code conventions, debugging guide |

## Architect Compliance: Mandatory Rules

**Every line of code MUST respect the architect's decisions.** Before implementing, verify:

### Layer Boundaries (NEVER violate)

| Layer | Allowed Imports | Forbidden |
|-------|----------------|-----------|
| `runtime/` | Other `runtime/` files only | `cli/`, `compiler/`, `loader/`, Node.js built-ins |
| `compiler/` | `compiler/` + `runtime/errors.js` | Other `runtime/`, `cli/`, `loader/` |
| `cli/` | `compiler/`, `cli/`, Node.js built-ins | `runtime/` for CLI logic |
| `loader/` | `compiler/` + build tool APIs | `runtime/`, `cli/` |

### API Naming (ALWAYS follow)

| Pattern | Convention | Example |
|---------|-----------|---------|
| Factories | `create + Thing` | `createRouter()`, `createStore()` |
| Hooks | `use + Capability` | `useAsync()`, `useForm()` |
| Toggles | `enable/disable + Feature` | `enableDevTools()`, `disableAutoTimeline()` |
| Config | `configure + Module` | `configureA11y()`, `configureDom()` |

### Return Patterns (ALWAYS follow)

```javascript
// Hooks → reactive object with Pulse instances
function useAsync(fn) {
  return { data: pulse(null), loading: pulse(false), error: pulse(null), execute, abort, reset };
}

// Subscriptions → disposer function
function effect(fn) { return dispose; }

// Factories → instance with reactive state + methods
function createRouter(config) {
  return { path: pulse('/'), params: pulse({}), navigate(path) {}, beforeEach(guard) {} };
}

// Components → DOM node(s)
function Counter() { return el('.counter', [el('h1', () => `Count: ${count.get()}`)]); }
```

### Error Handling (ALWAYS follow)

```javascript
// NEVER: throw new Error('something broke');
// ALWAYS: use structured Pulse errors
import { Errors, RuntimeError } from 'pulse-js-framework/runtime/errors';
throw Errors.mountNotFound('#app');                          // Pre-built
throw new RuntimeError('Issue', { code: 'ERR', context: 'While X', suggestion: 'Try Y' }); // Structured
```

### Module Structure (ALWAYS follow)

```javascript
/** ModuleName - Pulse Framework. @module runtime/module-name */
import { pulse, effect, computed, batch } from './pulse.js';

// ============================================================
// Constants & Configuration
// ============================================================
const DEFAULT_OPTIONS = {};

// ============================================================
// Internal Helpers (not exported)
// ============================================================
function _internalHelper() {}

// ============================================================
// Core Implementation
// ============================================================
export function createThing(options = {}) { const config = { ...DEFAULT_OPTIONS, ...options }; }
export function useThing(config = {}) {}
```

## Quick Reference: Writing Code by Module Type

| Module Type | DO | DON'T |
|-------------|-----|-------|
| **Runtime** | Use `getAdapter()` for DOM, `pulse()` for reactive state, feature-detect browser APIs | Use `document` at module scope, `let state = val` for UI state, import Node.js built-ins |
| **Compiler** | Pure functions (AST in → JS string out), `ParserError` with `line`/`column`/`suggestion` | Import `runtime/` modules (except `errors.js`) |
| **CLI** | Use Node.js built-ins, `process.exit(0/1)`, clear `console.log` output | Import runtime modules for CLI logic |
| **Loader** | Use build tool's transform hook, emit CSS separately, support HMR | Bypass build tool APIs directly |

## Implementation Workflow

1. **Read the ADR** - Check `docs/adr/` for relevant Architecture Decision Records before writing any code.
2. **Check existing patterns** - Study the closest similar module (see Key Files table below).
3. **Run convention check** - `node .claude/skills/senior-developer/scripts/check-conventions.js runtime/new-module.js`
4. **Scaffold from template** - `node .claude/skills/senior-developer/scripts/scaffold-module.js runtime/my-module.js`
5. **Verify compliance** - Run conventions check + architecture check + related tests before submitting.

## Available Scripts

```bash
# Check code against project conventions
node .claude/skills/senior-developer/scripts/check-conventions.js
node .claude/skills/senior-developer/scripts/check-conventions.js runtime/http.js
node .claude/skills/senior-developer/scripts/check-conventions.js --fix  # Show fix suggestions

# Scaffold a new module from template
node .claude/skills/senior-developer/scripts/scaffold-module.js runtime/my-feature.js
node .claude/skills/senior-developer/scripts/scaffold-module.js MyComponent --type component
```

## Code Quality Checklist

- [ ] Follows architect's decisions (checked ADR, used prescribed patterns)
- [ ] Named correctly: `create*`, `use*`, `enable*`, `configure*`
- [ ] Options as last param: `fn(required, { optional })` with defaults
- [ ] Returns disposer: effects/subscriptions/event listeners return cleanup `() => void`
- [ ] Reactive state uses `pulse()`, not plain variables for state that drives UI
- [ ] No raw `Error` throws - uses `PulseError` subclasses with `context` + `suggestion`
- [ ] No Node.js APIs in `runtime/` (`fs`, `path`, `process`)
- [ ] Uses `getAdapter()` - no direct `document`/`window` at module scope
- [ ] Tree-shakeable - named exports only, no module-level side effects
- [ ] Private fields use `#privateField` syntax
- [ ] ES Modules - `import`/`export`, not `require`/`module.exports`
- [ ] Secure by default - user input sanitized, `dangerous*` prefix for unsafe APIs
- [ ] Accessible - ARIA attributes, keyboard handling, screen reader support
- [ ] Tested - at minimum: happy path + error path + edge case
- [ ] No over-engineering - simplest solution that works, no speculative abstractions

## Key Files to Study

| Pattern | Study This File | For |
|---------|----------------|-----|
| Reactive hook | `runtime/async.js` | `useAsync`, `useResource`, `usePolling` |
| Factory + instance | `runtime/http.js` | `createHttp`, interceptors, child instances |
| DOM helper | `runtime/dom.js` | `el()`, `list()`, `when()`, reactive bindings |
| Compiler stage | `compiler/lexer.js` | Token types, scanning, error reporting |
| CLI command | `cli/index.js` | Argument parsing, command dispatch |
| Build integration | `loader/vite-plugin.js` | HMR, CSS extraction, transform hook |
| State management | `runtime/store.js` | `createStore`, plugins, persistence |
| Error handling | `runtime/errors.js` | Error classes, `formatWithSnippet()` |
| Security boundary | `runtime/utils.js` | Sanitization functions, XSS prevention |

## Quick Troubleshooting

| Problem | Cause | Solution |
|---------|-------|---------|
| Effect runs too many times | Missing `batch()` for multiple updates | Wrap related `set()` calls in `batch(() => { })` |
| UI doesn't update | State not wrapped in `pulse()` | Replace `let x = val` with `const x = pulse(val)` |
| Memory leak | Missing cleanup in effect | Return cleanup function from `effect(() => { return () => cleanup(); })` |
| SSR crashes | Direct `document` access | Use `getAdapter()` or `typeof window !== 'undefined'` check |
| Import error in browser | Node.js API in runtime | Move to CLI layer or use dynamic import with feature detection |
| `Cannot set computed` | Calling `.set()` on computed | Use `pulse()` for writable state, `computed()` is read-only |
| Circular dependency | Modules import each other | Extract shared code into a third module |
| Tests pollute each other | Shared reactive state | Use `createContext()` + `ctx.reset()` per test |
| Effect cleanup not running | Not returning function from effect | `effect(() => { ...; return () => cleanup(); })` |
| List re-renders entirely | Missing key function in `list()` | Add `(item) => item.id` as third arg to `list()` |
