/**
 * Pulse Server Components (PSC) - Serializer
 *
 * Converts DOM trees (from MockDOMAdapter or BrowserDOMAdapter) to
 * PSC Wire Format for transmission from server to client.
 *
 * @module pulse-js-framework/runtime/server-components/serializer
 */

import { PSCNodeType, PSC_VERSION } from './types.js';
import { RuntimeError } from '../errors.js';
import { loggers } from '../logger.js';
import { validatePropSecurity } from './security.js';
import { validatePropSerialization } from './security-validation.js';
import { PSCSerializationError } from './security-errors.js';

const log = loggers.dom;

// ============================================================================
// Constants
// ============================================================================

/** Attribute name for marking Client Component boundaries */
const CLIENT_BOUNDARY_ATTR = 'data-pulse-client-id';

/** Attribute name for Client Component props */
const CLIENT_PROPS_ATTR = 'data-pulse-client-props';

/** Maximum serialization depth to prevent infinite recursion */
const MAX_DEPTH = 100;

// ============================================================================
// Serialization Options
// ============================================================================

/**
 * @typedef {Object} SerializationOptions
 * @property {Set<string>} [clientComponents] - Set of Client Component IDs
 * @property {Record<string, ClientManifestEntry>} [clientManifest] - Client manifest
 * @property {boolean} [includeComments=false] - Include comment nodes
 * @property {number} [maxDepth=100] - Maximum tree depth
 */

// ============================================================================
// Core Serialization
// ============================================================================

/**
 * Serialize a DOM node to PSC Wire Format.
 *
 * @param {Node} node - DOM node (from adapter)
 * @param {SerializationOptions} options - Serialization options
 * @param {number} [depth=0] - Current recursion depth
 * @returns {PSCNode|null} PSC node or null if should be skipped
 *
 * @example
 * const pscNode = serializeNode(divElement, {
 *   clientComponents: new Set(['Button']),
 *   clientManifest: { Button: { id: 'Button', chunk: '/Button.js', exports: ['default'] } }
 * });
 */
export function serializeNode(node, options = {}, depth = 0) {
  if (depth > (options.maxDepth || MAX_DEPTH)) {
    log.warn(`PSC serialization depth exceeded ${MAX_DEPTH}, truncating tree`);
    return null;
  }

  if (!node) {
    return null;
  }

  const nodeType = node.nodeType;

  // Element node (nodeType = 1)
  if (nodeType === 1) {
    return serializeElement(node, options, depth);
  }

  // Text node (nodeType = 3)
  if (nodeType === 3) {
    return serializeText(node);
  }

  // Comment node (nodeType = 8)
  if (nodeType === 8) {
    if (options.includeComments) {
      return serializeComment(node);
    }
    return null;
  }

  // Document fragment (nodeType = 11)
  if (nodeType === 11) {
    return serializeFragment(node, options, depth);
  }

  // Unknown node type
  log.warn(`Unknown node type ${nodeType}, skipping`);
  return null;
}

/**
 * Serialize an element node to PSC format.
 *
 * @param {Element} element - Element node
 * @param {SerializationOptions} options - Options
 * @param {number} depth - Current depth
 * @returns {PSCElement|PSCClientBoundary} PSC element or client boundary
 */
function serializeElement(element, options, depth) {
  // Check if this is a Client Component boundary
  if (isClientBoundary(element)) {
    return serializeClientBoundary(element, options, depth);
  }

  // Regular server element
  const tag = element.tagName ? element.tagName.toLowerCase() : 'div';
  const props = serializeProps(element);
  const children = serializeChildren(element, options, depth);

  return {
    type: PSCNodeType.ELEMENT,
    tag,
    props,
    children
  };
}

/**
 * Serialize a text node to PSC format.
 *
 * @param {Text} textNode - Text node
 * @returns {PSCText|null} PSC text or null if empty
 */
function serializeText(textNode) {
  const value = textNode.nodeValue || textNode.textContent || textNode.data || '';
  // Skip empty text nodes
  if (!value.trim()) {
    return null;
  }
  return {
    type: PSCNodeType.TEXT,
    value
  };
}

/**
 * Serialize a comment node to PSC format.
 *
 * @param {Comment} commentNode - Comment node
 * @returns {PSCComment} PSC comment
 */
function serializeComment(commentNode) {
  const value = commentNode.nodeValue || commentNode.data || '';
  return {
    type: PSCNodeType.COMMENT,
    value
  };
}

/**
 * Serialize a document fragment to PSC format.
 *
 * @param {DocumentFragment} fragment - Fragment node
 * @param {SerializationOptions} options - Options
 * @param {number} depth - Current depth
 * @returns {PSCFragment} PSC fragment
 */
function serializeFragment(fragment, options, depth) {
  const children = serializeChildren(fragment, options, depth);
  return {
    type: PSCNodeType.FRAGMENT,
    children
  };
}

/**
 * Serialize a Client Component boundary.
 *
 * @param {Element} element - Element with client boundary marker
 * @param {SerializationOptions} options - Options
 * @param {number} depth - Current depth
 * @returns {PSCClientBoundary} PSC client boundary
 */
function serializeClientBoundary(element, options, depth) {
  const id = element.getAttribute(CLIENT_BOUNDARY_ATTR);
  if (!id) {
    throw new RuntimeError('Client boundary missing ID attribute', {
      code: 'PSC_MISSING_CLIENT_ID',
      context: `Element: ${element.tagName}`
    });
  }

  // Deserialize props from data attribute
  let props = {};
  const propsAttr = element.getAttribute(CLIENT_PROPS_ATTR);
  if (propsAttr) {
    try {
      props = JSON.parse(propsAttr);
    } catch (err) {
      throw new RuntimeError(`Failed to parse client props for '${id}'`, {
        code: 'PSC_INVALID_CLIENT_PROPS',
        context: `Props attribute: ${propsAttr}`,
        suggestion: 'Ensure props are JSON-serializable'
      });
    }
  }

  // ========== SERIALIZATION VALIDATION (NEW) ==========
  // Validate that props are JSON-serializable (no functions, symbols, etc.)
  const serializationResult = validatePropSerialization(props, id, {
    throwOnError: true  // Throw on non-serializable types
  });

  // This should throw before reaching here if validation failed,
  // but check anyway for safety
  if (!serializationResult.valid) {
    throw new PSCSerializationError(
      `Cannot serialize props for Client Component '${id}'`,
      {
        errors: serializationResult.errors,
        props
      }
    );
  }

  // Log environment variable warnings (non-blocking)
  if (serializationResult.warnings.length > 0) {
    log.warn(
      `PSC: Environment variable(s) detected in props for Client Component '${id}':`,
      serializationResult.warnings.map(w => `${w.path}: ${w.pattern} (${w.platform})`)
    );
  }

  // ========== SECURITY VALIDATION ==========
  // Comprehensive security check: secrets, XSS, size limits, env vars
  const securityResult = validatePropSecurity(props, id, {
    detectSecrets: true,       // Warn on detected secrets
    sanitizeXSS: true,          // Sanitize XSS patterns
    validateSizes: true,        // Enforce size limits
    detectEnvVars: true,        // Detect environment variables (NEW)
    throwOnSecrets: false       // Warn only, don't block
  });

  // Log security warnings (secrets and env vars detected)
  if (securityResult.warnings.length > 0) {
    log.warn(
      `PSC: Security warnings for Client Component '${id}':`,
      securityResult.warnings.map(w => {
        if (w.type === 'env-var') {
          return `${w.path}: ${w.pattern} (${w.platform})`;
        }
        return `${w.path}: ${w.value} (${w.type})`;
      })
    );
  }

  // Throw on security errors (XSS, size limits)
  if (!securityResult.valid) {
    const firstError = securityResult.errors[0];
    throw firstError; // Already a RuntimeError from security module
  }

  // Use sanitized props (XSS patterns removed)
  props = securityResult.sanitized;

  // Serialize fallback (if any children exist)
  let fallback = null;
  if (element.childNodes && element.childNodes.length > 0) {
    const fallbackChildren = serializeChildren(element, options, depth);
    if (fallbackChildren.length > 0) {
      fallback = {
        type: PSCNodeType.FRAGMENT,
        children: fallbackChildren
      };
    }
  }

  return {
    type: PSCNodeType.CLIENT,
    id,
    props,
    fallback
  };
}

// ============================================================================
// Property Serialization
// ============================================================================

/**
 * Serialize element attributes/properties to props object.
 *
 * @param {Element} element - Element
 * @returns {Record<string, any>} Props object
 */
function serializeProps(element) {
  const props = {};

  // Handle MockElement (uses _attributes Map)
  if (element._attributes && element._attributes instanceof Map) {
    for (const [name, value] of element._attributes.entries()) {
      // Skip internal PSC attributes
      if (name === CLIENT_BOUNDARY_ATTR || name === CLIENT_PROPS_ATTR) {
        continue;
      }
      props[name] = value;
    }
  }
  // Handle real DOM element (uses attributes array)
  else if (element.attributes) {
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const name = attr.name;

      // Skip internal PSC attributes
      if (name === CLIENT_BOUNDARY_ATTR || name === CLIENT_PROPS_ATTR) {
        continue;
      }

      props[name] = attr.value;
    }
  }

  // Add className if present (MockElement uses className property)
  if (element.className) {
    props.class = element.className;
  }

  return props;
}

/**
 * Validate that props are JSON-serializable (no functions, symbols, etc.).
 *
 * @param {Record<string, any>} props - Props to validate
 * @param {string} componentId - Component ID for error messages
 * @throws {RuntimeError} If props contain non-serializable values
 */
function validateSerializableProps(props, componentId) {
  const seen = new WeakSet();

  function check(value, path) {
    if (value === null || value === undefined) {
      return; // Allowed
    }

    const type = typeof value;

    // Primitives OK
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return;
    }

    // Functions NOT OK
    if (type === 'function') {
      throw new RuntimeError(
        `Client Component '${componentId}' received function prop at '${path}'`,
        {
          code: 'PSC_FUNCTION_PROP',
          context: 'Functions cannot be serialized to client',
          suggestion: 'Use Server Actions instead of inline functions'
        }
      );
    }

    // Symbols NOT OK
    if (type === 'symbol') {
      throw new RuntimeError(
        `Client Component '${componentId}' received symbol prop at '${path}'`,
        {
          code: 'PSC_SYMBOL_PROP',
          context: 'Symbols cannot be serialized'
        }
      );
    }

    // Objects/Arrays - check recursively
    if (type === 'object') {
      // Circular reference check
      if (seen.has(value)) {
        throw new RuntimeError(
          `Client Component '${componentId}' has circular reference at '${path}'`,
          {
            code: 'PSC_CIRCULAR_PROP',
            context: 'Props must not contain circular references'
          }
        );
      }
      seen.add(value);

      // Arrays
      if (Array.isArray(value)) {
        value.forEach((item, i) => check(item, `${path}[${i}]`));
      }
      // Plain objects
      else if (value.constructor === Object || value.constructor === undefined) {
        for (const [key, val] of Object.entries(value)) {
          check(val, `${path}.${key}`);
        }
      }
      // Class instances with methods NOT OK
      else if (typeof value.constructor === 'function' && value.constructor !== Object) {
        throw new RuntimeError(
          `Client Component '${componentId}' received class instance at '${path}'`,
          {
            code: 'PSC_CLASS_INSTANCE_PROP',
            context: `Type: ${value.constructor.name}`,
            suggestion: 'Pass plain objects instead of class instances'
          }
        );
      }
    }
  }

  check(props, 'props');
}

// ============================================================================
// Children Serialization
// ============================================================================

/**
 * Serialize child nodes of an element or fragment.
 *
 * @param {Node} parent - Parent node
 * @param {SerializationOptions} options - Options
 * @param {number} depth - Current depth
 * @returns {PSCNode[]} Array of serialized children
 */
function serializeChildren(parent, options, depth) {
  const children = [];

  if (!parent.childNodes) {
    return children;
  }

  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    const serialized = serializeNode(child, options, depth + 1);
    if (serialized) {
      children.push(serialized);
    }
  }

  return children;
}

// ============================================================================
// Full Tree Serialization
// ============================================================================

/**
 * Serialize a complete DOM tree to PSC payload.
 *
 * @param {Node} root - Root DOM node
 * @param {Object} options - Serialization options
 * @param {Set<string>} [options.clientComponents] - Set of Client Component IDs
 * @param {Record<string, ClientManifestEntry>} [options.clientManifest] - Client manifest
 * @param {Record<string, any>} [options.state] - Optional server state
 * @returns {PSCPayload} Complete PSC payload
 *
 * @example
 * const payload = serializeToPSC(rootElement, {
 *   clientComponents: new Set(['Button', 'Chart']),
 *   clientManifest: {
 *     Button: { id: 'Button', chunk: '/Button.js', exports: ['default'] },
 *     Chart: { id: 'Chart', chunk: '/Chart.js', exports: ['default'] }
 *   },
 *   state: { user: { id: 1, name: 'Alice' } }
 * });
 */
export function serializeToPSC(root, options = {}) {
  const clientManifest = options.clientManifest || {};
  const state = options.state;

  // Serialize root node
  const rootNode = serializeNode(root, options);
  if (!rootNode) {
    throw new RuntimeError('Failed to serialize PSC root node', {
      code: 'PSC_SERIALIZATION_FAILED',
      context: 'Root node serialization returned null'
    });
  }

  // Build payload
  const payload = {
    version: PSC_VERSION,
    root: rootNode,
    clientManifest
  };

  if (state) {
    payload.state = state;
  }

  return payload;
}

// ============================================================================
// Client Boundary Detection
// ============================================================================

/**
 * Check if a node is a Client Component boundary.
 * Client boundaries are marked with data-pulse-client-id attribute.
 *
 * @param {Node} node - Node to check
 * @returns {boolean} True if node is a Client Component boundary
 *
 * @example
 * if (isClientBoundary(element)) {
 *   console.log('Found Client Component:', element.getAttribute('data-pulse-client-id'));
 * }
 */
export function isClientBoundary(node) {
  return (
    node &&
    node.nodeType === 1 &&
    node.hasAttribute &&
    node.hasAttribute(CLIENT_BOUNDARY_ATTR)
  );
}

/**
 * Mark a DOM node as a Client Component boundary.
 * Used during server-side rendering to mark boundaries.
 *
 * @param {Element} element - Element to mark
 * @param {string} componentId - Client Component ID
 * @param {Record<string, any>} [props] - Component props
 *
 * @example
 * markClientBoundary(element, 'Button', { text: 'Click me' });
 */
export function markClientBoundary(element, componentId, props = {}) {
  if (!element || !element.setAttribute) {
    throw new RuntimeError('Cannot mark client boundary on invalid element', {
      code: 'PSC_INVALID_ELEMENT'
    });
  }

  element.setAttribute(CLIENT_BOUNDARY_ATTR, componentId);

  if (props && Object.keys(props).length > 0) {
    // ========== SERIALIZATION VALIDATION (NEW) ==========
    // Validate that props are JSON-serializable
    const serializationResult = validatePropSerialization(props, componentId, {
      throwOnError: true  // Throw on non-serializable types
    });

    if (!serializationResult.valid) {
      throw new PSCSerializationError(
        `Cannot serialize props for Client Component '${componentId}'`,
        {
          errors: serializationResult.errors,
          props
        }
      );
    }

    // Log environment variable warnings
    if (serializationResult.warnings.length > 0) {
      log.warn(
        `PSC: Environment variable(s) detected when marking Client Component '${componentId}':`,
        serializationResult.warnings.map(w => `${w.path}: ${w.pattern} (${w.platform})`)
      );
    }

    // ========== SECURITY VALIDATION ==========
    // Apply same security validation as during serialization
    const securityResult = validatePropSecurity(props, componentId, {
      detectSecrets: true,
      sanitizeXSS: true,
      validateSizes: true,
      detectEnvVars: true,  // NEW
      throwOnSecrets: false
    });

    // Log security warnings
    if (securityResult.warnings.length > 0) {
      log.warn(
        `PSC: Security warnings when marking Client Component '${componentId}':`,
        securityResult.warnings.map(w => {
          if (w.type === 'env-var') {
            return `${w.path}: ${w.pattern} (${w.platform})`;
          }
          return `${w.path}: ${w.value} (${w.type})`;
        })
      );
    }

    // Throw on security errors
    if (!securityResult.valid) {
      throw securityResult.errors[0];
    }

    // Use sanitized props
    element.setAttribute(CLIENT_PROPS_ATTR, JSON.stringify(securityResult.sanitized));
  }
}

// ============================================================================
// Exports
// ============================================================================

// Export constants
export { CLIENT_BOUNDARY_ATTR, CLIENT_PROPS_ATTR };

export default {
  serializeNode,
  serializeToPSC,
  isClientBoundary,
  markClientBoundary,
  CLIENT_BOUNDARY_ATTR,
  CLIENT_PROPS_ATTR
};
