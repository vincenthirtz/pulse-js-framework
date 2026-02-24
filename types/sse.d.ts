/**
 * Pulse SSE (Server-Sent Events) Type Definitions
 * @module pulse-js-framework/runtime/sse
 */

import { Pulse } from './pulse';

// ============================================================================
// SSE Connection State
// ============================================================================

/** SSE connection state */
export type SSEState = 'connecting' | 'open' | 'closed';

// ============================================================================
// SSE Error
// ============================================================================

/** SSE error code */
export type SSEErrorCode =
  | 'CONNECT_FAILED'
  | 'TIMEOUT'
  | 'MAX_RETRIES'
  | 'CLOSED'
  | 'UNKNOWN';

/**
 * SSE-specific error with structured codes
 */
export declare class SSEError extends Error {
  readonly name: 'SSEError';
  readonly sseCode: SSEErrorCode;

  constructor(message: string, options?: {
    sseCode?: SSEErrorCode;
    suggestion?: string;
  });

  /** Check if an error is an SSEError */
  static isSSEError(error: unknown): error is SSEError;

  /** Check if this is a connection failure */
  isConnectFailed(): boolean;

  /** Check if this is a timeout error */
  isTimeout(): boolean;

  /** Check if max retries were exhausted */
  isMaxRetries(): boolean;

  /** Check if connection was closed */
  isClosed(): boolean;
}

// ============================================================================
// createSSE Options
// ============================================================================

/** Event handler for SSE messages */
export type SSEMessageHandler = (data: unknown, event: MessageEvent) => void;

/** Options for createSSE */
export interface CreateSSEOptions {
  /** Include credentials in the request (default: false) */
  withCredentials?: boolean;

  /** Enable auto-reconnect on connection loss (default: true) */
  reconnect?: boolean;

  /** Maximum number of reconnection attempts (default: 5) */
  maxRetries?: number;

  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;

  /** Maximum delay between reconnection attempts in ms (default: 30000) */
  maxDelay?: number;

  /** Event types to listen for (default: ['message']) */
  events?: string[];

  /** Auto-parse JSON message data (default: true) */
  parseJSON?: boolean;

  /** Connect immediately on creation (default: true) */
  immediate?: boolean;

  /** Callback invoked on each message */
  onMessage?: SSEMessageHandler | null;

  /** Callback invoked when connection opens */
  onOpen?: (() => void) | null;

  /** Callback invoked on error */
  onError?: ((error: SSEError) => void) | null;
}

// ============================================================================
// createSSE Return Type
// ============================================================================

/** Return type of createSSE */
export interface SSEInstance {
  /** Reactive connection state ('connecting' | 'open' | 'closed') */
  state: Pulse<SSEState>;

  /** Reactive connected flag (true when state is 'open') */
  connected: Pulse<boolean>;

  /** Reactive reconnecting state */
  reconnecting: Pulse<boolean>;

  /** Reactive current reconnection attempt number */
  reconnectAttempt: Pulse<number>;

  /** Reactive last error */
  error: Pulse<SSEError | null>;

  /** Reactive last event ID from the server */
  lastEventId: Pulse<string | null>;

  /** Manually initiate a connection (resets reconnection state) */
  connect(): void;

  /** Close the connection and stop reconnecting */
  close(): void;

  /** Add an event listener for a specific event type */
  addEventListener(event: string, handler: SSEMessageHandler): void;

  /** Remove an event listener */
  removeEventListener(event: string, handler: SSEMessageHandler): void;

  /** Permanently dispose the SSE instance and clean up all resources */
  dispose(): void;

  /** Alias for addEventListener */
  on(event: string, handler: SSEMessageHandler): void;

  /** Alias for removeEventListener */
  off(event: string, handler: SSEMessageHandler): void;
}

/**
 * Create a low-level SSE connection with auto-reconnect and exponential backoff.
 *
 * @param url SSE endpoint URL
 * @param options Configuration options
 * @returns SSE instance with reactive state and control methods
 *
 * @example
 * const sse = createSSE('https://api.example.com/events', {
 *   reconnect: true,
 *   maxRetries: 5,
 *   events: ['message', 'update'],
 *   onMessage: (data) => console.log('Received:', data),
 * });
 *
 * sse.on('update', (data) => handleUpdate(data));
 * sse.close();
 */
export declare function createSSE(url: string, options?: CreateSSEOptions): SSEInstance;

// ============================================================================
// useSSE Options and Return Type
// ============================================================================

/** Options for useSSE hook */
export interface UseSSEOptions extends CreateSSEOptions {
  /** Number of messages to keep in history (default: 0 = disabled) */
  messageHistorySize?: number;
}

/** Return type of useSSE (without message history) */
export interface UseSSEReturnBase {
  /** Reactive last received message data */
  data: Pulse<unknown>;

  /** Reactive connected flag */
  connected: Pulse<boolean>;

  /** Reactive last error */
  error: Pulse<SSEError | null>;

  /** Reactive reconnecting state */
  reconnecting: Pulse<boolean>;

  /** Reactive last event ID */
  lastEventId: Pulse<string | null>;

  /** Close the SSE connection */
  close(): void;

  /** Reconnect to the SSE endpoint */
  reconnect(): void;

  /** Underlying SSE instance */
  sse: SSEInstance;
}

/** Return type of useSSE (with message history) */
export interface UseSSEReturnWithHistory extends UseSSEReturnBase {
  /** Reactive message history array */
  messages: Pulse<unknown[]>;

  /** Clear the message history */
  clearMessages(): void;
}

/** Return type of useSSE */
export type UseSSEReturn = UseSSEReturnBase | UseSSEReturnWithHistory;

/**
 * Reactive SSE hook with automatic lifecycle management.
 * Automatically disposes the connection when the enclosing effect is cleaned up.
 *
 * @param url SSE endpoint URL
 * @param options Configuration options
 * @returns Reactive SSE state and control methods
 *
 * @example
 * const { data, connected, error, close } = useSSE(
 *   'https://api.example.com/stream',
 *   {
 *     parseJSON: true,
 *     messageHistorySize: 50,
 *     onMessage: (data) => console.log('New event:', data),
 *   }
 * );
 *
 * effect(() => {
 *   if (connected.get()) console.log('SSE connected');
 *   if (data.get()) console.log('Latest:', data.get());
 * });
 */
export declare function useSSE(url: string, options?: UseSSEOptions): UseSSEReturn;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createSSE: typeof createSSE;
  useSSE: typeof useSSE;
  SSEError: typeof SSEError;
};

export default _default;
