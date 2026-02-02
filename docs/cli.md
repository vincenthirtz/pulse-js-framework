# Pulse CLI Commands

The Pulse CLI provides commands for project management, development, and code quality.

## Installation

The CLI is included with the framework:

```bash
npm install pulse-js-framework
```

## Commands

### Project Commands

#### `pulse create <name>`

Create a new Pulse project with the recommended structure.

```bash
pulse create my-app
cd my-app
npm install
npm run dev
```

#### `pulse dev [port]`

Start the development server with hot module replacement.

```bash
pulse dev          # Default port 3000
pulse dev 8080     # Custom port
```

Features:
- Live reload on file changes
- HMR for `.pulse` files
- Source map support

#### `pulse build`

Build for production with minification.

```bash
pulse build
```

Output is written to the `dist/` directory.

#### `pulse preview [port]`

Preview the production build locally.

```bash
pulse preview         # Default port 4173
pulse preview 5000    # Custom port
```

#### `pulse compile <file> [options]`

Compile a `.pulse` file to JavaScript.

```bash
pulse compile src/App.pulse                    # Single file
pulse compile src/**/*.pulse                   # Multiple files
pulse compile src/ --watch                     # Watch mode
pulse compile src/App.pulse --dry-run          # Preview without writing
pulse compile src/App.pulse --out dist/        # Custom output directory
```

Options:
- `--watch, -w` - Watch for changes and recompile
- `--dry-run` - Preview compilation without writing files
- `--out <dir>` - Output directory (default: same as source)

---

### Code Quality Commands

#### `pulse lint [files]`

Validate `.pulse` files for errors and style issues.

```bash
pulse lint                    # Lint current directory
pulse lint src/               # Lint specific directory
pulse lint "**/*.pulse"       # Glob pattern
pulse lint --fix              # Auto-fix fixable issues
```

**Checks performed:**
- Undefined references (state variables, components)
- Unused imports and state variables
- Naming conventions (PascalCase for pages, camelCase for state)
- Empty blocks
- Import order

#### `pulse format [files]`

Format `.pulse` files with consistent style.

```bash
pulse format                  # Format current directory
pulse format src/App.pulse    # Format specific file
pulse format --check          # Check without writing (CI mode)
```

**Formatting rules:**
- 2-space indentation
- Sorted imports (alphabetically)
- Consistent brace placement
- Proper spacing around operators

#### `pulse analyze [options]`

Analyze your Pulse project for bundle insights.

```bash
pulse analyze                 # Console report
pulse analyze --json          # JSON output
pulse analyze --verbose       # Detailed metrics
```

**Analysis includes:**
- File count and total size
- Component complexity scores
- Import dependency graph
- Dead code detection (unreachable files)

Example output:
```
Pulse Project Analysis
══════════════════════

Files: 12
Total Size: 45.2 KB

Top 5 by Complexity:
  1. Dashboard.pulse (score: 42)
  2. UserList.pulse (score: 28)
  3. App.pulse (score: 15)

Import Graph:
  App.pulse
  ├── Header.pulse
  ├── Sidebar.pulse
  └── Dashboard.pulse
      └── Chart.pulse

Dead Files (unreachable):
  - src/unused/OldComponent.pulse
```

---

### Mobile Commands

#### `pulse mobile init`

Initialize mobile platforms (Android and/or iOS).

```bash
pulse mobile init
```

This creates:
- `android/` - Android project files
- `ios/` - iOS project files (macOS only)

#### `pulse mobile build <platform>`

Build native app for a platform.

```bash
pulse mobile build android    # Build Android APK
pulse mobile build ios        # Build iOS app (requires macOS + Xcode)
```

Prerequisites:
- Android: Android SDK and Java JDK
- iOS: macOS with Xcode

#### `pulse mobile run <platform>`

Run the app on a device or emulator.

```bash
pulse mobile run android      # Run on Android device/emulator
pulse mobile run ios          # Run on iOS simulator
```

---

## Configuration

The CLI reads configuration from `pulse.config.js` if present:

```javascript
export default {
  // Source directory
  src: 'src',

  // Output directory for build
  dist: 'dist',

  // Dev server options
  dev: {
    port: 3000,
    open: true
  },

  // Build options
  build: {
    minify: true,
    sourcemaps: true
  }
};
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PULSE_PORT` | Default dev server port |
| `PULSE_HOST` | Dev server host (default: localhost) |
| `NODE_ENV` | Set to `production` for optimized builds |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (syntax, validation, or runtime error) |
| 2 | Invalid arguments |

---

## Tips

### Watch Mode for Development

Use watch mode during development for instant feedback:

```bash
# Watch and compile
pulse compile src/ --watch

# In another terminal
pulse dev
```

### CI/CD Integration

Use check modes for CI pipelines:

```bash
# Format check (fails if files need formatting)
pulse format --check

# Lint check
pulse lint

# Build
pulse build
```

### Glob Patterns

The CLI supports glob patterns:

```bash
pulse lint "src/**/*.pulse"           # All .pulse files in src
pulse compile "components/*.pulse"     # All in components/
pulse format "src/{App,Home}.pulse"    # Specific files
```
