/**
 * Pulse GraphQL - Backward Compatibility Export
 *
 * This file maintains backward compatibility by re-exporting from graphql/
 * The actual implementation has been split into focused sub-modules:
 *   - graphql/client.js - Core client and error handling
 *   - graphql/cache.js - Query caching utilities  
 *   - graphql/subscriptions.js - WebSocket subscriptions
 *   - graphql/hooks.js - useQuery, useMutation, useSubscription
 *
 * @deprecated Import from 'pulse-js-framework/runtime/graphql/index.js' instead
 * @module pulse-js-framework/runtime/graphql
 */

export * from './graphql/index.js';
