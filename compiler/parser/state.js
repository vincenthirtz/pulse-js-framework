/**
 * Pulse Parser - Props/State Block Parsing
 *
 * Handles parsing of props and state blocks with their properties
 *
 * @module compiler/parser/state
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// ============================================================
// Props Block Parsing
// ============================================================

/**
 * Parse props block
 * props {
 *   label: "Default"
 *   disabled: false
 * }
 */
Parser.prototype.parsePropsBlock = function() {
  this.expect(TokenType.PROPS);
  this.expect(TokenType.LBRACE);

  const properties = [];
  while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
    properties.push(this.parsePropsProperty());
  }

  this.expect(TokenType.RBRACE);
  return new ASTNode(NodeType.PropsBlock, { properties });
};

/**
 * Parse a props property (name: defaultValue)
 */
Parser.prototype.parsePropsProperty = function() {
  const name = this.expect(TokenType.IDENT);
  this.expect(TokenType.COLON);
  const value = this.parseValue();
  return new ASTNode(NodeType.Property, { name: name.value, value });
};

// ============================================================
// State Block Parsing
// ============================================================

/**
 * Parse state block
 */
Parser.prototype.parseStateBlock = function() {
  this.expect(TokenType.STATE);
  this.expect(TokenType.LBRACE);

  const properties = [];
  while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
    properties.push(this.parseStateProperty());
  }

  this.expect(TokenType.RBRACE);
  return new ASTNode(NodeType.StateBlock, { properties });
};

/**
 * Parse a state property
 */
Parser.prototype.parseStateProperty = function() {
  const name = this.expect(TokenType.IDENT);
  this.expect(TokenType.COLON);
  const value = this.parseValue();
  return new ASTNode(NodeType.Property, { name: name.value, value });
};

// ============================================================
// Value Parsing Utilities
// ============================================================

/**
 * Try to parse a literal token (STRING, NUMBER, TRUE, FALSE, NULL)
 * Returns the AST node or null if not a literal
 */
Parser.prototype.tryParseLiteral = function() {
  const token = this.current();
  if (!token) return null;

  const literalMap = {
    [TokenType.STRING]: () => new ASTNode(NodeType.Literal, { value: this.advance().value, raw: token.raw }),
    [TokenType.NUMBER]: () => new ASTNode(NodeType.Literal, { value: this.advance().value }),
    [TokenType.TRUE]: () => (this.advance(), new ASTNode(NodeType.Literal, { value: true })),
    [TokenType.FALSE]: () => (this.advance(), new ASTNode(NodeType.Literal, { value: false })),
    [TokenType.NULL]: () => (this.advance(), new ASTNode(NodeType.Literal, { value: null }))
  };

  return literalMap[token.type]?.() || null;
};

/**
 * Parse a value (literal, object, array, etc.)
 */
Parser.prototype.parseValue = function() {
  if (this.is(TokenType.LBRACE)) return this.parseObjectLiteral();
  if (this.is(TokenType.LBRACKET)) return this.parseArrayLiteral();

  const literal = this.tryParseLiteral();
  if (literal) return literal;

  if (this.is(TokenType.IDENT)) return this.parseIdentifierOrExpression();

  throw this.createError(
    `Unexpected token ${this.current()?.type} in value`
  );
};

/**
 * Parse object literal
 */
Parser.prototype.parseObjectLiteral = function() {
  this.expect(TokenType.LBRACE);
  const properties = [];

  while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
    const name = this.expect(TokenType.IDENT);
    this.expect(TokenType.COLON);
    const value = this.parseValue();
    properties.push(new ASTNode(NodeType.Property, { name: name.value, value }));

    if (this.is(TokenType.COMMA)) {
      this.advance();
    }
  }

  this.expect(TokenType.RBRACE);
  return new ASTNode(NodeType.ObjectLiteral, { properties });
};

/**
 * Parse array literal
 */
Parser.prototype.parseArrayLiteral = function() {
  this.expect(TokenType.LBRACKET);
  const elements = [];

  while (!this.is(TokenType.RBRACKET) && !this.is(TokenType.EOF)) {
    elements.push(this.parseValue());

    if (this.is(TokenType.COMMA)) {
      this.advance();
    }
  }

  this.expect(TokenType.RBRACKET);
  return new ASTNode(NodeType.ArrayLiteral, { elements });
};
