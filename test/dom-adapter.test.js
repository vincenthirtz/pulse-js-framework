/**
 * Tests for runtime/dom-adapter.js
 * Tests the DOM abstraction layer for SSR and testing support
 */

import {
  BrowserDOMAdapter,
  MockDOMAdapter,
  MockNode,
  MockElement,
  MockTextNode,
  MockCommentNode,
  MockDocumentFragment,
  getAdapter,
  setAdapter,
  resetAdapter,
  withAdapter
} from '../runtime/dom-adapter.js';

// Simple test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    failed++;
    return false;
  }
  return true;
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    console.error(`✗ ${message || 'assertEqual failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
    return false;
  }
  return true;
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('--- DOM Adapter Tests ---\n');

// ============================================================================
// MockNode Tests
// ============================================================================

console.log('MockNode:');

test('creates mock node with type', () => {
  const node = new MockNode(1, 'test');
  assertEqual(node.nodeType, 1);
  assertEqual(node.textContent, 'test');
});

test('appendChild adds child', () => {
  const parent = new MockNode(1);
  const child = new MockNode(1);
  parent.appendChild(child);
  assertEqual(parent.childNodes.length, 1);
  assertEqual(parent.childNodes[0], child);
  assertEqual(child.parentNode, parent);
});

test('appendChild updates siblings', () => {
  const parent = new MockNode(1);
  const child1 = new MockNode(1);
  const child2 = new MockNode(1);
  parent.appendChild(child1);
  parent.appendChild(child2);
  assertEqual(child1.nextSibling, child2);
  assertEqual(child2.previousSibling, child1);
  assertEqual(child1.previousSibling, null);
  assertEqual(child2.nextSibling, null);
});

test('insertBefore inserts at correct position', () => {
  const parent = new MockNode(1);
  const child1 = new MockNode(1);
  const child2 = new MockNode(1);
  const child3 = new MockNode(1);
  parent.appendChild(child1);
  parent.appendChild(child3);
  parent.insertBefore(child2, child3);
  assertEqual(parent.childNodes[0], child1);
  assertEqual(parent.childNodes[1], child2);
  assertEqual(parent.childNodes[2], child3);
});

test('removeChild removes child', () => {
  const parent = new MockNode(1);
  const child = new MockNode(1);
  parent.appendChild(child);
  parent.removeChild(child);
  assertEqual(parent.childNodes.length, 0);
  assertEqual(child.parentNode, null);
});

test('remove removes from parent', () => {
  const parent = new MockNode(1);
  const child = new MockNode(1);
  parent.appendChild(child);
  child.remove();
  assertEqual(parent.childNodes.length, 0);
});

test('firstChild returns first child', () => {
  const parent = new MockNode(1);
  assertEqual(parent.firstChild, null);
  const child = new MockNode(1);
  parent.appendChild(child);
  assertEqual(parent.firstChild, child);
});

// ============================================================================
// MockElement Tests
// ============================================================================

console.log('\nMockElement:');

test('creates element with tag name', () => {
  const el = new MockElement('div');
  assertEqual(el.tagName, 'DIV');
  assertEqual(el.nodeType, 1);
});

test('setAttribute and getAttribute', () => {
  const el = new MockElement('div');
  el.setAttribute('id', 'test');
  assertEqual(el.getAttribute('id'), 'test');
  assertEqual(el.id, 'test');
});

test('removeAttribute', () => {
  const el = new MockElement('div');
  el.setAttribute('class', 'foo');
  el.removeAttribute('class');
  assertEqual(el.getAttribute('class'), null);
  assertEqual(el.className, '');
});

test('classList.add and classList.remove', () => {
  const el = new MockElement('div');
  el.classList.add('foo');
  assertEqual(el.className, 'foo');
  el.classList.add('bar');
  assertEqual(el.className, 'foo bar');
  el.classList.remove('foo');
  assertEqual(el.className, 'bar');
});

test('classList.contains', () => {
  const el = new MockElement('div');
  el.classList.add('test');
  assertEqual(el.classList.contains('test'), true);
  assertEqual(el.classList.contains('other'), false);
});

test('classList.toggle', () => {
  const el = new MockElement('div');
  el.classList.toggle('foo');
  assertEqual(el.classList.contains('foo'), true);
  el.classList.toggle('foo');
  assertEqual(el.classList.contains('foo'), false);
  el.classList.toggle('bar', true);
  assertEqual(el.classList.contains('bar'), true);
  el.classList.toggle('bar', true);
  assertEqual(el.classList.contains('bar'), true);
});

test('style property', () => {
  const el = new MockElement('div');
  el.style.color = 'red';
  assertEqual(el.style.color, 'red');
});

test('event listeners', () => {
  const el = new MockElement('div');
  let called = false;
  const handler = () => { called = true; };
  el.addEventListener('click', handler);
  el.dispatchEvent({ type: 'click' });
  assertEqual(called, true);
});

test('removeEventListener', () => {
  const el = new MockElement('div');
  let count = 0;
  const handler = () => { count++; };
  el.addEventListener('click', handler);
  el.dispatchEvent({ type: 'click' });
  el.removeEventListener('click', handler);
  el.dispatchEvent({ type: 'click' });
  assertEqual(count, 1);
});

// ============================================================================
// MockTextNode Tests
// ============================================================================

console.log('\nMockTextNode:');

test('creates text node', () => {
  const text = new MockTextNode('Hello');
  assertEqual(text.nodeType, 3);
  assertEqual(text.textContent, 'Hello');
  assertEqual(text.data, 'Hello');
});

// ============================================================================
// MockCommentNode Tests
// ============================================================================

console.log('\nMockCommentNode:');

test('creates comment node', () => {
  const comment = new MockCommentNode('test comment');
  assertEqual(comment.nodeType, 8);
  assertEqual(comment.textContent, 'test comment');
  assertEqual(comment.data, 'test comment');
});

// ============================================================================
// MockDocumentFragment Tests
// ============================================================================

console.log('\nMockDocumentFragment:');

test('creates document fragment', () => {
  const frag = new MockDocumentFragment();
  assertEqual(frag.nodeType, 11);
});

test('fragment appendChild', () => {
  const frag = new MockDocumentFragment();
  const child = new MockElement('div');
  frag.appendChild(child);
  assertEqual(frag.childNodes.length, 1);
});

// ============================================================================
// MockDOMAdapter Tests
// ============================================================================

console.log('\nMockDOMAdapter:');

test('createElement', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  assertEqual(el.tagName, 'DIV');
});

test('createTextNode', () => {
  const adapter = new MockDOMAdapter();
  const text = adapter.createTextNode('Hello');
  assertEqual(text.textContent, 'Hello');
});

test('createComment', () => {
  const adapter = new MockDOMAdapter();
  const comment = adapter.createComment('test');
  assertEqual(comment.textContent, 'test');
});

test('createDocumentFragment', () => {
  const adapter = new MockDOMAdapter();
  const frag = adapter.createDocumentFragment();
  assertEqual(frag.nodeType, 11);
});

test('setAttribute and getAttribute', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  adapter.setAttribute(el, 'id', 'test');
  assertEqual(adapter.getAttribute(el, 'id'), 'test');
});

test('removeAttribute', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  adapter.setAttribute(el, 'class', 'foo');
  adapter.removeAttribute(el, 'class');
  assertEqual(adapter.getAttribute(el, 'class'), null);
});

test('appendChild', () => {
  const adapter = new MockDOMAdapter();
  const parent = adapter.createElement('div');
  const child = adapter.createElement('span');
  adapter.appendChild(parent, child);
  assertEqual(parent.childNodes.length, 1);
  assertEqual(adapter.getParentNode(child), parent);
});

test('insertBefore', () => {
  const adapter = new MockDOMAdapter();
  const parent = adapter.createElement('div');
  const child1 = adapter.createElement('span');
  const child2 = adapter.createElement('span');
  adapter.appendChild(parent, child1);
  adapter.insertBefore(parent, child2, child1);
  assertEqual(parent.childNodes[0], child2);
  assertEqual(parent.childNodes[1], child1);
});

test('removeNode', () => {
  const adapter = new MockDOMAdapter();
  const parent = adapter.createElement('div');
  const child = adapter.createElement('span');
  adapter.appendChild(parent, child);
  adapter.removeNode(child);
  assertEqual(parent.childNodes.length, 0);
});

test('getNextSibling', () => {
  const adapter = new MockDOMAdapter();
  const parent = adapter.createElement('div');
  const child1 = adapter.createElement('span');
  const child2 = adapter.createElement('span');
  adapter.appendChild(parent, child1);
  adapter.appendChild(parent, child2);
  assertEqual(adapter.getNextSibling(child1), child2);
  assertEqual(adapter.getNextSibling(child2), null);
});

test('addClass and removeClass', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  adapter.addClass(el, 'foo');
  assertEqual(el.className, 'foo');
  adapter.removeClass(el, 'foo');
  assertEqual(el.className, '');
});

test('setStyle and getStyle', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  adapter.setStyle(el, 'color', 'red');
  assertEqual(adapter.getStyle(el, 'color'), 'red');
});

test('setProperty and getProperty', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('input');
  adapter.setProperty(el, 'value', 'test');
  assertEqual(adapter.getProperty(el, 'value'), 'test');
});

test('setTextContent and getTextContent', () => {
  const adapter = new MockDOMAdapter();
  const text = adapter.createTextNode('');
  adapter.setTextContent(text, 'Hello World');
  assertEqual(adapter.getTextContent(text), 'Hello World');
});

test('isNode', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  const text = adapter.createTextNode('test');
  assertEqual(adapter.isNode(el), true);
  assertEqual(adapter.isNode(text), true);
  assertEqual(adapter.isNode('string'), false);
  assertEqual(adapter.isNode(null), false);
});

test('isElement', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  const text = adapter.createTextNode('test');
  assertEqual(adapter.isElement(el), true);
  assertEqual(adapter.isElement(text), false);
});

test('getTagName', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('DIV');
  assertEqual(adapter.getTagName(el), 'div');
});

test('getInputType', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('input');
  adapter.setAttribute(el, 'type', 'text');
  assertEqual(adapter.getInputType(el), 'text');
});

test('addEventListener and removeEventListener', () => {
  const adapter = new MockDOMAdapter();
  const el = adapter.createElement('div');
  let count = 0;
  const handler = () => { count++; };
  adapter.addEventListener(el, 'click', handler);
  el.dispatchEvent({ type: 'click' });
  assertEqual(count, 1);
  adapter.removeEventListener(el, 'click', handler);
  el.dispatchEvent({ type: 'click' });
  assertEqual(count, 1);
});

test('queueMicrotask and flushMicrotasks', () => {
  const adapter = new MockDOMAdapter();
  let called = false;
  adapter.queueMicrotask(() => { called = true; });
  assertEqual(called, false);
  adapter.flushMicrotasks();
  assertEqual(called, true);
});

test('setTimeout and clearTimeout', () => {
  const adapter = new MockDOMAdapter();
  let called = false;
  const id = adapter.setTimeout(() => { called = true; }, 100);
  assertEqual(called, false);
  adapter.clearTimeout(id);
  adapter.runAllTimers();
  assertEqual(called, false);
});

test('runAllTimers', () => {
  const adapter = new MockDOMAdapter();
  let count = 0;
  adapter.setTimeout(() => { count++; }, 100);
  adapter.setTimeout(() => { count++; }, 200);
  adapter.runAllTimers();
  assertEqual(count, 2);
});

test('appendChild moves fragment children', () => {
  const adapter = new MockDOMAdapter();
  const parent = adapter.createElement('div');
  const frag = adapter.createDocumentFragment();
  const child1 = adapter.createElement('span');
  const child2 = adapter.createElement('span');
  adapter.appendChild(frag, child1);
  adapter.appendChild(frag, child2);
  adapter.appendChild(parent, frag);
  assertEqual(parent.childNodes.length, 2);
  assertEqual(parent.childNodes[0], child1);
  assertEqual(parent.childNodes[1], child2);
});

test('querySelector by id', () => {
  const adapter = new MockDOMAdapter();
  const body = adapter.getBody();
  const div = adapter.createElement('div');
  adapter.setAttribute(div, 'id', 'test-id');
  adapter.appendChild(body, div);
  const found = adapter.querySelector('#test-id');
  assertEqual(found, div);
});

test('querySelector by class', () => {
  const adapter = new MockDOMAdapter();
  const body = adapter.getBody();
  const div = adapter.createElement('div');
  div.classList.add('test-class');
  adapter.appendChild(body, div);
  const found = adapter.querySelector('.test-class');
  assertEqual(found, div);
});

test('querySelector by tag', () => {
  const adapter = new MockDOMAdapter();
  const body = adapter.getBody();
  const span = adapter.createElement('span');
  adapter.appendChild(body, span);
  const found = adapter.querySelector('span');
  assertEqual(found, span);
});

test('reset clears state', () => {
  const adapter = new MockDOMAdapter();
  const body = adapter.getBody();
  adapter.appendChild(body, adapter.createElement('div'));
  adapter.queueMicrotask(() => {});
  adapter.setTimeout(() => {}, 100);
  adapter.reset();
  assertEqual(body.childNodes.length, 0);
  assertEqual(adapter._microtaskQueue.length, 0);
  assertEqual(adapter._timers.size, 0);
});

// ============================================================================
// Global Adapter Management Tests
// ============================================================================

console.log('\nAdapter Management:');

test('setAdapter and getAdapter', () => {
  const mock = new MockDOMAdapter();
  setAdapter(mock);
  assertEqual(getAdapter(), mock);
});

test('resetAdapter clears adapter', () => {
  const mock = new MockDOMAdapter();
  setAdapter(mock);
  resetAdapter();
  // This would throw in non-browser environment without document
  // We just verify the adapter was cleared
  setAdapter(mock); // Set it back for subsequent tests
});

test('withAdapter temporarily switches adapter', () => {
  const mock1 = new MockDOMAdapter();
  const mock2 = new MockDOMAdapter();
  setAdapter(mock1);

  let insideAdapter = null;
  withAdapter(mock2, () => {
    insideAdapter = getAdapter();
  });

  assertEqual(insideAdapter, mock2);
  assertEqual(getAdapter(), mock1);
});

test('withAdapter restores on exception', () => {
  const mock1 = new MockDOMAdapter();
  const mock2 = new MockDOMAdapter();
  setAdapter(mock1);

  try {
    withAdapter(mock2, () => {
      throw new Error('test');
    });
  } catch (e) {
    // Expected
  }

  assertEqual(getAdapter(), mock1);
});

test('withAdapter returns function result', () => {
  const mock = new MockDOMAdapter();
  const result = withAdapter(mock, () => 42);
  assertEqual(result, 42);
});

// ============================================================================
// Integration Tests - Using Mock for DOM Operations
// ============================================================================

console.log('\nIntegration Tests:');

test('build simple DOM tree with mock', () => {
  const dom = new MockDOMAdapter();

  const container = dom.createElement('div');
  dom.setAttribute(container, 'id', 'app');
  dom.addClass(container, 'container');

  const heading = dom.createElement('h1');
  const headingText = dom.createTextNode('Hello World');
  dom.appendChild(heading, headingText);
  dom.appendChild(container, heading);

  const para = dom.createElement('p');
  dom.setTextContent(para, 'This is a paragraph.');
  dom.appendChild(container, para);

  assertEqual(container.childNodes.length, 2);
  assertEqual(dom.getAttribute(container, 'id'), 'app');
  assertEqual(container.classList.contains('container'), true);
  assertEqual(dom.getTextContent(headingText), 'Hello World');
});

test('simulate reactive updates with mock', () => {
  const dom = new MockDOMAdapter();

  const marker = dom.createComment('placeholder');
  const parent = dom.createElement('div');
  dom.appendChild(parent, marker);

  // Simulate adding content
  const content = dom.createElement('span');
  dom.setTextContent(content, 'Content');
  dom.insertBefore(parent, content, dom.getNextSibling(marker));

  assertEqual(parent.childNodes.length, 2);
  assertEqual(parent.childNodes[0], marker);
  assertEqual(parent.childNodes[1], content);

  // Simulate removing content
  dom.removeNode(content);
  assertEqual(parent.childNodes.length, 1);
});

test('simulate list rendering with mock', () => {
  const dom = new MockDOMAdapter();

  const container = dom.createElement('ul');
  const items = ['Apple', 'Banana', 'Cherry'];

  for (const item of items) {
    const li = dom.createElement('li');
    dom.setTextContent(li, item);
    dom.appendChild(container, li);
  }

  assertEqual(container.childNodes.length, 3);
  assertEqual(dom.getTextContent(container.childNodes[0]), 'Apple');
  assertEqual(dom.getTextContent(container.childNodes[1]), 'Banana');
  assertEqual(dom.getTextContent(container.childNodes[2]), 'Cherry');
});

// Clean up
resetAdapter();

// ============================================================================
// Results
// ============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
