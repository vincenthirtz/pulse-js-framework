/**
 * Pulse Transformer - Code generator
 *
 * Transforms AST into JavaScript code
 */

import { NodeType } from './parser.js';

/**
 * Transformer class
 */
export class Transformer {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = {
      runtime: 'pulse-framework/runtime',
      minify: false,
      ...options
    };
    this.stateVars = new Set();
    this.actionNames = new Set();
  }

  /**
   * Transform AST to JavaScript code
   */
  transform() {
    const parts = [];

    // Imports
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
   * Generate imports
   */
  generateImports() {
    const imports = [
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

    return `import { ${imports.join(', ')} } from '${this.options.runtime}';`;
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
    for (const token of tokens) {
      if (token.type === 'STRING') {
        code += token.raw || JSON.stringify(token.value);
      } else {
        code += token.value;
      }
      code += ' ';
    }

    // Transform state access
    for (const stateVar of this.stateVars) {
      // Replace standalone state var assignments
      code = code.replace(
        new RegExp(`\\b${stateVar}\\s*=\\s*`, 'g'),
        `${stateVar}.set(`
      );
      // Close the set call (simplified)
      code = code.replace(
        new RegExp(`${stateVar}\\.set\\(([^;\\n]+)([;\\n])`, 'g'),
        `${stateVar}.set($1)$2`
      );
      // Replace state var reads
      code = code.replace(
        new RegExp(`\\b${stateVar}\\b(?!\\s*[.=])`, 'g'),
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
   * Transform a view node (element, directive, text)
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

      default:
        return `${pad}/* unknown node: ${node.type} */`;
    }
  }

  /**
   * Transform element
   */
  transformElement(node, indent) {
    const pad = ' '.repeat(indent);
    const parts = [];

    // Start with el() call
    parts.push(`${pad}el('${node.selector}'`);

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
   * Transform style block
   */
  transformStyle(styleBlock) {
    const lines = ['// Styles'];
    lines.push('const styles = `');

    for (const rule of styleBlock.rules) {
      lines.push(this.transformStyleRule(rule, 0));
    }

    lines.push('`;');
    lines.push('');
    lines.push('// Inject styles');
    lines.push('const styleEl = document.createElement("style");');
    lines.push('styleEl.textContent = styles;');
    lines.push('document.head.appendChild(styleEl);');

    return lines.join('\n');
  }

  /**
   * Transform style rule
   */
  transformStyleRule(rule, indent) {
    const pad = '  '.repeat(indent);
    const lines = [];

    lines.push(`${pad}${rule.selector} {`);

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
