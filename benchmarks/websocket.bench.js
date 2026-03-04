/**
 * WebSocket Benchmarks - Pulse Framework
 *
 * Measures: state management, message queue, interceptors (no real connections)
 *
 * @module benchmarks/websocket
 */

import { bench, suite } from './utils.js';

let wsModule;
try {
  // Stub WebSocket constructor if not available (Node.js)
  if (typeof globalThis.WebSocket === 'undefined') {
    globalThis.WebSocket = class MockWebSocket {
      constructor() {
        this.readyState = 0;
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
      }
      send() {}
      close() { this.readyState = 3; }
      addEventListener() {}
      removeEventListener() {}
    };
  }
  wsModule = await import('../runtime/websocket.js');
} catch {
  // WebSocket module not available
}

export async function runWebSocketBenchmarks() {
  if (!wsModule) {
    return { name: 'WebSocket', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  const { createWebSocket, WebSocketError } = wsModule;

  return await suite('WebSocket', [
    // WebSocket instance creation
    bench('createWebSocket() (200x)', () => {
      for (let i = 0; i < 200; i++) {
        const ws = createWebSocket('ws://localhost:9999', {
          autoConnect: false,
          reconnect: false
        });
        ws.dispose();
      }
    }),

    // State pulse reads
    bench('ws state reads (1000x)', () => {
      const ws = createWebSocket('ws://localhost:9999', {
        autoConnect: false,
        reconnect: false
      });
      for (let i = 0; i < 1000; i++) {
        ws.state.get();
        ws.connected.get();
        ws.reconnecting.get();
        ws.error.get();
        ws.queuedCount.get();
      }
      ws.dispose();
    }),

    // WebSocketError creation and checking
    bench('WebSocketError methods (1000x)', () => {
      const errors = [
        new WebSocketError('connect failed', { code: 'CONNECT_FAILED' }),
        new WebSocketError('closed', { code: 'CLOSE' }),
        new WebSocketError('parse error', { code: 'PARSE_ERROR' }),
        new WebSocketError('send failed', { code: 'SEND_FAILED' })
      ];
      for (let i = 0; i < 1000; i++) {
        const err = errors[i % errors.length];
        err.isConnectFailed();
        err.isClose();
        err.isParseError();
        err.isSendFailed();
        err.canRetry();
      }
    }),

    // Interceptor registration
    bench('ws interceptor use (500x)', () => {
      const ws = createWebSocket('ws://localhost:9999', {
        autoConnect: false,
        reconnect: false
      });
      for (let i = 0; i < 500; i++) {
        ws.interceptors.incoming.use((msg) => msg);
        ws.interceptors.outgoing.use((msg) => msg);
      }
      ws.dispose();
    })
  ]);
}
