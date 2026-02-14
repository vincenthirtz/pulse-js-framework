/**
 * Pulse Server Components (PSC) - Client Reconstructor
 *
 * Reconstructs DOM trees from PSC Wire Format on the client side.
 * Handles lazy-loading of Client Component chunks and hydration.
 *
 * @module pulse-js-framework/runtime/server-components/client
 */

import { PSCNodeType, isPSCElement, isPSCText, isPSCClientBoundary, isPSCFragment, isPSCComment } from './types.js';
import { RuntimeError } from '../errors.js';
import { getAdapter } from '../dom-adapter.js';
import { loggers } from '../logger.js';

const log = loggers.dom;

// ============================================================================
// Client Component Cache
// ============================================================================

/** Cache of loaded Client Component modules */
const componentCache = new Map();

/** In-flight component loads (Promise cache to prevent duplicate requests) */
const loadingComponents = new Map();

// ============================================================================
// PSC Reconstruction
// ============================================================================

/**
 * Reconstruct a PSC node to DOM node(s).
 *
 * @param {PSCNode} pscNode - PSC node to reconstruct
 * @param {Object} options - Reconstruction options
 * @param {Record<string, Function>} [options.clientComponents] - Pre-loaded Client Components
 * @param {Record<string, ClientManifestEntry>} [options.clientManifest] - Client manifest
 * @returns {Promise<Node|Node[]>} Reconstructed DOM node(s)
 *
 * @example
 * const domNode = await reconstructNode(pscNode, {
 *   clientComponents: { Button: ButtonComponent },
 *   clientManifest: { Button: { chunk: '/Button.js', exports: ['default'] } }
 * });
 */
export async function reconstructNode(pscNode, options = {}) {
  if (!pscNode) {
    return null;
  }

  const adapter = getAdapter();

  // Element node
  if (isPSCElement(pscNode)) {
    return reconstructElement(pscNode, options, adapter);
  }

  // Text node
  if (isPSCText(pscNode)) {
    return reconstructText(pscNode, adapter);
  }

  // Client Component boundary
  if (isPSCClientBoundary(pscNode)) {
    return reconstructClientBoundary(pscNode, options, adapter);
  }

  // Fragment
  if (isPSCFragment(pscNode)) {
    return reconstructFragment(pscNode, options, adapter);
  }

  // Comment
  if (isPSCComment(pscNode)) {
    return reconstructComment(pscNode, adapter);
  }

  log.warn('Unknown PSC node type:', pscNode.type);
  return null;
}

/**
 * Reconstruct a PSC element to DOM element.
 *
 * @param {PSCElement} pscElement - PSC element
 * @param {Object} options - Options
 * @param {any} adapter - DOM adapter
 * @returns {Promise<Element>} DOM element
 */
async function reconstructElement(pscElement, options, adapter) {
  const element = adapter.createElement(pscElement.tag);

  // Set attributes/properties
  if (pscElement.props) {
    for (const [key, value] of Object.entries(pscElement.props)) {
      adapter.setAttribute(element, key, value);
    }
  }

  // Reconstruct children
  if (pscElement.children && pscElement.children.length > 0) {
    for (const childPSC of pscElement.children) {
      const childNode = await reconstructNode(childPSC, options);
      if (childNode) {
        if (Array.isArray(childNode)) {
          // Multiple nodes (from fragment)
          childNode.forEach(node => adapter.appendChild(element, node));
        } else {
          adapter.appendChild(element, childNode);
        }
      }
    }
  }

  return element;
}

/**
 * Reconstruct a PSC text node to DOM text node.
 *
 * @param {PSCText} pscText - PSC text
 * @param {any} adapter - DOM adapter
 * @returns {Text} DOM text node
 */
function reconstructText(pscText, adapter) {
  return adapter.createTextNode(pscText.value);
}

/**
 * Reconstruct a PSC comment to DOM comment.
 *
 * @param {PSCComment} pscComment - PSC comment
 * @param {any} adapter - DOM adapter
 * @returns {Comment} DOM comment node
 */
function reconstructComment(pscComment, adapter) {
  return adapter.createComment(pscComment.value);
}

/**
 * Reconstruct a PSC fragment to array of DOM nodes.
 *
 * @param {PSCFragment} pscFragment - PSC fragment
 * @param {Object} options - Options
 * @param {any} adapter - DOM adapter
 * @returns {Promise<Node[]>} Array of DOM nodes
 */
async function reconstructFragment(pscFragment, options, adapter) {
  const nodes = [];

  if (pscFragment.children && pscFragment.children.length > 0) {
    for (const childPSC of pscFragment.children) {
      const childNode = await reconstructNode(childPSC, options);
      if (childNode) {
        if (Array.isArray(childNode)) {
          nodes.push(...childNode);
        } else {
          nodes.push(childNode);
        }
      }
    }
  }

  return nodes;
}

/**
 * Reconstruct a PSC Client Component boundary.
 * Lazy-loads the Client Component chunk if not already loaded.
 *
 * @param {PSCClientBoundary} pscBoundary - PSC client boundary
 * @param {Object} options - Options
 * @param {any} adapter - DOM adapter
 * @returns {Promise<Node>} DOM node (component or fallback)
 */
async function reconstructClientBoundary(pscBoundary, options, adapter) {
  const { id, props, fallback } = pscBoundary;

  try {
    // Check if component is pre-loaded
    let ComponentFn = options.clientComponents?.[id];

    // If not pre-loaded, lazy-load from manifest
    if (!ComponentFn) {
      const manifest = options.clientManifest || {};
      const manifestEntry = manifest[id];

      if (!manifestEntry) {
        throw new RuntimeError(`Client Component '${id}' not found in manifest`, {
          code: 'PSC_COMPONENT_NOT_FOUND',
          context: `Available components: ${Object.keys(manifest).join(', ')}`,
          suggestion: 'Ensure the component is marked with "use client" directive'
        });
      }

      ComponentFn = await loadClientComponent(id, manifestEntry.chunk);
    }

    // Execute Client Component with props
    const componentResult = await ComponentFn(props);

    // If component returns a DOM node, use it directly
    if (componentResult && typeof componentResult === 'object') {
      return componentResult;
    }

    throw new RuntimeError(`Client Component '${id}' did not return a DOM node`, {
      code: 'PSC_INVALID_COMPONENT_RETURN',
      context: `Returned: ${typeof componentResult}`
    });

  } catch (error) {
    log.error(`Failed to reconstruct Client Component '${id}':`, error.message);

    // Render fallback if provided
    if (fallback) {
      return reconstructNode(fallback, options);
    }

    // Return error placeholder
    const errorEl = adapter.createElement('div');
    adapter.setAttribute(errorEl, 'class', 'pulse-client-error');
    adapter.setAttribute(errorEl, 'data-error', error.message);
    const errorText = adapter.createTextNode(`Error loading component: ${id}`);
    adapter.appendChild(errorEl, errorText);
    return errorEl;
  }
}

// ============================================================================
// Client Component Loading
// ============================================================================

/**
 * Lazy-load a Client Component chunk from the given URL.
 * Uses dynamic import() and caches the result.
 *
 * @param {string} componentId - Component ID
 * @param {string} chunkUrl - URL to the component JS chunk
 * @returns {Promise<Function>} Component function
 *
 * @example
 * const Button = await loadClientComponent('Button', '/assets/Button.js');
 * const buttonEl = Button({ text: 'Click me' });
 */
export async function loadClientComponent(componentId, chunkUrl) {
  // Check cache
  if (componentCache.has(componentId)) {
    return componentCache.get(componentId);
  }

  // Check if already loading
  if (loadingComponents.has(componentId)) {
    return loadingComponents.get(componentId);
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      log.debug(`Loading Client Component '${componentId}' from ${chunkUrl}`);

      // Dynamic import
      const module = await import(/* @vite-ignore */ chunkUrl);

      // Get default export or named export matching component ID
      let ComponentFn = module.default || module[componentId];

      if (!ComponentFn) {
        throw new RuntimeError(
          `Client Component '${componentId}' not found in module`,
          {
            code: 'PSC_COMPONENT_EXPORT_NOT_FOUND',
            context: `Available exports: ${Object.keys(module).join(', ')}`,
            suggestion: 'Ensure the component is exported as default or with matching name'
          }
        );
      }

      // Cache the loaded component
      componentCache.set(componentId, ComponentFn);
      loadingComponents.delete(componentId);

      return ComponentFn;

    } catch (error) {
      loadingComponents.delete(componentId);

      throw new RuntimeError(
        `Failed to load Client Component '${componentId}'`,
        {
          code: 'PSC_COMPONENT_LOAD_FAILED',
          context: `URL: ${chunkUrl}`,
          suggestion: 'Check that the chunk URL is correct and the file exists',
          cause: error
        }
      );
    }
  })();

  loadingComponents.set(componentId, loadPromise);
  return loadPromise;
}

/**
 * Preload a Client Component chunk (without executing it).
 * Useful for prefetching components on hover or intersection.
 *
 * @param {string} componentId - Component ID
 * @param {string} chunkUrl - URL to the component JS chunk
 * @returns {Promise<void>}
 *
 * @example
 * // Prefetch on hover
 * element.addEventListener('mouseenter', () => {
 *   preloadClientComponent('Dashboard', '/assets/Dashboard.js');
 * });
 */
export async function preloadClientComponent(componentId, chunkUrl) {
  if (componentCache.has(componentId)) {
    return; // Already loaded
  }

  // Use link rel="modulepreload" for faster loading
  if (typeof document !== 'undefined' && document.createElement) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = chunkUrl;
    document.head.appendChild(link);
  }

  // Also start the actual load
  await loadClientComponent(componentId, chunkUrl);
}

// ============================================================================
// Full PSC Tree Reconstruction
// ============================================================================

/**
 * Reconstruct a complete PSC payload to DOM tree.
 * This is the main entry point for PSC reconstruction on the client.
 *
 * @param {PSCPayload} payload - Complete PSC payload from server
 * @returns {Promise<Node>} Reconstructed DOM tree
 *
 * @example
 * const response = await fetch('/products/123?_psc=1');
 * const payload = await response.json();
 * const domTree = await reconstructPSCTree(payload);
 * document.getElementById('app').replaceChildren(domTree);
 */
export async function reconstructPSCTree(payload) {
  if (!payload || !payload.root) {
    throw new RuntimeError('Invalid PSC payload: missing root', {
      code: 'PSC_INVALID_PAYLOAD'
    });
  }

  // Reconstruct the root node
  const root = await reconstructNode(payload.root, {
    clientManifest: payload.clientManifest || {},
    clientComponents: {}
  });

  return root;
}

// ============================================================================
// Client Component Hydration
// ============================================================================

/**
 * Hydrate Client Components in a DOM tree.
 * Attaches event listeners and connects to reactive state.
 *
 * This is called after PSC reconstruction to make Client Components interactive.
 *
 * @param {Node} root - Root DOM node
 * @param {Record<string, Function>} clientComponents - Client Component functions
 *
 * @example
 * const root = await reconstructPSCTree(payload);
 * hydrateClientComponents(root, {
 *   Button: ButtonComponent,
 *   Chart: ChartComponent
 * });
 */
export function hydrateClientComponents(root, clientComponents) {
  // This is a placeholder for future hydration logic
  // In the current implementation, Client Components are already rendered
  // during reconstruction, so no additional hydration is needed.
  //
  // Future enhancements:
  // 1. Identify Client Component boundaries in existing SSR'd HTML
  // 2. Match them with Client Component functions
  // 3. Attach event listeners without re-rendering
  // 4. Connect to reactive state

  log.debug('Client Component hydration (placeholder)');
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the Client Component cache.
 * Useful for testing or forced reloading.
 *
 * @example
 * clearComponentCache();
 */
export function clearComponentCache() {
  componentCache.clear();
  loadingComponents.clear();
}

/**
 * Get the current state of the component cache.
 *
 * @returns {Object} Cache statistics
 *
 * @example
 * const stats = getComponentCacheStats();
 * console.log(`Loaded: ${stats.loaded}, Loading: ${stats.loading}`);
 */
export function getComponentCacheStats() {
  return {
    loaded: componentCache.size,
    loading: loadingComponents.size,
    components: Array.from(componentCache.keys())
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  reconstructNode,
  reconstructPSCTree,
  loadClientComponent,
  preloadClientComponent,
  hydrateClientComponents,
  clearComponentCache,
  getComponentCacheStats
};
