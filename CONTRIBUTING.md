# Contributing to Pulse Framework

Thank you for your interest in contributing to Pulse! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/vincenthirtz/pulse-js-framework.git
cd pulse-js-framework

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

## Project Structure

```
pulse/
├── runtime/              # Core framework
│   ├── pulse.js         # Reactivity system (signals, effects, computed)
│   ├── dom.js           # DOM creation and reactive bindings
│   ├── router.js        # SPA routing
│   ├── store.js         # Global state management
│   ├── logger.js        # Centralized logging
│   └── native.js        # Mobile platform APIs
├── compiler/            # .pulse file compiler
│   ├── lexer.js         # Tokenizer
│   ├── parser.js        # AST builder
│   └── transformer.js   # Code generator
├── cli/                 # Command-line interface
│   ├── index.js         # Main CLI entry point
│   ├── dev.js           # Dev server
│   ├── build.js         # Production build
│   ├── lint.js          # Linter
│   ├── format.js        # Formatter
│   └── analyze.js       # Bundle analyzer
├── types/               # TypeScript definitions
├── mobile/              # Mobile app bridge
├── examples/            # Example applications
├── test/                # Test suite
└── docs/                # Documentation site
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:compiler    # Compiler tests
npm run test:pulse       # Reactivity tests
npm run test:dom         # DOM tests
npm run test:router      # Router tests
npm run test:store       # Store tests
npm run test:lint        # Lint validation tests
npm run test:format      # Format validation tests
npm run test:analyze     # Analyzer tests
```

### Testing Your Changes

1. Write tests for new features in `test/`
2. Run `npm test` to ensure all tests pass
3. Test with example apps in `examples/`

### Using the CLI Locally

```bash
# Run CLI commands directly
node cli/index.js dev
node cli/index.js build
node cli/index.js compile src/App.pulse
```

## Code Style

### General Guidelines

- **ES Modules** - Use `import`/`export` syntax
- **No external dependencies** - The framework is self-contained
- **Private fields** - Use `#fieldName` syntax for private class members
- **Named exports** - Prefer named exports for public APIs

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `createStore()` |
| Classes | PascalCase | `Pulse` |
| Constants | UPPER_SNAKE_CASE | `LogLevel.DEBUG` |
| Private fields | #camelCase | `#subscribers` |
| Files | kebab-case | `vite-plugin.js` |

### Documentation

All public functions should have JSDoc comments:

```javascript
/**
 * Create a reactive value (pulse/signal)
 * @template T
 * @param {T} initialValue - The initial value
 * @param {PulseOptions} [options] - Configuration options
 * @returns {Pulse<T>} A reactive pulse object
 * @example
 * const count = pulse(0);
 * count.get();  // 0
 * count.set(5);
 */
export function pulse(initialValue, options = {}) {
  // ...
}
```

### Logging

Use the centralized logger instead of `console.log`:

```javascript
import { loggers } from './logger.js';

const log = loggers.store;  // Use appropriate namespace

log.info('Store initialized');
log.warn('Deprecated method used');
log.error('Failed to persist state:', error);
log.debug('State snapshot:', state);  // Only shown at DEBUG level
```

## Making Changes

### Branches

- `main` - Stable release branch
- Feature branches - `feature/your-feature-name`
- Bug fixes - `fix/bug-description`

### Commit Messages

Use clear, descriptive commit messages:

```
Add history plugin to store module

- Implement undo/redo functionality
- Add $canUndo and $canRedo methods
- Limit history to configurable max entries
```

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run `npm test` and ensure all tests pass
5. Submit a pull request with:
   - Clear description of changes
   - Link to related issues (if any)
   - Test coverage for new features

## Adding New Features

### Runtime Features

1. Add implementation to appropriate file in `runtime/`
2. Export from `runtime/index.js`
3. Add TypeScript types to `types/`
4. Add tests to `test/`
5. Update documentation

### Compiler Features

1. Add tokens to `compiler/lexer.js`
2. Add AST nodes to `compiler/parser.js`
3. Add code generation to `compiler/transformer.js`
4. Add tests to `test/compiler.test.js`

### CLI Commands

1. Add command handler to `cli/index.js`
2. Create separate module if complex (e.g., `cli/mycommand.js`)
3. Update help text in `showHelp()`
4. Document in README.md

## Testing Guidelines

Tests use Node.js built-in test runner:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFunction();
    assert.strictEqual(result, expected);
  });
});
```

### Test File Naming

- `test/compiler.test.js` - Compiler tests
- `test/pulse.test.js` - Reactivity tests
- `test/[module].test.js` - Module-specific tests

## Reporting Issues

When reporting bugs, please include:

1. Node.js version (`node --version`)
2. Operating system
3. Steps to reproduce
4. Expected vs actual behavior
5. Relevant code snippets

## Questions?

- Open a [GitHub Issue](https://github.com/vincenthirtz/pulse-js-framework/issues)
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
