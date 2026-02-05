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
 * Check if a selector is an @-rule (media query, keyframes, etc.)
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isAtRule(selector) {
  return selector.trim().startsWith('@');
}

/**
 * Check if a selector is @keyframes
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isKeyframesRule(selector) {
  return selector.trim().startsWith('@keyframes');
}

/**
 * Check if selector is @layer (CSS Cascade Layers)
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isLayerRule(selector) {
  return selector.trim().startsWith('@layer');
}

/**
 * Check if selector is @supports (CSS Feature Queries)
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isSupportsRule(selector) {
  return selector.trim().startsWith('@supports');
}

/**
 * Check if selector is @container (CSS Container Queries)
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isContainerRule(selector) {
  return selector.trim().startsWith('@container');
}

/**
 * Check if selector is a conditional group at-rule that can contain nested rules
 * These include @media, @supports, @container, @layer
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isConditionalGroupAtRule(selector) {
  const trimmed = selector.trim();
  return trimmed.startsWith('@media') ||
         trimmed.startsWith('@supports') ||
         trimmed.startsWith('@container') ||
         trimmed.startsWith('@layer') ||
         trimmed.startsWith('@scope') ||
         trimmed.startsWith('@document');
}

/**
 * Check if a selector is a keyframe step (from, to, or percentage)
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
function isKeyframeStep(selector) {
  const trimmed = selector.trim();
  return trimmed === 'from' || trimmed === 'to' || /^\d+%$/.test(trimmed);
}

/**
 * Flatten nested CSS rules by combining selectors
 * Handles CSS nesting by prepending parent selector to nested rules
 * Special handling for @-rules (media queries, keyframes, supports, container, layer, etc.)
 * @param {Object} transformer - Transformer instance
 * @param {Object} rule - CSS rule from AST
 * @param {string} parentSelector - Parent selector to prepend (empty for top-level)
 * @param {Array<string>} output - Array to collect flattened CSS rules
 * @param {string} atRuleWrapper - Optional @-rule wrapper (e.g., "@media (max-width: 768px)")
 * @param {boolean} inKeyframes - Whether we're inside @keyframes (don't scope keyframe steps)
 */
export function flattenStyleRule(transformer, rule, parentSelector, output, atRuleWrapper = '', inKeyframes = false) {
  const selector = rule.selector;

  // Check if this is an @-rule
  if (isAtRule(selector)) {
    const isKeyframes = isKeyframesRule(selector);
    const isLayer = isLayerRule(selector);
    const isConditionalGroup = isConditionalGroupAtRule(selector);

    // @keyframes should be output as a complete block, not flattened
    if (isKeyframes) {
      const lines = [];
      // Wrap in existing @-rule if present
      if (atRuleWrapper) {
        lines.push(`  ${atRuleWrapper} {`);
        lines.push(`    ${selector} {`);
        for (const nested of rule.nestedRules) {
          lines.push(`      ${nested.selector} {`);
          for (const prop of nested.properties) {
            lines.push(`        ${prop.name}: ${prop.value};`);
          }
          lines.push('      }');
        }
        lines.push('    }');
        lines.push('  }');
      } else {
        lines.push(`  ${selector} {`);
        for (const nested of rule.nestedRules) {
          lines.push(`    ${nested.selector} {`);
          for (const prop of nested.properties) {
            lines.push(`      ${prop.name}: ${prop.value};`);
          }
          lines.push('    }');
        }
        lines.push('  }');
      }
      output.push(lines.join('\n'));
      return;
    }

    // @layer - output with its content, support both named layers and anonymous layer blocks
    if (isLayer) {
      // Check if it's just a layer statement (@layer name;) or a layer block (@layer name { ... })
      if (rule.nestedRules.length === 0 && rule.properties.length === 0) {
        // Layer order statement: @layer base, components, utilities;
        output.push(`  ${selector};`);
        return;
      }

      // Layer block with content
      const lines = [];

      if (atRuleWrapper) {
        lines.push(`  ${atRuleWrapper} {`);
        lines.push(`    ${selector} {`);
      } else {
        lines.push(`  ${selector} {`);
      }

      // Process nested rules within the layer
      const nestedOutput = [];
      for (const nested of rule.nestedRules) {
        flattenStyleRule(transformer, nested, '', nestedOutput, '', false);
      }

      // Add nested output with proper indentation
      const baseIndent = atRuleWrapper ? '    ' : '  ';
      for (const nestedRule of nestedOutput) {
        // Adjust indentation for nested rules
        const reindented = nestedRule.split('\n').map(line => baseIndent + line.trim()).join('\n');
        lines.push(reindented);
      }

      if (atRuleWrapper) {
        lines.push('    }');
        lines.push('  }');
      } else {
        lines.push('  }');
      }
      output.push(lines.join('\n'));
      return;
    }

    // Conditional group @-rules (@media, @supports, @container) wrap their nested rules
    // They can be nested inside each other
    if (isConditionalGroup) {
      // Combine with existing wrapper if present
      const combinedWrapper = atRuleWrapper ? `${atRuleWrapper} { ${selector}` : selector;

      for (const nested of rule.nestedRules) {
        flattenStyleRule(transformer, nested, parentSelector, output, combinedWrapper, false);
      }
      return;
    }

    // Other @-rules (unknown) - output as-is with nested content
    for (const nested of rule.nestedRules) {
      flattenStyleRule(transformer, nested, '', output, selector, false);
    }
    return;
  }

  // Build the full selector by combining parent and current
  let fullSelector = selector;

  if (parentSelector) {
    // Handle & (parent reference) in nested selectors
    if (selector.includes('&')) {
      // Replace & with parent selector
      fullSelector = selector.replace(/&/g, parentSelector);
    } else {
      // Combine parent and child with space (descendant combinator)
      fullSelector = `${parentSelector} ${selector}`;
    }
  }

  // Apply scope to selector if enabled (but not for keyframe steps)
  let scopedSelector = fullSelector;
  if (transformer.scopeId && !inKeyframes && !isKeyframeStep(selector)) {
    scopedSelector = scopeStyleSelector(transformer, fullSelector);
  }

  // Only output rule if it has properties
  if (rule.properties.length > 0) {
    const lines = [];

    // If wrapped in an @-rule, output the wrapper
    if (atRuleWrapper) {
      lines.push(`  ${atRuleWrapper} {`);
      lines.push(`    ${scopedSelector} {`);
      for (const prop of rule.properties) {
        lines.push(`      ${prop.name}: ${prop.value};`);
      }
      lines.push('    }');
      lines.push('  }');
    } else {
      lines.push(`  ${scopedSelector} {`);
      for (const prop of rule.properties) {
        lines.push(`    ${prop.name}: ${prop.value};`);
      }
      lines.push('  }');
    }

    output.push(lines.join('\n'));
  }

  // Recursively flatten nested rules with combined selector
  for (const nested of rule.nestedRules) {
    flattenStyleRule(transformer, nested, fullSelector, output, atRuleWrapper, inKeyframes);
  }
}

/**
 * Add scope to CSS selector
 * .container -> .container.p123abc
 * div -> div.p123abc
 * .a .b -> .a.p123abc .b.p123abc
 * .a > .b -> .a.p123abc > .b.p123abc (preserves combinators)
 * .a + .b -> .a.p123abc + .b.p123abc
 * .a ~ .b -> .a.p123abc ~ .b.p123abc
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

  // CSS combinators that should be preserved
  const combinators = new Set(['>', '+', '~']);

  // Split by comma for multiple selectors
  return selector.split(',').map(part => {
    part = part.trim();

    // Split by whitespace but preserve combinators
    // This regex splits on whitespace but keeps combinators as separate tokens
    const tokens = part.split(/(\s*[>+~]\s*|\s+)/).filter(t => t.trim());
    const result = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();

      // Check if this is a combinator
      if (combinators.has(token)) {
        result.push(` ${token} `);
        continue;
      }

      // Skip empty tokens
      if (!token) continue;

      // Check if this segment is a global selector
      const segmentBase = token.split(/[.#\[]/)[0];
      if (globalSelectors.has(segmentBase) || globalSelectors.has(token)) {
        result.push(token);
        continue;
      }

      // Handle :has(), :is(), :where(), :not() - scope selectors inside
      if (token.includes(':has(') || token.includes(':is(') ||
          token.includes(':where(') || token.includes(':not(')) {
        result.push(scopePseudoClassSelector(transformer, token));
        continue;
      }

      // Skip pseudo-elements and pseudo-classes at the end
      const pseudoMatch = token.match(/^([^:]+)(:.+)?$/);
      if (pseudoMatch) {
        const base = pseudoMatch[1];
        const pseudo = pseudoMatch[2] || '';

        // Skip if it's just a pseudo selector (like :root)
        if (!base || globalSelectors.has(`:${pseudo.slice(1)}`)) {
          result.push(token);
          continue;
        }

        // Add scope class
        result.push(`${base}.${transformer.scopeId}${pseudo}`);
        continue;
      }
      result.push(`${token}.${transformer.scopeId}`);
    }

    return result.join('');
  }).join(', ');
}

/**
 * Scope selectors inside functional pseudo-classes like :has(), :is(), :where(), :not()
 * @param {Object} transformer - Transformer instance
 * @param {string} selector - Selector containing functional pseudo-class
 * @returns {string} Scoped selector
 */
function scopePseudoClassSelector(transformer, selector) {
  // Match functional pseudo-classes: :has(), :is(), :where(), :not()
  return selector.replace(
    /:(has|is|where|not)\(([^)]+)\)/g,
    (_match, pseudoClass, inner) => {
      // Recursively scope the inner selector
      const scopedInner = scopeStyleSelector(transformer, inner);
      return `:${pseudoClass}(${scopedInner})`;
    }
  );
}
