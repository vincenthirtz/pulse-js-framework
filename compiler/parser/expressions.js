/**
 * Pulse Parser - Expression Parsing
 *
 * Handles parsing of JavaScript expressions including assignments, conditionals,
 * binary expressions, unary expressions, and primary expressions
 *
 * @module compiler/parser/expressions
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// ============================================================
// Expression Parsing
// ============================================================

/**
 * Parse expression - delegates to assignment expression
 */
Parser.prototype.parseExpression = function() {
  return this.parseAssignmentExpression();
};

/**
 * Parse assignment expression (a = b, a += b, a -= b, etc.)
 */
Parser.prototype.parseAssignmentExpression = function() {
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
};

/**
 * Parse conditional (ternary) expression
 */
Parser.prototype.parseConditionalExpression = function() {
  const test = this.parseOrExpression();

  if (this.is(TokenType.QUESTION)) {
    this.advance();
    const consequent = this.parseAssignmentExpression();
    this.expect(TokenType.COLON);
    const alternate = this.parseAssignmentExpression();
    return new ASTNode(NodeType.ConditionalExpression, { test, consequent, alternate });
  }

  return test;
};

/**
 * Binary operator precedence table (higher index = binds tighter)
 */
Parser.BINARY_OPS = [
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
Parser.prototype.parseBinaryExpr = function(level = 0) {
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
};

/**
 * Parse OR expression (entry point for binary expressions)
 */
Parser.prototype.parseOrExpression = function() {
  return this.parseBinaryExpr(0);
};

/**
 * Parse unary expression
 */
Parser.prototype.parseUnaryExpression = function() {
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
};

/**
 * Parse postfix expression (++, --)
 */
Parser.prototype.parsePostfixExpression = function() {
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
};

/**
 * Parse primary expression
 */
Parser.prototype.parsePrimaryExpression = function() {
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
};

/**
 * Try to determine if we're looking at an arrow function
 */
Parser.prototype.tryParseArrowFunction = function() {
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
};

/**
 * Parse arrow function: (params) => expr or param => expr
 */
Parser.prototype.parseArrowFunction = function() {
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
};

/**
 * Parse array literal in expression context
 */
Parser.prototype.parseArrayLiteralExpr = function() {
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
};

/**
 * Parse object literal in expression context
 */
Parser.prototype.parseObjectLiteralExpr = function() {
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
};

/**
 * Parse identifier with possible member access and calls
 */
Parser.prototype.parseIdentifierOrExpression = function() {
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
};
