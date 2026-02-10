/**
 * WebSocket Module Tests
 * Tests for createWebSocket, useWebSocket, WebSocketError
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  wait,
  createSpy
} from './utils.js';

import {
  createWebSocket,
  useWebSocket,
  WebSocketError,
  MessageInterceptorManager
} from '../runtime/websocket.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

// ============================================================================
// Mock WebSocket
// ============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances = [];
  static lastInstance = null;

  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = MockWebSocket.CONNECTING;
    this.binaryType = 'blob';
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.sentMessages = [];

    MockWebSocket.instances.push(this);
    MockWebSocket.lastInstance = this;
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ code, reason, wasClean: code === 1000 });
      }
    }, 0);
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen({ type: 'open' });
    }
  }

  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data, type: 'message' });
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror({ type: 'error' });
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: code === 1000 });
    }
  }

  static reset() {
    MockWebSocket.instances = [];
    MockWebSocket.lastInstance = null;
  }
}

// Install mock WebSocket globally
global.WebSocket = MockWebSocket;

// ============================================================================
// WebSocketError Tests
// ============================================================================

describe('WebSocketError Tests', () => {
  test('WebSocketError - creates error with message', () => {
    const error = new WebSocketError('Connection failed');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof WebSocketError);
    assert.strictEqual(error.name, 'WebSocketError');
    assert.ok(error.message.includes('Connection failed'));
  });

  test('WebSocketError - stores error code', () => {
    const error = new WebSocketError('Timeout', { code: 'TIMEOUT' });
    assert.strictEqual(error.code, 'TIMEOUT');
  });

  test('WebSocketError - stores URL', () => {
    const error = new WebSocketError('Failed', { url: 'wss://example.com' });
    assert.strictEqual(error.url, 'wss://example.com');
  });

  test('WebSocketError - stores close code and reason', () => {
    const error = new WebSocketError('Closed', {
      code: 'CLOSE',
      closeCode: 1006,
      closeReason: 'Abnormal closure'
    });
    assert.strictEqual(error.closeCode, 1006);
    assert.strictEqual(error.closeReason, 'Abnormal closure');
  });

  test('WebSocketError - isWebSocketError static method', () => {
    const wsError = new WebSocketError('test');
    const plainError = new Error('test');

    assert.ok(WebSocketError.isWebSocketError(wsError));
    assert.ok(!WebSocketError.isWebSocketError(plainError));
    assert.ok(!WebSocketError.isWebSocketError(null));
    assert.ok(!WebSocketError.isWebSocketError(undefined));
  });

  test('WebSocketError - type check methods', () => {
    const connectError = new WebSocketError('test', { code: 'CONNECT_FAILED' });
    const closeError = new WebSocketError('test', { code: 'CLOSE' });
    const timeoutError = new WebSocketError('test', { code: 'TIMEOUT' });
    const parseError = new WebSocketError('test', { code: 'PARSE_ERROR' });
    const sendError = new WebSocketError('test', { code: 'SEND_FAILED' });

    assert.ok(connectError.isConnectFailed());
    assert.ok(closeError.isClose());
    assert.ok(timeoutError.isTimeout());
    assert.ok(parseError.isParseError());
    assert.ok(sendError.isSendFailed());
  });
});

// ============================================================================
// MessageInterceptorManager Tests
// ============================================================================

describe('MessageInterceptorManager Tests', () => {
  test('MessageInterceptorManager - add interceptor returns ID', () => {
    const manager = new MessageInterceptorManager();
    const id = manager.use((data) => data);
    assert.strictEqual(typeof id, 'number');
    assert.strictEqual(manager.size, 1);
  });

  test('MessageInterceptorManager - eject removes interceptor', () => {
    const manager = new MessageInterceptorManager();
    const id = manager.use((data) => data);
    assert.strictEqual(manager.size, 1);
    manager.eject(id);
    assert.strictEqual(manager.size, 0);
  });

  test('MessageInterceptorManager - clear removes all', () => {
    const manager = new MessageInterceptorManager();
    manager.use((data) => data);
    manager.use((data) => data);
    assert.strictEqual(manager.size, 2);
    manager.clear();
    assert.strictEqual(manager.size, 0);
  });

  test('MessageInterceptorManager - iterable', () => {
    const manager = new MessageInterceptorManager();
    const fn1 = (data) => data;
    const fn2 = (data) => data;
    manager.use(fn1);
    manager.use(fn2);

    const handlers = [...manager];
    assert.strictEqual(handlers.length, 2);
    assert.strictEqual(handlers[0].onMessage, fn1);
    assert.strictEqual(handlers[1].onMessage, fn2);
  });
});

// ============================================================================
// createWebSocket Tests
// ============================================================================

describe('createWebSocket Tests', () => {
  test('createWebSocket - returns expected interface', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: false });

    // Reactive state
    assert.ok(ws.state);
    assert.ok(ws.connected);
    assert.ok(ws.reconnecting);
    assert.ok(ws.reconnectAttempt);
    assert.ok(ws.error);
    assert.ok(ws.queuedCount);

    // Methods
    assert.strictEqual(typeof ws.connect, 'function');
    assert.strictEqual(typeof ws.disconnect, 'function');
    assert.strictEqual(typeof ws.send, 'function');
    assert.strictEqual(typeof ws.sendJson, 'function');
    assert.strictEqual(typeof ws.sendBinary, 'function');
    assert.strictEqual(typeof ws.dispose, 'function');

    // Events
    assert.strictEqual(typeof ws.on, 'function');
    assert.strictEqual(typeof ws.off, 'function');
    assert.strictEqual(typeof ws.once, 'function');

    // Interceptors
    assert.ok(ws.interceptors.incoming);
    assert.ok(ws.interceptors.outgoing);

    // Properties
    assert.strictEqual(ws.url, 'wss://example.com');

    ws.dispose();
  });

  test('createWebSocket - initial state is closed', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: false });

    assert.strictEqual(ws.state.get(), 'closed');
    assert.strictEqual(ws.connected.get(), false);
    assert.strictEqual(ws.reconnecting.get(), false);
    assert.strictEqual(ws.reconnectAttempt.get(), 0);
    assert.strictEqual(ws.error.get(), null);

    ws.dispose();
  });

  test('createWebSocket - autoConnect true connects immediately', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    assert.strictEqual(ws.state.get(), 'connecting');
    assert.ok(MockWebSocket.lastInstance);

    ws.dispose();
  });

  test('createWebSocket - autoConnect false does not connect', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: false });

    assert.strictEqual(ws.state.get(), 'closed');
    assert.strictEqual(MockWebSocket.lastInstance, null);

    ws.dispose();
  });

  test('createWebSocket - connect changes state to connecting', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: false });

    ws.connect();
    assert.strictEqual(ws.state.get(), 'connecting');

    ws.dispose();
  });

  test('createWebSocket - state becomes open on connection', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);

    assert.strictEqual(ws.state.get(), 'open');
    assert.strictEqual(ws.connected.get(), true);

    ws.dispose();
  });

  test('createWebSocket - emits open event', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    ws.on('open', spy);
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);

    assert.strictEqual(spy.callCount, 1);

    ws.dispose();
  });

  test('createWebSocket - emits message event', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    ws.on('message', spy);
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"type":"test"}');
    await wait(10);

    assert.strictEqual(spy.callCount, 1);
    assert.deepStrictEqual(spy.calls[0][0], { type: 'test' });

    ws.dispose();
  });

  test('createWebSocket - auto-parses JSON messages', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      autoParseJson: true
    });

    ws.on('message', spy);
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"key":"value"}');
    await wait(10);

    assert.deepStrictEqual(spy.calls[0][0], { key: 'value' });

    ws.dispose();
  });

  test('createWebSocket - keeps string if not valid JSON', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      autoParseJson: true
    });

    ws.on('message', spy);
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('not json');
    await wait(10);

    assert.strictEqual(spy.calls[0][0], 'not json');

    ws.dispose();
  });

  test('createWebSocket - send queues messages when disconnected', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: false,
      queueWhileDisconnected: true
    });

    ws.send({ type: 'test1' });
    ws.send({ type: 'test2' });

    assert.strictEqual(ws.queuedCount.get(), 2);

    ws.dispose();
  });

  test('createWebSocket - flushes queue on connect', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: false,
      queueWhileDisconnected: true
    });

    ws.send({ type: 'test1' });
    ws.send({ type: 'test2' });
    assert.strictEqual(ws.queuedCount.get(), 2);

    ws.connect();
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);

    assert.strictEqual(ws.queuedCount.get(), 0);
    assert.strictEqual(MockWebSocket.lastInstance.sentMessages.length, 2);

    ws.dispose();
  });

  test('createWebSocket - throws when sending without queue', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: false,
      queueWhileDisconnected: false
    });

    assert.throws(() => {
      ws.send({ type: 'test' });
    }, (err) => { assert.ok(err.message.includes('not connected')); return true; });

    ws.dispose();
  });

  test('createWebSocket - disconnect closes connection', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);

    assert.strictEqual(ws.state.get(), 'open');
    ws.disconnect();
    assert.strictEqual(ws.state.get(), 'closing');

    ws.dispose();
  });

  test('createWebSocket - incoming interceptors transform messages', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    ws.interceptors.incoming.use((data) => ({ ...data, intercepted: true }));
    ws.on('message', spy);

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"original":true}');
    await wait(10);

    assert.deepStrictEqual(spy.calls[0][0], { original: true, intercepted: true });

    ws.dispose();
  });

  test('createWebSocket - outgoing interceptors transform messages', async () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    ws.interceptors.outgoing.use((data) => {
      const parsed = JSON.parse(data);
      return JSON.stringify({ ...parsed, intercepted: true });
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    ws.send({ original: true });

    const sent = JSON.parse(MockWebSocket.lastInstance.sentMessages[0]);
    assert.deepStrictEqual(sent, { original: true, intercepted: true });

    ws.dispose();
  });

  test('createWebSocket - emits close event', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: false
    });

    ws.on('close', spy);
    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateClose(1000);
    await wait(10);

    assert.strictEqual(spy.callCount, 1);
    assert.strictEqual(spy.calls[0][0].code, 1000);

    ws.dispose();
  });

  test('createWebSocket - dispose cleans up', () => {
    MockWebSocket.reset();
    const ws = createWebSocket('wss://example.com', { autoConnect: true });

    ws.dispose();
    assert.strictEqual(ws.state.get(), 'closed');
  });
});

// ============================================================================
// useWebSocket Tests
// ============================================================================

describe('useWebSocket Tests', () => {
  test('useWebSocket - returns expected interface', () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', { immediate: false });

    // State
    assert.ok(result.connected);
    assert.ok(result.lastMessage);
    assert.ok(result.messages);
    assert.ok(result.error);
    assert.ok(result.reconnecting);
    assert.ok(result.state);
    assert.ok(result.queuedCount);

    // Methods
    assert.strictEqual(typeof result.send, 'function');
    assert.strictEqual(typeof result.sendJson, 'function');
    assert.strictEqual(typeof result.sendBinary, 'function');
    assert.strictEqual(typeof result.connect, 'function');
    assert.strictEqual(typeof result.disconnect, 'function');
    assert.strictEqual(typeof result.clearMessages, 'function');
    assert.strictEqual(typeof result.clearError, 'function');

    // Underlying instance
    assert.ok(result.ws);

    result.ws.dispose();
  });

  test('useWebSocket - immediate false does not connect', () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', { immediate: false });

    assert.strictEqual(result.state.get(), 'closed');
    assert.strictEqual(MockWebSocket.lastInstance, null);

    result.ws.dispose();
  });

  test('useWebSocket - immediate true connects', () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', { immediate: true });

    assert.strictEqual(result.state.get(), 'connecting');

    result.ws.dispose();
  });

  test('useWebSocket - updates lastMessage on message', async () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', { immediate: true });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"type":"update"}');
    await wait(10);

    assert.deepStrictEqual(result.lastMessage.get(), { type: 'update' });

    result.ws.dispose();
  });

  test('useWebSocket - stores message history', async () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      messageHistorySize: 10
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":1}');
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":2}');
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":3}');
    await wait(10);

    const messages = result.messages.get();
    assert.strictEqual(messages.length, 3);
    assert.deepStrictEqual(messages[0], { n: 1 });
    assert.deepStrictEqual(messages[2], { n: 3 });

    result.ws.dispose();
  });

  test('useWebSocket - limits message history size', async () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      messageHistorySize: 2
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":1}');
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":2}');
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":3}');
    await wait(10);

    const messages = result.messages.get();
    assert.strictEqual(messages.length, 2);
    assert.deepStrictEqual(messages[0], { n: 2 });
    assert.deepStrictEqual(messages[1], { n: 3 });

    result.ws.dispose();
  });

  test('useWebSocket - clearMessages empties history', async () => {
    MockWebSocket.reset();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      messageHistorySize: 10
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"n":1}');
    await wait(10);

    assert.strictEqual(result.messages.get().length, 1);
    result.clearMessages();
    assert.strictEqual(result.messages.get().length, 0);

    result.ws.dispose();
  });

  test('useWebSocket - calls onMessage callback', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      onMessage: spy
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateMessage('{"type":"test"}');
    await wait(10);

    assert.strictEqual(spy.callCount, 1);
    assert.deepStrictEqual(spy.calls[0][0], { type: 'test' });

    result.ws.dispose();
  });

  test('useWebSocket - calls onOpen callback', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      onOpen: spy
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);

    assert.strictEqual(spy.callCount, 1);

    result.ws.dispose();
  });

  test('useWebSocket - calls onClose callback', async () => {
    MockWebSocket.reset();
    const spy = createSpy();
    const result = useWebSocket('wss://example.com', {
      immediate: true,
      reconnect: false,
      onClose: spy
    });

    await wait(10);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    MockWebSocket.lastInstance.simulateClose(1000);
    await wait(10);

    assert.strictEqual(spy.callCount, 1);

    result.ws.dispose();
  });
});
