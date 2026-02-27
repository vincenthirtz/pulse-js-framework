/**
 * Async Primitives Benchmarks - Pulse Framework
 *
 * Measures: versioned async controller, useAsync, resource cache
 *
 * @module benchmarks/async
 */

import {
  createVersionedAsync, useAsync, useResource,
  clearResourceCache, getResourceCacheStats
} from '../runtime/async.js';
import { bench, suite } from './utils.js';

export async function runAsyncBenchmarks() {
  return await suite('Async', [
    // Versioned async controller creation
    bench('createVersionedAsync() (1000x)', () => {
      for (let i = 0; i < 1000; i++) {
        const ctrl = createVersionedAsync();
        ctrl.cleanup();
      }
    }),

    // Version begin/abort cycle (race condition detection)
    bench('versioned begin+abort cycle (1000x)', () => {
      const ctrl = createVersionedAsync();
      for (let i = 0; i < 1000; i++) {
        const ctx = ctrl.begin();
        ctx.isCurrent();
        ctrl.abort();
      }
      ctrl.cleanup();
    }),

    // useAsync creation
    bench('useAsync() creation (200x)', () => {
      for (let i = 0; i < 200; i++) {
        const async = useAsync(async () => 'result', { immediate: false });
        async.dispose();
      }
    }),

    // useAsync state reads
    bench('useAsync state reads (1000x)', () => {
      const async = useAsync(async () => 'result', { immediate: false });
      for (let i = 0; i < 1000; i++) {
        async.data.get();
        async.loading.get();
        async.error.get();
        async.status.get();
      }
      async.dispose();
    }),

    // useResource creation with cache key
    bench('useResource() creation (200x)', () => {
      for (let i = 0; i < 200; i++) {
        const resource = useResource(
          `key-${i}`,
          async () => ({ data: i }),
          { initialData: null }
        );
        if (resource.dispose) resource.dispose();
      }
      clearResourceCache();
    }),

    // Resource cache stats
    bench('getResourceCacheStats() (1000x)', () => {
      // Populate cache
      for (let i = 0; i < 10; i++) {
        useResource(`stat-key-${i}`, async () => i, { initialData: null });
      }
      for (let i = 0; i < 1000; i++) {
        getResourceCacheStats();
      }
      clearResourceCache();
    }),

    // useAsync reset cycle
    bench('useAsync reset() (500x)', () => {
      const async = useAsync(async () => 'result', { immediate: false });
      for (let i = 0; i < 500; i++) {
        async.reset();
      }
      async.dispose();
    })
  ]);
}
