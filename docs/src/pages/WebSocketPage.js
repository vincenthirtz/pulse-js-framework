/**
 * Pulse Documentation - WebSocket Client Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function WebSocketPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="websocket.title"></h1>
    <p class="page-intro" data-i18n="websocket.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="websocket.quickStart"></h2>
      <p data-i18n="websocket.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { useWebSocket } from 'pulse-js-framework/runtime/websocket';

const { connected, lastMessage, send, disconnect } = useWebSocket('wss://api.example.com/ws', {
  onMessage: (data) => console.log('Received:', data)
});

effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channel: 'updates' });
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.lowLevelApi"></h2>

      <h3 data-i18n="websocket.creatingWebSocket"></h3>
      <div class="code-block">
        <pre><code>import { createWebSocket } from 'pulse-js-framework/runtime/websocket';

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
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.reactiveState"></h2>
      <p data-i18n="websocket.reactiveStateDesc"></p>
      <div class="code-block">
        <pre><code>ws.state.get();           // 'connecting' | 'open' | 'closing' | 'closed'
ws.connected.get();       // true when open
ws.reconnecting.get();    // true during reconnection
ws.reconnectAttempt.get(); // Current attempt number
ws.error.get();           // Last WebSocketError or null
ws.queuedCount.get();     // Number of queued messages</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.sendingMessages"></h2>
      <div class="code-block">
        <pre><code>// Auto-serializes objects to JSON
ws.send({ type: 'subscribe', channel: 'updates' });

// Explicit JSON
ws.sendJson({ action: 'ping' });

// Binary data
ws.sendBinary(new Uint8Array([1, 2, 3]));</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.eventListeners"></h2>
      <div class="code-block">
        <pre><code>ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data));
ws.on('close', (event) => console.log('Closed:', event.code));
ws.on('error', (error) => console.error('Error:', error));</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.interceptors"></h2>
      <p data-i18n="websocket.interceptorsDesc"></p>
      <div class="code-block">
        <pre><code>// Incoming messages
ws.interceptors.incoming.use(
  (data) => ({ ...data, timestamp: Date.now() }),
  (err) => console.error('Parse error:', err)
);

// Outgoing messages
ws.interceptors.outgoing.use(
  (data) => JSON.stringify({ ...JSON.parse(data), token: 'abc' })
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.control"></h2>
      <div class="code-block">
        <pre><code>ws.connect();                    // Manual connect
ws.disconnect(1000, 'Goodbye');  // Close with code/reason
ws.dispose();                    // Clean up permanently</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.reactiveHook"></h2>
      <p data-i18n="websocket.reactiveHookDesc"></p>
      <div class="code-block">
        <pre><code>const {
  connected,       // Pulse&lt;boolean&gt;
  lastMessage,     // Pulse&lt;any&gt;
  messages,        // Pulse&lt;any[]&gt; (if messageHistorySize > 0)
  error,           // Pulse&lt;WebSocketError | null&gt;
  reconnecting,    // Pulse&lt;boolean&gt;
  send,
  disconnect
} = useWebSocket('wss://api.example.com/ws', {
  immediate: true,           // Connect on creation (default: true)
  messageHistorySize: 100,   // Keep last 100 messages
  onMessage: (data) => console.log('Message:', data),
  onOpen: () => console.log('Connected'),
  onClose: (event) => console.log('Closed'),
  onError: (error) => console.error('Error:', error)
});</code></pre>
      </div>

      <h3 data-i18n="websocket.usageWithEffects"></h3>
      <div class="code-block">
        <pre><code>effect(() => {
  if (connected.get()) {
    send({ type: 'subscribe', channel: 'updates' });
  }
});

effect(() => {
  const msg = lastMessage.get();
  if (msg) {
    console.log('Latest message:', msg);
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.errorHandling"></h2>
      <p data-i18n="websocket.errorHandlingDesc"></p>
      <div class="code-block">
        <pre><code>import { WebSocketError } from 'pulse-js-framework/runtime/websocket';

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
}</code></pre>
      </div>

      <h3 data-i18n="websocket.errorCodes"></h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Code</th>
              <th data-i18n="websocket.description"></th>
              <th data-i18n="websocket.when"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>CONNECT_FAILED</code></td>
              <td data-i18n="websocket.errorConnectFailed"></td>
              <td data-i18n="websocket.errorConnectFailedWhen"></td>
            </tr>
            <tr>
              <td><code>CLOSE</code></td>
              <td data-i18n="websocket.errorClose"></td>
              <td data-i18n="websocket.errorCloseWhen"></td>
            </tr>
            <tr>
              <td><code>TIMEOUT</code></td>
              <td data-i18n="websocket.errorTimeout"></td>
              <td data-i18n="websocket.errorTimeoutWhen"></td>
            </tr>
            <tr>
              <td><code>SEND_FAILED</code></td>
              <td data-i18n="websocket.errorSendFailed"></td>
              <td data-i18n="websocket.errorSendFailedWhen"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="websocket.patterns"></h2>

      <h3 data-i18n="websocket.chatApplication"></h3>
      <div class="code-block">
        <pre><code>const { connected, lastMessage, send } = useWebSocket('wss://chat.example.com', {
  messageHistorySize: 100,
  onMessage: (msg) => {
    if (msg.type === 'chat') {
      messages.update(m => [...m, msg]);
    }
  }
});

const sendMessage = (text) => {
  send({ type: 'chat', text, timestamp: Date.now() });
};</code></pre>
      </div>

      <h3 data-i18n="websocket.realTimeUpdates"></h3>
      <div class="code-block">
        <pre><code>const ws = createWebSocket('wss://api.example.com/realtime', {
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
});</code></pre>
      </div>

      <h3 data-i18n="websocket.reconnectionWithAuth"></h3>
      <div class="code-block">
        <pre><code>const ws = createWebSocket('wss://api.example.com/ws', {
  reconnect: true,
  maxRetries: 10
});

ws.on('open', () => {
  // Re-authenticate after reconnection
  ws.send({ type: 'auth', token: getAuthToken() });
});</code></pre>
      </div>
    </section>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  return page;
}
