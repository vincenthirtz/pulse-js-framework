/**
 * Pulse Parser - AST builder for .pulse files
 *
 * Converts tokens into an Abstract Syntax Tree
 */

import { TokenType, tokenize } from './lexer.js';
import { ParserError, SUGGESTIONS, getDocsUrl } from '../runtime/errors.js';

// AST Node types
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

/**
 * AST Node class
 */
export class ASTNode {
  constructor(type, props = {}) {
    this.type = type;
    Object.assign(this, props);
  }
}

/**
 * Parser class
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

  /**
   * Parse import declaration
   * Supports:
   *   import Component from './Component.pulse'
   *   import { helper, util } from './utils.pulse'
   *   import { helper as h } from './utils.pulse'
   *   import * as Utils from './utils.pulse'
   */
  parseImportDeclaration() {
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
  }

  /**
   * Parse @page declaration
   */
  parsePageDeclaration() {
    this.expect(TokenType.PAGE);
    const name = this.expect(TokenType.IDENT);
    return new ASTNode(NodeType.PageDeclaration, { name: name.value });
  }

  /**
   * Parse @route declaration
   */
  parseRouteDeclaration() {
    this.expect(TokenType.ROUTE);
    const path = this.expect(TokenType.STRING);
    return new ASTNode(NodeType.RouteDeclaration, { path: path.value });
  }

  /**
   * Parse props block
   * props {
   *   label: "Default"
   *   disabled: false
   * }
   */
  parsePropsBlock() {
    this.expect(TokenType.PROPS);
    this.expect(TokenType.LBRACE);

    const properties = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      properties.push(this.parsePropsProperty());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.PropsBlock, { properties });
  }

  /**
   * Parse a props property (name: defaultValue)
   */
  parsePropsProperty() {
    const name = this.expect(TokenType.IDENT);
    this.expect(TokenType.COLON);
    const value = this.parseValue();
    return new ASTNode(NodeType.Property, { name: name.value, value });
  }

  /**
   * Parse state block
   */
  parseStateBlock() {
    this.expect(TokenType.STATE);
    this.expect(TokenType.LBRACE);

    const properties = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      properties.push(this.parseStateProperty());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.StateBlock, { properties });
  }

  /**
   * Parse a state property
   */
  parseStateProperty() {
    const name = this.expect(TokenType.IDENT);
    this.expect(TokenType.COLON);
    const value = this.parseValue();
    return new ASTNode(NodeType.Property, { name: name.value, value });
  }

  /**
   * Try to parse a literal token (STRING, NUMBER, TRUE, FALSE, NULL)
   * Returns the AST node or null if not a literal
   */
  tryParseLiteral() {
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
  }

  /**
   * Parse a value (literal, object, array, etc.)
   */
  parseValue() {
    if (this.is(TokenType.LBRACE)) return this.parseObjectLiteral();
    if (this.is(TokenType.LBRACKET)) return this.parseArrayLiteral();

    const literal = this.tryParseLiteral();
    if (literal) return literal;

    if (this.is(TokenType.IDENT)) return this.parseIdentifierOrExpression();

    throw this.createError(
      `Unexpected token ${this.current()?.type} in value`
    );
  }

  /**
   * Parse object literal
   */
  parseObjectLiteral() {
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
  }

  /**
   * Parse array literal
   */
  parseArrayLiteral() {
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
  }

  /**
   * Parse view block
   */
  parseViewBlock() {
    this.expect(TokenType.VIEW);
    this.expect(TokenType.LBRACE);

    const children = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      children.push(this.parseViewChild());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.ViewBlock, { children });
  }

  /**
   * Parse a view child (element, directive, slot, or text)
   */
  parseViewChild() {
    if (this.is(TokenType.AT)) {
      return this.parseDirective();
    }
    // Slot element
    if (this.is(TokenType.SLOT)) {
      return this.parseSlotElement();
    }
    if (this.is(TokenType.SELECTOR) || this.is(TokenType.IDENT)) {
      return this.parseElement();
    }
    if (this.is(TokenType.STRING)) {
      return this.parseTextNode();
    }

    const token = this.current();
    throw this.createError(
      `Unexpected token '${token?.value || token?.type}' in view block. ` +
      `Expected: element selector, @directive, slot, or "text"`
    );
  }

  /**
   * Parse slot element for component composition
   * Supports:
   *   slot                    - default slot
   *   slot "name"             - named slot
   *   slot { default content }
   */
  parseSlotElement() {
    const startToken = this.expect(TokenType.SLOT);
    let name = 'default';
    const fallback = [];

    // Named slot: slot "header"
    if (this.is(TokenType.STRING)) {
      name = this.advance().value;
    }

    // Fallback content: slot { ... }
    if (this.is(TokenType.LBRACE)) {
      this.advance();
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        fallback.push(this.parseViewChild());
      }
      this.expect(TokenType.RBRACE);
    }

    return new ASTNode(NodeType.SlotElement, {
      name,
      fallback,
      line: startToken.line,
      column: startToken.column
    });
  }

  /**
   * Parse an element
   */
  parseElement() {
    const selector = this.isAny(TokenType.SELECTOR, TokenType.IDENT)
      ? this.advance().value
      : '';

    const directives = [];
    const textContent = [];
    const children = [];
    const props = []; // Props passed to component

    // Check if this is a component with props: Component(prop=value, ...)
    if (this.is(TokenType.LPAREN)) {
      this.advance(); // consume (
      while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
        props.push(this.parseComponentProp());
        if (this.is(TokenType.COMMA)) {
          this.advance();
        }
      }
      this.expect(TokenType.RPAREN);
    }

    // Parse inline directives and text
    while (!this.is(TokenType.LBRACE) && !this.is(TokenType.RBRACE) &&
           !this.is(TokenType.SELECTOR) && !this.is(TokenType.EOF)) {
      if (this.is(TokenType.AT)) {
        // Check if this is a block directive (@if, @for, @each) - if so, break
        const nextToken = this.peek();
        if (nextToken && (nextToken.type === TokenType.IF ||
            nextToken.type === TokenType.FOR ||
            nextToken.type === TokenType.EACH)) {
          break;
        }
        directives.push(this.parseInlineDirective());
      } else if (this.is(TokenType.STRING)) {
        textContent.push(this.parseTextNode());
      } else if (this.is(TokenType.IDENT) && !this.couldBeElement()) {
        break;
      } else {
        break;
      }
    }

    // Parse children if there's a block
    if (this.is(TokenType.LBRACE)) {
      this.advance();
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        children.push(this.parseViewChild());
      }
      this.expect(TokenType.RBRACE);
    }

    return new ASTNode(NodeType.Element, {
      selector,
      directives,
      textContent,
      children,
      props
    });
  }

  /**
   * Parse a component prop: name=value or name={expression}
   */
  parseComponentProp() {
    const name = this.expect(TokenType.IDENT);
    this.expect(TokenType.EQ);

    let value;
    if (this.is(TokenType.LBRACE)) {
      this.advance();
      value = this.parseExpression();
      this.expect(TokenType.RBRACE);
    } else {
      value = this.tryParseLiteral();
      if (!value) {
        if (this.is(TokenType.IDENT)) {
          value = this.parseIdentifierOrExpression();
        } else {
          throw this.createError(`Unexpected token in prop value: ${this.current()?.type}`);
        }
      }
    }

    return new ASTNode(NodeType.Property, { name: name.value, value });
  }

  /**
   * Check if current position could be an element
   */
  couldBeElement() {
    const next = this.peek();
    return next?.type === TokenType.LBRACE ||
           next?.type === TokenType.AT ||
           next?.type === TokenType.STRING;
  }

  /**
   * Parse a text node
   */
  parseTextNode() {
    const token = this.expect(TokenType.STRING);
    const parts = this.parseInterpolatedString(token.value);
    return new ASTNode(NodeType.TextNode, { parts });
  }

  /**
   * Parse interpolated string into parts
   * "Hello, {name}!" -> ["Hello, ", { expr: "name" }, "!"]
   */
  parseInterpolatedString(str) {
    const parts = [];
    let current = '';
    let i = 0;

    while (i < str.length) {
      if (str[i] === '{') {
        if (current) {
          parts.push(current);
          current = '';
        }
        i++; // skip {
        let expr = '';
        let braceCount = 1;
        while (i < str.length && braceCount > 0) {
          if (str[i] === '{') braceCount++;
          else if (str[i] === '}') braceCount--;
          if (braceCount > 0) expr += str[i];
          i++;
        }
        parts.push(new ASTNode(NodeType.Interpolation, { expression: expr.trim() }));
      } else {
        current += str[i];
        i++;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Parse a directive (@if, @for, @each, @click, @link, @outlet, @navigate, etc.)
   */
  parseDirective() {
    this.expect(TokenType.AT);

    // Handle @if - IF is a keyword token, not IDENT
    if (this.is(TokenType.IF)) {
      this.advance();
      return this.parseIfDirective();
    }

    // Handle @for - FOR is a keyword token, not IDENT
    if (this.is(TokenType.FOR)) {
      this.advance();
      return this.parseEachDirective();
    }

    // Handle router directives
    if (this.is(TokenType.LINK)) {
      this.advance();
      return this.parseLinkDirective();
    }
    if (this.is(TokenType.OUTLET)) {
      this.advance();
      return this.parseOutletDirective();
    }
    if (this.is(TokenType.NAVIGATE)) {
      this.advance();
      return this.parseNavigateDirective();
    }
    if (this.is(TokenType.BACK)) {
      this.advance();
      return new ASTNode(NodeType.NavigateDirective, { action: 'back' });
    }
    if (this.is(TokenType.FORWARD)) {
      this.advance();
      return new ASTNode(NodeType.NavigateDirective, { action: 'forward' });
    }

    const name = this.expect(TokenType.IDENT).value;

    // Collect modifiers (.prevent, .stop, .enter, .lazy, etc.)
    const modifiers = [];
    while (this.is(TokenType.DIRECTIVE_MOD)) {
      modifiers.push(this.advance().value);
    }

    if (name === 'if') {
      return this.parseIfDirective();
    }
    if (name === 'each' || name === 'for') {
      return this.parseEachDirective();
    }

    // Accessibility directives
    if (name === 'a11y') {
      return this.parseA11yDirective();
    }
    if (name === 'live') {
      return this.parseLiveDirective();
    }
    if (name === 'focusTrap') {
      return this.parseFocusTrapDirective();
    }
    if (name === 'srOnly') {
      return this.parseSrOnlyDirective();
    }

    // SSR directives
    if (name === 'client') {
      return new ASTNode(NodeType.ClientDirective, {});
    }
    if (name === 'server') {
      return new ASTNode(NodeType.ServerDirective, {});
    }

    // @model directive for two-way binding
    if (name === 'model') {
      return this.parseModelDirective(modifiers);
    }

    // Event directive like @click
    return this.parseEventDirective(name, modifiers);
  }

  /**
   * Parse inline directive
   */
  parseInlineDirective() {
    this.expect(TokenType.AT);
    const name = this.expect(TokenType.IDENT).value;

    // Collect modifiers (.prevent, .stop, .enter, .lazy, etc.)
    const modifiers = [];
    while (this.is(TokenType.DIRECTIVE_MOD)) {
      modifiers.push(this.advance().value);
    }

    // Check for a11y directives
    if (name === 'a11y') {
      return this.parseA11yDirective();
    }
    if (name === 'live') {
      return this.parseLiveDirective();
    }
    if (name === 'focusTrap') {
      return this.parseFocusTrapDirective();
    }
    if (name === 'srOnly') {
      return this.parseSrOnlyDirective();
    }

    // SSR directives
    if (name === 'client') {
      return new ASTNode(NodeType.ClientDirective, {});
    }
    if (name === 'server') {
      return new ASTNode(NodeType.ServerDirective, {});
    }

    // @model directive for two-way binding
    if (name === 'model') {
      return this.parseModelDirective(modifiers);
    }

    // Event directive (click, submit, etc.)
    this.expect(TokenType.LPAREN);
    const expression = this.parseExpression();
    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.EventDirective, { event: name, handler: expression, modifiers });
  }

  /**
   * Parse @if directive with @else-if/@else chains
   * Syntax: @if (cond) { } @else-if (cond) { } @else { }
   */
  parseIfDirective() {
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN);

    this.expect(TokenType.LBRACE);
    const consequent = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      consequent.push(this.parseViewChild());
    }
    this.expect(TokenType.RBRACE);

    const elseIfBranches = [];
    let alternate = null;

    // Parse @else-if and @else chains
    while (this.is(TokenType.AT)) {
      const nextToken = this.peek();

      // Check for @else or @else-if
      if (nextToken?.value === 'else') {
        this.advance(); // @
        this.advance(); // else

        // Check if followed by @if or -if (making @else @if or @else-if)
        if (this.is(TokenType.AT) && (this.peek()?.type === TokenType.IF || this.peek()?.value === 'if')) {
          // @else @if pattern
          this.advance(); // @
          this.advance(); // if

          this.expect(TokenType.LPAREN);
          const elseIfCondition = this.parseExpression();
          this.expect(TokenType.RPAREN);

          this.expect(TokenType.LBRACE);
          const elseIfConsequent = [];
          while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
            elseIfConsequent.push(this.parseViewChild());
          }
          this.expect(TokenType.RBRACE);

          elseIfBranches.push({ condition: elseIfCondition, consequent: elseIfConsequent });
        }
        // Check for -if pattern (@else-if as hyphenated)
        else if (this.is(TokenType.MINUS) && (this.peek()?.type === TokenType.IF || this.peek()?.value === 'if')) {
          this.advance(); // -
          this.advance(); // if

          this.expect(TokenType.LPAREN);
          const elseIfCondition = this.parseExpression();
          this.expect(TokenType.RPAREN);

          this.expect(TokenType.LBRACE);
          const elseIfConsequent = [];
          while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
            elseIfConsequent.push(this.parseViewChild());
          }
          this.expect(TokenType.RBRACE);

          elseIfBranches.push({ condition: elseIfCondition, consequent: elseIfConsequent });
        }
        // Plain @else
        else {
          this.expect(TokenType.LBRACE);
          alternate = [];
          while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
            alternate.push(this.parseViewChild());
          }
          this.expect(TokenType.RBRACE);
          break; // @else terminates the chain
        }
      } else {
        break; // Not an @else variant
      }
    }

    return new ASTNode(NodeType.IfDirective, { condition, consequent, elseIfBranches, alternate });
  }

  /**
   * Parse @each/@for directive with optional key function
   * Syntax: @for (item of items) key(item.id) { ... }
   */
  parseEachDirective() {
    this.expect(TokenType.LPAREN);
    const itemName = this.expect(TokenType.IDENT).value;
    // Accept both 'in' and 'of' keywords
    if (this.is(TokenType.IN)) {
      this.advance();
    } else if (this.is(TokenType.OF)) {
      this.advance();
    } else {
      throw this.createError('Expected "in" or "of" in loop directive');
    }
    const iterable = this.parseExpression();
    this.expect(TokenType.RPAREN);

    // Parse optional key function: key(item.id)
    let keyExpr = null;
    if (this.is(TokenType.IDENT) && this.current().value === 'key') {
      this.advance(); // consume 'key'
      this.expect(TokenType.LPAREN);
      keyExpr = this.parseExpression();
      this.expect(TokenType.RPAREN);
    }

    this.expect(TokenType.LBRACE);
    const template = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      template.push(this.parseViewChild());
    }
    this.expect(TokenType.RBRACE);

    return new ASTNode(NodeType.EachDirective, { itemName, iterable, template, keyExpr });
  }

  /**
   * Parse event directive with optional modifiers
   * @param {string} event - Event name (click, keydown, etc.)
   * @param {string[]} modifiers - Array of modifier names (prevent, stop, enter, etc.)
   */
  parseEventDirective(event, modifiers = []) {
    this.expect(TokenType.LPAREN);
    const handler = this.parseExpression();
    this.expect(TokenType.RPAREN);

    const children = [];
    if (this.is(TokenType.LBRACE)) {
      this.advance();
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        children.push(this.parseViewChild());
      }
      this.expect(TokenType.RBRACE);
    }

    return new ASTNode(NodeType.EventDirective, { event, handler, children, modifiers });
  }

  /**
   * Parse @model directive for two-way binding
   * @model(name) or @model.lazy(name) or @model.lazy.trim(name)
   * @param {string[]} modifiers - Array of modifier names (lazy, trim, number)
   */
  parseModelDirective(modifiers = []) {
    this.expect(TokenType.LPAREN);
    const binding = this.parseExpression();
    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.ModelDirective, { binding, modifiers });
  }

  /**
   * Parse @a11y directive - sets aria attributes
   * @a11y(label="Close menu") or @a11y(label="Close", describedby="desc")
   */
  parseA11yDirective() {
    this.expect(TokenType.LPAREN);

    const attrs = {};

    // Parse key=value pairs
    while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
      const key = this.expect(TokenType.IDENT).value;
      this.expect(TokenType.EQ);

      let value;
      if (this.is(TokenType.STRING)) {
        value = this.advance().value;
      } else if (this.is(TokenType.TRUE)) {
        value = true;
        this.advance();
      } else if (this.is(TokenType.FALSE)) {
        value = false;
        this.advance();
      } else if (this.is(TokenType.IDENT)) {
        // Treat unquoted identifier as a string (e.g., role=dialog -> "dialog")
        value = this.advance().value;
      } else {
        value = this.parseExpression();
      }

      attrs[key] = value;

      if (this.is(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.A11yDirective, { attrs });
  }

  /**
   * Parse @live directive - creates live region for screen readers
   * @live(polite) or @live(assertive)
   */
  parseLiveDirective() {
    this.expect(TokenType.LPAREN);

    let priority = 'polite';
    if (this.is(TokenType.IDENT)) {
      priority = this.advance().value;
    }

    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.LiveDirective, { priority });
  }

  /**
   * Parse @focusTrap directive - traps focus within element
   * @focusTrap or @focusTrap(autoFocus=true)
   */
  parseFocusTrapDirective() {
    const options = {};

    if (this.is(TokenType.LPAREN)) {
      this.advance();

      while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
        const key = this.expect(TokenType.IDENT).value;

        if (this.is(TokenType.EQ)) {
          this.advance();
          if (this.is(TokenType.TRUE)) {
            options[key] = true;
            this.advance();
          } else if (this.is(TokenType.FALSE)) {
            options[key] = false;
            this.advance();
          } else if (this.is(TokenType.STRING)) {
            options[key] = this.advance().value;
          } else {
            options[key] = this.parseExpression();
          }
        } else {
          options[key] = true;
        }

        if (this.is(TokenType.COMMA)) {
          this.advance();
        }
      }

      this.expect(TokenType.RPAREN);
    }

    return new ASTNode(NodeType.FocusTrapDirective, { options });
  }

  /**
   * Parse @srOnly directive - visually hidden but accessible text
   */
  parseSrOnlyDirective() {
    return new ASTNode(NodeType.A11yDirective, {
      attrs: { srOnly: true }
    });
  }

  /**
   * Parse expression
   */
  parseExpression() {
    return this.parseAssignmentExpression();
  }

  /**
   * Parse assignment expression (a = b, a += b, a -= b, etc.)
   */
  parseAssignmentExpression() {
    const left = this.parseConditionalExpression();

    // Check for assignment operators
    const assignmentOps = [
      TokenType.EQ,           // =
      TokenType.PLUS_ASSIGN,  // +=
      TokenType.MINUS_ASSIGN, // -=
      TokenType.STAR_ASSIGN,  // *=
      TokenType.SLASH_ASSIGN, // /=
      TokenType.AND_ASSIGN,   // &&=
      TokenType.OR_ASSIGN,    // ||=
      TokenType.NULLISH_ASSIGN // ??=
    ];

    if (this.isAny(...assignmentOps)) {
      const operator = this.advance().value;
      const right = this.parseAssignmentExpression();
      return new ASTNode(NodeType.AssignmentExpression, {
        left,
        right,
        operator
      });
    }

    return left;
  }

  /**
   * Parse conditional (ternary) expression
   */
  parseConditionalExpression() {
    const test = this.parseOrExpression();

    if (this.is(TokenType.QUESTION)) {
      this.advance();
      const consequent = this.parseAssignmentExpression();
      this.expect(TokenType.COLON);
      const alternate = this.parseAssignmentExpression();
      return new ASTNode(NodeType.ConditionalExpression, { test, consequent, alternate });
    }

    return test;
  }

  /**
   * Binary operator precedence table (higher = binds tighter)
   */
  static BINARY_OPS = [
    { ops: [TokenType.OR], name: 'or' },
    { ops: [TokenType.AND], name: 'and' },
    { ops: [TokenType.EQEQ, TokenType.EQEQEQ, TokenType.NEQ, TokenType.NEQEQ,
            TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE], name: 'comparison' },
    { ops: [TokenType.PLUS, TokenType.MINUS], name: 'additive' },
    { ops: [TokenType.STAR, TokenType.SLASH, TokenType.PERCENT], name: 'multiplicative' }
  ];

  /**
   * Generic binary expression parser using precedence climbing
   */
  parseBinaryExpr(level = 0) {
    if (level >= Parser.BINARY_OPS.length) {
      return this.parseUnaryExpression();
    }

    let left = this.parseBinaryExpr(level + 1);
    const { ops } = Parser.BINARY_OPS[level];

    while (this.isAny(...ops)) {
      const operator = this.advance().value;
      const right = this.parseBinaryExpr(level + 1);
      left = new ASTNode(NodeType.BinaryExpression, { operator, left, right });
    }

    return left;
  }

  /** Parse OR expression (entry point for binary expressions) */
  parseOrExpression() { return this.parseBinaryExpr(0); }

  /**
   * Parse unary expression
   */
  parseUnaryExpression() {
    if (this.is(TokenType.NOT)) {
      this.advance();
      const argument = this.parseUnaryExpression();
      return new ASTNode(NodeType.UnaryExpression, { operator: '!', argument });
    }
    if (this.is(TokenType.MINUS)) {
      this.advance();
      const argument = this.parseUnaryExpression();
      return new ASTNode(NodeType.UnaryExpression, { operator: '-', argument });
    }

    return this.parsePostfixExpression();
  }

  /**
   * Parse postfix expression (++, --)
   */
  parsePostfixExpression() {
    let expr = this.parsePrimaryExpression();

    while (this.isAny(TokenType.PLUSPLUS, TokenType.MINUSMINUS)) {
      const operator = this.advance().value;
      expr = new ASTNode(NodeType.UpdateExpression, {
        operator,
        argument: expr,
        prefix: false
      });
    }

    return expr;
  }

  /**
   * Parse primary expression
   */
  parsePrimaryExpression() {
    // Check for arrow function: (params) => expr or () => expr
    if (this.is(TokenType.LPAREN)) {
      // Try to parse as arrow function by looking ahead
      const savedPos = this.pos;
      if (this.tryParseArrowFunction()) {
        this.pos = savedPos;
        return this.parseArrowFunction();
      }
      // Not an arrow function, parse as grouped expression
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      // Check if this grouped expression is actually arrow function params
      if (this.is(TokenType.ARROW)) {
        this.pos = savedPos;
        return this.parseArrowFunction();
      }
      return expr;
    }

    // Single param arrow function: x => expr
    if ((this.is(TokenType.IDENT) || this.is(TokenType.SELECTOR)) && this.peek()?.type === TokenType.ARROW) {
      return this.parseArrowFunction();
    }

    // Array literal
    if (this.is(TokenType.LBRACKET)) {
      return this.parseArrayLiteralExpr();
    }

    // Object literal in expression context
    if (this.is(TokenType.LBRACE)) {
      return this.parseObjectLiteralExpr();
    }

    // Template literal
    if (this.is(TokenType.TEMPLATE)) {
      const token = this.advance();
      return new ASTNode(NodeType.TemplateLiteral, { value: token.value, raw: token.raw });
    }

    // Spread operator
    if (this.is(TokenType.SPREAD)) {
      this.advance();
      const argument = this.parseAssignmentExpression();
      return new ASTNode(NodeType.SpreadElement, { argument });
    }

    // Try parsing a literal (NUMBER, STRING, TRUE, FALSE, NULL)
    const literal = this.tryParseLiteral();
    if (literal) return literal;

    // In expressions, SELECTOR tokens should be treated as IDENT
    // This happens when identifiers like 'selectedCategory' are followed by space in view context
    if (this.is(TokenType.IDENT) || this.is(TokenType.SELECTOR)) {
      return this.parseIdentifierOrExpression();
    }

    throw this.createError(
      `Unexpected token ${this.current()?.type} in expression`
    );
  }

  /**
   * Try to determine if we're looking at an arrow function
   */
  tryParseArrowFunction() {
    if (!this.is(TokenType.LPAREN)) return false;

    let depth = 0;
    let i = 0;

    while (this.peek(i)) {
      const token = this.peek(i);
      if (token.type === TokenType.LPAREN) depth++;
      else if (token.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          // Check if next token is =>
          const next = this.peek(i + 1);
          return next?.type === TokenType.ARROW;
        }
      }
      i++;
    }
    return false;
  }

  /**
   * Parse arrow function: (params) => expr or param => expr
   */
  parseArrowFunction() {
    const params = [];

    // Single param without parens: x => expr
    if ((this.is(TokenType.IDENT) || this.is(TokenType.SELECTOR)) && this.peek()?.type === TokenType.ARROW) {
      params.push(this.advance().value);
    } else {
      // Params in parens: (a, b) => expr or () => expr
      this.expect(TokenType.LPAREN);
      while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
        if (this.is(TokenType.SPREAD)) {
          this.advance();
          params.push('...' + this.expect(TokenType.IDENT).value);
        } else {
          params.push(this.expect(TokenType.IDENT).value);
        }
        if (this.is(TokenType.COMMA)) {
          this.advance();
        }
      }
      this.expect(TokenType.RPAREN);
    }

    this.expect(TokenType.ARROW);

    // Body can be expression or block
    let body;
    if (this.is(TokenType.LBRACE)) {
      // Block body - collect tokens
      this.advance();
      body = this.parseFunctionBody();
      this.expect(TokenType.RBRACE);
      return new ASTNode(NodeType.ArrowFunction, { params, body, block: true });
    } else {
      // Expression body
      body = this.parseAssignmentExpression();
      return new ASTNode(NodeType.ArrowFunction, { params, body, block: false });
    }
  }

  /**
   * Parse array literal in expression context
   */
  parseArrayLiteralExpr() {
    this.expect(TokenType.LBRACKET);
    const elements = [];

    while (!this.is(TokenType.RBRACKET) && !this.is(TokenType.EOF)) {
      if (this.is(TokenType.SPREAD)) {
        this.advance();
        elements.push(new ASTNode(NodeType.SpreadElement, {
          argument: this.parseAssignmentExpression()
        }));
      } else {
        elements.push(this.parseAssignmentExpression());
      }
      if (this.is(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return new ASTNode(NodeType.ArrayLiteral, { elements });
  }

  /**
   * Parse object literal in expression context
   */
  parseObjectLiteralExpr() {
    this.expect(TokenType.LBRACE);
    const properties = [];

    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      if (this.is(TokenType.SPREAD)) {
        this.advance();
        properties.push(new ASTNode(NodeType.SpreadElement, {
          argument: this.parseAssignmentExpression()
        }));
      } else {
        const key = this.expect(TokenType.IDENT);
        if (this.is(TokenType.COLON)) {
          this.advance();
          const value = this.parseAssignmentExpression();
          properties.push(new ASTNode(NodeType.Property, { name: key.value, value }));
        } else {
          // Shorthand property: { x } is same as { x: x }
          properties.push(new ASTNode(NodeType.Property, {
            name: key.value,
            value: new ASTNode(NodeType.Identifier, { name: key.value }),
            shorthand: true
          }));
        }
      }
      if (this.is(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.ObjectLiteral, { properties });
  }

  /**
   * Parse identifier with possible member access and calls
   */
  parseIdentifierOrExpression() {
    // Accept both IDENT and SELECTOR (selector tokens can be identifiers in expression context)
    const token = this.advance();
    let expr = new ASTNode(NodeType.Identifier, { name: token.value });

    while (true) {
      if (this.is(TokenType.DOT)) {
        this.advance();
        const property = this.expect(TokenType.IDENT);
        expr = new ASTNode(NodeType.MemberExpression, {
          object: expr,
          property: property.value
        });
      } else if (this.is(TokenType.LBRACKET)) {
        this.advance();
        const property = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        expr = new ASTNode(NodeType.MemberExpression, {
          object: expr,
          property,
          computed: true
        });
      } else if (this.is(TokenType.LPAREN)) {
        this.advance();
        const args = [];
        while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
          args.push(this.parseExpression());
          if (this.is(TokenType.COMMA)) {
            this.advance();
          }
        }
        this.expect(TokenType.RPAREN);
        expr = new ASTNode(NodeType.CallExpression, { callee: expr, arguments: args });
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * Parse actions block
   */
  parseActionsBlock() {
    this.expect(TokenType.ACTIONS);
    this.expect(TokenType.LBRACE);

    const functions = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      functions.push(this.parseFunctionDeclaration());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.ActionsBlock, { functions });
  }

  /**
   * Parse function declaration
   */
  parseFunctionDeclaration() {
    let async = false;
    if (this.is(TokenType.IDENT) && this.current().value === 'async') {
      this.advance();
      async = true;
    }

    const name = this.expect(TokenType.IDENT).value;
    this.expect(TokenType.LPAREN);

    const params = [];
    while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
      // Accept IDENT or keyword tokens that can be used as parameter names
      const paramToken = this.current();
      if (this.is(TokenType.IDENT) || this.is(TokenType.PAGE) ||
          this.is(TokenType.ROUTE) || this.is(TokenType.FROM) ||
          this.is(TokenType.STATE) || this.is(TokenType.VIEW) ||
          this.is(TokenType.STORE) || this.is(TokenType.ROUTER)) {
        params.push(this.advance().value);
      } else {
        throw this.createError(`Expected parameter name but got ${paramToken?.type}`);
      }
      if (this.is(TokenType.COMMA)) {
        this.advance();
      }
    }
    this.expect(TokenType.RPAREN);

    // Parse function body as raw JS
    this.expect(TokenType.LBRACE);
    const body = this.parseFunctionBody();
    this.expect(TokenType.RBRACE);

    return new ASTNode(NodeType.FunctionDeclaration, { name, params, body, async });
  }

  /**
   * Parse function body (raw content between braces)
   */
  parseFunctionBody() {
    // Simplified: collect all tokens until matching }
    const statements = [];
    let braceCount = 1;

    while (!this.is(TokenType.EOF)) {
      if (this.is(TokenType.LBRACE)) {
        braceCount++;
      } else if (this.is(TokenType.RBRACE)) {
        braceCount--;
        if (braceCount === 0) break;
      }

      // Collect raw token for reconstruction
      statements.push(this.current());
      this.advance();
    }

    return statements;
  }

  /**
   * Parse style block
   */
  parseStyleBlock() {
    this.expect(TokenType.STYLE);
    const startBrace = this.expect(TokenType.LBRACE);

    // Extract raw CSS content for preprocessor support
    // Instead of parsing token by token, collect all tokens until matching }
    const rawTokens = [];
    let braceDepth = 1; // We've already consumed the opening {
    const startPos = this.pos;

    while (braceDepth > 0 && !this.is(TokenType.EOF)) {
      const token = this.current();
      if (token.type === TokenType.LBRACE) braceDepth++;
      if (token.type === TokenType.RBRACE) braceDepth--;

      if (braceDepth > 0) {
        rawTokens.push(token);
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    // Reconstruct raw CSS from tokens for preprocessor
    const rawCSS = this.reconstructCSS(rawTokens);

    // Try to parse as structured CSS (will work for plain CSS)
    // If parsing fails, fall back to raw mode for preprocessors
    let rules = [];
    let parseError = null;

    // Reset to try parsing
    const savedPos = this.pos;
    this.pos = startPos;

    try {
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        rules.push(this.parseStyleRule());
      }
    } catch (error) {
      // Parsing failed - likely preprocessor syntax (LESS/SASS/Stylus)
      parseError = error;
      rules = []; // Clear any partial parse
    }

    // Restore position to after the closing }
    this.pos = savedPos;

    return new ASTNode(NodeType.StyleBlock, {
      rules,
      raw: rawCSS,
      parseError: parseError ? parseError.message : null
    });
  }

  /**
   * Reconstruct CSS from tokens, preserving formatting
   */
  reconstructCSS(tokens) {
    if (!tokens.length) return '';

    const lines = [];
    let currentLine = [];
    let lastLine = tokens[0].line;

    for (const token of tokens) {
      if (token.line !== lastLine) {
        lines.push(currentLine.join(''));
        currentLine = [];
        lastLine = token.line;
      }
      currentLine.push(token.raw || token.value);
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.join(''));
    }

    return lines.join('\n').trim();
  }

  /**
   * Parse style rule
   */
  parseStyleRule() {
    // Parse selector - preserve spaces between tokens
    const selectorParts = [];
    let lastLine = this.current()?.line;
    let lastToken = null;
    let inAtRule = false;  // Track if we're inside an @-rule like @media
    let inParens = 0;      // Track parenthesis depth

    while (!this.is(TokenType.LBRACE) && !this.is(TokenType.EOF)) {
      const token = this.advance();
      const currentLine = token.line;
      const tokenValue = String(token.value);

      // Track @-rules (media queries, keyframes, etc.)
      if (tokenValue === '@') {
        inAtRule = true;
      }

      // Track parenthesis depth for media queries
      if (tokenValue === '(') inParens++;
      if (tokenValue === ')') inParens--;

      // Determine if we need a space before this token
      if (selectorParts.length > 0 && currentLine === lastLine) {
        const lastPart = selectorParts[selectorParts.length - 1];

        // Don't add space after these (they attach to what follows)
        const noSpaceAfter = new Set(['.', '#', '[', '(', '>', '+', '~', '-', '@', ':']);

        // Don't add space before these (they attach to what precedes)
        // In @media queries inside parens: "max-width:" should not have space before ":"
        const noSpaceBefore = new Set([']', ')', ',', '.', '#', '-', ':']);

        // CSS units that should attach to numbers (no space before)
        const cssUnits = new Set(['px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', '%', 'fr', 's', 'ms', 'deg', 'rad', 'turn', 'grad', 'ex', 'ch', 'pt', 'pc', 'in', 'cm', 'mm', 'dvh', 'dvw', 'svh', 'svw', 'lvh', 'lvw']);

        // Special case: . or # after an identifier needs space (descendant selector)
        // e.g., ".school .date" - need space between "school" and "."
        // BUT NOT for "body.dark" where . is directly adjacent to body (no whitespace)
        // We check if tokens are adjacent by comparing positions
        const expectedNextCol = lastToken ? (lastToken.column + String(lastToken.value).length) : 0;
        const tokensAreAdjacent = token.column === expectedNextCol;
        const isDescendantSelector = (tokenValue === '.' || tokenValue === '#') &&
                                     lastToken?.type === TokenType.IDENT &&
                                     !inAtRule &&  // Don't add space in @media selectors
                                     !tokensAreAdjacent;  // Only add space if not directly adjacent

        // Special case: hyphenated class/id names like .job-title, .card-3d, max-width
        // Check if we're continuing a class/id name - the last part should end with alphanumeric
        // that was started by . or # (no space in between)
        const lastPartJoined = selectorParts.join('');
        // Check if we're in the middle of a class/id name (last char is alphanumeric or -)
        // AND there's a . or # that started this name (not separated by space)
        const lastSegmentMatch = lastPartJoined.match(/[.#]([a-zA-Z0-9_-]*)$/);
        const inClassName = lastSegmentMatch && lastSegmentMatch[1].length > 0;

        // Don't add space if current token is '-' and last token was IDENT or NUMBER
        // Or if last token was '-' (the next token should attach to it)
        // Also handle .card-3d where we have NUMBER followed by IDENT (but only if in class name context)
        const isHyphenatedIdent = (tokenValue === '-' && (lastToken?.type === TokenType.IDENT || lastToken?.type === TokenType.NUMBER)) ||
                                  (lastToken?.type === TokenType.MINUS) ||
                                  (inClassName && lastToken?.type === TokenType.NUMBER && token.type === TokenType.IDENT);

        // Special case: CSS units after numbers (768px, 1.5em)
        const isUnitAfterNumber = cssUnits.has(tokenValue) && lastToken?.type === TokenType.NUMBER;

        // Special case: @-rule keywords (media, keyframes, etc.) should attach to @
        const isAtRuleKeyword = lastPart === '@' && /^[a-zA-Z]/.test(tokenValue);

        const needsSpace = !noSpaceAfter.has(lastPart) &&
                          !noSpaceBefore.has(tokenValue) &&
                          !isHyphenatedIdent &&
                          !isUnitAfterNumber &&
                          !isAtRuleKeyword ||
                          isDescendantSelector;

        if (needsSpace) {
          selectorParts.push(' ');
        }
      }
      selectorParts.push(tokenValue);
      lastLine = currentLine;
      lastToken = token;
    }
    const selector = selectorParts.join('').trim();

    this.expect(TokenType.LBRACE);

    const properties = [];
    const nestedRules = [];

    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      // Check if this is a nested rule or a property
      if (this.isNestedRule()) {
        nestedRules.push(this.parseStyleRule());
      } else {
        properties.push(this.parseStyleProperty());
      }
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.StyleRule, { selector, properties, nestedRules });
  }

  /**
   * Check if current position is a nested rule
   * A nested rule starts with a selector followed by { on the same logical line
   */
  isNestedRule() {
    const currentToken = this.peek(0);
    if (!currentToken) return false;

    // & is always a CSS parent selector, never a property name
    // So &:hover, &.class, etc. are always nested rules
    if (currentToken.type === TokenType.AMPERSAND) {
      return true;
    }

    const startLine = currentToken.line;
    let i = 0;

    while (this.peek(i) && this.peek(i).type !== TokenType.EOF) {
      const token = this.peek(i);

      // Found { before : - this is a nested rule
      if (token.type === TokenType.LBRACE) return true;

      // Found : - this is a property, not a nested rule
      if (token.type === TokenType.COLON) return false;

      // Found } - end of current rule
      if (token.type === TokenType.RBRACE) return false;

      // If we've moved to a different line and the selector isn't continuing,
      // check if this new line starts with a selector pattern
      if (token.line > startLine && i > 0) {
        // We're on a new line - only continue if we haven't found anything significant
        // A selector on a new line followed by { is a nested rule
        // Check next few tokens on this new line
        const nextLine = token.line;
        let j = i;
        while (this.peek(j) && this.peek(j).line === nextLine) {
          const t = this.peek(j);
          if (t.type === TokenType.LBRACE) return true;
          if (t.type === TokenType.COLON) return false;
          if (t.type === TokenType.RBRACE) return false;
          j++;
        }
        return false;
      }

      i++;
    }
    return false;
  }

  /**
   * Parse style property
   * Handles CSS property names (including custom properties like --var-name)
   * and complex CSS values with proper spacing
   */
  parseStyleProperty() {
    // Parse property name (including custom properties with --)
    let name = '';
    let nameTokens = [];
    while (!this.is(TokenType.COLON) && !this.is(TokenType.EOF)) {
      nameTokens.push(this.advance());
    }
    // Join name tokens without spaces (property names don't have spaces)
    name = nameTokens.map(t => t.value).join('').trim();

    this.expect(TokenType.COLON);

    // CSS functions that should not have space before (
    const cssFunctions = new Set([
      'rgba', 'rgb', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklch', 'oklab',
      'var', 'calc', 'min', 'max', 'clamp', 'url', 'attr', 'env', 'counter', 'counters',
      'linear-gradient', 'radial-gradient', 'conic-gradient', 'repeating-linear-gradient', 'repeating-radial-gradient',
      'translate', 'translateX', 'translateY', 'translateZ', 'translate3d',
      'rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d',
      'scale', 'scaleX', 'scaleY', 'scaleZ', 'scale3d',
      'skew', 'skewX', 'skewY', 'matrix', 'matrix3d', 'perspective',
      'cubic-bezier', 'steps', 'drop-shadow', 'blur', 'brightness', 'contrast',
      'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia',
      'minmax', 'repeat', 'fit-content', 'image', 'element', 'cross-fade',
      'color-mix', 'light-dark'
    ]);

    // CSS units that should attach to preceding number (no space before)
    const cssUnits = new Set([
      '%', 'px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'dvh', 'dvw', 'svh', 'svw', 'lvh', 'lvw',
      'fr', 's', 'ms', 'deg', 'rad', 'turn', 'grad',
      'ex', 'ch', 'cap', 'ic', 'lh', 'rlh',
      'pt', 'pc', 'in', 'cm', 'mm', 'Q',
      'dpi', 'dpcm', 'dppx', 'x'
    ]);

    // Tokens that should not have space before them
    const noSpaceBefore = new Set([')', ',', '(', ';']);
    cssUnits.forEach(u => noSpaceBefore.add(u));

    // Collect value tokens
    let valueTokens = [];
    let lastTokenLine = this.current()?.line || 0;

    while (!this.is(TokenType.SEMICOLON) && !this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      const currentToken = this.current();

      // Check if we're on a new line - if so, check for property start or nested rule
      if (currentToken && currentToken.line > lastTokenLine) {
        if (this.isPropertyStart() || this.isNestedRule()) {
          break;
        }
        lastTokenLine = currentToken.line;
      }

      valueTokens.push(this.advance());
    }

    // Build value string with proper spacing
    let value = '';
    let inHexColor = false;
    let hexLength = 0;
    let parenDepth = 0;
    let inCssVar = false;
    let inCalc = false;  // Track if we're inside calc(), min(), max(), clamp() where operators need spaces
    let calcDepth = 0;   // Track nested calc depth

    // Functions where arithmetic operators need spaces
    const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);

    // Helper to check if a string is valid hex
    const isValidHex = (str) => /^[0-9a-fA-F]+$/.test(String(str));

    for (let i = 0; i < valueTokens.length; i++) {
      const token = valueTokens[i];
      const tokenValue = token.raw || String(token.value);
      const prevToken = i > 0 ? valueTokens[i - 1] : null;
      const prevValue = prevToken ? (prevToken.raw || String(prevToken.value)) : '';

      // Track parenthesis depth
      if (tokenValue === '(') parenDepth++;
      if (tokenValue === ')') parenDepth--;

      // Track CSS var() context
      if (prevValue === 'var' && tokenValue === '(') {
        inCssVar = true;
      } else if (inCssVar && tokenValue === ')') {
        inCssVar = false;
      }

      // Track calc/min/max/clamp context - operators need spaces in these
      if (mathFunctions.has(prevValue) && tokenValue === '(') {
        inCalc = true;
        calcDepth = parenDepth;
      } else if (inCalc && tokenValue === ')' && parenDepth < calcDepth) {
        inCalc = false;
      }

      // Handle HEX_COLOR token (from lexer) - it's already a complete hex color
      if (token.type === TokenType.HEX_COLOR) {
        // HEX_COLOR is already complete, no tracking needed
        inHexColor = false;
      }
      // Track hex colors for legacy cases - look for # followed by hex digits
      // Handle cases like #667eea being tokenized as # 667 eea
      // Valid hex colors are 3, 4, 6, or 8 chars long
      else if (tokenValue === '#') {
        inHexColor = true;
        hexLength = 0;
      } else if (inHexColor) {
        // Check if this token could be part of hex color
        // Numbers and identifiers that are valid hex chars continue the color
        const tokenStr = String(tokenValue);
        if (isValidHex(tokenStr) && hexLength + tokenStr.length <= 8) {
          hexLength += tokenStr.length;

          // Check if we should stop collecting hex color now
          // Stop if: we have 6+ chars, OR the next token is likely a CSS value (%, px, etc.)
          const nextToken = valueTokens[i + 1];
          const nextValue = nextToken ? String(nextToken.raw || nextToken.value) : '';

          // CSS units/symbols that indicate the hex color is complete
          const cssValueIndicators = new Set(['%', 'px', 'em', 'rem', 'vh', 'vw', ',', ')', ' ', '']);

          // End hex color if:
          // - We've reached 6 or 8 chars (complete hex)
          // - Next token is a CSS unit/punctuation (like %, px, comma, paren)
          // - Next token is empty (end of value)
          if (hexLength >= 6 || cssValueIndicators.has(nextValue) || nextToken?.type === TokenType.PERCENT || nextToken?.type === TokenType.COMMA || nextToken?.type === TokenType.RPAREN) {
            inHexColor = false;  // Done collecting hex color
          }
        } else {
          // This token is not part of hex, end hex color collection
          inHexColor = false;
        }
      }

      // Determine if we need space before this token
      let needsSpace = value.length > 0;

      if (needsSpace) {
        // No space after # (hex color start)
        if (prevValue === '#') {
          needsSpace = false;
        }
        // No space after these
        else if (prevValue === '(' || prevValue === '.' || prevValue === '/' || prevValue === '@') {
          needsSpace = false;
        }
        // No space after ! for !important
        else if (prevValue === '!' && tokenValue === 'important') {
          needsSpace = false;
        }
        // No space after CSS functions before (
        else if (cssFunctions.has(prevValue) && tokenValue === '(') {
          needsSpace = false;
        }
        // No space before these
        else if (noSpaceBefore.has(tokenValue)) {
          needsSpace = false;
        }
        // No space in hex colors (continuing after #)
        else if (inHexColor && hexLength > 0) {
          needsSpace = false;
        }
        // No space in CSS var() content
        else if (inCssVar) {
          needsSpace = false;
        }
        // No space for hyphenated identifiers (ease-in-out, sans-serif, -apple-system)
        // BUT in calc(), min(), max(), clamp() - operators need spaces around them
        // Note: Some CSS keywords like 'in' are also Pulse keywords, so check token value too
        // Check if current token is '-' and should attach to previous identifier-like token
        else if (tokenValue === '-' && !inCalc && (prevToken?.type === TokenType.IDENT || prevToken?.type === TokenType.NUMBER || /^[a-zA-Z]/.test(prevValue))) {
          needsSpace = false;
        }
        // Check if current token follows a '-' (either prevValue is '-' or value ends with '-')
        // Include keywords that might appear in CSS values (in, from, to, etc.)
        // BUT in calc(), don't attach numbers to '-' (keep space for operators)
        else if (!inCalc && (prevValue === '-' || value.endsWith('-')) && (token.type === TokenType.IDENT || token.type === TokenType.NUMBER || /^[a-zA-Z]/.test(tokenValue))) {
          needsSpace = false;
        }
        // No space for -- (CSS custom property reference)
        else if (prevValue === '-' && tokenValue === '-') {
          needsSpace = false;
        }
        else if (prevValue === '--' || value.endsWith('--')) {
          needsSpace = false;
        }
        // CSS unit after number
        else if (cssUnits.has(tokenValue) && prevToken?.type === TokenType.NUMBER) {
          needsSpace = false;
        }
        // Handle cases like preserve-3d where identifier follows number in hyphenated value
        // Check if we're continuing a hyphenated identifier (value ends with number after hyphen)
        else if (token.type === TokenType.IDENT && prevToken?.type === TokenType.NUMBER) {
          // Check if the value looks like it's a hyphenated pattern: word-NUM + IDENT (e.g., preserve-3 + d, card-3 + d)
          const hyphenNumberPattern = /-\d+$/;
          if (hyphenNumberPattern.test(value)) {
            needsSpace = false;
          }
        }
      }

      if (needsSpace) {
        value += ' ';
      }

      value += tokenValue;
    }

    value = value.trim();

    if (this.is(TokenType.SEMICOLON)) {
      this.advance();
    }

    return new ASTNode(NodeType.StyleProperty, { name, value });
  }

  // =============================================================================
  // Router Parsing
  // =============================================================================

  /**
   * Parse router block
   * router {
   *   mode: "hash"
   *   base: "/app"
   *   routes { "/": HomePage }
   *   beforeEach(to, from) { ... }
   *   afterEach(to) { ... }
   * }
   */
  parseRouterBlock() {
    this.expect(TokenType.ROUTER);
    this.expect(TokenType.LBRACE);

    const config = {
      mode: 'history',
      base: '',
      routes: [],
      beforeEach: null,
      afterEach: null
    };

    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      // mode: "hash"
      if (this.is(TokenType.MODE)) {
        this.advance();
        this.expect(TokenType.COLON);
        config.mode = this.expect(TokenType.STRING).value;
      }
      // base: "/app"
      else if (this.is(TokenType.BASE)) {
        this.advance();
        this.expect(TokenType.COLON);
        config.base = this.expect(TokenType.STRING).value;
      }
      // routes { ... }
      else if (this.is(TokenType.ROUTES)) {
        config.routes = this.parseRoutesBlock();
      }
      // beforeEach(to, from) { ... }
      else if (this.is(TokenType.BEFORE_EACH)) {
        config.beforeEach = this.parseGuardHook('beforeEach');
      }
      // afterEach(to) { ... }
      else if (this.is(TokenType.AFTER_EACH)) {
        config.afterEach = this.parseGuardHook('afterEach');
      }
      else {
        throw this.createError(
          `Unexpected token '${this.current()?.value}' in router block. ` +
          `Expected: mode, base, routes, beforeEach, or afterEach`
        );
      }
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.RouterBlock, config);
  }

  /**
   * Parse routes block
   * routes {
   *   "/": HomePage
   *   "/users/:id": UserPage
   * }
   */
  parseRoutesBlock() {
    this.expect(TokenType.ROUTES);
    this.expect(TokenType.LBRACE);

    const routes = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      const path = this.expect(TokenType.STRING).value;
      this.expect(TokenType.COLON);
      const handler = this.expect(TokenType.IDENT).value;
      routes.push(new ASTNode(NodeType.RouteDefinition, { path, handler }));
    }

    this.expect(TokenType.RBRACE);
    return routes;
  }

  /**
   * Parse guard hook: beforeEach(to, from) { ... }
   */
  parseGuardHook(name) {
    this.advance(); // skip keyword
    this.expect(TokenType.LPAREN);
    const params = [];
    while (!this.is(TokenType.RPAREN) && !this.is(TokenType.EOF)) {
      // Accept IDENT or FROM (since 'from' is a keyword but valid as parameter name)
      if (this.is(TokenType.IDENT)) {
        params.push(this.advance().value);
      } else if (this.is(TokenType.FROM)) {
        params.push(this.advance().value);
      } else {
        throw this.createError(`Expected parameter name but got ${this.current()?.type}`);
      }
      if (this.is(TokenType.COMMA)) this.advance();
    }
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    const body = this.parseFunctionBody();
    this.expect(TokenType.RBRACE);

    return new ASTNode(NodeType.GuardHook, { name, params, body });
  }

  // =============================================================================
  // Store Parsing
  // =============================================================================

  /**
   * Parse store block
   * store {
   *   state { ... }
   *   getters { ... }
   *   actions { ... }
   *   persist: true
   *   storageKey: "my-store"
   * }
   */
  parseStoreBlock() {
    this.expect(TokenType.STORE);
    this.expect(TokenType.LBRACE);

    const config = {
      state: null,
      getters: null,
      actions: null,
      persist: false,
      storageKey: 'pulse-store',
      plugins: []
    };

    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      // state { ... }
      if (this.is(TokenType.STATE)) {
        config.state = this.parseStateBlock();
      }
      // getters { ... }
      else if (this.is(TokenType.GETTERS)) {
        config.getters = this.parseGettersBlock();
      }
      // actions { ... }
      else if (this.is(TokenType.ACTIONS)) {
        config.actions = this.parseActionsBlock();
      }
      // persist: true
      else if (this.is(TokenType.PERSIST)) {
        this.advance();
        this.expect(TokenType.COLON);
        if (this.is(TokenType.TRUE)) {
          this.advance();
          config.persist = true;
        } else if (this.is(TokenType.FALSE)) {
          this.advance();
          config.persist = false;
        } else {
          throw this.createError('Expected true or false for persist');
        }
      }
      // storageKey: "my-store"
      else if (this.is(TokenType.STORAGE_KEY)) {
        this.advance();
        this.expect(TokenType.COLON);
        config.storageKey = this.expect(TokenType.STRING).value;
      }
      // plugins: [historyPlugin, loggerPlugin]
      else if (this.is(TokenType.PLUGINS)) {
        this.advance();
        this.expect(TokenType.COLON);
        config.plugins = this.parseArrayLiteral();
      }
      else {
        throw this.createError(
          `Unexpected token '${this.current()?.value}' in store block. ` +
          `Expected: state, getters, actions, persist, storageKey, or plugins`
        );
      }
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.StoreBlock, config);
  }

  /**
   * Parse getters block
   * getters {
   *   doubled() { return this.count * 2 }
   * }
   */
  parseGettersBlock() {
    this.expect(TokenType.GETTERS);
    this.expect(TokenType.LBRACE);

    const getters = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      getters.push(this.parseGetterDeclaration());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.GettersBlock, { getters });
  }

  /**
   * Parse getter declaration: name() { return ... }
   */
  parseGetterDeclaration() {
    const name = this.expect(TokenType.IDENT).value;
    this.expect(TokenType.LPAREN);
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    const body = this.parseFunctionBody();
    this.expect(TokenType.RBRACE);

    return new ASTNode(NodeType.GetterDeclaration, { name, body });
  }

  // =============================================================================
  // Router View Directives
  // =============================================================================

  /**
   * Parse @link directive: @link("/path") "text"
   */
  parseLinkDirective() {
    this.expect(TokenType.LPAREN);
    const path = this.parseExpression();

    let options = null;
    if (this.is(TokenType.COMMA)) {
      this.advance();
      options = this.parseObjectLiteralExpr();
    }
    this.expect(TokenType.RPAREN);

    // Parse link content (text or children)
    let content = null;
    if (this.is(TokenType.STRING)) {
      content = this.parseTextNode();
    } else if (this.is(TokenType.LBRACE)) {
      this.advance();
      content = [];
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        content.push(this.parseViewChild());
      }
      this.expect(TokenType.RBRACE);
    }

    return new ASTNode(NodeType.LinkDirective, { path, options, content });
  }

  /**
   * Parse @outlet directive
   */
  parseOutletDirective() {
    let container = null;
    if (this.is(TokenType.LPAREN)) {
      this.advance();
      if (this.is(TokenType.STRING)) {
        container = this.expect(TokenType.STRING).value;
      }
      this.expect(TokenType.RPAREN);
    }
    return new ASTNode(NodeType.OutletDirective, { container });
  }

  /**
   * Parse @navigate directive
   */
  parseNavigateDirective() {
    this.expect(TokenType.LPAREN);
    const path = this.parseExpression();

    let options = null;
    if (this.is(TokenType.COMMA)) {
      this.advance();
      options = this.parseObjectLiteralExpr();
    }
    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.NavigateDirective, { path, options });
  }

  /**
   * Check if current position starts a new property
   */
  isPropertyStart() {
    // Check if it looks like: identifier (with possible hyphens) followed by :
    // CSS properties can be: margin, margin-bottom, -webkit-transform, --custom-prop, etc.
    // Include MINUSMINUS for CSS custom properties (--var-name)
    if (!this.is(TokenType.IDENT) && !this.is(TokenType.MINUS) && !this.is(TokenType.MINUSMINUS)) return false;

    let i = 0;
    // Skip over property name tokens (IDENT, MINUS, MINUSMINUS for hyphenated/custom props)
    while (this.peek(i)) {
      const token = this.peek(i);
      if (token.type === TokenType.IDENT || token.type === TokenType.MINUS || token.type === TokenType.MINUSMINUS) {
        i++;
      } else {
        break;
      }
    }

    return this.peek(i)?.type === TokenType.COLON;
  }
}

/**
 * Parse source code into AST
 */
export function parse(source) {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}

export default {
  NodeType,
  ASTNode,
  Parser,
  parse
};
