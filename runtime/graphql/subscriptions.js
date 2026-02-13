/**
 * Pulse GraphQL - WebSocket Subscriptions
 *
 * Handles GraphQL subscriptions using the graphql-ws protocol
 *
 * @module pulse-js-framework/runtime/graphql/subscriptions
 */

import { pulse, effect, onCleanup } from '../pulse.js';
import { createWebSocket, WebSocketError } from '../websocket.js';
import { ClientError } from '../errors.js';
import { extractOperationName } from './cache.js';
import { GraphQLError } from './client.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * graphql-ws protocol message types
 * @see https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 */
export const MessageType = {
  // Client -> Server
  ConnectionInit: 'connection_init',
  Subscribe: 'subscribe',
  Complete: 'complete',
  Ping: 'ping',
  Pong: 'pong',

  // Server -> Client
  ConnectionAck: 'connection_ack',
  Next: 'next',
  Error: 'error'
  // Complete is bidirectional
};

// ============================================================================
// Subscription Manager
// ============================================================================

/**
 * Manages GraphQL subscriptions over WebSocket
 */
export class SubscriptionManager {
  #ws = null;
  #subscriptions = new Map();
  #nextId = 1;
  #connectionParams;
  #connected = pulse(false);
  #pending = [];

  /**
   * @param {Object} ws - WebSocket instance from createWebSocket
   * @param {Object|Function} [connectionParams] - Connection parameters
   */
  constructor(ws, connectionParams) {
    this.#ws = ws;
    this.#connectionParams = connectionParams;

    // Handle incoming messages
    ws.on('message', (msg) => this.#handleMessage(msg));
    ws.on('open', () => this.#handleOpen());
    ws.on('close', () => this.#handleClose());
    ws.on('error', (err) => this.#handleError(err));
  }

  /**
   * Get connection state
   */
  get connected() {
    return this.#connected;
  }

  /**
   * Handle WebSocket open
   */
  async #handleOpen() {
    // Send connection_init
    const params = typeof this.#connectionParams === 'function'
      ? await this.#connectionParams()
      : this.#connectionParams;

    this.#ws.send({
      type: MessageType.ConnectionInit,
      payload: params || {}
    });
  }

  /**
   * Handle WebSocket close
   */
  #handleClose() {
    this.#connected.set(false);
    // Notify all active subscriptions
    for (const [id, sub] of this.#subscriptions) {
      sub.handlers.onError?.(new GraphQLError('Connection closed', {
        code: 'SUBSCRIPTION_ERROR'
      }));
    }
  }

  /**
   * Handle WebSocket error
   */
  #handleError(error) {
    for (const [id, sub] of this.#subscriptions) {
      sub.handlers.onError?.(new GraphQLError(error.message || 'WebSocket error', {
        code: 'SUBSCRIPTION_ERROR'
      }));
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param {Object} message - Parsed message
   */
  #handleMessage(message) {
    const { id, type, payload } = message;

    switch (type) {
      case MessageType.ConnectionAck:
        this.#connected.set(true);
        // Send any pending subscriptions
        for (const pending of this.#pending) {
          this.#ws.send(pending);
        }
        this.#pending = [];
        break;

      case MessageType.Next: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onData?.(payload.data);
        }
        break;
      }

      case MessageType.Error: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onError?.(new GraphQLError('Subscription error', {
            code: 'SUBSCRIPTION_ERROR',
            errors: Array.isArray(payload) ? payload : [payload]
          }));
        }
        break;
      }

      case MessageType.Complete: {
        const sub = this.#subscriptions.get(id);
        if (sub) {
          sub.handlers.onComplete?.();
          this.#subscriptions.delete(id);
        }
        break;
      }

      case MessageType.Ping:
        this.#ws.send({ type: MessageType.Pong });
        break;
    }
  }

  /**
   * Subscribe to a GraphQL subscription
   * @param {string} query - GraphQL subscription query
   * @param {Object} [variables] - Subscription variables
   * @param {Object} handlers - Event handlers
   * @returns {Function} Unsubscribe function
   */
  subscribe(query, variables, handlers) {
    const id = String(this.#nextId++);

    const message = {
      id,
      type: MessageType.Subscribe,
      payload: {
        query,
        variables,
        operationName: extractOperationName(query)
      }
    };

    // Store subscription
    this.#subscriptions.set(id, {
      query,
      variables,
      handlers
    });

    // Send or queue the subscription message
    if (this.#connected.get()) {
      this.#ws.send(message);
    } else {
      this.#pending.push(message);
      // Ensure WebSocket is connecting
      if (this.#ws.state.get() === 'closed') {
        this.#ws.connect();
      }
    }

    // Return unsubscribe function
    return () => {
      if (this.#subscriptions.has(id)) {
        this.#subscriptions.delete(id);
        if (this.#connected.get()) {
          this.#ws.send({ id, type: MessageType.Complete });
        }
      }
    };
  }

  /**
   * Get active subscription count
   * @returns {number}
   */
  get activeCount() {
    return this.#subscriptions.size;
  }

  /**
   * Close all subscriptions
   */
  closeAll() {
    for (const id of this.#subscriptions.keys()) {
      if (this.#connected.get()) {
        this.#ws.send({ id, type: MessageType.Complete });
      }
    }
    this.#subscriptions.clear();
  }

  /**
   * Dispose the subscription manager
   */
  dispose() {
    this.closeAll();
    this.#ws.dispose();
  }
}


