# WebSocket Client

Pulse provides a WebSocket client with automatic reconnection, heartbeat, message queuing, and reactive integration.

## Installation

```javascript
import { createWebSocket, useWebSocket, WebSocketError } from 'pulse-js-framework/runtime/websocket';
```

## Quick Start

```javascript
const { connected, lastMessage, send, disconnect } = useWebSocket('wss://api.example.com/ws', {
  onMessage: (data) => console.log('Received:', data)
});

effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channel: 'updates' });
  }
});
```

## Low-Level API

### Creating a WebSocket

```javascript
const ws = createWebSocket('wss://api.example.com/ws', {
  // Reconnection
  reconnect: true,              // Enable auto-reconnect (default: true)
  maxRetries: 5,                // Max reconnection attempts (default: 5)
  baseDelay: 1000,              // Base delay for backoff (ms)
  maxDelay: 30000,              // Max delay between retries (ms)

  // Heartbeat
  heartbeat: true,              // Enable ping/pong (default: false)
  heartbeatInterval: 30000,     // Ping interval (ms)
  heartbeatTimeout: 10000,      // Pong timeout (ms)

  // Message handling
  queueWhileDisconnected: true, // Queue messages when offline (default: true)
  maxQueueSize: 100,            // Max queued messages (default: 100)
  autoParseJson: true           // Auto-parse JSON messages (default: true)
});
```

### Reactive State

All state is exposed as Pulses:

```javascript
ws.state.get();           // 'connecting' | 'open' | 'closing' | 'closed'
ws.connected.get();       // true when open
ws.reconnecting.get();    // true during reconnection
ws.reconnectAttempt.get(); // Current attempt number
ws.error.get();           // Last WebSocketError or null
ws.queuedCount.get();     // Number of queued messages
```

### Sending Messages

```javascript
// Auto-serializes objects to JSON
ws.send({ type: 'subscribe', channel: 'updates' });

// Explicit JSON
ws.sendJson({ action: 'ping' });

// Binary data
ws.sendBinary(new Uint8Array([1, 2, 3]));
```

### Event Listeners

```javascript
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data));
ws.on('close', (event) => console.log('Closed:', event.code));
ws.on('error', (error) => console.error('Error:', error));
```

### Message Interceptors

```javascript
// Incoming messages
ws.interceptors.incoming.use(
  (data) => ({ ...data, timestamp: Date.now() }),
  (err) => console.error('Parse error:', err)
);

// Outgoing messages
ws.interceptors.outgoing.use(
  (data) => JSON.stringify({ ...JSON.parse(data), token: 'abc' })
);
```

### Control

```javascript
ws.connect();                    // Manual connect
ws.disconnect(1000, 'Goodbye');  // Close with code/reason
ws.dispose();                    // Clean up permanently
```

## Reactive Hook (Recommended)

```javascript
const {
  connected,       // Pulse<boolean>
  lastMessage,     // Pulse<any>
  messages,        // Pulse<any[]> (if messageHistorySize > 0)
  error,           // Pulse<WebSocketError | null>
  reconnecting,    // Pulse<boolean>
  send,
  disconnect
} = useWebSocket('wss://api.example.com/ws', {
  immediate: true,           // Connect on creation (default: true)
  messageHistorySize: 100,   // Keep last 100 messages
  onMessage: (data) => console.log('Message:', data),
  onOpen: () => console.log('Connected'),
  onClose: (event) => console.log('Closed'),
  onError: (error) => console.error('Error:', error)
});
```

### Usage with Effects

```javascript
effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channel: 'updates' });
  }
});

effect(() => {
  const msg = lastMessage.get();
  if (msg) {
    console.log('Latest message:', msg);
  }
});
```

## Error Handling

```javascript
try {
  ws.send({ type: 'test' });
} catch (error) {
  if (WebSocketError.isWebSocketError(error)) {
    error.code;        // 'CONNECT_FAILED' | 'CLOSE' | 'TIMEOUT' | 'SEND_FAILED' | ...
    error.closeCode;   // WebSocket close code (1000, 1006, etc.)
    error.closeReason; // Close reason string

    // Helper methods
    error.isTimeout();       // true if connection timeout
    error.isConnectFailed(); // true if connection failed
    error.isSendFailed();    // true if send failed
  }
}
```

## Common Patterns

### Chat Application

```javascript
const { connected, lastMessage, send } = useWebSocket('wss://chat.example.com', {
  messageHistorySize: 100,
  onMessage: (msg) => {
    if (msg.type === 'chat') {
      messages.update(m => [...m, msg]);
    }
  }
});

const sendMessage = (text) => {
  send({ type: 'chat', text, timestamp: Date.now() });
};
```

### Real-time Updates

```javascript
const ws = createWebSocket('wss://api.example.com/realtime', {
  heartbeat: true,
  heartbeatInterval: 30000
});

ws.on('message', (data) => {
  switch (data.type) {
    case 'update':
      store.items.update(items =>
        items.map(i => i.id === data.id ? data : i)
      );
      break;
    case 'delete':
      store.items.update(items =>
        items.filter(i => i.id !== data.id)
      );
      break;
  }
});
```

### Reconnection with Authentication

```javascript
const ws = createWebSocket('wss://api.example.com/ws', {
  reconnect: true,
  maxRetries: 10
});

ws.on('open', () => {
  // Re-authenticate after reconnection
  ws.send({ type: 'auth', token: getAuthToken() });
});
```
