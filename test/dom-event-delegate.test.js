/**
 * Pulse DOM Event Delegation Tests
 *
 * Tests for runtime/dom-event-delegate.js - Event delegation for list rendering
 * Uses MockDOMAdapter (zero external dependencies)
 *
 * @module test/dom-event-delegate
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { setAdapter, MockDOMAdapter, MockElement, resetAdapter } from '../runtime/dom-adapter.js';
import { delegate, delegatedList } from '../runtime/dom-event-delegate.js';
import { pulse } from '../runtime/pulse.js';

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});

afterEach(() => {
  resetAdapter();
});

// =============================================================================
// Helper: create a mock event
// =============================================================================

function createMockEvent(type, target) {
  return { type, target, preventDefault: () => {}, stopPropagation: () => {} };
}

// =============================================================================
// delegate() Tests
// =============================================================================

describe('delegate()', () => {
  test('returns a cleanup function', () => {
    const parent = adapter.createElement('ul');
    const cleanup = delegate(parent, 'click', '[data-key]', () => {});
    assert.strictEqual(typeof cleanup, 'function');
  });

  test('registers event listener on parent', () => {
    const parent = adapter.createElement('ul');
    delegate(parent, 'click', '[data-key]', () => {});
    assert.ok(parent._eventListeners.has('click'), 'Should have click listener');
  });

  test('matches descendant with attribute selector', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.setAttribute(child, 'data-key', '1');
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', '[data-key]', (event, el) => {
      matched.push(adapter.getAttribute(el, 'data-key'));
    });

    // Simulate click on child
    const event = createMockEvent('click', child);
    const listeners = parent._eventListeners.get('click');
    assert.ok(listeners && listeners.length > 0, 'Should have registered listeners');
    listeners[0].handler(event);

    assert.deepStrictEqual(matched, ['1']);
  });

  test('matches with attribute value selector', () => {
    const parent = adapter.createElement('ul');
    const child1 = adapter.createElement('li');
    adapter.setAttribute(child1, 'data-key', 'abc');
    adapter.appendChild(parent, child1);

    const child2 = adapter.createElement('li');
    adapter.setAttribute(child2, 'data-key', 'xyz');
    adapter.appendChild(parent, child2);

    const matched = [];
    delegate(parent, 'click', '[data-key=abc]', (event, el) => {
      matched.push(adapter.getAttribute(el, 'data-key'));
    });

    // Click on child1 - should match
    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child1));
    assert.deepStrictEqual(matched, ['abc']);

    // Click on child2 - should NOT match
    listeners[0].handler(createMockEvent('click', child2));
    assert.deepStrictEqual(matched, ['abc']); // still only one match
  });

  test('walks up parent chain to find match', () => {
    const parent = adapter.createElement('ul');
    const li = adapter.createElement('li');
    adapter.setAttribute(li, 'data-key', '42');
    adapter.appendChild(parent, li);

    const span = adapter.createElement('span');
    adapter.appendChild(li, span);

    const matched = [];
    delegate(parent, 'click', '[data-key]', (event, el) => {
      matched.push(adapter.getAttribute(el, 'data-key'));
    });

    // Click on span (inside li) - should bubble up and match li
    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', span));

    assert.deepStrictEqual(matched, ['42']);
  });

  test('does not match if no descendant matches selector', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', '[data-key]', (event, el) => {
      matched.push(el);
    });

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    assert.deepStrictEqual(matched, []); // no match
  });

  test('cleanup removes the listener', () => {
    const parent = adapter.createElement('ul');
    const cleanup = delegate(parent, 'click', '[data-key]', () => {});

    assert.ok(parent._eventListeners.has('click'));
    cleanup();
    // After cleanup, listener should be removed
    const listeners = parent._eventListeners.get('click');
    assert.ok(!listeners || listeners.length === 0, 'Listener should be removed');
  });

  test('uses capture mode for non-bubbling events (focus)', () => {
    const parent = adapter.createElement('ul');
    delegate(parent, 'focus', '[data-key]', () => {});

    const listeners = parent._eventListeners.get('focus');
    assert.ok(listeners && listeners.length > 0);
    // Check if capture was passed (MockDOMAdapter stores the options)
    assert.strictEqual(listeners[0].options, true, 'Should use capture for focus');
  });

  test('uses capture mode for blur', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'blur', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('blur');
    assert.ok(listeners && listeners.length > 0);
    assert.strictEqual(listeners[0].options, true, 'Should use capture for blur');
  });

  test('uses bubble mode for click', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'click', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('click');
    assert.ok(listeners && listeners.length > 0);
    assert.strictEqual(listeners[0].options, false, 'Should NOT use capture for click');
  });

  test('handles multiple delegates on same parent', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.setAttribute(child, 'data-key', 'test');
    adapter.appendChild(parent, child);

    const clicks = [];
    const dblclicks = [];

    delegate(parent, 'click', '[data-key]', (e, el) => clicks.push(el));
    delegate(parent, 'dblclick', '[data-key]', (e, el) => dblclicks.push(el));

    const clickListeners = parent._eventListeners.get('click');
    clickListeners[0].handler(createMockEvent('click', child));

    const dblclickListeners = parent._eventListeners.get('dblclick');
    dblclickListeners[0].handler(createMockEvent('dblclick', child));

    assert.strictEqual(clicks.length, 1);
    assert.strictEqual(dblclicks.length, 1);
  });
});

// =============================================================================
// delegatedList() Tests
// =============================================================================

describe('delegatedList()', () => {
  test('returns a document fragment', () => {
    const items = pulse([{ id: 1, name: 'A' }]);
    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id
    );
    assert.ok(fragment);
  });

  test('renders items with data-pulse-key attribute', () => {
    const items = pulse([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' }
    ]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id
    );

    // Mount to body so items are in DOM
    adapter.appendChild(adapter.getBody(), fragment);

    // Find li elements in body
    const body = adapter.getBody();
    const children = body.childNodes.filter(n => n.tagName === 'LI');
    assert.ok(children.length >= 2, 'Should render at least 2 items');

    // Check data-pulse-key attribute on rendered items
    const keys = children.map(c => adapter.getAttribute(c, 'data-pulse-key'));
    assert.ok(keys.includes('a'), 'First item should have key "a"');
    assert.ok(keys.includes('b'), 'Second item should have key "b"');
  });

  test('exposes _setupDelegation method', () => {
    const items = pulse([{ id: 1, name: 'A' }]);
    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      {
        on: { click: () => {} }
      }
    );

    assert.strictEqual(typeof fragment._setupDelegation, 'function');
    assert.strictEqual(typeof fragment._cleanupDelegation, 'function');
  });

  test('manually set up delegation dispatches events with item and index', () => {
    const items = pulse([
      { id: 'x', name: 'Item X' },
      { id: 'y', name: 'Item Y' }
    ]);

    const clickedItems = [];

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      {
        on: {
          click: (event, item, index) => {
            clickedItems.push({ name: item.name, index });
          }
        }
      }
    );

    // Mount and set up delegation manually
    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    // Find the li with key "y"
    const lis = container.childNodes.filter(n => n.tagName === 'LI');
    const liY = lis.find(el => adapter.getAttribute(el, 'data-pulse-key') === 'y');
    assert.ok(liY, 'Should find li with key y');

    // Simulate click on that li
    const clickListeners = container._eventListeners.get('click');
    assert.ok(clickListeners && clickListeners.length > 0, 'Should have click listener');
    clickListeners[0].handler(createMockEvent('click', liY));

    assert.strictEqual(clickedItems.length, 1);
    assert.strictEqual(clickedItems[0].name, 'Item Y');
  });

  test('_cleanupDelegation removes all listeners', () => {
    const items = pulse([{ id: 1, name: 'A' }]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        return el;
      },
      (item) => item.id,
      {
        on: {
          click: () => {},
          dblclick: () => {}
        }
      }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    assert.ok(container._eventListeners.has('click'));
    assert.ok(container._eventListeners.has('dblclick'));

    fragment._cleanupDelegation();

    const clickListeners = container._eventListeners.get('click');
    const dblclickListeners = container._eventListeners.get('dblclick');
    assert.ok(!clickListeners || clickListeners.length === 0, 'click should be cleaned');
    assert.ok(!dblclickListeners || dblclickListeners.length === 0, 'dblclick should be cleaned');
  });

  test('setupDelegation is idempotent', () => {
    const items = pulse([{ id: 1, name: 'A' }]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { on: { click: () => {} } }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);

    fragment._setupDelegation(container);
    fragment._setupDelegation(container); // Should be no-op

    const clickListeners = container._eventListeners.get('click');
    assert.strictEqual(clickListeners.length, 1, 'Should only have one listener (idempotent)');
  });

  test('delegatedList without on option works as normal list', () => {
    const items = pulse([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id
    );

    adapter.appendChild(adapter.getBody(), fragment);

    const body = adapter.getBody();
    const lis = body.childNodes.filter(n => n.tagName === 'LI');
    assert.ok(lis.length >= 2);
  });
});

// =============================================================================
// matchesSelector edge cases
// =============================================================================

describe('delegate matchesSelector edge cases', () => {
  test('does not match non-attribute selectors in fallback mode', () => {
    const parent = adapter.createElement('div');
    const child = adapter.createElement('span');
    child.className = 'active';
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', '.active', (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    // MockElement does not have matches(), and .active is not [attr] format
    assert.strictEqual(matched.length, 0);
  });
});
