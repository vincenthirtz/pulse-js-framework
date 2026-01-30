# Pulse Language for VSCode

Syntax highlighting, snippets, and language support for Pulse framework `.pulse` files.

## Features

- Syntax highlighting for `.pulse` files
- Code snippets for common patterns
- Bracket matching and auto-closing
- Comment toggling (Ctrl+/)
- Code folding for blocks

## Installation

### Option 1: Local Installation (Development)

1. Copy the `vscode-extension` folder to your VSCode extensions directory:
   - **Windows:** `%USERPROFILE%\.vscode\extensions\pulse-language`
   - **macOS/Linux:** `~/.vscode/extensions/pulse-language`

2. Restart VSCode

### Option 2: Using VSIX Package

1. Convert the icon for marketplace (requires ImageMagick or similar):
   ```bash
   # Using ImageMagick
   magick icons/pulse-icon.svg -resize 128x128 icons/pulse-icon.png
   ```
   Then add `"icon": "icons/pulse-icon.png"` to package.json.

2. Package the extension:
   ```bash
   cd vscode-extension
   npx vsce package
   ```

3. Install from VSIX:
   - Open VSCode
   - Press `Ctrl+Shift+P` (Cmd+Shift+P on macOS)
   - Type "Install from VSIX"
   - Select the generated `.vsix` file

## Snippets

| Prefix | Description |
|--------|-------------|
| `page` | Create a new Pulse page |
| `component` | Create a component with props |
| `state` | Add state block |
| `view` | Add view block |
| `style` | Add style block |
| `actions` | Add actions block |
| `router` | Add router configuration |
| `store` | Add store configuration |
| `import` | Import a component |
| `@click` | Add click handler |
| `@if` | Conditional rendering |
| `@for` | Loop rendering |
| `slot` | Content projection slot |
| `button` | Button with click handler |
| `input` | Input with model binding |
| `form` | Form with submit handler |

## Icons

The extension includes lightning bolt icons for `.pulse` files:
- `icons/pulse-light.svg` - File icon for light themes
- `icons/pulse-dark.svg` - File icon for dark themes
- `icons/pulse-icon.svg` - Extension marketplace icon (convert to PNG for publishing)

## Syntax Highlighting

The extension provides highlighting for:

- **Keywords:** `@page`, `@route`, `state`, `view`, `style`, `actions`, `router`, `store`
- **Directives:** `@click`, `@if`, `@for`, `@model`, `@link`, `@outlet`
- **CSS Selectors:** `.class`, `#id`, `[attribute]`
- **Components:** PascalCase identifiers (e.g., `MyComponent`)
- **Strings:** Double and single quoted
- **Interpolation:** `{variable}` in strings
- **Comments:** `//` and `/* */`
- **Embedded CSS:** Full CSS highlighting in style blocks

## Example

```pulse
@page Counter

import Button from './Button.pulse'

state {
  count: 0
}

actions {
  increment() {
    this.count++
  }
}

view {
  .counter {
    h1 "Count: {count}"
    Button @click(increment) "+"
  }
}

style {
  .counter {
    text-align: center;
    padding: 20px;
  }
}
```

## License

MIT
