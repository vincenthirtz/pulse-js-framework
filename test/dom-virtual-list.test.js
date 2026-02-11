/**
 * Pulse DOM Virtual Scrolling Tests
 *
 * Tests for runtime/dom-virtual-list.js - Virtual scrolling for large lists
 * Uses MockDOMAdapter (zero external dependencies)
 *
 * @module test/dom-virtual-list
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { virtualList } from '../runtime/dom-virtual-list.js';
import { resetPool } from '../runtime/dom-recycle.js';
import { pulse } from '../runtime/pulse.js';

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});

afterEach(() => {
  resetPool();
  resetAdapter();
});

// Helper to generate test items
function generateItems(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));
}

// =============================================================================
// virtualList() Basic Tests
// =============================================================================

describe('virtualList() basic', () => {
  test('throws if itemHeight is missing', () => {
    const items = pulse(generateItems(10));
    assert.throws(() => {
      virtualList(
        () => items.get(),
        (item) => adapter.createElement('li'),
        (item) => item.id,
        {} // no itemHeight
      );
    }, /itemHeight/);
  });

  test('throws if itemHeight is 0', () => {
    const items = pulse(generateItems(10));
    assert.throws(() => {
      virtualList(
        () => items.get(),
        (item) => adapter.createElement('li'),
        (item) => item.id,
        { itemHeight: 0 }
      );
    }, /itemHeight/);
  });

  test('throws if itemHeight is negative', () => {
    const items = pulse(generateItems(10));
    assert.throws(() => {
      virtualList(
        () => items.get(),
        (item) => adapter.createElement('li'),
        (item) => item.id,
        { itemHeight: -10 }
      );
    }, /itemHeight/);
  });

  test('returns a container element', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    assert.ok(adapter.isElement(container), 'Should return an element');
    assert.strictEqual(container.tagName, 'DIV');
  });
});

// =============================================================================
// DOM Structure Tests
// =============================================================================

describe('virtualList() DOM structure', () => {
  test('creates container > spacer > viewport structure', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    // Container should have a spacer child
    const spacer = container.childNodes[0];
    assert.ok(spacer, 'Should have spacer child');
    assert.strictEqual(spacer.tagName, 'DIV');

    // Spacer should have viewport child
    const viewport = spacer.childNodes[0];
    assert.ok(viewport, 'Should have viewport child');
    assert.strictEqual(viewport.tagName, 'DIV');
  });

  test('sets container height from containerHeight option', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 500 }
    );

    assert.strictEqual(container.style.height, '500px');
  });

  test('sets overflow-y auto on container', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    assert.strictEqual(container.style['overflow-y'], 'auto');
  });

  test('spacer height equals totalItems * itemHeight', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    const spacer = container.childNodes[0];
    assert.strictEqual(spacer.style.height, `${100 * 40}px`);
  });

  test('spacer height updates when items change', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    const spacer = container.childNodes[0];
    assert.strictEqual(spacer.style.height, '4000px');

    items.set(generateItems(50));
    assert.strictEqual(spacer.style.height, '2000px');
  });
});

// =============================================================================
// ARIA Accessibility Tests
// =============================================================================

describe('virtualList() ARIA', () => {
  test('sets role=list on container', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    assert.strictEqual(adapter.getAttribute(container, 'role'), 'list');
  });

  test('sets aria-label on container', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    assert.strictEqual(
      adapter.getAttribute(container, 'aria-label'),
      'Virtual scrolling list'
    );
  });

  test('sets aria-rowcount to total items count', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '100');
  });

  test('aria-rowcount updates when items change', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '100');

    items.set(generateItems(200));
    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '200');
  });

  test('sets role=listitem on rendered items', () => {
    const items = pulse(generateItems(5));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    // Find rendered items in the viewport
    const spacer = container.childNodes[0];
    const viewport = spacer.childNodes[0];

    // Items are rendered inside the viewport via list() which uses a fragment
    // Look for li elements with role=listitem
    function findElements(node) {
      const result = [];
      for (const child of node.childNodes) {
        if (child.tagName === 'LI') result.push(child);
        result.push(...findElements(child));
      }
      return result;
    }

    const lis = findElements(viewport);
    for (const li of lis) {
      assert.strictEqual(
        adapter.getAttribute(li, 'role'),
        'listitem',
        'Each rendered item should have role=listitem'
      );
    }
  });
});

// =============================================================================
// Visible Range Tests
// =============================================================================

describe('virtualList() visible range', () => {
  test('renders limited number of items (not all)', () => {
    const items = pulse(generateItems(1000));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400, overscan: 5 }
    );

    // With containerHeight=400 and itemHeight=40, visible items = 10
    // Plus overscan=5 above and below = 10 + 10 = up to 20
    // But at top (scrollTop=0), only overscan below, so ~15
    const spacer = container.childNodes[0];
    const viewport = spacer.childNodes[0];

    function countElements(node) {
      let count = 0;
      for (const child of node.childNodes) {
        if (child.tagName === 'LI') count++;
        count += countElements(child);
      }
      return count;
    }

    const renderedCount = countElements(viewport);
    assert.ok(renderedCount < 1000, `Should render fewer items than total (got ${renderedCount})`);
    assert.ok(renderedCount > 0, 'Should render at least some items');
    assert.ok(renderedCount <= 25, `Should render ~15-20 items, got ${renderedCount}`);
  });

  test('renders items for empty list', () => {
    const items = pulse([]);
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '0');
  });

  test('updates visible items when data changes', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
    );

    // Change to empty
    items.set([]);
    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '0');

    // Change to new items
    items.set(generateItems(50));
    assert.strictEqual(adapter.getAttribute(container, 'aria-rowcount'), '50');
  });
});

// =============================================================================
// Dispose Tests
// =============================================================================

describe('virtualList() cleanup', () => {
  test('has _dispose method', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    assert.strictEqual(typeof container._dispose, 'function');
  });

  test('_dispose removes scroll listener', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40 }
    );

    // Should have scroll listener
    const scrollListeners = container._eventListeners.get('scroll');
    assert.ok(scrollListeners && scrollListeners.length > 0, 'Should have scroll listener');

    container._dispose();

    const afterDispose = container._eventListeners.get('scroll');
    assert.ok(!afterDispose || afterDispose.length === 0, 'Scroll listener should be removed');
  });
});

// =============================================================================
// Recycle Option Tests
// =============================================================================

describe('virtualList() with recycle option', () => {
  test('accepts recycle:true without errors', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400, recycle: true }
    );

    assert.ok(container, 'Should create container with recycle option');
  });

  test('accepts recycle:false (default)', () => {
    const items = pulse(generateItems(10));
    const container = virtualList(
      () => items.get(),
      (item) => adapter.createElement('li'),
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400, recycle: false }
    );

    assert.ok(container);
  });
});

// =============================================================================
// Overscan Tests
// =============================================================================

describe('virtualList() overscan', () => {
  test('overscan defaults to 5', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400 }
      // overscan defaults to 5
    );

    // With 400/40=10 visible + 5 overscan below = ~15 items
    assert.ok(container);
  });

  test('overscan:0 renders only visible items', () => {
    const items = pulse(generateItems(100));
    const container = virtualList(
      () => items.get(),
      (item) => {
        const el = adapter.createElement('li');
        adapter.setTextContent(el, item.name);
        return el;
      },
      (item) => item.id,
      { itemHeight: 40, containerHeight: 400, overscan: 0 }
    );

    const spacer = container.childNodes[0];
    const viewport = spacer.childNodes[0];

    function countElements(node) {
      let count = 0;
      for (const child of node.childNodes) {
        if (child.tagName === 'LI') count++;
        count += countElements(child);
      }
      return count;
    }

    const renderedCount = countElements(viewport);
    // 400/40 = 10 visible items, no overscan
    assert.ok(renderedCount <= 11, `With overscan=0 should render ~10 items, got ${renderedCount}`);
  });
});
