/**
 * Pulse Framework - Lite Build
 * @module pulse-js-framework/runtime/lite
 *
 * Minimal bundle (~5KB gzipped) with core reactivity and DOM helpers.
 * Use this for simple apps that don't need router or store.
 *
 * @example
 * import { pulse, effect, el, mount } from 'pulse-js-framework/runtime/lite';
 *
 * const count = pulse(0);
 * const app = el('div', [
 *   el('h1', () => `Count: ${count.get()}`),
 *   el('button', { onclick: () => count.update(n => n + 1) }, 'Increment')
 * ]);
 * mount('#app', app);
 */

// Core reactivity - essential
export {
  pulse,
  effect,
  computed,
  batch,
  onCleanup,
  untrack
} from './pulse.js';

// DOM helpers - essential
export {
  el,
  text,
  mount,
  on,
  bind,
  list,
  when,
  model
} from './dom.js';

// Minimal re-exports for common patterns
export { show, cls, style, prop } from './dom.js';
