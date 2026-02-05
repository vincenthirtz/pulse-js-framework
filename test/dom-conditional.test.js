/**
 * Pulse DOM Conditional Tests
 *
 * Tests for runtime/dom-conditional.js - Conditional rendering (when, match, show)
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom-conditional
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
import { when, match, show } from '../runtime/dom-conditional.js';
import { pulse } from '../runtime/pulse.js';
import { el } from '../runtime/dom.js';

import {
  test,
  assert,
  assertEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// when() Tests
// =============================================================================

printSection('when() Conditional Rendering Tests');

test('when: renders thenTemplate when condition is true', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => el('div.then', 'visible'),
    () => el('div.else', 'hidden')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.then').length, 1);
  assertEqual(container.querySelectorAll('.else').length, 0);
  assertEqual(container.querySelector('.then').textContent, 'visible');
});

test('when: renders elseTemplate when condition is false', () => {
  const condition = pulse(false);

  const fragment = when(
    () => condition.get(),
    () => el('div.then', 'visible'),
    () => el('div.else', 'hidden')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.then').length, 0);
  assertEqual(container.querySelectorAll('.else').length, 1);
  assertEqual(container.querySelector('.else').textContent, 'hidden');
});

test('when: switches between templates reactively', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => el('div.then', 'then'),
    () => el('div.else', 'else')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Initially true
  assertEqual(container.querySelectorAll('.then').length, 1);
  assertEqual(container.querySelectorAll('.else').length, 0);

  // Switch to false
  condition.set(false);

  assertEqual(container.querySelectorAll('.then').length, 0);
  assertEqual(container.querySelectorAll('.else').length, 1);

  // Switch back to true
  condition.set(true);

  assertEqual(container.querySelectorAll('.then').length, 1);
  assertEqual(container.querySelectorAll('.else').length, 0);
});

test('when: works without elseTemplate', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => el('div.content', 'visible')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.content').length, 1);

  // Switch to false - should render nothing
  condition.set(false);

  assertEqual(container.querySelectorAll('.content').length, 0);
});

test('when: accepts Pulse directly instead of function', () => {
  const condition = pulse(true);

  const fragment = when(
    condition,
    () => el('span', 'yes'),
    () => el('span', 'no')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelector('span').textContent, 'yes');

  condition.set(false);
  assertEqual(container.querySelector('span').textContent, 'no');
});

test('when: accepts static nodes as templates', () => {
  const condition = pulse(true);
  const thenNode = el('div.static-then', 'static');
  const elseNode = el('div.static-else', 'else');

  const fragment = when(
    () => condition.get(),
    thenNode,
    elseNode
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.static-then').length, 1);
});

test('when: cleans up old nodes properly', () => {
  const condition = pulse(true);
  let thenCount = 0;
  let elseCount = 0;

  const fragment = when(
    () => condition.get(),
    () => {
      thenCount++;
      return el('div.then');
    },
    () => {
      elseCount++;
      return el('div.else');
    }
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Initial render
  assertEqual(thenCount, 1);
  assertEqual(elseCount, 0);

  // Switch - should create else, remove then
  condition.set(false);
  assertEqual(thenCount, 1);
  assertEqual(elseCount, 1);
  assertEqual(container.querySelectorAll('.then').length, 0);
  assertEqual(container.querySelectorAll('.else').length, 1);

  // Switch back
  condition.set(true);
  assertEqual(thenCount, 2);
  assertEqual(container.querySelectorAll('.then').length, 1);
  assertEqual(container.querySelectorAll('.else').length, 0);
});

test('when: handles truthy/falsy values', () => {
  const value = pulse(1);

  const fragment = when(
    () => value.get(),
    () => el('div.truthy', 'truthy'),
    () => el('div.falsy', 'falsy')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('.truthy').length, 1);

  value.set(0); // falsy
  assertEqual(container.querySelectorAll('.falsy').length, 1);

  value.set(''); // falsy
  assertEqual(container.querySelectorAll('.falsy').length, 1);

  value.set('hello'); // truthy
  assertEqual(container.querySelectorAll('.truthy').length, 1);

  value.set(null); // falsy
  assertEqual(container.querySelectorAll('.falsy').length, 1);
});

test('when: template can return array of nodes', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => [el('span', 'a'), el('span', 'b'), el('span', 'c')]
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  assertEqual(container.querySelectorAll('span').length, 3);

  condition.set(false);
  assertEqual(container.querySelectorAll('span').length, 0);
});

// =============================================================================
// match() Tests
// Note: match() returns a Comment marker, not a DocumentFragment like when().
// The initial render happens before the marker has a parent, so nodes are
// only inserted on subsequent reactive updates.
// =============================================================================

printSection('match() Switch Rendering Tests');

test('match: switches between cases reactively', () => {
  const status = pulse('initial');

  const marker = match(
    () => status.get(),
    {
      loading: () => el('div.loading'),
      success: () => el('div.success'),
      error: () => el('div.error')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger first render after marker is mounted
  status.set('loading');
  assertEqual(container.querySelectorAll('.loading').length, 1);

  status.set('success');
  assertEqual(container.querySelectorAll('.loading').length, 0);
  assertEqual(container.querySelectorAll('.success').length, 1);

  status.set('error');
  assertEqual(container.querySelectorAll('.success').length, 0);
  assertEqual(container.querySelectorAll('.error').length, 1);
});

test('match: uses default case when no match', () => {
  const status = pulse('initial');

  const marker = match(
    () => status.get(),
    {
      loading: () => el('div.loading'),
      success: () => el('div.success'),
      default: () => el('div.default', 'Unknown status')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger update after marker is mounted
  status.set('unknown');

  assertEqual(container.querySelectorAll('.default').length, 1);
  assertEqual(container.querySelector('.default').textContent, 'Unknown status');
});

test('match: renders nothing when no match and no default', () => {
  const status = pulse('initial');

  const marker = match(
    () => status.get(),
    {
      loading: () => el('span.loading'),
      success: () => el('span.success')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger first render with a matching value
  status.set('loading');
  assertEqual(container.querySelectorAll('.loading').length, 1);

  // Switch to unmatched value - should remove existing and render nothing
  status.set('unknown');
  assertEqual(container.querySelectorAll('span').length, 0);
});

test('match: accepts Pulse directly', () => {
  const value = pulse('initial');

  const marker = match(
    value,
    {
      a: () => el('span', 'A'),
      b: () => el('span', 'B')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger update after marker is mounted
  value.set('a');
  assertEqual(container.querySelector('span').textContent, 'A');

  value.set('b');
  assertEqual(container.querySelector('span').textContent, 'B');
});

test('match: handles string keys matching values', () => {
  const code = pulse('initial');

  const marker = match(
    () => code.get(),
    {
      '200': () => el('span.code-200', 'OK'),
      '404': () => el('span.code-404', 'Not Found'),
      '500': () => el('span.code-500', 'Server Error')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger update after marker is mounted
  code.set('200');
  assertEqual(container.querySelector('.code-200').textContent, 'OK');

  code.set('404');
  assertEqual(container.querySelector('.code-404').textContent, 'Not Found');
});

test('match: cleans up old nodes on switch', () => {
  const tab = pulse('initial');
  let homeCreated = 0;
  let aboutCreated = 0;

  const marker = match(
    () => tab.get(),
    {
      home: () => {
        homeCreated++;
        return el('div.home');
      },
      about: () => {
        aboutCreated++;
        return el('div.about');
      }
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger first render after marker is mounted
  tab.set('home');
  assertEqual(homeCreated, 1);
  assertEqual(aboutCreated, 0);
  assertEqual(container.querySelectorAll('.home').length, 1);

  tab.set('about');
  assertEqual(homeCreated, 1);
  assertEqual(aboutCreated, 1);
  assertEqual(container.querySelectorAll('.home').length, 0);
  assertEqual(container.querySelectorAll('.about').length, 1);
});

test('match: case can return array of nodes', () => {
  const mode = pulse('initial');

  const marker = match(
    () => mode.get(),
    {
      single: () => el('span', 'single'),
      multi: () => [el('span', 'one'), el('span', 'two'), el('span', 'three')]
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  // Trigger update after marker is mounted
  mode.set('multi');

  assertEqual(container.querySelectorAll('span').length, 3);
});

// =============================================================================
// show() Tests
// =============================================================================

printSection('show() Visibility Toggle Tests');

test('show: shows element when condition is true', () => {
  const visible = pulse(true);
  const element = el('div.content', 'Hello');

  show(() => visible.get(), element);

  assertEqual(element.style.display, '');
});

test('show: hides element when condition is false', () => {
  const visible = pulse(false);
  const element = el('div.content', 'Hello');

  show(() => visible.get(), element);

  assertEqual(element.style.display, 'none');
});

test('show: toggles visibility reactively', () => {
  const visible = pulse(true);
  const element = el('div.content', 'Hello');

  show(() => visible.get(), element);

  assertEqual(element.style.display, '');

  visible.set(false);
  assertEqual(element.style.display, 'none');

  visible.set(true);
  assertEqual(element.style.display, '');
});

test('show: returns the element for chaining', () => {
  const visible = pulse(true);
  const element = el('div');

  const result = show(() => visible.get(), element);

  assertEqual(result, element);
});

test('show: accepts Pulse directly', () => {
  const visible = pulse(true);
  const element = el('div');

  show(visible, element);

  assertEqual(element.style.display, '');

  visible.set(false);
  assertEqual(element.style.display, 'none');
});

test('show: handles truthy/falsy values', () => {
  const value = pulse(1);
  const element = el('div');

  show(() => value.get(), element);

  assertEqual(element.style.display, ''); // 1 is truthy

  value.set(0); // falsy
  assertEqual(element.style.display, 'none');

  value.set('text'); // truthy
  assertEqual(element.style.display, '');

  value.set(''); // falsy
  assertEqual(element.style.display, 'none');

  value.set([]); // truthy (empty array is truthy in JS)
  assertEqual(element.style.display, '');

  value.set(null); // falsy
  assertEqual(element.style.display, 'none');
});

test('show: element stays in DOM (unlike when)', () => {
  const visible = pulse(true);
  const element = el('div.persistent');

  const container = document.createElement('div');
  container.appendChild(element);

  show(() => visible.get(), element);

  // Element should always be in DOM
  assertEqual(container.contains(element), true);

  visible.set(false);
  assertEqual(container.contains(element), true); // Still in DOM, just hidden

  visible.set(true);
  assertEqual(container.contains(element), true);
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('Conditional Rendering Edge Cases');

test('when: handles rapid toggles', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => el('div.on'),
    () => el('div.off')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Rapid toggles
  condition.set(false);
  condition.set(true);
  condition.set(false);
  condition.set(true);
  condition.set(false);

  assertEqual(container.querySelectorAll('.on').length, 0);
  assertEqual(container.querySelectorAll('.off').length, 1);
});

test('match: handles rapid value changes', () => {
  const value = pulse('initial');

  const marker = match(
    () => value.get(),
    {
      a: () => el('div.a'),
      b: () => el('div.b'),
      c: () => el('div.c')
    }
  );

  const container = document.createElement('div');
  container.appendChild(marker);

  value.set('a');
  value.set('b');
  value.set('c');
  value.set('a');
  value.set('b');

  assertEqual(container.querySelectorAll('.b').length, 1);
  assertEqual(container.querySelectorAll('.a').length, 0);
  assertEqual(container.querySelectorAll('.c').length, 0);
});

test('when: works with empty template returning null', () => {
  const condition = pulse(true);

  const fragment = when(
    () => condition.get(),
    () => null, // Returns null
    () => el('span.else', 'else content')
  );

  const container = document.createElement('div');
  container.appendChild(fragment);

  // Null template should render nothing (only marker comment)
  assertEqual(container.querySelectorAll('span').length, 0);

  condition.set(false);
  assertEqual(container.querySelectorAll('.else').length, 1);
});

// =============================================================================
// Print Results
// =============================================================================

printResults();
exitWithCode();
