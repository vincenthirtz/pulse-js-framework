/**
 * Pulse Lexer - Tokenizer for .pulse files
 *
 * Converts source code into a stream of tokens
 */

// Token types
export const TokenType = {
  // Keywords
  STATE: 'STATE',
  PROPS: 'PROPS',
  VIEW: 'VIEW',
  ACTIONS: 'ACTIONS',
  STYLE: 'STYLE',
  IMPORT: 'IMPORT',
  FROM: 'FROM',
  AS: 'AS',
  EXPORT: 'EXPORT',
  SLOT: 'SLOT',

  // Router/Store keywords
  ROUTER: 'ROUTER',
  STORE: 'STORE',
  ROUTES: 'ROUTES',
  GETTERS: 'GETTERS',
  BEFORE_EACH: 'BEFORE_EACH',
  AFTER_EACH: 'AFTER_EACH',
  PERSIST: 'PERSIST',
  STORAGE_KEY: 'STORAGE_KEY',
  PLUGINS: 'PLUGINS',
  MODE: 'MODE',
  BASE: 'BASE',

  // Directives
  AT: 'AT',           // @
  DIRECTIVE_MOD: 'DIRECTIVE_MOD', // .modifier after @directive (e.g., @click.prevent)
  PAGE: 'PAGE',
  ROUTE: 'ROUTE',
  IF: 'IF',
  ELSE: 'ELSE',
  EACH: 'EACH',
  FOR: 'FOR',
  IN: 'IN',
  OF: 'OF',

  // Router view directives
  LINK: 'LINK',
  OUTLET: 'OUTLET',
  NAVIGATE: 'NAVIGATE',
  BACK: 'BACK',
  FORWARD: 'FORWARD',

  // Punctuation
  LBRACE: 'LBRACE',   // {
  RBRACE: 'RBRACE',   // }
  LPAREN: 'LPAREN',   // (
  RPAREN: 'RPAREN',   // )
  LBRACKET: 'LBRACKET', // [
  RBRACKET: 'RBRACKET', // ]
  COLON: 'COLON',     // :
  COMMA: 'COMMA',     // ,
  DOT: 'DOT',         // .
  HASH: 'HASH',       // #
  AMPERSAND: 'AMPERSAND', // & (CSS parent selector)
  SEMICOLON: 'SEMICOLON', // ;

  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  PERCENT: 'PERCENT', // %
  EQ: 'EQ',           // =
  EQEQ: 'EQEQ',       // ==
  EQEQEQ: 'EQEQEQ',   // ===
  NEQ: 'NEQ',         // !=
  NEQEQ: 'NEQEQ',     // !==
  LT: 'LT',           // <
  GT: 'GT',           // >
  LTE: 'LTE',         // <=
  GTE: 'GTE',         // >=
  AND: 'AND',         // &&
  OR: 'OR',           // ||
  NOT: 'NOT',         // !
  PLUSPLUS: 'PLUSPLUS', // ++
  MINUSMINUS: 'MINUSMINUS', // --
  QUESTION: 'QUESTION', // ?
  ARROW: 'ARROW',     // =>
  SPREAD: 'SPREAD',   // ...

  // Literals
  STRING: 'STRING',
  TEMPLATE: 'TEMPLATE', // Template literal `...`
  NUMBER: 'NUMBER',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  NULL: 'NULL',

  // Identifiers and selectors
  IDENT: 'IDENT',
  SELECTOR: 'SELECTOR',  // CSS selector like .class, #id, tag.class#id

  // Special
  INTERPOLATION_START: 'INTERPOLATION_START', // {
  INTERPOLATION_END: 'INTERPOLATION_END',     // }
  TEXT: 'TEXT',       // Text content inside strings

  // Misc
  NEWLINE: 'NEWLINE',
  EOF: 'EOF',
  ERROR: 'ERROR'
};

// Keywords map
const KEYWORDS = {
  'state': TokenType.STATE,
  'props': TokenType.PROPS,
  'view': TokenType.VIEW,
  'actions': TokenType.ACTIONS,
  'style': TokenType.STYLE,
  'import': TokenType.IMPORT,
  'from': TokenType.FROM,
  'as': TokenType.AS,
  'export': TokenType.EXPORT,
  'slot': TokenType.SLOT,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'each': TokenType.EACH,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'of': TokenType.OF,
  'page': TokenType.PAGE,
  'route': TokenType.ROUTE,
  'router': TokenType.ROUTER,
  'store': TokenType.STORE,
  'routes': TokenType.ROUTES,
  'getters': TokenType.GETTERS,
  'beforeEach': TokenType.BEFORE_EACH,
  'afterEach': TokenType.AFTER_EACH,
  'persist': TokenType.PERSIST,
  'storageKey': TokenType.STORAGE_KEY,
  'plugins': TokenType.PLUGINS,
  'mode': TokenType.MODE,
  'base': TokenType.BASE,
  'link': TokenType.LINK,
  'outlet': TokenType.OUTLET,
  'navigate': TokenType.NAVIGATE,
  'back': TokenType.BACK,
  'forward': TokenType.FORWARD,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL,
  'async': TokenType.IDENT,
  'await': TokenType.IDENT,
  'let': TokenType.IDENT,
  'const': TokenType.IDENT,
  'return': TokenType.IDENT,
  'new': TokenType.IDENT,
  'function': TokenType.IDENT,
  'this': TokenType.IDENT
};

/**
 * Token class
 */
export class Token {
  constructor(type, value, line, column, raw = null, startPos = null, endPos = null) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.raw = raw || value;
    this.startPos = startPos;
    this.endPos = endPos;
  }

  toString() {
    return `Token(${this.type}, ${JSON.stringify(this.value)}, ${this.line}:${this.column})`;
  }
}

/**
 * Lexer class
 */
export class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
  }

  /**
   * Get current character
   */
  current() {
    return this.source[this.pos];
  }

  /**
   * Peek at character at offset
   */
  peek(offset = 1) {
    return this.source[this.pos + offset];
  }

  /**
   * Check if at end of input
   */
  isEOF() {
    return this.pos >= this.source.length;
  }

  /**
   * Advance position and return current char
   */
  advance() {
    const char = this.current();
    this.pos++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  /**
   * Create a token
   */
  token(type, value, raw = null) {
    return new Token(type, value, this.line, this.column, raw);
  }

  /**
   * Skip whitespace (but not newlines in some contexts)
   */
  skipWhitespace(includeNewlines = true) {
    while (!this.isEOF()) {
      const char = this.current();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n' && includeNewlines) {
        this.advance();
      } else if (char === '/' && this.peek() === '/') {
        // Single-line comment
        while (!this.isEOF() && this.current() !== '\n') {
          this.advance();
        }
      } else if (char === '/' && this.peek() === '*') {
        // Multi-line comment
        this.advance(); // /
        this.advance(); // *
        while (!this.isEOF() && !(this.current() === '*' && this.peek() === '/')) {
          this.advance();
        }
        if (!this.isEOF()) {
          this.advance(); // *
          this.advance(); // /
        }
      } else {
        break;
      }
    }
  }

  /**
   * Peek at the current word without advancing position
   */
  peekWord() {
    let word = '';
    let i = this.pos;
    while (i < this.source.length && /[a-zA-Z0-9_$]/.test(this.source[i])) {
      word += this.source[i];
      i++;
    }
    return word;
  }

  /**
   * Read a string literal
   */
  readString() {
    const quote = this.advance(); // opening quote
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';
    let raw = quote;

    while (!this.isEOF() && this.current() !== quote) {
      if (this.current() === '\\') {
        raw += this.advance();
        if (!this.isEOF()) {
          const escaped = this.advance();
          raw += escaped;
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            case "'": value += "'"; break;
            default: value += escaped;
          }
        }
      } else {
        value += this.current();
        raw += this.advance();
      }
    }

    if (!this.isEOF()) {
      raw += this.advance(); // closing quote
    }

    return new Token(TokenType.STRING, value, startLine, startColumn, raw);
  }

  /**
   * Read a template literal (backtick string)
   */
  readTemplateLiteral() {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // opening backtick
    let value = '';
    let raw = '`';

    while (!this.isEOF() && this.current() !== '`') {
      if (this.current() === '\\') {
        raw += this.advance();
        if (!this.isEOF()) {
          const escaped = this.advance();
          raw += escaped;
          value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
        }
      } else if (this.current() === '$' && this.peek() === '{') {
        // Template expression ${...}
        value += this.current();
        raw += this.advance();
        value += this.current();
        raw += this.advance();
        let braceCount = 1;
        while (!this.isEOF() && braceCount > 0) {
          if (this.current() === '{') braceCount++;
          else if (this.current() === '}') braceCount--;
          value += this.current();
          raw += this.advance();
        }
      } else {
        value += this.current();
        raw += this.advance();
      }
    }

    if (!this.isEOF()) {
      raw += this.advance(); // closing backtick
    }

    return new Token(TokenType.TEMPLATE, value, startLine, startColumn, raw);
  }

  /**
   * Read a number literal
   */
  readNumber() {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Integer part
    while (!this.isEOF() && /[0-9]/.test(this.current())) {
      value += this.advance();
    }

    // Decimal part
    if (this.current() === '.' && /[0-9]/.test(this.peek())) {
      value += this.advance(); // .
      while (!this.isEOF() && /[0-9]/.test(this.current())) {
        value += this.advance();
      }
    }

    // Exponent part
    if (this.current() === 'e' || this.current() === 'E') {
      value += this.advance();
      if (this.current() === '+' || this.current() === '-') {
        value += this.advance();
      }
      while (!this.isEOF() && /[0-9]/.test(this.current())) {
        value += this.advance();
      }
    }

    return new Token(TokenType.NUMBER, parseFloat(value), startLine, startColumn, value);
  }

  /**
   * Read an identifier or keyword
   */
  readIdentifier() {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    while (!this.isEOF() && /[a-zA-Z0-9_$]/.test(this.current())) {
      value += this.advance();
    }

    const type = KEYWORDS[value] || TokenType.IDENT;
    return new Token(type, value, startLine, startColumn);
  }

  /**
   * Read a CSS selector
   * Examples: div, .class, #id, button.primary, input[type=text]
   */
  readSelector() {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Start with tag name if present
    if (/[a-zA-Z]/.test(this.current())) {
      while (!this.isEOF() && /[a-zA-Z0-9-]/.test(this.current())) {
        value += this.advance();
      }
    }

    // Continue with classes, ids, and attributes
    while (!this.isEOF()) {
      if (this.current() === '.') {
        value += this.advance();
        while (!this.isEOF() && /[a-zA-Z0-9_-]/.test(this.current())) {
          value += this.advance();
        }
      } else if (this.current() === '#') {
        value += this.advance();
        while (!this.isEOF() && /[a-zA-Z0-9_-]/.test(this.current())) {
          value += this.advance();
        }
      } else if (this.current() === '[') {
        value += this.advance();
        while (!this.isEOF() && this.current() !== ']') {
          value += this.advance();
        }
        if (this.current() === ']') {
          value += this.advance();
        }
      } else {
        break;
      }
    }

    return new Token(TokenType.SELECTOR, value, startLine, startColumn);
  }

  /**
   * Tokenize the entire source
   */
  tokenize() {
    this.tokens = [];
    let inViewBlock = false;
    let braceDepth = 0;

    while (!this.isEOF()) {
      this.skipWhitespace();

      if (this.isEOF()) break;

      const startLine = this.line;
      const startColumn = this.column;
      const char = this.current();

      // Template literals
      if (char === '`') {
        this.tokens.push(this.readTemplateLiteral());
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // Spread operator
      if (char === '.' && this.peek() === '.' && this.peek(2) === '.') {
        this.advance();
        this.advance();
        this.advance();
        this.tokens.push(new Token(TokenType.SPREAD, '...', startLine, startColumn));
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // At-sign for directives with optional modifiers
      if (char === '@') {
        this.advance();
        this.tokens.push(new Token(TokenType.AT, '@', startLine, startColumn));

        // After @, read directive name (if identifier follows)
        if (/[a-zA-Z]/.test(this.current())) {
          // Read the directive name
          const nameToken = this.readIdentifier();
          this.tokens.push(nameToken);

          // Read modifiers: .prevent, .stop, .enter, etc.
          while (!this.isEOF() && this.current() === '.' && /[a-zA-Z]/.test(this.peek())) {
            this.advance(); // skip '.'
            const modStartLine = this.line;
            const modStartColumn = this.column;
            let modName = '';
            while (!this.isEOF() && /[a-zA-Z0-9]/.test(this.current())) {
              modName += this.advance();
            }
            if (modName) {
              this.tokens.push(new Token(TokenType.DIRECTIVE_MOD, modName, modStartLine, modStartColumn));
            }
          }
        }
        continue;
      }

      // Punctuation and operators
      switch (char) {
        case '{':
          this.advance();
          braceDepth++;
          this.tokens.push(new Token(TokenType.LBRACE, '{', startLine, startColumn));
          continue;
        case '}':
          this.advance();
          braceDepth--;
          this.tokens.push(new Token(TokenType.RBRACE, '}', startLine, startColumn));
          continue;
        case '(':
          this.advance();
          this.tokens.push(new Token(TokenType.LPAREN, '(', startLine, startColumn));
          continue;
        case ')':
          this.advance();
          this.tokens.push(new Token(TokenType.RPAREN, ')', startLine, startColumn));
          continue;
        case '[':
          this.advance();
          this.tokens.push(new Token(TokenType.LBRACKET, '[', startLine, startColumn));
          continue;
        case ']':
          this.advance();
          this.tokens.push(new Token(TokenType.RBRACKET, ']', startLine, startColumn));
          continue;
        case ':':
          this.advance();
          this.tokens.push(new Token(TokenType.COLON, ':', startLine, startColumn));
          continue;
        case ',':
          this.advance();
          this.tokens.push(new Token(TokenType.COMMA, ',', startLine, startColumn));
          continue;
        case ';':
          this.advance();
          this.tokens.push(new Token(TokenType.SEMICOLON, ';', startLine, startColumn));
          continue;
        case '+':
          this.advance();
          if (this.current() === '+') {
            this.advance();
            this.tokens.push(new Token(TokenType.PLUSPLUS, '++', startLine, startColumn));
          } else {
            this.tokens.push(new Token(TokenType.PLUS, '+', startLine, startColumn));
          }
          continue;
        case '-':
          this.advance();
          if (this.current() === '-') {
            this.advance();
            this.tokens.push(new Token(TokenType.MINUSMINUS, '--', startLine, startColumn));
          } else {
            this.tokens.push(new Token(TokenType.MINUS, '-', startLine, startColumn));
          }
          continue;
        case '*':
          this.advance();
          this.tokens.push(new Token(TokenType.STAR, '*', startLine, startColumn));
          continue;
        case '/':
          this.advance();
          this.tokens.push(new Token(TokenType.SLASH, '/', startLine, startColumn));
          continue;
        case '=':
          this.advance();
          if (this.current() === '=') {
            this.advance();
            if (this.current() === '=') {
              this.advance();
              this.tokens.push(new Token(TokenType.EQEQEQ, '===', startLine, startColumn));
            } else {
              this.tokens.push(new Token(TokenType.EQEQ, '==', startLine, startColumn));
            }
          } else if (this.current() === '>') {
            this.advance();
            this.tokens.push(new Token(TokenType.ARROW, '=>', startLine, startColumn));
          } else {
            this.tokens.push(new Token(TokenType.EQ, '=', startLine, startColumn));
          }
          continue;
        case '?':
          this.advance();
          this.tokens.push(new Token(TokenType.QUESTION, '?', startLine, startColumn));
          continue;
        case '%':
          this.advance();
          this.tokens.push(new Token(TokenType.PERCENT, '%', startLine, startColumn));
          continue;
        case '!':
          this.advance();
          if (this.current() === '=') {
            this.advance();
            if (this.current() === '=') {
              this.advance();
              this.tokens.push(new Token(TokenType.NEQEQ, '!==', startLine, startColumn));
            } else {
              this.tokens.push(new Token(TokenType.NEQ, '!=', startLine, startColumn));
            }
          } else {
            this.tokens.push(new Token(TokenType.NOT, '!', startLine, startColumn));
          }
          continue;
        case '<':
          this.advance();
          if (this.current() === '=') {
            this.advance();
            this.tokens.push(new Token(TokenType.LTE, '<=', startLine, startColumn));
          } else {
            this.tokens.push(new Token(TokenType.LT, '<', startLine, startColumn));
          }
          continue;
        case '>':
          this.advance();
          if (this.current() === '=') {
            this.advance();
            this.tokens.push(new Token(TokenType.GTE, '>=', startLine, startColumn));
          } else {
            this.tokens.push(new Token(TokenType.GT, '>', startLine, startColumn));
          }
          continue;
        case '&':
          this.advance();
          if (this.current() === '&') {
            this.advance();
            this.tokens.push(new Token(TokenType.AND, '&&', startLine, startColumn));
          } else {
            // Single & is the CSS parent selector
            this.tokens.push(new Token(TokenType.AMPERSAND, '&', startLine, startColumn));
          }
          continue;
        case '|':
          this.advance();
          if (this.current() === '|') {
            this.advance();
            this.tokens.push(new Token(TokenType.OR, '||', startLine, startColumn));
          }
          continue;
      }

      // Check for selector start (. or #) in view context
      if ((char === '.' || char === '#') && this.isViewContext()) {
        this.tokens.push(this.readSelector());
        continue;
      }

      // Dot outside selector
      if (char === '.') {
        this.advance();
        this.tokens.push(new Token(TokenType.DOT, '.', startLine, startColumn));
        continue;
      }

      // Hash outside selector
      if (char === '#') {
        this.advance();
        this.tokens.push(new Token(TokenType.HASH, '#', startLine, startColumn));
        continue;
      }

      // Identifiers, keywords, and selectors
      if (/[a-zA-Z_$]/.test(char)) {
        // First check if this is a keyword - keywords take precedence
        const word = this.peekWord();
        if (KEYWORDS[word]) {
          this.tokens.push(this.readIdentifier());
        } else if (this.isViewContext() && this.couldBeSelector()) {
          // Only treat as selector if not a keyword
          this.tokens.push(this.readSelector());
        } else {
          this.tokens.push(this.readIdentifier());
        }
        continue;
      }

      // Unknown character - error
      this.tokens.push(new Token(TokenType.ERROR, char, startLine, startColumn));
      this.advance();
    }

    this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column));
    return this.tokens;
  }

  /**
   * Check if we're in a view context where selectors are expected
   */
  isViewContext() {
    // Look back through tokens for 'view' keyword
    let inView = false;
    let parenDepth = 0;

    // After @ token, next word is directive name (not selector)
    const lastToken = this.tokens[this.tokens.length - 1];
    if (lastToken && lastToken.type === TokenType.AT) {
      return false;
    }

    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];

      // Track parentheses depth (backwards)
      if (token.type === TokenType.RPAREN) {
        parenDepth++;
      } else if (token.type === TokenType.LPAREN) {
        parenDepth--;
        // If we go negative, we're inside parentheses (expression context)
        if (parenDepth < 0) {
          return false;  // Inside expression, not selector context
        }
      }

      if (token.type === TokenType.VIEW) {
        inView = true;
        break;
      }
      if (token.type === TokenType.STATE ||
          token.type === TokenType.ACTIONS ||
          token.type === TokenType.STYLE ||
          token.type === TokenType.ROUTER ||
          token.type === TokenType.STORE ||
          token.type === TokenType.ROUTES ||
          token.type === TokenType.GETTERS) {
        return false;
      }
    }

    return inView;
  }

  /**
   * Check if current position could start a selector
   */
  couldBeSelector() {
    // Check if followed by . or # or [ or { which indicate selector continuation
    let lookahead = 0;
    while (this.pos + lookahead < this.source.length) {
      const char = this.source[this.pos + lookahead];
      if (/[a-zA-Z0-9_-]/.test(char)) {
        lookahead++;
        continue;
      }
      if (char === '.' || char === '#' || char === '[' || char === '{' || char === ' ') {
        return true;
      }
      break;
    }
    return false;
  }
}

/**
 * Convenience function to tokenize source
 */
export function tokenize(source) {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

export default {
  TokenType,
  Token,
  Lexer,
  tokenize
};
