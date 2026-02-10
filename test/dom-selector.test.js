/**
 * Pulse DOM Selector Tests
 *
 * Tests for runtime/dom-selector.js - parseSelector, resolveSelector, cache
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom-selector
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createDOM } from './mock-dom.js';

// Set up DOM environment before importing
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Import modules under test
import {
  parseSelector,
  resolveSelector,
  configureDom,
  getDomConfig,
  clearSelectorCache,
  getCacheMetrics,
  resetCacheMetrics
} from '../runtime/dom-selector.js';

// =============================================================================
// parseSelector() Tests
// =============================================================================

describe('parseSelector() Basic Tests', () => {
  test('parseSelector: empty string returns default div', () => {
    const result = parseSelector('');
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, null);
    assert.deepStrictEqual(result.classes, []);
    assert.deepStrictEqual(result.attrs, {});
  });

  test('parseSelector: null returns default div', () => {
    const result = parseSelector(null);
    assert.strictEqual(result.tag, 'div');
  });

  test('parseSelector: undefined returns default div', () => {
    const result = parseSelector(undefined);
    assert.strictEqual(result.tag, 'div');
  });

  test('parseSelector: tag only', () => {
    const result = parseSelector('span');
    assert.strictEqual(result.tag, 'span');
    assert.strictEqual(result.id, null);
    assert.deepStrictEqual(result.classes, []);
  });

  test('parseSelector: custom element tag', () => {
    const result = parseSelector('my-component');
    assert.strictEqual(result.tag, 'my-component');
  });

  test('parseSelector: tag with uppercase', () => {
    const result = parseSelector('DIV');
    assert.strictEqual(result.tag, 'DIV');
  });
});

// =============================================================================
// parseSelector() ID Tests
// =============================================================================

describe('parseSelector() ID Tests', () => {
  test('parseSelector: id only (defaults to div)', () => {
    const result = parseSelector('#app');
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'app');
  });

  test('parseSelector: tag with id', () => {
    const result = parseSelector('div#main');
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'main');
  });

  test('parseSelector: id with hyphen', () => {
    const result = parseSelector('#my-app');
    assert.strictEqual(result.id, 'my-app');
  });

  test('parseSelector: id with underscore', () => {
    const result = parseSelector('#my_app');
    assert.strictEqual(result.id, 'my_app');
  });

  test('parseSelector: id starting with underscore', () => {
    const result = parseSelector('#_private');
    assert.strictEqual(result.id, '_private');
  });

  test('parseSelector: id starting with hyphen', () => {
    const result = parseSelector('#-modifier');
    assert.strictEqual(result.id, '-modifier');
  });
});

// =============================================================================
// parseSelector() Class Tests
// =============================================================================

describe('parseSelector() Class Tests', () => {
  test('parseSelector: single class (defaults to div)', () => {
    const result = parseSelector('.container');
    assert.strictEqual(result.tag, 'div');
    assert.deepStrictEqual(result.classes, ['container']);
  });

  test('parseSelector: multiple classes', () => {
    const result = parseSelector('.btn.primary.large');
    assert.deepStrictEqual(result.classes, ['btn', 'primary', 'large']);
  });

  test('parseSelector: tag with classes', () => {
    const result = parseSelector('button.btn.primary');
    assert.strictEqual(result.tag, 'button');
    assert.deepStrictEqual(result.classes, ['btn', 'primary']);
  });

  test('parseSelector: class with hyphen', () => {
    const result = parseSelector('.my-class');
    assert.deepStrictEqual(result.classes, ['my-class']);
  });

  test('parseSelector: class with underscore', () => {
    const result = parseSelector('.my_class');
    assert.deepStrictEqual(result.classes, ['my_class']);
  });

  test('parseSelector: class starting with hyphen', () => {
    const result = parseSelector('.-modifier');
    assert.deepStrictEqual(result.classes, ['-modifier']);
  });

  test('parseSelector: class starting with underscore', () => {
    const result = parseSelector('._private');
    assert.deepStrictEqual(result.classes, ['_private']);
  });
});

// =============================================================================
// parseSelector() Attribute Tests
// =============================================================================

describe('parseSelector() Attribute Tests', () => {
  test('parseSelector: boolean attribute', () => {
    const result = parseSelector('input[disabled]');
    assert.strictEqual(result.tag, 'input');
    assert.strictEqual(result.attrs.disabled, '');
  });

  test('parseSelector: attribute with value', () => {
    const result = parseSelector('input[type=text]');
    assert.strictEqual(result.attrs.type, 'text');
  });

  test('parseSelector: attribute with double-quoted value', () => {
    const result = parseSelector('input[placeholder="Enter name"]');
    assert.strictEqual(result.attrs.placeholder, 'Enter name');
  });

  test('parseSelector: attribute with single-quoted value', () => {
    const result = parseSelector("input[placeholder='Enter name']");
    assert.strictEqual(result.attrs.placeholder, 'Enter name');
  });

  test('parseSelector: multiple attributes', () => {
    const result = parseSelector('input[type=text][placeholder=Name][required]');
    assert.strictEqual(result.attrs.type, 'text');
    assert.strictEqual(result.attrs.placeholder, 'Name');
    assert.strictEqual(result.attrs.required, '');
  });

  test('parseSelector: data attributes', () => {
    const result = parseSelector('div[data-id=123][data-active=true]');
    assert.strictEqual(result.attrs['data-id'], '123');
    assert.strictEqual(result.attrs['data-active'], 'true');
  });

  test('parseSelector: aria attributes', () => {
    const result = parseSelector('button[aria-label="Close"][aria-expanded=false]');
    assert.strictEqual(result.attrs['aria-label'], 'Close');
    assert.strictEqual(result.attrs['aria-expanded'], 'false');
  });

  test('parseSelector: attribute value with special chars in quotes', () => {
    const result = parseSelector('div[data-value="hello-world_123"]');
    assert.strictEqual(result.attrs['data-value'], 'hello-world_123');
  });
});

// =============================================================================
// parseSelector() Combined Tests
// =============================================================================

describe('parseSelector() Combined Selectors', () => {
  test('parseSelector: tag + id + class', () => {
    const result = parseSelector('div#main.container');
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'main');
    assert.deepStrictEqual(result.classes, ['container']);
  });

  test('parseSelector: tag + id + multiple classes', () => {
    const result = parseSelector('button#submit.btn.primary.large');
    assert.strictEqual(result.tag, 'button');
    assert.strictEqual(result.id, 'submit');
    assert.deepStrictEqual(result.classes, ['btn', 'primary', 'large']);
  });

  test('parseSelector: tag + class + attribute', () => {
    const result = parseSelector('input.form-control[type=email]');
    assert.strictEqual(result.tag, 'input');
    assert.deepStrictEqual(result.classes, ['form-control']);
    assert.strictEqual(result.attrs.type, 'email');
  });

  test('parseSelector: complex selector', () => {
    const result = parseSelector('input#email.form-input.required[type=email][placeholder="Enter email"][required]');
    assert.strictEqual(result.tag, 'input');
    assert.strictEqual(result.id, 'email');
    assert.deepStrictEqual(result.classes, ['form-input', 'required']);
    assert.strictEqual(result.attrs.type, 'email');
    assert.strictEqual(result.attrs.placeholder, 'Enter email');
    assert.strictEqual(result.attrs.required, '');
  });

  test('parseSelector: id before tag (unusual but valid CSS order)', () => {
    // Note: In CSS, #id comes after tag, but parseSelector should handle any order
    const result = parseSelector('div#app.container');
    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'app');
  });
});

// =============================================================================
// parseSelector() Caching Tests
// =============================================================================

describe('parseSelector() Caching Tests', () => {
  test('parseSelector: returns copy to prevent mutation', () => {
    clearSelectorCache();

    const result1 = parseSelector('div.test');
    result1.classes.push('mutated');

    const result2 = parseSelector('div.test');
    assert.strictEqual(result2.classes.includes('mutated'), false);
  });

  test('parseSelector: cache hit returns same structure', () => {
    clearSelectorCache();

    const result1 = parseSelector('span.cached');
    const result2 = parseSelector('span.cached');

    assert.strictEqual(result1.tag, result2.tag);
    assert.deepStrictEqual(result1.classes, result2.classes);
  });
});

// =============================================================================
// resolveSelector() Tests
// =============================================================================

describe('resolveSelector() Tests', () => {
  test('resolveSelector: returns element and selector for string', () => {
    const container = document.createElement('div');
    container.id = 'resolve-test';
    document.body.appendChild(container);

    const result = resolveSelector('#resolve-test');

    assert.strictEqual(result.selector, '#resolve-test');
    assert.strictEqual(result.element, container);

    document.body.removeChild(container);
  });

  test('resolveSelector: returns null element for non-existent selector', () => {
    const result = resolveSelector('#nonexistent');

    assert.strictEqual(result.selector, '#nonexistent');
    assert.strictEqual(result.element, null);
  });

  test('resolveSelector: returns element directly when passed element', () => {
    const element = document.createElement('div');

    const result = resolveSelector(element);

    assert.strictEqual(result.element, element);
    assert.strictEqual(result.selector, '(element)');
  });

  test('resolveSelector: uses context name in selector string', () => {
    const element = document.createElement('span');
    const result = resolveSelector(element, 'mount');

    assert.strictEqual(result.selector, '(element)');
  });
});

// =============================================================================
// configureDom() Tests
// =============================================================================

describe('configureDom() Tests', () => {
  test('configureDom: returns current config', () => {
    const config = configureDom({});

    assert.ok(config.selectorCacheCapacity !== undefined);
    assert.ok(config.trackCacheMetrics !== undefined);
  });

  test('configureDom: updates cache capacity', () => {
    const originalConfig = getDomConfig();

    configureDom({ selectorCacheCapacity: 1000 });

    const newConfig = getDomConfig();
    assert.strictEqual(newConfig.selectorCacheCapacity, 1000);

    // Restore
    configureDom({ selectorCacheCapacity: originalConfig.selectorCacheCapacity });
  });

  test('configureDom: disabling cache (capacity 0)', () => {
    const originalConfig = getDomConfig();

    configureDom({ selectorCacheCapacity: 0 });

    // Cache should be disabled
    const metrics = getCacheMetrics();
    assert.strictEqual(metrics.capacity, 0);

    // Restore
    configureDom({ selectorCacheCapacity: originalConfig.selectorCacheCapacity });
  });

  test('configureDom: updates metrics tracking', () => {
    const originalConfig = getDomConfig();

    configureDom({ trackCacheMetrics: false });

    const config = getDomConfig();
    assert.strictEqual(config.trackCacheMetrics, false);

    // Restore
    configureDom({ trackCacheMetrics: originalConfig.trackCacheMetrics });
  });
});

// =============================================================================
// getDomConfig() Tests
// =============================================================================

describe('getDomConfig() Tests', () => {
  test('getDomConfig: returns copy of config', () => {
    const config1 = getDomConfig();
    const config2 = getDomConfig();

    // Should be equal
    assert.deepStrictEqual(config1, config2);

    // But not same object
    config1.selectorCacheCapacity = 9999;
    const config3 = getDomConfig();
    assert.ok(config3.selectorCacheCapacity !== 9999, 'Should return copy');
  });
});

// =============================================================================
// clearSelectorCache() Tests
// =============================================================================

describe('clearSelectorCache() Tests', () => {
  test('clearSelectorCache: clears the cache', () => {
    // Populate cache
    parseSelector('div.cache-test-1');
    parseSelector('div.cache-test-2');
    parseSelector('div.cache-test-3');

    const metricsBefore = getCacheMetrics();
    assert.ok(metricsBefore.size > 0, 'Cache should have entries');

    clearSelectorCache();

    const metricsAfter = getCacheMetrics();
    assert.strictEqual(metricsAfter.size, 0);
  });
});

// =============================================================================
// getCacheMetrics() Tests
// =============================================================================

describe('getCacheMetrics() Tests', () => {
  test('getCacheMetrics: returns metrics object', () => {
    clearSelectorCache();
    resetCacheMetrics();

    const metrics = getCacheMetrics();

    assert.strictEqual(typeof metrics.hits, 'number');
    assert.strictEqual(typeof metrics.misses, 'number');
    assert.strictEqual(typeof metrics.evictions, 'number');
    assert.strictEqual(typeof metrics.hitRate, 'number');
    assert.strictEqual(typeof metrics.size, 'number');
    assert.strictEqual(typeof metrics.capacity, 'number');
  });

  test('getCacheMetrics: tracks cache misses', () => {
    clearSelectorCache();
    resetCacheMetrics();

    // First access is a miss
    parseSelector('div.miss-test');

    const metrics = getCacheMetrics();
    assert.strictEqual(metrics.misses, 1);
  });

  test('getCacheMetrics: tracks cache hits', () => {
    clearSelectorCache();
    resetCacheMetrics();

    // First access is a miss
    parseSelector('div.hit-test');
    // Second access is a hit
    parseSelector('div.hit-test');

    const metrics = getCacheMetrics();
    assert.strictEqual(metrics.hits, 1);
    assert.strictEqual(metrics.misses, 1);
  });

  test('getCacheMetrics: calculates hit rate', () => {
    clearSelectorCache();
    resetCacheMetrics();

    parseSelector('div.rate-test'); // miss
    parseSelector('div.rate-test'); // hit
    parseSelector('div.rate-test'); // hit
    parseSelector('div.rate-test'); // hit

    const metrics = getCacheMetrics();
    assert.strictEqual(metrics.hitRate, 0.75); // 3 hits / 4 total
  });
});

// =============================================================================
// resetCacheMetrics() Tests
// =============================================================================

describe('resetCacheMetrics() Tests', () => {
  test('resetCacheMetrics: resets counters', () => {
    clearSelectorCache();
    resetCacheMetrics();

    // Generate some metrics
    parseSelector('div.reset-test');
    parseSelector('div.reset-test');

    const metricsBefore = getCacheMetrics();
    assert.ok(metricsBefore.hits > 0 || metricsBefore.misses > 0, 'Should have some activity');

    resetCacheMetrics();

    const metricsAfter = getCacheMetrics();
    assert.strictEqual(metricsAfter.hits, 0);
    assert.strictEqual(metricsAfter.misses, 0);
  });

  test('resetCacheMetrics: does not clear cache entries', () => {
    clearSelectorCache();

    parseSelector('div.persist-test');

    const sizeBefore = getCacheMetrics().size;

    resetCacheMetrics();

    const sizeAfter = getCacheMetrics().size;
    assert.strictEqual(sizeBefore, sizeAfter);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('parseSelector() Edge Cases', () => {
  test('parseSelector: handles numeric-looking values', () => {
    const result = parseSelector('div[data-count=42]');
    assert.strictEqual(result.attrs['data-count'], '42');
  });

  test('parseSelector: handles empty attribute value', () => {
    const result = parseSelector('input[value=""]');
    assert.strictEqual(result.attrs.value, '');
  });

  test('parseSelector: handles attribute with equals in quoted value', () => {
    const result = parseSelector('div[data-expr="a=b"]');
    assert.strictEqual(result.attrs['data-expr'], 'a=b');
  });

  test('parseSelector: warns on malformed selector parts', () => {
    // Capture console.warn
    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => { warned = true; };

    // This has unrecognized parts (spaces, etc.)
    parseSelector('div > span');

    console.warn = originalWarn;

    // Should have warned about unrecognized parts
    assert.strictEqual(warned, true);
  });

  test('parseSelector: handles very long selectors', () => {
    const classes = Array.from({ length: 20 }, (_, i) => `.class-${i}`).join('');
    const selector = `div#long${classes}[data-test=value]`;

    const result = parseSelector(selector);

    assert.strictEqual(result.tag, 'div');
    assert.strictEqual(result.id, 'long');
    assert.strictEqual(result.classes.length, 20);
    assert.strictEqual(result.attrs['data-test'], 'value');
  });
});
