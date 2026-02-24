---
name: syntax-highlighter
description: Syntax highlighting agent for the Pulse JS framework VS Code extension. Use this skill to improve, fix, or extend TextMate grammar rules in the .pulse file syntax highlighter. Handles tmLanguage.json updates, scope assignments, regex patterns, and testing against real .pulse files.
---

# Syntax Highlighter for Pulse Framework

## When to Use This Skill

- Improving syntax highlighting for .pulse files in VS Code
- Adding new grammar rules for new language features
- Fixing incorrect or missing highlighting patterns
- Extending TextMate scopes for better color differentiation
- Testing grammar changes against real .pulse examples
- Updating the grammar after compiler/parser changes (new directives, operators, blocks)

## Key Files

| File | Purpose |
|------|---------|
| `vscode-extension/syntaxes/pulse.tmLanguage.json` | **Main grammar file** - TextMate JSON grammar for .pulse syntax |
| `vscode-extension/package.json` | Extension manifest (language registration, themes) |
| `vscode-extension/themes/` | Color themes for Pulse (if present) |
| `compiler/lexer.js` | **Source of truth** for all tokens and keywords |
| `compiler/parser/` | **Source of truth** for all syntax constructs (blocks, directives, expressions) |
| `examples/**/*.pulse` | Real .pulse files to test highlighting against |

## Grammar Architecture

The TextMate grammar is context-based with these top-level patterns:

```
source.pulse
├── comments           → //, /* */, /** JSDoc */
├── use-directive      → 'use client', 'use server'
├── imports            → import ... from '...'
├── page-component-declaration → @page Name, @component Name
├── route-declaration  → @route "/path"
├── block-state        → state { prop: value }
├── block-props        → props { prop: value }
├── block-view         → view { elements, directives, text }
├── block-actions      → actions { methods, JS code }
├── block-style        → style { CSS, SASS, LESS, Stylus }
├── block-router       → router { routes, config }
├── block-store        → store { state, actions, getters }
├── block-routes       → routes { path: Component }
└── block-getters      → getters { computed methods }
```

## Scope Naming Conventions

Follow the TextMate scope naming guide strictly:

| Category | Scope Pattern | Example |
|----------|---------------|---------|
| Block keywords | `keyword.other.<block>.pulse` | `keyword.other.state.pulse` |
| Control flow | `keyword.control.flow.pulse` | `@if`, `@for`, `@each`, `@else` |
| Directives | `entity.other.attribute-name.directive.pulse` | `@click`, `@model`, `@a11y` |
| Directive modifiers | `entity.other.attribute-name.modifier.pulse` | `.prevent`, `.stop`, `.lazy` |
| HTML tags | `entity.name.tag.pulse` | `div`, `span`, `button` |
| CSS classes | `entity.other.attribute-name.class.css.pulse` | `.container` |
| CSS IDs | `entity.other.attribute-name.id.css.pulse` | `#main` |
| Components | `entity.name.type.component.pulse` | `UserCard`, `Modal` |
| Declarations | `keyword.control.declaration.pulse` | `@page`, `@component` |
| Variables | `variable.other.readwrite.pulse` | identifiers in expressions |
| Properties | `variable.other.property.pulse` | after `.` or `?.` |
| Functions | `entity.name.function.pulse` | before `(` in expressions |
| Strings | `string.quoted.double.pulse` | `"text"` |
| Interpolation | `meta.interpolation.pulse` | `{expr}` inside strings |
| Numbers | `constant.numeric.*.pulse` | `42`, `0xFF`, `123n` |
| Constants | `constant.language.pulse` | `true`, `false`, `null` |
| Operators | `keyword.operator.pulse` | `+`, `===`, `??`, `?.` |
| SASS vars | `variable.scss` | `$primary` |
| LESS vars | `variable.less` | `@primary` |
| Stylus vars | `variable.stylus` | `primary =` |
| CSS properties | `support.type.property-name.css` | `color:`, `display:` |
| CSS functions | `support.function.css` | `calc()`, `var()` |
| CSS at-rules | `keyword.control.at-rule.css` | `@media`, `@keyframes` |

## Complete .pulse Syntax Reference

### All Directives (from compiler/parser)

**Control flow:**
- `@if(expr)`, `@else-if(expr)`, `@else`, `@for(item of items)`, `@each(item of items)`

**Events (any DOM event):**
- `@click(expr)`, `@input(expr)`, `@change(expr)`, `@submit(expr)`, `@keydown(expr)`, `@blur(expr)`, `@focus(expr)`, `@dblclick(expr)`, `@mouseenter(expr)`, `@mouseleave(expr)`, `@dragenter(expr)`, `@dragover(expr)`, `@dragleave(expr)`, `@drop(expr)`, etc.
- Modifiers: `.prevent`, `.stop`, `.capture`, `.once`, `.passive`, `.self`

**Two-way binding:**
- `@model(binding)` with modifiers `.lazy`, `.trim`, `.number`

**Accessibility:**
- `@a11y(role=val, label=val)`, `@live(polite|assertive)`, `@focusTrap`, `@focusTrap(opts)`, `@srOnly`

**SSR:**
- `@client`, `@server`

**Lifecycle:**
- `@mount(handler)`, `@unmount(handler)`

**Router:**
- `@link(path)`, `@navigate(path)`, `@outlet`, `@back`, `@forward`

### All Block Types (from compiler/lexer KEYWORDS)
`state`, `props`, `view`, `actions`, `style`, `router`, `store`, `routes`, `getters`

### Expression Tokens (from compiler/lexer)
- Operators: `+`, `-`, `*`, `/`, `%`, `**`, `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`, `??`, `?.`, `...`, `=>`, `++`, `--`, `+=`, `-=`, `*=`, `/=`, `%=`, `??=`, `||=`, `&&=`, `>>`, `<<`, `>>>`, `&`, `|`, `^`, `~`, `?`, `:`
- Literals: numbers (decimal, hex, binary, octal, BigInt, numeric separators), strings, template literals, `true`, `false`, `null`, `undefined`, `NaN`, `Infinity`
- Keywords: `if`, `else`, `return`, `typeof`, `instanceof`, `new`, `delete`, `void`, `async`, `await`, `throw`, `try`, `catch`, `finally`, `for`, `while`, `const`, `let`, `var`, `function`, `class`, `this`, `super`, `yield`

## Implementation Rules

### 1. Always Read Before Editing
Read `pulse.tmLanguage.json` in full before making changes. Understand the existing pattern structure.

### 2. Test Against Real Files
After changes, verify highlighting works on example .pulse files in `examples/` directory.

### 3. Context Isolation
Ensure patterns only match in their correct context:
- View directives (`@if`, `@click`, etc.) only inside `block-view`
- SASS/LESS/Stylus only inside `block-style`
- Method definitions only inside `block-actions` or `block-getters`

### 4. Order Matters
TextMate applies the first matching pattern. Put more specific patterns before generic ones:
- `@else-if` before `@else` before generic `@directive`
- `@keyframes name` before generic `@at-rule`
- `@mixin name` before generic `@mixin`

### 5. Regex Best Practices
- Use `\\b` for word boundaries to prevent partial matches
- Use non-capturing groups `(?:...)` when grouping without capture
- Use lookbehind `(?<=...)` and lookahead `(?=...)` for context-sensitive matching
- Escape special regex chars: `\\{`, `\\}`, `\\[`, `\\]`, `\\(`, `\\)`, `\\.`, `\\*`
- Test regex patterns at regex101.com with JavaScript flavor

### 6. Recursive Patterns
For nested structures (braces inside braces), create `-nested-*` rules that include themselves:
```json
"style-nested-block": {
  "begin": "\\{",
  "end": "\\}",
  "patterns": [{ "include": "#style-body" }]
}
```

### 7. Embedded Languages
- Style blocks embed CSS: use `"contentName": "source.css.embedded.pulse"`
- Action blocks embed JS: use `{ "include": "source.js" }` as fallback
- Keep Pulse-specific patterns above embedded language includes

## Known Gaps to Address

### Priority 1 (Functional gaps):
1. ~~**`@each` directive**~~ - FIXED: `view-control-flow-for` uses `(@(?:for|each))`
2. ~~**`@focusTrap` no-args**~~ - FIXED: Added to `view-directive-no-args`

### Priority 2 (Enhancements):
3. ~~**Route params**~~ - FIXED: `:param` and `*wildcard` highlighted via `route-params` rule
4. **`@else @if` pattern** - Could be matched as compound keyword (low priority, `@else-if` is canonical)
5. ~~**CSS class/ID selectors in style blocks**~~ - FIXED: Added `css-class-selector` and `css-id-selector` to `style-body`
6. **Punctuation scoping** - Semicolons, commas, braces could have explicit punctuation scopes for theme authors
7. ~~**`&.class` and `&#id` in style blocks**~~ - FIXED: Added to `style-css-ampersand-pseudo`
8. ~~**Lifecycle directives**~~ - FIXED: `@mount`/`@unmount` get `directive.lifecycle` scope
9. ~~**`@extends` for Stylus**~~ - FIXED: `style-sass-extend` and `style-sass-at-rule` accept `@extends`
10. ~~**Wildcard `*` selector**~~ - FIXED: `style-css-wildcard` rule added

### Priority 3 (Nice-to-have):
11. **LESS mixin definitions** - Not distinctly styled vs CSS classes
12. **Stylus variable refs** - Bare identifiers as variable references are inherently ambiguous
13. **Regex literals** - Not currently supported in expressions (low priority)
14. ~~**Tag selectors in style blocks**~~ - FIXED: `style-css-tag-selector` with negative lookbehind `(?<![\w-])` to avoid `.data-table` false positives
15. ~~**Keyframe selectors (`from`/`to`)**~~ - FIXED: `style-css-keyframe-selector` matches before `{`
16. ~~**Percentage selectors in keyframes**~~ - FIXED: `style-css-percentage-selector` matches `50% {`
17. ~~**CSS attribute selectors in style**~~ - FIXED: `style-css-attribute-selector` handles `[type="text"]`, `[disabled]`, `[class~="foo"]`
18. ~~**CSS color names**~~ - FIXED: `style-css-color-name` highlights 148 named CSS colors (`white`, `red`, `transparent`, etc.)
19. ~~**Comma punctuation in selectors**~~ - FIXED: `style-css-comma` scopes commas as `punctuation.separator.list.comma.css`
20. ~~**Media query keywords**~~ - FIXED: `style-css-media-keyword` highlights `and`, `or`, `not`, `only`, `screen`, `print`, etc.

## Workflow

1. **Identify gap** - Compare grammar rules against compiler lexer/parser tokens
2. **Write pattern** - Create TextMate rule with correct scope names
3. **Test in context** - Verify pattern works inside correct block (view/style/actions)
4. **Check for conflicts** - Ensure new pattern doesn't break existing highlighting
5. **Update this skill** - Document new patterns added for future reference
