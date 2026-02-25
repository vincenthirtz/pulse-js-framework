# CLI Reference - All `pulse` CLI commands, flags, and configuration.

## Project Commands

| Command | Description |
|---------|-------------|
| `pulse create <name>` | Create new project |
| `pulse create <name> --typescript` | TypeScript project |
| `pulse create <name> --todo\|--blog\|--chat\|--ecommerce\|--dashboard` | Create from template |
| `pulse init` | Initialize in current directory |
| `pulse init --typescript` | Initialize TypeScript project |

## Dev / Build / Preview

| Command | Description |
|---------|-------------|
| `pulse dev [port]` | Dev server (default: 3000) with HMR + source maps |
| `pulse build` | Production build with minification → `dist/` |
| `pulse preview [port]` | Serve `dist/` locally (default: 4173) |

## Compile

```bash
pulse compile <file>              # Single file
pulse compile src/**/*.pulse      # Multiple files
pulse compile src/ --watch        # Watch mode
pulse compile <file> --dry-run    # Preview without writing
pulse compile <file> --out dist/  # Custom output directory
```

## Create .pulse Files

```bash
pulse new <name>                     # src/components/<Name>.pulse
pulse new <name> --type page         # src/pages/<Name>.pulse
pulse new <name> --type layout       # src/layouts/<Name>.pulse
pulse new <name> --props             # Include props section
pulse new <name> -d src/ui           # Custom output directory
```

## Code Quality

| Command | Description |
|---------|-------------|
| `pulse lint [files]` | Validate .pulse files (undefined refs, unused imports, naming, empty blocks) |
| `pulse lint --fix` | Auto-fix fixable issues |
| `pulse format [files]` | Format .pulse files (2-space indent, sorted imports, consistent braces) |
| `pulse format --check` | Check formatting without writing (CI mode) |
| `pulse analyze` | Bundle analysis (file count, size, complexity, import graph, dead code) |
| `pulse analyze --json` | JSON output |
| `pulse analyze --verbose` | Detailed metrics |

## Testing

| Command | Description |
|---------|-------------|
| `pulse test` | Run tests (Node.js built-in test runner) |
| `pulse test --coverage` | With coverage report |
| `pulse test --watch` | Watch mode |
| `pulse test --create <name>` | Generate test file from template |

## Scaffolding

```bash
pulse scaffold component <name>    # UI component
pulse scaffold page <name>         # Page with routing
pulse scaffold store <name>        # Store module
pulse scaffold hook <name>         # Custom hook (use* prefix)
pulse scaffold service <name>      # API service
pulse scaffold context <name>      # Context provider
pulse scaffold layout <name>       # Layout component
```

## Documentation

```bash
pulse docs --generate                    # Markdown docs
pulse docs --generate --format html      # HTML docs
pulse docs --generate --format json      # JSON docs
```

## Diagnostics

```bash
pulse doctor             # Check Node.js version, package.json, deps, config, syntax, circular deps
pulse doctor --verbose   # Detailed output
```

## Mobile Commands

| Command | Description |
|---------|-------------|
| `pulse mobile init` | Create `android/` and `ios/` directories |
| `pulse mobile build android` | Build Android APK |
| `pulse mobile build ios` | Build iOS app (macOS + Xcode) |
| `pulse mobile run android` | Run on device/emulator |
| `pulse mobile run ios` | Run on iOS simulator |

## Configuration (`pulse.config.js`)

```javascript
export default {
  src: 'src',
  dist: 'dist',
  dev: { port: 3000, open: true },
  build: { minify: true, sourcemaps: true }
};
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PULSE_PORT` | Default dev server port |
| `PULSE_HOST` | Dev server host (default: localhost) |
| `NODE_ENV` | `production` for optimized builds |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (syntax, validation, runtime) |
| 2 | Invalid arguments |

## CI/CD Integration

```bash
pulse format --check    # Fails if files need formatting
pulse lint              # Validate .pulse files
pulse build             # Production build
```

## Glob Patterns

```bash
pulse lint "src/**/*.pulse"
pulse compile "components/*.pulse"
pulse format "src/{App,Home}.pulse"
```
