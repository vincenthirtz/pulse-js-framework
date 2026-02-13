# Documentation File Mapping Reference

This document maps markdown files in `docs/` to their corresponding page components in `docs/src/pages/`.

## Direct Mappings

| Markdown File | Page Component | Description |
|---------------|----------------|-------------|
| `docs/http.md` | `HttpPage.js` | HTTP client documentation |
| `docs/websocket.md` | `WebSocketPage.js` | WebSocket client documentation |
| `docs/graphql.md` | `GraphQLPage.js` | GraphQL client documentation |
| `docs/accessibility.md` | `AccessibilityPage.js` | Accessibility (a11y) features |
| `docs/context.md` | `ContextPage.js` | Context API documentation |
| `docs/devtools.md` | `DevToolsPage.js` | DevTools documentation |
| `docs/internals.md` | `InternalsPage.js` | Framework internals |
| `docs/api.md` | `ApiReferencePage.js` | Complete API reference |

## Partial Mappings

| Markdown File | Primary Page | Secondary Pages | Notes |
|---------------|--------------|-----------------|-------|
| `docs/cli.md` | `GettingStartedPage.js` | - | CLI section in Getting Started |
| `docs/pulse-dsl.md` | `CoreConceptsPage.js` | - | .pulse DSL syntax section |

## Special Cases

### Architecture Decision Records (docs/adr/)
- **Do NOT delete**: ADRs are permanent reference documents
- **Referenced from**: `InternalsPage.js` links to specific ADRs
- **Location**: `docs/adr/NNNN-description.md`
- **Format**: ADR number + descriptive title

### Milestone Plans (docs/milestones/)
- **Do NOT delete**: Project planning documents
- **Referenced from**: `ChangelogPage.js` may link to milestones
- **Location**: `docs/milestones/vX.Y.Z-plan.md`
- **Format**: Version number + plan

### Project Root Docs
- **README.md**: GitHub repository readme - DO NOT DELETE
- **CLAUDE.md**: Project instructions for Claude - DO NOT DELETE
- **CONTRIBUTING.md**: Contribution guidelines (if exists) - DO NOT DELETE

## Page Not Found?

If a markdown file doesn't have a clear corresponding page:

### 1. Check if content belongs in existing pages
- **Getting Started** - Installation, setup, first app
- **Core Concepts** - Reactivity, .pulse DSL, architecture
- **API Reference** - Complete API listings
- **Examples** - Full application examples

### 2. Create a new page if needed
Use the template from `assets/page-template.js` and:
1. Create `docs/src/pages/NewPage.js`
2. Add import to `docs/src/state.js`
3. Add route to navigation array

### 3. Split content across multiple pages
Some markdown files may contain content for multiple pages:
- Extract each section
- Update corresponding pages
- Delete original .md file only after all content is migrated

## Page Component Structure

All page components follow this pattern:

```javascript
import { el } from '/runtime/index.js';
import { t } from '../i18n/index.js';
import { highlightCode } from '../highlighter.js';

export function PageName() {
  return el('article.docs-page', [
    el('h1', () => t('pages.pagename.title')),

    el('section.intro', [/* intro */]),
    el('section.api', [/* API reference */]),
    el('section.examples', [/* examples */])
  ]);
}
```

## Translation Keys

When adding new content, you may need to add translation keys to:
- `docs/src/i18n/en.js`
- `docs/src/i18n/fr.js`

Example:
```javascript
pages: {
  http: {
    title: 'HTTP Client',
    intro: 'Pulse includes a powerful HTTP client...'
  }
}
```
