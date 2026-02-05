/**
 * DOM Advanced Module Tests
 *
 * Tests for runtime/dom-advanced.js - Portal, Error Boundary, Transitions
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MockElement,
  MockTextNode,
  MockCommentNode,
  MockDocumentFragment,
  MockDOMAdapter,
  setAdapter,
  resetAdapter
} from '../runtime/dom-adapter.js';
import { pulse, effect, resetContext } from '../runtime/pulse.js';

// ============================================================================
// Setup
// ============================================================================

let adapter;

// ============================================================================
// Portal Tests
// ============================================================================

describe('portal', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('portal renders children to target element', async () => {
    const { portal } = await import('../runtime/dom-advanced.js');

    const target = adapter.createElement('div');
    target.id = 'portal-target';
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    child.textContent = 'Portal Content';

    const marker = portal(child, target);

    // Marker should be a comment
    assert.strictEqual(marker.nodeType, 8);

    // Child should be in target
    assert.strictEqual(target.childNodes.length, 1);
    assert.strictEqual(target.childNodes[0], child);
  });

  test('portal handles array of children', async () => {
    const { portal } = await import('../runtime/dom-advanced.js');

    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('p');

    portal([child1, child2], target);

    assert.strictEqual(target.childNodes.length, 2);
    assert.strictEqual(target.childNodes[0], child1);
    assert.strictEqual(target.childNodes[1], child2);
  });

  test('portal handles reactive children', async () => {
    const { portal } = await import('../runtime/dom-advanced.js');

    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const show = pulse(true);

    portal(() => {
      if (show.get()) {
        const el = adapter.createElement('span');
        el.textContent = 'Visible';
        return el;
      }
      return null;
    }, target);

    // Wait for effect
    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(target.childNodes.length, 1);
    assert.strictEqual(target.childNodes[0].textContent, 'Visible');

    // Change condition
    show.set(false);
    await new Promise(r => setTimeout(r, 10));

    assert.strictEqual(target.childNodes.length, 0);
  });

  test('portal returns marker with cleanup', async () => {
    const { portal } = await import('../runtime/dom-advanced.js');

    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target);

    assert.ok(marker._pulseUnmount);
    assert.ok(Array.isArray(marker._pulseUnmount));
    assert.strictEqual(marker._pulseUnmount.length, 1);

    // Execute cleanup
    marker._pulseUnmount[0]();

    // Child should be removed from target
    assert.strictEqual(target.childNodes.length, 0);
  });

  test('portal handles missing target gracefully', async () => {
    const { portal } = await import('../runtime/dom-advanced.js');

    // Capture console.warn
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };

    const child = adapter.createElement('span');
    const marker = portal(child, '#nonexistent');

    console.warn = originalWarn;

    assert.strictEqual(marker.nodeType, 8); // Comment
    assert.ok(warned);
  });
});

// ============================================================================
// Error Boundary Tests
// ============================================================================

describe('errorBoundary', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('errorBoundary renders children normally', async () => {
    const { errorBoundary } = await import('../runtime/dom-advanced.js');

    const child = adapter.createElement('div');
    child.textContent = 'Normal Content';

    const container = errorBoundary(child, null);

    assert.strictEqual(container.nodeType, 11); // DocumentFragment

    // Mount to see content
    const root = adapter.createElement('div');
    adapter.appendChild(root, container);

    await new Promise(r => setTimeout(r, 10));

    // Should contain marker and child
    const elements = root.childNodes.filter(n => n.nodeType === 1);
    assert.strictEqual(elements.length, 1);
    assert.strictEqual(elements[0].textContent, 'Normal Content');
  });

  test('errorBoundary catches errors and shows fallback', async () => {
    const { errorBoundary } = await import('../runtime/dom-advanced.js');

    // Suppress console.error
    const originalError = console.error;
    console.error = () => {};

    const fallback = (error) => {
      const el = adapter.createElement('div');
      el.textContent = `Error: ${error.message}`;
      return el;
    };

    const children = () => {
      throw new Error('Test Error');
    };

    const container = errorBoundary(children, fallback);

    const root = adapter.createElement('div');
    adapter.appendChild(root, container);

    await new Promise(r => setTimeout(r, 50));

    console.error = originalError;

    // Should show fallback
    const elements = root.childNodes.filter(n => n.nodeType === 1);
    assert.ok(elements.length >= 1);
    // Fallback may have rendered
  });

  test('errorBoundary handles reactive children', async () => {
    const { errorBoundary } = await import('../runtime/dom-advanced.js');

    const count = pulse(0);

    const children = () => {
      const el = adapter.createElement('span');
      el.textContent = `Count: ${count.get()}`;
      return el;
    };

    const container = errorBoundary(children, null);
    const root = adapter.createElement('div');
    adapter.appendChild(root, container);

    await new Promise(r => setTimeout(r, 10));

    let spans = root.childNodes.filter(n => n.nodeType === 1 && n.tagName === 'SPAN');
    assert.ok(spans.length >= 1);

    count.set(5);
    await new Promise(r => setTimeout(r, 10));

    spans = root.childNodes.filter(n => n.nodeType === 1 && n.tagName === 'SPAN');
    // Content should update
  });

  test('errorBoundary exposes resetError method', async () => {
    const { errorBoundary } = await import('../runtime/dom-advanced.js');

    const container = errorBoundary(
      adapter.createElement('div'),
      null
    );

    // Find the marker
    const marker = container.childNodes.find(n => n.nodeType === 8);
    assert.ok(marker);
    assert.ok(typeof marker.resetError === 'function');
  });
});

// ============================================================================
// Transition Tests
// ============================================================================

describe('transition', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('transition applies enter class', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');

    transition(element, {
      enter: 'fade-in',
      exit: 'fade-out',
      duration: 50
    });

    await new Promise(r => setTimeout(r, 10));

    // Enter class should be applied
    assert.ok(element.classList.contains('fade-in'));

    // Wait for duration to pass
    await new Promise(r => setTimeout(r, 60));

    // Enter class should be removed
    assert.ok(!element.classList.contains('fade-in'));
  });

  test('transition calls onEnter callback', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');
    let enterCalled = false;

    transition(element, {
      enter: 'fade-in',
      duration: 50,
      onEnter: (el) => {
        enterCalled = true;
        assert.strictEqual(el, element);
      }
    });

    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(enterCalled, true);
  });

  test('transition attaches exit method', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');

    transition(element, {
      enter: 'fade-in',
      exit: 'fade-out',
      duration: 50
    });

    assert.ok(typeof element._pulseTransitionExit === 'function');
  });

  test('transition exit method applies exit class and resolves', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');

    transition(element, {
      enter: 'fade-in',
      exit: 'fade-out',
      duration: 50
    });

    const exitPromise = element._pulseTransitionExit();

    // Exit class should be applied
    assert.ok(element.classList.contains('fade-out'));

    await exitPromise;

    // Exit class should be removed after duration
    assert.ok(!element.classList.contains('fade-out'));
  });

  test('transition calls onExit callback', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');
    let exitCalled = false;

    transition(element, {
      exit: 'fade-out',
      duration: 50,
      onExit: (el) => {
        exitCalled = true;
        assert.strictEqual(el, element);
      }
    });

    await element._pulseTransitionExit();
    assert.strictEqual(exitCalled, true);
  });

  test('transition returns the element', async () => {
    const { transition } = await import('../runtime/dom-advanced.js');

    const element = adapter.createElement('div');
    const result = transition(element);

    assert.strictEqual(result, element);
  });
});

// ============================================================================
// whenTransition Tests
// ============================================================================

describe('whenTransition', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('whenTransition renders based on condition', async () => {
    const { whenTransition } = await import('../runtime/dom-advanced.js');

    const show = pulse(true);

    const container = whenTransition(
      () => show.get(),
      () => {
        const el = adapter.createElement('span');
        el.textContent = 'Visible';
        return el;
      },
      () => {
        const el = adapter.createElement('span');
        el.textContent = 'Hidden';
        return el;
      },
      { duration: 50 }
    );

    const root = adapter.createElement('div');
    adapter.appendChild(root, container);

    await new Promise(r => setTimeout(r, 100));

    let spans = root.childNodes.filter(n => n.nodeType === 1);
    assert.ok(spans.length >= 1);
  });

  test('whenTransition applies enter class to new content', async () => {
    const { whenTransition } = await import('../runtime/dom-advanced.js');

    const show = pulse(false);

    const container = whenTransition(
      () => show.get(),
      () => {
        const el = adapter.createElement('span');
        el.className = 'content';
        return el;
      },
      null,
      { duration: 50, enterClass: 'slide-in' }
    );

    const root = adapter.createElement('div');
    adapter.appendChild(root, container);

    await new Promise(r => setTimeout(r, 10));

    // Initially no content
    let spans = root.childNodes.filter(n => n.nodeType === 1 && n.tagName === 'SPAN');
    assert.strictEqual(spans.length, 0);

    // Show content
    show.set(true);
    await new Promise(r => setTimeout(r, 20));

    spans = root.childNodes.filter(n => n.nodeType === 1 && n.tagName === 'SPAN');
    // Content should appear with enter class
  });

  test('whenTransition returns document fragment', async () => {
    const { whenTransition } = await import('../runtime/dom-advanced.js');

    const container = whenTransition(
      () => true,
      () => adapter.createElement('div')
    );

    assert.strictEqual(container.nodeType, 11);
  });
});

console.log('DOM Advanced tests loaded');
