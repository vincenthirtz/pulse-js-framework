# IDE Extensions - VS Code extension and IntelliJ plugin for .pulse file support.

## VS Code Extension

**Location:** `vscode-extension/`

### Features
- Syntax highlighting for `.pulse` files (129 grammar rules)
- 51 code snippets (prefix + Tab)
- Bracket matching, auto-closing, colorized bracket pairs
- Comment toggling (Ctrl+/)
- Code folding for all blocks + CSS at-rules
- Custom file icons (light/dark themes)
- Smart indentation for blocks and directives

### Syntax Highlighting Covers
- Keywords: `@page`, `@component`, `@route`, `state`, `view`, `style`, `actions`, `router`, `store`, `routes`, `getters`
- Control flow: `@if`, `@else-if`, `@else`, `@for`, `@each`
- Event directives: `@click`, `@input`, `@submit`, + 40 more DOM events (clipboard, animation, transition, composition, pointer, focus, etc.)
- Binding: `@model` (with `.lazy`/`.trim`/`.number` modifiers), `@bind`, `@on`
- A11y: `@a11y`, `@live`, `@focusTrap`, `@srOnly`
- Router: `@link`, `@navigate`, `@outlet`, `@back`, `@forward`
- Lifecycle: `@mount`, `@unmount`
- SSR: `@client`, `@server`, `'use client'`/`'use server'`
- CSS selectors: `.class`, `#id`, `[attribute]`, `*`, combinators (`>`, `+`, `~`)
- CSS: pseudo-classes (45+), pseudo-elements (15+), at-rules, keyframes, media queries, container queries
- CSS preprocessors: SASS/SCSS (`$var`, `@mixin`, `@include`), LESS (`@var`, guards), Stylus (`var =`, `+mixin`)
- Expressions: all JS operators (incl. `??`, `?.`, `??=`, `||=`, `&&=`), BigInt, numeric separators
- PascalCase component names, arrow functions, built-in globals (40+)
- String interpolation: `{variable}` and `${expr}` in template literals

### Installation

**Local (dev):** Copy `vscode-extension/` to `~/.vscode/extensions/pulse-language`, restart VS Code.

**VSIX package:**
```bash
cd vscode-extension && npx vsce package
# Then: Ctrl+Shift+P > "Install from VSIX" > select .vsix file
```

## IntelliJ Plugin

**Location:** `intellij-plugin/`

### Compatibility
- IntelliJ IDEA 2023.3+, WebStorm 2023.3+, PyCharm 2023.3+, all JetBrains IDEs

### Features
- Syntax highlighting (identical grammar, customizable: Settings > Editor > Color Scheme > Pulse)
- 19 live templates (type prefix + Tab)
- Custom file icons
- Code folding for all blocks
- Comments: `Ctrl+/` (line), `Ctrl+Shift+/` (block)
- Bracket matching and auto-closing

### Installation

- **Marketplace:** Settings > Plugins > Marketplace > "Pulse Language" > Install
- **Manual:** Settings > Plugins > gear > Install Plugin from Disk > select `.zip`
- **Build from source** (JDK 17+, Gradle 8+): `cd intellij-plugin && ./gradlew buildPlugin`

### Development Commands

```bash
./gradlew buildPlugin     # Build .zip
./gradlew runIde          # Run test IDE instance
./gradlew verifyPlugin    # Verify compatibility
./gradlew publishPlugin   # Publish (requires token)
```

## Snippet / Live Template Reference

| Prefix | Description | VS Code | IntelliJ |
|--------|-------------|:-------:|:--------:|
| `page` | New page component | Y | Y |
| `pagefull` | Full page (all blocks) | Y | - |
| `component` | Component with props | Y | Y |
| `state` | State block | Y | Y |
| `props` | Props block | Y | - |
| `view` | View block | Y | Y |
| `style` | Style block | Y | Y |
| `stylesass` | Style with SASS vars | Y | - |
| `actions` | Actions block | Y | Y |
| `router` | Router configuration | Y | Y |
| `routerguard` | Router with guards | Y | - |
| `store` | Store configuration | Y | Y |
| `storegetters` | Store with getters | Y | - |
| `getters` | Getters block | Y | Y |
| `import` | Default import | Y | Y |
| `importn` | Named import | Y | Y |
| `importns` | Namespace import | Y | - |
| `@click` | Click handler | Y | Y |
| `@submit` | Submit with preventDefault | Y | - |
| `@if` | Conditional rendering | Y | Y |
| `@ifelse` | If/else conditional | Y | - |
| `@else-if` | Else-if branch | Y | - |
| `@for` | Loop rendering | Y | Y |
| `@each` | Each loop | Y | Y |
| `@eachi` | Each with index | Y | - |
| `slot` | Content projection slot | Y | Y |
| `slotfb` | Slot with fallback | Y | - |
| `@slot` | Named slot usage | Y | - |
| `@link` | Router link | Y | Y |
| `@navigate` | Programmatic navigation | Y | - |
| `@outlet` | Router outlet | Y | Y |
| `@model` | Two-way data binding | Y | Y |
| `@modelm` | Model with modifiers | Y | - |
| `@bind` | Attribute binding | Y | Y |
| `@on` | Generic event handler | Y | Y |
| `@a11y` | Accessibility attrs | Y | Y |
| `@live` | Live region | Y | Y |
| `@livep` | Polite live region | Y | - |
| `@focusTrap` | Focus trap | Y | - |
| `@srOnly` | Screen reader only | Y | - |
| `@mount` | Mount lifecycle | Y | - |
| `@unmount` | Unmount lifecycle | Y | - |
| `@client` | Client-only (SSR) | Y | - |
| `@server` | Server-only (SSR) | Y | - |
| `useclient` | 'use client' directive | Y | - |
| `useserver` | 'use server' directive | Y | - |
| `button` | Button with handler | Y | Y |
| `input` | Input with model | Y | Y |
| `form` | Form with submit | Y | Y |
| `select` | Select dropdown | Y | - |
| `dialog` | Accessible modal | Y | - |
