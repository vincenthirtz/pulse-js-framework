/**
 * Transformer View Module
 * Handles view block and element transformations
 * @module pulse-js-framework/compiler/transformer/view
 */

import { NodeType } from '../parser.js';
import { transformValue } from './state.js';
import { transformExpression, transformExpressionString } from './expressions.js';

/** View node transformers lookup table */
export const VIEW_NODE_HANDLERS = {
  [NodeType.Element]: 'transformElement',
  [NodeType.TextNode]: 'transformTextNode',
  [NodeType.IfDirective]: 'transformIfDirective',
  [NodeType.EachDirective]: 'transformEachDirective',
  [NodeType.EventDirective]: 'transformEventDirective',
  [NodeType.ModelDirective]: 'transformModelDirective',
  [NodeType.SlotElement]: 'transformSlot',
  [NodeType.LinkDirective]: 'transformLinkDirective',
  [NodeType.OutletDirective]: 'transformOutletDirective',
  [NodeType.NavigateDirective]: 'transformNavigateDirective',
  // Accessibility directives
  [NodeType.A11yDirective]: 'transformA11yDirective',
  [NodeType.LiveDirective]: 'transformLiveDirective',
  [NodeType.FocusTrapDirective]: 'transformFocusTrapDirective'
};

/**
 * Transform view block
 * @param {Object} transformer - Transformer instance
 * @param {Object} viewBlock - View block from AST
 * @returns {string} JavaScript code
 */
export function transformView(transformer, viewBlock) {
  const lines = ['// View'];

  // Generate render function with props parameter
  lines.push('function render({ props = {}, slots = {} } = {}) {');

  // Destructure props with defaults if component has props
  if (transformer.propVars.size > 0) {
    const propsDestructure = [...transformer.propVars].map(name => {
      const defaultValue = transformer.propDefaults.get(name);
      const defaultCode = defaultValue ? transformValue(transformer, defaultValue) : 'undefined';
      return `${name} = ${defaultCode}`;
    }).join(', ');
    lines.push(`  const { ${propsDestructure} } = props;`);
  }

  lines.push('  return (');

  const children = viewBlock.children.map(child =>
    transformViewNode(transformer, child, 4)
  );

  if (children.length === 1) {
    lines.push(children[0]);
  } else {
    lines.push('    [');
    lines.push(children.map(c => '      ' + c.trim()).join(',\n'));
    lines.push('    ]');
  }

  lines.push('  );');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Transform a view node (element, directive, slot, text)
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - AST node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformViewNode(transformer, node, indent = 0) {
  const handler = VIEW_NODE_HANDLERS[node.type];
  if (handler) {
    // Call the appropriate handler function
    switch (node.type) {
      case NodeType.Element:
        return transformElement(transformer, node, indent);
      case NodeType.TextNode:
        return transformTextNode(transformer, node, indent);
      case NodeType.IfDirective:
        return transformIfDirective(transformer, node, indent);
      case NodeType.EachDirective:
        return transformEachDirective(transformer, node, indent);
      case NodeType.EventDirective:
        return transformEventDirective(transformer, node, indent);
      case NodeType.ModelDirective:
        return transformModelDirective(transformer, node, indent);
      case NodeType.SlotElement:
        return transformSlot(transformer, node, indent);
      case NodeType.LinkDirective:
        return transformLinkDirective(transformer, node, indent);
      case NodeType.OutletDirective:
        return transformOutletDirective(transformer, node, indent);
      case NodeType.NavigateDirective:
        return transformNavigateDirective(transformer, node, indent);
      case NodeType.A11yDirective:
        return transformA11yDirective(transformer, node, indent);
      case NodeType.LiveDirective:
        return transformLiveDirective(transformer, node, indent);
      case NodeType.FocusTrapDirective:
        return transformFocusTrapDirective(transformer, node, indent);
      default:
        return `${' '.repeat(indent)}/* unknown node: ${node.type} */`;
    }
  }
  return `${' '.repeat(indent)}/* unknown node: ${node.type} */`;
}

/**
 * Transform slot element
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Slot node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformSlot(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const slotName = node.name || 'default';

  // If there's fallback content
  if (node.fallback && node.fallback.length > 0) {
    const fallbackCode = node.fallback.map(child =>
      transformViewNode(transformer, child, indent + 2)
    ).join(',\n');

    return `${pad}(slots?.${slotName} ? slots.${slotName}() : (\n${fallbackCode}\n${pad}))`;
  }

  // Simple slot reference
  return `${pad}(slots?.${slotName} ? slots.${slotName}() : null)`;
}

/**
 * Transform @link directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Link directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformLinkDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const path = transformExpression(transformer, node.path);

  let content;
  if (Array.isArray(node.content)) {
    content = node.content.map(c => transformViewNode(transformer, c, 0)).join(', ');
  } else if (node.content) {
    content = transformTextNode(transformer, node.content, 0).trim();
  } else {
    content = '""';
  }

  let options = '{}';
  if (node.options) {
    options = transformExpression(transformer, node.options);
  }

  return `${pad}router.link(${path}, ${content}, ${options})`;
}

/**
 * Transform @outlet directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Outlet directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformOutletDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const container = node.container ? `'${node.container}'` : "'#app'";
  return `${pad}router.outlet(${container})`;
}

/**
 * Transform @navigate directive (used in event handlers)
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Navigate directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformNavigateDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);

  // Handle @back and @forward
  if (node.action === 'back') {
    return `${pad}router.back()`;
  }
  if (node.action === 'forward') {
    return `${pad}router.forward()`;
  }

  // Regular @navigate(path)
  const path = transformExpression(transformer, node.path);
  let options = '';
  if (node.options) {
    options = ', ' + transformExpression(transformer, node.options);
  }
  return `${pad}router.navigate(${path}${options})`;
}

/**
 * Transform @a11y directive - sets ARIA attributes
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - A11y directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformA11yDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const attrs = node.attrs || {};

  // Handle @srOnly - create visually hidden element
  if (attrs.srOnly) {
    return `${pad}srOnly(/* content */)`;
  }

  // Build ARIA attributes object
  const ariaAttrs = Object.entries(attrs).map(([key, value]) => {
    // Map short names to aria- attributes (role is not prefixed)
    const ariaKey = key === 'role' ? key : (key.startsWith('aria-') ? key : `aria-${key}`);
    const valueCode = typeof value === 'string' ? `'${value}'` : transformExpression(transformer, value);
    return `'${ariaKey}': ${valueCode}`;
  }).join(', ');

  return `{ ${ariaAttrs} }`;
}

/**
 * Build ARIA attributes object from a11y directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} directive - A11y directive node
 * @returns {Object} Object with key-value pairs for ARIA attributes
 */
export function buildA11yAttributes(transformer, directive) {
  const attrs = directive.attrs || {};
  const result = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'srOnly') continue;
    // Map short names to aria- attributes (role is not prefixed)
    const ariaKey = key === 'role' ? key : (key.startsWith('aria-') ? key : `aria-${key}`);

    // Handle different value types
    if (typeof value === 'string') {
      result[ariaKey] = value;
    } else if (typeof value === 'boolean') {
      result[ariaKey] = String(value);  // Convert true/false to "true"/"false"
    } else if (typeof value === 'number') {
      result[ariaKey] = String(value);
    } else {
      result[ariaKey] = transformExpression(transformer, value);
    }
  }

  return result;
}

/**
 * Transform @live directive - creates live region
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Live directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformLiveDirective(transformer, node, indent) {
  const priority = node.priority || 'polite';
  return `'${priority}'`;
}

/**
 * Transform @focusTrap directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Focus trap directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformFocusTrapDirective(transformer, node, indent) {
  const options = node.options || {};

  if (Object.keys(options).length === 0) {
    return '{}';
  }

  const optionsCode = Object.entries(options).map(([key, value]) => {
    const valueCode = typeof value === 'boolean' ? String(value) :
                      typeof value === 'string' ? `'${value}'` :
                      transformExpression(transformer, value);
    return `${key}: ${valueCode}`;
  }).join(', ');

  return `{ ${optionsCode} }`;
}

/**
 * Parse a balanced expression starting from an opening brace
 * Handles nested braces and string literals correctly
 * @param {string} str - The string to parse
 * @param {number} start - Index of the opening brace
 * @returns {Object} { expr: string, end: number } or null if invalid
 */
function parseBalancedExpression(str, start) {
  if (str[start] !== '{') return null;

  let depth = 0;
  let inString = false;
  let stringChar = '';
  let i = start;

  while (i < str.length) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';

    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = '';
    }

    // Count braces only outside strings
    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          // Found the matching closing brace
          return {
            expr: str.slice(start + 1, i),
            end: i
          };
        }
      }
    }

    i++;
  }

  return null; // Unbalanced braces
}

/**
 * Extract dynamic attributes from a selector
 * Returns { cleanSelector, dynamicAttrs } where dynamicAttrs is an array of { name, expr }
 * Handles complex expressions including ternaries, nested braces, and string literals
 * @param {string} selector - CSS selector with potential dynamic attributes
 * @returns {Object} { cleanSelector, dynamicAttrs }
 */
/**
 * Extract all attributes (static and dynamic) from a selector string.
 * Static attributes become part of the attrs object passed to el().
 * Dynamic attributes (with {expr} values) are bound via bind().
 *
 * @param {string} selector - Element selector like "div.class[href=url][value={expr}]"
 * @returns {{cleanSelector: string, staticAttrs: Array<{name: string, value: string}>, dynamicAttrs: Array<{name: string, expr: string}>}}
 */
function extractDynamicAttributes(selector) {
  const dynamicAttrs = [];
  const staticAttrs = [];
  let cleanSelector = '';
  let i = 0;

  while (i < selector.length) {
    // Look for attribute start: [
    if (selector[i] === '[') {
      i++; // Skip [

      // Parse attribute name
      let attrName = '';
      while (i < selector.length && /[a-zA-Z0-9-_]/.test(selector[i])) {
        attrName += selector[i];
        i++;
      }

      // Skip whitespace
      while (i < selector.length && /\s/.test(selector[i])) i++;

      // Check for =
      if (i < selector.length && selector[i] === '=') {
        i++; // Skip =

        // Skip whitespace
        while (i < selector.length && /\s/.test(selector[i])) i++;

        // Determine quote character (or none)
        let quoteChar = null;
        if (selector[i] === '"' || selector[i] === "'") {
          quoteChar = selector[i];
          i++;
        }

        // Check for dynamic expression {
        if (selector[i] === '{') {
          const result = parseBalancedExpression(selector, i);
          if (result) {
            dynamicAttrs.push({ name: attrName, expr: result.expr });
            i = result.end + 1; // Skip past closing }

            // Skip optional closing quote
            if (quoteChar && selector[i] === quoteChar) i++;

            // Skip closing ]
            if (selector[i] === ']') i++;

            // Don't add this attribute to cleanSelector
            continue;
          }
        }

        // Static attribute - parse the value
        let attrValue = '';
        if (quoteChar) {
          // Quoted value - read until closing quote
          while (i < selector.length && selector[i] !== quoteChar) {
            attrValue += selector[i];
            i++;
          }
          // Skip closing quote
          if (selector[i] === quoteChar) i++;
        } else {
          // Unquoted value - read until ]
          while (i < selector.length && selector[i] !== ']') {
            attrValue += selector[i];
            i++;
          }
        }

        // Skip closing ]
        if (selector[i] === ']') i++;

        // Add to static attrs (don't put in selector)
        staticAttrs.push({ name: attrName, value: attrValue });
        continue;
      } else {
        // Boolean attribute (no value) like [disabled]
        // Skip to closing ]
        while (i < selector.length && selector[i] !== ']') i++;
        if (selector[i] === ']') i++;

        // Add as boolean attribute
        staticAttrs.push({ name: attrName, value: '' });
        continue;
      }
    } else {
      cleanSelector += selector[i];
      i++;
    }
  }

  return { cleanSelector, staticAttrs, dynamicAttrs };
}

/**
 * Transform element
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Element node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformElement(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const parts = [];

  // Check if this is a component (starts with uppercase)
  const selectorParts = node.selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  const tagName = selectorParts ? selectorParts[1] : '';
  const isComponent = tagName && /^[A-Z]/.test(tagName) &&
                      transformer.importedComponents.has(tagName);

  if (isComponent) {
    // Render as component call
    return transformComponentCall(transformer, node, indent);
  }

  // Extract all attributes from selector (static and dynamic)
  let { cleanSelector, staticAttrs, dynamicAttrs } = extractDynamicAttributes(node.selector);

  // Add scoped class to selector if CSS scoping is enabled
  let selector = cleanSelector;
  if (transformer.scopeId && selector) {
    selector = addScopeToSelector(transformer, selector);
  }

  // Extract directives by type
  const eventHandlers = node.directives.filter(d => d.type === NodeType.EventDirective);
  const modelDirectives = node.directives.filter(d => d.type === NodeType.ModelDirective);
  const a11yDirectives = node.directives.filter(d => d.type === NodeType.A11yDirective);
  const liveDirectives = node.directives.filter(d => d.type === NodeType.LiveDirective);
  const focusTrapDirectives = node.directives.filter(d => d.type === NodeType.FocusTrapDirective);

  // Check for @srOnly directive
  const srOnlyDirective = a11yDirectives.find(d => d.attrs && d.attrs.srOnly);

  // If @srOnly, wrap entire content
  if (srOnlyDirective) {
    transformer.usesA11y.srOnly = true;
    const content = [];
    for (const text of node.textContent) {
      content.push(transformTextNode(transformer, text, 0).trim());
    }
    for (const child of node.children) {
      content.push(transformViewNode(transformer, child, 0).trim());
    }
    const contentCode = content.length === 1 ? content[0] : `[${content.join(', ')}]`;
    return `${pad}srOnly(${contentCode})`;
  }

  // Track focusTrap usage
  if (focusTrapDirectives.length > 0) {
    transformer.usesA11y.trapFocus = true;
  }

  // Collect all static attributes for the el() attrs object
  const allStaticAttrs = [];

  // Add attributes extracted from selector
  for (const attr of staticAttrs) {
    // Escape single quotes in values
    const escapedValue = attr.value.replace(/'/g, "\\'");
    if (attr.value === '') {
      // Boolean attribute
      allStaticAttrs.push(`'${attr.name}': true`);
    } else {
      allStaticAttrs.push(`'${attr.name}': '${escapedValue}'`);
    }
  }

  // Process @a11y directives - add to static attrs
  for (const directive of a11yDirectives) {
    const attrs = buildA11yAttributes(transformer, directive);
    for (const [key, value] of Object.entries(attrs)) {
      const valueCode = typeof value === 'string' ? `'${value}'` : value;
      allStaticAttrs.push(`'${key}': ${valueCode}`);
    }
  }

  // Process @live directives (add aria-live and aria-atomic)
  for (const directive of liveDirectives) {
    const priority = directive.priority || 'polite';
    allStaticAttrs.push(`'aria-live': '${priority}'`);
    allStaticAttrs.push(`'aria-atomic': 'true'`);
  }

  // Start with el() call - escape single quotes in selector
  const escapedSelector = selector.replace(/'/g, "\\'");
  parts.push(`${pad}el('${escapedSelector}'`);

  // Add attributes object if we have any static attributes
  if (allStaticAttrs.length > 0) {
    parts.push(`, { ${allStaticAttrs.join(', ')} }`);
  }

  // Add text content
  if (node.textContent.length > 0) {
    for (const text of node.textContent) {
      const textCode = transformTextNode(transformer, text, 0);
      parts.push(`,\n${pad}  ${textCode.trim()}`);
    }
  }

  // Add children
  if (node.children.length > 0) {
    for (const child of node.children) {
      const childCode = transformViewNode(transformer, child, indent + 2);
      parts.push(`,\n${childCode}`);
    }
  }

  parts.push(')');

  // Chain event handlers with modifiers support
  let result = parts.join('');
  for (const handler of eventHandlers) {
    const handlerCode = transformExpression(transformer, handler.handler);
    const modifiers = handler.modifiers || [];

    if (modifiers.length === 0) {
      // Always pass event parameter since handlers commonly use event.target, etc.
      result = `on(${result}, '${handler.event}', (event) => { ${handlerCode}; })`;
    } else {
      const modifiedHandler = generateModifiedHandler(handler.event, handlerCode, modifiers);
      result = `on(${result}, '${handler.event}', ${modifiedHandler})`;
    }
  }

  // Chain model directives for two-way binding
  for (const directive of modelDirectives) {
    const binding = transformExpression(transformer, directive.binding);
    const modifiers = directive.modifiers || [];

    // Build options from modifiers
    const options = [];
    if (modifiers.includes('lazy')) options.push('lazy: true');
    if (modifiers.includes('trim')) options.push('trim: true');
    if (modifiers.includes('number')) options.push('number: true');

    if (options.length > 0) {
      result = `model(${result}, ${binding}, { ${options.join(', ')} })`;
    } else {
      result = `model(${result}, ${binding})`;
    }
  }

  // Chain focus trap if present
  for (const directive of focusTrapDirectives) {
    const optionsCode = transformFocusTrapDirective(transformer, directive, 0);
    result = `trapFocus(${result}, ${optionsCode})`;
  }

  // Chain dynamic attribute bindings (e.g., [value={searchQuery}])
  for (const attr of dynamicAttrs) {
    const exprCode = transformExpressionString(transformer, attr.expr);
    result = `bind(${result}, '${attr.name}', () => ${exprCode})`;
  }

  return result;
}

/**
 * Add scope class to a CSS selector
 * @param {Object} transformer - Transformer instance
 * @param {string} selector - CSS selector
 * @returns {string} Scoped selector
 */
export function addScopeToSelector(transformer, selector) {
  // If selector has classes, add scope class after the first class
  // Otherwise add it at the end
  if (selector.includes('.')) {
    // Add scope after tag name and before first class
    return selector.replace(/^([a-zA-Z0-9-]*)/, `$1.${transformer.scopeId}`);
  }
  // Just a tag name, add scope class
  return `${selector}.${transformer.scopeId}`;
}

/**
 * Transform a component call (imported component)
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Element node (component)
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformComponentCall(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const selectorParts = node.selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  const componentName = selectorParts[1];

  // Extract slots from children
  const slots = {};

  // Children become the default slot
  if (node.children.length > 0 || node.textContent.length > 0) {
    const slotContent = [];
    for (const text of node.textContent) {
      slotContent.push(transformTextNode(transformer, text, 0).trim());
    }
    for (const child of node.children) {
      slotContent.push(transformViewNode(transformer, child, 0).trim());
    }
    slots['default'] = slotContent;
  }

  // Build component call
  let code = `${pad}${componentName}.render({ `;

  const renderArgs = [];

  // Add props if any
  if (node.props && node.props.length > 0) {
    const propsCode = node.props.map(prop => {
      const valueCode = transformExpression(transformer, prop.value);
      return `${prop.name}: ${valueCode}`;
    }).join(', ');
    renderArgs.push(`props: { ${propsCode} }`);
  }

  // Add slots if any
  if (Object.keys(slots).length > 0) {
    const slotCode = Object.entries(slots).map(([name, content]) => {
      return `${name}: () => ${content.length === 1 ? content[0] : `[${content.join(', ')}]`}`;
    }).join(', ');
    renderArgs.push(`slots: { ${slotCode} }`);
  }

  code += renderArgs.join(', ');
  code += ' })';
  return code;
}

/**
 * Transform text node
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Text node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
/**
 * Escape a string for use in a template literal
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeTemplateString(str) {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/\$/g, '\\$');  // Escape dollar signs to prevent ${} interpretation
}

export function transformTextNode(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const parts = node.parts;

  if (parts.length === 1 && typeof parts[0] === 'string') {
    // Simple static text
    return `${pad}${JSON.stringify(parts[0])}`;
  }

  // Has interpolations - use text() with a function
  const textParts = parts.map(part => {
    if (typeof part === 'string') {
      // Escape for template literal (not JSON.stringify which adds quotes)
      return escapeTemplateString(part);
    }
    // Interpolation
    const expr = transformExpressionString(transformer, part.expression);
    return `\${${expr}}`;
  });

  return `${pad}text(() => \`${textParts.join('')}\`)`;
}

/**
 * Transform @if directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - If directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformIfDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);

  // Helper to build nested when() calls for else-if chains
  function buildConditionChain(condition, consequent, elseIfBranches, alternate, depth = 0) {
    const innerPad = ' '.repeat(indent + depth * 2);
    const conditionCode = transformExpression(transformer, condition);

    // Wrap multiple children in array, single child returns directly
    const consequentItems = consequent.map(c =>
      transformViewNode(transformer, c, indent + depth * 2 + 4)
    );
    const consequentCode = consequentItems.length === 1
      ? consequentItems[0]
      : `[\n${consequentItems.join(',\n')}\n${innerPad}    ]`;

    let code = `${innerPad}when(\n`;
    code += `${innerPad}  () => ${conditionCode},\n`;
    code += `${innerPad}  () => ${consequentCode}`;

    // Handle else-if branches
    if (elseIfBranches && elseIfBranches.length > 0) {
      const nextBranch = elseIfBranches[0];
      const remainingBranches = elseIfBranches.slice(1);

      code += `,\n${innerPad}  () => (\n`;
      code += buildConditionChain(
        nextBranch.condition,
        nextBranch.consequent,
        remainingBranches,
        alternate,
        depth + 2
      );
      code += `\n${innerPad}  )`;
    } else if (alternate) {
      // Final else branch - wrap multiple children in array
      const alternateItems = alternate.map(c =>
        transformViewNode(transformer, c, indent + depth * 2 + 4)
      );
      const alternateCode = alternateItems.length === 1
        ? alternateItems[0]
        : `[\n${alternateItems.join(',\n')}\n${innerPad}    ]`;
      code += `,\n${innerPad}  () => ${alternateCode}`;
    }

    code += `\n${innerPad})`;
    return code;
  }

  return buildConditionChain(
    node.condition,
    node.consequent,
    node.elseIfBranches || [],
    node.alternate
  );
}

/**
 * Transform @each directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Each directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformEachDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const iterable = transformExpression(transformer, node.iterable);

  const template = node.template.map(t =>
    transformViewNode(transformer, t, indent + 2)
  ).join(',\n');

  // Build list() call with optional key function
  let code = `${pad}list(\n` +
             `${pad}  () => ${iterable},\n` +
             `${pad}  (${node.itemName}, _index) => (\n${template}\n${pad}  )`;

  // Add key function if provided
  if (node.keyExpr) {
    const keyExprCode = transformExpression(transformer, node.keyExpr);
    code += `,\n${pad}  (${node.itemName}) => ${keyExprCode}`;
  }

  code += `\n${pad})`;
  return code;
}

/**
 * Transform event directive
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Event directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformEventDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const handler = transformExpression(transformer, node.handler);

  if (node.children && node.children.length > 0) {
    const children = node.children.map(c =>
      transformViewNode(transformer, c, indent + 2)
    ).join(',\n');

    return `${pad}on(el('div',\n${children}\n${pad}), '${node.event}', () => { ${handler}; })`;
  }

  return `/* event: ${node.event} -> ${handler} */`;
}

/**
 * Transform @model directive for two-way binding
 * @param {Object} transformer - Transformer instance
 * @param {Object} node - Model directive node
 * @param {number} indent - Indentation level
 * @returns {string} JavaScript code
 */
export function transformModelDirective(transformer, node, indent) {
  const pad = ' '.repeat(indent);
  const binding = transformExpression(transformer, node.binding);
  const modifiers = node.modifiers || [];

  // Build options from modifiers
  const options = [];
  if (modifiers.includes('lazy')) options.push('lazy: true');
  if (modifiers.includes('trim')) options.push('trim: true');
  if (modifiers.includes('number')) options.push('number: true');

  if (options.length > 0) {
    return `${pad}/* model: ${binding} { ${options.join(', ')} } */`;
  }

  return `${pad}/* model: ${binding} */`;
}

/**
 * Generate event handler code with modifiers applied
 * @param {string} event - Event name
 * @param {string} handlerCode - Handler expression code
 * @param {string[]} modifiers - Array of modifier names
 * @returns {string} JavaScript handler code
 */
function generateModifiedHandler(event, handlerCode, modifiers) {
  // Key modifiers map
  const keyMap = {
    enter: 'Enter', tab: 'Tab', delete: 'Delete', esc: 'Escape', escape: 'Escape',
    space: ' ', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'
  };

  // System key modifiers
  const systemModifiers = ['ctrl', 'alt', 'shift', 'meta'];

  // Build handler code with checks
  const checks = [];
  let hasEventParam = false;

  for (const mod of modifiers) {
    if (mod === 'prevent') {
      checks.push('event.preventDefault();');
      hasEventParam = true;
    } else if (mod === 'stop') {
      checks.push('event.stopPropagation();');
      hasEventParam = true;
    } else if (mod === 'self') {
      checks.push('if (event.target !== event.currentTarget) return;');
      hasEventParam = true;
    } else if (keyMap[mod]) {
      checks.push(`if (event.key !== '${keyMap[mod]}') return;`);
      hasEventParam = true;
    } else if (systemModifiers.includes(mod)) {
      checks.push(`if (!event.${mod}Key) return;`);
      hasEventParam = true;
    }
  }

  // Build options for addEventListener
  const options = [];
  if (modifiers.includes('capture')) options.push('capture: true');
  if (modifiers.includes('once')) options.push('once: true');
  if (modifiers.includes('passive')) options.push('passive: true');

  const checksCode = checks.join(' ');
  // Always pass event parameter since handler code commonly uses event.target, etc.
  const handler = `(event) => { ${checksCode} ${handlerCode}; }`;

  if (options.length > 0) {
    return `${handler}, { ${options.join(', ')} }`;
  }

  return handler;
}
