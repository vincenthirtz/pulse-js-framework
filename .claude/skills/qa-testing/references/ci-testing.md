# CI Testing Guide for Pulse Framework

## CI Pipeline Overview

Tests run in GitHub Actions via `.github/workflows/ci.yml`.

### Pipeline Jobs

```
Push/PR
  ├── Security (npm audit) - advisory, non-blocking
  ├── Lint (node --check) - blocks on failure
  ├── Test Matrix (Node 18, 20, 22) - blocks on failure
  ├── Coverage (c8 + Codecov) - non-blocking
  └── Build (after lint + test pass)
      └── Deploy (main branch only, Netlify)
```

### Test Matrix

Tests run on **3 Node.js versions** in parallel:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

### Timeout

- Per job: 10 minutes
- Per test suite (run-all-tests.js): no explicit per-suite timeout
- Per individual test: Node.js default (no timeout)

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Previous runs for the same branch/PR are cancelled when a new push arrives.

## How Tests Execute in CI

1. `npm test` runs `scripts/run-all-tests.js`
2. The script executes 67 test suites **sequentially** via `execSync()`
3. Each suite: `npm run test:{name}` (which runs `node --test test/{name}.test.js`)
4. Output is captured (piped) and only shown on failure
5. Summary printed at end with pass/fail counts

### Adding a New Test to CI

1. Create test file: `test/my-feature.test.js`
2. Add script to `package.json`:
   ```json
   "test:my-feature": "node --test test/my-feature.test.js"
   ```
3. Add to `scripts/run-all-tests.js` test list:
   ```javascript
   'test:my-feature',
   ```
4. Run locally to verify: `npm run test:my-feature`
5. Run full suite: `npm test`

## Debugging CI Failures

### 1. Check which test failed

The run-all-tests.js output shows:
```
✓ test:pulse
✓ test:dom
✗ test:router    ← FAILED
  [error output here]
```

### 2. Common CI-only failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Passes locally, fails in CI | Node version difference | Test with `nvm use 18` |
| Timeout | Unresolved promise | Add proper await/dispose |
| Flaky (intermittent) | Timing dependency | Use `mock.timers` instead of real setTimeout |
| ENOMEM | Large buffer | Check `maxBuffer` in execSync options |
| Permission denied | File system access | Ensure test uses temp directories |

### 3. Reproduce CI environment locally

```bash
# Match CI Node version
nvm use 18

# Clean install (like CI)
rm -rf node_modules
npm ci

# Run exactly as CI does
npm test
```

### 4. View CI logs

```bash
# List recent workflow runs
gh run list --limit 10

# View specific run
gh run view <run-id>

# View logs for a specific job
gh run view <run-id> --log
```

### 5. Re-run failed CI

```bash
gh run rerun <run-id> --failed
```

## Coverage in CI

### How it works

1. `c8` wraps `npm test` to collect V8 coverage
2. Reports generated: lcov, text, json-summary
3. Uploaded to Codecov via `codecov/codecov-action@v4`
4. Codecov comments on PRs with coverage diff

### Coverage gate

- Threshold: **70%** (configured in Codecov)
- Non-blocking: low coverage warns but doesn't fail CI
- Coverage job runs in parallel with test matrix

### Checking coverage locally

```bash
# Quick text summary
npx c8 --reporter=text npm test

# Detailed HTML report
npx c8 --reporter=html npm test
open coverage/index.html
```

## PR Integration

### Auto-labeling (pr-analysis.yml)

Tests-related PRs get auto-labeled:

| Changed Path | Label |
|-------------|-------|
| `test/` | `tests` |
| `compiler/` | `compiler` |
| `runtime/` | `runtime` |
| `cli/` | `cli` |

### Size labels

| Lines Changed | Label |
|--------------|-------|
| < 10 | XS |
| 10-50 | S |
| 50-200 | M |
| 200-500 | L |
| > 500 | XL |

## Best Practices for CI-Friendly Tests

1. **No network calls** - Mock all HTTP/WebSocket/fetch
2. **No file system writes** - Use temp dirs or mock
3. **No real timers** - Use `mock.timers` from `node:test`
4. **Deterministic** - Same input always produces same output
5. **Fast** - Individual test < 5s, full suite < 5 min
6. **Isolated** - No shared state between tests
7. **Clean up** - `afterEach` restores all globals/state
8. **No interactive** - No prompts, no stdin reads
