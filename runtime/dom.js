/**
 * Pulse DOM - Declarative DOM manipulation
 *
 * Creates DOM elements using CSS selector-like syntax
 * and provides reactive bindings
 */

import { effect, pulse, batch } from './pulse.js';

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
function parseSelector(selector) {
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
 * Create a reactive list
 */
export function list(getItems, template, keyFn = (item, i) => i) {
  const container = document.createDocumentFragment();
  const startMarker = document.createComment('list-start');
  const endMarker = document.createComment('list-end');

  container.appendChild(startMarker);
  container.appendChild(endMarker);

  let itemNodes = new Map(); // key -> { nodes: Node[], cleanup: Function }

  effect(() => {
    const items = typeof getItems === 'function' ? getItems() : getItems.get();
    const newKeys = new Set();

    // Build new list
    const fragment = document.createDocumentFragment();
    const newItemNodes = new Map();

    items.forEach((item, index) => {
      const key = keyFn(item, index);
      newKeys.add(key);

      if (itemNodes.has(key)) {
        // Reuse existing nodes
        const existing = itemNodes.get(key);
        for (const node of existing.nodes) {
          fragment.appendChild(node);
        }
        newItemNodes.set(key, existing);
      } else {
        // Create new nodes
        const result = template(item, index);
        const nodes = Array.isArray(result) ? result : [result];
        for (const node of nodes) {
          fragment.appendChild(node);
        }
        newItemNodes.set(key, { nodes, cleanup: null });
      }
    });

    // Remove old items
    for (const [key, entry] of itemNodes) {
      if (!newKeys.has(key)) {
        for (const node of entry.nodes) {
          node.remove();
        }
        if (entry.cleanup) entry.cleanup();
      }
    }

    // Clear between markers
    let current = startMarker.nextSibling;
    while (current && current !== endMarker) {
      const next = current.nextSibling;
      current.remove();
      current = next;
    }

    // Insert new fragment
    endMarker.parentNode?.insertBefore(fragment, endMarker);
    itemNodes = newItemNodes;
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
 * Create a component factory
 */
export function component(setup) {
  return (props = {}) => {
    const state = {};
    const methods = {};

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
      model
    };

    return setup(ctx);
  };
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
  parseSelector
};
