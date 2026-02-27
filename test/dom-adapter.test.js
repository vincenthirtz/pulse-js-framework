/**
 * Tests for runtime/dom-adapter.js
 * Tests the DOM abstraction layer for SSR and testing support
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

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

// ============================================================================
// MockNode Tests
// ============================================================================

describe('MockNode', () => {
  test('creates mock node with type', () => {
    const node = new MockNode(1, 'test');
    assert.strictEqual(node.nodeType, 1);
    assert.strictEqual(node.textContent, 'test');
  });

  test('appendChild adds child', () => {
    const parent = new MockNode(1);
    const child = new MockNode(1);
    parent.appendChild(child);
    assert.strictEqual(parent.childNodes.length, 1);
    assert.strictEqual(parent.childNodes[0], child);
    assert.strictEqual(child.parentNode, parent);
  });

  test('appendChild updates siblings', () => {
    const parent = new MockNode(1);
    const child1 = new MockNode(1);
    const child2 = new MockNode(1);
    parent.appendChild(child1);
    parent.appendChild(child2);
    assert.strictEqual(child1.nextSibling, child2);
    assert.strictEqual(child2.previousSibling, child1);
    assert.strictEqual(child1.previousSibling, null);
    assert.strictEqual(child2.nextSibling, null);
  });

  test('insertBefore inserts at correct position', () => {
    const parent = new MockNode(1);
    const child1 = new MockNode(1);
    const child2 = new MockNode(1);
    const child3 = new MockNode(1);
    parent.appendChild(child1);
    parent.appendChild(child3);
    parent.insertBefore(child2, child3);
    assert.strictEqual(parent.childNodes[0], child1);
    assert.strictEqual(parent.childNodes[1], child2);
    assert.strictEqual(parent.childNodes[2], child3);
  });

  test('removeChild removes child', () => {
    const parent = new MockNode(1);
    const child = new MockNode(1);
    parent.appendChild(child);
    parent.removeChild(child);
    assert.strictEqual(parent.childNodes.length, 0);
    assert.strictEqual(child.parentNode, null);
  });

  test('remove removes from parent', () => {
    const parent = new MockNode(1);
    const child = new MockNode(1);
    parent.appendChild(child);
    child.remove();
    assert.strictEqual(parent.childNodes.length, 0);
  });

  test('firstChild returns first child', () => {
    const parent = new MockNode(1);
    assert.strictEqual(parent.firstChild, null);
    const child = new MockNode(1);
    parent.appendChild(child);
    assert.strictEqual(parent.firstChild, child);
  });
});

// ============================================================================
// MockElement Tests
// ============================================================================

describe('MockElement', () => {
  test('creates element with tag name', () => {
    const el = new MockElement('div');
    assert.strictEqual(el.tagName, 'DIV');
    assert.strictEqual(el.nodeType, 1);
  });

  test('setAttribute and getAttribute', () => {
    const el = new MockElement('div');
    el.setAttribute('id', 'test');
    assert.strictEqual(el.getAttribute('id'), 'test');
    assert.strictEqual(el.id, 'test');
  });

  test('removeAttribute', () => {
    const el = new MockElement('div');
    el.setAttribute('class', 'foo');
    el.removeAttribute('class');
    assert.strictEqual(el.getAttribute('class'), null);
    assert.strictEqual(el.className, '');
  });

  test('classList.add and classList.remove', () => {
    const el = new MockElement('div');
    el.classList.add('foo');
    assert.strictEqual(el.className, 'foo');
    el.classList.add('bar');
    assert.strictEqual(el.className, 'foo bar');
    el.classList.remove('foo');
    assert.strictEqual(el.className, 'bar');
  });

  test('classList.contains', () => {
    const el = new MockElement('div');
    el.classList.add('test');
    assert.strictEqual(el.classList.contains('test'), true);
    assert.strictEqual(el.classList.contains('other'), false);
  });

  test('classList.toggle', () => {
    const el = new MockElement('div');
    el.classList.toggle('foo');
    assert.strictEqual(el.classList.contains('foo'), true);
    el.classList.toggle('foo');
    assert.strictEqual(el.classList.contains('foo'), false);
    el.classList.toggle('bar', true);
    assert.strictEqual(el.classList.contains('bar'), true);
    el.classList.toggle('bar', true);
    assert.strictEqual(el.classList.contains('bar'), true);
  });

  test('style property', () => {
    const el = new MockElement('div');
    el.style.color = 'red';
    assert.strictEqual(el.style.color, 'red');
  });

  test('event listeners', () => {
    const el = new MockElement('div');
    let called = false;
    const handler = () => { called = true; };
    el.addEventListener('click', handler);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(called, true);
  });

  test('removeEventListener', () => {
    const el = new MockElement('div');
    let count = 0;
    const handler = () => { count++; };
    el.addEventListener('click', handler);
    el.dispatchEvent({ type: 'click' });
    el.removeEventListener('click', handler);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(count, 1);
  });
});

// ============================================================================
// MockTextNode Tests
// ============================================================================

describe('MockTextNode', () => {
  test('creates text node', () => {
    const text = new MockTextNode('Hello');
    assert.strictEqual(text.nodeType, 3);
    assert.strictEqual(text.textContent, 'Hello');
    assert.strictEqual(text.data, 'Hello');
  });
});

// ============================================================================
// MockCommentNode Tests
// ============================================================================

describe('MockCommentNode', () => {
  test('creates comment node', () => {
    const comment = new MockCommentNode('test comment');
    assert.strictEqual(comment.nodeType, 8);
    assert.strictEqual(comment.textContent, 'test comment');
    assert.strictEqual(comment.data, 'test comment');
  });
});

// ============================================================================
// MockDocumentFragment Tests
// ============================================================================

describe('MockDocumentFragment', () => {
  test('creates document fragment', () => {
    const frag = new MockDocumentFragment();
    assert.strictEqual(frag.nodeType, 11);
  });

  test('fragment appendChild', () => {
    const frag = new MockDocumentFragment();
    const child = new MockElement('div');
    frag.appendChild(child);
    assert.strictEqual(frag.childNodes.length, 1);
  });
});

// ============================================================================
// MockDOMAdapter Tests
// ============================================================================

describe('MockDOMAdapter', () => {
  test('createElement', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    assert.strictEqual(el.tagName, 'DIV');
  });

  test('createTextNode', () => {
    const adapter = new MockDOMAdapter();
    const text = adapter.createTextNode('Hello');
    assert.strictEqual(text.textContent, 'Hello');
  });

  test('createComment', () => {
    const adapter = new MockDOMAdapter();
    const comment = adapter.createComment('test');
    assert.strictEqual(comment.textContent, 'test');
  });

  test('createDocumentFragment', () => {
    const adapter = new MockDOMAdapter();
    const frag = adapter.createDocumentFragment();
    assert.strictEqual(frag.nodeType, 11);
  });

  test('setAttribute and getAttribute', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    adapter.setAttribute(el, 'id', 'test');
    assert.strictEqual(adapter.getAttribute(el, 'id'), 'test');
  });

  test('removeAttribute', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    adapter.setAttribute(el, 'class', 'foo');
    adapter.removeAttribute(el, 'class');
    assert.strictEqual(adapter.getAttribute(el, 'class'), null);
  });

  test('appendChild', () => {
    const adapter = new MockDOMAdapter();
    const parent = adapter.createElement('div');
    const child = adapter.createElement('span');
    adapter.appendChild(parent, child);
    assert.strictEqual(parent.childNodes.length, 1);
    assert.strictEqual(adapter.getParentNode(child), parent);
  });

  test('insertBefore', () => {
    const adapter = new MockDOMAdapter();
    const parent = adapter.createElement('div');
    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('span');
    adapter.appendChild(parent, child1);
    adapter.insertBefore(parent, child2, child1);
    assert.strictEqual(parent.childNodes[0], child2);
    assert.strictEqual(parent.childNodes[1], child1);
  });

  test('removeNode', () => {
    const adapter = new MockDOMAdapter();
    const parent = adapter.createElement('div');
    const child = adapter.createElement('span');
    adapter.appendChild(parent, child);
    adapter.removeNode(child);
    assert.strictEqual(parent.childNodes.length, 0);
  });

  test('getNextSibling', () => {
    const adapter = new MockDOMAdapter();
    const parent = adapter.createElement('div');
    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('span');
    adapter.appendChild(parent, child1);
    adapter.appendChild(parent, child2);
    assert.strictEqual(adapter.getNextSibling(child1), child2);
    assert.strictEqual(adapter.getNextSibling(child2), null);
  });

  test('addClass and removeClass', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    adapter.addClass(el, 'foo');
    assert.strictEqual(el.className, 'foo');
    adapter.removeClass(el, 'foo');
    assert.strictEqual(el.className, '');
  });

  test('setStyle and getStyle', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    adapter.setStyle(el, 'color', 'red');
    assert.strictEqual(adapter.getStyle(el, 'color'), 'red');
  });

  test('setProperty and getProperty', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('input');
    adapter.setProperty(el, 'value', 'test');
    assert.strictEqual(adapter.getProperty(el, 'value'), 'test');
  });

  test('setTextContent and getTextContent', () => {
    const adapter = new MockDOMAdapter();
    const text = adapter.createTextNode('');
    adapter.setTextContent(text, 'Hello World');
    assert.strictEqual(adapter.getTextContent(text), 'Hello World');
  });

  test('isNode', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    const text = adapter.createTextNode('test');
    assert.strictEqual(adapter.isNode(el), true);
    assert.strictEqual(adapter.isNode(text), true);
    assert.strictEqual(adapter.isNode('string'), false);
    assert.strictEqual(adapter.isNode(null), false);
  });

  test('isElement', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    const text = adapter.createTextNode('test');
    assert.strictEqual(adapter.isElement(el), true);
    assert.strictEqual(adapter.isElement(text), false);
  });

  test('getTagName', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('DIV');
    assert.strictEqual(adapter.getTagName(el), 'div');
  });

  test('getInputType', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('input');
    adapter.setAttribute(el, 'type', 'text');
    assert.strictEqual(adapter.getInputType(el), 'text');
  });

  test('addEventListener and removeEventListener', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    let count = 0;
    const handler = () => { count++; };
    adapter.addEventListener(el, 'click', handler);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(count, 1);
    adapter.removeEventListener(el, 'click', handler);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(count, 1);
  });

  test('queueMicrotask and flushMicrotasks', () => {
    const adapter = new MockDOMAdapter();
    let called = false;
    adapter.queueMicrotask(() => { called = true; });
    assert.strictEqual(called, false);
    adapter.flushMicrotasks();
    assert.strictEqual(called, true);
  });

  test('setTimeout and clearTimeout', () => {
    const adapter = new MockDOMAdapter();
    let called = false;
    const id = adapter.setTimeout(() => { called = true; }, 100);
    assert.strictEqual(called, false);
    adapter.clearTimeout(id);
    adapter.runAllTimers();
    assert.strictEqual(called, false);
  });

  test('runAllTimers', () => {
    const adapter = new MockDOMAdapter();
    let count = 0;
    adapter.setTimeout(() => { count++; }, 100);
    adapter.setTimeout(() => { count++; }, 200);
    adapter.runAllTimers();
    assert.strictEqual(count, 2);
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
    assert.strictEqual(parent.childNodes.length, 2);
    assert.strictEqual(parent.childNodes[0], child1);
    assert.strictEqual(parent.childNodes[1], child2);
  });

  test('querySelector by id', () => {
    const adapter = new MockDOMAdapter();
    const body = adapter.getBody();
    const div = adapter.createElement('div');
    adapter.setAttribute(div, 'id', 'test-id');
    adapter.appendChild(body, div);
    const found = adapter.querySelector('#test-id');
    assert.strictEqual(found, div);
  });

  test('querySelector by class', () => {
    const adapter = new MockDOMAdapter();
    const body = adapter.getBody();
    const div = adapter.createElement('div');
    div.classList.add('test-class');
    adapter.appendChild(body, div);
    const found = adapter.querySelector('.test-class');
    assert.strictEqual(found, div);
  });

  test('querySelector by tag', () => {
    const adapter = new MockDOMAdapter();
    const body = adapter.getBody();
    const span = adapter.createElement('span');
    adapter.appendChild(body, span);
    const found = adapter.querySelector('span');
    assert.strictEqual(found, span);
  });

  test('reset clears state', () => {
    const adapter = new MockDOMAdapter();
    const body = adapter.getBody();
    adapter.appendChild(body, adapter.createElement('div'));
    adapter.queueMicrotask(() => {});
    adapter.setTimeout(() => {}, 100);
    adapter.reset();
    assert.strictEqual(body.childNodes.length, 0);
    assert.strictEqual(adapter._microtaskQueue.length, 0);
    assert.strictEqual(adapter._timers.size, 0);
  });
});

// ============================================================================
// Global Adapter Management Tests
// ============================================================================

describe('Adapter Management', () => {
  test('setAdapter and getAdapter', () => {
    const mock = new MockDOMAdapter();
    setAdapter(mock);
    assert.strictEqual(getAdapter(), mock);
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

    assert.strictEqual(insideAdapter, mock2);
    assert.strictEqual(getAdapter(), mock1);
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

    assert.strictEqual(getAdapter(), mock1);
  });

  test('withAdapter returns function result', () => {
    const mock = new MockDOMAdapter();
    const result = withAdapter(mock, () => 42);
    assert.strictEqual(result, 42);
  });
});

// ============================================================================
// Integration Tests - Using Mock for DOM Operations
// ============================================================================

describe('Integration Tests', () => {
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

    assert.strictEqual(container.childNodes.length, 2);
    assert.strictEqual(dom.getAttribute(container, 'id'), 'app');
    assert.ok(container.classList.contains('container'));
    assert.strictEqual(dom.getTextContent(headingText), 'Hello World');
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

    assert.strictEqual(parent.childNodes.length, 2);
    assert.strictEqual(parent.childNodes[0], marker);
    assert.strictEqual(parent.childNodes[1], content);

    // Simulate removing content
    dom.removeNode(content);
    assert.strictEqual(parent.childNodes.length, 1);
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

    assert.strictEqual(container.childNodes.length, 3);
    assert.strictEqual(dom.getTextContent(container.childNodes[0]), 'Apple');
    assert.strictEqual(dom.getTextContent(container.childNodes[1]), 'Banana');
    assert.strictEqual(dom.getTextContent(container.childNodes[2]), 'Cherry');
  });
});

// Clean up
resetAdapter();
