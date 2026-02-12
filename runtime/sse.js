/**
 * Pulse SSE (Server-Sent Events) Module
 * Reactive SSE connections with auto-reconnect and exponential backoff.
 *
 * @module pulse-js-framework/runtime/sse
 */

import { pulse, computed, effect, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { RuntimeError } from './errors.js';

const log = loggers.websocket;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS = {
  withCredentials: false,
  reconnect: true,
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  events: ['message'],
  parseJSON: true,
  immediate: true,
  onMessage: null,
  onOpen: null,
  onError: null,
};

// =============================================================================
// SSE ERROR
// =============================================================================

/**
 * SSE-specific error with structured codes
 */
export class SSEError extends RuntimeError {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {string} [options.sseCode] - SSE error code
   */
  constructor(message, options = {}) {
    super(message, { code: 'SSE_ERROR', ...options });
    this.name = 'SSEError';
    this.sseCode = options.sseCode ?? 'UNKNOWN';
  }

  static isSSEError(error) {
    return error instanceof SSEError;
  }

  isConnectFailed() { return this.sseCode === 'CONNECT_FAILED'; }
  isTimeout() { return this.sseCode === 'TIMEOUT'; }
  isMaxRetries() { return this.sseCode === 'MAX_RETRIES'; }
  isClosed() { return this.sseCode === 'CLOSED'; }
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function _validateUrl(url) {
  if (typeof url !== 'string' || url.length === 0) {
    throw new SSEError('SSE URL must be a non-empty string', {
      sseCode: 'CONNECT_FAILED',
      suggestion: 'Provide a valid URL string to createSSE() or useSSE()',
    });
  }
}

function _computeDelay(attempt, baseDelay, maxDelay) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter: ±25%
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(delay + jitter));
}

// =============================================================================
// LOW-LEVEL: createSSE
// =============================================================================

/**
 * Create a low-level SSE connection with auto-reconnect
 *
 * @param {string} url - SSE endpoint URL
 * @param {Object} [options] - Configuration options
 * @returns {Object} SSE instance with reactive state and control methods
 */
export function createSSE(url, options = {}) {
  _validateUrl(url);

  const config = { ...DEFAULT_OPTIONS, ...options };

  // Reactive state
  const state = pulse('closed');
  const connected = computed(() => state.get() === 'open');
  const reconnecting = pulse(false);
  const reconnectAttempt = pulse(0);
  const error = pulse(null);
  const lastEventId = pulse(null);

  // Internal state
  let eventSource = null;
  let reconnectTimer = null;
  let disposed = false;
  const listeners = new Map(); // event -> Set<handler>

  function _clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function _scheduleReconnect() {
    if (disposed || !config.reconnect) return;

    const attempt = reconnectAttempt.get();
    if (attempt >= config.maxRetries) {
      const err = new SSEError(
        `Max reconnection attempts (${config.maxRetries}) exhausted`,
        { sseCode: 'MAX_RETRIES' }
      );
      error.set(err);
      reconnecting.set(false);
      log.warn('SSE max retries reached for', url);
      return;
    }

    reconnecting.set(true);
    const delay = _computeDelay(attempt, config.baseDelay, config.maxDelay);
    log.debug(`SSE reconnecting in ${delay}ms (attempt ${attempt + 1})`);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectAttempt.set(attempt + 1);
      _connect();
    }, delay);
  }

  function _connect() {
    if (disposed) return;
    if (typeof EventSource === 'undefined') {
      log.warn('EventSource not available in this environment');
      error.set(new SSEError('EventSource API not available', {
        sseCode: 'CONNECT_FAILED',
        suggestion: 'SSE requires a browser environment with EventSource support',
      }));
      return;
    }

    // Close existing connection
    _closeSource();

    state.set('connecting');
    error.set(null);

    try {
      eventSource = new EventSource(url, {
        withCredentials: config.withCredentials,
      });

      eventSource.onopen = () => {
        if (disposed) return;
        state.set('open');
        reconnecting.set(false);
        reconnectAttempt.set(0);
        error.set(null);
        log.info('SSE connected to', url);
        config.onOpen?.();
      };

      eventSource.onerror = () => {
        if (disposed) return;

        const wasConnected = connected.get();
        state.set('closed');

        // EventSource auto-reconnects by default, but we manage it ourselves
        // to have control over backoff and retries
        _closeSource();

        if (wasConnected) {
          const err = new SSEError('SSE connection lost', { sseCode: 'CONNECT_FAILED' });
          error.set(err);
          config.onError?.(err);
          log.warn('SSE connection lost for', url);
        }

        _scheduleReconnect();
      };

      // Register event listeners
      for (const eventName of config.events) {
        eventSource.addEventListener(eventName, _handleEvent);
      }
    } catch (e) {
      state.set('closed');
      const err = new SSEError(`Failed to create SSE connection: ${e.message}`, {
        sseCode: 'CONNECT_FAILED',
      });
      error.set(err);
      config.onError?.(err);
    }
  }

  function _handleEvent(event) {
    if (disposed) return;

    if (event.lastEventId) {
      lastEventId.set(event.lastEventId);
    }

    let data = event.data;
    if (config.parseJSON) {
      try {
        data = JSON.parse(data);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    config.onMessage?.(data, event);

    // Notify registered listeners
    const handlers = listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data, event);
        } catch (e) {
          log.error('SSE event handler error:', e);
        }
      }
    }
  }

  function _closeSource() {
    if (eventSource) {
      for (const eventName of config.events) {
        eventSource.removeEventListener(eventName, _handleEvent);
      }
      eventSource.close();
      eventSource = null;
    }
  }

  // Public methods
  function connect() {
    if (disposed) return;
    _clearReconnectTimer();
    reconnectAttempt.set(0);
    reconnecting.set(false);
    _connect();
  }

  function close() {
    _clearReconnectTimer();
    reconnecting.set(false);
    _closeSource();
    state.set('closed');
  }

  function addEventListener(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);

    // Also add to native EventSource if connected
    if (eventSource && !config.events.includes(event)) {
      eventSource.addEventListener(event, _handleEvent);
    }
  }

  function removeEventListener(event, handler) {
    const handlers = listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(event);
      }
    }
  }

  function dispose() {
    disposed = true;
    close();
    listeners.clear();
  }

  // Auto-connect if immediate
  if (config.immediate) {
    _connect();
  }

  return {
    // Reactive state
    state,
    connected,
    reconnecting,
    reconnectAttempt,
    error,
    lastEventId,

    // Methods
    connect,
    close,
    addEventListener,
    removeEventListener,
    dispose,

    // Aliases
    on: addEventListener,
    off: removeEventListener,
  };
}

// =============================================================================
// HIGH-LEVEL HOOK: useSSE
// =============================================================================

/**
 * Reactive SSE hook with automatic lifecycle management
 *
 * @param {string} url - SSE endpoint URL
 * @param {Object} [options] - Configuration options
 * @returns {Object} Reactive SSE state and control methods
 */
export function useSSE(url, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const data = pulse(null);
  const messageHistory = config.messageHistorySize > 0 ? pulse([]) : null;

  const sse = createSSE(url, {
    ...config,
    onMessage: (eventData, event) => {
      data.set(eventData);

      if (messageHistory && config.messageHistorySize > 0) {
        messageHistory.update(history => {
          const next = [...history, eventData];
          if (next.length > config.messageHistorySize) {
            return next.slice(next.length - config.messageHistorySize);
          }
          return next;
        });
      }

      config.onMessage?.(eventData, event);
    },
    onOpen: () => config.onOpen?.(),
    onError: (err) => config.onError?.(err),
  });

  // Cleanup on effect disposal
  onCleanup(() => sse.dispose());

  const result = {
    data,
    connected: sse.connected,
    error: sse.error,
    reconnecting: sse.reconnecting,
    lastEventId: sse.lastEventId,

    close: () => sse.close(),
    reconnect: () => sse.connect(),

    // Underlying instance
    sse,
  };

  if (messageHistory) {
    result.messages = messageHistory;
    result.clearMessages = () => messageHistory.set([]);
  }

  return result;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  createSSE,
  useSSE,
  SSEError,
};
