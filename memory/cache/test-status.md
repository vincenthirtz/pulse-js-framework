# Test Status — pulse-js-framework

_Last updated: 2026-03-04_

## Summary

| Metric | Value |
|--------|-------|
| Total test files | 140+ |
| Test runner | `node:test` (Node.js built-in) |
| Run command | `npm test` |
| Coverage command | `npm test -- --coverage` |
| All tests passing | ✅ Yes (as of last run) |

## Coverage Targets

| Area | Target |
|------|--------|
| `runtime/` | ≥ 90% |
| `compiler/` | ≥ 85% |
| `cli/` | ≥ 80% |

## Test Categories

| File pattern | What it covers |
|-------------|----------------|
| `pulse.test.js` | Core reactivity (signals, effects, computed) |
| `dom.test.js` | DOM creation, binding, events |
| `router.test.js` (3 683 lines) | SPA routing, lazy loading, guards |
| `compiler.test.js` (2 862 lines) | Lexer, parser, transformer |
| `lint.test.js` (2 100 lines) | Semantic analyzer, lint rules |
| `form.test.js` + `form-v2.test.js` | Form validation, field arrays |
| `a11y.test.js` (1 539 lines) | Accessibility, ARIA, focus management |
| `ssr.test.js` (1 446 lines) | Server-side rendering, hydration |
| `graphql.test.js` (1 505 lines) | GraphQL client, subscriptions |
| `websocket.test.js` (703 lines) | WebSocket, reconnect, heartbeat, queue |
| `async.test.js` (670 lines) | useAsync, useResource, usePolling |
| `devtools.test.js` (22 912 lines) | Time-travel, dependency graph |
| `integration.test.js` (24 941 lines) | Full integration scenarios |
| `*-coverage-boost.test.js` (30 files) | Edge cases / branch coverage |

## Recently Added Tests (2026-03-04)

- `test/index.test.js` — entry point exports, VERSION (20 tests)
- `test/ssr-async-coverage-boost.test.js` — SSRAsyncContext branches (28 tests)
- `test/ssr-serializer-coverage-boost.test.js` — serializer branches (41 tests)

## Known Flaky Tests

None currently identified. If a test hangs, check:
1. Missing `t.after()` cleanup for async resources
2. Missing `AbortSignal.timeout()` on long-running promises
3. `MockDOMAdapter` not reset between tests (call `resetAdapter()`)

## Common Test Patterns

```javascript
// Always use node:test
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Async tests with timeout
test('my async test', async (t) => {
  const signal = AbortSignal.timeout(1000);
  const resource = await setupResource({ signal });
  t.after(() => resource.dispose());
  const result = await resource.doWork();
  assert.strictEqual(result, expected);
});

// DOM tests — always reset adapter
import { MockDOMAdapter, setAdapter, resetAdapter } from '../runtime/dom-adapter.js';
beforeEach(() => setAdapter(new MockDOMAdapter()));
afterEach(() => resetAdapter());
```
