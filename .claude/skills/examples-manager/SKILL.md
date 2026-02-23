---
name: examples-manager
description: Examples management agent for the Pulse JS framework. Use this skill to audit, improve, update, and create example projects in the examples/ directory. Maintains consistency, tracks feature coverage, generates missing examples, and ensures integration with documentation and deployment.
---

# Examples Manager for Pulse Framework

## When to Use This Skill

- **Auditing** existing examples for quality, consistency, and completeness
- **Improving** existing examples (update outdated patterns, add README, enhance code)
- **Creating** new example projects for uncovered framework features
- **Updating** examples after framework API changes or new features
- **Checking coverage** of framework features across examples
- **Integrating** examples with docs (ExamplesPage.js, i18n, netlify.toml)
- **Standardizing** example structure, naming, and conventions

## Feature Coverage Matrix

Maps framework modules to existing example projects. Use this to identify gaps.

### Core Runtime

| Module | Feature | Example | Status |
|--------|---------|---------|--------|
| `runtime/pulse.js` | Signals, effects, computed, batch | `todo/` | Covered |
| `runtime/pulse.js` | watch, createState, memo | `dashboard/` | Partial |
| `runtime/pulse.js` | fromPromise | - | **MISSING** |
| `runtime/dom.js` | el(), mount, list, when, match | `todo/`, `blog/` | Covered |
| `runtime/dom.js` | Auto-ARIA, configureA11y | - | **MISSING** |
| `runtime/router.js` | createRouter, lazy, guards | `router/`, `blog/` | Covered |
| `runtime/router.js` | Hash mode, middleware, scroll | `router/` | Partial |
| `runtime/store.js` | createStore, actions, plugins | `store/` | Covered |
| `runtime/store.js` | combineStores, moduleStore, history | - | **MISSING** |
| `runtime/context.js` | createContext, Provider, useContext | - | **MISSING** |
| `runtime/form.js` | useForm, validators, field arrays | - | **MISSING** |
| `runtime/form.js` | useFileField, draft persistence | - | **MISSING** |
| `runtime/async.js` | useAsync, useResource, usePolling | - | **MISSING** |
| `runtime/http.js` | createHttp, interceptors | `meteo/` | Partial |
| `runtime/websocket.js` | createWebSocket, useWebSocket | `chat/` | Covered |
| `runtime/graphql.js` | useQuery, useMutation, useSubscription | - | **MISSING** |
| `runtime/a11y.js` | Widgets, focus, announcements | - | **MISSING** |
| `runtime/devtools.js` | Time-travel, profiling, a11y audit | - | **MISSING** |
| `runtime/native.js` | Mobile bridge | `ios-pulse/`, `android-pulse/` | Covered |
| `runtime/hmr.js` | Hot module replacement | `hmr/` | Covered |
| `runtime/lite.js` | Minimal bundle | - | **MISSING** |
| `runtime/ssr.js` | SSR, hydration, streaming | - | **MISSING** |
| `runtime/logger.js` | Logging with namespaces | - | **MISSING** |

### Server-Side

| Module | Feature | Example | Status |
|--------|---------|---------|--------|
| `server-components/` | PSC, 'use client'/'use server' | - | **MISSING** |
| `server-components/actions.js` | Server Actions, rate limiting | `server-actions-ratelimit/` | Covered |
| `runtime/ssr.js` | renderToString, hydrate | - | **MISSING** |
| `runtime/ssr-stream.js` | Streaming SSR | - | **MISSING** |

### CSS Preprocessors

| Preprocessor | Example | Status |
|--------------|---------|--------|
| SASS/SCSS | - | **MISSING** |
| LESS | `less-example/` | Covered |
| Stylus | `stylus-example/` | Covered |

### Build Tools

| Tool | Example | Status |
|------|---------|--------|
| Vite | (default in `pulse dev`) | Built-in |
| Webpack | `webpack-example/` | Covered |
| Rollup | `rollup-example/` | Covered |
| Parcel | `parcel-example/` | Covered |
| ESBuild | `esbuild-example/` | Covered |
| SWC | - | **MISSING** |

### Platforms

| Platform | Example | Status |
|----------|---------|--------|
| Browser | All examples | Covered |
| Electron | `electron/` | Covered |
| iOS Native | `ios-pulse/` | Covered |
| iOS WebView | `ios-webview/` | Covered |
| Android Native | `android-pulse/` | Covered |
| Android WebView | `android-webview/` | Covered |
| TypeScript | - | **MISSING** |

## Missing Examples - Priority List

Ranked by user value and feature importance:

| Priority | Example Name | Key Features | Complexity |
|----------|-------------|--------------|------------|
| **P1** | `form-validation/` | useForm, validators, async validation, file upload, draft persistence | Medium |
| **P1** | `sass-example/` | SASS/SCSS variables, mixins, nesting (parity with LESS/Stylus) | Low |
| **P2** | `graphql/` | useQuery, useMutation, useSubscription, caching | Medium |
| **P2** | `a11y-showcase/` | Widgets (modal, tabs, accordion, menu), focus trap, announcements, preferences | Medium |
| **P2** | `context-api/` | Theme context, auth context, nested providers, provideMany | Low |
| **P3** | `async-patterns/` | useAsync, useResource (SWR), usePolling, race condition handling | Medium |
| **P3** | `ssr/` | renderToString, hydrate, state serialization, Express adapter | High |
| **P3** | `lite/` | Minimal bundle (~5KB), core reactivity + DOM only | Low |
| **P4** | `server-components/` | PSC wire format, 'use client'/'use server', client hydration | High |
| **P4** | `devtools/` | Time-travel, dependency graph, profiling, a11y audit mode | Medium |
| **P4** | `typescript/` | TypeScript project with type checking | Low |

## Example Quality Checklist

Every example MUST have:

### Structure
- [ ] `package.json` with `pulse-example-<name>` naming, `"type": "module"`
- [ ] `index.html` with proper `<meta>` tags and `<div id="app">`
- [ ] `src/main.js` as entry point
- [ ] `src/App.pulse` (or `src/App.js` for non-DSL examples)
- [ ] `README.md` with description, features list, and usage instructions

### Code Quality
- [ ] Comments explaining key patterns and framework features
- [ ] No hardcoded API keys or secrets
- [ ] No external dependencies beyond what the feature requires
- [ ] Clean separation of concerns (components, pages, state)
- [ ] Error handling for async operations
- [ ] Accessible markup (proper ARIA, keyboard navigation)

### Integration
- [ ] Entry in `docs/src/pages/ExamplesPage.js` (example card)
- [ ] Translation keys in `docs/src/i18n/translations/en/pages.js` (and other languages)
- [ ] Redirect rules in `netlify.toml` (if web-deployable)
- [ ] Listed in project root `README.md` examples section (if exists)

## Standard Templates

### package.json

```json
{
  "name": "pulse-example-<name>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node ../../cli/index.js dev",
    "build": "node ../../cli/index.js build"
  }
}
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse - <Example Name></title>
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

### src/main.js (Module import pattern)

```javascript
import { pulse, effect, el, mount } from '../../../runtime/index.js';
// Import feature-specific modules
import { createRouter } from '../../../runtime/router.js';

// Boot application
import { App } from './App.js';

mount('#app', App());
```

### src/main.js (DSL pattern with .pulse files)

```javascript
import { compile } from '../../../compiler/index.js';

// For .pulse file projects, main.js bootstraps the compiled app
// The CLI handles compilation automatically in dev/build mode
```

### README.md Template

```markdown
# Pulse Example: <Name>

<One-sentence description of what this example demonstrates.>

## Features Demonstrated

- Feature 1 (from `runtime/module.js`)
- Feature 2
- Feature 3

## Getting Started

\`\`\`bash
cd examples/<name>
npm run dev
\`\`\`

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main application component |
| `src/components/X.pulse` | Description |

## Framework APIs Used

- `pulse()` - Reactive state
- `effect()` - Side effects
- `el()` - DOM creation

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Documentation](https://pulse-js.fr/core-concepts)
```

## Audit Workflow

When invoked to audit examples, follow these steps:

### Phase 1: Inventory

```
1. List all directories in examples/
2. For each directory:
   a. Check for required files (package.json, index.html, src/main.js)
   b. Read package.json for naming convention compliance
   c. Check for README.md presence and quality
   d. Identify which framework features are demonstrated
3. Build coverage matrix (framework features → examples)
```

### Phase 2: Quality Check

```
For each example:
1. Code quality:
   - Are imports using correct relative paths?
   - Are there comments explaining key patterns?
   - Is error handling present for async operations?
   - Is the code accessible (ARIA, keyboard, etc.)?
2. Structure consistency:
   - Does package.json follow naming convention?
   - Is the directory structure standard?
   - Does index.html have proper meta tags?
3. Documentation:
   - README present and complete?
   - Features list accurate?
   - Getting started instructions correct?
4. Integration:
   - Listed in ExamplesPage.js?
   - Has i18n translation keys?
   - Has netlify.toml redirect?
```

### Phase 3: Report

```markdown
# Examples Audit Report

## Summary
- Total examples: N
- Quality score: X/100
- Missing examples: N (from coverage matrix)
- Examples needing improvement: N

## Per-Example Results
| Example | Structure | README | Code Quality | Integration | Score |
|---------|-----------|--------|-------------|-------------|-------|
| todo    | Pass      | Pass   | Good        | Full        | 95    |
| ...     | ...       | ...    | ...         | ...         | ...   |

## Missing Feature Coverage
1. Form validation (P1)
2. SASS/SCSS (P1)
3. ...

## Improvement Recommendations
1. example-name: <what to improve>
2. ...
```

## Creation Workflow

When creating a new example, follow these steps:

### Step 1: Plan

```
1. Identify the framework features to demonstrate
2. Design the app concept (what does the user build?)
3. List the files to create
4. Determine if .pulse DSL or plain .js
5. Check if external dependencies are needed
```

### Step 2: Scaffold

```
1. Create directory: examples/<name>/
2. Create package.json from template
3. Create index.html from template
4. Create src/main.js
5. Create src/App.pulse (or App.js)
6. Create src/components/ (if needed)
7. Create src/styles.css (if needed)
8. Create README.md from template
```

### Step 3: Implement

```
1. Write the main application component
2. Demonstrate key framework features with comments
3. Add proper error handling
4. Ensure accessibility
5. Add meaningful sample data
6. Keep code concise but educational
```

### Step 4: Integrate

```
1. Add example card to docs/src/pages/ExamplesPage.js
2. Add i18n keys to docs/src/i18n/translations/en/pages.js
3. Add i18n keys to all other language files (fr, es, de, it, pt, ja)
4. Add redirect to netlify.toml (if web-deployable)
5. Update examples section in docs navigation (if applicable)
```

### Step 5: Verify

```
1. Run: cd examples/<name> && npm run dev
2. Check that the app loads and works correctly
3. Check accessibility (keyboard navigation, screen reader)
4. Verify all demonstrated features work
5. Read README and verify accuracy
```

## Improvement Guidelines

When improving existing examples:

### Common Improvements

| Issue | Fix |
|-------|-----|
| Missing README | Create from template, list features demonstrated |
| Outdated API usage | Update to current framework API patterns |
| No comments | Add comments explaining key framework patterns |
| Missing a11y | Add ARIA attributes, keyboard handlers, semantic HTML |
| No error handling | Add try-catch for async, loading/error states |
| Missing integration | Add to ExamplesPage.js, i18n, netlify.toml |
| Hardcoded strings | Use meaningful variable names, add data constants |
| No dark mode | Add `prefers-color-scheme` media query support |

### Do NOT

- Add unnecessary dependencies to examples
- Over-engineer examples (keep them educational, not production-grade)
- Change the fundamental concept of an existing example
- Remove features that are currently demonstrated
- Add features unrelated to the example's focus

## Integration Reference

### ExamplesPage.js Card Pattern

```javascript
<div class="example-card">
  <div class="example-icon">EMOJI</div>
  <h3>${t('examples.exampleKey.title')}</h3>
  <p>${t('examples.exampleKey.desc')}</p>
  <ul class="example-features">
    <li>${t('examples.exampleKey.features.0')}</li>
    <li>${t('examples.exampleKey.features.1')}</li>
    <li>${t('examples.exampleKey.features.2')}</li>
  </ul>
  <a href="/examples/<name>/" class="btn btn-primary">
    ${t('examples.viewDemo')}
  </a>
</div>
```

### i18n Translation Keys Pattern

```javascript
// In docs/src/i18n/translations/en/pages.js
exampleKey: {
  title: 'Example Title',
  desc: 'Short description of the example.',
  features: [
    'Feature 1 description',
    'Feature 2 description',
    'Feature 3 description'
  ]
}
```

### netlify.toml Redirect Pattern

```toml
[[redirects]]
  from = "/examples/<name>/*"
  to = "/examples/<name>/index.html"
  status = 200
```

## Integration with Other Skills

| Need | Delegate To | Example |
|------|-------------|---------|
| Architecture review for complex example | software-architect | SSR example design |
| Implementation of example features | senior-developer | Form validation logic |
| Tests for example code | qa-testing | Example integration tests |
| Security review of example patterns | security-reviewer | Server Actions example |
| Documentation updates for examples | docs-manager | ExamplesPage updates |
| Full example creation workflow | lead-developer | End-to-end new example |

## Key Project Files

| File | Purpose |
|------|---------|
| `examples/` | All example projects |
| `docs/src/pages/ExamplesPage.js` | Documentation examples page |
| `docs/src/i18n/translations/en/pages.js` | English translations for example cards |
| `docs/src/i18n/translations/fr/pages.js` | French translations |
| `docs/src/i18n/translations/es/pages.js` | Spanish translations |
| `docs/src/i18n/translations/de/pages.js` | German translations |
| `docs/src/i18n/translations/it/pages.js` | Italian translations |
| `docs/src/i18n/translations/pt/pages.js` | Portuguese translations |
| `docs/src/i18n/translations/ja/pages.js` | Japanese translations |
| `netlify.toml` | Deployment redirects for examples |
| `CLAUDE.md` | Framework API reference (source of truth for features) |

## Commands

This skill responds to:
- "Audit all examples" - Run full quality audit
- "Create example for <feature>" - Create new example project
- "Improve <example-name>" - Enhance existing example
- "Update examples for new API" - Update after framework changes
- "Check example coverage" - Show feature coverage matrix
- "List missing examples" - Show uncovered features by priority

## Quick Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Example won't start | Wrong relative import paths | Check `../../cli/index.js` and `../../../runtime/` paths |
| Styles not loading | Missing CSS file reference | Add `<link>` in index.html or import in main.js |
| .pulse compilation fails | Compiler API change | Check compiler/index.js for current compile() signature |
| Example not in docs | Missing integration step | Add to ExamplesPage.js + i18n + netlify.toml |
| Build tool example fails | Missing dev dependency | Check loader/ directory for current plugin API |
