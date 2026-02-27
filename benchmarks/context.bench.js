/**
 * Context API Benchmarks - Pulse Framework
 *
 * Measures: context creation, provider nesting, value access, selectors
 *
 * @module benchmarks/context
 */

import { pulse, effect } from '../runtime/pulse.js';
import {
  createContext, Provider, useContext, Consumer,
  useContextSelector, provideMany, disposeContext
} from '../runtime/context.js';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { bench, suite } from './utils.js';

export async function runContextBenchmarks() {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('Context', [
      // Context creation
      bench('createContext() (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          createContext(`default-${i}`, { displayName: `ctx-${i}` });
        }
      }),

      // Provider + useContext cycle
      bench('Provider + useContext (500x)', () => {
        const ctx = createContext('initial');
        for (let i = 0; i < 500; i++) {
          Provider(ctx, `value-${i}`, () => {
            const val = useContext(ctx);
            val.get();
          });
        }
        disposeContext(ctx);
      }),

      // Nested providers (depth=10)
      bench('nested Provider depth=10 (100x)', () => {
        const ctx = createContext(0);
        for (let i = 0; i < 100; i++) {
          let render = () => {
            const val = useContext(ctx);
            return val.get();
          };
          for (let d = 10; d >= 1; d--) {
            const inner = render;
            render = () => Provider(ctx, d, inner);
          }
          render();
        }
        disposeContext(ctx);
      }),

      // useContext read performance
      bench('useContext().get() read (1000x)', () => {
        const ctx = createContext('test-value');
        Provider(ctx, 'provided-value', () => {
          const val = useContext(ctx);
          for (let i = 0; i < 1000; i++) {
            val.get();
          }
        });
        disposeContext(ctx);
      }),

      // Consumer pattern
      bench('Consumer() (500x)', () => {
        const ctx = createContext('default');
        for (let i = 0; i < 500; i++) {
          Provider(ctx, `val-${i}`, () => {
            Consumer(ctx, (value) => value);
          });
        }
        disposeContext(ctx);
      }),

      // useContextSelector with multiple contexts
      bench('useContextSelector() 3 contexts (500x)', () => {
        const ctx1 = createContext(1);
        const ctx2 = createContext(2);
        const ctx3 = createContext(3);
        Provider(ctx1, 10, () => {
          Provider(ctx2, 20, () => {
            Provider(ctx3, 30, () => {
              for (let i = 0; i < 500; i++) {
                const derived = useContextSelector(
                  (a, b, c) => a + b + c,
                  ctx1, ctx2, ctx3
                );
                derived.get();
              }
            });
          });
        });
        disposeContext(ctx1);
        disposeContext(ctx2);
        disposeContext(ctx3);
      }),

      // provideMany
      bench('provideMany() 5 contexts (200x)', () => {
        const contexts = Array.from({ length: 5 }, (_, i) =>
          [createContext(0), i * 10]
        );
        for (let i = 0; i < 200; i++) {
          provideMany(contexts, () => {
            for (const [ctx] of contexts) {
              useContext(ctx).get();
            }
          });
        }
        for (const [ctx] of contexts) {
          disposeContext(ctx);
        }
      })
    ]);
  } finally {
    resetAdapter();
  }
}
