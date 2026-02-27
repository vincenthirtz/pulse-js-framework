/**
 * Store Benchmarks - Pulse Framework
 *
 * Measures: store creation, state reads/writes, actions, getters, combining
 *
 * @module benchmarks/store
 */

import { createStore, createActions, createGetters, combineStores } from '../runtime/store.js';
import { effect } from '../runtime/pulse.js';
import { bench, suite } from './utils.js';

export async function runStoreBenchmarks() {
  return await suite('Store', [
    // Store creation
    bench('createStore() 10 props', () => {
      const state = {};
      for (let i = 0; i < 10; i++) state[`prop${i}`] = i;
      createStore(state);
    }),

    bench('createStore() 100 props', () => {
      const state = {};
      for (let i = 0; i < 100; i++) state[`prop${i}`] = i;
      createStore(state);
    }, { iterations: 50 }),

    // Read performance
    bench('store.get() read (10000x)', () => {
      const store = createStore({ count: 0, name: 'test', active: true });
      for (let i = 0; i < 10000; i++) {
        store.count.get();
        store.name.get();
        store.active.get();
      }
    }),

    // Write performance
    bench('store.set() write (1000x)', () => {
      const store = createStore({ count: 0 });
      for (let i = 0; i < 1000; i++) {
        store.count.set(i);
      }
    }),

    // Write with effect subscriber
    bench('store.set() with effect (1000x)', () => {
      const store = createStore({ count: 0 });
      let sum = 0;
      const dispose = effect(() => { sum += store.count.get(); });
      for (let i = 0; i < 1000; i++) {
        store.count.set(i);
      }
      dispose();
    }),

    // Batch update
    bench('$setState() batch 10 props', () => {
      const state = {};
      for (let i = 0; i < 10; i++) state[`prop${i}`] = 0;
      const store = createStore(state);
      for (let i = 0; i < 100; i++) {
        const update = {};
        for (let j = 0; j < 10; j++) update[`prop${j}`] = i * 10 + j;
        store.$setState(update);
      }
    }),

    // Actions
    bench('createActions() dispatch (1000x)', () => {
      const store = createStore({ count: 0 });
      const actions = createActions(store, {
        increment: (s) => s.count.update(n => n + 1),
        decrement: (s) => s.count.update(n => n - 1)
      });
      for (let i = 0; i < 1000; i++) {
        actions.increment();
      }
    }),

    // Computed getters
    bench('createGetters() access (1000x)', () => {
      const store = createStore({ count: 5, multiplier: 3 });
      const getters = createGetters(store, {
        doubled: (s) => s.count.get() * 2,
        tripled: (s) => s.count.get() * s.multiplier.get()
      });
      for (let i = 0; i < 1000; i++) {
        getters.doubled.get();
        getters.tripled.get();
      }
    }),

    // Combine stores
    bench('combineStores() 5 modules', () => {
      const stores = {};
      for (let i = 0; i < 5; i++) {
        stores[`module${i}`] = createStore({
          value: i,
          label: `Module ${i}`,
          active: true
        });
      }
      combineStores(stores);
    }, { iterations: 50 })
  ]);
}
