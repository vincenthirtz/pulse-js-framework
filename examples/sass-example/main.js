/**
 * Pulse + SASS/SCSS CSS Example
 *
 * This example demonstrates using SASS/SCSS CSS preprocessor with Pulse framework.
 * SASS is the most widely-used CSS preprocessor, offering variables, nesting,
 * mixins, functions, and modular architecture.
 *
 * To run:
 * 1. (Optional) Install SASS for full styles: npm install -D sass
 * 2. Serve: pulse dev
 */

import SassDemo from './SassDemo.pulse';

// Mount the demo app
SassDemo.mount('#app');

console.log('✨ Pulse + SASS/SCSS Example Running!');
console.log('📦 SASS features used:');
console.log('  - Variables with $prefix');
console.log('  - @mixin / @include');
console.log('  - Nesting with & parent reference');
console.log('  - @extend for inheritance');
console.log('  - Color functions (lighten, darken, mix)');
console.log('  - Mathematical operations');
console.log('  - @if / @else conditionals');
console.log('  - @each and @for loops');
