/**
 * Pulse + LESS CSS Example
 *
 * This example demonstrates using LESS CSS preprocessor with Pulse framework.
 *
 * To run:
 * 1. (Optional) Install LESS for full styles: npm install -D less
 * 2. Serve: pulse dev
 */

import LessDemo from './LessDemo.pulse';

// Mount the demo app
LessDemo.mount('#app');

console.log('✨ Pulse + LESS Example Running!');
console.log('📦 LESS features used:');
console.log('  - Variables with @ prefix');
console.log('  - Mixins (.mixin())');
console.log('  - Parametric mixins with guards');
console.log('  - Nesting with &');
console.log('  - Color functions (lighten, darken)');
console.log('  - Mathematical operations');
