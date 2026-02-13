/**
 * Pulse Parser - Backward Compatibility Export
 *
 * This file maintains backward compatibility by re-exporting from parser/
 * The actual implementation has been split into focused sub-modules:
 *   - parser/core.js - NodeType, ASTNode, Parser class with utility methods
 *   - parser/imports.js - Import, page, and route declaration parsing
 *   - parser/state.js - Props block, state block, and value/literal parsing
 *   - parser/view.js - View block, elements, text nodes, and directives
 *   - parser/expressions.js - Expression parsing with precedence climbing
 *   - parser/style.js - CSS parsing with preprocessor support
 *   - parser/blocks.js - Actions, router, store blocks, and function parsing
 *
 * @deprecated Import from 'pulse-js-framework/compiler/parser/index.js' instead
 * @module pulse-js-framework/compiler/parser
 */

export * from './parser/index.js';
export { default } from './parser/index.js';
