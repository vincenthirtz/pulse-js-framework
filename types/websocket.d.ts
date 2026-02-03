/**
 * Pulse WebSocket TypeScript Definitions
 * @module pulse-js-framework/runtime/websocket
 */

import { Pulse } from './pulse';

// ============================================================================
// Error Types
// ============================================================================

/**
 * WebSocket error codes
 */
export type WebSocketErrorCode =
  | 'CONNECT_FAILED'
  | 'CLOSE'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'SEND_FAILED'
  | 'RECONNECT_EXHAUSTED'
  | 'WEBSOCKET_ERROR';

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'open' | 'closing' | 'closed';

/**
 * WebSocket Error with connection context
 */
export declare class WebSocketError extends Error {
  readonly name: 'WebSocketError';
  readonly code: WebSocketErrorCode;
  readonly url: string | null;
  readonly closeCode: number | null;
  readonly closeReason: string | null;
  readonly event: Event | null;
  readonly isWebSocketError: true;

  constructor(message: string, options?: {
    code?: WebSocketErrorCode;
    url?: string;
    closeCode?: number;
    closeReason?: string;
    context?: string;
    suggestion?: string;
    event?: Event;
  });

  static isWebSocketError(error: unknown): error is WebSocketError;

  isConnectFailed(): boolean;
  isClose(): boolean;
  isTimeout(): boolean;
  isParseError(): boolean;
  isSendFailed(): boolean;
}

// ============================================================================
// Interceptor Types
// ============================================================================

/**
 * Message interceptor handler
 */
export interface MessageInterceptorHandler {
  onMessage: (data: unknown) => unknown;
  onError?: (error: Error) => void;
}

/**
 * Message interceptor manager
 */
export declare class MessageInterceptorManager {
  /**
   * Add a message interceptor
   * @param onMessage Transform message data
   * @param onError Handle interceptor errors
   * @returns Interceptor ID for removal
   */
  use(onMessage: (data: unknown) => unknown, onError?: (error: Error) => void): number;

  /**
   * Remove an interceptor by ID
   */
  eject(id: number): void;

  /**
   * Remove all interceptors
   */
  clear(): void;

  /**
   * Number of registered interceptors
   */
  readonly size: number;

  [Symbol.iterator](): IterableIterator<MessageInterceptorHandler>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * WebSocket configuration options
 */
export interface WebSocketOptions {
  // Connection
  /** WebSocket subprotocols */
  protocols?: string[];
  /** Connection timeout in ms (default: 10000) */
  connectTimeout?: number;
  /** Connect immediately on creation (default: true) */
  autoConnect?: boolean;

  // Reconnection
  /** Enable auto-reconnection (default: true) */
  reconnect?: boolean;
  /** Max reconnection attempts, 0 = infinite (default: 5) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay between retries in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter factor for backoff randomization 0-1 (default: 0.3) */
  jitterFactor?: number;

  // Heartbeat
  /** Enable heartbeat/ping-pong (default: false) */
  heartbeat?: boolean;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Pong response timeout in ms (default: 10000) */
  heartbeatTimeout?: number;
  /** Message to send as heartbeat (default: 'ping') */
  heartbeatMessage?: unknown;
  /** Custom function to detect pong responses */
  isPong?: (message: unknown) => boolean;

  // Message handling
  /** Queue messages when disconnected (default: true) */
  queueWhileDisconnected?: boolean;
  /** Maximum queued messages (default: 100) */
  maxQueueSize?: number;
  /** Default message type (default: 'json') */
  messageType?: 'json' | 'text' | 'binary';
  /** Auto-parse JSON messages (default: true) */
  autoParseJson?: boolean;

  // Callbacks
  /** Called when connection opens */
  onOpen?: (event: Event) => void;
  /** Called when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Called on error */
  onError?: (error: WebSocketError) => void;
  /** Called on message received */
  onMessage?: (data: unknown, event: MessageEvent) => void;
  /** Called before each reconnection attempt */
  onReconnecting?: (attempt: number, delay: number) => void;
  /** Called after successful reconnection */
  onReconnected?: () => void;
}

// ============================================================================
// WebSocket Instance Types
// ============================================================================

/**
 * WebSocket instance returned by createWebSocket
 */
export interface WebSocketInstance {
  // Reactive state
  /** Connection state pulse */
  readonly state: Pulse<WebSocketState>;
  /** True when connected */
  readonly connected: Pulse<boolean>;
  /** True during reconnection attempts */
  readonly reconnecting: Pulse<boolean>;
  /** Current reconnection attempt number */
  readonly reconnectAttempt: Pulse<number>;
  /** Last error */
  readonly error: Pulse<WebSocketError | null>;
  /** Number of queued messages */
  readonly queuedCount: Pulse<number>;

  // Methods
  /** Manually connect (if autoConnect=false) */
  connect(): void;
  /** Close connection */
  disconnect(code?: number, reason?: string): void;
  /** Send a message (auto-serializes objects to JSON) */
  send(data: unknown): void;
  /** Send JSON message */
  sendJson(data: unknown): void;
  /** Send binary message */
  sendBinary(data: ArrayBuffer | ArrayBufferView | Blob): void;
  /** Clean up and close permanently */
  dispose(): void;

  // Interceptors
  readonly interceptors: {
    incoming: MessageInterceptorManager;
    outgoing: MessageInterceptorManager;
  };

  // Events
  /** Add event listener, returns unsubscribe function */
  on(event: 'open', handler: (event: Event) => void): () => void;
  on(event: 'close', handler: (event: CloseEvent) => void): () => void;
  on(event: 'error', handler: (error: WebSocketError) => void): () => void;
  on(event: 'message', handler: (data: unknown, event: MessageEvent) => void): () => void;
  /** Remove event listener */
  off(event: string, handler: Function): void;
  /** Add one-time listener */
  once(event: 'open', handler: (event: Event) => void): () => void;
  once(event: 'close', handler: (event: CloseEvent) => void): () => void;
  once(event: 'error', handler: (error: WebSocketError) => void): () => void;
  once(event: 'message', handler: (data: unknown, event: MessageEvent) => void): () => void;

  // Properties
  /** WebSocket URL */
  readonly url: string;
  /** Raw WebSocket instance */
  readonly socket: WebSocket | null;
  /** Merged options */
  readonly options: WebSocketOptions;
}

// ============================================================================
// useWebSocket Hook Types
// ============================================================================

/**
 * useWebSocket hook options
 */
export interface UseWebSocketOptions extends WebSocketOptions {
  /** Connect immediately (default: true) */
  immediate?: boolean;
  /** Initial lastMessage value (default: null) */
  initialData?: unknown;
  /** Keep last N messages, 0 = no history (default: 0) */
  messageHistorySize?: number;
}

/**
 * useWebSocket hook return type
 */
export interface UseWebSocketReturn {
  // State
  /** True when connected */
  connected: Pulse<boolean>;
  /** Most recent message */
  lastMessage: Pulse<unknown>;
  /** Message history (if messageHistorySize > 0) */
  messages: Pulse<unknown[]>;
  /** Last error */
  error: Pulse<WebSocketError | null>;
  /** True during reconnection */
  reconnecting: Pulse<boolean>;
  /** Connection state */
  state: Pulse<WebSocketState>;
  /** Number of queued messages */
  queuedCount: Pulse<number>;
  /** Current reconnection attempt */
  reconnectAttempt: Pulse<number>;

  // Methods
  /** Send a message */
  send(data: unknown): void;
  /** Send JSON message */
  sendJson(data: unknown): void;
  /** Send binary message */
  sendBinary(data: ArrayBuffer | ArrayBufferView | Blob): void;
  /** Manually connect */
  connect(): void;
  /** Close connection */
  disconnect(code?: number, reason?: string): void;
  /** Clear message history */
  clearMessages(): void;
  /** Clear error state */
  clearError(): void;

  /** Underlying WebSocket instance */
  readonly ws: WebSocketInstance;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a WebSocket client with auto-reconnection, heartbeat, and message queuing.
 *
 * @param url WebSocket URL (ws:// or wss://)
 * @param options Configuration options
 * @returns WebSocket instance with reactive state and controls
 *
 * @example
 * const ws = createWebSocket('wss://api.example.com/ws', {
 *   reconnect: true,
 *   heartbeat: true
 * });
 *
 * ws.on('message', (data) => console.log('Received:', data));
 * ws.send({ type: 'subscribe', channel: 'updates' });
 */
export declare function createWebSocket(
  url: string,
  options?: WebSocketOptions
): WebSocketInstance;

/**
 * Reactive WebSocket hook with automatic cleanup.
 *
 * @param url WebSocket URL
 * @param options Configuration options
 * @returns Reactive WebSocket state and controls
 *
 * @example
 * const { connected, lastMessage, send } = useWebSocket('wss://api.example.com/ws');
 *
 * effect(() => {
 *   if (connected.get()) {
 *     send({ type: 'subscribe' });
 *   }
 * });
 */
export declare function useWebSocket(
  url: string,
  options?: UseWebSocketOptions
): UseWebSocketReturn;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createWebSocket: typeof createWebSocket;
  useWebSocket: typeof useWebSocket;
  WebSocketError: typeof WebSocketError;
  MessageInterceptorManager: typeof MessageInterceptorManager;
};

export default _default;
