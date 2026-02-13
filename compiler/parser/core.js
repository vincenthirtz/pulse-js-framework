/**
 * Pulse Parser Core - Base parser infrastructure
 *
 * Contains NodeType constants, ASTNode class, and base Parser class with utility methods
 *
 * @module compiler/parser/core
 */

import { TokenType } from '../lexer.js';
import { ParserError, SUGGESTIONS, getDocsUrl } from '../../runtime/errors.js';

// ============================================================
// AST Node Types
// ============================================================

export const NodeType = {
  Program: 'Program',
  ImportDeclaration: 'ImportDeclaration',
  ImportSpecifier: 'ImportSpecifier',
  PageDeclaration: 'PageDeclaration',
  RouteDeclaration: 'RouteDeclaration',
  PropsBlock: 'PropsBlock',
  StateBlock: 'StateBlock',
  ViewBlock: 'ViewBlock',
  ActionsBlock: 'ActionsBlock',
  StyleBlock: 'StyleBlock',
  SlotElement: 'SlotElement',
  Element: 'Element',
  TextNode: 'TextNode',
  Interpolation: 'Interpolation',
  Directive: 'Directive',
  IfDirective: 'IfDirective',
  EachDirective: 'EachDirective',
  EventDirective: 'EventDirective',
  ModelDirective: 'ModelDirective',

  // Accessibility directives
  A11yDirective: 'A11yDirective',
  LiveDirective: 'LiveDirective',
  FocusTrapDirective: 'FocusTrapDirective',

  // SSR directives
  ClientDirective: 'ClientDirective',
  ServerDirective: 'ServerDirective',

  Property: 'Property',
  ObjectLiteral: 'ObjectLiteral',
  ArrayLiteral: 'ArrayLiteral',
  Identifier: 'Identifier',
  MemberExpression: 'MemberExpression',
  CallExpression: 'CallExpression',
  BinaryExpression: 'BinaryExpression',
  UnaryExpression: 'UnaryExpression',
  UpdateExpression: 'UpdateExpression',
  Literal: 'Literal',
  TemplateLiteral: 'TemplateLiteral',
  ConditionalExpression: 'ConditionalExpression',
  ArrowFunction: 'ArrowFunction',
  SpreadElement: 'SpreadElement',
  AssignmentExpression: 'AssignmentExpression',
  FunctionDeclaration: 'FunctionDeclaration',
  StyleRule: 'StyleRule',
  StyleProperty: 'StyleProperty',

  // Router nodes
  RouterBlock: 'RouterBlock',
  RoutesBlock: 'RoutesBlock',
  RouteDefinition: 'RouteDefinition',
  GuardHook: 'GuardHook',

  // Store nodes
  StoreBlock: 'StoreBlock',
  GettersBlock: 'GettersBlock',
  GetterDeclaration: 'GetterDeclaration',

  // View directives for router
  LinkDirective: 'LinkDirective',
  OutletDirective: 'OutletDirective',
  NavigateDirective: 'NavigateDirective'
};

// ============================================================
// AST Node Class
// ============================================================

/**
 * AST Node class
 */
export class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
  }
}

// ============================================================
// Base Parser Class
// ============================================================

/**
 * Parser class with base utility methods
 * Parse methods are added via modules (imports, state, view, style, expressions, blocks)
 */
export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  /**
   * Get current token
   */
  current() {
    return this.tokens[this.pos];
  }

  /**
   * Peek at token at offset
   */
  peek(offset = 1) {
    const index = this.pos + offset;
    if (index < 0 || index >= this.tokens.length) return undefined;
    return this.tokens[index];
  }

  /**
   * Check if current token matches type
   */
  is(type) {
    return this.current()?.type === type;
  }

  /**
   * Check if current token matches any of types
   */
  isAny(...types) {
    return types.includes(this.current()?.type);
  }

  /**
   * Advance to next token and return current
   */
  advance() {
    return this.tokens[this.pos++];
  }

  /**
   * Expect a specific token type
   */
  expect(type, message = null) {
    if (!this.is(type)) {
      const token = this.current();
      throw this.createError(
        message || `Expected ${type} but got ${token?.type}`,
        token,
        { suggestion: SUGGESTIONS['unexpected-token']?.(type, token?.type) }
      );
    }
    return this.advance();
  }

  /**
   * Create a parse error with detailed information
   * @param {string} message - Error message
   * @param {Object} [token] - Token where error occurred
   * @param {Object} [options] - Additional options (suggestion, code)
   * @returns {ParserError} The parser error
   */
  createError(message, token = null, options = {}) {
    const t = token || this.current();
    const code = options.code || 'PARSER_ERROR';

    // Build enhanced message with docs link
    let enhancedMessage = message;
    if (options.suggestion) {
      enhancedMessage += `\n  → ${options.suggestion}`;
    }
    enhancedMessage += `\n  See: ${getDocsUrl(code)}`;

    return new ParserError(enhancedMessage, {
      line: t?.line || 1,
      column: t?.column || 1,
      token: t,
      code,
      ...options
    });
  }

  /**
   * Parse the entire program
   * This method delegates to specialized parse methods from other modules
   */
  parse() {
    const program = new ASTNode(NodeType.Program, {
      imports: [],
      page: null,
      route: null,
      props: null,
      state: null,
      view: null,
      actions: null,
      style: null,
      router: null,
      store: null
    });

    while (!this.is(TokenType.EOF)) {
      // Import declarations (must come first)
      if (this.is(TokenType.IMPORT)) {
        program.imports.push(this.parseImportDeclaration());
      }
      // Page/Route declarations
      else if (this.is(TokenType.AT)) {
        this.advance();
        if (this.is(TokenType.PAGE)) {
          program.page = this.parsePageDeclaration();
        } else if (this.is(TokenType.ROUTE)) {
          program.route = this.parseRouteDeclaration();
        } else {
          throw this.createError(
            `Expected 'page' or 'route' after '@', got '${this.current()?.value}'`
          );
        }
      }
      // Props block
      else if (this.is(TokenType.PROPS)) {
        if (program.props) {
          throw this.createError('Duplicate props block - only one props block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('props')
          });
        }
        program.props = this.parsePropsBlock();
      }
      // State block
      else if (this.is(TokenType.STATE)) {
        if (program.state) {
          throw this.createError('Duplicate state block - only one state block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('state')
          });
        }
        program.state = this.parseStateBlock();
      }
      // View block
      else if (this.is(TokenType.VIEW)) {
        if (program.view) {
          throw this.createError('Duplicate view block - only one view block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('view')
          });
        }
        program.view = this.parseViewBlock();
      }
      // Actions block
      else if (this.is(TokenType.ACTIONS)) {
        if (program.actions) {
          throw this.createError('Duplicate actions block - only one actions block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('actions')
          });
        }
        program.actions = this.parseActionsBlock();
      }
      // Style block
      else if (this.is(TokenType.STYLE)) {
        if (program.style) {
          throw this.createError('Duplicate style block - only one style block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('style')
          });
        }
        program.style = this.parseStyleBlock();
      }
      // Router block
      else if (this.is(TokenType.ROUTER)) {
        if (program.router) {
          throw this.createError('Duplicate router block - only one router block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('router')
          });
        }
        program.router = this.parseRouterBlock();
      }
      // Store block
      else if (this.is(TokenType.STORE)) {
        if (program.store) {
          throw this.createError('Duplicate store block - only one store block allowed per file', null, {
            code: 'DUPLICATE_BLOCK',
            suggestion: SUGGESTIONS['duplicate-declaration']?.('store')
          });
        }
        program.store = this.parseStoreBlock();
      }
      else {
        const token = this.current();
        throw this.createError(
          `Unexpected token '${token?.value || token?.type}' at line ${token?.line}:${token?.column}. ` +
          `Expected: import, @page, @route, props, state, view, actions, style, router, or store`
        );
      }
    }

    return program;
  }
}
