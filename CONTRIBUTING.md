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

### Branch Strategy (Git Flow)

We use **Git Flow** for development:

```
main (production)
  ← develop (integration)
      ← feature/* (new features)
      ← bugfix/* (bug fixes)
      ← hotfix/* (urgent production fixes)
```

**Branch Types**:
- `main` - **Production branch** (protected, auto-deploys to Netlify)
- `develop` - **Integration branch** (protected, no deployment)
- `feature/*` - New features (merge to `develop`)
- `bugfix/*` - Bug fixes (merge to `develop`)
- `hotfix/*` - Urgent fixes (merge to `main`, then back to `develop`)

### Development Workflow

#### 1. Starting a New Feature

```bash
# Make sure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-awesome-feature

# Work on your feature
git add .
git commit -m "feat: add awesome feature"

# Push and create PR to develop
git push -u origin feature/my-awesome-feature
```

Then create a Pull Request: `feature/my-awesome-feature` → `develop`

#### 2. Bug Fix

```bash
# Same workflow as feature
git checkout develop
git pull origin develop
git checkout -b bugfix/fix-important-bug

# Fix the bug
git add .
git commit -m "fix: resolve important bug"

# Push and create PR to develop
git push -u origin bugfix/fix-important-bug
```

Then create a Pull Request: `bugfix/fix-important-bug` → `develop`

#### 3. Hotfix (Emergency Production Fix)

```bash
# Create from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Fix the critical issue
git add .
git commit -m "fix: critical security vulnerability"

# Push and create PR to main
git push -u origin hotfix/critical-security-fix
```

Then:
1. Create PR: `hotfix/critical-security-fix` → `main`
2. After merge to main, also merge back to develop:
   ```bash
   git checkout develop
   git pull origin develop
   git merge main
   git push origin develop
   ```

### Commit Messages

We follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style/formatting (no logic change)
- `refactor:` - Code refactoring (no feature/fix)
- `perf:` - Performance improvements
- `test:` - Add or update tests
- `chore:` - Build/config changes, dependencies

**Examples**:
```bash
feat(router): add lazy loading support

- Implement lazy() function
- Add preload() helper
- Update documentation

Closes #123
```

```bash
fix(compiler): handle edge case in CSS parsing

Fixes an issue where nested media queries were not properly scoped.

Fixes #456
```

```bash
chore(deps): update dependencies

- Update @actions/core to v1.10.0
- Update codecov action to v4
```

### Pull Requests

#### Creating a PR

1. **Fork** the repository (or use branch if you have write access)
2. **Create branch** from `develop` (or `main` for hotfixes)
3. **Make changes** with tests
4. **Run tests**: `npm test` (all must pass)
5. **Push** your branch
6. **Create PR** on GitHub

#### PR Requirements

✅ **Required**:
- All CI checks passing (tests, coverage, lint, build, security)
- Clear description of changes
- Link to related issues
- Test coverage for new features
- No merge conflicts

✅ **Recommended**:
- Screenshots/GIFs for UI changes
- Performance impact notes
- Breaking changes documented

#### PR Labels

PRs are **automatically labeled** based on changed files:
- `documentation` - Docs changes
- `tests` - Test updates
- `compiler` - Compiler changes
- `runtime` - Runtime changes
- `cli` - CLI changes
- `ci/cd` - Workflow changes
- `size/XS` to `size/XL` - Based on lines changed

#### PR Preview

Every PR gets an **automatic Netlify preview deployment**:
- Preview URL posted as comment
- Updates on each new commit
- Test changes before merge

### Code Review Process

1. **Automated checks** run (CI, tests, security audit)
2. **Code review** by maintainers
3. **Address feedback** with additional commits
4. **Approval** from reviewer(s)
5. **Merge** (squash and merge or merge commit)

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

## Release Process

**Note**: Only maintainers can create releases.

### Creating a Release

1. **Ensure `develop` is stable**:
   - All CI checks passing
   - All features tested
   - No known critical bugs

2. **Promote to production**:
   ```bash
   # Option A: Via GitHub Actions
   # Go to Actions > Promote to Main > Run workflow

   # Option B: Manual PR
   git checkout develop
   git pull origin develop
   # Create PR on GitHub: develop → main
   ```

3. **Review and merge PR**:
   - Review all changes since last release
   - Ensure CHANGELOG is updated
   - Merge PR to `main`

4. **Production deploys automatically**:
   - Netlify deployment triggers on merge
   - Live at https://pulse-js.fr

5. **Create release tag**:
   ```bash
   # Go to Actions > Create Release > Run workflow
   # Select version type: patch, minor, or major
   ```

6. **Release artifacts created**:
   - GitHub release with changelog
   - npm package published
   - Documentation updated

### Version Numbering

We use **Semantic Versioning** (semver):

- `MAJOR.MINOR.PATCH` (e.g., `1.7.34`)
- **PATCH** (`1.7.34` → `1.7.35`): Bug fixes, no breaking changes
- **MINOR** (`1.7.34` → `1.8.0`): New features, backward compatible
- **MAJOR** (`1.7.34` → `2.0.0`): Breaking changes

### Changelog

The changelog is **automatically generated** from commit messages:
- `feat:` commits → Added section
- `fix:` commits → Fixed section
- `chore:`, `refactor:`, etc. → Changed section
- Breaking changes (with `!` or `BREAKING CHANGE:`) → Special section

## Branch Protection

Both `main` and `develop` are **protected branches**:

### Main Branch
- ✅ Requires 1 PR review
- ✅ Requires status checks (test, coverage, lint, build, security)
- ✅ Requires conversation resolution
- ✅ Linear history enforced
- ❌ No direct pushes
- ❌ No force pushes
- ❌ No deletion

### Develop Branch
- ✅ Requires status checks (test, coverage, lint, build, security)
- ✅ Requires conversation resolution
- ✅ Linear history enforced
- ❌ No direct pushes
- ❌ No force pushes
- ❌ No deletion

**Why protected?**
- Ensures code quality
- Prevents accidental breakage
- Enforces review process
- Maintains clean history

## CI/CD Pipeline

### Continuous Integration

Every push triggers:
1. **Security Audit**: npm audit for vulnerabilities
2. **Tests**: Run on Node.js 18, 20, 22 (parallel)
3. **Coverage**: Check code coverage (70% threshold)
4. **Lint**: Syntax validation
5. **Build**: Documentation site build

### Continuous Deployment

- **PR Previews**: Every PR gets Netlify preview
- **Staging**: `develop` branch (no deployment)
- **Production**: `main` branch → auto-deploys to Netlify

### Automated Workflows

- **Auto-labeling**: PRs labeled based on files changed
- **Bundle size check**: Warns if >10MB
- **Dependency updates**: Dependabot creates weekly PRs
- **Security alerts**: Automatic vulnerability scanning

## Questions?

- 💬 Open a [GitHub Issue](https://github.com/vincenthirtz/pulse-js-framework/issues)
- 📖 Check [existing issues](https://github.com/vincenthirtz/pulse-js-framework/issues?q=is%3Aissue)
- 📚 Read [documentation](https://pulse-js.fr)
- 🔧 Check [workflow README](.github/workflows/README.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
