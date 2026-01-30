/**
 * Pulse Framework
 *
 * A declarative DOM framework with CSS selector-based structure
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Runtime exports
export * from './runtime/index.js';

// Compiler exports
export { compile, parse, tokenize } from './compiler/index.js';

// Version - read dynamically from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
export const VERSION = pkg.version;

// Default export
export default {
  VERSION
};
