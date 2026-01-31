/**
 * Pulse Transformer - Code generator
 *
 * This file re-exports from the modular transformer structure.
 * The transformer has been split into separate modules for better maintainability:
 *
 * - transformer/index.js      - Main Transformer class
 * - transformer/constants.js  - Shared constants
 * - transformer/imports.js    - Import generation
 * - transformer/state.js      - State/props transformation
 * - transformer/router.js     - Router transformation
 * - transformer/store.js      - Store transformation
 * - transformer/expressions.js - Expression transformation
 * - transformer/view.js       - View/element transformation
 * - transformer/style.js      - Style transformation
 * - transformer/export.js     - Export generation
 *
 * @module pulse-js-framework/compiler/transformer
 */

// Re-export everything from the modular implementation
export { Transformer, transform } from './transformer/index.js';
export { default } from './transformer/index.js';
