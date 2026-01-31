/**
 * Transformer Store Module
 * Handles store block transformation
 * @module pulse-js-framework/compiler/transformer/store
 */

import { emitToken, needsSpace } from './router.js';

/**
 * Transform store action body (this.x = y -> store.x.set(y))
 * @param {Array} tokens - Body tokens
 * @returns {string} JavaScript code
 */
export function transformStoreActionBody(tokens) {
  let code = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.value === 'this') code += 'store';
    else if (token.type === 'COLON') code += ' : ';
    else code += emitToken(token);
    if (needsSpace(token, tokens[i + 1])) code += ' ';
  }
  return code.replace(/store\.(\w+)\s*=\s*([^;]+)/g, 'store.$1.set($2)').trim();
}

/**
 * Transform store getter body (this.x -> store.x.get())
 * @param {Array} tokens - Body tokens
 * @returns {string} JavaScript code
 */
export function transformStoreGetterBody(tokens) {
  return transformStoreActionBody(tokens)
    .replace(/store\.(\w+)(?!\.(?:get|set)\()/g, 'store.$1.get()');
}

/**
 * Transform store block to createStore(), createActions(), createGetters() calls
 * @param {Object} transformer - Transformer instance
 * @param {Object} storeBlock - Store block from AST
 * @param {Function} transformValue - Function to transform values
 * @returns {string} JavaScript code
 */
export function transformStore(transformer, storeBlock, transformValue) {
  const lines = ['// Store'];

  // Transform state
  if (storeBlock.state) {
    const stateProps = storeBlock.state.properties.map(p =>
      `  ${p.name}: ${transformValue(transformer, p.value)}`
    ).join(',\n');

    lines.push('const store = createStore({');
    lines.push(stateProps);
    lines.push('}, {');
    lines.push(`  persist: ${storeBlock.persist},`);
    lines.push(`  storageKey: '${storeBlock.storageKey}'`);
    lines.push('});');
    lines.push('');
  }

  // Transform actions
  if (storeBlock.actions) {
    lines.push('const storeActions = createActions(store, {');
    for (const fn of storeBlock.actions.functions) {
      const params = fn.params.length > 0 ? ', ' + fn.params.join(', ') : '';
      const body = transformStoreActionBody(fn.body);
      lines.push(`  ${fn.name}: (store${params}) => { ${body} },`);
    }
    lines.push('});');
    lines.push('');
  }

  // Transform getters
  if (storeBlock.getters) {
    lines.push('const storeGetters = createGetters(store, {');
    for (const getter of storeBlock.getters.getters) {
      const body = transformStoreGetterBody(getter.body);
      lines.push(`  ${getter.name}: (store) => { ${body} },`);
    }
    lines.push('});');
    lines.push('');
  }

  // Create combined $store object for easy access
  lines.push('// Combined store with actions and getters');
  lines.push('const $store = {');
  lines.push('  ...store,');
  if (storeBlock.actions) {
    lines.push('  ...storeActions,');
  }
  if (storeBlock.getters) {
    lines.push('  ...storeGetters,');
  }
  lines.push('};');

  return lines.join('\n');
}
