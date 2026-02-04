/**
 * Pulse SSR Hydrator - Client-side hydration utilities
 *
 * Provides utilities for hydrating server-rendered HTML by attaching
 * event listeners and reactive bindings to existing DOM elements.
 */

// ============================================================================
// Hydration State
// ============================================================================

/** @type {boolean} */
let isHydrating = false;

/** @type {HydrationContext|null} */
let hydrationCtx = null;

// ============================================================================
// Hydration Context
// ============================================================================

/**
 * @typedef {Object} HydrationContext
 * @property {Element} root - Root container element
 * @property {Node|null} cursor - Current position in DOM tree
 * @property {Array<Function>} cleanups - Cleanup functions for disposal
 * @property {Array<{element: Element, event: string, handler: Function}>} listeners - Attached event listeners
 * @property {number} depth - Current nesting depth
 * @property {boolean} mismatchWarned - Whether a mismatch warning was shown
 */

/**
 * Create a new hydration context for a container element.
 * @param {Element} root - Root container element
 * @returns {HydrationContext}
 */
export function createHydrationContext(root) {
  return {
    root,
    cursor: root.firstChild,
    cleanups: [],
    listeners: [],
    depth: 0,
    mismatchWarned: false
  };
}

// ============================================================================
// Hydration Mode Control
// ============================================================================

/**
 * Enable or disable hydration mode.
 * @param {boolean} enabled - Whether to enable hydration mode
 * @param {HydrationContext|null} ctx - Hydration context (required when enabling)
 */
export function setHydrationMode(enabled, ctx = null) {
  isHydrating = enabled;
  hydrationCtx = enabled ? ctx : null;
}

/**
 * Check if currently in hydration mode.
 * @returns {boolean}
 */
export function isHydratingMode() {
  return isHydrating;
}

/**
 * Get the current hydration context.
 * @returns {HydrationContext|null}
 */
export function getHydrationContext() {
  return hydrationCtx;
}

// ============================================================================
// DOM Cursor Navigation
// ============================================================================

/**
 * Get the current node at the cursor position.
 * @param {HydrationContext} ctx - Hydration context
 * @returns {Node|null}
 */
export function getCurrentNode(ctx) {
  return ctx.cursor;
}

/**
 * Advance the cursor to the next sibling.
 * @param {HydrationContext} ctx - Hydration context
 */
export function advanceCursor(ctx) {
  if (ctx.cursor) {
    ctx.cursor = ctx.cursor.nextSibling;
  }
}

/**
 * Enter a child scope (for nested elements).
 * @param {HydrationContext} ctx - Hydration context
 * @param {Element} element - Parent element to enter
 */
export function enterChild(ctx, element) {
  ctx.cursor = element.firstChild;
  ctx.depth++;
}

/**
 * Exit a child scope and restore cursor to parent level.
 * @param {HydrationContext} ctx - Hydration context
 * @param {Element} element - Element we're exiting
 */
export function exitChild(ctx, element) {
  ctx.cursor = element.nextSibling;
  ctx.depth--;
}

/**
 * Skip comment nodes (used as markers).
 * @param {HydrationContext} ctx - Hydration context
 */
export function skipComments(ctx) {
  while (ctx.cursor && ctx.cursor.nodeType === 8) {
    ctx.cursor = ctx.cursor.nextSibling;
  }
}

// ============================================================================
// DOM Matching
// ============================================================================

/**
 * Check if an element matches expected tag and basic attributes.
 * @param {Node} node - Node to check
 * @param {string} expectedTag - Expected tag name (lowercase)
 * @param {string} [expectedId] - Expected ID (optional)
 * @param {string} [expectedClass] - Expected class (optional)
 * @returns {boolean}
 */
export function matchesElement(node, expectedTag, expectedId, expectedClass) {
  if (!node || node.nodeType !== 1) return false;

  const tag = node.tagName?.toLowerCase();
  if (tag !== expectedTag) return false;

  if (expectedId && node.id !== expectedId) return false;
  if (expectedClass && !node.classList?.contains(expectedClass)) return false;

  return true;
}

/**
 * Log a hydration mismatch warning.
 * @param {HydrationContext} ctx - Hydration context
 * @param {string} expected - What was expected
 * @param {Node|null} actual - What was found
 */
export function warnMismatch(ctx, expected, actual) {
  if (ctx.mismatchWarned) return;

  const actualDesc = actual
    ? `<${actual.tagName?.toLowerCase() || actual.nodeName}>`
    : 'null';

  console.warn(
    `[Pulse Hydration] Mismatch at depth ${ctx.depth}: ` +
    `expected ${expected}, found ${actualDesc}. ` +
    `This may cause hydration errors.`
  );

  ctx.mismatchWarned = true;
}

// ============================================================================
// Event Listener Management
// ============================================================================

/**
 * Register an event listener during hydration.
 * @param {HydrationContext} ctx - Hydration context
 * @param {Element} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event listener options
 */
export function registerListener(ctx, element, event, handler, options) {
  element.addEventListener(event, handler, options);
  ctx.listeners.push({ element, event, handler, options });
}

/**
 * Register a cleanup function.
 * @param {HydrationContext} ctx - Hydration context
 * @param {Function} cleanup - Cleanup function
 */
export function registerCleanup(ctx, cleanup) {
  ctx.cleanups.push(cleanup);
}

// ============================================================================
// Hydration Disposal
// ============================================================================

/**
 * Dispose of all hydration resources.
 * Removes event listeners and runs cleanup functions.
 * @param {HydrationContext} ctx - Hydration context
 */
export function disposeHydration(ctx) {
  // Remove all event listeners
  for (const { element, event, handler, options } of ctx.listeners) {
    element.removeEventListener(event, handler, options);
  }
  ctx.listeners = [];

  // Run cleanup functions
  for (const cleanup of ctx.cleanups) {
    try {
      cleanup();
    } catch (e) {
      console.error('[Pulse Hydration] Cleanup error:', e);
    }
  }
  ctx.cleanups = [];
}

// ============================================================================
// Hydration Helpers
// ============================================================================

/**
 * Find the next element matching a tag within the current scope.
 * Useful for recovering from mismatches.
 * @param {HydrationContext} ctx - Hydration context
 * @param {string} tag - Tag name to find
 * @returns {Element|null}
 */
export function findNextElement(ctx, tag) {
  let node = ctx.cursor;
  while (node) {
    if (node.nodeType === 1 && node.tagName?.toLowerCase() === tag) {
      return node;
    }
    node = node.nextSibling;
  }
  return null;
}

/**
 * Count remaining elements in the current scope.
 * Useful for debugging hydration issues.
 * @param {HydrationContext} ctx - Hydration context
 * @returns {number}
 */
export function countRemaining(ctx) {
  let count = 0;
  let node = ctx.cursor;
  while (node) {
    if (node.nodeType === 1) count++;
    node = node.nextSibling;
  }
  return count;
}

/**
 * Check if hydration is complete (no more nodes to process).
 * @param {HydrationContext} ctx - Hydration context
 * @returns {boolean}
 */
export function isHydrationComplete(ctx) {
  return ctx.cursor === null && ctx.depth === 0;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Mode control
  setHydrationMode,
  isHydratingMode,
  getHydrationContext,

  // Context
  createHydrationContext,

  // Navigation
  getCurrentNode,
  advanceCursor,
  enterChild,
  exitChild,
  skipComments,

  // Matching
  matchesElement,
  warnMismatch,
  findNextElement,

  // Resources
  registerListener,
  registerCleanup,
  disposeHydration,

  // Helpers
  countRemaining,
  isHydrationComplete
};
