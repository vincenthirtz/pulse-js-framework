/**
 * Pulse SSR Hydrator Tests
 *
 * Tests for runtime/ssr-hydrator.js - Client-side hydration utilities
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/ssr-hydrator
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
import {
  createHydrationContext,
  setHydrationMode,
  isHydratingMode,
  getHydrationContext,
  getCurrentNode,
  advanceCursor,
  enterChild,
  exitChild,
  skipComments,
  matchesElement,
  warnMismatch,
  registerListener,
  registerCleanup,
  disposeHydration,
  findNextElement,
  countRemaining,
  isHydrationComplete
} from '../runtime/ssr-hydrator.js';

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
// Helper Functions
// =============================================================================

/**
 * Create a simple DOM tree for testing
 */
function createTestDOM() {
  const root = document.createElement('div');
  root.innerHTML = `
    <header id="header">
      <nav class="nav">
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>
    <main>
      <h1>Title</h1>
      <p>Content</p>
    </main>
    <footer>Footer</footer>
  `.trim();
  return root;
}

// =============================================================================
// Hydration Context Tests
// =============================================================================

printSection('createHydrationContext Tests');

test('createHydrationContext: creates context with root element', () => {
  const root = document.createElement('div');
  const child = document.createElement('span');
  root.appendChild(child);

  const ctx = createHydrationContext(root);

  assertEqual(ctx.root, root);
  assertEqual(ctx.cursor, child); // First child
  assertDeepEqual(ctx.cleanups, []);
  assertDeepEqual(ctx.listeners, []);
  assertEqual(ctx.depth, 0);
  assertEqual(ctx.mismatchWarned, false);
});

test('createHydrationContext: cursor is null for empty root', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  assertEqual(ctx.cursor, null);
});

// =============================================================================
// Hydration Mode Control Tests
// =============================================================================

printSection('Hydration Mode Control Tests');

test('setHydrationMode: enables hydration mode', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  setHydrationMode(true, ctx);

  assertEqual(isHydratingMode(), true);
  assertEqual(getHydrationContext(), ctx);
});

test('setHydrationMode: disables hydration mode', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  setHydrationMode(true, ctx);
  setHydrationMode(false);

  assertEqual(isHydratingMode(), false);
  assertEqual(getHydrationContext(), null);
});

test('isHydratingMode: returns correct state', () => {
  // Clean state
  setHydrationMode(false);
  assertEqual(isHydratingMode(), false);

  const root = document.createElement('div');
  const ctx = createHydrationContext(root);
  setHydrationMode(true, ctx);
  assertEqual(isHydratingMode(), true);

  // Cleanup
  setHydrationMode(false);
});

// =============================================================================
// DOM Cursor Navigation Tests
// =============================================================================

printSection('DOM Cursor Navigation Tests');

test('getCurrentNode: returns current cursor position', () => {
  const root = document.createElement('div');
  const child1 = document.createElement('span');
  const child2 = document.createElement('p');
  root.appendChild(child1);
  root.appendChild(child2);

  const ctx = createHydrationContext(root);

  assertEqual(getCurrentNode(ctx), child1);
});

test('advanceCursor: moves to next sibling', () => {
  const root = document.createElement('div');
  const child1 = document.createElement('span');
  const child2 = document.createElement('p');
  const child3 = document.createElement('a');
  root.appendChild(child1);
  root.appendChild(child2);
  root.appendChild(child3);

  const ctx = createHydrationContext(root);

  assertEqual(getCurrentNode(ctx), child1);

  advanceCursor(ctx);
  assertEqual(getCurrentNode(ctx), child2);

  advanceCursor(ctx);
  assertEqual(getCurrentNode(ctx), child3);

  advanceCursor(ctx);
  assertEqual(getCurrentNode(ctx), null);
});

test('advanceCursor: handles null cursor gracefully', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  assertEqual(ctx.cursor, null);

  // Should not throw
  advanceCursor(ctx);
  assertEqual(ctx.cursor, null);
});

test('enterChild: moves cursor into child element', () => {
  const root = document.createElement('div');
  const parent = document.createElement('div');
  const child = document.createElement('span');
  parent.appendChild(child);
  root.appendChild(parent);

  const ctx = createHydrationContext(root);

  assertEqual(getCurrentNode(ctx), parent);
  assertEqual(ctx.depth, 0);

  enterChild(ctx, parent);

  assertEqual(getCurrentNode(ctx), child);
  assertEqual(ctx.depth, 1);
});

test('exitChild: restores cursor to parent level', () => {
  const root = document.createElement('div');
  const parent = document.createElement('div');
  const child = document.createElement('span');
  const sibling = document.createElement('p');
  parent.appendChild(child);
  root.appendChild(parent);
  root.appendChild(sibling);

  const ctx = createHydrationContext(root);

  // Enter parent
  enterChild(ctx, parent);
  assertEqual(ctx.depth, 1);

  // Exit parent - should move to sibling
  exitChild(ctx, parent);
  assertEqual(ctx.depth, 0);
  assertEqual(getCurrentNode(ctx), sibling);
});

test('skipComments: skips comment nodes', () => {
  const root = document.createElement('div');
  const comment1 = document.createComment('comment 1');
  const comment2 = document.createComment('comment 2');
  const element = document.createElement('span');
  root.appendChild(comment1);
  root.appendChild(comment2);
  root.appendChild(element);

  const ctx = createHydrationContext(root);

  assertEqual(ctx.cursor.nodeType, 8); // Comment

  skipComments(ctx);

  assertEqual(ctx.cursor, element);
  assertEqual(ctx.cursor.nodeType, 1); // Element
});

test('skipComments: does nothing if cursor is not on comment', () => {
  const root = document.createElement('div');
  const element = document.createElement('span');
  root.appendChild(element);

  const ctx = createHydrationContext(root);

  skipComments(ctx);

  assertEqual(ctx.cursor, element);
});

// =============================================================================
// DOM Matching Tests
// =============================================================================

printSection('DOM Matching Tests');

test('matchesElement: matches correct tag', () => {
  const div = document.createElement('div');

  assertEqual(matchesElement(div, 'div'), true);
  assertEqual(matchesElement(div, 'span'), false);
});

test('matchesElement: matches tag with id', () => {
  const div = document.createElement('div');
  div.id = 'main';

  assertEqual(matchesElement(div, 'div', 'main'), true);
  assertEqual(matchesElement(div, 'div', 'other'), false);
});

test('matchesElement: matches tag with class', () => {
  const div = document.createElement('div');
  div.classList.add('container');
  div.classList.add('active');

  assertEqual(matchesElement(div, 'div', undefined, 'container'), true);
  assertEqual(matchesElement(div, 'div', undefined, 'active'), true);
  assertEqual(matchesElement(div, 'div', undefined, 'missing'), false);
});

test('matchesElement: returns false for non-element nodes', () => {
  const text = document.createTextNode('hello');
  const comment = document.createComment('comment');

  assertEqual(matchesElement(text, 'div'), false);
  assertEqual(matchesElement(comment, 'div'), false);
  assertEqual(matchesElement(null, 'div'), false);
});

test('matchesElement: case insensitive tag matching', () => {
  const div = document.createElement('DIV');

  assertEqual(matchesElement(div, 'div'), true);
});

// =============================================================================
// Mismatch Warning Tests
// =============================================================================

printSection('Mismatch Warning Tests');

test('warnMismatch: sets mismatchWarned flag', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  assertEqual(ctx.mismatchWarned, false);

  // Capture console.warn
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };

  warnMismatch(ctx, '<div>', null);

  console.warn = originalWarn;

  assertEqual(ctx.mismatchWarned, true);
  assertEqual(warned, true);
});

test('warnMismatch: only warns once', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  const originalWarn = console.warn;
  let warnCount = 0;
  console.warn = () => { warnCount++; };

  warnMismatch(ctx, '<div>', null);
  warnMismatch(ctx, '<span>', null);
  warnMismatch(ctx, '<p>', null);

  console.warn = originalWarn;

  assertEqual(warnCount, 1);
});

// =============================================================================
// Event Listener Management Tests
// =============================================================================

printSection('Event Listener Management Tests');

test('registerListener: attaches event listener', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  const button = document.createElement('button');
  let clicked = false;
  const handler = () => { clicked = true; };

  registerListener(ctx, button, 'click', handler);

  assertEqual(ctx.listeners.length, 1);
  assertEqual(ctx.listeners[0].element, button);
  assertEqual(ctx.listeners[0].event, 'click');
  assertEqual(ctx.listeners[0].handler, handler);

  // Simulate click
  button.dispatchEvent(new Event('click'));
  assertEqual(clicked, true);
});

test('registerListener: stores multiple listeners', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  const input = document.createElement('input');
  const handler1 = () => {};
  const handler2 = () => {};

  registerListener(ctx, input, 'input', handler1);
  registerListener(ctx, input, 'focus', handler2);

  assertEqual(ctx.listeners.length, 2);
});

test('registerCleanup: stores cleanup function', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  const cleanup1 = () => {};
  const cleanup2 = () => {};

  registerCleanup(ctx, cleanup1);
  registerCleanup(ctx, cleanup2);

  assertEqual(ctx.cleanups.length, 2);
  assertEqual(ctx.cleanups[0], cleanup1);
  assertEqual(ctx.cleanups[1], cleanup2);
});

// =============================================================================
// Hydration Disposal Tests
// =============================================================================

printSection('Hydration Disposal Tests');

test('disposeHydration: removes event listeners', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  const button = document.createElement('button');
  let clickCount = 0;
  const handler = () => { clickCount++; };

  registerListener(ctx, button, 'click', handler);

  // Verify listener works
  button.dispatchEvent(new Event('click'));
  assertEqual(clickCount, 1);

  // Dispose
  disposeHydration(ctx);

  // Listener should be removed
  button.dispatchEvent(new Event('click'));
  assertEqual(clickCount, 1); // Still 1, not incremented

  assertEqual(ctx.listeners.length, 0);
});

test('disposeHydration: runs cleanup functions', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  let cleanup1Called = false;
  let cleanup2Called = false;

  registerCleanup(ctx, () => { cleanup1Called = true; });
  registerCleanup(ctx, () => { cleanup2Called = true; });

  disposeHydration(ctx);

  assertEqual(cleanup1Called, true);
  assertEqual(cleanup2Called, true);
  assertEqual(ctx.cleanups.length, 0);
});

test('disposeHydration: handles cleanup errors gracefully', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  let goodCleanupCalled = false;

  registerCleanup(ctx, () => { throw new Error('Intentional error'); });
  registerCleanup(ctx, () => { goodCleanupCalled = true; });

  // Capture console.error
  const originalError = console.error;
  let errorLogged = false;
  console.error = () => { errorLogged = true; };

  // Should not throw
  disposeHydration(ctx);

  console.error = originalError;

  // All cleanups should have been attempted
  assertEqual(goodCleanupCalled, true);
  assertEqual(errorLogged, true);
});

// =============================================================================
// Hydration Helper Tests
// =============================================================================

printSection('Hydration Helper Tests');

test('findNextElement: finds element by tag', () => {
  const root = document.createElement('div');
  const span = document.createElement('span');
  const p = document.createElement('p');
  const div = document.createElement('div');
  root.appendChild(span);
  root.appendChild(p);
  root.appendChild(div);

  const ctx = createHydrationContext(root);

  const found = findNextElement(ctx, 'p');

  assertEqual(found, p);
});

test('findNextElement: returns null if not found', () => {
  const root = document.createElement('div');
  const span = document.createElement('span');
  root.appendChild(span);

  const ctx = createHydrationContext(root);

  const found = findNextElement(ctx, 'article');

  assertEqual(found, null);
});

test('findNextElement: skips non-element nodes', () => {
  const root = document.createElement('div');
  const text = document.createTextNode('text');
  const comment = document.createComment('comment');
  const span = document.createElement('span');
  root.appendChild(text);
  root.appendChild(comment);
  root.appendChild(span);

  const ctx = createHydrationContext(root);

  const found = findNextElement(ctx, 'span');

  assertEqual(found, span);
});

test('countRemaining: counts remaining elements', () => {
  const root = document.createElement('div');
  root.appendChild(document.createElement('span'));
  root.appendChild(document.createTextNode('text'));
  root.appendChild(document.createElement('p'));
  root.appendChild(document.createComment('comment'));
  root.appendChild(document.createElement('div'));

  const ctx = createHydrationContext(root);

  // Should count 3 elements (span, p, div)
  assertEqual(countRemaining(ctx), 3);

  advanceCursor(ctx); // skip span
  assertEqual(countRemaining(ctx), 2);
});

test('countRemaining: returns 0 for empty scope', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  assertEqual(countRemaining(ctx), 0);
});

test('isHydrationComplete: returns true when cursor is null at depth 0', () => {
  const root = document.createElement('div');
  const ctx = createHydrationContext(root);

  // Empty root - cursor is null, depth is 0
  assertEqual(isHydrationComplete(ctx), true);
});

test('isHydrationComplete: returns false when cursor is not null', () => {
  const root = document.createElement('div');
  root.appendChild(document.createElement('span'));

  const ctx = createHydrationContext(root);

  assertEqual(isHydrationComplete(ctx), false);
});

test('isHydrationComplete: returns false when depth > 0', () => {
  const root = document.createElement('div');
  const parent = document.createElement('div');
  root.appendChild(parent);

  const ctx = createHydrationContext(root);
  enterChild(ctx, parent);

  // Even though cursor might be null, depth is 1
  assertEqual(ctx.depth, 1);
  assertEqual(isHydrationComplete(ctx), false);
});

// =============================================================================
// Integration Tests
// =============================================================================

printSection('SSR Hydrator Integration Tests');

test('integration: full hydration workflow', () => {
  // Simulate server-rendered HTML
  const root = document.createElement('div');
  root.innerHTML = `
    <button id="btn">Click me</button>
    <span class="counter">0</span>
  `.trim();

  // Create hydration context
  const ctx = createHydrationContext(root);

  // Enable hydration mode
  setHydrationMode(true, ctx);
  assertEqual(isHydratingMode(), true);

  // Find and hydrate button
  skipComments(ctx);
  const button = getCurrentNode(ctx);
  assertEqual(matchesElement(button, 'button', 'btn'), true);

  let counter = 0;
  registerListener(ctx, button, 'click', () => { counter++; });

  advanceCursor(ctx);

  // Find counter span
  skipComments(ctx);
  const span = getCurrentNode(ctx);
  assertEqual(matchesElement(span, 'span', undefined, 'counter'), true);

  advanceCursor(ctx);

  // Hydration complete
  assertEqual(ctx.cursor, null);

  // Disable hydration mode
  setHydrationMode(false);
  assertEqual(isHydratingMode(), false);

  // Test hydrated elements work
  button.dispatchEvent(new Event('click'));
  assertEqual(counter, 1);

  // Cleanup
  disposeHydration(ctx);
  button.dispatchEvent(new Event('click'));
  assertEqual(counter, 1); // Should still be 1
});

test('integration: nested element hydration', () => {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="wrapper">
      <header>
        <h1>Title</h1>
      </header>
      <main>
        <p>Content</p>
      </main>
    </div>
  `.trim();

  const ctx = createHydrationContext(root);

  // Find wrapper
  skipComments(ctx);
  const wrapper = getCurrentNode(ctx);
  assertEqual(matchesElement(wrapper, 'div', undefined, 'wrapper'), true);

  // Enter wrapper
  enterChild(ctx, wrapper);
  assertEqual(ctx.depth, 1);

  // Find header
  skipComments(ctx);
  const header = getCurrentNode(ctx);
  assertEqual(matchesElement(header, 'header'), true);

  // Enter header
  enterChild(ctx, header);
  assertEqual(ctx.depth, 2);

  // Find h1
  skipComments(ctx);
  const h1 = getCurrentNode(ctx);
  assertEqual(matchesElement(h1, 'h1'), true);

  // Exit header
  exitChild(ctx, header);
  assertEqual(ctx.depth, 1);

  // Should be at main now
  skipComments(ctx);
  const main = getCurrentNode(ctx);
  assertEqual(matchesElement(main, 'main'), true);

  // Exit wrapper
  exitChild(ctx, wrapper);
  assertEqual(ctx.depth, 0);
  assertEqual(ctx.cursor, null);
});

// =============================================================================
// Print Results
// =============================================================================

printResults();
exitWithCode();
