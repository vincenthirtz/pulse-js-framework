---
name: software-architect
description: Software architecture agent for the Pulse JS framework. Use this skill to define global architecture, choose design patterns and technologies, create Architecture Decision Records (ADRs), analyze module dependencies, evaluate trade-offs, plan new modules or major refactors, and enforce architectural constraints. Covers layered architecture, SOLID principles, and SPA framework design.
---

# Software Architect for Pulse Framework

## When to Use This Skill

- Defining the global architecture for a new module or subsystem
- Choosing design patterns (Observer, Strategy, Factory, Proxy, etc.)
- Evaluating technology choices and trade-offs
- Creating Architecture Decision Records (ADRs)
- Analyzing module dependencies and detecting coupling issues
- Planning major refactors or breaking changes
- Reviewing code for architectural consistency
- Designing public APIs for new runtime modules
- Evaluating bundle size impact of new features
- Enforcing separation of concerns across layers (runtime, compiler, CLI)

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | ADR template, module template for new runtime modules |
| **scripts/** | Architecture analyzer, ADR generator |
| **references/** | Architecture patterns, technology decisions, design principles |

## Pulse Architecture Overview

Pulse follows a **layered zero-dependency architecture** with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  cli/index.js, dev.js, build.js, lint.js, format.js, ...    │
│  (Node.js only - dev tooling, not shipped to browser)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
┌──────────────────────────▼──────────────────────────────────┐
│                     Compiler Layer                            │
│  compiler/lexer.js → parser.js → transformer.js              │
│  compiler/preprocessor.js, sourcemap.js                      │
│  (Build-time - .pulse DSL to JavaScript)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ generates code using
┌──────────────────────────▼──────────────────────────────────┐
│                     Runtime Layer                             │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ Core        │  │ UI         │  │ Infrastructure       │  │
│  │ pulse.js    │  │ dom.js     │  │ http.js              │  │
│  │ (signals)   │  │ router.js  │  │ websocket.js         │  │
│  │             │  │ form.js    │  │ graphql.js           │  │
│  │             │  │ a11y.js    │  │ async.js             │  │
│  └──────┬──────┘  └──────┬─────┘  └──────────┬───────────┘  │
│         │                │                    │              │
│  ┌──────▼────────────────▼────────────────────▼───────────┐  │
│  │ Shared: store.js, context.js, errors.js, utils.js,     │  │
│  │         logger.js, lru-cache.js, dom-adapter.js         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Loader Layer                               │
│  vite-plugin.js, webpack-loader.js, rollup-plugin.js, ...    │
│  (Build tool integrations - bridge between build and runtime) │
└─────────────────────────────────────────────────────────────┘
```

### Layer Rules

| Rule | Description |
|------|-------------|
| **No upward dependencies** | Runtime MUST NOT import from compiler/CLI/loader |
| **No cross-layer coupling** | CLI imports compiler, never runtime internals |
| **Zero external deps** | Runtime has zero npm dependencies |
| **Optional peer deps** | Preprocessors (sass, less, stylus) are optional |
| **Browser-safe runtime** | Runtime modules must work in browser and Node.js |
| **Node-only CLI** | CLI can use Node.js built-ins (fs, path, etc.) |
| **Adapter pattern for DOM** | Runtime uses `dom-adapter.js` abstraction for SSR/testing |

## Core Design Patterns in Use

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Observer (Signals)** | `pulse.js` | Reactive state propagation |
| **Proxy** | `pulse.js` (`createState`) | Transparent reactive objects |
| **Command** | `store.js` (actions) | Encapsulated state mutations |
| **Strategy** | `preprocessor.js` | Swappable SASS/LESS/Stylus compilation |
| **Factory** | `dom.js` (`el()`) | Declarative DOM element creation |
| **Adapter** | `dom-adapter.js` | Abstract DOM for SSR/testing |
| **Interceptor** | `http.js`, `websocket.js`, `graphql.js` | Request/response transformation |
| **Middleware** | `router.js` | Koa-style routing pipeline |
| **Provider** | `context.js` | Dependency injection / prop drilling prevention |
| **SWR** | `async.js`, `http.js`, `graphql.js` | Stale-while-revalidate caching |
| **Builder** | `compiler/transformer.js` | AST to JavaScript code generation |
| **Visitor** | `cli/lint.js` (SemanticAnalyzer) | AST traversal for validation |
| **LRU Cache** | `lru-cache.js`, `dom-selector.js` | Bounded memory caching |

## API Design Conventions

When designing new Pulse APIs, follow these conventions:

### Naming

```javascript
// Functions: verb + noun (camelCase)
createRouter()      // Factory: create + Thing
useAsync()          // Hook: use + Capability
enableDevTools()    // Toggle: enable/disable + Feature
configureA11y()     // Config: configure + Module

// Options object as last param
useAsync(fetcher, { immediate: true, retries: 3 });

// Return disposer/cleanup from subscriptions
const dispose = effect(() => { ... });
const unsubscribe = store.$subscribe(handler);
const release = trapFocus(element);
```

### Return Shape

```javascript
// Hooks return reactive object
const { data, loading, error, execute } = useAsync(fn);
//       ^Pulse  ^Pulse   ^Pulse  ^Function

// Factories return instance with methods
const router = createRouter({ routes });
router.navigate('/path');
router.path.get();          // Reactive state as Pulse
router.beforeEach(guard);   // Register callbacks

// Components return DOM nodes
const App = () => el('.app', [...children]);
```

### Error Handling

```javascript
// Use structured errors from runtime/errors.js
throw Errors.routeNotFound('/unknown');
throw Errors.computedSet('doubled');

// Custom errors extend PulseError hierarchy
class CustomError extends RuntimeError {
  constructor(message, options) {
    super(message, { code: 'CUSTOM', ...options });
  }
}
```

## Available Scripts

```bash
# Analyze architecture: dependency graph, layer violations, coupling metrics
node .claude/skills/software-architect/scripts/analyze-architecture.js

# Analyze a specific module
node .claude/skills/software-architect/scripts/analyze-architecture.js runtime/pulse.js

# Generate Architecture Decision Record
node .claude/skills/software-architect/scripts/generate-adr.js "Use LRU cache for selector parsing"

# Generate ADR with specific status
node .claude/skills/software-architect/scripts/generate-adr.js "Adopt Stylus support" --status accepted
```

## Architecture Review Checklist

When reviewing architectural decisions, verify:

- [ ] **Layer boundaries respected** - No upward imports (runtime from CLI, etc.)
- [ ] **Zero dependencies** - No new npm dependencies in runtime
- [ ] **Browser compatibility** - Runtime works without Node.js APIs
- [ ] **SSR compatible** - New DOM code uses `dom-adapter.js` abstraction
- [ ] **API consistency** - Follows `create*`, `use*`, `enable*` naming
- [ ] **Return disposers** - Subscriptions/effects return cleanup functions
- [ ] **Reactive state as Pulse** - State exposed as `Pulse` instances, not plain values
- [ ] **Options as last param** - Configuration passed as options object
- [ ] **Error hierarchy** - Uses `PulseError` subclasses, not raw `Error`
- [ ] **Tree-shakeable** - Named exports, no side-effect imports
- [ ] **Testable** - Can be tested with `MockDOMAdapter` without browser
- [ ] **Bundle size considered** - Lite build (`lite.js`) not bloated by new code
- [ ] **Accessibility** - New UI patterns include ARIA support

## Module Dependency Matrix

Core dependencies between runtime modules (read as "row imports column"):

| Module | pulse | dom | store | context | router | errors | utils | adapter |
|--------|-------|-----|-------|---------|--------|--------|-------|---------|
| **dom.js** | x | - | - | - | - | x | x | x |
| **router.js** | x | x | - | - | - | x | - | - |
| **store.js** | x | - | - | - | - | x | - | - |
| **context.js** | x | - | - | - | - | x | - | - |
| **form.js** | x | - | - | - | - | - | - | - |
| **async.js** | x | - | - | - | - | - | - | - |
| **http.js** | x | - | - | - | - | - | - | - |
| **websocket.js** | x | - | - | - | - | - | - | - |
| **graphql.js** | x | - | - | - | - | - | - | - |
| **a11y.js** | x | x | - | - | - | - | x | - |
| **devtools.js** | x | - | - | - | - | - | - | - |

**Key insight**: `pulse.js` is the root dependency. All runtime modules depend on it but nothing else depends on most modules (loose coupling).

## Trade-off Decision Framework

When evaluating architectural choices, use this framework:

### Bundle Size vs Features

```
Question: Should this be in core runtime or a separate import?

If feature is needed by >50% of apps → core runtime
If feature is needed by <50% → separate module (tree-shakeable)
If feature is >5KB minified → always separate module
If feature has external deps → optional peer dependency
```

### Sync vs Async API

```
Question: Should this API be sync or async?

If operation is CPU-bound → sync
If operation involves I/O → async
If operation might be either → provide both (compileSass / compileSassSync)
If sync is possible but slow → sync with async alternative
```

### Abstraction vs Simplicity

```
Question: Should we add an abstraction layer?

If 2+ implementations exist now → yes (dom-adapter: Browser + Mock)
If 2+ likely in future → yes (preprocessor: SASS + LESS + Stylus)
If only 1 implementation ever → no, use directly
If abstraction adds >20% code → reconsider
```

### Reactive vs Static

```
Question: Should this state be reactive (Pulse)?

If UI depends on it → reactive (Pulse)
If multiple consumers need updates → reactive
If set-once config → static (plain value)
If internal implementation detail → static
```

## Reference Documentation

- **[architecture-patterns.md](references/architecture-patterns.md)** - Detailed patterns used in each module
- **[technology-decisions.md](references/technology-decisions.md)** - Key technology choices and rationale
- **[design-principles.md](references/design-principles.md)** - SOLID, DRY, and framework-specific principles

## Key Architecture Files

| File | Architectural Role |
|------|-------------------|
| `runtime/pulse.js` | Core reactive primitive (foundation of everything) |
| `runtime/dom.js` | DOM abstraction with selector DSL |
| `runtime/dom-adapter.js` | Adapter pattern for SSR/testing portability |
| `runtime/errors.js` | Error hierarchy and structured error creation |
| `runtime/utils.js` | Security boundary (XSS, URL, CSS sanitization) |
| `runtime/lite.js` | Minimal bundle - defines "core" API surface |
| `compiler/transformer.js` | Code generation strategy |
| `compiler/preprocessor.js` | Strategy pattern for CSS preprocessors |
| `loader/vite-plugin.js` | Build tool integration reference |
| `package.json` | Export map defining public API surface |

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|---------|
| Circular import between modules | Two modules import each other | Extract shared code to a third module or use dependency inversion |
| Runtime imports Node.js API | `fs`, `path`, `process` in runtime | Move to CLI layer or use feature detection |
| New module bloats lite.js | Imported by `runtime/lite.js` | Only export in full runtime, not lite |
| SSR breaks with new code | Direct `document`/`window` access | Use `getAdapter()` from `dom-adapter.js` |
| Tree-shaking not working | Default export or side-effect imports | Use named exports, avoid module-level side effects |
| API inconsistent with framework | Different naming/return pattern | Follow conventions in "API Design Conventions" above |
