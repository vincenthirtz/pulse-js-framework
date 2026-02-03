/**
 * WebSocket Module Tests
 * Tests for createWebSocket, useWebSocket, WebSocketError
 */

import {
  test,
  testAsync,
  runAsyncTests,
  printResults,
  exitWithCode,
  assertEqual,
  assertDeepEqual,
  assertThrows,
  assertTruthy,
  assertFalsy,
  assertInstanceOf,
  assertType,
  wait,
  createSpy,
  printSection
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

printSection('WebSocketError Tests');

test('WebSocketError - creates error with message', () => {
  const error = new WebSocketError('Connection failed');
  assertInstanceOf(error, Error);
  assertInstanceOf(error, WebSocketError);
  assertEqual(error.name, 'WebSocketError');
  assertTruthy(error.message.includes('Connection failed'));
});

test('WebSocketError - stores error code', () => {
  const error = new WebSocketError('Timeout', { code: 'TIMEOUT' });
  assertEqual(error.code, 'TIMEOUT');
});

test('WebSocketError - stores URL', () => {
  const error = new WebSocketError('Failed', { url: 'wss://example.com' });
  assertEqual(error.url, 'wss://example.com');
});

test('WebSocketError - stores close code and reason', () => {
  const error = new WebSocketError('Closed', {
    code: 'CLOSE',
    closeCode: 1006,
    closeReason: 'Abnormal closure'
  });
  assertEqual(error.closeCode, 1006);
  assertEqual(error.closeReason, 'Abnormal closure');
});

test('WebSocketError - isWebSocketError static method', () => {
  const wsError = new WebSocketError('test');
  const plainError = new Error('test');

  assertTruthy(WebSocketError.isWebSocketError(wsError));
  assertFalsy(WebSocketError.isWebSocketError(plainError));
  assertFalsy(WebSocketError.isWebSocketError(null));
  assertFalsy(WebSocketError.isWebSocketError(undefined));
});

test('WebSocketError - type check methods', () => {
  const connectError = new WebSocketError('test', { code: 'CONNECT_FAILED' });
  const closeError = new WebSocketError('test', { code: 'CLOSE' });
  const timeoutError = new WebSocketError('test', { code: 'TIMEOUT' });
  const parseError = new WebSocketError('test', { code: 'PARSE_ERROR' });
  const sendError = new WebSocketError('test', { code: 'SEND_FAILED' });

  assertTruthy(connectError.isConnectFailed());
  assertTruthy(closeError.isClose());
  assertTruthy(timeoutError.isTimeout());
  assertTruthy(parseError.isParseError());
  assertTruthy(sendError.isSendFailed());
});

// ============================================================================
// MessageInterceptorManager Tests
// ============================================================================

printSection('MessageInterceptorManager Tests');

test('MessageInterceptorManager - add interceptor returns ID', () => {
  const manager = new MessageInterceptorManager();
  const id = manager.use((data) => data);
  assertType(id, 'number');
  assertEqual(manager.size, 1);
});

test('MessageInterceptorManager - eject removes interceptor', () => {
  const manager = new MessageInterceptorManager();
  const id = manager.use((data) => data);
  assertEqual(manager.size, 1);
  manager.eject(id);
  assertEqual(manager.size, 0);
});

test('MessageInterceptorManager - clear removes all', () => {
  const manager = new MessageInterceptorManager();
  manager.use((data) => data);
  manager.use((data) => data);
  assertEqual(manager.size, 2);
  manager.clear();
  assertEqual(manager.size, 0);
});

test('MessageInterceptorManager - iterable', () => {
  const manager = new MessageInterceptorManager();
  const fn1 = (data) => data;
  const fn2 = (data) => data;
  manager.use(fn1);
  manager.use(fn2);

  const handlers = [...manager];
  assertEqual(handlers.length, 2);
  assertEqual(handlers[0].onMessage, fn1);
  assertEqual(handlers[1].onMessage, fn2);
});

// ============================================================================
// createWebSocket Tests
// ============================================================================

printSection('createWebSocket Tests');

test('createWebSocket - returns expected interface', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: false });

  // Reactive state
  assertTruthy(ws.state);
  assertTruthy(ws.connected);
  assertTruthy(ws.reconnecting);
  assertTruthy(ws.reconnectAttempt);
  assertTruthy(ws.error);
  assertTruthy(ws.queuedCount);

  // Methods
  assertType(ws.connect, 'function');
  assertType(ws.disconnect, 'function');
  assertType(ws.send, 'function');
  assertType(ws.sendJson, 'function');
  assertType(ws.sendBinary, 'function');
  assertType(ws.dispose, 'function');

  // Events
  assertType(ws.on, 'function');
  assertType(ws.off, 'function');
  assertType(ws.once, 'function');

  // Interceptors
  assertTruthy(ws.interceptors.incoming);
  assertTruthy(ws.interceptors.outgoing);

  // Properties
  assertEqual(ws.url, 'wss://example.com');

  ws.dispose();
});

test('createWebSocket - initial state is closed', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: false });

  assertEqual(ws.state.get(), 'closed');
  assertEqual(ws.connected.get(), false);
  assertEqual(ws.reconnecting.get(), false);
  assertEqual(ws.reconnectAttempt.get(), 0);
  assertEqual(ws.error.get(), null);

  ws.dispose();
});

test('createWebSocket - autoConnect true connects immediately', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  assertEqual(ws.state.get(), 'connecting');
  assertTruthy(MockWebSocket.lastInstance);

  ws.dispose();
});

test('createWebSocket - autoConnect false does not connect', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: false });

  assertEqual(ws.state.get(), 'closed');
  assertEqual(MockWebSocket.lastInstance, null);

  ws.dispose();
});

test('createWebSocket - connect changes state to connecting', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: false });

  ws.connect();
  assertEqual(ws.state.get(), 'connecting');

  ws.dispose();
});

testAsync('createWebSocket - state becomes open on connection', async () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);

  assertEqual(ws.state.get(), 'open');
  assertEqual(ws.connected.get(), true);

  ws.dispose();
});

testAsync('createWebSocket - emits open event', async () => {
  MockWebSocket.reset();
  const spy = createSpy();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  ws.on('open', spy);
  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);

  assertEqual(spy.callCount, 1);

  ws.dispose();
});

testAsync('createWebSocket - emits message event', async () => {
  MockWebSocket.reset();
  const spy = createSpy();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  ws.on('message', spy);
  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);
  MockWebSocket.lastInstance.simulateMessage('{"type":"test"}');
  await wait(10);

  assertEqual(spy.callCount, 1);
  assertDeepEqual(spy.calls[0][0], { type: 'test' });

  ws.dispose();
});

testAsync('createWebSocket - auto-parses JSON messages', async () => {
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

  assertDeepEqual(spy.calls[0][0], { key: 'value' });

  ws.dispose();
});

testAsync('createWebSocket - keeps string if not valid JSON', async () => {
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

  assertEqual(spy.calls[0][0], 'not json');

  ws.dispose();
});

testAsync('createWebSocket - send queues messages when disconnected', async () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', {
    autoConnect: false,
    queueWhileDisconnected: true
  });

  ws.send({ type: 'test1' });
  ws.send({ type: 'test2' });

  assertEqual(ws.queuedCount.get(), 2);

  ws.dispose();
});

testAsync('createWebSocket - flushes queue on connect', async () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', {
    autoConnect: false,
    queueWhileDisconnected: true
  });

  ws.send({ type: 'test1' });
  ws.send({ type: 'test2' });
  assertEqual(ws.queuedCount.get(), 2);

  ws.connect();
  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);

  assertEqual(ws.queuedCount.get(), 0);
  assertEqual(MockWebSocket.lastInstance.sentMessages.length, 2);

  ws.dispose();
});

testAsync('createWebSocket - throws when sending without queue', async () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', {
    autoConnect: false,
    queueWhileDisconnected: false
  });

  assertThrows(() => {
    ws.send({ type: 'test' });
  }, 'not connected');

  ws.dispose();
});

testAsync('createWebSocket - disconnect closes connection', async () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);

  assertEqual(ws.state.get(), 'open');
  ws.disconnect();
  assertEqual(ws.state.get(), 'closing');

  ws.dispose();
});

testAsync('createWebSocket - incoming interceptors transform messages', async () => {
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

  assertDeepEqual(spy.calls[0][0], { original: true, intercepted: true });

  ws.dispose();
});

testAsync('createWebSocket - outgoing interceptors transform messages', async () => {
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
  assertDeepEqual(sent, { original: true, intercepted: true });

  ws.dispose();
});

testAsync('createWebSocket - emits close event', async () => {
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

  assertEqual(spy.callCount, 1);
  assertEqual(spy.calls[0][0].code, 1000);

  ws.dispose();
});

test('createWebSocket - dispose cleans up', () => {
  MockWebSocket.reset();
  const ws = createWebSocket('wss://example.com', { autoConnect: true });

  ws.dispose();
  assertEqual(ws.state.get(), 'closed');
});

// ============================================================================
// useWebSocket Tests
// ============================================================================

printSection('useWebSocket Tests');

test('useWebSocket - returns expected interface', () => {
  MockWebSocket.reset();
  const result = useWebSocket('wss://example.com', { immediate: false });

  // State
  assertTruthy(result.connected);
  assertTruthy(result.lastMessage);
  assertTruthy(result.messages);
  assertTruthy(result.error);
  assertTruthy(result.reconnecting);
  assertTruthy(result.state);
  assertTruthy(result.queuedCount);

  // Methods
  assertType(result.send, 'function');
  assertType(result.sendJson, 'function');
  assertType(result.sendBinary, 'function');
  assertType(result.connect, 'function');
  assertType(result.disconnect, 'function');
  assertType(result.clearMessages, 'function');
  assertType(result.clearError, 'function');

  // Underlying instance
  assertTruthy(result.ws);

  result.ws.dispose();
});

test('useWebSocket - immediate false does not connect', () => {
  MockWebSocket.reset();
  const result = useWebSocket('wss://example.com', { immediate: false });

  assertEqual(result.state.get(), 'closed');
  assertEqual(MockWebSocket.lastInstance, null);

  result.ws.dispose();
});

test('useWebSocket - immediate true connects', () => {
  MockWebSocket.reset();
  const result = useWebSocket('wss://example.com', { immediate: true });

  assertEqual(result.state.get(), 'connecting');

  result.ws.dispose();
});

testAsync('useWebSocket - updates lastMessage on message', async () => {
  MockWebSocket.reset();
  const result = useWebSocket('wss://example.com', { immediate: true });

  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);
  MockWebSocket.lastInstance.simulateMessage('{"type":"update"}');
  await wait(10);

  assertDeepEqual(result.lastMessage.get(), { type: 'update' });

  result.ws.dispose();
});

testAsync('useWebSocket - stores message history', async () => {
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
  assertEqual(messages.length, 3);
  assertDeepEqual(messages[0], { n: 1 });
  assertDeepEqual(messages[2], { n: 3 });

  result.ws.dispose();
});

testAsync('useWebSocket - limits message history size', async () => {
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
  assertEqual(messages.length, 2);
  assertDeepEqual(messages[0], { n: 2 });
  assertDeepEqual(messages[1], { n: 3 });

  result.ws.dispose();
});

testAsync('useWebSocket - clearMessages empties history', async () => {
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

  assertEqual(result.messages.get().length, 1);
  result.clearMessages();
  assertEqual(result.messages.get().length, 0);

  result.ws.dispose();
});

testAsync('useWebSocket - calls onMessage callback', async () => {
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

  assertEqual(spy.callCount, 1);
  assertDeepEqual(spy.calls[0][0], { type: 'test' });

  result.ws.dispose();
});

testAsync('useWebSocket - calls onOpen callback', async () => {
  MockWebSocket.reset();
  const spy = createSpy();
  const result = useWebSocket('wss://example.com', {
    immediate: true,
    onOpen: spy
  });

  await wait(10);
  MockWebSocket.lastInstance.simulateOpen();
  await wait(10);

  assertEqual(spy.callCount, 1);

  result.ws.dispose();
});

testAsync('useWebSocket - calls onClose callback', async () => {
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

  assertEqual(spy.callCount, 1);

  result.ws.dispose();
});

// ============================================================================
// Run Tests
// ============================================================================

await runAsyncTests();
printResults();
exitWithCode();
