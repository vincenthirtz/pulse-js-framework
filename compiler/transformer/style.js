/**
 * Transformer Style Module
 * Handles style block transformation with CSS scoping
 * @module pulse-js-framework/compiler/transformer/style
 */

/**
 * Transform style block with optional scoping
 * @param {Object} transformer - Transformer instance
 * @param {Object} styleBlock - Style block from AST
 * @returns {string} JavaScript code
 */
export function transformStyle(transformer, styleBlock) {
  const lines = ['// Styles'];

  if (transformer.scopeId) {
    lines.push(`const SCOPE_ID = '${transformer.scopeId}';`);
  }

  lines.push('const styles = `');

  for (const rule of styleBlock.rules) {
    lines.push(transformStyleRule(transformer, rule, 0));
  }

  lines.push('`;');
  lines.push('');
  lines.push('// Inject styles');
  lines.push('const styleEl = document.createElement("style");');

  if (transformer.scopeId) {
    lines.push(`styleEl.setAttribute('data-p-scope', SCOPE_ID);`);
  }

  lines.push('styleEl.textContent = styles;');
  lines.push('document.head.appendChild(styleEl);');

  return lines.join('\n');
}

/**
 * Transform style rule with optional scoping
 * @param {Object} transformer - Transformer instance
 * @param {Object} rule - CSS rule from AST
 * @param {number} indent - Indentation level
 * @returns {string} CSS code
 */
export function transformStyleRule(transformer, rule, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];

  // Apply scope to selector if enabled
  let selector = rule.selector;
  if (transformer.scopeId) {
    selector = scopeStyleSelector(transformer, selector);
  }

  lines.push(`${pad}${selector} {`);

  for (const prop of rule.properties) {
    lines.push(`${pad}  ${prop.name}: ${prop.value};`);
  }

  for (const nested of rule.nestedRules) {
    // For nested rules, combine selectors (simplified nesting)
    const nestedLines = transformStyleRule(transformer, nested, indent + 1);
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
 * @media (max-width: 900px) -> @media (max-width: 900px) (unchanged)
 * :root, body, *, html -> unchanged (global selectors)
 * @param {Object} transformer - Transformer instance
 * @param {string} selector - CSS selector
 * @returns {string} Scoped selector
 */
export function scopeStyleSelector(transformer, selector) {
  if (!transformer.scopeId) return selector;

  // Don't scope at-rules (media queries, keyframes, etc.)
  if (selector.startsWith('@')) {
    return selector;
  }

  // Global selectors that should not be scoped
  const globalSelectors = new Set([':root', 'body', 'html', '*']);

  // Check if entire selector is a global selector (possibly with classes like body.dark)
  const trimmed = selector.trim();
  const baseSelector = trimmed.split(/[.#\[:\s]/)[0];
  if (globalSelectors.has(baseSelector) || globalSelectors.has(trimmed)) {
    return selector;
  }

  // Split by comma for multiple selectors
  return selector.split(',').map(part => {
    part = part.trim();

    // Split by space for descendant selectors
    return part.split(/\s+/).map(segment => {
      // Check if this segment is a global selector
      const segmentBase = segment.split(/[.#\[]/)[0];
      if (globalSelectors.has(segmentBase) || globalSelectors.has(segment)) {
        return segment;
      }

      // Skip pseudo-elements and pseudo-classes at the end
      const pseudoMatch = segment.match(/^([^:]+)(:.+)?$/);
      if (pseudoMatch) {
        const base = pseudoMatch[1];
        const pseudo = pseudoMatch[2] || '';

        // Skip if it's just a pseudo selector (like :root)
        if (!base || globalSelectors.has(`:${pseudo.slice(1)}`)) return segment;

        // Add scope class
        return `${base}.${transformer.scopeId}${pseudo}`;
      }
      return `${segment}.${transformer.scopeId}`;
    }).join(' ');
  }).join(', ');
}
