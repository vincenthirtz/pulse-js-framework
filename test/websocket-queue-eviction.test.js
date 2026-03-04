/**
 * WebSocket Queue Eviction Strategy Tests
 *
 * Tests for the queueEvictionStrategy option added to createWebSocket
 * and the internal MessageQueue class improvements.
 *
 * @module test/websocket-queue-eviction
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createWebSocket } from '../runtime/websocket.js';
import { pulse, effect } from '../runtime/pulse.js';

// ============================================================================
// Mock WebSocket (minimal)
// ============================================================================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static lastInstance = null;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.sentMessages = [];
    MockWebSocket.lastInstance = this;
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) throw new Error('Not open');
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      if (this.onclose) this.onclose({ code, reason, wasClean: code === 1000 });
    }, 0);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({ type: 'open' });
  }
}

// ============================================================================
// Test setup
// ============================================================================

let originalWebSocket;
beforeEach(() => {
  originalWebSocket = globalThis.WebSocket;
  globalThis.WebSocket = MockWebSocket;
  MockWebSocket.lastInstance = null;
});

function restoreWs() {
  if (originalWebSocket) {
    globalThis.WebSocket = originalWebSocket;
  } else {
    delete globalThis.WebSocket;
  }
}

// ============================================================================
// FIFO eviction strategy (default)
// ============================================================================

describe('WebSocket queue — fifo strategy (default)', () => {
  test('drops oldest message when queue is full', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 3,
      queueEvictionStrategy: 'fifo',
    });

    // Send 4 messages to a disconnected socket → maxQueueSize=3 drops oldest
    ws.send('msg1');
    ws.send('msg2');
    ws.send('msg3');
    ws.send('msg4'); // should evict msg1

    assert.strictEqual(ws.queuedCount.get(), 3);
    ws.dispose();
  });

  test('default strategy is fifo', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 2,
      // No queueEvictionStrategy set — defaults to 'fifo'
    });

    ws.send('a');
    ws.send('b');
    ws.send('c'); // evicts 'a' (oldest)

    // After connecting, only 'b' and 'c' should be flushed
    assert.strictEqual(ws.queuedCount.get(), 2);
    ws.dispose();
  });

  test('maxQueueSize=0 disables queuing entirely', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 0,
    });

    // All enqueues are no-ops when maxQueueSize=0
    ws.send('msg1');
    ws.send('msg2');
    assert.strictEqual(ws.queuedCount.get(), 0);
    ws.dispose();
  });
});

// ============================================================================
// drop-new eviction strategy
// ============================================================================

describe('WebSocket queue — drop-new strategy', () => {
  test('discards incoming message when queue is full', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 2,
      queueEvictionStrategy: 'drop-new',
    });

    ws.send('first');
    ws.send('second');
    ws.send('third');  // should be silently discarded
    ws.send('fourth'); // should be silently discarded

    assert.strictEqual(ws.queuedCount.get(), 2);
    ws.dispose();
  });

  test('preserves the first N messages (oldest survive)', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 1,
      queueEvictionStrategy: 'drop-new',
    });

    ws.send(JSON.stringify({ id: 1 }));
    ws.send(JSON.stringify({ id: 2 }));

    // Only the first message should remain
    assert.strictEqual(ws.queuedCount.get(), 1);
    ws.dispose();
  });
});

// ============================================================================
// drop-all eviction strategy
// ============================================================================

describe('WebSocket queue — drop-all strategy', () => {
  test('wipes queue before adding the new message', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 2,
      queueEvictionStrategy: 'drop-all',
    });

    ws.send('a');
    ws.send('b');
    // Queue is full (2 items); drop-all wipes it then adds 'c'
    ws.send('c');

    // Only the latest message survives
    assert.strictEqual(ws.queuedCount.get(), 1);
    ws.dispose();
  });

  test('suitable for replace-state semantics (e.g. cursor position)', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 1,
      queueEvictionStrategy: 'drop-all',
    });

    const positions = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 }, // Only this latest position matters
    ];

    for (const pos of positions) ws.send(JSON.stringify(pos));

    // Always only 1 message in queue (the latest)
    assert.strictEqual(ws.queuedCount.get(), 1);
    ws.dispose();
  });
});

// ============================================================================
// queuedCount reactive signal
// ============================================================================

describe('WebSocket queue — queuedCount reactive signal', () => {
  test('queuedCount updates reactively as messages are queued', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 10,
    });

    const counts = [];
    const stop = effect(() => counts.push(ws.queuedCount.get()));

    ws.send('a');
    ws.send('b');
    ws.send('c');

    stop();
    // counts: [0, 1, 2, 3]
    assert.deepStrictEqual(counts, [0, 1, 2, 3]);
    ws.dispose();
  });

  test('queuedCount resets to 0 when queue is flushed on connect', async (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      queueWhileDisconnected: true,
      maxQueueSize: 5,
    });

    // Wait for socket creation
    await new Promise(r => setTimeout(r, 0));
    const mock = MockWebSocket.lastInstance;

    ws.send('hello');
    assert.strictEqual(ws.queuedCount.get(), 1);

    // Simulate connect → queue should flush
    mock.simulateOpen();
    await new Promise(r => setTimeout(r, 0));

    assert.strictEqual(ws.queuedCount.get(), 0);
    ws.dispose();
  });
});

// ============================================================================
// Unknown eviction strategy → falls back to FIFO
// ============================================================================

describe('WebSocket queue — unknown eviction strategy', () => {
  test('falls back to FIFO for unknown strategy', (t) => {
    t.after(restoreWs);
    const ws = createWebSocket('ws://test', {
      autoConnect: false,
      queueWhileDisconnected: true,
      maxQueueSize: 2,
      queueEvictionStrategy: 'unknown-strategy',
    });

    ws.send('x');
    ws.send('y');
    ws.send('z'); // evicts 'x' (FIFO fallback)

    assert.strictEqual(ws.queuedCount.get(), 2);
    ws.dispose();
  });
});
