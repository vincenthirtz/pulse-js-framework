/**
 * Transformer State Module
 * Handles state, props, and actions extraction and transformation
 * @module pulse-js-framework/compiler/transformer/state
 */

import { NodeType } from '../parser.js';

/**
 * Extract prop variable names and defaults
 * @param {Object} transformer - Transformer instance
 * @param {Object} propsBlock - Props block from AST
 */
export function extractPropVars(transformer, propsBlock) {
  for (const prop of propsBlock.properties) {
    transformer.propVars.add(prop.name);
    transformer.propDefaults.set(prop.name, prop.value);
  }
}

/**
 * Extract state variable names
 * @param {Object} transformer - Transformer instance
 * @param {Object} stateBlock - State block from AST
 */
export function extractStateVars(transformer, stateBlock) {
  for (const prop of stateBlock.properties) {
    transformer.stateVars.add(prop.name);
  }
}

/**
 * Extract action names
 * @param {Object} transformer - Transformer instance
 * @param {Object} actionsBlock - Actions block from AST
 */
export function extractActionNames(transformer, actionsBlock) {
  for (const fn of actionsBlock.functions) {
    transformer.actionNames.add(fn.name);
  }
}

/**
 * Transform a value node to JavaScript code
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - AST node to transform
 * @returns {string} JavaScript code
 */
export function transformValue(transformer, node) {
  if (!node) return 'undefined';

  switch (node.type) {
    case NodeType.Literal:
      if (typeof node.value === 'string') {
        return JSON.stringify(node.value);
      }
      return String(node.value);

    case NodeType.ObjectLiteral: {
      const props = node.properties.map(p =>
        `${p.name}: ${transformValue(transformer, p.value)}`
      );
      return `{ ${props.join(', ')} }`;
    }

    case NodeType.ArrayLiteral: {
      const elements = node.elements.map(e => transformValue(transformer, e));
      return `[${elements.join(', ')}]`;
    }

    case NodeType.Identifier:
      return node.name;

    default:
      return 'undefined';
  }
}

/**
 * Transform state block to pulse declarations
 * @param {Object} transformer - Transformer instance
 * @param {Object} stateBlock - State block from AST
 * @returns {string} JavaScript code
 */
export function transformState(transformer, stateBlock) {
  const lines = ['// State'];

  for (const prop of stateBlock.properties) {
    const value = transformValue(transformer, prop.value);
    lines.push(`const ${prop.name} = pulse(${value});`);
  }

  return lines.join('\n');
}

/**
 * Transform actions block to function declarations
 * @param {Object} transformer - Transformer instance
 * @param {Object} actionsBlock - Actions block from AST
 * @param {Function} transformFunctionBody - Function to transform body tokens
 * @returns {string} JavaScript code
 */
export function transformActions(transformer, actionsBlock, transformFunctionBody) {
  const lines = ['// Actions'];

  for (const fn of actionsBlock.functions) {
    const asyncKeyword = fn.async ? 'async ' : '';
    const params = fn.params.join(', ');
    const body = transformFunctionBody(transformer, fn.body);

    lines.push(`${asyncKeyword}function ${fn.name}(${params}) {`);
    lines.push(`  ${body}`);
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}
