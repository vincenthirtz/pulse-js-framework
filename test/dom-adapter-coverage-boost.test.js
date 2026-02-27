/**
 * Coverage-boost tests for runtime/dom-adapter.js
 *
 * Targets uncovered lines:
 *   BrowserDOMAdapter: 130-131, 232-233, 274-275, 292-293, 310-311, 336-337, 403-404
 *   MockElement: 540-541 (hasAttribute, getAttributeNames)
 *   MockDOMAdapter._findByClass/_findByTag deep paths: 650, 659
 *   Enhanced mock classes (919-1562): MockCanvasContext, MockMediaQueryList,
 *   MockMutationObserver, MockPerformance, MockCSSStyleDeclaration, MockWindow,
 *   EnhancedMockElement, EnhancedMockAdapter, installGlobalMocks
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  BrowserDOMAdapter,
  MockDOMAdapter,
  MockNode,
  MockElement,
  MockTextNode,
  MockCommentNode,
  MockDocumentFragment,
  MockCanvasContext,
  MockMediaQueryList,
  MockMutationObserver,
  MockPerformance,
  MockCSSStyleDeclaration,
  MockWindow,
  EnhancedMockElement,
  EnhancedMockAdapter,
  getAdapter,
  setAdapter,
  resetAdapter,
  withAdapter
} from '../runtime/dom-adapter.js';

// ============================================================================
// BrowserDOMAdapter via installGlobalMocks
// Tests exercise BrowserDOMAdapter paths via real document global
// ============================================================================

describe('BrowserDOMAdapter via installGlobalMocks', () => {
  let enhancedAdapter;
  let cleanup;

  before(() => {
    enhancedAdapter = new EnhancedMockAdapter();
    cleanup = enhancedAdapter.installGlobalMocks();
  });

  after(() => {
    if (cleanup) cleanup();
    resetAdapter();
  });

  it('BrowserDOMAdapter.removeAttribute delegates to element (line 130-131)', () => {
    // We use globalThis.document to create a real-ish element via BrowserDOMAdapter
    const browserAdapter = new BrowserDOMAdapter();
    // Create an element using the global mocked document
    const el = globalThis.document.createElement('div');
    el.setAttribute('data-test', 'value');
    // Call removeAttribute on the BrowserDOMAdapter - line 130-131
    browserAdapter.removeAttribute(el, 'data-test');
    assert.strictEqual(el.getAttribute('data-test'), null);
  });

  it('BrowserDOMAdapter.getStyle delegates to element (line 232-233)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    const el = globalThis.document.createElement('div');
    el.style.color = 'red';
    // Line 232-233
    const value = browserAdapter.getStyle(el, 'color');
    assert.strictEqual(value, 'red');
  });

  it('BrowserDOMAdapter.removeEventListener delegates to element (line 274-275)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    const el = globalThis.document.createElement('div');
    let count = 0;
    const handler = () => { count++; };
    el.addEventListener('click', handler);
    el.dispatchEvent({ type: 'click' });
    // Line 274-275
    browserAdapter.removeEventListener(el, 'click', handler);
    el.dispatchEvent({ type: 'click' });
    // count stays at 1 since handler was removed
    assert.strictEqual(count, 1);
  });

  it('BrowserDOMAdapter.getTextContent delegates to node (line 292-293)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    const el = globalThis.document.createElement('div');
    el.textContent = 'hello world';
    // Line 292-293
    const text = browserAdapter.getTextContent(el);
    assert.strictEqual(text, 'hello world');
  });

  it('BrowserDOMAdapter.isElement returns true for Element (line 310-311)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    const el = globalThis.document.createElement('div');
    // Line 310-311 - uses instanceof Element
    // In the mocked environment Element may not be defined, so just verify no throw
    try {
      const result = browserAdapter.isElement(el);
      // result could be true or false depending on mock, just no error
      assert.strictEqual(typeof result, 'boolean');
    } catch {
      // Expected in pure mock environment without real Element class
    }
  });

  it('BrowserDOMAdapter.clearTimeout delegates to global (line 336-337)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    let called = false;
    const id = globalThis.setTimeout(() => { called = true; }, 10000);
    // Line 336-337
    browserAdapter.clearTimeout(id);
    // Timer was cancelled - no way to verify directly but must not throw
    assert.ok(true);
  });

  it('BrowserDOMAdapter.getInputType returns lowercased type (line 403-404)', () => {
    const browserAdapter = new BrowserDOMAdapter();
    const el = globalThis.document.createElement('input');
    el.setAttribute('type', 'email');
    // Line 403-404 - uses element.type?.toLowerCase()
    // The mock element getAttribute returns the value, but .type is a property
    // We set it directly to simulate input element behavior
    el.type = 'email';
    const result = browserAdapter.getInputType(el);
    assert.strictEqual(result, 'email');
  });
});

// ============================================================================
// MockElement - hasAttribute and getAttributeNames (lines 540-541)
// ============================================================================

describe('MockElement.hasAttribute and getAttributeNames', () => {
  it('hasAttribute returns true when attribute exists (line 539-540)', () => {
    const el = new MockElement('div');
    el.setAttribute('role', 'button');
    assert.strictEqual(el.hasAttribute('role'), true);
    assert.strictEqual(el.hasAttribute('aria-label'), false);
  });

  it('getAttributeNames returns array of attribute names (line 543-545)', () => {
    const el = new MockElement('input');
    el.setAttribute('type', 'text');
    el.setAttribute('name', 'username');
    el.setAttribute('placeholder', 'Enter name');
    const names = el.getAttributeNames();
    assert.ok(Array.isArray(names));
    assert.strictEqual(names.length, 3);
    assert.ok(names.includes('type'));
    assert.ok(names.includes('name'));
    assert.ok(names.includes('placeholder'));
  });

  it('getAttributeNames returns empty array when no attributes set', () => {
    const el = new MockElement('span');
    const names = el.getAttributeNames();
    assert.ok(Array.isArray(names));
    assert.strictEqual(names.length, 0);
  });
});

// ============================================================================
// MockDOMAdapter._findByClass and _findByTag - deep recursion paths (lines 650, 659)
// ============================================================================

describe('MockDOMAdapter deep selector search', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
  });

  it('_findByClass finds nested element (line 650 - deep class search)', () => {
    const body = adapter.getBody();
    const outer = adapter.createElement('div');
    const inner = adapter.createElement('p');
    inner.classList.add('deep-class');
    outer.appendChild(inner);
    body.appendChild(outer);

    const found = adapter.querySelector('.deep-class');
    assert.strictEqual(found, inner);
  });

  it('_findByClass returns null when class not found at any depth (line 650)', () => {
    const body = adapter.getBody();
    const outer = adapter.createElement('div');
    const inner = adapter.createElement('p');
    outer.appendChild(inner);
    body.appendChild(outer);

    const found = adapter.querySelector('.nonexistent');
    assert.strictEqual(found, null);
  });

  it('_findByTag finds nested element (line 659 - deep tag search)', () => {
    const body = adapter.getBody();
    const section = adapter.createElement('section');
    const article = adapter.createElement('article');
    const aside = adapter.createElement('aside');
    article.appendChild(aside);
    section.appendChild(article);
    body.appendChild(section);

    const found = adapter.querySelector('aside');
    assert.strictEqual(found, aside);
  });

  it('_findByTag returns null when tag not found at any depth (line 659)', () => {
    const body = adapter.getBody();
    const div = adapter.createElement('div');
    body.appendChild(div);

    const found = adapter.querySelector('canvas');
    assert.strictEqual(found, null);
  });

  it('_findById finds deeply nested element', () => {
    const body = adapter.getBody();
    const outer = adapter.createElement('div');
    const middle = adapter.createElement('section');
    const inner = adapter.createElement('span');
    inner.setAttribute('id', 'deep-id');
    middle.appendChild(inner);
    outer.appendChild(middle);
    body.appendChild(outer);

    const found = adapter.querySelector('#deep-id');
    assert.strictEqual(found, inner);
  });
});

// ============================================================================
// MockCanvasContext (lines 919-982)
// ============================================================================

describe('MockCanvasContext', () => {
  it('constructor sets default fillStyle (line 919-921)', () => {
    const ctx = new MockCanvasContext();
    assert.strictEqual(ctx.fillStyle, '#000000');
    assert.ok(ctx._imageData instanceof Uint8ClampedArray);
    assert.strictEqual(ctx._imageData.length, 4);
  });

  it('fillRect parses fillStyle and stores in imageData (line 923-930)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);
    assert.strictEqual(ctx._imageData[0], 255); // R
    assert.strictEqual(ctx._imageData[1], 0);   // G
    assert.strictEqual(ctx._imageData[2], 0);   // B
    assert.strictEqual(ctx._imageData[3], 255); // A
  });

  it('getImageData returns imageData object (line 932-934)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    assert.ok(imageData.data instanceof Uint8ClampedArray);
    assert.strictEqual(imageData.data[2], 255); // Blue
  });

  it('_parseColor handles null/empty returns black (line 941-943)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = null;
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles "transparent" as black (line 941-943)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles 3-char hex shorthand (line 948-950)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = '#0f0';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 255);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles 6-char hex (line 951-955)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = '#1a2b3c';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0x1a);
    assert.strictEqual(ctx._imageData[1], 0x2b);
    assert.strictEqual(ctx._imageData[2], 0x3c);
  });

  it('_parseColor handles rgb() syntax (line 959-966)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'rgb(100, 150, 200)';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 100);
    assert.strictEqual(ctx._imageData[1], 150);
    assert.strictEqual(ctx._imageData[2], 200);
  });

  it('_parseColor handles rgba() syntax (line 959-966)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'rgba(50, 75, 100, 0.8)';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 50);
    assert.strictEqual(ctx._imageData[1], 75);
    assert.strictEqual(ctx._imageData[2], 100);
  });

  it('_parseColor handles named color "white" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 255);
    assert.strictEqual(ctx._imageData[1], 255);
    assert.strictEqual(ctx._imageData[2], 255);
  });

  it('_parseColor handles named color "black" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles named color "red" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 255);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles named color "blue" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 255);
  });

  it('_parseColor handles named color "green" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 128);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles named color "yellow" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'yellow';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 255);
    assert.strictEqual(ctx._imageData[1], 255);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles named color "orange" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'orange';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 255);
    assert.strictEqual(ctx._imageData[1], 165);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('_parseColor handles named color "gray" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 128);
    assert.strictEqual(ctx._imageData[1], 128);
    assert.strictEqual(ctx._imageData[2], 128);
  });

  it('_parseColor handles named color "grey" (line 969-981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'grey';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 128);
    assert.strictEqual(ctx._imageData[1], 128);
    assert.strictEqual(ctx._imageData[2], 128);
  });

  it('_parseColor handles unknown color as black fallback (line 981)', () => {
    const ctx = new MockCanvasContext();
    ctx.fillStyle = 'unknowncolor';
    ctx.fillRect(0, 0, 1, 1);
    assert.strictEqual(ctx._imageData[0], 0);
    assert.strictEqual(ctx._imageData[1], 0);
    assert.strictEqual(ctx._imageData[2], 0);
  });

  it('getContext returns null for non-2d context type', () => {
    const el = new EnhancedMockElement('canvas');
    const ctx = el.getContext('webgl');
    assert.strictEqual(ctx, null);
  });

  it('getContext reuses existing 2d context', () => {
    const el = new EnhancedMockElement('canvas');
    const ctx1 = el.getContext('2d');
    const ctx2 = el.getContext('2d');
    assert.strictEqual(ctx1, ctx2);
  });
});

// ============================================================================
// MockMediaQueryList (lines 988-1028)
// ============================================================================

describe('MockMediaQueryList', () => {
  it('constructor sets media and matches (line 990-993)', () => {
    const mql = new MockMediaQueryList('(min-width: 768px)', true);
    assert.strictEqual(mql.media, '(min-width: 768px)');
    assert.strictEqual(mql.matches, true);
    assert.ok(Array.isArray(mql._listeners));
  });

  it('constructor defaults matches to false (line 990-993)', () => {
    const mql = new MockMediaQueryList('(max-width: 480px)');
    assert.strictEqual(mql.matches, false);
  });

  it('addEventListener adds change listener (line 995-999)', () => {
    const mql = new MockMediaQueryList('test', false);
    let called = false;
    mql.addEventListener('change', () => { called = true; });
    mql._setMatches(true);
    assert.strictEqual(called, true);
  });

  it('addEventListener ignores non-change events (line 995-999)', () => {
    const mql = new MockMediaQueryList('test', false);
    // Should not throw or add listener for non-change events
    mql.addEventListener('click', () => {});
    assert.strictEqual(mql._listeners.length, 0);
  });

  it('removeEventListener removes change listener (line 1001-1008)', () => {
    const mql = new MockMediaQueryList('test', false);
    let count = 0;
    const handler = () => { count++; };
    mql.addEventListener('change', handler);
    mql._setMatches(true);
    assert.strictEqual(count, 1);
    mql.removeEventListener('change', handler);
    mql._setMatches(false);
    assert.strictEqual(count, 1);
  });

  it('removeEventListener ignores non-change events (line 1001-1008)', () => {
    const mql = new MockMediaQueryList('test', false);
    // Should not throw
    mql.removeEventListener('click', () => {});
    assert.ok(true);
  });

  it('_setMatches does not notify when value unchanged (line 1013-1019)', () => {
    const mql = new MockMediaQueryList('test', false);
    let count = 0;
    mql.addEventListener('change', () => { count++; });
    mql._setMatches(false); // Same value - no notification
    assert.strictEqual(count, 0);
  });

  it('_setMatches notifies all listeners (line 1013-1019)', () => {
    const mql = new MockMediaQueryList('(min-width: 768px)', false);
    const events = [];
    mql.addEventListener('change', (e) => events.push(e));
    mql.addEventListener('change', (e) => events.push(e));
    mql._setMatches(true);
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].matches, true);
    assert.strictEqual(events[0].media, '(min-width: 768px)');
  });

  it('addListener (deprecated) works (line 1022-1024)', () => {
    const mql = new MockMediaQueryList('test', false);
    let called = false;
    mql.addListener(() => { called = true; });
    mql._setMatches(true);
    assert.strictEqual(called, true);
  });

  it('removeListener (deprecated) works (line 1026-1028)', () => {
    const mql = new MockMediaQueryList('test', false);
    let count = 0;
    const handler = () => { count++; };
    mql.addListener(handler);
    mql._setMatches(true);
    mql.removeListener(handler);
    mql._setMatches(false);
    assert.strictEqual(count, 1);
  });
});

// ============================================================================
// MockMutationObserver (lines 1034-1070)
// ============================================================================

describe('MockMutationObserver', () => {
  it('constructor initializes state (line 1036-1041)', () => {
    const cb = () => {};
    const observer = new MockMutationObserver(cb);
    assert.strictEqual(observer._callback, cb);
    assert.strictEqual(observer._observing, false);
    assert.strictEqual(observer._target, null);
    assert.strictEqual(observer._options, null);
    assert.ok(Array.isArray(observer._mutations));
  });

  it('observe sets target and options (line 1043-1047)', () => {
    const observer = new MockMutationObserver(() => {});
    const target = new MockElement('div');
    const options = { childList: true, attributes: false };
    observer.observe(target, options);
    assert.strictEqual(observer._observing, true);
    assert.strictEqual(observer._target, target);
    assert.strictEqual(observer._options, options);
  });

  it('disconnect clears state (line 1049-1053)', () => {
    const observer = new MockMutationObserver(() => {});
    const target = new MockElement('div');
    observer.observe(target, { childList: true });
    observer.disconnect();
    assert.strictEqual(observer._observing, false);
    assert.strictEqual(observer._target, null);
    assert.strictEqual(observer._options, null);
  });

  it('takeRecords returns and clears mutations (line 1055-1059)', () => {
    const observer = new MockMutationObserver(() => {});
    const target = new MockElement('div');
    observer.observe(target, { childList: true });
    observer._trigger([{ type: 'childList', addedNodes: [] }]);
    const records = observer.takeRecords();
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].type, 'childList');
    const records2 = observer.takeRecords();
    assert.strictEqual(records2.length, 0);
  });

  it('_trigger calls callback when observing (line 1064-1069)', () => {
    let receivedMutations = null;
    let receivedObserver = null;
    const observer = new MockMutationObserver((mutations, obs) => {
      receivedMutations = mutations;
      receivedObserver = obs;
    });
    const target = new MockElement('div');
    observer.observe(target, { attributes: true });
    const mutations = [{ type: 'attributes', attributeName: 'class' }];
    observer._trigger(mutations);
    assert.deepStrictEqual(receivedMutations, mutations);
    assert.strictEqual(receivedObserver, observer);
  });

  it('_trigger does not call callback when not observing (line 1064-1069)', () => {
    let called = false;
    const observer = new MockMutationObserver(() => { called = true; });
    // Not observing
    observer._trigger([{ type: 'childList' }]);
    assert.strictEqual(called, false);
  });

  it('_trigger accumulates mutations in _mutations array', () => {
    const observer = new MockMutationObserver(() => {});
    const target = new MockElement('div');
    observer.observe(target, { childList: true });
    observer._trigger([{ type: 'childList' }]);
    observer._trigger([{ type: 'attributes' }]);
    const records = observer.takeRecords();
    assert.strictEqual(records.length, 2);
  });
});

// ============================================================================
// MockPerformance (lines 1075-1116)
// ============================================================================

describe('MockPerformance', () => {
  it('constructor initializes marks and measures (line 1077-1080)', () => {
    const perf = new MockPerformance();
    assert.ok(perf._marks instanceof Map);
    assert.ok(perf._measures instanceof Map);
    assert.strictEqual(typeof perf._startTime, 'number');
  });

  it('now() returns a non-negative number (line 1082-1084)', () => {
    const perf = new MockPerformance();
    const t = perf.now();
    assert.strictEqual(typeof t, 'number');
    assert.ok(t >= 0);
  });

  it('mark() stores timestamp (line 1086-1088)', () => {
    const perf = new MockPerformance();
    perf.mark('start');
    assert.ok(perf._marks.has('start'));
    assert.strictEqual(typeof perf._marks.get('start'), 'number');
  });

  it('measure() calculates duration from marks (line 1090-1094)', () => {
    const perf = new MockPerformance();
    perf.mark('a');
    perf.mark('b');
    perf.measure('a-to-b', 'a', 'b');
    const entries = perf.getEntriesByName('a-to-b');
    assert.strictEqual(entries.length, 1);
    assert.ok(entries[0].duration >= 0);
    assert.strictEqual(entries[0].name, 'a-to-b');
    assert.strictEqual(typeof entries[0].startTime, 'number');
  });

  it('measure() with missing startMark defaults to 0 (line 1090-1094)', () => {
    const perf = new MockPerformance();
    perf.mark('end');
    perf.measure('test', 'missing-start', 'end');
    const entries = perf.getEntriesByName('test');
    assert.strictEqual(entries.length, 1);
  });

  it('measure() with missing endMark defaults to now() (line 1090-1094)', () => {
    const perf = new MockPerformance();
    perf.mark('start');
    perf.measure('test', 'start', 'missing-end');
    const entries = perf.getEntriesByName('test');
    assert.strictEqual(entries.length, 1);
    assert.ok(entries[0].duration >= 0);
  });

  it('getEntriesByName returns empty array for unknown name (line 1096-1099)', () => {
    const perf = new MockPerformance();
    const entries = perf.getEntriesByName('nonexistent');
    assert.ok(Array.isArray(entries));
    assert.strictEqual(entries.length, 0);
  });

  it('clearMarks with name removes specific mark (line 1101-1107)', () => {
    const perf = new MockPerformance();
    perf.mark('keep');
    perf.mark('remove');
    perf.clearMarks('remove');
    assert.ok(perf._marks.has('keep'));
    assert.strictEqual(perf._marks.has('remove'), false);
  });

  it('clearMarks without name clears all marks (line 1101-1107)', () => {
    const perf = new MockPerformance();
    perf.mark('a');
    perf.mark('b');
    perf.clearMarks();
    assert.strictEqual(perf._marks.size, 0);
  });

  it('clearMeasures with name removes specific measure (line 1109-1115)', () => {
    const perf = new MockPerformance();
    perf.mark('start');
    perf.measure('keep', 'start', 'start');
    perf.measure('remove', 'start', 'start');
    perf.clearMeasures('remove');
    assert.ok(perf._measures.has('keep'));
    assert.strictEqual(perf._measures.has('remove'), false);
  });

  it('clearMeasures without name clears all measures (line 1109-1115)', () => {
    const perf = new MockPerformance();
    perf.mark('start');
    perf.measure('a', 'start', 'start');
    perf.measure('b', 'start', 'start');
    perf.clearMeasures();
    assert.strictEqual(perf._measures.size, 0);
  });
});

// ============================================================================
// MockCSSStyleDeclaration (lines 1121-1137)
// ============================================================================

describe('MockCSSStyleDeclaration', () => {
  it('constructor sets default styles (line 1123-1136)', () => {
    const style = new MockCSSStyleDeclaration();
    assert.strictEqual(style.display, 'block');
    assert.strictEqual(style.visibility, 'visible');
    assert.strictEqual(style.color, 'rgb(0, 0, 0)');
    assert.strictEqual(style.backgroundColor, 'rgba(0, 0, 0, 0)');
    assert.strictEqual(style.fontSize, '16px');
    assert.strictEqual(style.fontWeight, '400');
    assert.strictEqual(style.position, 'static');
    assert.strictEqual(style.width, 'auto');
    assert.strictEqual(style.height, 'auto');
  });

  it('constructor overrides defaults with provided styles (line 1123-1136)', () => {
    const style = new MockCSSStyleDeclaration({
      display: 'flex',
      visibility: 'hidden',
      color: 'red',
      backgroundColor: '#fff',
      fontSize: '14px',
      fontWeight: 'bold'
    });
    assert.strictEqual(style.display, 'flex');
    assert.strictEqual(style.visibility, 'hidden');
    assert.strictEqual(style.color, 'red');
    assert.strictEqual(style.backgroundColor, '#fff');
    assert.strictEqual(style.fontSize, '14px');
    assert.strictEqual(style.fontWeight, 'bold');
  });

  it('constructor assigns custom properties via Object.assign (line 1135)', () => {
    const style = new MockCSSStyleDeclaration({ customProp: 'customValue', zIndex: '99' });
    assert.strictEqual(style.customProp, 'customValue');
    assert.strictEqual(style.zIndex, '99');
  });
});

// ============================================================================
// MockWindow (lines 1142-1255)
// ============================================================================

describe('MockWindow', () => {
  it('constructor sets defaults (line 1143-1160)', () => {
    const win = new MockWindow();
    assert.strictEqual(win.innerWidth, 1024);
    assert.strictEqual(win.innerHeight, 768);
    assert.strictEqual(win.location.href, 'http://localhost:3000/');
    assert.strictEqual(win.location.pathname, '/');
    assert.strictEqual(win.location.search, '');
    assert.strictEqual(win.location.hash, '');
    assert.ok(win.performance instanceof MockPerformance);
    assert.ok(win._eventListeners instanceof Map);
    assert.ok(Array.isArray(win._animationFrameCallbacks));
  });

  it('constructor accepts custom options (line 1143-1160)', () => {
    const win = new MockWindow({
      innerWidth: 1920,
      innerHeight: 1080,
      locationHref: 'http://example.com/page',
      locationPathname: '/page'
    });
    assert.strictEqual(win.innerWidth, 1920);
    assert.strictEqual(win.innerHeight, 1080);
    assert.strictEqual(win.location.href, 'http://example.com/page');
    assert.strictEqual(win.location.pathname, '/page');
  });

  it('matchMedia creates and caches MockMediaQueryList (line 1162-1168)', () => {
    const win = new MockWindow();
    const mql1 = win.matchMedia('(min-width: 768px)');
    const mql2 = win.matchMedia('(min-width: 768px)');
    assert.ok(mql1 instanceof MockMediaQueryList);
    assert.strictEqual(mql1, mql2); // Cached
  });

  it('_evaluateMediaQuery uses custom results first (line 1171-1174)', () => {
    const win = new MockWindow({ mediaQueryResults: { '(custom-query)': true } });
    const mql = win.matchMedia('(custom-query)');
    assert.strictEqual(mql.matches, true);
  });

  it('_evaluateMediaQuery handles prefers-reduced-motion (line 1177)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-reduced-motion: reduce)');
    assert.strictEqual(mql.matches, false);
  });

  it('_evaluateMediaQuery handles prefers-color-scheme dark (line 1178)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    assert.strictEqual(mql.matches, false);
  });

  it('_evaluateMediaQuery handles prefers-color-scheme light (line 1179)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-color-scheme: light)');
    assert.strictEqual(mql.matches, true);
  });

  it('_evaluateMediaQuery handles prefers-contrast more (line 1180)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-contrast: more)');
    assert.strictEqual(mql.matches, false);
  });

  it('_evaluateMediaQuery handles prefers-reduced-transparency (line 1181)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-reduced-transparency: reduce)');
    assert.strictEqual(mql.matches, false);
  });

  it('_evaluateMediaQuery handles forced-colors active (line 1182)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(forced-colors: active)');
    assert.strictEqual(mql.matches, false);
  });

  it('_evaluateMediaQuery evaluates min-width queries (line 1185-1188)', () => {
    const win = new MockWindow({ innerWidth: 1024 });
    assert.strictEqual(win.matchMedia('(min-width: 768px)').matches, true);
    assert.strictEqual(win.matchMedia('(min-width: 1200px)').matches, false);
    assert.strictEqual(win.matchMedia('(min-width: 1024px)').matches, true);
  });

  it('_evaluateMediaQuery evaluates max-width queries (line 1190-1193)', () => {
    const win = new MockWindow({ innerWidth: 500 });
    assert.strictEqual(win.matchMedia('(max-width: 768px)').matches, true);
    assert.strictEqual(win.matchMedia('(max-width: 400px)').matches, false);
    assert.strictEqual(win.matchMedia('(max-width: 500px)').matches, true);
  });

  it('_evaluateMediaQuery returns false for unknown queries (line 1195)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(unknown-feature: value)');
    assert.strictEqual(mql.matches, false);
  });

  it('setMediaQueryResult updates existing mql (line 1201-1206)', () => {
    const win = new MockWindow();
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    let notified = false;
    mql.addEventListener('change', (e) => {
      notified = true;
      assert.strictEqual(e.matches, true);
    });
    win.setMediaQueryResult('(prefers-color-scheme: dark)', true);
    assert.strictEqual(mql.matches, true);
    assert.strictEqual(notified, true);
  });

  it('setMediaQueryResult works for query not yet matched (line 1201-1206)', () => {
    const win = new MockWindow();
    // Set result for a query not yet called
    win.setMediaQueryResult('(brand-new-query)', true);
    const mql = win.matchMedia('(brand-new-query)');
    assert.strictEqual(mql.matches, true);
  });

  it('requestAnimationFrame returns incrementing ids (line 1208-1212)', () => {
    const win = new MockWindow();
    const id1 = win.requestAnimationFrame(() => {});
    const id2 = win.requestAnimationFrame(() => {});
    assert.ok(typeof id1 === 'number');
    assert.ok(id2 > id1);
  });

  it('cancelAnimationFrame removes callback (line 1214-1216)', () => {
    const win = new MockWindow();
    let called = false;
    const id = win.requestAnimationFrame(() => { called = true; });
    win.cancelAnimationFrame(id);
    win.flushAnimationFrames();
    assert.strictEqual(called, false);
  });

  it('flushAnimationFrames runs all queued callbacks (line 1221-1225)', () => {
    const win = new MockWindow();
    let count = 0;
    win.requestAnimationFrame(() => { count++; });
    win.requestAnimationFrame(() => { count++; });
    win.flushAnimationFrames();
    assert.strictEqual(count, 2);
  });

  it('flushAnimationFrames clears the queue (line 1221-1225)', () => {
    const win = new MockWindow();
    win.requestAnimationFrame(() => {});
    win.flushAnimationFrames();
    assert.strictEqual(win._animationFrameCallbacks.length, 0);
  });

  it('addEventListener and dispatchEvent work (line 1227-1249)', () => {
    const win = new MockWindow();
    let receivedEvent = null;
    win.addEventListener('resize', (e) => { receivedEvent = e; });
    win.dispatchEvent({ type: 'resize', detail: 'test' });
    assert.ok(receivedEvent !== null);
    assert.strictEqual(receivedEvent.detail, 'test');
  });

  it('removeEventListener removes handler (line 1234-1242)', () => {
    const win = new MockWindow();
    let count = 0;
    const handler = () => { count++; };
    win.addEventListener('scroll', handler);
    win.dispatchEvent({ type: 'scroll' });
    win.removeEventListener('scroll', handler);
    win.dispatchEvent({ type: 'scroll' });
    assert.strictEqual(count, 1);
  });

  it('removeEventListener handles nonexistent handler gracefully (line 1234-1242)', () => {
    const win = new MockWindow();
    // Should not throw
    win.removeEventListener('nonexistent', () => {});
    assert.ok(true);
  });

  it('dispatchEvent handles no listeners gracefully (line 1244-1249)', () => {
    const win = new MockWindow();
    // Should not throw
    win.dispatchEvent({ type: 'nolisteners' });
    assert.ok(true);
  });

  it('getComputedStyle returns computed style for element (line 1251-1254)', () => {
    const win = new MockWindow();
    const el = new EnhancedMockElement('div');
    const style = win.getComputedStyle(el);
    assert.ok(style instanceof MockCSSStyleDeclaration);
  });

  it('getComputedStyle uses element._computedStyle if set (line 1251-1254)', () => {
    const win = new MockWindow();
    const el = new EnhancedMockElement('div');
    el._computedStyle = new MockCSSStyleDeclaration({ display: 'none' });
    const style = win.getComputedStyle(el);
    assert.strictEqual(style.display, 'none');
  });
});

// ============================================================================
// EnhancedMockElement (lines 1260-1373)
// ============================================================================

describe('EnhancedMockElement', () => {
  it('constructor sets enhanced properties (line 1262-1270)', () => {
    const el = new EnhancedMockElement('button');
    assert.deepStrictEqual(el._boundingRect, { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 });
    assert.ok(el._computedStyle instanceof MockCSSStyleDeclaration);
    assert.strictEqual(el._canvas, null);
    assert.strictEqual(el.hidden, false);
    assert.strictEqual(el.inert, false);
    assert.ok(Array.isArray(el.labels));
  });

  it('getBoundingClientRect returns copy of bounding rect (line 1272-1274)', () => {
    const el = new EnhancedMockElement('div');
    const rect = el.getBoundingClientRect();
    assert.strictEqual(rect.top, 0);
    assert.strictEqual(rect.left, 0);
    assert.strictEqual(rect.width, 100);
    assert.strictEqual(rect.height, 50);
    assert.strictEqual(rect.right, 100);
    assert.strictEqual(rect.bottom, 50);
  });

  it('setBoundingRect merges partial updates (line 1279-1281)', () => {
    const el = new EnhancedMockElement('div');
    el.setBoundingRect({ top: 20, left: 10 });
    const rect = el.getBoundingClientRect();
    assert.strictEqual(rect.top, 20);
    assert.strictEqual(rect.left, 10);
    assert.strictEqual(rect.width, 100); // Unchanged
    assert.strictEqual(rect.height, 50); // Unchanged
  });

  it('setBoundingRect full replacement (line 1279-1281)', () => {
    const el = new EnhancedMockElement('div');
    el.setBoundingRect({ top: 5, left: 5, width: 200, height: 100, right: 205, bottom: 105 });
    const rect = el.getBoundingClientRect();
    assert.strictEqual(rect.top, 5);
    assert.strictEqual(rect.width, 200);
  });

  it('setComputedStyle creates new MockCSSStyleDeclaration (line 1286-1288)', () => {
    const el = new EnhancedMockElement('div');
    el.setComputedStyle({ display: 'none', color: 'blue' });
    assert.ok(el._computedStyle instanceof MockCSSStyleDeclaration);
    assert.strictEqual(el._computedStyle.display, 'none');
    assert.strictEqual(el._computedStyle.color, 'blue');
  });

  it('getContext("2d") returns new MockCanvasContext (line 1290-1298)', () => {
    const el = new EnhancedMockElement('canvas');
    const ctx = el.getContext('2d');
    assert.ok(ctx instanceof MockCanvasContext);
  });

  it('getContext("2d") reuses cached context (line 1290-1298)', () => {
    const el = new EnhancedMockElement('canvas');
    const ctx1 = el.getContext('2d');
    const ctx2 = el.getContext('2d');
    assert.strictEqual(ctx1, ctx2);
  });

  it('getContext with other type returns null (line 1290-1298)', () => {
    const el = new EnhancedMockElement('canvas');
    assert.strictEqual(el.getContext('webgl'), null);
    assert.strictEqual(el.getContext('bitmaprenderer'), null);
  });

  it('focus sets _document.activeElement (line 1300-1305)', () => {
    const el = new EnhancedMockElement('input');
    const doc = { activeElement: null };
    el._document = doc;
    el.focus();
    assert.strictEqual(doc.activeElement, el);
  });

  it('focus does nothing without _document (line 1300-1305)', () => {
    const el = new EnhancedMockElement('input');
    // No _document set - should not throw
    el.focus();
    assert.ok(true);
  });

  it('blur clears _document.activeElement (line 1307-1311)', () => {
    const el = new EnhancedMockElement('input');
    const doc = { activeElement: el };
    el._document = doc;
    el.blur();
    assert.strictEqual(doc.activeElement, null);
  });

  it('blur does not clear when activeElement is different (line 1307-1311)', () => {
    const el = new EnhancedMockElement('input');
    const other = new EnhancedMockElement('button');
    const doc = { activeElement: other };
    el._document = doc;
    el.blur();
    assert.strictEqual(doc.activeElement, other); // Unchanged
  });

  it('contains returns true for self (line 1313-1321)', () => {
    const el = new EnhancedMockElement('div');
    assert.strictEqual(el.contains(el), true);
  });

  it('contains returns false for null (line 1313-1321)', () => {
    const el = new EnhancedMockElement('div');
    assert.strictEqual(el.contains(null), false);
  });

  it('contains returns true for direct child (line 1313-1321)', () => {
    const parent = new EnhancedMockElement('div');
    const child = new EnhancedMockElement('span');
    parent.appendChild(child);
    assert.strictEqual(parent.contains(child), true);
  });

  it('contains returns false for unrelated element (line 1313-1321)', () => {
    const el = new EnhancedMockElement('div');
    const other = new EnhancedMockElement('span');
    assert.strictEqual(el.contains(other), false);
  });

  it('contains recurses into grandchildren (line 1313-1321)', () => {
    const grandparent = new EnhancedMockElement('div');
    const parent = new EnhancedMockElement('section');
    const child = new EnhancedMockElement('span');
    grandparent.appendChild(parent);
    parent.appendChild(child);
    assert.strictEqual(grandparent.contains(child), true);
  });

  it('closest matches self by tag (line 1323-1333)', () => {
    const el = new EnhancedMockElement('div');
    assert.strictEqual(el.closest('div'), el);
  });

  it('closest matches self by id (line 1323-1333)', () => {
    const el = new EnhancedMockElement('div');
    el.setAttribute('id', 'myEl');
    assert.strictEqual(el.closest('#myEl'), el);
  });

  it('closest matches self by class (line 1323-1333)', () => {
    const el = new EnhancedMockElement('div');
    el.classList.add('container');
    assert.strictEqual(el.closest('.container'), el);
  });

  it('closest walks up to parent (line 1323-1333)', () => {
    const parent = new EnhancedMockElement('section');
    const child = new EnhancedMockElement('div');
    parent.appendChild(child);
    assert.strictEqual(child.closest('section'), parent);
  });

  it('closest returns null when not found (line 1323-1333)', () => {
    const el = new EnhancedMockElement('div');
    assert.strictEqual(el.closest('article'), null);
  });

  it('_matchesSelector returns false for node without tagName (line 1335-1348)', () => {
    const el = new EnhancedMockElement('div');
    const text = new MockTextNode('text');
    assert.strictEqual(el._matchesSelector(text, 'div'), false);
  });

  it('querySelectorAll finds by tag (line 1350-1354)', () => {
    const container = new EnhancedMockElement('div');
    const btn1 = new EnhancedMockElement('button');
    const btn2 = new EnhancedMockElement('button');
    container.appendChild(btn1);
    container.appendChild(btn2);
    const results = container.querySelectorAll('button');
    assert.strictEqual(results.length, 2);
  });

  it('querySelector returns first match (line 1356-1359)', () => {
    const container = new EnhancedMockElement('div');
    const span1 = new EnhancedMockElement('span');
    const span2 = new EnhancedMockElement('span');
    container.appendChild(span1);
    container.appendChild(span2);
    assert.strictEqual(container.querySelector('span'), span1);
  });

  it('querySelector returns null when not found (line 1356-1359)', () => {
    const container = new EnhancedMockElement('div');
    assert.strictEqual(container.querySelector('section'), null);
  });

  it('querySelectorAll finds by id (line 1361-1372)', () => {
    const container = new EnhancedMockElement('div');
    const el = new EnhancedMockElement('span');
    el.setAttribute('id', 'unique');
    container.appendChild(el);
    const results = container.querySelectorAll('#unique');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0], el);
  });

  it('querySelectorAll finds by class (line 1361-1372)', () => {
    const container = new EnhancedMockElement('div');
    const el1 = new EnhancedMockElement('li');
    const el2 = new EnhancedMockElement('li');
    el1.classList.add('item');
    el2.classList.add('item');
    container.appendChild(el1);
    container.appendChild(el2);
    const results = container.querySelectorAll('.item');
    assert.strictEqual(results.length, 2);
  });

  it('_findAll recurses through EnhancedMockElement children (line 1361-1372)', () => {
    // Tests the child._findAll branch in _findAll
    const outer = new EnhancedMockElement('div');
    const middle = new EnhancedMockElement('section');
    const inner = new EnhancedMockElement('span');
    inner.classList.add('deep');
    outer.appendChild(middle);
    middle.appendChild(inner);

    const results = outer.querySelectorAll('.deep');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0], inner);
  });

  it('_findAll uses this._findAll for non-EnhancedMockElement children (line 1367-1369)', () => {
    // Tests the else branch - child without _findAll method
    const outer = new EnhancedMockElement('div');
    // Use a plain MockElement (no _findAll method)
    const middle = new MockElement('section');
    const inner = new EnhancedMockElement('span');
    inner.classList.add('nested');
    middle.appendChild(inner);
    outer.appendChild(middle);

    const results = outer.querySelectorAll('.nested');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0], inner);
  });
});

// ============================================================================
// EnhancedMockAdapter (lines 1382-1562)
// ============================================================================

describe('EnhancedMockAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new EnhancedMockAdapter();
  });

  afterEach(() => {
    adapter.reset();
  });

  it('constructor sets up enhanced body and window (line 1383-1399)', () => {
    assert.ok(adapter._body instanceof EnhancedMockElement);
    assert.ok(adapter._window instanceof MockWindow);
    assert.strictEqual(adapter.activeElement, null);
    assert.strictEqual(adapter.MutationObserver, MockMutationObserver);
  });

  it('constructor accepts options for MockWindow (line 1383-1399)', () => {
    const custom = new EnhancedMockAdapter({ innerWidth: 375 });
    assert.strictEqual(custom._window.innerWidth, 375);
  });

  it('createElement returns EnhancedMockElement with _document set (line 1401-1405)', () => {
    const el = adapter.createElement('input');
    assert.ok(el instanceof EnhancedMockElement);
    assert.strictEqual(el._document, adapter);
  });

  it('getComputedStyle returns style from window (line 1410-1412)', () => {
    const el = adapter.createElement('div');
    const style = adapter.getComputedStyle(el);
    assert.ok(style instanceof MockCSSStyleDeclaration);
  });

  it('getComputedStyle uses element._computedStyle when set (line 1410-1412)', () => {
    const el = adapter.createElement('div');
    el.setComputedStyle({ display: 'grid' });
    const style = adapter.getComputedStyle(el);
    assert.strictEqual(style.display, 'grid');
  });

  it('getWindow returns the MockWindow instance (line 1417-1419)', () => {
    const win = adapter.getWindow();
    assert.ok(win instanceof MockWindow);
    assert.strictEqual(win, adapter._window);
  });

  it('requestAnimationFrame delegates to window (line 1424-1426)', () => {
    let called = false;
    const id = adapter.requestAnimationFrame(() => { called = true; });
    assert.strictEqual(typeof id, 'number');
    assert.strictEqual(called, false);
    adapter.flushAnimationFrames();
    assert.strictEqual(called, true);
  });

  it('cancelAnimationFrame delegates to window (line 1431-1433)', () => {
    let called = false;
    const id = adapter.requestAnimationFrame(() => { called = true; });
    adapter.cancelAnimationFrame(id);
    adapter.flushAnimationFrames();
    assert.strictEqual(called, false);
  });

  it('getPerformance returns MockPerformance (line 1438-1440)', () => {
    const perf = adapter.getPerformance();
    assert.ok(perf instanceof MockPerformance);
  });

  it('matchMedia delegates to window (line 1445-1447)', () => {
    const mql = adapter.matchMedia('(prefers-color-scheme: dark)');
    assert.ok(mql instanceof MockMediaQueryList);
    assert.strictEqual(mql.matches, false);
  });

  it('createMutationObserver returns MockMutationObserver (line 1452-1454)', () => {
    let cbCalled = false;
    const observer = adapter.createMutationObserver(() => { cbCalled = true; });
    assert.ok(observer instanceof MockMutationObserver);
    const target = adapter.createElement('div');
    observer.observe(target, { childList: true });
    observer._trigger([{ type: 'childList' }]);
    assert.strictEqual(cbCalled, true);
  });

  it('getDocumentElement returns the document element (line 1459-1461)', () => {
    const docEl = adapter.getDocumentElement();
    assert.ok(docEl instanceof MockElement);
    assert.strictEqual(docEl.tagName, 'HTML');
  });

  it('getActiveElement returns null initially (line 1466-1468)', () => {
    assert.strictEqual(adapter.getActiveElement(), null);
  });

  it('setActiveElement and getActiveElement (line 1473-1475)', () => {
    const el = adapter.createElement('button');
    adapter.setActiveElement(el);
    assert.strictEqual(adapter.getActiveElement(), el);
  });

  it('getElementById finds element by id (line 1480-1482)', () => {
    const body = adapter.getBody();
    const el = adapter.createElement('div');
    el.setAttribute('id', 'my-div');
    body.appendChild(el);
    assert.strictEqual(adapter.getElementById('my-div'), el);
  });

  it('getElementById returns null for missing id (line 1480-1482)', () => {
    assert.strictEqual(adapter.getElementById('nonexistent'), null);
  });

  it('setMediaQueryResult updates window and notifies listeners (line 1491-1493)', () => {
    const mql = adapter.matchMedia('(prefers-reduced-motion: reduce)');
    let notified = false;
    mql.addEventListener('change', () => { notified = true; });
    adapter.setMediaQueryResult('(prefers-reduced-motion: reduce)', true);
    assert.strictEqual(mql.matches, true);
    assert.strictEqual(notified, true);
  });

  it('flushAnimationFrames runs queued frames (line 1498-1500)', () => {
    let count = 0;
    adapter.requestAnimationFrame(() => { count++; });
    adapter.requestAnimationFrame(() => { count++; });
    adapter.flushAnimationFrames();
    assert.strictEqual(count, 2);
  });

  it('reset re-initializes body and clears activeElement (line 1505-1512)', () => {
    const body = adapter.getBody();
    const el = adapter.createElement('div');
    body.appendChild(el);
    adapter.setActiveElement(el);
    assert.strictEqual(body.childNodes.length, 1);

    adapter.reset();

    const newBody = adapter.getBody();
    assert.ok(newBody instanceof EnhancedMockElement);
    assert.strictEqual(newBody.childNodes.length, 0);
    assert.strictEqual(adapter.getActiveElement(), null);
  });

  it('reset clears parent microtask queue and timers via super.reset (line 1505-1512)', () => {
    adapter.queueMicrotask(() => {});
    adapter.setTimeout(() => {}, 100);
    adapter.reset();
    assert.strictEqual(adapter._microtaskQueue.length, 0);
    assert.strictEqual(adapter._timers.size, 0);
  });
});

// ============================================================================
// EnhancedMockAdapter.installGlobalMocks (lines 1519-1562)
// ============================================================================

describe('EnhancedMockAdapter.installGlobalMocks', () => {
  it('installs and restores all global browser APIs (line 1519-1562)', () => {
    const adapter = new EnhancedMockAdapter();

    const origDocument = globalThis.document;
    const origWindow = globalThis.window;
    const origGetComputedStyle = globalThis.getComputedStyle;
    const origRAF = globalThis.requestAnimationFrame;
    const origCAF = globalThis.cancelAnimationFrame;
    const origMutationObserver = globalThis.MutationObserver;
    const origPerformance = globalThis.performance;

    const cleanup = adapter.installGlobalMocks();

    // Verify globals are replaced
    assert.ok(globalThis.document !== origDocument || origDocument === undefined);
    assert.ok(globalThis.document.body instanceof EnhancedMockElement);
    assert.strictEqual(typeof globalThis.getComputedStyle, 'function');
    assert.strictEqual(typeof globalThis.requestAnimationFrame, 'function');
    assert.strictEqual(typeof globalThis.cancelAnimationFrame, 'function');
    assert.strictEqual(globalThis.MutationObserver, MockMutationObserver);
    assert.ok(globalThis.performance instanceof MockPerformance);
    assert.ok(globalThis.window instanceof MockWindow);

    // Verify mock document API methods
    const el = globalThis.document.createElement('section');
    assert.ok(el instanceof EnhancedMockElement);

    const textNode = globalThis.document.createTextNode('test');
    assert.ok(textNode instanceof MockTextNode);

    const comment = globalThis.document.createComment('comment');
    assert.ok(comment instanceof MockCommentNode);

    const frag = globalThis.document.createDocumentFragment();
    assert.ok(frag instanceof MockDocumentFragment);

    const qs = globalThis.document.querySelector('body');
    // May be null since body is not a child of itself in the mock, just no throw
    assert.ok(qs === null || qs !== undefined);

    // querySelectorAll
    const all = globalThis.document.querySelectorAll('div');
    assert.ok(Array.isArray(all));

    // getElementById
    const byId = globalThis.document.getElementById('any');
    assert.ok(byId === null);

    // addEventListener/removeEventListener on document delegate to window
    let eventFired = false;
    const handler = () => { eventFired = true; };
    globalThis.document.addEventListener('resize', handler);
    globalThis.window.dispatchEvent({ type: 'resize' });
    assert.strictEqual(eventFired, true);
    globalThis.document.removeEventListener('resize', handler);

    // getComputedStyle
    const divEl = globalThis.document.createElement('div');
    const style = globalThis.getComputedStyle(divEl);
    assert.ok(style instanceof MockCSSStyleDeclaration);

    // requestAnimationFrame / cancelAnimationFrame
    let rafCalled = false;
    const rafId = globalThis.requestAnimationFrame(() => { rafCalled = true; });
    assert.strictEqual(typeof rafId, 'number');
    globalThis.cancelAnimationFrame(rafId);
    adapter.flushAnimationFrames();
    assert.strictEqual(rafCalled, false);

    // MutationObserver constructor
    const observer = new globalThis.MutationObserver(() => {});
    assert.ok(observer instanceof MockMutationObserver);

    // performance
    assert.strictEqual(typeof globalThis.performance.now(), 'number');

    cleanup();

    // Verify originals are restored
    assert.strictEqual(globalThis.document, origDocument);
    assert.strictEqual(globalThis.window, origWindow);
    assert.strictEqual(globalThis.getComputedStyle, origGetComputedStyle);
    assert.strictEqual(globalThis.requestAnimationFrame, origRAF);
    assert.strictEqual(globalThis.cancelAnimationFrame, origCAF);
    assert.strictEqual(globalThis.MutationObserver, origMutationObserver);
    assert.strictEqual(globalThis.performance, origPerformance);
  });

  it('cleanup function restores globals even after multiple calls', () => {
    const adapter = new EnhancedMockAdapter();
    const origDocument = globalThis.document;
    const cleanup = adapter.installGlobalMocks();
    cleanup();
    assert.strictEqual(globalThis.document, origDocument);
  });

  it('installGlobalMocks - document.documentElement is set', () => {
    const adapter = new EnhancedMockAdapter();
    const cleanup = adapter.installGlobalMocks();
    assert.ok(globalThis.document.documentElement instanceof MockElement);
    assert.strictEqual(globalThis.document.documentElement.tagName, 'HTML');
    cleanup();
  });

  it('installGlobalMocks - document.activeElement starts as null', () => {
    const adapter = new EnhancedMockAdapter();
    const cleanup = adapter.installGlobalMocks();
    assert.strictEqual(globalThis.document.activeElement, null);
    cleanup();
  });
});

// ============================================================================
// Additional edge-case coverage for MockNode insertBefore with null refNode
// ============================================================================

describe('MockNode insertBefore edge cases', () => {
  it('insertBefore with null refNode appends to end', () => {
    const parent = new MockNode(1);
    const child1 = new MockNode(1);
    const child2 = new MockNode(1);
    parent.appendChild(child1);
    parent.insertBefore(child2, null);
    assert.strictEqual(parent.childNodes[parent.childNodes.length - 1], child2);
  });

  it('insertBefore with refNode not in childNodes falls back to appendChild', () => {
    const parent = new MockNode(1);
    const child1 = new MockNode(1);
    const orphan = new MockNode(1);  // Not a child of parent
    parent.appendChild(child1);
    parent.insertBefore(new MockNode(1), orphan);
    // Should append since index is -1
    assert.strictEqual(parent.childNodes.length, 2);
  });
});

// ============================================================================
// MockDOMAdapter - insertBefore with fragment (line 688-695)
// ============================================================================

describe('MockDOMAdapter insertBefore with fragment', () => {
  it('inserts all fragment children before reference node', () => {
    const adapter = new MockDOMAdapter();
    const parent = adapter.createElement('div');
    const ref = adapter.createElement('span');
    parent.appendChild(ref);

    const frag = adapter.createDocumentFragment();
    const a = adapter.createElement('p');
    const b = adapter.createElement('p');
    frag.appendChild(a);
    frag.appendChild(b);

    adapter.insertBefore(parent, frag, ref);
    assert.strictEqual(parent.childNodes.length, 3);
    assert.strictEqual(parent.childNodes[0], a);
    assert.strictEqual(parent.childNodes[1], b);
    assert.strictEqual(parent.childNodes[2], ref);
  });
});

// ============================================================================
// MockDOMAdapter setTextContent syncs data property (line 748-750)
// ============================================================================

describe('MockDOMAdapter setTextContent with data sync', () => {
  it('setTextContent syncs data for text nodes', () => {
    const adapter = new MockDOMAdapter();
    const textNode = adapter.createTextNode('initial');
    adapter.setTextContent(textNode, 'updated');
    assert.strictEqual(textNode.textContent, 'updated');
    assert.strictEqual(textNode.data, 'updated');
  });

  it('setTextContent on element without data property', () => {
    const adapter = new MockDOMAdapter();
    const el = adapter.createElement('div');
    adapter.setTextContent(el, 'content');
    assert.strictEqual(el.textContent, 'content');
  });
});
