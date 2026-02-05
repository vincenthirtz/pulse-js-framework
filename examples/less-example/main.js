/**
 * Pulse + LESS CSS Example
 *
 * This example demonstrates using LESS CSS preprocessor with Pulse framework.
 *
 * To run:
 * 1. Install LESS: npm install -D less
 * 2. Compile: pulse compile LessDemo.pulse
 * 3. Serve: pulse dev
 */

import { mount } from '../../runtime/dom.js';
import LessDemo from './LessDemo.js';

// Mount the demo app
mount('#app', LessDemo());

console.log('✨ Pulse + LESS Example Running!');
console.log('📦 LESS features used:');
console.log('  - Variables with @ prefix');
console.log('  - Mixins (.mixin())');
console.log('  - Parametric mixins with guards');
console.log('  - Nesting with &');
console.log('  - Color functions (lighten, darken)');
console.log('  - Mathematical operations');
