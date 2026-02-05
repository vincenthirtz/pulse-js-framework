/**
 * Pulse DOM Selector Tests
 *
 * Tests for runtime/dom-selector.js - parseSelector, resolveSelector, cache
 * Uses minimal mock-dom (zero external dependencies)
 *
 * @module test/dom-selector
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
// parseSelector() Tests
// =============================================================================

printSection('parseSelector() Basic Tests');

test('parseSelector: empty string returns default div', () => {
  const result = parseSelector('');
  assertEqual(result.tag, 'div');
  assertEqual(result.id, null);
  assertDeepEqual(result.classes, []);
  assertDeepEqual(result.attrs, {});
});

test('parseSelector: null returns default div', () => {
  const result = parseSelector(null);
  assertEqual(result.tag, 'div');
});

test('parseSelector: undefined returns default div', () => {
  const result = parseSelector(undefined);
  assertEqual(result.tag, 'div');
});

test('parseSelector: tag only', () => {
  const result = parseSelector('span');
  assertEqual(result.tag, 'span');
  assertEqual(result.id, null);
  assertDeepEqual(result.classes, []);
});

test('parseSelector: custom element tag', () => {
  const result = parseSelector('my-component');
  assertEqual(result.tag, 'my-component');
});

test('parseSelector: tag with uppercase', () => {
  const result = parseSelector('DIV');
  assertEqual(result.tag, 'DIV');
});

// =============================================================================
// parseSelector() ID Tests
// =============================================================================

printSection('parseSelector() ID Tests');

test('parseSelector: id only (defaults to div)', () => {
  const result = parseSelector('#app');
  assertEqual(result.tag, 'div');
  assertEqual(result.id, 'app');
});

test('parseSelector: tag with id', () => {
  const result = parseSelector('div#main');
  assertEqual(result.tag, 'div');
  assertEqual(result.id, 'main');
});

test('parseSelector: id with hyphen', () => {
  const result = parseSelector('#my-app');
  assertEqual(result.id, 'my-app');
});

test('parseSelector: id with underscore', () => {
  const result = parseSelector('#my_app');
  assertEqual(result.id, 'my_app');
});

test('parseSelector: id starting with underscore', () => {
  const result = parseSelector('#_private');
  assertEqual(result.id, '_private');
});

test('parseSelector: id starting with hyphen', () => {
  const result = parseSelector('#-modifier');
  assertEqual(result.id, '-modifier');
});

// =============================================================================
// parseSelector() Class Tests
// =============================================================================

printSection('parseSelector() Class Tests');

test('parseSelector: single class (defaults to div)', () => {
  const result = parseSelector('.container');
  assertEqual(result.tag, 'div');
  assertDeepEqual(result.classes, ['container']);
});

test('parseSelector: multiple classes', () => {
  const result = parseSelector('.btn.primary.large');
  assertDeepEqual(result.classes, ['btn', 'primary', 'large']);
});

test('parseSelector: tag with classes', () => {
  const result = parseSelector('button.btn.primary');
  assertEqual(result.tag, 'button');
  assertDeepEqual(result.classes, ['btn', 'primary']);
});

test('parseSelector: class with hyphen', () => {
  const result = parseSelector('.my-class');
  assertDeepEqual(result.classes, ['my-class']);
});

test('parseSelector: class with underscore', () => {
  const result = parseSelector('.my_class');
  assertDeepEqual(result.classes, ['my_class']);
});

test('parseSelector: class starting with hyphen', () => {
  const result = parseSelector('.-modifier');
  assertDeepEqual(result.classes, ['-modifier']);
});

test('parseSelector: class starting with underscore', () => {
  const result = parseSelector('._private');
  assertDeepEqual(result.classes, ['_private']);
});

// =============================================================================
// parseSelector() Attribute Tests
// =============================================================================

printSection('parseSelector() Attribute Tests');

test('parseSelector: boolean attribute', () => {
  const result = parseSelector('input[disabled]');
  assertEqual(result.tag, 'input');
  assertEqual(result.attrs.disabled, '');
});

test('parseSelector: attribute with value', () => {
  const result = parseSelector('input[type=text]');
  assertEqual(result.attrs.type, 'text');
});

test('parseSelector: attribute with double-quoted value', () => {
  const result = parseSelector('input[placeholder="Enter name"]');
  assertEqual(result.attrs.placeholder, 'Enter name');
});

test('parseSelector: attribute with single-quoted value', () => {
  const result = parseSelector("input[placeholder='Enter name']");
  assertEqual(result.attrs.placeholder, 'Enter name');
});

test('parseSelector: multiple attributes', () => {
  const result = parseSelector('input[type=text][placeholder=Name][required]');
  assertEqual(result.attrs.type, 'text');
  assertEqual(result.attrs.placeholder, 'Name');
  assertEqual(result.attrs.required, '');
});

test('parseSelector: data attributes', () => {
  const result = parseSelector('div[data-id=123][data-active=true]');
  assertEqual(result.attrs['data-id'], '123');
  assertEqual(result.attrs['data-active'], 'true');
});

test('parseSelector: aria attributes', () => {
  const result = parseSelector('button[aria-label="Close"][aria-expanded=false]');
  assertEqual(result.attrs['aria-label'], 'Close');
  assertEqual(result.attrs['aria-expanded'], 'false');
});

test('parseSelector: attribute value with special chars in quotes', () => {
  const result = parseSelector('div[data-value="hello-world_123"]');
  assertEqual(result.attrs['data-value'], 'hello-world_123');
});

// =============================================================================
// parseSelector() Combined Tests
// =============================================================================

printSection('parseSelector() Combined Selectors');

test('parseSelector: tag + id + class', () => {
  const result = parseSelector('div#main.container');
  assertEqual(result.tag, 'div');
  assertEqual(result.id, 'main');
  assertDeepEqual(result.classes, ['container']);
});

test('parseSelector: tag + id + multiple classes', () => {
  const result = parseSelector('button#submit.btn.primary.large');
  assertEqual(result.tag, 'button');
  assertEqual(result.id, 'submit');
  assertDeepEqual(result.classes, ['btn', 'primary', 'large']);
});

test('parseSelector: tag + class + attribute', () => {
  const result = parseSelector('input.form-control[type=email]');
  assertEqual(result.tag, 'input');
  assertDeepEqual(result.classes, ['form-control']);
  assertEqual(result.attrs.type, 'email');
});

test('parseSelector: complex selector', () => {
  const result = parseSelector('input#email.form-input.required[type=email][placeholder="Enter email"][required]');
  assertEqual(result.tag, 'input');
  assertEqual(result.id, 'email');
  assertDeepEqual(result.classes, ['form-input', 'required']);
  assertEqual(result.attrs.type, 'email');
  assertEqual(result.attrs.placeholder, 'Enter email');
  assertEqual(result.attrs.required, '');
});

test('parseSelector: id before tag (unusual but valid CSS order)', () => {
  // Note: In CSS, #id comes after tag, but parseSelector should handle any order
  const result = parseSelector('div#app.container');
  assertEqual(result.tag, 'div');
  assertEqual(result.id, 'app');
});

// =============================================================================
// parseSelector() Caching Tests
// =============================================================================

printSection('parseSelector() Caching Tests');

test('parseSelector: returns copy to prevent mutation', () => {
  clearSelectorCache();

  const result1 = parseSelector('div.test');
  result1.classes.push('mutated');

  const result2 = parseSelector('div.test');
  assertEqual(result2.classes.includes('mutated'), false);
});

test('parseSelector: cache hit returns same structure', () => {
  clearSelectorCache();

  const result1 = parseSelector('span.cached');
  const result2 = parseSelector('span.cached');

  assertEqual(result1.tag, result2.tag);
  assertDeepEqual(result1.classes, result2.classes);
});

// =============================================================================
// resolveSelector() Tests
// =============================================================================

printSection('resolveSelector() Tests');

test('resolveSelector: returns element and selector for string', () => {
  const container = document.createElement('div');
  container.id = 'resolve-test';
  document.body.appendChild(container);

  const result = resolveSelector('#resolve-test');

  assertEqual(result.selector, '#resolve-test');
  assertEqual(result.element, container);

  document.body.removeChild(container);
});

test('resolveSelector: returns null element for non-existent selector', () => {
  const result = resolveSelector('#nonexistent');

  assertEqual(result.selector, '#nonexistent');
  assertEqual(result.element, null);
});

test('resolveSelector: returns element directly when passed element', () => {
  const element = document.createElement('div');

  const result = resolveSelector(element);

  assertEqual(result.element, element);
  assertEqual(result.selector, '(element)');
});

test('resolveSelector: uses context name in selector string', () => {
  const element = document.createElement('span');
  const result = resolveSelector(element, 'mount');

  assertEqual(result.selector, '(element)');
});

// =============================================================================
// configureDom() Tests
// =============================================================================

printSection('configureDom() Tests');

test('configureDom: returns current config', () => {
  const config = configureDom({});

  assert(config.selectorCacheCapacity !== undefined);
  assert(config.trackCacheMetrics !== undefined);
});

test('configureDom: updates cache capacity', () => {
  const originalConfig = getDomConfig();

  configureDom({ selectorCacheCapacity: 1000 });

  const newConfig = getDomConfig();
  assertEqual(newConfig.selectorCacheCapacity, 1000);

  // Restore
  configureDom({ selectorCacheCapacity: originalConfig.selectorCacheCapacity });
});

test('configureDom: disabling cache (capacity 0)', () => {
  const originalConfig = getDomConfig();

  configureDom({ selectorCacheCapacity: 0 });

  // Cache should be disabled
  const metrics = getCacheMetrics();
  assertEqual(metrics.capacity, 0);

  // Restore
  configureDom({ selectorCacheCapacity: originalConfig.selectorCacheCapacity });
});

test('configureDom: updates metrics tracking', () => {
  const originalConfig = getDomConfig();

  configureDom({ trackCacheMetrics: false });

  const config = getDomConfig();
  assertEqual(config.trackCacheMetrics, false);

  // Restore
  configureDom({ trackCacheMetrics: originalConfig.trackCacheMetrics });
});

// =============================================================================
// getDomConfig() Tests
// =============================================================================

printSection('getDomConfig() Tests');

test('getDomConfig: returns copy of config', () => {
  const config1 = getDomConfig();
  const config2 = getDomConfig();

  // Should be equal
  assertDeepEqual(config1, config2);

  // But not same object
  config1.selectorCacheCapacity = 9999;
  const config3 = getDomConfig();
  assert(config3.selectorCacheCapacity !== 9999, 'Should return copy');
});

// =============================================================================
// clearSelectorCache() Tests
// =============================================================================

printSection('clearSelectorCache() Tests');

test('clearSelectorCache: clears the cache', () => {
  // Populate cache
  parseSelector('div.cache-test-1');
  parseSelector('div.cache-test-2');
  parseSelector('div.cache-test-3');

  const metricsBefore = getCacheMetrics();
  assert(metricsBefore.size > 0, 'Cache should have entries');

  clearSelectorCache();

  const metricsAfter = getCacheMetrics();
  assertEqual(metricsAfter.size, 0);
});

// =============================================================================
// getCacheMetrics() Tests
// =============================================================================

printSection('getCacheMetrics() Tests');

test('getCacheMetrics: returns metrics object', () => {
  clearSelectorCache();
  resetCacheMetrics();

  const metrics = getCacheMetrics();

  assertEqual(typeof metrics.hits, 'number');
  assertEqual(typeof metrics.misses, 'number');
  assertEqual(typeof metrics.evictions, 'number');
  assertEqual(typeof metrics.hitRate, 'number');
  assertEqual(typeof metrics.size, 'number');
  assertEqual(typeof metrics.capacity, 'number');
});

test('getCacheMetrics: tracks cache misses', () => {
  clearSelectorCache();
  resetCacheMetrics();

  // First access is a miss
  parseSelector('div.miss-test');

  const metrics = getCacheMetrics();
  assertEqual(metrics.misses, 1);
});

test('getCacheMetrics: tracks cache hits', () => {
  clearSelectorCache();
  resetCacheMetrics();

  // First access is a miss
  parseSelector('div.hit-test');
  // Second access is a hit
  parseSelector('div.hit-test');

  const metrics = getCacheMetrics();
  assertEqual(metrics.hits, 1);
  assertEqual(metrics.misses, 1);
});

test('getCacheMetrics: calculates hit rate', () => {
  clearSelectorCache();
  resetCacheMetrics();

  parseSelector('div.rate-test'); // miss
  parseSelector('div.rate-test'); // hit
  parseSelector('div.rate-test'); // hit
  parseSelector('div.rate-test'); // hit

  const metrics = getCacheMetrics();
  assertEqual(metrics.hitRate, 0.75); // 3 hits / 4 total
});

// =============================================================================
// resetCacheMetrics() Tests
// =============================================================================

printSection('resetCacheMetrics() Tests');

test('resetCacheMetrics: resets counters', () => {
  clearSelectorCache();
  resetCacheMetrics();

  // Generate some metrics
  parseSelector('div.reset-test');
  parseSelector('div.reset-test');

  const metricsBefore = getCacheMetrics();
  assert(metricsBefore.hits > 0 || metricsBefore.misses > 0, 'Should have some activity');

  resetCacheMetrics();

  const metricsAfter = getCacheMetrics();
  assertEqual(metricsAfter.hits, 0);
  assertEqual(metricsAfter.misses, 0);
});

test('resetCacheMetrics: does not clear cache entries', () => {
  clearSelectorCache();

  parseSelector('div.persist-test');

  const sizeBefore = getCacheMetrics().size;

  resetCacheMetrics();

  const sizeAfter = getCacheMetrics().size;
  assertEqual(sizeBefore, sizeAfter);
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('parseSelector() Edge Cases');

test('parseSelector: handles numeric-looking values', () => {
  const result = parseSelector('div[data-count=42]');
  assertEqual(result.attrs['data-count'], '42');
});

test('parseSelector: handles empty attribute value', () => {
  const result = parseSelector('input[value=""]');
  assertEqual(result.attrs.value, '');
});

test('parseSelector: handles attribute with equals in quoted value', () => {
  const result = parseSelector('div[data-expr="a=b"]');
  assertEqual(result.attrs['data-expr'], 'a=b');
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
  assertEqual(warned, true);
});

test('parseSelector: handles very long selectors', () => {
  const classes = Array.from({ length: 20 }, (_, i) => `.class-${i}`).join('');
  const selector = `div#long${classes}[data-test=value]`;

  const result = parseSelector(selector);

  assertEqual(result.tag, 'div');
  assertEqual(result.id, 'long');
  assertEqual(result.classes.length, 20);
  assertEqual(result.attrs['data-test'], 'value');
});

// =============================================================================
// Print Results
// =============================================================================

printResults();
exitWithCode();
