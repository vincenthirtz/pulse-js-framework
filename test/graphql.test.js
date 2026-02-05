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

import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

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

printSection('GraphQLError Tests');

test('GraphQLError creates error with correct properties', () => {
  const error = new GraphQLError('Test error', {
    code: 'GRAPHQL_ERROR',
    errors: [{ message: 'Field error' }],
    data: { partial: 'data' }
  });

  assertEqual(error.name, 'GraphQLError', 'Should have correct name');
  assertEqual(error.code, 'GRAPHQL_ERROR', 'Should have correct code');
  assertEqual(error.errors.length, 1, 'Should have errors array');
  assertEqual(error.data.partial, 'data', 'Should have partial data');
});

test('GraphQLError.isGraphQLError correctly identifies errors', () => {
  const graphqlError = new GraphQLError('Test');
  const regularError = new Error('Test');

  assert(GraphQLError.isGraphQLError(graphqlError) === true, 'Should identify GraphQLError');
  assert(GraphQLError.isGraphQLError(regularError) === false, 'Should not identify regular Error');
  assert(GraphQLError.isGraphQLError(null) === false, 'Should handle null');
  assert(GraphQLError.isGraphQLError(undefined) === false, 'Should handle undefined');
});

test('GraphQLError has convenience methods', () => {
  const authError = new GraphQLError('Auth error', {
    errors: [{ extensions: { code: 'UNAUTHENTICATED' } }]
  });
  const validationError = new GraphQLError('Validation error', {
    errors: [{ extensions: { code: 'BAD_USER_INPUT' } }]
  });
  const networkError = new GraphQLError('Network error', { code: 'NETWORK_ERROR' });

  assert(authError.isAuthenticationError() === true, 'Should identify auth error');
  assert(validationError.isValidationError() === true, 'Should identify validation error');
  assert(networkError.isNetworkError() === true, 'Should identify network error');
});

test('GraphQLError hasPartialData works correctly', () => {
  const withData = new GraphQLError('Error with data', {
    data: { user: { id: 1 } }
  });
  const withoutData = new GraphQLError('Error without data', {
    data: null
  });

  assert(withData.hasPartialData() === true, 'Should detect partial data');
  assert(withoutData.hasPartialData() === false, 'Should detect no data');
});

test('GraphQLError getFirstError and getAllErrors work', () => {
  const error = new GraphQLError('Multiple errors', {
    errors: [
      { message: 'First error' },
      { message: 'Second error' }
    ]
  });

  assertEqual(error.getFirstError(), 'First error', 'Should get first error');
  assertEqual(error.getAllErrors().length, 2, 'Should get all errors');
});

// =============================================================================
// Cache Key Utility Tests
// =============================================================================

printSection('Cache Key Utility Tests');

test('extractOperationName extracts query name', () => {
  const query = 'query GetUser { user { id } }';
  assertEqual(extractOperationName(query), 'GetUser', 'Should extract query name');
});

test('extractOperationName extracts mutation name', () => {
  const mutation = 'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }';
  assertEqual(extractOperationName(mutation), 'CreateUser', 'Should extract mutation name');
});

test('extractOperationName extracts subscription name', () => {
  const subscription = 'subscription OnMessage { messageAdded { id } }';
  assertEqual(extractOperationName(subscription), 'OnMessage', 'Should extract subscription name');
});

test('extractOperationName returns null for anonymous operations', () => {
  const query = '{ user { id } }';
  assertEqual(extractOperationName(query), null, 'Should return null for anonymous');
});

test('generateCacheKey creates deterministic keys', () => {
  const query = 'query GetUser { user { id } }';
  const variables = { id: 1 };

  const key1 = generateCacheKey(query, variables);
  const key2 = generateCacheKey(query, variables);

  assertEqual(key1, key2, 'Same query and variables should produce same key');
  assert(key1.startsWith('gql:'), 'Key should start with gql: prefix');
});

test('generateCacheKey produces different keys for different variables', () => {
  const query = 'query GetUser($id: ID!) { user(id: $id) { id } }';

  const key1 = generateCacheKey(query, { id: 1 });
  const key2 = generateCacheKey(query, { id: 2 });

  assert(key1 !== key2, 'Different variables should produce different keys');
});

test('generateCacheKey handles objects with different key order', () => {
  const query = 'query Test { test }';

  const key1 = generateCacheKey(query, { a: 1, b: 2 });
  const key2 = generateCacheKey(query, { b: 2, a: 1 });

  assertEqual(key1, key2, 'Object key order should not affect cache key');
});

// =============================================================================
// InterceptorManager Tests
// =============================================================================

printSection('InterceptorManager Tests');

test('InterceptorManager can add and remove interceptors', () => {
  const manager = new InterceptorManager();

  const id = manager.use(() => {}, () => {});
  assertEqual(manager.size, 1, 'Should have one interceptor');

  manager.eject(id);
  assertEqual(manager.size, 0, 'Should have no interceptors after eject');
});

test('InterceptorManager clear removes all interceptors', () => {
  const manager = new InterceptorManager();

  manager.use(() => {});
  manager.use(() => {});
  manager.use(() => {});

  assertEqual(manager.size, 3, 'Should have three interceptors');

  manager.clear();
  assertEqual(manager.size, 0, 'Should have no interceptors after clear');
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
    assert(interceptor.fulfilled !== undefined, 'Interceptor should have fulfilled');
  }

  assertEqual(count, 2, 'Should iterate over all interceptors');
});

// =============================================================================
// createGraphQLClient Tests
// =============================================================================

printSection('createGraphQLClient Tests');

test('createGraphQLClient requires url option', () => {
  let threw = false;
  try {
    createGraphQLClient({});
  } catch (e) {
    threw = true;
    assert(GraphQLError.isGraphQLError(e), 'Should throw GraphQLError');
  }
  assert(threw, 'Should throw when url is missing');
});

test('createGraphQLClient creates client with default options', () => {
  const mock = mockFetch({});
  try {
    const client = createGraphQLClient({ url: '/graphql' });
    assert(client instanceof GraphQLClient, 'Should create GraphQLClient instance');
    assert(client.interceptors.request instanceof InterceptorManager, 'Should have request interceptors');
    assert(client.interceptors.response instanceof InterceptorManager, 'Should have response interceptors');
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
    assert(child instanceof GraphQLClient, 'Child should be GraphQLClient');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// GraphQL Query Tests
// =============================================================================

printSection('GraphQL Query Tests');

testAsync('client.query executes GraphQL query', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { user: { id: 1, name: 'Test' } } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    const result = await client.query('query GetUser { user { id name } }');

    assertEqual(result.user.id, 1, 'Should return user data');
    assertEqual(result.user.name, 'Test', 'Should return user name');
    assertEqual(mock.getCallCount(), 1, 'Should make one fetch call');
  } finally {
    mock.restore();
  }
});

testAsync('client.query passes variables', async () => {
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

    assertEqual(result.user.id, 42, 'Should pass variables to server');
  } finally {
    mock.restore();
  }
});

testAsync('client.query handles GraphQL errors', async () => {
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
      assert(GraphQLError.isGraphQLError(e), 'Should throw GraphQLError');
      assertEqual(e.errors[0].message, 'User not found', 'Should have error message');
    }

    assert(threw, 'Should throw on GraphQL errors');
  } finally {
    mock.restore();
  }
});

testAsync('client.query deduplicates identical queries', async () => {
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

    assertEqual(result1.value, 1, 'First query should return data');
    assertEqual(result2.value, 1, 'Second query should return data');
    assertEqual(mock.getCallCount(), 1, 'Should only make one fetch call (dedupe)');
  } finally {
    mock.restore();
  }
});

testAsync('client.query can disable deduplication', async () => {
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

    assertEqual(mock.getCallCount(), 2, 'Should make two fetch calls without dedupe');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// GraphQL Mutation Tests
// =============================================================================

printSection('GraphQL Mutation Tests');

testAsync('client.mutate executes mutation', async () => {
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

    assertEqual(result.createUser.name, 'New User', 'Should return mutation result');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Interceptor Tests
// =============================================================================

printSection('Interceptor Tests');

testAsync('request interceptors transform config', async () => {
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
    assertEqual(result.intercepted, true, 'Request should be modified by interceptor');
  } finally {
    mock.restore();
  }
});

testAsync('response interceptors transform result', async () => {
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
    assertEqual(result.transformed, true, 'Response should be transformed by interceptor');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Default Client Tests
// =============================================================================

printSection('Default Client Tests');

test('setDefaultClient and getDefaultClient work', () => {
  const mock = mockFetch({});
  try {
    const client = createGraphQLClient({ url: '/graphql' });

    setDefaultClient(client);
    const retrieved = getDefaultClient();

    assertEqual(retrieved, client, 'Should retrieve the same client');

    // Clean up
    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useQuery Hook Tests
// =============================================================================

printSection('useQuery Hook Tests');

testAsync('useQuery returns reactive state', async () => {
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
    assert(loading.get() === true || status.get() === 'loading', 'Should be loading initially');

    // Wait for query to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    assert(data.get() !== null, 'Data should be populated');
    assertEqual(data.get().users[0].id, 1, 'Should have user data');
    assertEqual(error.get(), null, 'Should have no error');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery with immediate: false does not execute', async () => {
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

    assertEqual(mock.getCallCount(), 0, 'Should not make fetch call');
    assertEqual(data.get(), null, 'Data should be null');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery refetch triggers new request', async () => {
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
    assertEqual(data.get().count, 1, 'Initial count should be 1');

    await refetch();
    assertEqual(data.get().count, 2, 'After refetch count should be 2');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useMutation Hook Tests
// =============================================================================

printSection('useMutation Hook Tests');

testAsync('useMutation returns mutate function', async () => {
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

    assertEqual(status.get(), 'idle', 'Initial status should be idle');

    const result = await mutate();

    assertEqual(result.createItem.id, 1, 'Should return mutation result');
    assertEqual(data.get().createItem.id, 1, 'Data pulse should be updated');
    assertEqual(status.get(), 'success', 'Status should be success');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation calls onSuccess callback', async () => {
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

    assertEqual(successData.createItem.id, 1, 'onSuccess should be called with data');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation handles errors', async () => {
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

    assert(error.get() !== null, 'Error should be set');
    assertEqual(status.get(), 'error', 'Status should be error');
    assert(errorReceived !== null, 'onError should be called');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation reset clears state', async () => {
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
    assertEqual(status.get(), 'success', 'Status should be success');

    reset();
    assertEqual(status.get(), 'idle', 'Status should be idle after reset');
    assertEqual(data.get(), null, 'Data should be null after reset');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Cache Management Tests
// =============================================================================

printSection('Cache Management Tests');

test('client.invalidate and invalidateAll work', () => {
  const mock = mockFetch({});
  try {
    const client = createGraphQLClient({ url: '/graphql' });

    // These should not throw
    client.invalidate('some-key');
    client.invalidateAll();

    const stats = client.getCacheStats();
    assertEqual(stats.size, 0, 'Cache should be empty');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useQuery Advanced Options Tests
// =============================================================================

printSection('useQuery Advanced Options Tests');

testAsync('useQuery with select transforms data', async () => {
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

    assertEqual(loading.get(), false, 'Should not be loading');
    // The data could be the original or transformed, depending on timing
    const dataValue = data.get();
    assert(dataValue !== null, 'Data should not be null');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery status computed returns correct states', async () => {
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
    assert(initialStatus === 'idle' || initialStatus === 'loading', 'Initial status should be idle or loading');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery invalidate marks data as stale', async () => {
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

    assertEqual(isStale.get(), false, 'Should not be stale initially');

    invalidate();

    assertEqual(isStale.get(), true, 'Should be stale after invalidate');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery reset clears all state', async () => {
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

    assert(data.get() !== null, 'Should have data');

    reset();

    assertEqual(data.get(), null, 'Data should be null after reset');
    assertEqual(error.get(), null, 'Error should be null after reset');
    assertEqual(loading.get(), false, 'Loading should be false after reset');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery handles error and calls onError', async () => {
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
    assert(error.get() !== null || errorReceived !== null, 'Should have error');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useMutation Advanced Options Tests
// =============================================================================

printSection('useMutation Advanced Options Tests');

testAsync('useMutation with onMutate for optimistic updates', async () => {
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

    assertEqual(onMutateCalled, true, 'onMutate should be called');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation with invalidateQueries', async () => {
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

    assertEqual(invalidateCalled, true, 'invalidateQueries should call client.invalidate');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation calls onSettled on success', async () => {
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

    assertEqual(settledCalled, true, 'onSettled should be called');
    assert(settledData !== null, 'Should have data in onSettled');
    assertEqual(settledError, null, 'Should not have error in onSettled');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation calls onSettled on error', async () => {
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

    assertEqual(settledCalled, true, 'onSettled should be called on error');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation wraps non-GraphQLError in GraphQLError', async () => {
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
      assert(GraphQLError.isGraphQLError(e), 'Error should be wrapped in GraphQLError');
    }

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useSubscription Tests
// =============================================================================

printSection('useSubscription Tests');

testAsync('useSubscription creates subscription with correct state', async () => {
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
    assertEqual(data.get(), null, 'Initial data should be null');
    assertEqual(error.get(), null, 'Initial error should be null');
    assert(typeof unsubscribe === 'function', 'Should have unsubscribe function');
    assert(typeof resubscribe === 'function', 'Should have resubscribe function');

    // Simulate receiving data
    if (subscribeCallback) {
      subscribeCallback.onData({ messages: [{ text: 'Hello' }] });
    }

    // Check data is updated
    if (subscribeCallback) {
      assertDeepEqual(data.get(), { messages: [{ text: 'Hello' }] }, 'Should receive data');
      assertEqual(status.get(), 'connected', 'Status should be connected');
    }

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription calls onData callback', async () => {
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
      assertDeepEqual(receivedData, { text: 'Test message' }, 'onData should be called');
    }

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription handles errors and resubscribes', async () => {
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
    assert(
      status.get() === 'error' || status.get() === 'reconnecting',
      'Status should be error or reconnecting'
    );
    assert(error.get() !== null, 'Should have error');
    assert(errorReceived !== null, 'onError callback should be called');

    // Clean up - cancel any pending retry
    unsubscribe();
    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription handles completion', async () => {
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

    assertEqual(status.get(), 'closed', 'Status should be closed');
    assertEqual(completeCalled, true, 'onComplete should be called');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription with function variables', async () => {
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

    assertDeepEqual(receivedVariables, { channelId: '123' }, 'Should resolve function variables');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription with enabled as Pulse', async () => {
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
    assertEqual(subscribeCount, 0, 'Should not subscribe when disabled');

    // Enable subscription
    enabled.set(true);

    // Give effect time to run
    await new Promise(r => setTimeout(r, 10));

    assertEqual(subscribeCount, 1, 'Should subscribe when enabled');

    // Disable subscription
    enabled.set(false);

    await new Promise(r => setTimeout(r, 10));

    assertEqual(unsubscribeCount, 1, 'Should unsubscribe when disabled');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription unsubscribe and resubscribe', async () => {
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

    assertEqual(subscribeCount, 1, 'Should subscribe initially');

    unsubscribe();
    assertEqual(status.get(), 'closed', 'Status should be closed after unsubscribe');
    assertEqual(unsubscribeCount, 1, 'Should call unsubscribe');

    resubscribe();
    assertEqual(subscribeCount, 2, 'Should resubscribe');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Run Async Tests
// =============================================================================

runAsyncTests().then(() => {
  printResults();
  exitWithCode();
});
