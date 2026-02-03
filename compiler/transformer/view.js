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

  // Add scoped class to selector if CSS scoping is enabled
  let selector = node.selector;
  if (transformer.scopeId && selector) {
    selector = addScopeToSelector(transformer, selector);
  }

  // Extract directives by type
  const eventHandlers = node.directives.filter(d => d.type === NodeType.EventDirective);
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

  // Build ARIA attributes from directives
  const ariaAttrs = [];

  // Process @a11y directives
  for (const directive of a11yDirectives) {
    const attrs = buildA11yAttributes(transformer, directive);
    for (const [key, value] of Object.entries(attrs)) {
      const valueCode = typeof value === 'string' ? `'${value}'` : value;
      ariaAttrs.push(`'${key}': ${valueCode}`);
    }
  }

  // Process @live directives (add aria-live and aria-atomic)
  for (const directive of liveDirectives) {
    const priority = directive.priority || 'polite';
    ariaAttrs.push(`'aria-live': '${priority}'`);
    ariaAttrs.push(`'aria-atomic': 'true'`);
  }

  // Build selector with inline ARIA attributes
  let enhancedSelector = selector;
  if (ariaAttrs.length > 0) {
    // Convert ARIA attrs to selector attribute syntax where possible
    // For dynamic values, we'll need to use setAriaAttributes
    const staticAttrs = [];
    const dynamicAttrs = [];

    for (const attr of ariaAttrs) {
      const match = attr.match(/^'([^']+)':\s*'([^']+)'$/);
      if (match) {
        // Static attribute - can embed in selector
        staticAttrs.push(`[${match[1]}=${match[2]}]`);
      } else {
        dynamicAttrs.push(attr);
      }
    }

    // Add static ARIA attributes to selector
    enhancedSelector = selector + staticAttrs.join('');
  }

  // Start with el() call
  parts.push(`${pad}el('${enhancedSelector}'`);

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

  // Chain event handlers
  let result = parts.join('');
  for (const handler of eventHandlers) {
    const handlerCode = transformExpression(transformer, handler.handler);
    result = `on(${result}, '${handler.event}', () => { ${handlerCode}; })`;
  }

  // Chain focus trap if present
  for (const directive of focusTrapDirectives) {
    const optionsCode = transformFocusTrapDirective(transformer, directive, 0);
    result = `trapFocus(${result}, ${optionsCode})`;
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
      return JSON.stringify(part);
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
  const condition = transformExpression(transformer, node.condition);

  const consequent = node.consequent.map(c =>
    transformViewNode(transformer, c, indent + 2)
  ).join(',\n');

  let code = `${pad}when(\n`;
  code += `${pad}  () => ${condition},\n`;
  code += `${pad}  () => (\n${consequent}\n${pad}  )`;

  if (node.alternate) {
    const alternate = node.alternate.map(c =>
      transformViewNode(transformer, c, indent + 2)
    ).join(',\n');
    code += `,\n${pad}  () => (\n${alternate}\n${pad}  )`;
  }

  code += `\n${pad})`;
  return code;
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

  return `${pad}list(\n` +
         `${pad}  () => ${iterable},\n` +
         `${pad}  (${node.itemName}, _index) => (\n${template}\n${pad}  )\n` +
         `${pad})`;
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
