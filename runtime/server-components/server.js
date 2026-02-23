/**
 * Pulse Server Components (PSC) - Server Rendering Helpers
 *
 * Server-side helpers for rendering Server Components with async support
 * and Client Component boundary detection.
 *
 * @module pulse-js-framework/runtime/server-components/server
 */

import { markClientBoundary } from './serializer.js';
import { RuntimeError } from '../errors.js';
import { getAdapter, MockDOMAdapter, withAdapter } from '../dom-adapter.js';
import { loggers } from '../logger.js';

const log = loggers.dom;

// ============================================================================
// Server Component Rendering
// ============================================================================

/**
 * Render a Server Component with support for async components.
 * Executes async component functions and waits for their results.
 *
 * @param {Function} component - Component factory function
 * @param {Object} props - Component props
 * @param {Object} options - Rendering options
 * @param {Set<string>} [options.clientComponents] - Set of Client Component IDs
 * @param {number} [options.timeout=5000] - Timeout for async components (ms)
 * @returns {Promise<Node>} Rendered DOM node
 *
 * @example
 * async function ServerProductPage({ productId }) {
 *   const product = await db.products.findById(productId);
 *   return el('.product', product.name);
 * }
 *
 * const node = await renderServerComponent(ServerProductPage, { productId: 123 });
 */
export async function renderServerComponent(component, props = {}, options = {}) {
  const timeout = options.timeout || 5000;
  const clientComponents = options.clientComponents || new Set();

  try {
    // Execute component (may be async)
    const result = await executeAsyncComponent(component, props, timeout);

    // Mark Client Component boundaries in the tree
    if (result && clientComponents.size > 0) {
      markClientBoundaries(result, clientComponents);
    }

    return result;

  } catch (error) {
    // Check if it's a timeout error
    const isTimeout = error.code === 'PSC_ASYNC_COMPONENT_TIMEOUT';

    throw new RuntimeError(
      isTimeout
        ? `Server Component rendering timed out after ${timeout}ms`
        : 'Server Component rendering failed',
      {
        code: isTimeout ? 'PSC_SERVER_RENDER_TIMEOUT' : 'PSC_SERVER_RENDER_FAILED',
        context: `Component: ${component.name || 'anonymous'}`,
        suggestion: isTimeout
          ? `Increase timeout or optimize component: ${component.name || 'anonymous'}`
          : 'Check component for errors or timeout issues'
      }
    );
  }
}

/**
 * Execute an async Server Component with timeout.
 * Handles both sync and async component functions.
 *
 * @param {Function} component - Component factory
 * @param {Object} props - Component props
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>} Component result
 *
 * @example
 * async function MyComponent(props) {
 *   const data = await fetchData(props.id);
 *   return el('div', data.name);
 * }
 *
 * const result = await executeAsyncComponent(MyComponent, { id: 1 }, 5000);
 */
export async function executeAsyncComponent(component, props, timeout = 5000) {
  if (typeof component !== 'function') {
    throw new RuntimeError('Component must be a function', {
      code: 'PSC_INVALID_COMPONENT',
      context: `Received: ${typeof component}`
    });
  }

  // Execute component
  const resultPromise = Promise.resolve(component(props));

  // Race with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Component execution timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const result = await Promise.race([resultPromise, timeoutPromise]);
    return result;
  } catch (error) {
    // Check if it's a timeout error
    const isTimeout = error.message && error.message.includes('timed out');

    throw new RuntimeError(
      isTimeout
        ? `Component execution timed out after ${timeout}ms`
        : 'Async component execution failed',
      {
        code: isTimeout ? 'PSC_ASYNC_COMPONENT_TIMEOUT' : 'PSC_ASYNC_COMPONENT_FAILED',
        context: `Component: ${component.name || 'anonymous'}`
      }
    );
  }
}

// ============================================================================
// Client Component Boundary Detection
// ============================================================================

/**
 * Detect and mark Client Component boundaries in a DOM tree.
 * Walks the tree and marks elements that are Client Components.
 *
 * @param {Node} node - Root node to process
 * @param {Set<string>} clientComponents - Set of Client Component IDs
 *
 * @example
 * const tree = el('.app',
 *   ServerComponent(),
 *   ClientButton({ text: 'Click' }) // Will be marked as client boundary
 * );
 *
 * markClientBoundaries(tree, new Set(['ClientButton']));
 */
export function markClientBoundaries(node, clientComponents) {
  if (!node || !clientComponents || clientComponents.size === 0) {
    return;
  }

  // Check if this node is a Client Component
  const componentId = detectClientComponent(node);
  if (componentId && clientComponents.has(componentId)) {
    // Extract props from the element
    const props = extractComponentProps(node);
    markClientBoundary(node, componentId, props);
    return; // Don't traverse into client boundaries
  }

  // Recursively process children
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      markClientBoundaries(node.childNodes[i], clientComponents);
    }
  }
}

/**
 * Detect if a node is a Client Component by checking for markers.
 * Client Components are identified by data-component-id attribute or
 * special class names.
 *
 * @param {Node} node - Node to check
 * @returns {string|null} Component ID or null
 */
function detectClientComponent(node) {
  if (!node || node.nodeType !== 1) {
    return null;
  }

  // Check for explicit component ID attribute
  if (node.hasAttribute && node.hasAttribute('data-component-id')) {
    return node.getAttribute('data-component-id');
  }

  // Check for component class marker (e.g., 'pulse-component-Button')
  if (node.className && typeof node.className === 'string') {
    const match = node.className.match(/pulse-component-(\w+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract props from a component element.
 * Reads data-prop-* attributes and constructs a props object.
 *
 * @param {Element} element - Component element
 * @returns {Record<string, any>} Props object
 */
function extractComponentProps(element) {
  const props = {};

  if (!element.attributes) {
    return props;
  }

  // Extract data-prop-* attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    const match = attr.name.match(/^data-prop-(.+)$/);
    if (match) {
      const propName = match[1];
      try {
        // Try to parse as JSON
        props[propName] = JSON.parse(attr.value);
      } catch {
        // Fallback to string value
        props[propName] = attr.value;
      }
    }
  }

  return props;
}

// ============================================================================
// Server-Side Rendering Integration
// ============================================================================

/**
 * Render a Server Component tree to HTML string.
 * Integrates with existing SSR infrastructure.
 *
 * @param {Function} component - Root component
 * @param {Object} props - Component props
 * @param {Object} options - Rendering options
 * @returns {Promise<string>} Rendered HTML string
 *
 * @example
 * const html = await renderServerComponentToHTML(App, { userId: 1 });
 */
export async function renderServerComponentToHTML(component, props = {}, options = {}) {
  const adapter = new MockDOMAdapter();

  return withAdapter(adapter, async () => {
    // Render the component
    const node = await renderServerComponent(component, props, options);

    // Append to virtual body
    if (node) {
      adapter.appendChild(adapter.getBody(), node);
    }

    // Serialize to HTML (use existing ssr-serializer)
    const { serializeChildren } = await import('../ssr-serializer.js');
    return serializeChildren(adapter.getBody());
  });
}

// ============================================================================
// Component Registry
// ============================================================================

/**
 * Component registry for server-side rendering.
 * Maps component names to their factory functions.
 */
class ComponentRegistry {
  constructor() {
    this.#components = new Map();
    this.#clientComponents = new Set();
  }

  /** @type {Map<string, Function>} */
  #components;

  /** @type {Set<string>} */
  #clientComponents;

  /**
   * Register a Server Component.
   *
   * @param {string} name - Component name
   * @param {Function} factory - Component factory function
   *
   * @example
   * registry.registerServer('ProductList', ProductListComponent);
   */
  registerServer(name, factory) {
    if (this.#components.has(name)) {
      log.warn(`Component '${name}' already registered, overwriting`);
    }
    this.#components.set(name, factory);
  }

  /**
   * Register a Client Component.
   *
   * @param {string} name - Component name
   * @param {Function} factory - Component factory function
   *
   * @example
   * registry.registerClient('Button', ButtonComponent);
   */
  registerClient(name, factory) {
    this.registerServer(name, factory); // Also register as server for SSR
    this.#clientComponents.add(name);
  }

  /**
   * Get a component by name.
   *
   * @param {string} name - Component name
   * @returns {Function|null} Component factory or null
   */
  get(name) {
    return this.#components.get(name) || null;
  }

  /**
   * Check if a component is a Client Component.
   *
   * @param {string} name - Component name
   * @returns {boolean} True if client component
   */
  isClientComponent(name) {
    return this.#clientComponents.has(name);
  }

  /**
   * Get all Client Component IDs.
   *
   * @returns {Set<string>} Set of client component names
   */
  getClientComponents() {
    return new Set(this.#clientComponents);
  }

  /**
   * Clear the registry.
   */
  clear() {
    this.#components.clear();
    this.#clientComponents.clear();
  }
}

/**
 * Global component registry instance.
 */
export const componentRegistry = new ComponentRegistry();

/**
 * Create a new isolated component registry.
 *
 * @returns {ComponentRegistry} New registry instance
 *
 * @example
 * const registry = createComponentRegistry();
 * registry.registerServer('MyComponent', MyComponentFactory);
 */
export function createComponentRegistry() {
  return new ComponentRegistry();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  renderServerComponent,
  executeAsyncComponent,
  markClientBoundaries,
  renderServerComponentToHTML,
  componentRegistry,
  createComponentRegistry
};
