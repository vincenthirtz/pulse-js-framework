/**
 * Pulse Documentation - Server-Sent Events (SSE) Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale } from '../state.js';

export function SSEPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="sse.title">Server-Sent Events (SSE)</h1>
    <p class="page-intro" data-i18n="sse.intro">Reactive Server-Sent Events with auto-reconnect, exponential backoff with jitter, and full lifecycle management. Ideal for live feeds, notifications, and real-time server push.</p>

    <section class="doc-section">
      <h2 data-i18n="sse.quickStart">Quick Start</h2>
      <p data-i18n="sse.quickStartDesc">The easiest way to consume an SSE stream is with the \`useSSE\` hook. It returns reactive pulses that update automatically as events arrive.</p>
      <div class="code-block">
        <pre><code>import { useSSE } from 'pulse-js-framework/runtime/sse';
import { effect } from 'pulse-js-framework/runtime';

const { data, connected, error } = useSSE('https://api.example.com/events');

// Reactively display incoming data
effect(() => {
  if (connected.get()) {
    console.log('Connected to SSE stream');
  }
  if (data.get()) {
    console.log('Latest event:', data.get());
  }
  if (error.get()) {
    console.error('SSE error:', error.get());
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.createSSEApi">createSSE API</h2>
      <p data-i18n="sse.createSSEDesc">The low-level \`createSSE(url, options)\` function gives you full control over the SSE connection, including event listeners, manual connect/close, and access to all reactive state.</p>

      <h3 data-i18n="sse.allOptions">All Options</h3>
      <div class="code-block">
        <pre><code>import { createSSE } from 'pulse-js-framework/runtime/sse';

const sse = createSSE('https://api.example.com/events', {
  // Credentials
  withCredentials: false,     // Send cookies cross-origin (default: false)

  // Reconnection
  reconnect: true,            // Auto-reconnect on disconnect (default: true)
  maxRetries: 5,              // Max reconnection attempts (default: 5)
  baseDelay: 1000,            // Base delay for exponential backoff in ms (default: 1000)
  maxDelay: 30000,            // Maximum delay cap in ms (default: 30000)

  // Events
  events: ['message'],        // Event types to listen for (default: ['message'])
  parseJSON: true,            // Auto-parse JSON event data (default: true)
  immediate: true,            // Connect immediately on creation (default: true)

  // Callbacks
  onMessage: (data, event) => console.log('Message:', data),
  onOpen: () => console.log('Connected'),
  onError: (err) => console.error('Error:', err)
});</code></pre>
      </div>

      <h3 data-i18n="sse.optionsTable">Options Reference</h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Default</th>
              <th data-i18n="sse.description">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>withCredentials</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td data-i18n="sse.optWithCredentials">Send cookies and auth headers for cross-origin requests</td>
            </tr>
            <tr>
              <td><code>reconnect</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td data-i18n="sse.optReconnect">Automatically reconnect when the connection is lost</td>
            </tr>
            <tr>
              <td><code>maxRetries</code></td>
              <td><code>number</code></td>
              <td><code>5</code></td>
              <td data-i18n="sse.optMaxRetries">Maximum number of consecutive reconnection attempts</td>
            </tr>
            <tr>
              <td><code>baseDelay</code></td>
              <td><code>number</code></td>
              <td><code>1000</code></td>
              <td data-i18n="sse.optBaseDelay">Base delay in milliseconds for exponential backoff</td>
            </tr>
            <tr>
              <td><code>maxDelay</code></td>
              <td><code>number</code></td>
              <td><code>30000</code></td>
              <td data-i18n="sse.optMaxDelay">Maximum delay cap in milliseconds between reconnection attempts</td>
            </tr>
            <tr>
              <td><code>events</code></td>
              <td><code>string[]</code></td>
              <td><code>['message']</code></td>
              <td data-i18n="sse.optEvents">SSE event types to listen for</td>
            </tr>
            <tr>
              <td><code>parseJSON</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td data-i18n="sse.optParseJSON">Automatically parse event data as JSON</td>
            </tr>
            <tr>
              <td><code>immediate</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td data-i18n="sse.optImmediate">Connect immediately when created</td>
            </tr>
            <tr>
              <td><code>onMessage</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sse.optOnMessage">Callback invoked on every incoming event with (data, event)</td>
            </tr>
            <tr>
              <td><code>onOpen</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sse.optOnOpen">Callback invoked when the connection is established</td>
            </tr>
            <tr>
              <td><code>onError</code></td>
              <td><code>function</code></td>
              <td><code>null</code></td>
              <td data-i18n="sse.optOnError">Callback invoked on connection errors</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 data-i18n="sse.returnValues">Return Values</h3>
      <div class="code-block">
        <pre><code>const sse = createSSE('https://api.example.com/events');

// Reactive state (all are Pulses)
sse.state.get();              // 'connecting' | 'open' | 'closed'
sse.connected.get();          // true when state is 'open'
sse.reconnecting.get();       // true during reconnection backoff
sse.reconnectAttempt.get();   // Current reconnect attempt number (0-based)
sse.error.get();              // Last SSEError or null
sse.lastEventId.get();        // Last event ID from the server or null

// Control methods
sse.connect();                // Manually (re)connect, resets retry counter
sse.close();                  // Close connection, cancel pending reconnect
sse.dispose();                // Permanently close and clean up all resources

// Event listeners
sse.on('notification', (data, event) => { /* ... */ });
sse.off('notification', handler);

// Aliases
sse.addEventListener === sse.on;
sse.removeEventListener === sse.off;</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.useSSEHook">useSSE Hook</h2>
      <p data-i18n="sse.useSSEDesc">The \`useSSE\` hook wraps \`createSSE\` with automatic lifecycle management and a reactive \`data\` pulse that updates on every incoming event. It also supports message history for keeping a buffer of recent events.</p>
      <div class="code-block">
        <pre><code>import { useSSE } from 'pulse-js-framework/runtime/sse';

const {
  data,           // Pulse&lt;any&gt;     - Latest event data
  connected,      // Computed&lt;boolean&gt; - true when connected
  error,          // Pulse&lt;SSEError | null&gt;
  reconnecting,   // Pulse&lt;boolean&gt;  - true during reconnect backoff
  lastEventId,    // Pulse&lt;string | null&gt; - Last event ID from server
  close,          // () => void     - Close the connection
  reconnect,      // () => void     - Manually reconnect
  sse             // Underlying createSSE instance
} = useSSE('https://api.example.com/events', {
  onMessage: (data) => console.log('Received:', data),
  onOpen: () => console.log('Stream opened'),
  onError: (err) => console.error('Error:', err)
});</code></pre>
      </div>

      <h3 data-i18n="sse.messageHistory">Message History</h3>
      <p data-i18n="sse.messageHistoryDesc">Pass \`messageHistorySize\` to keep a rolling buffer of the most recent events. This is useful for rendering a list of live updates.</p>
      <div class="code-block">
        <pre><code>const {
  data,
  messages,       // Pulse&lt;any[]&gt; - Rolling buffer of recent events
  clearMessages,  // () => void   - Clear the message buffer
  connected,
  close
} = useSSE('https://api.example.com/feed', {
  messageHistorySize: 50   // Keep the last 50 events
});

// Render a reactive list of messages
effect(() => {
  const history = messages.get();
  console.log(\`\${history.length} events in buffer\`);
  history.forEach(msg => console.log('-', msg));
});

// Clear the buffer
clearMessages();</code></pre>
      </div>

      <h3 data-i18n="sse.lifecycleCleanup">Lifecycle Cleanup</h3>
      <p data-i18n="sse.lifecycleCleanupDesc">\`useSSE\` registers an \`onCleanup\` handler, so the connection is automatically disposed when the enclosing effect or component is destroyed. No manual cleanup is needed in most cases.</p>
      <div class="code-block">
        <pre><code>// Inside a component or effect scope
effect(() => {
  const { data, connected } = useSSE('https://api.example.com/events');
  // Connection auto-disposes when this effect is cleaned up
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.connectionState">Connection State</h2>
      <p data-i18n="sse.connectionStateDesc">Both \`createSSE\` and \`useSSE\` expose reactive pulses for monitoring the connection lifecycle. Use these in effects to build connection status indicators.</p>
      <div class="code-block">
        <pre><code>import { createSSE } from 'pulse-js-framework/runtime/sse';
import { effect, el, mount } from 'pulse-js-framework/runtime';

const sse = createSSE('https://api.example.com/events');

// Build a reactive status indicator
const StatusBadge = () => el('.status-badge', {
  class: () => {
    if (sse.connected.get()) return 'status-badge connected';
    if (sse.reconnecting.get()) return 'status-badge reconnecting';
    return 'status-badge disconnected';
  }
}, () => {
  if (sse.connected.get()) return 'Connected';
  if (sse.reconnecting.get()) {
    return \`Reconnecting (attempt \${sse.reconnectAttempt.get()})...\`;
  }
  return 'Disconnected';
});

// Log state transitions
effect(() => {
  console.log('SSE state:', sse.state.get());
  // 'connecting' -> 'open' -> 'closed'
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.customEvents">Custom Events</h2>
      <p data-i18n="sse.customEventsDesc">SSE servers can send named events using the \`event:\` field. By default, only the \`message\` event is listened for. Pass additional event names in the \`events\` option or register them dynamically with \`on()\`.</p>
      <div class="code-block">
        <pre><code>// Server sends:
// event: notification
// data: {"title":"New message","body":"Hello!"}
//
// event: heartbeat
// data: {"ts":1707753600}

// Option 1: Declare events upfront
const sse = createSSE('https://api.example.com/events', {
  events: ['message', 'notification', 'heartbeat'],
  onMessage: (data, event) => {
    console.log(\`[\${event.type}]\`, data);
  }
});

// Option 2: Register listeners dynamically
sse.on('notification', (data) => {
  showToast(data.title, data.body);
});

sse.on('heartbeat', (data) => {
  console.log('Server heartbeat:', data.ts);
});

// Remove a specific listener
const handler = (data) => console.log(data);
sse.on('notification', handler);
sse.off('notification', handler);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.autoReconnect">Auto-Reconnect</h2>
      <p data-i18n="sse.autoReconnectDesc">When the connection drops, \`createSSE\` automatically reconnects using exponential backoff with jitter. The delay doubles on each attempt (up to \`maxDelay\`) with +/-25% random jitter to avoid thundering herd problems.</p>
      <div class="code-block">
        <pre><code>// Backoff formula:
// delay = min(baseDelay * 2^attempt, maxDelay) +/- 25% jitter

// Example with defaults (baseDelay: 1000, maxDelay: 30000):
// Attempt 0: ~1000ms  (750 - 1250ms)
// Attempt 1: ~2000ms  (1500 - 2500ms)
// Attempt 2: ~4000ms  (3000 - 5000ms)
// Attempt 3: ~8000ms  (6000 - 10000ms)
// Attempt 4: ~16000ms (12000 - 20000ms)
// Attempt 5: MAX_RETRIES reached, stops reconnecting

const sse = createSSE('https://api.example.com/events', {
  reconnect: true,      // Enable auto-reconnect (default)
  maxRetries: 10,       // Try up to 10 times
  baseDelay: 500,       // Start with 500ms delay
  maxDelay: 60000       // Cap at 60 seconds
});

// Monitor reconnection progress
effect(() => {
  if (sse.reconnecting.get()) {
    console.log(\`Reconnecting... attempt \${sse.reconnectAttempt.get()}\`);
  }
});

// The retry counter resets to 0 on successful connection.
// Manually calling sse.connect() also resets the counter.

// Disable auto-reconnect
const manualSSE = createSSE('https://api.example.com/events', {
  reconnect: false,
  immediate: false
});

// Connect and reconnect manually
manualSSE.connect();
// Later, after disconnect:
manualSSE.connect();  // Resets retry counter and reconnects</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.errorHandling">Error Handling</h2>
      <p data-i18n="sse.errorHandlingDesc">SSE errors are represented by the \`SSEError\` class, which extends \`RuntimeError\` and includes structured \`sseCode\` values for programmatic error handling.</p>
      <div class="code-block">
        <pre><code>import { SSEError } from 'pulse-js-framework/runtime/sse';

const sse = createSSE('https://api.example.com/events', {
  onError: (err) => {
    if (SSEError.isSSEError(err)) {
      console.error('SSE error code:', err.sseCode);

      // Helper methods
      if (err.isConnectFailed()) {
        console.error('Connection failed - check URL and server');
      }
      if (err.isMaxRetries()) {
        console.error('All reconnection attempts exhausted');
        showOfflineBanner();
      }
    }
  }
});

// Reactively handle errors
effect(() => {
  const err = sse.error.get();
  if (err) {
    console.error(\`SSE error [\${err.sseCode}]: \${err.message}\`);
  }
});</code></pre>
      </div>

      <h3 data-i18n="sse.errorCodesTitle">SSEError Codes</h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>sseCode</th>
              <th data-i18n="sse.errorDescription">Description</th>
              <th data-i18n="sse.errorWhen">When</th>
              <th data-i18n="sse.errorHelper">Helper Method</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>CONNECT_FAILED</code></td>
              <td data-i18n="sse.errorConnectFailed">Connection could not be established or was lost</td>
              <td data-i18n="sse.errorConnectFailedWhen">Invalid URL, server unreachable, network failure, or connection dropped</td>
              <td><code>isConnectFailed()</code></td>
            </tr>
            <tr>
              <td><code>TIMEOUT</code></td>
              <td data-i18n="sse.errorTimeout">Connection attempt timed out</td>
              <td data-i18n="sse.errorTimeoutWhen">Server did not respond within the expected time</td>
              <td><code>isTimeout()</code></td>
            </tr>
            <tr>
              <td><code>MAX_RETRIES</code></td>
              <td data-i18n="sse.errorMaxRetries">All reconnection attempts exhausted</td>
              <td data-i18n="sse.errorMaxRetriesWhen">Reconnection failed after \`maxRetries\` consecutive attempts</td>
              <td><code>isMaxRetries()</code></td>
            </tr>
            <tr>
              <td><code>CLOSED</code></td>
              <td data-i18n="sse.errorClosed">Connection was closed</td>
              <td data-i18n="sse.errorClosedWhen">Server closed the stream or client called close()</td>
              <td><code>isClosed()</code></td>
            </tr>
            <tr>
              <td><code>UNKNOWN</code></td>
              <td data-i18n="sse.errorUnknown">Unexpected error</td>
              <td data-i18n="sse.errorUnknownWhen">An unclassified error occurred</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.jsonParsing">JSON Parsing</h2>
      <p data-i18n="sse.jsonParsingDesc">By default, \`parseJSON\` is enabled, and event data is automatically parsed as JSON. If the data is not valid JSON, it is kept as a raw string. You can disable this behavior for text-only streams.</p>
      <div class="code-block">
        <pre><code>// With parseJSON: true (default)
// Server sends: data: {"count":42,"status":"ok"}
// You receive: { count: 42, status: 'ok' } (parsed object)

// Server sends: data: plain text message
// You receive: 'plain text message' (string, JSON parse silently fails)

const jsonSSE = createSSE('https://api.example.com/json-stream', {
  parseJSON: true  // default
});

jsonSSE.on('message', (data) => {
  // data is already a parsed JS object (if valid JSON)
  console.log(data.count);  // 42
});

// Disable JSON parsing for raw text streams
const textSSE = createSSE('https://api.example.com/log-stream', {
  parseJSON: false
});

textSSE.on('message', (data) => {
  // data is always a raw string
  console.log(typeof data);  // 'string'
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="sse.fullExample">Full Example: Live Notifications</h2>
      <p data-i18n="sse.fullExampleDesc">A complete example showing how to build a reactive notification feed with SSE, including connection state, message history, reconnection handling, and custom event types.</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount, list } from 'pulse-js-framework/runtime';
import { useSSE } from 'pulse-js-framework/runtime/sse';

// Connect to the notification stream with message history
const {
  data,
  messages,
  clearMessages,
  connected,
  reconnecting,
  error,
  close,
  reconnect,
  sse
} = useSSE('https://api.example.com/notifications', {
  messageHistorySize: 100,
  events: ['message', 'alert', 'system'],
  maxRetries: 10,
  baseDelay: 2000,
  onOpen: () => console.log('Notification stream connected'),
  onError: (err) => console.error('Stream error:', err.sseCode)
});

// Listen for specific event types via the underlying instance
sse.on('alert', (data) => {
  showUrgentBanner(data.message);
});

sse.on('system', (data) => {
  if (data.action === 'maintenance') {
    showMaintenanceWarning(data.eta);
  }
});

// Build the notification UI
const NotificationApp = () => el('.notification-app', [
  // Connection status bar
  el('.status-bar', {
    class: () => {
      if (connected.get()) return 'status-bar online';
      if (reconnecting.get()) return 'status-bar reconnecting';
      return 'status-bar offline';
    }
  }, [
    el('span.status-dot'),
    el('span.status-text', () => {
      if (connected.get()) return 'Live';
      if (reconnecting.get()) return 'Reconnecting...';
      return 'Disconnected';
    }),
    el('button.reconnect-btn', {
      onclick: () => reconnect(),
      style: () => \`display: \${
        !connected.get() && !reconnecting.get() ? 'inline-block' : 'none'
      }\`
    }, 'Reconnect')
  ]),

  // Error display
  el('.error-bar', {
    style: () => \`display: \${error.get() ? 'block' : 'none'}\`
  }, () => error.get()?.message || ''),

  // Toolbar
  el('.toolbar', [
    el('span', () => \`\${messages.get().length} notifications\`),
    el('button', { onclick: () => clearMessages() }, 'Clear All'),
    el('button', { onclick: () => close() }, 'Disconnect')
  ]),

  // Notification list
  list(
    () => [...messages.get()].reverse(),
    (notification) => el('.notification-item', [
      el('.notification-title', notification.title || 'Notification'),
      el('.notification-body', notification.body || JSON.stringify(notification)),
      el('.notification-time', notification.timestamp
        ? new Date(notification.timestamp).toLocaleTimeString()
        : 'just now'
      )
    ]),
    (notification) => notification.id || Math.random()
  )
]);

mount('#app', NotificationApp());</code></pre>
      </div>
    </section>
  `;

  effect(() => {
    locale.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
