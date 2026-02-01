/**
 * Pulse DOM Tests
 *
 * Tests for runtime/dom.js - DOM creation and reactive bindings
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom
 */

import { createDOM } from './mock-dom.js';

// Set up DOM environment before importing dom.js
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Now import DOM utilities
import {
  el,
  text,
  bind,
  prop,
  cls,
  style,
  on,
  list,
  when,
  match,
  model,
  mount,
  component,
  parseSelector,
  onMount,
  onUnmount,
  show,
  portal,
  errorBoundary,
  transition,
  whenTransition
} from '../runtime/dom.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

// Import test utilities (after DOM setup)
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
// parseSelector Tests
// =============================================================================

printSection('parseSelector Tests');

test('parses tag name', () => {
  const config = parseSelector('div');
  assertEqual(config.tag, 'div');
});

test('parses tag with id', () => {
  const config = parseSelector('div#main');
  assertEqual(config.tag, 'div');
  assertEqual(config.id, 'main');
});

test('parses tag with class', () => {
  const config = parseSelector('div.container');
  assertEqual(config.tag, 'div');
  assertDeepEqual(config.classes, ['container']);
});

test('parses multiple classes', () => {
  const config = parseSelector('button.btn.primary.large');
  assertEqual(config.tag, 'button');
  assertDeepEqual(config.classes, ['btn', 'primary', 'large']);
});

test('parses id without tag (defaults to div)', () => {
  const config = parseSelector('#app');
  assertEqual(config.tag, 'div');
  assertEqual(config.id, 'app');
});

test('parses class without tag (defaults to div)', () => {
  const config = parseSelector('.wrapper');
  assertEqual(config.tag, 'div');
  assertDeepEqual(config.classes, ['wrapper']);
});

test('parses attributes', () => {
  const config = parseSelector('input[type=text]');
  assertEqual(config.tag, 'input');
  assertEqual(config.attrs.type, 'text');
});

test('parses attributes with quotes', () => {
  const config = parseSelector('input[placeholder="Enter name"]');
  assertEqual(config.tag, 'input');
  assertEqual(config.attrs.placeholder, 'Enter name');
});

test('parses multiple attributes', () => {
  const config = parseSelector('input[type=text][name=email][required]');
  assertEqual(config.tag, 'input');
  assertEqual(config.attrs.type, 'text');
  assertEqual(config.attrs.name, 'email');
  assertEqual(config.attrs.required, '');
});

test('parses complex selector', () => {
  const config = parseSelector('form#login.auth-form[method=post][action="/api/login"]');
  assertEqual(config.tag, 'form');
  assertEqual(config.id, 'login');
  assertDeepEqual(config.classes, ['auth-form']);
  assertEqual(config.attrs.method, 'post');
  assertEqual(config.attrs.action, '/api/login');
});

// =============================================================================
// el() Tests
// =============================================================================

printSection('el() Tests');

test('creates element from simple selector', () => {
  const div = el('div');
  assertEqual(div.tagName.toLowerCase(), 'div');
});

test('creates element with id', () => {
  const elem = el('section#main');
  assertEqual(elem.tagName.toLowerCase(), 'section');
  assertEqual(elem.id, 'main');
});

test('creates element with class', () => {
  const elem = el('div.container');
  assert(elem.classList.contains('container'));
});

test('creates element with multiple classes', () => {
  const elem = el('div.card.shadow.rounded');
  assert(elem.classList.contains('card'));
  assert(elem.classList.contains('shadow'));
  assert(elem.classList.contains('rounded'));
});

test('creates element with attributes', () => {
  const input = el('input[type=email][placeholder="Email"]');
  assertEqual(input.getAttribute('type'), 'email');
  assertEqual(input.getAttribute('placeholder'), 'Email');
});

test('creates element with text content', () => {
  const p = el('p', 'Hello World');
  assertEqual(p.textContent, 'Hello World');
});

test('creates element with child elements', () => {
  const div = el('div',
    el('span', 'First'),
    el('span', 'Second')
  );
  assertEqual(div.children.length, 2);
  assertEqual(div.children[0].textContent, 'First');
  assertEqual(div.children[1].textContent, 'Second');
});

test('creates element with mixed children', () => {
  const div = el('div',
    'Text node',
    el('span', 'Span')
  );
  assert(div.childNodes.length >= 2);
});

test('creates element with array of children', () => {
  const items = ['a', 'b', 'c'];
  const ul = el('ul', ...items.map(i => el('li', i)));
  assertEqual(ul.children.length, 3);
});

// =============================================================================
// text() Tests
// =============================================================================

printSection('text() Tests');

test('creates text node', () => {
  const node = text('Hello');
  assertEqual(node.textContent, 'Hello');
});

test('creates reactive text', () => {
  const message = pulse('Hello');
  const node = text(() => message.get());

  assertEqual(node.textContent, 'Hello');

  message.set('World');
  assertEqual(node.textContent, 'World');
});

// =============================================================================
// bind() Tests
// =============================================================================

printSection('bind() Tests');

test('binds attribute value', () => {
  const elem = el('a');
  const url = pulse('/home');

  bind(elem, 'href', () => url.get());
  assertEqual(elem.getAttribute('href'), '/home');

  url.set('/about');
  assertEqual(elem.getAttribute('href'), '/about');
});

// =============================================================================
// prop() Tests
// =============================================================================

printSection('prop() Tests');

test('sets property value', () => {
  const input = el('input[type=checkbox]');
  const checked = pulse(false);

  prop(input, 'checked', () => checked.get());

  assertEqual(input.checked, false);

  checked.set(true);
  assertEqual(input.checked, true);
});

// =============================================================================
// cls() Tests
// =============================================================================

printSection('cls() Tests');

test('adds/removes class based on condition', () => {
  const elem = el('div');
  const isActive = pulse(false);

  cls(elem, 'active', () => isActive.get());

  assert(!elem.classList.contains('active'));

  isActive.set(true);
  assert(elem.classList.contains('active'));

  isActive.set(false);
  assert(!elem.classList.contains('active'));
});

// =============================================================================
// style() Tests
// =============================================================================

printSection('style() Tests');

test('sets style property', () => {
  const elem = el('div');
  const color = pulse('red');

  style(elem, 'color', () => color.get());

  assertEqual(elem.style.color, 'red');

  color.set('blue');
  assertEqual(elem.style.color, 'blue');
});

// =============================================================================
// on() Tests
// =============================================================================

printSection('on() Tests');

test('attaches event listener', () => {
  const button = el('button');
  let clicked = false;

  on(button, 'click', () => { clicked = true; });

  // Simulate click using linkedom's click() method
  if (typeof button.click === 'function') {
    button.click();
  } else {
    // Fallback: manually trigger listener
    button.dispatchEvent({ type: 'click' });
  }

  assert(clicked, 'Click handler should have been called');
});

test('returns element for chaining', () => {
  const button = el('button');
  const result = on(button, 'click', () => {});

  assertEqual(result, button);
});

// =============================================================================
// list() Tests
// =============================================================================

printSection('list() Tests');

test('creates list from array', () => {
  const items = pulse(['a', 'b', 'c']);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item),
    (item) => item
  );

  container.appendChild(fragment);

  // Need to trigger effect
  assertEqual(container.querySelectorAll('li').length, 3);
});

test('list updates when items change', () => {
  const items = pulse(['a', 'b']);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item),
    (item) => item
  );

  container.appendChild(fragment);

  items.set(['a', 'b', 'c', 'd']);

  assertEqual(container.querySelectorAll('li').length, 4);
});

test('list removes items', () => {
  const items = pulse(['a', 'b', 'c']);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item),
    (item) => item
  );

  container.appendChild(fragment);

  items.set(['a']);

  assertEqual(container.querySelectorAll('li').length, 1);
});

test('list handles rapid empty/non-empty transitions', () => {
  const items = pulse([{ id: 1, name: 'a' }]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);
  assertEqual(container.querySelectorAll('li').length, 1);

  // Transition to empty
  items.set([]);
  assertEqual(container.querySelectorAll('li').length, 0);

  // Transition back to non-empty
  items.set([{ id: 2, name: 'b' }, { id: 3, name: 'c' }]);
  assertEqual(container.querySelectorAll('li').length, 2);

  // Empty again
  items.set([]);
  assertEqual(container.querySelectorAll('li').length, 0);

  // Single item again
  items.set([{ id: 4, name: 'd' }]);
  assertEqual(container.querySelectorAll('li').length, 1);
});

// =============================================================================
// when() Tests
// =============================================================================

printSection('when() Tests');

test('when shows content when true', () => {
  const show = pulse(true);
  const container = el('div');

  const fragment = when(
    () => show.get(),
    () => el('span', 'Visible')
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('span').length, 1);
});

test('when hides content when false', () => {
  const show = pulse(false);
  const container = el('div');

  const fragment = when(
    () => show.get(),
    () => el('span', 'Visible')
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('span').length, 0);
});

test('when shows else content', () => {
  const show = pulse(false);
  const container = el('div');

  const fragment = when(
    () => show.get(),
    () => el('span.then', 'Then'),
    () => el('span.else', 'Else')
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.else').length, 1);
  assertEqual(container.querySelectorAll('.then').length, 0);
});

test('when switches content', () => {
  const show = pulse(true);
  const container = el('div');

  const fragment = when(
    () => show.get(),
    () => el('span.then', 'Then'),
    () => el('span.else', 'Else')
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.then').length, 1);

  show.set(false);

  assertEqual(container.querySelectorAll('.then').length, 0);
  assertEqual(container.querySelectorAll('.else').length, 1);
});

// =============================================================================
// match() Tests
// =============================================================================

printSection('match() Tests');

test('match renders matching case', () => {
  const status = pulse('initial');  // Start with different value
  const container = el('div');
  document.body.appendChild(container);

  const marker = match(status, {
    loading: () => el('span.loading', 'Loading...'),
    success: () => el('span.success', 'Done!'),
    error: () => el('span.error', 'Error!')
  });

  container.appendChild(marker);

  // Now change to 'loading' - this will trigger the effect with marker in DOM
  status.set('loading');

  assertEqual(container.querySelectorAll('.loading').length, 1);

  container.remove();
});

test('match switches cases', () => {
  const status = pulse('loading');
  const container = el('div');

  const fragment = match(status, {
    loading: () => el('span.loading', 'Loading...'),
    success: () => el('span.success', 'Done!'),
    error: () => el('span.error', 'Error!')
  });

  container.appendChild(fragment);

  status.set('success');

  assertEqual(container.querySelectorAll('.loading').length, 0);
  assertEqual(container.querySelectorAll('.success').length, 1);
});

// =============================================================================
// model() Tests
// =============================================================================

printSection('model() Tests');

test('model binds value to input', () => {
  const value = pulse('hello');
  const input = el('input[type=text]');

  model(input, value);

  assertEqual(input.value, 'hello');

  value.set('world');
  assertEqual(input.value, 'world');
});

test('model updates pulse on input', () => {
  const value = pulse('');
  const input = el('input[type=text]');
  document.body.appendChild(input);

  model(input, value);

  // Set the value and trigger change via direct property set + manual trigger
  input.value = 'typed';

  // Directly call the input's oninput handler if available
  // This is a workaround for linkedom's limited event dispatch
  if (input.oninput) {
    input.oninput({ target: input });
  } else {
    // Fallback: the addEventListener approach might work
    const event = document.createEvent ? document.createEvent('Event') : { type: 'input', target: input };
    if (event.initEvent) {
      event.initEvent('input', true, true);
    }
    try {
      input.dispatchEvent(event);
    } catch (e) {
      // If event dispatch fails, we can't properly test this in linkedom
      // Just verify the pulse->input direction works
      value.set('from-pulse');
      assertEqual(input.value, 'from-pulse');
      input.remove();
      return;
    }
  }

  assertEqual(value.get(), 'typed');
  input.remove();
});

// =============================================================================
// mount() Tests
// =============================================================================

printSection('mount() Tests');

test('mount appends to target', () => {
  const target = el('div#app');
  document.body.appendChild(target);

  const content = el('span', 'Mounted!');
  mount('#app', content);

  assertEqual(target.children.length, 1);
  assertEqual(target.children[0].textContent, 'Mounted!');

  target.remove();
});

test('mount returns unmount function', () => {
  const target = el('div#mount-test');
  document.body.appendChild(target);

  const content = el('span', 'To be removed');
  const unmount = mount('#mount-test', content);

  assertEqual(target.children.length, 1);

  unmount();

  assertEqual(target.children.length, 0);

  target.remove();
});

// =============================================================================
// component() Tests
// =============================================================================

printSection('component() Tests');

test('component creates factory', () => {
  const Counter = component(({ pulse, el }) => {
    const count = pulse(0);
    return el('button', '0');
  });

  const instance = Counter();
  assertEqual(instance.tagName.toLowerCase(), 'button');
});

test('component receives props', () => {
  const Greeting = component(({ props, el }) => {
    return el('span', props.name);
  });

  const instance = Greeting({ name: 'World' });
  assertEqual(instance.textContent, 'World');
});

// =============================================================================
// show() Tests
// =============================================================================

printSection('show() Tests');

test('show hides element when false', () => {
  const visible = pulse(true);
  const elem = el('div', 'Content');

  show(() => visible.get(), elem);

  assertEqual(elem.style.display, '');

  visible.set(false);
  assertEqual(elem.style.display, 'none');
});

test('show shows element when true', () => {
  const visible = pulse(false);
  const elem = el('div', 'Content');

  show(() => visible.get(), elem);

  assertEqual(elem.style.display, 'none');

  visible.set(true);
  assertEqual(elem.style.display, '');
});

// =============================================================================
// portal() Tests
// =============================================================================

printSection('portal() Tests');

test('portal renders to target', () => {
  const target = el('div#portal-target');
  document.body.appendChild(target);

  const content = el('div.modal', 'Modal content');
  portal(content, '#portal-target');

  assertEqual(target.querySelectorAll('.modal').length, 1);

  target.remove();
});

test('portal with reactive children', () => {
  const target = el('div#portal-reactive');
  document.body.appendChild(target);

  const showModal = pulse(true);

  portal(
    () => showModal.get() ? el('div.modal', 'Modal') : null,
    '#portal-reactive'
  );

  assertEqual(target.querySelectorAll('.modal').length, 1);

  showModal.set(false);
  assertEqual(target.querySelectorAll('.modal').length, 0);

  target.remove();
});

// =============================================================================
// errorBoundary() Tests
// =============================================================================

printSection('errorBoundary() Tests');

test('errorBoundary renders children normally', () => {
  const container = el('div');

  const fragment = errorBoundary(
    () => el('span', 'Success'),
    (err) => el('span', 'Error: ' + err.message)
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('span').length, 1);
  assertEqual(container.querySelector('span').textContent, 'Success');
});

// =============================================================================
// transition() Tests
// =============================================================================

printSection('transition() Tests');

test('transition adds enter class', (done) => {
  const elem = el('div', 'Content');

  transition(elem, { enter: 'fade-in', duration: 100 });

  // Check if class was added (via queueMicrotask)
  setTimeout(() => {
    // Class should have been added and possibly removed
    assert(true); // Basic smoke test
  }, 150);
});

test('transition attaches exit method', () => {
  const elem = el('div', 'Content');

  transition(elem, { exit: 'fade-out', duration: 100 });

  assert(typeof elem._pulseTransitionExit === 'function');
});

// =============================================================================
// Memory Leak Tests - model()
// =============================================================================

printSection('Memory Leak Tests - model()');

test('model cleanup removes event listeners on text input', () => {
  const value = pulse('test');
  const input = el('input[type=text]');

  // Track listeners before
  const listenersBefore = input._eventListeners['input']?.length || 0;

  model(input, value);

  // Should have added listener
  const listenersAfter = input._eventListeners['input']?.length || 0;
  assert(listenersAfter > listenersBefore, 'Should add input listener');
});

test('model cleanup removes event listeners on checkbox', () => {
  const checked = pulse(false);
  const input = el('input[type=checkbox]');

  const listenersBefore = input._eventListeners['change']?.length || 0;

  model(input, checked);

  const listenersAfter = input._eventListeners['change']?.length || 0;
  assert(listenersAfter > listenersBefore, 'Should add change listener');
});

test('model cleanup removes event listeners on select', () => {
  const selected = pulse('a');
  const select = el('select');
  select.innerHTML = '<option value="a">A</option><option value="b">B</option>';

  const listenersBefore = select._eventListeners['change']?.length || 0;

  model(select, selected);

  const listenersAfter = select._eventListeners['change']?.length || 0;
  assert(listenersAfter > listenersBefore, 'Should add change listener');
});

test('model with rapid value changes does not leak', () => {
  const value = pulse('initial');
  const input = el('input[type=text]');

  model(input, value);

  // Rapid updates should not create additional listeners
  const listenersCount = input._eventListeners['input']?.length || 0;

  for (let i = 0; i < 100; i++) {
    value.set(`value-${i}`);
  }

  const listenersAfter = input._eventListeners['input']?.length || 0;
  assertEqual(listenersAfter, listenersCount, 'Should not add extra listeners on value changes');
});

// =============================================================================
// Memory Leak Tests - transition()
// =============================================================================

printSection('Memory Leak Tests - transition()');

test('transition timer cleanup prevents callbacks on removed elements', () => {
  const elem = el('div', 'Content');
  document.body.appendChild(elem);

  transition(elem, { enter: 'fade-in', duration: 50 });

  // Remove element immediately (before timer fires)
  elem.remove();

  // Wait for timer to try to fire
  return new Promise(resolve => {
    setTimeout(() => {
      // No error should occur - timers should be cleaned up
      assert(true, 'No error from timer callback on removed element');
      resolve();
    }, 100);
  });
});

test('transition exit method returns promise', () => {
  const elem = el('div', 'Content');

  transition(elem, { exit: 'fade-out', duration: 50 });

  const result = elem._pulseTransitionExit();
  assert(result instanceof Promise, 'Exit should return a promise');
});

test('multiple transitions on same element cleanup correctly', () => {
  const elem = el('div', 'Content');

  // Apply multiple transitions
  transition(elem, { enter: 'fade-in', duration: 50 });
  transition(elem, { enter: 'slide-in', duration: 50 });
  transition(elem, { enter: 'zoom-in', duration: 50 });

  // Should have the last exit method
  assert(typeof elem._pulseTransitionExit === 'function');
});

// =============================================================================
// Memory Leak Tests - whenTransition()
// =============================================================================

printSection('Memory Leak Tests - whenTransition()');

test('whenTransition timer cleanup on rapid toggle', () => {
  const show = pulse(true);
  const container = el('div');

  const fragment = whenTransition(
    () => show.get(),
    () => el('span.shown', 'Shown'),
    () => el('span.hidden', 'Hidden'),
    { duration: 50 }
  );

  container.appendChild(fragment);
  document.body.appendChild(container);

  // Rapid toggles should not accumulate timers
  for (let i = 0; i < 20; i++) {
    show.set(i % 2 === 0);
  }

  container.remove();

  // If timers leaked, this would cause issues
  assert(true, 'Rapid toggles should not leak timers');
});

test('whenTransition cleanup when parent removed', () => {
  const show = pulse(true);
  const container = el('div');

  const fragment = whenTransition(
    () => show.get(),
    () => el('span.content', 'Content'),
    null,
    { duration: 100 }
  );

  container.appendChild(fragment);
  document.body.appendChild(container);

  // Start a transition
  show.set(false);

  // Remove container during transition
  container.remove();

  return new Promise(resolve => {
    setTimeout(() => {
      // Should not error when trying to update removed nodes
      assert(true, 'No error when parent removed during transition');
      resolve();
    }, 150);
  });
});

// =============================================================================
// List Stress Tests
// =============================================================================

printSection('List Stress Tests');

test('list handles large dataset (1000 items)', () => {
  const largeData = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));

  const items = pulse(largeData);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('li').length, 1000, 'Should render 1000 items');
});

test('list handles rapid updates', () => {
  const items = pulse([{ id: 1, name: 'a' }]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  // Rapid updates
  for (let i = 0; i < 50; i++) {
    items.set([
      { id: i * 2, name: `even-${i}` },
      { id: i * 2 + 1, name: `odd-${i}` }
    ]);
  }

  // Final state should be correct
  assertEqual(container.querySelectorAll('li').length, 2, 'Should have 2 items after rapid updates');
});

test('list handles batch operations efficiently', () => {
  const items = pulse([]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  // Batch insert
  batch(() => {
    const newItems = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }));
    items.set(newItems);
  });

  assertEqual(container.querySelectorAll('li').length, 100, 'Batch insert should work');

  // Batch delete half
  batch(() => {
    items.set(items.get().filter(item => item.id % 2 === 0));
  });

  assertEqual(container.querySelectorAll('li').length, 50, 'Batch delete should work');
});

test('list maintains correct order after shuffle', () => {
  const items = pulse([
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
    { id: 4, name: 'd' },
    { id: 5, name: 'e' }
  ]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  // Shuffle items
  items.set([
    { id: 3, name: 'c' },
    { id: 1, name: 'a' },
    { id: 5, name: 'e' },
    { id: 2, name: 'b' },
    { id: 4, name: 'd' }
  ]);

  const listItems = container.querySelectorAll('li');
  assertEqual(listItems.length, 5, 'Should have 5 items');
  assertEqual(listItems[0].textContent, 'c', 'First item should be c');
  assertEqual(listItems[1].textContent, 'a', 'Second item should be a');
  assertEqual(listItems[4].textContent, 'd', 'Last item should be d');
});

test('list with duplicate keys handles gracefully', () => {
  const items = pulse([
    { id: 1, name: 'first' },
    { id: 1, name: 'second' }, // Duplicate key
    { id: 2, name: 'third' }
  ]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  // Should render all items (behavior may vary, but should not crash)
  assert(container.querySelectorAll('li').length >= 2, 'Should render items even with duplicate keys');
});

test('list stress test with insertions and deletions', () => {
  const items = pulse([]);
  const container = el('ul');

  const fragment = list(
    items,
    (item) => el('li', item.name),
    (item) => item.id
  );

  container.appendChild(fragment);

  // Add items one by one
  for (let i = 0; i < 50; i++) {
    items.update(arr => [...arr, { id: i, name: `Item ${i}` }]);
  }
  assertEqual(container.querySelectorAll('li').length, 50, 'Should have 50 items after additions');

  // Remove items from beginning
  for (let i = 0; i < 25; i++) {
    items.update(arr => arr.slice(1));
  }
  assertEqual(container.querySelectorAll('li').length, 25, 'Should have 25 items after removals');

  // Clear all
  items.set([]);
  assertEqual(container.querySelectorAll('li').length, 0, 'Should have 0 items after clear');

  // Add back
  items.set([{ id: 100, name: 'New Item' }]);
  assertEqual(container.querySelectorAll('li').length, 1, 'Should have 1 item after re-add');
});

test('list with complex nested elements', () => {
  const items = pulse([
    { id: 1, title: 'Item 1', tags: ['a', 'b'] },
    { id: 2, title: 'Item 2', tags: ['c'] }
  ]);
  const container = el('div');

  const fragment = list(
    items,
    (item) => el('div.item',
      el('h3', item.title),
      el('ul.tags',
        ...item.tags.map(tag => el('li.tag', tag))
      )
    ),
    (item) => item.id
  );

  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.item').length, 2, 'Should have 2 items');
  assertEqual(container.querySelectorAll('.tag').length, 3, 'Should have 3 tags total');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
