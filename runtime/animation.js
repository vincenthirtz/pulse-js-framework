/**
 * Pulse Animation Module
 * Web Animations API wrapper with Pulse reactivity and reduced motion support.
 *
 * @module pulse-js-framework/runtime/animation
 */

import { pulse, computed, effect, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { getAdapter, MockDOMAdapter } from './dom-adapter.js';
import { prefersReducedMotion } from './a11y.js';

const log = loggers.dom;

// =============================================================================
// CONFIGURATION
// =============================================================================

const _config = {
  respectReducedMotion: true,
  defaultDuration: 300,
  defaultEasing: 'ease-out',
  disabled: false,
};

/**
 * Configure global animation settings
 *
 * @param {Object} options
 * @param {boolean} [options.respectReducedMotion=true] - Respect prefers-reduced-motion
 * @param {number} [options.defaultDuration=300] - Default animation duration (ms)
 * @param {string} [options.defaultEasing='ease-out'] - Default easing function
 * @param {boolean} [options.disabled=false] - Kill switch to disable all animations
 */
export function configureAnimations(options = {}) {
  if (options.respectReducedMotion !== undefined) _config.respectReducedMotion = options.respectReducedMotion;
  if (options.defaultDuration !== undefined) _config.defaultDuration = options.defaultDuration;
  if (options.defaultEasing !== undefined) _config.defaultEasing = options.defaultEasing;
  if (options.disabled !== undefined) _config.disabled = options.disabled;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function _isSSR() {
  const adapter = getAdapter();
  return adapter instanceof MockDOMAdapter;
}

function _shouldAnimate() {
  if (_config.disabled) return false;
  if (_isSSR()) return false;
  if (_config.respectReducedMotion && prefersReducedMotion()) return false;
  return true;
}

function _getEffectiveDuration(duration) {
  if (!_shouldAnimate()) return 0;
  return duration ?? _config.defaultDuration;
}

// =============================================================================
// animate()
// =============================================================================

/**
 * Animate an element using the Web Animations API
 *
 * @param {HTMLElement} element - Element to animate
 * @param {Array<Object>|Object} keyframes - Keyframes (WAAPI format)
 * @param {Object} [options] - Animation options
 * @param {number} [options.duration] - Duration in ms (default: configureAnimations default)
 * @param {string} [options.easing] - Easing function
 * @param {string} [options.fill='none'] - Fill mode
 * @param {number} [options.delay=0] - Delay in ms
 * @param {number} [options.iterations=1] - Number of iterations
 * @param {string} [options.direction='normal'] - Direction
 * @returns {Object} AnimationControl with reactive state
 */
export function animate(element, keyframes, options = {}) {
  const isPlaying = pulse(false);
  const progress = pulse(0);

  // SSR or disabled: return no-op control
  if (!_shouldAnimate() || !element || typeof element.animate !== 'function') {
    return _createNoopControl(isPlaying, progress);
  }

  const duration = _getEffectiveDuration(options.duration);
  const animationOptions = {
    duration,
    easing: options.easing ?? _config.defaultEasing,
    fill: options.fill ?? 'none',
    delay: options.delay ?? 0,
    iterations: options.iterations ?? 1,
    direction: options.direction ?? 'normal',
  };

  let animation = null;
  let rafId = null;

  try {
    animation = element.animate(keyframes, animationOptions);
  } catch (e) {
    log.warn('Animation failed:', e.message);
    return _createNoopControl(isPlaying, progress);
  }

  // Track playing state
  isPlaying.set(true);

  function _updateProgress() {
    if (!animation) return;
    const timing = animation.effect?.getComputedTiming?.();
    if (timing) {
      progress.set(typeof timing.progress === 'number' ? timing.progress : 0);
    }
    if (animation.playState === 'running') {
      rafId = requestAnimationFrame(_updateProgress);
    }
  }

  rafId = requestAnimationFrame(_updateProgress);

  const finishedPromise = animation.finished
    .then(() => {
      isPlaying.set(false);
      progress.set(1);
    })
    .catch(() => {
      // Animation was cancelled
      isPlaying.set(false);
    });

  animation.addEventListener('cancel', () => {
    isPlaying.set(false);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  function _cleanup() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    isPlaying,
    progress,
    finished: finishedPromise,

    play() {
      if (animation) {
        animation.play();
        isPlaying.set(true);
        rafId = requestAnimationFrame(_updateProgress);
      }
    },

    pause() {
      if (animation) {
        animation.pause();
        isPlaying.set(false);
        _cleanup();
      }
    },

    reverse() {
      if (animation) {
        animation.reverse();
        isPlaying.set(true);
        rafId = requestAnimationFrame(_updateProgress);
      }
    },

    cancel() {
      if (animation) {
        animation.cancel();
        isPlaying.set(false);
        progress.set(0);
        _cleanup();
      }
    },

    finish() {
      if (animation) {
        animation.finish();
        isPlaying.set(false);
        progress.set(1);
        _cleanup();
      }
    },

    dispose() {
      _cleanup();
      if (animation) {
        try { animation.cancel(); } catch { /* already finished */ }
      }
      isPlaying.set(false);
    },
  };
}

function _createNoopControl(isPlaying, progress) {
  return {
    isPlaying,
    progress,
    finished: Promise.resolve(),
    play() {},
    pause() {},
    reverse() {},
    cancel() {},
    finish() { progress.set(1); },
    dispose() {},
  };
}

// =============================================================================
// useTransition()
// =============================================================================

/**
 * Reactive enter/leave transition hook
 *
 * @param {Function} condition - Reactive condition function
 * @param {Object} options - Transition options
 * @param {Object} [options.enter] - Enter keyframes
 * @param {Object} [options.leave] - Leave keyframes
 * @param {number} [options.duration] - Duration in ms
 * @param {string} [options.easing] - Easing function
 * @param {Function} [options.onEnter] - Template factory for entering content
 * @param {Function} [options.onLeave] - Template factory for leaving content (optional)
 * @returns {Object} { nodes, isEntering, isLeaving }
 */
export function useTransition(condition, options = {}) {
  const dom = getAdapter();

  const {
    enter = { opacity: [0, 1] },
    leave = { opacity: [1, 0] },
    duration,
    easing,
    onEnter = null,
    onLeave = null,
  } = options;

  const isEntering = pulse(false);
  const isLeaving = pulse(false);

  const container = dom.createDocumentFragment();
  const marker = dom.createComment('transition');
  dom.appendChild(container, marker);

  let currentNodes = [];
  let activeAnimation = null;

  function _removeCurrentNodes() {
    for (const node of currentNodes) {
      dom.removeNode(node);
      if (node._pulseUnmount) {
        for (const cb of node._pulseUnmount) cb();
      }
    }
    currentNodes = [];
  }

  function _insertNodes(nodes) {
    const fragment = dom.createDocumentFragment();
    for (const node of nodes) {
      if (dom.isNode(node)) {
        dom.appendChild(fragment, node);
        currentNodes.push(node);
      }
    }
    const markerParent = dom.getParentNode(marker);
    if (markerParent) {
      dom.insertBefore(markerParent, fragment, dom.getNextSibling(marker));
    }
  }

  effect(() => {
    const show = typeof condition === 'function' ? condition() : condition;

    if (show) {
      // Enter
      if (activeAnimation) {
        activeAnimation.dispose();
        activeAnimation = null;
      }

      // If we have leave content, animate it out first
      if (currentNodes.length > 0 && _shouldAnimate()) {
        isLeaving.set(true);
        const nodesToRemove = [...currentNodes];
        currentNodes = [];

        // Animate leave on old nodes
        const leaveAnims = nodesToRemove
          .filter(n => typeof n.animate === 'function')
          .map(n => animate(n, leave, { duration, easing }));

        if (leaveAnims.length > 0) {
          Promise.all(leaveAnims.map(a => a.finished)).then(() => {
            for (const n of nodesToRemove) dom.removeNode(n);
            isLeaving.set(false);
            _enterContent();
          });
          return;
        } else {
          for (const n of nodesToRemove) dom.removeNode(n);
          isLeaving.set(false);
        }
      } else {
        _removeCurrentNodes();
      }

      _enterContent();
    } else {
      // Leave
      if (activeAnimation) {
        activeAnimation.dispose();
        activeAnimation = null;
      }

      if (currentNodes.length > 0) {
        isLeaving.set(true);
        const nodesToRemove = [...currentNodes];
        currentNodes = [];

        if (_shouldAnimate()) {
          const leaveAnims = nodesToRemove
            .filter(n => typeof n.animate === 'function')
            .map(n => animate(n, leave, { duration, easing }));

          if (leaveAnims.length > 0) {
            Promise.all(leaveAnims.map(a => a.finished)).then(() => {
              for (const n of nodesToRemove) dom.removeNode(n);
              isLeaving.set(false);
            });
            return;
          }
        }

        for (const n of nodesToRemove) dom.removeNode(n);
        isLeaving.set(false);
      }
    }
  });

  function _enterContent() {
    if (!onEnter) return;

    const result = onEnter();
    if (!result) return;

    const nodes = Array.isArray(result) ? result : [result];
    _insertNodes(nodes);

    if (_shouldAnimate()) {
      isEntering.set(true);
      const enterAnims = currentNodes
        .filter(n => typeof n.animate === 'function')
        .map(n => animate(n, enter, { duration, easing }));

      if (enterAnims.length > 0) {
        Promise.all(enterAnims.map(a => a.finished)).then(() => {
          isEntering.set(false);
        });
      } else {
        isEntering.set(false);
      }
    }
  }

  onCleanup(() => {
    if (activeAnimation) activeAnimation.dispose();
    _removeCurrentNodes();
  });

  return {
    container,
    isEntering,
    isLeaving,
  };
}

// =============================================================================
// useSpring()
// =============================================================================

/**
 * Spring-based animation using damped harmonic oscillator
 *
 * @param {number|Function} target - Target value (or reactive function)
 * @param {Object} [options]
 * @param {number} [options.stiffness=170] - Spring stiffness
 * @param {number} [options.damping=26] - Damping coefficient
 * @param {number} [options.mass=1] - Mass
 * @param {number} [options.precision=0.01] - Settle precision
 * @returns {Object} { value, isAnimating, set, dispose }
 */
export function useSpring(target, options = {}) {
  const {
    stiffness = 170,
    damping = 26,
    mass = 1,
    precision = 0.01,
  } = options;

  const initial = typeof target === 'function' ? target() : target;
  const value = pulse(initial);
  const isAnimating = pulse(false);

  let currentValue = initial;
  let velocity = 0;
  let targetValue = initial;
  let rafId = null;
  let lastTime = 0;

  function _step(time) {
    if (!lastTime) {
      lastTime = time;
      rafId = requestAnimationFrame(_step);
      return;
    }

    const dt = Math.min((time - lastTime) / 1000, 0.064); // Cap at ~16fps minimum
    lastTime = time;

    // Damped spring: F = -kx - cv
    const displacement = currentValue - targetValue;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    currentValue += velocity * dt;

    // Check if settled
    if (Math.abs(velocity) < precision && Math.abs(displacement) < precision) {
      currentValue = targetValue;
      velocity = 0;
      value.set(currentValue);
      isAnimating.set(false);
      rafId = null;
      return;
    }

    value.set(currentValue);
    rafId = requestAnimationFrame(_step);
  }

  function _startAnimation() {
    if (!_shouldAnimate()) {
      currentValue = targetValue;
      value.set(currentValue);
      return;
    }

    isAnimating.set(true);
    lastTime = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(_step);
  }

  // Watch target changes if reactive
  if (typeof target === 'function') {
    effect(() => {
      const newTarget = target();
      if (newTarget !== targetValue) {
        targetValue = newTarget;
        _startAnimation();
      }
    });
  }

  function set(newTarget) {
    targetValue = newTarget;
    _startAnimation();
  }

  function dispose() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isAnimating.set(false);
  }

  onCleanup(dispose);

  return { value, isAnimating, set, dispose };
}

// =============================================================================
// stagger()
// =============================================================================

/**
 * Stagger animation across multiple elements
 *
 * @param {Array<HTMLElement>} elements - Elements to animate
 * @param {Array<Object>|Object} keyframes - Keyframes
 * @param {Object} [options]
 * @param {number} [options.duration] - Duration per element
 * @param {number} [options.staggerDelay=50] - Delay between each element
 * @param {string} [options.easing] - Easing function
 * @returns {Array<Object>} Array of AnimationControl objects
 */
export function stagger(elements, keyframes, options = {}) {
  const { staggerDelay = 50, ...animOptions } = options;

  return elements.map((element, index) => {
    return animate(element, keyframes, {
      ...animOptions,
      delay: (animOptions.delay ?? 0) + index * staggerDelay,
    });
  });
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  animate,
  useTransition,
  useSpring,
  stagger,
  configureAnimations,
};
