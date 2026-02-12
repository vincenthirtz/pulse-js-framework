---
name: docs-manager
description: Documentation management agent for the Pulse JS framework. Use this skill to collect markdown files from the docs directory, update documentation pages in docs/src, and maintain documentation consistency. Handles content migration, page updates, and cleanup of processed markdown files.
---

# Documentation Manager for Pulse Framework

## When to Use This Skill

- Migrating content from .md files to documentation pages
- Updating documentation in docs/src/pages/ from source .md files
- Consolidating documentation updates across multiple files
- Cleaning up processed markdown files after integration
- Synchronizing documentation content with the docs website
- Batch updating documentation pages from markdown sources

## Core Responsibilities

### 1. Documentation Collection
- **Find markdown files**: Scan `docs/` directory for `.md` files (excluding `docs/src/`)
- **Analyze content**: Read and understand the structure and purpose of each markdown file
- **Map to pages**: Determine which documentation page(s) each markdown corresponds to

### 2. Page Updates
- **Update pages**: Intelligently merge content into `docs/src/pages/*.js` files
- **Preserve structure**: Maintain the existing page component structure and imports
- **Add new content**: Integrate new sections, examples, and explanations
- **Improve existing**: Enhance clarity, add missing details, update outdated information

### 3. Cleanup
- **Delete processed files**: Remove `.md` files after successful integration
- **Verify changes**: Ensure updates don't break the documentation site
- **Track changes**: Log what was updated for review

## Documentation Structure

### Source Markdown Files (docs/)
```
docs/
├── http.md              → HttpPage.js
├── websocket.md         → WebSocketPage.js
├── graphql.md           → GraphQLPage.js
├── accessibility.md     → AccessibilityPage.js
├── context.md           → ContextPage.js
├── devtools.md          → DevToolsPage.js
├── api.md               → ApiReferencePage.js
├── cli.md               → GettingStartedPage.js (CLI section)
├── pulse-dsl.md         → CoreConceptsPage.js (.pulse DSL section)
├── internals.md         → InternalsPage.js
└── adr/                 → Architecture Decision Records (keep)
    └── *.md             → Referenced from InternalsPage.js
```

### Documentation Pages (docs/src/pages/)
```javascript
// Each page exports a component function:
export function HttpPage() {
  return el('article.docs-page', [
    el('h1', 'HTTP Client'),
    el('section.intro', [/* intro content */]),
    el('section.api', [/* API reference */]),
    el('section.examples', [/* code examples */])
  ]);
}
```

## Update Strategy

### Step 1: Discovery
```bash
# Find all markdown files (excluding ADRs and docs/src/)
find docs -name "*.md" -not -path "docs/src/*" -not -path "docs/adr/*"
```

### Step 2: Content Analysis
For each markdown file:
1. **Read content**: Parse headings, sections, code blocks
2. **Identify target page**: Match filename to page (e.g., `http.md` → `HttpPage.js`)
3. **Extract sections**: Categorize content (intro, API, examples, etc.)

### Step 3: Page Update
For each target page:
1. **Read existing page**: Understand current structure
2. **Merge content**:
   - Add new sections as `el('section', ...)`
   - Update existing text with improvements
   - Add code examples as `el('pre', el('code', ...))`
   - Preserve existing examples and structure
3. **Maintain imports**: Keep all necessary imports at the top
4. **Use syntax highlighting**: Wrap code in `highlightCode(code, 'javascript')`

### Step 4: Verification
Before deleting source files:
1. **Check syntax**: Ensure the updated page is valid JavaScript
2. **Preview locally**: Run `pulse dev` to verify the page renders correctly
3. **Compare content**: Ensure all important content from .md is in the page

### Step 5: Cleanup
After successful integration:
1. **Delete markdown files**: Remove processed `.md` files
2. **Keep ADRs**: Never delete `docs/adr/*.md` (architectural decisions)
3. **Keep milestones**: Preserve `docs/milestones/*.md` if they exist
4. **Log changes**: Report which files were processed

## Content Mapping Guidelines

### Common Sections to Map

| Markdown Section | Page Component |
|------------------|----------------|
| `# Title` | `el('h1', 'Title')` |
| `## Heading` | `el('h2', 'Heading')` |
| Paragraph text | `el('p', '...')` |
| Code block | `el('pre', el('code.language-js', highlightCode(...)))` |
| Bullet list | `el('ul', items.map(item => el('li', item)))` |
| Table | Convert to `el('table', ...)` with rows |
| Note/Warning | `el('.note', ...)` or `el('.warning', ...)` |

### Code Example Pattern
```javascript
import { highlightCode } from '../highlighter.js';

el('section.examples', [
  el('h2', 'Examples'),
  el('h3', 'Basic Usage'),
  el('pre', el('code.language-javascript',
    highlightCode(`
      import { createHttp } from 'pulse-js-framework/runtime/http';
      const api = createHttp({ baseURL: '/api' });
      const data = await api.get('/users');
    `, 'javascript')
  ))
]);
```

### Internationalization (i18n)
When updating pages, respect the i18n structure:
```javascript
import { t } from '../i18n/index.js';

el('h1', () => t('pages.http.title')),  // Reactive translation
el('p', () => t('pages.http.intro'))
```

## Files to Never Delete

| Pattern | Reason |
|---------|--------|
| `docs/adr/*.md` | Architecture Decision Records (permanent reference) |
| `docs/milestones/*.md` | Project planning documents |
| `docs/src/**/*` | Documentation website source code |
| `CLAUDE.md` | Project instructions |
| `README.md` | GitHub repository readme |

## Workflow Example

### Input
```
docs/http.md exists with:
- Introduction to HTTP client
- API reference for createHttp()
- Examples for GET/POST/interceptors
```

### Process
1. **Read** `docs/http.md`
2. **Identify** target: `docs/src/pages/HttpPage.js`
3. **Read** `HttpPage.js` to understand current structure
4. **Update** `HttpPage.js`:
   - Add missing examples from markdown
   - Enhance API descriptions
   - Preserve existing structure
5. **Verify** page renders correctly
6. **Delete** `docs/http.md`

### Output
```
✓ Updated HttpPage.js with content from http.md
✓ Added 3 new examples
✓ Enhanced API reference section
✓ Deleted docs/http.md
```

## Error Handling

### If page doesn't exist
- Create new page using template from `assets/page-template.js`
- Add page import to `docs/src/state.js`
- Add route to navigation

### If content is unclear
- Ask for clarification about which page to update
- Suggest multiple options if multiple pages could apply
- Preserve original .md file until confirmed

### If page syntax breaks
- Revert changes
- Report error
- Keep .md file for manual review

## Best Practices

1. **Preserve user content**: Never delete information that exists in pages
2. **Enhance, don't replace**: Add to existing content, improve clarity
3. **Maintain consistency**: Follow existing code style in pages
4. **Test before delete**: Always verify changes work before removing source files
5. **Batch operations**: Process all .md files in one session for consistency
6. **Log thoroughly**: Report all changes for user review

## Commands

This skill responds to:
- "Update documentation from markdown files"
- "Migrate docs/*.md to docs/src/pages/"
- "Sync documentation"
- "Process pending documentation updates"

After completion, the skill will:
- List all updated pages
- List all deleted markdown files
- Provide a summary of changes
- Suggest running `pulse dev` to preview changes
