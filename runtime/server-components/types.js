/**
 * Pulse Server Components (PSC) - Type Definitions
 *
 * Type definitions for the PSC Wire Format, which is used to serialize
 * Server Component trees with Client Component boundaries for transmission
 * from server to client.
 *
 * @module pulse-js-framework/runtime/server-components/types
 */

// ============================================================================
// PSC Wire Format Types
// ============================================================================

/**
 * Complete PSC payload sent from server to client.
 * Contains the component tree, client component manifest, and optional state.
 *
 * @typedef {Object} PSCPayload
 * @property {string} version - PSC format version (e.g., "1.0")
 * @property {PSCNode} root - Root node of the component tree
 * @property {Record<string, ClientManifestEntry>} clientManifest - Mapping of component IDs to chunk URLs
 * @property {Record<string, any>} [state] - Optional serialized server state
 *
 * @example
 * {
 *   version: "1.0",
 *   root: {
 *     type: 'element',
 *     tag: 'div',
 *     props: { class: 'app' },
 *     children: [
 *       { type: 'text', value: 'Hello' },
 *       { type: 'client', id: 'Button', props: { text: 'Click' } }
 *     ]
 *   },
 *   clientManifest: {
 *     Button: { id: 'Button', chunk: '/assets/Button.js', exports: ['default'] }
 *   },
 *   state: { user: { id: 1, name: 'Alice' } }
 * }
 */

/**
 * PSC Node - union type representing any node in the component tree.
 *
 * @typedef {PSCElement | PSCText | PSCClientBoundary | PSCFragment | PSCComment} PSCNode
 */

/**
 * PSC Element Node - represents a DOM element (e.g., <div>, <span>).
 *
 * @typedef {Object} PSCElement
 * @property {'element'} type - Node type discriminator
 * @property {string} tag - HTML tag name (e.g., 'div', 'span', 'button')
 * @property {Record<string, any>} props - Element attributes and properties
 * @property {PSCNode[]} children - Child nodes
 *
 * @example
 * {
 *   type: 'element',
 *   tag: 'div',
 *   props: { class: 'container', 'data-id': '123' },
 *   children: [
 *     { type: 'text', value: 'Content' }
 *   ]
 * }
 */

/**
 * PSC Text Node - represents a text node.
 *
 * @typedef {Object} PSCText
 * @property {'text'} type - Node type discriminator
 * @property {string} value - Text content
 *
 * @example
 * { type: 'text', value: 'Hello, world!' }
 */

/**
 * PSC Client Boundary - represents a Client Component boundary.
 * This is a placeholder for a Client Component that will be lazy-loaded
 * and hydrated on the client side.
 *
 * @typedef {Object} PSCClientBoundary
 * @property {'client'} type - Node type discriminator
 * @property {string} id - Component ID matching clientManifest key
 * @property {Record<string, any>} props - Serialized props for the Client Component
 * @property {PSCNode} [fallback] - Optional fallback UI while loading
 *
 * @example
 * {
 *   type: 'client',
 *   id: 'AddToCartButton',
 *   props: { productId: 123, productName: 'Widget' },
 *   fallback: {
 *     type: 'element',
 *     tag: 'div',
 *     props: { class: 'skeleton-button' },
 *     children: []
 *   }
 * }
 */

/**
 * PSC Fragment - represents a fragment (multiple nodes without a wrapper).
 *
 * @typedef {Object} PSCFragment
 * @property {'fragment'} type - Node type discriminator
 * @property {PSCNode[]} children - Child nodes
 *
 * @example
 * {
 *   type: 'fragment',
 *   children: [
 *     { type: 'text', value: 'First' },
 *     { type: 'text', value: 'Second' }
 *   ]
 * }
 */

/**
 * PSC Comment Node - represents an HTML comment.
 *
 * @typedef {Object} PSCComment
 * @property {'comment'} type - Node type discriminator
 * @property {string} value - Comment text
 *
 * @example
 * { type: 'comment', value: 'client-only' }
 */

// ============================================================================
// Client Manifest Types
// ============================================================================

/**
 * Client Manifest Entry - metadata for a Client Component chunk.
 *
 * @typedef {Object} ClientManifestEntry
 * @property {string} id - Component ID (unique identifier)
 * @property {string} chunk - URL path to the JS chunk (e.g., '/assets/Button.a1b2c3.js')
 * @property {string[]} exports - Exported names from the chunk (e.g., ['default', 'Button'])
 *
 * @example
 * {
 *   id: 'ClientButton',
 *   chunk: '/assets/ClientButton.a1b2c3.js',
 *   exports: ['default']
 * }
 */

// ============================================================================
// Node Type Constants
// ============================================================================

/**
 * Node type constants for PSC Wire Format.
 * Use these instead of string literals for type safety.
 */
export const PSCNodeType = {
  ELEMENT: 'element',
  TEXT: 'text',
  CLIENT: 'client',
  FRAGMENT: 'fragment',
  COMMENT: 'comment'
};

/**
 * PSC format version.
 */
export const PSC_VERSION = '1.0';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a PSC node is an element node.
 *
 * @param {PSCNode} node - Node to check
 * @returns {node is PSCElement}
 *
 * @example
 * if (isPSCElement(node)) {
 *   console.log('Tag:', node.tag);
 * }
 */
export function isPSCElement(node) {
  return node && node.type === PSCNodeType.ELEMENT;
}

/**
 * Check if a PSC node is a text node.
 *
 * @param {PSCNode} node - Node to check
 * @returns {node is PSCText}
 */
export function isPSCText(node) {
  return node && node.type === PSCNodeType.TEXT;
}

/**
 * Check if a PSC node is a client boundary.
 *
 * @param {PSCNode} node - Node to check
 * @returns {node is PSCClientBoundary}
 */
export function isPSCClientBoundary(node) {
  return node && node.type === PSCNodeType.CLIENT;
}

/**
 * Check if a PSC node is a fragment.
 *
 * @param {PSCNode} node - Node to check
 * @returns {node is PSCFragment}
 */
export function isPSCFragment(node) {
  return node && node.type === PSCNodeType.FRAGMENT;
}

/**
 * Check if a PSC node is a comment.
 *
 * @param {PSCNode} node - Node to check
 * @returns {node is PSCComment}
 */
export function isPSCComment(node) {
  return node && node.type === PSCNodeType.COMMENT;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a PSC payload structure.
 *
 * @param {any} payload - Payload to validate
 * @returns {boolean} True if valid PSC payload
 * @throws {Error} If validation fails with detailed error message
 *
 * @example
 * try {
 *   validatePSCPayload(payload);
 *   // Payload is valid
 * } catch (err) {
 *   console.error('Invalid PSC payload:', err.message);
 * }
 */
export function validatePSCPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('PSC payload must be an object');
  }

  if (!payload.version || typeof payload.version !== 'string') {
    throw new Error('PSC payload must have a version string');
  }

  if (!payload.root) {
    throw new Error('PSC payload must have a root node');
  }

  if (!payload.clientManifest || typeof payload.clientManifest !== 'object') {
    throw new Error('PSC payload must have a clientManifest object');
  }

  // Validate root node structure
  validatePSCNode(payload.root);

  // Validate client manifest entries
  for (const [key, entry] of Object.entries(payload.clientManifest)) {
    if (!entry.id || typeof entry.id !== 'string') {
      throw new Error(`Client manifest entry '${key}' missing id`);
    }
    if (!entry.chunk || typeof entry.chunk !== 'string') {
      throw new Error(`Client manifest entry '${key}' missing chunk URL`);
    }
    if (!Array.isArray(entry.exports)) {
      throw new Error(`Client manifest entry '${key}' missing exports array`);
    }
  }

  return true;
}

/**
 * Validate a PSC node structure (recursive).
 *
 * @param {PSCNode} node - Node to validate
 * @param {number} [depth=0] - Current recursion depth (for cycle detection)
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validatePSCNode(node, depth = 0) {
  if (depth > 100) {
    throw new Error('PSC node tree too deep (max 100 levels)');
  }

  if (!node || typeof node !== 'object') {
    throw new Error('PSC node must be an object');
  }

  if (!node.type) {
    throw new Error('PSC node missing type property');
  }

  switch (node.type) {
    case PSCNodeType.ELEMENT:
      if (!node.tag || typeof node.tag !== 'string') {
        throw new Error('PSC element missing tag');
      }
      if (node.props && typeof node.props !== 'object') {
        throw new Error('PSC element props must be an object');
      }
      if (!Array.isArray(node.children)) {
        throw new Error('PSC element children must be an array');
      }
      // Validate children recursively
      for (const child of node.children) {
        validatePSCNode(child, depth + 1);
      }
      break;

    case PSCNodeType.TEXT:
      if (typeof node.value !== 'string') {
        throw new Error('PSC text node must have a string value');
      }
      break;

    case PSCNodeType.CLIENT:
      if (!node.id || typeof node.id !== 'string') {
        throw new Error('PSC client boundary missing id');
      }
      if (node.props && typeof node.props !== 'object') {
        throw new Error('PSC client boundary props must be an object');
      }
      if (node.fallback) {
        validatePSCNode(node.fallback, depth + 1);
      }
      break;

    case PSCNodeType.FRAGMENT:
      if (!Array.isArray(node.children)) {
        throw new Error('PSC fragment children must be an array');
      }
      for (const child of node.children) {
        validatePSCNode(child, depth + 1);
      }
      break;

    case PSCNodeType.COMMENT:
      if (typeof node.value !== 'string') {
        throw new Error('PSC comment must have a string value');
      }
      break;

    default:
      throw new Error(`Unknown PSC node type: ${node.type}`);
  }

  return true;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  PSCNodeType,
  PSC_VERSION,
  isPSCElement,
  isPSCText,
  isPSCClientBoundary,
  isPSCFragment,
  isPSCComment,
  validatePSCPayload,
  validatePSCNode
};
