# Mocking Strategies for Pulse Framework Tests

## DOM Mocking

### Option 1: MockDOMAdapter (recommended for runtime/dom.js tests)

```javascript
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';

let adapter;
beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});
afterEach(() => {
  resetAdapter();
});
```

MockDOMAdapter provides:
- `createElement(tag)` / `createTextNode(text)`
- `setAttribute()` / `getAttribute()` / `removeAttribute()`
- `appendChild()` / `removeChild()` / `insertBefore()` / `replaceChild()`
- `querySelector()` / `querySelectorAll()`
- `getBody()` / `getDocument()`
- `flushMicrotasks()` / `runAllTimers()` / `reset()`

### Option 2: mock-dom.js (for tests needing global DOM)

```javascript
import { createDOM } from './mock-dom.js';

let dom;
beforeEach(() => {
  dom = createDOM();
  globalThis.document = dom.document;
  globalThis.HTMLElement = dom.HTMLElement;
  globalThis.Node = dom.Node;
  globalThis.Event = dom.Event;
});
afterEach(() => {
  delete globalThis.document;
  delete globalThis.HTMLElement;
  delete globalThis.Node;
  delete globalThis.Event;
});
```

Provides: Event, CSSStyleDeclaration, DOMTokenList, Element, HTMLElement, Document, DocumentFragment.

### When to use which?

| Scenario | Use |
|----------|-----|
| Testing `el()`, `mount()`, `list()` | MockDOMAdapter |
| Testing DOM with `querySelector` | mock-dom.js |
| Testing a11y functions | mock-dom.js (needs full Element API) |
| Testing SSR | MockDOMAdapter (used internally by SSR) |
| Unit testing pure functions | Neither needed |

## HTTP Mocking

### Simple mock fetch

```javascript
function createMockFetch(routes) {
  return async (url, options = {}) => {
    const key = `${options.method || 'GET'} ${url}`;
    const route = routes[key] || routes[url];

    if (!route) {
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) };
    }

    if (route instanceof Error) throw route;

    return {
      ok: true,
      status: route.status || 200,
      statusText: route.statusText || 'OK',
      headers: new Map(Object.entries(route.headers || {})),
      json: async () => route.data || route,
      text: async () => JSON.stringify(route.data || route),
      clone: function() { return this; }
    };
  };
}

// Usage
const mockFetch = createMockFetch({
  '/api/users': { data: [{ id: 1, name: 'Alice' }] },
  'POST /api/users': { data: { id: 2, name: 'Bob' }, status: 201 },
  '/api/error': new Error('Network failure')
});
```

### Mock HTTP client

```javascript
function createMockHttp(responses = {}) {
  const interceptors = { request: [], response: [] };

  return {
    get: async (url, config) => responses[url] || { data: null, status: 200 },
    post: async (url, data) => responses[url] || { data: { ...data, id: Date.now() }, status: 201 },
    put: async (url, data) => ({ data, status: 200 }),
    patch: async (url, data) => ({ data, status: 200 }),
    delete: async (url) => ({ data: null, status: 204 }),
    interceptors: {
      request: { use: (fn) => interceptors.request.push(fn), clear: () => interceptors.request.length = 0 },
      response: { use: (fn) => interceptors.response.push(fn), clear: () => interceptors.response.length = 0 }
    }
  };
}
```

## WebSocket Mocking

```javascript
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = MockWebSocket.CONNECTING;
    this.bufferedAmount = 0;
    this._sent = [];
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this._sent.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.onclose?.({ code, reason, wasClean: true });
    }, 0);
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({ type: 'open' });
  }

  simulateMessage(data) {
    this.onmessage?.({
      type: 'message',
      data: typeof data === 'string' ? data : JSON.stringify(data)
    });
  }

  simulateError(error) {
    this.onerror?.(error || new Error('WebSocket error'));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: code === 1000 });
  }

  getSentMessages() { return this._sent; }
  getLastSent() { return this._sent[this._sent.length - 1]; }
}

// Install globally
beforeEach(() => { globalThis.WebSocket = MockWebSocket; });
afterEach(() => { delete globalThis.WebSocket; });
```

## Timer Mocking

### Node.js built-in mock timers

```javascript
import { mock } from 'node:test';

test('debounce waits then fires', () => {
  mock.timers.enable({ apis: ['setTimeout', 'clearTimeout'] });

  const calls = [];
  const fn = debounce(() => calls.push('called'), 300);

  fn(); fn(); fn();
  assert.strictEqual(calls.length, 0);

  mock.timers.tick(300);
  assert.strictEqual(calls.length, 1);

  mock.timers.reset();
});

test('interval fires repeatedly', () => {
  mock.timers.enable({ apis: ['setInterval', 'clearInterval'] });

  let count = 0;
  const id = setInterval(() => count++, 100);

  mock.timers.tick(350);
  assert.strictEqual(count, 3);

  clearInterval(id);
  mock.timers.tick(200);
  assert.strictEqual(count, 3); // Stopped

  mock.timers.reset();
});
```

### Mocking Date

```javascript
mock.timers.enable({ apis: ['Date'] });
mock.timers.setSystemTime(new Date('2026-01-01'));

assert.strictEqual(new Date().getFullYear(), 2026);

mock.timers.reset();
```

## Function Mocking

### Node.js test mock

```javascript
import { mock } from 'node:test';

test('callback is called', () => {
  const fn = mock.fn();

  someFunction(fn);

  assert.strictEqual(fn.mock.callCount(), 1);
  assert.deepStrictEqual(fn.mock.calls[0].arguments, ['expected-arg']);
});

test('mock implementation', () => {
  const fn = mock.fn(() => 42);

  assert.strictEqual(fn(), 42);
  assert.strictEqual(fn.mock.callCount(), 1);
});
```

## Storage Mocking

```javascript
function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null
  };
}

beforeEach(() => {
  globalThis.localStorage = createMockStorage();
  globalThis.sessionStorage = createMockStorage();
});
afterEach(() => {
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});
```

## Console Mocking (suppress output in tests)

```javascript
let originalConsole;
beforeEach(() => {
  originalConsole = { ...console };
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
});
afterEach(() => {
  Object.assign(console, originalConsole);
});

// Or capture output
const logs = [];
console.log = (...args) => logs.push(args);
```
