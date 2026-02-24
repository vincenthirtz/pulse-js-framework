# Getting Started with Pulse

> Load this context file when onboarding new users or creating example projects.

## Getting Started

### Quick Start (5 minutes)

```javascript
// 1. Create a reactive value
import { pulse, effect, el, mount } from 'pulse-js-framework/runtime';

const count = pulse(0);

// 2. Create reactive UI
const Counter = () => el('.counter', [
  el('h1', () => `Count: ${count.get()}`),
  el('button', 'Increment', { onclick: () => count.update(n => n + 1) }),
  el('button', 'Reset', { onclick: () => count.set(0) })
]);

// 3. Mount to DOM
mount('#app', Counter());

// That's it! The UI updates automatically when count changes.
```

### Your First App

```javascript
import { pulse, computed, effect, el, mount, list } from 'pulse-js-framework/runtime';

// State
const todos = pulse([]);
const newTodo = pulse('');
const filter = pulse('all'); // 'all' | 'active' | 'completed'

// Derived state (computed)
const filteredTodos = computed(() => {
  const items = todos.get();
  switch (filter.get()) {
    case 'active': return items.filter(t => !t.done);
    case 'completed': return items.filter(t => t.done);
    default: return items;
  }
});

const remaining = computed(() => todos.get().filter(t => !t.done).length);

// Actions
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

// UI
const App = () => el('.todo-app', [
  el('h1', 'Todos'),
  el('.input-row', [
    el('input[placeholder=What needs to be done?]', {
      value: () => newTodo.get(),
      oninput: (e) => newTodo.set(e.target.value),
      onkeydown: (e) => e.key === 'Enter' && addTodo()
    }),
    el('button', 'Add', { onclick: addTodo })
  ]),
  list(
    () => filteredTodos.get(),
    (todo) => el('li', { class: () => todo.done ? 'done' : '' }, [
      el('input[type=checkbox]', {
        checked: () => todo.done,
        onchange: () => toggleTodo(todo.id)
      }),
      el('span', todo.text)
    ]),
    (todo) => todo.id  // Key function for efficient updates
  ),
  el('.footer', () => `${remaining.get()} items left`)
]);

mount('#app', App());
```

### Testing Your App

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pulse, computed, effect, createContext, withContext } from 'pulse-js-framework/runtime/pulse';

describe('Todo App', () => {
  test('adds a todo', () => {
    // Create isolated context for testing (no global state pollution)
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const todos = pulse([]);
      todos.update(t => [...t, { id: 1, text: 'Test', done: false }]);
      assert.strictEqual(todos.get().length, 1);
      assert.strictEqual(todos.get()[0].text, 'Test');
    });
  });

  test('computed updates automatically', () => {
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const count = pulse(0);
      const doubled = computed(() => count.get() * 2);

      assert.strictEqual(doubled.get(), 0);
      count.set(5);
      assert.strictEqual(doubled.get(), 10);
    });
  });
});
```

