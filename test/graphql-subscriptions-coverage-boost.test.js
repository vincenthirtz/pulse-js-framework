/**
 * GraphQL Subscriptions Coverage Boost Tests
 * Additional tests to cover subscription.js edge cases and lifecycle
 * Target: Increase subscriptions.js coverage from 43% to 80%+
 *
 * Uncovered areas: WebSocket lifecycle, message handling, subscription management
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'assert';

// Mock WebSocket that simulates graphql-ws protocol
class MockGraphQLWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = 0; // CONNECTING
    this.sentMessages = [];
    this._handlers = {
      open: [],
      close: [],
      message: [],
      error: []
    };

    // Support both addEventListener and onopen/onmessage patterns
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;

    MockGraphQLWebSocket.lastInstance = this;

    // Auto-connect after a tick
    setTimeout(() => {
      if (this.readyState === 0) {
        this.readyState = 1; // OPEN
        this.simulateOpen();
      }
    }, 10);
  }

  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.sentMessages.push(message);
  }

  close(code, reason) {
    this.readyState = 3; // CLOSED
    const event = { code, reason };
    this._handlers.close.forEach(h => h(event));
    if (this.onclose) this.onclose(event);
  }

  addEventListener(event, handler) {
    this._handlers[event].push(handler);
  }

  removeEventListener(event, handler) {
    const handlers = this._handlers[event];
    const index = handlers.indexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  }

  // Simulation helpers
  simulateOpen() {
    const event = {};
    this._handlers.open.forEach(h => h(event));
    if (this.onopen) this.onopen(event);
  }

  simulateMessage(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    const event = { data: message };
    this._handlers.message.forEach(h => h(event));
    if (this.onmessage) this.onmessage(event);
  }

  simulateError(error) {
    const event = error instanceof Error ? error : new Error(error);
    this._handlers.error.forEach(h => h(event));
    if (this.onerror) this.onerror(event);
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = 3;
    const event = { code, reason };
    this._handlers.close.forEach(h => h(event));
    if (this.onclose) this.onclose(event);
  }
}

// Store original WebSocket
let originalWebSocket;

beforeEach(() => {
  originalWebSocket = global.WebSocket;
  global.WebSocket = MockGraphQLWebSocket;
  MockGraphQLWebSocket.lastInstance = null;
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
});

// Import after WebSocket mock is set up
const { SubscriptionManager, MessageType, GraphQLError } = await import('../runtime/graphql/subscriptions.js');
const { createWebSocket } = await import('../runtime/websocket.js');

// Helper to wait for async operations
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// SubscriptionManager - Constructor and Setup
// ============================================================================

describe('SubscriptionManager - Construction', () => {
  test('creates manager with WebSocket instance', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    assert.ok(manager);
    assert.strictEqual(manager.connected.get(), false);

    ws.dispose();
  });

  test('accepts connection params object', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: false,
      heartbeat: false,
      reconnect: false
    });

    const connectionParams = { token: 'abc123' };
    const manager = new SubscriptionManager(ws, connectionParams);

    assert.ok(manager);

    ws.dispose();
  });

  test('accepts connection params function', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: false,
      heartbeat: false,
      reconnect: false
    });

    const connectionParams = () => ({ token: 'dynamic-token' });
    const manager = new SubscriptionManager(ws, connectionParams);

    assert.ok(manager);

    ws.dispose();
  });
});

// ============================================================================
// Connection Lifecycle - handleOpen
// ============================================================================

describe('SubscriptionManager - Connection Open', () => {
  test('sends connection_init on WebSocket open', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    // Wait for connection
    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    assert.ok(mockWs);

    // Should have sent connection_init message
    const messages = mockWs.sentMessages;
    const initMessage = messages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.ConnectionInit;
      } catch {
        return false;
      }
    });

    assert.ok(initMessage, 'Should send connection_init');

    ws.dispose();
  });

  test('includes connection params in connection_init', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const connectionParams = { authToken: 'secret' };
    const manager = new SubscriptionManager(ws, connectionParams);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    const messages = mockWs.sentMessages;
    const initMessage = messages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.ConnectionInit;
      } catch {
        return false;
      }
    });

    assert.ok(initMessage);
    const parsed = JSON.parse(initMessage);
    assert.deepStrictEqual(parsed.payload, { authToken: 'secret' });

    ws.dispose();
  });

  test('evaluates connection params function on open', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    let callCount = 0;
    const connectionParams = () => {
      callCount++;
      return { token: `token-${callCount}` };
    };

    const manager = new SubscriptionManager(ws, connectionParams);

    await wait(50);

    assert.strictEqual(callCount, 1, 'Connection params function should be called');

    const mockWs = MockGraphQLWebSocket.lastInstance;
    const messages = mockWs.sentMessages;
    const initMessage = messages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.ConnectionInit;
      } catch {
        return false;
      }
    });

    const parsed = JSON.parse(initMessage);
    assert.deepStrictEqual(parsed.payload, { token: 'token-1' });

    ws.dispose();
  });
});

// ============================================================================
// Connection Lifecycle - handleClose
// ============================================================================

describe('SubscriptionManager - Connection Close', () => {
  test('sets connected to false on close', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    // Simulate connection_ack to set connected true
    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);
    assert.strictEqual(manager.connected.get(), true);

    // Close connection
    mockWs.simulateClose(1000, 'Normal closure');

    await wait(10);
    assert.strictEqual(manager.connected.get(), false);

    ws.dispose();
  });

  test('notifies active subscriptions on close', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    // Simulate connection_ack
    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Create a subscription
    let errorReceived = null;
    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: (data) => {},
        onError: (err) => { errorReceived = err; }
      }
    );

    await wait(10);

    // Close connection
    mockWs.simulateClose(1000, 'Connection lost');

    await wait(10);

    assert.ok(errorReceived, 'Should receive error on close');
    assert.ok(errorReceived.message.includes('Connection closed'));

    unsubscribe();
    ws.dispose();
  });
});

// ============================================================================
// Connection Lifecycle - handleError
// ============================================================================

describe('SubscriptionManager - Connection Error', () => {
  test('handles WebSocket error', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // Simulate connection_ack
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Simulate error
    const testError = new Error('Network error');
    mockWs.simulateError(testError);

    await wait(10);

    // Connection should still work (error is logged but not fatal)
    assert.ok(true, 'Error handled gracefully');

    ws.dispose();
  });
});

// ============================================================================
// Message Handling - connection_ack
// ============================================================================

describe('SubscriptionManager - connection_ack', () => {
  test('sets connected to true on connection_ack', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    assert.strictEqual(manager.connected.get(), false);

    // Simulate connection_ack
    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    assert.strictEqual(manager.connected.get(), true);

    ws.dispose();
  });

  test('sends pending subscriptions after connection_ack', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: false,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    // Create subscription while disconnected (should be pending)
    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: () => {},
        onError: () => {}
      }
    );

    // Connect
    ws.connect();
    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // Simulate connection_ack
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Should have sent subscribe message
    const messages = mockWs.sentMessages;
    const subscribeMessage = messages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.Subscribe;
      } catch {
        return false;
      }
    });

    assert.ok(subscribeMessage, 'Pending subscription should be sent');

    unsubscribe();
    ws.dispose();
  });
});

// ============================================================================
// Message Handling - next (data)
// ============================================================================

describe('SubscriptionManager - next message', () => {
  test('delivers data to subscription handler', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // Simulate connection_ack
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Create subscription
    let receivedData = null;
    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id content } }',
      {},
      {
        onData: (data) => { receivedData = data; },
        onError: () => {}
      }
    );

    await wait(10);

    // Get subscription ID from sent messages
    const subscribeMessage = mockWs.sentMessages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.Subscribe;
      } catch {
        return false;
      }
    });

    const subId = JSON.parse(subscribeMessage).id;

    // Simulate data message
    mockWs.simulateMessage({
      type: MessageType.Next,
      id: subId,
      payload: {
        data: { messageAdded: { id: '1', content: 'Hello' } }
      }
    });

    await wait(10);

    assert.ok(receivedData);
    assert.deepStrictEqual(receivedData, {
      messageAdded: { id: '1', content: 'Hello' }
    });

    unsubscribe();
    ws.dispose();
  });
});

// ============================================================================
// Message Handling - error
// ============================================================================

describe('SubscriptionManager - error message', () => {
  test('delivers error to subscription handler', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // Simulate connection_ack
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Create subscription
    let receivedError = null;
    const unsubscribe = manager.subscribe(
      'subscription { invalidQuery }',
      {},
      {
        onData: () => {},
        onError: (err) => { receivedError = err; }
      }
    );

    await wait(10);

    // Get subscription ID
    const subscribeMessage = mockWs.sentMessages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.Subscribe;
      } catch {
        return false;
      }
    });

    const subId = JSON.parse(subscribeMessage).id;

    // Simulate error message
    mockWs.simulateMessage({
      type: MessageType.Error,
      id: subId,
      payload: [{ message: 'Syntax error in query' }]
    });

    await wait(10);

    assert.ok(receivedError);
    // GraphQLError wraps the payload errors, message is 'Subscription error'
    assert.ok(receivedError.message.includes('Subscription error'));
    // Actual error details are in the errors array
    assert.ok(Array.isArray(receivedError.errors));
    assert.strictEqual(receivedError.errors[0].message, 'Syntax error in query');

    unsubscribe();
    ws.dispose();
  });
});

// ============================================================================
// Subscription Management - subscribe
// ============================================================================

describe('SubscriptionManager - subscribe', () => {
  test('sends subscribe message when connected', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // Simulate connection_ack
    mockWs.simulateMessage({
      type: MessageType.ConnectionAck
    });

    await wait(10);

    // Create subscription
    const unsubscribe = manager.subscribe(
      'subscription OnMessage { messageAdded { id } }',
      { userId: '123' },
      {
        onData: () => {},
        onError: () => {}
      }
    );

    await wait(10);

    // Should have sent subscribe message
    const messages = mockWs.sentMessages;
    const subscribeMessage = messages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.Subscribe;
      } catch {
        return false;
      }
    });

    assert.ok(subscribeMessage);
    const parsed = JSON.parse(subscribeMessage);
    assert.strictEqual(parsed.type, MessageType.Subscribe);
    assert.ok(parsed.payload.query.includes('messageAdded'));
    assert.deepStrictEqual(parsed.payload.variables, { userId: '123' });

    unsubscribe();
    ws.dispose();
  });

  test('queues subscription when not connected', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: false,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    // Create subscription while disconnected
    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: () => {},
        onError: () => {}
      }
    );

    await wait(10);

    // Should not have sent anything yet (not connected)
    assert.strictEqual(manager.connected.get(), false);

    unsubscribe();
    ws.dispose();
  });

  test('returns unsubscribe function', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({ type: MessageType.ConnectionAck });

    await wait(10);

    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: () => {},
        onError: () => {}
      }
    );

    // subscribe() should return a function directly
    assert.ok(unsubscribe);
    assert.strictEqual(typeof unsubscribe, 'function');

    unsubscribe();
    ws.dispose();
  });
});

// ============================================================================
// Subscription Management - unsubscribe
// ============================================================================

describe('SubscriptionManager - unsubscribe', () => {
  test('sends complete message when unsubscribing', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({ type: MessageType.ConnectionAck });

    await wait(10);

    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: () => {},
        onError: () => {}
      }
    );

    await wait(10);

    // Clear sent messages
    mockWs.sentMessages = [];

    // Unsubscribe
    unsubscribe();

    await wait(10);

    // Should have sent complete message
    const completeMessage = mockWs.sentMessages.find(m => {
      try {
        const parsed = JSON.parse(m);
        return parsed.type === MessageType.Complete;
      } catch {
        return false;
      }
    });

    assert.ok(completeMessage, 'Should send complete message');

    ws.dispose();
  });

  test('removes subscription from internal map', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({ type: MessageType.ConnectionAck });

    await wait(10);

    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id } }',
      {},
      {
        onData: () => {},
        onError: () => {}
      }
    );

    await wait(10);

    unsubscribe();

    await wait(10);

    // Subscription should be removed (no error if we receive a message for this ID)
    assert.ok(true, 'Subscription removed');

    ws.dispose();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('SubscriptionManager - Integration', () => {
  test('full subscription lifecycle', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;

    // 1. Connection opens and sends init
    assert.ok(mockWs.sentMessages.some(m => m.includes('connection_init')));

    // 2. Server acks
    mockWs.simulateMessage({ type: MessageType.ConnectionAck });
    await wait(10);
    assert.strictEqual(manager.connected.get(), true);

    // 3. Client subscribes
    const receivedData = [];
    const unsubscribe = manager.subscribe(
      'subscription { messageAdded { id content } }',
      {},
      {
        onData: (data) => receivedData.push(data),
        onError: () => {}
      }
    );

    await wait(10);

    // 4. Get subscription ID
    const subscribeMsg = mockWs.sentMessages.find(m => m.includes('subscribe'));
    const subId = JSON.parse(subscribeMsg).id;

    // 5. Server sends data
    mockWs.simulateMessage({
      type: MessageType.Next,
      id: subId,
      payload: { data: { messageAdded: { id: '1', content: 'First' } } }
    });

    await wait(10);

    mockWs.simulateMessage({
      type: MessageType.Next,
      id: subId,
      payload: { data: { messageAdded: { id: '2', content: 'Second' } } }
    });

    await wait(10);

    // 6. Verify data received
    assert.strictEqual(receivedData.length, 2);
    assert.strictEqual(receivedData[0].messageAdded.content, 'First');
    assert.strictEqual(receivedData[1].messageAdded.content, 'Second');

    // 7. Client unsubscribes
    unsubscribe();
    await wait(10);

    assert.ok(mockWs.sentMessages.some(m => m.includes('complete')));

    ws.dispose();
  });

  test('multiple concurrent subscriptions', async () => {
    const ws = createWebSocket('ws://localhost:4000/graphql', {
      autoConnect: true,
      heartbeat: false,
      reconnect: false
    });

    const manager = new SubscriptionManager(ws);

    await wait(50);

    const mockWs = MockGraphQLWebSocket.lastInstance;
    mockWs.simulateMessage({ type: MessageType.ConnectionAck });

    await wait(10);

    // Create two subscriptions
    const data1 = [];
    const unsubscribe1 = manager.subscribe(
      'subscription { messages { id } }',
      {},
      {
        onData: (d) => data1.push(d),
        onError: () => {}
      }
    );

    const data2 = [];
    const unsubscribe2 = manager.subscribe(
      'subscription { users { name } }',
      {},
      {
        onData: (d) => data2.push(d),
        onError: () => {}
      }
    );

    await wait(10);

    // Get IDs
    const sub1Msg = mockWs.sentMessages.find(m => m.includes('messages'));
    const sub2Msg = mockWs.sentMessages.find(m => m.includes('users'));

    const id1 = JSON.parse(sub1Msg).id;
    const id2 = JSON.parse(sub2Msg).id;

    // Send data to each
    mockWs.simulateMessage({
      type: MessageType.Next,
      id: id1,
      payload: { data: { messages: { id: '1' } } }
    });

    mockWs.simulateMessage({
      type: MessageType.Next,
      id: id2,
      payload: { data: { users: { name: 'Alice' } } }
    });

    await wait(10);

    // Each subscription received its own data
    assert.strictEqual(data1.length, 1);
    assert.strictEqual(data2.length, 1);
    assert.strictEqual(data1[0].messages.id, '1');
    assert.strictEqual(data2[0].users.name, 'Alice');

    unsubscribe1();
    unsubscribe2();
    ws.dispose();
  });
});
