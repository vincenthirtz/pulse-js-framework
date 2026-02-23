/**
 * Pulse + Stylus CSS Example
 *
 * This example demonstrates using Stylus CSS preprocessor with Pulse framework.
 *
 * To run:
 * 1. (Optional) Install Stylus for full styles: npm install -D stylus
 * 2. Serve: pulse dev
 */

import Counter from './Counter.pulse';

// Mount the counter app
Counter.mount('#app');

console.log('✨ Pulse + Stylus Example Running!');
console.log('📦 Stylus features used:');
console.log('  - Variables without $ or @');
console.log('  - Mixins without braces');
console.log('  - Flexible syntax (no semicolons/braces needed)');
console.log('  - Nesting with &');
console.log('  - Mathematical operations');
