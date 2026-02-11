/**
 * Pulse Framework - DOM Helpers Type Definitions
 * @module pulse-js-framework/runtime
 */

import { Pulse } from './pulse';

/** Value or getter function */
export type MaybeGetter<T> = T | (() => T);

/** Value, getter, or Pulse */
export type Reactive<T> = T | (() => T) | Pulse<T>;

/** Child content type for elements */
export type Child =
  | string
  | number
  | Node
  | null
  | undefined
  | (() => Child | Child[])
  | Child[];

/** Parsed selector result */
export interface ParsedSelector {
  tag: string;
  id: string | null;
  classes: string[];
  attrs: Record<string, string>;
}

/**
 * Parse CSS selector into configuration
 */
export declare function parseSelector(selector: string): ParsedSelector;

/**
 * Create element from CSS selector syntax
 * @example el('div.container#main', 'Hello')
 * @example el('input[type=text][placeholder=Name]')
 */
export declare function el(selector: string, ...children: Child[]): HTMLElement;

/**
 * Create reactive text node
 */
export declare function text(getValue: MaybeGetter<string | number>): Text;

/**
 * Bind attribute reactively
 * @returns Element (chainable)
 */
export declare function bind<E extends HTMLElement>(
  element: E,
  attr: string,
  getValue: MaybeGetter<string | boolean | number | null>
): E;

/**
 * Bind property reactively
 * @returns Element (chainable)
 */
export declare function prop<E extends HTMLElement>(
  element: E,
  propName: string,
  getValue: MaybeGetter<unknown>
): E;

/**
 * Bind CSS class reactively
 * @returns Element (chainable)
 */
export declare function cls<E extends HTMLElement>(
  element: E,
  className: string,
  condition: MaybeGetter<boolean>
): E;

/**
 * Bind style property reactively
 * @returns Element (chainable)
 */
export declare function style<E extends HTMLElement>(
  element: E,
  prop: string,
  getValue: MaybeGetter<string>
): E;

/** Event handler options */
export interface EventOptions {
  capture?: boolean;
  once?: boolean;
  passive?: boolean;
}

/**
 * Attach event listener
 * @returns Element (chainable)
 */
export declare function on<E extends HTMLElement, K extends keyof HTMLElementEventMap>(
  element: E,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: EventOptions
): E;
export declare function on<E extends HTMLElement>(
  element: E,
  event: string,
  handler: (e: Event) => void,
  options?: EventOptions
): E;

/** Key function for list rendering */
export type KeyFn<T> = (item: T, index: number) => unknown;

/** Template function for list items */
export type ListTemplate<T> = (item: T, index: number) => Node | Node[];

/**
 * Render reactive list with efficient keyed diffing
 */
export declare function list<T>(
  getItems: Reactive<T[]>,
  template: ListTemplate<T>,
  keyFn?: KeyFn<T>
): DocumentFragment;

/** Template function for conditional rendering */
export type ConditionTemplate = () => Node | Node[] | null;

/**
 * Conditional rendering (removes unmounted elements)
 */
export declare function when(
  condition: Reactive<boolean>,
  thenTemplate: ConditionTemplate,
  elseTemplate?: ConditionTemplate
): DocumentFragment;

/** Match cases object */
export interface MatchCases<T extends string | number | symbol = string> {
  [key: string]: ConditionTemplate;
  default?: ConditionTemplate;
}

/**
 * Switch/case rendering
 */
export declare function match<T extends string | number>(
  getValue: Reactive<T>,
  cases: MatchCases
): Comment;

/**
 * Two-way binding for form inputs
 * @returns Element (chainable)
 */
export declare function model<E extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
  element: E,
  pulseValue: Pulse<string | number | boolean>
): E;

/**
 * Mount element to DOM target
 * @returns Unmount function
 */
export declare function mount(
  target: string | HTMLElement,
  element: Node
): () => void;

/** Component context object */
export interface ComponentContext {
  /** Create reactive state */
  state: <T extends Record<string, unknown>>(initial: T) => T;
  /** Create methods bound to component */
  methods: <T extends Record<string, (...args: unknown[]) => unknown>>(fns: T) => T;
  /** Component props */
  props: Record<string, unknown>;
  /** Create pulse */
  pulse: <T>(value: T) => Pulse<T>;
  /** Create element */
  el: typeof el;
  /** Create text node */
  text: typeof text;
  /** Render list */
  list: typeof list;
  /** Conditional render */
  when: typeof when;
  /** Attach event */
  on: typeof on;
  /** Bind attribute */
  bind: typeof bind;
  /** Two-way binding */
  model: typeof model;
  /** Register mount callback */
  onMount: (fn: () => void) => void;
  /** Register unmount callback */
  onUnmount: (fn: () => void) => void;
}

/** Component setup function */
export type ComponentSetup = (ctx: ComponentContext) => Node;

/** Component factory function */
export type ComponentFactory = (props?: Record<string, unknown>) => Node;

/**
 * Create component with lifecycle support
 */
export declare function component(setup: ComponentSetup): ComponentFactory;

/**
 * Register mount callback
 */
export declare function onMount(fn: () => void): void;

/**
 * Register unmount callback
 */
export declare function onUnmount(fn: () => void): void;

/**
 * Toggle visibility without removing from DOM
 * @returns Element (chainable)
 */
export declare function show<E extends HTMLElement>(
  condition: Reactive<boolean>,
  element: E
): E;

/**
 * Render content into different DOM location
 */
export declare function portal(
  children: Node | Node[] | (() => Node | Node[]),
  target: string | HTMLElement
): Comment;

/** Error fallback function */
export type ErrorFallback = (error: Error) => Node | Node[];

/**
 * Error boundary for child components
 */
export declare function errorBoundary(
  children: Node | Node[] | (() => Node | Node[]),
  fallback?: ErrorFallback
): DocumentFragment;

/** Transition options */
export interface TransitionOptions {
  enter?: string;
  exit?: string;
  duration?: number;
  onEnter?: (el: HTMLElement) => void;
  onExit?: (el: HTMLElement) => void;
}

/** Element with transition methods */
export interface TransitionElement extends HTMLElement {
  _pulseTransitionExit?: () => void;
}

/**
 * Animate element enter/exit
 */
export declare function transition<E extends HTMLElement>(
  element: E,
  options?: TransitionOptions
): E & TransitionElement;

/** WhenTransition options */
export interface WhenTransitionOptions {
  duration?: number;
  enterClass?: string;
  exitClass?: string;
}

/**
 * Conditional rendering with transitions
 */
export declare function whenTransition(
  condition: Reactive<boolean>,
  thenTemplate: ConditionTemplate,
  elseTemplate?: ConditionTemplate,
  options?: WhenTransitionOptions
): DocumentFragment;

// =============================================================================
// DOM Configuration
// =============================================================================

/** DOM configuration options */
export interface DomConfig {
  selectorCacheCapacity?: number;
}

/**
 * Configure DOM options (selector cache capacity, etc.)
 */
export declare function configureDom(config: DomConfig): void;

/**
 * Get current DOM configuration
 */
export declare function getDomConfig(): DomConfig;

/**
 * Clear the selector cache
 */
export declare function clearSelectorCache(): void;

/** Cache metrics */
export interface CacheMetrics {
  hitRate: number;
  size: number;
  capacity: number;
  hits?: number;
  misses?: number;
}

/**
 * Get selector cache performance metrics
 */
export declare function getCacheMetrics(): CacheMetrics;

/**
 * Reset cache metrics counters
 */
export declare function resetCacheMetrics(): void;

/**
 * Resolve a CSS selector to element configuration
 */
export declare function resolveSelector(selector: string): ParsedSelector;

/**
 * Configure auto-ARIA behavior
 */
export declare function configureA11y(options: {
  enabled?: boolean;
  autoAria?: boolean;
  warnMissingAlt?: boolean;
  warnMissingLabel?: boolean;
}): void;

/**
 * Compute the Longest Increasing Subsequence (used internally by list())
 */
export declare function computeLIS(arr: number[]): number[];

// =============================================================================
// Event Delegation
// =============================================================================

/**
 * Attach a delegated event listener to a parent element.
 * Events from descendants matching the selector bubble up to the parent.
 * @returns Cleanup function to remove the listener
 */
export declare function delegate(
  parent: HTMLElement,
  eventType: string,
  selector: string,
  handler: (event: Event, matchedElement: HTMLElement) => void
): () => void;

/** Delegated list event handlers */
export interface DelegatedListHandlers<T> {
  [eventType: string]: (event: Event, item: T, index: number) => void;
}

/** Options for delegatedList */
export interface DelegatedListOptions<T> {
  on?: DelegatedListHandlers<T>;
  recycle?: boolean;
}

/**
 * Create a reactive list with delegated event handlers.
 * A single listener is placed on the parent container for each event type.
 */
export declare function delegatedList<T>(
  getItems: Reactive<T[]>,
  template: ListTemplate<T>,
  keyFn: KeyFn<T>,
  options?: DelegatedListOptions<T>
): DocumentFragment;

// =============================================================================
// Virtual Scrolling
// =============================================================================

/** Options for virtualList */
export interface VirtualListOptions<T> {
  /** Fixed row height in pixels (required) */
  itemHeight: number;
  /** Extra items above/below viewport (default: 5) */
  overscan?: number;
  /** Viewport height in px or 'auto' (default: 400) */
  containerHeight?: number | 'auto';
  /** Enable element recycling (default: false) */
  recycle?: boolean;
  /** Delegated event handlers */
  on?: DelegatedListHandlers<T>;
}

/** Scroll alignment options */
export interface ScrollToIndexOptions {
  /** Alignment in viewport (default: 'start') */
  align?: 'start' | 'center' | 'end';
}

/** Virtual list container element with extra methods */
export interface VirtualListElement extends HTMLElement {
  /** Scroll to bring a specific item index into view */
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void;
  /** Dispose scroll listeners and cleanup */
  _dispose(): void;
}

/**
 * Create a virtual scrolling list that renders only visible items.
 */
export declare function virtualList<T>(
  getItems: Reactive<T[]>,
  template: ListTemplate<T>,
  keyFn: KeyFn<T>,
  options: VirtualListOptions<T>
): VirtualListElement;

// =============================================================================
// Element Recycling Pool
// =============================================================================

/** Options for createElementPool */
export interface ElementPoolOptions {
  /** Max recycled elements per tag name (default: 50) */
  maxPerTag?: number;
  /** Max total recycled elements (default: 200) */
  maxTotal?: number;
  /** Reset attributes/styles on release (default: true) */
  resetOnRecycle?: boolean;
}

/** Pool statistics */
export interface PoolStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/** Element recycling pool */
export interface ElementPool {
  /** Acquire an element from the pool or create a new one */
  acquire(tagName: string): HTMLElement;
  /** Release an element back to the pool for reuse */
  release(element: HTMLElement): boolean;
  /** Get pool statistics */
  stats(): PoolStats;
  /** Clear all pooled elements */
  clear(): void;
  /** Reset statistics counters */
  resetStats(): void;
  /** Current number of pooled elements */
  readonly size: number;
}

/**
 * Create an element recycling pool
 */
export declare function createElementPool(options?: ElementPoolOptions): ElementPool;

/**
 * Get the default global element pool (lazy singleton)
 */
export declare function getPool(): ElementPool;

/**
 * Reset and clear the default pool
 */
export declare function resetPool(): void;
