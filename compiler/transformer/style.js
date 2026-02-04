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

  // Collect all flattened rules (handles nesting)
  const flattenedRules = [];
  for (const rule of styleBlock.rules) {
    flattenStyleRule(transformer, rule, '', flattenedRules);
  }

  // Output all flattened rules
  for (const cssRule of flattenedRules) {
    lines.push(cssRule);
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
 * Flatten nested CSS rules by combining selectors
 * Handles CSS nesting by prepending parent selector to nested rules
 * @param {Object} transformer - Transformer instance
 * @param {Object} rule - CSS rule from AST
 * @param {string} parentSelector - Parent selector to prepend (empty for top-level)
 * @param {Array<string>} output - Array to collect flattened CSS rules
 */
export function flattenStyleRule(transformer, rule, parentSelector, output) {
  // Build the full selector by combining parent and current
  let fullSelector = rule.selector;

  if (parentSelector) {
    // Handle & (parent reference) in nested selectors
    if (rule.selector.includes('&')) {
      // Replace & with parent selector
      fullSelector = rule.selector.replace(/&/g, parentSelector);
    } else {
      // Combine parent and child with space (descendant combinator)
      fullSelector = `${parentSelector} ${rule.selector}`;
    }
  }

  // Apply scope to selector if enabled
  let scopedSelector = fullSelector;
  if (transformer.scopeId) {
    scopedSelector = scopeStyleSelector(transformer, fullSelector);
  }

  // Only output rule if it has properties
  if (rule.properties.length > 0) {
    const lines = [];
    lines.push(`  ${scopedSelector} {`);

    for (const prop of rule.properties) {
      lines.push(`    ${prop.name}: ${prop.value};`);
    }

    lines.push('  }');
    output.push(lines.join('\n'));
  }

  // Recursively flatten nested rules with combined selector
  for (const nested of rule.nestedRules) {
    flattenStyleRule(transformer, nested, fullSelector, output);
  }
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
