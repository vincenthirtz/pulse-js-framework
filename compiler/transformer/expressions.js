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
      // Props take precedence over state (props are destructured in render scope)
      if (transformer.propVars.has(node.name)) {
        return node.name;
      }
      if (transformer.stateVars.has(node.name)) {
        return `${node.name}.get()`;
      }
      // Other identifiers (actions, imports, etc.) accessed directly
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
  // Props take precedence - don't wrap props with .get()
  let result = exprStr;
  for (const stateVar of transformer.stateVars) {
    // Skip if this var name is also a prop (props shadow state in render scope)
    if (transformer.propVars.has(stateVar)) {
      continue;
    }
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

  // Tokens that must follow } directly without semicolon
  const NO_SEMI_BEFORE = new Set(['catch', 'finally', 'else']);

  const needsManualSemicolon = (token, nextToken, lastNonSpace) => {
    if (!token || lastNonSpace?.value === 'new') return false;
    // Don't add semicolon after 'await' - it always needs its expression
    if (lastNonSpace?.value === 'await') return false;
    // For 'return': bare return followed by statement keyword needs semicolon
    if (lastNonSpace?.value === 'return') {
      // If followed by a statement keyword, it's a bare return - needs semicolon
      if (token.type === 'IDENT' && STATEMENT_KEYWORDS.has(token.value)) return true;
      if (STATEMENT_TOKEN_TYPES.has(token.type)) return true;
      return false;  // return expression - no semicolon
    }
    // Don't add semicolon before catch/finally/else after }
    if (lastNonSpace?.type === 'RBRACE' && NO_SEMI_BEFORE.has(token.value)) return false;
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

  // Protect string literals from state var replacement
  const stringPlaceholders = [];
  const protectStrings = (str) => {
    // Match strings and template literals, handling escapes
    return str.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, (match) => {
      const index = stringPlaceholders.length;
      stringPlaceholders.push(match);
      return `__STRING_${index}__`;
    });
  };
  const restoreStrings = (str) => {
    return str.replace(/__STRING_(\d+)__/g, (_, index) => stringPlaceholders[parseInt(index)]);
  };

  // Protect strings before transformations
  code = protectStrings(code);

  // Build patterns for state variable transformation
  const stateVarPattern = [...stateVars].join('|');
  const funcPattern = [...actionNames, ...BUILTIN_FUNCTIONS].join('|');
  const keywordsPattern = [...STATEMENT_KEYWORDS].join('|');

  // Transform state var assignments: stateVar = value -> stateVar.set(value)
  // Match assignment and find end by tracking balanced brackets
  for (const stateVar of stateVars) {
    const pattern = new RegExp(`\\b${stateVar}\\s*=(?!=)`, 'g');
    let match;
    const replacements = [];

    while ((match = pattern.exec(code)) !== null) {
      const startIdx = match.index + match[0].length;

      // Skip whitespace
      let exprStart = startIdx;
      while (exprStart < code.length && /\s/.test(code[exprStart])) exprStart++;

      // Find end of expression with bracket balancing
      let depth = 0;
      let endIdx = exprStart;
      let inString = false;
      let stringChar = '';

      for (let i = exprStart; i < code.length; i++) {
        const ch = code[i];
        const prevCh = i > 0 ? code[i-1] : '';

        // Handle string literals
        if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
          inString = true;
          stringChar = ch;
          endIdx = i + 1;
          continue;
        }
        if (inString) {
          if (ch === stringChar && prevCh !== '\\') {
            inString = false;
          }
          endIdx = i + 1;
          continue;
        }

        // Track bracket depth
        if (ch === '(' || ch === '[' || ch === '{') {
          depth++;
          endIdx = i + 1;
          continue;
        }
        if (ch === ')' || ch === ']' || ch === '}') {
          if (depth > 0) {
            depth--;
            endIdx = i + 1;
            continue;
          }
          // depth would go negative - this is a boundary (e.g., closing brace of if block)
          break;
        }

        // At depth 0, check for statement boundaries
        if (depth === 0) {
          // Semicolon ends the expression
          if (ch === ';') {
            break;
          }
          // Check for whitespace followed by keyword/identifier that starts a new statement
          if (/\s/.test(ch)) {
            const rest = code.slice(i);
            const keywordBoundary = new RegExp(`^\\s+(?:(?:${stateVarPattern})\\s*=(?!=)|(?:${keywordsPattern}|await|return)\\b|(?:${funcPattern})\\s*\\()`);
            if (keywordBoundary.test(rest)) {
              break;
            }
          }
        }

        endIdx = i + 1;
      }

      const value = code.slice(exprStart, endIdx).trim();
      if (value) {
        replacements.push({
          start: match.index,
          end: endIdx,
          replacement: `${stateVar}.set(${value});`
        });
      }
    }

    // Apply replacements in reverse order
    for (let i = replacements.length - 1; i >= 0; i--) {
      const r = replacements[i];
      code = code.slice(0, r.start) + r.replacement + code.slice(r.end);
    }
  }

  // Clean up any double semicolons
  code = code.replace(/;+/g, ';');
  code = code.replace(/; ;/g, ';');

  // Handle post-increment/decrement on state vars: stateVar++ -> ((v) => (stateVar.set(v + 1), v))(stateVar.get())
  for (const stateVar of stateVars) {
    // Post-increment: stateVar++ (returns old value)
    code = code.replace(
      new RegExp(`\\b${stateVar}\\s*\\+\\+`, 'g'),
      `((v) => (${stateVar}.set(v + 1), v))(${stateVar}.get())`
    );
    // Post-decrement: stateVar-- (returns old value)
    code = code.replace(
      new RegExp(`\\b${stateVar}\\s*--`, 'g'),
      `((v) => (${stateVar}.set(v - 1), v))(${stateVar}.get())`
    );
    // Pre-increment: ++stateVar (returns new value)
    code = code.replace(
      new RegExp(`\\+\\+\\s*${stateVar}\\b`, 'g'),
      `(${stateVar}.set(${stateVar}.get() + 1), ${stateVar}.get())`
    );
    // Pre-decrement: --stateVar (returns new value)
    code = code.replace(
      new RegExp(`--\\s*${stateVar}\\b`, 'g'),
      `(${stateVar}.set(${stateVar}.get() - 1), ${stateVar}.get())`
    );
  }

  // Replace state var reads (not in assignments, not already with .get/.set)
  // Allow spread operators (...stateVar) but block member access (obj.stateVar)
  for (const stateVar of stateVars) {
    code = code.replace(
      new RegExp(`(?:(?<=\\.\\.\\.)|(?<!\\.))\\b${stateVar}\\b(?!\\s*=(?!=)|\\s*\\(|\\s*\\.(?:get|set))`, 'g'),
      `${stateVar}.get()`
    );
  }

  // Restore protected strings
  code = restoreStrings(code);

  return code.trim();
}
