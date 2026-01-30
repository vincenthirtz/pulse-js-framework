/**
 * Pulse Framework
 *
 * A declarative DOM framework with CSS selector-based structure
 */

// Runtime exports
export * from './runtime/index.js';

// Compiler exports
export { compile, parse, tokenize } from './compiler/index.js';

// Version
export const VERSION = '1.4.0';

// Default export
export default {
  VERSION
};
