/**
 * Pulse HTTP Client TypeScript Definitions
 * @module pulse-js-framework/runtime/http
 */

import { Pulse } from './pulse';
import { AsyncStatus, UseResourceReturn, ResourceOptions } from './async';

// ============================================================================
// Error Types
// ============================================================================

/**
 * HTTP error codes
 */
export type HttpErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'ABORT'
  | 'HTTP_ERROR'
  | 'PARSE_ERROR';

/**
 * HTTP Error with request/response context
 */
export declare class HttpError extends Error {
  readonly name: 'HttpError';
  readonly code: HttpErrorCode;
  readonly config: HttpConfig | null;
  readonly request: Request | null;
  readonly response: HttpResponse<unknown> | null;
  readonly status: number | null;
  readonly isHttpError: true;

  constructor(message: string, options?: {
    code?: HttpErrorCode;
    config?: HttpConfig;
    request?: Request;
    response?: HttpResponse<unknown>;
    context?: string;
    suggestion?: string;
  });

  /**
   * Check if an error is an HttpError
   */
  static isHttpError(error: unknown): error is HttpError;

  /**
   * Check if this is an abort/cancellation error
   */
  isAborted(): boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * HTTP response type
 */
export type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';

/**
 * HTTP request method
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP client configuration
 */
export interface HttpConfig {
  /** Base URL prepended to relative request URLs */
  baseURL?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Default request headers */
  headers?: Record<string, string>;
  /** Include credentials/cookies (default: false) */
  withCredentials?: boolean;
  /** Response parsing type (default: 'json') */
  responseType?: HttpResponseType;
  /** Function to validate response status (default: status >= 200 && status < 300) */
  validateStatus?: (status: number) => boolean;
  /** Number of retry attempts on failure (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Custom retry condition function */
  retryCondition?: ((error: HttpError) => boolean) | null;
  /** URL query parameters */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Request body data */
  data?: unknown;
  /** Request URL */
  url?: string;
  /** HTTP method */
  method?: HttpMethod | string;
  /** AbortController signal for request cancellation */
  signal?: AbortSignal;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * HTTP response object
 */
export interface HttpResponse<T = unknown> {
  /** Parsed response body */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** Request configuration used */
  config: HttpConfig;
}

// ============================================================================
// Interceptor Types
// ============================================================================

/**
 * Request/response interceptor handler
 */
export interface InterceptorHandler<T> {
  fulfilled: ((value: T) => T | Promise<T>) | null;
  rejected?: ((error: unknown) => unknown) | null;
}

/**
 * Interceptor manager for request/response pipelines
 */
export declare class InterceptorManager<T = unknown> {
  /**
   * Add an interceptor
   * @param fulfilled Success handler
   * @param rejected Error handler
   * @returns Interceptor ID for removal
   */
  use(
    fulfilled: (value: T) => T | Promise<T>,
    rejected?: (error: unknown) => unknown
  ): number;

  /**
   * Remove an interceptor by ID
   */
  eject(id: number): boolean;

  /**
   * Remove all interceptors
   */
  clear(): void;

  /**
   * Number of registered interceptors
   */
  readonly size: number;

  /**
   * Whether manager has no interceptors
   */
  readonly isEmpty: boolean;

  /**
   * Get all handler IDs
   */
  readonly ids: number[];

  /**
   * Run a value through all interceptors (async pipeline)
   */
  run(value: T): Promise<T>;

  /**
   * Run a value through all interceptors (sync pipeline)
   */
  runSync(value: T): T;

  /**
   * Get handlers as array
   */
  toArray(): InterceptorHandler<T>[];

  [Symbol.iterator](): IterableIterator<InterceptorHandler<T>>;
}

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * HTTP client instance with interceptors and convenience methods
 */
export declare class HttpClient {
  /** Default configuration */
  readonly defaults: HttpConfig;

  /** Request and response interceptors */
  readonly interceptors: {
    request: InterceptorManager<HttpConfig>;
    response: InterceptorManager<HttpResponse>;
  };

  constructor(config?: HttpConfig);

  /**
   * Make an HTTP request
   * @param config Request configuration
   * @returns HTTP response
   */
  request<T = unknown>(config: HttpConfig): Promise<HttpResponse<T>>;

  /**
   * GET request
   * @param url Request URL
   * @param options Additional request options
   */
  get<T = unknown>(url: string, options?: Omit<HttpConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;

  /**
   * DELETE request
   * @param url Request URL
   * @param options Additional request options
   */
  delete<T = unknown>(url: string, options?: Omit<HttpConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;

  /**
   * HEAD request
   * @param url Request URL
   * @param options Additional request options
   */
  head<T = unknown>(url: string, options?: Omit<HttpConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;

  /**
   * OPTIONS request
   * @param url Request URL
   * @param options Additional request options
   */
  options<T = unknown>(url: string, options?: Omit<HttpConfig, 'url' | 'method'>): Promise<HttpResponse<T>>;

  /**
   * POST request
   * @param url Request URL
   * @param data Request body
   * @param options Additional request options
   */
  post<T = unknown>(url: string, data?: unknown, options?: Omit<HttpConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;

  /**
   * PUT request
   * @param url Request URL
   * @param data Request body
   * @param options Additional request options
   */
  put<T = unknown>(url: string, data?: unknown, options?: Omit<HttpConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;

  /**
   * PATCH request
   * @param url Request URL
   * @param data Request body
   * @param options Additional request options
   */
  patch<T = unknown>(url: string, data?: unknown, options?: Omit<HttpConfig, 'url' | 'method' | 'data'>): Promise<HttpResponse<T>>;

  /**
   * Create a new HttpClient instance with merged configuration
   * @param config Configuration to merge with current defaults
   * @returns New client instance
   */
  create(config?: HttpConfig): HttpClient;

  /**
   * Get the full URI for a request configuration
   * @param config Request configuration
   * @returns Full URL string
   */
  getUri(config: HttpConfig): string;

  /**
   * Check if an error was caused by request cancellation
   * @param error The error to check
   * @returns True if the error is a cancellation
   */
  isCancel(error: unknown): boolean;
}

// ============================================================================
// useHttp Hook Types
// ============================================================================

/**
 * useHttp hook options
 */
export interface UseHttpOptions<T> {
  /** Execute immediately on creation (default: true) */
  immediate?: boolean;
  /** Initial data value (default: null) */
  initialData?: T | null;
  /** Number of retry attempts (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Callback invoked on success */
  onSuccess?: (response: HttpResponse<T>) => void;
  /** Callback invoked on error */
  onError?: (error: HttpError) => void;
}

/**
 * useHttp hook return type
 */
export interface UseHttpReturn<T> {
  /** Reactive response data (extracted from response.data) */
  data: Pulse<T | null>;
  /** Reactive full response object */
  response: Pulse<HttpResponse<T> | null>;
  /** Reactive loading state */
  loading: Pulse<boolean>;
  /** Reactive error state */
  error: Pulse<HttpError | Error | null>;
  /** Reactive status */
  status: Pulse<AsyncStatus>;
  /** Execute the request */
  execute(...args: unknown[]): Promise<HttpResponse<T> | null>;
  /** Reset state to initial values */
  reset(): void;
  /** Abort current request */
  abort(): void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new HTTP client instance.
 *
 * @param config Default configuration for all requests
 * @returns HTTP client instance
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
export declare function createHttp(config?: HttpConfig): HttpClient;

/**
 * Reactive HTTP hook integrating with Pulse's useAsync.
 *
 * @param requestFn Function that returns a promise (from http.get, etc.)
 * @param options Hook options
 * @returns Reactive state and controls
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
export declare function useHttp<T = unknown>(
  requestFn: (...args: unknown[]) => Promise<HttpResponse<T>>,
  options?: UseHttpOptions<T>
): UseHttpReturn<T>;

/**
 * HTTP resource with caching (SWR pattern).
 * Integrates with useResource from async.js.
 *
 * @param key Cache key or function returning key
 * @param requestFn Function that returns an HTTP response promise
 * @param options Resource options
 * @returns Resource state and controls
 *
 * @example
 * const users = useHttpResource(
 *   'users',
 *   () => api.get('/users'),
 *   { refreshInterval: 30000, refreshOnFocus: true }
 * );
 */
export declare function useHttpResource<T = unknown>(
  key: string | (() => string),
  requestFn: () => Promise<HttpResponse<T>>,
  options?: ResourceOptions<T>
): UseResourceReturn<T>;

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Pre-configured default HTTP client instance
 */
export declare const http: HttpClient;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createHttp: typeof createHttp;
  http: typeof http;
  HttpClient: typeof HttpClient;
  HttpError: typeof HttpError;
  InterceptorManager: typeof InterceptorManager;
  useHttp: typeof useHttp;
  useHttpResource: typeof useHttpResource;
};

export default _default;
