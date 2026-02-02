/**
 * Pulse HTTP Client Tests
 *
 * Tests for runtime/http.js - createHttp, HttpError, useHttp
 *
 * @module test/http
 */

import {
  createHttp,
  http,
  HttpClient,
  HttpError,
  InterceptorManager,
  useHttp,
  useHttpResource
} from '../runtime/http.js';

import { pulse, effect, computed } from '../runtime/pulse.js';

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
// HttpError Tests
// =============================================================================

printSection('HttpError Tests');

test('HttpError creates error with correct properties', () => {
  const error = new HttpError('Test error', {
    code: 'TIMEOUT',
    config: { url: '/test' }
  });

  assertEqual(error.name, 'HttpError', 'Should have correct name');
  assertEqual(error.code, 'TIMEOUT', 'Should have correct code');
  assertEqual(error.isHttpError, true, 'Should have isHttpError flag');
  assert(error.config.url === '/test', 'Should preserve config');
});

test('HttpError.isHttpError correctly identifies HttpErrors', () => {
  const httpError = new HttpError('Test');
  const regularError = new Error('Test');

  assert(HttpError.isHttpError(httpError) === true, 'Should identify HttpError');
  assert(HttpError.isHttpError(regularError) === false, 'Should not identify regular Error');
  assert(HttpError.isHttpError(null) === false, 'Should handle null');
  assert(HttpError.isHttpError(undefined) === false, 'Should handle undefined');
});

test('HttpError has convenience methods for error types', () => {
  const timeoutError = new HttpError('Timeout', { code: 'TIMEOUT' });
  const networkError = new HttpError('Network', { code: 'NETWORK' });
  const abortError = new HttpError('Abort', { code: 'ABORT' });

  assert(timeoutError.isTimeout() === true, 'Should identify timeout');
  assert(networkError.isNetworkError() === true, 'Should identify network error');
  assert(abortError.isAborted() === true, 'Should identify abort');
});

// =============================================================================
// InterceptorManager Tests
// =============================================================================

printSection('InterceptorManager Tests');

test('InterceptorManager can add and remove interceptors', () => {
  const manager = new InterceptorManager();

  const id = manager.use(() => {}, () => {});
  assertEqual(manager.size, 1, 'Should have 1 interceptor');

  manager.eject(id);
  assertEqual(manager.size, 0, 'Should have 0 interceptors after eject');
});

test('InterceptorManager clear removes all interceptors', () => {
  const manager = new InterceptorManager();

  manager.use(() => {});
  manager.use(() => {});
  manager.use(() => {});

  assertEqual(manager.size, 3, 'Should have 3 interceptors');

  manager.clear();
  assertEqual(manager.size, 0, 'Should have 0 interceptors after clear');
});

test('InterceptorManager is iterable', () => {
  const manager = new InterceptorManager();
  const fn1 = () => 1;
  const fn2 = () => 2;

  manager.use(fn1);
  manager.use(fn2);

  const handlers = [...manager];
  assertEqual(handlers.length, 2, 'Should iterate over 2 handlers');
  assertEqual(handlers[0].fulfilled, fn1, 'First handler should be fn1');
  assertEqual(handlers[1].fulfilled, fn2, 'Second handler should be fn2');
});

// =============================================================================
// createHttp Tests
// =============================================================================

printSection('createHttp Tests');

test('createHttp creates HttpClient instance', () => {
  const client = createHttp();

  assert(client instanceof HttpClient, 'Should be HttpClient instance');
  assert(typeof client.get === 'function', 'Should have get method');
  assert(typeof client.post === 'function', 'Should have post method');
  assert(typeof client.put === 'function', 'Should have put method');
  assert(typeof client.patch === 'function', 'Should have patch method');
  assert(typeof client.delete === 'function', 'Should have delete method');
  assert(typeof client.request === 'function', 'Should have request method');
});

test('createHttp accepts configuration', () => {
  const client = createHttp({
    baseURL: 'https://api.example.com',
    timeout: 5000,
    headers: { 'X-Custom': 'value' }
  });

  assertEqual(client.defaults.baseURL, 'https://api.example.com', 'Should set baseURL');
  assertEqual(client.defaults.timeout, 5000, 'Should set timeout');
  assertEqual(client.defaults.headers['X-Custom'], 'value', 'Should set headers');
});

test('createHttp provides interceptors object', () => {
  const client = createHttp();

  assert(client.interceptors !== undefined, 'Should have interceptors');
  assert(client.interceptors.request instanceof InterceptorManager, 'Should have request interceptors');
  assert(client.interceptors.response instanceof InterceptorManager, 'Should have response interceptors');
});

test('default http instance is pre-configured', () => {
  assert(http instanceof HttpClient, 'http should be HttpClient instance');
  assert(typeof http.get === 'function', 'http should have get method');
});

// =============================================================================
// URL Building Tests
// =============================================================================

printSection('URL Building Tests');

test('getUri builds URL with baseURL', () => {
  const client = createHttp({ baseURL: 'https://api.example.com' });

  const uri = client.getUri({ url: '/users' });
  assertEqual(uri, 'https://api.example.com/users', 'Should combine baseURL and url');
});

test('getUri handles trailing/leading slashes', () => {
  const client = createHttp({ baseURL: 'https://api.example.com/' });

  const uri = client.getUri({ url: '/users' });
  assertEqual(uri, 'https://api.example.com/users', 'Should normalize slashes');
});

test('getUri adds query parameters', () => {
  const client = createHttp({ baseURL: 'https://api.example.com' });

  const uri = client.getUri({
    url: '/users',
    params: { page: 1, limit: 10 }
  });

  assert(uri.includes('page=1'), 'Should include page param');
  assert(uri.includes('limit=10'), 'Should include limit param');
});

test('getUri ignores null/undefined params', () => {
  const client = createHttp({ baseURL: 'https://api.example.com' });

  const uri = client.getUri({
    url: '/users',
    params: { page: 1, filter: null, sort: undefined }
  });

  assert(uri.includes('page=1'), 'Should include valid param');
  assert(!uri.includes('filter'), 'Should not include null param');
  assert(!uri.includes('sort'), 'Should not include undefined param');
});

test('getUri handles absolute URLs', () => {
  const client = createHttp({ baseURL: 'https://api.example.com' });

  const uri = client.getUri({ url: 'https://other.com/resource' });
  assertEqual(uri, 'https://other.com/resource', 'Should not prepend baseURL to absolute URLs');
});

// =============================================================================
// HTTP Request Tests (with mock)
// =============================================================================

printSection('HTTP Request Tests');

testAsync('GET request works correctly', async () => {
  const mock = mockFetch({
    '/users': { status: 200, data: [{ id: 1, name: 'John' }] }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const response = await client.get('/users');

    assertEqual(response.status, 200, 'Should have status 200');
    assertDeepEqual(response.data, [{ id: 1, name: 'John' }], 'Should have correct data');
    assertEqual(mock.calls.length, 1, 'Should make 1 fetch call');
  } finally {
    mock.restore();
  }
});

testAsync('POST request sends body correctly', async () => {
  const mock = mockFetch({
    '/users': (url, options) => {
      const body = JSON.parse(options.body);
      return createMockResponse({
        status: 201,
        data: { id: 1, ...body }
      });
    }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const response = await client.post('/users', { name: 'Jane' });

    assertEqual(response.status, 201, 'Should have status 201');
    assertEqual(response.data.name, 'Jane', 'Should have correct name');
    assertEqual(response.data.id, 1, 'Should have id');

    // Check that Content-Type was set
    const call = mock.calls[0];
    assert(call.options.headers.get('Content-Type') === 'application/json', 'Should set Content-Type');
  } finally {
    mock.restore();
  }
});

testAsync('PUT request works correctly', async () => {
  const mock = mockFetch({
    '/users/1': { status: 200, data: { id: 1, name: 'Updated' } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const response = await client.put('/users/1', { name: 'Updated' });

    assertEqual(response.status, 200, 'Should have status 200');
    assertEqual(response.data.name, 'Updated', 'Should have updated name');
    assertEqual(mock.calls[0].options.method, 'PUT', 'Should use PUT method');
  } finally {
    mock.restore();
  }
});

testAsync('PATCH request works correctly', async () => {
  const mock = mockFetch({
    '/users/1': { status: 200, data: { id: 1, active: true } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const response = await client.patch('/users/1', { active: true });

    assertEqual(response.status, 200, 'Should have status 200');
    assertEqual(mock.calls[0].options.method, 'PATCH', 'Should use PATCH method');
  } finally {
    mock.restore();
  }
});

testAsync('DELETE request works correctly', async () => {
  const mock = mockFetch({
    '/users/1': { status: 204, data: null }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const response = await client.delete('/users/1');

    assertEqual(response.status, 204, 'Should have status 204');
    assertEqual(mock.calls[0].options.method, 'DELETE', 'Should use DELETE method');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

printSection('Error Handling Tests');

testAsync('HTTP error is thrown for non-2xx status', async () => {
  const mock = mockFetch({
    '/error': { status: 404, data: { error: 'Not found' } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });

    try {
      await client.get('/error');
      assert(false, 'Should have thrown');
    } catch (error) {
      assert(HttpError.isHttpError(error), 'Should be HttpError');
      assertEqual(error.code, 'HTTP_ERROR', 'Should have HTTP_ERROR code');
      assertEqual(error.status, 404, 'Should have status 404');
    }
  } finally {
    mock.restore();
  }
});

testAsync('Network error is wrapped in HttpError', async () => {
  const mock = mockFetch({
    '/network': new TypeError('Failed to fetch')
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });

    try {
      await client.get('/network');
      assert(false, 'Should have thrown');
    } catch (error) {
      assert(HttpError.isHttpError(error), 'Should be HttpError');
      assertEqual(error.code, 'NETWORK', 'Should have NETWORK code');
    }
  } finally {
    mock.restore();
  }
});

testAsync('Custom validateStatus changes error behavior', async () => {
  const mock = mockFetch({
    '/custom': { status: 404, data: { found: false } }
  });

  try {
    const client = createHttp({
      baseURL: 'https://api.test.com',
      validateStatus: (status) => status < 500 // Accept 4xx as valid
    });

    const response = await client.get('/custom');
    assertEqual(response.status, 404, 'Should return 404 as valid');
    assertEqual(response.data.found, false, 'Should have data');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Interceptor Tests
// =============================================================================

printSection('Interceptor Tests');

testAsync('Request interceptors modify config', async () => {
  const mock = mockFetch({
    '/test': { status: 200, data: { ok: true } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });

    client.interceptors.request.use(config => {
      config.headers = { ...config.headers, 'X-Intercepted': 'true' };
      return config;
    });

    await client.get('/test');

    const call = mock.calls[0];
    assert(call.options.headers.get('X-Intercepted') === 'true', 'Should have intercepted header');
  } finally {
    mock.restore();
  }
});

testAsync('Response interceptors transform response', async () => {
  const mock = mockFetch({
    '/test': { status: 200, data: { value: 10 } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });

    client.interceptors.response.use(response => {
      response.data.value *= 2;
      response.intercepted = true;
      return response;
    });

    const response = await client.get('/test');

    assertEqual(response.data.value, 20, 'Should have transformed data');
    assertEqual(response.intercepted, true, 'Should have added property');
  } finally {
    mock.restore();
  }
});

testAsync('Error interceptors handle errors', async () => {
  const mock = mockFetch({
    '/error': { status: 500, data: { error: 'Server error' } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    let errorHandled = false;

    client.interceptors.response.use(
      response => response,
      error => {
        errorHandled = true;
        error.handled = true;
        throw error;
      }
    );

    try {
      await client.get('/error');
    } catch (error) {
      assert(errorHandled, 'Error interceptor should have been called');
      assert(error.handled, 'Error should have been modified');
    }
  } finally {
    mock.restore();
  }
});

testAsync('Multiple interceptors run in order', async () => {
  const mock = mockFetch({
    '/test': { status: 200, data: { order: [] } }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const order = [];

    client.interceptors.request.use(config => {
      order.push('req1');
      return config;
    });

    client.interceptors.request.use(config => {
      order.push('req2');
      return config;
    });

    client.interceptors.response.use(response => {
      order.push('res1');
      return response;
    });

    client.interceptors.response.use(response => {
      order.push('res2');
      return response;
    });

    await client.get('/test');

    assertDeepEqual(order, ['req1', 'req2', 'res1', 'res2'], 'Should run in correct order');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Retry Tests
// =============================================================================

printSection('Retry Tests');

testAsync('Retry on failure', async () => {
  let attempts = 0;
  const mock = mockFetch({
    '/retry': (url, options, callCount) => {
      attempts++;
      if (callCount < 3) {
        return createMockResponse({ status: 500, data: { error: 'Server error' } });
      }
      return createMockResponse({ status: 200, data: { success: true } });
    }
  });

  try {
    const client = createHttp({
      baseURL: 'https://api.test.com',
      retries: 3,
      retryDelay: 10 // Short delay for tests
    });

    const response = await client.get('/retry');

    assertEqual(response.status, 200, 'Should eventually succeed');
    assertEqual(attempts, 3, 'Should have made 3 attempts');
  } finally {
    mock.restore();
  }
});

testAsync('No retry when retries is 0', async () => {
  let attempts = 0;
  const mock = mockFetch({
    '/no-retry': () => {
      attempts++;
      return createMockResponse({ status: 500, data: { error: 'Error' } });
    }
  });

  try {
    const client = createHttp({
      baseURL: 'https://api.test.com',
      retries: 0
    });

    try {
      await client.get('/no-retry');
      assert(false, 'Should have thrown');
    } catch (error) {
      assertEqual(attempts, 1, 'Should only make 1 attempt');
    }
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Child Instance Tests
// =============================================================================

printSection('Child Instance Tests');

test('create() makes child instance with merged config', () => {
  const parent = createHttp({
    baseURL: 'https://api.example.com',
    timeout: 5000,
    headers: { 'X-Parent': 'true' }
  });

  const child = parent.create({
    timeout: 3000,
    headers: { 'X-Child': 'true' }
  });

  assertEqual(child.defaults.baseURL, 'https://api.example.com', 'Should inherit baseURL');
  assertEqual(child.defaults.timeout, 3000, 'Should override timeout');
  assertEqual(child.defaults.headers['X-Parent'], 'true', 'Should inherit parent headers');
  assertEqual(child.defaults.headers['X-Child'], 'true', 'Should have child headers');
});

// =============================================================================
// isCancel Tests
// =============================================================================

printSection('isCancel Tests');

test('isCancel identifies cancellation errors', () => {
  const client = createHttp();

  const cancelError = new HttpError('Cancelled', { code: 'ABORT' });
  const httpError = new HttpError('Not found', { code: 'HTTP_ERROR' });
  const regularError = new Error('Something');

  assert(client.isCancel(cancelError) === true, 'Should identify cancel error');
  assert(client.isCancel(httpError) === false, 'Should not identify HTTP error as cancel');
  assert(client.isCancel(regularError) === false, 'Should not identify regular error as cancel');
});

// =============================================================================
// useHttp Tests
// =============================================================================

printSection('useHttp Tests');

testAsync('useHttp returns reactive state', async () => {
  const mock = mockFetch({
    '/users': { status: 200, data: [{ id: 1 }] }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const { data, loading, error, status } = useHttp(
      () => client.get('/users'),
      { immediate: false }
    );

    // Check initial state
    assertEqual(data.get(), null, 'data should be null initially');
    assertEqual(loading.get(), false, 'loading should be false initially');
    assertEqual(error.get(), null, 'error should be null initially');
    assertEqual(status.get(), 'idle', 'status should be idle initially');
  } finally {
    mock.restore();
  }
});

testAsync('useHttp execute fetches data', async () => {
  const mock = mockFetch({
    '/users': { status: 200, data: [{ id: 1, name: 'Test' }] }
  });

  try {
    const client = createHttp({ baseURL: 'https://api.test.com' });
    const { data, execute, status } = useHttp(
      () => client.get('/users'),
      { immediate: false }
    );

    await execute();

    // Wait for state update
    await new Promise(r => setTimeout(r, 10));

    assertEqual(status.get(), 'success', 'status should be success');
    assertDeepEqual(data.get(), [{ id: 1, name: 'Test' }], 'data should be fetched');
  } finally {
    mock.restore();
  }
});

// =============================================================================
// Run All Tests
// =============================================================================

runAsyncTests().then(() => {
  printResults();
  exitWithCode();
});
