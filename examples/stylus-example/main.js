/**
 * Pulse + Stylus CSS Example
 *
 * This example demonstrates using Stylus CSS preprocessor with Pulse framework.
 *
 * To run:
 * 1. Install Stylus: npm install -D stylus
 * 2. Compile: pulse compile Counter.pulse
 * 3. Serve: pulse dev
 */

import { mount } from '../../runtime/dom.js';
import Counter from './Counter.js';

// Mount the counter app
mount('#app', Counter());

console.log('✨ Pulse + Stylus Example Running!');
console.log('📦 Stylus features used:');
console.log('  - Variables without $ or @');
console.log('  - Mixins without braces');
console.log('  - Flexible syntax (no semicolons/braces needed)');
console.log('  - Nesting with &');
console.log('  - Mathematical operations');
