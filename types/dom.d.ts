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
