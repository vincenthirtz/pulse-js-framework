/**
 * Transformer Export Module
 * Handles component export generation
 * @module pulse-js-framework/compiler/transformer/export
 */

/**
 * Generate component export
 * @param {Object} transformer - Transformer instance
 * @returns {string} JavaScript code
 */
export function generateExport(transformer) {
  const pageName = transformer.ast.page?.name || 'Component';
  const routePath = transformer.ast.route?.path || null;

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
