/**
 * Transformer Expressions Module
 * Handles AST expression transformation to JavaScript code
 * @module pulse-js-framework/compiler/transformer/expressions
 */

import { NodeType } from '../parser.js';
import {
  NO_SPACE_AFTER,
  NO_SPACE_BEFORE,
  STATEMENT_KEYWORDS,
  BUILTIN_FUNCTIONS,
  STATEMENT_TOKEN_TYPES,
  STATEMENT_END_TYPES
} from './constants.js';

/**
 * Transform AST expression to JS code
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - AST node to transform
 * @returns {string} JavaScript code
 */
export function transformExpression(transformer, node) {
  if (!node) return '';

  switch (node.type) {
    case NodeType.Identifier:
      if (transformer.stateVars.has(node.name)) {
        return `${node.name}.get()`;
      }
      // Props are accessed directly (already destructured)
      return node.name;

    case NodeType.Literal:
      if (typeof node.value === 'string') {
        return JSON.stringify(node.value);
      }
      return String(node.value);

    case NodeType.TemplateLiteral:
      // Transform state vars in template literal
      return '`' + transformExpressionString(transformer, node.value) + '`';

    case NodeType.MemberExpression: {
      const obj = transformExpression(transformer, node.object);
      // Use optional chaining when accessing properties on function call results
      const isCallResult = node.object.type === NodeType.CallExpression;
      const accessor = isCallResult ? '?.' : '.';
      if (node.computed) {
        const prop = transformExpression(transformer, node.property);
        return isCallResult ? `${obj}?.[${prop}]` : `${obj}[${prop}]`;
      }
      return `${obj}${accessor}${node.property}`;
    }

    case NodeType.CallExpression: {
      const callee = transformExpression(transformer, node.callee);
      const args = node.arguments.map(a => transformExpression(transformer, a)).join(', ');
      return `${callee}(${args})`;
    }

    case NodeType.BinaryExpression: {
      const left = transformExpression(transformer, node.left);
      const right = transformExpression(transformer, node.right);
      return `(${left} ${node.operator} ${right})`;
    }

    case NodeType.UnaryExpression: {
      const argument = transformExpression(transformer, node.argument);
      return `${node.operator}${argument}`;
    }

    case NodeType.UpdateExpression: {
      const argument = transformExpression(transformer, node.argument);
      // For state variables, convert x++ to x.set(x.get() + 1)
      if (node.argument.type === NodeType.Identifier &&
          transformer.stateVars.has(node.argument.name)) {
        const name = node.argument.name;
        const delta = node.operator === '++' ? 1 : -1;
        return `${name}.set(${name}.get() + ${delta})`;
      }
      return node.prefix
        ? `${node.operator}${argument}`
        : `${argument}${node.operator}`;
    }

    case NodeType.ConditionalExpression: {
      const test = transformExpression(transformer, node.test);
      const consequent = transformExpression(transformer, node.consequent);
      const alternate = transformExpression(transformer, node.alternate);
      return `(${test} ? ${consequent} : ${alternate})`;
    }

    case NodeType.ArrowFunction: {
      const params = node.params.join(', ');
      if (node.block) {
        // Block body - transform tokens
        const body = transformFunctionBody(transformer, node.body);
        return `(${params}) => { ${body} }`;
      } else {
        // Expression body
        const body = transformExpression(transformer, node.body);
        return `(${params}) => ${body}`;
      }
    }

    case NodeType.AssignmentExpression: {
      const left = transformExpression(transformer, node.left);
      const right = transformExpression(transformer, node.right);
      // For state variables, convert to .set()
      if (node.left.type === NodeType.Identifier &&
          transformer.stateVars.has(node.left.name)) {
        return `${node.left.name}.set(${right})`;
      }
      return `(${left} = ${right})`;
    }

    case NodeType.ArrayLiteral: {
      const elements = node.elements.map(e => transformExpression(transformer, e)).join(', ');
      return `[${elements}]`;
    }

    case NodeType.ObjectLiteral: {
      const props = node.properties.map(p => {
        if (p.type === NodeType.SpreadElement) {
          return `...${transformExpression(transformer, p.argument)}`;
        }
        if (p.shorthand) {
          // Check if it's a state var
          if (transformer.stateVars.has(p.name)) {
            return `${p.name}: ${p.name}.get()`;
          }
          return p.name;
        }
        return `${p.name}: ${transformExpression(transformer, p.value)}`;
      }).join(', ');
      return `{ ${props} }`;
    }

    case NodeType.SpreadElement:
      return `...${transformExpression(transformer, node.argument)}`;

    default:
      return '/* unknown expression */';
  }
}

/**
 * Transform expression string (from interpolation)
 * @param {Object} transformer - Transformer instance
 * @param {string} exprStr - Expression string
 * @returns {string} Transformed expression string
 */
export function transformExpressionString(transformer, exprStr) {
  // Simple transformation: wrap state vars with .get()
  let result = exprStr;
  for (const stateVar of transformer.stateVars) {
    result = result.replace(
      new RegExp(`\\b${stateVar}\\b`, 'g'),
      `${stateVar}.get()`
    );
  }
  // Add optional chaining after function calls followed by property access
  result = result.replace(/(\w+\([^)]*\))\.(\w)/g, '$1?.$2');
  return result;
}

/**
 * Transform function body tokens back to code
 * @param {Object} transformer - Transformer instance
 * @param {Array} tokens - Body tokens
 * @returns {string} JavaScript code
 */
export function transformFunctionBody(transformer, tokens) {
  const { stateVars, actionNames } = transformer;
  let code = '';
  let lastToken = null;
  let lastNonSpaceToken = null;

  const needsManualSemicolon = (token, nextToken, lastNonSpace) => {
    if (!token || lastNonSpace?.value === 'new') return false;
    if (STATEMENT_TOKEN_TYPES.has(token.type)) return true;
    if (token.type !== 'IDENT') return false;
    if (STATEMENT_KEYWORDS.has(token.value)) return true;
    if (stateVars.has(token.value) && nextToken?.type === 'EQ') return true;
    if (nextToken?.type === 'LPAREN' &&
        (BUILTIN_FUNCTIONS.has(token.value) || actionNames.has(token.value))) return true;
    if (nextToken?.type === 'DOT' && BUILTIN_FUNCTIONS.has(token.value)) return true;
    return false;
  };

  const afterStatementEnd = (t) => t && STATEMENT_END_TYPES.has(t.type);

  let afterIfCondition = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    // Detect if we just closed an if/for/while condition
    if (token.type === 'RPAREN') {
      let parenDepth = 1;
      for (let j = i - 1; j >= 0 && parenDepth > 0; j--) {
        if (tokens[j].type === 'RPAREN') parenDepth++;
        else if (tokens[j].type === 'LPAREN') parenDepth--;
        if (parenDepth === 0) {
          if (j > 0 && (tokens[j - 1].type === 'IF' || tokens[j - 1].type === 'FOR' ||
                       tokens[j - 1].type === 'EACH' || tokens[j - 1].value === 'while')) {
            afterIfCondition = true;
          }
          break;
        }
      }
    }

    // Add semicolon before statement starters
    if (needsManualSemicolon(token, nextToken, lastNonSpaceToken) &&
        afterStatementEnd(lastNonSpaceToken)) {
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
    const noSpaceAfter = NO_SPACE_AFTER.has(token.type) || NO_SPACE_AFTER.has(token.value);
    const noSpaceBefore = nextToken &&
      (NO_SPACE_BEFORE.has(nextToken.type) || NO_SPACE_BEFORE.has(nextToken.value));
    if (!noSpaceAfter && !noSpaceBefore && nextToken) code += ' ';

    lastToken = token;
    lastNonSpaceToken = token;
  }

  // Build patterns for state variable transformation
  const stateVarPattern = [...stateVars].join('|');
  const funcPattern = [...actionNames, ...BUILTIN_FUNCTIONS].join('|');
  const keywordsPattern = [...STATEMENT_KEYWORDS].join('|');

  // Transform state var assignments: stateVar = value -> stateVar.set(value)
  for (const stateVar of stateVars) {
    const boundaryPattern = `\\s+(?:${stateVarPattern})(?:\\s*=(?!=)|\\s*\\.set\\()|\\s+(?:${funcPattern})\\s*\\(|\\s+(?:${keywordsPattern})\\b|;|$`;
    const assignPattern = new RegExp(`\\b${stateVar}\\s*=(?!=)\\s*(.+?)(?=${boundaryPattern})`, 'g');
    code = code.replace(assignPattern, (_, value) => `${stateVar}.set(${value.trim()});`);
  }

  // Clean up any double semicolons
  code = code.replace(/;+/g, ';');
  code = code.replace(/; ;/g, ';');

  // Replace state var reads
  for (const stateVar of stateVars) {
    code = code.replace(
      new RegExp(`(?<!\\.\\s*)\\b${stateVar}\\b(?!\\s*=(?!=)|\\s*\\(|\\s*\\.(?:get|set))`, 'g'),
      `${stateVar}.get()`
    );
  }

  return code.trim();
}
