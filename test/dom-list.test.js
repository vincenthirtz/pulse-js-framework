/**
 * Pulse DOM List Tests
 *
 * Tests for runtime/dom-list.js - List rendering with LIS algorithm
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom-list
 */

import { createDOM } from './mock-dom.js';

// Set up DOM environment before importing
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Import the module under test
import { list, computeLIS } from '../runtime/dom-list.js';
import { pulse, effect } from '../runtime/pulse.js';
import { el, mount } from '../runtime/dom.js';

import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// computeLIS Algorithm Tests
// =============================================================================

printSection('computeLIS Algorithm Tests');

test('computeLIS: empty array returns empty', () => {
  const result = computeLIS([]);
  assertDeepEqual(result, []);
});

test('computeLIS: single element returns that index', () => {
  const result = computeLIS([5]);
  assertDeepEqual(result, [0]);
});

test('computeLIS: already sorted array', () => {
  const result = computeLIS([1, 2, 3, 4, 5]);
  // LIS should include all elements (indices 0-4)
  assertEqual(result.length, 5);
  assertDeepEqual(result, [0, 1, 2, 3, 4]);
});

test('computeLIS: reverse sorted array', () => {
  const result = computeLIS([5, 4, 3, 2, 1]);
  // LIS length should be 1 (any single element)
  assertEqual(result.length, 1);
});

test('computeLIS: mixed array finds correct LIS', () => {
  // Array: [3, 1, 4, 1, 5, 9, 2, 6]
  // One LIS: [1, 4, 5, 9] or [1, 4, 5, 6] at indices [1, 2, 4, 5] or [1, 2, 4, 7]
  const result = computeLIS([3, 1, 4, 1, 5, 9, 2, 6]);
  assertEqual(result.length, 4);

  // Verify it's actually increasing
  const values = result.map(i => [3, 1, 4, 1, 5, 9, 2, 6][i]);
  for (let i = 1; i < values.length; i++) {
    assert(values[i] > values[i - 1], `LIS should be strictly increasing: ${values}`);
  }
});

test('computeLIS: handles duplicates', () => {
  const result = computeLIS([2, 2, 2, 2, 2]);
  // With duplicates (not strictly increasing), LIS should be length 1
  assertEqual(result.length, 1);
});

test('computeLIS: typical reorder scenario', () => {
  // Simulates items moving: old order [0,1,2,3,4], new maps to [2,0,1,4,3]
  // Items at old indices 0,1 are in increasing order relative to each other
  const result = computeLIS([2, 0, 1, 4, 3]);
  // LIS could be [0,1,3] (indices 1,2,4) with values [0,1,3]
  // Or [2,4] (indices 0,3) with values [2,4]
  assert(result.length >= 2, 'Should find LIS of at least length 2');

  // Verify increasing
  const values = result.map(i => [2, 0, 1, 4, 3][i]);
  for (let i = 1; i < values.length; i++) {
    assert(values[i] > values[i - 1], `LIS should be strictly increasing`);
  }
});

test('computeLIS: large array performance', () => {
  // Generate array of 1000 elements
  const arr = Array.from({ length: 1000 }, (_, i) => Math.floor(Math.random() * 1000));

  const start = Date.now();
  const result = computeLIS(arr);
  const elapsed = Date.now() - start;

  // Should complete in reasonable time (O(n log n))
  assert(elapsed < 100, `LIS on 1000 elements should be fast, took ${elapsed}ms`);

  // Verify it's a valid LIS
  const values = result.map(i => arr[i]);
  for (let i = 1; i < values.length; i++) {
    assert(values[i] > values[i - 1], 'LIS should be strictly increasing');
  }
});

// =============================================================================
// list() Function Tests
// =============================================================================

printSection('list() Rendering Tests');

test('list: renders initial items', () => {
  const items = pulse(['a', 'b', 'c']);

  const fragment = list(
    () => items.get(),
    (item, index) => el('li', item),
    (item) => item
  );

  // Mount to document
  const container = document.createElement('div');
  container.appendChild(fragment);

  // Should have: comment, li, li, li, comment
  const children = Array.from(container.childNodes);
  assertEqual(children.length, 5);
  assertEqual(children[1].tagName.toLowerCase(), 'li');
  assertEqual(children[1].textContent, 'a');
  assertEqual(children[2].textContent, 'b');
  assertEqual(children[3].textContent, 'c');
});

test('list: updates when items change', () => {
  const items = pulse(['a', 'b']);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Initial: 2 items
  let lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis.length, 2);

  // Add item
  items.set(['a', 'b', 'c']);

  lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis.length, 3);
  assertEqual(lis[2].textContent, 'c');
});

test('list: removes items', () => {
  const items = pulse(['a', 'b', 'c']);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Remove middle item
  items.set(['a', 'c']);

  const lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis.length, 2);
  assertEqual(lis[0].textContent, 'a');
  assertEqual(lis[1].textContent, 'c');
});

test('list: reorders items efficiently', () => {
  const items = pulse([
    { id: 1, name: 'first' },
    { id: 2, name: 'second' },
    { id: 3, name: 'third' }
  ]);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item.name),
    (item) => item.id
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Get initial nodes
  const initialLis = Array.from(container.querySelectorAll('li'));
  assertEqual(initialLis[0].textContent, 'first');

  // Reverse order
  items.set([
    { id: 3, name: 'third' },
    { id: 2, name: 'second' },
    { id: 1, name: 'first' }
  ]);

  const reorderedLis = Array.from(container.querySelectorAll('li'));
  assertEqual(reorderedLis.length, 3);
  assertEqual(reorderedLis[0].textContent, 'third');
  assertEqual(reorderedLis[1].textContent, 'second');
  assertEqual(reorderedLis[2].textContent, 'first');
});

test('list: handles empty array', () => {
  const items = pulse([]);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Should only have marker comments
  const lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis.length, 0);
});

test('list: handles transition from empty to populated', () => {
  const items = pulse([]);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 0);

  // Add items
  items.set(['x', 'y', 'z']);

  assertEqual(container.querySelectorAll('li').length, 3);
});

test('list: handles transition from populated to empty', () => {
  const items = pulse(['a', 'b', 'c']);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 3);

  // Clear all
  items.set([]);

  assertEqual(container.querySelectorAll('li').length, 0);
});

test('list: works with Pulse directly (not function)', () => {
  const items = pulse(['a', 'b']);

  // Pass pulse directly instead of getter function
  const fragment = list(
    items,
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 2);

  items.set(['a', 'b', 'c']);
  assertEqual(container.querySelectorAll('li').length, 3);
});

test('list: uses index as default key', () => {
  const items = pulse(['a', 'b', 'c']);

  // No key function provided
  const fragment = list(
    () => items.get(),
    (item, index) => el('li', `${index}:${item}`)
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  const lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis[0].textContent, '0:a');
  assertEqual(lis[1].textContent, '1:b');
  assertEqual(lis[2].textContent, '2:c');
});

test('list: template receives correct index', () => {
  const items = pulse(['x', 'y', 'z']);
  const indices = [];

  const fragment = list(
    () => items.get(),
    (item, index) => {
      indices.push(index);
      return el('li', item);
    },
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertDeepEqual(indices, [0, 1, 2]);
});

test('list: handles objects with complex keys', () => {
  const items = pulse([
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' }
  ]);

  const fragment = list(
    () => items.get(),
    (item) => el('span.user', item.name),
    (item) => item.id
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  const spans = Array.from(container.querySelectorAll('span.user'));
  assertEqual(spans.length, 2);

  // Swap order
  items.set([
    { id: 'user-2', name: 'Bob' },
    { id: 'user-1', name: 'Alice' }
  ]);

  const swappedSpans = Array.from(container.querySelectorAll('span.user'));
  assertEqual(swappedSpans.length, 2);
  assertEqual(swappedSpans[0].textContent, 'Bob');
  assertEqual(swappedSpans[1].textContent, 'Alice');
});

test('list: handles rapid updates', () => {
  const items = pulse([1, 2, 3]);

  const fragment = list(
    () => items.get(),
    (item) => el('span', String(item)),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Rapid updates
  items.set([1, 2, 3, 4]);
  items.set([1, 2]);
  items.set([5, 4, 3, 2, 1]);
  items.set([1]);

  const spans = Array.from(container.querySelectorAll('span'));
  assertEqual(spans.length, 1);
  assertEqual(spans[0].textContent, '1');
});

test('list: template can return array of nodes', () => {
  const items = pulse(['a', 'b']);

  const fragment = list(
    () => items.get(),
    (item) => [el('dt', item), el('dd', `desc-${item}`)],
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Should have dt and dd for each item
  assertEqual(container.querySelectorAll('dt').length, 2);
  assertEqual(container.querySelectorAll('dd').length, 2);
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('list() Edge Cases');

test('list: handles null/undefined items gracefully', () => {
  const items = pulse([null, 'a', undefined, 'b']);

  const fragment = list(
    () => items.get(),
    (item, index) => el('li', String(item)),
    (_, index) => index
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  const lis = Array.from(container.querySelectorAll('li'));
  assertEqual(lis.length, 4);
  assertEqual(lis[0].textContent, 'null');
  assertEqual(lis[2].textContent, 'undefined');
});

test('list: handles duplicate keys (last wins)', () => {
  const items = pulse([
    { id: 1, name: 'first' },
    { id: 1, name: 'duplicate' } // Same key
  ]);

  const fragment = list(
    () => items.get(),
    (item) => el('li', item.name),
    (item) => item.id
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Behavior with duplicate keys - implementation specific
  // At minimum should not crash
  const lis = Array.from(container.querySelectorAll('li'));
  assert(lis.length >= 1, 'Should render at least one item');
});

test('list: works with Set (iterable)', () => {
  const items = pulse(new Set(['a', 'b', 'c']));

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 3);
});

test('list: works with Map values', () => {
  const map = new Map([['k1', 'v1'], ['k2', 'v2']]);
  const items = pulse(Array.from(map.values()));

  const fragment = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 2);
});

// =============================================================================
// Print Results
// =============================================================================

printResults();
exitWithCode();
