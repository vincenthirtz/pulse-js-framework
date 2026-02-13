/**
 * Pulse Parser - View Block Parsing
 *
 * Handles parsing of view blocks including elements, directives, and components
 *
 * @module compiler/parser/view
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';
import { SUGGESTIONS } from '../../runtime/errors.js';

// ============================================================
// View Block Parsing
// ============================================================

Parser.prototype.parseViewBlock = function() {
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
Parser.prototype.parseViewChild = function() {
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
Parser.prototype.parseSlotElement = function() {
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
Parser.prototype.parseElement = function() {
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
Parser.prototype.parseComponentProp = function() {
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
Parser.prototype.couldBeElement = function() {
  const next = this.peek();
  return next?.type === TokenType.LBRACE ||
         next?.type === TokenType.AT ||
         next?.type === TokenType.STRING;
};

/**
 * Parse a text node
 */
Parser.prototype.parseTextNode = function() {
  const token = this.expect(TokenType.STRING);
  const parts = this.parseInterpolatedString(token.value);
  return new ASTNode(NodeType.TextNode, { parts });
}

/**
 * Parse interpolated string into parts
 * "Hello, {name}!" -> ["Hello, ", { expr: "name" }, "!"]
 */
Parser.prototype.parseInterpolatedString = function(str) {
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
Parser.prototype.parseDirective = function() {
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
Parser.prototype.parseInlineDirective = function() {
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
Parser.prototype.parseIfDirective = function() {
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
Parser.prototype.parseEachDirective = function() {
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
Parser.prototype.parseEventDirective = function(event, modifiers = []) {
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
Parser.prototype.parseModelDirective = function(modifiers = []) {
  this.expect(TokenType.LPAREN);
  const binding = this.parseExpression();
  this.expect(TokenType.RPAREN);

  return new ASTNode(NodeType.ModelDirective, { binding, modifiers });
}

/**
 * Parse @a11y directive - sets aria attributes
 * @a11y(label="Close menu") or @a11y(label="Close", describedby="desc")
 */
Parser.prototype.parseA11yDirective = function() {
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
Parser.prototype.parseLiveDirective = function() {
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
Parser.prototype.parseFocusTrapDirective = function() {
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
Parser.prototype.parseSrOnlyDirective = function() {
  return new ASTNode(NodeType.A11yDirective, {
    attrs: { srOnly: true }
  });
};
