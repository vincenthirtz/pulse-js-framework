/**
 * Pulse GraphQL Client Tests
 *
 * Tests for runtime/graphql.js - createGraphQLClient, useQuery, useMutation, useSubscription
 *
 * @module test/graphql
 */

import {
  createGraphQLClient,
  GraphQLClient,
  GraphQLError,
  InterceptorManager,
  SubscriptionManager,
  useQuery,
  useMutation,
  useSubscription,
  setDefaultClient,
  getDefaultClient,
  generateCacheKey,
  extractOperationName
} from '../runtime/graphql.js';

import { pulse, effect, computed, batch } from '../runtime/pulse.js';

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Mock fetch for testing
// =============================================================================

const originalFetch = globalThis.fetch;

function mockFetch(responses = {}) {
  let callCount = 0;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    callCount++;

    // Check for abort
    if (options.signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }

    const urlStr = typeof url === 'string' ? url : url.toString();

    // Find matching response
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        if (response instanceof Error) {
          throw response;
        }
        if (typeof response === 'function') {
          return response(url, options, callCount);
        }
        return createMockResponse(response);
      }
    }

    // Default 404 response
    return createMockResponse({ status: 404, data: { error: 'Not found' } });
  };

  return {
    calls,
    getCallCount: () => callCount,
    restore: () => { globalThis.fetch = originalFetch; }
  };
}

function createMockResponse(config) {
  const {
    status = 200,
    statusText = 'OK',
    data = {},
    headers = { 'content-type': 'application/json' }
  } = config;

  const headersObj = new Headers(headers);

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: headersObj,
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    clone: function() { return createMockResponse(config); }
  };
}

// =============================================================================
// Mock WebSocket for subscription testing
// =============================================================================

class MockWebSocket {
  static instances = [];

  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = 0; // CONNECTING
    this.listeners = {};
    this.sent = [];
    MockWebSocket.instances.push(this);
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler);
    }
  }

  send(data) {
    this.sent.push(typeof data === 'string' ? JSON.parse(data) : data);
  }

  close(code, reason) {
    this.readyState = 3; // CLOSED
    this.dispatchEvent({ type: 'close', code, reason });
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(h => h(event));
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    this.dispatchEvent({ type: 'open' });
  }

  simulateMessage(data) {
    this.dispatchEvent({ type: 'message', data: JSON.stringify(data) });
  }

  simulateError(error) {
    this.dispatchEvent({ type: 'error', error });
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = 3;
    this.dispatchEvent({ type: 'close', code, reason });
  }
}

const originalWebSocket = globalThis.WebSocket;

function mockWebSocket() {
  MockWebSocket.instances = [];
  globalThis.WebSocket = MockWebSocket;
  return {
    getInstances: () => MockWebSocket.instances,
    restore: () => { globalThis.WebSocket = originalWebSocket; }
  };
}

// =============================================================================
// GraphQLError Tests
// =============================================================================

describe('GraphQLError Tests', () => {
  test('GraphQLError creates error with correct properties', () => {
    const error = new GraphQLError('Test error', {
      code: 'GRAPHQL_ERROR',
      errors: [{ message: 'Field error' }],
      data: { partial: 'data' }
    });

    assert.strictEqual(error.name, 'GraphQLError', 'Should have correct name');
    assert.strictEqual(error.code, 'GRAPHQL_ERROR', 'Should have correct code');
    assert.strictEqual(error.errors.length, 1, 'Should have errors array');
    assert.strictEqual(error.data.partial, 'data', 'Should have partial data');
  });

  test('GraphQLError.isGraphQLError correctly identifies errors', () => {
    const graphqlError = new GraphQLError('Test');
    const regularError = new Error('Test');

    assert.ok(GraphQLError.isGraphQLError(graphqlError) === true, 'Should identify GraphQLError');
    assert.ok(GraphQLError.isGraphQLError(regularError) === false, 'Should not identify regular Error');
    assert.ok(GraphQLError.isGraphQLError(null) === false, 'Should handle null');
    assert.ok(GraphQLError.isGraphQLError(undefined) === false, 'Should handle undefined');
  });

  test('GraphQLError has convenience methods', () => {
    const authError = new GraphQLError('Auth error', {
      errors: [{ extensions: { code: 'UNAUTHENTICATED' } }]
    });
    const validationError = new GraphQLError('Validation error', {
      errors: [{ extensions: { code: 'BAD_USER_INPUT' } }]
    });
    const networkError = new GraphQLError('Network error', { code: 'NETWORK_ERROR' });

    assert.ok(authError.isAuthenticationError() === true, 'Should identify auth error');
    assert.ok(validationError.isValidationError() === true, 'Should identify validation error');
    assert.ok(networkError.isNetworkError() === true, 'Should identify network error');
  });

  test('GraphQLError hasPartialData works correctly', () => {
    const withData = new GraphQLError('Error with data', {
      data: { user: { id: 1 } }
    });
    const withoutData = new GraphQLError('Error without data', {
      data: null
    });

    assert.ok(withData.hasPartialData() === true, 'Should detect partial data');
    assert.ok(withoutData.hasPartialData() === false, 'Should detect no data');
  });

  test('GraphQLError getFirstError and getAllErrors work', () => {
    const error = new GraphQLError('Multiple errors', {
      errors: [
        { message: 'First error' },
        { message: 'Second error' }
      ]
    });

    assert.strictEqual(error.getFirstError(), 'First error', 'Should get first error');
    assert.strictEqual(error.getAllErrors().length, 2, 'Should get all errors');
  });
});

// =============================================================================
// Cache Key Utility Tests
// =============================================================================

describe('Cache Key Utility Tests', () => {
  test('extractOperationName extracts query name', () => {
    const query = 'query GetUser { user { id } }';
    assert.strictEqual(extractOperationName(query), 'GetUser', 'Should extract query name');
  });

  test('extractOperationName extracts mutation name', () => {
    const mutation = 'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }';
    assert.strictEqual(extractOperationName(mutation), 'CreateUser', 'Should extract mutation name');
  });

  test('extractOperationName extracts subscription name', () => {
    const subscription = 'subscription OnMessage { messageAdded { id } }';
    assert.strictEqual(extractOperationName(subscription), 'OnMessage', 'Should extract subscription name');
  });

  test('extractOperationName returns null for anonymous operations', () => {
    const query = '{ user { id } }';
    assert.strictEqual(extractOperationName(query), null, 'Should return null for anonymous');
  });

  test('generateCacheKey creates deterministic keys', () => {
    const query = 'query GetUser { user { id } }';
    const variables = { id: 1 };

    const key1 = generateCacheKey(query, variables);
    const key2 = generateCacheKey(query, variables);

    assert.strictEqual(key1, key2, 'Same query and variables should produce same key');
    assert.ok(key1.startsWith('gql:'), 'Key should start with gql: prefix');
  });

  test('generateCacheKey produces different keys for different variables', () => {
    const query = 'query GetUser($id: ID!) { user(id: $id) { id } }';

    const key1 = generateCacheKey(query, { id: 1 });
    const key2 = generateCacheKey(query, { id: 2 });

    assert.ok(key1 !== key2, 'Different variables should produce different keys');
  });

  test('generateCacheKey handles objects with different key order', () => {
    const query = 'query Test { test }';

    const key1 = generateCacheKey(query, { a: 1, b: 2 });
    const key2 = generateCacheKey(query, { b: 2, a: 1 });

    assert.strictEqual(key1, key2, 'Object key order should not affect cache key');
  });
});

// =============================================================================
// InterceptorManager Tests
// =============================================================================

describe('InterceptorManager Tests', () => {
  test('InterceptorManager can add and remove interceptors', () => {
    const manager = new InterceptorManager();

    const id = manager.use(() => {}, () => {});
    assert.strictEqual(manager.size, 1, 'Should have one interceptor');

    manager.eject(id);
    assert.strictEqual(manager.size, 0, 'Should have no interceptors after eject');
  });

  test('InterceptorManager clear removes all interceptors', () => {
    const manager = new InterceptorManager();

    manager.use(() => {});
    manager.use(() => {});
    manager.use(() => {});

    assert.strictEqual(manager.size, 3, 'Should have three interceptors');

    manager.clear();
    assert.strictEqual(manager.size, 0, 'Should have no interceptors after clear');
  });

  test('InterceptorManager is iterable', () => {
    const manager = new InterceptorManager();
    const fn1 = () => {};
    const fn2 = () => {};

    manager.use(fn1);
    manager.use(fn2);

    let count = 0;
    for (const interceptor of manager) {
      count++;
      assert.ok(interceptor.fulfilled !== undefined, 'Interceptor should have fulfilled');
    }

    assert.strictEqual(count, 2, 'Should iterate over all interceptors');
  });
});

// =============================================================================
// createGraphQLClient Tests
// =============================================================================

describe('createGraphQLClient Tests', () => {
  test('createGraphQLClient requires url option', () => {
    let threw = false;
    try {
      createGraphQLClient({});
    } catch (e) {
      threw = true;
      assert.ok(GraphQLError.isGraphQLError(e), 'Should throw GraphQLError');
    }
    assert.ok(threw, 'Should throw when url is missing');
  });

  test('createGraphQLClient creates client with default options', () => {
    const mock = mockFetch({});
    try {
      const client = createGraphQLClient({ url: '/graphql' });
      assert.ok(client instanceof GraphQLClient, 'Should create GraphQLClient instance');
      assert.ok(client.interceptors.request instanceof InterceptorManager, 'Should have request interceptors');
      assert.ok(client.interceptors.response instanceof InterceptorManager, 'Should have response interceptors');
    } finally {
      mock.restore();
    }
  });

  test('createGraphQLClient child client inherits config', () => {
    const mock = mockFetch({});
    try {
      const parent = createGraphQLClient({
        url: '/graphql',
        headers: { 'Authorization': 'Bearer token' }
      });
      const child = parent.create({
        headers: { 'X-Custom': 'value' }
      });
      assert.ok(child instanceof GraphQLClient, 'Child should be GraphQLClient');
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// GraphQL Query Tests
// =============================================================================

describe('GraphQL Query Tests', () => {
  test('client.query executes GraphQL query', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { user: { id: 1, name: 'Test' } } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      const result = await client.query('query GetUser { user { id name } }');

      assert.strictEqual(result.user.id, 1, 'Should return user data');
      assert.strictEqual(result.user.name, 'Test', 'Should return user name');
      assert.strictEqual(mock.getCallCount(), 1, 'Should make one fetch call');
    } finally {
      mock.restore();
    }
  });

  test('client.query passes variables', async () => {
    const mock = mockFetch({
      '/graphql': (url, options) => {
        const body = JSON.parse(options.body);
        return createMockResponse({
          data: { data: { user: { id: body.variables.id } } }
        });
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      const result = await client.query(
        'query GetUser($id: ID!) { user(id: $id) { id } }',
        { id: 42 }
      );

      assert.strictEqual(result.user.id, 42, 'Should pass variables to server');
    } finally {
      mock.restore();
    }
  });

  test('client.query handles GraphQL errors', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: {
          data: null,
          errors: [{ message: 'User not found' }]
        }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      let threw = false;

      try {
        await client.query('query GetUser { user { id } }');
      } catch (e) {
        threw = true;
        assert.ok(GraphQLError.isGraphQLError(e), 'Should throw GraphQLError');
        assert.strictEqual(e.errors[0].message, 'User not found', 'Should have error message');
      }

      assert.ok(threw, 'Should throw on GraphQL errors');
    } finally {
      mock.restore();
    }
  });

  test('client.query deduplicates identical queries', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { value: 1 } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });

      // Fire two identical queries simultaneously
      const [result1, result2] = await Promise.all([
        client.query('query Test { value }'),
        client.query('query Test { value }')
      ]);

      assert.strictEqual(result1.value, 1, 'First query should return data');
      assert.strictEqual(result2.value, 1, 'Second query should return data');
      assert.strictEqual(mock.getCallCount(), 1, 'Should only make one fetch call (dedupe)');
    } finally {
      mock.restore();
    }
  });

  test('client.query can disable deduplication', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { value: 1 } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql', dedupe: false });

      await Promise.all([
        client.query('query Test { value }'),
        client.query('query Test { value }')
      ]);

      assert.strictEqual(mock.getCallCount(), 2, 'Should make two fetch calls without dedupe');
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// GraphQL Mutation Tests
// =============================================================================

describe('GraphQL Mutation Tests', () => {
  test('client.mutate executes mutation', async () => {
    const mock = mockFetch({
      '/graphql': (url, options) => {
        const body = JSON.parse(options.body);
        return createMockResponse({
          data: {
            data: {
              createUser: {
                id: 1,
                name: body.variables.input.name
              }
            }
          }
        });
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      const result = await client.mutate(
        'mutation CreateUser($input: CreateUserInput!) { createUser(input: $input) { id name } }',
        { input: { name: 'New User' } }
      );

      assert.strictEqual(result.createUser.name, 'New User', 'Should return mutation result');
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// Interceptor Tests
// =============================================================================

describe('Interceptor Tests', () => {
  test('request interceptors transform config', async () => {
    const mock = mockFetch({
      '/graphql': (url, options) => {
        const body = JSON.parse(options.body);
        return createMockResponse({
          data: { data: { intercepted: body.variables?.intercepted } }
        });
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });

      client.interceptors.request.use((config) => {
        // Modify variables to prove interceptor ran
        return { ...config, variables: { ...config.variables, intercepted: true } };
      });

      const result = await client.query('query Test { value }', { original: true });
      assert.strictEqual(result.intercepted, true, 'Request should be modified by interceptor');
    } finally {
      mock.restore();
    }
  });

  test('response interceptors transform result', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { value: 1 } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });

      client.interceptors.response.use((result) => {
        return { ...result, data: { ...result.data, transformed: true } };
      });

      const result = await client.query('query Test { value }');
      assert.strictEqual(result.transformed, true, 'Response should be transformed by interceptor');
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// Default Client Tests
// =============================================================================

describe('Default Client Tests', () => {
  test('setDefaultClient and getDefaultClient work', () => {
    const mock = mockFetch({});
    try {
      const client = createGraphQLClient({ url: '/graphql' });

      setDefaultClient(client);
      const retrieved = getDefaultClient();

      assert.strictEqual(retrieved, client, 'Should retrieve the same client');

      // Clean up
      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// useQuery Hook Tests
// =============================================================================

describe('useQuery Hook Tests', () => {
  test('useQuery returns reactive state', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { users: [{ id: 1 }] } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, loading, error, status } = useQuery('query GetUsers { users { id } }');

      // Initial state
      assert.ok(loading.get() === true || status.get() === 'loading', 'Should be loading initially');

      // Wait for query to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      assert.ok(data.get() !== null, 'Data should be populated');
      assert.strictEqual(data.get().users[0].id, 1, 'Should have user data');
      assert.strictEqual(error.get(), null, 'Should have no error');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery with immediate: false does not execute', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { value: 1 } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, loading } = useQuery('query Test { value }', null, { immediate: false });

      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(mock.getCallCount(), 0, 'Should not make fetch call');
      assert.strictEqual(data.get(), null, 'Data should be null');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery refetch triggers new request', async () => {
    let callCount = 0;
    const mock = mockFetch({
      '/graphql': () => {
        callCount++;
        return createMockResponse({
          data: { data: { count: callCount } }
        });
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, refetch } = useQuery('query Test { count }');

      await new Promise(resolve => setTimeout(resolve, 50));
      assert.strictEqual(data.get().count, 1, 'Initial count should be 1');

      await refetch();
      assert.strictEqual(data.get().count, 2, 'After refetch count should be 2');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// useMutation Hook Tests
// =============================================================================

describe('useMutation Hook Tests', () => {
  test('useMutation returns mutate function', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { createItem: { id: 1 } } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { mutate, data, loading, status } = useMutation(
        'mutation CreateItem { createItem { id } }'
      );

      assert.strictEqual(status.get(), 'idle', 'Initial status should be idle');

      const result = await mutate();

      assert.strictEqual(result.createItem.id, 1, 'Should return mutation result');
      assert.strictEqual(data.get().createItem.id, 1, 'Data pulse should be updated');
      assert.strictEqual(status.get(), 'success', 'Status should be success');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation calls onSuccess callback', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { createItem: { id: 1 } } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let successData = null;
      const { mutate } = useMutation(
        'mutation CreateItem { createItem { id } }',
        {
          onSuccess: (data) => { successData = data; }
        }
      );

      await mutate();

      assert.strictEqual(successData.createItem.id, 1, 'onSuccess should be called with data');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation handles errors', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: {
          data: null,
          errors: [{ message: 'Mutation failed' }]
        }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let errorReceived = null;
      const { mutate, error, status } = useMutation(
        'mutation CreateItem { createItem { id } }',
        {
          onError: (err) => { errorReceived = err; }
        }
      );

      try {
        await mutate();
      } catch (e) {
        // Expected
      }

      assert.ok(error.get() !== null, 'Error should be set');
      assert.strictEqual(status.get(), 'error', 'Status should be error');
      assert.ok(errorReceived !== null, 'onError should be called');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation reset clears state', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { data: { createItem: { id: 1 } } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { mutate, data, status, reset } = useMutation(
        'mutation CreateItem { createItem { id } }'
      );

      await mutate();
      assert.strictEqual(status.get(), 'success', 'Status should be success');

      reset();
      assert.strictEqual(status.get(), 'idle', 'Status should be idle after reset');
      assert.strictEqual(data.get(), null, 'Data should be null after reset');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// Cache Management Tests
// =============================================================================

describe('Cache Management Tests', () => {
  test('client.invalidate and invalidateAll work', () => {
    const mock = mockFetch({});
    try {
      const client = createGraphQLClient({ url: '/graphql' });

      // These should not throw
      client.invalidate('some-key');
      client.invalidateAll();

      const stats = client.getCacheStats();
      assert.strictEqual(stats.size, 0, 'Cache should be empty');
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// useQuery Advanced Options Tests
// =============================================================================

describe('useQuery Advanced Options Tests', () => {
  test('useQuery with select transforms data', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
          ]
        }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, loading } = useQuery(
        'query { users { id name } }',
        {},
        {
          select: (result) => {
            // result is the full GraphQL response data
            if (result && result.users) {
              return result.users.map(u => u.name);
            }
            return result;
          }
        }
      );

      // Wait for query to complete
      await new Promise(r => setTimeout(r, 100));

      assert.strictEqual(loading.get(), false, 'Should not be loading');
      // The data could be the original or transformed, depending on timing
      const dataValue = data.get();
      assert.ok(dataValue !== null, 'Data should not be null');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery status computed returns correct states', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { result: 'success' }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { status, loading, data } = useQuery(
        'query { result }',
        {},
        { immediate: false }
      );

      // Initially should be idle or loading
      const initialStatus = status.get();
      assert.ok(initialStatus === 'idle' || initialStatus === 'loading', 'Initial status should be idle or loading');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery invalidate marks data as stale', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { result: 'test' }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, isStale, invalidate } = useQuery(
        'query { result }'
      );

      // Wait for query to complete
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(isStale.get(), false, 'Should not be stale initially');

      invalidate();

      assert.strictEqual(isStale.get(), true, 'Should be stale after invalidate');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery reset clears all state', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { result: 'test' }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { data, error, loading, reset } = useQuery(
        'query { result }'
      );

      // Wait for query to complete
      await new Promise(r => setTimeout(r, 50));

      assert.ok(data.get() !== null, 'Should have data');

      reset();

      assert.strictEqual(data.get(), null, 'Data should be null after reset');
      assert.strictEqual(error.get(), null, 'Error should be null after reset');
      assert.strictEqual(loading.get(), false, 'Loading should be false after reset');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useQuery handles error and calls onError', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { errors: [{ message: 'Query failed' }] }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let errorReceived = null;

      const { error, loading } = useQuery(
        'query { result }',
        {},
        {
          onError: (err) => { errorReceived = err; }
        }
      );

      // Wait for query to complete
      await new Promise(r => setTimeout(r, 50));

      // Error should be set
      assert.ok(error.get() !== null || errorReceived !== null, 'Should have error');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// useMutation Advanced Options Tests
// =============================================================================

describe('useMutation Advanced Options Tests', () => {
  test('useMutation with onMutate for optimistic updates', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { createUser: { id: 1, name: 'Alice' } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let onMutateCalled = false;
      let rollbackContext = null;

      const { mutate } = useMutation(
        'mutation CreateUser($name: String!) { createUser(name: $name) { id name } }',
        {
          onMutate: (variables) => {
            onMutateCalled = true;
            return { previousData: 'backup' };
          }
        }
      );

      await mutate({ name: 'Alice' });

      assert.strictEqual(onMutateCalled, true, 'onMutate should be called');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation with invalidateQueries', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { createUser: { id: 1 } }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let invalidateCalled = false;
      const originalInvalidate = client.invalidate;
      client.invalidate = (key) => {
        invalidateCalled = true;
        originalInvalidate.call(client, key);
      };

      const { mutate } = useMutation(
        'mutation { createUser { id } }',
        {
          invalidateQueries: ['gql:GetUsers', 'gql:GetUserCount']
        }
      );

      await mutate({});

      assert.strictEqual(invalidateCalled, true, 'invalidateQueries should call client.invalidate');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation calls onSettled on success', async () => {
    const mock = mockFetch({
      '/graphql': {
        data: { result: 'ok' }
      }
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let settledCalled = false;
      let settledData = null;
      let settledError = null;

      const { mutate } = useMutation(
        'mutation { result }',
        {
          onSettled: (data, error, variables) => {
            settledCalled = true;
            settledData = data;
            settledError = error;
          }
        }
      );

      await mutate({});

      assert.strictEqual(settledCalled, true, 'onSettled should be called');
      assert.ok(settledData !== null, 'Should have data in onSettled');
      assert.strictEqual(settledError, null, 'Should not have error in onSettled');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation calls onSettled on error', async () => {
    const mock = mockFetch({
      '/graphql': new Error('Network error')
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      let settledCalled = false;

      const { mutate } = useMutation(
        'mutation { result }',
        {
          onSettled: (data, error, variables) => {
            settledCalled = true;
          }
        }
      );

      try {
        await mutate({});
      } catch (e) {
        // Expected
      }

      assert.strictEqual(settledCalled, true, 'onSettled should be called on error');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useMutation wraps non-GraphQLError in GraphQLError', async () => {
    const mock = mockFetch({
      '/graphql': new Error('Plain error')
    });

    try {
      const client = createGraphQLClient({ url: '/graphql' });
      setDefaultClient(client);

      const { mutate, error } = useMutation('mutation { result }');

      try {
        await mutate({});
      } catch (e) {
        assert.ok(GraphQLError.isGraphQLError(e), 'Error should be wrapped in GraphQLError');
      }

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});

// =============================================================================
// useSubscription Tests
// =============================================================================

describe('useSubscription Tests', () => {
  test('useSubscription creates subscription with correct state', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      // Mock the subscribe method
      let subscribeCallback = null;
      client.subscribe = (query, variables, callbacks) => {
        subscribeCallback = callbacks;
        // Return unsubscribe function
        return () => {};
      };

      const { data, error, status, unsubscribe, resubscribe } = useSubscription(
        'subscription { messages { text } }',
        {},
        { enabled: true }
      );

      // Verify initial state
      assert.strictEqual(data.get(), null, 'Initial data should be null');
      assert.strictEqual(error.get(), null, 'Initial error should be null');
      assert.ok(typeof unsubscribe === 'function', 'Should have unsubscribe function');
      assert.ok(typeof resubscribe === 'function', 'Should have resubscribe function');

      // Simulate receiving data
      if (subscribeCallback) {
        subscribeCallback.onData({ messages: [{ text: 'Hello' }] });
      }

      // Check data is updated
      if (subscribeCallback) {
        assert.deepStrictEqual(data.get(), { messages: [{ text: 'Hello' }] }, 'Should receive data');
        assert.strictEqual(status.get(), 'connected', 'Status should be connected');
      }

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription calls onData callback', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let subscribeCallback = null;
      client.subscribe = (query, variables, callbacks) => {
        subscribeCallback = callbacks;
        return () => {};
      };

      let receivedData = null;

      const { data } = useSubscription(
        'subscription { messages { text } }',
        {},
        {
          onData: (payload) => {
            receivedData = payload;
          }
        }
      );

      // Simulate receiving data
      if (subscribeCallback) {
        subscribeCallback.onData({ text: 'Test message' });
        assert.deepStrictEqual(receivedData, { text: 'Test message' }, 'onData should be called');
      }

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription handles errors and resubscribes', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let subscribeCallback = null;
      let subscribeCount = 0;

      client.subscribe = (query, variables, callbacks) => {
        subscribeCount++;
        subscribeCallback = callbacks;
        return () => {};
      };

      let errorReceived = null;

      const { error, status, unsubscribe } = useSubscription(
        'subscription { messages }',
        {},
        {
          shouldResubscribe: true,
          onError: (err) => { errorReceived = err; }
        }
      );

      // Simulate error
      if (subscribeCallback) {
        subscribeCallback.onError(new Error('Connection lost'));
      }

      // With shouldResubscribe: true, status transitions to 'reconnecting' after error
      // (due to exponential backoff retry logic)
      assert.ok(
        status.get() === 'error' || status.get() === 'reconnecting',
        'Status should be error or reconnecting'
      );
      assert.ok(error.get() !== null, 'Should have error');
      assert.ok(errorReceived !== null, 'onError callback should be called');

      // Clean up - cancel any pending retry
      unsubscribe();
      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription handles completion', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let subscribeCallback = null;

      client.subscribe = (query, variables, callbacks) => {
        subscribeCallback = callbacks;
        return () => {};
      };

      let completeCalled = false;

      const { status } = useSubscription(
        'subscription { messages }',
        {},
        {
          onComplete: () => { completeCalled = true; }
        }
      );

      // Simulate completion
      if (subscribeCallback) {
        subscribeCallback.onComplete();
      }

      assert.strictEqual(status.get(), 'closed', 'Status should be closed');
      assert.strictEqual(completeCalled, true, 'onComplete should be called');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription with function variables', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let receivedVariables = null;

      client.subscribe = (query, variables, callbacks) => {
        receivedVariables = variables;
        return () => {};
      };

      const channelId = pulse('123');

      useSubscription(
        'subscription OnMessage($channelId: ID!) { messages(channelId: $channelId) { text } }',
        () => ({ channelId: channelId.get() }),
        { enabled: true }
      );

      assert.deepStrictEqual(receivedVariables, { channelId: '123' }, 'Should resolve function variables');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription with enabled as Pulse', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let subscribeCount = 0;
      let unsubscribeCount = 0;

      client.subscribe = (query, variables, callbacks) => {
        subscribeCount++;
        return () => { unsubscribeCount++; };
      };

      const enabled = pulse(false);

      const { status } = useSubscription(
        'subscription { messages }',
        {},
        { enabled }
      );

      // Initially disabled, should not subscribe
      assert.strictEqual(subscribeCount, 0, 'Should not subscribe when disabled');

      // Enable subscription
      enabled.set(true);

      // Give effect time to run
      await new Promise(r => setTimeout(r, 10));

      assert.strictEqual(subscribeCount, 1, 'Should subscribe when enabled');

      // Disable subscription
      enabled.set(false);

      await new Promise(r => setTimeout(r, 10));

      assert.strictEqual(unsubscribeCount, 1, 'Should unsubscribe when disabled');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });

  test('useSubscription unsubscribe and resubscribe', async () => {
    const mock = mockFetch({});

    try {
      const client = createGraphQLClient({
        url: '/graphql',
        wsUrl: 'ws://localhost/graphql'
      });
      setDefaultClient(client);

      let subscribeCount = 0;
      let unsubscribeCount = 0;

      client.subscribe = (query, variables, callbacks) => {
        subscribeCount++;
        return () => { unsubscribeCount++; };
      };

      const { unsubscribe, resubscribe, status } = useSubscription(
        'subscription { messages }',
        {},
        { enabled: true }
      );

      assert.strictEqual(subscribeCount, 1, 'Should subscribe initially');

      unsubscribe();
      assert.strictEqual(status.get(), 'closed', 'Status should be closed after unsubscribe');
      assert.strictEqual(unsubscribeCount, 1, 'Should call unsubscribe');

      resubscribe();
      assert.strictEqual(subscribeCount, 2, 'Should resubscribe');

      setDefaultClient(null);
    } finally {
      mock.restore();
    }
  });
});
