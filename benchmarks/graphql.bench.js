/**
 * GraphQL Client Benchmarks - Pulse Framework
 *
 * Measures: cache key generation, operation name extraction, client creation
 *
 * @module benchmarks/graphql
 */

import { bench, suite } from './utils.js';

let graphqlModule, cacheModule;
try {
  graphqlModule = await import('../runtime/graphql.js');
  cacheModule = await import('../runtime/graphql/cache.js');
} catch {
  // GraphQL module not available
}

export async function runGraphQLBenchmarks() {
  if (!graphqlModule || !cacheModule) {
    return { name: 'GraphQL', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  const { createGraphQLClient, GraphQLError } = graphqlModule;
  const { generateCacheKey, extractOperationName } = cacheModule;

  // Sample queries for benchmarks
  const queries = [
    'query GetUser { user(id: 1) { id name email } }',
    'query GetUsers($limit: Int!) { users(limit: $limit) { id name email roles { name } } }',
    'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
    'query GetPosts($userId: ID!, $page: Int, $limit: Int) { posts(userId: $userId, page: $page, limit: $limit) { id title body author { name } comments { id text } } }',
    '{ viewer { id name avatar followers(first: 10) { edges { node { id name } } } } }'
  ];

  return await suite('GraphQL', [
    // Cache key generation
    bench('generateCacheKey() (1000x)', () => {
      for (let i = 0; i < 1000; i++) {
        const q = queries[i % queries.length];
        generateCacheKey(q, { id: i, limit: 20 });
      }
    }),

    // Operation name extraction
    bench('extractOperationName() (1000x)', () => {
      for (let i = 0; i < 1000; i++) {
        extractOperationName(queries[i % queries.length]);
      }
    }),

    // Client creation
    bench('createGraphQLClient() (200x)', () => {
      for (let i = 0; i < 200; i++) {
        createGraphQLClient({
          url: 'https://api.example.com/graphql',
          headers: { 'Authorization': `Bearer token-${i}` }
        });
      }
    }),

    // GraphQLError creation and methods
    bench('GraphQLError methods (1000x)', () => {
      const errors = [
        new GraphQLError('Auth error', { errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHENTICATED' } }] }),
        new GraphQLError('Validation', { errors: [{ message: 'Invalid input', extensions: { code: 'BAD_USER_INPUT' } }] }),
        new GraphQLError('Not found', { errors: [{ message: 'Not found' }] })
      ];
      for (let i = 0; i < 1000; i++) {
        const err = errors[i % errors.length];
        err.isAuthenticationError();
        err.isValidationError();
        err.hasPartialData();
        err.getFirstError();
        err.getAllErrors();
      }
    }),

    // Cache key generation with complex variables
    bench('generateCacheKey() complex vars (500x)', () => {
      const complexVars = {
        filter: { status: 'active', tags: ['js', 'react', 'pulse'], dateRange: { start: '2024-01-01', end: '2024-12-31' } },
        pagination: { page: 1, limit: 20, cursor: 'abc123' },
        sort: { field: 'createdAt', order: 'DESC' }
      };
      for (let i = 0; i < 500; i++) {
        generateCacheKey(queries[3], complexVars);
      }
    })
  ]);
}
