/**
 * SSR Benchmarks - Pulse Framework
 *
 * Measures: renderToString, renderToStringSync, serialization
 *
 * @module benchmarks/ssr
 */

import { pulse, computed } from '../runtime/pulse.js';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { el, list, when } from '../runtime/dom.js';
import { bench, suite } from './utils.js';

// SSR imports (may not be available in all environments)
let renderToStringSync, serializeState;
try {
  const ssr = await import('../runtime/ssr.js');
  renderToStringSync = ssr.renderToStringSync;
  serializeState = ssr.serializeState;
} catch {
  // SSR module not available
}

export async function runSSRBenchmarks() {
  if (!renderToStringSync) {
    return { name: 'SSR', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  return await suite('SSR', [
    // Simple component render
    bench('renderToStringSync simple component', () => {
      renderToStringSync(() =>
        el('div.app', [
          el('h1', 'Hello World'),
          el('p', 'Welcome to Pulse')
        ])
      );
    }),

    // Component with reactive state
    bench('renderToStringSync with state', () => {
      renderToStringSync(() => {
        const count = pulse(42);
        return el('div', [
          el('span', () => `Count: ${count.get()}`),
          el('button', 'Click')
        ]);
      });
    }),

    // List rendering in SSR
    bench('renderToStringSync list 100 items', () => {
      renderToStringSync(() => {
        const items = pulse(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
        return el('ul',
          list(
            () => items.get(),
            (item) => el('li', item.name),
            (item) => item.id
          )
        );
      });
    }, { iterations: 20 }),

    // State serialization
    bench('serializeState (small)', () => {
      serializeState({
        user: { name: 'Alice', age: 30 },
        settings: { theme: 'dark', lang: 'en' }
      });
    }),

    // State serialization (large)
    bench('serializeState (100 items)', () => {
      const state = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          active: i % 2 === 0,
          createdAt: new Date().toISOString()
        }))
      };
      serializeState(state);
    })
  ]);
}
