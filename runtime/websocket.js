/**
 * Pulse WebSocket - Reactive WebSocket client for Pulse Framework
 * @module pulse-js-framework/runtime/websocket
 *
 * Provides WebSocket support with:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat/ping-pong mechanism
 * - Message queuing when disconnected
 * - Full integration with Pulse reactivity
 *
 * @example
 * import { createWebSocket, useWebSocket } from 'pulse-js-framework/runtime/websocket';
 *
 * // Low-level API
 * const ws = createWebSocket('wss://api.example.com/ws', {
 *   reconnect: true,
 *   heartbeat: true
 * });
 *
 * ws.on('message', (data) => console.log('Received:', data));
 * ws.send({ type: 'subscribe', channel: 'updates' });
 *
 * // Reactive hook
 * const { connected, lastMessage, send } = useWebSocket('wss://api.example.com/ws');
 */

import { pulse, computed, batch, onCleanup } from './pulse.js';
import { createVersionedAsync } from './async.js';
import { RuntimeError, createErrorMessage, getDocsUrl } from './errors.js';
import { loggers } from './logger.js';

// ============================================================================
// WebSocket Error Class
// ============================================================================

/**
 * WebSocket-specific error suggestions
 */
const WEBSOCKET_SUGGESTIONS = {
  CONNECT_FAILED: 'Check the WebSocket URL and ensure the server is running. Verify CORS settings if connecting cross-origin.',
  CLOSE: 'The connection was closed. Check close code for reason. Common codes: 1000 (normal), 1001 (going away), 1006 (abnormal).',
  TIMEOUT: 'Connection timed out. Check network conditions or increase the timeout value.',
  PARSE_ERROR: 'Failed to parse incoming message. Check message format matches expected type (JSON/binary).',
  SEND_FAILED: 'Failed to send message. Connection may be closed or message exceeds size limit.',
  RECONNECT_EXHAUSTED: 'Maximum reconnection attempts reached. Consider increasing maxRetries or checking server availability.'
};

/**
 * WebSocket Error with connection and reconnection context
 */
export class WebSocketError extends RuntimeError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {string} [options.code] - Error code
   * @param {string} [options.url] - WebSocket URL
   * @param {number} [options.closeCode] - WebSocket close code
   * @param {string} [options.closeReason] - WebSocket close reason
   * @param {Event} [options.event] - Original event
   * @param {number} [options.reconnectAttempt] - Current reconnection attempt number
   * @param {number} [options.maxRetries] - Maximum reconnection retries configured
   * @param {number} [options.nextRetryDelay] - Delay until next retry in ms
   */
  constructor(message, options = {}) {
    const code = options.code || 'WEBSOCKET_ERROR';
    const formattedMessage = createErrorMessage({
      code,
      message,
      context: options.context,
      suggestion: options.suggestion || WEBSOCKET_SUGGESTIONS[code]
    });

    super(formattedMessage, { code });

    this.name = 'WebSocketError';
    this.code = code;
    this.url = options.url || null;
    this.closeCode = options.closeCode || null;
    this.closeReason = options.closeReason || null;
    this.event = options.event || null;
    this.isWebSocketError = true;

    // Reconnection context
    this.reconnectAttempt = typeof options.reconnectAttempt === 'number' ? options.reconnectAttempt : null;
    this.maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : null;
    this.nextRetryDelay = typeof options.nextRetryDelay === 'number' ? options.nextRetryDelay : null;
  }

  /**
   * Check if an error is a WebSocketError
   * @param {any} error - The error to check
   * @returns {boolean}
   */
  static isWebSocketError(error) {
    return error?.isWebSocketError === true;
  }

  isConnectFailed() { return this.code === 'CONNECT_FAILED'; }
  isClose() { return this.code === 'CLOSE'; }
  isTimeout() { return this.code === 'TIMEOUT'; }
  isParseError() { return this.code === 'PARSE_ERROR'; }
  isSendFailed() { return this.code === 'SEND_FAILED'; }
  isReconnectExhausted() { return this.code === 'RECONNECT_EXHAUSTED'; }

  /**
   * Check if this error occurred during reconnection
   * @returns {boolean}
   */
  isReconnecting() {
    return this.reconnectAttempt !== null && this.reconnectAttempt > 0;
  }

  /**
   * Check if more reconnection attempts are available
   * @returns {boolean}
   */
  canRetry() {
    if (this.maxRetries === null || this.reconnectAttempt === null) {
      return false;
    }
    return this.reconnectAttempt < this.maxRetries;
  }

  /**
   * Get remaining reconnection attempts
   * @returns {number|null}
   */
  getRemainingRetries() {
    if (this.maxRetries === null || this.reconnectAttempt === null) {
      return null;
    }
    return Math.max(0, this.maxRetries - this.reconnectAttempt);
  }
}

// ============================================================================
// Message Interceptor Manager
// ============================================================================

/**
 * Manages message interceptors for incoming/outgoing messages
 */
class MessageInterceptorManager {
  #handlers = new Map();
  #idCounter = 0;

  /**
   * Add a message interceptor
   * @param {Function} onMessage - Transform message data
   * @param {Function} [onError] - Handle interceptor errors
   * @returns {number} Interceptor ID
   */
  use(onMessage, onError) {
    const id = this.#idCounter++;
    this.#handlers.set(id, { onMessage, onError });
    return id;
  }

  /**
   * Remove an interceptor by ID
   * @param {number} id - The interceptor ID
   */
  eject(id) {
    this.#handlers.delete(id);
  }

  /**
   * Remove all interceptors
   */
  clear() {
    this.#handlers.clear();
  }

  /**
   * Get the number of interceptors
   * @returns {number}
   */
  get size() {
    return this.#handlers.size;
  }

  /**
   * Iterate through handlers
   */
  *[Symbol.iterator]() {
    for (const handler of this.#handlers.values()) {
      yield handler;
    }
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Calculate exponential backoff with jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in ms
 * @param {number} maxDelay - Maximum delay in ms
 * @param {number} jitterFactor - Jitter factor (0-1)
 * @returns {number} Delay in ms
 */
function calculateBackoff(attempt, baseDelay, maxDelay, jitterFactor) {
  const exponential = baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelay);
  const jitter = capped * jitterFactor * (Math.random() - 0.5);
  return Math.floor(capped + jitter);
}

/**
 * Simple event emitter for WebSocket events
 */
class EventEmitter {
  #listeners = new Map();

  on(event, handler) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in ${event} handler:`, err);
      }
    });
  }

  removeAllListeners() {
    this.#listeners.clear();
  }
}

/**
 * Message queue for offline message buffering
 */
class MessageQueue {
  #queue = [];
  #maxSize;

  constructor(maxSize = 100) {
    this.#maxSize = maxSize;
  }

  enqueue(message) {
    if (this.#queue.length >= this.#maxSize) {
      this.#queue.shift(); // Drop oldest (FIFO overflow)
    }
    this.#queue.push(message);
  }

  dequeueAll() {
    const messages = [...this.#queue];
    this.#queue = [];
    return messages;
  }

  get length() { return this.#queue.length; }
  clear() { this.#queue = []; }
}

/**
 * Heartbeat manager for connection health monitoring
 */
class HeartbeatManager {
  #sendFn;
  #options;
  #heartbeatTimer = null;
  #pongTimer = null;
  #missedPongs = 0;
  #onTimeout;

  constructor(sendFn, options, onTimeout) {
    this.#sendFn = sendFn;
    this.#options = options;
    this.#onTimeout = onTimeout;
  }

  start() {
    this.stop();
    this.#heartbeatTimer = setInterval(() => this.#sendPing(), this.#options.heartbeatInterval);
  }

  stop() {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
    }
    if (this.#pongTimer) {
      clearTimeout(this.#pongTimer);
      this.#pongTimer = null;
    }
    this.#missedPongs = 0;
  }

  #sendPing() {
    try {
      const msg = this.#options.heartbeatMessage;
      this.#sendFn(typeof msg === 'string' ? msg : JSON.stringify(msg));

      this.#pongTimer = setTimeout(() => {
        this.#missedPongs++;
        if (this.#missedPongs >= 2) {
          this.#onTimeout();
        }
      }, this.#options.heartbeatTimeout);
    } catch {
      // Connection may be closed
    }
  }

  handlePong() {
    if (this.#pongTimer) {
      clearTimeout(this.#pongTimer);
      this.#pongTimer = null;
    }
    this.#missedPongs = 0;
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS = {
  // Connection
  protocols: [],
  connectTimeout: 10000,
  autoConnect: true,

  // Reconnection
  reconnect: true,
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.3,

  // Heartbeat
  heartbeat: false,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  heartbeatMessage: 'ping',
  isPong: (msg) => msg === 'pong' || (typeof msg === 'object' && msg?.type === 'pong'),

  // Message handling
  queueWhileDisconnected: true,
  maxQueueSize: 100,
  messageType: 'json',
  autoParseJson: true
};

// ============================================================================
// createWebSocket - Low-Level Factory
// ============================================================================

/**
 * Create a WebSocket client with auto-reconnection, heartbeat, and message queuing.
 *
 * @param {string} url - WebSocket URL (ws:// or wss://)
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} WebSocket instance with reactive state and controls
 *
 * @example
 * const ws = createWebSocket('wss://api.example.com/ws', {
 *   reconnect: true,
 *   maxRetries: 5,
 *   heartbeat: true,
 *   heartbeatInterval: 30000
 * });
 *
 * // Reactive state
 * effect(() => {
 *   console.log('Connected:', ws.connected.get());
 * });
 *
 * // Send messages
 * ws.send({ type: 'subscribe', channel: 'updates' });
 *
 * // Listen for messages
 * ws.on('message', (data) => console.log('Received:', data));
 *
 * // Clean up
 * ws.dispose();
 */
export function createWebSocket(url, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = loggers.websocket;

  // === Reactive State ===
  const state = pulse('closed');
  const connected = computed(() => state.get() === 'open');
  const reconnecting = pulse(false);
  const reconnectAttempt = pulse(0);
  const error = pulse(null);
  const queuedCount = pulse(0);

  // === Internal State ===
  let socket = null;
  let intentionalClose = false;
  const messageQueue = new MessageQueue(opts.maxQueueSize);
  const eventEmitter = new EventEmitter();
  const versionController = createVersionedAsync();

  // Heartbeat manager (created lazily)
  let heartbeatManager = null;
  if (opts.heartbeat) {
    heartbeatManager = new HeartbeatManager(
      (msg) => socket?.send(msg),
      opts,
      () => forceReconnect('Heartbeat timeout')
    );
  }

  // === Interceptors ===
  const interceptors = {
    incoming: new MessageInterceptorManager(),
    outgoing: new MessageInterceptorManager()
  };

  // === Connection Logic ===

  function connect() {
    if (state.get() === 'open' || state.get() === 'connecting') {
      return;
    }

    intentionalClose = false;
    const ctx = versionController.begin();
    state.set('connecting');
    error.set(null);

    // Connection timeout
    const timeoutId = ctx.setTimeout(() => {
      if (socket) {
        socket.close();
      }
      handleError(new WebSocketError('Connection timeout', {
        code: 'TIMEOUT',
        url
      }), ctx);
    }, opts.connectTimeout);

    try {
      socket = new WebSocket(url, opts.protocols);
      socket.binaryType = 'arraybuffer';

      socket.onopen = (event) => {
        ctx.clearTimeout(timeoutId);
        ctx.ifCurrent(() => {
          const wasReconnecting = reconnecting.get();

          batch(() => {
            state.set('open');
            reconnecting.set(false);
            reconnectAttempt.set(0);
          });

          if (heartbeatManager) {
            heartbeatManager.start();
          }

          // Flush queued messages
          flushQueue();

          eventEmitter.emit('open', event);
          opts.onOpen?.(event);

          if (wasReconnecting) {
            opts.onReconnected?.();
          }

          log.info('WebSocket connected');
        });
      };

      socket.onclose = (event) => handleClose(event, ctx);
      socket.onerror = (event) => handleSocketError(event, ctx);
      socket.onmessage = (event) => handleMessage(event, ctx);

    } catch (err) {
      ctx.clearTimeout(timeoutId);
      handleError(new WebSocketError(err.message, {
        code: 'CONNECT_FAILED',
        url
      }), ctx);
    }
  }

  function handleClose(event, ctx) {
    ctx.ifCurrent(() => {
      if (heartbeatManager) {
        heartbeatManager.stop();
      }

      state.set('closed');

      eventEmitter.emit('close', event);
      opts.onClose?.(event);

      log.info(`WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);

      // Auto-reconnect if enabled and not intentionally closed
      if (opts.reconnect && !intentionalClose && event.code !== 1000) {
        scheduleReconnect();
      }
    });
  }

  function handleSocketError(event, ctx) {
    ctx.ifCurrent(() => {
      const attempt = reconnectAttempt.get();
      const wsError = new WebSocketError('WebSocket error', {
        code: 'CONNECT_FAILED',
        url,
        event,
        reconnectAttempt: attempt > 0 ? attempt : null,
        maxRetries: opts.reconnect ? opts.maxRetries : null
      });
      error.set(wsError);
      eventEmitter.emit('error', wsError);
      opts.onError?.(wsError);
      log.error('WebSocket error');
    });
  }

  function handleError(wsError, ctx) {
    ctx.ifCurrent(() => {
      // Add reconnection context to error if not already present
      if (wsError.reconnectAttempt === null && opts.reconnect) {
        wsError.reconnectAttempt = reconnectAttempt.get();
        wsError.maxRetries = opts.maxRetries;
      }

      error.set(wsError);
      state.set('closed');
      eventEmitter.emit('error', wsError);
      opts.onError?.(wsError);

      if (opts.reconnect && !intentionalClose) {
        scheduleReconnect();
      }
    });
  }

  function handleMessage(event, ctx) {
    ctx.ifCurrent(() => {
      let data = event.data;

      // Handle binary data
      if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
      }

      // Auto-parse JSON for text messages
      if (opts.autoParseJson && typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      // Check for pong (heartbeat response)
      if (opts.heartbeat && opts.isPong(data)) {
        heartbeatManager?.handlePong();
        return; // Don't emit pong as regular message
      }

      // Run through incoming interceptors
      for (const { onMessage, onError } of interceptors.incoming) {
        try {
          data = onMessage(data);
        } catch (err) {
          if (onError) {
            onError(err);
          } else {
            log.error('Incoming interceptor error:', err);
          }
        }
      }

      eventEmitter.emit('message', data, event);
      opts.onMessage?.(data, event);
    });
  }

  function scheduleReconnect() {
    const attempt = reconnectAttempt.get();

    if (opts.maxRetries > 0 && attempt >= opts.maxRetries) {
      error.set(new WebSocketError('Max reconnection attempts reached', {
        code: 'RECONNECT_EXHAUSTED',
        url,
        reconnectAttempt: attempt,
        maxRetries: opts.maxRetries
      }));
      reconnecting.set(false);
      return;
    }

    reconnecting.set(true);
    reconnectAttempt.update(n => n + 1);

    const delay = calculateBackoff(
      attempt,
      opts.baseDelay,
      opts.maxDelay,
      opts.jitterFactor
    );

    log.info(`Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
    opts.onReconnecting?.(attempt + 1, delay);

    const ctx = versionController.begin();
    ctx.setTimeout(() => {
      ctx.ifCurrent(() => connect());
    }, delay);
  }

  function forceReconnect(reason) {
    log.warn(`Forcing reconnect: ${reason}`);
    if (socket && socket.readyState < 2) {
      socket.close(4000, reason);
    }
    // scheduleReconnect will be called by onclose
  }

  function flushQueue() {
    const queued = messageQueue.dequeueAll();
    queuedCount.set(0);

    for (const msg of queued) {
      try {
        socket.send(msg);
      } catch (err) {
        log.error('Failed to send queued message:', err);
      }
    }

    if (queued.length > 0) {
      log.info(`Flushed ${queued.length} queued messages`);
    }
  }

  // === Public API ===

  function send(data) {
    let payload = data;

    // Handle different data types
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      payload = data;
    } else if (ArrayBuffer.isView(data)) {
      payload = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    } else if (typeof data === 'object' && opts.messageType === 'json') {
      payload = JSON.stringify(data);
    }

    // Run through outgoing interceptors
    for (const { onMessage, onError } of interceptors.outgoing) {
      try {
        payload = onMessage(payload);
      } catch (err) {
        if (onError) {
          onError(err);
        } else {
          log.error('Outgoing interceptor error:', err);
        }
      }
    }

    // Queue if disconnected
    if (state.get() !== 'open') {
      if (opts.queueWhileDisconnected) {
        messageQueue.enqueue(payload);
        queuedCount.set(messageQueue.length);
        log.debug('Message queued (disconnected)');
        return;
      }
      throw new WebSocketError('Cannot send: not connected', {
        code: 'SEND_FAILED',
        url
      });
    }

    socket.send(payload);
  }

  function sendJson(data) {
    send(JSON.stringify(data));
  }

  function sendBinary(data) {
    if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data) && !(data instanceof Blob)) {
      throw new WebSocketError('sendBinary requires ArrayBuffer, TypedArray, or Blob', {
        code: 'SEND_FAILED'
      });
    }
    send(data);
  }

  function disconnect(code = 1000, reason) {
    intentionalClose = true;
    opts.reconnect = false;
    if (socket && socket.readyState < 2) {
      state.set('closing');
      socket.close(code, reason);
    }
  }

  function dispose() {
    intentionalClose = true;
    versionController.abort();
    if (heartbeatManager) {
      heartbeatManager.stop();
    }
    messageQueue.clear();
    eventEmitter.removeAllListeners();
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      if (socket.readyState < 2) {
        socket.close(1000, 'Disposed');
      }
    }
    state.set('closed');
  }

  // Auto-connect if enabled
  if (opts.autoConnect) {
    connect();
  }

  return {
    // Reactive state
    state,
    connected,
    reconnecting,
    reconnectAttempt,
    error,
    queuedCount,

    // Methods
    connect,
    disconnect,
    send,
    sendJson,
    sendBinary,
    dispose,

    // Interceptors
    interceptors,

    // Events
    on: (event, handler) => eventEmitter.on(event, handler),
    off: (event, handler) => eventEmitter.off(event, handler),
    once: (event, handler) => eventEmitter.once(event, handler),

    // Properties
    get url() { return url; },
    get socket() { return socket; },
    get options() { return opts; }
  };
}

// ============================================================================
// useWebSocket - Reactive Hook
// ============================================================================

/**
 * Reactive WebSocket hook with automatic cleanup.
 *
 * @param {string} url - WebSocket URL
 * @param {Object} [options={}] - Configuration options
 * @returns {Object} Reactive WebSocket state and controls
 *
 * @example
 * const { connected, lastMessage, send } = useWebSocket('wss://api.example.com/ws', {
 *   immediate: true,
 *   messageHistorySize: 100,
 *   onMessage: (data) => console.log('Received:', data)
 * });
 *
 * effect(() => {
 *   if (connected.get()) {
 *     send({ type: 'subscribe', channel: 'updates' });
 *   }
 * });
 *
 * effect(() => {
 *   const msg = lastMessage.get();
 *   if (msg) {
 *     console.log('Latest message:', msg);
 *   }
 * });
 */
export function useWebSocket(url, options = {}) {
  const {
    immediate = true,
    onMessage,
    onOpen,
    onClose,
    onError,
    initialData = null,
    messageHistorySize = 0,
    ...wsOptions
  } = options;

  // Create WebSocket instance
  const ws = createWebSocket(url, {
    ...wsOptions,
    autoConnect: false
  });

  // Additional reactive state for messages
  const lastMessage = pulse(initialData);
  const messages = pulse([]);

  // Race condition handling
  const versionController = createVersionedAsync();

  // Message handler with race condition protection
  const handleMessage = (data) => {
    const ctx = versionController.begin();
    ctx.ifCurrent(() => {
      batch(() => {
        lastMessage.set(data);

        if (messageHistorySize > 0) {
          messages.update(prev => {
            const next = [...prev, data];
            if (next.length > messageHistorySize) {
              return next.slice(-messageHistorySize);
            }
            return next;
          });
        }
      });

      onMessage?.(data);
    });
  };

  // Subscribe to events
  ws.on('message', handleMessage);
  ws.on('open', (e) => onOpen?.(e));
  ws.on('close', (e) => onClose?.(e));
  ws.on('error', (e) => onError?.(e));

  // Auto-cleanup on effect disposal
  onCleanup(() => {
    versionController.abort();
    ws.dispose();
  });

  // Connect if immediate
  if (immediate) {
    ws.connect();
  }

  return {
    // State
    connected: ws.connected,
    lastMessage,
    messages,
    error: ws.error,
    reconnecting: ws.reconnecting,
    state: ws.state,
    queuedCount: ws.queuedCount,
    reconnectAttempt: ws.reconnectAttempt,

    // Methods
    send: ws.send.bind(ws),
    sendJson: ws.sendJson.bind(ws),
    sendBinary: ws.sendBinary.bind(ws),
    connect: ws.connect.bind(ws),
    disconnect: ws.disconnect.bind(ws),

    // Underlying instance
    ws,

    // Convenience methods
    clearMessages() {
      messages.set([]);
    },

    clearError() {
      ws.error.set(null);
    }
  };
}

// ============================================================================
// Exports
// ============================================================================

export { MessageInterceptorManager };

export default {
  createWebSocket,
  useWebSocket,
  WebSocketError,
  MessageInterceptorManager
};
