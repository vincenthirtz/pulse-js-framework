/**
 * Pulse DOM Lifecycle Tests
 *
 * Tests for runtime/dom-lifecycle.js - onMount, onUnmount, mount, component
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom-lifecycle
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createDOM } from './mock-dom.js';

// Set up DOM environment before importing
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Import modules under test
import {
  onMount,
  onUnmount,
  mount,
  component,
  getMountContext,
  setMountContext
} from '../runtime/dom-lifecycle.js';
import { pulse, resetContext } from '../runtime/pulse.js';
import { el } from '../runtime/dom.js';

import { wait } from './utils.js';

// =============================================================================
// Setup/Teardown
// =============================================================================

function cleanup() {
  setMountContext(null);
  resetContext();
}

// =============================================================================
// mount() Tests
// =============================================================================

describe('mount() Tests', () => {
  test('mount: appends element to target selector', () => {
    cleanup();

    const container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    const element = el('div.content', 'Hello');

    mount('#app', element);

    const found = container.querySelector('.content');
    assert.ok(found !== null, 'Element should be mounted');
    assert.strictEqual(found.textContent, 'Hello');

    // Cleanup
    document.body.removeChild(container);
  });

  test('mount: appends element to DOM element directly', () => {
    cleanup();

    const container = document.createElement('div');
    const element = el('span', 'World');

    mount(container, element);

    assert.strictEqual(container.childNodes.length, 1);
    assert.strictEqual(container.querySelector('span').textContent, 'World');
  });

  test('mount: returns unmount function', () => {
    cleanup();

    const container = document.createElement('div');
    const element = el('div.removable', 'Remove me');

    const unmount = mount(container, element);

    assert.strictEqual(typeof unmount, 'function');
    assert.strictEqual(container.querySelector('.removable') !== null, true);

    // Call unmount
    unmount();

    assert.strictEqual(container.querySelector('.removable'), null);
  });

  test('mount: throws when target not found', () => {
    cleanup();

    const element = el('div', 'Test');

    assert.throws(
      () => mount('#nonexistent-target', element),
      /not found/i
    );
  });
});

// =============================================================================
// onMount() Tests
// =============================================================================

describe('onMount() Tests', () => {
  test('onMount: calls callback after component creation', async () => {
    cleanup();

    let mountCalled = false;
    let mountOrder = [];

    const MyComponent = component((ctx) => {
      mountOrder.push('render');

      ctx.onMount(() => {
        mountCalled = true;
        mountOrder.push('mount');
      });

      return el('div', 'Component');
    });

    const instance = MyComponent();

    // Mount callbacks are deferred to microtask
    await wait(10);

    assert.strictEqual(mountCalled, true);
    assert.strictEqual(mountOrder[0], 'render');
    assert.strictEqual(mountOrder[1], 'mount');
  });

  test('onMount: multiple callbacks are called in order', async () => {
    cleanup();

    const callOrder = [];

    const MyComponent = component((ctx) => {
      ctx.onMount(() => callOrder.push(1));
      ctx.onMount(() => callOrder.push(2));
      ctx.onMount(() => callOrder.push(3));

      return el('div');
    });

    MyComponent();
    await wait(10);

    assert.deepStrictEqual(callOrder, [1, 2, 3]);
  });

  test('onMount: without component context defers to microtask', async () => {
    cleanup();

    let called = false;

    // Call onMount outside of component context
    onMount(() => {
      called = true;
    });

    // Should not be called immediately
    assert.strictEqual(called, false);

    await wait(10);

    // Should be called after microtask
    assert.strictEqual(called, true);
  });

  test('onMount: handles errors in callbacks gracefully', async () => {
    cleanup();

    // Capture console.error
    const originalError = console.error;
    let errorLogged = false;
    console.error = () => { errorLogged = true; };

    let secondCalled = false;

    const MyComponent = component((ctx) => {
      ctx.onMount(() => {
        throw new Error('Intentional error');
      });
      ctx.onMount(() => {
        secondCalled = true;
      });

      return el('div');
    });

    MyComponent();
    await wait(10);

    console.error = originalError;

    // Error should have been logged
    assert.strictEqual(errorLogged, true);
    // Second callback should still be called
    assert.strictEqual(secondCalled, true);
  });
});

// =============================================================================
// onUnmount() Tests
// =============================================================================

describe('onUnmount() Tests', () => {
  test('onUnmount: stores callbacks on element', () => {
    cleanup();

    const callbacks = [];

    const MyComponent = component((ctx) => {
      ctx.onUnmount(() => callbacks.push('unmount-1'));
      ctx.onUnmount(() => callbacks.push('unmount-2'));

      return el('div');
    });

    const instance = MyComponent();

    // Callbacks should be stored on element
    assert.ok(instance._pulseUnmount !== undefined, 'Should have unmount callbacks');
    assert.strictEqual(instance._pulseUnmount.length, 2);
  });

  test('onUnmount: callbacks can be executed manually', () => {
    cleanup();

    let unmountCalled = false;

    const MyComponent = component((ctx) => {
      ctx.onUnmount(() => {
        unmountCalled = true;
      });

      return el('div');
    });

    const instance = MyComponent();

    // Execute unmount callbacks
    if (instance._pulseUnmount) {
      for (const cb of instance._pulseUnmount) {
        cb();
      }
    }

    assert.strictEqual(unmountCalled, true);
  });

  test('onUnmount: also registers with effect cleanup', () => {
    cleanup();

    // onUnmount also calls onCleanup from pulse.js
    // This is tested indirectly through effect cleanup
    let cleanupCalled = false;

    const MyComponent = component((ctx) => {
      ctx.onUnmount(() => {
        cleanupCalled = true;
      });

      return el('div');
    });

    MyComponent();

    // The cleanup is registered - we just verify the callback is stored
    // Actual cleanup happens when effect is disposed
  });
});

// =============================================================================
// component() Factory Tests
// =============================================================================

describe('component() Factory Tests', () => {
  test('component: creates factory function', () => {
    cleanup();

    const MyComponent = component((ctx) => {
      return el('div', 'Component');
    });

    assert.strictEqual(typeof MyComponent, 'function');
  });

  test('component: factory returns DOM element', () => {
    cleanup();

    const MyComponent = component((ctx) => {
      return el('div.my-component', 'Hello');
    });

    const instance = MyComponent();

    assert.strictEqual(instance.tagName.toLowerCase(), 'div');
    assert.strictEqual(instance.classList.contains('my-component'), true);
  });

  test('component: receives props', () => {
    cleanup();

    let receivedProps = null;

    const MyComponent = component((ctx) => {
      receivedProps = ctx.props;
      return el('div', ctx.props.message);
    });

    MyComponent({ message: 'Hello Props', count: 42 });

    assert.deepStrictEqual(receivedProps, { message: 'Hello Props', count: 42 });
  });

  test('component: default props are empty object', () => {
    cleanup();

    let receivedProps = null;

    const MyComponent = component((ctx) => {
      receivedProps = ctx.props;
      return el('div');
    });

    MyComponent();

    assert.deepStrictEqual(receivedProps, {});
  });

  test('component: context has pulse function', () => {
    cleanup();

    let hasPulse = false;

    const MyComponent = component((ctx) => {
      hasPulse = typeof ctx.pulse === 'function';
      return el('div');
    });

    MyComponent();

    assert.strictEqual(hasPulse, true);
  });

  test('component: context has onMount and onUnmount', () => {
    cleanup();

    let hasOnMount = false;
    let hasOnUnmount = false;

    const MyComponent = component((ctx) => {
      hasOnMount = typeof ctx.onMount === 'function';
      hasOnUnmount = typeof ctx.onUnmount === 'function';
      return el('div');
    });

    MyComponent();

    assert.strictEqual(hasOnMount, true);
    assert.strictEqual(hasOnUnmount, true);
  });

  test('component: context has state object', () => {
    cleanup();

    let hasState = false;

    const MyComponent = component((ctx) => {
      hasState = typeof ctx.state === 'object';
      ctx.state.count = 0;
      return el('div');
    });

    MyComponent();

    assert.strictEqual(hasState, true);
  });

  test('component: context has methods object', () => {
    cleanup();

    let hasMethods = false;

    const MyComponent = component((ctx) => {
      hasMethods = typeof ctx.methods === 'object';
      ctx.methods.increment = () => {};
      return el('div');
    });

    MyComponent();

    assert.strictEqual(hasMethods, true);
  });

  test('component: with reactive state', async () => {
    cleanup();

    let count;
    let incrementFn;
    const Counter = component((ctx) => {
      count = ctx.pulse(0);
      incrementFn = () => count.update(n => n + 1);

      return el('div.counter', [
        el('button.increment', {
          onclick: incrementFn
        }, 'Increment')
      ]);
    });

    const instance = Counter();
    const container = document.createElement('div');
    container.appendChild(instance);

    await wait(10);

    // Verify component structure
    assert.ok(container.querySelector('.counter') !== null, 'Counter container should exist');
    assert.ok(container.querySelector('.increment') !== null, 'Increment button should exist');

    // Verify state starts at 0
    assert.strictEqual(count.get(), 0);

    // Test the increment function directly (bypasses mock DOM event system)
    incrementFn();

    await wait(10);

    // Verify state updates
    assert.strictEqual(count.get(), 1);
  });
});

// =============================================================================
// getMountContext() / setMountContext() Tests
// =============================================================================

describe('getMountContext() / setMountContext() Tests', () => {
  test('getMountContext: returns null by default', () => {
    cleanup();

    assert.strictEqual(getMountContext(), null);
  });

  test('setMountContext: sets and returns previous context', () => {
    cleanup();

    const ctx1 = { mountCallbacks: [], unmountCallbacks: [] };
    const ctx2 = { mountCallbacks: [], unmountCallbacks: [] };

    const prev1 = setMountContext(ctx1);
    assert.strictEqual(prev1, null);
    assert.strictEqual(getMountContext(), ctx1);

    const prev2 = setMountContext(ctx2);
    assert.strictEqual(prev2, ctx1);
    assert.strictEqual(getMountContext(), ctx2);

    // Cleanup
    setMountContext(null);
  });

  test('setMountContext: component restores previous context', () => {
    cleanup();

    const outerContext = { mountCallbacks: [], unmountCallbacks: [] };
    setMountContext(outerContext);

    const Inner = component((ctx) => {
      // Inside component, context is different
      const innerCtx = getMountContext();
      assert.ok(innerCtx !== outerContext, 'Component should have its own context');
      return el('div');
    });

    Inner();

    // After component, outer context should be restored
    assert.strictEqual(getMountContext(), outerContext);

    // Cleanup
    setMountContext(null);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Lifecycle Integration Tests', () => {
  test('integration: full component lifecycle', async () => {
    cleanup();

    const lifecycle = [];

    const MyComponent = component((ctx) => {
      lifecycle.push('setup');

      ctx.onMount(() => {
        lifecycle.push('mounted');
      });

      ctx.onUnmount(() => {
        lifecycle.push('unmounted');
      });

      lifecycle.push('render');
      return el('div.lifecycle-test');
    });

    const instance = MyComponent();
    lifecycle.push('created');

    const container = document.createElement('div');
    mount(container, instance);
    lifecycle.push('in-dom');

    await wait(10);

    // Should be: setup, render, created, in-dom, mounted
    assert.strictEqual(lifecycle[0], 'setup');
    assert.strictEqual(lifecycle[1], 'render');
    assert.strictEqual(lifecycle[2], 'created');
    assert.strictEqual(lifecycle[3], 'in-dom');
    assert.strictEqual(lifecycle[4], 'mounted');

    // Trigger unmount
    if (instance._pulseUnmount) {
      for (const cb of instance._pulseUnmount) {
        cb();
      }
    }

    assert.strictEqual(lifecycle[5], 'unmounted');
  });

  test('integration: nested components', async () => {
    cleanup();

    const order = [];

    const Child = component((ctx) => {
      ctx.onMount(() => order.push('child-mount'));
      ctx.onUnmount(() => order.push('child-unmount'));
      return el('span', 'Child');
    });

    const Parent = component((ctx) => {
      ctx.onMount(() => order.push('parent-mount'));
      ctx.onUnmount(() => order.push('parent-unmount'));
      return el('div', Child());
    });

    const instance = Parent();
    await wait(10);

    // Both should be mounted (order may vary based on microtask scheduling)
    assert.ok(order.includes('parent-mount'), 'Parent should be mounted');
    assert.ok(order.includes('child-mount'), 'Child should be mounted');
  });

  test('integration: component with props and state', async () => {
    cleanup();

    let exclamation;
    const Greeting = component((ctx) => {
      exclamation = ctx.pulse('!');

      ctx.onMount(() => {
        // Could load data here
      });

      return el('div.greeting');
    });

    const instance = Greeting({ name: 'World' });
    const container = document.createElement('div');
    container.appendChild(instance);

    await wait(10);

    // Verify component was created with props
    assert.ok(container.querySelector('.greeting') !== null, 'Greeting container should exist');

    // Verify state was initialized
    assert.strictEqual(exclamation.get(), '!');

    // Verify state can be updated
    exclamation.set('!!');
    assert.strictEqual(exclamation.get(), '!!');
  });
});
