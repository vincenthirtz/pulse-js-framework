# Advanced Pulse Patterns

## Table of Contents

1. [Component Composition](#component-composition)
2. [Context and Dependency Injection](#context-and-dependency-injection)
3. [Error Boundaries](#error-boundaries)
4. [Optimistic Updates](#optimistic-updates)
5. [Real-time Data](#real-time-data)
6. [Testing Patterns](#testing-patterns)

## Component Composition

### Slots for Content Projection

```pulse
// Card.pulse
@component Card

props {
  title: string
}

view {
  .card {
    h2.card-title "{title}"
    .card-body {
      slot  // Default slot
    }
    .card-footer {
      slot "actions"  // Named slot
    }
  }
}
```

Usage:
```pulse
Card[title="My Card"] {
  p "Card content goes here"
  @slot(actions) {
    Button { "Save" }
    Button { "Cancel" }
  }
}
```

### Higher-Order Components

```javascript
function withLoading(Component) {
  return (props) => {
    const { data, loading } = useAsync(() => props.fetchData());

    return when(
      () => loading.get(),
      () => el('.spinner', 'Loading...'),
      () => Component({ ...props, data: data.get() })
    );
  };
}

const UserListWithLoading = withLoading(UserList);
```

## Context and Dependency Injection

### Theme Context

```javascript
import { createContext, Provider, useContext } from 'pulse-js-framework/runtime/context';

const ThemeContext = createContext('light');

// Provider at app root
Provider(ThemeContext, themePulse, () => App());

// Consumer in any component
function ThemedButton({ children }) {
  const theme = useContext(ThemeContext);
  return el('button', {
    class: () => `btn btn-${theme.get()}`
  }, children);
}
```

### Service Injection

```javascript
const ApiContext = createContext(null);

// Inject real API in app
Provider(ApiContext, realApiService, () => App());

// Inject mock in tests
Provider(ApiContext, mockApiService, () => TestApp());

// Use in components
function UserProfile({ userId }) {
  const api = useContext(ApiContext);
  const { data } = useAsync(() => api.get().getUser(userId));
  // ...
}
```

## Error Boundaries

### Effect Error Handling

```javascript
import { effect, onEffectError } from 'pulse-js-framework/runtime/pulse';

// Global error handler
onEffectError((err) => {
  console.error('Effect failed:', err.effectId, err.cause);
  errorReporter.send(err);
});

// Per-effect error handling
effect(() => {
  riskyOperation();
}, {
  id: 'risky-effect',
  onError: (err) => {
    showErrorToast(err.cause.message);
  }
});
```

### Async Error Boundaries

```javascript
function ErrorBoundary({ children, fallback }) {
  const error = pulse(null);

  return when(
    () => error.get(),
    () => fallback(error.get(), () => error.set(null)),
    () => {
      try {
        return children();
      } catch (e) {
        error.set(e);
        return null;
      }
    }
  );
}

// Usage
ErrorBoundary({
  fallback: (err, retry) => el('.error', [
    el('p', err.message),
    el('button', { onclick: retry }, 'Retry')
  ]),
  children: () => RiskyComponent()
});
```

## Optimistic Updates

### With GraphQL Mutations

```javascript
import { useMutation } from 'pulse-js-framework/runtime/graphql';

const { mutate } = useMutation(
  `mutation UpdateTodo($id: ID!, $done: Boolean!) {
    updateTodo(id: $id, done: $done) { id done }
  }`,
  {
    onMutate: ({ id, done }) => {
      // Optimistic update
      const previous = todos.get();
      todos.update(t => t.map(todo =>
        todo.id === id ? { ...todo, done } : todo
      ));
      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      todos.set(context.previous);
      showError('Failed to update');
    },
    onSuccess: () => {
      showSuccess('Updated!');
    }
  }
);
```

### With HTTP Client

```javascript
async function toggleTodo(id) {
  const todo = todos.get().find(t => t.id === id);
  const newDone = !todo.done;

  // Optimistic update
  todos.update(t => t.map(item =>
    item.id === id ? { ...item, done: newDone } : item
  ));

  try {
    await api.patch(`/todos/${id}`, { done: newDone });
  } catch (error) {
    // Rollback
    todos.update(t => t.map(item =>
      item.id === id ? { ...item, done: !newDone } : item
    ));
    showError('Update failed');
  }
}
```

## Real-time Data

### WebSocket with Reconnection

```javascript
import { useWebSocket } from 'pulse-js-framework/runtime/websocket';

const { connected, lastMessage, send } = useWebSocket('wss://api.example.com/ws', {
  messageHistorySize: 100,
  onMessage: (data) => {
    if (data.type === 'notification') {
      notifications.update(n => [...n, data.payload]);
    }
  }
});

// React to connection state
effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channels: ['updates'] });
  }
});
```

### GraphQL Subscriptions

```javascript
import { useSubscription } from 'pulse-js-framework/runtime/graphql';

const { data: newMessage } = useSubscription(
  `subscription OnMessage($roomId: ID!) {
    messageAdded(roomId: $roomId) { id content author }
  }`,
  { roomId: currentRoom.get() },
  {
    onData: (message) => {
      messages.update(m => [...m, message]);
    },
    shouldResubscribe: true
  }
);
```

## Testing Patterns

### Isolated Reactive Context

```javascript
import { test, describe } from 'node:test';
import { createContext, withContext, pulse, effect } from 'pulse-js-framework/runtime/pulse';

describe('Counter', () => {
  test('increments value', () => {
    const ctx = createContext({ name: 'test' });

    withContext(ctx, () => {
      const count = pulse(0);
      count.update(n => n + 1);
      assert.strictEqual(count.get(), 1);
    });

    ctx.reset(); // Clean up
  });
});
```

### Testing Components with Mock DOM

```javascript
import { setAdapter, MockDOMAdapter, resetAdapter } from 'pulse-js-framework/runtime/dom-adapter';

describe('Button component', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = new MockDOMAdapter();
    setAdapter(mockAdapter);
  });

  afterEach(() => {
    resetAdapter();
  });

  test('renders with correct class', () => {
    const button = Button({ variant: 'primary' });
    assert(button.className.includes('btn-primary'));
  });
});
```

### Testing Async Operations

```javascript
import { useAsync } from 'pulse-js-framework/runtime/async';

test('fetches and displays data', async () => {
  const mockFetch = () => Promise.resolve({ users: [{ id: 1, name: 'Test' }] });

  const { data, loading } = useAsync(mockFetch);

  assert.strictEqual(loading.get(), true);

  // Wait for async operation
  await new Promise(r => setTimeout(r, 0));

  assert.strictEqual(loading.get(), false);
  assert.deepStrictEqual(data.get(), { users: [{ id: 1, name: 'Test' }] });
});
```

### Testing Forms

```javascript
import { useForm, validators } from 'pulse-js-framework/runtime/form';

test('validates email field', () => {
  const { fields, isValid } = useForm(
    { email: '' },
    { email: [validators.required(), validators.email()] }
  );

  assert.strictEqual(isValid.get(), false);

  fields.email.onChange({ target: { value: 'invalid' } });
  fields.email.onBlur();
  assert.strictEqual(fields.email.error.get(), 'Invalid email address');

  fields.email.onChange({ target: { value: 'test@example.com' } });
  assert.strictEqual(isValid.get(), true);
});
```
