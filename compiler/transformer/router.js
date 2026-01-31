/**
 * Transformer Router Module
 * Handles router block transformation
 * @module pulse-js-framework/compiler/transformer/router
 */

import { PUNCT_NO_SPACE_BEFORE, PUNCT_NO_SPACE_AFTER } from './constants.js';

/**
 * Helper to emit token value with proper string/template handling
 * @param {Object} token - Token to emit
 * @returns {string} Token value
 */
export function emitToken(token) {
  if (token.type === 'STRING') return token.raw || JSON.stringify(token.value);
  if (token.type === 'TEMPLATE') return token.raw || ('`' + token.value + '`');
  return token.value;
}

/**
 * Helper to check if space needed between tokens
 * @param {Object} token - Current token
 * @param {Object} nextToken - Next token
 * @returns {boolean} Whether space is needed
 */
export function needsSpace(token, nextToken) {
  if (!nextToken) return false;
  return !PUNCT_NO_SPACE_BEFORE.includes(nextToken.type) &&
         !PUNCT_NO_SPACE_AFTER.includes(token.type);
}

/**
 * Transform router guard body - handles store references
 * @param {Array} tokens - Body tokens
 * @returns {string} JavaScript code
 */
export function transformRouterGuardBody(tokens) {
  let code = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.value === 'store' && tokens[i + 1]?.type === 'DOT') {
      code += '$store';
    } else {
      code += emitToken(token);
    }
    if (needsSpace(token, tokens[i + 1])) code += ' ';
  }
  return code.trim();
}

/**
 * Transform router block to createRouter() call
 * @param {Object} transformer - Transformer instance
 * @param {Object} routerBlock - Router block from AST
 * @returns {string} JavaScript code
 */
export function transformRouter(transformer, routerBlock) {
  const lines = ['// Router'];

  // Build routes object
  const routesCode = [];
  for (const route of routerBlock.routes) {
    routesCode.push(`    '${route.path}': ${route.handler}`);
  }

  lines.push('const router = createRouter({');
  lines.push(`  mode: '${routerBlock.mode}',`);
  if (routerBlock.base) {
    lines.push(`  base: '${routerBlock.base}',`);
  }
  lines.push('  routes: {');
  lines.push(routesCode.join(',\n'));
  lines.push('  }');
  lines.push('});');
  lines.push('');

  // Add global guards
  if (routerBlock.beforeEach) {
    const params = routerBlock.beforeEach.params.join(', ');
    const body = transformRouterGuardBody(routerBlock.beforeEach.body);
    lines.push(`router.beforeEach((${params}) => { ${body} });`);
  }

  if (routerBlock.afterEach) {
    const params = routerBlock.afterEach.params.join(', ');
    const body = transformRouterGuardBody(routerBlock.afterEach.body);
    lines.push(`router.afterEach((${params}) => { ${body} });`);
  }

  lines.push('');
  lines.push('// Start router');
  lines.push('router.start();');

  return lines.join('\n');
}
