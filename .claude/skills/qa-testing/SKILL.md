---
name: qa-testing
description: Dedicated QA/Testing agent for the Pulse JS framework. Use this skill when writing tests, running test suites, analyzing coverage, debugging test failures, generating test files, or improving test quality. Handles unit tests, integration tests, edge-case testing, mocking strategies, and CI test pipeline issues.
---

# QA/Testing Agent for Pulse Framework

## When to Use This Skill

- Writing new test files for runtime modules, compiler, CLI, or loaders
- Running specific test suites or the full test suite
- Debugging failing tests or flaky tests
- Analyzing and improving code coverage
- Generating test file boilerplate from source files
- Finding untested code paths or modules
- Setting up mocks (DOM, HTTP, WebSocket, timers)
- Reviewing test quality (assertions, edge cases, isolation)
- Troubleshooting CI test failures

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | Test file templates (unit, integration, mock-dom, async, compiler) |
| **scripts/** | Test runners, coverage analysis, test file generators |
| **references/** | Testing patterns, mocking strategies, CI integration, coverage targets |

## Quick Reference

### Running Tests

```bash
# Full suite (67 test files via scripts/run-all-tests.js)
npm test

# Individual test suites
npm run test:pulse          # Core reactivity
npm run test:compiler       # Lexer, parser, transformer
npm run test:dom            # DOM helpers
npm run test:router         # Router
npm run test:store          # Store
npm run test:form           # Form validation
npm run test:http           # HTTP client
npm run test:websocket      # WebSocket client
npm run test:graphql        # GraphQL client
npm run test:a11y           # Accessibility
npm run test:ssr            # Server-side rendering
npm run test:cli            # CLI commands
npm run test:lint           # Linter
npm run test:format         # Formatter
npm run test:integration    # Integration tests

# Run a specific test file directly
node --test test/pulse.test.js

# With coverage (uses c8)
npx c8 node --test test/pulse.test.js
npx c8 --reporter=lcov --reporter=text npm test
```

### Test File Structure

All tests use Node.js built-in test runner (`node:test`) and `node:assert`:

```javascript
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('ModuleName', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  test('specific behavior description', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = functionUnderTest(input);

    // Assert
    assert.strictEqual(result, expected);
  });
});
```

### Key Test Patterns

#### 1. Isolated Reactive Context (prevents state pollution)

```javascript
import { pulse, effect, createContext, withContext } from 'pulse-js-framework/runtime/pulse';

test('reactivity in isolation', () => {
  const ctx = createContext({ name: 'test' });
  withContext(ctx, () => {
    const count = pulse(0);
    count.set(5);
    assert.strictEqual(count.get(), 5);
  });
  ctx.reset();
});
```

#### 2. Mock DOM Setup

```javascript
import { createDOM } from './mock-dom.js';

let dom;
beforeEach(() => {
  dom = createDOM();
  globalThis.document = dom.document;
  globalThis.HTMLElement = dom.HTMLElement;
  globalThis.Node = dom.Node;
});
afterEach(() => {
  delete globalThis.document;
  delete globalThis.HTMLElement;
  delete globalThis.Node;
});
```

#### 3. MockDOMAdapter (for DOM module tests)

```javascript
import { setAdapter, MockDOMAdapter, resetAdapter } from 'pulse-js-framework/runtime/dom-adapter';

let adapter;
beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});
afterEach(() => {
  resetAdapter();
});
```

#### 4. Async Testing

```javascript
test('async operation completes', async () => {
  const { data, loading } = useAsync(() => Promise.resolve('result'));
  assert.strictEqual(loading.get(), true);
  await new Promise(r => setTimeout(r, 0)); // Flush microtasks
  assert.strictEqual(loading.get(), false);
  assert.strictEqual(data.get(), 'result');
});
```

#### 5. Effect Tracking

```javascript
test('effect tracks dependencies', () => {
  const values = [];
  const count = pulse(0);
  effect(() => values.push(count.get()));

  count.set(1);
  count.set(2);
  assert.deepStrictEqual(values, [0, 1, 2]);
});
```

## Test File Naming Convention

| Source File | Test File |
|-------------|-----------|
| `runtime/pulse.js` | `test/pulse.test.js` |
| `runtime/dom.js` | `test/dom.test.js` |
| `compiler/lexer.js` | `test/compiler.test.js` |
| `cli/lint.js` | `test/lint.test.js` |
| Edge cases | `test/{module}-edge-cases.test.js` |
| Stress tests | `test/{module}-stress.test.js` |
| Extra coverage | `test/{module}-coverage.test.js` |
| Advanced scenarios | `test/{module}-advanced.test.js` |

## Available Scripts

```bash
# Generate test file from source
node .claude/skills/qa-testing/scripts/generate-test.js runtime/pulse.js

# Find modules without test coverage
node .claude/skills/qa-testing/scripts/find-untested.js

# Run tests with coverage summary
node .claude/skills/qa-testing/scripts/run-with-coverage.js

# Validate test quality (assertions per test, isolation checks)
node .claude/skills/qa-testing/scripts/validate-tests.js
```

## Assertion Quick Reference

```javascript
// Equality
assert.strictEqual(actual, expected);          // ===
assert.deepStrictEqual(obj1, obj2);            // Deep equality
assert.notStrictEqual(actual, expected);       // !==

// Truthiness
assert.ok(value);                              // Truthy
assert.ok(!value);                             // Falsy

// Errors
assert.throws(() => fn(), /message/);          // Sync throws
assert.throws(() => fn(), { code: 'ERR' });    // With error props
await assert.rejects(asyncFn(), /message/);    // Async rejects

// Collections
assert.strictEqual(arr.length, 3);
assert.ok(arr.includes(item));
assert.deepStrictEqual(arr, [1, 2, 3]);
```

## Common Mocking Patterns

### Mock HTTP Responses

```javascript
function mockFetch(responses) {
  return (url, opts) => {
    const match = responses[url];
    if (!match) return Promise.reject(new Error(`No mock for ${url}`));
    return Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve(match),
      text: () => Promise.resolve(JSON.stringify(match))
    });
  };
}
```

### Mock WebSocket

```javascript
class MockWebSocket {
  constructor(url) { this.url = url; this.readyState = 0; }
  send(data) { this.lastSent = data; }
  close(code, reason) { this.readyState = 3; this.onclose?.({ code, reason }); }
  simulateOpen() { this.readyState = 1; this.onopen?.(); }
  simulateMessage(data) { this.onmessage?.({ data: JSON.stringify(data) }); }
  simulateError(err) { this.onerror?.(err); }
}
```

### Mock Timers (Node.js built-in)

```javascript
import { mock } from 'node:test';

test('debounced function', () => {
  mock.timers.enable({ apis: ['setTimeout', 'clearTimeout'] });
  const fn = mock.fn();
  const debounced = debounce(fn, 300);

  debounced();
  debounced();
  mock.timers.tick(300);
  assert.strictEqual(fn.mock.callCount(), 1);

  mock.timers.reset();
});
```

## Test Quality Checklist

When writing or reviewing tests:

- [ ] Each test has a clear, descriptive name
- [ ] Tests are isolated (no shared mutable state between tests)
- [ ] Reactive contexts are created and reset per test
- [ ] Mock DOM is set up in `beforeEach` and cleaned in `afterEach`
- [ ] Async tests properly await all promises
- [ ] Edge cases covered: null, undefined, empty arrays, empty strings
- [ ] Error paths tested (invalid input, network errors, timeouts)
- [ ] No hardcoded timeouts (use `mock.timers` instead)
- [ ] Assertions are specific (`strictEqual` > `ok`)
- [ ] Test covers the "why", not just the "what"

## CI Pipeline Context

Tests run in GitHub Actions CI on Node 18, 20, 22:
- **ci.yml**: Main pipeline (lint, test matrix, coverage, build)
- **Coverage threshold**: 70% (Codecov)
- **Timeout**: 10 minutes per run
- **Sequential execution**: `scripts/run-all-tests.js` runs all 67 suites sequentially

## Reference Documentation

- **[unit-testing.md](references/unit-testing.md)** - Unit test patterns for each module type
- **[mocking-strategies.md](references/mocking-strategies.md)** - DOM, HTTP, WebSocket, timer mocking
- **[coverage-guide.md](references/coverage-guide.md)** - Coverage analysis, targets, and gap detection
- **[ci-testing.md](references/ci-testing.md)** - CI pipeline, matrix testing, debugging CI failures

## Quick Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Test hangs | Unresolved promise or open handle | Ensure all async ops complete; check for missing `dispose()` |
| "Not unique" assertion | State leaking between tests | Use `createContext()` + `ctx.reset()` per test |
| Mock DOM missing method | `mock-dom.js` doesn't implement it | Add to `test/mock-dom.js` or use `MockDOMAdapter` |
| Effect not firing | Dependency not tracked | Ensure `.get()` is called inside effect/computed |
| Flaky timing test | Real `setTimeout` used | Use `mock.timers.enable()` from `node:test` |
| CI passes but local fails | Node version difference | Test with `nvm use 18` / `20` / `22` |
| Coverage gap | Module not in `run-all-tests.js` | Add `npm run test:module` to script list |
