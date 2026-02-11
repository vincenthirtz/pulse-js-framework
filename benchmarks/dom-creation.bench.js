/**
 * DOM Creation Benchmarks - Pulse Framework
 *
 * Measures: el() creation, list rendering, conditional rendering
 *
 * @module benchmarks/dom-creation
 */

import { pulse, effect } from '../runtime/pulse.js';
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { el, text, list, when } from '../runtime/dom.js';
import { bench, suite } from './utils.js';

export async function runDOMCreationBenchmarks() {
  // Use MockDOMAdapter for benchmarking (no browser needed)
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);

  try {
    return await suite('DOM Creation', [
      // Simple element creation
      bench('el("div") simple (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          el('div');
        }
      }),

      // Element with classes and id
      bench('el("div.class#id") (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          el('div.container#main');
        }
      }),

      // Element with attributes
      bench('el("input[type=text]") (1000x)', () => {
        for (let i = 0; i < 1000; i++) {
          el('input[type=text]');
        }
      }),

      // Nested elements
      bench('nested el() depth=5 (100x)', () => {
        for (let i = 0; i < 100; i++) {
          el('div.root', [
            el('header.top', [
              el('h1', 'Title'),
              el('nav', [
                el('a[href=/]', 'Home'),
                el('a[href=/about]', 'About')
              ])
            ]),
            el('main', [
              el('p', 'Content')
            ])
          ]);
        }
      }),

      // Element with reactive text
      bench('el() with reactive text (100x)', () => {
        const name = pulse('Alice');
        for (let i = 0; i < 100; i++) {
          el('span', () => `Hello ${name.get()}`);
        }
      }),

      // Text node creation
      bench('text() reactive (1000x)', () => {
        const val = pulse('test');
        for (let i = 0; i < 1000; i++) {
          text(() => val.get());
        }
      }),

      // List rendering (initial)
      bench('list() initial render 100 items', () => {
        const items = pulse(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
      }),

      // List rendering (initial) 1000 items
      bench('list() initial render 1000 items', () => {
        const items = pulse(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
        list(
          () => items.get(),
          (item) => el('li', item.name),
          (item) => item.id
        );
      }, { iterations: 20 }),

      // When conditional rendering
      bench('when() toggle 100x', () => {
        const show = pulse(true);
        when(
          () => show.get(),
          () => el('div.visible', 'Shown'),
          () => el('div.hidden', 'Hidden')
        );
        for (let i = 0; i < 100; i++) {
          show.set(!show.get());
        }
      })
    ]);
  } finally {
    resetAdapter();
  }
}
