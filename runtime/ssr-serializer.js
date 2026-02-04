/**
 * Pulse SSR Serializer - HTML serialization for MockNode trees
 *
 * Converts MockDOMAdapter node trees into HTML strings for server-side rendering.
 * Handles all node types: elements, text, comments, and fragments.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Void elements that are self-closing in HTML (no closing tag).
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Boolean attributes that are present or absent (no value needed).
 */
const BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'readonly', 'required', 'autofocus',
  'multiple', 'selected', 'hidden', 'open', 'inert', 'novalidate',
  'async', 'defer', 'formnovalidate', 'allowfullscreen', 'autoplay',
  'controls', 'loop', 'muted', 'playsinline', 'reversed', 'ismap'
]);

/**
 * Attributes that should be skipped during serialization.
 */
const SKIP_ATTRS = new Set(['class', 'id', 'style']);

// ============================================================================
// HTML Escaping
// ============================================================================

/**
 * Escape HTML special characters in text content.
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML text content
 */
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape special characters for use in HTML attributes.
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for attribute values
 */
export function escapeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================================================
// Style Serialization
// ============================================================================

/**
 * Convert camelCase to kebab-case for CSS properties.
 * @param {string} str - camelCase string
 * @returns {string} kebab-case string
 */
function camelToKebab(str) {
  return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

/**
 * Serialize a style object to a CSS string.
 * @param {Object} styleObj - Style object with camelCase properties
 * @returns {string} CSS string like "color: red; font-size: 16px"
 */
function serializeStyle(styleObj) {
  if (!styleObj || typeof styleObj !== 'object') return '';

  const styles = [];
  for (const [key, value] of Object.entries(styleObj)) {
    if (value != null && value !== '') {
      styles.push(`${camelToKebab(key)}: ${value}`);
    }
  }
  return styles.join('; ');
}

// ============================================================================
// Attribute Serialization
// ============================================================================

/**
 * Serialize element attributes to an HTML attribute string.
 * @param {MockElement} element - Element to serialize attributes from
 * @returns {string} Attribute string like ' id="foo" class="bar"'
 */
function serializeAttributes(element) {
  const parts = [];

  // ID attribute
  if (element.id) {
    parts.push(`id="${escapeAttr(element.id)}"`);
  }

  // Class attribute
  if (element.className) {
    parts.push(`class="${escapeAttr(element.className)}"`);
  }

  // Other attributes from _attributes Map
  if (element._attributes) {
    for (const [name, value] of element._attributes) {
      // Skip already handled attributes
      if (SKIP_ATTRS.has(name)) continue;

      if (BOOLEAN_ATTRS.has(name)) {
        // Boolean attributes: present if truthy
        if (value === 'true' || value === true || value === name || value === '') {
          parts.push(name);
        }
      } else {
        // Regular attributes
        parts.push(`${name}="${escapeAttr(value)}"`);
      }
    }
  }

  // Style attribute
  const styleStr = serializeStyle(element._style || element.style);
  if (styleStr) {
    parts.push(`style="${escapeAttr(styleStr)}"`);
  }

  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

// ============================================================================
// Node Serialization
// ============================================================================

/**
 * Serialize a MockNode tree to an HTML string.
 *
 * Supports all node types:
 * - Element nodes (nodeType 1)
 * - Text nodes (nodeType 3)
 * - Comment nodes (nodeType 8)
 * - Document fragments (nodeType 11)
 *
 * @param {MockNode} node - Root node to serialize
 * @param {Object} [options] - Serialization options
 * @param {boolean} [options.pretty=false] - Pretty print with indentation
 * @param {number} [options.indent=0] - Initial indentation level
 * @param {string} [options.indentStr='  '] - Indentation string
 * @returns {string} HTML string
 *
 * @example
 * const adapter = new MockDOMAdapter();
 * const div = adapter.createElement('div');
 * div.id = 'app';
 * div.className = 'container';
 * adapter.appendChild(div, adapter.createTextNode('Hello'));
 *
 * serializeToHTML(div);
 * // '<div id="app" class="container">Hello</div>'
 */
export function serializeToHTML(node, options = {}) {
  if (!node) return '';

  const { pretty = false, indent = 0, indentStr = '  ' } = options;
  const prefix = pretty ? indentStr.repeat(indent) : '';
  const newline = pretty ? '\n' : '';

  // Text node (nodeType 3)
  if (node.nodeType === 3) {
    const text = node.textContent ?? node.data ?? '';
    return escapeHTML(text);
  }

  // Comment node (nodeType 8)
  if (node.nodeType === 8) {
    const data = node.data ?? node.textContent ?? '';
    return `${prefix}<!--${data}-->`;
  }

  // Document fragment (nodeType 11)
  if (node.nodeType === 11) {
    return (node.childNodes || [])
      .map(child => serializeToHTML(child, { ...options, indent }))
      .join(newline);
  }

  // Element node (nodeType 1)
  if (node.nodeType === 1) {
    const tag = (node.tagName || 'div').toLowerCase();
    const attrs = serializeAttributes(node);

    // Void elements (self-closing)
    if (VOID_ELEMENTS.has(tag)) {
      return `${prefix}<${tag}${attrs}>`;
    }

    // Elements with children
    const children = node.childNodes || [];
    let childrenHTML = '';

    if (children.length > 0) {
      if (pretty) {
        childrenHTML = newline +
          children
            .map(child => serializeToHTML(child, { ...options, indent: indent + 1 }))
            .join(newline) +
          newline + prefix;
      } else {
        childrenHTML = children
          .map(child => serializeToHTML(child, options))
          .join('');
      }
    }

    return `${prefix}<${tag}${attrs}>${childrenHTML}</${tag}>`;
  }

  // Unknown node type
  return '';
}

/**
 * Serialize only the children of a node (excludes the node itself).
 * Useful for serializing the body content without the body tag.
 *
 * @param {MockNode} node - Node whose children to serialize
 * @param {Object} [options] - Serialization options
 * @returns {string} HTML string of children
 */
export function serializeChildren(node, options = {}) {
  if (!node || !node.childNodes) return '';

  const { pretty = false } = options;
  const newline = pretty ? '\n' : '';

  return node.childNodes
    .map(child => serializeToHTML(child, options))
    .join(newline);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  serializeToHTML,
  serializeChildren,
  escapeHTML,
  escapeAttr,
  VOID_ELEMENTS,
  BOOLEAN_ATTRS
};
