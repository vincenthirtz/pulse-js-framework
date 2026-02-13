/**
 * Pulse Parser - Main Entry Point
 *
 * Barrel export for all parser modules
 * Assembles the complete Parser class by importing all method modules
 *
 * @module compiler/parser
 */

import { tokenize } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// Import all parser method modules (these add methods to Parser.prototype)
import './imports.js';      // parseImportDeclaration, parsePageDeclaration, parseRouteDeclaration
import './state.js';        // parsePropsBlock, parseStateBlock, parseValue, etc.
import './view.js';         // parseViewBlock, parseElement, parseDirective, etc.
import './expressions.js';  // parseExpression, parseAssignmentExpression, etc.
import './blocks.js';       // parseActionsBlock, parseRouterBlock, parseStoreBlock, etc.
import './style.js';        // parseStyleBlock, parseStyleRule, parseStyleProperty

// ============================================================
// Main Parse Function
// ============================================================

/**
 * Parse .pulse source code into an AST
 * @param {string} source - Source code to parse
 * @returns {ASTNode} Program AST node
 */
export function parse(source) {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}

// ============================================================
// Exports
// ============================================================

export { NodeType, ASTNode, Parser };

export default {
  NodeType,
  ASTNode,
  Parser,
  parse
};
