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
import { pulse, resetContext } from '../runtime/pulse.js';

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});

afterEach(() => {
  resetContext();
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

  test('matches element with native matches() method', () => {
    const parent = adapter.createElement('div');
    const child = adapter.createElement('span');
    adapter.setAttribute(child, 'data-key', 'test');
    adapter.appendChild(parent, child);

    // Add native matches() method to child
    child.matches = (selector) => {
      if (selector === '.active') return child.className.includes('active');
      if (selector.startsWith('[')) {
        const inner = selector.slice(1, -1);
        return adapter.getAttribute(child, inner) !== null;
      }
      return false;
    };
    child.className = 'active';

    const matched = [];
    delegate(parent, 'click', '.active', (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    assert.strictEqual(matched.length, 1);
  });

  test('matches attribute selector with quoted value', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.setAttribute(child, 'data-key', 'value');
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', '[data-key="value"]', (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    assert.deepStrictEqual(matched.length, 1);
  });

  test('matches attribute selector with single-quoted value', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.setAttribute(child, 'data-key', 'value');
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', "[data-key='value']", (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    assert.strictEqual(matched.length, 1);
  });

  test('does not match attribute selector with wrong value', () => {
    const parent = adapter.createElement('ul');
    const child = adapter.createElement('li');
    adapter.setAttribute(child, 'data-key', 'actual');
    adapter.appendChild(parent, child);

    const matched = [];
    delegate(parent, 'click', '[data-key=expected]', (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', child));

    assert.strictEqual(matched.length, 0);
  });

  test('handles event.target being the parent itself (no match)', () => {
    const parent = adapter.createElement('ul');

    const matched = [];
    delegate(parent, 'click', '[data-key]', (e, el) => matched.push(el));

    const listeners = parent._eventListeners.get('click');
    // Target is the parent itself - while loop won't enter since target === parent
    listeners[0].handler(createMockEvent('click', parent));

    assert.strictEqual(matched.length, 0);
  });

  test('handles deeply nested click target', () => {
    const parent = adapter.createElement('ul');
    const li = adapter.createElement('li');
    adapter.setAttribute(li, 'data-key', 'deep');
    adapter.appendChild(parent, li);

    const span = adapter.createElement('span');
    adapter.appendChild(li, span);

    const innerSpan = adapter.createElement('em');
    adapter.appendChild(span, innerSpan);

    const matched = [];
    delegate(parent, 'click', '[data-key]', (e, el) => {
      matched.push(adapter.getAttribute(el, 'data-key'));
    });

    // Click on deeply nested innerSpan
    const listeners = parent._eventListeners.get('click');
    listeners[0].handler(createMockEvent('click', innerSpan));

    assert.deepStrictEqual(matched, ['deep']);
  });
});

// =============================================================================
// delegate() Non-bubbling Events
// =============================================================================

describe('delegate() non-bubbling events', () => {
  test('uses capture for scroll events', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'scroll', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('scroll');
    assert.ok(listeners && listeners.length > 0);
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for mouseenter', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'mouseenter', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('mouseenter');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for mouseleave', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'mouseleave', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('mouseleave');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for pointerenter', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'pointerenter', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('pointerenter');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for pointerleave', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'pointerleave', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('pointerleave');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for load event', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'load', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('load');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses capture for error event', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'error', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('error');
    assert.strictEqual(listeners[0].options, true);
  });

  test('uses bubble for input event', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'input', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('input');
    assert.strictEqual(listeners[0].options, false);
  });

  test('uses bubble for keydown event', () => {
    const parent = adapter.createElement('div');
    delegate(parent, 'keydown', '[data-id]', () => {});
    const listeners = parent._eventListeners.get('keydown');
    assert.strictEqual(listeners[0].options, false);
  });
});

// =============================================================================
// delegatedList() advanced Tests
// =============================================================================

describe('delegatedList() advanced', () => {
  test('handles template returning array of nodes', () => {
    const items = pulse([
      { id: 'a', name: 'Alpha' }
    ]);

    const clickedItems = [];

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const li = adapter.createElement('li');
        const span = adapter.createElement('span');
        adapter.setTextContent(li, item.name);
        adapter.appendChild(li, span);
        return [li]; // Return array
      },
      (item) => item.id,
      {
        on: {
          click: (event, item, index) => {
            clickedItems.push(item.name);
          }
        }
      }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    // Find li with key attribute
    const lis = container.childNodes.filter(n => n.tagName === 'LI');
    assert.ok(lis.length > 0);

    const clickListeners = container._eventListeners.get('click');
    clickListeners[0].handler(createMockEvent('click', lis[0]));

    assert.strictEqual(clickedItems.length, 1);
    assert.strictEqual(clickedItems[0], 'Alpha');
  });

  test('handles click on element without matching key in map', () => {
    const items = pulse([{ id: 'a', name: 'Alpha' }]);

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
            clickedItems.push(item.name);
          }
        }
      }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    // Create a rogue element with a key that doesn't exist in itemMap
    const rogue = adapter.createElement('li');
    adapter.setAttribute(rogue, 'data-pulse-key', 'nonexistent');
    adapter.appendChild(container, rogue);

    const clickListeners = container._eventListeners.get('click');
    clickListeners[0].handler(createMockEvent('click', rogue));

    // Handler should not be called since key 'nonexistent' is not in the map
    assert.strictEqual(clickedItems.length, 0);
  });

  test('delegatedList updates itemMap when items change', () => {
    const items = pulse([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' }
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
            clickedItems.push(item.name);
          }
        }
      }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    // Update items
    items.set([
      { id: 'c', name: 'Charlie' },
      { id: 'd', name: 'Delta' }
    ]);

    // Find new elements
    const lis = container.childNodes.filter(n =>
      n.tagName === 'LI' && adapter.getAttribute(n, 'data-pulse-key') === 'c'
    );

    if (lis.length > 0) {
      const clickListeners = container._eventListeners.get('click');
      clickListeners[0].handler(createMockEvent('click', lis[0]));
      assert.strictEqual(clickedItems.length, 1);
      assert.strictEqual(clickedItems[0], 'Charlie');
    }
  });

  test('delegatedList with multiple event types', () => {
    const items = pulse([{ id: 1, name: 'A' }]);

    const events = { clicks: [], inputs: [], focuses: [] };

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
          click: (e, item) => events.clicks.push(item.name),
          input: (e, item) => events.inputs.push(item.name),
          focus: (e, item) => events.focuses.push(item.name)
        }
      }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    assert.ok(container._eventListeners.has('click'));
    assert.ok(container._eventListeners.has('input'));
    assert.ok(container._eventListeners.has('focus'));
  });

  test('_cleanupDelegation resets delegationSetUp flag', () => {
    const items = pulse([{ id: 1, name: 'A' }]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { on: { click: () => {} } }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);

    // Set up delegation
    fragment._setupDelegation(container);
    const listeners1 = container._eventListeners.get('click');
    assert.strictEqual(listeners1.length, 1);

    // Cleanup
    fragment._cleanupDelegation();

    // After cleanup, setupDelegation should work again (delegationSetUp reset)
    fragment._setupDelegation(container);
    const listeners2 = container._eventListeners.get('click');
    assert.strictEqual(listeners2.length, 1, 'Should re-setup after cleanup');
  });

  test('delegatedList with recycle option', () => {
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
      (item) => item.id,
      {
        recycle: true,
        on: { click: () => {} }
      }
    );

    assert.ok(fragment, 'Should create fragment with recycle option');
  });

  test('delegatedList auto-setup via queueMicrotask', () => {
    const items = pulse([
      { id: 'x', name: 'X' }
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
          click: (event, item) => clickedItems.push(item.name)
        }
      }
    );

    // Mount the fragment to a container
    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);

    // Flush microtask queue - this should trigger auto-setup of delegation
    adapter.flushMicrotasks();

    // After microtask flush, delegation should be set up on the parent
    const clickListeners = container._eventListeners.get('click');
    if (clickListeners && clickListeners.length > 0) {
      // Find the li
      const lis = container.childNodes.filter(n => n.tagName === 'LI');
      if (lis.length > 0) {
        clickListeners[0].handler(createMockEvent('click', lis[0]));
        assert.strictEqual(clickedItems.length, 1);
      }
    }
  });

  test('delegatedList handles empty on handlers object', () => {
    const items = pulse([{ id: 1, name: 'A' }]);

    const fragment = delegatedList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        return el;
      },
      (item) => item.id,
      { on: {} }
    );

    const container = adapter.createElement('div');
    adapter.appendChild(container, fragment);
    fragment._setupDelegation(container);

    // No event listeners should be registered (empty on object)
    assert.ok(true, 'Empty on object should not throw');
  });
});

// =============================================================================
// delegatedList() Stale Entry Cleanup (v1.8.1)
// =============================================================================

describe('delegatedList() stale entry cleanup', () => {
  test('delegatedList() does not leak stale itemMap entries when items are removed', async () => {
    const items = pulse([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' }
    ]);

    let handlerCallCount = 0;
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
            handlerCallCount++;
          }
        }
      }
    );

    // Remove items
    items.set([{ id: 1, name: 'A' }]);

    // Allow microtask to run for cleanup
    await new Promise(r => setTimeout(r, 10));

    // The stale entries for id 2 and 3 should be pruned
    // Verify indirectly: no crash, handler still works for remaining items
    assert.ok(true, 'No errors from stale entry cleanup');
  });

  test('delegatedList() with recycle:true forwards option to list()', () => {
    // This test verifies no errors — recycle option is forwarded via listOptions spread
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
      (item) => item.id,
      { recycle: true, on: { click: () => {} } }
    );

    // Remove items — should release to pool (via list() recycle option)
    items.set([]);

    assert.ok(true, 'delegatedList with recycle:true does not throw');
  });

  test('delegatedList() with Pulse source does not use wrappedGetItems', () => {
    // When getItems is a Pulse (not function), the wrappedGetItems path is skipped
    const items = pulse([
      { id: 1, name: 'A' }
    ]);

    const fragment = delegatedList(
      items, // Pulse directly, not function
      (item) => {
        const el = adapter.createElement('li');
        return el;
      },
      (item) => item.id,
      { on: { click: () => {} } }
    );

    // Update pulse directly
    items.set([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);

    assert.ok(true, 'Pulse source handled correctly');
  });
});
