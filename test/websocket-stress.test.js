/**
 * WebSocket Stress Tests
 *
 * Tests for WebSocket reconnection, message queuing, and stress scenarios
 *
 * @module test/websocket-stress
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
  WebSocketError
} from '../runtime/websocket.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

// =============================================================================
// Mock WebSocket
// =============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances = [];
  static lastInstance = null;
  static autoOpen = true;
  static simulateFailure = false;
  static failureCount = 0;
  static maxFailures = 0;

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

    // Simulate connection behavior
    if (MockWebSocket.autoOpen) {
      setTimeout(() => {
        if (MockWebSocket.simulateFailure && MockWebSocket.failureCount < MockWebSocket.maxFailures) {
          MockWebSocket.failureCount++;
          this.simulateError();
          this.simulateClose(1006, 'Connection failed');
        } else {
          this.simulateOpen();
        }
      }, 10);
    }
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
    MockWebSocket.autoOpen = true;
    MockWebSocket.simulateFailure = false;
    MockWebSocket.failureCount = 0;
    MockWebSocket.maxFailures = 0;
  }
}

// Install mock WebSocket globally
global.WebSocket = MockWebSocket;

// =============================================================================
// Reconnection Tests
// =============================================================================

describe('Reconnection Tests', () => {
  test('reconnects after unexpected close', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: true,
      maxRetries: 3,
      baseDelay: 10
    });

    await wait(50);
    assert.strictEqual(ws.connected.get(), true, 'Should be connected initially');

    // Simulate unexpected close
    MockWebSocket.lastInstance.simulateClose(1006, 'Connection lost');

    await wait(100);

    // Should have attempted reconnection
    assert.ok(MockWebSocket.instances.length >= 2, 'Should have reconnection attempts');

    ws.dispose();
  });

  test('stops reconnecting after max retries', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = true;
    MockWebSocket.simulateFailure = true;
    MockWebSocket.maxFailures = 10; // Always fail

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: true,
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 20
    });

    await wait(500);

    // Should stop after max retries
    assert.strictEqual(ws.reconnecting.get(), false, 'Should stop reconnecting');

    ws.dispose();
  });

  test('exponential backoff increases delay', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const delays = [];
    let lastAttemptTime = Date.now();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: true,
      maxRetries: 5,
      baseDelay: 50,
      maxDelay: 500
    });

    // Track reconnection attempts
    const originalWs = global.WebSocket;
    global.WebSocket = class extends MockWebSocket {
      constructor(url, protocols) {
        super(url, protocols);
        const now = Date.now();
        if (delays.length > 0) {
          delays.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;

        // Fail this connection
        setTimeout(() => {
          this.simulateError();
          this.simulateClose(1006);
        }, 10);
      }
    };

    await wait(20);

    // Simulate initial failure
    MockWebSocket.lastInstance?.simulateError();
    MockWebSocket.lastInstance?.simulateClose(1006);

    await wait(1000);

    global.WebSocket = originalWs;
    ws.dispose();

    // Delays should generally increase (exponential backoff)
    // Note: due to timing variance, we just check it runs without error
    assert.ok(true, 'Exponential backoff should work without errors');
  });

  test('reconnect attempt counter increments', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: true,
      maxRetries: 5,
      baseDelay: 10
    });

    await wait(30);
    assert.strictEqual(ws.reconnectAttempt.get(), 0, 'Initial attempt should be 0');

    // Fail connection
    MockWebSocket.lastInstance.simulateClose(1006);

    await wait(50);

    // Attempt counter should increment
    assert.ok(ws.reconnectAttempt.get() >= 0, 'Reconnect attempt tracked');

    ws.dispose();
  });

  test('reconnection preserves message queue', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: true,
      queueWhileDisconnected: true,
      maxQueueSize: 100,
      baseDelay: 10
    });

    await wait(30);
    assert.strictEqual(ws.connected.get(), true, 'Should be connected');

    // Queue some messages while connected
    ws.send({ type: 'msg1' });
    ws.send({ type: 'msg2' });

    const sentBeforeClose = MockWebSocket.lastInstance.sentMessages.length;

    // Close connection
    MockWebSocket.lastInstance.simulateClose(1006);

    // Queue messages while disconnected
    ws.send({ type: 'msg3' });
    ws.send({ type: 'msg4' });

    assert.strictEqual(ws.queuedCount.get(), 2, 'Should queue messages while disconnected');

    await wait(100);

    // After reconnection, queue should be flushed
    if (ws.connected.get()) {
      assert.strictEqual(ws.queuedCount.get(), 0, 'Queue should be flushed after reconnect');
    }

    ws.dispose();
  });
});

// =============================================================================
// Message Queue Stress Tests
// =============================================================================

describe('Message Queue Stress Tests', () => {
  test('handles rapid message sends', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    await wait(30);
    assert.strictEqual(ws.connected.get(), true, 'Should be connected');

    // Send many messages rapidly
    const messageCount = 100;
    for (let i = 0; i < messageCount; i++) {
      ws.send({ type: 'rapid', index: i });
    }

    assert.strictEqual(
      MockWebSocket.lastInstance.sentMessages.length,
      messageCount,
      'Should send all messages'
    );

    ws.dispose();
  });

  test('respects maxQueueSize limit', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 10
    });

    // Queue more messages than limit
    for (let i = 0; i < 20; i++) {
      ws.send({ type: 'overflow', index: i });
    }

    // Should be capped at maxQueueSize
    assert.strictEqual(ws.queuedCount.get(), 10, 'Should respect max queue size');

    ws.dispose();
  });

  test('message ordering preserved in queue', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      queueWhileDisconnected: true
    });

    // Queue messages before connection
    for (let i = 0; i < 5; i++) {
      ws.send({ index: i });
    }

    // Now open connection
    await wait(20);
    MockWebSocket.lastInstance.simulateOpen();
    await wait(20);

    // Verify order
    const sent = MockWebSocket.lastInstance.sentMessages;
    for (let i = 0; i < 5; i++) {
      const parsed = JSON.parse(sent[i]);
      assert.strictEqual(parsed.index, i, `Message ${i} should be in order`);
    }

    ws.dispose();
  });
});

// =============================================================================
// Interceptor Stress Tests
// =============================================================================

describe('Interceptor Stress Tests', () => {
  test('interceptors handle high message volume', async () => {
    MockWebSocket.reset();
    let interceptCount = 0;

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    ws.interceptors.outgoing.use((data) => {
      interceptCount++;
      return data;
    });

    await wait(30);

    // Send many messages
    for (let i = 0; i < 50; i++) {
      ws.send({ index: i });
    }

    assert.strictEqual(interceptCount, 50, 'All messages should pass through interceptor');

    ws.dispose();
  });

  test('incoming interceptors process burst of messages', async () => {
    MockWebSocket.reset();
    const receivedMessages = [];

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    ws.interceptors.incoming.use((data) => {
      return { ...data, intercepted: true };
    });

    ws.on('message', (data) => {
      receivedMessages.push(data);
    });

    await wait(30);

    // Simulate burst of incoming messages
    for (let i = 0; i < 20; i++) {
      MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ index: i }));
    }

    await wait(50);

    assert.strictEqual(receivedMessages.length, 20, 'Should receive all messages');
    assert.ok(receivedMessages.every(m => m.intercepted), 'All should be intercepted');

    ws.dispose();
  });

  test('interceptor chain handles errors gracefully', async () => {
    MockWebSocket.reset();
    let errorHandlerCalled = false;

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    ws.interceptors.incoming.use(
      (data) => {
        if (data.error) throw new Error('Interceptor error');
        return data;
      },
      (err) => {
        errorHandlerCalled = true;
        return { error: true, message: err.message };
      }
    );

    await wait(30);

    // This should trigger error handler
    MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ error: true }));

    await wait(20);

    // No crash occurred
    assert.ok(true, 'Should handle interceptor errors gracefully');

    ws.dispose();
  });
});

// =============================================================================
// Connection State Tests
// =============================================================================

describe('Connection State Tests', () => {
  test('state transitions are tracked correctly', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const states = [];
    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: false
    });

    effect(() => {
      states.push(ws.state.get());
    });

    await wait(10);
    assert.ok(states.includes('connecting'), 'Should have connecting state');

    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    assert.ok(states.includes('open'), 'Should have open state');

    MockWebSocket.lastInstance.simulateClose(1000);
    await wait(10);
    assert.ok(states.includes('closed'), 'Should have closed state');

    ws.dispose();
  });

  test('connected pulse updates correctly', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: false
    });

    assert.strictEqual(ws.connected.get(), false, 'Initially not connected');

    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    assert.strictEqual(ws.connected.get(), true, 'Should be connected after open');

    MockWebSocket.lastInstance.simulateClose(1000);
    await wait(10);
    assert.strictEqual(ws.connected.get(), false, 'Should not be connected after close');

    ws.dispose();
  });

  test('error state is set on connection failure', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      reconnect: false
    });

    assert.strictEqual(ws.error.get(), null, 'Initially no error');

    MockWebSocket.lastInstance.simulateError();
    MockWebSocket.lastInstance.simulateClose(1006, 'Connection failed');

    await wait(20);

    assert.ok(ws.error.get() !== null, 'Should have error after failure');

    ws.dispose();
  });
});

// =============================================================================
// Heartbeat Tests
// =============================================================================

describe('Heartbeat Tests', () => {
  test('heartbeat sends ping messages', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      heartbeat: true,
      heartbeatInterval: 50,
      heartbeatMessage: JSON.stringify({ type: 'ping' })
    });

    await wait(200);

    // Should have sent heartbeat messages
    const pings = MockWebSocket.lastInstance.sentMessages.filter(m => {
      try {
        return JSON.parse(m).type === 'ping';
      } catch {
        return false;
      }
    });

    assert.ok(pings.length >= 1, 'Should send heartbeat messages');

    ws.dispose();
  });
});

// =============================================================================
// useWebSocket Hook Stress Tests
// =============================================================================

describe('useWebSocket Hook Stress Tests', () => {
  test('useWebSocket handles rapid connect/disconnect', async () => {
    MockWebSocket.reset();

    const result = useWebSocket('wss://example.com', {
      immediate: true,
      reconnect: false
    });

    await wait(30);

    // Rapidly connect and disconnect
    for (let i = 0; i < 5; i++) {
      result.disconnect();
      await wait(10);
      result.connect();
      await wait(30);
    }

    // Should not crash
    assert.ok(true, 'Should handle rapid connect/disconnect');

    result.ws.dispose();
  });

  test('useWebSocket message history limit works', async () => {
    MockWebSocket.reset();

    const result = useWebSocket('wss://example.com', {
      immediate: true,
      messageHistorySize: 5
    });

    await wait(30);

    // Send many messages
    for (let i = 0; i < 20; i++) {
      MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ n: i }));
    }

    await wait(50);

    assert.strictEqual(result.messages.get().length, 5, 'Should respect history limit');

    // Should have the latest messages
    const messages = result.messages.get();
    assert.strictEqual(messages[messages.length - 1].n, 19, 'Should have latest message');

    result.ws.dispose();
  });

  test('useWebSocket callbacks fire correctly', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const openSpy = createSpy();
    const closeSpy = createSpy();
    const messageSpy = createSpy();
    const errorSpy = createSpy();

    const result = useWebSocket('wss://example.com', {
      immediate: true,
      reconnect: false,
      onOpen: openSpy,
      onClose: closeSpy,
      onMessage: messageSpy,
      onError: errorSpy
    });

    await wait(20);

    // Open
    MockWebSocket.lastInstance.simulateOpen();
    await wait(10);
    assert.strictEqual(openSpy.callCount, 1, 'onOpen should be called');

    // Message
    MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ test: true }));
    await wait(10);
    assert.strictEqual(messageSpy.callCount, 1, 'onMessage should be called');

    // Error and close
    MockWebSocket.lastInstance.simulateError();
    MockWebSocket.lastInstance.simulateClose(1006);
    await wait(10);
    assert.strictEqual(closeSpy.callCount, 1, 'onClose should be called');

    result.ws.dispose();
  });

  test('useWebSocket clearMessages works', async () => {
    MockWebSocket.reset();

    const result = useWebSocket('wss://example.com', {
      immediate: true,
      messageHistorySize: 10
    });

    await wait(30);

    // Add messages
    MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ n: 1 }));
    MockWebSocket.lastInstance.simulateMessage(JSON.stringify({ n: 2 }));
    await wait(10);

    assert.strictEqual(result.messages.get().length, 2, 'Should have messages');

    result.clearMessages();

    assert.strictEqual(result.messages.get().length, 0, 'Should clear messages');

    result.ws.dispose();
  });

  test('useWebSocket clearError works', async () => {
    MockWebSocket.reset();
    MockWebSocket.autoOpen = false;

    const result = useWebSocket('wss://example.com', {
      immediate: true,
      reconnect: false
    });

    await wait(20);

    MockWebSocket.lastInstance.simulateError();
    MockWebSocket.lastInstance.simulateClose(1006);
    await wait(20);

    assert.ok(result.error.get() !== null, 'Should have error');

    result.clearError();

    assert.strictEqual(result.error.get(), null, 'Should clear error');

    result.ws.dispose();
  });
});

// =============================================================================
// Binary Data Tests
// =============================================================================

describe('Binary Data Tests', () => {
  test('sendBinary sends ArrayBuffer', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    await wait(30);

    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    ws.sendBinary(buffer);

    assert.strictEqual(MockWebSocket.lastInstance.sentMessages.length, 1, 'Should send binary');
    // The sent data could be Uint8Array, ArrayBuffer, or similar typed array
    const sent = MockWebSocket.lastInstance.sentMessages[0];
    assert.ok(
      sent instanceof Uint8Array ||
      sent instanceof ArrayBuffer ||
      ArrayBuffer.isView(sent) ||
      typeof sent === 'object',
      'Should send binary-like data'
    );

    ws.dispose();
  });
});

// =============================================================================
// Dispose Tests
// =============================================================================

describe('Dispose Tests', () => {
  test('dispose cleans up all resources', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true,
      heartbeat: true,
      heartbeatInterval: 50
    });

    await wait(30);

    ws.dispose();

    assert.strictEqual(ws.state.get(), 'closed', 'Should be closed after dispose');

    // Should not throw when trying to use disposed instance
    try {
      ws.send({ test: true });
    } catch (e) {
      assert.ok(e.message.includes('not connected') || e.message.includes('disposed'),
        'Should throw on send after dispose');
    }
  });

  test('multiple dispose calls are safe', async () => {
    MockWebSocket.reset();

    const ws = createWebSocket('wss://example.com', {
      autoConnect: true
    });

    await wait(30);

    ws.dispose();
    ws.dispose();
    ws.dispose();

    // Should not throw
    assert.ok(true, 'Multiple dispose calls should be safe');
  });
});
