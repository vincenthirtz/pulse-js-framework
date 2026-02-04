/**
 * SSR Module Tests
 *
 * Tests for server-side rendering and hydration functionality.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { serializeToHTML, serializeChildren, escapeHTML, escapeAttr } from '../runtime/ssr-serializer.js';
import { SSRAsyncContext, setSSRAsyncContext, getSSRAsyncContext } from '../runtime/ssr-async.js';
import {
  createHydrationContext,
  setHydrationMode,
  isHydratingMode,
  getCurrentNode,
  advanceCursor
} from '../runtime/ssr-hydrator.js';
import { renderToString, renderToStringSync, serializeState, deserializeState, isSSR } from '../runtime/ssr.js';
import { MockElement, MockTextNode, MockCommentNode, MockDOMAdapter, setAdapter, resetAdapter } from '../runtime/dom-adapter.js';
import { pulse, effect, createContext, resetContext } from '../runtime/pulse.js';

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

console.log('SSR tests loaded');
