/**
 * Animation Module Tests
 * Tests for runtime/animation.js — animate, useSpring, stagger, useTransition, configureAnimations
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MockDOMAdapter,
  setAdapter,
  resetAdapter,
} from '../runtime/dom-adapter.js';
import { pulse, effect, resetContext } from '../runtime/pulse.js';
import {
  animate,
  useSpring,
  stagger,
  useTransition,
  configureAnimations,
} from '../runtime/animation.js';

// ============================================================================
// Setup / Teardown
// ============================================================================

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
  resetContext();
  // Reset animations to defaults
  configureAnimations({
    respectReducedMotion: true,
    defaultDuration: 300,
    defaultEasing: 'ease-out',
    disabled: false,
  });
});

afterEach(() => {
  resetAdapter();
  resetContext();
});

// ============================================================================
// configureAnimations Tests
// ============================================================================

describe('configureAnimations', () => {
  test('accepts configuration options without throwing', () => {
    assert.doesNotThrow(() => {
      configureAnimations({
        respectReducedMotion: false,
        defaultDuration: 500,
        defaultEasing: 'linear',
        disabled: true,
      });
    });
  });

  test('partial configuration is accepted', () => {
    assert.doesNotThrow(() => {
      configureAnimations({ disabled: true });
    });
    assert.doesNotThrow(() => {
      configureAnimations({ defaultDuration: 100 });
    });
  });
});

// ============================================================================
// animate() Tests — SSR/Mock Environment (No-op)
// ============================================================================

describe('animate() — SSR/mock no-op', () => {
  test('returns control object in mock environment', () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);

    assert.ok(control);
    assert.ok(control.isPlaying);
    assert.ok(control.progress);
    assert.ok(control.finished);
    assert.strictEqual(typeof control.play, 'function');
    assert.strictEqual(typeof control.pause, 'function');
    assert.strictEqual(typeof control.reverse, 'function');
    assert.strictEqual(typeof control.cancel, 'function');
    assert.strictEqual(typeof control.finish, 'function');
    assert.strictEqual(typeof control.dispose, 'function');
  });

  test('isPlaying starts as false in mock', () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('progress starts at 0 in mock', () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    assert.strictEqual(control.progress.get(), 0);
  });

  test('finish sets progress to 1', () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    control.finish();
    assert.strictEqual(control.progress.get(), 1);
  });

  test('finished resolves immediately in mock', async () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    await control.finished;
    // Should not hang
  });

  test('no-op methods do not throw in mock', () => {
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    assert.doesNotThrow(() => {
      control.play();
      control.pause();
      control.reverse();
      control.cancel();
      control.dispose();
    });
  });

  test('returns no-op control for null element', () => {
    const control = animate(null, [{ opacity: 0 }, { opacity: 1 }]);
    assert.ok(control);
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('returns no-op control when animations disabled', () => {
    configureAnimations({ disabled: true });
    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    assert.ok(control);
    assert.strictEqual(control.isPlaying.get(), false);
  });
});

// ============================================================================
// useSpring() Tests
// ============================================================================

describe('useSpring()', () => {
  test('returns value, isAnimating, set, dispose', () => {
    const spring = useSpring(0);

    assert.ok(spring.value);
    assert.ok(spring.isAnimating);
    assert.strictEqual(typeof spring.set, 'function');
    assert.strictEqual(typeof spring.dispose, 'function');
  });

  test('initial value matches target', () => {
    const spring = useSpring(42);
    assert.strictEqual(spring.value.get(), 42);
  });

  test('initial value from reactive function', () => {
    const target = pulse(10);
    const spring = useSpring(() => target.get());
    assert.strictEqual(spring.value.get(), 10);
  });

  test('isAnimating starts as false', () => {
    const spring = useSpring(0);
    assert.strictEqual(spring.isAnimating.get(), false);
  });

  test('set() changes target (in SSR, sets immediately)', () => {
    const spring = useSpring(0);
    spring.set(100);
    // In SSR/mock env, should set immediately (no animation)
    assert.strictEqual(spring.value.get(), 100);
  });

  test('dispose stops animation', () => {
    const spring = useSpring(0);
    spring.dispose();
    assert.strictEqual(spring.isAnimating.get(), false);
  });
});

// ============================================================================
// stagger() Tests
// ============================================================================

describe('stagger()', () => {
  test('returns array of controls', () => {
    const elements = [
      adapter.createElement('div'),
      adapter.createElement('div'),
      adapter.createElement('div'),
    ];
    const controls = stagger(elements, [{ opacity: 0 }, { opacity: 1 }]);

    assert.ok(Array.isArray(controls));
    assert.strictEqual(controls.length, 3);
  });

  test('each control has animation methods', () => {
    const elements = [adapter.createElement('div')];
    const controls = stagger(elements, [{ opacity: 0 }, { opacity: 1 }]);

    const ctrl = controls[0];
    assert.ok(ctrl.isPlaying);
    assert.ok(ctrl.progress);
    assert.strictEqual(typeof ctrl.play, 'function');
    assert.strictEqual(typeof ctrl.pause, 'function');
  });

  test('empty elements returns empty array', () => {
    const controls = stagger([], [{ opacity: 0 }, { opacity: 1 }]);
    assert.deepStrictEqual(controls, []);
  });
});

// ============================================================================
// useTransition() Tests
// ============================================================================

describe('useTransition()', () => {
  test('returns container, isEntering, isLeaving', () => {
    const show = pulse(false);
    const result = useTransition(() => show.get(), {
      onEnter: () => adapter.createElement('div'),
    });

    assert.ok(result.container);
    assert.ok(result.isEntering);
    assert.ok(result.isLeaving);
  });

  test('container includes transition marker', () => {
    const show = pulse(false);
    const result = useTransition(() => show.get());

    // Container is a document fragment with at least a comment marker
    assert.ok(result.container);
    const children = result.container.childNodes || [];
    assert.ok(children.length >= 1);
  });

  test('isEntering and isLeaving start as false', () => {
    const show = pulse(false);
    const result = useTransition(() => show.get());

    assert.strictEqual(result.isEntering.get(), false);
    assert.strictEqual(result.isLeaving.get(), false);
  });
});

// ============================================================================
// Reduced Motion Respect
// ============================================================================

describe('Reduced motion', () => {
  test('animations are no-op in mock/SSR environment regardless of setting', () => {
    configureAnimations({ respectReducedMotion: true });

    const el = adapter.createElement('div');
    const control = animate(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(100px)' }]);

    // In mock env, always returns no-op
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('disabled flag returns no-op controls', () => {
    configureAnimations({ disabled: true });

    const el = adapter.createElement('div');
    const control = animate(el, [{ opacity: 0 }, { opacity: 1 }]);
    assert.strictEqual(control.isPlaying.get(), false);
    assert.strictEqual(control.progress.get(), 0);
  });
});

// ============================================================================
// Browser-like Environment Helpers
// ============================================================================

// Adapter that is NOT MockDOMAdapter → _isSSR() returns false
class FakeBrowserAdapter {
  createDocumentFragment() {
    const frag = { nodeType: 11, childNodes: [] };
    frag.appendChild = (c) => { frag.childNodes.push(c); c._parent = frag; };
    return frag;
  }
  createComment(text) {
    return { nodeType: 8, textContent: text, _parent: null };
  }
  appendChild(parent, child) {
    if (parent && parent.childNodes) { parent.childNodes.push(child); child._parent = parent; }
  }
  removeNode(node) {
    if (node._parent && node._parent.childNodes) {
      const idx = node._parent.childNodes.indexOf(node);
      if (idx !== -1) node._parent.childNodes.splice(idx, 1);
    }
  }
  isNode(n) { return n && typeof n === 'object' && n.nodeType !== undefined; }
  getParentNode(node) { return node._parent || null; }
  getNextSibling(node) {
    if (!node._parent || !node._parent.childNodes) return null;
    const idx = node._parent.childNodes.indexOf(node);
    return node._parent.childNodes[idx + 1] || null;
  }
  insertBefore(parent, newNode, ref) {
    if (!parent || !parent.childNodes) return;
    if (!ref) { parent.childNodes.push(newNode); }
    else {
      const idx = parent.childNodes.indexOf(ref);
      if (idx === -1) parent.childNodes.push(newNode);
      else parent.childNodes.splice(idx, 0, newNode);
    }
    newNode._parent = parent;
  }
}

function createAnimatableElement() {
  const cancelListeners = [];
  let animFinishResolve;
  const animation = {
    playState: 'running',
    finished: new Promise(r => { animFinishResolve = r; }),
    effect: {
      getComputedTiming: () => ({ progress: 0.5 }),
    },
    play() { this.playState = 'running'; },
    pause() { this.playState = 'paused'; },
    reverse() { this.playState = 'running'; },
    cancel() {
      this.playState = 'idle';
      for (const fn of cancelListeners) fn();
    },
    finish() {
      this.playState = 'finished';
      animFinishResolve();
    },
    addEventListener(event, handler) {
      if (event === 'cancel') cancelListeners.push(handler);
    },
    removeEventListener() {},
  };

  const element = {
    nodeType: 1,
    animate: () => animation,
  };

  return { element, animation, resolveFinish: () => animFinishResolve() };
}

let rafCallbacks = [];
let rafIdCounter = 0;
let originalRAF, originalCAF;

function setupRAFMock() {
  originalRAF = globalThis.requestAnimationFrame;
  originalCAF = globalThis.cancelAnimationFrame;
  rafCallbacks = [];
  rafIdCounter = 0;

  globalThis.requestAnimationFrame = (cb) => {
    rafIdCounter++;
    rafCallbacks.push({ id: rafIdCounter, cb });
    return rafIdCounter;
  };

  globalThis.cancelAnimationFrame = (id) => {
    rafCallbacks = rafCallbacks.filter(c => c.id !== id);
  };
}

function teardownRAFMock() {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
  rafCallbacks = [];
}

function flushRAF(time = 16) {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  for (const { cb } of cbs) cb(time);
}

// ============================================================================
// animate() — Browser Path (with WAAPI mock)
// ============================================================================

describe('animate() — browser path', () => {
  let fakeAdapter;

  beforeEach(() => {
    fakeAdapter = new FakeBrowserAdapter();
    setAdapter(fakeAdapter);
    resetContext();
    configureAnimations({
      respectReducedMotion: false,
      defaultDuration: 300,
      defaultEasing: 'ease-out',
      disabled: false,
    });
    setupRAFMock();
  });

  afterEach(() => {
    teardownRAFMock();
    resetAdapter();
    resetContext();
  });

  test('calls element.animate() and sets isPlaying to true', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    assert.strictEqual(control.isPlaying.get(), true);
  });

  test('finished promise sets isPlaying to false and progress to 1', async () => {
    const { element, resolveFinish } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    resolveFinish();
    await control.finished;

    assert.strictEqual(control.isPlaying.get(), false);
    assert.strictEqual(control.progress.get(), 1);
  });

  test('pause() pauses animation and sets isPlaying to false', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.pause();
    assert.strictEqual(animation.playState, 'paused');
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('play() resumes animation and sets isPlaying to true', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.pause();
    control.play();
    assert.strictEqual(control.isPlaying.get(), true);
  });

  test('reverse() reverses animation', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.reverse();
    assert.strictEqual(animation.playState, 'running');
    assert.strictEqual(control.isPlaying.get(), true);
  });

  test('cancel() cancels animation and resets progress', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.cancel();
    assert.strictEqual(control.isPlaying.get(), false);
    assert.strictEqual(control.progress.get(), 0);
  });

  test('finish() finishes animation and sets progress to 1', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.finish();
    assert.strictEqual(control.isPlaying.get(), false);
    assert.strictEqual(control.progress.get(), 1);
  });

  test('dispose() cancels animation and cleans up', () => {
    const { element } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    control.dispose();
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('_updateProgress reads progress from computed timing', () => {
    const { element } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    // First RAF call schedules progress update
    assert.ok(rafCallbacks.length >= 1);

    // Flush RAF to run _updateProgress
    flushRAF(16);

    // Progress should be updated from mock timing (0.5)
    assert.strictEqual(control.progress.get(), 0.5);
  });

  test('handles element.animate() throwing error', () => {
    const element = {
      nodeType: 1,
      animate: () => { throw new Error('WAAPI not supported'); },
    };
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    // Should return no-op control
    assert.strictEqual(control.isPlaying.get(), false);
    assert.ok(control.finished);
  });

  test('cancel event listener sets isPlaying to false', () => {
    const { element, animation } = createAnimatableElement();
    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

    animation.cancel(); // Triggers cancel event listeners
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('cancelled animation rejects finished promise', async () => {
    let finishReject;
    const animation = {
      playState: 'running',
      finished: new Promise((_r, reject) => { finishReject = reject; }),
      effect: { getComputedTiming: () => ({ progress: 0 }) },
      play() {},
      pause() {},
      reverse() {},
      cancel() {
        this.playState = 'idle';
        finishReject(new Error('Cancelled'));
      },
      finish() {},
      addEventListener() {},
      removeEventListener() {},
    };
    const element = { nodeType: 1, animate: () => animation };

    const control = animate(element, [{ opacity: 0 }, { opacity: 1 }]);
    animation.cancel();

    await control.finished;
    assert.strictEqual(control.isPlaying.get(), false);
  });

  test('uses custom duration and easing', () => {
    let receivedOptions = null;
    const animation = {
      playState: 'running',
      finished: new Promise(() => {}),
      effect: { getComputedTiming: () => ({ progress: 0 }) },
      play() {}, pause() {}, reverse() {}, cancel() {}, finish() {},
      addEventListener() {}, removeEventListener() {},
    };
    const element = {
      nodeType: 1,
      animate: (kf, opts) => { receivedOptions = opts; return animation; },
    };

    animate(element, [{ opacity: 0 }], {
      duration: 500,
      easing: 'linear',
      fill: 'forwards',
      delay: 100,
      iterations: 2,
      direction: 'alternate',
    });

    assert.strictEqual(receivedOptions.duration, 500);
    assert.strictEqual(receivedOptions.easing, 'linear');
    assert.strictEqual(receivedOptions.fill, 'forwards');
    assert.strictEqual(receivedOptions.delay, 100);
    assert.strictEqual(receivedOptions.iterations, 2);
    assert.strictEqual(receivedOptions.direction, 'alternate');
  });

  test('_updateProgress stops RAF when playState is not running', () => {
    const animation = {
      playState: 'finished',
      finished: Promise.resolve(),
      effect: { getComputedTiming: () => ({ progress: 1 }) },
      play() {}, pause() {}, reverse() {}, cancel() {}, finish() {},
      addEventListener() {}, removeEventListener() {},
    };
    const element = { nodeType: 1, animate: () => animation };

    animate(element, [{ opacity: 0 }]);

    // Flush RAF
    flushRAF(16);

    // No more RAF scheduled since playState is 'finished'
    assert.strictEqual(rafCallbacks.length, 0);
  });

  test('_updateProgress handles missing effect.getComputedTiming', () => {
    const animation = {
      playState: 'running',
      finished: new Promise(() => {}),
      effect: null,
      play() {}, pause() {}, reverse() {}, cancel() {}, finish() {},
      addEventListener() {}, removeEventListener() {},
    };
    const element = { nodeType: 1, animate: () => animation };

    const control = animate(element, [{ opacity: 0 }]);
    flushRAF(16);

    // Should not crash, progress stays as is
    assert.strictEqual(typeof control.progress.get(), 'number');
  });
});

// ============================================================================
// useSpring() — Browser Path
// ============================================================================

describe('useSpring() — browser path', () => {
  let fakeAdapter;

  beforeEach(() => {
    fakeAdapter = new FakeBrowserAdapter();
    setAdapter(fakeAdapter);
    resetContext();
    configureAnimations({
      respectReducedMotion: false,
      defaultDuration: 300,
      defaultEasing: 'ease-out',
      disabled: false,
    });
    setupRAFMock();
  });

  afterEach(() => {
    teardownRAFMock();
    resetAdapter();
    resetContext();
  });

  test('set() starts animation (isAnimating becomes true)', () => {
    const spring = useSpring(0);
    spring.set(100);

    assert.strictEqual(spring.isAnimating.get(), true);
    assert.ok(rafCallbacks.length > 0);
  });

  test('_step() first call initializes lastTime and reschedules', () => {
    const spring = useSpring(0);
    spring.set(100);

    // First call: lastTime = 0, should just set lastTime and reschedule
    flushRAF(1000);
    assert.ok(rafCallbacks.length > 0); // re-scheduled
  });

  test('_step() updates value towards target', () => {
    const spring = useSpring(0);
    spring.set(100);

    // First call initializes lastTime
    flushRAF(1000);

    // Second call with dt=16ms does physics step
    flushRAF(1016);

    // Value should have moved towards 100
    assert.ok(spring.value.get() > 0);
    assert.ok(spring.value.get() < 100);
  });

  test('spring settles to target value', () => {
    const spring = useSpring(0, { stiffness: 1000, damping: 100, precision: 1 });
    spring.set(100);

    // Simulate many frames to converge
    let time = 1000;
    for (let i = 0; i < 200; i++) {
      flushRAF(time);
      time += 16;
    }

    // Should have settled
    assert.strictEqual(spring.value.get(), 100);
    assert.strictEqual(spring.isAnimating.get(), false);
  });

  test('reactive target triggers animation', () => {
    const target = pulse(0);
    const spring = useSpring(() => target.get());

    target.set(50);

    assert.strictEqual(spring.isAnimating.get(), true);
    assert.ok(rafCallbacks.length > 0);
  });

  test('dispose cancels RAF and stops animation', () => {
    const spring = useSpring(0);
    spring.set(100);

    assert.ok(rafCallbacks.length > 0);
    spring.dispose();

    assert.strictEqual(spring.isAnimating.get(), false);
    // RAF should be cancelled
    assert.strictEqual(rafCallbacks.length, 0);
  });

  test('_step clamps dt to 0.064 max', () => {
    const spring = useSpring(0, { stiffness: 170, damping: 26 });
    spring.set(100);

    // First call initializes
    flushRAF(1000);

    // Large time gap (1 second) - dt should be capped at 0.064
    flushRAF(2000);

    // Should not explode due to large dt
    const val = spring.value.get();
    assert.ok(isFinite(val));
  });

  test('set() during animation retargets', () => {
    const spring = useSpring(0);
    spring.set(100);

    // Run a few frames
    flushRAF(1000);
    flushRAF(1016);

    // Retarget
    spring.set(200);

    // Should still be animating
    assert.strictEqual(spring.isAnimating.get(), true);
  });
});

// ============================================================================
// useTransition() — Browser Path
// ============================================================================

describe('useTransition() — browser path', () => {
  let fakeAdapter;

  beforeEach(() => {
    fakeAdapter = new FakeBrowserAdapter();
    setAdapter(fakeAdapter);
    resetContext();
    configureAnimations({
      respectReducedMotion: false,
      defaultDuration: 300,
      defaultEasing: 'ease-out',
      disabled: false,
    });
    setupRAFMock();
  });

  afterEach(() => {
    teardownRAFMock();
    resetAdapter();
    resetContext();
  });

  test('renders enter content when condition is true', () => {
    const show = pulse(true);
    let enterCalled = false;

    const result = useTransition(() => show.get(), {
      onEnter: () => {
        enterCalled = true;
        return { nodeType: 1, _parent: null };
      },
    });

    assert.ok(enterCalled);
    assert.ok(result.container);
  });

  test('renders no content when condition is false and no onEnter', () => {
    const show = pulse(false);

    const result = useTransition(() => show.get(), {
      onEnter: () => ({ nodeType: 1, _parent: null }),
    });

    // No content should be rendered
    // Container just has marker
    assert.ok(result.container);
    assert.strictEqual(result.isEntering.get(), false);
    assert.strictEqual(result.isLeaving.get(), false);
  });

  test('enter content when onEnter returns array', () => {
    const show = pulse(true);
    const result = useTransition(() => show.get(), {
      onEnter: () => [
        { nodeType: 1, _parent: null },
        { nodeType: 1, _parent: null },
      ],
    });

    assert.ok(result.container);
  });

  test('enter content when onEnter returns null', () => {
    const show = pulse(true);
    const result = useTransition(() => show.get(), {
      onEnter: () => null,
    });

    assert.ok(result.container);
  });

  test('works without onEnter option', () => {
    const show = pulse(true);
    const result = useTransition(() => show.get());

    assert.ok(result.container);
    assert.strictEqual(result.isEntering.get(), false);
  });

  test('leave transition when condition changes from true to false', () => {
    const show = pulse(true);
    // Provide animatable nodes so the async leave path is taken
    let finishResolve;
    const animObj = {
      finished: new Promise(r => { finishResolve = r; }),
      play() {},
      pause() {},
      cancel() {},
      reverse() {},
      finish() { finishResolve(); },
      addEventListener() {},
      removeEventListener() {},
      effect: { getComputedTiming: () => ({ progress: 0.5 }) },
      playState: 'running',
    };
    const result = useTransition(() => show.get(), {
      onEnter: () => ({
        nodeType: 1,
        _parent: null,
        animate: () => animObj,
      }),
    });

    // Change condition to false - triggers leave
    show.set(false);

    // isLeaving should be set (async path — promise not yet resolved)
    assert.strictEqual(result.isLeaving.get(), true);
  });

  test('handles non-function condition', () => {
    // Pass a non-function (static value) — should not crash
    const result = useTransition(true, {
      onEnter: () => ({ nodeType: 1, _parent: null }),
    });

    assert.ok(result.container);
  });
});

// ============================================================================
// stagger() — with delay and options
// ============================================================================

describe('stagger() — browser path', () => {
  beforeEach(() => {
    const fakeAdapter = new FakeBrowserAdapter();
    setAdapter(fakeAdapter);
    resetContext();
    configureAnimations({
      respectReducedMotion: false,
      disabled: false,
    });
    setupRAFMock();
  });

  afterEach(() => {
    teardownRAFMock();
    resetAdapter();
    resetContext();
  });

  test('applies stagger delay to each element', () => {
    const receivedDelays = [];
    const elements = [0, 1, 2].map(() => ({
      nodeType: 1,
      animate: (_kf, opts) => {
        receivedDelays.push(opts.delay);
        return {
          playState: 'running',
          finished: new Promise(() => {}),
          effect: { getComputedTiming: () => ({ progress: 0 }) },
          play() {}, pause() {}, reverse() {}, cancel() {}, finish() {},
          addEventListener() {}, removeEventListener() {},
        };
      },
    }));

    stagger(elements, [{ opacity: 0 }], { staggerDelay: 100 });

    assert.strictEqual(receivedDelays[0], 0);
    assert.strictEqual(receivedDelays[1], 100);
    assert.strictEqual(receivedDelays[2], 200);
  });

  test('adds base delay to stagger delay', () => {
    const receivedDelays = [];
    const elements = [0, 1].map(() => ({
      nodeType: 1,
      animate: (_kf, opts) => {
        receivedDelays.push(opts.delay);
        return {
          playState: 'running',
          finished: new Promise(() => {}),
          effect: { getComputedTiming: () => ({ progress: 0 }) },
          play() {}, pause() {}, reverse() {}, cancel() {}, finish() {},
          addEventListener() {}, removeEventListener() {},
        };
      },
    }));

    stagger(elements, [{ opacity: 0 }], { staggerDelay: 50, delay: 200 });

    assert.strictEqual(receivedDelays[0], 200);
    assert.strictEqual(receivedDelays[1], 250);
  });
});
