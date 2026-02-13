/**
 * Pulse Parser - Style Block Parsing
 *
 * Handles parsing of style blocks including CSS rules and properties
 *
 * @module compiler/parser/style
 */

import { TokenType } from '../lexer.js';
import { NodeType, ASTNode, Parser } from './core.js';

// ============================================================
// Style Block Parsing
// ============================================================

/**
 * Parse style block
 */
Parser.prototype.parseStyleBlock = function() {
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
};

/**
 * Reconstruct CSS from tokens, preserving formatting
 */
Parser.prototype.reconstructCSS = function(tokens) {
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
};

/**
 * Parse style rule
 */
Parser.prototype.parseStyleRule = function() {
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
      const expectedNextCol = lastToken ? (lastToken.column + String(lastToken.value).length) : 0;
      const tokensAreAdjacent = token.column === expectedNextCol;
      const isDescendantSelector = (tokenValue === '.' || tokenValue === '#') &&
                                   lastToken?.type === TokenType.IDENT &&
                                   !inAtRule &&
                                   !tokensAreAdjacent;

      // Special case: hyphenated class/id names
      const lastPartJoined = selectorParts.join('');
      const lastSegmentMatch = lastPartJoined.match(/[.#]([a-zA-Z0-9_-]*)$/);
      const inClassName = lastSegmentMatch && lastSegmentMatch[1].length > 0;

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
};

/**
 * Check if current position is a nested rule
 */
Parser.prototype.isNestedRule = function() {
  const currentToken = this.peek(0);
  if (!currentToken) return false;

  // & is always a CSS parent selector, never a property name
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

    if (token.line > startLine && i > 0) {
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
};

/**
 * Parse style property
 */
Parser.prototype.parseStyleProperty = function() {
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
  let inCalc = false;
  let calcDepth = 0;

  const mathFunctions = new Set(['calc', 'min', 'max', 'clamp']);
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

    // Track calc/min/max/clamp context
    if (mathFunctions.has(prevValue) && tokenValue === '(') {
      inCalc = true;
      calcDepth = parenDepth;
    } else if (inCalc && tokenValue === ')' && parenDepth < calcDepth) {
      inCalc = false;
    }

    // Handle HEX_COLOR token (from lexer)
    if (token.type === TokenType.HEX_COLOR) {
      inHexColor = false;
    }
    else if (tokenValue === '#') {
      inHexColor = true;
      hexLength = 0;
    } else if (inHexColor) {
      const tokenStr = String(tokenValue);
      if (isValidHex(tokenStr) && hexLength + tokenStr.length <= 8) {
        hexLength += tokenStr.length;

        const nextToken = valueTokens[i + 1];
        const nextValue = nextToken ? String(nextToken.raw || nextToken.value) : '';
        const cssValueIndicators = new Set(['%', 'px', 'em', 'rem', 'vh', 'vw', ',', ')', ' ', '']);

        if (hexLength >= 6 || cssValueIndicators.has(nextValue) || nextToken?.type === TokenType.PERCENT || nextToken?.type === TokenType.COMMA || nextToken?.type === TokenType.RPAREN) {
          inHexColor = false;
        }
      } else {
        inHexColor = false;
      }
    }

    // Determine if we need space before this token
    let needsSpace = value.length > 0;

    if (needsSpace) {
      if (prevValue === '#') {
        needsSpace = false;
      }
      else if (prevValue === '(' || prevValue === '.' || prevValue === '/' || prevValue === '@') {
        needsSpace = false;
      }
      else if (prevValue === '!' && tokenValue === 'important') {
        needsSpace = false;
      }
      else if (cssFunctions.has(prevValue) && tokenValue === '(') {
        needsSpace = false;
      }
      else if (noSpaceBefore.has(tokenValue)) {
        needsSpace = false;
      }
      else if (inHexColor && hexLength > 0) {
        needsSpace = false;
      }
      else if (inCssVar) {
        needsSpace = false;
      }
      else if (tokenValue === '-' && !inCalc && (prevToken?.type === TokenType.IDENT || prevToken?.type === TokenType.NUMBER || /^[a-zA-Z]/.test(prevValue))) {
        needsSpace = false;
      }
      else if (!inCalc && (prevValue === '-' || value.endsWith('-')) && (token.type === TokenType.IDENT || token.type === TokenType.NUMBER || /^[a-zA-Z]/.test(tokenValue))) {
        needsSpace = false;
      }
      else if (prevValue === '-' && tokenValue === '-') {
        needsSpace = false;
      }
      else if (prevValue === '--' || value.endsWith('--')) {
        needsSpace = false;
      }
      else if (cssUnits.has(tokenValue) && prevToken?.type === TokenType.NUMBER) {
        needsSpace = false;
      }
      else if (token.type === TokenType.IDENT && prevToken?.type === TokenType.NUMBER) {
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
};

/**
 * Check if current position starts a new property
 */
Parser.prototype.isPropertyStart = function() {
  if (!this.is(TokenType.IDENT) && !this.is(TokenType.MINUS) && !this.is(TokenType.MINUSMINUS)) return false;

  let i = 0;
  while (this.peek(i)) {
    const token = this.peek(i);
    if (token.type === TokenType.IDENT || token.type === TokenType.MINUS || token.type === TokenType.MINUSMINUS) {
      i++;
    } else {
      break;
    }
  }

  return this.peek(i)?.type === TokenType.COLON;
};
