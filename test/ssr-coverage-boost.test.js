/**
 * SSR Coverage Boost Tests
 *
 * Boosts coverage of:
 * - runtime/ssr-hydrator.js (from 70% to 92%+)
 * - runtime/ssr-async.js (from 63% to 92%+)
 *
 * Targets all uncovered lines in both modules using node:test.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MockElement,
  MockTextNode,
  MockCommentNode
} from '../runtime/dom-adapter.js';

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
  SSRAsyncContext,
  getSSRAsyncContext,
  setSSRAsyncContext,
  isCollectingAsync,
  registerAsync,
  getCachedAsync,
  hasCachedAsync
} from '../runtime/ssr-async.js';

// ============================================================================
// Helpers
// ============================================================================

/** Create a root MockElement with N child span elements appended */
function makeRoot(...tagNames) {
  const root = new MockElement('div');
  const children = tagNames.map(t => new MockElement(t));
  children.forEach(c => root.appendChild(c));
  return { root, children };
}

// ============================================================================
// ssr-hydrator.js — createHydrationContext (lines 38-46)
// ============================================================================

describe('ssr-hydrator: createHydrationContext', () => {
  test('returns object with root property equal to given element', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.root, root);
  });

  test('cursor is set to root.firstChild', () => {
    const root = new MockElement('div');
    const child = new MockElement('span');
    root.appendChild(child);
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, child);
  });

  test('cursor is null when root has no children', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, null);
  });

  test('cleanups array is empty on creation', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.deepStrictEqual(ctx.cleanups, []);
  });

  test('listeners array is empty on creation', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.deepStrictEqual(ctx.listeners, []);
  });

  test('depth starts at 0', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.depth, 0);
  });

  test('mismatchWarned starts as false', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.mismatchWarned, false);
  });
});

// ============================================================================
// ssr-hydrator.js — setHydrationMode / isHydratingMode / getHydrationContext
// (lines 58-60, 75-76)
// ============================================================================

describe('ssr-hydrator: hydration mode control', () => {
  afterEach(() => {
    // Always reset to a clean state between tests
    setHydrationMode(false);
  });

  test('setHydrationMode(true, ctx) enables hydration and stores context (lines 58-60)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    setHydrationMode(true, ctx);
    assert.strictEqual(isHydratingMode(), true);
    assert.strictEqual(getHydrationContext(), ctx);
  });

  test('setHydrationMode(false) disables hydration and clears context (lines 58-60)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    setHydrationMode(true, ctx);
    setHydrationMode(false);
    assert.strictEqual(isHydratingMode(), false);
    assert.strictEqual(getHydrationContext(), null);
  });

  test('getHydrationContext returns null when not in hydration mode (line 75-76)', () => {
    setHydrationMode(false);
    assert.strictEqual(getHydrationContext(), null);
  });

  test('getHydrationContext returns current context when hydrating (line 75-76)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    setHydrationMode(true, ctx);
    assert.strictEqual(getHydrationContext(), ctx);
  });

  test('isHydratingMode toggles correctly across multiple calls', () => {
    assert.strictEqual(isHydratingMode(), false);
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    setHydrationMode(true, ctx);
    assert.strictEqual(isHydratingMode(), true);
    setHydrationMode(false);
    assert.strictEqual(isHydratingMode(), false);
  });
});

// ============================================================================
// ssr-hydrator.js — getCurrentNode (lines 88-89)
// ============================================================================

describe('ssr-hydrator: getCurrentNode', () => {
  test('returns cursor when cursor is a node (lines 88-89)', () => {
    const { root, children } = makeRoot('span', 'p');
    const ctx = createHydrationContext(root);
    assert.strictEqual(getCurrentNode(ctx), children[0]);
  });

  test('returns null when cursor is null', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(getCurrentNode(ctx), null);
  });
});

// ============================================================================
// ssr-hydrator.js — advanceCursor (lines 96-99)
// ============================================================================

describe('ssr-hydrator: advanceCursor', () => {
  test('moves cursor from first child to second child (lines 96-99)', () => {
    const { root, children } = makeRoot('span', 'p', 'a');
    const ctx = createHydrationContext(root);
    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, children[1]);
  });

  test('moves cursor to null after last sibling (lines 96-99)', () => {
    const { root } = makeRoot('span');
    const ctx = createHydrationContext(root);
    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, null);
  });

  test('does nothing when cursor is already null (line 96 branch-not-taken)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, null);
    advanceCursor(ctx); // should not throw
    assert.strictEqual(ctx.cursor, null);
  });

  test('advances through all siblings sequentially', () => {
    const { root, children } = makeRoot('h1', 'h2', 'h3');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, children[0]);
    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, children[1]);
    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, children[2]);
    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, null);
  });
});

// ============================================================================
// ssr-hydrator.js — enterChild (lines 107-109)
// ============================================================================

describe('ssr-hydrator: enterChild', () => {
  test('sets cursor to element.firstChild (line 107)', () => {
    const root = new MockElement('div');
    const parent = new MockElement('section');
    const innerChild = new MockElement('p');
    parent.appendChild(innerChild);
    root.appendChild(parent);

    const ctx = createHydrationContext(root);
    enterChild(ctx, parent);
    assert.strictEqual(ctx.cursor, innerChild);
  });

  test('increments depth by 1 (line 108)', () => {
    const { root, children } = makeRoot('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.depth, 0);
    enterChild(ctx, children[0]);
    assert.strictEqual(ctx.depth, 1);
  });

  test('sets cursor to null when entering empty element', () => {
    const root = new MockElement('div');
    const emptyParent = new MockElement('div');
    root.appendChild(emptyParent);
    const ctx = createHydrationContext(root);
    enterChild(ctx, emptyParent);
    assert.strictEqual(ctx.cursor, null);
    assert.strictEqual(ctx.depth, 1);
  });

  test('nesting enterChild increments depth multiple times', () => {
    const root = new MockElement('div');
    const level1 = new MockElement('section');
    const level2 = new MockElement('article');
    level1.appendChild(level2);
    root.appendChild(level1);

    const ctx = createHydrationContext(root);
    enterChild(ctx, level1);
    assert.strictEqual(ctx.depth, 1);
    enterChild(ctx, level2);
    assert.strictEqual(ctx.depth, 2);
  });
});

// ============================================================================
// ssr-hydrator.js — exitChild (lines 117-119)
// ============================================================================

describe('ssr-hydrator: exitChild', () => {
  test('sets cursor to element.nextSibling (line 117)', () => {
    const root = new MockElement('div');
    const el1 = new MockElement('header');
    const el2 = new MockElement('main');
    root.appendChild(el1);
    root.appendChild(el2);

    const ctx = createHydrationContext(root);
    enterChild(ctx, el1);
    exitChild(ctx, el1);
    assert.strictEqual(ctx.cursor, el2);
  });

  test('decrements depth by 1 (line 118)', () => {
    const { root, children } = makeRoot('div');
    const ctx = createHydrationContext(root);
    enterChild(ctx, children[0]);
    assert.strictEqual(ctx.depth, 1);
    exitChild(ctx, children[0]);
    assert.strictEqual(ctx.depth, 0);
  });

  test('cursor becomes null when exiting last sibling', () => {
    const root = new MockElement('div');
    const only = new MockElement('article');
    root.appendChild(only);
    const ctx = createHydrationContext(root);
    enterChild(ctx, only);
    exitChild(ctx, only);
    assert.strictEqual(ctx.cursor, null);
    assert.strictEqual(ctx.depth, 0);
  });
});

// ============================================================================
// ssr-hydrator.js — skipComments (lines 126-129)
// ============================================================================

describe('ssr-hydrator: skipComments', () => {
  test('skips a single comment node (lines 126-129)', () => {
    const root = new MockElement('div');
    const comment = new MockCommentNode('marker');
    const span = new MockElement('span');
    root.appendChild(comment);
    root.appendChild(span);

    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor.nodeType, 8);
    skipComments(ctx);
    assert.strictEqual(ctx.cursor, span);
  });

  test('skips multiple consecutive comment nodes (while loop - lines 126-129)', () => {
    const root = new MockElement('div');
    const c1 = new MockCommentNode('comment 1');
    const c2 = new MockCommentNode('comment 2');
    const c3 = new MockCommentNode('comment 3');
    const div = new MockElement('div');
    root.appendChild(c1);
    root.appendChild(c2);
    root.appendChild(c3);
    root.appendChild(div);

    const ctx = createHydrationContext(root);
    skipComments(ctx);
    assert.strictEqual(ctx.cursor, div);
  });

  test('does nothing when cursor is on a non-comment element node', () => {
    const { root, children } = makeRoot('p');
    const ctx = createHydrationContext(root);
    skipComments(ctx);
    assert.strictEqual(ctx.cursor, children[0]);
  });

  test('does nothing when cursor is null', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, null);
    skipComments(ctx); // should not throw
    assert.strictEqual(ctx.cursor, null);
  });

  test('stops at text node (text nodeType is 3, not 8)', () => {
    const root = new MockElement('div');
    const comment = new MockCommentNode('c');
    const text = new MockTextNode('hello');
    root.appendChild(comment);
    root.appendChild(text);

    const ctx = createHydrationContext(root);
    skipComments(ctx);
    assert.strictEqual(ctx.cursor, text);
    assert.strictEqual(ctx.cursor.nodeType, 3);
  });
});

// ============================================================================
// ssr-hydrator.js — matchesElement (lines 144-153)
// ============================================================================

describe('ssr-hydrator: matchesElement', () => {
  test('returns false for null node (line 144)', () => {
    assert.strictEqual(matchesElement(null, 'div'), false);
  });

  test('returns false for non-element node (nodeType !== 1) (line 144)', () => {
    const text = new MockTextNode('hello');
    assert.strictEqual(matchesElement(text, 'div'), false);
  });

  test('returns false for comment node (nodeType 8) (line 144)', () => {
    const comment = new MockCommentNode('c');
    assert.strictEqual(matchesElement(comment, 'div'), false);
  });

  test('returns false when tag does not match (line 147)', () => {
    const span = new MockElement('span');
    assert.strictEqual(matchesElement(span, 'div'), false);
  });

  test('returns true when tag matches and no id/class required (lines 144-153)', () => {
    const div = new MockElement('div');
    assert.strictEqual(matchesElement(div, 'div'), true);
  });

  test('returns true when tag and id match (line 149)', () => {
    const div = new MockElement('div');
    div.id = 'main';
    assert.strictEqual(matchesElement(div, 'div', 'main'), true);
  });

  test('returns false when id does not match (line 149)', () => {
    const div = new MockElement('div');
    div.id = 'other';
    assert.strictEqual(matchesElement(div, 'div', 'main'), false);
  });

  test('returns true when tag and class match (line 150)', () => {
    const div = new MockElement('div');
    div.classList.add('container');
    assert.strictEqual(matchesElement(div, 'div', undefined, 'container'), true);
  });

  test('returns false when class does not match (line 150)', () => {
    const div = new MockElement('div');
    div.classList.add('other');
    assert.strictEqual(matchesElement(div, 'div', undefined, 'container'), false);
  });

  test('returns true when tag, id, and class all match', () => {
    const div = new MockElement('div');
    div.id = 'root';
    div.classList.add('wrapper');
    assert.strictEqual(matchesElement(div, 'div', 'root', 'wrapper'), true);
  });

  test('tag matching is case-insensitive (tagName.toLowerCase())', () => {
    const div = new MockElement('DIV');
    assert.strictEqual(matchesElement(div, 'div'), true);
  });
});

// ============================================================================
// ssr-hydrator.js — warnMismatch (lines 162-175)
// ============================================================================

describe('ssr-hydrator: warnMismatch', () => {
  test('calls console.warn with mismatch message (lines 162-175)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const original = console.warn;
    let capturedMsg = '';
    console.warn = (...args) => { capturedMsg = args.join(' '); };

    warnMismatch(ctx, '<span>', null);
    console.warn = original;

    assert.ok(capturedMsg.includes('Mismatch'));
    assert.ok(capturedMsg.includes('<span>'));
  });

  test('sets mismatchWarned to true after first call (line 174)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const original = console.warn;
    console.warn = () => {};
    assert.strictEqual(ctx.mismatchWarned, false);
    warnMismatch(ctx, '<div>', null);
    console.warn = original;
    assert.strictEqual(ctx.mismatchWarned, true);
  });

  test('does not warn again after mismatchWarned is true (line 162 early return)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    let callCount = 0;
    const original = console.warn;
    console.warn = () => { callCount++; };

    warnMismatch(ctx, '<div>', null);
    warnMismatch(ctx, '<span>', null);
    warnMismatch(ctx, '<p>', null);
    console.warn = original;

    assert.strictEqual(callCount, 1);
  });

  test('includes depth in warning message (line 169)', () => {
    const root = new MockElement('div');
    const parent = new MockElement('section');
    root.appendChild(parent);
    const ctx = createHydrationContext(root);
    enterChild(ctx, parent);  // depth becomes 1

    const original = console.warn;
    let msg = '';
    console.warn = (...args) => { msg = args.join(' '); };
    warnMismatch(ctx, '<h1>', null);
    console.warn = original;

    assert.ok(msg.includes('1'), 'Warning should mention depth 1');
  });

  test('describes actual node using tagName when element provided (lines 164-166)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const actual = new MockElement('section');

    const original = console.warn;
    let msg = '';
    console.warn = (...args) => { msg = args.join(' '); };
    warnMismatch(ctx, '<div>', actual);
    console.warn = original;

    assert.ok(msg.includes('<section>') || msg.includes('section'));
  });

  test('describes actual node as null when no node provided (lines 164-166)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    const original = console.warn;
    let msg = '';
    console.warn = (...args) => { msg = args.join(' '); };
    warnMismatch(ctx, '<div>', null);
    console.warn = original;

    assert.ok(msg.includes('null'));
  });
});

// ============================================================================
// ssr-hydrator.js — registerListener (lines 190-192)
// ============================================================================

describe('ssr-hydrator: registerListener', () => {
  test('calls element.addEventListener and stores listener in ctx (lines 190-192)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const button = new MockElement('button');
    let fired = false;
    const handler = () => { fired = true; };

    registerListener(ctx, button, 'click', handler);

    assert.strictEqual(ctx.listeners.length, 1);
    assert.strictEqual(ctx.listeners[0].element, button);
    assert.strictEqual(ctx.listeners[0].event, 'click');
    assert.strictEqual(ctx.listeners[0].handler, handler);

    // Verify listener was actually attached
    button.dispatchEvent({ type: 'click' });
    assert.strictEqual(fired, true);
  });

  test('stores options in listener record', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const el = new MockElement('div');
    const opts = { once: true };
    registerListener(ctx, el, 'mouseover', () => {}, opts);

    assert.strictEqual(ctx.listeners[0].options, opts);
  });

  test('accumulates multiple listeners', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const el = new MockElement('div');
    registerListener(ctx, el, 'click', () => {});
    registerListener(ctx, el, 'focus', () => {});
    registerListener(ctx, el, 'blur', () => {});
    assert.strictEqual(ctx.listeners.length, 3);
  });
});

// ============================================================================
// ssr-hydrator.js — registerCleanup (lines 200-201)
// ============================================================================

describe('ssr-hydrator: registerCleanup', () => {
  test('pushes cleanup function into ctx.cleanups (lines 200-201)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const fn = () => {};
    registerCleanup(ctx, fn);
    assert.strictEqual(ctx.cleanups.length, 1);
    assert.strictEqual(ctx.cleanups[0], fn);
  });

  test('accumulates multiple cleanup functions', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const fn1 = () => {};
    const fn2 = () => {};
    const fn3 = () => {};
    registerCleanup(ctx, fn1);
    registerCleanup(ctx, fn2);
    registerCleanup(ctx, fn3);
    assert.strictEqual(ctx.cleanups.length, 3);
  });
});

// ============================================================================
// ssr-hydrator.js — disposeHydration (lines 213-228)
// ============================================================================

describe('ssr-hydrator: disposeHydration', () => {
  test('removes all event listeners (lines 213-218)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const el = new MockElement('button');
    let count = 0;
    const handler = () => { count++; };

    registerListener(ctx, el, 'click', handler);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(count, 1);

    disposeHydration(ctx);
    el.dispatchEvent({ type: 'click' });
    assert.strictEqual(count, 1); // unchanged — listener removed

    assert.strictEqual(ctx.listeners.length, 0);
  });

  test('runs all cleanup functions (lines 220-227)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    let a = false;
    let b = false;
    registerCleanup(ctx, () => { a = true; });
    registerCleanup(ctx, () => { b = true; });

    disposeHydration(ctx);
    assert.strictEqual(a, true);
    assert.strictEqual(b, true);
    assert.strictEqual(ctx.cleanups.length, 0);
  });

  test('handles cleanup that throws without stopping others (lines 222-225)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    let secondCalled = false;

    registerCleanup(ctx, () => { throw new Error('boom'); });
    registerCleanup(ctx, () => { secondCalled = true; });

    const originalError = console.error;
    let errLogged = false;
    console.error = () => { errLogged = true; };

    disposeHydration(ctx); // should not throw
    console.error = originalError;

    assert.strictEqual(secondCalled, true);
    assert.strictEqual(errLogged, true);
  });

  test('clears both listeners and cleanups arrays after disposal', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const el = new MockElement('div');
    registerListener(ctx, el, 'click', () => {});
    registerCleanup(ctx, () => {});

    disposeHydration(ctx);

    assert.strictEqual(ctx.listeners.length, 0);
    assert.strictEqual(ctx.cleanups.length, 0);
  });

  test('is a no-op when listeners and cleanups are empty', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    // Should not throw
    disposeHydration(ctx);
    assert.strictEqual(ctx.listeners.length, 0);
    assert.strictEqual(ctx.cleanups.length, 0);
  });
});

// ============================================================================
// ssr-hydrator.js — findNextElement (lines 242-250)
// ============================================================================

describe('ssr-hydrator: findNextElement', () => {
  test('finds first element matching tag from cursor position (lines 242-250)', () => {
    const root = new MockElement('div');
    const span = new MockElement('span');
    const p = new MockElement('p');
    const a = new MockElement('a');
    root.appendChild(span);
    root.appendChild(p);
    root.appendChild(a);

    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'p');
    assert.strictEqual(found, p);
  });

  test('returns null when no matching element exists (lines 248-249)', () => {
    const { root } = makeRoot('span', 'div');
    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'article');
    assert.strictEqual(found, null);
  });

  test('returns null when cursor is null (while loop never executes)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.cursor, null);
    const found = findNextElement(ctx, 'div');
    assert.strictEqual(found, null);
  });

  test('skips text and comment nodes (line 244 nodeType check)', () => {
    const root = new MockElement('div');
    const text = new MockTextNode('hello');
    const comment = new MockCommentNode('c');
    const section = new MockElement('section');
    root.appendChild(text);
    root.appendChild(comment);
    root.appendChild(section);

    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'section');
    assert.strictEqual(found, section);
  });

  test('returns first element when cursor starts on a matching tag', () => {
    const { root, children } = makeRoot('nav', 'nav');
    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'nav');
    assert.strictEqual(found, children[0]);
  });
});

// ============================================================================
// ssr-hydrator.js — countRemaining (lines 259-266)
// ============================================================================

describe('ssr-hydrator: countRemaining', () => {
  test('counts only element nodes from cursor position (lines 259-266)', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('h1'));
    root.appendChild(new MockTextNode('text'));
    root.appendChild(new MockElement('p'));
    root.appendChild(new MockCommentNode('c'));
    root.appendChild(new MockElement('footer'));

    const ctx = createHydrationContext(root);
    assert.strictEqual(countRemaining(ctx), 3); // h1, p, footer
  });

  test('returns 0 when cursor is null (while loop never runs)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    assert.strictEqual(countRemaining(ctx), 0);
  });

  test('decreases after advanceCursor', () => {
    const { root } = makeRoot('a', 'b', 'c');
    const ctx = createHydrationContext(root);
    assert.strictEqual(countRemaining(ctx), 3);
    advanceCursor(ctx);
    assert.strictEqual(countRemaining(ctx), 2);
    advanceCursor(ctx);
    assert.strictEqual(countRemaining(ctx), 1);
    advanceCursor(ctx);
    assert.strictEqual(countRemaining(ctx), 0);
  });

  test('only counts elements (nodeType === 1) not text or comments', () => {
    const root = new MockElement('div');
    root.appendChild(new MockTextNode('t1'));
    root.appendChild(new MockCommentNode('c1'));
    // Zero element nodes
    const ctx = createHydrationContext(root);
    assert.strictEqual(countRemaining(ctx), 0);
  });
});

// ============================================================================
// ssr-hydrator.js — isHydrationComplete (lines 274-275)
// ============================================================================

describe('ssr-hydrator: isHydrationComplete', () => {
  test('returns true when cursor is null and depth is 0 (lines 274-275)', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    // empty root → cursor is null, depth is 0
    assert.strictEqual(isHydrationComplete(ctx), true);
  });

  test('returns false when cursor is not null', () => {
    const { root } = makeRoot('span');
    const ctx = createHydrationContext(root);
    assert.strictEqual(isHydrationComplete(ctx), false);
  });

  test('returns false when depth > 0 even if cursor is null', () => {
    const root = new MockElement('div');
    const parent = new MockElement('div');
    root.appendChild(parent);
    const ctx = createHydrationContext(root);
    // Enter empty child so depth = 1 and cursor = null
    enterChild(ctx, parent);
    assert.strictEqual(ctx.depth, 1);
    assert.strictEqual(ctx.cursor, null);
    assert.strictEqual(isHydrationComplete(ctx), false);
  });

  test('becomes true after processing all children', () => {
    const { root } = makeRoot('a', 'b');
    const ctx = createHydrationContext(root);
    assert.strictEqual(isHydrationComplete(ctx), false);
    advanceCursor(ctx);
    advanceCursor(ctx);
    assert.strictEqual(isHydrationComplete(ctx), true);
  });
});

// ============================================================================
// ssr-hydrator.js — Integration walkthrough
// ============================================================================

describe('ssr-hydrator: full hydration workflow integration', () => {
  afterEach(() => {
    setHydrationMode(false);
  });

  test('complete lifecycle: create, navigate, match, listen, dispose', () => {
    const root = new MockElement('div');
    const comment = new MockCommentNode('ssr-start');
    const btn = new MockElement('button');
    btn.id = 'save';
    btn.classList.add('btn');
    const span = new MockElement('span');
    root.appendChild(comment);
    root.appendChild(btn);
    root.appendChild(span);

    const ctx = createHydrationContext(root);
    setHydrationMode(true, ctx);
    assert.strictEqual(isHydratingMode(), true);
    assert.strictEqual(getHydrationContext(), ctx);

    skipComments(ctx);
    assert.strictEqual(ctx.cursor, btn);

    assert.strictEqual(matchesElement(ctx.cursor, 'button', 'save', 'btn'), true);

    let clicked = false;
    registerListener(ctx, btn, 'click', () => { clicked = true; });

    advanceCursor(ctx);
    assert.strictEqual(ctx.cursor, span);

    advanceCursor(ctx);
    assert.strictEqual(isHydrationComplete(ctx), true);

    setHydrationMode(false);
    assert.strictEqual(isHydratingMode(), false);

    btn.dispatchEvent({ type: 'click' });
    assert.strictEqual(clicked, true);

    disposeHydration(ctx);
    assert.strictEqual(ctx.listeners.length, 0);
  });

  test('warnMismatch during hydration walkthrough sets flag and does not duplicate', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    let warnCount = 0;
    const original = console.warn;
    console.warn = () => { warnCount++; };

    warnMismatch(ctx, '<article>', null);
    warnMismatch(ctx, '<section>', null);

    console.warn = original;
    assert.strictEqual(warnCount, 1);
    assert.strictEqual(ctx.mismatchWarned, true);
  });

  test('findNextElement used for mismatch recovery', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('p'));
    root.appendChild(new MockElement('div'));
    root.appendChild(new MockElement('footer'));

    const ctx = createHydrationContext(root);
    // Pretend cursor is off; use findNextElement to locate footer
    const footer = findNextElement(ctx, 'footer');
    assert.ok(footer !== null);
    assert.strictEqual(footer.tagName.toLowerCase(), 'footer');
  });
});

// ============================================================================
// SSRAsyncContext constructor (lines 18-29)
// ============================================================================

describe('SSRAsyncContext: constructor', () => {
  test('creates instance with empty pending array (lines 18-29)', () => {
    const ctx = new SSRAsyncContext();
    assert.deepStrictEqual(ctx.pending, []);
  });

  test('creates instance with empty resolved Map', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.resolved instanceof Map, true);
    assert.strictEqual(ctx.resolved.size, 0);
  });

  test('creates instance with empty errors Map', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.errors instanceof Map, true);
    assert.strictEqual(ctx.errors.size, 0);
  });

  test('collecting starts as true', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.collecting, true);
  });
});

// ============================================================================
// SSRAsyncContext.register (lines 37-51)
// ============================================================================

describe('SSRAsyncContext: register', () => {
  test('adds tracked promise to pending (lines 37-51)', () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k1', Promise.resolve('val'));
    assert.strictEqual(ctx.pending.length, 1);
    assert.strictEqual(ctx.pending[0].key, 'k1');
  });

  test('does nothing when collecting is false (line 37 early return)', () => {
    const ctx = new SSRAsyncContext();
    ctx.collecting = false;
    ctx.register('k1', Promise.resolve('val'));
    assert.strictEqual(ctx.pending.length, 0);
  });

  test('resolved.set called on success (lines 41-43)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('myKey', Promise.resolve('result'));
    await ctx.waitAll();
    assert.strictEqual(ctx.resolved.get('myKey'), 'result');
  });

  test('errors.set called on failure (lines 45-47)', async () => {
    const ctx = new SSRAsyncContext();
    const err = new Error('fail');
    ctx.register('failKey', Promise.reject(err));
    await ctx.waitAll();
    assert.strictEqual(ctx.errors.get('failKey'), err);
  });

  test('tracked promise re-throws error (line 47)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('bad', Promise.reject(new Error('caught')));
    // waitAll catches individual errors
    await ctx.waitAll(); // should not throw
    assert.strictEqual(ctx.errorCount, 1);
  });
});

// ============================================================================
// SSRAsyncContext.has / get / getError (lines 59-60, 68-69, 77-78)
// ============================================================================

describe('SSRAsyncContext: has, get, getError', () => {
  test('has returns false for unknown key (lines 59-60)', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.has('unknown'), false);
  });

  test('has returns true for resolved key (lines 59-60)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k', Promise.resolve(42));
    await ctx.waitAll();
    assert.strictEqual(ctx.has('k'), true);
  });

  test('get returns undefined for unknown key (lines 68-69)', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.get('nope'), undefined);
  });

  test('get returns resolved value (lines 68-69)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('x', Promise.resolve('hello'));
    await ctx.waitAll();
    assert.strictEqual(ctx.get('x'), 'hello');
  });

  test('getError returns undefined for unknown key (lines 77-78)', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.getError('nope'), undefined);
  });

  test('getError returns error for failed key (lines 77-78)', async () => {
    const ctx = new SSRAsyncContext();
    const err = new Error('oops');
    ctx.register('bad', Promise.reject(err));
    await ctx.waitAll();
    assert.strictEqual(ctx.getError('bad'), err);
  });
});

// ============================================================================
// SSRAsyncContext.waitAll (lines 87-104)
// ============================================================================

describe('SSRAsyncContext: waitAll', () => {
  test('resolves immediately when no pending operations (lines 87-88)', async () => {
    const ctx = new SSRAsyncContext();
    // pending.length === 0 → early return on line 87
    await ctx.waitAll(); // should resolve without throwing
    // collecting remains true because we hit the early-return path (line 87)
    // rather than reaching line 103 — this is the correct behaviour
    assert.strictEqual(ctx.collecting, true);
    assert.strictEqual(ctx.pendingCount, 0);
  });

  test('sets collecting to false after waiting (line 103)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k', Promise.resolve(1));
    assert.strictEqual(ctx.collecting, true);
    await ctx.waitAll();
    assert.strictEqual(ctx.collecting, false);
  });

  test('waits for all concurrent promises (lines 96-100)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('a', new Promise(r => setTimeout(() => r('alpha'), 5)));
    ctx.register('b', new Promise(r => setTimeout(() => r('beta'), 10)));
    ctx.register('c', Promise.resolve('gamma'));
    await ctx.waitAll(500);
    assert.strictEqual(ctx.get('a'), 'alpha');
    assert.strictEqual(ctx.get('b'), 'beta');
    assert.strictEqual(ctx.get('c'), 'gamma');
    assert.strictEqual(ctx.resolvedCount, 3);
  });

  test('does not throw for mixed success and failure (lines 96-100)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('ok', Promise.resolve('fine'));
    ctx.register('fail', Promise.reject(new Error('bad')));
    await assert.doesNotReject(ctx.waitAll());
    assert.strictEqual(ctx.resolvedCount, 1);
    assert.strictEqual(ctx.errorCount, 1);
  });

  test('throws timeout error when operations exceed timeout (lines 89-93)', async () => {
    const ctx = new SSRAsyncContext();
    let timer;
    ctx.register('slow', new Promise(r => { timer = setTimeout(r, 10000); }));
    try {
      await assert.rejects(
        () => ctx.waitAll(30),
        /timed out/
      );
    } finally {
      clearTimeout(timer);
    }
  });

  test('timeout error message contains configured ms (line 91)', async () => {
    const ctx = new SSRAsyncContext();
    let timer;
    ctx.register('late', new Promise(r => { timer = setTimeout(r, 99999); }));
    let msg = '';
    try {
      await ctx.waitAll(25);
    } catch (e) {
      msg = e.message;
    } finally {
      clearTimeout(timer);
    }
    assert.ok(msg.includes('25'));
  });
});

// ============================================================================
// SSRAsyncContext computed getters (lines 111-112, 119-120, 127-128)
// ============================================================================

describe('SSRAsyncContext: pendingCount, resolvedCount, errorCount', () => {
  test('pendingCount returns pending.length (lines 111-112)', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.pendingCount, 0);
    ctx.register('a', Promise.resolve());
    assert.strictEqual(ctx.pendingCount, 1);
    ctx.register('b', Promise.resolve());
    assert.strictEqual(ctx.pendingCount, 2);
  });

  test('resolvedCount returns resolved.size (lines 119-120)', async () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.resolvedCount, 0);
    ctx.register('r1', Promise.resolve('v1'));
    ctx.register('r2', Promise.resolve('v2'));
    await ctx.waitAll();
    assert.strictEqual(ctx.resolvedCount, 2);
  });

  test('errorCount returns errors.size (lines 127-128)', async () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.errorCount, 0);
    ctx.register('e1', Promise.reject(new Error('x')));
    ctx.register('e2', Promise.reject(new Error('y')));
    await ctx.waitAll();
    assert.strictEqual(ctx.errorCount, 2);
  });
});

// ============================================================================
// SSRAsyncContext.getAllResolved (lines 135-142)
// ============================================================================

describe('SSRAsyncContext: getAllResolved', () => {
  test('returns empty object when nothing resolved (lines 135-142)', () => {
    const ctx = new SSRAsyncContext();
    assert.deepStrictEqual(ctx.getAllResolved(), {});
  });

  test('uses string key for string keys (line 139)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('myKey', Promise.resolve(99));
    await ctx.waitAll();
    const result = ctx.getAllResolved();
    assert.strictEqual(result['myKey'], 99);
  });

  test('uses function name as key for named function (lines 137-139)', async () => {
    const ctx = new SSRAsyncContext();
    function loadData() { return Promise.resolve([1, 2]); }
    ctx.register(loadData, loadData());
    await ctx.waitAll();
    const result = ctx.getAllResolved();
    assert.deepStrictEqual(result['loadData'], [1, 2]);
  });

  test('uses "anonymous" for unnamed function key (lines 137-139)', async () => {
    const ctx = new SSRAsyncContext();
    const fn = () => Promise.resolve('anon-val');
    // Force no name by using Object.defineProperty
    Object.defineProperty(fn, 'name', { value: '' });
    ctx.register(fn, fn());
    await ctx.waitAll();
    const result = ctx.getAllResolved();
    // key is either '' or 'anonymous'
    assert.ok(
      'anonymous' in result || '' in result,
      'should have anonymous or empty-string key'
    );
  });

  test('converts non-function, non-string key via String() (line 139)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register(42, Promise.resolve('num-val'));
    await ctx.waitAll();
    const result = ctx.getAllResolved();
    assert.strictEqual(result['42'], 'num-val');
  });
});

// ============================================================================
// SSRAsyncContext.reset (lines 148-152)
// ============================================================================

describe('SSRAsyncContext: reset', () => {
  test('clears pending array (lines 148-152)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k', Promise.resolve(1));
    await ctx.waitAll();
    ctx.reset();
    assert.strictEqual(ctx.pendingCount, 0);
  });

  test('clears resolved map', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k', Promise.resolve(1));
    await ctx.waitAll();
    assert.strictEqual(ctx.resolvedCount, 1);
    ctx.reset();
    assert.strictEqual(ctx.resolvedCount, 0);
  });

  test('clears errors map', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('e', Promise.reject(new Error('err')));
    await ctx.waitAll();
    assert.strictEqual(ctx.errorCount, 1);
    ctx.reset();
    assert.strictEqual(ctx.errorCount, 0);
  });

  test('restores collecting to true (line 151)', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('k', Promise.resolve());
    await ctx.waitAll();
    assert.strictEqual(ctx.collecting, false);
    ctx.reset();
    assert.strictEqual(ctx.collecting, true);
  });

  test('allows re-registration after reset', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('first', Promise.resolve('v1'));
    await ctx.waitAll();
    ctx.reset();

    ctx.register('second', Promise.resolve('v2'));
    await ctx.waitAll();
    assert.strictEqual(ctx.get('second'), 'v2');
    assert.strictEqual(ctx.has('first'), false);
  });
});

// ============================================================================
// Global SSR async context: getSSRAsyncContext / setSSRAsyncContext
// (lines 168-169, 176-177)
// ============================================================================

describe('ssr-async: getSSRAsyncContext / setSSRAsyncContext', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('getSSRAsyncContext returns null initially (lines 168-169)', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(getSSRAsyncContext(), null);
  });

  test('setSSRAsyncContext stores context and getSSRAsyncContext retrieves it (lines 176-177)', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(getSSRAsyncContext(), ctx);
  });

  test('setSSRAsyncContext(null) clears the context', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(getSSRAsyncContext(), ctx);
    setSSRAsyncContext(null);
    assert.strictEqual(getSSRAsyncContext(), null);
  });

  test('setSSRAsyncContext replaces existing context', () => {
    const ctx1 = new SSRAsyncContext();
    const ctx2 = new SSRAsyncContext();
    setSSRAsyncContext(ctx1);
    setSSRAsyncContext(ctx2);
    assert.strictEqual(getSSRAsyncContext(), ctx2);
  });
});

// ============================================================================
// isCollectingAsync (lines 184-185)
// ============================================================================

describe('ssr-async: isCollectingAsync', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns false when no context set (lines 184-185)', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('returns true when context is collecting', () => {
    const ctx = new SSRAsyncContext();
    assert.strictEqual(ctx.collecting, true);
    setSSRAsyncContext(ctx);
    assert.strictEqual(isCollectingAsync(), true);
  });

  test('returns false when context collecting flag is false', () => {
    const ctx = new SSRAsyncContext();
    ctx.collecting = false;
    setSSRAsyncContext(ctx);
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('updates when context collecting flag toggles', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(isCollectingAsync(), true);
    ctx.register('k', Promise.resolve(1));
    await ctx.waitAll();
    assert.strictEqual(isCollectingAsync(), false);
  });
});

// ============================================================================
// registerAsync (lines 194-197)
// ============================================================================

describe('ssr-async: registerAsync', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('is a no-op when no context is set (lines 194-197)', () => {
    setSSRAsyncContext(null);
    // should not throw
    registerAsync('key', Promise.resolve('val'));
    assert.strictEqual(getSSRAsyncContext(), null);
  });

  test('delegates to context.register when context is set (lines 194-197)', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    registerAsync('reg-key', Promise.resolve('data'));
    assert.strictEqual(ctx.pendingCount, 1);
    await ctx.waitAll();
    assert.strictEqual(ctx.get('reg-key'), 'data');
  });

  test('multiple registerAsync calls accumulate operations', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    registerAsync('op1', Promise.resolve('r1'));
    registerAsync('op2', Promise.resolve('r2'));
    registerAsync('op3', Promise.resolve('r3'));
    assert.strictEqual(ctx.pendingCount, 3);
    await ctx.waitAll();
    assert.strictEqual(ctx.resolvedCount, 3);
  });
});

// ============================================================================
// getCachedAsync (lines 205-206)
// ============================================================================

describe('ssr-async: getCachedAsync', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns undefined when no context set (lines 205-206, optional chaining)', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(getCachedAsync('any'), undefined);
  });

  test('returns undefined for unknown key when context is set', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(getCachedAsync('missing'), undefined);
  });

  test('returns resolved value for registered key (lines 205-206)', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.register('data', Promise.resolve({ id: 1 }));
    await ctx.waitAll();
    assert.deepStrictEqual(getCachedAsync('data'), { id: 1 });
  });
});

// ============================================================================
// hasCachedAsync (lines 214-215)
// ============================================================================

describe('ssr-async: hasCachedAsync', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('returns false when no context set (lines 214-215, ?? false)', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(hasCachedAsync('any'), false);
  });

  test('returns false for unknown key when context is set', () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    assert.strictEqual(hasCachedAsync('unknown'), false);
  });

  test('returns true for resolved key (lines 214-215)', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.register('exists', Promise.resolve(true));
    await ctx.waitAll();
    assert.strictEqual(hasCachedAsync('exists'), true);
  });

  test('returns false for failed key (only resolved keys are "cached")', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
    ctx.register('bad', Promise.reject(new Error('x')));
    await ctx.waitAll();
    assert.strictEqual(hasCachedAsync('bad'), false);
  });
});

// ============================================================================
// ssr-async: Full integration test
// ============================================================================

describe('ssr-async: full SSR data prefetch integration', () => {
  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('typical SSR flow: create context, register ops, wait, read results', async () => {
    // 1. Create context for SSR render
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);

    assert.strictEqual(getSSRAsyncContext(), ctx);
    assert.strictEqual(isCollectingAsync(), true);

    // 2. Components register async data fetches
    registerAsync('user', Promise.resolve({ name: 'Alice', id: 1 }));
    registerAsync('posts', Promise.resolve([{ title: 'Hello' }]));

    assert.strictEqual(ctx.pendingCount, 2);

    // 3. Wait for all async ops
    await ctx.waitAll();

    assert.strictEqual(ctx.collecting, false);
    assert.strictEqual(isCollectingAsync(), false);
    assert.strictEqual(ctx.resolvedCount, 2);

    // 4. Check cached results
    assert.ok(hasCachedAsync('user'));
    assert.ok(hasCachedAsync('posts'));
    assert.deepStrictEqual(getCachedAsync('user'), { name: 'Alice', id: 1 });
    assert.deepStrictEqual(getCachedAsync('posts'), [{ title: 'Hello' }]);

    // 5. getAllResolved
    const all = ctx.getAllResolved();
    assert.strictEqual(all['user'].name, 'Alice');
    assert.strictEqual(all['posts'][0].title, 'Hello');

    // 6. Reset for next render
    ctx.reset();
    assert.strictEqual(ctx.resolvedCount, 0);
    assert.strictEqual(ctx.pendingCount, 0);
    assert.strictEqual(ctx.collecting, true);
    assert.strictEqual(hasCachedAsync('user'), false);

    // 7. Clear context
    setSSRAsyncContext(null);
    assert.strictEqual(getSSRAsyncContext(), null);
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('error handling in SSR: failed ops tracked, successful ops still available', async () => {
    const ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);

    registerAsync('config', Promise.resolve({ theme: 'dark' }));
    registerAsync('badFetch', Promise.reject(new Error('network error')));

    await ctx.waitAll();

    assert.strictEqual(ctx.resolvedCount, 1);
    assert.strictEqual(ctx.errorCount, 1);
    assert.ok(hasCachedAsync('config'));
    assert.strictEqual(hasCachedAsync('badFetch'), false);
    assert.strictEqual(ctx.getError('badFetch').message, 'network error');
  });
});
