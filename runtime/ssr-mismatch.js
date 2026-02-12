/**
 * Pulse SSR Mismatch Detection - Dev-mode hydration mismatch detection
 *
 * Provides detailed DOM diffing, actionable suggestions, and console output
 * when server-rendered HTML differs from client-rendered DOM.
 * All detection code is stripped in production (zero overhead).
 *
 * @module pulse-js-framework/runtime/ssr-mismatch
 */

// ============================================================================
// Mismatch Types
// ============================================================================

/**
 * Types of hydration mismatches that can be detected.
 */
export const MismatchType = {
  TAG: 'tag',
  TEXT: 'text',
  ATTRIBUTE: 'attribute',
  CHILDREN: 'children',
  EXTRA_NODE: 'extra',
  MISSING_NODE: 'missing'
};

// ============================================================================
// DOM Diff
// ============================================================================

/**
 * @typedef {Object} MismatchReport
 * @property {string} type - MismatchType value
 * @property {string} path - CSS-like path to the mismatched node
 * @property {string} expected - What the server rendered
 * @property {string} actual - What the client rendered
 * @property {string} suggestion - Actionable suggestion to fix the mismatch
 */

/**
 * Compare a server-rendered DOM node with a client-rendered node.
 * Returns an array of mismatch reports.
 *
 * @param {Node} serverNode - Node from server-rendered HTML
 * @param {Node} clientNode - Node from client render
 * @param {string} [path=''] - Current DOM path (for reporting)
 * @returns {MismatchReport[]}
 */
export function diffNodes(serverNode, clientNode, path = '') {
  const reports = [];

  if (!serverNode && !clientNode) return reports;

  if (!serverNode && clientNode) {
    reports.push({
      type: MismatchType.EXTRA_NODE,
      path: path || '(root)',
      expected: '(nothing)',
      actual: describeNode(clientNode),
      suggestion: getSuggestion(MismatchType.EXTRA_NODE, { clientNode })
    });
    return reports;
  }

  if (serverNode && !clientNode) {
    reports.push({
      type: MismatchType.MISSING_NODE,
      path: path || '(root)',
      expected: describeNode(serverNode),
      actual: '(nothing)',
      suggestion: getSuggestion(MismatchType.MISSING_NODE, { serverNode })
    });
    return reports;
  }

  // Different node types
  if (serverNode.nodeType !== clientNode.nodeType) {
    reports.push({
      type: MismatchType.TAG,
      path: path || '(root)',
      expected: describeNode(serverNode),
      actual: describeNode(clientNode),
      suggestion: getSuggestion(MismatchType.TAG, { serverNode, clientNode })
    });
    return reports;
  }

  // Text nodes
  if (serverNode.nodeType === 3) {
    const serverText = (serverNode.textContent || '').trim();
    const clientText = (clientNode.textContent || '').trim();
    if (serverText !== clientText) {
      reports.push({
        type: MismatchType.TEXT,
        path: path || '(text)',
        expected: truncate(serverText, 80),
        actual: truncate(clientText, 80),
        suggestion: getSuggestion(MismatchType.TEXT, { serverText, clientText })
      });
    }
    return reports;
  }

  // Element nodes
  if (serverNode.nodeType === 1) {
    const serverTag = getTag(serverNode);
    const clientTag = getTag(clientNode);
    const currentPath = path ? `${path} > ${serverTag}` : serverTag;

    // Different tags
    if (serverTag !== clientTag) {
      reports.push({
        type: MismatchType.TAG,
        path: currentPath,
        expected: `<${serverTag}>`,
        actual: `<${clientTag}>`,
        suggestion: getSuggestion(MismatchType.TAG, { serverTag, clientTag })
      });
      return reports;
    }

    // Compare attributes
    const attrReports = diffAttributes(serverNode, clientNode, currentPath);
    reports.push(...attrReports);

    // Compare children
    const serverChildren = getElementChildren(serverNode);
    const clientChildren = getElementChildren(clientNode);

    if (serverChildren.length !== clientChildren.length) {
      reports.push({
        type: MismatchType.CHILDREN,
        path: currentPath,
        expected: `${serverChildren.length} children`,
        actual: `${clientChildren.length} children`,
        suggestion: getSuggestion(MismatchType.CHILDREN, {
          serverCount: serverChildren.length,
          clientCount: clientChildren.length,
          tag: serverTag
        })
      });
    }

    // Recursively diff children (up to the shorter list length)
    const maxChildren = Math.min(serverChildren.length, clientChildren.length);
    for (let i = 0; i < maxChildren; i++) {
      const childPath = `${currentPath}:nth-child(${i + 1})`;
      reports.push(...diffNodes(serverChildren[i], clientChildren[i], childPath));
    }
  }

  return reports;
}

/**
 * Compare attributes of two element nodes.
 * @param {Element} serverEl - Server element
 * @param {Element} clientEl - Client element
 * @param {string} path - Current DOM path
 * @returns {MismatchReport[]}
 */
function diffAttributes(serverEl, clientEl, path) {
  const reports = [];
  const serverAttrs = getAttributeMap(serverEl);
  const clientAttrs = getAttributeMap(clientEl);

  // Check server attributes against client
  for (const [name, serverValue] of serverAttrs) {
    const clientValue = clientAttrs.get(name);
    if (clientValue === undefined) {
      reports.push({
        type: MismatchType.ATTRIBUTE,
        path,
        expected: `${name}="${serverValue}"`,
        actual: `(attribute "${name}" missing)`,
        suggestion: `Attribute "${name}" was rendered on the server but missing on the client. Check if it depends on browser APIs.`
      });
    } else if (serverValue !== clientValue) {
      reports.push({
        type: MismatchType.ATTRIBUTE,
        path,
        expected: `${name}="${truncate(serverValue, 60)}"`,
        actual: `${name}="${truncate(clientValue, 60)}"`,
        suggestion: `Attribute "${name}" differs between server and client. Ensure deterministic rendering.`
      });
    }
  }

  // Check for extra client attributes
  for (const [name] of clientAttrs) {
    if (!serverAttrs.has(name)) {
      reports.push({
        type: MismatchType.ATTRIBUTE,
        path,
        expected: `(no "${name}" attribute)`,
        actual: `${name}="${truncate(clientAttrs.get(name), 60)}"`,
        suggestion: `Attribute "${name}" exists on client but not server. If it depends on browser state, wrap in ClientOnly().`
      });
    }
  }

  return reports;
}

// ============================================================================
// Suggestions
// ============================================================================

/**
 * Generate actionable suggestion for a mismatch.
 * @param {string} type - MismatchType
 * @param {Object} context - Mismatch context
 * @returns {string}
 */
export function getSuggestion(type, context = {}) {
  switch (type) {
    case MismatchType.TAG: {
      const { serverTag, clientTag, serverNode, clientNode } = context;
      const st = serverTag || getTag(serverNode);
      const ct = clientTag || getTag(clientNode);
      return `Server rendered <${st}> but client expects <${ct}>. Ensure consistent component output between server and client.`;
    }

    case MismatchType.TEXT: {
      const { serverText = '', clientText = '' } = context;
      // Check for common causes of text mismatches
      if (containsTimestamp(serverText) || containsTimestamp(clientText)) {
        return 'Text content differs and appears to contain a timestamp. Use a stable value during SSR or wrap in ClientOnly().';
      }
      return 'Text content differs between server and client. If using Date.now(), Math.random(), or browser-only values, wrap in ClientOnly() or provide a stable SSR value.';
    }

    case MismatchType.CHILDREN: {
      const { serverCount = 0, clientCount = 0 } = context;
      if (clientCount > serverCount) {
        return `Client rendered ${clientCount - serverCount} extra children. This may indicate a @client component that should use ClientOnly().`;
      }
      return `Server rendered ${serverCount - clientCount} extra children. This may indicate a @server component missing on the client.`;
    }

    case MismatchType.EXTRA_NODE:
      return 'Client rendered an extra node not present in server HTML. If this component uses browser APIs, wrap it in ClientOnly().';

    case MismatchType.MISSING_NODE:
      return 'Server rendered a node that the client did not produce. If this is server-only content, use ServerOnly() or @server directive.';

    case MismatchType.ATTRIBUTE:
      return 'Attribute value differs between server and client rendering.';

    default:
      return 'Hydration mismatch detected. Ensure server and client render identical output.';
  }
}

// ============================================================================
// Console Output
// ============================================================================

/**
 * Log mismatch reports to the console with clear formatting.
 * @param {MismatchReport[]} reports - Array of mismatch reports
 */
export function logMismatches(reports) {
  if (!reports || reports.length === 0) return;

  console.warn(
    `[Pulse Hydration] ${reports.length} mismatch${reports.length > 1 ? 'es' : ''} detected:`
  );

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i];
    console.warn(
      `\n  ${i + 1}. [${r.type.toUpperCase()}] at ${r.path}\n` +
      `     Server: ${r.expected}\n` +
      `     Client: ${r.actual}\n` +
      `     → ${r.suggestion}`
    );
  }

  console.warn(
    '\n  Tip: Hydration mismatches can cause UI bugs. ' +
    'See https://pulse-js.fr/ssr/hydration-mismatch for debugging help.'
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Describe a DOM node for reporting.
 * @param {Node} node
 * @returns {string}
 */
function describeNode(node) {
  if (!node) return '(null)';
  if (node.nodeType === 3) return `text "${truncate(node.textContent || '', 40)}"`;
  if (node.nodeType === 8) return `comment "${truncate(node.data || '', 40)}"`;
  if (node.nodeType === 1) {
    const tag = getTag(node);
    const id = node.id ? `#${node.id}` : '';
    const cls = node.className ? `.${String(node.className).split(' ').join('.')}` : '';
    return `<${tag}${id}${cls}>`;
  }
  return `(nodeType ${node.nodeType})`;
}

/**
 * Get tag name (lowercase).
 * @param {Node} node
 * @returns {string}
 */
function getTag(node) {
  return (node?.tagName || node?.nodeName || 'unknown').toLowerCase();
}

/**
 * Get attribute map from an element.
 * @param {Element} el
 * @returns {Map<string, string>}
 */
function getAttributeMap(el) {
  const map = new Map();
  if (!el) return map;

  // Handle both real DOM and MockElement
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      map.set(attr.name, attr.value);
    }
  } else if (el._attributes) {
    for (const [name, value] of el._attributes) {
      map.set(name, String(value));
    }
  }

  // Include id and className if present
  if (el.id && !map.has('id')) map.set('id', el.id);
  if (el.className && !map.has('class')) map.set('class', String(el.className));

  return map;
}

/**
 * Get child nodes of an element, skipping comments.
 * @param {Node} node
 * @returns {Node[]}
 */
function getElementChildren(node) {
  if (!node || !node.childNodes) return [];
  return Array.from(node.childNodes).filter(n => n.nodeType !== 8);
}

/**
 * Truncate string for display.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Check if a string contains a timestamp-like pattern.
 * @param {string} str
 * @returns {boolean}
 */
function containsTimestamp(str) {
  // ISO date, unix timestamp, or time-like patterns
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) ||
         /^\d{10,13}$/.test(str) ||
         /\d{1,2}:\d{2}:\d{2}/.test(str);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  MismatchType,
  diffNodes,
  getSuggestion,
  logMismatches
};
