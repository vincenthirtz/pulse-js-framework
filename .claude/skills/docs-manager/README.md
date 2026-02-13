# Documentation Manager Skill

This skill automates the process of migrating markdown documentation files into the Pulse documentation website.

## Purpose

The docs-manager skill:
1. Finds all `.md` files in `docs/` directory (excluding ADRs, milestones, and docs/src/)
2. Reads and analyzes their content
3. Updates corresponding page components in `docs/src/pages/`
4. Deletes the processed `.md` files after successful integration

## Usage

Invoke this skill when you have markdown files in the `docs/` directory that need to be integrated into the documentation website:

```
Update documentation from markdown files
```

or

```
/docs-manager
```

## What Gets Processed

### ✅ Files to Process
- `docs/*.md` (root level markdown files)
- Any markdown files not in excluded directories

### ❌ Files to Keep (Never Delete)
- `docs/adr/*.md` - Architecture Decision Records
- `docs/milestones/*.md` - Project planning documents
- `docs/src/**/*` - Documentation website source code
- `CLAUDE.md` - Project instructions
- `README.md` - GitHub repository readme

## File Structure

```
.claude/skills/docs-manager/
├── SKILL.md                    # Main skill definition
├── README.md                   # This file
├── assets/
│   └── page-template.js        # Template for new documentation pages
├── references/
│   ├── file-mapping.md         # Maps .md files to page components
│   └── markdown-to-component.md # Conversion guide
└── scripts/
    └── find-docs.sh            # Helper script to find processable files
```

## How It Works

1. **Discovery**: Scans `docs/` for markdown files
2. **Analysis**: Reads content and identifies target pages
3. **Mapping**: Uses `references/file-mapping.md` to determine which page to update
4. **Conversion**: Converts markdown to Pulse component syntax using `references/markdown-to-component.md`
5. **Update**: Merges content into existing pages or creates new ones
6. **Verification**: Ensures changes don't break the documentation site
7. **Cleanup**: Deletes successfully processed markdown files

## Quick Reference

### Run Helper Script

```bash
.claude/skills/docs-manager/scripts/find-docs.sh
```

This shows all markdown files that will be processed.

### Common File Mappings

| Markdown File | Target Page |
|---------------|-------------|
| `docs/http.md` | `docs/src/pages/HttpPage.js` |
| `docs/websocket.md` | `docs/src/pages/WebSocketPage.js` |
| `docs/graphql.md` | `docs/src/pages/GraphQLPage.js` |
| `docs/accessibility.md` | `docs/src/pages/AccessibilityPage.js` |

### Creating New Pages

If a markdown file doesn't have a corresponding page:
1. Use `assets/page-template.js` as a starting point
2. Create new page in `docs/src/pages/`
3. Add import to `docs/src/state.js`
4. Add route to navigation

## Best Practices

- **Review changes**: Always review the updated pages before committing
- **Test locally**: Run `pulse dev` to verify changes render correctly
- **Preserve content**: The skill enhances existing content, never replaces it
- **Batch processing**: Process all `.md` files in one session for consistency

## Safety Features

- Never deletes ADRs or milestone documents
- Always preserves existing page structure
- Asks for confirmation before making major changes
- Keeps `.md` files if update fails or content is unclear
- Reports all changes for user review

## Examples

### Basic Usage

```
User: "Update documentation from markdown files"

Skill:
1. Found 8 markdown files to process
2. Updated HttpPage.js with content from http.md
3. Updated WebSocketPage.js with content from websocket.md
4. Created new GraphQLPage.js from graphql.md
5. Deleted 8 processed markdown files
6. Summary: 2 pages updated, 1 page created

Suggestion: Run 'pulse dev' to preview changes
```

### Partial Processing

```
User: "Migrate http.md to the documentation site"

Skill:
1. Reading docs/http.md
2. Target page: HttpPage.js
3. Added 3 new examples
4. Enhanced API reference section
5. Deleted docs/http.md

Changes:
- docs/src/pages/HttpPage.js (updated)
- docs/http.md (deleted)
```

## Troubleshooting

### Page Not Found Error
If the skill can't determine which page to update:
- Check `references/file-mapping.md` for the correct mapping
- Create a new page using `assets/page-template.js`
- Update the file mapping reference

### Syntax Error After Update
If the updated page has syntax errors:
- The skill should automatically revert changes
- Original `.md` file is preserved
- Report the issue for manual review

### Content Unclear
If markdown content doesn't clearly map to a page:
- Skill asks for clarification
- Suggests possible target pages
- Waits for user input before proceeding

## Related Skills

- **senior-developer**: For implementing new page components
- **qa-testing**: For testing updated documentation pages
- **software-architect**: For planning new documentation structure

## Maintenance

To update the skill:
1. Edit `SKILL.md` for instructions and workflow changes
2. Update `references/file-mapping.md` when adding new pages
3. Improve `references/markdown-to-component.md` with new conversion patterns
4. Modify `assets/page-template.js` to reflect best practices
