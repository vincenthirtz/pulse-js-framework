# HTTP Client

Pulse provides a powerful HTTP client with interceptors, automatic retries, and reactive integration.

## Installation

```javascript
import { createHttp, http, HttpError, useHttp, useHttpResource } from 'pulse-js-framework/runtime/http';
```

## Quick Start

```javascript
// Create HTTP client instance
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

// Make requests
const users = await api.get('/users');
const user = await api.post('/users', { name: 'John' });
```

## Creating a Client

```javascript
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,                    // Request timeout (ms)
  headers: { 'Authorization': 'Bearer token' },
  retries: 3,                       // Retry on failure
  retryDelay: 1000,                 // Delay between retries (ms)
  withCredentials: false,           // Include cookies
  responseType: 'json'              // json | text | blob | arrayBuffer
});
```

## HTTP Methods

```javascript
// GET
const users = await api.get('/users');
const user = await api.get('/users/1', { params: { include: 'posts' } });

// POST
const created = await api.post('/users', { name: 'John' });

// PUT
await api.put('/users/1', { name: 'Jane' });

// PATCH
await api.patch('/users/1', { active: true });

// DELETE
await api.delete('/users/1');
```

## Response Structure

```javascript
const response = await api.get('/users');

response.data;       // Parsed response body
response.status;     // HTTP status code
response.statusText; // Status text
response.headers;    // Response headers
response.config;     // Request config
```

## Interceptors

### Request Interceptors

```javascript
api.interceptors.request.use(
  config => {
    // Add timestamp to all requests
    config.headers['X-Request-Time'] = Date.now();
    return config;
  },
  error => Promise.reject(error)
);
```

### Response Interceptors

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      router.navigate('/login');
    }
    throw error;
  }
);
```

### Managing Interceptors

```javascript
// Add interceptor and get ID
const id = api.interceptors.request.use(fn);

// Remove specific interceptor
api.interceptors.request.eject(id);

// Remove all interceptors
api.interceptors.request.clear();
```

### Real-World Interceptor Examples

#### Authentication with Token Refresh

```javascript
import { pulse } from 'pulse-js-framework/runtime';

const authToken = pulse(localStorage.getItem('token'));
const refreshToken = pulse(localStorage.getItem('refreshToken'));
let isRefreshing = false;
let pendingRequests = [];

// Add auth token to all requests
api.interceptors.request.use(config => {
  const token = authToken.get();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and refresh token
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried to refresh
    if (error.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request while refreshing
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post('/auth/refresh', {
          refreshToken: refreshToken.get()
        });

        const { token, refresh } = response.data;
        authToken.set(token);
        refreshToken.set(refresh);
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refresh);

        // Retry pending requests
        pendingRequests.forEach(({ resolve, config }) => {
          config.headers['Authorization'] = `Bearer ${token}`;
          resolve(api.request(config));
        });
        pendingRequests = [];

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        pendingRequests.forEach(({ reject }) => reject(refreshError));
        pendingRequests = [];
        authToken.set(null);
        refreshToken.set(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        router.navigate('/login');
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);
```

#### Request/Response Logging

```javascript
api.interceptors.request.use(config => {
  const requestId = crypto.randomUUID();
  config.headers['X-Request-ID'] = requestId;
  config._startTime = Date.now();
  config._requestId = requestId;

  console.log(`[${requestId}] ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  response => {
    const duration = Date.now() - response.config._startTime;
    console.log(
      `[${response.config._requestId}] ${response.status} (${duration}ms)`
    );
    return response;
  },
  error => {
    const duration = Date.now() - error.config._startTime;
    console.error(
      `[${error.config._requestId}] ERROR ${error.status || 'NETWORK'} (${duration}ms)`
    );
    throw error;
  }
);
```

#### Caching GET Requests

```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

api.interceptors.request.use(config => {
  // Only cache GET requests
  if (config.method !== 'get') return config;

  const cacheKey = `${config.url}?${new URLSearchParams(config.params || {})}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Return cached response by throwing a special error
    const error = new Error('CACHE_HIT');
    error.cachedResponse = cached.response;
    throw error;
  }

  config._cacheKey = cacheKey;
  return config;
});

api.interceptors.response.use(
  response => {
    // Cache successful GET responses
    if (response.config._cacheKey) {
      cache.set(response.config._cacheKey, {
        response: { ...response },
        timestamp: Date.now()
      });
    }
    return response;
  },
  error => {
    // Handle cache hit
    if (error.message === 'CACHE_HIT') {
      return error.cachedResponse;
    }
    throw error;
  }
);
```

#### Rate Limiting

```javascript
const requestQueue = [];
const MAX_CONCURRENT = 5;
let activeRequests = 0;

api.interceptors.request.use(async config => {
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise(resolve => requestQueue.push(resolve));
  }
  activeRequests++;
  return config;
});

api.interceptors.response.use(
  response => {
    activeRequests--;
    if (requestQueue.length > 0) {
      requestQueue.shift()();
    }
    return response;
  },
  error => {
    activeRequests--;
    if (requestQueue.length > 0) {
      requestQueue.shift()();
    }
    throw error;
  }
);
```

#### Error Normalization

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    // Normalize error structure for consistent handling
    const normalizedError = {
      message: error.response?.data?.message || error.message || 'Unknown error',
      code: error.response?.data?.code || error.code || 'UNKNOWN',
      status: error.status || 0,
      details: error.response?.data?.details || null,
      requestId: error.config?.headers?.['X-Request-ID']
    };

    // Log for monitoring
    if (error.status >= 500) {
      console.error('Server error:', normalizedError);
      // Send to error tracking service
      // errorTracker.captureException(error, { extra: normalizedError });
    }

    throw normalizedError;
  }
);
```

## Child Instances

Create a child instance that inherits config:

```javascript
const adminApi = api.create({
  baseURL: 'https://api.example.com/admin',
  headers: { 'X-Admin': 'true' }
});
```

## Request Cancellation

```javascript
const controller = new AbortController();

api.get('/users', { signal: controller.signal });

// Cancel request
controller.abort();

// Check if error is cancellation
if (api.isCancel(error)) {
  console.log('Request was cancelled');
}
```

## Error Handling

```javascript
try {
  await api.get('/users');
} catch (error) {
  if (HttpError.isHttpError(error)) {
    error.code;      // 'TIMEOUT' | 'NETWORK' | 'ABORT' | 'HTTP_ERROR' | 'PARSE_ERROR'
    error.status;    // HTTP status code (if available)
    error.config;    // Request config
    error.response;  // Response object (if available)

    // Helper methods
    error.isTimeout();      // true if timeout
    error.isNetworkError(); // true if network failure
    error.isAborted();      // true if cancelled
  }
}
```

## Custom Retry Conditions

```javascript
const api = createHttp({
  retries: 3,
  retryCondition: (error) => {
    // Only retry on network errors, not 4xx
    return error.code === 'NETWORK' || error.status >= 500;
  }
});
```

## Reactive Integration

### useHttp

```javascript
const { data, loading, error, execute, abort, reset } = useHttp(
  () => api.get('/users'),
  {
    immediate: true,     // Execute immediately
    retries: 3,          // Retry attempts
    onSuccess: (response) => console.log('Got:', response.data),
    onError: (error) => console.error('Failed:', error)
  }
);

// Use in effects
effect(() => {
  if (loading.get()) console.log('Loading...');
  if (data.get()) console.log('Users:', data.get());
});
```

### useHttpResource (SWR Pattern)

```javascript
const users = useHttpResource(
  'users',
  () => api.get('/users'),
  {
    refreshInterval: 30000,    // Auto-refresh every 30s
    refreshOnFocus: true,      // Refresh when window gains focus
    staleTime: 5000            // Data fresh for 5s
  }
);
```

## Default Instance

A pre-configured instance is available:

```javascript
import { http } from 'pulse-js-framework/runtime/http';

const response = await http.get('https://api.example.com/users');
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
}

const response = await api.get<User[]>('/users');
// response.data is User[]
```
