/**
 * Pulse DOM - Declarative DOM manipulation
 *
 * Creates DOM elements using CSS selector-like syntax
 * and provides reactive bindings
 */

import { effect, pulse, batch, onCleanup } from './pulse.js';
import { loggers } from './logger.js';

const log = loggers.dom;

// Lifecycle tracking
let mountCallbacks = [];
let unmountCallbacks = [];
let currentMountContext = null;

/**
 * Register a callback to run when component mounts
 */
export function onMount(fn) {
  if (currentMountContext) {
    currentMountContext.mountCallbacks.push(fn);
  } else {
    // Defer to next microtask if no context
    queueMicrotask(fn);
  }
}

/**
 * Register a callback to run when component unmounts
 */
export function onUnmount(fn) {
  if (currentMountContext) {
    currentMountContext.unmountCallbacks.push(fn);
  }
  // Also register with effect cleanup if in an effect
  onCleanup(fn);
}

/**
 * Parse a CSS selector-like string into element configuration
 * Supports: tag, #id, .class, [attr=value]
 *
 * Examples:
 *   "div" -> { tag: "div" }
 *   "#app" -> { tag: "div", id: "app" }
 *   ".container" -> { tag: "div", classes: ["container"] }
 *   "button.primary.large" -> { tag: "button", classes: ["primary", "large"] }
 *   "input[type=text][placeholder=Name]" -> { tag: "input", attrs: { type: "text", placeholder: "Name" } }
 */
export function parseSelector(selector) {
  const config = {
    tag: 'div',
    id: null,
    classes: [],
    attrs: {}
  };

  if (!selector || selector === '') return config;

  // Match tag name at the start
  const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (tagMatch) {
    config.tag = tagMatch[1];
    selector = selector.slice(tagMatch[0].length);
  }

  // Match ID
  const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9-_]*)/);
  if (idMatch) {
    config.id = idMatch[1];
    selector = selector.replace(idMatch[0], '');
  }

  // Match classes
  const classMatches = selector.matchAll(/\.([a-zA-Z][a-zA-Z0-9-_]*)/g);
  for (const match of classMatches) {
    config.classes.push(match[1]);
  }

  // Match attributes
  const attrMatches = selector.matchAll(/\[([a-zA-Z][a-zA-Z0-9-_]*)(?:=([^\]]+))?\]/g);
  for (const match of attrMatches) {
    const key = match[1];
    let value = match[2] || '';
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    config.attrs[key] = value;
  }

  return config;
}

/**
 * Create a DOM element from a selector
 */
export function el(selector, ...children) {
  const config = parseSelector(selector);
  const element = document.createElement(config.tag);

  if (config.id) {
    element.id = config.id;
  }

  if (config.classes.length > 0) {
    element.className = config.classes.join(' ');
  }

  for (const [key, value] of Object.entries(config.attrs)) {
    element.setAttribute(key, value);
  }

  // Process children
  for (const child of children) {
    appendChild(element, child);
  }

  return element;
}

/**
 * Append a child to an element, handling various types
 */
function appendChild(parent, child) {
  if (child == null || child === false) return;

  if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(String(child)));
  } else if (child instanceof Node) {
    parent.appendChild(child);
  } else if (Array.isArray(child)) {
    for (const c of child) {
      appendChild(parent, c);
    }
  } else if (typeof child === 'function') {
    // Reactive child - create a placeholder and update it
    const placeholder = document.createComment('pulse');
    parent.appendChild(placeholder);
    let currentNodes = [];

    effect(() => {
      const result = child();

      // Remove old nodes
      for (const node of currentNodes) {
        node.remove();
      }
      currentNodes = [];

      // Add new nodes
      if (result != null && result !== false) {
        const fragment = document.createDocumentFragment();
        if (typeof result === 'string' || typeof result === 'number') {
          const textNode = document.createTextNode(String(result));
          fragment.appendChild(textNode);
          currentNodes.push(textNode);
        } else if (result instanceof Node) {
          fragment.appendChild(result);
          currentNodes.push(result);
        } else if (Array.isArray(result)) {
          for (const r of result) {
            if (r instanceof Node) {
              fragment.appendChild(r);
              currentNodes.push(r);
            } else if (r != null && r !== false) {
              const textNode = document.createTextNode(String(r));
              fragment.appendChild(textNode);
              currentNodes.push(textNode);
            }
          }
        }
        placeholder.parentNode.insertBefore(fragment, placeholder.nextSibling);
      }
    });
  }
}

/**
 * Create a reactive text node
 */
export function text(getValue) {
  if (typeof getValue === 'function') {
    const node = document.createTextNode('');
    effect(() => {
      node.textContent = String(getValue());
    });
    return node;
  }
  return document.createTextNode(String(getValue));
}

/**
 * Bind an attribute reactively
 */
export function bind(element, attr, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      const value = getValue();
      if (value == null || value === false) {
        element.removeAttribute(attr);
      } else if (value === true) {
        element.setAttribute(attr, '');
      } else {
        element.setAttribute(attr, String(value));
      }
    });
  } else {
    element.setAttribute(attr, String(getValue));
  }
  return element;
}

/**
 * Bind a property reactively
 */
export function prop(element, propName, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      element[propName] = getValue();
    });
  } else {
    element[propName] = getValue;
  }
  return element;
}

/**
 * Bind CSS class reactively
 */
export function cls(element, className, condition) {
  if (typeof condition === 'function') {
    effect(() => {
      if (condition()) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    });
  } else if (condition) {
    element.classList.add(className);
  }
  return element;
}

/**
 * Bind style property reactively
 */
export function style(element, prop, getValue) {
  if (typeof getValue === 'function') {
    effect(() => {
      element.style[prop] = getValue();
    });
  } else {
    element.style[prop] = getValue;
  }
  return element;
}

/**
 * Attach an event listener
 */
export function on(element, event, handler, options) {
  element.addEventListener(event, handler, options);
  return element;
}

/**
 * Create a reactive list with efficient keyed diffing
 */
export function list(getItems, template, keyFn = (item, i) => i) {
  const container = document.createDocumentFragment();
  const startMarker = document.createComment('list-start');
  const endMarker = document.createComment('list-end');

  container.appendChild(startMarker);
  container.appendChild(endMarker);

  // Map: key -> { nodes: Node[], cleanup: Function, item: any }
  let itemNodes = new Map();
  let keyOrder = []; // Track order of keys for diffing

  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    const itemsArray = Array.isArray(items) ? items : Array.from(items);

    const newKeys = [];
    const newItemNodes = new Map();

    // Build map of new items by key
    itemsArray.forEach((item, index) => {
      const key = keyFn(item, index);
      newKeys.push(key);

      if (itemNodes.has(key)) {
        // Reuse existing entry
        newItemNodes.set(key, itemNodes.get(key));
      } else {
        // Create new nodes
        const result = template(item, index);
        const nodes = Array.isArray(result) ? result : [result];
        newItemNodes.set(key, { nodes, cleanup: null, item });
      }
    });

    // Remove items that are no longer present
    for (const [key, entry] of itemNodes) {
      if (!newItemNodes.has(key)) {
        for (const node of entry.nodes) {
          node.remove();
        }
        if (entry.cleanup) entry.cleanup();
      }
    }

    // Efficient reordering using minimal DOM operations
    // Use a simple diff algorithm: iterate through new order and move/insert as needed
    let prevNode = startMarker;

    for (let i = 0; i < newKeys.length; i++) {
      const key = newKeys[i];
      const entry = newItemNodes.get(key);
      const firstNode = entry.nodes[0];

      // Check if node is already in correct position
      if (prevNode.nextSibling !== firstNode) {
        // Need to move/insert
        for (const node of entry.nodes) {
          prevNode.parentNode?.insertBefore(node, prevNode.nextSibling);
          prevNode = node;
        }
      } else {
        // Already in position, just advance prevNode
        prevNode = entry.nodes[entry.nodes.length - 1];
      }
    }

    itemNodes = newItemNodes;
    keyOrder = newKeys;
  });

  return container;
}

/**
 * Conditional rendering
 */
export function when(condition, thenTemplate, elseTemplate = null) {
  const container = document.createDocumentFragment();
  const marker = document.createComment('when');
  container.appendChild(marker);

  let currentNodes = [];
  let currentCleanup = null;

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition.get();

    // Cleanup previous
    for (const node of currentNodes) {
      node.remove();
    }
    if (currentCleanup) currentCleanup();
    currentNodes = [];
    currentCleanup = null;

    // Render new
    const template = show ? thenTemplate : elseTemplate;
    if (template) {
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    }
  });

  return container;
}

/**
 * Switch/case rendering
 */
export function match(getValue, cases) {
  const marker = document.createComment('match');
  let currentNodes = [];

  effect(() => {
    const value = typeof getValue === 'function' ? getValue() : getValue.get();

    // Remove old nodes
    for (const node of currentNodes) {
      node.remove();
    }
    currentNodes = [];

    // Find matching case
    const template = cases[value] ?? cases.default;
    if (template) {
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    }
  });

  return marker;
}

/**
 * Two-way binding for form inputs
 */
export function model(element, pulseValue) {
  const tagName = element.tagName.toLowerCase();
  const type = element.type?.toLowerCase();

  if (tagName === 'input' && (type === 'checkbox' || type === 'radio')) {
    // Checkbox/Radio
    effect(() => {
      element.checked = pulseValue.get();
    });
    element.addEventListener('change', () => {
      pulseValue.set(element.checked);
    });
  } else if (tagName === 'select') {
    // Select
    effect(() => {
      element.value = pulseValue.get();
    });
    element.addEventListener('change', () => {
      pulseValue.set(element.value);
    });
  } else {
    // Text input, textarea, etc.
    effect(() => {
      if (element.value !== pulseValue.get()) {
        element.value = pulseValue.get();
      }
    });
    element.addEventListener('input', () => {
      pulseValue.set(element.value);
    });
  }

  return element;
}

/**
 * Mount an element to a target
 */
export function mount(target, element) {
  if (typeof target === 'string') {
    target = document.querySelector(target);
  }
  if (!target) {
    throw new Error('Mount target not found');
  }
  target.appendChild(element);
  return () => {
    element.remove();
  };
}

/**
 * Create a component factory with lifecycle support
 */
export function component(setup) {
  return (props = {}) => {
    const state = {};
    const methods = {};

    // Create mount context for lifecycle hooks
    const mountContext = {
      mountCallbacks: [],
      unmountCallbacks: []
    };

    const prevContext = currentMountContext;
    currentMountContext = mountContext;

    const ctx = {
      state,
      methods,
      props,
      pulse,
      el,
      text,
      list,
      when,
      on,
      bind,
      model,
      onMount,
      onUnmount
    };

    let result;
    try {
      result = setup(ctx);
    } finally {
      currentMountContext = prevContext;
    }

    // Schedule mount callbacks after DOM insertion
    if (mountContext.mountCallbacks.length > 0) {
      queueMicrotask(() => {
        for (const cb of mountContext.mountCallbacks) {
          try {
            cb();
          } catch (e) {
            log.error('Mount callback error:', e);
          }
        }
      });
    }

    // Store unmount callbacks on the element for later cleanup
    if (result instanceof Node && mountContext.unmountCallbacks.length > 0) {
      result._pulseUnmount = mountContext.unmountCallbacks;
    }

    return result;
  };
}

/**
 * Toggle element visibility without removing from DOM
 * Unlike when(), this keeps the element in the DOM but hides it
 */
export function show(condition, element) {
  effect(() => {
    const shouldShow = typeof condition === 'function' ? condition() : condition.get();
    element.style.display = shouldShow ? '' : 'none';
  });
  return element;
}

/**
 * Portal - render children into a different DOM location
 */
export function portal(children, target) {
  const resolvedTarget = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!resolvedTarget) {
    log.warn('Portal target not found:', target);
    return document.createComment('portal-target-not-found');
  }

  const marker = document.createComment('portal');
  let mountedNodes = [];

  // Handle reactive children
  if (typeof children === 'function') {
    effect(() => {
      // Cleanup previous nodes
      for (const node of mountedNodes) {
        node.remove();
        if (node._pulseUnmount) {
          for (const cb of node._pulseUnmount) cb();
        }
      }
      mountedNodes = [];

      const result = children();
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        for (const node of nodes) {
          if (node instanceof Node) {
            resolvedTarget.appendChild(node);
            mountedNodes.push(node);
          }
        }
      }
    });
  } else {
    // Static children
    const nodes = Array.isArray(children) ? children : [children];
    for (const node of nodes) {
      if (node instanceof Node) {
        resolvedTarget.appendChild(node);
        mountedNodes.push(node);
      }
    }
  }

  // Return marker for position tracking, attach cleanup
  marker._pulseUnmount = [() => {
    for (const node of mountedNodes) {
      node.remove();
      if (node._pulseUnmount) {
        for (const cb of node._pulseUnmount) cb();
      }
    }
  }];

  return marker;
}

/**
 * Error boundary - catch errors in child components
 */
export function errorBoundary(children, fallback) {
  const container = document.createDocumentFragment();
  const marker = document.createComment('error-boundary');
  container.appendChild(marker);

  const error = pulse(null);
  let currentNodes = [];

  const renderContent = () => {
    // Cleanup previous
    for (const node of currentNodes) {
      node.remove();
    }
    currentNodes = [];

    const hasError = error.peek();

    try {
      let result;
      if (hasError && fallback) {
        result = typeof fallback === 'function' ? fallback(hasError) : fallback;
      } else {
        result = typeof children === 'function' ? children() : children;
      }

      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            fragment.appendChild(node);
            currentNodes.push(node);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    } catch (e) {
      log.error('Error in component:', e);
      error.set(e);
      // Re-render with error
      if (!hasError) {
        queueMicrotask(renderContent);
      }
    }
  };

  effect(renderContent);

  // Expose reset method on marker
  marker.resetError = () => error.set(null);

  return container;
}

/**
 * Transition helper - animate element enter/exit
 */
export function transition(element, options = {}) {
  const {
    enter = 'fade-in',
    exit = 'fade-out',
    duration = 300,
    onEnter,
    onExit
  } = options;

  // Apply enter animation
  const applyEnter = () => {
    element.classList.add(enter);
    if (onEnter) onEnter(element);
    setTimeout(() => {
      element.classList.remove(enter);
    }, duration);
  };

  // Apply exit animation and return promise
  const applyExit = () => {
    return new Promise(resolve => {
      element.classList.add(exit);
      if (onExit) onExit(element);
      setTimeout(() => {
        element.classList.remove(exit);
        resolve();
      }, duration);
    });
  };

  // Apply enter on mount
  queueMicrotask(applyEnter);

  // Attach exit method
  element._pulseTransitionExit = applyExit;

  return element;
}

/**
 * Conditional rendering with transitions
 */
export function whenTransition(condition, thenTemplate, elseTemplate = null, options = {}) {
  const container = document.createDocumentFragment();
  const marker = document.createComment('when-transition');
  container.appendChild(marker);

  const { duration = 300, enterClass = 'fade-in', exitClass = 'fade-out' } = options;

  let currentNodes = [];
  let isTransitioning = false;

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition.get();

    if (isTransitioning) return;

    const template = show ? thenTemplate : elseTemplate;

    // Exit animation for current nodes
    if (currentNodes.length > 0) {
      isTransitioning = true;
      const nodesToRemove = [...currentNodes];
      currentNodes = [];

      for (const node of nodesToRemove) {
        node.classList.add(exitClass);
      }

      setTimeout(() => {
        for (const node of nodesToRemove) {
          node.remove();
        }
        isTransitioning = false;

        // Render new content
        if (template) {
          const result = typeof template === 'function' ? template() : template;
          if (result) {
            const nodes = Array.isArray(result) ? result : [result];
            const fragment = document.createDocumentFragment();
            for (const node of nodes) {
              if (node instanceof Node) {
                node.classList.add(enterClass);
                fragment.appendChild(node);
                currentNodes.push(node);
                setTimeout(() => node.classList.remove(enterClass), duration);
              }
            }
            marker.parentNode?.insertBefore(fragment, marker.nextSibling);
          }
        }
      }, duration);
    } else if (template) {
      // No previous content, just render with enter animation
      const result = typeof template === 'function' ? template() : template;
      if (result) {
        const nodes = Array.isArray(result) ? result : [result];
        const fragment = document.createDocumentFragment();
        for (const node of nodes) {
          if (node instanceof Node) {
            node.classList.add(enterClass);
            fragment.appendChild(node);
            currentNodes.push(node);
            setTimeout(() => node.classList.remove(enterClass), duration);
          }
        }
        marker.parentNode?.insertBefore(fragment, marker.nextSibling);
      }
    }
  });

  return container;
}

export default {
  el,
  text,
  bind,
  prop,
  cls,
  style,
  on,
  list,
  when,
  match,
  model,
  mount,
  component,
  parseSelector,
  // New features
  onMount,
  onUnmount,
  show,
  portal,
  errorBoundary,
  transition,
  whenTransition
};
