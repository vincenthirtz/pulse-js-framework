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

Options:
- `--typescript` - Create a TypeScript project with type definitions

```bash
pulse create my-app --typescript
```

#### `pulse init`

Initialize Pulse in the current directory (useful for existing projects).

```bash
pulse init              # Initialize JavaScript project
pulse init --typescript # Initialize TypeScript project
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

#### `pulse new <name>`

Quickly create a new `.pulse` file with boilerplate.

```bash
pulse new Button                      # Create src/components/Button.pulse
pulse new UserProfile --type page     # Create src/pages/UserProfile.pulse
pulse new Main --type layout          # Create src/layouts/Main.pulse
pulse new Counter --props             # Include props section
pulse new Modal -d src/ui             # Custom output directory
```

Options:
- `--type <type>` - Component type: `component` (default), `page`, `layout`
- `--props` - Include a props section in the template
- `-d, --dir <path>` - Custom output directory

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

### Testing Commands

#### `pulse test`

Run tests using the Node.js built-in test runner.

```bash
pulse test                    # Run all tests
pulse test --coverage         # Run with coverage report
pulse test --watch            # Watch mode
pulse test --create <name>    # Generate a test file
```

Options:
- `--coverage` - Generate code coverage report
- `--watch` - Watch for file changes and re-run tests
- `--create <name>` - Create a new test file from template

---

### Scaffolding Commands

#### `pulse scaffold <type> <name>`

Generate code from templates for common patterns.

```bash
pulse scaffold component Button    # Generate component
pulse scaffold page Dashboard      # Generate page with routing
pulse scaffold store cart          # Generate store module
pulse scaffold hook useTimer       # Generate custom hook
pulse scaffold service api         # Generate API service
pulse scaffold context theme       # Generate context provider
pulse scaffold layout admin        # Generate layout component
```

Available types:
- `component` - UI component with state and view
- `page` - Page component (PascalCase enforced)
- `store` - Store module with state and actions
- `hook` - Custom hook (use* prefix enforced)
- `service` - API service with HTTP methods
- `context` - Context provider with useContext hook
- `layout` - Layout component for page structure

---

### Documentation Commands

#### `pulse docs`

Generate API documentation from your codebase.

```bash
pulse docs --generate                # Generate Markdown docs
pulse docs --generate --format html  # Generate HTML docs
pulse docs --generate --format json  # Generate JSON (for tooling)
```

Options:
- `--generate` - Generate documentation
- `--format <format>` - Output format: `markdown` (default), `html`, `json`

---

### Diagnostic Commands

#### `pulse doctor`

Run project diagnostics to identify issues.

```bash
pulse doctor              # Run all diagnostics
pulse doctor --verbose    # Detailed output
```

Checks performed:
- Node.js version compatibility
- Package.json validity
- Dependency issues
- Configuration errors
- Pulse file syntax errors
- Circular dependencies

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
