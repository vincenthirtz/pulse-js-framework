# CLAUDE.md - Pulse Framework

## Project Overview

Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications (SPAs). It features:

- **Declarative DOM creation** using CSS selector syntax (`el('.container#main')`)
- **Signal-based reactivity** (pulsations) for automatic UI updates
- **Custom DSL** (.pulse files) that compile to JavaScript
- **Zero dependencies** - completely self-contained
- **Accessibility-first** - built-in a11y helpers, auto-ARIA, and audit tools
- **Optional SASS support** - automatic SCSS compilation if `sass` is installed

**Version:** See package.json | **License:** MIT | **Node.js:** >= 20.0.0

## Quick Commands

```bash
# Run tests
npm test                # Run all tests (compiler, lint, format, analyze)

# CLI commands (via pulse binary)
pulse create <name>     # Create new Pulse project
pulse create <name> --typescript  # Create TypeScript project
pulse create <name> --ecommerce   # Create from E-Commerce template
pulse create <name> --todo        # Create from Todo App template
pulse create <name> --blog        # Create from Blog template
pulse create <name> --chat        # Create from Chat template
pulse create <name> --dashboard   # Create from Dashboard template
pulse init              # Initialize in current directory
pulse init --typescript # Initialize TypeScript project
pulse dev [port]        # Start dev server (default: 3000)
pulse build             # Build for production (minified)
pulse preview [port]    # Preview production build (default: 4173)
pulse compile <file>    # Compile .pulse file to .js

# Code Quality
pulse lint [files]      # Validate .pulse files for errors and style
pulse lint --fix        # Auto-fix fixable issues
pulse format [files]    # Format .pulse files consistently
pulse format --check    # Check formatting without writing (CI mode)
pulse analyze           # Analyze bundle size and dependencies
pulse analyze --json    # Output analysis as JSON
pulse analyze --verbose # Show detailed metrics

# Testing
pulse test              # Run tests with Node.js test runner
pulse test --coverage   # Run tests with coverage
pulse test --watch      # Watch mode
pulse test --create <name>  # Generate test file

# Project Tools
pulse doctor            # Run project diagnostics
pulse doctor --verbose  # Detailed diagnostics

# Creating .pulse Files (Quick)
pulse new <name>                 # Create component (src/components/<Name>.pulse)
pulse new <name> --type page     # Create page (src/pages/<Name>.pulse)
pulse new <name> --type layout   # Create layout (src/layouts/<Name>.pulse)
pulse new <name> --props         # Include props section
pulse new <name> -d src/ui       # Custom output directory

# Scaffolding (Full)
pulse scaffold component <name>  # Generate component
pulse scaffold page <name>       # Generate page
pulse scaffold store <name>      # Generate store module
pulse scaffold hook <name>       # Generate custom hook
pulse scaffold service <name>    # Generate API service
pulse scaffold context <name>    # Generate context provider
pulse scaffold layout <name>     # Generate layout component

# Documentation
pulse docs --generate           # Generate API docs (Markdown)
pulse docs --generate --format html   # Generate HTML docs
pulse docs --generate --format json   # Generate JSON docs
```

## Development Workflow

```bash
# Development
pulse dev               # Local server at http://localhost:3000

# Production
pulse build             # Generate minified dist/ folder
pulse preview           # Serve dist/ at http://localhost:4173
```

## Git Workflow

When committing and pushing, always pull/rebase first to handle remote changes:

```bash
# Before pushing, always rebase
git pull --rebase origin <branch>
git push origin <branch>

# Example workflow
git add -A
git commit -m "feat: implement feature"
git pull --rebase origin develop  # Rebase before push
git push origin develop
```

**Why rebase?** This prevents merge commits and keeps history clean when multiple developers (or CI/CD) are pushing to the same branch.

## Claude Skills

Custom skills are located in `.claude/skills/` with `SKILL.md` format (not `skill.json`). Always check this directory structure before creating or loading skills.

**Skill structure:**
```
.claude/
└── skills/
    └── my-skill/
        └── SKILL.md    # Skill definition (NOT skill.json)
```

To invoke a skill, use: `/skill-name`

**Available skills in this project:**
- `/lead-developer` - Orchestrates multi-phase workflows
- `/software-architect` - Architecture and design decisions
- `/senior-developer` - Feature implementation
- `/qa-testing` - Test writing and validation
- `/security-reviewer` - Security audits

## Working with Large File Sets

When working with large batches of files (e.g., translations across 7+ languages), **process files incrementally** rather than reading all files at once to avoid hitting prompt length limits.

**Bad approach:**
```javascript
// DON'T: Read all language files at once
const files = await Promise.all([
  readFile('en.json'), readFile('fr.json'), readFile('es.json'),
  readFile('de.json'), readFile('it.json'), readFile('pt.json'), readFile('ja.json')
]);
// This can hit context limits!
```

**Good approach:**
```javascript
// DO: Process one file at a time
for (const lang of ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja']) {
  const content = await readFile(`${lang}.json`);
  // Process and write
  await writeFile(`${lang}.json`, updated);
  // Commit incrementally if needed
}
```

## Environment

This project targets **macOS**. Do not use Linux-only commands.

**Common pitfalls:**

| Linux Command | macOS Alternative |
|---------------|-------------------|
| `timeout 5s cmd` | `gtimeout 5s cmd` (install via `brew install coreutils`) |
| `date -d "..."` | `date -j -f "..." "..."` |
| `readlink -f` | `greadlink -f` (coreutils) |
| `sed -i` | `sed -i ''` (requires empty string for BSD sed) |

**Development environment:**
- OS: macOS (Darwin)
- Node.js: >= 20.0.0
- Package manager: npm (not yarn/pnpm)
- Shell: bash/zsh

## Efficiency Guidelines

When editing many files with similar changes, **prefer batch approaches** (sed, Task agents) over repeated Edit tool calls on individual files.

**Inefficient:**
```javascript
// DON'T: Repeated Edit tool calls
Edit('file1.js', old1, new1);
Edit('file2.js', old2, new2);
Edit('file3.js', old3, new3);
// ... 20 more files
```

**Efficient:**
```bash
# DO: Use sed for batch replacements
find src/ -name '*.js' -exec sed -i '' 's/oldPattern/newPattern/g' {} +

# OR: Use Task agent for complex logic
Task({
  subagent_type: 'general-purpose',
  prompt: 'Apply the transformation to all JS files in src/',
  description: 'Batch file transformation'
});
```

**When to use each approach:**
- **Edit tool**: 1-3 files with unique changes
- **sed/awk**: 4+ files with pattern-based changes
- **Task agent**: Complex logic requiring file reading + analysis

## Architecture

```
pulse/
├── runtime/              # Core framework
│   ├── pulse.js         # Reactivity system (signals, effects, computed)
│   ├── dom.js           # DOM creation and reactive bindings
│   ├── router.js        # SPA routing (re-exports from router/)
│   │   └── router/      # Router sub-modules
│   │       ├── core.js      # RouteTrie, createRouter, simpleRouter
│   │       ├── lazy.js      # Lazy loading utilities
│   │       ├── guards.js    # Middleware and navigation guards
│   │       ├── history.js   # Browser history and scroll management
│   │       └── utils.js     # Route parsing and query string utilities
│   ├── store.js         # Global state management
│   ├── context.js       # Context API (dependency injection, prop drilling prevention)
│   ├── form.js          # Form validation and management
│   ├── async.js         # Async primitives (useAsync, useResource, usePolling)
│   ├── http.js          # HTTP client (fetch wrapper, interceptors)
│   ├── websocket.js     # WebSocket client (auto-reconnect, heartbeat, queuing)
│   ├── graphql.js       # GraphQL client (re-exports from graphql/)
│   │   └── graphql/     # GraphQL sub-modules
│   │       ├── client.js        # GraphQLClient, createGraphQLClient
│   │       ├── cache.js         # Query caching, cache key generation
│   │       ├── subscriptions.js # WebSocket subscriptions (graphql-ws)
│   │       └── hooks.js         # useQuery, useMutation, useSubscription
│   ├── a11y.js          # Accessibility (re-exports from a11y/)
│   │   └── a11y/        # A11y sub-modules
│   │       ├── announcements.js # Screen reader announcements
│   │       ├── focus.js         # Focus management and keyboard navigation
│   │       ├── preferences.js   # User preference detection
│   │       ├── widgets.js       # ARIA widgets (modal, tabs, etc.)
│   │       ├── validation.js    # A11y validation and auditing
│   │       ├── contrast.js      # Color contrast utilities
│   │       └── utils.js         # Utility functions
│   ├── devtools.js      # Debugging tools (time-travel, dependency graph)
│   ├── native.js        # Mobile bridge for iOS/Android
│   └── hmr.js           # Hot module replacement
├── compiler/            # .pulse file compiler
│   ├── lexer.js         # Tokenizer
│   ├── parser.js        # AST builder (re-exports from parser/)
│   │   └── parser/      # Parser sub-modules
│   │       ├── core.js        # NodeType, ASTNode, Parser class
│   │       ├── imports.js     # Import, page, route declarations
│   │       ├── state.js       # Props, state blocks, value parsing
│   │       ├── view.js        # View block, elements, directives
│   │       ├── expressions.js # Expression parsing, precedence climbing
│   │       ├── style.js       # CSS parsing, preprocessor support
│   │       └── blocks.js      # Actions, router, store blocks
│   ├── transformer.js   # Code generator
│   └── sourcemap.js     # V3 source map generation
├── cli/                 # Command-line interface
│   ├── index.js         # Main CLI, command handlers
│   ├── dev.js           # Dev server
│   ├── build.js         # Production build
│   ├── lint.js          # Semantic analyzer (lint command)
│   ├── format.js        # Code formatter (format command)
│   ├── analyze.js       # Bundle analyzer (analyze command)
│   ├── test.js          # Test runner with coverage
│   ├── doctor.js        # Project diagnostics
│   ├── scaffold.js      # Component/page/store generation
│   ├── docs.js          # API documentation generator
│   └── utils/
│       └── file-utils.js  # Shared utilities (glob, parseArgs)
├── loader/              # Build tool integrations
│   ├── vite-plugin.js     # Vite plugin
│   ├── webpack-loader.js  # Webpack loader
│   ├── rollup-plugin.js   # Rollup plugin
│   ├── esbuild-plugin.js  # ESBuild plugin
│   ├── parcel-plugin.js   # Parcel transformer
│   └── swc-plugin.js      # SWC plugin
├── examples/            # Example apps (todo, chat, ecommerce, electron)
├── test/                # Test suite
└── docs/                # Documentation site
```

## Context Files (On-Demand API Reference)

Detailed API documentation is in `.claude/context/`. These are **never loaded automatically** - skills and agents read them on-demand when needed.

| File | Topics | Load when... |
|------|--------|-------------|
| `api-core.md` | pulse, effect, computed, batch, watch, createState, memo, fromPromise, el, mount, bind, list, when, match, show, model | Working on reactivity or DOM |
| `api-router-store.md` | createRouter, lazy, preload, middleware, createStore, createActions, Context API | Working on routing, state management, or context |
| `api-forms-async.md` | useForm, validators, useFileField, useFieldArray, useAsync, useResource, usePolling | Working on forms, validation, or async patterns |
| `api-realtime.md` | createHttp, HttpError, createWebSocket, createGraphQLClient, useQuery, useMutation | Working on HTTP, WebSocket, or GraphQL |
| `api-ssr-server.md` | renderToString, hydrate, streaming SSR, Server Components, Server Actions, PSC wire format, security | Working on SSR, server components, or server actions |
| `api-a11y-devtools.md` | announce, trapFocus, ARIA widgets, validateA11y, enableDevTools, time-travel, a11y audit | Working on accessibility or devtools |
| `api-utils.md` | escapeHtml, sanitizeUrl, Logger, LRUCache, DOMAdapter, Errors, Native, HMR, Lite build | Working on utils, security, errors, native, or HMR |
| `getting-started.md` | Quick Start, First App tutorial, Testing tutorial | Onboarding or creating examples |
| `export-map.md` | All import paths for every module | Checking correct import paths |
| `performance-algorithms.md` | batch(), computed lazy/eager, LIS algorithm, LRU cache, effect cleanup | Optimizing performance or understanding internals |
| `error-reference.md` | Compiler, runtime, lint, a11y, and form error codes | Debugging errors or writing validators |
| `css-preprocessors.md` | SASS/SCSS, LESS, Stylus syntax, detection, compilation API | Working on CSS preprocessor support |

**Usage pattern for skills/agents:**
```
1. Read memory/cache/ files first (project snapshot, test status)
2. Identify which context files are relevant to the task
3. Read ONLY the needed context files (typically 1-2)
4. Proceed with implementation
```

## API Quick Reference

### Core Reactivity (runtime/pulse.js)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `pulse` | `pulse(initialValue, options?)` | Create reactive value |
| `effect` | `effect(fn, options?) → dispose` | Auto-run on dependency change |
| `computed` | `computed(fn, options?) → ReadonlyPulse` | Derived reactive value |
| `batch` | `batch(fn)` | Defer effects until complete |
| `watch` | `watch(source, callback) → stop` | Watch specific pulses |
| `createState` | `createState(obj) → Proxy` | Reactive proxy object |
| `memo` | `memo(fn, options?)` | Memoize function calls |
| `fromPromise` | `fromPromise(promise, initial?) → {value, loading, error}` | Promise to reactive |

**Pulse methods:** `.get()` (read+track), `.peek()` (read only), `.set(v)`, `.update(fn)`, `.subscribe(fn)`, `.derive(fn)`

### DOM (runtime/dom.js)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `el` | `el(selector, attrs?, ...children)` | Create element |
| `mount` | `mount(target, element) → unmount` | Mount to DOM |
| `text` | `text(fn) → TextNode` | Reactive text |
| `bind` | `bind(el, attr, fn)` | Reactive attribute |
| `on` | `on(el, event, handler)` | Event listener |
| `model` | `model(input, pulse)` | Two-way binding |
| `list` | `list(source, render, keyFn?)` | Reactive list |
| `when` | `when(cond, then, else?)` | Conditional render |
| `match` | `match(...[cond, render])` | Multi-condition render |
| `show` | `show(el, cond)` | Toggle visibility (CSS) |
| `cls` | `cls(el, name, cond)` | Toggle class |
| `style` | `style(el, prop, fn)` | Reactive inline style |
| `component` | `component(fn) → factory` | Component with lifecycle |

**Selector syntax:** `tag#id.class1.class2[attr=value]` — e.g., `el('input[type=email].form-input')`

**Auto-ARIA:** `el('dialog')` → `role="dialog" aria-modal="true"`, `el('button')` → `type="button"`, etc.

### Key Import Paths

```javascript
// Core (reactivity + DOM)
import { pulse, effect, computed, batch, el, mount, list, when } from 'pulse-js-framework/runtime';

// Modules
import { createRouter, lazy } from 'pulse-js-framework/runtime/router';
import { createStore, createActions } from 'pulse-js-framework/runtime/store';
import { createContext, useContext, Provider } from 'pulse-js-framework/runtime/context';
import { useForm, useField, validators } from 'pulse-js-framework/runtime/form';
import { useAsync, useResource } from 'pulse-js-framework/runtime/async';
import { createHttp, http } from 'pulse-js-framework/runtime/http';
import { createWebSocket, useWebSocket } from 'pulse-js-framework/runtime/websocket';
import { createGraphQLClient, useQuery } from 'pulse-js-framework/runtime/graphql';
import { announce, trapFocus, validateA11y } from 'pulse-js-framework/runtime/a11y';
import { renderToString, hydrate } from 'pulse-js-framework/runtime/ssr';
import { enableDevTools, trackedPulse } from 'pulse-js-framework/runtime/devtools';
import { compile } from 'pulse-js-framework/compiler';

// Lite build (~5KB)
import { pulse, effect, computed, el, mount } from 'pulse-js-framework/runtime/lite';

// Build tools
import pulsePlugin from 'pulse-js-framework/vite';
import pulseLoader from 'pulse-js-framework/webpack';
import rollupPlugin from 'pulse-js-framework/rollup';

// Full export map: see .claude/context/export-map.md
```

## .pulse DSL Format

```pulse
@page Counter

// Import components
import Button from './Button.pulse'
import { Icon } from './icons.pulse'

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    Button @click(count++) {
      Icon "plus"
      "Increment"
    }
    // Slot for component composition
    slot "actions"
    slot { "Default content" }
  }
}

style {
  // Styles are automatically scoped
  .counter { padding: 20px }

  // SASS/SCSS syntax works if sass is installed
  $primary: #646cff;
  .btn {
    background: $primary;
    &:hover { opacity: 0.8; }
  }
}
```

**Compiler features:**
- `import` statements (default, named, namespace)
- `slot` / `slot "name"` for content projection
- CSS scoping with unique class prefixes
- Error messages include line:column
- Source map generation for debugging
- Accessibility directives (`@a11y`, `@live`, `@focusTrap`, `@srOnly`)
- Dynamic attributes (`[value={expr}]`) for reactive form bindings
- Event handlers have access to `event` object (`@input(value = event.target.value)`)
- **CSS preprocessor support** - SASS/SCSS, LESS, and Stylus automatically compiled if installed

### Accessibility Directives

```pulse
view {
  // @a11y - Set ARIA attributes
  div @a11y(role=dialog, label="Modal window", modal=true) { ... }

  // @live - Live region for screen reader announcements
  .status @live(polite) { "Status: {status}" }
  .error @live(assertive) { "Error: {errorMessage}" }

  // @focusTrap - Trap focus within element (for modals/dialogs)
  .modal @focusTrap(autoFocus=true, returnFocus=true) { ... }

  // @srOnly - Visually hidden text (screen readers only)
  span @srOnly "Skip to main content"
}
```

| Directive | Compiles to |
|-----------|-------------|
| `@a11y(role=dialog, label="...")` | `el('div[role=dialog][aria-label=...]')` |
| `@live(polite)` | `el('div[aria-live=polite][aria-atomic=true]')` |
| `@live(assertive)` | `el('div[aria-live=assertive][aria-atomic=true]')` |
| `@focusTrap` | `trapFocus(el, {})` |
| `@focusTrap(autoFocus=true)` | `trapFocus(el, { autoFocus: true })` |
| `@srOnly` | `srOnly(content)` |

## Key Files

| Category | File | Purpose |
|----------|------|---------|
| **Reactivity** | `runtime/pulse.js` | Pulse class, effect, computed, batch, watch |
| **DOM** | `runtime/dom.js` | el, text, bind, on, model, list, when, auto-ARIA |
| **Router** | `runtime/router.js` | createRouter, lazy, preload, middleware |
| **Store** | `runtime/store.js` | createStore, createActions, plugins |
| **Context** | `runtime/context.js` | createContext, useContext, Provider |
| **Form** | `runtime/form.js` | useForm, useField, validators |
| **Async** | `runtime/async.js` | useAsync, useResource, usePolling |
| **HTTP** | `runtime/http.js` | createHttp, HttpError, interceptors |
| **WebSocket** | `runtime/websocket.js` | createWebSocket, auto-reconnect, heartbeat |
| **GraphQL** | `runtime/graphql.js` | createGraphQLClient, useQuery, useMutation |
| **A11y** | `runtime/a11y.js` | announce, trapFocus, validateA11y, ARIA widgets |
| **DevTools** | `runtime/devtools.js` | trackedPulse, time-travel, dependency graph |
| **SSR** | `runtime/ssr.js` | renderToString, hydrate, ClientOnly, ServerOnly |
| **SSR Stream** | `runtime/ssr-stream.js` | renderToStream, renderToReadableStream |
| **Server Components** | `runtime/server-components/` | PSC wire format, Server Actions, security |
| **Security** | `runtime/utils.js` | escapeHtml, sanitizeUrl, safeSetAttribute |
| **Errors** | `runtime/errors.js` | PulseError, Errors, formatError |
| **Compiler** | `compiler/lexer.js` | Tokenizer (50+ token types) |
| **Compiler** | `compiler/parser.js` | AST builder for .pulse syntax |
| **Compiler** | `compiler/transformer.js` | JavaScript code generator |
| **CLI** | `cli/index.js` | CLI commands implementation |
| **Lint** | `cli/lint.js` | SemanticAnalyzer, LintRules |
| **Build** | `loader/vite-plugin.js` | Vite plugin (HMR, CSS extraction) |
| **Reference** | `examples/todo/src/main.js` | Best reference implementation |

## Code Conventions

- **ES Modules** throughout (`import`/`export`)
- **Private fields** using `#fieldName` syntax
- **Named exports** for all public APIs
- **camelCase** for functions, **PascalCase** for classes
- **No external dependencies** - everything is built-in
- Tests use Node.js built-in test runner (`node --test`)

## Testing

This project primarily uses **JavaScript** (not TypeScript). Tests use **Node.js built-in test runner** (`node:test`), not Jest or Mocha.

Tests are in `test/` directory and cover the compiler (lexer, parser, transformer). Run with:

```bash
npm test
# or
node --test test/*.js
# With coverage
npm test -- --coverage
```

**Important testing guidelines:**

1. **Use node:test** - Do NOT use Jest, Mocha, or other frameworks
2. **Async cleanup** - Always provide cleanup for async operations to prevent hanging tests
3. **Timeout handling** - Use `AbortSignal.timeout()` or explicit timeouts for async tests
4. **Mock DOM** - Use the project's MockDOMAdapter for DOM-dependent tests
5. **No hardcoded timing** - Avoid `setTimeout` in tests; use proper async patterns

**Good async test pattern:**
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';

test('async operation with cleanup', async (t) => {
  const signal = AbortSignal.timeout(1000);  // Timeout after 1s

  const resource = await setupResource({ signal });

  // Cleanup on test end
  t.after(() => resource.dispose());

  const result = await resource.doWork();
  assert.strictEqual(result, expected);
});
```

**Mock DOM setup:**
```javascript
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';

describe('DOM tests', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = new MockDOMAdapter();
    setAdapter(mockAdapter);
  });

  afterEach(() => {
    resetAdapter();
  });

  test('creates element', () => {
    const div = mockAdapter.createElement('div');
    assert.strictEqual(div.tagName, 'DIV');
  });
});
```

**Common pitfalls to avoid:**
- Using Jest/Mocha syntax (`expect()`, `jest.fn()`)
- Async tests without cleanup (causes hangs)
- Hardcoded `setTimeout(done, 100)` delays
- Missing mock DOM setup for DOM-dependent code
- Not handling promise rejections in async tests

## Development Notes

- **Build tool integrations** available for Vite, Webpack, Rollup, and ESBuild (see `loader/` directory)
- The framework works directly in browsers without build step
- Circular dependency protection limits to 100 iterations
- Effects use try-catch to prevent one error from breaking others
- List rendering uses key functions for efficient DOM updates
- **Accessibility is automatic**: `el()` applies ARIA attributes based on semantics
- Use `configureA11y({ enabled: false })` to disable auto-ARIA if needed
- Run `pulse lint` to catch a11y issues at build time (10 rules)
- Use DevTools `enableA11yAudit()` for runtime a11y checking
- **CSS preprocessors are optional**: Install `sass`, `less`, or `stylus` in your project to enable SCSS/LESS/Stylus in style blocks
