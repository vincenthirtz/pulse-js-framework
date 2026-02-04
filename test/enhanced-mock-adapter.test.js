/**
 * Tests for EnhancedMockAdapter
 * Verifies browser API mocking for a11y and devtools testing
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  EnhancedMockAdapter,
  EnhancedMockElement,
  MockCanvasContext,
  MockMediaQueryList,
  MockMutationObserver,
  MockPerformance,
  MockCSSStyleDeclaration,
  MockWindow
} from '../runtime/dom-adapter.js';

describe('EnhancedMockAdapter', () => {

  let adapter;

  beforeEach(() => {
    adapter = new EnhancedMockAdapter();
  });

  afterEach(() => {
    adapter.reset();
  });

  describe('Basic DOM Operations', () => {

    it('should create enhanced elements', () => {
      const el = adapter.createElement('div');
      assert.ok(el instanceof EnhancedMockElement);
    });

    it('should support getBoundingClientRect', () => {
      const el = adapter.createElement('div');
      const rect = el.getBoundingClientRect();
      assert.strictEqual(typeof rect.top, 'number');
      assert.strictEqual(typeof rect.left, 'number');
      assert.strictEqual(typeof rect.width, 'number');
      assert.strictEqual(typeof rect.height, 'number');
    });

    it('should allow setting bounding rect', () => {
      const el = adapter.createElement('div');
      el.setBoundingRect({ top: 100, left: 50, width: 200, height: 150 });
      const rect = el.getBoundingClientRect();
      assert.strictEqual(rect.top, 100);
      assert.strictEqual(rect.left, 50);
      assert.strictEqual(rect.width, 200);
      assert.strictEqual(rect.height, 150);
    });

  });

  describe('getComputedStyle', () => {

    it('should return computed style object', () => {
      const el = adapter.createElement('div');
      const style = adapter.getComputedStyle(el);
      assert.ok(style instanceof MockCSSStyleDeclaration);
    });

    it('should have default visible styles', () => {
      const el = adapter.createElement('div');
      const style = adapter.getComputedStyle(el);
      assert.strictEqual(style.display, 'block');
      assert.strictEqual(style.visibility, 'visible');
    });

    it('should allow setting custom computed styles', () => {
      const el = adapter.createElement('div');
      el.setComputedStyle({ display: 'none', color: 'rgb(255, 0, 0)' });
      const style = adapter.getComputedStyle(el);
      assert.strictEqual(style.display, 'none');
      assert.strictEqual(style.color, 'rgb(255, 0, 0)');
    });

  });

  describe('matchMedia', () => {

    it('should return MockMediaQueryList', () => {
      const mql = adapter.matchMedia('(prefers-color-scheme: dark)');
      assert.ok(mql instanceof MockMediaQueryList);
    });

    it('should cache media query lists', () => {
      const mql1 = adapter.matchMedia('(prefers-color-scheme: dark)');
      const mql2 = adapter.matchMedia('(prefers-color-scheme: dark)');
      assert.strictEqual(mql1, mql2);
    });

    it('should default prefers-reduced-motion to false', () => {
      const mql = adapter.matchMedia('(prefers-reduced-motion: reduce)');
      assert.strictEqual(mql.matches, false);
    });

    it('should default prefers-color-scheme: light to true', () => {
      const mql = adapter.matchMedia('(prefers-color-scheme: light)');
      assert.strictEqual(mql.matches, true);
    });

    it('should allow setting media query results', () => {
      adapter.setMediaQueryResult('(prefers-reduced-motion: reduce)', true);
      const mql = adapter.matchMedia('(prefers-reduced-motion: reduce)');
      assert.strictEqual(mql.matches, true);
    });

    it('should notify listeners on media query change', () => {
      const mql = adapter.matchMedia('(prefers-color-scheme: dark)');
      let notified = false;
      mql.addEventListener('change', (e) => {
        notified = true;
        assert.strictEqual(e.matches, true);
      });
      adapter.setMediaQueryResult('(prefers-color-scheme: dark)', true);
      assert.strictEqual(notified, true);
    });

  });

  describe('Canvas Context', () => {

    it('should provide 2d canvas context', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');
      assert.ok(ctx instanceof MockCanvasContext);
    });

    it('should parse hex colors', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1);

      assert.strictEqual(data.data[0], 255); // R
      assert.strictEqual(data.data[1], 0);   // G
      assert.strictEqual(data.data[2], 0);   // B
    });

    it('should parse short hex colors', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#0f0';
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1);

      assert.strictEqual(data.data[0], 0);   // R
      assert.strictEqual(data.data[1], 255); // G
      assert.strictEqual(data.data[2], 0);   // B
    });

    it('should parse rgb() colors', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'rgb(100, 150, 200)';
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1);

      assert.strictEqual(data.data[0], 100);
      assert.strictEqual(data.data[1], 150);
      assert.strictEqual(data.data[2], 200);
    });

    it('should parse rgba() colors', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'rgba(50, 100, 150, 0.5)';
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1);

      assert.strictEqual(data.data[0], 50);
      assert.strictEqual(data.data[1], 100);
      assert.strictEqual(data.data[2], 150);
    });

    it('should parse named colors', () => {
      const canvas = adapter.createElement('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1);

      assert.strictEqual(data.data[0], 255);
      assert.strictEqual(data.data[1], 255);
      assert.strictEqual(data.data[2], 255);
    });

  });

  describe('MutationObserver', () => {

    it('should create MutationObserver', () => {
      const observer = adapter.createMutationObserver(() => {});
      assert.ok(observer instanceof MockMutationObserver);
    });

    it('should call callback on trigger', () => {
      let called = false;
      const observer = adapter.createMutationObserver((mutations) => {
        called = true;
        assert.ok(Array.isArray(mutations));
      });

      observer.observe(adapter.getBody(), { childList: true });
      observer._trigger([{ type: 'childList' }]);

      assert.strictEqual(called, true);
    });

    it('should not call callback after disconnect', () => {
      let callCount = 0;
      const observer = adapter.createMutationObserver(() => {
        callCount++;
      });

      observer.observe(adapter.getBody(), { childList: true });
      observer._trigger([{ type: 'childList' }]);
      assert.strictEqual(callCount, 1);

      observer.disconnect();
      observer._trigger([{ type: 'childList' }]);
      assert.strictEqual(callCount, 1);
    });

    it('should support takeRecords', () => {
      const observer = adapter.createMutationObserver(() => {});
      observer.observe(adapter.getBody(), { childList: true });
      observer._trigger([{ type: 'childList' }]);

      const records = observer.takeRecords();
      assert.strictEqual(records.length, 1);

      const records2 = observer.takeRecords();
      assert.strictEqual(records2.length, 0);
    });

  });

  describe('Performance API', () => {

    it('should provide performance.now()', () => {
      const perf = adapter.getPerformance();
      const now = perf.now();
      assert.strictEqual(typeof now, 'number');
      assert.ok(now >= 0);
    });

    it('should support performance marks', () => {
      const perf = adapter.getPerformance();
      perf.mark('start');
      perf.mark('end');
      perf.measure('duration', 'start', 'end');

      const entries = perf.getEntriesByName('duration');
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(typeof entries[0].duration, 'number');
    });

    it('should clear marks and measures', () => {
      const perf = adapter.getPerformance();
      perf.mark('test');
      perf.clearMarks('test');

      perf.measure('test-measure', 'start', 'end');
      perf.clearMeasures();

      const entries = perf.getEntriesByName('test-measure');
      assert.strictEqual(entries.length, 0);
    });

  });

  describe('requestAnimationFrame', () => {

    it('should queue animation frame callbacks', () => {
      let called = false;
      adapter.requestAnimationFrame(() => {
        called = true;
      });

      assert.strictEqual(called, false);
      adapter.flushAnimationFrames();
      assert.strictEqual(called, true);
    });

    it('should return incrementing IDs', () => {
      const id1 = adapter.requestAnimationFrame(() => {});
      const id2 = adapter.requestAnimationFrame(() => {});
      assert.ok(id2 > id1);
    });

    it('should support cancelAnimationFrame', () => {
      let called = false;
      const id = adapter.requestAnimationFrame(() => {
        called = true;
      });

      adapter.cancelAnimationFrame(id);
      adapter.flushAnimationFrames();

      assert.strictEqual(called, false);
    });

  });

  describe('Element Methods', () => {

    it('should support focus()', () => {
      const el = adapter.createElement('button');
      el.focus();
      assert.strictEqual(adapter.getActiveElement(), el);
    });

    it('should support blur()', () => {
      const el = adapter.createElement('button');
      el.focus();
      el.blur();
      assert.strictEqual(adapter.getActiveElement(), null);
    });

    it('should support contains()', () => {
      const parent = adapter.createElement('div');
      const child = adapter.createElement('span');
      parent.appendChild(child);

      assert.strictEqual(parent.contains(child), true);
      assert.strictEqual(parent.contains(parent), true);
      assert.strictEqual(child.contains(parent), false);
    });

    it('should support querySelector', () => {
      const parent = adapter.createElement('div');
      const child = adapter.createElement('button');
      child.id = 'test-btn';
      parent.appendChild(child);

      const found = parent.querySelector('#test-btn');
      assert.strictEqual(found, child);
    });

    it('should support querySelectorAll', () => {
      const parent = adapter.createElement('div');
      const btn1 = adapter.createElement('button');
      const btn2 = adapter.createElement('button');
      parent.appendChild(btn1);
      parent.appendChild(btn2);

      const found = parent.querySelectorAll('button');
      assert.strictEqual(found.length, 2);
    });

  });

  describe('Global Mocks Installation', () => {

    it('should install and restore global mocks', () => {
      const originalDocument = globalThis.document;

      const cleanup = adapter.installGlobalMocks();

      assert.notStrictEqual(globalThis.document, originalDocument);
      assert.ok(globalThis.document.body);
      assert.strictEqual(typeof globalThis.getComputedStyle, 'function');
      assert.strictEqual(typeof globalThis.requestAnimationFrame, 'function');
      assert.strictEqual(typeof globalThis.MutationObserver, 'function');

      cleanup();

      assert.strictEqual(globalThis.document, originalDocument);
    });

  });

});

describe('MockMediaQueryList', () => {

  it('should store media query', () => {
    const mql = new MockMediaQueryList('(min-width: 768px)', true);
    assert.strictEqual(mql.media, '(min-width: 768px)');
    assert.strictEqual(mql.matches, true);
  });

  it('should support deprecated addListener/removeListener', () => {
    const mql = new MockMediaQueryList('test', false);
    let called = false;

    const listener = () => { called = true; };
    mql.addListener(listener);
    mql._setMatches(true);

    assert.strictEqual(called, true);

    called = false;
    mql.removeListener(listener);
    mql._setMatches(false);

    assert.strictEqual(called, false);
  });

});

describe('MockCSSStyleDeclaration', () => {

  it('should have default values', () => {
    const style = new MockCSSStyleDeclaration();
    assert.strictEqual(style.display, 'block');
    assert.strictEqual(style.visibility, 'visible');
    assert.strictEqual(style.color, 'rgb(0, 0, 0)');
  });

  it('should accept custom styles', () => {
    const style = new MockCSSStyleDeclaration({
      display: 'flex',
      color: 'red',
      customProp: 'value'
    });
    assert.strictEqual(style.display, 'flex');
    assert.strictEqual(style.color, 'red');
    assert.strictEqual(style.customProp, 'value');
  });

});

describe('MockWindow', () => {

  it('should have default dimensions', () => {
    const win = new MockWindow();
    assert.strictEqual(win.innerWidth, 1024);
    assert.strictEqual(win.innerHeight, 768);
  });

  it('should support custom dimensions', () => {
    const win = new MockWindow({ innerWidth: 1920, innerHeight: 1080 });
    assert.strictEqual(win.innerWidth, 1920);
    assert.strictEqual(win.innerHeight, 1080);
  });

  it('should evaluate min-width media queries', () => {
    const win = new MockWindow({ innerWidth: 1024 });
    const mql = win.matchMedia('(min-width: 768px)');
    assert.strictEqual(mql.matches, true);

    const mql2 = win.matchMedia('(min-width: 1200px)');
    assert.strictEqual(mql2.matches, false);
  });

  it('should evaluate max-width media queries', () => {
    const win = new MockWindow({ innerWidth: 500 });
    const mql = win.matchMedia('(max-width: 768px)');
    assert.strictEqual(mql.matches, true);

    const mql2 = win.matchMedia('(max-width: 400px)');
    assert.strictEqual(mql2.matches, false);
  });

  it('should have location object', () => {
    const win = new MockWindow({ locationHref: 'http://example.com/path' });
    assert.strictEqual(win.location.href, 'http://example.com/path');
  });

});

console.log('EnhancedMockAdapter tests completed');
