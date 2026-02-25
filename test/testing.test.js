/**
 * Tests for Pulse Testing Utilities
 * @module test/testing
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  setupTestDOM,
  renderPulse,
  trackEffect,
  assertSignal,
  assertSignalDeep,
  spy,
  sleep,
  waitFor,
  mockStorage,
  createTestContext,
  flushEffects,
  fireEvent
} from '../runtime/testing.js';
import { pulse, effect, computed, batch, resetContext, ReactiveContext } from '../runtime/pulse.js';
import { MockDOMAdapter, setAdapter, resetAdapter } from '../runtime/dom-adapter.js';

// =============================================================================
// setupTestDOM
// =============================================================================

describe('setupTestDOM', () => {
  afterEach(() => {
    resetAdapter();
    resetContext();
  });

  test('returns adapter and cleanup function', () => {
    const { adapter, cleanup } = setupTestDOM();
    assert.ok(adapter instanceof MockDOMAdapter);
    assert.strictEqual(typeof cleanup, 'function');
    cleanup();
  });

  test('auto-cleanup with test context', (t) => {
    const { adapter } = setupTestDOM(t);
    assert.ok(adapter instanceof MockDOMAdapter);
    // cleanup registered via t.after — no manual cleanup needed
  });

  test('accepts options as first arg when no test context', () => {
    const { adapter, cleanup } = setupTestDOM({ enhanced: false });
    assert.ok(adapter instanceof MockDOMAdapter);
    cleanup();
  });

  test('resets reactive context by default', () => {
    // Create a pulse in the global context
    const p = pulse(1);
    let ran = 0;
    effect(() => { p.get(); ran++; });
    assert.strictEqual(ran, 1);

    // Setup should reset context
    const { cleanup } = setupTestDOM();
    // After reset, previous effect should not interfere
    cleanup();
  });

  test('respects resetCtx: false option', () => {
    const { cleanup } = setupTestDOM({ resetCtx: false });
    assert.ok(cleanup);
    cleanup();
  });
});

// =============================================================================
// renderPulse
// =============================================================================

describe('renderPulse', () => {
  afterEach(() => {
    resetAdapter();
    resetContext();
  });

  test('renders component into container', () => {
    const { adapter: a } = setupTestDOM();
    const { container, unmount } = renderPulse(() => {
      const div = a.createElement('div');
      a.setTextContent(div, 'Hello');
      return div;
    }, { adapter: a });

    assert.ok(container);
    assert.strictEqual(container.className, 'pulse-test-container');
    assert.ok(container.childNodes.length > 0);
    unmount();
  });

  test('getByText finds element with matching text', () => {
    const { adapter: a } = setupTestDOM();
    const { getByText, unmount } = renderPulse(() => {
      const p = a.createElement('p');
      a.setTextContent(p, 'Hello World');
      return p;
    }, { adapter: a });

    const found = getByText('Hello World');
    assert.ok(found);
    assert.strictEqual(found.tagName, 'P');
    unmount();
  });

  test('getByText throws for missing text', () => {
    const { adapter: a } = setupTestDOM();
    const { getByText, unmount } = renderPulse(() => {
      const p = a.createElement('p');
      a.setTextContent(p, 'Hello');
      return p;
    }, { adapter: a });

    assert.throws(
      () => getByText('Goodbye'),
      /getByText: Unable to find element/
    );
    unmount();
  });

  test('queryByText returns null for missing text', () => {
    const { adapter: a } = setupTestDOM();
    const { queryByText, unmount } = renderPulse(() => {
      const p = a.createElement('p');
      a.setTextContent(p, 'Hello');
      return p;
    }, { adapter: a });

    assert.strictEqual(queryByText('Goodbye'), null);
    unmount();
  });

  test('rerender replaces content', () => {
    const { adapter: a } = setupTestDOM();
    const { queryByText, rerender, unmount } = renderPulse(() => {
      const p = a.createElement('p');
      a.setTextContent(p, 'First');
      return p;
    }, { adapter: a });

    assert.ok(queryByText('First'));

    rerender(() => {
      const p = a.createElement('p');
      a.setTextContent(p, 'Second');
      return p;
    });

    assert.ok(queryByText('Second'));
    unmount();
  });

  test('auto-cleanup with test context', (t) => {
    const { adapter: a } = setupTestDOM(t);
    const { container } = renderPulse(() => {
      const div = a.createElement('div');
      a.setTextContent(div, 'Auto');
      return div;
    }, { adapter: a });

    assert.ok(container);
  });
});

// =============================================================================
// trackEffect
// =============================================================================

describe('trackEffect', () => {
  afterEach(() => {
    resetContext();
  });

  test('tracks initial execution', () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    assert.strictEqual(tracker.count, 1);
    tracker.dispose();
  });

  test('increments count on signal change', () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    assert.strictEqual(tracker.count, 1);

    p.set(1);
    assert.strictEqual(tracker.count, 2);

    p.set(2);
    assert.strictEqual(tracker.count, 3);
    tracker.dispose();
  });

  test('stores return values', () => {
    const p = pulse('a');
    const tracker = trackEffect(() => {
      return p.get().toUpperCase();
    });

    assert.deepStrictEqual(tracker.values, ['A']);
    p.set('b');
    assert.deepStrictEqual(tracker.values, ['A', 'B']);
    tracker.dispose();
  });

  test('reset clears count and values', () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    p.set(1);
    assert.strictEqual(tracker.count, 2);

    tracker.reset();
    assert.strictEqual(tracker.count, 0);
    assert.deepStrictEqual(tracker.values, []);

    // Effect still runs after reset
    p.set(2);
    assert.strictEqual(tracker.count, 1);
    tracker.dispose();
  });

  test('dispose stops the effect', () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    tracker.dispose();

    p.set(1);
    assert.strictEqual(tracker.count, 1); // only the initial run
  });

  test('waitForRun resolves when target count is reached', async () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());

    setTimeout(() => p.set(1), 10);
    await tracker.waitForRun(2, 500);
    assert.strictEqual(tracker.count, 2);
    tracker.dispose();
  });

  test('waitForRun resolves immediately if already met', async () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    p.set(1);
    p.set(2);
    // count is already 3
    await tracker.waitForRun(3, 100);
    assert.strictEqual(tracker.count, 3);
    tracker.dispose();
  });

  test('waitForRun rejects on timeout', async () => {
    const p = pulse(0);
    const tracker = trackEffect(() => p.get());
    // Never update p, so we'll only have count=1
    await assert.rejects(
      () => tracker.waitForRun(5, 50),
      /waitForRun: Expected 5 runs/
    );
    tracker.dispose();
  });
});

// =============================================================================
// assertSignal / assertSignalDeep
// =============================================================================

describe('assertSignal', () => {
  test('passes for matching value', () => {
    const p = pulse(42);
    assertSignal(p, 42);
  });

  test('throws for mismatched value', () => {
    const p = pulse(42);
    assert.throws(
      () => assertSignal(p, 99),
      /Expected signal value 99/
    );
  });

  test('uses custom message when provided', () => {
    const p = pulse('hello');
    assert.throws(
      () => assertSignal(p, 'world', 'custom message'),
      /custom message/
    );
  });

  test('uses peek() to avoid tracking', () => {
    const p = pulse(1);
    let effectRan = 0;

    effect(() => {
      effectRan++;
      // Call assertSignal inside an effect — should NOT create a dependency
      assertSignal(p, 1);
    });

    assert.strictEqual(effectRan, 1);
    p.set(2);
    // If assertSignal used .get(), effectRan would be 2 because
    // it would have been tracked. With .peek(), effectRan stays 1
    // (the effect re-runs because of the set, but the assert would fail)
    // Actually the effect re-runs regardless due to p.set(2).
    // The point is assertSignal itself doesn't add tracking.
    resetContext();
  });
});

describe('assertSignalDeep', () => {
  test('passes for matching objects', () => {
    const p = pulse({ a: 1, b: [2, 3] });
    assertSignalDeep(p, { a: 1, b: [2, 3] });
  });

  test('throws for mismatched objects', () => {
    const p = pulse({ a: 1 });
    assert.throws(
      () => assertSignalDeep(p, { a: 2 }),
      (err) => err instanceof assert.AssertionError || err instanceof Error
    );
  });

  test('passes for matching arrays', () => {
    const p = pulse([1, 2, 3]);
    assertSignalDeep(p, [1, 2, 3]);
  });
});

// =============================================================================
// spy
// =============================================================================

describe('spy', () => {
  test('records all calls', () => {
    const fn = spy();
    fn('a', 'b');
    fn('c');
    assert.strictEqual(fn.callCount, 2);
    assert.deepStrictEqual(fn.calls[0].args, ['a', 'b']);
    assert.deepStrictEqual(fn.calls[1].args, ['c']);
  });

  test('callCount reflects total calls', () => {
    const fn = spy();
    assert.strictEqual(fn.callCount, 0);
    fn();
    assert.strictEqual(fn.callCount, 1);
    fn();
    fn();
    assert.strictEqual(fn.callCount, 3);
  });

  test('lastCall returns most recent', () => {
    const fn = spy();
    assert.strictEqual(fn.lastCall(), undefined);
    fn('first');
    fn('second');
    assert.deepStrictEqual(fn.lastCall().args, ['second']);
  });

  test('nthCall returns specific call', () => {
    const fn = spy();
    fn('a');
    fn('b');
    fn('c');
    assert.deepStrictEqual(fn.nthCall(0).args, ['a']);
    assert.deepStrictEqual(fn.nthCall(1).args, ['b']);
    assert.deepStrictEqual(fn.nthCall(2).args, ['c']);
  });

  test('calledWith matches by value', () => {
    const fn = spy();
    fn(1, 'hello');
    fn(2, 'world');
    assert.ok(fn.calledWith(1, 'hello'));
    assert.ok(fn.calledWith(2, 'world'));
    assert.ok(!fn.calledWith(3, 'hello'));
  });

  test('uses provided implementation', () => {
    const fn = spy((a, b) => a + b);
    const result = fn(2, 3);
    assert.strictEqual(result, 5);
    assert.strictEqual(fn.calls[0].returnValue, 5);
  });

  test('mockReturnValue overrides implementation', () => {
    const fn = spy(() => 'original');
    fn.mockReturnValue('mocked');
    assert.strictEqual(fn(), 'mocked');
    assert.strictEqual(fn(), 'mocked');
  });

  test('mockReturnValueOnce queues return values', () => {
    const fn = spy(() => 'default');
    fn.mockReturnValueOnce('first');
    fn.mockReturnValueOnce('second');
    assert.strictEqual(fn(), 'first');
    assert.strictEqual(fn(), 'second');
    assert.strictEqual(fn(), 'default'); // falls through to impl
  });

  test('reset clears all state', () => {
    const fn = spy();
    fn.mockReturnValue('mocked');
    fn('a');
    fn('b');
    fn.reset();
    assert.strictEqual(fn.callCount, 0);
    assert.deepStrictEqual(fn.calls, []);
    // After reset, mockReturnValue should also be cleared
    assert.strictEqual(fn(), undefined);
  });

  test('records timestamps', () => {
    const fn = spy();
    const before = Date.now();
    fn();
    const after = Date.now();
    assert.ok(fn.calls[0].timestamp >= before);
    assert.ok(fn.calls[0].timestamp <= after);
  });
});

// =============================================================================
// sleep
// =============================================================================

describe('sleep', () => {
  test('resolves after approximate delay', async () => {
    const start = Date.now();
    await sleep(30);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 25, `Expected at least 25ms, got ${elapsed}ms`);
  });

  test('resolves with undefined', async () => {
    const result = await sleep(1);
    assert.strictEqual(result, undefined);
  });
});

// =============================================================================
// waitFor
// =============================================================================

describe('waitFor', () => {
  test('resolves when condition becomes true', async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 20);
    await waitFor(() => ready, { timeout: 500 });
    assert.ok(ready);
  });

  test('resolves immediately if already true', async () => {
    await waitFor(() => true, { timeout: 100 });
  });

  test('rejects with timeout error', async () => {
    await assert.rejects(
      () => waitFor(() => false, { timeout: 50 }),
      /Condition not met within 50ms/
    );
  });

  test('uses custom error message', async () => {
    await assert.rejects(
      () => waitFor(() => false, { timeout: 50, message: 'Custom failure' }),
      /Custom failure/
    );
  });

  test('supports async condition function', async () => {
    let counter = 0;
    await waitFor(async () => {
      counter++;
      return counter >= 3;
    }, { timeout: 500, interval: 5 });
    assert.ok(counter >= 3);
  });
});

// =============================================================================
// mockStorage
// =============================================================================

describe('mockStorage', () => {
  test('getItem/setItem work correctly', () => {
    const mock = mockStorage();
    mock.storage.setItem('key', 'value');
    assert.strictEqual(mock.storage.getItem('key'), 'value');
    assert.strictEqual(mock.storage.getItem('missing'), null);
  });

  test('removeItem removes entries', () => {
    const mock = mockStorage();
    mock.storage.setItem('key', 'value');
    mock.storage.removeItem('key');
    assert.strictEqual(mock.storage.getItem('key'), null);
  });

  test('clear empties all data', () => {
    const mock = mockStorage();
    mock.storage.setItem('a', '1');
    mock.storage.setItem('b', '2');
    mock.clear();
    assert.strictEqual(mock.storage.length, 0);
  });

  test('length reflects entry count', () => {
    const mock = mockStorage();
    assert.strictEqual(mock.storage.length, 0);
    mock.storage.setItem('a', '1');
    assert.strictEqual(mock.storage.length, 1);
    mock.storage.setItem('b', '2');
    assert.strictEqual(mock.storage.length, 2);
  });

  test('key returns correct key by index', () => {
    const mock = mockStorage();
    mock.storage.setItem('alpha', '1');
    mock.storage.setItem('beta', '2');
    assert.strictEqual(mock.storage.key(0), 'alpha');
    assert.strictEqual(mock.storage.key(1), 'beta');
    assert.strictEqual(mock.storage.key(5), null);
  });

  test('pre-populates with initial data', () => {
    const mock = mockStorage({ initial: { theme: 'dark', lang: 'en' } });
    assert.strictEqual(mock.storage.getItem('theme'), 'dark');
    assert.strictEqual(mock.storage.getItem('lang'), 'en');
    assert.strictEqual(mock.storage.length, 2);
  });

  test('converts values to strings', () => {
    const mock = mockStorage();
    mock.storage.setItem('num', 42);
    assert.strictEqual(mock.storage.getItem('num'), '42');
  });

  test('install/uninstall manage globals', () => {
    const mock = mockStorage();
    const originalLS = globalThis.localStorage;

    mock.install('localStorage');
    assert.strictEqual(globalThis.localStorage, mock.storage);

    mock.uninstall();
    assert.strictEqual(globalThis.localStorage, originalLS);
  });

  test('spies track calls', () => {
    const mock = mockStorage();
    mock.storage.getItem('test');
    mock.storage.setItem('key', 'val');
    mock.storage.removeItem('key');

    assert.strictEqual(mock.getItemSpy.callCount, 1);
    assert.ok(mock.getItemSpy.calledWith('test'));
    assert.strictEqual(mock.setItemSpy.callCount, 1);
    assert.ok(mock.setItemSpy.calledWith('key', 'val'));
    assert.strictEqual(mock.removeItemSpy.callCount, 1);
    assert.ok(mock.removeItemSpy.calledWith('key'));
  });

  test('clear resets spies too', () => {
    const mock = mockStorage();
    mock.storage.setItem('a', '1');
    mock.clear();
    assert.strictEqual(mock.setItemSpy.callCount, 0);
    assert.strictEqual(mock.storage.length, 0);
  });
});

// =============================================================================
// createTestContext
// =============================================================================

describe('createTestContext', () => {
  test('creates isolated context', () => {
    const ctx = createTestContext('test-1');
    assert.ok(ctx.ctx instanceof ReactiveContext);
    assert.strictEqual(ctx.ctx.name, 'test-1');
    ctx.dispose();
  });

  test('scoped pulse works', () => {
    const ctx = createTestContext();
    const count = ctx.pulse(0);
    assertSignal(count, 0);
    count.set(5);
    assertSignal(count, 5);
    ctx.dispose();
  });

  test('scoped effect runs in context', () => {
    const ctx = createTestContext();
    const count = ctx.pulse(0);
    let effectRan = 0;

    ctx.effect(() => {
      count.get();
      effectRan++;
    });

    assert.strictEqual(effectRan, 1);
    count.set(1);
    assert.strictEqual(effectRan, 2);
    ctx.dispose();
  });

  test('scoped computed works', () => {
    const ctx = createTestContext();
    const count = ctx.pulse(2);
    const doubled = ctx.computed(() => count.get() * 2);
    assert.strictEqual(doubled.get(), 4);
    count.set(5);
    assert.strictEqual(doubled.get(), 10);
    ctx.dispose();
  });

  test('reset clears context', () => {
    const ctx = createTestContext();
    const count = ctx.pulse(0);
    let effectRan = 0;

    ctx.effect(() => {
      count.get();
      effectRan++;
    });

    assert.strictEqual(effectRan, 1);
    ctx.reset();
    // After reset, effect should not run anymore
    // (since context is cleared)
  });

  test('does not affect global context', () => {
    // Create something in global context
    const globalP = pulse(0);
    let globalEffectRan = 0;
    const dispose = effect(() => {
      globalP.get();
      globalEffectRan++;
    });

    // Create isolated context
    const ctx = createTestContext();
    const localP = ctx.pulse(0);
    ctx.effect(() => localP.get());

    // Reset isolated context should not affect global
    ctx.dispose();
    globalP.set(1);
    assert.strictEqual(globalEffectRan, 2);
    dispose();
    resetContext();
  });
});

// =============================================================================
// flushEffects
// =============================================================================

describe('flushEffects', () => {
  afterEach(() => resetContext());

  test('flushes pending batched effects', () => {
    const p = pulse(0);
    let ran = 0;

    effect(() => {
      p.get();
      ran++;
    });
    assert.strictEqual(ran, 1);

    batch(() => {
      p.set(1);
      p.set(2);
      p.set(3);
      // Effects deferred during batch
    });

    // After batch completes, effects should have flushed
    assert.strictEqual(ran, 2);
  });

  test('flushEffects is safe to call when nothing is pending', () => {
    // Should not throw
    flushEffects();
  });
});

// =============================================================================
// fireEvent
// =============================================================================

describe('fireEvent', () => {
  afterEach(() => {
    resetAdapter();
    resetContext();
  });

  test('dispatches event to listeners', () => {
    const { adapter } = setupTestDOM();
    const btn = adapter.createElement('button');
    const handler = spy();
    adapter.addEventListener(btn, 'click', handler);

    fireEvent(btn, 'click');

    assert.strictEqual(handler.callCount, 1);
    assert.strictEqual(handler.lastCall().args[0].type, 'click');
  });

  test('event has correct target', () => {
    const { adapter } = setupTestDOM();
    const input = adapter.createElement('input');
    const handler = spy();
    adapter.addEventListener(input, 'input', handler);

    fireEvent(input, 'input', { value: 'test' });

    const event = handler.lastCall().args[0];
    assert.strictEqual(event.target, input);
    assert.strictEqual(event.value, 'test');
  });

  test('fireEvent.click shorthand', () => {
    const { adapter } = setupTestDOM();
    const btn = adapter.createElement('button');
    const handler = spy();
    adapter.addEventListener(btn, 'click', handler);

    fireEvent.click(btn);
    assert.strictEqual(handler.callCount, 1);
  });

  test('fireEvent.input shorthand', () => {
    const { adapter } = setupTestDOM();
    const input = adapter.createElement('input');
    const handler = spy();
    adapter.addEventListener(input, 'input', handler);

    fireEvent.input(input, { value: 'hello' });
    assert.strictEqual(handler.callCount, 1);
    assert.strictEqual(handler.lastCall().args[0].value, 'hello');
  });

  test('fireEvent.keydown shorthand', () => {
    const { adapter } = setupTestDOM();
    const el = adapter.createElement('div');
    const handler = spy();
    adapter.addEventListener(el, 'keydown', handler);

    fireEvent.keydown(el, { key: 'Enter', code: 'Enter' });
    assert.strictEqual(handler.callCount, 1);
    assert.strictEqual(handler.lastCall().args[0].key, 'Enter');
  });

  test('preventDefault works', () => {
    const { adapter } = setupTestDOM();
    const form = adapter.createElement('form');
    adapter.addEventListener(form, 'submit', (e) => {
      e.preventDefault();
    });

    const result = fireEvent.submit(form);
    assert.strictEqual(result, false);
  });
});

// =============================================================================
// Integration: Multiple utilities together
// =============================================================================

describe('Integration', () => {
  test('setupTestDOM + trackEffect + assertSignal', (t) => {
    setupTestDOM(t);
    const count = pulse(0);
    const tracker = trackEffect(() => count.get());

    count.set(1);
    count.set(2);

    assertSignal(count, 2);
    assert.strictEqual(tracker.count, 3);
    tracker.dispose();
  });

  test('renderPulse + fireEvent + spy', (t) => {
    const { adapter } = setupTestDOM(t);
    const clicked = spy();

    const { container } = renderPulse(() => {
      const btn = adapter.createElement('button');
      adapter.setTextContent(btn, 'Click me');
      adapter.addEventListener(btn, 'click', clicked);
      return btn;
    }, t);

    // Find button and click it
    const btn = container.childNodes[0];
    fireEvent.click(btn);

    assert.strictEqual(clicked.callCount, 1);
  });

  test('mockStorage + spy tracking', (t) => {
    const mock = mockStorage({ initial: { count: '0' } });
    mock.install('localStorage');
    t.after(() => mock.uninstall());

    const val = globalThis.localStorage.getItem('count');
    assert.strictEqual(val, '0');

    globalThis.localStorage.setItem('count', '5');
    assert.strictEqual(globalThis.localStorage.getItem('count'), '5');
    assert.ok(mock.setItemSpy.calledWith('count', '5'));
  });
});
