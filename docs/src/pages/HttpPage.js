/**
 * Pulse Documentation - HTTP Client Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function HttpPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="http.title"></h1>
    <p class="page-intro" data-i18n="http.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="http.quickStart"></h2>
      <p data-i18n="http.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { createHttp, http } from 'pulse-js-framework/runtime/http';

// Use the default instance
const response = await http.get('https://api.example.com/users');
console.log(response.data);

// Or create a configured instance
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

const users = await api.get('/users');
const user = await api.post('/users', { name: 'John' });</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.configuration"></h2>
      <p data-i18n="http.configurationDesc"></p>
      <div class="code-block">
        <pre><code>const api = createHttp({
  // Base URL prepended to all requests
  baseURL: 'https://api.example.com',

  // Request timeout in milliseconds (default: 10000)
  timeout: 5000,

  // Default headers for all requests
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'value'
  },

  // Include cookies in cross-origin requests
  withCredentials: false,

  // Response type: 'json' | 'text' | 'blob' | 'arrayBuffer'
  responseType: 'json',

  // Custom status validation (default: 2xx)
  validateStatus: (status) => status >= 200 && status < 300,

  // Retry configuration
  retries: 3,           // Number of retry attempts
  retryDelay: 1000,     // Delay between retries (ms)
  retryCondition: (error) => {
    // Custom retry logic
    return error.code === 'NETWORK' || error.status >= 500;
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.httpMethods"></h2>
      <div class="code-block">
        <pre><code>// GET - Fetch data
const users = await api.get('/users');
const user = await api.get('/users/1', {
  params: { include: 'posts,comments' }
});

// POST - Create resource
const newUser = await api.post('/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT - Replace resource
await api.put('/users/1', {
  name: 'Jane',
  email: 'jane@example.com'
});

// PATCH - Partial update
await api.patch('/users/1', { active: true });

// DELETE - Remove resource
await api.delete('/users/1');

// HEAD - Get headers only
const headers = await api.head('/users');

// OPTIONS - Get allowed methods
const options = await api.options('/users');</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.responseStructure"></h2>
      <div class="code-block">
        <pre><code>const response = await api.get('/users');

response.data;       // Parsed response body (JSON, text, blob...)
response.status;     // HTTP status code (200, 404, 500...)
response.statusText; // Status text ('OK', 'Not Found'...)
response.headers;    // Response Headers object
response.config;     // Request configuration used</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.interceptors"></h2>
      <p data-i18n="http.interceptorsDesc"></p>

      <h3 data-i18n="http.requestInterceptors"></h3>
      <div class="code-block">
        <pre><code>// Add auth token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': \`Bearer \${token}\`
    };
  }
  return config;
});

// Add request timing
api.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };
  return config;
});</code></pre>
      </div>

      <h3 data-i18n="http.responseInterceptors"></h3>
      <div class="code-block">
        <pre><code>// Log response time
api.interceptors.response.use(response => {
  const duration = Date.now() - response.config.metadata?.startTime;
  console.log(\`Request took \${duration}ms\`);
  return response;
});

// Handle authentication errors globally
api.interceptors.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      // Redirect to login
      router.navigate('/login');
    }
    throw error;
  }
);

// Transform response data
api.interceptors.response.use(response => {
  // Unwrap API envelope: { data: {...}, meta: {...} }
  if (response.data?.data) {
    response.data = response.data.data;
  }
  return response;
});</code></pre>
      </div>

      <h3 data-i18n="http.manageInterceptors"></h3>
      <div class="code-block">
        <pre><code>// Add interceptor and get its ID
const interceptorId = api.interceptors.request.use(config => {
  console.log('Request:', config.url);
  return config;
});

// Remove specific interceptor
api.interceptors.request.eject(interceptorId);

// Remove all interceptors
api.interceptors.request.clear();
api.interceptors.response.clear();</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.advancedInterceptors"></h2>
      <p data-i18n="http.advancedInterceptorsDesc"></p>

      <h3 data-i18n="http.tokenRefresh"></h3>
      <div class="code-block">
        <pre><code>import { pulse } from 'pulse-js-framework/runtime';

const authToken = pulse(localStorage.getItem('token'));
const refreshToken = pulse(localStorage.getItem('refreshToken'));
let isRefreshing = false;
let pendingRequests = [];

// Add auth token to all requests
api.interceptors.request.use(config => {
  const token = authToken.get();
  if (token) {
    config.headers['Authorization'] = \`Bearer \${token}\`;
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
          config.headers['Authorization'] = \`Bearer \${token}\`;
          resolve(api.request(config));
        });
        pendingRequests = [];

        // Retry original request
        originalRequest.headers['Authorization'] = \`Bearer \${token}\`;
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
);</code></pre>
      </div>

      <h3 data-i18n="http.requestLogging"></h3>
      <div class="code-block">
        <pre><code>api.interceptors.request.use(config => {
  const requestId = crypto.randomUUID();
  config.headers['X-Request-ID'] = requestId;
  config._startTime = Date.now();
  config._requestId = requestId;

  console.log(\`[\${requestId}] \${config.method.toUpperCase()} \${config.url}\`);
  return config;
});

api.interceptors.response.use(
  response => {
    const duration = Date.now() - response.config._startTime;
    console.log(
      \`[\${response.config._requestId}] \${response.status} (\${duration}ms)\`
    );
    return response;
  },
  error => {
    const duration = Date.now() - error.config._startTime;
    console.error(
      \`[\${error.config._requestId}] ERROR \${error.status || 'NETWORK'} (\${duration}ms)\`
    );
    throw error;
  }
);</code></pre>
      </div>

      <h3 data-i18n="http.cachingRequests"></h3>
      <div class="code-block">
        <pre><code>const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

api.interceptors.request.use(config => {
  // Only cache GET requests
  if (config.method !== 'get') return config;

  const cacheKey = \`\${config.url}?\${new URLSearchParams(config.params || {})}\`;
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
);</code></pre>
      </div>

      <h3 data-i18n="http.rateLimiting"></h3>
      <div class="code-block">
        <pre><code>const requestQueue = [];
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
);</code></pre>
      </div>

      <h3 data-i18n="http.errorNormalization"></h3>
      <div class="code-block">
        <pre><code>api.interceptors.response.use(
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
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.errorHandling"></h2>
      <p data-i18n="http.errorHandlingDesc"></p>
      <div class="code-block">
        <pre><code>import { HttpError } from 'pulse-js-framework/runtime/http';

try {
  await api.get('/users');
} catch (error) {
  if (HttpError.isHttpError(error)) {
    // Error codes: TIMEOUT, NETWORK, ABORT, HTTP_ERROR, PARSE_ERROR
    console.log('Code:', error.code);
    console.log('Status:', error.status);
    console.log('Config:', error.config);
    console.log('Response:', error.response);

    // Convenience methods
    if (error.isTimeout()) {
      console.log('Request timed out');
    }
    if (error.isNetworkError()) {
      console.log('Network error - check connection');
    }
    if (error.isAborted()) {
      console.log('Request was cancelled');
    }
  }
}</code></pre>
      </div>

      <h3 data-i18n="http.errorCodes"></h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Code</th>
              <th data-i18n="http.description"></th>
              <th data-i18n="http.when"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>TIMEOUT</code></td>
              <td data-i18n="http.errorTimeout"></td>
              <td data-i18n="http.errorTimeoutWhen"></td>
            </tr>
            <tr>
              <td><code>NETWORK</code></td>
              <td data-i18n="http.errorNetwork"></td>
              <td data-i18n="http.errorNetworkWhen"></td>
            </tr>
            <tr>
              <td><code>ABORT</code></td>
              <td data-i18n="http.errorAbort"></td>
              <td data-i18n="http.errorAbortWhen"></td>
            </tr>
            <tr>
              <td><code>HTTP_ERROR</code></td>
              <td data-i18n="http.errorHttp"></td>
              <td data-i18n="http.errorHttpWhen"></td>
            </tr>
            <tr>
              <td><code>PARSE_ERROR</code></td>
              <td data-i18n="http.errorParse"></td>
              <td data-i18n="http.errorParseWhen"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.cancellation"></h2>
      <p data-i18n="http.cancellationDesc"></p>
      <div class="code-block">
        <pre><code>// Using AbortController
const controller = new AbortController();

// Start the request
const promise = api.get('/users', {
  signal: controller.signal
});

// Cancel if needed
controller.abort();

// Check if error is cancellation
try {
  await promise;
} catch (error) {
  if (api.isCancel(error)) {
    console.log('Request was cancelled');
  }
}

// Practical example: cancel on component unmount
function UserList() {
  const controller = new AbortController();

  effect(() => {
    api.get('/users', { signal: controller.signal })
      .then(res => users.set(res.data));

    // Cleanup: cancel request on unmount
    return () => controller.abort();
  });
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.retry"></h2>
      <p data-i18n="http.retryDesc"></p>
      <div class="code-block">
        <pre><code>const api = createHttp({
  baseURL: 'https://api.example.com',
  retries: 3,        // Retry up to 3 times
  retryDelay: 1000,  // Wait 1 second between retries

  // Custom retry condition (default: network errors + 5xx)
  retryCondition: (error) => {
    // Retry on network errors
    if (error.code === 'NETWORK' || error.code === 'TIMEOUT') {
      return true;
    }
    // Retry on 5xx server errors
    if (error.status >= 500) {
      return true;
    }
    // Retry on rate limit (429)
    if (error.status === 429) {
      return true;
    }
    // Don't retry on 4xx client errors
    return false;
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.reactiveIntegration"></h2>
      <p data-i18n="http.reactiveIntegrationDesc"></p>

      <h3>useHttp</h3>
      <div class="code-block">
        <pre><code>import { useHttp } from 'pulse-js-framework/runtime/http';

// Basic usage
const { data, loading, error, execute, abort, reset } = useHttp(
  () => api.get('/users'),
  {
    immediate: true,  // Fetch immediately (default)
    retries: 3,       // Retry on failure
    onSuccess: (response) => console.log('Loaded:', response.data),
    onError: (error) => console.error('Failed:', error)
  }
);

// Use in templates
function UserList() {
  return el('.users',
    when(() => loading.get(),
      () => el('.spinner', 'Loading...'),
      () => when(() => error.get(),
        () => el('.error', () => error.get().message),
        () => list(() => data.get() || [], user =>
          el('.user', user.name)
        )
      )
    )
  );
}

// Manual execution
const { execute } = useHttp(() => api.post('/users', newUser), {
  immediate: false  // Don't execute immediately
});

// Call when needed
button.addEventListener('click', () => execute());</code></pre>
      </div>

      <h3>useHttpResource</h3>
      <p data-i18n="http.useHttpResourceDesc"></p>
      <div class="code-block">
        <pre><code>import { useHttpResource } from 'pulse-js-framework/runtime/http';

// Cached resource with SWR pattern
const users = useHttpResource(
  'users',                        // Cache key
  () => api.get('/users'),
  {
    refreshInterval: 30000,       // Auto-refresh every 30s
    refreshOnFocus: true,         // Refresh when window gains focus
    refreshOnReconnect: true,     // Refresh when network reconnects
    staleTime: 5000,              // Data considered fresh for 5s
    cacheTime: 300000             // Keep in cache for 5 min
  }
);

// Dynamic cache key
const userId = pulse(1);
const user = useHttpResource(
  () => \`user-\${userId.get()}\`,   // Key changes when userId changes
  () => api.get(\`/users/\${userId.get()}\`)
);

// Change user ID triggers re-fetch
userId.set(2);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.childInstances"></h2>
      <p data-i18n="http.childInstancesDesc"></p>
      <div class="code-block">
        <pre><code>// Base API client
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: { 'X-App-Version': '1.0.0' }
});

// Admin API inherits base config
const adminApi = api.create({
  baseURL: 'https://api.example.com/admin',
  headers: { 'X-Admin-Token': 'secret' }
});

// adminApi has:
// - baseURL: https://api.example.com/admin
// - timeout: 10000 (inherited)
// - headers: { 'X-App-Version': '1.0.0', 'X-Admin-Token': 'secret' }

// Public API with shorter timeout
const publicApi = api.create({
  timeout: 5000
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.fileUpload"></h2>
      <div class="code-block">
        <pre><code>// Upload with FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('name', 'document.pdf');

const response = await api.post('/upload', formData);
// Content-Type is automatically set to multipart/form-data

// Upload with progress (requires XHR fallback)
// Note: fetch() doesn't support upload progress natively</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.urlParameters"></h2>
      <div class="code-block">
        <pre><code>// Query parameters
const response = await api.get('/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name',
    filter: 'active'
  }
});
// GET /users?page=1&limit=10&sort=name&filter=active

// Null/undefined params are ignored
const response = await api.get('/users', {
  params: {
    page: 1,
    filter: null,      // Ignored
    sort: undefined    // Ignored
  }
});
// GET /users?page=1

// Get full URL without making request
const url = api.getUri({
  url: '/users',
  params: { page: 1 }
});
// https://api.example.com/users?page=1</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="http.fullExample"></h2>
      <div class="code-block">
        <pre><code>import { createHttp, useHttp, HttpError } from 'pulse-js-framework/runtime/http';
import { el, effect, pulse } from 'pulse-js-framework/runtime';

// Configure API client
const api = createHttp({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  retries: 2
});

// Add auth interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = { ...config.headers, Authorization: \`Bearer \${token}\` };
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  response => response,
  error => {
    if (error.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    throw error;
  }
);

// User list component with reactive data
function UserList() {
  const { data: users, loading, error, execute: refresh } = useHttp(
    () => api.get('/users'),
    { immediate: true }
  );

  return el('.user-list',
    el('h2', 'Users'),
    el('button', { onclick: refresh }, 'Refresh'),

    when(() => loading.get(),
      () => el('.loading', 'Loading users...'),
      () => when(() => error.get(),
        () => el('.error', () => \`Error: \${error.get().message}\`),
        () => list(() => users.get() || [], user =>
          el('.user-card',
            el('h3', user.name),
            el('p', user.email)
          ),
          user => user.id
        )
      )
    )
  );
}</code></pre>
      </div>
    </section>
  `;

  // Apply i18n translations
  effect(() => {
    locale.get();
    translations.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
