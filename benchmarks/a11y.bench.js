/**
 * Accessibility Benchmarks - Pulse Framework
 *
 * Measures: contrast ratio, preference checks, announcements
 *
 * @module benchmarks/a11y
 */

import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { bench, suite } from './utils.js';

let a11yModule;
try {
  a11yModule = await import('../runtime/a11y.js');
} catch {
  // A11y module not available
}

export async function runA11yBenchmarks() {
  if (!a11yModule) {
    return { name: 'A11y', results: [], timestamp: new Date().toISOString(), skipped: true };
  }

  const {
    getContrastRatio, meetsContrastRequirement,
    createAnnouncementQueue
  } = a11yModule;

  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('A11y', [
      // Contrast ratio calculations (hex)
      bench('getContrastRatio() hex (1000x)', () => {
        const colors = [
          ['#000000', '#ffffff'],
          ['#333333', '#f5f5f5'],
          ['#646cff', '#ffffff'],
          ['#ff4444', '#000000'],
          ['#1a1a2e', '#eeeeff']
        ];
        for (let i = 0; i < 1000; i++) {
          const [fg, bg] = colors[i % colors.length];
          getContrastRatio(fg, bg);
        }
      }),

      // Contrast requirement checks
      bench('meetsContrastRequirement() (1000x)', () => {
        const ratios = [1.5, 3.0, 4.5, 7.0, 10.0, 15.0, 21.0];
        for (let i = 0; i < 1000; i++) {
          const ratio = ratios[i % ratios.length];
          meetsContrastRequirement(ratio, 'AA', 'normal');
          meetsContrastRequirement(ratio, 'AA', 'large');
          meetsContrastRequirement(ratio, 'AAA', 'normal');
        }
      }),

      // Contrast ratio with RGB values
      bench('getContrastRatio() rgb (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          getContrastRatio(`rgb(${i % 256}, ${(i * 3) % 256}, ${(i * 7) % 256})`, '#ffffff');
        }
      }),

      // Announcement queue add + clear cycle
      bench('announceQueue add+clear (1000x)', () => {
        const q = createAnnouncementQueue({ minDelay: 100 });
        for (let i = 0; i < 1000; i++) {
          q.add(`Message ${i}`, { priority: 'polite' });
        }
        q.clear();
        q.dispose();
      }),

      // Contrast ratio batch (mixed formats)
      bench('getContrastRatio() mixed formats (500x)', () => {
        for (let i = 0; i < 500; i++) {
          getContrastRatio('#333', '#fff');
          getContrastRatio('#646cff', '#ffffff');
          getContrastRatio(`rgb(${i % 256}, 100, 200)`, '#000');
        }
      })
    ]);
  } finally {
    resetAdapter();
  }
}
