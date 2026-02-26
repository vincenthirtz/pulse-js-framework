# IDE Extensions - VS Code extension and IntelliJ plugin for .pulse file support.

## VS Code Extension

**Location:** `vscode-extension/`

### Features
- Syntax highlighting for `.pulse` files
- 16 code snippets (prefix + Tab)
- Bracket matching and auto-closing
- Comment toggling (Ctrl+/)
- Code folding for blocks
- Custom file icons (light/dark themes)

### Syntax Highlighting Covers
- Keywords: `@page`, `@route`, `state`, `view`, `style`, `actions`, `router`, `store`
- Directives: `@click`, `@if`, `@for`, `@model`, `@link`, `@outlet`
- CSS selectors: `.class`, `#id`, `[attribute]`
- PascalCase component names
- String interpolation: `{variable}`
- Comments: `//` and `/* */`
- Embedded CSS in style blocks

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
- Syntax highlighting (customizable: Settings > Editor > Color Scheme > Pulse)
- 19 live templates (type prefix + Tab)
- Custom file icons
- Code folding for `state`, `view`, `style` blocks
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
| `component` | Component with props | Y | Y |
| `state` | State block | Y | Y |
| `view` | View block | Y | Y |
| `style` | Style block | Y | Y |
| `actions` | Actions block | Y | Y |
| `router` | Router configuration | Y | Y |
| `store` | Store configuration | Y | Y |
| `import` | Default import | Y | Y |
| `importn` | Named import | - | Y |
| `@click` | Click handler | Y | Y |
| `@if` | Conditional rendering | Y | Y |
| `@for` | Loop rendering | Y | Y |
| `slot` | Content projection slot | Y | Y |
| `@link` | Router link | - | Y |
| `@outlet` | Router outlet | - | Y |
| `button` | Button with handler | Y | Y |
| `input` | Input with model binding | Y | Y |
| `form` | Form with submit handler | Y | Y |
