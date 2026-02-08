/**
 * Pulse Framework - DOM Adapter Type Definitions
 * @module pulse-js-framework/runtime/dom-adapter
 */

// ============================================================================
// DOMAdapter Interface
// ============================================================================

/**
 * Abstract DOM adapter interface.
 * Both BrowserDOMAdapter and MockDOMAdapter implement this interface,
 * enabling SSR, testing without a browser, and custom rendering targets.
 */
export interface DOMAdapter {
  /** Create an element with the specified tag name */
  createElement(tagName: string): any;

  /** Create a text node with the specified content */
  createTextNode(text: string): any;

  /** Create a comment node with the specified content */
  createComment(data: string): any;

  /** Create a document fragment for batched DOM operations */
  createDocumentFragment(): any;

  /** Query the document for an element matching the selector */
  querySelector(selector: string): any | null;

  /** Set an attribute on an element */
  setAttribute(element: any, name: string, value: string): void;

  /** Remove an attribute from an element */
  removeAttribute(element: any, name: string): void;

  /** Get an attribute value from an element */
  getAttribute(element: any, name: string): string | null;

  /** Append a child node to a parent */
  appendChild(parent: any, child: any): void;

  /** Insert a node before a reference node */
  insertBefore(parent: any, newNode: any, refNode: any): void;

  /** Remove a node from its parent */
  removeNode(node: any): void;

  /** Get the parent node of a node */
  getParentNode(node: any): any | null;

  /** Get the next sibling of a node */
  getNextSibling(node: any): any | null;

  /** Get the first child of a node */
  getFirstChild(node: any): any | null;

  /** Add a CSS class to an element */
  addClass(element: any, className: string): void;

  /** Remove a CSS class from an element */
  removeClass(element: any, className: string): void;

  /** Set a style property on an element */
  setStyle(element: any, prop: string, value: any): void;

  /** Get a style property from an element */
  getStyle(element: any, prop: string): any;

  /** Set a DOM property on an element */
  setProperty(element: any, prop: string, value: any): void;

  /** Get a DOM property from an element */
  getProperty(element: any, prop: string): any;

  /** Add an event listener to an element */
  addEventListener(element: any, event: string, handler: Function, options?: any): void;

  /** Remove an event listener from an element */
  removeEventListener(element: any, event: string, handler: Function, options?: any): void;

  /** Set the text content of a node */
  setTextContent(node: any, text: string): void;

  /** Get the text content of a node */
  getTextContent(node: any): string;

  /** Check if a value is a Node */
  isNode(value: any): boolean;

  /** Check if a value is an Element */
  isElement(value: any): boolean;

  /** Queue a function to run as a microtask */
  queueMicrotask(fn: () => void): void;

  /** Set a timeout */
  setTimeout(fn: () => void, ms: number): number;

  /** Clear a timeout */
  clearTimeout(id: number): void;

  /** Get the tag name of an element (lowercase) */
  getTagName(element: any): string;

  /** Get the type attribute of an input element */
  getInputType(element: any): string | undefined;
}

// ============================================================================
// Mock Node Classes
// ============================================================================

/** Mock classList interface for MockElement */
export interface MockClassList {
  /** Add a CSS class */
  add(className: string): void;

  /** Remove a CSS class */
  remove(className: string): void;

  /** Check if a class exists */
  contains(className: string): boolean;

  /** Toggle a CSS class, returns the resulting state */
  toggle(className: string, force?: boolean): boolean;
}

/**
 * Simple mock node for testing without a browser environment.
 * Provides minimal DOM-like interface for unit tests.
 */
export declare class MockNode {
  constructor(type: number, data?: string);

  /** Node type constant (1 = Element, 3 = Text, 8 = Comment, 11 = Fragment) */
  nodeType: number;

  /** Node name */
  nodeName: string;

  /** Text content of the node */
  textContent: string;

  /** Parent node reference */
  parentNode: MockNode | null;

  /** Array of child nodes */
  childNodes: MockNode[];

  /** Next sibling reference */
  nextSibling: MockNode | null;

  /** Previous sibling reference */
  previousSibling: MockNode | null;

  /** Get the first child node */
  readonly firstChild: MockNode | null;

  /** Append a child node */
  appendChild(child: MockNode): MockNode;

  /** Insert a node before a reference node */
  insertBefore(newNode: MockNode, refNode: MockNode | null): MockNode;

  /** Remove a child node */
  removeChild(child: MockNode): MockNode;

  /** Remove this node from its parent */
  remove(): void;

  /** Add an event listener */
  addEventListener(event: string, handler: Function, options?: any): void;

  /** Remove an event listener */
  removeEventListener(event: string, handler: Function, options?: any): void;

  /** Dispatch an event to listeners */
  dispatchEvent(event: { type: string; [key: string]: any }): void;
}

/**
 * Mock Element extending MockNode with element-specific features.
 */
export declare class MockElement extends MockNode {
  constructor(tagName: string);

  /** Tag name (uppercase) */
  tagName: string;

  /** Element ID */
  id: string;

  /** Class name string */
  className: string;

  /** Element type attribute */
  type: string | undefined;

  /** Element value (for form elements) */
  value: string;

  /** Checked state (for checkboxes/radios) */
  checked: boolean;

  /** CSS class list helper */
  readonly classList: MockClassList;

  /** Inline style object */
  readonly style: Record<string, any>;

  /** Set an attribute */
  setAttribute(name: string, value: string): void;

  /** Get an attribute value */
  getAttribute(name: string): string | null;

  /** Remove an attribute */
  removeAttribute(name: string): void;

  /** Check if an attribute exists */
  hasAttribute(name: string): boolean;
}

/**
 * Mock Text node for testing.
 */
export declare class MockTextNode extends MockNode {
  constructor(text: string);

  /** Text data */
  data: string;
}

/**
 * Mock Comment node for testing.
 */
export declare class MockCommentNode extends MockNode {
  constructor(data: string);

  /** Comment data */
  data: string;
}

/**
 * Mock DocumentFragment for testing.
 */
export declare class MockDocumentFragment extends MockNode {
  constructor();
}

// ============================================================================
// Adapter Classes
// ============================================================================

/**
 * Browser DOM adapter - default implementation using native browser APIs.
 * This is the production adapter for client-side rendering.
 */
export declare class BrowserDOMAdapter implements DOMAdapter {
  createElement(tagName: string): Element;
  createTextNode(text: string): Text;
  createComment(data: string): Comment;
  createDocumentFragment(): DocumentFragment;
  querySelector(selector: string): Element | null;
  setAttribute(element: Element, name: string, value: string): void;
  removeAttribute(element: Element, name: string): void;
  getAttribute(element: Element, name: string): string | null;
  appendChild(parent: Node, child: Node): void;
  insertBefore(parent: Node, newNode: Node, refNode: Node): void;
  removeNode(node: Node): void;
  getParentNode(node: Node): Node | null;
  getNextSibling(node: Node): Node | null;
  getFirstChild(node: Node): Node | null;
  addClass(element: Element, className: string): void;
  removeClass(element: Element, className: string): void;
  setStyle(element: HTMLElement, prop: string, value: any): void;
  getStyle(element: HTMLElement, prop: string): any;
  setProperty(element: Element, prop: string, value: any): void;
  getProperty(element: Element, prop: string): any;
  addEventListener(element: Element, event: string, handler: Function, options?: any): void;
  removeEventListener(element: Element, event: string, handler: Function, options?: any): void;
  setTextContent(node: Node, text: string): void;
  getTextContent(node: Node): string;
  isNode(value: any): boolean;
  isElement(value: any): boolean;
  queueMicrotask(fn: () => void): void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  getTagName(element: Element): string;
  getInputType(element: Element): string | undefined;
}

/**
 * Mock DOM adapter for testing without browser environment.
 * Provides a lightweight, synchronous DOM simulation.
 */
export declare class MockDOMAdapter implements DOMAdapter {
  createElement(tagName: string): MockElement;
  createTextNode(text: string): MockTextNode;
  createComment(data: string): MockCommentNode;
  createDocumentFragment(): MockDocumentFragment;
  querySelector(selector: string): MockElement | null;
  setAttribute(element: MockElement, name: string, value: string): void;
  removeAttribute(element: MockElement, name: string): void;
  getAttribute(element: MockElement, name: string): string | null;
  appendChild(parent: MockNode, child: MockNode): void;
  insertBefore(parent: MockNode, newNode: MockNode, refNode: MockNode): void;
  removeNode(node: MockNode): void;
  getParentNode(node: MockNode): MockNode | null;
  getNextSibling(node: MockNode): MockNode | null;
  getFirstChild(node: MockNode): MockNode | null;
  addClass(element: MockElement, className: string): void;
  removeClass(element: MockElement, className: string): void;
  setStyle(element: MockElement, prop: string, value: any): void;
  getStyle(element: MockElement, prop: string): any;
  setProperty(element: MockElement, prop: string, value: any): void;
  getProperty(element: MockElement, prop: string): any;
  addEventListener(element: MockNode, event: string, handler: Function, options?: any): void;
  removeEventListener(element: MockNode, event: string, handler: Function, options?: any): void;
  setTextContent(node: MockNode, text: string): void;
  getTextContent(node: MockNode): string;
  isNode(value: any): boolean;
  isElement(value: any): boolean;
  queueMicrotask(fn: () => void): void;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  getTagName(element: MockElement): string;
  getInputType(element: MockElement): string | undefined;

  /** Get the mock document body for inspection */
  getBody(): MockElement;

  /** Reset the mock DOM state */
  reset(): void;

  /** Flush all pending microtasks (synchronously for testing) */
  flushMicrotasks(): void;

  /** Run all pending timeouts (synchronously for testing) */
  runAllTimers(): void;
}

// ============================================================================
// Enhanced Mock Classes
// ============================================================================

/**
 * Mock Canvas 2D rendering context for color parsing in a11y tests.
 */
export declare class MockCanvasContext {
  fillStyle: string;

  fillRect(x: number, y: number, width: number, height: number): void;
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray };
}

/**
 * Mock MediaQueryList for matchMedia() testing.
 */
export declare class MockMediaQueryList {
  constructor(query: string, matches?: boolean);

  /** The media query string */
  media: string;

  /** Whether the query currently matches */
  matches: boolean;

  addEventListener(event: string, listener: Function): void;
  removeEventListener(event: string, listener: Function): void;

  /** @deprecated Use addEventListener instead */
  addListener(listener: Function): void;

  /** @deprecated Use removeEventListener instead */
  removeListener(listener: Function): void;

  /** Simulate a media query change (for testing) */
  _setMatches(matches: boolean): void;
}

/**
 * Mock MutationObserver for DOM change tracking.
 */
export declare class MockMutationObserver {
  constructor(callback: (mutations: any[], observer: MockMutationObserver) => void);

  observe(target: any, options?: any): void;
  disconnect(): void;
  takeRecords(): any[];

  /** Simulate a mutation (for testing) */
  _trigger(mutations: any[]): void;
}

/**
 * Mock Performance API.
 */
export declare class MockPerformance {
  now(): number;
  mark(name: string): void;
  measure(name: string, startMark: string, endMark?: string): void;
  getEntriesByName(name: string): Array<{ name: string; duration: number; startTime: number }>;
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}

/**
 * Mock computed style object.
 */
export declare class MockCSSStyleDeclaration {
  constructor(styles?: Record<string, string>);

  display: string;
  visibility: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  position: string;
  width: string;
  height: string;
  [property: string]: string;
}

/** MockWindow constructor options */
export interface MockWindowOptions {
  mediaQueryResults?: Record<string, boolean>;
  innerWidth?: number;
  innerHeight?: number;
  locationHref?: string;
  locationPathname?: string;
}

/**
 * Mock Window object for global browser APIs.
 */
export declare class MockWindow {
  constructor(options?: MockWindowOptions);

  innerWidth: number;
  innerHeight: number;
  location: {
    href: string;
    pathname: string;
    search: string;
    hash: string;
  };
  performance: MockPerformance;

  matchMedia(query: string): MockMediaQueryList;

  /** Set media query result (for testing) */
  setMediaQueryResult(query: string, matches: boolean): void;

  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(id: number): void;

  /** Run all pending animation frame callbacks (for testing) */
  flushAnimationFrames(): void;

  addEventListener(event: string, handler: Function, options?: any): void;
  removeEventListener(event: string, handler: Function, options?: any): void;
  dispatchEvent(event: { type: string; [key: string]: any }): void;

  getComputedStyle(element: any): MockCSSStyleDeclaration;
}

/**
 * Enhanced MockElement with additional browser APIs.
 */
export declare class EnhancedMockElement extends MockElement {
  constructor(tagName: string);

  hidden: boolean;
  inert: boolean;
  labels: any[];
  offsetParent: any;

  getBoundingClientRect(): {
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  };

  /** Set bounding rect (for testing) */
  setBoundingRect(rect: Partial<{
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
  }>): void;

  /** Set computed style (for testing) */
  setComputedStyle(styles: Record<string, string>): void;

  getContext(contextType: '2d'): MockCanvasContext | null;
  getContext(contextType: string): any | null;

  focus(): void;
  blur(): void;
  contains(other: any): boolean;
  closest(selector: string): EnhancedMockElement | null;
  querySelectorAll(selector: string): EnhancedMockElement[];
  querySelector(selector: string): EnhancedMockElement | null;
}

/**
 * Enhanced Mock DOM Adapter with full browser API simulation.
 * Provides comprehensive testing support for a11y, devtools, and other
 * browser-dependent modules.
 */
export declare class EnhancedMockAdapter extends MockDOMAdapter {
  constructor(options?: MockWindowOptions);

  /** MutationObserver constructor */
  MutationObserver: typeof MockMutationObserver;

  createElement(tagName: string): EnhancedMockElement;

  /** Get computed style for an element */
  getComputedStyle(element: any): MockCSSStyleDeclaration;

  /** Get the mock window object */
  getWindow(): MockWindow;

  /** Request animation frame */
  requestAnimationFrame(callback: (time: number) => void): number;

  /** Cancel animation frame */
  cancelAnimationFrame(id: number): void;

  /** Get performance API */
  getPerformance(): MockPerformance;

  /** Match media query */
  matchMedia(query: string): MockMediaQueryList;

  /** Create a MutationObserver */
  createMutationObserver(callback: (mutations: any[], observer: MockMutationObserver) => void): MockMutationObserver;

  /** Get document element (html) */
  getDocumentElement(): MockElement;

  /** Get active element */
  getActiveElement(): MockElement | null;

  /** Set active element (for testing) */
  setActiveElement(element: MockElement | null): void;

  /** Get element by ID */
  getElementById(id: string): MockElement | null;

  /** Set media query result (for testing user preferences) */
  setMediaQueryResult(query: string, matches: boolean): void;

  /** Run all pending animation frames (for testing) */
  flushAnimationFrames(): void;

  /**
   * Install global mocks for browser testing.
   * Installs mocks on globalThis for modules that directly access browser APIs.
   * @returns Cleanup function to restore original globals
   */
  installGlobalMocks(): () => void;
}

// ============================================================================
// Global Adapter Management
// ============================================================================

/**
 * Get the currently active DOM adapter.
 * Lazily initializes BrowserDOMAdapter if in browser environment.
 *
 * @throws {Error} If no adapter is set and not in browser environment
 */
export declare function getAdapter(): DOMAdapter;

/**
 * Set the active DOM adapter.
 * Use this to configure SSR, testing, or custom rendering targets.
 *
 * @example
 * ```typescript
 * import { setAdapter, MockDOMAdapter } from 'pulse-js-framework/runtime/dom-adapter';
 * setAdapter(new MockDOMAdapter());
 * ```
 */
export declare function setAdapter(adapter: DOMAdapter): void;

/**
 * Reset the adapter to browser default (or null in non-browser).
 * Useful for cleanup after tests.
 */
export declare function resetAdapter(): void;

/**
 * Run a function with a temporary DOM adapter.
 * The previous adapter is restored after the function completes.
 *
 * @example
 * ```typescript
 * const result = withAdapter(new MockDOMAdapter(), () => {
 *   return el('div.test', 'Hello');
 * });
 * ```
 */
export declare function withAdapter<T>(adapter: DOMAdapter, fn: () => T): T;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  BrowserDOMAdapter: typeof BrowserDOMAdapter;
  MockDOMAdapter: typeof MockDOMAdapter;
  EnhancedMockAdapter: typeof EnhancedMockAdapter;
  MockNode: typeof MockNode;
  MockElement: typeof MockElement;
  EnhancedMockElement: typeof EnhancedMockElement;
  MockTextNode: typeof MockTextNode;
  MockCommentNode: typeof MockCommentNode;
  MockDocumentFragment: typeof MockDocumentFragment;
  MockCanvasContext: typeof MockCanvasContext;
  MockMediaQueryList: typeof MockMediaQueryList;
  MockMutationObserver: typeof MockMutationObserver;
  MockPerformance: typeof MockPerformance;
  MockCSSStyleDeclaration: typeof MockCSSStyleDeclaration;
  MockWindow: typeof MockWindow;
  getAdapter: typeof getAdapter;
  setAdapter: typeof setAdapter;
  resetAdapter: typeof resetAdapter;
  withAdapter: typeof withAdapter;
};

export default _default;
