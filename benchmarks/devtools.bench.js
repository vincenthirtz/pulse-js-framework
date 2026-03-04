/**
 * DevTools Benchmarks - Pulse Framework
 *
 * Measures: tracked pulses, snapshots, time-travel, dependency graph
 *
 * @module benchmarks/devtools
 */

import { pulse, effect, computed } from '../runtime/pulse.js';
import { bench, suite } from './utils.js';

let devtoolsModule;
try {
  devtoolsModule = await import('../runtime/devtools.js');
} catch {
  // DevTools module not available
}

export async function runDevToolsBenchmarks() {
  if (!devtoolsModule) {
    return { name: 'DevTools', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  const {
    trackedPulse, takeSnapshot, getHistory, travelTo,
    clearHistory, getDependencyGraph, profile, resetDevTools,
    enableDevTools, disableDevTools
  } = devtoolsModule;

  return await suite('DevTools', [
    // Tracked pulse creation
    bench('trackedPulse() creation (1000x)', () => {
      for (let i = 0; i < 1000; i++) {
        trackedPulse(i, `pulse-${i}`);
      }
      resetDevTools();
    }),

    // Tracked pulse updates
    bench('trackedPulse set() (1000x)', () => {
      const p = trackedPulse(0, 'counter');
      for (let i = 0; i < 1000; i++) {
        p.set(i);
      }
      resetDevTools();
    }),

    // Snapshot creation
    bench('takeSnapshot() (500x)', () => {
      const p1 = trackedPulse(0, 'a');
      const p2 = trackedPulse('hello', 'b');
      for (let i = 0; i < 500; i++) {
        p1.set(i);
        takeSnapshot(`update-${i}`);
      }
      resetDevTools();
    }),

    // Time travel navigation
    bench('travelTo() back/forward (500x)', () => {
      const p = trackedPulse(0, 'nav');
      // Create 50 snapshots
      for (let i = 0; i < 50; i++) {
        p.set(i);
        takeSnapshot(`step-${i}`);
      }
      // Travel back and forth
      for (let i = 0; i < 500; i++) {
        travelTo(i % 50);
      }
      resetDevTools();
    }),

    // History retrieval
    bench('getHistory() (1000x)', () => {
      const p = trackedPulse(0, 'hist');
      for (let i = 0; i < 20; i++) {
        p.set(i);
        takeSnapshot(`s-${i}`);
      }
      for (let i = 0; i < 1000; i++) {
        getHistory();
      }
      resetDevTools();
    }),

    // Dependency graph generation
    bench('getDependencyGraph() (200x)', () => {
      const a = trackedPulse(1, 'a');
      const b = trackedPulse(2, 'b');
      const c = computed(() => a.get() + b.get());
      const d = computed(() => c.get() * 2);
      const dispose = effect(() => d.get());
      for (let i = 0; i < 200; i++) {
        getDependencyGraph();
      }
      dispose();
      resetDevTools();
    }),

    // Profile function execution
    bench('profile() (500x)', () => {
      const fn = () => {
        let sum = 0;
        for (let i = 0; i < 100; i++) sum += i;
        return sum;
      };
      for (let i = 0; i < 500; i++) {
        profile(`work-${i}`, fn);
      }
      resetDevTools();
    })
  ]);
}
