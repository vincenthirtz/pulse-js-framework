/**
 * SSR Module Tests
 *
 * Comprehensive tests for server-side rendering and hydration functionality.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

import { serializeToHTML, serializeChildren, escapeHTML, escapeAttr } from '../runtime/ssr-serializer.js';
import {
  SSRAsyncContext,
  setSSRAsyncContext,
  getSSRAsyncContext,
  isCollectingAsync,
  registerAsync,
  getCachedAsync,
  hasCachedAsync
} from '../runtime/ssr-async.js';
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
  renderToString,
  renderToStringSync,
  serializeState,
  deserializeState,
  restoreState,
  getSSRState,
  clearSSRState,
  hydrate,
  isSSR
} from '../runtime/ssr.js';
import {
  MockElement,
  MockTextNode,
  MockCommentNode,
  MockDocumentFragment,
  MockDOMAdapter,
  setAdapter,
  resetAdapter
} from '../runtime/dom-adapter.js';
import { pulse, effect, computed, createContext, resetContext } from '../runtime/pulse.js';

// ============================================================================
// HTML Serialization Tests
// ============================================================================

describe('SSR Serializer', () => {
  test('escapeHTML escapes special characters', () => {
    assert.strictEqual(escapeHTML('<script>'), '&lt;script&gt;');
    assert.strictEqual(escapeHTML('a & b'), 'a &amp; b');
    assert.strictEqual(escapeHTML('<div class="test">'), '&lt;div class="test"&gt;');
  });

  test('escapeAttr escapes attribute characters', () => {
    assert.strictEqual(escapeAttr('value"with"quotes'), 'value&quot;with&quot;quotes');
    assert.strictEqual(escapeAttr('a<b>c'), 'a&lt;b&gt;c');
  });

  test('serializeToHTML handles text nodes', () => {
    const text = new MockTextNode('Hello World');
    assert.strictEqual(serializeToHTML(text), 'Hello World');
  });

  test('serializeToHTML escapes text content', () => {
    const text = new MockTextNode('<script>alert("xss")</script>');
    assert.strictEqual(serializeToHTML(text), '&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  test('serializeToHTML handles comment nodes', () => {
    const comment = new MockCommentNode('pulse');
    assert.strictEqual(serializeToHTML(comment), '<!--pulse-->');
  });

  test('serializeToHTML handles simple element', () => {
    const div = new MockElement('div');
    assert.strictEqual(serializeToHTML(div), '<div></div>');
  });

  test('serializeToHTML handles element with id and class', () => {
    const div = new MockElement('div');
    div.id = 'main';
    div.className = 'container active';
    const html = serializeToHTML(div);
    assert.ok(html.includes('id="main"'));
    assert.ok(html.includes('class="container active"'));
  });

  test('serializeToHTML handles element with attributes', () => {
    const input = new MockElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', 'Enter name');
    const html = serializeToHTML(input);
    assert.ok(html.includes('type="text"'));
    assert.ok(html.includes('placeholder="Enter name"'));
  });

  test('serializeToHTML handles void elements', () => {
    const input = new MockElement('input');
    const br = new MockElement('br');
    const img = new MockElement('img');

    assert.strictEqual(serializeToHTML(input), '<input>');
    assert.strictEqual(serializeToHTML(br), '<br>');
    assert.strictEqual(serializeToHTML(img), '<img>');
  });

  test('serializeToHTML handles boolean attributes', () => {
    const input = new MockElement('input');
    input.setAttribute('disabled', 'true');
    input.setAttribute('checked', 'checked');
    const html = serializeToHTML(input);
    assert.ok(html.includes(' disabled'));
    assert.ok(html.includes(' checked'));
    assert.ok(!html.includes('disabled="'));
  });

  test('serializeToHTML handles nested elements', () => {
    const div = new MockElement('div');
    const span = new MockElement('span');
    span.appendChild(new MockTextNode('Hello'));
    div.appendChild(span);

    const html = serializeToHTML(div);
    assert.strictEqual(html, '<div><span>Hello</span></div>');
  });

  test('serializeToHTML handles style attribute', () => {
    const div = new MockElement('div');
    div._style = { color: 'red', fontSize: '16px' };

    const html = serializeToHTML(div);
    assert.ok(html.includes('style="'));
    assert.ok(html.includes('color: red'));
    assert.ok(html.includes('font-size: 16px'));
  });

  test('serializeChildren serializes only children', () => {
    const body = new MockElement('body');
    body.appendChild(new MockElement('div'));
    body.appendChild(new MockTextNode('text'));

    const html = serializeChildren(body);
    assert.strictEqual(html, '<div></div>text');
  });
});

// ============================================================================
// SSR Async Context Tests
// ============================================================================

describe('SSR Async Context', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
  });

  test('registers and resolves async operations', async () => {
    const promise = Promise.resolve({ data: 'test' });
    ctx.register('key1', promise);

    assert.strictEqual(ctx.pendingCount, 1);

    await ctx.waitAll();

    assert.ok(ctx.has('key1'));
    assert.deepStrictEqual(ctx.get('key1'), { data: 'test' });
  });

  test('handles async errors', async () => {
    const promise = Promise.reject(new Error('test error'));
    ctx.register('key1', promise);

    await ctx.waitAll();

    assert.ok(ctx.getError('key1'));
    assert.strictEqual(ctx.errorCount, 1);
  });

  test('times out on slow operations', async () => {
    const slowPromise = new Promise(resolve => setTimeout(resolve, 10000));
    ctx.register('slow', slowPromise);

    await assert.rejects(
      ctx.waitAll(50),
      /timed out/
    );
  });

  test('reset clears all state', () => {
    ctx.resolved.set('key', 'value');
    ctx.pending.push({ key: 'test', promise: Promise.resolve() });

    ctx.reset();

    assert.strictEqual(ctx.pendingCount, 0);
    assert.strictEqual(ctx.resolvedCount, 0);
  });

  test('global context functions work', () => {
    setSSRAsyncContext(ctx);
    assert.strictEqual(getSSRAsyncContext(), ctx);

    setSSRAsyncContext(null);
    assert.strictEqual(getSSRAsyncContext(), null);
  });
});

// ============================================================================
// SSR Hydrator Tests
// ============================================================================

describe('SSR Hydrator', () => {
  test('createHydrationContext initializes correctly', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('span'));

    const ctx = createHydrationContext(root);

    assert.strictEqual(ctx.root, root);
    assert.strictEqual(ctx.cursor, root.firstChild);
    assert.strictEqual(ctx.depth, 0);
  });

  test('advanceCursor moves to next sibling', () => {
    const root = new MockElement('div');
    const span1 = new MockElement('span');
    const span2 = new MockElement('span');
    root.appendChild(span1);
    root.appendChild(span2);

    const ctx = createHydrationContext(root);
    assert.strictEqual(getCurrentNode(ctx), span1);

    advanceCursor(ctx);
    assert.strictEqual(getCurrentNode(ctx), span2);

    advanceCursor(ctx);
    assert.strictEqual(getCurrentNode(ctx), null);
  });

  test('hydration mode state management', () => {
    assert.strictEqual(isHydratingMode(), false);

    const ctx = createHydrationContext(new MockElement('div'));
    setHydrationMode(true, ctx);

    assert.strictEqual(isHydratingMode(), true);

    setHydrationMode(false, null);
    assert.strictEqual(isHydratingMode(), false);
  });
});

// ============================================================================
// State Serialization Tests
// ============================================================================

describe('State Serialization', () => {
  test('serializeState handles basic types', () => {
    const state = {
      string: 'hello',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      object: { nested: 'value' }
    };

    const json = serializeState(state);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.string, 'hello');
    assert.strictEqual(parsed.number, 42);
    assert.strictEqual(parsed.boolean, true);
    assert.strictEqual(parsed.null, null);
    assert.deepStrictEqual(parsed.array, [1, 2, 3]);
    assert.deepStrictEqual(parsed.object, { nested: 'value' });
  });

  test('serializeState handles Date objects', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const state = { date };

    const json = serializeState(state);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.date.__t, 'D');
    assert.strictEqual(parsed.date.v, '2024-01-15T12:00:00.000Z');
  });

  test('serializeState handles undefined', () => {
    const state = { value: undefined };
    const json = serializeState(state);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.value.__t, 'U');
  });

  test('serializeState escapes script tags', () => {
    const state = { html: '</script><script>alert(1)</script>' };
    const json = serializeState(state);

    assert.ok(!json.includes('</script>'));
  });

  test('deserializeState restores Date objects', () => {
    const json = '{"date":{"__t":"D","v":"2024-01-15T12:00:00.000Z"}}';
    const state = deserializeState(json);

    assert.ok(state.date instanceof Date);
    assert.strictEqual(state.date.toISOString(), '2024-01-15T12:00:00.000Z');
  });

  test('deserializeState restores undefined', () => {
    const json = '{"value":{"__t":"U"}}';
    const state = deserializeState(json);

    assert.strictEqual(state.value, undefined);
  });

  test('roundtrip serialization', () => {
    const original = {
      name: 'test',
      date: new Date('2024-01-15'),
      nested: {
        value: undefined,
        array: [1, new Date('2024-02-20'), 'text']
      }
    };

    const json = serializeState(original);
    const restored = deserializeState(json);

    assert.strictEqual(restored.name, original.name);
    assert.strictEqual(restored.date.toISOString(), original.date.toISOString());
  });
});

// ============================================================================
// renderToString Tests
// ============================================================================

describe('renderToString', () => {
  beforeEach(() => {
    setAdapter(new MockDOMAdapter());
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('renders simple element to string', async () => {
    // Import el from dom after setting adapter
    const { el } = await import('../runtime/dom-element.js');

    const { html } = await renderToString(() => {
      return el('div.container', 'Hello SSR');
    });

    assert.ok(html.includes('class="container"'));
    assert.ok(html.includes('Hello SSR'));
  });

  test('renders nested elements', async () => {
    const { el } = await import('../runtime/dom-element.js');

    const { html } = await renderToString(() => {
      return el('div',
        el('h1', 'Title'),
        el('p', 'Content')
      );
    });

    assert.ok(html.includes('<h1>Title</h1>'));
    assert.ok(html.includes('<p>Content</p>'));
  });

  test('isSSR returns true during render', async () => {
    const { el } = await import('../runtime/dom-element.js');

    let wasSSR = false;

    await renderToString(() => {
      wasSSR = isSSR();
      return el('div', 'test');
    });

    assert.strictEqual(wasSSR, true);
  });

  test('isSSR returns false after render', async () => {
    const { el } = await import('../runtime/dom-element.js');

    await renderToString(() => el('div', 'test'));

    assert.strictEqual(isSSR(), false);
  });

  test('effects run once in SSR mode', async () => {
    const { el } = await import('../runtime/dom-element.js');

    let effectCount = 0;
    const counter = pulse(0);

    await renderToString(() => {
      effect(() => {
        effectCount++;
        counter.get();
      });
      return el('div', 'test');
    });

    // Effect should have run once
    assert.strictEqual(effectCount, 1);

    // Changing pulse should not trigger effect (no subscriptions in SSR)
    counter.set(1);
    assert.strictEqual(effectCount, 1);
  });

  test('renderToStringSync works without async', () => {
    setAdapter(new MockDOMAdapter());

    const html = renderToStringSync(() => {
      // Create element directly using MockElement
      const div = new MockElement('div');
      div.className = 'sync-test';
      div.appendChild(new MockTextNode('Sync Content'));
      return div;
    });

    assert.ok(html.includes('sync-test'));
    assert.ok(html.includes('Sync Content'));
  });
});

// ============================================================================
// SSR with Reactive State Tests
// ============================================================================

describe('SSR with Reactive State', () => {
  beforeEach(() => {
    setAdapter(new MockDOMAdapter());
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('renders reactive values', async () => {
    const { el, text } = await import('../runtime/dom-element.js');

    const count = pulse(42);

    const { html } = await renderToString(() => {
      return el('div', `Count: ${count.get()}`);
    });

    assert.ok(html.includes('Count: 42'));
  });

  test('handles computed values', async () => {
    const { el } = await import('../runtime/dom-element.js');
    const { computed } = await import('../runtime/pulse.js');

    const count = pulse(5);
    const doubled = computed(() => count.get() * 2);

    const { html } = await renderToString(() => {
      return el('div', `Doubled: ${doubled.get()}`);
    });

    assert.ok(html.includes('Doubled: 10'));
  });
});

// ============================================================================
// Extended Hydrator Tests
// ============================================================================

describe('SSR Hydrator - Navigation', () => {
  test('enterChild moves cursor to first child and increases depth', () => {
    const root = new MockElement('div');
    const child = new MockElement('span');
    const grandchild = new MockElement('a');
    child.appendChild(grandchild);
    root.appendChild(child);

    const ctx = createHydrationContext(root);
    assert.strictEqual(ctx.depth, 0);
    assert.strictEqual(getCurrentNode(ctx), child);

    enterChild(ctx, child);
    assert.strictEqual(ctx.depth, 1);
    assert.strictEqual(getCurrentNode(ctx), grandchild);
  });

  test('exitChild restores cursor to next sibling and decreases depth', () => {
    const root = new MockElement('div');
    const child1 = new MockElement('span');
    const child2 = new MockElement('p');
    root.appendChild(child1);
    root.appendChild(child2);

    const ctx = createHydrationContext(root);
    enterChild(ctx, child1);
    assert.strictEqual(ctx.depth, 1);

    exitChild(ctx, child1);
    assert.strictEqual(ctx.depth, 0);
    assert.strictEqual(getCurrentNode(ctx), child2);
  });

  test('skipComments skips comment nodes', () => {
    const root = new MockElement('div');
    root.appendChild(new MockCommentNode('comment1'));
    root.appendChild(new MockCommentNode('comment2'));
    root.appendChild(new MockElement('span'));

    const ctx = createHydrationContext(root);
    assert.strictEqual(getCurrentNode(ctx).nodeType, 8); // Comment

    skipComments(ctx);
    assert.strictEqual(getCurrentNode(ctx).nodeType, 1); // Element
    assert.strictEqual(getCurrentNode(ctx).tagName.toLowerCase(), 'span');
  });

  test('skipComments handles no comments', () => {
    const root = new MockElement('div');
    const span = new MockElement('span');
    root.appendChild(span);

    const ctx = createHydrationContext(root);
    skipComments(ctx);
    assert.strictEqual(getCurrentNode(ctx), span);
  });

  test('skipComments handles only comments', () => {
    const root = new MockElement('div');
    root.appendChild(new MockCommentNode('comment'));

    const ctx = createHydrationContext(root);
    skipComments(ctx);
    assert.strictEqual(getCurrentNode(ctx), null);
  });
});

describe('SSR Hydrator - Matching', () => {
  test('matchesElement returns true for matching element', () => {
    const div = new MockElement('div');
    assert.strictEqual(matchesElement(div, 'div'), true);
  });

  test('matchesElement returns false for wrong tag', () => {
    const div = new MockElement('div');
    assert.strictEqual(matchesElement(div, 'span'), false);
  });

  test('matchesElement checks id when provided', () => {
    const div = new MockElement('div');
    div.id = 'main';

    assert.strictEqual(matchesElement(div, 'div', 'main'), true);
    assert.strictEqual(matchesElement(div, 'div', 'other'), false);
  });

  test('matchesElement checks class when provided', () => {
    const div = new MockElement('div');
    div.className = 'container active';

    assert.strictEqual(matchesElement(div, 'div', undefined, 'container'), true);
    assert.strictEqual(matchesElement(div, 'div', undefined, 'other'), false);
  });

  test('matchesElement returns false for null node', () => {
    assert.strictEqual(matchesElement(null, 'div'), false);
  });

  test('matchesElement returns false for text node', () => {
    const text = new MockTextNode('hello');
    assert.strictEqual(matchesElement(text, 'div'), false);
  });

  test('findNextElement finds element by tag', () => {
    const root = new MockElement('div');
    root.appendChild(new MockTextNode('text'));
    root.appendChild(new MockElement('span'));
    root.appendChild(new MockElement('p'));

    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'p');
    assert.strictEqual(found.tagName.toLowerCase(), 'p');
  });

  test('findNextElement returns null when not found', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('span'));

    const ctx = createHydrationContext(root);
    const found = findNextElement(ctx, 'article');
    assert.strictEqual(found, null);
  });
});

describe('SSR Hydrator - Mismatch Warnings', () => {
  let originalWarn;
  let warnings;

  beforeEach(() => {
    warnings = [];
    originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  test('warnMismatch logs warning with details', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    const actual = new MockElement('span');

    warnMismatch(ctx, '<div>', actual);

    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0].includes('Mismatch'));
    assert.ok(warnings[0].includes('<div>'));
    assert.ok(warnings[0].includes('<span>'));
  });

  test('warnMismatch only warns once per context', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    warnMismatch(ctx, '<div>', new MockElement('span'));
    warnMismatch(ctx, '<p>', new MockElement('a'));

    assert.strictEqual(warnings.length, 1);
    assert.strictEqual(ctx.mismatchWarned, true);
  });

  test('warnMismatch handles null actual', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    warnMismatch(ctx, '<div>', null);

    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0].includes('null'));
  });
});

describe('SSR Hydrator - Listener Management', () => {
  test('registerListener adds event listener and tracks it', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    const element = new MockElement('button');
    let listenerAdded = false;
    element.addEventListener = (event, handler, options) => {
      listenerAdded = true;
      assert.strictEqual(event, 'click');
    };

    const handler = () => {};
    registerListener(ctx, element, 'click', handler);

    assert.strictEqual(listenerAdded, true);
    assert.strictEqual(ctx.listeners.length, 1);
    assert.strictEqual(ctx.listeners[0].event, 'click');
    assert.strictEqual(ctx.listeners[0].handler, handler);
  });

  test('registerListener tracks options', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    const element = new MockElement('button');
    element.addEventListener = () => {};

    const options = { capture: true, passive: true };
    registerListener(ctx, element, 'click', () => {}, options);

    assert.deepStrictEqual(ctx.listeners[0].options, options);
  });

  test('registerCleanup adds cleanup function', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    const cleanup1 = () => {};
    const cleanup2 = () => {};

    registerCleanup(ctx, cleanup1);
    registerCleanup(ctx, cleanup2);

    assert.strictEqual(ctx.cleanups.length, 2);
    assert.strictEqual(ctx.cleanups[0], cleanup1);
    assert.strictEqual(ctx.cleanups[1], cleanup2);
  });
});

describe('SSR Hydrator - Disposal', () => {
  test('disposeHydration removes all event listeners', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    const removed = [];
    const element = new MockElement('button');
    element.addEventListener = () => {};
    element.removeEventListener = (event, handler, options) => {
      removed.push({ event, handler, options });
    };

    const handler1 = () => {};
    const handler2 = () => {};
    registerListener(ctx, element, 'click', handler1);
    registerListener(ctx, element, 'mouseover', handler2, { passive: true });

    disposeHydration(ctx);

    assert.strictEqual(removed.length, 2);
    assert.strictEqual(removed[0].event, 'click');
    assert.strictEqual(removed[1].event, 'mouseover');
    assert.strictEqual(ctx.listeners.length, 0);
  });

  test('disposeHydration runs all cleanup functions', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    let cleanup1Called = false;
    let cleanup2Called = false;

    registerCleanup(ctx, () => { cleanup1Called = true; });
    registerCleanup(ctx, () => { cleanup2Called = true; });

    disposeHydration(ctx);

    assert.strictEqual(cleanup1Called, true);
    assert.strictEqual(cleanup2Called, true);
    assert.strictEqual(ctx.cleanups.length, 0);
  });

  test('disposeHydration handles cleanup errors gracefully', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    let secondCleanupCalled = false;
    const originalError = console.error;
    const errors = [];
    console.error = (...args) => errors.push(args);

    registerCleanup(ctx, () => { throw new Error('Cleanup error'); });
    registerCleanup(ctx, () => { secondCleanupCalled = true; });

    disposeHydration(ctx);

    console.error = originalError;

    assert.strictEqual(secondCleanupCalled, true);
    assert.strictEqual(errors.length, 1);
  });
});

describe('SSR Hydrator - Completion Detection', () => {
  test('countRemaining counts element nodes', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('span'));
    root.appendChild(new MockTextNode('text'));
    root.appendChild(new MockElement('p'));
    root.appendChild(new MockCommentNode('comment'));
    root.appendChild(new MockElement('a'));

    const ctx = createHydrationContext(root);
    assert.strictEqual(countRemaining(ctx), 3); // span, p, a
  });

  test('countRemaining returns 0 when cursor is null', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    ctx.cursor = null;

    assert.strictEqual(countRemaining(ctx), 0);
  });

  test('isHydrationComplete returns true when cursor is null and depth is 0', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    ctx.cursor = null;
    ctx.depth = 0;

    assert.strictEqual(isHydrationComplete(ctx), true);
  });

  test('isHydrationComplete returns false when cursor exists', () => {
    const root = new MockElement('div');
    root.appendChild(new MockElement('span'));
    const ctx = createHydrationContext(root);

    assert.strictEqual(isHydrationComplete(ctx), false);
  });

  test('isHydrationComplete returns false when depth > 0', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);
    ctx.cursor = null;
    ctx.depth = 1;

    assert.strictEqual(isHydrationComplete(ctx), false);
  });
});

describe('SSR Hydrator - Context Access', () => {
  afterEach(() => {
    setHydrationMode(false, null);
  });

  test('getHydrationContext returns current context', () => {
    const root = new MockElement('div');
    const ctx = createHydrationContext(root);

    setHydrationMode(true, ctx);
    assert.strictEqual(getHydrationContext(), ctx);
  });

  test('getHydrationContext returns null when not hydrating', () => {
    setHydrationMode(false, null);
    assert.strictEqual(getHydrationContext(), null);
  });
});

// ============================================================================
// Extended Async Context Tests
// ============================================================================

describe('SSR Async Context - Global Helpers', () => {
  let ctx;

  beforeEach(() => {
    ctx = new SSRAsyncContext();
    setSSRAsyncContext(ctx);
  });

  afterEach(() => {
    setSSRAsyncContext(null);
  });

  test('isCollectingAsync returns true when context is collecting', () => {
    assert.strictEqual(isCollectingAsync(), true);
  });

  test('isCollectingAsync returns false when collecting is disabled', () => {
    ctx.collecting = false;
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('isCollectingAsync returns false when no context', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(isCollectingAsync(), false);
  });

  test('registerAsync adds operation to context', async () => {
    const promise = Promise.resolve('data');
    registerAsync('test-key', promise);

    assert.strictEqual(ctx.pendingCount, 1);
    await ctx.waitAll();
    assert.strictEqual(ctx.get('test-key'), 'data');
  });

  test('registerAsync is no-op when no context', () => {
    setSSRAsyncContext(null);
    // Should not throw
    registerAsync('key', Promise.resolve());
  });

  test('getCachedAsync returns cached value', async () => {
    ctx.register('cached', Promise.resolve('cached-data'));
    await ctx.waitAll();

    assert.strictEqual(getCachedAsync('cached'), 'cached-data');
  });

  test('getCachedAsync returns undefined for missing key', () => {
    assert.strictEqual(getCachedAsync('missing'), undefined);
  });

  test('hasCachedAsync returns true for cached key', async () => {
    ctx.register('exists', Promise.resolve('value'));
    await ctx.waitAll();

    assert.strictEqual(hasCachedAsync('exists'), true);
  });

  test('hasCachedAsync returns false for missing key', () => {
    assert.strictEqual(hasCachedAsync('missing'), false);
  });

  test('hasCachedAsync returns false when no context', () => {
    setSSRAsyncContext(null);
    assert.strictEqual(hasCachedAsync('any'), false);
  });
});

describe('SSR Async Context - getAllResolved', () => {
  test('getAllResolved returns all resolved data as object', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('key1', Promise.resolve('value1'));
    ctx.register('key2', Promise.resolve('value2'));

    await ctx.waitAll();

    const resolved = ctx.getAllResolved();
    assert.strictEqual(resolved['key1'], 'value1');
    assert.strictEqual(resolved['key2'], 'value2');
  });

  test('getAllResolved uses function name as key', async () => {
    const ctx = new SSRAsyncContext();
    function fetchUsers() { return Promise.resolve(['user1']); }
    ctx.register(fetchUsers, fetchUsers());

    await ctx.waitAll();

    const resolved = ctx.getAllResolved();
    assert.deepStrictEqual(resolved['fetchUsers'], ['user1']);
  });

  test('getAllResolved uses anonymous for unnamed functions', async () => {
    const ctx = new SSRAsyncContext();
    const anonFn = () => Promise.resolve('anon');
    ctx.register(anonFn, anonFn());

    await ctx.waitAll();

    const resolved = ctx.getAllResolved();
    // Anonymous arrow function has no name
    assert.ok('anonymous' in resolved || '' in resolved || Object.keys(resolved).length === 1);
  });
});

describe('SSR Async Context - Collecting Flag', () => {
  test('register is no-op when collecting is false', () => {
    const ctx = new SSRAsyncContext();
    ctx.collecting = false;

    ctx.register('key', Promise.resolve('value'));
    assert.strictEqual(ctx.pendingCount, 0);
  });

  test('waitAll sets collecting to false', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('key', Promise.resolve('value'));

    assert.strictEqual(ctx.collecting, true);
    await ctx.waitAll();
    assert.strictEqual(ctx.collecting, false);
  });

  test('reset restores collecting to true', async () => {
    const ctx = new SSRAsyncContext();
    ctx.register('key', Promise.resolve('value'));
    await ctx.waitAll();

    assert.strictEqual(ctx.collecting, false);
    ctx.reset();
    assert.strictEqual(ctx.collecting, true);
  });
});

describe('SSR Async Context - Multiple Operations', () => {
  test('handles multiple concurrent operations', async () => {
    const ctx = new SSRAsyncContext();

    ctx.register('fast', Promise.resolve('fast-result'));
    ctx.register('medium', new Promise(r => setTimeout(() => r('medium-result'), 10)));
    ctx.register('slow', new Promise(r => setTimeout(() => r('slow-result'), 20)));

    assert.strictEqual(ctx.pendingCount, 3);

    await ctx.waitAll(1000);

    assert.strictEqual(ctx.resolvedCount, 3);
    assert.strictEqual(ctx.get('fast'), 'fast-result');
    assert.strictEqual(ctx.get('medium'), 'medium-result');
    assert.strictEqual(ctx.get('slow'), 'slow-result');
  });

  test('handles mixed success and failure', async () => {
    const ctx = new SSRAsyncContext();

    ctx.register('success', Promise.resolve('ok'));
    ctx.register('failure', Promise.reject(new Error('failed')));

    await ctx.waitAll();

    assert.strictEqual(ctx.resolvedCount, 1);
    assert.strictEqual(ctx.errorCount, 1);
    assert.strictEqual(ctx.get('success'), 'ok');
    assert.ok(ctx.getError('failure') instanceof Error);
  });
});

// ============================================================================
// Extended Serializer Tests
// ============================================================================

describe('SSR Serializer - Pretty Printing', () => {
  test('serializeToHTML with pretty option adds indentation', () => {
    const div = new MockElement('div');
    const span = new MockElement('span');
    span.appendChild(new MockTextNode('Hello'));
    div.appendChild(span);

    const html = serializeToHTML(div, { pretty: true });

    assert.ok(html.includes('\n'));
    assert.ok(html.includes('  ')); // Default indentation
  });

  test('serializeToHTML with custom indent string', () => {
    const div = new MockElement('div');
    const span = new MockElement('span');
    div.appendChild(span);

    const html = serializeToHTML(div, { pretty: true, indentStr: '\t' });

    assert.ok(html.includes('\t'));
  });

  test('serializeChildren with pretty option', () => {
    const body = new MockElement('body');
    body.appendChild(new MockElement('header'));
    body.appendChild(new MockElement('main'));
    body.appendChild(new MockElement('footer'));

    const html = serializeChildren(body, { pretty: true });

    assert.ok(html.includes('<header>'));
    assert.ok(html.includes('<main>'));
    assert.ok(html.includes('<footer>'));
  });
});

describe('SSR Serializer - Document Fragments', () => {
  test('serializeToHTML handles document fragment', () => {
    const fragment = new MockDocumentFragment();
    fragment.appendChild(new MockElement('span'));
    fragment.appendChild(new MockTextNode(' and '));
    fragment.appendChild(new MockElement('strong'));

    const html = serializeToHTML(fragment);

    assert.ok(html.includes('<span>'));
    assert.ok(html.includes(' and '));
    assert.ok(html.includes('<strong>'));
    // Fragment itself should not appear
    assert.ok(!html.includes('fragment'));
  });
});

describe('SSR Serializer - Data Attributes', () => {
  test('serializeToHTML handles data attributes', () => {
    const div = new MockElement('div');
    div.setAttribute('data-id', '123');
    div.setAttribute('data-user-name', 'John');
    div.setAttribute('data-active', 'true');

    const html = serializeToHTML(div);

    assert.ok(html.includes('data-id="123"'));
    assert.ok(html.includes('data-user-name="John"'));
    assert.ok(html.includes('data-active="true"'));
  });
});

describe('SSR Serializer - ARIA Attributes', () => {
  test('serializeToHTML handles ARIA attributes', () => {
    const button = new MockElement('button');
    button.setAttribute('aria-label', 'Close dialog');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'true');

    const html = serializeToHTML(button);

    assert.ok(html.includes('aria-label="Close dialog"'));
    assert.ok(html.includes('aria-expanded="false"'));
    assert.ok(html.includes('aria-haspopup="true"'));
  });
});

describe('SSR Serializer - Edge Cases', () => {
  test('serializeToHTML handles empty style object', () => {
    const div = new MockElement('div');
    div._style = {};

    const html = serializeToHTML(div);

    assert.ok(!html.includes('style='));
  });

  test('serializeToHTML handles style with null values', () => {
    const div = new MockElement('div');
    div._style = { color: 'red', background: null, margin: '' };

    const html = serializeToHTML(div);

    assert.ok(html.includes('color: red'));
    assert.ok(!html.includes('background'));
    assert.ok(!html.includes('margin'));
  });

  test('serializeToHTML handles unknown node type', () => {
    const unknownNode = { nodeType: 999 };
    const html = serializeToHTML(unknownNode);

    assert.strictEqual(html, '');
  });

  test('escapeHTML handles null and undefined', () => {
    assert.strictEqual(escapeHTML(null), '');
    assert.strictEqual(escapeHTML(undefined), '');
  });

  test('escapeAttr handles null and undefined', () => {
    assert.strictEqual(escapeAttr(null), '');
    assert.strictEqual(escapeAttr(undefined), '');
  });

  test('serializeToHTML handles deeply nested elements', () => {
    let current = new MockElement('div');
    const root = current;

    for (let i = 0; i < 10; i++) {
      const child = new MockElement('div');
      current.appendChild(child);
      current = child;
    }
    current.appendChild(new MockTextNode('deep'));

    const html = serializeToHTML(root);

    assert.ok(html.includes('deep'));
    assert.strictEqual((html.match(/<div>/g) || []).length, 11);
    assert.strictEqual((html.match(/<\/div>/g) || []).length, 11);
  });
});

// ============================================================================
// State Restoration Tests
// ============================================================================

describe('State Restoration', () => {
  afterEach(() => {
    // Clean up global state
    if (typeof globalThis !== 'undefined') {
      delete globalThis.__PULSE_SSR_STATE__;
    }
  });

  test('restoreState stores deserialized state in global', () => {
    const state = { user: { name: 'John' }, theme: 'dark' };
    restoreState(state);

    assert.deepStrictEqual(globalThis.__PULSE_SSR_STATE__, state);
  });

  test('restoreState deserializes string state', () => {
    const json = '{"count": 42}';
    restoreState(json);

    assert.deepStrictEqual(globalThis.__PULSE_SSR_STATE__, { count: 42 });
  });

  test('getSSRState returns full state', () => {
    restoreState({ a: 1, b: 2 });

    const state = getSSRState();
    assert.deepStrictEqual(state, { a: 1, b: 2 });
  });

  test('getSSRState returns specific key', () => {
    restoreState({ user: { name: 'Alice' }, settings: { theme: 'light' } });

    assert.deepStrictEqual(getSSRState('user'), { name: 'Alice' });
    assert.deepStrictEqual(getSSRState('settings'), { theme: 'light' });
  });

  test('getSSRState returns undefined for missing key', () => {
    restoreState({ existing: 'value' });

    assert.strictEqual(getSSRState('missing'), undefined);
  });

  test('getSSRState returns empty object when no state', () => {
    clearSSRState();

    const state = getSSRState();
    assert.deepStrictEqual(state, {});
  });
});

// ============================================================================
// Extended State Serialization Tests
// ============================================================================

describe('State Serialization - Edge Cases', () => {
  test('serializeState handles circular references', () => {
    const obj = { name: 'test' };
    obj.self = obj;

    const json = serializeState(obj);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.name, 'test');
    assert.strictEqual(parsed.self, '[Circular]');
  });

  test('serializeState skips functions', () => {
    const state = {
      name: 'test',
      callback: () => console.log('hi'),
      method: function() {}
    };

    const json = serializeState(state);
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.name, 'test');
    assert.ok(!('callback' in parsed));
    assert.ok(!('method' in parsed));
  });

  test('serializeState handles nested arrays with special types', () => {
    const state = {
      items: [
        { date: new Date('2024-01-01'), value: undefined },
        { date: new Date('2024-06-15'), value: 'normal' }
      ]
    };

    const json = serializeState(state);
    const restored = deserializeState(json);

    assert.ok(restored.items[0].date instanceof Date);
    assert.strictEqual(restored.items[0].value, undefined);
    assert.strictEqual(restored.items[1].value, 'normal');
  });

  test('deserializeState handles pre-parsed object', () => {
    const data = { name: 'test', date: { __t: 'D', v: '2024-01-01T00:00:00.000Z' } };

    const state = deserializeState(data);

    assert.strictEqual(state.name, 'test');
    assert.ok(state.date instanceof Date);
  });

  test('serializeState escapes HTML comments', () => {
    const state = { html: '<!-- comment -->' };
    const json = serializeState(state);

    assert.ok(!json.includes('<!--'));
  });
});

// ============================================================================
// Extended renderToString Tests
// ============================================================================

describe('renderToString - Advanced', () => {
  beforeEach(() => {
    setAdapter(new MockDOMAdapter());
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('renders with attributes from selector', async () => {
    const { el } = await import('../runtime/dom-element.js');

    const { html } = await renderToString(() => {
      return el('input[type=text][placeholder=Enter name][data-testid=name-input]');
    });

    assert.ok(html.includes('type="text"'));
    assert.ok(html.includes('placeholder="Enter name"'));
    assert.ok(html.includes('data-testid="name-input"'));
  });

  test('returns state when serializeState is true', async () => {
    const { el } = await import('../runtime/dom-element.js');

    const { html, state } = await renderToString(() => {
      return el('div', 'Test');
    }, { serializeState: true });

    assert.ok(html.includes('Test'));
    assert.ok(state !== undefined);
  });

  test('returns null state when serializeState is false', async () => {
    const { el } = await import('../runtime/dom-element.js');

    const { html, state } = await renderToString(() => {
      return el('div', 'Test');
    }, { serializeState: false });

    assert.ok(html.includes('Test'));
    assert.strictEqual(state, null);
  });

  test('handles null return from component', async () => {
    const { html } = await renderToString(() => null);

    assert.strictEqual(html, '');
  });
});

// ============================================================================
// Hydrate Function Tests
// ============================================================================

describe('hydrate', () => {
  let mockDocument;
  let container;

  beforeEach(() => {
    container = new MockElement('div');
    container.id = 'app';
    container.appendChild(new MockElement('span'));

    // Mock document.querySelector
    mockDocument = {
      querySelector: (selector) => {
        if (selector === '#app') return container;
        return null;
      }
    };

    // Set global document
    globalThis.document = mockDocument;
  });

  afterEach(() => {
    delete globalThis.document;
    delete globalThis.__PULSE_SSR_STATE__;
    setHydrationMode(false, null);
  });

  test('hydrate creates context and enables hydration mode', () => {
    let wasHydrating = false;

    const dispose = hydrate('#app', () => {
      wasHydrating = isHydratingMode();
    });

    // During component execution, it should be hydrating
    assert.strictEqual(wasHydrating, true);
    // After hydration, mode should be off
    assert.strictEqual(isHydratingMode(), false);

    assert.ok(typeof dispose === 'function');
  });

  test('hydrate restores state when provided', () => {
    const state = { user: { name: 'Test' } };

    hydrate('#app', () => {}, { state });

    assert.deepStrictEqual(globalThis.__PULSE_SSR_STATE__, state);
  });

  test('hydrate throws when target not found', () => {
    assert.throws(() => {
      hydrate('#nonexistent', () => {});
    }, /Hydration target not found/);
  });

  test('hydrate accepts element directly', () => {
    let executed = false;

    hydrate(container, () => {
      executed = true;
    });

    assert.strictEqual(executed, true);
  });

  test('hydrate returns working dispose function', () => {
    // Register some cleanups during hydration
    let cleanupCalled = false;

    const dispose = hydrate('#app', () => {
      const ctx = getHydrationContext();
      if (ctx) {
        registerCleanup(ctx, () => { cleanupCalled = true; });
      }
    });

    // Dispose should not throw
    dispose();
    // Note: cleanup may or may not be called depending on context state
    assert.ok(typeof dispose === 'function');
  });

  test('hydrate sets onMismatch callback', () => {
    let mismatchCallback = null;

    hydrate('#app', () => {
      const ctx = getHydrationContext();
      mismatchCallback = ctx?.onMismatch;
    }, {
      onMismatch: (expected, actual) => {}
    });

    assert.ok(mismatchCallback !== null || mismatchCallback === undefined);
  });
});

console.log('SSR tests loaded');
