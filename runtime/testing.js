/**
 * Pulse Testing Utilities
 *
 * A testing library for Pulse applications that eliminates common boilerplate.
 * Designed to work with Node.js built-in test runner (node:test).
 *
 * @module pulse-js-framework/testing
 *
 * @example
 * import { setupTestDOM, trackEffect, assertSignal, spy } from 'pulse-js-framework/testing';
 * import { pulse } from 'pulse-js-framework/runtime/pulse';
 *
 * test('reactive counter', (t) => {
 *   const { adapter } = setupTestDOM(t);
 *   const count = pulse(0);
 *   const tracker = trackEffect(() => count.get());
 *
 *   count.set(5);
 *   assertSignal(count, 5);
 *   assert.strictEqual(tracker.count, 2);
 *   tracker.dispose();
 * });
 */

import assert from 'node:assert';
import {
  MockDOMAdapter,
  MockElement,
  EnhancedMockAdapter,
  setAdapter,
  resetAdapter,
  getAdapter
} from './dom-adapter.js';
import {
  pulse as createPulse,
  effect as createEffect,
  computed as createComputed,
  batch,
  resetContext,
  ReactiveContext,
  withContext,
  createContext
} from './pulse.js';

// =============================================================================
// 1. setupTestDOM
// =============================================================================

/**
 * Set up a MockDOMAdapter and reset the reactive context.
 * When a node:test context `t` is provided, cleanup is auto-registered via t.after().
 *
 * @param {import('node:test').TestContext} [t] - node:test context for auto-cleanup
 * @param {object} [options]
 * @param {boolean} [options.enhanced=false] - Use EnhancedMockAdapter
 * @param {boolean} [options.resetCtx=true] - Call resetContext() on setup
 * @returns {{ adapter: MockDOMAdapter, cleanup: Function }}
 *
 * @example
 * test('my test', (t) => {
 *   const { adapter } = setupTestDOM(t);
 *   const el = adapter.createElement('div');
 * });
 */
export function setupTestDOM(t, options = {}) {
  // Handle case where t is actually options (no test context)
  if (t && typeof t.after !== 'function') {
    options = t;
    t = null;
  }

  const { enhanced = false, resetCtx = true } = options;

  if (resetCtx) {
    resetContext();
  }

  const adapter = enhanced ? new EnhancedMockAdapter() : new MockDOMAdapter();
  setAdapter(adapter);

  const cleanup = () => {
    resetAdapter();
    if (resetCtx) {
      resetContext();
    }
  };

  if (t) {
    t.after(cleanup);
  }

  return { adapter, cleanup };
}

// =============================================================================
// 2. renderPulse
// =============================================================================

/**
 * Render a Pulse component into a test container with query helpers.
 *
 * @param {Function} componentFn - Function returning a DOM node
 * @param {import('node:test').TestContext} [t] - node:test context for auto-cleanup
 * @param {object} [options]
 * @param {MockDOMAdapter} [options.adapter] - Existing adapter (created if not provided)
 * @returns {RenderResult}
 *
 * @typedef {object} RenderResult
 * @property {MockElement} container - Root container element
 * @property {MockDOMAdapter} adapter - DOM adapter in use
 * @property {Function} getByText - Find element by text content (throws if not found)
 * @property {Function} getBySelector - Find element via querySelector
 * @property {Function} queryByText - Find element by text (returns null if not found)
 * @property {Function} getAll - Find all elements via querySelectorAll
 * @property {Function} unmount - Remove component from container
 * @property {Function} rerender - Re-render with new component function
 *
 * @example
 * test('renders greeting', (t) => {
 *   const name = pulse('World');
 *   const { getByText } = renderPulse(() => el('h1', () => `Hello ${name.get()}`), t);
 *   assert.ok(getByText('Hello World'));
 * });
 */
export function renderPulse(componentFn, t, options = {}) {
  // Handle overloads: renderPulse(fn, options) without t
  if (t && typeof t.after !== 'function') {
    options = t;
    t = null;
  }

  let adapter = options.adapter;
  let cleanupAdapter = null;

  if (!adapter) {
    const setup = setupTestDOM(t, { resetCtx: !options.adapter });
    adapter = setup.adapter;
    cleanupAdapter = setup.cleanup;
  }

  const container = adapter.createElement('div');
  container.className = 'pulse-test-container';
  adapter.appendChild(adapter.getBody(), container);

  function render(fn) {
    // Clear container
    while (container.childNodes && container.childNodes.length > 0) {
      container.removeChild(container.childNodes[0]);
    }
    const node = fn();
    if (node) {
      adapter.appendChild(container, node);
    }
  }

  render(componentFn);

  /**
   * Recursively get text content from a node tree
   */
  function getTextContent(node) {
    if (!node) return '';
    if (node.nodeType === 3) return node.textContent || '';
    let text = node.textContent;
    if (text !== undefined && text !== null) return String(text);
    // Fallback: recurse children
    let result = '';
    const children = node.childNodes || [];
    for (const child of children) {
      result += getTextContent(child);
    }
    return result;
  }

  /**
   * Recursively find elements matching a text predicate
   */
  function findByText(node, textOrRegex) {
    const results = [];
    if (!node) return results;

    const nodeText = getTextContent(node);
    const matches = textOrRegex instanceof RegExp
      ? textOrRegex.test(nodeText)
      : nodeText.includes(String(textOrRegex));

    if (matches && node.nodeType === 1) {
      results.push(node);
    }

    const children = node.childNodes || [];
    for (const child of children) {
      results.push(...findByText(child, textOrRegex));
    }
    return results;
  }

  function getByText(text) {
    const found = findByText(container, text);
    if (found.length === 0) {
      throw new Error(
        `getByText: Unable to find element with text "${text}" in container.\n` +
        `Container text: "${getTextContent(container)}"`
      );
    }
    // Return deepest (most specific) match
    return found[found.length - 1];
  }

  function queryByText(text) {
    const found = findByText(container, text);
    return found.length > 0 ? found[found.length - 1] : null;
  }

  function getBySelector(selector) {
    if (typeof container.querySelector === 'function') {
      return container.querySelector(selector);
    }
    // Fallback for basic selectors on MockElement
    const children = container.childNodes || [];
    for (const child of children) {
      if (child.tagName && child.tagName.toLowerCase() === selector.toLowerCase()) {
        return child;
      }
    }
    return null;
  }

  function getAll(selector) {
    if (typeof container.querySelectorAll === 'function') {
      return container.querySelectorAll(selector);
    }
    return [];
  }

  function unmount() {
    while (container.childNodes && container.childNodes.length > 0) {
      container.removeChild(container.childNodes[0]);
    }
    if (cleanupAdapter) {
      cleanupAdapter();
    }
  }

  function rerender(newComponentFn) {
    render(newComponentFn);
  }

  return {
    container,
    adapter,
    getByText,
    getBySelector,
    queryByText,
    getAll,
    unmount,
    rerender
  };
}

// =============================================================================
// 3. trackEffect
// =============================================================================

/**
 * Create a tracked effect that records every execution.
 *
 * @param {Function} fn - Effect body (may access signals, may return a value)
 * @param {object} [options]
 * @param {string} [options.id] - Debug label
 * @returns {EffectTracker}
 *
 * @typedef {object} EffectTracker
 * @property {number} count - Number of times the effect has run
 * @property {Array} values - Return values from each run
 * @property {Function} dispose - Stop the effect
 * @property {Function} reset - Reset count and values without stopping
 * @property {Function} waitForRun - Promise that resolves when count reaches n
 *
 * @example
 * const count = pulse(0);
 * const tracker = trackEffect(() => count.get());
 * count.set(1);
 * assert.strictEqual(tracker.count, 2); // initial + one update
 * tracker.dispose();
 */
export function trackEffect(fn, options = {}) {
  const tracker = {
    count: 0,
    values: [],
    dispose: null,
    reset() {
      tracker.count = 0;
      tracker.values = [];
    },
    waitForRun(n, timeoutMs = 2000) {
      if (tracker.count >= n) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(interval);
          reject(new Error(`waitForRun: Expected ${n} runs but only got ${tracker.count} after ${timeoutMs}ms`));
        }, timeoutMs);
        const interval = setInterval(() => {
          if (tracker.count >= n) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve();
          }
        }, 5);
      });
    }
  };

  const dispose = createEffect(() => {
    const result = fn();
    tracker.count++;
    tracker.values.push(result);
    return result;
  }, options);

  tracker.dispose = dispose;
  return tracker;
}

// =============================================================================
// 4. assertSignal / assertSignalDeep
// =============================================================================

/**
 * Assert that a pulse signal's current value strictly equals expected.
 * Uses .peek() to avoid creating reactive dependencies.
 *
 * @param {import('./pulse.js').Pulse} pulseInstance - Signal to check
 * @param {*} expected - Expected value
 * @param {string} [message] - Custom assertion message
 */
export function assertSignal(pulseInstance, expected, message) {
  const actual = pulseInstance.peek();
  assert.strictEqual(
    actual,
    expected,
    message ?? `Expected signal value ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

/**
 * Assert that a pulse signal's current value is deeply equal to expected.
 * Uses .peek() to avoid creating reactive dependencies.
 *
 * @param {import('./pulse.js').Pulse} pulseInstance - Signal to check
 * @param {*} expected - Expected value
 * @param {string} [message] - Custom assertion message
 */
export function assertSignalDeep(pulseInstance, expected, message) {
  const actual = pulseInstance.peek();
  assert.deepStrictEqual(
    actual,
    expected,
    message ?? `Expected signal value ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

// =============================================================================
// 5. spy
// =============================================================================

/**
 * Create a spy function that records every call.
 *
 * @param {Function} [impl] - Optional implementation
 * @returns {SpyFunction}
 *
 * @typedef {Function & SpyProps} SpyFunction
 * @typedef {object} SpyProps
 * @property {Array<{args: Array, thisArg: *, returnValue: *, timestamp: number}>} calls
 * @property {number} callCount
 * @property {Function} lastCall - Returns the most recent call record
 * @property {Function} calledWith - Check if any call matched these args
 * @property {Function} nthCall - Get the nth call record (0-indexed)
 * @property {Function} reset - Clear recorded calls
 * @property {Function} mockReturnValue - Set fixed return value
 * @property {Function} mockReturnValueOnce - Queue a one-time return value
 *
 * @example
 * const onClick = spy();
 * button.addEventListener('click', onClick);
 * fireEvent.click(button);
 * assert.strictEqual(onClick.callCount, 1);
 */
export function spy(impl) {
  let _impl = impl || (() => undefined);
  let _fixedReturn = undefined;
  let _hasFixedReturn = false;
  const _onceQueue = [];

  function spyFn(...args) {
    let returnValue;

    if (_onceQueue.length > 0) {
      returnValue = _onceQueue.shift();
    } else if (_hasFixedReturn) {
      returnValue = _fixedReturn;
    } else {
      returnValue = _impl.apply(this, args);
    }

    spyFn.calls.push({
      args,
      thisArg: this,
      returnValue,
      timestamp: Date.now()
    });

    return returnValue;
  }

  spyFn.calls = [];

  Object.defineProperty(spyFn, 'callCount', {
    get() { return spyFn.calls.length; },
    enumerable: true
  });

  spyFn.lastCall = function () {
    return spyFn.calls.length > 0 ? spyFn.calls[spyFn.calls.length - 1] : undefined;
  };

  spyFn.nthCall = function (n) {
    return spyFn.calls[n];
  };

  spyFn.calledWith = function (...expectedArgs) {
    return spyFn.calls.some(call =>
      call.args.length === expectedArgs.length &&
      call.args.every((arg, i) => Object.is(arg, expectedArgs[i]))
    );
  };

  spyFn.reset = function () {
    spyFn.calls = [];
    _onceQueue.length = 0;
    _hasFixedReturn = false;
    _fixedReturn = undefined;
  };

  spyFn.mockReturnValue = function (val) {
    _fixedReturn = val;
    _hasFixedReturn = true;
    return spyFn;
  };

  spyFn.mockReturnValueOnce = function (val) {
    _onceQueue.push(val);
    return spyFn;
  };

  return spyFn;
}

// =============================================================================
// 6. sleep
// =============================================================================

/**
 * Return a promise that resolves after the given number of milliseconds.
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// 7. waitFor
// =============================================================================

/**
 * Poll until a condition becomes true. Supports sync and async predicates.
 *
 * @param {Function} conditionFn - Sync or async predicate
 * @param {object} [options]
 * @param {number} [options.timeout=2000] - Max wait in ms
 * @param {number} [options.interval=10] - Poll interval in ms
 * @param {string} [options.message] - Custom timeout error message
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 *
 * @example
 * const ready = pulse(false);
 * setTimeout(() => ready.set(true), 50);
 * await waitFor(() => ready.peek() === true);
 */
export function waitFor(conditionFn, options = {}) {
  const { timeout = 2000, interval = 10, message } = options;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(message || `waitFor: Condition not met within ${timeout}ms`));
    }, timeout);

    const check = async () => {
      try {
        const result = await conditionFn();
        if (result) {
          clearTimeout(timeoutId);
          clearInterval(intervalId);
          resolve();
        }
      } catch {
        // Condition threw — keep polling
      }
    };

    // Check immediately
    check();
    const intervalId = setInterval(check, interval);
  });
}

// =============================================================================
// 8. mockStorage
// =============================================================================

/**
 * Create a mock Web Storage implementation (localStorage/sessionStorage).
 *
 * @param {object} [options]
 * @param {Record<string, string>} [options.initial] - Pre-populate entries
 * @returns {MockStorageResult}
 *
 * @typedef {object} MockStorageResult
 * @property {object} storage - Storage-compatible mock
 * @property {Function} install - Install as globalThis.localStorage (or custom target)
 * @property {Function} uninstall - Restore original globals
 * @property {Function} clear - Clear all entries
 * @property {object} data - Direct access to underlying data
 * @property {SpyFunction} getItemSpy - Spy on getItem calls
 * @property {SpyFunction} setItemSpy - Spy on setItem calls
 * @property {SpyFunction} removeItemSpy - Spy on removeItem calls
 *
 * @example
 * const mock = mockStorage({ initial: { theme: 'dark' } });
 * mock.install('localStorage');
 * assert.strictEqual(globalThis.localStorage.getItem('theme'), 'dark');
 * mock.uninstall();
 */
export function mockStorage(options = {}) {
  const data = {};
  const savedGlobals = {};

  // Pre-populate
  if (options.initial) {
    for (const [k, v] of Object.entries(options.initial)) {
      data[k] = String(v);
    }
  }

  const getItemSpy = spy((key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
  });

  const setItemSpy = spy((key, value) => {
    data[key] = String(value);
  });

  const removeItemSpy = spy((key) => {
    delete data[key];
  });

  const storage = {
    getItem(key) { return getItemSpy(key); },
    setItem(key, value) { setItemSpy(key, value); },
    removeItem(key) { removeItemSpy(key); },
    clear() {
      for (const key of Object.keys(data)) {
        delete data[key];
      }
    },
    key(index) {
      const keys = Object.keys(data);
      return index < keys.length ? keys[index] : null;
    },
    get length() {
      return Object.keys(data).length;
    }
  };

  function install(target = 'localStorage') {
    savedGlobals[target] = globalThis[target];
    globalThis[target] = storage;
  }

  function uninstall() {
    for (const [target, original] of Object.entries(savedGlobals)) {
      if (original !== undefined) {
        globalThis[target] = original;
      } else {
        delete globalThis[target];
      }
    }
  }

  function clear() {
    storage.clear();
    getItemSpy.reset();
    setItemSpy.reset();
    removeItemSpy.reset();
  }

  return {
    storage,
    data,
    install,
    uninstall,
    clear,
    getItemSpy,
    setItemSpy,
    removeItemSpy
  };
}

// =============================================================================
// 9. createTestContext
// =============================================================================

/**
 * Create an isolated reactive context for a test.
 * Unlike resetContext() which mutates the global context, this creates
 * a private context that does not affect other tests.
 *
 * @param {string} [name] - Debug label
 * @returns {IsolatedTestContext}
 *
 * @typedef {object} IsolatedTestContext
 * @property {ReactiveContext} ctx - Underlying ReactiveContext
 * @property {Function} run - Execute code in this context
 * @property {Function} reset - Clear all effects and pending work
 * @property {Function} dispose - Alias for reset
 * @property {Function} pulse - Create a pulse scoped to this context
 * @property {Function} effect - Create an effect scoped to this context
 * @property {Function} computed - Create a computed scoped to this context
 *
 * @example
 * const ctx = createTestContext('counter-test');
 * const count = ctx.pulse(0);
 * const tracker = ctx.run(() => trackEffect(() => count.get()));
 * count.set(5);
 * ctx.dispose();
 */
export function createTestContext(name) {
  const ctx = new ReactiveContext({ name: name || 'test-context' });

  return {
    ctx,
    run(fn) {
      return ctx.run(fn);
    },
    reset() {
      ctx.reset();
    },
    dispose() {
      ctx.reset();
    },
    pulse(value, options) {
      return ctx.run(() => createPulse(value, options));
    },
    effect(fn, options) {
      return ctx.run(() => createEffect(fn, options));
    },
    computed(fn, options) {
      return ctx.run(() => createComputed(fn, options));
    }
  };
}

// =============================================================================
// 10. flushEffects
// =============================================================================

/**
 * Synchronously flush all pending batched effects.
 * Useful when testing code that uses batch() or deferred updates.
 */
export function flushEffects() {
  batch(() => {});
}

// =============================================================================
// 11. fireEvent
// =============================================================================

/**
 * Dispatch a DOM event on a mock element.
 *
 * @param {MockElement} element - Target element
 * @param {string} eventType - Event type ('click', 'input', 'change', etc.)
 * @param {object} [init] - Additional event properties
 * @returns {boolean} Whether the event was dispatched
 *
 * @example
 * const btn = adapter.createElement('button');
 * const handler = spy();
 * adapter.addEventListener(btn, 'click', handler);
 * fireEvent(btn, 'click');
 * assert.strictEqual(handler.callCount, 1);
 */
export function fireEvent(element, eventType, init = {}) {
  const event = {
    type: eventType,
    bubbles: init.bubbles ?? true,
    cancelable: init.cancelable ?? true,
    defaultPrevented: false,
    ...init,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {},
    stopImmediatePropagation() {}
  };

  // Use Object.defineProperty for target since native Event has read-only target
  Object.defineProperty(event, 'target', {
    value: element,
    writable: false,
    configurable: true
  });
  Object.defineProperty(event, 'currentTarget', {
    value: element,
    writable: false,
    configurable: true
  });

  if (typeof element.dispatchEvent === 'function') {
    element.dispatchEvent(event);
  } else {
    // Fallback: directly invoke listeners on MockElement
    const listeners = element._eventListeners;
    if (listeners) {
      const handlers = listeners.get(eventType);
      if (handlers) {
        for (const handler of [...handlers]) {
          handler(event);
        }
      }
    }
  }

  return !event.defaultPrevented;
}

// Shortcuts
fireEvent.click = (element, init) => fireEvent(element, 'click', init);
fireEvent.input = (element, init) => fireEvent(element, 'input', init);
fireEvent.change = (element, init) => fireEvent(element, 'change', init);
fireEvent.submit = (element, init) => fireEvent(element, 'submit', init);
fireEvent.focus = (element, init) => fireEvent(element, 'focus', { bubbles: false, ...init });
fireEvent.blur = (element, init) => fireEvent(element, 'blur', { bubbles: false, ...init });
fireEvent.keydown = (element, init) => fireEvent(element, 'keydown', init);
fireEvent.keyup = (element, init) => fireEvent(element, 'keyup', init);
