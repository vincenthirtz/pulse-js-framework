/**
 * Portal Tests (Enhanced)
 * Tests for enhanced portal in runtime/dom-advanced.js
 * - dispose(), moveTo(), getNodes(), options (prepend, onMount, onUnmount, key)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MockDOMAdapter,
  setAdapter,
  resetAdapter,
} from '../runtime/dom-adapter.js';
import { pulse, effect, resetContext } from '../runtime/pulse.js';
import { portal } from '../runtime/dom-advanced.js';

// ============================================================================
// Setup / Teardown
// ============================================================================

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
  resetContext();
});

afterEach(() => {
  resetAdapter();
  resetContext();
});

// ============================================================================
// Basic Rendering
// ============================================================================

describe('portal — basic rendering', () => {
  test('renders static child to target', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    child.textContent = 'Hello';

    const marker = portal(child, target);

    assert.strictEqual(marker.nodeType, 8); // comment node
    assert.strictEqual(target.childNodes.length, 1);
    assert.strictEqual(target.childNodes[0], child);
  });

  test('renders array of children to target', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('p');

    portal([child1, child2], target);

    assert.strictEqual(target.childNodes.length, 2);
    assert.strictEqual(target.childNodes[0], child1);
    assert.strictEqual(target.childNodes[1], child2);
  });

  test('renders reactive children (function)', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);
    const show = pulse(true);

    const marker = portal(
      () => {
        if (show.get()) {
          const el = adapter.createElement('div');
          el.textContent = 'visible';
          return el;
        }
        return null;
      },
      target
    );

    assert.strictEqual(target.childNodes.length, 1);
    assert.strictEqual(target.childNodes[0].textContent, 'visible');

    marker.dispose();
  });
});

// ============================================================================
// Options: prepend
// ============================================================================

describe('portal — prepend option', () => {
  test('prepend inserts at beginning of target', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const existing = adapter.createElement('p');
    existing.textContent = 'existing';
    adapter.appendChild(target, existing);

    const child = adapter.createElement('span');
    child.textContent = 'new';
    portal(child, target, { prepend: true });

    assert.strictEqual(target.childNodes.length, 2);
    assert.strictEqual(target.childNodes[0].textContent, 'new');
    assert.strictEqual(target.childNodes[1].textContent, 'existing');
  });
});

// ============================================================================
// Options: onMount, onUnmount
// ============================================================================

describe('portal — onMount/onUnmount callbacks', () => {
  test('onMount is called when children are mounted', () => {
    let mountCalled = false;
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    portal(child, target, { onMount: () => { mountCalled = true; } });

    assert.ok(mountCalled);
  });

  test('onUnmount is called when children are removed via dispose', () => {
    let unmountCalled = false;
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target, { onUnmount: () => { unmountCalled = true; } });

    assert.ok(!unmountCalled);
    marker.dispose();
    assert.ok(unmountCalled);
  });
});

// ============================================================================
// Options: key
// ============================================================================

describe('portal — key option', () => {
  test('marker comment includes key', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target, { key: 'my-modal' });

    assert.ok(marker.textContent.includes('my-modal') || marker.data?.includes('my-modal'));
  });
});

// ============================================================================
// dispose() Method
// ============================================================================

describe('portal — dispose()', () => {
  test('dispose removes all children from target', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('p');
    const marker = portal([child1, child2], target);

    assert.strictEqual(target.childNodes.length, 2);
    marker.dispose();
    assert.strictEqual(target.childNodes.length, 0);
  });

  test('dispose is idempotent', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target);

    marker.dispose();
    marker.dispose(); // Should not throw
    assert.strictEqual(target.childNodes.length, 0);
  });

  test('dispose calls _pulseUnmount callbacks on nodes', () => {
    let cleanupCalled = false;
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    child._pulseUnmount = [() => { cleanupCalled = true; }];
    const marker = portal(child, target);

    marker.dispose();
    assert.ok(cleanupCalled);
  });
});

// ============================================================================
// moveTo() Method
// ============================================================================

describe('portal — moveTo()', () => {
  test('moves children to new target', () => {
    const target1 = adapter.createElement('div');
    const target2 = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target1);
    adapter.appendChild(adapter.getBody(), target2);

    const child = adapter.createElement('span');
    child.textContent = 'moved';
    const marker = portal(child, target1);

    assert.strictEqual(target1.childNodes.length, 1);
    assert.strictEqual(target2.childNodes.length, 0);

    marker.moveTo(target2);

    assert.strictEqual(target1.childNodes.length, 0);
    assert.strictEqual(target2.childNodes.length, 1);
    assert.strictEqual(target2.childNodes[0].textContent, 'moved');
  });

  test('moveTo does nothing after dispose', () => {
    const target1 = adapter.createElement('div');
    const target2 = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target1);
    adapter.appendChild(adapter.getBody(), target2);

    const child = adapter.createElement('span');
    const marker = portal(child, target1);
    marker.dispose();
    marker.moveTo(target2);

    assert.strictEqual(target2.childNodes.length, 0);
  });
});

// ============================================================================
// getNodes() Method
// ============================================================================

describe('portal — getNodes()', () => {
  test('returns copy of currently mounted nodes', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('p');
    const marker = portal([child1, child2], target);

    const nodes = marker.getNodes();
    assert.strictEqual(nodes.length, 2);
    assert.strictEqual(nodes[0], child1);
    assert.strictEqual(nodes[1], child2);
  });

  test('getNodes returns empty after dispose', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target);
    marker.dispose();

    assert.deepStrictEqual(marker.getNodes(), []);
  });

  test('getNodes returns a copy, not the internal array', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    const marker = portal(child, target);

    const nodes1 = marker.getNodes();
    const nodes2 = marker.getNodes();
    assert.notStrictEqual(nodes1, nodes2);
    assert.deepStrictEqual(nodes1, nodes2);
  });
});

// ============================================================================
// Non-existent Target (Graceful Fallback)
// ============================================================================

describe('portal — non-existent target', () => {
  test('returns marker with no-op methods for missing target', () => {
    const child = adapter.createElement('span');
    const marker = portal(child, '#nonexistent');

    assert.strictEqual(marker.nodeType, 8); // comment
    assert.strictEqual(typeof marker.dispose, 'function');
    assert.strictEqual(typeof marker.moveTo, 'function');
    assert.strictEqual(typeof marker.getNodes, 'function');

    // No-op methods should not throw
    marker.dispose();
    marker.moveTo('#another');
    assert.deepStrictEqual(marker.getNodes(), []);
  });
});

// ============================================================================
// Backward Compatibility
// ============================================================================

describe('portal — backward compatibility', () => {
  test('two-arg signature still works', () => {
    const target = adapter.createElement('div');
    adapter.appendChild(adapter.getBody(), target);

    const child = adapter.createElement('span');
    child.textContent = 'compat';
    const marker = portal(child, target);

    assert.strictEqual(target.childNodes.length, 1);
    assert.strictEqual(target.childNodes[0].textContent, 'compat');
    assert.strictEqual(typeof marker.dispose, 'function');
    assert.strictEqual(typeof marker.moveTo, 'function');
    assert.strictEqual(typeof marker.getNodes, 'function');
  });
});
