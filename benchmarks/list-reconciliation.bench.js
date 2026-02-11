/**
 * List Reconciliation Benchmarks - Pulse Framework
 *
 * Measures: LIS algorithm, keyed diffing, reordering, append, prepend, remove
 *
 * @module benchmarks/list-reconciliation
 */

import { pulse } from '../runtime/pulse.js';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { el, list } from '../runtime/dom.js';
import { computeLIS } from '../runtime/dom-list.js';
import { bench, suite } from './utils.js';

export async function runListReconciliationBenchmarks() {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('List Reconciliation', [
      // Pure LIS algorithm
      bench('computeLIS n=100', () => {
        const arr = Array.from({ length: 100 }, () => Math.floor(Math.random() * 100));
        computeLIS(arr);
      }),

      bench('computeLIS n=1000', () => {
        const arr = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1000));
        computeLIS(arr);
      }),

      // Append items
      bench('list append 10 items (to 100)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        // Append 10 items
        const newData = [...data, ...Array.from({ length: 10 }, (_, i) => ({ id: 100 + i, name: `New ${i}` }))];
        items.set(newData);
      }),

      // Prepend items
      bench('list prepend 10 items (to 100)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        // Prepend 10 items
        const newItems = Array.from({ length: 10 }, (_, i) => ({ id: 1000 + i, name: `Pre ${i}` }));
        items.set([...newItems, ...data]);
      }),

      // Remove items
      bench('list remove 10 items (from 100)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        // Remove first 10
        items.set(data.slice(10));
      }),

      // Reorder (reverse)
      bench('list reverse 100 items', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        items.set([...data].reverse());
      }),

      // Reorder (shuffle)
      bench('list shuffle 100 items', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        // Fisher-Yates shuffle
        const shuffled = [...data];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        items.set(shuffled);
      }),

      // Swap two items
      bench('list swap 2 items (in 100)', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        const swapped = [...data];
        [swapped[0], swapped[99]] = [swapped[99], swapped[0]];
        items.set(swapped);
      }),

      // Clear and repopulate
      bench('list clear + repopulate 100 items', () => {
        const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
        const items = pulse(data);
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
        items.set([]);
        items.set(data);
      })
    ]);
  } finally {
    resetAdapter();
  }
}
