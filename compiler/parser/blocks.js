/**
 * Pulse Parser - Block Parsing
 *
 * Actions, router, store blocks, and function/guard parsing
 *
 * @module compiler/parser/blocks
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// ============================================================
// Actions Block Parsing
// ============================================================

/**
 * Parse actions block
 */
Parser.prototype.parseActionsBlock = function() {
  this.expect(TokenType.ACTIONS);
  this.expect(TokenType.LBRACE);

  const functions = [];
  while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
    functions.push(this.parseFunctionDeclaration());
  }

  this.expect(TokenType.RBRACE);
  return new ASTNode(NodeType.ActionsBlock, { functions });
};

/**
 * Parse function declaration
 */
Parser.prototype.parseFunctionDeclaration = function() {
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
};

/**
 * Parse function body (raw content between braces)
 */
Parser.prototype.parseFunctionBody = function() {
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
};

// ============================================================
// Router Block Parsing
// ============================================================

/**
 * Parse router block
 */
Parser.prototype.parseRouterBlock = function() {
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
};

/**
 * Parse routes block
 */
Parser.prototype.parseRoutesBlock = function() {
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
};

/**
 * Parse guard hook: beforeEach(to, from) { ... }
 */
Parser.prototype.parseGuardHook = function(name) {
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
};

// ============================================================
// Store Block Parsing
// ============================================================

/**
 * Parse store block
 */
Parser.prototype.parseStoreBlock = function() {
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
};

/**
 * Parse getters block
 */
Parser.prototype.parseGettersBlock = function() {
  this.expect(TokenType.GETTERS);
  this.expect(TokenType.LBRACE);

  const getters = [];
  while (!this.is(TokenType.RBRACE) && !this.is(TokenType.EOF)) {
    getters.push(this.parseGetterDeclaration());
  }

  this.expect(TokenType.RBRACE);
  return new ASTNode(NodeType.GettersBlock, { getters });
};

/**
 * Parse getter declaration: name() { return ... }
 */
Parser.prototype.parseGetterDeclaration = function() {
  const name = this.expect(TokenType.IDENT).value;
  this.expect(TokenType.LPAREN);
  this.expect(TokenType.RPAREN);
  this.expect(TokenType.LBRACE);
  const body = this.parseFunctionBody();
  this.expect(TokenType.RBRACE);

  return new ASTNode(NodeType.GetterDeclaration, { name, body });
};

// ============================================================
// Router View Directives
// ============================================================

/**
 * Parse @link directive: @link("/path") "text"
 */
Parser.prototype.parseLinkDirective = function() {
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
};

/**
 * Parse @outlet directive
 */
Parser.prototype.parseOutletDirective = function() {
  let container = null;
  if (this.is(TokenType.LPAREN)) {
    this.advance();
    if (this.is(TokenType.STRING)) {
      container = this.expect(TokenType.STRING).value;
    }
    this.expect(TokenType.RPAREN);
  }
  return new ASTNode(NodeType.OutletDirective, { container });
};

/**
 * Parse @navigate directive
 */
Parser.prototype.parseNavigateDirective = function() {
  this.expect(TokenType.LPAREN);
  const path = this.parseExpression();

  let options = null;
  if (this.is(TokenType.COMMA)) {
    this.advance();
    options = this.parseObjectLiteralExpr();
  }
  this.expect(TokenType.RPAREN);

  return new ASTNode(NodeType.NavigateDirective, { path, options });
};
