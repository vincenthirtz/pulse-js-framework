/**
 * Pulse HTTP Client - Zero-dependency HTTP client for Pulse Framework
 * @module pulse-js-framework/runtime/http
 */

import { pulse, computed, batch } from './pulse.js';
import { useAsync, useResource } from './async.js';
import { RuntimeError, createErrorMessage, getDocsUrl } from './errors.js';
import { InterceptorManager } from './interceptor-manager.js';

// ============================================================================
// HTTP Error Class
// ============================================================================

/**
 * HTTP-specific error suggestions
 */
const HTTP_SUGGESTIONS = {
  TIMEOUT: 'Consider increasing the timeout or checking network conditions.',
  NETWORK: 'Check internet connectivity and ensure the server is reachable.',
  ABORT: 'Request was cancelled. This is usually intentional.',
  HTTP_ERROR: 'Check the response status and server logs for details.',
  PARSE_ERROR: 'The response could not be parsed. Check the Content-Type header.'
};

/**
 * HTTP Error with request/response context
 */
export class HttpError extends RuntimeError {
  /**
   * @param {string} message - Error message
   * @param {Object} [options={}] - Error options
   * @param {string} [options.code] - Error code (TIMEOUT, NETWORK, ABORT, HTTP_ERROR, PARSE_ERROR)
   * @param {Object} [options.config] - Request configuration
   * @param {Request} [options.request] - The Request object
   * @param {Object} [options.response] - The HttpResponse object
   */
  constructor(message, options = {}) {
    const code = options.code || 'HTTP_ERROR';
    const formattedMessage = createErrorMessage({
      code,
      message,
      context: options.context,
      suggestion: options.suggestion || HTTP_SUGGESTIONS[code]
    });

    super(formattedMessage, { code });

    this.name = 'HttpError';
    this.config = options.config || null;
    this.code = code;
    this.request = options.request || null;
    this.response = options.response || null;
    this.status = options.response?.status || null;
    this.isHttpError = true;
  }

  /**
   * Check if an error is an HttpError
   * @param {any} error - The error to check
   * @returns {boolean} True if the error is an HttpError
   */
  static isHttpError(error) {
    return error?.isHttpError === true;
  }

  /**
   * Check if this is a timeout error
   * @returns {boolean}
   */
  isTimeout() {
    return this.code === 'TIMEOUT';
  }

  /**
   * Check if this is a network error
   * @returns {boolean}
   */
  isNetworkError() {
    return this.code === 'NETWORK';
  }

  /**
   * Check if this is an abort/cancellation error
   * @returns {boolean}
   */
  isAborted() {
    return this.code === 'ABORT';
  }
}

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  baseURL: '',
  timeout: 10000,
  headers: {},
  withCredentials: false,
  responseType: 'json',
  validateStatus: (status) => status >= 200 && status < 300,
  retries: 0,
  retryDelay: 1000,
  retryCondition: null
};

/**
 * HTTP Client class
 */
class HttpClient {
  #config;
  #requestInterceptors;
  #responseInterceptors;

  /**
   * @param {Object} [config={}] - Default configuration
   */
  constructor(config = {}) {
    this.#config = { ...DEFAULT_CONFIG, ...config };
    this.#requestInterceptors = new InterceptorManager();
    this.#responseInterceptors = new InterceptorManager();

    // Public interceptors access
    this.interceptors = {
      request: this.#requestInterceptors,
      response: this.#responseInterceptors
    };

    // Public defaults access
    this.defaults = this.#config;
  }

  /**
   * Build the full URL with base URL and query parameters
   * @param {string} url - The URL path
   * @param {Object} config - Request configuration
   * @returns {string} Full URL
   */
  #buildURL(url, config) {
    let fullURL = url;

    // Prepend baseURL if url is relative
    if (config.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
      fullURL = config.baseURL.replace(/\/+$/, '') + '/' + url.replace(/^\/+/, '');
    }

    // Add query parameters
    if (config.params && Object.keys(config.params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(config.params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const separator = fullURL.includes('?') ? '&' : '?';
      fullURL += separator + searchParams.toString();
    }

    return fullURL;
  }

  /**
   * Merge configurations (defaults + request-specific)
   * @param {Object} config - Request configuration
   * @returns {Object} Merged configuration
   */
  #mergeConfig(config) {
    return {
      ...this.#config,
      ...config,
      headers: {
        ...this.#config.headers,
        ...config.headers
      }
    };
  }

  /**
   * Run request interceptors
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Modified configuration
   */
  async #runRequestInterceptors(config) {
    let currentConfig = config;

    for (const { fulfilled, rejected } of this.#requestInterceptors) {
      try {
        if (fulfilled) {
          currentConfig = await fulfilled(currentConfig);
        }
      } catch (error) {
        if (rejected) {
          currentConfig = await rejected(error);
        } else {
          throw error;
        }
      }
    }

    return currentConfig;
  }

  /**
   * Run response interceptors
   * @param {Object} response - HTTP response
   * @returns {Promise<Object>} Modified response
   */
  async #runResponseInterceptors(response) {
    let currentResponse = response;

    for (const { fulfilled, rejected } of this.#responseInterceptors) {
      try {
        if (fulfilled) {
          currentResponse = await fulfilled(currentResponse);
        }
      } catch (error) {
        if (rejected) {
          currentResponse = await rejected(error);
        } else {
          throw error;
        }
      }
    }

    return currentResponse;
  }

  /**
   * Run error through response interceptors
   * @param {Error} error - The error
   * @returns {Promise} Rejected promise or transformed result
   */
  async #runErrorInterceptors(error) {
    let currentError = error;

    for (const { rejected } of this.#responseInterceptors) {
      if (rejected) {
        try {
          return await rejected(currentError);
        } catch (e) {
          currentError = e;
        }
      }
    }

    throw currentError;
  }

  /**
   * Parse response based on content type and responseType option
   * @param {Response} response - Fetch Response object
   * @param {Object} config - Request configuration
   * @returns {Promise<any>} Parsed response data
   */
  async #parseResponse(response, config) {
    const contentType = response.headers.get('content-type') || '';
    const responseType = config.responseType || 'json';

    try {
      switch (responseType) {
        case 'json':
          // Auto-detect JSON
          if (contentType.includes('application/json')) {
            return await response.json();
          }
          // Try JSON parsing, fall back to text
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }

        case 'text':
          return await response.text();

        case 'blob':
          return await response.blob();

        case 'arrayBuffer':
          return await response.arrayBuffer();

        case 'formData':
          return await response.formData();

        default:
          return await response.text();
      }
    } catch (parseError) {
      throw new HttpError('Failed to parse response', {
        code: 'PARSE_ERROR',
        config,
        context: `Expected ${responseType}, got ${contentType}`
      });
    }
  }

  /**
   * Execute request with timeout
   * @param {string} url - Full URL
   * @param {Object} fetchOptions - Fetch options
   * @param {Object} config - Request configuration
   * @returns {Promise<Response>} Fetch response
   */
  async #executeWithTimeout(url, fetchOptions, config) {
    const controller = new AbortController();
    const { signal } = controller;

    // Merge with user-provided signal
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        controller.abort();
      });
      // If already aborted, abort immediately
      if (config.signal.aborted) {
        controller.abort();
      }
    }

    let timeoutId;

    try {
      const fetchPromise = fetch(url, { ...fetchOptions, signal });

      // Add timeout if configured
      if (config.timeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort();
            reject(new HttpError(`Request timeout after ${config.timeout}ms`, {
              code: 'TIMEOUT',
              config
            }));
          }, config.timeout);
        });

        return await Promise.race([fetchPromise, timeoutPromise]);
      }

      return await fetchPromise;
    } catch (error) {
      // Handle abort
      if (error.name === 'AbortError') {
        if (config.signal?.aborted) {
          throw new HttpError('Request aborted', {
            code: 'ABORT',
            config
          });
        }
        // Re-throw timeout errors
        if (HttpError.isHttpError(error)) {
          throw error;
        }
        throw new HttpError('Request aborted', {
          code: 'ABORT',
          config
        });
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new HttpError(error.message || 'Network error', {
          code: 'NETWORK',
          config,
          context: 'Failed to connect to server'
        });
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Default retry condition
   * @param {HttpError} error - The error
   * @returns {boolean} Whether to retry
   */
  #defaultRetryCondition(error) {
    // Retry on network errors and timeouts
    if (error.code === 'NETWORK' || error.code === 'TIMEOUT') {
      return true;
    }
    // Retry on 5xx server errors
    if (error.status >= 500) {
      return true;
    }
    // Retry on 429 (rate limit)
    if (error.status === 429) {
      return true;
    }
    return false;
  }

  /**
   * Execute request with retry logic
   * @param {string} url - Full URL
   * @param {Object} fetchOptions - Fetch options
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} HTTP response
   */
  async #executeWithRetry(url, fetchOptions, config) {
    const { retries = 0, retryDelay = 1000, retryCondition } = config;
    let lastError;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response = await this.#executeWithTimeout(url, fetchOptions, config);

        // Validate status
        if (!config.validateStatus(response.status)) {
          const data = await this.#parseResponse(response.clone(), config).catch(() => null);
          throw new HttpError(`Request failed with status ${response.status}`, {
            code: 'HTTP_ERROR',
            config,
            response: {
              data,
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            }
          });
        }

        // Parse and return response
        const data = await this.#parseResponse(response, config);

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config
        };
      } catch (error) {
        lastError = HttpError.isHttpError(error)
          ? error
          : new HttpError(error.message, { code: 'NETWORK', config });

        attempt++;

        // Check if should retry
        const shouldRetry = attempt <= retries && (
          retryCondition
            ? retryCondition(lastError)
            : this.#defaultRetryCondition(lastError)
        );

        if (shouldRetry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * Make an HTTP request
   * @param {Object} config - Request configuration
   * @param {string} config.url - Request URL
   * @param {string} [config.method='GET'] - HTTP method
   * @param {Object} [config.headers] - Request headers
   * @param {any} [config.data] - Request body
   * @param {Object} [config.params] - URL query parameters
   * @returns {Promise<Object>} HTTP response
   */
  async request(config) {
    // Merge with defaults
    let mergedConfig = this.#mergeConfig(config);

    // Run request interceptors
    mergedConfig = await this.#runRequestInterceptors(mergedConfig);

    // Build URL
    const url = this.#buildURL(mergedConfig.url, mergedConfig);

    // Prepare fetch options
    const fetchOptions = {
      method: (mergedConfig.method || 'GET').toUpperCase(),
      headers: new Headers(mergedConfig.headers),
      credentials: mergedConfig.withCredentials ? 'include' : 'same-origin'
    };

    // Add body for methods that support it
    if (mergedConfig.data !== undefined && !['GET', 'HEAD'].includes(fetchOptions.method)) {
      if (mergedConfig.data instanceof FormData ||
          mergedConfig.data instanceof URLSearchParams ||
          mergedConfig.data instanceof Blob) {
        fetchOptions.body = mergedConfig.data;
      } else if (typeof mergedConfig.data === 'object') {
        fetchOptions.body = JSON.stringify(mergedConfig.data);
        // Set Content-Type if not already set
        if (!fetchOptions.headers.has('Content-Type')) {
          fetchOptions.headers.set('Content-Type', 'application/json');
        }
      } else {
        fetchOptions.body = mergedConfig.data;
      }
    }

    try {
      // Execute with retry
      const response = await this.#executeWithRetry(url, fetchOptions, mergedConfig);

      // Run response interceptors
      return await this.#runResponseInterceptors(response);
    } catch (error) {
      // Run error through interceptors
      return await this.#runErrorInterceptors(error);
    }
  }

  /**
   * GET request
   * @param {string} url - Request URL
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  get(url, options = {}) {
    return this.request({ ...options, url, method: 'GET' });
  }

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  delete(url, options = {}) {
    return this.request({ ...options, url, method: 'DELETE' });
  }

  /**
   * HEAD request
   * @param {string} url - Request URL
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  head(url, options = {}) {
    return this.request({ ...options, url, method: 'HEAD' });
  }

  /**
   * OPTIONS request
   * @param {string} url - Request URL
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  options(url, options = {}) {
    return this.request({ ...options, url, method: 'OPTIONS' });
  }

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {any} [data] - Request body
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  post(url, data, options = {}) {
    return this.request({ ...options, url, method: 'POST', data });
  }

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {any} [data] - Request body
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  put(url, data, options = {}) {
    return this.request({ ...options, url, method: 'PUT', data });
  }

  /**
   * PATCH request
   * @param {string} url - Request URL
   * @param {any} [data] - Request body
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} HTTP response
   */
  patch(url, data, options = {}) {
    return this.request({ ...options, url, method: 'PATCH', data });
  }

  /**
   * Create a new HttpClient instance with merged config
   * @param {Object} [config={}] - Configuration to merge
   * @returns {HttpClient} New client instance
   */
  create(config = {}) {
    return new HttpClient(this.#mergeConfig(config));
  }

  /**
   * Get the full URI for a request config
   * @param {Object} config - Request configuration
   * @returns {string} Full URL
   */
  getUri(config) {
    const mergedConfig = this.#mergeConfig(config);
    return this.#buildURL(mergedConfig.url || '', mergedConfig);
  }

  /**
   * Check if an error was caused by request cancellation
   * @param {any} error - The error to check
   * @returns {boolean} True if the error is a cancellation
   */
  isCancel(error) {
    return HttpError.isHttpError(error) && error.code === 'ABORT';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new HTTP client instance
 * @param {Object} [config={}] - Default configuration
 * @param {string} [config.baseURL] - Base URL for all requests
 * @param {number} [config.timeout=10000] - Request timeout in ms
 * @param {Object} [config.headers] - Default headers
 * @param {boolean} [config.withCredentials=false] - Include credentials
 * @param {string} [config.responseType='json'] - Response type (json, text, blob, arrayBuffer)
 * @param {Function} [config.validateStatus] - Function to validate response status
 * @param {number} [config.retries=0] - Number of retry attempts
 * @param {number} [config.retryDelay=1000] - Delay between retries in ms
 * @param {Function} [config.retryCondition] - Custom retry condition function
 * @returns {HttpClient} HTTP client instance
 *
 * @example
 * const api = createHttp({
 *   baseURL: 'https://api.example.com',
 *   timeout: 5000,
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * const users = await api.get('/users');
 * const user = await api.post('/users', { name: 'John' });
 */
export function createHttp(config = {}) {
  return new HttpClient(config);
}

// ============================================================================
// Reactive Integration
// ============================================================================

/**
 * Reactive HTTP hook integrating with Pulse's useAsync
 * @param {Function} requestFn - Function that returns a promise (from http.get, etc.)
 * @param {Object} [options={}] - Hook options
 * @param {boolean} [options.immediate=true] - Execute immediately
 * @param {any} [options.initialData=null] - Initial data value
 * @param {number} [options.retries=0] - Retry attempts
 * @param {number} [options.retryDelay=1000] - Delay between retries
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @returns {Object} Reactive state and controls
 *
 * @example
 * const { data, loading, error, execute } = useHttp(
 *   () => api.get('/users'),
 *   { immediate: true, retries: 3 }
 * );
 *
 * effect(() => {
 *   if (data.get()) console.log('Users:', data.get());
 * });
 */
export function useHttp(requestFn, options = {}) {
  const {
    immediate = true,
    initialData = null,
    retries = 0,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const asyncState = useAsync(
    async (...args) => {
      const response = await requestFn(...args);
      return response;
    },
    {
      immediate,
      initialData: initialData !== null ? { data: initialData } : null,
      retries,
      retryDelay,
      onSuccess: onSuccess ? (response) => onSuccess(response) : undefined,
      onError: onError ? (error) => {
        if (HttpError.isHttpError(error)) {
          onError(error);
        } else {
          onError(new HttpError(error.message, { code: 'NETWORK' }));
        }
      } : undefined
    }
  );

  // Convenience accessor for response data
  const data = computed(() => asyncState.data.get()?.data ?? initialData);
  const response = asyncState.data;

  return {
    data,
    response,
    loading: asyncState.loading,
    error: asyncState.error,
    status: asyncState.status,
    execute: asyncState.execute,
    reset: asyncState.reset,
    abort: asyncState.abort
  };
}

/**
 * HTTP resource with caching (SWR pattern)
 * Integrates with useResource from async.js
 * @param {string|Function} key - Cache key or function returning key
 * @param {Function} requestFn - Function that returns a promise
 * @param {Object} [options={}] - Resource options
 * @returns {Object} Resource state and controls
 *
 * @example
 * const users = useHttpResource(
 *   'users',
 *   () => api.get('/users'),
 *   { refreshInterval: 30000 }
 * );
 */
export function useHttpResource(key, requestFn, options = {}) {
  return useResource(
    key,
    async () => {
      const response = await requestFn();
      return response.data;
    },
    options
  );
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Pre-configured default HTTP client instance
 */
export const http = createHttp();

// ============================================================================
// Exports
// ============================================================================

export { HttpClient, InterceptorManager };

export default {
  createHttp,
  http,
  HttpClient,
  HttpError,
  InterceptorManager,
  useHttp,
  useHttpResource
};
