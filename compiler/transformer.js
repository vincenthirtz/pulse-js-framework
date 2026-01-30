/**
 * Pulse Transformer - Code generator
 *
 * Transforms AST into JavaScript code
 *
 * Features:
 * - Import statement support
 * - Slot-based component composition
 * - CSS scoping with unique class prefixes
 */

import { NodeType } from './parser.js';

/**
 * Generate a unique scope ID for CSS scoping
 */
function generateScopeId() {
  return 'p' + Math.random().toString(36).substring(2, 8);
}

/**
 * Transformer class
 */
export class Transformer {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = {
      runtime: 'pulse-framework/runtime',
      minify: false,
      scopeStyles: true, // Enable CSS scoping by default
      ...options
    };
    this.stateVars = new Set();
    this.actionNames = new Set();
    this.importedComponents = new Map(); // Map of local name -> import info
    this.scopeId = this.options.scopeStyles ? generateScopeId() : null;
  }

  /**
   * Transform AST to JavaScript code
   */
  transform() {
    const parts = [];

    // Extract imported components first
    if (this.ast.imports) {
      this.extractImportedComponents(this.ast.imports);
    }

    // Imports (runtime + user imports)
    parts.push(this.generateImports());

    // Extract state variables
    if (this.ast.state) {
      this.extractStateVars(this.ast.state);
    }

    // Extract action names
    if (this.ast.actions) {
      this.extractActionNames(this.ast.actions);
    }

    // State
    if (this.ast.state) {
      parts.push(this.transformState(this.ast.state));
    }

    // Actions
    if (this.ast.actions) {
      parts.push(this.transformActions(this.ast.actions));
    }

    // View
    if (this.ast.view) {
      parts.push(this.transformView(this.ast.view));
    }

    // Style
    if (this.ast.style) {
      parts.push(this.transformStyle(this.ast.style));
    }

    // Component export
    parts.push(this.generateExport());

    return parts.filter(Boolean).join('\n\n');
  }

  /**
   * Extract imported component names
   */
  extractImportedComponents(imports) {
    for (const imp of imports) {
      for (const spec of imp.specifiers) {
        this.importedComponents.set(spec.local, {
          source: imp.source,
          type: spec.type,
          imported: spec.imported
        });
      }
    }
  }

  /**
   * Generate imports (runtime + user imports)
   */
  generateImports() {
    const lines = [];

    // Runtime imports
    const runtimeImports = [
      'pulse',
      'computed',
      'effect',
      'batch',
      'el',
      'text',
      'on',
      'list',
      'when',
      'mount',
      'model'
    ];

    lines.push(`import { ${runtimeImports.join(', ')} } from '${this.options.runtime}';`);

    // User imports from .pulse files
    if (this.ast.imports && this.ast.imports.length > 0) {
      lines.push('');
      lines.push('// Component imports');

      for (const imp of this.ast.imports) {
        // Handle default + named imports
        const defaultSpec = imp.specifiers.find(s => s.type === 'default');
        const namedSpecs = imp.specifiers.filter(s => s.type === 'named');
        const namespaceSpec = imp.specifiers.find(s => s.type === 'namespace');

        let importStr = 'import ';
        if (defaultSpec) {
          importStr += defaultSpec.local;
          if (namedSpecs.length > 0) {
            importStr += ', ';
          }
        }
        if (namespaceSpec) {
          importStr += `* as ${namespaceSpec.local}`;
        }
        if (namedSpecs.length > 0) {
          const named = namedSpecs.map(s =>
            s.local !== s.imported ? `${s.imported} as ${s.local}` : s.local
          );
          importStr += `{ ${named.join(', ')} }`;
        }

        // Convert .pulse extension to .js
        let source = imp.source;
        if (source.endsWith('.pulse')) {
          source = source.replace('.pulse', '.js');
        }

        importStr += ` from '${source}';`;
        lines.push(importStr);
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract state variable names
   */
  extractStateVars(stateBlock) {
    for (const prop of stateBlock.properties) {
      this.stateVars.add(prop.name);
    }
  }

  /**
   * Extract action names
   */
  extractActionNames(actionsBlock) {
    for (const fn of actionsBlock.functions) {
      this.actionNames.add(fn.name);
    }
  }

  /**
   * Transform state block
   */
  transformState(stateBlock) {
    const lines = ['// State'];

    for (const prop of stateBlock.properties) {
      const value = this.transformValue(prop.value);
      lines.push(`const ${prop.name} = pulse(${value});`);
    }

    return lines.join('\n');
  }

  /**
   * Transform value
   */
  transformValue(node) {
    if (!node) return 'undefined';

    switch (node.type) {
      case NodeType.Literal:
        if (typeof node.value === 'string') {
          return JSON.stringify(node.value);
        }
        return String(node.value);

      case NodeType.ObjectLiteral: {
        const props = node.properties.map(p =>
          `${p.name}: ${this.transformValue(p.value)}`
        );
        return `{ ${props.join(', ')} }`;
      }

      case NodeType.ArrayLiteral: {
        const elements = node.elements.map(e => this.transformValue(e));
        return `[${elements.join(', ')}]`;
      }

      case NodeType.Identifier:
        return node.name;

      default:
        return 'undefined';
    }
  }

  /**
   * Transform actions block
   */
  transformActions(actionsBlock) {
    const lines = ['// Actions'];

    for (const fn of actionsBlock.functions) {
      const asyncKeyword = fn.async ? 'async ' : '';
      const params = fn.params.join(', ');
      const body = this.transformFunctionBody(fn.body);

      lines.push(`${asyncKeyword}function ${fn.name}(${params}) {`);
      lines.push(`  ${body}`);
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Transform function body tokens back to code
   */
  transformFunctionBody(tokens) {
    let code = '';
    let lastToken = null;
    let lastNonSpaceToken = null;
    const statementKeywords = ['let', 'const', 'var', 'return', 'if', 'else', 'for', 'while', 'switch', 'throw', 'try', 'catch', 'finally'];
    const builtinFunctions = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'alert', 'confirm', 'prompt', 'console', 'document', 'window', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'fetch'];

    // Tokens that should not have space after them
    const noSpaceAfterTypes = new Set(['DOT', 'LPAREN', 'LBRACKET', 'LBRACE', 'NOT', 'SPREAD']);
    const noSpaceAfterValues = new Set(['.', '(', '[', '{', '!', '~', '...']);

    // Tokens that should not have space before them
    const noSpaceBeforeTypes = new Set(['DOT', 'RPAREN', 'RBRACKET', 'RBRACE', 'SEMICOLON', 'COMMA', 'INCREMENT', 'DECREMENT', 'LPAREN', 'LBRACKET']);
    const noSpaceBeforeValues = new Set(['.', ')', ']', '}', ';', ',', '++', '--', '(', '[']);

    // Check if token is a statement starter that the regex won't handle
    // (i.e., not a state variable assignment - those are handled by regex)
    // Statement keywords that have their own token types
    // Note: ELSE is excluded because it follows IF and should not have semicolon before it
    const statementTokenTypes = new Set(['IF', 'FOR', 'EACH']);

    const needsManualSemicolon = (token, nextToken, lastNonSpace) => {
      if (!token) return false;

      // Don't add semicolon after 'new' keyword (e.g., new Date())
      if (lastNonSpace?.value === 'new') return false;

      // Statement keywords with dedicated token types (if, else, for, etc.)
      if (statementTokenTypes.has(token.type)) return true;

      // Only process IDENT tokens from here
      if (token.type !== 'IDENT') return false;

      // Statement keywords (let, const, var, return, etc.)
      if (statementKeywords.includes(token.value)) return true;

      // Builtin function call or action call (not state var assignment)
      if (nextToken?.type === 'LPAREN') {
        if (builtinFunctions.includes(token.value)) return true;
        if (this.actionNames.has(token.value)) return true;
      }

      // Builtin method chain (e.g., document.body.classList.toggle(...))
      if (nextToken?.type === 'DOT' && builtinFunctions.includes(token.value)) {
        return true;
      }

      // NOTE: State variable assignments are NOT included here
      // because they are handled by the regex replacement which adds semicolons

      return false;
    };

    // Check if previous context indicates end of statement
    const afterStatementEnd = (lastNonSpace) => {
      if (!lastNonSpace) return false;
      return lastNonSpace.type === 'RBRACE' ||
             lastNonSpace.type === 'RPAREN' ||
             lastNonSpace.type === 'RBRACKET' ||
             lastNonSpace.type === 'SEMICOLON' ||
             lastNonSpace.type === 'STRING' ||
             lastNonSpace.type === 'NUMBER' ||
             lastNonSpace.type === 'TRUE' ||
             lastNonSpace.type === 'FALSE' ||
             lastNonSpace.type === 'NULL' ||
             lastNonSpace.value === 'null' ||
             lastNonSpace.value === 'true' ||
             lastNonSpace.value === 'false' ||
             lastNonSpace.type === 'IDENT';  // Any identifier can end a statement (variables, function results, etc.)
    };

    let afterIfCondition = false;  // Track if we just closed an if(...) condition

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];

      // Track if we're exiting an if condition (if followed by ( ... ))
      if (token.type === 'RPAREN' && lastNonSpaceToken?.type === 'IF') {
        // This isn't quite right - we need to track the if keyword before the paren
      }

      // Detect if we just closed an if/for/while condition
      // Look back to find if there was an if/for/while before this )
      if (token.type === 'RPAREN') {
        // Check if this ) closes an if/for/while condition
        // by looking for the matching ( and what's before it
        let parenDepth = 1;
        for (let j = i - 1; j >= 0 && parenDepth > 0; j--) {
          if (tokens[j].type === 'RPAREN') parenDepth++;
          else if (tokens[j].type === 'LPAREN') parenDepth--;
          if (parenDepth === 0) {
            // Found matching (, check what's before it
            if (j > 0 && (tokens[j - 1].type === 'IF' || tokens[j - 1].type === 'FOR' ||
                         tokens[j - 1].type === 'EACH' || tokens[j - 1].value === 'while')) {
              afterIfCondition = true;
            }
            break;
          }
        }
      }

      // Add semicolon before statement starters (only for non-state-var cases)
      // But NOT immediately after an if/for/while condition (the next statement is the body)
      if (needsManualSemicolon(token, nextToken, lastNonSpaceToken) && afterStatementEnd(lastNonSpaceToken)) {
        if (!afterIfCondition && lastToken && lastToken.value !== ';' && lastToken.value !== '{') {
          code += '; ';
        }
      }

      // Reset afterIfCondition after processing the token following the condition
      if (afterIfCondition && token.type !== 'RPAREN') {
        afterIfCondition = false;
      }

      // Emit the token value
      if (token.type === 'STRING') {
        code += token.raw || JSON.stringify(token.value);
      } else if (token.type === 'TEMPLATE') {
        code += token.raw || ('`' + token.value + '`');
      } else {
        code += token.value;
      }

      // Decide whether to add space after this token
      let addSpace = true;

      // No space after certain tokens
      if (noSpaceAfterTypes.has(token.type) || noSpaceAfterValues.has(token.value)) {
        addSpace = false;
      }

      // No space before certain tokens (look ahead)
      if (nextToken && (noSpaceBeforeTypes.has(nextToken.type) || noSpaceBeforeValues.has(nextToken.value))) {
        addSpace = false;
      }

      if (addSpace && nextToken) {
        code += ' ';
      }

      lastToken = token;
      lastNonSpaceToken = token;
    }

    // Build patterns for boundaries
    const stateVarPattern = [...this.stateVars].join('|');
    const funcPattern = [...this.actionNames, ...builtinFunctions].join('|');

    // Transform state access - order matters!
    // First, replace state var assignments with boundary detection
    // Use multiple passes to handle the case where replacements change the boundaries
    for (const stateVar of this.stateVars) {
      // Replace standalone state var assignments: stateVar = value -> stateVar.set(value)
      // Use negative lookahead (?!=) to avoid matching === or ==
      // Stop at: next state var assignment (original or already replaced), function call, statement keyword, or end
      const boundaryPattern = `\\s+(?:${stateVarPattern})(?:\\s*=(?!=)|\\s*\\.set\\()|\\s+(?:${funcPattern})\\s*\\(|\\s+(?:${statementKeywords.join('|')})\\b|;|$`;
      const assignPattern = new RegExp(
        `\\b${stateVar}\\s*=(?!=)\\s*(.+?)(?=${boundaryPattern})`,
        'g'
      );
      code = code.replace(assignPattern, (_match, value) => `${stateVar}.set(${value.trim()});`);
    }

    // Clean up any double semicolons
    code = code.replace(/;+/g, ';');
    code = code.replace(/; ;/g, ';');

    // Then, replace state var reads (not followed by . or single = or ( or already .set/.get)
    // Use (?!=) to ensure we don't skip === or == comparisons
    for (const stateVar of this.stateVars) {
      code = code.replace(
        new RegExp(`\\b${stateVar}\\b(?!\\s*\\.|\\s*=(?!=)|\\s*\\(|\\s*\\.(?:get|set))`, 'g'),
        `${stateVar}.get()`
      );
    }

    return code.trim();
  }

  /**
   * Transform view block
   */
  transformView(viewBlock) {
    const lines = ['// View'];
    lines.push('function render() {');
    lines.push('  return (');

    const children = viewBlock.children.map(child =>
      this.transformViewNode(child, 4)
    );

    if (children.length === 1) {
      lines.push(children[0]);
    } else {
      lines.push('    [');
      lines.push(children.map(c => '      ' + c.trim()).join(',\n'));
      lines.push('    ]');
    }

    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Transform a view node (element, directive, slot, text)
   */
  transformViewNode(node, indent = 0) {
    const pad = ' '.repeat(indent);

    switch (node.type) {
      case NodeType.Element:
        return this.transformElement(node, indent);

      case NodeType.TextNode:
        return this.transformTextNode(node, indent);

      case NodeType.IfDirective:
        return this.transformIfDirective(node, indent);

      case NodeType.EachDirective:
        return this.transformEachDirective(node, indent);

      case NodeType.EventDirective:
        return this.transformEventDirective(node, indent);

      case NodeType.SlotElement:
        return this.transformSlot(node, indent);

      default:
        return `${pad}/* unknown node: ${node.type} */`;
    }
  }

  /**
   * Transform slot element
   */
  transformSlot(node, indent) {
    const pad = ' '.repeat(indent);
    const slotName = node.name || 'default';

    // If there's fallback content
    if (node.fallback && node.fallback.length > 0) {
      const fallbackCode = node.fallback.map(child =>
        this.transformViewNode(child, indent + 2)
      ).join(',\n');

      return `${pad}(slots?.${slotName} ? slots.${slotName}() : (\n${fallbackCode}\n${pad}))`;
    }

    // Simple slot reference
    return `${pad}(slots?.${slotName} ? slots.${slotName}() : null)`;
  }

  /**
   * Transform element
   */
  transformElement(node, indent) {
    const pad = ' '.repeat(indent);
    const parts = [];

    // Check if this is a component (starts with uppercase)
    const selectorParts = node.selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    const tagName = selectorParts ? selectorParts[1] : '';
    const isComponent = tagName && /^[A-Z]/.test(tagName) && this.importedComponents.has(tagName);

    if (isComponent) {
      // Render as component call
      return this.transformComponentCall(node, indent);
    }

    // Add scoped class to selector if CSS scoping is enabled
    let selector = node.selector;
    if (this.scopeId && selector) {
      // Add scope class to the selector
      selector = this.addScopeToSelector(selector);
    }

    // Start with el() call
    parts.push(`${pad}el('${selector}'`);

    // Add event handlers as on() chain
    const eventHandlers = node.directives.filter(d => d.type === NodeType.EventDirective);

    // Add text content
    if (node.textContent.length > 0) {
      for (const text of node.textContent) {
        const textCode = this.transformTextNode(text, 0);
        parts.push(`,\n${pad}  ${textCode.trim()}`);
      }
    }

    // Add children
    if (node.children.length > 0) {
      for (const child of node.children) {
        const childCode = this.transformViewNode(child, indent + 2);
        parts.push(`,\n${childCode}`);
      }
    }

    parts.push(')');

    // Chain event handlers
    let result = parts.join('');
    for (const handler of eventHandlers) {
      const handlerCode = this.transformExpression(handler.handler);
      result = `on(${result}, '${handler.event}', () => { ${handlerCode}; })`;
    }

    return result;
  }

  /**
   * Add scope class to a CSS selector
   */
  addScopeToSelector(selector) {
    // If selector has classes, add scope class after the first class
    // Otherwise add it at the end
    if (selector.includes('.')) {
      // Add scope after tag name and before first class
      return selector.replace(/^([a-zA-Z0-9-]*)/, `$1.${this.scopeId}`);
    }
    // Just a tag name, add scope class
    return `${selector}.${this.scopeId}`;
  }

  /**
   * Transform a component call (imported component)
   */
  transformComponentCall(node, indent) {
    const pad = ' '.repeat(indent);
    const selectorParts = node.selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    const componentName = selectorParts[1];

    // Extract slots from children
    const slots = {};

    // Children become the default slot
    if (node.children.length > 0 || node.textContent.length > 0) {
      const slotContent = [];
      for (const text of node.textContent) {
        slotContent.push(this.transformTextNode(text, 0).trim());
      }
      for (const child of node.children) {
        slotContent.push(this.transformViewNode(child, 0).trim());
      }
      slots['default'] = slotContent;
    }

    // Build component call
    let code = `${pad}${componentName}.render({ `;

    // Add slots if any
    if (Object.keys(slots).length > 0) {
      const slotCode = Object.entries(slots).map(([name, content]) => {
        return `${name}: () => ${content.length === 1 ? content[0] : `[${content.join(', ')}]`}`;
      }).join(', ');
      code += `slots: { ${slotCode} }`;
    }

    code += ' })';
    return code;
  }

  /**
   * Transform text node
   */
  transformTextNode(node, indent) {
    const pad = ' '.repeat(indent);
    const parts = node.parts;

    if (parts.length === 1 && typeof parts[0] === 'string') {
      // Simple static text
      return `${pad}${JSON.stringify(parts[0])}`;
    }

    // Has interpolations - use text() with a function
    const textParts = parts.map(part => {
      if (typeof part === 'string') {
        return JSON.stringify(part);
      }
      // Interpolation
      const expr = this.transformExpressionString(part.expression);
      return `\${${expr}}`;
    });

    return `${pad}text(() => \`${textParts.join('')}\`)`;
  }

  /**
   * Transform @if directive
   */
  transformIfDirective(node, indent) {
    const pad = ' '.repeat(indent);
    const condition = this.transformExpression(node.condition);

    const consequent = node.consequent.map(c =>
      this.transformViewNode(c, indent + 2)
    ).join(',\n');

    let code = `${pad}when(\n`;
    code += `${pad}  () => ${condition},\n`;
    code += `${pad}  () => (\n${consequent}\n${pad}  )`;

    if (node.alternate) {
      const alternate = node.alternate.map(c =>
        this.transformViewNode(c, indent + 2)
      ).join(',\n');
      code += `,\n${pad}  () => (\n${alternate}\n${pad}  )`;
    }

    code += `\n${pad})`;
    return code;
  }

  /**
   * Transform @each directive
   */
  transformEachDirective(node, indent) {
    const pad = ' '.repeat(indent);
    const iterable = this.transformExpression(node.iterable);

    const template = node.template.map(t =>
      this.transformViewNode(t, indent + 2)
    ).join(',\n');

    return `${pad}list(\n` +
           `${pad}  () => ${iterable},\n` +
           `${pad}  (${node.itemName}, _index) => (\n${template}\n${pad}  )\n` +
           `${pad})`;
  }

  /**
   * Transform event directive
   */
  transformEventDirective(node, indent) {
    const pad = ' '.repeat(indent);
    const handler = this.transformExpression(node.handler);

    if (node.children && node.children.length > 0) {
      const children = node.children.map(c =>
        this.transformViewNode(c, indent + 2)
      ).join(',\n');

      return `${pad}on(el('div',\n${children}\n${pad}), '${node.event}', () => { ${handler}; })`;
    }

    return `/* event: ${node.event} -> ${handler} */`;
  }

  /**
   * Transform AST expression to JS code
   */
  transformExpression(node) {
    if (!node) return '';

    switch (node.type) {
      case NodeType.Identifier:
        if (this.stateVars.has(node.name)) {
          return `${node.name}.get()`;
        }
        return node.name;

      case NodeType.Literal:
        if (typeof node.value === 'string') {
          return JSON.stringify(node.value);
        }
        return String(node.value);

      case NodeType.TemplateLiteral:
        // Transform state vars in template literal
        return '`' + this.transformExpressionString(node.value) + '`';

      case NodeType.MemberExpression: {
        const obj = this.transformExpression(node.object);
        if (node.computed) {
          const prop = this.transformExpression(node.property);
          return `${obj}[${prop}]`;
        }
        return `${obj}.${node.property}`;
      }

      case NodeType.CallExpression: {
        const callee = this.transformExpression(node.callee);
        const args = node.arguments.map(a => this.transformExpression(a)).join(', ');
        return `${callee}(${args})`;
      }

      case NodeType.BinaryExpression: {
        const left = this.transformExpression(node.left);
        const right = this.transformExpression(node.right);
        return `(${left} ${node.operator} ${right})`;
      }

      case NodeType.UnaryExpression: {
        const argument = this.transformExpression(node.argument);
        return `${node.operator}${argument}`;
      }

      case NodeType.UpdateExpression: {
        const argument = this.transformExpression(node.argument);
        // For state variables, convert x++ to x.set(x.get() + 1)
        if (node.argument.type === NodeType.Identifier &&
            this.stateVars.has(node.argument.name)) {
          const name = node.argument.name;
          const delta = node.operator === '++' ? 1 : -1;
          return `${name}.set(${name}.get() + ${delta})`;
        }
        return node.prefix
          ? `${node.operator}${argument}`
          : `${argument}${node.operator}`;
      }

      case NodeType.ConditionalExpression: {
        const test = this.transformExpression(node.test);
        const consequent = this.transformExpression(node.consequent);
        const alternate = this.transformExpression(node.alternate);
        return `(${test} ? ${consequent} : ${alternate})`;
      }

      case NodeType.ArrowFunction: {
        const params = node.params.join(', ');
        if (node.block) {
          // Block body - transform tokens
          const body = this.transformFunctionBody(node.body);
          return `(${params}) => { ${body} }`;
        } else {
          // Expression body
          const body = this.transformExpression(node.body);
          return `(${params}) => ${body}`;
        }
      }

      case NodeType.AssignmentExpression: {
        const left = this.transformExpression(node.left);
        const right = this.transformExpression(node.right);
        // For state variables, convert to .set()
        if (node.left.type === NodeType.Identifier &&
            this.stateVars.has(node.left.name)) {
          return `${node.left.name}.set(${right})`;
        }
        return `(${left} = ${right})`;
      }

      case NodeType.ArrayLiteral: {
        const elements = node.elements.map(e => this.transformExpression(e)).join(', ');
        return `[${elements}]`;
      }

      case NodeType.ObjectLiteral: {
        const props = node.properties.map(p => {
          if (p.type === NodeType.SpreadElement) {
            return `...${this.transformExpression(p.argument)}`;
          }
          if (p.shorthand) {
            // Check if it's a state var
            if (this.stateVars.has(p.name)) {
              return `${p.name}: ${p.name}.get()`;
            }
            return p.name;
          }
          return `${p.name}: ${this.transformExpression(p.value)}`;
        }).join(', ');
        return `{ ${props} }`;
      }

      case NodeType.SpreadElement:
        return `...${this.transformExpression(node.argument)}`;

      default:
        return '/* unknown expression */';
    }
  }

  /**
   * Transform expression string (from interpolation)
   */
  transformExpressionString(exprStr) {
    // Simple transformation: wrap state vars with .get()
    let result = exprStr;
    for (const stateVar of this.stateVars) {
      result = result.replace(
        new RegExp(`\\b${stateVar}\\b`, 'g'),
        `${stateVar}.get()`
      );
    }
    return result;
  }

  /**
   * Transform style block with optional scoping
   */
  transformStyle(styleBlock) {
    const lines = ['// Styles'];

    if (this.scopeId) {
      lines.push(`const SCOPE_ID = '${this.scopeId}';`);
    }

    lines.push('const styles = `');

    for (const rule of styleBlock.rules) {
      lines.push(this.transformStyleRule(rule, 0));
    }

    lines.push('`;');
    lines.push('');
    lines.push('// Inject styles');
    lines.push('const styleEl = document.createElement("style");');

    if (this.scopeId) {
      lines.push(`styleEl.setAttribute('data-p-scope', SCOPE_ID);`);
    }

    lines.push('styleEl.textContent = styles;');
    lines.push('document.head.appendChild(styleEl);');

    return lines.join('\n');
  }

  /**
   * Transform style rule with optional scoping
   */
  transformStyleRule(rule, indent) {
    const pad = '  '.repeat(indent);
    const lines = [];

    // Apply scope to selector if enabled
    let selector = rule.selector;
    if (this.scopeId) {
      selector = this.scopeStyleSelector(selector);
    }

    lines.push(`${pad}${selector} {`);

    for (const prop of rule.properties) {
      lines.push(`${pad}  ${prop.name}: ${prop.value};`);
    }

    for (const nested of rule.nestedRules) {
      // For nested rules, combine selectors (simplified nesting)
      const nestedLines = this.transformStyleRule(nested, indent + 1);
      lines.push(nestedLines);
    }

    lines.push(`${pad}}`);
    return lines.join('\n');
  }

  /**
   * Add scope to CSS selector
   * .container -> .container.p123abc
   * div -> div.p123abc
   * .a .b -> .a.p123abc .b.p123abc
   */
  scopeStyleSelector(selector) {
    if (!this.scopeId) return selector;

    // Split by comma for multiple selectors
    return selector.split(',').map(part => {
      part = part.trim();

      // Split by space for descendant selectors
      return part.split(/\s+/).map(segment => {
        // Skip pseudo-elements and pseudo-classes at the end
        const pseudoMatch = segment.match(/^([^:]+)(:.+)?$/);
        if (pseudoMatch) {
          const base = pseudoMatch[1];
          const pseudo = pseudoMatch[2] || '';

          // Skip if it's just a pseudo selector
          if (!base) return segment;

          // Add scope class
          return `${base}.${this.scopeId}${pseudo}`;
        }
        return `${segment}.${this.scopeId}`;
      }).join(' ');
    }).join(', ');
  }

  /**
   * Generate component export
   */
  generateExport() {
    const pageName = this.ast.page?.name || 'Component';
    const routePath = this.ast.route?.path || null;

    const lines = ['// Export'];
    lines.push(`export const ${pageName} = {`);
    lines.push('  render,');

    if (routePath) {
      lines.push(`  route: ${JSON.stringify(routePath)},`);
    }

    lines.push('  mount: (target) => {');
    lines.push('    const el = render();');
    lines.push('    return mount(target, el);');
    lines.push('  }');
    lines.push('};');
    lines.push('');
    lines.push(`export default ${pageName};`);

    return lines.join('\n');
  }
}

/**
 * Transform AST to JavaScript code
 */
export function transform(ast, options = {}) {
  const transformer = new Transformer(ast, options);
  return transformer.transform();
}

export default {
  Transformer,
  transform
};
