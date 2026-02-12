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
