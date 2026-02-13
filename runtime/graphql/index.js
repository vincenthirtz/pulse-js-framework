/**
 * Pulse GraphQL - Main Entry Point
 *
 * Barrel export for all GraphQL modules
 *
 * @module pulse-js-framework/runtime/graphql
 */

// Re-export InterceptorManager for backward compatibility
export { InterceptorManager } from '../interceptor-manager.js';

// Export all from sub-modules
export * from './client.js';
export * from './cache.js';
export * from './subscriptions.js';
export * from './hooks.js';

// Re-export main classes and functions for convenience
export {
  GraphQLError,
  GraphQLClient,
  createGraphQLClient,
  setDefaultClient,
  getDefaultClient
} from './client.js';

export {
  generateCacheKey,
  extractOperationName
} from './cache.js';

export {
  MessageType,
  SubscriptionManager
} from './subscriptions.js';

export {
  useQuery,
  useMutation,
  useSubscription
} from './hooks.js';

// Default export for backward compatibility
import { GraphQLError as _GQLError, GraphQLClient as _GQLClient, createGraphQLClient as _createGQL, setDefaultClient as _setDefault, getDefaultClient as _getDefault } from './client.js';
import { generateCacheKey as _genKey, extractOperationName as _extractOp } from './cache.js';
import { MessageType as _MsgType, SubscriptionManager as _SubMgr } from './subscriptions.js';
import { useQuery as _useQ, useMutation as _useM, useSubscription as _useS } from './hooks.js';

export default {
  GraphQLError: _GQLError,
  GraphQLClient: _GQLClient,
  createGraphQLClient: _createGQL,
  setDefaultClient: _setDefault,
  getDefaultClient: _getDefault,
  generateCacheKey: _genKey,
  extractOperationName: _extractOp,
  MessageType: _MsgType,
  SubscriptionManager: _SubMgr,
  useQuery: _useQ,
  useMutation: _useM,
  useSubscription: _useS
};
