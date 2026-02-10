# Unit Testing Guide for Pulse Framework

## Overview

All tests use **Node.js built-in test runner** (`node:test`) with `node:assert`. No external test frameworks.

## Module-Specific Testing Patterns

### Reactivity (runtime/pulse.js)

```javascript
import { pulse, effect, computed, batch, createContext, withContext } from '../runtime/pulse.js';

// Always use isolated context in tests
test('pulse reactivity', () => {
  const ctx = createContext({ name: 'test' });
  withContext(ctx, () => {
    const count = pulse(0);
    const doubled = computed(() => count.get() * 2);

    assert.strictEqual(doubled.get(), 0);
    count.set(5);
    assert.strictEqual(doubled.get(), 10);
  });
  ctx.reset();
});
```

**Key things to test:**
- `pulse()` get/set/update/peek/subscribe
- `computed()` lazy vs eager, disposal
- `effect()` tracking, cleanup, re-run count
- `batch()` deferred execution
- `watch()` old/new values
- `createState()` proxy behavior, array helpers
- `memo()` / `memoComputed()` caching

### DOM (runtime/dom.js)

```javascript
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { el, mount, list, when, show, bind, model } from '../runtime/dom.js';

let adapter;
beforeEach(() => { adapter = new MockDOMAdapter(); setAdapter(adapter); });
afterEach(() => { resetAdapter(); });

test('el creates element', () => {
  const div = el('div.container#main');
  assert.strictEqual(div.tagName, 'div');
  assert.ok(div.className.includes('container'));
});
```

**Key things to test:**
- Selector parsing (tag, class, id, attributes)
- Reactive children (function children)
- Reactive attributes
- `list()` with key functions (add, remove, reorder)
- `when()` / `match()` conditional rendering
- `show()` visibility toggle
- `bind()` / `model()` two-way binding
- Auto-ARIA attributes

### Router (runtime/router.js)

```javascript
test('route matching', async () => {
  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/users/:id': () => el('div', 'User')
    }
  });

  await router.navigate('/users/42');
  assert.strictEqual(router.params.get().id, '42');
});
```

**Key things to test:**
- Static and dynamic route matching
- Parameter extraction
- Query parameters
- Guards (beforeEnter, beforeEach)
- Middleware chain
- Lazy loading
- Hash mode vs history mode
- Nested routes

### Store (runtime/store.js)

```javascript
test('store updates', () => {
  const store = createStore({ count: 0, name: 'test' });
  store.count.set(5);
  assert.strictEqual(store.count.get(), 5);

  store.$reset();
  assert.strictEqual(store.count.get(), 0);
});
```

**Key things to test:**
- State CRUD operations
- Actions binding
- Getters (computed)
- Plugins (logger, history)
- Persistence (mock localStorage)
- Combined stores
- Module stores

### Form (runtime/form.js)

```javascript
test('form validation', () => {
  const { fields, isValid } = useForm(
    { email: '' },
    { email: [validators.required(), validators.email()] }
  );

  assert.strictEqual(isValid.get(), false);

  fields.email.onChange({ target: { value: 'test@test.com' } });
  fields.email.onBlur();

  assert.strictEqual(isValid.get(), true);
});
```

**Key things to test:**
- Each validator type
- Async validators with debounce
- Field dirty/touched state
- Form submission
- Field arrays (append, remove, move)
- Cross-field validation (matches)

### Compiler (compiler/)

```javascript
test('lexer tokenizes state block', () => {
  const lexer = new Lexer('state { count: 0 }');
  const tokens = lexer.tokenize();
  assert.ok(tokens.some(t => t.type === 'IDENTIFIER' && t.value === 'state'));
});

test('parser builds AST', () => {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens, source).parse();
  assert.ok(ast.state);
});

test('transformer generates code', () => {
  const result = compile(pulseSource, { filename: 'Test.pulse' });
  assert.ok(result.code.includes('pulse('));
});
```

**Key things to test:**
- Token types and positions
- AST structure for each block type
- Generated code correctness
- Source map accuracy
- Error messages with line/column
- Edge cases (empty blocks, nested expressions)

## Assertion Patterns

### Prefer strict assertions

```javascript
// Good
assert.strictEqual(value, 'expected');
assert.deepStrictEqual(array, [1, 2, 3]);

// Avoid (loose equality)
// assert.equal(value, 'expected');
// assert.deepEqual(array, [1, 2, 3]);
```

### Testing thrown errors

```javascript
// Sync
assert.throws(
  () => functionThatThrows(),
  { message: /expected pattern/ }
);

// Async
await assert.rejects(
  asyncFunctionThatRejects(),
  { message: /expected pattern/ }
);

// Error type
assert.throws(
  () => parse('invalid'),
  (err) => err instanceof ParserError && err.line === 5
);
```

### Testing effect behavior

```javascript
test('effect runs correct number of times', () => {
  const log = [];
  const count = pulse(0);

  const dispose = effect(() => {
    log.push(count.get());
  });

  count.set(1);
  count.set(2);

  assert.deepStrictEqual(log, [0, 1, 2]); // 3 runs
  dispose();

  count.set(3);
  assert.deepStrictEqual(log, [0, 1, 2]); // No more runs
});
```
