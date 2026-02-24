---
name: examples-manager
description: Examples management agent for the Pulse JS framework. Use this skill to audit, improve, update, and create example projects in the examples/ directory. Maintains consistency, tracks feature coverage, generates missing examples, and ensures integration with documentation and deployment.
---

# Examples Manager for Pulse Framework

## Context Loading

Load `.claude/context/getting-started.md` for tutorial patterns and `.claude/context/export-map.md` for correct import paths.

## When to Use This Skill

Auditing, improving, creating, or updating examples. Checking feature coverage. Integrating with docs (ExamplesPage.js, i18n, netlify.toml). Standardizing structure and conventions.

## Feature Coverage Matrix

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

### Compiler & Tooling

| Category | Item | Example | Status |
|----------|------|---------|--------|
| CSS Preprocessors | SASS/SCSS | - | **MISSING** |
| CSS Preprocessors | LESS | `less-example/` | Covered |
| CSS Preprocessors | Stylus | `stylus-example/` | Covered |
| Build Tools | Webpack | `webpack-example/` | Covered |
| Build Tools | Rollup | `rollup-example/` | Covered |
| Build Tools | Parcel | `parcel-example/` | Covered |
| Build Tools | ESBuild | `esbuild-example/` | Covered |
| Build Tools | SWC | - | **MISSING** |
| Platforms | Electron | `electron/` | Covered |
| Platforms | iOS/Android | `ios-pulse/`, `android-pulse/` | Covered |
| Platforms | TypeScript | - | **MISSING** |

## Missing Examples - Priority List

| Priority | Example | Key Features |
|----------|---------|--------------|
| P1 | `form-validation/` | useForm, validators, async validation, file upload, draft persistence |
| P1 | `sass-example/` | SASS/SCSS variables, mixins, nesting |
| P2 | `graphql/` | useQuery, useMutation, useSubscription, caching |
| P2 | `a11y-showcase/` | Modal, tabs, accordion, focus trap, announcements |
| P2 | `context-api/` | Theme context, auth context, nested providers |
| P3 | `async-patterns/` | useAsync, useResource (SWR), usePolling, race conditions |
| P3 | `ssr/` | renderToString, hydrate, state serialization, Express adapter |
| P3 | `lite/` | Minimal bundle, core reactivity + DOM only |
| P4 | `server-components/` | PSC wire format, 'use client'/'use server', hydration |
| P4 | `devtools/` | Time-travel, dependency graph, profiling, a11y audit |
| P4 | `typescript/` | TypeScript project with type checking |

## Example Quality Checklist

### Structure
- [ ] `package.json` with `pulse-example-<name>` naming, `"type": "module"`
- [ ] `index.html` with proper `<meta>` tags and `<div id="app">`
- [ ] `src/main.js` as entry point
- [ ] `src/App.pulse` (or `src/App.js` for non-DSL examples)
- [ ] `README.md` with description, features list, and usage instructions

### Code Quality
- [ ] Comments explaining key patterns and framework features
- [ ] No hardcoded API keys or secrets
- [ ] Minimal external dependencies
- [ ] Error handling for async operations
- [ ] Accessible markup (proper ARIA, keyboard navigation)

### Integration
- [ ] Entry in `docs/src/pages/ExamplesPage.js` (example card)
- [ ] Translation keys in all 7 language files (`en`, `fr`, `es`, `de`, `it`, `pt`, `ja`)
- [ ] Redirect rule in `netlify.toml` (if web-deployable)

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

### src/main.js
```javascript
import { pulse, effect, el, mount } from '../../../runtime/index.js';
import { createRouter } from '../../../runtime/router.js'; // feature-specific
import { App } from './App.js';
mount('#app', App());
```

### README.md
```markdown
# Pulse Example: <Name>

<One-sentence description.>

## Features Demonstrated
- Feature 1 (`runtime/module.js`)
- Feature 2

## Getting Started
\`\`\`bash
cd examples/<name> && npm run dev
\`\`\`
Open http://localhost:3000

## Key Files
| File | Description |
|------|-------------|
| `src/App.pulse` | Main component |

## Framework APIs Used
- `pulse()`, `effect()`, `el()`
```

## Workflows

### Audit (3 phases)
1. **Inventory** - List `examples/` dirs, check required files, identify features covered
2. **Quality Check** - Imports correct? Comments? Error handling? A11y? README complete? Integration done?
3. **Report** - Summary table with per-example scores, missing coverage, improvement recommendations

### Create New Example (5 steps)
1. **Plan** - Identify features, design app concept, choose DSL vs plain JS
2. **Scaffold** - Create dir, package.json, index.html, src/main.js, App.pulse/js, README.md
3. **Implement** - Write component, add feature comments, error handling, a11y, sample data
4. **Integrate** - ExamplesPage.js card, i18n keys (all 7 languages), netlify.toml redirect
5. **Verify** - `npm run dev`, check functionality, keyboard navigation, README accuracy

### Improve Existing Example

| Issue | Fix |
|-------|-----|
| Missing README | Create from template |
| Outdated API | Update to current framework patterns |
| No comments | Add framework pattern explanations |
| Missing a11y | Add ARIA, keyboard handlers, semantic HTML |
| No error handling | Add try-catch, loading/error states |
| Missing integration | Add to ExamplesPage.js + i18n + netlify.toml |

**Do NOT:** add unnecessary dependencies, over-engineer, change an example's core concept, add unrelated features.

## Integration Reference

### ExamplesPage.js Card
```javascript
<div class="example-card">
  <div class="example-icon">EMOJI</div>
  <h3>${t('examples.exampleKey.title')}</h3>
  <p>${t('examples.exampleKey.desc')}</p>
  <ul class="example-features">
    <li>${t('examples.exampleKey.features.0')}</li>
  </ul>
  <a href="/examples/<name>/" class="btn btn-primary">${t('examples.viewDemo')}</a>
</div>
```

### i18n Key Pattern (`docs/src/i18n/translations/en/pages.js`)
```javascript
exampleKey: {
  title: 'Example Title',
  desc: 'Short description.',
  features: ['Feature 1', 'Feature 2', 'Feature 3']
}
```

### netlify.toml Redirect
```toml
[[redirects]]
  from = "/examples/<name>/*"
  to = "/examples/<name>/index.html"
  status = 200
```

## Key Project Files

| File | Purpose |
|------|---------|
| `examples/` | All example projects |
| `docs/src/pages/ExamplesPage.js` | Documentation examples page |
| `docs/src/i18n/translations/*/pages.js` | Translations (en, fr, es, de, it, pt, ja) |
| `netlify.toml` | Deployment redirects |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Example won't start | Check relative paths: `../../cli/index.js`, `../../../runtime/` |
| Styles not loading | Add `<link>` in index.html or import in main.js |
| .pulse compilation fails | Check `compiler/index.js` for current `compile()` signature |
| Example not in docs | Add to ExamplesPage.js + i18n + netlify.toml |
| Build tool example fails | Check `loader/` directory for current plugin API |
