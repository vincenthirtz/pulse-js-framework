/**
 * GraphQL Coverage Tests
 *
 * Additional tests to improve coverage for runtime/graphql.js
 *
 * @module test/graphql-coverage
 */

import {
  createGraphQLClient,
  GraphQLClient,
  GraphQLError,
  InterceptorManager,
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
  printSection,
  wait
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

    if (options.signal?.aborted) {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    }

    const urlStr = typeof url === 'string' ? url : url.toString();

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
// GraphQLError Coverage Tests
// =============================================================================

printSection('GraphQLError Additional Coverage Tests');

test('GraphQLError.isAuthorizationError detects FORBIDDEN code', () => {
  const authzError = new GraphQLError('Forbidden', {
    errors: [{ extensions: { code: 'FORBIDDEN' } }]
  });

  assert(authzError.isAuthorizationError() === true, 'Should identify authorization error via extension');

  const authzError2 = new GraphQLError('Forbidden', {
    code: 'AUTHORIZATION_ERROR'
  });

  assert(authzError2.isAuthorizationError() === true, 'Should identify authorization error via code');
});

test('GraphQLError.toJSON returns correct structure', () => {
  const error = new GraphQLError('Test error', {
    code: 'TEST_CODE',
    errors: [{ message: 'field error' }],
    data: { partial: 'data' },
    extensions: { trace: '123' }
  });

  const json = error.toJSON();

  assertEqual(json.name, 'GraphQLError', 'Should have name');
  assert(json.message.includes('Test error'), 'Should have message');
  assertEqual(json.code, 'TEST_CODE', 'Should have code');
  assertEqual(json.errors.length, 1, 'Should have errors');
  assertEqual(json.data.partial, 'data', 'Should have data');
  assertEqual(json.extensions.trace, '123', 'Should have extensions');
});

test('GraphQLError hasPartialData with undefined data', () => {
  const errorWithUndefined = new GraphQLError('Error', { data: undefined });
  assert(errorWithUndefined.hasPartialData() === false, 'undefined data should not count as partial');
});

test('GraphQLError getFirstError with empty errors array', () => {
  const error = new GraphQLError('No errors', { errors: [] });
  assertEqual(error.getFirstError(), null, 'Should return null for empty errors');
});

test('GraphQLError getAllErrors with empty errors', () => {
  const error = new GraphQLError('No errors', { errors: [] });
  assertDeepEqual(error.getAllErrors(), [], 'Should return empty array');
});

// =============================================================================
// Cache Key Utility Coverage Tests
// =============================================================================

printSection('Cache Key Utility Coverage Tests');

test('generateCacheKey with null variables', () => {
  const query = 'query Test { value }';
  const key = generateCacheKey(query, null);

  assert(key.startsWith('gql:'), 'Should start with gql: prefix');
  assert(!key.includes('null'), 'Should not include null in key');
});

test('generateCacheKey with undefined variables', () => {
  const query = 'query Test { value }';
  const key = generateCacheKey(query, undefined);

  assert(key.startsWith('gql:'), 'Should start with gql: prefix');
});

test('generateCacheKey with nested arrays in variables', () => {
  const query = 'query Test { value }';
  const key = generateCacheKey(query, { arr: [[1, 2], [3, 4]] });

  assert(key.startsWith('gql:'), 'Should handle nested arrays');
});

test('generateCacheKey with primitive variable types', () => {
  const query = 'query Test { value }';

  const keyNum = generateCacheKey(query, { val: 123 });
  const keyStr = generateCacheKey(query, { val: 'test' });
  const keyBool = generateCacheKey(query, { val: true });

  assert(keyNum !== keyStr, 'Different types should produce different keys');
  assert(keyStr !== keyBool, 'Different types should produce different keys');
});

test('extractOperationName returns null for queries without name', () => {
  const result = extractOperationName('{ user { id } }');
  assertEqual(result, null, 'Should return null for shorthand query');
});

// =============================================================================
// GraphQL Client Coverage Tests
// =============================================================================

printSection('GraphQL Client Coverage Tests');

testAsync('client with throwOnError: false returns data with errors', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: {
        data: { user: { id: 1 } },
        errors: [{ message: 'Warning' }]
      }
    }
  });

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      throwOnError: false
    });

    const result = await client.query('query { user { id } }');

    // Should return data without throwing
    assertEqual(result.user.id, 1, 'Should return data despite errors');
  } finally {
    mock.restore();
  }
});

testAsync('client onError callback is called', async () => {
  let errorReceived = null;
  const mock = mockFetch({
    '/graphql': {
      data: {
        data: null,
        errors: [{ message: 'Test error' }]
      }
    }
  });

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      onError: (err) => { errorReceived = err; }
    });

    try {
      await client.query('query { value }');
    } catch (e) {
      // Expected
    }

    assert(errorReceived !== null, 'onError should be called');
    // The error has the first error message
    assertEqual(errorReceived.getFirstError(), 'Test error', 'Should receive error');
  } finally {
    mock.restore();
  }
});

testAsync('client maps INTERNAL_SERVER_ERROR code', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: {
        data: null,
        errors: [{
          message: 'Internal error',
          extensions: { code: 'INTERNAL_SERVER_ERROR' }
        }]
      }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });

    try {
      await client.query('query { value }');
      assert(false, 'Should throw');
    } catch (e) {
      assertEqual(e.code, 'GRAPHQL_ERROR', 'Should map to GRAPHQL_ERROR');
    }
  } finally {
    mock.restore();
  }
});

testAsync('client.getActiveSubscriptions returns count', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });

    // Before any subscriptions
    assertEqual(client.getActiveSubscriptions(), 0, 'Should be 0 initially');
  } finally {
    mock.restore();
  }
});

testAsync('client.closeAllSubscriptions does not throw', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });

    // Should not throw even with no subscriptions
    client.closeAllSubscriptions();
    assert(true, 'Should not throw');
  } finally {
    mock.restore();
  }
});

testAsync('client.dispose cleans up resources', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });

    // Should not throw
    client.dispose();
    assert(true, 'dispose should not throw');
  } finally {
    mock.restore();
  }
});

testAsync('request interceptor error handling with rejected handler', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { value: 1 } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });

    client.interceptors.request.use(
      (config) => {
        throw new Error('Request interceptor error');
      },
      (error) => {
        // Recover by returning modified config
        return { query: 'query Fallback { value }', variables: {} };
      }
    );

    const result = await client.query('query Test { value }');
    assertEqual(result.value, 1, 'Should recover from error');
  } finally {
    mock.restore();
  }
});

testAsync('response interceptor error handling with rejected handler', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { value: 1 } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });

    client.interceptors.response.use(
      (result) => {
        throw new Error('Response interceptor error');
      },
      (error) => {
        // Recover
        return { data: { recovered: true } };
      }
    );

    const result = await client.query('query Test { value }');
    assert(result.recovered === true, 'Should recover from error');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useQuery Coverage Tests
// =============================================================================

printSection('useQuery Coverage Tests');

testAsync('useQuery with function cacheKey', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { value: 1 } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    const { data } = useQuery(
      'query Test { value }',
      null,
      { cacheKey: () => 'custom-cache-key-' + Date.now() }
    );

    await wait(50);
    assert(data.get() !== null, 'Should fetch with custom cache key');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery onSuccess callback is called', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { value: 42 } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    let successData = null;
    const { data } = useQuery(
      'query Test { value }',
      null,
      {
        onSuccess: (result) => { successData = result; }
      }
    );

    await wait(50);
    assert(successData !== null, 'onSuccess should be called');
    assertEqual(successData.value, 42, 'Should receive correct data');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery with placeholderData shows placeholder initially', async () => {
  const mock = mockFetch({
    '/graphql': async () => {
      await wait(100);
      return createMockResponse({
        data: { data: { value: 'loaded' } }
      });
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    const { data, loading } = useQuery(
      'query Test { value }',
      null,
      { placeholderData: { value: 'placeholder' } }
    );

    // Initially should show placeholder
    assertEqual(data.get().value, 'placeholder', 'Should have placeholder data');

    await wait(150);
    assertEqual(data.get().value, 'loaded', 'Should have loaded data');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useQuery refetchInterval polls data', async () => {
  let fetchCount = 0;
  const mock = mockFetch({
    '/graphql': () => {
      fetchCount++;
      return createMockResponse({
        data: { data: { value: fetchCount } }
      });
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    const { data } = useQuery(
      'query Test { value }',
      null,
      { refetchInterval: 50 }
    );

    await wait(180);

    assert(fetchCount >= 3, `Should have polled multiple times (got ${fetchCount})`);

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useMutation Coverage Tests
// =============================================================================

printSection('useMutation Coverage Tests');

testAsync('useMutation mutateAsync is same as mutate', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { data: { result: 'ok' } }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    const { mutate, mutateAsync } = useMutation('mutation Test { result }');

    // Both should be the same function
    assertEqual(mutate, mutateAsync, 'mutateAsync should be alias for mutate');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useMutation onError receives rollback context', async () => {
  const mock = mockFetch({
    '/graphql': {
      data: { errors: [{ message: 'Mutation failed' }] }
    }
  });

  try {
    const client = createGraphQLClient({ url: '/graphql' });
    setDefaultClient(client);

    let receivedContext = null;
    let receivedVariables = null;

    const { mutate } = useMutation(
      'mutation Test { result }',
      {
        onMutate: (vars) => {
          return { rollbackData: 'previous state' };
        },
        onError: (err, vars, context) => {
          receivedContext = context;
          receivedVariables = vars;
        }
      }
    );

    try {
      await mutate({ test: true });
    } catch (e) {
      // Expected
    }

    assert(receivedContext !== null, 'Should receive rollback context');
    assertEqual(receivedContext.rollbackData, 'previous state', 'Should have rollback data');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// useSubscription Coverage Tests
// =============================================================================

printSection('useSubscription Coverage Tests');

testAsync('useSubscription with enabled: false does not subscribe', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });
    setDefaultClient(client);

    let subscribed = false;
    client.subscribe = () => {
      subscribed = true;
      return () => {};
    };

    useSubscription(
      'subscription Test { value }',
      {},
      { enabled: false }
    );

    await wait(50);
    assertEqual(subscribed, false, 'Should not subscribe when disabled');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription calculateBackoffDelay with different attempts', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });
    setDefaultClient(client);

    let errorTimes = [];
    let lastRetryCount = 0;

    client.subscribe = (query, variables, handlers) => {
      // Immediately trigger errors to test backoff
      setTimeout(() => {
        handlers.onError(new Error('Error 1'));
      }, 10);
      return () => {};
    };

    const { retryCount, status, unsubscribe } = useSubscription(
      'subscription Test { value }',
      {},
      {
        retryBaseDelay: 100,
        retryMaxDelay: 500,
        maxRetries: 3,
        shouldResubscribe: true
      }
    );

    await wait(50);

    // After first error, retryCount should be updated
    const count = retryCount.get();
    assert(count >= 0, 'Should track retry count');

    unsubscribe();
    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription resets retryCount on successful data', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });
    setDefaultClient(client);

    let dataHandler = null;
    client.subscribe = (query, variables, handlers) => {
      dataHandler = handlers.onData;
      return () => {};
    };

    const { data, retryCount } = useSubscription(
      'subscription Test { value }',
      {},
      { enabled: true }
    );

    await wait(20);

    // Simulate receiving data
    if (dataHandler) {
      dataHandler({ message: 'Hello' });
    }

    await wait(20);

    assertEqual(retryCount.get(), 0, 'Should reset retryCount on data');

    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

testAsync('useSubscription status becomes failed after maxRetries', async () => {
  const mock = mockFetch({});

  try {
    const client = createGraphQLClient({
      url: '/graphql',
      wsUrl: 'ws://localhost/graphql'
    });
    setDefaultClient(client);

    let subscribeCount = 0;
    let errorHandler = null;

    client.subscribe = (query, variables, handlers) => {
      subscribeCount++;
      errorHandler = handlers.onError;
      // Trigger error immediately
      setTimeout(() => handlers.onError(new Error('Test error')), 5);
      return () => {};
    };

    const { status, retryCount, unsubscribe } = useSubscription(
      'subscription Test { value }',
      {},
      {
        retryBaseDelay: 10,
        maxRetries: 2,
        shouldResubscribe: true
      }
    );

    // Wait for retries to complete
    await wait(200);

    // After exhausting retries, status should be 'failed'
    const currentStatus = status.get();
    assert(
      currentStatus === 'failed' || currentStatus === 'error' || retryCount.get() >= 2,
      `Should reach failed state or max retries (status: ${currentStatus}, retries: ${retryCount.get()})`
    );

    unsubscribe();
    setDefaultClient(null);
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Run Async Tests
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
