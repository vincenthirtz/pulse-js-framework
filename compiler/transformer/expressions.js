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
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
      // Props and state are both reactive (wrapped in computed via useProp or pulse)
      if (transformer.propVars.has(node.name)) {
        return `${node.name}.get()`;
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
      // Use optional chaining when accessing properties on:
      // 1. Function call results (could return null/undefined)
      // 2. Props (commonly receive null values like notification: null)
      // Note: State vars don't get optional chaining to avoid breaking array/object methods
      const isCallResult = node.object.type === NodeType.CallExpression;
      const isProp = node.object.type === NodeType.Identifier &&
        transformer.propVars.has(node.object.name);
      const useOptionalChaining = isCallResult || isProp;
      const accessor = useOptionalChaining ? '?.' : '.';
      if (node.computed) {
        const prop = transformExpression(transformer, node.property);
        return useOptionalChaining ? `${obj}?.[${prop}]` : `${obj}[${prop}]`;
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
      // For state variables, convert x++ to x.update(x => x + 1)
      if (node.argument.type === NodeType.Identifier &&
          transformer.stateVars.has(node.argument.name)) {
        const name = node.argument.name;
        const op = node.operator === '++' ? '+' : '-';
        return `${name}.update(_${name} => _${name} ${op} 1)`;
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
      const operator = node.operator || '=';

      // For state variables, convert to .set() or .update()
      if (node.left.type === NodeType.Identifier &&
          transformer.stateVars.has(node.left.name)) {
        const varName = node.left.name;

        // Compound assignment operators (+=, -=, *=, /=, &&=, ||=, ??=)
        if (operator !== '=') {
          // Convert compound assignment to update
          // a += b  =>  a.update(_a => _a + b)
          // a -= b  =>  a.update(_a => _a - b)
          const baseOp = operator.slice(0, -1); // Remove trailing '='
          return `${varName}.update(_${varName} => _${varName} ${baseOp} ${right})`;
        }

        // Simple assignment: a = b  =>  a.set(b)
        return `${varName}.set(${right})`;
      }

      // Regular assignment (non-state vars)
      if (operator === '=') {
        return `(${left} = ${right})`;
      }
      // Compound assignment for non-state vars
      return `(${left} ${operator} ${right})`;
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
  // Transform state and prop vars in expression strings (interpolations, attribute bindings)
  // Both are now reactive (useProp returns computed for uniform interface)
  let result = exprStr;

  // Build combined patterns once for all variables (O(1) regex compilations instead of O(n))
  const stateVarsArr = [...transformer.stateVars];
  const propVarsArr = [...transformer.propVars];

  if (stateVarsArr.length > 0) {
    const stateAlt = stateVarsArr.map(escapeRegExp).join('|');

    // First, handle assignments to state vars: stateVar = expr -> stateVar.set(expr)
    // This must happen before the generic .get() replacement to avoid generating
    // invalid code like stateVar.get() = expr (LHS of assignment is not a reference)

    // Compound assignment: stateVar += expr -> stateVar.update(_v => _v + expr)
    // Single combined regex for all state vars
    const compoundPattern = new RegExp(`\\b(${stateAlt})\\s*(\\+=|-=|\\*=|\\/=|&&=|\\|\\|=|\\?\\?=)\\s*`, 'g');
    let compoundMatch;
    const compoundReplacements = [];

    while ((compoundMatch = compoundPattern.exec(result)) !== null) {
      const varName = compoundMatch[1];
      const op = compoundMatch[2];
      const baseOp = op.slice(0, -1);
      const rhsStart = compoundMatch.index + compoundMatch[0].length;

      // Find end of RHS expression using bracket balancing
      let depth = 0;
      let endIdx = rhsStart;
      for (let i = rhsStart; i < result.length; i++) {
        const ch = result[i];
        if (ch === '(' || ch === '[' || ch === '{') { depth++; endIdx = i + 1; continue; }
        if (ch === ')' || ch === ']' || ch === '}') {
          if (depth > 0) { depth--; endIdx = i + 1; continue; }
          break; // closing bracket at depth 0 = boundary
        }
        if (depth === 0 && (ch === ';' || ch === ',')) break;
        endIdx = i + 1;
      }

      const rhs = result.slice(rhsStart, endIdx).trim();
      if (rhs) {
        compoundReplacements.push({
          start: compoundMatch.index,
          end: endIdx,
          replacement: `${varName}.update(_v => _v ${baseOp} ${rhs})`
        });
      }
    }

    // Apply compound replacements in reverse order
    for (let i = compoundReplacements.length - 1; i >= 0; i--) {
      const r = compoundReplacements[i];
      result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
    }

    // Simple assignment: stateVar = expr -> stateVar.set(expr)
    // Single combined regex for all state vars
    const simplePattern = new RegExp(`\\b(${stateAlt})\\s*=(?!=)\\s*`, 'g');
    let simpleMatch;
    const simpleReplacements = [];

    while ((simpleMatch = simplePattern.exec(result)) !== null) {
      const varName = simpleMatch[1];
      const rhsStart = simpleMatch.index + simpleMatch[0].length;

      let depth = 0;
      let endIdx = rhsStart;
      for (let i = rhsStart; i < result.length; i++) {
        const ch = result[i];
        if (ch === '(' || ch === '[' || ch === '{') { depth++; endIdx = i + 1; continue; }
        if (ch === ')' || ch === ']' || ch === '}') {
          if (depth > 0) { depth--; endIdx = i + 1; continue; }
          break;
        }
        if (depth === 0 && (ch === ';' || ch === ',')) break;
        endIdx = i + 1;
      }

      const rhs = result.slice(rhsStart, endIdx).trim();
      if (rhs) {
        simpleReplacements.push({
          start: simpleMatch.index,
          end: endIdx,
          replacement: `${varName}.set(${rhs})`
        });
      }
    }

    // Apply simple replacements in reverse order
    for (let i = simpleReplacements.length - 1; i >= 0; i--) {
      const r = simpleReplacements[i];
      result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
    }

    // Transform state var reads (not already transformed to .get/.set/.update)
    // Single combined regex for all state vars
    result = result.replace(
      new RegExp(`\\b(${stateAlt})\\b(?!\\.(?:get|set|update))`, 'g'),
      '$1.get()'
    );
  }

  // Transform prop vars (now also reactive via useProp)
  // Add optional chaining when followed by property access for nullable props
  // Props commonly receive null values (e.g., notification: null)
  if (propVarsArr.length > 0) {
    const propAlt = propVarsArr.map(escapeRegExp).join('|');
    // Property access: propVar.x -> propVar.get()?.x
    // Guard against already-transformed: skip if followed by .get( or .set(
    result = result.replace(
      new RegExp(`\\b(${propAlt})\\b(?=\\.(?!get\\(|set\\())`, 'g'),
      '$1.get()?'
    );
    // Handle standalone prop var (not followed by property access)
    // Guard: skip if already followed by .get or .set
    result = result.replace(
      new RegExp(`\\b(${propAlt})\\b(?!\\.(?:get|set)\\()(?!\\.)`, 'g'),
      '$1.get()'
    );
  }

  // NOTE: Removed aggressive optional chaining regex that was adding ?.
  // after ALL function calls. This caused false positives like:
  // "User.name" -> "User?.name" in string literals.
  // Optional chaining should be explicitly written by developers, not auto-added.
  // The lexer now properly tokenizes ?. as OPTIONAL_CHAIN for explicit usage.

  return result;
}

/**
 * Transform function body tokens back to code
 * @param {Object} transformer - Transformer instance
 * @param {Array} tokens - Body tokens
 * @returns {string} JavaScript code
 */
export function transformFunctionBody(transformer, tokens) {
  const { stateVars, propVars, actionNames } = transformer;
  let code = '';
  let lastToken = null;
  let lastNonSpaceToken = null;

  // Tokens that must follow } directly without semicolon
  const NO_SEMI_BEFORE = new Set(['catch', 'finally', 'else']);

  const needsManualSemicolon = (token, nextToken, lastNonSpace, tokenIndex) => {
    if (!token || lastNonSpace?.value === 'new') return false;
    // Don't add semicolon after 'await' - it always needs its expression
    if (lastNonSpace?.value === 'await') return false;
    // For 'return': bare return followed by statement keyword or state assignment needs semicolon
    if (lastNonSpace?.value === 'return') {
      // If followed by a statement keyword, it's a bare return - needs semicolon
      if (token.type === 'IDENT' && STATEMENT_KEYWORDS.has(token.value)) return true;
      if (STATEMENT_TOKEN_TYPES.has(token.type)) return true;
      // If followed by a state variable assignment, it's a bare return - needs semicolon
      if (token.type === 'IDENT' && stateVars.has(token.value) && nextToken?.type === 'EQ') return true;
      return false;  // return expression - no semicolon
    }
    // Don't add semicolon before catch/finally/else after }
    if (lastNonSpace?.type === 'RBRACE' && NO_SEMI_BEFORE.has(token.value)) return false;
    if (STATEMENT_TOKEN_TYPES.has(token.type)) return true;
    if (token.type !== 'IDENT') return false;
    if (STATEMENT_KEYWORDS.has(token.value)) return true;
    if (stateVars.has(token.value) && nextToken?.type === 'EQ') return true;
    // Any identifier followed by = after a statement end is an assignment statement
    if (nextToken?.type === 'EQ' && lastNonSpace?.type === 'RPAREN') return true;
    if (nextToken?.type === 'LPAREN' &&
        (BUILTIN_FUNCTIONS.has(token.value) || actionNames.has(token.value))) return true;
    if (nextToken?.type === 'DOT' && BUILTIN_FUNCTIONS.has(token.value)) return true;

    // Check for property assignment or method call: identifier.property = value OR identifier.method()
    // This is a new statement if token is followed by .property = ... or .method(...)
    if (nextToken?.type === 'DOT') {
      // Look ahead to see if this is an assignment or method call
      for (let j = tokenIndex + 1; j < tokens.length && j < tokenIndex + 10; j++) {
        const t = tokens[j];
        // Assignment: identifier.property = value
        if (t.type === 'EQ' && tokens[j-1]?.type === 'IDENT') return true;
        // Method call: identifier.method()
        if (t.type === 'LPAREN' && tokens[j-1]?.type === 'IDENT') return true;
        if (t.type === 'SEMI') break;
      }
    }
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
    if (needsManualSemicolon(token, nextToken, lastNonSpaceToken, i) &&
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
    // Match string and template literals, handling escape sequences.
    // Uses three separate patterns (one per quote type) to avoid ReDoS.
    // Each pattern: quote + (non-quote-non-backslash chars | escape sequence)* + quote
    // The [^"\\]* / [^'\\]* / [^`\\]* greedily consumes safe chars without backtracking.
    return str
      .replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
        const index = stringPlaceholders.length;
        stringPlaceholders.push(match);
        return `__STRING_${index}__`;
      })
      .replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
        const index = stringPlaceholders.length;
        stringPlaceholders.push(match);
        return `__STRING_${index}__`;
      })
      .replace(/`(?:[^`\\]|\\.)*`/g, (match) => {
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

  // Build patterns for state variable transformation (precompiled once)
  const stateVarPattern = [...stateVars].map(escapeRegExp).join('|');
  const funcPattern = [...actionNames, ...BUILTIN_FUNCTIONS].map(escapeRegExp).join('|');
  const keywordsPattern = [...STATEMENT_KEYWORDS].map(escapeRegExp).join('|');

  // Precompile boundary regex once (was O(n²) when created inside inner loop)
  const keywordBoundary = new RegExp(`^\\s+(?:(?:${stateVarPattern})\\s*=(?!=)|(?:${keywordsPattern}|await|return)\\b|(?:${funcPattern})\\s*\\()`);

  // Combined assignment pattern for all state vars (single regex instead of N)
  const assignPattern = stateVars.size > 0
    ? new RegExp(`\\b(${stateVarPattern})\\s*=(?!=)`, 'g')
    : null;

  // Transform state var assignments: stateVar = value -> stateVar.set(value)
  // Match assignment and find end by tracking balanced brackets
  if (assignPattern) {
    let match;
    const replacements = [];

    while ((match = assignPattern.exec(code)) !== null) {
      const stateVar = match[1];
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

        // Handle string literals
        if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
          inString = true;
          stringChar = ch;
          endIdx = i + 1;
          continue;
        }
        if (inString) {
          if (ch === '\\') {
            // Skip next character (escaped)
            i++;
            endIdx = i + 1;
            continue;
          }
          if (ch === stringChar) {
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

  // Handle post-increment/decrement on state vars
  // Combined regex for all state vars (single pass instead of 4N passes)
  if (stateVarPattern) {
    // Post-increment: stateVar++ (returns old value)
    code = code.replace(
      new RegExp(`\\b(${stateVarPattern})\\s*\\+\\+`, 'g'),
      (_, v) => `((v) => (${v}.set(v + 1), v))(${v}.get())`
    );
    // Post-decrement: stateVar-- (returns old value)
    code = code.replace(
      new RegExp(`\\b(${stateVarPattern})\\s*--`, 'g'),
      (_, v) => `((v) => (${v}.set(v - 1), v))(${v}.get())`
    );
    // Pre-increment: ++stateVar (returns new value)
    code = code.replace(
      new RegExp(`\\+\\+\\s*(${stateVarPattern})\\b`, 'g'),
      (_, v) => `(${v}.set(${v}.get() + 1), ${v}.get())`
    );
    // Pre-decrement: --stateVar (returns new value)
    code = code.replace(
      new RegExp(`--\\s*(${stateVarPattern})\\b`, 'g'),
      (_, v) => `(${v}.set(${v}.get() - 1), ${v}.get())`
    );
  }

  // Helper: check if match at offset is an object key (shared by state/prop reads)
  const isObjectKey = (str, match, offset) => {
    const after = str.slice(offset + match.length, offset + match.length + 10);
    if (!/^\s*:(?!:)/.test(after)) return false;
    let depth = 0;
    for (let i = offset - 1; i >= 0; i--) {
      const ch = str[i];
      if (ch === ')' || ch === ']') depth++;
      else if (ch === '(' || ch === '[') depth--;
      else if (ch === '}') depth++;
      else if (ch === '{') {
        if (depth === 0) return true;
        depth--;
      }
      else if (ch === ',' && depth === 0) return true;
      else if (ch === ';' && depth === 0) break;
    }
    return false;
  };

  // Replace state var reads (not in assignments, not already with .get/.set)
  // Combined regex for all state vars (single pass instead of N passes)
  if (stateVarPattern) {
    code = code.replace(
      new RegExp(`(?:(?<=\\.\\.\\.)|(?<!\\.))\\b(${stateVarPattern})\\b(?!\\s*=(?!=)|\\s*\\(|\\s*\\.(?:get|set))`, 'g'),
      (match, varName, offset) => {
        if (isObjectKey(code, match, offset)) return match;
        return `${varName}.get()`;
      }
    );
  }

  // Replace prop var reads (props are reactive via useProp, need .get() like state vars)
  // Combined regex for all prop vars (single pass instead of N passes)
  if (propVars.size > 0) {
    const propVarPattern = [...propVars].map(escapeRegExp).join('|');
    code = code.replace(
      new RegExp(`(?:(?<=\\.\\.\\.)|(?<!\\.))\\b(${propVarPattern})\\b(?!\\s*=(?!=)|\\s*\\.(?:get|set))`, 'g'),
      (match, varName, offset) => {
        if (isObjectKey(code, match, offset)) return match;
        return `${varName}.get()`;
      }
    );
  }

  // Restore protected strings
  code = restoreStrings(code);

  return code.trim();
}
