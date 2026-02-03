/**
 * Pulse DOM - Declarative DOM manipulation
 *
 * Creates DOM elements using CSS selector-like syntax
 * and provides reactive bindings.
 *
 * DOM Abstraction:
 * This module uses a DOM adapter for all DOM operations, enabling:
 * - Server-Side Rendering (SSR) with virtual DOM implementations
 * - Simplified testing without browser environment
 * - Platform-specific optimizations
 *
 * @see ./dom-adapter.js for adapter configuration
 *
 * Architecture:
 * This module re-exports from specialized sub-modules:
 * - dom-selector.js: CSS selector parsing with LRU caching
 * - dom-element.js: Core element creation (el, text)
 * - dom-binding.js: Reactive attribute, property, class, style, event bindings
 * - dom-list.js: Reactive list rendering with LIS-based diffing
 * - dom-conditional.js: Conditional rendering (when, match, show)
 * - dom-lifecycle.js: Component lifecycle hooks and mounting
 * - dom-advanced.js: Portal, error boundary, transitions
 */

// =============================================================================
// IMPORTS FROM SUB-MODULES
// =============================================================================

// Selector parsing and caching
import {
  parseSelector,
  resolveSelector,
  configureDom,
  getDomConfig,
  clearSelectorCache,
  getCacheMetrics,
  resetCacheMetrics
} from './dom-selector.js';

// Core element creation and a11y configuration
import { el, text, configureA11y } from './dom-element.js';

// Reactive bindings
import { bind, prop, cls, style, on, model } from './dom-binding.js';

// List rendering
import { list, computeLIS } from './dom-list.js';

// Conditional rendering
import { when, match, show } from './dom-conditional.js';

// Lifecycle and mounting
import {
  onMount,
  onUnmount,
  mount,
  component,
  getMountContext,
  setMountContext,
  _setContextUtils
} from './dom-lifecycle.js';

// Advanced features
import { portal, errorBoundary, transition, whenTransition } from './dom-advanced.js';

// =============================================================================
// INITIALIZE CONTEXT UTILITIES FOR COMPONENT FACTORY
// =============================================================================

// Inject DOM utilities into component factory to avoid circular dependencies
_setContextUtils({
  el,
  text,
  list,
  when,
  on,
  bind,
  model
});

// =============================================================================
// NAMED EXPORTS
// =============================================================================

export {
  // Selector parsing
  parseSelector,
  resolveSelector,

  // Configuration
  configureDom,
  getDomConfig,
  clearSelectorCache,
  getCacheMetrics,
  resetCacheMetrics,

  // Element creation
  el,
  text,

  // Accessibility
  configureA11y,

  // Reactive bindings
  bind,
  prop,
  cls,
  style,
  on,
  model,

  // List rendering
  list,
  computeLIS,

  // Conditional rendering
  when,
  match,
  show,

  // Lifecycle
  onMount,
  onUnmount,
  mount,
  component,
  getMountContext,
  setMountContext,

  // Advanced features
  portal,
  errorBoundary,
  transition,
  whenTransition
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Element creation
  el,
  text,

  // Accessibility
  configureA11y,

  // Reactive bindings
  bind,
  prop,
  cls,
  style,
  on,
  model,

  // List rendering
  list,

  // Conditional rendering
  when,
  match,
  show,

  // Lifecycle
  onMount,
  onUnmount,
  mount,
  component,

  // Selector parsing
  parseSelector,

  // Advanced features
  portal,
  errorBoundary,
  transition,
  whenTransition,

  // Configuration
  configureDom,
  getDomConfig,
  clearSelectorCache,

  // Diagnostics
  getCacheMetrics,
  resetCacheMetrics
};
