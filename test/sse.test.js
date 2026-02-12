/**
 * SSE Module Tests
 * Tests for runtime/sse.js — SSEError, createSSE, useSSE
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { pulse, effect, resetContext } from '../runtime/pulse.js';
import { SSEError, createSSE, useSSE } from '../runtime/sse.js';

// ============================================================================
// Mock EventSource
// ============================================================================

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  static instances = [];
  static lastInstance = null;

  constructor(url, options = {}) {
    this.url = url;
    this.withCredentials = options.withCredentials || false;
    this.readyState = MockEventSource.CONNECTING;
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    this._listeners = new Map();

    MockEventSource.instances.push(this);
    MockEventSource.lastInstance = this;
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    const handlers = this._listeners.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    if (this.onopen) this.onopen({ type: 'open' });
  }

  simulateMessage(data, options = {}) {
    const event = {
      type: options.type || 'message',
      data: typeof data === 'string' ? data : JSON.stringify(data),
      lastEventId: options.lastEventId || '',
    };
    // Fire registered listeners
    const handlers = this._listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
  }

  simulateError() {
    if (this.onerror) this.onerror({ type: 'error' });
  }

  static reset() {
    MockEventSource.instances = [];
    MockEventSource.lastInstance = null;
  }
}

// ============================================================================
// Setup / Teardown
// ============================================================================

let originalEventSource;

beforeEach(() => {
  MockEventSource.reset();
  originalEventSource = globalThis.EventSource;
  globalThis.EventSource = MockEventSource;
  resetContext();
});

afterEach(() => {
  globalThis.EventSource = originalEventSource;
  resetContext();
});

// ============================================================================
// SSEError Tests
// ============================================================================

describe('SSEError', () => {
  test('creates error with correct name and code', () => {
    const err = new SSEError('test error', { sseCode: 'CONNECT_FAILED' });
    assert.strictEqual(err.name, 'SSEError');
    assert.strictEqual(err.sseCode, 'CONNECT_FAILED');
    assert.strictEqual(err.message, 'test error');
  });

  test('defaults sseCode to UNKNOWN', () => {
    const err = new SSEError('test');
    assert.strictEqual(err.sseCode, 'UNKNOWN');
  });

  test('isSSEError returns true for SSEError instances', () => {
    const err = new SSEError('test');
    assert.ok(SSEError.isSSEError(err));
    assert.ok(!SSEError.isSSEError(new Error('test')));
  });

  test('helper methods detect correct codes', () => {
    assert.ok(new SSEError('', { sseCode: 'CONNECT_FAILED' }).isConnectFailed());
    assert.ok(new SSEError('', { sseCode: 'TIMEOUT' }).isTimeout());
    assert.ok(new SSEError('', { sseCode: 'MAX_RETRIES' }).isMaxRetries());
    assert.ok(new SSEError('', { sseCode: 'CLOSED' }).isClosed());
  });

  test('helper methods return false for other codes', () => {
    const err = new SSEError('', { sseCode: 'CONNECT_FAILED' });
    assert.ok(!err.isTimeout());
    assert.ok(!err.isMaxRetries());
    assert.ok(!err.isClosed());
  });
});

// ============================================================================
// URL Validation Tests
// ============================================================================

describe('URL validation', () => {
  test('throws SSEError for empty string URL', () => {
    assert.throws(() => createSSE(''), (err) => {
      return SSEError.isSSEError(err) && err.isConnectFailed();
    });
  });

  test('throws SSEError for non-string URL', () => {
    assert.throws(() => createSSE(123), (err) => {
      return SSEError.isSSEError(err);
    });
  });

  test('throws SSEError for null URL', () => {
    assert.throws(() => createSSE(null), (err) => {
      return SSEError.isSSEError(err);
    });
  });
});

// ============================================================================
// createSSE Tests
// ============================================================================

describe('createSSE', () => {
  test('returns object with reactive state and methods', () => {
    const sse = createSSE('http://localhost/events', { immediate: false });

    assert.ok(sse.state);
    assert.ok(sse.connected);
    assert.ok(sse.reconnecting);
    assert.ok(sse.reconnectAttempt);
    assert.ok(sse.error);
    assert.ok(sse.lastEventId);
    assert.strictEqual(typeof sse.connect, 'function');
    assert.strictEqual(typeof sse.close, 'function');
    assert.strictEqual(typeof sse.addEventListener, 'function');
    assert.strictEqual(typeof sse.removeEventListener, 'function');
    assert.strictEqual(typeof sse.dispose, 'function');
    assert.strictEqual(typeof sse.on, 'function');
    assert.strictEqual(typeof sse.off, 'function');
  });

  test('initial state is closed when not immediate', () => {
    const sse = createSSE('http://localhost/events', { immediate: false });
    assert.strictEqual(sse.state.get(), 'closed');
    assert.strictEqual(sse.connected.get(), false);
    assert.strictEqual(sse.error.get(), null);
  });

  test('connects immediately by default', () => {
    const sse = createSSE('http://localhost/events');
    assert.strictEqual(MockEventSource.instances.length, 1);
    assert.strictEqual(sse.state.get(), 'connecting');
    sse.dispose();
  });

  test('does not connect when immediate is false', () => {
    const sse = createSSE('http://localhost/events', { immediate: false });
    assert.strictEqual(MockEventSource.instances.length, 0);
    assert.strictEqual(sse.state.get(), 'closed');
  });

  test('manual connect creates EventSource', () => {
    const sse = createSSE('http://localhost/events', { immediate: false });
    sse.connect();
    assert.strictEqual(MockEventSource.instances.length, 1);
    assert.strictEqual(MockEventSource.lastInstance.url, 'http://localhost/events');
    sse.dispose();
  });

  test('state transitions to open on connection', () => {
    const sse = createSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;

    assert.strictEqual(sse.state.get(), 'connecting');
    es.simulateOpen();
    assert.strictEqual(sse.state.get(), 'open');
    assert.strictEqual(sse.connected.get(), true);
    sse.dispose();
  });

  test('passes withCredentials option', () => {
    const sse = createSSE('http://localhost/events', { withCredentials: true });
    assert.strictEqual(MockEventSource.lastInstance.withCredentials, true);
    sse.dispose();
  });

  test('close method sets state to closed', () => {
    const sse = createSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    sse.close();
    assert.strictEqual(sse.state.get(), 'closed');
    assert.strictEqual(sse.connected.get(), false);
  });

  test('calls onOpen callback', () => {
    let openCalled = false;
    const sse = createSSE('http://localhost/events', {
      onOpen: () => { openCalled = true; }
    });
    MockEventSource.lastInstance.simulateOpen();
    assert.ok(openCalled);
    sse.dispose();
  });

  test('calls onMessage callback with parsed JSON data', () => {
    let receivedData = null;
    const sse = createSSE('http://localhost/events', {
      onMessage: (data) => { receivedData = data; }
    });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage({ hello: 'world' });

    assert.deepStrictEqual(receivedData, { hello: 'world' });
    sse.dispose();
  });

  test('keeps data as string when JSON parsing fails', () => {
    let receivedData = null;
    const sse = createSSE('http://localhost/events', {
      onMessage: (data) => { receivedData = data; }
    });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage('not json');

    assert.strictEqual(receivedData, 'not json');
    sse.dispose();
  });

  test('does not parse JSON when parseJSON is false', () => {
    let receivedData = null;
    const sse = createSSE('http://localhost/events', {
      parseJSON: false,
      onMessage: (data) => { receivedData = data; }
    });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage({ foo: 'bar' });

    // Should be the raw JSON string
    assert.strictEqual(typeof receivedData, 'string');
    assert.strictEqual(receivedData, '{"foo":"bar"}');
    sse.dispose();
  });

  test('tracks lastEventId', () => {
    const sse = createSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    assert.strictEqual(sse.lastEventId.get(), null);
    es.simulateMessage('data', { lastEventId: 'evt-42' });
    assert.strictEqual(sse.lastEventId.get(), 'evt-42');
    sse.dispose();
  });

  test('addEventListener registers custom event listener', () => {
    let received = null;
    const sse = createSSE('http://localhost/events', {
      events: ['message', 'custom-event'],
    });
    sse.addEventListener('custom-event', (data) => { received = data; });

    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage({ value: 1 }, { type: 'custom-event' });

    assert.deepStrictEqual(received, { value: 1 });
    sse.dispose();
  });

  test('removeEventListener removes listener', () => {
    let callCount = 0;
    const handler = () => { callCount++; };
    const sse = createSSE('http://localhost/events');
    sse.addEventListener('test', handler);

    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage('data', { type: 'test' });
    assert.strictEqual(callCount, 1);

    sse.removeEventListener('test', handler);
    es.simulateMessage('data', { type: 'test' });
    assert.strictEqual(callCount, 1);
    sse.dispose();
  });

  test('dispose prevents further operations', () => {
    const sse = createSSE('http://localhost/events');
    sse.dispose();

    // Calling connect after dispose should not create new EventSource
    const countBefore = MockEventSource.instances.length;
    sse.connect();
    assert.strictEqual(MockEventSource.instances.length, countBefore);
  });

  test('on/off are aliases for addEventListener/removeEventListener', () => {
    const sse = createSSE('http://localhost/events', { immediate: false });
    assert.strictEqual(sse.on, sse.addEventListener);
    assert.strictEqual(sse.off, sse.removeEventListener);
  });

  test('calls onError callback on connection error', () => {
    let errorReceived = null;
    const sse = createSSE('http://localhost/events', {
      reconnect: false,
      onError: (err) => { errorReceived = err; }
    });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateError();

    assert.ok(errorReceived);
    assert.ok(SSEError.isSSEError(errorReceived));
    sse.dispose();
  });

  test('reconnect resets attempt counter on successful connection', () => {
    const sse = createSSE('http://localhost/events', { reconnect: true });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    assert.strictEqual(sse.reconnectAttempt.get(), 0);
    sse.dispose();
  });
});

// ============================================================================
// createSSE - No EventSource Environment
// ============================================================================

describe('createSSE without EventSource', () => {
  test('sets error when EventSource not available', () => {
    const saved = globalThis.EventSource;
    delete globalThis.EventSource;

    const sse = createSSE('http://localhost/events');
    assert.ok(sse.error.get());
    assert.ok(SSEError.isSSEError(sse.error.get()));
    assert.ok(sse.error.get().isConnectFailed());

    globalThis.EventSource = saved;
  });
});

// ============================================================================
// useSSE Tests
// ============================================================================

describe('useSSE', () => {
  test('returns reactive data and connected state', () => {
    const result = useSSE('http://localhost/events');

    assert.ok(result.data);
    assert.ok(result.connected);
    assert.ok(result.error);
    assert.ok(result.reconnecting);
    assert.ok(result.lastEventId);
    assert.strictEqual(typeof result.close, 'function');
    assert.strictEqual(typeof result.reconnect, 'function');
    assert.ok(result.sse);

    assert.strictEqual(result.data.get(), null);
    result.sse.dispose();
  });

  test('data updates on message', () => {
    const result = useSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    assert.strictEqual(result.data.get(), null);
    es.simulateMessage({ count: 1 });
    assert.deepStrictEqual(result.data.get(), { count: 1 });

    es.simulateMessage({ count: 2 });
    assert.deepStrictEqual(result.data.get(), { count: 2 });
    result.sse.dispose();
  });

  test('connected reflects connection state', () => {
    const result = useSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;

    assert.strictEqual(result.connected.get(), false);
    es.simulateOpen();
    assert.strictEqual(result.connected.get(), true);
    result.sse.dispose();
  });

  test('close method disconnects', () => {
    const result = useSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    result.close();
    assert.strictEqual(result.connected.get(), false);
    result.sse.dispose();
  });

  test('reconnect method re-establishes connection', () => {
    const result = useSSE('http://localhost/events');
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    result.close();

    const countBefore = MockEventSource.instances.length;
    result.reconnect();
    assert.strictEqual(MockEventSource.instances.length, countBefore + 1);
    result.sse.dispose();
  });

  test('tracks message history when messageHistorySize is set', () => {
    const result = useSSE('http://localhost/events', { messageHistorySize: 3 });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    assert.ok(result.messages);
    assert.deepStrictEqual(result.messages.get(), []);

    es.simulateMessage({ a: 1 });
    es.simulateMessage({ b: 2 });
    es.simulateMessage({ c: 3 });
    assert.strictEqual(result.messages.get().length, 3);

    // Should cap at messageHistorySize
    es.simulateMessage({ d: 4 });
    assert.strictEqual(result.messages.get().length, 3);
    assert.deepStrictEqual(result.messages.get()[0], { b: 2 });
    result.sse.dispose();
  });

  test('clearMessages empties the history', () => {
    const result = useSSE('http://localhost/events', { messageHistorySize: 10 });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();

    es.simulateMessage('msg1');
    es.simulateMessage('msg2');
    assert.strictEqual(result.messages.get().length, 2);

    result.clearMessages();
    assert.deepStrictEqual(result.messages.get(), []);
    result.sse.dispose();
  });

  test('no messages property when messageHistorySize is not set', () => {
    const result = useSSE('http://localhost/events');
    assert.strictEqual(result.messages, undefined);
    result.sse.dispose();
  });

  test('calls user onMessage callback', () => {
    let received = null;
    const result = useSSE('http://localhost/events', {
      onMessage: (data) => { received = data; }
    });
    const es = MockEventSource.lastInstance;
    es.simulateOpen();
    es.simulateMessage({ test: true });

    assert.deepStrictEqual(received, { test: true });
    result.sse.dispose();
  });
});
