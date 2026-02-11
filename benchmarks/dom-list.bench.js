/**
 * DOM List Feature Benchmarks - Pulse Framework
 *
 * Measures: event delegation, element recycling, virtual scrolling
 * Compares against plain list() for the same operations.
 *
 * @module benchmarks/dom-list
 */

import { pulse } from '../runtime/pulse.js';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { el, list, delegatedList, createElementPool, resetPool } from '../runtime/dom.js';
import { bench, suite } from './utils.js';

export async function runDOMListBenchmarks() {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('DOM List Features', [
      // ---- Element Recycling ----

      bench('list (no recycle) remove+add 50 items', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        // Remove first 50, add 50 new
        items.set([
          ...data.slice(50),
          ...Array.from({ length: 50 }, (_, i) => ({ id: 200 + i, name: `New ${i}` }))
        ]);
      }),

      bench('list (recycle) remove+add 50 items', () => {
        resetPool();
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id,
          { recycle: true }
        );
        // Remove first 50, add 50 new — pool should recycle the <li> elements
        items.set([
          ...data.slice(50),
          ...Array.from({ length: 50 }, (_, i) => ({ id: 200 + i, name: `New ${i}` }))
        ]);
        resetPool();
      }),

      // ---- Event Delegation ----

      bench('list() + individual handlers (100 items)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => {
            const li = el('li', item.name);
            // Individual click handler per item
            if (li.addEventListener) li.addEventListener('click', () => {});
            return li;
          },
          (item) => item.id
        );
      }),

      bench('delegatedList() single handler (100 items)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        const frag = delegatedList(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id,
          { on: { click: () => {} } }
        );
      }),

      // ---- Delegation + Recycling combined ----

      bench('delegatedList() + recycle (100 items, churn 50)', () => {
        resetPool();
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        delegatedList(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id,
          { on: { click: () => {} }, recycle: true }
        );
        // Churn 50 items
        items.set([
          ...data.slice(50),
          ...Array.from({ length: 50 }, (_, i) => ({ id: 200 + i, name: `New ${i}` }))
        ]);
        resetPool();
      }),

      // ---- Element Pool acquire/release cycle ----

      bench('pool acquire+release cycle (1000x)', () => {
        const pool = createElementPool();
        const elements = [];
        // First fill the pool
        for (let i = 0; i < 100; i++) {
          const el = mockAdapter.createElement('li');
          pool.release(el);
        }
        // Then acquire and release in cycles
        for (let i = 0; i < 1000; i++) {
          const el = pool.acquire('li');
          pool.release(el);
        }
        pool.clear();
      })
    ]);
  } finally {
    resetAdapter();
  }
}
