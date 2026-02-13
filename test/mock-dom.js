/**
 * Minimal DOM Mock for Pulse Tests
 *
 * A lightweight DOM implementation for testing without external dependencies.
 * Implements only the features needed by Pulse's test suite.
 *
 * @module test/mock-dom
 */

// =============================================================================
// Event System
// =============================================================================

class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
    this.target = null;
    this.currentTarget = null;
    this.defaultPrevented = false;
    this.propagationStopped = false;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {
    this.propagationStopped = true;
  }

  initEvent(type, bubbles, cancelable) {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
  }
}

// =============================================================================
// Style Object
// =============================================================================

class CSSStyleDeclaration {
  constructor() {
    this._styles = {};
  }

  getPropertyValue(prop) {
    return this._styles[prop] || '';
  }

  setProperty(prop, value) {
    this._styles[prop] = value;
  }

  removeProperty(prop) {
    const old = this._styles[prop];
    delete this._styles[prop];
    return old || '';
  }

  // Allow direct property access like elem.style.color = 'red'
  get cssText() {
    return Object.entries(this._styles)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }

  set cssText(text) {
    this._styles = {};
    if (text) {
      text.split(';').forEach(rule => {
        const [prop, value] = rule.split(':').map(s => s.trim());
        if (prop && value) {
          this._styles[prop] = value;
        }
      });
    }
  }
}

// Create a proxy for style to allow direct property access
function createStyleProxy() {
  const declaration = new CSSStyleDeclaration();
  return new Proxy(declaration, {
    get(target, prop) {
      if (prop in target) {
        return typeof target[prop] === 'function'
          ? target[prop].bind(target)
          : target[prop];
      }
      return target._styles[prop] || '';
    },
    set(target, prop, value) {
      if (prop === 'cssText' || prop === '_styles') {
        target[prop] = value;
      } else {
        target._styles[prop] = value;
      }
      return true;
    }
  });
}

// =============================================================================
// ClassList
// =============================================================================

class DOMTokenList {
  constructor(element) {
    this._element = element;
    this._tokens = new Set();
  }

  add(...tokens) {
    tokens.forEach(t => this._tokens.add(t));
    this._sync();
  }

  remove(...tokens) {
    tokens.forEach(t => this._tokens.delete(t));
    this._sync();
  }

  toggle(token, force) {
    if (force !== undefined) {
      if (force) {
        this.add(token);
      } else {
        this.remove(token);
      }
      return force;
    }
    if (this._tokens.has(token)) {
      this._tokens.delete(token);
      this._sync();
      return false;
    }
    this._tokens.add(token);
    this._sync();
    return true;
  }

  contains(token) {
    return this._tokens.has(token);
  }

  replace(oldToken, newToken) {
    if (!this._tokens.has(oldToken)) return false;
    this._tokens.delete(oldToken);
    this._tokens.add(newToken);
    this._sync();
    return true;
  }

  get length() {
    return this._tokens.size;
  }

  item(index) {
    return [...this._tokens][index] || null;
  }

  toString() {
    return [...this._tokens].join(' ');
  }

  _sync() {
    this._element._attributes.class = this.toString();
  }

  _parse(className) {
    this._tokens = new Set(className ? className.split(/\s+/).filter(Boolean) : []);
  }
}

// =============================================================================
// Node
// =============================================================================

let nodeIdCounter = 0;

class Node {
  static ELEMENT_NODE = 1;
  static TEXT_NODE = 3;
  static COMMENT_NODE = 8;
  static DOCUMENT_NODE = 9;
  static DOCUMENT_FRAGMENT_NODE = 11;

  constructor(nodeType) {
    this.nodeType = nodeType;
    this.parentNode = null;
    this.childNodes = [];
    this._nodeId = ++nodeIdCounter;
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[idx + 1] || null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[idx - 1] || null;
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    // Handle DocumentFragment - append all children
    if (child.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const children = [...child.childNodes];
      children.forEach(c => this.appendChild(c));
      return child;
    }

    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx === -1) {
      throw new Error('Node not found');
    }
    this.childNodes.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  insertBefore(newNode, referenceNode) {
    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }

    if (!referenceNode) {
      return this.appendChild(newNode);
    }

    // Handle DocumentFragment
    if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const children = [...newNode.childNodes];
      children.forEach(c => this.insertBefore(c, referenceNode));
      return newNode;
    }

    const idx = this.childNodes.indexOf(referenceNode);
    if (idx === -1) {
      throw new Error('Reference node not found');
    }

    newNode.parentNode = this;
    this.childNodes.splice(idx, 0, newNode);
    return newNode;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx === -1) {
      throw new Error('Node not found');
    }

    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }

    oldChild.parentNode = null;
    newChild.parentNode = this;
    this.childNodes[idx] = newChild;
    return oldChild;
  }

  cloneNode(deep = false) {
    throw new Error('cloneNode must be implemented by subclass');
  }

  contains(node) {
    if (node === this) return true;
    for (const child of this.childNodes) {
      if (child === node || (child.contains && child.contains(node))) {
        return true;
      }
    }
    return false;
  }

  get ownerDocument() {
    let node = this;
    while (node.parentNode) {
      node = node.parentNode;
    }
    return node.nodeType === Node.DOCUMENT_NODE ? node : null;
  }
}

// =============================================================================
// Text Node
// =============================================================================

class Text extends Node {
  constructor(data = '') {
    super(Node.TEXT_NODE);
    this._data = data;
  }

  get textContent() {
    return this._data;
  }

  set textContent(value) {
    this._data = String(value);
  }

  get nodeValue() {
    return this._data;
  }

  set nodeValue(value) {
    this._data = String(value);
  }

  get data() {
    return this._data;
  }

  set data(value) {
    this._data = String(value);
  }

  cloneNode() {
    return new Text(this._data);
  }
}

// =============================================================================
// Comment
// =============================================================================

class Comment extends Node {
  constructor(data = '') {
    super(Node.COMMENT_NODE);
    this._data = data;
  }

  get textContent() {
    return this._data;
  }

  set textContent(value) {
    this._data = String(value);
  }

  get nodeValue() {
    return this._data;
  }

  cloneNode() {
    return new Comment(this._data);
  }
}

// =============================================================================
// DocumentFragment
// =============================================================================

class DocumentFragment extends Node {
  constructor() {
    super(Node.DOCUMENT_FRAGMENT_NODE);
  }

  get textContent() {
    return this.childNodes.map(c => c.textContent).join('');
  }

  cloneNode(deep = false) {
    const clone = new DocumentFragment();
    if (deep) {
      this.childNodes.forEach(c => clone.appendChild(c.cloneNode(true)));
    }
    return clone;
  }

  // Element-like query methods for convenience
  querySelector(selector) {
    return querySelect(this, selector, false);
  }

  querySelectorAll(selector) {
    return querySelect(this, selector, true);
  }
}

// =============================================================================
// Element
// =============================================================================

class Element extends Node {
  constructor(tagName) {
    super(Node.ELEMENT_NODE);
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this._attributes = {};
    this._eventListeners = {};
    this._style = createStyleProxy();
    this._classList = new DOMTokenList(this);
  }

  get style() {
    return this._style;
  }

  get classList() {
    return this._classList;
  }

  get className() {
    return this._attributes.class || '';
  }

  set className(value) {
    this._attributes.class = value;
    this._classList._parse(value);
  }

  get id() {
    return this._attributes.id || '';
  }

  set id(value) {
    this._attributes.id = value;
  }

  get children() {
    return this.childNodes.filter(c => c.nodeType === Node.ELEMENT_NODE);
  }

  get textContent() {
    return this.childNodes.map(c => c.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    if (value) {
      this.appendChild(new Text(value));
    }
  }

  get innerHTML() {
    return this.childNodes.map(c => {
      if (c.nodeType === Node.TEXT_NODE) {
        return c.textContent;
      }
      if (c.nodeType === Node.COMMENT_NODE) {
        return `<!--${c.textContent}-->`;
      }
      if (c.nodeType === Node.ELEMENT_NODE) {
        return c.outerHTML;
      }
      return '';
    }).join('');
  }

  set innerHTML(html) {
    this.childNodes = [];
    if (html) {
      // Simple HTML parser for basic cases
      parseHTML(html, this);
    }
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const attrs = Object.entries(this._attributes)
      .map(([k, v]) => v === '' ? k : `${k}="${v}"`)
      .join(' ');
    const attrStr = attrs ? ' ' + attrs : '';

    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    if (voidElements.includes(tag)) {
      return `<${tag}${attrStr}>`;
    }
    return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
  }

  getAttribute(name) {
    return this._attributes[name] ?? null;
  }

  setAttribute(name, value) {
    this._attributes[name] = String(value);
    if (name === 'class') {
      this._classList._parse(value);
    }
  }

  removeAttribute(name) {
    delete this._attributes[name];
    if (name === 'class') {
      this._classList._parse('');
    }
  }

  hasAttribute(name) {
    return name in this._attributes;
  }

  // Value property for form elements
  get value() {
    return this._value ?? this._attributes.value ?? '';
  }

  set value(val) {
    this._value = val;
  }

  get checked() {
    return this._checked ?? false;
  }

  set checked(val) {
    this._checked = Boolean(val);
  }

  get disabled() {
    return 'disabled' in this._attributes;
  }

  set disabled(val) {
    if (val) {
      this._attributes.disabled = '';
    } else {
      delete this._attributes.disabled;
    }
  }

  get type() {
    return this._attributes.type || '';
  }

  set type(val) {
    this._attributes.type = val;
  }

  get href() {
    return this._attributes.href || '';
  }

  set href(val) {
    this._attributes.href = val;
  }

  get src() {
    return this._attributes.src || '';
  }

  set src(val) {
    this._attributes.src = val;
  }

  get title() {
    return this._attributes.title || '';
  }

  set title(val) {
    this._attributes.title = val;
  }

  get target() {
    return this._attributes.target || '';
  }

  set target(val) {
    this._attributes.target = val;
  }

  get rel() {
    return this._attributes.rel || '';
  }

  set rel(val) {
    this._attributes.rel = val;
  }

  // Event handling
  addEventListener(type, handler, options) {
    if (!this._eventListeners[type]) {
      this._eventListeners[type] = [];
    }
    this._eventListeners[type].push({ handler, options });
  }

  removeEventListener(type, handler) {
    if (!this._eventListeners[type]) return;
    this._eventListeners[type] = this._eventListeners[type].filter(
      l => l.handler !== handler
    );
  }

  dispatchEvent(event) {
    event.target = this;
    event.currentTarget = this;

    const listeners = this._eventListeners[event.type] || [];
    for (const { handler } of listeners) {
      handler.call(this, event);
      if (event.propagationStopped) break;
    }

    // Also call on* handler if set
    const onHandler = this['on' + event.type];
    if (typeof onHandler === 'function') {
      onHandler.call(this, event);
    }

    return !event.defaultPrevented;
  }

  click() {
    const event = new Event('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  }

  focus() {
    // No-op for mock
  }

  blur() {
    // No-op for mock
  }

  // Query methods
  querySelector(selector) {
    return querySelect(this, selector, false);
  }

  querySelectorAll(selector) {
    return querySelect(this, selector, true);
  }

  getElementsByClassName(className) {
    return this.querySelectorAll('.' + className);
  }

  getElementsByTagName(tagName) {
    return this.querySelectorAll(tagName);
  }

  getElementById(id) {
    return this.querySelector('#' + id);
  }

  matches(selector) {
    return matchesSelector(this, selector);
  }

  closest(selector) {
    let el = this;
    while (el) {
      if (el.nodeType === Node.ELEMENT_NODE && el.matches(selector)) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  append(...nodes) {
    nodes.forEach(n => {
      if (typeof n === 'string') {
        this.appendChild(new Text(n));
      } else {
        this.appendChild(n);
      }
    });
  }

  prepend(...nodes) {
    const first = this.firstChild;
    nodes.forEach(n => {
      if (typeof n === 'string') {
        this.insertBefore(new Text(n), first);
      } else {
        this.insertBefore(n, first);
      }
    });
  }

  replaceChildren(...nodes) {
    // Remove all existing children
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]);
    }
    // Add new children
    this.append(...nodes);
  }

  cloneNode(deep = false) {
    const clone = new Element(this.tagName);
    clone._attributes = { ...this._attributes };
    clone._classList._parse(this.className);
    clone._style.cssText = this._style.cssText;
    clone._value = this._value;
    clone._checked = this._checked;

    if (deep) {
      this.childNodes.forEach(c => clone.appendChild(c.cloneNode(true)));
    }
    return clone;
  }

  // Dataset (simplified)
  get dataset() {
    const self = this;
    return new Proxy({}, {
      get(_, prop) {
        const attr = 'data-' + prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        return self._attributes[attr];
      },
      set(_, prop, value) {
        const attr = 'data-' + prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        self._attributes[attr] = value;
        return true;
      }
    });
  }
}

// =============================================================================
// HTMLElement (with additional properties)
// =============================================================================

class HTMLElement extends Element {
  constructor(tagName) {
    super(tagName);
  }
}

// =============================================================================
// Document
// =============================================================================

class Document extends Node {
  constructor() {
    super(Node.DOCUMENT_NODE);
    this.documentElement = this.createElement('html');
    this.head = this.createElement('head');
    this.body = this.createElement('body');
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
  }

  createElement(tagName) {
    return new HTMLElement(tagName);
  }

  createTextNode(data) {
    return new Text(data);
  }

  createComment(data) {
    return new Comment(data);
  }

  createDocumentFragment() {
    return new DocumentFragment();
  }

  createEvent(type) {
    return new Event(type);
  }

  getElementById(id) {
    return this.querySelector('#' + id);
  }

  getElementsByClassName(className) {
    return this.querySelectorAll('.' + className);
  }

  getElementsByTagName(tagName) {
    return this.querySelectorAll(tagName);
  }

  querySelector(selector) {
    return querySelect(this, selector, false);
  }

  querySelectorAll(selector) {
    return querySelect(this, selector, true);
  }
}

// =============================================================================
// Query Selector Implementation
// =============================================================================

function matchesSelector(element, selector) {
  if (!selector || element.nodeType !== Node.ELEMENT_NODE) return false;

  // Handle multiple selectors (comma-separated)
  if (selector.includes(',')) {
    return selector.split(',').some(s => matchesSelector(element, s.trim()));
  }

  // Simple selector parser
  const parts = [];
  let remaining = selector.trim();

  // Extract tag
  const tagMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
  if (tagMatch) {
    parts.push({ type: 'tag', value: tagMatch[1].toUpperCase() });
    remaining = remaining.slice(tagMatch[0].length);
  }

  // Extract id
  const idMatch = remaining.match(/^#([a-zA-Z_-][a-zA-Z0-9_-]*)/);
  if (idMatch) {
    parts.push({ type: 'id', value: idMatch[1] });
    remaining = remaining.slice(idMatch[0].length);
  }

  // Extract classes
  let classMatch;
  while ((classMatch = remaining.match(/^\.([a-zA-Z_-][a-zA-Z0-9_-]*)/))) {
    parts.push({ type: 'class', value: classMatch[1] });
    remaining = remaining.slice(classMatch[0].length);
  }

  // Extract attributes
  let attrMatch;
  while ((attrMatch = remaining.match(/^\[([a-zA-Z_-][a-zA-Z0-9_-]*)(?:=["']?([^"'\]]*)["']?)?\]/))) {
    parts.push({ type: 'attr', name: attrMatch[1], value: attrMatch[2] });
    remaining = remaining.slice(attrMatch[0].length);
  }

  // Match all parts
  for (const part of parts) {
    switch (part.type) {
      case 'tag':
        if (element.tagName !== part.value) return false;
        break;
      case 'id':
        if (element.id !== part.value) return false;
        break;
      case 'class':
        if (!element.classList.contains(part.value)) return false;
        break;
      case 'attr':
        if (part.value !== undefined) {
          if (element.getAttribute(part.name) !== part.value) return false;
        } else {
          if (!element.hasAttribute(part.name)) return false;
        }
        break;
    }
  }

  return parts.length > 0 || selector === '*';
}

function querySelect(root, selector, all) {
  const results = [];

  function traverse(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (matchesSelector(node, selector)) {
        results.push(node);
        if (!all) return true;
      }
    }

    for (const child of (node.childNodes || [])) {
      if (traverse(child) && !all) return true;
    }
    return false;
  }

  traverse(root);
  return all ? results : (results[0] || null);
}

// =============================================================================
// Simple HTML Parser
// =============================================================================

function parseHTML(html, parent) {
  let pos = 0;

  while (pos < html.length) {
    // Skip whitespace at start
    const wsMatch = html.slice(pos).match(/^(\s+)/);
    if (wsMatch) {
      pos += wsMatch[0].length;
      if (pos >= html.length) break;
    }

    // Comment
    if (html.slice(pos, pos + 4) === '<!--') {
      const endIdx = html.indexOf('-->', pos + 4);
      if (endIdx !== -1) {
        const comment = new Comment(html.slice(pos + 4, endIdx));
        parent.appendChild(comment);
        pos = endIdx + 3;
        continue;
      }
    }

    // Opening tag
    if (html[pos] === '<' && html[pos + 1] !== '/') {
      const tagMatch = html.slice(pos).match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
      if (tagMatch) {
        const tagName = tagMatch[1];
        pos += tagMatch[0].length;

        const elem = new HTMLElement(tagName);

        // Parse attributes
        let attrMatch;
        while ((attrMatch = html.slice(pos).match(/^\s+([a-zA-Z_:][a-zA-Z0-9_:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/))) {
          const name = attrMatch[1];
          const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
          elem.setAttribute(name, value);
          pos += attrMatch[0].length;
        }

        // Skip whitespace
        while (html[pos] === ' ') pos++;

        // Self-closing or void element
        const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        if (html[pos] === '/' || voidElements.includes(tagName.toLowerCase())) {
          if (html[pos] === '/') pos++;
          pos++; // >
          parent.appendChild(elem);
          continue;
        }

        pos++; // >

        // Find closing tag and parse children
        const closingTag = `</${tagName}>`;
        const closingIdx = html.toLowerCase().indexOf(closingTag.toLowerCase(), pos);
        if (closingIdx !== -1) {
          const innerHtml = html.slice(pos, closingIdx);
          parseHTML(innerHtml, elem);
          pos = closingIdx + closingTag.length;
        }

        parent.appendChild(elem);
        continue;
      }
    }

    // Closing tag (skip)
    if (html[pos] === '<' && html[pos + 1] === '/') {
      const endIdx = html.indexOf('>', pos);
      if (endIdx !== -1) {
        pos = endIdx + 1;
        continue;
      }
    }

    // Text content
    const nextTag = html.indexOf('<', pos);
    const textEnd = nextTag === -1 ? html.length : nextTag;
    const text = html.slice(pos, textEnd);
    if (text) {
      parent.appendChild(new Text(text));
    }
    pos = textEnd;
  }
}

// =============================================================================
// Window Mock
// =============================================================================

function createMockWindow(doc) {
  let historyStack = [{ state: null, url: '/' }];
  let historyIndex = 0;

  const mockLocation = {
    get pathname() {
      const url = historyStack[historyIndex]?.url || '/';
      return url.split('?')[0].split('#')[0];
    },
    get search() {
      const url = historyStack[historyIndex]?.url || '/';
      const hashIdx = url.indexOf('#');
      const searchPart = hashIdx !== -1 ? url.slice(0, hashIdx) : url;
      const idx = searchPart.indexOf('?');
      return idx !== -1 ? searchPart.slice(idx) : '';
    },
    get hash() {
      const url = historyStack[historyIndex]?.url || '/';
      const idx = url.indexOf('#');
      return idx !== -1 ? url.slice(idx) : '';
    },
    get href() { return 'http://localhost' + (historyStack[historyIndex]?.url || '/'); },
    set href(val) {
      const url = val.startsWith('http') ? new URL(val).pathname : val;
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push({ state: null, url });
      historyIndex++;
    }
  };

  const mockHistory = {
    get state() { return historyStack[historyIndex].state; },
    get length() { return historyStack.length; },

    pushState(state, title, url) {
      historyStack = historyStack.slice(0, historyIndex + 1);
      historyStack.push({ state, url: url || historyStack[historyIndex].url });
      historyIndex++;
    },

    replaceState(state, title, url) {
      historyStack[historyIndex] = { state, url: url || historyStack[historyIndex].url };
    },

    go(delta) {
      const newIndex = historyIndex + delta;
      if (newIndex >= 0 && newIndex < historyStack.length) {
        historyIndex = newIndex;
        const event = new Event('popstate');
        event.state = historyStack[historyIndex].state;
        mockWindow.dispatchEvent(event);
      }
    },

    back() { this.go(-1); },
    forward() { this.go(1); }
  };

  const eventListeners = {};

  const mockWindow = {
    document: doc,
    location: mockLocation,
    history: mockHistory,
    Node,
    HTMLElement,
    Event,

    addEventListener(type, handler) {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(handler);
    },

    removeEventListener(type, handler) {
      if (!eventListeners[type]) return;
      eventListeners[type] = eventListeners[type].filter(h => h !== handler);
    },

    dispatchEvent(event) {
      const listeners = eventListeners[event.type] || [];
      listeners.forEach(h => h(event));
      return !event.defaultPrevented;
    },

    scrollTo() {},

    queueMicrotask(fn) {
      Promise.resolve().then(fn);
    },

    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval
  };

  function resetHistory() {
    historyStack = [{ state: null, url: '/' }];
    historyIndex = 0;
  }

  return { window: mockWindow, resetHistory };
}

// =============================================================================
// Create DOM Environment
// =============================================================================

function createDOM(html = '<!DOCTYPE html><html><head></head><body></body></html>') {
  const doc = new Document();

  // Parse body content if provided
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    parseHTML(bodyMatch[1], doc.body);
  }

  return {
    document: doc,
    HTMLElement,
    Node,
    DocumentFragment,
    Comment,
    Event,
    Text
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  Node,
  Text,
  Comment,
  DocumentFragment,
  Element,
  HTMLElement,
  Document,
  Event,
  DOMTokenList,
  createDOM,
  createMockWindow
};
