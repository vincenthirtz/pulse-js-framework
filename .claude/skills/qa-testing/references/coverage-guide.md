# Coverage Guide for Pulse Framework

## Running Coverage

### With c8 (Node.js V8 coverage)

```bash
# Single file
npx c8 node --test test/pulse.test.js

# Full suite
npx c8 npm test

# With reporters
npx c8 --reporter=text --reporter=lcov --reporter=json-summary npm test

# HTML report (open coverage/index.html)
npx c8 --reporter=html node --test test/pulse.test.js
```

### Coverage Thresholds

The CI pipeline (ci.yml) uses a **70% threshold** via Codecov. To check locally:

```bash
npx c8 --check-coverage --lines 70 --branches 70 --functions 70 npm test
```

### Using the Skill Script

```bash
node .claude/skills/qa-testing/scripts/run-with-coverage.js
node .claude/skills/qa-testing/scripts/run-with-coverage.js test/http.test.js
node .claude/skills/qa-testing/scripts/run-with-coverage.js --threshold 80
```

## Coverage Targets by Module

| Module | Current Target | Priority |
|--------|---------------|----------|
| runtime/pulse.js | 90% | Critical |
| runtime/dom.js | 85% | Critical |
| compiler/lexer.js | 90% | Critical |
| compiler/parser.js | 85% | Critical |
| compiler/transformer.js | 80% | High |
| runtime/router.js | 85% | High |
| runtime/store.js | 85% | High |
| runtime/form.js | 80% | High |
| runtime/http.js | 80% | Medium |
| runtime/websocket.js | 75% | Medium |
| runtime/graphql.js | 75% | Medium |
| runtime/a11y.js | 80% | Medium |
| runtime/ssr.js | 70% | Medium |
| cli/*.js | 70% | Low |
| loader/*.js | 60% | Low |

## Finding Coverage Gaps

### 1. Use c8 text report

```bash
npx c8 --reporter=text node --test test/pulse.test.js
```

Look for files with low % in branches/functions.

### 2. Use HTML report for line-level detail

```bash
npx c8 --reporter=html node --test test/pulse.test.js
open coverage/index.html
```

Red lines = uncovered code. Yellow = partially covered branches.

### 3. Use find-untested script

```bash
node .claude/skills/qa-testing/scripts/find-untested.js --verbose
```

Lists source files without corresponding test files.

## Common Coverage Gaps

### 1. Error Paths

Most coverage gaps are in error handling. Add tests for:

```javascript
// Network errors
test('handles network failure', async () => {
  const mockFetch = () => Promise.reject(new Error('ECONNREFUSED'));
  // ...
});

// Invalid input
test('rejects invalid arguments', () => {
  assert.throws(() => functionUnderTest(null), /expected/);
  assert.throws(() => functionUnderTest(undefined));
  assert.throws(() => functionUnderTest(''));
});

// Timeout
test('handles timeout', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  // trigger timeout path
  mock.timers.tick(30000);
  mock.timers.reset();
});
```

### 2. Edge Cases in Conditionals

```javascript
// Boundary values
test('handles zero', () => { /* ... */ });
test('handles negative', () => { /* ... */ });
test('handles MAX_SAFE_INTEGER', () => { /* ... */ });

// Empty collections
test('handles empty array', () => { /* ... */ });
test('handles empty object', () => { /* ... */ });
test('handles empty string', () => { /* ... */ });
```

### 3. Cleanup/Dispose Paths

```javascript
test('dispose cleans up subscriptions', () => {
  const count = pulse(0);
  const dispose = effect(() => count.get());

  dispose();

  // Verify no more tracking
  count.set(1); // Should not trigger anything
});
```

### 4. Configuration Variants

```javascript
// Test with different options
test('works with lazy: true', () => {
  const c = computed(() => expensive(), { lazy: true });
  // ...
});

test('works with lazy: false', () => {
  const c = computed(() => expensive(), { lazy: false });
  // ...
});
```

## Strategies to Improve Coverage

### 1. Targeted Test Files

Create `{module}-coverage.test.js` files specifically targeting uncovered lines:

```bash
node .claude/skills/qa-testing/scripts/generate-test.js runtime/http.js --type unit
# Creates test/http.test.js (or http-coverage.test.js if exists)
```

### 2. Edge Case Test Files

Create `{module}-edge-cases.test.js` for boundary conditions:
- Null/undefined inputs
- Empty strings/arrays/objects
- Very large inputs
- Concurrent operations
- Rapid successive calls

### 3. Integration Tests

Cross-module tests often cover code paths that unit tests miss:
- Router + Store interaction
- Form + Async validation
- HTTP + Interceptors + Error handling

### 4. Exclusions

If code genuinely can't be tested (e.g., browser-only APIs in Node.js tests):

```javascript
/* c8 ignore start */
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', handlePop);
}
/* c8 ignore stop */
```

Use sparingly. Prefer mocking over exclusions.
