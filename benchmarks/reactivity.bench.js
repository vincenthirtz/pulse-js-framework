/**
 * Reactivity Benchmarks - Pulse Framework
 *
 * Measures: pulse creation, get/set, effects, computed, batch, dependency tracking
 *
 * @module benchmarks/reactivity
 */

import { pulse, effect, computed, batch } from '../runtime/pulse.js';
import { bench, suite } from './utils.js';

export async function runReactivityBenchmarks() {
  return suite('Reactivity', [
    // Pulse creation
    bench('pulse creation (1000x)', () => {
      for (let i = 0; i < 1000; i++) {
        pulse(i);
      }
    }),

    // Pulse get (no effect context)
    bench('pulse.get() standalone (10000x)', () => {
      const p = pulse(42);
      for (let i = 0; i < 10000; i++) {
        p.get();
      }
    }),

    // Pulse set (no subscribers)
    bench('pulse.set() no subscribers (10000x)', () => {
      const p = pulse(0);
      for (let i = 0; i < 10000; i++) {
        p.set(i);
      }
    }),

    // Pulse set with single subscriber
    bench('pulse.set() + 1 effect (1000x)', () => {
      const p = pulse(0);
      const dispose = effect(() => p.get());
      for (let i = 0; i < 1000; i++) {
        p.set(i);
      }
      dispose();
    }),

    // Pulse set with multiple subscribers
    bench('pulse.set() + 10 effects (1000x)', () => {
      const p = pulse(0);
      const disposers = [];
      for (let j = 0; j < 10; j++) {
        disposers.push(effect(() => p.get()));
      }
      for (let i = 0; i < 1000; i++) {
        p.set(i);
      }
      for (const d of disposers) d();
    }),

    // Repeated reads of same pulse in effect (tests generation counter)
    bench('pulse.get() repeated in effect (100x reads)', () => {
      const p = pulse(0);
      const dispose = effect(() => {
        for (let i = 0; i < 100; i++) {
          p.get();
        }
      });
      for (let i = 0; i < 100; i++) {
        p.set(i);
      }
      dispose();
    }),

    // Computed creation
    bench('computed creation (1000x)', () => {
      const p = pulse(0);
      const computeds = [];
      for (let i = 0; i < 1000; i++) {
        computeds.push(computed(() => p.get() * 2));
      }
      for (const c of computeds) c.dispose();
    }),

    // Computed chain
    bench('computed chain depth=10 (100x updates)', () => {
      const p = pulse(0);
      let prev = p;
      const computeds = [];
      for (let i = 0; i < 10; i++) {
        const c = computed(() => prev.get() + 1);
        computeds.push(c);
        prev = c;
      }
      const dispose = effect(() => prev.get());
      for (let i = 0; i < 100; i++) {
        p.set(i);
      }
      dispose();
      for (const c of computeds) c.dispose();
    }),

    // Batch performance
    bench('batch 100 pulses', () => {
      const pulses = [];
      for (let i = 0; i < 100; i++) {
        pulses.push(pulse(0));
      }
      const dispose = effect(() => {
        for (const p of pulses) p.get();
      });
      batch(() => {
        for (let i = 0; i < 100; i++) {
          pulses[i].set(i + 1);
        }
      });
      dispose();
    }),

    // Diamond dependency pattern
    bench('diamond deps (A -> B,C -> D) 100x', () => {
      const a = pulse(0);
      const b = computed(() => a.get() + 1);
      const c = computed(() => a.get() * 2);
      const dispose = effect(() => b.get() + c.get());
      for (let i = 0; i < 100; i++) {
        a.set(i);
      }
      dispose();
      b.dispose();
      c.dispose();
    }),

    // Many independent pulses read in one effect
    bench('effect reads 50 pulses (100x updates)', () => {
      const pulses = [];
      for (let i = 0; i < 50; i++) {
        pulses.push(pulse(i));
      }
      const dispose = effect(() => {
        let sum = 0;
        for (const p of pulses) sum += p.get();
        return sum;
      });
      for (let i = 0; i < 100; i++) {
        pulses[0].set(i);
      }
      dispose();
    })
  ]);
}
