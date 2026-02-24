/**
 * Pulse Animation Module Type Definitions
 * @module pulse-js-framework/runtime/animation
 */

import { Pulse } from './pulse';

// ============================================================================
// Configuration
// ============================================================================

/** Global animation configuration options */
export interface AnimationConfig {
  /** Respect the user's prefers-reduced-motion setting (default: true) */
  respectReducedMotion?: boolean;

  /** Default animation duration in ms (default: 300) */
  defaultDuration?: number;

  /** Default easing function (default: 'ease-out') */
  defaultEasing?: string;

  /** Kill switch to disable all animations globally (default: false) */
  disabled?: boolean;
}

/**
 * Configure global animation settings.
 *
 * @param options Configuration options
 *
 * @example
 * configureAnimations({
 *   respectReducedMotion: true,
 *   defaultDuration: 200,
 *   defaultEasing: 'ease-in-out',
 *   disabled: false,
 * });
 */
export declare function configureAnimations(options?: AnimationConfig): void;

// ============================================================================
// animate()
// ============================================================================

/** Options for the animate() function */
export interface AnimateOptions {
  /** Duration in ms (default: global defaultDuration) */
  duration?: number;

  /** Easing function (default: global defaultEasing) */
  easing?: string;

  /** Fill mode (default: 'none') */
  fill?: FillMode;

  /** Delay in ms before animation starts (default: 0) */
  delay?: number;

  /** Number of iterations (default: 1) */
  iterations?: number;

  /** Playback direction (default: 'normal') */
  direction?: PlaybackDirection;
}

/** Animation control returned by animate() */
export interface AnimationControl {
  /** Reactive playing state */
  isPlaying: Pulse<boolean>;

  /** Reactive progress (0 to 1) */
  progress: Pulse<number>;

  /** Promise that resolves when the animation finishes */
  finished: Promise<void>;

  /** Resume or start playback */
  play(): void;

  /** Pause the animation */
  pause(): void;

  /** Reverse the animation direction */
  reverse(): void;

  /** Cancel the animation and reset progress to 0 */
  cancel(): void;

  /** Finish the animation immediately (progress set to 1) */
  finish(): void;

  /** Dispose the animation and clean up resources */
  dispose(): void;
}

/**
 * Animate an element using the Web Animations API.
 * Automatically respects reduced motion preferences and SSR environments.
 * Returns a no-op control when animations are disabled.
 *
 * @param element Element to animate
 * @param keyframes Keyframes in WAAPI format (array of keyframe objects or a single keyframe object)
 * @param options Animation options
 * @returns AnimationControl with reactive state and playback methods
 *
 * @example
 * const ctrl = animate(element, [
 *   { opacity: 0, transform: 'translateY(-10px)' },
 *   { opacity: 1, transform: 'translateY(0)' },
 * ], { duration: 300, easing: 'ease-out' });
 *
 * effect(() => {
 *   console.log('Progress:', ctrl.progress.get());
 * });
 *
 * await ctrl.finished;
 */
export declare function animate(
  element: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: AnimateOptions
): AnimationControl;

// ============================================================================
// useTransition()
// ============================================================================

/** Options for the useTransition() hook */
export interface TransitionOptions {
  /** Enter animation keyframes (default: { opacity: [0, 1] }) */
  enter?: Keyframe[] | PropertyIndexedKeyframes;

  /** Leave animation keyframes (default: { opacity: [1, 0] }) */
  leave?: Keyframe[] | PropertyIndexedKeyframes;

  /** Animation duration in ms */
  duration?: number;

  /** Easing function */
  easing?: string;

  /** Template factory called when entering (condition becomes true) */
  onEnter?: (() => Node | Node[] | null) | null;

  /** Template factory called when leaving (condition becomes false) */
  onLeave?: (() => Node | Node[] | null) | null;
}

/** Return type of useTransition() */
export interface TransitionResult {
  /** Document fragment container for the transition content */
  container: DocumentFragment;

  /** Reactive flag: true while enter animation is playing */
  isEntering: Pulse<boolean>;

  /** Reactive flag: true while leave animation is playing */
  isLeaving: Pulse<boolean>;
}

/**
 * Reactive enter/leave transition hook.
 * Animates content in and out based on a reactive condition.
 * Automatically cleans up when the enclosing effect is disposed.
 *
 * @param condition Reactive condition function (or static boolean)
 * @param options Transition configuration
 * @returns Transition result with container and reactive state
 *
 * @example
 * const { container, isEntering, isLeaving } = useTransition(
 *   () => showModal.get(),
 *   {
 *     enter: { opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] },
 *     leave: { opacity: [1, 0], transform: ['scale(1)', 'scale(0.9)'] },
 *     duration: 200,
 *     onEnter: () => el('.modal', 'Hello!'),
 *   }
 * );
 */
export declare function useTransition(
  condition: (() => boolean) | boolean,
  options?: TransitionOptions
): TransitionResult;

// ============================================================================
// useSpring()
// ============================================================================

/** Options for the useSpring() hook */
export interface SpringOptions {
  /** Spring stiffness (default: 170) */
  stiffness?: number;

  /** Damping coefficient (default: 26) */
  damping?: number;

  /** Mass (default: 1) */
  mass?: number;

  /** Precision threshold for settling (default: 0.01) */
  precision?: number;
}

/** Return type of useSpring() */
export interface SpringResult {
  /** Reactive current value of the spring */
  value: Pulse<number>;

  /** Reactive flag: true while the spring is animating */
  isAnimating: Pulse<boolean>;

  /**
   * Set a new target value for the spring to animate towards
   * @param newTarget New target value
   */
  set(newTarget: number): void;

  /** Dispose the spring animation and clean up resources */
  dispose(): void;
}

/**
 * Spring-based animation using a damped harmonic oscillator.
 * Supports both static and reactive target values.
 * Automatically cleans up when the enclosing effect is disposed.
 *
 * @param target Target value (number) or reactive function returning a number
 * @param options Spring physics configuration
 * @returns Spring result with reactive value and controls
 *
 * @example
 * // Static target
 * const spring = useSpring(100, { stiffness: 170, damping: 26 });
 * spring.set(200); // Animate to 200
 *
 * // Reactive target
 * const x = pulse(0);
 * const spring = useSpring(() => x.get(), { stiffness: 300 });
 * x.set(100); // Spring automatically animates to 100
 *
 * effect(() => {
 *   element.style.transform = `translateX(${spring.value.get()}px)`;
 * });
 */
export declare function useSpring(
  target: number | (() => number),
  options?: SpringOptions
): SpringResult;

// ============================================================================
// stagger()
// ============================================================================

/** Options for the stagger() function */
export interface StaggerOptions extends AnimateOptions {
  /** Delay between each element's animation start in ms (default: 50) */
  staggerDelay?: number;
}

/**
 * Stagger an animation across multiple elements.
 * Each element starts its animation after a configurable delay from the previous one.
 *
 * @param elements Array of elements to animate
 * @param keyframes Keyframes in WAAPI format
 * @param options Stagger and animation options
 * @returns Array of AnimationControl objects, one per element
 *
 * @example
 * const items = document.querySelectorAll('.list-item');
 * const controls = stagger(
 *   Array.from(items),
 *   [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }],
 *   { duration: 300, staggerDelay: 50, easing: 'ease-out' }
 * );
 *
 * // Wait for all animations to finish
 * await Promise.all(controls.map(c => c.finished));
 */
export declare function stagger(
  elements: HTMLElement[],
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: StaggerOptions
): AnimationControl[];

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  animate: typeof animate;
  useTransition: typeof useTransition;
  useSpring: typeof useSpring;
  stagger: typeof stagger;
  configureAnimations: typeof configureAnimations;
};

export default _default;
