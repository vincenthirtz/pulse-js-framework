# API Reference: HTTP, WebSocket & GraphQL

> Load this context file when working on HTTP requests, WebSocket connections, or GraphQL operations.

### HTTP (runtime/http.js)

```javascript
import { createHttp, http, HttpError, useHttp, useHttpResource } from 'pulse-js-framework/runtime/http';

// Create HTTP client instance
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,                    // Request timeout (ms)
  headers: { 'Authorization': 'Bearer token' },
  retries: 3,                       // Retry on failure
  retryDelay: 1000,                 // Delay between retries (ms)
  withCredentials: false,           // Include cookies
  responseType: 'json'              // json | text | blob | arrayBuffer
});

// HTTP methods
const users = await api.get('/users');
const user = await api.get('/users/1', { params: { include: 'posts' } });
const created = await api.post('/users', { name: 'John' });
await api.put('/users/1', { name: 'Jane' });
await api.patch('/users/1', { active: true });
await api.delete('/users/1');

// Response structure
response.data;       // Parsed response body
response.status;     // HTTP status code
response.statusText; // Status text
response.headers;    // Response headers
response.config;     // Request config

// Request interceptors
api.interceptors.request.use(
  config => {
    config.headers['X-Request-Time'] = Date.now();
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      router.navigate('/login');
    }
    throw error;
  }
);

// Remove interceptor
const id = api.interceptors.request.use(fn);
api.interceptors.request.eject(id);
api.interceptors.request.clear();  // Remove all

// Child instance (inherits config)
const adminApi = api.create({
  baseURL: 'https://api.example.com/admin',
  headers: { 'X-Admin': 'true' }
});

// Request cancellation
const controller = new AbortController();
api.get('/users', { signal: controller.signal });
controller.abort();  // Cancel request
api.isCancel(error); // Check if error is cancellation

// Error handling
try {
  await api.get('/users');
} catch (error) {
  if (HttpError.isHttpError(error)) {
    error.code;      // 'TIMEOUT' | 'NETWORK' | 'ABORT' | 'HTTP_ERROR' | 'PARSE_ERROR'
    error.status;    // HTTP status code (if available)
    error.config;    // Request config
    error.response;  // Response object (if available)
    error.isTimeout();      // true if timeout
    error.isNetworkError(); // true if network failure
    error.isAborted();      // true if cancelled
  }
}

// Custom retry condition
const api = createHttp({
  retries: 3,
  retryCondition: (error) => {
    // Only retry on network errors, not 4xx
    return error.code === 'NETWORK' || error.status >= 500;
  }
});

// Reactive integration with useHttp
const { data, loading, error, execute, abort, reset } = useHttp(
  () => api.get('/users'),
  {
    immediate: true,     // Execute immediately
    retries: 3,          // Retry attempts
    onSuccess: (response) => console.log('Got:', response.data),
    onError: (error) => console.error('Failed:', error)
  }
);

// Use in effects
effect(() => {
  if (loading.get()) console.log('Loading...');
  if (data.get()) console.log('Users:', data.get());
});

// Resource with caching (SWR pattern)
const users = useHttpResource(
  'users',
  () => api.get('/users'),
  {
    refreshInterval: 30000,    // Auto-refresh every 30s
    refreshOnFocus: true,      // Refresh when window gains focus
    staleTime: 5000            // Data fresh for 5s
  }
);

// Default instance (pre-configured)
import { http } from 'pulse-js-framework/runtime/http';
const response = await http.get('https://api.example.com/users');
```

### WebSocket (runtime/websocket.js)

```javascript
import { createWebSocket, useWebSocket, WebSocketError } from 'pulse-js-framework/runtime/websocket';

// Low-level WebSocket with all features
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
  maxQueueSize: 100,            // Max queued messages (default: 100, 0 = disabled)
  queueEvictionStrategy: 'fifo', // 'fifo' (drop oldest) | 'drop-new' (keep first N) | 'drop-all' (wipe on overflow)
  autoParseJson: true           // Auto-parse JSON messages (default: true)
});

// Reactive state (all are Pulses)
ws.state.get();           // 'connecting' | 'open' | 'closing' | 'closed'
ws.connected.get();       // true when open
ws.reconnecting.get();    // true during reconnection
ws.reconnectAttempt.get(); // Current attempt number
ws.error.get();           // Last WebSocketError or null
ws.queuedCount.get();     // Number of queued messages

// Send messages (auto-serializes objects to JSON)
ws.send({ type: 'subscribe', channel: 'updates' });
ws.sendJson({ action: 'ping' });           // Explicit JSON
ws.sendBinary(new Uint8Array([1, 2, 3]));  // Binary data

// Listen for events
ws.on('open', () => console.log('Connected'));
ws.on('message', (data) => console.log('Received:', data));
ws.on('close', (event) => console.log('Closed:', event.code));
ws.on('error', (error) => console.error('Error:', error));

// Message interceptors
ws.interceptors.incoming.use(
  (data) => ({ ...data, timestamp: Date.now() }),
  (err) => console.error('Parse error:', err)
);

ws.interceptors.outgoing.use(
  (data) => JSON.stringify({ ...JSON.parse(data), token: 'abc' })
);

// Control
ws.connect();                    // Manual connect
ws.disconnect(1000, 'Goodbye');  // Close with code/reason
ws.dispose();                    // Clean up permanently

// === Reactive Hook (recommended) ===
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

// Use with effects
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

// Error handling
try {
  ws.send({ type: 'test' });
} catch (error) {
  if (WebSocketError.isWebSocketError(error)) {
    error.code;        // 'CONNECT_FAILED' | 'CLOSE' | 'TIMEOUT' | 'SEND_FAILED' | ...
    error.closeCode;   // WebSocket close code (1000, 1006, etc.)
    error.closeReason; // Close reason string
    error.isTimeout();       // true if connection timeout
    error.isConnectFailed(); // true if connection failed
    error.isSendFailed();    // true if send failed
  }
}
```

### GraphQL (runtime/graphql.js)

```javascript
import {
  createGraphQLClient, useQuery, useMutation, useSubscription, GraphQLError
} from 'pulse-js-framework/runtime/graphql';

// Create GraphQL client
const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000,                          // Request timeout (ms)
  cache: true,                             // Enable query caching (default: true)
  staleTime: 5000,                         // Data fresh for 5s
  dedupe: true                             // Deduplicate in-flight queries
});

// Set as default for hooks
import { setDefaultClient } from 'pulse-js-framework/runtime/graphql';
setDefaultClient(client);

// === Query with caching (SWR pattern) ===
const { data, loading, error, refetch, isStale } = useQuery(
  `query GetUsers($limit: Int) {
    users(limit: $limit) { id name email }
  }`,
  { limit: 10 },
  {
    staleTime: 30000,           // Data fresh for 30s
    refetchOnFocus: true,       // Refetch when tab gains focus
    refetchInterval: 60000,     // Poll every 60s
    onSuccess: (data) => console.log('Loaded:', data)
  }
);

// Use in effects
effect(() => {
  if (loading.get()) return el('.spinner');
  if (error.get()) return el('.error', error.get().message);
  return el('ul', data.get()?.users.map(u => el('li', u.name)));
});

// === Mutation with optimistic updates ===
const { mutate, loading: saving } = useMutation(
  `mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }`,
  {
    onMutate: (variables) => {
      // Optimistic update - return rollback context
      const previous = usersCache.get();
      usersCache.update(users => [...users, { id: 'temp', ...variables.input }]);
      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      usersCache.set(context.previous);
    },
    onSuccess: (data) => console.log('Created:', data),
    invalidateQueries: ['gql:GetUsers']  // Invalidate related queries
  }
);

// Execute mutation
await mutate({ input: { name: 'John', email: 'john@example.com' } });

// === Subscription (graphql-ws protocol) ===
const { data: liveData, status, unsubscribe } = useSubscription(
  `subscription OnNewMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author createdAt }
  }`,
  { channelId: '123' },
  {
    onData: (message) => {
      notifications.update(n => [...n, message]);
    },
    shouldResubscribe: true,  // Auto-resubscribe on error
    // Exponential backoff for reconnection
    retryBaseDelay: 1000,     // Base delay (ms) - default: 1000
    retryMaxDelay: 30000,     // Max delay cap (ms) - default: 30000
    maxRetries: Infinity      // Max retry attempts - default: Infinity
  }
);

// Subscription state includes retry tracking
const { data, status, retryCount, unsubscribe } = useSubscription(...);
status.get();      // 'connecting' | 'connected' | 'reconnecting' | 'error' | 'failed' | 'closed'
retryCount.get();  // Current retry attempt (resets to 0 on success)

// Reactive subscription with dynamic variables
const channelId = pulse('123');
const { data: messages } = useSubscription(
  `subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content }
  }`,
  () => ({ channelId: channelId.get() }),  // Reactive variables
  { enabled: computed(() => !!channelId.get()) }
);

// === Error handling ===
try {
  await client.query('query { user { id } }');
} catch (error) {
  if (GraphQLError.isGraphQLError(error)) {
    error.code;                    // 'GRAPHQL_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | ...
    error.errors;                  // GraphQL errors array
    error.data;                    // Partial data (if any)
    error.hasPartialData();        // true if response has partial data
    error.isAuthenticationError(); // true if UNAUTHENTICATED
    error.isValidationError();     // true if BAD_USER_INPUT
    error.getFirstError();         // First error message
    error.getAllErrors();          // All error messages
  }
}

// === Interceptors ===
client.interceptors.request.use((config) => {
  // Add timestamp to all requests
  return { ...config, timestamp: Date.now() };
});

client.interceptors.response.use((result) => {
  // Transform all responses
  return { ...result, cached: true };
});

// === Cache management ===
client.invalidate('gql:GetUsers');  // Invalidate specific query
client.invalidateAll();              // Clear all cache
client.getCacheStats();              // { size, keys }
```

