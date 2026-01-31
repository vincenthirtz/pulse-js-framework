# Pulse Language Plugin for IntelliJ IDEA

IntelliJ IDEA plugin for `.pulse` file support in the Pulse framework.

## Features

- **Syntax Highlighting** - Full highlighting for Pulse DSL
- **Live Templates** - 17 snippets for common patterns
- **File Icons** - Custom icons for `.pulse` files
- **Code Folding** - Collapse `state`, `view`, `style` blocks
- **Comments** - `Ctrl+/` (line) and `Ctrl+Shift+/` (block)
- **Bracket Matching** - Auto-closing for `{}`, `[]`, `()`
- **Color Settings** - Customize in Settings > Editor > Color Scheme > Pulse

## Compatibility

- IntelliJ IDEA 2023.3+
- WebStorm 2023.3+
- PyCharm 2023.3+
- All JetBrains IDEs based on IntelliJ Platform

## Installation

### Option 1: From JetBrains Marketplace

1. Open **Settings/Preferences** > **Plugins**
2. Click **Marketplace**
3. Search for "Pulse Language"
4. Click **Install**
5. Restart the IDE

### Option 2: Manual Installation

1. Download the `.zip` file from releases
2. Open **Settings/Preferences** > **Plugins**
3. Click the gear icon > **Install Plugin from Disk...**
4. Select the `.zip` file
5. Restart the IDE

### Option 3: Build from Source

```bash
cd intellij-plugin
./gradlew buildPlugin
```

The plugin will be generated in `build/distributions/pulse-language-1.0.0.zip`.

## Live Templates (Snippets)

Type the prefix and press `Tab` to insert the template:

| Prefix | Description |
|--------|-------------|
| `page` | New Pulse component |
| `component` | Component with props |
| `state` | State block |
| `view` | View block |
| `style` | Style block |
| `actions` | Actions block |
| `router` | Router configuration |
| `store` | Store configuration |
| `import` | Import component |
| `importn` | Named import |
| `@click` | Click handler |
| `@if` | Conditional rendering |
| `@for` | Loop rendering |
| `slot` | Content projection slot |
| `@link` | Router link |
| `@outlet` | Router outlet |
| `button` | Button with handler |
| `input` | Input with binding |
| `form` | Form with submit |

## Color Settings

To customize syntax colors:

1. Open **Settings/Preferences** > **Editor** > **Color Scheme** > **Pulse**
2. Modify colors for each element:
   - Comments (line and block)
   - Strings
   - Numbers
   - Keywords
   - Components
   - Directives (@click, @if, etc.)
   - CSS selectors (.class, #id)
   - Operators

## Development

### Prerequisites

- JDK 17+
- Gradle 8+

### Useful Commands

```bash
# Build the plugin
./gradlew buildPlugin

# Run test IDE instance
./gradlew runIde

# Verify compatibility
./gradlew verifyPlugin

# Publish to Marketplace (requires token)
./gradlew publishPlugin
```

### Project Structure

```
intellij-plugin/
├── build.gradle.kts              # Gradle configuration
├── settings.gradle.kts           # Gradle settings
├── gradle.properties             # Properties
└── src/main/
    ├── kotlin/com/pulse/intellij/
    │   ├── PulseLanguage.kt      # Language definition
    │   ├── PulseFileType.kt      # File type
    │   ├── PulseLexer.kt         # Lexer
    │   ├── PulseParser.kt        # Parser
    │   ├── PulseSyntaxHighlighter.kt
    │   ├── PulseCommenter.kt     # Comment support
    │   ├── PulseBracketMatcher.kt
    │   ├── PulseFoldingBuilder.kt
    │   └── ...
    └── resources/
        ├── META-INF/plugin.xml   # Plugin configuration
        ├── syntaxes/pulse.tmLanguage.json
        ├── liveTemplates/Pulse.xml
        └── icons/pulse.svg
```

## License

MIT License - see LICENSE file in the main repository.

## Links

- [Pulse Documentation](https://github.com/vincenthirtz/pulse-js-framework)
- [VS Code Extension](../vscode-extension/)
- [Report a bug](https://github.com/vincenthirtz/pulse-js-framework/issues)
