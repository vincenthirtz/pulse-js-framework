/**
 * Pulse Parser - AST builder for .pulse files
 *
 * Converts tokens into an Abstract Syntax Tree
 */

import { TokenType, tokenize } from './lexer.js';

// AST Node types
export const NodeType = {
  Program: 'Program',
  PageDeclaration: 'PageDeclaration',
  RouteDeclaration: 'RouteDeclaration',
  StateBlock: 'StateBlock',
  ViewBlock: 'ViewBlock',
  ActionsBlock: 'ActionsBlock',
  StyleBlock: 'StyleBlock',
  Element: 'Element',
  TextNode: 'TextNode',
  Interpolation: 'Interpolation',
  Directive: 'Directive',
  IfDirective: 'IfDirective',
  EachDirective: 'EachDirective',
  EventDirective: 'EventDirective',
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
  FunctionDeclaration: 'FunctionDeclaration',
  StyleRule: 'StyleRule',
  StyleProperty: 'StyleProperty'
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
    return this.tokens[this.pos + offset];
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
      throw new Error(
        message ||
        `Expected ${type} but got ${token?.type} at line ${token?.line}:${token?.column}`
      );
    }
    return this.advance();
  }

  /**
   * Parse the entire program
   */
  parse() {
    const program = new ASTNode(NodeType.Program, {
      page: null,
      route: null,
      state: null,
      view: null,
      actions: null,
      style: null
    });

    while (!this.is(TokenType.EOF)) {
      if (this.is(TokenType.AT)) {
        this.advance();
        if (this.is(TokenType.PAGE)) {
          program.page = this.parsePageDeclaration();
        } else if (this.is(TokenType.ROUTE)) {
          program.route = this.parseRouteDeclaration();
        }
      } else if (this.is(TokenType.STATE)) {
        program.state = this.parseStateBlock();
      } else if (this.is(TokenType.VIEW)) {
        program.view = this.parseViewBlock();
      } else if (this.is(TokenType.ACTIONS)) {
        program.actions = this.parseActionsBlock();
      } else if (this.is(TokenType.STYLE)) {
        program.style = this.parseStyleBlock();
      } else {
        throw new Error(
          `Unexpected token ${this.current()?.type} at line ${this.current()?.line}`
        );
      }
    }

    return program;
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
   * Parse a value (literal, object, array, etc.)
   */
  parseValue() {
    if (this.is(TokenType.LBRACE)) {
      return this.parseObjectLiteral();
    }
    if (this.is(TokenType.LBRACKET)) {
      return this.parseArrayLiteral();
    }
    if (this.is(TokenType.STRING)) {
      const token = this.advance();
      return new ASTNode(NodeType.Literal, { value: token.value, raw: token.raw });
    }
    if (this.is(TokenType.NUMBER)) {
      const token = this.advance();
      return new ASTNode(NodeType.Literal, { value: token.value });
    }
    if (this.is(TokenType.TRUE)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: true });
    }
    if (this.is(TokenType.FALSE)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: false });
    }
    if (this.is(TokenType.NULL)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: null });
    }
    if (this.is(TokenType.IDENT)) {
      return this.parseIdentifierOrExpression();
    }

    throw new Error(
      `Unexpected token ${this.current()?.type} in value at line ${this.current()?.line}`
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
   * Parse a view child (element, directive, or text)
   */
  parseViewChild() {
    if (this.is(TokenType.AT)) {
      return this.parseDirective();
    }
    if (this.is(TokenType.SELECTOR) || this.is(TokenType.IDENT)) {
      return this.parseElement();
    }
    if (this.is(TokenType.STRING)) {
      return this.parseTextNode();
    }

    throw new Error(
      `Unexpected token ${this.current()?.type} in view at line ${this.current()?.line}`
    );
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

    // Parse inline directives and text
    while (!this.is(TokenType.LBRACE) && !this.is(TokenType.RBRACE) &&
           !this.is(TokenType.SELECTOR) && !this.is(TokenType.EOF)) {
      if (this.is(TokenType.AT)) {
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
      children
    });
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
   * Parse a directive (@if, @each, @click, etc.)
   */
  parseDirective() {
    this.expect(TokenType.AT);
    const name = this.expect(TokenType.IDENT).value;

    if (name === 'if') {
      return this.parseIfDirective();
    }
    if (name === 'each') {
      return this.parseEachDirective();
    }

    // Event directive like @click
    return this.parseEventDirective(name);
  }

  /**
   * Parse inline directive
   */
  parseInlineDirective() {
    this.expect(TokenType.AT);
    const name = this.expect(TokenType.IDENT).value;

    // Event directive
    this.expect(TokenType.LPAREN);
    const expression = this.parseExpression();
    this.expect(TokenType.RPAREN);

    return new ASTNode(NodeType.EventDirective, { event: name, handler: expression });
  }

  /**
   * Parse @if directive
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

    let alternate = null;
    if (this.is(TokenType.AT) && this.peek()?.value === 'else') {
      this.advance(); // @
      this.advance(); // else
      this.expect(TokenType.LBRACE);
      alternate = [];
      while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
        alternate.push(this.parseViewChild());
      }
      this.expect(TokenType.RBRACE);
    }

    return new ASTNode(NodeType.IfDirective, { condition, consequent, alternate });
  }

  /**
   * Parse @each directive
   */
  parseEachDirective() {
    this.expect(TokenType.LPAREN);
    const itemName = this.expect(TokenType.IDENT).value;
    this.expect(TokenType.IN);
    const iterable = this.parseExpression();
    this.expect(TokenType.RPAREN);

    this.expect(TokenType.LBRACE);
    const template = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      template.push(this.parseViewChild());
    }
    this.expect(TokenType.RBRACE);

    return new ASTNode(NodeType.EachDirective, { itemName, iterable, template });
  }

  /**
   * Parse event directive
   */
  parseEventDirective(event) {
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

    return new ASTNode(NodeType.EventDirective, { event, handler, children });
  }

  /**
   * Parse expression (simplified)
   */
  parseExpression() {
    return this.parseOrExpression();
  }

  /**
   * Parse OR expression
   */
  parseOrExpression() {
    let left = this.parseAndExpression();

    while (this.is(TokenType.OR)) {
      this.advance();
      const right = this.parseAndExpression();
      left = new ASTNode(NodeType.BinaryExpression, { operator: '||', left, right });
    }

    return left;
  }

  /**
   * Parse AND expression
   */
  parseAndExpression() {
    let left = this.parseComparisonExpression();

    while (this.is(TokenType.AND)) {
      this.advance();
      const right = this.parseComparisonExpression();
      left = new ASTNode(NodeType.BinaryExpression, { operator: '&&', left, right });
    }

    return left;
  }

  /**
   * Parse comparison expression
   */
  parseComparisonExpression() {
    let left = this.parseAdditiveExpression();

    while (this.isAny(TokenType.EQEQ, TokenType.NEQ, TokenType.LT, TokenType.GT,
                       TokenType.LTE, TokenType.GTE)) {
      const operator = this.advance().value;
      const right = this.parseAdditiveExpression();
      left = new ASTNode(NodeType.BinaryExpression, { operator, left, right });
    }

    return left;
  }

  /**
   * Parse additive expression
   */
  parseAdditiveExpression() {
    let left = this.parseMultiplicativeExpression();

    while (this.isAny(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicativeExpression();
      left = new ASTNode(NodeType.BinaryExpression, { operator, left, right });
    }

    return left;
  }

  /**
   * Parse multiplicative expression
   */
  parseMultiplicativeExpression() {
    let left = this.parseUnaryExpression();

    while (this.isAny(TokenType.STAR, TokenType.SLASH)) {
      const operator = this.advance().value;
      const right = this.parseUnaryExpression();
      left = new ASTNode(NodeType.BinaryExpression, { operator, left, right });
    }

    return left;
  }

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
    if (this.is(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    if (this.is(TokenType.NUMBER)) {
      const token = this.advance();
      return new ASTNode(NodeType.Literal, { value: token.value });
    }

    if (this.is(TokenType.STRING)) {
      const token = this.advance();
      return new ASTNode(NodeType.Literal, { value: token.value, raw: token.raw });
    }

    if (this.is(TokenType.TRUE)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: true });
    }

    if (this.is(TokenType.FALSE)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: false });
    }

    if (this.is(TokenType.NULL)) {
      this.advance();
      return new ASTNode(NodeType.Literal, { value: null });
    }

    if (this.is(TokenType.IDENT)) {
      return this.parseIdentifierOrExpression();
    }

    throw new Error(
      `Unexpected token ${this.current()?.type} in expression at line ${this.current()?.line}`
    );
  }

  /**
   * Parse identifier with possible member access and calls
   */
  parseIdentifierOrExpression() {
    let expr = new ASTNode(NodeType.Identifier, { name: this.advance().value });

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
      params.push(this.expect(TokenType.IDENT).value);
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
    this.expect(TokenType.LBRACE);

    const rules = [];
    while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
      rules.push(this.parseStyleRule());
    }

    this.expect(TokenType.RBRACE);
    return new ASTNode(NodeType.StyleBlock, { rules });
  }

  /**
   * Parse style rule
   */
  parseStyleRule() {
    // Parse selector
    let selector = '';
    while (!this.is(TokenType.LBRACE) && !this.is(TokenType.EOF)) {
      selector += this.advance().value;
    }
    selector = selector.trim();

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
   */
  isNestedRule() {
    // Look ahead to see if there's a { before a : or newline
    let i = 0;
    while (this.peek(i) && this.peek(i).type !== TokenType.EOF) {
      const token = this.peek(i);
      if (token.type === TokenType.LBRACE) return true;
      if (token.type === TokenType.COLON) return false;
      if (token.type === TokenType.RBRACE) return false;
      i++;
    }
    return false;
  }

  /**
   * Parse style property
   */
  parseStyleProperty() {
    let name = '';
    while (!this.is(TokenType.COLON) && !this.is(TokenType.EOF)) {
      name += this.advance().value;
    }
    name = name.trim();

    this.expect(TokenType.COLON);

    let value = '';
    while (!this.is(TokenType.SEMICOLON) && !this.is(TokenType.RBRACE) &&
           !this.is(TokenType.EOF) && !this.isPropertyStart()) {
      value += this.advance().value + ' ';
    }
    value = value.trim();

    if (this.is(TokenType.SEMICOLON)) {
      this.advance();
    }

    return new ASTNode(NodeType.StyleProperty, { name, value });
  }

  /**
   * Check if current position starts a new property
   */
  isPropertyStart() {
    // Check if it looks like: identifier followed by :
    if (!this.is(TokenType.IDENT)) return false;
    let i = 1;
    while (this.peek(i) && this.peek(i).type === TokenType.IDENT) {
      i++;
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
