/**
 * Pulse Parser - Import/Page/Route Declaration Parsing
 *
 * Handles parsing of import statements and @page/@route decorators
 *
 * @module compiler/parser/imports
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// ============================================================
// Import Declaration Parsing
// ============================================================

/**
 * Parse import declaration
 * Supports:
 *   import Component from './Component.pulse'
 *   import { helper, util } from './utils.pulse'
 *   import { helper as h } from './utils.pulse'
 *   import * as Utils from './utils.pulse'
 */
Parser.prototype.parseImportDeclaration = function() {
  const startToken = this.expect(TokenType.IMPORT);
  const specifiers = [];
  let source = null;

  // import * as Name from '...'
  if (this.is(TokenType.STAR)) {
    this.advance();
    this.expect(TokenType.AS);
    const local = this.expect(TokenType.IDENT);
    specifiers.push(new ASTNode(NodeType.ImportSpecifier, {
      type: 'namespace',
      local: local.value,
      imported: '*'
    }));
  }
  // import { a, b } from '...'
  else if (this.is(TokenType.LBRACE)) {
    this.advance();
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      const imported = this.expect(TokenType.IDENT);
      let local = imported.value;

      // Handle 'as' alias
      if (this.is(TokenType.AS)) {
        this.advance();
        local = this.expect(TokenType.IDENT).value;
      }

      specifiers.push(new ASTNode(NodeType.ImportSpecifier, {
        type: 'named',
        local,
        imported: imported.value
      }));

      if (this.is(TokenType.COMMA)) {
        this.advance();
      }
    }
    this.expect(TokenType.RBRACE);
  }
  // import DefaultExport from '...'
  else if (this.is(TokenType.IDENT)) {
    const name = this.advance();
    specifiers.push(new ASTNode(NodeType.ImportSpecifier, {
      type: 'default',
      local: name.value,
      imported: 'default'
    }));
  }

  // from '...'
  this.expect(TokenType.FROM);
  const sourceToken = this.expect(TokenType.STRING);
  source = sourceToken.value;

  return new ASTNode(NodeType.ImportDeclaration, {
    specifiers,
    source,
    line: startToken.line,
    column: startToken.column
  });
};

// ============================================================
// Page/Route Declaration Parsing
// ============================================================

/**
 * Parse @page declaration
 */
Parser.prototype.parsePageDeclaration = function() {
  this.expect(TokenType.PAGE);
  const name = this.expect(TokenType.IDENT);
  return new ASTNode(NodeType.PageDeclaration, { name: name.value });
};

/**
 * Parse @route declaration
 */
Parser.prototype.parseRouteDeclaration = function() {
  this.expect(TokenType.ROUTE);
  const path = this.expect(TokenType.STRING);
  return new ASTNode(NodeType.RouteDeclaration, { path: path.value });
};
