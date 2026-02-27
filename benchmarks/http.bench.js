/**
 * HTTP Client Benchmarks - Pulse Framework
 *
 * Measures: client creation, URL building, interceptor chains, header merging
 *
 * @module benchmarks/http
 */

import { bench, suite } from './utils.js';

let httpModule;
try {
  httpModule = await import('../runtime/http.js');
} catch {
  // HTTP module not available
}

export async function runHTTPBenchmarks() {
  if (!httpModule) {
    return { name: 'HTTP', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  const { createHttp } = httpModule;

  return await suite('HTTP', [
    // Client creation
    bench('createHttp() (500x)', () => {
      for (let i = 0; i < 500; i++) {
        createHttp({
          baseURL: 'https://api.example.com',
          timeout: 5000,
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token123' }
        });
      }
    }),

    // Derived client creation (merging configs)
    bench('client.create() derived (500x)', () => {
      const base = createHttp({
        baseURL: 'https://api.example.com',
        headers: { 'Content-Type': 'application/json' }
      });
      for (let i = 0; i < 500; i++) {
        base.create({
          headers: { 'Authorization': `Bearer token-${i}` },
          timeout: 3000
        });
      }
    }),

    // URL building with params
    bench('client.getUri() (1000x)', () => {
      const client = createHttp({ baseURL: 'https://api.example.com' });
      for (let i = 0; i < 1000; i++) {
        client.getUri({
          url: '/users',
          params: { page: i, limit: 20, sort: 'name', order: 'asc', q: 'search term' }
        });
      }
    }),

    // Interceptor registration
    bench('interceptor use() (1000x)', () => {
      const client = createHttp({ baseURL: 'https://api.example.com' });
      for (let i = 0; i < 1000; i++) {
        client.interceptors.request.use(
          (config) => ({ ...config, headers: { ...config.headers, 'X-Request-ID': `${i}` } })
        );
      }
    }),

    // Multiple interceptors + eject
    bench('interceptor use+eject cycle (500x)', () => {
      const client = createHttp({ baseURL: 'https://api.example.com' });
      for (let i = 0; i < 500; i++) {
        const id = client.interceptors.request.use((config) => config);
        client.interceptors.request.eject(id);
      }
    }),

    // isCancel check
    bench('client.isCancel() (1000x)', () => {
      const client = createHttp();
      const err = new Error('cancelled');
      err.name = 'AbortError';
      const normalErr = new Error('network error');
      for (let i = 0; i < 1000; i++) {
        client.isCancel(err);
        client.isCancel(normalErr);
      }
    })
  ]);
}
