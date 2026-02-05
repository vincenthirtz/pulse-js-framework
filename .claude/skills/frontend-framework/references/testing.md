# Testing Guide for Pulse Applications

## Table of Contents

1. [Setup](#setup)
2. [Unit Testing Reactivity](#unit-testing-reactivity)
3. [Testing Components](#testing-components)
4. [Testing Forms](#testing-forms)
5. [Testing Async Operations](#testing-async-operations)
6. [Testing Router](#testing-router)
7. [Integration Testing](#integration-testing)
8. [Mocking](#mocking)

## Setup

### Project Configuration

```bash
# Run tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Specific file
npm test -- test/components/Button.test.js
```

### Test File Structure

```
src/
├── components/
│   ├── Button.pulse
│   └── Button.test.js      # Co-located test
test/
├── integration/
│   └── app.test.js         # Integration tests
└── setup.js                # Test setup
```

### Test Setup File

```javascript
// test/setup.js
import { setAdapter, MockDOMAdapter, resetAdapter } from 'pulse-js-framework/runtime/dom-adapter';
import { resetContext } from 'pulse-js-framework/runtime/pulse';

// Global setup
let mockAdapter;

export function setupTestEnvironment() {
  mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);
}

export function teardownTestEnvironment() {
  resetAdapter();
  resetContext();
}

export function getMockAdapter() {
  return mockAdapter;
}
```

## Unit Testing Reactivity

### Testing Pulses

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pulse, computed, effect, batch, createContext, withContext } from 'pulse-js-framework/runtime/pulse';

describe('Pulse reactivity', () => {
  test('pulse stores and updates value', () => {
    const count = pulse(0);

    assert.strictEqual(count.get(), 0);

    count.set(5);
    assert.strictEqual(count.get(), 5);

    count.update(n => n + 1);
    assert.strictEqual(count.get(), 6);
  });

  test('computed derives from pulse', () => {
    const count = pulse(2);
    const doubled = computed(() => count.get() * 2);

    assert.strictEqual(doubled.get(), 4);

    count.set(5);
    assert.strictEqual(doubled.get(), 10);
  });

  test('effect runs on dependency change', () => {
    const values = [];
    const count = pulse(0);

    effect(() => {
      values.push(count.get());
    });

    assert.deepStrictEqual(values, [0]); // Initial run

    count.set(1);
    assert.deepStrictEqual(values, [0, 1]);

    count.set(2);
    assert.deepStrictEqual(values, [0, 1, 2]);
  });

  test('batch groups updates', () => {
    const values = [];
    const a = pulse(0);
    const b = pulse(0);

    effect(() => {
      values.push([a.get(), b.get()]);
    });

    batch(() => {
      a.set(1);
      b.set(1);
    });

    // Effect runs once after batch, not twice
    assert.deepStrictEqual(values, [[0, 0], [1, 1]]);
  });

  test('isolated context prevents pollution', () => {
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const count = pulse(0);
      count.set(5);
      assert.strictEqual(count.get(), 5);
    });

    ctx.reset();
  });
});
```

### Testing Effect Cleanup

```javascript
test('effect cleanup runs before re-run', () => {
  const cleanups = [];
  const count = pulse(0);

  const dispose = effect(() => {
    const val = count.get();
    return () => cleanups.push(val);
  });

  count.set(1); // Cleanup for 0 runs
  count.set(2); // Cleanup for 1 runs

  assert.deepStrictEqual(cleanups, [0, 1]);

  dispose(); // Cleanup for 2 runs
  assert.deepStrictEqual(cleanups, [0, 1, 2]);
});
```

## Testing Components

### Setup with Mock DOM

```javascript
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setAdapter, MockDOMAdapter, resetAdapter } from 'pulse-js-framework/runtime/dom-adapter';
import { el, mount } from 'pulse-js-framework/runtime/dom';
import { pulse } from 'pulse-js-framework/runtime/pulse';

describe('Button component', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
  });

  afterEach(() => {
    resetAdapter();
  });

  test('renders button with text', () => {
    const button = el('button.primary', 'Click me');

    assert.strictEqual(button.tagName, 'button');
    assert.ok(button.className.includes('primary'));
    assert.strictEqual(button.textContent, 'Click me');
  });

  test('handles click events', () => {
    let clicked = false;
    const button = el('button', { onclick: () => clicked = true }, 'Click');

    button.click();

    assert.strictEqual(clicked, true);
  });

  test('updates reactively', () => {
    const count = pulse(0);
    const button = el('button', () => `Count: ${count.get()}`);

    assert.strictEqual(button.textContent, 'Count: 0');

    count.set(5);
    assert.strictEqual(button.textContent, 'Count: 5');
  });
});
```

### Testing Component Functions

```javascript
// Counter.js
export function Counter({ initial = 0 }) {
  const count = pulse(initial);

  return el('.counter', [
    el('span.count', () => count.get()),
    el('button.increment', { onclick: () => count.update(n => n + 1) }, '+'),
    el('button.decrement', { onclick: () => count.update(n => n - 1) }, '-')
  ]);
}

// Counter.test.js
import { Counter } from './Counter.js';

test('Counter increments and decrements', () => {
  const counter = Counter({ initial: 5 });

  const countDisplay = counter.querySelector('.count');
  const incrementBtn = counter.querySelector('.increment');
  const decrementBtn = counter.querySelector('.decrement');

  assert.strictEqual(countDisplay.textContent, '5');

  incrementBtn.click();
  assert.strictEqual(countDisplay.textContent, '6');

  decrementBtn.click();
  decrementBtn.click();
  assert.strictEqual(countDisplay.textContent, '4');
});
```

## Testing Forms

### Form Validation

```javascript
import { useForm, validators } from 'pulse-js-framework/runtime/form';

describe('Login form', () => {
  test('validates required fields', () => {
    const { fields, isValid, errors } = useForm(
      { email: '', password: '' },
      {
        email: [validators.required('Email required')],
        password: [validators.required('Password required')]
      }
    );

    assert.strictEqual(isValid.get(), false);

    // Simulate user input
    fields.email.onChange({ target: { value: 'test@example.com' } });
    fields.email.onBlur();

    assert.strictEqual(fields.email.error.get(), null);
    assert.strictEqual(isValid.get(), false); // Password still empty

    fields.password.onChange({ target: { value: 'secret123' } });
    fields.password.onBlur();

    assert.strictEqual(isValid.get(), true);
  });

  test('validates email format', () => {
    const { fields } = useForm(
      { email: '' },
      { email: [validators.email('Invalid email')] }
    );

    fields.email.onChange({ target: { value: 'notanemail' } });
    fields.email.onBlur();

    assert.strictEqual(fields.email.error.get(), 'Invalid email');

    fields.email.onChange({ target: { value: 'valid@email.com' } });
    assert.strictEqual(fields.email.error.get(), null);
  });

  test('handles form submission', async () => {
    let submitted = null;

    const { fields, handleSubmit } = useForm(
      { email: 'test@test.com', password: 'password123' },
      {
        email: [validators.required()],
        password: [validators.required()]
      },
      {
        onSubmit: (values) => { submitted = values; }
      }
    );

    await handleSubmit();

    assert.deepStrictEqual(submitted, {
      email: 'test@test.com',
      password: 'password123'
    });
  });
});
```

## Testing Async Operations

### Testing useAsync

```javascript
import { useAsync } from 'pulse-js-framework/runtime/async';

describe('useAsync', () => {
  test('handles successful fetch', async () => {
    const mockData = { users: [{ id: 1, name: 'John' }] };
    const mockFetch = () => Promise.resolve(mockData);

    const { data, loading, error } = useAsync(mockFetch);

    assert.strictEqual(loading.get(), true);
    assert.strictEqual(data.get(), null);

    // Wait for async operation
    await new Promise(r => setTimeout(r, 0));

    assert.strictEqual(loading.get(), false);
    assert.deepStrictEqual(data.get(), mockData);
    assert.strictEqual(error.get(), null);
  });

  test('handles fetch error', async () => {
    const mockFetch = () => Promise.reject(new Error('Network error'));

    const { data, loading, error } = useAsync(mockFetch);

    await new Promise(r => setTimeout(r, 0));

    assert.strictEqual(loading.get(), false);
    assert.strictEqual(data.get(), null);
    assert.strictEqual(error.get().message, 'Network error');
  });

  test('supports manual execution', async () => {
    let callCount = 0;
    const mockFetch = () => {
      callCount++;
      return Promise.resolve({ count: callCount });
    };

    const { data, execute } = useAsync(mockFetch, { immediate: false });

    assert.strictEqual(callCount, 0);
    assert.strictEqual(data.get(), null);

    await execute();
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(data.get(), { count: 1 });

    await execute();
    assert.strictEqual(callCount, 2);
    assert.deepStrictEqual(data.get(), { count: 2 });
  });
});
```

### Testing with Fake Timers

```javascript
import { usePolling } from 'pulse-js-framework/runtime/async';

test('polling fetches at interval', async () => {
  // Use Node's timer mocks
  const { mock } = await import('node:test');
  mock.timers.enable({ apis: ['setInterval', 'clearInterval'] });

  let fetchCount = 0;
  const mockFetch = () => {
    fetchCount++;
    return Promise.resolve({ count: fetchCount });
  };

  const { start, stop } = usePolling(mockFetch, { interval: 1000 });
  start();

  assert.strictEqual(fetchCount, 1); // Initial fetch

  mock.timers.tick(1000);
  await Promise.resolve();
  assert.strictEqual(fetchCount, 2);

  mock.timers.tick(1000);
  await Promise.resolve();
  assert.strictEqual(fetchCount, 3);

  stop();
  mock.timers.tick(1000);
  assert.strictEqual(fetchCount, 3); // No more fetches

  mock.timers.reset();
});
```

## Testing Router

### Route Matching

```javascript
import { createRouter } from 'pulse-js-framework/runtime/router';

describe('Router', () => {
  test('matches static routes', async () => {
    const Home = () => el('div', 'Home');
    const About = () => el('div', 'About');

    const router = createRouter({
      routes: {
        '/': Home,
        '/about': About
      }
    });

    await router.navigate('/');
    assert.strictEqual(router.path.get(), '/');

    await router.navigate('/about');
    assert.strictEqual(router.path.get(), '/about');
  });

  test('extracts route params', async () => {
    const User = () => el('div', 'User');

    const router = createRouter({
      routes: {
        '/users/:id': User
      }
    });

    await router.navigate('/users/123');

    assert.strictEqual(router.params.get().id, '123');
  });

  test('handles query parameters', async () => {
    const Search = () => el('div', 'Search');

    const router = createRouter({
      routes: {
        '/search': Search
      }
    });

    await router.navigate('/search', { query: { q: 'test', page: '1' } });

    assert.deepStrictEqual(router.query.get(), { q: 'test', page: '1' });
  });

  test('guards can redirect', async () => {
    let isAuth = false;

    const router = createRouter({
      routes: {
        '/': () => el('div', 'Home'),
        '/login': () => el('div', 'Login'),
        '/dashboard': {
          handler: () => el('div', 'Dashboard'),
          beforeEnter: () => {
            if (!isAuth) return '/login';
          }
        }
      }
    });

    await router.navigate('/dashboard');
    assert.strictEqual(router.path.get(), '/login');

    isAuth = true;
    await router.navigate('/dashboard');
    assert.strictEqual(router.path.get(), '/dashboard');
  });
});
```

## Integration Testing

### Full Component Test

```javascript
describe('TodoApp integration', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
  });

  afterEach(() => {
    resetAdapter();
    resetContext();
  });

  test('complete todo workflow', () => {
    // Setup
    const todos = pulse([]);
    const newTodo = pulse('');

    const addTodo = () => {
      const text = newTodo.get().trim();
      if (!text) return;
      todos.update(t => [...t, { id: Date.now(), text, done: false }]);
      newTodo.set('');
    };

    const toggleTodo = (id) => {
      todos.update(t => t.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ));
    };

    const deleteTodo = (id) => {
      todos.update(t => t.filter(todo => todo.id !== id));
    };

    // Render app
    const app = el('.todo-app', [
      el('input', {
        value: () => newTodo.get(),
        oninput: (e) => newTodo.set(e.target.value)
      }),
      el('button.add', { onclick: addTodo }, 'Add'),
      el('ul', () => todos.get().map(todo =>
        el('li', { key: todo.id }, [
          el('input[type=checkbox]', {
            checked: todo.done,
            onchange: () => toggleTodo(todo.id)
          }),
          el('span', todo.text),
          el('button.delete', { onclick: () => deleteTodo(todo.id) }, 'X')
        ])
      ))
    ]);

    const root = adapter.createElement('div');
    adapter.setAttribute(root, 'id', 'app');
    adapter.appendChild(adapter.getBody(), root);
    mount('#app', app);

    // Test: Add todo
    const input = app.querySelector('input');
    const addButton = app.querySelector('button.add');

    input.value = 'Test todo';
    input.dispatchEvent(new Event('input'));
    addButton.click();

    assert.strictEqual(todos.get().length, 1);
    assert.strictEqual(todos.get()[0].text, 'Test todo');

    // Test: Toggle todo
    const checkbox = app.querySelector('input[type=checkbox]');
    checkbox.click();

    assert.strictEqual(todos.get()[0].done, true);

    // Test: Delete todo
    const deleteButton = app.querySelector('button.delete');
    deleteButton.click();

    assert.strictEqual(todos.get().length, 0);
  });
});
```

## Mocking

### HTTP Client Mock

```javascript
// Create mock HTTP client
function createMockHttp(responses = {}) {
  return {
    get: async (url) => {
      if (responses[url]) {
        return { data: responses[url], status: 200 };
      }
      throw new Error(`Not found: ${url}`);
    },
    post: async (url, data) => {
      return { data: { ...data, id: Date.now() }, status: 201 };
    },
    // ... other methods
  };
}

// Usage in tests
test('fetches user data', async () => {
  const mockHttp = createMockHttp({
    '/api/users/1': { id: 1, name: 'John' }
  });

  const { data } = useHttp(() => mockHttp.get('/api/users/1'));

  await new Promise(r => setTimeout(r, 0));

  assert.deepStrictEqual(data.get().data, { id: 1, name: 'John' });
});
```

### Context Mock

```javascript
import { createContext, Provider } from 'pulse-js-framework/runtime/context';

// Create test wrapper with mocked context
function renderWithContext(component, contextValue) {
  const TestContext = createContext(null);

  return Provider(TestContext, contextValue, () => component());
}

test('component uses context', () => {
  const mockUser = { id: 1, name: 'Test User' };

  const result = renderWithContext(
    () => UserProfile(),
    mockUser
  );

  assert.ok(result.textContent.includes('Test User'));
});
```
