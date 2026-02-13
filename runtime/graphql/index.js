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
