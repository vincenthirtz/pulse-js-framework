/**
 * Pulse DOM Adapter - Abstraction layer for DOM operations
 *
 * This module provides a pluggable DOM abstraction that enables:
 * - Server-Side Rendering (SSR) with virtual DOM implementations
 * - Simplified testing without browser environment or heavy mocks
 * - Platform-specific optimizations
 *
 * The adapter pattern decouples Pulse from direct browser DOM dependencies,
 * allowing the same reactive code to run in Node.js, Deno, or custom environments.
 */

// ============================================================================
// DOM Adapter Interface
// ============================================================================

/**
 * Abstract DOM adapter interface.
 * Implementations must provide all methods for DOM manipulation.
 *
 * @interface DOMAdapter
 */

/**
 * @typedef {Object} DOMAdapter
 * @property {function(string): Element} createElement - Create an element
 * @property {function(string): Text} createTextNode - Create a text node
 * @property {function(string): Comment} createComment - Create a comment node
 * @property {function(): DocumentFragment} createDocumentFragment - Create a fragment
 * @property {function(string): Element|null} querySelector - Query the document
 * @property {function(Element, string, string): void} setAttribute - Set attribute
 * @property {function(Element, string): void} removeAttribute - Remove attribute
 * @property {function(Element, string): string|null} getAttribute - Get attribute
 * @property {function(Node, Node): void} appendChild - Append child to parent
 * @property {function(Node, Node, Node): void} insertBefore - Insert before reference
 * @property {function(Node): void} removeNode - Remove node from parent
 * @property {function(Node): Node|null} getParentNode - Get parent node
 * @property {function(Node): Node|null} getNextSibling - Get next sibling
 * @property {function(Node): Node|null} getFirstChild - Get first child
 * @property {function(Element, string): void} addClass - Add CSS class
 * @property {function(Element, string): void} removeClass - Remove CSS class
 * @property {function(Element, string, *): void} setStyle - Set style property
 * @property {function(Element, string): *} getStyle - Get style property
 * @property {function(Element, string, *): void} setProperty - Set DOM property
 * @property {function(Element, string): *} getProperty - Get DOM property
 * @property {function(Element, string, Function, Object=): void} addEventListener - Add event listener
 * @property {function(Element, string, Function, Object=): void} removeEventListener - Remove event listener
 * @property {function(Node, string): void} setTextContent - Set text content
 * @property {function(Node): string} getTextContent - Get text content
 * @property {function(*): boolean} isNode - Check if value is a Node
 * @property {function(*): boolean} isElement - Check if value is an Element
 * @property {function(Function): void} queueMicrotask - Queue a microtask
 * @property {function(Function, number): number} setTimeout - Set timeout
 * @property {function(number): void} clearTimeout - Clear timeout
 */

// ============================================================================
// Browser DOM Adapter
// ============================================================================

/**
 * Browser DOM adapter - default implementation using native browser APIs.
 * This is the production adapter for client-side rendering.
 *
 * @implements {DOMAdapter}
 */
export class BrowserDOMAdapter {
  /**
   * Create an element with the specified tag name.
   * @param {string} tagName - The tag name (e.g., 'div', 'span')
   * @returns {Element} The created element
   */
  createElement(tagName) {
    return document.createElement(tagName);
  }

  /**
   * Create a text node with the specified content.
   * @param {string} text - The text content
   * @returns {Text} The created text node
   */
  createTextNode(text) {
    return document.createTextNode(text);
  }

  /**
   * Create a comment node with the specified content.
   * @param {string} data - The comment content
   * @returns {Comment} The created comment node
   */
  createComment(data) {
    return document.createComment(data);
  }

  /**
   * Create a document fragment for batched DOM operations.
   * @returns {DocumentFragment} The created fragment
   */
  createDocumentFragment() {
    return document.createDocumentFragment();
  }

  /**
   * Query the document for an element matching the selector.
   * @param {string} selector - CSS selector
   * @returns {Element|null} The matched element or null
   */
  querySelector(selector) {
    return document.querySelector(selector);
  }

  /**
   * Set an attribute on an element.
   * @param {Element} element - Target element
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   */
  setAttribute(element, name, value) {
    element.setAttribute(name, value);
  }

  /**
   * Remove an attribute from an element.
   * @param {Element} element - Target element
   * @param {string} name - Attribute name
   */
  removeAttribute(element, name) {
    element.removeAttribute(name);
  }

  /**
   * Get an attribute value from an element.
   * @param {Element} element - Target element
   * @param {string} name - Attribute name
   * @returns {string|null} The attribute value or null
   */
  getAttribute(element, name) {
    return element.getAttribute(name);
  }

  /**
   * Append a child node to a parent.
   * @param {Node} parent - Parent node
   * @param {Node} child - Child node to append
   */
  appendChild(parent, child) {
    parent.appendChild(child);
  }

  /**
   * Insert a node before a reference node.
   * @param {Node} parent - Parent node
   * @param {Node} newNode - Node to insert
   * @param {Node} refNode - Reference node (insert before this)
   */
  insertBefore(parent, newNode, refNode) {
    parent.insertBefore(newNode, refNode);
  }

  /**
   * Remove a node from its parent.
   * @param {Node} node - Node to remove
   */
  removeNode(node) {
    node.remove();
  }

  /**
   * Get the parent node of a node.
   * @param {Node} node - Target node
   * @returns {Node|null} The parent node or null
   */
  getParentNode(node) {
    return node.parentNode;
  }

  /**
   * Get the next sibling of a node.
   * @param {Node} node - Target node
   * @returns {Node|null} The next sibling or null
   */
  getNextSibling(node) {
    return node.nextSibling;
  }

  /**
   * Get the first child of a node.
   * @param {Node} node - Target node
   * @returns {Node|null} The first child or null
   */
  getFirstChild(node) {
    return node.firstChild;
  }

  /**
   * Add a CSS class to an element.
   * @param {Element} element - Target element
   * @param {string} className - Class name to add
   */
  addClass(element, className) {
    element.classList.add(className);
  }

  /**
   * Remove a CSS class from an element.
   * @param {Element} element - Target element
   * @param {string} className - Class name to remove
   */
  removeClass(element, className) {
    element.classList.remove(className);
  }

  /**
   * Set a style property on an element.
   * @param {Element} element - Target element
   * @param {string} prop - Style property name
   * @param {*} value - Style value
   */
  setStyle(element, prop, value) {
    element.style[prop] = value;
  }

  /**
   * Get a style property from an element.
   * @param {Element} element - Target element
   * @param {string} prop - Style property name
   * @returns {*} The style value
   */
  getStyle(element, prop) {
    return element.style[prop];
  }

  /**
   * Set a DOM property on an element.
   * @param {Element} element - Target element
   * @param {string} prop - Property name
   * @param {*} value - Property value
   */
  setProperty(element, prop, value) {
    element[prop] = value;
  }

  /**
   * Get a DOM property from an element.
   * @param {Element} element - Target element
   * @param {string} prop - Property name
   * @returns {*} The property value
   */
  getProperty(element, prop) {
    return element[prop];
  }

  /**
   * Add an event listener to an element.
   * @param {Element} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event listener options
   */
  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
  }

  /**
   * Remove an event listener from an element.
   * @param {Element} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} [options] - Event listener options
   */
  removeEventListener(element, event, handler, options) {
    element.removeEventListener(event, handler, options);
  }

  /**
   * Set the text content of a node.
   * @param {Node} node - Target node
   * @param {string} text - Text content
   */
  setTextContent(node, text) {
    node.textContent = text;
  }

  /**
   * Get the text content of a node.
   * @param {Node} node - Target node
   * @returns {string} The text content
   */
  getTextContent(node) {
    return node.textContent;
  }

  /**
   * Check if a value is a Node.
   * @param {*} value - Value to check
   * @returns {boolean} True if value is a Node
   */
  isNode(value) {
    return value instanceof Node;
  }

  /**
   * Check if a value is an Element.
   * @param {*} value - Value to check
   * @returns {boolean} True if value is an Element
   */
  isElement(value) {
    return value instanceof Element;
  }

  /**
   * Queue a function to run as a microtask.
   * @param {Function} fn - Function to queue
   */
  queueMicrotask(fn) {
    queueMicrotask(fn);
  }

  /**
   * Set a timeout.
   * @param {Function} fn - Function to call
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timer ID
   */
  setTimeout(fn, delay) {
    return setTimeout(fn, delay);
  }

  /**
   * Clear a timeout.
   * @param {number} timerId - Timer ID to clear
   */
  clearTimeout(timerId) {
    clearTimeout(timerId);
  }

  /**
   * Get the tag name of an element (lowercase).
   * @param {Element} element - Target element
   * @returns {string} The tag name
   */
  getTagName(element) {
    return element.tagName.toLowerCase();
  }

  /**
   * Get the type attribute of an input element.
   * @param {Element} element - Target element
   * @returns {string|undefined} The type attribute
   */
  getInputType(element) {
    return element.type?.toLowerCase();
  }
}

// ============================================================================
// Mock DOM Adapter for Testing
// ============================================================================

/**
 * Simple mock node for testing without a browser environment.
 * Provides minimal DOM-like interface for unit tests.
 */
export class MockNode {
  constructor(type, data = '') {
    this.nodeType = type;
    this.nodeName = '';
    this.textContent = data;
    this.parentNode = null;
    this.childNodes = [];
    this.nextSibling = null;
    this.previousSibling = null;
    this._eventListeners = new Map();
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    if (this.childNodes.length > 0) {
      const lastChild = this.childNodes[this.childNodes.length - 1];
      lastChild.nextSibling = child;
      child.previousSibling = lastChild;
    }
    child.nextSibling = null;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(newNode, refNode) {
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }
    const index = refNode ? this.childNodes.indexOf(refNode) : this.childNodes.length;
    if (index === -1) {
      return this.appendChild(newNode);
    }

    newNode.parentNode = this;
    this.childNodes.splice(index, 0, newNode);

    // Update sibling references
    this._updateSiblings();
    return newNode;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      child.parentNode = null;
      this._updateSiblings();
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  _updateSiblings() {
    for (let i = 0; i < this.childNodes.length; i++) {
      const node = this.childNodes[i];
      node.previousSibling = this.childNodes[i - 1] || null;
      node.nextSibling = this.childNodes[i + 1] || null;
    }
  }

  addEventListener(event, handler, options) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event).push({ handler, options });
  }

  removeEventListener(event, handler, options) {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    const listeners = this._eventListeners.get(event.type);
    if (listeners) {
      for (const { handler } of listeners) {
        handler(event);
      }
    }
  }
}

/**
 * Mock Element extending MockNode with element-specific features.
 */
export class MockElement extends MockNode {
  constructor(tagName) {
    super(1); // Element node type
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.id = '';
    this.className = '';
    this._attributes = new Map();
    this._style = {};
    this.type = undefined;
    this.value = '';
    this.checked = false;
  }

  get classList() {
    const self = this;
    return {
      add(className) {
        const classes = self.className ? self.className.split(' ') : [];
        if (!classes.includes(className)) {
          classes.push(className);
          self.className = classes.join(' ');
        }
      },
      remove(className) {
        const classes = self.className ? self.className.split(' ') : [];
        const index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          self.className = classes.join(' ');
        }
      },
      contains(className) {
        const classes = self.className ? self.className.split(' ') : [];
        return classes.includes(className);
      },
      toggle(className, force) {
        if (force === undefined) {
          force = !this.contains(className);
        }
        if (force) {
          this.add(className);
        } else {
          this.remove(className);
        }
        return force;
      }
    };
  }

  get style() {
    return this._style;
  }

  setAttribute(name, value) {
    this._attributes.set(name, String(value));
    if (name === 'id') this.id = value;
    if (name === 'class') this.className = value;
    if (name === 'type') this.type = value;
  }

  getAttribute(name) {
    return this._attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this._attributes.delete(name);
    if (name === 'id') this.id = '';
    if (name === 'class') this.className = '';
  }

  hasAttribute(name) {
    return this._attributes.has(name);
  }

  getAttributeNames() {
    return Array.from(this._attributes.keys());
  }
}

/**
 * Mock Text node for testing.
 */
export class MockTextNode extends MockNode {
  constructor(text) {
    super(3); // Text node type
    this.nodeName = '#text';
    this.textContent = text;
    this.data = text;
  }
}

/**
 * Mock Comment node for testing.
 */
export class MockCommentNode extends MockNode {
  constructor(data) {
    super(8); // Comment node type
    this.nodeName = '#comment';
    this.textContent = data;
    this.data = data;
  }
}

/**
 * Mock DocumentFragment for testing.
 */
export class MockDocumentFragment extends MockNode {
  constructor() {
    super(11); // Document fragment node type
    this.nodeName = '#document-fragment';
  }
}

/**
 * Mock DOM adapter for testing without browser environment.
 * Provides a lightweight, synchronous DOM simulation.
 *
 * @implements {DOMAdapter}
 */
export class MockDOMAdapter {
  constructor() {
    this._document = new MockElement('html');
    this._body = new MockElement('body');
    this._document.appendChild(this._body);
    this._timers = new Map();
    this._timerIdCounter = 0;
    this._microtaskQueue = [];
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  createTextNode(text) {
    return new MockTextNode(text);
  }

  createComment(data) {
    return new MockCommentNode(data);
  }

  createDocumentFragment() {
    return new MockDocumentFragment();
  }

  querySelector(selector) {
    // Simple selector matching for testing
    // In production, you'd want a more complete implementation
    return this._findElement(this._body, selector);
  }

  _findElement(root, selector) {
    // Basic ID selector support
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this._findById(root, id);
    }
    // Basic class selector support
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return this._findByClass(root, className);
    }
    // Basic tag selector support
    return this._findByTag(root, selector);
  }

  _findById(node, id) {
    if (node.id === id) return node;
    for (const child of node.childNodes || []) {
      const found = this._findById(child, id);
      if (found) return found;
    }
    return null;
  }

  _findByClass(node, className) {
    if (node.classList?.contains(className)) return node;
    for (const child of node.childNodes || []) {
      const found = this._findByClass(child, className);
      if (found) return found;
    }
    return null;
  }

  _findByTag(node, tagName) {
    if (node.tagName?.toLowerCase() === tagName.toLowerCase()) return node;
    for (const child of node.childNodes || []) {
      const found = this._findByTag(child, tagName);
      if (found) return found;
    }
    return null;
  }

  setAttribute(element, name, value) {
    element.setAttribute(name, value);
  }

  removeAttribute(element, name) {
    element.removeAttribute(name);
  }

  getAttribute(element, name) {
    return element.getAttribute(name);
  }

  appendChild(parent, child) {
    // Handle DocumentFragment - move all children
    if (child instanceof MockDocumentFragment) {
      const children = [...child.childNodes];
      for (const c of children) {
        parent.appendChild(c);
      }
      return child;
    }
    return parent.appendChild(child);
  }

  insertBefore(parent, newNode, refNode) {
    // Handle DocumentFragment - move all children
    if (newNode instanceof MockDocumentFragment) {
      const children = [...newNode.childNodes];
      for (const c of children) {
        parent.insertBefore(c, refNode);
      }
      return newNode;
    }
    return parent.insertBefore(newNode, refNode);
  }

  removeNode(node) {
    node.remove();
  }

  getParentNode(node) {
    return node.parentNode;
  }

  getNextSibling(node) {
    return node.nextSibling;
  }

  getFirstChild(node) {
    return node.firstChild;
  }

  addClass(element, className) {
    element.classList.add(className);
  }

  removeClass(element, className) {
    element.classList.remove(className);
  }

  setStyle(element, prop, value) {
    element.style[prop] = value;
  }

  getStyle(element, prop) {
    return element.style[prop];
  }

  setProperty(element, prop, value) {
    element[prop] = value;
  }

  getProperty(element, prop) {
    return element[prop];
  }

  addEventListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
  }

  removeEventListener(element, event, handler, options) {
    element.removeEventListener(event, handler, options);
  }

  setTextContent(node, text) {
    node.textContent = text;
    if (node.data !== undefined) {
      node.data = text;
    }
  }

  getTextContent(node) {
    return node.textContent;
  }

  isNode(value) {
    return value instanceof MockNode;
  }

  isElement(value) {
    return value instanceof MockElement;
  }

  queueMicrotask(fn) {
    this._microtaskQueue.push(fn);
  }

  setTimeout(fn, delay) {
    const id = ++this._timerIdCounter;
    this._timers.set(id, { fn, delay, type: 'timeout' });
    return id;
  }

  clearTimeout(timerId) {
    this._timers.delete(timerId);
  }

  getTagName(element) {
    return element.tagName.toLowerCase();
  }

  getInputType(element) {
    return element.type?.toLowerCase();
  }

  // Test helpers

  /**
   * Flush all pending microtasks (synchronously for testing).
   */
  flushMicrotasks() {
    while (this._microtaskQueue.length > 0) {
      const fn = this._microtaskQueue.shift();
      fn();
    }
  }

  /**
   * Run all pending timeouts (synchronously for testing).
   */
  runAllTimers() {
    for (const [id, { fn }] of this._timers) {
      fn();
      this._timers.delete(id);
    }
  }

  /**
   * Get the mock document body for inspection.
   */
  getBody() {
    return this._body;
  }

  /**
   * Reset the mock DOM state.
   */
  reset() {
    this._body.childNodes = [];
    this._timers.clear();
    this._microtaskQueue = [];
  }
}

// ============================================================================
// Global Adapter Management
// ============================================================================

/**
 * The currently active DOM adapter.
 * Defaults to BrowserDOMAdapter in browser environments.
 * @type {DOMAdapter}
 */
let activeAdapter = null;

/**
 * Get the currently active DOM adapter.
 * Lazily initializes BrowserDOMAdapter if in browser environment.
 *
 * @returns {DOMAdapter} The active DOM adapter
 * @throws {Error} If no adapter is set and not in browser environment
 */
export function getAdapter() {
  if (!activeAdapter) {
    // Auto-initialize in browser environment
    if (typeof document !== 'undefined') {
      activeAdapter = new BrowserDOMAdapter();
    } else {
      throw new Error(
        '[Pulse] No DOM adapter configured. ' +
        'In non-browser environments, call setAdapter() with a MockDOMAdapter or custom implementation.'
      );
    }
  }
  return activeAdapter;
}

/**
 * Set the active DOM adapter.
 * Use this to configure SSR, testing, or custom rendering targets.
 *
 * @param {DOMAdapter} adapter - The adapter to use
 *
 * @example
 * // For SSR
 * import { setAdapter, MockDOMAdapter } from 'pulse-js-framework/runtime/dom-adapter';
 * setAdapter(new MockDOMAdapter());
 *
 * // For testing
 * beforeEach(() => {
 *   setAdapter(new MockDOMAdapter());
 * });
 */
export function setAdapter(adapter) {
  activeAdapter = adapter;
}

/**
 * Reset the adapter to browser default (or null in non-browser).
 * Useful for cleanup after tests.
 */
export function resetAdapter() {
  activeAdapter = null;
}

/**
 * Run a function with a temporary DOM adapter.
 * The previous adapter is restored after the function completes.
 *
 * @param {DOMAdapter} adapter - The adapter to use temporarily
 * @param {Function} fn - The function to run
 * @returns {*} The return value of fn
 *
 * @example
 * const result = withAdapter(new MockDOMAdapter(), () => {
 *   return el('div.test', 'Hello');
 * });
 */
export function withAdapter(adapter, fn) {
  const prevAdapter = activeAdapter;
  activeAdapter = adapter;
  try {
    return fn();
  } finally {
    activeAdapter = prevAdapter;
  }
}

// ============================================================================
// Enhanced Mock Classes for Testing
// ============================================================================

/**
 * Mock Canvas 2D rendering context for color parsing in a11y tests.
 */
export class MockCanvasContext {
  constructor() {
    this.fillStyle = '#000000';
    this._imageData = new Uint8ClampedArray([0, 0, 0, 255]);
  }

  fillRect(x, y, width, height) {
    // Parse fillStyle to RGB and store in imageData
    const color = this._parseColor(this.fillStyle);
    this._imageData[0] = color.r;
    this._imageData[1] = color.g;
    this._imageData[2] = color.b;
    this._imageData[3] = 255;
  }

  getImageData(x, y, width, height) {
    return { data: this._imageData };
  }

  /**
   * Parse CSS color to RGB values.
   * Supports: hex (#fff, #ffffff), rgb(), rgba(), named colors
   */
  _parseColor(color) {
    if (!color || color === 'transparent') {
      return { r: 0, g: 0, b: 0 };
    }

    // Hex colors
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    // rgb() and rgba()
    const rgbMatch = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    // Named colors (common subset)
    const namedColors = {
      white: { r: 255, g: 255, b: 255 },
      black: { r: 0, g: 0, b: 0 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      orange: { r: 255, g: 165, b: 0 },
      gray: { r: 128, g: 128, b: 128 },
      grey: { r: 128, g: 128, b: 128 }
    };

    return namedColors[color.toLowerCase()] || { r: 0, g: 0, b: 0 };
  }
}

/**
 * Mock MediaQueryList for matchMedia() testing.
 */
export class MockMediaQueryList {
  constructor(query, matches = false) {
    this.media = query;
    this.matches = matches;
    this._listeners = [];
  }

  addEventListener(event, listener) {
    if (event === 'change') {
      this._listeners.push(listener);
    }
  }

  removeEventListener(event, listener) {
    if (event === 'change') {
      const index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    }
  }

  /**
   * Simulate a media query change (for testing).
   */
  _setMatches(matches) {
    if (this.matches !== matches) {
      this.matches = matches;
      const event = { matches, media: this.media };
      this._listeners.forEach(listener => listener(event));
    }
  }

  // Deprecated but still used in some code
  addListener(listener) {
    this.addEventListener('change', listener);
  }

  removeListener(listener) {
    this.removeEventListener('change', listener);
  }
}

/**
 * Mock MutationObserver for DOM change tracking.
 */
export class MockMutationObserver {
  constructor(callback) {
    this._callback = callback;
    this._observing = false;
    this._target = null;
    this._options = null;
    this._mutations = [];
  }

  observe(target, options) {
    this._observing = true;
    this._target = target;
    this._options = options;
  }

  disconnect() {
    this._observing = false;
    this._target = null;
    this._options = null;
  }

  takeRecords() {
    const records = [...this._mutations];
    this._mutations = [];
    return records;
  }

  /**
   * Simulate a mutation (for testing).
   */
  _trigger(mutations) {
    if (this._observing && this._callback) {
      this._mutations.push(...mutations);
      this._callback(mutations, this);
    }
  }
}

/**
 * Mock Performance API.
 */
export class MockPerformance {
  constructor() {
    this._startTime = Date.now();
    this._marks = new Map();
    this._measures = new Map();
  }

  now() {
    return Date.now() - this._startTime;
  }

  mark(name) {
    this._marks.set(name, this.now());
  }

  measure(name, startMark, endMark) {
    const start = this._marks.get(startMark) || 0;
    const end = this._marks.get(endMark) || this.now();
    this._measures.set(name, { name, duration: end - start, startTime: start });
  }

  getEntriesByName(name) {
    const measure = this._measures.get(name);
    return measure ? [measure] : [];
  }

  clearMarks(name) {
    if (name) {
      this._marks.delete(name);
    } else {
      this._marks.clear();
    }
  }

  clearMeasures(name) {
    if (name) {
      this._measures.delete(name);
    } else {
      this._measures.clear();
    }
  }
}

/**
 * Mock computed style object.
 */
export class MockCSSStyleDeclaration {
  constructor(styles = {}) {
    // Default visible styles
    this.display = styles.display || 'block';
    this.visibility = styles.visibility || 'visible';
    this.color = styles.color || 'rgb(0, 0, 0)';
    this.backgroundColor = styles.backgroundColor || 'rgba(0, 0, 0, 0)';
    this.fontSize = styles.fontSize || '16px';
    this.fontWeight = styles.fontWeight || '400';
    this.position = styles.position || 'static';
    this.width = styles.width || 'auto';
    this.height = styles.height || 'auto';

    // Allow custom styles
    Object.assign(this, styles);
  }
}

/**
 * Mock Window object for global browser APIs.
 */
export class MockWindow {
  constructor(options = {}) {
    this._mediaQueryResults = options.mediaQueryResults || {};
    this._mediaQueryLists = new Map();

    this.innerWidth = options.innerWidth || 1024;
    this.innerHeight = options.innerHeight || 768;
    this.location = {
      href: options.locationHref || 'http://localhost:3000/',
      pathname: options.locationPathname || '/',
      search: '',
      hash: ''
    };

    this.performance = new MockPerformance();
    this._eventListeners = new Map();
    this._animationFrameCallbacks = [];
    this._animationFrameId = 0;
  }

  matchMedia(query) {
    if (!this._mediaQueryLists.has(query)) {
      const matches = this._evaluateMediaQuery(query);
      this._mediaQueryLists.set(query, new MockMediaQueryList(query, matches));
    }
    return this._mediaQueryLists.get(query);
  }

  _evaluateMediaQuery(query) {
    // Check custom results first
    if (this._mediaQueryResults[query] !== undefined) {
      return this._mediaQueryResults[query];
    }

    // Evaluate common media queries
    if (query.includes('prefers-reduced-motion: reduce')) return false;
    if (query.includes('prefers-color-scheme: dark')) return false;
    if (query.includes('prefers-color-scheme: light')) return true;
    if (query.includes('prefers-contrast: more')) return false;
    if (query.includes('prefers-reduced-transparency: reduce')) return false;
    if (query.includes('forced-colors: active')) return false;

    // Width queries
    const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
    if (minWidthMatch) {
      return this.innerWidth >= parseInt(minWidthMatch[1], 10);
    }

    const maxWidthMatch = query.match(/max-width:\s*(\d+)px/);
    if (maxWidthMatch) {
      return this.innerWidth <= parseInt(maxWidthMatch[1], 10);
    }

    return false;
  }

  /**
   * Set media query result (for testing).
   */
  setMediaQueryResult(query, matches) {
    this._mediaQueryResults[query] = matches;
    if (this._mediaQueryLists.has(query)) {
      this._mediaQueryLists.get(query)._setMatches(matches);
    }
  }

  requestAnimationFrame(callback) {
    const id = ++this._animationFrameId;
    this._animationFrameCallbacks.push({ id, callback });
    return id;
  }

  cancelAnimationFrame(id) {
    this._animationFrameCallbacks = this._animationFrameCallbacks.filter(c => c.id !== id);
  }

  /**
   * Run all pending animation frame callbacks (for testing).
   */
  flushAnimationFrames() {
    const callbacks = [...this._animationFrameCallbacks];
    this._animationFrameCallbacks = [];
    callbacks.forEach(({ callback }) => callback(this.performance.now()));
  }

  addEventListener(event, handler, options) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event).push({ handler, options });
  }

  removeEventListener(event, handler, options) {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      const index = listeners.findIndex(l => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    const listeners = this._eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(({ handler }) => handler(event));
    }
  }

  getComputedStyle(element) {
    // Return element's stored computed styles or defaults
    return element._computedStyle || new MockCSSStyleDeclaration();
  }
}

/**
 * Enhanced MockElement with additional browser APIs.
 */
export class EnhancedMockElement extends MockElement {
  constructor(tagName) {
    super(tagName);
    this._boundingRect = { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 };
    this._computedStyle = new MockCSSStyleDeclaration();
    this._canvas = null;
    this.hidden = false;
    this.inert = false;
    this.labels = [];
    this.offsetParent = {};
  }

  getBoundingClientRect() {
    return { ...this._boundingRect };
  }

  /**
   * Set bounding rect (for testing).
   */
  setBoundingRect(rect) {
    this._boundingRect = { ...this._boundingRect, ...rect };
  }

  /**
   * Set computed style (for testing).
   */
  setComputedStyle(styles) {
    this._computedStyle = new MockCSSStyleDeclaration(styles);
  }

  getContext(contextType) {
    if (contextType === '2d') {
      if (!this._canvas) {
        this._canvas = new MockCanvasContext();
      }
      return this._canvas;
    }
    return null;
  }

  focus() {
    // Simulate focus by updating document.activeElement
    if (this._document) {
      this._document.activeElement = this;
    }
  }

  blur() {
    if (this._document && this._document.activeElement === this) {
      this._document.activeElement = null;
    }
  }

  contains(other) {
    if (!other) return false;
    if (other === this) return true;
    for (const child of this.childNodes) {
      if (child === other) return true;
      if (child.contains && child.contains(other)) return true;
    }
    return false;
  }

  closest(selector) {
    // Simple implementation - check self and parents
    let current = this;
    while (current) {
      if (this._matchesSelector(current, selector)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  _matchesSelector(element, selector) {
    if (!element.tagName) return false;

    // Tag selector
    if (selector === element.tagName.toLowerCase()) return true;

    // ID selector
    if (selector.startsWith('#') && element.id === selector.slice(1)) return true;

    // Class selector
    if (selector.startsWith('.') && element.classList?.contains(selector.slice(1))) return true;

    return false;
  }

  querySelectorAll(selector) {
    const results = [];
    this._findAll(this, selector, results);
    return results;
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  _findAll(node, selector, results) {
    for (const child of node.childNodes || []) {
      if (this._matchesSelector(child, selector)) {
        results.push(child);
      }
      if (child._findAll) {
        child._findAll(child, selector, results);
      } else {
        this._findAll(child, selector, results);
      }
    }
  }
}

/**
 * Enhanced Mock DOM Adapter with full browser API simulation.
 * Provides comprehensive testing support for a11y, devtools, and other
 * browser-dependent modules.
 *
 * @implements {DOMAdapter}
 */
export class EnhancedMockAdapter extends MockDOMAdapter {
  constructor(options = {}) {
    super();

    // Replace body with enhanced element
    this._body = new EnhancedMockElement('body');
    this._document.appendChild(this._body);

    // Mock window with configurable options
    this._window = new MockWindow(options);

    // Link document to window
    this._body._document = this;
    this.activeElement = null;

    // Expose MutationObserver constructor
    this.MutationObserver = MockMutationObserver;
  }

  createElement(tagName) {
    const el = new EnhancedMockElement(tagName);
    el._document = this;
    return el;
  }

  /**
   * Get computed style for an element.
   */
  getComputedStyle(element) {
    return this._window.getComputedStyle(element);
  }

  /**
   * Get the mock window object.
   */
  getWindow() {
    return this._window;
  }

  /**
   * Request animation frame.
   */
  requestAnimationFrame(callback) {
    return this._window.requestAnimationFrame(callback);
  }

  /**
   * Cancel animation frame.
   */
  cancelAnimationFrame(id) {
    this._window.cancelAnimationFrame(id);
  }

  /**
   * Get performance API.
   */
  getPerformance() {
    return this._window.performance;
  }

  /**
   * Match media query.
   */
  matchMedia(query) {
    return this._window.matchMedia(query);
  }

  /**
   * Create a MutationObserver.
   */
  createMutationObserver(callback) {
    return new MockMutationObserver(callback);
  }

  /**
   * Get document element (html).
   */
  getDocumentElement() {
    return this._document;
  }

  /**
   * Get active element.
   */
  getActiveElement() {
    return this.activeElement;
  }

  /**
   * Set active element (for testing).
   */
  setActiveElement(element) {
    this.activeElement = element;
  }

  /**
   * Get element by ID.
   */
  getElementById(id) {
    return this._findById(this._body, id);
  }

  // Test helpers

  /**
   * Set media query result (for testing user preferences).
   * @param {string} query - Media query string
   * @param {boolean} matches - Whether the query matches
   */
  setMediaQueryResult(query, matches) {
    this._window.setMediaQueryResult(query, matches);
  }

  /**
   * Run all pending animation frames (for testing).
   */
  flushAnimationFrames() {
    this._window.flushAnimationFrames();
  }

  /**
   * Reset the mock DOM state.
   */
  reset() {
    super.reset();
    this._body = new EnhancedMockElement('body');
    this._body._document = this;
    this._document.childNodes = [];
    this._document.appendChild(this._body);
    this.activeElement = null;
  }

  /**
   * Install global mocks for browser testing.
   * Installs mocks on globalThis for modules that directly access browser APIs.
   * @returns {Function} Cleanup function to restore original globals
   */
  installGlobalMocks() {
    const originals = {
      document: globalThis.document,
      window: globalThis.window,
      getComputedStyle: globalThis.getComputedStyle,
      requestAnimationFrame: globalThis.requestAnimationFrame,
      cancelAnimationFrame: globalThis.cancelAnimationFrame,
      MutationObserver: globalThis.MutationObserver,
      performance: globalThis.performance
    };

    // Create mock document
    globalThis.document = {
      body: this._body,
      documentElement: this._document,
      activeElement: null,
      createElement: (tag) => this.createElement(tag),
      createTextNode: (text) => this.createTextNode(text),
      createComment: (data) => this.createComment(data),
      createDocumentFragment: () => this.createDocumentFragment(),
      querySelector: (sel) => this.querySelector(sel),
      querySelectorAll: (sel) => this._body.querySelectorAll(sel),
      getElementById: (id) => this.getElementById(id),
      addEventListener: (e, h, o) => this._window.addEventListener(e, h, o),
      removeEventListener: (e, h, o) => this._window.removeEventListener(e, h, o)
    };

    globalThis.window = this._window;
    globalThis.getComputedStyle = (el) => this.getComputedStyle(el);
    globalThis.requestAnimationFrame = (cb) => this.requestAnimationFrame(cb);
    globalThis.cancelAnimationFrame = (id) => this.cancelAnimationFrame(id);
    globalThis.MutationObserver = MockMutationObserver;
    globalThis.performance = this._window.performance;

    return () => {
      globalThis.document = originals.document;
      globalThis.window = originals.window;
      globalThis.getComputedStyle = originals.getComputedStyle;
      globalThis.requestAnimationFrame = originals.requestAnimationFrame;
      globalThis.cancelAnimationFrame = originals.cancelAnimationFrame;
      globalThis.MutationObserver = originals.MutationObserver;
      globalThis.performance = originals.performance;
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  BrowserDOMAdapter,
  MockDOMAdapter,
  EnhancedMockAdapter,
  MockNode,
  MockElement,
  EnhancedMockElement,
  MockTextNode,
  MockCommentNode,
  MockDocumentFragment,
  MockCanvasContext,
  MockMediaQueryList,
  MockMutationObserver,
  MockPerformance,
  MockCSSStyleDeclaration,
  MockWindow,
  getAdapter,
  setAdapter,
  resetAdapter,
  withAdapter
};
